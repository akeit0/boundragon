#!/usr/bin/env python3
"""Extract pinned upstream digit/format tails, removing numeric conversion caches."""
import argparse
import hashlib
import json
from pathlib import Path
import re

HERE = Path(__file__).resolve().parent


def block(text, marker):
    start = text.index(marker)
    opening = text.index('{', start)
    # Mask comments and literals, preserving offsets while counting braces.
    masked = re.sub(r'//[^\n]*|/\*.*?\*/|"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'',
                    lambda m: ' ' * len(m[0]), text, flags=re.S)
    depth = 1
    for end in range(opening + 1, len(text)):
        depth += (masked[end] == '{') - (masked[end] == '}')
        if depth == 0:
            return start, end + 1
    raise ValueError(marker)


def remove_block(text, marker, semicolon=False):
    start, end = block(text, marker)
    if semicolon:
        assert text[end] == ';'
        end += 1
    return text[:start] + text[end:]


def zmij(source):
    pre = source[:source.index('struct shortest_decimal')]
    pre = pre.replace('#include "zmij.h"', '#include "../deps/zmij/zmij.h"\n#include <boundragon/boundragon.h>\n#include <bit>')
    pre = pre.replace('namespace {', 'namespace zmij_emitter {', 1)
    pre = remove_block(pre, 'namespace pow10 {')
    for name in ['pow10_significand_table', 'exp_shift_table']:
        pre = remove_block(pre, 'struct ' + name + ' {', True)
    pre = re.sub(r'  exp_shift_table exp_shifts =.*?;', '', pre, flags=re.S)
    pre = re.sub(r'  alignas\(64\) pow10_significand_table pow10_significands =.*?;', '', pre, flags=re.S)
    pre = pre.replace('::neg100', '::zmij_emitter::neg100').replace('::neg10k', '::zmij_emitter::neg10k').replace('::zeros', '::zmij_emitter::zeros')
    start, end = block(source, 'struct shortest_decimal {')
    dec = source[start:end + 1]
    start, end = block(source, 'auto write(char* buffer, Float value) noexcept')
    original = source[start:end]
    tail = original[original.index('  bool has_last_digit = dec.has_last_digit;'):]
    direct = '''
inline char* emit_digits(char* buffer, boundragon_bench::WriterDecimal value) {
    using Float = double;
    using traits = float_traits<Float>;
    *buffer = '-'; buffer += value.negative;
    if (value.exp == 10000) return write_inf_nan(buffer, value.sig != 0);
    if (value.sig == 0) { *buffer = '0'; return buffer + 1; }
    shortest_decimal dec{value.sig, value.exp, int(value.last_digit), value.last_digit != 0};
    const auto* d = &static_data;
    ZMIJ_ASM(("" : "+r"(d)));
    uint64_t threshold = traits::num_bits == 64 ? d->threshold : uint64_t(1e7);
'''
    pre = '#include "../writer_decimal.h"\n' + pre
    return pre + dec + direct + tail + '\n} // namespace zmij_emitter\n'


def xjb(source):
    pre = source[:source.index('static inline void get_pow10(')]
    pre = pre.replace('#include "ftoa.h"', '#include "../deps/xjb/ftoa.h"\n#include <boundragon/boundragon.h>\n#include <bit>')
    # Standard/SIMD includes remain outside our namespace. All upstream types
    # and tables begin at Typedefs, so the formatter has no global collisions.
    index = pre.index('#if defined(__SIZEOF_INT128__)')
    pre = pre[:index] + 'namespace xjb_emitter {\n' + pre[index:]
    for name, numeric, shifts in [('double', 'pow10_double', 'h7'), ('float', 'pow10_float_reverse', 'h37')]:
        start, end = block(pre, 'struct ' + name + '_table_t {')
        table = pre[start:end]
        table = re.sub(r'    uint64_t ' + numeric + r'\[[^\n]*\n', '', table)
        table = re.sub(r'    unsigned char ' + shifts + r'\[[^\n]*\n', '', table)
        ctor = table.index('    constexpr ' + name + '_table_t() {')
        numeric_end = table.index('        for (int e10 =', ctor)
        table = table[:ctor] + '    constexpr ' + name + '_table_t() {\n' + table[numeric_end:]
        table = remove_block(table, '        for (int exp =')
        pre = pre[:start] + table + pre[end:]
    # Native conversion and its caches are excluded. Formatting helpers above
    # get_pow10 and the tails below are otherwise copied verbatim.
    start, end = block(source, 'static inline char* xjb64(')
    fn = source[start:end]
    tail = fn[fn.index('    u64 D17 = '):]
    direct = '''
inline char* emit_digits64(char* buf, boundragon_bench::WriterDecimal value) {
#ifndef NDEBUG
    char* const real_origin_buf = buf;
#endif
    *buf = '-'; buf += value.negative;
    if (value.exp == 10000) return (char*)memcpy(buf, value.sig ? "nan" : "inf", 4) + 3;
    if (value.sig == 0) return (char*)memcpy(buf, "0.0", 4) + 3;
    u64 m_up = value.sig;
    u32 one = value.last_digit;
    u32 up_down = value.last_digit == 0;
    i64 k = value.exp;
    constexpr u64 exp = 1;
    const auto* t = &double_table;
    const auto* cv = &constants_double;
'''
    result = pre + direct + tail + '\n} // namespace xjb_emitter\n'
    return '#include "../writer_decimal.h"\n' + result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    manifest = json.loads((HERE / 'dependencies.json').read_text())
    target = HERE / 'generated'
    target.mkdir(exist_ok=True)
    for library, name, generate, license_name in [('zmij', 'zmij.cc', zmij, 'MIT'), ('xjb', 'ftoa.cpp', xjb, 'Apache-2.0')]:
        data = (HERE / 'deps' / library / name).read_bytes()
        expected_hash = manifest['files'][library + '/' + name]['sha256']
        if hashlib.sha256(data).hexdigest() != expected_hash:
            raise RuntimeError('Unpinned source: ' + library)
        # Keep original notices and identify every modification prominently.
        notice = ('// Generated by extract_emitters.py; do not edit.\n'
                  f'// SPDX-License-Identifier: {license_name}\n'
                  f'// Modified from {library} {manifest[library]["commit"]}, source SHA-256 {expected_hash}.\n'
                  '// Changes: removed numeric conversion/caches; added binary64 prepared-digit entry and namespace.\n')
        output = notice + generate(data.decode().replace('\r\n', '\n'))
        header = target / (library + '_emitter.h')
        if args.check:
            if header.read_text(encoding='utf-8') != output:
                raise SystemExit('Stale extracted formatter: ' + library)
        else:
            header.write_text(output, encoding='utf-8', newline='\n')
        print('Verified formatter extraction: ' + library)


if __name__ == '__main__':
    main()

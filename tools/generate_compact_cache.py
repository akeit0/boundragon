#!/usr/bin/env python3
"""Generate/certify tiny high-cache candidates using only exact integers.

The fast path reconstructs an upper approximation U to floor(T), where
T = 10**p * 2**(63-floor(log2(10**p))).  Exhaustive finite checks establish
0 <= U-floor(T) <= 2 and the phase/radius metadata for all 618 cached powers.
Taking U-2 therefore gives 0 <= T-(U-2) < 3, and the scaled-product error is <4.

This script also reproduces the existing 28-stride anchors independently and
checks that they equal the constants supplied by generate_decimal_tables.py.  It does
not import that module, since importing it rewrites the shared decimal_tables.h.
"""
import argparse
from pathlib import Path
import re

MIN, MAX = -293, 324
MASK = (1 << 64) - 1
BASE28, STRIDE28 = -303, 28
BASE16, STRIDE16 = -304, 16


def power(p, bits=128):
    numerator, denominator = (10 ** p, 1) if p >= 0 else (1, 10 ** -p)
    exponent = numerator.bit_length() - denominator.bit_length()
    if exponent >= 0:
        if numerator < (denominator << exponent):
            exponent -= 1
    elif (numerator << -exponent) < denominator:
        exponent -= 1
    shift = bits - 1 - exponent
    a, b = (numerator << shift, denominator) if shift >= 0 else (numerator, denominator << -shift)
    quotient, remainder = divmod(a, b)
    return quotient, bool(remainder), exponent


def old_anchors():
    result = []
    minor = [power(r, 64)[0] for r in range(STRIDE28)]
    for j in range((MAX - BASE28) // STRIDE28 + 1):
        p0 = BASE28 + STRIDE28 * j
        lower = power(p0)[0]
        for bias in (0, 1, 2):
            anchor = lower + bias
            diffs = []
            for r in range(STRIDE28):
                p = p0 + r
                if MIN <= p <= MAX:
                    prod = anchor * minor[r]
                    approximation = prod >> (64 if prod >> 191 else 63)
                    diffs.append(approximation - power(p)[0])
            if all(0 <= d <= 1 for d in diffs):
                result.append(anchor)
                break
        else:
            raise AssertionError(f"existing anchor construction failed at {p0}")
    return result


def parse_hex_array(text, name):
    match = re.search(r"\b" + name + r"\[\]\s*=\s*\{(.*?)\};", text, re.S)
    assert match, name
    return [int(h, 16) for h in re.findall(r"0x([0-9a-fA-F]+)ULL", match.group(1))]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='verify the committed header without rewriting it')
    args = parser.parse_args()
    if not __debug__:
        raise RuntimeError("Exact cache certification requires assertions; run without Python -O")
    root = Path(__file__).resolve().parents[1] / "include/boundragon/detail"
    source = (root / "decimal_tables.h").read_text()
    major = old_anchors()
    assert parse_hex_array(source, "compact_major") == [limb for a in major for limb in (a >> 64, a & MASK)]
    assert all((a >> 64) == power(BASE28 + STRIDE28 * j, 64)[0] for j, a in enumerate(major))
    minor = [power(r, 64)[0] for r in range(STRIDE28)]
    assert parse_hex_array(source, "compact_minor") == minor
    assert all(not power(r, 64)[1] for r in range(STRIDE28))
    minor_phase = sum((power(r)[2] & 3) << (2 * r) for r in range(STRIDE28))
    anchor16 = []
    phase16 = []
    for j in range((MAX - BASE16) // STRIDE16 + 1):
        p0 = BASE16 + j * STRIDE16
        value, remainder, exponent = power(p0, 64)
        anchor16.append(value + remainder)
        phase = j + ((19 * j + 27) >> 7) + 2
        assert (phase & 3) == (exponent & 3), (j, exponent, phase)
        phase16.append(phase)
    assert all((power(BASE28 + j * STRIDE28)[2] & 3) == ((j + 1) & 3) for j in range(len(major)))

    paired_high = []
    paired_packed = []
    for p0 in range(MIN, MAX + 1, 2):
        anchor, _, exponent = power(p0, 64)
        d = power(p0 + 1)[2] - exponent - 1
        assert d in (2, 3)
        assert (anchor >= 0xcccccccccccccccc) == (d == 3)
        packed = (anchor & (((1 << 63) - 1) & ~3)) | (exponent & 3) | ((d - 2) << 63)
        paired_high.append(anchor)
        paired_packed.append(packed)

    # Check the actual regular binary64 exponent mapping, including all phases
    # and every radius shift that the C++ fast paths can use.
    normal_cases = []
    for raw in range(1, 2047):
        q = raw - 1075
        k = (q * 315653) >> 20
        p = -k - 1
        exponent = power(p)[2]
        s = q + exponent + 12
        assert 8 <= s <= 11
        assert q + ((p * 217707) >> 16) + 12 == s
        normal_cases.append((q, p, s))

    certificate = []
    for stride, base, anchors, phases in (
        (28, BASE28, [(a >> 64) + 1 for a in major], [(j + 1) & 3 for j in range(len(major))]),
        (16, BASE16, anchor16, phase16),
    ):
        max_error = 0
        for p in range(MIN, MAX + 1):
            j, r = divmod(p - base, stride)
            prod = anchors[j] * minor[r]
            assert 0 <= prod < (1 << 128)
            raw_upper = prod >> 64
            norm = 1 - (raw_upper >> 63)
            upper = (prod << norm) >> 64
            assert 0 <= upper <= MASK
            true_high = power(p)[0] >> 64
            error = upper - true_high
            assert 0 <= error <= 2, (stride, p, error)
            assert ((phases[j] + power(r)[2] + 1 - norm) & 3) == (power(p)[2] & 3)
            max_error = max(max_error, error)
            # Normalized-radius result is exactly floor(R), even though upper
            # may overestimate floor(T) by two.  Check the complete shift range.
            for s in range(8, 12):
                assert (upper >> (65 - s)) == (true_high >> (65 - s)), (stride, p, s)
        for q, p, s in normal_cases:
            j, r = divmod(p - base, stride)
            prod = anchors[j] * minor[r]
            raw_upper = prod >> 64
            norm = 1 - (raw_upper >> 63)
            phase = (minor_phase >> (r * 2)) & 3
            actual_s = 8 + ((q + phases[j] + phase + 1 - norm) & 3)
            assert actual_s == s
            raw_s = s - 1 + norm  # 10 fractional bits, unnormalized product.
            assert 7 <= raw_s <= 11
            true_high = power(p)[0] >> 64
            assert ((raw_upper + 1) >> (65 - raw_s)) == (true_high >> (66 - s)), (stride, q, p)
        certificate.append(f"stride {stride}: all 618 upper errors in [0,{max_error}]; all phase/radius checks passed")

    for p in range(MIN, MAX + 1):
        index = p - MIN
        packed = paired_packed[index >> 1]
        odd = index & 1
        d = 2 + (packed >> 63)
        restored = packed | (1 << 63)
        approximation = ((restored >> d) * 5) if odd else (restored & ~3)
        true_high = power(p)[0] >> 64
        assert 0 <= true_high - approximation <= 4, (p, true_high - approximation)
        assert approximation + 4 <= MASK
        phase = (packed - (odd & ((packed >> 63) ^ 1))) & 3
        assert phase == (power(p)[2] & 3)
        # The unmodified-anchor arithmetic-phase variant has no larger error.
        anchor = paired_high[index >> 1]
        arithmetic = ((anchor >> d) * 5) if odd else anchor
        assert approximation <= arithmetic <= true_high
        for s in range(8, 12):
            assert ((approximation + 4) >> (65 - s)) == (true_high >> (65 - s)), (p, s)
            assert ((arithmetic + 4) >> (65 - s)) == (true_high >> (65 - s)), (p, s)
    certificate.append("paired cache: all 618 lower errors in [0,4]; all phase/radius checks passed")

    def array(name, typ, values, fmt, per_line):
        lines = [f"alignas(64) inline constexpr {typ} {name}[] = {{"]
        for i in range(0, len(values), per_line):
            lines.append("    " + ", ".join(fmt(x) for x in values[i:i + per_line]) + ",")
        return "\n".join(lines) + "\n};\n"

    output = "// SPDX-License-Identifier: Unlicense\n// Generated by generate_compact_cache.py; certified with exact integers.\n#pragma once\n"
    output += f"inline constexpr uint64_t tiny_minor_phase_bits = 0x{minor_phase:016x}ULL;\n"
    output += f"inline constexpr int tiny16_base = {BASE16};\n"
    output += array("tiny16_anchors", "uint64_t", anchor16, lambda x: f"0x{x:016x}ULL", 4)
    output += array("paired_high_powers", "uint64_t", paired_high, lambda x: f"0x{x:016x}ULL", 4)
    output += array("paired_packed_powers", "uint64_t", paired_packed, lambda x: f"0x{x:016x}ULL", 4)
    header = root / "compact_cache_tables.h"
    if args.check:
        if header.read_text() != output:
            raise SystemExit('FAIL: compact_cache_tables.h differs from exact generated tables')
        print('PASS: committed compact caches match exact generation')
    else:
        header.write_text(output)
    print("\n".join(certificate))
    print("All 2046 regular binary64 exponents certified for each cache layout.")
    print("tiny28: 592 retained numeric bytes, reusing certified compact arrays")
    print(f"tiny16: {592 + len(anchor16) * 8} retained numeric bytes, including exact fallback")
    print("Normalized path: u <= Y < u+4; exact h <= R < h+1.")
    print("Raw 10-bit path: u <= Y < u+3; exact h <= R < h+1.")
    print(f"paired: {592 + len(paired_high) * 8} retained numeric bytes; u <= Y < u+6, exact h <= R < h+1.")


if __name__ == "__main__":
    main()

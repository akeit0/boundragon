#!/usr/bin/env python3
"""Validate compact branch-count records and generate the browser summary."""
# SPDX-License-Identifier: Unlicense
import argparse
import csv
import hashlib
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECORD = ROOT / 'docs/content/branch-rates.json'
TARGET = ROOT / 'docs/assets/branch-rates.generated.js'
SOURCES = {
    'binary32': ['include/boundragon/detail/float_decimal.h',
                 'include/boundragon/detail/binary32_fast_cache.h', 'benchmarks/branch_profile32.cpp'],
    'binary64': ['include/boundragon/detail/centered_filter.h',
                 'include/boundragon/detail/canonical_decimal.h',
                 'include/boundragon/detail/decimal_core.h', 'include/boundragon/detail/decimal_tables.h',
                 'benchmarks/branch_profile64.cpp'],
}


def hashes(format_id):
    return {name: hashlib.sha256((ROOT / name).read_text(encoding='utf-8').encode()).hexdigest()
            for name in SOURCES[format_id]}


def collect(file):
    samples = {}
    rows = list(csv.DictReader(Path(file).read_text(encoding='utf-8').splitlines()))
    groups = {}
    for row in rows:
        key = row['corpus'], int(row['seed'])
        group = groups.setdefault(key, {'n': int(row['n']), 'guard': {}, 'branch': {}, 'reason': {}})
        assert group['n'] == int(row['n'])
        assert row['name'] not in group[row['kind']]
        group[row['kind']][row['name']] = [int(row['reached']), int(row['true_count'])]
    for (corpus, seed), group in groups.items():
        s = samples.setdefault(corpus, {'n': 0, 'seeds': [], 'guards': {}, 'branches': {}, 'reasons': {}})
        s['n'] += group['n']
        s['seeds'].append({'seed': hex(seed), 'n': group['n']})
        for name, pair in group['guard'].items():
            counts = s['guards'].setdefault(name, [0, 0])
            counts[0] += pair[0]
            counts[1] += pair[1]
        for kind, output in [('branch', 'branches'), ('reason', 'reasons')]:
            for name, (reached, hits) in group[kind].items():
                assert reached == group['n']
                s[output][name] = s[output].get(name, 0) + hits
    return samples


def validate(format_id, data):
    assert data['sourceSha256'] == hashes(format_id), 'Kernel/profile changed; rerun the branch profilers'
    expected = {'random-finite-bits', 'decimal-1-to-6'} | {
        f'precision-d{i}' for i in range(1, 10 if format_id == 'binary32' else 18)}
    assert set(data['samples']) == expected
    for s in data['samples'].values():
        n, g, b, reasons = s['n'], s['guards'], s['branches'], s['reasons']
        assert n > 0 and n == sum(seed['n'] for seed in s['seeds'])
        assert {seed['seed'] for seed in s['seeds']} == {'0x3156a5', '0x9a71de'}
        assert all(0 <= hits <= reached <= n for reached, hits in g.values())
        assert all(0 <= hits <= n for hits in [*b.values(), *reasons.values()])
        assert sum(b.values()) == n and sum(reasons.values()) == b['fallback']
        if format_id == 'binary32':
            assert g['check-nonfinite'] == [n, 0]
            assert g['check-power'][0] == n
            assert g['check-integer-range'][0] == n - g['check-power'][1]
            assert g['check-integer-bits'][0] == g['check-integer-range'][1]
            assert g['check-tiny'][0] == g['check-integer-range'][0] - g['check-integer-bits'][1]
            assert g['check-coarse'][0] == g['check-tiny'][0] - g['check-tiny'][1]
            assert g['check-boundary'][0] == g['check-coarse'][0] - g['check-coarse'][1]
            assert g['check-fine-change'][0] == g['check-boundary'][0] - g['check-boundary'][1]
            assert g['check-fine-tie'][0] == g['check-fine-change'][0] - g['check-fine-change'][1]
            assert b['coarse'] == g['check-coarse'][1]
            assert b['fine'] == g['check-fine-tie'][0] - g['check-fine-tie'][1]
            assert all(reasons[name] == g[name][1] for name in reasons)
        else:
            assert g['check-special'][0] == n
            assert g['check-integer-range'][0] == n - g['check-special'][1]
            assert g['check-integer-bits'][0] == g['check-integer-range'][1]
            assert g['check-power'][0] == g['check-integer-range'][0] - g['check-integer-bits'][1]
            assert g['check-boundary'][0] == g['check-power'][0] - g['check-power'][1]
            assert g['check-rounding'][0] == g['check-boundary'][0] == g['check-ambiguity'][0]
            assert max(g['check-boundary'][1], g['check-rounding'][1]) <= g['check-ambiguity'][1]
            assert g['check-ambiguity'][1] <= g['check-boundary'][1] + g['check-rounding'][1]
            assert g['check-tail'][0] == g['check-ambiguity'][0] - g['check-ambiguity'][1]
            assert b['coarse'] == g['check-tail'][1]
            assert b['fine'] == g['check-tail'][0] - g['check-tail'][1]
            assert reasons['subnormal'] + g['check-ambiguity'][1] == b['fallback']
            assert reasons['check-boundary'] == g['check-boundary'][1]
            assert reasons['check-rounding'] == g['check-ambiguity'][1] - g['check-boundary'][1]


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--binary32', help='CSV output from branch_profile32')
    parser.add_argument('--binary64', help='CSV output from branch_profile64')
    parser.add_argument('--environment', help='Compiler, platform and C library used to sample')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.binary32 or args.binary64:
        if not (args.binary32 and args.binary64 and args.environment) or args.check:
            parser.error('Recording needs both CSVs and --environment, without --check')
        record = {'recorded': date.today().isoformat(), 'environment': args.environment, 'formats': {}}
        for name, file in [('binary32', args.binary32), ('binary64', args.binary64)]:
            record['formats'][name] = {'policy': 'Fast' if name == 'binary32' else 'Balanced',
                                      'sourceSha256': hashes(name), 'samples': collect(file)}
            validate(name, record['formats'][name])
        RECORD.write_text(json.dumps(record, indent=2) + '\n', encoding='utf-8')
    else:
        record = json.loads(RECORD.read_text(encoding='utf-8'))
        for name, data in record['formats'].items():
            validate(name, data)
    output = '// SPDX-License-Identifier: Unlicense\n// Generated from compact measured counts by build:docs.\nexport const BRANCH_RATES=' + json.dumps(record, separators=(',', ':')) + ';\n'
    if args.check:
        assert TARGET.read_text(encoding='utf-8') == output, 'Run npm run build:docs'
    else:
        TARGET.write_text(output, encoding='utf-8')
    for name, data in record['formats'].items():
        s = data['samples']['random-finite-bits']
        print(f"{name} {data['policy']}: {s['branches']['fallback']}/{s['n']} fallback ({100*s['branches']['fallback']/s['n']:.6f}%)")

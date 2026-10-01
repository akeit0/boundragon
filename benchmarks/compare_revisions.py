#!/usr/bin/env python3
"""Paired numeric timing against an immutable Git baseline; no upstream downloads."""
import argparse
import csv
import hashlib
import io
import json
import platform
from pathlib import Path
import statistics
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def command(args, **kwargs):
    return subprocess.check_output(args, cwd=ROOT, **kwargs)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', required=True, help='Git revision to compare against')
    parser.add_argument('--compiler', default='g++')
    parser.add_argument('--out', type=Path, default=ROOT / 'build/revision-comparison')
    parser.add_argument('--n', type=int, default=131072)
    parser.add_argument('--trials', type=int, default=11)
    parser.add_argument('--repeats', type=int, default=16)
    parser.add_argument('--seeds', nargs='+', type=lambda s: int(s, 0), default=[0x3156a5, 0x9a71de])
    args = parser.parse_args()
    if min(args.n, args.trials, args.repeats) <= 0:
        parser.error('n, trials and repeats must be positive')
    if any(seed < 0 or seed >= 2**64 for seed in args.seeds):
        parser.error('seeds must fit uint64_t')
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    revision = command(['git', 'rev-parse', '--verify', args.baseline + '^{commit}'], text=True).strip()
    baseline = out / 'baseline'
    paths = command(['git', 'ls-tree', '-r', '--name-only', revision, 'include'], text=True).splitlines()
    manifests = {'before': {}, 'after': {}}
    for path in paths:
        data = command(['git', 'show', revision + ':' + path])
        target = baseline / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        manifests['before'][path] = hashlib.sha256(data).hexdigest()
    # Snapshot the working headers too: the recorded hashes identify exactly
    # what was compiled, even if the working tree changes after the run.
    current = out / 'current'
    for source in sorted((ROOT / 'include').rglob('*.h')):
        path = source.relative_to(ROOT).as_posix()
        data = source.read_bytes()
        target = current / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        manifests['after'][path] = hashlib.sha256(data).hexdigest()
    flags = ['-std=c++20', '-O3', '-march=native', '-flto', '-fno-ipa-icf',
             '-ffunction-sections', '-fdata-sections']
    for label, snapshot in [('before', baseline), ('after', current)]:
        # Historical baselines keep their original paths, bytes and namespace.
        name = 'boundragon' if (snapshot / 'include/boundragon/boundragon.h').is_file() else 'kurikara'
        cmd = [args.compiler, *flags, '-I' + str(snapshot / 'include'),
               '-Dboundragon=boundragon_' + label, '-DREVISION_CONVERT=revision_' + label,
               f'-DREVISION_HEADER="{name}/{name}.h"',
               '-DREVISION_BATCH=batch_' + label, '-c', str(ROOT / 'benchmarks/revision_entry.cpp'),
               '-o', str(out / (label + '.o'))]
        if name != 'boundragon':
            cmd.insert(1, '-D' + name + '=boundragon_' + label)
        subprocess.run(cmd, cwd=ROOT, check=True)
    exe = out / ('paired.exe' if sys.platform == 'win32' else 'paired')
    subprocess.run([args.compiler, *flags, str(ROOT / 'benchmarks/revision_benchmark.cpp'),
                    str(out / 'before.o'), str(out / 'after.o'), '-Wl,--gc-sections', '-o', str(exe)],
                   cwd=ROOT, check=True)
    rows = []
    for seed in args.seeds:
        print(f'Validating and measuring seed {seed:#x}', flush=True)
        text = command([str(exe), str(args.n), str(args.trials), str(args.repeats), str(seed)], text=True)
        rows.extend(csv.DictReader(io.StringIO(text)))
    with (out / 'timings.csv').open('w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)
    cpu = platform.processor()
    if Path('/proc/cpuinfo').exists():
        cpu = next((line.split(':', 1)[1].strip() for line in Path('/proc/cpuinfo').read_text().splitlines()
                    if line.startswith('model name')), cpu)
    metadata = {'baselineCommit': revision, 'headers': manifests, 'compiler': command([args.compiler, '--version'], text=True),
                'flags': flags + ['-Wl,--gc-sections'], 'platform': platform.platform(), 'cpu': cpu,
                'n': args.n, 'trials': args.trials, 'repeats': args.repeats, 'seeds': args.seeds,
                'clock': 'CLOCK_THREAD_CPUTIME_ID' if sys.platform.startswith('linux') else 'std::clock (single-thread process CPU)',
                'harnessSha256': {name: hashlib.sha256((ROOT / 'benchmarks' / name).read_bytes()).hexdigest()
                                  for name in ['revision_api.h', 'revision_entry.cpp', 'revision_benchmark.cpp', 'compare_revisions.py']}}
    (out / 'manifest.json').write_text(json.dumps(metadata, indent=2) + '\n', encoding='utf-8')
    groups = {}
    paired = {}
    for row in rows:
        key = row['format'], row['policy'], row['corpus']
        groups.setdefault(key, {}).setdefault(row['revision'], []).append(float(row['ns_per_value']))
        paired.setdefault((*key, row['seed'], row['trial']), {})[row['revision']] = float(row['ns_per_value'])
    report = ['# Paired numeric revision comparison', '', f'Baseline: `{revision}`. After: header hashes in `manifest.json`.', '',
              f'{cpu}; {metadata["platform"]}; {metadata["compiler"].splitlines()[0]}.', '',
              f'{len(args.seeds)} seeds, {args.trials} shuffled trials per seed, {args.n:,} stored inputs per corpus, {args.repeats} repetitions.', '',
              'Each input is checked for identical sign/coefficient/exponent across revisions before timing.',
              'Both revisions run in one process with separate library namespaces; compiler ICF is disabled.',
              'Timing uses CPU time. Conversion and normalization are timed; corpus construction, parsing and formatting are excluded.',
              'Checksums are consumed and checked after timing. Before and after use identical stored inputs.', '',
              '| Format | Policy | Corpus | Before ns/value | After ns/value | Median paired change |',
              '| --- | --- | --- | ---: | ---: | ---: |']
    for key, values in sorted(groups.items()):
        before, after = (statistics.median(values[label]) for label in ['before', 'after'])
        ratios = [100 * (v['after'] / v['before'] - 1) for k, v in paired.items() if k[:3] == key]
        report.append('| ' + ' | '.join(key) + f' | {before:.3f} | {after:.3f} | {statistics.median(ratios):+.1f}% |')
    report += ['', 'Negative change means less CPU time. Results describe these corpora on this machine;',
               'they do not establish a universal speedup. Raw paired trials are in `timings.csv`.',
               'Numeric cache payload reductions are separate from linked executable footprint; this harness does not measure footprint.', '']
    (out / 'REPORT.md').write_text('\n'.join(report), encoding='utf-8')
    print(out / 'REPORT.md')


if __name__ == '__main__':
    main()

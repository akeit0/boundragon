#!/usr/bin/env python3
"""Linux/WSL binary64 integrated writers only; no component adapters."""
import argparse
import csv
import hashlib
import io
import json
import os
from pathlib import Path
import platform
import random
import statistics
import subprocess
import sys
from fetch import fetch
CORPORA = ['random-finite-bits', 'one-to-two', 'decimal-1-to-6', 'precision-mixed',
           'simple', 'powers-of-two', 'subnormals', 'integers']
ROOT = Path(__file__).resolve().parents[1]
HERE = ROOT / 'benchmarks'
METHODS = ['boundragon-balanced-integrated-zmij', 'boundragon-balanced-integrated-xjb',
           'zmij-native', 'xjb-native', 'xjb-compact-native',
           'boundragon-fast-integrated-zmij', 'boundragon-fast-integrated-xjb']


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sources():
    files = list((ROOT / 'include').rglob('*.h'))
    files += [HERE / name for name in ['run_integrated_writers.py', 'fetch.py',
        'extract_emitters.py', 'dependencies.json', 'numeric_corpora.h', 'writer_decimal.h',
        'integrated_writer.h', 'integrated_methods.h', 'integrated_benchmark.cpp',
        'integrated_size.cpp', 'string_xjb_native.cpp', 'string_xjb_compact.cpp',
        'generated/zmij_emitter.h', 'generated/xjb_emitter.h']]
    return {p.relative_to(ROOT).as_posix(): digest(p) for p in sorted(files)}


def paired_change(rows, fmt, corpus, current, baseline):
    a = {(r['seed'], r['trial']): float(r['ns_per_value']) for r in rows
         if r['format'] == fmt and r['corpus'] == corpus and r['method'] == current}
    b = {(r['seed'], r['trial']): float(r['ns_per_value']) for r in rows
         if r['format'] == fmt and r['corpus'] == corpus and r['method'] == baseline}
    ratios = [a[key] / b[key] for key in sorted(a)]
    rng = random.Random(3156)
    boot = sorted(statistics.median(rng.choices(ratios, k=len(ratios))) for _ in range(3000))
    return tuple((x - 1) * 100 for x in (statistics.median(ratios), boot[75], boot[2924]))


def report(out, rows, sizes, meta):
    groups = {}
    for row in rows:
        groups.setdefault((row['corpus'], row['method']), []).append(float(row['ns_per_value']))
    lines = ['# Binary64 integrated writers', '',
        'Primary comparison: binary64 input to final text in a caller-owned buffer. '
        'Only integrated writers appear here; pure canonical conversion has its own suite.', '',
        'Boundragon entries are experimental benchmark implementations: the rounding kernel passes its '
        '16 leading positions and final digit directly to the pinned upstream digit-writing tail. '
        'No public `Decimal`, canonical normalization, component-width bridge, or public string API is involved. '
        'Native zmij and both native xjb implementations remain unmodified. '
        'The two Boundragon entries retain each respective native full writer layout.', '',
        f"Compiler: `{meta['compiler'].splitlines()[0]}`. CPU: {meta['cpu']}. "
        f"CPU {meta['affinityCpu']}; thread CPU time. {meta['n']:,} values/corpus, "
        f"{meta['repeats']} passes, {meta['trials']} trials for each of {len(meta['seeds'])} seeds.", '',
        '## Integrated writer medians (ns/value)', '',
        '| Corpus | Balanced, zmij tail | Native zmij | Balanced, xjb tail | Native xjb | Native compact xjb |',
        '|---|---:|---:|---:|---:|---:|']
    for corpus in CORPORA:
        times = [statistics.median(groups[corpus, METHODS[m]]) for m in [0,2,1,3,4]]
        lines.append('| '+corpus+' | '+' | '.join(f'{t:.2f}' for t in times)+' |')
    lines += ['', '## Relative to the corresponding full native writer', '',
        'Median paired time ratios minus one; negative means less time. Parentheses are '
        'percentile bootstrap 95% intervals across paired seed/trial observations on this machine.', '',
        '| Corpus | Balanced, zmij tail vs native zmij | Balanced, xjb tail vs native xjb |',
        '|---|---:|---:|']
    for corpus in CORPORA:
        cells = []
        for a,b in [(0,2),(1,3)]:
            change, lo, hi = paired_change(rows, 'binary64', corpus, METHODS[a], METHODS[b])
            cells.append(f'{change:+.1f}% ({lo:+.1f}, {hi:+.1f})')
        lines.append('| '+corpus+' | '+' | '.join(cells)+' |')
    lines += ['', '## Linked footprint', '',
        'Separate linked ELF per writer; `.text` + `.rodata` minus a common input/output '
        'control. Includes conversion and formatting, LTO and section garbage collection.', '',
        '| Writer | Bytes |', '|---|---:|']
    for row in sizes:
        lines.append(f"| {row['method']} | {row['incremental_bytes']:,} |")
    if meta['includeFast']:
        lines += ['', '## Optional Fast control', '',
            'Fast is retained here only as a control for deciding whether its exponent-shift table '
            'justifies the footprint. Primary tables above use Balanced.', '',
            '| Corpus | Fast, zmij tail | Balanced, zmij tail | Fast, xjb tail | Balanced, xjb tail |',
            '|---|---:|---:|---:|---:|']
        for corpus in CORPORA:
            times = [statistics.median(groups[corpus, METHODS[m]]) for m in [5,0,6,1]]
            lines.append('| '+corpus+' | '+' | '.join(f'{t:.2f}' for t in times)+' |')
    lines += ['', '## Validation', '',
        '- Every finite input is parsed back to its exact bits and checked against independent Dragonbox '
        'shortest/closest/even components. Signed zeros and special tokens are checked.',
        '- Adversarial cases cover every binary exponent, boundary significands, subnormal powers and '
        'decimal-power neighbors. Same-tail output must match the full native writer byte for byte.',
        '- Canaries check documented full-writer capacities. Compact native xjb receives 64 bytes '
        'because some writes exceed its advertised 33-byte capacity; counts are in `validation.txt`.',
        '- Timed loops write 64-byte slots and lengths, without parsing, hashing or allocation. '
        'An untimed checksum checks all output bytes. Trials shuffle writer order and verify CPU affinity.',
        '- Pure canonical conversion has a separate harness and does not call a writer. '
        'These results describe this compiler, machine and corpus mix.', '',
        'Raw measurements: `timings.csv`, `sizes.csv`, `validation.txt`. `manifest.json` records '
        'source/dependency/artifact hashes; `sources/` preserves the exact measured local source bytes.']
    (out / 'REPORT.md').write_text('\n'.join(lines)+'\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler', default='g++')
    parser.add_argument('--out', type=Path, default=ROOT / 'build/integrated-writers')
    parser.add_argument('--n', type=int, default=65536)
    parser.add_argument('--trials', type=int, default=11)
    parser.add_argument('--repeats', type=int, default=16)
    parser.add_argument('--seeds', nargs='+', type=lambda x:int(x,0), default=[0x3156a5,0x9a71de])
    parser.add_argument('--include-fast', action='store_true')
    parser.add_argument('--sanitize', action='store_true', help='ASan/UBSan validation only, including native writers')
    args = parser.parse_args()
    if not sys.platform.startswith('linux'):
        parser.error('Run under Linux or WSL')
    if min(args.n,args.trials,args.repeats)<=0 or any(s<0 or s>=2**64 for s in args.seeds):
        parser.error('positive counts and uint64 seeds required')
    out=args.out.resolve();out.mkdir(parents=True,exist_ok=True)
    if (out/'manifest.json').exists():
        parser.error('choose a fresh output directory')
    commands=[]
    def run(command, **kwargs):
        command=list(map(str,command));commands.append(command)
        (out/'commands.json').write_text(json.dumps(commands,indent=2)+'\n')
        try:
            return subprocess.check_output(command,cwd=ROOT,stderr=subprocess.STDOUT,**kwargs)
        except subprocess.CalledProcessError as error:
            print(error.output.decode() if isinstance(error.output,bytes) else error.output)
            raise
    dependencies=fetch()
    run([sys.executable,HERE/'extract_emitters.py'])
    run([sys.executable,HERE/'extract_emitters.py','--check'])
    hashes=sources()
    for name in hashes:
        target=out/'sources'/name;target.parent.mkdir(parents=True,exist_ok=True)
        target.write_bytes((ROOT/name).read_bytes())
    flags=['-std=c++20','-O3','-DNDEBUG','-march=native','-flto','-fno-ipa-icf','-ffunction-sections','-fdata-sections']
    if args.sanitize:
        flags=['-std=c++20','-O1','-g','-march=native','-fsanitize=address,undefined',
            '-fno-sanitize-recover=all','-fno-omit-frame-pointer']
    defines=(['-DINTEGRATED_INCLUDE_FAST'] if args.include_fast else [])
    options=[*flags,*defines,'-I'+str(ROOT/'include')]
    objects=[]
    print('Building integrated binary64 writers',flush=True)
    for name,source in [('zmij',HERE/'deps/zmij/zmij.cc'),('xjb',HERE/'string_xjb_native.cpp'),('xjb-compact',HERE/'string_xjb_compact.cpp')]:
        obj=out/(name+'.o');run([args.compiler,*options,'-c',source,'-o',obj]);objects.append(obj)
    exe=out/'integrated';run([args.compiler,*options,HERE/'integrated_benchmark.cpp',*objects,'-Wl,--gc-sections','-o',exe])
    cpu=min(os.sched_getaffinity(0));rows=[];logs=[]
    for seed in args.seeds:
        print(f'Validating seed {seed:#x} on CPU {cpu}',flush=True)
        result=subprocess.run([str(exe),str(args.n),str(args.trials),str(args.repeats),str(seed),str(int(args.sanitize))],
            cwd=ROOT,text=True,capture_output=True,preexec_fn=lambda:os.sched_setaffinity(0,{cpu}))
        logs.append(f'Seed {seed:#x}\n'+result.stderr);(out/'validation.txt').write_text('\n'.join(logs))
        if result.returncode:raise RuntimeError(result.stderr)
        print(result.stderr.strip(),flush=True);rows.extend(csv.DictReader(io.StringIO(result.stdout)))
    sizes=[]
    if not args.sanitize:
        count=7 if args.include_fast else 5
        expected=len(args.seeds)*8*args.trials*count
        if len(rows)!=expected or len({(r['seed'],r['corpus'],r['trial'],r['method']) for r in rows})!=expected:
            raise RuntimeError('Incomplete/duplicated trials')
        if any(int(r['cpu_start'])!=cpu or int(r['cpu_end'])!=cpu or float(r['ns_per_value'])<=0 for r in rows):
            raise RuntimeError('Invalid timing/CPU migration')
        with (out/'timings.csv').open('w',newline='') as stream:
            writer=csv.DictWriter(stream,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
        print('Measuring integrated writer footprints',flush=True)
        control=0
        for method in range(-1,count):
            binary=out/f'size-{method}'
            run([args.compiler,*options,f'-DINTEGRATED_METHOD={method}',HERE/'integrated_size.cpp',*objects,'-Wl,--gc-sections','-o',binary])
            sections={}
            for line in run(['size','-A',binary],text=True).splitlines():
                fields=line.split()
                if len(fields)>=2 and fields[0] in ['.text','.rodata']:sections[fields[0]]=int(fields[1])
            total=sum(sections.values())
            if method<0:control=total
            else:sizes.append({'format':'binary64','method':METHODS[method], 'text_bytes':sections.get('.text',0),
                'rodata_bytes':sections.get('.rodata',0),'control_bytes':control,'incremental_bytes':total-control})
        with (out/'sizes.csv').open('w',newline='') as stream:
            writer=csv.DictWriter(stream,fieldnames=list(sizes[0]));writer.writeheader();writer.writerows(sizes)
    if sources()!=hashes:raise RuntimeError('Sources changed during run')
    meta={'scope':'integrated binary64 writers only','sourcesSha256':hashes,'upstream':dependencies,
        'compiler':run([args.compiler,'--version'],text=True),'flags':options+['-Wl,--gc-sections'],
        'platform':platform.platform(),'cpu':next(line.split(':',1)[1].strip() for line in Path('/proc/cpuinfo').read_text().splitlines() if line.startswith('model name')),
        'affinityCpu':cpu,'clock':'CLOCK_THREAD_CPUTIME_ID','n':args.n,'trials':args.trials,'repeats':args.repeats,
        'seeds':args.seeds,'includeFast':args.include_fast,'sanitizers':args.sanitize}
    if not args.sanitize:report(out,rows,sizes,meta)
    artifacts=['validation.txt','commands.json'] if args.sanitize else ['validation.txt','commands.json','timings.csv','sizes.csv','REPORT.md']
    meta['artifactsSha256']={name:digest(out/name) for name in artifacts}
    (out/'manifest.json').write_text(json.dumps(meta,indent=2)+'\n')
    print('Saved '+str(out),flush=True)


if __name__=='__main__':main()

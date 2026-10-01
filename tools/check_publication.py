#!/usr/bin/env python3
"""Check tracked publication sources for machine paths and README link targets."""
# SPDX-License-Identifier: Unlicense
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
# Absolute drive/WSL paths and Unix user-home paths never belong in public records.
LOCAL_PATH = re.compile(
    r"(?i)(?<![\w])(?:[a-z]:[\\/]|/mnt/[a-z]/|/(?:users|home)/)[^\s\"'<>]+"
)


def main():
    names = subprocess.check_output(
        ['git', 'ls-files', '-z'], cwd=ROOT
    ).decode('utf-8').split('\0')
    problems = []
    checked = 0
    for name in filter(None, names):
        if name.startswith('benchmarks/results/') and Path(name).name not in {'README.md', 'REPORT.md'}:
            problems.append(f'{name}: raw benchmark archive belongs in ignored build output')
        path = ROOT / name
        if not path.is_file():
            continue
        try:
            source = path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            continue
        checked += 1
        for number, line in enumerate(source.splitlines(), 1):
            if LOCAL_PATH.search(line):
                problems.append(f'{name}:{number}: machine-specific absolute path')
    readme = (ROOT / 'README.md').read_text(encoding='utf-8')
    for target in re.findall(r'\[[^\]]+\]\(([^)]+)\)', readme):
        if re.match(r'^[a-z]+:|^#', target, re.I):
            continue
        if not (ROOT / target.split('#', 1)[0]).is_file():
            problems.append(f'README.md: missing link target {target}')
    if problems:
        print('\n'.join(problems), file=sys.stderr)
        return 1
    print(f'Checked {checked} tracked text files: no machine paths; README links resolve.')
    return 0


if __name__ == '__main__':
    sys.exit(main())

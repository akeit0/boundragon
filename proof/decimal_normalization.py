#!/usr/bin/env python3
"""Check normalization constants against exact modular arithmetic.

The universal divisibility argument is in docs/proof.md, Section 10. This
certificate checks parameters in the current source, not compiled code.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
source = (ROOT / "include/boundragon/detail/canonical_decimal.h").read_text(encoding="utf-8")
groups = re.findall(r"remove_decimal_group\(sig, (\d+),\s*UINT64_C\((\d+)\), UINT64_C\((\d+)\)\)", source)
assert [int(k) for k, _, _ in groups] == [16, 8, 4, 2, 1]
modulus = 1 << 64
for k, inverse, bound in groups:
    k, inverse, bound = int(k), int(inverse), int(bound)
    assert inverse == pow(5**k, -1, modulus), k
    assert bound == (modulus - 1) // 10**k, k
    assert bound < 1 << (64 - k), k
assert "std::rotr(sig * UINT64_C(14757395258967641293), 1)" in source
assert "first > UINT64_C(1844674407370955161)" in source
assert len(str(modulus - 1)) - 1 == 19
assert 19 - 1 < 32 # First division leaves at most 18; five groups cover 0..31.
print("PASS normalization constants: first-digit guard and 16/8/4/2/1 groups")

#!/usr/bin/env python3
"""Certify Q40 cache/error guards, output bounds and all power-table entries."""
from fractions import Fraction
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tests"))
from binary32_oracle import oracle


def main():
    if not __debug__:
        raise RuntimeError("Certificates require Python assertions")
    if len(sys.argv) != 2:
        raise SystemExit("Usage: certify_binary32_fast.py COMPILED_PROBE")
    Q, M = 1 << 40, (1 << 24) - 1
    lines = subprocess.check_output([sys.argv[1]], text=True).splitlines()
    assert len(lines) == 255
    for expected_raw, line in enumerate(lines):
        raw, packed, sig, result_sig, result_exp = line.split()
        raw, t = int(raw), int(packed, 16)
        assert raw == expected_raw
        q = max(raw, 1) - 150
        xq = Fraction(2**q) if q >= 0 else Fraction(1, 2**-q)
        k = (q * 315653) >> 20
        ten = lambda e: Fraction(10**e) if e >= 0 else Fraction(1, 10**-e)
        assert ten(k) <= xq < ten(k+1)
        alpha = xq * ten(-k-1)
        w, h = t & (Q-1), (t & (Q-1)) // 2
        assert w == (alpha * Q).__floor__()
        assert (t >> 56) - 45 == k + 1
        assert 0 <= alpha * Q - w < 1
        assert h <= alpha * Q / 2 < h + 1
        assert M * w + Q // 2 < 1 << 64
        # The nonnearest coarse point is outside the true rounding interval,
        # even when center uncertainty straddles the observed half-grid point.
        assert Q // 2 - M > h + 1
        assert h >= Q // 20
        assert M * alpha + 1 < 10**8
        assert (M * alpha + 1) * 10 < 10**9
        d, e, sign = oracle(raw << 23)
        assert int(sig) == int(result_sig) == d and int(result_exp) == e
        assert ((t >> 48) & 255) - 45 == e and sign == 0
        assert d < 10**8
        # For m>=11 in the subnormal binade, the inherited shortest-grid lemma
        # applies. The first ten encodings are explicitly sent to exact fallback.
        mlo = 11 if raw <= 1 else (1 << 23) + 1
        assert (Fraction(mlo) - Fraction(1, 2)) * xq > ten(k)
    source = (ROOT / "include/boundragon/detail/float_decimal.h").read_text()
    for formula in ("constexpr uint64_t Q = UINT64_C(1) << 40, mask = Q - 1;",
                    "uint64_t(m) * w + Q / 2", "a + m + 1 < h", "a <= h + m + 1",
                    "rounded + int64_t(m) * 10", "(uint64_t(rounded) & mask) == 0", "if (m < 11)",
                    "unsigned(raw - 143) <= 7"):
        assert formula in source, formula
    # If a+m+1<h, the nearest coarse point is strictly inside every allowed
    # interval. If a>h+m+1, it is strictly outside every interval. The preceding
    # nonnearest-point bound excludes any other coarse candidate.
    # Stable floor((10*r+Q/2)/Q) across r..r+m chooses the same nearest fine
    # integer; excluding an exact lower threshold excludes ties. Any uncertain
    # decision goes to the separately certified exact fallback.
    # Since a>h+m+1>Q/20, an accepted fine digit cannot be zero. Coarse results
    # have <=7 trailing zeroes, covered by 4/2/1 groups, whose modular identities
    # are source-checked by certify_binary32.py.
    for trailing in range(8):
        n = 10**trailing
        for digits in (4, 2, 1):
            if n % 10**digits == 0:
                n //= 10**digits
        assert n == 1
    # The selective shortcut is a subset of the existing exact-integer path:
    # zero low fraction bits make the binary exponent's division exact.
    for raw in range(143, 151):
        shift = 150 - raw
        assert 0 <= shift <= 7
        assert (Fraction(1 << 23) * Fraction(2)**(raw - 150)) == 2**(raw - 127)
    print("PASS: all 255 compiled Q40 cache entries, radius/center-error bounds, uint64 product bounds, nonnearest coarse exclusion and coefficient bounds")
    print("PASS: signed zero and all 254 normal powers match the exact rational oracle")
    print("PASS: source-checked acceptance guards, tie rejection, first-ten dispatch and 4/2/1 normalization coverage")
    print("Scope: mathematical bounds plus source checks; exhaustive compiled-code cross-check is separate")


if __name__ == "__main__":
    main()

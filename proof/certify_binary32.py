#!/usr/bin/env python3
"""Exact finite certificates for the native binary32 converter.

The compiled probe binds checked integer formulas to the delivered cache and
exponent helpers. Ordered floor sums cover every regular significand. This is
an algorithmic certificate, not a C++ or generated-machine-code proof.
"""
from __future__ import annotations

import argparse
from fractions import Fraction
from pathlib import Path
import re
import subprocess
import sys
import time

from certify_fallback import (
    count_congruence, equal_floor_sequences, pow2, pow10, sum_affine,
    verify_floor_sum,
)

Q = 1 << 32
ROOT = Path(__file__).resolve().parents[1]


def normalized_power(p: int) -> tuple[int, int, Fraction]:
    value = pow10(p)
    n, d = value.numerator, value.denominator
    e = n.bit_length() - d.bit_length()
    if value < pow2(e):
        e -= 1
    exact = value * pow2(63 - e)
    return exact.numerator // exact.denominator, e, exact


def read_probe(executable: str):
    output = subprocess.run([executable], text=True, capture_output=True, check=True).stdout
    powers, exponents, irregular, small = {}, {}, {}, {}
    meta = None
    for line in output.splitlines():
        row = line.split()
        if row[0] == "meta":
            meta = tuple(map(int, row[1:]))
        elif row[0] == "power":
            powers[int(row[1])] = int(row[2], 16)
        elif row[0] == "exponent":
            exponents[int(row[1])] = tuple(map(int, row[2:]))
        elif row[0] == "irregular":
            irregular[int(row[1])] = tuple(map(int, row[2:]))
        elif row[0] == "small":
            small[int(row[1])] = tuple(map(int, row[2:]))
        else:
            raise AssertionError(f"Unexpected probe output: {line}")
    assert meta is not None
    return meta, powers, exponents, irregular, small


def verify_normalization_constants() -> None:
    # This part checks the current source parameters, not compiled machine
    # code. The universal divisibility argument is docs/proof.md Section 10.
    source = (ROOT / "include/boundragon/detail/float_decimal.h").read_text(encoding="utf-8")
    groups = re.findall(
        r"binary32_remove_decimal_group\(sig, (\d+),\s*UINT32_C\((\d+)\), UINT32_C\((\d+)\)\)",
        source,
    )
    assert [int(k) for k, _, _ in groups] == [4, 2, 1, 4, 2, 1]
    for k, inverse, bound in groups:
        k, inverse, bound = int(k), int(inverse), int(bound)
        assert inverse == pow(5**k, -1, Q), k
        assert bound == (Q - 1) // 10**k, k
        assert bound < 1 << (32 - k), k
    assert "std::rotr(sig * UINT32_C(3435973837), 1)" in source
    assert "first > UINT32_C(429496729)" in source
    assert pow(5, -1, Q) == 3435973837 and (Q - 1) // 10 == 429496729
    assert "assert(value.sig < UINT64_C(1000000000))" in source
    # A <10^9 coefficient has at most eight trailing zeroes. The first
    # division leaves at most seven, then 4/2/1 remove their binary digits.
    for trailing_after_first in range(8):
        remaining, removed = trailing_after_first, 0
        for k in (4, 2, 1):
            divisible = int(remaining >= k)
            remaining -= divisible * k
            removed = (removed << 1) | divisible
        assert remaining == 0 and removed == trailing_after_first
    print("PASS: source-checked binary32 normalization inverses/bounds and first/4/2/1 digit-removal coverage")


def main() -> None:
    if not __debug__:
        raise RuntimeError("Run without python -O or PYTHONOPTIMIZE; assertions are required")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("probe", help="compiled proof/binary32_probe.cpp executable")
    args = parser.parse_args()
    began = time.monotonic()
    verify_floor_sum()
    verify_normalization_constants()
    meta, powers, exponents, irregular, small = read_probe(args.probe)
    pmin, pmax = meta
    assert (pmin, pmax) == (-32, 44)
    assert set(powers) == set(range(pmin, pmax + 1))
    assert set(exponents) == set(range(1, 255))
    assert set(irregular) == set(range(1, 255))
    assert set(small) == set(range(1, 11))
    normalized = {}
    for p in range(pmin, pmax + 1):
        c, e, exact = normalized_power(p)
        assert powers[p] == c, ("cached power", p, powers[p], c)
        normalized[p] = c, e, exact
    print("PASS: all 77 compiled binary32 cached powers match independent exact integers (616 bytes)")

    domain_count = coarse_checks = fine_checks = exact_ties = quarter_checks = 0
    shifts, filter_shifts = set(), set()
    for raw in range(1, 255):
        q = raw - 150
        k, ki, shift, shift_i = exponents[raw]
        xq = pow2(q)
        assert pow10(k) <= xq < pow10(k + 1), ("regular decimal exponent", raw)
        assert pow10(ki) <= 3 * xq / 4 < pow10(ki + 1), ("irregular decimal exponent", raw)
        p, pi = -k - 1, -ki - 1
        assert pmin <= p <= pmax and pmin <= pi <= pmax
        c, e, exact_cache = normalized[p]
        _, ei, _ = normalized[pi]
        assert shift == q + e + 8 and 4 <= shift <= 7
        assert shift_i == q + ei + 8 and 4 <= shift_i <= 8
        fs = shift + 1
        assert 5 <= fs <= 8
        assert ((1 << 24) - 1) << fs < 1 << 32
        # The filter's centered addition is strictly below uint32_t wraparound.
        assert ((1 << 24) - 1) * xq * pow10(p) * 256 + 129 < 1 << 32
        shifts.add(shift)
        filter_shifts.add(fs)
        alpha = xq * pow10(p)
        assert Fraction(1, 10) <= alpha < 1
        assert (alpha == Fraction(1, 10)) == (q == 0)
        # The coarsest accepted coefficient and every fine result satisfy
        # the grouped normalizer's finite coefficient precondition.
        assert (((1 << 24) - 1) * alpha + 1) * 10 < 10**9
        alpha_i = xq * pow10(pi)
        assert ((1 << 23) * alpha_i + 1) * 10 < 10**9
        h0 = (c >> 32) >> (8 - shift)
        assert h0 == (alpha * Q / 2).__floor__()
        assert h0 + 1 < Q // 2
        # Its high32 is also the exact floor of the 32-bit normalized power.
        high = c >> 32
        assert high == (pow10(p) * pow2(31 - e)).__floor__()
        filter_h = high >> (33 - fs)
        assert filter_h == (alpha * 128).__floor__()
        # n<2^32 and the omitted normalized fraction<1 give 0<=Y-u<2.
        # This is the centered filter contract in docs/proof.md, with K=256.
        assert 2 < Fraction(256, 20) <= alpha * 128

        # The first exponent domain includes every subnormal and minimum normal.
        mlo = 1 if q == -149 else (1 << 23) + 1
        mhi = (1 << 24) - 1
        # The first ten subnormals are independently checked below. In
        # particular, binary32's very first lower endpoint is below 10^k.
        assert (Fraction(max(mlo, 11)) - Fraction(1, 2)) * xq > pow10(k)
        domain_count += mhi - mlo + 1
        a, b = c << shift, 1 << 39
        A, B = alpha.numerator, alpha.denominator
        for parity in (0, 1):
            first = mlo + ((parity - mlo) & 1)
            count = (mhi - first) // 2 + 1
            h = h0 + 1 - parity
            compiled_upper = (2 * a, a * first + h * b, b * Q)
            exact_upper = (4 * A, A * (2 * first + 1) - parity, 2 * B)
            compiled_lower = (2 * a, a * first - h * b, b * Q)
            exact_lower = (4 * A, A * (2 * first - 1) - (1 - parity), 2 * B)
            coarse_checks += equal_floor_sequences(count, compiled_upper, exact_upper,
                                                   f"q={q}, parity={parity}, upper")
            coarse_checks += equal_floor_sequences(count, compiled_lower, exact_lower,
                                                   f"q={q}, parity={parity}, lower")

        count = mhi - mlo + 1
        bias = Q // 2 + 6
        for j in range(1, 11):
            offset = Q - (j * Q - bias + 9) // 10
            compiled_threshold = (a, a * mlo + b * offset, b * Q)
            exact_threshold = (20 * A, 20 * A * mlo + (21 - 2 * j) * B, 20 * B)
            fine_checks += equal_floor_sequences(count, compiled_threshold, exact_threshold,
                                                 f"q={q}, fine threshold {j}")
        ties = count_congruence(mlo, mhi, 20 * A, -B, 2 * B)
        exact_ties += ties
        target = Q // 4
        seen_quarters = sum_affine(count, (a, a * mlo + b * (Q - target), b * Q)) \
                      - sum_affine(count, (a, a * mlo + b * (Q - target - 1), b * Q))
        true_quarters = count_congruence(mlo, mhi, 4 * A, B, 4 * B)
        true_three_quarters = count_congruence(mlo, mhi, 4 * A, 3 * B, 4 * B)
        assert ties == true_quarters + true_three_quarters, ("other half ties", q)
        assert seen_quarters == true_quarters, ("quarter detection", q)
        if true_quarters:
            assert exact_cache.denominator == 1 and p >= 0
        quarter_checks += 1

    print(f"PASS: all 254 exponent classes; exact logs, fallback shifts {min(shifts)}..{max(shifts)}, filter shifts {min(filter_shifts)}..{max(filter_shifts)}, radius floors and <2 filter error contract")
    print(f"PASS: {coarse_checks:,} ordered floor-sum equalities certify both regular interval boundaries and parity")
    print(f"PASS: {fine_checks:,} fine-rounding equalities and {quarter_checks:,} exact-quarter checks certify closest/ties-to-even")
    print(f"PASS: regular domains cover {domain_count:,} positive inputs; {exact_ties:,} exact halfway cases counted by congruences")

    # Keep this reference independent of the cached-power implementation.
    sys.path.insert(0, str(ROOT / "tests"))
    from binary32_oracle import oracle as oracle32
    for raw in range(1, 255):
        expected = oracle32(raw << 23)[:2]
        assert irregular[raw] == expected, ("normal power of two", raw, irregular[raw], expected)
    for m in range(1, 11):
        expected = oracle32(m)[:2]
        assert small[m] == expected, ("small subnormal", m, small[m], expected)
    print("PASS: all 254 normal powers of two and first 10 subnormals match the independent exact shortest/closest/even oracle")
    assert domain_count + len(irregular) - 1 == 0x7f7fffff
    print(f"PASS: complete positive finite nonzero coverage: {0x7f7fffff:,} binary32 encodings; sign symmetry covers negatives")
    print(f"PASS: completed in {time.monotonic() - began:.3f} seconds; mathematical certificate, not compiler verification")


if __name__ == "__main__":
    main()

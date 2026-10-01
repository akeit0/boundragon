#!/usr/bin/env python3
"""Exact, finite floor-sum certificates for the regular binary64 fallback.

This is an algorithmic certificate, not a C++ language or machine-code proof.
The probe checks bundled literals and exponent helpers.  Euclidean floor sums
then cover every regular significand, without enumerating the significands.
Irregular powers of two are checked against the independent exact oracle.
"""
from __future__ import annotations

import argparse
from fractions import Fraction
from math import gcd
from pathlib import Path
import subprocess
import sys
import time

Q = 1 << 64
MASK = Q - 1
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent


def pow10(p: int) -> Fraction:
    return Fraction(10**p) if p >= 0 else Fraction(1, 10**-p)


def pow2(q: int) -> Fraction:
    return Fraction(1 << q) if q >= 0 else Fraction(1, 1 << -q)


def normalized_power(p: int) -> tuple[int, int, Fraction]:
    value = pow10(p)
    n, d = value.numerator, value.denominator
    e = n.bit_length() - d.bit_length()
    if value < pow2(e):
        e -= 1
    exact = value * pow2(127 - e)
    return exact.numerator // exact.denominator, e, exact


def floor_sum(n: int, modulus: int, a: int, b: int) -> int:
    """Sum floor((a*i+b)/modulus), 0<=i<n, including signed a/b."""
    if n <= 0:
        return 0
    qa, a = divmod(a, modulus)
    qb, b = divmod(b, modulus)
    result = qa * n * (n - 1) // 2 + qb * n
    while True:
        if a >= modulus:
            result += (n - 1) * n * (a // modulus) // 2
            a %= modulus
        if b >= modulus:
            result += n * (b // modulus)
            b %= modulus
        ymax = a * n + b
        if ymax < modulus:
            return result
        n, b = divmod(ymax, modulus)
        modulus, a = a, modulus


def sum_affine(n: int, form: tuple[int, int, int], start: int = 0) -> int:
    a, b, d = form
    return floor_sum(n, d, a, b + a * start)


def equal_floor_sequences(n: int, left: tuple[int, int, int],
                          right: tuple[int, int, int], label: str) -> int:
    """Prove equality pointwise using order plus exact equal sums.

    The underlying rational lines differ by a linear function.  Split at its
    possible sign change.  On each piece floors are pointwise ordered, so zero
    total difference forces every integer difference to be zero.
    """
    a, b, d = left
    c, e, f = right
    slope, intercept = a*f - c*d, b*f - e*d
    cuts = [0, n]
    if n > 1 and slope:
        # A root can lie between adjacent integers or at an integer.  Cutting
        # immediately on each side of the floor of the root is harmless and
        # also covers exact equality at the root.
        root_floor = (-intercept) // slope
        for cut in (root_floor, root_floor + 1):
            if 0 < cut < n:
                cuts.append(cut)
    cuts = sorted(set(cuts))
    checks = 0
    for lo, hi in zip(cuts, cuts[1:]):
        dlo, dhi = slope*lo + intercept, slope*(hi-1) + intercept
        if not (dlo >= 0 and dhi >= 0 or dlo <= 0 and dhi <= 0):
            raise AssertionError(f'{label}: failed to split affine sign')
        ls, rs = sum_affine(hi-lo, left, lo), sum_affine(hi-lo, right, lo)
        if ls != rs:
            raise AssertionError(f'{label}: unequal floor sums on [{lo},{hi}): {ls-rs}')
        checks += 1
    return checks


def count_congruence(lo: int, hi: int, a: int, target: int, modulus: int) -> int:
    common = gcd(a, modulus)
    if target % common:
        return 0
    a, target, modulus = a//common, target//common, modulus//common
    residue = 0 if modulus == 1 else target * pow(a, -1, modulus) % modulus
    return (hi-residue)//modulus - (lo-1-residue)//modulus


def verify_floor_sum() -> None:
    # Deliberately independent, directly enumerated small examples, including
    # signed numerators and zero coefficient, verify the Euclidean routine.
    for n in range(12):
        for modulus in range(1, 15):
            for a in range(-9, 18):
                for b in (-19, -1, 0, 1, 9, 23):
                    expected = sum((a*i+b)//modulus for i in range(n))
                    assert floor_sum(n, modulus, a, b) == expected


def read_probe(executable: str):
    result = subprocess.run([executable], text=True, capture_output=True, check=True)
    powers, exponents, irregular, small = {}, {}, {}, {}
    meta = None
    for line in result.stdout.splitlines():
        row = line.split()
        if row[0] == 'meta':
            meta = tuple(map(int, row[1:]))
        elif row[0] == 'power':
            powers[int(row[1])] = tuple(int(v, 16) for v in row[2:])
        elif row[0] == 'exponent':
            exponents[int(row[1])] = tuple(map(int, row[2:]))
        elif row[0] == 'irregular':
            irregular[int(row[1])] = tuple(map(int, row[2:]))
        elif row[0] == 'small':
            small[int(row[1])] = tuple(map(int, row[2:]))
        else:
            raise AssertionError(f'Unexpected probe output: {line}')
    if meta is None:
        raise AssertionError('Missing probe metadata')
    return meta, powers, exponents, irregular, small


def main() -> None:
    if not __debug__:
        raise RuntimeError('Exact certification requires assertions; run without python -O or PYTHONOPTIMIZE')
    parser = argparse.ArgumentParser()
    parser.add_argument('probe', help='compiled certificate_probe executable')
    args = parser.parse_args()
    began = time.monotonic()
    verify_floor_sum()
    meta, powers, exponents, irregular, small = read_probe(args.probe)
    pmin, pmax = meta
    assert set(powers) == set(range(pmin, pmax+1))
    assert set(exponents) == set(range(1, 2047))
    assert set(irregular) == set(range(1, 2047))
    assert set(small) == set(range(1, 11))
    normalized = {}
    for p in range(pmin, pmax+1):
        c, e, exact = normalized_power(p)
        h, low = c >> 64, c & MASK
        literal_hi, literal_lo, hot_hi, rebuilt_hi, rebuilt_lo = powers[p]
        rebuilt = (rebuilt_hi << 64) | rebuilt_lo
        assert (literal_hi, literal_lo, hot_hi) == (h, low, h), ('literal power', p)
        assert c <= rebuilt <= c + 1 and rebuilt_hi == h, ('compact power', p)
        # Certify the coefficient actually consumed by the C++ fallback.
        normalized[p] = rebuilt, e, exact
    print(f'PASS: {len(powers)} literal powers/high limbs; compiled compact coefficients are C or C+1 with exact high limbs')

    domain_count = 0
    coarse_checks = fine_checks = exact_ties = quarter_checks = 0
    s_values = set()
    for raw in range(1, 2047):
        q = raw - 1075
        k, ki, shift, shift_table, shift_i = exponents[raw]
        # Inequalities prove floor(log10) without using floating arithmetic.
        xq = pow2(q)
        assert pow10(k) <= xq < pow10(k+1), ('regular decimal exponent', raw)
        assert pow10(ki) <= 3*xq/4 < pow10(ki+1), ('irregular decimal exponent', raw)
        p, pi = -k-1, -ki-1
        assert pmin <= p <= pmax and pmin <= pi <= pmax
        c, e, exact_cache = normalized[p]
        ci, ei, _ = normalized[pi]
        assert shift == shift_table == q+e+10, ('regular shift', raw)
        assert shift_i == q+ei+10, ('irregular shift', raw)
        fs = shift+2
        assert 8 <= fs <= 11
        assert fs == 8 + ((q + (e & 3)) & 3)
        # All public filters add at most K/2+3 to an underestimated center.
        # This exact bound excludes wraparound in that addition for normals.
        assert ((1 << 53)-1)*xq*pow10(p)*2048 + 1027 < (1 << 64)
        s_values.add(fs)
        alpha = xq * pow10(p)
        assert Fraction(1, 10) <= alpha < 1
        assert (alpha == Fraction(1, 10)) == (q == 0)
        h0 = (c >> 64) >> (10-shift)
        assert h0 == (alpha*Q/2).__floor__()
        assert h0+1 < Q//2
        # All raw filters choose at most ceil(m*alpha), then append one digit.
        # This also bounds the reconstructed fallback before normalization.
        assert (((c << shift) * ((1 << 53)-1)) >> 137) * 10 + 10 < 10**17
        # q=-1074 covers all subnormal significands as well as this exponent's
        # ordinary normals. It includes minimum-normal under its true regular
        # interval; that actual irregular code path is checked separately.
        mlo = 1 if q == -1074 else (1 << 52)+1
        mhi = (1 << 53)-1
        assert (Fraction(mlo)-Fraction(1, 2))*xq > pow10(k), ('decade-grid nesting', q)
        domain_count += mhi-mlo+1
        a, b = c << shift, 1 << 73
        A, B = alpha.numerator, alpha.denominator
        for parity in (0, 1):
            first = mlo + ((parity-mlo) & 1)
            count = (mhi-first)//2 + 1
            h = h0+1-parity
            # m=first+2*t and F=floor(a*m/b).
            compiled_upper = (2*a, a*first+h*b, b*Q)
            exact_upper = (4*A, A*(2*first+1)-parity, 2*B)
            compiled_lower_minus_one = (2*a, a*first-h*b, b*Q)
            exact_lower_minus_one = (4*A, A*(2*first-1)-(1-parity), 2*B)
            coarse_checks += equal_floor_sequences(count, compiled_upper, exact_upper,
                                                   f'q={q}, parity={parity}, upper')
            coarse_checks += equal_floor_sequences(count, compiled_lower_minus_one,
                                                   exact_lower_minus_one,
                                                   f'q={q}, parity={parity}, lower')

        # Decompose both compiled and exact rounding into ten threshold floors.
        # Their pairwise equality avoids any loss from a coarse sandwich around
        # the inner truncated product, even at adversarial near-halfway inputs.
        count = mhi-mlo+1
        # For any integer F and 0<=d<Q, the following threshold decomposition
        # is an identity, including F outside [0,Q):
        # floor((10F+d)/Q) = sum_{j=1}^{10} floor((F+t_j)/Q),
        # t_j = Q-ceil((jQ-d)/10). Each nested floor now collapses exactly.
        d = Q//2+6
        for j in range(1, 11):
            offset = Q - (j*Q-d+9)//10
            compiled_threshold = (a, a*mlo+b*offset, b*Q)
            exact_threshold = (20*A, 20*A*mlo+(21-2*j)*B, 20*B)
            fine_checks += equal_floor_sequences(count, compiled_threshold,
                                                 exact_threshold, f'q={q}, fine threshold {j}')
        ties = count_congruence(mlo, mhi, 20*A, -B, 2*B)
        exact_ties += ties

        # The reference's f==Q/4 correction must detect exactly z mod 1=1/4.
        t = Q//4
        seen_quarters = sum_affine(count, (a, a*mlo+b*(Q-t), b*Q)) \
                      - sum_affine(count, (a, a*mlo+b*(Q-t-1), b*Q))
        true_quarters = count_congruence(mlo, mhi, 4*A, B, 4*B)
        true_three_quarters = count_congruence(mlo, mhi, 4*A, 3*B, 4*B)
        assert ties == true_quarters + true_three_quarters, ('other halfway fractions', q)
        assert seen_quarters == true_quarters, ('quarter correction', q, seen_quarters, true_quarters)
        if true_quarters:
            assert exact_cache.denominator == 1 and p >= 0
            # At a true quarter, exact F is integral. Reconstruction adds a
            # nonnegative contribution strictly below one, so its floor and
            # quarter detector are unchanged. Counts exclude false positives.
            assert 0 <= (c-exact_cache) * (mhi << shift) < b
        quarter_checks += 1

    print(f'PASS: all 2,046 exponent classes; exact log constants, shift range {min(s_values)}..{max(s_values)}, phase recovery, and radius floors')
    print(f'PASS: {coarse_checks:,} ordered floor-sum equalities certify both coarse interval boundaries for every regular significand and parity')
    print(f'PASS: {fine_checks:,} fine-rounding checks and {quarter_checks:,} exact quarter-detection counts certify closest/ties-to-even selection')
    print(f'PASS: regular domains cover {domain_count:,} positive inputs, including all subnormals and one independently checked minimum-normal overlap')
    print(f'PASS: exact halfway multiplicity checked by congruences: {exact_ties:,}')

    sys.path.insert(0, str(ROOT / "tests"))
    from exact_oracle import oracle
    for raw in range(1, 2047):
        sig, exp = irregular[raw]
        expected = oracle(raw << 52)
        assert (sig, exp) == expected, ('irregular', raw, expected)
    print('PASS: all 2,046 actual irregular power-of-two paths, including minimum normal, match the independent exact shortest/closest/even oracle')
    for m in range(1, 11):
        sig, exp = small[m]
        expected = oracle(m)
        assert (sig, exp) == expected, ('small subnormal', m, expected)
    print('PASS: first 10 subnormals independently settle the small-significand decade-boundary closest-policy exception')
    assert domain_count+len(irregular)-1 == 0x7fefffffffffffff
    print(f'PASS: complete positive finite nonzero coverage: {0x7fefffffffffffff:,} binary64 encodings; sign symmetry covers negatives')
    print(f'PASS: completed in {time.monotonic()-began:.3f} seconds; mathematical certificate, not a compiler or machine-code verification')


if __name__ == '__main__':
    main()

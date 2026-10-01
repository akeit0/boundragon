#!/usr/bin/env python3
"""Independent shortest/closest/even oracle using exact rational intervals.
No cached-power implementation or host float formatter is used by the oracle.
Requires the compiled decimal_cli executable as argv[1].
"""
import random
import struct
import subprocess
import sys
from fractions import Fraction

P10 = [10**n for n in range(400)]

def dyadic(m: int, e: int) -> tuple[int, int]:
    return (m << e, 1) if e >= 0 else (m, 1 << -e)

def scaled(n: int, d: int, e: int) -> tuple[int, int]:
    return (n, d * P10[e]) if e >= 0 else (n * P10[-e], d)

def canonical(d: int, e: int) -> tuple[int, int]:
    while d and d % 10 == 0:
        d //= 10
        e += 1
    return d, e

def oracle(bits: int) -> tuple[int, int]:
    raw, m = (bits >> 52) & 2047, bits & ((1 << 52) - 1)
    if raw == 2047 or (raw == 0 and m == 0):
        raise ValueError('Oracle expects nonzero finite inputs')
    if raw:
        m |= 1 << 52
    q = max(raw, 1) - 1075
    irregular = raw > 1 and m == 1 << 52
    xn, xd = dyadic(m, q)
    ln, ld = dyadic(4*m - 2 + irregular, q-2)
    un, ud = dyadic(4*m + 2, q-2)
    even = (m & 1) == 0
    order = len(str(xn)) - len(str(xd))
    a, b = scaled(xn, xd, order)
    if a < b:
        order -= 1
    x = Fraction(xn, xd)
    for digits in range(1, 18):
        candidates = []
        # Adjacent orders cover a rounding interval that straddles 10**order.
        for e in range(order-digits, order-digits+3):
            a, b = scaled(ln, ld, e)
            lo = (a+b-1)//b if even else a//b + 1
            a, b = scaled(un, ud, e)
            hi = a//b if even else (a-1)//b
            lo, hi = max(lo, P10[digits-1]), min(hi, P10[digits]-1)
            if lo > hi:
                continue
            a, b = scaled(xn, xd, e)
            t, r = divmod(a, b)
            t += (2*r > b) or (2*r == b and t & 1)
            t = min(hi, max(lo, t))
            value = Fraction(t*P10[e], 1) if e >= 0 else Fraction(t, P10[-e])
            candidates.append((abs(value-x), t & 1, t, e))
        if candidates:
            _, _, d, e = min(candidates)
            return canonical(d, e)
    raise AssertionError('No <=17-digit candidate')

def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python3 tests/exact_oracle.py ./build/decimal_cli')
    rng = random.Random(0x504f575245434950)
    bits = set()
    for _ in range(12000):
        b = rng.getrandbits(64) & ((1 << 63)-1)
        if ((b >> 52) & 2047) != 2047 and b:
            bits.add(b)
    for raw in range(1, 2047):
        for delta in (-1, 0, 1):
            bits.add((raw << 52) + delta)
    for e in range(-323, 309):
        b = struct.unpack('>Q', struct.pack('>d', float(f'1e{e}')))[0]
        for delta in (-1, 0, 1):
            bits.add(b + delta)
    bits.update(range(1, 101))
    ordered = sorted(bits)
    result = subprocess.run([sys.argv[1]], input=''.join(f'{b:016x}\n' for b in ordered),
                            text=True, capture_output=True, check=True)
    lines = result.stdout.splitlines()
    if len(lines) != len(ordered):
        raise AssertionError('Unexpected number of conversion outputs')
    for b, line in zip(ordered, lines):
        printed, d, e, sign = line.split()
        assert int(printed, 16) == b and int(sign) == 0
        expected = oracle(b)
        if (int(d), int(e)) != expected:
            raise AssertionError(f'{b:016x}: got {d}e{e}, expected {expected}')
    print(f'PASS exact-rational shortest/closest/ties-to-even oracle: {len(ordered)} positive finite inputs')

if __name__ == '__main__':
    main()

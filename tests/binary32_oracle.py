#!/usr/bin/env python3
"""Independent binary32 shortest/closest/even oracle using exact rationals.

The oracle builds interval endpoints from the neighboring representable values,
then searches 1..9 decimal significant digits. It uses no binary64 conversion,
floating formatter, cached-power implementation, or kernel rounding formula.
Corpus decimal centers are also rounded directly with integer arithmetic.
"""
from __future__ import annotations

import argparse
import hashlib
import random
import subprocess
from fractions import Fraction

SIGN = 0x80000000
FRACTION = 0x007FFFFF
INFINITY = 0x7F800000
P10 = [10**n for n in range(100)]


def dyadic(coefficient: int, exponent: int) -> Fraction:
    return (Fraction(coefficient << exponent, 1) if exponent >= 0
            else Fraction(coefficient, 1 << -exponent))


def decode(magnitude: int) -> Fraction:
    """Decode a nonnegative finite binary32 encoding exactly."""
    if not 0 <= magnitude < INFINITY:
        raise ValueError("decode expects a finite nonnegative binary32 encoding")
    raw, coefficient = magnitude >> 23, magnitude & FRACTION
    if raw:
        coefficient |= 1 << 23
    return dyadic(coefficient, max(raw, 1) - 150)


def decimal(coefficient: int, exponent: int) -> Fraction:
    return (Fraction(coefficient * P10[exponent], 1) if exponent >= 0
            else Fraction(coefficient, P10[-exponent]))


def nearest_even(numerator: int, denominator: int) -> int:
    quotient, remainder = divmod(numerator, denominator)
    return quotient + (2 * remainder > denominator or
                       (2 * remainder == denominator and quotient & 1))


def round_to_binary32(value: Fraction) -> int:
    """Round a rational directly to binary32; used for corpus and round trips."""
    sign = SIGN if value < 0 else 0
    value = abs(value)
    if not value:
        return sign
    numerator, denominator = value.numerator, value.denominator
    binary_order = numerator.bit_length() - denominator.bit_length()
    if value < dyadic(1, binary_order):
        binary_order -= 1
    exponent = max(binary_order - 23, -149)
    scaled = value / dyadic(1, exponent)
    coefficient = nearest_even(scaled.numerator, scaled.denominator)
    if coefficient < 1 << 23:
        return sign | coefficient
    if coefficient == 1 << 24:
        coefficient >>= 1
        exponent += 1
    raw = exponent + 150
    if raw >= 255:
        return sign | INFINITY
    return sign | (raw << 23) | (coefficient - (1 << 23))


def canonical(coefficient: int, exponent: int) -> tuple[int, int]:
    while coefficient and coefficient % 10 == 0:
        coefficient //= 10
        exponent += 1
    return coefficient, exponent


def oracle_info(magnitude: int) -> tuple[int, int, bool]:
    """Return coefficient, exponent, and whether closest selection is tied."""
    if not 0 < magnitude < INFINITY:
        raise ValueError("oracle expects finite nonzero positive encodings")
    value = decode(magnitude)
    previous = decode(magnitude - 1)
    # The notional value after max finite is 2^128; the overflow midpoint is
    # excluded because max finite has an odd binary significand.
    following = decode(magnitude + 1) if magnitude + 1 < INFINITY else dyadic(1, 128)
    lower = (previous + value) / 2
    upper = (value + following) / 2
    closed = magnitude & 1 == 0
    order = len(str(value.numerator)) - len(str(value.denominator))
    if value < decimal(1, order):
        order -= 1
    for digits in range(1, 10):
        candidates: list[tuple[Fraction, int, int, int]] = []
        # Include adjacent decades because the interval can cross a power of ten.
        for exponent in range(order - digits, order - digits + 3):
            unit = decimal(1, exponent)
            left, right, center = lower / unit, upper / unit, value / unit
            lo = (-(-left.numerator // left.denominator) if closed
                  else left.numerator // left.denominator + 1)
            hi = (right.numerator // right.denominator if closed
                  else (right.numerator - 1) // right.denominator)
            lo, hi = max(lo, P10[digits - 1]), min(hi, P10[digits] - 1)
            if lo > hi:
                continue
            floor = center.numerator // center.denominator
            for coefficient in {min(hi, max(lo, floor)), min(hi, max(lo, floor + 1))}:
                distance = abs(decimal(coefficient, exponent) - value)
                candidates.append((distance, coefficient & 1, coefficient, exponent))
        if candidates:
            best_distance, _, coefficient, exponent = min(candidates)
            closest_values = {decimal(d, e) for distance, _, d, e in candidates
                              if distance == best_distance}
            coefficient, exponent = canonical(coefficient, exponent)
            if round_to_binary32(decimal(coefficient, exponent)) != magnitude:
                raise AssertionError("Oracle round-trip self-check failed")
            return coefficient, exponent, len(closest_values) > 1
    raise AssertionError("No at-most-nine-digit candidate")


def oracle(bits: int) -> tuple[int, int, int]:
    magnitude, sign = bits & ~SIGN, bits >> 31
    if magnitude >= INFINITY:
        return magnitude & FRACTION, 10000, sign
    if magnitude == 0:
        return 0, 0, sign
    coefficient, exponent, _ = oracle_info(magnitude)
    return coefficient, exponent, sign


def corpus(random_count: int, subnormals: int, seed: int) -> list[int]:
    rng = random.Random(seed)
    magnitudes = {0, INFINITY, INFINITY + 1, INFINITY + 2, 0x7FBFFFFF,
                  0x7FC00000, 0x7FC00001, 0x7FFFFFFE, 0x7FFFFFFF}

    def around(center: int, radius: int = 4) -> None:
        magnitudes.update(range(max(0, center - radius), min(SIGN, center + radius + 1)))

    for raw in range(256):
        around(raw << 23)
    around(1 << 23, 256)
    around(INFINITY - 1, 256)
    for bit in range(23):
        around(1 << bit, 8)
    magnitudes.update(range(1, subnormals + 1))
    for exponent in range(-45, 39):
        around(round_to_binary32(decimal(1, exponent)), 8)
    for _ in range(random_count // 4):
        coefficient, exponent = rng.randrange(1, 10**9), rng.randrange(-53, 39)
        around(round_to_binary32(decimal(coefficient, exponent)), 1)
    # Constructed decimal midpoint ties, including upward and downward even choices.
    for bits in (0x49800002, 0x49800006, 0x48800004, 0x4880000C):
        _, _, tied = oracle_info(bits)
        if not tied:
            raise AssertionError(f"Expected decimal midpoint tie at {bits:08x}")
        around(bits, 16)
    for raw in range(142, 152):
        for fraction in range(128):
            magnitudes.add((raw << 23) | fraction)
    magnitudes.add(0x3DCCCCCD)  # 0.1f must not be widened to binary64.
    bits = magnitudes | {magnitude | SIGN for magnitude in magnitudes}
    bits.update(rng.getrandbits(32) for _ in range(random_count))
    return sorted(bits)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("executable", help="Path to binary32-cli")
    parser.add_argument("--random", type=int, default=12000)
    parser.add_argument("--subnormals", type=int, default=1024)
    parser.add_argument("--seed", type=lambda text: int(text, 0), default=0x504F575245434950)
    options = parser.parse_args()
    if options.random < 0 or not 0 <= options.subnormals <= FRACTION:
        parser.error("Counts must be nonnegative, and subnormals cannot exceed 8388607")
    ordered = corpus(options.random, options.subnormals, options.seed)
    encoded = "".join(f"{bits:08x}\n" for bits in ordered)
    result = subprocess.run([options.executable], input=encoded, text=True,
                            capture_output=True, check=True)
    lines = result.stdout.splitlines()
    if len(lines) != len(ordered):
        raise AssertionError(f"Expected {len(ordered)} outputs; received {len(lines)}")
    finite = ties = negative = nonfinite = zeros = 0
    cached: dict[int, tuple[int, int, bool]] = {}
    for bits, line in zip(ordered, lines):
        printed, coefficient, exponent, sign = line.split()
        if int(printed, 16) != bits:
            raise AssertionError("CLI reordered or changed input bits")
        magnitude = bits & ~SIGN
        if 0 < magnitude < INFINITY:
            if magnitude not in cached:
                cached[magnitude] = oracle_info(magnitude)
            d, e, tied = cached[magnitude]
            expected = d, e, bits >> 31
            finite += 1
            ties += tied
        else:
            expected = oracle(bits)
            zeros += magnitude == 0
            nonfinite += magnitude >= INFINITY
        negative += bits >> 31
        actual = int(coefficient), int(exponent), int(sign)
        if actual != expected:
            raise AssertionError(f"{bits:08x}: got {actual}, expected {expected}")
    print("PASS binary32 exact-rational shortest/closest/ties-to-even oracle: "
          f"inputs={len(ordered)} finite={finite} decimal_ties={ties} "
          f"nonfinite={nonfinite} signed_zeros={zeros} negative={negative} "
          f"random_requested={options.random} seed=0x{options.seed:x} "
          f"input_sha256={hashlib.sha256(encoded.encode()).hexdigest()}")


if __name__ == "__main__":
    main()

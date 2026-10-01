#!/usr/bin/env python3
"""Exact-integer certificate for the canonical power-of-two shortcut.

Checks high-only decisions at every normal binary exponent against
independently derived powers; it does not invoke a compiler or regenerate tables.
"""
from collections import Counter
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MASK = (1 << 64) - 1


def exact_power(p):
    num, den = (10**p, 1) if p >= 0 else (1, 10**-p)
    e = num.bit_length() - den.bit_length()
    if e >= 0:
        if num < den << e:
            e -= 1
    elif num << -e < den:
        e -= 1
    shift = 127 - e
    value = (num << shift) // den if shift >= 0 else num // (den << -shift)
    return value >> 64, value & MASK


def decisions(f, h):
    up = h > MASK - f
    if up or (h >> 1) > f:
        return "coarse", int(up)
    return "fine", max((10*f + (1 << 63) - 1) >> 64,
                       (10*(f - (h >> 1)) + MASK) >> 64)


def main():
    if not __debug__:
        raise RuntimeError("Exact certification requires assertions; run without Python -O")
    tables = (ROOT / "include/boundragon/detail/decimal_tables.h").read_text(encoding="utf-8")
    body = tables.split("high_powers[] = {", 1)[1].split("};", 1)[0]
    highs = [int(word, 16) for word in re.findall(r"0x([0-9a-fA-F]+)ULL", body)]
    assert len(highs) == 618
    for p in range(-293, 325):
        assert highs[p + 293] == exact_power(p)[0], p
    source = (ROOT / "include/boundragon/detail/canonical_decimal.h").read_text(encoding="utf-8")
    constants = re.search(r"power = \{0x([0-9a-fA-F]+)ULL, 0x([0-9a-fA-F]+)ULL\}", source)
    assert tuple(int(word, 16) for word in constants.groups()) == exact_power(323)

    counts = Counter()
    for raw in range(1, 2047):
        q = raw - 1075
        k = (q * 315653 - 131072) >> 20
        shift = q + ((-(k + 1) * 217707) >> 16) + 10
        combined = 52 + shift
        assert 59 <= combined <= 62
        hi, lo = exact_power(-k - 1)
        lower = (hi << (combined - 9)) & MASK
        actual = lower | (lo >> (73 - combined))
        h = hi >> (10 - shift)
        expected = decisions(actual, h)
        if expected[0] == "fine":
            assert 1 <= expected[1] <= 9, (raw, expected)
        regular_k = (q * 315653) >> 20
        regular_shift = q + ((-(regular_k + 1) * 217707) >> 16) + 10
        assert 6 <= regular_shift <= 9, raw
        # The public integer shortcut handles every regular q=0 input.
        # Otherwise, rejected coarse points constrain f enough that the fine
        # digit is 1..9, even for the smaller parity-dependent interval width.
        if q != 0:
            regular_hi = exact_power(-regular_k - 1)[0]
            regular_h = regular_hi >> (10 - regular_shift)
            bias = (1 << 63) + 6
            assert (10 * regular_h + bias) >> 64 >= 1, raw
            assert (10 * (MASK - regular_h) + bias) >> 64 <= 9, raw
        result = decisions(lower, h)
        assert result == expected, (raw, result, expected)
        if result[0] == "fine":
            assert 1 <= result[1] <= 9, (raw, result)
        assert ((hi >> (73 - combined)) + 1) * 10 < 10**17
        counts["high-only " + result[0]] += 1
    print("PASS: 618 high powers and subnormal 10^323 constants match exact integers")
    print("PASS: all 2046 normal powers have identical high-only and exact decisions; fine digits in 1..9")
    print("PASS: regular fine digits are 1..9 outside q=0 integer dispatch")
    print(dict(counts))


if __name__ == "__main__":
    main()

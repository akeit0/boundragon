// SPDX-License-Identifier: Unlicense AND MIT
// Experimental integrated binary64 writer kernel. Rounding follows Boundragon's
// centered filter and inherited zmij exact finishing; see licenses/zmij-MIT.txt.
#pragma once
#include <boundragon/boundragon.h>
#include "writer_decimal.h"

namespace boundragon_bench {
inline constexpr uint64_t writer_powers[] = {
    1,10,100,1000,10000,100000,1000000,10000000,100000000,
    1000000000,10000000000,100000000000,1000000000000,
    10000000000000,100000000000000,1000000000000000,
    10000000000000000,100000000000000000
};

BOUNDRAGON_FORCEINLINE unsigned writer_digits(uint64_t value) {
    unsigned estimate = ((64 - std::countl_zero(value)) * 1233) >> 12;
    return estimate + (value >= writer_powers[estimate]);
}

// Integers and very small subnormals require a width calculation. Ordinary
// conversion produces the writer representation directly from rounding state.
BOUNDRAGON_FORCEINLINE WriterDecimal prepare_short(uint64_t sig, int exp, bool sign) {
    assert(sig != 0 && sig < UINT64_C(100000000000000000));
    unsigned digits = writer_digits(sig);
    if (digits <= 16) {
        unsigned zeros = 16 - digits;
        return {sig * writer_powers[zeros], exp - int(zeros) - 1, 0, sign};
    }
    return {sig / 10, exp, unsigned(sig % 10), sign};
}

BOUNDRAGON_FORCEINLINE WriterDecimal prepare_rounded(uint64_t integral, int tail,
                                                 int exp, bool sign, bool normal) {
    bool borrow = tail < 0, carry = tail >= 10;
    integral = integral - unsigned(borrow) + unsigned(carry);
    unsigned last = unsigned(tail + 10 * int(borrow) - 10 * int(carry));
    assert(last <= 9);
    if (integral >= UINT64_C(1000000000000000))
        return {integral, exp, last, sign};
    uint64_t coefficient = integral * 10 + last;
    if (normal) {
        assert(coefficient >= UINT64_C(1000000000000000));
        return {coefficient, exp - 1, 0, sign};
    }
    return prepare_short(coefficient, exp, sign);
}

BOUNDRAGON_NOINLINE inline WriterDecimal writer_power(unsigned raw, bool sign) {
    using namespace boundragon::detail;
    int q = int(raw) - 1075, k = dec_exp(q, false);
    unsigned shift = exp_shift(q, k + 1) + 9, combined = 52 + shift;
    uint64_t hi = high_powers[-k - 1 - pow_min];
    uint64_t integral = hi >> (73 - combined), f = hi << (combined - 9);
    uint64_t h = hi >> (10 - shift), half_h = h >> 1;
    bool up = h > UINT64_MAX - f;
    if (up || half_h > f) return prepare_rounded(integral + up, 0, k, sign, true);
    unsigned digit = unsigned((u128(f) * 10 + (uint64_t(1) << 63) - 1) >> 64);
    unsigned lower = unsigned((u128(f - half_h) * 10 + UINT64_MAX) >> 64);
    if (digit < lower) digit = lower;
    return prepare_rounded(integral, int(digit), k, sign, true);
}

BOUNDRAGON_NOINLINE inline WriterDecimal writer_exact(uint64_t bits) {
    using namespace boundragon::detail;
    uint64_t m = bits & ((uint64_t(1) << 52) - 1);
    unsigned raw = unsigned(bits >> 52) & 2047;
    bool sign = bool(bits >> 63), normal = raw != 0;
    int k;
    unsigned shift;
    Words power;
    if (!normal) {
        k = -324; shift = 8;
        power = {0xfcf62c1dee382c42ULL, 0x46729e03dd9ed7b5ULL};
    } else {
        m |= uint64_t(1) << 52;
        int q = int(raw) - 1075;
        k = dec_exp(q); shift = exp_shift(q, k + 1) + 9;
        power = compact_power(-k - 1);
    }
    u128 product = scaled_product(power, m << shift);
    uint64_t integral = uint64_t(product >> 73), f = uint64_t(product >> 9);
    uint64_t h = (power.hi >> (10 - shift)) + 1 - (m & 1);
    bool up = f + h < f, down = h > f;
    if (up || down) return prepare_rounded(integral + up, 0, k, sign, normal);
    unsigned digit = unsigned((u128(f) * 10 + (uint64_t(1) << 63) + 6) >> 64);
    if (f == (uint64_t(1) << 62)) digit = 2;
    return prepare_rounded(integral, int(digit), k, sign, normal);
}

template<boundragon::Cache cache=boundragon::Cache::Balanced>
BOUNDRAGON_FORCEINLINE WriterDecimal convert_for_writer(uint64_t bits) {
    using namespace boundragon::detail;
    static_assert(cache == boundragon::Cache::Balanced || cache == boundragon::Cache::Fast);
    uint64_t m = bits & ((uint64_t(1) << 52) - 1);
    unsigned raw = unsigned(bits >> 52) & 2047;
    bool sign = bool(bits >> 63);
    if (unsigned(raw - 1) >= 2046) [[unlikely]] {
        if (raw == 2047) return {m, 10000, 0, sign};
        if (m == 0) return {0, 0, 0, sign};
        return writer_exact(bits);
    }
    unsigned integer_shift = 1075 - raw;
    if (integer_shift <= 52 && (m & ((uint64_t(1) << integer_shift) - 1)) == 0)
        return prepare_short((m | (uint64_t(1) << 52)) >> integer_shift, 0, sign);
    if (m == 0) [[unlikely]] return writer_power(raw, sign);
    int q = int(raw) - 1075, k = dec_exp(q);
    unsigned fs = cache == boundragon::Cache::Balanced ? exp_shift(q, k + 1) + 11 : exp_shifts[raw] + 2;
    uint64_t hi = high_powers[-k - 1 - pow_min];
    m |= uint64_t(1) << 52;
    uint64_t centered = uint64_t((u128(m << fs) * hi) >> 64) + 1025;
    int residual = int(centered & 2047) - 1024;
    unsigned h = unsigned(hi >> (65 - fs));
    int coarse_mask;
    int difference = centered_difference<false>(residual, h, coarse_mask);
    int rounded = 5 * residual + 512;
    unsigned guard = (unsigned(rounded + 5) & 1023) | unsigned(coarse_mask);
    if ((unsigned(difference) < 2) | (guard <= 10)) [[unlikely]] return writer_exact(bits);
    int tail = (rounded >> 10) & ~coarse_mask;
    return prepare_rounded(centered >> 11, tail, k, sign, true);
}
}

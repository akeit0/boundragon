// SPDX-License-Identifier: Unlicense AND MIT
// Canonical shortest-decimal shortcuts for integers and specialized fallback.
// Exact rounding logic inherits zmij; see decimal_core.h and NOTICE.md.
#pragma once
#include "decimal_core.h"

namespace boundragon::detail {

// Multiplication by the inverse of 5^digits followed by a rotation tests
// divisibility by 10^digits. A successful candidate is the exact quotient.
// The comparison also rejects wrapped products; see docs/proof.md, Section 10.
BOUNDRAGON_FORCEINLINE unsigned remove_decimal_group(uint64_t& sig, unsigned digits,
                                         uint64_t inverse, uint64_t bound) {
    uint64_t candidate = std::rotr(sig * inverse, int(digits));
    bool divisible = candidate <= bound;
    sig = divisible ? candidate : sig;
    return unsigned(divisible);
}

template<bool full_width>
BOUNDRAGON_FORCEINLINE Decimal normalize_finite_impl(uint64_t sig, int exp, bool sign) {
    assert(sig != 0);
    assert(full_width || sig < UINT64_C(100000000000000000));
    // Most random coefficients have no decimal zero. Keep that exit cheap.
    uint64_t first = std::rotr(sig * UINT64_C(14757395258967641293), 1);
    if (first > UINT64_C(1844674407370955161)) return {sig, exp, sign};
    sig = first;
    // Fixed groups avoid a data-dependent loop for mixed decimal precisions.
    // Including 16 handles every nonzero uint64_t, up to 19 trailing zeroes.
    // For coefficients below 10^17, at most 15 remain after the first division.
    unsigned removed = 0;
    if constexpr (full_width)
        removed = remove_decimal_group(sig, 16,
            UINT64_C(16475523416025833537), UINT64_C(1844));
    removed = (removed << 1) | remove_decimal_group(sig, 8,
        UINT64_C(14368461155438497313), UINT64_C(184467440737));
    removed = (removed << 1) | remove_decimal_group(sig, 4,
        UINT64_C(15170602326218735249), UINT64_C(1844674407370955));
    removed = (removed << 1) | remove_decimal_group(sig, 2,
        UINT64_C(10330176681277348905), UINT64_C(184467440737095516));
    removed = (removed << 1) | remove_decimal_group(sig, 1,
        UINT64_C(14757395258967641293), UINT64_C(1844674407370955161));
    return {sig, exp + 1 + int(removed), sign};
}

// General helper: every nonzero uint64_t is supported.
BOUNDRAGON_FORCEINLINE Decimal normalize_finite(uint64_t sig, int exp, bool sign) {
    return normalize_finite_impl<true>(sig, exp, sign);
}

// Conversion-only helper: 1 <= sig < 10^17. Canonical coarse callsites are
// bounded by 2^55; raw two-grid coefficients are below 10*2^53+10 < 10^17.
// See docs/proof.md, Section 9, and proof/certify_fallback.py.
BOUNDRAGON_FORCEINLINE Decimal normalize_finite_short(uint64_t sig, int exp, bool sign) {
    return normalize_finite_impl<false>(sig, exp, sign);
}

// For all 2,046 normal powers of two, the high cache limb alone selects
// the same coarse/fine decision and digit as the full normalized power.
// This is a finite cache property, certified by proof/canonical_bounds.py.
BOUNDRAGON_NOINLINE inline Decimal canonical_power_of_two(unsigned raw, bool sign) {
    assert(unsigned(raw - 1) < 2046);
    int q = int(raw) - 1075, k = dec_exp(q, false);
    unsigned shift = exp_shift(q, k + 1) + 9;
    int p = -k - 1;
    uint64_t hi = high_powers[p - pow_min];
    unsigned combined = 52 + shift;
    assert(combined >= 59 && combined <= 62);
    uint64_t integral = hi >> (73 - combined);
    uint64_t f = hi << (combined - 9);
    uint64_t h = hi >> (10 - shift), half_h = h >> 1;
    bool up = h > UINT64_MAX - f;
    if (up || half_h > f)
        return normalize_finite_short(integral + up, k + 1, sign);
    unsigned digit = unsigned((u128(f) * 10 + (uint64_t(1) << 63) - 1) >> 64);
    unsigned lower_digit = unsigned((u128(f - half_h) * 10 + UINT64_MAX) >> 64);
    if (digit < lower_digit) digit = lower_digit;
    assert(digit >= 1 && digit <= 9);
    return {integral * 10 + digit, k, sign};
}

// Outline fallback together with normalization; the finite-normal caller
// dispatches exact integers and powers of two first. The raw fallback is unchanged.
BOUNDRAGON_NOINLINE inline Decimal canonical_slow(uint64_t bits) {
    uint64_t m = bits & ((uint64_t(1) << 52) - 1);
    unsigned raw = unsigned(bits >> 52) & 2047;
    bool sign = bool(bits >> 63);
    int k;
    unsigned shift;
    Words power;
    if (raw == 0 || raw == 2047) {
        if (raw == 2047) return {m, 10000, sign};
        if (m == 0) return {0, 0, sign};
        // q=-1074 always gives k=-324, shift=8 and the exact 10^323 cache.
        k = -324;
        shift = 8;
        power = {0xfcf62c1dee382c42ULL, 0x46729e03dd9ed7b5ULL};
    } else {
        assert(m != 0);
        m |= uint64_t(1) << 52;
        int q = int(raw) - 1075;
        k = dec_exp(q);
        shift = exp_shift(q, k + 1) + 9;
        power = compact_power(-k - 1);
    }
    u128 product = scaled_product(power, m << shift);
    uint64_t integral = uint64_t(product >> 73), f = uint64_t(product >> 9);
    uint64_t h = (power.hi >> (10 - shift)) + 1 - (m & 1);
    bool up = f + h < f, down = h > f;
    if (up || down) return normalize_finite_short(integral + up, k + 1, sign);
    unsigned digit = unsigned((u128(f) * 10 + (uint64_t(1) << 63) + 6) >> 64);
    if (f == (uint64_t(1) << 62)) digit = 2;
    if (digit != 0) return {integral * 10 + digit, k, sign};
    return normalize_finite_short(integral, k + 1, sign);
}

} // namespace boundragon::detail

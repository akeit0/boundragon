// SPDX-License-Identifier: Unlicense AND MIT
// Native binary32 interval conversion: Q40 Fast and compact high32 filters.
// The exact finish formulas adapt the inherited Zmij fallback to 32-bit limbs;
// see decimal_core.h, NOTICE.md and docs/binary32_implementation.md.
#pragma once
#include "decimal_types.h"

namespace boundragon::detail {
#include "binary32_cache.h"
#include "binary32_fast_cache.h"

BOUNDRAGON_FORCEINLINE int binary32_dec_exp(int q, bool regular = true) {
    return (q * 315653 - (!regular * 131072)) >> 20;
}

BOUNDRAGON_FORCEINLINE int binary32_power_exp(int p) {
    return (p * 217707) >> 16;
}

// floor(cache * n / 2^32), with a 64-bit cache and a 32-bit multiplier.
// The sum fits in 64 bits, even if both inputs have all their bits set.
BOUNDRAGON_FORCEINLINE uint64_t binary32_scaled_product(uint64_t cache, uint32_t n) {
    uint64_t low = uint64_t(uint32_t(cache)) * n;
    return uint64_t(uint32_t(cache >> 32)) * n + (low >> 32);
}

BOUNDRAGON_FORCEINLINE Decimal binary32_normalize_coarse(uint32_t sig, int exp, bool sign);

template<bool canonical = false>
BOUNDRAGON_FORCEINLINE Decimal binary32_exact_components(uint32_t bits) {
    uint32_t m = bits & UINT32_C(0x7fffff);
    unsigned raw = (bits >> 23) & 255;
    bool sign = bool(bits >> 31);
    // Minimum normal shares the subnormal spacing on both sides.
    bool regular = m != 0 || raw <= 1;
    if (raw == 0 || raw == 255) [[unlikely]] {
        if (raw == 255) return {m, 10000, sign};
        if (m == 0) return {0, 0, sign};
        raw = 1;
    } else {
        m |= UINT32_C(1) << 23;
    }
    int q = int(raw) - 150;
    int k = binary32_dec_exp(q, regular);
    int p = -k - 1;
    assert(p >= binary32_pow_min && p <= binary32_pow_max);
    unsigned shift = unsigned(q + binary32_power_exp(p) + 8);
    assert(shift >= 4 && shift <= 8);
    uint64_t cache = binary32_powers[p - binary32_pow_min];
    uint32_t high = uint32_t(cache >> 32);
    uint64_t product = binary32_scaled_product(cache, m << shift);
    uint64_t integral = product >> 39;
    uint32_t f = uint32_t(product >> 7);
    uint32_t h = high >> (8 - shift);
    unsigned digit;
    bool up, down;
    if (regular) {
        h += 1 - (m & 1);
        up = uint32_t(f + h) < f;
        down = h > f;
        digit = unsigned((uint64_t(f) * 10 + (UINT64_C(1) << 31) + 6) >> 32);
        if (f == (UINT32_C(1) << 30)) [[unlikely]] digit = 2;
    } else {
        up = h > UINT32_MAX - f;
        down = (h >> 1) > f;
        digit = unsigned((uint64_t(f) * 10 + (UINT64_C(1) << 31) - 1) >> 32);
        unsigned lower_digit = unsigned((uint64_t(uint32_t(f - (h >> 1))) * 10 + UINT32_MAX) >> 32);
        if (digit < lower_digit) digit = lower_digit;
    }
    if constexpr (canonical) {
        if (up || down)
            return binary32_normalize_coarse(uint32_t(integral + up), k + 1, sign);
        // A rejected coarse grid leaves a nonzero final digit, certified for
        // every finite binary32 input by the exact fallback and exhaustive check.
        assert(digit >= 1 && digit <= 9);
        return {integral * 10 + digit, k, sign};
    }
    return {(integral + up) * 10 + ((up || down) ? 0 : digit), k, sign};
}

BOUNDRAGON_NOINLINE inline Decimal binary32_slow(uint32_t bits) {
    return binary32_exact_components(bits);
}

// Numeric components can retain decimal zeroes, matching the binary64 API.
// No binary64 conversion is involved: the input's 24-bit rounding interval
// determines whether the coarse or fine decimal grid supplies the answer.
template<bool instrument = false>
BOUNDRAGON_FORCEINLINE Decimal binary32_components(uint32_t bits, uint64_t* count = nullptr) {
    uint32_t m = bits & UINT32_C(0x7fffff);
    unsigned raw = (bits >> 23) & 255;
    if (unsigned(raw - 1) >= 254 || m == 0) [[unlikely]] {
        if constexpr (instrument) ++*count;
        return binary32_slow(bits);
    }
    int q = int(raw) - 150;
    int k = binary32_dec_exp(q);
    int p = -k - 1;
    unsigned fs = unsigned(q + binary32_power_exp(p) + 9);
    assert(fs >= 5 && fs <= 8);
    uint32_t high = uint32_t(binary32_powers[p - binary32_pow_min] >> 32);
    m |= UINT32_C(1) << 23;
    uint32_t u = uint32_t((uint64_t(m << fs) * high) >> 32);
    uint32_t centered = u + 129;
    int residual = int(centered & 255) - 128;
    unsigned h = high >> (33 - fs);
    int difference = (residual < 0 ? -residual : residual) - int(h);
    int coarse_mask = difference >> 31;
    int rounded = 5 * residual + 64;
    unsigned rounding_guard = (unsigned(rounded + 5) & 127) | unsigned(coarse_mask);
    if ((unsigned(difference) < 2) | (rounding_guard <= 10)) [[unlikely]] {
        if constexpr (instrument) ++*count;
        return binary32_slow(bits);
    }
    int tail = (rounded >> 7) & ~coarse_mask;
    return {uint64_t(centered >> 8) * 10 + uint64_t(int64_t(tail)), k, bool(bits >> 31)};
}

BOUNDRAGON_FORCEINLINE Decimal binary32_normalize(Decimal value) {
    if (value.sig == 0 || value.exp == 10000) return value;
    uint32_t sig = uint32_t(value.sig);
    while (sig % 10 == 0) { sig /= 10; ++value.exp; }
    value.sig = sig;
    return value;
}

BOUNDRAGON_FORCEINLINE unsigned binary32_remove_decimal_group(
        uint32_t& sig, unsigned digits, uint32_t inverse, uint32_t bound) {
    uint32_t candidate = std::rotr(sig * inverse, int(digits));
    bool divisible = candidate <= bound;
    sig = divisible ? candidate : sig;
    return unsigned(divisible);
}

// Conversion coefficients have at most nine digits, hence at most eight
// trailing zeroes. After the first division, fixed groups 4/2/1 suffice.
// The serial helper above remains useful for the short exact-integer path.
BOUNDRAGON_FORCEINLINE Decimal binary32_normalize_bounded(Decimal value) {
    if (value.sig == 0 || value.exp == 10000) return value;
    assert(value.sig < UINT64_C(1000000000));
    uint32_t sig = uint32_t(value.sig);
    uint32_t first = std::rotr(sig * UINT32_C(3435973837), 1);
    if (first > UINT32_C(429496729)) return value;
    sig = first;
    unsigned removed = binary32_remove_decimal_group(sig, 4,
        UINT32_C(989560465), UINT32_C(429496));
    removed = (removed << 1) | binary32_remove_decimal_group(sig, 2,
        UINT32_C(3264175145), UINT32_C(42949672));
    removed = (removed << 1) | binary32_remove_decimal_group(sig, 1,
        UINT32_C(3435973837), UINT32_C(429496729));
    return {sig, value.exp + 1 + int(removed), value.negative};
}

BOUNDRAGON_FORCEINLINE Decimal binary32_compact_to_decimal(uint32_t bits) {
    uint32_t fraction = bits & UINT32_C(0x7fffff);
    unsigned raw = (bits >> 23) & 255;
    unsigned integer_shift = 150 - raw;
    if (integer_shift <= 23 && (fraction & ((UINT32_C(1) << integer_shift) - 1)) == 0) {
        uint32_t sig = (fraction | (UINT32_C(1) << 23)) >> integer_shift;
        return binary32_normalize({sig, 0, bool(bits >> 31)});
    }
    return binary32_normalize_bounded(binary32_components(bits));
}

// The Q40 coarse coefficient is <10^8 and has at most seven zeroes.
// No first division is needed: the filter already selected the coarse grid.
BOUNDRAGON_FORCEINLINE Decimal binary32_normalize_coarse(uint32_t sig, int exp, bool sign) {
    assert(sig && sig < UINT32_C(100000000));
    unsigned removed = binary32_remove_decimal_group(sig, 4,
        UINT32_C(989560465), UINT32_C(429496));
    removed = (removed << 1) | binary32_remove_decimal_group(sig, 2,
        UINT32_C(3264175145), UINT32_C(42949672));
    removed = (removed << 1) | binary32_remove_decimal_group(sig, 1,
        UINT32_C(3435973837), UINT32_C(429496729));
    return {sig, exp + int(removed), sign};
}

BOUNDRAGON_NOINLINE inline Decimal binary32_canonical_slow(uint32_t bits) {
    return binary32_exact_components<true>(bits);
}

// W=floor(alpha*2^40). For a 24-bit m, m*W fits in uint64_t and the
// scaled center error is in [0,m). The radius lies in [W/2,W/2+1).
// Accept only decisions stable over those intervals; ties use exact fallback.
// See proof/certify_binary32_fast.py and docs/binary32_optimization.md.
template<bool integer_shortcut = false, bool instrument = false>
BOUNDRAGON_FORCEINLINE Decimal binary32_to_decimal(uint32_t bits, uint64_t* count = nullptr) {
    constexpr uint64_t Q = UINT64_C(1) << 40, mask = Q - 1;
    uint32_t m = bits & UINT32_C(0x7fffff);
    unsigned raw = (bits >> 23) & 255;
    bool sign = bool(bits >> 31);
    if constexpr (integer_shortcut) {
        unsigned shift = 150 - raw;
        if (shift <= 23 && (m & ((UINT32_C(1) << shift) - 1)) == 0)
            return binary32_normalize({(m | (UINT32_C(1) << 23)) >> shift, 0, sign});
    }
    if (raw == 255) [[unlikely]] return {m, 10000, sign};
    if (m == 0) [[unlikely]] {
        uint64_t t = binary32_fast_parameters[raw];
        return {binary32_power_significands[raw], int((t >> 48) & 255) - 45, sign};
    }
    if constexpr (!integer_shortcut) {
        // Large exact integers are common in integer pools, but rare in mixed
        // decimal traffic. Limit dispatch to the eight binades [2^16,2^24).
        if (unsigned(raw - 143) <= 7) {
            unsigned shift = 150 - raw;
            if ((m & ((UINT32_C(1) << shift) - 1)) == 0)
                return binary32_normalize({(m | (UINT32_C(1) << 23)) >> shift, 0, sign});
        }
    }
    if (raw) m |= UINT32_C(1) << 23;
    if (m < 11) [[unlikely]] {
        if constexpr (instrument) ++*count;
        return binary32_canonical_slow(bits);
    }
    uint64_t t = binary32_fast_parameters[raw], w = t & mask;
    int exp = int(t >> 56) - 45;
    uint64_t product = uint64_t(m) * w + Q / 2;
    uint32_t integral = uint32_t(product >> 40);
    int64_t r = int64_t(product & mask) - int64_t(Q / 2);
    uint64_t a = uint64_t(r < 0 ? -r : r);
    uint64_t h = w >> 1;
    if (a + m + 1 < h) return binary32_normalize_coarse(integral, exp, sign);
    if (a <= h + m + 1) [[unlikely]] {
        if constexpr (instrument) ++*count;
        return binary32_canonical_slow(bits);
    }
    int64_t rounded = r * 10 + int64_t(Q / 2);
    int tail = int(rounded >> 40);
    if (tail != int((rounded + int64_t(m) * 10) >> 40) || (uint64_t(rounded) & mask) == 0)
        [[unlikely]] {
        if constexpr (instrument) ++*count;
        return binary32_canonical_slow(bits);
    }
    assert(tail != 0);
    return {uint64_t(integral) * 10 + uint64_t(int64_t(tail)), exp - 1, sign};
}

} // namespace boundragon::detail

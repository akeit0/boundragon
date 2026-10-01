// SPDX-License-Identifier: Unlicense
// Centered decimal filter with an exact factor-of-two arithmetic simplification.
// No added tables.  Optional GNU x86-64 assembly only changes abs/subtract/mask;
// other targets use the algebraically identical C++ expression.
#pragma once
#include "canonical_decimal.h"

namespace boundragon::detail {

// d = abs(w)-h; mask is -1 exactly when abs(w)<h, otherwise 0.
// Preconditions at every call: -1024<=w<=1023 and 0<=h<=1023.
template<bool use_asm>
BOUNDRAGON_FORCEINLINE int centered_difference(int w, unsigned h, int& mask) {
#if defined(__x86_64__) && (defined(__GNUC__) || defined(__clang__))
    if constexpr (use_asm) {
        int difference = w;
        // AT&T/Intel dialect alternatives keep -masm=intel supported.
        // Early-clobber on difference is required: neg changes it before the
        // original w and h inputs are consumed.  mask is also early-clobber
        // for deliberately conservative, nonaliasing register allocation.
        asm ("neg{l %0| %0}\n\t"
             "cmovs{l %2, %0| %0, %2}\n\t"
             "sub{l %3, %0| %0, %3}\n\t"
             "sbb{l %1, %1| %1, %1}"
             : "+&r" (difference), "=&r" (mask)
             : "r" (w), "r" (h)
             : "cc");
        return difference;
    }
#endif
    int difference = (w < 0 ? -w : w) - int(h);
    mask = difference >> 31;
    return difference;
}

// `arithmetic=false` retains the 2,048-byte exponent shift table;
// `arithmetic=true` derives that shift and retains 5,536 numeric data bytes.
// `use_asm=true` opts into the flags-based abs/subtract/mask block on GNU x86-64.
template<bool arithmetic=false, bool use_asm=false, bool instrument=false,
         bool canonical_output=false>
BOUNDRAGON_FORCEINLINE Decimal centered_half_hot(uint64_t bits, uint64_t* count=nullptr) {
    uint64_t m = bits & ((1ULL << 52) - 1);
    unsigned raw = unsigned(bits >> 52) & 2047;
    if (unsigned(raw - 1) >= 2046 || (!canonical_output && m == 0)) [[unlikely]] {
        if constexpr (instrument) ++*count;
        if constexpr (canonical_output) return canonical_slow(bits);
        else return compact_slow(bits);
    }
    if constexpr (canonical_output) {
        // For 1 <= |x| < 2^53, an exact integer has no fractional bits.
        // Its decimal value is already exact; normalize only decimal zeros.
        unsigned integer_shift = 1075 - raw;
        if (integer_shift <= 52 && (m & ((uint64_t(1) << integer_shift) - 1)) == 0)
            return normalize_finite_short((m | (uint64_t(1) << 52)) >> integer_shift,
                                    0, bool(bits >> 63));
    }
    if constexpr (canonical_output) {
        if (m == 0) [[unlikely]] {
            if constexpr (instrument) ++*count;
            return canonical_power_of_two(raw, bool(bits >> 63));
        }
    }
    int q = int(raw) - 1075, k = dec_exp(q);
    unsigned fs = arithmetic ? exp_shift(q, k + 1) + 11
                             : exp_shifts[raw] + 2;
    uint64_t hi = high_powers[-k - 1 - pow_min];
    m |= 1ULL << 52;
    uint64_t u = uint64_t((u128(m << fs) * hi) >> 64);
    uint64_t centered = u + 1025;
    int residual = int(centered & 2047) - 1024;
    unsigned h = unsigned(hi >> (65 - fs));
    int coarse_mask;
    int difference = centered_difference<use_asm>(residual, h, coarse_mask);
    // (10*w+1024)>>11 = (5*w+512)>>10 for every integer w.  The
    // modulo guard similarly divides by two because its operand is even:
    // ((10*w+1034)&2047)<=20 <=> ((5*w+517)&1023)<=10.
    int rounded = 5 * residual + 512;
    unsigned rounding_guard = (unsigned(rounded + 5) & 1023)
                            | unsigned(coarse_mask);
    bool ambiguous = (unsigned(difference) < 2) | (rounding_guard <= 10);
    if (ambiguous) [[unlikely]] {
        if constexpr (instrument) ++*count;
        if constexpr (canonical_output) return canonical_slow(bits);
        else return compact_slow(bits);
    }
    int tail = (rounded >> 10) & ~coarse_mask;
    if constexpr (canonical_output) {
        // A nonzero tail in [-5,5] cannot introduce a decimal trailing zero.
        // A zero tail has a known factor of ten: omit its multiply/divide pair.
        if (tail == 0) return normalize_finite_short(centered >> 11, k + 1, bool(bits >> 63));
    }
    return {(centered >> 11) * 10 + uint64_t(int64_t(tail)),
            k, bool(bits >> 63)};
}

} // namespace boundragon::detail

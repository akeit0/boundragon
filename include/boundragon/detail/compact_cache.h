// SPDX-License-Identifier: Unlicense
// Tiny cached-power experiments.  See generate_compact_cache.py for the
// exact finite certificates and the derivation below for analytic error bounds.
#pragma once
#include "decimal_core.h"

namespace boundragon::detail {
#include "compact_cache_tables.h"

// With u <= Y < u+B and h <= R < h+1, the tightened nearest-grid guard rejects
// D-h in [-B+1,B].  Outside this shell, an accepted candidate lies strictly
// inside the binary parsing interval or every coarse-grid point lies outside.
// Exact decimal-half ties are handled by the original exact compact fallback.
template<unsigned A, unsigned B, bool instrument, bool centered=false>
BOUNDRAGON_FORCEINLINE Decimal tiny_nearest_finish(uint64_t bits, uint64_t scaled,
                                        unsigned h, int k, uint64_t* fallbacks) {
    constexpr unsigned unit = 1u << A, mask = unit - 1;
    if constexpr(centered) {
        static_assert(B%2==0);
        constexpr unsigned center=B/2;
        uint64_t shifted=scaled+unit/2+center;
        int w=int(shifted&mask)-int(unit/2);
        int distance=w<0?-w:w;
        int difference=distance-int(h);
        int coarse_mask=difference>>31;
        int rounded=5*w+int(unit/4);
        unsigned guard=(unsigned(rounded+5*int(center))&(unit/2-1))|unsigned(coarse_mask);
        bool ambiguous=(unsigned(difference+int(center)-1)<2*center)|(guard<=10*center);
        if(ambiguous) [[unlikely]] {
            if constexpr(instrument) ++*fallbacks;
            return compact_slow(bits);
        }
        int tail=(rounded>>(A-1))&~coarse_mask;
        return {(shifted>>A)*10+uint64_t(int64_t(tail)),k,bool(bits>>63)};
    }
    unsigned f = unsigned(scaled) & mask;
    unsigned nearest = (f + unit / 2) >> A;
    unsigned distance = nearest ? unit - f : f;
    bool coarse = distance < h;
    unsigned rounded = f * 10 + unit / 2;
    bool ambiguous = unsigned(distance - h + B - 1) <= 2 * B - 1;
    ambiguous |= !coarse & (((rounded & mask) >= unit - 10 * B)
                           | (unsigned(unit / 4 - f) < B));
    if (ambiguous) [[unlikely]] {
        if constexpr (instrument) ++*fallbacks;
        return compact_slow(bits);
    }
    unsigned tail = coarse ? nearest * 10 : rounded >> A;
    return {(scaled >> A) * 10 + tail, k, bool(bits >> 63)};
}

// Layout 28 reuses the 592-byte fallback cache. Layout 16 adds 40 high anchors
// (320 bytes), avoiding divmod28. Anchor phases are recovered arithmetically.
// Both reuse compact_minor, whose normalized small powers are exact for r<28.
template<unsigned stride, bool raw10 = false, bool instrument = false, bool centered=false>
BOUNDRAGON_FORCEINLINE Decimal tiny_cache_hot(uint64_t bits, uint64_t* fallbacks = nullptr) {
    static_assert(stride == 28 || stride == 16);
    uint64_t m = bits & ((1ULL << 52) - 1);
    unsigned raw = unsigned(bits >> 52) & 2047;
    if (unsigned(raw - 1) >= 2046 || m == 0) [[unlikely]] {
        if constexpr (instrument) ++*fallbacks;
        return compact_slow(bits);
    }
    int q = int(raw) - 1075, k = dec_exp(q);
    unsigned index, major_index, minor_index, anchor_phase;
    uint64_t anchor;
    if constexpr (stride == 28) {
        index = unsigned(-k - 1 - compact_base);
        major_index = index / 28;
        minor_index = index % 28;
        anchor = compact_major[major_index].hi + 1;
        anchor_phase = major_index + 1;
    } else {
        index = unsigned(-k - 1 - tiny16_base);
        major_index = index >> 4;
        minor_index = index & 15;
        anchor = tiny16_anchors[major_index];
        // Exact modulo four for all 40 anchors; generator checks every shift.
        anchor_phase = major_index + ((19 * major_index + 27) >> 7) + 2;
    }
    uint64_t minor = compact_minor[minor_index];
    unsigned minor_phase = unsigned(tiny_minor_phase_bits >> (2 * minor_index));
    u128 product = u128(anchor) * minor;
    uint64_t upper = uint64_t(product >> 64);
    unsigned normalize = 1 - unsigned(upper >> 63);
    unsigned phase = (unsigned(q) + anchor_phase + minor_phase + 1 - normalize) & 3;
    m |= 1ULL << 52;

    if constexpr (!raw10) {
        // The generator certifies 0 <= U-H <= 2 for each of 618 powers.
        // T is the exact normalized 64-bit real significand: H <= T < H+1.
        // L=U-2 obeys 0 <= T-L < 3.  Since n<2^64,
        // Y-floor(n*L/2^64) < 1 + 3*n/2^64 < 4.
        upper = (upper << normalize)
              | ((uint64_t(product) >> 63) & -uint64_t(normalize));
        unsigned fs = 8 + phase;
        uint64_t scaled = uint64_t((u128(m << fs) * (upper - 2)) >> 64);
        // This radius uses U, not U-2; equality with floor(R) is certified.
        unsigned h = unsigned(upper >> (65 - fs));
        return tiny_nearest_finish<11, 4, instrument, centered>(bits, scaled, h, k, fallbacks);
    } else {
        // Omit significand normalization and shift n one bit farther when
        // needed.  Reducing the grid to 10 fractional bits keeps fs<=11.
        // If V is the exact unnormalized real product, upper=floor(V+e),
        // 0<=e<1. Thus 0<V-(upper-1)<2 and the final floor error is <3.
        unsigned fs = 7 + phase + normalize;
        uint64_t scaled = uint64_t((u128(m << fs) * (upper - 1)) >> 64);
        unsigned h = unsigned((upper + 1) >> (65 - fs));
        return tiny_nearest_finish<10, 3, instrument>(bits, scaled, h, k, fallbacks);
    }
}

template<bool instrument = false>
BOUNDRAGON_FORCEINLINE Decimal tiny28_hot(uint64_t bits, uint64_t* fallbacks = nullptr) {
    return tiny_cache_hot<28, false, instrument>(bits, fallbacks);
}
template<bool instrument = false>
BOUNDRAGON_FORCEINLINE Decimal tiny16_hot(uint64_t bits, uint64_t* fallbacks = nullptr) {
    return tiny_cache_hot<16, false, instrument>(bits, fallbacks);
}
template<bool instrument = false>
BOUNDRAGON_FORCEINLINE Decimal tiny28_raw10_hot(uint64_t bits, uint64_t* fallbacks = nullptr) {
    return tiny_cache_hot<28, true, instrument>(bits, fallbacks);
}
template<bool instrument = false>
BOUNDRAGON_FORCEINLINE Decimal tiny16_raw10_hot(uint64_t bits, uint64_t* fallbacks = nullptr) {
    return tiny_cache_hot<16, true, instrument>(bits, fallbacks);
}

// Store one high limb for each pair of decimal powers.  An adjacent normalized
// power equals its predecessor times 5/4 or 5/8.  Discard the two or three low
// bits before multiplying by five: this is a shift and an LEA on x86-64, with
// no additional wide multiplication.  The generated exact certificate gives
// 0 <= H-Happrox <= 4; hence the one-multiply scaling error is strictly below6.
// Both variants retain 309*8+592 = 3,064 numeric bytes, including fallback.
template<bool arithmetic_phase, bool instrument = false, bool centered=false>
BOUNDRAGON_FORCEINLINE Decimal paired_cache_hot(uint64_t bits, uint64_t* fallbacks = nullptr) {
    uint64_t m = bits & ((1ULL << 52) - 1);
    unsigned raw = unsigned(bits >> 52) & 2047;
    if (unsigned(raw - 1) >= 2046 || m == 0) [[unlikely]] {
        if constexpr (instrument) ++*fallbacks;
        return compact_slow(bits);
    }
    int q = int(raw) - 1075, k = dec_exp(q);
    unsigned index = unsigned(-k - 1 - pow_min);
    unsigned odd = index & 1;
    uint64_t hi;
    unsigned fs;
    if constexpr (arithmetic_phase) {
        uint64_t anchor = paired_high_powers[index >> 1];
        // All 309 normalization choices, including the exact 10^-1 -> 10^0
        // boundary, are certified against this inclusive integer threshold.
        unsigned d = 2 + unsigned(anchor >= 0xccccccccccccccccULL);
        uint64_t next = (anchor >> d) * 5;
        if constexpr(centered) hi=anchor^((anchor^next)&(0-uint64_t(odd)));
        else hi = odd ? next : anchor;
        fs = exp_shift(q, k + 1) + 11;
    } else {
        uint64_t packed = paired_packed_powers[index >> 1];
        unsigned normalization = unsigned(packed >> 63);
        uint64_t restored = packed | (1ULL << 63);
        uint64_t next = (restored >> (2 + normalization)) * 5;
        if constexpr(centered) {
            uint64_t even=restored&~3ULL;
            hi=even^((even^next)&(0-uint64_t(odd)));
        } else hi = odd ? next : restored & ~3ULL;
        // E(next)-E(anchor) is 3 (phase -1) or4 (phase unchanged).
        fs = 8 + ((unsigned(q) + unsigned(packed) - (odd & (normalization ^ 1))) & 3);
    }
    m |= 1ULL << 52;
    uint64_t scaled = uint64_t((u128(m << fs) * hi) >> 64);
    // Adding four recovers the exact integer radius for every possible shift;
    // this is a finite generator certificate, not an assumed generic identity.
    unsigned h = unsigned((hi + 4) >> (65 - fs));
    return tiny_nearest_finish<11, 6, instrument, centered>(bits, scaled, h, k, fallbacks);
}

template<bool instrument = false>
BOUNDRAGON_FORCEINLINE Decimal paired_hot(uint64_t bits, uint64_t* fallbacks = nullptr) {
    return paired_cache_hot<false, instrument>(bits, fallbacks);
}
template<bool instrument = false>
BOUNDRAGON_FORCEINLINE Decimal paired_arith_hot(uint64_t bits, uint64_t* fallbacks = nullptr) {
    return paired_cache_hot<true, instrument>(bits, fallbacks);
}

template<bool instrument=false>
BOUNDRAGON_FORCEINLINE Decimal tiny28_centered_hot(uint64_t bits,uint64_t* count=nullptr) {
    return tiny_cache_hot<28,false,instrument,true>(bits,count);
}
template<bool instrument=false>
BOUNDRAGON_FORCEINLINE Decimal tiny16_centered_hot(uint64_t bits,uint64_t* count=nullptr) {
    return tiny_cache_hot<16,false,instrument,true>(bits,count);
}
template<bool instrument=false>
BOUNDRAGON_FORCEINLINE Decimal paired_centered_hot(uint64_t bits,uint64_t* count=nullptr) {
    return paired_cache_hot<false,instrument,true>(bits,count);
}
template<bool instrument=false>
BOUNDRAGON_FORCEINLINE Decimal paired_arith_centered_hot(uint64_t bits,uint64_t* count=nullptr) {
    return paired_cache_hot<true,instrument,true>(bits,count);
}
} // namespace boundragon::detail

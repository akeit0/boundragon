// SPDX-License-Identifier: Unlicense AND MIT
// Experimental binary64 shortest-decimal kernels, 2026-09-29.
// The exact fallback and finish logic are adapted from Żmij by
// Victor Zverovich (Copyright (c) 2025 - present), MIT or BSL-1.0.
// Sources and scope: see README.md. Not an upstream Żmij release.
#pragma once
#include "decimal_types.h"

namespace boundragon::detail {
using u128 = __uint128_t;
struct Words { uint64_t hi, lo; };
#include "decimal_tables.h"


BOUNDRAGON_FORCEINLINE int dec_exp(int q, bool regular = true) {
    return (q * 315653 - (!regular * 131072)) >> 20;
}
BOUNDRAGON_FORCEINLINE int exp_shift(int q, int k) {
    return q + ((-k * 217707) >> 16) + 1;
}
BOUNDRAGON_FORCEINLINE Words compact_power(int p) {
    unsigned index = unsigned(p - compact_base);
    uint64_t m = compact_minor[index % 28];
    Words a = compact_major[index / 28];
    u128 low = u128(a.lo) * m;
    u128 high = u128(a.hi) * m + uint64_t(low >> 64);
    unsigned shift = 1 - unsigned(high >> 127);
    high = (high << shift) | ((uint64_t(low) >> 63) & -uint64_t(shift));
    // Reconstruction is C or C+1, with the exact high limb. The finite
    // floor-sum certificate proves both give the same rounding decisions.
    return {uint64_t(high >> 64), uint64_t(high)};
}
BOUNDRAGON_FORCEINLINE u128 scaled_product(Words p, uint64_t n) {
    return u128(p.hi)*n + uint64_t((u128(p.lo)*n) >> 64);
}
BOUNDRAGON_FORCEINLINE Decimal finish_regular(u128 prod, uint64_t hi, uint64_t m,
                                   unsigned shift, int k, bool sign) {
    uint64_t integral = uint64_t(prod >> 73);
    uint64_t f = uint64_t(prod >> 9);
    uint64_t h = (hi >> (10-shift)) + 1 - (m&1);
    bool up = f+h < f;
    bool down = h>f;
    unsigned digit = unsigned((u128(f)*10 + (uint64_t(1)<<63) + 6) >> 64);
    if (f == (uint64_t(1)<<62)) [[unlikely]] digit=2;
    uint64_t last = -(uint64_t(!(up|down))) & digit;
    return {(integral+up)*10 + last, k, sign};
}
BOUNDRAGON_FORCEINLINE Decimal finish_irregular(u128 prod, uint64_t hi, unsigned shift,
                                     int k, bool sign) {
    uint64_t integral = uint64_t(prod >> 73);
    uint64_t f = uint64_t(prod >> 9);
    uint64_t h = hi >> (10-shift);
    bool up = h > UINT64_MAX-f;
    bool down = (h>>1)>f;
    int digit = int((u128(f)*10 + (uint64_t(1)<<63)-1) >> 64);
    int lo = int((u128(f-(h>>1))*10 + UINT64_MAX) >> 64);
    if (digit<lo) digit=lo;
    return {(integral+up)*10 + (uint64_t(-(int(!(up|down)))) & digit), k, sign};
}

BOUNDRAGON_FORCEINLINE Decimal exact_components(uint64_t bits) {
    uint64_t m = bits & ((uint64_t(1)<<52)-1);
    unsigned raw = unsigned(bits >> 52) & 2047;
    bool sign = bits >> 63;
    bool regular = m != 0;
    if (raw==0 || raw==2047) [[unlikely]] {
        if (raw==2047) return {m, 10000, sign};
        if (m==0) return {0, 0, sign};
        raw=1;
        regular=true;
    } else {
        m |= uint64_t(1)<<52;
    }
    int q=int(raw)-1075;
    int k=dec_exp(q, regular);
    unsigned shift=exp_shift(q,k+1)+9;
    int p=-k-1;
    assert(p>=pow_min && p<=pow_max);
    uint64_t n=m<<shift;
    Words power=compact_power(p);
    u128 prod=scaled_product(power,n);
    return regular ? finish_regular(prod,power.hi,m,shift,k,sign)
                   : finish_irregular(prod,power.hi,shift,k,sign);
}

// Outline slow work: only the input bits are live across the rare call.
BOUNDRAGON_NOINLINE inline Decimal compact_slow(uint64_t bits) {
    return exact_components(bits);
}
BOUNDRAGON_FORCEINLINE Decimal canonical(Decimal d) {
    if (d.sig==0 || d.exp==10000) return d;
    while(d.sig%10==0) { d.sig/=10; ++d.exp; }
    return d;
}
BOUNDRAGON_FORCEINLINE bool equal(Decimal a, Decimal b) {
    return a.sig==b.sig && a.exp==b.exp && a.negative==b.negative;
}
} // namespace boundragon::detail

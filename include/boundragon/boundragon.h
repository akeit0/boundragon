// SPDX-License-Identifier: Unlicense
// boundragon: experimental shortest binary32/binary64 decimal components.
// Correctness argument and certificate scope: docs/proof.md and proof/.
// Inherited exact fallback attribution: detail/decimal_core.h and NOTICE.md.
#pragma once
#include "float.h"
#include "detail/centered_filter.h"
#include "detail/compact_cache.h"

namespace boundragon {
using Decimal=boundragon::detail::Decimal;
enum class Cache { Fast, Balanced, Half, Tiny, Minimal };
namespace detail {
template<Cache cache>
inline constexpr bool valid_cache = cache == Cache::Fast || cache == Cache::Balanced ||
    cache == Cache::Half || cache == Cache::Tiny || cache == Cache::Minimal;
}
static_assert(sizeof(double)==8 && std::numeric_limits<double>::is_iec559 &&
              std::numeric_limits<double>::digits==53 &&
              std::numeric_limits<double>::max_exponent==1024);

// Numeric array bytes retained by a single selected kernel, including fallback.
// Excludes alignment, text, unwind information, and any caller's formatting data.
template<Cache cache=Cache::Balanced>
inline constexpr unsigned numeric_cache_bytes = [] {
    static_assert(detail::valid_cache<cache>, "Invalid boundragon cache policy");
    constexpr unsigned fallback = sizeof(detail::compact_major) + sizeof(detail::compact_minor);
    return fallback + (cache==Cache::Fast ? sizeof(detail::high_powers) + sizeof(detail::exp_shifts) :
        cache==Cache::Balanced ? sizeof(detail::high_powers) :
        cache==Cache::Half ? sizeof(detail::paired_high_powers) :
        cache==Cache::Tiny ? sizeof(detail::tiny16_anchors) : 0u);
}();

// Timed operation: sign plus an integer coefficient and decimal exponent.
// The coefficient may contain trailing zeroes. These are numerically equivalent
// components; use to_decimal below to obtain the canonical shortest coefficient.
// x86_asm affects only Fast/Balanced; other targets use the same C++ arithmetic.
template<Cache cache=Cache::Balanced,bool x86_asm=false>
BOUNDRAGON_FORCEINLINE Decimal components_raw(uint64_t bits) {
    static_assert(detail::valid_cache<cache>, "Invalid boundragon cache policy");
    if constexpr(cache==Cache::Fast)
        return boundragon::detail::centered_half_hot<false,x86_asm>(bits);
    else if constexpr(cache==Cache::Balanced)
        return boundragon::detail::centered_half_hot<true,x86_asm>(bits);
    else if constexpr(cache==Cache::Half)
        return boundragon::detail::paired_arith_centered_hot(bits);
    else if constexpr(cache==Cache::Tiny)
        return boundragon::detail::tiny16_centered_hot(bits);
    else
        return boundragon::detail::tiny28_centered_hot(bits);
}

// Finite result means (-1)^negative * sig * 10^exp. Zero retains its sign.
// Nonfinite sentinel: exp==10000; sig==0 is infinity; sig!=0 is NaN payload.
// Shortest is defined for round-to-nearest, ties-to-even parsing. This prototype
// does not write ASCII and does not change the floating-point environment.
// Fast/Balanced enable canonical shortcuts by default for mixed/common values.
// Set the third argument false for the smaller original canonical adapter; it
// can also be faster on random-only inputs. See docs/canonical_paths.md for tradeoffs.
template<Cache cache=Cache::Balanced,bool x86_asm=false,bool canonical_shortcuts=true>
BOUNDRAGON_FORCEINLINE Decimal to_decimal(double value) {
    static_assert(detail::valid_cache<cache>, "Invalid boundragon cache policy");
    uint64_t bits = std::bit_cast<uint64_t>(value);
    if constexpr (canonical_shortcuts && cache == Cache::Fast)
        return boundragon::detail::centered_half_hot<false,x86_asm,false,true>(bits);
    else if constexpr (canonical_shortcuts && cache == Cache::Balanced)
        return boundragon::detail::centered_half_hot<true,x86_asm,false,true>(bits);
    else if constexpr (canonical_shortcuts) {
        Decimal d = components_raw<cache,x86_asm>(bits);
        if (d.sig == 0 || d.exp == 10000) return d;
        return detail::normalize_finite_short(d.sig, d.exp, d.negative);
    } else
        return boundragon::detail::canonical(components_raw<cache,x86_asm>(bits));
}

// Permit explicitly selected binary64 policies in generic float/double callers
// without promoting float to double. These policy knobs affect binary64 only;
// binary32 uses its dedicated Fast policy and native kernel.
// Requiring an explicit Cache here keeps plain calls on float.h's overload.
template<Cache cache, bool x86_asm=false, bool canonical_shortcuts=true, class Float>
    requires std::is_same_v<Float, float>
BOUNDRAGON_FORCEINLINE Decimal to_decimal(Float value) {
    static_assert(detail::valid_cache<cache>, "Invalid boundragon cache policy");
    return detail::binary32_to_decimal(std::bit_cast<uint32_t>(value));
}
} // namespace boundragon

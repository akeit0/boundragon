// SPDX-License-Identifier: Unlicense
// Standalone shortest/closest/ties-to-even binary32 decimal components.
// Requires IEEE-754 float and C++20; the kernel uses at most uint64_t.
#pragma once
#include "detail/float_decimal.h"
#include <type_traits>

namespace boundragon {
using Decimal = detail::Decimal;
enum class FloatPolicy { Fast, Compact, Integers };
static_assert(sizeof(float) == 4 && std::numeric_limits<float>::is_iec559 &&
              std::numeric_limits<float>::digits == 24 &&
              std::numeric_limits<float>::max_exponent == 128);

// Numeric cache payload, excluding executable code and alignment.
template<FloatPolicy policy = FloatPolicy::Fast>
inline constexpr unsigned numeric_cache_bytes32_for = [] {
    static_assert(policy == FloatPolicy::Fast || policy == FloatPolicy::Compact || policy == FloatPolicy::Integers,
                  "Invalid boundragon float policy");
    return unsigned(sizeof(detail::binary32_powers) +
        (policy == FloatPolicy::Compact ? 0 : sizeof(detail::binary32_fast_parameters) + sizeof(detail::binary32_power_significands)));
}();
inline constexpr unsigned numeric_cache_bytes32 = numeric_cache_bytes32_for<>;

// Binary32 input bits, with the same nonfinite convention as binary64:
// exp == 10000, sig == 0 for infinity, sig != 0 for the NaN fraction payload.
// The finite coefficient may retain trailing decimal zeroes.
BOUNDRAGON_FORCEINLINE Decimal components_raw32(uint32_t bits) {
    return detail::binary32_components(bits);
}

// Canonical shortest result for round-to-nearest, ties-to-even binary32
// parsing, then closest decimal with ties to even. Signed zero is preserved.
// Exact-type deduction prevents this overload from changing integral calls
// to the pre-existing binary64 API. No floating-point arithmetic is performed.
// Fast limits integer dispatch to [2^16,2^24). Integers extends the shortcut
// to [1,2^24) for integer-heavy callers. Compact retains the 616-byte kernel.
template<FloatPolicy policy = FloatPolicy::Fast, class Float> requires std::is_same_v<Float, float>
BOUNDRAGON_FORCEINLINE Decimal to_decimal(Float value) {
    static_assert(policy == FloatPolicy::Fast || policy == FloatPolicy::Compact || policy == FloatPolicy::Integers,
                  "Invalid boundragon float policy");
    if constexpr (policy == FloatPolicy::Compact)
        return detail::binary32_compact_to_decimal(std::bit_cast<uint32_t>(value));
    else return detail::binary32_to_decimal<policy == FloatPolicy::Integers>(std::bit_cast<uint32_t>(value));
}

// Preserve explicit type calls supported by the original float overload.
// The non-deduced parameter keeps ordinary calls on the policy overload.
template<class Float> requires std::is_same_v<Float, float>
BOUNDRAGON_FORCEINLINE Decimal to_decimal(std::type_identity_t<Float> value) {
    return to_decimal<FloatPolicy::Fast>(value);
}
} // namespace boundragon

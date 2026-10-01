// SPDX-License-Identifier: Unlicense
// Public pinned zmij binary32 result, adapted to canonical components.
#pragma once
#include <boundragon/float.h>
#include "deps/zmij/zmij.h"

namespace boundragon::detail {
template<bool grouped, bool normalize_nonfinite = true>
BOUNDRAGON_FORCEINLINE Decimal zmij_float_components(uint32_t bits) {
    auto d = zmij::to_decimal(std::bit_cast<float>(bits));
    int exp = d.exp;
    if constexpr (normalize_nonfinite)
        if (exp == zmij::nonfinite_exp) exp = 10000;
    Decimal value{d.sig, exp, d.negative};
    // Timed corpora are finite. The public native-float coefficient has at
    // most nine digits; bounded groups are valid without binary64 trimming.
    if constexpr (grouped) return binary32_normalize_bounded(value);
    else return binary32_normalize(value);
}
} // namespace boundragon::detail

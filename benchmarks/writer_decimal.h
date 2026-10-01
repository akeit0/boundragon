// SPDX-License-Identifier: Unlicense
#pragma once
#include <cstdint>

namespace boundragon_bench {
// Writer representation: sixteen leading positions, one final digit, and the
// exponent of the complete seventeen-position coefficient. Zero and nonfinite
// tokens use the same sentinel convention as the numeric implementation.
struct WriterDecimal {
    uint64_t sig;
    int exp;
    unsigned last_digit;
    bool negative;
};
}

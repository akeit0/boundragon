// SPDX-License-Identifier: Unlicense
// Shared numeric result and compiler annotations for binary32 and binary64.
#pragma once
#include <bit>
#include <cassert>
#include <cstdint>
#include <limits>

#if defined(__GNUC__) || defined(__clang__)
#define BOUNDRAGON_FORCEINLINE inline __attribute__((always_inline))
#define BOUNDRAGON_NOINLINE __attribute__((noinline))
#elif defined(_MSC_VER)
#define BOUNDRAGON_FORCEINLINE __forceinline
#define BOUNDRAGON_NOINLINE __declspec(noinline)
#else
#define BOUNDRAGON_FORCEINLINE inline
#define BOUNDRAGON_NOINLINE
#endif

namespace boundragon::detail {
// Finite values represent (-1)^negative * sig * 10^exp.
// exp == 10000 denotes infinity (sig == 0) or a NaN payload (sig != 0).
struct Decimal { uint64_t sig; int exp; bool negative; };
} // namespace boundragon::detail

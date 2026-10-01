// SPDX-License-Identifier: Unlicense
// Compile this TU alone: the float-only include must not need __uint128_t or
// retain binary64 tables, even on a compiler that happens to support them.
#define __uint128_t BOUNDRAGON_FORBIDDEN_UINT128_TYPE
#include <boundragon/float.h>
#undef __uint128_t
#ifdef FORCEINLINE
#error generic FORCEINLINE macro leaked from the public float header
#endif
#ifdef NOINLINE
#error generic NOINLINE macro leaked from the public float header
#endif

int main() {
    auto value = boundragon::to_decimal(0.1f);
    auto nan = boundragon::components_raw32(UINT32_C(0xff800123));
    return !(value.sig == 1 && value.exp == -1 && !value.negative &&
             nan.sig == UINT32_C(0x123) && nan.exp == 10000 && nan.negative);
}

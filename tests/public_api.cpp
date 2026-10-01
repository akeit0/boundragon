// SPDX-License-Identifier: Unlicense
// Regression checks for overload resolution and embedding with caller macros.
#define FORCEINLINE 41
#define NOINLINE 43
#include <boundragon/boundragon.h>
#if FORCEINLINE != 41 || NOINLINE != 43
#error boundragon changed a caller-owned compiler annotation macro
#endif
#include <cstdio>

bool same(boundragon::Decimal a, boundragon::Decimal b) {
    return a.sig == b.sig && a.exp == b.exp && a.negative == b.negative;
}

int main() {
    using boundragon::Cache;
    using boundragon::to_decimal;
    const auto single = to_decimal(0.1f);
    const auto widened = to_decimal(static_cast<double>(0.1f));
    if (single.sig != 1 || single.exp != -1 || single.negative || same(single, widened)) return 1;
    if (!same(single, to_decimal<Cache::Fast>(0.1f)) ||
        !same(single, to_decimal<Cache::Minimal, true, false>(0.1f))) return 2;
    if (!same(to_decimal(1), to_decimal(1.0)) ||
        !same(to_decimal(1ULL), to_decimal(1.0)) ||
        !same(to_decimal(1.25L), to_decimal(1.25))) return 3;
    boundragon::Decimal (*double_entry)(double) = &to_decimal<>;
    if (!same(double_entry(0.1), to_decimal(0.1))) return 4;
    if (!same(boundragon::components_raw(0), boundragon::Decimal{0, 0, false}) ||
        !same(boundragon::components_raw32(UINT32_C(0x80000000)),
              boundragon::Decimal{0, 0, true})) return 5;
    static_assert(boundragon::numeric_cache_bytes32 == 3676);
    static_assert(boundragon::numeric_cache_bytes32_for<boundragon::FloatPolicy::Compact> == 616);
    if (!same(single, to_decimal<boundragon::FloatPolicy::Compact>(0.1f)) ||
        !same(single, to_decimal<boundragon::FloatPolicy::Integers>(0.1f)) ||
        !same(single, to_decimal<float>(0.1f))) return 6;
    static_assert(boundragon::numeric_cache_bytes<> == 5536);
    static_assert(boundragon::numeric_cache_bytes<Cache::Fast> == 7584);
    static_assert(boundragon::numeric_cache_bytes<Cache::Half> == 3064);
    static_assert(boundragon::numeric_cache_bytes<Cache::Tiny> == 912);
    static_assert(boundragon::numeric_cache_bytes<Cache::Minimal> == 592);
    std::puts("PASS public API: native float, explicit policies, legacy integral/double calls, caller macros");
}

// One externally visible numeric entry per retained-size binary.
#include "methods.h"
#ifndef METHOD
#define METHOD 34
#endif
using namespace boundragon::detail;
#define COMPARE_KNOWN_METHOD(ID, LABEL, NORMAL, COUNTED) || METHOD == ID
static_assert(METHOD == -1 || false COMPARISON_METHODS(COMPARE_KNOWN_METHOD),
              "Unknown METHOD: see benchmark --list");
#undef COMPARE_KNOWN_METHOD

extern "C" BOUNDRAGON_NOINLINE Decimal decimal_convert_one(uint64_t bits) {
    if constexpr (METHOD == -1) return {bits, 0, false}; // Linked-size control.
#define COMPARE_CALL_METHOD(ID, LABEL, NORMAL, COUNTED) if constexpr (METHOD == ID) return NORMAL;
    COMPARISON_METHODS(COMPARE_CALL_METHOD)
#undef COMPARE_CALL_METHOD
    __builtin_unreachable();
}

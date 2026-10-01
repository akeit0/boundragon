// SPDX-License-Identifier: Unlicense
// Optional complete implementation cross-check. The mathematical certificate
// proves the fallback formulas separately; this is not an independent oracle.
// Build optimized and run explicitly, outside the routine quick test suite.
#include "boundragon/detail/float_decimal.h"
#include <cstdio>
#include <cstdint>
int main() {
  using namespace boundragon::detail;
  uint64_t fallbacks = 0, fast_fallbacks = 0;
  for (uint32_t bits = 1; bits <= 0x7f7fffffU; ++bits) {
    auto a = binary32_normalize(binary32_components<true>(bits, &fallbacks));
    auto b = binary32_normalize(binary32_exact_components(bits));
    auto c = binary32_to_decimal<false,true>(bits, &fast_fallbacks);
    auto d = binary32_exact_components<true>(bits);
    if (a.sig != b.sig || a.exp != b.exp || a.negative != b.negative ||
        c.sig != b.sig || c.exp != b.exp || c.negative != b.negative ||
        d.sig != b.sig || d.exp != b.exp || d.negative != b.negative) {
      std::printf("FAIL %08x: %llu e%d; exact %llu e%d; canonical %llu e%d\n", bits,
          (unsigned long long)a.sig,a.exp,(unsigned long long)b.sig,b.exp,(unsigned long long)c.sig,c.exp);
      return 1;
    }
  }
  std::printf("PASS: all 2,139,095,039 positive finite binary32 encodings; compact/raw, Fast and canonical fallback outputs equal certified raw fallback.\n");
  std::printf("Compact/raw fallbacks: %llu (%.8f%%); Fast fallbacks: %llu (%.8f%%)\n",
      (unsigned long long)fallbacks, 100.0*double(fallbacks)/double(0x7f7fffffU),
      (unsigned long long)fast_fallbacks, 100.0*double(fast_fallbacks)/double(0x7f7fffffU));
}

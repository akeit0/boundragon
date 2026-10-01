// SPDX-License-Identifier: Unlicense
// Emit compiled binary32 constants and fallback results for the certificate.
#include "boundragon/detail/float_decimal.h"
#include <cstdio>

int main() {
    using namespace boundragon::detail;
    std::printf("meta %d %d\n", binary32_pow_min, binary32_pow_max);
    for (int p = binary32_pow_min; p <= binary32_pow_max; ++p)
        std::printf("power %d %016llx\n", p,
                    static_cast<unsigned long long>(binary32_powers[p - binary32_pow_min]));
    for (unsigned raw = 1; raw <= 254; ++raw) {
        int q = int(raw) - 150;
        int k = binary32_dec_exp(q), ki = binary32_dec_exp(q, false);
        int shift = q + binary32_power_exp(-k - 1) + 8;
        int shift_i = q + binary32_power_exp(-ki - 1) + 8;
        std::printf("exponent %u %d %d %d %d\n", raw, k, ki, shift, shift_i);
        Decimal d = binary32_normalize(binary32_exact_components(raw << 23));
        std::printf("irregular %u %llu %d\n", raw,
                    static_cast<unsigned long long>(d.sig), d.exp);
    }
    for (unsigned m = 1; m <= 10; ++m) {
        Decimal d = binary32_normalize(binary32_exact_components(m));
        std::printf("small %u %llu %d\n", m,
                    static_cast<unsigned long long>(d.sig), d.exp);
    }
}

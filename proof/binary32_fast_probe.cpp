// SPDX-License-Identifier: Unlicense
#include <boundragon/float.h>
#include <cstdio>
int main() {
    using namespace boundragon::detail;
    for (unsigned raw = 0; raw < 255; ++raw) {
        auto d = binary32_to_decimal(raw << 23);
        std::printf("%u %016llx %u %llu %d\n", raw,
            (unsigned long long)binary32_fast_parameters[raw], binary32_power_significands[raw],
            (unsigned long long)d.sig, d.exp);
    }
}

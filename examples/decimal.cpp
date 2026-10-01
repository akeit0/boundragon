// SPDX-License-Identifier: Unlicense
#include <boundragon/boundragon.h>
#include <cstdio>

int main() {
    auto d = boundragon::to_decimal(1.234);
    std::printf("%s%llue%d\n", d.negative ? "-" : "",
                static_cast<unsigned long long>(d.sig), d.exp);
}

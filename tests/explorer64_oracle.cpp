// SPDX-License-Identifier: Unlicense
#include "boundragon/boundragon.h"
#include <iostream>
int main() {
    uint64_t bits;
    while (std::cin >> bits) {
        uint64_t slow_count = 0;
        auto result = boundragon::detail::centered_half_hot<false,false,true,true>(bits, &slow_count);
        std::cout << result.sig << ' ' << result.exp << ' ' << result.negative << ' ' << slow_count << '\n';
    }
}

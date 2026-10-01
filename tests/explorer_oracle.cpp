// SPDX-License-Identifier: Unlicense
// Reference for the browser translation, using the maintained C++ converter.
#include "boundragon/float.h"
#include <iostream>
int main() {
    uint32_t bits;
    while (std::cin >> bits) {
        uint64_t fallback_count = 0;
        auto result = boundragon::detail::binary32_to_decimal<false, true>(bits, &fallback_count);
        std::cout << result.sig << ' ' << result.exp << ' ' << result.negative << ' ' << fallback_count << '\n';
    }
}

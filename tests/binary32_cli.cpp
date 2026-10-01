// SPDX-License-Identifier: Unlicense
// Strict line-oriented uint32 driver for the independent rational oracle.
// Accepts hexadecimal raw encodings and emits: bits coefficient exponent sign.
#include "boundragon/boundragon.h"
#include <bit>
#include <charconv>
#include <cstdint>
#include <cstdio>
#include <iostream>
#include <string>
#include <string_view>

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        std::string_view text(line);
        const auto first = text.find_first_not_of(" \t\r");
        if (first == std::string_view::npos) continue;
        text.remove_prefix(first);
        const auto last = text.find_last_not_of(" \t\r");
        text = text.substr(0, last + 1);
        if (text.starts_with("0x") || text.starts_with("0X")) text.remove_prefix(2);
        uint32_t bits = 0;
        auto parse = std::from_chars(text.data(), text.data() + text.size(), bits, 16);
        if (text.empty() || parse.ec != std::errc() || parse.ptr != text.data() + text.size()) {
            std::fprintf(stderr, "Malformed hexadecimal binary32 input\n");
            return 1;
        }
        auto value = boundragon::to_decimal(std::bit_cast<float>(bits));
        const auto input = std::bit_cast<float>(bits);
        const boundragon::Decimal choices[] = {
            boundragon::to_decimal<boundragon::FloatPolicy::Compact>(input),
            boundragon::to_decimal<boundragon::FloatPolicy::Integers>(input),
            boundragon::to_decimal<boundragon::Cache::Fast>(input),
            boundragon::to_decimal<boundragon::Cache::Balanced>(input),
            boundragon::to_decimal<boundragon::Cache::Half>(input),
            boundragon::to_decimal<boundragon::Cache::Tiny>(input),
            boundragon::to_decimal<boundragon::Cache::Minimal>(input),
            boundragon::to_decimal<boundragon::Cache::Fast, true, false>(input),
            boundragon::to_decimal<boundragon::Cache::Balanced, true>(input)
        };
        for (auto choice : choices) {
            if (value.sig != choice.sig || value.exp != choice.exp || value.negative != choice.negative) {
                std::fprintf(stderr, "Public float cache policy mismatch: %08x\n", unsigned(bits));
                return 2;
            }
        }
        auto raw = boundragon::components_raw32(bits);
        if (raw.exp != 10000) {
            if (!raw.sig) raw.exp = 0;
            else while (raw.sig % 10 == 0) { raw.sig /= 10; ++raw.exp; }
        }
        if (value.sig != raw.sig || value.exp != raw.exp || value.negative != raw.negative) {
            std::fprintf(stderr, "Public canonical/raw binary32 mismatch: %08x\n", unsigned(bits));
            return 2;
        }
        std::printf("%08x %llu %d %d\n", unsigned(bits),
                    (unsigned long long)value.sig, value.exp, int(value.negative));
    }
    return std::cin.bad() || std::ferror(stdout) ? 1 : 0;
}

// SPDX-License-Identifier: Unlicense
// Count Fast dispatch and guard outcomes; no timing or competitor dependency.
#include <boundragon/float.h>
#include <array>
#include <bit>
#include <cfenv>
#include <clocale>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <random>
#include <string>

using boundragon::detail::binary32_to_decimal;
constexpr std::array checks{"check-nonfinite", "check-power", "check-integer-range",
    "check-integer-bits", "check-tiny", "check-coarse", "check-boundary",
    "check-fine-change", "check-fine-tie"};
constexpr std::array branches{"nonfinite", "power", "integer", "coarse", "fine", "fallback"};
struct Counts {
    std::array<uint64_t, checks.size()> reached{}, yes{};
    std::array<uint64_t, branches.size()> results{};
    std::array<uint64_t, 4> reasons{};
    bool check(unsigned i, bool condition) { ++reached[i]; yes[i] += condition; return condition; }
    unsigned finish(unsigned branch, unsigned reason = 0) {
        ++results[branch]; if (branch == 5) ++reasons[reason]; return branch;
    }
    unsigned classify(uint32_t bits) {
        uint32_t fraction = bits & 0x7fffffU;
        unsigned raw = (bits >> 23) & 255;
        if (check(0, raw == 255)) return finish(0);
        if (check(1, fraction == 0)) return finish(1); // Includes signed zero.
        if (check(2, unsigned(raw - 143) <= 7)) {
            unsigned shift = 150 - raw;
            if (check(3, (fraction & ((uint32_t(1) << shift) - 1)) == 0)) return finish(2);
        }
        uint32_t m = fraction | (raw ? uint32_t(1) << 23 : 0);
        if (check(4, m < 11)) return finish(5, 0);
        constexpr uint64_t Q = uint64_t(1) << 40, mask = Q - 1;
        uint64_t w = boundragon::detail::binary32_fast_parameters[raw] & mask;
        uint64_t product = uint64_t(m) * w + Q / 2;
        int64_t r = int64_t(product & mask) - int64_t(Q / 2);
        uint64_t a = uint64_t(r < 0 ? -r : r), h = w >> 1;
        if (check(5, a + m + 1 < h)) return finish(3);
        if (check(6, a <= h + m + 1)) return finish(5, 1);
        int64_t rounded = r * 10 + int64_t(Q / 2);
        int tail = int(rounded >> 40);
        if (check(7, tail != int((rounded + int64_t(m) * 10) >> 40))) return finish(5, 2);
        if (check(8, (uint64_t(rounded) & mask) == 0)) return finish(5, 3);
        return finish(4);
    }
    void add(uint32_t bits) {
        unsigned branch = classify(bits);
        uint64_t actual = 0;
        binary32_to_decimal<false, true>(bits, &actual);
        if (actual != uint64_t(branch == 5)) {
            std::fprintf(stderr, "Fallback classification differs: %08x\n", bits); std::exit(3);
        }
    }
};

uint32_t finite(std::mt19937_64& rng) {
    uint32_t bits;
    do { bits = uint32_t(rng()); } while (((bits >> 23) & 255) == 255);
    return bits;
}

int main() {
    if (std::fegetround() != FE_TONEAREST || !std::setlocale(LC_ALL, "C")) return 2;
    std::puts("corpus,seed,n,kind,name,reached,true_count");
    constexpr std::array<uint32_t, 10> powers{1,10,100,1000,10000,100000,1000000,10000000,100000000,1000000000};
    for (uint64_t seed : {uint64_t(0x3156a5), uint64_t(0x9a71de)}) {
        for (int pool = 0; pool <= 10; ++pool) {
            // Independent deterministic stream for each distribution and seed.
            std::mt19937_64 rng(seed + uint64_t(pool) * 0x9e3779b97f4a7c15ULL);
            uint64_t n = pool == 0 ? 1048576 : 131072;
            std::string name = pool == 0 ? "random-finite-bits" : pool == 1 ? "decimal-1-to-6" : "precision-d" + std::to_string(pool - 1);
            Counts counts;
            for (uint64_t i = 0; i < n; ++i) {
                uint32_t bits;
                char text[96];
                if (pool == 0) bits = finite(rng);
                else if (pool == 1) {
                    unsigned digits = 1 + unsigned(rng() % 6);
                    uint32_t coefficient = powers[digits-1] + uint32_t(rng() % (powers[digits]-powers[digits-1]));
                    int exponent = int(rng() % 41) - 20;
                    std::snprintf(text, sizeof(text), "%ue%d", coefficient, exponent);
                    bits = std::bit_cast<uint32_t>(std::strtof(text, nullptr)) | (uint32_t(rng() & 1) << 31);
                } else {
                    do {
                        bits = finite(rng);
                        std::snprintf(text, sizeof(text), "%.*g", pool - 1, double(std::bit_cast<float>(bits)));
                        bits = std::bit_cast<uint32_t>(std::strtof(text, nullptr));
                    } while (((bits >> 23) & 255) == 255);
                }
                counts.add(bits);
            }
            for (unsigned i = 0; i < checks.size(); ++i)
                std::printf("%s,%llu,%llu,guard,%s,%llu,%llu\n", name.c_str(), (unsigned long long)seed, (unsigned long long)n,
                    checks[i], (unsigned long long)counts.reached[i], (unsigned long long)counts.yes[i]);
            for (unsigned i = 0; i < branches.size(); ++i)
                std::printf("%s,%llu,%llu,branch,%s,%llu,%llu\n", name.c_str(), (unsigned long long)seed, (unsigned long long)n,
                    branches[i], (unsigned long long)n, (unsigned long long)counts.results[i]);
            for (unsigned i = 0; i < 4; ++i)
                std::printf("%s,%llu,%llu,reason,%s,%llu,%llu\n", name.c_str(), (unsigned long long)seed, (unsigned long long)n,
                    checks[std::array{4,6,7,8}[i]], (unsigned long long)n, (unsigned long long)counts.reasons[i]);
        }
    }
}

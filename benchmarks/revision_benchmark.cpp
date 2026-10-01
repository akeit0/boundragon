// SPDX-License-Identifier: Unlicense
#include "revision_api.h"
#include <algorithm>
#include <bit>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <ctime>
#include <random>
#include <vector>

double cpu_ns() {
#ifdef CLOCK_THREAD_CPUTIME_ID
    timespec t{};
    if (clock_gettime(CLOCK_THREAD_CPUTIME_ID, &t)) std::abort();
    return double(t.tv_sec) * 1e9 + t.tv_nsec;
#else
    return double(std::clock()) * (1e9 / CLOCKS_PER_SEC);
#endif
}

std::vector<uint64_t> corpus(unsigned kind, bool binary32, size_t n, uint64_t seed) {
    std::mt19937_64 rng(seed);
    std::vector<uint64_t> bits;
    bits.reserve(n);
    constexpr double simple[] = {0, -0.0, 1, -1, .1, .5, 10, 1000, 1e6, 1e-6, 123.45, 1.25};
    while (bits.size() < n) {
        uint64_t b;
        if (kind == 0) b = binary32 ? uint32_t(rng()) : rng();
        else if (kind == 2) {
            unsigned raw = 1 + unsigned(rng() % (binary32 ? 254 : 2046));
            b = (uint64_t(raw) << (binary32 ? 23 : 52)) |
                ((rng() & 1) << (binary32 ? 31 : 63));
        } else {
            double value;
            if (kind == 3) value = simple[rng() % std::size(simple)];
            else {
                char text[48];
                unsigned digits = 1 + unsigned(rng() % 6), limit = 1;
                for (unsigned i = 0; i < digits; ++i) limit *= 10;
                std::snprintf(text, sizeof(text), "%s%ue%d", rng() & 1 ? "-" : "",
                    1 + unsigned(rng() % (limit - 1)), int(rng() % 41) - 20);
                // Parse to the source format directly, outside timing.
                if (binary32) { b = std::bit_cast<uint32_t>(std::strtof(text, nullptr)); bits.push_back(b); continue; }
                value = std::strtod(text, nullptr);
            }
            b = binary32 ? std::bit_cast<uint32_t>(float(value)) : std::bit_cast<uint64_t>(value);
        }
        if (binary32 ? ((b >> 23) & 255) == 255 : ((b >> 52) & 2047) == 2047) continue;
        bits.push_back(b);
    }
    return bits;
}

int main(int argc, char** argv) {
    if (argc != 5) return 1;
    size_t n = std::strtoull(argv[1], nullptr, 0);
    unsigned trials = unsigned(std::strtoul(argv[2], nullptr, 0));
    unsigned repeats = unsigned(std::strtoul(argv[3], nullptr, 0));
    uint64_t seed = std::strtoull(argv[4], nullptr, 0);
    if (!n || !trials || !repeats) return 1;
    constexpr const char* policies[] = {"Fast", "Balanced", "Half", "Tiny", "Minimal", "Fast", "Compact"};
    constexpr const char* corpora[] = {"random-finite-bits", "decimal-1-to-6", "powers-of-two", "simple"};
    std::mt19937_64 order_rng(seed ^ UINT64_C(0xbec478a59));
    std::puts("seed,format,policy,corpus,trial,revision,ns_per_value,checksum");
    for (bool f32 : {false, true}) {
        for (unsigned kind = 0; kind < 4; ++kind) {
            auto bits = corpus(kind, f32, n, seed);
            for (unsigned p = f32 ? 5 : 0; p < (f32 ? 7 : 5); ++p)
                for (uint64_t b : bits) {
                    auto a = revision_before(p, b), z = revision_after(p, b);
                    if (a.sig != z.sig || a.exp != z.exp || a.negative != z.negative) {
                        std::fprintf(stderr, "Revision mismatch policy=%u bits=%016llx\n", p, (unsigned long long)b);
                        return 2;
                    }
                }
            std::vector<unsigned> order;
            for (unsigned p = f32 ? 5 : 0; p < (f32 ? 7 : 5); ++p) { order.push_back(p*2); order.push_back(p*2+1); }
            // Untimed warmup for both revisions and all selected policies.
            uint64_t expected[14]{};
            for (unsigned entry : order)
                expected[entry] = (entry & 1 ? batch_after : batch_before)(entry/2, bits.data(), n, repeats);
            for (unsigned p = f32 ? 5 : 0; p < (f32 ? 7 : 5); ++p)
                if (expected[p*2] != expected[p*2+1]) std::abort();
            for (unsigned trial = 0; trial < trials; ++trial) {
                std::shuffle(order.begin(), order.end(), order_rng);
                for (unsigned entry : order) {
                    auto run = entry & 1 ? batch_after : batch_before;
                    double start = cpu_ns();
                    uint64_t checksum = run(entry/2, bits.data(), n, repeats);
                    double elapsed = cpu_ns() - start;
                    if (checksum != expected[entry]) std::abort();
                    std::printf("%llu,binary%u,%s,%s,%u,%s,%.6f,%016llx\n",
                        (unsigned long long)seed, f32 ? 32 : 64, policies[entry/2], corpora[kind], trial,
                        entry & 1 ? "after" : "before", elapsed / (double(n)*repeats), (unsigned long long)checksum);
                }
            }
        }
    }
}

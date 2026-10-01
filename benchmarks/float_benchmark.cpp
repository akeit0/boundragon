// SPDX-License-Identifier: Unlicense
// Canonical binary32 numeric-component benchmark. See docs/benchmarks.md.
#include <boundragon/float.h>
#include "deps/dragonbox/dragonbox.h"
#include "zmij_float.h"
#include <algorithm>
#include <array>
#include <atomic>
#include <cfenv>
#include <chrono>
#include <clocale>
#include <cstdio>
#include <cstdlib>
#include <random>
#include <string>
#include <vector>
#include <sched.h>
#include <time.h>

namespace {
using boundragon::detail::Decimal;
using namespace boundragon::detail;
constexpr std::array names{"boundragon", "boundragon-compact", "boundragon-integers",
                            "dragonbox", "zmij", "zmij-grouped"};

BOUNDRAGON_FORCEINLINE Decimal dragonbox_float(uint32_t bits) {
    uint32_t fraction = bits & UINT32_C(0x7fffff);
    unsigned raw = (bits >> 23) & 255;
    bool negative = bool(bits >> 31);
    if (raw == 255) return {fraction, 10000, negative};
    if ((bits << 1) == 0) return {0, 0, negative};
    auto result = jkj::dragonbox::to_decimal(std::bit_cast<float>(bits),
        jkj::dragonbox::policy::cache::full,
        jkj::dragonbox::policy::trailing_zero::remove);
    return {result.significand, result.exponent, result.is_negative};
}

template<unsigned method, bool validation = false>
BOUNDRAGON_FORCEINLINE Decimal convert(uint32_t bits) {
    if constexpr (method == 0) return boundragon::to_decimal(std::bit_cast<float>(bits));
    if constexpr (method == 1) return boundragon::to_decimal<boundragon::FloatPolicy::Compact>(std::bit_cast<float>(bits));
    if constexpr (method == 2) return boundragon::to_decimal<boundragon::FloatPolicy::Integers>(std::bit_cast<float>(bits));
    if constexpr (method == 3) return dragonbox_float(bits);
    if constexpr (method == 4) return zmij_float_components<false,validation>(bits);
    if constexpr (method == 5) return zmij_float_components<true,validation>(bits);
    return {bits, 0, false}; // Footprint control, selected only by the size build.
}

BOUNDRAGON_FORCEINLINE uint64_t consume(Decimal d) {
    return d.sig ^ (uint64_t(uint32_t(d.exp)) << 32) ^ (uint64_t(d.negative) << 63);
}

volatile uint64_t result_sink;
}

#ifdef BOUNDRAGON_FLOAT_SIZE_METHOD
// Build with one method selected, function/data sections and linker GC; an
// otherwise identical method 6 executable is the harness/control subtraction.
extern "C" BOUNDRAGON_NOINLINE Decimal float_size_entry(uint32_t bits) {
    return convert<BOUNDRAGON_FLOAT_SIZE_METHOD>(bits);
}
int main(int argc, char** argv) {
    uint32_t bits = argc > 1 ? uint32_t(std::strtoul(argv[1], nullptr, 0)) : 0x3f9df3b6U;
    result_sink = consume(float_size_entry(bits));
    return 0;
}
#else
namespace {
struct Corpus { std::string name; std::vector<uint32_t> values; };

template<unsigned method>
BOUNDRAGON_NOINLINE uint64_t trial_run(const uint32_t* values, size_t n,
                                        unsigned repetitions) {
    uint64_t sum = 0;
    for (unsigned r = 0; r < repetitions; ++r) {
        std::atomic_signal_fence(std::memory_order_seq_cst);
        for (size_t i = 0; i < n; ++i) sum += consume(convert<method>(values[i]));
    }
    return sum;
}

uint64_t corpus_hash(const std::vector<uint32_t>& values) {
    uint64_t hash = UINT64_C(14695981039346656037);
    for (uint32_t bits : values) for (unsigned byte = 0; byte != 4; ++byte) {
        hash ^= (bits >> (byte * 8)) & 255;
        hash *= UINT64_C(1099511628211);
    }
    return hash;
}

std::vector<Corpus> make_corpora(uint64_t seed, size_t n) {
    std::mt19937_64 rng(seed);
    std::vector<Corpus> corpora;
    for (const char* name : {"random-finite-bits", "unit-interval", "1-to-6-decimal-digits",
            "mixed-precision-1-to-9", "integers", "simple-values",
            "normal-powers-of-two", "subnormals"}) corpora.push_back({name, {}});
    for (auto& corpus : corpora) corpus.values.reserve(n);
    constexpr std::array<uint32_t, 10> pow10{1, 10, 100, 1000, 10000, 100000,
                                            1000000, 10000000, 100000000, 1000000000};
    constexpr std::array simple{0.0f, 1.0f, 2.0f, 3.0f, 10.0f, 100.0f, 1000.0f,
                               0.1f, 0.01f, 1.5f, 1.234f, 123.45f, 1e20f, 1e-20f};
    for (size_t i = 0; i < n; ++i) {
        uint32_t bits;
        do { bits = uint32_t(rng()); } while (((bits >> 23) & 255) == 255);
        corpora[0].values.push_back(bits);
        float unit = float(rng() & UINT32_C(0xffffff)) * 0x1p-24f;
        corpora[1].values.push_back(std::bit_cast<uint32_t>(unit));

        unsigned nd = 1 + unsigned(rng() % 6);
        uint32_t m = pow10[nd - 1] + uint32_t(rng() % (pow10[nd] - pow10[nd - 1]));
        int exponent = int(rng() % 41) - 20;
        char text[80];
        std::snprintf(text, sizeof(text), "%ue%d", m, exponent);
        bits = std::bit_cast<uint32_t>(std::strtof(text, nullptr));
        corpora[2].values.push_back(bits | uint32_t(rng() & 1) << 31);

        // Each precision is equally represented (to within one value). The
        // conversion to decimal text and strtof are corpus setup only.
        do {
            bits = uint32_t(rng());
            if (((bits >> 23) & 255) == 255) continue;
            std::snprintf(text, sizeof(text), "%.*g", int(1 + i % 9),
                          double(std::bit_cast<float>(bits)));
            bits = std::bit_cast<uint32_t>(std::strtof(text, nullptr));
        } while (((bits >> 23) & 255) == 255);
        corpora[3].values.push_back(bits);

        uint32_t sign = uint32_t(rng() & 1) << 31;
        float integer = float(1 + rng() % UINT32_C(0xffffff));
        corpora[4].values.push_back(std::bit_cast<uint32_t>(integer) | sign);
        corpora[5].values.push_back(std::bit_cast<uint32_t>(simple[i % simple.size()]) |
                                    uint32_t(rng() & 1) << 31);
        corpora[6].values.push_back((uint32_t(1 + i % 254) << 23) | uint32_t(rng() & 1) << 31);
        corpora[7].values.push_back((1 + uint32_t(rng() % UINT32_C(0x7fffff))) |
                                    uint32_t(rng() & 1) << 31);
    }
    for (auto& corpus : corpora) std::shuffle(corpus.values.begin(), corpus.values.end(), rng);
    return corpora;
}

bool same(Decimal a, Decimal b) {
    return a.sig == b.sig && a.exp == b.exp && a.negative == b.negative;
}

bool check(uint32_t bits) {
    std::array<Decimal, 6> values{convert<0,true>(bits), convert<1,true>(bits), convert<2,true>(bits), convert<3,true>(bits), convert<4,true>(bits), convert<5,true>(bits)};
    for (unsigned method = 0; method != values.size(); ++method) {
        auto d = values[method];
        if (!same(d, values[3]) || (d.sig != 0 && d.exp != 10000 && d.sig % 10 == 0)) {
            std::fprintf(stderr, "mismatch bits=%08x method=%s got=(%llu,%d,%d) dragonbox=(%llu,%d,%d)\n",
                bits, names[method], (unsigned long long)d.sig, d.exp, int(d.negative),
                (unsigned long long)values[3].sig, values[3].exp, int(values[3].negative));
            return false;
        }
    }
    return true;
}

uint64_t cpu_duration(timespec a, timespec b) {
    return uint64_t(int64_t(b.tv_sec - a.tv_sec) * INT64_C(1000000000) + b.tv_nsec - a.tv_nsec);
}
} // namespace

int main(int argc, char** argv) {
    uint64_t seed = argc > 1 ? std::strtoull(argv[1], nullptr, 0) : 0x3156a5;
    uint64_t order_seed = argc > 2 ? std::strtoull(argv[2], nullptr, 0) : 0x7600294;
    unsigned trials = argc > 3 ? unsigned(std::strtoul(argv[3], nullptr, 0)) : 11;
    unsigned repetitions = argc > 4 ? unsigned(std::strtoul(argv[4], nullptr, 0)) : 32;
    int cpu = argc > 5 ? std::atoi(argv[5]) : 5;
    size_t n = argc > 6 ? size_t(std::strtoull(argv[6], nullptr, 0)) : 65536;
    if (!trials || !repetitions || !n || cpu < 0 || cpu >= CPU_SETSIZE) return 2;
    if (std::fegetround() != FE_TONEAREST || !std::setlocale(LC_ALL, "C")) return 2;
    cpu_set_t allowed, selected;
    CPU_ZERO(&allowed); CPU_ZERO(&selected);
    if (sched_getaffinity(0, sizeof(allowed), &allowed) || !CPU_ISSET(cpu, &allowed)) return 2;
    CPU_SET(cpu, &selected);
    if (sched_setaffinity(0, sizeof(selected), &selected)) return 2;
    auto corpora = make_corpora(seed, n);
    // Include signed zero, infinities, payload-bearing NaNs and interval-edge
    // values in the semantic precheck, outside all timed finite corpora.
    uint64_t checks = 0;
    for (uint32_t bits : {0U, 1U, 2U, 0x007fffffU, 0x00800000U, 0x00800001U,
            0x3dcccccdU, 0x3f7fffffU, 0x3f800000U, 0x3f800001U, 0x4b7fffffU,
            0x4b800000U, 0x7f7fffffU, 0x7f800000U, 0x7f800001U, 0x7fc00000U, 0x7fffffffU}) {
        if (!check(bits) || !check(bits | UINT32_C(0x80000000))) return 3;
        checks += 2;
    }
    for (auto& corpus : corpora) for (uint32_t bits : corpus.values) {
        if (!check(bits)) return 3;
        ++checks;
    }
    std::fprintf(stderr, "field_precheck_values=%llu methods=%zu seed=%llu order_seed=%llu cpu=%d\n",
        (unsigned long long)checks, names.size(), (unsigned long long)seed,
        (unsigned long long)order_seed, cpu);
    std::fprintf(stderr, "cache_bytes boundragon=%zu dragonbox=%zu\n",
        size_t(boundragon::numeric_cache_bytes32), sizeof(jkj::dragonbox::cache_holder<jkj::dragonbox::ieee754_binary32>::cache));
    std::mt19937_64 order_rng(order_seed);
    using Fn = uint64_t (*)(const uint32_t*, size_t, unsigned);
    constexpr std::array<Fn, 6> fns{trial_run<0>, trial_run<1>, trial_run<2>, trial_run<3>, trial_run<4>, trial_run<5>};
    std::puts("seed,order_seed,corpus,corpus_hash,trial,order,method,n,repetitions,conversions,elapsed_ns,ns_per_value,cpu_elapsed_ns,cpu_ns_per_value,checksum,cpu_start,cpu_end,raw_filter_fallbacks,default_integer_hits,default_fallbacks");
    for (auto& corpus : corpora) {
        uint64_t fallback = 0, integers = 0, default_fallback = 0;
        for (uint32_t bits : corpus.values) {
            result_sink = consume(binary32_components<true>(bits, &fallback));
            uint32_t fraction = bits & UINT32_C(0x7fffff);
            unsigned raw = (bits >> 23) & 255;
            unsigned shift = 150 - raw;
            bool integer = shift <= 23 && (fraction & ((UINT32_C(1) << shift) - 1)) == 0;
            integers += integer && unsigned(raw - 143) <= 7 && fraction != 0;
            // Count actual selective integer hits and Q40 fallback separately
            // from the retained compact/raw filter.
            result_sink = consume(binary32_to_decimal<false,true>(bits, &default_fallback));
        }
        uint64_t expected = fns[0](corpus.values.data(), n, 1) * repetitions;
        for (unsigned warmup = 0; warmup != 3; ++warmup)
            for (auto fn : fns) result_sink = fn(corpus.values.data(), n, repetitions);
        for (unsigned trial = 0; trial < trials; ++trial) {
            std::array<unsigned, 6> order{0, 1, 2, 3, 4, 5};
            std::shuffle(order.begin(), order.end(), order_rng);
            for (unsigned position = 0; position != order.size(); ++position) {
                unsigned method = order[position];
                timespec begin_cpu{}, end_cpu{};
                int begin_core = sched_getcpu();
                if (clock_gettime(CLOCK_THREAD_CPUTIME_ID, &begin_cpu)) return 5;
                auto start = std::chrono::steady_clock::now();
                uint64_t sum = fns[method](corpus.values.data(), n, repetitions);
                auto end = std::chrono::steady_clock::now();
                if (clock_gettime(CLOCK_THREAD_CPUTIME_ID, &end_cpu)) return 5;
                int end_core = sched_getcpu();
                result_sink = sum;
                if (sum != expected || begin_core != cpu || end_core != cpu) return 4;
                uint64_t ns = uint64_t(std::chrono::duration_cast<std::chrono::nanoseconds>(end - start).count());
                uint64_t cpu_ns = cpu_duration(begin_cpu, end_cpu);
                uint64_t conversions = uint64_t(n) * repetitions;
                std::printf("%llu,%llu,%s,%016llx,%u,%u,%s,%zu,%u,%llu,%llu,%.9f,%llu,%.9f,%016llx,%d,%d,%llu,%llu,%llu\n",
                    (unsigned long long)seed, (unsigned long long)order_seed, corpus.name.c_str(),
                    (unsigned long long)corpus_hash(corpus.values), trial, position, names[method], n,
                    repetitions, (unsigned long long)conversions, (unsigned long long)ns,
                    double(ns) / double(conversions), (unsigned long long)cpu_ns,
                    double(cpu_ns) / double(conversions), (unsigned long long)sum, begin_core, end_core,
                    (unsigned long long)fallback, (unsigned long long)integers,
                    (unsigned long long)default_fallback);
            }
        }
    }
}
#endif

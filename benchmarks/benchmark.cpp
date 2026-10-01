// Reproducible numeric-component benchmark. No ASCII formatting.
// Default methods include canonicalization; all comparison methods return canonical components.
#include "methods.h"
#include <algorithm>
#include <array>
#include <atomic>
#include <cerrno>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <numeric>
#include <random>
#include <string>
#include <vector>
#include <sched.h>
#include <time.h>

using namespace boundragon::detail;

template<int method, bool instrument = false>
BOUNDRAGON_FORCEINLINE Decimal invoke(uint64_t bits, uint64_t* count = nullptr) {
    (void)count;
#define COMPARE_INVOKE(ID, LABEL, NORMAL, COUNTED) \
    if constexpr (method == ID) { \
        if constexpr (instrument) return COUNTED; \
        else return NORMAL; \
    }
    COMPARISON_METHODS(COMPARE_INVOKE)
#undef COMPARE_INVOKE
    std::abort();
}

enum class Mode { Throughput, Pressure, Dependency };
const char* mode_name(Mode mode) {
    return mode == Mode::Throughput ? "throughput" : mode == Mode::Pressure ? "pressure" : "dependency";
}
BOUNDRAGON_FORCEINLINE uint64_t digest(Decimal d) {
    return d.sig ^ uint64_t(d.exp) ^ uint64_t(d.negative);
}
template<int method, Mode mode>
BOUNDRAGON_NOINLINE uint64_t run(const uint64_t* values, size_t n, unsigned repetitions,
                      const uint64_t* pressure, size_t pressure_words) {
    uint64_t sum = 0;
    size_t index = 0;
    for (unsigned r = 0; r < repetitions; ++r) {
        const size_t pressure_base = mode == Mode::Pressure ? size_t(r) * n * 17 : 0;
        // Make repeated passes observable to the compiler without an instruction
        // in the per-value loop or any hardware cache flush.
        std::atomic_signal_fence(std::memory_order_seq_cst);
        for (size_t i = 0; i < n; ++i) {
            Decimal d = invoke<method>(values[mode == Mode::Dependency ? index : i]);
            uint64_t value = digest(d);
            if constexpr (mode == Mode::Pressure) {
                // A real additional 64-bit load on every conversion. The odd
                // stride walks every word in the power-of-two competing array.
                value += static_cast<const volatile uint64_t*>(pressure)[(pressure_base + i * 17) & (pressure_words - 1)];
            }
            sum += value;
            if constexpr (mode == Mode::Dependency) {
                // Conversion result -> next address -> next conversion. The
                // iteration salt prevents a fixed-value self-loop. No claim
                // of isolated instruction latency is made for this workload.
                index = size_t(value ^ uint64_t(i * 0x9e3779b97f4a7c15ULL) ^ uint64_t(r)) & (n - 1);
            }
        }
    }
    return sum;
}
using RunFn = uint64_t (*)(const uint64_t*, size_t, unsigned, const uint64_t*, size_t);
using CheckFn = Decimal (*)(uint64_t, uint64_t*);
struct Algorithm { int id; const char* name; std::array<RunFn, 3> run; CheckFn check; };
const Algorithm algorithms[] = {
#define COMPARE_REGISTER(ID, LABEL, NORMAL, COUNTED) \
    {ID, LABEL, {run<ID, Mode::Throughput>, run<ID, Mode::Pressure>, run<ID, Mode::Dependency>}, invoke<ID, true>},
    COMPARISON_METHODS(COMPARE_REGISTER)
#undef COMPARE_REGISTER
};

struct Corpus { const char* name; std::vector<uint64_t> values; };
struct Options {
    size_t n = 65536;
    size_t hot_n = 256;
    size_t digit_n = 100000;
    bool per_digit = false;
    unsigned repetitions = 32;
    unsigned trials = 11;
    size_t pressure_kib = 64;
    uint64_t seed = 0x19ed35db;
    Mode mode = Mode::Throughput;
    std::string corpus = "random-bits,1-to-6-decimal-digits,simple-values";
    std::string methods = "boundragon,dragonbox,dragonbox-compact";
    std::string baseline = "dragonbox";
    std::string csv = "benchmark.csv";
};
[[noreturn]] void fail(const std::string& message) {
    std::fprintf(stderr, "ERROR: %s\n", message.c_str());
    std::exit(1);
}
uint64_t number(const char* text) {
    char* end = nullptr;
    errno = 0;
    auto result = std::strtoull(text, &end, 0);
    if (errno || *text == '-' || !*text || *end) fail(std::string("Invalid integer: ") + text);
    return result;
}
unsigned unsigned_number(const char* text) {
    auto result = number(text);
    if (result > std::numeric_limits<unsigned>::max()) fail(std::string("Integer exceeds unsigned range: ") + text);
    return unsigned(result);
}
bool power_of_two(size_t n) { return n != 0 && (n & (n - 1)) == 0; }
bool selected(const std::string& list, const std::string& value) {
    if (list == "all") return true;
    size_t start = 0;
    do {
        auto end = list.find(',', start);
        if (list.substr(start, end == std::string::npos ? end : end - start) == value) return true;
        if (end == std::string::npos) break;
        start = end + 1;
    } while (start <= list.size());
    return false;
}
void validate_selection(const std::string& list, const std::vector<std::string>& available, const char* what) {
    if (list == "all") return;
    size_t start = 0;
    do {
        auto end = list.find(',', start);
        auto token = list.substr(start, end == std::string::npos ? end : end - start);
        if (std::find(available.begin(), available.end(), token) == available.end())
            fail(std::string("Unknown ") + what + ": " + token);
        if (end == std::string::npos) break;
        start = end + 1;
    } while (start <= list.size());
}
void help() {
    std::puts("Usage: benchmark [options]\n"
              "  --mode throughput|pressure|dependency  (default throughput)\n"
              "  --corpus all|NAME[,NAME...]            (default random-bits,1-to-6-decimal-digits,simple-values)\n"
              "  --methods all|NAME[,NAME...]           (default boundragon,dragonbox,dragonbox-compact)\n"
              "  --baseline NAME                       (default dragonbox)\n"
              "  --values N --hot-values N              (powers of two; 65536 and 256)\n"
              "  --trials N --repetitions N             (11 and 32; repetitions scale up for hot corpus)\n"
              "  --pressure-kib N                       (power of two; 64)\n"
              "  --per-digit --digit-values N           (add 1-17 precision pools; 100000 per precision)\n"
              "  --seed INTEGER --csv FILE              (0x19ed35db and benchmark.csv)\n"
              "  --list                                (show method and corpus names)");
}
std::vector<Corpus> make_corpora(const Options& options) {
    std::mt19937_64 rng(options.seed);
    std::vector<Corpus> corpora = {
        {"random-bits", std::vector<uint64_t>(options.n)},
        {"one-to-two", std::vector<uint64_t>(options.n)},
        {"1-to-15-decimal-digits", std::vector<uint64_t>(options.n)},
        {"1-to-6-decimal-digits", std::vector<uint64_t>(options.n)},
        {"random-hot", std::vector<uint64_t>(options.hot_n)},
        {"simple-values", std::vector<uint64_t>(options.n)}
    };
    // Preserve the historical RNG order and first three corpora exactly
    // for the default seed and N. The extra corpora consume RNG afterward.
    for (size_t i = 0; i < options.n; ++i) {
        uint64_t bits;
        do { bits = rng(); } while (((bits >> 52) & 2047) == 2047);
        corpora[0].values[i] = bits;
        corpora[1].values[i] = (rng() & ((1ULL << 52) - 1)) | (1023ULL << 52);
        unsigned nd = 1 + rng() % 15;
        uint64_t limit = 1;
        for (unsigned j = 0; j < nd; ++j) limit *= 10;
        uint64_t m = 1 + rng() % limit;
        int e = int(rng() % 581) - 290;
        char text[80];
        std::snprintf(text, sizeof(text), "%llue%d", (unsigned long long)m, e);
        corpora[2].values[i] = std::bit_cast<uint64_t>(std::strtod(text, nullptr));
    }
    for (size_t i = 0; i < options.n; ++i) {
        unsigned nd = 1 + rng() % 6;
        uint64_t limit = 1;
        for (unsigned j = 0; j < nd; ++j) limit *= 10;
        uint64_t m = 1 + rng() % limit;
        int e = int(rng() % 25) - 12;
        char text[80];
        std::snprintf(text, sizeof(text), "%llue%d", (unsigned long long)m, e);
        uint64_t bits = std::bit_cast<uint64_t>(std::strtod(text, nullptr));
        corpora[3].values[i] = bits | ((rng() & 1) << 63);
    }
    std::copy_n(corpora[0].values.begin(), options.hot_n, corpora[4].values.begin());
    constexpr std::array simple = {0.0, 1.0, 2.0, 3.0, 10.0, 100.0, 1000.0,
                                  0.1, 0.01, 1.5, 1.234, 123.45, 1e20, 1e-20};
    for (size_t i = 0; i < options.n; ++i)
        corpora[5].values[i] = std::bit_cast<uint64_t>(simple[i % simple.size()]) | ((rng() & 1) << 63);
    std::shuffle(corpora[5].values.begin(), corpora[5].values.end(), rng);
    if (options.per_digit) {
        // Reference-repo precision pools; generation and parsing are untimed.
        unsigned state = unsigned(options.seed);
        auto next = [&]() { state = 214013 * state + 2531011; return state; };
        std::vector<uint64_t> mixed;
        mixed.reserve(17 * options.digit_n);
        for (int digits = 1; digits <= 17; ++digits) {
            Corpus pool{};
            // Stable string storage is needed because Corpus stores const char*.
            static const char* const names[] = {"precision-d1", "precision-d2", "precision-d3", "precision-d4",
                "precision-d5", "precision-d6", "precision-d7", "precision-d8", "precision-d9", "precision-d10",
                "precision-d11", "precision-d12", "precision-d13", "precision-d14", "precision-d15", "precision-d16", "precision-d17"};
            pool.name = names[digits - 1];
            pool.values.reserve(options.digit_n);
            while (pool.values.size() < options.digit_n) {
                uint64_t bits = uint64_t(next()) << 32; bits |= next();
                double v = std::bit_cast<double>(bits);
                if (((bits >> 52) & 2047) == 2047) continue;
                char text[64];
                std::snprintf(text, sizeof(text), "%.*g", digits, v);
                v = std::strtod(text, nullptr);
                bits = std::bit_cast<uint64_t>(v);
                if (((bits >> 52) & 2047) == 2047) continue;
                pool.values.push_back(bits);
            }
            mixed.insert(mixed.end(), pool.values.begin(), pool.values.end());
            corpora.push_back(std::move(pool));
        }
        std::mt19937_64 shuffle(options.seed);
        std::shuffle(mixed.begin(), mixed.end(), shuffle);
        corpora.push_back({"precision-mixed", std::move(mixed)});
    }
    return corpora;
}
uint64_t corpus_hash(const std::vector<uint64_t>& values) {
    uint64_t result = 14695981039346656037ULL;
    for (uint64_t bits : values) {
        for (unsigned byte = 0; byte != 8; ++byte) {
            result ^= (bits >> (byte * 8)) & 255;
            result *= 1099511628211ULL;
        }
    }
    return result;
}
std::string csv_quote(const char* value) {
    std::string result = "\"";
    for (const char* p = value; *p; ++p) { if (*p == '"') result += '"'; result += *p; }
    return result + '"';
}
double median(std::vector<double> values) {
    std::sort(values.begin(), values.end());
    size_t n = values.size();
    return n & 1 ? values[n / 2] : (values[n / 2 - 1] + values[n / 2]) / 2;
}
volatile uint64_t result_sink = 0;

int main(int argc, char** argv) {
    Options options;
    bool list = false;
    for (int i = 1; i < argc; ++i) {
        std::string option = argv[i];
        if (option == "--help") { help(); return 0; }
        if (option == "--list") { list = true; continue; }
        if (option == "--per-digit") { options.per_digit = true; continue; }
        if (i + 1 == argc) fail("Missing value after " + option);
        const char* value = argv[++i];
        if (option == "--mode") {
            if (std::strcmp(value, "throughput") == 0) options.mode = Mode::Throughput;
            else if (std::strcmp(value, "pressure") == 0) options.mode = Mode::Pressure;
            else if (std::strcmp(value, "dependency") == 0) options.mode = Mode::Dependency;
            else fail(std::string("Unknown mode: ") + value);
        } else if (option == "--corpus") options.corpus = value;
        else if (option == "--methods") options.methods = value;
        else if (option == "--baseline") options.baseline = value;
        else if (option == "--csv") options.csv = value;
        else if (option == "--values") options.n = number(value);
        else if (option == "--hot-values") options.hot_n = number(value);
        else if (option == "--digit-values") options.digit_n = number(value);
        else if (option == "--repetitions") options.repetitions = unsigned_number(value);
        else if (option == "--trials") options.trials = unsigned_number(value);
        else if (option == "--pressure-kib") options.pressure_kib = number(value);
        else if (option == "--seed") options.seed = number(value);
        else fail("Unknown option: " + option);
    }
    std::vector<std::string> method_names;
    for (auto& algorithm : algorithms) method_names.emplace_back(algorithm.name);
    std::vector<std::string> corpus_names = {"random-bits", "one-to-two", "1-to-15-decimal-digits", "1-to-6-decimal-digits", "random-hot", "simple-values", "precision-mixed"};
    for (int d = 1; d <= 17; ++d) corpus_names.push_back("precision-d" + std::to_string(d));
    if (list) {
        for (auto& algorithm : algorithms) std::printf("method id=%d name=%s\n", algorithm.id, algorithm.name);
        for (auto& name : corpus_names) std::printf("corpus=%s\n", name.c_str());
        return 0;
    }
    if (!power_of_two(options.n) || !power_of_two(options.hot_n) || options.hot_n > options.n)
        fail("--values and --hot-values must be powers of two, with hot-values <= values");
    if (!power_of_two(options.pressure_kib) || options.pressure_kib > (1ULL << 20))
        fail("--pressure-kib must be a power of two <= 1048576");
    if (!options.repetitions || !options.trials) fail("Repetitions and trials must be positive");
    if (!options.digit_n) fail("Digit pool size must be positive");
    if (options.per_digit && options.mode != Mode::Throughput) fail("Precision pools currently support throughput mode only");
    if (!options.per_digit && options.corpus.find("precision-") != std::string::npos) fail("Precision pools require --per-digit");
    validate_selection(options.methods, method_names, "method");
    validate_selection(options.corpus, corpus_names, "corpus");
    std::vector<const Algorithm*> methods;
    for (auto& algorithm : algorithms) if (selected(options.methods, algorithm.name)) methods.push_back(&algorithm);
    size_t baseline = 0;
    bool has_baseline = false;
    for (size_t i = 0; i != methods.size(); ++i) if (options.baseline == methods[i]->name) { baseline = i; has_baseline = true; }
    if (!has_baseline) fail("The --baseline method must be present in --methods");

    cpu_set_t permitted;
    CPU_ZERO(&permitted);
    int pin_cpu = -1, pin_error = 0;
    if (sched_getaffinity(0, sizeof(permitted), &permitted) == 0) {
        std::printf("permitted_cpus=");
        bool first = true;
        for (int cpu = 0; cpu < CPU_SETSIZE; ++cpu) if (CPU_ISSET(cpu, &permitted)) {
            std::printf("%s%d", first ? "" : ",", cpu);
            first = false;
            if (pin_cpu < 0) pin_cpu = cpu;
        }
        std::puts("");
        if (pin_cpu >= 0) {
            cpu_set_t one;
            CPU_ZERO(&one);
            CPU_SET(pin_cpu, &one);
            if (sched_setaffinity(0, sizeof(one), &one)) { pin_error = errno; pin_cpu = -1; }
        }
    } else pin_error = errno;
    std::printf("compiler=%s\nmode=%s seed=0x%llx n=%zu hot_n=%zu base_repetitions=%u trials=%u pressure_kib=%zu\n",
                __VERSION__, mode_name(options.mode), (unsigned long long)options.seed,
                options.n, options.hot_n, options.repetitions, options.trials, options.pressure_kib);
    std::printf("pinned_cpu=%d affinity_error=%d baseline=%s raw_csv=%s\n", pin_cpu, pin_error,
                methods[baseline]->name, options.csv.c_str());
    std::fflush(stdout);

    auto corpora = make_corpora(options);
    std::vector<uint64_t> pressure(options.pressure_kib * 1024 / sizeof(uint64_t));
    std::mt19937_64 pressure_rng(options.seed ^ 0xbedf43a7cc1c5031ULL);
    for (auto& word : pressure) word = pressure_rng();
    std::mt19937_64 order_rng(options.seed ^ 0xb99fdfe66b5c2b0aULL);
    FILE* csv = std::fopen(options.csv.c_str(), "w");
    if (!csv) fail("Cannot open CSV: " + options.csv);
    std::fputs("corpus,corpus_hash,mode,trial,order,method_id,method,n,repetitions,conversions,elapsed_ns,ns_per_value,cpu_elapsed_ns,cpu_ns_per_value,checksum,corpus_fallbacks,representation_variants,cpu_start,cpu_end\n", csv);

    for (const auto& corpus : corpora) {
        if (!selected(options.corpus, corpus.name) && !(options.per_digit && std::strncmp(corpus.name, "precision-", 10) == 0)) continue;
        const size_t n = corpus.values.size();
        const size_t repetition_scale = std::max(size_t(1), options.n / n);
        if (repetition_scale > std::numeric_limits<unsigned>::max() / options.repetitions)
            fail("Scaled hot-corpus repetitions exceed unsigned range; reduce --values or --repetitions");
        const unsigned repetitions = options.repetitions * unsigned(repetition_scale);
        const auto hash = corpus_hash(corpus.values);
        std::vector<uint64_t> fallbacks(methods.size()), variants(methods.size()), expected(methods.size());
        std::vector<std::vector<double>> times(methods.size());
        std::vector<std::vector<double>> cpu_times(methods.size());
        for (size_t i = 0; i < n; ++i) {
            const uint64_t bits = corpus.values[i];
            auto ref = canonical(upstream_components(bits));
            auto raw_ref = methods[baseline]->check(bits, &fallbacks[baseline]);
            for (size_t j = 0; j < methods.size(); ++j) {
                Decimal result = methods[j]->check(bits, &fallbacks[j]);
                if (!equal(canonical(result), ref)) {
                    std::fprintf(stderr, "CORRECTNESS FAILURE corpus=%s method=%s bits=%016llx\n", corpus.name, methods[j]->name, (unsigned long long)bits);
                    return 2;
                }
                variants[j] += !equal(result, raw_ref);
                expected[j] += digest(result);
            }
        }
        if (options.mode == Mode::Dependency) {
            for (size_t j = 0; j < methods.size(); ++j) if (variants[j])
                fail(std::string("Dependency mode requires identical component results to visit identical inputs: ") + methods[j]->name);
            // Verify the identical input traversal against the selected baseline.
            uint64_t reference_checksum = methods[baseline]->run[size_t(Mode::Dependency)](corpus.values.data(), n, repetitions, pressure.data(), pressure.size());
            std::fill(expected.begin(), expected.end(), reference_checksum);
        } else {
            for (auto& checksum : expected) checksum *= repetitions;
            if (options.mode == Mode::Pressure) {
                // The odd stride permutes every word once per complete cycle.
                // Compute its independent additive checksum, including a final
                // incomplete cycle, without repeating a conversion kernel.
                const uint64_t conversions = uint64_t(n) * repetitions;
                uint64_t one_cycle = 0;
                for (auto word : pressure) one_cycle += word;
                uint64_t pressure_checksum = one_cycle * (conversions / pressure.size());
                for (uint64_t i = 0; i < conversions % pressure.size(); ++i)
                    pressure_checksum += pressure[(i * 17) & (pressure.size() - 1)];
                for (auto& checksum : expected) checksum += pressure_checksum;
            }
        }
        std::printf("CORPUS %s n=%zu bytes=%zu repetitions=%u conversions=%llu hash=%016llx\n", corpus.name, n,
                    n * sizeof(uint64_t), repetitions, (unsigned long long)(uint64_t(n) * repetitions), (unsigned long long)hash);
        for (size_t j = 0; j < methods.size(); ++j) {
            // The untimed complete pass warms the workload. Its uninstrumented
            // output must agree with the independently checked scalar preflight
            // checksum (or the full reference traversal in dependency mode).
            auto warm_checksum = methods[j]->run[size_t(options.mode)](corpus.values.data(), n, repetitions, pressure.data(), pressure.size());
            if (warm_checksum != expected[j]) fail(std::string("Warmup disagrees with validated scalar results: ") + methods[j]->name);
            result_sink = warm_checksum;
            std::printf("method=%s fallback_instrumentation=unavailable representation_variants=%llu\n",
                        methods[j]->name, (unsigned long long)variants[j]);
        }
        for (unsigned trial = 0; trial < options.trials; ++trial) {
            std::vector<unsigned> order(methods.size());
            std::iota(order.begin(), order.end(), 0);
            std::shuffle(order.begin(), order.end(), order_rng);
            for (size_t position = 0; position < order.size(); ++position) {
                const size_t j = order[position];
                const auto fn = methods[j]->run[size_t(options.mode)];
                const int cpu_start = sched_getcpu();
                timespec cpu_clock_start{}, cpu_clock_end{};
                if (clock_gettime(CLOCK_THREAD_CPUTIME_ID, &cpu_clock_start)) fail("Cannot read thread CPU clock");
                const auto start = std::chrono::steady_clock::now();
                const uint64_t checksum = fn(corpus.values.data(), n, repetitions, pressure.data(), pressure.size());
                const auto end = std::chrono::steady_clock::now();
                if (clock_gettime(CLOCK_THREAD_CPUTIME_ID, &cpu_clock_end)) fail("Cannot read thread CPU clock");
                const int cpu_end = sched_getcpu();
                result_sink = checksum;
                if (checksum != expected[j]) fail(std::string("Checksum changed for ") + methods[j]->name);
                double elapsed = std::chrono::duration<double, std::nano>(end - start).count();
                double cpu_elapsed = double(cpu_clock_end.tv_sec - cpu_clock_start.tv_sec) * 1e9
                                   + double(cpu_clock_end.tv_nsec - cpu_clock_start.tv_nsec);
                uint64_t conversions = uint64_t(n) * repetitions;
                double ns = elapsed / double(conversions);
                double cpu_ns = cpu_elapsed / double(conversions);
                times[j].push_back(ns);
                cpu_times[j].push_back(cpu_ns);
                std::string fallback_count = std::to_string(fallbacks[j]);
                fallback_count.clear(); // No upstream instrumentation exists.
                std::fprintf(csv, "%s,%016llx,%s,%u,%zu,%d,%s,%zu,%u,%llu,%.0f,%.9f,%.0f,%.9f,%016llx,%s,%llu,%d,%d\n",
                             csv_quote(corpus.name).c_str(), (unsigned long long)hash, mode_name(options.mode), trial, position,
                             methods[j]->id, csv_quote(methods[j]->name).c_str(), n, repetitions,
                             (unsigned long long)conversions, elapsed, ns, cpu_elapsed, cpu_ns, (unsigned long long)checksum,
                             fallback_count.c_str(), (unsigned long long)variants[j], cpu_start, cpu_end);
            }
            std::fflush(csv);
        }
        for (size_t j = 0; j < methods.size(); ++j) {
            std::vector<double> ratios;
            for (unsigned trial = 0; trial < options.trials; ++trial) ratios.push_back(times[baseline][trial] / times[j][trial]);
            auto [lo, hi] = std::minmax_element(times[j].begin(), times[j].end());
            std::printf("%-24s median=%.6f min=%.6f max=%.6f ns/value cpu_median=%.6f paired_speedup_vs_%s=%.6fx\n",
                        methods[j]->name, median(times[j]), *lo, *hi, median(cpu_times[j]), methods[baseline]->name, median(ratios));
        }
        std::fflush(stdout);
    }
    if (std::ferror(csv) || std::fclose(csv)) fail("Writing the CSV failed");
    std::printf("sink=%016llx\n", (unsigned long long)result_sink);
    return 0;
}

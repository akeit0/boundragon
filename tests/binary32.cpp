// SPDX-License-Identifier: Unlicense
// Native binary32 shortest/closest/even validation, independent of binary64.
// Include only float.h so this test also checks the standalone float interface.
#include "boundragon/float.h"
#include <array>
#include <bit>
#include <cerrno>
#include <charconv>
#include <cstdint>
#include <cstdio>
#include <cstdlib>
#include <limits>
#include <string>

using boundragon::Decimal;
static_assert(sizeof(float) == sizeof(uint32_t) && std::numeric_limits<float>::is_iec559 &&
              std::numeric_limits<float>::digits == 24 && std::numeric_limits<float>::max_exponent == 128);

namespace {
constexpr uint32_t sign_mask = UINT32_C(0x80000000);
constexpr uint32_t fraction_mask = UINT32_C(0x007fffff);
constexpr uint32_t infinity = UINT32_C(0x7f800000);

[[noreturn]] void fail(const std::string& message) {
    std::fprintf(stderr, "ERROR: %s\n", message.c_str());
    std::exit(1);
}

uint64_t number(const char* text) {
    char* end = nullptr;
    errno = 0;
    auto result = std::strtoull(text, &end, 0);
    if (errno || !*text || *text == '-' || *end) fail(std::string("Invalid integer: ") + text);
    return result;
}

uint64_t random_bits(uint64_t& state) {
    uint64_t value = (state += UINT64_C(0x9e3779b97f4a7c15));
    value = (value ^ (value >> 30)) * UINT64_C(0xbf58476d1ce4e5b9);
    value = (value ^ (value >> 27)) * UINT64_C(0x94d049bb133111eb);
    return value ^ (value >> 31);
}

bool same(Decimal a, Decimal b) {
    return a.sig == b.sig && a.exp == b.exp && a.negative == b.negative;
}

// Deliberately do not reuse the library's decimal normalization routine.
Decimal normalized(Decimal value) {
    if (value.exp == 10000) return value;
    if (!value.sig) return {0, 0, value.negative};
    while (value.sig % 10 == 0) { value.sig /= 10; ++value.exp; }
    return value;
}

// Scientific requests the fewest significant digits. The no-format overload
// can choose a longer exact integer coefficient to reduce total text length;
// that is a different optimization from the numeric-components API.
Decimal independent(uint32_t bits) {
    const uint32_t magnitude = bits & ~sign_mask;
    const bool sign = bool(bits >> 31);
    if (magnitude >= infinity) return {bits & fraction_mask, 10000, sign};
    if (magnitude == 0) return {0, 0, sign};
    char text[64];
    auto result = std::to_chars(text, text + sizeof(text), std::bit_cast<float>(bits),
                                std::chars_format::scientific);
    if (result.ec != std::errc()) fail("std::to_chars(float) failed");
    const char* p = text;
    const bool printed_sign = *p == '-';
    p += printed_sign;
    uint64_t sig = 0;
    int digits = 0;
    for (; p != result.ptr && *p != 'e' && *p != 'E'; ++p) {
        if (*p == '.') continue;
        if (*p < '0' || *p > '9') fail("Invalid std::to_chars significand");
        sig = sig * 10 + unsigned(*p - '0');
        ++digits;
    }
    if (!digits || digits > 9 || p == result.ptr) fail("Invalid scientific float output");
    ++p;
    bool negative_exp = p != result.ptr && *p == '-';
    if (p != result.ptr && (*p == '+' || *p == '-')) ++p;
    if (p == result.ptr) fail("Empty scientific exponent");
    int exp = 0;
    for (; p != result.ptr; ++p) {
        if (*p < '0' || *p > '9') fail("Invalid std::to_chars exponent");
        exp = exp * 10 + unsigned(*p - '0');
    }
    return normalized({sig, (negative_exp ? -exp : exp) - digits + 1, printed_sign});
}

[[noreturn]] void mismatch(const char* variant, uint32_t bits, Decimal actual, Decimal expected) {
    std::fprintf(stderr,
        "MISMATCH variant=%s bits=%08x actual=%llue%d sign=%d expected=%llue%d sign=%d\n",
        variant, unsigned(bits), (unsigned long long)actual.sig, actual.exp, int(actual.negative),
        (unsigned long long)expected.sig, expected.exp, int(expected.negative));
    std::exit(2);
}

struct Validator {
    uint64_t checked = 0, finite_nonzero = 0, subnormal = 0, special = 0, negative = 0;
    uint64_t input_hash = UINT64_C(14695981039346656037);

    void check(uint32_t bits) {
        Decimal expected = independent(bits);
        const Decimal results[] = {
            boundragon::to_decimal(std::bit_cast<float>(bits)),
            boundragon::to_decimal<boundragon::FloatPolicy::Compact>(std::bit_cast<float>(bits)),
            boundragon::to_decimal<boundragon::FloatPolicy::Integers>(std::bit_cast<float>(bits)),
            normalized(boundragon::components_raw32(bits)),
            boundragon::detail::binary32_to_decimal(bits),
            normalized(boundragon::detail::binary32_exact_components(bits)),
            boundragon::detail::binary32_exact_components<true>(bits)
        };
        constexpr const char* names[] = {"public", "compact", "integers", "raw-normalized", "detail", "exact-normalized", "canonical-exact"};
        for (unsigned i = 0; i < std::size(results); ++i)
            if (!same(results[i], expected)) mismatch(names[i], bits, results[i], expected);
        const uint32_t magnitude = bits & ~sign_mask;
        ++checked;
        finite_nonzero += magnitude != 0 && magnitude < infinity;
        subnormal += magnitude != 0 && magnitude <= fraction_mask;
        special += magnitude >= infinity;
        negative += bits >> 31;
        input_hash = (input_hash ^ bits) * UINT64_C(1099511628211);
    }

    void both_signs(uint32_t magnitude) {
        magnitude &= ~sign_mask;
        check(magnitude);
        check(magnitude | sign_mask);
    }

    void around(uint32_t center, int radius) {
        for (int delta = -radius; delta <= radius; ++delta) {
            int64_t bits = int64_t(center) + delta;
            if (bits >= 0 && bits <= INT32_MAX) both_signs(uint32_t(bits));
        }
    }

    void known(uint32_t bits, uint64_t sig, int exp) {
        auto expected = Decimal{sig, exp, false};
        auto actual = boundragon::to_decimal(std::bit_cast<float>(bits));
        if (!same(actual, expected)) mismatch("regression", bits, actual, expected);
        both_signs(bits);
    }

    void summary() const {
        std::printf("PASS binary32 checked=%llu finite_std_to_chars_checked=%llu subnormal=%llu "
                    "nonfinite=%llu negative=%llu variants=7 input_hash=%016llx\n",
                    (unsigned long long)checked, (unsigned long long)finite_nonzero,
                    (unsigned long long)subnormal, (unsigned long long)special,
                    (unsigned long long)negative, (unsigned long long)input_hash);
    }
};

void edges(Validator& validator, uint64_t subnormal_count, uint64_t decimal_count, uint64_t seed) {
    // Normal powers of two and all exponent transitions; raw==1 tests the
    // symmetric min-normal interval, which differs from later powers of two.
    for (uint32_t raw = 0; raw <= 255; ++raw) validator.around(raw << 23, 32);
    for (unsigned bit = 0; bit < 23; ++bit) validator.around(uint32_t(1) << bit, 32);
    validator.around(fraction_mask, 256);
    validator.around(infinity - 1, 256);
    for (uint64_t bits = 1; bits <= subnormal_count; ++bits) validator.both_signs(uint32_t(bits));

    for (int exp = -45; exp <= 38; ++exp) {
        char text[32];
        std::snprintf(text, sizeof(text), "1e%d", exp);
        validator.around(std::bit_cast<uint32_t>(std::strtof(text, nullptr)), 64);
    }

    // Quiet/signaling NaNs, payload bits at both ends, infinities, and signed zero.
    for (uint32_t bits : {0U, infinity, infinity + 1, infinity + 2,
                          UINT32_C(0x7fbfffff), UINT32_C(0x7fc00000),
                          UINT32_C(0x7fc00001), UINT32_C(0x7ffffffe), UINT32_C(0x7fffffff)})
        validator.both_signs(bits);

    // 0.1f is 0x3dcccccd, whose binary32 shortest decimal is 1e-1.
    // Widening to double before shortest conversion incorrectly exposes digits.
    validator.known(UINT32_C(0x3dcccccd), 1, -1);
    validator.known(1, 1, -45);
    validator.known(fraction_mask, 11754942, -45);
    validator.known(fraction_mask + 1, 11754944, -45);
    validator.known(infinity - 1, 34028235, 31);
    // Exact midpoints between equally short decimal candidates, with ties
    // resolved in both directions by the parity of the decimal coefficient.
    validator.known(UINT32_C(0x49800002), 10485762, -1); // 1048576.25
    validator.known(UINT32_C(0x49800006), 10485768, -1); // 1048576.75
    validator.known(UINT32_C(0x48800004), 26214412, -2); // 262144.125
    validator.known(UINT32_C(0x4880000c), 26214438, -2); // 262144.375
    for (uint32_t raw = 142; raw <= 151; ++raw)
        for (uint32_t fraction = 0; fraction < 1024; ++fraction)
            validator.both_signs((raw << 23) | fraction);

    uint64_t state = seed ^ UINT64_C(0x504f575245434950);
    for (uint64_t i = 0; i < decimal_count; ++i) {
        uint32_t sig = 1 + uint32_t(random_bits(state) % 999999999);
        int exp = int(random_bits(state) % 91) - 53;
        char text[48];
        std::snprintf(text, sizeof(text), "%ue%d", unsigned(sig), exp);
        auto bits = std::bit_cast<uint32_t>(std::strtof(text, nullptr));
        validator.around(bits, 1);
    }
}
} // namespace

int main(int argc, char** argv) {
    std::string mode = "all";
    uint64_t random_count = 1000000, subnormal_count = 65536, decimal_count = 10000;
    uint64_t seed = UINT64_C(0xd6e3869b504f5752);
    uint64_t exhaustive_start = 0, exhaustive_count = 0;
    for (int i = 1; i < argc; ++i) {
        std::string option = argv[i];
        if (option == "--help") {
            std::puts("Usage: binary32-test [options]\n"
                      "  --mode all|edges|random|exhaustive  (default all)\n"
                      "  --random N                        (default 1000000)\n"
                      "  --subnormals N                    (default 65536; max 8388607)\n"
                      "  --decimals N                      (default 10000)\n"
                      "  --seed INTEGER\n"
                      "  --exhaustive-start INTEGER --exhaustive-count N\n"
                      "The exhaustive mode checks an exact bounded range of raw uint32 encodings;\n"
                      "it requires an explicit count. Use [0, 0x7f800000) for positive finite values\n"
                      "and [0x80000000, 0xff800000) for negative finite values, or split into shards.\n"
                      "To check every nonzero subnormal with both signs, use:\n"
                      "  --mode edges --subnormals 8388607\n"
                      "Every finite nonzero input is compared against native std::to_chars(float, scientific).");
            return 0;
        }
        if (i + 1 == argc) fail("Missing value after " + option);
        const char* value = argv[++i];
        if (option == "--mode") mode = value;
        else if (option == "--random") random_count = number(value);
        else if (option == "--subnormals") subnormal_count = number(value);
        else if (option == "--decimals") decimal_count = number(value);
        else if (option == "--seed") seed = number(value);
        else if (option == "--exhaustive-start") exhaustive_start = number(value);
        else if (option == "--exhaustive-count") exhaustive_count = number(value);
        else fail("Unknown option: " + option);
    }
    if (mode != "all" && mode != "edges" && mode != "random" && mode != "exhaustive")
        fail("Unknown mode: " + mode);
    if (subnormal_count > fraction_mask) fail("--subnormals exceeds the positive subnormal encodings");
    if (exhaustive_start > UINT32_MAX || exhaustive_count > (UINT64_C(1) << 32) - exhaustive_start)
        fail("Exhaustive range exceeds uint32 encodings");
    if (mode == "exhaustive" && !exhaustive_count) fail("Exhaustive mode requires a nonzero explicit count");
    if (mode != "exhaustive" && (exhaustive_start || exhaustive_count))
        fail("Exhaustive range options require --mode exhaustive");

    std::printf("binary32 mode=%s seed=0x%llx random=%llu subnormals=%llu decimals=%llu "
                "exhaustive_start=0x%llx exhaustive_count=%llu compiler=%s\n",
                mode.c_str(), (unsigned long long)seed, (unsigned long long)random_count,
                (unsigned long long)subnormal_count, (unsigned long long)decimal_count,
                (unsigned long long)exhaustive_start, (unsigned long long)exhaustive_count, __VERSION__);
    std::fflush(stdout);
    Validator validator;
    if (mode == "all" || mode == "edges") edges(validator, subnormal_count, decimal_count, seed);
    if (mode == "all" || mode == "random") {
        uint64_t state = seed;
        for (uint64_t i = 0; i < random_count; ++i) validator.check(uint32_t(random_bits(state)));
    }
    if (mode == "exhaustive")
        for (uint64_t i = 0; i < exhaustive_count; ++i) validator.check(uint32_t(exhaustive_start + i));
    validator.summary();
}

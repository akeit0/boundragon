// Targeted checks for canonical shortcuts; no upstream constexpr-table build.
#include "boundragon/boundragon.h"
#include <array>
#include <charconv>
#include <cstdio>
#include <cstdlib>
#include <string_view>

using boundragon::Decimal;
using boundragon::Cache;
using namespace boundragon::detail;

Decimal independent(uint64_t bits) {
    unsigned raw = unsigned(bits >> 52) & 2047;
    uint64_t m = bits & ((uint64_t(1) << 52) - 1);
    bool sign = bool(bits >> 63);
    if (raw == 2047) return {m, 10000, sign};
    if (raw == 0 && m == 0) return {0, 0, sign};
    char text[64];
    auto result = std::to_chars(text, text + sizeof(text), std::bit_cast<double>(bits),
                                std::chars_format::scientific);
    if (result.ec != std::errc()) std::abort();
    const char* p = text + sign;
    uint64_t sig = 0;
    int digits = 0;
    while (p != result.ptr && *p != 'e') {
        if (*p != '.') { sig = sig * 10 + unsigned(*p - '0'); ++digits; }
        ++p;
    }
    ++p;
    bool minus = *p == '-';
    if (*p == '-' || *p == '+') ++p;
    int exp = 0;
    while (p != result.ptr) exp = exp * 10 + unsigned(*p++ - '0');
    return canonical({sig, (minus ? -exp : exp) - digits + 1, sign});
}

uint64_t state = 0xd6e3869b504f5752ULL;
uint64_t random_bits() {
    uint64_t x = (state += 0x9e3779b97f4a7c15ULL);
    x = (x ^ (x >> 30)) * 0xbf58476d1ce4e5b9ULL;
    x = (x ^ (x >> 27)) * 0x94d049bb133111ebULL;
    return x ^ (x >> 31);
}

uint64_t checked = 0;
void check(uint64_t bits) {
    double x = std::bit_cast<double>(bits);
    Decimal expected = independent(bits);
    std::array results = {
        boundragon::to_decimal<Cache::Fast>(x),
        boundragon::to_decimal<Cache::Balanced>(x),
        boundragon::to_decimal<Cache::Fast,true>(x),
        boundragon::to_decimal<Cache::Balanced,true>(x),
        boundragon::to_decimal<Cache::Fast,false,false>(x),
        boundragon::to_decimal<Cache::Balanced,false,false>(x),
        boundragon::to_decimal<Cache::Fast,true,false>(x),
        boundragon::to_decimal<Cache::Balanced,true,false>(x),
        boundragon::to_decimal<Cache::Half>(x),
        boundragon::to_decimal<Cache::Tiny>(x),
        boundragon::to_decimal<Cache::Minimal>(x),
        boundragon::to_decimal<Cache::Half,false,false>(x),
        boundragon::to_decimal<Cache::Tiny,false,false>(x),
        boundragon::to_decimal<Cache::Minimal,false,false>(x),
        canonical(boundragon::components_raw<Cache::Balanced>(bits)),
        canonical(exact_components(bits)),
        (((bits >> 52) & 2047) != 0 && ((bits >> 52) & 2047) != 2047 &&
         (bits & ((uint64_t(1) << 52) - 1)) == 0)
            ? canonical_power_of_two(unsigned(bits >> 52) & 2047, bool(bits >> 63))
            : expected
    };
    for (unsigned i = 0; i < results.size(); ++i) {
        if (!equal(results[i], expected)) {
            std::fprintf(stderr, "mismatch bits=%016llx variant=%u got=%llue%d expected=%llue%d\n",
                         (unsigned long long)bits, i, (unsigned long long)results[i].sig,
                         results[i].exp, (unsigned long long)expected.sig, expected.exp);
            std::exit(1);
        }
    }
    ++checked;
}

void signed_check(uint64_t magnitude) {
    check(magnitude);
    check(magnitude | (uint64_t(1) << 63));
}

int main(int argc, char** argv) {
    if (argc > 1 && std::string_view(argv[1]) == "--cli") {
        unsigned long long input;
        while (std::scanf("%llx", &input) == 1) {
            uint64_t bits = uint64_t(input);
            check(bits);
            auto d = boundragon::to_decimal<Cache::Balanced,false,true>(std::bit_cast<double>(bits));
            std::printf("%016llx %llu %d %d\n", input, (unsigned long long)d.sig,
                        d.exp, int(d.negative));
        }
        return std::ferror(stdin) ? 1 : 0;
    }
    uint64_t random_count = argc > 1 ? std::strtoull(argv[1], nullptr, 0) : 1000000;
    constexpr uint64_t fraction_mask = (uint64_t(1) << 52) - 1;
    for (unsigned raw = 0; raw < 2048; ++raw)
        for (uint64_t fraction : {uint64_t(0), uint64_t(1), uint64_t(2),
                                 fraction_mask / 2, fraction_mask - 1, fraction_mask})
            signed_check((uint64_t(raw) << 52) | fraction);
    // Both sides of every power-of-two boundary, including subnormal powers.
    for (unsigned raw = 1; raw <= 2046; ++raw)
        for (int delta : {-1, 0, 1}) signed_check((uint64_t(raw) << 52) + delta);
    for (unsigned bit = 0; bit < 52; ++bit)
        for (int delta : {-1, 0, 1}) signed_check((uint64_t(1) << bit) + delta);
    for (uint64_t m = 1; m <= 65536; ++m) signed_check(m);
    // Exact integers plus adjacent nonintegers cover every shortcut shift.
    for (unsigned raw = 1023; raw <= 1075; ++raw) {
        unsigned shift = 1075 - raw;
        for (unsigned j = 0; j < 256; ++j) {
            uint64_t fraction = random_bits() & fraction_mask;
            fraction &= ~((uint64_t(1) << shift) - 1);
            uint64_t bits = (uint64_t(raw) << 52) | fraction;
            for (int delta : {-1, 0, 1}) signed_check(bits + delta);
        }
    }
    for (uint64_t integer = 1; integer <= 65536; ++integer)
        signed_check(std::bit_cast<uint64_t>(double(integer)));
    for (uint64_t integer : {uint64_t(999999999999999), uint64_t(1000000000000000),
                            uint64_t(9007199254740991), uint64_t(9007199254740992)})
        for (int delta : {-1, 0, 1})
            signed_check(std::bit_cast<uint64_t>(double(integer)) + delta);
    for (uint64_t i = 0; i < random_count; ++i) check(random_bits());
    // Force fallback-heavy sampling as well as uniform raw encodings.
    for (uint64_t i = 0; i < random_count / 4; ++i)
        signed_check(1 + (random_bits() & fraction_mask));
    std::printf("PASS canonical conversion: %llu inputs, seventeen variants against std::to_chars\n",
                (unsigned long long)checked);
}

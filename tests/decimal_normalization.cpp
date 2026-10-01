// SPDX-License-Identifier: Unlicense
// Check modular normalization against independent decimal division, including
// all possible zero counts and the largest divisible uint64_t coefficients.
#include <boundragon/detail/canonical_decimal.h>
#include <array>
#include <cstdio>
#include <cstdlib>

using namespace boundragon::detail;

uint64_t checked = 0;
void check(uint64_t coefficient) {
    if (coefficient == 0) return; // normalize_finite's documented precondition.
    uint64_t expected = coefficient;
    int zeros = 0;
    while (expected % 10 == 0) { expected /= 10; ++zeros; }
    for (bool sign : {false, true}) {
        int exponent = sign ? -324 : 308;
        Decimal result = normalize_finite(coefficient, exponent, sign);
        if (result.sig != expected || result.exp != exponent + zeros || result.negative != sign) {
            std::fprintf(stderr, "normalization failure coefficient=%llu sign=%d\n",
                         (unsigned long long)coefficient, int(sign));
            std::exit(1);
        }
        ++checked;
        if (coefficient < UINT64_C(100000000000000000)) {
            Decimal bounded = normalize_finite_short(coefficient, exponent, sign);
            if (bounded.sig != expected || bounded.exp != exponent + zeros || bounded.negative != sign) {
                std::fprintf(stderr, "bounded normalization failure coefficient=%llu sign=%d\n",
                             (unsigned long long)coefficient, int(sign));
                std::exit(1);
            }
            ++checked;
        }
    }
}

int main() {
    std::array<uint64_t, 20> powers{};
    powers[0] = 1;
    for (unsigned k = 1; k < powers.size(); ++k) powers[k] = powers[k - 1] * 10;
    constexpr uint64_t maximum = UINT64_MAX;
    for (uint64_t power : powers) {
        uint64_t limit = maximum / power;
        for (uint64_t prefix = 1; prefix <= 10000 && prefix <= limit; ++prefix) {
            uint64_t value = prefix * power;
            check(value); check(value - 1);
            if (value != maximum) check(value + 1);
        }
        for (uint64_t prefix : {limit - 1, limit}) {
            uint64_t value = prefix * power;
            check(value); check(value - 1);
            if (value != maximum) check(value + 1);
        }
    }
    uint64_t state = UINT64_C(0x7012a575932940);
    for (unsigned i = 0; i < 1000000; ++i) {
        state ^= state << 13; state ^= state >> 7; state ^= state << 17;
        check(state);
        uint64_t power = powers[i % powers.size()];
        uint64_t value = (1 + state % (maximum / power)) * power;
        check(value); check(value - 1);
        if (value != maximum) check(value + 1);
    }
    std::printf("PASS decimal normalization: %llu signed coefficient checks\n",
                (unsigned long long)checked);
}

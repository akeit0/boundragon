// Actual maintained tables, exponent helpers and exact fallback outputs.
#include "boundragon/detail/decimal_core.h"
#include <cstdio>

int main() {
    using namespace boundragon::detail;
    std::printf("meta %d %d\n", pow_min, pow_max);
    for (int p=pow_min; p<=pow_max; ++p) {
        Words literal=full_powers[p-pow_min], rebuilt=compact_power(p);
        std::printf("power %d %016llx %016llx %016llx %016llx %016llx\n", p,
            (unsigned long long)literal.hi, (unsigned long long)literal.lo,
            (unsigned long long)high_powers[p-pow_min],
            (unsigned long long)rebuilt.hi, (unsigned long long)rebuilt.lo);
    }
    for (unsigned raw=1; raw<2047; ++raw) {
        int q=int(raw)-1075, k=dec_exp(q), ki=dec_exp(q,false);
        std::printf("exponent %u %d %d %d %u %d\n", raw,k,ki,
            exp_shift(q,k+1)+9, unsigned(exp_shifts[raw]), exp_shift(q,ki+1)+9);
        Decimal exact=canonical(compact_slow(uint64_t(raw)<<52));
        std::printf("irregular %u %llu %d\n",raw,
            (unsigned long long)exact.sig,exact.exp);
    }
    for (uint64_t m=1; m<=10; ++m) {
        Decimal exact=canonical(compact_slow(m));
        std::printf("small %llu %llu %d\n", (unsigned long long)m,
            (unsigned long long)exact.sig,exact.exp);
    }
}

// SPDX-License-Identifier: Unlicense
// Compile twice with different boundragon namespaces to prevent COMDAT merging.
#include "revision_api.h"
#ifndef REVISION_HEADER
#define REVISION_HEADER <boundragon/boundragon.h>
#endif
#include REVISION_HEADER
#include <cstdlib>

namespace {
template<unsigned policy>
boundragon::Decimal convert(uint64_t bits) {
    if constexpr (policy < 5)
        return boundragon::to_decimal<static_cast<boundragon::Cache>(policy)>(std::bit_cast<double>(bits));
    else if constexpr (policy == 5)
        return boundragon::to_decimal(std::bit_cast<float>(uint32_t(bits)));
    else
        return boundragon::to_decimal<boundragon::FloatPolicy::Compact>(std::bit_cast<float>(uint32_t(bits)));
}

template<unsigned policy>
uint64_t batch(const uint64_t* bits, size_t n, unsigned repeats) {
    uint64_t checksum = 0;
    for (unsigned r = 0; r < repeats; ++r)
        for (size_t i = 0; i < n; ++i) {
            auto d = convert<policy>(bits[i]);
            checksum += d.sig ^ (uint64_t(uint32_t(d.exp)) << 32) ^ uint64_t(d.negative);
        }
    return checksum;
}
} // namespace

extern "C" RevisionDecimal REVISION_CONVERT(unsigned policy, uint64_t bits) {
    boundragon::Decimal d;
    switch (policy) {
#define CASE(P) case P: d = convert<P>(bits); break;
        CASE(0) CASE(1) CASE(2) CASE(3) CASE(4) CASE(5) CASE(6)
#undef CASE
        default: std::abort();
    }
    return {d.sig, d.exp, d.negative};
}

extern "C" uint64_t REVISION_BATCH(unsigned policy, const uint64_t* bits, size_t n, unsigned repeats) {
    switch (policy) {
#define CASE(P) case P: return batch<P>(bits, n, repeats);
        CASE(0) CASE(1) CASE(2) CASE(3) CASE(4) CASE(5) CASE(6)
#undef CASE
        default: std::abort();
    }
}

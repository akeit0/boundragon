// Public upstream API and boundragon numeric components under the same harness.
#pragma once
#include "boundragon/boundragon.h"
#include "deps/zmij/zmij.h"
#include "deps/dragonbox/dragonbox.h"
#include <cstring>

namespace boundragon::detail {
template<bool normalize_nonfinite = true>
BOUNDRAGON_FORCEINLINE Decimal upstream_components(uint64_t bits) {
    auto d = zmij::to_decimal(std::bit_cast<double>(bits));
    // Validation normalizes only the sentinel. Timed corpora are finite and
    // call the public API without even this extra comparison in the loop.
    if constexpr (normalize_nonfinite)
        return {d.sig, d.exp == zmij::nonfinite_exp ? 10000 : d.exp, d.negative};
    else
        return {d.sig, d.exp, d.negative};
}
template<bool compact = false>
BOUNDRAGON_FORCEINLINE Decimal dragonbox_components(uint64_t bits) {
    unsigned raw = unsigned(bits >> 52) & 2047;
    uint64_t fraction = bits & ((uint64_t(1) << 52) - 1);
    bool negative = bits >> 63;
    if (raw == 2047) return {fraction, 10000, negative};
    if ((bits << 1) == 0) return {0, 0, negative};
    if constexpr (compact) {
        auto d = jkj::dragonbox::to_decimal(std::bit_cast<double>(bits),
            jkj::dragonbox::policy::cache::compact, jkj::dragonbox::policy::trailing_zero::remove);
        return {d.significand, d.exponent, d.is_negative};
    } else {
        auto d = jkj::dragonbox::to_decimal(std::bit_cast<double>(bits),
            jkj::dragonbox::policy::cache::full, jkj::dragonbox::policy::trailing_zero::remove);
        return {d.significand, d.exponent, d.is_negative};
    }
}
// Canonical reference adapter: remove up to 16 zeroes in groups, rather than
// one serial divide per zero. This does not modify the upstream implementation.
BOUNDRAGON_FORCEINLINE Decimal grouped_canonical(Decimal d) {
    if (d.sig == 0 || d.exp == 10000) return d;
    uint64_t q = d.sig / 100000000;
    if (q * 100000000 == d.sig) {
        d.sig = q; d.exp += 8;
        q = d.sig / 100000000;
        if (q * 100000000 == d.sig) { d.sig = q; d.exp += 8; }
    }
    q = d.sig / 10000;
    if (q * 10000 == d.sig) { d.sig = q; d.exp += 4; }
    q = d.sig / 100;
    if (q * 100 == d.sig) { d.sig = q; d.exp += 2; }
    q = d.sig / 10;
    if (q * 10 == d.sig) { d.sig = q; ++d.exp; }
    return d;
}
}

// Public cache policies and unmodified upstream; IDs remain stable for saved evidence.
#define COMPARISON_METHODS(X) \
 X(34, "boundragon", (boundragon::to_decimal(std::bit_cast<double>(bits))), (boundragon::to_decimal(std::bit_cast<double>(bits)))) \
 X(35, "zmij", (boundragon::detail::canonical(boundragon::detail::upstream_components<false>(bits))), (boundragon::detail::canonical(boundragon::detail::upstream_components(bits)))) \
 X(39, "boundragon-minimal", (boundragon::to_decimal<boundragon::Cache::Minimal>(std::bit_cast<double>(bits))), (boundragon::to_decimal<boundragon::Cache::Minimal>(std::bit_cast<double>(bits)))) \
 X(43, "dragonbox", (boundragon::detail::dragonbox_components(bits)), (boundragon::detail::dragonbox_components(bits))) \
 X(44, "zmij-grouped", (boundragon::detail::grouped_canonical(boundragon::detail::upstream_components<false>(bits))), (boundragon::detail::grouped_canonical(boundragon::detail::upstream_components(bits)))) \
 X(47, "dragonbox-compact", (boundragon::detail::dragonbox_components<true>(bits)), (boundragon::detail::dragonbox_components<true>(bits)))

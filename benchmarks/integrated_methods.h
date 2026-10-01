// SPDX-License-Identifier: Unlicense AND MIT
#pragma once
#include "integrated_writer.h"
#include "generated/zmij_emitter.h"
#include "generated/xjb_emitter.h"
char* native_xjb(char*, double);
char* native_xjb_compact(char*, double);
namespace integrated_methods {
template<unsigned method> inline char* write(char* buffer, double value) {
    if constexpr (method == 2) return zmij::write(buffer, 64, value);
    else if constexpr (method == 3) return native_xjb(buffer, value);
    else if constexpr (method == 4) return native_xjb_compact(buffer, value);
    else {
        constexpr auto cache = method >= 5 ? boundragon::Cache::Fast : boundragon::Cache::Balanced;
        auto d = boundragon_bench::convert_for_writer<cache>(std::bit_cast<uint64_t>(value));
        if constexpr (method == 0 || method == 5) return zmij_emitter::emit_digits(buffer, d);
        else return xjb_emitter::emit_digits64(buffer, d);
    }
}
}

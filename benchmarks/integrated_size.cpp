// SPDX-License-Identifier: Unlicense
#include "integrated_methods.h"
#include <bit>
#include <cstdio>
#include <cstdlib>

int main(int argc, char** argv) {
    if (argc != 2) return 1;
    auto bits = std::strtoull(argv[1], nullptr, 0);
    char buffer[64]{};
    auto value = std::bit_cast<double>(uint64_t(bits));
#if INTEGRATED_METHOD < 0
    // Same runtime input, buffer and output observer without a writer.
    buffer[0] = char(bits);
    char* end = buffer + 1;
    (void)value;
#else
    char* end = integrated_methods::write<INTEGRATED_METHOD>(buffer, value);
#endif
    std::printf("%td %u\n", end - buffer, unsigned(uint8_t(buffer[0])));
}

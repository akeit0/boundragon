// SPDX-License-Identifier: Unlicense
#pragma once
#include <cstddef>
#include <cstdint>
struct RevisionDecimal { uint64_t sig; int exp; bool negative; };
using RevisionConvert = RevisionDecimal (*)(unsigned, uint64_t);
using RevisionBatch = uint64_t (*)(unsigned, const uint64_t*, size_t, unsigned);
extern "C" RevisionDecimal revision_before(unsigned, uint64_t);
extern "C" RevisionDecimal revision_after(unsigned, uint64_t);
extern "C" uint64_t batch_before(unsigned, const uint64_t*, size_t, unsigned);
extern "C" uint64_t batch_after(unsigned, const uint64_t*, size_t, unsigned);

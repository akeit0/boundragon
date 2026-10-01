# Validation and reproduction

Configure a release build with Python 3 available, then run CTest:

```sh
cmake -S . -B build/release -DCMAKE_BUILD_TYPE=Release
cmake --build build/release -j
ctest --test-dir build/release --output-on-failure
```

The core suite has 16 checks when Python is found. It covers the public API and
standalone float header, binary32 and binary64 conversion, decimal normalization,
compiled mathematical certificates, independently constructed rational
intervals, table generation and canonical-path bounds.

With Node.js and generated browser assets, five additional checks validate
the cache exports, bilingual content and both C++/JavaScript translations:

```sh
npm ci
npm run build:docs
cmake -S . -B build/release -DCMAKE_BUILD_TYPE=Release -DBOUNDRAGON_BUILD_EXPLORER_TESTS=ON
```

All 21 checks pass for the renamed Boundragon tree with WSL GCC 11.4.
The numeric implementation was previously checked with Windows GCC 15.2 and
Clang 18.1.8. Browser tests are optional for C++ consumers and required in the
Pages workflow.

## What the checks establish

| Layer | Scope |
| --- | --- |
| Binary64 fallback certificate | Exact floor-sum and congruence checks over exponent/parity classes; independent rational checks for exceptional inputs |
| Binary32 fallback certificate | Exact scaling and rounding formulas over significand ranges, including powers of two and small subnormals |
| Binary32 Fast certificate | Compiled table floors, Q40 product bounds, acceptance guards, power results and source correspondence |
| Independent rational oracles | Construct intervals and search shortest digit counts independently of cache/filter formulas |
| C++ conversion tests | Compare all public policies and helpers with scientific `std::to_chars` on structured and random inputs |
| Generator and normalization checks | Recompute literal tables, reconstruction bounds, modular inverses and thresholds |

The certificates use exact integer and rational arithmetic. They check
mathematical formulas and emitted constants; they assume the documented
source correspondence, C++ arithmetic semantics and correct compiler
translation. Sampled compiled tests exercise that implementation bridge.
See [the proof and its limits](proof.md#8-reproduction-and-remaining-limits).

## Optional Lean proofs

The [Lean project](../proof/lean/README.md) has a pinned toolchain and mathlib
dependency. With `elan` installed, run:

```sh
cd proof/lean
lake build
lake env leanchecker Boundragon
```

The first build may fetch dependencies; the project README describes how to
download their precompiled cache. The build checks the centered binary64 guard
proofs, reference normalization, both accepted branches' canonical shortestness
and unique closest selection under the documented contracts, and the ordered
floor-sum certificate principle. It also checks product/remainder identities,
cache-scaling bounds, nearest/even rounding-policy implications, and concrete
witnesses for the accepted model. The axiom audit covers public and private
declarations; CI tests rejection of unfinished proofs and custom dependencies.
The checker rechecks the compiled proof
environment. This is separate from CTest; complete-converter correctness,
including small-subnormal exceptions, fallback, concrete cache contracts, and
C++ source correspondence, remains unfinished.

## Read-only table checks

```sh
python3 tools/generate_decimal_tables.py --check
python3 tools/generate_compact_cache.py --check
python3 tools/generate_binary32_cache.py --check
python3 tools/generate_binary32_fast_cache.py --check
```

Omit `--check` only when deliberately regenerating the corresponding headers.

## Optional exhaustive binary32 cross-check

```sh
g++ -std=c++20 -O3 -Iinclude proof/binary32_exhaustive.cpp -o build/binary32-exhaustive
./build/binary32-exhaustive
```

This enumerates all 2,139,095,039 positive finite nonzero binary32 encodings
and compares conversion paths with the certified exact fallback. It is separate
from the routine CTest suite and can take substantially longer. The paths share
a fallback, so this is not an exhaustive independent rational-oracle check.

A performance comparison should match source format, rounding and canonicalization work,
compiler settings, and input distribution; Dragonbox and zmij are relevant
references for that comparison.

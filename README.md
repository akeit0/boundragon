# Boundragon

Shortest decimal conversion with bounded-error guards.

**[Interactive explorer and documentation →](https://akeit0.github.io/boundragon/)**

Boundragon is an experimental, header-only C++20 library for IEEE 754 binary32
and binary64. It returns the closest shortest decimal as an integer coefficient,
decimal exponent, and sign, with ties to even. The default paths are **binary32
Fast** and **binary64 Balanced**.

Requires a C++20 compiler with GCC/Clang `__uint128_t` support. No runtime library
or downloaded dependency is needed to use the headers.

## Quick start

Add `include/` to your compiler's include path:

```cpp
#include <boundragon/boundragon.h>

int main() {
    auto d = boundragon::to_decimal(1.234);
    // d.sig == 1234, d.exp == -3, d.negative == false

    auto f = boundragon::to_decimal(0.1f);
    // f.sig == 1, f.exp == -1
}
```

The result represents `(-1)^negative * sig * 10^exp`. Finite, nonzero
coefficients have no trailing decimal zeroes; signed zero is preserved.
Shortestness refers to round-to-nearest, ties-to-even parsing in the **original
source format**. The library returns numeric components; callers supply text
formatting. Infinity has `exp == 10000` and `sig == 0`; NaNs use that exponent
with their nonzero fraction payload in `sig`.

For float-only programs, use `<boundragon/float.h>`; it uses at most `uint64_t`
and includes no binary64 caches. The combined header still requires the compiler
support described above.

With CMake, embed this checkout with `add_subdirectory(boundragon)` and link
`boundragon::boundragon`. Installed consumers can use
`find_package(boundragon CONFIG REQUIRED)`.

## Algorithm and policies

Boundragon computes an approximation and bounds the omitted information.
Centered guards accept a decimal when that error cannot change the choice;
uncertain cases use a complete integer converter. Its contributions are
centered acceptance guards, explicit cache-error contracts, and precision
allocation tailored to each format.

The main Boundragon algorithm was invented by **GPT-6 Astra and GPT-6.1 Sol**.
This credits the centered decision guards and their error-bound design described
here.

The coarse/fine decimal grids are prior art. Decimal scaling and exact finishing
are credited to xjb and zmij. See the [algorithm](docs/algorithm.md),
[binary64 proof](docs/proof.md), and [binary32 Fast bounds](docs/binary32_fast.md).

The default numeric cache payloads are 3,676 bytes for binary32 Fast and 5,536
bytes for binary64 Balanced, excluding code and alignment. Smaller policies
trade speed for space: [binary32 Compact](docs/binary32_implementation.md) and
[binary64 cache/shortcut options](docs/canonical_paths.md).

## Recorded performance

Intel Core i7-13700F, WSL2 x86-64, GCC 11.4.0, `-O3 -march=native -flto`;
recorded 2026-10-01, with two seeds and eleven trials per seed. Times below are
median thread CPU **ns/value**; lower is better. Linked bytes are
control-subtracted `.text + .rodata` after LTO and section GC, including
alignment and excluding the harness. **Bold marks the lowest value in each
table column**, including ties. These are measured workload comparisons,
not a universal speed claim.

### Pure canonical conversion

Every implementation returns the same contract: coefficient without trailing
decimal zeroes, exponent, and sign. Conversion and normalization are timed;
parsing and text formatting are excluded.

**binary32 — Fast prioritizes conversion speed.** It uses less time than
Dragonbox full on all eight recorded corpora, with a larger linked footprint.

| Implementation | Random finite bits | 1–6 decimal digits | Mixed 1–9 digits | Simple values | Linked bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Boundragon Fast | **5.814** | **3.970** | **4.511** | **3.812** | 4,749 |
| Dragonbox full | 8.648 | 5.265 | 6.589 | 5.526 | **1,510** |

**binary64 — Balanced combines competitive speed with a moderate footprint.**
On random finite bits it takes 19.3% less CPU time than Dragonbox full in the
paired trials, with 30.0% fewer linked bytes. It also leads on the recorded hot
random pool and 16/17-digit corpora. Dragonbox full uses less time on short and
mixed decimals and simple values; Dragonbox compact uses much less space.

| Implementation | Random finite bits | 1–6 decimal digits | Mixed 1–17 digits | Simple values | Linked bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Boundragon Balanced | **6.813** | 7.182 | 7.049 | 8.058 | 7,793 |
| Dragonbox full | 8.408 | **6.400** | **6.740** | **6.487** | 11,135 |
| Dragonbox compact | 11.451 | 9.606 | 9.943 | 9.241 | **1,990** |

[Full canonical results](benchmarks/results/2026-10-01/canonical/REPORT.md)
include all corpora, smaller Boundragon policies, and paired confidence intervals.
The primary tables above compare implementations that provide canonical output
directly. The full report also retains **zmij + normalization adapter** results:
zmij's public coefficient can contain trailing zeroes, so our adapter removes
them numerically. The adapted canonical operation can take longer than native
zmij's integrated writer, which trims zeroes while producing text. Those timings
do not establish a speed advantage over native zmij; its writer is compared below.

### Stringification: integrated binary64 writers

These timings include conversion and final ASCII in a caller-owned buffer.
Boundragon's rounding kernel feeds the upstream digit-writing tail directly;
native writers remain unmodified. All entries are integrated writers.

| Writer | Random finite bits | Simple values | Exact integers | Subnormals | Linked bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Boundragon Balanced + xjb tail | 11.06 | **10.52** | 8.06 | 14.05 | 14,664 |
| Native xjb | **9.14** | 10.93 | 9.19 | **9.09** | 19,704 |
| Native compact xjb | 22.61 | 13.91 | 15.96 | 15.72 | **2,164** |
| Boundragon Balanced + zmij tail | 10.92 | **10.52** | **7.65** | 13.93 | 18,104 |
| Native zmij | 10.25 | 11.15 | 9.90 | 10.28 | 24,168 |

**Balanced + xjb tail is the speed/size compromise:** 25.6% fewer linked bytes
than native xjb, at 22.6% more CPU time on random bits in the paired trials.
It takes less time on simple values and exact integers, but 54.1% more on
subnormals. Compact xjb is much smaller and takes more time on every recorded
corpus. The Boundragon writers are experimental benchmark implementations;
the public headers currently expose numeric components only.

[Full integrated-writer results](benchmarks/results/2026-10-01/integrated-writers/REPORT.md)
include all eight corpora, paired intervals, and output validation. Percentage
time comparisons use the reports' paired trial ratios, which can differ from
ratios of the displayed medians. Results depend on the input distribution,
compiler, and machine.

[Benchmark methodology](docs/benchmarks.md) describes the harnesses and
reproduction commands. The repository keeps the recorded summaries rather
than raw development logs or measurement archives.

## Build and verification

```sh
cmake -S . -B build/release -DCMAKE_BUILD_TYPE=Release
cmake --build build/release -j
ctest --test-dir build/release --output-on-failure
cmake --install build/release --prefix build/install
```

Tests and examples default to off when embedded with `add_subdirectory`.
Python 3 enables the mathematical certificates, independent rational oracles,
and table-generation checks. The C++ checks run without Python.
[Validation instructions](docs/validation.md) describe the evidence and optional
exhaustive binary32 checks.

A [Lean proof project](proof/lean/README.md) formally verifies the centered
binary64 filter's decision safety under explicit cache/interval contracts.
Accepted fine results additionally have canonical shortestness and unique
closest selection proved for significands `m >= 11`, at any decimal scale.
The ordered floor-sum certificate principle is also proved. This remains a
partial formalization: coarse-result shortestness, fallback correctness,
concrete cache contracts, and C++ source correspondence are unfinished.

## Interactive documentation

The English/Japanese explorer follows each format's native conversion path,
with equations, decimal grids, evaluated decisions, and compact measured ratios.
**[Open the explorer](https://akeit0.github.io/boundragon/)** to try a value or
follow a preset. [The explorer guide](docs/explorer.md) covers local previews
and site maintenance for contributors.

## License

Original code, tests, tools, and documentation use [the Unlicense](LICENSE).
Inherited zmij portions retain their MIT attribution; [NOTICE.md](NOTICE.md)
describes those portions and benchmark dependency licenses.

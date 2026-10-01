# Boundragon

Shortest decimal conversion with bounded-error guards.

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

The coarse/fine decimal grids are prior art. Decimal scaling and exact finishing
are credited to xjb and zmij. See the [algorithm](docs/algorithm.md),
[binary64 proof](docs/proof.md), and [binary32 Fast bounds](docs/binary32_fast.md).

The default numeric cache payloads are 3,676 bytes for binary32 Fast and 5,536
bytes for binary64 Balanced, excluding code and alignment. Smaller policies
trade speed for space: [binary32 Compact](docs/binary32_implementation.md) and
[binary64 cache/shortcut options](docs/canonical_paths.md).

## Recorded performance

Intel Core i7-13700F, WSL2 x86-64, GCC 11.4.0, `-O3 -march=native -flto`;
recorded 2026-10-01. This table covers random finite-bit inputs. Time includes
canonical conversion and normalization, excluding parsing and formatting.
Linked footprint is control-subtracted `.text + .rodata` after LTO and section
GC, including alignment; it is separate from numeric cache payload.

| Source format | Default policy | Median ns/value | Linked bytes |
| --- | --- | ---: | ---: |
| binary32 | Fast | 5.814 | 4,749 |
| binary64 | Balanced | 6.813 | 7,793 |

Binary32 Fast leads the compared Dragonbox and zmij adapters in the recorded
pools. Binary64 Balanced leads on random bits; Dragonbox full leads on short
and mixed decimals and simple values. Results depend on the input distribution,
compiler, and machine. [Full canonical comparisons](benchmarks/results/2026-10-01/canonical/REPORT.md)
include competitors, all corpora, paired intervals, and size measurements.

[Stringification benchmarks](benchmarks/results/2026-10-01/integrated-writers/REPORT.md)
compare **integrated writers only**, including conversion and final ASCII.
The Balanced/xjb-tail writer trades speed for a smaller linked footprint on
random binary64 inputs: 11.06 ns/value and 14,664 bytes, compared with native
xjb's 9.14 ns/value and 19,704 bytes. These writers are benchmark-only; they
are not a public string API.

The repository keeps [benchmark summaries](benchmarks/results/README.md),
not raw development logs or measurement archives. [Benchmark reproduction](docs/benchmarks.md)
documents fresh runs with source hashes and raw data saved under ignored build
directories.

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

## Interactive documentation

The English/Japanese explorer follows each format's native conversion path,
with equations, decimal grids, evaluated decisions, and compact measured ratios.
Its [HTML source](docs/index.html) needs the generated assets below; preview
instructions are in [the explorer guide](docs/explorer.md).

With Node.js, npm, and Python 3:

```sh
npm ci
npm run build:site
npm run check:docs
npm run check:publication
python3 -m http.server 8765 --directory dist/site --bind 127.0.0.1
```

Open `http://127.0.0.1:8765/`. For native browser-translation checks, configure
CMake after building the docs, with `-DBOUNDRAGON_BUILD_EXPLORER_TESTS=ON`.

GitHub Actions builds and tests the site on pull requests and publishes from
`main`. Select **GitHub Actions** as the repository's Pages source. Generated
browser assets, dependencies, and `dist/` are ignored; only maintained sources
and compact measurement records are committed.

## License

Original code, tests, tools, and documentation use [the Unlicense](LICENSE).
Inherited zmij portions retain their MIT attribution; [NOTICE.md](NOTICE.md)
describes those portions and benchmark dependency licenses.

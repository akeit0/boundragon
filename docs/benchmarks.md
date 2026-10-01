# Canonical conversion and integrated writer benchmarks

The [current canonical comparison](../benchmarks/results/2026-10-01/canonical/REPORT.md) measures
canonical numeric components: coefficient without trailing decimal zeroes,
decimal exponent and sign. Each method includes its normalization cost. Parsing,
corpus construction and ASCII formatting are outside the timed operation.
Binary32 and binary64 are measured in their native source formats.

## Recorded configuration

The current canonical results use an Intel Core i7-13700F, Linux x86-64 under WSL2,
GCC 11.4.0, and logical CPU 0. The common flags are
`-std=c++20 -O3 -DNDEBUG -march=native -flto -ffunction-sections -fdata-sections`.
Size links also use `-Wl,--gc-sections`.

Each corpus has two input seeds and eleven shuffled trial blocks per seed.
Routine pools contain 65,536 inputs, with 32 repetitions per block. The hot
binary64 pool repeats 256 values with proportionally more passes. Requested
binary64 precision pools contain 100,000 values per digit count from 1 through
17, plus their shuffled mixture; these use four repetitions.

Timing tables show pooled median thread CPU ns/value. Paired ratios compare
Boundragon and each competitor within the same seed/corpus/trial block. Their
95% bootstrap intervals use 10,000 resamples with a fixed seed. CPU affinity,
input hashes, conversion counts and checksums are checked before rendering.
These intervals describe trial variation on this machine. Frequency was not
controlled, and WSL results do not establish performance on other environments.

The current canonical harness measures six entries directly in each format.
The public repository retains [measured summaries](../benchmarks/results/README.md),
with current display names. It does not bundle raw measurement archives or
development history. Fresh runs record current source hashes and raw data.

## Compared work

- Boundragon uses Fast by default for binary32 and Balanced for binary64.
  Compact/Integers and Minimal expose the space/dispatch alternatives.
- Dragonbox removes trailing decimal zeroes using its public policy. Binary64
  includes full and compact cache policies; binary32 uses its full float cache.
- zmij uses its public `to_decimal` API. Serial and grouped zero removal are
  timed separately to produce the same canonical output contract. Both are
  benchmark adapters; the pinned upstream source is unchanged.
- xjb is writer-only in this study. No formatting-and-parsing adapter appears
  in the canonical comparison.

The pinned references are:

- [Dragonbox in dtoa-benchmark, `5c3e325`](https://github.com/fmtlib/dtoa-benchmark/tree/5c3e325f9b100d4207fbee105fbd704588dcd87e/src/dragonbox).
- [zmij, `6dc07c1`](https://github.com/vitaut/zmij/tree/6dc07c1d3a3d4f2289b67001b86fcf084be48555).

[dependencies.json](../benchmarks/dependencies.json) pins every downloaded file
by SHA-256. The reference headers/sources and their Boost/MIT license texts are
downloaded into an ignored directory. They are benchmark dependencies and are
excluded from library installation.

## Size measurement

Each binary retains one conversion entry and a runtime caller. An otherwise
identical control retains no conversion work. Reported text and read-only bytes
subtract the control's corresponding sections after LTO and section GC.

The combined value is incremental `.text + .rodata`, including alignment and
padding. It excludes unwind, data/BSS, executable container overhead and caller
formatting. Numeric cache payload is a separate quantity exposed by the library
and described in the README and policy documentation. Caller shape, compiler and link settings
can affect the retained footprint.

## Reproduce

On Linux or WSL with GCC, Python 3 and GNU binutils:

```sh
python3 benchmarks/run.py --precision
```

This fetches and checks the manifest's pinned reference files, compiles both benchmarks,
checks each corpus before timing, validates timed checksums, measures all linked
entries against their controls, and generates CSV, metadata, a summary and a
report under `build/benchmarks/`. Source hashes are checked for stability during
the run. `--output` selects another destination for a new run.

For a short build/preflight/checksum check:

```sh
python3 benchmarks/run.py --smoke --precision
```

Smoke timings are diagnostic. The published tables retain the full current
study. Changing the set of methods can change code layout and trial ordering;
reproduction follows the same numerical contract and corpus methodology.

To validate and generate a summary from a fresh run's raw data without measuring
again (use your run's output directory):

```sh
python3 benchmarks/report.py build/benchmarks
```

The runner's output contains trial CSVs, footprint records, source/artifact
hashes, validation logs, and the derived report. These are ignored build
artifacts. The checked-in reports are summaries of the recorded studies.

## Paired revision comparison

The revision runner compares two revisions available in your local Git repository
in one process. Replace `BASELINE_REF` with a commit, tag, or branch that exists
in that repository:

```sh
python3 benchmarks/compare_revisions.py --baseline BASELINE_REF --n 65536 --trials 11 --repeats 16
```

The runner snapshots the selected Git baseline and current headers, recording
their SHA-256 hashes. Separate namespaces and `-fno-ipa-icf` prevent the compiler
from merging revisions. Both versions receive identical stored signed inputs;
every coefficient, exponent and sign is checked before timing. Revision/policy
order is shuffled per trial, and checksums are verified after each timed batch.
Linux uses thread CPU time; Windows uses single-thread process CPU time.

Parsing and string writing are excluded; this harness does not measure linked
footprint.

The binary64 fixed-exponent pool is named `one-to-two`: exponent field 1023
generates `[1,2)`. Historical binary64 records called it `unit-interval`; the
reporter interprets that old name correctly. Binary32's `unit-interval` remains
`[0,1)`.

## Stringification: integrated writers only

The [integrated binary64 study](../benchmarks/results/2026-10-01/integrated-writers/REPORT.md)
compares final buffer writes by experimental Boundragon Balanced writers,
unmodified native zmij, native xjb and native compact xjb. No component adapters
appear in this comparison. Binary32 has no integrated Boundragon writer in this
study and is therefore excluded from its primary tables.

```sh
python3 benchmarks/run_integrated_writers.py --out build/integrated-writers
python3 benchmarks/run_integrated_writers.py --include-fast --out build/integrated-writers-fast-control
python3 benchmarks/run_integrated_writers.py --include-fast --sanitize --out build/integrated-writers-sanitizers
```

Boundragon's experimental rounding kernel passes the leading sixteen positions,
final digit and decimal exponent directly to a prepared-digit writer entry.
It avoids public canonical conversion, trailing-zero normalization and the
component-width bridge. Exact integers and powers of two retain conversion
shortcuts. Ambiguous cases and subnormals use the exact finishing kernel.
These are benchmark-only integrated implementations, not an installed public
string API. Fast is optional as a control; primary tables use Balanced.

The pinned upstream digit-writing tails retain their original layout rules,
ASCII conversion and formatting tables. Deterministic extraction is checked
before every run. Native upstream writers and their numeric caches remain
unchanged. The two Boundragon writers must match the corresponding full native
writer's output byte for byte; compact xjb retains its own native layout.

Each timed call writes text and its length into a caller-owned 64-byte slot.
Allocation, input construction, parsing, validation and checksums are outside
the timer. Eight binary64 corpora use two seeds, eleven shuffled trials and
sixteen passes over 65,536 values. Thread CPU time and CPU affinity are checked.

Every input is checked against independent Dragonbox shortest/closest/even
components and parsed back to its exact bits. Adversarial cases cover every
exponent, boundary significands, subnormal powers and decimal-power neighbors.
Signed zeros and special tokens are checked. Canaries enclose the full writers'
documented capacities. Compact xjb gets 64 bytes because some writes exceed its
advertised 33-byte capacity; the count is recorded separately.

Linked footprint includes both conversion and formatting: `.text + .rodata`
from a separate LTO/section-GC executable per writer, minus a common caller
control. Numeric cache payload and pure canonical converter sizes are separate
quantities. The full binary64 study also passes ASan/UBSan including native
writers.

The pinned xjb reference is
[`80cc895`](https://github.com/xjb714/xjb/tree/80cc89574a8f8457ffbf951afa2fd27c2459bd4a/bench/xjb/float_to_string).
Benchmark-only xjb extracts retain Apache-2.0; zmij extracts retain MIT.
Only the [measured summaries](../benchmarks/results/README.md) are committed.
Fresh runs save raw timings, footprints, validation, manifests, and source
snapshots in ignored build directories. Downloaded dependencies are pinned
separately by revision and SHA-256 in each run’s manifest.

The earlier component-composition harness was removed after establishing
these two comparison scopes. It is not part of this public repository.

# Branch and fallback ratios

The explorer shows measured decision ratios for **binary32 Fast** and
**binary64 Balanced**, including their canonical shortcuts. The current
record was measured on 2026-10-01 against the maintained native kernels.

| Random finite-bit sample | Inputs | Complete-precision fallbacks | Fallback share |
|---|---:|---:|---:|
| binary32 Fast | 2,097,152 | 17,647 | 0.841475% |
| binary64 Balanced | 2,097,152 | 20,719 | 0.987959% |

The [explorer](index.html) lets readers change the reference distribution
without changing their input or selected step. Each **Evaluated decision** box
includes a compact frequency strip: the relevant outcome's rate **among inputs
that reached this guard**, followed by its share of **all sampled inputs**.
Hover over the strip for counts and measurement details; the nearby selector
changes the reference distribution. Coarse acceptance and fallback decisions
are named explicitly. Binary64's separate ambiguity predicates show uncertainty
rates; the combined decision shows fallback. These sample frequencies
do not predict a particular application's distribution or imply randomness
in the converter's deterministic decision for a particular input.

## Fallback accounting

Fallback requests more precision; it does not indicate a conversion error.
Integer, power, signed-zero, and nonfinite returns are counted separately.
The binary32 power-lookup count includes signed zero, which shares its dispatch.

Binary32 guards have nested or short-circuit control flow. An earlier return
reduces the denominator for later checks. **Not reached** means a denominator
of zero; **0 observed** means the sample contained no hits. Neither implies
that an unobserved branch is impossible.

Binary64 evaluates both ambiguity predicates before combining them. Their true
counts can overlap: in the finite-bit sample there were 5,296 boundary hits
and 14,473 rounding hits, with **52 inputs hitting both**. The combined guard
counts 19,717 inputs, not their sum. Another 1,002 nonzero subnormals go directly
to complete precision, giving 20,719 total fallbacks. Mutually exclusive cause
counts give boundary uncertainty priority when both predicates are true.
Specialized power-internal decisions are not included in the guard profile.

## Input distributions and reproducibility

The record pools two independent `mt19937_64` seeds, `0x3156a5` and `0x9a71de`.
Each distribution uses a separate stream initialized with
`seed + pool_index * 0x9e3779b97f4a7c15`, modulo 2^64. Duplicate inputs remain.
The measurement environment is Ubuntu Linux x86-64, GCC 11.4.0, glibc 2.35,
round-to-nearest, and the C locale. Decimal parsing/formatting samples can vary
between C libraries; the environment is part of the record.

- **Random finite bits:** 1,048,576 inputs per seed. Binary32 takes the low
  32 generator bits; binary64 uses all 64. Infinity/NaN encodings are rejected.
  Both signs and naturally occurring subnormals are included.
- **Random 1–6-digit decimals:** 131,072 inputs per seed. Choose a digit count
  uniformly, a coefficient of that length, and a decimal exponent from −20
  through +20. Parse with `strtof` or `strtod` and attach a random sign.
- **Full-range requested precision:** 131,072 inputs per seed for each digit
  count, 1–9 for binary32 and 1–17 for binary64. Generate finite encodings,
  format with `%.*g`, and parse back into the original format, rejecting
  overflow. Requested precision describes prepared inputs; it is not the
  canonical output length.

The native profilers check their classifications against instrumented kernels
for every prepared input: **4,718,592 binary32** and **6,815,744 binary64** inputs.
Binary32 checks fallback calls directly. Binary64's outlined-call counter also
includes power and special-value procedures; the profiler accounts for these
separately. This is a count profile, not a speed benchmark.

Only pooled counts and source hashes are maintained in
`docs/content/branch-rates.json`. The Pages build validates control-flow totals
and current source hashes, then generates a compact browser asset. It publishes
the summary and this explanation; raw CSV output and per-input data stay out of
the site. A kernel or profiler change requires remeasurement.

From the repository root on Linux or WSL:

```sh
mkdir -p build/branch-rates
g++ -std=c++20 -O3 -Iinclude benchmarks/branch_profile32.cpp -o build/branch-rates/profile32
g++ -std=c++20 -O3 -Iinclude benchmarks/branch_profile64.cpp -o build/branch-rates/profile64
build/branch-rates/profile32 > build/branch-rates/binary32.csv
build/branch-rates/profile64 > build/branch-rates/binary64.csv
python3 tools/generate_branch_rates.py \
  --binary32 build/branch-rates/binary32.csv \
  --binary64 build/branch-rates/binary64.csv \
  --environment "Ubuntu Linux x86-64, GCC 11.4.0, glibc 2.35, FE_TONEAREST, C locale"
npm run build:site
```

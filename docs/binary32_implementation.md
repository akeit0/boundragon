# Compact binary32 shortest decimal conversion

This document describes the 616-byte kernel exposed as
`FloatPolicy::Compact`, and the exact fallback shared by all policies.
The Fast default uses the [Q40 filter and power lookup](binary32_fast.md)
with 3,676 numeric cache bytes. The canonical entry is
`binary32_compact_to_decimal`; `binary32_components` is the raw kernel.

The single-precision implementation consumes the original IEEE 754 binary32
bits. It returns a shortest decimal value in the binary32 rounding interval,
choosing the closest value among equal-length candidates and an even decimal
coefficient at an exact tie. Converting `float` to `double` first would use a
different rounding interval; that is not how this implementation works.

The implementation is in
[`detail/float_decimal.h`](../include/boundragon/detail/float_decimal.h).
Its internal entry points are `binary32_components(uint32_t)` and
`binary32_compact_to_decimal(uint32_t)`. They share the lightweight `Decimal` result
type with the binary64 converter. `components` may retain decimal trailing
zeroes; `to_decimal` removes them.

## Architecture and storage

The kernel uses 77 normalized, exact-floor 64-bit cached powers for decimal
exponents `-32..44`, totaling **616 numeric table bytes**. There is no exponent
shift table and no binary64 cache dependency. The hot filter reads the high
32 bits of the same cache entry used by the fallback.

| Path | Arithmetic | Purpose |
|---|---|---|
| Centered filter | One 32-by-32 multiplication producing 64 bits | Resolve ordinary normal inputs using a bounded approximation |
| Exact fallback | Two 32-by-32 multiplications producing 64 bits | Resolve ambiguous inputs, subnormals, normal powers of two and special values |
| Canonical integer shortcut | Shifts, masks and decimal normalization | Return exact integral values for `1 <= abs(x) < 2^24` |

The header uses fixed-width 32-bit and 64-bit integer operations. It does not
require `__uint128_t`, floating-point arithmetic or architecture-specific
assembly. Decimal normalization uses a float-sized coefficient. The largest
finite returned coefficient has at most nine decimal digits. General
conversion output removes a first trailing zero, then fixed groups of four,
two and one using modular inverse multiplication and rotation. The exact
integer shortcut retains serial division, which suits its smaller
coefficients.

The exact finishing expressions are an adaptation of this repository's
inherited Żmij formulas to binary32-sized limbs. Their attribution is retained
in the source header and [`NOTICE.md`](../NOTICE.md). The new cache generator,
filter parameterization and certificates were written for this extension.

## Binary32 intervals and decimal grids

For a positive finite value, write

\[
x=m2^q,\qquad q=\max(1,\mathrm{raw})-150.
\]

Normal inputs have `2^23 <= m < 2^24`; subnormals use their stored coefficient
with `q=-149`. An ordinary normal or subnormal has the symmetric interval

\[
[(m-1/2)2^q,(m+1/2)2^q],
\]

with both endpoints included when `m` is even and excluded when it is odd.
The minimum normal, `0x00800000`, has this same symmetric interval because
its predecessor uses the same spacing. Other normal powers of two have the
asymmetric lower endpoint `(m-1/4)2^q`; they use the irregular fallback.

For a regular interval, choose

\[
k=\lfloor\log_{10}(2^q)\rfloor,\qquad
P=10^{-k-1},\qquad \alpha=2^qP,\qquad z=m\alpha.
\]

The fine decimal grid has spacing `10^k`; the coarse grid has spacing
`10^(k+1)`. Since `1/10 <= alpha < 1`, at most one coarse-grid point lies in
the interval. If that point is valid, decimal normalization determines the
shortest representation of its value. If no coarse point is valid, the
nearest fine-grid point is valid and shortest. The decade-boundary argument
in [`docs/proof.md`](proof.md) applies for `m >= 11`; the first ten subnormals
are checked independently, including the smallest input whose lower endpoint
is below `10^k`.

For an irregular interval, the decimal exponent instead uses
`floor(log10(3*2^q/4))`. There are only 253 such positive finite binary32
inputs. Every actual normal-power result, including the minimum normal's
separate symmetric case, is checked against the independent exact oracle.

## Centered high32 filter

Let `E=floor(log2(P))`, and let

\[
H=\lfloor P2^{31-E}\rfloor,\qquad
s_f=q+E+9,\qquad K=256.
\]

For every regular exponent class, `5 <= s_f <= 8`, so `m << s_f` fits in
32 bits. The filter computes

\[
u=\left\lfloor\frac{(m2^{s_f})H}{2^{32}}\right\rfloor,
\qquad h=H\mathbin{\gg}(33-s_f).
\]

The exact center and radius in fixed-point units are `Y=K*z` and
`R=K*alpha/2`. The omitted normalized-cache fraction and discarded product
fraction establish

\[
0\le Y-u<2,\qquad h=\lfloor R\rfloor.
\]

Use `v=u+1` to center this error, then represent the nearest coarse point
and residual through `centered=u+129` and
`w=(centered & 255)-128`. Thus `-128 <= w <= 127` and `-1 <= Y-v < 1`.

The coarse decision is ambiguous only when `abs(w)-h` is `0` or `1`.
Otherwise, the sign of that difference either certifies a valid coarse
point or certifies that no coarse point is valid. The integer-radius endpoint
lemma from the existing proof applies unchanged with `K=256`; it excludes
accidental acceptance at an open binary rounding endpoint.

For a fine result, compute `t=5*w+64`. The guard

```cpp
((unsigned(t + 5) & 127) <= 10)
```

sends every possible fine-rounding threshold or exact tie to the fallback.
Outside the guard, `t >> 7` is a stable signed fine-grid increment. A coarse
acceptance suppresses the fine guard. The same centered arithmetic used by
the binary64 converter therefore works at a precision suitable for a single
32-by-32 multiply.

The exhaustive positive-finite run observed **160,945,942 fallback calls out
of 2,139,095,039 inputs: 7.52402016%**. This includes the unconditional fallback
for subnormals and powers of two. It is a distribution-wide count, not a
measurement of a particular application's values.

## Exact fallback with 64-bit arithmetic

Let `C=floor(P*2^(63-E))` and `s=q+E+8`. Regular exponents give
`4 <= s <= 7`; irregular powers can also use `s=8`. Their shifted
significands still fit in 32 bits.

A 64-by-32 product is represented without a 128-bit integer:

```cpp
uint64_t low = uint64_t(uint32_t(C)) * n;
uint64_t product = uint64_t(uint32_t(C >> 32)) * n + (low >> 32);
```

This `product` equals `floor(C*n/2^32)` and fits in 64 bits. The finish uses
`F=product >> 7`, so the combined expression is

\[
F=\left\lfloor\frac{Cm2^s}{2^{39}}\right\rfloor,
\]

an approximation of `z*2^32`. Its integral part is `product >> 39`; its
fractional part is the low 32 bits of `product >> 7`. The coarse radius floor
is `(C >> 32) >> (8-s)`. Parity-sensitive endpoint handling, the `+6` fine
rounding correction and exact quarter correction are inherited finish
formulas with `Q=2^32`.

The fact that 64 cache bits suffice is **certified over every regular
significand**, rather than inferred from random tests. The coefficient's
smaller width leaves enough precision for the finish formulas: ordered
floor-sum equalities prove that their coarse interval decisions and fine
rounding thresholds coincide with exact rational arithmetic.

## Canonical results and special values

The canonical entry recognizes exact integers in the conservative range
`1 <= abs(x) < 2^24`. Their rounding radius is at most one half, so a
different decimal integer cannot be a valid shorter candidate. Returning
the exact integer and removing decimal trailing zeroes is therefore valid.
Other values use the filter followed by bounded normalization. Its first
divisibility check exits cheaply for the common case without a trailing zero.
After a successful first division, a coefficient below `10^9` has at most
seven remaining trailing zeroes; the groups `4/2/1` remove them without a
data-dependent loop. The constants and quotient bounds are checked with
exact modular arithmetic in the certificate.

Both zero signs are retained as `{0, 0, sign}`. Exponent `10000` is the
nonfinite sentinel: coefficient zero means infinity, and a nonzero
coefficient is the original 23-bit NaN payload. The sign is retained in
both cases. The raw-bit API avoids any conversion to a wider floating format.

## Verification and its scope

[`tools/generate_binary32_cache.py`](../tools/generate_binary32_cache.py)
generates every literal with Python integers. `--check` verifies the committed
header. [`proof/binary32_probe.cpp`](../proof/binary32_probe.cpp) emits the
compiled constants, exponent-helper results and special fallback cases.
[`proof/certify_binary32.py`](../proof/certify_binary32.py) checks that output
using independent rational arithmetic and the existing Euclidean floor-sum
engine.

The complete certificate passes:

- All **77** compiled cache entries and **254** exponent classes.
- Source-checked modular inverses and bounds for the first/`4/2/1` decimal
  zero-removal groups, including their complete eight-zero coverage.
- **1,016** ordered floor-sum equalities for coarse boundaries and parity.
- **2,540** fine-rounding equalities and **254** exact-quarter checks.
- **11,162,792** exact fine-grid halfway cases counted by congruence arithmetic.
- **2,139,094,786** regular positive inputs, including every subnormal.
- All **254** normal powers of two and the first **10** subnormals compared
  with the independent predecessor/successor rational oracle.

Accounting for the minimum-normal overlap, the mathematical coverage is
exactly **2,139,095,039 positive finite nonzero encodings**. Sign symmetry
covers their negatives. This is an algorithmic certificate; it does not
prove C++ semantics, compiler translation or generated machine code.

There is also a complete C++ cross-check in
[`proof/binary32_exhaustive.cpp`](../proof/binary32_exhaustive.cpp).
It enumerates all of those positive encodings and compares normalized
filtered output and the canonical shortcut entry with the certified exact
fallback. [Validation instructions](validation.md) describe how to run it.
This complete implementation comparison uses a shared fallback; it is distinct from an exhaustive independent-reference check.

The independently maintained binary32 test suite additionally compares
native output with scientific `std::to_chars(float)` and with a rational
oracle that constructs boundaries from predecessor/current/successor
values. Its coverage includes both signs of every subnormal, powers of two,
decimal neighborhoods, exact decimal ties, zeros, infinities and NaN
payloads. Test executables print their run counts.

Reproduce the fast mathematical certificate with:

```sh
g++ -O2 -std=c++20 -Iinclude proof/binary32_probe.cpp -o build/binary32_probe
python3 proof/certify_binary32.py ./build/binary32_probe
python3 tools/generate_binary32_cache.py --check
```

Run the complete implementation comparison separately from quick tests:

```sh
g++ -O3 -DNDEBUG -std=c++20 -Iinclude proof/binary32_exhaustive.cpp -o build/binary32_exhaustive
./build/binary32_exhaustive
```

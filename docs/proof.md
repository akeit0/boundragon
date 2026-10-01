# Boundragon correctness argument and exact certificates

The argument covers the maintained binary64 numeric converter in
[boundragon.h](../include/boundragon/boundragon.h): after canonicalization, a finite
nonzero input has a shortest decimal coefficient; among equally short valid
decimals it selects the closest, resolving decimal ties to even. Fast, Balanced,
Half, Tiny and Minimal all use the centered filter below, with their own
certified cache error bounds, and the same exact compact fallback. Fast and
Balanced's canonical entry defaults to the equivalent shortcuts in
[canonical_decimal.h](../include/boundragon/detail/canonical_decimal.h), justified in Section 9 below.

This is a mathematical algorithm proof supported by executable integer and
rational certificates. It is not a formal proof of the C++ language, compiler
translation or generated machine code. Source-to-formula correspondence is
manual. The optional x86 helper has a separate bounded instruction argument.
The native binary32 specialization and its finite certificate are documented
in [compact binary32 implementation](binary32_implementation.md).
The default binary32 Q40 filter's center/radius guards, power lookup and
compiled-cache certificate are described in
[binary32 Fast design](binary32_fast.md).

The [Lean project](../proof/lean/README.md) formally proves the centered
binary64 filter's acceptance/rejection and fine-rounding safety under explicit
cache and interval contracts. Its combined branch theorem is kernel-checked;
the complete fallback, shortestness, actual cache contracts, and C++ source
correspondence remain outside this partial formalization.

The current sources are `decimal_core.h`, `decimal_tables.h`,
`centered_filter.h`, `canonical_decimal.h`, `compact_cache.h` and `compact_cache_tables.h`.
[proof/cache_bounds.md](../proof/cache_bounds.md) supplies the cache contracts;
[proof/assembly.md](../proof/assembly.md) supplies the optional helper argument.
[proof/certificate_probe.cpp](../proof/certificate_probe.cpp) emits actual tables,
exponent helpers and fallback outputs; [proof/certify_fallback.py](../proof/certify_fallback.py)
checks them with exact floor sums and the independent [rational oracle](../tests/exact_oracle.py).

CTest includes compiled fallback certificates, independent rational-oracle
checks, and read-only exact table-generation checks. See
[validation instructions](validation.md) for their scope and reproduction.

The kernels can leave trailing zeros. Sign is returned separately; zero and
nonfinite values use the documented API convention. ASCII emission is outside
the theorem.

## 1. Exact regular-input model

Write the magnitude as

\[
x=m2^q,\qquad k=\lfloor\log_{10}(2^q)\rfloor,\qquad
\Delta=10^k,\qquad g=10\Delta,
\]

where `g` is the coarse decimal-grid spacing and `Delta` is the fine spacing.
Set

\[
P=10^{-k-1},\qquad z=xP=x/g,\qquad
\alpha=2^qP,\qquad 1/10\leq\alpha<1.
\]

An ordinary normal input has `2^52 < m < 2^53`; powers of two use the fallback.
The same regular rounding-interval formulas apply to subnormals, with
`q=-1074` and `1 <= m < 2^52`, and to minimum normal with its true interval.
The interval is

\[
[(m-1/2)2^q,(m+1/2)2^q]
\]

when `m` is even, and has both endpoints excluded when `m` is odd. Its
half-width is `r=2^(q-1)`. In coarse units its radius is `alpha/2`, so its total
width is strictly below one coarse-grid unit. Consequently it contains at most
one coarse-grid point.

For a fixed-point unit `K=2^A`, define

\[
Y=Kz,\qquad R=K\alpha/2.
\]

The fast filters require an integer `u`, a small positive integer `B`, and an
integer radius `h` satisfying

\[
0\leq Y-u<B,\qquad h=\lfloor R\rfloor,
\qquad h\leq R<h+1.
\]

The radius identity must be proved or certified for the actual cache. A bound
of a few units on a reconstructed high limb alone does not establish it:
subtracting one can change a shifted integer at an exact binary boundary.

## 2. Why these two decimal grids give shortest and closest output

First, the nearest fine-grid point is always valid for a regular input.
Because `2^q >= Delta`, its maximum distance `Delta/2` is no greater than the
binary rounding radius. Equality of these spacings occurs only when
`2^q=10^k`, hence `q=k=0`; then `x=m` already lies exactly on the fine grid.
In every other case the nearest fine point lies strictly inside the interval.

Second, every grid with spacing `10^j*Delta`, for integer `j>=1`, is a subset
of the coarse grid. If no coarse point is valid, no still coarser grid can
contain a valid point. If a coarse point is valid, every valid point on any
coarser grid must be that same unique point. Removing its trailing zeros
therefore obtains the largest valid canonical decimal exponent.

The link from decimal exponent to digit count needs care at a power of ten.
For every regular domain used here, the certificate checks that the lower
interval endpoint is greater than `Delta`. Every power of ten within the
interval therefore lies on the coarse grid. If there is no coarse point,
all valid decimals have the same base-ten order. In a common order `N`, the
number of digits of a canonical decimal `d*10^e` is `N-e+1`, so maximizing
`e` is exactly minimizing the digit count. The valid nearest fine-grid result
is thus shortest, and global nearest rounding makes it closest among those
shortest results. It cannot have a trailing zero, since that would be a valid
coarse point.

If a coarse point `c` is valid and is not itself a power of ten, all valid
decimals again have the same order: a decade boundary inside the interval
would be a second valid coarse point. The canonicalized `c` is then the
unique shortest numerical value.

If instead `c=T` is a power of ten, it has one significant digit, which is
minimal. There can nevertheless be another one-digit candidate on the finer
side of that decade, so uniqueness of the coarse point alone does **not**
prove the closest policy. For `m>=11`, interval membership gives

\[
\frac{|x-T|}{T}\leq\frac{r}{x-r}
=\frac1{2m-1}\leq\frac1{21}<\frac1{20}.
\]

Thus `x` lies strictly closer to `T` than to either neighboring one-digit
decimal, `0.9*T` or `2*T`, and hence closer than to any other one-digit
decimal. The only remaining regular inputs have `m<=10` and are the first
ten subnormals. The certificate checks their actual compact outputs
against the exact shortest/closest/even oracle. This finite exception matters:
for the second positive subnormal, both `9e-324` and `1e-323` are valid
one-digit decimals, and the latter is closer.

This establishes why no search through further decimal grids can improve
the canonical result. It also makes explicit the small-subnormal and
decade-crossing cases missing from the original notes.

## 3. Exact-high-limb and reconstructed-cache error bounds

For `p=-k-1`, let `E=floor(log2(10^p))` and write the exact normalized power as

\[
C=\lfloor P2^{127-E}\rfloor=H2^{64}+L,\qquad
P=(C+\epsilon)2^{E-127},\quad0\leq\epsilon<1.
\]

For the 11-bit filter, `s=q+E+12`, `n=m*2^s`, and `K=2048`. The exact
exponent certificates establish `8<=s<=11`, so `n<2^64`. Then

\[
Y=\frac{nH}{2^{64}}+\frac{n(L+\epsilon)}{2^{128}}.
\]

The integer `u=floor(nH/2^64)` is a lower approximation. Its discarded product
fraction is below one, and the second term is below one, giving
`0<=Y-u<2`. This includes the normalization remainder of the exact power;
the argument is not merely a comparison to another cached approximation.

The exact radius is

\[
R=\frac{H+(L+\epsilon)/2^{64}}{2^{65-s}}.
\]

Because the omitted fraction is below one and the denominator is an integer
power of two, its floor is exactly `H>>(65-s)`.

The reconstructed caches satisfy the same one-sided contract after their
exact generator checks: Tiny and Minimal use `(A,B)=(11,4)`, and Half uses
`(11,6)`. Their normalization, phase, approximation and radius identities
are established in [proof/cache_bounds.md](../proof/cache_bounds.md) and checked
by `tools/generate_compact_cache.py`.

## 4. Grid-distance bounds and the endpoint lemma

Choose the coarse-grid point `K*j` nearest to `u`, and let
`D=abs(u-K*j)`. Distance to a fixed point, and distance to the nearest point
of a grid, are both 1-Lipschitz. Consequently:

* If `D<=h-B`, the chosen point has exact distance `<D+B<=h<=R` and is
  strictly inside the interval.
* If `D>=h+B+1`, the true distance to every coarse point is
  `>D-B>=h+1>R`, so none is valid.

The ambiguous shell need only be

\[
-B+1\leq D-h\leq B,
\]

implemented as `unsigned(D-h+B-1)<2*B`. Section 5 centers this uncertainty
to obtain the predicates used by the public policies.

Write `u=K*I+f`. For a fine result, put `t=10*f+K/2`. The unknown contribution
changes this quantity by less than `10*B`. A remainder at least `K-10*B`
falls back. Otherwise the half-up integer is stable. A true fine-grid
halfway value either crosses one of these guarded transitions or has an
integer fixed-point coordinate. With a power-of-two `K`, the latter can only
have `f=K/4` or `f=3K/4`; `2.5` requires rounding downward to even and `7.5`
already rounds upward to even. The interval
`0<=K/4-f<B` is therefore also sent to the fallback. This wider quarter
guard is conservative when `B>2`.

The centered filter can accept a coarse candidate at distance at most `h`.
The following lemma makes that acceptance strict at open binary endpoints.

### Integer-radius endpoint lemma

If `R` is an integer, then `Y=2mR`. A coarse point at a binary interval
endpoint would require

\[
Kj=Y\pm R=(2m\pm1)R.
\]

Because `K` is a power of two and `2m±1` is odd, this would require `K` to
divide `R`. But `0<R<K/2`. Therefore an integer-radius binary endpoint
cannot coincide with a coarse-grid point. If `R` is not an integer, a
distance bounded by `h` is already strictly below `R`.

When the underestimated center has crossed an upward candidate, the
overshoot is below `B`; for the delivered filters `B<K/20<=R`, so it also
remains strictly inside. These details avoid silently treating equality at
an open binary midpoint as safe.

## 5. Centered filters for even error bounds

For any even error bound `B=2c`, let `v=u+c`, so
`-c<=Y-v<c`. The exact-high-limb cache uses `c=1`, the normalized tiny caches
can use `c=2`, and paired caches can use `c=3`. Select the coarse point
nearest to `v` and write its signed
residual as `w=v-K*j`, with `-K/2<=w<K/2`. The implementation obtains both
quantities from `u+K/2+c`.

Put `D=abs(w)` and reject `D-h` in `[-c+1,c]`, implemented as
`unsigned(D-h+c-1)<2*c`. On a fast coarse acceptance,
`D<=h-c`, so the exact distance is at most `D+c<=h`. The integer-radius
endpoint lemma turns this potentially non-strict inequality into strict
membership. On a fast rejection, `D>=h+c+1`, so the nearest-grid distance is
at least `D-c>=h+1>R`. For `c=1`, only `D=h` and `D=h+1` are ambiguous.

For a fine result one may compute the half-sized expression
`t=5*w+K/4`, with modulus `M=K/2`, and reject

```
((unsigned(t+5*c) & (M-1)) <= 10*c).
```

The accepted remainder is between `5*c+1` and `M-5*c-1`, inclusive. Adding
`5*(Y-v)`, which lies in `[-5*c,5*c)`, leaves it strictly between zero and
`M`. Thus both the rounded integer and its absence of an exact half tie are
certified. No separate `2.5` case is necessary. The fine increment is the
signed floor `t/M`, added to `10*j`; C++20's signed right shift has this
floor behavior when `M` is a power of two. A mask-based variant can select
the same coarse/fine increments and ambiguity predicates.

The unhalved centered `c=1` expression `t2=10*w+K/2` with guard
`((unsigned(t2+10)&(K-1))<=20)` is equivalent: `t2` is twice the integer `t`,
so the guard and signed shift make the same decisions after halving both
numerator and modulus.

Merely citing `|Y-v|<=c` without the integer-radius lemma would leave a real
logical gap in the coarse acceptance proof, because the lower error bound
is closed.

## 6. Exact certification of the regular fallback

### Source-to-formula correspondence

Use `Q=2^64` in this section, distinct from the fast filter's small `K`.
Let `C_rebuilt` be the actual compact coefficient. For each maintained power
it is `C` or `C+1`, with the same high limb as the normalized floor `C`.
The formulas below certify this actual coefficient rather than correcting it.
For the reference shift `s0=q+E+10`, define

\[
a=C_{\rm rebuilt}2^{s_0},\qquad b=2^{73},\qquad
F=\left\lfloor\frac{am}{b}\right\rfloor.
\]

The two wide products in `scaled_product` give
`floor(C_rebuilt*(m<<s0)/2^64)`. Shifting that result by nine gives precisely `F`.
The code's `integral` is `floor(F/Q)` and its `f` is `F mod Q`. These
identities include both product truncations exactly.

Let `alpha=A/B` be reduced, and put

\[
h_0=\lfloor Q\alpha/2\rfloor,
\qquad r_m=m\bmod2,
\qquad h=h_0+1-r_m.
\]

The compiled radius formula equals `h0`; every exponent is checked against
the independent rational expression.

The code's interval of valid coarse integers has upper and lower bounds

\[
U_c=\left\lfloor\frac{F+h}{Q}\right\rfloor,
\qquad
L_c-1=\left\lfloor\frac{F-h}{Q}\right\rfloor.
\]

Its `up` and `down` tests select that interval's only possible point. The
corresponding exact open/closed binary interval has

\[
U_e=\left\lfloor
\frac{A(2m+1)-r_m}{2B}\right\rfloor,
\qquad
L_e-1=\left\lfloor
\frac{A(2m-1)-(1-r_m)}{2B}\right\rfloor.
\]

Subtracting one in the integer numerator is the exact way to exclude a
rational endpoint if it is an integer. In particular, it is not an
approximate epsilon chosen from floating arithmetic.

For a fixed parity, write `m=m0+2*t`. Nested floors collapse because the
outer offsets and denominator are integers:

\[
\left\lfloor\frac{\lfloor am/b\rfloor\pm h}{Q}\right\rfloor
=\left\lfloor\frac{am\pm bh}{bQ}\right\rfloor.
\]

All four expressions are therefore floors of affine rational functions of
`t`. The certificate proves `Uc=Ue` and `Lc=Le` at every allowed `t`, for
every exponent and both parities.

### Why exact floor sums prove pointwise equality

For positive `d`, define

\[
S(n,d,a,b)=\sum_{i=0}^{n-1}\left\lfloor\frac{ai+b}{d}\right\rfloor.
\]

The difference of two underlying affine rational functions changes sign at
most once. The verifier splits the integer domain at that possible change.
On each piece the two floor sequences are pointwise ordered. If their exact
sums are equal, every termwise difference, a nonnegative integer after
choosing the ordering, must be zero. Equality of sums without this ordering
would be insufficient; the sign check is explicit in the verifier.

`S` is computed by Euclidean descent. First remove the integer quotients of
`a` and `b`, accounting for their arithmetic-series contributions. With
`0<=a,b<d`, set `N=floor((an+b)/d)` and `B0=(an+b) mod d`. Counting the same
lattice points by rows gives

\[
S(n,d,a,b)=S(N,a,d,B_0).
\]

The new denominator is smaller, and the zero-slope case terminates before
division by zero. Python's arbitrary integers preserve exactness. Small
signed and unsigned instances are also checked directly as a guard against
transcription errors in this routine.

### The reference's `+6` fine rounding is certified exactly

Before its special quarter correction, the reference's global fine integer
is

\[
D_c=\left\lfloor\frac{10F+Q/2+6}{Q}\right\rfloor.
\]

The desired half-up result is `De=floor(10*alpha*m+1/2)`. A loose error
sandwich is not enough: actual exponent classes contain values extremely
close to decimal half boundaries. Instead use an exact threshold identity.
With `d=Q/2+6`, define

\[
t_j=Q-\left\lceil\frac{jQ-d}{10}\right\rceil,
\qquad1\leq j\leq10.
\]

For every integer `F`,

\[
D_c=\sum_{j=1}^{10}\left\lfloor\frac{F+t_j}{Q}\right\rfloor.
\]

This simply counts its ten possible digit thresholds, and also works after
adding any multiple of `Q` to `F`. The exact half-up result decomposes as

\[
D_e=\sum_{j=1}^{10}
\left\lfloor\alpha m+\frac{21-2j}{20}\right\rfloor.
\]

Each compiled nested floor collapses to an affine rational floor. The
verifier proves equality with its corresponding exact threshold for every
`m`, exponent, and `j`. Thus the actual `+6`, including its interaction with
the inner truncation, is certified rather than inferred from a coarse error
bound.

### Ties to even and the exact-quarter detector

The exact number of `m` values satisfying any linear congruence is computed
using a greatest common divisor and modular inverse. Exact halfway values
satisfy

\[
20Am\equiv-B\pmod{2B}.
\]

The verifier proves, by exact congruence counts, that all such values are
precisely those with `alpha*m mod 1` equal to `1/4` or `3/4`. These disjoint
sets are individually subsets of the half cases, so equal cardinalities
establish completeness. A quarter is the `2.5` case, which rounds to the even
digit `2`; a three-quarter is `7.5`, for which half-up already gives even `8`.

The number of values detected by the compiled `f==Q/4` test is another exact
floor-sum difference:

\[
\sum_m\left(
\left\lfloor\frac{F+3Q/4}{Q}\right\rfloor
-\left\lfloor\frac{F+3Q/4-1}{Q}\right\rfloor\right).
\]

It equals the true quarter count. Cardinality equality alone would not
prove that the detected sets agree. The needed subset fact is checked too:
whenever true quarters exist in an exponent class, its exact normalized
power is integral. Reconstruction adds a nonnegative contribution smaller
than one to `F`, as checked explicitly. At a true quarter, `zQ` is an integer,
so flooring still gives `F=zQ` and every true quarter is detected.
Equal cardinalities then exclude every false
positive. This completes the reference's closest/ties-to-even proof.

## 7. Tables, exceptional powers, and complete domain coverage

The compiled probe emits the bundled exact normalized powers, high limbs and
reconstructed compact powers. Literal powers match separately computed exact
rational normalization; reconstructed coefficients lie in `[C,C+1]` with exact
high limbs. The floor-sum formulas use the actual reconstructed coefficient.
The probe also emits the compiled decimal-exponent
and shift helpers for every normal raw exponent. Exact inequalities verify
their logarithmic floors, table range and safe shift bounds. Cache phases are independently checked by
the cache generator. The maintained verifier also checks the exact normal-input
bound `2048*(2^53-1)*alpha+1027 < 2^64`, which excludes wraparound when
any centered public filter adds `K/2+c` to its underestimated center.

For all regular `q` except `-1074`, the certificate covers
`2^52+1 <= m <= 2^53-1`. For `q=-1074`, it covers the combined domain
`1 <= m <= 2^53-1`, including all subnormals and minimum normal with its
true regular rounding interval. The actual C++ minimum-normal path uses
`finish_irregular`; it is checked separately with the other powers of two.

There are only 2,046 positive normal power-of-two encodings. The maintained probe runs
the actual compact fallback for every one. The
independent rational oracle constructs their correct intervals and searches
digit lengths in increasing order. If `N=floor(log10(x))` and a valid
decimal has `d` digits, its exponent is one of
`N-d`, `N-d+1`, or `N-d+2`: these intervals lie within a factor of two of
`x`, so they cannot skip an adjacent decade. These are exactly the three
exponents the oracle inspects. Exact endpoint ceilings/floors produce all
valid integer significands; nearest rounding clamped to that range picks
the closest, and parity resolves a tie. The first nonempty digit length is
therefore minimal. The oracle succeeds within 17 digits for every checked
exception. It also checks the first ten subnormals discussed above.

The fallback certificate checks the following mathematical coverage:

| Certificate | Exact coverage |
|---|---:|
| Literal powers and compiled compact reconstruction | 618 decimal exponents |
| Exponent/shift/radius classes | 2,046 raw exponents |
| Coarse-boundary floor-sequence equalities | 8,184 |
| Fine-rounding threshold equalities | 20,460 |
| Quarter detector checks | 2,046 |
| Regular-domain input count | 9,218,868,437,227,403,266 |
| Actual irregular outputs checked against the rational oracle | 2,046 |
| Additional small-subnormal closest-policy checks | 10 |
| Positive finite nonzero binary64 encodings covered | 9,218,868,437,227,405,311 |

The regular domain includes minimum normal once, so the final count adds the
2,046 actual irregular encodings and subtracts that one overlap. These are
symbolic all-significand certificates, not a claim that roughly nine
quintillion values were individually enumerated or timed.

Negative finite inputs reuse the magnitude computation and return the
original sign, so magnitude correctness is symmetric. Zero returns zero
with its sign. Infinity and NaN use the explicit `exp=10000` sentinel and
payload convention; a shortest finite-decimal claim does not apply to them.

## 8. Reproduction and remaining limits

Run from the repository root when a fresh certificate is needed:

```
mkdir -p build
g++ -std=c++20 -O2 -Iinclude proof/certificate_probe.cpp -o build/certificate-probe
python3 proof/certify_fallback.py ./build/certificate-probe
python3 tools/generate_compact_cache.py --check
```

Rebuild the probe after changing any source or literal table. Run the
separate cache-generator certificates for each maintained layout.

The algorithmic theorem assumes the documented source-to-formula mapping,
ordinary C++20 unsigned arithmetic, correct compiler translation, and the
specified wide integer type. The shift/exponent bounds exclude overflow in
the products used by that mapping; sign-preserving copies and the small
signed centered residuals are direct source operations. Regression tests,
undefined-behavior checks, emitted-assembly inspection, and independent
compiler runs remain useful validation of this implementation bridge.

No historical novelty or universal speed claim follows from this proof.
It establishes the decimal-selection policy and the safe ambiguity filters.
Performance and cache-footprint measurements answer separate questions.

## 9. Canonical-path shortcuts

These shortcuts affect Fast and Balanced's `to_decimal` when its third template
argument is `true` (the default), including their optional assembly forms. Setting
that argument to `false` restores the original canonical adapter; `components_raw`
and the other policies retain the original conversion path.
Their centered acceptance inequalities and cache arrays are unchanged.

For a finite normal input with `0 <= 1075-raw <= 52`, the significand's bottom
`1075-raw` bits are precisely its fractional bits. If they are zero, the exact
magnitude is the integer `n = (m | 2^52) >> (1075-raw)`, with `1 <= n < 2^53`.
Its parsing interval extends by at most one half on either side. A shorter
decimal in the same decade would lie on a coarser integer grid, so no distinct
such integer is valid. An interval can cross an integer decimal-decade boundary
only when `n` equals that boundary, which already has a one-digit canonical
representation. Thus decimal-zero normalization of `n` is shortest; its zero
distance from the input makes it closest. The shift is evaluated only after its
unsigned range check, excluding negative or oversized shifts.

An accepted ordinary filter returns `10*j+tail` with `-5 <= tail <= 5`.
A nonzero tail is not divisible by ten, so the result is already canonical.
When the tail is zero, normalizing `j` at exponent `k+1` is identical to
normalizing `10*j` at exponent `k`. The exact regular fallback uses the same
argument: coarse acceptance omits the unused fine-digit computation. On a
regular fine path, rejection of both coarse points gives
`h <= f <= 2^64-1-h`. The certificate checks the nearest-digit expression at
both endpoints using the smaller width `hi >> (10-shift)` for every regular
exponent except `q=0`: its range lies within digits 1 through 9. Increasing the
width for even significands only narrows that interval. Every `q=0` input is an
exact integer handled by the earlier shortcut; the quarter-case correction
returns 2. The selected digit therefore leaves no trailing zero. These
transformations preserve the numerical value and the selected shortest/closest decimal.

Every nonzero subnormal has `q=-1074`, hence `k=-324`, `shift=8` and power
exponent `323` in the original regular fallback. Substituting those constants
and that exact 128-bit power is an identity. Zero, infinity and NaN keep their
original sign/payload conventions. [canonical_bounds.py](../proof/canonical_bounds.py)
independently derives and checks both embedded power limbs.

For a normal power of two, the scaled product is obtained by shifting the cache.
Let `combined=52+shift`, where `59 <= combined <= 62`. Its integral part is
`hi >> (73-combined)` and its fraction is

```
f_exact = (hi << (combined-9)) | (lo >> (73-combined))  // modulo 2^64
```

The second term occupies only the bottom `combined-9` bits. For the actual
finite cache, the high-only fraction `f=hi << (combined-9)` selects exactly
the same coarse/fine decision and final fine digit as `f_exact`. The helper
therefore compares `up || half_h > f` directly; otherwise it rounds and clamps
the fine digit to the lower-endpoint requirement. No uncertainty tests or low
limb reconstruction remain on this path.

[canonical_bounds.py](../proof/canonical_bounds.py) checks this equality for all
2,046 normal exponents, including the integer shortcut exponents. It reports
875 coarse and 1,171 fine decisions, and verifies every fine digit is in `1..9`.
This is a property of the maintained cache, rather than a general assertion
that discarding low limbs is always safe. Compiled signed power tests also
check the public path against independent oracles.
The bounds certificate checks parameters and formulas. Source/formula
correspondence remains manual; the compiled tests and independent rational
oracles check the maintained implementation. See [canonical paths](canonical_paths.md).

## 10. Fixed-group decimal normalization

For a nonzero unsigned 64-bit coefficient `n`, let `M = 2^64`, choose a group
size `k`, and let `a` be the inverse of `5^k` modulo `M`. Define

```
r = rotr64((n * a) mod M, k)
B = floor((M - 1) / 10^k)
```

Then `r <= B` holds exactly when `10^k` divides `n`; when it holds, `r` is the
exact quotient. If `n = 10^k*q`, then `q <= B < 2^(64-k)`. Multiplication by
`a` gives `2^k*q` modulo `M`, which fits without overflow, and rotation yields
`q`. Conversely, if `r <= B`, reversing the rotation gives `2^k*r` without
overflow. Multiplying by `5^k` modulo `M` recovers `n = 10^k*r`; this product
also fits, so the modular equality is an ordinary integer equality.

`normalize_finite` first applies the `k=1` test. A failure returns the unchanged
coefficient and exponent. A success removes one zero, then tests groups
`16,8,4,2,1`. Any nonzero uint64_t has at most 19 trailing decimal zeros, so at
most 18 remain after the first division. Greedy binary groups remove exactly
that remaining count. Folding the five success bits with left shifts computes
their weighted sum; adding it and the first zero to the exponent preserves
the numerical value. Sign is copied unchanged. Zero and nonfinite values are
handled by callers before entering this helper.

The canonical binary64 conversion paths use `normalize_finite_short`, whose
additional precondition is `n < 10^17`. Their inputs satisfy this bound directly
from the fixed-width operations: the largest case is `(product >> 73) + up`,
at most `2^55`; the integer and centered-filter cases are smaller than `2^53`,
and the power-of-two case is at most `2^53`. Half/Tiny/Minimal also pass raw
two-grid coefficients to this helper: `alpha < 1` bounds their coefficient by
`10*2^53+10 < 10^17`. The fallback certificate checks this bound for every
exponent using the actual reconstructed coefficient. Zero and nonfinite
results bypass normalization. After the first successful division
the coefficient is smaller than `10^16`, so at most 15 trailing zeroes remain.
Groups `8,4,2,1` suffice; the impossible 16-zero test is omitted at compile time.
The general `normalize_finite` wrapper retains the 16-zero group and its full
uint64_t domain.

[decimal_normalization.py](../proof/decimal_normalization.py) independently
derives the modular inverses and thresholds and checks the source parameters.
[The compiled test](../tests/decimal_normalization.cpp) compares the helper with
ordinary decimal division, including all zero counts, maximal multiples,
neighboring coefficients and random full-width uint64_t values. The mathematical
argument is universal; the certificate checks parameters and the compiled tests
sample implementation behavior. Neither verifies compiler translation formally.

Grouped modular zero removal is also used by Dragonbox.
The implementation here derives full-width inverses and adds a fast no-zero
exit and a 16-zero group; it changes normalization only, not decimal selection
or approximate acceptance.

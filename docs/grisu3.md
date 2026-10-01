# Boundragon and Grisu3

boundragon is a modern Grisu3-style shortest-decimal converter with centered
approximation guards and compact caches. This describes a conceptual relationship:
both spend limited precision on the common case, certify the decision against
an error bound, and use a complete converter when the decision is uncertain.
boundragon's scaling and exact fallback are adapted from xjb/zmij; its source
retains the inherited attribution in [NOTICE.md](../NOTICE.md).

This comparison describes algorithm structure and numerical guarantees.

## What Grisu3 established

Florian Loitsch's [PLDI 2010 paper, *Printing Floating-Point Numbers Quickly and
Accurately with Integers*](https://www.cs.tufts.edu/~nr/cs257/archive/florian-loitsch/printf.pdf),
especially section 6.3, describes a converter that returns a shortest, closest
decimal when limited precision can establish those properties. It rejects
uncertain inputs, allowing a complete algorithm such as Dragon4 to handle them.
Grisu3 uses enlarged and conservative approximations of the parsing interval
to establish shortness and validity, while also checking closeness throughout
the uncertainty in the input approximation.

In Google's double-conversion reference, [`Grisu3`, `DigitGen` and
`RoundWeed`](https://github.com/google/double-conversion/blob/master/double-conversion/fast-dtoa.cc)
scale the value and both boundaries, generate digits, and adjust/check the final
candidate. On failure, the [complete conversion wrapper](https://github.com/google/double-conversion/blob/master/double-conversion/double-to-string.cc)
calls `BignumDtoa`. The fallback is a property of that complete implementation;
Grisu3 itself can return failure.

## What boundragon changes

For an ordinary normal magnitude `x = m * 2^q`, boundragon sets
`k = floor(log10(2^q))` and works with two decimal grids:

- Coarse spacing `10^(k+1)`: test the nearest candidate for a shorter result.
- Fine spacing `10^k`: supply one more digit when no coarse candidate is valid.

[PROOF.md](proof.md) explains why these grids suffice for shortest/closest output,
including trailing-zero removal and decade boundaries. The raw kernels dispatch
powers of two and subnormals to the exact fallback. Fast/Balanced's canonical
entry defaults to integer, subnormal and bounded power-of-two shortcuts; see
[canonical paths](canonical_paths.md).

All public filters use fixed-point unit `K = 2048`. Their cache contract is
`0 <= Y-u < B`, where `Y = K*x/10^(k+1)` is the exact scaled value and `u` its
integer approximation. With `c = B/2`, centering at `v = u+c` gives
`-c <= Y-v < c`. Distance guards determine whether a coarse candidate is inside
the parsing interval; rounding guards determine the fine candidate. A result
is accepted only when the uncertainty cannot change the decision. Endpoint and
decimal halfway ambiguities go to the fallback.

Fast and Balanced use `B=2`; Tiny and Minimal use `B=4`; Half uses `B=6`.
Each policy also establishes the exact integer floor of the interval radius.
See [cache contracts](../proof/cache_bounds.md), [the ordinary filter](../include/boundragon/detail/centered_filter.h)
and [reconstructed-cache filters](../include/boundragon/detail/compact_cache.h).

## Structural comparison

The Grisu3 column refers to the paper and double-conversion sources linked above;
its cached-power layout is shown in
[`cached-powers.cc`](https://github.com/google/double-conversion/blob/master/double-conversion/cached-powers.cc).

| Aspect | Grisu3 / double-conversion | boundragon |
| --- | --- | --- |
| Common-case arithmetic | Normalized 64-bit `DiyFp` values and rounded products. | High-limb product with a certified one-sided error, then centering. |
| Scaling work | Three `DiyFp::Times` calls: value, lower boundary, upper boundary. | Fast/Balanced use one 64-by-64-bit product for the scaled value and a shift for the radius; smaller policies add reconstruction work. |
| Candidate construction | Digit generation followed by rounding/weeding. | Direct nearest coarse/fine grid tests; `to_decimal` then trims zeros. |
| Certainty check | Conservative validity interval and closeness checks. | Centered distance shell and fine-rounding guards. |
| Cache | Sparse normalized decimal powers, spaced eight decimal exponents apart. | Five layouts trading stored high limbs and reconstruction; 592–7,584 numeric array bytes including fallback. |
| Complete fallback | Wrapper invokes bignum conversion on rejection. | Fixed-size exact conversion in [decimal_core.h](../include/boundragon/detail/decimal_core.h), with specialized canonical paths in [canonical_decimal.h](../include/boundragon/detail/canonical_decimal.h). |
| Output interface | Digit buffer plus decimal-point position. | Sign, integer coefficient and decimal exponent; ASCII formatting is separate. |

The number of products describes these source paths. It is not a timing result,
and cache payload bytes are not a linked-footprint comparison.

## How to describe the relationship

“A modern Grisu3-style converter” captures the shared approximate/certify/fallback
architecture. The centered guards, direct candidate selection and cache policies
describe boundragon's particular implementation. The paper already establishes
guarded approximation as a conversion technique, so that broad idea is prior art.

A performance-successor claim would require a direct comparison of complete
converters: matched output work, compiler settings and corpora, plus linked size
and fallback frequency. The [proof](proof.md) states the scope of the mathematical argument;
[validation](validation.md) explains the executable certificates.

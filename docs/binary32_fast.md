# Binary32 Fast: Q40 decisions and correctness

The Fast and Integers policies use a Q40 scale and one 64-bit product.
Fast limits exact-integer dispatch to `[2^16,2^24)`; Integers extends it
to `[1,2^24)`. Both use the same tables and guarded conversion kernel.


For non-power finite inputs, let `q=max(raw,1)-150`, with significand `m`
including the hidden bit for normals. The usual spacing is `2^q`, and the
rounding interval is symmetric with radius `2^(q-1)`. Let
`k=floor(log10(2^q))`, `alpha=2^q * 10^(-k-1)` and `Q=2^40`.
The generated exponent-indexed table stores `W=floor(alpha*Q)` and the coarse
decimal exponent `k+1`.

The single `uint64_t` product `m*W+Q/2` yields coarse coefficient `I` and
centered residual `r`. In units of `Q`, the true residual relative to `I` is
`r+delta`, where `0 <= delta < m`; the true radius `H` obeys
`h <= H < h+1`, with `h=W/2` using integer division. Product bounds are
checked for every exponent: `(2^24-1)*W+Q/2 < 2^64`.

With `a=abs(r)`, these conservative guards certify the decisions:

- `a+m+1 < h`: `I` lies strictly inside the rounding interval. Return the
  coarse result after three modular-inverse zero-removal groups, `4/2/1`.
- `a <= h+m+1`: uncertain boundary; use exact fallback.
- Otherwise the coarse point is outside. The bound `Q/2-(2^24-1) > h+1`
  excludes the other coarse point even if approximation crosses a half grid.
  Accept the nearest fine-grid digit only if
  `floor((10*r+Q/2)/Q)` is unchanged at `r+m` and the lower value is not
  exactly on a tie threshold. Otherwise use exact fallback.

The outside guard gives `a > h+m+1 > Q/20`, so an accepted fine digit is
nonzero. This result is already canonical and needs no normalization.
Coarse coefficients are below `10^8`, so at most seven trailing zeroes are
covered by `4/2/1`. The inherited coarse/fine-grid lemma and certified exact
fallback supply shortestness; the stable nearest-digit test supplies closeness.
Uncertain endpoints and decimal ties are resolved by the exact fallback.

Normal powers have asymmetric lower intervals and use independently generated
canonical power results. Zero uses table entry 0; nonfinites retain their
sentinel/payload behavior. The first ten positive subnormal encodings use exact
fallback; remaining subnormals use the ordinary symmetric spacing directly.
Sign changes affect only the returned sign field.

[The exact generator](../tools/generate_binary32_fast_cache.py) and
[Fast certificate](../proof/certify_binary32_fast.py) use rational arithmetic
and inspect compiled table entries. The certificate checks cache floors,
center/radius bounds, overflow, nonnearest coarse exclusion, output bounds,
all power results, and source correspondence of the guards. The existing
[fallback certificate](../proof/certify_binary32.py) checks the exact formulas
and modular normalization constants. These checks are mathematical bounds
plus source checks, rather than formal C++/compiler verification.

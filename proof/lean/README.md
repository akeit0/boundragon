# Lean proofs of normalized centered binary64 conversion

This project formalizes the centered decision guards from
[the binary64 correctness argument](../../docs/proof.md#5-centered-filters-for-even-error-bounds).
It is a partial formalization of Boundragon, with an exact-integer decision
model, a terminating reference normalizer, exact rational geometry, decimal
digit counts, and a floor-sum certificate principle. Every accepted normalized
branch is proved optimal under the contracts below and `m >= 11`. The complete
public converter is not yet proved correct.

## Reproduce

Install Lean's `elan` toolchain manager, then run from the repository root:

```sh
cd proof/lean
lake exe cache get Mathlib.Data.Rat.Floor Mathlib.Data.Nat.Log Mathlib.Algebra.Order.BigOperators.Group.Finset Mathlib.RingTheory.Coprime.Lemmas Mathlib.Tactic.Linarith Mathlib.Tactic.NormNum Mathlib.Tactic.Ring Mathlib.Tactic.Positivity
lake build
lake env leanchecker Boundragon
```

The first command downloads precompiled dependencies. Lean and mathlib are
pinned to `v4.33.0-rc1`, matching the toolchain used to check these proofs;
`lake-manifest.json` also pins transitive dependencies. Build output is ignored.
On machines with limited memory, set `LEAN_NUM_THREADS=2` for the checker.
The separate Lean CI workflow builds the project and runs the checker.

`lake build` also audits every declaration in the `Boundragon` namespace for
transitive axiom dependencies. It permits only Lean's standard logical axioms
`propext`, `Classical.choice`, and `Quot.sound`. Unfinished proofs, custom axioms,
and native-evaluation axioms cause the audit to fail. The mathematical proofs
use no `sorry`, `admit`, or `native_decide`.

## Main theorem and assumptions

[Decision.lean](Boundragon/Decision.lean) defines `centeredDecision2048` and
groups its assumptions in `CenteredContract2048`.
`centered_decision_sound_of_contract` proves the model correct from this
contract; `centered_decision_sound` retains the original interface with
individual hypotheses. Its inputs have these meanings:

| Symbol | Meaning / assumed contract |
| --- | --- |
| `Y` | Exact magnitude in fixed-point coarse coordinates |
| `R` | Exact rounding-interval radius in those coordinates |
| `m` | Integer binary significand, with `Y = 2*m*R` |
| `u` | Underestimated center, with `0 <= Y-u < 2*c` |
| `h` | Integer radius, with `h <= R < h+1` |
| `c` | Positive integer half-error bound; delivered binary64 policies use 1, 2, or 3 |
| Grid | Coarse spacing 2048; fine spacing 2048/10 |
| Radius | `2048/20 <= R < 1024`, from the regular two-grid scaling |

If the model returns a coarse choice, that value is **strictly inside** the
rounding interval. This includes the integer-radius case: the proof establishes
that an odd multiple of a smaller positive integer cannot be divisible by a
power of two, so a coarse candidate cannot land on an open binary endpoint.

If the model returns a fine choice, that value is strictly inside the interval,
every coarse-grid point is strictly outside, and its coefficient is strictly
closer than every other fine-grid coefficient. Exact decimal-half ties are
therefore excluded. A rejected guard returns `none`, representing fallback;
the theorem makes no assertion about a fallback result.

[Accepted.lean](Boundragon/Accepted.lean) defines `normalizedDecision2048`,
which applies `normalizeDecimal` to either accepted coefficient at its actual
decimal scale. Its main theorem, `centered_normalized_decision_sound`, proves
that every `some d` result is canonical, strictly valid, shortest, and uniquely
closest among equally short valid decimal values. It uses the same contract,
adds `m >= 11`, and holds for every integer decimal scale `k`. Rejected guards
still return `none`; the definition does not implement fallback.

## Fine-result shortestness and closest selection

[Shortest.lean](Boundragon/Shortest.lean) strengthens fine acceptance to
`centered_fine_optimal_scaled`. Under the same contract, with `m >= 11`, a
result `some (.fine n)` produces a decimal `n * 10^k` that is:

- Strictly inside the rounding interval.
- Canonical: its coefficient has no trailing decimal zero.
- Shortest among **all** valid positive decimal representations, allowing
  every integer exponent.
- Uniquely closest among the equally short valid decimal values.

Here `k` is any integer decimal scale. The center and radius are respectively
`(10*Y/2048)*10^k` and `(10*R/2048)*10^k`. `DecimalRep` stores a coefficient,
exponent, and `digitIndex`; `digitIndex + 1` is the significant-digit count.
The theorem constructs a digit index satisfying the exact power-of-ten bounds.

The proof shows that an interval with no coarse-grid point cannot cross a
decimal-decade boundary. All valid decimals then have the same decimal order;
a shorter coefficient would require an exponent on the excluded coarse grid.
For equal digit counts, nearest-integer uniqueness gives closest selection.
`decimal_optimal_shift` preserves this result under multiplication by any
decimal power, including negative powers.

Competitors may lie on either closed endpoint and need not be canonical.
This larger comparison set covers either parity's parsing interval. The
selected output is strictly interior, so endpoint parity does not affect this
branch. The `m >= 11` hypothesis explicitly excludes small significands; it
is not yet derived from the C++ dispatch.

## Coarse-result normalization and optimality

[Normalization.lean](Boundragon/Normalization.lean) defines a terminating
reference algorithm that divides positive coefficients by ten until no
trailing zero remains. `normalize_decimal_correct` proves value preservation,
canonicality, exact digit bounds, and a nondecreasing exponent.
`canonical_exponent_max` and `canonical_digits_min` prove that a canonical
representation has the largest exponent and fewest digits for its value;
`canonical_decimal_unique` proves that representation unique.

[CoarseOptimal.lean](Boundragon/CoarseOptimal.lean) proves
`centered_coarse_optimal_scaled`. For `some (.coarse j)` and `m >= 11`,
`normalizeDecimal j.toNat (k+1)` satisfies the same optimality specification
as the accepted fine result, at any integer scale `k`.

When the accepted value is not a power of ten, coarse-grid uniqueness excludes
every decade boundary from the interval. All equally short or shorter
competitors therefore lie on the coarse grid and must be the same value.
Canonicalization gives the minimum digit count.

For a power of ten `T`, one digit is already minimal, but the proof also
compares against one-digit decimals across the boundary. All other such
decimals lie at or below `0.9*T` or at or above `2*T`. The interval geometry
and `m >= 11` imply `20*abs(x-T) < T`, making `T` uniquely closest.

These results complete the mathematical two-grid argument for accepted
branches under the regular contract and significand restriction. The reference
normalizer is verified; its correspondence with the C++ normalization routines
and shortcuts remains to be proved.

## Floor-sum certificate principle

[Certificates.lean](Boundragon/Certificates.lean) proves
`ordered_sum_eq_pointwise`: equal finite sums of pointwise ordered integer
sequences force equality at every index. `affine_floor_sum_eq` specializes
this to floors of affine rational functions, proving their ordering from
endpoint inequalities on each supplied interval. This formalizes the
[certificate principle](../../docs/proof.md#why-exact-floor-sums-prove-pointwise-equality).

The exact mathematical sum equality is still a hypothesis. The Euclidean
floor-sum evaluator, the verifier's interval splitting, and the concrete
certificate instances have not yet been verified in Lean.

## Supporting results

The proof separates general arithmetic from the binary64 specialization:

| Module | Responsibility |
| --- | --- |
| [Geometry.lean](Boundragon/Geometry.lean) | Centered error and nearest-grid bounds |
| [Coarse.lean](Boundragon/Coarse.lean) | Strict coarse acceptance, rejection, and integer-radius endpoints |
| [Fine.lean](Boundragon/Fine.lean) | Rounding stability for an arbitrary positive integer modulus |
| [Binary64.lean](Boundragon/Binary64.lean) | Named decoder/coefficient definitions and the 2048/1024 arithmetic |
| [Decision.lean](Boundragon/Decision.lean) | Filter branches, input contract, and combined soundness theorem |
| [Decimal.lean](Boundragon/Decimal.lean) | Decimal representations, significant digits, orders, and scaling |
| [Shortest.lean](Boundragon/Shortest.lean) | Fine-branch canonical shortestness and unique closest selection |
| [Normalization.lean](Boundragon/Normalization.lean) | Terminating reference normalization, value preservation, and canonical uniqueness |
| [CoarseOptimal.lean](Boundragon/CoarseOptimal.lean) | Coarse optimality and power-of-ten boundary handling |
| [Accepted.lean](Boundragon/Accepted.lean) | Executable normalized branch model and combined decimal optimality theorem |
| [Certificates.lean](Boundragon/Certificates.lean) | Ordered floor-sum certificate soundness principle |
| [Audit.lean](Boundragon/Audit.lean) | Build-time transitive axiom audit |

[Centered.lean](Boundragon/Centered.lean) remains a compatibility import.
Existing theorem names remain in the `Boundragon` namespace. Supporting
results establish:

- Centering a one-sided error produces `[-c,c)`.
- Integer-radius endpoints cannot coincide with a power-of-two coarse grid.
- The centered quotient selects a nearest coarse candidate.
- Coarse acceptance is strict; coarse rejection excludes the entire grid.
- The actual shifted-remainder fine guard preserves signed floor rounding.
- Accepted fine coefficients are valid and uniquely nearest.
- The 2048 quotient/remainder decoder has residual in `[-1024,1024)`.
- The ambiguity shell matches the unsigned 32-bit modular comparison on the
  maintained radius/residual/error domain.
- Halving the numerator and modulus preserves both rounding and the `c=1`
  ambiguity predicate.

The branch model follows the mathematical decisions of
[`centered_filter.h`](../../include/boundragon/detail/centered_filter.h) and
[`tiny_nearest_finish`](../../include/boundragon/detail/compact_cache.h).
Its coarse/fine tags make the selected grid explicit; the C++ converter packs
either choice into decimal components and may normalize trailing zeroes. The
Lean reference converter explicitly normalizes both branches.

## Remaining proof obligations

The cache/error/radius hypotheses above are parameters of the theorem, not
additional axioms. The existing exact certificates check them for the caches,
but those certificate checkers have not yet been proved sound in Lean.

A full converter theorem still needs:

1. The small-subnormal exceptions and derivation of the regular contract and
   `m >= 11` from actual dispatch. Both accepted branches' canonical
   shortestness and unique closest selection, including power-of-ten
   boundaries and arbitrary decimal scaling, are proved under these
   assumptions.
2. The complete fallback, the Euclidean floor-sum evaluator and concrete
   floor-sum/congruence certificates, exceptional powers of two, and
   ties-to-even handling. The ordered-sum implication is proved, but neither
   the evaluator nor the certificate data are yet connected to it.
3. Actual cache generation/reconstruction bounds and exponent/shift helpers.
4. Correspondence of C++ normalization and shortcuts with the verified
   reference normalizer, special values, sign handling, and the separate
   binary32 kernels.
5. A correspondence proof for the C++ fixed-width operations, masks, signed
   shifts, overflow bounds, dispatch, and optional assembly.

The current results are kernel-checked proofs of filter safety, normalization,
both accepted branches' decimal optimality under explicit contracts, and a
certificate soundness principle. They are not an end-to-end proof of C++,
compiler translation, or machine code, and they do not replace the existing
certificates and tests.

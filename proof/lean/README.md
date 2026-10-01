# Lean proof of the centered binary64 filter

This project formalizes the centered decision guards from
[the binary64 correctness argument](../../docs/proof.md#5-centered-filters-for-even-error-bounds).
It is a partial formalization of Boundragon, with an exact-integer decision
model and exact rational geometry. It does not yet prove the complete public
converter correct.

## Reproduce

Install Lean's `elan` toolchain manager, then run from the repository root:

```sh
cd proof/lean
lake exe cache get Mathlib.Data.Rat.Floor Mathlib.RingTheory.Coprime.Lemmas Mathlib.Tactic.Linarith Mathlib.Tactic.NormNum Mathlib.Tactic.Ring Mathlib.Tactic.Positivity
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

## Supporting results

The proof separates general arithmetic from the binary64 specialization:

| Module | Responsibility |
| --- | --- |
| [Geometry.lean](Boundragon/Geometry.lean) | Centered error and nearest-grid bounds |
| [Coarse.lean](Boundragon/Coarse.lean) | Strict coarse acceptance, rejection, and integer-radius endpoints |
| [Fine.lean](Boundragon/Fine.lean) | Rounding stability for an arbitrary positive integer modulus |
| [Binary64.lean](Boundragon/Binary64.lean) | Named decoder/coefficient definitions and the 2048/1024 arithmetic |
| [Decision.lean](Boundragon/Decision.lean) | Filter branches, input contract, and combined soundness theorem |
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
either choice into decimal components and may normalize trailing zeroes.

## Remaining proof obligations

The cache/error/radius hypotheses above are parameters of the theorem, not
additional axioms. The existing exact certificates check them for the caches,
but those certificate checkers have not yet been proved sound in Lean.

A full converter theorem still needs:

1. The two-grid shortestness argument, including decimal-decade crossings,
   canonical digit counts, and the small-subnormal exceptions.
2. The complete fallback, its floor-sum/congruence certificates, exceptional
   powers of two, and ties-to-even handling.
3. Actual cache generation/reconstruction bounds and exponent/shift helpers.
4. Canonical normalization and shortcuts, special values, sign handling, and
   the separate binary32 kernels.
5. A correspondence proof for the C++ fixed-width operations, masks, signed
   shifts, overflow bounds, dispatch, and optional assembly.

The current result is a kernel-checked proof of filter safety under explicit
contracts. It is not an end-to-end proof of C++, compiler translation, or
machine code, and it does not replace the existing certificates and tests.

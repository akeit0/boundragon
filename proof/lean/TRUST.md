# Proof trust and assumption review

The project proves an exact arithmetic model. It does not yet prove that the
complete compiled converter implements that model on every IEEE input.

## Checks against proof shortcuts

`lake build` checks every proof term and runs [Audit.lean](Boundragon/Audit.lean)
over every loaded declaration in the `Boundragon` namespace, including private names
after undoing Lean's internal name mangling. The audit follows
transitive axiom dependencies, including dependencies inside mathlib. Only
`propext`, `Classical.choice`, and `Quot.sound` are allowed: Lean's standard
propositional extensionality, classical choice, and quotient soundness.

Unfinished proofs depend on `sorryAx` and fail the audit. Custom axioms and
native-evaluation axioms fail it too. The proof sources contain no `sorry`,
`admit`, custom axiom declarations, `native_decide`, unsafe or partial
definitions, external implementations, or disabled checking options. Tactics
such as `omega`, `norm_num`, and `linarith` produce proof terms that the kernel
checks; they do not replace kernel checking with a numerical test.

`lake env leanchecker Boundragon` independently rechecks the compiled environment.
The audit prints the actual axiom lists for the principal theorems and example
optimality results. Logical axiom checks establish proof integrity, not that a
theorem statement expresses the complete intended algorithm.

After building, run `python tools/check_lean_audit.py` from the repository root.
This intentionally injects public/private unfinished proofs, public/private
custom axioms, and a transitive axiom outside the project namespace into an
ignored temporary file. Each must fail the audit with the expected disallowed
dependency. The temporary file is removed, and no canary is part of the library.
CI runs these rejection cases too.

## Assumptions are not discharged obligations

| Result | Assumed mathematical facts | What is derived |
| --- | --- | --- |
| `centered_normalized_decision_sound` | The explicit center/error/radius contract, `m >= 11`, and equality to an actual `some` model result | Canonicality, validity, shortestness over every decimal exponent, and unique closest selection |
| `cached_center_error` | Positive limb modulus, multiplier in its safe range, and a limb-underestimation bound | A one-sided center-error bound after product truncation |
| `decimal_cache_correct` | Arbitrary signed decimal exponent and positive cache width | The generation formula returns the exact normalized floor, has error below one, and fits the width |
| `generated_decimal_center_error` | Multiplier between zero and `2^64-1` | Error below two using the generated cache, with no supplied limb-error premise |
| `normal_shift_range` | `k` is the exact decimal order of `2^q` | The exact shift `q+E+12` lies in `[8,11]` |
| `generated_decimal_product_ranges` | 53-bit significand, shift at most 11, policy half-budget at most 3 | Shifted multiplier, widened cache product, and centered addition fit their widths |
| `exact_high_limb_radius` | The supplied high limb is the exact floor of the real significand | The radius-floor bounds after division |
| `affine_floor_sum_eq` | Endpoint ordering on a supplied piece and exact mathematical sum equality | Equality of every floor value on that piece |
| `fallback_fine_nearest_even` | Exact half-up equality, exact quarter detection, and coverage of halfway cases by quarters/three quarters | The actual +6/quarter model selects a nearest integer and an even integer at a tie |

The accepted-converter theorem does not assume output validity, canonicality,
shortestness, nearestness, or `False`. Its result equality only identifies the
branch returned by the reference function. [Examples.lean](Boundragon/Examples.lean)
proves the complete assumptions for three concrete accepted inputs and then
applies that theorem, so it is not vacuous because of an impossible contract.
The examples are exact-model witnesses, not IEEE bit-pattern/cache certificates.

`fallback_fine_nearest_even` is **conditional**. In particular, its half-up
equality is still a substantial numerical certificate obligation. No claim is
made that adding those hypotheses proves the certificate itself. The same
distinction applies to sum equality and compact cache reconstruction bounds.

Cache generation is a general kernel proof of the integer calculation and
its ranges; there is no table of per-entry proof certificates. It proves the
normalization exponent, floor equality, and error instead of adding them as
hypotheses. `decide +kernel` is used only for two endpoint inequalities in
the normal exponent range proof; this asks Lean's kernel to reduce exact
arithmetic and introduces no native-evaluation axiom.

The generated-cache results refer to `decimalCache`, not a presumed-correct
copy of a C++ literal. The generator's `--check` compares its output with the
entire committed header in CI. That artifact comparison and Python execution
are outside Lean; their correspondence to the proved arithmetic model is
still a distinct implementation obligation. The generator's compact-anchor
search and reconstruction are not covered by the exact-floor generation proof.

## Scope still requiring proof

The remaining boundary is [listed in the README](README.md#remaining-proof-obligations):
generator/header correspondence and compiled exponent helpers, compact cache
reconstruction, the Euclidean floor-sum evaluator and
certificate instances, complete fallback and irregular intervals, small
subnormals, dispatch, special values/signs/binary32, and correspondence to
C++ widths, masks, shifts, normalization shortcuts, and optional assembly.

Passing the axiom audit and kernel checker does not discharge any of these
implementation obligations.

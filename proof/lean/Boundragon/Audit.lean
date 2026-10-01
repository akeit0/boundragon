module

import Boundragon.Decision
import Boundragon.Decimal
import Boundragon.Shortest
import Boundragon.Certificates
import Boundragon.CoarseOptimal
import Boundragon.Accepted
import Boundragon.CacheScaling
import Boundragon.CacheGeneration
import Boundragon.IntegerRanges
import Boundragon.ExponentRanges
import Boundragon.Rounding
import Boundragon.FallbackRounding
import Boundragon.Examples
meta import Lean.Util.CollectAxioms
meta import Lean.Elab.Command

/-!
Fail the build if any Boundragon declaration transitively uses an axiom other
than Lean's standard logical axioms. This rejects unfinished proofs, custom
axioms, and native-evaluation axioms, including those in dependencies.
-/

run_cmd do
  let env := (← Lean.getEnv).setExporting false
  let allowed := #[`propext, `Classical.choice, `Quot.sound]
  let mut checked : Nat := 0
  -- Check exported axiom metadata, including imported declarations. Merely
  -- searching source text cannot detect a hidden axiom in a dependency.
  let required := #[`Boundragon.centered_normalized_decision_sound,
    `Boundragon.affine_floor_sum_eq, `Boundragon.cached_center_error,
    `Boundragon.remainder_indicator, `Boundragon.fallback_fine_nearest_even,
    `Boundragon.example_power_optimal, `Boundragon.example_coarse_optimal,
    `Boundragon.example_fine_optimal, `Boundragon.decimal_cache_correct,
    `Boundragon.generated_decimal_center_error, `Boundragon.normal_shift_range,
    `Boundragon.generated_decimal_product_ranges]
  for name in required do
    unless env.contains name do
      throwError "Missing required proof {name}"
    let axioms ← Lean.collectAxioms name
    Lean.logInfo m!"{name}: transitive axioms {axioms}"
  for (name, _) in env.constants do
    -- Lean mangles private names as `_private.<module>.<id>.Boundragon...`.
    -- Audit those too, even when no exported theorem depends on them yet.
    if (`Boundragon).isPrefixOf (Lean.privateToUserName name) then
      let axioms ← Lean.collectAxioms name
      for axiomName in axioms do
        unless allowed.contains axiomName do
          throwError "{name} depends on disallowed axiom {axiomName}"
      checked := checked + 1
  if checked == 0 then
    throwError "No Boundragon declarations were audited"
  Lean.logInfo m!"Axiom audit passed for {checked} Boundragon declarations."

module

import Boundragon.Decision
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
  unless env.contains `Boundragon.centered_decision_sound do
    throwError "Missing the centered filter soundness theorem"
  for (name, _) in env.constants do
    if (`Boundragon).isPrefixOf name then
      let axioms ← Lean.collectAxioms name
      for axiomName in axioms do
        unless allowed.contains axiomName do
          throwError "{name} depends on disallowed axiom {axiomName}"
      checked := checked + 1
  if checked == 0 then
    throwError "No Boundragon declarations were audited"
  Lean.logInfo m!"Axiom audit passed for {checked} Boundragon declarations."

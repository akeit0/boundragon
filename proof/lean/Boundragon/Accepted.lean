module

public import Boundragon.CoarseOptimal

/-! Optimality of every accepted result of the normalized centered model.
Fallback is still represented by `none`; cache contracts and C++ dispatch
are explicit assumptions rather than consequences of this model. -/

public section

namespace Boundragon

/-- Normalize either selected coefficient at its actual decimal scale. -/
@[expose] def normalizedChoice (choice : CenteredChoice) (k : ℤ) : DecimalRep :=
  match choice with
  | .coarse j => normalizeDecimal j.toNat (k + 1)
  | .fine n => normalizeDecimal n.toNat k

/-- Every accepted branch produces a canonical shortest and uniquely closest
decimal after reference normalization, including powers of ten. -/
theorem centered_normalized_optimal (u h c m : ℤ) (Y R : ℚ)
    (choice : CenteredChoice) (k : ℤ)
    (contract : CenteredContract2048 u h c m Y R) (hm : 11 ≤ m)
    (hresult : centeredDecision2048 u h c = some choice) :
    (normalizedChoice choice k).Optimal
      ((10 * Y / 2048) * pow10 k) ((10 * R / 2048) * pow10 k) := by
  cases choice with
  | coarse j => exact centered_coarse_optimal_scaled u h c m Y R j k contract hm hresult
  | fine n =>
    obtain ⟨D, hd⟩ := centered_fine_optimal_scaled u h c m Y R n k contract hm hresult
    have hn : 0 < n := lt_of_lt_of_le (pow_pos (by norm_num : (0 : ℤ) < 10) D)
      hd.wellFormed.1
    have hnN : 0 < n.toNat := by omega
    have hcastI : (n.toNat : ℤ) = n := by omega
    have hcast : (n.toNat : ℚ) = n := by exact_mod_cast hcastI
    obtain ⟨hw, hc, _, hv⟩ := normalize_decimal_correct n.toNat hnN k
    have hvalue : (normalizeDecimal n.toNat k).value = (DecimalRep.mk n k D).value := by
      rw [hv, hcast]
      rfl
    have hsame := canonical_decimal_unique _ _ hw hc hd.wellFormed hd.canonical hvalue
    change (normalizeDecimal n.toNat k).Optimal _ _
    rw [hsame]
    exact hd

/-- Exact reference converter for accepted centered branches. `none` still
means fallback; this definition makes no choice for rejected guards. -/
@[expose] def normalizedDecision2048 (u h c k : ℤ) : Option DecimalRep :=
  (centeredDecision2048 u h c).map (fun choice => normalizedChoice choice k)

/-- A `some` result of the normalized centered converter satisfies the
complete decimal optimality specification under the stated regular contract. -/
theorem centered_normalized_decision_sound (u h c m k : ℤ) (Y R : ℚ) (d : DecimalRep)
    (contract : CenteredContract2048 u h c m Y R) (hm : 11 ≤ m)
    (hresult : normalizedDecision2048 u h c k = some d) :
    d.Optimal ((10 * Y / 2048) * pow10 k) ((10 * R / 2048) * pow10 k) := by
  cases hdecision : centeredDecision2048 u h c with
  | none => simp [normalizedDecision2048, hdecision] at hresult
  | some choice =>
    have hchoice : normalizedChoice choice k = d := by
      simpa [normalizedDecision2048, hdecision] using hresult
    rw [← hchoice]
    exact centered_normalized_optimal u h c m Y R choice k contract hm hdecision

end Boundragon

module

public import Boundragon.Accepted
public import Boundragon.FallbackRounding

/-!
Kernel-checked witnesses: the filter contracts and accepted branches are
satisfiable. These examples do not certify any actual cache table or float bit
pattern; they test the exact model with concrete numerical inputs.

At scale 10^-2, the examples represent 1.00 (coarse power of ten),
1.20 (coarse ordinary), and 1.15 (fine). The parsing radius is 0.025.
All equalities below are proved, not merely displayed with `#eval`.
-/

public section

namespace Boundragon

theorem example_power_contract : CenteredContract2048 20480 512 1 20 20480 512 := by
  constructor <;> norm_num

theorem example_power_decision :
    normalizedDecision2048 20480 512 1 (-2) = some ⟨1, 0, 0⟩ := by
  norm_num [normalizedDecision2048, centeredDecision2048, coarseIndex2048,
    centeredResidual2048, fineCoefficient2048, normalizedChoice]
  change normalizeDecimal 10 (-1) = ⟨1, 0, 0⟩
  rw [normalizeDecimal]
  norm_num
  rw [normalizeDecimal]
  norm_num

theorem example_power_optimal : (DecimalRep.mk 1 0 0).Optimal 1 (1 / 40) := by
  have h := centered_normalized_decision_sound 20480 512 1 20 (-2) 20480 512 _
    example_power_contract (by norm_num) example_power_decision
  norm_num [pow10] at h
  exact h

theorem example_coarse_contract : CenteredContract2048 24576 512 1 24 24576 512 := by
  constructor <;> norm_num

theorem example_coarse_decision :
    normalizedDecision2048 24576 512 1 (-2) = some ⟨12, -1, 1⟩ := by
  have hdigits : Nat.log 10 12 = 1 :=
    Nat.log_eq_of_pow_le_of_lt_pow (by norm_num) (by norm_num)
  norm_num [normalizedDecision2048, centeredDecision2048, coarseIndex2048,
    centeredResidual2048, fineCoefficient2048, normalizedChoice]
  change normalizeDecimal 12 (-1) = ⟨12, -1, 1⟩
  rw [normalizeDecimal]
  norm_num [hdigits]

theorem example_coarse_optimal : (DecimalRep.mk 12 (-1) 1).Optimal (6 / 5) (1 / 40) := by
  have h := centered_normalized_decision_sound 24576 512 1 24 (-2) 24576 512 _
    example_coarse_contract (by norm_num) example_coarse_decision
  norm_num [pow10] at h
  exact h

theorem example_fine_contract : CenteredContract2048 23552 512 1 23 23552 512 := by
  constructor <;> norm_num

theorem example_fine_decision :
    normalizedDecision2048 23552 512 1 (-2) = some ⟨115, -2, 2⟩ := by
  have hdigits : Nat.log 10 115 = 2 :=
    Nat.log_eq_of_pow_le_of_lt_pow (by norm_num) (by norm_num)
  norm_num [normalizedDecision2048, centeredDecision2048, coarseIndex2048,
    centeredResidual2048, fineCoefficient2048, normalizedChoice]
  change normalizeDecimal 115 (-2) = ⟨115, -2, 2⟩
  rw [normalizeDecimal]
  norm_num [hdigits]

theorem example_fine_optimal : (DecimalRep.mk 115 (-2) 2).Optimal (23 / 20) (1 / 40) := by
  have h := centered_normalized_decision_sound 23552 512 1 23 (-2) 23552 512 _
    example_fine_contract (by norm_num) example_fine_decision
  norm_num [pow10] at h
  exact h

/-- These are the fallback's two exact tie fractions, including its +6. -/
theorem example_fallback_quarters :
    fallbackFine (2 ^ 62) = 2 ∧ fallbackFine (3 * 2 ^ 62) = 8 := by
  norm_num [fallbackFine, fallbackHalfUp, fallbackUnit]

/-- Parity correction works for positive and negative halfway inputs. -/
theorem example_even_ties :
    roundTiesToEven (5 / 2) = 2 ∧ roundTiesToEven (15 / 2) = 8 ∧
    roundTiesToEven (-5 / 2) = -2 ∧ roundTiesToEven (-3 / 2) = -2 := by
  norm_num [roundTiesToEven, roundHalfUp]

end Boundragon

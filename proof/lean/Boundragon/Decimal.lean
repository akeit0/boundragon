module

public import Boundragon.Geometry
public import Mathlib.Data.Nat.Log
public import Mathlib.Tactic.Ring
public import Mathlib.Tactic.Positivity

/-! Exact decimal values, significant-digit bounds, and decimal orders. -/

public section

namespace Boundragon

@[expose] def pow10 (e : ℤ) : ℚ := (10 : ℚ) ^ e

theorem pow10_pos (e : ℤ) : 0 < pow10 e := zpow_pos (by norm_num) e

theorem pow10_add (e f : ℤ) : pow10 (e + f) = pow10 e * pow10 f :=
  zpow_add₀ (by norm_num) e f

theorem pow10_step (e : ℤ) : pow10 (e + 1) = 10 * pow10 e := by
  rw [pow10_add]
  norm_num [pow10]
  ring

theorem pow10_nat (n : ℕ) : pow10 n = ((10 : ℤ) ^ n : ℚ) := by
  simp [pow10]

theorem pow10_mono {e f : ℤ} (h : e ≤ f) : pow10 e ≤ pow10 f :=
  zpow_le_zpow_right₀ (by norm_num) h

/-- `d` is one less than the coefficient's number of significant digits. -/
@[expose] def HasDigitIndex (n : ℤ) (d : ℕ) : Prop := (10 : ℤ) ^ d ≤ n ∧ n < 10 ^ (d + 1)

theorem digit_index_exists (n : ℤ) (hn : 0 < n) : ∃ d : ℕ, HasDigitIndex n d := by
  have hN : n.toNat ≠ 0 := by omega
  have hcast : n = (n.toNat : ℤ) := by omega
  refine ⟨Nat.log 10 n.toNat, ?_⟩
  unfold HasDigitIndex
  rw [hcast]
  constructor
  · exact_mod_cast Nat.pow_log_le_self 10 hN
  · exact_mod_cast Nat.lt_pow_succ_log_self (by norm_num : 1 < (10 : ℕ)) n.toNat

structure DecimalRep where
  coefficient : ℤ
  exponent : ℤ
  digitIndex : ℕ

@[expose] def DecimalRep.value (d : DecimalRep) : ℚ := d.coefficient * pow10 d.exponent

@[expose] def DecimalRep.WellFormed (d : DecimalRep) : Prop := HasDigitIndex d.coefficient d.digitIndex

@[expose] def DecimalRep.Canonical (d : DecimalRep) : Prop := ¬(10 : ℤ) ∣ d.coefficient

/-- Change the unit of a decimal without changing its significant digits. -/
@[expose] def DecimalRep.shift (d : DecimalRep) (k : ℤ) : DecimalRep :=
  { d with exponent := d.exponent + k }

theorem decimal_shift_value (d : DecimalRep) (k : ℤ) :
    (d.shift k).value = d.value * pow10 k := by
  simp only [DecimalRep.shift, DecimalRep.value, pow10_add]
  ring

theorem decimal_shift_cancel (d : DecimalRep) (k : ℤ) :
    (d.shift (-k)).value * pow10 k = d.value := by
  rw [decimal_shift_value, mul_assoc, ← pow10_add]
  simp [pow10]

theorem decimal_shift_distance (x : ℚ) (d : DecimalRep) (k : ℤ) :
    |x * pow10 k - (d.shift k).value| = |x - d.value| * pow10 k := by
  rw [decimal_shift_value, ← sub_mul, abs_mul, abs_of_pos (pow10_pos k)]

@[expose] def HasOrder (x : ℚ) (N : ℤ) : Prop := pow10 N ≤ x ∧ x < pow10 (N + 1)

/-- Coefficient digits and exponent determine the value's decimal order. -/
theorem decimal_order (d : DecimalRep) (hd : d.WellFormed) :
    HasOrder d.value (d.exponent + (d.digitIndex : ℤ)) := by
  have hlo : (((10 : ℤ) ^ d.digitIndex : ℤ) : ℚ) ≤ d.coefficient := by exact_mod_cast hd.1
  have hhi : (d.coefficient : ℚ) < ((10 : ℤ) ^ (d.digitIndex + 1) : ℚ) := by
    exact_mod_cast hd.2
  push_cast at hlo hhi
  have hp := pow10_pos d.exponent
  unfold HasOrder DecimalRep.value
  constructor
  · rw [pow10_add, pow10_nat]
    push_cast
    nlinarith
  · rw [show d.exponent + (d.digitIndex : ℤ) + 1 =
        d.exponent + ((d.digitIndex + 1 : ℕ) : ℤ) by omega, pow10_add, pow10_nat]
    push_cast
    nlinarith

theorem decimal_order_unique (x : ℚ) (N M : ℤ)
    (hN : HasOrder x N) (hM : HasOrder x M) : N = M := by
  by_contra hne
  rcases lt_or_gt_of_ne hne with hlt | hgt
  · have hp := pow10_mono (show N + 1 ≤ M by omega)
    linarith [hN.2, hM.1]
  · have hp := pow10_mono (show M + 1 ≤ N by omega)
    linarith [hM.2, hN.1]

/-- Every decimal power at or above the coarse spacing is a coarse-grid point. -/
theorem pow10_on_coarse (e : ℤ) (he : 1 ≤ e) : ∃ j : ℤ, pow10 e = 10 * j := by
  let n := (e - 1).toNat
  have hexp : e = (n : ℤ) + 1 := by dsimp [n]; omega
  rw [hexp, pow10_step, pow10_nat]
  exact ⟨(10 : ℤ) ^ n, by push_cast; rfl⟩

theorem decimal_on_coarse (d : DecimalRep) (he : 1 ≤ d.exponent) :
    ∃ j : ℤ, d.value = 10 * j := by
  obtain ⟨j, hj⟩ := pow10_on_coarse d.exponent he
  refine ⟨d.coefficient * j, ?_⟩
  simp only [DecimalRep.value, hj, Int.cast_mul]
  ring

end Boundragon

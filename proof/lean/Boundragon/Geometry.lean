module

public import Mathlib.Data.Rat.Floor
public import Mathlib.Tactic.Linarith

/-! Exact rational error bounds and nearest-grid geometry. -/

public section

namespace Boundragon

/-- Centering a one-sided error of size `2c` gives `[-c,c)`. -/
theorem center_error (Y : ℚ) (u c : ℤ)
    (herr : 0 ≤ Y - u ∧ Y - u < 2 * c) :
    -(c : ℚ) ≤ Y - (u + c) ∧ Y - (u + c) < c := by
  constructor <;> linarith [herr.1, herr.2]

/-- The half-open centered contract also gives a closed absolute error bound. -/
theorem centered_error_abs (Y : ℚ) (v c : ℤ)
    (herr : -(c : ℚ) ≤ Y - v ∧ Y - v < c) : |Y - v| ≤ (c : ℚ) :=
  abs_le.mpr ⟨herr.1, herr.2.le⟩

/-- The centered quotient selects a nearest coarse-grid point. -/
theorem centered_nearest (K v : ℚ) (j : ℤ) (hK : 0 < K)
    (hw : -K / 2 ≤ v - K * j ∧ v - K * j < K / 2) :
    ∀ i : ℤ, |v - K * j| ≤ |v - K * i| := by
  intro i
  rcases lt_trichotomy i j with hij | rfl | hji
  · have hstepI : i + 1 ≤ j := by omega
    have hstepQ : (i : ℚ) + 1 ≤ j := by exact_mod_cast hstepI
    have hstep : K * i + K ≤ K * j := by nlinarith
    have hdist : |v - K * j| ≤ v - K * i := by
      apply abs_le.mpr
      constructor <;> linarith [hw.1, hw.2]
    exact hdist.trans (le_abs_self _)
  · exact le_rfl
  · have hstepI : j + 1 ≤ i := by omega
    have hstepQ : (j : ℚ) + 1 ≤ i := by exact_mod_cast hstepI
    have hstep : K * j + K ≤ K * i := by nlinarith
    have hdist : |v - K * j| ≤ -(v - K * i) := by
      apply abs_le.mpr
      constructor <;> linarith [hw.1, hw.2]
    exact hdist.trans (neg_le_abs _)

/-- A decimal-half tie is impossible inside these strict rounding bounds. -/
theorem nearest_integer_unique (x : ℚ) (n : ℤ) (hne : |x - n| < 1 / 2) :
    ∀ i : ℤ, i ≠ n → |x - n| < |x - i| := by
  have hb := abs_lt.mp hne
  intro i hi
  rcases lt_or_gt_of_ne hi with hin | hni
  · have hstepI : i + 1 ≤ n := by omega
    have hstep : (i : ℚ) + 1 ≤ n := by exact_mod_cast hstepI
    have hbound := le_abs_self (x - i)
    linarith [hb.1]
  · have hstepI : n + 1 ≤ i := by omega
    have hstep : (n : ℚ) + 1 ≤ i := by exact_mod_cast hstepI
    have hbound := neg_le_abs (x - i)
    linarith [hb.2]

end Boundragon

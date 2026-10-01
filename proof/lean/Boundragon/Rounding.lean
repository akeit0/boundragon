module

public import Boundragon.Geometry

/-!
Nearest-integer rounding with the converter's ties-to-even policy.
This proves the rounding policy itself. The fallback's `+6` expression and
quarter detector still need certificate hypotheses to connect to exact input.
-/

public section

namespace Boundragon

/-- Half-up rounding chooses the upper integer at an exact halfway point. -/
@[expose] def roundHalfUp (x : ℚ) : ℤ := ⌊x + 1 / 2⌋

/-- Correct a half-up tie only when its chosen upper integer is odd.
Euclidean `% 2` gives the same parity test for negative integers. -/
@[expose] def roundTiesToEven (x : ℚ) : ℤ :=
  let upper := roundHalfUp x
  if x = (upper : ℚ) - 1 / 2 ∧ upper % 2 ≠ 0 then upper - 1 else upper

/-- Closest among all integers; if another integer is equally close, choose
an even result. This permits genuine ties instead of asserting uniqueness. -/
structure NearestEven (x : ℚ) (n : ℤ) : Prop where
  nearest : ∀ i : ℤ, |x - n| ≤ |x - i|
  even_at_tie : ∀ i : ℤ, i ≠ n → |x - n| = |x - i| → n % 2 = 0

/-- A closed half-step bound gives nearestness but may include ties. -/
theorem nearest_integer_closed (x : ℚ) (n : ℤ) (hbound : |x - n| ≤ 1 / 2) :
    ∀ i : ℤ, |x - n| ≤ |x - i| := by
  have hb := abs_le.mp hbound
  intro i
  rcases lt_trichotomy i n with hi | rfl | hi
  · have hstepI : i + 1 ≤ n := by omega
    have hstep : (i : ℚ) + 1 ≤ n := by exact_mod_cast hstepI
    linarith [le_abs_self (x - i)]
  · exact le_rfl
  · have hstepI : n + 1 ≤ i := by omega
    have hstep : (n : ℚ) + 1 ≤ i := by exact_mod_cast hstepI
    linarith [neg_le_abs (x - i)]

/-- A distinct equally close integer can occur only at distance one half. -/
theorem integer_tie_distance (x : ℚ) (n i : ℤ) (hbound : |x - n| ≤ 1 / 2)
    (hne : i ≠ n) (htie : |x - n| = |x - i|) : |x - n| = 1 / 2 := by
  have hb := abs_le.mp hbound
  rcases lt_or_gt_of_ne hne with hi | hi
  · have hstepI : i + 1 ≤ n := by omega
    have hstep : (i : ℚ) + 1 ≤ n := by exact_mod_cast hstepI
    linarith [le_abs_self (x - i)]
  · have hstepI : n + 1 ≤ i := by omega
    have hstep : (n : ℚ) + 1 ≤ i := by exact_mod_cast hstepI
    linarith [neg_le_abs (x - i)]

/-- Half-up gives the half-open cell `[upper-1/2, upper+1/2)`. -/
theorem round_half_up_bounds (x : ℚ) :
    -(1 / 2 : ℚ) ≤ x - roundHalfUp x ∧ x - roundHalfUp x < 1 / 2 := by
  have hlo := Int.floor_le (x + 1 / 2)
  have hhi := Int.lt_floor_add_one (x + 1 / 2)
  unfold roundHalfUp
  constructor <;> linarith

/-- The exact nearest/even specification follows from floor bounds and
the parity correction, without assumptions about the selected output. -/
theorem round_ties_to_even_correct (x : ℚ) : NearestEven x (roundTiesToEven x) := by
  let upper := roundHalfUp x
  have hb := round_half_up_bounds x
  have hchoice : |x - roundTiesToEven x| ≤ 1 / 2 ∧
      (|x - roundTiesToEven x| = 1 / 2 → roundTiesToEven x % 2 = 0) := by
    by_cases hcorrect : x = (upper : ℚ) - 1 / 2 ∧ upper % 2 ≠ 0
    · simp only [roundTiesToEven, show roundHalfUp x = upper from rfl, if_pos hcorrect]
      have heq : x - ((upper - 1 : ℤ) : ℚ) = 1 / 2 := by push_cast; linarith [hcorrect.1]
      rw [heq]
      norm_num
      omega
    · simp only [roundTiesToEven, show roundHalfUp x = upper from rfl, if_neg hcorrect]
      refine ⟨abs_le.mpr ⟨hb.1, hb.2.le⟩, ?_⟩
      intro htie
      have hboundary : x = (upper : ℚ) - 1 / 2 := by
        rcases le_total 0 (x - (upper : ℚ)) with hpos | hneg
        · rw [abs_of_nonneg hpos] at htie
          linarith [hb.2]
        · rw [abs_of_nonpos hneg] at htie
          linarith
      by_contra hodd
      exact hcorrect ⟨hboundary, hodd⟩
  refine ⟨nearest_integer_closed x _ hchoice.1, ?_⟩
  intro i hi htie
  exact hchoice.2 (integer_tie_distance x _ i hchoice.1 hi htie)

end Boundragon

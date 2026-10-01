module

public import Boundragon.Rounding
public import Boundragon.Remainders

/-!
The fine-rounding part of `finish_regular` in `decimal_core.h`.
`scaled` is F = floor(product / 2^9); its remainder modulo 2^64 is `f`.
The model retains the actual +6 and exact-quarter override from C++.

The theorem below consumes three numerical certificate properties. None says
that the answer is nearest/even. Those properties are NOT yet certified for
all compiled tables in Lean, so this is not a full fallback correctness proof.
-/

public section

namespace Boundragon

/-- The full fallback limb modulus; distinct from the filter's 2048 unit. -/
@[expose] def fallbackUnit : ℤ := 2 ^ 64

/-- The global fine integer before the exact-quarter correction. -/
@[expose] def fallbackHalfUp (scaled : ℤ) : ℤ :=
  (10 * scaled + fallbackUnit / 2 + 6) / fallbackUnit

/-- At an exact quarter the C++ digit override is 2. Otherwise retain
the actual +6 rounding. `scaled / fallbackUnit` is the integral coarse part. -/
@[expose] def fallbackFine (scaled : ℤ) : ℤ :=
  if scaled % fallbackUnit = fallbackUnit / 4 then
    10 * (scaled / fallbackUnit) + 2
  else fallbackHalfUp scaled

/-- On a detected quarter, the actual +6 expression gives digit 3, so
overriding it to 2 is exactly subtraction of one from the global fine integer. -/
theorem fallback_quarter_correction (scaled : ℤ) :
    fallbackFine scaled = fallbackHalfUp scaled -
      (if scaled % fallbackUnit = fallbackUnit / 4 then 1 else 0) := by
  unfold fallbackFine fallbackHalfUp
  norm_num [fallbackUnit]
  split_ifs <;> omega

/-- A quarter of a coarse step is a fine-grid tie at digit 2.5. -/
theorem half_up_at_quarter (z : ℚ) (j : ℤ) (hz : z = (j : ℚ) + 1 / 4) :
    roundHalfUp (10 * z) = 10 * j + 3 := by
  unfold roundHalfUp
  apply Int.floor_eq_iff.mpr
  push_cast
  constructor <;> linarith

/-- Three quarters gives digit 7.5; half-up already selects the even digit 8. -/
theorem half_up_at_three_quarters (z : ℚ) (j : ℤ) (hz : z = (j : ℚ) + 3 / 4) :
    roundHalfUp (10 * z) = 10 * j + 8 := by
  unfold roundHalfUp
  apply Int.floor_eq_iff.mpr
  push_cast
  constructor <;> linarith

/-- Numerical certificate interface for the fallback's fine rounding.

* `half_up_exact`: the actual +6 expression equals exact half-up rounding.
* `quarter_exact`: the compiled remainder detector has no missed or false quarters.
* `half_cases`: the domain's exact halfway values are quarters or three quarters.

These are precisely the remaining floor-sum/congruence certificate facts;
nearestness and the even tie policy are derived below, not assumed.
-/
theorem fallback_fine_nearest_even (scaled : ℤ) (z : ℚ)
    (half_up_exact : fallbackHalfUp scaled = roundHalfUp (10 * z))
    (quarter_exact : scaled % fallbackUnit = fallbackUnit / 4 ↔
      ∃ j : ℤ, z = (j : ℚ) + 1 / 4)
    (half_cases : ∀ j : ℤ, z = (j : ℚ) / 10 + 1 / 20 →
      (∃ k : ℤ, z = (k : ℚ) + 1 / 4) ∨ (∃ k : ℤ, z = (k : ℚ) + 3 / 4)) :
    NearestEven (10 * z) (fallbackFine scaled) := by
  let upper := roundHalfUp (10 * z)
  have hcorrect : scaled % fallbackUnit = fallbackUnit / 4 ↔
      10 * z = (upper : ℚ) - 1 / 2 ∧ upper % 2 ≠ 0 := by
    constructor
    · intro hquarter
      obtain ⟨j, hz⟩ := quarter_exact.mp hquarter
      have hu : upper = 10 * j + 3 := half_up_at_quarter z j hz
      constructor
      · rw [hu]; push_cast; linarith
      · rw [hu]; omega
    · rintro ⟨hhalf, hodd⟩
      have hz : z = ((upper - 1 : ℤ) : ℚ) / 10 + 1 / 20 := by
        push_cast
        linarith
      rcases half_cases (upper - 1) hz with hquarter | ⟨j, hthree⟩
      · exact quarter_exact.mpr hquarter
      · have hu : upper = 10 * j + 8 := half_up_at_three_quarters z j hthree
        rw [hu] at hodd
        omega
  have hvalue : fallbackFine scaled = roundTiesToEven (10 * z) := by
    rw [fallback_quarter_correction, half_up_exact]
    change upper - (if scaled % fallbackUnit = fallbackUnit / 4 then 1 else 0) =
      if 10 * z = (upper : ℚ) - 1 / 2 ∧ upper % 2 ≠ 0 then upper - 1 else upper
    simp only [← hcorrect]
    split_ifs <;> omega
  rw [hvalue]
  exact round_ties_to_even_correct (10 * z)

end Boundragon

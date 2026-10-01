module

public import Boundragon.Geometry
public import Mathlib.RingTheory.Coprime.Lemmas
public import Mathlib.Tactic.Ring
public import Mathlib.Tactic.Positivity

/-! Coarse acceptance, rejection, and the integer-radius endpoint lemma. -/

public section

namespace Boundragon

/-- An odd factor cannot make a smaller positive integer divisible by `2^A`. -/
theorem odd_mul_ne_power_two_mul (A : ℕ) (m r j : ℤ)
    (hr : 0 < r) (hrK : r < (2 : ℤ) ^ A) :
    (2 * m + 1) * r ≠ (2 : ℤ) ^ A * j := by
  intro heq
  have hc : IsCoprime (2 : ℤ) (2 * m + 1) := ⟨-m, 1, by ring⟩
  have hd : (2 : ℤ) ^ A ∣ (2 * m + 1) * r := ⟨j, heq⟩
  have hdr : (2 : ℤ) ^ A ∣ r := hc.pow_left.dvd_of_dvd_mul_left hd
  have hle := Int.le_of_dvd hr hdr
  exact (not_le_of_gt hrK) hle

/-- Neither integer-radius binary endpoint lies on the coarse grid. -/
theorem integer_radius_no_endpoint (A : ℕ) (m h j : ℤ)
    (hh : 0 < h) (hhK : h < (2 : ℤ) ^ A) :
    |2 * (m : ℚ) * h - (2 : ℚ) ^ A * j| ≠ (h : ℚ) := by
  intro heq
  rcases le_total 0 (2 * (m : ℚ) * h - (2 : ℚ) ^ A * j) with hpos | hneg
  · rw [abs_of_nonneg hpos] at heq
    have hi : (2 * m - 1) * h = (2 : ℤ) ^ A * j := by
      have hq : (((2 * m - 1) * h : ℤ) : ℚ) =
          (((2 : ℤ) ^ A * j : ℤ) : ℚ) := by
        push_cast
        linarith
      exact_mod_cast hq
    apply odd_mul_ne_power_two_mul A (m - 1) h j hh hhK
    convert hi using 1; ring
  · rw [abs_of_nonpos hneg] at heq
    have hi : (2 * m + 1) * h = (2 : ℤ) ^ A * j := by
      have hq : (((2 * m + 1) * h : ℤ) : ℚ) =
          (((2 : ℤ) ^ A * j : ℤ) : ℚ) := by
        push_cast
        linarith
      exact_mod_cast hq
    exact odd_mul_ne_power_two_mul A m h j hh hhK hi

/-- Coarse acceptance is strict, including at open binary endpoints.

`Y = 2mR` and `0 < R < K/2` are the regular binary interval geometry.
`h = floor R` and the centered error bound are cache-contract hypotheses.
-/
theorem centered_coarse_accept (A : ℕ) (m v j h c : ℤ) (Y R : ℚ)
    (hRpos : 0 < R) (hRsmall : R < (2 : ℚ) ^ A / 2)
    (hgeometry : Y = 2 * (m : ℚ) * R)
    (hradius : (h : ℚ) ≤ R ∧ R < (h : ℚ) + 1)
    (herr : -(c : ℚ) ≤ Y - v ∧ Y - v < c)
    (hguard : |(v : ℚ) - (2 : ℚ) ^ A * j| ≤ (h : ℚ) - c) :
    |Y - (2 : ℚ) ^ A * j| < R := by
  have he := centered_error_abs Y v c herr
  have hdist : |Y - (2 : ℚ) ^ A * j| ≤ (h : ℚ) := by
    have htriangle := abs_sub_le Y (v : ℚ) ((2 : ℚ) ^ A * j)
    linarith
  rcases lt_or_eq_of_le hradius.1 with hlt | heq
  · exact hdist.trans_lt hlt
  · have hhQ : 0 < (h : ℚ) := by linarith
    have hh : 0 < h := by exact_mod_cast hhQ
    have hK : (0 : ℚ) < 2 ^ A := by positivity
    have hhKQ : (h : ℚ) < (2 : ℚ) ^ A := by linarith
    have hhK : h < (2 : ℤ) ^ A := by exact_mod_cast hhKQ
    have hne : |Y - (2 : ℚ) ^ A * j| ≠ (h : ℚ) := by
      rw [hgeometry, ← heq]
      exact integer_radius_no_endpoint A m h j hh hhK
    exact lt_of_le_of_ne (hdist.trans hradius.1) (by simpa [← heq] using hne)

/-- Coarse rejection excludes every coarse-grid point, not only the chosen one. -/
theorem centered_coarse_reject (K Y R : ℚ) (v j h c : ℤ)
    (hK : 0 < K)
    (hw : -K / 2 ≤ (v : ℚ) - K * j ∧ (v : ℚ) - K * j < K / 2)
    (hradius : R < (h : ℚ) + 1)
    (herr : -(c : ℚ) ≤ Y - v ∧ Y - v < c)
    (hguard : (h : ℚ) + c + 1 ≤ |(v : ℚ) - K * j|) :
    ∀ i : ℤ, R < |Y - K * i| := by
  intro i
  have he := centered_error_abs Y v c herr
  have hnearest := centered_nearest K v j hK hw i
  have htriangle := abs_sub_le (v : ℚ) Y (K * i)
  rw [abs_sub_comm (v : ℚ) Y] at htriangle
  linarith

/-- Outside the ambiguity shell, the coarse guard is accepting or rejecting. -/
theorem coarse_guard_partition (D h c : ℤ) :
    ¬(-c + 1 ≤ D - h ∧ D - h ≤ c) ↔ D ≤ h - c ∨ h + c + 1 ≤ D := by
  omega

end Boundragon

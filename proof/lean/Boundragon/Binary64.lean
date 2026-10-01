module

public import Boundragon.Coarse
public import Boundragon.Fine

/-!
Binary64 decoding, guard identities, and the 2048/1024 specialization.
The filter uses 2048 units per coarse decimal step and 2048/10 per fine step.
1024 is its half-step; it is also the modulus after halving the fine numerator.
Definitions model exact signed arithmetic. C++ widths/overflow are separate.
-/

public section

namespace Boundragon

/-- Coarse quotient after moving the estimate to the center of its error range. -/
@[expose] def coarseIndex2048 (u c : ℤ) : ℤ := (u + 1024 + c) / 2048

/-- Signed residual of the centered estimate relative to its coarse candidate. -/
@[expose] def centeredResidual2048 (u c : ℤ) : ℤ := (u + 1024 + c) % 2048 - 1024

/-- Coarse coefficient plus the certified signed fine increment. -/
@[expose] def fineCoefficient2048 (j w : ℤ) : ℤ := 10 * j + (5 * w + 512) / 1024

/-- Mathematical quotient/remainder form of the binary64 centered decoding. -/
theorem centered_decode_2048 (u c : ℤ) :
    let j := coarseIndex2048 u c
    let w := centeredResidual2048 u c
    u + c = 2048 * j + w ∧ -1024 ≤ w ∧ w < 1024 := by
  dsimp [coarseIndex2048, centeredResidual2048]
  have hd := Int.mul_ediv_add_emod (u + 1024 + c) 2048
  have hlo := Int.emod_nonneg (u + 1024 + c) (by norm_num : (2048 : ℤ) ≠ 0)
  have hhi := Int.emod_lt_of_pos (u + 1024 + c) (by norm_num : (0 : ℤ) < 2048)
  omega

/-- The integer decoder and rational geometry use the same signed residual. -/
theorem centered_residual_eq_2048 (u c : ℤ) :
    ((u + c : ℤ) : ℚ) - 2048 * coarseIndex2048 u c = centeredResidual2048 u c := by
  have hdecode := (centered_decode_2048 u c).1
  have hInt : u + c - 2048 * coarseIndex2048 u c = centeredResidual2048 u c := by
    omega
  exact_mod_cast hInt

/-- Rational residual bounds needed to select a nearest coarse candidate. -/
theorem centered_residual_bounds_2048 (u c : ℤ) :
    -(2048 : ℚ) / 2 ≤ ((u + c : ℤ) : ℚ) - 2048 * coarseIndex2048 u c ∧
    ((u + c : ℤ) : ℚ) - 2048 * coarseIndex2048 u c < 2048 / 2 := by
  rw [centered_residual_eq_2048]
  norm_num only
  exact_mod_cast (centered_decode_2048 u c).2

/-- The coarse distance is the absolute integer residual, after casting. -/
theorem centered_distance_eq_2048 (u c : ℤ) :
    |((u + c : ℤ) : ℚ) - 2048 * coarseIndex2048 u c| =
      (|centeredResidual2048 u c| : ℤ) := by
  rw [centered_residual_eq_2048]
  norm_cast

/-- Binary64 specialization of strict coarse acceptance. -/
theorem centered_coarse_accept_2048 (m v j h c : ℤ) (Y R : ℚ)
    (hRpos : 0 < R) (hRmax : R < 1024)
    (hgeometry : Y = 2 * (m : ℚ) * R)
    (hradius : (h : ℚ) ≤ R ∧ R < (h : ℚ) + 1)
    (herr : -(c : ℚ) ≤ Y - v ∧ Y - v < c)
    (hguard : |(v : ℚ) - 2048 * j| ≤ (h : ℚ) - c) :
    |Y - 2048 * j| < R := by
  have hpow : (2 : ℚ) ^ 11 = 2048 := by norm_num
  simpa only [hpow] using centered_coarse_accept 11 m v j h c Y R hRpos
    (by simpa only [hpow, show (2048 : ℚ) / 2 = 1024 from by norm_num] using hRmax)
    hgeometry hradius herr (by simpa only [hpow] using hguard)

/-- The unsigned 32-bit ambiguity comparison matches the mathematical shell
on the residual/radius/error domain used by the binary64 centered filters.
The surrounding C++ casts and operations still require a correspondence proof.
-/
theorem coarse_unsigned_guard (D h c : ℤ)
    (hD : 0 ≤ D ∧ D ≤ 1024) (hh : 0 ≤ h ∧ h ≤ 1023)
    (hc : 1 ≤ c ∧ c ≤ 3) :
    (D - h + c - 1) % 4294967296 < 2 * c ↔ -c + 1 ≤ D - h ∧ D - h ≤ c := by
  omega

/-- Halving the fine numerator and modulus preserves signed floor division. -/
theorem halved_round_eq (w : ℤ) :
    (10 * w + 1024) / 2048 = (5 * w + 512) / 1024 := by
  omega

/-- Halving the shifted fine guard preserves its ambiguity decision (`c=1`). -/
theorem halved_guard_eq (w : ℤ) :
    ((10 * w + 1034) % 2048 ≤ 20) ↔ ((5 * w + 517) % 1024 ≤ 10) := by
  have he : (10 * w + 1034) % 2048 = 2 * ((5 * w + 517) % 1024) := by
    have hd := Int.mul_emod_mul_of_pos (5 * w + 517) 1024 (by norm_num : (0 : ℤ) < 2)
    have hf : 10 * w + 1034 = 2 * (5 * w + 517) := by ring
    rw [hf]
    exact hd
  rw [he]
  omega

/-- For `K=2048`, an accepted fine coefficient is within half a fine step.
It is therefore uniquely nearest; in particular it cannot be a decimal tie.
-/
theorem fine_coefficient_nearest_2048 (Y : ℚ) (v j w c : ℤ)
    (hdecode : v = 2048 * j + w) (hc : 0 ≤ c)
    (herr : -(c : ℚ) ≤ Y - v ∧ Y - v < c)
    (hguard : 10 * c < (5 * w + 512 + 5 * c) % 1024) :
    |10 * Y / 2048 - (fineCoefficient2048 j w : ℚ)| < 1 / 2 := by
  obtain ⟨_, hlo, hhi⟩ := centered_fine_round (5 * w + 512) c 1024 (Y - v)
    (by norm_num) hc herr hguard
  have hdQ : (v : ℚ) = 2048 * (j : ℚ) + w := by exact_mod_cast hdecode
  have heq : (((5 * w + 512 : ℤ) : ℚ) + 5 * (Y - v)) / 1024 =
      10 * Y / 2048 - 10 * j + 1 / 2 := by
    push_cast
    linarith
  norm_num only [Nat.cast_ofNat, Int.cast_ofNat] at hlo hhi
  rw [heq] at hlo hhi
  apply abs_lt.mpr
  dsimp only [fineCoefficient2048]
  push_cast
  constructor <;> linarith

/-- Accepted fine output is strictly closer than every other fine coefficient. -/
theorem fine_coefficient_unique_2048 (Y : ℚ) (v j w c : ℤ)
    (hdecode : v = 2048 * j + w) (hc : 0 ≤ c)
    (herr : -(c : ℚ) ≤ Y - v ∧ Y - v < c)
    (hguard : 10 * c < (5 * w + 512 + 5 * c) % 1024) :
    ∀ i : ℤ, i ≠ fineCoefficient2048 j w →
      |10 * Y / 2048 - (fineCoefficient2048 j w : ℚ)| <
        |10 * Y / 2048 - i| :=
  nearest_integer_unique _ _
    (fine_coefficient_nearest_2048 Y v j w c hdecode hc herr hguard)

/-- The regular interval is at least one fine step wide, so the certified
nearest fine coefficient lies strictly inside it. -/
theorem fine_coefficient_valid_2048 (Y R : ℚ) (v j w c : ℤ)
    (hdecode : v = 2048 * j + w) (hc : 0 ≤ c)
    (herr : -(c : ℚ) ≤ Y - v ∧ Y - v < c)
    (hguard : 10 * c < (5 * w + 512 + 5 * c) % 1024)
    (hRmin : (2048 : ℚ) / 20 ≤ R) :
    |Y - 2048 * (fineCoefficient2048 j w : ℚ) / 10| < R := by
  have hnear := fine_coefficient_nearest_2048 Y v j w c hdecode hc herr hguard
  calc
    |Y - 2048 * (fineCoefficient2048 j w : ℚ) / 10| =
        |(2048 / 10 : ℚ) *
          (10 * Y / 2048 - (fineCoefficient2048 j w : ℚ))| := by
      congr 1; ring
    _ = (2048 / 10 : ℚ) *
        |10 * Y / 2048 - (fineCoefficient2048 j w : ℚ)| := by
      rw [abs_mul]
      norm_num
    _ < (2048 : ℚ) / 20 := by linarith
    _ ≤ R := hRmin

end Boundragon

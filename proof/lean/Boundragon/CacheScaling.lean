module

public import Boundragon.Remainders

/-!
From cache-limb accuracy to the filter's one-sided center/radius contracts.
`exactLimb` is the exact normalized real significand, `cachedLimb` the integer
actually multiplied, and `multiplier < Q` the safe product domain.
These are general implications, not certificates for the stored cache tables.
-/

public section

namespace Boundragon

/-- Integer product truncation used by the filter, in mathematical units. -/
@[expose] def cachedCenter (multiplier cachedLimb : ℤ) (Q : ℕ) : ℤ :=
  ⌊(multiplier : ℚ) * cachedLimb / Q⌋

/-- The rational floor definition is exactly the integer product quotient,
so it describes truncation rather than introducing an independent estimator. -/
theorem cached_center_eq_quotient (multiplier cachedLimb : ℤ) (Q : ℕ) :
    cachedCenter multiplier cachedLimb Q = (multiplier * cachedLimb) / (Q : ℤ) := by
  unfold cachedCenter
  rw [← Int.cast_mul, Rat.floor_intCast_div_natCast]

/-- Limb underestimation less than `limbError` becomes center error less
than `limbError + 1`: multiplication adds less than `limbError`, and the
integer floor discards less than one. -/
theorem cached_center_error (multiplier cachedLimb : ℤ) (Q : ℕ)
    (exactLimb limbError : ℚ) (hQ : 0 < Q)
    (hmultiplier : 0 ≤ multiplier ∧ multiplier < (Q : ℤ))
    (herror : 0 ≤ exactLimb - cachedLimb ∧ exactLimb - cachedLimb < limbError) :
    0 ≤ (multiplier : ℚ) * exactLimb / Q - cachedCenter multiplier cachedLimb Q ∧
      (multiplier : ℚ) * exactLimb / Q - cachedCenter multiplier cachedLimb Q < limbError + 1 := by
  have hQpos : (0 : ℚ) < Q := by exact_mod_cast hQ
  have hmultiplierQ : 0 ≤ (multiplier : ℚ) ∧ (multiplier : ℚ) < Q := by
    exact_mod_cast hmultiplier
  have hratio : 0 ≤ (multiplier : ℚ) / Q ∧ (multiplier : ℚ) / Q < 1 := by
    constructor
    · exact div_nonneg hmultiplierQ.1 hQpos.le
    · apply (div_lt_iff₀ hQpos).mpr
      simpa using hmultiplierQ.2
  have hdiscard := Int.floor_le ((multiplier : ℚ) * cachedLimb / Q)
  have hdiscardUpper := Int.lt_floor_add_one ((multiplier : ℚ) * cachedLimb / Q)
  have hproduct : 0 ≤ ((multiplier : ℚ) / Q) * (exactLimb - cachedLimb) ∧
      ((multiplier : ℚ) / Q) * (exactLimb - cachedLimb) < limbError := by
    constructor
    · exact mul_nonneg hratio.1 herror.1
    · nlinarith [mul_nonneg (sub_nonneg.mpr hratio.2.le) herror.1]
  have hsplit : (multiplier : ℚ) * exactLimb / Q - cachedCenter multiplier cachedLimb Q =
      ((multiplier : ℚ) * cachedLimb / Q - cachedCenter multiplier cachedLimb Q) +
        ((multiplier : ℚ) / Q) * (exactLimb - cachedLimb) := by ring
  rw [hsplit]
  unfold cachedCenter
  constructor <;> linarith [hproduct.1, hproduct.2]

/-- The policy half-budget `c` corresponds to a limb-error budget `2*c-1`.
Thus errors below 1, 3, and 5 limb units yield filter errors below 2, 4, and 6.
The caller must prove the limb bound for the cache actually consumed. -/
theorem cached_center_policy_bound (multiplier cachedLimb c : ℤ) (Q : ℕ)
    (exactLimb : ℚ) (hQ : 0 < Q)
    (hmultiplier : 0 ≤ multiplier ∧ multiplier < (Q : ℤ))
    (herror : 0 ≤ exactLimb - cachedLimb ∧ exactLimb - cachedLimb < 2 * c - 1) :
    0 ≤ (multiplier : ℚ) * exactLimb / Q - cachedCenter multiplier cachedLimb Q ∧
      (multiplier : ℚ) * exactLimb / Q - cachedCenter multiplier cachedLimb Q < 2 * c := by
  have hbound := cached_center_error multiplier cachedLimb Q exactLimb (2 * c - 1)
    hQ hmultiplier herror
  simpa only [sub_add_cancel] using hbound

/-- The exact high limb `high = floor(exactLimb)` gives the exact integer
radius after division by a natural-number scale. The discarded limb fraction
cannot change that radius floor, even at an integral boundary. -/
theorem exact_high_limb_radius (high : ℤ) (exactLimb : ℚ) (divisor : ℕ)
    (hhigh : (high : ℚ) ≤ exactLimb ∧ exactLimb < (high : ℚ) + 1) :
    ((high / (divisor : ℤ) : ℤ) : ℚ) ≤ exactLimb / divisor ∧
      exactLimb / divisor < ((high / (divisor : ℤ) : ℤ) : ℚ) + 1 := by
  have hfloor : ⌊exactLimb⌋ = high := Int.floor_eq_iff.mpr hhigh
  have hradius : ⌊exactLimb / divisor⌋ = high / (divisor : ℤ) := by
    rw [Int.floor_div_natCast, hfloor]
  exact Int.floor_eq_iff.mp hradius

end Boundragon

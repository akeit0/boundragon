module

public import Boundragon.Geometry
public import Mathlib.Tactic.Ring

/-!
Exact arithmetic behind `scaled_product` and the fallback certificates.
`Q` is a limb modulus (2^64 in the converter), not the filter's unit 2048.
All divisions are Euclidean integer divisions: negative numerators round down.
No fixed-width overflow or cache accuracy is assumed or proved here.
-/

public section

namespace Boundragon

/-- Two product truncations collapse to one division by the product of the
moduli. Applied to the fallback, the divisors are 2^64 and 2^9. -/
theorem nested_integer_division (numerator inner outer : ℤ) (hinner : 0 ≤ inner) :
    numerator / inner / outer = numerator / (inner * outer) :=
  Int.ediv_ediv_of_nonneg hinner

/-- An integer offset survives the collapse of nested floors exactly.
This is the `F ± h` identity used for fallback coarse-bound certificates. -/
theorem nested_division_with_offset (numerator inner outer offset : ℤ)
    (hinner : 0 < inner) :
    (numerator / inner + offset) / outer =
      (numerator + inner * offset) / (inner * outer) := by
  rw [← Int.ediv_ediv_of_nonneg hinner.le,
    show numerator + inner * offset = numerator + offset * inner by ring,
    Int.add_mul_ediv_right numerator offset (ne_of_gt hinner)]

/-- The rational version allows the underlying exact center to be nonintegral. -/
theorem nested_floor_with_offset (center : ℚ) (offset : ℤ) (Q : ℕ) :
    (⌊center⌋ + offset) / (Q : ℤ) = ⌊(center + offset) / Q⌋ := by
  rw [Int.floor_div_natCast, Int.floor_add_intCast]

/-- The two-limb product formula is the exact quotient of the complete
cached integer. This models the mathematical value of `scaled_product`. -/
theorem two_limb_product (high low multiplier Q : ℤ) (hQ : Q ≠ 0) :
    high * multiplier + (low * multiplier) / Q =
      ((high * Q + low) * multiplier) / Q := by
  rw [show (high * Q + low) * multiplier =
    high * multiplier * Q + low * multiplier by ring,
    Int.mul_add_ediv_right (high * multiplier) (low * multiplier) hQ]

/-- In the range [0,2Q), a quotient is exactly zero or one. -/
theorem quotient_below_two (value Q : ℤ) (hQ : 0 < Q)
    (hvalue : 0 ≤ value ∧ value < 2 * Q) :
    value / Q = if value < Q then 0 else 1 := by
  split_ifs with hsmall
  · exact Int.ediv_eq_zero_of_lt hvalue.1 hsmall
  · apply (Int.ediv_eq_iff_of_pos hQ).mpr
    constructor <;> omega

/-- A difference of consecutive threshold floors is the indicator that
the remainder equals `target`. Summing this counts the quarter detector;
equal counts alone do not establish equality of detected sets. -/
theorem remainder_indicator (value Q target : ℤ) (hQ : 0 < Q)
    (htarget : 0 ≤ target ∧ target < Q) :
    (value + Q - target) / Q - (value + Q - target - 1) / Q =
      if value % Q = target then 1 else 0 := by
  let remainder := value % Q
  have hrem : 0 ≤ remainder ∧ remainder < Q :=
    ⟨Int.emod_nonneg value (ne_of_gt hQ), Int.emod_lt_of_pos value hQ⟩
  have hdecode := Int.mul_ediv_add_emod value Q
  have hfirst : value + Q - target = Q * (value / Q) + (remainder + Q - target) := by
    dsimp [remainder]
    linarith
  have hsecond : value + Q - target - 1 =
      Q * (value / Q) + (remainder + Q - target - 1) := by
    dsimp [remainder]
    linarith
  rw [hsecond, hfirst, Int.mul_add_ediv_left _ _ (ne_of_gt hQ),
    Int.mul_add_ediv_left _ _ (ne_of_gt hQ)]
  rw [quotient_below_two (remainder + Q - target) Q hQ (by constructor <;> omega),
    quotient_below_two (remainder + Q - target - 1) Q hQ (by constructor <;> omega)]
  dsimp [remainder]
  split_ifs <;> omega

end Boundragon

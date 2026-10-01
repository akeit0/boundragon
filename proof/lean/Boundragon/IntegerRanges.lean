module

public import Boundragon.Binary64
public import Boundragon.CacheScaling

/-!
Width bounds for the normal centered filter. Natural numbers describe the
unsigned values before conversion to machine words. These proofs establish
that the shift, widening multiply, high-half extraction, and centering
addition preserve their integer meanings. Signed mask/assembly semantics
and deliberately wrapping output-tail addition are separate obligations.
-/

public section

namespace Boundragon

/-- Inserting the binary64 hidden bit produces a 53-bit positive integer. -/
theorem hidden_bit_range (fraction : ℕ) (hf : fraction < 2 ^ 52) :
    2 ^ 52 ≤ fraction + 2 ^ 52 ∧ fraction + 2 ^ 52 < 2 ^ 53 := by omega

/-- The largest shift still leaves 2048 units of headroom. This stronger
bound, rather than just `n < 2^64`, also protects the centering addition. -/
theorem normal_multiplier_headroom (m shift : ℕ) (hm : m < 2 ^ 53) (hs : shift ≤ 11) :
    m * 2 ^ shift ≤ 2 ^ 64 - 2048 := by
  have hp : (2 : ℕ) ^ shift ≤ 2048 := by
    have := Nat.pow_le_pow_right (by decide : 0 < (2 : ℕ)) hs
    norm_num at this
    exact this
  calc
    m * 2 ^ shift ≤ m * 2048 := Nat.mul_le_mul_left m hp
    _ ≤ 2 ^ 64 - 2048 := by omega

theorem normal_multiplier_fits (m shift : ℕ) (hm : m < 2 ^ 53) (hs : shift ≤ 11) :
    m * 2 ^ shift < 2 ^ 64 := by
  have := normal_multiplier_headroom m shift hm hs
  omega

/-- A widening product of two 64-bit values fits exactly in 128 bits. -/
theorem widening_product_fits (n limb : ℕ) (hn : n < 2 ^ 64) (hl : limb < 2 ^ 64) :
    n * limb < 2 ^ 128 := by
  calc
    n * limb ≤ n * (2 ^ 64 - 1) := Nat.mul_le_mul_left n (by omega)
    _ < 2 ^ 64 * (2 ^ 64 - 1) := Nat.mul_lt_mul_of_pos_right hn (by norm_num)
    _ < 2 ^ 128 := by norm_num

/-- The high half cannot exceed the original multiplier for a limb below
`2^64`. Thus no truncation hides an overflow before centering. -/
theorem high_product_le_multiplier (n limb : ℕ) (hl : limb < 2 ^ 64) :
    n * limb / 2 ^ 64 ≤ n := by
  have h : n * limb / 2 ^ 64 ≤ n * 2 ^ 64 / 2 ^ 64 :=
    Nat.div_le_div_right (Nat.mul_le_mul_left n (Nat.le_of_lt hl))
  simpa using h

/-- Budgets `c=1,2,3` all fit: even the largest centered offset is 1027,
less than the 2048 units left by the normal significand and shift bounds. -/
theorem centered_addition_fits (m shift limb c : ℕ) (hm : m < 2 ^ 53)
    (hs : shift ≤ 11) (hl : limb < 2 ^ 64) (hc : c ≤ 3) :
    (m * 2 ^ shift * limb / 2 ^ 64) + 1024 + c < 2 ^ 64 := by
  have hh := normal_multiplier_headroom m shift hm hs
  have hu := high_product_le_multiplier (m * 2 ^ shift) limb hl
  omega

/-- All signed residual calculations fit comfortably in a 32-bit `int`.
The fine increment is between -5 and 5, including negative residuals. -/
theorem centered_signed_ranges (u h c : ℤ) (hh : 0 ≤ h ∧ h ≤ 1023)
    (hc : 1 ≤ c ∧ c ≤ 3) :
    let w := centeredResidual2048 u c;
    -1024 ≤ w ∧ w ≤ 1023 ∧
    -1023 ≤ |w| - h ∧ |w| - h ≤ 1024 ∧
    -4608 ≤ 5 * w + 512 ∧ 5 * w + 512 ≤ 5627 ∧
    -4603 ≤ 5 * w + 512 + 5 * c ∧ 5 * w + 512 + 5 * c ≤ 5642 ∧
    -5 ≤ (5 * w + 512) / 1024 ∧ (5 * w + 512) / 1024 ≤ 5 := by
  have hw := (centered_decode_2048 u c).2
  dsimp
  have habs := abs_nonneg (centeredResidual2048 u c)
  have habsUpper : |centeredResidual2048 u c| ≤ 1024 := by
    rw [abs_le]
    omega
  omega

/-- The signed fine correction does not make the mathematical output
negative or exceed 64 bits. Packing a negative tail by unsigned wrapping
must still be related to this integer expression in the C++ proof. -/
theorem centered_coefficient_range (u c : ℤ)
    (hu : 2048 ≤ u ∧ u + 1024 + c < 2 ^ 64) (hc : 1 ≤ c ∧ c ≤ 3) :
    0 < fineCoefficient2048 (coarseIndex2048 u c) (centeredResidual2048 u c) ∧
      fineCoefficient2048 (coarseIndex2048 u c) (centeredResidual2048 u c) < 2 ^ 64 := by
  have hw := (centered_decode_2048 u c).2
  have hj : 1 ≤ coarseIndex2048 u c ∧ coarseIndex2048 u c < 2 ^ 53 := by
    unfold coarseIndex2048
    omega
  unfold fineCoefficient2048
  omega

end Boundragon

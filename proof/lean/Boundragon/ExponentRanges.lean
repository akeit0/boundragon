module

public import Boundragon.CacheGeneration
public import Boundragon.IntegerRanges

/-!
Analytic ranges of the normal binary64 scaling, without enumerating exponent
fields. `10^k ≤ 2^q < 10^(k+1)` is the exact meaning required of `dec_exp`.
The fixed-point implementation with multiplier 315653 still needs a proof
that it computes that order; none of the theorems here assume its correctness
implicitly. The shift below uses the binary exponent proved by generation.
-/

public section

namespace Boundragon

/-- The chosen decimal scale puts the binary value in `[0.1,1)`. -/
theorem binary_decimal_scale_bounds (q k : ℤ)
    (horder : (10 : ℚ) ^ k ≤ (2 : ℚ) ^ q ∧ (2 : ℚ) ^ q < (10 : ℚ) ^ (k + 1)) :
    (1 : ℚ) / 10 ≤ (2 : ℚ) ^ q * (10 : ℚ) ^ (-k - 1) ∧
      (2 : ℚ) ^ q * (10 : ℚ) ^ (-k - 1) < 1 := by
  have hk : (0 : ℚ) < (10 : ℚ) ^ k := zpow_pos (by norm_num) _
  have hstep : (10 : ℚ) ^ (k + 1) = (10 : ℚ) ^ k * 10 := by
    rw [zpow_add₀ (by norm_num)]
    norm_num
  have hneg : (10 : ℚ) ^ (-k - 1) = ((10 : ℚ) ^ (k + 1))⁻¹ := by
    rw [show -k - 1 = -(k + 1) by ring, zpow_neg]
  rw [hneg, ← div_eq_mul_inv, hstep]
  constructor
  · apply (le_div_iff₀ (mul_pos hk (by norm_num))).mpr
    linarith only [horder.1]
  · apply (div_lt_one (mul_pos hk (by norm_num))).mpr
    simpa only [hstep] using horder.2

/-- The actual scaling shift `q + E + 12` lies in `[8,11]` because the
decimal scale is in `[0.1,1)` and the cache exponent is exact. The argument
works for arbitrary `q,k`, not just the finite set of binary64 exponents. -/
theorem normal_shift_range (q k : ℤ)
    (horder : (10 : ℚ) ^ k ≤ (2 : ℚ) ^ q ∧ (2 : ℚ) ^ q < (10 : ℚ) ^ (k + 1)) :
    8 ≤ q + decimalCacheExponent (-k - 1) + 12 ∧
      q + decimalCacheExponent (-k - 1) + 12 ≤ 11 := by
  let E := decimalCacheExponent (-k - 1)
  let alpha := (2 : ℚ) ^ q * (10 : ℚ) ^ (-k - 1)
  have hscale := binary_decimal_scale_bounds q k horder
  have hcache := decimal_cache_binary_order (-k - 1)
  have hq : (0 : ℚ) < (2 : ℚ) ^ q := zpow_pos (by norm_num) _
  have hl : (2 : ℚ) ^ (q + E) ≤ alpha := by
    rw [zpow_add₀ (by norm_num)]
    exact mul_le_mul_of_nonneg_left hcache.1 hq.le
  have hh : alpha < (2 : ℚ) ^ (q + E + 1) := by
    rw [show q + E + 1 = q + (E + 1) by ring, zpow_add₀ (by norm_num)]
    exact mul_lt_mul_of_pos_left hcache.2 hq
  have hhigh : q + E < 0 := by
    by_contra h
    have hpow := one_le_zpow₀ (by norm_num : (1 : ℚ) ≤ 2) (le_of_not_gt h)
    linarith only [hl, hscale.2, hpow]
  have hlow : -4 ≤ q + E := by
    by_contra h
    have hi : q + E + 1 ≤ -4 := by omega
    have hpow := zpow_le_zpow_right₀ (by norm_num : (1 : ℚ) ≤ 2) hi
    norm_num at hpow
    linarith only [hh, hscale.1, hpow]
  dsimp [E] at hhigh hlow
  omega

/-- Two endpoint comparisons and monotonicity bound every normal decimal
order. This uses no lookup-table or per-exponent case split. -/
theorem binary64_decimal_order_range (q k : ℤ) (hq : -1074 ≤ q ∧ q ≤ 971)
    (horder : (10 : ℚ) ^ k ≤ (2 : ℚ) ^ q ∧ (2 : ℚ) ^ q < (10 : ℚ) ^ (k + 1)) :
    -324 ≤ k ∧ k ≤ 292 := by
  have hlo : (10 : ℚ) ^ (-324 : ℤ) ≤ (2 : ℚ) ^ (-1074 : ℤ) := by decide +kernel
  have hhi : (2 : ℚ) ^ (971 : ℤ) < (10 : ℚ) ^ (293 : ℤ) := by decide +kernel
  have hqLow := zpow_le_zpow_right₀ (by norm_num : (1 : ℚ) ≤ 2) hq.1
  have hqHigh := zpow_le_zpow_right₀ (by norm_num : (1 : ℚ) ≤ 2) hq.2
  constructor
  · by_contra h
    have hk : k + 1 ≤ -324 := by omega
    have hp := zpow_le_zpow_right₀ (by norm_num : (1 : ℚ) ≤ 10) hk
    exact not_lt_of_ge (hp.trans (hlo.trans hqLow)) horder.2
  · by_contra h
    have hk : 293 ≤ k := by omega
    have hp := zpow_le_zpow_right₀ (by norm_num : (1 : ℚ) ≤ 10) hk
    exact not_lt_of_ge (hp.trans (horder.1.trans hqHigh)) hhi

/-- Ordinary normals select powers inside the header's `[-293,324]`
domain. The highest regular power is actually 323; exceptions use 324. -/
theorem normal_cache_index_range (q k : ℤ) (hq : -1074 ≤ q ∧ q ≤ 971)
    (horder : (10 : ℚ) ^ k ≤ (2 : ℚ) ^ q ∧ (2 : ℚ) ^ q < (10 : ℚ) ^ (k + 1)) :
    -293 ≤ -k - 1 ∧ -k - 1 ≤ 323 ∧ 0 ≤ -k - 1 + 293 ∧ -k - 1 + 293 < 618 := by
  have hk := binary64_decimal_order_range q k hq horder
  omega

/-- Raw exponent decoding and both fixed-point helper multiplications fit
signed 32-bit integers on the normal domain. Accuracy of their divisions
is distinct from this absence of signed overflow. -/
theorem normal_exponent_integer_ranges (raw : ℤ) (hr : 1 ≤ raw ∧ raw ≤ 2046)
    (p : ℤ) (hp : -293 ≤ p ∧ p ≤ 324) :
    let q := raw - 1075;
    -1074 ≤ q ∧ q ≤ 971 ∧
    -(2 ^ 31) ≤ q * 315653 - 131072 ∧ q * 315653 < 2 ^ 31 ∧
    -(2 ^ 31) ≤ p * 217707 ∧ p * 217707 < 2 ^ 31 := by
  dsimp
  omega

/-- Generation supplies the limb range used by the multiplication proofs.
No additional hypothesis about the cache value is needed. -/
theorem generated_decimal_product_ranges (p : ℤ) (m shift c : ℕ)
    (hm : m < 2 ^ 53) (hs : shift ≤ 11) (hc : c ≤ 3) :
    m * 2 ^ shift < 2 ^ 64 ∧
      m * 2 ^ shift * decimalCache p 64 < 2 ^ 128 ∧
      m * 2 ^ shift * decimalCache p 64 / 2 ^ 64 + 1024 + c < 2 ^ 64 := by
  have hl := (decimal_cache_correct p 64 (by norm_num)).2.2.2
  have hn := normal_multiplier_fits m shift hm hs
  exact ⟨hn, widening_product_fits _ _ hn hl, centered_addition_fits _ _ _ _ hm hs hl hc⟩

/-- Exact high-limb radius extraction fits the `unsigned h` domain used
by the signed distance code. The divisor's minimum follows from `shift≤11`. -/
theorem generated_decimal_radius_range (p : ℤ) (shift : ℕ) (hs : shift ≤ 11) :
    decimalCache p 64 / 2 ^ (65 - shift) < 1024 := by
  have hl := (decimal_cache_correct p 64 (by norm_num)).2.2.2
  have hpow : (2 : ℕ) ^ 54 ≤ 2 ^ (65 - shift) :=
    Nat.pow_le_pow_right (by decide) (by omega)
  apply (Nat.div_lt_iff_lt_mul (by positivity)).mpr
  calc
    _ < 2 ^ 64 := hl
    _ ≤ 1024 * 2 ^ (65 - shift) := by
      have h := Nat.mul_le_mul_left 1024 hpow
      norm_num at h ⊢
      exact h

/-- Splitting the full cache into machine words never truncates a limb:
the high word is the exact generated 64-bit cache and the low word fits. -/
theorem generated_decimal_full_words (p : ℤ) :
    decimalCache p 128 < 2 ^ 128 ∧
    decimalCache p 128 / 2 ^ 64 = decimalCache p 64 ∧
    decimalCache p 128 % 2 ^ 64 < 2 ^ 64 :=
  ⟨(decimal_cache_correct p 128 (by norm_num)).2.2.2,
    decimal_cache_high_limb p, Nat.mod_lt _ (by norm_num)⟩

end Boundragon

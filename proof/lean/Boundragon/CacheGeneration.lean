module

public import Boundragon.CacheScaling
public import Boundragon.Decimal

/-!
General correctness of the exact cached-power generation formula.
The input is any positive rational `numerator / denominator`, and the width
is arbitrary. The bit-length estimate, single downward correction, integer
rescaling and floor division are proved correct without enumerating entries.
Specializing the input to `10^p` gives the repository's power generator.
-/

public section

namespace Boundragon

/-- Split a signed power into positive integer numerator and denominator. -/
@[expose] def powerNumerator (base : ℕ) (e : ℤ) : ℕ := base ^ e.toNat
@[expose] def powerDenominator (base : ℕ) (e : ℤ) : ℕ := base ^ (-e).toNat

theorem signed_power_ratio (base : ℕ) (e : ℤ) (hbase : 0 < base) :
    (base : ℚ) ^ e = (powerNumerator base e : ℚ) / powerDenominator base e := by
  have he : e = (e.toNat : ℤ) - ((-e).toNat : ℤ) := by omega
  conv_lhs => rw [he]
  rw [zpow_natCast_sub_natCast₀ (by exact_mod_cast Nat.ne_of_gt hbase)]
  simp [powerNumerator, powerDenominator]

/-- For positive integers, bit length is `floor(log₂ n)+1`. Subtracting
the two bit lengths cancels the added ones, giving this initial estimate. -/
@[expose] def cacheExponentCandidate (numerator denominator : ℕ) : ℤ :=
  (Nat.log 2 numerator : ℤ) - (Nat.log 2 denominator : ℤ)

/-- Exact comparison with `2^e`, performed entirely with integers. The
generator decrements its bit-length estimate exactly when the ratio is lower. -/
@[expose] def cacheBinaryExponent (numerator denominator : ℕ) : ℤ :=
  let e := cacheExponentCandidate numerator denominator
  if numerator * powerDenominator 2 e < denominator * powerNumerator 2 e
  then e - 1 else e

theorem cache_exponent_comparison (numerator denominator : ℕ) (e : ℤ)
    (hd : 0 < denominator) :
    numerator * powerDenominator 2 e < denominator * powerNumerator 2 e ↔
      (numerator : ℚ) / denominator < (2 : ℚ) ^ e := by
  have hdQ : (0 : ℚ) < denominator := by exact_mod_cast hd
  have hpower : (0 : ℚ) < powerDenominator 2 e := by
    unfold powerDenominator
    positivity
  have h2 := signed_power_ratio 2 e (by norm_num)
  norm_num only [Nat.cast_ofNat] at h2
  rw [h2, div_lt_div_iff₀ hdQ hpower]
  norm_cast
  rw [mul_comm denominator]

/-- The initial estimate is at most one bit too high. This follows from
the two integer logarithm bounds, for every positive rational input. -/
theorem cache_candidate_bounds (numerator denominator : ℕ)
    (hn : 0 < numerator) (hd : 0 < denominator) :
    (2 : ℚ) ^ (cacheExponentCandidate numerator denominator - 1) <
        (numerator : ℚ) / denominator ∧
      (numerator : ℚ) / denominator <
        (2 : ℚ) ^ (cacheExponentCandidate numerator denominator + 1) := by
  let A : ℚ := 2 ^ Nat.log 2 numerator
  let B : ℚ := 2 ^ Nat.log 2 denominator
  have hA : 0 < A := by dsimp [A]; positivity
  have hB : 0 < B := by dsimp [B]; positivity
  have hdQ : (0 : ℚ) < denominator := by exact_mod_cast hd
  have hnLow : A ≤ numerator := by
    dsimp [A]
    exact_mod_cast Nat.pow_log_le_self 2 (Nat.ne_of_gt hn)
  have hnHigh : (numerator : ℚ) < A * 2 := by
    dsimp [A]
    have h := Nat.lt_pow_succ_log_self (by norm_num : 1 < (2 : ℕ)) numerator
    rw [pow_succ] at h
    exact_mod_cast h
  have hdLow : B ≤ denominator := by
    dsimp [B]
    exact_mod_cast Nat.pow_log_le_self 2 (Nat.ne_of_gt hd)
  have hdHigh : (denominator : ℚ) < B * 2 := by
    dsimp [B]
    have h := Nat.lt_pow_succ_log_self (by norm_num : 1 < (2 : ℕ)) denominator
    rw [pow_succ] at h
    exact_mod_cast h
  have hbase : (2 : ℚ) ^ cacheExponentCandidate numerator denominator = A / B := by
    unfold cacheExponentCandidate
    rw [zpow_natCast_sub_natCast₀ (by norm_num)]
  have hprev : (2 : ℚ) ^ (cacheExponentCandidate numerator denominator - 1) = A / (B * 2) := by
    rw [zpow_sub₀ (by norm_num), hbase]
    norm_num
    ring
  have hnext : (2 : ℚ) ^ (cacheExponentCandidate numerator denominator + 1) = (A * 2) / B := by
    rw [zpow_add₀ (by norm_num), hbase]
    norm_num
    ring
  rw [hprev, hnext]
  constructor
  · apply (div_lt_div_iff₀ (mul_pos hB (by norm_num)) hdQ).mpr
    nlinarith [mul_pos hA (sub_pos.mpr hdHigh)]
  · apply (div_lt_div_iff₀ hdQ hB).mpr
    nlinarith [mul_pos hB (sub_pos.mpr hnHigh)]

/-- The generator computes the exact binary order, without assuming an
accurate logarithm approximation or a per-entry normalization certificate. -/
theorem cache_binary_exponent_correct (numerator denominator : ℕ)
    (hn : 0 < numerator) (hd : 0 < denominator) :
    (2 : ℚ) ^ cacheBinaryExponent numerator denominator ≤ (numerator : ℚ) / denominator ∧
      (numerator : ℚ) / denominator < (2 : ℚ) ^ (cacheBinaryExponent numerator denominator + 1) := by
  obtain ⟨hl, hh⟩ := cache_candidate_bounds numerator denominator hn hd
  dsimp only [cacheBinaryExponent]
  split_ifs with h
  · have hlt := (cache_exponent_comparison numerator denominator _ hd).mp h
    constructor
    · exact hl.le
    · simpa using hlt
  · have hle := le_of_not_gt ((cache_exponent_comparison numerator denominator _ hd).not.mp h)
    exact ⟨hle, hh⟩

/-- The generator shifts either numerator or denominator by this signed
amount, then uses integer division. Splitting the sign handles both branches. -/
@[expose] def cacheScaleExponent (numerator denominator width : ℕ) : ℤ :=
  (width : ℤ) - 1 - cacheBinaryExponent numerator denominator

@[expose] def generatedCache (numerator denominator width : ℕ) : ℕ :=
  (numerator * powerNumerator 2 (cacheScaleExponent numerator denominator width)) /
    (denominator * powerDenominator 2 (cacheScaleExponent numerator denominator width))

@[expose] def exactCache (numerator denominator width : ℕ) : ℚ :=
  (numerator : ℚ) / denominator * (2 : ℚ) ^ cacheScaleExponent numerator denominator width

/-- The integer formula computes the floor of the exact normalized value.
This proves the calculation itself; the floor equality is not a hypothesis. -/
theorem generated_cache_floor (numerator denominator width : ℕ) :
    ⌊exactCache numerator denominator width⌋ = generatedCache numerator denominator width := by
  have h2 := signed_power_ratio 2 (cacheScaleExponent numerator denominator width) (by norm_num)
  norm_num only [Nat.cast_ofNat] at h2
  unfold exactCache
  rw [h2]
  have heq : (numerator : ℚ) / denominator *
      ((powerNumerator 2 (cacheScaleExponent numerator denominator width) : ℚ) /
        powerDenominator 2 (cacheScaleExponent numerator denominator width)) =
      ((numerator * powerNumerator 2 (cacheScaleExponent numerator denominator width) : ℕ) : ℚ) /
        (denominator * powerDenominator 2 (cacheScaleExponent numerator denominator width) : ℕ) := by
    push_cast
    ring
  rw [heq, Rat.floor_natCast_div_natCast]
  simp only [generatedCache, Int.natCast_ediv]

/-- Less than one cache unit is lost, at any width and for any positive
rational input. This is the error bound consumed by the exact-high policy. -/
theorem generated_cache_error (numerator denominator width : ℕ) :
    0 ≤ exactCache numerator denominator width - generatedCache numerator denominator width ∧
      exactCache numerator denominator width - generatedCache numerator denominator width < 1 := by
  have h := Int.floor_eq_iff.mp (generated_cache_floor numerator denominator width)
  push_cast at h
  constructor <;> linarith

/-- The exact significand is normalized to `[2^(width-1), 2^width)`. -/
theorem exact_cache_normalized (numerator denominator width : ℕ)
    (hn : 0 < numerator) (hd : 0 < denominator) (hw : 0 < width) :
    (2 : ℚ) ^ (width - 1) ≤ exactCache numerator denominator width ∧
      exactCache numerator denominator width < (2 : ℚ) ^ width := by
  obtain ⟨hl, hh⟩ := cache_binary_exponent_correct numerator denominator hn hd
  let E := cacheBinaryExponent numerator denominator
  let S := cacheScaleExponent numerator denominator width
  have hS : 0 < (2 : ℚ) ^ S := zpow_pos (by norm_num) _
  have hlow : (2 : ℚ) ^ E * (2 : ℚ) ^ S = (2 : ℚ) ^ (width - 1) := by
    rw [← zpow_add₀ (by norm_num)]
    have he : E + S = ((width - 1 : ℕ) : ℤ) := by dsimp [E, S, cacheScaleExponent]; omega
    rw [he, zpow_natCast]
  have hhigh : (2 : ℚ) ^ (E + 1) * (2 : ℚ) ^ S = (2 : ℚ) ^ width := by
    rw [← zpow_add₀ (by norm_num)]
    have he : E + 1 + S = (width : ℤ) := by dsimp [E, S, cacheScaleExponent]; omega
    rw [he, zpow_natCast]
  constructor
  · rw [← hlow]
    exact mul_le_mul_of_nonneg_right hl hS.le
  · rw [← hhigh]
    exact mul_lt_mul_of_pos_right hh hS

/-- The generated integer also occupies exactly `width` bits. This is a
range theorem for all inputs, including every 64- and 128-bit cache power. -/
theorem generated_cache_range (numerator denominator width : ℕ)
    (hn : 0 < numerator) (hd : 0 < denominator) (hw : 0 < width) :
    2 ^ (width - 1) ≤ generatedCache numerator denominator width ∧
      generatedCache numerator denominator width < 2 ^ width := by
  have hnorm := exact_cache_normalized numerator denominator width hn hd hw
  have hnorm' : ((2 ^ (width - 1) : ℕ) : ℚ) ≤ exactCache numerator denominator width ∧
      exactCache numerator denominator width < ((2 ^ width : ℕ) : ℚ) := by
    simpa only [Nat.cast_pow, Nat.cast_ofNat] using hnorm
  have hfloor := Int.floor_eq_iff.mp (generated_cache_floor numerator denominator width)
  push_cast at hfloor hnorm
  constructor
  · have h : ((2 ^ (width - 1) : ℕ) : ℚ) < generatedCache numerator denominator width + 1 :=
      lt_of_le_of_lt hnorm'.1 hfloor.2
    have hInt : (2 ^ (width - 1) : ℕ) < generatedCache numerator denominator width + 1 := by
      exact_mod_cast h
    omega
  · have h : (generatedCache numerator denominator width : ℚ) < ((2 ^ width : ℕ) : ℚ) :=
      lt_of_le_of_lt hfloor.1 hnorm'.2
    exact_mod_cast h

/-- The Python `shift >= 0` branch shifts the numerator alone. -/
theorem generated_cache_shift_numerator (numerator denominator width : ℕ)
    (hs : 0 ≤ cacheScaleExponent numerator denominator width) :
    generatedCache numerator denominator width =
      (numerator * 2 ^ (cacheScaleExponent numerator denominator width).toNat) / denominator := by
  have hz : (-cacheScaleExponent numerator denominator width).toNat = 0 := by omega
  simp only [generatedCache, powerNumerator, powerDenominator, hz, pow_zero, mul_one]

/-- The Python `shift < 0` branch shifts the denominator alone. -/
theorem generated_cache_shift_denominator (numerator denominator width : ℕ)
    (hs : cacheScaleExponent numerator denominator width < 0) :
    generatedCache numerator denominator width =
      numerator / (denominator * 2 ^ (-cacheScaleExponent numerator denominator width).toNat) := by
  have hz : (cacheScaleExponent numerator denominator width).toNat = 0 := by omega
  simp only [generatedCache, powerNumerator, powerDenominator, hz, pow_zero, mul_one]

/-- Discarding the low 64 bits of the full cache is exactly the separately
generated 64-bit floor. This is a general nested-floor identity. -/
theorem generated_cache_high_limb (numerator denominator : ℕ) :
    generatedCache numerator denominator 128 / 2 ^ 64 = generatedCache numerator denominator 64 := by
  have hscale : exactCache numerator denominator 128 / (2 : ℚ) ^ 64 =
      exactCache numerator denominator 64 := by
    unfold exactCache cacheScaleExponent
    have hp : (2 : ℚ) ^ ((128 : ℤ) - 1 - cacheBinaryExponent numerator denominator) /
        (2 : ℚ) ^ (64 : ℤ) =
        (2 : ℚ) ^ ((64 : ℤ) - 1 - cacheBinaryExponent numerator denominator) := by
      rw [← zpow_sub₀ (by norm_num)]
      congr 1
      ring
    calc
      _ = ((numerator : ℚ) / denominator) *
          ((2 : ℚ) ^ ((128 : ℤ) - 1 - cacheBinaryExponent numerator denominator) /
            (2 : ℚ) ^ (64 : ℤ)) := by norm_num; ring
      _ = _ := by rw [hp]; norm_num
  have hf := Int.floor_div_natCast (exactCache numerator denominator 128) (2 ^ 64)
  have hscale' : exactCache numerator denominator 128 / (2 ^ 64 : ℕ) =
      exactCache numerator denominator 64 := by
    simpa only [Nat.cast_pow, Nat.cast_ofNat] using hscale
  rw [hscale', generated_cache_floor, generated_cache_floor] at hf
  exact_mod_cast hf.symm

/-- Repository specialization: the positive rational is exactly `10^p`,
including negative decimal exponents. No finite range restriction is needed. -/
@[expose] def decimalCache (p : ℤ) (width : ℕ) : ℕ :=
  generatedCache (powerNumerator 10 p) (powerDenominator 10 p) width

@[expose] def decimalCacheExponent (p : ℤ) : ℤ :=
  cacheBinaryExponent (powerNumerator 10 p) (powerDenominator 10 p)

@[expose] def decimalCacheExact (p : ℤ) (width : ℕ) : ℚ :=
  (10 : ℚ) ^ p * (2 : ℚ) ^ ((width : ℤ) - 1 - decimalCacheExponent p)

theorem decimal_cache_exact (p : ℤ) (width : ℕ) :
    decimalCacheExact p width = exactCache (powerNumerator 10 p) (powerDenominator 10 p) width := by
  have h10 := signed_power_ratio 10 p (by norm_num)
  norm_num only [Nat.cast_ofNat] at h10
  simp only [decimalCacheExact, decimalCacheExponent, exactCache, cacheScaleExponent, h10]

theorem decimal_cache_binary_order (p : ℤ) :
    (2 : ℚ) ^ decimalCacheExponent p ≤ (10 : ℚ) ^ p ∧
      (10 : ℚ) ^ p < (2 : ℚ) ^ (decimalCacheExponent p + 1) := by
  have h := cache_binary_exponent_correct (powerNumerator 10 p) (powerDenominator 10 p)
    (by unfold powerNumerator; positivity) (by unfold powerDenominator; positivity)
  have h10 := signed_power_ratio 10 p (by norm_num)
  norm_num only [Nat.cast_ofNat] at h10
  simpa only [decimalCacheExponent, ← h10] using h

/-- General generation theorem for every decimal exponent and positive width:
exact floor, less-than-one error, and the promised bit width are all derived. -/
theorem decimal_cache_correct (p : ℤ) (width : ℕ) (hw : 0 < width) :
    ⌊decimalCacheExact p width⌋ = decimalCache p width ∧
    (0 ≤ decimalCacheExact p width - decimalCache p width ∧
      decimalCacheExact p width - decimalCache p width < 1) ∧
    (2 ^ (width - 1) ≤ decimalCache p width ∧ decimalCache p width < 2 ^ width) := by
  rw [decimal_cache_exact]
  exact ⟨generated_cache_floor _ _ _, generated_cache_error _ _ _,
    generated_cache_range _ _ _ (by unfold powerNumerator; positivity)
      (by unfold powerDenominator; positivity) hw⟩

/-- The header's `high_powers` construction (`full >> 64`) has exactly the
same mathematical meaning as generating a 64-bit cache directly. -/
theorem decimal_cache_high_limb (p : ℤ) :
    decimalCache p 128 / 2 ^ 64 = decimalCache p 64 :=
  generated_cache_high_limb _ _

/-- The exact-high policy's center error now follows from the generation
formula. The cache-accuracy hypothesis of `cached_center_error` is discharged. -/
theorem generated_decimal_center_error (p : ℤ) (multiplier : ℤ)
    (hn : 0 ≤ multiplier ∧ multiplier < (2 ^ 64 : ℕ)) :
    0 ≤ (multiplier : ℚ) * decimalCacheExact p 64 / (2 ^ 64 : ℕ) -
        cachedCenter multiplier (decimalCache p 64) (2 ^ 64) ∧
      (multiplier : ℚ) * decimalCacheExact p 64 / (2 ^ 64 : ℕ) -
        cachedCenter multiplier (decimalCache p 64) (2 ^ 64) < 2 := by
  have herror := (decimal_cache_correct p 64 (by norm_num)).2.1
  have h := cached_center_error multiplier (decimalCache p 64) (2 ^ 64)
    (decimalCacheExact p 64) 1 (by norm_num) hn (by simpa only [Int.cast_natCast] using herror)
  convert h using 1
  norm_num

/-- Generation also supplies the exact radius floor after any natural scale. -/
theorem generated_decimal_radius_floor (p : ℤ) (divisor : ℕ) :
    (((decimalCache p 64 : ℤ) / (divisor : ℤ) : ℤ) : ℚ) ≤ decimalCacheExact p 64 / divisor ∧
      decimalCacheExact p 64 / divisor <
        (((decimalCache p 64 : ℤ) / (divisor : ℤ) : ℤ) : ℚ) + 1 := by
  have herror := (decimal_cache_correct p 64 (by norm_num)).2.1
  apply exact_high_limb_radius
  push_cast
  constructor <;> linarith [herror.1, herror.2]

end Boundragon

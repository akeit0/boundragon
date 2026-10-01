module

public import Boundragon.Normalization
public import Boundragon.Shortest

/-! Canonical coarse-result optimality, including power-of-ten boundaries. -/

public section

namespace Boundragon

/-- If the unique valid coarse point is not a power of ten, the rounding
interval cannot cross a decimal-decade boundary. -/
theorem coarse_interval_decade (x r : ℚ) (d : DecimalRep)
    (hd : d.WellFormed) (he : 1 ≤ d.exponent) (hr : r < 5)
    (hv : |x - d.value| < r) (hpower : ∀ N : ℤ, d.value ≠ pow10 N) :
    pow10 (d.exponent + (d.digitIndex : ℤ)) ≤ x - r ∧
    x + r < pow10 (d.exponent + (d.digitIndex : ℤ) + 1) := by
  let N := d.exponent + (d.digitIndex : ℤ)
  have hN : 1 ≤ N := by dsimp [N]; omega
  have ho := decimal_order d hd
  have hb := abs_lt.mp hv
  obtain ⟨j, hj⟩ := decimal_on_coarse d he
  have hjv : |x - 10 * j| ≤ r := by rw [← hj]; exact hv.le
  have hexclude (M : ℤ) (hM : 1 ≤ M) : ¬ |x - pow10 M| ≤ r := by
    intro hvalid
    obtain ⟨i, hi⟩ := pow10_on_coarse M hM
    rw [hi] at hvalid
    have hij := coarse_point_unique x r hr i j hvalid hjv
    exact hpower M (by rw [hi, hij, hj])
  constructor
  · by_contra hbad
    apply hexclude N hN
    apply abs_le.mpr
    constructor <;> linarith [ho.1]
  · by_contra hbad
    apply hexclude (N + 1) (by omega)
    apply abs_le.mpr
    constructor <;> linarith [ho.2]

/-- Away from decade boundaries, every equally short or shorter valid
decimal is the same unique coarse point. Canonicalization then makes it
shortest and uniquely closest. -/
theorem coarse_nonpower_optimal (x r : ℚ) (d : DecimalRep)
    (hd : d.WellFormed) (hc : d.Canonical) (he : 1 ≤ d.exponent)
    (hr : r < 5) (hv : |x - d.value| < r)
    (hpower : ∀ N : ℤ, d.value ≠ pow10 N) : d.Optimal x r := by
  have hinterval := coarse_interval_decade x r d hd he hr hv hpower
  obtain ⟨j, hj⟩ := decimal_on_coarse d he
  have hjv : |x - 10 * j| ≤ r := by rw [← hj]; exact hv.le
  have hsame (b : DecimalRep) (hb : b.WellFormed) (hbv : |x - b.value| ≤ r)
      (hbd : b.digitIndex ≤ d.digitIndex) : d.value = b.value := by
    have horder := valid_decimal_order x r _ hinterval b hb hbv
    have hbe : 1 ≤ b.exponent := by omega
    obtain ⟨i, hi⟩ := decimal_on_coarse b hbe
    have hiv : |x - 10 * i| ≤ r := by rw [← hi]; exact hbv
    have hij := coarse_point_unique x r hr i j hiv hjv
    rw [hj, hi, hij]
  refine ⟨hd, hc, hv, ?_, ?_, ?_⟩
  · intro b hb hbv
    by_cases hbd : d.digitIndex ≤ b.digitIndex
    · exact hbd
    · exact canonical_digits_min d b hd hc hb (hsame b hb hbv (by omega))
  · intro b hb hbv hbd
    rw [hsame b hb hbv hbd.le]
  · intro b hb hbv hbd _
    exact hsame b hb hbv hbd.le

/-- The neighboring one-digit decimal values around a power `T` are
`0.9*T` and `2*T`, across every possible integer decimal exponent. -/
theorem one_digit_separation (b : DecimalRep) (hb : b.WellFormed)
    (hD : b.digitIndex = 0) (N : ℤ) (hne : b.value ≠ pow10 N) :
    b.value ≤ (9 / 10 : ℚ) * pow10 N ∨ 2 * pow10 N ≤ b.value := by
  have hcoeff : 1 ≤ b.coefficient ∧ b.coefficient ≤ 9 := by
    have hbounds := hb
    simp only [DecimalRep.WellFormed, HasDigitIndex, hD, pow_zero,
      Nat.zero_add, pow_one] at hbounds
    exact ⟨hbounds.1, by omega⟩
  have hlo : (1 : ℚ) ≤ b.coefficient := by exact_mod_cast hcoeff.1
  have hhi : (b.coefficient : ℚ) ≤ 9 := by exact_mod_cast hcoeff.2
  have hp := pow10_pos b.exponent
  have hT := pow10_pos N
  rcases lt_trichotomy b.exponent N with he | he | he
  · left
    have hstep := pow10_mono (show b.exponent + 1 ≤ N by omega)
    rw [pow10_step] at hstep
    change (b.coefficient : ℚ) * pow10 b.exponent ≤ _
    nlinarith
  · right
    have hnotone : b.coefficient ≠ 1 := by
      intro h
      apply hne
      simp [DecimalRep.value, he, h]
    have htwo : (2 : ℚ) ≤ b.coefficient := by
      have htwoI : 2 ≤ b.coefficient := by omega
      exact_mod_cast htwoI
    change _ ≤ (b.coefficient : ℚ) * pow10 b.exponent
    rw [he]
    nlinarith
  · right
    have hstep := pow10_mono (show N + 1 ≤ b.exponent by omega)
    rw [pow10_step] at hstep
    change _ ≤ (b.coefficient : ℚ) * pow10 b.exponent
    nlinarith

/-- A point less than `T/20` from a power of ten is uniquely closer to `T`
than to any other one-digit decimal, even across the decade boundary. -/
theorem power_of_ten_nearest (x : ℚ) (N : ℤ)
    (hclose : 20 * |x - pow10 N| < pow10 N)
    (b : DecimalRep) (hb : b.WellFormed) (hD : b.digitIndex = 0)
    (hne : b.value ≠ pow10 N) : |x - pow10 N| < |x - b.value| := by
  have hbounds := abs_le.mp (le_refl |x - pow10 N|)
  have hnonneg := abs_nonneg (x - pow10 N)
  rcases one_digit_separation b hb hD N hne with hlo | hhi
  · nlinarith [le_abs_self (x - b.value)]
  · nlinarith [neg_le_abs (x - b.value)]

/-- A canonical valid power of ten is one-digit shortest and uniquely
closest under the regular interval geometry with significand at least 11. -/
theorem coarse_power_optimal (x r : ℚ) (m : ℤ) (d : DecimalRep) (N : ℤ)
    (hd : d.WellFormed) (hc : d.Canonical) (hvalue : d.value = pow10 N)
    (hv : |x - d.value| < r) (hgeometry : x = 2 * (m : ℚ) * r)
    (hm : 11 ≤ m) : d.Optimal x r := by
  have hone : (DecimalRep.mk 1 N 0).WellFormed := by
    norm_num [DecimalRep.WellFormed, HasDigitIndex]
  have honeval : (DecimalRep.mk 1 N 0).value = pow10 N := by
    simp [DecimalRep.value]
  have hD : d.digitIndex = 0 := by
    have hmin := canonical_digits_min d ⟨1, N, 0⟩ hd hc hone (hvalue.trans honeval.symm)
    change d.digitIndex ≤ 0 at hmin
    omega
  have hrpos : 0 < r := lt_of_le_of_lt (abs_nonneg _) hv
  have hmQ : (11 : ℚ) ≤ m := by exact_mod_cast hm
  have hmul := mul_le_mul_of_nonneg_right hmQ hrpos.le
  have hbounds := abs_lt.mp hv
  have hclose : 20 * |x - pow10 N| < pow10 N := by
    rw [← hvalue]
    nlinarith
  refine ⟨hd, hc, hv, ?_, ?_, ?_⟩
  · intro b _ _
    rw [hD]
    exact Nat.zero_le _
  · intro b hb _ hdigits
    rw [hvalue]
    by_cases heq : b.value = pow10 N
    · rw [heq]
    · exact (power_of_ten_nearest x N hclose b hb (hdigits.trans hD) heq).le
  · intro b hb _ hdigits heq
    by_cases hsame : b.value = pow10 N
    · exact hvalue.trans hsame.symm
    · have hstrict := power_of_ten_nearest x N hclose b hb (hdigits.trans hD) hsame
      rw [hvalue] at heq
      linarith

/-- The normalized coarse coefficient is shortest and uniquely closest;
the two cases cover both ordinary decades and exact powers of ten. -/
theorem coarse_shortest_closest (x r : ℚ) (m j : ℤ)
    (hlower : 1 < x - r) (hr : r < 5) (hv : |x - 10 * j| < r)
    (hgeometry : x = 2 * (m : ℚ) * r) (hm : 11 ≤ m) :
    (normalizeDecimal j.toNat 1).Optimal x r := by
  have hbounds := abs_lt.mp hv
  have hjQ : (0 : ℚ) < j := by linarith
  have hj : 0 < j := by exact_mod_cast hjQ
  have hjN : 0 < j.toNat := by omega
  have hcastI : (j.toNat : ℤ) = j := by omega
  have hcast : (j.toNat : ℚ) = j := by exact_mod_cast hcastI
  obtain ⟨hd, hc, he, hvalue⟩ := normalize_decimal_correct j.toNat hjN 1
  have hvalue' : (normalizeDecimal j.toNat 1).value = 10 * j := by
    rw [hvalue, hcast]
    norm_num [pow10]
    ring
  have hdv : |x - (normalizeDecimal j.toNat 1).value| < r := by rw [hvalue']; exact hv
  by_cases hpower : ∃ N : ℤ, (normalizeDecimal j.toNat 1).value = pow10 N
  · obtain ⟨N, hN⟩ := hpower
    exact coarse_power_optimal x r m _ N hd hc hN hdv hgeometry hm
  · exact coarse_nonpower_optimal x r _ hd hc he hr hdv (by simpa using hpower)

/-- Coarse acceptance implies optimality of the actual reference-normalized
coefficient, under the same cache contract and significand restriction. -/
theorem centered_coarse_optimal (u h c m : ℤ) (Y R : ℚ) (j : ℤ)
    (contract : CenteredContract2048 u h c m Y R) (hm : 11 ≤ m)
    (hresult : centeredDecision2048 u h c = some (.coarse j)) :
    (normalizeDecimal j.toNat 1).Optimal (10 * Y / 2048) (10 * R / 2048) := by
  have hv := centered_decision_sound_of_contract u h c m Y R (.coarse j) contract hresult
  change |Y - 2048 * j| < R at hv
  have hscale : |10 * Y / 2048 - 10 * j| = (10 / 2048 : ℚ) * |Y - 2048 * j| := by
    rw [show 10 * Y / 2048 - 10 * j = (10 / 2048 : ℚ) * (Y - 2048 * j)
      by ring, abs_mul]
    norm_num
  have hvalid : |10 * Y / 2048 - 10 * j| < 10 * R / 2048 := by rw [hscale]; nlinarith
  have hmQ : (11 : ℚ) ≤ m := by exact_mod_cast hm
  have hRpos : 0 ≤ R := by linarith [contract.radius_min]
  have hmul := mul_le_mul_of_nonneg_right hmQ hRpos
  have hlower : 1 < 10 * Y / 2048 - 10 * R / 2048 := by
    nlinarith [contract.geometry, contract.radius_min]
  apply coarse_shortest_closest _ _ m j hlower (by linarith [contract.radius_max]) hvalid
  · nlinarith [contract.geometry]
  · exact hm

/-- Coarse optimality at any actual decimal scale, with normalization run
directly at that scale rather than merely an abstract value rescaling. -/
theorem centered_coarse_optimal_scaled (u h c m : ℤ) (Y R : ℚ) (j k : ℤ)
    (contract : CenteredContract2048 u h c m Y R) (hm : 11 ≤ m)
    (hresult : centeredDecision2048 u h c = some (.coarse j)) :
    (normalizeDecimal j.toNat (k + 1)).Optimal
      ((10 * Y / 2048) * pow10 k) ((10 * R / 2048) * pow10 k) := by
  rw [show k + 1 = 1 + k by omega, normalize_decimal_shift]
  exact decimal_optimal_shift _ _ _ k (centered_coarse_optimal u h c m Y R j contract hm hresult)

end Boundragon

module

public import Boundragon.Decimal
public import Boundragon.Decision

/-!
Two-grid decimal selection in fine-grid units. Validity is tested against the
closed interval, a superset of either parity's parsing interval. The accepted
output is strictly inside, and optimality is proved against that larger set.
-/

public section

namespace Boundragon

/-- The decimal is valid, canonical, shortest, and uniquely closest among
all equally short valid decimal values. `digitIndex + 1` is the digit count.
-/
structure DecimalRep.Optimal (x r : ℚ) (d : DecimalRep) : Prop where
  /-- The recorded digit count is the actual coefficient digit count. -/
  wellFormed : d.WellFormed
  /-- Trailing zeroes have been removed. -/
  canonical : d.Canonical
  /-- Output is inside either parity's interval, since its endpoints are avoided. -/
  valid : |x - d.value| < r
  /-- No positive decimal at any exponent has fewer digits while remaining valid. -/
  shortest : ∀ b : DecimalRep, b.WellFormed → |x - b.value| ≤ r →
    d.digitIndex ≤ b.digitIndex
  /-- Among equally short valid decimals, the output minimizes numerical distance. -/
  closest : ∀ b : DecimalRep, b.WellFormed → |x - b.value| ≤ r →
    b.digitIndex = d.digitIndex → |x - d.value| ≤ |x - b.value|
  /-- Accepted filters avoid ties. Fallback uses `NearestEven` instead. -/
  unique_closest : ∀ b : DecimalRep, b.WellFormed → |x - b.value| ≤ r →
    b.digitIndex = d.digitIndex → |x - d.value| = |x - b.value| → d.value = b.value

/-- Multiplication by a decimal power preserves digit count and optimality,
including comparison with decimals at every other exponent. -/
theorem decimal_optimal_shift (x r : ℚ) (d : DecimalRep) (k : ℤ)
    (hd : d.Optimal x r) : (d.shift k).Optimal (x * pow10 k) (r * pow10 k) := by
  have hs := pow10_pos k
  have hdist (b : DecimalRep) :
      |x * pow10 k - b.value| = |x - (b.shift (-k)).value| * pow10 k := by
    calc
      _ = |(x - (b.shift (-k)).value) * pow10 k| := by
        congr 1
        rw [sub_mul, decimal_shift_cancel]
      _ = _ := by rw [abs_mul, abs_of_pos hs]
  have hback (b : DecimalRep) (hv : |x * pow10 k - b.value| ≤ r * pow10 k) :
      |x - (b.shift (-k)).value| ≤ r := by
    rw [hdist] at hv
    exact (mul_le_mul_iff_left₀ hs).mp hv
  refine ⟨hd.wellFormed, hd.canonical, ?_, ?_, ?_, ?_⟩
  · rw [decimal_shift_distance]
    exact mul_lt_mul_of_pos_right hd.valid hs
  · intro b hb hv
    exact hd.shortest (b.shift (-k)) hb (hback b hv)
  · intro b hb hv hdigits
    rw [decimal_shift_distance, hdist]
    exact mul_le_mul_of_nonneg_right
      (hd.closest (b.shift (-k)) hb (hback b hv) hdigits) hs.le
  · intro b hb hv hdigits heq
    rw [decimal_shift_distance, hdist] at heq
    have heq' := (mul_left_inj' (ne_of_gt hs)).mp heq
    have hvalue := hd.unique_closest (b.shift (-k)) hb (hback b hv) hdigits heq'
    rw [decimal_shift_value, hvalue, decimal_shift_cancel]

/-- A rounding interval narrower than one coarse step has at most one
coarse-grid point, including its closed endpoints. -/
theorem coarse_point_unique (x r : ℚ) (hr : r < 5) (i j : ℤ)
    (hi : |x - 10 * i| ≤ r) (hj : |x - 10 * j| ≤ r) : i = j := by
  have hbi := abs_le.mp hi
  have hbj := abs_le.mp hj
  by_contra hne
  rcases lt_or_gt_of_ne hne with hij | hji
  · have hstepI : i + 1 ≤ j := by omega
    have hstep : (i : ℚ) + 1 ≤ j := by exact_mod_cast hstepI
    linarith [hbi.1, hbj.2]
  · have hstepI : j + 1 ≤ i := by omega
    have hstep : (j : ℚ) + 1 ≤ i := by exact_mod_cast hstepI
    linarith [hbi.2, hbj.1]

/-- Absence of coarse points prevents the interval crossing a decimal decade.
The lower endpoint must be above one fine step, including the one-digit case.
-/
theorem fine_interval_decade (x r : ℚ) (n : ℤ) (D : ℕ)
    (hlower : 1 < x - r) (hn : |x - n| < r) (hd : HasDigitIndex n D)
    (hcoarse : ∀ j : ℤ, r < |x - 10 * j|) :
    pow10 D ≤ x - r ∧ x + r < pow10 ((D : ℤ) + 1) := by
  have hbn := abs_lt.mp hn
  have hlo : pow10 D ≤ (n : ℚ) := by rw [pow10_nat]; exact_mod_cast hd.1
  have hhi : (n : ℚ) < pow10 ((D : ℤ) + 1) := by
    rw [show (D : ℤ) + 1 = ((D + 1 : ℕ) : ℤ) by omega, pow10_nat]
    exact_mod_cast hd.2
  constructor
  · by_cases hD : D = 0
    · simp only [hD, Nat.cast_zero, pow10, zpow_zero]
      exact hlower.le
    · obtain ⟨j, hj⟩ := pow10_on_coarse D (by omega)
      by_contra hbad
      have hvalid : |x - 10 * j| ≤ r := by
        apply abs_le.mpr
        rw [← hj]
        constructor <;> linarith
      exact (not_le_of_gt (hcoarse j)) hvalid
  · obtain ⟨j, hj⟩ := pow10_on_coarse ((D : ℤ) + 1) (by omega)
    by_contra hbad
    have hvalid : |x - 10 * j| ≤ r := by
      apply abs_le.mpr
      rw [← hj]
      constructor <;> linarith
    exact (not_le_of_gt (hcoarse j)) hvalid

/-- All valid decimals share an order when the interval fits one decade. -/
theorem valid_decimal_order (x r : ℚ) (N : ℤ)
    (hinterval : pow10 N ≤ x - r ∧ x + r < pow10 (N + 1))
    (b : DecimalRep) (hb : b.WellFormed) (hvalid : |x - b.value| ≤ r) :
    b.exponent + (b.digitIndex : ℤ) = N := by
  have hbounds := abs_le.mp hvalid
  have horder : HasOrder b.value N := by
    constructor <;> linarith [hinterval.1, hinterval.2, hbounds.1, hbounds.2]
  exact decimal_order_unique b.value _ _ (decimal_order b hb) horder

/-- The two-grid reduction implies shortestness and unique closest selection
for a fine result. Comparisons cover every decimal exponent, including negative
ones, rather than just the implementation's two tested grids.
-/
theorem fine_shortest_closest (x r : ℚ) (n : ℤ) (D : ℕ)
    (hlower : 1 < x - r) (hn : |x - n| < r) (hd : HasDigitIndex n D)
    (hcoarse : ∀ j : ℤ, r < |x - 10 * j|)
    (hnearest : ∀ i : ℤ, i ≠ n → |x - n| < |x - i|) :
    DecimalRep.Optimal x r ⟨n, 0, D⟩ := by
  have hinterval := fine_interval_decade x r n D hlower hn hd hcoarse
  -- Same decimal order links a shorter coefficient to a larger exponent.
  have horder := valid_decimal_order x r D hinterval
  have hcanonical : ¬(10 : ℤ) ∣ n := by
    rintro ⟨j, hj⟩
    have hjQ : (n : ℚ) = 10 * j := by exact_mod_cast hj
    rw [hjQ] at hn
    linarith [hcoarse j]
  have hsame : ∀ b : DecimalRep, b.WellFormed → |x - b.value| ≤ r →
      b.digitIndex = D → b.value = (b.coefficient : ℚ) := by
    intro b hb hvalid hdigits
    have heq := horder b hb hvalid
    have he : b.exponent = 0 := by rw [hdigits] at heq; omega
    simp [DecimalRep.value, he, pow10]
  have hnval : (DecimalRep.mk n 0 D).value = (n : ℚ) := by
    simp [DecimalRep.value, pow10]
  refine ⟨hd, hcanonical, ?_, ?_, ?_, ?_⟩
  · simpa [DecimalRep.value, pow10] using hn
  · intro b hb hvalid
    change D ≤ b.digitIndex
    by_contra hbad
    have heq := horder b hb hvalid
    have he : 1 ≤ b.exponent := by omega
    -- A larger exponent places this allegedly shorter decimal on the excluded grid.
    obtain ⟨j, hj⟩ := decimal_on_coarse b he
    rw [hj] at hvalid
    exact (not_le_of_gt (hcoarse j)) hvalid
  · intro b hb hvalid hdigits
    rw [hnval]
    have hv := hsame b hb hvalid hdigits
    rw [hv]
    by_cases heq : b.coefficient = n
    · rw [heq]
    · exact (hnearest b.coefficient heq).le
  · intro b hb hvalid hdigits heq
    have hv := hsame b hb hvalid hdigits
    rw [hnval, hv] at heq ⊢
    by_contra hne
    have hInt : b.coefficient ≠ n := by intro h; exact hne (by rw [h])
    have hstrict := hnearest b.coefficient hInt
    linarith

/-- Fine acceptance implies canonical shortest and unique closest output in
fine-grid units. The significand bound excludes the first small subnormals.
-/
theorem centered_fine_optimal (u h c m : ℤ) (Y R : ℚ) (n : ℤ)
    (contract : CenteredContract2048 u h c m Y R) (hm : 11 ≤ m)
    (hresult : centeredDecision2048 u h c = some (.fine n)) :
    ∃ D : ℕ, DecimalRep.Optimal (10 * Y / 2048) (10 * R / 2048) ⟨n, 0, D⟩ := by
  obtain ⟨hvalid, hcoarse, hnearest⟩ :=
    centered_decision_sound_of_contract u h c m Y R (.fine n) contract hresult
  have hscale (i : ℤ) :
      |10 * Y / 2048 - i| = (10 / 2048 : ℚ) * |Y - 2048 * (i : ℚ) / 10| := by
    rw [show 10 * Y / 2048 - i = (10 / 2048 : ℚ) * (Y - 2048 * (i : ℚ) / 10)
      by ring, abs_mul]
    norm_num
  have hn : |10 * Y / 2048 - n| < 10 * R / 2048 := by
    rw [hscale]; nlinarith
  have hcoarse' : ∀ j : ℤ, 10 * R / 2048 < |10 * Y / 2048 - 10 * j| := by
    intro j
    have heq : |10 * Y / 2048 - 10 * j| = (10 / 2048 : ℚ) * |Y - 2048 * j| := by
      rw [show 10 * Y / 2048 - 10 * j = (10 / 2048 : ℚ) * (Y - 2048 * j)
        by ring, abs_mul]
      norm_num
    rw [heq]; nlinarith [hcoarse j]
  have hmQ : (11 : ℚ) ≤ m := by exact_mod_cast hm
  have hRpos : 0 ≤ R := by linarith [contract.radius_min]
  have hmul := mul_le_mul_of_nonneg_right hmQ hRpos
  have hlower : 1 < 10 * Y / 2048 - 10 * R / 2048 := by
    nlinarith [contract.geometry, contract.radius_min]
  have hnpos : 0 < n := by
    have hb := abs_lt.mp hn
    have hnQ : (0 : ℚ) < n := by linarith
    exact_mod_cast hnQ
  obtain ⟨D, hd⟩ := digit_index_exists n hnpos
  exact ⟨D, fine_shortest_closest _ _ n D hlower hn hd hcoarse' hnearest⟩

/-- The accepted fine branch is optimal at any actual decimal scale `10^k`. -/
theorem centered_fine_optimal_scaled (u h c m : ℤ) (Y R : ℚ) (n k : ℤ)
    (contract : CenteredContract2048 u h c m Y R) (hm : 11 ≤ m)
    (hresult : centeredDecision2048 u h c = some (.fine n)) :
    ∃ D : ℕ, DecimalRep.Optimal
      ((10 * Y / 2048) * pow10 k) ((10 * R / 2048) * pow10 k) ⟨n, k, D⟩ := by
  obtain ⟨D, hd⟩ := centered_fine_optimal u h c m Y R n contract hm hresult
  refine ⟨D, ?_⟩
  simpa [DecimalRep.shift] using decimal_optimal_shift _ _ _ k hd

end Boundragon

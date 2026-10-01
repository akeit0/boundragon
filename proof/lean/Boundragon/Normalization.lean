module

public import Boundragon.Decimal

/-! A terminating exact-integer reference normalizer and its decimal contract.
Correspondence with the C++ normalization shortcuts is a separate obligation.
-/

public section

namespace Boundragon

/-- Remove trailing decimal zeroes, preserving the represented value. -/
@[expose] def normalizeDecimal (n : ℕ) (e : ℤ) : DecimalRep :=
  if h : n ≠ 0 ∧ 10 ∣ n then normalizeDecimal (n / 10) (e + 1)
  else ⟨n, e, Nat.log 10 n⟩
termination_by n
decreasing_by exact Nat.div_lt_self (Nat.pos_of_ne_zero h.1) (by norm_num)

/-- Positive input normalizes to a canonical coefficient with exact digit
bounds, preserves its value, and never decreases its decimal exponent. -/
theorem normalize_decimal_correct (n : ℕ) (hn : 0 < n) (e : ℤ) :
    (normalizeDecimal n e).WellFormed ∧ (normalizeDecimal n e).Canonical ∧
    e ≤ (normalizeDecimal n e).exponent ∧
    (normalizeDecimal n e).value = (n : ℚ) * pow10 e := by
  induction n using Nat.strong_induction_on generalizing e with
  | h n ih =>
    rw [normalizeDecimal]
    by_cases hz : n ≠ 0 ∧ 10 ∣ n
    · rw [dif_pos hz]
      have hmul : 10 * (n / 10) = n := Nat.mul_div_cancel' hz.2
      have hpos : 0 < n / 10 := by omega
      obtain ⟨hw, hc, he, hv⟩ := ih (n / 10)
        (Nat.div_lt_self hn (by norm_num)) hpos (e + 1)
      refine ⟨hw, hc, by omega, ?_⟩
      rw [hv, pow10_step]
      have hmulQ : (10 : ℚ) * (n / 10 : ℕ) = n := by exact_mod_cast hmul
      calc
        _ = (10 * (n / 10 : ℕ) : ℚ) * pow10 e := by ring
        _ = _ := by rw [hmulQ]
    · rw [dif_neg hz]
      have hnz : n ≠ 0 := by omega
      have hc : ¬ (10 : ℤ) ∣ (n : ℤ) := by
        intro hd
        have hdN : (10 : ℕ) ∣ n := by exact_mod_cast hd
        exact hz ⟨hnz, hdN⟩
      refine ⟨?_, hc, le_rfl, rfl⟩
      change (10 : ℤ) ^ (Nat.log 10 n) ≤ (n : ℤ) ∧
        (n : ℤ) < (10 : ℤ) ^ (Nat.log 10 n + 1)
      constructor
      · exact_mod_cast Nat.pow_log_le_self 10 hnz
      · exact_mod_cast Nat.lt_pow_succ_log_self (by norm_num : 1 < (10 : ℕ)) n

/-- A canonical coefficient already has the largest exponent among all
decimal representations of the same value. -/
theorem canonical_exponent_max (d b : DecimalRep) (hd : d.Canonical)
    (hvalue : d.value = b.value) : b.exponent ≤ d.exponent := by
  by_contra hbad
  have he : 1 ≤ (b.shift (-d.exponent)).exponent := by
    simp only [DecimalRep.shift]
    omega
  obtain ⟨j, hj⟩ := decimal_on_coarse (b.shift (-d.exponent)) he
  have hs := pow10_pos d.exponent
  have hcancel := decimal_shift_cancel b d.exponent
  have hcoeff : (d.coefficient : ℚ) = 10 * j := by
    rw [hj, ← hvalue] at hcancel
    change 10 * (j : ℚ) * pow10 d.exponent =
      (d.coefficient : ℚ) * pow10 d.exponent at hcancel
    nlinarith
  have hcoeffI : d.coefficient = 10 * j := by exact_mod_cast hcoeff
  exact hd ⟨j, hcoeffI⟩

/-- Canonicalization minimizes the digit count for a fixed numeric value. -/
theorem canonical_digits_min (d b : DecimalRep) (hd : d.WellFormed)
    (hc : d.Canonical) (hb : b.WellFormed) (hvalue : d.value = b.value) :
    d.digitIndex ≤ b.digitIndex := by
  have horderB := decimal_order b hb
  rw [← hvalue] at horderB
  have horder := decimal_order_unique d.value _ _ (decimal_order d hd) horderB
  have hexp := canonical_exponent_max d b hc hvalue
  omega

/-- The canonical decimal representation is unique, including digit metadata. -/
theorem canonical_decimal_unique (d b : DecimalRep) (hd : d.WellFormed)
    (hc : d.Canonical) (hb : b.WellFormed) (hbc : b.Canonical)
    (hvalue : d.value = b.value) : d = b := by
  have heq : d.exponent = b.exponent := le_antisymm
    (canonical_exponent_max b d hbc hvalue.symm) (canonical_exponent_max d b hc hvalue)
  have horderB := decimal_order b hb
  rw [← hvalue] at horderB
  have horder := decimal_order_unique d.value _ _ (decimal_order d hd) horderB
  have hD : d.digitIndex = b.digitIndex := by omega
  have hs := pow10_pos d.exponent
  have hcoeffQ : (d.coefficient : ℚ) = b.coefficient := by
    change (d.coefficient : ℚ) * pow10 d.exponent =
      (b.coefficient : ℚ) * pow10 b.exponent at hvalue
    rw [← heq] at hvalue
    nlinarith
  have hcoeff : d.coefficient = b.coefficient := by exact_mod_cast hcoeffQ
  cases d
  cases b
  simp_all

/-- A change of decimal scale commutes with reference normalization. -/
theorem normalize_decimal_shift (n : ℕ) (e k : ℤ) :
    normalizeDecimal n (e + k) = (normalizeDecimal n e).shift k := by
  induction n using Nat.strong_induction_on generalizing e with
  | h n ih =>
    conv_lhs => unfold normalizeDecimal
    conv_rhs => arg 1; unfold normalizeDecimal
    split_ifs with hz
    · rw [show e + k + 1 = (e + 1) + k by omega,
        ih (n / 10) (Nat.div_lt_self (Nat.pos_of_ne_zero hz.1) (by norm_num)) (e + 1)]
    · rfl

end Boundragon

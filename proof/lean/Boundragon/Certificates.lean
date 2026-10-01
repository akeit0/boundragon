module

public import Boundragon.Geometry
public import Mathlib.Algebra.Order.BigOperators.Group.Finset

/-! Soundness of ordered floor-sum certificates. This proves the reduction
from exact sums to pointwise equality, not the Euclidean sum evaluator or
the concrete cache certificates. -/

public section

namespace Boundragon

/-- Equal sums of ordered integer sequences force equality at every index.
The ordering assumption is essential: equality of sums alone is insufficient.
-/
theorem ordered_sum_eq_pointwise (n : ℕ) (f g : ℕ → ℤ)
    (horder : ∀ i < n, f i ≤ g i)
    (hsum : (∑ i ∈ Finset.range n, f i) = ∑ i ∈ Finset.range n, g i) :
    ∀ i < n, f i = g i := by
  have hnonneg : ∀ i ∈ Finset.range n, 0 ≤ g i - f i := by
    intro i hi
    exact sub_nonneg.mpr (horder i (Finset.mem_range.mp hi))
  have hzero : (∑ i ∈ Finset.range n, (g i - f i)) = 0 := by
    rw [Finset.sum_sub_distrib, hsum, sub_self]
  have hterms := (Finset.sum_eq_zero_iff_of_nonneg hnonneg).mp hzero
  intro i hi
  exact (sub_eq_zero.mp (hterms i (Finset.mem_range.mpr hi))).symm

/-- Checking the endpoints orders two affine rational functions throughout
an integer interval. Either slope sign is allowed, including zero.
-/
theorem affine_order_on_interval (a b c d : ℚ) (lo hi i : ℤ)
    (hlo : a * lo + b ≤ c * lo + d) (hhi : a * hi + b ≤ c * hi + d)
    (hiRange : lo ≤ i ∧ i ≤ hi) : a * i + b ≤ c * i + d := by
  have hL : (lo : ℚ) ≤ i := by exact_mod_cast hiRange.1
  have hH : (i : ℚ) ≤ hi := by exact_mod_cast hiRange.2
  by_cases hslope : 0 ≤ c - a
  · nlinarith
  · nlinarith

/-- On an ordered affine piece, an exact floor-sum certificate proves all
floor values equal. The caller supplies the piece and its mathematical sum.
-/
theorem affine_floor_sum_eq (n : ℕ) (lo : ℤ) (a b c d : ℚ)
    (hlo : a * lo + b ≤ c * lo + d)
    (hhi : a * (lo + ((n - 1 : ℕ) : ℤ)) + b ≤
      c * (lo + ((n - 1 : ℕ) : ℤ)) + d)
    (hsum : (∑ i ∈ Finset.range n, ⌊a * (lo + (i : ℤ)) + b⌋) =
      ∑ i ∈ Finset.range n, ⌊c * (lo + (i : ℤ)) + d⌋) :
    ∀ i < n, ⌊a * (lo + (i : ℤ)) + b⌋ = ⌊c * (lo + (i : ℤ)) + d⌋ := by
  apply ordered_sum_eq_pointwise n _ _ _ hsum
  intro i hi
  apply Int.floor_mono
  have hhi' : a * ((lo + ((n - 1 : ℕ) : ℤ) : ℤ) : ℚ) + b ≤
      c * ((lo + ((n - 1 : ℕ) : ℤ) : ℤ) : ℚ) + d := by simpa using hhi
  have horder := affine_order_on_interval a b c d lo
    (lo + ((n - 1 : ℕ) : ℤ)) (lo + (i : ℤ))
    hlo hhi' (by constructor <;> omega)
  simpa using horder

end Boundragon

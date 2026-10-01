module

public import Boundragon.Geometry

/-! Fine guard stability for an arbitrary positive integer modulus. -/

public section

namespace Boundragon

/-- The accepted shifted remainder keeps both the estimated and true
rounding expressions strictly between the same consecutive multiples of `M`.
This is the mathematical form of `((t + 5*c) & (M-1)) > 10*c`.
-/
theorem fine_guard_bounds (t c : ℤ) (M : ℕ) (δ : ℚ)
    (hM : 0 < M) (hc : 0 ≤ c)
    (herr : -(c : ℚ) ≤ δ ∧ δ < c)
    (hguard : 10 * c < (t + 5 * c) % (M : ℤ)) :
    let n := (t + 5 * c) / (M : ℤ)
    (n : ℚ) < (t : ℚ) / M ∧ (t : ℚ) / M < (n : ℚ) + 1 ∧
    (n : ℚ) < ((t : ℚ) + 5 * δ) / M ∧
      ((t : ℚ) + 5 * δ) / M < (n : ℚ) + 1 := by
  dsimp
  have hMQ : (0 : ℚ) < M := by exact_mod_cast hM
  have hcQ : (0 : ℚ) ≤ c := by exact_mod_cast hc
  have hMI : (0 : ℤ) < M := by exact_mod_cast hM
  have hrI := Int.emod_lt_of_pos (t + 5 * c) hMI
  have hrQ : (((t + 5 * c) % (M : ℤ) : ℤ) : ℚ) < M := by exact_mod_cast hrI
  have hgQ : 10 * (c : ℚ) < ((t + 5 * c) % (M : ℤ) : ℤ) := by
    exact_mod_cast hguard
  have hdQ : (t : ℚ) + 5 * c =
      (M : ℚ) * ((t + 5 * c) / (M : ℤ) : ℤ) +
        ((t + 5 * c) % (M : ℤ) : ℤ) := by
    exact_mod_cast (Int.mul_ediv_add_emod (t + 5 * c) (M : ℤ)).symm
  refine ⟨(lt_div_iff₀ hMQ).mpr ?_, (div_lt_iff₀ hMQ).mpr ?_,
    (lt_div_iff₀ hMQ).mpr ?_, (div_lt_iff₀ hMQ).mpr ?_⟩ <;>
    nlinarith [herr.1, herr.2]

/-- Fine acceptance preserves the rounded integer and excludes an exact tie. -/
theorem centered_fine_round (t c : ℤ) (M : ℕ) (δ : ℚ)
    (hM : 0 < M) (hc : 0 ≤ c)
    (herr : -(c : ℚ) ≤ δ ∧ δ < c)
    (hguard : 10 * c < (t + 5 * c) % (M : ℤ)) :
    ⌊((t : ℚ) + 5 * δ) / M⌋ = t / (M : ℤ) ∧
    ((t / (M : ℤ) : ℤ) : ℚ) < ((t : ℚ) + 5 * δ) / M ∧
      ((t : ℚ) + 5 * δ) / M < ((t / (M : ℤ) : ℤ) : ℚ) + 1 := by
  obtain ⟨htlo, hthi, hylo, hyhi⟩ := fine_guard_bounds t c M δ hM hc herr hguard
  have ht : ⌊(t : ℚ) / M⌋ = (t + 5 * c) / (M : ℤ) :=
    Int.floor_eq_iff.mpr ⟨htlo.le, hthi⟩
  rw [Rat.floor_intCast_div_natCast] at ht
  rw [← ht] at hylo hyhi
  exact ⟨Int.floor_eq_iff.mpr ⟨hylo.le, hyhi⟩, hylo, hyhi⟩

end Boundragon

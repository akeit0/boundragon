module

public import Boundragon.Binary64

/-!
Read this model in fixed-point coarse coordinates: the exact center is `Y`,
the radius is `R`, the cached lower estimate is `u`, and `h = floor R`.
`c` is half the cache-error budget, so the centered estimate `u+c` has
error in [-c,c). The binary significand `m` gives `Y = 2*m*R`.

The guard chooses a grid before normalization. `none` transfers control to
fallback; it is not an assertion that no valid decimal exists.
-/

public section

namespace Boundragon

/-- A coarse coefficient uses spacing `2048`; a fine coefficient uses `2048/10`. -/
inductive CenteredChoice where
  | coarse (j : ℤ)
  | fine (d : ℤ)

/-- Exact-integer model of the binary64 centered filter's decision branches.
`none` means fallback. Unsigned masks, signed shifts, overflow, and cache
construction are outside this model; the algebraic guard identities are in
`Binary64.lean`.
-/
@[expose] def centeredDecision2048 (u h c : ℤ) : Option CenteredChoice :=
  let j := coarseIndex2048 u c
  let w := centeredResidual2048 u c
  let D := |w|
  -- The cache error could move the coarse point across a parsing endpoint.
  if -c + 1 ≤ D - h ∧ D - h ≤ c then none
  -- Outside that shell, a distance below the integer radius proves validity.
  else if D < h then some (.coarse j)
  -- The shifted remainder must stay away from a fine rounding boundary.
  else if (5 * w + 512 + 5 * c) % 1024 ≤ 10 * c then none
  else some (.fine (fineCoefficient2048 j w))

/-- Cache and regular-interval assumptions required by the binary64 model.
These are theorem hypotheses, not additional logical axioms.
-/
structure CenteredContract2048 (u h c m : ℤ) (Y R : ℚ) : Prop where
  /-- The cache error budget is a positive number of fixed-point units. -/
  error_pos : 0 < c
  /-- What cache construction must establish, independently of guard safety. -/
  cache_error : 0 ≤ Y - u ∧ Y - u < 2 * c
  /-- The symmetric binary parsing interval in these coordinates. -/
  geometry : Y = 2 * (m : ℚ) * R
  /-- The interval is at least one fine step wide. -/
  radius_min : (2048 : ℚ) / 20 ≤ R
  /-- The interval is narrower than one coarse step. -/
  radius_max : R < 1024
  /-- The implemented integer radius must be exactly the radius floor. -/
  radius_floor : (h : ℚ) ≤ R ∧ R < (h : ℚ) + 1

/-- Coarse choices are valid; fine choices are valid, uniquely nearest on the
fine grid, and have no valid competitor anywhere on the coarse grid.
Shortestness after decimal normalization is a separate two-grid theorem.
-/
@[expose] def ChoiceCorrect2048 (Y R : ℚ) : CenteredChoice → Prop
  | .coarse j => |Y - 2048 * j| < R
  | .fine d =>
      |Y - 2048 * (d : ℚ) / 10| < R ∧
      (∀ j : ℤ, R < |Y - 2048 * j|) ∧
      (∀ i : ℤ, i ≠ d → |10 * Y / 2048 - d| < |10 * Y / 2048 - i|)

/-- Every accepted branch of the centered binary64 model is correct under
the regular-interval geometry and the one-sided cache-error contract.
-/
theorem centered_decision_sound_of_contract (u h c m : ℤ) (Y R : ℚ) (choice : CenteredChoice)
    (contract : CenteredContract2048 u h c m Y R)
    (hresult : centeredDecision2048 u h c = some choice) :
    ChoiceCorrect2048 Y R choice := by
  rcases contract with ⟨hc, herr, hgeometry, hRmin, hRmax, hradius⟩
  let j := coarseIndex2048 u c
  let w := centeredResidual2048 u c
  let D := |w|
  have hdecode : u + c = 2048 * j + w := (centered_decode_2048 u c).1
  have hwQ := centered_residual_bounds_2048 u c
  have hD := centered_distance_eq_2048 u c
  have he : -(c : ℚ) ≤ Y - ((u + c : ℤ) : ℚ) ∧
      Y - ((u + c : ℤ) : ℚ) < c := by
    simpa only [Int.cast_add] using center_error Y u c herr
  change (if -c + 1 ≤ D - h ∧ D - h ≤ c then none
    else if D < h then some (.coarse j)
    else if (5 * w + 512 + 5 * c) % 1024 ≤ 10 * c then none
    else some (.fine (fineCoefficient2048 j w))) = some choice at hresult
  by_cases hamb : -c + 1 ≤ D - h ∧ D - h ≤ c
  · simp [hamb] at hresult
  · rw [if_neg hamb] at hresult
    have hpartition := (coarse_guard_partition D h c).mp hamb
    by_cases hcoarse : D < h
    · rw [if_pos hcoarse] at hresult
      have hchoice : CenteredChoice.coarse j = choice := Option.some.inj hresult
      rw [← hchoice]
      change |Y - 2048 * j| < R
      have hgI : D ≤ h - c := by omega
      have hgQ : (D : ℚ) ≤ (h : ℚ) - c := by exact_mod_cast hgI
      have hguardQ : |((u + c : ℤ) : ℚ) - 2048 * j| ≤ (h : ℚ) - c := by
        rw [hD]; exact hgQ
      exact centered_coarse_accept_2048 m (u + c) j h c Y R
        (by linarith) hRmax hgeometry hradius he hguardQ
    · rw [if_neg hcoarse] at hresult
      by_cases hfine : (5 * w + 512 + 5 * c) % 1024 ≤ 10 * c
      · simp [hfine] at hresult
      · rw [if_neg hfine] at hresult
        have hchoice : CenteredChoice.fine (fineCoefficient2048 j w) = choice :=
          Option.some.inj hresult
        rw [← hchoice]
        have hgI : h + c + 1 ≤ D := by omega
        have hgQ : (h : ℚ) + c + 1 ≤ D := by exact_mod_cast hgI
        have hf : 10 * c < (5 * w + 512 + 5 * c) % 1024 := by omega
        exact ⟨fine_coefficient_valid_2048 Y R (u + c) j w c hdecode hc.le he hf hRmin,
          centered_coarse_reject 2048 Y R (u + c) j h c (by norm_num) hwQ hradius.2 he
            (by rw [hD]; exact hgQ),
          fine_coefficient_unique_2048 Y (u + c) j w c hdecode hc.le he hf⟩

/-- Compatibility theorem exposing the original individual hypotheses. -/
theorem centered_decision_sound (u h c m : ℤ) (Y R : ℚ) (choice : CenteredChoice)
    (hc : 0 < c) (herr : 0 ≤ Y - u ∧ Y - u < 2 * c)
    (hgeometry : Y = 2 * (m : ℚ) * R)
    (hRmin : (2048 : ℚ) / 20 ≤ R) (hRmax : R < 1024)
    (hradius : (h : ℚ) ≤ R ∧ R < (h : ℚ) + 1)
    (hresult : centeredDecision2048 u h c = some choice) :
    ChoiceCorrect2048 Y R choice :=
  centered_decision_sound_of_contract u h c m Y R choice
    ⟨hc, herr, hgeometry, hRmin, hRmax, hradius⟩ hresult

end Boundragon

# binary64 explanation — en

<!-- SPDX-License-Identifier: Unlicense -->

## definition.E

Stored 11-bit exponent: {{raw}}. Exponent zero is subnormal/zero; 2047 is infinity/NaN.

## definition.F

Stored 52-bit fraction: {{fraction}}, before adding the hidden bit.

## definition.m

Integer binary significand: {{m}}. Normal inputs restore a leading 1 at bit 52.

## definition.q

Binary exponent: $q={{q}}$ in $|x|=m\,2^q$.

## definition.s

Discarded binary places: 1075 minus the stored exponent.

## definition.k

Fine decimal exponent. The neighboring coarse grid has exponent k+1.

## definition.p

Decimal cache index −k−1; selects the normalized power of ten.

## definition.fs

Alignment shift, between 8 and 11. It leaves eleven fractional bits in the high-word result.

## definition.hi

High 64-bit cache limb. Its discarded low limb is covered by certified error bounds.

## definition.b

Binary exponent of the decimal power: $\lfloor\log_2(10^p)\rfloor$. Distinct from the input exponent q.

## definition.T

Real normalized decimal power $10^p\times2^{63-b}$, in [2⁶³,2⁶⁴). The cached integer hi is its floor.

## definition.n

Aligned integer significand $m\times2^{\mathrm{fs}}$. It fits in 64 bits.

## definition.z

Input magnitude in coarse-grid units: $|x|/10^{k+1}$. Integers are coarse points; tenths are fine points.

## definition.Y

Exact scaled position 2048z. One unit is 1/2048 of a coarse spacing.

## definition.v

Centered approximation u+1, before adding the half-spacing bias used to extract a coarse candidate.

## definition.centered

v plus the half-spacing 1024; its quotient and remainder give I and w.

## definition.ρ

Exact rounding-interval radius in the same 1/2048 coarse units. The integer radius h is its floor.

## definition.u

High 64 bits of the aligned-significand × high-cache product.

## definition.I

Coarse integer candidate extracted from the centered product. Multiply by $10^{k+1}$.

## definition.w

Signed centered residual in [−1024,1023], measured in 1/2048 coarse spacings.

## definition.h.yes

Corrected exact interval radius in 64-bit fractional units; distinct from the fast radius.

## definition.h.no

Interval radius in the current scale. The power procedure also has a smaller lower radius.

## definition.d

Signed boundary distance |w|−h. Values 0 and 1 are uncertain. Negative means a coarse interior point.

## definition.c

Coarse mask: −1 when d<0, otherwise 0. It suppresses the fine digit and its guard for a coarse choice.

## definition.R

Fine-rounding numerator 5w+512. Dividing by 1024 is equivalent to (10w+1024)/2048.

## definition.g

Fine ambiguity test: low ten bits of R+5 OR the unsigned coarse mask. Values at most 10 need the exact finish.

## definition.tail

Signed adjustment to $10I$ in fine-grid units, between −5 and 5; masking selects zero for the coarse grid.

## definition.P

Complete scaled integer product: floor(cache × aligned significand / $2^{64}$).

## definition.cache

Complete normalized 128-bit power of ten, reconstructed for the full-precision calculation.

## definition.shift

Left shift for the complete product or power-of-two calculation; distinct from the ordinary path’s fs.

## definition.integer

Exact integer coefficient before removing trailing decimal zeroes.

## definition.digit

Fine-grid digit selected from the complete fractional position.

## definition.up

True when the upper coarse point belongs to the rounding interval.

## definition.down

True when the lower coarse point belongs to the rounding interval.

## definition.boundary

Result of the boundary test 0 ≤ d < 2.

## definition.rounding

Result of the fine-rounding test g ≤ 10.

## definition.low.yes

Recovered low 64-bit cache word.

## definition.low.no

Low 64 bits of the biased digit product, compared with limit.

## definition.limit

Largest low word that cannot carry into the digit when the omitted error is added.

## definition.sig_0

Decimal coefficient before removing trailing zeroes.

## definition.exp_0

Decimal exponent before removing trailing zeroes.

## definition.f

Exact-finish 64-bit fractional position, or the bounded position in the power procedure.

## definition.error

Largest possible low-cache contribution in the power procedure’s fractional scale.

## definition.upper

Largest possible power fraction f + error; these occupy disjoint bits.

## definition.half

Lower interval radius h/2, rounded down, for the asymmetric power case.

## definition.sig

Canonical decimal coefficient {{sig}}. No trailing decimal zeroes for finite nonzero results.

## definition.exp

Decimal exponent {{exp}}. Sentinel 10000 marks a nonfinite value.

## definition.negative

Preserved input sign, applied after the magnitude calculation, including zero.

## decode.read-all-64-bits.title

Read all 64 bits

## decode.read-all-64-bits.body

{{bits}} stores one sign bit, 11 exponent bits and 52 fraction bits. Normal values have 53 significant binary bits after restoring the hidden leading 1.

## decode.restore-this-binary-value.title

Restore this binary value

## decode.restore-this-binary-value.body.yes

Exponent 2047 denotes infinity or NaN, so no finite equation is formed.

## decode.restore-this-binary-value.body.no.yes

Subnormals have no hidden bit, and spacing 2⁻¹⁰⁷⁴.

## decode.restore-this-binary-value.body.no.no

Subtract both the exponent bias 1023 and the 52 stored fraction places.

## decode.use-the-binary64-interval.title

Use the binary64 interval

## decode.use-the-binary64-interval.body

The shortest decimal must round back to these same 64 bits. A binary32 interval would be wider and solve a different problem. Sign is applied separately.

## check-special.dispatch-before-the-approximation.title

Dispatch before the approximation

## check-special.dispatch-before-the-approximation.body

Raw exponent zero sends both zero and subnormals to the specialized slow handler. Exponent 2047 returns infinity or a NaN payload directly. Unlike binary32, every nonzero binary64 subnormal uses the complete finish.

## check-integer-range.cover-exact-integers-below-2.title

Cover exact integers below 2⁵³

## check-integer-range.cover-exact-integers-below-2.body

The integer shortcut tests 1 ≤ |x| < 2⁵³. Stored exponents 1023…1075 give a right shift between 52 and zero. The fractional-bit test is nested and is reached only in this range.

## check-integer-bits.no-nonzero-bit-may-be-discarded.title

No nonzero bit may be discarded

## check-integer-bits.no-nonzero-bit-may-be-discarded.body

s = 1075 − E. If the low s fraction bits are all zero, shifting gives an exact integer. This shortcut precedes the power check, so powers of two in this range also return here.

## integer.shift-then-remove-decimal-zeroes.title

Shift, then remove decimal zeroes

## integer.shift-then-remove-decimal-zeroes.body

All discarded bits were zero. The coefficient is exact at exponent zero. Bounded modular-inverse/rotate tests remove a first zero, then groups of 8,4,2,1 without an unbounded loop.

## check-power.a-dedicated-asymmetric-interval-procedure.title

A dedicated asymmetric-interval procedure

## check-power.a-dedicated-asymmetric-interval-procedure.body

The integer shortcut has already failed or was out of range. A zero fraction identifies a remaining power of two. Its lower neighboring gap is generally half the upper gap, so the ordinary symmetric guard is not used.

## scale.measure-the-input-on-the-decimal-grids.title

Measure the input on the decimal grids

## scale.measure-the-input-on-the-decimal-grids.body

A decimal grid is a set of candidate values, each an integer coefficient times a fixed power of ten. Here $k$ names the **fine** exponent: fine spacing is $10^k$ and coarse spacing is $10^{k+1}$. Every coarse point is a fine point too, but its coefficient needs one less factor of ten before normalization.

Choose $k$ from the **binary gap** $2^q$, rather than the magnitude $|x|$. The fine spacing is at most that gap; the coarse spacing is larger. On this symmetric path, the rounding interval has width $2^q$, so it contains at most one coarse point, and the nearest fine point supplies a valid answer. Test coarse membership first to seek fewer significant digits; if no coarse point fits, select the closest fine point. The two-grid overview checks this input's exact candidates.

The bits gave us $|x|=m\,2^q$. Dividing the whole interval by $10^{k+1}$ preserves membership and gives the coordinate $z$: coarse candidates are integers, fine candidates are tenths. The integer product will approximate $2048z$, so one retained unit means $1/2048$ of a coarse spacing. We need a nearby integer, its signed offset, and the interval radius in those same units.

## scale.choose-a-power-from-a-finite-cache.title

Choose a power from a finite cache

## scale.choose-a-power-from-a-finite-cache.body

Scaling onto the decimal grids requires a power of ten. Computing a large $10^p$, or its reciprocal when $p<0$, and normalizing it exactly would require large-integer powers and division for each input. The cache stores this work in advance; conversion selects one multiplier.

The fine-grid exponent $k$ is obtained by a fixed integer multiplication and shift. Over all normal binary64 exponents, $-1074\le q\le971$ gives $-324\le k\le292$ and $-293\le p\le323$: **617 required powers**. The stored table spans {{cache_min}}…{{cache_max}}, with {{cache_entries}} entries. Its final entry, {{cache_max}}, is outside this ordinary path. For this input, the selected cache index is {{cache_index}}.

## scale.normalize-the-cached-multiplier-to-64-bits.title

Normalize the cached multiplier to 64 bits

## scale.normalize-the-cached-multiplier-to-64-bits.body

The power $10^p$ may be a small fraction or a large integer. Separate its binary exponent $b$ and move its significand into $[2^{63},2^{64})$. This normalized real multiplier is $T$; the cache stores its integer floor $\mathrm{hi}$. Thus the omitted fraction is less than one. For this input, the cached word is `{{bits}}`. The complete calculation can reconstruct a 128-bit multiplier; this approximation reads its upper 64 bits.

## scale.one-64-64-bit-product-retain-its-upper-half.title

One 64 × 64-bit product; retain its upper half

## scale.one-64-64-bit-product-retain-its-upper-half.body

@notation q b

Align the 53-bit significand by shifting it left by $\mathrm{fs}$ bits; call the resulting integer $n$. The alignment makes the retained product use 2048 units per coarse-grid spacing. For every normal exponent, $8\le\mathrm{fs}\le11$, so $n$ fits in 64 bits. A table indexed by the stored binary exponent supplies the shift.

Multiplying $n$ by the cached word $\mathrm{hi}$ produces 128 bits. Keeping the upper 64 bits is floor division by $2^{64}$. One integer multiplication therefore gives $u$, an approximate position on the decimal grid.

## scale.bound-both-sources-of-omitted-information.title

Bound both sources of omitted information

## scale.bound-both-sources-of-omitted-information.body

Two operations lose information: replacing the real multiplier $T$ by its floor $\mathrm{hi}$, and discarding the low half of the product. Since $n<2^{64}$ and $0\le T-\mathrm{hi}<1$, the first loss is less than one scaled unit. The second loss is also less than one. Both round downward, so their sum is below two. The bounds below compare $u$ directly with the exact scaled position $Y$.

## scale.why-add-1025-and-why-keep-eleven-bits.title

Why add 1025, and why keep eleven bits?

## scale.why-add-1025-and-why-keep-eleven-bits.body

One coarse spacing is 2048 units; half a spacing is 1024. First add 1 to center the downward error, defining $v$. Then add 1024 to select the nearest coarse integer. The implementation combines these additions as 1025. The quotient gives candidate $I$; the low eleven bits, shifted by −1024, give the signed offset $w$. A negative offset places the input estimate to the left of $I$.

## scale.get-the-interval-radius-from-the-same-cached-word.title

Get the interval radius from the same cached word

## scale.get-the-interval-radius-from-the-same-cached-word.body

The power-of-two branch has already handled asymmetric gaps. On this ordinary path, adjacent binary values differ by $2^q$, so the interval half-width is $2^{q-1}$. Measure this radius in the same 1/2048 coarse units and call it $\rho$. Its integer floor $h$ comes from a shift of $\mathrm{hi}$; the floor is certified exact. The next guards compare $|w|$ with $h$ and test whether the remaining uncertainty could change the fine digit.

## scale.what-is-stored-and-what-is-reconstructed-only-when-needed.title

What is stored, and what is reconstructed only when needed?

## scale.what-is-stored-and-what-is-reconstructed-only-when-needed.body

The high-word table has {{cache_entries}} × 8 = {{highBytes}} bytes. The shift table has {{shift_entries}} one-byte entries (including the special exponent encodings). Complete powers are reconstructed from {{major_entries}} 128-bit anchors, {{minor_entries}} 64-bit minor powers: {{compactBytes}} bytes, instead of storing {{cache_entries}} full 128-bit powers ({{full_cache_bytes}} bytes). These arrays total {{total_cache_bytes}} bytes. An accepted ordinary result needs no low-cache reconstruction; uncertain guards invoke the complete calculation.

## check-boundary.only-distances-zero-and-one-are-uncertain.title

Only distances zero and one are uncertain

## check-boundary.only-distances-zero-and-one-are-uncertain.body

The C++ unsigned test rejects negative d. The mathematical equivalent is 0 ≤ d < 2. These two boundary bands cannot be certified from the high-word approximation. This outcome never skips the fine-rounding test.

## check-rounding.guard-a-narrow-fine-rounding-window.title

Guard a narrow fine-rounding window

## check-rounding.guard-a-narrow-fine-rounding-window.body

The modulo term detects rounding thresholds. For c = −1, OR with its unsigned representation sets g to 2³²−1, suppressing the fine ambiguity for a coarse interior point. Otherwise g ≤ 10 requests full precision. This test is evaluated even if the boundary test was true.

## check-ambiguity.combine-two-already-evaluated-results.title

Combine two already evaluated results

## check-ambiguity.combine-two-already-evaluated-results.body

The native expression uses bitwise OR on booleans, not short-circuit OR. Both tests have run. Either uncertainty sends the original input bits to the complete calculation; when both tests are false, the approximation certifies the result.

## choose.select-the-signed-fine-adjustment.title

Select the signed fine adjustment

## choose.select-the-signed-fine-adjustment.body

The coarse candidate is $I\times10^{k+1}$. On the fine grid the same value has coefficient $10I$, and one step changes that coefficient by one. The centered offset $w/2048$ in coarse units becomes $10w/2048$ in fine units. Floor division with the half-step bias rounds this adjustment to $\mathrm{tail}$, giving the fine coefficient $10I+\mathrm{tail}$. The guards have already certified that omitted information cannot change this selection or hide a tie. The coarse mask clears the adjustment when a coarse point is valid. A negative adjustment moves left of $I$, independently of the input sign.

## check-tail.avoid-an-unnecessary-multiply-divide-pair.title

Avoid an unnecessary multiply/divide pair

## check-tail.avoid-an-unnecessary-multiply-divide-pair.body

When $\mathrm{tail}=0$, the value is $I\times10^{k+1}$: normalize $I$ directly, avoiding a multiply-by-ten followed immediately by division by ten. When $\mathrm{tail}\ne0$, return coefficient $10I+\mathrm{tail}$ and exponent $k$ directly. The adjustment lies between −5 and 5, so a nonzero adjustment leaves no trailing decimal zero.

## fine.return-the-certified-grid-point.title

Return the certified grid point

## fine.return-the-certified-grid-point.body.yes

The coarse grid supplies the shortest candidate. Remove decimal zeroes in bounded groups; a finer grid would add a needless digit.

## fine.return-the-certified-grid-point.body.no

The coarse candidates are excluded and fine rounding is stable. The preceding test established $\mathrm{tail}\ne0$, so return $\mathrm{sig}=10I+\mathrm{tail}$ and $\mathrm{exp}=k$ directly. No trailing-zero removal is needed.

## exact.why-this-input-needs-the-complete-finish.title

Why this input needs the complete finish

## exact.why-this-input-needs-the-complete-finish.body.yes

Every nonzero subnormal bypasses the normal high-word filter. Its exact handler uses fixed k = −324, shift = 8 and the full $10^{323}$ cache.

## exact.why-this-input-needs-the-complete-finish.body.no

One or both ambiguity tests requested more precision. The approximate route did not establish the answer; this is an expected branch, not a wrong result.

## exact.recover-both-cache-limbs.title

Recover both cache limbs

## exact.recover-both-cache-limbs.body

Major and minor powers reconstruct a coefficient C or C+1 with the exact high limb. The certificate proves identical rounding decisions without a correction bitmap. Multiplying both limbs recovers the interval information discarded by the hot path.

## resolve.use-the-complete-integer-product.title

Use the complete integer product

## resolve.use-the-complete-integer-product.body

Extract a coarse integral and 64-bit fractional position from the complete scaled product. The shift is the exact finish’s alignment, not the hot path’s fs.

## resolve.correct-endpoints-for-binary-parity.title

Correct endpoints for binary parity

## resolve.correct-endpoints-for-binary-parity.body

h receives one unit for an even significand, accounting for included midpoint ties. up detects unsigned wrap at the upper coarse point; down checks the lower point.

## resolve.choose-a-grid-and-resolve-decimal-ties.title

Choose a grid and resolve decimal ties

## resolve.choose-a-grid-and-resolve-decimal-ties.body

A valid coarse point wins before fine rounding. Otherwise use the complete fraction, the certified +6 correction, and the special $f=2^{62}$ case: ten times one quarter is 2.5 and ties to even chooses digit 2. Normalize only the coarse or zero-digit result.

## power-scale.scale-an-asymmetric-power-interval.title

Scale an asymmetric power interval

## power-scale.scale-an-asymmetric-power-interval.body

The significand is exactly $2^{52}$, so its product becomes shifts of the high cache. For all 2,046 normal exponents, the maintained certificate proves that this high-only fraction selects the same grid and fine digit as the complete cache. The lower radius is h/2.

## check-power-coarse.certify-a-coarse-point-over-the-error-interval.title

Select the coarse power grid

## check-power-coarse.certify-a-coarse-point-over-the-error-interval.body

An upward carry selects the upper coarse point. Otherwise half > f selects the lower coarse point. These high-only decisions equal the complete-cache decisions for every normal power of two. A coarse answer is normalized immediately.







## power-result.return-the-specialized-power-answer.title

Return the specialized power answer

## power-result.return-the-specialized-power-answer.body

The coarse endpoint tests or fine digit selected the closest shortest answer. Every fine digit is in 1..9 and already canonical. The input sign is attached afterward.

## special.return-special-components-directly.title

Return special components directly

## special.return-special-components-directly.body.yes

Zero returns coefficient zero and exponent zero with its original sign.

## special.return-special-components-directly.body.no

Infinity has coefficient zero at sentinel exponent 10000. NaN stores its original 52-bit payload in the coefficient; the sign is preserved.

## output.read-the-returned-numeric-components.title

Read the returned numeric components

## output.read-the-returned-numeric-components.body.yes

The sentinel denotes a nonfinite value. The displayed word alone does not reconstruct a NaN payload.

## output.read-the-returned-numeric-components.body.no

The separate sign, coefficient and exponent represent {{decimal}}. Shortest means fewest significant digits among decimals that parse to this binary64 input; closest and ties-to-even select among them.

## output.conversion-is-separate-from-formatting.title

Conversion is separate from formatting

## output.conversion-is-separate-from-formatting.body

Boundragon returns numeric components, not ASCII. This page presents them and checks the example’s roundtrip. Its BigInt execution time is not the C++ kernel’s performance.

## guard.follow-the-evaluated-decision.title

Follow the evaluated decision

## guard.follow-the-evaluated-decision.body.detail.yes

True

## guard.follow-the-evaluated-decision.body.detail.no

False

## guard.follow-the-evaluated-decision.body

{{detail}}. {{nextaction}} A recorded comparison has an outcome; a skipped comparison has no invented result.

## lead.decode

Read all 64 stored bits before restoring the significand and exponent.

## lead.check-special

Choose the normal fast route or the specialized handler.

## lead.check-integer-range

Check the range for exact integers below 2⁵³.

## lead.check-integer-bits

Prove that shifting would discard only zero bits.

## lead.integer

Return the exact integer after removing decimal zeroes.

## lead.check-power

After integer dispatch, check the remaining powers of two.

## lead.scale

Convert the input magnitude into decimal-grid coordinates: one integer product supplies a coarse candidate and its signed offset; the same cache supplies the interval radius.

## lead.check-boundary

Does the boundary distance lie in an uncertain band?

## lead.check-rounding

Evaluate fine-rounding uncertainty regardless of the boundary outcome.

## lead.check-ambiguity

Both tests have run. Either uncertainty requests full precision.

## lead.choose

Select the signed fine-grid adjustment, masking it to zero for the coarse grid.

## lead.check-tail

Test whether tail is zero to choose coarse normalization or a direct fine return.

## lead.coarse

Use the certified coarse point and normalize its coefficient.

## lead.fine

Return coefficient and exponent directly from the nonzero adjustment; no zero removal is needed.

## lead.exact

Recover the precision needed by a subnormal or an uncertain decision.

## lead.resolve

Use the complete product to decide endpoints and correct decimal ties.

## lead.power-scale

Shift the high cache limb; all power decisions are certified without recovering the low limb.

## lead.check-power-coarse

Does the high-only fraction select a coarse result?





## lead.power-result

Return the answer selected by the specialized power procedure.

## lead.special

Return the special components directly, preserving sign and payload.

## lead.output

Read the separate sign, integer coefficient and decimal exponent.

## next.step

Next: {{title}}.

## next.complete

Conversion complete. Choose another input or revisit any step.

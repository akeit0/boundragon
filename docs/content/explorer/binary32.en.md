# binary32 explanation — en

<!-- SPDX-License-Identifier: Unlicense -->

## decode.sign.yes

The sign is negative; these calculations use the magnitude.

## decode.sign.no

The sign is positive.

## checks.check-nonfinite.title

An exponent field of all ones

## checks.check-nonfinite.body

The largest stored exponent, 255, identifies infinity or NaN. This check runs first, before any finite interval or decimal scale is constructed.

## checks.check-power.title

A zero stored fraction

## checks.check-power.body

After excluding nonfinite values, a zero fraction means signed zero when the exponent is zero, or an exact power of two otherwise. A generated table covers both cases.

## checks.check-integer-range.title

Select the eight integer binades

## checks.check-integer-range.body

This conversion checks the integer shortcut only for magnitudes from 2¹⁶ up to, but excluding, 2²⁴. Stored exponents 143 through 150 identify that range. Being in range does not yet prove that the value is an integer.

## checks.check-integer-bits.title

Check what a right shift would discard

## checks.check-integer-bits.body

This inner check runs only after the range check succeeds. There are s = 150 − E binary places after the integer part. Their stored bits must all be zero, so a shift loses no value. The hidden leading bit is never in these discarded places.

## checks.check-tiny.title

Keep the first ten subnormals on the exact path

## checks.check-tiny.body

The approximate route excludes integer significands below 11. Zero has already returned, so a true result here means one of the first ten nonzero subnormals. All normal significands are much larger.

## checks.check-coarse.title

Certify an interior point with a margin

## checks.check-coarse.body

The distance a is measured from the approximate center to the coarse candidate. Adding m + 1 allows for the discarded cache fraction and the radius bound. A strict inequality proves the candidate stays inside even under those errors. False means it is not yet certified; it does not prove exclusion.

## checks.check-boundary.title

Distinguish uncertainty from definite exclusion

## checks.check-boundary.body

This check runs after coarse acceptance fails. If the distance is still at most h + m + 1, omitted information might change an interval-endpoint decision: use the exact finish. If the comparison is false, the coarse point is certainly outside, so the fine grid is needed.

## checks.check-fine-change.title

Compare the two possible rounded digits

## checks.check-fine-change.body

The two bounds include every possible error omitted by the cached scale. Different endpoint digits mean that the approximation cannot decide the fine digit. Equal digits establish stability, but the tie threshold still needs a separate check.

## checks.check-fine-tie.title

Exclude an exact rounding threshold

## checks.check-fine-tie.body

This check runs only when the two fine digits agree. A zero remainder means the lower bound lies exactly on a rounding threshold. The exact finish is needed to resolve the tie and omitted information. A nonzero remainder certifies the stable digit.

## guard.evaluate-with-this-input.title

Evaluate with this input

## guard.evaluate-with-this-input.body.detail.yes

true

## guard.evaluate-with-this-input.body.detail.no

false

## guard.evaluate-with-this-input.body

This comparison evaluates to {{detail}}. These are the actual integers used by this conversion.

## guard.control.the-discarded-bit-condition-is-not-evaluated

 The discarded-bit condition is not evaluated.

## guard.control.the-tie-threshold-condition-is-not-evaluated-the-first-term-of-the-or-condition-already-selected-fallback

 The tie-threshold condition is not evaluated: the first term of the OR condition already selected fallback.

## guard.follow-the-control-flow.title

Follow the control flow

## guard.follow-the-control-flow.body.right

 This decision is recorded whether it is true or false; only conditions that execution never reaches are bypassed.

## decode.read-the-three-fields.title

Read the three fields

## decode.read-the-three-fields.body

The encoding {{bits}} contains one sign bit, eight exponent bits and 23 stored fraction bits. The sign bit is {{status}}, the exponent field is {{raw}}, and the fraction field is {{fraction}}.

## decode.recognize-a-special-value.title

Recognize a special value

## decode.recognize-a-special-value.body.yes

An all-ones exponent with a nonzero fraction is NaN. The fraction is a payload, not a finite significand.

## decode.recognize-a-special-value.body.no

An all-ones exponent with a zero fraction is infinity. There is no finite interval to search.

## decode.use-subnormal-spacing.title

Use subnormal spacing

## decode.use-subnormal-spacing.body

Exponent field zero means there is no implicit leading 1. Every nonzero subnormal is an integer multiple of 2⁻¹⁴⁹. This is also the spacing at the minimum normal.

## decode.restore-the-hidden-bit.title

Restore the hidden bit

## decode.restore-the-hidden-bit.body

Normal floats store the fraction after a leading binary 1. Adding 2²³ turns that significand into an integer m. The exponent is adjusted for both the bias of 127 and these 23 fractional bits.

## decode.why-the-original-format-matters.title

Why the original format matters

## decode.why-the-original-format-matters.body

{{positive}} Conversion uses this binary32 value’s interval between neighboring floats. A decimal only has to parse back to these same 32 bits; it need not equal the binary value exactly. Using a binary64 interval instead would solve a different conversion problem.

## special.preserve-the-numeric-api-contract.title

Preserve the numeric API contract

## special.preserve-the-numeric-api-contract.body

The returned exponent is the sentinel 10000. Coefficient zero means infinity; a nonzero coefficient retains the NaN fraction payload. The sign bit remains {{detail}}.

## special.do-not-search-a-grid.title

Do not search a grid

## special.do-not-search-a-grid.body

Shortest finite decimal selection does not apply to infinities or NaNs. The displayed word is a presentation choice; Boundragon returns the sentinel components.

## special.use-the-zero-table-entry.title

Use the zero table entry

## special.use-the-zero-table-entry.body

The exponent and fraction are both zero. Entry zero is generated to return coefficient zero and exponent zero. A negative sign bit is kept, so −0 is distinct from +0.

## special.return-without-interval-arithmetic.title

Return without interval arithmetic

## special.return-without-interval-arithmetic.body.detail.yes

negative

## special.return-without-interval-arithmetic.body.detail.no

positive

## special.return-without-interval-arithmetic.body

There is nothing to multiply or normalize. The numeric result is {{detail}} zero.

## special.why-powers-get-a-separate-route.title

Why powers get a separate route

## special.why-powers-get-a-separate-route.body

For a normal power of two, the predecessor usually lies in the smaller binade: its gap is half the successor gap. The lower midpoint is therefore closer than the upper midpoint. The minimum normal is the exception; it shares subnormal spacing on both sides.

## special.read-a-precomputed-canonical-answer.title

Read a precomputed canonical answer

## special.read-a-precomputed-canonical-answer.body

The generator solved the power case using exact rational arithmetic. This input uses entry {{raw}}; its stored coefficient and exponent are already shortest, closest and canonical.

## special.why-this-bypasses-the-filter.title

Why this bypasses the filter

## special.why-this-bypasses-the-filter.body

The ordinary symmetric-radius guard is unnecessary here. The lookup handles the interval shape directly; the sign bit is attached afterward.

## integer.prove-that-no-fractional-bits-remain.title

Prove that no fractional bits remain

## integer.prove-that-no-fractional-bits-remain.body

The exponent field lies in 143…150, representing magnitudes in [2¹⁶, 2²⁴). Shifting the 24-bit significand right by {{right_shift}} positions gives an exact integer only because every discarded bit is zero.

## integer.normalize-decimal-zeroes.title

Normalize decimal zeroes

## integer.normalize-decimal-zeroes.body.note.yes



## integer.normalize-decimal-zeroes.body.note.no

es

## integer.normalize-decimal-zeroes.body

{{integer}} is an exact integer coefficient at exponent zero. Each trailing decimal zero can be divided away while increasing the exponent by one. This input removes {{count}} zero{{note}}.

## integer.why-the-range-is-selective.title

Why the range is selective

## integer.why-the-range-is-selective.body

This conversion uses this shortcut only for large integers that frequently occur in integer pools. Checking every smaller binade would cost time on ordinary decimal traffic.

## scale.pick-the-two-neighboring-decimal-grids.title

Pick the two neighboring decimal grids

## scale.pick-the-two-neighboring-decimal-grids.body

A grid is a set of candidate decimal values, not a requested number of printed places. The coarse grid consists of integer multiples of $10^e$. The fine grid uses $10^{e-1}$, one tenth of that spacing; every coarse candidate is also a fine candidate.

Choose $e$ from the **binary gap** $2^q$, rather than the magnitude $|x|$. The two spacings bracket that gap, as the last inequality below shows. On this symmetric path the rounding interval has width $2^q$: it holds at most one coarse point, while the fine grid is dense enough to supply a valid point. A valid coarse point wins because it can use fewer significant digits. Open the two-grid overview for the exact candidates of this input.

Dividing by $10^e$ changes coordinates, preserving values and interval membership. Coarse candidates become integers, fine candidates become tenths, and the exact input position becomes $m\alpha$, where $\alpha=2^q/10^e$. The next multiplication approximates that position.

## scale.keep-40-fractional-bits.title

Keep 40 fractional bits

## scale.keep-40-fractional-bits.body

Use $Q=2^{40}$ fixed-point units per coarse spacing. The cache stores $W=\lfloor\alpha Q\rfloor$, so $W/Q$ approximates the scale from below. Computing $\alpha=2^q/10^e$ and rounding $\alpha Q$ exactly for each input would require large-integer powers and division. The cache stores that work in advance.

The 24-bit significand $m$ times $W$ fits in 64 bits. One multiplication and the half-unit bias $Q/2$ give the product $P$, ready to select a nearby integer.

## scale.center-the-leftover-fraction.title

Center the leftover fraction

## scale.center-the-leftover-fraction.body

The quotient of the biased product $P$ by $Q$ gives the coarse integer candidate $I$. Subtract half a unit from the remainder to define $r$, so the estimated position in coarse units is $I+r/Q$. The candidate's decimal value is $I\times10^e$; $r$ measures position relative to it, not relative to zero. Its sign tells which side of $I$ contains the approximate input. The absolute distance is $a=|r|$, in fixed-point units.

## scale.bound-the-omitted-information.title

Bound the omitted information

## scale.bound-the-omitted-information.body

Flooring the cached multiplier omits less than one unit of $W$. After multiplication, the exact center can move right by less than $m$ fixed-point units. Call that omitted position error $\delta$. The radius lies between $h$ and $h+1$. The following guards allow for both errors when certifying a candidate.

## coarse.leave-a-full-error-margin.title

Leave a full error margin

## coarse.leave-a-full-error-margin.body

a is the approximate distance to coarse point I. Adding m+1 covers the omitted center information and the radius uncertainty. Even that conservative distance is strictly less than h, so I is certainly inside the interval.

## coarse.prefer-the-grid-with-fewer-digits.title

Prefer the grid with fewer digits

## coarse.prefer-the-grid-with-fewer-digits.body

The certified coarse coefficient is I = {{integral}}, at exponent {{gridexp}}. The fine grid would add a decimal digit. The two-grid scaling bounds establish that this coarse choice is shortest; trailing zeroes can shorten its canonical coefficient further.

## coarse.use-bounded-zero-removal.title

Use bounded zero removal

## coarse.use-bounded-zero-removal.body

The coarse coefficient has fewer than eight digits, hence at most seven trailing zeroes. Modular-inverse tests remove groups of 4, 2 and 1 zeroes without a serial division loop. This input removes {{count}} in total.

## outside.the-coarse-acceptance-test-did-not-pass.title

The coarse acceptance test did not pass

## outside.the-coarse-acceptance-test-did-not-pass.body

Failing the first test alone would not prove that the coarse point is outside: it might merely be close to a boundary. This second comparison distinguishes a definite exclusion from uncertainty.

## outside.exclude-the-coarse-point-with-its-error-bound.title

Exclude the coarse point with its error bound

## outside.exclude-the-coarse-point-with-its-error-bound.body

Even the allowance h+m+1 is smaller than the residual distance a. The nearest coarse candidate is certainly outside. A separately certified scaling bound also rules out the other coarse candidate.

## outside.spend-one-more-decimal-digit.title

Spend one more decimal digit

## outside.spend-one-more-decimal-digit.body

Move from exponent {{gridexp}} to {{status}}: the spacing becomes ten times smaller, while the rounding interval stays fixed. The same coarse point now has coefficient $10I$. A signed digit selects a neighboring fine point, giving coefficient $10I+\mathrm{digit}$. A negative digit moves left of $I$; it does not change the input sign.

## round.move-the-residual-to-the-fine-grid.title

Move the residual to the fine grid

## round.move-the-residual-to-the-fine-grid.body

We already know the coarse grid has no valid point. Each fine spacing is one tenth of a coarse spacing, so the offset $r/Q$ becomes $10r/Q$ in fine units. Round this adjustment and add it to $10I$; there is no need to round the whole input again. Adding $Q/2$ prepares nearest-integer rounding. Mathematical floor division handles a negative adjustment too. The next calculation bounds the omitted error before accepting that digit.

## round.round-both-bounds-of-the-omitted-information.title

Round both bounds of the omitted information

## round.round-both-bounds-of-the-omitted-information.body

The cached scale was rounded down, so the true residual can be larger by less than m fixed-point units. After multiplying by ten, that uncertainty is less than 10m. Evaluate both ends with floor division; the upper evaluation deliberately uses the conservative bound.

## round.do-not-accept-a-digit-yet.title

Do not accept a digit yet

## round.do-not-accept-a-digit-yet.body

The next guard compares these two digits. If they agree, a separate tie check still has to pass before the fine result can return. Computing bounds alone does not certify the answer.

## fine.round-a-digit-not-the-whole-float.title

Round a digit, not the whole float

## fine.round-a-digit-not-the-whole-float.body

Multiplying the centered residual by ten moves to the fine grid. Adding Q/2 rounds to the nearest digit. Signed shifts implement floor division, including when the residual is negative.

## fine.prove-the-digit-cannot-change.title

Prove the digit cannot change

## fine.prove-the-digit-cannot-change.body

The two endpoint evaluations give the same digit {{lower_digit}}. Every possible omitted-center error therefore produces that digit. T is not exactly on a rounding threshold; a tie would require the exact finish.

## fine.assemble-a-canonical-result.title

Assemble a canonical result

## fine.assemble-a-canonical-result.body

Combine coarse integer I with the certified fine digit. The outside guard guarantees the digit is nonzero, so this coefficient has no trailing zero. No normalization pass is needed.

## exact.a-deliberately-excluded-tiny-case.title

A deliberately excluded tiny case

## exact.a-deliberately-excluded-tiny-case.body

m = {{m}} is one of the first ten nonzero subnormal encodings. The approximate route’s shortcut contract excludes these inputs, so the converter immediately uses the complete finish.

## exact.the-coarse-boundary-is-uncertain.title

The coarse boundary is uncertain

## exact.the-coarse-boundary-is-uncertain.body

The first guard could not prove the candidate is inside. The distance is still within h+m+1, so the converter cannot prove it is outside either. A small omitted cache fraction could affect an endpoint decision.

## exact.fine-rounding-needs-more-information.title

Fine rounding needs more information

## exact.fine-rounding-needs-more-information.body.note.yes

The lower evaluation is exactly on a decimal rounding threshold.

## exact.fine-rounding-needs-more-information.body.note.no

Their difference means the omitted information could change the rounded digit. The tie test was bypassed by short-circuit evaluation.

## exact.fine-rounding-needs-more-information.body

The lower and upper error-bound evaluations give digits {{lower_digit}} and {{upper_digit}}. {{note}} The approximate guard therefore refuses to decide.

## exact.recover-the-full-integer-product.title

Recover the full integer product

## exact.recover-the-full-integer-product.body

The complete converter uses the maintained normalized 64-bit cache, its full high and low product limbs, and endpoint/parity corrections. Its certified finish formulas resolve the case without floating-point arithmetic or an unbounded search.

## exact.fallback-is-part-of-the-algorithm.title

Fallback is part of the algorithm

## exact.fallback-is-part-of-the-algorithm.body

An uncertain guard is expected, not an incorrect answer. It means the cheaper calculation did not establish the result. The exact path preserves shortestness, closeness, and ties to even for the same binary32 interval.

## resolve.rescale-with-the-complete-cache.title

Rescale with the complete cache

## resolve.rescale-with-the-complete-cache.body

The exact converter chooses k = {{k}}, looks up power index p = {{p}}, and aligns m with a left shift of {{shift}}, equivalent to multiplication by a power of two. The scaled product preserves the low information that the approximate route could not use.

## resolve.correct-the-radius-for-midpoint-parity.title

Correct the radius for midpoint parity

## resolve.correct-the-radius-for-midpoint-parity.body

The upper half of the cache gives the interval half-width in the exact finish’s fractional scale. Add one unit for an even binary significand; this accounts for the included midpoint when the input is even. Odd inputs have excluded midpoint ties.

## resolve.test-the-interval-endpoints.title

Test the interval endpoints

## resolve.test-the-interval-endpoints.body

The exact finish uses the corrected radius h to test neighboring coarse points. “up” means the interval reaches the upper coarse point; “down” means it reaches the lower one. The modulo models the 32-bit wraparound used by the C++ upper-endpoint test.

## resolve.round-the-fine-digit-and-correct-a-decimal-tie.title

Round the fine digit and correct a decimal tie

## resolve.round-the-fine-digit-and-correct-a-decimal-tie.body.detail.yes

This input uses that tie correction.

## resolve.round-the-fine-digit-and-correct-a-decimal-tie.body.detail.no

This input does not use that tie correction.

## resolve.round-the-fine-digit-and-correct-a-decimal-tie.body

The complete fractional product can now supply the fine digit. The small integer correction is part of the certified finish formula. At f = 2³⁰, the scaled fraction is exactly one quarter, so ten times it is 2.5: choose the even digit 2. {{detail}}

## resolve.choose-coarse-or-fine-then-normalize.title

Choose coarse or fine, then normalize

## resolve.choose-coarse-or-fine-then-normalize.body.yes

A coarse point is valid, so the finish produces it with a zero fine digit. Removing trailing decimal zeroes returns its canonical coefficient.

## resolve.choose-coarse-or-fine-then-normalize.body.no

Neither coarse point is valid. The corrected nearest fine digit gives the closest shortest result; the endpoint and tie corrections are handled here.

## output.read-the-numeric-components.title

Read the numeric components

## output.read-the-numeric-components.body.yes

The sentinel exponent marks a nonfinite value. Infinity uses coefficient zero, while NaN retains its fraction payload. The sign is preserved.

## output.read-the-numeric-components.body.no

The coefficient {{sig}} and exponent {{exp}} describe the decimal magnitude. Applying the separate sign gives the displayed result {{decimal}}.

## output.what-shortest-and-closest-mean.title

What shortest and closest mean

## output.what-shortest-and-closest-mean.body

Among decimals that round to this original binary32 input, the coefficient uses the fewest significant digits. Among those shortest candidates, the converter chooses the nearest to the exact binary value, with decimal ties resolved to an even coefficient. Signed zero is preserved separately.

## output.separate-conversion-from-formatting.title

Separate conversion from formatting

## output.separate-conversion-from-formatting.body

Boundragon returns numbers, not an ASCII buffer. The decimal point or scientific notation shown here is presentation. The browser roundtrip and the exact interval inclusion check verify this example; they are not replacements for the library’s mathematical certificates.

## output.distinguish-the-payload-from-its-display.title

Distinguish the payload from its display

## output.distinguish-the-payload-from-its-display.body.yes

The word NaN does not encode this input’s payload or sign. Those are preserved in the numeric coefficient and sign field. Parsing the displayed word alone would not reconstruct this NaN encoding.

## output.distinguish-the-payload-from-its-display.body.no

Infinity has no finite rounding interval or shortest coefficient. Its sign and sentinel components are preserved directly; no grid, cached product, or normalization is needed.

## definition.E

Stored exponent field: {{raw}}, the unsigned integer encoded by the eight exponent bits.

## definition.F

Stored fraction field: {{fraction}}, the unsigned integer encoded by the 23 fraction bits, before adding any hidden bit.

## definition.s

Discarded binary places: 150 minus the stored exponent. Each of these low fraction bits must be zero for the integer shortcut.

## definition.T

Fine-rounding numerator: ten times the signed residual plus half a fixed-point unit. Floor division by Q yields the lower rounded digit.

## definition.d_0

Lower rounded fine digit: evaluate the downward-rounded cached center, with the half-unit offset, then divide by Q and round down.

## definition.d_1

Upper rounded fine digit: add the conservative omitted-error allowance 10m to the same numerator, then divide by Q and round down.

## definition.m.detail.yes



## definition.m.detail.no

 ({{m}})

## definition.m

Binary significand: the input’s bits read as an integer{{detail}}. Normal values include the hidden leading 1.

## definition.q

Binary exponent: multiply the integer significand by 2 to this power (here {{q}}).

## definition.e

Coarse decimal exponent: neighboring coarse candidates differ by ten to the power {{gridexp}}. The fine exponent is one smaller.

## definition.Q

Fixed-point unit: 2⁴⁰ = {{Q}}. One whole coarse-grid spacing is this many integer units.

## definition.P.yes

Complete scaled integer product: the cached 64-bit scale times the aligned significand, divided by 2³² and rounded down.

## definition.P.no

Rounded cached product: the significand times the scale W, plus half a fixed-point unit for nearest-integer rounding.

## definition.α

Exact binary spacing in coarse decimal-grid coordinates: 2 to the binary exponent, divided by the coarse decimal spacing.

## definition.W

Cached scale: an integer approximation to the binary spacing in decimal-grid units, multiplied by Q and rounded down.

## definition.I.detail.yes

 (here {{integral}})

## definition.I.detail.no



## definition.I

Coarse candidate: the integer nearest the scaled input{{detail}}. Multiply it by ten to the exponent e to get its decimal magnitude.

## definition.r

Centered residual: a signed offset from the coarse candidate, measured in fixed-point units. Negative means to its left.

## definition.a

Residual distance: the absolute value of the signed offset r. It measures distance to the coarse candidate without left/right direction.

## definition.h.yes

Exact-finish interval half-width in its own 32-bit fractional scale, with an endpoint/parity correction. This is not the earlier Q40 h.

## definition.h.no

Radius bound: a lower bound on half the rounding interval’s width, in the same fixed-point units as the residual.

## definition.shift

Number of binary places to shift right. An integer shortcut is valid only if all discarded bits are zero.

## definition.digit

Signed fine-grid adjustment to 10I. It chooses one of the decimal points spaced ten times more closely.

## definition.k

Exact-finish decimal exponent (here {{k}}). The exact coarse grid has exponent k+1.

## definition.p

Cache power index (here {{p}}), equal to −k−1. It selects the normalized decimal scale.

## definition.f

The exact finish’s 32-bit fractional position, extracted from the complete cached product.

## definition.sig

Decimal coefficient: {{sig}}. For finite outputs, it has no trailing decimal zeroes.

## definition.exp

Decimal exponent: {{exp}}. Multiply the finite coefficient by ten to this power; 10000 is the nonfinite sentinel.

## definition.negative

The preserved input sign bit. It applies after the magnitude calculation, including for zero.

## definition.integer

Exact integer coefficient before removing decimal zeroes.

## definition.cache

Complete normalized cached multiplier used by the exact calculation.

## definition.high

Upper 32 bits of the complete 64-bit cached multiplier.

## definition.δ

Position error omitted by the cached multiplier; nonnegative and less than m.

## definition.margin

Remaining distance to the interval radius after allowing for the center and radius errors.

## definition.digit_final

Fine digit after the ties-to-even correction.

## definition.sig_0

Decimal coefficient before removing trailing zeroes.

## definition.up

Whether the upper coarse point is inside the interval; used as 1 or 0 when assembling the coefficient.

## definition.down

Whether the lower coarse point is inside the interval.

## lead.check-nonfinite

First decide whether this encoding represents a finite value. An all-ones exponent sends infinity and NaN directly to their return path.

## lead.check-power

Check the stored fraction before adding a hidden bit. A zero fraction lets a generated lookup return zero or a power of two directly.

## lead.check-integer-range

Decide whether this value belongs to the range selected for the integer shortcut. The inner bit test is reached only when this check is true.

## lead.check-integer-bits

The range check passed. Now test whether shifting to an integer would discard any nonzero bits.

## lead.check-tiny

Check the small exception set before using the bounded approximation. The first ten nonzero subnormals go directly to the complete finish.

## lead.check-coarse

Can the error bound prove the nearest coarse decimal point is safely inside the input’s rounding interval?

## lead.check-boundary

The coarse point was not certified inside. Decide whether it is uncertain enough to need the exact finish, or far enough outside to try the fine grid.

## lead.check-fine-change

Would any allowed approximation error change the rounded fine digit? If yes, choose exact fallback immediately.

## lead.check-fine-tie

The rounded digits agreed. Now decide whether the lower evaluation lies exactly on a tie threshold.

## lead.round

Compute the fine digit at both ends of the approximation-error bound. The following guards decide whether those digits establish a safe return.

## lead.decode

Start with the stored bits. They tell us the sign, the binary magnitude, and whether this input is a normal value, a subnormal, zero, infinity, or NaN.

## lead.special.yes

A generated table already contains the shortest decimal for this exact power of two.

## lead.special.no.yes

Return zero directly and preserve its sign.

## lead.special.no.no

Return the nonfinite components directly and preserve the original sign and payload.

## lead.integer

The discarded fractional binary bits are all zero. This selected large integer can return after a shift and removal of decimal trailing zeroes.

## lead.scale

Move the binary magnitude into decimal-grid coordinates with one integer multiplication. Keep both a nearby coarse point and a bound on how much the approximation could move the input.

## lead.coarse

Prove that the coarse decimal point is inside the rounding interval, even after accounting for the approximation error. Then remove any unnecessary decimal zeroes.

## lead.outside

Prove that the coarse points are outside the rounding interval. The answer now needs a decimal point from the ten-times-finer grid.

## lead.fine

Check that every allowed approximation error gives the same fine-grid digit. If the rounding is stable and avoids a tie threshold, that digit is safe to return.

## lead.exact

The cheaper calculation has not established a result for this input. Use the complete integer finish to resolve the interval endpoints and decimal rounding.

## lead.resolve

With the complete product available, test the neighboring coarse points. If neither fits, choose the closest valid fine digit and resolve ties to even.

## lead.output

Read the three returned components: sign, integer coefficient, and decimal exponent. The displayed decimal is a presentation of those components.

## next.yes

Next: {{next}}.

## next.no

Conversion complete. Choose another input or revisit any step.

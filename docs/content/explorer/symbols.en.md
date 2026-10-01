# Local notation — en

<!-- SPDX-License-Identifier: Unlicense -->

## E

stored exponent field

## F

stored fraction field

## m

integer binary significand

## q

binary exponent

## k

fine decimal exponent

## e

coarse decimal exponent

## p

decimal-power cache exponent

## s

number of discarded low bits

## Q

fixed-point units per coarse spacing

## α

exact binary spacing in coarse-grid units

## W

cached fixed-point multiplier

## P

scaled integer product

## I

coarse integer candidate

## r

signed offset from the coarse candidate

## a

absolute offset from the coarse candidate

## h

interval radius in the current scale

## δ

omitted position error

## margin

remaining margin after accounting for error

## d_0

fine digit rounded at the lower error bound

## d_1

fine digit rounded at the upper error bound

## binary32.T

fine-rounding numerator

## binary64.T

normalized real power of ten

## b

binary exponent of the selected power of ten

## hi

high 64-bit word of the cached multiplier

## fs

left shift for alignment

## n

aligned integer significand

## z

exact input magnitude in coarse-grid units

## Y

exact input position in 1/2048 coarse units

## u

retained high word of the product

## v

approximation after centering its error

## centered

position biased for nearest-integer rounding

## w

signed offset in 1/2048 coarse units

## ρ

exact interval radius in 1/2048 coarse units

## d

signed distance from the interval boundary

## c

mask selecting the coarse point

## R

fine-rounding numerator

## g

fine-rounding ambiguity test value

## tail

signed adjustment in fine-grid units

## boundary

result of the boundary ambiguity test

## rounding

result of the rounding ambiguity test

## cache

complete normalized cached multiplier

## shift

alignment shift for this calculation

## high

high 32-bit word of the complete cache

## f

fractional position in the current scale

## up

whether the upper coarse point is inside

## down

whether the lower coarse point is inside

## digit

selected fine-grid digit

## digit_final

fine digit after the tie correction

## integer

exact integer before removing decimal zeroes

## sig_0

decimal coefficient before normalization

## exp_0

decimal exponent before normalization

## sig

returned decimal coefficient

## exp

returned decimal exponent

## negative

preserved input sign

## error

upper bound on the omitted low-word contribution

## upper

largest allowed fractional position

## half

smaller lower radius for a power of two

## low

low word used by this comparison

## limit

largest low word that cannot cause a carry

## binary32.resolve.h

parity-corrected radius in 32-bit fractional units

## binary64.resolve.h

parity-corrected radius in 64-bit fractional units

## zeros

number of trailing decimal zeroes removed

## digit_used

fine digit used after endpoint selection

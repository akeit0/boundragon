# Result derivation — en

<!-- SPDX-License-Identifier: Unlicense -->

## grid.definition.title

Two spacings, one set of valid answers

## grid.definition.body

A decimal grid is a set of equally spaced numbers: integer coefficients multiplied by one power of ten. For example, spacing $0.01$ gives $0.10,0.11,0.12,\ldots$; spacing $0.001$ inserts nine more candidates between each neighboring pair. Every coarse point is also a fine point.

The blue interval is the set of real numbers that round back to this **source format**. Its width comes from neighboring binary floats; changing the decimal grid does not change that interval. We search the grid points inside it, rather than trying to print the exact binary value.

Try the **0.1** preset for a coarse answer, then **Just above 1** for a fine answer. Switch between binary32 and binary64: the rule stays the same, while the finer binary64 interval needs more decimal digits.

## grid.spacings.body

For this input, the coarse spacing is $10^{ {{coarse_exp}} }$ and the fine spacing is $10^{ {{fine_exp}} }$. In binary32 the coarse exponent is called $e$; in binary64 the fine exponent is called $k$, so the coarse exponent is $k+1$. These are the same geometric roles with different variable names.

## grid.why-two.title

Why these two grids are enough on the ordinary path

## grid.why-two.body

The fine spacing is at most the binary gap $2^q$, and the coarse spacing is larger than that gap. On the ordinary symmetric path, the rounding interval has width $2^q$. It can contain at most one coarse point. A nearest fine point is at most half a fine spacing away, so the fine grid is dense enough to supply a valid answer.

Thus we first test the coarse grid. If it has no valid point, we choose the closest valid fine point. Powers of two have asymmetric intervals, and the smallest subnormals need separate treatment; their specialized handlers establish the selection directly. The picture uses their actual interval too.

## grid.read.body

Both rows use **the same horizontal scale**. The dashed line is the exact input magnitude; the blue band is its rounding interval. Filled blue candidate dots are inside it. A solid endpoint is included; a hollow endpoint is excluded. Orange marks the returned decimal. The drawing rounds positions for display; the membership checks below use exact integers.

The origin is $I_0={{origin}}$, the integer immediately to the left of, or at, the exact magnitude in coarse units. The point labeled $I_0$ represents $I_0\times10^{ {{coarse_exp}} }$; $I_0+1$ is one coarse spacing to its right. This plotting origin is independent of the filter's nearest candidate $I$. Negative inputs use the same magnitude picture, then restore the sign.

## grid.candidates.title

Exact candidate checks for this input

## grid.selection.title

Shortest first, then closest

## grid.selection.body

Every grid with still larger spacing is a subset of the coarse grid. A valid coarse value therefore wins before fine rounding. Removing trailing coefficient zeroes moves that same value to a coarser grid: $100\times10^{-3}=10\times10^{-2}=1\times10^{-1}$. The value stays fixed while its canonical coefficient gets shorter.

If the coarse grid has no valid point, a valid fine coefficient cannot end in zero: it would also be a coarse point. Among candidates with the fewest significant digits, choose the one closest to the exact input; an exact decimal tie chooses the even coefficient. Shortest counts significant digits, rather than characters in a fixed or scientific notation string. The full proof also checks powers-of-ten boundaries, where equally short candidates can have different exponents.

## result.source.title

Where sig and exp came from

## result.source.body.normal

Use the quantities obtained in step {{step}}, “{{title}}”. {{origin}}

Here $\mathrm{sig}_0$ and $\mathrm{exp}_0$ are the decimal coefficient and exponent before removing trailing zeroes. The equations connect them to the returned $\mathrm{sig}$ and $\mathrm{exp}$. Each division of the coefficient by 10 increases the exponent by one, preserving the value.

## result.source.body.direct

Step {{step}}, “{{title}}”, supplies these components directly. {{origin}} The equations identify the returned $\mathrm{sig}$ and $\mathrm{exp}$.

## origin.integer

The preceding binary-bit test allowed an exact right shift to integer, at decimal exponent zero.

## origin.coarse32

The cached product supplied coarse integer I and coarse exponent e. The acceptance guard proved that this point is inside the interval.

## origin.coarse64

The high-word product supplied coarse integer I and fine exponent k. The zero-tail decision selects I on the coarse grid, whose exponent is k+1.

## origin.fine32

The cached product supplied I and coarse exponent e; the residual-rounding checks certified digit. The fine coefficient is 10I+digit, with exponent e−1.

## origin.fine64

The high-word product supplied I and fine exponent k; the adjustment-selection step supplied the signed adjustment tail. Thus the fine coefficient is 10I+tail at exponent k.

## origin.complete32

The complete product supplied I and exponent k. Endpoint decisions select up as 1 or 0; digit_used is zero for a valid coarse point, otherwise the tie-corrected fine digit.

## origin.completeCoarse64

The complete product supplied I and exponent k. A valid coarse endpoint, or a zero fine digit, selects I+up on the coarse grid at exponent k+1.

## origin.completeFine64

The complete product supplied I and exponent k. Neither coarse point fits; the corrected digit_final supplies the fine adjustment.

## origin.powerCoarse64

The power-scaling step supplied I and k. The asymmetric endpoint tests selected the coarse point I+up at exponent k+1.

## origin.powerFine64

The power-scaling step supplied I and k. The rounding and lower-endpoint checks selected the final digit, giving 10I+digit at exponent k.

## origin.table

The stored exponent E selects a generated power-of-two table entry. That entry already contains both canonical components.

## origin.zero

Both stored magnitude fields were zero, so the conversion returns coefficient zero and exponent zero directly.

## origin.nonfinite

The all-ones exponent identified infinity or NaN. The stored fraction F becomes the coefficient; exponent 10000 is the nonfinite sentinel.

## math.coarse-spacing

coarse spacing

## math.fine-spacing

fine spacing

## math.true-residual

true residual

## math.true-radius

true radius

## math.raw-decimal

raw decimal

## math.fine-coefficient

fine coefficient

## math.decimal

decimal

## math.coarse-decimal

coarse decimal

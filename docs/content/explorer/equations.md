# Shared mathematical notation

English and Japanese use the same equations. `\value{name}` inserts a named
input; `\result{name}` appends its evaluated result when supplied by the model.
Temml owns mathematical parsing. No JavaScript expression is evaluated here.

## binary32.checks.check-nonfinite.calculation

```math
\begin{aligned}
E&=255
\end{aligned}
```

## binary32.checks.check-power.calculation

```math
\begin{aligned}
F&=0
\end{aligned}
```

## binary32.checks.check-integer-range.calculation

```math
\begin{aligned}
&143\le E\le150
\end{aligned}
```

## binary32.checks.check-integer-bits.calculation

```math
\begin{aligned}
s&=150-E\result{s} \\
F\bmod2^s&=\value{discarded}
\end{aligned}
```

## binary32.checks.check-tiny.calculation

```math
\begin{aligned}
&m<11
\end{aligned}
```

## binary32.checks.check-coarse.calculation

```math
\begin{aligned}
&a+m+1\result{a + m + 1} \\
&a+m+1<h
\end{aligned}
```

## binary32.checks.check-boundary.calculation

```math
\begin{aligned}
&h+m+1\result{h + m + 1} \\
&a\le h+m+1
\end{aligned}
```

## binary32.checks.check-fine-change.calculation

```math
\begin{aligned}
&d_0\ne d_1
\end{aligned}
```

## binary32.checks.check-fine-tie.calculation

```math
\begin{aligned}
&T\bmod Q\result{T mod Q} \\
T\bmod Q&=0
\end{aligned}
```

## binary32.decode.use-subnormal-spacing.calculation

```math
\begin{aligned}
m&=F\result{m} \\
q&=-149 \\
\lvert x\rvert&=m\times2^q
\end{aligned}
```

## binary32.decode.restore-the-hidden-bit.calculation

```math
\begin{aligned}
m&=2^{23}+F\result{m} \\
q&=E-127-23\result{q} \\
\lvert x\rvert&=m\times2^q
\end{aligned}
```

## binary32.special.preserve-the-numeric-api-contract.calculation

```math
\begin{aligned}
\mathrm{exp}&=10000
\end{aligned}
```

## binary32.special.return-without-interval-arithmetic.calculation

```math
\begin{aligned}
\mathrm{sig}&=0 \\
\mathrm{exp}&=0
\end{aligned}
```

## binary32.integer.prove-that-no-fractional-bits-remain.calculation

```math
\begin{aligned}
\mathrm{shift}&=150-E\result{shift} \\
\mathrm{integer}&=\left\lfloor\frac{m}{2^{\mathrm{shift}}}\right\rfloor\result{integer}
\end{aligned}
```

## binary32.scale.pick-the-two-neighboring-decimal-grids.calculation

```math
\begin{aligned}
e&=\left\lfloor\log_{10}(2^q)\right\rfloor+1\result{e} \\
\copy{common.math.coarse-spacing}&=10^e \\
\copy{common.math.fine-spacing}&=10^{e-1} \\
\alpha&=2^q\times10^{-e} \\
10^{e-1}&\le2^q<10^e
\end{aligned}
```

## binary32.scale.keep-40-fractional-bits.calculation

```math
\begin{aligned}
Q&=2^{40}\result{Q} \\
W&=\lfloor\alpha Q\rfloor\result{W} \\
P&=mW+\frac{Q}{2}\result{P}
\end{aligned}
```

## binary32.scale.center-the-leftover-fraction.calculation

```math
\begin{aligned}
I&=\left\lfloor\frac{P}{Q}\right\rfloor\result{I} \\
r&=(P\bmod Q)-\frac{Q}{2}\result{r} \\
a&=\lvert r\rvert\result{a}
\end{aligned}
```

## binary32.scale.bound-the-omitted-information.calculation

```math
\begin{aligned}
\copy{common.math.true-residual}&=r+\delta,\quad0\le\delta<m \\
h&=\left\lfloor\frac W2\right\rfloor\result{h} \\
&h\le\copy{common.math.true-radius}<h+1
\end{aligned}
```

## binary32.coarse.leave-a-full-error-margin.calculation

```math
\begin{aligned}
&a+m+1\result{a + m + 1} \\
&a+m+1<h \\
\mathrm{margin}&=h-(a+m+1)\result{margin}
\end{aligned}
```

## binary32.coarse.prefer-the-grid-with-fewer-digits.calculation

```math
\begin{aligned}
\copy{common.math.raw-decimal}&=I\times10^e
\end{aligned}
```

## binary32.outside.exclude-the-coarse-point-with-its-error-bound.calculation

```math
\begin{aligned}
&h+m+1\result{h + m + 1} \\
&a>h+m+1
\end{aligned}
```

## binary32.outside.spend-one-more-decimal-digit.calculation

```math
\begin{aligned}
\copy{common.math.fine-coefficient}&=10I+\mathrm{digit} \\
\mathrm{exp}&=e-1\result{exp}
\end{aligned}
```

## binary32.round.move-the-residual-to-the-fine-grid.calculation

```math
\begin{aligned}
T&=10r+\frac Q2\result{T}
\end{aligned}
```

## binary32.round.round-both-bounds-of-the-omitted-information.calculation

```math
\begin{aligned}
d_0&=\left\lfloor\frac TQ\right\rfloor\result{d_0} \\
d_1&=\left\lfloor\frac{T+10m}{Q}\right\rfloor\result{d_1}
\end{aligned}
```

## binary32.fine.round-a-digit-not-the-whole-float.calculation

```math
\begin{aligned}
T&=10r+\frac Q2\result{T} \\
d_0&=\left\lfloor\frac TQ\right\rfloor\result{d_0} \\
d_1&=\left\lfloor\frac{T+10m}{Q}\right\rfloor\result{d_1}
\end{aligned}
```

## binary32.fine.prove-the-digit-cannot-change.calculation

```math
\begin{aligned}
d_0&=d_1 \\
T\bmod Q&\result{T mod Q} \\
T\bmod Q&\ne0
\end{aligned}
```

## binary32.exact.the-coarse-boundary-is-uncertain.calculation

```math
\begin{aligned}
&a\le h+m+1
\end{aligned}
```

## binary32.resolve.rescale-with-the-complete-cache.calculation

```math
\begin{aligned}
P&=\left\lfloor\frac{\mathrm{cache}\times m\times2^{\mathrm{shift}}}{2^{32}}\right\rfloor\result{P} \\
I&=\left\lfloor\frac P{2^{39}}\right\rfloor\result{I} \\
f&=\left\lfloor\frac P{2^7}\right\rfloor\bmod2^{32}\result{f}
\end{aligned}
```

## binary32.resolve.correct-the-radius-for-midpoint-parity.calculation

```math
\begin{aligned}
\mathrm{high}&=\left\lfloor\frac{\mathrm{cache}}{2^{32}}\right\rfloor\result{high} \\
h&=\left\lfloor\frac{\mathrm{high}}{2^{8-\mathrm{shift}}}\right\rfloor+1-(m\bmod2)\result{h}
\end{aligned}
```

## binary32.resolve.test-the-interval-endpoints.calculation

```math
\begin{aligned}
\mathrm{up}&=((f+h)\bmod2^{32}<f)\result{up} \\
\mathrm{down}&=(h>f)\result{down}
\end{aligned}
```

## binary32.resolve.round-the-fine-digit-and-correct-a-decimal-tie.calculation

```math
\begin{aligned}
\mathrm{digit}&=\left\lfloor\frac{10f+2^{31}+6}{2^{32}}\right\rfloor\result{digit} \\
f&=2^{30}\;\Longrightarrow\;\mathrm{digit}_{\mathrm{final}}=2 \\
&\mathrm{digit}_{\mathrm{final}}\result{digit_final}
\end{aligned}
```

## binary32.output.read-the-numeric-components.calculation.yes

```math
\begin{aligned}
\mathrm{exp}&=10000
\end{aligned}
```

## binary32.output.read-the-numeric-components.calculation.no

```math
\begin{aligned}
\copy{common.math.decimal}&=\value{sign}\mathrm{sig}\times10^{\mathrm{exp}}=\value{sign}\value{sig}\times10^{\value{exp}}
\end{aligned}
```

## binary64.decode.restore-this-binary-value.calculation.no.yes

```math
\begin{aligned}
m&=F\result{m} \\
q&=-1074 \\
\lvert x\rvert&=m\times2^q
\end{aligned}
```

## binary64.decode.restore-this-binary-value.calculation.no.no

```math
\begin{aligned}
m&=2^{52}+F\result{m} \\
q&=E-1023-52\result{q} \\
\lvert x\rvert&=m\times2^q
\end{aligned}
```

## binary64.check-special.dispatch-before-the-approximation.calculation

```math
\begin{aligned}
E&=0\;\lor\;E=2047
\end{aligned}
```

## binary64.check-integer-range.cover-exact-integers-below-2.calculation

```math
\begin{aligned}
&1023\le E\le1075
\end{aligned}
```

## binary64.check-integer-bits.no-nonzero-bit-may-be-discarded.calculation

```math
\begin{aligned}
s&=1075-E\result{s} \\
F\bmod2^s&=0
\end{aligned}
```

## binary64.integer.shift-then-remove-decimal-zeroes.calculation

```math
\begin{aligned}
\mathrm{integer}&=\left\lfloor\frac m{2^s}\right\rfloor\result{integer}
\end{aligned}
```

## binary64.check-power.a-dedicated-asymmetric-interval-procedure.calculation

```math
\begin{aligned}
F&=0
\end{aligned}
```

## binary64.scale.measure-the-input-on-the-decimal-grids.calculation

```math
\begin{aligned}
k&=\left\lfloor\log_{10}(2^q)\right\rfloor\result{k} \\
p&=-k-1\result{p} \\
\copy{common.math.coarse-spacing}&=10^{k+1} \\
\copy{common.math.fine-spacing}&=10^k \\
10^k&\le2^q<10^{k+1} \\
z&=\frac{\lvert x\rvert}{10^{k+1}}=m\times2^q\times10^p \\
Y&=2048z
\end{aligned}
```

## binary64.scale.choose-a-power-from-a-finite-cache.calculation

```math
\begin{aligned}
k&=\left\lfloor\frac{q\times315653}{2^{20}}\right\rfloor\result{k} \\
\mathrm{index}&=p+293\result{index}
\end{aligned}
```

## binary64.scale.normalize-the-cached-multiplier-to-64-bits.calculation

```math
\begin{aligned}
b&=\left\lfloor\log_2(10^p)\right\rfloor\result{b} \\
T&=10^p\times2^{63-b} \\
\mathrm{hi}&=\lfloor T\rfloor\result{hi} \\
&0\le T-\mathrm{hi}<1
\end{aligned}
```

## binary64.scale.one-64-64-bit-product-retain-its-upper-half.calculation

```math
\begin{aligned}
\mathrm{fs}&=q+b+12\result{fs} \\
n&=m\times2^{\mathrm{fs}}\result{n} \\
u&=\left\lfloor\frac{n\times\mathrm{hi}}{2^{64}}\right\rfloor\result{u}
\end{aligned}
```

## binary64.scale.bound-both-sources-of-omitted-information.calculation

```math
\begin{aligned}
Y&=\frac{nT}{2^{64}} \\
Y-u&=\frac{n(T-\mathrm{hi})}{2^{64}}+\frac{(n\times\mathrm{hi})\bmod2^{64}}{2^{64}} \\
&0\le Y-u<2 \\
v&=u+1\result{v} \\
&-1\le Y-v<1
\end{aligned}
```

## binary64.scale.why-add-1025-and-why-keep-eleven-bits.calculation

```math
\begin{aligned}
\mathrm{centered}&=u+1+1024\result{centered} \\
I&=\left\lfloor\frac{\mathrm{centered}}{2048}\right\rfloor\result{I} \\
w&=v-2048I=(\mathrm{centered}\bmod2048)-1024\result{w} \\
\copy{common.math.coarse-decimal}&=I\times10^{k+1}
\end{aligned}
```

## binary64.scale.get-the-interval-radius-from-the-same-cached-word.calculation

```math
\begin{aligned}
\rho&=2048\times2^{q-1}\times10^p=\frac T{2^{65-\mathrm{fs}}} \\
h&=\lfloor\rho\rfloor=\left\lfloor\frac{\mathrm{hi}}{2^{65-\mathrm{fs}}}\right\rfloor\result{h}
\end{aligned}
```

## binary64.check-boundary.only-distances-zero-and-one-are-uncertain.calculation

```math
\begin{aligned}
d&=\lvert w\rvert-h\result{d} \\
&0\le d<2
\end{aligned}
```

## binary64.check-rounding.guard-a-narrow-fine-rounding-window.calculation

```math
\begin{aligned}
R&=5w+512\result{R} \\
g&=((R+5)\bmod1024)\mathbin{\mathrm{OR}}\operatorname{unsigned}(c)\result{g} \\
&g\le10
\end{aligned}
```

## binary64.check-ambiguity.combine-two-already-evaluated-results.calculation

```math
\begin{aligned}
\mathrm{boundary}&=(0\le d<2)\result{boundary} \\
\mathrm{rounding}&=(g\le10)\result{rounding} \\
&\mathrm{boundary}\lor\mathrm{rounding}
\end{aligned}
```

## binary64.choose.select-the-signed-fine-adjustment.calculation

```math
\begin{aligned}
\mathrm{tail}&=\left\lfloor\frac R{1024}\right\rfloor\mathbin{\mathrm{AND}}\operatorname{NOT}(c)\result{tail} \\
\copy{common.math.fine-coefficient}&=10I+\mathrm{tail}
\end{aligned}
```

## binary64.check-tail.avoid-an-unnecessary-multiply-divide-pair.calculation

```math
\begin{aligned}
\mathrm{tail}&=0
\end{aligned}
```

## binary64.resolve.use-the-complete-integer-product.calculation

```math
\begin{aligned}
p&=-k-1\result{p} \\
P&=\left\lfloor\frac{\mathrm{cache}\times m\times2^{\mathrm{shift}}}{2^{64}}\right\rfloor\result{P} \\
I&=\left\lfloor\frac P{2^{73}}\right\rfloor\result{I} \\
f&=\left\lfloor\frac P{2^9}\right\rfloor\bmod2^{64}\result{f}
\end{aligned}
```

## binary64.resolve.correct-endpoints-for-binary-parity.calculation

```math
\begin{aligned}
h&=\left\lfloor\frac{\lfloor\mathrm{cache}/2^{64}\rfloor}{2^{10-\mathrm{shift}}}\right\rfloor+1-(m\bmod2)\result{h} \\
\mathrm{up}&=((f+h)\bmod2^{64}<f)\result{up} \\
\mathrm{down}&=(h>f)\result{down}
\end{aligned}
```

## binary64.resolve.choose-a-grid-and-resolve-decimal-ties.calculation

```math
\begin{aligned}
\mathrm{digit}&=\left\lfloor\frac{10f+2^{63}+6}{2^{64}}\right\rfloor\result{digit} \\
f&=2^{62}\;\Longrightarrow\;\mathrm{digit}_{\mathrm{final}}=2
\end{aligned}
```

## binary64.power-scale.scale-an-asymmetric-power-interval.calculation

```math
\begin{aligned}
p&=-k-1\result{p} \\
I&=\left\lfloor\frac{\mathrm{hi}}{2^{21-\mathrm{shift}}}\right\rfloor\result{I} \\
f&=(\mathrm{hi}\times2^{43+\mathrm{shift}})\bmod2^{64}\result{f} \\
h&=\left\lfloor\frac{\mathrm{hi}}{2^{10-\mathrm{shift}}}\right\rfloor\result{h} \\
\mathrm{half}&=\left\lfloor\frac h2\right\rfloor\result{half}
\end{aligned}
```

## binary64.check-power-coarse.certify-a-coarse-point-over-the-error-interval.calculation

```math
\begin{aligned}
&\mathrm{up}\lor\mathrm{half}>f
\end{aligned}
```




## binary64.output.read-the-returned-numeric-components.calculation.yes

```math
\begin{aligned}
\mathrm{exp}&=10000
\end{aligned}
```

## binary64.output.read-the-returned-numeric-components.calculation.no

```math
\begin{aligned}
\copy{common.math.decimal}&=\value{sign}\mathrm{sig}\times10^{\mathrm{exp}}=\value{sign}\value{sig}\times10^{\value{exp}}
\end{aligned}
```

## common.candidate.integer

```math
\begin{aligned}
\mathrm{sig}_0&=\mathrm{integer}\result{sig_0} \\
\mathrm{exp}_0&=0
\end{aligned}
```

## common.candidate.nonfinite

```math
\begin{aligned}
\mathrm{sig}&=F\result{sig} \\
\mathrm{exp}&=10000
\end{aligned}
```

## common.candidate.zero

```math
\begin{aligned}
\mathrm{sig}&=0 \\
\mathrm{exp}&=0
\end{aligned}
```

## common.candidate.table

```math
\begin{aligned}
\mathrm{sig}&=\mathrm{table}[E].\mathrm{sig}\result{sig} \\
\mathrm{exp}&=\mathrm{table}[E].\mathrm{exp}\result{exp}
\end{aligned}
```

## common.candidate.coarse32

```math
\begin{aligned}
\mathrm{sig}_0&=I\result{sig_0} \\
\mathrm{exp}_0&=e\result{exp_0}
\end{aligned}
```

## common.candidate.coarse64

```math
\begin{aligned}
\mathrm{sig}_0&=I\result{sig_0} \\
\mathrm{exp}_0&=k+1\result{exp_0}
\end{aligned}
```

## common.candidate.fine32

```math
\begin{aligned}
\mathrm{sig}_0&=10I+\mathrm{digit}\result{sig_0} \\
\mathrm{exp}_0&=e-1\result{exp_0}
\end{aligned}
```

## common.candidate.fine64

```math
\begin{aligned}
\mathrm{sig}&=10I+\mathrm{tail}\result{sig} \\
\mathrm{exp}&=k\result{exp}
\end{aligned}
```

## common.candidate.complete32

```math
\begin{aligned}
\mathrm{digit}_{\mathrm{used}}&=\value{digit_used} \\
\mathrm{sig}_0&=(I+\mathrm{up})\times10+\mathrm{digit}_{\mathrm{used}}\result{sig_0} \\
\mathrm{exp}_0&=k\result{exp_0}
\end{aligned}
```

## common.candidate.completeCoarse64

```math
\begin{aligned}
\mathrm{sig}_0&=I+\mathrm{up}\result{sig_0} \\
\mathrm{exp}_0&=k+1\result{exp_0}
\end{aligned}
```

## common.candidate.completeFine64

```math
\begin{aligned}
\mathrm{sig}_0&=10I+\mathrm{digit}_{\mathrm{final}}\result{sig_0} \\
\mathrm{exp}_0&=k\result{exp_0}
\end{aligned}
```

## common.candidate.powerCoarse64

```math
\begin{aligned}
\mathrm{sig}_0&=I+\mathrm{up}\result{sig_0} \\
\mathrm{exp}_0&=k+1\result{exp_0}
\end{aligned}
```

## common.candidate.powerFine64

```math
\begin{aligned}
\mathrm{sig}_0&=10I+\mathrm{digit}\result{sig_0} \\
\mathrm{exp}_0&=k\result{exp_0}
\end{aligned}
```

## common.normalization.remove-zeroes

```math
\begin{aligned}
\mathrm{sig}&=\frac{\mathrm{sig}_0}{10^{\mathrm{zeros}}}\result{sig} \\
\mathrm{exp}&=\mathrm{exp}_0+\mathrm{zeros}\result{exp}
\end{aligned}
```

## common.normalization.unchanged

```math
\begin{aligned}
\mathrm{sig}&=\mathrm{sig}_0\result{sig} \\
\mathrm{exp}&=\mathrm{exp}_0\result{exp}
\end{aligned}
```

## guard.binary32.check-nonfinite

```math
\begin{aligned}
E&=255
\end{aligned}
```

## guard.binary32.check-power

```math
\begin{aligned}
F&=0
\end{aligned}
```

## guard.binary32.check-integer-range

```math
\begin{aligned}
&143\le E\le150
\end{aligned}
```

## guard.binary32.check-integer-bits

```math
\begin{aligned}
F\bmod2^s&=0
\end{aligned}
```

## guard.binary32.check-tiny

```math
\begin{aligned}
&m<11
\end{aligned}
```

## guard.binary32.check-coarse

```math
\begin{aligned}
&a+m+1<h
\end{aligned}
```

## guard.binary32.check-boundary

```math
\begin{aligned}
&a\le h+m+1
\end{aligned}
```

## guard.binary32.check-fine-change

```math
\begin{aligned}
&d_0\ne d_1
\end{aligned}
```

## guard.binary32.check-fine-tie

```math
\begin{aligned}
T\bmod Q&=0
\end{aligned}
```

## guard.binary64.check-special

```math
\begin{aligned}
E&=0\lor E=2047
\end{aligned}
```

## guard.binary64.check-integer-range

```math
\begin{aligned}
&1023\le E\le1075
\end{aligned}
```

## guard.binary64.check-integer-bits

```math
\begin{aligned}
F\bmod2^s&=0
\end{aligned}
```

## guard.binary64.check-power

```math
\begin{aligned}
F&=0
\end{aligned}
```

## guard.binary64.check-power-coarse

```math
\begin{aligned}
&\mathrm{up}\lor\mathrm{half}>f
\end{aligned}
```




## guard.binary64.check-boundary

```math
\begin{aligned}
&0\le d<2
\end{aligned}
```

## guard.binary64.check-rounding

```math
\begin{aligned}
&g\le10
\end{aligned}
```

## guard.binary64.check-ambiguity

```math
\begin{aligned}
&\mathrm{boundary}\lor\mathrm{rounding}
\end{aligned}
```

## guard.binary64.check-tail

```math
\begin{aligned}
\mathrm{tail}&=0
\end{aligned}
```

## binary32.bits.normal

```math
\begin{aligned}
m&=2^{23}+F\result{m} \\
q&=E-127-23\result{q} \\
x&=\value{sign}m\times2^q &\quad&=\value{sign}\value{m}\times2^{\value{q}}
\end{aligned}
```

## binary32.bits.subnormal

```math
\begin{aligned}
m&=F\result{m} \\
q&=-149 \\
x&=\value{sign}m\times2^q &\quad&=\value{sign}\value{m}\times2^{\value{q}}
\end{aligned}
```

## binary64.bits.normal

```math
\begin{aligned}
m&=2^{52}+F\result{m} \\
q&=E-1023-52\result{q} \\
x&=\value{sign}m\times2^q &\quad&=\value{sign}\value{m}\times2^{\value{q}}
\end{aligned}
```

## binary64.bits.subnormal

```math
\begin{aligned}
m&=F\result{m} \\
q&=-1074 \\
x&=\value{sign}m\times2^q &\quad&=\value{sign}\value{m}\times2^{\value{q}}
\end{aligned}
```

## symbol.E

```math
E
```

## symbol.F

```math
F
```

## symbol.I

```math
I
```

## symbol.P

```math
P
```

## symbol.POW_MIN

```math
\mathrm{POW}_{\mathrm{MIN}}
```

## symbol.Q

```math
Q
```

## symbol.R

```math
R
```

## symbol.T

```math
T
```

## symbol.W

```math
W
```

## symbol.Y

```math
Y
```

## symbol.a

```math
a
```

## symbol.b

```math
b
```

## symbol.boundary

```math
\mathrm{boundary}
```

## symbol.c

```math
c
```

## symbol.cache

```math
\mathrm{cache}
```

## symbol.centered

```math
\mathrm{centered}
```

## symbol.d

```math
d
```

## symbol.d_0

```math
d_{0}
```

## symbol.d_1

```math
d_{1}
```

## symbol.digit

```math
\mathrm{digit}
```

## symbol.digit_final

```math
\mathrm{digit}_{\mathrm{final}}
```

## symbol.digit_used

```math
\mathrm{digit}_{\mathrm{used}}
```

## symbol.discarded

```math
\mathrm{discarded}
```

## symbol.down

```math
\mathrm{down}
```

## symbol.e

```math
e
```

## symbol.error

```math
\mathrm{error}
```

## symbol.exp

```math
\mathrm{exp}
```

## symbol.exp_0

```math
\mathrm{exp}_{0}
```

## symbol.f

```math
f
```

## symbol.fs

```math
\mathrm{fs}
```

## symbol.g

```math
g
```

## symbol.h

```math
h
```

## symbol.half

```math
\mathrm{half}
```

## symbol.hi

```math
\mathrm{hi}
```

## symbol.high

```math
\mathrm{high}
```

## symbol.index

```math
\mathrm{index}
```

## symbol.integer

```math
\mathrm{integer}
```

## symbol.k

```math
k
```

## symbol.limit

```math
\mathrm{limit}
```

## symbol.low

```math
\mathrm{low}
```

## symbol.m

```math
m
```

## symbol.margin

```math
\mathrm{margin}
```

## symbol.n

```math
n
```

## symbol.negative

```math
\mathrm{negative}
```

## symbol.p

```math
p
```

## symbol.q

```math
q
```

## symbol.r

```math
r
```

## symbol.rounding

```math
\mathrm{rounding}
```

## symbol.s

```math
s
```

## symbol.shift

```math
\mathrm{shift}
```

## symbol.sig

```math
\mathrm{sig}
```

## symbol.sig_0

```math
\mathrm{sig}_{0}
```

## symbol.sign

```math
\mathrm{sign}
```

## symbol.tail

```math
\mathrm{tail}
```

## symbol.u

```math
u
```

## symbol.up

```math
\mathrm{up}
```

## symbol.upper

```math
\mathrm{upper}
```

## symbol.v

```math
v
```

## symbol.w

```math
w
```

## symbol.z

```math
z
```

## symbol.zeros

```math
\mathrm{zeros}
```

## symbol.α

```math
\alpha
```

## symbol.δ

```math
\delta
```

## symbol.ρ

```math
\rho
```

## symbol.fraction-remainder

@name F mod 2^s

```math
F\bmod2^s
```

## symbol.coarse-margin

@name a + m + 1

```math
a+m+1
```

## symbol.boundary-margin

@name h + m + 1

```math
h+m+1
```

## symbol.fine-remainder

@name T mod Q

```math
T\bmod Q
```

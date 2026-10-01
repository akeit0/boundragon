# Cache contracts for the maintained policies

These contracts feed the centered-filter argument in [PROOF.md](../docs/proof.md).
The source is `compact_cache.h` and `centered_filter.h`; exact finite checks are
in [generate_compact_cache.py](../tools/generate_compact_cache.py). The generator
compares all 618 power exponents and all 2,046 normal binary exponent classes.

| Public policy | Fixed-point unit K | Error bound B | Center c | Cache construction |
|---|---:|---:|---:|---|
| Fast / Balanced | 2048 | 2 | 1 | Exact high limb; table / arithmetic shift |
| Half | 2048 | 6 | 3 | Paired high limbs, arithmetic phase |
| Tiny | 2048 | 4 | 2 | 16-stride upper reconstruction |
| Minimal | 2048 | 4 | 2 | 28-stride upper reconstruction |

The contract is `0 <= Y-u < B` and `h=floor(R)`. Exceptional encodings,
powers of two and ambiguous ordinary inputs use the exact compact fallback in
the raw kernels. Fast/Balanced's default canonical shortcuts specialize integers, subnormals
and powers of two as described in [PROOF.md, Section 9](../docs/proof.md#9-canonical-path-shortcuts).
Fast and Balanced differ only in their shift calculation. Their exact-high
error bound is derived in Section 3 of PROOF.md. Both optional assembly choices
use the same bound and acceptance predicates.

## Common exact quantities

For an ordinary normal input, write

```
x = m*2^q,       2^52 < m < 2^53,
k = floor(log10(2^q)),       p = -k-1,
P = 10^p,       E = floor(log2(P)),
T = P*2^(63-E),       H = floor(T).
```

With `K=2^A`, define `Y=K*x*P`. If a nonnegative integer approximation `L`
satisfies `0 <= T-L < C`, choose

```
s = q+E+A+1,
n = m*2^s,
u = floor(n*L/2^64).
```

Provided `n<2^64`, the discarded product fraction is below one and

```
0 <= Y-u < 1 + C*n/2^64 < 1+C.
```

For the normalized 11-bit paths, exact enumeration of all 2,046 regular raw
exponents establishes `8 <= s <= 11`. Thus the C++ shift does not overflow its
64-bit unsigned operand. The exact interval radius in these coordinates is

```
R = K*2^(q-1)*P = T/2^(65-s).
```

Every candidate supplies an integer `h` that is certified to equal `floor(R)`.
The guard therefore receives both `u <= Y < u+B` and `h <= R < h+1`.

## 28-stride reconstruction: no additional cache arrays

Use the original compact decomposition

```
i = p-(-303),       j=i/28,       r=i%28.
```

Let `T0` be the exact normalized 64-bit real significand of `10^(-303+28*j)`
and let `M` be that of `10^r`. All 28 minor values are integers: their necessary
significands fit in 64 bits. They are already stored in `compact_minor`.

Set `A=compact_major[j].hi+1`. The generator checks that the existing major
high limb is exactly `floor(T0)`, despite the independently generated 128-bit
anchor biases. Consequently `0 < A-T0 <= 1`. The fast path computes one
64-by-64-to-128-bit product `V=A*M` and normalizes it:

```
z = 1 - (V >> 127),       z in {0,1},
U = floor(V*2^z/2^64).
```

For all 618 allowed decimal powers, the generator checks

```
0 <= U-H <= 2.
```

This also follows from the anchor error once the normalization choice is
known to match the exact power: normalization multiplies the anchor error by
less than two before the final integer floor. The explicit certificate avoids
assuming that a rounded anchor never changes a normalization boundary.

The normalized conversion uses `L=U-2`. Then
`0 <= T-L < 3`, so `u <= Y < u+4`. A second wide multiplication performs the
actual input scaling. The first wide multiplication reconstructs the high
approximation; no low-limb multiplication is needed on an accepted fast path.

### Phase without an exponent-shift array

For these 23 existing anchors, exact exponent enumeration establishes

```
floor(log2(10^(-303+28*j))) mod 4 = (j+1) mod 4.
```

The 28 minor phases occupy two bits each in the immediate
`0x006f16f16f16f16c`. The actual phase is

```
E mod 4 = (j+1 + minor_phase[r] + 1-z) mod 4.
```

The shift is `s=8+((q+E)&3)`. Arithmetic intentionally uses unsigned values
before masking by three; unsigned wraparound preserves the low two bits. The
generator verifies that this phase expression produces the exact shift for
every regular raw exponent. The `divmod28` arithmetic and the dependent
reconstruction product are plausible speed costs despite the small cache.

## 16-stride reconstruction

The 16-stride variant uses anchors at `p0=-304+16*j`, with `0<=j<40`. Each
anchor is the ceiling of the exact normalized 64-bit real significand, and
its phase is recovered as `(j + ((19*j+27)>>7) + 2) mod 4`. The generator
checks this identity for all 40 anchors and all 2,046 regular exponent classes.

The index decomposes as `j=(p+304)>>4` and `r=(p+304)&15`, removing division by
28. It reuses the first sixteen entries of `compact_minor`; it does not add a
second minor-power array. Reconstruction, the `U-H` certificate, radius
handling and the error bound are otherwise the same as in the 28-stride path.

This spends 320 additional bytes to simplify indexing. Whether that trade is
useful depends on emitted code and measured workloads.

## Paired powers: reconstruct with a shift and multiplication by five

Store only powers with `p0=-293+2*j`, where `0<=j<309`. Let `T0` be their exact
normalized 64-bit real significand. The next power has the identity

```
Tnext = T0*5/2^d,       d in {2,3}.
```

The normalized exponent changes by `d+1`, so `d=2` changes the phase by three
and `d=3` changes it by four. The approximation

```
Lnext = (floor(T0) >> d)*5
```

has error strictly below five: the discarded real remainder is below `2^d`,
then multiplication scales it by `5/2^d`. Thus
`0 <= floor(Tnext)-Lnext <= 4`. Multiplication by the constant five is suitable
for an integer add/shift instruction or x86 `lea`; it does not require a second
wide product. The source selects between the base approximation and its
reconstructed neighbor with a conditional expression; emitted assembly must
be inspected to establish whether the compiler uses a conditional move.

### Arithmetic phase alternative

`paired_arith_centered_hot` stores the original high limbs without metadata. It uses
the existing fixed-point exponent formula and chooses `d` using

```
d = 2 + (Hbase >= 0xcccccccccccccccc).
```

The inclusive threshold matters for the exact `10^-1` to `10^0` transition.
The generator verifies every one of the 309 choices. The expression should
not be generalized to arbitrary real significands without a separate proof.

This version lets exponent arithmetic proceed independently of the anchor
load and avoids packed metadata restoration. It has the same retained table
size and no larger approximation error. Benchmarking determines whether
overlapping that arithmetic is useful on the selected compiler and CPU.


## Radius and centered acceptance

For Tiny and Minimal, the generator certifies `U >> (65-s) == H >> (65-s)`
for every power and every allowed shift. The input is scaled with `U-2`, but
its radius is computed with `U`; confusing these operands can invalidate the
contract at a shift boundary.

For Half, let `L` be the selected anchor or reconstructed neighbor. The
certificate proves `0 <= H-L <= 4` and
`(L+4) >> (65-s) == H >> (65-s)` for every power and allowed shift.
Thus its code supplies the exact radius floor and a scaling error strictly
below six. The generator also verifies every inclusive normalization threshold.

Each public small-cache policy calls `tiny_nearest_finish` with `centered=true`.
Its coarse ambiguity shell and fine rounding guard are precisely the `c=2`
or `c=3` formulas proved in Section 5. Mask selection sets the fine increment
to zero on a coarse acceptance. Otherwise the signed increment is added to
`10*j` using defined unsigned arithmetic; the represented coefficient is
nonnegative. The proof concerns canonical decimal value, not ASCII output.

Run the generator with `--check` to verify the maintained tables without
modifying them. Source correspondence and compiler correctness remain
separate from the exact mathematical cache contracts.

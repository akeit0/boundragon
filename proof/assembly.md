# Optional x86 helper correctness

`centered_filter.h` implements
`boundragon::detail::centered_half_hot<arithmetic,use_asm,instrument>`.
Fast and Balanced select it through `boundragon::components_raw`.
The x86 option changes only the bounded absolute-value/subtract/mask operation.
The cache contract and exact compact fallback are identical to the C++ path.

## Exact arithmetic change

Let `w` denote the centered residual, with `-1024 <= w <= 1023`. The equivalent unhalved
centered filter is

```cpp
rounded = 10*w + 1024;
tail = rounded >> 11;
fine_guard = ((unsigned(rounded + 10) & 2047) <= 20);
```

Both expressions have an exact factor of two. Their replacements are

```cpp
rounded = 5*w + 512;
tail = rounded >> 10;
fine_guard = ((unsigned(rounded + 5) & 1023) <= 10);
```

For every integer `b`, `floor(2*b / 2048) = floor(b / 1024)`, proving equality
of the two tails. C++20 specifies arithmetic right shift for signed integers,
so this identity also covers negative residuals in the implementation.

For every integer `a`, the least nonnegative remainder satisfies
`(2*a mod 2048) = 2*(a mod 1024)`. Taking `a = 5*w + 517` proves exact equality
of the guards. Converting a negative value to `unsigned` before masking gives
the same power-of-two remainder. The products and additions are small enough
to fit a 32-bit `int`, so neither identity relies on signed overflow.

The accepted coarse candidate, rejected ambiguity set, fine candidate, fallback
rate and output decimal are consequently unchanged. This is a code-generation
improvement to the proved centered filter; it introduces no wider error bound.

## Optional flags-based helper

The ordinary guard needs

```cpp
difference = abs(w) - h;
coarse_mask = difference < 0 ? -1 : 0;
```

The C++ path expresses this with signed arithmetic. The optional GNU x86-64
path uses the following logical register sequence, with `d` initially a copy
of `w`:

```asm
neg     d
cmovs   d, w
sub     d, h
sbb     mask, mask
```

This is Intel notation. The inline assembly includes alternatives for default AT&T mode and
`-masm=intel` mode. This argument describes its bounded arithmetic, not a
formal verification of a compiler or register allocator.

1. After `neg`, `d = -w`. If `w > 0`, the negation has its sign flag set and
   `cmovs` selects `w`; otherwise `d` already equals `abs(w)`. The prohibited
   `INT_MIN` negation cannot occur because `w` is in `[-1024,1023]`.
2. `sub` leaves `d = abs(w)-h`. Both operands are nonnegative and at most 1024,
   with `0 <= h <= 1023`, so signed arithmetic cannot overflow.
3. The carry flag after `sub` is exactly the unsigned borrow condition
   `abs(w) < h`. `sbb mask,mask` yields zero minus that carry, independent of
   the old register value: `mask` is therefore `-1` exactly on the coarse path.

The assembly operands use `+&r` for `difference` and `=&r` for `mask`.
`difference` is an input and an early-clobber output: it changes before the
original `w` and `h` inputs have both been consumed, so it must not share their
registers. The mask output conservatively uses early-clobber as well. The `cc`
clobber declares changes to flags. No memory clobber is needed because the
assembly accesses no memory. The assembly is nonvolatile because it is a pure
calculation and may safely be removed or reordered subject to its operands.

The helper is enabled only when both `use_asm=true` and a GNU-compatible
x86-64 compiler are present. Other targets use the C++ helper. The assembly
itself requires only baseline x86-64 integer instructions, not BMI or AVX.
The compiler may independently choose BMI instructions elsewhere when the
selected `-march` enables them.

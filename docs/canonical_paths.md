# Canonical binary64 paths

The public API returns coefficients without trailing decimal zeroes.
`components_raw` exposes the numeric kernel before that normalization.

```cpp
#include <boundragon/boundragon.h>

auto d = boundragon::to_decimal(12345.0);
auto original = boundragon::to_decimal<boundragon::Cache::Balanced, false, false>(12345.0);
```

Both calls use the same shortest/closest/ties-to-even contract. The third
template argument controls canonical shortcuts for Fast and Balanced, and
grouped normalization for Half/Tiny/Minimal. The second selects the optional
x86 helper. Each cache policy retains its dedicated numeric kernel.

## Specialized cases

The default Fast/Balanced path handles exact integers, subnormals and normal
powers of two before applying the ordinary centered filter.

- Exact integers are extracted by exponent and fraction tests. Their decimal
  coefficients are normalized with modular-inverse divisibility tests.
- Subnormals use their fixed binary exponent and exact scaling, followed by
  canonical normalization.
- Normal powers of two have an asymmetric lower rounding interval. Their
  specialized path uses only the high cache limb. Exact finite checks prove
  identical decisions and fine digits for all 2,046 normal binary exponents.
- Ordinary inputs use the centered filter. Ambiguous decisions call the
  outlined exact converter.

These shortcuts specialize the same interval problem. Turning them off selects
the original filter-plus-normalization adapter; it changes the executed work,
not the result contract. Cache choices trade stored constants for reconstruction
work, so their speed depends on the input distribution and target machine.

## Decimal-zero removal

For a nonzero coefficient, the normalizer first tests whether the last digit is
zero. It then removes fixed groups of decimal zeroes using modular inverses
of powers of five and rotations, avoiding a serial division loop.

The general normalizer covers the full `uint64_t` domain. Conversion callsites
with a coefficient below `10^17` use a bounded helper with groups `8/4/2/1`.
The source bounds and modular identities are given in
[proof Sections 9 and 10](proof.md#9-canonical-path-shortcuts).
[Parameter checks](../proof/decimal_normalization.py) and
[compiled tests](../tests/decimal_normalization.cpp) verify the maintained
constants and exercise the helpers independently of the conversion path.

[Canonical bounds](../proof/canonical_bounds.py) checks the exponent ranges and
power-of-two decisions. The [binary64 rational oracle](../tests/canonical_paths_oracle.py)
tests every public binary64 cache and helper variant on signed boundary,
integer, subnormal and random cases through the compiled test CLI.

Half/Tiny/Minimal use the bounded grouped normalizer by default. Set `canonical_shortcuts`
to `false` to retain serial normalization for those policies.

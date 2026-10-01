# Binary64 integrated writers

Primary comparison: binary64 input to final text in a caller-owned buffer. Only integrated writers appear here; pure canonical conversion has its own suite.

Boundragon entries are experimental benchmark implementations: the rounding kernel passes its 16 leading positions and final digit directly to the pinned upstream digit-writing tail. No public `Decimal`, canonical normalization, component-width bridge, or public string API is involved. Native zmij and both native xjb implementations remain unmodified. The two Boundragon entries retain each respective native full writer layout.

Compiler: `g++ (Ubuntu 11.4.0-1ubuntu1~22.04.2) 11.4.0`. CPU: 13th Gen Intel(R) Core(TM) i7-13700F. CPU 0; thread CPU time. 65,536 values/corpus, 16 passes, 11 trials for each of 2 seeds.

## Integrated writer medians (ns/value)

| Corpus | Balanced, zmij tail | Native zmij | Balanced, xjb tail | Native xjb | Native compact xjb |
|---|---:|---:|---:|---:|---:|
| random-finite-bits | 10.92 | 10.25 | 11.06 | 9.14 | 22.61 |
| one-to-two | 9.98 | 9.76 | 10.08 | 8.95 | 12.15 |
| decimal-1-to-6 | 13.14 | 13.04 | 13.59 | 12.76 | 20.26 |
| precision-mixed | 10.85 | 10.23 | 11.06 | 9.21 | 22.32 |
| simple | 10.52 | 11.15 | 10.52 | 10.93 | 13.91 |
| powers-of-two | 12.85 | 10.48 | 12.93 | 12.81 | 24.70 |
| subnormals | 13.93 | 10.28 | 14.05 | 9.09 | 15.72 |
| integers | 7.65 | 9.90 | 8.06 | 9.19 | 15.96 |

## Relative to the corresponding full native writer

Median paired time ratios minus one; negative means less time. Parentheses are percentile bootstrap 95% intervals across paired seed/trial observations on this machine.

| Corpus | Balanced, zmij tail vs native zmij | Balanced, xjb tail vs native xjb |
|---|---:|---:|
| random-finite-bits | +6.8% (+6.2, +7.8) | +22.6% (+20.8, +23.6) |
| one-to-two | +2.5% (+1.9, +2.9) | +14.2% (+13.4, +15.0) |
| decimal-1-to-6 | +0.8% (+0.0, +1.5) | +6.4% (+5.6, +6.8) |
| precision-mixed | +5.6% (+5.1, +6.4) | +21.0% (+19.8, +21.7) |
| simple | -5.6% (-6.6, -5.0) | -4.2% (-4.6, -3.6) |
| powers-of-two | +23.1% (+21.4, +23.9) | +1.0% (+0.5, +1.5) |
| subnormals | +37.0% (+34.7, +37.4) | +54.1% (+51.3, +55.8) |
| integers | -22.5% (-23.7, -21.6) | -12.2% (-12.8, -11.4) |

## Linked footprint

Separate linked ELF per writer; `.text` + `.rodata` minus a common input/output control. Includes conversion and formatting, LTO and section garbage collection.

| Writer | Bytes |
|---|---:|
| boundragon-balanced-integrated-zmij | 18,104 |
| boundragon-balanced-integrated-xjb | 14,664 |
| zmij-native | 24,168 |
| xjb-native | 19,704 |
| xjb-compact-native | 2,164 |
| boundragon-fast-integrated-zmij | 20,152 |
| boundragon-fast-integrated-xjb | 16,728 |

## Optional Fast control

Fast is retained here only as a control for deciding whether its exponent-shift table justifies the footprint. Primary tables above use Balanced.

| Corpus | Fast, zmij tail | Balanced, zmij tail | Fast, xjb tail | Balanced, xjb tail |
|---|---:|---:|---:|---:|
| random-finite-bits | 10.85 | 10.92 | 10.96 | 11.06 |
| one-to-two | 10.00 | 9.98 | 9.89 | 10.08 |
| decimal-1-to-6 | 12.98 | 13.14 | 13.25 | 13.59 |
| precision-mixed | 10.83 | 10.85 | 10.84 | 11.06 |
| simple | 10.15 | 10.52 | 10.45 | 10.52 |
| powers-of-two | 12.79 | 12.85 | 13.18 | 12.93 |
| subnormals | 13.89 | 13.93 | 14.32 | 14.05 |
| integers | 7.55 | 7.65 | 8.04 | 8.06 |

## Validation

- Every finite input is parsed back to its exact bits and checked against independent Dragonbox shortest/closest/even components. Signed zeros and special tokens are checked.
- Adversarial cases cover every binary exponent, boundary significands, subnormal powers and decimal-power neighbors. Same-tail output must match the full native writer byte for byte.
- Canaries check documented full-writer capacities. Compact native xjb receives 64 bytes because some writes exceed its advertised 33-byte capacity; fresh runs record counts in `validation.txt` under the selected build directory.
- Timed loops write 64-byte slots and lengths, without parsing, hashing or allocation. An untimed checksum checks all output bytes. Trials shuffle writer order and verify CPU affinity.
- Pure canonical conversion has a separate harness and does not call a writer. These results describe this compiler, machine and corpus mix.

This repository retains the measured summary. Fresh runs write trial data, validation logs, hashes, and source snapshots under the chosen ignored build directory; see [reproduction](../../../../docs/benchmarks.md).

ASan/UBSan: all 7,977,564 binary64 outputs pass, including both native xjb writers and native zmij. Raw sanitizer logs are not bundled with this summary.

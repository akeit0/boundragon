# Pure canonical numeric conversion benchmark results

Median thread CPU ns/value; lower is better. Every entry produces a canonical coefficient without trailing decimal zeroes, exponent and sign. Normalization is timed; parsing and ASCII formatting are excluded.

Recorded 2026-10-01 on an Intel Core i7-13700F, WSL2 Linux x86-64, GCC 11.4.0; `-O3 -march=native -flto`. Two seeds and eleven shuffled trials per seed. Default means binary32 Fast or binary64 Balanced.

## Scope of the zmij adapter results

Boundragon and Dragonbox provide canonical coefficients directly. The zmij
entries measure its public `to_decimal` **plus benchmark-supplied numeric
normalization**, because its coefficient can retain trailing zeroes. Serial
normalization divides once per zero; grouped normalization removes blocks.
These labels describe our adapters, not native zmij algorithm variants.

Native zmij's writer trims zeroes during digit conversion and does not use
these adapters. On short decimals the adapter work can make canonical timings
larger than integrated-writer timings. These measurements apply to the adapted
canonical contract; they do not isolate zmij's rounding kernel or establish a
speed advantage over its native writer. The suites also use different loops
and corpus settings, so subtracting their timings does not isolate adapter cost.
See [native integrated-writer results](../integrated-writers/REPORT.md) and
[adapter details](../../../../docs/benchmarks.md#interpreting-the-zmij-normalization-adapters).
All recorded numerical results below are unchanged.

## binary32

| Corpus | Boundragon default | Boundragon Compact | Boundragon Integers | Dragonbox full | zmij + serial normalization | zmij + grouped normalization |
| --- | --- | --- | --- | --- | --- | --- |
| Random finite bits | 5.814 | 8.398 | 6.137 | 8.648 | 8.415 | 7.368 |
| Unit interval [0,1) | 6.113 | 8.542 | 6.090 | 9.269 | 9.311 | 8.341 |
| 1–6 decimal digits | 3.970 | 6.896 | 5.032 | 5.265 | 16.210 | 6.019 |
| Mixed precision, 1–9 digits | 4.511 | 7.370 | 5.069 | 6.589 | 15.630 | 6.857 |
| Exact integers | 1.884 | 1.679 | 1.896 | 8.864 | 9.984 | 8.714 |
| Simple values | 3.812 | 8.219 | 7.780 | 5.526 | 12.801 | 6.378 |
| Normal powers of two | 0.794 | 9.342 | 1.644 | 7.990 | 12.614 | 9.920 |
| Subnormals | 3.393 | 6.888 | 3.393 | 4.637 | 5.085 | 4.354 |

Boundragon default paired time ratios (below 1 is faster), with bootstrap 95% intervals:

| Corpus | vs Dragonbox full | vs zmij + serial normalization | vs zmij + grouped normalization |
| --- | --- | --- | --- |
| Random finite bits | 0.673 [0.669, 0.676] | 0.690 [0.688, 0.695] | 0.786 [0.779, 0.794] |
| Unit interval [0,1) | 0.659 [0.657, 0.663] | 0.656 [0.653, 0.660] | 0.735 [0.729, 0.738] |
| 1–6 decimal digits | 0.759 [0.748, 0.761] | 0.244 [0.243, 0.247] | 0.660 [0.654, 0.664] |
| Mixed precision, 1–9 digits | 0.688 [0.682, 0.692] | 0.288 [0.286, 0.291] | 0.660 [0.654, 0.662] |
| Exact integers | 0.214 [0.211, 0.215] | 0.188 [0.187, 0.190] | 0.217 [0.214, 0.218] |
| Simple values | 0.689 [0.686, 0.694] | 0.297 [0.297, 0.299] | 0.599 [0.592, 0.603] |
| Normal powers of two | 0.099 [0.098, 0.100] | 0.063 [0.062, 0.064] | 0.080 [0.080, 0.081] |
| Subnormals | 0.730 [0.726, 0.735] | 0.666 [0.662, 0.668] | 0.776 [0.772, 0.780] |

## binary64

| Corpus | Boundragon default | Boundragon Minimal | Dragonbox full | Dragonbox compact | zmij + serial normalization | zmij + grouped normalization |
| --- | --- | --- | --- | --- | --- | --- |
| Random finite bits | 6.813 | 10.476 | 8.408 | 11.451 | 9.307 | 10.686 |
| One to two [1,2) | 5.178 | 7.984 | 6.364 | 8.919 | 7.168 | 8.697 |
| 1–15 decimal digits | 6.561 | 9.416 | 6.505 | 9.644 | 23.884 | 21.855 |
| 1–6 decimal digits | 7.182 | 9.395 | 6.400 | 9.606 | 27.574 | 17.383 |
| Hot random pool | 3.221 | 6.681 | 4.782 | 7.398 | 4.970 | 6.518 |
| Simple values | 8.058 | 9.809 | 6.487 | 9.241 | 18.972 | 10.637 |
| precision-d1 | 6.489 | 9.403 | 6.399 | 9.601 | 18.727 | 8.705 |
| precision-d2 | 6.487 | 9.373 | 6.403 | 9.612 | 19.552 | 10.229 |
| precision-d3 | 6.568 | 9.430 | 6.630 | 9.760 | 18.699 | 10.315 |
| precision-d4 | 6.594 | 9.412 | 6.484 | 9.598 | 17.442 | 10.178 |
| precision-d5 | 6.513 | 9.400 | 6.327 | 9.633 | 16.683 | 9.875 |
| precision-d6 | 6.551 | 9.384 | 6.400 | 9.669 | 15.695 | 10.161 |
| precision-d7 | 6.543 | 9.429 | 6.489 | 9.654 | 15.125 | 10.204 |
| precision-d8 | 6.528 | 9.314 | 6.301 | 9.578 | 14.146 | 10.094 |
| precision-d9 | 6.531 | 9.368 | 6.479 | 9.662 | 13.321 | 9.807 |
| precision-d10 | 6.600 | 9.457 | 6.367 | 9.624 | 12.576 | 9.905 |
| precision-d11 | 6.591 | 9.402 | 6.454 | 9.641 | 11.953 | 9.815 |
| precision-d12 | 6.603 | 9.354 | 6.545 | 9.748 | 11.125 | 9.696 |
| precision-d13 | 6.521 | 9.360 | 6.463 | 9.638 | 10.371 | 9.447 |
| precision-d14 | 6.590 | 9.374 | 6.407 | 9.640 | 9.564 | 9.399 |
| precision-d15 | 7.129 | 9.435 | 6.442 | 9.672 | 8.795 | 9.375 |
| precision-d16 | 5.434 | 10.309 | 7.538 | 10.759 | 7.895 | 9.243 |
| precision-d17 | 6.883 | 10.568 | 8.438 | 11.415 | 9.418 | 10.695 |
| Full-range 1–17-digit mixture | 7.049 | 9.674 | 6.740 | 9.943 | 23.242 | 22.724 |

Boundragon default paired time ratios (below 1 is faster), with bootstrap 95% intervals:

| Corpus | vs Dragonbox full | vs zmij + serial normalization | vs zmij + grouped normalization |
| --- | --- | --- | --- |
| Random finite bits | 0.807 [0.803, 0.815] | 0.734 [0.727, 0.746] | 0.639 [0.630, 0.643] |
| One to two [1,2) | 0.811 [0.808, 0.816] | 0.723 [0.717, 0.728] | 0.594 [0.591, 0.597] |
| 1–15 decimal digits | 1.016 [1.006, 1.028] | 0.276 [0.273, 0.277] | 0.302 [0.301, 0.305] |
| 1–6 decimal digits | 1.117 [1.102, 1.124] | 0.261 [0.258, 0.265] | 0.414 [0.410, 0.417] |
| Hot random pool | 0.667 [0.662, 0.675] | 0.647 [0.641, 0.653] | 0.493 [0.485, 0.500] |
| Simple values | 1.243 [1.235, 1.254] | 0.426 [0.424, 0.427] | 0.755 [0.750, 0.761] |
| precision-d1 | 1.012 [1.002, 1.020] | 0.344 [0.342, 0.347] | 0.748 [0.740, 0.751] |
| precision-d2 | 1.007 [0.996, 1.023] | 0.331 [0.330, 0.334] | 0.634 [0.631, 0.639] |
| precision-d3 | 0.987 [0.973, 1.017] | 0.354 [0.349, 0.355] | 0.637 [0.628, 0.645] |
| precision-d4 | 1.010 [1.006, 1.027] | 0.377 [0.373, 0.380] | 0.645 [0.640, 0.650] |
| precision-d5 | 1.023 [1.013, 1.028] | 0.392 [0.386, 0.394] | 0.658 [0.653, 0.666] |
| precision-d6 | 1.014 [0.987, 1.044] | 0.420 [0.414, 0.422] | 0.645 [0.640, 0.655] |
| precision-d7 | 1.012 [0.981, 1.025] | 0.434 [0.431, 0.438] | 0.643 [0.639, 0.648] |
| precision-d8 | 1.033 [1.028, 1.039] | 0.462 [0.461, 0.464] | 0.647 [0.643, 0.652] |
| precision-d9 | 1.014 [0.998, 1.034] | 0.489 [0.484, 0.494] | 0.665 [0.662, 0.668] |
| precision-d10 | 1.033 [1.023, 1.045] | 0.527 [0.521, 0.530] | 0.665 [0.657, 0.675] |
| precision-d11 | 1.020 [1.011, 1.035] | 0.552 [0.550, 0.556] | 0.674 [0.668, 0.678] |
| precision-d12 | 1.012 [1.001, 1.028] | 0.591 [0.589, 0.595] | 0.678 [0.675, 0.683] |
| precision-d13 | 1.020 [1.007, 1.031] | 0.632 [0.628, 0.635] | 0.693 [0.688, 0.699] |
| precision-d14 | 1.029 [1.016, 1.037] | 0.686 [0.680, 0.693] | 0.700 [0.692, 0.707] |
| precision-d15 | 1.117 [1.094, 1.125] | 0.811 [0.809, 0.817] | 0.764 [0.760, 0.767] |
| precision-d16 | 0.724 [0.716, 0.734] | 0.687 [0.683, 0.691] | 0.587 [0.578, 0.591] |
| precision-d17 | 0.819 [0.812, 0.823] | 0.730 [0.726, 0.739] | 0.643 [0.640, 0.646] |
| Full-range 1–17-digit mixture | 1.046 [1.037, 1.058] | 0.303 [0.301, 0.306] | 0.310 [0.309, 0.311] |

## Linked footprint

Control-subtracted .text + .rodata bytes after LTO and section GC; alignment remains included.

| Format | Entry | Text B | Read-only B | Combined B |
| --- | --- | --- | --- | --- |
| binary32 | Boundragon default | 1,061 | 3,688 | 4,749 |
| binary32 | Boundragon Compact | 919 | 616 | 1,535 |
| binary32 | Boundragon Integers | 1,068 | 3,688 | 4,756 |
| binary32 | Dragonbox full | 886 | 624 | 1,510 |
| binary32 | zmij + serial normalization | 698 | 22,528 | 23,226 |
| binary32 | zmij + grouped normalization | 787 | 22,528 | 23,315 |
| binary64 | Boundragon default | 2,209 | 5,584 | 7,793 |
| binary64 | Boundragon Minimal | 1,216 | 608 | 1,824 |
| binary64 | Dragonbox full | 1,231 | 9,904 | 11,135 |
| binary64 | Dragonbox compact | 1,398 | 592 | 1,990 |
| binary64 | zmij + serial normalization | 739 | 22,528 | 23,267 |
| binary64 | zmij + grouped normalization | 828 | 22,528 | 23,356 |

This repository retains this measured summary. Raw trials and development logs are not bundled. See [methodology and fresh-run commands](../../../../docs/benchmarks.md).
Bootstrap intervals describe these trial blocks on this machine; they do not estimate cross-machine variation.

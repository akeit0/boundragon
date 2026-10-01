# Benchmark summaries

Two recorded studies cover distinct contracts:

- [Canonical conversion](2026-10-01/canonical/REPORT.md): numeric coefficient,
  decimal exponent and sign, including trailing-zero normalization.
- [Integrated writers](2026-10-01/integrated-writers/REPORT.md): binary64 input
  to final ASCII in a caller-owned buffer, including conversion and formatting.

Reports retain the measured values, compiler/machine context, and paired trial
intervals from 2026-10-01. Display names use Boundragon; this naming update does
not constitute a new performance measurement. Results describe the measured
implementation, machine, and corpora, not a universal speed claim.

The public repository includes summaries and reproducible benchmark runners.
Raw trial CSVs, command logs, manifests, source snapshots, and development
history are not included. For a new auditable measurement, the runners record
current source/dependency hashes, commands, validation, and raw data under an
ignored build directory. See [benchmark reproduction](../../docs/benchmarks.md).

The explorer uses separate compact [branch measurements](../../docs/branch_rates.md),
which are maintained because they supply its contextual decision ratios.

#!/usr/bin/env python3
"""Validate paired trials and render timing/size tables from portable records."""
import argparse
import csv
import hashlib
import json
from pathlib import Path
import random
import statistics

METHODS = {
    "binary32": ["boundragon", "boundragon-compact", "boundragon-integers", "dragonbox", "zmij", "zmij-grouped"],
    "binary64": ["boundragon", "boundragon-minimal", "dragonbox", "dragonbox-compact", "zmij", "zmij-grouped"],
}
LABELS = {"random-finite-bits": "Random finite bits", "random-bits": "Random finite bits",
          "unit-interval": "Unit interval [0,1)", "one-to-two": "One to two [1,2)", "1-to-6-decimal-digits": "1–6 decimal digits",
          "mixed-precision-1-to-9": "Mixed precision, 1–9 digits", "integers": "Exact integers",
          "simple-values": "Simple values", "normal-powers-of-two": "Normal powers of two", "subnormals": "Subnormals",
          "precision-mixed": "Full-range 1–17-digit mixture", "random-hot": "Hot random pool",
          "1-to-15-decimal-digits": "1–15 decimal digits"}
DISPLAY = {"boundragon": "Boundragon default", "boundragon-compact": "Boundragon Compact",
           "boundragon-integers": "Boundragon Integers", "boundragon-minimal": "Boundragon Minimal",
           "dragonbox": "Dragonbox full", "dragonbox-compact": "Dragonbox compact",
           "zmij": "zmij serial", "zmij-grouped": "zmij grouped"}


def table(headers, rows):
    return "\n".join(["| " + " | ".join(headers) + " |", "| " + " | ".join("---" for _ in headers) + " |"] +
                     ["| " + " | ".join(map(str, row)) + " |" for row in rows])


def interval(values):
    rng = random.Random(12345)
    samples = sorted(statistics.median(rng.choices(values, k=len(values))) for _ in range(10000))
    return [samples[250], samples[9750]]


def summarize(directory):
    directory = Path(directory)
    environment = json.loads((directory / "environment.json").read_text())
    for name, digest in environment.get("artifact_sha256", {}).items():
        if hashlib.sha256((directory / name).read_bytes()).hexdigest() != digest:
            raise ValueError(f"Recorded artifact changed: {name}")
    summary = {}
    for fmt, methods in METHODS.items():
        rows = list(csv.DictReader((directory / (fmt + ".csv")).open()))
        blocks = {}
        for row in rows:
            row["method"] = row["method"].replace("kurikara", "boundragon")
            key = (row["seed"], row["corpus"], row["trial"])
            block = blocks.setdefault(key, {})
            if row["method"] in block:
                raise ValueError(f"Duplicate paired trial: {fmt} {key} {row['method']}")
            block[row["method"]] = row
            if row["cpu_start"] != row["cpu_end"] or int(row["cpu_start"]) != environment["cpu_affinity"]:
                raise ValueError("CPU migration or unexpected affinity")
            if float(row["cpu_ns_per_value"]) <= 0 or int(row["conversions"]) != int(row["n"]) * int(row["repetitions"]):
                raise ValueError("Invalid timing or conversion count")
        if not blocks:
            raise ValueError(f"No {fmt} trials")
        for key, block in blocks.items():
            if set(block) != set(methods):
                raise ValueError(f"Incomplete trial block: {fmt} {key}")
            contexts = {(r["corpus_hash"], r["n"], r["repetitions"], r["conversions"], r["checksum"]) for r in block.values()}
            if len(contexts) != 1:
                raise ValueError(f"Mismatched inputs or checksums: {fmt} {key}")
        corpora = {}
        for corpus in dict.fromkeys(r["corpus"] for r in rows):
            selected = [block for (seed, name, trial), block in blocks.items() if name == corpus]
            seeds = {seed for seed, name, trial in blocks if name == corpus}
            if seeds != {str(int(seed, 0)) for seed in environment["input_seeds"][fmt]}:
                raise ValueError("Missing input seed")
            for seed in seeds:
                if {int(trial) for s, name, trial in blocks if s == seed and name == corpus} != set(range(environment["trials_per_seed"])):
                    raise ValueError("Missing trial blocks")
            values = {method: {"median_cpu_ns": statistics.median(float(block[method]["cpu_ns_per_value"]) for block in selected),
                              "trials": len(selected)} for method in methods}
            ratios = {}
            for reference in ("dragonbox", "zmij", "zmij-grouped"):
                paired = [float(block["boundragon"]["cpu_ns_per_value"]) / float(block[reference]["cpu_ns_per_value"]) for block in selected]
                ratios[reference] = {"median": statistics.median(paired), "bootstrap_95": interval(paired)}
            corpora[corpus] = {"methods": values, "boundragon_paired_time_ratios": ratios}
        summary[fmt] = corpora
    return summary


def corpus_label(fmt, corpus):
    # Older binary64 records used the wrong name for exponent field 1023.
    if fmt == "binary64" and corpus == "unit-interval":
        return LABELS["one-to-two"]
    return LABELS.get(corpus, corpus)


def timing_table(summary, fmt, corpora=None, methods=None):
    methods = methods or METHODS[fmt]
    corpora = list(summary[fmt]) if corpora is None else corpora
    return table(["Corpus", *[DISPLAY[m] for m in methods]],
                 [[corpus_label(fmt, c), *[f"{summary[fmt][c]['methods'][m]['median_cpu_ns']:.3f}" for m in methods]] for c in corpora])


def size_table(footprint):
    return table(["Format", "Entry", "Text B", "Read-only B", "Combined B"],
                 [[fmt, DISPLAY[r["method"]], f"{r['text_delta']:,}", f"{r['rodata_delta']:,}", f"{r['combined_delta']:,}"]
                  for fmt in METHODS for r in footprint[fmt]["rows"]])


def write_report(directory):
    directory = Path(directory)
    summary = summarize(directory)
    footprint = json.loads((directory / "footprint.json").read_text())
    for fmt in METHODS:
        for row in footprint[fmt]["rows"]:
            row["method"] = row["method"].replace("kurikara", "boundragon")
            if row["text_delta"] != row["text"] - footprint[fmt]["control"]["text"] or row["rodata_delta"] != row["rodata"] - footprint[fmt]["control"]["rodata"]:
                raise ValueError("Incorrect footprint control subtraction")
            if row["combined_delta"] != row["text_delta"] + row["rodata_delta"]:
                raise ValueError("Incorrect combined footprint")
    text = ["# Pure canonical numeric conversion benchmark results", "", "Median thread CPU ns/value; lower is better. Every entry produces a canonical coefficient without trailing decimal zeroes, exponent and sign. Normalization is timed; parsing and ASCII formatting are excluded.", ""]
    for fmt in METHODS:
        text += ["## " + fmt, "", timing_table(summary, fmt), "", "Boundragon default paired time ratios (below 1 is faster), with bootstrap 95% intervals:", ""]
        rows = []
        for corpus, record in summary[fmt].items():
            cells = []
            for ref in ("dragonbox", "zmij", "zmij-grouped"):
                r = record["boundragon_paired_time_ratios"][ref]
                cells.append(f"{r['median']:.3f} [{r['bootstrap_95'][0]:.3f}, {r['bootstrap_95'][1]:.3f}]")
            rows.append([corpus_label(fmt, corpus), *cells])
        text += [table(["Corpus", "vs Dragonbox full", "vs zmij serial", "vs zmij grouped"], rows), ""]
    text += ["## Linked footprint", "", "Control-subtracted .text + .rodata bytes after LTO and section GC; alignment remains included.", "", size_table(footprint), "",
             "Raw trials, flags, reference pins, source hashes and recorded artifact hashes accompany this report.", "Bootstrap intervals describe these trial blocks on this machine; they do not estimate cross-machine variation.", ""]
    (directory / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    (directory / "REPORT.md").write_text("\n".join(text), encoding="utf-8")
    return summary


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    args = parser.parse_args()
    write_report(args.directory)
    print(f"Validated and rendered {args.directory / 'REPORT.md'}")

#!/usr/bin/env python3
"""Measure canonical binary32/binary64 conversion and linked entry footprints."""
import argparse
import csv
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess
import sys

from fetch import fetch
from report import METHODS, write_report

ROOT = Path(__file__).resolve().parents[1]
COLUMNS = ["seed", "corpus", "corpus_hash", "trial", "order", "method", "n", "repetitions", "conversions",
           "elapsed_ns", "ns_per_value", "cpu_elapsed_ns", "cpu_ns_per_value", "checksum", "cpu_start", "cpu_end"]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--compiler", default="g++")
    parser.add_argument("--output", type=Path, default=ROOT / "build/benchmarks")
    parser.add_argument("--trials", type=int, default=11)
    parser.add_argument("--repetitions", type=int, default=32)
    parser.add_argument("--values", type=int, default=65536)
    parser.add_argument("--precision", action="store_true", help="also measure 1–17 requested-digit binary64 pools")
    parser.add_argument("--digit-values", type=int, default=100000)
    parser.add_argument("--no-lto", action="store_true")
    parser.add_argument("--smoke", action="store_true", help="small build/preflight/checksum run, not performance evidence")
    args = parser.parse_args()
    if not sys.platform.startswith("linux"):
        parser.error("run under Linux or WSL; CPU affinity and thread CPU clocks are required")
    if args.smoke:
        args.trials = args.repetitions = 1
        args.values = args.digit_values = 1024
    if min(args.trials, args.repetitions, args.values, args.digit_values) <= 0 or args.values & (args.values - 1):
        parser.error("counts must be positive; values must be a power of two")
    output = args.output.resolve()
    published = (ROOT / "benchmarks/results").resolve()
    if output == published or published in output.parents:
        parser.error("write new runs outside the published results directory")
    references = fetch()
    output.mkdir(parents=True, exist_ok=True)
    build = output / "bin"
    build.mkdir(exist_ok=True)
    cpu = min(os.sched_getaffinity(0))
    flags = ["-std=c++20", "-O3", "-DNDEBUG", "-march=native", "-ffunction-sections", "-fdata-sections", "-Iinclude", "-Ibenchmarks"]
    if not args.no_lto:
        flags += ["-flto"]
    commands = []

    def run(command, filename=None, csv_output=False):
        command = list(map(str, command))
        commands.append(command)
        (output / "commands.json").write_text(json.dumps(commands, indent=2) + "\n")
        print("RUN", " ".join(command), flush=True)
        with (output / (filename or "build.log")).open("w" if filename else "a") as stream:
            if csv_output:
                with (output / (filename + ".log")).open("w") as log:
                    subprocess.run(command, cwd=ROOT, stdout=stream, stderr=log, check=True)
            else:
                subprocess.run(command, cwd=ROOT, stdout=stream, stderr=subprocess.STDOUT, check=True)

    sources = [*sorted((ROOT / "include").rglob("*.h")),
               *[ROOT / "benchmarks" / name for name in ["benchmark.cpp", "float_benchmark.cpp",
                 "conversion_entry.cpp", "size_main.cpp", "methods.h", "zmij_float.h",
                 "run.py", "report.py", "fetch.py", "dependencies.json"]]]
    hashes = {p.relative_to(ROOT).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sources}
    for source in sources:
        target = output / "sources" / source.relative_to(ROOT)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(source.read_bytes())
    upstream = build / "zmij.o"
    run([args.compiler, *flags, "-c", "benchmarks/deps/zmij/zmij.cc", "-o", upstream])
    for fmt, source in [("binary32", "float_benchmark.cpp"), ("binary64", "benchmark.cpp")]:
        run([args.compiler, *flags, "benchmarks/" + source, upstream, "-o", build / fmt])
    all_rows = {fmt: [] for fmt in METHODS}
    for index, seed in enumerate(("0x3156a5", "0x9a71de")):
        filename = f"binary32-{index}.csv"
        run([build / "binary32", seed, ("0x7600294", "0x4793936")[index], args.trials, args.repetitions, cpu, args.values], filename, csv_output=True)
        all_rows["binary32"] += list(csv.DictReader((output / filename).open()))
    for index, seed in enumerate(("0x19ed35db", "0x7012a57")):
        for precision in ((False, True) if args.precision else (False,)):
            filename = f"binary64-{index}{'-precision' if precision else ''}.csv"
            command = [build / "binary64", "--methods", "all", "--baseline", "dragonbox", "--seed", seed,
                       "--trials", args.trials, "--repetitions", (1 if args.smoke else 4) if precision else args.repetitions,
                       "--values", args.values, "--hot-values", min(256, args.values), "--csv", output / filename]
            if precision:
                command += ["--per-digit", "--digit-values", args.digit_values,
                            "--corpus", ",".join(["precision-mixed", *[f"precision-d{d}" for d in range(1, 18)]])]
            else:
                command += ["--corpus", "all"]
            run(command, filename + ".log")
            for row in csv.DictReader((output / filename).open()):
                row["seed"] = str(int(seed, 0))
                all_rows["binary64"].append(row)
    for fmt, rows in all_rows.items():
        with (output / (fmt + ".csv")).open("w", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=COLUMNS, lineterminator="\n")
            writer.writeheader()
            writer.writerows({key: row[key] for key in COLUMNS} for row in rows)

    footprint = {}
    caller = build / "caller.o"
    run([args.compiler, *flags, "-c", "benchmarks/size_main.cpp", "-o", caller])
    ids64 = {"boundragon":34, "boundragon-minimal":39, "dragonbox":43, "dragonbox-compact":47, "zmij":35, "zmij-grouped":44}
    for fmt in METHODS:
        records = []
        for method in ["control", *METHODS[fmt]]:
            binary = build / f"size-{fmt}-{method}"
            if fmt == "binary32":
                method_id = 6 if method == "control" else METHODS[fmt].index(method)
                run([args.compiler, *flags, f"-DBOUNDRAGON_FLOAT_SIZE_METHOD={method_id}", "benchmarks/float_benchmark.cpp", upstream,
                     "-Wl,--gc-sections", "-o", binary])
            else:
                obj = build / "entry.o"
                run([args.compiler, *flags, f"-DMETHOD={ids64.get(method,-1)}", "-c", "benchmarks/conversion_entry.cpp", "-o", obj])
                run([args.compiler, *flags, obj, caller, upstream, "-Wl,--gc-sections", "-o", binary])
            listing = subprocess.check_output(["size", "-A", binary], text=True)
            (output / (binary.name + ".txt")).write_text(listing)
            sections = {fields[0]:int(fields[1]) for line in listing.splitlines()
                        if len(fields := line.split()) >= 3 and fields[0].startswith(".")}
            records.append({"method":method, "text":sum(v for k,v in sections.items() if k.startswith(".text")),
                            "rodata":sum(v for k,v in sections.items() if k.startswith(".rodata")),
                            "binary_sha256":hashlib.sha256(binary.read_bytes()).hexdigest()})
        control = records[0]
        for record in records[1:]:
            record["text_delta"] = record["text"] - control["text"]
            record["rodata_delta"] = record["rodata"] - control["rodata"]
            record["combined_delta"] = record["text_delta"] + record["rodata_delta"]
        footprint[fmt] = {"control":control, "rows":records[1:]}
    (output / "footprint.json").write_text(json.dumps(footprint, indent=2) + "\n")
    model = next((line.split(":",1)[1].strip() for line in subprocess.check_output(["lscpu"],text=True).splitlines() if line.startswith("Model name:")), "unavailable")
    environment = {"date":datetime.now(timezone.utc).isoformat(), "cpu":model, "platform":platform.platform(),
                   "compiler":subprocess.check_output([args.compiler,"--version"],text=True).splitlines()[0],
                   "flags":flags, "linker_flags":["-Wl,--gc-sections"], "cpu_affinity":cpu, "trials_per_seed":args.trials,
                   "input_seeds":{"binary32":["0x3156a5","0x9a71de"],"binary64":["0x19ed35db","0x7012a57"]},
                   "reference_pins":{k:references[k] for k in ["dragonbox","zmij"]}, "source_sha256":hashes,
                   "scope":"canonical numeric components; ASCII formatting excluded", "measurement_source_snapshot":"sources/", "smoke":args.smoke,
                   "regular_values":args.values, "regular_repetitions":args.repetitions, "precision":args.precision}
    environment["artifact_sha256"] = {name:hashlib.sha256((output/name).read_bytes()).hexdigest() for name in ["binary32.csv","binary64.csv","footprint.json"]}
    (output / "environment.json").write_text(json.dumps(environment,indent=2)+"\n")
    if hashes != {p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in sources}:
        raise RuntimeError("Source changed during measurement")
    write_report(output)
    print(f"Completed: {output / 'REPORT.md'}")


if __name__ == "__main__":
    main()

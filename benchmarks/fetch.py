#!/usr/bin/env python3
"""Fetch and verify the manifest's pinned numeric and string benchmark sources."""
import hashlib
import json
from pathlib import Path
from urllib.request import Request, urlopen

HERE = Path(__file__).resolve().parent


def fetch():
    manifest = json.loads((HERE / "dependencies.json").read_text())
    for name, record in manifest["files"].items():
        path = HERE / "deps" / name
        if path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest() == record["sha256"]:
            continue
        with urlopen(Request(record["url"], headers={"User-Agent": "boundragon-benchmarks"}), timeout=30) as response:
            data = response.read()
        if hashlib.sha256(data).hexdigest() != record["sha256"]:
            raise RuntimeError(f"Reference hash mismatch: {name}")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    return manifest


if __name__ == "__main__":
    print(f"Verified {len(fetch()['files'])} pinned reference files")

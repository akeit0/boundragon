#!/usr/bin/env python3
"""Ensure the Lean audit rejects intentional proof shortcuts.

Run after `lake build` in proof/lean. Canary declarations exist only in an
ignored temporary .lean file; none is imported by the proof library.
"""
from pathlib import Path
import shutil
import subprocess
import tempfile


ROOT = Path(__file__).resolve().parent.parent
PROJECT = ROOT / "proof" / "lean"


def main() -> None:
    lake = shutil.which("lake")
    if lake is None or not (PROJECT / ".lake").is_dir():
        raise RuntimeError("Install the pinned Lean toolchain and run lake build first")
    source = (PROJECT / "Boundragon" / "Audit.lean").read_text(encoding="utf-8")
    if source.count("run_cmd do") != 1:
        raise RuntimeError("Audit entry point changed; update the rejection test")
    cases = (
        ("public unfinished proof", "public theorem auditCanary : False := by sorry", "sorryAx"),
        ("private unfinished proof", "private theorem auditCanary : False := by sorry", "sorryAx"),
        ("public custom axiom", "public axiom auditCanary : False", "auditCanary"),
        ("private custom axiom", "private axiom auditCanary : False", "auditCanary"),
        ("transitive custom axiom",
         "end Boundragon\nnamespace OutsideTrust\naxiom hole : False\nend OutsideTrust\n"
         "namespace Boundragon\npublic theorem auditCanary : False := OutsideTrust.hole", "hole"),
    )
    with tempfile.NamedTemporaryFile(dir=PROJECT / ".lake", prefix="audit-reject-",
                                     suffix=".lean", delete=False) as file:
        probe = Path(file.name)
    try:
        for label, declaration, expected in cases:
            injection = f"namespace Boundragon\n{declaration}\nend Boundragon\n\n"
            probe.write_text(source.replace("run_cmd do", injection + "run_cmd do", 1),
                             encoding="utf-8")
            result = subprocess.run([lake, "env", "lean", str(probe)], cwd=PROJECT,
                                    capture_output=True, encoding="utf-8", errors="replace")
            output = result.stdout + result.stderr
            rejected = any("depends on disallowed axiom" in line and expected in line
                           for line in output.splitlines())
            if result.returncode == 0 or not rejected:
                raise RuntimeError(f"Audit did not reject {label} as expected:\n{output}")
            print(f"PASS: audit rejects {label}", flush=True)
    finally:
        probe.unlink(missing_ok=True)


if __name__ == "__main__":
    main()

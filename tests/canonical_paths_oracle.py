"""Check canonical conversion paths with the independent rational oracle."""
from pathlib import Path
import random
import struct
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from exact_oracle import oracle

rng = random.Random(0x435348415250)
inputs = set()
mask = (1 << 52) - 1
for raw in range(1, 2047):
    inputs.update((raw << 52) + delta for delta in (-1, 0, 1))
for raw in range(1023, 1076):
    shift = 1075 - raw
    for _ in range(8):
        fraction = rng.getrandbits(52) & ~((1 << shift) - 1)
        inputs.update(((raw << 52) | fraction) + delta for delta in (-1, 0, 1))
inputs.update(range(1, 257))
inputs.update(1 + (rng.getrandbits(52) & mask) for _ in range(512))
for exponent in range(16):
    bits = struct.unpack(">Q", struct.pack(">d", float(10**exponent)))[0]
    inputs.update(bits + delta for delta in (-1, 0, 1))
for _ in range(1024):
    bits = rng.getrandbits(63)
    if ((bits >> 52) & 2047) != 2047 and bits:
        inputs.add(bits)
ordered = sorted(inputs | {bits | (1 << 63) for bits in inputs})
result = subprocess.run([sys.argv[1], "--cli"],
                        input="".join(f"{bits:016x}\n" for bits in ordered),
                        text=True, capture_output=True, check=True)
lines = result.stdout.splitlines()
assert len(lines) == len(ordered)
for bits, line in zip(ordered, lines):
    actual_bits, sig, exp, sign = line.split()
    assert int(actual_bits, 16) == bits
    assert int(sign) == bits >> 63
    assert (int(sig), int(exp)) == oracle(bits), (hex(bits), line, oracle(bits))
print(f"PASS canonical exact-rational oracle: {len(ordered)} signed inputs")

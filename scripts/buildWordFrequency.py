"""Generate the runtime ENABLE intersection. Requires wordfreq==3.1.1.

python3 -m venv .context/wordfreq-venv
.context/wordfreq-venv/bin/pip install wordfreq==3.1.1
.context/wordfreq-venv/bin/python scripts/buildWordFrequency.py
"""
from importlib.metadata import version
from pathlib import Path
from wordfreq import zipf_frequency

assert version("wordfreq") == "3.1.1", "Use the pinned wordfreq version"
root = Path(__file__).resolve().parent.parent
target = root / "server/features/timed-ranks/data/wordfreq-en.tsv"
target.parent.mkdir(parents=True, exist_ok=True)
rows = []
for word in sorted(set((root / "enable1.txt").read_text().splitlines())):
    frequency = zipf_frequency(word, "en", wordlist="large")
    if frequency > 0:
        rows.append(f"{word.upper()}\t{frequency:.2f}\n")
target.write_text("".join(rows))
print(f"Wrote {len(rows)} frequencies to {target.relative_to(root)}")

# Calibration data files

These data files support the offline calibration tooling
(`scripts/calibrate-letters.ts`, `scripts/tune-quotas.ts`,
`scripts/measure-vowels.ts`). They are **not** used at runtime by the
production app — the only data file the server reads is the top-level
`enable1.txt` dictionary.

## `mit10k.txt`

The MIT 10,000 most common English words list. ~74 KB, 10,000 lines.

A public, freely-redistributable list used as a binary common-word
reference in the calibration harness ("is this word in the 10k common?
yes/no"). No license restrictions known.

## `subtlex.tsv`

Preprocessed subset of **SUBTLEX-US** — English word frequencies derived
from American film and television subtitles by Brysbaert & New (2009).
~942 KB, ~64k lines. One word per line, tab-separated with the Zipf
frequency score:

```
aa	3.233
aah	4.722
```

Used by the calibration harness to classify words into attainability
tiers (easy / medium / hard / impossible) based on Zipf score. Provides
a continuous frequency gradient beyond the binary MIT 10k list.

### Source and attribution

**Brysbaert, M., & New, B. (2009).** *Moving beyond Kučera and Francis:
A critical evaluation of current word frequency norms and the
introduction of a new and improved word frequency measure for American
English.* Behavior Research Methods, 41(4), 977–990.

Dataset distributed by Ghent University:
<https://www.ugent.be/pp/experimentele-psychologie/en/research/documents/subtlexus>

The file in this repo is a preprocessed derivative: it intersects the
raw SUBTLEX-US word list with `enable1.txt` and converts the
`SUBTLWF` (frequency per million) column to Zipf scale using the
standard formula:

```
zipf = log10(SUBTLWF * 1000) = log10(SUBTLWF) + 3
```

See `scripts/preprocess-subtlex.ts` for the regeneration procedure.

### License

SUBTLEX-US is described as "freely available" in the original paper. The
dataset is widely used in academic research. **This repo uses it only
in offline development tooling — the dataset is not shipped as part of
any production deploy.** If the project's distribution model ever
changes such that SUBTLEX-derived data would be redistributed in a
commercial product, revisit licensing then.

### Regenerating `subtlex.tsv`

1. Download `subtlexus2.zip` from the Ghent URL above.
2. Unzip into `scripts/data/_tmp/` (so the txt file ends up at
   `scripts/data/_tmp/SUBTLEXus74286wordstextversion.txt`).
3. Run `npx tsx scripts/preprocess-subtlex.ts` from the repo root.

The output `subtlex.tsv` will be deterministic given the same input.

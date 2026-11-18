# Timed ranks: second-pass findings

Date: November 17, 2026. Status: implemented and published to the local review database; production game data and deployment are unchanged.

## Main finding

Two modest changes improved calibration while preserving the simple board formula: calibrate multipliers from the most recent 60 days when there are at least 50 games across five boards, and exclude a calibration board's own results when estimating that board's word difficulty. Otherwise retain the full-history calibration sample. Word statistics themselves still use all eligible production history.

The revised method reduced the historical rank-rate error by **29.2%**, from **5.45 to 3.86 percentage points**, in a replay that refreshes word statistics nightly and keeps saved board targets fixed. This is an improvement in the defined calibration metric, not proof that every board is fair or that prediction accuracy improved by 29%.

The fresh day still produced substantial board-to-board variation. The model remains a review candidate rather than a demonstrated production-ready balance.

## Data and study design

- Production only: 22,539 completed rows before November 17; one invalid 1×1/minimum-99 record was excluded, leaving **22,538 games**. Local and staging histories never enter training.
- Development used three chronological folds: train before August 1, August 22, or September 12; assess the following 21 days, ending before October 3. These supplied 7,228 graded validation games. No October or November outcomes selected the adjustment.
- Compared 24 candidates: own-board inclusion/exclusion; full-history, 90-day or 60-day multiplier samples; and board-value powers 0, 0.5, 0.75 or 1. A zero power was a diagnostic control that ignored board differences.
- Selection minimized the mean across modes of weighted absolute achievement-rate error. Weights for Scribe through Legend were 1/1/1/2/3, emphasizing the upper ranks. Desired achievement rates remain 80/55/30/10/2%.
- The choice was locked before the later historical and fresh checks. October 3–November 15 was previously reviewed in pass one, so it is a confirmation period, **not an untouched blind test**. The fresh check uses 122 newly available November 16 games; their outcomes were inspected only after selection.
- [Machine-readable results](timed-ranks-pass-two.json) include every candidate, split dates, provenance hashes, all five rank rates and the selected sample windows. Private exports remain gitignored.

## What helped—and what did not

1. **Recent calibration helped most.** On development data, the original method's error was 3.39 points; a 60-day sample alone reduced it to 2.78. This can accommodate changing game/participant distributions, but does not establish that individual players improved.
2. **Excluding the scored board also helped.** Using a board's results to estimate its own difficulty makes the calibration partially self-referential. Excluding it alone reduced development error to 3.06; combining both changes reached **2.48**, a 26.8% reduction. Exclusion removes every occurrence of that board, including observations older than the calibration window.
3. **A more complicated board formula did not win.** The existing linear sum beat the tested square-root and 0.75-power alternatives. The no-board control was also worse. Keep vocabulary/finding weights at 40/60 and retain normal mode scoring.
4. **Nightly updates were not the main explanation for pass-one drift.** Even the original method with a faithful nightly replay remained at 5.45 points of error. The revised method reached 3.86. A frozen-statistics comparison showed a similar relative improvement, 5.61 to 4.05.

## Later historical check

Both methods graded the same **5,557 games**, with 40 unsupported attempts left ungraded. They were simulated with causal nightly word-statistics refreshes and immutable shared-board targets.

| Mode | Games | Previous Legend rate | Revised Legend rate |
|---|---:|---:|---:|
| Timed daily | 1,274 | 4.8% | 4.4% |
| Time is Money | 549 | 1.6% | 1.5% |
| Gauntlet regular | 1,185 | 5.5% | 4.7% |
| Gauntlet hot letter | 1,166 | 3.3% | 3.1% |
| Gauntlet rare letters | 1,145 | 3.9% | 2.9% |
| Free play / rooms | 238 | 5.0% | 5.0% |

Legend is still more common than the approximate 2% target in most modes. Time is Money was already close and became slightly stricter; free-play Legend frequency did not improve. Across 214 boards with at least ten games, boards with at least 10% Legend achievement fell from **28 to 23**. This count is a diagnostic, not an equal-fairness guarantee: the overall rates also became stricter.

A paired seven-day-block bootstrap with 1,000 replicates gave a 95% interval of **0.88–1.79 percentage points** for the historical error reduction. It measures uncertainty conditional on these fitted models and this historical sample; it does not include all model-selection or future-population uncertainty.

## Genuinely fresh check

The November 16 sample contains **122 games on five daily boards**: 30 timed daily, 27 regular Gauntlet, 26 hot-letter Gauntlet, 26 rare-letter Gauntlet and 13 Time is Money games. There are no fresh free-play results.

- Error decreased **9.4%**, from 20.88 to 18.91 percentage points, but both values remain high for this single day.
- Across the sample, Legend awards fell from **12 to 9**.
- The rare-letter round still had **5 of 26 players (19.2%)** reach Legend, versus 7 previously. Time is Money had 2 of 13, timed daily 2 of 30, and the other two rounds had none.
- This is insufficient to estimate a stable 2% tail rate or certify consistency across future boards. It exposes the remaining weakness instead of being used to tune another parameter.

## Implemented behavior and remaining work

The model version now identifies the board-out/60-day policy. A model-policy change cannot silently reuse pass-one multipliers. Saved game targets and all player scores retain their existing behavior. Calibration metadata records sample dates, counts, board diversity and whether the recent window qualified. Stable canonical fingerprints prevent PostgreSQL JSON key ordering from creating a new version on an identical refresh.

Coverage remains **31 supported settings combinations out of 44**. Eleven qualify for recent calibration; twenty use all-history fallback. Thirteen sparse free-play combinations remain unsupported. No individual player's identity or ability enters their targets.

The next useful evidence is several more independently generated days under the locked method. Inspect recurring board outliers before adding word-family, path-layout or other board features; test any proposed feature on older dates and reserve a new later period. The current data cannot separate board effects from participant changes because player identifiers were deliberately not exported.

## Verification

- Type and capability-boundary checks passed.
- 155 unit tests, 37 PostgreSQL integration tests, and three timed-rank browser scenarios passed.
- Regression coverage includes excluding older occurrences of the same board, sparse-window fallback, stable metadata fingerprints, ignoring older-policy multipliers, concurrent starts and saved-target persistence.
- The full production-derived model was published locally and refreshed again without recalibration; both runs produced the same model version.

No deployment or commits were created.

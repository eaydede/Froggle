# Board ranks: local implementation

The results handoff v3 replaces the ring and popup with a read-only, snapping
rank carousel and a **This Board** difficulty summary in solo Recap. The carousel
climbs from Scribe once per results screen, supports scroll/pointer cancellation,
and skips motion when reduced motion is preferred. Only the carousel scrolls;
its edge fades reflect whether more ranks are available above or below.

Everything outside that panel retains the existing results behavior: Recap,
Playback, Highlights, comparisons, definitions, board paths, and 4×4–6×6 boards.
The gameplay page has no rank progress display.

## Rank policy

- New boards use equal point steps. Scribe starts at **0**, and entering green,
  blue, purple, or orange earns Wordsmith, Linguist, Virtuoso, or Legend 1.
- For this first revision, the existing Legend 1 estimate remains the initial
  anchor. Individual historical percentiles no longer set the lower ranks.
  The word-difficulty and attainable-board-value calculations are unchanged.
- Divide the board's anchored Legend estimate by four and round once to get an
  integer step. Cap it so Legend 1 is achievable. For example, a 25-point step
  gives Scribe **0**, Wordsmith **25**, Linguist **50**, Virtuoso **75**,
  Legend 1 **100**, Legend 2 **125**, and so on without a rank cap.
- The public snapshot stores inclusive band ends. With a 25-point step these
  are `[24, 49, 74, 99, 124]`; the carousel shows entry scores `[0, 25, 50, 75, 100]`.
  One shared helper supplies title entry scores to the carousel and evaluation.
- Below Legend 1, the carousel collapses the top rung to “Legend” with its entry
  score followed by “+”. At Legend N it expands through Legend N+1, with just
  one future level. Each bar fills within its own rank. A pill on the next rung
  shows points needed after the climb lands. The old ring and popup are removed.
- Snapshots keep their numerical band edges. New boards get the even policy;
  existing boards keep their saved spacing, with titles now following the
  active color. Games without snapshots still have no retrospective rank.
  Zen's original rank rules remain unchanged.

## Board difficulty

Raw difficulty is `1 − attainablePoints / totalBoardPoints`: the point-weighted
average word difficulty, including the mode's actual scoring. The model stores
one reference value for each distinct layout/scoring variant under the same
mode, size, time limit, and minimum length. Repeated player-games do not add
extra reference boards. Historical estimates exclude that layout's own plays.

The displayed percentile is the rounded share of reference boards with strictly
lower raw difficulty; ties are not counted as easier. At least five reference
boards are required. Both the label and sentence use this percentile: Easy
0–19, Fair 20–39, Tough 40–59, Hard 60–79, Brutal 80–100. These are relative
labels so the descriptor always agrees with “Harder than X% of boards”.

Reference distributions refresh with word statistics without recalibrating the
Legend anchor. A new board saves its raw difficulty, maximum points, reference
sample size, and percentile with its immutable rank snapshot. These fields travel
in the primary results response, with no extra page-load request. Old snapshots
without comparison data display “Board comparison unavailable.” No percentile is
invented or retrospectively added to a saved result.

Click **This board** to show every valid word, sorted from highest to lowest
combined difficulty. The right column shows ratings from **0** (easiest) to
**1** (hardest), rounded to two decimals. Click the card again or **Points**
to return to the normal found-words list. Definitions and board paths still work.

Ratings are requested only on click and reused while the result stays open.
The authenticated endpoint requires the viewer's completed game and uses its
saved statistics version and exact settings, so subsequent model refreshes do
not alter these details. Solved-word ratings are not sent during gameplay.

## Calibration used locally

Rank policy: `timed-ranks-v4-even-bands`. The statistics model remains
`timed-ranks-v3-legend-p93-board-out-60d-wordfreq-3.1.1`; no word-statistics
recalibration is required for this rank-spacing change.
The local model was rebuilt from the production export through **2026-11-16**:
**22,538 completed player-games**, across **44 exact settings cohorts**;
**31 cohorts** meet the evidence floor (50 games, five distinct boards).
One invalid-settings record was excluded. No local or staging games were used.
Only the local database was updated by this calibration.

The statistical method remains the second pass's board-out calibration,
recent 60 days when sufficiently supported and all eligible history otherwise.
Sparse-word finding rates are smoothed toward vocabulary/length peer rates,
with confidence increasing across distinct boards. The prior pass report
retains its original 98th-percentile Legend experiment; it does not describe
the current equal-step rank policy.

The 93rd-percentile estimate now supplies an initial scale, rather than a
promised player percentile. Under the previous v3 rank policy, the frozen
chronological holdout reported Legend 1 achievement of
8.2% for hot-letter Gauntlet, 11.3% for rare-letter Gauntlet, 12.4% for regular
Gauntlet, and 7.3% for Time is Money. Individual daily settings vary more.
These are diagnostic results on previously reviewed history, not a new blind
validation or the nightly replay from pass two.

## Try it

Run `npm run dev` and use the printed Vite URL. The local calibration is already
published. Start a new timed free-play game with supported settings such as
4×4 / 2 minutes / minimum 4 letters, then finish it to see its actual saved rank.
Daily, Time is Money, and Gauntlet also carry saved targets when starting a
new supported game. Existing attempts keep their original snapshot.

Visual fixtures are available without completing a game:

- `/results?mock=recap`: handoff carousel with a Wordsmith result and Tough board.
- `/results?mock=recap-legend`: expanded Legend 2 carousel.
- `/results?mock=recap-high-legend`: long Legend carousel with a Brutal board.
- `/results?mock=recap-difficulty-unknown`: unavailable comparison data.
- `/results?mock=recap-zero`: Scribe at zero with points to Wordsmith.
- `/results?mock=recap-5x5` and `recap-6x6`: compact board sizes.
- `/results?mock=recap-legacy`: historical game with no rank snapshot or timings.

Fixture points and thresholds are illustrative; actual games use calibration.
Production schema changes, workflow activation, and deployment have not been
performed as part of this local implementation.

## Zen results

Zen now uses the same results carousel and clickable board difficulty card.
Its rank policy is unchanged: Unranked below 3% of maximum points, Scribe at
3%, Wordsmith 8%, Linguist 14%, Virtuoso 22%, and Legend 28%. Legend remains
the peak, without numbered extensions. Entry scores round to the first integer
score that actually earns the rank, including floating-point boundary cases.
The saved theoretical maximum remains authoritative; legacy results without
one reconstruct their ceiling from the words available in that result.

Difficulty uses the same 40% vocabulary / 60% smoothed finding formula, with
an independent `zen:5:0:4` cohort. It does not borrow timed find rates or timed
rank multipliers. A read-only production export added **1,552 completed Zen
games through 2026-11-16**, representing **203 distinct boards** and 14,539 words.
Combined local publication now contains **24,090 valid games**: the original
22,538 timed games plus those Zen games. All 44 timed cohorts' existing
multipliers were verified unchanged. No local games were training input.

The normal statistics refresh now includes completed Zen games. Zen never
calibrates rank multipliers and is excluded from timed-rank holdout evaluation.
The local report/export is under `.context/zen-rank-refresh.json` and
`.context/production-calibration/with-zen-history.json` (both gitignored).

A new `zen_board_difficulties` server-only table freezes the statistics version
and comparison for each Zen date, board, and rules. New games prepare it at
start; completed historical games create it on their first results visit.
If Zen statistics are unavailable, rank percentages still work and comparison
data remains unavailable until a Zen model exists. Ratings require the
viewer's completed game and are fetched only when the card is clicked.
This changes neither competitive/casual standings nor Zen's gameplay rank HUD.

Migration `20261118000000_zen_board_difficulties.sql` has been applied locally;
production schema/data and deployment have not been changed.
Fixtures: `/results?mock=recap-zen`, `recap-zen-zero`, `recap-zen-legend`.

Three short in-app release notes dated 2026-11-18 cover results exploration,
board ranks, and word/board difficulty since the latest Time is Money note.
The rank and difficulty notes flag that calibration may be off and targets or
ratings could change. Zen's existing rank rules are preserved.

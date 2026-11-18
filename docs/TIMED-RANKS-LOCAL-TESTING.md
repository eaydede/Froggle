# Board ranks: local implementation

The results handoff is implemented with **Recap · Playback · Highlights**.
Solo Recap places the board-rank ring beside the Found / All Words list.
Clicking the circle opens the saved rank ladder. The gameplay page has no rank
progress display.
Comparison, definitions, board paths, and playback remain available. Compact
boards support 4×4, 5×5, and 6×6. Missing historical snapshots or unsupported
settings keep the full-width word list without a fabricated rank.

## Rank policy

- The rank percentiles are 20 / 45 / 70 / 90 / **93** for Scribe, Wordsmith,
  Linguist, Virtuoso, and Legend 1. The mock's fixed board-point percentages
  are visual placeholders only.
- A game's point targets come from its attainable board value multiplied by
  the calibrated performance-ratio quantiles for its exact game settings.
  No player identity or personal performance enters target creation.
- Each further Legend level requires the same additional points as the
  Virtuoso → Legend 1 gap. For example, Virtuoso at 80 and Legend 1 at 100
  means Legend 2 at 120, Legend 3 at 140, and so on. There is no rank cap.
- At Legend 1 and above, all five colored bands remain full. The center shows
  Legend N; the caption shows points to Legend N+1.
- Snapshots are immutable. Recalibration affects future boards; existing
  games retain their saved point targets. Older games without targets do not
  acquire retrospective ranks. Zen's original rank rules remain unchanged.

## Calibration used locally

Policy version: `timed-ranks-v3-legend-p93-board-out-60d-wordfreq-3.1.1`.
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
this new 93rd-percentile policy.

Top 7% is the calibration target, not a guarantee for every board or future
population. In the frozen chronological holdout, Legend 1 achievement was
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

- `/results?mock=recap`: handoff layout with a Scribe result.
- `/results?mock=recap-legend`: Legend 2 with all five bands full.
- `/results?mock=recap-zero`: Unranked with points to Scribe.
- `/results?mock=recap-5x5` and `recap-6x6`: compact board sizes.
- `/results?mock=recap-legacy`: historical game with no rank snapshot or timings.

Fixture points and thresholds are illustrative; actual games use calibration.
Production schema changes, workflow activation, and deployment have not been
performed as part of this local implementation.

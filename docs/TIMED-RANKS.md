# Timed ranks

Current rank policy: **equal point steps, Scribe at zero, titles follow the active color**.
The existing 93rd-percentile Legend estimate supplies a starting anchor only;
individual ranks no longer follow separate historical percentiles. Word difficulty
and board-value calculations retain the board-out / 60-day calibration.
See [local testing and current rank policy](TIMED-RANKS-LOCAL-TESTING.md) for the results-page implementation and Legend progression. See
[the second-pass report](TIMED-RANKS-PASS-TWO.md) for the comparison, fresh-day
check and remaining board-level limitations. The initial production results
below are retained as the pass-one baseline.

## Definition of done

- [x] A pinned, attributed open word-frequency lookup supplies vocabulary difficulty in [0, 1], with a neutral fallback for missing words.
- [x] Production is the sole calibration source; local and staging games are rejected. Published models record the production project and runtime lookup excludes local models.
- [x] Completed production timed daily, Time is Money, Gauntlet rounds, and free-play/room results can be backfilled into word statistics. Opportunities count player-games where a word was legally available, including words nobody found; distinct board counts are retained.
- [x] An idempotent nightly job refreshes statistics without double counting or changing saved targets. Dry runs produce a calibration and chronological holdout report without writing.
- [x] Finding difficulty uses vocabulary/length baselines under identical settings, broader vocabulary fallbacks for sparse buckets, opportunity smoothing, and a distinct-board confidence adjustment.
- [x] Legend 1 uses the existing historical performance-ratio estimate as a starting anchor. New boards use four equal integer steps from Scribe at zero to Legend 1, followed by equal Legend steps. Insufficient evidence is reported explicitly.
- [x] Board targets use the agreed 40% vocabulary / 60% finding weighting, the mode's actual scoring, and distinct integer entry scores, with Scribe at zero and Legend 1 achievable.
- [x] Targets are saved once for a shared puzzle/board and settings, identical for all players, and survive resume, results, and statistics refreshes. No player identity enters the calculation.
- [x] Timed play has no rank progress display. Solo Recap shows a read-only rank carousel and a relative board-difficulty summary; Playback and Highlights retain their own tabs. Titles change when entering the next color. New boards have equal rank steps, including further Legend levels; the carousel expands through one Legend level above the player. Zen and Gauntlet's overall rank-sum standings retain their behavior.
- [x] Focused formula tests, database tests for aggregation/snapshots/concurrency, type checks, unit tests, a client build, and a browser check pass. Operational steps and any unavailable calibration data are documented.

## Calculation and responsibility boundaries

The timed-ranks feature owns vocabulary lookup, word statistics, calibration, and immutable board targets. Repositories own SQL; services orchestrate persistence and solving; pure calculation modules own the formulas. Existing game features own when targets are created and how they are transported. Shared model types and presentation components expose the resulting ladder.

Vocabulary difficulty is `clamp((6 - Zipf) / 4, 0, 1)`. Missing frequencies use 0.5. Finding statistics are partitioned by mode (including Gauntlet round kind), board size, starting time, and minimum length. Time is Money uses its starting clock, not the earned duration.

Initial design choices: vocabulary weight 0.4, finding weight 0.6, smoothing strength 20, and confidence reaching full weight at five distinct boards. Baselines pool opportunity/find counts for words of the same length and vocabulary quarter, broadening vocabulary bands before falling back to all words of that length and then the configuration as a whole. The target word is excluded from its own baseline.

Each baseline group must have 20 opportunities after excluding the target word.
If no group qualifies, the final fallback find rate is 0.15. This is a prior,
not a measured estimate. Vocabulary quarters widen into halves before the
same-length fallback. No fallback pools different game configurations.

```text
smoothed = (finds + 20 × baseline) / (opportunities + 20)
confidence = min(distinct boards / 5, 1)
finding difficulty = 1 − (confidence × smoothed + (1 − confidence) × baseline)
word difficulty = 0.4 × vocabulary difficulty + 0.6 × finding difficulty
attainable points = Σ word points × (1 − word difficulty)
step = clamp(round(attainable points × Legend anchor multiplier / 4), 1, floor(maximum / 4))
rank entry scores = 0, step, 2 × step, 3 × step, 4 × step
saved inclusive band ends = step − 1, 2 × step − 1, …, 5 × step − 1
```

The distinct-board blend caps a single board's influence at 20%, even if many
players played it. Rank steps are rounded once, so every transition has the
same integer gap. The gap is capped so Legend 1 remains achievable within the
board’s maximum. Higher Legend levels can extend beyond that maximum. Boards
with fewer than five possible points have no five-rank ladder.

Calibration requires at least 50 completed player-games across five distinct
boards for an exact settings cohort. Multipliers use the most recent 60 days
when that window meets the floor; otherwise they use all eligible history.
When calculating a calibration board's attainable points, all occurrences of
that board are temporarily excluded from its word statistics, including older
occurrences outside the selected window. Persisted word statistics and runtime
estimates for new boards still use the full eligible history.

The evidence floor is not a claim that the 93rd percentile is precisely
estimated. No per-board player minimum is imposed. Unsupported cohorts return
no ladder; gameplay remains available. Nightly refreshes retain already
published multipliers and their sample metadata. Explicit recalibration
publishes new multipliers for future boards. Changes to the statistics/calibration policy cannot silently reuse older-policy
multipliers. The rank layout now has a separate version,
`timed-ranks-v4-even-bands`, so unchanged word statistics and the existing
Legend anchor can be reused without another backfill. Existing saved numerical
band edges remain immutable; their displayed titles now follow the active color
and their carousel shows entry scores. They are not respaced retroactively.

The standard refresh report splits on game date: the first 80% of dates train
the model; later dates form the holdout. Its word statistics stay frozen at the
split, explicitly labeled `frozen-at-split`. The second-pass study separately
replays causal nightly refreshes and immutable shared-board targets. Previously
reviewed dates are not described as an untouched blind test. Reports include
sample sizes, board diversity, achievement rates and unsupported cohorts.

Existing sessions without saved targets retain no timed title. Zen uses its existing maximum-score ladder in the shared results carousel, including Unranked below Scribe and Legend as its peak. Its separate production-derived difficulty cohort supplies the board comparison and word ratings; see the local testing guide for snapshot behavior and provenance. Gauntlet receives per-round titles; overall standings continue to use round rank sums.

Daily snapshot identity includes date and round; free play, shared challenges,
and rooms share identity by board, settings, and scoring modifier. Unsupported
snapshots are also saved, so calibration arriving later cannot change a shared
board's treatment for later players. Saved sessions copy the public targets,
so historical results do not depend on room lifetime or the current model.

## Board difficulty and carousel

The point-weighted average word difficulty is `1 − attainablePoints / maximum`.
Each settings cohort stores a sorted reference distribution of board-out values
for distinct layout/scoring variants. Player count does not weight this
comparison. Refreshing word evidence also refreshes that reference while keeping
published rank multipliers fixed. At least five reference boards are needed.

New board snapshots include raw difficulty, total points, reference count, and
the rounded percentage of reference boards strictly easier than this board.
Ties do not count as easier. The five display states are percentile quintiles
(Easy, Fair, Tough, Hard, Brutal), so the descriptor and comparison text agree.
Missing reference data is shown as unavailable. Existing snapshots are not
mutated to fabricate a comparison.

The solo Recap carousel replaces the old ring and popup. It climbs once on first
display, cancels on user input, respects reduced motion, and exposes actual entry
scores without interactive rungs. Below Legend it shows one collapsed Legend
entry; otherwise it includes one level above the player through Scribe. Outside
this panel, results behavior is unchanged.

## Operations and verification

The migration adds server-only model, word-statistics and board-snapshot tables,
plus nullable target snapshots on timed session tables. A separate Zen board-difficulty migration adds server-only shared assessments without changing Zen rank thresholds. Old scores are not
rewritten. Model/statistics tables have RLS enabled and deny direct anon and
authenticated access. Gameplay APIs expose only saved target totals and versions. Completed-result word-difficulty endpoints can also expose solved-word ratings after verifying the viewer has finished the game.
The primary results response includes the saved targets, so the rank panel does
not wait for the separate field-insights request or display-name lookups. Room
results use their existing board snapshot directly. Insights still load playback
and highlights separately.

The scheduled production refresh requires the ranking migration to have been
applied to production first. Merging onto main deploys staging, while production
deployment is manual. A refresh failing with `42P01: relation "timed_rank_models"
does not exist` indicates the production migration is missing. The normal
production deployment applies migrations and backfills statistics before
releasing the app; rerun the refresh after that deployment completes.

Set `RANKS_SOURCE_DATABASE_URL` to the **production** PostgreSQL connection.
`DATABASE_URL` selects only the publication destination, which may be local,
staging or production. It is never an implicit training-data source. The source
connection must identify `froggle-prod` (`uqmxvyfkarvpftksydmy`) by its direct
hostname or Supabase pooler username; local and staging sources are rejected.
Source queries run in a read-only transaction and do not require the rank
migration to exist in production. Destination migration is required for writes.

With the production source environment variable configured, preview from scratch:

```sh
npm run ranks:refresh -- --recalibrate --report=.context/timed-ranks-report.json
```

Alternatively, reproduce the verified read-only production export used here:

```sh
node --env-file=.env --import tsx scripts/refreshTimedRanks.ts --history=.context/production-calibration/history.json --before=2026-11-16 --recalibrate --report=.context/timed-ranks-production-report.json
```

The export contains `projectRef`, `beforeDate`, `exportedAt` and a `games` array
in the feature's `HistoricalGame` format. The CLI validates its production
project and cutoff. Raw and normalized exports stay under gitignored `.context/`
and contain boards, rules, found words and game IDs; user IDs and profiles were
not exported. No production credential is stored in the export.

Add `--write` to publish to `DATABASE_URL`. Both deployment workflows read
history from production, including when publishing to staging. The nightly
workflow runs at 09:15 UTC with the production source/destination and retains its
JSON evaluation report as an artifact. Its manual `recalibrate` input opts into
new multipliers for future boards. CLI equivalents are `--recalibrate` and
`--before=YYYY-MM-DD` (exclusive game-date cutoff; defaults to today Pacific).
Production migration/deployment must precede activating the scheduled writer.

v1 deliberately rebuilds aggregates from completed games before the cutoff on
each run. This handles late finalization/corrections without an incremental
watermark or duplicate counting. Each distinct board/minimum-length combination
is solved once per run. Found words are deduplicated, normalized and intersected
with the legal solution; points use the current scorer and stored Gauntlet
modifier. Full rebuilds and retained immutable statistics versions may need a
retention/incremental strategy as history grows.

## Pass-one production baseline, November 16, 2026

The read-only production export contained **22,417 completed timed games** before
November 16: 5,619 timed daily games, 12,528 Gauntlet rounds, 1,312 Time is Money
games and 2,958 free-play/room games. One invalid 1×1 / minimum-99-letter timed
record dated 1970 was excluded and is reported under `excludedGames`.

The model was recomputed from scratch using **22,416 production games across
44 valid settings cohorts**. **31 cohorts** meet the 50-game/five-board floor:
all 14 timed-daily settings, all three Gauntlet round types, Time is Money and
13 free-play configurations. The remaining 13 free-play configurations are
explicitly unsupported. No local observations or local multipliers contribute.
The earlier 92-game local experiment was superseded and its generated model
and word statistics were removed from the local publication database.

The production model and word statistics are published to the configured local
destination for review. The complete report is
`.context/timed-ranks-production-report.json`; source provenance, sample sizes,
multipliers, exclusions and holdout achievement rates are included. Production
app tables/schema and deployment have not been changed by this calibration.

The chronological holdout starts on **2026-10-03**, with
**16,819 training games and 5,597 holdout games**.
5,557 holdout games have sufficiently supported training cohorts; the other
40 remain ungraded rather than receiving invented targets.

| Mode | Supported holdout games | Legend achieved |
|---|---:|---:|
| Timed daily | 1,274 | 4.9% |
| Time is Money | 549 | 1.6% |
| Gauntlet regular | 1,185 | 5.4% |
| Gauntlet hot letter | 1,166 | 3.3% |
| Gauntlet rare letters | 1,145 | 4.4% |
| Free play / rooms | 238 | 5% |

The desired Legend rate was approximately 2%. These observed later-game rates
show drift and board/player-population variation, so the first calibrated
multipliers should not be presented as guaranteeing an exact achievement rate.
The holdout was not used to tune the multipliers. Further tuning should retain
an untouched later evaluation period.

Synthetic histories remain confined to disposable unit/database/browser tests.
They are not mixed into the published production-derived model. This change
has not deployed or triggered remote write jobs, and creates no commits.

Pass-one verification (retained as history):

- `npm run check`: dependency boundaries and all configured TypeScript checks passed.
- `npm test`: 153 tests across 30 files passed.
- `npm run test:integration`: 37 tests across seven files passed against disposable PostgreSQL instances using the full migration chain. The five rank database cases cover provenance, publication rejection, aggregation, immutable snapshots and access controls.
- `npm run test:browser -- tests/browser/timed-ranks.spec.ts tests/browser/experience.spec.ts tests/browser/api.spec.ts`: all 16 scenarios passed. The three timed-rank scenarios passed again after the production-source enforcement changes.
- `npm run build --workspace=client`: passed (Vite retains its bundle-size advisory).
- Local destination migration applied and recorded in Supabase migration history; production-only backfill executed successfully. A CLI invocation with only the local `.env` and no explicit production source was verified to fail closed. Dry-run no-write behavior, repeat-refresh counts, immutable targets, concurrent starts, and database permissions are covered by database tests.
- Mobile play, ladder and results screenshots were inspected at 375×667. Screenshots under `.context/timed-ranks-*.png` use the supported browser-test model, not measured production multipliers.

## Pass-two status, November 17, 2026

The source now contains 22,538 valid completed production games through
November 16, including 122 genuinely fresh games reserved until after the
adjustment was selected. Coverage remains 31 of 44 settings cohorts; 11 use
recent samples and 20 use all-history fallback. Thirteen sparse free-play
configurations remain unsupported.

The revised policy is published only to the local review database. Historical
nightly-replay calibration error fell 29.2%; the single fresh day still shows
large board-level variation. This is not a claim that the ranks are balanced
enough for production activation. Full results and the interpretation of these
metrics are in [the second-pass report](TIMED-RANKS-PASS-TWO.md) and its
[machine-readable results](timed-ranks-pass-two.json).

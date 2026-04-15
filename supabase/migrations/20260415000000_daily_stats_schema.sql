-- Phase 1: Schema changes for Daily Puzzle stats page
--
-- Adds stored aggregates to daily_results so the stats endpoint and
-- leaderboards can rank in SQL without re-scoring every row in JS.
--
-- Defaults are safe: existing rows get points=0, word_count=0, longest_word=''.
-- A backfill script (Phase 3) populates real values. The new write path
-- (Phase 2) writes correct values for all new submissions.
--
-- Puzzle-date enumeration for missed-day / streak queries is synthesized
-- via generate_series(launch, today) at query time — no separate puzzle
-- table is needed while "one puzzle per PST calendar day" holds.

alter table public.daily_results
  add column points int not null default 0,
  add column word_count int not null default 0,
  add column longest_word text not null default '';

-- Optimizes rank queries: ORDER BY date, points DESC
create index idx_daily_results_date_points
  on public.daily_results(date, points desc);

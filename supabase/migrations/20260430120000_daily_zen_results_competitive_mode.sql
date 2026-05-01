-- Zen daily mode now lets players choose, per day, between a casual run
-- (not on the leaderboard) and a competitive run (ranked once finished).
-- Pre-existing rows were created when zen had only one mode and everyone
-- appeared on the leaderboard, so they backfill as competitive=true.

alter table public.daily_zen_results
  add column is_competitive boolean not null default true;

-- Replace the existing date+points index with one that also filters on
-- competitive mode. The leaderboard query reads only completed competitive
-- rows for ranking; the prior index would now return rows the query has to
-- discard.
drop index if exists idx_daily_zen_results_date_points;

create index idx_daily_zen_results_date_competitive
  on public.daily_zen_results(date, points desc)
  where ended_at is not null and is_competitive = true;

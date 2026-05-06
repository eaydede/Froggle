-- Match the timed daily leaderboard/rank ordering used by
-- server/routes/leaderboard.ts and server/services/DailyService.ts.
create index if not exists idx_daily_results_date_rank
  on public.daily_results(date, points desc, word_count desc, completed_at asc);

-- Zen leaderboards rank only completed competitive rows, with word count as
-- a secondary sort in the API.
drop index if exists idx_daily_zen_results_date_competitive;
create index if not exists idx_daily_zen_results_date_competitive
  on public.daily_zen_results(date, points desc, word_count desc)
  where ended_at is not null and is_competitive = true;

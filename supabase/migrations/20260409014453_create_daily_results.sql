create table public.daily_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date text not null,
  found_words jsonb not null,
  board jsonb not null,
  completed_at timestamptz not null default now(),
  unique(user_id, date)
);

-- Index for leaderboard queries (score computed at query time)
create index idx_daily_results_date on public.daily_results(date);

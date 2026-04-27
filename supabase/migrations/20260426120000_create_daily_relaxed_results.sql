-- Daily Relaxed mode: untimed daily puzzle, resumable across sessions
-- within the day, ended explicitly by the player or auto-finalized at PST
-- midnight.
--
-- Kept as a separate table from daily_results because the lifecycle is
-- different: timed results are inserted once at game end; relaxed rows are
-- created on first entry and updated on every word found. The table also
-- carries fields that don't apply to timed mode (ended_at, ended_by_player,
-- last_active_at).
--
-- Streaks are intentionally not tracked for relaxed mode — the mode is
-- low-stakes by design and a streak would either be trivially easy to
-- maintain or punitive in a way that contradicts the framing.

create table public.daily_relaxed_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date text not null,
  found_words jsonb not null default '[]'::jsonb,
  board jsonb not null,
  started_at timestamptz not null default now(),
  last_active_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by_player boolean not null default false,
  points int not null default 0,
  word_count int not null default 0,
  longest_word text not null default '',
  unique(user_id, date)
);

create index idx_daily_relaxed_results_date on public.daily_relaxed_results(date);
create index idx_daily_relaxed_results_date_points
  on public.daily_relaxed_results(date, points desc)
  where ended_at is not null;

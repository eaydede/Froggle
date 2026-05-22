-- Daily Gauntlet mode: a 3-round chain played sequentially in a day.
-- One row per (user, date, round). The row is created when the player
-- starts a round; the board + modifier captured at start-time are
-- persisted so the row stays interpretable even if round-generation
-- logic shifts later. Submissions append to found_words and update
-- aggregates; the row is finalized on player /end or auto-finalize
-- when the round's time limit elapses.
--
-- Aggregate ranking is computed at read time as sum-of-per-round-ranks
-- across the three rounds the user finished — no denormalized aggregate
-- column is stored, so tweaks to per-round ranking tiebreaks
-- automatically propagate to the gauntlet leaderboard.

create table public.daily_gauntlet_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date text not null,
  round_index smallint not null check (round_index between 0 and 2),
  round_kind text not null check (round_kind in ('regular', 'hotLetter', 'rareLetters')),
  board jsonb not null,
  modifier jsonb not null,
  found_words jsonb not null default '[]'::jsonb,
  points int not null default 0,
  word_count int not null default 0,
  longest_word text not null default '',
  board_size smallint not null,
  min_word_length smallint not null,
  time_limit int not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  completed_at timestamptz,
  unique(user_id, date, round_index)
);

create index idx_daily_gauntlet_results_date_round
  on public.daily_gauntlet_results(date, round_index);
create index idx_daily_gauntlet_results_user_date
  on public.daily_gauntlet_results(user_id, date);
create index idx_daily_gauntlet_results_date_ended
  on public.daily_gauntlet_results(date)
  where ended_at is not null;

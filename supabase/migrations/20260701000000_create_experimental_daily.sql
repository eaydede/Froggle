-- Experimental daily modes: a rotating group of prototype game variants that
-- share one table instead of a table-per-mode. `mode_key` discriminates the
-- variant; `state` carries mode-specific bookkeeping (e.g. On Thin Ice's per-
-- tile remaining uses) captured at start so the row stays self-describing on
-- resume and on the results screen. One row per (user, date, mode).
--
-- Deliberately shared rather than forked (unlike daily_gauntlet_results): these
-- modes are meant to churn — a retired mode just stops being written and its
-- rows sit harmlessly behind a mode_key filter, no dead table left behind. A
-- mode that graduates to permanent gets promoted to its own stack later, once
-- its shape is known.
--
-- Ranking is points-based like every other mode (Time is Money's "time
-- survived" is base_time + points, which orders identically to points), so no
-- separate ranking column is needed.

create table public.experimental_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date text not null,
  mode_key text not null,
  board jsonb not null,
  state jsonb not null default '{}'::jsonb,
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
  unique(user_id, date, mode_key)
);

create index idx_experimental_results_date_mode
  on public.experimental_results(date, mode_key);
create index idx_experimental_results_user_date
  on public.experimental_results(user_id, date);
create index idx_experimental_results_date_mode_ended
  on public.experimental_results(date, mode_key)
  where ended_at is not null;

-- One vote per player per mode per day. The signal is about whether the day's
-- experience felt good, not a permanent verdict on the mode, so it is scoped to
-- the date. Tallies are read by us, never surfaced to players.
create table public.experimental_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  date text not null,
  mode_key text not null,
  sentiment text not null check (sentiment in ('up', 'meh', 'down')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date, mode_key)
);

create index idx_experimental_votes_date_mode
  on public.experimental_votes(date, mode_key);

-- All access is through the server's service-role key, which bypasses RLS.
-- Enabling RLS with no policies denies the anon/auth keys entirely — the safe
-- default per the project's database rule.
alter table public.experimental_results enable row level security;
alter table public.experimental_votes enable row level security;

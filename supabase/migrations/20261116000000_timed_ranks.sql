-- Server-owned calibration data. No direct client access or player identity.
create table public.timed_rank_models (
  version text primary key,
  source_project_ref text not null,
  through_date date not null,
  cohorts jsonb not null,
  published_at timestamptz not null default now()
);
create index timed_rank_models_latest on public.timed_rank_models (through_date desc, published_at desc);

create table public.timed_word_statistics (
  version text not null references public.timed_rank_models(version) on delete cascade,
  settings_key text not null,
  word text not null,
  opportunities integer not null check (opportunities > 0),
  finds integer not null check (finds >= 0 and finds <= opportunities),
  boards integer not null check (boards > 0 and boards <= opportunities),
  primary key (version, settings_key, word)
);

-- Includes a null target snapshot when calibration is unavailable: a refresh
-- must not give later players different targets on the same daily puzzle.
create table public.timed_board_ranks (
  board_key text primary key,
  targets jsonb,
  created_at timestamptz not null default now()
);

alter table public.timed_rank_models enable row level security;
alter table public.timed_word_statistics enable row level security;
alter table public.timed_board_ranks enable row level security;
revoke all on public.timed_rank_models, public.timed_word_statistics, public.timed_board_ranks from anon, authenticated;

alter table public.daily_results add column rank_targets jsonb;
alter table public.daily_time_is_money_results add column rank_targets jsonb;
alter table public.daily_gauntlet_results add column rank_targets jsonb;
alter table public.free_play_sessions add column rank_targets jsonb;

-- Time is Money graduates out of the experimental bucket into a permanent mode
-- of its own, and the experimental bucket goes away.
--
-- The shared `experimental_results` table only ever held two modes; Golden
-- Ticket is retired and Time is Money keeps its rows, so the table is renamed
-- in place rather than recreated — no data migration, no orphaned table. With
-- one mode left, `mode_key` and the free-form `state` blob have no reader and
-- come off with it. Dropping `mode_key` also takes the mode-keyed indexes and
-- the (user, date, mode) unique constraint with it, so both are re-declared
-- below in their single-mode shape.
--
-- `experimental_votes` (the per-day smile/meh/frown reaction) existed to decide
-- whether a prototype was worth keeping. That decision is made, so the table
-- and its signal are dropped rather than carried forward into a shipped mode.

drop table if exists public.experimental_votes;

alter table public.experimental_results rename to daily_time_is_money_results;

delete from public.daily_time_is_money_results where mode_key <> 'time-is-money';

alter table public.daily_time_is_money_results drop column mode_key;
alter table public.daily_time_is_money_results drop column state;

alter index if exists idx_experimental_results_user_date
  rename to idx_daily_time_is_money_results_user_date;
alter index if exists experimental_results_pkey
  rename to daily_time_is_money_results_pkey;

alter table public.daily_time_is_money_results
  add constraint daily_time_is_money_results_user_date_key unique (user_id, date);

create index idx_daily_time_is_money_results_date_ended
  on public.daily_time_is_money_results(date)
  where ended_at is not null;

-- RLS carries over with the rename (all access is through the service-role
-- key, which bypasses it); asserted here so the state is readable in one file.
alter table public.daily_time_is_money_results enable row level security;

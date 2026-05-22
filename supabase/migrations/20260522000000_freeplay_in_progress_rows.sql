-- Promote free_play_sessions to a session-based lifecycle that mirrors
-- daily_results: the row is created on /api/game/start with started_at = now()
-- and completed_at = null, mutated on every word submission, and finalized
-- (completed_at set) by /end or auto-finalized on time-limit expiry. This is
-- what lets a free-play refresh resume the in-progress game from the server
-- instead of restarting the timer.
--
-- Existing rows predate the session model and were inserted at game end
-- only. Backfill started_at to a value that places the play window entirely
-- before completed_at so historic rows present as already-finalized sessions
-- to every read path. The unlimited-timer case (time_limit = 0) collapses to
-- started_at = completed_at, which is harmless.

alter table public.free_play_sessions
  add column started_at timestamptz not null default now();

alter table public.free_play_sessions
  alter column completed_at drop default,
  alter column completed_at drop not null;

update public.free_play_sessions
set started_at = completed_at - make_interval(secs => time_limit)
where completed_at is not null;

-- At most one in-progress free-play row per authenticated user. Anonymous
-- rows (user_id null) are excluded because the table predates auth and
-- legacy null rows shouldn't be uniqueness-constrained against each other.
-- In practice GameContext signs the player in anonymously before /start
-- runs, so every new in-progress row has user_id set.
create unique index free_play_sessions_active_per_user
  on public.free_play_sessions (user_id)
  where completed_at is null and user_id is not null;

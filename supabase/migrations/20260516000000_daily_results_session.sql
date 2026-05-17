-- Migrate daily_results to a session-based lifecycle that mirrors
-- daily_zen_results. The session row is created on /start, mutated on each
-- /word submission, finalized on /end (player-triggered) or auto-finalized
-- when the time limit elapses. The previous bulk POST /api/daily/results
-- endpoint accepted a client-supplied word list without validating that the
-- words existed on the board or were dictionary words — making it trivial to
-- inflate scores. Persisting words per-submission through path validation
-- closes that gap.
--
-- Existing rows predate the session model and were inserted at game end
-- only. We backfill started_at to a value that places the play window
-- entirely before completed_at so older rows present as already-finalized
-- sessions to any read path that gates on ended_at.

alter table public.daily_results
  add column started_at timestamptz not null default now(),
  add column ended_at timestamptz;

update public.daily_results
set
  started_at = completed_at - make_interval(secs => time_limit),
  ended_at = completed_at
where ended_at is null;

create index idx_daily_results_date_ended on public.daily_results(date)
  where ended_at is not null;

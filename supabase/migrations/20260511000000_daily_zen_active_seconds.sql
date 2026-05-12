-- Gap-capped active-time tracking for zen sessions.
--
-- Why: zen sessions are resumable, so started_at→ended_at is wall-clock
-- time, not engagement time. We have no client heartbeat to ground-truth
-- this against, so we approximate: on every word submission, credit
-- min(now - last_active_at, CAP) seconds. A user who walks away for an
-- hour and comes back gets at most CAP seconds credited for that gap.
--
-- The cap lives in application code (server/services/DailyZenService.ts),
-- not the schema, because it's a behavioral knob we may want to tune.

alter table public.daily_zen_results
  add column active_seconds int not null default 0;

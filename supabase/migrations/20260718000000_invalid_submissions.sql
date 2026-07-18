-- Records rejected word attempts (not-a-word / duplicate) per game, so the
-- results timeline can show activity that didn't score — a cluster of failed
-- tries during a lull, near-misses inside a run of finds, etc.
--
-- Each entry is { word, reason, t, path }: the derived word (empty when the
-- drawn path wasn't a valid trace), why it was rejected, the elapsed play
-- seconds when attempted, and the path the player drew. The array is capped in
-- application code (most-recent N) so it can't grow without bound.
--
-- Nullable with no default, matching word_times: rows written before this
-- column read as "no attempts recorded". These tables already have RLS enabled
-- with policies defined at creation; adding a column inherits them.

alter table public.daily_results add column invalid_submissions jsonb;
alter table public.daily_zen_results add column invalid_submissions jsonb;
alter table public.free_play_sessions add column invalid_submissions jsonb;
alter table public.daily_gauntlet_results add column invalid_submissions jsonb;
alter table public.experimental_results add column invalid_submissions jsonb;

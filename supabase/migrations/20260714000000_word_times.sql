-- Per-word find-time capture for game timelines.
--
-- Adds a `word_times` array parallel to each mode's `found_words`:
-- word_times[i] is the elapsed play time in seconds (from started_at) at which
-- found_words[i] was found. Nullable with no default, so every row written
-- before this column — including sessions in progress at migration time — reads
-- as "no timing". The submit path pads any such gap with nulls as new words
-- land, keeping the two arrays index-aligned.
--
-- These tables already have RLS enabled with their access policies defined at
-- creation; adding a column inherits those policies and needs no new grant.

alter table public.daily_results add column word_times jsonb;
alter table public.daily_zen_results add column word_times jsonb;
alter table public.free_play_sessions add column word_times jsonb;
alter table public.daily_gauntlet_results add column word_times jsonb;
alter table public.experimental_results add column word_times jsonb;

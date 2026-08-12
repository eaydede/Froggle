-- Back out per-word find-time capture (20260714000000_word_times.sql).
--
-- The results timeline it was feeding is shelved, so the columns have no
-- reader. Dropped rather than left dormant: a nullable column nothing writes
-- reads as a live feature to the next person who greps for it. `if exists`
-- keeps this a no-op on environments that never ran the add.
--
-- Re-landing the timeline means a fresh add migration, not an edit to this one.

alter table public.daily_results drop column if exists word_times;
alter table public.daily_zen_results drop column if exists word_times;
alter table public.free_play_sessions drop column if exists word_times;
alter table public.daily_gauntlet_results drop column if exists word_times;
alter table public.experimental_results drop column if exists word_times;

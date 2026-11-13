-- Per-word elapsed seconds keyed by word. Historical words deliberately have
-- no timestamp; the results screen falls back to their recorded find order.
alter table public.daily_results add column word_times jsonb;
alter table public.daily_zen_results add column word_times jsonb;
alter table public.daily_gauntlet_results add column word_times jsonb;
alter table public.daily_time_is_money_results add column word_times jsonb;
alter table public.free_play_sessions add column word_times jsonb;

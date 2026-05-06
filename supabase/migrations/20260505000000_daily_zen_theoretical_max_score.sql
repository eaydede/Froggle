-- Adds the per-board theoretical maximum score to zen sessions, so the rank
-- ladder (Scribe → Legend) can be derived from points/max on read without
-- re-running the solver. Backfilling existing rows is left for the read
-- path to handle: when null, the client falls back to no rank display, and
-- new sessions populate this on insert.

alter table public.daily_zen_results
  add column theoretical_max_score int;

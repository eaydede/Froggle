alter table public.daily_results
  add column board_size smallint,
  add column min_word_length smallint,
  add column time_limit smallint;

update public.daily_results
set board_size = 5, min_word_length = 4, time_limit = 120
where board_size is null;

alter table public.daily_results
  alter column board_size set not null,
  alter column min_word_length set not null,
  alter column time_limit set not null;

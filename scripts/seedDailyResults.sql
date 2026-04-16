-- Seeds the local daily_results table with ~40 fake players per day across
-- the last 7 days so the Rankings list on the leaderboard has enough rows
-- to test scroll behavior. Safe to re-run — clears fake rows (user_id in the
-- seed namespace) before re-inserting.
--
-- Usage:
--   docker exec -i supabase_db_Froggle psql -U postgres < scripts/seedDailyResults.sql
--
-- Fake rows are tagged with user_id prefix '00000000-' so real anonymous
-- user ids (which are random uuids) don't collide.

delete from public.daily_results
where user_id::text like '00000000-%';

with dates as (
  select (d::date)::text as date
  from generate_series(
    current_date - interval '6 days',
    current_date,
    interval '1 day'
  ) d
),
players as (
  select
    ('00000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid as user_id,
    i as n
  from generate_series(1, 40) i
)
insert into public.daily_results (
  user_id, date, found_words, board, points, word_count, longest_word
)
select
  p.user_id,
  d.date,
  -- Fake word list (just a placeholder — scoring uses the aggregate cols)
  '[]'::jsonb as found_words,
  '[["F","R","O","G","G"],["A","P","P","L","E"],["B","R","I","D","G"],["T","A","B","L","E"],["C","L","A","M","P"]]'::jsonb as board,
  -- Points: varied distribution, a few standouts on top
  greatest(5, 80 - (p.n * 2) + ((hashtext(p.user_id::text || d.date))::int % 20))::int as points,
  greatest(3, 25 - p.n / 2 + ((hashtext(p.user_id::text || d.date))::int % 5))::int as word_count,
  case p.n % 5
    when 0 then 'SERENDIPITY'
    when 1 then 'FORESTER'
    when 2 then 'RETREAT'
    when 3 then 'CLAMPED'
    else 'BRIDGE'
  end as longest_word
from dates d
cross join players p;

select date, count(*) as players
from public.daily_results
group by date
order by date desc;

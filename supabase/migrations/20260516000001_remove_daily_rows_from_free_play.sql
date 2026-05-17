-- Before the session-based timed daily landed, daily play went through
-- the in-memory GameController and /api/game/end ran recordIfFinishedOnce,
-- which wrote a free_play_sessions row for every finished game — including
-- dailies. That inflated the freePlayGames metric in the daily engagement
-- summary by counting the same play twice (once correctly under
-- timedDailyPlayers, once incorrectly under freePlayGames).
--
-- Daily play no longer touches /api/game/*, so no new junk rows will
-- accumulate. This migration cleans up the historical ones by deleting
-- free_play_sessions rows that match a daily_results row on
-- (user_id, date, board, config). The board is seeded uniquely per date,
-- so the only legitimate collision would be a player who deliberately
-- entered the daily's seed code in free play on the same day — vanishingly
-- rare, and the deleted row contains no irreplaceable data.

delete from public.free_play_sessions f
using public.daily_results d
where f.user_id is not null
  and f.user_id = d.user_id
  and f.date = d.date
  and f.board::text = d.board::text
  and f.board_size = d.board_size
  and f.min_word_length = d.min_word_length
  and f.time_limit = d.time_limit;

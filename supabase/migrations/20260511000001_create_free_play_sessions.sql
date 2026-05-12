-- Records every completed free-play game as a historical row, mirroring
-- the shape of daily_results so any future "play history" UI can query
-- both tables with the same projection.
--
-- Written once per game on finish (via /api/game/end or /api/game/results,
-- whichever the client hits first). Abandoned games — sessions that time
-- out without explicit completion — are intentionally not recorded.
--
-- user_id is nullable because free play is available to anonymous
-- visitors. `date` is the PST calendar date at completion time, written
-- at insert so aggregations don't need timezone math at read time.
-- `time_limit` of 0 means an unlimited (untimed) game.

create table public.free_play_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  date text not null,
  found_words jsonb not null default '[]'::jsonb,
  board jsonb not null,
  completed_at timestamptz not null default now(),
  points int not null default 0,
  word_count int not null default 0,
  longest_word text not null default '',
  time_limit int not null,
  board_size int not null,
  min_word_length int not null
);

create index idx_free_play_sessions_date on public.free_play_sessions(date);

-- Adds a challenge grouping handle to free-play sessions so players who
-- accept a shared link can be ranked against each other.
--
-- The challenge_id is the session id of the originator's row — the player
-- who created the share. When a player accepts a share link, their session
-- on completion is stamped with that same challenge_id. NULL means a game
-- that was never shared (the originator hasn't tapped "share" yet and
-- nobody else has joined).
--
-- A unique constraint on (user_id, challenge_id) enforces "one play per
-- user per challenge" at the DB level. NULL challenge_ids are not
-- constrained (Postgres treats NULL as distinct in uniqueness), so the
-- pre-share originator row coexists with future unshared rows just fine.

alter table public.free_play_sessions
  add column challenge_id uuid,
  -- The numeric board seed (0..MAX_SEED). Persisted so historic-game share
  -- links can regenerate the exact board for a new player. Nullable for
  -- backwards compatibility with rows written before this column existed.
  add column seed bigint,
  -- When the originator last opened the challenge view. Used to compute
  -- "new results since you last looked" for a notification badge on the
  -- history page. Only meaningful on rows where id == challenge_id (i.e.
  -- the originator's own session); other participants' rows leave this
  -- null and nothing reads it for them.
  add column last_viewed_at timestamptz;

create index idx_free_play_sessions_challenge
  on public.free_play_sessions(challenge_id)
  where challenge_id is not null;

create unique index uq_free_play_sessions_user_challenge
  on public.free_play_sessions(user_id, challenge_id)
  where challenge_id is not null and user_id is not null;

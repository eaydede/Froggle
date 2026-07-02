-- Broaden the experimental_votes sentiment check to include the neutral 'meh'
-- vote. The 2026-07-01 create migration was later edited to include it, but
-- that edit doesn't re-apply anywhere the original version already ran — this
-- follow-up brings the check constraint in line without needing to touch the
-- historical migration file.

alter table public.experimental_votes
  drop constraint if exists experimental_votes_sentiment_check;

alter table public.experimental_votes
  add constraint experimental_votes_sentiment_check
  check (sentiment in ('up', 'meh', 'down'));

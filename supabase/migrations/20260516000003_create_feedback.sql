-- Player feedback messages submitted from the landing page.
-- user_id is nullable so anonymous visitors can submit without an account;
-- when present it's the Supabase auth user id of the signed-in player.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  message text not null,
  created_at timestamptz not null default now(),
  constraint feedback_message_length check (
    char_length(message) between 1 and 2000
  )
);

create index idx_feedback_created_at on public.feedback(created_at desc);

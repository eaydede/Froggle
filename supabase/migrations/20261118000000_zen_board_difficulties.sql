-- Zen's rank percentages are unchanged. Store only its shared difficulty
-- assessment, independently of the player and the fixed maximum-score ladder.
create table public.zen_board_difficulties (
  board_key text primary key,
  assessment jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.zen_board_difficulties enable row level security;
revoke all on public.zen_board_difficulties from anon, authenticated;

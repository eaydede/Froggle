# Server

Express + Supabase workspace. Rules here extend the project root `CLAUDE.md`;
when they disagree inside `server/`, the server rule wins.

## Shared calculations

- Business calculations (scoring, aggregations, rank/rarity math, anything
  derived from domain data) live in `server/services/`. Route handlers call
  the service helper — they do not reimplement the reduction inline. If a
  handler needs a slightly different shape, extend the service with a named
  helper rather than copying the body. Inline arithmetic across endpoints
  invites silent drift when the rules change.

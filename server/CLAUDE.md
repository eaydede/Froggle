# Server

Express + Supabase workspace. Rules here extend the project root `CLAUDE.md`;
when they disagree inside `server/`, the server rule wins.

## Routes

- Route handlers live in `server/routes/<domain>.ts` and export an
  `express.Router`. `index.ts` is wiring only: app creation, middleware,
  router mounts, SPA fallback, listen. New endpoints do not go into
  `index.ts`. When two routers have overlapping URL prefixes (e.g.
  `/api/daily` and `/api/daily/leaderboard`), mount the more specific one
  first so the general router doesn't shadow it.
- Session state, background cleanup, and other server-wide runtime
  concerns live in dedicated modules (`server/session.ts` and peers),
  not in `index.ts`.

## Shared calculations

- Business calculations (scoring, aggregations, rank/rarity math, anything
  derived from domain data) live in `server/services/`. Route handlers call
  the service helper — they do not reimplement the reduction inline. If a
  handler needs a slightly different shape, extend the service with a named
  helper rather than copying the body. Inline arithmetic across endpoints
  invites silent drift when the rules change.

# Froggle

Word game. TypeScript monorepo (npm workspaces):
- `client/` — React + Vite + Tailwind v4, Storybook, Supabase client, Socket.io client
- `server/` — Express + Socket.io, Supabase (service role)
- `engine/` — pure game logic. No React, no Supabase, no Express.
- `models/` — shared types, imported by client and server
- `supabase/migrations/` — schema changes
- `scripts/` — operational scripts (backfills, seeds)

Deployed to Fly.io. `fly.toml` = prod, `fly.staging.toml` = staging.

## Commands

- `npm run dev` — client + server concurrently
- `npm run dev:client` / `npm run dev:server` — individually
- `npm run storybook --workspace=client` — component sandbox
- `npm run backfill:daily` — daily aggregate backfill

Verify with `tsc` in the relevant workspace before claiming work done. Never
claim UI work complete without starting the dev server and interacting with it.

## Coding principles

Apply to every change. When a principle conflicts with expedient code, the principle wins.

- **YAGNI.** Don't build for hypothetical requirements. No speculative abstractions, optional parameters without callers, config knobs without users, or "we might need this later" code. Write what the current task needs.
- **DRY, but not prematurely.** Extract a shared helper after a pattern appears 3+ times with the same shape. Two duplications is fine. A bad abstraction is worse than duplication because it couples unrelated code.
- **SOLID, compactly:**
  - *Single responsibility*: one reason to change per unit.
  - *Open/closed*: extend by adding, not modifying, when reasonable.
  - *Liskov*: subtypes behave like their base type.
  - *Interface segregation*: small, focused interfaces.
  - *Dependency inversion*: depend on abstractions, not concretions, at module seams.
- **Clarity of intent.** Code should read like the problem statement. Name things for what they mean, not what they do mechanically (`activeUsers`, not `filteredList`). If a block needs a comment to explain *what* it does, rename or restructure it. Reserve comments for *why*.

## Where code lives

- **Pages**: `client/src/pages/<route>/`. Components used by only one page live beside it. Promote to `client/src/shared/` only when a second page needs it.
- **Hooks**: `client/src/hooks/` if cross-page; otherwise beside the page that uses them.
- **Game logic**: `engine/`. Keep pure — no framework imports, no I/O.
- **Server**: controllers at `server/` root, business logic in `server/services/`, DB access in `server/db/`.
- **Shared types**: `models/`.

## Styling

- Tailwind v4 utility classes, applied directly on elements.
- Each component owns its own classes. No standalone CSS files except `client/src/tailwind.css`.
- No raw color, spacing, or timing values. Use theme tokens; if a needed value doesn't exist, extend the theme.

## Git

- Branch off `main` for every feature. If scope shifts mid-task, stop and branch again.
- Conventional commit prefixes: `feat(...)`, `fix(...)`, `chore(...)`, `refactor(...)`, following existing history.

## PR descriptions

Every PR description must include:
- **What** changed — one line
- **Why** this approach — the decision log for future readers
- **Follow-ups** — deferred work, known limitations

This is the paper trail. Do not add ADR files or "why" comments in code.

## Known gaps

- No test framework configured. Ask before adding one.
- No linter/formatter beyond TypeScript. Ask before adding ESLint/Prettier.

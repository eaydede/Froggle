# Server

Follow root `AGENTS.md` and `CLAUDE.md`. `app.ts` composes Express; `runtime.ts` owns HTTP/socket lifecycle and cleanup; `index.ts` starts the application.

Each feature owns its API, service and repository. APIs validate transport shape, receive auth context and map responses. Services enforce rules, timing, authorization and workflow. Repositories own SQL/Supabase access and row translation. Use the central `endpoint`/`ApplicationError`/`handleError` path for expected and unexpected failures. Shared scoring, dictionary and timing rules live in `gameplay`.

Preserve public URL and Socket.io contracts, persisted boards/configuration, competition ties and Pacific calendar semantics. Do not rewrite existing migrations or reset data. New tables require RLS in their migration. Use disposable PostgreSQL databases for lifecycle, ranking, authorization and integrity tests.

# Froggle

Read `AGENTS.md` for coding policy. It is the user-supplied guidance for this rebuild and takes precedence over older repository conventions.

The product specification is `docs/FEATURES.md`; responsibilities, compatibility decisions and verification are documented in `docs/REBUILD.md` and `docs/VERIFICATION.md`.

This is a TypeScript npm workspace application using React 18, Vite, Tailwind v4, Express, Socket.io, Kysely/PostgreSQL and Supabase anonymous auth. Preserve the stack and existing URLs, wire contracts, database migrations, seeds, scoring, local preference keys and visual experience.

Capabilities own their UI, state, transport and persistence. Client composition is in `client/src/app`, shared visual primitives in `ui`, browser mechanisms in `platform`, and shared board behavior in `gameplay`. Server APIs call feature services; services call feature repositories. Do not reintroduce a global game context, aggregate API module or layer-wide component/service buckets. Do not add abstractions without a concrete responsibility.

Use semantic tokens in the established theme. Preserve responsive layout, motion timing, sounds and interaction details. Render and inspect UI changes; TypeScript alone is insufficient.

Commands: `npm run dev`, `npm run check`, `npm test`, `npm run test:integration`, `npm run test:browser`, `npm run build --workspace=client`, `npm run build-storybook --workspace=client`. Database/browser integration checks use disposable PostgreSQL containers and require Docker. Never run test writes against the configured production database.

Do not create commits, change branches, publish or deploy without authorization. Screenshots and local comparison artifacts belong under `.context/`.

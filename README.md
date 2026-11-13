# Froggle

A mobile-first word-finding game: trace adjacent letters, discover words, compare boards with friends, and build a daily habit.

The app includes Timed Daily, untimed Zen, the three-round Gauntlet, Time is Money, configurable solo/live Free Play, shared challenges, history, leaderboards, definitions and word-path review. Read the complete [feature and experience specification](docs/FEATURES.md).

The stack remains TypeScript, React 18, Vite, Tailwind v4, Express, Socket.io, Kysely/PostgreSQL and Supabase anonymous auth. Capabilities own their UI, state, API and persistence. See [architecture and decisions](docs/REBUILD.md), [verification evidence](docs/VERIFICATION.md), and the coding policy in [AGENTS.md](AGENTS.md).

## Run locally

Use the existing `.env`, or copy `.env.example` and configure Supabase auth, the client publishable key, the server secret key and PostgreSQL. Install with `npm ci`, then run `npm run dev`. The API starts on port 3000 (or `PORT` from your environment) and retries higher ports until one is available. Vite starts afterward and proxies API and Socket.io requests to that selected port. Its own port starts at 5173 and also advances if occupied. Server changes restart both processes; Ctrl+C stops both.

## Verify

| Command | Scope |
| --- | --- |
| `npm run check` | Dependency boundaries and TypeScript for every workspace and browser-test code |
| `npm test` | Pure rules, utilities, timing and regression tests |
| `npm run test:integration` | Real PostgreSQL lifecycle, ranking and concurrent-submission tests |
| `npm run test:browser` | Real browser journeys, API privacy, signed auth and Socket.io against isolated local infrastructure |
| `npm run build --workspace=client` | Production client build |
| `npm run build-storybook --workspace=client` | Component sandbox build |
| `npm run verify:visual` | Compare running original/rebuilt apps with deterministic scenes |

Integration/browser tests require Docker. Browser tests additionally require `npx playwright install chromium`. They start a disposable PostgreSQL database and a local auth/API/Vite runtime; they do not use the application's configured production database. The test harness requires a current Node version compatible with testcontainers (Node 22+ is suitable).

Pull requests to `main` run TypeScript/boundary checks, unit tests, PostgreSQL tests, browser/API scenarios and both builds through `.github/workflows/verify.yml`, without production credentials. Staging still deploys on pushes to `main`; production deployment remains manually triggered.

Visual comparison defaults to `REFERENCE_URL=http://localhost:5180` and `CANDIDATE_URL=http://localhost:5174`; set those environment variables for different running apps. Screenshots, differences and the JSON report are written under `.context/visual/`. See the verification document for reference-server setup and how to interpret exact versus perceptual comparison.

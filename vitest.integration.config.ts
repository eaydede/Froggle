import { defineConfig } from 'vitest/config';

// Docker-backed integration tests (`*.dbtest.ts`): each spins up an ephemeral
// Postgres via testcontainers and exercises the real service code against the
// real migration chain. Kept out of the default `npm test` so the deploy gate
// stays fast and Docker-free.
//
// Requirements: a running Docker daemon and Node >= 21 (testcontainers' HTTP
// wait strategy crashes on import under Node 20). Individual suites also
// self-skip via dockerAvailable() when no daemon is present, so this command
// is safe to run anywhere — it just covers nothing without Docker.
export default defineConfig({
  test: {
    include: ['server/**/*.dbtest.ts'],
  },
});

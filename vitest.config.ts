import { defineConfig } from 'vitest/config';

// Default suite: fast, pure tests that gate CI and the deploy. No Docker, no
// network. Heavier Docker-backed integration tests are named `*.dbtest.ts` and
// run separately via `npm run test:integration` (vitest.integration.config.ts);
// they are excluded here so the deploy gate never imports testcontainers —
// that import requires Node >= 21 and a running Docker daemon, neither of which
// the staging runner (Node 20, no guaranteed Docker) provides.
export default defineConfig({
  test: {
    include: [
      'engine/**/*.test.ts',
      'client/src/**/*.test.{ts,tsx}',
      'server/**/*.test.ts',
      'models/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/*.dbtest.ts'],
  },
});

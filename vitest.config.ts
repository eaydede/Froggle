import { defineConfig } from 'vitest/config';

// Single root config so the whole monorepo runs through `npm test`. Tests
// live colocated with source as `*.test.ts` / `*.test.tsx`. Add `node`
// vs `jsdom` environments later when there's a reason — every current test
// is pure logic and runs fine in the default node env.
export default defineConfig({
  test: {
    include: [
      'engine/**/*.test.ts',
      'client/src/**/*.test.{ts,tsx}',
      'server/**/*.test.ts',
      'models/**/*.test.ts',
    ],
  },
});

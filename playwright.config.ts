import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.ts',
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  outputDir: '.context/browser-test-results',
  reporter: [['list'], ['html', { outputFolder: '.context/browser-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:54352',
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node_modules/.bin/tsx tests/browser/server.mts',
    url: 'http://127.0.0.1:54352',
    timeout: 180_000,
    reuseExistingServer: false,
  },
});

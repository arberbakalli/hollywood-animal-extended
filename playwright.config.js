import { defineConfig, devices } from '@playwright/test';
import { createRequire } from 'node:module';

// achilles is an upstream tool we consume, not one we release, and it is wired
// in as file:../achilles. A clone without that sibling checkout still installs
// green -- npm symlinks a file: path without checking it exists -- and would
// then crash here on a module that is not there. Treat the reporter as optional
// so the suite runs anywhere; it is richer output, not a requirement.
const optionalReporters = (() => {
  try {
    createRequire(import.meta.url).resolve('@civitas-cerebrum/achilles/reporter');
    return [['@civitas-cerebrum/achilles/reporter']];
  } catch {
    return [];
  }
})();

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  fullyParallel: true,
  // Measured on the Node static server: 1 worker 103s, 4 workers 58s, 8 workers
  // 55s. The gain flattens after 4, so the suite is CPU-bound from there rather
  // than server-bound. (Under python -m http.server this had to be 1.)
  workers: 4,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }], ...optionalReporters],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node tools/static-server.mjs 4173 .',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});

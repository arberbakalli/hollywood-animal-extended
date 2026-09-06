import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  fullyParallel: true,
  // python -m http.server cannot keep up with parallel workers each pulling
  // ~24 script files per page load; swap in a real static server to raise this.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    // HTTP/1.1 for keep-alive: the page pulls ~24 scripts, and the default
    // HTTP/1.0 closes the connection after each one.
    command: 'python -m http.server 4173 --bind 127.0.0.1 --protocol HTTP/1.1',
    url: 'http://127.0.0.1:4173/index.html',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});

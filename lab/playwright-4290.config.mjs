import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import base from '../playwright.config.js';

export default defineConfig({ ...base,
    testDir: '../tests/e2e',
    outputDir: '../output/playwright/lab-4290-results',
    reporter: [['list']],
    use: { ...base.use, baseURL: 'http://127.0.0.1:4290' },
    webServer: {
        command: `"${process.execPath}" tools/static-server.mjs 4290 .`,
        url: 'http://127.0.0.1:4290/index.html',
        cwd: fileURLToPath(new URL('../', import.meta.url)),
        reuseExistingServer: true,
        timeout: 60000
    }
});

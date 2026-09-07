import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import http from 'node:http';

const require = createRequire(import.meta.url);
const port = Number(process.env.HOLLYWOOD_TEST_PORT ?? 4173);
const baseURL = process.env.PLAYWRIGHT_TEST_BASE_URL ?? `http://127.0.0.1:${port}`;
const args = process.argv.slice(2);

const isLocalBase = (url) => {
  const host = new URL(url).hostname;
  return host === '127.0.0.1' || host === 'localhost';
};

const reachable = () => new Promise((resolve) => {
  const req = http.get(`${baseURL}/index.html`, (res) => {
    res.resume();
    resolve(res.statusCode && res.statusCode < 500);
  });
  req.on('error', () => resolve(false));
  req.setTimeout(1000, () => {
    req.destroy();
    resolve(false);
  });
});

const waitForServer = async () => {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (await reachable()) return;
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${baseURL}/index.html`);
};

let server;

try {
  if (isLocalBase(baseURL) && !(await reachable())) {
    server = spawn(process.execPath, ['tools/static-server.mjs', String(port), '.'], {
      stdio: ['ignore', 'ignore', 'inherit'],
      windowsHide: true,
    });
    await waitForServer();
  }

  const mutateBin = require.resolve('@civitas-cerebrum/achilles/bin/mutate.mjs');
  const result = spawnSync(process.execPath, [mutateBin, ...args], {
    stdio: 'inherit',
    env: { ...process.env, PLAYWRIGHT_TEST_BASE_URL: baseURL },
  });

  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  if (server) server.kill();
}

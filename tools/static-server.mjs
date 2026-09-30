// Static file server for the test suite and local preview.
//
// Replaces `python -m http.server`, which made Python an undeclared dependency of
// a JavaScript project — a standard Node CI image does not have it, and the
// HTTP/1.1 flag it needed only exists from Python 3.11.
//
//   node tools/static-server.mjs [port] [root]
//
// Node's http server speaks HTTP/1.1 with keep-alive by default, which matters
// here: index.html pulls ~24 scripts, and a connection per file was the previous
// bottleneck.

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';

const port = Number(process.argv[2] ?? 4173);
const root = resolve(process.argv[3] ?? '.');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(body);
};

const server = createServer(async (req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    send(res, 400, 'Bad request');
    return;
  }

  // Resolve against the root and confirm the result is still inside it, so a
  // crafted ../ cannot read files outside the served directory.
  const requested = resolve(root, `.${normalize(pathname)}`);
  if (requested !== root && !requested.startsWith(root + sep)) {
    send(res, 403, 'Forbidden');
    return;
  }

  // The app needs no dotfile, and the served root is a git repository.
  if (pathname.split('/').some(segment => segment.startsWith('.') && segment.length > 1)) {
    send(res, 403, 'Forbidden');
    return;
  }

  let file = requested;
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const info = await stat(file);

    res.writeHead(200, {
      'content-type': CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'content-length': info.size,
      // Tests must never read a previous run's copy of a file being edited.
      'cache-control': 'no-store',
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    createReadStream(file).pipe(res);
  } catch {
    send(res, 404, 'Not found');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}`);
});

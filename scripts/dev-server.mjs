// Local preview server: serves the static site and runs /api/contact like Vercel would.
// Usage: node scripts/dev-server.mjs   (optional: PORT=4000, RESEND_API_KEY=... to test real sending)
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const contact = require(path.join(root, 'api', 'contact.js'));
const port = Number(process.env.PORT || 3000);

const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === '/api/contact') return contact(req, res);

  let file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
  if (!file.startsWith(root) || file.includes(`${path.sep}api${path.sep}`) || file.includes(`${path.sep}scripts${path.sep}`)) {
    res.writeHead(403).end('Forbidden'); return;
  }
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(body);
  } catch {
    const body = await readFile(path.join(root, '404.html'));
    res.writeHead(404, { 'Content-Type': types['.html'] }).end(body);
  }
}).listen(port, () => console.log(`Portfolio running at http://localhost:${port}`));

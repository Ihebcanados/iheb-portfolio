// Point canonical, Open Graph and sitemap URLs at your real domain.
// Usage: node scripts/set-site-url.mjs https://your-domain.com
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https?:\/\/[^/]+$/.test(site)) {
  console.error('Give the site origin, for example: node scripts/set-site-url.mjs https://ihebichi.com');
  process.exit(1);
}

const pages = [['index.html', '/'], ['projects/sawarny/index.html', '/projects/sawarny/']];
for (const [file, route] of pages) {
  const p = path.join(root, file);
  let html = await readFile(p, 'utf8');
  html = html
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${site}${route}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${site}${route}$2`)
    .replace(/(<meta (?:property="og:image"|name="twitter:image") content=")(?:https?:\/\/[^/"]+)?(\/[^"]*")/g, `$1${site}$2`);
  await writeFile(p, html);
}

const today = new Date().toISOString().slice(0, 10);
const urls = pages.map(([, r]) => `  <url><loc>${site}${r}</loc><lastmod>${today}</lastmod></url>`).join('\n');
await writeFile(path.join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
const robots = `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`;
await writeFile(path.join(root, 'robots.txt'), robots);
console.log(`Updated canonical/OG URLs, sitemap.xml and robots.txt for ${site}`);

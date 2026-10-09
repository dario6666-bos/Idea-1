import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
export const { chromium } = require('playwright');

const root = process.env.SITE_ROOT ? path.resolve(process.env.SITE_ROOT) : path.resolve(import.meta.dirname, '..');
// Set BASE_PATH=/Idea-1/ to mimic GitHub Pages project sites.
const base = process.env.BASE_PATH || '/';
const types = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.woff2': 'font/woff2',
};

export function startServer() {
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    if (!rel.startsWith(base)) { res.writeHead(404).end(); return; }
    const sub = rel.slice(base.length);
    const p = path.join(root, sub === '' ? 'index.html' : sub);
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }).end(fs.readFileSync(p));
  }).listen(0);
  return { server, url: `http://localhost:${server.address().port}${base}` };
}

export function launch() {
  return chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
}

export const iso = (offset = 0) => {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function makeChecker() {
  let failures = 0;
  return {
    check(name, ok, extra = '') { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name} ${extra}`); if (!ok) failures++; },
    done() { console.log(failures ? `\n${failures} FAILED` : '\nAll passed'); return failures ? 1 : 0; },
  };
}

export async function addApp(page, company, role, date) {
  await page.fill('#company', company);
  await page.fill('#role', role);
  await page.fill('#dateApplied', date);
  await page.click('#add-form button[type=submit]');
}

export function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => { if (r.status() >= 400 && !r.url().endsWith('/favicon.ico')) errors.push(`${r.status()} ${r.url()}`); });
  page.on('console', (m) => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errors.push(m.text()); });
  return errors;
}

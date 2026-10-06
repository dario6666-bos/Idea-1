// Copies the site into dist/ and stamps the service worker with a build id,
// so every release gets a fresh offline cache. No dependencies.
//   node tools/build.mjs
// Optional environment variables:
//   SITE_URL   public address of the site (rewrites canonical / share-image URLs)
//   BUILD_ID   cache id; defaults to the commit id, or the current time
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const DEFAULT_SITE_URL = 'https://dario6666-bos.github.io/Idea-1/';

const FILES = ['index.html', 'styles.css', 'manifest.webmanifest', 'favicon.svg', 'sw.js'];
const DIRS = ['js', 'fonts', 'icons'];

function buildId() {
  const fromEnv = process.env.BUILD_ID || process.env.GITHUB_SHA || process.env.CF_PAGES_COMMIT_SHA;
  if (fromEnv) return fromEnv.slice(0, 12);
  try {
    return execSync('git rev-parse --short=12 HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return Date.now().toString(36);
  }
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);
for (const f of FILES) fs.copyFileSync(path.join(root, f), path.join(dist, f));
for (const d of DIRS) fs.cpSync(path.join(root, d), path.join(dist, d), { recursive: true });

const id = buildId().replace(/[^a-zA-Z0-9_-]/g, '');
const swPath = path.join(dist, 'sw.js');
const sw = fs.readFileSync(swPath, 'utf8');
if (!sw.includes('__BUILD__')) throw new Error('sw.js has no __BUILD__ placeholder');
fs.writeFileSync(swPath, sw.replaceAll('__BUILD__', id));

let siteUrl = process.env.SITE_URL;
if (siteUrl) {
  if (!/^https:\/\//.test(siteUrl)) throw new Error('SITE_URL must start with https://');
  if (!siteUrl.endsWith('/')) siteUrl += '/';
  const htmlPath = path.join(dist, 'index.html');
  fs.writeFileSync(htmlPath, fs.readFileSync(htmlPath, 'utf8').replaceAll(DEFAULT_SITE_URL, siteUrl));
}

console.log(`Built dist/ (cache id: ghosted-${id}${siteUrl ? `, site: ${siteUrl}` : ''})`);

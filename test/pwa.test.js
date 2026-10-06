import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('every file in the service worker precache list exists', () => {
  const list = read('sw.js').match(/const ASSETS = \[([\s\S]*?)\];/)[1];
  const files = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((f) => f !== './');
  assert.ok(files.length > 10);
  for (const f of files) assert.ok(fs.existsSync(path.join(root, f)), `missing: ${f}`);
});

test('every JS module and the page assets are precached', () => {
  const sw = read('sw.js');
  for (const f of fs.readdirSync(path.join(root, 'js'))) assert.ok(sw.includes(`'js/${f}'`), `not precached: js/${f}`);
  for (const f of ['index.html', 'styles.css', 'manifest.webmanifest']) assert.ok(sw.includes(`'${f}'`), f);
});

test('manifest is valid and its icons exist', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  for (const key of ['name', 'short_name', 'start_url', 'display', 'icons', 'theme_color', 'background_color']) assert.ok(m[key], key);
  assert.equal(m.display, 'standalone');
  assert.ok(!m.start_url.startsWith('/'), 'start_url must be relative so it works under a repo sub-path');
  assert.ok(m.icons.some((i) => i.sizes === '192x192') && m.icons.some((i) => i.sizes === '512x512'));
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(root, i.src)), i.src);
});

test('page has share and PWA metadata', () => {
  const html = read('index.html');
  for (const needle of [
    '<title>', 'name="description"', 'rel="manifest"', 'rel="apple-touch-icon"', 'og:title', 'og:description',
    'og:image"', 'og:url', 'twitter:card" content="summary_large_image"', 'name="viewport"', 'lang="en"',
  ]) assert.ok(html.includes(needle), needle);
  assert.equal((html.match(/<h1[ >]/g) || []).length, 1, 'exactly one h1');
  // Every local file the page references exists.
  for (const m of html.matchAll(/(?:href|src)="((?!https?:|#|mailto:)[^"]+)"/g)) {
    assert.ok(fs.existsSync(path.join(root, m[1])), `referenced but missing: ${m[1]}`);
  }
});

test('no third-party requests anywhere in the app code', () => {
  for (const f of ['index.html', 'styles.css', 'sw.js', ...fs.readdirSync(path.join(root, 'js')).map((x) => `js/${x}`)]) {
    const text = read(f).replace(/https:\/\/dario6666-bos\.github\.io\/Idea-1\/[^"']*/g, '');
    const urls = [...text.matchAll(/https?:\/\/[^\s"')]+/g)].map((m) => m[0]);
    assert.deepEqual(urls, [], `${f} references external URLs`);
  }
});

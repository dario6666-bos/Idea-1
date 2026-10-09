// Landing, PWA and offline tests. Run: NODE_PATH=$(npm root -g) node e2e/step5.mjs
import { startServer, launch, iso, makeChecker, addApp, trackErrors } from './helpers.mjs';

const { server, url } = startServer();
const { check, done } = makeChecker();
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
const page = await ctx.newPage();
const errors = trackErrors(page);

await page.goto(url);
check('exactly one h1', await page.locator('h1').count() === 1);
check('landing visible on first visit', await page.locator('#landing').isVisible());
check('intro toggle hidden with no data', !(await page.locator('#toggle-intro').isVisible()));
check('landing explains the problem', /lose track of who you contacted/.test(await page.textContent('#landing')));

// CTA moves focus to the form
await page.click('#hero-cta');
check('CTA focuses the Company field', await page.evaluate(() => document.activeElement.id) === 'company');

// Landing steps aside once there is data; can be shown again
await addApp(page, 'Acme', 'Designer', iso(0));
check('landing hidden once data exists', !(await page.locator('#landing').isVisible()));
check('toggle now visible and offers the intro', (await page.textContent('#toggle-intro')) === 'What is Ghosted?');
await page.click('#toggle-intro');
check('intro can be shown again', await page.locator('#landing').isVisible() && (await page.getAttribute('#toggle-intro', 'aria-expanded')) === 'true');
await page.click('#toggle-intro');
check('and hidden again', !(await page.locator('#landing').isVisible()));

// Manifest + icons reachable
const manifestRes = await page.request.get(url + 'manifest.webmanifest');
const manifest = await manifestRes.json();
check('manifest served', manifestRes.ok() && manifest.short_name === 'Ghosted');
for (const icon of manifest.icons) check(`icon reachable: ${icon.src}`, (await page.request.get(url + icon.src)).ok());
check('share image reachable', (await page.request.get(url + 'icons/og-image.png')).ok());
const meta = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('meta[property^="og:"],meta[name^="twitter:"]')].map((m) => [m.getAttribute('property') || m.getAttribute('name'), m.content])));
check('og/twitter tags present', ['og:title', 'og:description', 'og:image', 'twitter:card'].every((k) => meta[k]));

// Service worker + offline
await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));
await page.reload(); // now controlled by the SW
check('service worker controls the page', await page.evaluate(() => !!navigator.serviceWorker.controller));
const cached = await page.evaluate(async () => (await (await caches.open((await caches.keys())[0])).keys()).length);
check('precache populated', cached >= 20, `(${cached} files)`);

await ctx.setOffline(true);
await page.reload();
check('offline: page loads', await page.locator('h1').textContent() === 'Ghosted');
check('offline: saved data is there', await page.locator('.card', { hasText: 'Acme' }).count() === 1);
await addApp(page, 'Offline Co', 'Tester', iso(0));
check('offline: can add an application', await page.locator('.card', { hasText: 'Offline Co' }).count() === 1);
await page.click('#tab-progress');
check('offline: progress tab works', /Level 1 \S+ 20 points|20 points/.test(await page.textContent('#lvl-text')));
await page.reload();
await page.waitForSelector('.card');
check('offline: data survives reload', await page.locator('.card').count() === 2);
// fonts came from cache
const fonts = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].map((f) => `${f.family}:${f.status}`); });
check('offline: self-hosted fonts loaded', fonts.includes('Inter:loaded') && fonts.includes('Source Serif 4:loaded'), fonts.join(','));
await ctx.setOffline(false);

check('no console/page errors', errors.length === 0, errors.join(' | '));

// Landing screenshots
const fresh = await browser.newContext({ viewport: { width: 375, height: 800 } });
const p2 = await fresh.newPage(); await p2.goto(url);
await p2.screenshot({ path: process.env.SHOT || '/tmp/step5.png', fullPage: true });
const wide = await browser.newContext({ viewport: { width: 1100, height: 800 } });
const p3 = await wide.newPage(); await p3.goto(url);
check('no horizontal scroll on desktop width', await p3.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
await p3.screenshot({ path: (process.env.SHOT || '/tmp/step5.png').replace('.png', '-wide.png') });

await browser.close(); server.close();
process.exit(done());

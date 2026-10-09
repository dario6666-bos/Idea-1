// Regenerates PNG icons and the share image from the SVG sources.
// Needs Playwright (global install) and Chromium:
//   NODE_PATH=$(npm root -g) node tools/make-assets.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(import.meta.dirname, '..');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();

async function renderSvg(file, size, out, transparent = false) {
  await page.setViewportSize({ width: size, height: size });
  await page.goto(pathToFileURL(path.join(root, file)).href); // the SVG scales to the viewport
  await page.screenshot({ path: path.join(root, out), omitBackground: transparent });
  console.log('wrote', out);
}
await renderSvg('icons/icon.svg', 192, 'icons/icon-192.png', true);
await renderSvg('icons/icon.svg', 512, 'icons/icon-512.png', true);
await renderSvg('icons/icon.svg', 180, 'icons/apple-touch-icon.png');
await renderSvg('icons/maskable.svg', 512, 'icons/maskable-512.png');

await page.setViewportSize({ width: 1200, height: 630 });
await page.goto(pathToFileURL(path.join(root, 'tools/og-template.html')).href);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.join(root, 'icons/og-image.png') });
console.log('wrote icons/og-image.png');
await browser.close();

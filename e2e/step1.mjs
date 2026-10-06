// End-to-end smoke test. Needs Playwright (global install) and Chromium.
// Run: NODE_PATH=$(npm root -g) node e2e/step1.mjs
import { startServer, launch, iso, makeChecker, trackErrors } from './helpers.mjs';

const { server, url } = startServer();
const { check, done } = makeChecker();

const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } });
const page = await ctx.newPage();
const errors = trackErrors(page);

await page.goto(url);
check('empty state shown', await page.locator('#empty').isVisible());

// Validation
await page.click('button[type=submit]');
check('validation error shown for company', await page.locator('#company-error').isVisible());
check('focus moves to first invalid field', await page.evaluate(() => document.activeElement.id) === 'company');

// Add two applications: one fresh, one 10 days old
async function add(company, role, date) {
  await page.fill('#company', company);
  await page.fill('#role', role);
  await page.fill('#dateApplied', date);
  await page.click('button[type=submit]');
}
await add('Fresh Co', 'Designer', iso(0));
await add('Old Co', 'Engineer', iso(-10));
check('two cards rendered', await page.locator('.card').count() === 2);
check('Follow-up due shown only on 10-day-old card', await page.locator('.pill').count() === 1 &&
  (await page.locator('.card', { hasText: 'Old Co' }).locator('.pill').count()) === 1);
check('due card sorted first', (await page.locator('.card h3').first().textContent()) === 'Old Co');

// Future date rejected
await add('Future', 'X', iso(2));
check('future date rejected', await page.locator('#dateApplied-error').isVisible());
await page.fill('#dateApplied', iso(0));

// Reload persistence
await page.reload();
check('data survives reload', await page.locator('.card').count() === 2);

// Status change closes the card and clears the pill
await page.locator('.card', { hasText: 'Old Co' }).locator('select').selectOption('Rejected');
check('rejected card has no follow-up pill', await page.locator('.pill').count() === 0);
await page.reload();
check('status survives reload', (await page.locator('.card', { hasText: 'Old Co' }).locator('select').inputValue()) === 'Rejected');

// Filter
await page.click('.chip:has-text("Rejected")');
check('filter shows 1 rejected', await page.locator('.card').count() === 1);
await page.click('.chip:has-text("All")');

// Remove + undo
await page.locator('.card', { hasText: 'Fresh Co' }).getByRole('button', { name: /Remove/ }).click();
check('remove works', await page.locator('.card').count() === 1);
await page.click('#toast button');
check('undo restores', await page.locator('.card').count() === 2);

// XSS safety
await add('<img src=x onerror=window.__x=1>', 'Role', iso(0));
check('HTML in names is not executed', await page.evaluate(() => window.__x) === undefined);

// Corrupt storage recovery
await page.evaluate(() => localStorage.setItem('ghosted:v1', '{broken'));
await page.reload();
check('corrupt data: notice shown, app still works', await page.locator('#storage-notice').isVisible() && await page.locator('#add-form').isVisible());
check('corrupt data kept aside', await page.evaluate(() => localStorage.getItem('ghosted:v1:corrupt')) === '{broken');

// Horizontal overflow at 375px
check('no horizontal scroll at 375px', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));

// Dark scheme renders
await page.emulateMedia({ colorScheme: 'dark' });
const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
check('dark mode background applied', bg === 'rgb(17, 23, 22)', bg);

check('no console/page errors', errors.length === 0, errors.join(' | '));
await page.waitForTimeout(400);
await page.screenshot({ path: process.env.SHOT || '/tmp/step1-dark.png', fullPage: true });

await browser.close();
server.close();
process.exit(done());

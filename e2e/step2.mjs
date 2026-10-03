// Follow-up dialog test. Run: NODE_PATH=$(npm root -g) node e2e/step2.mjs
import { startServer, launch, iso, makeChecker, addApp, trackErrors } from './helpers.mjs';

const { server, url } = startServer();
const { check, done } = makeChecker();
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 375, height: 800 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await ctx.newPage();
const errors = trackErrors(page);

await page.goto(url);
await addApp(page, 'Old Co', 'Engineer', iso(-10));
await addApp(page, 'New Co', 'Designer', iso(0));

const card = (name) => page.locator('.card', { hasText: name });
check('follow-up button on open cards', await page.getByRole('button', { name: /Follow up with/ }).count() === 2);
check('due card button is primary', await card('Old Co').locator('.btn-primary').count() === 1);

// Open dialog from keyboard
await card('Old Co').getByRole('button', { name: 'Follow up with Old Co' }).focus();
await page.keyboard.press('Enter');
const dlg = page.locator('#followup-dialog');
check('dialog opens', await dlg.isVisible());
check('dialog has accessible name', (await dlg.getAttribute('aria-labelledby')) === 'fu-title');
check('3 templates offered', await page.locator('input[name=fu-template]').count() === 3);
check('default template is friendly', await page.locator('#tpl-friendly').isChecked());
let msg = await page.inputValue('#fu-message');
check('message has company, role and subject', /Subject: Following up on my Engineer application/.test(msg) && msg.includes('Old Co'));
check('no raw placeholders', !/\{(company|role|date|name)\}/.test(msg));
check('name placeholder when empty', msg.includes('[Your name]'));

// Name updates sign-off
await page.fill('#fu-name', 'Sam Lee');
msg = await page.inputValue('#fu-message');
check('name filled into message', msg.trim().endsWith('Sam Lee'));

// Template switch via keyboard (radio arrows)
await page.locator('#tpl-friendly').focus();
await page.keyboard.press('ArrowDown');
check('arrow key switches template', await page.locator('#tpl-direct').isChecked());
msg = await page.inputValue('#fu-message');
check('message changed to short template', /quick follow-up/.test(msg) && msg.includes('Sam Lee'));

// Manual edits survive typing the name
await page.fill('#fu-message', msg + '\nP.S. Thanks!');
await page.fill('#fu-name', 'Sam L.');
check('hand edits are not overwritten', (await page.inputValue('#fu-message')).includes('P.S. Thanks!'));

// Copy
await page.click('#fu-copy');
const clip = await page.evaluate(() => navigator.clipboard.readText());
check('Copy puts message on clipboard', clip === await page.inputValue('#fu-message') && clip.includes('P.S. Thanks!'));
check('copy confirmation shown', /Copied/.test(await page.textContent('#fu-status')));

// Esc closes without marking sent
await page.keyboard.press('Escape');
check('Esc closes dialog', !(await dlg.isVisible()));
check('focus returns to the Follow up button', await page.evaluate(() => document.activeElement.id.startsWith('fu-')));
check('Esc did not mark as sent', await card('Old Co').locator('.pill').count() === 1);

// Tab stays inside the modal
await card('Old Co').getByRole('button', { name: 'Follow up with Old Co' }).click();
const inside = [];
for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); inside.push(await page.evaluate(() => { const a = document.activeElement; return a === document.body || !!a.closest('dialog'); })); }
// Native modal: Tab may pass through browser UI (body) but never reaches the page behind.
check('page behind the dialog is unreachable by Tab', inside.every(Boolean));

// Mark as sent
await page.click('#fu-sent');
check('dialog closed after Mark as sent', !(await dlg.isVisible()));
check('Follow-up due pill cleared', await card('Old Co').locator('.pill').count() === 0);
check('confirmation toast is encouraging', /Well done/.test(await page.textContent('#toast')));

await page.reload();
check('sent state survives reload (no pill)', await card('Old Co').locator('.pill').count() === 0);
const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ghosted:v1')));
const old = saved.apps.find((a) => a.company === 'Old Co');
check('lastFollowUp = today, followUps = 1', old.lastFollowUp === iso(0) && old.followUps === 1);
check('name saved on device', saved.settings.name === 'Sam L.');

// Reopen: name pre-filled; Interview card suggests thank-you
await card('New Co').locator('select').selectOption('Interview');
await card('New Co').getByRole('button', { name: /Follow up with/ }).click();
check('name remembered', (await page.inputValue('#fu-name')) === 'Sam L.');
check('interview card suggests thank-you template', await page.locator('#tpl-thanks').isChecked());
await page.click('#fu-close');

// Closed cards have no follow up button
await card('New Co').locator('select').selectOption('Offer');
check('closed card has no Follow up button', await card('New Co').getByRole('button', { name: /Follow up/ }).count() === 0);

check('no horizontal scroll at 375px', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));

// Dialog screenshot (light + dark)
await card('Old Co').getByRole('button', { name: /Follow up/ }).click();
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.screenshot({ path: process.env.SHOT || '/tmp/step2-dialog.png' });

check('no console/page errors', errors.length === 0, errors.join(' | '));
await browser.close(); server.close();
process.exit(done());

// Progress tests. Run: NODE_PATH=$(npm root -g) node e2e/step3.mjs
import { startServer, launch, iso, makeChecker, addApp, trackErrors } from './helpers.mjs';

const { server, url } = startServer();
const { check, done } = makeChecker();
const browser = await launch();
const ctx = await browser.newContext({ viewport: { width: 375, height: 800 }, permissions: ['clipboard-read', 'clipboard-write'] });
const page = await ctx.newPage();
const errors = trackErrors(page);
const text = (sel) => page.textContent(sel).then((t) => t.replace(/\s+/g, ' ').trim());
const toast = () => text('#toast');
const card = (name) => page.locator('.card', { hasText: name });

await page.goto(url);
check('summary starts at level 1, 0 points', /Level 1 · 0 points · 0 of 5 this week/.test(await text('#strip-text')), await text('#strip-text'));

// Tab semantics
check('Applications tab selected by default', (await page.getAttribute('#tab-apps', 'aria-selected')) === 'true');
await page.locator('#tab-apps').focus();
await page.keyboard.press('ArrowRight');
check('ArrowRight moves to Progress tab', (await page.getAttribute('#tab-progress', 'aria-selected')) === 'true' && await page.locator('#panel-progress').isVisible());
check('apps panel hidden', !(await page.locator('#panel-apps').isVisible()));
check('tip locked at start', /Complete 3 more actions to unlock/.test(await text('#tip-text')));
check('streak copy is welcoming at start', /Any action starts a streak/.test(await text('#streak-text')));
check('0 badges earned at start', /0 of 12 earned/.test(await text('#badges-summary')));
await page.keyboard.press('ArrowLeft');
check('ArrowLeft returns to Applications', await page.locator('#panel-apps').isVisible());

// Add -> +10
await addApp(page, 'Acme', 'Designer', iso(-9));
check('adding shows +10 points toast', /\+10 points/.test(await toast()), await toast());
check('summary updates to 10 points', /10 points/.test(await text('#strip-text')));
await addApp(page, 'Beta', 'Writer', iso(0));
await addApp(page, 'Gamma', 'Analyst', iso(-1));
check('30 points after 3 adds', /30 points/.test(await text('#strip-text')));

await page.click('#tab-progress');
check('tip unlocked after 3 actions', !/Complete/.test(await text('#tip-text')) && (await text('#tip-text')).length > 20, await text('#tip-text'));
check('first-application badge earned', await page.locator('.badge[data-earned="true"]', { hasText: 'First step' }).count() === 1);
check('streak shows 1 day', /^1 day$/.test(await text('#streak-num')), await text('#streak-num'));
await page.click('#tab-apps');

// Statuses: +50, once only
await card('Acme').locator('select').selectOption('Interview');
check('interview +50 toast', /\+50 points/.test(await toast()), await toast());
await card('Acme').locator('select').selectOption('Applied');
await card('Acme').locator('select').selectOption('Interview');
check('toggling back and forth gives no extra points', !/\+50/.test(await toast()) && /80 points/.test(await text('#strip-text')), await text('#strip-text'));

// Offer +200 -> level 3 (280)
await card('Beta').locator('select').selectOption('Offer');
check('offer +200 and level-up message', /\+200 points/.test(await toast()) && /Level 3 reached/.test(await toast()), await toast());
check('summary shows level 3', /Level 3 · 280 points/.test(await text('#strip-text')), await text('#strip-text'));

// Rejection +5
await card('Gamma').locator('select').selectOption('Rejected');
check('rejection +5', /\+5 points/.test(await toast()), await toast());

// Follow-up +25, once per day
await card('Acme').getByRole('button', { name: /Follow up with/ }).click();
await page.click('#fu-sent');
check('follow-up +25', /\+25 points/.test(await toast()), await toast());
await card('Acme').getByRole('button', { name: /Follow up with/ }).click();
await page.click('#fu-sent');
check('second follow-up same day: no extra points', !/\+25/.test(await toast()), await toast());
check('total is 310 points', /310 points/.test(await text('#strip-text')), await text('#strip-text'));

// Progress tab details
await page.click('#tab-progress');
check('level 4 with 10 points to go', (await text('#lvl-num')) === '4' && /90 points to level 5|10 points in total/.test(await text('#lvl-text')) || /310 points in total. 90 points to level 5/.test(await text('#lvl-text')), await text('#lvl-text'));
check('level bar value is 10', (await page.getAttribute('#lvl-bar', 'aria-valuenow')) === '10');
check('goal reached copy (7 actions >= 5)', /Weekly goal reached/.test(await text('#goal-text')), await text('#goal-text'));
check('goal bar capped at 100', (await page.getAttribute('#goal-bar', 'aria-valuenow')) === '100');
const earnedNames = await page.locator('.badge[data-earned="true"] .badge-title').allTextContents();
for (const n of ['First step', 'Reached out', 'First interview', 'First offer', 'Closed the loop', 'Weekly goal met']) {
  check(`badge earned: ${n}`, earnedNames.some((t) => t.includes(n)));
}
check('locked badges are labelled for screen readers', (await page.locator('.badge[data-earned="false"] .sr-only').first().textContent()).includes('Not earned'));

// Goal change persists
await page.fill('#goal-input', '10');
await page.press('#goal-input', 'Tab');
check('Weekly goal badge stays earned after raising the goal', await page.locator('.badge[data-earned="true"]', { hasText: 'Weekly goal met' }).count() === 1);
check('goal 10 -> 70%', (await page.getAttribute('#goal-bar', 'aria-valuenow')) === '70', await page.getAttribute('#goal-bar', 'aria-valuenow'));
await page.fill('#goal-input', '0');
await page.press('#goal-input', 'Tab');
check('invalid goal rejected, value restored', (await page.inputValue('#goal-input')) === '10');
await page.reload();
await page.click('#tab-progress');
check('goal and points survive reload', (await page.inputValue('#goal-input')) === '10' && /310 points/.test(await text('#strip-text')));

// No shame copy anywhere in the UI
const body = (await page.evaluate(() => document.body.innerText)).toLowerCase();
for (const bad of ['you missed', 'streak lost', 'streak broken', 'lazy', 'failed', 'behind', 'penalty']) check(`no shame copy: "${bad}"`, !body.includes(bad));

await page.screenshot({ path: process.env.SHOT || '/tmp/step3.png', fullPage: true });

// Streak rules with seeded history (relative dates)
async function seed(daysAgoList) {
  await page.evaluate((events) => localStorage.setItem('ghosted:v1', JSON.stringify({ version: 1, apps: [], progress: { events, goalReached: false }, settings: { weeklyGoal: 5, name: '' } })), daysAgoList);
  await page.reload();
  await page.click('#tab-progress');
}
const ev = (...offsets) => offsets.map((o, i) => ({ key: `add:s${i}`, type: 'add', date: iso(o) }));
await seed(ev(-3, 0));
check('gap of 2 quiet days keeps the streak (2 days)', (await text('#streak-num')) === '2 days', await text('#streak-num'));
await seed(ev(-4, 0));
check('3 quiet days starts over, best kept', (await text('#streak-num')) === '1 day', await text('#streak-num'));
await seed(ev(-6, -5));
check('long break shows a gentle fresh start', (await text('#streak-num')) === '0 days' && /Fresh start/.test(await text('#streak-text')) && /best so far is 2 days/.test(await text('#streak-text')), await text('#streak-text'));
await seed(ev(-2));
check('2 quiet days since last action still alive', (await text('#streak-num')) === '1 day', await text('#streak-num'));

check('no console/page errors', errors.length === 0, errors.join(' | '));
await browser.close(); server.close();
process.exit(done());

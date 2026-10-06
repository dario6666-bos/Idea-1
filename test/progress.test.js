import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyProgress, withGoalCheck, recordEvent, totalPoints, levelInfo, streakInfo, weekCount, weeklyGoalInfo,
  tipInfo, badgeList, POINTS, eventKey,
} from '../js/progress.js';
import { TIPS } from '../js/tips.js';
import { addDays } from '../js/dates.js';

const D = '2026-10-05'; // a Monday
const rec = (p, type, id, date = D) => recordEvent(p, type, id, date);
const withDays = (...dates) => dates.reduce((p, d, i) => rec(p, 'add', `a${i}`, d).progress, emptyProgress());

test('point values match the spec', () => {
  assert.deepEqual(POINTS, { add: 10, followup: 25, interview: 50, offer: 200, rejection: 5 });
});

test('recording events awards points', () => {
  let p = emptyProgress();
  let r = rec(p, 'add', 'a'); p = r.progress; assert.equal(r.gained, 10);
  r = rec(p, 'followup', 'a'); p = r.progress; assert.equal(r.gained, 25);
  r = rec(p, 'interview', 'a'); p = r.progress; assert.equal(r.gained, 50);
  r = rec(p, 'offer', 'a'); p = r.progress; assert.equal(r.gained, 200);
  r = rec(p, 'rejection', 'b'); p = r.progress; assert.equal(r.gained, 5);
  assert.equal(totalPoints(p), 290);
});

test('status points are awarded once per application (no farming by toggling)', () => {
  let p = rec(emptyProgress(), 'interview', 'a').progress;
  const again = rec(p, 'interview', 'a', '2026-10-06');
  assert.equal(again.gained, 0);
  assert.equal(totalPoints(again.progress), 50);
  assert.equal(rec(p, 'interview', 'b').gained, 50);
});

test('follow-up points once per application per day, again the next day', () => {
  let p = rec(emptyProgress(), 'followup', 'a', D).progress;
  assert.equal(rec(p, 'followup', 'a', D).gained, 0);
  assert.equal(rec(p, 'followup', 'a', addDays(D, 7)).gained, 25);
  assert.equal(eventKey('followup', 'a', D), `followup:a:${D}`);
});

test('unknown event types throw', () => {
  assert.throws(() => rec(emptyProgress(), 'bonus', 'a'));
});

test('levels change every 100 points', () => {
  assert.deepEqual(levelInfo(0), { level: 1, into: 0, size: 100, toNext: 100 });
  assert.equal(levelInfo(99).level, 1);
  assert.equal(levelInfo(100).level, 2);
  assert.equal(levelInfo(250).level, 3);
  assert.equal(levelInfo(250).toNext, 50);
});

test('streak: consecutive days', () => {
  const p = withDays('2026-10-01', '2026-10-02', '2026-10-03');
  assert.deepEqual(streakInfo(p, '2026-10-03'), { current: 3, best: 3, alive: true, lastActive: '2026-10-03' });
});

test('streak: a missed day does not break it', () => {
  const p = withDays('2026-10-01', '2026-10-03'); // one day missed
  assert.equal(streakInfo(p, '2026-10-03').current, 2);
});

test('streak: a gap of 2 missed days is still fine, 3 missed days starts over', () => {
  assert.equal(streakInfo(withDays('2026-10-01', '2026-10-04'), '2026-10-04').current, 2); // Oct 2,3 missed
  const broken = withDays('2026-10-01', '2026-10-05'); // Oct 2,3,4 missed
  const s = streakInfo(broken, '2026-10-05');
  assert.equal(s.current, 1);
  assert.equal(s.best, 1);
});

test('streak stays alive up to 2 quiet days after the last action, then resets gently', () => {
  const p = withDays('2026-10-01', '2026-10-02');
  assert.equal(streakInfo(p, '2026-10-05').current, 2); // 2 quiet days (Oct 3, 4) so far
  const later = streakInfo(p, '2026-10-06');
  assert.equal(later.current, 0);
  assert.equal(later.alive, false);
  assert.equal(later.best, 2); // best is kept
});

test('multiple actions on one day count as one streak day', () => {
  let p = rec(emptyProgress(), 'add', 'a', D).progress;
  p = rec(p, 'followup', 'a', D).progress;
  assert.equal(streakInfo(p, D).current, 1);
});

test('empty progress has no streak', () => {
  assert.deepEqual(streakInfo(emptyProgress(), D), { current: 0, best: 0, alive: false, lastActive: null });
});

test('weekly goal counts Monday to Sunday', () => {
  let p = emptyProgress();
  p = rec(p, 'add', 'a', '2026-10-04').progress; // previous Sunday
  p = rec(p, 'add', 'b', '2026-10-05').progress; // Monday
  p = rec(p, 'add', 'c', '2026-10-11').progress; // Sunday
  p = rec(p, 'add', 'd', '2026-10-12').progress; // next Monday
  assert.equal(weekCount(p, '2026-10-08'), 2);
  const g = weeklyGoalInfo(p, '2026-10-08', 4);
  assert.deepEqual([g.count, g.percent, g.reached], [2, 50, false]);
});

test('weekly goal percent is capped at 100', () => {
  const p = withDays(D, D, D, D, D, D);
  const g = weeklyGoalInfo(p, D, 5);
  assert.equal(g.percent, 100);
  assert.equal(g.reached, true);
});

test('tip unlocks after exactly 3 actions and is stable for a day', () => {
  let p = emptyProgress();
  assert.deepEqual(tipInfo(p, D), { unlocked: false, remaining: 3, tip: null });
  p = rec(p, 'add', 'a').progress;
  p = rec(p, 'add', 'b').progress;
  assert.equal(tipInfo(p, D).unlocked, false);
  assert.equal(tipInfo(p, D).remaining, 1);
  p = rec(p, 'add', 'c').progress;
  const t = tipInfo(p, D);
  assert.equal(t.unlocked, true);
  assert.equal(t.tip, tipInfo(p, D).tip);
  assert.notEqual(t.tip, tipInfo(p, addDays(D, 1)).tip);
});

test('tips: unique, short, and free of guilt wording', () => {
  assert.ok(TIPS.length >= 20);
  assert.equal(new Set(TIPS).size, TIPS.length);
  for (const t of TIPS) {
    assert.ok(t.length < 140, t);
    assert.doesNotMatch(t.toLowerCase(), /\b(lazy|failure|failing|behind|should have|must|never give up|wasted)\b/, t);
  }
});

test('badges are earned from events', () => {
  let p = emptyProgress();
  const earned = () => new Set(badgeList(p, D, 5).filter((b) => b.earned).map((b) => b.id));
  assert.equal(earned().size, 0);
  p = rec(p, 'add', 'a').progress;
  assert.ok(earned().has('first-app'));
  p = rec(p, 'followup', 'a').progress;
  p = rec(p, 'interview', 'a').progress;
  p = rec(p, 'offer', 'a').progress;
  p = rec(p, 'rejection', 'b').progress;
  for (const id of ['first-followup', 'first-interview', 'first-offer', 'first-rejection']) assert.ok(earned().has(id), id);
  for (let i = 0; i < 10; i++) p = rec(p, 'add', `x${i}`).progress;
  assert.ok(earned().has('ten-apps'));
  assert.ok(earned().has('goal')); // well over 5 actions this week
  assert.equal(totalPoints(p), 390);
  assert.ok(!earned().has('level-5')); // 390 points is still level 4
  p = rec(p, 'add', 'one-more').progress; // 400 points
  assert.ok(earned().has('level-5'));
});

test('weekly goal badge stays earned after the goal is raised', () => {
  let p = emptyProgress();
  for (let i = 0; i < 5; i++) p = rec(p, 'add', `g${i}`).progress;
  p = withGoalCheck(p, D, 5);
  assert.equal(p.goalReached, true);
  assert.equal(withGoalCheck(p, D, 5), p); // idempotent, same object
  const badge = badgeList(p, '2026-12-01', 50).find((b) => b.id === 'goal');
  assert.equal(badge.earned, true);
  // not reached yet -> unchanged
  const q = rec(emptyProgress(), 'add', 'a').progress;
  assert.equal(withGoalCheck(q, D, 5), q);
});

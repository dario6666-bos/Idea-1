// Points, levels, streak, weekly goal, badges. Pure functions, no DOM, no storage.
// Everything is derived from an append-only list of events, so there is nothing
// to get out of sync and nothing is ever taken away.
import { daysBetween, dayNumber, startOfWeek, addDays } from './dates.js';
import { TIP_UNLOCK_ACTIONS, tipForDay } from './tips.js';

export const POINTS = { add: 10, followup: 25, interview: 50, offer: 200, rejection: 5 };
export const POINTS_PER_LEVEL = 100;
/** Up to this many days with no action are fine: actions 3 days apart keep a streak going. */
export const MAX_QUIET_DAYS = 2;
export const MAX_EVENTS = 5000;
export const DEFAULT_GOAL = 5;

export const EVENT_LABELS = {
  add: 'Add an application',
  followup: 'Send a follow-up',
  interview: 'Reach an interview',
  offer: 'Receive an offer',
  rejection: 'Log a rejection',
};

export function emptyProgress() {
  return { events: [], goalReached: false };
}

/** Status events count once per application; follow-ups once per application per day. */
export function eventKey(type, appId, date) {
  return type === 'followup' ? `followup:${appId}:${date}` : `${type}:${appId}`;
}

/** Returns { progress, gained }. A repeated event gains 0 and changes nothing. */
export function recordEvent(progress, type, appId, date) {
  if (!(type in POINTS)) throw new Error(`Unknown event type: ${type}`);
  const key = eventKey(type, appId, date);
  if (progress.events.some((e) => e.key === key)) return { progress, gained: 0 };
  const events = [...progress.events, { key, type, date }].slice(-MAX_EVENTS);
  return { progress: { ...progress, events }, gained: POINTS[type] };
}

/** Remember (permanently) that the weekly goal was met, even if the goal is raised later. */
export function withGoalCheck(progress, today, goal) {
  if (progress.goalReached || !weeklyGoalInfo(progress, today, goal).reached) return progress;
  return { ...progress, goalReached: true };
}

export function totalPoints(progress) {
  return progress.events.reduce((sum, e) => sum + POINTS[e.type], 0);
}

export function levelInfo(points) {
  const level = Math.floor(points / POINTS_PER_LEVEL) + 1;
  const into = points % POINTS_PER_LEVEL;
  return { level, into, size: POINTS_PER_LEVEL, toNext: POINTS_PER_LEVEL - into };
}

export function activeDays(progress) {
  return [...new Set(progress.events.map((e) => e.date))].sort();
}

/**
 * Streak counted in days with at least one action. Two actions up to
 * MAX_QUIET_DAYS + 1 calendar days apart stay in the same streak.
 * `alive` is false once more than MAX_QUIET_DAYS days have passed since the last action.
 */
export function streakInfo(progress, today) {
  const days = activeDays(progress);
  if (!days.length) return { current: 0, best: 0, alive: false, lastActive: null };
  let run = 0;
  let best = 0;
  let prev = null;
  for (const d of days) {
    run = prev && daysBetween(prev, d) <= MAX_QUIET_DAYS + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  const alive = daysBetween(prev, today) <= MAX_QUIET_DAYS + 1;
  return { current: alive ? run : 0, best, alive, lastActive: prev };
}

/** Actions recorded in the Monday-to-Sunday week containing `today`. */
export function weekCount(progress, today, offsetWeeks = 0) {
  const start = addDays(startOfWeek(today), offsetWeeks * 7);
  const end = addDays(start, 6);
  return progress.events.filter((e) => e.date >= start && e.date <= end).length;
}

export function weeklyGoalInfo(progress, today, goal) {
  const count = weekCount(progress, today);
  return { count, goal, percent: Math.min(100, Math.round((count / goal) * 100)), reached: count >= goal };
}

function everReachedGoal(progress, goal) {
  const perWeek = new Map();
  for (const e of progress.events) {
    const w = startOfWeek(e.date);
    perWeek.set(w, (perWeek.get(w) || 0) + 1);
  }
  return [...perWeek.values()].some((n) => n >= goal);
}

export function tipInfo(progress, today) {
  const done = progress.events.length;
  if (done < TIP_UNLOCK_ACTIONS) return { unlocked: false, remaining: TIP_UNLOCK_ACTIONS - done, tip: null };
  return { unlocked: true, remaining: 0, tip: tipForDay(dayNumber(today)) };
}

const countOf = (progress, type) => progress.events.filter((e) => e.type === type).length;

/** Badge list with earned flags. Derived from events, so it never needs saving. */
export function badgeList(progress, today, goal) {
  const adds = countOf(progress, 'add');
  const follow = countOf(progress, 'followup');
  const { best } = streakInfo(progress, today);
  const level = levelInfo(totalPoints(progress)).level;
  const defs = [
    ['first-app', 'First step', 'Add your first application.', adds >= 1],
    ['ten-apps', 'Ten applications', 'Add 10 applications.', adds >= 10],
    ['twentyfive-apps', 'Twenty-five applications', 'Add 25 applications.', adds >= 25],
    ['first-followup', 'Reached out', 'Send your first follow-up.', follow >= 1],
    ['five-followups', 'Consistent follow-up', 'Send 5 follow-ups.', follow >= 5],
    ['first-interview', 'First interview', 'Move an application to Interview.', countOf(progress, 'interview') >= 1],
    ['first-offer', 'First offer', 'Move an application to Offer.', countOf(progress, 'offer') >= 1],
    ['first-rejection', 'Closed the loop', 'Log your first rejection. Every no gets you closer to a yes.', countOf(progress, 'rejection') >= 1],
    ['streak-3', 'Three-day streak', 'Reach a 3-day streak.', best >= 3],
    ['streak-7', 'Seven-day streak', 'Reach a 7-day streak.', best >= 7],
    ['goal', 'Weekly goal met', 'Reach your weekly goal once.', progress.goalReached === true || everReachedGoal(progress, goal)],
    ['level-5', 'Level 5', 'Reach level 5 (400 points).', level >= 5],
  ];
  return defs.map(([id, title, how, earned]) => ({ id, title, how, earned }));
}

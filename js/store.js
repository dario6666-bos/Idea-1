// localStorage persistence. Storage is injectable so it can be tested in Node.
import { STATUSES } from './core.js';
import { isValidISO } from './dates.js';

export const KEY = 'ghosted:v1';
export const CORRUPT_KEY = 'ghosted:v1:corrupt';
export const SCHEMA_VERSION = 1;

export function defaultState() {
  return { version: SCHEMA_VERSION, apps: [], settings: { weeklyGoal: 5 } };
}

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const dateOrNull = (v) => (isValidISO(v) ? v : null);

function sanitizeApp(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const company = str(raw.company, 120).trim();
  const role = str(raw.role, 120).trim();
  if (!raw.id || !company || !role || !isValidISO(raw.dateApplied)) return null;
  return {
    id: String(raw.id),
    company,
    role,
    dateApplied: raw.dateApplied,
    status: STATUSES.includes(raw.status) ? raw.status : 'Applied',
    notes: str(raw.notes, 1000),
    lastFollowUp: dateOrNull(raw.lastFollowUp),
    followUps: Number.isInteger(raw.followUps) && raw.followUps > 0 ? raw.followUps : 0,
    interviewOn: dateOrNull(raw.interviewOn),
    closedOn: dateOrNull(raw.closedOn),
    createdOn: dateOrNull(raw.createdOn) ?? raw.dateApplied,
  };
}

/** Make any parsed value safe to use. Unknown fields are dropped. */
export function sanitizeState(raw) {
  const state = defaultState();
  if (!raw || typeof raw !== 'object') return state;
  if (Array.isArray(raw.apps)) {
    const seen = new Set();
    for (const item of raw.apps) {
      const app = sanitizeApp(item);
      if (app && !seen.has(app.id)) {
        seen.add(app.id);
        state.apps.push(app);
      }
    }
  }
  const goal = raw.settings && raw.settings.weeklyGoal;
  if (Number.isInteger(goal) && goal >= 1 && goal <= 50) state.settings.weeklyGoal = goal;
  return state;
}

/** Returns { state, persisted, recovered }. Never throws. */
export function load(storage) {
  let text = null;
  try {
    text = storage.getItem(KEY);
  } catch {
    return { state: defaultState(), persisted: false, recovered: false };
  }
  if (text == null) return { state: defaultState(), persisted: true, recovered: false };
  try {
    return { state: sanitizeState(JSON.parse(text)), persisted: true, recovered: false };
  } catch {
    // Keep the unreadable data aside instead of overwriting it.
    try { storage.setItem(CORRUPT_KEY, text); } catch { /* ignore */ }
    return { state: defaultState(), persisted: true, recovered: true };
  }
}

/** Returns true when the data was saved. */
export function save(storage, state) {
  try {
    storage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

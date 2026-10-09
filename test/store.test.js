import test from 'node:test';
import assert from 'node:assert/strict';
import { load, save, KEY, CORRUPT_KEY, defaultState, sanitizeState } from '../js/store.js';

const fakeStorage = (init = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _m: m };
};

test('empty storage gives default state', () => {
  const r = load(fakeStorage());
  assert.deepEqual(r.state, defaultState());
  assert.equal(r.persisted, true);
});

test('save then load round-trips', () => {
  const s = fakeStorage();
  const state = sanitizeState({ apps: [{ id: '1', company: 'A', role: 'B', dateApplied: '2026-01-01', status: 'Offer' }] });
  assert.equal(save(s, state), true);
  assert.deepEqual(load(s).state, state);
});

test('corrupt JSON is set aside, not lost, and does not throw', () => {
  const s = fakeStorage({ [KEY]: '{not json' });
  const r = load(s);
  assert.equal(r.recovered, true);
  assert.equal(r.state.apps.length, 0);
  assert.equal(s.getItem(CORRUPT_KEY), '{not json');
});

test('invalid records are dropped, bad fields repaired', () => {
  const state = sanitizeState({
    apps: [
      { id: '1', company: 'A', role: 'B', dateApplied: '2026-01-01', status: 'Weird', followUps: -3, lastFollowUp: 'x' },
      { id: '1', company: 'dup', role: 'dup', dateApplied: '2026-01-01' },
      { id: '2', company: '', role: 'B', dateApplied: '2026-01-01' },
      { id: '3', company: 'C', role: 'D', dateApplied: 'bad' },
      null,
    ],
    settings: { weeklyGoal: 999, name: 42 },
  });
  assert.equal(state.apps.length, 1);
  assert.equal(state.apps[0].status, 'Applied');
  assert.equal(state.apps[0].followUps, 0);
  assert.equal(state.apps[0].lastFollowUp, null);
  assert.equal(state.settings.weeklyGoal, 5);
  assert.equal(state.settings.name, '');
});

test('storage that throws is handled', () => {
  const bad = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('full'); } };
  assert.equal(load(bad).persisted, false);
  assert.equal(save(bad, defaultState()), false);
});

test('progress events are validated and de-duplicated', () => {
  const state = sanitizeState({
    progress: {
      events: [
        { key: 'add:1', type: 'add', date: '2026-01-01' },
        { key: 'add:1', type: 'add', date: '2026-01-02' },
        { key: 'x', type: 'bonus', date: '2026-01-01' },
        { key: 'add:2', type: 'add', date: 'bad' },
        { type: 'add', date: '2026-01-01' },
        { key: 'offer:1', type: 'offer', date: '2026-01-03', points: 99999 },
      ],
    },
  });
  assert.deepEqual(state.progress.events.map((e) => e.key), ['add:1', 'offer:1']);
  assert.deepEqual(Object.keys(state.progress.events[1]).sort(), ['date', 'key', 'type']);
});

test('missing progress becomes empty progress', () => {
  assert.deepEqual(sanitizeState({ apps: [] }).progress, { events: [], goalReached: false });
});

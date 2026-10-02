import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createApplication, isFollowUpDue, withStatus, withFollowUpSent, sortApplications, daysSinceContact,
} from '../js/core.js';

const TODAY = '2026-10-02';
const make = (over = {}) => {
  const r = createApplication({ company: 'Acme', role: 'Designer', dateApplied: '2026-09-20', ...over }, TODAY, over.id ?? 'a1');
  assert.ok(r.ok, JSON.stringify(r.errors));
  return r.app;
};

test('createApplication validates and trims', () => {
  const r = createApplication({ company: '  Acme  ', role: ' Designer ', dateApplied: TODAY }, TODAY);
  assert.equal(r.ok, true);
  assert.equal(r.app.company, 'Acme');
  assert.equal(r.app.status, 'Applied');
});

test('createApplication reports errors per field', () => {
  const r = createApplication({ company: ' ', role: '', dateApplied: '2026-10-03' }, TODAY);
  assert.equal(r.ok, false);
  assert.ok(r.errors.company && r.errors.role && r.errors.dateApplied);
  assert.equal(createApplication({ company: 'A', role: 'B', dateApplied: 'nope' }, TODAY).ok, false);
});

test('follow-up is due at exactly 7 days, not 6', () => {
  assert.equal(isFollowUpDue(make({ dateApplied: '2026-09-26' }), TODAY), false); // 6 days
  assert.equal(isFollowUpDue(make({ dateApplied: '2026-09-25' }), TODAY), true); // 7 days
});

test('marking a follow-up sent resets the clock', () => {
  const due = make({ dateApplied: '2026-09-01' });
  assert.equal(isFollowUpDue(due, TODAY), true);
  const sent = withFollowUpSent(due, TODAY);
  assert.equal(sent.followUps, 1);
  assert.equal(isFollowUpDue(sent, TODAY), false);
  assert.equal(isFollowUpDue(sent, '2026-10-08'), false); // 6 days after
  assert.equal(isFollowUpDue(sent, '2026-10-09'), true); // 7 days after
});

test('closed applications are never due', () => {
  const old = make({ dateApplied: '2026-08-01' });
  assert.equal(isFollowUpDue(withStatus(old, 'Rejected', TODAY), TODAY), false);
  assert.equal(isFollowUpDue(withStatus(old, 'Offer', TODAY), TODAY), false);
});

test('moving to Interview counts as contact', () => {
  const old = make({ dateApplied: '2026-08-01' });
  const iv = withStatus(old, 'Interview', TODAY);
  assert.equal(iv.interviewOn, TODAY);
  assert.equal(isFollowUpDue(iv, TODAY), false);
  assert.equal(isFollowUpDue(iv, '2026-10-09'), true);
});

test('status changes are immutable and set closedOn', () => {
  const a = make();
  const r = withStatus(a, 'Rejected', TODAY);
  assert.equal(a.status, 'Applied');
  assert.equal(r.closedOn, TODAY);
  assert.equal(withStatus(r, 'Applied', TODAY).closedOn, null);
  assert.throws(() => withStatus(a, 'Ghosted', TODAY));
});

test('future contact dates never give negative days', () => {
  assert.equal(daysSinceContact(make({ dateApplied: TODAY }), '2026-10-01'), 0);
});

test('sort puts due first, then open, then closed', () => {
  const due = make({ id: 'due', dateApplied: '2026-09-01' });
  const fresh = make({ id: 'fresh', dateApplied: '2026-10-01' });
  const closed = withStatus(make({ id: 'closed', dateApplied: '2026-10-02' }), 'Rejected', TODAY);
  const ids = sortApplications([closed, fresh, due], TODAY).map((a) => a.id);
  assert.deepEqual(ids, ['due', 'fresh', 'closed']);
});

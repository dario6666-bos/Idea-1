// Application model and rules. Pure functions only: no DOM, no storage.
import { isValidISO, daysBetween, maxDate } from './dates.js';

export const STATUSES = ['Applied', 'Interview', 'Offer', 'Rejected'];
export const OPEN_STATUSES = ['Applied', 'Interview'];
export const FOLLOW_UP_AFTER_DAYS = 7;
export const MAX_TEXT = 120;
export const MAX_NOTES = 1000;

export function newId() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Validate form input and build an application.
 * Returns { ok: true, app } or { ok: false, errors: { field: message } }.
 */
export function createApplication(input, today, id = newId()) {
  const company = String(input.company ?? '').trim();
  const role = String(input.role ?? '').trim();
  const dateApplied = String(input.dateApplied ?? '').trim();
  const notes = String(input.notes ?? '').trim();
  const errors = {};

  if (!company) errors.company = 'Please enter a company name.';
  else if (company.length > MAX_TEXT) errors.company = `Keep it under ${MAX_TEXT} characters.`;
  if (!role) errors.role = 'Please enter the role.';
  else if (role.length > MAX_TEXT) errors.role = `Keep it under ${MAX_TEXT} characters.`;
  if (!isValidISO(dateApplied)) errors.dateApplied = 'Please choose a valid date.';
  else if (dateApplied > today) errors.dateApplied = 'The date can’t be in the future.';
  if (notes.length > MAX_NOTES) errors.notes = `Keep notes under ${MAX_NOTES} characters.`;

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    app: {
      id,
      company,
      role,
      dateApplied,
      status: 'Applied',
      notes,
      lastFollowUp: null, // date of the last follow-up marked as sent
      followUps: 0,
      interviewOn: null, // date the card moved to Interview
      closedOn: null, // date the card moved to Offer or Rejected
      createdOn: today,
    },
  };
}

/** Latest date we know the employer was in touch, or we reached out. */
export function lastContactDate(app) {
  return maxDate(app.dateApplied, app.lastFollowUp, app.interviewOn);
}

export function daysSinceContact(app, today) {
  return Math.max(0, daysBetween(lastContactDate(app), today));
}

export function isOpen(app) {
  return OPEN_STATUSES.includes(app.status);
}

export function isFollowUpDue(app, today) {
  return isOpen(app) && daysSinceContact(app, today) >= FOLLOW_UP_AFTER_DAYS;
}

/** Returns a new application with the status changed. */
export function withStatus(app, status, today) {
  if (!STATUSES.includes(status)) throw new Error(`Unknown status: ${status}`);
  if (status === app.status) return app;
  return {
    ...app,
    status,
    interviewOn: status === 'Interview' ? today : app.interviewOn,
    closedOn: OPEN_STATUSES.includes(status) ? null : today,
  };
}

/** Returns a new application with a follow-up recorded as sent today. */
export function withFollowUpSent(app, today) {
  return { ...app, lastFollowUp: today, followUps: app.followUps + 1 };
}

/** Sort: follow-up due first, then open before closed, then newest applied. */
export function sortApplications(apps, today) {
  const rank = (a) => (isFollowUpDue(a, today) ? 0 : isOpen(a) ? 1 : 2);
  return [...apps].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r) return r;
    if (a.dateApplied !== b.dateApplied) return a.dateApplied < b.dateApplied ? 1 : -1;
    return a.createdOn < b.createdOn ? 1 : a.createdOn > b.createdOn ? -1 : 0;
  });
}

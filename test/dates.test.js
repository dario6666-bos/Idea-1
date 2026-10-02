import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidISO, daysBetween, addDays, startOfWeek, toISODate, maxDate } from '../js/dates.js';

test('isValidISO accepts real dates only', () => {
  assert.equal(isValidISO('2026-02-28'), true);
  assert.equal(isValidISO('2024-02-29'), true);
  assert.equal(isValidISO('2026-02-29'), false);
  assert.equal(isValidISO('2026-13-01'), false);
  assert.equal(isValidISO('26-01-01'), false);
  assert.equal(isValidISO(null), false);
});

test('daysBetween counts whole days across month, year and DST', () => {
  assert.equal(daysBetween('2026-01-01', '2026-01-08'), 7);
  assert.equal(daysBetween('2025-12-30', '2026-01-02'), 3);
  assert.equal(daysBetween('2026-03-28', '2026-03-30'), 2);
  assert.equal(daysBetween('2026-05-02', '2026-05-01'), -1);
});

test('addDays', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('startOfWeek returns Monday', () => {
  assert.equal(startOfWeek('2026-10-02'), '2026-09-28'); // Friday -> Monday
  assert.equal(startOfWeek('2026-09-28'), '2026-09-28'); // Monday
  assert.equal(startOfWeek('2026-10-04'), '2026-09-28'); // Sunday
});

test('toISODate uses local date parts', () => {
  assert.equal(toISODate(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});

test('maxDate ignores nulls', () => {
  assert.equal(maxDate('2026-01-01', null, '2026-01-03'), '2026-01-03');
});

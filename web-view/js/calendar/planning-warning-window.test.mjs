// Unit tests for the pure Asia/Colombo planning-warning window helpers in
// core.js (weekend-planning-warning task, 2026-07-24). No DOM, no network —
// each test feeds an explicit epoch-ms instant (an injectable clock) rather
// than relying on the real current time, per Step 12 of the task brief.
// Fixture instants are anchored to the confirmed real week of 2026-07-24
// (a Friday) — see the UTC↔Colombo (+05:30, no DST) conversion in each
// comment. Run with: node web-view/js/calendar/planning-warning-window.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { getColomboWeekSeconds, isWithinPlanningWarningWindow } from './core.js';

function windowStateAt(iso) {
  return isWithinPlanningWarningWindow(getColomboWeekSeconds(new Date(iso).getTime()));
}

test('Thursday 23:59:59 Colombo -> hidden', () => {
  // 2026-07-23T18:29:59Z = 2026-07-23 (Thu) 23:59:59 +05:30
  assert.equal(windowStateAt('2026-07-23T18:29:59Z'), false);
});

test('Friday 06:59:59 Colombo -> hidden', () => {
  // 2026-07-24T01:29:59Z = 2026-07-24 (Fri) 06:59:59 +05:30
  assert.equal(windowStateAt('2026-07-24T01:29:59Z'), false);
});

test('Friday 07:00:00 Colombo -> visible', () => {
  // 2026-07-24T01:30:00Z = 2026-07-24 (Fri) 07:00:00 +05:30
  assert.equal(windowStateAt('2026-07-24T01:30:00Z'), true);
});

test('Friday after 07:00 Colombo -> visible', () => {
  // 2026-07-24T10:00:00Z = 2026-07-24 (Fri) 15:30:00 +05:30
  assert.equal(windowStateAt('2026-07-24T10:00:00Z'), true);
});

test('Saturday all day Colombo -> visible (noon sample)', () => {
  // 2026-07-25T06:30:00Z = 2026-07-25 (Sat) 12:00:00 +05:30
  assert.equal(windowStateAt('2026-07-25T06:30:00Z'), true);
});

test('Sunday 23:59:58 Colombo -> visible', () => {
  // 2026-07-26T18:29:58Z = 2026-07-26 (Sun) 23:59:58 +05:30
  assert.equal(windowStateAt('2026-07-26T18:29:58Z'), true);
});

test('Sunday 23:59:59 Colombo -> visible (approved end is the end of Sunday, not read as Monday 23:59:59)', () => {
  // 2026-07-26T18:29:59Z = 2026-07-26 (Sun) 23:59:59 +05:30
  assert.equal(windowStateAt('2026-07-26T18:29:59Z'), true);
});

test('Monday 00:00:00 Colombo -> hidden', () => {
  // 2026-07-26T18:30:00Z = 2026-07-27 (Mon) 00:00:00 +05:30
  assert.equal(windowStateAt('2026-07-26T18:30:00Z'), false);
});

test('getColomboWeekSeconds is independent of the caller/browser local timezone (uses an absolute epoch instant, not local wall-clock fields)', () => {
  // Same absolute instant expressed as two different offsets — both must
  // resolve to the same Colombo-local reading (Fri 07:00:00 = 370800).
  var utcForm = new Date('2026-07-24T01:30:00Z').getTime();
  var plusEightForm = new Date('2026-07-24T09:30:00+08:00').getTime();
  assert.equal(utcForm, plusEightForm);
  assert.equal(getColomboWeekSeconds(utcForm), 4 * 86400 + 7 * 3600);
});

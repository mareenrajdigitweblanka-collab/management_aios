// Unit tests for the pure scheduleConfirmationMessage() popup-text builder
// in core.js (LUNCH-BREAK AND DIFFERENT-TITLE TASK-OVERLAP CONFIRMATION,
// 2026-07-27). No DOM, no network — feeds the exact {code, row_index}[]
// shape backend/routers/member_schedules.py schedule_confirmation_response_
// body returns. Run with:
// node web-view/js/calendar/schedule-confirmation-message.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleConfirmationMessage, SCHEDULE_ADVISORY_LUNCH, SCHEDULE_ADVISORY_DIFFERENT_TITLE } from './core.js';

function w(code, rowIndex) {
  return { code: code, row_index: rowIndex === undefined ? null : rowIndex };
}

test('lunch-only single-candidate message matches the approved exact wording', () => {
  assert.equal(
    scheduleConfirmationMessage([w(SCHEDULE_ADVISORY_LUNCH)]),
    'This Task overlaps the lunch break from 12:45 PM to 1:30 PM.'
  );
});

test('different-title-only single-candidate message matches the approved exact wording', () => {
  assert.equal(
    scheduleConfirmationMessage([w(SCHEDULE_ADVISORY_DIFFERENT_TITLE)]),
    'This Task overlaps another Task scheduled for the same member and date.'
  );
});

test('combined single-candidate message matches the approved exact wording', () => {
  assert.equal(
    scheduleConfirmationMessage([w(SCHEDULE_ADVISORY_LUNCH), w(SCHEDULE_ADVISORY_DIFFERENT_TITLE)]),
    'This Task overlaps the lunch break and another Task scheduled for the same member and date.'
  );
});

test('empty warnings falls back to a generic confirmation message (defensive only)', () => {
  assert.equal(scheduleConfirmationMessage([]), 'This Task needs confirmation before it can be saved.');
  assert.equal(scheduleConfirmationMessage(undefined), 'This Task needs confirmation before it can be saved.');
});

test('Bulk (row_index present) produces one readable line per warned row', () => {
  var message = scheduleConfirmationMessage([
    w(SCHEDULE_ADVISORY_LUNCH, 1),
    w(SCHEDULE_ADVISORY_DIFFERENT_TITLE, 2),
    w(SCHEDULE_ADVISORY_LUNCH, 3),
    w(SCHEDULE_ADVISORY_DIFFERENT_TITLE, 3),
  ]);
  assert.equal(
    message,
    'Task 1 overlaps the lunch break. Task 2 overlaps another Task. Task 3 overlaps the lunch break and another Task.'
  );
});

test('Bulk rows are summarized in ascending row order regardless of warning array order', () => {
  var message = scheduleConfirmationMessage([
    w(SCHEDULE_ADVISORY_LUNCH, 3),
    w(SCHEDULE_ADVISORY_LUNCH, 1),
  ]);
  assert.equal(message, 'Task 1 overlaps the lunch break. Task 3 overlaps the lunch break.');
});

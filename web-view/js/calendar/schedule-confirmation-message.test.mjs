// Unit tests for the pure plain-language schedule-confirmation dialog-content
// builders in core.js (LUNCH-BREAK AND DIFFERENT-TITLE TASK-OVERLAP
// CONFIRMATION, 2026-07-27; plain-language copy pass same day). No DOM, no
// network — feeds the exact {code, row_index, conflicts}[] shape
// backend/routers/member_schedules.py schedule_confirmation_response_body
// returns (conflicts is additive to different_task_time_overlap entries
// only — see build_schedule_confirmation). Run with:
// node web-view/js/calendar/schedule-confirmation-message.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildScheduleConfirmationDialogContent,
  formatTimeAmPm,
  SCHEDULE_ADVISORY_LUNCH,
  SCHEDULE_ADVISORY_DIFFERENT_TITLE
} from './core.js';

function lunch(rowIndex) {
  return { code: SCHEDULE_ADVISORY_LUNCH, row_index: rowIndex === undefined ? null : rowIndex };
}

function overlap(conflicts, rowIndex) {
  return { code: SCHEDULE_ADVISORY_DIFFERENT_TITLE, row_index: rowIndex === undefined ? null : rowIndex, conflicts: conflicts };
}

function conflict(title, start, end) {
  return { title: title, start_time: start, end_time: end };
}

// ── formatTimeAmPm ──────────────────────────────────────────────────────
test('formatTimeAmPm: midnight, noon, afternoon, morning, missing value', () => {
  assert.equal(formatTimeAmPm('00:00'), '12:00 AM');
  assert.equal(formatTimeAmPm('12:00'), '12:00 PM');
  assert.equal(formatTimeAmPm('13:15'), '1:15 PM');
  assert.equal(formatTimeAmPm('09:05'), '9:05 AM');
  assert.equal(formatTimeAmPm('12:30'), '12:30 PM');
  assert.equal(formatTimeAmPm(''), '');
  assert.equal(formatTimeAmPm(null), '');
  assert.equal(formatTimeAmPm(undefined), '');
});

// ── Message test 1: lunch-only exact copy ───────────────────────────────
test('message test 1: lunch-only exact copy (create)', () => {
  var content = buildScheduleConfirmationDialogContent([lunch()], 'create');
  assert.equal(content.message, 'This task is during the lunch break, from 12:45 PM to 1:30 PM.');
  assert.deepEqual(content.listItems, []);
  assert.equal(content.footer, 'Do you still want to add it?');
});

// ── Message test 2: one different-title conflict exact copy ────────────
test('message test 2: one different-title conflict exact copy (create)', () => {
  var content = buildScheduleConfirmationDialogContent(
    [overlap([conflict('Staff Attendance', '12:30', '13:15')])],
    'create'
  );
  assert.equal(content.message, 'Another task is already scheduled during this time:');
  assert.deepEqual(content.listItems, ['“Staff Attendance” — 12:30 PM to 1:15 PM']);
  assert.equal(content.footer, 'Do you still want to add this task?');
});

// ── Message test 3: combined warning exact copy ─────────────────────────
test('message test 3: combined warning exact copy, one conflict (create)', () => {
  var content = buildScheduleConfirmationDialogContent(
    [lunch(), overlap([conflict('Staff Attendance', '12:30', '13:15')])],
    'create'
  );
  assert.equal(content.message, 'This task is during the lunch break, from 12:45 PM to 1:30 PM, and it also overlaps:');
  assert.deepEqual(content.listItems, ['“Staff Attendance” — 12:30 PM to 1:15 PM']);
  assert.equal(content.footer, 'Do you still want to add it?');
});

// ── Message test 4: multiple-conflict summary ───────────────────────────
test('message test 4: multiple-conflict summary (create)', () => {
  var content = buildScheduleConfirmationDialogContent(
    [overlap([conflict('Team Standup', '09:00', '09:30'), conflict('Client Call', '10:00', '10:30')])],
    'create'
  );
  assert.equal(
    content.message,
    'This time overlaps 2 other scheduled tasks.\n\nPlease review the conflicting task times before continuing.'
  );
  assert.deepEqual(content.listItems, [
    '“Team Standup” — 9:00 AM to 9:30 AM',
    '“Client Call” — 10:00 AM to 10:30 AM'
  ]);
  assert.equal(content.footer, null);
});

// ── Message test 5: missing-title fallback ──────────────────────────────
test('message test 5: missing-title fallback', () => {
  var content = buildScheduleConfirmationDialogContent(
    [overlap([conflict(null, '09:00', '09:30')])],
    'create'
  );
  assert.deepEqual(content.listItems, ['Another task — 9:00 AM to 9:30 AM']);
  assert.ok(content.listItems[0].indexOf('undefined') === -1);
  assert.ok(content.listItems[0].indexOf('null') === -1);

  var contentEmptyTitle = buildScheduleConfirmationDialogContent(
    [overlap([conflict('', '09:00', '09:30')])],
    'create'
  );
  assert.deepEqual(contentEmptyTitle.listItems, ['Another task — 9:00 AM to 9:30 AM']);
});

// ── Message test 6: more-than-five conflict summary ─────────────────────
test('message test 6: more than five conflicts shows a capped list plus an overflow line', () => {
  var conflicts = [];
  for (var i = 1; i <= 7; i++) {
    var hh = String(8 + i).padStart(2, '0');
    conflicts.push(conflict('Task ' + i, hh + ':00', hh + ':30'));
  }
  var content = buildScheduleConfirmationDialogContent([overlap(conflicts)], 'create');
  assert.equal(content.listItems.length, 6); // 5 shown + 1 overflow line
  assert.equal(content.listItems[5], 'And 2 more scheduled tasks.');
});

// ── Message test 7: conflict sorting ─────────────────────────────────────
test('message test 7: conflicts sort by start time, then end time, then title', () => {
  var content = buildScheduleConfirmationDialogContent(
    [overlap([
      conflict('Zebra Task', '10:00', '10:30'),
      conflict('Alpha Task', '09:00', '09:30'),
      conflict('Beta Task', '09:00', '09:15')
    ])],
    'create'
  );
  assert.deepEqual(content.listItems, [
    '“Beta Task” — 9:00 AM to 9:15 AM',
    '“Alpha Task” — 9:00 AM to 9:30 AM',
    '“Zebra Task” — 10:00 AM to 10:30 AM'
  ]);
});

// ── Message test 8: conflict deduplication ───────────────────────────────
test('message test 8: identical displayed conflicts are deduplicated', () => {
  var content = buildScheduleConfirmationDialogContent(
    [overlap([
      conflict('Staff Attendance', '12:30', '13:15'),
      conflict('Staff Attendance', '12:30', '13:15')
    ])],
    'create'
  );
  assert.deepEqual(content.listItems, ['“Staff Attendance” — 12:30 PM to 1:15 PM']);
});

// ── Edit context (STEP 9) ────────────────────────────────────────────────
test('edit context: closing question is always "save these changes" regardless of warning shape', () => {
  var lunchOnly = buildScheduleConfirmationDialogContent([lunch()], 'edit');
  assert.equal(lunchOnly.footer, 'Do you still want to save these changes?');

  var oneOverlap = buildScheduleConfirmationDialogContent(
    [overlap([conflict('Staff Attendance', '12:30', '13:15')])], 'edit'
  );
  assert.equal(oneOverlap.footer, 'Do you still want to save these changes?');

  var multiple = buildScheduleConfirmationDialogContent(
    [overlap([conflict('A', '09:00', '09:30'), conflict('B', '10:00', '10:30')])], 'edit'
  );
  assert.equal(multiple.footer, 'Do you still want to save these changes?');

  var combined = buildScheduleConfirmationDialogContent(
    [lunch(), overlap([conflict('Staff Attendance', '12:30', '13:15')])], 'edit'
  );
  assert.equal(combined.footer, 'Do you still want to save these changes?');
});

// ── Bulk wording (STEP 8) ─────────────────────────────────────────────────
test('bulk: lunch-only row uses friendly 1-indexed numbering', () => {
  var content = buildScheduleConfirmationDialogContent([lunch(2)], 'bulk');
  assert.equal(content.message, 'Task 2 is during the lunch break.');
  assert.equal(content.footer, 'Do you still want to add all these tasks?');
  assert.deepEqual(content.listItems, []);
});

test('bulk: single different-title overlap row exact copy', () => {
  var content = buildScheduleConfirmationDialogContent(
    [overlap([conflict('Staff Attendance', '12:30', '13:15')], 3)],
    'bulk'
  );
  assert.equal(content.message, 'Task 3 overlaps:\n“Staff Attendance” — 12:30 PM to 1:15 PM');
});

test('bulk: combined row exact copy (STEP 8 example)', () => {
  var content = buildScheduleConfirmationDialogContent(
    [lunch(4), overlap([conflict('Developer Meeting', '13:00', '14:00')], 4)],
    'bulk'
  );
  assert.equal(content.message, 'Task 4 is during lunch and overlaps:\n“Developer Meeting” — 1:00 PM to 2:00 PM');
});

test('bulk: multiple warned rows are combined into one message, in ascending row order', () => {
  var content = buildScheduleConfirmationDialogContent(
    [
      lunch(3),
      lunch(1),
      overlap([conflict('Staff Attendance', '12:30', '13:15')], 2)
    ],
    'bulk'
  );
  assert.equal(
    content.message,
    'Task 1 is during the lunch break.\n\n'
    + 'Task 2 overlaps:\n“Staff Attendance” — 12:30 PM to 1:15 PM\n\n'
    + 'Task 3 is during the lunch break.'
  );
  assert.equal(content.footer, 'Do you still want to add all these tasks?');
});

test('bulk: never shows a zero-based row index', () => {
  var content = buildScheduleConfirmationDialogContent([lunch(1)], 'bulk');
  assert.ok(content.message.indexOf('Task 0') === -1);
  assert.ok(content.message.indexOf('Task 1') !== -1);
});

// ── Defensive fallback ────────────────────────────────────────────────────
test('empty warnings falls back to a generic confirmation message (defensive only)', () => {
  assert.equal(
    buildScheduleConfirmationDialogContent([], 'create').message,
    'This task needs confirmation before it can be saved.'
  );
  assert.equal(
    buildScheduleConfirmationDialogContent(undefined, 'create').message,
    'This task needs confirmation before it can be saved.'
  );
});

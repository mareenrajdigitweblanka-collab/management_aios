// Unit tests for Bulk Tasks multi-date payload/occurrence helpers
// (REQ-CAL-BULK-DATES-001, 2026-08-03) — the pure, DOM-free core.js
// functions calendar/instance.js's bulk-row logic delegates to:
// buildBulkPayloadRowsForDates, bulkCardOccurrenceCount,
// totalBulkOccurrenceCount, formatCompactDateList. No DOM, no network.
//
// Coverage-boundary note (mirrors the equivalent note in every other
// calendar/*.test.mjs file in this repo): calendar/instance.js itself has
// NO DOM-level test coverage anywhere in this repository (confirmed by
// grep — no test file ever constructs mountScheduleCalendarInstance or
// initAllScheduleCalendars; only the pure, DOM-free helpers it calls are
// unit tested, e.g. classifyTimeFrameSet/frontendToMultiFramePayload in
// multi-time-frame.test.mjs). This file follows that exact, pre-existing
// convention for the new bulk multi-date feature: the actual decision
// logic (which payload rows a card produces, how the combined occurrence
// count is computed, how the compact date preview is formatted) is
// exercised thoroughly here; instance.js's own DOM wiring around these
// functions (mode-select change handlers, weekday-chip click handlers,
// date-chip add/remove) is verified by code review and node --check only,
// not by an automated DOM-mounted test.
//
// Run with: node --test web-view/js/calendar/bulk-payload-and-occurrence.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  expandTaskDates,
  buildBulkPayloadRowsForDates,
  bulkCardOccurrenceCount,
  totalBulkOccurrenceCount,
  formatCompactDateList
} from './core.js';

// ── buildBulkPayloadRowsForDates ─────────────────────────────────────

test('five dates produce exactly five payload rows', () => {
  var dates = expandTaskDates({ mode: 'range', rangeStart: '2026-08-10', rangeEnd: '2026-08-14' }).dates;
  var shared = { title: 'Staff Attendance', priority: 'Medium', notes: null, start: '09:00', end: '10:00' };
  var rows = buildBulkPayloadRowsForDates(shared, dates);
  assert.equal(rows.length, 5);
});

test('five manually selected dates produce exactly five payload rows', () => {
  var dates = expandTaskDates({
    mode: 'multiple',
    selectedDates: ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14']
  }).dates;
  var shared = { title: 'Staff Attendance', priority: 'High', notes: null, start: null, end: null };
  var rows = buildBulkPayloadRowsForDates(shared, dates);
  assert.equal(rows.length, 5);
});

test('shared title/priority/notes/start/end are copied identically to every generated row', () => {
  var dates = ['2026-08-10', '2026-08-11', '2026-08-12'];
  var shared = { title: 'Weekly Sync', priority: 'Low', notes: 'Bring laptop', start: '14:00', end: '15:00' };
  var rows = buildBulkPayloadRowsForDates(shared, dates);
  rows.forEach(function (row) {
    assert.equal(row.title, 'Weekly Sync');
    assert.equal(row.priority, 'Low');
    assert.equal(row.notes, 'Bring laptop');
    assert.equal(row.start, '14:00');
    assert.equal(row.end, '15:00');
  });
});

test('shared multi-time-frame values are copied identically to every generated row', () => {
  var dates = ['2026-08-10', '2026-08-11'];
  var shared = {
    title: 'Two-Slot Task', priority: 'Medium', notes: null,
    time_frames: [{ start_time: '09:00', end_time: '10:00' }, { start_time: '13:00', end_time: '14:00' }]
  };
  var rows = buildBulkPayloadRowsForDates(shared, dates);
  assert.equal(rows.length, 2);
  rows.forEach(function (row) {
    assert.deepEqual(row.time_frames, shared.time_frames);
    assert.equal(Object.prototype.hasOwnProperty.call(row, 'start'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(row, 'end'), false);
  });
});

test('each generated row carries its own distinct date', () => {
  var dates = ['2026-08-10', '2026-08-11', '2026-08-12'];
  var rows = buildBulkPayloadRowsForDates({ title: 'X', priority: 'Medium', notes: null, start: null, end: null }, dates);
  assert.deepEqual(rows.map(function (r) { return r.date; }), dates);
});

test('no date-mode metadata (mode/weekdays/selectedDates) ever appears in a payload row', () => {
  var dates = ['2026-08-10'];
  var rows = buildBulkPayloadRowsForDates({ title: 'X', priority: 'Medium', notes: null, start: null, end: null }, dates);
  var keys = Object.keys(rows[0]);
  assert.ok(keys.indexOf('mode') === -1);
  assert.ok(keys.indexOf('weekdays') === -1);
  assert.ok(keys.indexOf('selectedDates') === -1);
  assert.deepEqual(keys.sort(), ['date', 'title', 'priority', 'notes', 'start', 'end'].sort());
});

test('buildBulkPayloadRowsForDates does not mutate sharedFields or dates', () => {
  var shared = { title: 'X', priority: 'Medium', notes: null, start: null, end: null };
  var sharedCopy = JSON.parse(JSON.stringify(shared));
  var dates = ['2026-08-10', '2026-08-11'];
  var datesCopy = dates.slice();
  buildBulkPayloadRowsForDates(shared, dates);
  assert.deepEqual(shared, sharedCopy);
  assert.deepEqual(dates, datesCopy);
});

test('zero dates produces zero payload rows (never a single row with a null date)', () => {
  var rows = buildBulkPayloadRowsForDates({ title: 'X', priority: 'Medium', notes: null, start: null, end: null }, []);
  assert.deepEqual(rows, []);
});

test('legacy single-date-mode payload shape is unchanged (one row, plain start/end)', () => {
  var dates = expandTaskDates({ mode: 'single', singleDate: '2026-08-10' }).dates;
  var shared = { title: 'Prepare weekly report', priority: 'Medium', notes: null, start: '09:00', end: '10:00' };
  var rows = buildBulkPayloadRowsForDates(shared, dates);
  assert.deepEqual(rows, [{ date: '2026-08-10', title: 'Prepare weekly report', priority: 'Medium', notes: null, start: '09:00', end: '10:00' }]);
});

// ── bulkCardOccurrenceCount / totalBulkOccurrenceCount ───────────────

test('5 dates x 1 time frame = 5 occurrences', () => {
  assert.equal(bulkCardOccurrenceCount(5, 1), 5);
});

test('5 dates x 2 time frames = 10 occurrences (approved design example)', () => {
  assert.equal(bulkCardOccurrenceCount(5, 2), 10);
});

test('15 dates x 2 time frames = 30 occurrences — exactly at the boundary', () => {
  assert.equal(bulkCardOccurrenceCount(15, 2), 30);
});

test('16 dates x 2 time frames = 32 occurrences — over the boundary', () => {
  assert.equal(bulkCardOccurrenceCount(16, 2), 32);
});

test('a zero/undefined frame count is clamped to 1 (an untimed task still counts as 1 occurrence per date)', () => {
  assert.equal(bulkCardOccurrenceCount(5, 0), 5);
  assert.equal(bulkCardOccurrenceCount(5, undefined), 5);
});

test('totalBulkOccurrenceCount sums every card exactly at 30 — allowed boundary', () => {
  assert.equal(totalBulkOccurrenceCount([bulkCardOccurrenceCount(15, 1), bulkCardOccurrenceCount(15, 1)]), 30);
});

test('totalBulkOccurrenceCount sums every card at 31 — over the allowed limit', () => {
  assert.equal(totalBulkOccurrenceCount([bulkCardOccurrenceCount(16, 1), bulkCardOccurrenceCount(15, 1)]), 31);
});

test('totalBulkOccurrenceCount of an empty submission is 0', () => {
  assert.equal(totalBulkOccurrenceCount([]), 0);
  assert.equal(totalBulkOccurrenceCount(), 0);
});

test('totalBulkOccurrenceCount does not mutate its input array', () => {
  var counts = [5, 10, 15];
  var countsCopy = counts.slice();
  totalBulkOccurrenceCount(counts);
  assert.deepEqual(counts, countsCopy);
});

// ── formatCompactDateList ─────────────────────────────────────────────

test('formatCompactDateList shows every date inline when at or under the cap', () => {
  var text = formatCompactDateList(['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14']);
  assert.equal(text, '10 Aug, 11 Aug, 12 Aug, 13 Aug, 14 Aug');
});

test('formatCompactDateList truncates beyond the cap and appends a "+ N more dates" suffix', () => {
  var seventeen = [];
  for (var i = 1; i <= 17; i++) { seventeen.push('2026-08-' + (i < 10 ? '0' + i : i)); }
  var text = formatCompactDateList(seventeen);
  assert.equal(text, '01 Aug, 02 Aug, 03 Aug, 04 Aug, 05 Aug + 12 more dates');
});

test('formatCompactDateList uses singular "date" for exactly one remaining', () => {
  var text = formatCompactDateList(['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-17']);
  assert.equal(text, '10 Aug, 11 Aug, 12 Aug, 13 Aug, 14 Aug + 1 more date');
});

test('formatCompactDateList of an empty list is an empty string', () => {
  assert.equal(formatCompactDateList([]), '');
  assert.equal(formatCompactDateList(), '');
});

test('formatCompactDateList respects a custom inline cap', () => {
  var text = formatCompactDateList(['2026-08-10', '2026-08-11', '2026-08-12'], 2);
  assert.equal(text, '10 Aug, 11 Aug + 1 more date');
});

test('formatCompactDateList does not mutate its input array', () => {
  var dates = ['2026-08-14', '2026-08-10'];
  var datesCopy = dates.slice();
  formatCompactDateList(dates);
  assert.deepEqual(dates, datesCopy);
});

// ── End-to-end: expand -> build payload -> count occurrences ─────────

test('end-to-end: a Monday-Friday range with 2 time frames produces the expected payload and occurrence count', () => {
  var expansion = expandTaskDates({ mode: 'range', rangeStart: '2026-08-10', rangeEnd: '2026-08-14' });
  assert.equal(expansion.dates.length, 5);
  var shared = {
    title: 'Two-Slot Task', priority: 'High', notes: null,
    time_frames: [{ start_time: '09:00', end_time: '10:00' }, { start_time: '13:00', end_time: '14:00' }]
  };
  var rows = buildBulkPayloadRowsForDates(shared, expansion.dates);
  assert.equal(rows.length, 5);
  var occurrences = bulkCardOccurrenceCount(expansion.dates.length, shared.time_frames.length);
  assert.equal(occurrences, 10);
});

// Unit tests for Bulk Tasks multi-date expansion (REQ-CAL-BULK-DATES-001,
// 2026-08-03) — the pure, DOM-free core.js helper expandTaskDates() and its
// DEFAULT_RANGE_WEEKDAYS constant. No DOM, no network, no fake-browser-
// globals needed (core.js is a leaf module with no window/document access
// at module scope). Run with: node --test web-view/js/calendar/date-range-expansion.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { expandTaskDates, DEFAULT_RANGE_WEEKDAYS } from './core.js';

// ── Single mode ──────────────────────────────────────────────────────

test('1: single valid date returns exactly one date', () => {
  var result = expandTaskDates({ mode: 'single', singleDate: '2026-08-10' });
  assert.deepEqual(result.dates, ['2026-08-10']);
  assert.deepEqual(result.errors, []);
});

test('2: missing single date returns a structured error', () => {
  var result = expandTaskDates({ mode: 'single', singleDate: '' });
  assert.deepEqual(result.dates, []);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].code, 'date_required');
  assert.match(result.errors[0].message, /choose a date/i);
});

test('3: invalid single date returns a structured error', () => {
  var result = expandTaskDates({ mode: 'single', singleDate: 'not-a-date' });
  assert.deepEqual(result.dates, []);
  assert.equal(result.errors[0].code, 'date_required');
});

test('single mode: undefined singleDate returns the same error as empty string', () => {
  var result = expandTaskDates({ mode: 'single' });
  assert.deepEqual(result.dates, []);
  assert.equal(result.errors[0].code, 'date_required');
});

// ── Range mode ───────────────────────────────────────────────────────

test('4: Monday 10 Aug through Friday 14 Aug 2026 returns exactly five dates', () => {
  var result = expandTaskDates({ mode: 'range', rangeStart: '2026-08-10', rangeEnd: '2026-08-14' });
  assert.deepEqual(result.dates, ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14']);
  assert.deepEqual(result.errors, []);
});

test('5: Monday-Friday default excludes weekends', () => {
  // 2026-08-10 (Mon) .. 2026-08-16 (Sun) — a full week including both weekend days.
  var result = expandTaskDates({ mode: 'range', rangeStart: '2026-08-10', rangeEnd: '2026-08-16' });
  assert.deepEqual(result.dates, ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14']);
  assert.ok(result.dates.indexOf('2026-08-15') === -1, 'Saturday must be excluded by default');
  assert.ok(result.dates.indexOf('2026-08-16') === -1, 'Sunday must be excluded by default');
});

test('default weekdays constant is Monday..Friday using Date.getDay() values', () => {
  assert.deepEqual(DEFAULT_RANGE_WEEKDAYS, [1, 2, 3, 4, 5]);
});

test('6: explicit Saturday selection includes Saturday', () => {
  var result = expandTaskDates({
    mode: 'range', rangeStart: '2026-08-10', rangeEnd: '2026-08-16', weekdays: [1, 2, 3, 4, 5, 6]
  });
  assert.ok(result.dates.indexOf('2026-08-15') !== -1, 'Saturday must be included when explicitly selected');
  assert.ok(result.dates.indexOf('2026-08-16') === -1, 'Sunday must remain excluded');
});

test('7: explicit Sunday selection includes Sunday', () => {
  var result = expandTaskDates({
    mode: 'range', rangeStart: '2026-08-10', rangeEnd: '2026-08-16', weekdays: [0, 1, 2, 3, 4, 5]
  });
  assert.ok(result.dates.indexOf('2026-08-16') !== -1, 'Sunday must be included when explicitly selected');
  assert.ok(result.dates.indexOf('2026-08-15') === -1, 'Saturday must remain excluded');
});

test('8: same-day inclusive range returns one date when its weekday is selected', () => {
  // 2026-08-10 is a Monday.
  var result = expandTaskDates({ mode: 'range', rangeStart: '2026-08-10', rangeEnd: '2026-08-10' });
  assert.deepEqual(result.dates, ['2026-08-10']);
  assert.deepEqual(result.errors, []);
});

test('9: same-day range returns a zero-date error when its weekday is unselected', () => {
  // 2026-08-15 is a Saturday; default weekdays exclude it.
  var result = expandTaskDates({ mode: 'range', rangeStart: '2026-08-15', rangeEnd: '2026-08-15' });
  assert.deepEqual(result.dates, []);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].code, 'empty_range');
});

test('10: start after end returns a structured error', () => {
  var result = expandTaskDates({ mode: 'range', rangeStart: '2026-08-14', rangeEnd: '2026-08-10' });
  assert.deepEqual(result.dates, []);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].code, 'range_inverted');
});

test('11: empty weekday selection returns a structured error', () => {
  var result = expandTaskDates({ mode: 'range', rangeStart: '2026-08-10', rangeEnd: '2026-08-14', weekdays: [] });
  assert.deepEqual(result.dates, []);
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].code, 'no_weekdays_selected');
});

test('range mode: missing start date returns a structured error', () => {
  var result = expandTaskDates({ mode: 'range', rangeStart: '', rangeEnd: '2026-08-14' });
  assert.equal(result.errors[0].code, 'start_date_required');
});

test('range mode: missing end date returns a structured error', () => {
  var result = expandTaskDates({ mode: 'range', rangeStart: '2026-08-10', rangeEnd: '' });
  assert.equal(result.errors[0].code, 'end_date_required');
});

test('range mode: both start and end missing returns both structured errors', () => {
  var result = expandTaskDates({ mode: 'range', rangeStart: '', rangeEnd: '' });
  var codes = result.errors.map(function (e) { return e.code; });
  assert.deepEqual(codes, ['start_date_required', 'end_date_required']);
});

// ── Multiple-dates mode ──────────────────────────────────────────────

test('12: multiple dates are sorted ascending', () => {
  var result = expandTaskDates({ mode: 'multiple', selectedDates: ['2026-08-14', '2026-08-10', '2026-08-12'] });
  assert.deepEqual(result.dates, ['2026-08-10', '2026-08-12', '2026-08-14']);
});

test('13: repeated multiple dates are deduplicated', () => {
  var result = expandTaskDates({ mode: 'multiple', selectedDates: ['2026-08-10', '2026-08-10', '2026-08-12'] });
  assert.deepEqual(result.dates, ['2026-08-10', '2026-08-12']);
});

test('14: invalid multiple-date value returns a structured error', () => {
  var result = expandTaskDates({ mode: 'multiple', selectedDates: ['2026-08-10', 'garbage'] });
  assert.deepEqual(result.dates, []);
  assert.equal(result.errors[0].code, 'invalid_date_in_list');
});

test('multiple mode: zero dates returns a structured error', () => {
  var result = expandTaskDates({ mode: 'multiple', selectedDates: [] });
  assert.deepEqual(result.dates, []);
  assert.equal(result.errors[0].code, 'no_dates_selected');
});

// ── No mutation ──────────────────────────────────────────────────────

test('15a: input weekdays array is not mutated', () => {
  var weekdays = [1, 3, 5];
  var weekdaysCopy = weekdays.slice();
  expandTaskDates({ mode: 'range', rangeStart: '2026-08-10', rangeEnd: '2026-08-16', weekdays: weekdays });
  assert.deepEqual(weekdays, weekdaysCopy);
});

test('15b: input selectedDates array is not mutated (order and contents preserved)', () => {
  var selectedDates = ['2026-08-14', '2026-08-10', '2026-08-10'];
  var selectedDatesCopy = selectedDates.slice();
  expandTaskDates({ mode: 'multiple', selectedDates: selectedDates });
  assert.deepEqual(selectedDates, selectedDatesCopy);
});

test('15c: the params object itself is not mutated', () => {
  var params = { mode: 'range', rangeStart: '2026-08-10', rangeEnd: '2026-08-14' };
  var paramsCopy = JSON.parse(JSON.stringify(params));
  expandTaskDates(params);
  assert.deepEqual(params, paramsCopy);
});

// ── Month / year boundaries ──────────────────────────────────────────

test('16: month boundary expansion works (Thu 29 Jan - Mon 2 Feb 2026, default weekdays)', () => {
  var result = expandTaskDates({ mode: 'range', rangeStart: '2026-01-29', rangeEnd: '2026-02-02' });
  // 2026-01-31 (Sat) and 2026-02-01 (Sun) must be excluded by the default Mon-Fri filter.
  assert.deepEqual(result.dates, ['2026-01-29', '2026-01-30', '2026-02-02']);
});

test('17: year boundary expansion works (Mon 29 Dec 2025 - Fri 2 Jan 2026, default weekdays)', () => {
  var result = expandTaskDates({ mode: 'range', rangeStart: '2025-12-29', rangeEnd: '2026-01-02' });
  assert.deepEqual(result.dates, ['2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02']);
});

// ── Timezone stability ───────────────────────────────────────────────

test('18: ISO dates do not shift under an extreme negative UTC offset', () => {
  var originalTz = process.env.TZ;
  process.env.TZ = 'Etc/GMT+12'; // UTC-12, one of the furthest-behind-UTC zones available
  try {
    var single = expandTaskDates({ mode: 'single', singleDate: '2026-08-10' });
    assert.deepEqual(single.dates, ['2026-08-10']);
    var range = expandTaskDates({ mode: 'range', rangeStart: '2026-08-10', rangeEnd: '2026-08-14' });
    assert.deepEqual(range.dates, ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14']);
  } finally {
    process.env.TZ = originalTz;
  }
});

test('18b: ISO dates do not shift under an extreme positive UTC offset', () => {
  var originalTz = process.env.TZ;
  process.env.TZ = 'Pacific/Kiritimati'; // UTC+14, one of the furthest-ahead-of-UTC zones available
  try {
    var single = expandTaskDates({ mode: 'single', singleDate: '2026-08-10' });
    assert.deepEqual(single.dates, ['2026-08-10']);
    var range = expandTaskDates({ mode: 'range', rangeStart: '2026-08-10', rangeEnd: '2026-08-14' });
    assert.deepEqual(range.dates, ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14']);
  } finally {
    process.env.TZ = originalTz;
  }
});

// ── Determinism / additional edge coverage ──────────────────────────

test('expandTaskDates is deterministic — repeated calls with the same input return equal results', () => {
  var params = { mode: 'range', rangeStart: '2026-08-10', rangeEnd: '2026-08-16', weekdays: [1, 2, 3, 4, 5, 6, 0] };
  var first = expandTaskDates(params);
  var second = expandTaskDates(params);
  assert.deepEqual(first, second);
});

test('unknown mode returns a structured invalid_mode error', () => {
  var result = expandTaskDates({ mode: 'nonsense' });
  assert.deepEqual(result.dates, []);
  assert.equal(result.errors[0].code, 'invalid_mode');
});

test('calling with no arguments at all does not throw', () => {
  assert.doesNotThrow(function () { expandTaskDates(); });
  var result = expandTaskDates();
  assert.equal(result.errors[0].code, 'invalid_mode');
});

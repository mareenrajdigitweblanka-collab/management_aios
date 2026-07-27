// Unit tests for FRAME-LEVEL ERROR CONTEXT (2026-07-27) — the follow-up
// task closing the "Bulk same-title and Leave hard-block messages are
// row-level but not always frame-specific" gap. Covers the pure, DOM-free
// core.js helpers: classifyTimeFrameSet's frame attribution for
// 'incomplete' once 2+ frames are submitted, and the new
// describeTimeFrameValidation() title/message builder (Single/Edit vs
// Bulk wording, frame-count-gated backward compatibility). No DOM, no
// network — see backend/tests/test_frame_level_error_context.py for the
// server-side contract these mirror, and instance.js's own
// bulkFrameFieldElement/applyBulkRowErrors/validateTimeFrames for the
// DOM-dependent wiring (row/frame targeting, focus, mobile/zoom layout)
// this file cannot exercise without a browser.
//
// Run with: node web-view/js/calendar/frame-level-error-context.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyTimeFrameSet,
  describeTimeFrameValidation,
  TIME_FRAME_VALIDATION_COPY
} from './core.js';

function frame(start, end) { return { start: start || '', end: end || '' }; }

// ── classifyTimeFrameSet: frame attribution for 'incomplete' ────────────
test('single partial frame still reports a=null (unchanged pre-existing shape)', () => {
  var result = classifyTimeFrameSet([frame('09:00', '')]);
  assert.deepEqual(result, { outcome: 'incomplete', a: null, b: null });
});

test('multiple frames: the offending untimed frame is identified by position', () => {
  var result = classifyTimeFrameSet([frame('09:00', '10:00'), frame('', ''), frame('11:00', '12:00')]);
  assert.deepEqual(result, { outcome: 'incomplete', a: 2, b: null });
});

test('multiple frames: a partial (not fully blank) frame is identified too', () => {
  var result = classifyTimeFrameSet([frame('09:00', '10:00'), frame('11:00', '')]);
  assert.deepEqual(result, { outcome: 'incomplete', a: 2, b: null });
});

// ── describeTimeFrameValidation: single-frame case is byte-identical ────
test('frameCount <= 1 returns the exact pre-existing TIME_FRAME_VALIDATION_COPY entry', () => {
  ['incomplete', 'invalid_range', 'duplicate', 'overlap'].forEach(function (outcome) {
    var result = { outcome: outcome, a: 1, b: 2 };
    assert.deepEqual(describeTimeFrameValidation(result, 1, false), TIME_FRAME_VALIDATION_COPY[outcome]);
    assert.deepEqual(describeTimeFrameValidation(result, 0, false), TIME_FRAME_VALIDATION_COPY[outcome]);
  });
});

// ── describeTimeFrameValidation: Single/Edit multi-frame wording ────────
test('1: Single shows "Time frame 2: ..." for an incomplete frame', () => {
  var result = { outcome: 'incomplete', a: 2, b: null };
  var copy = describeTimeFrameValidation(result, 3, false);
  assert.equal(copy.title, 'Complete the task times');
  assert.equal(copy.message, 'Time frame 2: Enter both a start and end time.');
});

test('Single shows "Time frame 3: ..." for an overlap, naming the LATER frame', () => {
  var result = { outcome: 'overlap', a: 1, b: 3 };
  var copy = describeTimeFrameValidation(result, 3, false);
  assert.equal(copy.title, 'Check the task times');
  assert.equal(
    copy.message,
    'Time frame 3: This time overlaps another time frame. Use separate, non-overlapping times.'
  );
});

test('Single duplicate wording has no "for the same task" suffix', () => {
  var copy = describeTimeFrameValidation({ outcome: 'duplicate', a: 1, b: 2 }, 2, false);
  assert.equal(copy.message, 'Time frame 2: This time is already used by another time frame.');
});

test('3: Edit reuses the exact same "Time frame N" wording (frame 1 = the edited occurrence)', () => {
  var copy = describeTimeFrameValidation({ outcome: 'incomplete', a: 1, b: null }, 2, false);
  assert.equal(copy.message, 'Time frame 1: Enter both a start and end time.');
  assert.ok(copy.message.indexOf('Task ') === -1, 'Edit wording must never say "Task N"');
});

// ── describeTimeFrameValidation: Bulk wording (Task N prefix applied by
//    the caller — instance.js bulkRowFieldErrors — this only verifies the
//    base message text Bulk selects) ─────────────────────────────────────
test('2: Bulk overlap wording names "for the same task"', () => {
  var copy = describeTimeFrameValidation({ outcome: 'overlap', a: 1, b: 3 }, 3, true);
  assert.equal(
    copy.message,
    'Time frame 3: This time overlaps another time frame for the same task. Use separate, non-overlapping times.'
  );
});

test('Bulk duplicate wording names "for the same task"', () => {
  var copy = describeTimeFrameValidation({ outcome: 'duplicate', a: 1, b: 2 }, 2, true);
  assert.equal(copy.message, 'Time frame 2: This time is already used by another time frame for the same task.');
});

test('Bulk incomplete/invalid_range wording is identical to Single (no "for the same task")', () => {
  var incomplete = describeTimeFrameValidation({ outcome: 'incomplete', a: 2, b: null }, 3, true);
  var invalidRange = describeTimeFrameValidation({ outcome: 'invalid_range', a: 2, b: null }, 3, true);
  assert.equal(incomplete.message, 'Time frame 2: Enter both a start and end time.');
  assert.equal(invalidRange.message, 'Time frame 2: The end time must be later than the start time.');
});

// ── 4: user-facing numbering never starts at zero ────────────────────────
test('4: every non-null frame index describeTimeFrameValidation can produce is 1-indexed', () => {
  var outcomes = [
    { outcome: 'incomplete', a: 1, b: null },
    { outcome: 'invalid_range', a: 1, b: null },
    { outcome: 'duplicate', a: 1, b: 2 },
    { outcome: 'overlap', a: 1, b: 2 }
  ];
  outcomes.forEach(function (result) {
    var copy = describeTimeFrameValidation(result, 2, false);
    var match = /Time frame (\d+):/.exec(copy.message);
    assert.ok(match, 'message must name a 1-indexed frame: ' + copy.message);
    assert.ok(Number(match[1]) >= 1, 'frame number must never be zero-based: ' + copy.message);
  });
});

test('4b: classifyTimeFrameSet never returns a 0-indexed frame position', () => {
  var cases = [
    [frame('09:00', '10:00'), frame('', '')],
    [frame('10:00', '09:00')],
    [frame('09:00', '10:00'), frame('09:00', '10:00')],
    [frame('09:00', '11:00'), frame('10:00', '12:00')]
  ];
  cases.forEach(function (frames) {
    var result = classifyTimeFrameSet(frames);
    if (result.a !== null) { assert.ok(result.a >= 1); }
    if (result.b !== null) { assert.ok(result.b >= 1); }
  });
});

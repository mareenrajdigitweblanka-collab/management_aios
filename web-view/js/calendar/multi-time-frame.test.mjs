// Unit tests for MULTIPLE TIME FRAMES PER TASK (2026-07-27) — the pure,
// DOM-free core.js helpers: classifyTimeFrameSet (client-side mirror of
// backend/routers/member_schedules.py classify_time_frame_set),
// frontendToMultiFramePayload/frontendToEditPayload (request builders),
// and buildScheduleConfirmationDialogContent's per-frame grouping once a
// submission has more than one time frame. No DOM, no network. Run with:
// node web-view/js/calendar/multi-time-frame.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyTimeFrameSet,
  frontendToMultiFramePayload,
  frontendToEditPayload,
  buildScheduleConfirmationDialogContent,
  SCHEDULE_ADVISORY_LUNCH,
  SCHEDULE_ADVISORY_DIFFERENT_TITLE
} from './core.js';

function frame(start, end) { return { start: start || '', end: end || '' }; }

// ── classifyTimeFrameSet (Phase 20) ─────────────────────────────────────
test('1: one valid timed frame is ok', () => {
  assert.equal(classifyTimeFrameSet([frame('09:00', '10:00')]).outcome, 'ok');
});

test('2: two separate frames are ok', () => {
  var result = classifyTimeFrameSet([frame('09:00', '10:00'), frame('11:00', '12:00')]);
  assert.equal(result.outcome, 'ok');
});

test('3: two adjacent frames are ok', () => {
  var result = classifyTimeFrameSet([frame('09:00', '10:00'), frame('10:00', '11:00')]);
  assert.equal(result.outcome, 'ok');
});

test('4: exact duplicate frames are blocked', () => {
  var result = classifyTimeFrameSet([frame('09:00', '10:00'), frame('09:00', '10:00')]);
  assert.deepEqual(result, { outcome: 'duplicate', a: 1, b: 2 });
});

test('5: partial overlap is blocked', () => {
  var result = classifyTimeFrameSet([frame('09:00', '11:00'), frame('10:00', '12:00')]);
  assert.deepEqual(result, { outcome: 'overlap', a: 1, b: 2 });
});

test('6: contained overlap is blocked', () => {
  var result = classifyTimeFrameSet([frame('09:00', '17:00'), frame('10:00', '11:00')]);
  assert.equal(result.outcome, 'overlap');
});

test('7: invalid end before start', () => {
  var result = classifyTimeFrameSet([frame('10:00', '09:00')]);
  assert.deepEqual(result, { outcome: 'invalid_range', a: 1, b: null });
});

test('8: equal start and end', () => {
  var result = classifyTimeFrameSet([frame('09:00', '09:00')]);
  assert.equal(result.outcome, 'invalid_range');
});

test('9: one blank frame only is ok (untimed task)', () => {
  assert.equal(classifyTimeFrameSet([frame('', '')]).outcome, 'ok');
});

test('10: multiple frames with one untimed is incomplete', () => {
  var result = classifyTimeFrameSet([frame('09:00', '10:00'), frame('', '')]);
  assert.equal(result.outcome, 'incomplete');
});

test('11: partial frame with only start is incomplete', () => {
  assert.equal(classifyTimeFrameSet([frame('09:00', '')]).outcome, 'incomplete');
});

test('12: partial frame with only end is incomplete', () => {
  assert.equal(classifyTimeFrameSet([frame('', '09:00')]).outcome, 'incomplete');
});

test('three frames: first two ok, third overlaps first', () => {
  var result = classifyTimeFrameSet([frame('09:00', '10:00'), frame('11:00', '12:00'), frame('09:30', '09:45')]);
  assert.deepEqual(result, { outcome: 'overlap', a: 1, b: 3 });
});

// ── frontendToMultiFramePayload ─────────────────────────────────────────
test('single frame sends plain start/end, no time_frames key', () => {
  var payload = frontendToMultiFramePayload({
    date: '2099-01-05', title: 'Standup', priority: 'Medium', notes: '',
    frames: [frame('09:00', '10:00')]
  });
  assert.equal(payload.start, '09:00');
  assert.equal(payload.end, '10:00');
  assert.equal('time_frames' in payload, false);
});

test('one blank frame sends null start/end', () => {
  var payload = frontendToMultiFramePayload({
    date: '2099-01-05', title: 'Standup', priority: 'Medium', notes: '',
    frames: [frame('', '')]
  });
  assert.equal(payload.start, null);
  assert.equal(payload.end, null);
});

test('multiple frames send authoritative time_frames, no start/end keys', () => {
  var payload = frontendToMultiFramePayload({
    date: '2099-01-05', title: 'Staff Attendance', priority: 'Medium', notes: '',
    frames: [frame('09:00', '10:00'), frame('11:00', '12:00'), frame('14:00', '15:00')]
  });
  assert.equal('start' in payload, false);
  assert.equal('end' in payload, false);
  assert.deepEqual(payload.time_frames, [
    { start_time: '09:00', end_time: '10:00' },
    { start_time: '11:00', end_time: '12:00' },
    { start_time: '14:00', end_time: '15:00' }
  ]);
});

// ── frontendToEditPayload ────────────────────────────────────────────────
test('edit payload with no additional frames omits additional_time_frames', () => {
  var payload = frontendToEditPayload({
    date: '2099-01-05', title: 'Standup', priority: 'Medium', notes: '',
    start: '09:00', end: '10:00', additionalFrames: []
  });
  assert.equal(payload.start, '09:00');
  assert.equal(payload.end, '10:00');
  assert.equal('additional_time_frames' in payload, false);
});

test('edit payload with additional frames keeps frame-1 start/end and adds the rest', () => {
  var payload = frontendToEditPayload({
    date: '2099-01-05', title: 'Standup', priority: 'Medium', notes: '',
    start: '09:00', end: '10:00',
    additionalFrames: [frame('11:00', '12:00'), frame('14:00', '15:00')]
  });
  assert.equal(payload.start, '09:00');
  assert.equal(payload.end, '10:00');
  assert.deepEqual(payload.additional_time_frames, [
    { start_time: '11:00', end_time: '12:00' },
    { start_time: '14:00', end_time: '15:00' }
  ]);
});

// ── Confirmation dialog content: multi-frame single create/edit ─────────
test('single create with 2 frames: lunch warning on frame 2 uses "Time frame 2" wording', () => {
  var warnings = [{ code: SCHEDULE_ADVISORY_LUNCH, row_index: 2 }];
  var content = buildScheduleConfirmationDialogContent(warnings, 'create');
  assert.match(content.message, /^Time frame 2 is during the lunch break\.$/);
});

test('single create with 2 frames: overlap warning uses "Time frame N overlaps:" wording', () => {
  var warnings = [{
    code: SCHEDULE_ADVISORY_DIFFERENT_TITLE, row_index: 3,
    conflicts: [{ title: 'Staff Attendance', start_time: '14:00', end_time: '15:00' }]
  }];
  var content = buildScheduleConfirmationDialogContent(warnings, 'create');
  assert.match(content.message, /^Time frame 3 overlaps:/);
  assert.match(content.message, /Staff Attendance/);
});

test('edit context with multi-frame warnings still closes with the edit footer', () => {
  var warnings = [{ code: SCHEDULE_ADVISORY_LUNCH, row_index: 1 }, { code: SCHEDULE_ADVISORY_LUNCH, row_index: 2 }];
  var content = buildScheduleConfirmationDialogContent(warnings, 'edit');
  assert.equal(content.footer, 'Do you still want to save these changes?');
});

test('a single-frame submission (row_index null) still uses the original single-candidate content', () => {
  var content = buildScheduleConfirmationDialogContent([{ code: SCHEDULE_ADVISORY_LUNCH, row_index: null }], 'create');
  assert.equal(content.message, 'This task is during the lunch break, from 12:45 PM to 1:30 PM.');
});

// ── Confirmation dialog content: Bulk with multi-frame rows ─────────────
test('bulk row with one frame keeps the original "Task N" wording (frame_index absent)', () => {
  var content = buildScheduleConfirmationDialogContent([{ code: SCHEDULE_ADVISORY_LUNCH, row_index: 1 }], 'bulk');
  assert.match(content.message, /^Task 1 is during the lunch break\.$/);
});

test('bulk row with multiple frames uses "Task N, time frame M" wording', () => {
  var warnings = [{ code: SCHEDULE_ADVISORY_LUNCH, row_index: 2, frame_index: 3 }];
  var content = buildScheduleConfirmationDialogContent(warnings, 'bulk');
  assert.match(content.message, /^Task 2, time frame 3 is during the lunch break\.$/);
});

test('bulk: two different frames of the same row never collapse into one group', () => {
  var warnings = [
    { code: SCHEDULE_ADVISORY_LUNCH, row_index: 1, frame_index: 1 },
    { code: SCHEDULE_ADVISORY_LUNCH, row_index: 1, frame_index: 2 }
  ];
  var content = buildScheduleConfirmationDialogContent(warnings, 'bulk');
  assert.match(content.message, /Task 1, time frame 1 is during the lunch break\./);
  assert.match(content.message, /Task 1, time frame 2 is during the lunch break\./);
});

// Unit tests for the pure MD-priority Schedule Summary helpers in core.js
// (schedule-summary-md-percentage-dashboard, 2026-07-22). No DOM, no
// network — every test feeds plain numbers/objects the backend already
// returns and asserts the presentation-only classification these
// functions produce. Run with: node web-view/js/calendar/summary-helpers.test.mjs
// (package.json in this folder marks it as an ES module for Node; it has
// no effect on the browser, which never reads package.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPercentage,
  getSplitWarningState,
  getMetricStatusCopy,
  combineSummaryStatus,
  getPeriodStatusCopy,
  getSplitBarSegments
} from './core.js';

test('formatPercentage: two decimals, N/A for null/undefined, never 0.00% substitute', () => {
  assert.equal(formatPercentage(59.333), '59.33%');
  assert.equal(formatPercentage(0), '0.00%');
  assert.equal(formatPercentage(100), '100.00%');
  assert.equal(formatPercentage(null), 'N/A');
  assert.equal(formatPercentage(undefined), 'N/A');
});

test('getSplitWarningState: Case A (60/40) is healthy, not a boundary warning', () => {
  assert.deepEqual(getSplitWarningState(60, 40), { state: 'healthy', reason: 'target-met' });
});

test('getSplitWarningState: Case B (50/50) is warning', () => {
  var result = getSplitWarningState(50, 50);
  assert.equal(result.state, 'warning');
});

test('getSplitWarningState: exactly 60.00 Scheduled is not a warning (strict <, not <=)', () => {
  assert.equal(getSplitWarningState(60, 40).state, 'healthy');
});

test('getSplitWarningState: exactly 40.00 Unscheduled is not a warning (strict >, not >=)', () => {
  assert.equal(getSplitWarningState(60, 40).state, 'healthy');
});

test('getSplitWarningState: 59.99 Scheduled triggers warning (scheduled-low reason surfaces when unscheduled is not the trigger)', () => {
  var result = getSplitWarningState(59.99, 40.01);
  assert.equal(result.state, 'warning');
  // unscheduled (40.01) > 40 is also true here since the two are complementary —
  // per the approved rule this reports one reason, and unscheduled-high takes
  // precedence since it is checked first (documented in core.js).
  assert.equal(result.reason, 'unscheduled-high');
});

test('getSplitWarningState: 40.01 Unscheduled triggers warning', () => {
  var result = getSplitWarningState(59.99, 40.01);
  assert.equal(result.state, 'warning');
});

test('getSplitWarningState: scheduled-low reason is reported when unscheduled is not independently over 40 (asymmetric input)', () => {
  // Not a realistic backend pair (they normally sum to 100), but proves the
  // two conditions are evaluated independently rather than one implying the other.
  var result = getSplitWarningState(59, 35);
  assert.equal(result.state, 'warning');
  assert.equal(result.reason, 'scheduled-low');
});

test('getSplitWarningState: zero-denominator N/A is neutral, never a warning', () => {
  assert.deepEqual(getSplitWarningState(null, null), { state: 'neutral', reason: 'no-data' });
  assert.deepEqual(getSplitWarningState(undefined, undefined), { state: 'neutral', reason: 'no-data' });
});

test('getSplitWarningState: Count and Duration are independent calls with independent results', () => {
  var countResult = getSplitWarningState(70, 30); // healthy
  var durationResult = getSplitWarningState(50, 50); // warning
  assert.equal(countResult.state, 'healthy');
  assert.equal(durationResult.state, 'warning');
});

test('getMetricStatusCopy: neutral wording differs for count vs duration', () => {
  var neutral = { state: 'neutral', reason: 'no-data' };
  assert.equal(getMetricStatusCopy('count', neutral).headline, 'No tasks in this period');
  assert.equal(getMetricStatusCopy('duration', neutral).headline, 'Not enough duration data');
});

test('getMetricStatusCopy: healthy has no red/warning wording', () => {
  var healthy = { state: 'healthy', reason: 'target-met' };
  var copy = getMetricStatusCopy('count', healthy);
  assert.equal(copy.headline, 'Scheduled-work target met');
  assert.equal(copy.explanation, '');
});

test('getMetricStatusCopy: warning gives exactly one explanation, matching the triggered reason', () => {
  var unscheduledHigh = { state: 'warning', reason: 'unscheduled-high' };
  assert.equal(getMetricStatusCopy('count', unscheduledHigh).explanation, 'Unscheduled work is above the 40% limit.');
  var scheduledLow = { state: 'warning', reason: 'scheduled-low' };
  assert.equal(getMetricStatusCopy('duration', scheduledLow).explanation, 'Scheduled work is below the 60% target.');
});

test('combineSummaryStatus: either warning wins', () => {
  assert.equal(combineSummaryStatus('warning', 'healthy'), 'warning');
  assert.equal(combineSummaryStatus('healthy', 'warning'), 'warning');
  assert.equal(combineSummaryStatus('warning', 'neutral'), 'warning');
});

test('combineSummaryStatus: both neutral is neutral', () => {
  assert.equal(combineSummaryStatus('neutral', 'neutral'), 'neutral');
});

test('combineSummaryStatus: one neutral + other healthy is healthy', () => {
  assert.equal(combineSummaryStatus('neutral', 'healthy'), 'healthy');
  assert.equal(combineSummaryStatus('healthy', 'neutral'), 'healthy');
});

test('combineSummaryStatus: both healthy is healthy', () => {
  assert.equal(combineSummaryStatus('healthy', 'healthy'), 'healthy');
});

test('getPeriodStatusCopy: maps every combined state to plain-language, non-technical copy', () => {
  assert.equal(getPeriodStatusCopy('warning').label, 'Needs attention');
  assert.equal(getPeriodStatusCopy('neutral').label, 'No task data');
  assert.equal(getPeriodStatusCopy('healthy').label, 'Target met');
});

test('getSplitBarSegments: valid numbers pass through (clamped to 0-100)', () => {
  assert.deepEqual(getSplitBarSegments(60, 40), { scheduledWidth: 60, unscheduledWidth: 40 });
});

test('getSplitBarSegments: invalid/NaN input never reaches a CSS width — returns null instead', () => {
  assert.equal(getSplitBarSegments(NaN, 40), null);
  assert.equal(getSplitBarSegments(60, NaN), null);
  assert.equal(getSplitBarSegments(null, null), null);
  assert.equal(getSplitBarSegments(undefined, undefined), null);
  assert.equal(getSplitBarSegments('60', '40'), null); // non-numeric type guarded, not coerced
});

test('getSplitBarSegments: out-of-range values are clamped, never negative or over 100', () => {
  assert.deepEqual(getSplitBarSegments(-5, 105), { scheduledWidth: 0, unscheduledWidth: 100 });
});

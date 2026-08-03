/* calendar/core.js — calendar constants + pure date/format/layout helpers and
   leave/item domain transforms. Extracted verbatim from the former inline
   calendar IIFE (2026-07-17 frontend modularization). Leaf module: no imports;
   every helper/constant the instance factory needs is exported from here.
   Logic unchanged. */

export var CATEGORY_CLASS = {
  'Scheduled Task': 'task',
  'Unscheduled Task': 'followup'
};

/* User-facing leave-type wording for normal calendar chips/blocks
   (Month/Week/Day/Multi-Day). Maps stored leave_type values to the
   approved display labels. There is no status to append (2026-07-16
   simplification amendment — the approval/status workflow was
   removed) — every leave record the backend returns is active, so
   this is the complete visible/accessible label. */
export var LEAVE_TYPE_DISPLAY_LABEL = {
  'Short Leave': 'Short Leave',
  'Half-Day First': 'First-Half Leave',
  'Half-Day Second': 'Second-Half Leave',
  'Full-Day': 'Full-Day Leave',
  'Multi-Day': 'Multi-Day Leave'
};

export function formatLeaveCalendarLabel(lv) {
  return LEAVE_TYPE_DISPLAY_LABEL[lv.leave_type] || lv.leave_type;
}

/* Client-side mirror of the server's Monday-Friday weekday
   expansion — DISPLAY ONLY (deciding which calendar dates a
   Multi-Day leave chip appears on). It never computes or overrides
   effective_leave_minutes, the short-leave cap, or any conflict
   decision — those are always server-authoritative. */
export function expandWeekdaysClientSide(startDateStr, endDateStr) {
  var start = parseDateStr(startDateStr);
  var end = parseDateStr(endDateStr);
  var out = [];
  var cur = new Date(start);
  while (cur <= end) {
    var dow = cur.getDay(); // 0 Sun .. 6 Sat
    if (dow !== 0 && dow !== 6) { out.push(toDateStr(cur)); }
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/* Which calendar dates a leave record (as returned by the API)
   covers, for Month/Week/Day rendering only. */
export function leaveDatesForItem(lv) {
  if (lv.leave_type === 'Multi-Day') { return expandWeekdaysClientSide(lv.start_date, lv.end_date); }
  return [lv.start_date];
}

/* Display-positioning only (Week/Day time-grid placement) — mirrors
   the confirmed leave-system clock periods so a Half-Day chip is
   drawn at roughly the right place in the grid. This never feeds
   into any deduction, cap, or conflict calculation — those are
   entirely backend-authoritative and read from the API response. */
export var LEAVE_HALF_DAY_FIRST_DISPLAY = { start: '08:30', end: '13:00' };
export var LEAVE_HALF_DAY_SECOND_DISPLAY = { start: '13:30', end: '18:00' };

export function leaveDisplayTimeRange(lv) {
  if (lv.leave_type === 'Short Leave') { return { start: lv.start_time, end: lv.end_time }; }
  if (lv.leave_type === 'Half-Day First') { return LEAVE_HALF_DAY_FIRST_DISPLAY; }
  if (lv.leave_type === 'Half-Day Second') { return LEAVE_HALF_DAY_SECOND_DISPLAY; }
  return null; // Full-Day / Multi-Day render in the all-day row, not the timed area.
}
export var PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };
export var PRIORITY_BADGE = { High: 'badge-blocked', Medium: 'badge-amber', Low: 'badge-pass' };
export var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];
export var DAY_HEADS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export var DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* Google-Calendar-inspired Week/Day time-grid constants (2026-07-13;
   row height raised 48->56px in the 2026-07-20 pixel-close redesign,
   within Google Calendar's own ~48-64px hour-row range). 24 one-hour
   rows at a fixed pixel height keep the pixel<->minutes math for
   drag/resize simple (see timeToMinutes/minutesToTime below) — every
   consumer (row rendering, event top/height positioning, drag delta,
   resize delta, current-time line position) reads this single
   constant, so raising it does not require touching instance.js. */
export var TG_ROW_HEIGHT_PX = 56;
export var TG_HOURS = 24;
export var TG_DEFAULT_SCROLL_HOUR = 7;

export function pad(n) { return n < 10 ? '0' + n : '' + n; }
export function toDateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
export function parseDateStr(dateStr) { return new Date(dateStr + 'T00:00:00'); }

/* DD-MM-YYYY (weekly-schedule-xlsx-export task, 2026-07-24) — the required
   filename/toast date format, distinct from toDateStr()'s YYYY-MM-DD (form
   fields/API payloads) and formatShortDate()'s locale-style "Jul 27"
   (on-screen labels). Pure formatting only, no timezone conversion — the
   caller already resolved the Date to the correct calendar day. */
export function formatDDMMYYYY(d) { return pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear(); }

/* Asia/Colombo-aware "today" as YYYY-MM-DD (Schedule Summary date-ownership
   task, 2026-07-24) — deterministic regardless of the browser's local
   timezone. Distinct from toDateStr(new Date()) above, which is
   browser-local and stays unchanged for existing Calendar "today" behavior
   (Today button, initial Calendar view/anchor date); only the Schedule
   Summary default date uses this. en-CA formats as YYYY-MM-DD directly. */
var COLOMBO_TODAY_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' });
export function getColomboTodayStr() { return COLOMBO_TODAY_FMT.format(new Date()); }

/* Asia/Colombo weekday + time-of-day, expressed as whole seconds since
   Monday 00:00:00 (0..604799) — also consumed by the shared header's
   next-week-planning warning (js/planning-warning.js) to evaluate its
   Friday 07:00:00-through-Sunday 23:59:59 visibility window. Colombo has
   a fixed UTC+5:30 offset (no DST), so this is deterministic regardless
   of the viewer's local timezone or clock. Takes an optional epoch-ms
   timestamp so callers (and tests) can evaluate a specific instant
   instead of "now". */
var COLOMBO_WEEK_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Colombo', weekday: 'short',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
});
var COLOMBO_WEEKDAY_INDEX = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
export function getColomboWeekSeconds(epochMs) {
  var d = typeof epochMs === 'number' ? new Date(epochMs) : new Date();
  var map = {};
  COLOMBO_WEEK_FMT.formatToParts(d).forEach(function (p) { map[p.type] = p.value; });
  var hour = map.hour === '24' ? 0 : parseInt(map.hour, 10);
  var dayIndex = COLOMBO_WEEKDAY_INDEX[map.weekday];
  return dayIndex * 86400 + hour * 3600 + parseInt(map.minute, 10) * 60 + parseInt(map.second, 10);
}

/* Pure Friday 07:00:00 - Sunday 23:59:59 (Colombo) window check for the
   header planning warning. Sunday's end is the end of Sunday (seconds-of-
   week < the following Monday 00:00:00), never Sunday 23:59:59 read as
   "Monday 23:59:59". Kept separate from getColomboWeekSeconds so the
   window boundary itself is unit-testable without touching Intl/Date. */
var PLANNING_WARNING_WINDOW_START = 4 * 86400 + 7 * 3600; // Friday 07:00:00
var PLANNING_WARNING_WINDOW_END = 7 * 86400; // Monday 00:00:00 (exclusive)
export function isWithinPlanningWarningWindow(weekSeconds) {
  return weekSeconds >= PLANNING_WARNING_WINDOW_START && weekSeconds < PLANNING_WARNING_WINDOW_END;
}

export function isValidDateStr(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) { return false; }
  var d = parseDateStr(s);
  return !isNaN(d.getTime());
}

/* Bulk Tasks multi-date expansion (REQ-CAL-BULK-DATES-001, 2026-08-03) —
   Monday=1 .. Sunday=0/7 is NOT used here; this codebase's existing
   convention (parseDateStr/expandWeekdaysClientSide above) is native
   Date.getDay(): 0=Sunday .. 6=Saturday. DEFAULT_RANGE_WEEKDAYS mirrors the
   approved business decision (Monday-Friday selected by default; weekends
   selectable but off by default) using that same convention. */
export var DEFAULT_RANGE_WEEKDAYS = [1, 2, 3, 4, 5]; // Mon..Fri, Date.getDay() values

/* expandTaskDates({ mode, singleDate, rangeStart, rangeEnd, weekdays,
   selectedDates }) -> { dates: string[], errors: [{code, message}] }

   Pure — no DOM access, no network call, no global/current-date dependency,
   no mutation of any input (weekdays/selectedDates arrays are only ever
   read via .filter()/.indexOf(), never assigned into). Deterministic: the
   same input always produces the same output. Reuses this file's existing
   local-calendar-day date handling (parseDateStr/toDateStr, both already
   used by expandWeekdaysClientSide above) rather than introducing a second
   timezone-handling approach — dates are always constructed via
   `new Date(dateStr + 'T00:00:00')` and always read back via local getters
   (.getFullYear()/.getMonth()/.getDate()/.getDay()), never mixed with UTC
   getters/setters, so there is no timezone-conversion drift regardless of
   the browser's local timezone.

   Every failure path returns a structured {code, message} entry — never a
   thrown exception, and never a silently empty `dates` array with no
   explanation attached. */
export function expandTaskDates(params) {
  params = params || {};

  if (params.mode === 'single') {
    if (!params.singleDate || !isValidDateStr(params.singleDate)) {
      return { dates: [], errors: [{ code: 'date_required', message: 'Choose a date.' }] };
    }
    return { dates: [params.singleDate], errors: [] };
  }

  if (params.mode === 'range') {
    var errors = [];
    var start = params.rangeStart;
    var end = params.rangeEnd;
    if (!start || !isValidDateStr(start)) { errors.push({ code: 'start_date_required', message: 'Choose a start date.' }); }
    if (!end || !isValidDateStr(end)) { errors.push({ code: 'end_date_required', message: 'Choose an end date.' }); }
    if (errors.length) { return { dates: [], errors: errors }; }
    if (start > end) {
      return { dates: [], errors: [{ code: 'range_inverted', message: 'End date must not be before start date.' }] };
    }
    // Distinguish "weekdays omitted entirely" (undefined/null -> default
    // Mon-Fri) from "weekdays explicitly passed as an empty array" (every
    // weekday chip unchecked -> a real, reportable error) — a `.length`
    // truthiness check alone cannot tell these two cases apart, since an
    // empty array is falsy either way.
    var weekdaySet = (params.weekdays === undefined || params.weekdays === null) ? DEFAULT_RANGE_WEEKDAYS : params.weekdays;
    if (!weekdaySet.length) {
      return { dates: [], errors: [{ code: 'no_weekdays_selected', message: 'Select at least one day of the week.' }] };
    }
    var out = [];
    var cur = parseDateStr(start);
    var endDate = parseDateStr(end);
    while (cur <= endDate) {
      if (weekdaySet.indexOf(cur.getDay()) !== -1) { out.push(toDateStr(cur)); }
      cur.setDate(cur.getDate() + 1);
    }
    if (out.length === 0) {
      return {
        dates: [],
        errors: [{
          code: 'empty_range',
          message: 'This range and weekday selection produces no dates. Adjust the range or include a weekend day.'
        }]
      };
    }
    return { dates: out, errors: [] }; // already ascending — built by forward iteration; unique by construction (one calendar-day visit each)
  }

  if (params.mode === 'multiple') {
    var selected = params.selectedDates || [];
    var invalid = selected.filter(function (d) { return !isValidDateStr(d); });
    if (invalid.length) {
      return { dates: [], errors: [{ code: 'invalid_date_in_list', message: 'One or more selected dates is invalid.' }] };
    }
    var unique = selected.filter(function (d, i) { return selected.indexOf(d) === i; }).slice().sort();
    if (unique.length === 0) {
      return { dates: [], errors: [{ code: 'no_dates_selected', message: 'Add at least one date.' }] };
    }
    return { dates: unique, errors: [] };
  }

  return { dates: [], errors: [{ code: 'invalid_mode', message: 'Choose a date selection mode.' }] };
}

/* Bulk Tasks multi-date payload/occurrence helpers (REQ-CAL-BULK-DATES-001,
   2026-08-03) — pure, DOM-free, so the actual decision logic driving one
   task-definition card's expansion into several BulkTaskRowIn-shaped
   payload rows is independently testable without mounting
   calendar/instance.js (which has no DOM-level test coverage anywhere in
   this repository — see calendar/instance.js's own module header note;
   this file's existing pure/DOM-free helpers, e.g. classifyTimeFrameSet
   and frontendToMultiFramePayload above, are exactly this same
   "extract the logic, leave the DOM wiring untested" pattern). */

/* Builds one payload row per already-resolved date, copying every OTHER
   field verbatim from `sharedFields` (title/priority/notes/start+end or
   time_frames) — never re-reading or varying it per date, so every row
   this produces is guaranteed field-identical apart from `date` (approved
   design §8 item 2). No date-mode metadata (mode/weekdays/selectedDates)
   is ever included in the output — only plain fields the existing
   BulkTaskCreateRequest.tasks[] contract already accepts. Does not mutate
   `sharedFields` or `dates`. */
export function buildBulkPayloadRowsForDates(sharedFields, dates) {
  var fields = sharedFields || {};
  return (dates || []).map(function (d) {
    var row = { date: d };
    Object.keys(fields).forEach(function (key) { row[key] = fields[key]; });
    return row;
  });
}

/* One task definition's own occurrence count: generated date count x
   resolved time-frame count for that card (Phase 10 — an untimed task or
   a single start/end pair both count as exactly 1 occurrence per date; N
   time_frames counts as N). frameCount is clamped to a minimum of 1 so a
   caller that (incorrectly) passes 0 never produces a negative or
   nonsensical result. */
export function bulkCardOccurrenceCount(dateCount, frameCount) {
  var dates = dateCount || 0;
  var frames = frameCount && frameCount > 0 ? frameCount : 1;
  return dates * frames;
}

/* Sums every card's own occurrence count — the exact Σ(dates x frames)
   formula the backend's own check_occurrence_limit() already applies
   (approved design §9/§10). Pure; does not mutate its input. */
export function totalBulkOccurrenceCount(cardOccurrenceCounts) {
  return (cardOccurrenceCounts || []).reduce(function (sum, n) { return sum + (n || 0); }, 0);
}

/* "10 Aug, 11 Aug, 12 Aug, 13 Aug, 14 Aug + 12 more dates" — shows up to
   `maxInline` dates (default 5, matching the approved design's own
   example), then collapses the remainder rather than rendering an
   unbounded list. Display formatting only — never changes what is
   actually submitted (buildBulkPayloadRowsForDates above is the only
   payload source of truth). Does not mutate `dateStrs`. */
export function formatCompactDateList(dateStrs, maxInline) {
  var cap = maxInline || 5;
  var list = dateStrs || [];
  var shown = list.slice(0, cap).map(function (d) {
    var dt = parseDateStr(d);
    return pad(dt.getDate()) + ' ' + MONTH_NAMES[dt.getMonth()].slice(0, 3);
  });
  var remaining = list.length - shown.length;
  var text = shown.join(', ');
  if (remaining > 0) { text += (text ? ' ' : '') + '+ ' + remaining + ' more date' + (remaining === 1 ? '' : 's'); }
  return text;
}

export function timeToMinutes(t) {
  if (!t) return 0;
  var parts = String(t).split(':');
  return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
}
export function minutesToTime(mins) {
  mins = Math.max(0, Math.min(24 * 60 - 1, Math.round(mins)));
  return pad(Math.floor(mins / 60)) + ':' + pad(mins % 60);
}
export function formatHourLabel(h) {
  var period = h < 12 ? 'AM' : 'PM';
  var hour12 = h % 12; if (hour12 === 0) hour12 = 12;
  return hour12 + ' ' + period;
}
export function formatShortDate(d) { return MONTH_NAMES[d.getMonth()].slice(0, 3) + ' ' + d.getDate(); }

/* Task Created/Updated at display formatter (2026-07-23). Takes the raw
   UTC-aware ISO-8601 string straight from created_at/updated_at (see
   apiItemToFrontend above) and renders it in the fixed business timezone
   Asia/Colombo as "YYYY-MM-DD HH:mm" (24-hour, no seconds) — never the
   browser's local timezone, and never a locale-dependent string (which
   would vary field order/separators between browsers). Built from
   Intl.DateTimeFormat's formatToParts() rather than its formatted string
   output for that reason. Returns the literal 'Not available' for a
   null/undefined/empty/unparsable value — never a substituted or
   generated timestamp. */
export function formatTaskTimestamp(isoString) {
  if (!isoString) { return 'Not available'; }
  var d = new Date(isoString);
  if (isNaN(d.getTime())) { return 'Not available'; }
  var parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(d);
  var map = {};
  parts.forEach(function (p) { map[p.type] = p.value; });
  // Some engines render midnight as hour "24" under hour12:false; normalise to "00".
  var hour = map.hour === '24' ? '00' : map.hour;
  return map.year + '-' + map.month + '-' + map.day + ' ' + hour + ':' + map.minute;
}

/* Display-only duration/percentage/comparison formatters
   (2026-07-14 duration reporting). These only format values the
   backend already computed — no duration, percentage, or change is
   ever calculated in JavaScript. Shared at module scope (not
   redefined per member instance) since they are pure functions with
   no dependency on a particular calendar container. */
export function formatDuration(minutes) {
  var total = Math.max(0, Math.round(minutes || 0));
  var hours = Math.floor(total / 60);
  var mins = total % 60;
  return hours + 'h ' + mins + 'm';
}
/* Single shared percentage formatter for the Schedule Summary count
   and duration split percentages (schedule-summary-count-duration-
   percentage, 2026-07-17). Backend-authoritative: it only formats a
   value the backend already computed — null/undefined (zero
   denominator) renders as N/A, never coerced to 0.00%; a numeric
   value renders to exactly two decimals plus '%' (e.g. 59.33%,
   0.00%, 100.00%). No calculation, and never reads a leave field. */
export function formatPercentage(value) {
  if (value === null || value === undefined) return 'N/A';
  return value.toFixed(2) + '%';
}
export function formatChange(change) {
  if (!change || change.direction === 'not_applicable' || change.percentage === null || change.percentage === undefined) {
    return 'N/A — No duration in either period';
  }
  var arrow = change.direction === 'increase' ? '↑ ' : (change.direction === 'decrease' ? '↓ ' : '');
  var label = change.direction === 'unchanged' ? 'no change' : change.direction;
  return arrow + change.percentage.toFixed(2) + '% ' + label;
}

/* MD-priority Schedule Summary dashboard (schedule-summary-md-percentage-
   dashboard, 2026-07-22) — pure presentation-state helpers only. None of
   these compute a percentage; they classify percentages the backend
   already returned (scheduled_count_percentage / unscheduled_count_percentage
   / scheduled_duration_percentage / unscheduled_duration_percentage) against
   the MD-confirmed 60%/40% thresholds. Kept here (not instance.js) because
   they are pure functions with no DOM dependency, so they can be imported
   and unit-tested directly in Node — see core.summary-helpers.test.mjs. */

/* Classifies one Scheduled/Unscheduled split (Count or Duration) against the
   confirmed thresholds. Rules (approved 2026-07-22):
     - neutral: either percentage is null/undefined (zero denominator).
     - warning: unscheduledPercentage > 40.00 OR scheduledPercentage < 60.00.
     - healthy: neither warning condition holds.
   Both percentages are checked independently — this never assumes one from
   the other, even though the backend derives unscheduled as (100 - scheduled)
   and so in practice they always agree. Boundary values (exactly 60.00
   Scheduled / exactly 40.00 Unscheduled) are NOT warnings (strict > / <).
   When both conditions are true (the normal case, since the two percentages
   are complementary), 'unscheduled-high' is reported as the reason — a
   single concise explanation, per the approved "do not duplicate two warning
   messages for the same imbalance" rule — never 'both'. */
export function getSplitWarningState(scheduledPercentage, unscheduledPercentage) {
  if (scheduledPercentage === null || scheduledPercentage === undefined ||
      unscheduledPercentage === null || unscheduledPercentage === undefined) {
    return { state: 'neutral', reason: 'no-data' };
  }
  var unscheduledHigh = unscheduledPercentage > 40;
  var scheduledLow = scheduledPercentage < 60;
  if (unscheduledHigh) return { state: 'warning', reason: 'unscheduled-high' };
  if (scheduledLow) return { state: 'warning', reason: 'scheduled-low' };
  return { state: 'healthy', reason: 'target-met' };
}

/* Plain-language headline + explanation for one metric block (Count or
   Duration), driven only by the state/reason getSplitWarningState already
   classified — no formula, no re-derivation. `kind` is 'count' or
   'duration' (only changes the neutral/warning wording, per the approved
   "By task count" / "By task duration" labeling). */
export function getMetricStatusCopy(kind, result) {
  if (!result || result.state === 'neutral') {
    return {
      headline: kind === 'duration' ? 'Not enough duration data' : 'No tasks in this period',
      explanation: ''
    };
  }
  if (result.state === 'healthy') {
    return { headline: 'Scheduled-work target met', explanation: '' };
  }
  return {
    headline: kind === 'duration' ? 'High unscheduled time share' : 'High unscheduled task share',
    explanation: result.reason === 'scheduled-low'
      ? 'Scheduled work is below the 60% target.'
      : 'Unscheduled work is above the 40% limit.'
  };
}

/* Period-level combined status from the independent Count and Duration
   states (approved rule, 2026-07-22):
     - either warning -> warning
     - both neutral -> neutral
     - one neutral + the other healthy -> healthy (neutral metric stays
       marked N/A in its own block; this only affects the period badge)
     - both healthy -> healthy */
export function combineSummaryStatus(countState, durationState) {
  if (countState === 'warning' || durationState === 'warning') return 'warning';
  if (countState === 'neutral' && durationState === 'neutral') return 'neutral';
  return 'healthy';
}

export function getPeriodStatusCopy(combinedState) {
  if (combinedState === 'warning') return { label: 'Needs attention', tone: 'warning' };
  if (combinedState === 'neutral') return { label: 'No task data', tone: 'neutral' };
  return { label: 'Target met', tone: 'healthy' };
}

/* Bar-fill widths for the Count/Duration split visual. Returns null (render
   an empty/neutral bar, no red/green fill) when either input is missing or
   not a finite number — this is the one place that guards against a NaN
   ever reaching a CSS width, matching the approved "invalid numeric input
   does not produce NaN in UI" rule. Clamped to [0, 100] as a second
   defensive layer; the backend's own two values already sum to exactly
   100.00 by construction (core.js never re-derives one from the other). */
export function getSplitBarSegments(scheduledPercentage, unscheduledPercentage) {
  if (typeof scheduledPercentage !== 'number' || typeof unscheduledPercentage !== 'number' ||
      isNaN(scheduledPercentage) || isNaN(unscheduledPercentage)) {
    return null;
  }
  return {
    scheduledWidth: Math.max(0, Math.min(100, scheduledPercentage)),
    unscheduledWidth: Math.max(0, Math.min(100, unscheduledPercentage))
  };
}

export function getWeekStart(d) {
  var copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}
/* Monday-Sunday week convention for the weekly *report* only
   (2026-07-14 duration reporting). Deliberately kept separate from
   getWeekStart() above, which stays Sunday-start and is used
   exclusively by the calendar's own Week view grid layout
   (getWeekDays/renderTimeGrid) — changing that shared function would
   silently shift the calendar Week view's start day, which is out of
   scope for this reporting feature and would regress an unrelated,
   already-verified feature (see
   validation/schedule-duration-reporting-check-2026-07-14.md). The
   backend independently normalizes any week_start it receives to the
   Monday of that date's week, so this only needs to compute the
   correct Monday — it does not need to duplicate any comparison
   logic. */
export function getReportWeekStart(d) {
  var day = d.getDay(); // 0 = Sunday ... 6 = Saturday
  var diffToMonday = day === 0 ? 6 : day - 1;
  var copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() - diffToMonday);
  return copy;
}
export function getWeekDays(anchor) {
  var start = getWeekStart(anchor);
  var days = [];
  for (var i = 0; i < 7; i++) { var d = new Date(start); d.setDate(start.getDate() + i); days.push(d); }
  return days;
}

/* Shared 42-cell month-grid date math — used by both the Month view
   and the mini date-navigation picker, so grid layout is defined once. */
export function buildMonthGridCells(y, m) {
  var firstOfMonth = new Date(y, m, 1);
  var startOffset = firstOfMonth.getDay();
  var gridStart = new Date(y, m, 1 - startOffset);
  var cells = [];
  for (var i = 0; i < 42; i++) {
    var cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    cells.push({ date: cellDate, dateStr: toDateStr(cellDate), inMonth: cellDate.getMonth() === m });
  }
  return cells;
}

/* Greedy same-day overlap layout (the standard technique most calendar
   UIs use): items sorted by start time each claim the first column
   whose previous occupant has already ended, else open a new column.
   Columns are shared across the whole day (not recomputed per
   overlap-cluster) — a deliberate simplification that is correct but
   can leave narrower-than-necessary columns when, e.g., one long event
   overlaps two short back-to-back ones; acceptable for this dataset's
   scale (a handful of sample/testing items per day). */
export function layoutOverlappingItems(timedItems) {
  var sorted = timedItems.slice().sort(function (a, b) {
    var as = timeToMinutes(a.start), bs = timeToMinutes(b.start);
    if (as !== bs) return as - bs;
    return timeToMinutes(a.end || a.start) - timeToMinutes(b.end || b.start);
  });
  var columnEnds = [];
  var placed = sorted.map(function (it) {
    var start = timeToMinutes(it.start);
    var end = it.end ? timeToMinutes(it.end) : start + 30;
    var colIndex = -1;
    for (var i = 0; i < columnEnds.length; i++) {
      if (columnEnds[i] <= start) { colIndex = i; break; }
    }
    if (colIndex === -1) { colIndex = columnEnds.length; columnEnds.push(0); }
    columnEnds[colIndex] = end;
    return { item: it, col: colIndex, startMin: start, endMin: end };
  });
  var totalCols = Math.max(1, columnEnds.length);
  placed.forEach(function (p) { p.totalCols = totalCols; });
  return placed;
}
export function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}

/* Converts a backend member_schedule_events row (event_date/start_time/end_time)
   into the frontend item shape (date/start/end) the render functions expect.
   Backend times come back as "HH:MM:SS" — trimmed to "HH:MM" for the <input type="time"> fields. */
export function apiItemToFrontend(apiItem) {
  function trimTime(t) { return t ? String(t).slice(0, 5) : ''; }
  return {
    id: apiItem.id,
    date: apiItem.date,
    title: apiItem.title,
    category: apiItem.category,
    priority: apiItem.priority,
    start: trimTime(apiItem.start),
    end: trimTime(apiItem.end),
    notes: apiItem.notes || '',
    /* Task Created/Updated at (2026-07-23) — passed through verbatim from
       the API's created_at/updated_at (backend/schemas.py
       MemberScheduleEventOut), same field names, no renaming or
       recalculation. Read-only display data only — never included in
       frontendToApiPayload() below, so it can never be sent back on
       Create/Update. */
    created_at: apiItem.created_at || null,
    updated_at: apiItem.updated_at || null,
    /* Task outcome (CONFIRMED UNTOUCHED-TASK OUTCOME, 2026-07-24) —
       passed through verbatim from the API's outcome/outcome_status/
       outcome_locked (backend/schemas.py MemberScheduleEventOut).
       outcome_status ('Pending'/'Completed'/'Uncompleted'/'No response')
       and outcome_locked are backend-derived on every response; never
       recomputed here. Not included in frontendToApiPayload() below —
       outcome is set via its own dedicated endpoint (PUT .../outcome),
       never through Create/Update. */
    outcome: apiItem.outcome || null,
    outcome_status: apiItem.outcome_status || 'Pending',
    outcome_locked: !!apiItem.outcome_locked,
    /* FINAL CONFIRMED REASON-TRANSITION RULE (2026-07-24) — passed through
       verbatim, same as outcome above. outcome_reason is always null once
       outcome is null/'Completed' (backend-enforced — see
       backend/schemas.py TaskOutcomeUpdate and the DB pairing CHECK
       constraint), so there is nothing here that "hides" a cleared reason;
       it reads as absent because the backend already cleared it.
       outcome_updated_at/outcome_updated_by are carried through for
       completeness (parity with created_at/updated_at above) but are not
       yet rendered anywhere in the UI. */
    outcome_reason: apiItem.outcome_reason || null,
    outcome_updated_at: apiItem.outcome_updated_at || null,
    outcome_updated_by: apiItem.outcome_updated_by || null
  };
}

/* Converts the frontend form/item shape into the backend create/update payload.
   Empty start/end strings are sent as null — the backend Optional[time] field
   rejects an empty string, and null is how "no time set" is represented server-side.
   category is deliberately never included (2026-07-22) — the backend is the
   only authority for category classification; the frontend has no category
   field to send it from. */
export function frontendToApiPayload(fields) {
  return {
    date: fields.date,
    title: fields.title,
    priority: fields.priority,
    start: fields.start ? fields.start : null,
    end: fields.end ? fields.end : null,
    notes: fields.notes ? fields.notes : null
  };
}

/* ── MULTIPLE TIME FRAMES PER TASK (2026-07-27) ──────────────────────────
   Client-side mirror of backend/routers/member_schedules.py
   classify_time_frame_set — run before every Single Task / Bulk row /
   Task Edit submission so a doomed request never round-trips to the
   server first (same "mirror the backend rule client-side" convention
   validateTaskTimeRange() already established for the single-pair
   end>start check). frames: array of {start, end} HH:MM strings (each
   may be '' or falsy for an unset field) — 1-indexed by array position to
   match what the user sees as "Time frame N". Returns {outcome, a, b}:
   outcome is 'ok' | 'incomplete' | 'invalid_range' | 'duplicate' |
   'overlap'; a/b are the 1-indexed frame position(s) involved (null when
   not applicable). This is a pure mirror only — the backend re-validates
   from scratch on every request regardless of what this function decided
   client-side. */
export function classifyTimeFrameSet(frames) {
  function isBlank(f) { return !f.start && !f.end; }
  function isComplete(f) { return !!f.start && !!f.end; }

  if (frames.length === 1) {
    if (isBlank(frames[0])) { return { outcome: 'ok', a: null, b: null }; }
    if (!isComplete(frames[0])) { return { outcome: 'incomplete', a: null, b: null }; }
  } else {
    /* FRAME-LEVEL ERROR CONTEXT (2026-07-27) — mirrors the backend's own
       classify_time_frame_set fix: once 2+ frames are submitted, the
       offending frame's 1-indexed position is always identifiable, so it
       is returned here too (a stays null only for the single-frame case
       above, where there is no "which frame" question to answer). */
    for (var i = 0; i < frames.length; i++) {
      if (!isComplete(frames[i])) { return { outcome: 'incomplete', a: i + 1, b: null }; }
    }
  }

  for (var j = 0; j < frames.length; j++) {
    var f = frames[j];
    if (f.start && f.end && timeToMinutes(f.end) <= timeToMinutes(f.start)) {
      return { outcome: 'invalid_range', a: j + 1, b: null };
    }
  }

  for (var x = 0; x < frames.length; x++) {
    var frameA = frames[x];
    if (!frameA.start || !frameA.end) { continue; }
    for (var y = x + 1; y < frames.length; y++) {
      var frameB = frames[y];
      if (!frameB.start || !frameB.end) { continue; }
      if (frameA.start === frameB.start && frameA.end === frameB.end) {
        return { outcome: 'duplicate', a: x + 1, b: y + 1 };
      }
      var aStart = timeToMinutes(frameA.start), aEnd = timeToMinutes(frameA.end);
      var bStart = timeToMinutes(frameB.start), bEnd = timeToMinutes(frameB.end);
      if (aStart < bEnd && bStart < aEnd) {
        return { outcome: 'overlap', a: x + 1, b: y + 1 };
      }
    }
  }

  return { outcome: 'ok', a: null, b: null };
}

/* Title/message copy for each non-'ok' classifyTimeFrameSet() outcome —
   PHASE 4/5's exact approved wording, shared by Single Task, Bulk rows,
   and Task Edit so all three surfaces show identical text for the same
   underlying problem. Mirrors backend TIME_FRAME_VALIDATION_MESSAGES
   (member_schedules.py) — kept as an independent frontend copy, matching
   this codebase's existing convention (see ui/error-mapper.js). */
export var TIME_FRAME_VALIDATION_COPY = {
  incomplete: {
    title: 'Complete the task times',
    message: 'Enter both a start and end time for every time frame, or keep only one untimed task.'
  },
  invalid_range: {
    title: 'Check the task times',
    message: 'The end time must be later than the start time.'
  },
  duplicate: {
    title: 'Check the task times',
    message: 'Two time frames use the same start and end time. Change or remove one of them.'
  },
  overlap: {
    title: 'Check the task times',
    message: 'Two time frames overlap. Use separate, non-overlapping times.'
  }
};

/* ── FRAME-LEVEL ERROR CONTEXT (2026-07-27) ──────────────────────────────
   Base (unprefixed) message text once a submission genuinely has more
   than one time frame — mirrors backend/routers/member_schedules.py
   _TIME_FRAME_SHAPE_BASE_MESSAGE / _BULK_TIME_FRAME_SHAPE_BASE_MESSAGE
   word-for-word, so client-side pre-validation shows the EXACT same text
   a server round-trip would have. Bulk's duplicate/overlap wording
   additionally names "for the same task" — see the backend module note
   for why. */
var _TIME_FRAME_SHAPE_BASE_MESSAGE = {
  incomplete: 'Enter both a start and end time.',
  invalid_range: 'The end time must be later than the start time.',
  duplicate: 'This time is already used by another time frame.',
  overlap: 'This time overlaps another time frame. Use separate, non-overlapping times.'
};

var _BULK_TIME_FRAME_SHAPE_BASE_MESSAGE = {
  incomplete: _TIME_FRAME_SHAPE_BASE_MESSAGE.incomplete,
  invalid_range: _TIME_FRAME_SHAPE_BASE_MESSAGE.invalid_range,
  duplicate: 'This time is already used by another time frame for the same task.',
  overlap: 'This time overlaps another time frame for the same task. Use separate, non-overlapping times.'
};

/* Single entry point for "what title/message should this
   classifyTimeFrameSet() result show" — used by both the Single/Edit form
   (validateTimeFrames()) and each Bulk row's own pre-submit check
   (bulkRowFieldErrors()), so the two surfaces can never drift into
   different wording for the same underlying problem. frameCount <= 1
   returns EXACTLY TIME_FRAME_VALIDATION_COPY[result.outcome] — the
   pre-existing, unprefixed message — byte-for-byte unaffected by this
   task. frameCount > 1 prefixes the message with "Time frame N: " (the
   offending frame — duplicate/overlap name the LATER of the two
   conflicting frames, matching the backend's own convention) and keeps
   the SAME title (incomplete keeps "Complete the task times"; every
   other outcome keeps "Check the task times"). forBulk selects the
   Bulk-specific "for the same task" wording for duplicate/overlap. */
export function describeTimeFrameValidation(result, frameCount, forBulk) {
  var copy = TIME_FRAME_VALIDATION_COPY[result.outcome];
  if (!frameCount || frameCount <= 1) { return copy; }
  var frameIndex = (result.outcome === 'incomplete' || result.outcome === 'invalid_range')
    ? result.a
    : result.b; // duplicate/overlap — later of the two conflicting frames
  var base = (forBulk ? _BULK_TIME_FRAME_SHAPE_BASE_MESSAGE : _TIME_FRAME_SHAPE_BASE_MESSAGE)[result.outcome];
  return { title: copy.title, message: 'Time frame ' + frameIndex + ': ' + base };
}

/* Builds the Single Task create/update request body when the form has one
   or more time frames (MULTIPLE TIME FRAMES PER TASK, 2026-07-27).
   frames: array of {start, end} HH:MM strings, already known shape-valid
   (classifyTimeFrameSet returned 'ok') and in Time-frame-1-first order.
   A single frame is sent using the pre-existing plain start/end fields —
   byte-for-byte the same request frontendToApiPayload has always built —
   so the common one-time-frame case never changes on the wire; two or
   more frames are sent as the additive `time_frames` array instead
   (authoritative — start/end are omitted entirely, never both present,
   matching the backend's contradictory-fields rule). */
export function frontendToMultiFramePayload(fields) {
  var base = {
    date: fields.date,
    title: fields.title,
    priority: fields.priority,
    notes: fields.notes ? fields.notes : null
  };
  var frames = fields.frames || [];
  if (frames.length <= 1) {
    var only = frames[0] || {};
    base.start = only.start ? only.start : null;
    base.end = only.end ? only.end : null;
    return base;
  }
  base.time_frames = frames.map(function (f) {
    return { start_time: f.start ? f.start : null, end_time: f.end ? f.end : null };
  });
  return base;
}

/* Builds the Task Edit request body (MULTIPLE TIME FRAMES PER TASK,
   2026-07-27) — the edited occurrence's own date/title/priority/start/end
   are sent exactly as frontendToApiPayload has always sent them ("Time
   frame 1" is always the occurrence being edited, never reshaped into
   time_frames); additionalFrames (if any) become the additive
   `additional_time_frames` array of brand-new sibling occurrences. Absent
   or empty additionalFrames omits the key entirely — byte-for-byte the
   same request this form has always built for a plain edit. */
export function frontendToEditPayload(fields) {
  var base = frontendToApiPayload(fields);
  var additional = fields.additionalFrames || [];
  if (additional.length > 0) {
    base.additional_time_frames = additional.map(function (f) {
      return { start_time: f.start ? f.start : null, end_time: f.end ? f.end : null };
    });
  }
  return base;
}

/* LUNCH-BREAK AND DIFFERENT-TITLE TASK-OVERLAP CONFIRMATION (2026-07-27,
   plain-language copy pass same day) — advisory codes mirrored from
   backend/routers/member_schedules.py ADVISORY_LUNCH_BREAK_OVERLAP/
   ADVISORY_DIFFERENT_TASK_TIME_OVERLAP (kept as plain string literals
   here, not a shared JSON contract file, matching this codebase's
   existing convention of mirroring backend error codes as frontend
   string constants — see ui/error-mapper.js KNOWN_ERRORS). */
export var SCHEDULE_ADVISORY_LUNCH = 'lunch_break_overlap';
export var SCHEDULE_ADVISORY_DIFFERENT_TITLE = 'different_task_time_overlap';

/* Plain-language copy pass (2026-07-27, same day as the original advisory
   feature) — replaces the earlier "This Task overlaps..." system wording
   with member-facing language that says what's wrong, which existing Task
   conflicts, the conflicting time, and what happens on Continue. No
   mention of "member"/"date"/"advisory"/"interval"/"fingerprint"/
   "validation"/"request"/"backend" anywhere in the built strings. */

/* "13:15" (24-hour, backend's %H:%M convention — see
   _dedupe_and_sort_conflict_details in member_schedules.py) -> "1:15 PM".
   Pure, DOM-free. Deliberately local to this module rather than reusing
   formatHourLabel() above, which only ever labels a whole hour (the Time
   Grid's hour-axis ticks) and has no minutes component to format. Returns
   '' for a missing/malformed value rather than throwing, so a defensive
   caller never has to guard first. */
export function formatTimeAmPm(hhmm) {
  if (!hhmm) { return ''; }
  var parts = hhmm.split(':');
  var hour = parseInt(parts[0], 10);
  var minute = parts[1] || '00';
  if (isNaN(hour)) { return ''; }
  var period = hour < 12 ? 'AM' : 'PM';
  var hour12 = hour % 12;
  if (hour12 === 0) { hour12 = 12; }
  return hour12 + ':' + minute + ' ' + period;
}

var MAX_CONFLICTS_SHOWN = 5;

/* Display-only dedup + sort, mirroring the backend's own
   _dedupe_and_sort_conflict_details (member_schedules.py) — kept as an
   independent frontend copy (not re-fetched from the network) since the
   backend already sends conflicts pre-deduped/sorted; this second pass is
   a defensive no-op against a well-formed backend response and the actual
   contract this file's own unit tests exercise directly against raw
   conflict arrays. Never mutates its input. */
function dedupeAndSortConflicts(conflicts) {
  var seen = {};
  var deduped = [];
  (conflicts || []).forEach(function (c) {
    var key = (c.title || '') + '|' + (c.start_time || '') + '|' + (c.end_time || '');
    if (seen[key]) { return; }
    seen[key] = true;
    deduped.push(c);
  });
  deduped.sort(function (a, b) {
    var byStart = (a.start_time || '').localeCompare(b.start_time || '');
    if (byStart !== 0) { return byStart; }
    var byEnd = (a.end_time || '').localeCompare(b.end_time || '');
    if (byEnd !== 0) { return byEnd; }
    return (a.title || '').localeCompare(b.title || '');
  });
  return deduped;
}

/* One readable line for a single conflicting Task — STEP 5's exact
   format ("<Task title> — <start time> to <end time>"), with the
   documented fallback ("Another task — <start> to <end>") whenever a
   title is unexpectedly missing/blank, so the dialog can never render
   undefined/null or blank quote punctuation. */
function conflictLine(c) {
  var title = c && c.title ? c.title : null;
  var label = title ? '“' + title + '”' : 'Another task';
  return label + ' — ' + formatTimeAmPm(c && c.start_time) + ' to ' + formatTimeAmPm(c && c.end_time);
}

/* Already-deduped/sorted conflicts -> display lines, capped at
   MAX_CONFLICTS_SHOWN with a trailing "And N more scheduled tasks." line
   when the real count exceeds the cap (STEP 6). */
function conflictListLines(dedupedConflicts) {
  var shown = dedupedConflicts.slice(0, MAX_CONFLICTS_SHOWN);
  var lines = shown.map(conflictLine);
  var remaining = dedupedConflicts.length - shown.length;
  if (remaining > 0) { lines.push('And ' + remaining + ' more scheduled tasks.'); }
  return lines;
}

var LUNCH_SENTENCE = 'This task is during the lunch break, from 12:45 PM to 1:30 PM.';

function editFooter() { return 'Do you still want to save these changes?'; }

/* Builds the single-candidate (Single Task create / Task edit) dialog
   content: { message, listItems, footer }. `message` is the lead-in
   narrative paragraph (no embedded conflict details — those always live
   in `listItems`, a real list even when there is exactly one conflict, so
   the dialog can render it as a semantic list item); `footer` is the
   closing question, context-dependent (STEP 9: Edit always closes with
   "Do you still want to save these changes?", overriding whatever
   Create's own closing question would have been). */
function buildSingleDialogContent(warnings, context) {
  var list = warnings || [];
  var lunch = list.some(function (w) { return w.code === SCHEDULE_ADVISORY_LUNCH; });
  var overlapWarning = list.filter(function (w) { return w.code === SCHEDULE_ADVISORY_DIFFERENT_TITLE; })[0];
  var deduped = overlapWarning ? dedupeAndSortConflicts(overlapWarning.conflicts) : [];
  var isEdit = context === 'edit';

  if (lunch && deduped.length === 1) {
    return {
      message: LUNCH_SENTENCE.slice(0, -1) + ', and it also overlaps:',
      listItems: [conflictLine(deduped[0])],
      footer: isEdit ? editFooter() : 'Do you still want to add it?'
    };
  }
  if (lunch && deduped.length > 1) {
    return {
      message: 'This task is during the lunch break, from 12:45 PM to 1:30 PM, and it also overlaps '
        + deduped.length + ' other scheduled tasks.\n\nPlease review the conflicting task times before continuing.',
      listItems: conflictListLines(deduped),
      footer: isEdit ? editFooter() : null
    };
  }
  if (lunch) {
    return { message: LUNCH_SENTENCE, listItems: [], footer: isEdit ? editFooter() : 'Do you still want to add it?' };
  }
  if (deduped.length === 1) {
    return {
      message: 'Another task is already scheduled during this time:',
      listItems: [conflictLine(deduped[0])],
      footer: isEdit ? editFooter() : 'Do you still want to add this task?'
    };
  }
  if (deduped.length > 1) {
    return {
      message: 'This time overlaps ' + deduped.length + ' other scheduled tasks.'
        + '\n\nPlease review the conflicting task times before continuing.',
      listItems: conflictListLines(deduped),
      footer: isEdit ? editFooter() : null
    };
  }
  // Defensive fallback only — every real response carries at least one
  // warning by the time this dialog is shown at all.
  return {
    message: 'This task needs confirmation before it can be saved.',
    listItems: [],
    footer: isEdit ? editFooter() : null
  };
}

/* One warned group's (a Bulk row, or — MULTIPLE TIME FRAMES PER TASK,
   2026-07-27 — one time frame of a Single create/Edit submission) block of
   lines (STEP 8) — friendly, caller-supplied `label` (never the zero-based
   array index), covering all four combinations (lunch only / overlap only
   / both / — a warned group always has at least one of the two, so
   "neither" never occurs here). Renamed from buildBulkRowLines (2026-07-27)
   to buildWarningGroupLines when this became shared with the new
   per-time-frame confirmation grouping below — Bulk's own call site is
   unchanged in behavior, only the parameter is now a pre-built label
   string instead of a bare row number. */
function buildWarningGroupLines(label, hasLunch, rawConflicts) {
  var deduped = dedupeAndSortConflicts(rawConflicts);
  if (hasLunch && deduped.length === 1) {
    return [label + ' is during lunch and overlaps:', conflictLine(deduped[0])];
  }
  if (hasLunch && deduped.length > 1) {
    return [label + ' is during lunch and overlaps ' + deduped.length + ' other scheduled tasks:']
      .concat(conflictListLines(deduped));
  }
  if (hasLunch) {
    return [label + ' is during the lunch break.'];
  }
  if (deduped.length === 1) {
    return [label + ' overlaps:', conflictLine(deduped[0])];
  }
  if (deduped.length > 1) {
    return [label + ' overlaps ' + deduped.length + ' other scheduled tasks:']
      .concat(conflictListLines(deduped));
  }
  return [];
}

/* MULTIPLE TIME FRAMES PER TASK (2026-07-27) — Bulk's own friendly label:
   "Task N" for a row with exactly one time frame (unchanged wording from
   before this feature), "Task N, time frame M" once that row has more
   than one (frame_index is only ever present on a warning in that case —
   see backend/routers/member_schedules.py build_schedule_confirmation). */
function bulkGroupLabel(rowNumber, frameIndex) {
  if (frameIndex === null || frameIndex === undefined) { return 'Task ' + rowNumber; }
  return 'Task ' + rowNumber + ', time frame ' + frameIndex;
}

/* Builds the Bulk Tasks dialog content — one combined message covering
   every warned row/frame (never one popup per row, never sequential
   popups), friendly-numbered, ending with the one Bulk-specific closing
   question (STEP 8). Bulk's per-row structure doesn't reduce to a single
   flat list the way the single-candidate case does (multiple rows, each
   with its own optional conflict sub-list), so — unlike
   buildSingleDialogContent — every group's lines (including its own
   conflict lines) are folded into one readable `message` block;
   `listItems` stays empty for Bulk. Grouped by (row_index, frame_index)
   composite key (2026-07-27) rather than row_index alone, so two
   different time frames of the same multi-frame row never collapse into
   one group. */
function buildBulkDialogContent(warnings) {
  var byGroup = {};
  var order = [];
  (warnings || []).forEach(function (w) {
    if (w.row_index === null || w.row_index === undefined) { return; }
    var frameIndex = (w.frame_index === null || w.frame_index === undefined) ? null : w.frame_index;
    var key = w.row_index + ':' + (frameIndex === null ? '' : frameIndex);
    if (!byGroup[key]) {
      byGroup[key] = { rowNumber: w.row_index, frameIndex: frameIndex, lunch: false, conflicts: [] };
      order.push(key);
    }
    if (w.code === SCHEDULE_ADVISORY_LUNCH) { byGroup[key].lunch = true; }
    if (w.code === SCHEDULE_ADVISORY_DIFFERENT_TITLE) { byGroup[key].conflicts = w.conflicts || []; }
  });
  order.sort(function (a, b) {
    var groupA = byGroup[a], groupB = byGroup[b];
    if (groupA.rowNumber !== groupB.rowNumber) { return groupA.rowNumber - groupB.rowNumber; }
    return (groupA.frameIndex || 0) - (groupB.frameIndex || 0);
  });
  var blocks = order.map(function (key) {
    var group = byGroup[key];
    var label = bulkGroupLabel(group.rowNumber, group.frameIndex);
    return buildWarningGroupLines(label, group.lunch, group.conflicts).join('\n');
  });
  return {
    message: blocks.join('\n\n'),
    listItems: [],
    footer: 'Do you still want to add all these tasks?'
  };
}

/* MULTIPLE TIME FRAMES PER TASK (2026-07-27) — Single create/Task edit
   dialog content when the submission has MORE THAN ONE time frame (every
   warning then carries its own frame's 1-indexed row_index instead of
   null — see build_schedule_confirmation's row_index contract). Mirrors
   buildBulkDialogContent's per-group structure exactly, but with "Time
   frame N" labels (no "Task" prefix — there is only one Task here, split
   across several frames) and the ordinary create/edit closing question
   context (STEP 9) rather than Bulk's. */
function buildMultiFrameDialogContent(warnings, context) {
  var byFrame = {};
  var frameNumbers = [];
  (warnings || []).forEach(function (w) {
    if (w.row_index === null || w.row_index === undefined) { return; }
    if (!byFrame[w.row_index]) {
      byFrame[w.row_index] = { lunch: false, conflicts: [] };
      frameNumbers.push(w.row_index);
    }
    if (w.code === SCHEDULE_ADVISORY_LUNCH) { byFrame[w.row_index].lunch = true; }
    if (w.code === SCHEDULE_ADVISORY_DIFFERENT_TITLE) { byFrame[w.row_index].conflicts = w.conflicts || []; }
  });
  frameNumbers.sort(function (a, b) { return a - b; });
  var blocks = frameNumbers.map(function (frameNumber) {
    var frame = byFrame[frameNumber];
    return buildWarningGroupLines('Time frame ' + frameNumber, frame.lunch, frame.conflicts).join('\n');
  });
  return {
    message: blocks.join('\n\n'),
    listItems: [],
    footer: context === 'edit' ? editFooter() : 'Do you still want to add these time frames?'
  };
}

/* Builds the "Check this task time" dialog content from the backend's
   warnings array. `context` is 'create' (default) | 'edit' | 'bulk' —
   selects the closing question (STEP 9) and the Bulk-specific per-row
   structure (STEP 8). MULTIPLE TIME FRAMES PER TASK (2026-07-27): for
   'create'/'edit', a submission with only one time frame keeps using the
   original single-candidate content builder (row_index is always null in
   that case, byte-for-byte the same dialog as before this feature); once
   any warning carries a non-null row_index (2+ frames submitted),
   buildMultiFrameDialogContent's per-frame grouping takes over instead.
   Pure, DOM-free — returns { message, listItems, footer } for
   web-view/js/ui/dialog.js to render (message + footer as plain-text
   paragraphs, listItems as a real <ul>). */
export function buildScheduleConfirmationDialogContent(warnings, context) {
  if (context === 'bulk') { return buildBulkDialogContent(warnings); }
  var hasFrameNumbering = (warnings || []).some(function (w) {
    return w.row_index !== null && w.row_index !== undefined;
  });
  if (hasFrameNumbering) { return buildMultiFrameDialogContent(warnings, context || 'create'); }
  return buildSingleDialogContent(warnings, context || 'create');
}


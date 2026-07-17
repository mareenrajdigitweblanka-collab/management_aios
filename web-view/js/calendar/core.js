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

/* Google-Calendar-inspired Week/Day time-grid constants (2026-07-13).
   24 one-hour rows at a fixed pixel height keep the pixel<->minutes
   math for drag/resize simple (see timeToMinutes/minutesToTime below). */
export var TG_ROW_HEIGHT_PX = 48;
export var TG_HOURS = 24;
export var TG_DEFAULT_SCROLL_HOUR = 7;

export function pad(n) { return n < 10 ? '0' + n : '' + n; }
export function toDateStr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
export function parseDateStr(dateStr) { return new Date(dateStr + 'T00:00:00'); }
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
    notes: apiItem.notes || ''
  };
}

/* Converts the frontend form/item shape into the backend create/update payload.
   Empty start/end strings are sent as null — the backend Optional[time] field
   rejects an empty string, and null is how "no time set" is represented server-side. */
export function frontendToApiPayload(fields) {
  return {
    date: fields.date,
    title: fields.title,
    category: fields.category,
    priority: fields.priority,
    start: fields.start ? fields.start : null,
    end: fields.end ? fields.end : null,
    notes: fields.notes ? fields.notes : null
  };
}


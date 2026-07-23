/* calendar/date-icon.js — shared "today" date-icon updater
   (dynamic-today-date-calendar-icon task, 2026-07-23).

   Every member calendar's identity icon displays today's day-of-month in
   Asia/Colombo time. The icon represents "today" only — it is intentionally
   independent of any calendar instance's selected date, viewed month/week/
   day, or Calendar/Tasks mode (see mountScheduleCalendarInstance, which never
   feeds this module a selected/viewed date).

   One shared updater drives every registered icon element instead of each
   of the five member calendars running its own timer/listener pair. */

var COLOMBO_TZ = 'Asia/Colombo';

var dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: COLOMBO_TZ, day: 'numeric' });
var labelFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: COLOMBO_TZ, day: 'numeric', month: 'long', year: 'numeric'
});
var clockFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: COLOMBO_TZ, hour12: false,
  hour: '2-digit', minute: '2-digit', second: '2-digit'
});

var registered = new Set();
var midnightTimer = null;
var listenersAttached = false;

function colomboClockParts(now) {
  var parts = clockFmt.formatToParts(now).reduce(function (acc, p) {
    acc[p.type] = p.value;
    return acc;
  }, {});
  return {
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}

/* Derived from the current Asia/Colombo clock reading rather than a
   hardcoded UTC+05:30 offset, so this stays correct even if the runtime's
   tzdata for Colombo ever changes. */
function millisecondsUntilNextColomboMidnight(now) {
  var t = colomboClockParts(now);
  var elapsedMs = (t.hour * 3600 + t.minute * 60 + t.second) * 1000;
  var msUntilMidnight = (24 * 60 * 60 * 1000) - elapsedMs;
  return msUntilMidnight <= 0 ? (24 * 60 * 60 * 1000) : msUntilMidnight;
}

function paint() {
  var now = new Date();
  var day = dayFmt.format(now);
  var label = 'Calendar — today is ' + labelFmt.format(now);
  registered.forEach(function (el) {
    var numEl = el.querySelector('.msc-cal-date-icon-num');
    if (numEl) { numEl.textContent = day; }
    el.setAttribute('aria-label', label);
  });
  scheduleMidnight(now);
}

function scheduleMidnight(now) {
  if (midnightTimer) { clearTimeout(midnightTimer); }
  /* +1s buffer so the timer fires just after Colombo midnight, not just
     before it (avoids repainting the outgoing day's number). */
  midnightTimer = setTimeout(paint, millisecondsUntilNextColomboMidnight(now) + 1000);
}

function attachSharedListeners() {
  if (listenersAttached) { return; }
  listenersAttached = true;
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { paint(); }
  });
  window.addEventListener('focus', paint);
}

/* Registers one calendar instance's date-icon element with the shared
   updater and paints it immediately. Safe to call once per mounted
   instance; does not start a new timer or listener per call. */
export function registerDateIcon(el) {
  if (!el || registered.has(el)) { return; }
  registered.add(el);
  attachSharedListeners();
  paint();
}

/* Symmetric cleanup hook for a future instance-teardown path — the app
   currently mounts all five member calendars once for the page's life and
   never unmounts them, so this is not called today, but registerDateIcon()
   deliberately keeps no per-instance timer so there is nothing else to
   release when it is. */
export function unregisterDateIcon(el) {
  registered.delete(el);
}

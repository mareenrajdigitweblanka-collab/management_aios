/* calendar/instance.js — the shared per-member calendar factory
   (mountScheduleCalendarInstance) plus initAllScheduleCalendars(). Extracted
   verbatim from the former inline calendar IIFE (2026-07-17 frontend
   modularization); render/CRUD/state/tasks/leave/reports remain here as
   per-instance closures over shared instance state (splitting them would
   require rewriting working logic, which this refactor deliberately avoids).
   The former inline DOMContentLoaded bootstrap now lives in app.js. */

import { MEMBER_SCHEDULE_API_BASE, MEMBER_LEAVE_API_BASE } from '../config.js';
import {
  CATEGORY_CLASS, LEAVE_TYPE_DISPLAY_LABEL, formatLeaveCalendarLabel, expandWeekdaysClientSide, leaveDatesForItem, LEAVE_HALF_DAY_FIRST_DISPLAY, LEAVE_HALF_DAY_SECOND_DISPLAY, leaveDisplayTimeRange, PRIORITY_ORDER, PRIORITY_BADGE, MONTH_NAMES, DAY_HEADS, DAY_NAMES_FULL, TG_ROW_HEIGHT_PX, TG_HOURS, TG_DEFAULT_SCROLL_HOUR, pad, toDateStr, parseDateStr, timeToMinutes, minutesToTime, formatHourLabel, formatShortDate, formatDuration, formatPercentage, formatChange, getWeekStart, getReportWeekStart, getWeekDays, buildMonthGridCells, layoutOverlappingItems, escapeHtml, apiItemToFrontend, frontendToApiPayload
} from './core.js';

/* Builds and wires ONE independent calendar instance inside `container`.
   All element lookups are scoped to `container` — no ids are used for any
   repeated element, so mounting several instances on one page (one per
   member tab) cannot create duplicate-id collisions. */
function mountScheduleCalendarInstance(container) {
  var memberKey = container.getAttribute('data-member-key') || 'member';
  var memberLabel = container.getAttribute('data-member-label') || memberKey;
  var showRajivNote = container.getAttribute('data-rajiv-note') === 'true';
  var apiBase = MEMBER_SCHEDULE_API_BASE + '/' + encodeURIComponent(memberKey);
  /* Unique per instance (no shared ids across the 4 mounted calendars —
     same rule the rest of this factory already follows) so the view
     modal's aria-labelledby target is valid for every member tab. */
  var viewTitleId = 'msc-view-title-' + memberKey;
  /* Same per-instance-unique-id rule, used for the sidebar toggle's
     aria-controls target (Phase 1 layout shell, 2026-07-14). */
  var sidebarId = 'msc-sidebar-' + memberKey;
  /* Same per-instance-unique-id rule (create-menu popup workflow,
     2026-07-20) — the "+ Create" dropdown's aria-controls target and
     the Task/Leave popups' aria-labelledby targets. */
  var createMenuId = 'msc-create-menu-' + memberKey;
  var taskPopupTitleId = 'msc-task-popup-title-' + memberKey;
  var leavePopupTitleId = 'msc-leave-popup-title-' + memberKey;

  var rajivNoteHtml = showRajivNote
    ? '<div class="msc-rajiv-note show">This testing calendar does not confirm Admin Manager approval, escalation, or authority rules.</div>'
    : '';

  container.innerHTML =
    '<div class="msc-calendar-shell">' +
    '<div class="msc-banner">' +
    '<span class="msc-banner-icon" aria-hidden="true">&#9888;&#65039;</span>' +
    '<div><strong>Testing Preview Only</strong> — stored through local FastAPI/PostgreSQL backend for ' +
    'dashboard testing; not official HR/Admin truth.</div>' +
    '</div>' +
    '<p class="msc-note">Schedule items here are saved to a local FastAPI + PostgreSQL backend for testing ' +
    'purposes only (see <code>backend/README.md</code>). This is not official HR/Admin schedule truth.</p>' +
    '<p class="msc-note" style="font-weight:600;color:var(--text);">Click a date, then add or edit a testing schedule item.</p>' +
    '<p class="msc-note">This follows the Management Team Schedule demo layout, but all entries here are ' +
    'sample testing data.</p>' +
    '<p class="msc-note msc-api-status" style="display:none;"></p>' +
    rajivNoteHtml +
    '<div class="hr-table-card msc-calendar-card">' +
    '<div class="msc-calendar-header">' +
    '<div class="msc-cal-toolbar">' +
    '<div class="msc-cal-toolbar-left">' +
    '<div class="msc-cal-toolbar-btns">' +
    '<button type="button" class="msc-tool-btn msc-tool-btn--icon msc-sidebar-toggle" aria-expanded="true" ' +
    'aria-controls="' + escapeHtml(sidebarId) + '" aria-label="Toggle sidebar" title="Toggle sidebar">&#9776;</button>' +
    '<button type="button" class="msc-tool-btn msc-tool-btn--today msc-today">Today</button>' +
    '<button type="button" class="msc-tool-btn msc-tool-btn--icon msc-prev" aria-label="Previous day, week or month" title="Previous">&#8249;</button>' +
    '<button type="button" class="msc-tool-btn msc-tool-btn--icon msc-next" aria-label="Next day, week or month" title="Next">&#8250;</button>' +
    '</div>' +
    '<div class="msc-cal-heading msc-heading">&nbsp;</div>' +
    '</div>' +
    '<div class="msc-view-switcher" role="group" aria-label="Calendar view">' +
    '<button type="button" class="msc-view-btn active" data-view="month" aria-pressed="true">Month</button>' +
    '<button type="button" class="msc-view-btn" data-view="week" aria-pressed="false">Week</button>' +
    '<button type="button" class="msc-view-btn" data-view="day" aria-pressed="false">Day</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="msc-calendar-main">' +
    '<div class="msc-sidebar" id="' + escapeHtml(sidebarId) + '">' +
    '<div class="msc-create-wrap">' +
    '<button type="button" class="msc-btn msc-btn-primary msc-create-btn msc-sidebar-create" ' +
    'aria-haspopup="true" aria-expanded="false" aria-controls="' + escapeHtml(createMenuId) + '">' +
    '<span class="msc-create-btn-plus" aria-hidden="true">+</span>Create' +
    '<span class="msc-create-btn-caret" aria-hidden="true">&#9662;</span></button>' +
    '<div class="msc-create-menu" id="' + escapeHtml(createMenuId) + '" role="menu" aria-label="Create" hidden>' +
    '<button type="button" class="msc-create-menu-item" role="menuitem" data-create-kind="task">' +
    '<span class="msc-create-menu-icon" aria-hidden="true">&#128221;</span>Task</button>' +
    '<button type="button" class="msc-create-menu-item" role="menuitem" data-create-kind="leave">' +
    '<span class="msc-create-menu-icon" aria-hidden="true">&#128197;</span>Leave</button>' +
    '</div>' +
    '</div>' +
    '<div class="msc-mini-picker" aria-label="Mini date picker"></div>' +
    '<div class="msc-category-legend" aria-label="Task category legend">' +
    '<span class="msc-chip-cat task">Scheduled Task</span>' +
    '<span class="msc-chip-cat followup">Unscheduled Task</span>' +
    '</div>' +
    '</div>' +
    '<div class="msc-calendar-content">' +
    '<div class="msc-cal-grid-wrap">' +
    '<div class="msc-cal-grid msc-grid msc-view-pane active" data-view-pane="month"></div>' +
    '<div class="msc-week-grid msc-view-pane" data-view-pane="week"></div>' +
    '<div class="msc-day-grid msc-view-pane" data-view-pane="day"></div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="msc-summary-section">' +
    '<div class="hr-table-title" style="margin-bottom:8px;">Schedule Summary</div>' +
    '<p class="msc-note" style="margin:0 0 8px;">Counts and duration totals are calculated by the server. ' +
    'Tasks missing a start or end time remain in counts but are excluded from duration totals.</p>' +
    '<div class="msc-summary-grid">' +
    '<div class="msc-summary-block">' +
    '<div class="msc-summary-block-title msc-summary-daily-title">Daily</div>' +
    '<div class="msc-summary-stats msc-summary-daily"><p class="msc-empty">Select a date to see the summary.</p></div>' +
    '</div>' +
    '<div class="msc-summary-block">' +
    '<div class="msc-summary-block-title msc-summary-weekly-title">Weekly</div>' +
    '<div class="msc-summary-stats msc-summary-weekly"><p class="msc-empty">Select a date to see the summary.</p></div>' +
    '</div>' +
    '<div class="msc-summary-block">' +
    '<div class="msc-summary-block-title msc-summary-monthly-title">Monthly</div>' +
    '<div class="msc-summary-stats msc-summary-monthly"><p class="msc-empty">Select a date to see the summary.</p></div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    /* ── Section order (2026-07-17 month-task-list-navigation task;
       creation forms moved into popups 2026-07-20 — see the
       msc-task-popup/msc-leave-popup blocks below, sited near the
       existing msc-view-modal. The Task creation form and the Leave
       creation form each exist exactly once in the DOM, inside their
       popup; only the two remaining lower-page sections — Leave list,
       Schedule Item list — stay in their prior page position.) ──
       Page order: 1) Leave Coordination list, 2) Schedule Item list. */
    '<div class="hr-table-card msc-leave-card">' +
    '<div class="msc-leave-card-head">' +
    '<h4 class="msc-leave-title"><span class="msc-leave-title-icon" aria-hidden="true">&#128197;</span>Leave Coordination ' +
    '<span style="font-weight:600;color:var(--muted);">(Calendar Copy)</span></h4>' +
    '<p class="msc-leave-subtitle">Track and coordinate leave for ' + escapeHtml(memberLabel) +
    ' on this calendar. Use + Create &#8594; Leave to add a new request.</p>' +
    '</div>' +
    '<div class="msc-leave-section">' +
    '<div class="msc-leave-section-title">Leave — ' +
    '<span class="msc-leave-list-date-label">select a date</span></div>' +
    '<div class="msc-leave-list"><p class="msc-leave-empty">Select a date on the calendar to see leave for that date.</p></div>' +
    '</div>' +
    '</div>' +
    '<div class="hr-table-card">' +
    '<div class="msc-list-card">' +
    '<div class="hr-table-title msc-list-heading" tabindex="-1" style="margin-bottom:8px;">Schedule Items — ' +
    '<span class="msc-list-date-label">select a date</span></div>' +
    '<div class="msc-list"><p class="msc-empty">Select a date on the calendar to see schedule items.</p></div>' +
    '</div>' +
    '<div class="msc-list-card">' +
    '<div class="hr-table-title" style="margin-bottom:6px;">Priority Preview — Today (Sample/Demo)</div>' +
    '<p class="msc-note" style="margin:0 0 8px;">Ranks today\'s sample items High → Medium → Low, styled ' +
    'after the Management Team Schedule demo. Sample/demo priority only — not a real priority assignment.</p>' +
    '<div class="msc-priority-list"></div>' +
    '</div>' +
    '<div class="msc-form-actions" style="margin-top:16px;">' +
    '<button type="button" class="msc-btn msc-btn-danger msc-clear-btn">Clear Testing Data</button>' +
    '</div>' +
    '<div class="hr-cal-footer">Testing calendar. Data is stored via a local FastAPI + PostgreSQL backend ' +
    '(<code>' + escapeHtml(apiBase) + '</code>), for dashboard testing only. Not connected to Google Calendar ' +
    'or GitHub. Not official schedule truth.</div>' +
    '<details style="margin-top:6px;margin-bottom:18px;"><summary style="cursor:pointer;font-size:.76rem;color:var(--muted);">' +
    'Technical details</summary><p style="font-size:.78rem;color:var(--muted);margin-top:6px;">Validation: ' +
    '<code>validation/member-dashboard-schedule-frontend-api-wiring-check-2026-07-09.md</code></p></details>' +
    '<div class="msc-modal-overlay msc-view-modal" role="dialog" aria-modal="true" aria-labelledby="' + escapeHtml(viewTitleId) + '">' +
    '<div class="msc-modal">' +
    '<h4 class="msc-view-title" id="' + escapeHtml(viewTitleId) + '"></h4>' +
    '<p class="msc-view-date"></p>' +
    '<p class="msc-view-time"></p>' +
    '<p class="msc-view-category"></p>' +
    '<p class="msc-view-priority"></p>' +
    '<p class="msc-view-notes"></p>' +
    '<button type="button" class="msc-modal-close msc-view-close">Close</button>' +
    '</div>' +
    '</div>' +
    /* ── Task creation popup (Google-style create workflow, 2026-07-20)
       — the one and only Schedule Item creation/edit form in the DOM,
       moved here verbatim (same field classes, same title-counter,
       same category-locked-on-edit helper, same Add/Update/Cancel
       buttons) from its former lower-page position. */
    '<div class="msc-modal-overlay msc-task-popup" role="dialog" aria-modal="true" aria-labelledby="' + escapeHtml(taskPopupTitleId) + '">' +
    '<div class="msc-modal msc-modal-form">' +
    '<div class="msc-modal-form-head">' +
    '<h4 id="' + escapeHtml(taskPopupTitleId) + '">Create Task</h4>' +
    '<button type="button" class="msc-modal-close msc-task-popup-close" aria-label="Close">&times;</button>' +
    '</div>' +
    '<div class="msc-form-card">' +
    '<div class="hr-table-title" style="margin-bottom:10px;">Schedule Item — ' +
    '<span class="msc-selected-date-label">select a date</span></div>' +
    '<form class="msc-form msc-form-grid" autocomplete="off">' +
    '<label>Date<input type="date" class="msc-field-date" required /></label>' +
    '<label>Title<input type="text" class="msc-field-title" placeholder="e.g. Prepare weekly report" maxlength="120" required />' +
    '<span class="msc-field-title-counter">0 / 120</span></label>' +
    '<label>Category<select class="msc-field-category">' +
    '<option value="Scheduled Task">Scheduled Task</option>' +
    '<option value="Unscheduled Task">Unscheduled Task</option>' +
    '</select>' +
    '<span class="msc-field-category-helper" style="display:none;">Category is fixed after the task is created.</span>' +
    '</label>' +
    '<label>Priority<select class="msc-field-priority">' +
    '<option value="High">High</option>' +
    '<option value="Medium" selected>Medium</option>' +
    '<option value="Low">Low</option>' +
    '</select></label>' +
    '<label>Start time<input type="time" class="msc-field-start" /></label>' +
    '<label>End time<input type="time" class="msc-field-end" /></label>' +
    '<label class="msc-form-full">Notes<textarea class="msc-field-notes" maxlength="240" ' +
    'placeholder="Optional note — no real names, meetings, or customer details"></textarea></label>' +
    '</form>' +
    '<p class="msc-note msc-api-status msc-task-popup-status" style="display:none;"></p>' +
    '<div class="msc-form-actions">' +
    '<button type="button" class="msc-btn msc-btn-primary msc-add-btn">Add schedule</button>' +
    '<button type="button" class="msc-btn msc-btn-primary msc-update-btn" style="display:none;">Update schedule</button>' +
    '<button type="button" class="msc-btn msc-btn-ghost msc-cancel-btn" style="display:none;">Cancel edit</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    /* ── Leave creation popup — the one and only Leave creation form in
       the DOM (moved verbatim, including its truth notice and its own
       dedicated status line), moved here from its former lower-page
       position. */
    '<div class="msc-modal-overlay msc-leave-popup" role="dialog" aria-modal="true" aria-labelledby="' + escapeHtml(leavePopupTitleId) + '">' +
    '<div class="msc-modal msc-modal-form">' +
    '<div class="msc-modal-form-head">' +
    '<h4 id="' + escapeHtml(leavePopupTitleId) + '">Create Leave</h4>' +
    '<button type="button" class="msc-modal-close msc-leave-popup-close" aria-label="Close">&times;</button>' +
    '</div>' +
    '<div class="msc-leave-notice"><span class="msc-leave-notice-icon" aria-hidden="true">&#8505;&#65039;</span>' +
    '<span>Calendar coordination copy only. The separate HR leave system remains ' +
    'official. This is not an official leave balance, payroll/no-pay calculation, disciplinary decision, ' +
    'or medical record — and no field here represents an official HR approval decision.</span></div>' +
    '<div class="msc-leave-form-panel">' +
    '<form class="msc-leave-form msc-form-grid" autocomplete="off">' +
    '<label>Leave type<select class="msc-leave-field-type">' +
    '<option value="Short Leave">Short Leave</option>' +
    '<option value="Half-Day First">Half-Day Leave — First Half (08:30–13:00)</option>' +
    '<option value="Half-Day Second">Half-Day Leave — Second Half (13:30–18:00)</option>' +
    '<option value="Full-Day">Full-Day Leave</option>' +
    '<option value="Multi-Day">Multi-Day Leave</option>' +
    '</select></label>' +
    '<label class="msc-leave-field-start-date-wrap">Start date<input type="date" class="msc-leave-field-start-date" required /></label>' +
    '<label class="msc-leave-field-end-date-wrap" style="display:none;">End date<input type="date" class="msc-leave-field-end-date" /></label>' +
    '<label class="msc-leave-field-time-wrap" style="display:none;">Start time<input type="time" class="msc-leave-field-start-time" /></label>' +
    '<label class="msc-leave-field-time-wrap" style="display:none;">End time<input type="time" class="msc-leave-field-end-time" /></label>' +
    '<label class="msc-form-full">Purpose (optional)<input type="text" class="msc-leave-field-purpose" maxlength="240" ' +
    'placeholder="Optional — no medical detail" /></label>' +
    '<label class="msc-form-full">External reference (optional)<input type="text" class="msc-leave-field-external-reference" ' +
    'maxlength="120" placeholder="e.g. official HR leave system reference id" /></label>' +
    '</form>' +
    '<p class="msc-note msc-api-status msc-leave-form-status" style="display:none;"></p>' +
    '<div class="msc-form-actions">' +
    '<button type="button" class="msc-btn msc-btn-primary msc-leave-create-btn">Create leave</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>';

  /* ── Scoped element refs (container-level selectors only — no ids) ── */
  var formEl = container.querySelector('.msc-form');
  var monthHeading = container.querySelector('.msc-heading');
  var calGrid = container.querySelector('.msc-grid');
  var prevBtn = container.querySelector('.msc-prev');
  var todayBtn = container.querySelector('.msc-today');
  var nextBtn = container.querySelector('.msc-next');
  var selectedDateLabel = container.querySelector('.msc-selected-date-label');
  var listDateLabel = container.querySelector('.msc-list-date-label');
  var fieldDate = container.querySelector('.msc-field-date');
  var fieldTitle = container.querySelector('.msc-field-title');
  var fieldTitleCounter = container.querySelector('.msc-field-title-counter');
  var TITLE_MAX_LENGTH = 120;

  /* Container-scoped, no global id — mirrors the input's own
     maxlength (the actual enforcement); this only reflects it. */
  function updateTitleCounter() {
    if (!fieldTitleCounter) { return; }
    var len = fieldTitle.value.length;
    fieldTitleCounter.textContent = len + ' / ' + TITLE_MAX_LENGTH;
    fieldTitleCounter.classList.toggle(
      'msc-field-title-counter--near-limit', len >= TITLE_MAX_LENGTH - 10
    );
  }
  if (fieldTitle) { fieldTitle.addEventListener('input', updateTitleCounter); }
  var fieldCategory = container.querySelector('.msc-field-category');
  var fieldCategoryHelper = container.querySelector('.msc-field-category-helper');
  var fieldPriority = container.querySelector('.msc-field-priority');
  var fieldStart = container.querySelector('.msc-field-start');
  var fieldEnd = container.querySelector('.msc-field-end');
  var fieldNotes = container.querySelector('.msc-field-notes');
  var addBtn = container.querySelector('.msc-add-btn');
  var updateBtn = container.querySelector('.msc-update-btn');
  var cancelBtn = container.querySelector('.msc-cancel-btn');
  var listEl = container.querySelector('.msc-list');
  var priorityListEl = container.querySelector('.msc-priority-list');
  var dailySummaryEl = container.querySelector('.msc-summary-daily');
  var dailySummaryTitleEl = container.querySelector('.msc-summary-daily-title');
  var weeklySummaryEl = container.querySelector('.msc-summary-weekly');
  var weeklySummaryTitleEl = container.querySelector('.msc-summary-weekly-title');
  var monthlySummaryEl = container.querySelector('.msc-summary-monthly');
  var monthlySummaryTitleEl = container.querySelector('.msc-summary-monthly-title');
  var clearBtn = container.querySelector('.msc-clear-btn');
  var viewModal = container.querySelector('.msc-view-modal');
  var viewTitle = container.querySelector('.msc-view-title');
  var viewDate = container.querySelector('.msc-view-date');
  var viewTime = container.querySelector('.msc-view-time');
  var viewCategory = container.querySelector('.msc-view-category');
  var viewPriority = container.querySelector('.msc-view-priority');
  var viewNotes = container.querySelector('.msc-view-notes');
  var viewClose = container.querySelector('.msc-view-close');
  var apiStatusEl = container.querySelector('.msc-api-status');
  var viewSwitcherBtns = container.querySelectorAll('.msc-view-btn');
  var miniPickerEl = container.querySelector('.msc-mini-picker');
  var weekGridEl = container.querySelector('.msc-week-grid');
  var dayGridEl = container.querySelector('.msc-day-grid');
  var sidebarEl = container.querySelector('.msc-sidebar');
  var sidebarToggleBtn = container.querySelector('.msc-sidebar-toggle');
  var sidebarCreateBtn = container.querySelector('.msc-sidebar-create');

  /* ── Create dropdown + Task/Leave popups (Google-style create
     workflow, 2026-07-20) ── */
  var createWrapEl = container.querySelector('.msc-create-wrap');
  var createMenuEl = container.querySelector('.msc-create-menu');
  var createMenuItems = container.querySelectorAll('.msc-create-menu-item');
  var taskPopupOverlay = container.querySelector('.msc-task-popup');
  var taskPopupClose = container.querySelector('.msc-task-popup-close');
  var taskPopupStatusEl = container.querySelector('.msc-task-popup-status');
  var leavePopupOverlay = container.querySelector('.msc-leave-popup');
  var leavePopupClose = container.querySelector('.msc-leave-popup-close');

  /* ── Leave coordination copy (REQ-LEAVE-COPY-001) scoped refs ── */
  var leaveApiBase = MEMBER_LEAVE_API_BASE + '/' + encodeURIComponent(memberKey);
  var leaveFormEl = container.querySelector('.msc-leave-form');
  var leaveFieldType = container.querySelector('.msc-leave-field-type');
  var leaveFieldStartDate = container.querySelector('.msc-leave-field-start-date');
  var leaveFieldEndDate = container.querySelector('.msc-leave-field-end-date');
  var leaveFieldEndDateWrap = container.querySelector('.msc-leave-field-end-date-wrap');
  var leaveFieldStartTime = container.querySelector('.msc-leave-field-start-time');
  var leaveFieldEndTime = container.querySelector('.msc-leave-field-end-time');
  var leaveFieldTimeWraps = container.querySelectorAll('.msc-leave-field-time-wrap');
  var leaveFieldPurpose = container.querySelector('.msc-leave-field-purpose');
  var leaveFieldExternalReference = container.querySelector('.msc-leave-field-external-reference');
  var leaveCreateBtn = container.querySelector('.msc-leave-create-btn');
  var leaveListDateLabel = container.querySelector('.msc-leave-list-date-label');
  var leaveListEl = container.querySelector('.msc-leave-list');
  var leaveFormStatusEl = container.querySelector('.msc-leave-form-status');

  if (leaveFormEl) { leaveFormEl.addEventListener('submit', function (e) { e.preventDefault(); }); }

  /* Prevent Enter-key implicit form submission from reloading the page —
     no action/method is set on this form; it is never meant to submit. */
  formEl.addEventListener('submit', function (e) { e.preventDefault(); });

  /* ── Sidebar toggle (Phase 1 layout shell, 2026-07-14) — collapses
     only this instance's own sidebar; each of the 5 mounted calendars
     keeps an independent collapsed/expanded state. ── */
  var sidebarCollapsed = false;
  sidebarToggleBtn.addEventListener('click', function () {
    sidebarCollapsed = !sidebarCollapsed;
    if (sidebarCollapsed && sidebarEl.contains(document.activeElement)) {
      sidebarToggleBtn.focus();
    }
    sidebarEl.classList.toggle('collapsed', sidebarCollapsed);
    sidebarToggleBtn.setAttribute('aria-expanded', sidebarCollapsed ? 'false' : 'true');
  });

  /* ── "+ Create" dropdown (Google-style create workflow, 2026-07-20)
     — replaces the former scroll-to-form shortcut. Only one dropdown
     can be open per instance (createMenuOpen is closure-scoped to
     this mount); each of the 5 member calendars keeps independent
     state, same pattern as the sidebar-collapse toggle above. */
  var createMenuOpen = false;

  function closeCreateMenu() {
    if (!createMenuOpen) { return; }
    createMenuOpen = false;
    createMenuEl.hidden = true;
    sidebarCreateBtn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onDocClickForCreateMenu, true);
    document.removeEventListener('keydown', onCreateMenuKeydown, true);
  }

  /* Positions the (single, reused) create-menu near an arbitrary anchor
     element — the sidebar Create button (original behavior) or any
     calendar-origin click target (Month cell, Week/Day empty slot,
     all-day area — Step 4/7, 2026-07-20 empty-slot-create task).
     position:fixed (set here, not in CSS, since the sidebar-anchored
     case still wants the menu visually docked under the button)
     resolves against the viewport regardless of which ancestor's
     overflow:hidden the anchor sits inside (.hr-table-card, the
     calendar's outer card, clips position:absolute descendants that
     visually extend past its own box) — a calendar-cell-anchored menu
     would otherwise risk being clipped. Kept within the viewport
     horizontally (responsive positioning, Step 7). */
  function positionCreateMenu(anchorEl) {
    var rect = anchorEl.getBoundingClientRect();
    var menuWidth = createMenuEl.offsetWidth || 180;
    var left = rect.left;
    if (left + menuWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - menuWidth - 8);
    }
    var top = rect.bottom + 6;
    if (top + createMenuEl.offsetHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - createMenuEl.offsetHeight - 6);
    }
    createMenuEl.style.position = 'fixed';
    createMenuEl.style.top = top + 'px';
    createMenuEl.style.left = left + 'px';
  }

  function openCreateMenu(anchorEl) {
    if (createMenuOpen) { return; }
    createMenuOpen = true;
    createMenuEl.hidden = false;
    positionCreateMenu(anchorEl || sidebarCreateBtn);
    sidebarCreateBtn.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', onDocClickForCreateMenu, true);
    document.addEventListener('keydown', onCreateMenuKeydown, true);
  }

  function onDocClickForCreateMenu(e) {
    if (createWrapEl && createWrapEl.contains(e.target)) { return; }
    closeCreateMenu();
  }

  function onCreateMenuKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      closeCreateMenu();
      sidebarCreateBtn.focus();
    }
  }

  sidebarCreateBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (createMenuOpen) { closeCreateMenu(); } else { openCreateMenu(sidebarCreateBtn); }
  });

  /* ── Centralized calendar-origin creation entry point (Step 4,
     2026-07-20 empty-slot-create-and-overlap-rules task) — the single
     helper every empty-area click (Month blank cell, Week/Day empty
     timed slot, Week/Day empty all-day area) funnels through. Updates
     the existing selected-date source of truth (selectDate — the same
     function the mini-picker/Today button/etc. already call),
     prefills a clicked time into both the Task and Leave forms' start/
     end time fields only when a timed slot was actually clicked, then
     opens the existing create-menu chooser anchored near the click.
     Scoped entirely to this calendar instance's own closure state — no
     global mutable state, and reuses the one existing createMenuEl/
     openCreateMenu rather than creating a second chooser.

     opts.resolveAnchor (2026-07-20 chooser-open fix), not opts.anchorElement:
     selectDate() below re-renders the active view's grid (renderMonthView /
     renderTimeGrid replace the whole pane's innerHTML — Step 2/3 trace),
     which detaches the very cell/column node that was clicked. Opening the
     menu against that stale node made positionCreateMenu()'s
     getBoundingClientRect() read an all-zero rect (a detached element's
     rect is always 0,0,0,0), silently pinning the chooser to the viewport's
     top-left corner instead of near the click — indistinguishable from "the
     chooser never opened" to a user looking at the cell they clicked. Callers
     now pass a resolver that re-queries a fresh, currently-attached anchor
     (by stable data-date/data-hour attributes against a render-stable
     container reference) after the rerender has completed; falls back to
     the sidebar Create button if the resolver is absent or finds nothing. */
  function openCreateChoiceFromCalendar(opts) {
    var dateKey = opts.dateKey;
    var allDay = !!opts.allDay;
    var startTime = allDay ? null : (opts.startTime || null);
    var endTime = allDay ? null : (opts.endTime || null);
    var resolveAnchor = opts.resolveAnchor || null;

    selectDate(dateKey);
    if (startTime) {
      fieldStart.value = startTime;
      fieldEnd.value = endTime || '';
      leaveFieldStartTime.value = startTime;
      leaveFieldEndTime.value = endTime || '';
    } else {
      fieldStart.value = '';
      fieldEnd.value = '';
      leaveFieldStartTime.value = '';
      leaveFieldEndTime.value = '';
    }
    var anchorElement = (resolveAnchor && resolveAnchor()) || sidebarCreateBtn;
    openCreateMenu(anchorElement);
  }

  createMenuItems.forEach(function (item) {
    item.addEventListener('click', function () {
      var kind = item.getAttribute('data-create-kind');
      closeCreateMenu();
      if (kind === 'task') {
        cancelEdit();
        openTaskPopup();
      } else if (kind === 'leave') {
        openLeavePopup();
      }
    });
  });

  /* ── Task/Leave popup focus trap + open/close (Google-style create
     workflow, 2026-07-20) — Tab/Shift+Tab cycle within the popup's
     own focusable elements (a real trap, unlike the single-control
     view-modal's Tab-pinned pattern above, since these popups host a
     full multi-field form). Escape and backdrop-click close; focus
     always returns to "+ Create" per the confirmed requirement,
     regardless of what originally triggered the open (dropdown item
     or an Edit click from the Schedule Items list). */
  function getFocusableEls(root) {
    return Array.prototype.slice.call(root.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
      'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(function (el) { return el.offsetParent !== null; });
  }

  function trapPopupTab(overlayEl, e) {
    var focusables = getFocusableEls(overlayEl.querySelector('.msc-modal'));
    if (!focusables.length) { return; }
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function onTaskPopupKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); closeTaskPopup(); }
    else if (e.key === 'Tab') { trapPopupTab(taskPopupOverlay, e); }
  }

  function openTaskPopup() {
    taskPopupOverlay.classList.add('show');
    taskPopupOverlay.addEventListener('keydown', onTaskPopupKeydown);
    if (fieldTitle && fieldTitle.focus) { fieldTitle.focus(); }
  }

  function closeTaskPopup() {
    taskPopupOverlay.classList.remove('show');
    taskPopupOverlay.removeEventListener('keydown', onTaskPopupKeydown);
    if (sidebarCreateBtn && sidebarCreateBtn.focus) { sidebarCreateBtn.focus(); }
  }

  taskPopupClose.addEventListener('click', closeTaskPopup);
  taskPopupOverlay.addEventListener('click', function (e) {
    if (e.target === taskPopupOverlay) { closeTaskPopup(); }
  });

  function onLeavePopupKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); closeLeavePopup(); }
    else if (e.key === 'Tab') { trapPopupTab(leavePopupOverlay, e); }
  }

  function openLeavePopup() {
    leavePopupOverlay.classList.add('show');
    leavePopupOverlay.addEventListener('keydown', onLeavePopupKeydown);
    if (leaveFieldType && leaveFieldType.focus) { leaveFieldType.focus(); }
  }

  function closeLeavePopup() {
    leavePopupOverlay.classList.remove('show');
    leavePopupOverlay.removeEventListener('keydown', onLeavePopupKeydown);
    if (sidebarCreateBtn && sidebarCreateBtn.focus) { sidebarCreateBtn.focus(); }
  }

  leavePopupClose.addEventListener('click', closeLeavePopup);
  leavePopupOverlay.addEventListener('click', function (e) {
    if (e.target === leavePopupOverlay) { closeLeavePopup(); }
  });

  var state = {
    viewYear: null, viewMonth: null, selectedDate: null, editingId: null,
    currentView: 'month', anchorDate: null
  };

  /* Presentation-only status line (Phase 1 polish, 2026-07-10): same
     (message, isError) signature and every call site as before — only
     how the message is styled/announced changed. Non-error messages
     (loading/saving/deleting) use role="status" (polite); a genuine
     error switches to role="alert" (assertive) so it isn't missed. */
  /* targetEl (Google-style create workflow, 2026-07-20) — optional
     third argument, defaults to the original calendar-wide status
     line (apiStatusEl) so loadItems/drag/resize-commit/delete/clear-
     testing-data are entirely unchanged (still 2-arg calls below).
     The Task Add/Update handlers pass taskPopupStatusEl explicitly so
     a save/validation error is visible inside the open popup instead
     of on a banner hidden behind the popup's backdrop — same message
     text, same toggle mechanics, just a different display target. */
  function showApiStatus(message, isError, targetEl) {
    var el = targetEl || apiStatusEl;
    if (!message) {
      el.style.display = 'none';
      el.textContent = '';
      el.removeAttribute('role');
      el.classList.remove('msc-api-status--info', 'msc-api-status--error');
      return;
    }
    el.style.display = '';
    el.classList.toggle('msc-api-status--error', !!isError);
    el.classList.toggle('msc-api-status--info', !isError);
    el.setAttribute('role', isError ? 'alert' : 'status');
    el.textContent = message;
  }

  /* ── API helpers — no localStorage; this is the only place calendar data
     is read from or written to. On failure, the UI shows a visible status
     message rather than silently falling back to any local storage. ── */
  function apiRequest(method, url, body) {
    var opts = { method: method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (errBody) {
          /* REQ-LEAVE-COPY-001: a task save blocked by active leave
             returns a raw 409 body ({error:"leave_conflict", message,
             conflicts:[...]}) with no "detail" wrapper — surfaced here
             with a clear, human-readable message rather than falling
             through to a bare "409 Conflict". No status field exists
             on a conflict entry (2026-07-16 simplification amendment). */
          if (errBody && errBody.error === 'leave_conflict') {
            var conflictSummary = (errBody.conflicts || []).map(function (c) {
              var range = c.start_date === c.end_date ? c.start_date : (c.start_date + ' – ' + c.end_date);
              return c.leave_type + ' (' + range + ')';
            }).join('; ');
            throw new Error((errBody.message || 'This task conflicts with active leave.') +
              (conflictSummary ? ' [' + conflictSummary + ']' : ''));
          }
          var detail = errBody && errBody.detail ? JSON.stringify(errBody.detail) : (res.status + ' ' + res.statusText);
          throw new Error(detail);
        });
      }
      if (res.status === 204) { return null; }
      return res.json();
    });
  }

  function loadItems() {
    showApiStatus('Loading schedule from local API…', false);
    return apiRequest('GET', apiBase).then(function (rows) {
      showApiStatus('', false);
      return (rows || []).map(apiItemToFrontend);
    }).catch(function (err) {
      showApiStatus('Could not reach the local schedule API (' + apiBase + '). Is the backend ' +
        'running? Start it with "uvicorn backend.main:app --port 8000" — see backend/README.md. ' +
        'Detail: ' + err.message, true);
      return [];
    });
  }

  var items = [];

  function itemsForDate(dateStr) {
    return items.filter(function (it) { return it.date === dateStr; });
  }

  /* Leave state (REQ-LEAVE-COPY-001). leaveItems = every active leave
     record (deleted_at IS NULL, server-filtered) — there is no
     approval/status workflow (2026-07-16 simplification amendment),
     so every record the backend returns is shown. */
  var leaveItems = [];

  function leaveItemsForDate(dateStr) {
    return leaveItems.filter(function (lv) { return leaveDatesForItem(lv).indexOf(dateStr) !== -1; });
  }

  var MAX_CAL_CHIPS = 2;

  /* ── Month-view click rules (2026-07-17 month-task-list-navigation task) ──
     Task-presence rule (Step 3): a Month date is task-bearing when
     itemsForDate(dateStr) — the same loaded `items` array every other
     Month/Week/Day renderer already reads, filtered with the same date
     normalization — returns at least one item. Leave is never counted
     (leaveItemsForDate is a separate, independent lookup). Month-view
     only: renderTimeGrid() (Week/Day) is untouched by this section. */
  function isKeyActivation(e) {
    return e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar';
  }

  function renderMonthView() {
    var y = state.viewYear, m = state.viewMonth;
    var todayStr = toDateStr(new Date());
    var cells = buildMonthGridCells(y, m);

    var html = '';
    DAY_HEADS.forEach(function (d) { html += '<div class="msc-cal-headcell">' + d + '</div>'; });

    cells.forEach(function (c) {
      var isToday = c.dateStr === todayStr;
      var isSelected = c.dateStr === state.selectedDate;
      var dayItems = itemsForDate(c.dateStr);

      /* Every cell's own blank-background click/keyboard action is now
         "open the Task/Leave create chooser" (calendar-empty-slot-
         create-and-overlap-rules, 2026-07-20; confirmed requirement) —
         including cells that already have tasks, which previously
         navigated to the filtered Schedule Item list on a background
         click. That list-navigation shortcut is intentionally replaced
         for the cell background; it remains reachable exactly as
         before by clicking an individual task chip or "+N more" (their
         own handlers below, unchanged, still call
         navigateToScheduleItemListForDate and still stopPropagation so
         they never also trigger this cell-level handler). ── */
      var cls = 'msc-cal-cell msc-cal-cell--actionable' + (c.inMonth ? '' : ' other-month') +
        (isSelected ? ' selected' : '');
      var cellLabel = c.date.getDate() + ' ' + MONTH_NAMES[c.date.getMonth()] + ' ' + c.date.getFullYear() +
        '. Create a schedule item or leave request.';
      html += '<div class="' + cls + '" data-date="' + c.dateStr + '" role="button" tabindex="0" ' +
        'aria-label="' + escapeHtml(cellLabel) + '"';
      /* Selected date's accessible state (Step 26, 2026-07-20 redesign)
         — the existing .selected class already carries the visible
         highlight; aria-current="date" exposes the same state to
         assistive tech without changing selection logic. */
      if (isSelected) { html += ' aria-current="date"'; }
      html += '>';
      html += '<div class="msc-cal-daynum' + (isToday ? ' today' : '') + '">' + c.date.getDate() + '</div>';
      /* Demo-style visible task chips inside each date (aios_role_desk_views.html layout reference) —
         shows the actual sample/testing entries the user has added, not real schedule facts.
         Task chips navigate to the filtered Schedule Item list (Step 7) — Month chips never
         opened a task-detail view before this change, so there is no modal behavior to
         suppress here; Week/Day's viewItem() modal (separate renderer, renderTimeGrid) is
         unaffected. */
      dayItems.slice(0, MAX_CAL_CHIPS).forEach(function (it) {
        var catClass = CATEGORY_CLASS[it.category] || 'task';
        var label = (it.start ? it.start + ' ' : '') + it.title;
        html += '<span class="msc-cal-chip ' + catClass + '" data-date="' + c.dateStr + '" ' +
          'role="button" tabindex="0" title="' + escapeHtml(label) + '">' +
          escapeHtml(label) + '</span>';
      });
      if (dayItems.length > MAX_CAL_CHIPS) {
        /* Step 8: this overflow count is derived from `dayItems` (tasks
           only, see itemsForDate above) — leave is rendered separately
           below and never contributes to this count, so "+N more" is
           always task-bearing whenever it is rendered at all. */
        html += '<span class="msc-cal-chip-more" data-date="' + c.dateStr + '" role="button" tabindex="0">+' +
          (dayItems.length - MAX_CAL_CHIPS) + ' more</span>';
      }
      /* Leave chips (REQ-LEAVE-COPY-001) — visually distinct from
         the task chips above (own class, own colors), never using
         CATEGORY_CLASS. Deleted leave is never in `leaveItems`
         (server-filtered on deleted_at IS NULL), so it never renders
         here. Step 9: leave chips never navigate to the Schedule Item
         list — no role/tabindex added, and their own click handler
         below only stops propagation (relevant on a mixed task+leave
         cell, where the cell background itself is actionable). */
      leaveItemsForDate(c.dateStr).forEach(function (lv) {
        var label = formatLeaveCalendarLabel(lv);
        html += '<span class="msc-cal-chip-leave" title="' + escapeHtml(label) + '">' +
          escapeHtml(label) + '</span>';
      });
      html += '</div>';
    });
    calGrid.innerHTML = html;

    /* Every cell gets the create-chooser listener (Step 5/6, 2026-07-20)
       — chip/+more/leave-chip clicks below all call e.stopPropagation(),
       so a click that lands on one of those never bubbles up to fire
       this cell-level handler; only a genuine blank-background click or
       keyboard activation reaches here. */
    calGrid.querySelectorAll('.msc-cal-cell--actionable').forEach(function (cell) {
      var go = function () {
        var dateKey = cell.getAttribute('data-date');
        openCreateChoiceFromCalendar({
          dateKey: dateKey,
          allDay: true,
          resolveAnchor: function () {
            return calGrid.querySelector('.msc-cal-cell--actionable[data-date="' + dateKey + '"]');
          }
        });
      };
      cell.addEventListener('click', go);
      cell.addEventListener('keydown', function (e) { if (isKeyActivation(e)) { e.preventDefault(); go(); } });
    });
    calGrid.querySelectorAll('.msc-cal-chip').forEach(function (chip) {
      var go = function (e) {
        e.stopPropagation();
        navigateToScheduleItemListForDate(chip.getAttribute('data-date'));
      };
      chip.addEventListener('click', go);
      chip.addEventListener('keydown', function (e) { if (isKeyActivation(e)) { e.preventDefault(); go(e); } });
    });
    calGrid.querySelectorAll('.msc-cal-chip-more').forEach(function (chip) {
      var go = function (e) {
        e.stopPropagation();
        navigateToScheduleItemListForDate(chip.getAttribute('data-date'));
      };
      chip.addEventListener('click', go);
      chip.addEventListener('keydown', function (e) { if (isKeyActivation(e)) { e.preventDefault(); go(e); } });
    });
    calGrid.querySelectorAll('.msc-cal-chip-leave').forEach(function (chip) {
      chip.addEventListener('click', function (e) { e.stopPropagation(); });
    });
  }

  /* ── Week/Day time-grid view (Google-Calendar-inspired) ──
     Shared by Week (7 days) and Day (1 day) — both call this with a
     different `days` array against a different mount (weekGridEl /
     dayGridEl). All-day items (both start/end null — the existing
     convention, no schema change) render in a separate top strip;
     timed items render as absolutely-positioned blocks inside their
     day column using layoutOverlappingItems for side-by-side overlap. */
  function renderTimeGrid(gridRootEl, days) {
    var todayStr = toDateStr(new Date());
    var colTemplate = '56px repeat(' + days.length + ', 1fr)';

    var headerHtml = '<div class="msc-tg-row msc-tg-header-row" style="grid-template-columns:' + colTemplate + ';">' +
      '<div class="msc-tg-gutter"></div>';
    days.forEach(function (d) {
      var isToday = toDateStr(d) === todayStr;
      headerHtml += '<div class="msc-tg-daycol-head' + (isToday ? ' today' : '') + '">' +
        DAY_HEADS[d.getDay()] + ' <span class="msc-tg-daynum">' + d.getDate() + '</span></div>';
    });
    headerHtml += '</div>';

    var alldayHtml = '<div class="msc-tg-row msc-tg-allday-row" style="grid-template-columns:' + colTemplate + ';">' +
      '<div class="msc-tg-gutter">All day</div>';
    days.forEach(function (d) {
      var dateStr = toDateStr(d);
      var alldayItems = itemsForDate(dateStr).filter(function (it) { return !it.start && !it.end; });
      /* role/tabindex/aria-label on the column itself (Step 19 keyboard
         accessibility) — the JS click/keydown handler below already
         only fires for a genuine blank-area activation (e.target/
         document.activeElement === colEl), same guard child chips'
         own stopPropagation already relies on. */
      alldayHtml += '<div class="msc-tg-allday-col" data-date="' + dateStr + '" role="button" tabindex="0" ' +
        'aria-label="' + escapeHtml(formatAgendaDate(dateStr)) + ', all day. Create a schedule item or leave request.">';
      alldayItems.forEach(function (it) {
        var catClass = CATEGORY_CLASS[it.category] || 'task';
        alldayHtml += '<div class="msc-tg-allday-chip ' + catClass + '" data-id="' + it.id +
          '" tabindex="0" role="button" title="' + escapeHtml(it.title) + '">' + escapeHtml(it.title) + '</div>';
      });
      /* Full-Day / Multi-Day leave renders here (all-day style), not
         as a fake timed block — Short Leave / Half-Day render in the
         timed area below instead. */
      leaveItemsForDate(dateStr).filter(function (lv) {
        return lv.leave_type === 'Full-Day' || lv.leave_type === 'Multi-Day';
      }).forEach(function (lv) {
        var label = formatLeaveCalendarLabel(lv);
        alldayHtml += '<div class="msc-tg-allday-chip-leave" title="' + escapeHtml(label) + '">' +
          escapeHtml(label) + '</div>';
      });
      alldayHtml += '</div>';
    });
    alldayHtml += '</div>';

    var bodyHtml = '<div class="msc-tg-scroll"><div class="msc-tg-body-grid" ' +
      'style="grid-template-columns:' + colTemplate + ';height:' + (TG_HOURS * TG_ROW_HEIGHT_PX) + 'px;">';
    bodyHtml += '<div class="msc-tg-gutter-col">';
    for (var h = 0; h < TG_HOURS; h++) {
      bodyHtml += '<div class="msc-tg-hour-label" style="height:' + TG_ROW_HEIGHT_PX + 'px;">' +
        formatHourLabel(h) + '</div>';
    }
    bodyHtml += '</div>';

    days.forEach(function (d) {
      var dateStr = toDateStr(d);
      bodyHtml += '<div class="msc-tg-daycol" data-date="' + dateStr + '">';
      for (var h2 = 0; h2 < TG_HOURS; h2++) {
        bodyHtml += '<div class="msc-tg-hourcell" data-hour="' + h2 + '" style="height:' + TG_ROW_HEIGHT_PX + 'px;"></div>';
      }
      var timedItems = itemsForDate(dateStr).filter(function (it) { return it.start; });
      layoutOverlappingItems(timedItems).forEach(function (entry) {
        var it = entry.item;
        var top = entry.startMin / 60 * TG_ROW_HEIGHT_PX;
        var height = Math.max(18, (entry.endMin - entry.startMin) / 60 * TG_ROW_HEIGHT_PX);
        var widthPct = 100 / entry.totalCols;
        var leftPct = entry.col * widthPct;
        var catClass = CATEGORY_CLASS[it.category] || 'task';
        bodyHtml += '<div class="msc-tg-event ' + catClass + '" data-id="' + it.id + '" tabindex="0" role="button" ' +
          'style="top:' + top + 'px;height:' + height + 'px;left:' + leftPct + '%;width:' + widthPct + '%;">' +
          '<div class="msc-tg-event-title">' + escapeHtml(it.title) + '</div>' +
          '<div class="msc-tg-event-time">' + escapeHtml(it.start) + (it.end ? '–' + escapeHtml(it.end) : '') + '</div>' +
          '<div class="msc-tg-resize-handle" aria-hidden="true"></div>' +
          '</div>';
      });
      /* Short Leave / Half-Day leave blocks — non-interactive
         (pointer-events:none via CSS, no data-id, never passed to
         wireTimeGridInteractions), so they can never be dragged or
         resized. Editing/removal goes through the leave form /
         Delete Leave action only. */
      leaveItemsForDate(dateStr).forEach(function (lv) {
        var range = leaveDisplayTimeRange(lv);
        if (!range || !range.start || !range.end) { return; }
        var leaveStart = timeToMinutes(range.start);
        var leaveEnd = timeToMinutes(range.end);
        var leaveTop = leaveStart / 60 * TG_ROW_HEIGHT_PX;
        var leaveHeight = Math.max(18, (leaveEnd - leaveStart) / 60 * TG_ROW_HEIGHT_PX);
        var label = formatLeaveCalendarLabel(lv);
        bodyHtml += '<div class="msc-tg-leave-block" ' +
          'style="top:' + leaveTop + 'px;height:' + leaveHeight + 'px;left:2%;width:96%;" ' +
          'title="' + escapeHtml(label) + '">' +
          escapeHtml(label) + '</div>';
      });
      if (dateStr === todayStr) {
        var nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
        bodyHtml += '<div class="msc-tg-now-line" aria-hidden="true" style="top:' +
          (nowMinutes / 60 * TG_ROW_HEIGHT_PX) + 'px;"></div>';
      }
      bodyHtml += '</div>';
    });
    bodyHtml += '</div></div>';

    gridRootEl.innerHTML = headerHtml + alldayHtml + bodyHtml;

    wireTimeGridInteractions(gridRootEl);

    var scrollEl = gridRootEl.querySelector('.msc-tg-scroll');
    if (scrollEl) { scrollEl.scrollTop = Math.max(0, TG_DEFAULT_SCROLL_HOUR * TG_ROW_HEIGHT_PX - 40); }
  }

  /* ── Empty-range click/drag-to-create + event drag-move/resize ──
     Drag-move shifts an event's time-of-day within the SAME day column
     (start and end shift together, duration preserved); moving an
     event to a different day is done via the existing Edit form's
     date field, not cross-column drag — a deliberate scope reduction
     documented in validation/shared-calendar-google-inspired-ux-check-
     2026-07-13.md. Resize only ever changes `end`. Both commit via the
     existing PUT endpoint and WAIT for success before the item's
     position changes — on failure nothing was mutated, so re-rendering
     from the unchanged `items` array is a correct "snap back", not a
     rollback of an optimistic write. */
  /* Whole-hour start + 1-hour default duration (single click) or the
     dragged hour span (drag) — the existing, only-ever-supported grid
     increment (Step 7, 2026-07-20: "do not invent a new increment").
     Shared by the click and drag-release paths below so the end-time
     clamp (past 23:00 rounds to 23:59, matching a day's last valid
     time) is computed in exactly one place. */
  function timedSlotSpan(startHour, endHour) {
    var clampedEnd = Math.min(endHour, 24);
    return {
      startTime: pad(startHour) + ':00',
      endTime: clampedEnd >= 24 ? '23:59' : (pad(clampedEnd) + ':00')
    };
  }

  function wireEmptyCellCreate(colEl, dateStr, gridRootEl) {
    var dragStartHour = null;
    var dragCurrentHour = null;
    var isDragging = false;

    /* gridRootEl (weekGridEl/dayGridEl) is the render-stable reference —
       renderTimeGrid() only replaces its innerHTML, never the node itself
       (unlike colEl/cell, recreated on every rerender) — so resolving the
       anchor through it after selectDate()'s rerender (chooser-open fix,
       2026-07-20) always finds the fresh, currently-attached hour cell. */
    function resolveHourCell(hour) {
      return function () {
        return gridRootEl.querySelector(
          '.msc-tg-daycol[data-date="' + dateStr + '"] .msc-tg-hourcell[data-hour="' + hour + '"]'
        );
      };
    }

    colEl.querySelectorAll('.msc-tg-hourcell').forEach(function (cell) {
      cell.addEventListener('click', function () {
        var hour = parseInt(cell.getAttribute('data-hour'), 10);
        var span = timedSlotSpan(hour, hour + 1);
        openCreateChoiceFromCalendar({
          dateKey: dateStr,
          startTime: span.startTime,
          endTime: span.endTime,
          resolveAnchor: resolveHourCell(hour)
        });
      });
      cell.addEventListener('pointerdown', function () {
        dragStartHour = parseInt(cell.getAttribute('data-hour'), 10);
        dragCurrentHour = dragStartHour;
        isDragging = true;
      });
      cell.addEventListener('pointerenter', function () {
        if (isDragging) { dragCurrentHour = parseInt(cell.getAttribute('data-hour'), 10); }
      });
    });

    colEl.addEventListener('pointerup', function (e) {
      if (!isDragging) return;
      isDragging = false;
      if (dragStartHour == null || dragCurrentHour == null) return;
      var startHour = Math.min(dragStartHour, dragCurrentHour);
      var lastHour = Math.max(dragStartHour, dragCurrentHour);
      // A genuine multi-cell drag (the plain 'click' listener above
      // already handles the single-cell case, so only act here when
      // the range actually spans more than one hour).
      if (startHour !== lastHour) {
        var span = timedSlotSpan(startHour, lastHour + 1);
        var anchorHour = dragCurrentHour;
        openCreateChoiceFromCalendar({
          dateKey: dateStr,
          startTime: span.startTime,
          endTime: span.endTime,
          resolveAnchor: resolveHourCell(anchorHour)
        });
      }
      dragStartHour = null;
      dragCurrentHour = null;
    });
  }

  function commitItemTimeChange(it, newDateStr, newStart, newEnd) {
    var payload = frontendToApiPayload({
      date: newDateStr, title: it.title, category: it.category, priority: it.priority,
      start: newStart, end: newEnd, notes: it.notes
    });
    return apiRequest('PUT', apiBase + '/' + encodeURIComponent(it.id), payload).then(function (apiItem) {
      var updated = apiItemToFrontend(apiItem);
      var idx = items.indexOf(it);
      if (idx !== -1) { items[idx] = updated; }
      return updated;
    });
  }

  function attachDragHandlers(eventEl, it) {
    var suppressNextClick = false;

    eventEl.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.msc-tg-resize-handle')) return;
      e.preventDefault();
      var startY = e.clientY;
      var originalStartMin = timeToMinutes(it.start);
      var durationMin = (it.end ? timeToMinutes(it.end) : originalStartMin + 30) - originalStartMin;
      eventEl.classList.add('msc-tg-event--dragging');

      function onMove(ev) {
        eventEl.style.transform = 'translateY(' + (ev.clientY - startY) + 'px)';
      }
      function onUp(ev) {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        eventEl.classList.remove('msc-tg-event--dragging');
        var deltaMin = Math.round(((ev.clientY - startY) / TG_ROW_HEIGHT_PX * 60) / 15) * 15;
        eventEl.style.transform = '';
        if (!deltaMin) { return; }
        suppressNextClick = true;
        var newStartMin = Math.max(0, Math.min(24 * 60 - durationMin, originalStartMin + deltaMin));
        var newEndMin = newStartMin + durationMin;
        eventEl.classList.add('msc-tg-event--pending');
        commitItemTimeChange(it, it.date, minutesToTime(newStartMin), minutesToTime(newEndMin))
          .then(function () { renderActiveView(); })
          .catch(function (err) {
            showApiStatus('Could not move this schedule item — reverted. Detail: ' + err.message, true);
            renderActiveView();
          });
      }
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });

    eventEl.addEventListener('click', function (e) {
      if (suppressNextClick) { suppressNextClick = false; return; }
      if (e.target.closest('.msc-tg-resize-handle')) return;
      viewItem(it.id, eventEl);
    });
  }

  function attachResizeHandler(handleEl, eventEl, it) {
    handleEl.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var startY = e.clientY;
      var startMin = timeToMinutes(it.start);
      var originalDurationMin = (it.end ? timeToMinutes(it.end) : startMin + 30) - startMin;

      function onMove(ev) {
        var deltaMin = Math.round(((ev.clientY - startY) / TG_ROW_HEIGHT_PX * 60) / 15) * 15;
        var newDurationMin = Math.max(15, originalDurationMin + deltaMin);
        eventEl.style.height = Math.max(18, newDurationMin / 60 * TG_ROW_HEIGHT_PX) + 'px';
      }
      function onUp(ev) {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        var deltaMin = Math.round(((ev.clientY - startY) / TG_ROW_HEIGHT_PX * 60) / 15) * 15;
        if (!deltaMin) { return; }
        var newDurationMin = Math.max(15, originalDurationMin + deltaMin);
        var newEndMin = Math.min(24 * 60, startMin + newDurationMin);
        eventEl.classList.add('msc-tg-event--pending');
        commitItemTimeChange(it, it.date, it.start, minutesToTime(newEndMin))
          .then(function () { renderActiveView(); })
          .catch(function (err) {
            showApiStatus('Could not resize this schedule item — reverted. Detail: ' + err.message, true);
            renderActiveView();
          });
      }
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    });
  }

  function wireTimeGridInteractions(gridRootEl) {
    gridRootEl.querySelectorAll('.msc-tg-daycol').forEach(function (colEl) {
      wireEmptyCellCreate(colEl, colEl.getAttribute('data-date'), gridRootEl);
    });
    gridRootEl.querySelectorAll('.msc-tg-allday-col').forEach(function (colEl) {
      var dateStr = colEl.getAttribute('data-date');
      var go = function () {
        openCreateChoiceFromCalendar({
          dateKey: dateStr,
          allDay: true,
          resolveAnchor: function () {
            return gridRootEl.querySelector('.msc-tg-allday-col[data-date="' + dateStr + '"]');
          }
        });
      };
      colEl.addEventListener('click', function (e) {
        // Only the column's own blank background, never a click that
        // bubbled up from a child chip (those stopPropagation below and
        // in wireTimeGridInteractions' allday-chip handler already).
        if (e.target === colEl) { go(); }
      });
      colEl.addEventListener('keydown', function (e) {
        if ((e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') && e.target === colEl) {
          e.preventDefault();
          go();
        }
      });
    });
    gridRootEl.querySelectorAll('.msc-tg-allday-chip').forEach(function (chipEl) {
      chipEl.addEventListener('click', function (e) {
        e.stopPropagation();
        viewItem(chipEl.getAttribute('data-id'), chipEl);
      });
    });
    gridRootEl.querySelectorAll('.msc-tg-event').forEach(function (eventEl) {
      var id = eventEl.getAttribute('data-id');
      var it = items.filter(function (x) { return x.id === id; })[0];
      if (!it) return;
      attachDragHandlers(eventEl, it);
      var handle = eventEl.querySelector('.msc-tg-resize-handle');
      if (handle) attachResizeHandler(handle, eventEl, it);
    });
    /* Short/Half-Day leave blocks intercept their own click (pointer-
       events:auto, calendar.css) and do nothing with it beyond stopping
       propagation — same click-is-inert convention Month's
       .msc-cal-chip-leave already uses. Prevents a click landing on a
       leave block from falling through to the empty hourcell beneath
       and opening the create chooser (Step 7, 2026-07-20). */
    gridRootEl.querySelectorAll('.msc-tg-leave-block').forEach(function (blockEl) {
      blockEl.addEventListener('click', function (e) { e.stopPropagation(); });
    });
  }

  /* ── Agenda view — groups items by date within the active month. ── */
  function formatAgendaDate(dateStr) {
    var d = parseDateStr(dateStr);
    return DAY_NAMES_FULL[d.getDay()] + ', ' + MONTH_NAMES[d.getMonth()] + ' ' + d.getDate();
  }

  /* ── Mini date-navigation picker — reuses buildMonthGridCells so
     month-grid math is defined exactly once. Navigates whichever view
     is currently active, not just Month. ── */
  function renderMiniPicker() {
    var y = state.viewYear, m = state.viewMonth;
    var cells = buildMonthGridCells(y, m);
    var todayStr = toDateStr(new Date());
    var html = '<div class="msc-mini-picker-heading">' + MONTH_NAMES[m] + ' ' + y + '</div><div class="msc-mini-picker-grid">';
    DAY_HEADS.forEach(function (d) { html += '<div class="msc-mini-picker-headcell">' + d.charAt(0) + '</div>'; });
    cells.forEach(function (c) {
      var isSelected = c.dateStr === state.selectedDate;
      var cls = 'msc-mini-picker-cell' + (c.inMonth ? '' : ' other-month') +
        (c.dateStr === todayStr ? ' today' : '') + (isSelected ? ' selected' : '');
      html += '<button type="button" class="' + cls + '" data-date="' + c.dateStr + '" aria-label="' +
        escapeHtml(formatAgendaDate(c.dateStr)) + '"' + (isSelected ? ' aria-current="date"' : '') + '>' +
        c.date.getDate() + '</button>';
    });
    html += '</div>';
    miniPickerEl.innerHTML = html;
    miniPickerEl.querySelectorAll('.msc-mini-picker-cell').forEach(function (btn) {
      btn.addEventListener('click', function () { selectDate(btn.getAttribute('data-date')); });
    });
  }

  function updateHeading() {
    if (state.currentView === 'month') {
      monthHeading.textContent = MONTH_NAMES[state.viewMonth] + ' ' + state.viewYear;
    } else if (state.currentView === 'week') {
      var days = getWeekDays(state.anchorDate);
      monthHeading.textContent = formatShortDate(days[0]) + ' – ' + formatShortDate(days[6]) + ', ' + days[6].getFullYear();
    } else if (state.currentView === 'day') {
      monthHeading.textContent = DAY_NAMES_FULL[state.anchorDate.getDay()] + ', ' +
        MONTH_NAMES[state.anchorDate.getMonth()] + ' ' + state.anchorDate.getDate() + ', ' + state.anchorDate.getFullYear();
    }
  }

  function syncViewSwitcherButtons() {
    viewSwitcherBtns.forEach(function (b) {
      var active = b.getAttribute('data-view') === state.currentView;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  /* ── Single dispatcher every nav/CRUD/view-switch path calls instead
     of a view-specific render function — keeps Month/Week/Day,
     the mini-picker, and the heading always in sync with state. ── */
  function renderActiveView() {
    /* Defensive fallback — an unrecognized currentView (should not
       happen via the switcher/init paths, which only ever set
       month/week/day) would otherwise match no pane's data-view-pane
       and leave every pane inactive/blank. Never falls back to the
       removed Agenda view. */
    if (state.currentView !== 'month' && state.currentView !== 'week' && state.currentView !== 'day') {
      state.currentView = 'month';
      syncViewSwitcherButtons();
    }
    container.querySelectorAll('.msc-view-pane').forEach(function (p) {
      p.classList.toggle('active', p.getAttribute('data-view-pane') === state.currentView);
    });
    updateHeading();
    if (state.currentView === 'month') { renderMonthView(); }
    else if (state.currentView === 'week') { renderTimeGrid(weekGridEl, getWeekDays(state.anchorDate)); }
    else { renderTimeGrid(dayGridEl, [state.anchorDate]); }
    renderMiniPicker();
  }

  viewSwitcherBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      state.currentView = btn.getAttribute('data-view');
      syncViewSwitcherButtons();
      renderActiveView();
    });
  });

  prevBtn.addEventListener('click', function () {
    if (state.currentView === 'month') {
      state.viewMonth--;
      if (state.viewMonth < 0) { state.viewMonth = 11; state.viewYear--; }
    } else if (state.currentView === 'week') {
      state.anchorDate.setDate(state.anchorDate.getDate() - 7);
    } else if (state.currentView === 'day') {
      state.anchorDate.setDate(state.anchorDate.getDate() - 1);
    }
    renderActiveView();
  });
  nextBtn.addEventListener('click', function () {
    if (state.currentView === 'month') {
      state.viewMonth++;
      if (state.viewMonth > 11) { state.viewMonth = 0; state.viewYear++; }
    } else if (state.currentView === 'week') {
      state.anchorDate.setDate(state.anchorDate.getDate() + 7);
    } else if (state.currentView === 'day') {
      state.anchorDate.setDate(state.anchorDate.getDate() + 1);
    }
    renderActiveView();
  });
  todayBtn.addEventListener('click', function () {
    selectDate(toDateStr(new Date()));
  });

  /* ── Single shared date-sync helper (2026-07-16) ──
     The one place that pushes the calendar's selected date (already an
     ISO YYYY-MM-DD string — never locale-formatted or round-tripped
     through a Date/UTC conversion) into every date-dependent form
     field. Every date-selection path (Month cell click, mini-picker
     click, Week/Day empty-slot click via openCreateChoiceFromCalendar,
     Today button) calls selectDate(), which calls this — so there is
     exactly one place that decides how forms react to a newly
     selected date, not one copy per view.

     This only updates the *create* forms' date fields — it never
     calls the leave or task API and never mutates an existing saved
     record; if a task is mid-edit, cancelEdit() (called by
     selectDate() below) already resets that state first, matching
     the existing pre-2026-07-16 behavior for the Schedule Item form. */
  function syncSelectedDateToForms(dateStr) {
    fieldDate.value = dateStr;
    if (leaveFieldStartDate) { leaveFieldStartDate.value = dateStr; }
    /* Multi-Day is the only leave type with a visible/applicable End
       Date field (see updateLeaveFormFieldVisibility) — initialize it
       to the same selected date so a fresh Multi-Day request starts
       as a single-day range the user can then widen manually. Every
       other leave type leaves End Date untouched — it is hidden and
       not applicable, per the existing form logic, and this must not
       invent a new leave rule (e.g. auto-expanding a range). */
    if (leaveFieldEndDate && leaveFieldType && leaveFieldType.value === 'Multi-Day') {
      leaveFieldEndDate.value = dateStr;
    }
  }

  function selectDate(dateStr) {
    state.selectedDate = dateStr;
    var d = parseDateStr(dateStr);
    state.anchorDate = d;
    state.viewYear = d.getFullYear();
    state.viewMonth = d.getMonth();
    selectedDateLabel.textContent = dateStr;
    listDateLabel.textContent = dateStr;
    if (leaveListDateLabel) { leaveListDateLabel.textContent = dateStr; }
    syncSelectedDateToForms(dateStr);
    cancelEdit();
    renderActiveView();
    renderList();
    renderLeaveList();
    loadSummaries(dateStr);
  }

  /* ── Centralized Month task-list navigation (Step 4, 2026-07-17) ──
     The single helper every Month-view actionable trigger (task-bearing
     cell background, task chip, "+N more") calls. Reuses selectDate() —
     the existing selected-date source of truth — rather than
     duplicating it: selectDate() already (1) sets state.selectedDate,
     (2) syncs the Schedule Item/Leave form dates via
     syncSelectedDateToForms(), (3)/(4) re-renders renderList(), which
     already filters the existing loaded `items` array to
     state.selectedDate (msc-list-date-label already shows that date as
     the list's context label) — so there is no separate filter
     variable or second task list to introduce. This helper only adds
     the scroll + focus step on top, and keeps the current member scope
     by operating solely through container-scoped closure references
     (no window-global state). */
  function navigateToScheduleItemListForDate(dateStr) {
    selectDate(dateStr);
    var listHeading = container.querySelector('.msc-list-heading');
    var scrollTarget = listHeading || listEl;
    if (scrollTarget && scrollTarget.scrollIntoView) {
      scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (listHeading && listHeading.focus) { listHeading.focus(); }
  }

  function renderList() {
    if (!state.selectedDate) {
      listEl.innerHTML = '<p class="msc-empty">Select a date on the calendar to see schedule items.</p>';
      renderPriorityPreview();
      return;
    }
    var dayItems = items.filter(function (it) { return it.date === state.selectedDate; });
    if (!dayItems.length) {
      listEl.innerHTML = '<p class="msc-empty">No sample schedule items for ' + escapeHtml(memberLabel) +
        ' on ' + state.selectedDate + ' yet. Use the form above to add one for testing.</p>';
      renderPriorityPreview();
      return;
    }
    var html = '';
    dayItems.forEach(function (it) {
      var catClass = CATEGORY_CLASS[it.category] || 'task';
      var priority = it.priority || 'Medium';
      var badgeClass = PRIORITY_BADGE[priority] || 'badge-amber';
      var timeStr = (it.start || it.end) ? (it.start || '?') + '–' + (it.end || '?') : 'No time set';
      html += '<div class="msc-item" data-id="' + it.id + '">';
      html += '<div><div class="msc-item-title"><span class="badge ' + badgeClass + '" ' +
        'title="Sample/demo priority only">' + escapeHtml(priority) + '</span> ' +
        '<span class="msc-chip-cat ' + catClass + '">' + it.category +
        '</span>' + escapeHtml(it.title) + '</div>';
      html += '<div class="msc-item-meta">' + timeStr + '</div></div>';
      html += '<div class="msc-item-actions">';
      html += '<button type="button" data-action="view" data-id="' + it.id + '">View</button>';
      html += '<button type="button" data-action="edit" data-id="' + it.id + '">Edit</button>';
      html += '<button type="button" data-action="delete" data-id="' + it.id + '">Delete</button>';
      html += '</div></div>';
    });
    listEl.innerHTML = html;

    listEl.querySelectorAll('button[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-action');
        var id = btn.getAttribute('data-id');
        if (action === 'view') { viewItem(id, btn); }
        else if (action === 'edit') { editItem(id); }
        else if (action === 'delete') { deleteItem(id); }
      });
    });

    renderPriorityPreview();
  }

  /* Demo-style "Priority Queue" preview (aios_role_desk_views.html layout reference) — ranks
     today's sample items High → Medium → Low. Sample/demo priority only, not a real ranking. */
  function renderPriorityPreview() {
    var todayStr = toDateStr(new Date());
    var todays = itemsForDate(todayStr).slice().sort(function (a, b) {
      var pa = PRIORITY_ORDER[a.priority] === undefined ? 1 : PRIORITY_ORDER[a.priority];
      var pb = PRIORITY_ORDER[b.priority] === undefined ? 1 : PRIORITY_ORDER[b.priority];
      return pa - pb;
    });
    if (!todays.length) {
      priorityListEl.innerHTML = '<p class="msc-empty">No sample items for today yet.</p>';
      return;
    }
    var html = '';
    todays.forEach(function (it) {
      var priority = it.priority || 'Medium';
      var badgeClass = PRIORITY_BADGE[priority] || 'badge-amber';
      var catClass = CATEGORY_CLASS[it.category] || 'task';
      html += '<div class="msc-item">';
      html += '<div><span class="badge ' + badgeClass + '" title="Sample/demo priority only">' +
        escapeHtml(priority) + '</span> <span class="msc-chip-cat ' + catClass + '">' + it.category +
        '</span>' + escapeHtml(it.title) + '</div>';
      html += '</div>';
    });
    priorityListEl.innerHTML = html;
  }

  /* ── Schedule Summary — counts, durations, split percentages,
     used/ignored task totals, and previous-period comparisons
     (2026-07-14 duration reporting; counts block originally
     2026-07-14). Count %/Time % rows were removed from display on
     2026-07-14 (validation/schedule-summary-percentage-row-removal-check-2026-07-14.md)
     and re-added — as four two-decimal split-percentage rows below
     Total — on 2026-07-17
     (schedule-summary-count-duration-percentage; see
     validation/schedule-summary-count-duration-percentage-check-2026-07-17.md).
     The whole-number scheduled_percentage/unscheduled_percentage
     fields the backend still returns remain unused here; the rows
     read the two-decimal scheduled_count_percentage/
     unscheduled_count_percentage/scheduled_duration_percentage/
     unscheduled_duration_percentage fields instead. Server-authoritative:
     reads the report endpoints rather than deriving counts or
     durations from the `items` array already loaded in the browser,
     per the reporting requirement that the server response — not the
     client's local cache — is the source of truth. No duration or
     comparison value is ever computed here; formatDuration/
     formatChange only format values the backend already returned.
     Shared across all five member instances via this one factory
     function; no member-specific logic. ── */
  function renderSummaryStats(el, report) {
    /* Grouped into .msc-summary-group sections (counts + split
       percentages, coverage, comparison, leave) purely for visual
       structure (2026-07-14 responsive layout). The four split-
       percentage rows (2026-07-17) sit inside the counts group,
       below Total and above the Tasks used group. */
    el.innerHTML =
      '<div class="msc-summary-group">' +
      '<div class="msc-summary-row"><span>Scheduled</span><strong>' + report.scheduled_count + ' task(s) &middot; ' + formatDuration(report.scheduled_duration_minutes) + '</strong></div>' +
      '<div class="msc-summary-row"><span>Unscheduled</span><strong>' + report.unscheduled_count + ' task(s) &middot; ' + formatDuration(report.unscheduled_duration_minutes) + '</strong></div>' +
      '<div class="msc-summary-row"><span>Total</span><strong>' + report.total_count + ' task(s) &middot; ' + formatDuration(report.total_duration_minutes) + '</strong></div>' +
      /* Count and duration split percentages (schedule-summary-count-
         duration-percentage, 2026-07-17). Placed directly below Total
         and before Tasks used. Every value is computed by the backend
         (scheduled_count_percentage / unscheduled_count_percentage /
         scheduled_duration_percentage / unscheduled_duration_percentage)
         and only formatted here — null (zero denominator) -> N/A. These
         describe only the Scheduled/Unscheduled split; no leave-
         deduction / adjusted-reference figure is involved. Kept in the
         same counts group as Scheduled/Unscheduled/Total (no extra
         divider) to avoid an unnecessary blank gap. */
      '<div class="msc-summary-row"><span>Scheduled Count %</span><strong>' + formatPercentage(report.scheduled_count_percentage) + '</strong></div>' +
      '<div class="msc-summary-row"><span>Unscheduled Count %</span><strong>' + formatPercentage(report.unscheduled_count_percentage) + '</strong></div>' +
      '<div class="msc-summary-row"><span>Scheduled Duration %</span><strong>' + formatPercentage(report.scheduled_duration_percentage) + '</strong></div>' +
      '<div class="msc-summary-row"><span>Unscheduled Duration %</span><strong>' + formatPercentage(report.unscheduled_duration_percentage) + '</strong></div>' +
      '</div>' +
      '<div class="msc-summary-group">' +
      '<div class="msc-summary-row"><span>Tasks used</span><strong>' + report.total_duration_used_task_count + '</strong></div>' +
      '<div class="msc-summary-row"><span>Tasks ignored</span><strong>' + report.total_duration_ignored_task_count + '</strong></div>' +
      '</div>' +
      '<div class="msc-summary-group">' +
      '<div class="msc-summary-row"><span>Scheduled vs. previous</span><strong>' + formatChange(report.scheduled_duration_change) + '</strong></div>' +
      '<div class="msc-summary-row"><span>Unscheduled vs. previous</span><strong>' + formatChange(report.unscheduled_duration_change) + '</strong></div>' +
      '</div>' +
      /* Leave-coordination-copy additions (REQ-LEAVE-COPY-001) — every
         value below is computed by the backend and simply formatted
         here, same as every other row in this function. Labeled
         "leave-deduction reference" rather than "expected attendance"
         — this system has no attendance model and does not claim one.
         active_leave_minutes (2026-07-16 simplification amendment —
         renamed from approved_leave_minutes) sums every leave row
         where deleted_at IS NULL; there is no Pending/Approved
         workflow to distinguish. */
      '<div class="msc-summary-group">' +
      '<div class="msc-summary-row"><span title="Weekday count × the confirmed Full-Day leave-deduction minutes — a reference figure, not an attendance record.">Leave-deduction reference basis</span><strong>' + formatDuration(report.base_leave_deduction_reference_minutes) + '</strong></div>' +
      '<div class="msc-summary-row"><span>Leave deduction</span><strong>' + formatDuration(report.active_leave_minutes) + '</strong></div>' +
      '<div class="msc-summary-row"><span title="Reference basis minus active leave-deduction minutes — a coordination-copy figure, not verified productive working time.">Adjusted reference (after leave)</span><strong>' + formatDuration(report.adjusted_expected_work_minutes) + '</strong></div>' +
      '<div class="msc-summary-row"><span>Task coverage of adjusted reference</span><strong>' + (report.task_coverage_percentage === null || report.task_coverage_percentage === undefined ? 'N/A' : report.task_coverage_percentage.toFixed(2) + '%') + '</strong></div>' +
      '</div>';
  }

  function loadDailySummary(dateStr) {
    dailySummaryTitleEl.textContent = 'Daily — ' + dateStr;
    apiRequest('GET', apiBase + '/reports/daily?date=' + encodeURIComponent(dateStr)).then(function (report) {
      renderSummaryStats(dailySummaryEl, report);
    }).catch(function () {
      dailySummaryEl.innerHTML = '<p class="msc-empty">Could not load daily summary.</p>';
    });
  }

  function loadWeeklySummary(dateStr) {
    // Monday-Sunday convention (2026-07-14) — see getReportWeekStart.
    // The backend independently normalizes to the same Monday
    // regardless, but computing it correctly here means the title
    // and the request always agree with what the response reports.
    var weekStartStr = toDateStr(getReportWeekStart(parseDateStr(dateStr)));
    weeklySummaryTitleEl.textContent = 'Weekly — week of ' + weekStartStr;
    apiRequest('GET', apiBase + '/reports/weekly?week_start=' + encodeURIComponent(weekStartStr)).then(function (report) {
      renderSummaryStats(weeklySummaryEl, report);
    }).catch(function () {
      weeklySummaryEl.innerHTML = '<p class="msc-empty">Could not load weekly summary.</p>';
    });
  }

  function loadMonthlySummary(dateStr) {
    var d = parseDateStr(dateStr);
    var monthStr = d.getFullYear() + '-' + pad(d.getMonth() + 1);
    monthlySummaryTitleEl.textContent = 'Monthly — ' + monthStr;
    apiRequest('GET', apiBase + '/reports/monthly?month=' + encodeURIComponent(monthStr)).then(function (report) {
      renderSummaryStats(monthlySummaryEl, report);
    }).catch(function () {
      monthlySummaryEl.innerHTML = '<p class="msc-empty">Could not load monthly summary.</p>';
    });
  }

  function loadSummaries(dateStr) {
    loadDailySummary(dateStr);
    loadWeeklySummary(dateStr);
    loadMonthlySummary(dateStr);
  }

  function resetForm() {
    fieldTitle.value = '';
    updateTitleCounter();
    fieldCategory.value = 'Scheduled Task';
    fieldCategory.disabled = false;
    fieldCategoryHelper.style.display = 'none';
    fieldPriority.value = 'Medium';
    fieldStart.value = '';
    fieldEnd.value = '';
    fieldNotes.value = '';
  }

  function cancelEdit() {
    state.editingId = null;
    addBtn.style.display = '';
    updateBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
    resetForm();
  }

  cancelBtn.addEventListener('click', cancelEdit);

  addBtn.addEventListener('click', function () {
    if (!fieldDate.value) { window.alert('Choose a date on the calendar first.'); return; }
    if (!fieldTitle.value.trim()) { window.alert('Enter a title (e.g. Prepare weekly report) before adding.'); return; }
    var payload = frontendToApiPayload({
      date: fieldDate.value,
      title: fieldTitle.value.trim(),
      category: fieldCategory.value,
      priority: fieldPriority.value,
      start: fieldStart.value,
      end: fieldEnd.value,
      notes: fieldNotes.value.trim()
    });
    var addedDate = fieldDate.value;
    addBtn.disabled = true;
    showApiStatus('Saving…', false, taskPopupStatusEl);
    apiRequest('POST', apiBase, payload).then(function (apiItem) {
      items.push(apiItemToFrontend(apiItem));
      showApiStatus('', false, taskPopupStatusEl);
      selectDate(addedDate);
      resetForm();
      closeTaskPopup();
    }).catch(function (err) {
      showApiStatus('Could not save this schedule item — the local API may be unavailable. Detail: ' + err.message, true, taskPopupStatusEl);
    }).then(function () { addBtn.disabled = false; });
  });

  function editItem(id) {
    var it = items.filter(function (x) { return x.id === id; })[0];
    if (!it) { return; }
    state.editingId = id;
    fieldDate.value = it.date;
    fieldTitle.value = it.title;
    updateTitleCounter();
    fieldCategory.value = it.category;
    fieldCategory.disabled = true;
    fieldCategoryHelper.style.display = '';
    fieldPriority.value = it.priority || 'Medium';
    fieldStart.value = it.start || '';
    fieldEnd.value = it.end || '';
    fieldNotes.value = it.notes || '';
    addBtn.style.display = 'none';
    updateBtn.style.display = '';
    cancelBtn.style.display = '';
    /* Edit (from the Schedule Items list, Step 20) opens the same
       single Task popup the fields above just populated — the form
       only exists inside the popup now, so without this the fields
       would be filled while hidden. */
    openTaskPopup();
  }

  updateBtn.addEventListener('click', function () {
    if (!state.editingId) { return; }
    var it = items.filter(function (x) { return x.id === state.editingId; })[0];
    if (!it) { return; }
    if (!fieldTitle.value.trim()) { window.alert('Enter a title before updating.'); return; }
    var payload = frontendToApiPayload({
      date: fieldDate.value,
      title: fieldTitle.value.trim(),
      category: fieldCategory.value,
      priority: fieldPriority.value,
      start: fieldStart.value,
      end: fieldEnd.value,
      notes: fieldNotes.value.trim()
    });
    var editingId = state.editingId;
    updateBtn.disabled = true;
    showApiStatus('Saving…', false, taskPopupStatusEl);
    apiRequest('PUT', apiBase + '/' + encodeURIComponent(editingId), payload).then(function (apiItem) {
      var updated = apiItemToFrontend(apiItem);
      var idx = items.indexOf(it);
      if (idx !== -1) { items[idx] = updated; }
      showApiStatus('', false, taskPopupStatusEl);
      selectDate(updated.date);
      cancelEdit();
      closeTaskPopup();
    }).catch(function (err) {
      showApiStatus('Could not update this schedule item — the local API may be unavailable. Detail: ' + err.message, true, taskPopupStatusEl);
    }).then(function () { updateBtn.disabled = false; });
  });

  function deleteItem(id) {
    var it = items.filter(function (x) { return x.id === id; })[0];
    if (!it) { return; }
    var ok = window.confirm('Delete this sample schedule item ("' + it.title + '")? This only removes ' +
      'testing data from the local API/database — it does not touch any real source or database.');
    if (!ok) { return; }
    showApiStatus('Deleting…', false);
    apiRequest('DELETE', apiBase + '/' + encodeURIComponent(id)).then(function () {
      items = items.filter(function (x) { return x.id !== id; });
      showApiStatus('', false);
      if (state.editingId === id) { cancelEdit(); }
      renderActiveView();
      renderList();
      if (state.selectedDate) { loadSummaries(state.selectedDate); }
    }).catch(function (err) {
      showApiStatus('Could not delete this schedule item — the local API may be unavailable. Detail: ' + err.message, true);
    });
  }

  /* Modal focus management (Phase 1 polish, 2026-07-10) — presentation/
     keyboard-behaviour only, no change to calendar item data or CRUD
     calls. lastFocusedTrigger lets Close/Escape/backdrop-click return
     focus to whichever "View" button opened the modal. Since the modal
     body only ever contains one interactive control (the Close button),
     Tab is simply pinned there — a correct, minimal focus trap for this
     content rather than a general-purpose one. */
  var lastFocusedTrigger = null;

  function onViewModalKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      closeViewModal();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      viewClose.focus();
    }
  }

  function closeViewModal() {
    viewModal.classList.remove('show');
    viewModal.removeEventListener('keydown', onViewModalKeydown);
    if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === 'function') {
      lastFocusedTrigger.focus();
    }
    lastFocusedTrigger = null;
  }

  function viewItem(id, triggerEl) {
    var it = items.filter(function (x) { return x.id === id; })[0];
    if (!it) { return; }
    viewTitle.textContent = it.title;
    viewDate.textContent = 'Date: ' + it.date;
    viewTime.textContent = 'Time: ' + ((it.start || it.end) ? (it.start || '?') + ' – ' + (it.end || '?') : 'Not set');
    viewCategory.textContent = 'Category: ' + it.category;
    viewPriority.textContent = 'Priority: ' + (it.priority || 'Medium');
    viewNotes.textContent = 'Notes: ' + (it.notes || '(none)');
    lastFocusedTrigger = triggerEl || document.activeElement;
    viewModal.classList.add('show');
    viewModal.addEventListener('keydown', onViewModalKeydown);
    viewClose.focus();
  }

  viewClose.addEventListener('click', closeViewModal);
  viewModal.addEventListener('click', function (e) {
    if (e.target === viewModal) { closeViewModal(); }
  });

  clearBtn.addEventListener('click', function () {
    var ok = window.confirm('Clear ALL testing schedule data for ' + memberLabel +
      ' from the local API/database? This cannot be undone. Only "dashboard_testing" rows are affected — ' +
      'it does not touch any real source, official record, or database.');
    if (!ok) { return; }
    showApiStatus('Clearing testing data…', false);
    apiRequest('DELETE', apiBase + '/clear-testing-data').then(function () {
      items = [];
      showApiStatus('', false);
      cancelEdit();
      renderActiveView();
      renderList();
    }).catch(function (err) {
      showApiStatus('Could not clear testing data — the local API may be unavailable. Detail: ' + err.message, true);
    });
  });

  /* ── Leave coordination copy (REQ-LEAVE-COPY-001) ──────────────
     Own API base (leaveApiBase), own state (leaveItems), own render
     functions — never mixed into the task `items` array or
     `renderList()`, since leave is a structurally separate concept
     (dedicated backend table, dedicated routes) from Scheduled/
     Unscheduled tasks. ── */

  function leaveApiRequest(method, url, body) {
    var opts = { method: method, headers: {} };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (errBody) {
          /* member-leave-overlap-prevention (2026-07-17): a create/
             edit blocked by another active leave record this member
             already holds returns a raw 409 body
             ({error:"leave_overlap", message, conflicts:[...]}) with
             no "detail" wrapper — same shape convention as the
             existing leave_conflict (task-vs-leave) contract in
             apiRequest() above. Tagged on the thrown Error so the
             leave-create click handler can show it inline near the
             form instead of a generic alert. */
          if (errBody && errBody.error === 'leave_overlap') {
            var overlapErr = new Error(
              errBody.message ||
              'This member already has leave that overlaps the selected date or time.'
            );
            overlapErr.isLeaveOverlap = true;
            overlapErr.conflicts = errBody.conflicts || [];
            throw overlapErr;
          }
          var detail = errBody && errBody.detail ? JSON.stringify(errBody.detail) :
            (errBody && errBody.message ? errBody.message : (res.status + ' ' + res.statusText));
          throw new Error(detail);
        });
      }
      if (res.status === 204) { return null; }
      return res.json();
    });
  }

  /* Inline status line for the leave create form only — same
     (message, isError) contract and .msc-api-status visual language
     as showApiStatus() above, kept as a separate element/function so
     a leave-overlap rejection is shown next to the leave form
     without disturbing the calendar-wide status line. */
  function showLeaveFormStatus(message, isError) {
    if (!leaveFormStatusEl) { return; }
    if (!message) {
      leaveFormStatusEl.style.display = 'none';
      leaveFormStatusEl.textContent = '';
      leaveFormStatusEl.removeAttribute('role');
      leaveFormStatusEl.classList.remove('msc-api-status--info', 'msc-api-status--error');
      return;
    }
    leaveFormStatusEl.style.display = '';
    leaveFormStatusEl.classList.toggle('msc-api-status--error', !!isError);
    leaveFormStatusEl.classList.toggle('msc-api-status--info', !isError);
    leaveFormStatusEl.setAttribute('role', isError ? 'alert' : 'status');
    leaveFormStatusEl.textContent = message;
  }

  function loadLeaveItems() {
    return leaveApiRequest('GET', leaveApiBase).then(function (rows) {
      return rows || [];
    }).catch(function () { return []; });
  }

  function updateLeaveFormFieldVisibility() {
    var leaveType = leaveFieldType.value;
    var isShortLeave = leaveType === 'Short Leave';
    var isMultiDay = leaveType === 'Multi-Day';
    leaveFieldTimeWraps.forEach(function (wrap) { wrap.style.display = isShortLeave ? '' : 'none'; });
    leaveFieldEndDateWrap.style.display = isMultiDay ? '' : 'none';
  }
  leaveFieldType.addEventListener('change', function () {
    updateLeaveFormFieldVisibility();
    showLeaveFormStatus('', false);
  });
  updateLeaveFormFieldVisibility();

  function resetLeaveForm() {
    leaveFieldType.value = 'Short Leave';
    leaveFieldStartDate.value = '';
    leaveFieldEndDate.value = '';
    leaveFieldStartTime.value = '';
    leaveFieldEndTime.value = '';
    leaveFieldPurpose.value = '';
    leaveFieldExternalReference.value = '';
    updateLeaveFormFieldVisibility();
  }

  leaveCreateBtn.addEventListener('click', function () {
    var leaveType = leaveFieldType.value;
    showLeaveFormStatus('', false);
    if (!leaveFieldStartDate.value) { window.alert('Choose a start date for this leave request.'); return; }
    var payload = {
      leave_type: leaveType,
      start_date: leaveFieldStartDate.value,
      purpose: leaveFieldPurpose.value.trim() || null,
      external_reference: leaveFieldExternalReference.value.trim() || null
    };
    if (leaveType === 'Multi-Day') {
      if (!leaveFieldEndDate.value) { window.alert('Choose an end date for Multi-Day leave.'); return; }
      payload.end_date = leaveFieldEndDate.value;
    }
    if (leaveType === 'Short Leave') {
      if (!leaveFieldStartTime.value || !leaveFieldEndTime.value) {
        window.alert('Short Leave requires both a start time and an end time.'); return;
      }
      payload.start_time = leaveFieldStartTime.value;
      payload.end_time = leaveFieldEndTime.value;
    }
    leaveCreateBtn.disabled = true;
    leaveApiRequest('POST', leaveApiBase, payload).then(function (record) {
      leaveItems.push(record);
      resetLeaveForm();
      renderActiveView();
      renderLeaveList();
      /* Refresh leave-deduction reporting on successful save (Step 13,
         2026-07-20 popup workflow) — same guarded call
         deleteLeaveRecord() below already uses; previously only
         delete refreshed summaries, not create. Calls the existing,
         unmodified loadSummaries()/report endpoints — no Schedule
         Summary logic changed. */
      if (state.selectedDate) { loadSummaries(state.selectedDate); }
      closeLeavePopup();
    }).catch(function (err) {
      /* member-leave-overlap-prevention (2026-07-17): on a 409
         leave_overlap rejection, the form is deliberately NOT reset
         (entered fields stay exactly as the user left them) and no
         chip/list entry is created (leaveItems.push above never
         runs on this path) — the backend rejected the write, so
         nothing was ever stored. The message is shown inline next
         to the form rather than a blocking window.alert, and focus
         moves to the start-date field so the user can see/adjust
         the conflicting date. */
      if (err.isLeaveOverlap) {
        showLeaveFormStatus(err.message, true);
        if (leaveFieldStartDate && leaveFieldStartDate.focus) { leaveFieldStartDate.focus(); }
      } else {
        window.alert('Could not create this leave request. Detail: ' + err.message);
      }
    }).then(function () { leaveCreateBtn.disabled = false; });
  });

  /* Soft-deletes an active leave record (2026-07-16 simplification
     amendment — the only removal mechanism now that there is no
     Cancelled/Rejected status). Confirms first, then refreshes the
     calendar, the leave list, and the leave-deduction reports. */
  function deleteLeaveRecord(leaveId, btn) {
    if (!window.confirm('Delete this leave record? This cannot be undone from the calendar.')) {
      return;
    }
    if (btn) { btn.disabled = true; }
    leaveApiRequest('DELETE', leaveApiBase + '/' + encodeURIComponent(leaveId)).then(function () {
      leaveItems = leaveItems.filter(function (lv) { return lv.id !== leaveId; });
      renderActiveView();
      renderLeaveList();
      if (state.selectedDate) { loadSummaries(state.selectedDate); }
    }).catch(function (err) {
      window.alert('Could not delete this leave record. Detail: ' + err.message);
    }).then(function () { if (btn) { btn.disabled = false; } });
  }

  function renderLeaveList() {
    if (!state.selectedDate) {
      leaveListEl.innerHTML = '<p class="msc-leave-empty">Select a date on the calendar to see leave for that date.</p>';
      return;
    }
    var dayLeave = leaveItemsForDate(state.selectedDate);
    if (!dayLeave.length) {
      leaveListEl.innerHTML = '<p class="msc-leave-empty">No leave for ' +
        escapeHtml(memberLabel) + ' on ' + state.selectedDate + '.</p>';
      return;
    }
    var html = '';
    dayLeave.forEach(function (lv) {
      var dateRange = lv.start_date === lv.end_date ? lv.start_date : (lv.start_date + ' – ' + lv.end_date);
      var timeStr = (lv.start_time && lv.end_time) ? (lv.start_time.slice(0, 5) + '–' + lv.end_time.slice(0, 5)) : '';
      html += '<div class="msc-leave-item-card" data-leave-id="' + lv.id + '">';
      html += '<div><div class="msc-item-title">' + escapeHtml(formatLeaveCalendarLabel(lv)) + '</div>';
      html += '<div class="msc-item-meta">' + escapeHtml(dateRange) + (timeStr ? ' &middot; ' + escapeHtml(timeStr) : '') +
        (lv.effective_leave_minutes ? ' &middot; ' + lv.effective_leave_minutes + ' leave-deduction min' : '') + '</div>';
      if (lv.purpose) { html += '<div class="msc-item-meta">' + escapeHtml(lv.purpose) + '</div>'; }
      html += '</div><div class="msc-item-actions">';
      html += '<button type="button" data-leave-delete data-leave-id="' + lv.id + '">Delete Leave</button>';
      html += '</div></div>';
    });
    leaveListEl.innerHTML = html;
    leaveListEl.querySelectorAll('button[data-leave-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        deleteLeaveRecord(btn.getAttribute('data-leave-id'), btn);
      });
    });
  }

  /* ── Init this instance ──
     Items are loaded from the API before the first render. No seed/sample
     data is created automatically — the list stays empty (and the calendar
     shows no chips) until the user manually adds an item, so mounting this
     instance never writes a row to PostgreSQL by itself. Narrow screens
     default to Day (Agenda was removed in the Phase 1 layout-shell
     redesign, 2026-07-14; Day has no horizontal-scroll grid and is the
     most information-dense single-column view without it); desktop
     keeps the original Month default unchanged. */
  var t0 = new Date();
  state.viewYear = t0.getFullYear();
  state.viewMonth = t0.getMonth();
  state.anchorDate = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate());
  if (typeof window !== 'undefined' && window.innerWidth && window.innerWidth <= 640) {
    state.currentView = 'day';
  }
  syncViewSwitcherButtons();
  renderActiveView();

  // Current-time indicator refresh — cheap full re-render is fine at
  // this scale (a handful of items per member); only matters visually
  // while Week/Day is the active view.
  setInterval(function () {
    if (state.currentView === 'week' || state.currentView === 'day') { renderActiveView(); }
  }, 60000);

  loadItems().then(function (loaded) {
    items = loaded;
    return loadLeaveItems();
  }).then(function (loadedLeave) {
    leaveItems = loadedLeave;
    selectDate(toDateStr(t0));
  });
}

export function initAllScheduleCalendars() {
  var containers = document.querySelectorAll('.msc-instance');
  containers.forEach(function (container) {
    try {
      mountScheduleCalendarInstance(container);
    } catch (err) {
      if (window.console && window.console.error) {
        window.console.error('Schedule calendar failed to initialize for member "' +
          container.getAttribute('data-member-key') + '":', err);
      }
    }
  });
}

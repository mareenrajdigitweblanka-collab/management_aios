/* calendar/instance.js — the shared per-member calendar factory
   (mountScheduleCalendarInstance) plus initAllScheduleCalendars(). Extracted
   verbatim from the former inline calendar IIFE (2026-07-17 frontend
   modularization); render/CRUD/state/tasks/leave/reports remain here as
   per-instance closures over shared instance state (splitting them would
   require rewriting working logic, which this refactor deliberately avoids).
   The former inline DOMContentLoaded bootstrap now lives in app.js. */

import { MEMBER_SCHEDULE_API_BASE, MEMBER_LEAVE_API_BASE } from '../config.js';
import {
  CATEGORY_CLASS, LEAVE_TYPE_DISPLAY_LABEL, formatLeaveCalendarLabel, expandWeekdaysClientSide, leaveDatesForItem, LEAVE_HALF_DAY_FIRST_DISPLAY, LEAVE_HALF_DAY_SECOND_DISPLAY, leaveDisplayTimeRange, PRIORITY_ORDER, PRIORITY_BADGE, MONTH_NAMES, DAY_HEADS, DAY_NAMES_FULL, TG_ROW_HEIGHT_PX, TG_HOURS, TG_DEFAULT_SCROLL_HOUR, pad, toDateStr, parseDateStr, timeToMinutes, minutesToTime, formatHourLabel, formatShortDate, formatDuration, formatPercentage, formatChange, getSplitWarningState, getMetricStatusCopy, combineSummaryStatus, getPeriodStatusCopy, getSplitBarSegments, getWeekStart, getReportWeekStart, getWeekDays, buildMonthGridCells, layoutOverlappingItems, escapeHtml, apiItemToFrontend, frontendToApiPayload
} from './core.js';
import { trapTab, returnFocus } from '../ui/popup.js';
import { showToast } from '../ui/toast.js';
import { confirmDestructive } from '../ui/dialog.js';
import { setButtonBusy, showInlineLoading } from '../ui/loading.js';
import { setFieldError, clearFieldError, clearFormErrors, focusFirstInvalid } from '../ui/form-feedback.js';
import { mapApiError, classifyHttpStatus } from '../ui/error-mapper.js';

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
  /* Same per-instance-unique-id rule (calendar-based Leave detail popup,
     2026-07-22 member-page-layout task) — the Leave-detail view popup's
     aria-labelledby target, mirroring viewTitleId's role for the Task
     detail popup above. */
  var leaveViewTitleId = 'msc-leave-view-title-' + memberKey;
  /* Same per-instance-unique-id rule (task-detail "+N more" popup,
     2026-07-20 calendar-task-detail-and-more-popup task). */
  var morePopupTitleId = 'msc-more-popup-title-' + memberKey;

  var rajivNoteHtml = showRajivNote
    ? '<div class="msc-rajiv-note show">This testing calendar does not confirm Admin Manager approval, escalation, or authority rules.</div>'
    : '';

  container.innerHTML =
    '<div class="msc-calendar-shell">' +
    '<p class="msc-note" style="font-weight:600;color:var(--text);">Click a date to create or manage a schedule item.</p>' +
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
    '</div>' +
    '<div class="msc-mini-picker" aria-label="Mini date picker"></div>' +
    '<div class="msc-category-legend" aria-label="Task category legend">' +
    '<span class="msc-chip-cat task">Scheduled Task</span>' +
    '<span class="msc-chip-cat followup">Unscheduled Task</span>' +
    '</div>' +
    '</div>' +
    /* Create chooser menu (2026-07-22 collapsed-sidebar-create-chooser
       fix) — deliberately NOT nested inside .msc-sidebar above.
       .msc-sidebar.collapsed sets display:none on its whole subtree
       (calendar.css), which was also hiding this popup any time the
       calendar's internal sidebar was collapsed, even though it opens
       from a Month/Week/Day/all-day empty-cell click that has nothing
       to do with the sidebar (openCreateChoiceFromCalendar below).
       position:fixed (set by positionCreateMenu()) only escapes an
       ancestor's overflow/stacking context, never an ancestor's
       display:none, so the fix is DOM placement, not a CSS/z-index
       change: this menu now lives as a sidebar-independent sibling that
       is never touched by the collapse toggle. */
    '<div class="msc-create-menu" id="' + escapeHtml(createMenuId) + '" role="menu" aria-label="Create" hidden>' +
    '<div class="msc-create-menu-head">' +
    '<div class="msc-create-menu-heading" aria-hidden="true">Create</div>' +
    '<button type="button" class="msc-modal-close msc-create-menu-close" aria-label="Close create menu">&times;</button>' +
    '</div>' +
    /* Visible labels shortened to "Task"/"Leave" (2026-07-20 chooser-label
       task) — the "Create" heading above already states the action once;
       repeating it on every item read as redundant. aria-label keeps the
       fuller "Create Task"/"Create Leave" accessible name for screen-reader
       users even though the visible text is shorter (Step 3 requirement). */
    '<button type="button" class="msc-create-menu-item" role="menuitem" data-create-kind="task" aria-label="Create Task">' +
    '<span class="msc-create-menu-icon" aria-hidden="true">&#128221;</span>Task</button>' +
    '<button type="button" class="msc-create-menu-item" role="menuitem" data-create-kind="leave" aria-label="Create Leave">' +
    '<span class="msc-create-menu-icon" aria-hidden="true">&#128197;</span>Leave</button>' +
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
       popup. The lower-page Schedule Item list was removed 2026-07-20
       (calendar-task-detail-and-more-popup task) — every Task click
       (Month chip, Week/Day block, all-day chip, "+N more" popup row)
       opens the shared msc-view-modal task-detail popup. The separate
       Leave Coordination list card was removed 2026-07-22
       (member-page-layout-leave-popup-collapse-and-ph-staff task) —
       Leave is now viewed/edited/deleted by clicking a red Leave item
       directly on the calendar (see msc-leave-view-modal below), so
       Schedule Summary is followed immediately by the Priority
       Preview list-card.) ── */
    '<div class="hr-table-card">' +
    '<div class="msc-list-card">' +
    '<div class="hr-table-title" style="margin-bottom:6px;">Priority Preview — Today (Sample/Demo)</div>' +
    '<p class="msc-note" style="margin:0 0 8px;">Ranks today\'s sample items High → Medium → Low, styled ' +
    'after the Management Team Schedule demo. Sample/demo priority only — not a real priority assignment.</p>' +
    '<div class="msc-priority-list"></div>' +
    '</div>' +
    /* ── Shared Task-detail popup (Google-style, calendar-task-detail-
       and-more-popup task, 2026-07-20) — the ONE task-detail popup used
       by every calendar view (Month chip, Week/Day timed block, all-day
       chip, "+N more" popup row). Fields are the existing Task fields
       only (title/date/time/category/priority/notes) — no new fields
       invented. Edit/Delete reuse the existing editItem()/deleteItem()
       functions; nothing new is added to backend/API contracts. */
    '<div class="msc-modal-overlay msc-view-modal" role="dialog" aria-modal="true" aria-labelledby="' + escapeHtml(viewTitleId) + '">' +
    '<div class="msc-modal msc-view-modal-inner">' +
    '<div class="msc-view-modal-head">' +
    '<span class="msc-view-color-dot" aria-hidden="true"></span>' +
    '<h4 class="msc-view-title" id="' + escapeHtml(viewTitleId) + '"></h4>' +
    '<button type="button" class="msc-modal-close msc-view-close" aria-label="Close">&times;</button>' +
    '</div>' +
    '<p class="msc-view-date"></p>' +
    '<p class="msc-view-time"></p>' +
    '<p class="msc-view-category"></p>' +
    '<p class="msc-view-priority"></p>' +
    '<p class="msc-view-notes"></p>' +
    '<div class="msc-view-actions">' +
    '<button type="button" class="msc-btn msc-btn-danger msc-view-delete-btn">Delete</button>' +
    '<button type="button" class="msc-btn msc-btn-primary msc-view-edit-btn">Edit</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    /* ── Shared Leave-detail popup (calendar-based Leave management,
       2026-07-22 member-page-layout task) — the ONE Leave-detail popup
       used by every calendar view (Month leave chip, Week/Day all-day
       leave chip, Week/Day timed leave block). Mirrors the Task-detail
       popup above (same .msc-modal-overlay/.msc-view-modal-inner/
       .msc-view-actions structure) so Leave gets the same professional
       treatment without a second popup framework. Fields are the
       existing Leave fields only (type/date-range/time/purpose/
       external reference/leave-deduction minutes where already
       available) — no new field invented. Edit/Delete reuse the
       existing Leave create form and deleteLeaveRecord()/leaveApiRequest()
       functions; nothing new is added to the backend/API contract. */
    '<div class="msc-modal-overlay msc-leave-view-modal" role="dialog" aria-modal="true" aria-labelledby="' + escapeHtml(leaveViewTitleId) + '">' +
    '<div class="msc-modal msc-view-modal-inner">' +
    '<div class="msc-view-modal-head">' +
    '<span class="msc-view-color-dot leave" aria-hidden="true"></span>' +
    '<h4 class="msc-view-title" id="' + escapeHtml(leaveViewTitleId) + '">Leave details</h4>' +
    '<button type="button" class="msc-modal-close msc-leave-view-close" aria-label="Close">&times;</button>' +
    '</div>' +
    '<p class="msc-leave-view-type"></p>' +
    '<p class="msc-leave-view-date"></p>' +
    '<p class="msc-leave-view-time"></p>' +
    '<p class="msc-leave-view-purpose"></p>' +
    '<p class="msc-leave-view-reference"></p>' +
    '<p class="msc-leave-view-deduction"></p>' +
    '<div class="msc-view-actions">' +
    '<button type="button" class="msc-btn msc-btn-danger msc-leave-view-delete-btn">Delete</button>' +
    '<button type="button" class="msc-btn msc-btn-primary msc-leave-view-edit-btn">Edit</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    /* ── Month "+N more" date-specific popup (Step 8/9, same task) —
       compact, anchored near the "+N more" link; lists only Task
       records (never Leave) for the active member/date. Each row opens
       the shared msc-view-modal above via the existing viewItem(). ── */
    '<div class="msc-more-popup" role="dialog" aria-labelledby="' + escapeHtml(morePopupTitleId) + '" hidden>' +
    '<div class="msc-more-popup-head">' +
    '<div class="msc-more-popup-head-text">' +
    '<h4 class="msc-more-popup-title" id="' + escapeHtml(morePopupTitleId) + '"></h4>' +
    '<span class="msc-more-popup-count"></span>' +
    '</div>' +
    '<button type="button" class="msc-modal-close msc-more-popup-close" aria-label="Close">&times;</button>' +
    '</div>' +
    /* Scrollable body (Step 5/6, calendar-popup-close-time-validation-
       task-list-return task, 2026-07-22) — only this element scrolls;
       .msc-more-popup-head above stays outside it and always visible.
       tabindex="-1" + aria-label make it a keyboard-reachable, labelled
       scroll container in its own right (Page Up/Down/Home/End/arrow
       keys work natively on a focused scrollable element — no custom
       key handling needed for that part). */
    '<div class="msc-more-popup-body" tabindex="-1" aria-label="Tasks">' +
    '<div class="msc-more-popup-list"></div>' +
    '</div>' +
    '</div>' +
    /* ── Task creation popup (Google-style create workflow, 2026-07-20)
       — the one and only Schedule Item creation/edit form in the DOM,
       moved here verbatim (same field classes, same title-counter,
       same Add/Update/Cancel buttons) from its former lower-page
       position. The manual category selector that used to sit here was
       removed 2026-07-22 — category is always backend-assigned; see
       msc-field-category-note. */
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
    '<p class="msc-form-full msc-field-category-note">Task type is assigned automatically based on when ' +
    'the task is created or changed.</p>' +
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
    '<h4 class="msc-leave-popup-heading" id="' + escapeHtml(leavePopupTitleId) + '">Create Leave</h4>' +
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
    '<button type="button" class="msc-btn msc-btn-primary msc-leave-update-btn" style="display:none;">Update leave</button>' +
    '<button type="button" class="msc-btn msc-btn-ghost msc-leave-cancel-btn" style="display:none;">Cancel edit</button>' +
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
  var fieldDate = container.querySelector('.msc-field-date');
  if (fieldDate) { fieldDate.addEventListener('input', function () { clearFieldError(fieldDate); }); }
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
  if (fieldTitle) {
    fieldTitle.addEventListener('input', updateTitleCounter);
    fieldTitle.addEventListener('input', function () { clearFieldError(fieldTitle); });
  }
  var fieldPriority = container.querySelector('.msc-field-priority');
  var fieldStart = container.querySelector('.msc-field-start');
  var fieldEnd = container.querySelector('.msc-field-end');
  var fieldNotes = container.querySelector('.msc-field-notes');
  var addBtn = container.querySelector('.msc-add-btn');
  var updateBtn = container.querySelector('.msc-update-btn');
  var cancelBtn = container.querySelector('.msc-cancel-btn');
  var priorityListEl = container.querySelector('.msc-priority-list');
  var dailySummaryEl = container.querySelector('.msc-summary-daily');
  var dailySummaryTitleEl = container.querySelector('.msc-summary-daily-title');
  var weeklySummaryEl = container.querySelector('.msc-summary-weekly');
  var weeklySummaryTitleEl = container.querySelector('.msc-summary-weekly-title');
  var monthlySummaryEl = container.querySelector('.msc-summary-monthly');
  var monthlySummaryTitleEl = container.querySelector('.msc-summary-monthly-title');
  var viewModal = container.querySelector('.msc-view-modal');
  var viewColorDot = container.querySelector('.msc-view-color-dot');
  var viewTitle = container.querySelector('.msc-view-title');
  var viewDate = container.querySelector('.msc-view-date');
  var viewTime = container.querySelector('.msc-view-time');
  var viewCategory = container.querySelector('.msc-view-category');
  var viewPriority = container.querySelector('.msc-view-priority');
  var viewNotes = container.querySelector('.msc-view-notes');
  var viewClose = container.querySelector('.msc-view-close');
  var viewEditBtn = container.querySelector('.msc-view-edit-btn');
  var viewDeleteBtn = container.querySelector('.msc-view-delete-btn');
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
  var createMenuClose = container.querySelector('.msc-create-menu-close');
  var createMenuItems = container.querySelectorAll('.msc-create-menu-item');
  var taskPopupOverlay = container.querySelector('.msc-task-popup');
  var taskPopupClose = container.querySelector('.msc-task-popup-close');
  var taskPopupStatusEl = container.querySelector('.msc-task-popup-status');
  var leavePopupOverlay = container.querySelector('.msc-leave-popup');
  var leavePopupClose = container.querySelector('.msc-leave-popup-close');

  /* ── Month "+N more" date-specific popup refs (Step 8/9,
     calendar-task-detail-and-more-popup task, 2026-07-20) ── */
  var morePopupOverlay = container.querySelector('.msc-more-popup');
  var morePopupTitle = container.querySelector('.msc-more-popup-title');
  var morePopupCount = container.querySelector('.msc-more-popup-count');
  var morePopupBody = container.querySelector('.msc-more-popup-body');
  var morePopupList = container.querySelector('.msc-more-popup-list');
  var morePopupClose = container.querySelector('.msc-more-popup-close');

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
  var leaveUpdateBtn = container.querySelector('.msc-leave-update-btn');
  var leaveCancelBtn = container.querySelector('.msc-leave-cancel-btn');
  var leavePopupHeading = container.querySelector('.msc-leave-popup-heading');
  var leaveFormStatusEl = container.querySelector('.msc-leave-form-status');

  /* ── Leave-detail popup scoped refs (calendar-based Leave management,
     2026-07-22 member-page-layout task) ── */
  var leaveViewModal = container.querySelector('.msc-leave-view-modal');
  var leaveViewClose = container.querySelector('.msc-leave-view-close');
  var leaveViewType = container.querySelector('.msc-leave-view-type');
  var leaveViewDate = container.querySelector('.msc-leave-view-date');
  var leaveViewTime = container.querySelector('.msc-leave-view-time');
  var leaveViewPurpose = container.querySelector('.msc-leave-view-purpose');
  var leaveViewReference = container.querySelector('.msc-leave-view-reference');
  var leaveViewDeduction = container.querySelector('.msc-leave-view-deduction');
  var leaveViewEditBtn = container.querySelector('.msc-leave-view-edit-btn');
  var leaveViewDeleteBtn = container.querySelector('.msc-leave-view-delete-btn');

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
    /* Reposition the "+N more" Task list if it's open (Step 12,
       calendar-popup-close-time-validation-task-list-return task,
       2026-07-22) — collapsing/expanding this calendar's own sidebar can
       shift where the anchor chip/cell sits. Immediate call handles an
       instant layout change; the delayed one covers the CSS collapse
       transition (.2s, calendar.css) finishing after that. */
    repositionMorePopupIfOpen();
    setTimeout(repositionMorePopupIfOpen, 220);
  });

  /* Application-level sidebar collapse toggle (navigation.js, one global
     #sidebarCollapseToggle button, outside this instance's own markup) —
     each of the 5 mounted calendar instances adds its own guarded
     listener here; repositionMorePopupIfOpen() is a no-op for every
     instance whose own popup isn't currently open, so this stays safe
     and cheap even with 5 listeners on the same button (Step 12). */
  var appSidebarCollapseToggle = document.getElementById('sidebarCollapseToggle');
  if (appSidebarCollapseToggle) {
    appSidebarCollapseToggle.addEventListener('click', function () {
      repositionMorePopupIfOpen();
      setTimeout(repositionMorePopupIfOpen, 220);
    });
  }

  /* ── "+ Create" dropdown (Google-style create workflow, 2026-07-20)
     — replaces the former scroll-to-form shortcut. Only one dropdown
     can be open per instance (createMenuOpen is closure-scoped to
     this mount); each of the 5 member calendars keeps independent
     state, same pattern as the sidebar-collapse toggle above. */
  var createMenuOpen = false;
  /* Tracks whichever element actually opened the chooser (the sidebar
     Create button, or a Month/Week/Day/all-day empty-area anchor via
     openCreateChoiceFromCalendar below) — calendar-popup-close-time-
     validation-task-list-return task, 2026-07-22. Previously Escape
     always returned focus to sidebarCreateBtn regardless of the real
     opener; the new Close button and Escape both use this instead. */
  var createMenuTriggerEl = null;

  /* focusTarget (optional) — only the explicit Close button and Escape
     paths pass one (returning focus to whatever opened the chooser);
     the outside-click path keeps calling this with no argument so
     clicking elsewhere is never redirected back into the chooser,
     matching the existing outside-click convention used by the "+N
     more" popover (closeMorePopup) below. */
  function closeCreateMenu(focusTarget) {
    if (!createMenuOpen) { return; }
    createMenuOpen = false;
    createMenuEl.hidden = true;
    sidebarCreateBtn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onDocClickForCreateMenu, true);
    document.removeEventListener('keydown', onCreateMenuKeydown, true);
    if (focusTarget && typeof focusTarget.focus === 'function') { returnFocus(focusTarget); }
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
    var menuWidth = createMenuEl.offsetWidth || 260;
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
    /* Every "Create chooser opens" path (sidebar Create button, a Month
       cell dblclick, keyboard Enter/Space on a cell, Week/Day empty-slot
       clicks) funnels through here — single place to satisfy Step 3's
       "clear pending timers when ... Create chooser opens". */
    clearPendingCellClick();
    createMenuOpen = true;
    createMenuTriggerEl = anchorEl || sidebarCreateBtn;
    createMenuEl.hidden = false;
    positionCreateMenu(anchorEl || sidebarCreateBtn);
    sidebarCreateBtn.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', onDocClickForCreateMenu, true);
    document.addEventListener('keydown', onCreateMenuKeydown, true);
  }

  function onDocClickForCreateMenu(e) {
    /* Checked separately (2026-07-22 collapsed-sidebar-create-chooser fix)
       — createMenuEl is no longer a DOM descendant of createWrapEl (see
       the mount markup above), so a click on a Task/Leave menu item must
       be tested against createMenuEl directly or this capture-phase
       listener would treat it as an outside click and close the menu
       before the item's own click handler runs. */
    if (createWrapEl && createWrapEl.contains(e.target)) { return; }
    if (createMenuEl && createMenuEl.contains(e.target)) { return; }
    closeCreateMenu();
  }

  function onCreateMenuKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      closeCreateMenu(createMenuTriggerEl);
    }
  }

  if (createMenuClose) {
    createMenuClose.addEventListener('click', function (e) {
      /* Stop propagation before the capture-phase onDocClickForCreateMenu
         listener runs — otherwise it would treat this as an "outside"
         click (harmless here since closeCreateMenu() below is already
         idempotent once createMenuOpen is false, but stopping it keeps
         this click from being double-handled). */
      e.stopPropagation();
      closeCreateMenu(createMenuTriggerEl);
    });
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
        cancelLeaveEdit(false);
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
  /* Delegates to the shared ui/popup.js trap (Phase 1 professional-UX-
     feedback task, 2026-07-22) — same overlayEl-then-".msc-modal"
     resolution the former local implementation used, so every existing
     call site (unchanged below) keeps its exact prior Tab behavior. */
  function trapPopupTab(overlayEl, e) {
    trapTab(overlayEl.querySelector('.msc-modal'), e);
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
             conflicts:[...]}) with no "detail" wrapper. Tagged with a
             stable .code (Phase 1 professional-UX-feedback task,
             2026-07-22) so ui/error-mapper.js can map it to a plain-
             language message rather than any caller building one from
             raw response text. No status field exists on a conflict
             entry (2026-07-16 simplification amendment). */
          var err;
          if (errBody && errBody.error === 'leave_conflict') {
            err = new Error(errBody.message || 'This task conflicts with active leave.');
            err.code = 'leave_conflict';
            err.conflicts = errBody.conflicts || [];
          } else {
            err = new Error('Request failed.');
            err.code = classifyHttpStatus(res.status);
          }
          err.status = res.status;
          throw err;
        });
      }
      if (res.status === 204) { return null; }
      return res.json();
    }).catch(function (err) {
      /* A rejection that reaches here without a .code was never one of
         our own deliberately-thrown errors above — it is fetch() itself
         failing (offline, DNS, CORS, etc.), tagged 'network' so the
         mapper shows a plain connectivity message rather than a raw
         browser exception. */
      if (!err.code) { err.code = 'network'; }
      throw err;
    });
  }

  function loadItems() {
    showApiStatus('Loading your calendar…', false);
    return apiRequest('GET', apiBase).then(function (rows) {
      showApiStatus('', false);
      return (rows || []).map(apiItemToFrontend);
    }).catch(function (err) {
      var mapped = mapApiError(err);
      showApiStatus(mapped.title + ' — ' + mapped.message, true);
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

  /* ── Month visible-task-preview cap (Step 3/4/6, calendar-two-task-
     preview-and-cell-height task, 2026-07-20) ── Always exactly 2, per the
     confirmed display rule: 0 tasks -> none; 1 -> one; 2 -> two; 3+ -> two
     plus a complete "+N more". Uniform for every member — no per-member
     value, and never dynamically shown as fewer than 2 wherever 2+ tasks
     exist.

     This replaces the calendar-chooser-label-and-more-responsive task's
     viewport-height-dependent computeMonthChipCapacity() — that fix could
     still fall back to a single visible preview at common laptop
     viewport heights (~768-900px tall), which is the exact bug this task
     fixes. A plain constant is now safe (rather than a live calculation)
     because --calendar-month-row-min-height (tokens.css), consumed by
     .msc-cal-grid.active's grid-template-rows minmax floor
     (calendar.css), structurally guarantees every Month row has enough
     content height for the day number + 2 Task chips + one complete
     "+N more" line at every viewport height — see that CSS rule's comment
     for the exact derivation. The geometry lives in one place (the CSS
     token); this constant only encodes the display-count business rule,
     not a height calculation. */
  var MONTH_VISIBLE_TASK_CAP = 2;

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

  /* ── Month blank-cell single/double-click coordinator (2026-07-22
     month-cell-click-interaction task) ── A native 'click' fires twice
     before a genuine 'dblclick' (click, click, dblclick), so a bare
     click handler cannot by itself tell a single click from the first
     half of a double click. CELL_CLICK_DELAY_MS is the short window
     used to find out: a click schedules the single-click action (open
     the Task list for a task-bearing date, or show the empty-day toast)
     after this delay; a 'dblclick' arriving within that window cancels
     the pending action and opens the Create chooser instead. 250ms
     comfortably covers a real double-click (most OS thresholds default
     to 300-500ms) while staying short enough that a genuine single
     click does not feel delayed.

     Only one timer is ever pending per calendar instance (matches
     "store timer state inside the current member calendar instance" —
     this whole file is one closure per member, so there is no
     cross-member state to isolate); a second click before the first's
     timer fires simply reschedules the same pending action rather than
     stacking a second one. */
  var CELL_CLICK_DELAY_MS = 250;
  var pendingCellClick = null; // setTimeout id, or null when nothing is pending

  function clearPendingCellClick() {
    if (pendingCellClick !== null) {
      clearTimeout(pendingCellClick);
      pendingCellClick = null;
    }
  }

  function showEmptyDayToast() {
    showToast({
      type: 'information',
      title: 'No tasks scheduled for this day',
      message: 'Double-click the day to create a Task or Leave.'
    });
  }

  /* Task-presence rule (Step 4/Interpretation): itemsForDate returns
     Task records only (leaveItemsForDate is a separate lookup never
     consulted here), so a date with Leave but zero Tasks correctly
     falls through to the empty-day toast. Reuses the existing
     openMorePopup Task-list renderer/resolveMorePopupAnchor — no
     second list implementation. */
  function handleCellSingleClick(dateKey) {
    var dayItems = itemsForDate(dateKey);
    if (dayItems.length > 0) {
      openMorePopup(dateKey, resolveMorePopupAnchor(dateKey));
    } else {
      showEmptyDayToast();
    }
  }

  function scheduleCellSingleClick(dateKey) {
    clearPendingCellClick();
    pendingCellClick = setTimeout(function () {
      pendingCellClick = null;
      handleCellSingleClick(dateKey);
    }, CELL_CLICK_DELAY_MS);
  }

  function renderMonthView() {
    /* Any pending single-click action was scheduled against the grid
       this rerender is about to replace — invalidate it rather than
       risk it firing against a stale dateKey after month navigation. */
    clearPendingCellClick();
    var y = state.viewYear, m = state.viewMonth;
    var todayStr = toDateStr(new Date());
    var cells = buildMonthGridCells(y, m);

    var html = '';
    DAY_HEADS.forEach(function (d) { html += '<div class="msc-cal-headcell">' + d + '</div>'; });

    cells.forEach(function (c) {
      var isToday = c.dateStr === todayStr;
      var isSelected = c.dateStr === state.selectedDate;
      var dayItems = itemsForDate(c.dateStr);
      /* Same shared cap for every cell/member (Step 13) — a day with fewer
         than MONTH_VISIBLE_TASK_CAP tasks simply shows all of them (slice
         returns however many actually exist) and no "+more" link. */
      var visibleCap = MONTH_VISIBLE_TASK_CAP;

      /* Every cell's own blank-background click/keyboard action is
         "open the Task/Leave create chooser" (calendar-empty-slot-
         create-and-overlap-rules, 2026-07-20) — including cells that
         already have tasks. It remains reachable exactly as before by
         clicking an individual task chip (opens the shared task-detail
         popup, see viewItem() below) or "+N more" (opens the
         date-specific more-popup, see openMorePopup() below); their own
         handlers still call e.stopPropagation() so they never also
         trigger this cell-level handler. ── */
      var cls = 'msc-cal-cell msc-cal-cell--actionable' + (c.inMonth ? '' : ' other-month') +
        (isSelected ? ' selected' : '');
      var cellLabel = c.date.getDate() + ' ' + MONTH_NAMES[c.date.getMonth()] + ' ' + c.date.getFullYear() +
        '. Create a schedule item or leave request.';
      html += '<div class="' + cls + '" data-date="' + c.dateStr + '" role="button" tabindex="0" ' +
        'title="Create Task or Leave" aria-label="' + escapeHtml(cellLabel) + '"';
      /* Selected date's accessible state (Step 26, 2026-07-20 redesign)
         — the existing .selected class already carries the visible
         highlight; aria-current="date" exposes the same state to
         assistive tech without changing selection logic. */
      if (isSelected) { html += ' aria-current="date"'; }
      html += '>';
      html += '<div class="msc-cal-daynum' + (isToday ? ' today' : '') + '">' + c.date.getDate() + '</div>';
      /* Demo-style visible task chips inside each date (aios_role_desk_views.html layout reference) —
         shows the actual sample/testing entries the user has added, not real schedule facts.
         A chip click opens the shared task-detail popup (viewItem(), same popup Week/Day/
         all-day use) — see the .msc-cal-chip click wiring below. */
      dayItems.slice(0, visibleCap).forEach(function (it) {
        var catClass = CATEGORY_CLASS[it.category] || 'task';
        var label = (it.start ? it.start + ' ' : '') + it.title;
        html += '<span class="msc-cal-chip ' + catClass + '" data-date="' + c.dateStr + '" data-id="' + it.id + '" ' +
          'role="button" tabindex="0" title="' + escapeHtml(label) + '" ' +
          'aria-label="View task details: ' + escapeHtml(label) + '">' +
          escapeHtml(label) + '</span>';
      });
      if (dayItems.length > visibleCap) {
        /* Step 8: this overflow count is derived from `dayItems` (tasks
           only, see itemsForDate above) — leave is rendered separately
           below and never contributes to this count, so "+N more" is
           always task-bearing whenever it is rendered at all. Opens the
           date-specific more-popup (openMorePopup() below), not the
           removed Schedule Item list. */
        html += '<span class="msc-cal-chip-more" data-date="' + c.dateStr + '" role="button" tabindex="0" ' +
          'aria-label="View all tasks for ' + escapeHtml(formatAgendaDate(c.dateStr)) + '">+' +
          (dayItems.length - visibleCap) + ' more</span>';
      }
      /* Leave chips (REQ-LEAVE-COPY-001) — visually distinct from
         the task chips above (own class, own colors), never using
         CATEGORY_CLASS. Deleted leave is never in `leaveItems`
         (server-filtered on deleted_at IS NULL), so it never renders
         here. A click opens the shared Leave-detail popup
         (viewLeaveItem(), calendar-based Leave management, 2026-07-22
         member-page-layout task) — the same popup Week/Day leave
         chips/blocks use below. */
      leaveItemsForDate(c.dateStr).forEach(function (lv) {
        var label = formatLeaveCalendarLabel(lv);
        html += '<span class="msc-cal-chip-leave" data-leave-id="' + lv.id + '" role="button" tabindex="0" ' +
          'title="' + escapeHtml(label) + '" aria-label="View leave details: ' + escapeHtml(label) + '">' +
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
      /* Opens the Create chooser directly — used by keyboard Enter/Space
         (unchanged, Step 11: no keyboard equivalent of a double-click to
         coordinate with) and by the genuine 'dblclick' handler below. */
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
      /* Single click no longer opens the Create chooser directly — it
         schedules the Task-list-or-toast decision (handleCellSingleClick)
         after CELL_CLICK_DELAY_MS, giving a following 'dblclick' a chance
         to cancel it first. */
      cell.addEventListener('click', function () {
        scheduleCellSingleClick(cell.getAttribute('data-date'));
      });
      cell.addEventListener('dblclick', function () {
        clearPendingCellClick();
        go();
      });
      cell.addEventListener('keydown', function (e) { if (isKeyActivation(e)) { e.preventDefault(); go(); } });
    });
    calGrid.querySelectorAll('.msc-cal-chip').forEach(function (chip) {
      var go = function (e) {
        e.stopPropagation();
        /* Step 5: a Task-chip click cancels any pending blank-cell
           single-click action from this same cell so Task Details never
           has the Task list pop open behind/after it. */
        clearPendingCellClick();
        viewItem(chip.getAttribute('data-id'), chip);
      };
      chip.addEventListener('click', go);
      chip.addEventListener('keydown', function (e) { if (isKeyActivation(e)) { e.preventDefault(); go(e); } });
      /* Event-target safety (Step 9) — the 'click' listener above stops
         the two 'click' events that precede a double click, but
         'dblclick' is a distinct event type browsers still dispatch and
         bubble regardless; without this, double-clicking a Task chip
         would bubble a 'dblclick' up to the date cell's own handler and
         incorrectly open the Create chooser. */
      chip.addEventListener('dblclick', function (e) { e.stopPropagation(); });
    });
    calGrid.querySelectorAll('.msc-cal-chip-more').forEach(function (chip) {
      var go = function (e) {
        e.stopPropagation();
        clearPendingCellClick();
        openMorePopup(chip.getAttribute('data-date'), chip);
      };
      chip.addEventListener('click', go);
      chip.addEventListener('keydown', function (e) { if (isKeyActivation(e)) { e.preventDefault(); go(e); } });
      chip.addEventListener('dblclick', function (e) { e.stopPropagation(); });
    });
    calGrid.querySelectorAll('.msc-cal-chip-leave').forEach(function (chip) {
      var go = function (e) {
        e.stopPropagation();
        clearPendingCellClick();
        viewLeaveItem(chip.getAttribute('data-leave-id'), chip);
      };
      chip.addEventListener('click', go);
      chip.addEventListener('keydown', function (e) { if (isKeyActivation(e)) { e.preventDefault(); go(e); } });
      chip.addEventListener('dblclick', function (e) { e.stopPropagation(); });
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
      var dStr = toDateStr(d);
      var isToday = dStr === todayStr;
      /* Selected-date header highlight (Step 9, calendar-create-chooser-
         readability-and-width task, 2026-07-20) — same state.selectedDate
         source of truth the Month grid's .msc-cal-cell.selected already
         reads (selectDate() above), applied here only as a presentational
         class/attribute; no new selection logic. */
      var isSelected = dStr === state.selectedDate;
      headerHtml += '<div class="msc-tg-daycol-head' + (isToday ? ' today' : '') + (isSelected ? ' selected' : '') + '"' +
        (isSelected ? ' aria-current="date"' : '') + '>' +
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
        'title="Create Task or Leave" ' +
        'aria-label="' + escapeHtml(formatAgendaDate(dateStr)) + ', all day. Create a schedule item or leave request.">';
      alldayItems.forEach(function (it) {
        var catClass = CATEGORY_CLASS[it.category] || 'task';
        alldayHtml += '<div class="msc-tg-allday-chip ' + catClass + '" data-id="' + it.id +
          '" tabindex="0" role="button" title="' + escapeHtml(it.title) + '" ' +
          'aria-label="View task details: ' + escapeHtml(it.title) + '">' + escapeHtml(it.title) + '</div>';
      });
      /* Full-Day / Multi-Day leave renders here (all-day style), not
         as a fake timed block — Short Leave / Half-Day render in the
         timed area below instead. A click opens the shared Leave-
         detail popup (viewLeaveItem(), same popup the Month leave
         chip uses). */
      leaveItemsForDate(dateStr).filter(function (lv) {
        return lv.leave_type === 'Full-Day' || lv.leave_type === 'Multi-Day';
      }).forEach(function (lv) {
        var label = formatLeaveCalendarLabel(lv);
        alldayHtml += '<div class="msc-tg-allday-chip-leave" data-leave-id="' + lv.id + '" role="button" tabindex="0" ' +
          'title="' + escapeHtml(label) + '" aria-label="View leave details: ' + escapeHtml(label) + '">' +
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
        bodyHtml += '<div class="msc-tg-hourcell" data-hour="' + h2 + '" title="Create Task or Leave" ' +
          'style="height:' + TG_ROW_HEIGHT_PX + 'px;"></div>';
      }
      var timedItems = itemsForDate(dateStr).filter(function (it) { return it.start; });
      layoutOverlappingItems(timedItems).forEach(function (entry) {
        var it = entry.item;
        var top = entry.startMin / 60 * TG_ROW_HEIGHT_PX;
        var height = Math.max(18, (entry.endMin - entry.startMin) / 60 * TG_ROW_HEIGHT_PX);
        var widthPct = 100 / entry.totalCols;
        var leftPct = entry.col * widthPct;
        var catClass = CATEGORY_CLASS[it.category] || 'task';
        var evLabel = escapeHtml(it.start) + (it.end ? '–' + escapeHtml(it.end) : '') + ' ' + escapeHtml(it.title);
        bodyHtml += '<div class="msc-tg-event ' + catClass + '" data-id="' + it.id + '" tabindex="0" role="button" ' +
          'title="View task details: ' + evLabel + '" aria-label="View task details: ' + evLabel + '" ' +
          'style="top:' + top + 'px;height:' + height + 'px;left:' + leftPct + '%;width:' + widthPct + '%;">' +
          '<div class="msc-tg-event-title">' + escapeHtml(it.title) + '</div>' +
          '<div class="msc-tg-event-time">' + escapeHtml(it.start) + (it.end ? '–' + escapeHtml(it.end) : '') + '</div>' +
          '<div class="msc-tg-resize-handle" aria-hidden="true"></div>' +
          '</div>';
      });
      /* Short Leave / Half-Day leave blocks — never dragged or resized
         (no drag/resize handle, never passed to attachDragHandlers/
         attachResizeHandler), but now click-to-view (calendar-based
         Leave management, 2026-07-22 member-page-layout task): a click
         opens the shared Leave-detail popup (viewLeaveItem()); Edit/
         Delete from that popup remain the only way to change or remove
         a leave record. */
      leaveItemsForDate(dateStr).forEach(function (lv) {
        var range = leaveDisplayTimeRange(lv);
        if (!range || !range.start || !range.end) { return; }
        var leaveStart = timeToMinutes(range.start);
        var leaveEnd = timeToMinutes(range.end);
        var leaveTop = leaveStart / 60 * TG_ROW_HEIGHT_PX;
        var leaveHeight = Math.max(18, (leaveEnd - leaveStart) / 60 * TG_ROW_HEIGHT_PX);
        var label = formatLeaveCalendarLabel(lv);
        bodyHtml += '<div class="msc-tg-leave-block" data-leave-id="' + lv.id + '" role="button" tabindex="0" ' +
          'style="top:' + leaveTop + 'px;height:' + leaveHeight + 'px;left:2%;width:96%;" ' +
          'title="View leave details: ' + escapeHtml(label) + '" aria-label="View leave details: ' + escapeHtml(label) + '">' +
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
      date: newDateStr, title: it.title, priority: it.priority,
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
            var mapped = mapApiError(err);
            showToast({
              type: mapped.type, title: 'Could not move this task',
              message: mapped.message + ' It was returned to its original time.', persistent: false
            });
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
            var mapped = mapApiError(err);
            showToast({
              type: mapped.type, title: 'Could not resize this task',
              message: mapped.message + ' It was returned to its original length.', persistent: false
            });
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
    gridRootEl.querySelectorAll('.msc-tg-allday-chip-leave').forEach(function (chipEl) {
      var go = function (e) {
        e.stopPropagation();
        viewLeaveItem(chipEl.getAttribute('data-leave-id'), chipEl);
      };
      chipEl.addEventListener('click', go);
      chipEl.addEventListener('keydown', function (e) { if (isKeyActivation(e)) { e.preventDefault(); go(e); } });
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
       events:auto, calendar.css) and open the shared Leave-detail popup
       (calendar-based Leave management, 2026-07-22 member-page-layout
       task) — e.stopPropagation() still prevents a click landing on a
       leave block from falling through to the empty hourcell beneath
       and opening the create chooser (Step 7, 2026-07-20). */
    gridRootEl.querySelectorAll('.msc-tg-leave-block').forEach(function (blockEl) {
      var go = function (e) {
        e.stopPropagation();
        viewLeaveItem(blockEl.getAttribute('data-leave-id'), blockEl);
      };
      blockEl.addEventListener('click', go);
      blockEl.addEventListener('keydown', function (e) { if (isKeyActivation(e)) { e.preventDefault(); go(e); } });
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
      /* Switching to Week/Day does not itself call renderMonthView()
         (only its own top-of-function clearPendingCellClick() would
         catch this), so a Month-view pending single click must be
         invalidated here directly. */
      clearPendingCellClick();
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
    syncSelectedDateToForms(dateStr);
    cancelEdit();
    renderActiveView();
    renderPriorityPreview();
    loadSummaries(dateStr);
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
  /* Builds one MD-priority metric block (Count or Duration) — the bar +
     the two percentage values + the plain-language status line. All
     three inputs (scheduledPercentage/unscheduledPercentage/state) come
     from values the backend already computed and getSplitWarningState's
     pure classification of them; this function only assembles markup,
     it never computes a percentage or a threshold decision itself. The
     bar is aria-hidden — the visible percentage/count text right below
     it is the real accessible content, always present and never
     hover-only, so no separate text alternative is needed. */
  function buildPriorityMetricHtml(kind, label, scheduledPercentage, unscheduledPercentage, scheduledSub, unscheduledSub) {
    var result = getSplitWarningState(scheduledPercentage, unscheduledPercentage);
    var copy = getMetricStatusCopy(kind, result);
    var segments = getSplitBarSegments(scheduledPercentage, unscheduledPercentage);
    var barHtml = segments
      ? '<div class="msc-split-bar" aria-hidden="true">' +
        '<div class="msc-split-bar-segment msc-split-bar-scheduled" style="width:' + segments.scheduledWidth.toFixed(2) + '%"></div>' +
        '<div class="msc-split-bar-segment msc-split-bar-unscheduled" style="width:' + segments.unscheduledWidth.toFixed(2) + '%"></div>' +
        '</div>'
      : '<div class="msc-split-bar msc-split-bar-empty" aria-hidden="true"></div>';
    var statusIcon = result.state === 'warning' ? '&#9888;' : (result.state === 'healthy' ? '&#10003;' : '&#8226;');
    return (
      '<div class="msc-priority-metric msc-priority-metric-' + result.state + '">' +
      '<div class="msc-priority-metric-label">' + label + '</div>' +
      barHtml +
      '<div class="msc-split-values">' +
      '<div class="msc-split-value msc-split-value-scheduled"><span class="msc-split-value-label">Scheduled</span><strong>' + formatPercentage(scheduledPercentage) + '</strong><span class="msc-split-value-sub">' + scheduledSub + '</span></div>' +
      '<div class="msc-split-value msc-split-value-unscheduled"><span class="msc-split-value-label">Unscheduled</span><strong>' + formatPercentage(unscheduledPercentage) + '</strong><span class="msc-split-value-sub">' + unscheduledSub + '</span></div>' +
      '</div>' +
      '<div class="msc-metric-status msc-metric-status-' + result.state + '">' +
      '<span class="msc-metric-status-icon" aria-hidden="true">' + statusIcon + '</span>' +
      '<span class="msc-metric-status-text"><strong>' + copy.headline + '</strong>' + (copy.explanation ? ' — ' + copy.explanation : '') + '</span>' +
      '</div>' +
      '</div>'
    );
  }

  /* MD-priority Schedule Summary card (schedule-summary-md-percentage-
     dashboard, 2026-07-22). The MD-requested primary output — Scheduled/
     Unscheduled Count % and Scheduled/Unscheduled Duration %, each with a
     plain-language healthy/warning/neutral read — is built first and is
     always visible without expansion. Every value below is still read
     straight off `report` (server-authoritative; nothing is computed in
     this function beyond formatting and the shared threshold
     classification in core.js) — the pre-existing detailed rows
     (raw counts/durations, tasks used/ignored, previous-period
     comparison, leave-coordination figures) are preserved verbatim,
     unchanged in value or order, just moved into a collapsed-by-default
     <details> disclosure (reusing the existing .collapsible-section
     pattern from components.css — native semantics, no custom JS
     toggle, resets to collapsed on every page load/re-render). */
  function renderSummaryStats(el, report) {
    /* Clears the aria-busy/loading state set by showInlineLoading() below
       before this replaces the element's content (Phase 1 professional-
       UX-feedback task, 2026-07-22) — aria-busy lives on `el` itself, not
       inside its innerHTML, so it would otherwise persist after the
       content it described was replaced. */
    el.removeAttribute('aria-busy');

    var countState = getSplitWarningState(report.scheduled_count_percentage, report.unscheduled_count_percentage).state;
    var durationState = getSplitWarningState(report.scheduled_duration_percentage, report.unscheduled_duration_percentage).state;
    var combinedState = combineSummaryStatus(countState, durationState);
    var periodCopy = getPeriodStatusCopy(combinedState);

    el.innerHTML =
      '<div class="msc-priority-badge msc-priority-badge-' + combinedState + '">' + periodCopy.label + '</div>' +
      '<div class="msc-priority-metrics">' +
      buildPriorityMetricHtml('count', 'By task count', report.scheduled_count_percentage, report.unscheduled_count_percentage,
        report.scheduled_count + ' task(s)', report.unscheduled_count + ' task(s)') +
      buildPriorityMetricHtml('duration', 'By task duration', report.scheduled_duration_percentage, report.unscheduled_duration_percentage,
        formatDuration(report.scheduled_duration_minutes), formatDuration(report.unscheduled_duration_minutes)) +
      '</div>' +
      '<details class="collapsible-section msc-summary-details">' +
      '<summary class="collapsible-summary"><span class="collapsible-summary-text">View detailed metrics</span></summary>' +
      '<div class="details-body msc-summary-details-body">' +
      '<div class="msc-summary-group">' +
      '<div class="msc-summary-row"><span>Scheduled</span><strong>' + report.scheduled_count + ' task(s) &middot; ' + formatDuration(report.scheduled_duration_minutes) + '</strong></div>' +
      '<div class="msc-summary-row"><span>Unscheduled</span><strong>' + report.unscheduled_count + ' task(s) &middot; ' + formatDuration(report.unscheduled_duration_minutes) + '</strong></div>' +
      '<div class="msc-summary-row"><span>Total</span><strong>' + report.total_count + ' task(s) &middot; ' + formatDuration(report.total_duration_minutes) + '</strong></div>' +
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
      '</div>' +
      '</div>' +
      '</details>';
  }

  function loadDailySummary(dateStr) {
    dailySummaryTitleEl.textContent = 'Daily — ' + dateStr;
    showInlineLoading(dailySummaryEl, 'Loading daily summary…');
    apiRequest('GET', apiBase + '/reports/daily?date=' + encodeURIComponent(dateStr)).then(function (report) {
      renderSummaryStats(dailySummaryEl, report);
    }).catch(function (err) {
      var mapped = mapApiError(err);
      dailySummaryEl.removeAttribute('aria-busy');
      dailySummaryEl.innerHTML = '<p class="msc-empty" role="alert">' + mapped.title + ' — ' + mapped.message + '</p>';
    });
  }

  function loadWeeklySummary(dateStr) {
    // Monday-Sunday convention (2026-07-14) — see getReportWeekStart.
    // The backend independently normalizes to the same Monday
    // regardless, but computing it correctly here means the title
    // and the request always agree with what the response reports.
    var weekStartStr = toDateStr(getReportWeekStart(parseDateStr(dateStr)));
    weeklySummaryTitleEl.textContent = 'Weekly — week of ' + weekStartStr;
    showInlineLoading(weeklySummaryEl, 'Loading weekly summary…');
    apiRequest('GET', apiBase + '/reports/weekly?week_start=' + encodeURIComponent(weekStartStr)).then(function (report) {
      renderSummaryStats(weeklySummaryEl, report);
    }).catch(function (err) {
      var mapped = mapApiError(err);
      weeklySummaryEl.removeAttribute('aria-busy');
      weeklySummaryEl.innerHTML = '<p class="msc-empty" role="alert">' + mapped.title + ' — ' + mapped.message + '</p>';
    });
  }

  function loadMonthlySummary(dateStr) {
    var d = parseDateStr(dateStr);
    var monthStr = d.getFullYear() + '-' + pad(d.getMonth() + 1);
    monthlySummaryTitleEl.textContent = 'Monthly — ' + monthStr;
    showInlineLoading(monthlySummaryEl, 'Loading monthly summary…');
    apiRequest('GET', apiBase + '/reports/monthly?month=' + encodeURIComponent(monthStr)).then(function (report) {
      renderSummaryStats(monthlySummaryEl, report);
    }).catch(function (err) {
      var mapped = mapApiError(err);
      monthlySummaryEl.removeAttribute('aria-busy');
      monthlySummaryEl.innerHTML = '<p class="msc-empty" role="alert">' + mapped.title + ' — ' + mapped.message + '</p>';
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

  /* Cancel Edit (calendar-popup-resize-edit-cancel-and-hover-ux task,
     2026-07-20) — when Edit was reached from the shared task-detail
     popup (editOriginViewId, set by the Edit button handler below),
     Cancel must discard the unsaved edit and return to that same detail
     popup instead of leaving the Task popup open in its "Create Task"
     state. cancelEdit() above still only resets the shared form/button
     state, unchanged for its other callers (Task chooser menu item,
     successful Update, delete-while-editing). */
  function handleCancelEditClick() {
    var returnId = editOriginViewId;
    var returnTrigger = editOriginTriggerEl;
    var flowOrigin = editOriginFlowOrigin;
    editOriginViewId = null;
    editOriginTriggerEl = null;
    editOriginFlowOrigin = null;
    cancelEdit();
    closeTaskPopup();
    /* Origin-aware return (Step 9, calendar-popup-close-time-validation-
       task-list-return task, 2026-07-22) — Cancel Edit never changes
       selectedDate/currentView (cancelEdit()/closeTaskPopup() above
       already don't touch either). When the edit was entered from the
       "+N more" list, reopen that same list instead of the detail
       popup; every other case (direct-calendar, or no origin at all)
       is unchanged from before this task. */
    if (flowOrigin && flowOrigin.type === 'more-task-list') {
      reopenTaskListOrigin(flowOrigin);
    } else if (returnId) {
      viewItem(returnId, returnTrigger);
    }
  }

  cancelBtn.addEventListener('click', handleCancelEditClick);

  /* Task time-order validation (calendar-popup-close-time-validation-
     task-list-return task, 2026-07-22) — mirrors the backend's own
     MemberScheduleEventCreate/Update.end_after_start rule (end must be
     greater than start when both are provided, backend/schemas.py) so an
     invalid range is caught before the request is sent, with a field-
     specific message, instead of round-tripping to the server only to
     show the generic "Check the highlighted fields" validation-error
     text a 422 previously produced. Both times are parsed with
     timeToMinutes() (core.js) — the same whole-minutes-since-midnight
     normalization drag/resize already use — rather than a raw string
     compare, so "10:42"/"11:42" (which happen to compare correctly as
     strings) and any other same-day pair are both handled the same
     unambiguous way. Only fires when BOTH times are present, exactly
     like the backend rule — an untimed Task, or one with only a start
     or only an end time, is unaffected (no new timing rule invented). */
  function validateTaskTimeRange() {
    if (!fieldStart.value || !fieldEnd.value) { return true; }
    if (timeToMinutes(fieldEnd.value) > timeToMinutes(fieldStart.value)) { return true; }
    setFieldError(fieldEnd, 'End time must be later than start time.');
    showToast({
      type: 'error', title: 'Check the end time',
      message: 'Choose an end time later than the start time.'
    });
    return false;
  }
  if (fieldStart) { fieldStart.addEventListener('input', function () { clearFieldError(fieldEnd); }); }
  if (fieldEnd) { fieldEnd.addEventListener('input', function () { clearFieldError(fieldEnd); }); }

  addBtn.addEventListener('click', function () {
    clearFormErrors(formEl);
    var hasError = false;
    if (!fieldDate.value) {
      setFieldError(fieldDate, 'Choose a date on the calendar first.');
      hasError = true;
    }
    if (!fieldTitle.value.trim()) {
      setFieldError(fieldTitle, 'Enter a title (e.g. Prepare weekly report).');
      hasError = true;
    }
    if (!validateTaskTimeRange()) { hasError = true; }
    if (hasError) { focusFirstInvalid(formEl); return; }
    var payload = frontendToApiPayload({
      date: fieldDate.value,
      title: fieldTitle.value.trim(),
      priority: fieldPriority.value,
      start: fieldStart.value,
      end: fieldEnd.value,
      notes: fieldNotes.value.trim()
    });
    var addedDate = fieldDate.value;
    setButtonBusy(addBtn, true, { busyLabel: 'Saving…' });
    showApiStatus('', false, taskPopupStatusEl);
    apiRequest('POST', apiBase, payload).then(function (apiItem) {
      items.push(apiItemToFrontend(apiItem));
      selectDate(addedDate);
      resetForm();
      closeTaskPopup();
      showToast({ type: 'success', title: 'Task created', message: 'Your task was added to the calendar.' });
    }).catch(function (err) {
      var mapped = mapApiError(err);
      if (err.code === 'leave_conflict') {
        showApiStatus(mapped.title + ' — ' + mapped.message, true, taskPopupStatusEl);
      } else {
        showToast({ type: mapped.type, title: mapped.title, message: mapped.message, persistent: mapped.persistent });
      }
    }).then(function () { setButtonBusy(addBtn, false); });
  });

  function editItem(id) {
    var it = items.filter(function (x) { return x.id === id; })[0];
    if (!it) { return; }
    state.editingId = id;
    fieldDate.value = it.date;
    fieldTitle.value = it.title;
    updateTitleCounter();
    fieldPriority.value = it.priority || 'Medium';
    fieldStart.value = it.start || '';
    fieldEnd.value = it.end || '';
    fieldNotes.value = it.notes || '';
    addBtn.style.display = 'none';
    updateBtn.style.display = '';
    cancelBtn.style.display = '';
    /* Edit (from the task-detail popup's Edit button, or directly)
       opens the same single Task popup the fields above just
       populated — the form only exists inside the popup, so without
       this the fields would be filled while hidden. */
    openTaskPopup();
  }

  updateBtn.addEventListener('click', function () {
    if (!state.editingId) { return; }
    var it = items.filter(function (x) { return x.id === state.editingId; })[0];
    if (!it) { return; }
    clearFormErrors(formEl);
    var hasUpdateError = false;
    if (!fieldTitle.value.trim()) {
      setFieldError(fieldTitle, 'Enter a title before updating.');
      hasUpdateError = true;
    }
    if (!validateTaskTimeRange()) { hasUpdateError = true; }
    if (hasUpdateError) { focusFirstInvalid(formEl); return; }
    var payload = frontendToApiPayload({
      date: fieldDate.value,
      title: fieldTitle.value.trim(),
      priority: fieldPriority.value,
      start: fieldStart.value,
      end: fieldEnd.value,
      notes: fieldNotes.value.trim()
    });
    var editingId = state.editingId;
    setButtonBusy(updateBtn, true, { busyLabel: 'Saving…' });
    showApiStatus('', false, taskPopupStatusEl);
    apiRequest('PUT', apiBase + '/' + encodeURIComponent(editingId), payload).then(function (apiItem) {
      var updated = apiItemToFrontend(apiItem);
      var idx = items.indexOf(it);
      if (idx !== -1) { items[idx] = updated; }
      /* Origin-aware return (Step 8, calendar-popup-close-time-
         validation-task-list-return task, 2026-07-22) — captured before
         cancelEdit()/closeTaskPopup() below (neither touches these
         variables) and cleared here so a later, unrelated edit session
         can't accidentally reuse a stale origin. selectDate(updated.date)
         still runs first (existing "refresh calendar data" behavior,
         unchanged) — the reopened list reads the already-updated
         `items` array, so it reflects the save immediately. */
      var flowOrigin = editOriginFlowOrigin;
      editOriginViewId = null;
      editOriginTriggerEl = null;
      editOriginFlowOrigin = null;
      selectDate(updated.date);
      cancelEdit();
      closeTaskPopup();
      if (flowOrigin && flowOrigin.type === 'more-task-list') {
        reopenTaskListOrigin(flowOrigin);
      }
      showToast({ type: 'success', title: 'Task updated', message: 'Your changes were saved.' });
    }).catch(function (err) {
      var mapped = mapApiError(err);
      if (err.code === 'leave_conflict') {
        showApiStatus(mapped.title + ' — ' + mapped.message, true, taskPopupStatusEl);
      } else {
        showToast({ type: mapped.type, title: mapped.title, message: mapped.message, persistent: mapped.persistent });
      }
    }).then(function () { setButtonBusy(updateBtn, false); });
  });

  /* Returns a Promise<boolean> (true only on a confirmed, successful
     delete) so the task-detail popup's Delete button (Step 6) can close
     the popup only after the delete actually succeeds — every other
     existing caller of deleteItem() ignores the return value, unchanged.
     The native window.confirm() (Phase 1 professional-UX-feedback task,
     2026-07-22) is replaced by the shared confirmDestructive() dialog —
     the actual DELETE request now runs inside its onConfirm callback, so
     the dialog itself shows the busy/"Working…" state and only closes
     once the delete has actually succeeded (STRICTLY PRESERVE: same
     confirm-then-delete order, same "declined = no request sent"
     behavior, same successful-delete side effects below). */
  function deleteItem(id, triggerEl) {
    var it = items.filter(function (x) { return x.id === id; })[0];
    if (!it) { return Promise.resolve(false); }
    return confirmDestructive({
      title: 'Delete task?',
      message: '“' + it.title + '” will be permanently removed from Management AIOS.',
      confirmLabel: 'Delete task',
      cancelLabel: 'Cancel',
      trigger: triggerEl,
      onConfirm: function () {
        return apiRequest('DELETE', apiBase + '/' + encodeURIComponent(id)).then(function () {
          items = items.filter(function (x) { return x.id !== id; });
          if (state.editingId === id) { cancelEdit(); }
          renderActiveView();
          renderPriorityPreview();
          if (state.selectedDate) { loadSummaries(state.selectedDate); }
          showToast({ type: 'success', title: 'Task deleted', message: 'The task was removed.' });
          return true;
        }).catch(function (err) {
          var mapped = mapApiError(err);
          showToast({ type: mapped.type, title: mapped.title, message: mapped.message, persistent: mapped.persistent });
          return false;
        });
      }
    });
  }

  /* Modal focus management (Phase 1 polish, 2026-07-10; Edit/Delete
     actions added calendar-task-detail-and-more-popup task, 2026-07-20)
     — presentation/keyboard-behaviour only, no change to calendar item
     data or CRUD calls beyond reusing the existing editItem()/
     deleteItem() functions. lastFocusedTrigger lets Close/Escape/
     backdrop-click return focus to whichever task chip/block/chip
     opened the popup ("restore focus to the originating task where
     practical", Step 6). The popup now hosts three controls (Close,
     Edit, Delete), so Tab cycles through them via the shared
     trapPopupTab() helper (Step 5/6, same helper the Task/Leave create
     popups already use) rather than being pinned to a single control. */
  var lastFocusedTrigger = null;
  var currentViewItemId = null;
  /* Set only by the Edit button handler below, and only consumed by
     handleCancelEditClick() above — tracks "Edit was opened from the
     detail popup for this id/trigger, so Cancel must reopen it". Left
     null (a no-op for handleCancelEditClick) on every other path into
     the Task popup (the "+Create > Task" menu item, a successful Add/
     Update), so only the Cancel Edit flow is affected. */
  var editOriginViewId = null;
  var editOriginTriggerEl = null;

  /* ── Origin-aware Task-detail navigation (calendar-popup-close-time-
     validation-task-list-return task, 2026-07-22) ──
     Frontend-only UI context, scoped to this one member instance's
     closure (never sent to the API, never a global shared across
     members) — remembers how the currently-open Task detail/edit flow
     was reached, so Update/Cancel Edit can return to the right place:
       - null (default): opened directly from a Month/Week/Day/all-day
         Task item — the pre-existing behavior, entirely unchanged.
       - { type: 'more-task-list', dateStr, anchorEl, scrollTop, taskId }:
         opened from a row inside the "+N more" Task list — set by
         openMorePopup()'s row handler below, just before it closes the
         list and opens the detail popup. scrollTop is the list body's
         scroll position at the moment the row was activated, so
         reopening the list later can restore it. */
  var taskFlowOrigin = null;
  /* Snapshot of taskFlowOrigin taken at the moment Edit is clicked (see
     viewEditBtn below) — editItem() is only ever entered through that
     one path, so this always reflects "was the detail view just closed
     for editing opened via the list, or directly". Read (and cleared)
     by both handleCancelEditClick() and the Update success handler. */
  var editOriginFlowOrigin = null;

  function onViewModalKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      closeViewModal();
    } else if (e.key === 'Tab') {
      trapPopupTab(viewModal, e);
    }
  }

  /* Origin-aware Close (Step 4, calendar-task-detail-close-and-delete-
     list-return task, 2026-07-22) — the visible Close button, Escape
     (onViewModalKeydown above), and backdrop click all call this one
     function, so branching here covers all three the same way. When
     this detail view was opened from the "+N more" list
     (taskFlowOrigin.type === 'more-task-list'), closing it reopens that
     same list (fresh anchor, restored scroll position/row focus — see
     reopenTaskListOrigin()) instead of just returning focus to the
     anchor chip. taskFlowOrigin is consumed (cleared) here either way,
     per Step 8's "Detail Close from list: consume the origin by
     reopening the list." Direct-calendar-opened Tasks are unaffected —
     taskFlowOrigin is null for them, so the pre-existing
     returnFocus(trigger) path runs exactly as before (STRICTLY
     PRESERVE). The Delete flow (viewDeleteBtn below) clears
     taskFlowOrigin to null of its own accord *before* calling this
     function, so a delete-triggered close never double-reopens the
     list here — its own conditional (>2 remaining) reopen runs
     afterward instead. */
  function closeViewModal() {
    viewModal.classList.remove('show');
    viewModal.removeEventListener('keydown', onViewModalKeydown);
    currentViewItemId = null;
    var trigger = lastFocusedTrigger;
    var flowOrigin = taskFlowOrigin;
    lastFocusedTrigger = null;
    taskFlowOrigin = null;
    if (flowOrigin && flowOrigin.type === 'more-task-list') {
      reopenTaskListOrigin(flowOrigin);
    } else {
      returnFocus(trigger);
    }
  }

  /* The ONE shared task-detail popup for Month/Week/Day/all-day/"+N
     more" (Step 5) — every call site above (Month chip, Week/Day timed
     block via attachDragHandlers, all-day chip, more-popup row) already
     calls this same function; nothing view-specific is duplicated here.
     Fields are the existing Task fields only — no new field invented.
     `origin` (calendar-popup-close-time-validation-task-list-return
     task, 2026-07-22) — optional third argument, only ever passed by
     the "+N more" list's row handler below; every direct-calendar call
     site is unchanged (2-arg calls), which correctly resets
     taskFlowOrigin to null (direct-calendar) for them. */
  function viewItem(id, triggerEl, origin) {
    var it = items.filter(function (x) { return x.id === id; })[0];
    if (!it) { return; }
    taskFlowOrigin = origin || null;
    currentViewItemId = id;
    var catClass = CATEGORY_CLASS[it.category] || 'task';
    if (viewColorDot) { viewColorDot.className = 'msc-view-color-dot ' + catClass; }
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

  /* Edit (Step 6) — closes the detail popup and reuses the existing
     editItem() flow verbatim (same Task popup, same prefill, same
     validation, same task/leave conflict handling on save) — no new
     edit implementation. Category is no longer locked on edit
     (2026-07-22): the backend re-evaluates and may change it on any
     successful save. */
  if (viewEditBtn) {
    viewEditBtn.addEventListener('click', function () {
      var id = currentViewItemId;
      editOriginViewId = id;
      editOriginTriggerEl = lastFocusedTrigger;
      editOriginFlowOrigin = taskFlowOrigin;
      /* Cleared before calling closeViewModal() (calendar-task-detail-
         close-and-delete-list-return task, 2026-07-22) — Edit is about
         to open the Task edit form, not return to the calendar/list, so
         closeViewModal()'s new origin-aware reopen (Step 4) must not
         fire here; the snapshot above already preserved the origin for
         the later Cancel-Edit/Update-success reopen (unchanged from the
         prior task). */
      taskFlowOrigin = null;
      closeViewModal();
      if (id) { editItem(id); }
    });
  }

  /* Delete (Step 6) — reuses the existing deleteItem() confirmation +
     delete flow verbatim; the popup only closes once deleteItem()'s
     returned promise resolves true (a confirmed, successful delete),
     so a cancelled confirm or a failed API call leaves the popup open
     with its data intact. */
  if (viewDeleteBtn) {
    viewDeleteBtn.addEventListener('click', function () {
      var id = currentViewItemId;
      if (!id) { return; }
      /* Captured before deleteItem() runs (calendar-task-detail-close-
         and-delete-list-return task, 2026-07-22) — deleteItem()'s
         onConfirm callback mutates `items`, but this origin snapshot is
         just "where did this Task's detail view come from", unaffected
         by that mutation either way. */
      var flowOrigin = taskFlowOrigin;
      deleteItem(id, viewDeleteBtn).then(function (deleted) {
        /* Delete failure (Step 5): deleteItem()'s own onConfirm already
           showed the mapped error toast and left `items`/taskFlowOrigin
           untouched — returning here without calling closeViewModal()
           keeps Task Details open with its data intact and the origin
           preserved, exactly as required. No stale list is opened. */
        if (!deleted) { return; }
        /* Authoritative remaining-count (Step 5/6) — computed from the
           `items` array only after deleteItem()'s onConfirm has already
           filtered out the deleted row on confirmed backend success
           (never a manually-decremented pre-delete count), and only for
           a list-origin Task (a direct-calendar delete never applies
           this rule — Step 7). itemsForDate() only ever returns Task
           records, so Leave is never counted. */
        var remaining = (flowOrigin && flowOrigin.type === 'more-task-list')
          ? itemsForDate(flowOrigin.dateStr).length
          : 0;
        /* Cleared before closeViewModal() (Step 8: "Successful Delete...
           consume the old detail origin") so its own origin-aware Close
           (Step 4) takes the plain path here — this handler applies its
           own >2-remaining conditional below instead, using a fresh
           list context (reopenTaskListOrigin), rather than letting
           closeViewModal() reopen the list unconditionally. */
        taskFlowOrigin = null;
        closeViewModal();
        if (flowOrigin && flowOrigin.type === 'more-task-list' && remaining > 2) {
          reopenTaskListOrigin(flowOrigin);
        }
        /* remaining <= 2 (or a direct-calendar delete): leave the user
           on the calendar — no task-list popup, no Create chooser, no
           Task Details popup (Step 6) — the existing "Task deleted"
           success toast (deleteItem(), unchanged) is the only feedback. */
      });
    });
  }

  /* ── Month "+N more" date-specific popup (Step 8/9/10, same task) ──
     Anchored near the "+N more" link (or selected date cell), same
     document-click-outside + Escape close pattern the existing "+
     Create" dropdown (openCreateMenu/closeCreateMenu above) already
     uses — reused rather than re-implemented. Lists Task records only
     (itemsForDate — never leaveItems) for the active member/date;
     excludes deleted records by construction, since `items` never
     contains them. Each row opens the shared task-detail popup above. */
  var morePopupOpen = false;

  /* Fixed application header height + margin (mirrors --header-height,
     tokens.css) — the popup must never render underneath the sticky top
     bar (Step 12, calendar-popup-close-time-validation-task-list-return
     task, 2026-07-22). Only applied to the top clamp; left/right/bottom
     keep the existing 8px viewport-edge margin, since nothing else is
     fixed on those edges. */
  var MORE_POPUP_TOP_CLAMP = 64;

  function positionMorePopup(anchorEl) {
    var rect = anchorEl.getBoundingClientRect();
    var popupWidth = morePopupOverlay.offsetWidth || 260;
    var left = rect.left;
    if (left + popupWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - popupWidth - 8);
    }
    left = Math.max(8, left);
    var top = rect.bottom + 6;
    var popupHeight = morePopupOverlay.offsetHeight || 200;
    if (top + popupHeight > window.innerHeight - 8) {
      top = Math.max(MORE_POPUP_TOP_CLAMP, rect.top - popupHeight - 6);
    }
    top = Math.max(MORE_POPUP_TOP_CLAMP, top);
    morePopupOverlay.style.position = 'fixed';
    morePopupOverlay.style.top = top + 'px';
    morePopupOverlay.style.left = left + 'px';
  }

  /* Reposition (never resize/reflow-thrash) whenever this instance's own
     more-popup is open and something that can move it happens: a
     viewport resize, this calendar's own sidebar collapsing/expanding,
     or the application-level sidebar collapsing/expanding (Step 12). A
     no-op whenever the popup isn't open, so it's safe to call from
     listeners that fire regardless of which of the 5 member instances
     (if any) currently has a popup open. */
  function repositionMorePopupIfOpen() {
    if (morePopupOpen && morePopupAnchorEl) { positionMorePopup(morePopupAnchorEl); }
  }
  window.addEventListener('resize', repositionMorePopupIfOpen);

  /* Boundary-only wheel trap (Step 6) — CSS overscroll-behavior:contain
     on .msc-more-popup-body (calendar.css) already stops scroll chaining
     in every modern browser; this is the "narrowest event handling
     necessary" backstop the requirement asks for in case that CSS
     behavior isn't honored (older engines, some trackpad/OS gesture
     paths). It only ever calls preventDefault when the scroller is
     already at its top/bottom edge AND the wheel gesture would scroll
     further past that edge — every other wheel event inside the list
     passes through untouched, so normal scrolling is never affected. */
  function onMorePopupBodyWheel(e) {
    var atTop = morePopupBody.scrollTop <= 0;
    var atBottom = morePopupBody.scrollTop + morePopupBody.clientHeight >= morePopupBody.scrollHeight;
    if ((atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0)) {
      e.preventDefault();
    }
  }

  function closeMorePopup(focusTarget) {
    if (!morePopupOpen) { return; }
    morePopupOpen = false;
    morePopupOverlay.hidden = true;
    document.removeEventListener('click', onDocClickForMorePopup, true);
    document.removeEventListener('keydown', onMorePopupKeydown, true);
    morePopupBody.removeEventListener('wheel', onMorePopupBodyWheel);
    if (focusTarget && focusTarget.focus) { focusTarget.focus(); }
  }

  function onDocClickForMorePopup(e) {
    if (morePopupOverlay.contains(e.target)) { return; }
    closeMorePopup();
  }

  /* Escape-only (same pattern as the existing "+ Create" dropdown's
     onCreateMenuKeydown above) — this is an anchored popover, not a
     centered .msc-modal overlay, so it has no .msc-modal child for
     trapPopupTab() to cycle within; Tab is left to flow naturally,
     same as the create-menu. */
  function onMorePopupKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      e.preventDefault();
      closeMorePopup(morePopupAnchorEl);
    }
  }

  var morePopupAnchorEl = null;

  /* Resolves a real, currently-attached anchor to reposition the popup
     against for a given date — prefers that date's own "+N more" chip
     (present if the Month view still shows 3+ tasks for it), falls back
     to the plain calendar cell for that date (present for any in-view
     date, even one with 0-2 tasks and thus no "+more" chip), and finally
     to the sidebar Create button if neither is currently rendered (e.g.
     a different month is in view) — always returns *some* attached
     element so positionMorePopup() never reads a detached node's
     all-zero rect (same class of bug the create-chooser's own
     resolveAnchor fix, referenced above, already guards against). */
  function resolveMorePopupAnchor(dateStr) {
    return calGrid.querySelector('.msc-cal-chip-more[data-date="' + dateStr + '"]') ||
      calGrid.querySelector('.msc-cal-cell--actionable[data-date="' + dateStr + '"]') ||
      sidebarCreateBtn;
  }

  /* opts (optional): { restoreScrollTop, focusTaskId } — only ever
     passed by reopenTaskListOrigin() below, to restore the list exactly
     as it was before a row was opened for editing (Step 8/9). A plain
     "+N more" click (no opts) keeps the pre-existing behavior of
     starting scrolled to the top with the Close button focused. */
  function openMorePopup(dateStr, anchorEl, opts) {
    /* Every "Task list opens" path (this new blank-cell single click,
       the "+N more" chip, reopenTaskListOrigin) funnels through here —
       single place to satisfy Step 3's "clear pending timers when ...
       Task list opens through another route". */
    clearPendingCellClick();
    opts = opts || {};
    var dayItems = itemsForDate(dateStr).slice().sort(function (a, b) {
      var at = a.start || '99:99', bt = b.start || '99:99';
      return at < bt ? -1 : (at > bt ? 1 : 0);
    });
    morePopupAnchorEl = anchorEl;
    morePopupTitle.textContent = formatAgendaDate(dateStr);
    if (morePopupCount) {
      morePopupCount.textContent = dayItems.length + ' task' + (dayItems.length === 1 ? '' : 's');
    }
    var html = '';
    dayItems.forEach(function (it) {
      var catClass = CATEGORY_CLASS[it.category] || 'task';
      var timeStr = it.start ? (it.start + (it.end ? '–' + it.end : '')) : 'No time set';
      html += '<div class="msc-more-popup-item ' + catClass + '" data-id="' + it.id + '" role="button" tabindex="0" ' +
        'aria-label="' + escapeHtml((it.start ? it.start + ' ' : '') + it.title) + '">' +
        '<span class="msc-more-popup-item-time">' + escapeHtml(timeStr) + '</span>' +
        '<span class="msc-more-popup-item-title" title="' + escapeHtml(it.title) + '">' + escapeHtml(it.title) + '</span>' +
        '</div>';
    });
    morePopupList.innerHTML = html || '<p class="msc-empty">No tasks for this date.</p>';
    morePopupList.querySelectorAll('.msc-more-popup-item').forEach(function (row) {
      var go = function () {
        var id = row.getAttribute('data-id');
        /* Records the list origin (Step 7) before closing — dateStr/
           anchorEl/scrollTop/taskId are exactly what reopenTaskListOrigin()
           needs to restore this same list later; entirely local to this
           instance's closure, never sent to the API or shared globally. */
        taskFlowOrigin = {
          type: 'more-task-list',
          dateStr: dateStr,
          anchorEl: anchorEl,
          scrollTop: morePopupBody.scrollTop,
          taskId: id
        };
        closeMorePopup();
        viewItem(id, morePopupAnchorEl, taskFlowOrigin);
      };
      row.addEventListener('click', go);
      row.addEventListener('keydown', function (e) { if (isKeyActivation(e)) { e.preventDefault(); go(); } });
    });
    morePopupOverlay.hidden = false;
    morePopupOpen = true;
    positionMorePopup(anchorEl);
    document.addEventListener('click', onDocClickForMorePopup, true);
    document.addEventListener('keydown', onMorePopupKeydown, true);
    morePopupBody.addEventListener('wheel', onMorePopupBodyWheel, { passive: false });
    morePopupBody.scrollTop = opts.restoreScrollTop || 0;
    var focusRow = opts.focusTaskId
      ? morePopupList.querySelector('.msc-more-popup-item[data-id="' + opts.focusTaskId + '"]')
      : null;
    if (focusRow && focusRow.focus) {
      focusRow.focus();
    } else if (opts.focusTaskId) {
      /* The previously-open Task is no longer in this date's list
         (e.g. its date was changed during editing) — focus the list
         container itself rather than silently failing to move focus
         at all (Step 8/9: "...or the list container if that Task is
         no longer available"). */
      morePopupBody.focus();
    } else if (morePopupClose && morePopupClose.focus) {
      morePopupClose.focus();
    }
  }

  if (morePopupClose) {
    morePopupClose.addEventListener('click', function () { closeMorePopup(morePopupAnchorEl); });
  }

  /* Reopens the "+N more" list a Task-detail/edit flow originated from
     (Step 8/9) — shared by the Update-success and Cancel-Edit paths
     above. Resolves a fresh anchor via resolveMorePopupAnchor() rather
     than trusting origin.anchorEl still being attached, since
     selectDate()/renderActiveView() (already called by the Update path
     before this runs) replace the Month grid's innerHTML wholesale. */
  function reopenTaskListOrigin(origin) {
    if (!origin || origin.type !== 'more-task-list') { return; }
    var anchorEl = resolveMorePopupAnchor(origin.dateStr);
    openMorePopup(origin.dateStr, anchorEl, {
      restoreScrollTop: origin.scrollTop,
      focusTaskId: origin.taskId
    });
  }

  /* ── Leave coordination copy (REQ-LEAVE-COPY-001) ──────────────
     Own API base (leaveApiBase), own state (leaveItems), own render
     functions — never mixed into the task `items` array or its
     rendering, since leave is a structurally separate concept
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
          /* member-leave-overlap-prevention (2026-07-17): a create/edit
             blocked by another active leave record this member already
             holds returns a raw 409 body ({error:"leave_overlap",
             message, conflicts:[...]}) with no "detail" wrapper — same
             shape convention as the existing leave_conflict (task-vs-
             leave) contract in apiRequest() above. A leave create/edit
             blocked by an existing Task returns the same shape tagged
             error:"task_conflict" instead (member_leave.py). Both are
             tagged with a stable .code (Phase 1 professional-UX-
             feedback task, 2026-07-22) so ui/error-mapper.js maps them
             to a plain-language message rather than any caller building
             one from raw response text. */
          var err;
          if (errBody && errBody.error === 'leave_overlap') {
            err = new Error(errBody.message || 'This member already has leave that overlaps the selected date or time.');
            err.code = 'leave_overlap';
            err.conflicts = errBody.conflicts || [];
          } else if (errBody && errBody.error === 'task_conflict') {
            err = new Error(errBody.message || 'This leave request conflicts with one or more active tasks.');
            err.code = 'task_conflict';
            err.conflicts = errBody.conflicts || [];
          } else {
            err = new Error('Request failed.');
            err.code = classifyHttpStatus(res.status);
          }
          err.status = res.status;
          throw err;
        });
      }
      if (res.status === 204) { return null; }
      return res.json();
    }).catch(function (err) {
      if (!err.code) { err.code = 'network'; }
      throw err;
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
    clearFormErrors(leaveFormEl);
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
    clearFormErrors(leaveFormEl);
    var hasError = false;
    if (!leaveFieldStartDate.value) {
      setFieldError(leaveFieldStartDate, 'Choose a start date for this leave request.');
      hasError = true;
    }
    var payload = {
      leave_type: leaveType,
      start_date: leaveFieldStartDate.value,
      purpose: leaveFieldPurpose.value.trim() || null,
      external_reference: leaveFieldExternalReference.value.trim() || null
    };
    if (leaveType === 'Multi-Day') {
      if (!leaveFieldEndDate.value) {
        setFieldError(leaveFieldEndDate, 'Choose an end date for Multi-Day leave.');
        hasError = true;
      } else {
        payload.end_date = leaveFieldEndDate.value;
      }
    }
    if (leaveType === 'Short Leave') {
      if (!leaveFieldStartTime.value) {
        setFieldError(leaveFieldStartTime, 'Enter a start time.');
        hasError = true;
      }
      if (!leaveFieldEndTime.value) {
        setFieldError(leaveFieldEndTime, 'Enter an end time.');
        hasError = true;
      }
      if (!hasError) {
        payload.start_time = leaveFieldStartTime.value;
        payload.end_time = leaveFieldEndTime.value;
      }
    }
    if (hasError) { focusFirstInvalid(leaveFormEl); return; }
    setButtonBusy(leaveCreateBtn, true, { busyLabel: 'Saving…' });
    leaveApiRequest('POST', leaveApiBase, payload).then(function (record) {
      leaveItems.push(record);
      resetLeaveForm();
      renderActiveView();
      /* Refresh leave-deduction reporting on successful save (Step 13,
         2026-07-20 popup workflow) — same guarded call
         deleteLeaveRecord() below already uses; previously only
         delete refreshed summaries, not create. Calls the existing,
         unmodified loadSummaries()/report endpoints — no Schedule
         Summary logic changed. */
      if (state.selectedDate) { loadSummaries(state.selectedDate); }
      closeLeavePopup();
      showToast({ type: 'success', title: 'Leave added', message: 'The leave entry was added to the calendar.' });
    }).catch(function (err) {
      /* member-leave-overlap-prevention (2026-07-17) / leave-vs-task
         conflict: on a 409 leave_overlap or task_conflict rejection, the
         form is deliberately NOT reset (entered fields stay exactly as
         the user left them) and no chip/list entry is created
         (leaveItems.push above never runs on this path) — the backend
         rejected the write, so nothing was ever stored. Shown inline
         next to the form (a conflict tied directly to this open form),
         never as a toast, so the same message never appears in two
         places at once (Step 12). Any other failure (network/server/
         unexpected) is shown as a toast instead, since it isn't tied to
         a specific field the user can fix on the spot. */
      var mapped = mapApiError(err);
      if (err.code === 'leave_overlap' || err.code === 'task_conflict') {
        showLeaveFormStatus(mapped.title + ' — ' + mapped.message, true);
        if (err.code === 'leave_overlap' && leaveFieldStartDate && leaveFieldStartDate.focus) {
          leaveFieldStartDate.focus();
        }
      } else {
        showToast({ type: mapped.type, title: mapped.title, message: mapped.message, persistent: mapped.persistent });
      }
    }).then(function () { setButtonBusy(leaveCreateBtn, false); });
  });

  /* ── Leave popup create/edit mode toggle (calendar-based Leave
     management, 2026-07-22 member-page-layout task) — mirrors the Task
     popup's Add/Update/Cancel triple-button pattern above. editingLeaveId
     is null in create mode (the pre-existing behavior, entirely
     unchanged) and set only while editing an existing Leave record from
     the Leave-detail popup's Edit button. ── */
  var editingLeaveId = null;

  function setLeavePopupMode(isEdit) {
    if (leavePopupHeading) { leavePopupHeading.textContent = isEdit ? 'Edit leave' : 'Create Leave'; }
    leaveCreateBtn.style.display = isEdit ? 'none' : '';
    leaveUpdateBtn.style.display = isEdit ? '' : 'none';
    leaveCancelBtn.style.display = isEdit ? '' : 'none';
  }

  /* Entered only from the Leave-detail popup's Edit button (see
     viewLeaveEditBtn below) — prefills the existing Leave create form
     with this record's existing values (same fields, same API contract)
     and opens it in edit mode. */
  function editLeaveItem(id) {
    var lv = leaveItems.filter(function (x) { return x.id === id; })[0];
    if (!lv) { return; }
    editingLeaveId = id;
    showLeaveFormStatus('', false);
    clearFormErrors(leaveFormEl);
    leaveFieldType.value = lv.leave_type;
    leaveFieldStartDate.value = lv.start_date || '';
    leaveFieldEndDate.value = lv.end_date || '';
    leaveFieldStartTime.value = lv.start_time ? lv.start_time.slice(0, 5) : '';
    leaveFieldEndTime.value = lv.end_time ? lv.end_time.slice(0, 5) : '';
    leaveFieldPurpose.value = lv.purpose || '';
    leaveFieldExternalReference.value = lv.external_reference || '';
    updateLeaveFormFieldVisibility();
    setLeavePopupMode(true);
    openLeavePopup();
  }

  /* Cancel Edit (Step 7 "Cancel Edit returns to Leave details, not to a
     blank Create Leave form") — closes the popup, resets it back to
     create mode/blank fields, and reopens the Leave-detail popup for the
     record that was being edited rather than leaving the user on a bare
     calendar. Also used (with no reopen) by the "+Create > Leave" menu
     item below, so a stale edit-in-progress never leaks into a fresh
     Create Leave open. */
  function cancelLeaveEdit(reopenDetailView) {
    var id = editingLeaveId;
    editingLeaveId = null;
    resetLeaveForm();
    setLeavePopupMode(false);
    showLeaveFormStatus('', false);
    clearFormErrors(leaveFormEl);
    if (reopenDetailView && id) {
      closeLeavePopup();
      viewLeaveItem(id, lastFocusedLeaveTrigger);
    }
  }

  leaveCancelBtn.addEventListener('click', function () { cancelLeaveEdit(true); });

  leaveUpdateBtn.addEventListener('click', function () {
    if (!editingLeaveId) { return; }
    var leaveType = leaveFieldType.value;
    showLeaveFormStatus('', false);
    clearFormErrors(leaveFormEl);
    var hasError = false;
    if (!leaveFieldStartDate.value) {
      setFieldError(leaveFieldStartDate, 'Choose a start date for this leave request.');
      hasError = true;
    }
    var payload = {
      leave_type: leaveType,
      start_date: leaveFieldStartDate.value,
      purpose: leaveFieldPurpose.value.trim() || null,
      external_reference: leaveFieldExternalReference.value.trim() || null
    };
    if (leaveType === 'Multi-Day') {
      if (!leaveFieldEndDate.value) {
        setFieldError(leaveFieldEndDate, 'Choose an end date for Multi-Day leave.');
        hasError = true;
      } else {
        payload.end_date = leaveFieldEndDate.value;
      }
    }
    if (leaveType === 'Short Leave') {
      if (!leaveFieldStartTime.value) {
        setFieldError(leaveFieldStartTime, 'Enter a start time.');
        hasError = true;
      }
      if (!leaveFieldEndTime.value) {
        setFieldError(leaveFieldEndTime, 'Enter an end time.');
        hasError = true;
      }
      if (!hasError) {
        payload.start_time = leaveFieldStartTime.value;
        payload.end_time = leaveFieldEndTime.value;
      }
    }
    if (hasError) { focusFirstInvalid(leaveFormEl); return; }
    var editedId = editingLeaveId;
    setButtonBusy(leaveUpdateBtn, true, { busyLabel: 'Saving…' });
    leaveApiRequest('PUT', leaveApiBase + '/' + encodeURIComponent(editedId), payload).then(function (record) {
      var idx = -1;
      for (var i = 0; i < leaveItems.length; i++) { if (leaveItems[i].id === editedId) { idx = i; break; } }
      if (idx !== -1) { leaveItems[idx] = record; }
      renderActiveView();
      if (state.selectedDate) { loadSummaries(state.selectedDate); }
      editingLeaveId = null;
      resetLeaveForm();
      setLeavePopupMode(false);
      closeLeavePopup();
      /* Reopen Leave details with the updated record where practical
         (Step 7), same pattern as the Task Update flow's origin-aware
         reopen above. */
      viewLeaveItem(editedId, lastFocusedLeaveTrigger);
      showToast({ type: 'success', title: 'Leave updated', message: 'Your changes were saved.' });
    }).catch(function (err) {
      var mapped = mapApiError(err);
      if (err.code === 'leave_overlap' || err.code === 'task_conflict') {
        showLeaveFormStatus(mapped.title + ' — ' + mapped.message, true);
      } else {
        showToast({ type: mapped.type, title: mapped.title, message: mapped.message, persistent: mapped.persistent });
      }
    }).then(function () { setButtonBusy(leaveUpdateBtn, false); });
  });

  /* Soft-deletes an active leave record (2026-07-16 simplification
     amendment — the only removal mechanism now that there is no
     Cancelled/Rejected status). Confirms first, then refreshes the
     calendar and the leave-deduction reports. Reused unchanged by the
     Leave-detail popup's Delete button below. */
  function deleteLeaveRecord(leaveId, btn) {
    return confirmDestructive({
      title: 'Delete leave?',
      message: 'This leave entry will be permanently removed from the calendar.',
      confirmLabel: 'Delete leave',
      cancelLabel: 'Cancel',
      trigger: btn,
      onConfirm: function () {
        return leaveApiRequest('DELETE', leaveApiBase + '/' + encodeURIComponent(leaveId)).then(function () {
          leaveItems = leaveItems.filter(function (lv) { return lv.id !== leaveId; });
          renderActiveView();
          if (state.selectedDate) { loadSummaries(state.selectedDate); }
          showToast({ type: 'success', title: 'Leave deleted', message: 'The leave entry was removed.' });
          return true;
        }).catch(function (err) {
          var mapped = mapApiError(err);
          showToast({ type: mapped.type, title: mapped.title, message: mapped.message, persistent: mapped.persistent });
          return false;
        });
      }
    });
  }

  /* ── Shared Leave-detail popup (calendar-based Leave management,
     2026-07-22 member-page-layout task) — mirrors the Task view-modal's
     open/close/Edit/Delete wiring above (lastFocusedTrigger/
     currentViewItemId/closeViewModal/viewItem), scoped to Leave's own
     modal/fields/state so neither implementation touches the other. ── */
  var lastFocusedLeaveTrigger = null;
  var currentViewLeaveId = null;

  function onLeaveViewModalKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); closeLeaveViewModal(); }
    else if (e.key === 'Tab') { trapPopupTab(leaveViewModal, e); }
  }

  function closeLeaveViewModal() {
    leaveViewModal.classList.remove('show');
    leaveViewModal.removeEventListener('keydown', onLeaveViewModalKeydown);
    currentViewLeaveId = null;
    var trigger = lastFocusedLeaveTrigger;
    lastFocusedLeaveTrigger = null;
    returnFocus(trigger);
  }

  /* The ONE shared Leave-detail popup for Month/Week/Day/all-day (Step
     5) — every call site (Month leave chip, Week/Day all-day leave
     chip, Week/Day timed leave block) calls this same function. Fields
     are the existing Leave fields only — no new field invented; the
     leave-deduction minutes line is shown only when the backend already
     returned effective_leave_minutes for this record (same value the
     former Leave Coordination list already displayed). */
  function viewLeaveItem(id, triggerEl) {
    var lv = leaveItems.filter(function (x) { return x.id === id; })[0];
    if (!lv) { return; }
    currentViewLeaveId = id;
    if (leaveViewType) { leaveViewType.textContent = 'Leave type: ' + formatLeaveCalendarLabel(lv); }
    var dateRange = lv.start_date === lv.end_date ? lv.start_date : (lv.start_date + ' – ' + lv.end_date);
    if (leaveViewDate) { leaveViewDate.textContent = 'Date: ' + dateRange; }
    var range = leaveDisplayTimeRange(lv);
    if (leaveViewTime) {
      leaveViewTime.textContent = (range && range.start && range.end)
        ? 'Time: ' + range.start + ' – ' + range.end
        : 'Time: Not set';
    }
    if (leaveViewPurpose) { leaveViewPurpose.textContent = 'Purpose: ' + (lv.purpose || '(none)'); }
    if (leaveViewReference) { leaveViewReference.textContent = 'External reference: ' + (lv.external_reference || '(none)'); }
    if (leaveViewDeduction) {
      if (lv.effective_leave_minutes) {
        leaveViewDeduction.textContent = 'Leave-deduction: ' + lv.effective_leave_minutes + ' minutes';
        leaveViewDeduction.style.display = '';
      } else {
        leaveViewDeduction.style.display = 'none';
      }
    }
    lastFocusedLeaveTrigger = triggerEl || document.activeElement;
    leaveViewModal.classList.add('show');
    leaveViewModal.addEventListener('keydown', onLeaveViewModalKeydown);
    leaveViewClose.focus();
  }

  leaveViewClose.addEventListener('click', closeLeaveViewModal);
  leaveViewModal.addEventListener('click', function (e) {
    if (e.target === leaveViewModal) { closeLeaveViewModal(); }
  });

  if (leaveViewEditBtn) {
    leaveViewEditBtn.addEventListener('click', function () {
      var id = currentViewLeaveId;
      closeLeaveViewModal();
      if (id) { editLeaveItem(id); }
    });
  }

  if (leaveViewDeleteBtn) {
    leaveViewDeleteBtn.addEventListener('click', function () {
      var id = currentViewLeaveId;
      if (!id) { return; }
      deleteLeaveRecord(id, leaveViewDeleteBtn).then(function (deleted) {
        if (!deleted) { return; }
        closeLeaveViewModal();
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

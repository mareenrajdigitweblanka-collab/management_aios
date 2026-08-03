/* calendar/instance.js — the shared per-member calendar factory
   (mountScheduleCalendarInstance) plus initAllScheduleCalendars(). Extracted
   verbatim from the former inline calendar IIFE (2026-07-17 frontend
   modularization); render/CRUD/state/tasks/leave/reports remain here as
   per-instance closures over shared instance state (splitting them would
   require rewriting working logic, which this refactor deliberately avoids).
   The former inline DOMContentLoaded bootstrap now lives in app.js. */

import { MEMBER_SCHEDULE_API_BASE, MEMBER_LEAVE_API_BASE } from '../config.js';
import {
  CATEGORY_CLASS
, LEAVE_TYPE_DISPLAY_LABEL
, formatLeaveCalendarLabel
, expandWeekdaysClientSide
, expandTaskDates
, DEFAULT_RANGE_WEEKDAYS
, buildBulkPayloadRowsForDates
, bulkCardOccurrenceCount
, totalBulkOccurrenceCount as sumOccurrenceCounts
, formatCompactDateList
, leaveDatesForItem
, LEAVE_HALF_DAY_FIRST_DISPLAY
, LEAVE_HALF_DAY_SECOND_DISPLAY
, leaveDisplayTimeRange
, PRIORITY_ORDER
, PRIORITY_BADGE
, MONTH_NAMES
, DAY_HEADS
, DAY_NAMES_FULL
, TG_ROW_HEIGHT_PX
, TG_HOURS
, TG_DEFAULT_SCROLL_HOUR
, pad
, toDateStr
, formatDDMMYYYY
, parseDateStr
, getColomboTodayStr
, isValidDateStr
, timeToMinutes
, minutesToTime
, formatHourLabel
, formatShortDate
, formatDuration
, formatPercentage
, formatChange
, formatTaskTimestamp, getSplitWarningState, getMetricStatusCopy, combineSummaryStatus, getPeriodStatusCopy, getSplitBarSegments, getWeekStart
, getReportWeekStart
, getWeekDays
, buildMonthGridCells
, layoutOverlappingItems
, escapeHtml
, apiItemToFrontend
, frontendToApiPayload
, buildScheduleConfirmationDialogContent
, classifyTimeFrameSet
, describeTimeFrameValidation
, frontendToMultiFramePayload
, frontendToEditPayload
} from './core.js';
import { trapTab, returnFocus } from '../ui/popup.js';
import { showToast } from '../ui/toast.js';
import { confirmDestructive } from '../ui/dialog.js';
import { setButtonBusy, showInlineLoading } from '../ui/loading.js';
import { setFieldError, clearFieldError, clearFormErrors, focusFirstInvalid } from '../ui/form-feedback.js';
import { mapApiError, classifyHttpStatus } from '../ui/error-mapper.js';
import { lockBodyScroll, unlockBodyScroll } from '../ui/scroll-lock.js';
import { registerDateIcon } from './date-icon.js';
import { ensureAuthorized, handleUnauthorizedResponse, guardMutationAccess, labelForMemberKey } from './auth.js';

/* Calendar help guide — one small builder for each expandable topic in the
   redesigned "Calendar help" popup (calendar-help-user-guide-popup task,
   2026-07-27), used instead of repeating the same <details>/<summary>/
   .details-body markup twelve times. Reuses the app's existing native
   <details>/<summary> disclosure convention (web-view/css/components.css,
   already used throughout web-view/index.html and this file's own
   Schedule Summary "View detailed metrics" section) — no new JS toggle
   behavior and no new accessibility pattern is introduced. `title`/`hint`/
   `bodyHtml` are always developer-authored static strings (never member
   or API data), so they are written directly, matching every other static
   string in this popup. */
function calendarHelpSection(title, hint, bodyHtml, open) {
  return '<details class="msc-cal-help-section"' + (open ? ' open' : '') + '>' +
    '<summary><span class="collapsible-summary-text"><strong>' + title + '</strong> — ' + hint + '</span></summary>' +
    '<div class="details-body msc-cal-help-section-body">' + bodyHtml + '</div>' +
    '</details>';
}

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
  var viewOutcomeReasonInputId = 'msc-view-outcome-reason-' + memberKey;
  /* Same per-instance-unique-id rule, used for the sidebar toggle's
     aria-controls target (Phase 1 layout shell, 2026-07-14). */
  var sidebarId = 'msc-sidebar-' + memberKey;
  /* Same per-instance-unique-id rule (unified Create dialog, 2026-07-23
     google-inspired-task-leave-popup-ui task) — the "+ Create" button's
     aria-controls target and the merged Task/Leave create dialog's
     aria-labelledby target. Replaces the former separate
     createMenuId/taskPopupTitleId/leavePopupTitleId — one dialog, one
     heading, one id. */
  var createPopupId = 'msc-create-popup-' + memberKey;
  /* Same per-instance-unique-id rule (calendar-based Leave detail popup,
     2026-07-22 member-page-layout task) — the Leave-detail view popup's
     aria-labelledby target, mirroring viewTitleId's role for the Task
     detail popup above. */
  var leaveViewTitleId = 'msc-leave-view-title-' + memberKey;
  /* Same per-instance-unique-id rule (task-detail "+N more" popup,
     2026-07-20 calendar-task-detail-and-more-popup task). */
  var morePopupTitleId = 'msc-more-popup-title-' + memberKey;
  /* Same per-instance-unique-id rule (google-calendar-inspired-toolbar-
     and-tasks-workspace task, 2026-07-23) — Calendar search panel,
     Help popup, and Settings popup aria targets. */
  var searchPanelId = 'msc-cal-search-panel-' + memberKey;
  var helpPopupTitleId = 'msc-cal-help-title-' + memberKey;
  /* Accessible description target for the redesigned Help popup's
     subtitle (calendar-help-user-guide-popup task, 2026-07-27) — the
     dialog's aria-describedby points here so screen readers announce
     "How to use the Management AIOS Calendar" right after the title. */
  var helpPopupSubtitleId = 'msc-cal-help-subtitle-' + memberKey;
  var settingsPopupTitleId = 'msc-cal-settings-title-' + memberKey;
  /* Month/Week/Day dropdown menu aria-controls target (toolbar-follow-up
     task, 2026-07-23 — direct user feedback re-requested the dropdown
     presentation over the segmented control). */
  var viewDropdownId = 'msc-view-dropdown-' + memberKey;
  /* Same per-instance-unique-id rule (Schedule Summary date-ownership
     task, 2026-07-24) — the manual Summary date <input>'s id/label
     association. */
  var summaryDateInputId = 'msc-summary-date-' + memberKey;
  var tasksDateInputId = 'msc-tasks-date-' + memberKey;

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
    '<div class="msc-cal-toolbar" role="group" aria-label="Calendar toolbar">' +
    '<div class="msc-cal-toolbar-left">' +
    /* Three-zone toolbar grid (toolbar-alignment-and-close-control task,
       2026-07-23) -- left zone is identity-only; Today/Previous/Next/
       Month-Year now live in their own visually-centred zone (see
       .msc-cal-toolbar-center below) instead of sitting next to the
       identity mark. */
    '<button type="button" class="msc-tool-btn msc-tool-btn--icon msc-sidebar-toggle" aria-expanded="true" ' +
    'aria-controls="' + escapeHtml(sidebarId) + '" aria-label="Toggle sidebar" title="Toggle sidebar">&#9776;</button>' +
    /* Calendar identity — icon + "Calendar" label. Title enlarged to
       ~21px/semibold (2026-07-23 redesign, Step 3) from its former
       13px/700 treatment so it reads as a real toolbar title. The former
       generic calendar-grid glyph was replaced (dynamic-today-date-
       calendar-icon task, 2026-07-23) with a dynamic Calendar-date icon
       showing today's Asia/Colombo day-of-month (see date-icon.js) — it
       is no longer purely decorative, so this wrapper is no longer
       aria-hidden; the icon itself carries an accessible label with the
       complete date (set by registerDateIcon() below) and the "Calendar"
       text stays visible/announced beside it. */
    '<div class="msc-cal-identity">' +
    '<span class="msc-cal-date-icon" role="img">' +
    '<span class="msc-cal-date-icon-head" aria-hidden="true"></span>' +
    '<span class="msc-cal-date-icon-num" aria-hidden="true"></span>' +
    '</span>' +
    '<span class="msc-cal-identity-label">Calendar</span>' +
    '</div>' +
    '</div>' +
    /* Today/Previous/Next/Month-Year — sits directly beside the Calendar
       identity (toolbar-alignment-and-date-icon task, 2026-07-23),
       replacing the former true-centred placement that left a large
       empty gap between "Calendar" and "Today". */
    '<div class="msc-cal-toolbar-center">' +
    '<div class="msc-cal-toolbar-btns" role="group" aria-label="Date navigation">' +
    '<button type="button" class="msc-tool-btn msc-tool-btn--today msc-today">Today</button>' +
    '<button type="button" class="msc-tool-btn msc-tool-btn--icon msc-prev" aria-label="Previous day, week or month" title="Previous">' +
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12.5 5l-5 5 5 5"/></svg></button>' +
    '<button type="button" class="msc-tool-btn msc-tool-btn--icon msc-next" aria-label="Next day, week or month" title="Next">' +
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M7.5 5l5 5-5 5"/></svg></button>' +
    '<div class="msc-cal-heading msc-heading">&nbsp;</div>' +
    '</div>' +
    '</div>' +
    /* Right zone: Search/Help/Settings, then the Month/Week/Day
       dropdown, then the Calendar/Tasks segmented control -- all
       right-aligned (grid justify-self: end). */
    '<div class="msc-cal-toolbar-right">' +
    /* Calendar-scoped search (Step 6) — member-isolated (reads this
       instance's own `items`/`leaveItems` closures only), Task/Leave
       title search over already-loaded data, no extra request, no
       database write. Deliberately distinct from the global topbar
       search (web-view/index.html, js/navigation.js), which only
       show/hides static page sections and never sees calendar data. */
    '<div class="msc-cal-utility-group">' +
    '<div class="msc-cal-search-wrap">' +
    '<button type="button" class="msc-tool-btn msc-tool-btn--icon msc-cal-search-trigger" aria-haspopup="true" ' +
    'aria-expanded="false" aria-controls="' + escapeHtml(searchPanelId) + '" aria-label="Search this calendar" title="Search this calendar">' +
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="8.5" cy="8.5" r="5.5"/><path d="M17 17l-4-4"/></svg></button>' +
    '<div class="msc-cal-search-panel" id="' + escapeHtml(searchPanelId) + '" role="search" aria-label="Search Tasks and Leave" hidden>' +
    '<div class="msc-cal-search-field">' +
    '<input type="text" class="msc-cal-search-input" placeholder="Search Tasks and Leave" ' +
    'aria-label="Search Tasks and Leave for ' + escapeHtml(memberLabel) + '" autocomplete="off"/>' +
    '<button type="button" class="msc-cal-search-clear" aria-label="Clear search" hidden>&times;</button>' +
    '</div>' +
    '<div class="msc-cal-search-results" role="listbox" aria-label="Search results"></div>' +
    '</div>' +
    '</div>' +
    '<button type="button" class="msc-tool-btn msc-tool-btn--icon msc-cal-help-trigger" aria-haspopup="dialog" ' +
    'aria-label="Calendar help" title="Calendar help">' +
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="10" cy="10" r="7.3"/><path d="M7.6 7.7a2.4 2.4 0 1 1 3.3 2.2c-.8.4-1 .9-1 1.7"/>' +
    '<circle cx="9.95" cy="14.1" r=".2" fill="currentColor" stroke="none"/></svg></button>' +
    /* Settings icon redrawn a third time (toolbar-follow-up task,
       2026-07-23 — direct user feedback against the deployed gear
       redesign) — a sliders/adjustments glyph (three horizontal tracks,
       each with one filled "handle" at a different position), a common
       and clearly distinct "settings/preferences" icon, using the same
       filled-dot convention the Calendar identity icon already uses. */
    '<button type="button" class="msc-tool-btn msc-tool-btn--icon msc-cal-settings-trigger" aria-haspopup="dialog" ' +
    'aria-label="Calendar settings" title="Calendar settings">' +
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M3 5.5h14"/><circle cx="12.5" cy="5.5" r="1.7" fill="currentColor" stroke="none"/>' +
    '<path d="M3 10h14"/><circle cx="7.5" cy="10" r="1.7" fill="currentColor" stroke="none"/>' +
    '<path d="M3 14.5h14"/><circle cx="14" cy="14.5" r="1.7" fill="currentColor" stroke="none"/></svg></button>' +
    /* Weekly schedule .xlsx download (member-weekly-schedule-xlsx-export
       task, 2026-07-24) — same msc-tool-btn--icon idiom as Search/Help/
       Settings above (inline SVG, viewBox 0 0 20 20, stroke-based glyph).
       A standard spreadsheet/download-tray icon, no Google branding.
       Deliberately placed in the Calendar toolbar only (not My Tasks,
       Schedule Summary, or Task Details) per the approved requirement. */
    '<button type="button" class="msc-tool-btn msc-tool-btn--icon msc-cal-export-trigger" ' +
    'aria-label="Download weekly schedule" title="Download weekly schedule">' +
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M4 3.5h9l3 3v10a.7.7 0 0 1-.7.7H4.7a.7.7 0 0 1-.7-.7v-12.3a.7.7 0 0 1 .7-.7z"/>' +
    '<path d="M13 3.5v3h3"/>' +
    '<path d="M10 8.5v6"/><path d="M7.3 12.2 10 14.9l2.7-2.7"/>' +
    '</svg></button>' +
    '</div>' +
    /* Month/Week/Day dropdown (toolbar-follow-up task, 2026-07-23 —
       direct user feedback re-requested the dropdown presentation over
       the segmented control). Unlike the earlier dropdown attempt, this
       one is fully wired into the one-active-popover system shared with
       Search/Help/Settings (see openViewDropdown()/closeAllOwnPopovers()
       below), which is what makes it close reliably this time. Same
       underlying view-switch logic/elements (.msc-view-btn,
       viewSwitcherBtns, syncViewSwitcherButtons() below) as every prior
       presentation of this control. */
    '<div class="msc-view-dropdown">' +
    '<button type="button" class="msc-tool-btn msc-view-dropdown-trigger" aria-haspopup="listbox" ' +
    'aria-expanded="false" aria-controls="' + escapeHtml(viewDropdownId) + '">' +
    '<span class="msc-view-dropdown-label">Month</span>' +
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5.5 8l4.5 4.5L14.5 8"/></svg></button>' +
    '<div class="msc-view-dropdown-menu" id="' + escapeHtml(viewDropdownId) + '" role="listbox" aria-label="Calendar view" hidden>' +
    '<button type="button" class="msc-view-btn active" data-view="month" role="option" aria-selected="true">Month</button>' +
    '<button type="button" class="msc-view-btn" data-view="week" role="option" aria-selected="false">Week</button>' +
    '<button type="button" class="msc-view-btn" data-view="day" role="option" aria-selected="false">Day</button>' +
    '</div>' +
    '</div>' +
    /* Calendar/Tasks mode switch (Step 7; icon-only redesign,
       calendar-tasks-icon-only-mode-switch task, 2026-07-23) — swaps
       the main workspace between the existing Month/Week/Day grid and
       the member-scoped Tasks workspace (Step 12+). Pure show/hide
       over sibling panels already mounted in this same instance, the
       same pattern web-view/js/navigation.js already uses for the
       app's own tab switching (no routing/history in this app to
       match) — see setMode() below. Visible "Calendar"/"Tasks" text
       labels were removed per direct user feedback against a Google
       Calendar reference screenshot (icon-only segmented control);
       the accessible name now comes from aria-label, and a visible
       tooltip comes from title (see the CSS ::after rule reading
       attr(title) in calendar.css, so it also shows on keyboard
       focus, not just mouse hover). */
    '<div class="msc-cal-mode-switch" role="group" aria-label="Calendar or Tasks">' +
    '<button type="button" class="msc-cal-mode-btn active" data-mode="calendar" aria-pressed="true" ' +
    'aria-label="Open Calendar" title="Calendar">' +
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="3" y="4" width="14" height="13" rx="2"/><path d="M3 8h14"/></svg>' +
    '</button>' +
    '<button type="button" class="msc-cal-mode-btn" data-mode="tasks" aria-pressed="false" ' +
    'aria-label="Open Tasks" title="Tasks">' +
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="10" cy="10" r="7.3"/><path d="M6.5 10.3l2.3 2.3 4.2-4.6"/></svg>' +
    '</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="msc-calendar-main">' +
    '<div class="msc-sidebar" id="' + escapeHtml(sidebarId) + '">' +
    '<div class="msc-create-wrap">' +
    '<button type="button" class="msc-btn msc-btn-primary msc-create-btn msc-sidebar-create" ' +
    'aria-haspopup="dialog" aria-expanded="false" aria-controls="' + escapeHtml(createPopupId) + '">' +
    '<span class="msc-create-btn-plus" aria-hidden="true">+</span>Create</button>' +
    '</div>' +
    '<div class="msc-mini-picker" aria-label="Mini date picker"></div>' +
    '<div class="msc-category-legend" aria-label="Task and Leave category legend">' +
    '<span class="msc-chip-cat task">Scheduled Task</span>' +
    '<span class="msc-chip-cat followup">Unscheduled Task</span>' +
    '<span class="msc-chip-cat leave">Leave</span>' +
    '</div>' +
    '</div>' +
    /* Create chooser menu removed (2026-07-23 google-inspired-task-leave-
       popup-ui task) — replaced by the single Google-inspired
       .msc-create-popup dialog below (Task/Leave tabs inside one
       anchored dialog, per Image B: "replace the current small menu
       presentation with the more polished anchored dialog experience").
       sidebarCreateBtn and openCreateChoiceFromCalendar() now call
       openCreatePopup('task') directly instead of opening this
       intermediate chooser first. */
    '<div class="msc-calendar-content">' +
    '<div class="msc-cal-grid-wrap">' +
    '<div class="msc-cal-grid msc-grid msc-view-pane active" data-view-pane="month"></div>' +
    '<div class="msc-week-grid msc-view-pane" data-view-pane="week"></div>' +
    '<div class="msc-day-grid msc-view-pane" data-view-pane="day"></div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    /* ── Tasks workspace ("My Tasks", FINAL BUSINESS RULES closure review,
       2026-07-24 — replaces the former full-history "All tasks" default;
       see the read-only gap review that preceded this revision) — a
       sibling of .msc-calendar-main inside the same card, shown/hidden by
       setMode() alongside it (see toolbar mode-switch above). Reuses the
       SAME Task data (`items`, the array .msc-calendar-content's own
       Month/Week/Day views already read) and the SAME Task Details/Edit/
       Delete/Create-Task popups defined further below — no second Task
       truth, no new API call; filtering to the selected date happens
       entirely client-side via itemsForDate() (core.js), the same helper
       Month/Week/Day cell rendering already uses. Starred and Lists
       remain NOT implemented (no starred/list field exists anywhere in
       the Task schema, backend or frontend; adding them would require an
       unapproved migration). */
    '<div class="msc-tasks-main" data-mode-pane="tasks">' +
    '<div class="msc-tasks-sidebar">' +
    '<div class="msc-create-wrap">' +
    '<button type="button" class="msc-btn msc-btn-primary msc-create-btn msc-tasks-add-btn">' +
    '<span class="msc-create-btn-plus" aria-hidden="true">+</span>Add a task</button>' +
    '</div>' +
    '<p class="msc-note msc-tasks-nav-note">Starred and custom Lists need additional data fields that are not ' +
    'yet approved for this AIOS, so they are not shown here.</p>' +
    '</div>' +
    '<div class="msc-tasks-content">' +
    '<div class="msc-tasks-header">' +
    '<h3 class="msc-tasks-title">My Tasks</h3>' +
    '<label class="msc-tasks-date-label" for="' + escapeHtml(tasksDateInputId) + '">' +
    '<span class="msc-tasks-date-label-text">Task date:</span>' +
    '<input type="date" class="msc-tasks-date-input" id="' + escapeHtml(tasksDateInputId) + '" />' +
    '</label>' +
    '<span class="msc-tasks-count"></span>' +
    '</div>' +
    '<div class="msc-tasks-list-wrap">' +
    '<div class="msc-tasks-loading" hidden><p class="msc-note">Loading tasks…</p></div>' +
    '<div class="msc-tasks-error" hidden></div>' +
    '<div class="msc-tasks-empty" hidden>' +
    '<p class="msc-tasks-empty-title">No tasks for this date</p>' +
    '<p class="msc-note">Choose another date, or add a task for this one.</p>' +
    '</div>' +
    '<div class="msc-tasks-list" role="list"></div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '<div class="msc-summary-section">' +
    /* Independent Summary date selector (Schedule Summary date-ownership
       task, 2026-07-24) — deliberately separate from the Calendar's own
       selected date (state.selectedDate). Native <input type="date"> per
       the confirmed requirement; label reads "Summary date", never
       "Calendar date", to keep the two concepts visibly distinct. */
    '<div class="msc-summary-header">' +
    '<div class="hr-table-title" style="margin:0;">Schedule Summary</div>' +
    '<label class="msc-summary-date-label" for="' + escapeHtml(summaryDateInputId) + '">' +
    '<span class="msc-summary-date-label-text">Summary date</span>' +
    '<input type="date" class="msc-summary-date-input" id="' + escapeHtml(summaryDateInputId) + '" />' +
    '</label>' +
    '</div>' +
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
    '<div class="hr-table-title" style="margin-bottom:6px;">Today\'s Priorities</div>' +
    '<p class="msc-note" style="margin:0 0 8px;">Today\'s scheduled items ranked by priority.</p>' +
    '<div class="msc-priority-list"></div>' +
    '</div>' +
    /* ── Calendar help popup (redesigned calendar-help-user-guide-popup
       task, 2026-07-27 — see validation/calendar-help-user-guide-popup-
       check-2026-07-27.md) — replaces the former short color-legend/
       Scheduled-Unscheduled/+N-more/Leave-conflict card with a full,
       plain-language "how to use this Calendar" guide for non-technical
       members. Twelve expandable topics (calendarHelpSection() above),
       Quick start kept open by default per the approved structure. No
       technical/database wording, no formulas. Same .msc-modal-overlay/
       .msc-modal convention every other calendar popup already uses;
       trapTab/returnFocus wired below exactly like the other popups —
       only this popup's inner markup/CSS changed, not its open/close
       logic. Every fact restated here (labels, message copy, leave
       types, lunch window, planning-warning window, XLSX tab names) was
       read directly from the current production source (core.js,
       instance.js, error-mapper.js, xlsx_export.py, index.html) rather
       than invented — see the validation file's source map. */
    '<div class="msc-modal-overlay msc-cal-help-popup" role="dialog" aria-modal="true" ' +
    'aria-labelledby="' + escapeHtml(helpPopupTitleId) + '" aria-describedby="' + escapeHtml(helpPopupSubtitleId) + '">' +
    '<div class="msc-modal msc-cal-help-inner msc-cal-help-guide">' +
    /* Header realigned to a true top-right Close (toolbar-alignment-and-
       close-control task, 2026-07-23) — the bottom "Close" button (in
       .msc-form-actions) was removed; the header Close icon is now the
       one and only Close control, and .msc-view-title/space-between
       layout push it to the far right instead of sitting immediately
       beside the title text. Icon changed from a Unicode "&times;" text
       glyph to an inline SVG X, matching the rest of the toolbar's
       icon system. The title now sits above a one-line subtitle (2026-
       07-27) inside .msc-cal-help-head-text, which carries the flex:1
       the bare <h4> used to carry directly — .msc-view-modal-head
       .msc-view-title's own flex:1 rule (calendar.css) is a no-op here
       since the h4 is no longer a direct flex child, so nothing else
       needed to change. */
    '<div class="msc-view-modal-head msc-cal-help-head">' +
    '<div class="msc-cal-help-head-text">' +
    '<h4 class="msc-view-title" id="' + escapeHtml(helpPopupTitleId) + '">Calendar help</h4>' +
    '<p class="msc-cal-help-subtitle" id="' + escapeHtml(helpPopupSubtitleId) + '">How to use the Management AIOS Calendar</p>' +
    '</div>' +
    '<button type="button" class="msc-modal-close msc-cal-help-close" aria-label="Close Calendar help">' +
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5 5l10 10M15 5L5 15"/></svg></button>' +
    '</div>' +
    '<div class="msc-cal-help-body">' +
    calendarHelpSection(
      'Quick start',
      'The fastest way to add a Task, Bulk Tasks, or Leave',
      '<ol class="msc-cal-help-steps">' +
      '<li>Select your name from the left side of the screen.</li>' +
      '<li>Select the date you want to work with.</li>' +
      '<li>Choose + Create.</li>' +
      '<li>Select Task, Bulk Tasks, or Leave.</li>' +
      '<li>Enter the details and save.</li>' +
      '</ol>' +
      '<p class="msc-cal-help-note">Before saving, check that the correct member name and date are selected.</p>',
      true
    ) +
    calendarHelpSection(
      'Move around the Calendar',
      'Today, Previous/Next, Month/Week/Day, and the mini calendar',
      '<ul class="msc-cal-help-bullets">' +
      '<li><strong>Today</strong> returns to the current date.</li>' +
      '<li>Use the left and right arrows to move to another period.</li>' +
      '<li>Use <strong>Month</strong>, <strong>Week</strong>, or <strong>Day</strong> to change the Calendar view.</li>' +
      '<li>Use the small calendar on the left side of the screen to select a date quickly.</li>' +
      '<li>Select a date cell to create or review items for that date.</li>' +
      '<li>Select <strong>+N more</strong> on a date to see the complete list when it has many Tasks.</li>' +
      '</ul>' +
      '<p>The small date icon beside the word "Calendar" always shows today’s date — it does not change when ' +
      'you select a different date.</p>' +
      '<p class="msc-cal-help-note">These are five different things — do not mix them up: <strong>today</strong> ' +
      '(the real current date), the <strong>date you selected</strong> on the Calendar, the <strong>month, week, ' +
      'or day you are viewing</strong>, the <strong>date chosen in My Tasks</strong>, and the <strong>date chosen ' +
      'for Schedule Summary</strong>. Changing one does not change the others.</p>'
    ) +
    calendarHelpSection(
      'Create a Task',
      'Add one Task, with a priority, an optional time, and a note',
      '<ol class="msc-cal-help-steps">' +
      '<li>Select a date.</li>' +
      '<li>Choose + Create.</li>' +
      '<li>Keep the <strong>Task</strong> tab selected.</li>' +
      '<li>Enter the Task title.</li>' +
      '<li>Choose the priority.</li>' +
      '<li>Enter the start and end times when the Task has a specific time.</li>' +
      '<li>Add a short note only when needed.</li>' +
      '<li>Choose <strong>Add schedule</strong>.</li>' +
      '</ol>' +
      '<ul class="msc-cal-help-bullets">' +
      '<li>The end time must be later than the start time.</li>' +
      '<li>Do not write private employee or customer information in Notes.</li>' +
      '<li>The system decides automatically whether a Task is Scheduled or Unscheduled — this is never a manual ' +
      'choice.</li>' +
      '<li>A warning may appear when a Task is during lunch or overlaps another, different Task.</li>' +
      '<li>Read the message, then choose <strong>Go back</strong>, or the "add/save anyway" option shown.</li>' +
      '</ul>' +
      '<ul class="msc-cal-help-bullets">' +
      '<li>Choose <strong>+ Add another time</strong> to enter another separate time for the same Task.</li>' +
      '<li>Each time frame is saved as its own, separate Calendar Task.</li>' +
      '<li>Time frames cannot overlap. A time frame may start exactly when the previous one ends.</li>' +
      '<li>The most you can add is 30 Task occurrences in one submission.</li>' +
      '</ul>'
    ) +
    calendarHelpSection(
      'Create several Tasks with Bulk Tasks',
      'Enter more than one Task at once, one row per Task',
      '<ol class="msc-cal-help-steps">' +
      '<li>Select + Create.</li>' +
      '<li>Select <strong>Bulk Tasks</strong>.</li>' +
      '<li>Enter each Task on its own row.</li>' +
      '<li>Check the date and time for every row.</li>' +
      '<li>Add or remove rows as needed.</li>' +
      '<li>Save the complete group.</li>' +
      '</ol>' +
      '<ul class="msc-cal-help-bullets">' +
      '<li>Blank rows are ignored.</li>' +
      '<li>All valid Tasks in the group are saved together.</li>' +
      '<li>If one Task has a hard error, none of the Tasks in the group are saved.</li>' +
      '<li>Warning-only cases may ask you to confirm before saving.</li>' +
      '<li><strong>Go back</strong> keeps every row you already entered, so you can correct it.</li>' +
      '</ul>' +
      '<ul class="msc-cal-help-bullets">' +
      '<li>Each Bulk Task row may also use <strong>+ Add another time</strong> to add more than one time.</li>' +
      '<li>The 30-occurrence limit applies across all Bulk Task rows together.</li>' +
      '<li>Error messages name the exact Task row and time that needs correcting.</li>' +
      '</ul>'
    ) +
    calendarHelpSection(
      'Add Leave',
      'Short Leave, Half-Day Leave, Full-Day Leave, or Multi-Day Leave',
      '<ol class="msc-cal-help-steps">' +
      '<li>Select the date.</li>' +
      '<li>Choose + Create.</li>' +
      '<li>Select <strong>Leave</strong>.</li>' +
      '<li>Choose the correct Leave type.</li>' +
      '<li>Enter the required date or time details.</li>' +
      '<li>Save.</li>' +
      '</ol>' +
      '<ul class="msc-cal-help-bullets">' +
      '<li>Short Leave</li>' +
      '<li>Half-Day Leave — First Half (08:30–13:00)</li>' +
      '<li>Half-Day Leave — Second Half (13:30–18:00)</li>' +
      '<li>Full-Day Leave</li>' +
      '<li>Multi-Day Leave</li>' +
      '</ul>' +
      '<ul class="msc-cal-help-bullets">' +
      '<li>Full-Day or Multi-Day Leave can prevent Tasks from being added on the dates it covers.</li>' +
      '<li>Short Leave or Half-Day Leave can block a Task whose time overlaps the Leave period.</li>' +
      '<li>The system shows a clear message whenever a Task and Leave conflict.</li>' +
      '</ul>' +
      '<p class="msc-cal-help-note">This Calendar’s Leave entry is for day-to-day coordination only. The ' +
      'separate HR leave system remains official for approvals, balances, and records.</p>'
    ) +
    calendarHelpSection(
      'View, edit, or delete an item',
      'Open any Task or Leave item from the Calendar',
      '<ul class="msc-cal-help-bullets">' +
      '<li>Select a Task or Leave item to open its details.</li>' +
      '<li>Use <strong>Edit</strong> to change an allowed field.</li>' +
      '<li>Use <strong>Delete</strong> to remove an eligible item.</li>' +
      '<li>Use the X to close without changing anything.</li>' +
      '<li>A Task that already has a recorded outcome cannot change date and cannot be deleted.</li>' +
      '<li>The system explains when an action is unavailable.</li>' +
      '<li>When a Task has more than one time, each time is its own separate item and is viewed, edited, or ' +
      'deleted independently.</li>' +
      '</ul>'
    ) +
    calendarHelpSection(
      'Use My Tasks',
      'A focused, one-date-at-a-time list of your own Tasks',
      '<ul class="msc-cal-help-bullets">' +
      '<li>Switch from Calendar to Tasks using the toggle in the toolbar.</li>' +
      '<li>My Tasks opens with today’s date already selected.</li>' +
      '<li>Choose another date to see Tasks for that date.</li>' +
      '<li>Only Tasks for the selected date appear in the list.</li>' +
      '<li>Changing the My Tasks date does not move the main Calendar.</li>' +
      '<li>Changing the My Tasks date does not change the Schedule Summary date.</li>' +
      '</ul>'
    ) +
    calendarHelpSection(
      'Mark a Task Completed or Uncompleted',
      'Record whether a Task was finished, on its own date',
      '<ol class="msc-cal-help-steps">' +
      '<li>Open the Task on its own date.</li>' +
      '<li>Choose Mark Completed when the Task is finished, then confirm.</li>' +
      '<li>Choose Mark Uncompleted when it was not finished.</li>' +
      '<li>Enter a clear reason of 250 characters or fewer.</li>' +
      '</ol>' +
      '<p>Outcome updates close at 11:59:59 PM on the Task’s own date. After that time, an untouched Task ' +
      'shows <strong>No response</strong>.</p>' +
      '<dl class="msc-cal-help-states">' +
      '<div><dt>Pending</dt><dd>No result has been selected yet.</dd></div>' +
      '<div><dt>Completed</dt><dd>The Task was completed.</dd></div>' +
      '<div><dt>Uncompleted</dt><dd>The Task was not completed, and a reason was entered.</dd></div>' +
      '<div><dt>No response</dt><dd>The Task’s date passed without a result being selected. This is not the ' +
      'same as Uncompleted.</dd></div>' +
      '</dl>'
    ) +
    calendarHelpSection(
      'Download a weekly schedule',
      'A copy of one member’s week as an .xlsx file',
      '<ol class="msc-cal-help-steps">' +
      '<li>Select a date in the Calendar.</li>' +
      '<li>Choose the <strong>Download weekly schedule</strong> icon in the Calendar toolbar.</li>' +
      '<li>The system downloads the Monday-to-Sunday week that contains the selected date.</li>' +
      '<li>Open the downloaded .xlsx file in Excel or Google Sheets.</li>' +
      '</ol>' +
      '<ul class="msc-cal-help-bullets">' +
      '<li>The workbook has a "Weekly Schedule" tab and a "Weekly Summary" tab.</li>' +
      '<li>It includes the selected member’s Tasks and Leave for that week.</li>' +
      '<li>An empty week shows "No schedule found" and does not download a file.</li>' +
      '<li>The downloaded workbook is a copy. Changing it does not update the Calendar — make changes inside ' +
      'Management AIOS instead.</li>' +
      '</ul>'
    ) +
    calendarHelpSection(
      'Understand colors and warnings',
      'What green, yellow, and red mean, and the weekly planning reminder',
      '<ul class="msc-cal-help-list">' +
      '<li><span class="msc-chip-cat task" aria-hidden="true"></span><strong>Green — Scheduled Task.</strong> ' +
      'Created before the weekly planning deadline.</li>' +
      '<li><span class="msc-chip-cat followup" aria-hidden="true"></span><strong>Yellow — Unscheduled Task.</strong> ' +
      'Created or edited after the weekly planning deadline.</li>' +
      '<li><span class="msc-chip-cat leave" aria-hidden="true"></span><strong>Red — Leave.</strong> A Leave entry ' +
      'recorded on the Calendar for coordination.</li>' +
      '</ul>' +
      '<p class="msc-cal-help-note">The system assigns Scheduled or Unscheduled automatically. Members do not ' +
      'choose the category manually.</p>' +
      '<p>A planning reminder appears from Friday 7:00 AM through Sunday 11:59:59 PM, reminding members to enter ' +
      'next week’s Tasks before the deadline.</p>'
    ) +
    calendarHelpSection(
      'Common messages',
      'What a message means and what to do next',
      '<dl class="msc-cal-help-messages">' +
      '<div><dt>Select a date</dt><dd>Choose a Calendar date before using an action that needs one.</dd></div>' +
      '<div><dt>No schedule found</dt><dd>The selected week has no Tasks or Leave.</dd></div>' +
      '<div><dt>Check this task time</dt><dd>The Task is during lunch, overlaps another different Task, or ' +
      'both.</dd></div>' +
      '<div><dt>Go back</dt><dd>Returns you to the form without saving anything.</dd></div>' +
      '<div><dt>Duplicate task</dt><dd>The same Task already exists at the same date and time.</dd></div>' +
      '<div><dt>Task time overlaps</dt><dd>Another time for the same Task overlaps the selected time.</dd></div>' +
      '<div><dt>Task time required</dt><dd>The same Task already exists and needs a separate, non-overlapping ' +
      'time.</dd></div>' +
      '<div><dt>Too many task times</dt><dd>The submission has more than 30 Task occurrences.</dd></div>' +
      '<div><dt>Outcome not available yet</dt><dd>The result can be selected only on the Task’s own ' +
      'date.</dd></div>' +
      '<div><dt>Outcome update closed</dt><dd>The Task’s date has already passed.</dd></div>' +
      '</dl>'
    ) +
    calendarHelpSection(
      'Need more help?',
      'What to do when a message is unclear',
      '<ul class="msc-cal-help-bullets">' +
      '<li>Close this guide and try the action again.</li>' +
      '<li>Read the message the system shows — it usually explains what to do next.</li>' +
      '<li>When the message is unclear, take a screenshot and send it to the Management AIOS owner.</li>' +
      '<li>Do not include private employee or customer details in support screenshots.</li>' +
      '</ul>'
    ) +
    '</div>' +
    '</div>' +
    '</div>' +
    /* ── Calendar settings popup (Step 6) — presentation-only preferences
       already supported by this calendar (sidebar expanded/collapsed).
       Deliberately does not expose any business-rule setting (weekly
       classification cutoff, Leave rules, Schedule Summary formulas,
       member access) — those remain backend-owned and are not editable
       from any frontend surface. */
    '<div class="msc-modal-overlay msc-cal-settings-popup" role="dialog" aria-modal="true" aria-labelledby="' + escapeHtml(settingsPopupTitleId) + '">' +
    '<div class="msc-modal msc-cal-help-inner">' +
    /* Header realigned to a true top-right Close, bottom Close button
       removed — same treatment as the Help popup above. */
    '<div class="msc-view-modal-head">' +
    '<h4 class="msc-view-title" id="' + escapeHtml(settingsPopupTitleId) + '">Calendar settings</h4>' +
    '<button type="button" class="msc-modal-close msc-cal-settings-close" aria-label="Close Calendar settings">' +
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5 5l10 10M15 5L5 15"/></svg></button>' +
    '</div>' +
    '<label class="msc-cal-settings-row">' +
    '<input type="checkbox" class="msc-cal-settings-sidebar-toggle" checked/>' +
    '<span>Show the Calendar sidebar (Create, mini calendar, legend) by default</span>' +
    '</label>' +
    '<p class="msc-note">Only display preferences already supported by this calendar are shown here. Task/Leave ' +
    'business rules (classification, conflicts, Schedule Summary) are set by Management AIOS policy and are not ' +
    'user-editable.</p>' +
    '</div>' +
    '</div>' +
    /* ── Shared Task-detail popup (popup-detail-close-and-scroll-
       containment task, 2026-07-23) — the ONE task-detail popup used by
       every calendar view (Month chip, Week/Day timed block, all-day
       chip, "+N more" popup row). Fields are the existing Task fields
       only (title/date/time/category/priority/notes) — no new field
       invented. Three-part visual order per this task's spec: (A) a
       top action row holding ONLY Edit/Delete/Close, right-aligned —
       previously this row also held the category dot and title, which
       pushed the title down to a cramped, easy-to-miss position; (B) an
       identity row (category dot + prominent Task title, ~20-24px/600)
       directly below; (C) the existing Date/Time/Category/Priority/
       Notes fields. Edit/Delete/Close are the exact same buttons/
       classes/click-handlers as before — only their icons (now inline
       SVG, matching this session's icon system) and their position in
       the markup changed. */
    '<div class="msc-modal-overlay msc-view-modal" role="dialog" aria-modal="true" aria-labelledby="' + escapeHtml(viewTitleId) + '">' +
    '<div class="msc-modal msc-view-modal-inner">' +
    '<div class="msc-view-modal-head">' +
    '<div class="msc-view-modal-head-actions">' +
    '<button type="button" class="msc-modal-close msc-view-edit-btn" aria-label="Edit task" title="Edit task">' +
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M13.3 3.3a1.6 1.6 0 0 1 2.3 2.3L6.4 14.8l-3 .8.8-3z"/><path d="M11.8 4.8l2.3 2.3"/></svg></button>' +
    '<button type="button" class="msc-modal-close msc-view-delete-btn" aria-label="Delete task" title="Delete task">' +
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4.5 6h11M8 6V4.6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6M8.3 9v4.5M11.7 9v4.5"/>' +
    '<path d="M5.5 6l.7 8.4a1.4 1.4 0 0 0 1.4 1.3h4.8a1.4 1.4 0 0 0 1.4-1.3L14.5 6"/></svg></button>' +
    '<button type="button" class="msc-modal-close msc-view-close" aria-label="Close task details" title="Close task details">' +
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5 5l10 10M15 5L5 15"/></svg></button>' +
    '</div>' +
    '</div>' +
    '<div class="msc-view-modal-identity">' +
    '<span class="msc-view-color-dot" aria-hidden="true"></span>' +
    '<h4 class="msc-view-title msc-view-modal-identity-title" id="' + escapeHtml(viewTitleId) + '"></h4>' +
    '</div>' +
    '<p class="msc-view-date"></p>' +
    '<p class="msc-view-time"></p>' +
    '<p class="msc-view-category"></p>' +
    '<p class="msc-view-priority"></p>' +
    '<p class="msc-view-notes"></p>' +
    '<p class="msc-view-created-at msc-view-meta-secondary"></p>' +
    '<p class="msc-view-updated-at msc-view-meta-secondary"></p>' +
    /* Outcome section (live UI/UX feedback, 2026-07-24) — visually
       separated from the Date/Time/Category/Priority/Notes block above
       via .msc-view-outcome-section's top divider, so "this is the
       task's status" reads as its own group rather than blending into
       the plain-text field list. .msc-view-outcome itself now renders a
       colored status badge (outcomeStatusBadgeClass()) matching the
       Tasks workspace row badges exactly, instead of plain
       "Outcome: Uncompleted" text — same status, same visual language,
       wherever it appears. Outcome updated at/by are de-emphasized via
       .msc-view-meta-secondary (smaller/muted), same treatment as
       Created/Updated at above — both are audit trail, not primary
       content. CONFIRMED UNTOUCHED-TASK OUTCOME (2026-07-24): a status
       line plus Mark Completed/Uncompleted controls. Both buttons become
       visually unavailable (aria-disabled + .msc-btn-unavailable, never
       the native `disabled` attribute) once the task's date is not
       Colombo "today" — see getOutcomeAvailability()/renderOutcome()
       below — which makes them read-only-looking outside the task's own
       date regardless of whether an outcome was already recorded, while
       staying mouse/keyboard reachable so a click still explains why
       (screenshot-derived defect fix, 2026-07-24). Reuses the existing
       .msc-btn/.msc-btn-ghost/.msc-form-actions classes — no new button
       visual language introduced.

       FINAL CONFIRMED REASON-TRANSITION RULE (2026-07-24, same day) — Mark
       Uncompleted no longer submits directly: it reveals
       .msc-view-outcome-reason-form (hidden by default), which collects a
       required, <=250-char reason before submitting. Mark Completed, when
       the current outcome is 'Uncompleted', goes through the shared
       confirmDestructive() dialog first (it is about to clear that
       recorded reason) — see the Mark Completed click handler below. */
    '<div class="msc-view-outcome-section">' +
    '<p class="msc-view-outcome"></p>' +
    /* Separate lines for Reason/Outcome-updated-at/Outcome-updated-by
       (FINAL BUSINESS RULES closure review, 2026-07-24, Step 5) — each is
       its own <p>, hidden via renderOutcome() rather than merged into the
       status line, so "do not display a stale Uncompleted reason when
       outcome is Completed" is enforced by simply hiding the element
       (its text is only ever set from it.outcome_reason, which the
       backend already nulls out on a Completed transition — nothing here
       generates or retains text independently). */
    '<p class="msc-view-outcome-reason" hidden></p>' +
    '<p class="msc-view-outcome-updated-at msc-view-meta-secondary" hidden></p>' +
    '<p class="msc-view-outcome-updated-by msc-view-meta-secondary" hidden></p>' +
    '<div class="msc-form-actions msc-view-outcome-actions">' +
    '<button type="button" class="msc-btn msc-btn-ghost msc-view-outcome-completed-btn">Mark Completed</button>' +
    '<button type="button" class="msc-btn msc-btn-ghost msc-view-outcome-uncompleted-btn">Mark Uncompleted</button>' +
    '</div>' +
    '<div class="msc-view-outcome-reason-form" hidden>' +
    '<label class="msc-view-outcome-reason-label" for="' + escapeHtml(viewOutcomeReasonInputId) + '">Reason for Uncompleted</label>' +
    '<textarea class="msc-view-outcome-reason-input" id="' + escapeHtml(viewOutcomeReasonInputId) + '" maxlength="250" rows="3"></textarea>' +
    '<span class="msc-view-outcome-reason-counter">0 / 250</span>' +
    '<div class="msc-form-actions">' +
    '<button type="button" class="msc-btn msc-btn-primary msc-view-outcome-reason-submit-btn">Mark Uncompleted</button>' +
    '<button type="button" class="msc-btn msc-btn-ghost msc-view-outcome-reason-cancel-btn">Cancel</button>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    '</div>' +
    /* ── Shared Leave-detail popup (popup-detail-close-and-scroll-
       containment task, 2026-07-23) — the ONE Leave-detail popup used by
       every calendar view (Month leave chip, Week/Day all-day leave
       chip, Week/Day timed leave block). Mirrors the Task-detail popup
       above: a top action row (Edit/Delete/Close only), then an
       identity row (leave-color dot + "Leave details" heading), then
       the existing Leave fields. Fields are the existing Leave fields
       only (type/date-range/time/purpose/external reference/leave-
       deduction minutes where already available) — no new field
       invented. Edit/Delete reuse the existing Leave create form and
       deleteLeaveRecord()/leaveApiRequest() functions; nothing new is
       added to the backend/API contract. */
    '<div class="msc-modal-overlay msc-leave-view-modal" role="dialog" aria-modal="true" aria-labelledby="' + escapeHtml(leaveViewTitleId) + '">' +
    '<div class="msc-modal msc-view-modal-inner">' +
    '<div class="msc-view-modal-head">' +
    '<div class="msc-view-modal-head-actions">' +
    '<button type="button" class="msc-modal-close msc-leave-view-edit-btn" aria-label="Edit leave" title="Edit leave">' +
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M13.3 3.3a1.6 1.6 0 0 1 2.3 2.3L6.4 14.8l-3 .8.8-3z"/><path d="M11.8 4.8l2.3 2.3"/></svg></button>' +
    '<button type="button" class="msc-modal-close msc-leave-view-delete-btn" aria-label="Delete leave" title="Delete leave">' +
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4.5 6h11M8 6V4.6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V6M8.3 9v4.5M11.7 9v4.5"/>' +
    '<path d="M5.5 6l.7 8.4a1.4 1.4 0 0 0 1.4 1.3h4.8a1.4 1.4 0 0 0 1.4-1.3L14.5 6"/></svg></button>' +
    '<button type="button" class="msc-modal-close msc-leave-view-close" aria-label="Close leave details" title="Close leave details">' +
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5 5l10 10M15 5L5 15"/></svg></button>' +
    '</div>' +
    '</div>' +
    '<div class="msc-view-modal-identity">' +
    '<span class="msc-view-color-dot leave" aria-hidden="true"></span>' +
    '<h4 class="msc-view-title msc-view-modal-identity-title" id="' + escapeHtml(leaveViewTitleId) + '">Leave details</h4>' +
    '</div>' +
    '<p class="msc-leave-view-type"></p>' +
    '<p class="msc-leave-view-date"></p>' +
    '<p class="msc-leave-view-time"></p>' +
    '<p class="msc-leave-view-purpose"></p>' +
    '<p class="msc-leave-view-reference"></p>' +
    '<p class="msc-leave-view-deduction"></p>' +
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
    /* ── Unified Create dialog (Task/Leave tabs, 2026-07-23
       google-inspired-task-leave-popup-ui task) — replaces the former
       separate .msc-task-popup / .msc-leave-popup overlays (and the
       .msc-create-menu chooser removed above) with ONE Google-Calendar-
       inspired dialog: a title, a Task/Leave tab pair, and the exact
       same Task and Leave fields/buttons as before (unchanged classes,
       ids, validation, and API wiring — only the surrounding shell and
       open/close orchestration changed, see openCreatePopup()/
       closeCreatePopup()/setCreateDialogTab() below). The manual
       category selector that used to sit in the Task fields was removed
       2026-07-22 — category is always backend-assigned (no visible
       classification note is shown in these forms; UI-text-removal task,
       2026-07-23). */
    '<div class="msc-modal-overlay msc-create-popup" role="dialog" aria-modal="true" aria-labelledby="' + escapeHtml(createPopupId) + '">' +
    '<div class="msc-modal msc-modal-form">' +
    '<div class="msc-modal-form-head">' +
    '<h4 class="msc-create-popup-heading" id="' + escapeHtml(createPopupId) + '">Create</h4>' +
    '<button type="button" class="msc-modal-close msc-create-popup-close" aria-label="Close">&times;</button>' +
    '</div>' +
    '<div class="msc-create-tabs" role="tablist" aria-label="Task, Bulk Tasks, or Leave">' +
    '<button type="button" class="msc-create-tab msc-create-tab-task active" role="tab" aria-selected="true">Task</button>' +
    '<button type="button" class="msc-create-tab msc-create-tab-bulk" role="tab" aria-selected="false">Bulk Tasks</button>' +
    '<button type="button" class="msc-create-tab msc-create-tab-leave" role="tab" aria-selected="false">Leave</button>' +
    '</div>' +
    '<div class="msc-create-task-fields">' +
    '<div class="msc-form-card">' +
    '<div class="hr-table-title" style="margin-bottom:10px;">Schedule Item — ' +
    '<span class="msc-selected-date-label">select a date</span></div>' +
    '<form class="msc-form msc-form-grid" autocomplete="off">' +
    '<label>Date<input type="date" class="msc-field-date" required /></label>' +
    '<label>Title<input type="text" class="msc-field-title" placeholder="e.g. Prepare weekly report" maxlength="120" required />' +
    '<span class="msc-field-title-counter">0 / 120</span></label>' +
    '<label>Priority<select class="msc-field-priority">' +
    '<option value="High">High</option>' +
    '<option value="Medium" selected>Medium</option>' +
    '<option value="Low">Low</option>' +
    '</select></label>' +
    /* ── Time frames (multiple-time-frames-per-task, 2026-07-27) ──────
       "Time frame 1" is always the classic Start/End pair below — the
       same .msc-field-start/.msc-field-end inputs every existing
       click-to-create prefill, drag/resize, and editItem() code path
       already reads/writes directly, completely unchanged. Frames 2+ are
       additive rows rendered into .msc-time-frames-extra only once the
       user clicks "+ Add another time" — see addTimeFrameRow() et al.
       below. A single time frame therefore renders and behaves exactly
       as the form always has; this section is purely additive. */
    '<div class="msc-time-frames-section msc-form-full">' +
    '<div class="msc-time-frame-row msc-time-frame-row--primary">' +
    '<div class="msc-time-frame-heading">Time frame 1</div>' +
    '<label>Start time<input type="time" class="msc-field-start" /></label>' +
    '<label>End time<input type="time" class="msc-field-end" /></label>' +
    '</div>' +
    '<div class="msc-time-frames-extra"></div>' +
    '<button type="button" class="msc-btn msc-btn-ghost msc-add-time-frame-btn">+ Add another time</button>' +
    '</div>' +
    '<label class="msc-form-full">Notes<textarea class="msc-field-notes" maxlength="240" ' +
    'placeholder="Optional note — no real names, meetings, or customer details"></textarea></label>' +
    '</form>' +
    '</div>' +
    '</div>' +
    /* ── Bulk Tasks tab (same-day-bulk-task-creation task, 2026-07-23;
       per-row Date field, confirmed-add-row-date-rule task, 2026-07-24) —
       third tab in the unified Create dialog, additive alongside the
       unchanged Task/Leave tabs above/below. Each row carries its own
       independently editable Date field (no common batch-wide Date field
       any more — see bulkRowMarkup() below); the row list itself is
       rendered/managed entirely in JS (renderBulkRows() et al. below)
       rather than as static markup, since rows are added/removed
       dynamically (start at 1 row, grow to a max of
       MAX_BULK_TASK_ROWS = 30, mirroring the backend's own cap). No
       Scheduled/Unscheduled selector exists here, matching the single-Task
       form (no visible classification note is shown in either form;
       UI-text-removal task, 2026-07-23). */
    '<div class="msc-create-bulk-fields" hidden>' +
    '<div class="msc-form-card">' +
    /* No inner "Create multiple tasks" heading here (bulk-tasks-modal-
       scroll-and-first-row-alignment task, 2026-07-24 — this exact string
       is already the sticky dialog heading whenever this tab is active,
       set by setCreateDialogTab() above; keeping both rendered a visible
       duplicate heading and pushed TASK 1 further down for no reason).
       The Task tab's equivalent .hr-table-title deliberately shows
       different text ("Schedule Item — <date>"), so it is not a
       duplicate and is left exactly as-is. */
    '<form class="msc-bulk-form" autocomplete="off">' +
    '<div class="msc-bulk-rows"></div>' +
    /* Submission-wide occurrence summary (REQ-CAL-BULK-DATES-001,
       2026-08-03) — "N task rows / M occurrences", live-updated on every
       date/time-frame change across every card (updateBulkCreateButtonGate
       below). role="status" so a screen-reader user gets the same running
       total a sighted user sees, without an intrusive alert on every
       keystroke. */
    '<p class="msc-bulk-occurrence-summary" role="status"></p>' +
    '<button type="button" class="msc-btn msc-btn-ghost msc-bulk-add-row-btn">+ Add another task</button>' +
    '</form>' +
    '</div>' +
    '</div>' +
    '<div class="msc-create-leave-fields" hidden>' +
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
    '</div>' +
    '</div>' +
    '<div class="msc-create-task-footer">' +
    '<p class="msc-note msc-api-status msc-task-popup-status" style="display:none;"></p>' +
    '<div class="msc-form-actions">' +
    '<button type="button" class="msc-btn msc-btn-primary msc-add-btn">Add schedule</button>' +
    '<button type="button" class="msc-btn msc-btn-primary msc-update-btn" style="display:none;">Update schedule</button>' +
    '<button type="button" class="msc-btn msc-btn-ghost msc-cancel-btn" style="display:none;">Cancel edit</button>' +
    '</div>' +
    '</div>' +
    '<div class="msc-create-leave-footer" style="display:none;">' +
    '<p class="msc-note msc-api-status msc-leave-form-status" style="display:none;"></p>' +
    '<div class="msc-form-actions">' +
    '<button type="button" class="msc-btn msc-btn-primary msc-leave-create-btn">Create leave</button>' +
    '<button type="button" class="msc-btn msc-btn-primary msc-leave-update-btn" style="display:none;">Update leave</button>' +
    '<button type="button" class="msc-btn msc-btn-ghost msc-leave-cancel-btn" style="display:none;">Cancel edit</button>' +
    '</div>' +
    '</div>' +
    '<div class="msc-create-bulk-footer" style="display:none;">' +
    '<p class="msc-note msc-api-status msc-bulk-popup-status" style="display:none;"></p>' +
    '<div class="msc-form-actions">' +
    '<button type="button" class="msc-btn msc-btn-primary msc-bulk-create-btn">Create tasks</button>' +
    '<button type="button" class="msc-btn msc-btn-ghost msc-bulk-cancel-btn">Cancel</button>' +
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
  /* Dynamic Calendar-date icon (dynamic-today-date-calendar-icon task,
     2026-07-23) — registers with the one shared updater in date-icon.js
     instead of starting a per-instance timer; represents today only, so
     it is intentionally never fed this instance's selected/viewed date. */
  var calDateIconEl = container.querySelector('.msc-cal-date-icon');
  if (calDateIconEl) { registerDateIcon(calDateIconEl); }
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

  /* ── Time frames (multiple-time-frames-per-task, 2026-07-27) ──────────
     "Time frame 1" is always fieldStart/fieldEnd above — untouched by
     everything below. Frames 2+ live in timeFramesExtraEl, one
     .msc-time-frame-row per additional frame, added/removed entirely in
     JS (mirrors the existing Bulk row list convention — addBulkRow()/
     removeBulkRow()/renderBulkRowNumbers() below — but scoped to this one
     form's own extra-frames list, not a separate row of Date/Title/
     Priority/Notes fields). Reuses MAX_BULK_TASK_ROWS's value (30) as its
     own cap rather than inventing a second constant, exactly like the
     Bulk row cap below already documents doing for the backend's
     MAX_BULK_TASK_ROWS. */
  var MAX_TIME_FRAMES_PER_TASK = 30;
  var timeFramesExtraEl = container.querySelector('.msc-time-frames-extra');
  var addTimeFrameBtn = container.querySelector('.msc-add-time-frame-btn');

  function timeFrameRowMarkup() {
    return (
      '<div class="msc-time-frame-row">' +
      '<div class="msc-time-frame-heading"></div>' +
      '<label>Start time<input type="time" class="msc-time-frame-start" /></label>' +
      '<label>End time<input type="time" class="msc-time-frame-end" /></label>' +
      '<button type="button" class="msc-btn msc-btn-ghost msc-time-frame-remove-btn">Remove</button>' +
      '</div>'
    );
  }

  function getTimeFrameExtraRows() {
    return Array.prototype.slice.call(timeFramesExtraEl.querySelectorAll('.msc-time-frame-row'));
  }

  /* Keeps every row's visible "Time frame N" heading (and the Remove
     button's accessible label) in sync with its current position —
     called after every add/remove so numbering is always dense and
     1-indexed, matching what the same-title/advisory backend responses
     also use for row_index/frame_index (Phase 11: never a zero-based
     index shown to the user). */
  function renumberTimeFrames() {
    getTimeFrameExtraRows().forEach(function (rowEl, index) {
      var frameNumber = index + 2; // frame 1 is always fieldStart/fieldEnd
      var heading = rowEl.querySelector('.msc-time-frame-heading');
      if (heading) { heading.textContent = 'Time frame ' + frameNumber; }
      var startInput = rowEl.querySelector('.msc-time-frame-start');
      var endInput = rowEl.querySelector('.msc-time-frame-end');
      var removeBtn = rowEl.querySelector('.msc-time-frame-remove-btn');
      if (startInput) { startInput.setAttribute('aria-label', 'Time frame ' + frameNumber + ' start time'); }
      if (endInput) { endInput.setAttribute('aria-label', 'Time frame ' + frameNumber + ' end time'); }
      if (removeBtn) { removeBtn.setAttribute('aria-label', 'Remove time frame ' + frameNumber); }
    });
  }

  function addTimeFrameRow(focus) {
    if (getTimeFrameExtraRows().length + 1 >= MAX_TIME_FRAMES_PER_TASK) {
      if (addTimeFrameBtn) { addTimeFrameBtn.disabled = true; }
    }
    if (getTimeFrameExtraRows().length + 1 > MAX_TIME_FRAMES_PER_TASK) { return null; }
    var wrap = document.createElement('div');
    wrap.innerHTML = timeFrameRowMarkup();
    var rowEl = wrap.firstChild;
    timeFramesExtraEl.appendChild(rowEl);
    renumberTimeFrames();
    var startInput = rowEl.querySelector('.msc-time-frame-start');
    var endInput = rowEl.querySelector('.msc-time-frame-end');
    var removeBtn = rowEl.querySelector('.msc-time-frame-remove-btn');
    if (startInput) { startInput.addEventListener('input', function () { clearFieldError(startInput); }); }
    if (endInput) { endInput.addEventListener('input', function () { clearFieldError(endInput); }); }
    if (removeBtn) {
      removeBtn.addEventListener('click', function () { removeTimeFrameRow(rowEl); });
    }
    if (focus !== false && startInput) { startInput.focus(); }
    return rowEl;
  }

  function removeTimeFrameRow(rowEl) {
    if (!rowEl || !rowEl.parentNode) { return; }
    rowEl.parentNode.removeChild(rowEl);
    renumberTimeFrames();
    if (addTimeFrameBtn) { addTimeFrameBtn.disabled = false; }
  }

  /* Discards every additional time frame, leaving only frame 1
     (fieldStart/fieldEnd, cleared separately by resetForm()) — called on
     resetForm() and whenever a fresh edit is opened, since Task Edit never
     pre-populates additional frames from another existing occurrence
     (PHASE 12: editing one occurrence must never auto-discover or group
     any other same-title/date row). */
  function resetTimeFrames() {
    timeFramesExtraEl.innerHTML = '';
    if (addTimeFrameBtn) { addTimeFrameBtn.disabled = false; }
  }

  /* Collects every time frame currently in the form, Time-frame-1-first,
     as plain {start, end} HH:MM-string pairs — the shape
     classifyTimeFrameSet()/frontendToMultiFramePayload()/
     frontendToEditPayload() (core.js) all expect. */
  function collectTimeFrames() {
    var frames = [{ start: fieldStart.value, end: fieldEnd.value }];
    getTimeFrameExtraRows().forEach(function (rowEl) {
      var startInput = rowEl.querySelector('.msc-time-frame-start');
      var endInput = rowEl.querySelector('.msc-time-frame-end');
      frames.push({ start: startInput ? startInput.value : '', end: endInput ? endInput.value : '' });
    });
    return frames;
  }

  /* Frame N's End time input in the Single/Edit form — frame 1 is always
     fieldEnd, frame 2+ is the (N-2)th additional row's own End input.
     Shared by validateTimeFrames() (client-side pre-submit) and the
     server-error handlers in performTaskCreate/performTaskUpdate below
     (FRAME-LEVEL ERROR CONTEXT, 2026-07-27 — a hard-conflict/leave-
     conflict 409 that names a specific time_frame_index needs to target
     the exact same input a client-side rejection would have). Returns
     null for an out-of-range frameNumber rather than throwing. */
  function inputForFrame(frameNumber) {
    if (!frameNumber || frameNumber === 1) { return fieldEnd; }
    var rows = getTimeFrameExtraRows();
    var row = rows[frameNumber - 2];
    return row ? row.querySelector('.msc-time-frame-end') : null;
  }

  /* Runs classifyTimeFrameSet() against the form's current frames and, on
     failure, shows the exact PHASE 4/5 title/message via a toast plus a
     field-level error on the first offending time input — mirrors
     validateTaskTimeRange()'s own inline-error + toast pattern. Returns
     true only when every frame is shape-valid and non-conflicting; never
     clears any entered value either way (PHASE 5: "preserve all entered
     values after rejection"). */
  function validateTimeFrames() {
    var frames = collectTimeFrames();
    var result = classifyTimeFrameSet(frames);
    if (result.outcome === 'ok') { return true; }
    var copy = describeTimeFrameValidation(result, frames.length, false);
    /* FRAME-LEVEL ERROR CONTEXT (2026-07-27) — target whichever frame the
       message actually names: incomplete/invalid_range name `a`;
       duplicate/overlap name `b` (the later of the two conflicting
       frames — see describeTimeFrameValidation), so the highlighted
       input always matches what the message says. */
    var namedFrame = (result.outcome === 'duplicate' || result.outcome === 'overlap') ? result.b : result.a;
    var target = inputForFrame(namedFrame || 1);
    if (target) { setFieldError(target, copy.message); }
    showToast({ type: 'error', title: copy.title, message: copy.message });
    return false;
  }

  if (addTimeFrameBtn) {
    addTimeFrameBtn.addEventListener('click', function () { addTimeFrameRow(); });
  }

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
  var summaryDateInput = container.querySelector('.msc-summary-date-input');
  var viewModal = container.querySelector('.msc-view-modal');
  /* Scoped to viewModal for the same reason as viewTitle below — Leave
     Detail also has a `.msc-view-color-dot` (with its own "leave"
     modifier class), so an unscoped lookup would be one stray markup
     reorder away from grabbing the wrong dot. */
  var viewColorDot = viewModal.querySelector('.msc-view-color-dot');
  /* Scoped to viewModal (not container) — the toolbar-alignment-and-
     close-control task (2026-07-23) gave the Help/Settings popup
     headers the same shared `.msc-view-title` class for their flex:1
     layout treatment, and both of those popups sit earlier in the DOM
     than this Task Detail modal. An unscoped container-wide
     querySelector('.msc-view-title') therefore matched the Help
     popup's static heading first, silently leaving this modal's own
     title element (and therefore the visible Task title) empty on
     every Task Detail open — root cause of the "Task Details does not
     show the Task title" regression fixed by this task. */
  var viewTitle = viewModal.querySelector('.msc-view-title');
  var viewDate = container.querySelector('.msc-view-date');
  var viewTime = container.querySelector('.msc-view-time');
  var viewCategory = container.querySelector('.msc-view-category');
  var viewPriority = container.querySelector('.msc-view-priority');
  var viewNotes = container.querySelector('.msc-view-notes');
  /* Task outcome row (CONFIRMED UNTOUCHED-TASK OUTCOME, 2026-07-24) —
     Task Detail popup only (confirmed display surface); Leave Detail has
     no equivalent element. */
  var viewOutcome = container.querySelector('.msc-view-outcome');
  var viewOutcomeReasonDisplay = container.querySelector('.msc-view-outcome-reason');
  var viewOutcomeUpdatedAt = container.querySelector('.msc-view-outcome-updated-at');
  var viewOutcomeUpdatedBy = container.querySelector('.msc-view-outcome-updated-by');
  var viewOutcomeActions = container.querySelector('.msc-view-outcome-actions');
  var viewOutcomeCompletedBtn = container.querySelector('.msc-view-outcome-completed-btn');
  var viewOutcomeUncompletedBtn = container.querySelector('.msc-view-outcome-uncompleted-btn');
  /* Reason-entry form (FINAL CONFIRMED REASON-TRANSITION RULE, 2026-07-24)
     — revealed only when Mark Uncompleted is clicked; see renderOutcome()/
     the click handlers below. */
  var viewOutcomeReasonForm = container.querySelector('.msc-view-outcome-reason-form');
  var viewOutcomeReasonInput = container.querySelector('.msc-view-outcome-reason-input');
  var viewOutcomeReasonCounter = container.querySelector('.msc-view-outcome-reason-counter');
  var viewOutcomeReasonSubmitBtn = container.querySelector('.msc-view-outcome-reason-submit-btn');
  var viewOutcomeReasonCancelBtn = container.querySelector('.msc-view-outcome-reason-cancel-btn');
  var viewCreatedAt = container.querySelector('.msc-view-created-at');
  var viewUpdatedAt = container.querySelector('.msc-view-updated-at');
  var viewClose = container.querySelector('.msc-view-close');
  var viewEditBtn = container.querySelector('.msc-view-edit-btn');
  var viewDeleteBtn = container.querySelector('.msc-view-delete-btn');
  var apiStatusEl = container.querySelector('.msc-api-status');
  var viewSwitcherBtns = container.querySelectorAll('.msc-view-btn');
  /* Dropdown restored (toolbar-follow-up task, 2026-07-23) — same role
     in setMode() below (hidden in Tasks mode) as every prior
     presentation of this control. */
  var viewSwitcherEl = container.querySelector('.msc-view-dropdown');
  var viewDropdownTrigger = container.querySelector('.msc-view-dropdown-trigger');
  var viewDropdownMenu = container.querySelector('.msc-view-dropdown-menu');
  var viewDropdownLabel = container.querySelector('.msc-view-dropdown-label');
  var miniPickerEl = container.querySelector('.msc-mini-picker');
  var weekGridEl = container.querySelector('.msc-week-grid');
  var dayGridEl = container.querySelector('.msc-day-grid');
  var sidebarEl = container.querySelector('.msc-sidebar');
  var sidebarToggleBtn = container.querySelector('.msc-sidebar-toggle');
  var sidebarCreateBtn = container.querySelector('.msc-sidebar-create');

  /* ── Toolbar identity/search/help/settings/mode-switch refs
     (google-calendar-inspired-toolbar-and-tasks-workspace task,
     2026-07-23) ── */
  var searchTriggerBtn = container.querySelector('.msc-cal-search-trigger');
  var searchPanelEl = container.querySelector('.msc-cal-search-panel');
  var searchInputEl = container.querySelector('.msc-cal-search-input');
  var searchClearBtn = container.querySelector('.msc-cal-search-clear');
  var searchResultsEl = container.querySelector('.msc-cal-search-results');
  var helpTriggerBtn = container.querySelector('.msc-cal-help-trigger');
  var helpPopupOverlay = container.querySelector('.msc-cal-help-popup');
  var helpPopupClose = container.querySelector('.msc-cal-help-close');
  /* Scroll-position reset target (calendar-help-user-guide-popup live-
     review follow-up, 2026-07-27) — same root cause as
     resetCreatePopupScroll() below: nothing ever reset this popup's own
     scrollTop, which was harmless while the old short help card never
     needed to scroll. The new twelve-topic guide does scroll, so a
     scrollTop left over from a previous open (e.g. the user had
     scrolled down to a later section) combined with the sticky header
     made older content appear to float above/through the title on
     reopen — see openHelpPopup() below. */
  var helpPopupCard = helpPopupOverlay ? helpPopupOverlay.querySelector('.msc-modal') : null;
  var settingsTriggerBtn = container.querySelector('.msc-cal-settings-trigger');
  var settingsPopupOverlay = container.querySelector('.msc-cal-settings-popup');
  var settingsPopupClose = container.querySelector('.msc-cal-settings-close');
  var settingsSidebarToggleInput = container.querySelector('.msc-cal-settings-sidebar-toggle');
  var exportTriggerBtn = container.querySelector('.msc-cal-export-trigger');
  var modeSwitchBtns = container.querySelectorAll('.msc-cal-mode-btn');
  var calendarMainEl = container.querySelector('.msc-calendar-main');
  var tasksMainEl = container.querySelector('.msc-tasks-main');
  var tasksAddBtn = container.querySelector('.msc-tasks-add-btn');
  var tasksListEl = container.querySelector('.msc-tasks-list');
  var tasksEmptyEl = container.querySelector('.msc-tasks-empty');
  var tasksLoadingEl = container.querySelector('.msc-tasks-loading');
  var tasksErrorEl = container.querySelector('.msc-tasks-error');
  var tasksCountEl = container.querySelector('.msc-tasks-count');
  var tasksDateInput = container.querySelector('.msc-tasks-date-input');
  var summarySectionEl = container.querySelector('.msc-summary-section');
  var priorityCardEl = container.querySelector('.msc-list-card');

  /* ── Unified Create dialog (Task/Leave tabs, 2026-07-23
     google-inspired-task-leave-popup-ui task) — one shared overlay for
     both Task and Leave create/edit forms, replacing the former
     separate .msc-task-popup/.msc-leave-popup overlays and the
     .msc-create-menu chooser. taskPopupOverlay/leavePopupOverlay and
     taskPopupClose/leavePopupClose are kept as aliases of the one
     overlay/close button below so every existing call site further down
     this file (openTaskPopup/closeTaskPopup/openLeavePopup/
     closeLeavePopup, trapPopupTab(taskPopupOverlay, ...), etc.) keeps
     working unchanged. ── */
  var createWrapEl = container.querySelector('.msc-create-wrap');
  var createPopupOverlay = container.querySelector('.msc-create-popup');
  /* The actual scrolling element (.msc-modal-form, overflow-y:auto —
     calendar.css) — .msc-modal-form-head (title/Close button) is
     position:sticky/top:0 WITHIN this same element, so its scrollTop is
     what determines whether the sticky header ends up overlapping tabs/
     TASK 1 or sitting cleanly above them (bulk-tasks-modal-scroll-and-
     first-row-alignment task, 2026-07-24). Reset via
     resetCreatePopupScroll() below on every open/tab-switch. */
  var createPopupCard = createPopupOverlay.querySelector('.msc-modal');
  var createPopupClose = container.querySelector('.msc-create-popup-close');
  var createPopupHeading = container.querySelector('.msc-create-popup-heading');
  var createTabsEl = container.querySelector('.msc-create-tabs');
  var createTabTaskBtn = container.querySelector('.msc-create-tab-task');
  var createTabLeaveBtn = container.querySelector('.msc-create-tab-leave');
  var createTabBulkBtn = container.querySelector('.msc-create-tab-bulk');
  var createTaskFieldsEl = container.querySelector('.msc-create-task-fields');
  var createLeaveFieldsEl = container.querySelector('.msc-create-leave-fields');
  var createBulkFieldsEl = container.querySelector('.msc-create-bulk-fields');
  var createTaskFooterEl = container.querySelector('.msc-create-task-footer');
  var createLeaveFooterEl = container.querySelector('.msc-create-leave-footer');
  var createBulkFooterEl = container.querySelector('.msc-create-bulk-footer');
  var taskPopupOverlay = createPopupOverlay;
  var taskPopupClose = createPopupClose;
  var taskPopupStatusEl = container.querySelector('.msc-task-popup-status');
  var leavePopupOverlay = createPopupOverlay;
  var leavePopupClose = createPopupClose;

  /* ── Same-day Bulk Tasks (2026-07-23) scoped refs — bulkFieldDate/
     bulkLeaveBlockedNote (the former single common Date field/note) were
     removed by the confirmed-add-row-date-rule task, 2026-07-24; each row
     now owns its own Date input and leave-blocked note (see
     bulkRowMarkup() below). ── */
  var bulkFormEl = container.querySelector('.msc-bulk-form');
  var bulkRowsEl = container.querySelector('.msc-bulk-rows');
  var bulkAddRowBtn = container.querySelector('.msc-bulk-add-row-btn');
  var bulkCreateBtn = container.querySelector('.msc-bulk-create-btn');
  var bulkCancelBtn = container.querySelector('.msc-bulk-cancel-btn');
  var bulkPopupStatusEl = container.querySelector('.msc-bulk-popup-status');
  var bulkOccurrenceSummaryEl = container.querySelector('.msc-bulk-occurrence-summary');
  if (bulkFormEl) { bulkFormEl.addEventListener('submit', function (e) { e.preventDefault(); }); }

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
  /* Points at the one shared .msc-create-popup-heading (unified Create
     dialog, 2026-07-23 task) — setLeavePopupMode() below still writes
     'Edit leave'/'Create Leave' into it exactly as before; that text is
     only visible while the Leave tab is active (setCreateDialogTab()
     overwrites it with 'Create Task' when the Task tab is selected). */
  var leavePopupHeading = createPopupHeading;
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

  /* Shared by the toolbar toggle button below and the Settings popup's
     "Show sidebar by default" checkbox (Step 6, google-calendar-
     inspired-toolbar-and-tasks-workspace task, 2026-07-23) — one place
     applies the collapsed/expanded state so both controls always agree. */
  function applySidebarCollapsed(collapsed) {
    sidebarCollapsed = collapsed;
    if (sidebarCollapsed && sidebarEl.contains(document.activeElement)) {
      sidebarToggleBtn.focus();
    }
    sidebarEl.classList.toggle('collapsed', sidebarCollapsed);
    sidebarToggleBtn.setAttribute('aria-expanded', sidebarCollapsed ? 'false' : 'true');
    if (settingsSidebarToggleInput) { settingsSidebarToggleInput.checked = !sidebarCollapsed; }
    /* Reposition the "+N more" Task list if it's open (Step 12,
       calendar-popup-close-time-validation-task-list-return task,
       2026-07-22) — collapsing/expanding this calendar's own sidebar can
       shift where the anchor chip/cell sits. Immediate call handles an
       instant layout change; the delayed one covers the CSS collapse
       transition (.2s, calendar.css) finishing after that. */
    repositionMorePopupIfOpen();
    setTimeout(repositionMorePopupIfOpen, 220);
  }

  sidebarToggleBtn.addEventListener('click', function () {
    applySidebarCollapsed(!sidebarCollapsed);
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

  /* ── Unified Create dialog (Task/Leave tabs, 2026-07-23
     google-inspired-task-leave-popup-ui task) — replaces the former
     "+ Create" chooser dropdown (openCreateMenu/closeCreateMenu) and the
     two separate Task/Leave popups with ONE Google-Calendar-inspired
     dialog. sidebarCreateBtn, openCreateChoiceFromCalendar() (blank-cell
     clicks), and the Tasks-workspace "Add a task" button now open this
     dialog directly — no intermediate chooser step — per Image B
     ("replace the current small menu presentation with the more
     polished anchored dialog experience"). Every existing Task/Leave
     field, validation rule, and API call is untouched; only the DOM
     shell and open/close orchestration changed. */
  var activeCreateTab = 'task';

  /* Delegates to the shared ui/popup.js trap (Phase 1 professional-UX-
     feedback task, 2026-07-22) — same overlayEl-then-".msc-modal"
     resolution the former local implementation used, so every existing
     call site (unchanged below) keeps its exact prior Tab behavior. */
  function trapPopupTab(overlayEl, e) {
    trapTab(overlayEl.querySelector('.msc-modal'), e);
  }

  /* Switches which field-set/footer is visible inside the one shared
     dialog — never submits anything, never touches state.editingId/
     editingLeaveId. The clicked date is carried across so choosing the
     other tab doesn't lose what the user already picked (brief: "Switching
     type must preserve the selected date"); every other field keeps
     whatever value it already had (each tab's fields are never cleared by
     a tab switch — only Create/blank-cell entry points reset them, via
     cancelEdit()/cancelLeaveEdit(), exactly as before). */
  /* Screenshot-derived defect fix (bulk-tasks-modal-scroll-and-first-row-
     alignment task, 2026-07-24) — root cause was that nothing ever reset
     .msc-modal-form's own scrollTop back to 0 on open or on tab-switch.
     .msc-modal-form-head is position:sticky/top:0 INSIDE that same
     scrolling element (calendar.css), so a stale scrollTop left over from
     a previous tab/session (e.g. scrolled down while the longer Task tab
     was active, or a prior Bulk Tasks session) meant the sticky header
     visually pinned itself over whatever content NOW happened to sit at
     that same offset in the freshly-shown tab — clipping the tabs and the
     top of TASK 1 behind the header, exactly as in the reported
     screenshot, even though nothing was actually wrong with TASK 1's own
     markup/CSS. This does not touch entered field values — only the
     scroll position of the modal card itself. */
  function resetCreatePopupScroll() {
    if (createPopupCard) { createPopupCard.scrollTop = 0; }
  }

  /* kind: 'task' | 'bulk' | 'leave' (same-day-bulk-task-creation task,
     2026-07-23 added 'bulk' as a third state alongside the pre-existing
     'task'/'leave' pair — every existing 'task'/'leave' branch below is
     unchanged, only extended to also check for 'bulk'). */
  function setCreateDialogTab(kind) {
    var isTask = kind === 'task';
    var isBulk = kind === 'bulk';
    var isLeave = !isTask && !isBulk;
    activeCreateTab = isTask ? 'task' : (isBulk ? 'bulk' : 'leave');
    if (createTaskFieldsEl) { createTaskFieldsEl.hidden = !isTask; }
    if (createBulkFieldsEl) { createBulkFieldsEl.hidden = !isBulk; }
    if (createLeaveFieldsEl) { createLeaveFieldsEl.hidden = !isLeave; }
    if (createTaskFooterEl) { createTaskFooterEl.style.display = isTask ? '' : 'none'; }
    if (createBulkFooterEl) { createBulkFooterEl.style.display = isBulk ? '' : 'none'; }
    if (createLeaveFooterEl) { createLeaveFooterEl.style.display = isLeave ? '' : 'none'; }
    if (createTabTaskBtn) {
      createTabTaskBtn.classList.toggle('active', isTask);
      createTabTaskBtn.setAttribute('aria-selected', isTask ? 'true' : 'false');
    }
    if (createTabBulkBtn) {
      createTabBulkBtn.classList.toggle('active', isBulk);
      createTabBulkBtn.setAttribute('aria-selected', isBulk ? 'true' : 'false');
    }
    if (createTabLeaveBtn) {
      createTabLeaveBtn.classList.toggle('active', isLeave);
      createTabLeaveBtn.setAttribute('aria-selected', isLeave ? 'true' : 'false');
    }
    if (createPopupHeading) {
      /* Task heading is a static "Create" (dialog-text-removal task,
         2026-07-23 — the Task/Bulk Tasks/Leave tabs already disambiguate
         the type, so the heading no longer repeats it). Leave's dynamic
         Create/Edit heading is set by setLeavePopupMode() below and is
         only ever meaningful while this tab is the active one. Bulk Tasks
         has no edit mode (Bulk Tasks only ever creates), so its heading
         is a static string matching the approved Step 16 form header. */
      createPopupHeading.textContent = isTask
        ? 'Create'
        : (isBulk ? 'Create multiple tasks' : (editingLeaveId ? 'Edit leave' : 'Create Leave'));
    }
    /* Every open (openCreatePopup calls this first) and every tab switch
       funnels through here — one single place resets scroll position, so
       there is no separate "reset on open" vs. "reset on tab switch" path
       to keep in sync. */
    resetCreatePopupScroll();
  }

  if (createTabTaskBtn) {
    createTabTaskBtn.addEventListener('click', function () {
      if (activeCreateTab === 'task') { return; }
      var dateVal = activeCreateTab === 'bulk' ? firstBulkRowDate() : leaveFieldStartDate.value;
      setCreateDialogTab('task');
      if (dateVal && !fieldDate.value) { fieldDate.value = dateVal; }
      if (fieldTitle && fieldTitle.focus) { fieldTitle.focus(); }
    });
  }
  if (createTabBulkBtn) {
    createTabBulkBtn.addEventListener('click', function () {
      if (activeCreateTab === 'bulk') { return; }
      /* CONFIRMED ADD-ROW DATE RULE (2026-07-24) rules 1/2 — the entry-
         point default date (whatever the Task/Leave tab's date field
         already held — the clicked Calendar date, or the preserved
         main-entry default) only ever seeds a BRAND NEW row list. Once
         rows already exist (the user already switched to this tab once
         this dialog session), their own dates are left exactly as the
         user set them — this must never overwrite an in-progress batch. */
      var dateVal = activeCreateTab === 'task' ? fieldDate.value : leaveFieldStartDate.value;
      setCreateDialogTab('bulk');
      ensureBulkMinimumRows(dateVal);
      updateBulkCreateButtonGate();
      var firstDateEl = firstBulkRowDateEl();
      if (firstDateEl && firstDateEl.focus) { firstDateEl.focus(); }
    });
  }
  if (createTabLeaveBtn) {
    createTabLeaveBtn.addEventListener('click', function () {
      if (activeCreateTab === 'leave') { return; }
      var dateVal = activeCreateTab === 'bulk' ? firstBulkRowDate() : fieldDate.value;
      setCreateDialogTab('leave');
      if (dateVal && !leaveFieldStartDate.value) { leaveFieldStartDate.value = dateVal; }
      if (leaveFieldType && leaveFieldType.focus) { leaveFieldType.focus(); }
    });
  }

  function onCreatePopupKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); closeCreatePopup(); }
    else if (e.key === 'Tab') { trapPopupTab(createPopupOverlay, e); }
  }

  /* Calendar member-token authorization — cross-member pre-block
     (2026-07-31 UX correction): openCreatePopup(kind) is the ONE shared
     entry point for Task create, Bulk Task create, Task edit-open, Leave
     create, and Leave edit-open (editItem()/editLeaveItem() below both
     call it via the openTaskPopup()/openLeavePopup() aliases) — gating
     it here covers all five without a separate check at every one of
     those call sites. guardMutationAccess (calendar/auth.js) runs BEFORE
     the popup ever opens: with no token stored it opens "Authorize this
     browser" first (this IS "stop before opening the final mutation
     action"); with a token for a different member than this instance's
     own memberKey, it shows the cross-member alert and resolves false —
     the popup is never opened and no request is ever sent either way.
     No busy/"Saving…" state is involved here — opening a popup was never
     a network operation, unlike the Save/Delete/Outcome flows below. */
  function openCreatePopup(kind) {
    guardMutationAccess(memberKey).then(function (allowed) {
      if (allowed) { openCreatePopupInner(kind); }
    });
  }

  /* kind: 'task' | 'leave'. Tabs are hidden while editing an existing
     record (state.editingId for Task, editingLeaveId for Leave — both
     are already set by editItem()/editLeaveItem() before they call
     openTaskPopup()/openLeavePopup(), which alias to openCreatePopup
     above) since an existing item's fundamental type isn't switchable —
     matches the pre-existing behavior (there was never a way to turn a
     Task into a Leave record or vice versa). */
  function openCreatePopupInner(kind) {
    var alreadyOpen = createPopupOverlay.classList.contains('show');
    /* Bulk Tasks never has an edit mode (it only ever creates), so
       `editing` is always false for kind === 'bulk' — the tabs stay
       visible exactly like a fresh Task/Leave create. */
    var editing = kind === 'task' ? !!state.editingId : (kind === 'leave' && !!editingLeaveId);
    setCreateDialogTab(kind);
    if (createTabsEl) { createTabsEl.hidden = editing; }
    createPopupOverlay.classList.add('show');
    /* Belt-and-braces alongside the reset already inside
       setCreateDialogTab() above — that call runs while the overlay is
       still display:none (before .show is added here), and some browsers
       are inconsistent about whether a scrollTop assignment on a hidden
       element is retained once it becomes visible. Re-asserting it here,
       now that the card actually has layout, guarantees the dialog always
       opens at the top regardless of that. */
    resetCreatePopupScroll();
    /* Modal background scroll lock (popup-detail-close-and-scroll-
       containment task, 2026-07-23) — this is a true centered modal
       (full-screen overlay), so the background page must not scroll
       while it's open. Guarded by alreadyOpen so switching the Task/
       Bulk/Leave tab on an already-open dialog (which re-enters this
       function) never double-locks. */
    if (!alreadyOpen) { lockBodyScroll(); }
    createPopupOverlay.addEventListener('keydown', onCreatePopupKeydown);
    if (kind === 'bulk') {
      ensureBulkMinimumRows(fieldDate.value);
      updateBulkCreateButtonGate();
    }
    var focusEl = kind === 'task' ? fieldTitle : (kind === 'bulk' ? firstBulkRowDateEl() : leaveFieldType);
    if (focusEl && focusEl.focus) { focusEl.focus(); }
  }

  function openBulkTasksPopup() { openCreatePopup('bulk'); }

  function closeCreatePopup() {
    var wasOpen = createPopupOverlay.classList.contains('show');
    createPopupOverlay.classList.remove('show');
    if (wasOpen) { unlockBodyScroll(); }
    createPopupOverlay.removeEventListener('keydown', onCreatePopupKeydown);
    if (sidebarCreateBtn && sidebarCreateBtn.focus) { sidebarCreateBtn.focus(); }
  }

  /* Thin aliases (unchanged names/call sites) — see the refs comment
     above for why these exist rather than rewriting every call site. */
  function openTaskPopup() { openCreatePopup('task'); }
  function closeTaskPopup() { closeCreatePopup(); }
  function openLeavePopup() { openCreatePopup('leave'); }
  function closeLeavePopup() { closeCreatePopup(); }

  if (createPopupClose) { createPopupClose.addEventListener('click', closeCreatePopup); }
  createPopupOverlay.addEventListener('click', function (e) {
    if (e.target === createPopupOverlay) { closeCreatePopup(); }
  });

  sidebarCreateBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (createPopupOverlay.classList.contains('show')) { closeCreatePopup(); return; }
    cancelEdit();
    cancelLeaveEdit(false);
    openCreatePopup('task');
  });

  /* ── Centralized calendar-origin creation entry point (Step 4,
     2026-07-20 empty-slot-create-and-overlap-rules task; simplified
     2026-07-23 to open the unified Create dialog directly instead of an
     intermediate chooser) — the single helper every empty-area click
     (Month blank cell, Week/Day empty timed slot, Week/Day empty all-day
     area) funnels through. Updates the existing selected-date source of
     truth (selectDate — the same function the mini-picker/Today
     button/etc. already call), prefills a clicked time into both the
     Task and Leave forms' start/end time fields only when a timed slot
     was actually clicked, then opens the Create dialog on the Task tab
     (brief: "Default selected type: Task ... Selected date must be
     prefilled"). opts.resolveAnchor is accepted for call-site
     compatibility but no longer used — the dialog is a centered modal,
     not an anchored popover, so it has nothing to position against. */
  function openCreateChoiceFromCalendar(opts) {
    var dateKey = opts.dateKey;
    var allDay = !!opts.allDay;
    var startTime = allDay ? null : (opts.startTime || null);
    var endTime = allDay ? null : (opts.endTime || null);

    /* Full-day-leave-blocks-create task (2026-07-23) — a blank-area click
       on a date that is fully covered by Full-Day or Multi-Day leave must
       not open the Create dialog at all (superseding the earlier "always
       open, let the backend reject" rule). This only cancels the popup;
       it never touches the backend conflict check that still governs any
       Create dialog opened from elsewhere (e.g. the sidebar Create
       button before a date is chosen). */
    if (isDateFullyLeaveBlocked(dateKey)) {
      showToast({
        type: 'information',
        title: 'Full-day leave scheduled',
        message: 'No new Task or Leave can be added on this date.'
      });
      return;
    }

    selectDate(dateKey);
    cancelLeaveEdit(false);
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
    openCreatePopup('task');
  }

  /* ── Calendar help popup (Step 6, google-calendar-inspired-toolbar-
     and-tasks-workspace task, 2026-07-23) — same centered-modal open/
     close/focus-trap convention as the Task popup above (classList
     'show', trapPopupTab, Escape, backdrop click, focus return). */
  function onHelpPopupKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); closeHelpPopup(); }
    else if (e.key === 'Tab') { trapPopupTab(helpPopupOverlay, e); }
  }
  function openHelpPopup() {
    if (!helpPopupOverlay) { return; }
    /* One-active-popover rule — opening this popover closes the other
       toolbar popovers first (Search, Settings, and the Month/Week/Day
       dropdown). */
    closeSearchPanel();
    closeSettingsPopup();
    closeViewDropdown();
    helpPopupOverlay.classList.add('show');
    /* Reset to the top on every open (live-review follow-up, 2026-07-27)
       — must run after adding 'show' above, since scrollTop is a no-op
       on a display:none element; see helpPopupCard's own comment above
       for why this was needed once the guide grew tall enough to
       actually scroll. */
    if (helpPopupCard) { helpPopupCard.scrollTop = 0; }
    /* True modal (full-screen backdrop) — locks the background page
       (popup-detail-close-and-scroll-containment task, 2026-07-23). */
    lockBodyScroll();
    helpPopupOverlay.addEventListener('keydown', onHelpPopupKeydown);
    if (helpPopupClose && helpPopupClose.focus) { helpPopupClose.focus(); }
  }
  function closeHelpPopup() {
    if (!helpPopupOverlay) { return; }
    var wasOpen = helpPopupOverlay.classList.contains('show');
    helpPopupOverlay.classList.remove('show');
    if (wasOpen) { unlockBodyScroll(); }
    helpPopupOverlay.removeEventListener('keydown', onHelpPopupKeydown);
    if (helpTriggerBtn && helpTriggerBtn.focus) { helpTriggerBtn.focus(); }
  }
  if (helpTriggerBtn) { helpTriggerBtn.addEventListener('click', openHelpPopup); }
  if (helpPopupClose) { helpPopupClose.addEventListener('click', closeHelpPopup); }
  if (helpPopupOverlay) {
    helpPopupOverlay.addEventListener('click', function (e) {
      if (e.target === helpPopupOverlay) { closeHelpPopup(); }
    });
  }

  /* ── Calendar settings popup (Step 6) — presentation-only. The single
     control (sidebar default) mirrors applySidebarCollapsed() above, so
     the toolbar toggle button and this checkbox can never disagree. */
  function onSettingsPopupKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); closeSettingsPopup(); }
    else if (e.key === 'Tab') { trapPopupTab(settingsPopupOverlay, e); }
  }
  function openSettingsPopup() {
    if (!settingsPopupOverlay) { return; }
    /* One-active-popover rule — see openHelpPopup() above. */
    closeSearchPanel();
    closeHelpPopup();
    closeViewDropdown();
    if (settingsSidebarToggleInput) { settingsSidebarToggleInput.checked = !sidebarCollapsed; }
    settingsPopupOverlay.classList.add('show');
    /* True modal — locks the background page (see openHelpPopup() above). */
    lockBodyScroll();
    settingsPopupOverlay.addEventListener('keydown', onSettingsPopupKeydown);
    if (settingsSidebarToggleInput && settingsSidebarToggleInput.focus) { settingsSidebarToggleInput.focus(); }
  }
  function closeSettingsPopup() {
    if (!settingsPopupOverlay) { return; }
    var wasOpen = settingsPopupOverlay.classList.contains('show');
    settingsPopupOverlay.classList.remove('show');
    if (wasOpen) { unlockBodyScroll(); }
    settingsPopupOverlay.removeEventListener('keydown', onSettingsPopupKeydown);
    if (settingsTriggerBtn && settingsTriggerBtn.focus) { settingsTriggerBtn.focus(); }
  }
  if (settingsTriggerBtn) { settingsTriggerBtn.addEventListener('click', openSettingsPopup); }
  if (settingsPopupClose) { settingsPopupClose.addEventListener('click', closeSettingsPopup); }
  if (settingsPopupOverlay) {
    settingsPopupOverlay.addEventListener('click', function (e) {
      if (e.target === settingsPopupOverlay) { closeSettingsPopup(); }
    });
  }
  if (settingsSidebarToggleInput) {
    settingsSidebarToggleInput.addEventListener('change', function () {
      applySidebarCollapsed(!settingsSidebarToggleInput.checked);
    });
  }

  /* ── Weekly schedule .xlsx download (member-weekly-schedule-xlsx-export
     task, 2026-07-24) — a point-in-time export of this member's Tasks and
     Leave for the Monday-Sunday week containing the manually selected
     Calendar date (state.selectedDate, only once
     state.dateManuallySelected is true — see that field's docstring
     above). Never substitutes today, the visible Calendar month/week, the
     My Tasks date, or the Schedule Summary date. Generation is entirely
     backend-owned (openpyxl, backend/xlsx_export.py) — this only decides
     the target week, requests the file, and triggers the browser
     download; it never builds a workbook or recomputes Schedule Summary
     figures itself. exportInFlight is a plain-boolean duplicate-click
     guard, the same two-layer pattern (flag + the button's own `disabled`)
     Bulk Tasks already uses (see bulkSubmitInFlight above) — the shared
     setButtonBusy() helper (ui/loading.js) is NOT used here because it
     replaces the button's innerHTML with a text label and, on restore,
     writes back button.textContent — which is empty for this icon-only
     button (no text node, only an inline <svg>) and would permanently
     wipe the icon after the first download. setExportButtonBusy() below
     only toggles `disabled`/aria-busy/a CSS class instead, so the SVG
     itself is never touched. */
  var exportInFlight = false;
  function setExportButtonBusy(isBusy) {
    if (!exportTriggerBtn) { return; }
    exportTriggerBtn.disabled = !!isBusy;
    exportTriggerBtn.classList.toggle('msc-cal-export-busy', !!isBusy);
    if (isBusy) { exportTriggerBtn.setAttribute('aria-busy', 'true'); }
    else { exportTriggerBtn.removeAttribute('aria-busy'); }
  }
  function downloadWeeklySchedule() {
    if (exportInFlight) { return; }

    if (!state.dateManuallySelected || !state.selectedDate) {
      showToast({
        type: 'information', title: 'Select a date',
        message: 'Select a date in the Calendar before downloading the weekly schedule.'
      });
      return;
    }

    var selected = parseDateStr(state.selectedDate);
    var monday = getReportWeekStart(selected);
    var sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    exportInFlight = true;
    setExportButtonBusy(true);

    var weekStartStr = toDateStr(monday);
    fetch(apiBase + '/reports/weekly/export?week_start=' + encodeURIComponent(weekStartStr))
      .then(function (res) {
        if (!res.ok) { throw new Error('export_request_failed'); }
        var contentType = res.headers.get('Content-Type') || '';
        if (contentType.indexOf('application/json') !== -1) {
          return res.json().then(function (body) { return { empty: true, body: body }; });
        }
        return res.blob().then(function (blob) { return { empty: false, blob: blob }; });
      })
      .then(function (result) {
        if (result.empty) {
          showToast({
            type: 'information', title: 'No schedule found',
            message: 'There are no Tasks or Leave for the selected week.'
          });
          return;
        }
        var mondayLabel = formatDDMMYYYY(monday);
        var sundayLabel = formatDDMMYYYY(sunday);
        var filename = mondayLabel + '_to_' + sundayLabel + '_' + memberKey + '_weekly_schedule.xlsx';
        var blobUrl = URL.createObjectURL(result.blob);
        var link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        showToast({
          type: 'success', title: 'Weekly schedule downloaded',
          message: 'The schedule for ' + mondayLabel + ' to ' + sundayLabel + ' was downloaded.'
        });
      })
      .catch(function () {
        showToast({
          type: 'error', title: 'Download failed',
          message: 'The weekly schedule could not be downloaded. Please try again.'
        });
      })
      .then(function () {
        exportInFlight = false;
        setExportButtonBusy(false);
      });
  }
  if (exportTriggerBtn) { exportTriggerBtn.addEventListener('click', downloadWeeklySchedule); }

  /* ── Calendar-scoped search (Step 6) — anchored popover, same
     position:fixed + viewport-clamp + capture-phase outside-click
     technique as positionMorePopup()/openMorePopup() below. Filters
     this instance's own already-loaded `items`/`leaveItems` closures
     only (member-isolated by construction — there is no cross-instance
     state to leak) — no extra request, no database write. */
  var searchOpen = false;
  function positionSearchPanel() {
    if (!searchTriggerBtn || !searchPanelEl) { return; }
    var rect = searchTriggerBtn.getBoundingClientRect();
    var panelWidth = searchPanelEl.offsetWidth || 340;
    var left = rect.right - panelWidth;
    if (left < 8) { left = 8; }
    if (left + panelWidth > window.innerWidth - 8) { left = Math.max(8, window.innerWidth - panelWidth - 8); }
    var top = rect.bottom + 6;
    searchPanelEl.style.position = 'fixed';
    searchPanelEl.style.top = top + 'px';
    searchPanelEl.style.left = left + 'px';
  }
  function renderSearchResults(query) {
    var q = query.trim().toLowerCase();
    if (!q) {
      searchResultsEl.innerHTML = '<p class="msc-cal-search-empty">Start typing to search this calendar’s Tasks and Leave.</p>';
      return;
    }
    var taskMatches = items.filter(function (it) {
      return it.title && it.title.toLowerCase().indexOf(q) !== -1;
    }).slice(0, 12);
    var leaveMatches = leaveItems.filter(function (lv) {
      var label = formatLeaveCalendarLabel(lv);
      return label && label.toLowerCase().indexOf(q) !== -1;
    }).slice(0, 8);
    if (!taskMatches.length && !leaveMatches.length) {
      searchResultsEl.innerHTML = '<p class="msc-cal-search-empty">No Tasks or Leave match &ldquo;' +
        escapeHtml(query.trim()) + '&rdquo;.</p>';
      return;
    }
    var html = '';
    taskMatches.forEach(function (it) {
      html += '<button type="button" class="msc-cal-search-result" role="option" data-kind="task" data-id="' + it.id + '">' +
        '<span>' + escapeHtml(it.title) + '</span>' +
        '<span class="msc-cal-search-result-meta">' + escapeHtml(it.category) + ' — ' + escapeHtml(it.date) +
        (it.start ? ' ' + escapeHtml(it.start) : '') + '</span></button>';
    });
    leaveMatches.forEach(function (lv) {
      html += '<button type="button" class="msc-cal-search-result" role="option" data-kind="leave" data-id="' + lv.id + '">' +
        '<span>' + escapeHtml(formatLeaveCalendarLabel(lv)) + '</span>' +
        '<span class="msc-cal-search-result-meta">Leave — ' + escapeHtml(lv.start_date) + '</span></button>';
    });
    searchResultsEl.innerHTML = html;
    searchResultsEl.querySelectorAll('.msc-cal-search-result').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var kind = btn.getAttribute('data-kind');
        var id = btn.getAttribute('data-id');
        closeSearchPanel();
        if (kind === 'task') { viewItem(id, searchTriggerBtn); } else { viewLeaveItem(id, searchTriggerBtn); }
      });
    });
  }
  function onDocClickForSearch(e) {
    if (searchTriggerBtn && searchTriggerBtn.contains(e.target)) { return; }
    if (searchPanelEl && searchPanelEl.contains(e.target)) { return; }
    closeSearchPanel();
  }
  function onSearchKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); closeSearchPanel(searchTriggerBtn); }
  }
  function openSearchPanel() {
    if (searchOpen || !searchPanelEl) { return; }
    /* One-active-popover rule — see openHelpPopup() above. */
    closeHelpPopup();
    closeSettingsPopup();
    closeViewDropdown();
    searchOpen = true;
    searchPanelEl.hidden = false;
    positionSearchPanel();
    searchTriggerBtn.setAttribute('aria-expanded', 'true');
    renderSearchResults(searchInputEl.value || '');
    document.addEventListener('click', onDocClickForSearch, true);
    document.addEventListener('keydown', onSearchKeydown, true);
    if (searchInputEl && searchInputEl.focus) { searchInputEl.focus(); }
  }
  function closeSearchPanel(focusTarget) {
    if (!searchOpen || !searchPanelEl) { return; }
    searchOpen = false;
    searchPanelEl.hidden = true;
    searchTriggerBtn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onDocClickForSearch, true);
    document.removeEventListener('keydown', onSearchKeydown, true);
    if (focusTarget && typeof focusTarget.focus === 'function') { returnFocus(focusTarget); }
  }
  if (searchTriggerBtn) {
    searchTriggerBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (searchOpen) { closeSearchPanel(); } else { openSearchPanel(); }
    });
  }
  if (searchInputEl) {
    searchInputEl.addEventListener('input', function () {
      if (searchClearBtn) { searchClearBtn.hidden = !searchInputEl.value; }
      renderSearchResults(searchInputEl.value);
    });
  }
  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', function () {
      searchInputEl.value = '';
      searchClearBtn.hidden = true;
      renderSearchResults('');
      searchInputEl.focus();
    });
  }

  /* ── Closing every toolbar popover this instance owns (one-active-
     popover rule) — used on Calendar/Tasks mode change, and on the
     cross-instance 'msc:close-toolbar-popovers' event dispatched by
     navigation.js whenever the user switches member tab or app section
     (each of the 5 mounted calendar instances listens for this event
     independently, so switching away from a member never leaves that
     member's popover open behind the newly shown tab). Month/Week/Day
     is handled separately (closeViewDropdown(), called directly by the
     view-switcher click handler) since it is also closed whenever this
     runs — included here too so mode-switch and cross-instance events
     close it as well. ── */
  function closeAllOwnPopovers() {
    closeSearchPanel();
    closeHelpPopup();
    closeSettingsPopup();
    closeViewDropdown();
  }
  document.addEventListener('msc:close-toolbar-popovers', closeAllOwnPopovers);

  /* Shared outcome-status -> badge-class mapping (live UI/UX feedback,
     2026-07-24) — the single source both renderTasksWorkspace() (row
     badges) and renderOutcome() (Task Details badge) read, so the same
     status always gets the same color wherever it's shown. Reuses the
     existing generic .badge/.badge-* system (components.css) — no new
     badge visual language. Pure/stateless; classifies an already-derived
     status string, never decides Pending/No response itself. */
  function outcomeStatusBadgeClass(status) {
    if (status === 'Completed') { return 'badge-pass'; }
    if (status === 'Uncompleted') { return 'badge-amber'; }
    if (status === 'No response') { return 'badge-viewonly'; }
    return 'badge-pending';
  }

  /* ── Tasks workspace ("My Tasks", FINAL BUSINESS RULES closure review,
     2026-07-24) — scoped to exactly one date at a time (state.tasksDate),
     never the full `items` history. Reads the SAME `items` closure
     Month/Week/Day already read (never a second Task truth, never a
     separate fetch) and filters with itemsForDate() — the same date-
     filter helper the Calendar's own day cells already use, so "only the
     exact selected date" can never drift from how Calendar itself decides
     which Tasks belong to a given day.

     dateRelation is computed once per render (every row in this list
     shares state.tasksDate, so "is this date in the future/past/today"
     is a property of the WHOLE render, not of any individual row):
       - 'future': Rule 3 — no outcome exists yet or can be set; every
         row's outcome cell reads "Available on the Task date" rather than
         the technically-true-but-misleading 'Pending' label.
       - 'past': Rule 4 — an unset outcome reads 'No response'
         (it.outcome_status already derives this server-side); a
         previously recorded Completed/Uncompleted value is still shown,
         read-only (no action affordance lives in this row — that's Task
         Details, which independently disables its own buttons via
         outcome_locked).
       - 'today': the task's own actionable date — real-time
         Pending/Completed/Uncompleted status.
     Timestamp/actor/reason detail lines use only already-computed
     backend-authoritative fields (it.outcome_updated_at via the existing
     formatTaskTimestamp() Asia/Colombo converter, it.outcome_updated_by,
     it.outcome_reason) — nothing here generates a timestamp or actor. */
  function renderTasksWorkspace() {
    if (!tasksListEl) { return; }
    var dateStr = state.tasksDate || getColomboTodayStr();
    var todayStr = getColomboTodayStr();
    var dateRelation = dateStr < todayStr ? 'past' : (dateStr > todayStr ? 'future' : 'today');
    var sorted = itemsForDate(dateStr).slice().sort(function (a, b) {
      var at = a.start || '99:99', bt = b.start || '99:99';
      return at < bt ? -1 : (at > bt ? 1 : 0);
    });
    if (tasksCountEl) {
      tasksCountEl.textContent = sorted.length ? (sorted.length + (sorted.length === 1 ? ' task' : ' tasks')) : '';
    }
    if (tasksLoadingEl) { tasksLoadingEl.hidden = true; }
    if (tasksErrorEl) { tasksErrorEl.hidden = true; }
    if (!sorted.length) {
      if (tasksEmptyEl) { tasksEmptyEl.hidden = false; }
      tasksListEl.innerHTML = '';
      return;
    }
    if (tasksEmptyEl) { tasksEmptyEl.hidden = true; }
    var html = '';
    sorted.forEach(function (it) {
      var catClass = CATEGORY_CLASS[it.category] || 'task';
      var timeLabel = it.start ? (it.start + (it.end ? '–' + it.end : '')) : 'No time set';

      var outcomeLabel, outcomeBadgeClass;
      if (dateRelation === 'future') {
        outcomeLabel = 'Available on the Task date';
        outcomeBadgeClass = 'badge-viewonly';
      } else {
        var status = it.outcome_status || 'Pending';
        outcomeLabel = status;
        outcomeBadgeClass = outcomeStatusBadgeClass(status);
      }

      var detailParts = [];
      if (dateRelation !== 'future' && (it.outcome === 'Completed' || it.outcome === 'Uncompleted')) {
        detailParts.push(formatTaskTimestamp(it.outcome_updated_at));
        if (it.outcome_updated_by) { detailParts.push(it.outcome_updated_by); }
      }
      if (dateRelation !== 'future' && it.outcome === 'Uncompleted' && it.outcome_reason) {
        detailParts.push('Reason: ' + it.outcome_reason);
      }

      html += '<button type="button" class="msc-tasks-row" role="listitem" data-id="' + it.id + '" ' +
        'aria-label="View task details: ' + escapeHtml(it.title) + '">' +
        '<span class="msc-chip-cat ' + catClass + '" aria-hidden="true"></span>' +
        '<span class="msc-tasks-row-main">' +
        '<span class="msc-tasks-row-title">' + escapeHtml(it.title) + '</span>' +
        '<span class="msc-tasks-row-meta">' + escapeHtml(timeLabel) +
        ' · ' + escapeHtml(it.category) + ' · ' + escapeHtml(it.priority || 'Medium') + '</span>' +
        '<span class="msc-tasks-row-outcome"><span class="badge ' + outcomeBadgeClass + '">' +
        escapeHtml(outcomeLabel) + '</span></span>' +
        (detailParts.length ? '<span class="msc-tasks-row-outcome-detail">' + escapeHtml(detailParts.join(' · ')) + '</span>' : '') +
        '</span></button>';
    });
    tasksListEl.innerHTML = html;
    tasksListEl.querySelectorAll('.msc-tasks-row').forEach(function (row) {
      row.addEventListener('click', function () { viewItem(row.getAttribute('data-id'), row); });
    });
  }

  /* Manual Tasks date selector entry point — mirrors setSummaryDate()'s
     existing pattern exactly (state write + input sync + re-render), kept
     fully independent of state.summaryDate/state.selectedDate per Q6
     (Tasks date, Calendar selection, and Schedule Summary date are three
     separate concerns; changing one must never move another). */
  function setTasksDate(dateStr) {
    if (!isValidDateStr(dateStr)) { return; }
    state.tasksDate = dateStr;
    if (tasksDateInput) { tasksDateInput.value = dateStr; }
    renderTasksWorkspace();
  }

  if (tasksDateInput) {
    tasksDateInput.addEventListener('change', function () { setTasksDate(tasksDateInput.value); });
  }

  if (tasksAddBtn) {
    tasksAddBtn.addEventListener('click', function () {
      /* Step 15: the Tasks workspace has no per-date context (it is not
         scoped to a selected date the way the Calendar side is) — leave
         the Date field genuinely empty instead of silently reusing
         whatever date the Calendar side last had selected, so the user
         must explicitly choose one. The field is already `required`
         (unchanged), so the form cannot be submitted without a date. */
      cancelEdit();
      resetForm();
      fieldDate.value = '';
      selectedDateLabel.textContent = 'select a date';
      openTaskPopup();
    });
  }

  /* ── Calendar/Tasks mode switch (Step 7) — pure show/hide over sibling
     panels, same class-driven-visibility idiom the existing Month/Week/
     Day panes already use (.msc-view-pane/.active), not the native
     `hidden` attribute — .msc-calendar-main already carries its own
     unconditional `display:flex` (calendar.css), which a same-
     specificity `[hidden]` rule cannot reliably override, so visibility
     here is driven by dedicated classes with the specificity to win. */
  var currentMode = 'calendar';
  function setMode(mode) {
    if (mode !== 'calendar' && mode !== 'tasks') { return; }
    if (mode === currentMode) { return; }
    currentMode = mode;
    modeSwitchBtns.forEach(function (btn) {
      var isActive = btn.getAttribute('data-mode') === mode;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
    if (calendarMainEl) { calendarMainEl.classList.toggle('msc-mode-hidden', mode !== 'calendar'); }
    if (tasksMainEl) { tasksMainEl.classList.toggle('msc-mode-active', mode === 'tasks'); }
    /* Month/Week/Day only applies to the Calendar-mode grid — hidden in
       Tasks mode rather than left visible-but-inert (matches the Google
       Tasks reference, where the equivalent period selector disappears
       once Tasks is the active workspace). .msc-view-switcher already
       carries its own unconditional `display:inline-flex`
       (calendar.css) — same specificity pitfall as calendar-main above,
       so this uses the same dedicated higher-specificity class rather
       than the native `hidden` attribute. */
    if (viewSwitcherEl) { viewSwitcherEl.classList.toggle('msc-mode-hidden', mode !== 'calendar'); }
    /* Schedule Summary and Today's Priorities are both date-scoped
       (Step 20 — "refresh Schedule Summary only through existing
       authoritative behavior"); the Tasks workspace has no selected-
       date concept, so both stay hidden in Tasks mode rather than
       showing a stale or misleading date-scoped figure there. Neither
       element carries its own explicit `display` CSS rule, so the
       native `hidden` attribute is safe here (unlike calendar-main/
       tasks-main above). */
    if (summarySectionEl) { summarySectionEl.hidden = mode !== 'calendar'; }
    if (priorityCardEl) { priorityCardEl.hidden = mode !== 'calendar'; }
    if (mode === 'tasks') {
      closeCreatePopup();
      renderTasksWorkspace();
    }
    closeAllOwnPopovers();
  }
  modeSwitchBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { setMode(btn.getAttribute('data-mode')); });
  });

  var state = {
    viewYear: null, viewMonth: null, selectedDate: null, editingId: null,
    currentView: 'month', anchorDate: null,
    /* Independent Schedule Summary reference date (Schedule Summary
       date-ownership task, 2026-07-24) — deliberately never reused as/from
       selectedDate. summaryReqToken guards against a stale summary
       response overwriting a newer one when the user changes the Summary
       date faster than the in-flight requests resolve. */
    summaryDate: null, summaryReqToken: 0,
    /* dateManuallySelected (weekly-schedule-xlsx-export task, 2026-07-24)
       — distinguishes an actual user date-selection action from
       selectedDate's own automatic initial value. selectDate() is called
       both by every genuine selection path (Month cell, mini-picker,
       Week/Day slot, Today button, post-save re-affirmation) AND once
       automatically at mount (see the bootstrap selectDate(toDateStr(t0))
       call below), so selectedDate alone can never answer "did the user
       ever actually pick a date?" — this flag can. Set true inside
       selectDate() itself, then explicitly reset to false immediately
       after the one automatic bootstrap call, so every later call (all of
       which are real user/save-driven selections) leaves it true. The
       weekly schedule export (downloadWeeklySchedule below) is the only
       reader of this flag — every other selectedDate consumer is
       unaffected and unchanged. */
    dateManuallySelected: false
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
    /* Calendar member-token authorization (2026-07-29): every non-GET
       request must carry a valid member token; GET never does (viewing
       and reports stay unauthenticated). ensureAuthorized() resolves
       immediately with the already-stored token when one exists — no
       dialog, no delay — and only shows the "Authorize this browser"
       dialog the first time a mutation is attempted with none stored, or
       after Forget/change. The actual fetch below is only ever issued
       once, AFTER that promise settles, so a token dialog can never
       result in this mutation being sent twice. */
    var isMutation = method !== 'GET';
    var authPromise = isMutation ? ensureAuthorized() : Promise.resolve(null);
    return authPromise.then(function (token) {
      var opts = { method: method, headers: {} };
      if (body !== undefined) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
      if (token) {
        opts.headers['Authorization'] = 'Bearer ' + token;
      }
      return fetch(url, opts);
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (errBody) {
          /* Calendar member-token authorization (2026-07-29) — checked
             before every other branch below, since neither status ever
             carries one of this file's existing business-conflict shapes.
             401: the token that was just sent is no longer accepted
             (expired/rotated/revoked, or never verified) — clear it so
             the NEXT mutation attempt re-shows the authorize dialog
             (never automatically retried here). 403: a real, valid token
             for a DIFFERENT member than this request's target — the
             message is the backend's own approved copy
             (backend/routers/calendar_auth.py require_matching_member),
             read directly rather than rebuilt from any local/display
             value, so the saved token is left untouched (no re-prompt) and
             the user simply sees why this one action was denied. */
          if (res.status === 401) {
            handleUnauthorizedResponse();
            var authErr = new Error('Your Calendar authorization has expired or changed.');
            authErr.code = 'auth_required';
            authErr.status = 401;
            throw authErr;
          }
          if (res.status === 403) {
            /* Calendar member-token authorization UX correction
               (2026-07-31): the guardMutationAccess() pre-block (auth.js)
               already catches almost every cross-member attempt before
               any request is sent, so this branch is now a rare fallback
               (e.g. the token was reassigned server-side in the instant
               between the pre-block check and this request). Uses the
               backend's own actingMember/targetMember member_key facts
               (backend/routers/calendar_auth.py require_matching_member)
               resolved to on-page display labels HERE (labelForMemberKey,
               ./auth.js) — never the backend's own message text — so the
               resulting toast (ui/error-mapper.js mapApiError) renders
               the SAME approved dynamic copy as the pre-block path's
               crossMemberAlertCopy (auth.js), word for word. The saved
               token is left completely untouched — no re-prompt. */
            var detail = (errBody && errBody.detail) || {};
            var deniedErr = new Error('Cross-member mutation denied.');
            deniedErr.code = 'cross_member_denied';
            deniedErr.status = 403;
            deniedErr.actingMemberLabel = labelForMemberKey(detail.actingMember) || 'another member';
            deniedErr.targetMemberLabel = labelForMemberKey(detail.targetMember) || 'this calendar';
            throw deniedErr;
          }
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
            /* FRAME-LEVEL ERROR CONTEXT (2026-07-27) — present only when
               this Leave conflict is attributable to one specific time
               frame within a multi-frame Single/Edit submission (see
               backend/routers/leave_logic.py leave_conflict_response_body);
               null for the pre-existing single-occurrence case. Consumed
               by performTaskCreate/performTaskUpdate below to decide
               whether to show this exact backend message (which already
               reads "Time frame N: ...") instead of the generic mapped
               text. */
            err.timeFrameIndex = errBody.time_frame_index != null ? errBody.time_frame_index : null;
          } else if (errBody && errBody.error === 'schedule_confirmation_required') {
            /* LUNCH-BREAK AND DIFFERENT-TITLE TASK-OVERLAP CONFIRMATION
               (2026-07-27) — additive ADVISORY (never a hard block) 409
               shared by Single Task creation, Task editing, and Bulk Tasks
               (backend/routers/member_schedules.py
               schedule_confirmation_response_body). warnings is a list of
               {code, row_index} — row_index is null for single/edit, the
               row's own 1-indexed position for Bulk. confirmationFingerprint
               is an opaque, request-scoped token: the caller resubmits the
               EXACT SAME payload with it attached to confirm; the backend
               always fully revalidates and recomputes its own fingerprint
               before ever honoring it, so this is never a raw bypass. */
            err = new Error('This Task needs confirmation before it can be saved.');
            err.code = 'schedule_confirmation_required';
            err.warnings = errBody.warnings || [];
            err.confirmationFingerprint = errBody.confirmation_fingerprint || null;
          } else if (errBody && errBody.status === 'validation_failed') {
            /* Same-day Bulk Tasks (2026-07-23) — zero-write hard-validation
               contract (backend/schemas.py BulkTaskRowErrorOut). Tagged
               distinctly from the generic 'validation' code below so the
               Bulk Tasks submit handler can read the row-level errors
               array directly rather than only a generic mapped message. */
            err = new Error('Tasks were not created.');
            err.code = 'bulk_validation_failed';
            err.errors = errBody.errors || [];
          } else if (errBody && errBody.status === 'duplicate_confirmation_required') {
            /* Same-day Bulk Tasks (2026-07-23) — zero-write duplicate-
               warning contract (backend/schemas.py BulkDuplicateWarningOut). */
            err = new Error('Some tasks may already exist.');
            err.code = 'bulk_duplicate_confirmation_required';
            err.warnings = errBody.warnings || [];
          } else if (errBody && (
            errBody.error === 'outcome_locked' ||
            errBody.error === 'outcome_not_available_yet' ||
            errBody.error === 'outcome_recorded_immutable' ||
            errBody.error === 'same_task_time_required' ||
            errBody.error === 'exact_task_duplicate' ||
            errBody.error === 'same_task_time_overlap' ||
            /* MULTIPLE TIME FRAMES PER TASK (2026-07-27) — server-side
               backstop for the same rules classifyTimeFrameSet() already
               mirrors client-side (see core.js). Reaching this branch
               means a request somehow bypassed that client-side check;
               ui/error-mapper.js's matching KNOWN_ERRORS entries supply
               the same "Complete/Check the task times" copy either way. */
            errBody.error === 'time_frame_incomplete' ||
            errBody.error === 'time_frame_invalid_range' ||
            errBody.error === 'time_frame_duplicate' ||
            errBody.error === 'time_frame_overlap' ||
            errBody.error === 'contradictory_time_fields' ||
            /* APPROVED OCCURRENCE LIMIT (2026-07-27 owner approval) —
               Single Task create/Task edit's "too many total occurrences"
               rejection (backend/routers/member_schedules.py
               check_occurrence_limit). Whole-submission, never
               frame-specific, so err.timeFrameIndex stays unset below and
               the generic mapped title/message (ui/error-mapper.js,
               word-for-word the approved Single/Edit wording) is shown. */
            errBody.error === 'too_many_task_occurrences'
          )) {
            /* FINAL BUSINESS RULES (2026-07-24) — the three 409s a Task
               outcome/date-change/delete request can get once outside the
               task's own actionable date, or once an outcome is already
               recorded (backend/routers/member_schedules.py
               update_member_schedule_event_outcome/
               update_member_schedule_event/delete_member_schedule_event).
               same_task_time_required/exact_task_duplicate/
               same_task_time_overlap (FINAL AUTHORITATIVE SAME-TASK
               MULTIPLE-TIME-PERIOD RULE, 2026-07-27 — supersedes the
               narrower 2026-07-27 timed-versus-untimed-only pass) — the
               single-create/update 409 a Task save gets when an existing
               active Task of the same normalized title/date conflicts per
               the shared classify_same_task_conflict() classifier (exact
               same start/end, any positive-duration overlap, both
               untimed, or one timed/one untimed).
               Same raw-body-with-no-"detail"-wrapper shape as
               leave_conflict above; err.code is set to the exact backend
               error string so ui/error-mapper.js's KNOWN_ERRORS entry of
               the same name supplies the mapped title/message — no
               duplicate branch needed per code. */
            err = new Error(errBody.message || 'This request could not be completed.');
            err.code = errBody.error;
            /* FRAME-LEVEL ERROR CONTEXT (2026-07-27) — see the
               leave_conflict branch above for the full rationale; same
               additive, null-unless-multi-frame contract for every code
               in this branch's list (same-title hard conflicts and the
               multiple-time-frames shape errors alike). */
            err.timeFrameIndex = errBody.time_frame_index != null ? errBody.time_frame_index : null;
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

  /* Full-day-leave-blocks-create task (2026-07-23) — presentation-only
     gate on whether the Create dialog may open for a given date. Reuses
     leaveItemsForDate() above, so it inherits that helper's existing
     active-only (deleted_at IS NULL) and current-member filtering rather
     than re-deriving either — there is exactly one place that decides
     which leave records apply to a date. Only 'Full-Day' and 'Multi-Day'
     block: those are the only two leave_type values that represent
     whole-day coverage. Short Leave / Half-Day First / Half-Day Second
     are partial-day and must keep allowing Create on that date, since a
     valid Task/Leave may still fit outside the partial period — the
     backend remains the authority on any actual scheduling conflict. */
  function isDateFullyLeaveBlocked(dateStr) {
    return leaveItemsForDate(dateStr).some(function (lv) {
      return lv.leave_type === 'Full-Day' || lv.leave_type === 'Multi-Day';
    });
  }

  /* ── Same-day Bulk Tasks (2026-07-23; per-row Date field added by the
     CONFIRMED ADD-ROW DATE RULE task, 2026-07-24) ─────────────────────────
     Each row is fully self-contained, including its own Date field — there
     is no common batch-wide Date any more (superseded business decision;
     see backend/schemas.py BulkTaskRowIn.date). Rows are a dynamically
     rendered, reorderable-by-remove list (msc-bulk-rows). Reuses every
     existing rule this file/backend already enforces for a single Task —
     no new business logic is invented here beyond routing to POST
     {apiBase}/bulk with the approved request/response contract
     (backend/schemas.py BulkTaskCreateRequest/BulkTaskRowIn). Duplicate
     confirmation reuses the shared confirmDestructive() dialog (ui/
     dialog.js) with confirmVariant:'primary' so "Create tasks anyway"
     never wears the red delete-style button that dialog defaults to.

     Row-date defaulting rules (CONFIRMED ADD-ROW DATE RULE, 2026-07-24):
     1. Opening from a clicked Calendar date seeds the initial row(s) with
        that date (see ensureBulkMinimumRows() callers above).
     2. Opening from the main Create button preserves whatever date was
        already established as the entry-point default (same mechanism).
     3. "+ Add another task" copies the immediately previous row's CURRENT
        Date value (see the bulkAddRowBtn click handler below) — never the
        original clicked Calendar date, never today, never one shared
        batch-wide value.
     4/5. The copied date is independently editable from that moment on —
        copy-on-create only; editing an earlier row's Date afterward never
        touches a row that already copied it (no live/linked date state
        anywhere in this section).
     6. A blank previous-row Date is copied as-is (never invented) — the
        new row is simply left without a Date, which the existing
        title-required-style validation below (bulkRowFieldErrors) and the
        backend's own per-row date_required check both catch at submit
        time. */
  var MAX_BULK_TASK_ROWS = 30; // mirrors backend/config.py MAX_BULK_TASK_ROWS
  /* Mirrors backend/routers/member_schedules.py MAX_TASK_OCCURRENCES_PER_SUBMISSION
     (REQ-CAL-BULK-DATES-001, 2026-08-03) — an early, non-authoritative
     frontend check only; the backend's own check_occurrence_limit() is
     unchanged and remains the sole authoritative gate (approved design
     §9). This constant is NOT the same value-by-coincidence as
     MAX_TIME_FRAMES_PER_TASK above — see that constant's own history for
     why these two 30s are independent, never-derived-from-each-other
     limits. */
  var MAX_TASK_OCCURRENCES_PER_SUBMISSION = 30;
  var bulkRowSeq = 0;
  var bulkSubmitInFlight = false;

  function bulkRowFieldElement(rowEl, field) {
    if (!rowEl) { return null; }
    if (field === 'date') {
      /* REQ-CAL-BULK-DATES-001 (2026-08-03) — mode-aware: the single
         .msc-bulk-row-date input is the right error-anchor element only
         in single mode (unchanged); range/multiple mode have no one
         field that represents "the date" the way a plain date input
         does, so this anchors a date-related error to the first
         relevant visible input in that mode's own panel instead —
         start-date for range, the add-date input for multiple — so
         setFieldError() always highlights something the user can
         actually see, never a hidden field. */
      var mode = bulkRowDateMode(rowEl);
      if (mode === 'range') { return rowEl.querySelector('.msc-bulk-row-range-start'); }
      if (mode === 'multiple') { return rowEl.querySelector('.msc-bulk-multi-date-input'); }
      return rowEl.querySelector('.msc-bulk-row-date');
    }
    if (field === 'title') { return rowEl.querySelector('.msc-bulk-row-title'); }
    if (field === 'start') { return rowEl.querySelector('.msc-bulk-row-start'); }
    if (field === 'end') { return rowEl.querySelector('.msc-bulk-row-end'); }
    if (field === 'priority') { return rowEl.querySelector('.msc-bulk-row-priority'); }
    if (field === 'notes') { return rowEl.querySelector('.msc-bulk-row-notes'); }
    return null;
  }

  function getBulkRows() {
    return bulkRowsEl ? Array.prototype.slice.call(bulkRowsEl.querySelectorAll('.msc-bulk-row')) : [];
  }

  /* REQ-CAL-BULK-DATES-001 (2026-08-03) — resolves a backend-reported 1-
     indexed `row` number back to the DOM card it came from. Before this
     feature, one submitted array position always equaled one visible
     .msc-bulk-row (so `getBulkRows()[rowNumber-1]` was correct); now a
     single card can expand into several submitted positions (one per
     generated date), so `positionMap` — built fresh by
     performBulkSubmit() for the exact array it just sent — is the only
     reliable source of truth. Message TEXT itself is deliberately left
     exactly as the backend already produces it (still "Row N"/"Task N,
     time frame M" using the flat array position, per approved design
     §13 — "unchanged... each generated date is just another row in the
     existing per-row error contract"); only the DOM element an error
     visually attaches to is resolved through this map. */
  function bulkRowFromPositionMap(positionMap, rowNumber) {
    return (positionMap && positionMap[rowNumber - 1]) || null;
  }

  /* First row's Date value/element — used only as the representative
     "bulk date" when the user switches AWAY from the Bulk tab to Task or
     Leave (carrying a value across tabs, same convention those tabs
     already use for each other), and to focus the first row's Date field
     when the Bulk tab becomes active. Never used to seed or overwrite any
     row's own value once rows already exist. */
  function firstBulkRowDate() {
    var el = firstBulkRowDateEl();
    return el ? el.value : '';
  }

  function firstBulkRowDateEl() {
    var rows = getBulkRows();
    return rows.length ? bulkRowFieldElement(rows[0], 'date') : null;
  }

  function updateBulkAddButtonState() {
    if (!bulkAddRowBtn) { return; }
    bulkAddRowBtn.disabled = getBulkRows().length >= MAX_BULK_TASK_ROWS;
  }

  function renderBulkRowNumbers() {
    var rows = getBulkRows();
    rows.forEach(function (rowEl, idx) {
      var numEl = rowEl.querySelector('.msc-bulk-row-number');
      if (numEl) { numEl.textContent = 'Task ' + (idx + 1); }
      var removeBtn = rowEl.querySelector('.msc-bulk-row-remove');
      if (removeBtn) { removeBtn.disabled = rows.length <= 1; }
    });
    updateBulkAddButtonState();
  }

  /* Monday..Sunday weekday chips, in this fixed display order, each
     data-weekday carrying the native Date.getDay() value that
     expandTaskDates() (core.js) already expects (0=Sun..6=Sat) — the same
     convention DEFAULT_RANGE_WEEKDAYS uses, so a chip's data-weekday can be
     read straight into the `weekdays` array with no translation step.
     Mon-Fri default checked, Sat/Sun default unchecked, per approved
     decisions #3/#4. */
  var BULK_WEEKDAY_CHIPS = [
    { weekday: 1, label: 'Mon' }, { weekday: 2, label: 'Tue' }, { weekday: 3, label: 'Wed' },
    { weekday: 4, label: 'Thu' }, { weekday: 5, label: 'Fri' },
    { weekday: 6, label: 'Sat' }, { weekday: 0, label: 'Sun' }
  ];

  function bulkWeekdayChipsMarkup() {
    return BULK_WEEKDAY_CHIPS.map(function (chip) {
      var pressed = DEFAULT_RANGE_WEEKDAYS.indexOf(chip.weekday) !== -1;
      return '<button type="button" class="msc-bulk-weekday-chip" data-weekday="' + chip.weekday + '" ' +
        'aria-pressed="' + (pressed ? 'true' : 'false') + '">' + chip.label + '</button>';
    }).join('');
  }

  function bulkRowMarkup(dateValue) {
    bulkRowSeq += 1;
    var dateAttr = dateValue ? ' value="' + escapeHtml(dateValue) + '"' : '';
    return (
      '<div class="msc-bulk-row" data-bulk-row-seq="' + bulkRowSeq + '">' +
      '<div class="msc-bulk-row-head">' +
      '<span class="msc-bulk-row-number"></span>' +
      '<button type="button" class="msc-bulk-row-remove" aria-label="Remove this task row">&times;</button>' +
      '</div>' +
      /* .msc-form-grid reused verbatim (same 2-col/1-col-at-560px
         responsive behavior already defined for the Task/Leave forms) —
         no second grid/breakpoint rule is defined for Bulk Tasks. */
      '<div class="msc-bulk-row-fields msc-form-grid">' +
      /* ── Date-selection mode (REQ-CAL-BULK-DATES-001, 2026-08-03) — a
         real <fieldset>/<legend> (never a div-only custom widget with no
         accessible name), matching this form's existing field-labelling
         convention. Default mode is always "single", preserving existing
         behavior byte-for-byte for a card that never touches the new
         mode selector at all — the plain .msc-bulk-row-date input below
         is untouched, same class name, same required attribute, same
         add-row date-seeding source element. */
      '<fieldset class="msc-bulk-date-mode-fieldset msc-form-full">' +
      '<legend>Dates</legend>' +
      '<label class="msc-bulk-date-mode-select-label">Date selection' +
      '<select class="msc-bulk-row-date-mode">' +
      '<option value="single" selected>Single date</option>' +
      '<option value="range">Date range</option>' +
      '<option value="multiple">Multiple dates</option>' +
      '</select>' +
      '</label>' +
      '<div class="msc-bulk-date-mode-panel msc-bulk-date-mode-panel--single">' +
      '<label>Date<input type="date" class="msc-bulk-row-date"' + dateAttr + ' required /></label>' +
      '</div>' +
      '<div class="msc-bulk-date-mode-panel msc-bulk-date-mode-panel--range" hidden>' +
      '<label>Start date<input type="date" class="msc-bulk-row-range-start" /></label>' +
      '<label>End date<input type="date" class="msc-bulk-row-range-end" /></label>' +
      '<div class="msc-bulk-weekday-chips" role="group" aria-label="Days of the week to include">' +
      bulkWeekdayChipsMarkup() +
      '</div>' +
      '<p class="msc-bulk-date-preview" role="status"></p>' +
      '<p class="msc-bulk-date-warning" role="alert" hidden></p>' +
      '</div>' +
      '<div class="msc-bulk-date-mode-panel msc-bulk-date-mode-panel--multiple" hidden>' +
      '<label>Add a date<input type="date" class="msc-bulk-multi-date-input" /></label>' +
      '<button type="button" class="msc-btn msc-btn-ghost msc-bulk-multi-date-add-btn">Add date</button>' +
      '<div class="msc-bulk-multi-date-chips"></div>' +
      '<p class="msc-bulk-date-preview" role="status"></p>' +
      '<p class="msc-bulk-date-warning" role="alert" hidden></p>' +
      '</div>' +
      '</fieldset>' +
      '<label>Task title<input type="text" class="msc-bulk-row-title" maxlength="120" placeholder="e.g. Prepare weekly report" /></label>' +
      '<label>Priority<select class="msc-bulk-row-priority">' +
      '<option value="High">High</option>' +
      '<option value="Medium" selected>Medium</option>' +
      '<option value="Low">Low</option>' +
      '</select></label>' +
      /* ── Nested time frames (multiple-time-frames-per-task, 2026-07-27) —
         mirrors the Single Task form's own frame-1-plus-additive-rows
         structure (see timeFrameRowMarkup() above), scoped to THIS row —
         each Bulk row gets its own independent time-frame list.
         .msc-bulk-row-start/.msc-bulk-row-end keep their exact original
         class names so bulkRowFieldElement()/rowElToPayloadRow() below
         need no change to keep reading "Time frame 1". */
      '<div class="msc-time-frames-section msc-form-full">' +
      '<div class="msc-time-frame-row msc-time-frame-row--primary">' +
      '<div class="msc-time-frame-heading">Time frame 1</div>' +
      '<label>Start time<input type="time" class="msc-bulk-row-start" /></label>' +
      '<label>End time<input type="time" class="msc-bulk-row-end" /></label>' +
      '</div>' +
      '<div class="msc-bulk-time-frames-extra"></div>' +
      '<button type="button" class="msc-btn msc-btn-ghost msc-bulk-add-time-frame-btn">+ Add another time</button>' +
      '</div>' +
      '<label class="msc-form-full">Notes<textarea class="msc-bulk-row-notes" maxlength="240" ' +
      'placeholder="Optional note — no real names, meetings, or customer details"></textarea></label>' +
      '</div>' +
      '<p class="msc-form-full msc-bulk-leave-blocked-note" hidden>No new Task can be added on this date — it is ' +
      'covered by Full-Day or Multi-Day leave.</p>' +
      '</div>'
    );
  }

  /* ── Nested per-row time frames (multiple-time-frames-per-task,
     2026-07-27) — each Bulk row gets its own independent frame list,
     "Time frame 1" always being that row's own .msc-bulk-row-start/
     .msc-bulk-row-end pair. Deliberately a thin, row-scoped rewrite of
     the Single Task form's timeFrameRowMarkup()/addTimeFrameRow() family
     above rather than a shared function, since every DOM query here must
     stay scoped to `rowEl` (a Bulk row) instead of the one global form. */
  function bulkTimeFrameExtraEl(rowEl) {
    return rowEl.querySelector('.msc-bulk-time-frames-extra');
  }

  function getBulkRowTimeFrameExtraRows(rowEl) {
    var extraEl = bulkTimeFrameExtraEl(rowEl);
    return extraEl ? Array.prototype.slice.call(extraEl.querySelectorAll('.msc-time-frame-row')) : [];
  }

  function renumberBulkRowTimeFrames(rowEl) {
    getBulkRowTimeFrameExtraRows(rowEl).forEach(function (frameEl, index) {
      var frameNumber = index + 2;
      var heading = frameEl.querySelector('.msc-time-frame-heading');
      if (heading) { heading.textContent = 'Time frame ' + frameNumber; }
      var startInput = frameEl.querySelector('.msc-time-frame-start');
      var endInput = frameEl.querySelector('.msc-time-frame-end');
      var removeBtn = frameEl.querySelector('.msc-time-frame-remove-btn');
      if (startInput) { startInput.setAttribute('aria-label', 'Time frame ' + frameNumber + ' start time'); }
      if (endInput) { endInput.setAttribute('aria-label', 'Time frame ' + frameNumber + ' end time'); }
      if (removeBtn) { removeBtn.setAttribute('aria-label', 'Remove time frame ' + frameNumber); }
    });
  }

  function addBulkRowTimeFrame(rowEl) {
    var extraEl = bulkTimeFrameExtraEl(rowEl);
    if (!extraEl) { return null; }
    var addBtn = rowEl.querySelector('.msc-bulk-add-time-frame-btn');
    if (getBulkRowTimeFrameExtraRows(rowEl).length + 1 >= MAX_TIME_FRAMES_PER_TASK) {
      if (addBtn) { addBtn.disabled = true; }
    }
    if (getBulkRowTimeFrameExtraRows(rowEl).length + 1 > MAX_TIME_FRAMES_PER_TASK) { return null; }
    var wrap = document.createElement('div');
    wrap.innerHTML = timeFrameRowMarkup();
    var frameEl = wrap.firstChild;
    extraEl.appendChild(frameEl);
    renumberBulkRowTimeFrames(rowEl);
    var startInput = frameEl.querySelector('.msc-time-frame-start');
    var endInput = frameEl.querySelector('.msc-time-frame-end');
    var removeBtn = frameEl.querySelector('.msc-time-frame-remove-btn');
    [startInput, endInput].forEach(function (input) {
      if (!input) { return; }
      input.addEventListener('input', function () {
        clearFieldError(input);
        rowEl.classList.remove('msc-bulk-row-error', 'msc-bulk-row-duplicate-warning');
        refreshBulkDuplicateHints();
      });
    });
    if (removeBtn) {
      removeBtn.addEventListener('click', function () {
        frameEl.parentNode.removeChild(frameEl);
        renumberBulkRowTimeFrames(rowEl);
        if (addBtn) { addBtn.disabled = false; }
        refreshBulkDuplicateHints();
      });
    }
    if (startInput) { startInput.focus(); }
    return frameEl;
  }

  /* Frame 1 first, then every additive row in DOM order — the shape
     classifyTimeFrameSet()/rowElToPayloadRow() expect. */
  function collectBulkRowTimeFrames(rowEl) {
    var frames = [{
      start: bulkRowFieldElement(rowEl, 'start').value,
      end: bulkRowFieldElement(rowEl, 'end').value
    }];
    getBulkRowTimeFrameExtraRows(rowEl).forEach(function (frameEl) {
      var startInput = frameEl.querySelector('.msc-time-frame-start');
      var endInput = frameEl.querySelector('.msc-time-frame-end');
      frames.push({ start: startInput ? startInput.value : '', end: endInput ? endInput.value : '' });
    });
    return frames;
  }

  /* ── Bulk Tasks multi-date expansion (REQ-CAL-BULK-DATES-001,
     2026-08-03) — one .msc-bulk-row card can now generate its task
     definition across several dates: single (unchanged), a weekday-
     filtered date range, or a manually picked set of individual dates.
     The DOM row remains the sole source of truth (this file's existing
     convention — see the module header note above bulkRowMarkup) for
     every one of these three modes; nothing here is mirrored into a
     parallel JS state object. All date-list generation itself is
     delegated to the pure, independently-tested expandTaskDates()
     (core.js) — no date-arithmetic is duplicated here. */

  function bulkRowDateModeEl(rowEl) { return rowEl.querySelector('.msc-bulk-row-date-mode'); }
  function bulkRowDateMode(rowEl) {
    var el = bulkRowDateModeEl(rowEl);
    return el ? el.value : 'single';
  }

  function bulkRowDateModePanel(rowEl, mode) {
    return rowEl.querySelector('.msc-bulk-date-mode-panel--' + mode);
  }

  /* Shows exactly the active mode's panel, hides the other two — never a
     partial/ambiguous visible state. Does not clear any field's value
     when switching (switching modes and back must not silently discard
     what the user already entered in the other panel). */
  function renderBulkRowDateModePanels(rowEl) {
    ['single', 'range', 'multiple'].forEach(function (mode) {
      var panelEl = bulkRowDateModePanel(rowEl, mode);
      if (panelEl) { panelEl.hidden = (bulkRowDateMode(rowEl) !== mode); }
    });
  }

  function bulkRowWeekdayChips(rowEl) {
    return Array.prototype.slice.call(rowEl.querySelectorAll('.msc-bulk-weekday-chip'));
  }

  /* Reads the currently-pressed weekday chips as an array of
     Date.getDay() values (0=Sun..6=Sat) — the exact shape
     expandTaskDates()'s `weekdays` param expects. Always returns a real
     array (possibly empty, when every chip is unpressed), never
     undefined, so range mode's "omitted -> default Mon-Fri" fallback in
     expandTaskDates() is never accidentally triggered by an unrelated
     falsy check here — an intentionally empty selection must surface
     expandTaskDates()'s own 'no_weekdays_selected' error, not silently
     default back to Mon-Fri. */
  function bulkRowSelectedWeekdays(rowEl) {
    return bulkRowWeekdayChips(rowEl)
      .filter(function (chip) { return chip.getAttribute('aria-pressed') === 'true'; })
      .map(function (chip) { return parseInt(chip.getAttribute('data-weekday'), 10); });
  }

  function bulkRowMultiDateChipsEl(rowEl) { return rowEl.querySelector('.msc-bulk-multi-date-chips'); }

  /* The multiple-dates picker's own selected-date state — one visible
     chip per date, each carrying its own value in data-date. Reading this
     back out (bulkRowSelectedDates) is a plain DOM query, matching the
     "DOM is the state" convention already used for every other Bulk row
     field. */
  function bulkRowSelectedDates(rowEl) {
    var chipsEl = bulkRowMultiDateChipsEl(rowEl);
    if (!chipsEl) { return []; }
    return Array.prototype.slice.call(chipsEl.querySelectorAll('.msc-bulk-date-chip'))
      .map(function (chipEl) { return chipEl.getAttribute('data-date'); });
  }

  function bulkDateChipMarkup(dateStr) {
    var dt = parseDateStr(dateStr);
    var label = isNaN(dt.getTime()) ? dateStr : (pad(dt.getDate()) + ' ' + MONTH_NAMES[dt.getMonth()].slice(0, 3));
    return '<span class="msc-bulk-date-chip" data-date="' + escapeHtml(dateStr) + '">' +
      '<span class="msc-bulk-date-chip-label">' + escapeHtml(label) + '</span>' +
      '<button type="button" class="msc-bulk-date-chip-remove" aria-label="Remove ' + escapeHtml(dateStr) + '">&times;</button>' +
      '</span>';
  }

  /* Adding a date already present in this card's selection is a silent
     no-op (approved design §6.3 — this is input hygiene within ONE task
     definition, never a cross-task duplicate-detection concern; see
     bulkRowGeneratedDates()/expandTaskDates()'s own separate, unrelated
     dedup for what actually reaches the payload). */
  function addBulkRowSelectedDate(rowEl, dateStr) {
    if (!dateStr || !isValidDateStr(dateStr)) { return; }
    var chipsEl = bulkRowMultiDateChipsEl(rowEl);
    if (!chipsEl) { return; }
    if (bulkRowSelectedDates(rowEl).indexOf(dateStr) !== -1) { return; }
    chipsEl.insertAdjacentHTML('beforeend', bulkDateChipMarkup(dateStr));
    var newChip = chipsEl.lastElementChild;
    var removeBtn = newChip ? newChip.querySelector('.msc-bulk-date-chip-remove') : null;
    if (removeBtn) {
      removeBtn.addEventListener('click', function () {
        newChip.parentNode.removeChild(newChip);
        renderBulkRowDatePreview(rowEl);
        updateBulkCreateButtonGate();
      });
    }
  }

  /* Calls the pure expandTaskDates() (core.js) with this row's current
     mode/inputs — the single place any Bulk row turns its own DOM state
     into a generated-date list. Never mutates the DOM; callers decide
     what to do with the result (render a preview, build payload rows,
     etc). */
  function bulkRowGeneratedDates(rowEl) {
    var mode = bulkRowDateMode(rowEl);
    if (mode === 'range') {
      var startEl = rowEl.querySelector('.msc-bulk-row-range-start');
      var endEl = rowEl.querySelector('.msc-bulk-row-range-end');
      return expandTaskDates({
        mode: 'range',
        rangeStart: startEl ? startEl.value : '',
        rangeEnd: endEl ? endEl.value : '',
        weekdays: bulkRowSelectedWeekdays(rowEl)
      });
    }
    if (mode === 'multiple') {
      return expandTaskDates({ mode: 'multiple', selectedDates: bulkRowSelectedDates(rowEl) });
    }
    var dateEl = bulkRowFieldElement(rowEl, 'date');
    return expandTaskDates({ mode: 'single', singleDate: dateEl ? dateEl.value : '' });
  }

  /* This row's own occurrence count — generated date count × this row's
     resolved time-frame count (Phase 10: an untimed task or a single
     start/end pair both count as exactly 1; N time_frames counts as N).
     A row with a still-unresolved date selection (validation errors, or
     entirely blank) contributes 0 — it cannot yet generate any real
     payload row, so it must not inflate the combined total. */
  function bulkRowOccurrenceCount(rowEl) {
    if (isBulkRowBlank(rowEl)) { return 0; }
    var expansion = bulkRowGeneratedDates(rowEl);
    if (expansion.errors.length) { return 0; }
    var frameCount = collectBulkRowTimeFrames(rowEl).length;
    return bulkCardOccurrenceCount(expansion.dates.length, frameCount); // core.js, pure/tested
  }

  /* Sum of every nonblank row's own occurrence count — delegates the
     actual Σ(dates × frames) arithmetic to core.js's pure, independently
     tested totalBulkOccurrenceCount (imported above as
     sumOccurrenceCounts to avoid shadowing this DOM-reading wrapper's own
     name) — the exact formula the backend's own check_occurrence_limit()
     already applies (approved design §9/§10, unchanged
     MAX_TASK_OCCURRENCES_PER_SUBMISSION = 30). */
  function totalBulkOccurrenceCount() {
    var counts = getBulkRows()
      .filter(function (rowEl) { return !isBulkRowBlank(rowEl); })
      .map(bulkRowOccurrenceCount);
    return sumOccurrenceCounts(counts);
  }

  /* Renders the count/preview/warning for whichever mode panel is
     currently active on this row — the single place range mode's and
     multiple-dates mode's preview elements are ever written to. Called
     on every relevant input change (wireBulkRowDateModeEvents below) and
     whenever the row's mode itself changes. */
  function renderBulkRowDatePreview(rowEl) {
    var mode = bulkRowDateMode(rowEl);
    if (mode !== 'range' && mode !== 'multiple') { return; }
    var panelEl = bulkRowDateModePanel(rowEl, mode);
    if (!panelEl) { return; }
    var previewEl = panelEl.querySelector('.msc-bulk-date-preview');
    var warningEl = panelEl.querySelector('.msc-bulk-date-warning');
    var expansion = bulkRowGeneratedDates(rowEl);

    if (expansion.errors.length) {
      if (previewEl) { previewEl.textContent = ''; }
      if (warningEl) { warningEl.textContent = expansion.errors[0].message; warningEl.hidden = false; }
      return;
    }
    if (previewEl) {
      var count = expansion.dates.length;
      previewEl.textContent = count + (count === 1 ? ' date selected: ' : ' dates selected: ') + formatCompactDateList(expansion.dates);
    }
    var frameCount = collectBulkRowTimeFrames(rowEl).length;
    var rowOccurrences = bulkCardOccurrenceCount(expansion.dates.length, frameCount);
    if (rowOccurrences > MAX_TASK_OCCURRENCES_PER_SUBMISSION) {
      if (warningEl) {
        warningEl.textContent = 'This task would create ' + rowOccurrences + ' occurrences, which is more than the ' +
          MAX_TASK_OCCURRENCES_PER_SUBMISSION + ' allowed in one submission. Reduce the date range, weekdays, or time frames.';
        warningEl.hidden = false;
      }
    } else if (warningEl) {
      warningEl.textContent = '';
      warningEl.hidden = true;
    }
  }

  /* Wires the date-mode selector, weekday chips, and multi-date add
     control for one row — called once, at row creation, alongside
     wireBulkRowEvents() below. Every handler re-renders this row's own
     preview and refreshes the submission-wide occurrence gate, so the
     Create button and its live summary text are always in sync with
     whatever the user just changed, on any card. */
  function wireBulkRowDateModeEvents(rowEl) {
    var modeEl = bulkRowDateModeEl(rowEl);
    if (modeEl) {
      modeEl.addEventListener('change', function () {
        renderBulkRowDateModePanels(rowEl);
        clearFieldError(bulkRowFieldElement(rowEl, 'date'));
        rowEl.classList.remove('msc-bulk-row-error', 'msc-bulk-row-duplicate-warning');
        renderBulkRowDatePreview(rowEl);
        refreshBulkDuplicateHints();
        updateBulkCreateButtonGate();
      });
    }

    var rangeStartEl = rowEl.querySelector('.msc-bulk-row-range-start');
    var rangeEndEl = rowEl.querySelector('.msc-bulk-row-range-end');
    [rangeStartEl, rangeEndEl].forEach(function (el) {
      if (!el) { return; }
      el.addEventListener('input', function () {
        renderBulkRowDatePreview(rowEl);
        refreshBulkDuplicateHints();
        updateBulkCreateButtonGate();
      });
    });

    bulkRowWeekdayChips(rowEl).forEach(function (chip) {
      chip.addEventListener('click', function () {
        var pressed = chip.getAttribute('aria-pressed') === 'true';
        chip.setAttribute('aria-pressed', pressed ? 'false' : 'true');
        renderBulkRowDatePreview(rowEl);
        refreshBulkDuplicateHints();
        updateBulkCreateButtonGate();
      });
    });

    var multiDateInputEl = rowEl.querySelector('.msc-bulk-multi-date-input');
    var multiDateAddBtn = rowEl.querySelector('.msc-bulk-multi-date-add-btn');
    if (multiDateAddBtn) {
      multiDateAddBtn.addEventListener('click', function () {
        if (!multiDateInputEl || !multiDateInputEl.value) { return; }
        addBulkRowSelectedDate(rowEl, multiDateInputEl.value);
        multiDateInputEl.value = '';
        renderBulkRowDatePreview(rowEl);
        refreshBulkDuplicateHints();
        updateBulkCreateButtonGate();
        multiDateInputEl.focus();
      });
    }
    // Wires the "Remove <date>" button on every chip already present at
    // row-creation time (there are none yet for a freshly-created row —
    // addBulkRowSelectedDate() above wires each chip it creates itself —
    // this loop exists only for symmetry/defensiveness, a no-op today).
    bulkRowMultiDateChipsEl(rowEl) && Array.prototype.slice.call(
      bulkRowMultiDateChipsEl(rowEl).querySelectorAll('.msc-bulk-date-chip-remove')
    ).forEach(function (removeBtn) {
      removeBtn.addEventListener('click', function () {
        var chipEl = removeBtn.parentNode;
        chipEl.parentNode.removeChild(chipEl);
        renderBulkRowDatePreview(rowEl);
        refreshBulkDuplicateHints();
        updateBulkCreateButtonGate();
      });
    });
  }

  function wireBulkRowEvents(rowEl) {
    var removeBtn = rowEl.querySelector('.msc-bulk-row-remove');
    if (removeBtn) { removeBtn.addEventListener('click', function () { removeBulkRow(rowEl); }); }
    var dateEl = rowEl.querySelector('.msc-bulk-row-date');
    if (dateEl) {
      dateEl.addEventListener('input', function () {
        clearFieldError(dateEl);
        rowEl.classList.remove('msc-bulk-row-error', 'msc-bulk-row-duplicate-warning');
        refreshBulkDuplicateHints();
        updateBulkCreateButtonGate();
      });
    }
    ['msc-bulk-row-title', 'msc-bulk-row-start', 'msc-bulk-row-end', 'msc-bulk-row-notes'].forEach(function (cls) {
      var el = rowEl.querySelector('.' + cls);
      if (!el) { return; }
      el.addEventListener('input', function () {
        clearFieldError(el);
        rowEl.classList.remove('msc-bulk-row-error', 'msc-bulk-row-duplicate-warning');
        refreshBulkDuplicateHints();
      });
    });
    var priorityEl = rowEl.querySelector('.msc-bulk-row-priority');
    if (priorityEl) { priorityEl.addEventListener('change', refreshBulkDuplicateHints); }
    var addTimeFrameBtnForRow = rowEl.querySelector('.msc-bulk-add-time-frame-btn');
    if (addTimeFrameBtnForRow) {
      addTimeFrameBtnForRow.addEventListener('click', function () { addBulkRowTimeFrame(rowEl); });
    }
  }

  /* dateValue seeds the new row's Date field only at creation — every
     caller decides what that seed should be (see the rules documented at
     the top of this section); this function itself never invents one. */
  function addBulkRow(dateValue) {
    if (!bulkRowsEl || getBulkRows().length >= MAX_BULK_TASK_ROWS) { return null; }
    bulkRowsEl.insertAdjacentHTML('beforeend', bulkRowMarkup(dateValue));
    var rows = getBulkRows();
    var newRow = rows[rows.length - 1];
    wireBulkRowEvents(newRow);
    wireBulkRowDateModeEvents(newRow);
    renderBulkRowNumbers();
    applyRowLeaveGate(newRow);
    updateBulkCreateButtonGate();
    return newRow;
  }

  function removeBulkRow(rowEl) {
    if (!rowEl || !rowEl.parentNode || getBulkRows().length <= 1) { return; }
    rowEl.parentNode.removeChild(rowEl);
    renderBulkRowNumbers();
    refreshBulkDuplicateHints();
    updateBulkCreateButtonGate();
  }

  /* Begins with exactly 1 row on first use, per Step 16 ("begin with a
     reasonable number of rows, such as one or two... do not pre-create
     all 30 rows") — narrowed from the earlier 2-row start to exactly 1
     by the CONFIRMED ADD-ROW DATE RULE task (2026-07-24: required test A
     names it "the first row", and tests B/C only make sense if the row
     "+ Add another task" creates next is Row 2, then Row 3 — i.e. the
     form starts at Row 1, not Row 1+2). Only adds a row when the list is
     empty, so reopening the dialog on an in-progress batch never
     discards what the user already entered (resetBulkForm() below is the
     only path that empties the list first). entryDateStr seeds this one
     initial row (CONFIRMED ADD-ROW DATE RULE rules 1/2) — it is only
     ever consulted here, at first-creation time; every row added
     afterward via "+ Add another task" copies the previous row's own
     current value instead (see the bulkAddRowBtn click handler below),
     never this entry date again. */
  function ensureBulkMinimumRows(entryDateStr) {
    if (getBulkRows().length === 0) {
      addBulkRow(entryDateStr);
    }
  }

  /* Per-row Full-Day/Multi-Day leave gate (full-day-leave-blocks-create
     task, 2026-07-23) — now evaluated per row instead of once for a
     single common date, since each row can carry a different date.
     Toggles that row's own inline note and returns whether it is
     currently blocked; updateBulkCreateButtonGate() below aggregates
     across every row to decide whether submission is allowed at all. */
  /* REQ-CAL-BULK-DATES-001 (2026-08-03) extension — a range/multiple-dates
     row can now generate several dates; this checks EVERY generated date
     (not just one), so a row is flagged blocked if any single generated
     date falls on active Full-Day/Multi-Day leave. Single mode is
     byte-for-byte unchanged (bulkRowGeneratedDates() for 'single' mode
     always yields exactly the one date the old direct dateEl.value check
     already read). An unresolved/errored date selection is never itself
     treated as "leave-blocked" — that is a distinct error surfaced by
     bulkRowFieldErrors()/renderBulkRowDatePreview() instead. */
  function applyRowLeaveGate(rowEl) {
    var noteEl = rowEl.querySelector('.msc-bulk-leave-blocked-note');
    var expansion = bulkRowGeneratedDates(rowEl);
    var blocked = !expansion.errors.length && expansion.dates.some(function (d) { return isDateFullyLeaveBlocked(d); });
    if (noteEl) { noteEl.hidden = !blocked; }
    rowEl.classList.toggle('msc-bulk-row-leave-blocked', blocked);
    return blocked;
  }

  function updateBulkCreateButtonGate() {
    var rows = getBulkRows();
    var anyBlocked = rows.reduce(function (blocked, rowEl) {
      return applyRowLeaveGate(rowEl) || blocked;
    }, false);
    rows.forEach(renderBulkRowDatePreview);
    var totalOccurrences = totalBulkOccurrenceCount();
    var overLimit = totalOccurrences > MAX_TASK_OCCURRENCES_PER_SUBMISSION;
    if (bulkOccurrenceSummaryEl) {
      var nonblankRowCount = rows.filter(function (rowEl) { return !isBulkRowBlank(rowEl); }).length;
      var summary = nonblankRowCount + (nonblankRowCount === 1 ? ' task row' : ' task rows') +
        ' • ' + totalOccurrences + (totalOccurrences === 1 ? ' occurrence' : ' occurrences');
      if (overLimit) {
        summary += ' — exceeds the ' + MAX_TASK_OCCURRENCES_PER_SUBMISSION + ' allowed. Reduce dates or time frames.';
      }
      bulkOccurrenceSummaryEl.textContent = summary;
      bulkOccurrenceSummaryEl.classList.toggle('msc-bulk-occurrence-summary--over-limit', overLimit);
    }
    if (bulkCreateBtn) { bulkCreateBtn.disabled = anyBlocked || overLimit; }
  }

  function clearBulkFormErrors() {
    if (bulkFormEl) { clearFormErrors(bulkFormEl); }
    getBulkRows().forEach(function (rowEl) {
      rowEl.classList.remove('msc-bulk-row-error', 'msc-bulk-row-duplicate-warning');
    });
  }

  function resetBulkForm() {
    if (bulkRowsEl) { bulkRowsEl.innerHTML = ''; }
    bulkRowSeq = 0;
    clearBulkFormErrors();
    showApiStatus('', false, bulkPopupStatusEl);
    /* No entry date is carried over here — a full reset (post-submit or
       Cancel) starts a genuinely fresh batch, same as before this task;
       the next ensureBulkMinimumRows(dateVal) call from a tab-switch/open
       path is what seeds the new first row(s). */
    ensureBulkMinimumRows();
    if (bulkCreateBtn) { bulkCreateBtn.disabled = false; }
  }

  /* A row is blank only when title, start, end, and notes are ALL empty
     (Step 5) — priority is deliberately excluded, matching the backend's
     own _is_blank_bulk_row rule exactly (every row always carries a
     default priority value from the select, which must never by itself
     make an otherwise-blank row count as filled). */
  function isBulkRowBlank(rowEl) {
    var title = (bulkRowFieldElement(rowEl, 'title').value || '').trim();
    var start = bulkRowFieldElement(rowEl, 'start').value;
    var end = bulkRowFieldElement(rowEl, 'end').value;
    var notes = (bulkRowFieldElement(rowEl, 'notes').value || '').trim();
    /* MULTIPLE TIME FRAMES PER TASK (2026-07-27) — a row with real content
       only in an additional time frame (frame 1/title/notes all blank)
       must still count as nonblank, mirroring the backend's own
       _is_blank_bulk_row fix for the same edge case. */
    var hasExtraFrameContent = getBulkRowTimeFrameExtraRows(rowEl).some(function (frameEl) {
      var startInput = frameEl.querySelector('.msc-time-frame-start');
      var endInput = frameEl.querySelector('.msc-time-frame-end');
      return (startInput && startInput.value) || (endInput && endInput.value);
    });
    return !title && !start && !end && !notes && !hasExtraFrameContent;
  }

  /* Mirrors the backend's own _bulk_row_field_errors rules exactly (same
     title/notes length limits, same end>start rule via timeToMinutes() —
     the same helper validateTaskTimeRange() already uses for the single
     Task form) — an early, non-authoritative check only; the backend
     always re-validates every row from scratch regardless of what this
     finds (Step 17: "does not replace backend validation"). */
  function bulkRowFieldErrors(rowEl) {
    var errors = [];
    /* REQ-CAL-BULK-DATES-001 (2026-08-03) — date validation now delegates
       to bulkRowGeneratedDates()/expandTaskDates() for every mode,
       including 'single'. This is a strict superset of the prior
       behavior: in single mode expandTaskDates({mode:'single',
       singleDate: dateEl.value}) returns exactly the same
       date_required error for an empty/invalid date that the old
       `if (!dateVal)` check produced (CONFIRMED ADD-ROW DATE RULE rule 6
       — a row with no Date is a plain required-field error, exactly like
       a missing title), so single-mode behavior is unchanged
       byte-for-byte; range/multiple mode now surface their own
       structured errors (empty range, inverted range, no weekdays
       selected, no dates selected, invalid date) through this exact same
       path instead of a generic "Choose a date" message. */
    var dateExpansion = bulkRowGeneratedDates(rowEl);
    if (dateExpansion.errors.length) {
      errors.push({ field: 'date', message: dateExpansion.errors[0].message });
    }
    var title = (bulkRowFieldElement(rowEl, 'title').value || '').trim();
    if (!title) {
      errors.push({ field: 'title', message: 'Enter a title for this task.' });
    } else if (title.length > 120) {
      errors.push({ field: 'title', message: 'Title must be 120 characters or fewer.' });
    }
    var notes = bulkRowFieldElement(rowEl, 'notes').value || '';
    if (notes.length > 240) {
      errors.push({ field: 'notes', message: 'Notes must be 240 characters or fewer.' });
    }
    /* MULTIPLE TIME FRAMES PER TASK (2026-07-27) — classifyTimeFrameSet()
       (core.js) supersedes the old bare end>start check here: it covers
       that same rule for "Time frame 1" (frames.length === 1 reduces to
       exactly the previous behavior) plus the new untimed-mode/duplicate/
       overlap rules once this row has additional time frames. Anchored on
       the 'end' field, matching this function's pre-existing convention
       for every time-related error.

       FRAME-LEVEL ERROR CONTEXT (2026-07-27): describeTimeFrameValidation
       (forBulk=true) supplies "Task N, time frame M: ..." wording once
       this row has more than one frame — timeFrameIndex is carried
       alongside so the caller (the Bulk submit handler below) can
       highlight the exact nested frame input via bulkFrameFieldElement,
       not just this row's primary Start/End pair. */
    var timeFrames = collectBulkRowTimeFrames(rowEl);
    var timeFrameResult = classifyTimeFrameSet(timeFrames);
    if (timeFrameResult.outcome !== 'ok') {
      var rowNumber = getBulkRows().indexOf(rowEl) + 1;
      var copy = describeTimeFrameValidation(timeFrameResult, timeFrames.length, true);
      var namedFrame = (timeFrameResult.outcome === 'duplicate' || timeFrameResult.outcome === 'overlap')
        ? timeFrameResult.b : timeFrameResult.a;
      var message = timeFrames.length > 1 ? ('Task ' + rowNumber + ', ' + lowercaseFirst(copy.message)) : copy.message;
      errors.push({ field: 'end', timeFrameIndex: namedFrame || 1, message: message });
    }
    return errors;
  }

  /* "Time frame 2: ..." -> "time frame 2: ..." — folds a
     describeTimeFrameValidation() message into a Bulk "Task N, " prefix
     without an awkward double capital, mirroring the backend's own
     _lowercase_first (member_schedules.py). */
  function lowercaseFirst(text) {
    return text ? (text.charAt(0).toLowerCase() + text.slice(1)) : text;
  }

  function bulkDuplicateKey(rowEl) {
    /* REQ-CAL-BULK-DATES-001 (2026-08-03) — this early, non-blocking hint
       can only ever compare ONE date per row (mirrors the backend's own
       per-row-date key exactly as before). A range/multiple-dates row
       generates several dates, so there is no single meaningful "this
       row's date" to key on any more — rather than key on an arbitrary
       one of those generated dates (which would produce a misleading
       hint that only ever caught one of several real collisions), such a
       row is deliberately given a unique, never-grouping key here. This
       does not weaken real duplicate protection in any way: the
       backend's authoritative per-generated-date duplicate check
       (performBulkSubmit -> POST .../bulk) still runs unchanged against
       every expanded row regardless of what this purely-cosmetic hint
       shows. */
    if (bulkRowDateMode(rowEl) !== 'single') {
      return 'multi-date-row:' + (rowEl.getAttribute('data-bulk-row-seq') || '');
    }
    var date = bulkRowFieldElement(rowEl, 'date').value || '';
    var title = (bulkRowFieldElement(rowEl, 'title').value || '').trim().toLowerCase();
    var start = bulkRowFieldElement(rowEl, 'start').value || '';
    var end = bulkRowFieldElement(rowEl, 'end').value || '';
    /* date is now part of the duplicate identity (mirrors the backend's
       own per-row-date key) — two rows sharing a title/time on DIFFERENT
       dates are no longer a duplicate, since each row can carry its own
       date. */
    return date + '|' + title + '|' + start + '|' + end;
  }

  /* Early, non-blocking warning only (Step 17 "identify duplicates within
     the current form for early warning") — mirrors the backend's own
     duplicate definition (_bulk_duplicate_key: trim+casefold title, HH:MM
     start/end) so this can never disagree with the authoritative check.
     Never blocks submission by itself; the actual confirm/reject decision
     always comes from the backend's duplicate_confirmation_required
     response (Step 8/9/10). */
  function refreshBulkDuplicateHints() {
    var rows = getBulkRows();
    var groups = {};
    rows.forEach(function (rowEl) {
      if (isBulkRowBlank(rowEl)) { return; }
      var key = bulkDuplicateKey(rowEl);
      if (!groups[key]) { groups[key] = []; }
      groups[key].push(rowEl);
    });
    rows.forEach(function (rowEl) { rowEl.classList.remove('msc-bulk-row-duplicate-hint'); });
    Object.keys(groups).forEach(function (key) {
      if (groups[key].length > 1) {
        groups[key].forEach(function (rowEl) { rowEl.classList.add('msc-bulk-row-duplicate-hint'); });
      }
    });
  }

  /* Every field EXCEPT `date` — title/priority/notes/time-frame(s) —
     entered once per card and copied verbatim to every generated date
     (approved design §6.4/§8). Read only once per row, never re-read per
     generated date, so every payload row this card produces is
     guaranteed field-identical apart from `date` (approved design §8
     item 2 / test-plan condition 4). Byte-for-byte the same field-
     building logic the pre-existing rowElToPayloadRow always used — only
     `date` itself has been factored out, since it is now the one field
     that legitimately varies per generated row. */
  function bulkRowSharedFields(rowEl) {
    var title = (bulkRowFieldElement(rowEl, 'title').value || '').trim();
    var notes = (bulkRowFieldElement(rowEl, 'notes').value || '').trim();
    var row = {
      title: title,
      priority: bulkRowFieldElement(rowEl, 'priority').value,
      notes: notes ? notes : null
    };
    /* MULTIPLE TIME FRAMES PER TASK (2026-07-27) — a row with no
       additional frames sends plain start/end exactly as this function
       has always built (byte-for-byte unchanged for the common
       one-time-frame-per-row case); one or more additional frames send
       the additive `time_frames` array instead (authoritative — start/end
       omitted entirely, mirroring frontendToMultiFramePayload in core.js). */
    var extraFrames = getBulkRowTimeFrameExtraRows(rowEl);
    if (extraFrames.length === 0) {
      var start = bulkRowFieldElement(rowEl, 'start').value;
      var end = bulkRowFieldElement(rowEl, 'end').value;
      row.start = start ? start : null;
      row.end = end ? end : null;
    } else {
      row.time_frames = collectBulkRowTimeFrames(rowEl).map(function (f) {
        return { start_time: f.start ? f.start : null, end_time: f.end ? f.end : null };
      });
    }
    return row;
  }

  /* REQ-CAL-BULK-DATES-001 (2026-08-03) — the payload-generation entry
     point for ONE .msc-bulk-row card: expand its date-selection mode into
     a list of dates (bulkRowGeneratedDates -> the pure, tested
     expandTaskDates() in core.js), then produce one existing
     BulkTaskRowIn-shaped object per generated date, sharing every other
     field verbatim (bulkRowSharedFields above). A single-date-mode card
     always produces exactly one row here — byte-for-byte the same object
     shape the old rowElToPayloadRow always built for that case (approved
     design §8 item 3 — single-date-mode behavior is unchanged).
     Never sends any date-mode metadata (mode/weekdays/etc.) to the
     backend — only the plain, existing per-row fields the endpoint has
     always accepted. Returns { rows, errors } — errors is the exact
     structured list from expandTaskDates(); callers must surface those
     inline and exclude this card from the submission entirely, never
     silently drop it with zero explanation. */
  function rowElToPayloadRows(rowEl) {
    var expansion = bulkRowGeneratedDates(rowEl);
    if (expansion.errors.length) { return { rows: [], errors: expansion.errors }; }
    var shared = bulkRowSharedFields(rowEl);
    return { rows: buildBulkPayloadRowsForDates(shared, expansion.dates), errors: [] }; // core.js, pure/tested
  }

  /* Step 15 (full-day-leave-blocks-create task, 2026-07-23; per-row gating
     added by the CONFIRMED ADD-ROW DATE RULE task, 2026-07-24) — the
     date-cell entry point's gate is entirely handled by
     openCreateChoiceFromCalendar()'s existing pre-open check above, which
     prevents the whole dialog from opening — Bulk Tasks never even
     renders in that case. Here the dialog may already be open with rows
     whose dates are still being chosen; each row's own Date field is
     gated independently by applyRowLeaveGate() (wired in
     wireBulkRowEvents() above), and updateBulkCreateButtonGate() disables
     submission as a whole whenever ANY nonblank row is currently blocked,
     without closing the dialog or discarding any entered row. The backend
     still authoritatively rechecks every row's own date regardless of
     this client-side gate. */
  if (bulkAddRowBtn) {
    bulkAddRowBtn.addEventListener('click', function () {
      /* CONFIRMED ADD-ROW DATE RULE rule 3 — the new row copies the
         IMMEDIATELY PREVIOUS row's current Date value at the moment of
         this click (never the original clicked Calendar date, never
         today, never one shared batch-wide value). Rule 6 — if that
         previous row's Date is itself blank, the blank is copied as-is;
         nothing here invents a date. */
      var rows = getBulkRows();
      var prevRow = rows.length ? rows[rows.length - 1] : null;
      var prevDateEl = prevRow ? bulkRowFieldElement(prevRow, 'date') : null;
      addBulkRow(prevDateEl ? prevDateEl.value : '');
      refreshBulkDuplicateHints();
      updateBulkCreateButtonGate();
    });
  }

  /* Applies the backend's structured row/field errors (Step 6/18) —
     status "validation_failed". Keeps the form open with every row and
     value intact, marks each affected row, and focuses the first failing
     field, exactly like the single Task form's own error handling. */
  /* Locates the exact input a Bulk hard-conflict error should highlight
     (FRAME-LEVEL ERROR CONTEXT, 2026-07-27) — time_frame_index 1 is
     always the row's own primary start/end pair (bulkRowFieldElement);
     2+ is the (N-2)th additional time-frame row within that Bulk row.
     Falls back to the row-level field when time_frame_index doesn't
     resolve to a real nested row (defensive only — should not happen for
     a well-formed response). */
  function bulkFrameFieldElement(rowEl, timeFrameIndex, field) {
    if (!timeFrameIndex || timeFrameIndex === 1) { return bulkRowFieldElement(rowEl, field); }
    var extraRows = getBulkRowTimeFrameExtraRows(rowEl);
    var frameEl = extraRows[timeFrameIndex - 2];
    if (!frameEl) { return bulkRowFieldElement(rowEl, field); }
    return frameEl.querySelector(field === 'end' ? '.msc-time-frame-end' : '.msc-time-frame-start');
  }

  function applyBulkRowErrors(errorList, positionMap) {
    var firstFieldEl = null;
    (errorList || []).forEach(function (e) {
      if (e.row == null) {
        /* APPROVED OCCURRENCE LIMIT (2026-07-27 owner approval) — the
           one whole-submission Bulk error with its own approved title
           ("Too many task times"); every other row==null error keeps the
           existing generic title. e.message already carries the
           approved Bulk-specific wording ("...across all Bulk Task
           rows...") built server-side (check_occurrence_limit,
           for_bulk=True). */
        var title = e.code === 'too_many_task_occurrences' ? 'Too many task times' : 'Tasks were not created';
        showToast({ type: 'error', title: title, message: e.message });
        return;
      }
      var rowEl = bulkRowFromPositionMap(positionMap, e.row);
      if (!rowEl) { return; }
      rowEl.classList.add('msc-bulk-row-error');
      /* FRAME-LEVEL ERROR CONTEXT (2026-07-27) — e.time_frame_index set
         means e.message already reads "Task N, time frame M: ..." (built
         server-side), so no extra "Row N — " prefix is added here (that
         would double up); absent (the pre-existing shape) keeps the
         original "Row N — <message>" convention unchanged. */
      var fieldEl = e.time_frame_index
        ? (bulkFrameFieldElement(rowEl, e.time_frame_index, e.field) || bulkRowFieldElement(rowEl, 'title'))
        : (bulkRowFieldElement(rowEl, e.field) || bulkRowFieldElement(rowEl, 'title'));
      var displayMessage = e.time_frame_index ? e.message : ('Row ' + e.row + ' — ' + e.message);
      if (fieldEl) {
        setFieldError(fieldEl, displayMessage);
        if (!firstFieldEl) { firstFieldEl = fieldEl; }
      }
    });
    showApiStatus(
      'Some task times need to be corrected. Fix the highlighted rows and submit again. No tasks were saved.',
      true, bulkPopupStatusEl
    );
    if (firstFieldEl && firstFieldEl.focus) { firstFieldEl.focus(); }
  }

  /* ── LUNCH-BREAK AND DIFFERENT-TITLE TASK-OVERLAP CONFIRMATION
     (2026-07-27; plain-language copy pass same day) ── One shared popup —
     reused by Single Task creation, Task editing, and Bulk Tasks — built on
     the same confirmDestructive() dialog the pre-existing Bulk
     duplicate-warning popup below already uses.
     buildScheduleConfirmationDialogContent (exact wording per the approved
     requirement) is a pure, DOM-free function and lives in core.js
     (imported above) so it can be unit-tested the same way this file's
     other pure helpers already are — see
     schedule-confirmation-message.test.mjs. */

  /* Plain ES5 shallow-merge (this file uses var/function throughout, no
     Object.assign/arrow functions elsewhere) — returns a new object with
     every own key of base, then every own key of overrides layered on
     top. Used only to attach confirmation_fingerprint onto an unmodified
     payload for a confirmed retry, never to mutate the original payload
     object a caller may still reference. */
  function mergeInto(base, overrides) {
    var merged = {};
    Object.keys(base || {}).forEach(function (key) { merged[key] = base[key]; });
    Object.keys(overrides || {}).forEach(function (key) { merged[key] = overrides[key]; });
    return merged;
  }

  /* onConfirm must return a Promise — confirmDestructive keeps the dialog
     open and busy until it settles (dialog.js), so a resubmitted request
     that itself returns a fresh schedule_confirmation_required (a new
     conflict appeared) can safely reopen a new confirmation popup from
     inside the same onConfirm callback without ever showing a stale one.

     `context` ('create' | 'edit' | 'bulk') selects both the closing
     question buildScheduleConfirmationDialogContent appends (Edit always
     closes with "Do you still want to save these changes?", overriding
     Create's own closing question — see core.js) and the action-specific
     primary button label the caller supplies via `confirmLabel` — "Go
     back" is always the secondary label; there is no generic "Continue
     anyway" any more, per the approved copy: Single Task create uses "Add
     task anyway", Task edit uses "Save changes anyway", Bulk Tasks uses
     "Add all tasks anyway". The Close (X) control is unaffected by any of
     this — it already resolves exactly like Go back (dialog.js
     settle(false), no write) and is left untouched here. */
  function showScheduleConfirmation(warnings, trigger, onConfirm, context, confirmLabel) {
    var content = buildScheduleConfirmationDialogContent(warnings, context);
    return confirmDestructive({
      title: 'Check this task time',
      message: content.message,
      listItems: content.listItems,
      footer: content.footer,
      confirmLabel: confirmLabel,
      cancelLabel: 'Go back',
      confirmVariant: 'primary',
      trigger: trigger,
      onConfirm: onConfirm
    });
  }

  /* Applies the backend's duplicate warnings (Step 9/10/11) — status
     "duplicate_confirmation_required". Reuses the shared confirmDestructive
     dialog with confirmVariant:'primary' (Create tasks anyway creates
     data, it never deletes anything). "Go back and review" resolves
     false: nothing is submitted, every row/value is kept, and the first
     warned row is focused. "Create tasks anyway" resubmits the identical
     batch with confirm_duplicates=true — the backend revalidates
     everything again inside its own transaction; this never trusts the
     warnings shown here as still current. */
  function showBulkDuplicateConfirmation(warnings, positionMap) {
    getBulkRows().forEach(function (rowEl) { rowEl.classList.remove('msc-bulk-row-duplicate-warning'); });
    var firstRowEl = null;
    (warnings || []).forEach(function (w) {
      (w.rows || []).forEach(function (rowNumber) {
        var rowEl = bulkRowFromPositionMap(positionMap, rowNumber);
        if (rowEl) {
          rowEl.classList.add('msc-bulk-row-duplicate-warning');
          if (!firstRowEl) { firstRowEl = rowEl; }
        }
      });
    });
    var detail = (warnings || []).map(function (w) { return w.message; }).join(' ');
    confirmDestructive({
      title: 'Possible duplicate tasks',
      message: 'Some rows match another row in this batch or a Task already saved for this ' +
        'member and date. Review the warnings before continuing. ' + detail,
      confirmLabel: 'Create tasks anyway',
      cancelLabel: 'Go back and review',
      confirmVariant: 'primary',
      trigger: bulkCreateBtn,
      onConfirm: function () {
        return performBulkSubmit(true).then(function () { return true; });
      }
    }).then(function (confirmed) {
      if (!confirmed && firstRowEl) {
        var titleEl = bulkRowFieldElement(firstRowEl, 'title');
        if (titleEl && titleEl.focus) { titleEl.focus(); }
      }
    });
  }

  /* The one place that actually calls the bulk endpoint — used both by
     the initial submit (confirmDuplicates=false) and the duplicate-
     confirmation dialog's "Create tasks anyway" (confirmDuplicates=true).
     Every row currently in the DOM contributes at least one entry, in
     card order, INCLUDING blank ones — this preserves the pre-existing
     one-entry-per-DOM-row invariant every backend row number depends on.
     REQ-CAL-BULK-DATES-001 (2026-08-03): a NONBLANK card whose date mode
     is range/multiple can now contribute MORE than one entry (one per
     generated date, in ascending date order — approved design §8 item
     3), so `positionMap` (parallel to `tasks`, built fresh on every call)
     is what `applyBulkRowErrors`/`showBulkDuplicateConfirmation` use to
     resolve a backend-reported array position back to the right DOM
     card — plain array-index parity with getBulkRows() no longer holds
     once any card has expanded to 2+ dates. */
  function bulkRowRawSingleDateValue(rowEl) {
    // Only single mode has one plain date value to fall back to for a
    // blank row; a blank range/multiple-mode card contributes date:null,
    // matching the pre-existing "an entirely blank row still submits one
    // row, date possibly null" behavior exactly.
    if (bulkRowDateMode(rowEl) !== 'single') { return null; }
    var dateEl = rowEl.querySelector('.msc-bulk-row-date');
    var val = dateEl ? dateEl.value : '';
    return val ? val : null;
  }

  function performBulkSubmit(confirmDuplicates, confirmationFingerprint) {
    var tasks = [];
    var positionMap = [];
    getBulkRows().forEach(function (rowEl) {
      if (isBulkRowBlank(rowEl)) {
        var blankShared = bulkRowSharedFields(rowEl);
        var blankRow = { date: bulkRowRawSingleDateValue(rowEl) };
        Object.keys(blankShared).forEach(function (key) { blankRow[key] = blankShared[key]; });
        tasks.push(blankRow);
        positionMap.push(rowEl);
        return;
      }
      var expansion = rowElToPayloadRows(rowEl);
      /* A nonblank card reaching here has already passed the pre-submit
         bulkRowFieldErrors() gate (zero date-selection errors) — this
         fallback only guards a stale/race edge case (DOM changed between
         that gate check and this call), and still contributes exactly
         one row rather than silently dropping the card and
         desynchronizing every later row's number. */
      if (expansion.errors.length) {
        var fallbackShared = bulkRowSharedFields(rowEl);
        var fallbackRow = { date: bulkRowRawSingleDateValue(rowEl) };
        Object.keys(fallbackShared).forEach(function (key) { fallbackRow[key] = fallbackShared[key]; });
        tasks.push(fallbackRow);
        positionMap.push(rowEl);
        return;
      }
      expansion.rows.forEach(function (payloadRow) {
        tasks.push(payloadRow);
        positionMap.push(rowEl);
      });
    });
    /* No top-level common `date` any more — every row carries its own
       (CONFIRMED ADD-ROW DATE RULE, 2026-07-24); the backend validates
       and stores each row against its own date (backend/schemas.py
       BulkTaskRowIn.date). confirmation_fingerprint (2026-07-27, LUNCH-BREAK
       AND DIFFERENT-TITLE TASK-OVERLAP CONFIRMATION) is only ever attached
       when resubmitting after a schedule_confirmation_required response —
       see the catch handler below. No date-mode metadata (mode/weekdays/
       selectedDates) is ever included — only the plain, existing per-row
       fields the endpoint has always accepted (approved design §8
       item 4). */
    var payload = { tasks: tasks, confirm_duplicates: !!confirmDuplicates };
    if (confirmationFingerprint) { payload.confirmation_fingerprint = confirmationFingerprint; }
    return apiRequest('POST', apiBase + '/bulk', payload).then(function (result) {
      (result.items || []).forEach(function (apiItem) { items.push(apiItemToFrontend(apiItem)); });
      var count = result.created_count != null ? result.created_count : (result.items || []).length;
      /* Single refresh (Step 19) — selectDate() is the same established
         one-call refresh entry point the single-Task form already uses:
         it re-renders the calendar grid, the Priority Queue preview, and
         the Tasks workspace (if active), exactly once, regardless of how
         many tasks were just created. Rows can now span different dates,
         so this refreshes around the first submitted row's date — a
         representative anchor, not a claim that every task shares one
         date. Schedule Summary no longer follows selectDate() (2026-07-24
         date-ownership task) — refreshSummary() below refreshes it
         separately, still anchored to the independent summaryDate, not to
         any of the just-created tasks' dates. */
      var firstTaskWithDate = tasks.filter(function (t) { return !!t.date; })[0];
      selectDate(firstTaskWithDate ? firstTaskWithDate.date : state.selectedDate);
      refreshSummary();
      resetBulkForm();
      closeCreatePopup();
      showToast({
        type: 'success',
        title: count === 1 ? '1 task created' : (count + ' tasks created'),
        message: 'Your tasks were added to the calendar.'
      });
    }).catch(function (err) {
      if (err.code === 'bulk_validation_failed') {
        clearBulkFormErrors();
        applyBulkRowErrors(err.errors, positionMap);
      } else if (err.code === 'bulk_duplicate_confirmation_required') {
        showBulkDuplicateConfirmation(err.warnings, positionMap);
      } else if (err.code === 'schedule_confirmation_required') {
        /* LUNCH-BREAK AND DIFFERENT-TITLE TASK-OVERLAP CONFIRMATION
           (2026-07-27) — independent bypass token from confirm_duplicates
           above (a batch can require both confirmations in sequence, one
           at a time). "Add all tasks anyway" resubmits the unchanged batch
           with confirmation_fingerprint; the backend fully revalidates
           (including hard rules) before ever writing. */
        showScheduleConfirmation(err.warnings, bulkCreateBtn, function () {
          return performBulkSubmit(confirmDuplicates, err.confirmationFingerprint).then(function () { return true; });
        }, 'bulk', 'Add all tasks anyway');
      } else {
        var mapped = mapApiError(err);
        showToast({ type: mapped.type, title: mapped.title, message: mapped.message, persistent: mapped.persistent });
      }
    });
  }

  if (bulkCreateBtn) {
    bulkCreateBtn.addEventListener('click', function () {
      /* Double-submission protection (Step 20) — bulkSubmitInFlight is an
         explicit re-entrancy guard on top of setButtonBusy()'s native
         `disabled` attribute (the same two-layer protection the single
         Task Add/Update buttons rely on via disabled alone; Bulk Tasks
         adds the explicit flag since Step 20 calls out Enter/repeated
         click specifically). */
      if (bulkSubmitInFlight) { return; }
      clearBulkFormErrors();
      showApiStatus('', false, bulkPopupStatusEl);

      var rowEls = getBulkRows();
      var nonblankEls = rowEls.filter(function (rowEl) { return !isBulkRowBlank(rowEl); });

      if (nonblankEls.length === 0) {
        showToast({ type: 'error', title: 'Add a task', message: 'Enter at least one task before submitting.' });
        return;
      }
      if (nonblankEls.length > MAX_BULK_TASK_ROWS) {
        showToast({
          type: 'error', title: 'Too many tasks',
          message: 'A maximum of ' + MAX_BULK_TASK_ROWS + ' tasks can be created in one submission.'
        });
        return;
      }

      /* Every row's own date is validated here (CONFIRMED ADD-ROW DATE
         RULE rule F/test F) — there is no top-level common date left to
         check once, up front, the way the old single msc-bulk-field-date
         gate did. A leave-blocked date is folded into the same row-level
         error styling/messaging as every other field error, anchored on
         that row's own Date field. */
      var hasError = false;
      nonblankEls.forEach(function (rowEl) {
        bulkRowFieldErrors(rowEl).forEach(function (fieldErr) {
          /* FRAME-LEVEL ERROR CONTEXT (2026-07-27) — timeFrameIndex, when
             present, targets the exact nested time-frame row a shape
             error belongs to, not just this row's primary Start/End
             pair. */
          var fieldEl = fieldErr.timeFrameIndex
            ? bulkFrameFieldElement(rowEl, fieldErr.timeFrameIndex, fieldErr.field)
            : bulkRowFieldElement(rowEl, fieldErr.field);
          if (fieldEl) { setFieldError(fieldEl, fieldErr.message); }
          rowEl.classList.add('msc-bulk-row-error');
          hasError = true;
        });
        if (applyRowLeaveGate(rowEl)) {
          var dateEl = bulkRowFieldElement(rowEl, 'date');
          if (dateEl) {
            setFieldError(dateEl, 'No new Task can be added on this date — it is covered by Full-Day or Multi-Day leave.');
          }
          rowEl.classList.add('msc-bulk-row-error');
          hasError = true;
        }
      });
      if (hasError) { focusFirstInvalid(bulkFormEl); return; }

      /* REQ-CAL-BULK-DATES-001 (2026-08-03) — combined generated-
         occurrence pre-submit block (approved design §9/§10, Phase 10).
         Every nonblank card has already been validated error-free above,
         so this is purely a magnitude check: Σ(generated dates × that
         card's own resolved time-frame count) across every card. This is
         an EARLY, non-authoritative check only — it never replaces the
         backend's own unchanged check_occurrence_limit() (still the sole
         authoritative gate for a client that bypasses this, e.g. a
         direct API call); it exists solely so a submission that would
         obviously be rejected server-side never even reaches the
         network. Zero requests are sent when this fires. */
      var totalOccurrences = totalBulkOccurrenceCount();
      if (totalOccurrences > MAX_TASK_OCCURRENCES_PER_SUBMISSION) {
        showToast({
          type: 'error',
          title: 'Too many task times',
          message: 'This submission would create ' + totalOccurrences + ' occurrences, which is more than the ' +
            MAX_TASK_OCCURRENCES_PER_SUBMISSION + ' allowed. Reduce the date ranges, weekdays, multiple dates, or time frames.'
        });
        return;
      }

      bulkSubmitInFlight = true;
      setButtonBusy(bulkCreateBtn, true, { busyLabel: 'Creating…' });
      /* Calendar member-token authorization busy-state correction
         (2026-07-31 UX correction): .finally() (not .then()) so the
         button is always restored — Cancel/invalid-token/network-
         failure/401/403 during the auth flow performBulkSubmit's own
         apiRequest call now goes through, exactly like a normal
         validation/server failure, never leaves "Creating…" stuck. */
      performBulkSubmit(false).finally(function () {
        bulkSubmitInFlight = false;
        setButtonBusy(bulkCreateBtn, false);
      });
    });
  }

  if (bulkCancelBtn) {
    bulkCancelBtn.addEventListener('click', function () {
      /* Cancel is frontend-only (Step 22 item 17) — no request is ever
         sent; resetBulkForm() only clears local form state. */
      resetBulkForm();
      closeCreatePopup();
    });
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

  /* ── Month-view click rules (google-calendar-inspired-management-
     calendar-ux task, 2026-07-22) ── A blank-cell click/keyboard
     activation always opens the Task/Leave Create chooser directly for
     that date, regardless of whether the date already has Tasks or
     Leave — no single/double-click distinction, no empty-day toast.
     Individual Task chips, Leave chips, and "+N more" each stop
     propagation (see their own click wiring below) so they never also
     trigger this cell-level handler. Month-view only: renderTimeGrid()
     (Week/Day) is untouched by this section. */
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
      /* A blank-cell click opens the Create chooser directly — no
         double-click, no delay. Task chips, Leave chips, and "+N more"
         each stop propagation in their own handlers below, so a click
         landing on one of those never also reaches this handler. */
      cell.addEventListener('click', go);
      cell.addEventListener('keydown', function (e) { if (isKeyActivation(e)) { e.preventDefault(); go(); } });
    });
    calGrid.querySelectorAll('.msc-cal-chip').forEach(function (chip) {
      var go = function (e) {
        e.stopPropagation();
        viewItem(chip.getAttribute('data-id'), chip);
      };
      chip.addEventListener('click', go);
      chip.addEventListener('keydown', function (e) { if (isKeyActivation(e)) { e.preventDefault(); go(e); } });
    });
    calGrid.querySelectorAll('.msc-cal-chip-more').forEach(function (chip) {
      var go = function (e) {
        e.stopPropagation();
        openMorePopup(chip.getAttribute('data-date'), chip);
      };
      chip.addEventListener('click', go);
      chip.addEventListener('keydown', function (e) { if (isKeyActivation(e)) { e.preventDefault(); go(e); } });
    });
    calGrid.querySelectorAll('.msc-cal-chip-leave').forEach(function (chip) {
      var go = function (e) {
        e.stopPropagation();
        viewLeaveItem(chip.getAttribute('data-leave-id'), chip);
      };
      chip.addEventListener('click', go);
      chip.addEventListener('keydown', function (e) { if (isKeyActivation(e)) { e.preventDefault(); go(e); } });
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
          .then(function () { renderActiveView(); refreshSummary(); })
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
          .then(function () { renderActiveView(); refreshSummary(); })
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

  var VIEW_LABEL = { month: 'Month', week: 'Week', day: 'Day' };

  /* Dropdown restored (toolbar-follow-up task, 2026-07-23) — back to
     aria-selected/role="option" on plain .msc-view-btn buttons (listbox
     semantics, matching the dropdown menu's role="listbox" container),
     plus keeping the trigger's visible label in sync. */
  function syncViewSwitcherButtons() {
    viewSwitcherBtns.forEach(function (b) {
      var active = b.getAttribute('data-view') === state.currentView;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (viewDropdownLabel) { viewDropdownLabel.textContent = VIEW_LABEL[state.currentView] || 'Month'; }
  }

  /* ── Month/Week/Day dropdown open/close (toolbar-follow-up task,
     2026-07-23) — same anchored-popover convention as the Create
     chooser/search panel (position:fixed, capture-phase outside-click,
     Escape). Unlike the earlier dropdown attempt, opening this one
     closes Search/Help/Settings first, and closeAllOwnPopovers() (used
     by view/mode changes and the cross-instance tab-switch event) closes
     it too — that coordination is what makes it close reliably now. ── */
  var viewDropdownOpen = false;
  function positionViewDropdown() {
    if (!viewDropdownTrigger || !viewDropdownMenu) { return; }
    var rect = viewDropdownTrigger.getBoundingClientRect();
    var menuWidth = viewDropdownMenu.offsetWidth || 120;
    var left = rect.right - menuWidth;
    if (left < 8) { left = 8; }
    viewDropdownMenu.style.position = 'fixed';
    viewDropdownMenu.style.top = (rect.bottom + 4) + 'px';
    viewDropdownMenu.style.left = left + 'px';
  }
  function onDocClickForViewDropdown(e) {
    if (viewDropdownTrigger && viewDropdownTrigger.contains(e.target)) { return; }
    if (viewDropdownMenu && viewDropdownMenu.contains(e.target)) { return; }
    closeViewDropdown();
  }
  function onViewDropdownKeydown(e) {
    if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); closeViewDropdown(viewDropdownTrigger); }
  }
  function openViewDropdown() {
    if (viewDropdownOpen || !viewDropdownMenu) { return; }
    closeSearchPanel();
    closeHelpPopup();
    closeSettingsPopup();
    viewDropdownOpen = true;
    viewDropdownMenu.hidden = false;
    positionViewDropdown();
    viewDropdownTrigger.setAttribute('aria-expanded', 'true');
    document.addEventListener('click', onDocClickForViewDropdown, true);
    document.addEventListener('keydown', onViewDropdownKeydown, true);
  }
  function closeViewDropdown(focusTarget) {
    if (!viewDropdownOpen || !viewDropdownMenu) { return; }
    viewDropdownOpen = false;
    viewDropdownMenu.hidden = true;
    viewDropdownTrigger.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', onDocClickForViewDropdown, true);
    document.removeEventListener('keydown', onViewDropdownKeydown, true);
    if (focusTarget && typeof focusTarget.focus === 'function') { returnFocus(focusTarget); }
  }
  if (viewDropdownTrigger) {
    viewDropdownTrigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (viewDropdownOpen) { closeViewDropdown(); } else { openViewDropdown(); }
    });
  }

  /* ── Arrow-key roving tabindex for a row of segmented-control buttons
     (professional-calendar-toolbar-redesign task, 2026-07-23, Step 6) —
     shared by the Month/Week/Day and Calendar/Tasks segmented controls
     below. Left/Right (and Up/Down, for consistency) move focus between
     the buttons in the group; activation is left to each button's own
     existing click handler. ── */
  function wireSegmentedArrowKeys(buttons) {
    var list = Array.prototype.slice.call(buttons);
    list.forEach(function (btn, i) {
      btn.addEventListener('keydown', function (e) {
        var delta = 0;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { delta = 1; }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { delta = -1; }
        else { return; }
        e.preventDefault();
        var next = list[(i + delta + list.length) % list.length];
        if (next && next.focus) { next.focus(); }
      });
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
      closeViewDropdown(viewDropdownTrigger);
    });
  });
  wireSegmentedArrowKeys(modeSwitchBtns);

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
    /* Bulk Tasks has no common Date field to sync any more (CONFIRMED
       ADD-ROW DATE RULE, 2026-07-24) — each row owns its own Date, only
       ever seeded at row-creation time via ensureBulkMinimumRows()/
       addBulkRow() (see the createTabBulkBtn click handler and
       openCreatePopup() above). A calendar-wide date-selection action
       (mini-picker, Today button, etc.) must never reach into an
       already-open Bulk Tasks row list and silently rewrite a row's date
       out from under the user — that would violate rule 5 (no live/
       linked date state). */
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
    state.dateManuallySelected = true;
    var d = parseDateStr(dateStr);
    state.anchorDate = d;
    state.viewYear = d.getFullYear();
    state.viewMonth = d.getMonth();
    selectedDateLabel.textContent = dateStr;
    syncSelectedDateToForms(dateStr);
    cancelEdit();
    renderActiveView();
    renderPriorityPreview();
    /* Step 20 (google-calendar-inspired-toolbar-and-tasks-workspace
       task, 2026-07-23) — keeps the Tasks workspace in sync with every
       Task create/update (both funnel through selectDate() already,
       see the comments at those call sites) without re-rendering it
       while it's off-screen in Calendar mode. */
    if (currentMode === 'tasks') { renderTasksWorkspace(); }
    /* Schedule Summary date-ownership task (2026-07-24) — selectDate()
       used to end with loadSummaries(dateStr) here, which meant every
       Calendar-cell click, mini-calendar click, and Today click reran
       Schedule Summary for whatever date the Calendar selected. Summary
       now owns its own reference date (state.summaryDate, see
       setSummaryDate/refreshSummary) and is refreshed only at its own
       explicit trigger points — never as a side effect of Calendar
       selection changing. */
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
      priorityListEl.innerHTML = '<p class="msc-empty">No priority items for today yet.</p>';
      return;
    }
    var html = '';
    todays.forEach(function (it) {
      var priority = it.priority || 'Medium';
      var badgeClass = PRIORITY_BADGE[priority] || 'badge-amber';
      var catClass = CATEGORY_CLASS[it.category] || 'task';
      html += '<div class="msc-item">';
      html += '<div><span class="badge ' + badgeClass + '" title="Priority level">' +
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

  /* token (Schedule Summary date-ownership task, 2026-07-24) — captured by
     loadSummaries() below at call time and re-checked once each request
     resolves; a response for a since-superseded summaryDate is dropped
     instead of overwriting a newer selection (STEP 13.J / stale-response
     protection). Title/loading-state updates happen synchronously so the
     visible header always matches the most recent call, even while an
     older request is still in flight. */
  function loadDailySummary(dateStr, token) {
    dailySummaryTitleEl.textContent = 'Daily — ' + dateStr;
    showInlineLoading(dailySummaryEl, 'Loading daily summary…');
    apiRequest('GET', apiBase + '/reports/daily?date=' + encodeURIComponent(dateStr)).then(function (report) {
      if (token !== state.summaryReqToken) { return; }
      renderSummaryStats(dailySummaryEl, report);
    }).catch(function (err) {
      if (token !== state.summaryReqToken) { return; }
      var mapped = mapApiError(err);
      dailySummaryEl.removeAttribute('aria-busy');
      dailySummaryEl.innerHTML = '<p class="msc-empty" role="alert">' + mapped.title + ' — ' + mapped.message + '</p>';
    });
  }

  function loadWeeklySummary(dateStr, token) {
    // Monday-Sunday convention (2026-07-14) — see getReportWeekStart.
    // The backend independently normalizes to the same Monday
    // regardless, but computing it correctly here means the title
    // and the request always agree with what the response reports.
    var weekStartStr = toDateStr(getReportWeekStart(parseDateStr(dateStr)));
    weeklySummaryTitleEl.textContent = 'Weekly — week of ' + weekStartStr;
    showInlineLoading(weeklySummaryEl, 'Loading weekly summary…');
    apiRequest('GET', apiBase + '/reports/weekly?week_start=' + encodeURIComponent(weekStartStr)).then(function (report) {
      if (token !== state.summaryReqToken) { return; }
      renderSummaryStats(weeklySummaryEl, report);
    }).catch(function (err) {
      if (token !== state.summaryReqToken) { return; }
      var mapped = mapApiError(err);
      weeklySummaryEl.removeAttribute('aria-busy');
      weeklySummaryEl.innerHTML = '<p class="msc-empty" role="alert">' + mapped.title + ' — ' + mapped.message + '</p>';
    });
  }

  function loadMonthlySummary(dateStr, token) {
    var d = parseDateStr(dateStr);
    var monthStr = d.getFullYear() + '-' + pad(d.getMonth() + 1);
    monthlySummaryTitleEl.textContent = 'Monthly — ' + monthStr;
    showInlineLoading(monthlySummaryEl, 'Loading monthly summary…');
    apiRequest('GET', apiBase + '/reports/monthly?month=' + encodeURIComponent(monthStr)).then(function (report) {
      if (token !== state.summaryReqToken) { return; }
      renderSummaryStats(monthlySummaryEl, report);
    }).catch(function (err) {
      if (token !== state.summaryReqToken) { return; }
      var mapped = mapApiError(err);
      monthlySummaryEl.removeAttribute('aria-busy');
      monthlySummaryEl.innerHTML = '<p class="msc-empty" role="alert">' + mapped.title + ' — ' + mapped.message + '</p>';
    });
  }

  function loadSummaries(dateStr) {
    state.summaryReqToken += 1;
    var token = state.summaryReqToken;
    loadDailySummary(dateStr, token);
    loadWeeklySummary(dateStr, token);
    loadMonthlySummary(dateStr, token);
  }

  /* Data-change refresh (STEP 9) — reloads Daily/Weekly/Monthly Summary
     using the current independent state.summaryDate. Never reads
     state.selectedDate or any Task/Leave-record date, so a Task or Leave
     change on a different day never moves what Summary is reporting on. */
  function refreshSummary() {
    if (state.summaryDate) { loadSummaries(state.summaryDate); }
  }

  /* Manual Summary date selector entry point (STEP 5/6) — the only two
     other writers of state.summaryDate are the initial-load default
     (Asia/Colombo today) and the member-mount default; Calendar-cell
     clicks, mini-calendar clicks, Today, Prev/Next, and view-switching
     never call this. */
  function setSummaryDate(dateStr) {
    if (!isValidDateStr(dateStr)) { return; }
    state.summaryDate = dateStr;
    if (summaryDateInput) { summaryDateInput.value = dateStr; }
    loadSummaries(dateStr);
  }

  function resetForm() {
    fieldTitle.value = '';
    updateTitleCounter();
    fieldPriority.value = 'Medium';
    fieldStart.value = '';
    fieldEnd.value = '';
    fieldNotes.value = '';
    resetTimeFrames();
    /* FINAL BUSINESS RULES (2026-07-24, closure review pass — Rule 8) —
       re-enable unconditionally so the disabled state editItem() applies
       below never leaks into a later Add-task flow, which always reuses
       this same shared form. */
    fieldDate.disabled = false;
    fieldDate.title = '';
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

  /* Task time-order / multiple-time-frames validation (calendar-popup-
     close-time-validation-task-list-return task, 2026-07-22; superseded
     2026-07-27 by MULTIPLE TIME FRAMES PER TASK — validateTimeFrames()
     above is now the single gate for both the classic end>start rule and
     the new untimed-mode/duplicate/overlap rules, replacing this
     function's narrower single-pair check). Kept only as the input
     listeners below that clear a stale error as the user retypes. */
  if (fieldStart) { fieldStart.addEventListener('input', function () { clearFieldError(fieldEnd); }); }
  if (fieldEnd) { fieldEnd.addEventListener('input', function () { clearFieldError(fieldEnd); }); }

  /* Single Task create — the actual POST call, shared by the initial
     submit and the "Continue anyway" confirmed retry below (LUNCH-BREAK
     AND DIFFERENT-TITLE TASK-OVERLAP CONFIRMATION, 2026-07-27). No
     optimistic Calendar insertion happens anywhere in this function except
     inside the success branch — a confirmation-required response, or the
     user cancelling that popup, never touches `items`/the Calendar/the
     form/a success toast. */
  function performTaskCreate(payload, addedDate) {
    return apiRequest('POST', apiBase, payload).then(function (apiResult) {
      /* MULTIPLE TIME FRAMES PER TASK (2026-07-27) — a single-frame
         submission still returns the bare MemberScheduleEventOut object
         this endpoint has always returned; two or more frames return
         {status:"created", created_count, items}, mirroring the Bulk
         response shape. Either way, every created occurrence is pushed
         into `items` and the Calendar refreshes exactly once — no
         optimistic partial insertion, no per-frame success toast. */
      var apiItems = (apiResult && apiResult.items) ? apiResult.items : [apiResult];
      apiItems.forEach(function (apiItem) { items.push(apiItemToFrontend(apiItem)); });
      selectDate(addedDate);
      refreshSummary();
      resetForm();
      closeTaskPopup();
      if (apiItems.length > 1) {
        showToast({
          type: 'success', title: 'Tasks added',
          message: apiItems.length + ' task time frames were added successfully.'
        });
      } else {
        showToast({ type: 'success', title: 'Task created', message: 'Your task was added to the calendar.' });
      }
    }).catch(function (err) {
      if (err.code === 'schedule_confirmation_required') {
        return showScheduleConfirmation(err.warnings, addBtn, function () {
          var confirmedPayload = mergeInto(payload, { confirmation_fingerprint: err.confirmationFingerprint });
          return performTaskCreate(confirmedPayload, addedDate);
        }, 'create', 'Add task anyway');
      }
      var mapped = mapApiError(err);
      /* FRAME-LEVEL ERROR CONTEXT (2026-07-27) — a hard conflict
         attributable to one specific time frame (err.timeFrameIndex set)
         shows the backend's own "Time frame N: ..." message instead of
         the generic mapped text, and highlights that exact frame's End
         input — mirrors validateTimeFrames()'s own inline-error pattern.
         err.timeFrameIndex is null for the pre-existing single-occurrence
         case, so that case is completely unaffected (byte-identical to
         before this task). */
      var displayMessage = err.timeFrameIndex ? err.message : mapped.message;
      if (err.timeFrameIndex) {
        var frameTarget = inputForFrame(err.timeFrameIndex);
        if (frameTarget) { setFieldError(frameTarget, displayMessage); }
      }
      if (err.code === 'leave_conflict') {
        showApiStatus(mapped.title + ' — ' + displayMessage, true, taskPopupStatusEl);
      } else {
        showToast({ type: mapped.type, title: mapped.title, message: displayMessage, persistent: mapped.persistent });
      }
    });
  }

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
    if (!validateTimeFrames()) { hasError = true; }
    if (hasError) { focusFirstInvalid(formEl); return; }
    var payload = frontendToMultiFramePayload({
      date: fieldDate.value,
      title: fieldTitle.value.trim(),
      priority: fieldPriority.value,
      notes: fieldNotes.value.trim(),
      frames: collectTimeFrames()
    });
    var addedDate = fieldDate.value;
    setButtonBusy(addBtn, true, { busyLabel: 'Saving…' });
    showApiStatus('', false, taskPopupStatusEl);
    /* .finally() (2026-07-31 UX correction) — always restores the button
       regardless of success/failure, including any Cancel/invalid-token/
       network-failure/401/403 that occurs during apiRequest's own
       ensureAuthorized() step inside performTaskCreate. */
    performTaskCreate(payload, addedDate).finally(function () { setButtonBusy(addBtn, false); });
  });

  function editItem(id) {
    var it = items.filter(function (x) { return x.id === id; })[0];
    if (!it) { return; }
    state.editingId = id;
    fieldDate.value = it.date;
    /* FINAL BUSINESS RULES (2026-07-24, closure review pass — Rule 8):
       once any outcome is recorded, the task's date can never change
       again — backend-enforced (update_member_schedule_event's 409
       outcome_recorded_immutable) regardless of this client-side disable;
       this is the frontend "clearly locked" presentation the rule also
       asks for. Title/priority/time/notes stay fully editable either way
       (the explicit carve-out from Rule 8). */
    fieldDate.disabled = !!it.outcome;
    fieldDate.title = it.outcome
      ? 'This task’s date can’t be changed — an outcome has already been recorded for it.'
      : '';
    fieldTitle.value = it.title;
    updateTitleCounter();
    fieldPriority.value = it.priority || 'Medium';
    fieldStart.value = it.start || '';
    fieldEnd.value = it.end || '';
    fieldNotes.value = it.notes || '';
    /* MULTIPLE TIME FRAMES PER TASK, Task Edit surface (2026-07-27) —
       the occurrence being edited is always Time frame 1 (fieldStart/
       fieldEnd above); any additional-frame rows from a previous form
       session are always discarded here (PHASE 12: editing one occurrence
       never auto-discovers or pre-loads any other same-title/date row —
       "+ Add another time" only ever creates brand-new occurrences). */
    resetTimeFrames();
    addBtn.style.display = 'none';
    updateBtn.style.display = '';
    cancelBtn.style.display = '';
    /* Edit (from the task-detail popup's Edit button, or directly)
       opens the same single Task popup the fields above just
       populated — the form only exists inside the popup, so without
       this the fields would be filled while hidden. */
    openTaskPopup();
  }

  /* Task edit — the actual PUT call, shared by the initial submit and the
     "Continue anyway" confirmed retry below (LUNCH-BREAK AND
     DIFFERENT-TITLE TASK-OVERLAP CONFIRMATION, 2026-07-27). `it` is looked
     up fresh by id (rather than captured once by the caller) since no
     write has happened yet by the time a confirmed retry runs — the
     `items` array is guaranteed unchanged in between. */
  function performTaskUpdate(payload, editingId) {
    return apiRequest('PUT', apiBase + '/' + encodeURIComponent(editingId), payload).then(function (apiResult) {
      /* MULTIPLE TIME FRAMES PER TASK, Task Edit surface (2026-07-27) —
         no additional_time_frames still returns the bare
         MemberScheduleEventOut this endpoint has always returned; one or
         more added frames return {status:"updated", created_count,
         items}, where items[0] is the edited occurrence itself (frame 1)
         and every remaining entry is a brand-new sibling occurrence —
         see update_member_schedule_event. Existing sibling occurrences
         not loaded into this edit are never touched, so only these
         specific entries are applied to the local `items` array. */
      var apiItems = (apiResult && apiResult.items) ? apiResult.items : [apiResult];
      var it = items.filter(function (x) { return x.id === editingId; })[0];
      var updated = apiItemToFrontend(apiItems[0]);
      var idx = it ? items.indexOf(it) : -1;
      if (idx !== -1) { items[idx] = updated; }
      apiItems.slice(1).forEach(function (apiItem) { items.push(apiItemToFrontend(apiItem)); });
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
      refreshSummary();
      cancelEdit();
      closeTaskPopup();
      if (flowOrigin && flowOrigin.type === 'more-task-list') {
        reopenTaskListOrigin(flowOrigin);
      }
      if (apiItems.length > 1) {
        showToast({
          type: 'success', title: 'Tasks added',
          message: (apiItems.length - 1) + ' additional task time frames were added successfully.'
        });
      } else {
        showToast({ type: 'success', title: 'Task updated', message: 'Your changes were saved.' });
      }
    }).catch(function (err) {
      if (err.code === 'schedule_confirmation_required') {
        return showScheduleConfirmation(err.warnings, updateBtn, function () {
          var confirmedPayload = mergeInto(payload, { confirmation_fingerprint: err.confirmationFingerprint });
          return performTaskUpdate(confirmedPayload, editingId);
        }, 'edit', 'Save changes anyway');
      }
      var mapped = mapApiError(err);
      /* FRAME-LEVEL ERROR CONTEXT (2026-07-27) — see performTaskCreate's
         matching catch handler above for the full rationale. Edit never
         labels its selected occurrence "Task 1" (PHASE 6) — the backend
         message here only ever says "Time frame N: ...", never "Task N,
         time frame M: ...", so no extra transformation is needed here. */
      var displayMessage = err.timeFrameIndex ? err.message : mapped.message;
      if (err.timeFrameIndex) {
        var frameTarget = inputForFrame(err.timeFrameIndex);
        if (frameTarget) { setFieldError(frameTarget, displayMessage); }
      }
      if (err.code === 'leave_conflict') {
        showApiStatus(mapped.title + ' — ' + displayMessage, true, taskPopupStatusEl);
      } else {
        showToast({ type: mapped.type, title: mapped.title, message: displayMessage, persistent: mapped.persistent });
      }
    });
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
    if (!validateTimeFrames()) { hasUpdateError = true; }
    if (hasUpdateError) { focusFirstInvalid(formEl); return; }
    var timeFrames = collectTimeFrames();
    var payload = frontendToEditPayload({
      date: fieldDate.value,
      title: fieldTitle.value.trim(),
      priority: fieldPriority.value,
      start: timeFrames[0].start,
      end: timeFrames[0].end,
      notes: fieldNotes.value.trim(),
      additionalFrames: timeFrames.slice(1)
    });
    var editingId = state.editingId;
    setButtonBusy(updateBtn, true, { busyLabel: 'Saving…' });
    showApiStatus('', false, taskPopupStatusEl);
    /* .finally() (2026-07-31 UX correction) — see performTaskCreate's
       call site above for the full rationale. */
    performTaskUpdate(payload, editingId).finally(function () { setButtonBusy(updateBtn, false); });
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
    /* Calendar member-token authorization — cross-member pre-block
       (2026-07-31 UX correction): gated BEFORE confirmDestructive() ever
       opens, so a cross-member attempt never shows the delete
       confirmation dialog and never sends a request. A blocked gate
       resolves false here, which every existing caller (viewDeleteBtn's
       click handler below) already treats identically to "the user
       declined the confirmation" — no new return-value shape, no changed
       caller code needed. */
    return guardMutationAccess(memberKey).then(function (allowed) {
      if (!allowed) { return false; }
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
            if (currentMode === 'tasks') { renderTasksWorkspace(); }
            refreshSummary();
            showToast({ type: 'success', title: 'Task deleted', message: 'The task was removed.' });
            return true;
          }).catch(function (err) {
            var mapped = mapApiError(err);
            showToast({ type: mapped.type, title: mapped.title, message: mapped.message, persistent: mapped.persistent });
            return false;
          });
        }
      });
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
    /* Modal background scroll lock (popup-detail-close-and-scroll-
       containment task, 2026-07-23) — only the centered presentation
       is a true modal; besideList is the anchored, non-blocking
       presentation (transparent/click-through backdrop, see the
       msc-view-modal--beside-list CSS below) and never locks the page,
       so it must not unlock it here either. Captured before the class
       is stripped just below. */
    var wasOpen = viewModal.classList.contains('show');
    var wasBesideList = viewModal.classList.contains('msc-view-modal--beside-list');
    viewModal.classList.remove('show');
    if (wasOpen && !wasBesideList) { unlockBodyScroll(); }
    /* Strip the side-by-side positioning modifier (Image E, 2026-07-23
       google-inspired-task-leave-popup-ui task) unconditionally on every
       close — otherwise a later direct-calendar/narrow-viewport open
       (which never sets it) could inherit a stale fixed position and
       transparent backdrop from a previous beside-list open. */
    viewModal.classList.remove('msc-view-modal--beside-list');
    viewModal.style.left = '';
    viewModal.style.top = '';
    viewModal.removeEventListener('keydown', onViewModalKeydown);
    currentViewItemId = null;
    var trigger = lastFocusedTrigger;
    var flowOrigin = taskFlowOrigin;
    lastFocusedTrigger = null;
    taskFlowOrigin = null;
    if (flowOrigin && flowOrigin.type === 'more-task-list') {
      /* Reopening the list here (Step 8/9's existing rebuild) already
         satisfies "Close returns focus to the selected row" whether or
         not the list was ever actually closed by openMorePopup()'s
         side-by-side path below — the rebuild is idempotent (same date/
         scroll position/focused row) so re-running it is safe even when
         morePopupOpen is still true. */
      reopenTaskListOrigin(flowOrigin);
    } else {
      returnFocus(trigger);
    }
  }

  /* Anchors the Task-detail popup beside the still-open "+N more" list
     (Image E, 2026-07-23 google-inspired-task-leave-popup-ui task) —
     same viewport-clamping technique as positionMorePopup() above.
     Prefers the space to the right of the list; falls right-to-left
     against the viewport edge when there isn't room, same as
     positionMorePopup()'s own left-clamp. Only ever called when
     morePopupOverlay is actually open and visible. */
  function positionViewModalBesideList() {
    var modalEl = viewModal.querySelector('.msc-modal');
    if (!modalEl || !morePopupOverlay) { return; }
    var listRect = morePopupOverlay.getBoundingClientRect();
    var modalWidth = modalEl.offsetWidth || 360;
    var left = listRect.right + 12;
    if (left + modalWidth > window.innerWidth - 8) {
      left = Math.max(8, listRect.left - modalWidth - 12);
    }
    if (left < 8) { left = Math.max(8, window.innerWidth - modalWidth - 8); }
    var top = listRect.top;
    var modalHeight = modalEl.offsetHeight || 260;
    if (top + modalHeight > window.innerHeight - 8) {
      top = Math.max(MORE_POPUP_TOP_CLAMP, window.innerHeight - modalHeight - 8);
    }
    top = Math.max(MORE_POPUP_TOP_CLAMP, top);
    modalEl.style.position = 'fixed';
    modalEl.style.left = left + 'px';
    modalEl.style.top = top + 'px';
  }

  function repositionViewModalBesideListIfOpen() {
    if (viewModal.classList.contains('show') && viewModal.classList.contains('msc-view-modal--beside-list')) {
      positionViewModalBesideList();
    }
  }
  window.addEventListener('resize', repositionViewModalBesideListIfOpen);

  /* The ONE shared task-detail popup for Month/Week/Day/all-day/"+N
     more" (Step 5) — every call site above (Month chip, Week/Day timed
     block via attachDragHandlers, all-day chip, more-popup row) already
     calls this same function; nothing view-specific is duplicated here.
     Fields are the existing Task fields only — no new field invented.
     `origin` (calendar-popup-close-time-validation-task-list-return
     task, 2026-07-22) — optional third argument, only ever passed by
     the "+N more" list's row handler below; every direct-calendar call
     site is unchanged (2-arg calls), which correctly resets
     taskFlowOrigin to null (direct-calendar) for them.
     `besideList` (Image E, 2026-07-23) — optional fourth argument, true
     only when openMorePopup()'s row handler decided (desktop viewport,
     list still open) to keep the "+N more" list visible instead of
     closing it first; every other call site is unchanged (still passes
     at most 3 args), so this only ever affects that one path. */
  /* Reason-entry form show/hide (FINAL CONFIRMED REASON-TRANSITION RULE,
     2026-07-24). Declared before renderOutcome() below since renderOutcome
     always resets to the hidden state on every (re)render — the single
     place the form can become visible is the Mark Uncompleted click
     handler further down. */
  var OUTCOME_REASON_MAX_LENGTH = 250;

  /* Visible character counter (STEP 7) — purely informational, mirrors
     the existing Title counter (updateTitleCounter() above) exactly;
     maxlength="250" on the textarea itself is what actually enforces the
     limit client-side (the backend enforces it authoritatively either
     way — see TaskOutcomeUpdate, backend/schemas.py). */
  function updateOutcomeReasonCounter() {
    if (!viewOutcomeReasonCounter || !viewOutcomeReasonInput) { return; }
    viewOutcomeReasonCounter.textContent = viewOutcomeReasonInput.value.length + ' / ' + OUTCOME_REASON_MAX_LENGTH;
  }

  function hideOutcomeReasonForm() {
    if (!viewOutcomeReasonForm) { return; }
    viewOutcomeReasonForm.hidden = true;
    /* Live-feedback fix (2026-07-24, post-deploy): restore the Mark
       Completed/Mark Uncompleted toggle row once the reason form closes —
       see showOutcomeReasonForm() below for why it was hidden. Guarded
       against outcome_locked so a locked task's buttons never reappear
       enabled mid-flow; renderOutcome() (the only other caller of this
       function) always re-applies the correct disabled state right after
       anyway, but this keeps hideOutcomeReasonForm() correct on its own
       too, e.g. when Cancel is clicked directly. */
    if (viewOutcomeActions) { viewOutcomeActions.hidden = false; }
    if (viewOutcomeReasonInput) {
      viewOutcomeReasonInput.value = '';
      clearFieldError(viewOutcomeReasonInput);
      updateOutcomeReasonCounter();
    }
  }

  function showOutcomeReasonForm(prefill) {
    if (!viewOutcomeReasonForm || !viewOutcomeReasonInput) { return; }
    viewOutcomeReasonForm.hidden = false;
    /* Live-feedback fix (2026-07-24, post-deploy): hide the Mark
       Completed/Mark Uncompleted toggle row while the reason form is
       open — leaving it visible produced two differently-styled buttons
       both labelled "Mark Uncompleted" on screen at once (the ghost
       toggle above, the primary submit button inside the form below),
       reported as confusing during live browser testing. Only one
       outcome control surface is shown at a time now. */
    if (viewOutcomeActions) { viewOutcomeActions.hidden = true; }
    viewOutcomeReasonInput.value = prefill || '';
    clearFieldError(viewOutcomeReasonInput);
    updateOutcomeReasonCounter();
    viewOutcomeReasonInput.focus();
  }

  if (viewOutcomeReasonInput) {
    viewOutcomeReasonInput.addEventListener('input', function () {
      clearFieldError(viewOutcomeReasonInput);
      updateOutcomeReasonCounter();
    });
  }

  /* Task outcome display (CONFIRMED UNTOUCHED-TASK OUTCOME, 2026-07-24).
     it.outcome_status/it.outcome_locked are always backend-derived (see
     apiItemToFrontend, core.js) — this only renders values already
     computed server-side, it never decides Pending/No response itself.
     Shared by viewItem() (initial open) and setTaskOutcome()'s success
     handler (in-place refresh after Mark Completed/Uncompleted) so the
     two can never disagree on how outcome state is displayed.

     FINAL BUSINESS RULES (2026-07-24, closure review pass — STEP 5): the
     reason, outcome-updated-at, and outcome-updated-by now each render as
     their own line (viewOutcomeReasonDisplay/viewOutcomeUpdatedAt/
     viewOutcomeUpdatedBy) rather than appended to the status line —
     hidden entirely when there is nothing to show. it.outcome_reason is
     always null once outcome is null/'Completed' (backend-enforced), so
     "do not display a stale Uncompleted reason when outcome is Completed"
     holds simply because there is nothing left to display; this function
     never retains or reuses a previously-shown reason string. Every
     (re)render also resets the reason-entry form to hidden — it only
     becomes visible via an explicit Mark Uncompleted click (below), never
     as a side effect of opening/reopening Task Details.

     outcome_updated_at is converted to Asia/Colombo via the existing
     formatTaskTimestamp() (core.js) — the same converter Created/Updated
     at already use — never a browser-local or newly-generated time.
     outcome_updated_by is rendered exactly as the API returned it (the
     canonical member_key) — never inferred from this calendar instance's
     own memberKey, even though the two are the same in every case this
     app's single-actor model can currently produce. */
  function renderOutcome(it) {
    if (!viewOutcome) { return; }
    var status = it.outcome_status || 'Pending';
    /* Colored status badge (live UI/UX feedback, 2026-07-24) — same
       outcomeStatusBadgeClass() mapping and .badge/.badge-* classes the
       Tasks workspace rows use, so "Outcome: Completed" reads the same
       way (green pill) wherever it's shown, instead of Task Details
       using plain, uncolored text while the list uses a colored badge
       for the identical status. escapeHtml() guards the interpolated
       status text since this is now innerHTML, not textContent. */
    viewOutcome.innerHTML = 'Outcome: <span class="badge ' + outcomeStatusBadgeClass(status) + '">' +
      escapeHtml(status) + '</span>';

    if (viewOutcomeReasonDisplay) {
      var hasReason = status === 'Uncompleted' && !!it.outcome_reason;
      viewOutcomeReasonDisplay.hidden = !hasReason;
      viewOutcomeReasonDisplay.textContent = hasReason ? 'Reason: ' + it.outcome_reason : '';
    }
    var hasAuditTrail = it.outcome === 'Completed' || it.outcome === 'Uncompleted';
    if (viewOutcomeUpdatedAt) {
      viewOutcomeUpdatedAt.hidden = !hasAuditTrail;
      viewOutcomeUpdatedAt.textContent = hasAuditTrail
        ? 'Outcome updated at: ' + formatTaskTimestamp(it.outcome_updated_at) : '';
    }
    if (viewOutcomeUpdatedBy) {
      viewOutcomeUpdatedBy.hidden = !hasAuditTrail;
      viewOutcomeUpdatedBy.textContent = hasAuditTrail
        ? 'Outcome updated by: ' + (it.outcome_updated_by || 'Not available') : '';
    }

    /* Outcome availability toast fix (screenshot-derived defect,
       2026-07-24): the buttons are deliberately never given the native
       `disabled` attribute — that suppressed every click/keyboard event
       silently, so an unavailable (future/past) task's buttons looked
       identical to an active one and clicking them explained nothing.
       aria-disabled + .msc-btn-unavailable keep them mouse/keyboard
       reachable so the click handlers below can show the explanatory
       toast; getOutcomeAvailability() (below) recomputes future/current/
       past from it.date vs the live Colombo "today" on every render, the
       same comparison renderTasksWorkspace()'s dateRelation already uses,
       rather than only the coarser backend it.outcome_locked boolean
       (which cannot distinguish future from past). */
    var availability = getOutcomeAvailability(it);
    var outcomeUnavailable = availability !== 'current';
    var outcomeUnavailableTitle = availability === 'future' ? 'Available on the Task date'
      : (availability === 'past' ? 'Outcome update window closed' : '');
    if (viewOutcomeCompletedBtn) {
      viewOutcomeCompletedBtn.setAttribute('aria-disabled', outcomeUnavailable ? 'true' : 'false');
      viewOutcomeCompletedBtn.classList.toggle('msc-btn-unavailable', outcomeUnavailable);
      viewOutcomeCompletedBtn.title = outcomeUnavailableTitle;
      viewOutcomeCompletedBtn.classList.toggle('msc-btn-primary', it.outcome === 'Completed');
      viewOutcomeCompletedBtn.classList.toggle('msc-btn-ghost', it.outcome !== 'Completed');
    }
    if (viewOutcomeUncompletedBtn) {
      viewOutcomeUncompletedBtn.setAttribute('aria-disabled', outcomeUnavailable ? 'true' : 'false');
      viewOutcomeUncompletedBtn.classList.toggle('msc-btn-unavailable', outcomeUnavailable);
      viewOutcomeUncompletedBtn.title = outcomeUnavailableTitle;
      viewOutcomeUncompletedBtn.classList.toggle('msc-btn-primary', it.outcome === 'Uncompleted');
      viewOutcomeUncompletedBtn.classList.toggle('msc-btn-ghost', it.outcome !== 'Uncompleted');
    }
    hideOutcomeReasonForm();
  }

  /* Future/current/past classification for outcome-action availability
     (screenshot-derived defect, 2026-07-24) — string comparison of two
     YYYY-MM-DD values is safe (lexicographic order matches calendar
     order), same technique renderTasksWorkspace()'s dateRelation already
     uses. Always reads getColomboTodayStr() fresh at call time rather
     than a cached value, so a popup left open across the Colombo
     midnight boundary (STEP 9, long-open popup) is re-evaluated correctly
     on its next render or action — never only the state captured when
     the popup opened. */
  function getOutcomeAvailability(it) {
    var todayStr = getColomboTodayStr();
    if (it.date > todayStr) { return 'future'; }
    if (it.date < todayStr) { return 'past'; }
    return 'current';
  }

  function formatTaskDateForToast(dateStr) {
    var d = parseDateStr(dateStr);
    return MONTH_NAMES[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  /* Shown instead of sending any request when a Mark Completed/Uncompleted
     click/Enter/Space is caught by the availability gate in the two click
     handlers below. persistent: true — the user must notice and act
     differently (open the task on its own date), never auto-dismissed. */
  function showOutcomeUnavailableToast(it, availability) {
    var formattedDate = formatTaskDateForToast(it.date);
    if (availability === 'future') {
      showToast({
        type: 'error',
        title: 'Outcome not available yet',
        message: 'You can update this task on its scheduled date: ' + formattedDate + '.',
        persistent: true
      });
    } else {
      showToast({
        type: 'error',
        title: 'Outcome update closed',
        message: 'This task could only be updated before 11:59:59 PM on ' + formattedDate + '.',
        persistent: true
      });
    }
  }

  /* Sets/changes a task's outcome via the dedicated PUT .../outcome
     endpoint (never the general Task update endpoint — outcome is
     orthogonal to date/title/priority/time/notes editing and must never
     touch category/classification, per backend/routers/member_schedules.py
     update_member_schedule_event_outcome's docstring). The backend
     independently re-enforces the deadline lock (409 outcome_locked) even
     though the click handlers below already gate on the same date check
     client-side (getOutcomeAvailability()) — this call path exists for
     the narrow case where the popup was left open across the Colombo
     midnight boundary. reason is sent verbatim
     (null for Completed, the trimmed text for Uncompleted — both already
     validated/normalized by the callers below before this is invoked).
     Returns a Promise<boolean> (true only on a confirmed, successful
     write) so the Mark-Completed-from-Uncompleted confirmation dialog
     (below) can use it directly as its onConfirm handler, matching
     deleteItem()'s existing "onConfirm returns a boolean" convention —
     a failed write leaves the confirmation dialog open with its busy
     state reset, exactly like a failed delete. */
  function setTaskOutcome(id, outcome, reason, triggerBtn) {
    var it = items.filter(function (x) { return x.id === id; })[0];
    if (!it) { return Promise.resolve(false); }
    var wasOutcome = it.outcome;
    setButtonBusy(triggerBtn, true, { busyLabel: 'Saving…' });
    return apiRequest('PUT', apiBase + '/' + encodeURIComponent(id) + '/outcome', { outcome: outcome, reason: reason || null })
      .then(function (apiItem) {
        var updated = apiItemToFrontend(apiItem);
        var idx = items.indexOf(it);
        if (idx !== -1) { items[idx] = updated; }
        /* Success copy (screenshot-derived defect follow-through,
           2026-07-24) — a reason resubmit while already Uncompleted reads
           as an edit ("reason updated"), never as if the task had just
           newly transitioned to Uncompleted; wasOutcome is read above
           before the PUT, since `it` (and outcome) below reflect the
           already-updated state. */
        var successMessage = outcome === 'Completed'
          ? 'Task marked as completed.'
          : (wasOutcome === 'Uncompleted' ? 'Uncompleted reason updated.' : 'Task marked as uncompleted.');
        showToast({ type: 'success', title: 'Outcome updated', message: successMessage });
        /* Live feedback (2026-07-24, post-deploy): close Task Details on
           any successful outcome write (Completed, Uncompleted-with-
           reason, or a reason resubmit) and refresh the Tasks workspace
           list immediately, rather than leaving the popup open showing
           the just-updated state — mirrors the existing deleteItem()
           success path (closeViewModal() + conditional
           renderTasksWorkspace()), the only other place in this file a
           Task mutation returns the user to the list. Calendar Month/
           Week/Day chips and Today's Priorities never render outcome
           data (badges/reason/timestamp/actor are Tasks-workspace- and
           Task-Details-only, per the confirmed display-surface scope),
           so renderActiveView()/renderPriorityPreview()/refreshSummary()
           are deliberately not called here — nothing in them would
           change. */
        closeViewModal();
        if (currentMode === 'tasks') { renderTasksWorkspace(); }
        return true;
      })
      .catch(function (err) {
        var mapped = mapApiError(err);
        /* Generic-failure copy (STEP 4, screenshot-derived defect,
           2026-07-24) — the three outcome-specific codes (err.code, set
           by apiRequest() above) already carry accurate, specific
           KNOWN_ERRORS copy (ui/error-mapper.js); anything else (network/
           server/validation/unknown) is overridden here, scoped to only
           this outcome-update flow, so the shared generic KNOWN_ERRORS
           entries other flows (Leave, Task create/update, Bulk Tasks)
           still rely on are never changed. */
        var isOutcomeSpecific = !!(err && (
          err.code === 'outcome_locked' ||
          err.code === 'outcome_not_available_yet' ||
          err.code === 'outcome_recorded_immutable'
        ));
        var title = isOutcomeSpecific ? mapped.title : 'Outcome update failed';
        var message = isOutcomeSpecific ? mapped.message : 'The task was not changed. Please try again.';
        showToast({ type: mapped.type, title: title, message: message, persistent: mapped.persistent });
        return false;
      })
      /* .finally() (2026-07-31 UX correction) — restores triggerBtn on
         every path, .then()'s original resolved value (true/false) passes
         through unchanged since this callback returns nothing. */
      .finally(function () { setButtonBusy(triggerBtn, false); });
  }

  /* Mark Completed (FINAL BUSINESS RULES, 2026-07-24, closure review pass
     — Rule 7): EVERY Mark Completed click opens the shared
     confirmDestructive() dialog first, regardless of the task's current
     outcome (Pending, already Completed, or Uncompleted) — Cancel sends
     no request at all and changes no local state (outcome, reason,
     outcome_updated_at, and outcome_updated_by all stay exactly as they
     were); Confirm sends the authoritative PUT .../outcome request, which
     the backend independently re-validates (date window, then persists).
     The message/button variant differ only cosmetically depending on
     whether a recorded Uncompleted reason is actually about to be
     cleared — that distinction never skips the dialog, it only changes
     its wording and whether the danger-red confirm styling applies. */
  if (viewOutcomeCompletedBtn) {
    viewOutcomeCompletedBtn.addEventListener('click', function () {
      var id = currentViewItemId;
      if (!id) { return; }
      var it = items.filter(function (x) { return x.id === id; })[0];
      if (!it) { return; }
      /* Calendar member-token authorization — cross-member pre-block
         (2026-07-31 UX correction): checked BEFORE the availability gate
         and before confirmDestructive() opens, so a cross-member attempt
         never shows the confirmation dialog and never sends a request. */
      guardMutationAccess(memberKey).then(function (allowed) {
        if (!allowed) { return; }
        /* Availability gate (screenshot-derived defect, 2026-07-24) —
           recomputed fresh here (never a value cached from renderOutcome()'s
           last call) so a popup left open across the Colombo midnight
           boundary is judged correctly (STEP 9). A blocked click shows the
           explanatory toast and stops before the confirmation dialog opens
           or any request is sent; the backend still independently rejects
           a stale request either way (unchanged). */
        var availability = getOutcomeAvailability(it);
        if (availability !== 'current') { showOutcomeUnavailableToast(it, availability); return; }
        var clearsReason = it.outcome === 'Uncompleted';
        confirmDestructive({
          title: 'Mark task Completed?',
          message: clearsReason
            ? 'This clears the previously recorded Uncompleted reason. This cannot be undone.'
            : 'Confirm this task is Completed.',
          confirmLabel: 'Mark Completed',
          cancelLabel: 'Cancel',
          confirmVariant: clearsReason ? 'danger' : 'primary',
          trigger: viewOutcomeCompletedBtn,
          onConfirm: function () { return setTaskOutcome(id, 'Completed', null, viewOutcomeCompletedBtn); }
        });
      });
    });
  }

  /* Mark Uncompleted always opens the reason-entry form first — it never
     submits directly, since a reason is mandatory for this transition.
     Resubmitting while already Uncompleted pre-fills the existing reason
     so it can be reviewed/edited, matching the "same status resubmission"
     allowance noted in the read-only gap review. */
  if (viewOutcomeUncompletedBtn) {
    viewOutcomeUncompletedBtn.addEventListener('click', function () {
      var id = currentViewItemId;
      if (!id) { return; }
      var it = items.filter(function (x) { return x.id === id; })[0];
      if (!it) { return; }
      /* Calendar member-token authorization — cross-member pre-block
         (2026-07-31 UX correction): checked before the reason-entry form
         ever opens — a cross-member attempt never sees that form. */
      guardMutationAccess(memberKey).then(function (allowed) {
        if (!allowed) { return; }
        /* Availability gate — same reasoning as the Mark Completed handler
           above; blocked here means the reason-entry form never opens and
           no request is sent. */
        var availability = getOutcomeAvailability(it);
        if (availability !== 'current') { showOutcomeUnavailableToast(it, availability); return; }
        showOutcomeReasonForm(it.outcome === 'Uncompleted' ? it.outcome_reason : '');
      });
    });
  }

  if (viewOutcomeReasonCancelBtn) {
    viewOutcomeReasonCancelBtn.addEventListener('click', function () { hideOutcomeReasonForm(); });
  }

  if (viewOutcomeReasonSubmitBtn) {
    viewOutcomeReasonSubmitBtn.addEventListener('click', function () {
      var id = currentViewItemId;
      if (!id || !viewOutcomeReasonInput) { return; }
      var trimmed = viewOutcomeReasonInput.value.trim();
      if (!trimmed) {
        setFieldError(viewOutcomeReasonInput, 'Enter a reason for marking this task Uncompleted.');
        showToast({
          type: 'error', title: 'Reason required',
          message: 'Enter a reason before marking this task as uncompleted.', persistent: true
        });
        viewOutcomeReasonInput.focus();
        return;
      }
      if (trimmed.length > 250) {
        setFieldError(viewOutcomeReasonInput, 'Reason must be 250 characters or fewer.');
        showToast({
          type: 'error', title: 'Reason too long',
          message: 'The reason must be 250 characters or fewer.', persistent: true
        });
        viewOutcomeReasonInput.focus();
        return;
      }
      clearFieldError(viewOutcomeReasonInput);
      setTaskOutcome(id, 'Uncompleted', trimmed, viewOutcomeReasonSubmitBtn);
    });
  }

  /* Long-open-popup boundary (STEP 9, screenshot-derived defect,
     2026-07-24) — a Task Details popup may stay open across the Colombo
     midnight boundary; re-evaluate (not poll) outcome availability when
     the window regains focus or the tab becomes visible again, so the
     button presentation catches up rather than only being corrected on
     the next full popup open. Skipped while the reason-entry form is
     open — renderOutcome() unconditionally clears that form's in-progress
     text (hideOutcomeReasonForm()), which would otherwise silently wipe
     a reason the user is mid-typing; the backend still independently
     re-validates on submit either way (see setTaskOutcome() above), so
     skipping this narrow case loses no protection, only a slightly later
     visual update. */
  function refreshOpenOutcomeAvailability() {
    if (!currentViewItemId) { return; }
    if (!viewModal.classList.contains('show')) { return; }
    if (viewOutcomeReasonForm && !viewOutcomeReasonForm.hidden) { return; }
    var it = items.filter(function (x) { return x.id === currentViewItemId; })[0];
    if (!it) { return; }
    renderOutcome(it);
  }
  window.addEventListener('focus', refreshOpenOutcomeAvailability);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { refreshOpenOutcomeAvailability(); }
  });

  function viewItem(id, triggerEl, origin, besideList) {
    var it = items.filter(function (x) { return x.id === id; })[0];
    if (!it) { return; }
    taskFlowOrigin = origin || null;
    currentViewItemId = id;
    var catClass = CATEGORY_CLASS[it.category] || 'task';
    if (viewColorDot) { viewColorDot.className = 'msc-view-color-dot ' + catClass; }
    /* Display-only fallback (popup-detail-close-and-scroll-containment
       task, 2026-07-23; hardened against a whitespace-only title
       2026-07-23 popup-visual-cleanup task) — it.title is the same
       authoritative title field Calendar chips, the full Task list, and
       the Create/Edit form all already read/write; this never writes
       the fallback text back to the record, it only covers the
       rendering case where the stored value is empty or whitespace-
       only (a plain `||` check alone treats a string of only spaces as
       truthy, which would render as an invisible blank title). */
    viewTitle.textContent = (it.title || '').trim() || 'Untitled task';
    viewDate.textContent = 'Date: ' + it.date;
    viewTime.textContent = 'Time: ' + ((it.start || it.end) ? (it.start || '?') + ' – ' + (it.end || '?') : 'Not set');
    viewCategory.textContent = 'Category: ' + it.category;
    viewPriority.textContent = 'Priority: ' + (it.priority || 'Medium');
    viewNotes.textContent = 'Notes: ' + (it.notes || '(none)');
    /* Task Created/Updated at (2026-07-23; moved to directly below Notes
       2026-07-24 per live layout feedback — was previously last in the
       popup, below the outcome section) — read-only, plain-text display
       of the authoritative it.created_at/it.updated_at values already
       carried on the current Task object (apiItemToFrontend(), core.js).
       formatTaskTimestamp() converts the stored UTC value to Asia/Colombo
       and returns 'Not available' verbatim for a missing/unparsable value
       — never a generated or substituted timestamp. Equal Created/Updated
       values (a never-edited Task) are both shown, never hidden. Single
       Task Details only — Leave Details, Create/Edit Task, chips, and the
       Task list are untouched. */
    viewCreatedAt.textContent = 'Created at: ' + formatTaskTimestamp(it.created_at);
    viewUpdatedAt.textContent = 'Updated at: ' + formatTaskTimestamp(it.updated_at);
    renderOutcome(it);
    /* FINAL BUSINESS RULES (2026-07-24, closure review pass — Rule 8):
       once any outcome is recorded, the task is permanently preserved as
       read-only evidence and can never be deleted — backend-enforced
       (delete_member_schedule_event's 409 outcome_recorded_immutable)
       regardless of this client-side disable; this is only the frontend
       "clearly locked" presentation the rule also asks for. Edit stays
       enabled either way — title/priority/time/notes remain editable
       (Rule 8's explicit carve-out); only the Date field inside that form
       is separately disabled (see editItem()). */
    if (viewDeleteBtn) {
      viewDeleteBtn.disabled = !!it.outcome;
      viewDeleteBtn.title = it.outcome
        ? 'This task can’t be deleted — an outcome has already been recorded for it.'
        : 'Delete task';
    }
    /* Modal background scroll lock (popup-detail-close-and-scroll-
       containment task, 2026-07-23) — only the centered presentation
       locks the page (see closeViewModal() for the matching unlock and
       why besideList never locks). wasLocked guards against a double-
       lock in the one path that can re-enter viewItem() without an
       intervening closeViewModal(): clicking a different calendar chip
       while Task Detail is already open beside the "+N more" list (that
       list's transparent, click-through backdrop lets clicks reach the
       calendar grid underneath) transitions besideList -> centered
       directly. */
    var wasLocked = viewModal.classList.contains('show') && !viewModal.classList.contains('msc-view-modal--beside-list');
    lastFocusedTrigger = triggerEl || document.activeElement;
    viewModal.classList.add('show');
    viewModal.classList.toggle('msc-view-modal--beside-list', !!besideList);
    if (!besideList && !wasLocked) { lockBodyScroll(); }
    viewModal.addEventListener('keydown', onViewModalKeydown);
    if (besideList) {
      positionViewModalBesideList();
    } else {
      viewModal.querySelector('.msc-modal').style.position = '';
      viewModal.querySelector('.msc-modal').style.left = '';
      viewModal.querySelector('.msc-modal').style.top = '';
    }
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
    /* Side-by-side companion (Image E, 2026-07-23 task) — while Task
       Detail is open beside this list (viewItem()'s besideList mode), a
       click anywhere inside it (Edit, Delete, a field, the card itself)
       must not be treated as an "outside" click that closes the list out
       from under it; the list is only ever dismissed via its own Close/
       Escape/backdrop-click, or Task Detail's own Close (which reopens
       the list via reopenTaskListOrigin(), also unaffected here). */
    if (viewModal.classList.contains('msc-view-modal--beside-list') && viewModal.contains(e.target)) { return; }
    closeMorePopup();
  }

  /* Escape-only — this is an anchored popover, not a centered .msc-modal
     overlay, so it has no .msc-modal child for trapPopupTab() to cycle
     within; Tab is left to flow naturally. */
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
      /* Display-only fallback, same convention as viewItem() — never
         written back to the record. */
      var displayTitle = (it.title || '').trim() || 'Untitled task';
      /* Small subtle dot (popup-visual-cleanup task, 2026-07-23) —
         replaces the former 3px colored left-border strip on the whole
         row ("ugly colored left indicator" per direct user feedback)
         with the same compact .msc-chip-cat-dot treatment the Task
         Detail identity row and the Tasks-workspace list already use,
         so every place this app shows a category color uses one
         consistent, subtle visual language. */
      html += '<div class="msc-more-popup-item ' + catClass + '" data-id="' + it.id + '" role="button" tabindex="0" ' +
        'aria-label="' + escapeHtml((it.start ? it.start + ' ' : '') + displayTitle) + '">' +
        '<span class="msc-chip-cat-dot ' + catClass + '" aria-hidden="true"></span>' +
        '<span class="msc-more-popup-item-time">' + escapeHtml(timeStr) + '</span>' +
        '<span class="msc-more-popup-item-title" title="' + escapeHtml(displayTitle) + '">' + escapeHtml(displayTitle) + '</span>' +
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
        /* Side-by-side List + Detail (Image E, 2026-07-23 google-inspired-
           task-leave-popup-ui task) — only on desktop-tier viewports
           (>=1024px, matching the brief's own Desktop responsive tier).
           The list stays open and visible; Task Detail opens beside it
           instead of replacing it (positionViewModalBesideList() in
           viewItem()). Below that width the list has no room to share the
           screen with a second card, so the pre-existing behavior (close
           the list, open Detail as a normal centered modal, reopen the
           list on Close) is kept exactly as before. */
        var sideBySide = window.innerWidth >= 1024;
        if (sideBySide) {
          morePopupList.querySelectorAll('.msc-more-popup-item.selected').forEach(function (el) {
            el.classList.remove('selected');
          });
          row.classList.add('selected');
        } else {
          closeMorePopup();
        }
        viewItem(id, morePopupAnchorEl, taskFlowOrigin, sideBySide);
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
    /* Calendar member-token authorization (2026-07-29) — same contract as
       apiRequest() above: only non-GET requests need a token, resolved
       once (dialog on first use only) before the single fetch below. */
    var isMutation = method !== 'GET';
    var authPromise = isMutation ? ensureAuthorized() : Promise.resolve(null);
    return authPromise.then(function (token) {
      var opts = { method: method, headers: {} };
      if (body !== undefined) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
      if (token) {
        opts.headers['Authorization'] = 'Bearer ' + token;
      }
      return fetch(url, opts);
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (errBody) {
          /* Calendar member-token authorization (2026-07-29) — see
             apiRequest() above for the full rationale; identical 401/403
             handling shared by every Leave create/update/delete call. */
          if (res.status === 401) {
            handleUnauthorizedResponse();
            var authErr = new Error('Your Calendar authorization has expired or changed.');
            authErr.code = 'auth_required';
            authErr.status = 401;
            throw authErr;
          }
          if (res.status === 403) {
            /* Calendar member-token authorization UX correction
               (2026-07-31): the guardMutationAccess() pre-block (auth.js)
               already catches almost every cross-member attempt before
               any request is sent, so this branch is now a rare fallback
               (e.g. the token was reassigned server-side in the instant
               between the pre-block check and this request). Uses the
               backend's own actingMember/targetMember member_key facts
               (backend/routers/calendar_auth.py require_matching_member)
               resolved to on-page display labels HERE (labelForMemberKey,
               ./auth.js) — never the backend's own message text — so the
               resulting toast (ui/error-mapper.js mapApiError) renders
               the SAME approved dynamic copy as the pre-block path's
               crossMemberAlertCopy (auth.js), word for word. The saved
               token is left completely untouched — no re-prompt. */
            var detail = (errBody && errBody.detail) || {};
            var deniedErr = new Error('Cross-member mutation denied.');
            deniedErr.code = 'cross_member_denied';
            deniedErr.status = 403;
            deniedErr.actingMemberLabel = labelForMemberKey(detail.actingMember) || 'another member';
            deniedErr.targetMemberLabel = labelForMemberKey(detail.targetMember) || 'this calendar';
            throw deniedErr;
          }
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
         2026-07-20 popup workflow; repointed to the independent
         summaryDate by the 2026-07-24 date-ownership task) — same
         refresh deleteLeaveRecord() below already uses. Calls the
         existing, unmodified loadSummaries()/report endpoints — no
         Schedule Summary logic changed. */
      refreshSummary();
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
      /* .finally() (2026-07-31 UX correction) — always restores the
         button, including any Cancel/invalid-token/network-failure/401/
         403 during apiRequest's own ensureAuthorized() step above. */
    }).finally(function () { setButtonBusy(leaveCreateBtn, false); });
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
      refreshSummary();
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
      /* .finally() (2026-07-31 UX correction) — see leaveCreateBtn's call
         site above for the full rationale. */
    }).finally(function () { setButtonBusy(leaveUpdateBtn, false); });
  });

  /* Soft-deletes an active leave record (2026-07-16 simplification
     amendment — the only removal mechanism now that there is no
     Cancelled/Rejected status). Confirms first, then refreshes the
     calendar and the leave-deduction reports. Reused unchanged by the
     Leave-detail popup's Delete button below. */
  /* Calendar member-token authorization — cross-member pre-block
     (2026-07-31 UX correction): same pattern as deleteItem() above —
     gated BEFORE confirmDestructive() opens, so a cross-member attempt
     never shows the delete confirmation and never sends a request. A
     blocked gate resolves false, identical to "the user declined the
     confirmation" for every existing caller. */
  function deleteLeaveRecord(leaveId, btn) {
    return guardMutationAccess(memberKey).then(function (allowed) {
      if (!allowed) { return false; }
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
            refreshSummary();
            showToast({ type: 'success', title: 'Leave deleted', message: 'The leave entry was removed.' });
            return true;
          }).catch(function (err) {
            var mapped = mapApiError(err);
            showToast({ type: mapped.type, title: mapped.title, message: mapped.message, persistent: mapped.persistent });
            return false;
          });
        }
      });
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
    var wasOpen = leaveViewModal.classList.contains('show');
    leaveViewModal.classList.remove('show');
    if (wasOpen) { unlockBodyScroll(); }
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
    var wasOpen = leaveViewModal.classList.contains('show');
    lastFocusedLeaveTrigger = triggerEl || document.activeElement;
    leaveViewModal.classList.add('show');
    /* True centered modal — always locks the background page (there is
       no anchored/beside-list presentation for Leave Detail). */
    if (!wasOpen) { lockBodyScroll(); }
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

  /* ── Schedule Summary date selector wiring (Schedule Summary
     date-ownership task, 2026-07-24) — the only UI control allowed to
     call setSummaryDate() directly; every Calendar-side control
     (Calendar cells, mini-calendar, Today, Prev/Next, view switches)
     continues to only call selectDate(), which no longer touches
     Summary at all. */
  if (summaryDateInput) {
    summaryDateInput.addEventListener('change', function () {
      setSummaryDate(summaryDateInput.value);
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

  /* Schedule Summary default (STEP 4) — Asia/Colombo "today", deliberately
     independent of t0 above (which drives Calendar's own view/anchor and
     stays browser-local, unchanged). Summary reports don't depend on the
     `items`/`leaveItems` arrays, so this runs immediately rather than
     waiting on the loadItems()/loadLeaveItems() chain below. */
  setSummaryDate(getColomboTodayStr());

  /* Tasks workspace default (FINAL BUSINESS RULES closure review,
     2026-07-24) — Asia/Colombo "today", same reasoning as the Schedule
     Summary default immediately above: independent of t0 (browser-local,
     drives only Calendar's own view/anchor), and safe to set before
     items finish loading since renderTasksWorkspace() itself is only
     ever invoked once Tasks mode is actually opened (setMode()), by
     which point loadItems() below has almost always already resolved. */
  setTasksDate(getColomboTodayStr());

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
    /* This one bootstrap call is the automatic initial default, not a
       user action — reset the flag selectDate() just set so the weekly
       schedule export still correctly reports "no date manually selected"
       until the user actually clicks a date, the mini-picker, a Week/Day
       slot, or Today (see state.dateManuallySelected's docstring above). */
    state.dateManuallySelected = false;
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

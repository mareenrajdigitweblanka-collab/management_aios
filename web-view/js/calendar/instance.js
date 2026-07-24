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
, parseDateStr
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
} from './core.js';
import { trapTab, returnFocus } from '../ui/popup.js';
import { showToast } from '../ui/toast.js';
import { confirmDestructive } from '../ui/dialog.js';
import { setButtonBusy, showInlineLoading } from '../ui/loading.js';
import { setFieldError, clearFieldError, clearFormErrors, focusFirstInvalid } from '../ui/form-feedback.js';
import { mapApiError, classifyHttpStatus } from '../ui/error-mapper.js';
import { lockBodyScroll, unlockBodyScroll } from '../ui/scroll-lock.js';
import { registerDateIcon } from './date-icon.js';

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
  var settingsPopupTitleId = 'msc-cal-settings-title-' + memberKey;
  /* Month/Week/Day dropdown menu aria-controls target (toolbar-follow-up
     task, 2026-07-23 — direct user feedback re-requested the dropdown
     presentation over the segmented control). */
  var viewDropdownId = 'msc-view-dropdown-' + memberKey;

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
    /* ── Tasks workspace (Step 12, google-calendar-inspired-toolbar-and-
       tasks-workspace task, 2026-07-23) — a sibling of .msc-calendar-main
       inside the same card, shown/hidden by setMode() alongside it (see
       toolbar mode-switch above). Reuses the SAME Task data (`items`,
       the array .msc-calendar-content's own Month/Week/Day views already
       read) and the SAME Task Details/Edit/Delete/Create-Task popups
       defined further below — no second Task truth, no new API call.
       Scope is intentionally "All tasks" only: Starred and Lists are
       NOT implemented (Steps 4/17/18's data gate — no starred/list
       field exists anywhere in the Task schema, backend or frontend;
       adding them would require an unapproved migration) and Completion
       is NOT implemented (Step 16 — no completed/completed_at field
       exists, and how a "completed" Task should affect Schedule Summary
       is not defined by any approved source, so this task stops short
       of inventing that business rule). Both blockers are documented in
       validation/handover, not silently omitted. */
    '<div class="msc-tasks-main" data-mode-pane="tasks">' +
    '<div class="msc-tasks-sidebar">' +
    '<div class="msc-create-wrap">' +
    '<button type="button" class="msc-btn msc-btn-primary msc-create-btn msc-tasks-add-btn">' +
    '<span class="msc-create-btn-plus" aria-hidden="true">+</span>Add a task</button>' +
    '</div>' +
    '<nav class="msc-tasks-nav" aria-label="Tasks views">' +
    '<button type="button" class="msc-tasks-nav-btn active" data-tasks-view="all" aria-current="true">All tasks</button>' +
    '</nav>' +
    '<p class="msc-note msc-tasks-nav-note">Starred and custom Lists need additional data fields that are not ' +
    'yet approved for this AIOS, so they are not shown here.</p>' +
    '</div>' +
    '<div class="msc-tasks-content">' +
    '<div class="msc-tasks-header">' +
    '<h3 class="msc-tasks-title">All tasks</h3>' +
    '<span class="msc-tasks-count"></span>' +
    '</div>' +
    '<div class="msc-tasks-list-wrap">' +
    '<div class="msc-tasks-loading" hidden><p class="msc-note">Loading tasks…</p></div>' +
    '<div class="msc-tasks-error" hidden></div>' +
    '<div class="msc-tasks-empty" hidden>' +
    '<p class="msc-tasks-empty-title">All tasks complete</p>' +
    '<p class="msc-note">There are no active tasks for this member.</p>' +
    '</div>' +
    '<div class="msc-tasks-list" role="list"></div>' +
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
    '<div class="hr-table-title" style="margin-bottom:6px;">Today\'s Priorities</div>' +
    '<p class="msc-note" style="margin:0 0 8px;">Today\'s scheduled items ranked by priority.</p>' +
    '<div class="msc-priority-list"></div>' +
    '</div>' +
    /* ── Calendar help popup (Step 6, google-calendar-inspired-toolbar-
       and-tasks-workspace task, 2026-07-23) — static, plain-language
       explanation of the calendar's own semantic colors and interaction
       rules. No technical/database wording, no formulas — matches the
       requirement that this stay a user-facing help card, not developer
       documentation. Same .msc-modal-overlay/.msc-modal convention every
       other calendar popup already uses; trapTab/returnFocus wired below
       exactly like the other popups. */
    '<div class="msc-modal-overlay msc-cal-help-popup" role="dialog" aria-modal="true" aria-labelledby="' + escapeHtml(helpPopupTitleId) + '">' +
    '<div class="msc-modal msc-cal-help-inner">' +
    /* Header realigned to a true top-right Close (toolbar-alignment-and-
       close-control task, 2026-07-23) — the bottom "Close" button (in
       .msc-form-actions) was removed; the header Close icon is now the
       one and only Close control, and .msc-view-title/space-between
       layout push it to the far right instead of sitting immediately
       beside the title text. Icon changed from a Unicode "&times;" text
       glyph to an inline SVG X, matching the rest of the toolbar's
       icon system. */
    '<div class="msc-view-modal-head">' +
    '<h4 class="msc-view-title" id="' + escapeHtml(helpPopupTitleId) + '">Calendar help</h4>' +
    '<button type="button" class="msc-modal-close msc-cal-help-close" aria-label="Close Calendar help">' +
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5 5l10 10M15 5L5 15"/></svg></button>' +
    '</div>' +
    '<ul class="msc-cal-help-list">' +
    '<li><span class="msc-chip-cat task" aria-hidden="true"></span>Green — Scheduled Task</li>' +
    '<li><span class="msc-chip-cat followup" aria-hidden="true"></span>Yellow — Unscheduled Task</li>' +
    '<li><span class="msc-chip-cat leave" aria-hidden="true"></span>Red — Leave</li>' +
    '<li>Tasks are marked Scheduled or Unscheduled automatically, based on when they are created or last ' +
    'changed relative to the current planning week. This is never a manual choice.</li>' +
    '<li>"+N more" on a date opens the complete list of that date’s Tasks.</li>' +
    '<li>Clicking blank space in a date opens a Task/Leave chooser for that date — no double-click needed.</li>' +
    '<li>Tasks cannot be created on a date fully covered by Full-Day or Multi-Day Leave; saving shows a clear ' +
    'conflict message instead.</li>' +
    '</ul>' +
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
    '<p class="msc-view-created-at"></p>' +
    '<p class="msc-view-updated-at"></p>' +
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
    '<label>Start time<input type="time" class="msc-field-start" /></label>' +
    '<label>End time<input type="time" class="msc-field-end" /></label>' +
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
  var settingsTriggerBtn = container.querySelector('.msc-cal-settings-trigger');
  var settingsPopupOverlay = container.querySelector('.msc-cal-settings-popup');
  var settingsPopupClose = container.querySelector('.msc-cal-settings-close');
  var settingsSidebarToggleInput = container.querySelector('.msc-cal-settings-sidebar-toggle');
  var modeSwitchBtns = container.querySelectorAll('.msc-cal-mode-btn');
  var calendarMainEl = container.querySelector('.msc-calendar-main');
  var tasksMainEl = container.querySelector('.msc-tasks-main');
  var tasksAddBtn = container.querySelector('.msc-tasks-add-btn');
  var tasksListEl = container.querySelector('.msc-tasks-list');
  var tasksEmptyEl = container.querySelector('.msc-tasks-empty');
  var tasksLoadingEl = container.querySelector('.msc-tasks-loading');
  var tasksErrorEl = container.querySelector('.msc-tasks-error');
  var tasksCountEl = container.querySelector('.msc-tasks-count');
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

  /* kind: 'task' | 'leave'. Tabs are hidden while editing an existing
     record (state.editingId for Task, editingLeaveId for Leave — both
     are already set by editItem()/editLeaveItem() before they call
     openTaskPopup()/openLeavePopup(), which alias to this) since an
     existing item's fundamental type isn't switchable — matches the
     pre-existing behavior (there was never a way to turn a Task into a
     Leave record or vice versa). */
  function openCreatePopup(kind) {
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

  /* ── Tasks workspace (Step 12-19) — "All tasks" only (see the markup
     comment above for why Starred/Lists/Completion are omitted). Reads
     the SAME `items` closure Month/Week/Day already read; never a
     second Task truth, never a separate fetch. */
  function renderTasksWorkspace() {
    if (!tasksListEl) { return; }
    var sorted = items.slice().sort(function (a, b) {
      if (a.date !== b.date) { return a.date < b.date ? -1 : 1; }
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
      html += '<button type="button" class="msc-tasks-row" role="listitem" data-id="' + it.id + '" ' +
        'aria-label="View task details: ' + escapeHtml(it.title) + '">' +
        '<span class="msc-chip-cat ' + catClass + '" aria-hidden="true"></span>' +
        '<span class="msc-tasks-row-main">' +
        '<span class="msc-tasks-row-title">' + escapeHtml(it.title) + '</span>' +
        '<span class="msc-tasks-row-meta">' + escapeHtml(formatAgendaDate(it.date)) + ' · ' + escapeHtml(timeLabel) +
        ' · ' + escapeHtml(it.category) + ' · ' + escapeHtml(it.priority || 'Medium') + '</span></span></button>';
    });
    tasksListEl.innerHTML = html;
    tasksListEl.querySelectorAll('.msc-tasks-row').forEach(function (row) {
      row.addEventListener('click', function () { viewItem(row.getAttribute('data-id'), row); });
    });
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
  var bulkRowSeq = 0;
  var bulkSubmitInFlight = false;

  function bulkRowFieldElement(rowEl, field) {
    if (!rowEl) { return null; }
    if (field === 'date') { return rowEl.querySelector('.msc-bulk-row-date'); }
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

  function getBulkRowByNumber(rowNumber) {
    return getBulkRows()[rowNumber - 1] || null;
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
      '<label>Date<input type="date" class="msc-bulk-row-date"' + dateAttr + ' required /></label>' +
      '<label>Task title<input type="text" class="msc-bulk-row-title" maxlength="120" placeholder="e.g. Prepare weekly report" /></label>' +
      '<label>Start time<input type="time" class="msc-bulk-row-start" /></label>' +
      '<label>End time<input type="time" class="msc-bulk-row-end" /></label>' +
      '<label>Priority<select class="msc-bulk-row-priority">' +
      '<option value="High">High</option>' +
      '<option value="Medium" selected>Medium</option>' +
      '<option value="Low">Low</option>' +
      '</select></label>' +
      '<label class="msc-form-full">Notes<textarea class="msc-bulk-row-notes" maxlength="240" ' +
      'placeholder="Optional note — no real names, meetings, or customer details"></textarea></label>' +
      '</div>' +
      '<p class="msc-form-full msc-bulk-leave-blocked-note" hidden>No new Task can be added on this date — it is ' +
      'covered by Full-Day or Multi-Day leave.</p>' +
      '</div>'
    );
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
    renderBulkRowNumbers();
    applyRowLeaveGate(newRow);
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
  function applyRowLeaveGate(rowEl) {
    var dateEl = bulkRowFieldElement(rowEl, 'date');
    var noteEl = rowEl.querySelector('.msc-bulk-leave-blocked-note');
    var blocked = !!(dateEl && dateEl.value && isDateFullyLeaveBlocked(dateEl.value));
    if (noteEl) { noteEl.hidden = !blocked; }
    rowEl.classList.toggle('msc-bulk-row-leave-blocked', blocked);
    return blocked;
  }

  function updateBulkCreateButtonGate() {
    var anyBlocked = getBulkRows().reduce(function (blocked, rowEl) {
      return applyRowLeaveGate(rowEl) || blocked;
    }, false);
    if (bulkCreateBtn) { bulkCreateBtn.disabled = anyBlocked; }
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
    return !title && !start && !end && !notes;
  }

  /* Mirrors the backend's own _bulk_row_field_errors rules exactly (same
     title/notes length limits, same end>start rule via timeToMinutes() —
     the same helper validateTaskTimeRange() already uses for the single
     Task form) — an early, non-authoritative check only; the backend
     always re-validates every row from scratch regardless of what this
     finds (Step 17: "does not replace backend validation"). */
  function bulkRowFieldErrors(rowEl) {
    var errors = [];
    var dateVal = bulkRowFieldElement(rowEl, 'date').value;
    if (!dateVal) {
      /* CONFIRMED ADD-ROW DATE RULE rule 6 — never invented; a row that
         reaches submit with no Date (its own, or copied blank from the
         row before it) is a plain required-field error, exactly like a
         missing title. */
      errors.push({ field: 'date', message: 'Choose a date for this task.' });
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
    var start = bulkRowFieldElement(rowEl, 'start').value;
    var end = bulkRowFieldElement(rowEl, 'end').value;
    if (start && end && timeToMinutes(end) <= timeToMinutes(start)) {
      errors.push({ field: 'end', message: 'End time must be later than start time.' });
    }
    return errors;
  }

  function bulkDuplicateKey(rowEl) {
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

  function rowElToPayloadRow(rowEl) {
    var date = bulkRowFieldElement(rowEl, 'date').value;
    var title = (bulkRowFieldElement(rowEl, 'title').value || '').trim();
    var start = bulkRowFieldElement(rowEl, 'start').value;
    var end = bulkRowFieldElement(rowEl, 'end').value;
    var notes = (bulkRowFieldElement(rowEl, 'notes').value || '').trim();
    return {
      date: date ? date : null,
      title: title,
      priority: bulkRowFieldElement(rowEl, 'priority').value,
      start: start ? start : null,
      end: end ? end : null,
      notes: notes ? notes : null
    };
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
  function applyBulkRowErrors(errorList) {
    var firstFieldEl = null;
    (errorList || []).forEach(function (e) {
      if (e.row == null) {
        showToast({ type: 'error', title: 'Tasks were not created', message: e.message });
        return;
      }
      var rowEl = getBulkRowByNumber(e.row);
      if (!rowEl) { return; }
      rowEl.classList.add('msc-bulk-row-error');
      var fieldEl = bulkRowFieldElement(rowEl, e.field) || bulkRowFieldElement(rowEl, 'title');
      if (fieldEl) {
        setFieldError(fieldEl, 'Row ' + e.row + ' — ' + e.message);
        if (!firstFieldEl) { firstFieldEl = fieldEl; }
      }
    });
    showApiStatus(
      'Tasks were not created. Fix the highlighted rows and submit again. No tasks were saved.',
      true, bulkPopupStatusEl
    );
    if (firstFieldEl && firstFieldEl.focus) { firstFieldEl.focus(); }
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
  function showBulkDuplicateConfirmation(warnings) {
    getBulkRows().forEach(function (rowEl) { rowEl.classList.remove('msc-bulk-row-duplicate-warning'); });
    var firstRowEl = null;
    (warnings || []).forEach(function (w) {
      (w.rows || []).forEach(function (rowNumber) {
        var rowEl = getBulkRowByNumber(rowNumber);
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
     Every row currently in the DOM is sent, in order, INCLUDING blank
     ones — row numbers in every backend response are 1-indexed positions
     in this same array, so they always match exactly what the user sees
     as "Row N" regardless of which rows are blank (Step 5/18). */
  function performBulkSubmit(confirmDuplicates) {
    var tasks = getBulkRows().map(rowElToPayloadRow);
    /* No top-level common `date` any more — every row carries its own
       (CONFIRMED ADD-ROW DATE RULE, 2026-07-24); the backend validates
       and stores each row against its own date (backend/schemas.py
       BulkTaskRowIn.date). */
    var payload = { tasks: tasks, confirm_duplicates: !!confirmDuplicates };
    return apiRequest('POST', apiBase + '/bulk', payload).then(function (result) {
      (result.items || []).forEach(function (apiItem) { items.push(apiItemToFrontend(apiItem)); });
      var count = result.created_count != null ? result.created_count : (result.items || []).length;
      /* Single refresh (Step 19) — selectDate() is the same established
         one-call refresh entry point the single-Task form already uses:
         it re-renders the calendar grid, the Priority Queue preview, the
         Tasks workspace (if active), and Schedule Summary, all exactly
         once, regardless of how many tasks were just created. Rows can
         now span different dates, so this refreshes around the first
         submitted row's date — a representative anchor, not a claim that
         every task shares one date. */
      var firstTaskWithDate = tasks.filter(function (t) { return !!t.date; })[0];
      selectDate(firstTaskWithDate ? firstTaskWithDate.date : state.selectedDate);
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
        applyBulkRowErrors(err.errors);
      } else if (err.code === 'bulk_duplicate_confirmation_required') {
        showBulkDuplicateConfirmation(err.warnings);
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
          var fieldEl = bulkRowFieldElement(rowEl, fieldErr.field);
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

      bulkSubmitInFlight = true;
      setButtonBusy(bulkCreateBtn, true, { busyLabel: 'Creating…' });
      performBulkSubmit(false).then(function () {
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
          if (currentMode === 'tasks') { renderTasksWorkspace(); }
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
    /* Task Created/Updated at (2026-07-23) — read-only, plain-text display
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

---
name: calendar-help-user-guide-popup-check
type: validation
scope: web-view frontend only — Calendar help popup content and presentation
created: 2026-07-27
status: AMBER — implemented, static/automated checks pass; live-browser manual pass not performed (no browser tool in this session)
owner: Mareenraj (build); relevant Management Team member per CLAUDE.md §18 for review/sign-off
reviewer: pending
---

# Calendar Help Popup — "How to Use This Calendar" Redesign — Check — 2026-07-27

## 1. Screenshot-derived problem

The deployed "Calendar help" popup (`web-view/js/calendar/instance.js`, `.msc-cal-help-popup`) contained only:
color legend (green/yellow/red), the Scheduled/Unscheduled automatic-classification note, a one-line "+N more"
explanation, a blank-date-click explanation, and a Full-Day/Multi-Day Leave conflict note. It gave a non-technical
member no step-by-step guidance on how to actually use the Calendar (create a Task, use Bulk Tasks, add Leave,
use My Tasks, record an outcome, download a weekly schedule, or read the common system messages).

## 2. Old content (verbatim, before this change)

```
Calendar help
- Green — Scheduled Task
- Yellow — Unscheduled Task
- Red — Leave
- Tasks are marked Scheduled or Unscheduled automatically... This is never a manual choice.
- "+N more" on a date opens the complete list of that date's Tasks.
- Clicking blank space in a date opens a Task/Leave chooser for that date — no double-click needed.
- Tasks cannot be created on a date fully covered by Full-Day or Multi-Day Leave; saving shows a clear
  conflict message instead.
```

Card width: `max-width: 420px` (`.msc-cal-help-inner`, shared with the Settings popup).

## 3. New purpose

Popup title "Calendar help" kept; subtitle "How to use the Management AIOS Calendar" added. Twelve
expandable topics replace the six-line list, covering the full deployed Calendar workflow end to end
(§5 below), each collapsed except **Quick start**, which opens by default.

## 4. Deployed-feature source map

Every fact restated in the new popup was read directly from current production source, not invented:

| Guide content | Source read |
|---|---|
| "+ Create" / Task / Bulk Tasks / Leave tabs | `instance.js` `.msc-create-tabs`, `.msc-create-tab-*` (lines ~641-644) |
| "+ Add another time" / time-frame rules / 30-occurrence limit | `instance.js` time-frame markup (~659-675); `handover/2026-07-27__multiple-time-frames-task-entry-closure.md` (committed `c141064`, pushed, deployment-verified against `management-aios.vercel.app`/`management-aios-api.vercel.app`) |
| Leave type labels (exact wording) | `instance.js` `.msc-leave-field-type` `<option>` list (~718-723): "Short Leave", "Half-Day Leave — First Half (08:30–13:00)", "Half-Day Leave — Second Half (13:30–18:00)", "Full-Day Leave", "Multi-Day Leave" |
| Full-Day/Multi-Day vs. Short/Half-Day Leave conflict rules | `backend/routers/leave_logic.py` `find_conflicting_active_leave`/`find_conflicting_active_tasks` (lines ~326-470): whole-day types conflict with any Task on the date; partial-day types conflict only with a timed, overlapping Task |
| Lunch-break window (12:45 PM–1:30 PM) | `core.js` `LUNCH_SENTENCE` |
| Outcome states (Pending/Completed/Uncompleted/No response), 250-char reason limit, 11:59:59 PM cutoff | `instance.js` outcome section markup (~500-552) |
| Weekly XLSX tab names ("Weekly Schedule", "Weekly Summary") | `backend/xlsx_export.py` lines 312/315 |
| Planning-warning window and wording | `web-view/index.html` `#topbarPlanningWarning` (~65-76); `core.js` `PLANNING_WARNING_WINDOW_START` |
| Common-message copy | `web-view/js/ui/error-mapper.js` `KNOWN_ERRORS`; `instance.js` `'Select a date'`/`'No schedule found'`/`'Check this task time'` call sites |
| Calendar Leave is coordination-only, not an HR approval record | `instance.js` `.msc-leave-notice` copy (~712-715) — this AIOS's own confirmed disclaimer, so the guide deliberately avoids calling a Leave entry "approved" |

No feature was found in the working tree that is not already committed and deployed — `git log origin/main..HEAD`
and `git log HEAD..origin/main` are both empty (local `main` matches `origin/main` exactly at `5694b0a`), so
every fact documented here describes current live production, not an undeployed feature.

## 5. Section list (as implemented, in required order)

1. Quick start (open by default)
2. Move around the Calendar
3. Create a Task (includes the deployed multiple-time-frames content, since it is live)
4. Create several Tasks with Bulk Tasks (includes the deployed per-row multiple-time-frames content)
5. Add Leave
6. View, edit, or delete an item
7. Use My Tasks
8. Mark a Task Completed or Uncompleted
9. Download a weekly schedule
10. Understand colors and warnings
11. Common messages
12. Need more help?

## 6. Plain-language review

No occurrences of endpoint, payload, validation (as a technical term), database, backend, fingerprint, or
schema in the new popup copy — confirmed by re-reading the full added block (`instance.js` lines ~419-676).
"Check the highlighted fields"/"validation" as an *error title* is never surfaced to the guide; the guide
uses only the plain message text a member actually sees.

## 7. Layout implementation

- Desktop: `.msc-cal-help-inner.msc-cal-help-guide` — `max-width: 680px` (within the requested 620–720px),
  `max-height: 80vh`, scrolls internally (existing `overflow-y: auto` on `.msc-cal-help-inner`, unchanged).
- Tablet (≤900px): `max-width: 92vw`.
- Mobile (≤640px): `max-width: 100%` (near-full viewport width via the pre-existing `.msc-modal-overlay`
  20px padding, same convention as `.msc-modal-form`), `max-height: calc(100vh - 32px)`.
- Header (title/subtitle/Close) stays `position: sticky; top: 0` inside the scrolling card — unchanged,
  pre-existing rule, still applies to the new two-line header.
- The Settings popup (`.msc-cal-help-inner` alone, no `.msc-cal-help-guide`) is untouched — still 420px.

## 8. Accessibility

- `role="dialog"`, `aria-modal="true"` — unchanged.
- `aria-labelledby` → the "Calendar help" `<h4>` id (unchanged id).
- `aria-describedby` → new subtitle `<p>` id ("How to use the Management AIOS Calendar") — new.
- Each topic is a native `<details>`/`<summary>` (reusing the app's existing disclosure convention,
  `web-view/css/components.css`, already used throughout `index.html` and this file's own "View detailed
  metrics" Schedule Summary section) — full built-in keyboard support (Enter/Space toggles, native focus
  ring) and an implicit expanded/collapsed accessibility state, with zero new JS toggle logic.
- Close button, Escape-to-close, Tab focus trap, and focus-return-to-Help-button are all pre-existing
  `openHelpPopup()`/`closeHelpPopup()`/`trapPopupTab()` logic (`instance.js`) — **not modified** by this
  task; only the popup's inner markup and CSS changed.
- Color legend entries carry text labels ("Green — Scheduled Task", etc.), never color alone — unchanged
  from the original popup's own convention.
- Not claimed: no screen-reader (NVDA/JAWS/VoiceOver) pass was actually run in this session — see §9.

## 9. What was verified vs. not performed (honest disclosure)

**Verified in this session:**
- `node --check web-view/js/calendar/instance.js` — passes.
- CSS brace-balance check (`{` count == `}` count) on `web-view/css/calendar.css` — 433/433, balanced.
- Class cross-reference: every CSS class referenced in the new popup markup either has a matching rule in
  `calendar.css`/`components.css` or is a pre-existing JS-selector hook (`.msc-cal-help-popup`, `.msc-cal-
  help-body`, `.msc-cal-help-head`) with no styling expected — no missing-selector found.
- Duplicate-ID scan: every dynamic popup id (`helpPopupTitleId`, new `helpPopupSubtitleId`, etc.) is a
  distinct variable, each suffixed with the per-instance `memberKey` — no collisions across the five
  mounted member calendars.
- Full existing frontend suite: `node --test web-view/js/calendar/*.test.mjs` → **87/87 pass**, zero
  regressions (these files exercise `core.js` helpers only; none imports `instance.js` directly, since it
  is DOM-bootstrap code, consistent with this repository's existing test boundary).
- Source-accuracy review (§4) — every label, message, and rule restated in the guide was traced to its
  exact production string.

**Not performed (no browser-automation tool available in this session, disclosed honestly rather than
fabricated):** an actual live-browser pass at 1920×1080 / 1366×768 / 1024px / 768px / 390px / 200% zoom;
actual keyboard Tab/Escape/Enter/Space interaction in a live DOM; actual screen-reader pass. The CSS added
(§7) reuses this repository's own pre-existing, already-verified mobile/zoom conventions (`.msc-modal-form`'s
identical 92vw/100%-width tiering, `.msc-more-popup`'s identical near-full-width mobile tiering, the
pre-existing sticky-header-inside-scrolling-card pattern already used by this same popup before this
change) rather than inventing a new layout mechanism, which is why this is AMBER rather than FAIL, not PASS.

## 10. Frontend test evidence

`node --test web-view/js/calendar/*.test.mjs` → `# tests 87 / # pass 87 / # fail 0`. Identical pass count to
the pre-existing baseline (`handover/2026-07-27__multiple-time-frames-task-entry-closure.md` §14: "87
passed"), confirming this change added zero new frontend logic paths and broke none of the existing ones.

## 11. Backend / API / database proof

`git diff --stat` (working tree at this check): only `web-view/css/calendar.css` and
`web-view/js/calendar/instance.js` changed (144 and 293 lines respectively, both insertions to existing
files). `git diff --stat -- backend/ database/ backend/requirements.txt package.json package-lock.json` is
empty. No migration created or run. No dependency added. `member-aios/mayurika-hr/staff-data/` was never
read, staged, or modified.

## 12. Known limitations

1. Live-browser manual QA (mobile width, 200% zoom, keyboard trace, screen reader) not performed — see §9.
2. "Only one section open at a time" was evaluated and deliberately **not** implemented — each topic is an
   independent native `<details>` (matching every other disclosure in this app). The task brief marked this
   as conditional ("if that gives a simpler mobile experience"); independent accordions were judged simpler
   and more consistent with the existing pattern than adding new exclusive-open JS with no precedent in
   this codebase. Reopening the popup always resets every topic to its default state (Quick start open,
   the rest closed) because the DOM is rebuilt on each `container.innerHTML` render — this is pre-existing,
   unchanged behavior for this popup.
3. This guide describes only Calendar/Tasks/Leave features that are actually deployed as of `5694b0a`
   (local `main` == `origin/main`). If a future undeployed feature is merged, this guide must be reviewed
   again before that feature reaches production, per this task's "do not document an undeployed feature"
   instruction.

## 13. Reviewer

Per CLAUDE.md §18, this is a Calendar-wide, cross-domain UX change with no single business-rule owner —
route to whichever Management Team member next opens the Calendar's Help popup live (Mayurika/Suman/Arun/
Rajiv/Paraparan pages all share this same `instance.js`).

## 14. PASS / AMBER / FAIL

**AMBER** — implementation complete, source-accuracy confirmed, static checks pass, existing automated test
suite is green (87/87, zero regressions), and no backend/API/database/dependency surface was touched. AMBER
only because the live-browser manual pass (§9) was not performed in this no-browser session.

## 15. One next step

A person with browser access (or a future browser-capable session) should open the Calendar help popup on
each of the five member-schedule pages at 1920×1080, 768px, and 390px, and at 200% zoom, confirm the Close
button and last section ("Need more help?") are always reachable, then update this file and the matching
handover from AMBER to PASS.

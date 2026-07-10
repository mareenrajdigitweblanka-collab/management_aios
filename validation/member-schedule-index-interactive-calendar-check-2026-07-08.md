---
name: member-schedule-index-interactive-calendar-check
type: validation
created: 2026-07-08
created-by: Mareenraj (builder)
status: AMBER — TESTING UI ONLY
supersedes-in-part: validation/member-schedule-testing-calendar-ui-check-2026-07-08.md
updated: 2026-07-08 — (1) bug fix: calendar was not editable/interactive; (2) moved from separate tab into each member tab; (3) removed duplicate static calendar UI; (4) aligned per-member calendars to the aios_role_desk_views.html sample demo layout
---

# Validation — Interactive Management Team Schedule Calendar (Inside index.html)

## 2026-07-08 Update 4 — Aligned Per-Member Calendars to Sample Demo Layout

### A. User Clarification

The user uploaded `aios_role_desk_views.html` and clarified it is the **sample demo requirement** for the
Management Team Schedule task — a UI/interaction pattern reference only. Its "Management Team Schedule" panel
(MD Table 1–4: Month View, Priority Queue — Today, Recurring Templates Register, Member Schedule Sample) was
to be used for layout/interaction inspiration, **not** treated as confirmed company truth. The final
dashboard was to keep interactive calendars inside each member tab (not a separate schedule tab), consistent
with the prior two updates.

### B. How the Demo Was Used

Two demo interaction patterns were adopted into the existing per-member `mountScheduleCalendarInstance()`
factory in `web-view/index.html`:

1. **Visible task chips inside calendar dates** — the demo's Month View shows small coloured chips directly
   inside each date cell (e.g. `<span class="cal-chip amber">11:30 Merchandising</span>`). The calendar grid
   was changed from a plain item-count badge to rendering up to 2 real chips per date (the user's own sample
   entries, coloured by category, with a "+N more" overflow chip) — mirroring the demo's visual density
   without importing any of its sample data.
2. **Priority basis / Priority Queue concept** — the demo's "Priority Queue — Today" table ranks tasks
   High/Medium/Low across the whole team. A `Priority` field (High / Medium / Low, explicitly labeled
   "sample/demo only") was added to each member's schedule form, and a new "Priority Preview — Today
   (Sample/Demo)" card was added below the existing schedule list, ranking that member's own sample items for
   today by priority — the same ranking concept, scoped to one member and clearly marked as non-real.

No HTML, CSS, or JavaScript was copied verbatim from `aios_role_desk_views.html` — only the layout *idea*
(chips-in-cells, priority ranking) was reimplemented using the dashboard's existing `.msc-*` component
classes and vanilla JS, consistent with the rest of the file.

### C. Confirmation Demo Data Was Not Treated as Source Truth

Nothing from the demo file's sample tables (Leave & Absence Requests, Onboarding Tracker, KPI Scorecard,
Management Team Schedule rows, etc.) was registered as a source, written into `evidence/source-register.md`,
or treated as a confirmed schedule fact. The demo file itself is explicitly a UI/layout reference — its own
disclaimer banner states its rows are "illustrative sample data for layout reference only" — and this build
treats it the same way: inspiration for interaction design, not evidence.

### D. Confirmation No Real Names / Real Meetings Copied

Checked via `git diff -- web-view/index.html` for every personal name and meeting label that appears in
`aios_role_desk_views.html`'s sample tables (N. Perera, S. Fernando, R. de Silva, T. Wickrama, A. Jayasuriya,
K. Rathnayake, D. Silva, Saranya, Kajith, Pirija, Kayal, Vithusali, Dilaxshan, Mithula, Sakithiya, Gishor,
"Merchandising sync", "CST call", "Team Leader Review", "Technical interviews", "Technical sessions") —
**none** of these appear anywhere in the diff. (Note: "Saranya/Kajith/Pirija/Kayal/Vithusali/Dilaxshan/
Mithula/Sakithiya/Gishor" do appear elsewhere in `index.html`, but only inside the pre-existing, untouched HR
Schedule Pilot "Evidence / Technical Details" collapsed section — that content predates this task entirely,
documents a *different* real MD calendar screenshot reference unrelated to the newly uploaded demo file, and
was not added, copied, or modified by this change.) All calendar seed/demo entries and category options
remain limited to the four approved generic labels: Sample Task, Sample Review, Sample Follow-up, Sample
Planning.

### E. Per-Member Interactive Calendars Retained

All four `.msc-instance` mounts (Mayurika, Suman, Arun, Rajiv) remain — one per tab, each still built by the
same shared, independently-initializing factory function. No separate "Team Schedule (Test)" tab was
reintroduced.

### F. Static Duplicate UI Remains Removed

The static "HR Schedule Pilot — Internal Calendar Preview" block removed in Update 3 was not restored. The
replacement note ("Static HR Schedule Pilot preview removed to avoid duplicate calendars...") and the
collapsed Evidence/Technical Details section remain exactly as left by Update 3. No static sample-calendar
blocks were reintroduced in Suman, Arun, or Rajiv's tabs.

### G. localStorage-Only Behavior Preserved

Storage logic is unchanged — all four calendars continue to read/write only their own member-specific
localStorage key (`management_aios_testing_schedule_mayurika_v1`, `_suman_v1`, `_arun_v1`, `_rajiv_v1`). The
new `priority` field is stored as a plain string (`"High"`/`"Medium"`/`"Low"`) inside each item's JSON object
in the same localStorage array — no new storage mechanism, no PostgreSQL, no API, no schema, no server code.

### H. Manual Test Checklist — All Four Member Calendars (Post-Demo-Alignment)

| Check | Mayurika | Suman | Arun | Rajiv |
|---|---|---|---|---|
| Exactly one interactive calendar present, no duplicate static preview | PASS | PASS | PASS | PASS |
| Demo-style visible chips render inside date cells for that member's own items | PASS | PASS | PASS | PASS |
| Priority field (High/Medium/Low, labeled sample/demo only) in the form | PASS | PASS | PASS | PASS |
| "Priority Preview — Today (Sample/Demo)" card ranks today's items | PASS | PASS | PASS | PASS |
| Add / Update / Cancel edit / View / Delete (confirm) / Clear Testing Data (confirm) all present | PASS | PASS | PASS | PASS |
| Demo-alignment helper sentence visible | PASS | PASS | PASS | PASS |
| Rajiv authority disclaimer visible | n/a | n/a | n/a | PASS |
| Own localStorage key used, independent of other members | PASS | PASS | PASS | PASS |

Supporting checks: both `<script>` blocks pass a Node.js syntax check; zero duplicate HTML `id` attributes;
`<div>` tags balanced when script content is excluded (654/654); no demo-file personal names or meeting
labels found anywhere in the diff.

### I. Status

**AMBER / TESTING UI ONLY** (unchanged scope) — this update only aligns the interaction style with the
uploaded sample demo; it does not add real schedule facts, does not resolve any confirmation item, and does
not mark the HR Schedule Pilot complete.

---

## 2026-07-08 Update 3 — Removed Duplicate Static Calendar UI

### A. User Feedback

A screenshot showed the old static month-view calendar still visible in the Mayurika HR tab, sitting above
the new interactive testing calendar added in Update 2. The user reported this static preview was now
unnecessary duplicate UI — the interactive calendar alone is enough for every member.

### B. Static Duplicate UI Removed

- **Mayurika HR tab:** the entire visible "HR Schedule Pilot — Internal Calendar Preview" block was removed —
  its header card, MD-request banner, static month-view grid (5-week calendar with reference chips), colour
  legend, "Priority Queue — Today" card, "Recurring Templates Register" card, the "8 schedule details still
  need confirmation" verification checklist, the "Next safe action" paragraph, and the static safety footer.
  In its place, a small section title ("HR Schedule Pilot") and the exact requested note are shown: "Static
  HR Schedule Pilot preview removed to avoid duplicate calendars. Use the interactive testing calendar below.
  Real schedule data still needs confirmation."
- The collapsed "Evidence / Technical Details" section (source paths, validation paths, and the
  `HR_SCHEDULE_PILOT_INTERNAL_BUILD_PENDING_MAYURIKA_CONFIRMATION` status string) was **kept**, unchanged,
  directly below the note — this preserves the pilot's provenance trail and its still-pending status without
  showing it prominently in the main visible UI.
- The tab's general "What should I do next?" guidance box (unrelated to the schedule calendar specifically)
  was left untouched.
- Suman, Arun, and Rajiv's tabs were checked and confirmed to already contain **no** static sample-calendar
  preview blocks (that cleanup was completed in Update 2, when the static blocks in those three tabs were
  replaced with interactive mounts) — no further removal was needed there.
- Now-orphaned CSS was also removed for cleanliness: `.hr-cal-legend` (and its `-item`/`-dot` variants),
  `.hr-cal-month-wrap`, `.hr-cal-month`, `.hr-cal-month-headcell`, `.hr-cal-month-cell`, `.hr-cal-daynum`
  (and `.today`), `.hr-cal-chip` (and its 6 colour variants), `.hr-verify-panel` (and its `h4`/list rules),
  and the related `@media (max-width: 768px)` overrides for `.hr-cal-month` / `.hr-verify-list`. These classes
  had zero remaining HTML usage after the static block was removed. Classes still actively used by the
  interactive calendar (`.hr-table-card`, `.hr-table-title`, `.hr-cal-header`, `.hr-cal-footer`,
  `.hr-md-banner`, `.hr-chip*`, and the distinct `.msc-cal-*` family) were verified as still referenced and
  left untouched.
- Source truth files were **not** deleted: `schedules/hr/README.md`, `schedules/hr/mayurika.md`,
  `schedules/hr/priority-queue.md`, `schedules/hr/recurring-templates/*`, and all
  `evidence/stakeholder-confirmations/hr-schedule-pilot-*` / `validation/hr-schedule-pilot-*` files remain on
  disk exactly as before — only the visible HTML block inside `web-view/index.html` was removed.

### C. Interactive Per-Member Calendars Retained

All four `.msc-instance` mount points remain exactly as built in Update 2 — one each in the Mayurika, Suman,
Arun, and Rajiv tabs — untouched by this cleanup. Each still renders its own independent calendar (banner,
month grid, form, list, Clear Testing Data button, view modal) via the shared
`mountScheduleCalendarInstance()` factory.

### D. HR Schedule Pilot Not Marked Complete

The HR Schedule Pilot's status string, `HR_SCHEDULE_PILOT_INTERNAL_BUILD_PENDING_MAYURIKA_CONFIRMATION`, is
preserved verbatim inside the (still present, still collapsed) Evidence / Technical Details section — it was
not changed, replaced, or removed. The Mayurika tab's replacement note explicitly reinforces this: "Real
schedule data still needs confirmation."

### E. localStorage-Only Behavior Preserved

No storage logic was touched by this cleanup — all four calendars continue to read/write only their own
member-specific localStorage key (`management_aios_testing_schedule_mayurika_v1`, `_suman_v1`, `_arun_v1`,
`_rajiv_v1`). No PostgreSQL, API, schema, or server code was added or exists anywhere in the file.

### F. Manual Test Checklist — All Four Member Calendars (Post-Cleanup)

| Check | Mayurika | Suman | Arun | Rajiv |
|---|---|---|---|---|
| No duplicate static calendar preview visible | PASS (removed) | PASS (already clean) | PASS (already clean) | PASS (already clean) |
| Exactly one interactive calendar present | PASS | PASS | PASS | PASS |
| Testing Preview Only / local browser data note visible | PASS | PASS | PASS | PASS |
| Add / Update / Cancel edit / View / Delete (confirm) / Clear Testing Data (confirm) all present | PASS | PASS | PASS | PASS |
| Rajiv authority disclaimer visible | n/a | n/a | n/a | PASS |
| Own localStorage key used, independent of other members | PASS | PASS | PASS | PASS |

Supporting checks: both remaining `<script>` blocks pass a Node.js syntax check; zero duplicate HTML `id`
attributes anywhere in the file; `<div>` tags balanced when script content is excluded (654/654); the
"Team Schedule (Test)" tab remains removed (not reintroduced by this change).

### G. Status

**AMBER / TESTING UI ONLY** (unchanged scope) — this update only removes duplicate visible UI; it does not
change what data exists, does not resolve any confirmation item, and does not mark the HR Schedule Pilot
complete.

---

## 2026-07-08 Update 2 — Moved From Separate Tab Into Each Member Tab

### A. User Clarification

The user found the separate "Team Schedule (Test)" tab from the prior build, but clarified that the
interactive UI must live **inside each member's own tab** (Mayurika HR, Suman Recruitment, Arun
Implementation, Rajiv / Admin) rather than as one standalone tab shared by all four members.

### B. Files Changed

| File | Change |
|---|---|
| `web-view/index.html` | Removed the "Team Schedule (Test)" tab button and its tab panel entirely; removed the old single-instance calendar `<script>` block; added a new reusable multi-instance calendar `<script>` block; replaced the static sample-preview blocks in the Suman, Arun, and Rajiv tabs with an interactive mount container; added a new interactive mount container to the Mayurika tab below (and separate from) the existing HR Schedule Pilot section; removed now-unused `.msc-member-row` / `.msc-member-btn` CSS (the member-selector UI is no longer needed since each tab already defines its member) |
| `validation/member-schedule-index-interactive-calendar-check-2026-07-08.md` | This file — updated with this section |
| `handover/2026-06-30__web-view-dashboard-closure.md` | Correction note appended |

### C. What Was Removed / Disabled From the Separate Tab

- The `<button data-tab="team-schedule-test">` tab button was removed from the tab bar entirely (not
  hidden) — removal was judged low-risk because the tab-switching JS iterates over whatever `.tab-btn` /
  `.tab-panel` elements exist at load time; removing both the button and its panel together leaves no
  dangling reference.
- The `<div class="tab-panel" id="tab-team-schedule-test">` panel (member selector, one shared calendar,
  form, list, modal) was removed entirely, replaced by an HTML comment noting the removal and pointing to
  this validation file.
- The old single-instance JS (`initScheduleCalendar()` keyed to one `#mscForm`/`#mscFieldMember` etc. with a
  member-selector row) was deleted in full and replaced by the new reusable factory described below.

### D. What Was Added to Each Member Tab

Each of the four member tabs now contains its own interactive calendar, mounted into a
`<div class="msc-instance" data-member-key="..." data-member-label="..." data-storage-key="...">` container
placed directly in that tab's markup:

- **Mayurika HR tab:** a new "Mayurika Schedule Calendar — Testing Preview" section was added *below* the
  existing HR Schedule Pilot section, which is preserved completely unchanged. A short note clarifies the two
  are separate: "This is a separate interactive testing area, kept apart from the HR Schedule Pilot above.
  The HR Schedule Pilot's own content and confirmation status are unchanged." No `<table>` markup was added
  — the Mayurika HR no-table rule is preserved.
- **Suman Recruitment tab:** the static "Schedule Calendar — Testing Preview Only" block (header card, static
  month-view grid, static priority-preview card) was replaced in place with the interactive mount container,
  titled "Suman Schedule Calendar — Testing Preview".
- **Arun Implementation tab:** same replacement, titled "Arun Schedule Calendar — Testing Preview".
- **Rajiv / Admin tab:** same replacement, titled "Rajiv Schedule Calendar — Testing Preview", with
  `data-rajiv-note="true"` so the Admin Manager authority disclaimer renders automatically (see section J).

At runtime, a single reusable JavaScript factory (`mountScheduleCalendarInstance(container)`) reads each
container's `data-*` attributes and injects the full calendar UI (banner, toolbar, month grid, form, list,
Clear Testing Data button, view modal) into that container, then wires all event listeners using
`container.querySelector(...)` — never a page-wide `document.getElementById`. No element in the generated
markup uses an `id` attribute; every repeated element is addressed by class name scoped to its own container.
This is what allows four independent calendar instances to coexist on one page without any duplicate-id risk.
A single `initAllScheduleCalendars()` function finds every `.msc-instance` element on the page (via
`document.querySelectorAll('.msc-instance')`) and mounts each one independently inside its own `try/catch`,
so a failure in one instance cannot prevent the other three from initializing.

### E. Member-Specific localStorage Behavior

Per-member keys were used (the task's preferred option), rather than one shared key with a member field:

| Member | localStorage key |
|---|---|
| Mayurika | `management_aios_testing_schedule_mayurika_v1` |
| Suman | `management_aios_testing_schedule_suman_v1` |
| Arun | `management_aios_testing_schedule_arun_v1` |
| Rajiv | `management_aios_testing_schedule_rajiv_v1` |

Each calendar instance reads and writes only its own key — there is no cross-member data path anywhere in
the code, and no member-selector UI is present (the tab itself defines the member, per the task's
requirement). Each key seeds with exactly one generic "Sample Task" entry on first-ever load (dated to that
browser's current date at load time), and the visible note "This browser stores testing data locally. It is
not saved to GitHub or PostgreSQL." appears in every instance's footer.

### F. Manual Test Checklist — Mayurika, Suman, Arun, Rajiv

The same interaction flow was traced against the shared factory code for all four mount points (the code
path is identical per instance; only the `data-*` config differs):

| Step | Mayurika | Suman | Arun | Rajiv |
|---|---|---|---|---|
| Tab shows calendar with Today's month, no member selector | PASS | PASS | PASS | PASS |
| Click a date → selects, labels update, form date fills in | PASS | PASS | PASS | PASS |
| Press Enter in a field → does not reload the page (`preventDefault` on each instance's own form) | PASS | PASS | PASS | PASS |
| Add schedule → item saved to that member's own storage key, appears in list | PASS | PASS | PASS | PASS |
| Edit → form populates, Add hides, Update/Cancel show | PASS | PASS | PASS | PASS |
| Update schedule → item updates, form resets to Add mode | PASS | PASS | PASS | PASS |
| Cancel edit → form resets without changes | PASS | PASS | PASS | PASS |
| View → modal opens with title/date/time/category/notes; Close and click-outside both dismiss | PASS | PASS | PASS | PASS |
| Delete → confirm prompt, removes only from that member's storage key | PASS | PASS | PASS | PASS |
| Clear Testing Data → confirm prompt, empties only that member's storage key | PASS | PASS | PASS | PASS |
| Previous / Today / Next → month view changes; data for other members in other tabs is unaffected | PASS | PASS | PASS | PASS |
| Rajiv-only: authority disclaimer visible | n/a | n/a | n/a | PASS |

Supporting checks: JS syntax-checked with `node -e "new Function(...)"` for both remaining `<script>`
blocks (pass); zero duplicate `id` attributes anywhere in the file (checked via full-file scan); HTML `<div>`
open/close tags balanced when script content is excluded (749/749).

### G. Testing-Only Safety Statement

Unchanged from the prior build: every instance displays "Testing Preview Only — schedules saved here are
local browser testing data only. Real schedule data must be confirmed before official use." and "This
browser stores testing data locally. It is not saved to GitHub or PostgreSQL." Categories remain limited to
the 4 approved generic labels (Sample Task, Sample Review, Sample Follow-up, Sample Planning). No real staff
names, customer names, real meeting names, official recurring blocks, approval rules, escalation rules, or
KPI ownership wording were introduced anywhere in this update.

### H. Real Data Pending Member/Domain-Owner Confirmation

No confirmed schedule fact was created for any member. Per §18 Reviewer Routing Rule, real schedule data for
each member would require that member's own confirmation (Mayurika, Suman, Arun, Rajiv) and, where relevant,
Varmen/MD sign-off, following the same MD-request → registration → confirmation flow already used for the HR
Schedule Pilot. Moving the UI into each member's own tab does not shortcut or imply this process.

### I. Duplicate / Parent-Truth Risk

- Mayurika's tab now contains two calendar-related sections: the pre-existing HR Schedule Pilot (still
  AMBER, still unconfirmed, still untouched) and the new interactive testing calendar. These are visually and
  textually separated with an explicit note that they are not the same thing, to avoid the two being
  conflated as one confirmed source.
- The interactive calendars remain per-browser, localStorage-only, and are not synced or shared across
  users or devices — they cannot be mistaken for a shared/confirmed Management Team schedule.
- No source was registered in `evidence/source-register.md`; no `[VERIFY]` item was created or resolved; the
  HR Schedule Pilot's own status string is untouched.
- Removing the separate "Team Schedule (Test)" tab eliminates the previous risk of the same testing data
  looking like a unified "Management Team" schedule — each member's data now visibly lives only inside that
  member's own tab.

### J. Rajiv / Admin Authority Safety Note

The Rajiv tab's calendar instance is configured with `data-rajiv-note="true"`, which makes the factory
render a visible (non-collapsed) note: "This testing calendar does not confirm Admin Manager approval,
escalation, or authority rules." SRC-ADMIN-001 remains PENDING and was not registered, edited, or referenced
as resolved anywhere in this update. No approval right, escalation authority, PRC role, or final
responsibility is implied for Rajiv's sample data or UI copy.

### K. Pass/Fail Rule

**PASS** if: no standalone HTML file was created; the separate "Team Schedule (Test)" tab (button and panel)
is fully removed; each of the four member tabs contains its own interactive calendar with Add/View/Edit/
Delete/Clear Testing Data; every form has `preventDefault()` wired; no duplicate `id` attributes exist
anywhere in the file; storage is localStorage-only under the four member-specific keys; no PostgreSQL/API/
schema/server code exists; and no source-register, verify-register, SRC-ADMIN-001, HR Schedule Pilot status,
or Mayurika no-table rule changes occurred. **FAIL** if any of the above is missing or violated.

Result: **PASS** against this rule — see the verification checks recorded in the appended handover note for
this task.

### L. Status

**AMBER / TESTING UI ONLY** (unchanged scope) — each member's calendar remains a browser-local,
localStorage-only UI-testing feature, not official schedule truth. Real schedule data for any member remains
pending future member/domain-owner confirmation.

---

## 2026-07-08 Update 1 — Bug Fix: Calendar Was Not Editable / Interactive

**User bug report:** "I can't edit or interact with calendar." The interactive calendar tab was added to
`web-view/index.html` in the prior build, but the user reported it was not usable — clicking around the
calendar and form did not behave as expected.

**Root cause found:** All schedule form fields (Date, Title, Category, Start time, End time, Notes) were
placed inside a native `<form id="mscForm">` element that had **no `submit` event handler and no
`preventDefault()`**, and no `action`/`method` attribute was set. In standard HTML behaviour, pressing
**Enter** inside any text/date/time input field within a `<form>` triggers an implicit form submission even
without a submit button being focused. With no submission handler and no action URL, the browser's default
behaviour is to reload the current page (appending form field values as a query string), which wipes all
in-progress interaction and any state built up on the page. This is a very common, easy-to-miss bug and
matches the reported symptom exactly: a user types a title or picks a date, presses Enter out of habit (or a
mobile/on-screen keyboard's "Go"/"Done" key triggers the same submit behaviour), and the page appears to
reset/do nothing rather than adding the item.

Supporting checks performed to rule out other causes, all of which came back clean:
- No duplicate HTML `id` attributes anywhere in the document (checked with a full-file `id="..."` scan).
- Every `getElementById('msc...')` call in the JS has exactly one matching element in the HTML — no
  mismatched or missing IDs that would throw a `TypeError` and abort the script partway through.
- No `pointer-events` CSS rules anywhere in the file that could block clicks.
- No fixed/sticky overlay with a high `z-index` covering the calendar area (the only `z-index` positioned
  elements are the top navigation bar, the tab bar, and the calendar's own View modal — which is
  `display:none` unless explicitly opened).
- Both inline `<script>` blocks pass a Node.js `new Function(...)` syntax check — no JavaScript syntax errors.
- The interactive calendar's `<script>` tag sits after all of its panel HTML in document order, so
  `document.getElementById` lookups at script-execution time were already guaranteed to succeed — DOM-ready
  timing was not the primary defect, but the fix adds defense-in-depth for it anyway (see below).

**Fix applied:**
1. Added a `submit` listener on `#mscForm` that calls `e.preventDefault()`, so pressing Enter in any field no
   longer reloads the page — this is the primary fix for the reported bug.
2. Wrapped the entire calendar's setup code in a named `initScheduleCalendar()` function and now only run it
   via `document.readyState === 'loading' ? addEventListener('DOMContentLoaded', ...) : run immediately`.
   This directly satisfies the diagnostic request to check whether listeners are attached after
   DOMContentLoaded, and protects against any future edit that moves the script earlier in the page.
3. Wrapped the call to `initScheduleCalendar()` in a `try/catch` that logs to `console.error` on failure
   instead of silently aborting. Previously, if any single element lookup ever failed (e.g. a future edit
   breaks one ID), the whole script would throw and **no** event listener in the feature would attach —
   silently disabling Add/Edit/Delete/View/Clear all at once. The try/catch does not change today's working
   behaviour but prevents a repeat of this failure class from looking identical to "nothing works."
4. Added the requested helper message directly under the existing explanatory text: "Choose a member, click a
   date, then add or edit a testing schedule item."

No calendar logic, data model, storage key, category list, or safety text was changed — the fix is scoped to
initialization timing and the form-submit guard only.

**Manual test checklist (traced against the fixed code):**

| Step | Expected result | Result |
|---|---|---|
| Open "Team Schedule (Test)" tab | Tab activates; calendar, form, and list render for today's month with Mayurika selected by default | PASS (tab-switch wiring unchanged, matches existing pattern) |
| Click a member button (e.g. Rajiv) | Button highlights active; Rajiv safety note appears; calendar dot counts and list refresh for Rajiv | PASS |
| Click a date on the calendar grid | Date cell highlights as selected; "Schedule Item —" and "Schedule Items —" labels update to the clicked date; form date field fills in | PASS |
| Type a title and press Enter | Previously: page reloaded, losing all state. Now: Enter is suppressed by `preventDefault()`; no reload occurs | FIXED |
| Click "Add schedule" with a title filled in | New item saved to `items` array, persisted to localStorage, list re-renders showing the new item, form resets | PASS |
| Click "Edit" on a list item | Form fields populate with the item's values; Add button hides; Update/Cancel edit buttons show | PASS |
| Click "Update schedule" | Item updated in place, saved to localStorage, list re-renders, form resets back to Add mode | PASS |
| Click "Cancel edit" | Form resets and returns to Add mode without changing the item | PASS |
| Click "View" on a list item | Modal opens showing title, member, date, time, category, notes; "Close" and click-outside both dismiss it | PASS |
| Click "Delete" on a list item | `window.confirm` prompt appears; confirming removes the item from localStorage and re-renders; cancelling leaves it untouched | PASS |
| Click "Clear Testing Data" | `window.confirm` prompt appears; confirming empties all stored items across all members; cancelling leaves data untouched | PASS |
| Click Previous / Next / Today | Month view changes accordingly; Today jumps to and selects the current date | PASS |
| Reload the page | Previously-added items persist (read back from `localStorage`); seed data only appears on a first-ever empty load | PASS |

**Status remains: AMBER / TESTING UI ONLY.** This is still a browser-local, localStorage-only UI-testing
feature, not official schedule truth. The fix restores intended interactivity; it does not change the
testing-only scope, add real schedule data, or resolve any confirmation item.

---

## A. Purpose

Add an interactive, real-calendar-style testing UI to the existing `web-view/index.html` dashboard, allowing
a user to add, edit, view, and delete sample schedule items for each of the four Management AIOS members
(Mayurika, Arun, Rajiv, Suman). This is a UI-testing feature only — it does not create official schedule
truth, does not connect to any database, and does not register any source.

## B. User Correction: Interactive Calendar Must Be Inside index.html

The user explicitly corrected the approach: **do not create a standalone HTML file.** The interactive
calendar must live inside the existing `web-view/index.html` dashboard, as a new tab ("Team Schedule
(Test)"), consistent with how every other feature in this dashboard is delivered as a single self-contained
file. No `web-view/member-schedule-calendar.html` or any other standalone calendar file was created.

## C. Files Changed

| File | Change |
|---|---|
| `web-view/index.html` | New CSS block added (`.msc-*` classes) before `</style>`; new tab button ("Team Schedule (Test)") added to the tab bar; new tab panel (`id="tab-team-schedule-test"`) added before `</main>`; new `<script>` block added after the existing script, before `</body>`, implementing the interactive calendar |
| `validation/member-schedule-index-interactive-calendar-check-2026-07-08.md` | This file — created |
| `handover/2026-06-30__web-view-dashboard-closure.md` | Correction note appended recording that the interactive calendar was built inside `index.html`, not as a standalone file |

No other files were created or changed. No new HTML file was created.

## D. Feature List

Implemented inside the new "Team Schedule (Test)" tab:

1. **Section title:** "Management Team Schedule Calendar — Testing Preview"
2. **Warning banner:** "Testing Preview Only — schedules saved here are local browser testing data only. Real
   schedule data must be confirmed before official use."
3. **Team member selector:** four buttons — Mayurika — HR, Arun — Implementation, Rajiv — Admin, Suman —
   Recruitment. Selecting a member filters the calendar's item counts and the schedule list to that member.
4. **Month calendar grid:** Previous / Next / Today buttons, a month/year heading, a 7×6 date grid built at
   runtime from the browser's current date, a highlighted "today" marker, and a small item-count dot on any
   date that has sample entries for the selected member. Clicking a date selects it and shows its items.
5. **Schedule form:** selected member (read-only, follows the member selector), date, title, category
   (dropdown limited to the 4 approved sample categories), start time, end time, notes. "Add schedule" button
   creates a new item; when editing, "Update schedule" and "Cancel edit" buttons appear instead.
6. **Schedule list:** items for the selected date + selected member, each with **View**, **Edit**, and
   **Delete** buttons. View opens a simple modal/card showing title, member, date, time, category, and
   notes. Edit loads the item into the form (switching Add → Update/Cancel). Delete asks for confirmation
   (`window.confirm`) before removing the item, explicitly stating this only affects local testing data.
7. **Categories:** limited to exactly 4 dropdown options — Sample Task, Sample Review, Sample Follow-up,
   Sample Planning.
8. **Data storage:** `window.localStorage`, key `management_aios_testing_schedule_calendar_v1`. A "Clear
   Testing Data" button clears all stored items after a confirmation prompt, and a visible note states: "This
   browser stores testing data locally. It is not saved to GitHub or PostgreSQL."
9. **Starter sample data:** on first load (empty localStorage), four generic seed items are created — one per
   member, using only the 4 approved category labels as titles, dated relative to the browser's current date
   (today, +2 days, +5 days, −3 days) so no fixed real date is hard-coded. Each seed item's notes field states
   "Starter sample entry for UI testing only — not a real schedule item."
10. **Rajiv safety note:** when Rajiv is selected, a visible amber note reads: "This testing calendar does not
    confirm Admin Manager approval, escalation, or authority rules."
11. **Usability / technical-detail hiding:** no source IDs, evidence paths, commit hashes, or PASS/AMBER audit
    text appear in the visible UI. A single collapsed "Technical details" block points only to this
    validation file. Mayurika HR tab and its no-table rule were not touched.

## E. Data Storage Method: localStorage Only

All schedule items are read from and written to `window.localStorage` under the single key
`management_aios_testing_schedule_calendar_v1`, using `JSON.parse` / `JSON.stringify`. No `fetch`, `XMLHttpRequest`,
`WebSocket`, external script, CDN reference, database driver, ORM, connection string, or API endpoint was
added anywhere in the file. No PostgreSQL code, no schema, and no server-side code of any kind was
introduced. All logic runs client-side, inside the browser, entirely within the existing single HTML file.

## F. Testing-Only Safety Statement

This feature is explicitly and repeatedly marked as testing-only:

- Tab badge: "Testing"
- Section banner: "Testing Preview Only — schedules saved here are local browser testing data only. Real
  schedule data must be confirmed before official use."
- Explanatory paragraph: "This is the only interactive area in this dashboard — every other tab remains
  read-only... This browser stores testing data locally. It is not saved to GitHub or PostgreSQL."
- Footer: "Static testing calendar... Not connected to Google Calendar, GitHub, or PostgreSQL. Not official
  schedule truth."
- All seed/sample entries use only the 4 approved generic category labels as titles — no real staff,
  candidate, or customer names, and no real meeting names or policy/authority wording appear anywhere in the
  seed data or UI copy.

## G. Confirmation Real Data Is Pending Member/Domain-Owner Confirmation

No confirmed schedule fact was created for Mayurika, Arun, Rajiv, or Suman. Per §18 Reviewer Routing Rule,
real schedule data for each member would require domain-owner confirmation (Mayurika for HR, Arun for
KPI/implementation, Suman for recruitment, Rajiv for admin — the latter additionally gated on SRC-ADMIN-001)
and, where relevant, Varmen/MD sign-off — following the same MD-request → registration → confirmation flow
already used for the HR Schedule Pilot. This build does not shortcut, imply, or substitute for that process.

## H. Duplicate / Parent-Truth Risk

- This interactive calendar does not compete with or replace any existing source of truth. It is explicitly
  local-browser testing data, clearly separated (its own tab, its own banner, its own localStorage key) from
  the HR Schedule Pilot's read-only reference calendar and from CLAUDE.md's canonical content.
- Because this feature is interactive (unlike every other read-only tab), the dashboard's existing top-level
  "read-only internal build" safety strip could be misread as inconsistent with this tab. The tab's own
  banner and explanatory paragraph directly address this by stating it is "the only interactive area in this
  dashboard" and that all data stays local to the browser.
- No source was registered in `evidence/source-register.md`; no `[VERIFY]` item was created or resolved; the
  HR Schedule Pilot's own status and content are untouched.
- Data entered by one user in their own browser is not shared, synced, or visible to any other user or
  device — it cannot be mistaken for a shared/confirmed schedule across the Management Team.

## I. Rajiv / Admin Authority Safety Note

When Rajiv — Admin is selected in the member selector, a visible (non-collapsed) amber note appears above the
calendar: "This testing calendar does not confirm Admin Manager approval, escalation, or authority rules."
SRC-ADMIN-001 remains PENDING and was not registered, edited, or referenced as resolved anywhere in this
build. No approval right, escalation authority, PRC role, or final responsibility is implied for Rajiv's
sample data or UI copy.

## J. Pass/Fail Rule

**PASS** if: no standalone calendar HTML file was created; the required section title, banner text, member
selector, month grid with Prev/Today/Next, form (add/update/cancel), list (view/edit/delete with delete
confirmation), 4 approved categories, localStorage-only storage under the specified key, Clear Testing Data
button with confirmation, and Rajiv safety note are all present inside `web-view/index.html`; no real
schedule facts, real names, or real meeting names were introduced; and no source-register, verify-register,
SRC-ADMIN-001, or HR Schedule Pilot status changes occurred. **FAIL** if any of the above is missing, if a
standalone HTML file was created, or if any database/API/schema code was introduced.

Result: **PASS** against this rule — see confirmation checks recorded in the appended handover note for this
task.

## K. Status

**AMBER / TESTING UI ONLY** — this is a browser-local, localStorage-only UI-testing feature, not an
evidence-backed calendar and not official schedule truth. Real schedule data for any member remains pending
future member/domain-owner confirmation.

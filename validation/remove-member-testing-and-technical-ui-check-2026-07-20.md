# Remove Testing, Technical, Clear-Data, and Internal-Build UI From All Member Panels — Check — 2026-07-20

## 1. Scope

Frontend visible-UI cleanup only. No backend, database, migration, API
route, API request/response shape, PostgreSQL table, stored schedule
data, Task/Leave creation/edit/delete logic, conflict rules, Schedule
Summary calculation, member key, member API routing, Staff Data
functionality, calendar Month/Week/Day behavior, or navigation order
change. Protected path `member-aios/mayurika-hr/staff-data/` was never
inspected, staged, or committed (confirmed untracked before and after
— see §14).

## 2. Confirmed requirement (source of truth)

User-confirmed instruction: remove from every member page (Mayurika,
Suman, Arun, Rajiv, Paraparan) —

1. The "Testing Preview Only" warning banner.
2. The testing explanation directly tied to that banner (local
   FastAPI + PostgreSQL backend / testing-purposes-only wording).
3. Any nearby statement identifying the calendar as sample/testing/
   demo/local-only/unofficial that belongs to the removed testing
   block.
4. The "Clear Testing Data" button/section.
5. The technical storage/API explanation beneath it.
6. The expandable "Technical details" section.
7. The dark bottom footer (internal/read-only/build/branch/future-
   validation wording).

Backend endpoints, stored data, and Staff Data functionality are
explicitly out of scope for removal.

## 3. Discovery inventory (Step 2)

| Element | Owning code | Selector | Shared across all 5 members? | Event listener? | Calls API? | Removal affects layout spacing? |
|---|---|---|---|---|---|---|
| "Testing Preview Only" banner | `mountScheduleCalendarInstance` (`web-view/js/calendar/instance.js`) | `.msc-banner` | Yes — one shared factory function | No | No | Yes — banner had `margin-bottom:12px` |
| "Schedule items here are saved to a local FastAPI + PostgreSQL backend for testing purposes only…" note | same factory | `.msc-note` (1st of 4) | Yes | No | No | Yes — `margin:0 0 16px` |
| "This follows the Management Team Schedule demo layout, but all entries here are sample testing data." note | same factory | `.msc-note` (3rd of 4) | Yes | No | No | Yes — `margin:0 0 16px` |
| "Click a date, then add or edit a testing schedule item." instruction | same factory | `.msc-note` (2nd of 4, bold) | Yes | No | No | No — retained, text only changed |
| Section heading suffix " — Testing Preview" | static `web-view/index.html`, one `<h3 class="section-title">` per member, directly above each `.msc-instance` | `.section-title` (per-member text) | Pattern shared, text is per-member (5 separate `<h3>` elements) | No | No | No — heading itself stays, only trailing text removed |
| "Clear Testing Data" button | same factory | `.msc-btn.msc-clear-btn` inside `.msc-form-actions` | Yes | Yes — `click` handler at former line 1847, `DELETE {apiBase}/clear-testing-data` | Yes (frontend caller only) | Yes — wrapper had `margin-top:16px` |
| Technical storage/API explanation ("Testing calendar. Data is stored via a local FastAPI + PostgreSQL backend…") | same factory | `.hr-cal-footer` | Yes | No | No | Yes — `margin-bottom:10px` |
| "Technical details" expandable | same factory | `<details>` (no class) | Yes | Native `<details>` toggle only | No | Yes — `margin-top:6px;margin-bottom:18px` |
| Dark bottom footer (READ-ONLY / Internal Build / Branch / build-first-validate-later / Future validation) | static `web-view/index.html`, page-level, sibling of `.app-body` | `<footer class="dashboard-footer">` | Yes — one single page-level footer (not per-member) | No | No | No — `body` is `display:flex;flex-direction:column`; removing the footer does not leave reserved space |
| Rajiv-only Admin Manager disclaimer ("This testing calendar does not confirm Admin Manager approval, escalation, or authority rules.") | same factory, conditional on `data-rajiv-note="true"` | `.msc-rajiv-note` | Rajiv only | No | No | N/A — retained (see §4) |

All ownership was confirmed by reading the source before any edit was
made (Step 2 requirement).

## 4. Judgment call: what was retained and why

- **Rajiv's Admin Manager disclaimer was retained**, not removed. It
  contains the word "testing" but its function is a governance
  caveat tied to CLAUDE.md's `[VERIFY — awaiting SRC-ADMIN-001]` item
  (Admin Manager authority is unconfirmed) — not part of the
  identified testing-preview banner block, and not in the user's
  itemised removal list (items 1-7, §2). Removing it would risk
  implying Admin Manager authority has been confirmed, which
  CLAUDE.md §13 explicitly forbids ("Invent Admin Manager authority").
  Flagged here for the domain owner (Rajiv, per CLAUDE.md §18) to
  confirm or override.
- **"Priority Preview — Today (Sample/Demo)" list card was retained.**
  It is a separate, lower section of the page (not part of the banner
  block removed in Step 3) and was not named in the user's itemised
  list. Removing it would be scope creep beyond the 7 confirmed
  items.
- **"HR/Suman/Arun Testing Tables — Sample Preview" sections were
  retained** (large sample-data table blocks that precede each
  member's calendar on the Mayurika/Suman/Arun tabs, containing
  "Testing Only" pills and "Sample" wording). These are a distinct,
  separate feature from the calendar's testing-preview banner and are
  not named anywhere in the user's itemised requirement (§2, items
  1-7). Removing them was judged out of scope and was **not done** —
  flagged here explicitly so the user/domain owner can decide in a
  follow-up task if broader removal was actually intended.
- **The landing/overview tab's own "Build status," "READ-ONLY" pills,
  and "Evidence / Technical Details" expandable were retained.** These
  live on the Root AIOS overview tab, not on any of the five member
  panels named in the requirement, so they are outside this task's
  scope.
- **CSS/JS source comments mentioning "Testing Preview"** (one line in
  `calendar.css`) were left as-is — they are not rendered/visible UI
  and the task is scoped to visible-UI cleanup.

## 5. Files touched (Step 8/17)

| File | Change |
|---|---|
| `web-view/js/calendar/instance.js` | Removed `.msc-banner` block + 2 of 4 testing notes; reworded the retained instruction note; removed `.msc-form-actions`/"Clear Testing Data" button, `.hr-cal-footer` technical explanation, and the `<details>` "Technical details" block; removed the now-dead `clearBtn` variable and its `click` listener (its DELETE `/clear-testing-data` call site is gone — the backend route itself is untouched) |
| `web-view/index.html` | Removed the " — Testing Preview" suffix from all 5 member section headings; removed the page-level `<footer class="dashboard-footer">` block entirely |
| `web-view/css/calendar.css` | Removed the now-unused `.msc-banner` / `.msc-banner .msc-banner-icon` / `.msc-banner strong` rules |
| `web-view/css/components.css` | Removed the now-unused `.dashboard-footer` / `.dashboard-footer-left` / `.dashboard-footer-badge` / `.dashboard-footer-right` rules (incl. their responsive media query) and the now-unused `.hr-cal-footer` rule |
| `web-view/css/tokens.css` | Removed the now-unused `--panel-dark-amber` / `--panel-dark-amber-text` tokens (only consumer was the removed `.msc-banner`); updated a stale derivation comment for `--cal-canvas-height` to note the banner removal (doc-only, no numeric value changed — see §12 known limitation) |

Confirmed via `git diff --stat` — exactly these 5 files, nothing else
(§14).

## 6. Testing-preview banner result

**Removed.** `.msc-banner` markup and its two dedicated CSS rules
(`calendar.css`) are gone from all 5 member calendars (shared
factory — one code change, verified applied to all 5 via
`git diff` touching only the shared function). Confirmed zero matches
for "Testing Preview Only" anywhere in `web-view/` after the edit
(`grep`).

## 7. Testing instruction result

- "Schedule items here are saved to a local FastAPI + PostgreSQL
  backend for testing purposes only…" — **removed**.
- "This follows the Management Team Schedule demo layout, but all
  entries here are sample testing data." — **removed**.
- "Click a date, then add or edit a testing schedule item." —
  **retained, reworded** to the task's own suggested neutral text:
  "Click a date to create or manage a schedule item."
- Per-member section heading — **" — Testing Preview" suffix removed**
  from all 5 (`Mayurika Schedule Calendar`, `Suman Schedule Calendar`,
  `Arun Schedule Calendar`, `Rajiv Schedule Calendar`, `Paraparan
  Schedule Calendar`). This heading was not explicitly named in the
  user's item list but was caught during browser verification (§13,
  screenshot) as visible "Testing Preview" wording sitting directly
  above each calendar — squarely inside the intent of item 3.

## 8. Local API/PostgreSQL explanation result

**Removed.** Both occurrences —the `.msc-note` under the banner and
the `.hr-cal-footer` block ("Testing calendar. Data is stored via a
local FastAPI + PostgreSQL backend…") — are gone. Zero matches for
"local FastAPI", "PostgreSQL backend for testing", or "Not official
schedule truth" remain in `web-view/` (confirmed by `grep`; one
unrelated code-comment line in `calendar.css` line 1 still names
"local FastAPI/PostgreSQL backend" — not rendered UI, left as a source
comment per §4).

## 9. Clear Testing Data result

**Removed** — button, its `.msc-form-actions` wrapper, and the frontend
`click` listener (former lines 1847-1862 of `instance.js`, which
called `DELETE {apiBase}/clear-testing-data`) are all gone. The
now-orphaned `var clearBtn = container.querySelector('.msc-clear-btn')`
declaration was also removed (it would otherwise be `null`, and the
prior code called `.addEventListener` on it unconditionally — leaving
it in place would have thrown a `TypeError` on every calendar mount).
**Backend route untouched**: `backend/` shows zero diff (§14); the
`/clear-testing-data` DELETE endpoint still exists server-side, simply
has no frontend caller anymore, per the task's explicit instruction
not to delete backend code.

## 10. Technical details result

**Removed** — the `<details>...Technical details...</details>` block
(validation-file reference link included) is gone from all 5 member
calendars. Zero matches for "Technical details" remain in `web-view/`.

## 11. Internal footer result

**Removed** — the entire `<footer class="dashboard-footer">` block
(READ-ONLY badge, "Internal Build v0.1", sensitive-data note,
"Branch: individual-aios", "build-first / validate-later", "Future
validation: Mayurika, Varmen, Management Team") is gone from the end
of the page, along with its dedicated CSS (`.dashboard-footer*` rules
and responsive media query in `components.css`). The main `<header>`
(top bar, search, sidebar) was not touched. Confirmed via `grep` — zero
matches for "READ-ONLY", "Internal Build", "Branch: individual-aios",
"build-first", "validate-later" **within any member-panel-reachable
markup**; the identical wording still legitimately exists on the
separate Root AIOS overview tab (`Build status: Internal Build v0.1 ·
PASS`, `READ-ONLY` lock pill, an unrelated "Evidence / Technical
Details" expandable) — out of scope per §4, not touched.

## 12. Per-member result

| Member | Banner | Testing notes | Clear Testing Data | Technical details | Heading | Calendar renders | Console errors |
|---|---|---|---|---|---|---|---|
| Mayurika | Absent | Absent (neutral instruction retained) | Absent | Absent | "Mayurika Schedule Calendar" | Yes (Month grid, Create button, sidebar) | None |
| Suman | Absent | Absent | Absent | Absent | "Suman Schedule Calendar" | Yes | None |
| Arun | Absent | Absent | Absent | Absent | "Arun Schedule Calendar" | Yes | None |
| Rajiv | Absent | Absent (Admin Manager disclaimer retained, §4) | Absent | Absent | "Rajiv Schedule Calendar" | Yes | None |
| Paraparan | Absent | Absent | Absent | Absent | "Paraparan Schedule Calendar" | Yes | None |

All five verified live via headless Chrome against the local static
server (`http://127.0.0.1:8843`), both by DOM inspection
(`container.innerHTML()` checked for `msc-banner`/"Clear Testing
Data"/"Technical details" substrings — all `false`) and by full-page
screenshot (§15).

## 13. Layout-gap result (Step 9)

- No large blank area remains above any calendar — the shell now opens
  directly with the (retained) instruction line and the functional
  API-status placeholder, immediately followed by the calendar card.
  Confirmed visually (screenshots, §15): `Paraparan Schedule Calendar`
  heading → instruction line → (API-status line, only visible when the
  backend is unreachable — legitimate functional error, not testing
  copy) → calendar toolbar, with no dead space between.
- Schedule Summary follows the calendar naturally (unchanged markup,
  unaffected by this task's edits).
- No empty card or leftover border remains where "Clear Testing Data" /
  the technical footer / "Technical details" used to sit — those three
  blocks were fully self-contained `<div>`/`<details>` pairs, removed
  as complete balanced units (confirmed by brace/tag-balance checks,
  §14), leaving the adjacent Priority Preview card and the Task-detail
  popup markup exactly as they were.
- No unexpected bottom padding remains after footer removal — `body`
  is `display:flex;flex-direction:column;min-height:100vh`
  (`tokens.css`); the footer's own padding/border were removed with it,
  and nothing else reserved space for it.
- Fixed header still renders correctly, uncovered by content (unrelated
  markup, not touched).
- Sidebar height/behavior unchanged (unrelated files, zero diff).

**Known limitation (not a defect):** `--cal-canvas-height` in
`tokens.css` still reserves a ~300px buffer above the calendar grid
that was originally sized to include the (now-removed) banner and two
notes. Since real content above the calendar shrank by roughly
150-190px, the reserved buffer is now conservative — the calendar
canvas may render marginally shorter than the viewport could now
allow. This does **not** create a blank gap, overflow, or broken
layout (verified in every screenshot and responsive check, §15-16); it
is a minor missed optimization, left untouched rather than
guessed-and-changed without a dedicated visual A/B pass. Flagged as the
one next step (§20 of the handover doc).

## 14. Static checks (Step 14)

- `node --check` on every file under `web-view/js/` (7 files,
  including `instance.js`) — all pass, zero syntax errors.
- CSS brace-balance (`{`/`}` count) on `components.css`, `calendar.css`,
  `tokens.css`, `navigation.css`, `base.css`, `staff-data.css` — all
  balanced (components.css 159/159, calendar.css 252/252, tokens.css
  5/5, navigation.css 59/59, base.css 34/34, staff-data.css 109/109).
- HTML tag-balance check (`<footer>`/`<main>`/`<body>`/`<html>` open
  vs. close counts) on `index.html` — `footer` now 0/0 (fully
  removed), `main`/`body`/`html` all 1/1.
- Duplicate-`id` scan over `index.html` — 0 duplicates.
- No orphaned `aria-controls`/`aria-describedby` referencing a removed
  element — none of the removed elements (banner, Clear Testing Data
  button, technical footer, `<details>`, page footer) carried an `id`
  that anything else pointed at (confirmed by `grep`).
- Local static HTTP server (`python -m http.server`) — `index.html`,
  `css/components.css`, `css/calendar.css`, `css/tokens.css`,
  `js/calendar/instance.js`, `js/app.js` all return **HTTP 200**.
- Phrase search across `web-view/` for every removed string
  ("Testing Preview Only", "Clear Testing Data", "Technical details",
  "not official HR/Admin schedule truth", "Not official schedule
  truth", local-FastAPI-testing wording) — **zero matches** (one
  unrelated source-code comment excluded, §4/§8).
- `git diff --stat -- backend/ database/` — **empty** (no backend/DB
  changes).
- API contracts unchanged — no route added/removed/modified in
  `backend/` (zero diff); only the frontend caller of one existing
  DELETE route was removed.
- Schedule Summary logic unchanged — `instance.js` diff touches only
  the banner/notes block, the Clear-Data/footer/details block, and the
  now-dead `clearBtn` declaration/listener; the summary calculation
  functions were not touched (confirmed by diff — no other hunks).
- `git status --short` before and after — protected path
  `member-aios/mayurika-hr/staff-data/` remains the sole untracked
  entry throughout, never staged.

## 15. Browser validation (Step 15)

Performed with Playwright driving the machine's installed Google
Chrome (the sandboxed environment blocked Playwright's own
bundled-Chromium download over HTTPS — system Chrome was used as an
equivalent substitute, same approach as the prior sidebar-polish
task).

- All 5 member tabs opened via their sidebar nav buttons
  (`data-tab="mayurika-hr"`, `"suman-recruitment"`,
  `"arun-implementation"`, `"rajiv-blocked"`, `"paraparan"`) and
  inspected via DOM query + full-page screenshot.
- Top-of-section → calendar transition confirmed clean (no gap) on all
  5.
- Bottom-of-page confirmed footer-free on a full-page scrolled
  screenshot (Paraparan tab, `final-scroll-bottom.png`).
- Schedule Summary, Leave Coordination, and Priority Preview sections
  confirmed rendering directly below the calendar, unchanged.
- Desktop (1440×900) and mobile (390×844, drawer nav) both verified.
- Browser console: **zero `pageerror` events** across every viewport
  and every member tab (confirms the `clearBtn` listener removal did
  not leave a dangling reference — a `null.addEventListener()` call
  would have thrown on mount and been caught here). The only console
  activity was `net::ERR_CONNECTION_REFUSED` / HTTP 404 on the
  `127.0.0.1:8000` FastAPI endpoints (`/api/member-schedules/*`,
  `/api/member-leave/*`, `/api/staff/*`) — expected, since the backend
  was intentionally not started for this frontend-only check; the
  calendar shell still renders correctly and shows its existing,
  legitimate "Could not reach the local schedule API…" error line
  (unrelated to this task, not testing-only copy).

## 16. Responsive matrix (Step 13)

Checked at all 7 required viewports × all 5 members (35 checks) via
Playwright:

| Viewport | Banner absent | Clear Testing Data absent | Technical details absent | Footer absent | Horizontal overflow |
|---|---|---|---|---|---|
| 1920×1080 | Yes (5/5) | Yes (5/5) | Yes (5/5) | Yes | No |
| 1600×900 | Yes (5/5) | Yes (5/5) | Yes (5/5) | Yes | No |
| 1440×900 | Yes (5/5) | Yes (5/5) | Yes (5/5) | Yes | No |
| 1366×768 | Yes (5/5) | Yes (5/5) | Yes (5/5) | Yes | No |
| 1024px | Yes (5/5) | Yes (5/5) | Yes (5/5) | Yes | No |
| Tablet 834px (drawer nav) | Yes (5/5) | Yes (5/5) | Yes (5/5) | Yes | No |
| Mobile 390px (drawer nav) | Yes (5/5) | Yes (5/5) | Yes (5/5) | Yes | No |

`document.documentElement.scrollWidth > clientWidth` (horizontal
overflow check) was `false` at every one of the 7 viewports. Sidebar
nav (drawer on tablet/mobile, rail on desktop) opened and selected
every member tab successfully at every breakpoint.

## 17. Functional regression (Step 10)

Verified against the local static server without a live backend
(expected — API calls correctly fail with the existing, unrelated
"Could not reach the local schedule API" message rather than
crashing):

| # | Check | Result |
|---|---|---|
| 1 | Member panel opens | Pass — all 5 |
| 2 | Calendar loads | Pass — Month grid renders, mini date-picker populated |
| 3 | Month view | Pass — default view, renders, day cells present |
| 4 | Week view | Pass — clicked live (Mayurika), `aria-pressed="true"`, week pane visible |
| 5 | Day view | Pass — clicked live (Mayurika), `aria-pressed="true"`, day pane visible; also confirmed via mobile screenshot |
| 6 | Create chooser opens | Pass — clicked live, `.msc-create-menu` becomes visible |
| 7 | Task creation popup | Pass — opened live via Create → Task, visible, closed cleanly via its close button |
| 8 | Leave creation popup | Pass — opened live via Create → Leave, visible, closed cleanly |
| 9 | Direct task details | Not clicked live (requires an existing schedule item, and the backend is intentionally offline for this check — see §15); markup/handler untouched by this task's diff |
| 10 | `+N more` | Not clicked live (same reason — no seeded items without a live backend); markup/handler untouched by diff |
| 11 | Edit | Not clicked live (same reason); `editItem()` untouched by diff — only the now-dead `clearBtn` listener was removed |
| 12 | Delete | Not clicked live (same reason); `deleteItem()` untouched by diff |
| 13 | Cancel Edit | Not clicked live (same reason); `cancelEdit()` untouched by diff |
| 14 | Schedule Summary loads | Pass — card renders, "Select a date to see the summary" placeholder shown |
| 15 | Sidebar navigation | Pass — all 5 member tabs + Root AIOS + File Map + Staff Data reachable |
| 16 | Search | Not exercised (unrelated markup, zero diff) |
| 17 | No Clear Testing Data control | Pass — confirmed absent, 5/5 members, 7/7 viewports |
| 18 | No testing-preview banner | Pass — confirmed absent, 5/5 members, 7/7 viewports |
| 19 | No Technical details control | Pass — confirmed absent, 5/5 members, 7/7 viewports |
| 20 | No internal footer | Pass — confirmed absent at every viewport |

Items 9-13 and 16 require either a seeded schedule item or a live
backend to exercise end-to-end and were not click-tested in this pass
(the FastAPI backend was intentionally not started — this is a
frontend-only visible-UI check). Their code paths are untouched by
this task's diff (confirmed via `git diff` — no hunks in
`viewItem`/`editItem`/`deleteItem`/`cancelEdit`/search), and
`node --check` plus zero `pageerror` events across every interaction
performed confirm the module mounts and runs without throwing.

## 18. Accessibility (Step 12)

- No orphaned `aria-controls`/`aria-describedby` — none of the removed
  elements had an `id` referenced elsewhere (confirmed by `grep`, §14).
- No orphan IDs left behind — duplicate/orphan `id` scan clean.
- Keyboard Tab order no longer includes the removed banner/button/
  details controls (they no longer exist in the DOM at all, not merely
  hidden — so they were never reachable via Tab to begin with, this
  task didn't need to add `tabindex="-1"` or similar).
- Calendar toolbar (`Today`/prev/next/Month-Week-Day) is now the next
  focusable region after the (retained) instruction line, since the
  banner/notes that used to precede it are gone.
- Remaining heading hierarchy: the per-member `<h3 class="section-title">`
  is unchanged in level (still `<h3>`), only its trailing text changed
  — no heading-level regression.
- Footer removal: the removed `<footer>` had `role="contentinfo"` (a
  landmark) but contained only internal/build metadata, no unique
  content or navigation — no replacement landmark was needed.

## 19. Schedule Summary / backend / database / API unchanged

Confirmed via `git diff --stat -- backend/ database/` — **empty**.
`instance.js`'s Schedule Summary render functions
(`renderDailySummary`/`renderWeeklySummary`/`renderMonthlySummary` and
their DOM lookups) are outside every diff hunk in this change — the
diff touches only the banner/notes markup block, the Clear-Data/
footer/details markup block, and the single now-dead `clearBtn`
variable + its listener.

## 20. Overall result

**PASS.**

All 7 user-confirmed removal items (§2) are confirmed removed from
every one of the 5 member panels, applied through the single shared
calendar factory (`mountScheduleCalendarInstance`) plus one shared
page-level footer removal — not five member-specific patches. Static
checks, headless-browser DOM/console verification, and a 7-viewport ×
5-member responsive matrix all pass with zero console errors and zero
horizontal overflow. Backend, database, API contracts, Schedule
Summary logic, and the protected staff-data path are all confirmed
unchanged.

Two items are flagged for user/domain-owner decision rather than
silently resolved (§4): the Rajiv Admin Manager disclaimer (retained)
and the HR/Suman/Arun "Testing Tables — Sample Preview" sections
(retained, out of the itemised scope).

## 21. Protected folder

`member-aios/mayurika-hr/staff-data/` was never opened, inspected for
modification, staged, or committed. Confirmed via `git status --short`
before and after all edits — it remains the sole untracked entry
throughout this task.

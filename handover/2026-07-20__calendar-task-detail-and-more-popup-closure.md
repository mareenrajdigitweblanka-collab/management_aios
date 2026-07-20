---
name: calendar-task-detail-and-more-popup-handover
type: handover
scope: web-view — member schedule calendar (all 5 member instances)
created: 2026-07-20
status: PASS — shipped-ready, not yet committed/pushed/deployed (see §9)
owner: Mareenraj (frontend build)
reviewer: pending
---

# Calendar Task-Detail Popup & Month "+N more" Popup — Handover — 2026-07-20

## 1. What this task was

Remove the visible lower-page "Schedule Items" list from the member schedule calendar and
replace every way a user reaches Task detail with a single Google-style task-detail popup
(Edit/Delete/Close), plus a compact date-specific "+N more" popup in Month view. Frontend
only — no backend/database/API change.

## 2. Files changed

| File | What changed |
|---|---|
| `web-view/js/calendar/instance.js` | Removed the Schedule Items list-card + `renderList()` + `navigateToScheduleItemListForDate()`; restructured the task-detail modal (`.msc-view-modal`) with a header (color dot + × close) and Edit/Delete action row; added the Month "+N more" popup (`openMorePopup`/`closeMorePopup`/`positionMorePopup`); rewired Month chip and "+N more" click handlers; `deleteItem()` now returns `Promise<boolean>` |
| `web-view/css/calendar.css` | Added styles for the restructured detail-popup header/actions/color-dot and the new more-popup; removed the dead `.msc-list-heading` scroll-margin rule |

No other file touched. `web-view/index.html`, `web-view/js/calendar/core.js`,
`web-view/js/config.js`, `backend/`, `database/`, `database/migrations/` — all unchanged
(confirmed by `git diff --stat`).

## 3. Detail-popup ownership

The shared task-detail popup is owned by the same per-instance closure
(`mountScheduleCalendarInstance()` in `instance.js`) that already owned `viewItem()`,
`editItem()`, and `deleteItem()` — no new module, no new shared/global state. Every one of
the 5 member calendars gets its own independent popup instance and its own `currentViewItemId`
closure variable; nothing is shared across members.

## 4. More-popup ownership

Same closure, same file. New state: `morePopupOpen` (bool) and `morePopupAnchorEl` (the
triggering "+N more" chip or more-popup row, used for focus return). Positioning logic
(`positionMorePopup`) and the open/close/document-click-outside/Escape wiring
(`openMorePopup`/`closeMorePopup`/`onDocClickForMorePopup`/`onMorePopupKeydown`) mirror the
pre-existing "+ Create" dropdown pattern (`openCreateMenu`/`closeCreateMenu`) already in this
file — reused technique, not a new one.

## 5. Task-state ownership

Unchanged. `items` (the loaded Task array), `loadItems()`, `itemsForDate()`, `apiRequest()`
are exactly as before. The more-popup and the Month chips both read `itemsForDate(dateStr)` —
the same array every other view already reads — so there is no second/duplicate task list.

## 6. Removed renderer/functions

- `renderList()` — removed. Its only side effect still needed (`renderPriorityPreview()`) is
  now called directly from the three call sites that used to call `renderList()`
  (`selectDate()`, `deleteItem()`, the Clear Testing Data handler).
- `navigateToScheduleItemListForDate()` — removed. No remaining references.
- Element refs `listEl` (`.msc-list`) and `listDateLabel` (`.msc-list-date-label`) — removed
  (their DOM nodes no longer exist).
- CSS rule `.msc-list-heading { scroll-margin-top }` — removed (dead, its only scroll target
  was removed).

`.msc-list-card` itself (shared class with the still-present Priority Preview card) and its
CSS were **not** removed — only the first `.msc-list-card` instance (the Schedule Items one)
was deleted from the HTML template; Priority Preview keeps using the same class.

## 7. Retained API behavior

No API call was added, removed, or changed shape. `editItem()`/`deleteItem()` hit the exact
same `PUT`/`DELETE` endpoints as before, with the exact same payload construction
(`frontendToApiPayload`). `deleteItem()`'s only change is a `return`/`Promise<boolean>`
resolution so the new Delete button can know whether to close the popup — every pre-existing
caller (that ignored the return value) behaves identically.

## 8. Deployment

**Not deployed.** Changes are in the working tree on `main`, uncommitted as of this handover
(pre-change HEAD `d7eb417`). Per the task's staging instructions, only the two files above
plus this handover and its validation document should be staged — never `git add -A`/`git
add .`, and never the protected `member-aios/mayurika-hr/staff-data/` path. Deployment (once
committed/pushed) goes through the existing Vercel process
(`https://management-aios.vercel.app/`) — not run in this session.

## 9. Rollback

`git checkout -- web-view/js/calendar/instance.js web-view/css/calendar.css` (or revert the
commit once one exists) restores the prior lower-list behavior exactly — no database/API
state was ever touched, so rollback is purely a frontend file revert with no data
implications.

## 10. Commit hashes

None yet — no commit was made in this session (only requested if the user separately asks to
commit). Pre-change `HEAD` was `d7eb417`.

## 11. Limitations

- **Real-mobile-viewport browser pass not run.** Responsive CSS for the more-popup
  (`max-width: calc(100vw - 16px)` under 480px) was reviewed but not exercised in an actual
  narrow-viewport headless session in this pass.
- **`chromium-cli` was unavailable** in this environment; browser validation used a
  hand-written Playwright script against a cached Chromium binary (version-mismatched from
  the installed `playwright-core`, worked via explicit `executablePath`). If this recurs,
  running `/run-skill-generator` to capture a working browser-driver recipe as a project
  skill would save the next session this detour.
- An automated regex-based HTML tag-balance script produced a false positive (on both the
  pre-change and post-change file, identically) due to contractions inside JS comments
  confusing its naive string-literal extraction; the actual template balance was confirmed
  by manual line-by-line trace instead (see validation §9).

## 12. One next step

Get user/Management Team sign-off on the popup's visual style (screenshots in the validation
doc's session scratchpad), then stage exactly `web-view/js/calendar/instance.js`,
`web-view/css/calendar.css`, the validation doc, and this handover, and commit per the task's
suggested commit sequence.

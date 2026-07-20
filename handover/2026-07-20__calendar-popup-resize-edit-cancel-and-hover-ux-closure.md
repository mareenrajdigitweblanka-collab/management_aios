# Handover — Calendar Popup Resize, Edit-Cancel, and Hover UX (2026-07-20)

**Base commit:** `5a6a8a0` (main, "Replace Schedule Items list with calendar task popups").
**This work is uncommitted** in the working tree as of this handover — see §9. The requester
(Mareen) will manually browser-verify and push this themselves; this document hands off the
implementation for that review.

## 1. Files changed

- `web-view/js/calendar/instance.js` — Cancel Edit origin tracking + fix, delete-confirm wording,
  `aria-label`s on task chips/"+N more"/blank cells, `title="Create Task or Leave"` on blank areas.
- `web-view/css/calendar.css` — more-popup `resize: horizontal` + resize-grip cue, more-popup item
  title `flex`/`min-width` fix, task/all-day-chip/"+N more" hover strengthening, blank-area
  create-cue `:has()` exclusion for Month cells and the Week/Day all-day column.
- `web-view/css/tokens.css` — three new `--more-popup-*` width tokens.

No other files were modified. `web-view/index.html` and `web-view/css/components.css` were inspected
(per the task's expected-files list) but needed no changes — all calendar markup/styling lives in
`instance.js`/`calendar.css`; `components.css` has no calendar-specific selectors.

## 2. Popup state ownership

Everything lives inside `mountScheduleCalendarInstance()` in `instance.js` (one closure per member
tab). Key state, all closure-scoped (not global):

- `state.editingId` — set by `editItem()`, cleared by `cancelEdit()`; doubles as the Task popup's
  create-vs-edit mode flag.
- `currentViewItemId` — set by `viewItem()`, cleared by `closeViewModal()`; which task the shared
  detail popup (`.msc-view-modal`) is showing.
- **New:** `editOriginViewId` / `editOriginTriggerEl` — set only by the Edit button handler
  (`viewEditBtn` click), consumed only by the new `handleCancelEditClick()`. Nothing else reads or
  writes these two.

## 3. Resize ownership

Pure CSS, no JS width state. `.msc-more-popup` uses `resize: horizontal` bounded by
`--more-popup-min-width` / `--more-popup-max-width` (tokens.css). Positioning
(`positionMorePopup()` in instance.js) is untouched and still only runs once on open — it anchors
with `left`/`top` (never `right`/`bottom`), which is what makes native resize-to-the-right safe
without any JS recalculation. The popup DOM node is persistent (mounted once, only
hidden/shown), so a user-chosen width naturally persists across opens within a session — not a new
requirement, just a side effect of the existing architecture.

## 4. Cancel Edit transition

`viewEditBtn` click → captures `editOriginViewId`/`editOriginTriggerEl` → `closeViewModal()` →
`editItem(id)` → Task popup opens in edit mode. Cancel button → `handleCancelEditClick()` →
`cancelEdit()` (unchanged, form/button reset only) → `closeTaskPopup()` →
`viewItem(editOriginViewId, editOriginTriggerEl)` if an origin was captured. See
`validation/calendar-popup-resize-edit-cancel-and-hover-ux-check-2026-07-20.md` §3 for the full
root-cause trace.

## 5. Delete confirmation ownership

`deleteItem(id)` in instance.js builds the `window.confirm()` string inline (no shared dialog
component exists for this in the codebase today — a reusable one was not introduced, per the
requirement to avoid building a new dialog framework for this change alone). The DELETE API call in
the same function is unchanged.

## 6. Hover/blank-area-cue selectors touched

`.msc-cal-chip`, `.msc-cal-chip-more`, `.msc-tg-allday-chip`, `.msc-cal-cell--actionable`,
`.msc-tg-allday-col`, `.msc-more-popup-item-title` (all in `calendar.css`). All use existing design
tokens (`--surface-tint-2`, `--surface-tint-3`, `--muted-2`, existing `--focus-ring` fallback) — no
new colors introduced.

## 7. Deployment

Standard Vercel flow (unchanged by this task): push to `main` → Vercel auto-deploys
`web-view/` as the static frontend and `backend/` per the existing project config. **Not deployed as
part of this handover** — no commit/push was made in this session (see §9).

## 8. Rollback

If an issue surfaces post-deploy: `git revert <commit-hash-once-committed>` — this is a
frontend-only, additive/corrective change with no schema or API migration, so a plain revert is
safe and requires no data cleanup.

## 9. Commit hashes

None yet. Base commit at the start of this task: `5a6a8a0`. The requester will stage, commit, and
push manually — do not assume a commit exists under this task's name until confirmed.

## 10. Known limitations

- Interactive browser click-through (widen/narrow drag, live Edit→Cancel, live delete-confirm
  read, live hover/focus inspection, mobile viewport, console-error watch) was not completed in
  this session — the requester opted to do this manually before pushing. See validation doc §12.
- Closing the Task popup during an edit via Escape, the ✕ button, or a backdrop click (rather than
  the Cancel button) still leaves `state.editingId` set and does not return to the detail popup —
  this was true before this task and remains true; only the Cancel-button path was in scope per the
  confirmed requirements.
- The separate "Clear ALL testing data" button's confirmation text still mentions
  local API/database/testing — intentionally left alone; it is a genuinely testing-only bulk action,
  not the per-item delete confirmation named in the requirements.

## 11. One next step

Requester: run the manual browser pass listed in the validation doc §12, then stage only the three
files listed in §1 plus the two evidence docs (never `git add -A`), commit, and push to `origin/main`.

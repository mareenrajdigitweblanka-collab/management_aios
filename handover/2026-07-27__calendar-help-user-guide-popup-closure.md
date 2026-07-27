---
name: calendar-help-user-guide-popup-handover
type: handover
scope: web-view frontend only — Calendar help popup content/presentation redesign
created: 2026-07-27
updated: 2026-07-27 — committed (9bbd7af), pushed, live-review font-weight follow-up (b2b0722), deployment verified via read-only content checks (§13); still AMBER — live-browser/keyboard/screen-reader/network-tab pass not performed (§13.5)
status: AMBER — released and deployment-verified; live-browser manual pass still not performed (no browser-automation tool in this session)
owner: Mareenraj (build); relevant Management Team member per CLAUDE.md §18 for review/sign-off
reviewer: pending
---

# Calendar Help Popup Redesign — Handover — 2026-07-27

## 1. What this task was

Replace the Calendar's small "Calendar help" popup — which only covered the color legend, the Scheduled/
Unscheduled note, "+N more", and a Full-Day/Multi-Day Leave conflict line — with a full, plain-language
"how to use this Calendar" guide for non-technical members, covering every deployed Calendar/Tasks/Leave
workflow end to end. Frontend-only: no backend, API, database, migration, or dependency change; no Task,
Leave, classification, Schedule Summary, or XLSX-export behavior change.

## 2. Written requirement

Full 24-phase task brief (help-content redesign, layout rules, twelve required sections, exact-copy rules,
accessibility/responsive requirements, 34 required tests, PASS conditions) supplied directly by the user in
this session — not a separate intelligence-inbox document. See this repository's session transcript; this
handover and `validation/calendar-help-user-guide-popup-check-2026-07-27.md` are its closure record.

## 3. Repository state at start (Phase 1)

- Branch: `main`. Starting HEAD: `5694b0a` ("Close multiple time frame task validation").
- `git status --short`: clean (no uncommitted work at start).
- `git log origin/main..HEAD` / `git log HEAD..origin/main`: both empty — local `main` exactly matches
  `origin/main`, so every already-committed feature (including the 2026-07-27 multiple-time-frames-per-Task
  work, commit `c141064`) is confirmed **live in production**, not merely staged in the working tree. This
  guide therefore documents current live production, per the task's instruction to only describe an
  undeployed feature if it is "approved for the same release" — here, it is simply already released.
- `member-aios/mayurika-hr/staff-data/` (protected path) was never read, staged, touched, or referenced.

## 4. Help ownership discovered (Phase 2)

- **Help-button owner:** `web-view/js/calendar/instance.js` — `.msc-cal-help-trigger` (toolbar icon button,
  rendered once per member calendar instance by `mountScheduleCalendarInstance()`).
- **Popup renderer owner:** same file — the `.msc-cal-help-popup` overlay markup (previously ~lines
  396-431, now the redesigned block ~419-679) plus `openHelpPopup()`/`closeHelpPopup()`/
  `onHelpPopupKeydown()` (~1461-1490, unmodified by this task).
- **Reusable dialog component:** `web-view/js/ui/dialog.js` (`confirmDestructive`) — a generic confirm/
  cancel dialog used for destructive/advisory confirmations (delete, schedule conflicts, duplicate
  warnings). The Help/Settings popups do **not** go through it; they use their own static
  `.msc-modal-overlay`/`.msc-modal` markup directly in `instance.js`, which this task extended in place.
- **Reusable accordion/disclosure component:** native `<details>`/`<summary>` + `.collapsible-section`/
  `.collapsible-summary-text`/`.details-body` (`web-view/css/components.css`), already used throughout
  `web-view/index.html` and once already inside this same file (Schedule Summary's "View detailed metrics"
  section, ~line 3915). Reused for all twelve new topics via a new small builder, `calendarHelpSection()`.
- **Current deployed feature set (confirmed via source read, not assumed):** Month/Week/Day Calendar views;
  Today/Previous/Next navigation; mini date picker; Create → Task (including multiple time frames per Task,
  live since commit `c141064`), Bulk Tasks (including per-row multiple time frames), and Leave (five types:
  Short Leave, Half-Day Leave — First Half, Half-Day Leave — Second Half, Full-Day Leave, Multi-Day Leave);
  Task/Leave view/edit/delete with outcome-locked immutability; My Tasks; Task outcomes (Pending/Completed/
  Uncompleted/No response, 250-char reason, 11:59:59 PM cutoff); weekly `.xlsx` download (Weekly Schedule +
  Weekly Summary tabs); Schedule Summary; Calendar search; Calendar settings (sidebar toggle only); the
  lunch-break and different-Task overlap advisory; the Friday 7:00 AM–Sunday 11:59:59 PM planning-warning
  banner.
- **Feature that must not yet be documented:** none found. The working tree is clean and matches
  `origin/main` exactly, so there is no undeployed feature in scope to exclude.
- **Narrowest safe implementation:** edit only the Help popup's inner markup (`instance.js`) and its own
  CSS (`calendar.css`, scoped under new `.msc-cal-help-*` classes plus one two-class override so the
  Settings popup — which shares `.msc-cal-help-inner` — is never affected). No change to `openHelpPopup()`/
  `closeHelpPopup()`, no change to any Task/Leave/Bulk/Outcome/XLSX/Summary code.

## 5. Implementation summary

- `instance.js`: added `calendarHelpSection(title, hint, bodyHtml, open)` (module-level helper, reused
  twelve times instead of duplicating `<details>`/`<summary>`/`.details-body` markup); added
  `helpPopupSubtitleId`; rebuilt the Help popup's inner markup with a title+subtitle header and twelve
  expandable topics (§5 of the validation file lists them in the required order); Settings popup markup
  untouched.
- `calendar.css`: added `.msc-cal-help-inner.msc-cal-help-guide` (680px/80vh desktop, 92vw tablet, 100%/
  calc(100vh - 32px) mobile — reusing this file's own pre-existing `.msc-modal-form` width-tiering
  convention), `.msc-cal-help-head-text`/`.msc-cal-help-subtitle`, `.msc-cal-help-section` alignment
  tweaks, `.msc-cal-help-steps`/`.msc-cal-help-bullets` (numbered/bulleted body lists), `.msc-cal-help-note`
  (light restrained callout), `.msc-cal-help-states`/`.msc-cal-help-messages` (stacked cards, two columns
  ≥520px). All existing `.msc-cal-help-list`/`.msc-cal-help-inner`/`.msc-modal*` rules reused unchanged.

## 6. Behavior explicitly NOT changed

Task creation/edit/delete, Bulk Tasks, Leave creation/edit/delete, classification (Scheduled/Unscheduled),
Schedule Summary, weekly `.xlsx` export, My Tasks, outcome recording, the planning-warning banner, and every
popup's open/close/focus-trap/Escape logic are all byte-for-byte unchanged — only the Help popup's own
inner HTML and its own CSS were edited.

## 7. Tests and checks (Phases 20-22)

- `node --check web-view/js/calendar/instance.js` — passes.
- CSS brace-balance check on `web-view/css/calendar.css` — 433 `{` / 433 `}`, balanced.
- Class cross-reference scan — every class used in the new markup is either defined in `calendar.css`/
  `components.css` or is an intentional unstyled JS-selector hook (no missing selectors).
- Duplicate-ID scan — every dynamic popup id remains a distinct, `memberKey`-suffixed variable.
- `node --test web-view/js/calendar/*.test.mjs` → **87/87 pass**, zero regressions (same count as the
  pre-existing baseline; these tests exercise `core.js` only, not `instance.js`, per this repo's existing
  test boundary).
- Backend suite: not run — zero backend files changed (`git diff --stat -- backend/` empty), so it is
  unaffected; per this task's own instruction, the backend suite is only required if normal project closure
  needs it.

## 8. Database / dependency impact

None. `git diff --stat -- backend/ database/ package.json package-lock.json backend/requirements.txt` is
empty. No migration created or run. No new package added.

## 9. Known limitations

See `validation/calendar-help-user-guide-popup-check-2026-07-27.md` §12 — summarized: (1) no live-browser
manual pass (mobile width, 200% zoom, keyboard trace, screen reader) was performed in this no-browser
session; (2) "one section open at a time" was deliberately not implemented — twelve independent native
`<details>` elements were judged simpler and more consistent with this app's only existing disclosure
precedent than adding new exclusive-open JS; (3) this guide reflects features deployed as of `5694b0a`
(local `main` == `origin/main`) and must be reviewed again if a future undeployed feature reaches
production.

## 10. Reviewer

Per CLAUDE.md §18, this is a cross-domain Calendar UX change shared by all five member-schedule pages, with
no single business-rule owner — route to whichever Management Team member next opens the Help popup live.

## 11. PASS / AMBER / FAIL

**AMBER** — implementation, source-accuracy review, and every static/automated check available in this
session all PASS (87/87 frontend tests, zero regressions, zero backend/API/database/dependency diff,
protected path untouched). AMBER only because the live-browser manual pass was not performed, honestly
disclosed rather than fabricated, matching this repository's existing AMBER convention for the same reason
(see `handover/2026-07-27__multiple-time-frames-task-entry-closure.md` §21.3).

## 12. One next step (superseded — see §13.6)

~~A person with browser access should open the redesigned Help popup on a live member-schedule page at
1920×1080, 768px, 390px, and 200% zoom; confirm Close and the last section ("Need more help?") both stay
reachable and keyboard/Escape/focus-return behave as expected; then update this handover and its matching
validation file from AMBER to PASS. No commit, push, or deploy was performed in this session — the change
remains in the working tree only, awaiting that review.~~ Preserved verbatim as the historical record of
this handover's original AMBER finding (§1–§11 above are otherwise unchanged from the original session).
Release and deployment happened in a follow-up session — see §13.

## 13. Release, deployment, and follow-up fix (2026-07-27, follow-up session)

### 13.1 Implementation commit and push

- Commit `9bbd7af` — "Expand Calendar help guide" — the exact 4 approved files (`web-view/js/calendar/
  instance.js`, `web-view/css/calendar.css`, this handover, and the matching validation file).
- Pushed: `git push origin main` → `5694b0a..9bbd7af main -> main`, accepted, no force, no `git add .`/
  `git add -A` used (each file staged individually by exact path).

### 13.2 Live-review follow-up: title boldness

The repository owner ran the app locally and, from real screenshots, confirmed the popup itself worked
(title/subtitle visible, Quick start open by default, "Move around the Calendar" expanding correctly on
click) but asked for the "Calendar help" title's boldness to be reduced to match the rest of the guide's
text. Fix: `.msc-cal-help-head-text .msc-view-title { font-weight: 600; }` (`calendar.css`), scoped to this
popup's own title wrapper so the Task/Leave detail and Settings popups — which reuse the bare
`.msc-view-title` rule — are unaffected. `git diff --stat` for this fix: `calendar.css` only, +12/-0.
`node --test web-view/js/calendar/*.test.mjs` → 87/87 pass, unchanged.

- Commit `b2b0722` — "Reduce Calendar help title boldness" — `calendar.css` only.
- Pushed: `git push origin main` → `9bbd7af..b2b0722 main -> main`, accepted, no force.
- `git rev-parse --short HEAD` and `git log origin/main -1 --oneline` both read `b2b0722` — local and
  remote match.

### 13.3 Deployment status

Both commits triggered a Vercel build. The first (`9bbd7af`) took noticeably longer than prior tasks in
this repository's history to appear on the production frontend — read-only polling of the deployed
`instance.js` was used to watch for it rather than any write or destructive action, and it resolved on its
own without a manual redeploy.

### 13.4 Deployed-commit content evidence

Frontend `https://management-aios.vercel.app` loads `200 OK`; backend `https://management-aios-api.vercel.app/health`
returns `200 OK` (unaffected — no backend files changed). The deployed `instance.js` (fetched directly,
cache-busted) contains all 12 required section headings exactly once each, the "Calendar help" title and
"How to use the Management AIOS Calendar" subtitle, the exact five Leave-type labels, all four outcome
states, both XLSX tab names ("Weekly Schedule"/"Weekly Summary"), the 30-occurrence and "Add another time"
wording, and the ten common-message strings — full detail and counts in
`validation/calendar-help-user-guide-popup-check-2026-07-27.md` §16.4. The deployed `calendar.css` contains
the §13.2 font-weight fix. Deployed-commit correlation: `b2b0722`'s commit timestamp (12:14:04 UTC) is 29
seconds before the deployed `instance.js`'s own `Last-Modified` header (12:14:33 GMT) — a timestamp/content
correlation, not a direct SHA comparison (Vercel does not expose one via HTTP headers), stated honestly.

### 13.5 What was NOT done — explicit, non-fabricated disclosure

This session's environment has no browser-automation tool, the same limitation as the original AMBER
closure. An actual rendered-browser pass (1920×1080, 1366×768, 1024px, 768px, 390px, 200% zoom), actual
keyboard-only navigation and focus-return, an actual accessibility-tree inspection, and an actual
Network-tab observation while opening the popup were **not performed** and are not reported as observed.
The "no backend request on open" claim remains a static-code-review finding (no `fetch`/`apiRequest` call
added; `openHelpPopup()`/`closeHelpPopup()` byte-for-byte unchanged), not a live network-tab observation.
The repository owner's own local screenshots (§13.2) are informal, real, and corroborating — but they are a
spot-check at one window size by the owner, not the full systematic checklist this task specifies, so they
do not move the status to PASS. Full detail: `validation/calendar-help-user-guide-popup-check-2026-07-27.md`
§16.5.

### 13.6 One next step

A person with real browser access should run the still-outstanding checklist — 1920×1080 / 1366×768 /
1024px / 768px / 390px / 200% zoom, keyboard-only navigation, accessibility-tree inspection, and a
Network-tab observation while opening Help — then update this handover and the matching validation file
from AMBER to PASS. Release, deployment, and content-accuracy verification are otherwise complete.

## 14. PASS / AMBER / FAIL (current)

**AMBER** — implemented, committed (`9bbd7af`, `b2b0722`), pushed to `origin/main`, and deployment-verified
via read-only HTTP/content checks against the live production frontend and backend; the follow-up
title-boldness fix requested during local review is included and deployed; 87/87 frontend tests pass; zero
backend/API/database/dependency diff across both commits; protected path untouched. AMBER only, and
specifically because the live-browser/keyboard/screen-reader/network-tab checklist (§13.5) has still not
been performed by an actual browser session.

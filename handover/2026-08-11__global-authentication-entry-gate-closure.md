# Handover — Global Management AIOS Entry Authentication Gate Closure (2026-08-11)

## Requirement ID

REQ-AUTH-ENTRY-009. Full detail: [docs/global-authentication-entry-gate-requirement-2026-08-11.md](../docs/global-authentication-entry-gate-requirement-2026-08-11.md), [validation/global-authentication-entry-gate-check-2026-08-11.md](../validation/global-authentication-entry-gate-check-2026-08-11.md).

Builds on the existing per-module gate: REQ-AUTH-MODULES-007 (`handover/2026-08-10__authenticated-module-access-closure.md`) — that requirement gated Staff Data/Issues/Knowledge Management individually; this requirement gates the application shell itself, so nothing renders or fetches before any authentication.

## Files Created

```
web-view/js/entry-auth.js
web-view/js/entry-auth.test.mjs
web-view/css/entry-auth.css
docs/global-authentication-entry-gate-requirement-2026-08-11.md
validation/global-authentication-entry-gate-check-2026-08-11.md
handover/2026-08-11__global-authentication-entry-gate-closure.md (this file)
```

## Files Modified

```
web-view/index.html        (wrapped the existing shell in <div id="appShell" hidden>;
                             added #authGateScreen; +1 <link>)
web-view/js/app.js          (boot() deferred behind initEntryAuthGate())
web-view/js/calendar/auth.js (extracted verifyAndStoreToken(), reused by the token
                             dialog's submit() and by entry-auth.js — no behavior
                             change to the dialog itself)
```

No backend file, no database/migration file, and no unrelated frontend file (Staff Data, Issues, Knowledge Management, Review Summaries, individual Calendar tabs) was touched — REQ-AUTH-MODULES-007's own module-level gating is reused exactly as it was, just mounted later.

## Architecture

```
web-view/
  index.html                 #authGateScreen (checking state + token form, visible by
                              default) -> #appShell (raw-HTML `hidden`, wraps the
                              entire pre-existing shell)
  css/
    entry-auth.css            full-page gate layout only; reuses .calendar-auth-*
                               (ui.css) and .msc-btn* (calendar.css) for the token
                               field/button
  js/
    app.js                    start() -> initEntryAuthGate(boot); boot() itself
                               unchanged, just called later and exactly once
    entry-auth.js              the state machine: AUTH_CHECKING / UNAUTHENTICATED /
                               AUTHENTICATED, driven by one CALENDAR_AUTH_CHANGED_EVENT
                               listener (auth-gate.js's onAuthChange)
    entry-auth.test.mjs        11 tests
    calendar/auth.js           verifyAndStoreToken(token) — new export, reused by
                               both the existing dialog and entry-auth.js
```

## What This Implements

An application-entry authentication gate: no Management AIOS content is visible or fetched until a member token is verified. A saved valid token auto-verifies and opens the app with no re-prompt; a missing/invalid/expired saved token shows the token-entry form; a mid-session 401 (from any existing mutation call site) now also hides the whole application shell, not just the individual module that hit it, and shows the gate again. Every existing post-authentication authorization rule (module-level gating, Issues assignment authority, Calendar view/mutation split, Change Token) is unchanged — this requirement answers only "has this browser authenticated at all."

## What This Deliberately Does Not Implement

A new login system, a new token type, a new backend endpoint, or any change to what an authenticated member is authorized to do. Does not touch `member-aios/mayurika-hr/staff-data/` (protected path, never opened).

## Test Results

- New suite: `web-view/js/entry-auth.test.mjs` — 11/11 passing.
- Full repository frontend suite: 573/573 passing (`node --test *.test.mjs calendar/*.test.mjs` from `web-view/js/`) — zero regressions.
- No backend test change — zero backend files touched.

## Known Limits

- No live browser/production visual verification was performed in this environment (no browser automation tool available) — recorded as pending, not claimed, per §9 of the validation doc.
- Verification is the automated Node test suite against a hand-rolled DOM/localStorage/fetch stand-in (same proven approach every other frontend test file in this repo already uses), plus manual code-reading (div-balance check, `hidden`-attribute placement, a repo-wide grep confirming every `handleUnauthorizedResponse()` call site is covered).

## Final Report

| | |
|---|---|
| A. Starting branch/HEAD | `main` @ `019c3fd790ce0bcd115ab18a4c3437e496986078` |
| B. Origin/main/divergence | Same commit, 0 ahead / 0 behind |
| C. Existing auth system reused | `calendar/auth.js` (`getStoredToken`, `handleUnauthorizedResponse`, `CALENDAR_AUTH_CHANGED_EVENT`) + `auth-gate.js` (`onAuthChange`) — verbatim, no new system |
| D. Previous application boot behavior | `app.js`'s `boot()` ran unconditionally on `DOMContentLoaded`; the full shell was static, unhidden HTML |
| E. New global auth states | `AUTH_CHECKING` / `UNAUTHENTICATED` / `AUTHENTICATED` (`entry-auth.js`) |
| F. Initial first-paint behavior | `#appShell` carries `hidden` directly in raw HTML; only `#authGateScreen`'s "Checking authorization…" state can ever paint first |
| G. No-token behavior | Token-entry form shown immediately, no fetch made |
| H. Saved valid-token behavior | Auto-verified against `/verify`; app opens automatically, no re-prompt |
| I. Saved invalid-token behavior | Cleared via `handleUnauthorizedResponse()`; token-entry form shown |
| J. Manual token behavior | Duplicate-submit guarded; success reveals the app via the shared event listener; failure shows an inline error and allows retry |
| K. Application shell visibility before auth | Not visible — `#appShell hidden` |
| L. Sidebar visibility before auth | Not visible (inside `#appShell`); nav click handlers themselves don't exist yet since `initNavigation()` is part of the deferred `boot()` |
| M. Calendar/task visibility before auth | Not visible (inside `#appShell`) |
| N. Pre-auth data-fetch result | Zero — every `init*()` call, including the previously-unconditional `initAllScheduleCalendars()`, is now part of `boot()`, deferred until authenticated |
| O. Direct-tab/hash bypass result | Not possible — nav wiring doesn't exist pre-auth; shell markup is under `hidden` |
| P. Auth-loss behavior | Existing `handleUnauthorizedResponse()` call sites (Staff Data, Knowledge Management, Review Summaries, Calendar mutations) unchanged; the new global listener additionally hides `#appShell` and shows the gate again on the same event |
| Q. Change Token behavior | Unchanged — untouched dialog/flow, still preserves the current token until a replacement verifies |
| R. Existing authorization regression | None — confirmed by code-reading; see §6 of the validation doc |
| S. New frontend tests | 11 (`entry-auth.test.mjs`) |
| T. Full frontend tests | 573/573 passing |
| U. Backend files changed | 0 |
| V. DB/schema changes | 0 |
| W. Production writes | 0 |
| X. Protected path excluded | `member-aios/mayurika-hr/staff-data/` — never opened |
| Y. Evidence files | See "Files Created" above |
| Z. Commit hash | See Git section below |
| AA. Push result | Not pushed |
| AB. PASS/FAIL | **PASS** |
| AC. One next step | Live browser/production visual verification (confirm no dashboard-underneath-a-modal flash on a real deployed instance) — currently pending, not performed in this environment |

## Git

Six files' worth of runtime changes (3 new, 3 modified) plus documentation, staged by exact path (no `git add -A`/`git add .`), committed as a single commit: "Require authentication before opening Management AIOS". Not pushed in this session.

Commit hash: `<pending — recorded immediately after the commit in the same task>`.

## One Next Step

Live browser/production visual verification, per AC above.

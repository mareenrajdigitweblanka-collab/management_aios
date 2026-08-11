# Global Management AIOS Entry Authentication Gate — Validation Check — 2026-08-11

*(Requirement: `docs/global-authentication-entry-gate-requirement-2026-08-11.md` — REQ-AUTH-ENTRY-009)*

## 1. Git gate

| Check | Result |
|---|---|
| Starting branch | `main` |
| Starting HEAD | `019c3fd790ce0bcd115ab18a4c3437e496986078` |
| `origin/main` | same commit — 0 ahead / 0 behind |
| Unrelated tracked work at start | None. One pre-existing untracked file (`validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md`) was already present and untouched by this task. |

## 2. Existing app boot discovery (Phase 2 baseline)

Confirmed by inspection before any edit:

- `web-view/index.html` — the entire application shell (topbar, sidebar, all 11 `.tab-panel` panels) was static markup, a direct child of `<body>`, with no hidden wrapper. `.tab-panel.active` (pure CSS) meant the Root AIOS panel and full sidebar rendered on first paint from HTML+CSS alone, before `js/app.js` (a `type="module"` script) ever executed.
- `web-view/js/app.js` — `boot()` ran unconditionally on `DOMContentLoaded`, calling all eight subsystem `init*()` functions (navigation, calendars, calendar auth indicator, Staff Data, planning warning, Review Summaries, Issues, Knowledge Management) with no auth gate around it.
- Calendar data fetches (`initAllScheduleCalendars()` → `loadItems()`/`loadLeaveItems()`) ran immediately at boot with **no auth check at all** — by design, per `calendar/auth.js`: viewing is public, only mutations require a token.
- Staff Data, Issues, and Knowledge Management (REQ-AUTH-MODULES-007, already gated) checked `isAuthenticated()`/`getStoredMemberKey()` — a synchronous `localStorage` read — before fetching; no module re-verified an already-stored token against the backend on page load.
- No global "checking auth" state, boot gate, or app-shell-hidden wrapper existed anywhere in the codebase.

## 3. Auth architecture reused

- **Frontend:** `getStoredToken`/`handleUnauthorizedResponse`/`CALENDAR_AUTH_CHANGED_EVENT` (`web-view/js/calendar/auth.js`) and `onAuthChange` (`web-view/js/auth-gate.js`) — unchanged, reused directly by the new `web-view/js/entry-auth.js`.
- **Backend:** the existing `/verify` endpoint (`backend/routers/calendar_auth.py`, via `CALENDAR_AUTH_API_BASE`) — unchanged. Zero backend files touched by this task.
- No new login system, no new token type, no new localStorage key.

## 4. What changed

| File | Change |
|---|---|
| `web-view/index.html` | Wrapped the entire pre-existing application shell (everything previously a direct `<body>` child) in `<div id="appShell" hidden>`. Added `<div id="authGateScreen">` before it — visible by default, containing a "Checking authorization…" status region (`#authGateChecking`) and a token-entry form (`#authGateForm`, hidden by default, shown by JS). Added `<link rel="stylesheet" href="./css/entry-auth.css">`. |
| `web-view/js/entry-auth.js` | **New.** The entry-gate state machine — see §5. |
| `web-view/js/app.js` | `boot()` no longer runs on `DOMContentLoaded` directly; a new `start()` calls `initEntryAuthGate(boot)`, so `boot()` runs exactly once, only after authentication is confirmed. |
| `web-view/js/calendar/auth.js` | `verifyAndStoreToken(token)` extracted from the token dialog's `submit()` (now calls this instead of duplicating the fetch/`writeStoredAuth`/`renderIndicator`/`dispatchAuthChanged` sequence) — reused by `entry-auth.js` for both the boot-time saved-token check and the gate's own manual submit. No behavior change to the existing dialog. |
| `web-view/css/entry-auth.css` | **New.** Full-page gate layout only; reuses `.calendar-auth-input`/`.calendar-auth-error` (`ui.css`) and `.msc-btn`/`.msc-btn-primary` (`calendar.css`) for the token field and button. |
| `web-view/js/entry-auth.test.mjs` | **New.** 11 tests — see §7. |

## 5. State model and transitions

Three states (`AUTH_CHECKING` / `UNAUTHENTICATED` / `AUTHENTICATED`), one state machine, in `entry-auth.js`'s `initEntryAuthGate(onAuthenticated)`:

- **First paint (before any JS runs):** `#appShell` has `hidden` set directly in the raw HTML — not added by JavaScript — so there is no flash of application content under any network/CPU timing. `#authGateScreen`'s "Checking authorization…" state is the only thing visible.
- **No saved token:** `initEntryAuthGate()` shows the token-entry form immediately (no fetch is made — nothing to verify).
- **Saved token:** stays in the checking state while `verifyAndStoreToken()` calls the real `/verify` endpoint. On success, the shared `CALENDAR_AUTH_CHANGED_EVENT` listener reveals `#appShell` and calls `onAuthenticated()` (i.e. `boot()`) exactly once. On failure, `handleUnauthorizedResponse()` clears the stale token (Phase 8's "expired/rejected saved token" convention) and the same listener shows the token-entry form.
- **Manual submit:** duplicate-submit guarded (a second click/Enter while a request is in flight fires no second request); on success, `verifyAndStoreToken()`'s own event dispatch drives the same listener that handles every other transition — the submit handler itself does not separately reveal the app. On failure, an inline error is shown and the field is left in place for retry.
- **Auth loss mid-session:** every 401 call site in the codebase (`staff-data.js`, `knowledge-management.js`, `review-summaries.js`, `calendar/instance.js` — confirmed by a repo-wide grep for `handleUnauthorizedResponse`) already funnels through `calendar/auth.js`'s `handleUnauthorizedResponse()`, which dispatches the event with a `null` memberKey. No changes were needed to any of those call sites — `entry-auth.js`'s existing listener reacts identically whether the falsy-memberKey event came from the boot-time check or a live 401, hiding `#appShell` and showing the gate form again. `boot()` is never called a second time (a `booted` flag), matching its own "runs only once" contract — each already-mounted subsystem re-fetches/re-locks itself via its own existing `onAuthChange`/`CALENDAR_AUTH_CHANGED_EVENT` subscription.
- **Direct tab/hash/programmatic bypass:** structurally prevented, not just blocked by a check — `initNavigation()` (which wires every click handler and reads/writes the active-tab hash state) is part of `boot()`, so it never runs until authenticated; the sidebar/tab markup itself is inert (present in the DOM but under `hidden` `#appShell`) until then.

## 6. Existing authorization regression — explicitly confirmed unchanged

No post-authentication authorization rule was touched:

- Staff Data / Issues / Knowledge Management's own REQ-AUTH-MODULES-007 gating (`auth-gate.js`, per-module `isAuthenticated()` checks) — untouched; those modules are simply mounted later (after entry auth) than before, not modified.
- Issues assignment authority (`hasAssignmentAuthority`) — untouched.
- Review Summaries permissions, MD read-only behavior — untouched.
- Calendar authorization behavior — viewing remains not-token-gated once the app is open (`calendar/auth.js`'s documented "viewing never requires a token" rule is unchanged); only mutations require a token, exactly as before.
- Change Token (`openChangeTokenDialog()`) — untouched; still preserves the current token until a replacement verifies, still never force-logs-out on cancel/Escape.
- Rajiv/MD member-specific authorization — untouched (no code in scope references member identity/role logic).

## 7. Frontend test results

Run with `node --test *.test.mjs calendar/*.test.mjs` from `web-view/js/`:

```
tests 573
pass 573
fail 0
```

New tests for this requirement — `web-view/js/entry-auth.test.mjs` (11 tests, all passing):

1. No saved token: shows the token-entry form directly, app shell stays hidden, no fetch.
2. Saved valid token: verifies, reveals app shell, calls `onAuthenticated` once.
3. Saved invalid token: cleared, token-entry form shown, app shell stays hidden, `onAuthenticated` never called.
4. Manual submit: empty token shows a validation error and never fetches.
5. Manual submit: valid token reveals the app shell and calls `onAuthenticated`.
6. Manual submit: invalid token shows inline error, app never reveals, retry works.
7. Manual submit: Enter key submits, same as clicking Authorize.
8. Manual submit: duplicate-submit guard — a second click while a verify is in flight fires no second fetch.
9. Show/Hide toggle flips the token input between password and text.
10. Auth loss after a successful session: app shell hides again and the gate form reappears; `onAuthenticated` not called twice.
11. Re-authenticating after a mid-session loss reveals the app shell again without a second `onAuthenticated` call.

No pre-existing test file needed a behavior change — `calendar/auth.test.mjs` (covering the refactored `verifyAndStoreToken()` indirectly through the unchanged dialog flow it already exercised) still passes unmodified, confirming the extraction preserved the dialog's exact existing behavior.

## 8. Backend / DB / production writes

- Backend files changed: **0**.
- DB/schema changes: **0**.
- Production writes: **0** — this is a frontend-only, client-side gating change; the only network call this task adds a new caller for is the pre-existing `/verify` endpoint, now also invoked once at page load for an already-stored token (previously only invoked from the manual "Authorize"/"Change token" dialog).

## 9. Known limits

- **No live browser/production visual verification.** This environment has no way to run a real browser against a live-deployed instance. Verification here is the automated Node test suite (`web-view/js/entry-auth.test.mjs` and the full 573-test regression suite) exercising `entry-auth.js`'s real code paths against a hand-rolled DOM/localStorage/fetch stand-in (the same approach every other frontend test file in this repo already uses — see `review-summaries-test-dom.mjs`), plus manual code-reading of `index.html`'s resulting structure (div-balance checked, `hidden` attribute placement confirmed directly in the raw markup, not JS-added) and a repo-wide grep confirming every existing `handleUnauthorizedResponse()` call site is covered by the new listener. Live-visual verification (nothing but the gate screen rendering in an actual browser, no dashboard-underneath-a-modal flash) is recorded as **pending**, not claimed.
- Protected path `member-aios/mayurika-hr/staff-data/` was never opened or modified.
- No backend test suite change was needed or made (zero backend files touched).

## 10. PASS / FAIL

**PASS.**

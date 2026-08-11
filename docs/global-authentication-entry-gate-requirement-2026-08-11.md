---
Project Name: Global Management AIOS Entry Authentication Gate
Start Date: 2026-08-11
Expected Deadline: 2026-08-11
User / Stakeholder: Mareenraj (builder)
Company Value Contribution: Closes the remaining gap left by REQ-AUTH-MODULES-007 — Staff Data/Issues/Knowledge Management were already gated individually, but the application shell itself (topbar, sidebar, Root AIOS, File Map, member Calendar tabs, Review Summaries) still rendered and fetched unconditionally before any authentication check ran
MVP Submission Date: 2026-08-11
Project Owner: Mareenraj
Status: Implemented
---

# Global Management AIOS Entry Authentication Gate — Requirement — REQ-AUTH-ENTRY-009

## 1. Purpose

Require a successful Management AIOS member-token authentication before ANY application content is shown — not just the three individually-gated modules from REQ-AUTH-MODULES-007. This is an application ENTRY gate, not a modal placed on top of already-visible content: on first paint, an unauthenticated browser must see only the authentication screen, with the rest of the shell (header, search, sidebar, Root AIOS, File Map, member navigation, Calendar, task lists, Staff Data, Review Summaries, Issues, Knowledge Management) inaccessible until a token verifies.

If a valid member token is already saved in the browser, it is automatically re-verified against the backend on page load and the application opens automatically — the user is never asked to re-enter a token that is already valid.

## 2. Scope

**In scope:**
- Frontend only. Reuses the existing Calendar member-token Bearer-auth system verbatim (`web-view/js/calendar/auth.js`, `web-view/js/auth-gate.js`) — no new login system, no new token type, no new backend endpoint, no new localStorage key.
- `web-view/index.html` — the entire existing application shell (everything previously a direct child of `<body>`) is wrapped in `<div id="appShell" hidden>`; a new `<div id="authGateScreen">` (visible by default, containing the "Checking authorization…" state and a token-entry form) is added before it.
- `web-view/js/entry-auth.js` — new module owning the entry-gate state machine and the single point that decides whether `#appShell` is revealed.
- `web-view/js/app.js` — `boot()` (which mounts every subsystem, including every data-bearing fetch) no longer runs unconditionally on `DOMContentLoaded`; it now runs exactly once, only after the entry gate confirms authentication.
- `web-view/js/calendar/auth.js` — one small refactor (`verifyAndStoreToken()` extracted from the existing token dialog's `submit()`) so the new gate's own manual-entry form and boot-time saved-token re-verification reuse the exact same verify/store/announce logic as the existing dialog, rather than a second implementation.
- `web-view/css/entry-auth.css` — new stylesheet for the full-page gate screen only; reuses the existing `.calendar-auth-input`/`.calendar-auth-error`/`.msc-btn` visual language (`ui.css`, `calendar.css`) for the token field and button rather than inventing a second one.

**Explicitly out of scope / unchanged:**
- Any backend route, `Depends(get_verified_member)` logic, or token hash comparison.
- What an authenticated member is authorized to do once inside the app — Staff Data/Issues/Knowledge Management module-level gating (REQ-AUTH-MODULES-007), Issues assignment authority, Review Summaries permissions, Calendar view-is-public/mutation-requires-token split, Rajiv/MD authorization rules. This requirement answers only "has this browser authenticated a Management AIOS member at all" — every existing post-entry authorization rule is unchanged and continues to apply independently.
- `member-aios/mayurika-hr/staff-data/` — never opened or modified.
- Deployment / push to remote.

## 3. Existing auth architecture reused

- `getStoredToken()` / `handleUnauthorizedResponse()` / `CALENDAR_AUTH_CHANGED_EVENT` (`calendar/auth.js`) — unchanged.
- `onAuthChange()` (`auth-gate.js`) — unchanged; `entry-auth.js` is now a fourth subscriber alongside `navigation.js`, `staff-data.js`, `issues.js`, `knowledge-management.js`.
- The backend `/verify` endpoint (`backend/routers/calendar_auth.py`, via `CALENDAR_AUTH_API_BASE`) — unchanged; this requirement is the first frontend caller to use it for an already-stored token on page load rather than only a freshly-typed one.

## 4. State model

Three states, one shared state machine (`web-view/js/entry-auth.js`), never a second competing boolean elsewhere:

- **AUTH_CHECKING** — initial state, driven entirely by `#appShell`'s raw-HTML `hidden` attribute and `#authGateScreen`'s default "Checking authorization…" content — no first-paint flash of application content is possible because nothing but the gate screen is ever unhidden before JavaScript runs. Active only while a saved token is being re-verified.
- **UNAUTHENTICATED** — `#appShell` stays hidden; the gate screen shows the token-entry form instead. Reached either immediately (no saved token) or after a rejected/expired saved token, an invalid manual attempt, or a mid-session 401 that clears an existing token.
- **AUTHENTICATED** — `#appShell` is revealed and `app.js`'s `boot()` runs (exactly once, ever, for the page's lifetime).

Every transition after the very first page-load check funnels through one `CALENDAR_AUTH_CHANGED_EVENT` listener, because `verifyAndStoreToken()` and `handleUnauthorizedResponse()` both already dispatch that event on every real change to "is this browser authenticated" — a successful saved-token re-verification, a successful manual submit on the entry gate's own form, a successful Change Token, and a 401-triggered clear all look identical to `entry-auth.js`: one event with a truthy or falsy `detail.memberKey`. This is also how a mid-session auth loss (an already-authenticated user whose token is invalidated by a 401 on some later mutation) is handled without a second code path — the same listener that revealed the app the first time hides it again.

## 5. Design decisions

- **Full boot() deferral, not per-module deferral.** `app.js`'s eight subsystem `init*()` calls (navigation, five Calendar instances, the Calendar auth indicator, Staff Data, planning warning, Review Summaries, Issues, Knowledge Management) are deferred as a single unit rather than selectively — simpler than reasoning about which of the eight are individually safe to run pre-authentication, and matches `boot()`'s own existing "runs only once" contract without adding a second partial-boot path.
- **Calendar viewing being publicly-authorized once inside the app is unchanged.** `calendar/auth.js` still documents "viewing any member's Calendar never requires a token — only mutations do," and that per-request rule is untouched. This requirement only changes when Calendar's own boot-time data fetch is allowed to run at all (after entry authentication), not whether that fetch itself needs a token.
- **No new token-verification function duplicated.** Rather than writing a second "call the `/verify` endpoint and store the result" implementation for the entry gate, `verifyAndStoreToken()` was extracted from the existing token dialog and is now called by three places: the dialog's own submit, the entry gate's manual submit, and the entry gate's boot-time saved-token check. A caller-level distinction only governs what happens on FAILURE: the dialog (first-time or Change Token) never had anything valid stored to lose, so it just shows an inline error; the boot-time saved-token check explicitly calls `handleUnauthorizedResponse()` on failure, since Phase 8 requires an expired/rejected saved token to be cleared through the existing convention.

## 6. Protected path

`member-aios/mayurika-hr/staff-data/` was never opened or modified.

## 7. Next step

None outstanding for this requirement — see `validation/global-authentication-entry-gate-check-2026-08-11.md` and `handover/2026-08-11__global-authentication-entry-gate-closure.md` for full test results and known limits (in particular: no live browser/production visual verification was performed in this environment — see §9 of the validation doc).

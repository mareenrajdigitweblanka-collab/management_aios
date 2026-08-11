# Fix Stuck "Checking Authorization" for Unauthenticated Users — Validation Check — 2026-08-11

*(Requirement: `docs/unauthenticated-checking-state-stuck-fix-2026-08-11.md` — REQ-AUTH-ENTRY-011)*

## 1. Git gate

| Check | Result |
|---|---|
| Starting branch | `main` |
| Starting HEAD | `7ddfc08cdae82e2458d6e1a4ac778c4e17fe7e6a` |
| `origin/main` | same commit — 0 ahead / 0 behind |
| Unrelated tracked work | None. Two pre-existing untracked discovery docs from REQ-AUTH-PERF-010 (`docs/saved-token-startup-performance-discovery-2026-08-11.md`, `validation/saved-token-startup-performance-discovery-check-2026-08-11.md`) and the same long-standing unrelated untracked file (`validation/staff-roster-employee-number-vs-staff-code-cross-system-comparison-2026-08-06.md`) were already present, untouched, and not staged by this task. |

## 2. Screenshot-observed problem

A fresh browser with no saved `management_aios_calendar_auth_v1` token, visiting the deployed Management AIOS entry gate, saw "Checking authorization…" displayed at the same time as the "Enter your Management AIOS member token" form — instead of the form alone.

## 3. Root cause investigation (Phase 3 — B ruled out, A confirmed)

**Was a repeated `POST /verify` loop responsible? No — evidence, not assumption:**

- `entry-auth.js`'s no-token branch (`getStoredToken()` falsy → `showGateForm(els); return;`) makes no fetch call at all — confirmed by direct code reading.
- Repo-wide grep of every call site reaching `verifyAndStoreToken()`, `ensureAuthorized()`, `get_verified_member`-backed routes, and `CALENDAR_AUTH_CHANGED_EVENT`/`onAuthChange()` found no other startup-time trigger.
- Reconfirmed here with a call-counting fetch mock: **0** `/verify` calls for a no-token startup, staying at **0** across 5 idle event-loop turns (new test: "no saved token, left idle: no background /verify polling ever starts").

**Expected vs. actual call counts (all confirmed):**

| Scenario | Expected | Confirmed |
|---|---|---|
| No-token startup | 0 | 0 |
| Saved-token startup | 1 | 1 |
| Manual submit | 1 per submission | 1 |

**Was it a UI-state bug? Yes — confirmed root cause:** `showGateForm()` correctly set `#authGateChecking.hidden = true` (the JS state was always right). `web-view/css/entry-auth.css`'s `.auth-gate-checking` rule carried its own unconditional `display: flex`, which — at equal CSS specificity to the browser's native `[hidden] { display: none }` UA rule, with author-cascade order deciding the winner — always beat it. The element never actually stopped rendering regardless of what the `hidden` attribute was set to. Same root-cause class as `.auth-gate-screen` (affecting the post-authentication transition) and the same documented gotcha this codebase already has a precedent for (`web-view/README.md`'s `.msc-calendar-main`/`.msc-view-dropdown` note).

**Verdict: UI-only stuck-visual-state bug (CSS cascade specificity). Not a network/polling bug.**

## 4. Fix

| File | Change |
|---|---|
| `web-view/css/entry-auth.css` | Added `.auth-gate-checking[hidden] { display: none; }` and `.auth-gate-screen[hidden] { display: none; }` — compound class+attribute selectors, strictly higher specificity than the plain class alone, so they win regardless of source order. No `!important`. |
| `web-view/js/entry-auth.js` | `revealApp()` now also explicitly sets `#authGateChecking.hidden = true` on successful authentication (previously relied only on hiding the parent `#authGateScreen`) — defensive state-consistency fix, not itself a visible-behavior change once the CSS fix above is in place. |
| `web-view/js/entry-auth.test.mjs` | 13 new tests (see §6). |
| `web-view/js/entry-auth-css-structure.test.mjs` | **New file**, 6 tests proving the CSS fix's presence in source (no CSS engine available to check computed `display`). |

## 5. State transition results (Phase 4 requirements)

| Transition | Result |
|---|---|
| INITIAL, no token → UNAUTHENTICATED | Immediate — checking spinner/text hidden, token form active, Authorize active, 0 `/verify` requests |
| INITIAL, saved token → AUTH_CHECKING | Checking indicator visible while pending, duplicate submission not applicable (only one automatic check ever fires) |
| Saved token valid → AUTHENTICATED | appShell opens, `boot()` runs once, checking indicator explicitly cleared |
| Saved token invalid → UNAUTHENTICATED | Token cleared via existing `handleUnauthorizedResponse()` convention, spinner/checking state cleared, form active |
| Manual submit valid → AUTHENTICATED | App opens |
| Manual submit invalid → UNAUTHENTICATED | Submit-button busy state stops (spinner), form remains available, no residual `AUTH_CHECKING` |

No transition leaves `AUTH_CHECKING` visually active after a resolved failure, per Phase 4's requirement — confirmed by the new tests in §6.

## 6. Test results

Run with `node --test *.test.mjs calendar/*.test.mjs` from `web-view/js/`:

```
tests 586
pass 586
fail 0
```

New/changed:

- `web-view/js/entry-auth.test.mjs` — 13 new tests appended (24 total, all passing):
  1. No saved token: form enabled/ready for input.
  2. No saved token: exactly zero `/verify` requests.
  3. No saved token, left idle across 5 event-loop turns: `/verify` stays at zero (no background polling).
  4. Saved token: checking indicator visible while the request is genuinely pending.
  5. Saved token: exactly one `/verify` request for the whole startup check.
  6. Valid saved token: checking indicator explicitly cleared once AUTHENTICATED.
  7. Invalid saved token: checking indicator cleared once UNAUTHENTICATED.
  8. Manual submit: exactly one `/verify` request per explicit submission.
  (Plus the 11 pre-existing tests from REQ-AUTH-ENTRY-009, all still passing unmodified — including the 401-auth-loss and 403-adjacent regression coverage.)
- `web-view/js/entry-auth-css-structure.test.mjs` — **new file**, 6/6 passing: confirms `.auth-gate-checking`/`.auth-gate-screen` retain their base `display: flex`, confirms both now have a higher-specificity `[hidden] { display: none }` override, and confirms `.auth-gate-form` has not gained a conflicting `display` rule.

401/403 regression: covered by the pre-existing "auth loss after a successful session" test (dispatches the exact event `handleUnauthorizedResponse()` produces) — unmodified and still passing. 403 handling lives entirely in each mutation call site's own response branching (`calendar/instance.js`, `staff-data.js`, `knowledge-management.js`, `review-summaries.js`), none of which was touched by this task — re-confirmed by the same repo-wide grep used in REQ-AUTH-ENTRY-009's publish task, unchanged.

## 7. Backend / DB / production writes

- Backend files changed: **0**.
- DB/schema changes: **0**.
- Production writes: **0**.
- Protected path `member-aios/mayurika-hr/staff-data/`: never opened.

## 8. Known limits

- No CSS-rendering engine is available in this environment (no jsdom, no npm dependencies) — the fix's correctness rests on CSS specificity rules (deterministic, not implementation-dependent), verified via a source-text structural test (§6), not a measured computed-style/rendered-pixel check.
- No live browser/production visual re-verification was performed — recorded as pending, consistent with REQ-AUTH-ENTRY-009's own publish task.

## 9. PASS / FAIL

**PASS.**

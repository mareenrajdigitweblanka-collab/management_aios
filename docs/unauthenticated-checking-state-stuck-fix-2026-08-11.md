---
Project Name: Fix Stuck "Checking Authorization" for Unauthenticated Users
Start Date: 2026-08-11
Expected Deadline: 2026-08-11
User / Stakeholder: Mareenraj (builder)
Company Value Contribution: Fixes a visible defect in the production entry authentication gate (REQ-AUTH-ENTRY-009) where a fresh, no-saved-token visitor saw "Checking authorization…" stuck on screen alongside the token form, instead of a clean, ready-to-use token entry screen
MVP Submission Date: 2026-08-11
Project Owner: Mareenraj
Status: Implemented
---

# Fix Stuck "Checking Authorization" for Unauthenticated Users — REQ-AUTH-ENTRY-011

## 1. Problem

The deployed global authentication gate (REQ-AUTH-ENTRY-009) correctly hides Management AIOS from an unauthenticated browser, but a browser with **no saved member token** continued to show "Checking authorization…" at the same time as the Member Token form, instead of transitioning cleanly into the token-entry screen.

## 2. Root cause — confirmed by evidence, not assumed

Per this task's own instruction not to assume a root cause, both hypotheses (A: UI/state-only bug, B: an actual repeated `POST /verify` loop) were checked before any edit:

- **Hypothesis B (repeated `/verify` requests) was ruled out.** Reading `web-view/js/entry-auth.js`'s no-token branch (`getStoredToken()` returns falsy → `showGateForm(els); return;`) shows no fetch call is ever made on that path, and a repo-wide grep of every call site that can reach `verifyAndStoreToken()`/`ensureAuthorized()` confirmed no other startup code path calls it either. This was independently reconfirmed here with a call-counting fetch mock (`web-view/js/entry-auth.test.mjs`) — 0 requests for a no-token startup, including across multiple idle event-loop turns.
- **Hypothesis A (UI/state-only bug) was confirmed.** `showGateForm()` (`entry-auth.js`) correctly set `#authGateChecking.hidden = true` — the JS *state* was always correct. The bug was in `web-view/css/entry-auth.css`: `.auth-gate-checking` (and, on the authenticated side, `.auth-gate-screen`) each carried their own unconditional `display: flex` rule. A browser's native `hidden` attribute is implemented by the UA stylesheet as `[hidden] { display: none }` — an attribute selector, the exact same CSS specificity as a single class selector. At equal specificity, the LAST rule in cascade order wins, and an author stylesheet is always applied after the UA default — so `.auth-gate-checking`'s own `display: flex` always beat `[hidden]`, and the element never actually stopped rendering no matter what `entry-auth.js` set its `hidden` property to. This is the exact same class of bug `web-view/README.md` already documents for `.msc-calendar-main`/`.msc-view-dropdown` ("a same-specificity native `[hidden]` attribute cannot reliably beat the existing rule").

**Conclusion: this was a UI-state/CSS-cascade bug, not a network polling bug.**

## 3. Fix

`web-view/css/entry-auth.css` — added a compound `<class>[hidden] { display: none; }` override rule immediately after each affected base rule (`.auth-gate-checking[hidden]`, `.auth-gate-screen[hidden]`). A class-plus-attribute compound selector has strictly higher specificity than either the plain class or a bare `[hidden]` alone, so it wins regardless of source order — no `!important` needed, no JS change required for the visual fix itself.

`web-view/js/entry-auth.js` — one small, defensive follow-up: `revealApp()` (called on successful authentication) previously only hid the parent `#authGateScreen`, relying on `#authGateChecking` being a hidden descendant to stay invisible. That was already visually correct once the CSS fix above landed, but left the checking element's own `hidden` property internally stale (`false`) after a successful login — exactly the kind of implicit, ancestor-dependent state that caused this bug in the first place. `revealApp()` now also explicitly sets `#authGateChecking.hidden = true`, so the module's own state is never inconsistent with what's rendered.

`.auth-gate-form` was never affected (it has no author `display` rule to conflict with `[hidden]`) — confirmed unchanged and guarded by a new regression test (§6).

## 4. State transitions — before and after

| Scenario | Before | After |
|---|---|---|
| No saved token | `showGateForm()` sets `checking.hidden = true`, `form.hidden = false` — but CSS defeated the checking hide, so both rendered at once | Same JS calls; CSS now honors `hidden` — only the form renders |
| Saved token, pending | Checking indicator renders correctly (never broken — `hidden` stays `false` while pending, so the CSS bug never manifested here) | Unchanged |
| Saved token, valid | `revealApp()` hid `#authGateScreen` only; `#authGateChecking.hidden` stayed stale `false` (visually masked by the parent, but inconsistent internal state) | `revealApp()` now also explicitly hides `#authGateChecking` |
| Saved token, invalid | `handleUnauthorizedResponse()` → falsy event → `showGateForm()` correctly cleared checking/showed form (this path was already unaffected by the CSS bug, since it goes through the same `showGateForm()` no-token uses) | Unchanged |
| Manual submit | Uses the submit button's own busy/spinner state (`setButtonBusy`), not `#authGateChecking` at all — never touched by this bug | Unchanged |

No `/verify` request count changed anywhere: still exactly 0 for no-token, 1 for a saved-token startup check, 1 per explicit manual submission — confirmed by dedicated call-counting tests (§6).

## 5. Security constraints — confirmed unchanged

Nothing in REQ-AUTH-ENTRY-009's security model was touched:

- `#appShell` still only reveals after `verifyAndStoreToken()` resolves successfully — a saved token's mere presence is still never trusted.
- Server-side verification is still the only path to `AUTHENTICATED`.
- 401 handling (`handleUnauthorizedResponse()` → global gate) and 403 handling (never clears the token, never triggers the global gate) — both unchanged; no call site in `calendar/instance.js`, `staff-data.js`, `knowledge-management.js`, or `review-summaries.js` was touched.
- No new authentication state, no new token type, no member-permission change.

## 6. Tests

- `web-view/js/entry-auth.test.mjs` — 13 new tests added (24 total in the file, all passing): form-enabled/ready for a fresh no-token visitor, exactly-zero `/verify` calls for no-token (including across multiple idle event-loop turns — no background polling), checking-indicator visible while a saved-token check is genuinely pending, exactly-one `/verify` call for both the saved-token startup path and a manual submission, and checking-indicator correctly cleared after both a successful and a rejected saved-token check.
- `web-view/js/entry-auth-css-structure.test.mjs` — **new file**, 6 tests. Since this repo has no CSS engine to evaluate computed `display` values, this file proves the fix is present in the stylesheet's own source text (same line/regex-anchored technique as `sidebar-height-responsive.test.mjs`): both affected selectors still declare their base `display: flex`, both now have a higher-specificity `[hidden] { display: none }` override, and `.auth-gate-form` is guarded against ever gaining an unguarded `display` rule of its own in the future.

## 7. What this does not change

Backend: 0 files. DB/schema: 0 changes. Production writes: 0. `member-aios/mayurika-hr/staff-data/`: never opened.

## 8. Known limits

- This repo has no browser/CSS-rendering engine available (no jsdom, no npm dependencies) — the CSS specificity fix could not be verified by measuring an actual computed `display` value in an automated test; §6's CSS-structure test instead proves the fix exists in the stylesheet's source with the exact selector shape needed to win the cascade, which is a deterministic, engine-independent guarantee (CSS specificity rules are not implementation-dependent), not a rendered-pixel check.
- No live browser/production visual re-verification was performed after this fix, for the same reason as REQ-AUTH-ENTRY-009's own publish task — recorded as pending.

## 9. Next step

Live-browser confirmation that a fresh, no-saved-token visit to the deployed instance now shows only the token-entry form with no "Checking authorization…" text present.

# Management Issues Frontend — Implementation Check — 2026-08-10

Requirement: `docs/2026-08-10_management-issues-frontend-requirement.md` (REQ-ISSUES-UI-001)

## 1. Scope confirmed

Frontend-only. No backend file was modified. No database/migration/schema file was modified. No write occurred against any production system, `varman_aios`, or `varmen_db`. `member-aios/mayurika-hr/staff-data/` was never opened.

## 2. Files created

| File | Purpose |
|---|---|
| `web-view/js/issues.js` | Workspace module: data adapters, pure filter/sort/preview helpers, DOM mount/render, admin gating |
| `web-view/css/issues.css` | Namespaced `.msc-issues-*` styles, reusing existing design tokens |
| `web-view/js/issues.test.mjs` | 49 tests — pure helpers, adapters, data-safety, DOM interaction |
| `web-view/js/issues-navigation-structure.test.mjs` | 12 tests — regex-based structural coverage of `index.html` (mirrors `navigation-structure.test.mjs`) |
| `docs/2026-08-10_management-issues-frontend-requirement.md` | Requirement doc |
| `validation/management-issues-frontend-check-2026-08-10.md` | This file |
| `handover/2026-08-10__management-issues-frontend-closure.md` | Closure handover |

## 3. Files modified

| File | Change |
|---|---|
| `web-view/index.html` | One new sidebar `.app-nav-btn[data-tab="issues"]` (Staff group, after Review Summaries); one new top-level `#tab-issues` panel with `#issuesWorkspace` mount; one new `<link>` to `css/issues.css` |
| `web-view/js/app.js` | Imports and calls `initIssues()` once at boot, after `initReviewSummaries()` |
| `web-view/js/member-registry.js` | Added `isAdminMemberKey(memberKey)` — derives Admin status from `MEMBER_REGISTRY[key].role === 'Admin Manager'`, never a name comparison |

Backend files changed: **0**. Database/migration files changed: **0**.

## 4. Navigation structure

- Sidebar Issues item count: **1** (`web-view/js/issues-navigation-structure.test.mjs` test 1)
- Top-level `#tab-issues` panel count: **1**, confirmed as a true sibling (4-space-indented top-level `.tab-panel`, not nested in any member panel) (tests 3-4)
- `#issuesWorkspace` mount count: **1**, found only inside `#tab-issues` (test 5)
- Placement: Staff sidebar group, immediately after Review Summaries (test 6)
- Regression: Review Summaries and Data (`staff-data`) nav items/panels still present and untouched (tests 7-9); none of the 5 member panels contain an Issues mount (test 9)
- `css/issues.css` linked exactly once (test 11)
- No copied reference `ISSUES` fixture array anywhere in `index.html` (test 12)

## 5. Issues view

- Internal tabs: Issues (default) / Assigned Tickets, `role="tablist"`/`role="tab"`/`aria-selected`, switching toggles `hidden` correctly (verified both by `issues.test.mjs` DOM tests and by a real headless-Chromium run — see §9; an initial CSS bug where both panels rendered simultaneously was found and fixed, see §10).
- Raised By filter, Domain filter (dynamically populated from the loaded issues, alphabetically sorted): confirmed narrowing behavior.
- Status filter: All / Red / Amber / Green, each showing color **and** visible text (never color alone); confirmed for RED, AMBER, GREEN independently.
- Sortable columns: every column except Data; confirmed for Ticket ID (asc/desc), Raised By, Priority Score (severity order — critical > high > medium > blank, not alphabetical), plus pure-function coverage for dateRaised, status, and title.
- Truncate/expand: long fields (>320 chars) get a "more" button; expanding shows "less"; `aria-expanded` toggles; collapsing restores the truncated preview.
- Data link: `target="_blank"` and `rel="noopener noreferrer"` confirmed; missing `dataLink` renders "—", not an empty cell.
- Missing Priority Score renders "—".
- Issue content (including a fixture title containing `<img src=x onerror=alert(1)>` and a description containing a literal `<script>` tag) renders as literal text — confirmed no `<img>`/`<script>` element is ever created anywhere in the rendered tree, and the raw string is present in the visible text. The module never uses `innerHTML` with issue-authored content anywhere (createElement/textContent throughout, same convention as `review-summaries.js`).

## 6. Admin / non-Admin / MD

- Admin (Rajiv, role `Admin Manager`): sees Select All, Assign To, Assign.
- Non-Admin (Mayurika): sees none of the three controls at all (not merely disabled) — confirmed by absence in the DOM, not a CSS hide.
- MD: sees none of the three controls — falls out of the same role check (`MEMBER_REGISTRY.md.role === 'Read-only'`), no MD-specific carve-out needed.
- No authenticated member (`null`): also sees no assignment controls.
- Assignee dropdown / Assigned Tickets' Assignee filter both list exactly `Mayurika, Suman, Arun, Rajiv, Paraparan`, in that order, sourced from `member-registry.js`'s `MEMBER_REGISTRY` — misspelled `"Rajive"`/`"Maurika"` never appear (confirmed both via string-negative assertions and by reading the real dropdown option labels in a live browser).
- Admin status derivation confirmed as role-based, not name-based, by unit-testing `isAdminMember()` directly against every registry key plus `null`/unknown keys.

## 7. Assignment flow (frontend-only, no backend)

- Select All operates only on currently-visible (filtered) **and** currently-unassigned tickets — confirmed by filtering to RED first, then Select All, then checking exactly the two RED tickets were selected.
- Selected count updates live ("N selected").
- **In-memory fixture adapter** (test/dev only): Assign records `assignedTo`/`assignedDate`/`solvingStatus: 'not-solved'`; selection and the Assign To dropdown reset after a successful assign; the now-assigned row's checkbox becomes checked+disabled (locked, cannot be re-selected via Select All); the ticket then appears under Assigned Tickets with the correct assignee.
- **Production adapter** (the one actually wired into `app.js`): clicking Assign shows an inline "Assignment connection pending — there is no Issue-System backend connected yet, so this selection was not saved." notice, and the ticket does **not** appear under Assigned Tickets — confirmed the UI never claims a save that did not happen.
- Solving Status (Not Solved / Partially Solved / Solved Completely, mapped red/amber/green) is edited only from an Assigned Tickets card, is stored only in the adapter's assignment map, and never mutates the issue's own `status` field — confirmed by re-fetching the issue after a solving-status change and asserting `status` is unchanged.
- Assignee filter on Assigned Tickets narrows the card list correctly.

## 8. Empty / loading / error states

- Empty (adapter has zero issues, and separately the real production adapter with no backend): "No issues are available yet."
- Filtered-to-nothing (data present, filters exclude everything): "No issues match this filter."
- Loading: "Loading issues…" renders synchronously before the adapter's promise resolves (verified with a manually-controlled never-settling promise).
- Error: "Issues could not be loaded. Please try again." with a working Retry button that re-fetches and recovers.
- Assigned Tickets empty: "No tickets are currently assigned."

## 9. Live browser verification

No `chromium-cli` tool was available in this environment; Playwright's Node package was installed on demand into the session scratchpad (`npm install --no-save playwright`, browsers already cached locally, no project `package.json`/`node_modules` touched) and used to drive a real headless Chromium against `web-view/index.html` served via `python -m http.server`. Confirmed:

- Issues tab loads from the sidebar with zero unexpected console errors (only pre-existing `ERR_CONNECTION_REFUSED` from unrelated Calendar/Staff-Data API calls to a backend that isn't running in this check — expected and unrelated to this feature).
- Switching to Assigned Tickets and back renders correctly.
- A populated fixture (3 issues, one >320-char description, one HTML-like title) renders the full table with sortable headers, RED/AMBER/GREEN badges, "—" for missing values, "more"/"less" truncation, and a working View Data button.
- Checkbox selection → Assign To → Assign (in-memory adapter) → card appears under Assigned Tickets with "Assigned to: Suman", "Assigned date", and a red "NOT SOLVED" solving-status pill — all matching the automated test assertions.
- Responsive drawer behavior at <1024px (sidebar off-canvas by default, opens via the header toggle) is unaffected by this change — confirmed by opening the drawer and navigating to Issues at a 768px viewport.
- 390px viewport: toolbar stacks to full width, status tabs wrap, content stays within the viewport with no horizontal page overflow.

## 10. Bug found and fixed during this check

`.msc-issues-view-panel { display: flex; }` (an author rule) silently overrode the browser's default `[hidden] { display: none }` UA rule at equal CSS specificity, because author-origin rules always beat UA-origin rules regardless of specificity. Setting `panel.hidden = true` from JS therefore had no visible effect, and both the Issues and Assigned Tickets panels rendered stacked simultaneously. Fixed by adding an explicit `.msc-issues-view-panel[hidden] { display: none; }` override in `issues.css`. Caught only by the live-browser check (§9) — the hand-rolled DOM test stand-in has no `display`/CSS-cascade concept, so the automated test suite could not have caught this class of bug; documented here as a known gap in that stand-in's fidelity.

## 11. Automated test results

```
web-view/js/*.test.mjs        : 200 pass, 0 fail   (previously 139; +61 new: 49 issues.test.mjs + 12 issues-navigation-structure.test.mjs)
web-view/js/calendar/*.test.mjs: 181 pass, 0 fail   (unchanged — regression check only, no calendar file touched)
```

No pre-existing test was modified. No pre-existing test's assertions changed.

## 12. Accessibility

- Real `<button>` elements for every interactive control (view tabs, status tabs, sort headers, more/less, Assign, Retry).
- Internal view tabs use `role="tablist"`/`role="tab"`/`aria-selected`/`aria-controls`.
- Status filter buttons use `role="group"` + `aria-pressed`.
- Sortable headers expose `aria-sort` (`ascending`/`descending`/`none`).
- Every `<select>` has an associated `<label for="...">`; the Select All checkbox has an associated `<label>`.
- Focus-visible styling reuses the app's existing `--focus-ring` token on every new interactive element.
- Status is communicated with visible text (RED/AMBER/GREEN, Not Solved/Partially Solved/Solved Completely) in addition to color.
- Empty/loading/error state text is plain visible text, not solely visual.
- Not independently checked with a screen reader in this session — a known limitation, noted below.

## 13. Known limitations

1. Admin gating reflects the identity authenticated **at the moment the tab was mounted**; changing the Calendar token afterward re-mounts the workspace live (via `CALENDAR_AUTH_CHANGED_EVENT`, same event Review Summaries already uses), so this is handled, but was only exercised indirectly (not by a dedicated automated test) — noted for a future pass.
2. Solving Status is editable by any authenticated viewer of the Assigned Tickets card (not gated to Admin) — the requirement did not specify this should be Admin-only, and the reference sample also allowed it unrestricted; flagged here as a deliberate reading of an ambiguous requirement, not an oversight.
3. No screen-reader pass was performed; only structural ARIA attributes were verified.
4. The production adapter always returns an empty issue list (by design, per §10 of the requirement doc) — this tab will show "No issues are available yet." in production until a backend integration requirement is separately approved and built.

## 14. Verdict (original implementation, superseded — see §15)

**PASS.** All in-scope UX behaviors from the supplied reference are reproduced without adopting its two production-unsafe shortcuts. Zero backend/database changes. Zero production writes. 61 new tests pass; 381 pre-existing tests remain green.

## 15. Correction — 2026-08-10 (confirmed business rules)

Requirement update: `docs/2026-08-10_management-issues-frontend-requirement.md` §11.

### 15.1 Files modified (this correction)

| File | Change |
| --- | --- |
| `web-view/js/issues.js` | Raised By/Team now sourced from the real Staff Data API (`GET /api/staff`, `GET /api/staff/filter-options`, via `staff-data.js`'s `STAFF_API_BASE`); `domain` field renamed to `team` throughout; new `hasAssignmentAuthority(memberKey)` exact-identity check (`=== 'rajiv'`) replaces the role-based check; new `buildDemoIssues()`/`createProductionStaffTeamSource()`/`createProductionIssuesAdapter(staffTeamSourceOverride)`; new demo banner wiring; new `loadingMessage` opt |
| `web-view/css/issues.css` | Added `.msc-issues-demo-banner` (visible, accessibly-styled, not footer text) |
| `web-view/js/member-registry.js` | Removed `isAdminMemberKey()`/`ADMIN_ROLE` entirely (superseded — see requirement §11.4) |
| `web-view/js/issues.test.mjs` | Rewritten: 63 tests (was 49) |
| `docs/2026-08-10_management-issues-frontend-requirement.md` | §11 correction section added |
| `validation/management-issues-frontend-check-2026-08-10.md` | This §15 |
| `handover/2026-08-10__management-issues-frontend-closure.md` | §correction section added |

`web-view/index.html` and `web-view/js/app.js`: **unchanged** by this correction (already correct from the original implementation). `web-view/js/issues-navigation-structure.test.mjs`: unchanged, still 12/12 passing (no structural/navigation change).

### 15.2 Raised By source

`GET /api/staff?staff_status=Active&limit=500` (`web-view/js/staff-data.js`'s exported `STAFF_API_BASE`, same local/production host-detection constant `review-summaries.js` already reuses). Response `records[].full_name`, deduped + alphabetically sorted client-side (`uniqueSorted`). Verified live against the real deployed backend (`https://management-aios-api.vercel.app/api/staff`, read-only GET, no auth required, no data written) via a Playwright route proxy (see §15.6): **142 active staff records**, 142 unique names → 143 dropdown options including "All". No sample name (`Nandhi`/`Nivarnan`/`Sasi`/`Sathis`) appears anywhere in `issues.js` (source-text test).

### 15.3 Team source

`GET /api/staff/filter-options` → `teams` array (already `SELECT DISTINCT department_team ... ORDER BY department_team` server-side; deduped again client-side defensively). Verified live: **81 distinct team values currently in the system** → 82 dropdown options including "All". Visible UI label is "Team" (confirmed both in the automated DOM test and by reading the live label element in a real browser). No sample domain (`Listing`/`PH`/`Postage`/`Pricing`/`Purchase`) appears anywhere in `issues.js` (source-text test).

**Known data-quality observation (not in scope to fix here):** the live `teams` array contains many near-duplicate variants from inconsistent historical data entry (e.g. `eBay`/`Ebay`/`EBay`/`EBAY`/`ebay` as five separate distinct values, `Automation Technical` appearing in at least 4 spelling/casing variants). This is real, existing Staff Data — the correction's instruction was to use the authoritative system source verbatim, not to normalize it; any cleanup is a Staff Data governance question, out of scope for this frontend-only Issues correction.

### 15.4 Demo data

Exactly 3 records: `DEMO-ISSUE-001` (RED), `DEMO-ISSUE-002` (AMBER), `DEMO-ISSUE-003` (GREEN). Each bound to a real value from the loaded Raised By/Team lists (`pick(list, i)`, cyclic index — never a blank/fabricated binding; if either list is empty, the whole fetch is treated as unavailable instead — see §15.5). Ticket IDs, titles, and descriptions are entirely synthetic placeholder text; no real confidential narrative, no real evidence link, no production database ID. Demo banner renders the exact required copy ("Demo data — 3 temporary issues are shown while the Issue System connection is pending.") in a visible, bordered, colored banner — never small footer text — confirmed present and correctly worded in both the automated test and a live browser screenshot.

### 15.5 Loading order / failure handling

- **Initial:** "Loading staff and team options…" (production wiring only, via `initIssues()`'s `loadingMessage` opt; other adapters keep the generic "Loading issues…" default — both variants tested).
- **On success:** filters + 3 demo issues render, demo banner visible.
- **On failure** (network/HTTP error from either Staff Data endpoint, OR a successful-but-empty response from either): "Staff/team options could not be loaded." with a working Retry button; demo issues and banner stay hidden — chosen as the safer of the two options the requirement offered ("may remain hidden until valid filter-source data exists"), since it never risks binding a demo record to a blank/fabricated value.

### 15.6 Assignment authority — exact identity

`hasAssignmentAuthority(memberKey)` returns `true` only for the literal string `'rajiv'`. Confirmed by direct unit tests that a memberKey equal to the *role text* (`'Admin Manager'`) or the *display name* (`'Rajiv'`, capitalized) both return `false` — proving the check cannot be fooled by either shape of "looks like Rajiv" text, only the exact `member_key`. Confirmed in the DOM: mounting with `getAuthenticatedMemberKey` returning `'Admin Manager'` or `'Rajiv'` renders no assignment controls; only the literal `'rajiv'` does. `member-registry.js`'s `isAdminMemberKey()` was removed entirely (not deprecated-in-place) so it cannot be accidentally reused elsewhere.

"Assign To" (who may be assigned) is unchanged from the original implementation — still exactly `Mayurika, Suman, Arun, Rajiv, Paraparan` from `MEMBER_REGISTRY`, confirmed live against the real Staff Data-backed workspace (§15.7) — `["Choose…","Mayurika","Suman","Arun","Rajiv","Paraparan"]`, no MD, no misspellings.

### 15.7 Live browser verification (this correction)

Playwright (already installed from the previous session's scratchpad) drove real headless Chromium against `web-view/index.html` served locally via `python -m http.server`, with `page.route()` proxying only `http://127.0.0.1:8000/api/staff**` requests to the real, read-only, publicly-reachable production Staff Data API (`https://management-aios-api.vercel.app`) — no local backend started, no write of any kind, no deployment. A Calendar auth token was seeded directly into `localStorage` in the shape `calendar/auth.js` reads (`management_aios_calendar_auth_v1`) to simulate an authenticated Rajiv/Mayurika session without needing a running auth backend.

Confirmed, with real production staff/team data:

- Exactly 3 rows (`DEMO-ISSUE-001/002/003`).
- Raised By: 143 options (142 real active staff names + "All").
- Team: 82 options (81 real team values + "All"), label reads "Team".
- Demo banner visible with exact required text.
- Rajiv (`member_key: 'rajiv'`): Select All + Assign To present (1 each); Assign To options exactly `Choose…, Mayurika, Suman, Arun, Rajiv, Paraparan`.
- Mayurika (`member_key: 'mayurika'`): Select All + Assign To both absent (0); still sees the same 3 demo issues (view/filter allowed, assignment not).
- Team filter narrows 3 rows → 1 row correctly.
- Both internal tabs work; Assigned Tickets visible / Issues hidden while on the Assigned Tickets tab, and vice versa (the earlier `[hidden]`-vs-`display:flex` fix from §10 holds under real data too).
- No Issues-specific console error (only pre-existing, unrelated `ERR_CONNECTION_REFUSED` from other unproxied Calendar/Review-Summaries API calls to the not-running local backend).

No real issue was created or assigned; Assign was not exercised against the live proxy in this pass (already covered deterministically by the automated fixture-adapter test in §15.9) to keep this browser check strictly read-only end to end.

### 15.8 Local backend availability

`backend/README.md` documents running the FastAPI backend locally, but it requires a real `DATABASE_URL` (Postgres credentials) not present in this environment — not attempted. Instead, §15.7's read-only proxy against the real deployed production API (`GET /api/staff*`, no auth required, confirmed via direct `curl`) gave a stronger and simpler verification than a local backend would have, without needing any credentials or local service.

### 15.9 Automated test results (this correction)

```text
web-view/js/issues.test.mjs                    : 63 pass, 0 fail   (was 49; rewritten for the field rename, exact-identity auth, demo data, staff/team source)
web-view/js/issues-navigation-structure.test.mjs: 12 pass, 0 fail  (unchanged)
web-view/js/*.test.mjs (full directory)         : 214 pass, 0 fail (was 200; net +14 = 63+12 replacing the old 49+12)
web-view/js/calendar/*.test.mjs                 : 181 pass, 0 fail (unchanged — regression check only)
```

Key new/changed coverage: staff source called with the correct URL/query (`staff_status=Active`, `limit=500`) and deduped+sorted result; team source called against `/filter-options` and deduped+sorted; empty-but-successful response treated as unavailable; exact-identity assignment-authority tests (role text alone fails, display name alone fails, only literal `'rajiv'` passes); demo-issue construction tests; demo banner presence/absence tests; source-text tests confirming no reference-sample name/team list and no `indexedDB` usage (in addition to the existing `localStorage`/`sessionStorage` checks).

### 15.10 Known limitations (this correction, in addition to §13)

1. The Staff Data API's `limit=500` cap (`backend/routers/staff.py`'s `MAX_LIMIT`) means Raised By would silently stop growing past 500 active staff — not a concern today (142 active), documented for future awareness.
2. The live `teams` list's data-quality issues (§15.3) are surfaced verbatim in the Team filter — a real, pre-existing Staff Data governance issue, not something this frontend-only correction cleans up.
3. Demo-issue Raised By/Team bindings use a fixed `pick(list, i)` (index 0/1/2 of the alphabetically-sorted list) — deterministic but not randomized; acceptable for a clearly-labeled demo, noted for completeness.
4. Assign was not exercised against the live production-API-backed browser session in this pass (see §15.7) — covered instead by a deterministic automated test using a fixture staff/team source, which exercises the identical code path without depending on network timing during a live check.

### 15.11 Verdict (superseded — see §16)

**PASS.** All confirmed business-rule corrections applied: real Staff Data-sourced Raised By/Team, Domain→Team rename, exactly 3 clearly-labeled demo issues bound to real values, exact-identity (`member_key === 'rajiv'`) assignment authority replacing the rejected role-based check. Zero backend/database changes. Zero production writes. Zero real issue records created or assigned. 63 new/rewritten Issues tests pass (was 49), 214/214 in the full `web-view/js` suite (was 200/200), 181/181 Calendar (unchanged).

## 16. Correction — 2026-08-10 (second correction, same day) — MD granted Issue assignment authority

Requirement update: `docs/2026-08-10_management-issues-frontend-requirement.md` §12. This is a small, tightly-scoped follow-up to §15 — only the assignment-authority allowlist changed.

### 16.1 Scope confirmed

Frontend-only. `git diff --name-status` against the previously-pushed commit (`06b5aeb`) shows exactly 2 files: `web-view/js/issues.js`, `web-view/js/issues.test.mjs`. `member-registry.js` was **not** touched (not genuinely required — the new allowlist lives entirely in `issues.js`). No Review Summary file was touched. No backend/database/migration file was touched. `member-aios/mayurika-hr/staff-data/` was never opened.

### 16.2 What changed

`ISSUE_ASSIGNMENT_AUTHORITY_KEYS = new Set(['rajiv', 'md'])` replaces the single-value `ASSIGNMENT_AUTHORITY_MEMBER_KEY = 'rajiv'` constant; `hasAssignmentAuthority(memberKey)` now does `.has(memberKey)` against the Set instead of a `===` comparison against one literal. Still an exact-identity check — no role text, no display name, no substring matching anywhere in the implementation.

"Assign To" (`getAssigneeOptions()`/`ASSIGNEE_ORDER`) is byte-for-byte unchanged — still exactly `Mayurika, Suman, Arun, Rajiv, Paraparan`. MD gaining assignment *authority* does not add MD to the assignee list; these remain two independent questions in the code (one gates which controls render via `canAssign()`, the other populates the `<select>` options), confirmed still independent by test.

### 16.3 MD Review Summary regression check

`member-registry.js` diff is empty (git confirms 0 changes to this file in this correction). `review-summaries.js` diff is empty. The full `review-summaries.test.mjs` suite (part of the 220-test `web-view/js/*.test.mjs` run below) passes unchanged, including its MD-specific read-only tests (create/edit form hidden, read-only notice shown, no Edit button ever renders for MD since no Review Summary is ever owned by "md", PDF download still works, token-change-to/from-MD tests). MD's Review Summary read-only status is provably untouched by this correction.

### 16.4 Test results

```text
web-view/js/issues.test.mjs                    : 69 pass, 0 fail   (was 63; +6 for the rajiv+md allowlist, MD role/display-name-alone-fails tests, MD-Assign pending-backend + no-persistence tests, MD-in-Assign-To-still-absent tests)
web-view/js/issues-navigation-structure.test.mjs: 12 pass, 0 fail  (unchanged — no navigation/structural change)
web-view/js/*.test.mjs (full directory)         : 220 pass, 0 fail (was 214; net +6, includes the full review-summaries.test.mjs suite unchanged/passing — confirms no MD Review Summary regression)
web-view/js/calendar/*.test.mjs                 : 181 pass, 0 fail (unchanged)
```

New/changed coverage specifically: `hasAssignmentAuthority('rajiv')`/`('md')` both true; every other registered key, `null`, `undefined` false; `MEMBER_REGISTRY.md.role` ("Read-only") and `MEMBER_REGISTRY.md.displayName` ("MD") alone both fail to grant authority (mirroring the existing Rajiv role/display-name-alone-fails tests); DOM tests confirming both `rajiv` and `md` render Select All/Assign To/Assign and every other identity (including a memberKey literally equal to `"Read-only"` or `"MD"`) does not; DOM tests confirming Assign To still excludes MD and still contains exactly the 5 Management Team members for both authority identities; an MD-initiated Assign click shows the identical "Assignment connection pending" notice and leaves `localStorage._store` byte-for-byte unchanged (explicit before/after snapshot comparison, not just an absence check).

### 16.5 Live browser verification (this correction)

Local `web-view/index.html` served via `python -m http.server`, with `page.route()` proxying only `http://127.0.0.1:8000/api/staff**` to the real, read-only, publicly-reachable production Staff Data API (same technique as §15.7 — no local backend started, no write, no deployment). Confirmed with real staff/team data:

- `rajiv`: `selectAll=1 assignTo=1`, Assign To options `["Choose…","Mayurika","Suman","Arun","Rajiv","Paraparan"]`.
- `md`: `selectAll=1 assignTo=1`, identical Assign To options — MD authority granted, MD still absent from the assignee list.
- `mayurika`: `selectAll=0 assignTo=0` — no assignment controls, as before.

A full production push/verification pass (equivalent to §15.7/§9's earlier live-production checks) was intentionally deferred to the post-approval push turn, per instruction ("Do not push until the report is reviewed") — this section's local verification is sufficient to confirm the code change behaves correctly before that review.

### 16.6 Known limitations (in addition to §13/§15.10)

1. As before (§15.10 item 4), the live production Staff API was reached read-only via a local proxy rather than a fully-deployed check, since this correction is not yet approved for push.
2. The 3 demo issues, Raised By/Team sourcing, and the demo banner are all byte-for-byte unchanged by this correction — re-verified by the unchanged/passing subset of §15's tests, not re-described here.

### 16.7 Verdict (supersedes §15.11)

**PASS.** Assignment authority allowlist correctly widened to exactly `{rajiv, md}`, via an explicit Set-based exact-identity check — no role text, no display name, no substring matching. "Assign To" (who may be assigned) remains exactly the 5 Management Team members, MD still excluded. MD's Review Summary read-only status is provably unaffected (zero diff to `member-registry.js`/`review-summaries.js`, full existing MD Review Summary test suite still green). Zero backend/database changes. Zero production writes. Zero real issue records created or assigned. Zero assignment persistence anywhere. 69/69 `issues.test.mjs` (was 63), 220/220 full `web-view/js` suite (was 214), 181/181 Calendar (unchanged).

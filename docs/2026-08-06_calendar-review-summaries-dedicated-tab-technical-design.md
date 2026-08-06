---
name: calendar-review-summaries-dedicated-tab-technical-design
type: technical-design-document
created: 2026-08-06
created-by: Mareenraj (builder)
status: READY FOR IMPLEMENTATION — no open business parameters; one open technical follow-up (see §12)
requirement-id: REQ-CAL-REV-TAB-002
---

# Technical Design — Management AIOS Calendar Review Summaries Dedicated Tab (2026-08-06)

## 0. Requirement metadata / source

| Field | Value |
|---|---|
| Requirement ID | REQ-CAL-REV-TAB-002 |
| Requirement file | `docs/2026-08-06_calendar-review-summaries-dedicated-tab-requirement.md` |
| Companion validation | `validation/calendar-review-summaries-dedicated-tab-design-check-2026-08-06.md` |
| Prior requirement/design being consolidated | `docs/2026-08-03_calendar-review-summaries-requirement.md`, `docs/2026-08-03_calendar-review-summaries-technical-design.md` (REQ-CAL-REV-001) |
| Repository state at design time | `main` = `origin/main` = `3c9135d`, working tree clean, 0/0 divergence (verified this session) |

This is a design document only. No application code, migration, or database object was created, executed, or queried while producing it. The protected path `member-aios/mayurika-hr/staff-data/` was never opened.

## 1. Architecture overview

The existing Staff Review Summaries feature (REQ-CAL-REV-001) is a working, tested slice: one backend router (`backend/routers/staff_review_summaries.py`), one table (`management_aios.staff_review_summaries`), and one frontend module (`web-view/js/review-summaries.js`) mounted 5 times. This design does **not** rebuild that slice — it (a) collapses the 5 frontend mounts into 1, (b) redefines "reviewer identity" in the UI from "which tab you're in" to "who the token says you are," (c) adds one small, additive, opt-in backend read parameter so the dedicated tab can show all reviewers' summaries for one employee by default, and (d) adds one additive response field so history cards can show a reviewer's name and role without duplicating that registry anywhere new.

No table, migration, or existing route contract changes. No existing test's asserted behavior changes.

## 2. Current-state discovery (Phases 3–4)

### 2.1 Frontend — five mount points

All five are identical markup blocks in `web-view/index.html`, each `<div class="review-summaries-instance" data-member-key="…">` preceded by `<h3 class="section-title">Review Summaries</h3>`, placed after that panel's `.msc-instance` (schedule calendar):

| Member | Panel container | Mount line | `data-member-key` |
|---|---|---|---|
| Mayurika | `#tab-mayurika-hr` | `index.html:655` | `mayurika` |
| Suman | `#tab-suman-recruitment` | `index.html:970` | `suman` |
| Arun | `#tab-arun-implementation` | `index.html:1234` | `arun` |
| Rajiv | `#tab-rajiv-blocked` | `index.html:1528` | `rajiv` |
| Paraparan | `#tab-paraparan` | `index.html:1687` | `paraparan` |

Instantiation is a single loop, not 5 hand calls: `initReviewSummaries()` (`review-summaries.js:1017-1022`) does `document.querySelectorAll('.review-summaries-instance')` and calls `mountReviewSummariesForMember(mountEl, mountEl.getAttribute('data-member-key'))` per node, called once from `app.js:27` inside `boot()`.

### 2.2 Sidebar heading and Staff Data nav item

`index.html:206-207`:
```html
<div class="app-sidebar-group">
  <div class="app-sidebar-title">Data</div>
  <button type="button" class="app-nav-btn" data-tab="staff-data" title="Staff Data">
    ...
    <span class="app-nav-btn-text"><span class="app-nav-btn-label">Staff Data</span></span>
  </button>
</div>
```
Target panel: `<div class="tab-panel" id="tab-staff-data">` at `index.html:1599`.

### 2.3 Panel registration/activation mechanism

Pure DOM-attribute driven, no registry object, no hash routing (`web-view/js/navigation.js:13-42`):
- `sideNavBtns = document.querySelectorAll('.app-nav-btn')`, `tabPanels = document.querySelectorAll('.tab-panel')`.
- `activatePanel(targetId)` toggles `.active`/`aria-current` on the button whose `data-tab === targetId`, and `.active` on the panel whose `id === 'tab-' + targetId`.
- Every activation dispatches `document.dispatchEvent(new CustomEvent('msc:close-toolbar-popovers'))` (`navigation.js:34`) — this is the event `review-summaries.js:989` currently listens on as a proxy for "the sidebar member changed," since there is no dedicated panel-switch event and no per-tab registry today.
- No `location.hash`/deep-linking anywhere in `web-view/js/**` — navigation state is in-memory DOM classes only.

### 2.4 Mobile sidebar

No separate mobile nav markup — the same `.app-sidebar` is reused via a CSS breakpoint (`web-view/css/navigation.css:540`, `body.sidebar-open` drawer, `#sidebarBackdrop`, `#sidebarToggle`). One nav-button insertion covers desktop and mobile; no second insertion point is needed.

### 2.5 Current per-instance state model

`mountReviewSummariesForMember(mountEl, memberKey)` (`review-summaries.js:319`) creates a fresh closure-scoped `state = {selectedStaff, includeInactive, dateFrom, dateTo, editingId, staffSearchAbort, historyRequestId}` per mount — 5 independent state objects today, each pinned to a fixed `memberKey`. There is no shared/global module state; only the browser-wide Calendar auth token is shared across instances.

### 2.6 Token-change handling

`review-summaries.js:990` listens for `CALENDAR_AUTH_CHANGED_EVENT` (from `calendar/auth.js`) → `reevaluateAccess()` (`:982-987`) clears panel state, re-renders the access gate, and re-fetches history if now readable. It also listens to `msc:close-toolbar-popovers` on the same handler (`:989`) purely as a "which tab am I in now" proxy — this second listener becomes unnecessary once there is only one instance that never remounts on tab switch (see §10, removal list).

### 2.7 Current staff-search implementation

Self-contained inside `review-summaries.js`, not reused from `staff-data.js` — the only thing imported from that module is `STAFF_API_BASE` (`staff-data.js:124`; it exports no standalone search function). `fetchStaffOptions(search, includeInactive, signal)` (`review-summaries.js:267-276`) calls `GET /api/staff` directly. UI flow: debounced input → `doStaffSearch` (`:553-581`) → `renderStaffResults` → `selectStaff(staff)` (`:530`) sets `state.selectedStaff`; `reviewed_staff_id` is read from `state.selectedStaff.id` at submit time (`:704`). This logic is not currently extracted as a standalone reusable component — collapsing 5 mounts to 1 removes the duplication for free without requiring extraction.

### 2.8 Current own/read-only/unauthorized logic

`reviewSummaryAccessDecision({authenticatedMemberKey, selectedReviewerMemberKey})` (`review-summaries.js:198-204`):
- no `authenticatedMemberKey` → `'unauthorized'`
- `authenticatedMemberKey === selectedReviewerMemberKey` → `'own'`
- else → `'read_only'`

Today `selectedReviewerMemberKey` is the **panel's fixed per-tab `memberKey`** — i.e., "which tab you're viewing," not "who authored this specific record." This is the central concept that must change: in a single dedicated tab there is no per-tab `memberKey` to compare against. Ownership must become **per-record**: compare each history row's own `reviewer_member_key` (returned by the API) against the authenticated token's member key, individually, per card — not once per panel.

### 2.9 Backend contract confirmed unchanged (Phase 4)

`backend/routers/staff_review_summaries.py`:

| Route | Rule confirmed | Citation |
|---|---|---|
| `POST /api/staff-review-summaries` | `reviewer_member_key` is server-derived only; `StaffReviewSummaryCreate` has no such field, so a client cannot set or spoof it | `:187-214`, schema `schemas.py:839-859`, test `test_ownership_spoof_field_is_ignored_safely` |
| `GET /api/staff-review-summaries` (list) | `reviewer_member_key` optional, **defaults to `acting_member`** when omitted; when supplied, validated against `VALID_MEMBER_KEYS` (422 if unknown) and scopes to that one reviewer; `deleted_at IS NULL` always applied; order `meeting_date DESC, created_at DESC` | `:217-276` |
| `GET /api/staff-review-summaries/{id}` (detail) | Shared read — any authenticated member, id + `deleted_at IS NULL` only, no owner filter | `:279-292`, `_get_active_summary_or_404` (`:129-145`) |
| `PUT /api/staff-review-summaries/{id}` | Owner-only via `_get_owned_summary_or_404` (`:105-126`); cross-reviewer/nonexistent/soft-deleted all collapse to 404, never 403 | `:295-321` |
| `DELETE /api/staff-review-summaries/{id}` | Owner-only, same check; soft delete (`deleted_at` set, row retained) | `:324-340` |

Auth: `get_verified_member` returns a bare `member_key` string only (`calendar_auth.py:97-103`). Display labels ("Name — Role") live **only** in `backend/config.py:90-102` as `MEMBER_LABELS` — the sole registry combining a member's name and role in this codebase. `VALID_MEMBER_KEYS = ("mayurika", "suman", "arun", "rajiv", "paraparan")` (`config.py:55`).

**Critical existing test that must not break**: `test_reviewer_member_key_omitted_defaults_to_authenticated_reviewer` (`tests/test_staff_review_summaries.py:303-312`) — asserts that a caller who never passes `?reviewer_member_key=` sees only their own rows. Any new "all reviewers" behavior must be a strictly separate, explicitly opt-in code path.

**No existing `scope=`/`include_all=` naming convention anywhere in `backend/routers/`** — this feature establishes a new, but locally-consistent, plain `Optional[...] = Query(default=...)` pattern (the same style already used by `reviewer_member_key`, `date_from`, `date_to` on this same route).

## 3. Navigation design

### 3.1 Sidebar changes (`web-view/index.html:206-219`)

```html
<div class="app-sidebar-group">
  <div class="app-sidebar-title">Staff</div>                        <!-- was: Data -->
  <button type="button" class="app-nav-btn" data-tab="staff-data" title="Data">
    ...
    <span class="app-nav-btn-text"><span class="app-nav-btn-label">Data</span></span>   <!-- was: Staff Data -->
  </button>
  <button type="button" class="app-nav-btn" data-tab="review-summaries" title="Review Summaries">
    <span class="app-nav-icon" aria-hidden="true">...</span>
    <span class="app-nav-btn-text"><span class="app-nav-btn-label">Review Summaries</span></span>
  </button>
</div>
```

- `data-tab="staff-data"` is kept as-is — only its visible label changes, so the existing panel id (`#tab-staff-data`) and any other code keyed on `data-tab="staff-data"` is untouched.
- New button `data-tab="review-summaries"` requires **no JS registration** — `navigation.js:16-17` re-queries `.app-nav-btn`/`.tab-panel` at boot; any element matching those selectors is auto-wired.
- A new panel `<div class="tab-panel" id="tab-review-summaries" role="tabpanel">…</div>` is added once to `<main class="tab-main">`; DOM order relative to other panels does not matter (`navigation.js` matches by id, not position) — placing it near the removed Mayurika mount is the most readable location.
- Required order (Data, then Review Summaries) is satisfied by source order of the two `<button>` elements inside the same `.app-sidebar-group` — `navigation.js` does not reorder buttons.

### 3.2 Mobile

No separate change required — §2.4 confirms the sidebar markup is shared between desktop and the mobile drawer via CSS only.

### 3.3 Deep-linking

None exists today and none is introduced — consistent with the rest of the app's no-hash-routing convention.

## 4. All-reviewers API design (Phase 5)

**Chosen option: an additive, opt-in boolean query parameter, `include_all_reviewers`.**

### Why a boolean over a string `scope=`/`reviewer_scope=` parameter

The repository has zero precedent for a string "scope" convention anywhere in `backend/routers/` (§2.9). Every existing optional query parameter on this exact route (`reviewer_member_key`, `reviewed_staff_id`, `date_from`, `date_to`) is a plain, singly-typed `Optional[...] = Query(default=None)`. A `bool` with `default=False` is the smallest, most literal extension of that same pattern — self-documenting, no new enum/string-parsing branch, and FastAPI validates it automatically (non-boolean values become a standard 422, no custom validation code needed, unlike a free-string `scope` value which would need its own allow-list check). Option A (`reviewer_scope=all`) and Option C were considered and rejected only because they introduce a new string-typed concept with no existing convention to anchor it to; Option B's boolean shape most directly matches this file's own established style.

### Contract

```python
include_all_reviewers: bool = Query(default=False)
```

Behavior, added to `list_staff_review_summaries` (`staff_review_summaries.py:217-276`) with **zero changes to any existing branch**:

```python
if include_all_reviewers:
    if reviewed_staff_id is None:
        raise HTTPException(422, "reviewed_staff_id is required when include_all_reviewers=true.")
    if reviewer_member_key is not None:
        raise HTTPException(422, "reviewer_member_key and include_all_reviewers are mutually exclusive.")
    query = db.query(StaffReviewSummary).filter(
        StaffReviewSummary.reviewed_staff_id == reviewed_staff_id,
        StaffReviewSummary.deleted_at.is_(None),
    )
else:
    # existing selected_reviewer logic, byte-for-byte unchanged
    ...
```

- When `include_all_reviewers` is omitted or `false` (its default): **behavior is identical to today, including the omitted-`reviewer_member_key`-defaults-to-self case** — `test_reviewer_member_key_omitted_defaults_to_authenticated_reviewer` continues to pass unmodified.
- When `true`: requires `reviewed_staff_id` (422 otherwise — prevents an unscoped "every reviewer, every employee" scan) and forbids combining with `reviewer_member_key` (422 — the two parameters express mutually exclusive UI states: "All reviewers" vs. "this one reviewer").
- `date_from`/`date_to` filters, soft-delete exclusion, and `ORDER BY meeting_date DESC, created_at DESC` apply identically in both branches — the sort is a global sort, not per-reviewer, so multi-reviewer rows interleave correctly by date.
- A valid Calendar token (`Depends(get_verified_member)`) is still required in all cases — `include_all_reviewers` widens *whose rows* are returned, never *who* may call the route.
- Pagination (`limit`/`offset`, default 50 / max 500) is unchanged and applies to the widened result set the same way it applies today.

### Reviewer display label — additive response field

`StaffReviewSummaryOut` (`schemas.py`) gains one new, purely computed field: `reviewer_display_label: str`, populated in `_to_out()` (`staff_review_summaries.py:164-184`) from the existing backend `MEMBER_LABELS` dict (`config.py:90-102`) — the same registry `calendar_auth.py:134-142` already uses for the `/api/calendar-auth/verify` response. This is additive to the response body only: **no new database column, no frontend duplicate copy of `MEMBER_LABELS`.** Phase 7 (§7 below) depends on this field.

### Backward compatibility

Purely additive: new optional parameter (default preserves old behavior exactly), new optional response field (existing consumers ignore unknown JSON keys). No existing route, schema field, status code, or ordering rule changes. Deleted records remain excluded in both branches. Update/delete ownership rules are untouched — this change only affects `GET` (list).

## 5. Dedicated workspace design (Phase 6)

One workspace, one frontend module instance (`mountReviewSummariesForMember` becomes `mountReviewSummariesWorkspace()` — no `memberKey` parameter; identity comes only from `getStoredMemberKey()` at call time), with these states:

### 5.1 UNAUTHORIZED
- Tab remains visible and clickable (nav item never hidden/disabled).
- Panel shows "Authorize this browser" (reuses the existing access-gate copy/component already built for REQ-CAL-REV-001's `read_only`/`unauthorized` states, `review-summaries.js:198-223`).
- No staff-search request, no history request, no mutation control rendered — mirrors the existing `guardedReadRequest`/`guardedWriteRequest` gating (`:353-391`), now gating the single instance instead of gating a `read_only` cross-tab view.

### 5.2 AUTHORIZED — no employee selected
- Show authenticated reviewer identity ("Authorized as: {MEMBER_LABELS label}" — reuses the existing heading helper, `reviewSummariesHeadingText`/`authorizedAsLabelText`, already present and tested in `review-summaries.js`/`review-summaries.test.mjs`).
- Show staff search (§2.7 logic, now instantiated once).
- Show "Include inactive" toggle.
- Show no history.
- Show an explicit instruction ("Select a staff member to see their review history") — this empty-state copy already exists in the current module (§2 discovery, item 11 of the frontend report) and is reused as-is.

### 5.3 AUTHORIZED — employee selected
- Show selected reviewed employee (name).
- Show reviewer filter, defaulting to **All reviewers** (maps to `include_all_reviewers=true` — §4).
- Show From/To date filters.
- Fetch and show all active summaries for that employee across all reviewers by default.
- Allow creation, always under the current token identity (`POST` body never includes a reviewer field — unchanged, §2.9).
- Show owner controls (Edit/Delete) only on cards where `record.reviewer_member_key === getStoredMemberKey()` — **evaluated per card**, not once per panel (this is the §2.8 redesign).
- Other reviewers' cards render fully but with no Edit/Delete controls.

### 5.4 EDIT MODE
- Enterable only from a card the current token owns.
- Any of: employee change, reviewer-filter change, token change, or navigating away from the tab clears edit state immediately (see §6).

## 6. Queryability / history-card design (Phase 7)

Every card renders, per the requirement's §5.7 exact field list:

```
Reviewed employee: <staff full_name / calling_name — existing live join, StaffReviewSummaryOut.reviewed_staff_full_name / reviewed_staff_calling_name, unchanged>
Reviewed by: <reviewer_display_label> — e.g. "Mayurika — HR"
Meeting date: <meeting_date>
Summary: <summary_text>
Created/updated: <created_at> / <updated_at, when different from created_at>
```

**Reviewer name and role source: `reviewer_display_label`, the new additive backend field (§4), derived from `backend/config.py:90-102` `MEMBER_LABELS`.** This is the single authoritative registry already combining name + role as one string ("Mayurika — HR"). Confirmed by search: no frontend `MEMBER_LABELS`-equivalent exists today — the frontend only ever receives *its own* authenticated member's `displayLabel`, via `/api/calendar-auth/verify` (`calendar/auth.js:129`), never another reviewer's. Building a second, frontend-side copy of the 5-entry label map would duplicate the registry CLAUDE.md and this repo's own conventions warn against; returning the already-computed label from the backend (which already owns and uses this exact map) avoids that duplication entirely. "Reviewer role" is not a separate field from "reviewer name" in this registry — the requirement's "Reviewed by: `<name>` — `<role>`" format is satisfied directly by rendering `reviewer_display_label` as one string, since every existing label already follows that exact `Name — Role` shape.

## 7. State-clearing design (Phase 8)

| Trigger | Cleared | Mechanism |
|---|---|---|
| Employee change | history list, edit state, in-flight history request | New `selectStaff()` call resets `state.selectedStaff`, increments `state.historyRequestId` (existing pattern, `review-summaries.js` state shape §2.5), aborts any pending staff-search fetch |
| Reviewer-filter change | history list, edit/detail state, in-flight request | Re-run the list fetch with the new `reviewer_member_key`/`include_all_reviewers` combination; increment `historyRequestId` so a stale in-flight response is discarded on arrival (see "stale response" row) |
| Date-filter change | history list, in-flight request | Same `historyRequestId` increment pattern |
| Token change | everything — identity, history, edit/draft state, staff selection | Reuses `CALENDAR_AUTH_CHANGED_EVENT` listener (§2.6) → full `clearWorkspaceState()` → re-render from UNAUTHORIZED or re-fetch under the new identity |
| Authorization failure (401 mid-session) | history, edit state; keeps employee selection so re-authorizing resumes the same view | Reuses existing `handleUnauthorizedResponse()` (clears stored token, re-renders "Authorized as" indicator) |
| Leaving the dedicated tab | edit state, unsaved draft, in-flight requests aborted | Single instance now exists only inside one panel; `navigation.js:34`'s `msc:close-toolbar-popovers` event (fired on every panel switch) is repurposed as the "leaving" signal instead of its old REQ-CAL-REV-001 role as a cross-tab "member changed" proxy (§2.6) — same event, new, simpler meaning now that there is only one instance |
| Switching view ↔ edit | the other mode's transient form state | Edit form is prefilled fresh from the specific card's data on entry; exiting edit (Cancel, or any of the triggers above) discards unsaved edits, never silently merges into view state |
| Stale in-flight response | discarded, never rendered | Every fetch carries the `historyRequestId` value current at fire time; on resolution, compare to `state.historyRequestId` — mismatch means a newer request has since superseded it, so the response is dropped (existing pattern already present in `state.historyRequestId`, §2.5 — reused, not new) |

**Invariants required by the requirement (§8, decisions 30–31 area / Phase 8 "Required"):** no history from a previous employee remains visible after a change; no edit state leaks across an employee change; no unsaved draft is restored under a different token; stale requests cannot overwrite current state. All four are satisfied by the mechanisms above, all of which reuse existing patterns already present in `review-summaries.js` rather than introducing new state-management primitives.

## 8. Authorization matrix

| Identity | View tab (unauth) | Select employee / view history | Create | Edit own | Delete own | Edit/Delete other's record |
|---|---|---|---|---|---|---|
| No token | Tab visible, "Authorize this browser" shown | Blocked | Blocked | Blocked | Blocked | Blocked |
| Invalid/expired token | Same as no token (401 on any request) | Blocked | Blocked | Blocked | Blocked | Blocked |
| Valid token, any of the 5 members | N/A (already authorized) | Allowed — all reviewers' active summaries for the selected employee | Allowed, under own identity only | Allowed, only on own records | Allowed, only on own records | **404**, never 403 (non-disclosing, unchanged backend rule §2.9) |

This matches the existing backend authorization matrix from REQ-CAL-REV-001 exactly (§8/§11 of the 2026-08-03 design) — this design changes *only* the frontend surface (1 tab instead of 5) and *only* the read scope default (all reviewers instead of self), never the write-ownership rules.

## 9. Files likely to change

| File | Change |
|---|---|
| `web-view/index.html` | Sidebar heading Data→Staff, Staff Data→Data label, new Review Summaries nav button + panel; remove 5 embedded mounts, add 1 |
| `web-view/js/review-summaries.js` | Single-instance mount (`memberKey` param removed from the mount function), per-card ownership check replacing per-panel `reviewSummaryAccessDecision`, reviewer filter + "All reviewers" default wiring, `reviewer_display_label` rendering, state-clearing triggers (§7) |
| `web-view/js/app.js` | `initReviewSummaries()` call site updated for single-mount signature (loop over `.review-summaries-instance` becomes a single call, or the one remaining container is queried directly) |
| `web-view/js/config.js` | No change expected — `STAFF_REVIEW_SUMMARIES_API_BASE` (if already added by REQ-CAL-REV-001) is reused as-is |
| `web-view/css/review-summaries.css` (or wherever REQ-CAL-REV-001 placed it) | Layout adjustments for a full dedicated panel vs. an embedded card; reviewer-filter and "All reviewers" control styling |
| `backend/routers/staff_review_summaries.py` | Add `include_all_reviewers` query param + branch (§4); add `reviewer_display_label` to `_to_out()` |
| `backend/schemas.py` | Add `reviewer_display_label: str` to `StaffReviewSummaryOut` |
| `backend/tests/test_staff_review_summaries.py` | New tests for `include_all_reviewers` (§11); existing tests unmodified |
| `web-view/js/review-summaries.test.mjs` / `review-summaries-test-dom.mjs` | Rewrite the multi-instance/cross-member-panel test cases (e.g. "suman token, viewing mayurika's panel") that encoded the old 5-mount model; add single-workspace, all-reviewers, and per-card-ownership cases |
| `web-view/js/navigation.js` | Likely unchanged — auto-wires new nav button/panel via existing `querySelectorAll` (§3.1); verify only |

## 10. Files not to change

- `member-aios/mayurika-hr/staff-data/` — protected path, never opened.
- `management_aios.staff_review_summaries` schema/migrations — no column added, no migration file created.
- `management_aios.staff_dashboard_records` — untouched; `id` continues as the reviewed-staff identifier.
- `backend/routers/calendar_auth.py` — token verification and `MEMBER_LABELS` sourcing are reused as-is, not modified.
- `backend/config.py` — `MEMBER_LABELS`/`VALID_MEMBER_KEYS` are read, not edited.
- Existing UPDATE/DELETE ownership logic (`_get_owned_summary_or_404`) — unchanged.
- Existing single-reviewer LIST default behavior when `include_all_reviewers` is omitted — unchanged (§4).

**Consolidation removal candidates** (code to delete once 5 mounts become 1, confirmed safe by discovery): 4 of the 5 `<h3>Review Summaries</h3>` + `.review-summaries-instance` blocks in `index.html`; the `querySelectorAll` mount loop collapses to a single mount call; the per-panel `reviewSummaryAccessDecision`'s `read_only`-by-tab branch (superseded by per-card ownership, §5.3); the `msc:close-toolbar-popovers` listener's old "member changed" role (repurposed, not deleted, §7).

## 11. Test plan (Phase 9) — 40 numbered binary tests

### Navigation (5)
1. Sidebar heading reads "Staff".
2. Staff Data label reads "Data".
3. Review Summaries appears immediately after Data in the sidebar.
4. Exactly one Review Summaries navigation item exists in the DOM.
5. Zero Review Summary mounts remain inside the 5 member panels.

### Authorization (5)
6. Tab is visible and clickable without a token.
7. No-token state shows "Authorize this browser".
8. A valid token identifies the creator on a new record.
9. A create request cannot select reviewer ownership (body-supplied `reviewer_member_key` is ignored/rejected).
10. A missing or invalid token cannot read or mutate any record.

### Employee and filters (8)
11. Nothing loads before an employee is selected.
12. Staff search selects `reviewed_staff_id` correctly.
13. "Include inactive" behavior is preserved.
14. Reviewer filter defaults to "All reviewers" on employee selection.
15. `include_all_reviewers=true` returns records from multiple reviewers for one employee.
16. A specific reviewer filter narrows results to that reviewer only.
17. From/To date filters work together and with the reviewer filter.
18. Soft-deleted records remain hidden in every filter combination.

### Ownership (7)
19. Owner may create a record.
20. Owner may edit their own record.
21. Owner may delete their own record.
22. A non-owner reviewer may read another reviewer's active record.
23. A non-owner reviewer sees no Edit/Delete control on that record.
24. A cross-reviewer `PUT` returns 404.
25. A cross-reviewer `DELETE` returns 404.

### Display (4)
26. Each card shows the reviewed employee.
27. Each card shows the reviewer (`reviewer_display_label`).
28. Each card shows the reviewer's role (embedded in `reviewer_display_label`, e.g. "— HR").
29. Each card shows the meeting date.

### State (4)
30. Employee change clears history, edit state, and any draft.
31. Reviewer-filter change clears stale detail/edit state.
32. Token change recalculates ownership on every visible card.
33. A stale in-flight response (superseded by a newer request) is ignored, never rendered.

### Regression (7)
34. Data tab still opens and functions.
35. All 5 member panels still work correctly with Review Summaries removed.
36. Tasks continue to work.
37. Leave continues to work.
38. Calendar navigation continues to work.
39. Existing pre-migration records remain queryable and unchanged.
40. No schema or migration change occurred.

**Total: 40 — meets or exceeds the required minimum of 30 (per the REQ-CAL-REV-001 precedent of a ≥30 threshold).**

### Regression suites to re-run (not new tests)
- Backend: `test_calendar_auth.py`, `test_calendar_mutation_authorization.py`, `test_member_leave.py`, `test_staff_review_summaries.py` (existing 31 cases — must remain green unmodified except the new `include_all_reviewers` additions).
- Frontend: `web-view/js/calendar/*.test.mjs`, `review-summaries.test.mjs` (rewritten per §9).

## 12. Known limitations

1. No live browser walkthrough was performed in this design session (no browser automation tool available in this environment), consistent with prior Calendar-auth work in this repo.
2. The exact DOM/CSS structure of the new dedicated panel (card layout, filter bar composition) is described functionally (§5–§7) but not pixel-specified — implementation retains normal front-end layout discretion within the stated functional requirements.
3. `review-summaries.test.mjs`'s existing multi-instance/cross-member test cases require rewriting, not just extension — flagged explicitly in §9 so this isn't discovered mid-implementation as unplanned scope.
4. This design was produced without a live database connection (none was needed — no schema change is proposed) and without re-running the existing test suite (no code was changed this session).

## 13. Approval / status

**Status: READY FOR IMPLEMENTATION.**

### Numeric pass/fail rule

This design PASSES readiness for the next phase if and only if:
- 0 unresolved contradictions between this design and REQ-CAL-REV-TAB-002's 31 approved decisions (validation doc confirms this);
- the all-reviewers API change is additive and the one identified existing test governing default LIST behavior remains unaffected (§4 confirms — new branch only, old branch untouched);
- the authorization matrix has 0 blank cells (§8 confirms 6 columns × 3 identity rows, fully filled);
- the proposed test count is ≥ 30 (§11 confirms 40);
- 0 application code, migration, or database files were touched producing this design (confirmed);
- the protected path was never opened (confirmed).

All six conditions are met.

## 14. One next step

Route this design to the relevant Management Team member(s)/domain owner(s) for review per CLAUDE.md §18 (this crosses HR/Mayurika, Recruitment/Suman, and Implementation/Arun tab surfaces, plus the Admin Manager/Rajiv and Auditor/Paraparan tabs whose embedded mounts are being removed) before any implementation branch is opened.

---
name: calendar-review-summaries-dedicated-tab-technical-design
type: technical-design-document
created: 2026-08-06
created-by: Mareenraj (builder)
status: READY FOR IMPLEMENTATION — no open business parameters; one open technical follow-up (see §12)
requirement-id: REQ-CAL-REV-TAB-002
---

# Technical Design — Management AIOS Calendar Review Summaries Dedicated Tab (2026-08-06)

> **Correction (2026-08-06, same-day, round 1):** The original version of this document stated "4 of 5 mounts removed" and described placing the new panel "near the removed Mayurika mount," which was ambiguous and could be read as reusing Mayurika's existing panel as the dedicated panel. It does not. This corrected version states explicitly: **all 5 existing member-panel mounts are removed (final embedded count: 0)**, and the dedicated panel is a **new, independent panel (final dedicated count: 1)** with its own panel ID, sidebar nav item, and activation path — never nested inside, parented by, or derived from Mayurika's (or any other member's) panel. See §1, §3.1, §5, §9, §10, §11 for the corrected text.
>
> **Correction (2026-08-06, same-day, round 2):** The round-1 correction's `reviewer_display_label` proposal (one opaque combined string) did not guarantee a visible reviewer role, since `MEMBER_LABELS["paraparan"]` has no role suffix. This round replaces `reviewer_display_label` entirely: the design now resolves reviewer display name and role client-side from the existing `reviewer_member_key` field via a small frontend Management Team registry, rendered as two separate visible fields ("Reviewed by" / "Reviewer role"). No backend schema change is needed for this. See §1, §4, §6, §9, §10, §11 for the corrected text. The mandatory five-person sign-off gate in the original §14/validation "next step" is also corrected — see §14.

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

The existing Staff Review Summaries feature (REQ-CAL-REV-001) is a working, tested slice: one backend router (`backend/routers/staff_review_summaries.py`), one table (`management_aios.staff_review_summaries`), and one frontend module (`web-view/js/review-summaries.js`) mounted 5 times. This design does **not** rebuild that slice — it (a) **removes all 5 existing frontend mounts completely (including Mayurika's) and creates exactly 1 new, independent dedicated-panel mount** — final embedded-mount count: 0; final dedicated-mount count: 1; total: 1 — (b) redefines "reviewer identity" in the UI from "which tab you're in" to "who the token says you are, and only the token," (c) adds one small, additive, opt-in backend read parameter so the dedicated tab can show all reviewers' summaries for one employee by default, and (d) resolves each history card's reviewer display name and role **client-side**, from the already-returned `reviewer_member_key` field, via a small new frontend Management Team registry — no backend schema change, no new database column, and no reviewer identity duplicated into `staff_review_summaries` (§6).

No table, migration, or existing route contract changes. No existing test's asserted behavior changes. **The dedicated panel does not reuse, repurpose, or inherit any part of Mayurika's (or any other member's) existing panel — it is a new sibling panel with its own DOM parent, own panel ID, own sidebar nav item, and own activation path (§3.1, §5).**

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

**All 5 of these mounts are removed by this design — Mayurika's included.** None is reused, repurposed, or kept as the DOM parent of the dedicated panel. See §5 and §9/§10 for the corrected removal and creation design.

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
- A new panel `<div class="tab-panel" id="tab-review-summaries" role="tabpanel">…</div>` is added once to `<main class="tab-main">`, as an **independent sibling** of the other `.tab-panel` elements (`#tab-mayurika-hr`, `#tab-suman-recruitment`, `#tab-arun-implementation`, `#tab-rajiv-blocked`, `#tab-paraparan`, `#tab-staff-data`) — it has **no DOM-parent relationship to, and does not nest inside, any of those panels, including `#tab-mayurika-hr`**. DOM order relative to other panels does not matter (`navigation.js` matches strictly by `id`/`data-tab`, not position); it may be placed anywhere convenient inside `<main class="tab-main">` (e.g. immediately after `#tab-staff-data`, mirroring the sidebar order), but its physical location carries no functional meaning and does not imply reuse of any removed mount's location.
- Required order (Data, then Review Summaries) is satisfied by source order of the two `<button>` elements inside the same `.app-sidebar-group` — `navigation.js` does not reorder buttons.

### 3.1a Dedicated panel specification (corrects §B ambiguity)

| Property | Value |
|---|---|
| Panel ID | `#tab-review-summaries` (new, not `#tab-mayurika-hr`) |
| Sidebar nav item | New `<button data-tab="review-summaries">`, immediately after the Data button (§3.1) |
| Activation path | Generic `navigation.js:19-28` `activatePanel('review-summaries')` — the same shared mechanism every other tab already uses; no special-cased routing |
| Dependency on selected member tab | None — the panel activates and renders identically regardless of which (or whether any) member tab was previously active |
| Review Summary mounts inside this panel | Exactly 1 |

**Expected mount count after implementation:**

| Location | Mount count |
|---|---|
| Mayurika panel (`#tab-mayurika-hr`) | 0 |
| Suman panel (`#tab-suman-recruitment`) | 0 |
| Arun panel (`#tab-arun-implementation`) | 0 |
| Rajiv panel (`#tab-rajiv-blocked`) | 0 |
| Paraparan panel (`#tab-paraparan`) | 0 |
| **Dedicated panel (`#tab-review-summaries`)** | **1** |
| **Total** | **1** |

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

### Reviewer display field — reassessed and dropped (corrects round-1 §G ambiguity)

Round 1 proposed an additive `reviewer_display_label: str` field on `StaffReviewSummaryOut`. **This round drops that proposal.** `StaffReviewSummaryOut` already returns `reviewer_member_key` unchanged (`_to_out()`, `staff_review_summaries.py:164-184`, confirmed present since REQ-CAL-REV-001) — that key alone is sufficient for the client to resolve a display name and role via the frontend registry defined in §6. **No backend schema or response-field change is required for reviewer identity display at all** — the only backend change this design still requires is `include_all_reviewers` (above). This is a strict reduction in implementation surface versus round 1, made possible because name/role resolution moved entirely to the client (§6).

### Backward compatibility

Purely additive: new optional parameter (default preserves old behavior exactly), new optional response field (existing consumers ignore unknown JSON keys). No existing route, schema field, status code, or ordering rule changes. Deleted records remain excluded in both branches. Update/delete ownership rules are untouched — this change only affects `GET` (list).

## 5. Dedicated workspace design (Phase 6)

One workspace, one frontend module instance (`mountReviewSummariesForMember` becomes `mountReviewSummariesWorkspace()` — no `memberKey` parameter; identity comes only from `getStoredMemberKey()` at call time), mounted exactly once inside the new, independent `#tab-review-summaries` panel (§3.1a) — never inside `#tab-mayurika-hr` or any other member panel.

### 5.0 Reviewer identity — source of truth (corrects §C ambiguity)

The current reviewer is derived **only** from `getStoredMemberKey()` — the validated Calendar token held in the browser. It is explicitly **not** derived from, and must never be derived from:

- the Mayurika panel (or its former mount);
- any other member panel;
- the selected reviewer filter (that filter narrows what is *displayed*, it never supplies who is *creating*);
- the selected employee (`reviewed_staff_id` identifies who was reviewed, never who is reviewing);
- the browser request body (unchanged existing backend rule, §2.9 — `StaffReviewSummaryCreate` has no `reviewer_member_key` field at all).

This is the single identity source for every state below.

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
- **No history/list request fires in this state under any circumstance (corrects §D ambiguity)** — the fetch is gated entirely on `state.selectedStaff` being set; there is no code path that issues `GET /api/staff-review-summaries` before an employee is selected.

### 5.3 AUTHORIZED — employee selected
- Show selected reviewed employee (name); `reviewed_staff_id = staff.id` from the staff-search result (§2.7, unchanged).
- Show reviewer filter, defaulting to **All reviewers**.
- Show From/To date filters.
- Allow creation, always under the current token identity (`POST` body never includes a reviewer field — unchanged, §2.9).
- Show owner controls (Edit/Delete) only on cards where `record.reviewer_member_key === getStoredMemberKey()` — **evaluated per card**, not once per panel (this is the §2.8 redesign).
- Other reviewers' cards render fully but with no Edit/Delete controls.

**Default scope — "All reviewers" (corrects §E ambiguity):**
- Frontend request: `GET /api/staff-review-summaries?reviewed_staff_id=<uuid>&include_all_reviewers=true` (`reviewer_member_key` omitted).
- `reviewed_staff_id` is always required for this request — enforced both by the UI (no request fires without a selection, §5.2) and by the backend 422 rule (§4).
- Returns active summaries from every reviewer for that employee (soft-deleted rows excluded, per §4/§2.9, unchanged).

**Specific reviewer filter (corrects §F ambiguity):**
- Frontend request: `GET /api/staff-review-summaries?reviewed_staff_id=<uuid>&reviewer_member_key=<selected reviewer>` — `include_all_reviewers` is **not** also sent (the backend rejects the combination with 422, §4; the frontend never constructs a request that sends both).
- Narrows the returned rows to that one reviewer's active summaries for the selected employee.
- Ownership/edit-ability of each returned card is unaffected by which filter produced it — every card's Edit/Delete visibility is still decided solely by comparing that card's own `reviewer_member_key` to `getStoredMemberKey()` (§2.8, §5.0); a specific-reviewer filter does not itself grant write access to that reviewer's records.

### 5.4 EDIT MODE
- Enterable only from a card the current token owns.
- Any of: employee change, reviewer-filter change, token change, or navigating away from the tab clears edit state immediately (see §6).

## 6. Queryability / history-card design (Phase 7) — corrected reviewer identity design (round 2)

Every card renders, per the requirement's §5.7 exact field list, as **separate visible fields, not one combined string**:

```
Reviewed employee: <staff full_name / calling_name — existing live join, StaffReviewSummaryOut.reviewed_staff_full_name / reviewed_staff_calling_name, unchanged>
Reviewed by: <reviewer display name>
Reviewer role: <reviewer role>
Meeting date: <meeting_date>
Summary: <summary_text>
Created/updated: <created_at> / <updated_at, when different from created_at>
```

### 6.1 Evidence: no single existing "member registry" object exists today

Repository search (this session) confirms role/name text for the 5 Management Team members is currently **scattered across 3 independent, mutually-inconsistent locations**, none of which is a reusable JS object:

| Location | Form | Mayurika | Suman | Arun | Rajiv | Paraparan |
|---|---|---|---|---|---|---|
| `backend/config.py:90-102` `MEMBER_LABELS` | one combined string per key, used by `/api/calendar-auth/verify` (the "token UI") | `"Mayurika — HR"` | `"Suman — Recruiting Officer"` | `"Arun — Implementation Officer"` | `"Rajiv — Admin Manager"` | `"Paraparan"` (**no role**) |
| `web-view/index.html` sidebar nav (`app-nav-btn-label`/`app-nav-btn-sub`, lines ~156-203) | separate short name/role spans, raw HTML | `Mayurika` / `HR` | `Suman` / `Recruitment` | `Arun` / `Implementation` | `Rajiv` / `Admin` | `Paraparan` / `Auditor` |
| `web-view/index.html` member-tab headers (e.g. `:1663`) | combined `<h2>Name — Role</h2>`, raw HTML | — | — | — | — | `Paraparan — Auditor` (`index.html:1663`, comment at `:1656`: *"Role displayed as 'Auditor' per the confirmed task requirement"*) |

No JS constant or module anywhere in `web-view/js/**` currently unifies these into `{displayName, role}` pairs (confirmed by search for `MEMBER_LABELS`/`MEMBER_ROLES`/`memberRegistry`-style identifiers — none found outside a code comment in `calendar/auth.js:129` referencing the *backend's* map).

### 6.2 Chosen registry and role resolution

**A new, small frontend module (e.g. `web-view/js/member-registry.js`) is introduced, containing only values that already exist verbatim elsewhere in this repository — no new or invented data:**

```js
export const MEMBER_REGISTRY = {
  mayurika:  { displayName: "Mayurika",  role: "HR" },
  suman:     { displayName: "Suman",     role: "Recruiting Officer" },
  arun:      { displayName: "Arun",      role: "Implementation Officer" },
  rajiv:     { displayName: "Rajiv",     role: "Admin Manager" },
  paraparan: { displayName: "Paraparan", role: "Auditor" },
};
```

- `displayName` for all 5, and `role` for Mayurika/Suman/Arun/Rajiv, are taken directly from splitting `backend/config.py:90-102` `MEMBER_LABELS[key]` on `" — "` — the same values already surfaced to users today via `/api/calendar-auth/verify`'s `displayLabel` (the existing "token UI").
- **Paraparan's `role: "Auditor"` is a deliberate exception**, per this task's explicit instruction to use the approved "Auditor" terminology. It is sourced from `web-view/index.html`'s own sidebar nav sub-label (`Auditor`, line ~203) and member-tab header (`Paraparan — Auditor`, `:1663`, itself flagged in-repo as "per the confirmed task requirement," `:1656`) — **not fabricated**, since this exact value already appears twice in the current codebase. `backend/config.py:90-102`'s `MEMBER_LABELS["paraparan"] = "Paraparan"` remains unchanged and still carries no role, because the underlying designation dispute (External Auditor vs. Accountant, `config.py:95-98`) is a separate, still-open HR/source-register question — this frontend registry entry is a **display-terminology decision**, not a resolution of that open dispute, and does not touch `config.py`.
- **This is a documented registry-data gap, not silently patched over**: `backend/config.py`'s `MEMBER_LABELS` is inconsistent with the frontend's own established "Auditor" terminology for Paraparan. This gap is flagged here as a legitimate follow-up (harmonize `config.py:101` to `"Paraparan — Auditor"`, or an equivalent fix) — out of scope for this design, since this task forbids modifying application code.
- **Unknown-key fallback**: if `record.reviewer_member_key` is ever not one of the 5 keys in `MEMBER_REGISTRY` (a defensive case — not reachable today since `VALID_MEMBER_KEYS` is fixed at exactly these 5, but guards against future data drift), the UI renders `displayName = "Unknown"` and `role = "Unknown"` — never a fabricated or guessed value, and never a thrown error.

### 6.3 Why not a backend field (§4 reassessment)

No repository evidence supports adding a backend display field: `reviewer_member_key` is already returned on every record (unchanged since REQ-CAL-REV-001), and the client already needs a local registry regardless (because the "Auditor" terminology decision for Paraparan is a frontend-only fact not present in `backend/config.py`, §6.2). Adding a redundant backend field would either (a) duplicate the same data the client already resolves itself, or (b) require the backend to also special-case Paraparan's role — spreading one small decision across two layers instead of one. The minimal design keeps `reviewer_member_key` as the only identity data the API returns, and resolves display purely client-side.

### 6.4 No database duplication

Reviewer display name and role are never written to `management_aios.staff_review_summaries` or any other table — `MEMBER_REGISTRY` is a static, in-memory frontend constant, resolved at render time from `reviewer_member_key`, exactly as `reviewed_staff_full_name`/`reviewed_staff_calling_name` are resolved at request time via the existing live join to `staff_dashboard_records` (§2.9, unchanged) rather than stored redundantly.

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
| `web-view/index.html` | Sidebar heading Data→Staff, Staff Data→Data label, new Review Summaries nav button + panel; **remove all 5 embedded mounts (Mayurika, Suman, Arun, Rajiv, Paraparan — 0 remaining), add exactly 1 new, independent `#tab-review-summaries` panel that does not reuse `#tab-mayurika-hr` or any other existing panel** (§3.1a) |
| `web-view/js/review-summaries.js` | Single-instance mount (`memberKey` param removed from the mount function), per-card ownership check replacing per-panel `reviewSummaryAccessDecision`, reviewer filter + "All reviewers" default wiring, reviewer name/role rendering via `MEMBER_REGISTRY` (§6, resolved from `record.reviewer_member_key`), state-clearing triggers (§7) |
| `web-view/js/member-registry.js` (**new**) | New small module exporting `MEMBER_REGISTRY` (§6.2) — display name + role per member key, values sourced from existing `backend/config.py` `MEMBER_LABELS` and existing `index.html` sidebar/tab-header text, not invented |
| `web-view/js/app.js` | `initReviewSummaries()` call site updated for single-mount signature (loop over `.review-summaries-instance` becomes a single call, or the one remaining container is queried directly) |
| `web-view/js/config.js` | No change expected — `STAFF_REVIEW_SUMMARIES_API_BASE` (if already added by REQ-CAL-REV-001) is reused as-is |
| `web-view/css/review-summaries.css` (or wherever REQ-CAL-REV-001 placed it) | Layout adjustments for a full dedicated panel vs. an embedded card; reviewer-filter and "All reviewers" control styling; two-line "Reviewed by" / "Reviewer role" card fields |
| `backend/routers/staff_review_summaries.py` | Add `include_all_reviewers` query param + branch only (§4) — **no `_to_out()` change** (§4 reassessment, §6.3) |
| `backend/tests/test_staff_review_summaries.py` | New tests for `include_all_reviewers` (§11); existing tests unmodified |
| `web-view/js/review-summaries.test.mjs` / `review-summaries-test-dom.mjs` | Rewrite the multi-instance/cross-member-panel test cases (e.g. "suman token, viewing mayurika's panel") that encoded the old 5-mount model; add single-workspace, all-reviewers, per-card-ownership, and `MEMBER_REGISTRY` resolution cases |
| `web-view/js/navigation.js` | Likely unchanged — auto-wires new nav button/panel via existing `querySelectorAll` (§3.1); verify only |

## 10. Files not to change

- `member-aios/mayurika-hr/staff-data/` — protected path, never opened.
- `management_aios.staff_review_summaries` schema/migrations — no column added, no migration file created.
- `management_aios.staff_dashboard_records` — untouched; `id` continues as the reviewed-staff identifier.
- `backend/routers/calendar_auth.py` — token verification and `MEMBER_LABELS` sourcing are reused as-is, not modified.
- `backend/config.py` — `MEMBER_LABELS`/`VALID_MEMBER_KEYS` are read, not edited. (The Paraparan-role harmonization noted in §6.2 is a documented follow-up, explicitly out of scope here.)
- `backend/schemas.py` — **no change** (round-1's proposed `reviewer_display_label` field is dropped, §4/§6.3); `StaffReviewSummaryOut` is unmodified.
- Existing UPDATE/DELETE ownership logic (`_get_owned_summary_or_404`) — unchanged.
- Existing single-reviewer LIST default behavior when `include_all_reviewers` is omitted — unchanged (§4).
- No reviewer display name/role column is added to `management_aios.staff_review_summaries` or any other table (§6.4).

**Removal list (corrects §A/§B ambiguity — "4 of 5" was wrong; it is all 5):** **all 5** `<h3>Review Summaries</h3>` + `.review-summaries-instance` blocks in `index.html` are deleted, **including Mayurika's** — no member panel keeps an embedded mount, and no member panel's existing mount location, container, or identity is reused as the dedicated panel. The `querySelectorAll` mount loop collapses to a single mount call targeting the new, independent `#tab-review-summaries` panel (§3.1a) created fresh for this feature. Also removed/superseded: the per-panel `reviewSummaryAccessDecision`'s `read_only`-by-tab branch (superseded by per-card ownership, §5.3); the `msc:close-toolbar-popovers` listener's old "member changed" role (repurposed, not deleted, §7).

**Final mount count (repeated from §3.1a for emphasis): member-panel mounts = 0; dedicated-panel mounts = 1; total = 1.**

## 11. Test plan (Phase 9) — 48 numbered binary tests (corrects §I ambiguity)

The original 40-test plan collapsed all 5 mount-removals into a single test and did not explicitly test dedicated-panel independence or token-driven reviewer recalculation as standalone items. This revision expands those into the 18 explicitly required test items (mapped in the table after §11's Regression list) and folds them into a fuller 48-test plan without removing any prior coverage.

### Navigation and mount removal / independence (12)
1. Zero Review Summary mounts remain in the Mayurika panel.
2. Zero Review Summary mounts remain in the Suman panel.
3. Zero Review Summary mounts remain in the Arun panel.
4. Zero Review Summary mounts remain in the Rajiv panel.
5. Zero Review Summary mounts remain in the Paraparan panel.
6. Exactly one dedicated Review Summary mount exists (inside `#tab-review-summaries`).
7. Sidebar heading reads "Staff".
8. Staff Data label reads "Data".
9. Review Summaries appears immediately after Data in the sidebar.
10. Exactly one Review Summaries navigation item exists in the DOM.
11. The dedicated panel activates independently from member panels — its `data-tab`/panel id pairing (`review-summaries` / `#tab-review-summaries`) is not nested inside, and does not depend on, any member panel's DOM subtree or activation state.
12. Switching between member panels does not change the dedicated workspace's reviewer identity, selected employee, or filter state (the workspace's state is untouched by unrelated panel activations).

### Authorization (6)
13. Tab is visible and clickable without a token.
14. No-token state shows "Authorize this browser".
15. A valid token identifies the creator on a new record.
16. A create request cannot select reviewer ownership (body-supplied `reviewer_member_key` is ignored/rejected).
17. A missing or invalid token cannot read or mutate any record.
18. A token change (different member authorizes in the same browser) changes the authenticated reviewer identity used for ownership checks and new-record creation.

### Employee and filters (8)
19. No history/list request fires before an employee is selected.
20. Staff search selects `reviewed_staff_id` correctly.
21. "Include inactive" behavior is preserved.
22. Reviewer filter defaults to "All reviewers" on employee selection.
23. `include_all_reviewers=true` (with `reviewer_member_key` omitted) returns records from multiple reviewers for one employee.
24. A specific reviewer filter (`reviewer_member_key=<x>`, `include_all_reviewers` not sent) narrows results to that reviewer only.
25. From/To date filters work together and with the reviewer filter.
26. Soft-deleted records remain hidden in every filter combination.

### Ownership (7)
27. Owner may create a record.
28. Owner may edit their own record.
29. Owner may delete their own record.
30. A non-owner reviewer may read another reviewer's active record.
31. Owner controls (Edit/Delete) appear only on records owned by the authenticated reviewer — never on another reviewer's record, regardless of which filter surfaced it.
32. A cross-reviewer `PUT` returns 404.
33. A cross-reviewer `DELETE` returns 404.

### Display and reviewer identity resolution (8 — expanded, corrects round-1 Phase G test gap)
34. Each card shows the reviewed employee.
35. Each card shows the reviewer display name, as its own visible field.
36. Each card shows the reviewer role, as its own visible field — never embedded inside a combined string.
37. Each card shows the meeting date.
38. Reviewer display name and role resolve from `record.reviewer_member_key` via `MEMBER_REGISTRY` (§6.2) — not from any backend response field added for this purpose.
39. Paraparan's card resolves to role "Auditor", sourced from `MEMBER_REGISTRY` (§6.2).
40. An unrecognized `reviewer_member_key` (not one of the 5 known keys) renders `displayName = "Unknown"` and `role = "Unknown"` — never a fabricated value, never a thrown error.
41. No reviewer display name or role is present in `management_aios.staff_review_summaries` or any other table (confirms §6.4 and §10 — no migration, no new column).

### State (4)
42. Employee change clears history, edit state, and any draft.
43. Reviewer-filter change clears stale detail/edit state.
44. Token change recalculates ownership on every visible card.
45. A stale in-flight response (superseded by a newer request) is ignored, never rendered.

### Regression (7)
46. Data tab still opens and functions.
47. All 5 member panels remain usable after mount removal.
48. Tasks continue to work.
49. Leave continues to work.
50. Calendar navigation continues to work.
51. Existing pre-migration records remain queryable and unchanged.
52. No schema or migration change occurred.

**Total: 52 — meets or exceeds the required minimum of 30, and explicitly includes all 18 mount/independence test items from the prior correction round plus all 10 reviewer-identity test items from this round:**

| Required item (prior correction round — mount/independence) | Satisfied by test # |
|---|---|
| 1. Zero mounts — Mayurika | 1 |
| 2. Zero mounts — Suman | 2 |
| 3. Zero mounts — Arun | 3 |
| 4. Zero mounts — Rajiv | 4 |
| 5. Zero mounts — Paraparan | 5 |
| 6. Exactly one dedicated mount | 6 |
| 7. Dedicated panel activates independently | 11 |
| 8. Switching member panels doesn't change dedicated workspace reviewer | 12 |
| 9. Token change changes authenticated reviewer | 18 |
| 10. Employee selection controls `reviewed_staff_id` | 20 |
| 11. No history request before employee selection | 19 |
| 12. All-reviewer default works after employee selection | 23 |
| 13. Specific reviewer filter works | 24 |
| 14. Each card shows employee, reviewer, reviewer role | 34, 35, 36 |
| 15. Owner controls appear only on owned records | 31 |
| 16. Existing member tabs remain usable after mount removal | 47 |
| 17. Data tab still opens | 46 |
| 18. No schema or migration change | 52 |

| Required item (this correction round — reviewer role display) | Satisfied by test # |
|---|---|
| 1. Every history card shows reviewed employee | 34 |
| 2. Every history card shows reviewer display name | 35 |
| 3. Every history card shows reviewer role | 36 |
| 4. Reviewer display name and role resolve from `reviewer_member_key` | 38 |
| 5. Paraparan resolves to the approved Auditor role | 39 |
| 6. Unknown reviewer keys do not fabricate a name or role | 40 |
| 7. No reviewer display identity is stored in the database | 41 |
| 8. All-reviewer and specific-reviewer filters still work | 23, 24 |
| 9. Owner-only update/delete remains unchanged | 27, 28, 29, 32, 33 |
| 10. Zero member-panel mounts and one dedicated mount remain required | 1, 2, 3, 4, 5, 6 |

### Regression suites to re-run (not new tests)
- Backend: `test_calendar_auth.py`, `test_calendar_mutation_authorization.py`, `test_member_leave.py`, `test_staff_review_summaries.py` (existing 31 cases — must remain green unmodified except the new `include_all_reviewers` additions).
- Frontend: `web-view/js/calendar/*.test.mjs`, `review-summaries.test.mjs` (rewritten per §9).

## 12. Known limitations

1. No live browser walkthrough was performed in this design session (no browser automation tool available in this environment), consistent with prior Calendar-auth work in this repo.
2. The exact DOM/CSS structure of the new dedicated panel (card layout, filter bar composition) is described functionally (§5–§7) but not pixel-specified — implementation retains normal front-end layout discretion within the stated functional requirements.
3. `review-summaries.test.mjs`'s existing multi-instance/cross-member test cases require rewriting, not just extension — flagged explicitly in §9 so this isn't discovered mid-implementation as unplanned scope.
4. This design was produced without a live database connection (none was needed — no schema change is proposed) and without re-running the existing test suite (no code was changed this session).
5. **Registry-data gap (§6.2)**: `backend/config.py:101` `MEMBER_LABELS["paraparan"]` still carries no role, while the frontend's new `MEMBER_REGISTRY` (§6.2) and this repo's own existing sidebar/tab-header markup both already use "Auditor." This is a pre-existing inconsistency this design documents but does not fix (fixing it is a `backend/config.py` edit, out of scope — no application code was modified producing this design).

## 13. Approval / status

**Status: READY FOR IMPLEMENTATION.**

### Numeric pass/fail rule

This design PASSES readiness for the next phase if and only if:
- 0 unresolved contradictions between this design and REQ-CAL-REV-TAB-002's 31 approved decisions (validation doc confirms this);
- the all-reviewers API change is additive and the one identified existing test governing default LIST behavior remains unaffected (§4 confirms — new branch only, old branch untouched);
- the authorization matrix has 0 blank cells (§8 confirms 6 columns × 3 identity rows, fully filled);
- the proposed test count is ≥ 30 (§11 confirms 52);
- 0 application code, migration, or database files were touched producing this design (confirmed);
- the protected path was never opened (confirmed);
- the final mount counts are stated explicitly and unambiguously, with 0 implication that any member panel's mount is reused or repurposed as the dedicated panel (§3.1a/§9/§10 confirm: member-panel mounts = 0, dedicated-panel mounts = 1, total = 1);
- reviewer display name and reviewer role are guaranteed as two separate, always-populated visible fields for all 5 members (including Paraparan), resolved client-side with 0 database duplication and 0 fabricated values (§6 confirms).

All eight conditions are met.

## 14. Review gate and next step (corrected, round 2 — Phase 5)

**Review-gate correction:** the prior wording implying a mandatory five-person Management Team sign-off gate before implementation is replaced with the following, so this is not read as inventing a Mayurika-only or five-person approval requirement:

- **Business requirement approval**: completed — by the repository owner/user (this session's REQ-CAL-REV-TAB-002 approval and its two correction rounds).
- **Technical review**: required for the API (`include_all_reviewers`) and navigation (sidebar/panel restructure) implementation, per normal engineering review practice.
- **Queryability review**: required specifically for the reviewer/reviewed-employee display and filtering design (§5–§8), given the terminology decision documented in §6.2 (Paraparan's "Auditor" role) and the registry-data gap it flags in `backend/config.py`.
- **Additional domain-member consultation** (Mayurika, Suman, Arun, Rajiv, Paraparan individually): optional, unless separately requested by the repository owner — not a mandatory implementation gate.

**Branch-strategy (retained, §H):** implementation branch strategy is not defined by this design and must follow the repository owner's explicit instruction at implementation start. This design does not assume `main` or any feature branch, and no branch was created while producing this design.

**One next step:** technical and queryability review of this corrected design (§13's numeric pass/fail rule, all eight conditions met) before implementation begins.

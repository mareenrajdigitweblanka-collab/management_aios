---
name: staff-location-api-filter-check
type: validation
scope: GET /api/staff, GET /api/staff/filter-options — location filter
created: 2026-07-13
status: PASS
owner: HR (Mayurika)
reviewer: pending
---

# Staff Location API + Filter Check — 2026-07-13

## 1. Backend changes

| File | Change |
|---|---|
| `backend/config.py` | Added `VALID_LOCATIONS = ("Jaffna", "Nelliyadi", "Chankanai", "WFH")` |
| `backend/schemas.py` | Added `locations: list[str]` to `StaffFilterOptionsResponse` |
| `backend/routers/staff.py` | Added `location` query param to `GET /api/staff`, validated against `VALID_LOCATIONS` (422 on invalid value); added `location` to the returned `filters` echo; added `locations` (distinct, non-null, sorted) to `GET /api/staff/filter-options` |

No new endpoint was created — the existing reusable `GET /api/staff` list route and `GET /api/staff/filter-options` route were extended, matching the existing `team`/`staff_status`/`employment_stage` pattern. Pagination, sorting, and search are untouched and continue to combine with the new filter exactly as they already combine with the existing ones (all filters are ANDed in `_apply_filters`).

## 2. Local test results (backend on `127.0.0.1:8010`, live DB)

| Check | Result |
|---|---|
| `GET /api/staff/filter-options` returns `locations` | PASS — `["Chankanai", "Jaffna", "Nelliyadi", "WFH"]` |
| `GET /api/staff?location=Jaffna` | PASS — `total: 254` (matches DB `location='Jaffna'` count) |
| `GET /api/staff?location=Nelliyadi` | PASS — `total: 31` |
| `GET /api/staff?location=Chankanai` | PASS — `total: 12` |
| `GET /api/staff?location=WFH` | PASS — `total: 13` |
| `GET /api/staff?location=Colombo` (not in canonical set) | PASS — `422 Unprocessable Entity` |
| `GET /api/staff?location=Jaffna&staff_status=Active` | PASS — `total: 102`, filters correctly ANDed |

## 3. Frontend changes

| File | Change |
|---|---|
| `web-view/index.html` | Added `location` to `buildStaffQuery()`; added `location` to `mergeStaffFilters()`; added a "Location" `<select>` (canonical values, hardcoded the same way `staff_status`/`employment_stage` already are) inside the single shared `createStaffFilterBar()` component; added a "Location: X" filter chip with remove (×) and inclusion in "Clear all" |

`createStaffFilterBar()` is the one function mounted by all five views this task requires reuse across:

| View | Mount call | Location filter present |
|---|---|---|
| Current Staff | `initStaffDataTab()` → shared filter bar `#staff-data-filter-bar` | YES |
| Onboarding Staff Process | same shared filter bar (subtab, not a separate bar) | YES |
| Resigned Staff | same shared filter bar (subtab, not a separate bar) | YES |
| Arun staff view | `initTeamScopedStaffPilot(#arun-staff-pilot)` | YES |
| Paraparan staff view | `initTeamScopedStaffPilot(#paraparan-staff-pilot)` | YES |

No separate branch-specific endpoint or filter component was created, per the task's explicit instruction.

## 4. Browser-driven verification

Verified with Playwright (system Chrome, headless) against the frontend served statically on `127.0.0.1:5500` and the backend on `127.0.0.1:8000`, both running the code in this branch.

| Check | Result |
|---|---|
| Location dropdown appears in Staff Data tab, lists Jaffna/Nelliyadi/Chankanai/WFH | PASS |
| Selecting "Jaffna" filters the Current Staff table and shows a "Location: Jaffna ×" chip | PASS — table re-fetched, `Showing 25 of 102 records` |
| Combining Location=Jaffna with Staff Status=Active | PASS — total stayed 102 (Current Staff subtab's base filter is already `status=Active`; explicit selection is consistent) |
| Removing the Location chip via its × button clears the filter and resets the dropdown to "All Locations" | PASS |
| "Clear all" clears the Location selection along with other filters | PASS |
| Arun team-scoped view (`#arun-staff-pilot`) shows the Location filter with the same 4 options | PASS |
| Paraparan team-scoped view (`#paraparan-staff-pilot`) shows the Location filter with the same 4 options | PASS |
| Table already contains a Location column; no duplicate column added | PASS (unmodified — `STAFF_PRIMARY_COLUMNS` was not changed) |
| Console/network errors during the flow | None attributable to the Location filter change (no errors observed during the filter interaction sequence) |

Screenshots captured locally during this session (not part of the repository): initial Staff Data tab, Location=Jaffna selected showing the filter chip, after Clear All.

## 5. What was not changed

- `SORTABLE_COLUMNS` already included `location` (pre-existing table sort support) — untouched.
- The Location table column, `STAFF_PRIMARY_COLUMNS`, and `renderStaffPrimaryCell` were not modified — no duplicate column was introduced.
- No separate `/api/staff/jaffna`-style branch endpoint was created.

## 6. Pass/fail rule

PASS requires: `locations` present in filter-options, `?location=` filters correctly for all 4 canonical values, invalid values rejected with 422, filter combines correctly with existing filters, and the shared filter bar shows/behaves identically across all 5 reusing views. **All conditions met — status: PASS.**

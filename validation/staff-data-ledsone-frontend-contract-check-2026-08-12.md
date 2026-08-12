---
name: staff-data-ledsone-frontend-contract-check
type: validation-report
scope: web-view/js/staff-data.js, web-view/css/staff-data.css, web-view/js/staff-data.test.mjs
created: 2026-08-12
status: PASS
root-truth: CLAUDE.md — canonical; this file records a frontend/backend field-contract verification, not a policy decision
---

# Staff Data — Frontend/Backend Field Contract Check — 2026-08-12

## Purpose

`management_aios.staff_dashboard_records` was rebuilt 2026-08-11 as an exact mirror of `employee_management.staff` on Ledsone (see `member-aios/staff-data/README.md` §0 and `database/migrations/2026-08-11-mirror-staff-dashboard-records-from-ledsone.sql`). This check verifies the Staff Data frontend correctly displays exactly the approved 14-field business contract from that backend — no obsolete field references, no missing fields, no over-exposure of non-approved API fields, clean null/delete-status handling.

## Backend Contract (read-only inspection, no changes)

`GET /api/staff` (`backend/routers/staff.py`) returns `StaffRecordOut` (`backend/schemas.py`), sourced 1:1 from `StaffDashboardRecord` (`backend/models.py`) — 19 fields total: `id, staff_code, name, role, email, phone, roster, designation, joined_date, confirmed_date, address, skype, delete_status, team_id, is_approved, staff_type, staff_level, informed_leave_balance, urgent_leave_balance, backup_staffs`.

All 14 required business fields were already present. **No backend changes were made or needed.**

## Approved 14 Frontend Fields (`STAFF_MAIN_COLUMNS`, `web-view/js/staff-data.js`)

```
staff_code, name, email, phone, roster, designation, joined_date,
confirmed_date, address, delete_status, staff_type, staff_level,
informed_leave_balance, urgent_leave_balance
```

Exhaustive — `role`, `skype`, `team_id`, `is_approved`, `backup_staffs` are real API fields but deliberately **not** part of the Staff Data display contract (verified absent via `STAFF_MAIN_COLUMNS contains none of the obsolete pre-2026-08-11 field names` and the explicit set-membership test asserting `STAFF_MAIN_COLUMNS.length === 14`).

## Primary Table Fields (`STAFF_PRIMARY_COLUMNS`)

```
Staff Code | Name | Designation | Roster | Staff Type | Staff Level | Delete Status | Actions
```

Staff Code/Name/Actions always visible; Designation/Roster/Staff Type/Staff Level/Delete Status hideable via the existing column-visibility chooser. Staff Code/Name/Designation are sortable — matches `backend/routers/staff.py` `SORTABLE_COLUMNS` exactly.

## Detail Grouping (`STAFF_DETAIL_GROUPS`)

| Group | Fields |
|---|---|
| Identity | staff_code, name, designation |
| Contact | email, phone, address |
| Employment | roster, staff_type, staff_level, joined_date, confirmed_date |
| Status | delete_status |
| Leave | informed_leave_balance, urgent_leave_balance |

14 fields, 5 groups, each field in exactly one group (unit-tested).

## Null / Delete-Status Behavior

- Empty values (`null`/`undefined`/`''`) render as `—` — the established Management AIOS empty-value convention (matches `knowledge-management.js`'s `msc-km-dash` pattern), used consistently in both the primary table and the detail drawer.
- `0` (leave balances) and `false` (`delete_status`) are never mistaken for "no value" — a plain `raw || fallback` pattern was deliberately avoided.
- `delete_status`: `false` → `Current`, `true` → `Deleted` — never reinterpreted as Resigned/Inactive/an HR status.
- `joined_date`/`confirmed_date`: raw source value passed through unchanged, no invented formatting/business logic.
- `staff_code`: displayed exactly as stored (Ledsone's inconsistent spacing, e.g. `"DWL 292"` vs `"DWL010"`, is preserved, never normalized).

## Search Result

Server-side `search` (unchanged, already correct) covers `name`/`staff_code`/`designation`. Verified live against the real running backend with real production data:
- `search=Mayurika` → 1 correct match (name).
- `search=DWL 292` / `search=DWL010` → correct single matches (staff_code, space-sensitive per Ledsone's actual stored formatting — a data-formatting characteristic, not a search bug).

## Test Evidence

- Focused: `node --test staff-data.test.mjs` → **18/18 PASS**
- Full suite: `node --test *.test.mjs` → **481/481 PASS**
- 13 new regression tests added: 6 field-contract structural assertions (`STAFF_MAIN_COLUMNS`/`STAFF_COLUMN_LABELS`/`STAFF_DETAIL_GROUPS`/`STAFF_PRIMARY_COLUMNS`), 4 `formatStaffCellValue` null/zero/boolean/delete-status assertions, 1 `buildStaffQuery` param assertion, 2 DOM-level integration tests (primary table renders real field values with no `undefined`/`null`/`NaN`; `delete_status: true` renders `Deleted`).
- Backend re-confirmed unaffected: `python -m unittest backend.tests.test_staff_auth backend.tests.test_staff_review_summaries backend.tests.test_md_review_summary_authorization` → 145/145 PASS (backend untouched; re-run for contract confidence only).

## User Real-Browser Acceptance

The user manually reviewed the real Staff Data frontend in a browser and confirmed the 14-field display is visually correct. (A prior automated-tooling attempt to acquire a headless Chromium locally failed on a persistent TLS/network error unrelated to this codebase; that gap is now closed by direct user verification.)

## No Backend/Database/Auth Changes

Confirmed via `git status --short` and `git diff --stat`: only `web-view/js/staff-data.js`, `web-view/css/staff-data.css`, `web-view/js/staff-data.test.mjs` modified. No backend, database, or authorization files touched.

## Protected-Path Attestation

`member-aios/mayurika-hr/staff-data/` was never opened, read, searched, listed, modified, staged, or committed during this task or the preceding field-contract alignment task.

## Result

**PASS.**

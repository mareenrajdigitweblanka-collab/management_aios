---
name: staff-location-source-reconciliation-check
type: validation
scope: management_aios.staff_dashboard_records — HR-verified branch/WFH location integration
created: 2026-07-13
status: AMBER — updated_by schema gap resolved (migration applied 2026-07-13); database location update still not updated, pending ambiguous-match resolution
owner: HR (Mayurika) — reviewer for data content; Rajiv/Arun for duplicate employee_number resolution
---

# Staff Location Source Reconciliation Check — 2026-07-13

## 1. Source files

Location: `raw data for mini aios/` (outside this repository — never staged, never committed, never embedded in frontend code).

| File | SHA-256 |
|---|---|
| Personal Target - HRD - 2.2 Jaffna branch Staffs.csv | `184cefd54312fb3b21010b6e6fc10369aae6c6ad87b0a7f3a46150dc11014d21` |
| Personal Target - HRD - 2.3 Nelliyadi staffs.csv | `6db4fa584cd636825b7956546f116f1824dd7245bfb8a1b62f89c435291e44c0` |
| Personal Target - HRD - 2.4 Chankanai Branch Staffs.csv | `add5dcd862a6e8e72dbb98e620def6a3559e3ef792f0e0ac247238ebf0379a92` |
| Personal Target - HRD - 2.5 WFH Staffs.csv | `8196227f15f35acac45d7fe4c64c9a47b91bfefeb5ffab3d9aff68c42ce8b718` |

## 2. Parsing rule

Row 1 (title), row 2 (header: `No, Employee ID, Location, Full Name, Designation, Department / Team`), and the final `Total Staff: N` row are excluded. A row counts only if Employee ID is not blank and the first column does not begin with "Total Staff".

## 3. Expected vs. actual counts

| File | Expected | Parsed | Result |
|---|---|---|---|
| Jaffna | 89 | 89 | MATCH |
| Nelliyadi | 23 | 23 | MATCH |
| Chankanai | 7 | 7 | MATCH |
| WFH | 4 | 4 | MATCH |
| **Total** | **123** | **123** | **MATCH** |

Header row matched the expected 6-column shape in all four files. No row inside any file had a Location value conflicting with that file's own branch (0 conflicts).

## 4. Cross-file duplicates

**0** normalized Employee IDs appear in more than one of the four location files. All 123 rows are unique across the source set.

## 5. Matching against `staff_dashboard_records`

Normalization: trim → uppercase → remove internal spaces → remove hyphens (e.g. `DWL 323` / `DWL-323` / `dwl323` all normalize to `DWL323`). Compared against normalized `employee_number` for all 310 `is_current = true` rows.

| Match status | Count |
|---|---|
| MATCHED (exactly 1 DB row) | 119 |
| UNMATCHED (0 DB rows) | 0 |
| AMBIGUOUS (>1 DB row) | 4 |
| **Total source rows** | **123** |

Of the 119 MATCHED rows:

| | Count |
|---|---|
| Already correct location | 107 |
| Location change required | 12 |

Secondary-evidence conflicts among MATCHED rows (informational only — never blocks or drives a match):

| | Count |
|---|---|
| Name conflicts | 6 |
| Designation conflicts | 10 |
| Department/Team conflicts | 59 (mostly free-text spelling/casing variance between the HR location sheet and the dashboard's normalized `department_team` — not evaluated as a data-quality defect by this check) |

## 6. Ambiguous matches — detail

All 4 ambiguous rows come from the Jaffna file, matching known duplicate `employee_number` values already documented in `member-aios/staff-data/evidence/hr-duplicate-employee-id-review-2026-07-13.md` (5 employee_number values reused across 11 rows in the original 310-row import — a known, preserved source condition, not an artifact of this task).

| Source file | Source row | Source Employee ID | Normalized | DB rows sharing this ID |
|---|---|---|---|---|
| Jaffna | 75 | `DWL 300` | `DWL300` | 2 |
| Jaffna | 76 | `DWL 302` | `DWL302` | 3 |
| Jaffna | 77 | `DWL 303` | `DWL303` | 2 |
| Jaffna | 88 | `DWL 319` | `DWL319` | 2 |

All candidate DB rows for these 4 IDs already have `location = 'Jaffna'`, matching the source — so even once resolved, no location value is expected to change for them. They are withheld from any update because this script cannot determine *which* specific DB row a source row refers to, and per this task's matching rule, ambiguous rows are never updated.

## 7. Schema finding: `updated_by` column — RESOLVED 2026-07-13

`management_aios.staff_dashboard_records` originally had no `updated_by` column on either the live database or the `StaffDashboardRecord` ORM model (`backend/models.py`) — confirmed by querying `information_schema.columns` directly against the live table. The table had `imported_by`/`imported_at` (set once, at import time, by `scripts/import_staff_dashboard_csv.py`), and a plain `updated_at`, but no per-update actor column.

**Resolution:** with explicit user authorization, `database/migrations/2026-07-13-add-updated-by-to-staff-dashboard-records.sql` (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS updated_by TEXT NULL`) was applied directly to the live database on 2026-07-13. Additive only — no existing column, constraint, or row was touched. Post-migration validation: row count still 310, all 310 existing rows have `updated_by IS NULL` (expected — nothing has used the column yet). `backend/models.py` was updated with a matching `updated_by = Column(String, nullable=True)`.

`scripts/update_staff_locations_from_hr_sources.py` still detects this condition at runtime (`check_updated_by_column()`) as defense in depth — both `--apply` and `--emit-sql` would refuse to run if the column were ever absent, rather than silently omitting the audit value. As of this migration, the condition no longer triggers.

## 8. Gate result

Per this task's explicit stop-condition rule, the database is not updated — no `--apply` write and no `--emit-sql` file — while any of the following holds:

- [ ] any employee appears in more than one location file — **0 found, condition not triggered**
- [ ] valid source counts do not equal 123 — **123 found, condition not triggered**
- [x] a normalized source ID maps to multiple DB records — **4 found, condition TRIGGERED**
- [ ] `updated_by` column does not exist on the live table — **RESOLVED 2026-07-13, condition no longer triggered**

**Gate status: AMBER** (single remaining condition: ambiguous matches)

`scripts/update_staff_locations_from_hr_sources.py --dry-run` ran to completion and confirmed the `updated_by` condition no longer triggers; the ambiguous-match condition still does. Per explicit user decision (2026-07-13), the 4 ambiguous rows are held pending Rajiv/Arun review — the "skip these 4, apply the other 12" alternative was not chosen, so no location value has been written for any of the 123 source rows, including the 12 with a confirmed, unambiguous match. `--emit-sql`/`--apply` were not attempted (same gate applies).

## 9. Evidence

Full row-level reconciliation (123 rows, PII-free — no NIC/email/phone/address/guardian/salary; only `source_file, source_row, source_employee_id, normalized_employee_id, source_location, database_record_id, database_employee_number, current_database_location, match_status, location_change_required, name_match, designation_match, team_match, review_note`):

`member-aios/staff-data/evidence/staff-location-update-reconciliation-2026-07-13.csv` — repository-safe, tracked in git (contains internal database UUIDs and non-PII fields only; no NIC/address/email/phone/guardian/salary column exists in it).

## 10. Next step

One blocker remains before Phase 7 (apply) can run:

1. **Ambiguous matches:** Resolve the 4 ambiguous `employee_number` duplicates (Rajiv/Arun, per existing duplicate-employee-ID review) so each of `DWL300`, `DWL302`, `DWL303`, `DWL319` maps to exactly one current staff row, or provide an alternate disambiguating key.

(The `updated_by` schema gap — item 2 in a prior version of this document — is resolved; see §7.)

Once resolved, re-run:

```
python scripts/update_staff_locations_from_hr_sources.py --source-dir "<raw data dir>" --dry-run
```

Once the gate reports PASS, use `--emit-sql` (or `--apply`, if direct DB access is available) to write the 12 location changes identified in §5.

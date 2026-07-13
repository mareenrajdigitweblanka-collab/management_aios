---
name: staff-location-data-integration-check
type: validation
scope: management_aios.staff_dashboard_records — HR-verified branch/WFH location integration
created: 2026-07-13
status: AMBER — updated_by schema gap resolved (migration applied 2026-07-13); code changes verified; database location update still deferred pending ambiguous-match resolution
owner: HR (Mayurika)
reviewer: pending
---

# Staff Location Data Integration Check — 2026-07-13

## 1. Source files

| File | SHA-256 | Expected rows | Parsed rows |
|---|---|---|---|
| Personal Target - HRD - 2.2 Jaffna branch Staffs.csv | `184cefd54312fb3b21010b6e6fc10369aae6c6ad87b0a7f3a46150dc11014d21` | 89 | 89 |
| Personal Target - HRD - 2.3 Nelliyadi staffs.csv | `6db4fa584cd636825b7956546f116f1824dd7245bfb8a1b62f89c435291e44c0` | 23 | 23 |
| Personal Target - HRD - 2.4 Chankanai Branch Staffs.csv | `add5dcd862a6e8e72dbb98e620def6a3559e3ef792f0e0ac247238ebf0379a92` | 7 | 7 |
| Personal Target - HRD - 2.5 WFH Staffs.csv | `8196227f15f35acac45d7fe4c64c9a47b91bfefeb5ffab3d9aff68c42ce8b718` | 4 | 4 |
| **Total** | | **123** | **123** |

Full detail: `validation/staff-location-source-reconciliation-check-2026-07-13.md`.

## 2. Match totals

| | Count |
|---|---|
| Matched | 119 |
| Unmatched | 0 |
| Ambiguous | 4 |
| Already correct location | 107 |
| Location change required | 12 |

## 3. Conflicts

- Cross-file duplicate employee IDs: **0**
- Ambiguous DB matches (normalized ID → >1 current staff row): **4** (`DWL300`, `DWL302`, `DWL303`, `DWL319` — all pre-existing duplicate `employee_number` values, not introduced by this task)
- Name conflicts (secondary evidence only, non-blocking): 6
- Designation conflicts (secondary evidence only, non-blocking): 10
- Team conflicts (secondary evidence only, non-blocking): 59

## 4. Database row count before/after

| | Count |
|---|---|
| Total rows before | 310 |
| Total rows after | 310 (unchanged — no write performed) |

## 5. Location counts before/after

| Location | Before | After |
|---|---|---|
| Jaffna | 254 | 254 (unchanged) |
| Nelliyadi | 31 | 31 (unchanged) |
| Chankanai | 12 | 12 (unchanged) |
| WFH | 13 | 13 (unchanged) |

No database write occurred in this pass — see §7.

## 6. Protected-field comparison

Not applicable this pass — no row was written, so no before/after diff on `employee_number`, `full_name`, `designation`, `department_team`, `staff_status`, or `employment_stage` exists to compare. The update script (`scripts/update_staff_locations_from_hr_sources.py`) only ever sets `location`, `updated_at`, and `updated_by` on a matched row's SQLAlchemy object — no other attribute is assigned anywhere in `apply_updates()` or `generate_sql_updates()`.

## 7. Database update result: AMBER

Per this task's explicit stop-condition rule, the database is not updated while any of the following holds:

- valid source counts ≠ 123 — **not triggered** (123 confirmed)
- any employee appears in more than one location file — **not triggered** (0 cross-file duplicates)
- a normalized source ID maps to more than one DB record — **TRIGGERED** (4 ambiguous matches)
- `updated_by` column present on the live table — **RESOLVED 2026-07-13**: `database/migrations/2026-07-13-add-updated-by-to-staff-dashboard-records.sql` was applied to the live database with explicit user authorization (additive `ALTER TABLE ... ADD COLUMN IF NOT EXISTS updated_by TEXT NULL`; row count unchanged at 310, all existing rows `updated_by IS NULL`). `backend/models.py` updated with a matching `updated_by = Column(String, nullable=True)`. No longer a blocking condition.

`--dry-run` re-ran after the migration and confirmed the `updated_by` condition no longer triggers — only the ambiguous-match condition remains. Per explicit user decision (2026-07-13), the 4 ambiguous rows are held pending Rajiv/Arun review (the "skip these 4, apply the other 12" alternative was declined), so `--emit-sql`/`--apply` were not attempted — the gate still blocks all 123 rows, including the 12 with an unambiguous match.

**The 12 identified location changes are still not written to the database.** They are documented in the reconciliation evidence CSV (`member-aios/staff-data/evidence/staff-location-update-reconciliation-2026-07-13.csv`, repository-safe, tracked in git) for HR/Rajiv/Arun review.

## 8. What is safe and already true regardless of the AMBER gate

- The four raw HR CSVs were never staged, committed, or embedded anywhere in this repository.
- No employee name, NIC, or other protected field was written to any tracked file.
- `staff_dashboard_records` total row count (310) is unaffected — no insert, no delete.
- The API/frontend location-filter feature (see `validation/staff-location-api-filter-check-2026-07-13.md`) is independent of the pending location-value update and functions correctly against the current (unmodified) location data.

## 9. Next step

One blocker remains: resolve the 4 ambiguous `employee_number` duplicates (Rajiv/Arun, consistent with the existing process for `member-aios/staff-data/evidence/hr-duplicate-employee-id-review-2026-07-13.md`) so each of `DWL300`, `DWL302`, `DWL303`, `DWL319` maps to exactly one current staff row. (The `updated_by` schema gap is resolved — see §7.)

Then re-run:

```
python scripts/update_staff_locations_from_hr_sources.py --source-dir "<raw data dir>" --dry-run
```

Once gate status is PASS, apply the 12 pending location changes via `--emit-sql` (Neon SQL Editor) or `--apply` (direct DB access), then re-run the post-update validation queries embedded in the generated SQL file.

## 10. Pass/fail rule

PASS requires: source counts = 123, 0 cross-file duplicates, 0 ambiguous DB matches, an existing `updated_by` column, then a successful `--apply`/`--emit-sql` run with row-count and protected-field parity confirmed after. **Current status: AMBER** — source reconciliation and code paths are verified correct; the `updated_by` schema gap is resolved; the ambiguous-match gate has not yet been cleared by a human decision, so no location value has been changed in the database.

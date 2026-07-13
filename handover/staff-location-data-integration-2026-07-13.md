---
name: staff-location-data-integration-handover
type: handover
scope: management_aios.staff_dashboard_records — HR-verified branch/WFH location integration
created: 2026-07-13
status: AMBER — location filter feature shipped-ready; updated_by schema gap resolved (migration applied); location-value database update still deferred (ambiguous matches, held per user decision)
owner: HR (Mayurika)
reviewer: pending
---

# Staff Location Data Integration — Handover — 2026-07-13

## 1. What this task was

Integrate four HR-verified staff location files (Jaffna, Nelliyadi, Chankanai, WFH branch/WFH staff lists) into `management_aios.staff_dashboard_records.location`, and add a Location filter to the existing Staff Data dashboard, reusing the current API/frontend filter architecture.

## 2. Source files

| File | SHA-256 |
|---|---|
| Personal Target - HRD - 2.2 Jaffna branch Staffs.csv | `184cefd54312fb3b21010b6e6fc10369aae6c6ad87b0a7f3a46150dc11014d21` |
| Personal Target - HRD - 2.3 Nelliyadi staffs.csv | `6db4fa584cd636825b7956546f116f1824dd7245bfb8a1b62f89c435291e44c0` |
| Personal Target - HRD - 2.4 Chankanai Branch Staffs.csv | `add5dcd862a6e8e72dbb98e620def6a3559e3ef792f0e0ac247238ebf0379a92` |
| Personal Target - HRD - 2.5 WFH Staffs.csv | `8196227f15f35acac45d7fe4c64c9a47b91bfefeb5ffab3d9aff68c42ce8b718` |

Location: `raw data for mini aios/` — outside this repository. Never staged, committed, or embedded in any frontend/backend code.

## 3. Expected vs. actual counts

Jaffna 89/89, Nelliyadi 23/23, Chankanai 7/7, WFH 4/4 — total 123/123. Full detail: `validation/staff-location-source-reconciliation-check-2026-07-13.md`.

## 4. Match totals

Matched 119, Unmatched 0, Ambiguous 4, Already-correct 107, Location-change-required 12. Cross-file duplicate IDs: 0.

## 5. Database row count before/after

310 / 310 — unchanged. No row inserted, no row deleted, no location value written in this pass.

## 6. Location counts before/after

Jaffna 254/254, Nelliyadi 31/31, Chankanai 12/12, WFH 13/13 — unchanged (no write performed).

## 7. Protected-field comparison

Not applicable — no row was written this pass. The update script only ever assigns `location`, `updated_at`, `updated_by` on a matched row; every other column (`employee_number`, `full_name`, `designation`, `department_team`, `staff_status`, `employment_stage`) is never touched anywhere in the script.

## 8. API filter result

PASS. `GET /api/staff/filter-options` now returns `locations`; `GET /api/staff?location=<value>` filters correctly for all 4 canonical values (254/31/12/13, matching the DB), rejects out-of-set values with 422, and combines correctly with `team`/`staff_status`/`employment_stage`/`search`/pagination/sort. Full detail: `validation/staff-location-api-filter-check-2026-07-13.md`.

## 9. Frontend reusable filter result

PASS. One shared `createStaffFilterBar()` component (unchanged approach — no new component was written) now includes a Location dropdown, reused identically across Current Staff, Onboarding Staff Process, Resigned Staff, the Arun team-scoped view, and the Paraparan team-scoped view. Active-filter chip, chip-remove, and Clear-all behavior extended consistently with the existing Team/Status/Stage/Search filters. No duplicate Location table column was added — the table already had one. Verified with a Playwright-driven headless Chrome session against the live local API.

## 10. Raw source tracked

**NO.** The four HR CSVs remain outside the repository (`raw data for mini aios/`). No row content from them appears in any committed file. The reconciliation evidence CSV is repository-safe and tracked at `member-aios/staff-data/evidence/staff-location-update-reconciliation-2026-07-13.csv` (only the allowed columns — no NIC/address/email/phone/guardian/salary).

## 11. Real data embedded

**NO.** No employee name, NIC, employee ID, or other identifying value appears in any code, validation doc, or handover doc created for this task. Documentation cites counts, hashes, normalized-ID examples already given in the task instructions (`DWL300`, `DWL302`, etc. — bare employee codes, already a HR-internal, non-PII identifier class distinct from NIC/name), and aggregate figures only.

## 12. Credential exposure

**NO.** `DATABASE_URL` was never printed by any script or command output in this session. `.env` was not read, modified, or displayed.

## 13. Owner / reviewer / status

- **Owner:** HR (Mayurika) — per CLAUDE.md §18 reviewer routing rule (HR / staff records domain).
- **Reviewer:** pending — Mayurika (data content) and Rajiv/Arun (resolving the 4 ambiguous duplicate `employee_number` rows) have not yet reviewed this integration.
- **Status: AMBER.** The Location-filter feature (API + frontend) is complete and verified working. The `updated_by` schema gap is resolved (migration applied 2026-07-13, with explicit user authorization). The actual location *data* update (12 pending changes) remains blocked by one condition: a normalized source employee ID maps to more than one current staff row for 4 of the 123 source rows. Per explicit user decision, these are held pending Rajiv/Arun review rather than skipped-and-applied-around, so the database is not written for any of the 123 rows yet.

## 14. Known limits

- 4 ambiguous matches (`DWL300`, `DWL302`, `DWL303`, `DWL319`) block the location-value update entirely, per the task's stop-condition rule — not just for those 4 rows. These correspond to a pre-existing, already-documented condition (`member-aios/staff-data/evidence/hr-duplicate-employee-id-review-2026-07-13.md`) — 5 employee_number values reused across 11 rows in the original 310-row import — not something introduced by this task.
- Team/designation/name conflicts among the 119 matched rows (59/10/6 respectively) are recorded as secondary evidence only in the reconciliation CSV; they do not block anything and were not investigated further, per the task's instruction that these are secondary evidence, not a match driver.

## 15. Next step

1. Rajiv/Arun resolve the 4 ambiguous `employee_number` duplicates (or confirm a disambiguating key) so each of `DWL300`, `DWL302`, `DWL303`, `DWL319` maps to exactly one current staff row.
2. Re-run `python scripts/update_staff_locations_from_hr_sources.py --source-dir "<raw data dir>" --dry-run` — expect gate status PASS.
3. Apply the 12 pending location changes via `--emit-sql` (Neon SQL Editor) or `--apply` (direct DB access).
4. Re-run the post-update validation queries (embedded in the generated SQL file) to confirm the 12 changes landed and nothing else moved.
5. Commit and push everything (Location-filter code, the applied `updated_by` migration, and once resolved, the location-value update) together, per this task's bundled "database update passes" gate.

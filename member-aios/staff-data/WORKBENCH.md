---
name: staff-data-workbench
type: workbench
scope: dashboard-specific staff data staging area
created: 2026-07-13
updated: 2026-07-13
status: DRAFT — normalized CSV + staging design + UI design complete; blocked on HR sign-off and security remediation before any real deployment
source-boundary: SRC-STAFF-001, HR-provided PDF (unregistered), CLAUDE.md §6, §9.1, §18
root-truth: CLAUDE.md — canonical; this file is a navigation pointer only
---

# Staff Data — Workbench

**Root Truth Rule:** This file is a workbench navigation guide for the `member-aios/staff-data/` staging area. It does not replace CLAUDE.md. If this file contradicts CLAUDE.md, CLAUDE.md is correct.

**Pass/Fail Rule:** PASS if a clean LLM reading this file understands the staging area's scope, current status, and blocking conditions without verbal explanation. FAIL if this file implies data has been imported, a database has been created, or the security findings below are resolved when they are not.

---

## 1. Purpose

This workbench tracks the setup and readiness of the dashboard-specific staff data staging area created 2026-07-13. It is a discovery-and-documentation task result — no data import, database creation, or application code change has occurred.

---

## 2. Scope Boundary

This staging area exists to support a staff data view on the dashboard. It is **not**:
- A replacement HR staff master (HR/Mayurika remains authoritative — CLAUDE.md §9.1)
- A company-wide storage policy (this approval is dashboard-specific only)
- A salary, disciplinary, health, or PDPA-document store (CLAUDE.md §6)

---

## 3. Current Build Status

| Item | Status |
|---|---|
| Approved folder structure | CREATED — see README.md §3 |
| Raw HR source file copied into the repo | NOT DONE, and never will be — stays outside git per instruction (`source/raw/` holds only `.gitkeep`, protected by a scoped `.gitignore` rule) |
| Real normalized import CSV built | **DONE** — `source/normalized/hr-staff-dashboard.csv`, 310 rows, approved columns only. **Git-ignored, local-only as of 2026-07-13 remediation — see §4b.** |
| Synthetic repository sample CSV built | **DONE** — `source/sample/hr-staff-dashboard-sample.csv`, 10 synthetic rows, same 16-column structure, safe for public repository |
| Staff + PH-Team KPI staging schema designed | **DONE** — `database-design/staff-ph-kpi-staging-schema-draft.md` (7 tables) |
| Staff Data sidebar module designed | **DONE** — `README.md` §9 |
| PostgreSQL staging tables created | NOT DONE — design only, not applied |
| Application/dashboard code changed | NOT DONE |
| Committed to the repository | Documentation/design files only — see §4b. Real CSV never committed. |
| Pushed to `origin/main` | Business review pack (`e27be2c`) pushed. A staging-assets commit containing the real CSV was blocked pre-push and unwound — see §4b. |

---

## 4. Blocking Findings From 2026-07-13 Discovery

These are pre-existing conditions found during discovery, not caused by this workbench's creation. See `validation/staff-data-source-storage-discovery-check-2026-07-13.md` for full detail.

| # | Finding | Severity | Blocks |
|---|---|---|---|
| 1 | GitHub repository `mareenrajdigitweblanka-collab/management_aios` is **public**, not private | CRITICAL | Contradicts the task's "used only by authorized users" storage assumption. Should be resolved (made private, or a compensating control put in place) before any real staff PII is copied into `source/raw/`. |
| 2 | A live Neon PostgreSQL connection string is currently committed and tracked in `.env` on `main` (commit `6497c7c`), already pushed to `origin/main` | CRITICAL | Active credential leak, unrelated to staff data specifically but affects the same database this staging table would live in. Recommend rotating the Neon password immediately and reviewing whether `.env` needs removal from git history. |
| 3 | SRC-STAFF-001's raw CSV (125 active staff — employee IDs, full names, locations, designations) is already tracked in git and pushed to the public `origin/main`, independent of this task | CRITICAL | Pre-existing exposure of the exact data this staging area is meant to stage. Should be reviewed for remediation (e.g., private repo, or moving raw HR sources to a non-public store) before expanding staff data footprint further. |
| 4 | An unregistered raw HR PDF exists at `member-aios/mayurika-hr/staff-data/source/raw/Personal Target - HRD - 2 Total Staffs.pdf` (untracked, outside the approved path) | MEDIUM | Duplicate-truth risk — needs Mayurika's decision (register as a new source, or consolidate/remove), not resolved by this task. |
| 5 | The backend API (`backend/main.py`) has no authentication layer — CORS origin restriction only, which does not block direct (non-browser) requests | HIGH | Any staff-data API endpoint built later on this backend would be unauthenticated at the HTTP layer unless auth is added first. |

**This workbench does not resolve any of the above.** They are flagged for Mareenraj/repo owner and Mayurika to act on. Per this task's explicit instruction, these are **recorded, not resolved** — security remediation has been deferred by the user, and this does not block documentation/normalized-CSV work, but it does block real staff API deployment.

---

## 4a. New Findings From This Task (2026-07-13, Session 2)

| # | Finding | Severity | Detail |
|---|---|---|---|
| 6 | Two different HR staff sources exist (SRC-STAFF-001, 125 rows vs. the HR-provided PDF used this session, 310 rows) with no reconciliation | MEDIUM | `source-maps/hr-staff-source-map-draft.md` §2 |
| 7 | The HR-provided PDF's "EPF No." column is mislabeled — it actually holds `DWL###` staff codes, not government EPF numbers | LOW | `source-maps/hr-staff-source-map-draft.md` §4.1 |
| 8 | 5 `employee_number` values are reused across 11 different people in the source PDF itself (`DWL302` ×3; `DWL296`/`DWL303`/`DWL305`/`DWL319` ×2 each) | MEDIUM | `source-maps/hr-staff-source-map-draft.md` §4.2 — confirmed genuine source defect, not a parsing artifact |
| 9 | No HR-approved rule exists to derive `employment_stage` (Permanent/Probation/7-Day Training) — all 310 CSV rows are `[VERIFY]` | MEDIUM | `source-maps/hr-staff-source-map-draft.md` §6 |
| 10 | Paraparan's designation conflicts between sources (External Auditor per SRC-ARUN-CONF-001 vs. "Accountant" in the HR-provided PDF) | LOW | `data-maps/ph-team-kpi-shared-data-map-draft.md` §2 |

---

## 4b. Public-Repository PII Remediation (2026-07-13)

A local commit (`052bda5`, "Add staff data staging assets") containing the **real** `hr-staff-dashboard.csv` — 310 real employees' names and NIC numbers — was blocked before push by an automated data-exfiltration safety check, because finding #1 above (public repository) means that data would have been publicly exposed. The commit was never pushed; `origin/main` was never affected.

**Remediation applied:**

1. The blocked local commit was unwound with `git reset --mixed` back to `e27be2c` (the last pushed commit) — no file content was lost, no remote history was touched.
2. `source/normalized/hr-staff-dashboard.csv` (the real CSV) was added to `.gitignore` — it remains on disk, untracked, local-only.
3. `source/sample/hr-staff-dashboard-sample.csv` was created — 10 fully synthetic rows, same column structure, safe for the public repository.
4. Documentation (`README.md` §5a, this file, source map, field map) was updated to distinguish the real (local-only) CSV from the synthetic (repository) sample, without altering the underlying findings — the 310-row real count, the 42-row PH finding, the 310/310 `employment_stage = [VERIFY]` finding, HR authority, and the shared Arun/Paraparan KPI model are all unchanged.

See `validation/staff-data-public-repo-pii-remediation-check-2026-07-13.md` for full verification.

---

## 5. Next Steps (Pending, in Recommended Order)

1. **HR review (owner: Mayurika):** review `source-maps/hr-staff-source-map-draft.md` and `data-maps/staff-field-map-draft.md`; resolve the two-source conflict and duplicate `employee_number` values; define the `employment_stage` derivation rule; confirm remaining department/team variant groups; decide on the unregistered PDF at `member-aios/mayurika-hr/staff-data/source/raw/`.
2. **KPI review (owner: Arun):** review `data-maps/ph-team-kpi-shared-data-map-draft.md` and confirm the `[VERIFY]` KPI formula/weight/threshold items; resolve Paraparan's designation conflict.
3. **Security remediation (owner: Mareenraj / repo owner):** rotate the exposed Neon credential; decide on repo visibility — recorded as deferred by the user for this task, but still required before real staff API deployment.
4. **Database:** apply `database-design/staff-ph-kpi-staging-schema-draft.md` against PostgreSQL only after 1–3 are addressed, as a separate explicitly authorized action.
5. **API/dashboard:** add authentication to the backend before exposing any staff-data endpoint, then build the Staff Data sidebar module (README.md §9) as a separate scoped implementation task.

---

## 6. Reviewer Routing

Per CLAUDE.md §18:

| Content Type | Reviewer |
|---|---|
| Staff data source map, field map, HR fields | Mayurika |
| PostgreSQL schema draft | Mayurika (data content) + technical reviewer (schema mechanics) |
| Repository visibility / credential exposure | Mareenraj (builder) / repo owner |
| Promotion of this staging area to a live dashboard feature | Mayurika sign-off, per CLAUDE.md §18 |

---

## 7. Known Limits

- This workbench and all files under `member-aios/staff-data/` are DRAFT as of 2026-07-13 — discovery-only, no HR review yet.
- The security findings in §4 are outside this task's authorized action scope (documentation only) and require separate, explicit remediation decisions.
- Department/team normalization is only partially confirmed — see source map §6.

*File created: 2026-07-13 | Discovery-only draft | See `validation/staff-data-source-storage-discovery-check-2026-07-13.md` for the full discovery report.*

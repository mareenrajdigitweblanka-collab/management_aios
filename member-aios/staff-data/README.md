---
name: staff-data-readme
type: folder-readme
scope: dashboard-specific staff data staging area
created: 2026-07-13
updated: 2026-07-13
status: DRAFT — real normalized CSV built (310 rows, local-only, git-ignored); synthetic repository sample CSV added; Staff Module UI designed; database design only, not applied
source-boundary: SRC-STAFF-001, HR-provided PDF (unregistered), CLAUDE.md §6, §9.1
root-truth: CLAUDE.md — canonical; this file is a documentation-only folder overview
---

# Staff Data — Folder Overview

## 1. What This Folder Is

`member-aios/staff-data/` is an **approved, dashboard-specific** storage area for staff data used by the Management AIOS dashboard. It holds:

- A raw HR-provided staff source file (once authorized — currently empty, see §5)
- A normalized, import-ready CSV derived from that raw file (once authorized — currently empty, see §5)
- Source maps, field maps, database design drafts, evidence, and validation records supporting that staging work

**Storage scope note — read before treating this as precedent elsewhere:** The decision to allow a raw HR staff file and normalized CSV to be stored here was approved specifically for this dashboard's staff-data workflow. **It is not a company-wide HR data storage policy.** It does not change HR's (Mayurika's) staff record custodianship (CLAUDE.md §9.1), and it does not authorize storing staff data anywhere else in the repository.

---

## 2. Root Truth Rule

The root `CLAUDE.md` is canonical. Every claim in this folder must trace to a Source ID registered in `evidence/source-register.md`, or carry a `[VERIFY]` tag. If any file here contradicts CLAUDE.md, CLAUDE.md is correct.

HR remains the authoritative source for staff records. Nothing in this folder replaces SRC-STAFF-001 or Mayurika's staff data custodianship. PostgreSQL, once populated, will hold **operational dashboard records** derived from HR's source — not a replacement HR master.

---

## 3. Folder Structure

| Path | Purpose |
|---|---|
| `README.md` | This file |
| `WORKBENCH.md` | Active work tracker for this staging area |
| `source/raw/` | Never contains the raw PDF — see §5. Holds only `.gitkeep`; a `.gitignore` rule keeps anything else placed here untracked. |
| `source/normalized/` | `hr-staff-dashboard.csv` — the **real** normalized CSV, 310 rows, approved columns only. **Local-only, git-ignored — not committed to the repository.** See §5 and §5a. |
| `source/sample/` | `hr-staff-dashboard-sample.csv` — a **synthetic, repository-committed** sample with the same 16-column structure, for UI/API/schema development. Contains zero real staff data. See §5a. |
| `source-maps/` | Maps both SRC-STAFF-001 and the (unregistered) HR-provided PDF to this staging area — see `source-maps/hr-staff-source-map-draft.md` |
| `data-maps/` | `staff-field-map-draft.md` (raw→normalized field mapping) and `ph-team-kpi-shared-data-map-draft.md` (Arun/Paraparan shared KPI model) |
| `database-design/` | Draft (not applied) designs: `staff-data-schema-draft.sql` (2026-07-13 session 1, staff-only) and `staff-ph-kpi-staging-schema-draft.md` (2026-07-13 session 2, staff + shared PH-Team KPI tables — supersedes the SQL draft's staff table design; both kept for history) |
| `query-packs/` | `staff-data-query-pack-draft.md` — illustrative dashboard/filter/KPI queries against the (not-yet-created) staging schema |
| `evidence/` | Stakeholder confirmations specific to this staging area (empty as of 2026-07-13) |
| `validation/` | Validation/discovery checks specific to this staging area (empty as of 2026-07-13 — root-level reports are at `validation/staff-data-source-storage-discovery-check-2026-07-13.md` and `validation/staff-data-normalization-and-staging-design-check-2026-07-13.md`) |
| `handover/` | Handover records for this staging area (empty as of 2026-07-13) |

---

## 4. Source Rules

- HR remains the authoritative source (CLAUDE.md §9.1). SRC-STAFF-001 is the only registered raw staff roster source — see `source-maps/hr-staff-source-map-draft.md`.
- `source/raw/` may contain the unchanged HR-provided source file, once authorized. In practice, the raw HR PDF is kept entirely outside this repository (see §5).
- `source/normalized/hr-staff-dashboard.csv` holds the real, cleaned, import-ready data — **kept local-only and git-ignored, never committed to this repository** (see §5a).
- `source/sample/hr-staff-dashboard-sample.csv` holds a synthetic, structurally-identical sample — this is the artifact safe to commit and use for UI/API/schema development (see §5a).
- PostgreSQL will hold operational dashboard records, populated from the **real** local CSV as a later, separately-approved import step — see `database-design/staff-data-schema-draft.sql`.
- Neither the real normalized CSV, the synthetic sample CSV, nor the PostgreSQL table may ever be treated as a replacement HR master.
- **No salary data anywhere in this folder or this dashboard workflow.** Out of scope for this AIOS at all times (CLAUDE.md §6).
- All other HR-provided fields (employee ID, location, full name, designation, department/team) may be included for this dashboard — see `data-maps/staff-field-map-draft.md`.
- Raw files must never be placed under `web-view/`, `public/`, `static/`, or any deployed frontend folder.
- Raw files must never be exposed as public web assets.

---

## 5. Current Status (updated 2026-07-13)

- `source/raw/` — contains only `.gitkeep`. The raw HR PDF was **not** copied here — it stays outside git entirely, at `raw data for mini aios/Personal Target - HRD - 2 Total Staffs.pdf` (parent folder, outside the repository), per this task's instruction.
- `source/normalized/hr-staff-dashboard.csv` — **built**, 310 rows, approved columns only (employee_number, epf_number, date_of_joining, full_name, calling_name, location, staff_status, department_team, designation, cv_reference, nic, remarks, employment_stage, source_file, source_page, source_row_reference). Verified free of salary/address/email/phone/guardian-number content — see `validation/staff-data-normalization-and-staging-design-check-2026-07-13.md`. **This file is now git-ignored and local-only — see §5a.**
- `source/sample/hr-staff-dashboard-sample.csv` — **built**, 10 fully synthetic rows, same 16-column structure, safe for repository commit.
- No PostgreSQL objects have been created — `database-design/staff-ph-kpi-staging-schema-draft.md` is a design document only.
- No staff records have been imported into any database.
- The Staff Module UI (§9 below) is designed, not built — no dashboard code has been changed.

See `validation/staff-data-source-storage-discovery-check-2026-07-13.md` for the original discovery report (repository is **public**; a live database credential was found tracked in `.env` on `main`) and `validation/staff-data-normalization-and-staging-design-check-2026-07-13.md` for this session's verification. Both security findings are recorded, not resolved — real staff API deployment remains a later, separate approval step.

---

## 5a. Public-Repository PII Remediation (2026-07-13)

A commit containing the real `hr-staff-dashboard.csv` (full names and NIC numbers for 310 real employees) was prepared and locally committed, then **blocked before push** by an automated data-exfiltration safety check, because this repository is public (§5, and `validation/staff-data-source-storage-discovery-check-2026-07-13.md`). The blocked local commit was never pushed and has since been unwound (`git reset --mixed`) — no remote history was altered.

**Resulting model, going forward:**

| Artifact | Location | Contains | Committed to this repository? |
|---|---|---|---|
| Raw HR PDF | `raw data for mini aios/Personal Target - HRD - 2 Total Staffs.pdf` (outside this repo) | Real employee data, all fields including excluded ones | **NO — never** |
| Real normalized CSV | `source/normalized/hr-staff-dashboard.csv` | Real employee data, approved 16-column fields only (still includes real `full_name`/`nic`) | **NO — git-ignored, local-only.** Used later for the approved PostgreSQL import, once that step is separately authorized. |
| Synthetic sample CSV | `source/sample/hr-staff-dashboard-sample.csv` | Fully invented data only (`SAMPLE###` IDs, `Sample Staff N` names, `SAMPLE-NIC-###` placeholders) | **YES — safe for the public repository.** Used for UI/API/schema development. |
| PostgreSQL | Not yet created | Would hold real operational records, imported from the real local CSV | Not applicable — database, not a git artifact; import remains a later, separately-approved step |

See `validation/staff-data-public-repo-pii-remediation-check-2026-07-13.md` for the full verification of this remediation.

---

## 6. Sensitivity Rule

Inherited from CLAUDE.md §6 and applied per this task's approved field list:

- `full_name` and `nic` are approved dashboard fields and exist as real values in the **real** `source/normalized/hr-staff-dashboard.csv` — that is the CSV's intended purpose. **That file is git-ignored and local-only (§5a) — it must never be committed to this public repository.**
- The repository-committed `source/sample/hr-staff-dashboard-sample.csv` contains only invented `SAMPLE###`/`Sample Staff N`/`SAMPLE-NIC-###` values — no real staff name, NIC, or employee number appears in it.
- No `.md` documentation file in this folder enumerates real staff names or NIC values in bulk. `source-maps/`, `data-maps/`, and `validation/` files contain zero individual real staff names.
- No salary, home address, personal email, personal phone/contact number, or guardian phone/number appears anywhere in this folder (real or sample) — verified by direct scan (see validation reports).
- Default to process-level and aggregate information in all documentation files; only the real local CSV (and, later, the staging database, populated from it) carries real per-row detail. The repository sample carries synthetic per-row detail only.

---

## 7. What This Folder Does Not Do

- Does not replace HR's staff record authority.
- Does not create a second staff master — and flags (does not resolve) a genuine two-source conflict between SRC-STAFF-001 and the HR-provided PDF (see `source-maps/hr-staff-source-map-draft.md` §2).
- Does not resolve the duplicate-location risk found at `member-aios/mayurika-hr/staff-data/source/raw/` during discovery (source map §3) — that is Mayurika's decision.
- Does not resolve the 5 duplicate `employee_number` values found in the source itself (source map §4.2) — an HR data-entry defect, not a normalization bug.
- Does not derive `employment_stage` for any row — no HR-approved rule exists (source map §6); all 310 rows are `[VERIFY]`.
- Does not create any database object, deploy any API, or change any application code.

---

## 8. Next Step

See `WORKBENCH.md` §5 for the pending action list.

---

## 9. Staff Data Sidebar — Module Design

**Status:** Designed (documentation only) — no dashboard code built.

### 9a. Sidebar Structure

A new "Staff Data" sidebar section, with three views:

| View | Shows | Backing query |
|---|---|---|
| Current Staff | `staff_status = 'Active'` | `query-packs/staff-data-query-pack-draft.md` §1a |
| Onboarding Staff Process | `staff_status = 'Active' AND employment_stage IN ('Probation', '7-Day Training')` | §1b — non-functional until `employment_stage` is populated |
| Resigned Staff | `staff_status = 'Inactive'` | §1c — label needs Mayurika confirmation (source "Inactive" ≠ necessarily "Resigned") |

### 9b. Shared Reusable Filters (apply across all three views)

- **Team** — filters on `department_team` (canonical `PH` for Portfolio Holders; other values currently unnormalized raw strings — see field map §5)
- **Staff Status** — Active / Inactive
- **Employment Stage** — Permanent / Probation / 7-Day Training (functionally inert today — see §9a)

### 9c. Initial Internal Users

MD, Arun, Paraparan.

**Deployment decision record (2026-07-13):** the deployed frontend and API still have no authentication layer — `GET /api/staff*` is publicly reachable by anyone with the URL, the same as the existing `/api/member-schedules/*` routes (see `backend/README.md` §"Public, unauthenticated API — known limitation"). This was flagged before deployment as a condition requiring an explicit access-control decision. The user explicitly chose to proceed with deployment despite this limitation, in order to complete live API/frontend verification for this task (real database-connectivity testing was not otherwise possible from the available development environment — see `validation/staff-data-api-check-2026-07-13.md`). **This is recorded here as a user-accepted technical-pilot risk, not a resolved security decision.** No excluded field (salary/address/email/phone/guardian) is exposed regardless — that protection is structural (the columns do not exist on the table), not access-control-dependent. Real employee names, NICs, and other approved-but-sensitive fields ARE publicly readable via this API as of this deployment. An access-control mechanism (authentication, IP allowlisting, or similar) remains an open follow-up, tracked here and in the API validation report.

### 9d. Reused UI/Filter/API Structures

Per the prior discovery check (`validation/staff-data-source-storage-discovery-check-2026-07-13.md` item on reusable structures), the existing `web-view/index.html` tab (`data-tab="..."`) and searchable-card (`data-searchable`, `data-tags="..."`) patterns are reusable for this module's sidebar and filter UI — no new UI framework is required. This is a design note only; no HTML/JS was changed by this task.

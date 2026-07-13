---
name: staff-data-normalization-and-staging-design-check
type: validation
created: 2026-07-13
status: AMBER — normalization and design complete and verified; HR/KPI review and pre-existing security findings remain open
source-boundary: HR-provided PDF (unregistered), SRC-STAFF-001, SRC-MAYU-CONF-004, CLAUDE.md §6, §7, §9.1, §18
root-truth: CLAUDE.md — canonical
---

# Staff Data Normalization and Staging Design — Check — 2026-07-13

**Task type:** Staff data normalization, documentation, UI design, and staging design.
**Task boundary:** No PostgreSQL objects created, no migrations run, no Staff APIs deployed, no commit, no push.

---

## 16-Point Verification Checklist

| # | Check | Result |
|---|---|---|
| 1 | Raw PDF is not tracked | **PASS** — `git ls-files` returns zero `.pdf` matches |
| 2 | Raw folder ignore rule works | **PASS** — `git check-ignore` confirms any file under `member-aios/staff-data/source/raw/` is ignored, while `.gitkeep` is explicitly un-ignored |
| 3 | Normalized CSV exists | **PASS** — `member-aios/staff-data/source/normalized/hr-staff-dashboard.csv`, 310 data rows |
| 4 | CSV contains only approved columns | **PASS** — column list matches the 16 approved fields exactly, in order |
| 5 | CSV contains no salary column | **PASS** — not present as a column; also not present anywhere in the source PDF |
| 6 | CSV contains no address column | **PASS** — not present as a column; content-level scan for address-shaped text in all text columns found none |
| 7 | CSV contains no email column | **PASS** — not present as a column; content-level regex scan across all text columns found zero `@`-pattern matches |
| 8 | CSV contains no phone/contact column | **PASS** — not present as a column; content-level regex scan for phone-like digit runs across all text columns found zero matches |
| 9 | CSV contains no guardian-number column | **PASS** — not present as a column |
| 10 | PH Team normalization is evidenced | **PASS** — 42 of 310 rows normalized to `department_team = "PH"`, applied only to raw forms confirmed by SRC-MAYU-CONF-004 (`"Portfolio team"`, `"portfolio team"`, `"Portfolio"`, literal `"PH"`, and `"Intern - PH"` variants); each normalized row's original raw value is preserved in `remarks` as `ph_normalized_from:...` |
| 11 | Unknown employment stage is marked `[VERIFY]` | **PASS** — 310 of 310 rows (100%) carry `employment_stage = [VERIFY]`; no HR-approved derivation rule exists (see source map §6) |
| 12 | Arun and Paraparan share one KPI model | **PASS (design-level)** — `database-design/staff-ph-kpi-staging-schema-draft.md` defines exactly one `kpi_definitions`/`kpi_assignments`/`kpi_result_values`/`kpi_evidence`/`kpi_audit_history` table set, distinguished by an `actor_role` column, not by per-person tables. No table has been created, so this is verified at the design level only. |
| 13 | No database object was created | **PASS** — `git status --short database/` returns no changes; the staging schema exists only as a `.md` design document |
| 14 | No application code was changed | **PASS** — `git status --short backend/ web-view/` returns no changes |
| 15 | No commit or push occurred | **PASS** — `HEAD` remains `8461b99bfc2129bbc0c421c1dd6836e6b2d95ba0`, identical to session start; all changes are uncommitted working-tree modifications |
| 16 | `git diff --check` passes | **PASS** — exit code 0, no whitespace errors |

---

## A. Branch and Starting Commit

`main` @ `8461b99bfc2129bbc0c421c1dd6836e6b2d95ba0` — unchanged throughout this task.

---

## B. Raw Source Location Used

Per this task's instruction, the authoritative local source is **outside git**:

`C:\Users\Digit Web\Desktop\My projects\aios project for management\raw data for mini aios\Personal Target - HRD - 2 Total Staffs.pdf`

**Correction note:** during this session, the PDF was initially opened from a byte-identical duplicate copy that sits untracked inside the repository working tree, at `member-aios/mayurika-hr/staff-data/source/raw/Personal Target - HRD - 2 Total Staffs.pdf` (a pre-existing finding from the 2026-07-13 discovery check). A SHA256 comparison confirmed both files are identical (205,254 bytes, hash `e45adc4301df559af38413457c4429d81875c862c4b07caad3e819d34305ef6c`), so the parsed content is unaffected. The outside-git path above is recorded as the authoritative source location going forward, per instruction. See `source-maps/hr-staff-source-map-draft.md` §1b.

---

## C. Raw PDF Tracked

**NO.** Confirmed by `git ls-files` (checklist #1) and `git check-ignore` (checklist #2).

---

## D. .gitignore Rule Added

```gitignore
member-aios/staff-data/source/raw/*
!member-aios/staff-data/source/raw/.gitkeep
```

Scoped to this one directory only — no repository-wide `*.pdf` rule was added, per instruction. `member-aios/staff-data/source/raw/.gitkeep` is the only tracked file in that directory.

---

## E. Normalized CSV Path

`member-aios/staff-data/source/normalized/hr-staff-dashboard.csv`

---

## F. CSV Row Count

**310** data rows (plus 1 header row).

---

## G. CSV Columns

`employee_number, epf_number, date_of_joining, full_name, calling_name, location, staff_status, department_team, designation, cv_reference, nic, remarks, employment_stage, source_file, source_page, source_row_reference`

---

## H. Excluded-Field Scan Result

**Clean.** No column named salary/home_address/personal_email/personal_phone/contact_number/guardian_phone/guardian_number exists. A content-level regex scan (email pattern, phone-like digit runs) across every text column found **zero** leaked values. This required one fix during development: an initial parser pass let one row's `department_team` value absorb a trailing email + phone number (row for `DWL298`, which had no NIC or CV filename to act as a natural cut point). An excluded-field safety net (additional cut points on email/phone patterns, plus a hard post-hoc strip-and-flag pass) was added and the CSV regenerated; the re-scan confirmed zero leaks. See `data-maps/staff-field-map-draft.md` §2.

---

## I. PH Team Normalization Result

42 of 310 rows normalized to `department_team = "PH"`, evidenced by SRC-MAYU-CONF-004. See checklist #10 above and `source-maps/hr-staff-source-map-draft.md` §5.

---

## J. Employment-Stage [VERIFY] Count

**310 of 310** (100%). No HR-approved rule exists to derive Permanent/Probation/7-Day Training from the source data. See `source-maps/hr-staff-source-map-draft.md` §6.

---

## K. Shared KPI Model Result

**Confirmed at design level.** `database-design/staff-ph-kpi-staging-schema-draft.md` defines one shared table set for `kpi_definitions`, `kpi_assignments`, `kpi_result_values`, `kpi_evidence`, and `kpi_audit_history`. No `arun_*` / `paraparan_*` table pair exists anywhere in the design. Both roles are represented via an `actor_role`/`recorded_by_role` column on shared rows, not via separate storage. See `data-maps/ph-team-kpi-shared-data-map-draft.md` §8 for the requirement-to-design mapping. No table has been created, so this is a design-time guarantee, not a runtime one.

---

## L. Files Created

1. `member-aios/staff-data/source/raw/.gitkeep`
2. `member-aios/staff-data/source/normalized/hr-staff-dashboard.csv`
3. `member-aios/staff-data/data-maps/ph-team-kpi-shared-data-map-draft.md`
4. `member-aios/staff-data/database-design/staff-ph-kpi-staging-schema-draft.md`
5. `member-aios/staff-data/query-packs/staff-data-query-pack-draft.md`
6. `validation/staff-data-normalization-and-staging-design-check-2026-07-13.md` (this file)

---

## M. Files Edited

1. `.gitignore` — added the scoped raw-folder ignore rule (§D)
2. `member-aios/staff-data/README.md` — updated status, folder structure table, current-status section, added §9 Staff Data sidebar module design
3. `member-aios/staff-data/WORKBENCH.md` — updated build status, added §4a new findings, updated §5 next steps
4. `member-aios/staff-data/source-maps/hr-staff-source-map-draft.md` — rewritten to cover the new HR-provided PDF source, the two-source conflict with SRC-STAFF-001, and source data-quality findings
5. `member-aios/staff-data/data-maps/staff-field-map-draft.md` — rewritten to reflect this task's approved field list and the actual extraction method used

*(`member-aios/staff-data/database-design/staff-data-schema-draft.sql`, created in the prior session, was left untouched — not superseded, referenced from README.md §3 alongside the new design.)*

---

## N. Database Changes

**NONE.** Confirmed by checklist #13.

---

## O. Application Code Changes

**NONE.** Confirmed by checklist #14.

---

## P. Commit/Push

**NONE.** Confirmed by checklist #15. All changes remain uncommitted in the working tree.

---

## Q. Security Limitation Recorded

Per this task's explicit instruction, the following are **recorded, not resolved**, and did not block this task's documentation/CSV work:

- The GitHub repository (`mareenrajdigitweblanka-collab/management_aios`) is currently **public** (finding carried from `validation/staff-data-source-storage-discovery-check-2026-07-13.md`).
- The deployed backend API (`backend/main.py`) has **no real authentication** — CORS origin restriction only, which does not block direct (non-browser) HTTP requests.
- Security remediation has been **deferred by the user** for this task.
- **Real staff API deployment remains a later, separate approval step** — this task built normalization, documentation, and design artifacts only, none of which are deployed or database-backed.

---

## R. Duplicate-Truth Risk

Expanded from the prior discovery check, now including source-content-level findings from this task:

1. **SRC-STAFF-001 (125 rows) vs. HR-provided PDF (310 rows)** — two different HR extracts, not reconciled. See `source-maps/hr-staff-source-map-draft.md` §2.
2. **In-repo duplicate PDF copy** at `member-aios/mayurika-hr/staff-data/source/raw/` — confirmed byte-identical to the outside-git source used (§B), still untracked and unregistered, still Mayurika's decision to resolve.
3. **5 duplicate `employee_number` values within the HR-provided PDF itself** (`DWL302` reused 3×; `DWL296`/`DWL303`/`DWL305`/`DWL319` reused 2× each — 11 rows total) — a genuine source data-entry defect, confirmed by direct inspection of the source text (not a parsing artifact). The staging schema design explicitly does **not** assume `employee_number` uniqueness because of this (see `database-design/staff-ph-kpi-staging-schema-draft.md` §1).
4. **Paraparan's designation conflict** — "External Auditor" (SRC-ARUN-CONF-001) vs. "Accountant" (HR-provided PDF, row `DWL310`). Flagged `[VERIFY]`, not resolved.

None of these are resolved by this task. All require HR (Mayurika) and/or Arun review.

---

## S. PASS / AMBER / FAIL

**AMBER.**

- All 16 verification checklist items pass cleanly (structure, exclusion rules, PH normalization, employment-stage flagging, shared KPI design, and the no-database/no-code/no-commit constraints all hold).
- **AMBER, not PASS**, because: (a) the underlying HR data has open items requiring human resolution before this staging area can move toward real deployment — two-source conflict, 5 duplicate employee IDs, no employment-stage rule, and a designation conflict for Paraparan; and (b) the pre-existing security findings from the prior discovery check remain open by design (recorded, deferred per instruction, not blocking this task).
- Not FAIL, because every constraint this task was actually bound by (excluded fields, PH evidence, `[VERIFY]` discipline, no DB/code/commit changes) was met and verified, and no new exposure was introduced (the raw PDF was never copied into the repo or into any tracked location).

**Recommended next actions (outside this task's scope):** route to Mayurika for the HR-side findings (§Q's companion, item R), route to Arun for the KPI `[VERIFY]` items and Paraparan's designation, and keep the security remediation from `validation/staff-data-source-storage-discovery-check-2026-07-13.md` on the list for whenever the user chooses to act on it.

---
name: staff-data-public-repo-pii-remediation-check
type: validation
created: 2026-07-13
status: PASS — remediation verified; real CSV protected; synthetic sample created; no push performed
source-boundary: member-aios/staff-data/source/normalized/hr-staff-dashboard.csv, member-aios/staff-data/source/sample/hr-staff-dashboard-sample.csv
root-truth: CLAUDE.md — canonical
---

# Staff Data Public-Repository PII Remediation — Check — 2026-07-13

**Task type:** Replace public-repository PII asset with a safe development sample.
**Task boundary:** No file printed real employee rows to the conversation; no real name or NIC copied into the sample; the real local CSV was not deleted; the raw HR PDF was not staged or pushed; `.env` was not touched; no database migration ran; no application code was edited; no remote git history was rewritten; nothing was committed or pushed by this task.

---

## Background

A local commit (`052bda5`, "Add staff data staging assets") containing the real `hr-staff-dashboard.csv` — 310 real employees' full names and NIC numbers — was prepared and locally committed on `main`. Before push, an automated data-exfiltration safety check **blocked the push**, because `origin/main` is a confirmed-public GitHub repository (per `validation/staff-data-source-storage-discovery-check-2026-07-13.md`). The commit was never pushed; `origin/main` remained at `e27be2c` throughout.

This remediation replaces that approach with a real/synthetic split so the repository never receives real employee-level data while the staging documentation and design work remain usable.

---

## Verification Checklist

| # | Check | Result |
|---|---|---|
| 1 | Local blocked commit unwound, remote unaffected | **PASS** — `git reset --mixed e27be2c` returned the branch tip to `e27be2c`; `origin/main` confirmed at `e27be2c` both before and after; `052bda5` is no longer the branch tip; no push occurred at any point |
| 2 | Real CSV remains present on disk | **PASS** — `member-aios/staff-data/source/normalized/hr-staff-dashboard.csv` still exists, unmodified, unchanged from the version verified in `validation/staff-data-normalization-and-staging-design-check-2026-07-13.md` |
| 3 | Real CSV is git-ignored | **PASS** — `.gitignore` now includes `member-aios/staff-data/source/normalized/hr-staff-dashboard.csv`; `git check-ignore -v` confirms the rule matches |
| 4 | Real CSV is not tracked | **PASS** — `git ls-files` returns zero matches for `hr-staff-dashboard.csv` |
| 5 | Synthetic sample CSV structure | **PASS** — `member-aios/staff-data/source/sample/hr-staff-dashboard-sample.csv`: 10 rows, exactly the 16 approved columns, in the same order as the real CSV |
| 6 | Synthetic sample coverage | **PASS** — covers Active/Inactive status, PH and 5 distinct non-PH teams (Digital Marketing, Technical Team, eBay, Accounts, Customer Service), all three approved employment stages (Permanent, Probation, training_7_day) plus `[VERIFY]`, 4 distinct locations (Jaffna, Nelliyadi, Chankanai, WFH), and 7 distinct designations |
| 7 | Synthetic sample contains no real-pattern data | **PASS** — scanned for 9-digit+V/12-digit NIC patterns, email patterns, phone-like digit runs, and real `DWL###`-style employee numbers: zero matches. All identifiers are `SAMPLE###`, all names are `Sample Staff N`, all NIC values are `SAMPLE-NIC-###` or blank |
| 8 | Raw PDF not staged or tracked | **PASS** — `git ls-files` returns zero `.pdf` matches |
| 9 | No new real staff-name/NIC content introduced into documentation this session | **PASS** — `README.md`, `WORKBENCH.md`, `source-maps/hr-staff-source-map-draft.md`, and `data-maps/staff-field-map-draft.md` (the four files edited this session) scanned for NIC patterns: zero. `DWL###`-style employee-code references appear in `WORKBENCH.md` and the source map, but these are pre-existing content (the duplicate-employee-ID finding, already reviewed and approved in the prior business-review-pack task) — no full name or NIC is attached to any of those mentions, and no new such reference was added this session |
| 10 | `.env` untouched | **PASS** — `git status --short .env` returns no output |
| 11 | No database/application execution | **PASS** — `git status --short backend/ web-view/ database/` returns no output |
| 12 | `git diff --check` passes | **PASS** — exit code 0, no whitespace errors |

---

## What Changed vs. What Did Not

**Changed:**
- `.gitignore` — added the real-CSV exclusion rule
- `member-aios/staff-data/README.md`, `WORKBENCH.md`, `source-maps/hr-staff-source-map-draft.md`, `data-maps/staff-field-map-draft.md` — updated to document the real/synthetic split
- New file: `member-aios/staff-data/source/sample/hr-staff-dashboard-sample.csv`
- New file: this validation report

**Unchanged (per task instruction, verified):**
- HR remains the sole authoritative source (CLAUDE.md §9.1) — restated, not altered, in all four updated documents
- The real CSV's 310-row count — the file itself was not modified
- The 42-row PH-Team normalization finding — untouched in the real CSV; restated (not recalculated) in documentation
- The 310/310 `employment_stage = [VERIFY]` finding — untouched in the real CSV; restated in documentation
- The shared Arun/Paraparan PH KPI model design (`data-maps/ph-team-kpi-shared-data-map-draft.md`, `database-design/staff-ph-kpi-staging-schema-draft.md`) — not modified by this task
- Database-design draft status — both `database-design/*.sql` and `*.md` files remain unexecuted drafts; not applied

---

## What This Remediation Does Not Do

- Does not resolve the underlying HR/KPI `[VERIFY]` items from the business review pack (source reconciliation, duplicate employee IDs, Paraparan's designation, employment-stage rule, PH KPI business rules) — those remain open, tracked in `member-aios/staff-data/evidence/`.
- Does not make the repository private — that remains a separate, deferred decision (see `validation/staff-data-source-storage-discovery-check-2026-07-13.md`).
- Does not delete or move the real CSV — it remains at its original path, now git-ignored.
- Does not commit or push anything — see the parent task's Phase 6 (staging only, explicitly no commit).
- Does not resolve the SRC-STAFF-001 CSV's own pre-existing public exposure (already tracked and pushed prior to this task, per the original discovery check) — that is a separate, already-flagged, unresolved finding.

---

## Verdict

**PASS** — the real CSV is confirmed protected (git-ignored, untracked, unmodified, still present locally), the synthetic sample is confirmed structurally correct and free of any real-pattern data, no raw PDF or credential was staged or touched, no database or application execution occurred, and all frozen findings (310 rows, 42 PH, 310 `[VERIFY]`, HR authority, shared KPI model, draft-only database design) remain exactly as previously verified.

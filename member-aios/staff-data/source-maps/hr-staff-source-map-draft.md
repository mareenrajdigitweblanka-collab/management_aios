---
name: hr-staff-source-map-draft
type: source-map
scope: member-aios/staff-data/ — dashboard-specific staging area
created: 2026-07-13
updated: 2026-07-13
status: DRAFT — normalization complete for the new PDF source; HR review pending; two-source reconciliation open
source-boundary: SRC-STAFF-001, HR-provided PDF roster (unregistered — see §1b), SRC-MAYU-CONF-002 through 006
root-truth: CLAUDE.md — canonical; this file is a documentation-only source map
---

# HR Staff Source Map (Draft) — 2026-07-13

**Root Truth Rule:** This file is a documentation-only source map for the dashboard-specific `member-aios/staff-data/` staging area. It does not replace CLAUDE.md and does not establish new company-wide policy. If this file contradicts CLAUDE.md, CLAUDE.md is correct.

**Storage scope note:** The approval to normalize a raw HR file and store the resulting CSV inside `member-aios/staff-data/` is a **dashboard-specific decision**, not company-wide HR policy.

---

## 1a. SRC-STAFF-001 (Previously Registered Source)

| Field | Value |
|---|---|
| Source Note | `intelligence-inbox/raw-stakeholder-documents/staff-data/staff-roster-source-note-2026-06-26.md` |
| Raw CSV | `intelligence-inbox/raw-stakeholder-documents/staff-data/Digitweblanka Staffs Data - Overall Staffs.csv` |
| Status | READY — HR-Confirmed Active Staff Roster Evidence (SRC-MAYU-CONF-002, 2026-06-26) |
| Row count | 125 active staff rows confirmed |
| Fields | Row No., Employee ID, Location, Full Name, Designation, Department/Team only — no EPF number, NIC, CV, or employment-stage data |

---

## 1b. HR-Provided PDF Roster (This Task's Source — Not Yet Registered)

Per this task's instruction, the source used for this normalization pass is **the HR-provided PDF available locally outside Git**:

| Field | Value |
|---|---|
| Authoritative local path (outside git, as instructed) | `C:\Users\Digit Web\Desktop\My projects\aios project for management\raw data for mini aios\Personal Target - HRD - 2 Total Staffs.pdf` |
| File | `Personal Target - HRD - 2 Total Staffs.pdf` (205,254 bytes, SHA256 `e45adc43...4305ef6c`) |
| Status | **NOT REGISTERED** — no Source ID exists for this file in `evidence/source-register.md`. It is used here as unregistered evidence for a documentation/normalization draft only, per CLAUDE.md §2 ("carries `[VERIFY]`... must not be treated as operational truth until verification is resolved"). Formal registration (a new SRC-ID) is a separate step for Mayurika/HR to authorize. |
| Row count | 310 employee rows parsed (across 4 data-bearing pages; the PDF also contains 8 further pages of empty pre-formatted template rows with no data) |
| Fields present | EPF No. (header label — see data-quality note below), Date of Joining, Full Name, Location, Status (Active/Inactive), Calling Name, Department/Team, Designation, CV (filename reference), NIC, Address, Personal Email, Contact Number, Guardian Number, Remark |
| Fields excluded from this dashboard | Address, Personal Email, Contact Number, Guardian Number — never copied into the normalized CSV or any file in this folder (see §7) |
| Filename note | The PDF's filename ("...2 Total Staffs.pdf") does not describe its actual contents (310 employee rows). This appears to be a mislabeled/reused filename, not a scope description — not corrected in this map, only noted. |

**A byte-identical copy of this same file** (confirmed by matching SHA256) also exists, untracked, inside the repository working tree at `member-aios/mayurika-hr/staff-data/source/raw/Personal Target - HRD - 2 Total Staffs.pdf` — this was already flagged as a duplicate-truth risk in the 2026-07-13 discovery check (see §3). Because the content is verified identical, this does not change the normalization result, but it is a second reason that duplicate location needs Mayurika's decision: it sits inside the repo tree (even though currently untracked and not committed).

---

## 2. Two-Source Conflict — Flagged, Not Resolved

SRC-STAFF-001 (125 rows, simple fields) and the HR-provided PDF (310 rows, richer fields) are **two different HR-provided extracts**, not the same data at different points in normalization:

| | SRC-STAFF-001 CSV | HR-Provided PDF (this task) |
|---|---|---|
| Row count | 125 (HR-confirmed active only) | 310 (appears to span 2015–2026, all statuses) |
| Status field | Not present as a column (HR confirmed all rows = active, out of band) | Present per-row: Active / Inactive (142 Active / 168 Inactive parsed) |
| EPF/NIC/CV/Remark | Not present | Present |
| Registered? | YES — SRC-STAFF-001 | NO — unregistered as of this task |

**This map does not attempt to reconcile the two sources.** Reconciling which is authoritative for which purpose (e.g., "active headcount" vs. "full historical roster with richer fields") is an HR decision, not a normalization-script decision. Both are referenced here; neither supersedes the other without Mayurika's confirmation.

---

## 3. Duplicate Staff-Master / Duplicate-Location Risk

Unchanged from the 2026-07-13 discovery check, plus one addition:

| # | Location | Status | Risk |
|---|---|---|---|
| 1 | `intelligence-inbox/raw-stakeholder-documents/staff-data/` (SRC-STAFF-001) | Registered, tracked in git, on `origin/main` | Authoritative for the 125-row active extract |
| 2 | `member-aios/mayurika-hr/staff-data/source/raw/Personal Target - HRD - 2 Total Staffs.pdf` | Untracked, unregistered, byte-identical to the outside-git PDF (§1b) | Duplicate copy sitting in-repo; needs Mayurika's decision (register, or remove in favor of the outside-git copy) |
| 3 | `raw data for mini aios/Personal Target - HRD - 2 Total Staffs.pdf` (outside git, parent folder) | Not part of any git repository; used as this task's source per instruction | Correct location for this kind of file — never copy it into the repo |
| 4 | `member-aios/staff-data/source/raw/` (this task's approved path) | Contains only `.gitkeep`; the raw PDF was intentionally **not** copied here | Raw file stays outside git entirely, per this task's instruction |
| 5 | `member-aios/staff-data/source/normalized/hr-staff-dashboard.csv` (this task's output) | Approved-columns-only normalized CSV, 310 rows | Derived from the PDF at §1b; not a replacement HR master. **As of the 2026-07-13 PII remediation, this file is git-ignored and local-only — never committed to the public repository.** See `README.md` §5a. |
| 6 | `member-aios/staff-data/source/sample/hr-staff-dashboard-sample.csv` (2026-07-13 remediation output) | Synthetic, 10 rows, same 16-column structure | Repository-committed development artifact — contains no real staff data. Not a source in the evidentiary sense; exists only to support UI/API/schema work without exposing PII. |

---

## 4. Source Data Quality Notes (HR-Provided PDF)

1. **"EPF No." column is mislabeled.** The PDF's header reads "EPF No." but every value in that column follows the `DWL###` staff-code pattern (e.g. `DWL001`, `DWL 302`), not a distinct government EPF number format. No separate, genuine EPF number is available anywhere in this source. Because of this, `employee_number` is populated from this column with high confidence (it is clearly a stable staff identifier), but `epf_number` is left `[VERIFY]` for every row — inventing a distinct EPF number from a mislabeled column would misrepresent the data. **HR must confirm** whether a true EPF number exists elsewhere before this column is ever treated as one.
2. **Duplicate `employee_number` values exist in the source itself** — this is a genuine source data-entry issue, confirmed by direct inspection of the PDF text, not a parsing artifact:
   - `DWL302` — reused for **3** different people (rows on pages 3 and 4)
   - `DWL296`, `DWL303`, `DWL305`, `DWL319` — each reused for **2** different people
   - 11 rows total are affected. **`employee_number` cannot be treated as a unique key until HR resolves these duplicates.** See the staging schema (`database-design/staff-ph-kpi-staging-schema-draft.md`) for how this is handled at the design level (uniqueness deferred, not assumed).
3. **111 of 310 rows have no NIC value** in the source (mostly recent 2025–2026 intern/short-tenure rows). Left blank — not fabricated.
4. **17 of 310 rows have no designation**, **14 have no department/team value**, **7 have no full name** (calling name only) in the source itself. Left blank — not inferred.
5. **2 rows could not be reliably parsed** for date-of-joining/location/status (structurally incomplete in the source text) — flagged `low_confidence_parse` in the `remarks` column of the normalized CSV for manual HR review.
6. **Department/Team field has many unnormalized spelling variants** — 80+ distinct raw strings were observed (e.g. "Digital Marketing" / "Digital marketing" / "digital marketing", "EBAY" / "Ebay" / "eBay" / "ebay de", "Technical" / "Technical team" / "Technical Team"). Only the PH-Team group was normalized in this pass (see §5) — all other variants are preserved as parsed, unnormalized, pending HR confirmation, consistent with the "normalize conservatively" instruction.
7. **CV reference is a filename string only** (e.g. `Nithushana cv final.pdf`), present for 44 of 310 rows. It is not a link or stored file — just a text reference to what the source PDF recorded, for traceability if HR later needs to locate the original CV.

---

## 5. PH Team Identifier Evidence

- Canonical department/team value for the Portfolio Holder team is **"PH"**, confirmed by Mayurika (SRC-MAYU-CONF-004, 2026-06-26) against SRC-STAFF-001, and applied here to the equivalent raw forms found in the HR-provided PDF.
- In the PDF, 42 of 310 rows were normalized to `department_team = "PH"` from the raw forms: `"Portfolio team"`, `"portfolio team"`, `"Portfolio"`, literal `"PH"`, and `"Intern - PH"` variants (the "Intern" qualifier from those rows is preserved in `remarks` as `ph_normalized_from:...`, not folded into `employment_stage` — see §6).
- Normalization was applied **only** to these confirmed/unambiguous forms. Ambiguous or unconfirmed department strings (e.g. "Amazon PPC", "Portfolio" combined with other words in a way the parser could not cleanly separate) were left as parsed raw text rather than guessed into "PH".
- No individual PH staff names are reproduced in this file, per the "no full name list copy" rule (§7).

---

## 6. Employment-Stage — No HR-Approved Rule Exists

The dashboard's required `employment_stage` values are **Permanent / Probation / 7-Day Training**. None of these three values, or any deterministic rule mapping them from `staff_status` (Active/Inactive) or free-text `Remark`/role-title content (e.g. "Intern", "rejoining", "Part time", "freelancing"), exist as an HR-approved rule.

**Per this task's instruction, `employment_stage` is not inferred.** All 310 rows carry `employment_stage = [VERIFY]` in the normalized CSV. Where the source text hinted at a stage-relevant qualifier (e.g. "Intern - PH", "(Part time)", "(freelancing)"), that raw hint remains visible in `department_team` or `remarks` for HR's reference — it is not used to set `employment_stage`.

**Next step:** Mayurika/HR must define the actual rule (e.g., "Active + no Intern/Part-time qualifier + tenure > 90 days = Permanent") before any row can be reclassified out of `[VERIFY]`.

---

## 7. Sensitivity Rule (Dashboard-Specific — Not Company Policy)

- **Excluded from the normalized CSV and this dashboard, always:** salary, home address, personal email, personal phone/contact number, guardian phone/number. Verified absent by direct column-content scan of the output CSV (see `validation/staff-data-normalization-and-staging-design-check-2026-07-13.md`).
- **Included, per this task's explicit approval:** employee_number, epf_number (currently all `[VERIFY]`), date_of_joining, full_name, calling_name, location, staff_status, department_team, designation, cv_reference, nic, remarks, employment_stage, source_file, source_page, source_row_reference.
- Full staff name lists must not be copied into `.md` documentation files in this folder — names exist only in the CSV (`source/normalized/hr-staff-dashboard.csv`), which is the dashboard's intended operational artifact.
- This map itself contains **zero** individual staff names.

---

## 8. What This Map Does Not Do

- Does not resolve the SRC-STAFF-001 vs. HR-PDF two-source conflict (§2).
- Does not register the HR-provided PDF as a formal Source ID — that requires Mayurika/HR authorization and an `evidence/source-register.md` update, outside this task's scope.
- Does not resolve the duplicate `employee_number` values found in the source (§4 item 2).
- Does not resolve the unconfirmed department/team variant groups outside the PH-Team mapping.
- Does not create any PostgreSQL object or import any row into a database.
- Does not resolve the duplicate-location risk at §3 item 2 (Mayurika's decision).

---

## 9. Next Step

Route this map to Mayurika (HR owner, per CLAUDE.md §18) for:

1. Confirming whether the HR-provided PDF should be formally registered as a new Source ID, and how it relates to SRC-STAFF-001 (§2).
2. Resolving the duplicate `employee_number` values (§4 item 2) — a genuine source data-entry defect.
3. Confirming a rule for `employment_stage` derivation (§6).
4. Confirming the remaining unconfirmed department/team variant groups (§4 item 6).
5. Deciding what to do with the in-repo duplicate PDF copy (§3 item 2).

*File updated: 2026-07-13 | See `validation/staff-data-normalization-and-staging-design-check-2026-07-13.md` for the full verification report.*

---
name: staff-field-map-draft
type: data-map
scope: member-aios/staff-data/ — dashboard-specific staging area
created: 2026-07-13
updated: 2026-07-13
status: DRAFT — field mapping applied to produce source/normalized/hr-staff-dashboard.csv
source-boundary: HR-provided PDF (unregistered — see source-maps/hr-staff-source-map-draft.md §1b)
root-truth: CLAUDE.md — canonical; this file is a documentation-only field map
---

# Staff Field Map (Draft) — 2026-07-13

**Root Truth Rule:** This file maps the HR-provided PDF's raw columns to the approved normalized CSV shape (`source/normalized/hr-staff-dashboard.csv`). It does not import data into any database and does not replace HR (Mayurika) as the authoritative source (CLAUDE.md §9.1).

**Public-repository note (2026-07-13):** The 16-column shape mapped below applies to two files with the same structure but different contents: the **real** `source/normalized/hr-staff-dashboard.csv` (real staff data, git-ignored, local-only) and the **synthetic** `source/sample/hr-staff-dashboard-sample.csv` (invented `SAMPLE###` data, committed to the repository for UI/API/schema development). This field map's column definitions apply to both; the row-level content described in the rest of this file (real names, real NIC values, real counts) describes the real CSV only. See `README.md` §5a for the full distinction.

---

## 1. Raw → Normalized Field Map

| PDF Raw Column | Notes | Normalized Column | Included? |
|---|---|---|---|
| "EPF No." (values are `DWL###` staff codes, not true EPF numbers) | See data-quality note in source map §4.1 | `employee_number` | YES — high confidence |
| *(no genuine EPF number column exists)* | Header is mislabeled; not fabricated | `epf_number` | YES — column exists, value `[VERIFY]` for all 310 rows |
| Date of Joining | Some values include parenthetical rejoin notes, e.g. "(01/04/2024-rejoining)" — only the primary date is captured | `date_of_joining` | YES |
| Full Name | 7 of 310 rows have no full name in source (calling name only) — left blank | `full_name` | YES |
| Calling Name | Single-token heuristic; a trailing single-letter middle initial (e.g. "Dilakshiga J") is folded in | `calling_name` | YES |
| Location | Controlled vocabulary observed: Jaffna, Nelliyadi, Chankanai, WFH | `location` | YES |
| Status | Active / Inactive | `staff_status` | YES |
| Department / Team | 80+ raw spelling variants; only the PH-Team group normalized (see source map §5) | `department_team` | YES |
| Designation | Matched against a list of known role-title keywords; 17 rows have no designation in source | `designation` | YES |
| CV | Filename-like reference (e.g. "Nithushana cv final.pdf"); present for 44 of 310 rows | `cv_reference` | YES |
| NIC | Old format (9 digits + V/X) or new format (12 digits); 111 of 310 rows blank in source | `nic` | YES |
| Remark (free text) + parser flags | Source remarks were mostly leave-day notes tied to address/phone lines and were not reliably separable without risking excluded-field leakage, so they were not carried over; this column instead carries parser-generated flags (`low_confidence_parse`, `ph_normalized_from:...`) | `remarks` | YES — repurposed, see §4 |
| *(no employment-stage column exists)* | No HR-approved derivation rule — see source map §6 | `employment_stage` | YES — value `[VERIFY]` for all 310 rows |
| *(derived, not a source column)* | Literal constant | `source_file` | YES — `"Personal Target - HRD - 2 Total Staffs.pdf"` |
| *(derived, not a source column)* | PDF page number (1–4) | `source_page` | YES |
| *(derived, not a source column)* | `page{N}-row{M}-{employee_number}` — a synthetic per-row anchor for traceability back to the source | `source_row_reference` | YES |
| Address | — | — | **EXCLUDED — never captured, verified absent** |
| Personal Email address | — | — | **EXCLUDED — never captured, verified absent** |
| Contact number | — | — | **EXCLUDED — never captured, verified absent** |
| Guardian Number | — | — | **EXCLUDED — never captured, verified absent** |
| *(no salary column exists in the source)* | — | — | **EXCLUDED — not present in source, and would be excluded regardless (CLAUDE.md §6)** |

---

## 2. Extraction Method (For Reproducibility, Not a Design Decision)

The CSV was produced by a regex/heuristic parser (`parse_hr_pdf.py`, kept in the working session's scratchpad, not part of this repository) run against the exact text of the four data-bearing PDF pages. Method summary:

1. Split page text into per-employee chunks using the `DWL###`-style employee-code pattern as a row anchor.
2. Within each chunk, extract date-of-joining (date regex), location (controlled vocabulary), staff_status (Active/Inactive), NIC (old/new format regex), and cv_reference (filename pattern) as high-confidence anchors.
3. The unstructured text between status and the next anchor was split into calling_name (first token, optionally plus a single-letter initial) + department_team + designation (designation matched against a list of ~40 known role-title keywords).
4. **Excluded-field safety net:** email and long digit runs (phone-like) were used as additional cut points, and as a final hard-strip pass, so no address/email/phone content could ever land in an included column even if the primary parsing logic mis-split a row. Verified zero leaks across all 310 rows (see validation report).
5. PH-Team normalization applied only to the confirmed raw forms (source map §5).
6. Rows where date/location/status could not all be found were flagged `low_confidence_parse` rather than guessed.

This method is disclosed here so HR/technical reviewers can assess confidence per field, not as a permanent pipeline — a production import (if authorized later) should use a more robust, reviewed extraction approach, ideally with HR spot-checking a sample against the source PDF.

---

## 3. Full-Name / NIC Handling Rule

Unlike the previous draft (based on SRC-STAFF-001, which restricted names to aggregate-only use), **this task's approved field list explicitly includes `full_name` and `nic`** as dashboard fields. Accordingly:

- `full_name` and `nic` exist as real per-row values in `source/normalized/hr-staff-dashboard.csv` — this is the dashboard's intended operational purpose.
- No `.md` documentation file in `member-aios/staff-data/` enumerates staff names or NIC values in bulk. This field map and the source map contain zero staff names.
- The CSV must stay inside `member-aios/staff-data/source/normalized/` (or a future PostgreSQL staging table) — never copied into a markdown documentation file, and never placed under `web-view/`, `public/`, `static/`, or any deployed frontend path.

---

## 4. Remarks Column — Repurposed for Data-Quality Flags

The approved `remarks` column is used in this normalized CSV to carry **parser/data-quality flags**, not free-text HR remarks from the source (those were entangled with address/phone text in a way that risked excluded-field leakage if carried over). Values seen:

| Flag | Meaning | Row count |
|---|---|---|
| *(empty)* | Parsed with high confidence, no PH normalization applied | 266 |
| `low_confidence_parse` | Date/location/status could not all be identified — needs manual HR review against the source PDF | 2 |
| `ph_normalized_from:<raw value>` | `department_team` was normalized to "PH"; the original raw source value is preserved here for traceability | 42 |

---

## 5. Department/Team Normalization Dependency

Only the PH-Team group was normalized in this pass, per evidence (SRC-MAYU-CONF-004) and this task's explicit instruction to normalize "conservatively" and use PH "only where supported by evidence." All other department/team variants (eBay case variants, Technical Team variants, Digital Marketing case variants, etc.) are preserved exactly as parsed — unnormalized — pending Mayurika's confirmation of each remaining group.

---

## 6. What This Map Does Not Do

- Does not import any row into a database.
- Does not resolve the remaining unconfirmed department/team variant groups.
- Does not derive `employment_stage` — every row is `[VERIFY]`.
- Does not resolve duplicate `employee_number` values found in the source (see source map §4.2).
- Does not treat the normalized CSV as a replacement HR master.

---

## 7. Next Step

See `source-maps/hr-staff-source-map-draft.md` §9 for the consolidated next-step list (HR/Mayurika review required before this CSV is used for anything beyond dashboard-design and staging-schema work).

*File updated: 2026-07-13.*

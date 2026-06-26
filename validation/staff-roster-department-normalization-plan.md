---
name: staff-roster-department-normalization-plan
type: validation
source-id: SRC-STAFF-001
created: 2026-06-26
last-updated: 2026-06-26
status: CONFIRMED — all 22 variant groups confirmed; final display names confirmed by SRC-MAYU-CONF-006; 1 row-level correction recorded
---

# Staff Roster Department Normalization Plan

**Pass/Fail Rule:** PASS if only HR-confirmed canonical names are used. FAIL if unconfirmed variant groups are treated as normalized.

**Sensitivity:** Aggregate department distribution only. No individual staff names to be reproduced here.

**Raw data source:** SRC-STAFF-001 — `intelligence-inbox/raw-stakeholder-documents/staff-data/Digitweblanka Staffs Data - Overall Staffs.csv`

**Canonical name confirmation sources:**
- SRC-MAYU-CONF-003 (2026-06-26) — 2 groups confirmed (eBay, Technical Team)
- SRC-MAYU-CONF-004 (2026-06-26) — 19 remaining groups confirmed; PH canonical correction; 1 row-level correction (DWL 151)
- SRC-MAYU-CONF-005 (2026-06-26) — Amazon mapping correction: Amazon and Amazon PPC are separate normalized values (supersedes the combined Amazon/Amazon PPC row in SRC-MAYU-CONF-004)
- SRC-MAYU-CONF-006 (2026-06-26) — Final display-name/casing confirmation for all 13 casing-pending labels; draft labels accepted as HR-confirmed final display names

---

## Confirmed Canonical Mappings

### Confirmed by SRC-MAYU-CONF-003

| CSV Variants Found | Confirmed Canonical Name | Combined Row Count | Confirmation Source | Status |
|--------------------|--------------------------|-------------------|---------------------|--------|
| EBAY / EBay / Ebay / eBay | eBay | 8 (EBAY:3, EBay:2, Ebay:2, eBay:1) | SRC-MAYU-CONF-003 | CONFIRMED |
| Technical / Technical Team / Technical team | Technical Team | 6 (Technical:4, Technical Team:2, Technical team:1) | SRC-MAYU-CONF-003 | CONFIRMED |

### Confirmed by SRC-MAYU-CONF-004

**Critical canonical name correction — PH:**

| CSV Variants Found | Confirmed Canonical Name | Combined Row Count (approx) | Confirmation Source | Status | Note |
|--------------------|--------------------------|----------------------------|---------------------|--------|------|
| Portfolio team / portfolio team / PH / Portfolio holders | **PH** | ~24 | SRC-MAYU-CONF-004 | CONFIRMED | HR confirmed PH is the default canonical name; do not use Portfolio Team |

**Newly confirmed batch — Priority 1 (Largest groups):**

| CSV Variants Found | Confirmed Canonical Name | Combined Row Count (approx) | Confirmation Source | Status |
|--------------------|--------------------------|----------------------------|---------------------|--------|
| Digital Marketing / Digital marketing | Digital Marketing | ~13 | SRC-MAYU-CONF-004 / SRC-MAYU-CONF-006 | CONFIRMED — display name confirmed by HR (SRC-MAYU-CONF-006) |
| Amazon | Amazon | ~3 | SRC-MAYU-CONF-005 | CONFIRMED — Amazon is a separate department; do not group with Amazon PPC |
| Amazon PPC | Amazon and CPPC | ~3 | SRC-MAYU-CONF-005 | CONFIRMED — Amazon PPC normalizes to Amazon and CPPC; see also DWL 151 row-level correction |

> **CORRECTION NOTE (SRC-MAYU-CONF-005, 2026-06-26):** The earlier SRC-MAYU-CONF-004 record grouped `Amazon / Amazon PPC` as a single same-meaning group with canonical name `Amazon and CPPC`. This was incorrect. Mayurika verbally confirmed on 2026-06-26 that Amazon and Amazon PPC are separate department values. Amazon remains Amazon; only Amazon PPC normalizes to Amazon and CPPC. Do not group Amazon and Amazon PPC together in any cleaned view or distribution report.
| Management | Management | 7 | SRC-MAYU-CONF-004 | CONFIRMED |
| CPPC | CPPC | 5 | SRC-MAYU-CONF-004 | CONFIRMED — abbreviation confirmed as used |

**Newly confirmed batch — Priority 2 (Intern groupings):**

| CSV Variants Found | Confirmed Canonical Name | Combined Row Count (approx) | Confirmation Source | Status |
|--------------------|--------------------------|----------------------------|---------------------|--------|
| Intern - PH | Intern - PH | ~7 | SRC-MAYU-CONF-004 / SRC-MAYU-CONF-006 | CONFIRMED — display name confirmed by HR (SRC-MAYU-CONF-006) |
| Intern - Automation Technical | Intern - Automation Technical | ~3 | SRC-MAYU-CONF-004 / SRC-MAYU-CONF-006 | CONFIRMED — display name confirmed by HR (SRC-MAYU-CONF-006) |
| Intern - eBay | Intern - eBay | ~1 | SRC-MAYU-CONF-004 | CONFIRMED |
| Intern -merchandizing | Intern - Merchandising | ~1 | SRC-MAYU-CONF-004 / SRC-MAYU-CONF-006 | CONFIRMED — display name confirmed by HR (SRC-MAYU-CONF-006) |
| Software intern | Software intern | ~1 | SRC-MAYU-CONF-004 / SRC-MAYU-CONF-006 | CONFIRMED — display name confirmed by HR (SRC-MAYU-CONF-006) |

**Newly confirmed batch — Priority 3 (Ambiguous / multi-variant groups):**

| CSV Variants Found | Confirmed Canonical Name | Combined Row Count (approx) | Confirmation Source | Status |
|--------------------|--------------------------|----------------------------|---------------------|--------|
| Development team / Development / Developing | Development team | ~5 | SRC-MAYU-CONF-004 / SRC-MAYU-CONF-006 | CONFIRMED — display name confirmed by HR (SRC-MAYU-CONF-006); Developing is a data entry variant |
| Customer Service Team / Customer service team / CST | Customer Service Team | ~4 | SRC-MAYU-CONF-004 | CONFIRMED — CST is abbreviation of same team |
| Automation Technical (IOT) / Automation Technical / Automation Technical-rejoiner | Automation Technical | ~4 | SRC-MAYU-CONF-004 / SRC-MAYU-CONF-006 | CONFIRMED — display name confirmed by HR (SRC-MAYU-CONF-006); (IOT) and -rejoiner are data entry variants excluded from canonical name |
| Data Analysis / Data Analysis(nelliyadi) | Data Analysis | ~3 | SRC-MAYU-CONF-004 | CONFIRMED — nelliyadi is a location tag, not part of canonical name |
| Accounts / Accounts department / Accountant | Accounts | ~3 | SRC-MAYU-CONF-004 / SRC-MAYU-CONF-006 | CONFIRMED — display name confirmed by HR (SRC-MAYU-CONF-006) |
| merchandising / Merchadising / Intern -merchandizing | merchandising | ~3 | SRC-MAYU-CONF-004 / SRC-MAYU-CONF-006 | CONFIRMED — display name confirmed by HR (SRC-MAYU-CONF-006); Merchadising is a typo; Intern -merchandizing is intern subgroup |

**Newly confirmed batch — Priority 4 (Single variants):**

| CSV Variants Found | Confirmed Canonical Name | Combined Row Count (approx) | Confirmation Source | Status |
|--------------------|--------------------------|----------------------------|---------------------|--------|
| Website team | Website Team | 2 | SRC-MAYU-CONF-004 / SRC-MAYU-CONF-006 | CONFIRMED — display name confirmed by HR (SRC-MAYU-CONF-006) |
| Postage | Postage | 4 | SRC-MAYU-CONF-004 | CONFIRMED |
| Graphic Designing | Graphic Designing | 4 | SRC-MAYU-CONF-004 | CONFIRMED |
| IT team | IT Team | 1 | SRC-MAYU-CONF-004 / SRC-MAYU-CONF-006 | CONFIRMED — display name confirmed by HR (SRC-MAYU-CONF-006) |
| SEO Specialist | SEO Specialist | 1 | SRC-MAYU-CONF-004 / SRC-MAYU-CONF-006 | CONFIRMED — display name and team label confirmed by HR (SRC-MAYU-CONF-006) |

**Newly confirmed batch — Priority 5 (External / specialist):**

| CSV Variants Found | Confirmed Canonical Name | Combined Row Count (approx) | Confirmation Source | Status |
|--------------------|--------------------------|----------------------------|---------------------|--------|
| ledsone canada/USA / Ledsone canada | ledsone canada/USA | 2 | SRC-MAYU-CONF-004 / SRC-MAYU-CONF-006 | CONFIRMED — display name confirmed by HR (SRC-MAYU-CONF-006) |
| Wayfair/Temu | Wayfair/Temu | 1 | SRC-MAYU-CONF-004 | CONFIRMED |

---

## Row-Level Corrections

The following row-level correction is recorded as HR-confirmed correction evidence. The raw CSV remains unchanged.

| Employee ID | Current CSV Department Value | HR-Confirmed Correct Value | Confirmation Source | Boundary |
|---|---|---|---|---|
| DWL 151 | Amazon PPC | Amazon and CPPC | SRC-MAYU-CONF-004 | Correction evidence only — raw CSV must not be changed |

---

## Embedded Artefact Rows (not department entries — exclude from counts)

| Value in Department / Team field | Rows | Action |
|----------------------------------|------|--------|
| "Department / Team" | 2 | Exclude — embedded column header from spreadsheet formatting |
| (blank) | 0 confirmed in dept column | N/A |

---

## Normalization Summary

| Category | Count |
|---|---|
| Confirmed variant groups (SRC-MAYU-CONF-003) | 2 |
| Confirmed variant groups (SRC-MAYU-CONF-003) | 2 |
| Confirmed variant groups (SRC-MAYU-CONF-004 — batch, excl. Amazon correction) | 18 |
| Confirmed variant groups (SRC-MAYU-CONF-005 — Amazon correction, 2 separate entries) | 2 |
| Total confirmed variant groups | 22 |
| Final display names confirmed (SRC-MAYU-CONF-006) | 13 of 22 |
| Groups with all confirmations complete (meaning + display name) | 22 |
| Unconfirmed variant groups | 0 |
| Casing-pending groups remaining | 0 |
| Row-level corrections recorded | 1 (DWL 151) |
| Artefact rows to exclude | 2 |

---

## Next Action

All department/team variant groups are confirmed by HR (SRC-MAYU-CONF-003 through SRC-MAYU-CONF-006). All 22 confirmed variant groups have both meaning and final display name confirmed. No casing-pending labels remain.

**Amazon mapping correction (SRC-MAYU-CONF-005, 2026-06-26):** Amazon and Amazon PPC are separate confirmed entries. Do not group them. Do not use the combined mapping Amazon / Amazon PPC → Amazon and CPPC.

**Final display-name confirmation (SRC-MAYU-CONF-006, 2026-06-26):** All 13 previously casing-pending labels confirmed by HR. Draft labels accepted as final display names.

Remaining actions before proceeding to a cleaned staff roster:

1. DWL 151 correction (Amazon PPC → Amazon and CPPC) is recorded as correction evidence; raw CSV must not be changed.
2. Do not create a cleaned staff master yet — await explicit instruction and relevant Management Team/domain owner confirmation.
3. context/organization-structure.md may be updated at aggregate level after a cleaned view is explicitly approved.
4. See validation/staff-roster-amazon-mapping-correction-check.md for the Amazon correction validation record.
5. See validation/staff-roster-department-final-casing-confirmation-check.md for the final casing confirmation validation record.

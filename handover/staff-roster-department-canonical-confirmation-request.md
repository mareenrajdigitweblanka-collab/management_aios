---
name: staff-roster-department-canonical-confirmation-request
type: handover-request
source-id: SRC-STAFF-001
related-confirmations: SRC-MAYU-CONF-002, SRC-MAYU-CONF-003, SRC-MAYU-CONF-004
created: 2026-06-26
last-updated: 2026-06-26
status: CONFIRMATION RECEIVED — SRC-MAYU-CONF-004 (2026-06-26)
requested-from: Mayurika / HR owner
---

# Staff Roster Department / Team Canonical Confirmation Request

## HR Confirmation Received

Confirmation Source: SRC-MAYU-CONF-004
Date: 2026-06-26
Status: Received

All remaining groups confirmed as same-meaning/canonical groups, with these important corrections:

1. Portfolio team / portfolio team / PH / Portfolio holders must be normalized to **PH**. Do not use Portfolio Team as the canonical name.
2. DWL 151 current department value Amazon PPC should be treated as **Amazon and CPPC** for normalized analysis. Raw CSV is unchanged.

See: evidence/stakeholder-confirmations/mayurika-department-canonical-confirmation-batch-2026-06-26.md

---

## Status

CONFIRMATION RECEIVED — SRC-MAYU-CONF-004 (2026-06-26)

## Purpose

This request asks Mayurika / HR owner to confirm the official canonical department/team name for each remaining unconfirmed variant group found in the active staff roster (SRC-STAFF-001).

Once confirmed, the department normalization plan and — where appropriate — the organization-structure context file can be safely updated.

**Do not fill in guesses.** If the correct canonical name is not certain, mark the field `[VERIFY — canonical name not confirmed]`. If a value in the roster is not a department/team name (e.g. a role title or project name entered in error), mark it as: `Not a department/team — classify separately`.

---

## Already Confirmed

The following two mappings are confirmed and do not need re-confirmation.

| Values Found in CSV | Confirmed Canonical Name | Confirmation Source | Date |
|---------------------|--------------------------|---------------------|------|
| EBAY / EBay / Ebay / eBay | eBay | SRC-MAYU-CONF-003 | 2026-06-26 |
| Technical / Technical Team / Technical team | Technical Team | SRC-MAYU-CONF-003 | 2026-06-26 |

---

## Confirmation Needed

Please confirm the official canonical department/team name for each group below.

Fill in the **Confirmed Canonical Name** column. Leave **Confirmed By** and **Date** blank — they will be filled when the confirmation is received.

### Priority 1 — Largest Unconfirmed Groups

| Priority | Values Found in CSV | Approx Row Count | Confirmed Canonical Name | Confirmed By | Date | Notes |
|---|---|---:|---|---|---|---|
| 1 | Portfolio team / portfolio team | ~24 | | | | Case inconsistency only, or are these different entries? |
| 2 | Digital Marketing / Digital marketing | ~13 | | | | Case inconsistency only? |
| 3 | Amazon / Amazon PPC | ~6 | | | | Same team, or Amazon and Amazon PPC are separate? |
| 4 | Management | 7 | | | | Single variant — confirm this is the correct label |
| 5 | CPPC | 5 | | | | Is CPPC the canonical form, or is there a full name? |

### Priority 2 — Intern Groupings

| Priority | Values Found in CSV | Approx Row Count | Confirmed Canonical Name | Confirmed By | Date | Notes |
|---|---|---:|---|---|---|---|
| 6 | Intern - PH | ~7 | | | | Intern assigned to PH team — should this be grouped under PH team or listed as a separate intern category? |
| 7 | Intern - Automation Technical | ~3 | | | | Same question — group under Automation Technical or keep as separate intern row? |
| 8 | Intern - eBay | ~1 | | | | Group under eBay or separate intern row? |
| 9 | Intern -merchandizing | ~1 | | | | Group under Merchandising or separate intern row? |
| 10 | Software intern | ~1 | | | | Which team does this intern belong to, or separate intern category? |

### Priority 3 — Ambiguous / Multi-Variant Groups

| Priority | Values Found in CSV | Approx Row Count | Confirmed Canonical Name | Confirmed By | Date | Notes |
|---|---|---:|---|---|---|---|
| 11 | Development team / Development / Developing | ~5 | | | | Same unit? Developing may be a data entry error |
| 12 | Customer Service Team / Customer service team / CST | ~4 | | | | Are CST entries and the full-name entries the same team? |
| 13 | Automation Technical (IOT) / Automation Technical / Automation Technical-rejoiner | ~4 | | | | Same team? "rejoiner" appears to be a status tag, not a team name |
| 14 | Data Analysis / Data Analysis(nelliyadi) | ~3 | | | | Same team? Location embedded in one variant |
| 15 | Accounts / Accounts department / Accountant | ~3 | | | | Same unit, or are these different roles/teams? |
| 16 | merchandising / Merchadising / Intern -merchandizing | ~3 | | | | "Merchadising" is likely a typo — confirm canonical spelling |

### Priority 4 — Single Variants Requiring Label Confirmation

| Priority | Values Found in CSV | Approx Row Count | Confirmed Canonical Name | Confirmed By | Date | Notes |
|---|---|---:|---|---|---|---|
| 17 | Website team | 2 | | | | Correct label? Capitalization: Website Team? |
| 18 | Postage | 4 | | | | Confirm this is the correct canonical label |
| 19 | Graphic Designing | 4 | | | | Confirm this is the correct canonical label |
| 20 | IT team | 1 | | | | Correct label? IT Team? |
| 21 | SEO Specialist | 1 | | | | This appears to be a role title, not a department/team name — what is the correct department/team for this entry? |

### Priority 5 — External / Specialist Entries

| Priority | Values Found in CSV | Approx Row Count | Confirmed Canonical Name | Confirmed By | Date | Notes |
|---|---|---:|---|---|---|---|
| 22 | ledsone canada/USA / Ledsone canada | 2 | | | | Same unit? Correct canonical label including case and region? |
| 23 | Wayfair/Temu | 1 | | | | Standalone team, or sub-team of another department? |

---

## Confirmation Rules

- Confirm only the official department/team label as it should appear in canonical records.
- Do not add individual staff names.
- Do not create reporting-line authority or management hierarchy.
- Do not change company policy.
- If a value is not a department/team name (e.g. a role title, project name, or status tag entered in error), mark it: `Not a department/team — classify separately`.
- If genuinely unsure of the canonical name, mark it: `[VERIFY — canonical name not confirmed]`.

---

## What Happens After Confirmation

Once confirmed mappings are received:

1. A new confirmation source (SRC-MAYU-CONF-004 or similar) will be registered in evidence/source-register.md.
2. validation/staff-roster-department-normalization-plan.md will be updated — confirmed groups marked CONFIRMED.
3. Confirmed groups may be used for department-level aggregate analysis of SRC-STAFF-001.
4. context/organization-structure.md will only be updated after sufficient canonical names are confirmed and reviewed.

---

## Claude Usage Boundary

Claude may use confirmed mappings for:
- Aggregate department/team normalization of SRC-STAFF-001
- Department distribution summary (confirmed groups only)
- Organization-structure validation support (aggregate level)

Claude must not treat this request or any draft entries as:
- Confirmed canonical truth
- Final organization chart approval
- Reporting-line authority
- Admin Manager authority (awaiting SRC-ADMIN-001)
- KPI or performance evidence
- HR policy
- Parent AIOS truth

---

## Pass/Fail Rule

PASS if Mayurika confirms canonical names for each variant group.
FAIL if unconfirmed or draft names are treated as final department truth before confirmation is received and registered.

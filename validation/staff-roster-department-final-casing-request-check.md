---
name: staff-roster-department-final-casing-request-check
type: validation
sources: SRC-STAFF-001, SRC-MAYU-CONF-003, SRC-MAYU-CONF-004, SRC-MAYU-CONF-005, SRC-MAYU-CONF-006
created: 2026-06-26
status: PASS — HR confirmation received (SRC-MAYU-CONF-006, 2026-06-26); all 13 casing-pending labels confirmed
---

# Staff Roster Department Final Casing Request Check

## Status

**PASS — Updated 2026-06-26 (HR confirmation received, SRC-MAYU-CONF-006)** — All 13 casing-pending labels confirmed by Mayurika / HR owner (2026-06-26). Amazon mapping correction (SRC-MAYU-CONF-005) already applied. No meaning mappings changed. No raw data altered. No authority created.

---

## HR Confirmation Received

**Confirmation Source:** SRC-MAYU-CONF-006
**Confirmed By:** Mayurika / HR owner
**Date:** 2026-06-26
**Status:** Received

All 13 final display-name/casing labels are confirmed by Mayurika / HR owner. Draft labels accepted as final display names. Casing-pending count is now 0.

---

## Correction Note — Amazon Mapping (SRC-MAYU-CONF-005, 2026-06-26)

The combined mapping `Amazon / Amazon PPC → Amazon and CPPC` was rejected by HR (Mayurika, 2026-06-26).

Correct mapping:

- Amazon → Amazon
- Amazon PPC → Amazon and CPPC

This correction has been applied to:

- handover/staff-roster-department-final-casing-confirmation-request.md (Already Fully Confirmed table updated)
- validation/staff-roster-department-normalization-plan.md (combined row split into two separate confirmed rows)
- evidence/source-register.md (SRC-MAYU-CONF-005 registered)
- evidence/stakeholder-confirmations/mayurika-department-final-casing-and-amazon-correction-2026-06-26.md (correction confirmation created)
- validation/staff-roster-amazon-mapping-correction-check.md (correction validation check created)

---

## Request Created

handover/staff-roster-department-final-casing-confirmation-request.md

---

## Sources Used

- SRC-STAFF-001 — DigitWebLanka HR-confirmed active staff roster CSV
- SRC-MAYU-CONF-003 — Mayurika canonical name confirmation: eBay, Technical Team (2026-06-26)
- SRC-MAYU-CONF-004 — Mayurika canonical name confirmation: all remaining groups + PH + DWL 151 correction (2026-06-26)

---

## Labels Requiring Final Casing Confirmation

Total: 13 groups — all confirmed by SRC-MAYU-CONF-006 (2026-06-26).

| # | Values Found / Meaning Group | Current Draft Label | Casing Issue |
| --- | --- | --- | --- |
| 1 | Digital Marketing / Digital marketing | Digital Marketing | Title case vs sentence case |
| 2 | Development team / Development / Developing | Development team | Title case: Development Team? |
| 3 | Accounts / Accounts department / Accountant | Accounts | Label variant — Accounts vs Accounts Department |
| 4 | merchandising / Merchadising / Intern -merchandizing | merchandising | Lower case vs Merchandising |
| 5 | Website team | Website Team | Title case: Website Team? |
| 6 | IT team | IT Team | Title case: IT Team? |
| 7 | ledsone canada/USA / Ledsone canada | ledsone canada/USA | Lower case vs mixed case; full canonical label |
| 8 | Automation Technical (IOT) / Automation Technical / Automation Technical-rejoiner | Automation Technical | (IOT) suffix — include or exclude in canonical? |
| 9 | Intern - PH | Intern - PH | Casing of full label |
| 10 | Intern - Automation Technical | Intern - Automation Technical | Casing of full label |
| 11 | Intern -merchandizing | Intern - Merchandising | Spelling + casing of second word |
| 12 | Software intern | Software intern | Title case: Software Intern? |
| 13 | SEO Specialist | SEO Specialist | Role title vs team name — needs team placement clarification |

---

## Groups Already Fully Confirmed (No Casing Action Needed)

| Final Canonical Name | Source |
| --- | --- |
| eBay | SRC-MAYU-CONF-003 |
| Technical Team | SRC-MAYU-CONF-003 |
| PH | SRC-MAYU-CONF-004 |
| Amazon | SRC-MAYU-CONF-005 |
| Amazon and CPPC (for Amazon PPC rows) | SRC-MAYU-CONF-005 |
| Management | SRC-MAYU-CONF-004 |
| CPPC | SRC-MAYU-CONF-004 |
| Intern - eBay | SRC-MAYU-CONF-004 |
| Customer Service Team | SRC-MAYU-CONF-004 |
| Data Analysis | SRC-MAYU-CONF-004 |
| Postage | SRC-MAYU-CONF-004 |
| Graphic Designing | SRC-MAYU-CONF-004 |
| Wayfair/Temu | SRC-MAYU-CONF-004 |

---

## Safety Check

| Check | Result |
| --- | --- |
| Raw CSV changed? | NO — unchanged |
| Staff names copied into any file? | NO — aggregate use only |
| Context files updated? | NO — context/organization-structure.md not touched |
| Reporting authority created? | NO |
| Confirmed meaning mappings changed? | NO — meaning groups from SRC-MAYU-CONF-003 and SRC-MAYU-CONF-004 are unchanged |
| PH canonical mapping changed? | NO — preserved as confirmed |
| DWL 151 correction removed or altered? | NO — preserved in normalization plan |
| Project-level [VERIFY] items resolved? | NO |
| Policy changed? | NO |
| Automation added? | NO |
| Admin Manager [VERIFY] items 1–5 affected? | NO — remain open |
| Parent AIOS truth updated? | NO |

---

## Pass/Fail Rule

| Scenario | Result |
| --- | --- |
| Request asks only for display-name and casing confirmation; meaning groups unchanged | PASS |
| Confirmed meaning mappings changed | FAIL |
| Raw CSV changed | FAIL |
| Organization truth or reporting authority updated before casing is confirmed | FAIL |
| Draft casing labels treated as final canonical names | FAIL |

Result: PASS

---

## Next Action

All 13 display-name confirmations received (SRC-MAYU-CONF-006, 2026-06-26). Normalization plan updated. See validation/staff-roster-department-final-casing-confirmation-check.md for the full confirmation validation record. When explicitly instructed, a cleaned staff roster view and aggregate department distribution report may now be prepared — cite SRC-STAFF-001 and SRC-MAYU-CONF-002 through SRC-MAYU-CONF-006.

---
name: staff-roster-department-canonical-confirmation-check
type: validation
sources: SRC-STAFF-001, SRC-MAYU-CONF-002, SRC-MAYU-CONF-003
created: 2026-06-26
status: CONDITIONAL PASS — 2 of 15+ variant groups confirmed; remainder pending
---

# Staff Roster Department Canonical Confirmation Check

## Status

**CONDITIONAL PASS** — Two department/team canonical name mappings confirmed by Mayurika (SRC-MAYU-CONF-003, 2026-06-26). Remaining 15+ variant groups are unconfirmed and must not be treated as normalized.

## Sources

- SRC-STAFF-001 — DigitWebLanka HR-confirmed active staff roster CSV
- SRC-MAYU-CONF-002 — Mayurika active-staff status confirmation (2026-06-26)
- SRC-MAYU-CONF-003 — Mayurika department/team canonical name confirmation (2026-06-26)

---

## Confirmed Canonical Mappings

| Values Found in CSV | Confirmed Canonical Name | Combined Row Count | Source |
|---------------------|--------------------------|-------------------|--------|
| EBAY / EBay / Ebay / eBay | **eBay** | 8 | SRC-MAYU-CONF-003 |
| Technical / Technical Team / Technical team | **Technical Team** | 7 | SRC-MAYU-CONF-003 |

---

## Still Unconfirmed

The following variant groups remain [VERIFY — canonical name not confirmed]. They must not be treated as normalized or used in department-level aggregation until HR/Management confirms their canonical form.

| Variant Group | Approximate Row Count | Note |
|---|---|---|
| Portfolio team / portfolio team | ~24 | Largest unconfirmed group by count |
| Digital Marketing / Digital marketing | ~13 | Second largest |
| Amazon / Amazon PPC | ~6 | Same team or separate channels? |
| Management | 7 | Single variant; confirm label is correct |
| Intern - PH / Intern - Automation Technical / Intern - eBay / Intern -merchandizing / Software intern | ~13 | Policy question: group under host team or keep as Intern category? |
| CPPC | 5 | Confirm canonical abbreviation or full team name |
| Development team / Development / Developing | ~5 | Ambiguous — same unit or separate? |
| Postage | 4 | Single variant; confirm label is correct |
| Graphic Designing | 4 | Single variant; confirm label is correct |
| Customer Service Team / Customer service team / CST | ~4 | Abbreviation vs full name |
| Automation Technical (IOT) / Automation Technical / Automation Technical-rejoiner | ~4 | Rejoiner is a status, not a team name? |
| Data Analysis / Data Analysis(nelliyadi) | ~3 | Location embedded in team name |
| Accounts / Accounts department / Accountant | ~3 | Same unit or separate roles/teams? |
| Website team | 2 | Confirm correct capitalization |
| merchandising / Merchadising / Intern -merchandizing | ~3 | Likely typo (Merchadising) |
| ledsone canada/USA / Ledsone canada | 2 | Case and region canonical not confirmed |
| Wayfair/Temu | 1 | Standalone or sub-team? |
| IT team | 1 | Confirm: IT Team? |
| SEO Specialist | 1 | Role title entered as team name — confirm correct team label |

---

## What Can Now Be Used

| Use | Basis |
|-----|-------|
| eBay aggregate count (8 active staff) | SRC-STAFF-001 + SRC-MAYU-CONF-003 |
| Technical Team aggregate count (7 active staff) | SRC-STAFF-001 + SRC-MAYU-CONF-003 |
| Active staff total count (125 rows) | SRC-STAFF-001 + SRC-MAYU-CONF-002 |
| Location distribution (Jaffna 89, Nelliyadi 23, Chankanai 7, WFH 4) | SRC-STAFF-001 + SRC-MAYU-CONF-002 |

---

## What Still Cannot Be Used

| Prohibited Use | Reason |
|---|---|
| Final department distribution for unconfirmed groups | Canonical names not yet confirmed by HR |
| context/organization-structure.md update | Not until sufficient canonical names are confirmed |
| Final organization chart | Not in scope until all [VERIFY] items resolved and Management sign-off obtained |
| Reporting-line authority | Not established by staff roster data |
| Admin Manager authority | [VERIFY] items 1–5 remain open; awaiting SRC-ADMIN-001 |
| KPI or AXIOM performance status | Not in scope of staff roster |
| Policy truth | Source of policy is SRC-POLICY-001 |
| Parent AIOS truth | Requires full Management Team / domain owner sign-off |

---

## Safety Check

| Check | Result |
|-------|--------|
| Staff names copied into context or validation files? | NO |
| Raw CSV changed? | NO |
| Unconfirmed mappings treated as normalized? | NO — all listed as [VERIFY] |
| Reporting authority created? | NO |
| [VERIFY] items 1–5 (Admin Manager) affected? | NO — remain open |
| Any unrelated [VERIFY] item resolved? | NO |
| Policy changed? | NO |
| Automation added? | NO |
| Sensitive data exposed? | NO — aggregate summaries only |

---

## Pass/Fail Rule

| Scenario | Result |
|---|---|
| Two HR-confirmed mappings captured; all other variants remain [VERIFY] | PASS |
| Unconfirmed department mappings treated as normalized | FAIL |
| Staff names copied or sensitive data exposed | FAIL |

**Result: CONDITIONAL PASS** — Two mappings confirmed and captured safely. Remainder pending HR confirmation before department-level aggregation or context file updates can proceed.

---

## Next Action

Submit the next batch of unconfirmed variant groups to HR (Mayurika) for canonical name confirmation. Recommended priority order:

1. Portfolio team / portfolio team — largest group (~24 rows)
2. Digital Marketing / Digital marketing — second largest (~13 rows)
3. Intern groupings — requires policy decision on grouping method
4. Amazon / Amazon PPC — channel vs team distinction
5. CPPC — confirm full name or canonical abbreviation

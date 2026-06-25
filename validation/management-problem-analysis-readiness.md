---
name: management-problem-analysis-readiness
type: validation
created: 2026-06-25
tracks: skills/management-problem-analysis.md
status: CONDITIONAL PASS
---

# Management Problem Analysis Skill Readiness

**Pass/Fail Rule:** PASS if the skill is analysis-only, source-backed, and preserves all safety boundaries. FAIL if it makes management decisions or uses pending sources as evidence.

---

## Status

**CONDITIONAL PASS**

The skill file is analysis-only, source-backed, and preserves all 12 open [VERIFY] items. All safety boundaries confirmed. Pending Varmen review before operational use.

---

## Files Created

| File | Path | Status |
|------|------|--------|
| Skill File | `skills/management-problem-analysis.md` | CREATED — 2026-06-25 |
| Source Map | `validation/management-problem-analysis-source-map.md` | CREATED — 2026-06-25 |
| This File | `validation/management-problem-analysis-readiness.md` | CREATED — 2026-06-25 |

---

## Source Coverage

All sources used in this skill are READY registered sources from evidence/source-register.md.

| Source ID | Status | Used In Skill? |
|-----------|--------|----------------|
| SRC-VAR-001 | READY | YES — Documentation gaps, management file organisation, AIOS purpose and scope, confidentiality rules |
| SRC-MAYU-001 | READY | YES — Onboarding evidence gaps, KPI preparation gaps, recurring follow-up gaps, handover continuity gaps, reviewer routing |
| SRC-ARUN-001 | READY | YES — KPI review preparation gaps, forbidden types (bonus, PIP, AXIOM, Operational Manager PRC [VERIFY]) |
| SRC-ARUN-002 | READY | YES — KPI meeting gaps reference (daily checklist) |
| SRC-SUMAN-001-v2 | READY | YES — Recruitment process evidence gaps, recurring follow-up gaps, handover continuity gaps |
| SRC-POLICY-001 | READY — Final Approved | YES — Onboarding evidence gaps, leave visibility gaps, policy compliance evidence gaps, offboarding gaps |
| SRC-MD-HR-001 | READY — Varmen Reviewed 2026-06-25 | YES — Documentation gaps, LLM-queryable compliance gaps, management file organisation gaps, ROI evidence gaps, KPI preparation gaps |
| SRC-MD-SUMAN-001 | READY — Varmen Reviewed 2026-06-25 | YES — Recruitment process evidence gaps, ROI evidence gaps, handover continuity gaps, OLOS and BGCT gaps |
| SRC-SUMAN-CONF-001 | READY | YES — Limited to confirmed attendee list in handover continuity gap (Line Manager typing correction resolution) |
| SRC-ADMIN-001 | PENDING | NOT USED as evidence — referenced only as [VERIFY] block throughout skill |
| SRC-SUMAN-001-v1 | SUPERSEDED | NOT USED — correctly excluded |
| SRC-MAYU-002 | READY (org chart image) | NOT REQUIRED for this skill |

---

## [VERIFY] Preservation

All 12 open [VERIFY] items from context/verify-register.md are preserved and correctly applied in this skill.

| [VERIFY] Item # | Description | Preserved in Skill? | Notes |
|----------------|-------------|---------------------|-------|
| 1 | Admin Manager document | YES — Admin Manager is a forbidden problem type | SRC-ADMIN-001 PENDING |
| 2 | Admin Manager authority scope | YES — no Admin Manager authority asserted | SRC-ADMIN-001 PENDING |
| 3 | Admin Manager PRC role and authority | YES — no PRC routing through Admin Manager | SRC-ADMIN-001 PENDING |
| 4 | Admin Manager approval chains and escalation paths | YES — no escalation paths through Admin Manager | SRC-ADMIN-001 PENDING |
| 5 | Final escalation paths (through Admin Manager) | YES — final escalation is a forbidden problem type | SRC-ADMIN-001 PENDING |
| 6 | MD-specific requirements beyond Varmen relay | YES — skill marked Foundation Draft v0.1; may change after MD review | MD review pending |
| 7 | Final implementation scope | YES — skill marked Foundation Draft v0.1; not final | MD review pending |
| 8 | Amazon ACOS threshold wording | YES — Amazon ACOS threshold excluded from evidence; KPI gap section explicitly marked [VERIFY] | Arun direct confirmation pending |
| 9 | Operational Manager PRC membership and scope | YES — Operational Manager PRC routing excluded from reviewer routing guide; marked [VERIFY] | Arun direct confirmation pending |
| 10 | ROI Officer identity / title | YES — ROI Officer listed as [VERIFY] in forbidden types; VERIFY Resolved Candidate noted but tag preserved | Arun direct confirmation pending |
| 11 | Director authority beyond Leadership Review | YES — Director routing limited to confirmed Leadership Review role only; marked [VERIFY] | Dedicated Director source required |
| 12 | Exact tool names for HR and EOD systems | YES — no specific HR or EOD tool names asserted anywhere in skill | Mayurika confirmation required |

**[VERIFY] preservation result: 12 ITEMS OPEN — PASS**

No [VERIFY] item has been removed without registered source evidence. No [VERIFY] tag has been resolved by this skill.

---

## Resolved Correction

**Line Manager identity in 180-day handover — CONFIRMED RESOLVED. Not reintroduced.**

Former [VERIFY] item 11 (Line Manager identity in 180-day handover) was resolved on 2026-06-25 by SRC-SUMAN-CONF-001. Suman confirmed the "Line Manager" reference in SRC-SUMAN-001-v2 was a typing mistake. No Line Manager role exists in the 180-day handover. Confirmed attendees are Mayurika, Arun, and Suman only.

This correction is correctly applied in the skill:
- Handover continuity gap (Problem Type 9) lists confirmed attendees as Mayurika, Arun, and Suman
- SRC-SUMAN-CONF-001 is cited as the source for the Line Manager typing correction
- No Line Manager role appears anywhere in the skill
- The resolved item has not been re-added as a [VERIFY]

---

## Forbidden Actions Check

| Forbidden Action | Status |
|-----------------|--------|
| Makes decisions (HR, recruitment, KPI, disciplinary) | NONE — skill is analysis and evidence surfacing only |
| Approves escalation | NONE — final escalation is a forbidden problem type; escalation routes through Admin Manager are [VERIFY] |
| Automates any action | NONE — all outputs explicitly marked READY FOR REVIEW; no automated triggers |
| Stores sensitive personal data | NONE — forbidden inputs section and Step 1 reject sensitive personal data at intake |
| Finalizes Admin Manager authority | NONE — Admin Manager is a forbidden problem type; all Admin Manager claims are [VERIFY] |
| Finalizes Arun wording items (ACOS, Operational Manager, ROI Officer) | NONE — items 8, 9, 10 preserved as [VERIFY] throughout |
| Promotes content to parent AIOS truth | NONE — all outputs are draft only; promotion requires Varmen sign-off |
| Removes [VERIFY] tags without registered source evidence | NONE — no [VERIFY] tags removed |
| Invents policy rules, process steps, or governance logic | NONE — all claims cite registered Source IDs |
| Treats Foundation Draft v0.1 as final operational truth | NONE — skill header and status section explicitly state draft status |
| Treats MD discussion notes as company policy | NONE — SRC-MD-HR-001 and SRC-MD-SUMAN-001 are used as governance directives, not policy; SRC-POLICY-001 is the sole policy source |
| Uses unregistered sources | NONE — all source IDs appear in evidence/source-register.md |
| Connects to live HR or management systems | NONE — skill is documentation analysis only |
| Assigns blame to named staff | NONE — outputs are process-level only |

**Forbidden actions result: NO FORBIDDEN ACTIONS DETECTED — PASS**

---

## Sensitive Data Storage Check

| Data Type | Status |
|-----------|--------|
| Individually identifiable HR data | NOT STORED |
| Salary or compensation data | NOT STORED |
| Disciplinary case personal details | NOT STORED |
| Health or medical information | NOT STORED |
| Grievance records | NOT STORED |
| Raw PDPA personal data | NOT STORED |
| Individual AXIOM band placements for named staff | NOT STORED |
| Personal candidate data (CV, salary expectations) | NOT STORED |

**Sensitive data result: PASS**

---

## Decision-Making Check

| Decision Type | Status |
|---------------|--------|
| HR decisions | NONE |
| Hiring decisions | NONE |
| Probation confirmation decisions | NONE |
| Warning or PIP issuance | NONE |
| Bonus approval | NONE |
| Disciplinary decisions | NONE |
| Leave approval or denial | NONE |
| KPI band or AXIOM score decisions | NONE |
| Escalation approval | NONE |

**Decision-making result: NO DECISIONS MADE — PASS**

---

## Wrapper Needed?

**YES — after Varmen reviews and approves the skill draft.**

The Claude Code wrapper must not be created until:
1. Varmen reviews and approves this skill file
2. All forbidden problem types are confirmed correctly blocked
3. Dry-run test cases have been designed and approved

---

## Dry-Run Needed?

**YES — after wrapper is created.**

Required dry-run coverage:
- At least one test case per allowed problem type (13 cases minimum)
- At least one test case per forbidden problem type to confirm the block behavior
- At least one BLOCKED classification case to verify [VERIFY] enforcement
- One case involving an attempted sensitive data input to verify rejection at Step 1

---

## Tier 1 Skill Readiness File Update

`validation/tier-1-skill-draft-readiness.md` has been updated to include management-problem-analysis.md as a draft-only skill pending Varmen review. The original four Tier 1 skill PASS results are unchanged.

---

## Management Action Records Integration (2026-06-25 Update)

| Integration Check | Result |
|---|---|
| Management Action Records integration added to skill | YES — Management Action Records Reading Rule section added to skills/management-problem-analysis.md |
| Wrapper updated with action-records reading rule | YES — Management Action Records Check section added to .claude/skills/management-problem-analysis/SKILL.md |
| context/management-action-records-context.md added to wrapper required reading | YES |
| intelligence-inbox/management-action-records/INDEX.md added to wrapper required reading | YES |
| Existing MD discussion files not moved or duplicated | YES — md-discussion-notes/ folder is untouched; no content duplicated |
| Action records treated as evidence only | YES — skill and wrapper both carry explicit evidence-only boundary |
| Action records not treated as policy truth | YES — SRC-POLICY-001 remains the sole policy truth source |
| Person folder routing included in skill | YES — mayurika-hr/, arun-implementation/, rajiv-admin-manager/, suman-recruitment/ |
| Person folder routing included in wrapper | YES — same routing listed in wrapper Management Action Records Check section |
| Rajiv/Admin Manager [VERIFY] preserved in skill | YES — [VERIFY] items 1–5 explicitly preserved in action records reading rule |
| Rajiv/Admin Manager [VERIFY] preserved in wrapper | YES — wrapper section states [VERIFY — Admin Manager authority not yet confirmed] |
| Management Action Records Checked output field added to skill | YES — output template updated |
| Management Action Records Checked output field added to wrapper Required Output | YES — wrapper required output list updated |
| Source map updated with action records rows | YES — 12 new rows added to management-problem-analysis-source-map.md |
| 12 [VERIFY] items preserved (none resolved by this update) | YES — all 12 items in context/verify-register.md remain open |

---

## Pass/Fail Result

**CONDITIONAL PASS**

| Check | Result |
|-------|--------|
| Skill file created | PASS |
| Source map created | PASS |
| This readiness file created | PASS |
| All claims source-backed or [VERIFY] | PASS |
| All 12 [VERIFY] items preserved | PASS |
| No forbidden actions | PASS |
| No sensitive data stored | PASS |
| No decisions made | PASS |
| No escalation automated | PASS |
| No policy invented | PASS |
| No Admin Manager authority finalized | PASS |
| No Arun wording items resolved | PASS |
| Line Manager correction preserved (not reintroduced) | PASS |
| Skill marked Foundation Draft v0.1 | PASS |
| Management Action Records integration complete | PASS |
| Wrapper updated with action-records reading rule | PASS |
| Existing MD discussion files not moved | PASS |
| Action records treated as evidence only | PASS |
| Action records not treated as policy truth | PASS |
| 12 [VERIFY] items preserved after action records update | PASS |
| Safe for Varmen review | PASS (conditional) |

**Conditions before operational use:**
- Varmen review and sign-off required
- All [VERIFY] items that affect operational scope must be resolved before those sections are used
- MD review and sign-off required before v1.0 treatment
- Claude Code wrapper must be created and dry-run tested before any operational use

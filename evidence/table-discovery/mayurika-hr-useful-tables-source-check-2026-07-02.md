---
name: mayurika-hr-useful-tables-source-check-2026-07-02
type: table-discovery
member: Mayurika / Mayuri
role: HR Officer
created: 2026-07-02
status: DISCOVERY COMPLETE — read-only; no tables built; Mayurika review required before implementation
scope: evidence/table-discovery — source check only; do not treat as implementation plan
root-truth: CLAUDE.md — canonical; this file is a discovery evidence record only
sources-inspected: SRC-MAYU-001, SRC-POLICY-001, SRC-MD-HR-001, SRC-SUMAN-001-v2 (Month 6 boundary only)
---

# Mayurika HR Dashboard — Useful Tables Source Check (2026-07-02)

**Purpose:** Read-only discovery to identify which candidate HR tables are source-backed, safely inside Mayurika's domain, free of sensitive data risk, and clear of [VERIFY] blockers — before any table is built for the web-view dashboard.

**Root Truth Rule:** All claims in this file trace to registered sources. No table is built here. No data is included. No [VERIFY] items are resolved. This is an evidence record only.

**Sensitive Data Rule:** This file does not include individual staff names, salary data, health data, PDPA personal data, performance band scores, or candidate personal data. All content is process-level and policy-level.

---

## Source Files Inspected

| File | Source ID | Inspected For |
|---|---|---|
| `intelligence-inbox/raw-stakeholder-documents/mayurika-hr/HR.Mayu.Skill.md` | SRC-MAYU-001 | Staff record lifecycle, employment status values, PDPA tracking process, probation monitoring, review scheduling, KPIs |
| `intelligence-inbox/raw-stakeholder-documents/company-policy/Draft DIGIT WEB LANKA - Company Policy Manual.md` | SRC-POLICY-001 | Leave plan notice periods (§6.1), planned leave entitlements (§6.2), unplanned leave (§6.3), short leave (§6.4), maternity leave (§6.5), offboarding steps (§10.1–§10.8) |
| `intelligence-inbox/raw-stakeholder-documents/md-discussion-notes/MD & HR Discussion Notes.md` | SRC-MD-HR-001 | New employee ROI monitoring milestones (§10.9), developer ROI review (§10.10) |
| `member-aios/mayurika-hr/WORKBENCH.md` | Navigation reference | Domain scope and authority limits for Mayurika |
| `member-aios/mayurika-hr/quick-reference-sources.md` | Navigation reference | Source limits and known [VERIFY] items |
| `member-aios/mayurika-hr/daily-weekly-checklist.md` | Navigation reference | Active process steps Mayurika already performs |
| `context/hr-operations-context.md` | Context — SRC-MAYU-001 + SRC-POLICY-001 + SRC-MD-HR-001 | Leave policy detail (§9), MD governance standards (§10) |
| `context/confidentiality-rules.md` | Context — SRC-VAR-001 + SRC-MAYU-001 + SRC-POLICY-001 | Forbidden data types, permissible categories |
| `context/verify-register.md` | Context — all [VERIFY] items | Which open [VERIFY] items affect each candidate table |
| SRC-SUMAN-001-v2 sections via CLAUDE.md §8.7 | SRC-SUMAN-001-v2 | Month 1 employee status categories (Month 6 handover boundary only) |

---

## Table Candidate Assessments

---

### TABLE 1 — Leave Entitlement & Notice Periods

**Business question it answers:** What notice period is required for a given leave duration, and who is the approving authority?

**Mayurika use case:** Quick reference when staff ask about leave advance-notice rules; checklist step when reviewing leave requests; confirms whether a leave request meets the minimum notice threshold.

**Source ID and exact section:**
- SRC-POLICY-001 §6.1 — Leave Plan Notice Periods table (verbatim from source)
- SRC-POLICY-001 §6.2 — Planned Leave entitlements (probation restriction, junior/senior day entitlement)
- Cross-reference: context/hr-operations-context.md §9.1 and §9.2 (confirmed extraction of both tables)

**Safely inside Mayurika HR domain:** YES. Leave policy administration and communication are confirmed Mayurika responsibilities (SRC-MAYU-001; CLAUDE.md §5). Leave policy content is company-wide (SRC-POLICY-001) and is not AXIOM or KPI data.

**Overlaps Arun/KPI/AXIOM:** NO. Leave notice periods and entitlements are company policy (SRC-POLICY-001), not KPI or AXIOM framework. No AXIOM band references. No KPI trigger rules.

**Overlaps Rajiv/Admin/PRC/escalation authority:** NO. The approval levels in this table (Subteam Leader, Team Leader, HR approval, Manager approval) are from SRC-POLICY-001 §6.1. None of the approval levels in this table reference the Admin Manager specifically or the PRC. The "Manager approval" at 13–14 days is the general manager approval per policy — it does not invoke PRC or Admin Manager-specific authority. [VERIFY] items 1–5 (Admin Manager) do not affect this table.

**[VERIFY] items affecting it:**
- [VERIFY] item 9 (exact tool names for HR and EOD systems): DOES NOT affect this table. The table contains only leave durations, notice periods, and approval levels — no tool names.
- [VERIFY] items 6 and 7 (MD requirements and final implementation scope): Apply nominally to all foundation draft content. Do not block this table from being built — the source (SRC-POLICY-001) is Final Approved.
- No other open [VERIFY] items affect this table.

**Personal / sensitive data risk:** NONE. This is a pure policy matrix. No individual staff data, no salary, no health data, no PDPA data.

**Recommended dashboard wording:** "Leave Notice Periods & Approval Levels"

**Recommended columns:**

| Leave Duration | Minimum Notice Required | Approval Level |
|---|---|---|
| 3 days | 1 week | Subteam Leader |
| 4–7 days | 4 weeks | Team Leader |
| 7–12 days | 8 weeks | HR Approval |
| 13–14 days | 3 months | Manager Approval |

Companion row set (same table or adjacent): Planned Leave Entitlement

| Staff Category | Leave Entitlement |
|---|---|
| During probation (first 3 months) | No leave — if urgent, recoverable within weekdays |
| Junior staff | 1 day per month |
| Senior staff | 2 days per month (32 days per annum) |

**Safe status: PASS**

Source is Final Approved (SRC-POLICY-001). Data is purely process-level policy. No sensitive data. No [VERIFY] blockers. No domain overlap with Arun, Rajiv, or PRC.

---

### TABLE 2 — Leave Type Summary

**Business question it answers:** What types of leave exist, what are the rules for each, and what is the entitlement?

**Mayurika use case:** Single-view reference for answering staff leave queries across all leave types. Supports checklist item 6 (PDPA compliance check) and leave monitoring as part of HR record governance.

**Source ID and exact section:**
- SRC-POLICY-001 §6.1 — General Leave Guidelines (advance notice, team limits, 12% cap, medical/sick rule)
- SRC-POLICY-001 §6.2 — Planned Leave (probation restriction, entitlement)
- SRC-POLICY-001 §6.3 — Unplanned Leave (5 days/year, notification, consequences)
- SRC-POLICY-001 §6.4 — Short Leave and Early-Off (2 hours/month, 24-hour notice, supervisor approval)
- SRC-POLICY-001 §6.5 — Maternity Leave (3 months, 30 days notice, full pay for full-time)
- Cross-reference: context/hr-operations-context.md §9.1–§9.5

**Safely inside Mayurika HR domain:** YES. Leave type policy is a core HR reference.

**Overlaps Arun/KPI/AXIOM:** NO.

**Overlaps Rajiv/Admin/PRC/escalation authority:** NO. None of the leave types described invoke Admin Manager or PRC authority. Medical/sick leave note (hospitalised conditions only) is a policy rule from SRC-POLICY-001, not a disciplinary escalation.

**[VERIFY] items affecting it:**
- [VERIFY] item 9: DOES NOT affect (no tool names in this table).
- [VERIFY] items 6 and 7: Apply nominally; do not block (source is Final Approved).
- No other open [VERIFY] items.

**Personal / sensitive data risk:** NONE. Policy rules and entitlements only. No individual health, medical, or personal data.

**Recommended dashboard wording:** "Leave Types at a Glance"

**Recommended columns:**

| Leave Type | Entitlement / Duration | Key Rule | Notice Required |
|---|---|---|---|
| Planned Leave — Probation | No leave (urgent = recoverable) | First 3 months | — |
| Planned Leave — Junior | 1 day per month | Annual cap applies | 48 hours minimum (system) |
| Planned Leave — Senior | 2 days per month (32/year) | Annual cap applies | 48 hours minimum (system) |
| Unplanned Leave | 5 days per year | Excess = unauthorised | Notify HR/supervisor ASAP |
| Short Leave / Early-Off | Maximum 2 hours per month | Supervisor approval required | 24 hours advance notice |
| Maternity Leave | 3 months (1st or 2nd child) | Full pay for full-time staff | 30 days prior notice |
| Medical / Sick Leave | Case-by-case | Hospitalised + medical report required | ASAP |

**Additional general rules note (if space permits):**
- Maximum 12% of all staff on leave simultaneously
- Maximum 2 team members per day (1 for CST, Content Writing, Postage)
- No leave coverage on Saturdays

**Safe status: PASS**

All rows trace directly to SRC-POLICY-001 §6.1–§6.5. No sensitive data. No [VERIFY] blockers. Fully inside Mayurika's HR reference domain.

---

### TABLE 3 — Employment Status Values & PDPA Compliance Indicators

*(Renamed from "PDPA & Staff Record Compliance Checklist" — a table format fits this data better than a checklist format)*

**Business question it answers:** What does each employment status value mean? What does a PDPA non-compliance flag look like in the staff record?

**Mayurika use case:** Quick reference when reviewing staff records; checking PDPA compliance during weekly checks (checklist item 6); confirming status semantics during monthly audit.

**Source ID and exact section:**
- SRC-MAYU-001 — Appendix: Canonical Staff Record Fields Reference (Employment Status Semantics table)
- SRC-MAYU-001 — Monitoring & Verification Process (PDPA Compliance Verification)
- SRC-MAYU-001 — KPIs / Success Measures (PDPA Acknowledgement Coverage KPI)
- Cross-reference: context/hr-operations-context.md §2 (PDPA Tracking)

**Safely inside Mayurika HR domain:** YES. Staff record governance and PDPA tracking are Mayurika's confirmed primary responsibilities (SRC-MAYU-001; CLAUDE.md §9.1, §9.2).

**Overlaps Arun/KPI/AXIOM:** NO. Employment status values and PDPA acknowledgement tracking are purely staff record fields owned by Mayurika. AXIOM band placements are NOT included here.

**Overlaps Rajiv/Admin/PRC/escalation authority:** PARTIAL NOTE. The "suspended" status is authorised by Rajiv (SRC-MAYU-001: "suspended → Rajiv authorises; Mayurika updates"). This must be noted in the table. The table itself is safe — it shows what the status means and the typical duration, not the authority or escalation chain. Admin Manager and PRC authority are not referenced.

**[VERIFY] items affecting it:**
- [VERIFY] item 9 (exact tool names): PARTIALLY relevant — the table itself does not name a tool. If the dashboard note refers to "the HR records system," that tool name is [VERIFY] item 9. Recommended wording: "staff record system" (descriptive, not a named tool).
- [VERIFY] items 6 and 7: Apply nominally. Do not block.

**Personal / sensitive data risk:** LOW. The table contains status definitions and compliance indicator rules — not individual staff data. No names, no salary, no medical, no PDPA raw data. The table is process-level only.

**Recommended dashboard wording:** "Employment Status Reference" + "PDPA Compliance Indicator"

**Recommended columns — Employment Status Table:**

| Status Value | Meaning | Typical Duration | Authority to Change |
|---|---|---|---|
| probation | New joiner within first 180 days — Suman tracks, Mayurika holds record | Up to 180 days | Mayurika (on confirmation) |
| active | Past probation, currently employed | Indefinite | Mayurika (on event) |
| on_leave | On approved leave | Defined per leave type | Mayurika (HR-approved leave) |
| suspended | Under PIP or disciplinary suspension | PIP window (default 30 days) | Rajiv authorises; Mayurika updates |
| departed | Employment ended — record retained per PDPA retention period | Permanent after retention | Mayurika (on confirmed departure) |

**Recommended columns — PDPA Compliance Indicator:**

| Field | Compliant Value | Non-Compliant Indicator | Action Required |
|---|---|---|---|
| pdpa_notice_acknowledged_on | Date populated (acknowledgement received) | NULL — notice not yet acknowledged | Flag to relevant TL; escalate if unsigned after 7 days |

**Safe status: PASS**

Source (SRC-MAYU-001) is confirmed READY. Data is process-level. No individual staff data. Note the Rajiv authority qualifier on "suspended" status — include in table or as a footnote. [VERIFY] item 9 does not block the table (tool name is descriptive-only in table content).

---

### TABLE 4 — Employee Review Milestones

**Business question it answers:** When is a review due for a new or active employee, and what does each milestone require Mayurika to check or action?

**Mayurika use case:** Planning the review schedule at onboarding and during monthly refresh; identifying governance failures when a milestone is missed; preparing for the Month 6 handover receipt from Suman (SRC-MAYU-001).

**Source ID and exact section:**
- SRC-MD-HR-001 §10.9 — New Employee ROI Monitoring (Week 1, Month 1, Month 3 milestones; "missing ROI review = governance failure")
- SRC-MAYU-001 — Monthly Activities #3 (Month 6 Handoff Processing) and Solutions Implemented (Month 6 proactive reminder)
- SRC-MAYU-001 — KPIs (Review Schedule Accuracy, Month 6 Handoff Completion Rate)
- SRC-MAYU-001 — Daily Activities #2 (Review Due Date Monitoring)
- context/hr-operations-context.md §3 (Review Scheduling) and §10.9 (New Employee ROI Monitoring)
- CLAUDE.md §11.6 (New Employee ROI Monitoring) and §9.3 (Review Scheduling)

**Scope note on Month 6 content:** The content of what happens inside the Month 6 review (commitment delivery summary, KPI baseline confirmation) is Suman's process (SRC-SUMAN-001-v2 §8.11). Mayurika's role is to receive the handover and write `recruitment_source_id` and `recruitment_promise_set_id` into the staff record. The table is scoped to Mayurika's scheduling and receipt responsibility only — not Suman's process steps.

**Safely inside Mayurika HR domain:** YES for milestones as scheduling checkpoints. Mayurika owns the review schedule (SRC-MAYU-001). The table is framed from Mayurika's governance perspective — what she needs to confirm at each point — not from Suman's recruitment process perspective.

**Overlaps Arun/KPI/AXIOM:** MINIMAL. The Week 1, Month 1, and Month 3 ROI reviews reference "ROI review" — which is directed by SRC-MD-HR-001 and does not specify AXIOM band placement. The table does not include KPI scoring, AXIOM band results, or KPI trigger rules. Mayurika's role at these milestones is to confirm the review is scheduled/completed, not to conduct the AXIOM assessment. No AXIOM content needed.

**Overlaps Rajiv/Admin/PRC/escalation authority:** NO. Review scheduling is Mayurika's domain. PRC and Admin Manager authority are not referenced by these milestones.

**Overlaps Suman domain:** YES at Month 6 only — Suman initiates and conducts the 180-day handover. Mayurika receives it. The table note at Month 6 must make clear that Suman's role is the initiator and Mayurika's role is the recipient writing two fields into the staff record. This is clean as long as the table does not describe Suman's process steps.

**[VERIFY] items affecting it:**
- [VERIFY] item 9 (tool names): Does not affect milestone dates or descriptions.
- [VERIFY] items 6 and 7: Apply nominally. The SRC-MD-HR-001 source is Varmen Reviewed 2026-06-25; SRC-MAYU-001 is READY. Do not block.

**Personal / sensitive data risk:** NONE. Milestones and their governance rules only. No individual staff data.

**Recommended dashboard wording:** "Staff Review Milestone Calendar"

**Recommended columns:**

| Milestone | Trigger | Mayurika's Action | Governance Rule | Source |
|---|---|---|---|---|
| Week 1 ROI Review | Staff member completes first week | Confirm review is scheduled and completed | Missing = governance failure | SRC-MD-HR-001 §10.9 |
| Month 1 ROI Review | 1 month from join date | Confirm review is completed and documented | Missing = governance failure | SRC-MD-HR-001 §10.9 |
| Month 3 ROI Review | 3 months from join date | Confirm review is completed and documented | Missing = governance failure | SRC-MD-HR-001 §10.9 |
| Month 6 Handover from Suman | 180 days from join date | Receive handover; write recruitment_source_id and recruitment_promise_set_id into staff record | Suman initiates; Mayurika receives | SRC-MAYU-001 |
| Monthly Review Schedule Refresh | Every month | Refresh next_review_due for all active staff; flag overdue reviews | Overdue without escalation = governance failure | SRC-MAYU-001 |
| Probation End Date Flag | 3 days before probation_end_date | Alert Suman and Rajiv for action | Flag daily | SRC-MAYU-001 |

**Safe status: PASS**

All milestones trace to confirmed sources. No AXIOM band content. No KPI trigger rules. Month 6 content scoped to Mayurika's receipt role only (not Suman's process steps). No personal data.

---

### TABLE 5 — Month 1 Employee Status Categories

**Business question it answers:** What are the possible status outcomes at the Month 1 review and what does each status mean for subsequent management action?

**Mayurika use case:** Understanding what status she may encounter at Month 6 handover receipt — if a staff member has a "Concern" or "Critical" flag from Month 1, Mayurika may receive a handover with outstanding corrective action items.

**Source ID and exact section:**
- CLAUDE.md §8.7 — Month 1 Review (SRC-SUMAN-001-v2)
- SRC-SUMAN-001-v2 (`intelligence-inbox/raw-stakeholder-documents/suman-recruitment/Recruitment_Quality_Control_Process.md`) — Month 1 Review section

**Domain assessment — primary domain:** This table belongs primarily to Suman's recruitment domain. The Month 1 status categorisation (On Track / Watch / Concern / Critical) is defined in Suman's recruitment process (SRC-SUMAN-001-v2 §8.7) and is applied by Suman or the recruitment process, not by Mayurika.

**Mayurika's connection to this table:** At Month 6 handover, Mayurika may receive a staff record with outstanding corrective action items if a staff member was flagged "Concern" at Month 1 (CLAUDE.md §8.7: "Any employee marked as 'Concern' at Month 1 will receive a documented corrective action plan with clear responsibilities and deadlines before the Month 3 review"). This is the extent of Mayurika's operational need for this table.

**Safely inside Mayurika HR domain:** PARTIAL. The table content is Suman's process. Mayurika's connection is limited to being aware of the incoming handover context. Including this table in Mayurika's dashboard would carry a domain-boundary note: "These categories are defined and applied in Suman's recruitment process. Mayurika encounters them only at Month 6 handover receipt."

**Overlaps Arun/KPI/AXIOM:** NO.

**Overlaps Rajiv/Admin/PRC/escalation authority:** NO for the status categories themselves. However, "Critical" status may lead to probation discontinuation (CLAUDE.md §8.8) "subject to management review and approval" — this is a Suman-side process and is not a table value Mayurika applies.

**[VERIFY] items affecting it:**
- [VERIFY] items 6 and 7: Apply nominally.
- No specific [VERIFY] items block this table.

**Personal / sensitive data risk:** NONE for the category definitions. The table is purely definitional.

**Recommended dashboard wording:** "Recruitment Month 1 Status Reference (for Month 6 Handover Context)" — with a note that these categories are Suman's process and are provided here only as a handover-awareness reference.

**Recommended columns:**

| Status | Meaning | Implication for Mayurika at Month 6 Handover |
|---|---|---|
| On Track | Performing as expected | Standard handover; no outstanding corrective action items expected |
| Watch | Minor concerns; monitoring required | Handover may include monitoring notes |
| Concern | Issues identified; corrective action plan required before Month 3 | Handover must include evidence of documented corrective action plan and Month 3 outcome |
| Critical | Serious performance or commitment concerns | Handover may include outstanding issues requiring assigned owners |

**Safe status: AMBER**

The table content is source-backed (SRC-SUMAN-001-v2 via CLAUDE.md §8.7) and carries no sensitive data. However:
- Primary domain is Suman's — not Mayurika's — and including it without a clear domain-boundary note could cause misuse (e.g., Mayurika applying these status labels independently)
- Recommended only if the dashboard tab has a clearly labelled "Handover Context" section with the domain-boundary note
- Suman should be notified that this reference is included in Mayurika's dashboard tab
- Do not include without the domain-boundary note and reviewer confirmation

**Resolution condition for AMBER:** Mayurika confirms she wants this context in her dashboard tab; Suman is notified and raises no objection.

---

### TABLE 6 — Probation Record Monitoring Summary

*(Renamed from "Probation Escalation Summary" — the word "Escalation" risks implying incident/disciplinary escalation authority, which belongs to Arun and touches [VERIFY] items 1–5. Renamed to stay inside Mayurika's monitoring and record-keeping scope.)*

**Business question it answers:** What is the probation period structure, what does Mayurika monitor during it, and what triggers a flag?

**Mayurika use case:** Daily probation date monitoring (SRC-MAYU-001 Daily Activity #1); probation pipeline weekly review (SRC-MAYU-001 Weekly Activity #3); flagging approaching end dates.

**Source ID and exact section:**
- SRC-MAYU-001 — Employment Status Semantics table (probation row)
- SRC-MAYU-001 — Daily Activities #1 (Probation Date Monitoring)
- SRC-MAYU-001 — Weekly Activities #3 (Probation Pipeline Review)
- SRC-MAYU-001 — Process Flow Step 2 (Probation Period monitoring)
- SRC-POLICY-001 §6.2 — No leave during probation; recovery rule
- SRC-POLICY-001§2.1 — Termination during probation

**Safely inside Mayurika HR domain:** YES — for record-keeping and monitoring. Mayurika monitors `probation_end_date` and holds the staff record. Suman leads probation tracking; Mayurika holds the record only (SRC-MAYU-001).

**Overlaps Arun/KPI/AXIOM:** NO. Probation monitoring is a staff record governance function, not KPI or AXIOM.

**Overlaps Rajiv/Admin/PRC/escalation authority:** RISK ZONE. Any "escalation" terminology in the context of probation risks implying disciplinary or PIP escalation (Arun's domain via §7.7), or termination authority. The safe scope is limited to: what Mayurika monitors, what field triggers a flag, and who she flags to (Suman and Rajiv per SRC-MAYU-001).

**Key boundary:** The table must NOT include:
- Incident-based escalation steps (Arun's domain — CLAUDE.md §7.7)
- PIP authority (Rajiv authorises per SRC-MAYU-001)
- PRC authority (Admin Manager — [VERIFY] items 1–5)
- Termination decision authority

**[VERIFY] items affecting it:**
- [VERIFY] items 1–5 (Admin Manager, escalation paths): WOULD affect the table IF escalation paths were included. They do NOT affect the table if scoped to monitoring and record-keeping only.
- [VERIFY] items 6 and 7: Apply nominally.

**Personal / sensitive data risk:** NONE for the structure and monitoring rules. Do not include individual staff probation end dates.

**Recommended dashboard wording:** "Probation Record Monitoring"

**Recommended columns:**

| Item | Detail | Source |
|---|---|---|
| Probation period duration | Up to 180 days from join date | SRC-MAYU-001 |
| Staff record status during probation | employment_status = "probation" | SRC-MAYU-001 |
| Who tracks probation progress | Suman (leads); Mayurika (holds record) | SRC-MAYU-001 |
| Trigger for flag | probation_end_date approaching within 3 days | SRC-MAYU-001 Daily Activity #1 |
| Who receives the flag | Suman and Rajiv | SRC-MAYU-001 |
| Leave during probation | Not permitted; if urgent, recoverable within weekdays | SRC-POLICY-001 §6.2 |
| Status after probation | Updated to "active" on confirmation | SRC-MAYU-001 Process Flow Step 2 |

**Safe status: PASS** (scoped strictly to monitoring and record-keeping)

If any escalation path, disciplinary process, or PRC content is added, the safe status changes to FAIL for those additions. The table as scoped above contains no disciplinary, incident, or PRC escalation content.

---

## Summary of Safe Status Results

| # | Table Name | Safe Status | Key Condition |
|---|---|---|---|
| 1 | Leave Notice Periods & Approval Levels | **PASS** | No blockers; Final Approved source |
| 2 | Leave Types at a Glance | **PASS** | No blockers; Final Approved source |
| 3 | Employment Status Reference & PDPA Compliance Indicator | **PASS** | Note Rajiv authority on "suspended"; no tool names in table |
| 4 | Staff Review Milestone Calendar | **PASS** | Month 6 scoped to receipt role only; no AXIOM content |
| 5 | Month 1 Status Categories (Handover Context) | **AMBER** | Primary domain is Suman's; needs domain-boundary note + Mayurika confirmation + Suman notification |
| 6 | Probation Record Monitoring | **PASS** | Scoped to record-keeping only; no escalation paths; no PRC content |

---

## [VERIFY] Item Check — Impact on All Six Tables

| [VERIFY] # | Item | Tables Affected |
|---|---|---|
| 1–5 | Admin Manager document, authority, PRC role, approval chains, escalation paths | Would affect Table 6 IF escalation paths were included — NOT included in recommended scope |
| 6 | MD-specific requirements beyond Varmen relay | Applies nominally to all six tables as Foundation Draft v0.1 content; does not block any table |
| 7 | Final implementation scope | Same as above; does not block |
| 8 | Director authority beyond leadership review | No tables reference Director authority |
| 9 | Exact tool names for HR and EOD systems | Table 3 note: use "staff record system" (descriptive); no table names a specific tool |

**No [VERIFY] item blocks any of the six candidate tables from being built, provided the scope notes above are respected.**

---

## Sensitive Data Check — All Six Tables

| Data Type (Forbidden) | Present in Any Table? | Notes |
|---|---|---|
| Individual staff names | NO | All tables are process-level and definitional |
| Salary / compensation data | NO | No salary data in any table |
| Individual health / medical data | NO | Leave types table describes policy entitlements only |
| PDPA personal data | NO | PDPA compliance indicator table shows field name and compliance rule only |
| Individual performance band placements (AXIOM) | NO | AXIOM explicitly excluded from all candidates |
| Recruitment candidate personal data | NO | Not applicable to any candidate |
| Disciplinary case details | NO | Probation table scoped to monitoring only |
| Individual grievance records | NO | Not applicable |

**All six tables are clean of sensitive data in the recommended formats.**

---

## Duplicate / Parent-Truth Risk

| Risk | Assessment |
|---|---|
| Tables reproduce content already in CLAUDE.md | Tables are VIEW EXTRACTS of confirmed source content; they do not restate policy with different wording or add new claims. CLAUDE.md remains the root truth. |
| Tables resolve [VERIFY] items | NO — no table resolves any open [VERIFY] item |
| Tables create authority claims not in registered sources | NO — all authority notes in the tables (e.g., Rajiv authorises suspension; Suman leads probation) directly reference SRC-MAYU-001 |
| Tables promote content to parent AIOS truth | NO — tables are read-only display elements; no promotion occurs |

---

## Recommended Build Order

| Order | Table | Reason |
|---|---|---|
| 1 | Leave Notice Periods & Approval Levels (Table 1) | Simplest; cleanest source; most frequently used by HR; no [VERIFY] dependency |
| 2 | Leave Types at a Glance (Table 2) | Companion to Table 1; same source; completes the leave reference picture |
| 3 | Employment Status Reference & PDPA Compliance Indicator (Table 3) | Core HR record reference; Mayurika uses daily and weekly; single source (SRC-MAYU-001) |
| 4 | Probation Record Monitoring (Table 6) | Source-backed and clean; supports Mayurika's daily monitoring |
| 5 | Staff Review Milestone Calendar (Table 4) | Slightly more complex (two sources); confirms Month 6 handover context; builds on Table 3 and 6 |
| 6 | Month 1 Status Categories (Table 5) | Build last and only after Mayurika confirms she wants it and Suman is notified |

---

## Next Step

1. Present this discovery report to Mayurika for review
2. Confirm she wants all five PASS tables built for the HR dashboard tab
3. On Table 5 (AMBER): confirm she wants the handover-context reference; notify Suman
4. Once confirmed, route implementation to Mareenraj (builder) — do not edit web-view/index.html without Mayurika confirmation
5. Register this discovery file in evidence/source-register.md is NOT required — this is an internal discovery record, not a registered source

---

*This file is a read-only discovery record. No tables have been built. No CLAUDE.md sections have been changed. No [VERIFY] items have been resolved. No source-register.md entries have been added. No web-view/index.html has been edited.*

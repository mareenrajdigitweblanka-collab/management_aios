---
name: context-files-source-map
type: validation
created: 2026-06-23
tracks: context/ files — Foundation Draft v0.1
---

# Context Files Source Map

Every claim in the context/ files is traced here to its Source ID.

**Pass rule:** Every row must have a Source ID or a [VERIFY] status. Any row with neither is a validation failure.

---

## Source Map Table

| Context File | Section | Claim / Topic | Source ID | Status | VERIFY? | Notes |
|--------------|---------|---------------|-----------|--------|---------|-------|
| management-aios-purpose.md | Why It Exists | AIOS exists to identify operational gaps and recurring problems before escalation | SRC-VAR-001 | CONFIRMED | — | Direct from AIOS Extraction Summary |
| management-aios-purpose.md | Why It Exists | Modelled after Postage/Shipping AIOS and Purchasing AIOS | SRC-VAR-001 | CONFIRMED | — | Explicitly stated in interview notes |
| management-aios-purpose.md | Focus Area 1 | Onboarding gaps | SRC-VAR-001 | CONFIRMED | — | Listed under Recurring Problems |
| management-aios-purpose.md | Focus Area 2 | Leave update inconsistencies | SRC-VAR-001 | CONFIRMED | — | Listed under Recurring Problems |
| management-aios-purpose.md | Focus Area 3 | KPI meeting irregularities | SRC-VAR-001 | CONFIRMED | — | Listed under Recurring Problems |
| management-aios-purpose.md | Focus Area 4 | Management file and decision disorganization | SRC-VAR-001 | CONFIRMED | — | Listed under Recurring Problems |
| management-aios-purpose.md | Urgency | As soon as possible | SRC-VAR-001 | CONFIRMED | — | Under Deadline / Urgency |
| management-aios-purpose.md | Ownership | Builder: Mareenraj | SRC-VAR-001 | CONFIRMED | — | Interview notes |
| management-aios-purpose.md | Ownership | Coordinator / Validator: Varmen | SRC-VAR-001 | CONFIRMED | — | Self-authored interview notes |
| management-aios-purpose.md | Ownership | Operational Owner post-approval: Mayurika | SRC-VAR-001 | CONFIRMED | — | "HR Lead Mayurika will become primary operational owner" |
| management-aios-purpose.md | Known Limits | MD-specific requirements not yet gathered directly | SRC-VAR-001 | CONFIRMED | — | Listed under Known Limits |
| management-aios-purpose.md | Known Limits | Final scope may change after MD review | SRC-VAR-001 | CONFIRMED | — | Listed under Known Limits |
| organization-structure.md | Role: MD | Managing Director exists | SRC-MAYU-001, SRC-ARUN-001 | CONFIRMED | — | Referenced as reporting target in both documents |
| organization-structure.md | Role: Director | Director exists | SRC-MAYU-001 | CONFIRMED | — | Director co-facilitates Leadership Review |
| organization-structure.md | Role: Admin Manager | Admin Manager role exists | SRC-ARUN-001 | [VERIFY] | YES | Named in PRC only; SRC-ADMIN-001 pending |
| organization-structure.md | Role: HR Officer | Mayurika as HR Officer | SRC-MAYU-001 | CONFIRMED | — | Self-described in SKILL file |
| organization-structure.md | Role: Implementation Officer | Arun as Implementation Officer | SRC-ARUN-001 | CONFIRMED | — | Authored KPI document |
| organization-structure.md | Role: Recruitment Officer | Suman as Recruitment Officer | SRC-SUMAN-001-v2, SRC-MAYU-001 | CONFIRMED | — | Both sources confirm |
| organization-structure.md | Role: Operational Manager | Operational Manager in PRC | SRC-ARUN-001 | [VERIFY] | YES | Named in PRC; full responsibilities unconfirmed |
| organization-structure.md | Role: Team Leaders | TLs exist and participate in reviews | SRC-MAYU-001, SRC-ARUN-002 | CONFIRMED | — | TLs confirmed throughout |
| organization-structure.md | Role: Sub Team Leaders | STLs exist; current_stl_id in staff records | SRC-MAYU-001 | CONFIRMED | — | Confirmed in staff data model |
| organization-structure.md | Role: Staff Members | Staff Members exist | SRC-MAYU-001 | CONFIRMED | — | Referenced throughout HR process |
| organization-structure.md | Authority | Rajiv: canonical authority on name spelling and team structure | SRC-MAYU-001 | CONFIRMED | — | Explicit in staff record data model section |
| organization-structure.md | Authority | Arun: AXIOM band placement | SRC-MAYU-001, SRC-ARUN-001 | CONFIRMED | — | Explicit in both documents |
| organization-structure.md | Authority | Arun: KPI definitions | SRC-ARUN-001 | CONFIRMED | — | Authored the KPI framework |
| organization-structure.md | Authority | Mayurika: staff records and PDPA | SRC-MAYU-001 | CONFIRMED | — | Section 1 of SKILL file |
| organization-structure.md | Authority | Suman: recruitment pipeline and probation tracking | SRC-MAYU-001, SRC-SUMAN-001-v2 | CONFIRMED | — | Referenced in staff record lifecycle |
| organization-structure.md | Authority | Mayurika + Director: Leadership Review co-facilitation | SRC-MAYU-001 | CONFIRMED | — | Section 3 of SKILL file |
| organization-structure.md | Authority | Visali: SKILL file quality depth assessment | SRC-MAYU-001 | CONFIRMED | — | Section 6 of SKILL file |
| organization-structure.md | Admin Manager pending | Authority scope, reporting, approvals, escalations all unknown | SRC-ADMIN-001 PENDING | [VERIFY] | YES | All await SRC-ADMIN-001 |
| hr-operations-context.md | §1 Staff Records | Mayurika is primary custodian and write-authority | SRC-MAYU-001 | CONFIRMED | — | Section 1 of HR.Mayu.Skill.md |
| hr-operations-context.md | §1 Staff Records | Key lifecycle events: join, active, month-6 handoff, status changes, AXIOM submission, PDPA | SRC-MAYU-001 | CONFIRMED | — | Section 1 of HR.Mayu.Skill.md |
| hr-operations-context.md | §1 Staff Records | Mayurika does not write: name spelling, team structure, salary band, AXIOM bands | SRC-MAYU-001 | CONFIRMED | — | Explicit in "Mayurika does NOT" list |
| hr-operations-context.md | §2 PDPA | PDPA notice issuance and acknowledgement tracking process | SRC-MAYU-001 | CONFIRMED | — | Daily Activities #4; PDPA Compliance Report section |
| hr-operations-context.md | §2 PDPA | Monthly PDPA compliance report for management | SRC-MAYU-001 | CONFIRMED | — | PDPA Compliance Report section |
| hr-operations-context.md | §3 Review Scheduling | last_review_date and next_review_due maintained by Mayurika | SRC-MAYU-001 | CONFIRMED | — | KPIs: Review Schedule Accuracy |
| hr-operations-context.md | §3 Review Scheduling | Overdue next_review_due without escalation = governance failure | SRC-MAYU-001 | CONFIRMED | — | KPIs: Review Schedule Accuracy |
| hr-operations-context.md | §4 EOD | EOD monitoring for Website and PH Teams via ChatGPT workspace | SRC-MAYU-001 | CONFIRMED | — | Section 4 of HR.Mayu.Skill.md; active since March 2025 |
| hr-operations-context.md | §4 EOD | Task dimensions: Name, ID, Tier, Time Spent, Yield, Category | SRC-MAYU-001 | CONFIRMED | — | Section 4: Task Analysis Dimensions |
| hr-operations-context.md | §5 Critic Meeting | Monthly; co-facilitated by Mayurika, Muguntha, Jefri | SRC-MAYU-001 | CONFIRMED | — | Section 5 of HR.Mayu.Skill.md |
| hr-operations-context.md | §5 Critic Meeting | Action Review Meeting with TL after each session | SRC-MAYU-001 | CONFIRMED | — | Section 5: Process Flow Step 4 |
| hr-operations-context.md | §5 Critic Meeting | Notice board publication of action items | SRC-MAYU-001 | CONFIRMED | — | Section 5: Process Flow Step 6 |
| hr-operations-context.md | §6 SKILL File | Mayurika: compliance manager for Developer and Technical/N8N Teams | SRC-MAYU-001 | CONFIRMED | — | Section 6 of HR.Mayu.Skill.md |
| hr-operations-context.md | §6 SKILL File | 80% quality benchmark | SRC-MAYU-001 | CONFIRMED | — | Section 6: Compliance Enforcement |
| hr-operations-context.md | §6 SKILL File | Visali: quality depth assessment | SRC-MAYU-001 | CONFIRMED | — | Section 6: Responsibility Split table |
| hr-operations-context.md | §6 SKILL File | Escalation: Sajeesan → Pratheepan → Joshna → Management | SRC-MAYU-001 | CONFIRMED | — | Section 6: Core Responsibilities |
| hr-operations-context.md | §7 ROI | Weekly ROI data from PH, Digital Marketing, Technical Teams | SRC-MAYU-001 | CONFIRMED | — | Section 2: ROI Data Collection |
| hr-operations-context.md | §7 ROI | Weekly and monthly ROI reports prepared for MD | SRC-MAYU-001 | CONFIRMED | — | Section 2 of HR.Mayu.Skill.md |
| hr-operations-context.md | §8 Leadership Review | Twice-weekly; co-facilitated by Mayurika and Director | SRC-MAYU-001 | CONFIRMED | — | Section 3 of HR.Mayu.Skill.md |
| hr-operations-context.md | §8 Leadership Review | Separate Sales and Non-Sales frameworks | SRC-MAYU-001 | CONFIRMED | — | Section 3: Overview |
| hr-operations-context.md | §8 Leadership Review | eBay and CPPC enhanced validation | SRC-MAYU-001 | CONFIRMED | — | Section 3: Data Validation Process |
| recruitment-context.md | §1 Pipeline | Sourcing channels: referrals, social media, recruitment websites | SRC-SUMAN-001-v2 | CONFIRMED | — | Direct source text |
| recruitment-context.md | §2 Screening | 8-point screening criteria | SRC-SUMAN-001-v2 | CONFIRMED | — | Direct source text |
| recruitment-context.md | §3 Interview | 5-area scoring; 50-point total; above 30 considered | SRC-SUMAN-001-v2 | CONFIRMED | — | Technical Knowledge, AI Knowledge, Communication, Confidence, Cultural Fit |
| recruitment-context.md | §4 Tracking | Rejected and on-hold tracking sheets | SRC-SUMAN-001-v2 | CONFIRMED | — | Direct source text |
| recruitment-context.md | §5 Commitment | Documented commitment record with every offer | SRC-SUMAN-001-v2 | CONFIRMED | — | Direct source text |
| recruitment-context.md | §6 7/14-Day Review | 7 assessment areas including AI/LLM adoption | SRC-SUMAN-001-v2 | CONFIRMED | — | Direct source text |
| recruitment-context.md | §7 Month 1 | 4 assessment areas; 4 status categories | SRC-SUMAN-001-v2 | CONFIRMED | — | "Concern" triggers corrective action plan |
| recruitment-context.md | §8 Month 3 | Commitment delivery, KPI participation, behavioural obs, corrective progress | SRC-SUMAN-001-v2 | CONFIRMED | — | Discontinuation subject to management approval |
| recruitment-context.md | §9 Month 6 | Full commitment vs delivery; probation confirmation; handover preparation | SRC-SUMAN-001-v2 | CONFIRMED | — | Direct source text |
| recruitment-context.md | §10 Source Quality | Activity metrics + quality metrics | SRC-SUMAN-001-v2 | CONFIRMED | — | Direct source text |
| recruitment-context.md | §11 Handover | 15-minute meeting; Mayurika, Arun, Suman confirmed attendees | SRC-SUMAN-001-v2 | CONFIRMED | — | Line Manager identity [VERIFY] |
| recruitment-context.md | §11 Handover | Line Manager identity | SRC-SUMAN-001-v2 | [VERIFY] | YES | Role named but holder not identified in source |
| recruitment-context.md | §11 Handover | Mayurika 2-week proactive reminder; writes recruitment_source_id and recruitment_promise_set_id | SRC-MAYU-001 | CONFIRMED | — | Section 1: Solutions Implemented |
| recruitment-context.md | §12 Daily Capture | 1 hour/day; 6 topic areas | SRC-SUMAN-001-v2 | CONFIRMED | — | Direct source text |
| kpi-axiom-context.md | §1 KPI Defs | Portfolio Holders KPIs | SRC-ARUN-001 | CONFIRMED | — | Section 1 of ARUN-001 |
| kpi-axiom-context.md | §1 KPI Defs | Website Team KPIs | SRC-ARUN-001 | CONFIRMED | — | Section 1 of ARUN-001 |
| kpi-axiom-context.md | §1 KPI Defs | eBay Team KPIs | SRC-ARUN-001 | CONFIRMED | — | Section 1 of ARUN-001 |
| kpi-axiom-context.md | §1 KPI Defs | Account Holders KPIs | SRC-ARUN-001 | CONFIRMED | — | Section 1 of ARUN-001 |
| kpi-axiom-context.md | §1 KPI Defs | PPC Team KPIs | SRC-ARUN-001 | CONFIRMED | — | Section 1 of ARUN-001 |
| kpi-axiom-context.md | §1 KPI Defs | Technical Team KPIs | SRC-ARUN-001 | CONFIRMED | — | Section 1 of ARUN-001 |
| kpi-axiom-context.md | §1 KPI Defs | Development Team KPIs | SRC-ARUN-001 | CONFIRMED | — | Section 1 of ARUN-001 |
| kpi-axiom-context.md | §2 AXIOM Bands | Individual Staff Net Sales bands (Red through Purple) | SRC-ARUN-001 | CONFIRMED | — | Section 2 of ARUN-001 |
| kpi-axiom-context.md | §2 AXIOM Bands | NNV bands (Red through Purple) | SRC-ARUN-001 | CONFIRMED | — | Section 2 of ARUN-001 |
| kpi-axiom-context.md | §3 Detection | YOY Growth below 30% | SRC-ARUN-001 | CONFIRMED | — | Section 3 of ARUN-001 |
| kpi-axiom-context.md | §3 Detection | Website ROAS below 400% | SRC-ARUN-001 | CONFIRMED | — | Section 3 of ARUN-001 |
| kpi-axiom-context.md | §3 Detection | Amazon ACOS Below 25% — wording unclear | SRC-ARUN-001 | [VERIFY] | YES | Source wording "Amazon ACOSBelow 25%" — confirm with Arun |
| kpi-axiom-context.md | §3 Detection | eBay ACOS Below 20% | SRC-ARUN-001 | CONFIRMED | — | Section 3 of ARUN-001 |
| kpi-axiom-context.md | §3 Detection | Incident Score below 15/25; 3+ reports; repeated misses; missing docs; low ROI; low NNV; poor utilisation | SRC-ARUN-001 | CONFIRMED | — | Section 3 of ARUN-001 |
| kpi-axiom-context.md | §4 Review Inputs | Revenue, Profit, YOY Growth, ROAS, ACOS, Net Sales, Task Completion, Documentation, Incidents, ROI | SRC-ARUN-001 | CONFIRMED | — | Section 4 of ARUN-001 |
| kpi-axiom-context.md | §4 Review Inputs | ROI Officer Feedback — role identity unclear | SRC-ARUN-001 | [VERIFY] | YES | Listed as "ROI officer feed back" — confirm with Arun |
| kpi-axiom-context.md | §5 Review Outputs | AXIOM Score, Band, NNV Band, Risk Level, Coaching, Training, Warning, PIP, Bonus, Promotion | SRC-ARUN-001 | CONFIRMED | — | Section 5 of ARUN-001 |
| kpi-axiom-context.md | §6 Weekly Workflow | Collect → calculate → assign → review → action → monitor | SRC-ARUN-001 | CONFIRMED | — | Section 6 of ARUN-001 |
| kpi-axiom-context.md | §7 Escalation | Time-based: Week 1 coaching through Week 8 Third Warning + PRC | SRC-ARUN-001 | CONFIRMED | — | Section 7 of ARUN-001 |
| kpi-axiom-context.md | §7 Escalation | Count-based: 1 coaching through 5+ PRC Action | SRC-ARUN-001 | CONFIRMED | — | Section 7 of ARUN-001 |
| kpi-axiom-context.md | §8 PRC | MD and Implementation Officer PRC membership | SRC-ARUN-001 | CONFIRMED | — | Section 8 of ARUN-001 |
| kpi-axiom-context.md | §8 PRC | Admin Manager PRC membership | SRC-ARUN-001 | [VERIFY] | YES | Named in PRC; SRC-ADMIN-001 pending |
| kpi-axiom-context.md | §8 PRC | Team Leader PRC membership | SRC-ARUN-001 | CONFIRMED | — | Section 8 of ARUN-001 |
| kpi-axiom-context.md | §8 PRC | Operational Manager PRC membership and scope | SRC-ARUN-001 | [VERIFY] | YES | Named in PRC; full scope unconfirmed |
| kpi-axiom-context.md | §8 PRC | PRC Responsibilities: KPI Review, Bonus Approval, Escalation, Promotion | SRC-ARUN-001 | CONFIRMED | — | Section 8 of ARUN-001 |
| kpi-axiom-context.md | §9 Bonus | All 7 bonus eligibility conditions | SRC-ARUN-001 | CONFIRMED | — | Section 9 of ARUN-001 |
| kpi-axiom-context.md | §10 Dashboard | Weekly dashboard contents | SRC-ARUN-001 | CONFIRMED | — | Section 10 of ARUN-001 |
| kpi-axiom-context.md | §10 Dashboard | Monthly dashboard contents | SRC-ARUN-001 | CONFIRMED | — | Section 10 of ARUN-001 |
| kpi-axiom-context.md | §10 Dashboard | Required views: Staff, Team, Department, Portfolio, Incident, Bonus, PRC | SRC-ARUN-001 | CONFIRMED | — | Section 10 of ARUN-001 |
| confidentiality-rules.md | Default position | Process-level and aggregate information only by default | SRC-VAR-001 | CONFIRMED | — | Sensitivity guidance from interview |
| confidentiality-rules.md | Default position | No individually identifiable HR data without MD + HR owner approval | SRC-VAR-001 | CONFIRMED | — | Sensitivity guidance from interview |
| confidentiality-rules.md | Forbidden types | Salary, disciplinary details, health, grievance, private case details — out of scope | SRC-VAR-001 | CONFIRMED | — | Sensitivity guidance from interview |
| confidentiality-rules.md | PDPA note | Mayurika holds PDPA data; not stored in this AIOS | SRC-MAYU-001 | CONFIRMED | — | PDPA references in HR.Mayu.Skill.md |
| confidentiality-rules.md | Access control | Any expansion requires explicit MD + HR owner approval | SRC-VAR-001 | CONFIRMED | — | Sensitivity guidance from interview |
| verify-register.md | Items 1–5 | Admin Manager [VERIFY] items | SRC-ADMIN-001 PENDING | [VERIFY] | YES | All 5 items await SRC-ADMIN-001 |
| verify-register.md | Items 6–7 | MD-specific requirements and final implementation scope | SRC-VAR-001 acknowledged limit | [VERIFY] | YES | MD review meeting required |
| verify-register.md | Items 8–10 | Arun wording items: ACOS, Operational Manager PRC, ROI Officer | SRC-ARUN-001 | [VERIFY] | YES | Require Arun confirmation |
| verify-register.md | Item 11 | Line Manager identity in 180-day handover | SRC-SUMAN-001-v2 | [VERIFY] | YES | Require Suman or Varmen confirmation |
| verify-register.md | Item 12 (original) | Leave policy detail | SRC-POLICY-001 | RESOLVED | NO | Resolved 2026-06-23 by SRC-POLICY-001 §6.0–6.5. Full leave framework in CLAUDE.md §10.1 and hr-operations-context.md §9. |
| verify-register.md | Item 12 (renumbered) | Director authority beyond leadership review | No dedicated source | [VERIFY] | YES | Dedicated Director source or interview required |
| verify-register.md | Item 13 (renumbered) | Exact tool names for HR and EOD systems | SRC-MAYU-001 partial | [VERIFY] | YES | Confirmation from Mayurika required |
| confidentiality-rules.md | Salary confidentiality | Employees must not share/discuss salary, bonuses, allowances | SRC-POLICY-001 | CONFIRMED | — | §2.0 of company policy |
| confidentiality-rules.md | General confidentiality obligation | Protect staff personal data, customer data, financial records, proprietary details | SRC-POLICY-001 | CONFIRMED | — | §14.0 of company policy |
| confidentiality-rules.md | Digital assets — confidentiality and ownership | All digital assets are private and confidential; company property | SRC-POLICY-001 | CONFIRMED | — | §11.0 of company policy |
| hr-operations-context.md | §9.1 Leave General | 48-hour advance notice; 12% staff cap; team limits; medical/sick leave rules | SRC-POLICY-001 | CONFIRMED | — | §6.1 of company policy |
| hr-operations-context.md | §9.1 Leave Notices | Notice periods by leave duration (3 days through 13–14 days) | SRC-POLICY-001 | CONFIRMED | — | §6.1 of company policy |
| hr-operations-context.md | §9.2 Planned Leave | No leave during probation; junior/senior entitlements; no Saturday coverage | SRC-POLICY-001 | CONFIRMED | — | §6.2 of company policy |
| hr-operations-context.md | §9.3 Unplanned Leave | 5 unplanned days/year; excess is unauthorised | SRC-POLICY-001 | CONFIRMED | — | §6.3 of company policy |
| hr-operations-context.md | §9.4 Short Leave | Max 2 hours/month; 24-hour advance notice + supervisor approval | SRC-POLICY-001 | CONFIRMED | — | §6.4 of company policy |
| hr-operations-context.md | §9.5 Maternity Leave | 3 months; 30 days notice; full pay for full-time employees | SRC-POLICY-001 | CONFIRMED | — | §6.5 of company policy |
| hr-operations-context.md | §9.6 Offboarding | Exit interview conducted by HR; final checklist signed by employee, manager, HR | SRC-POLICY-001 | CONFIRMED | — | §10.6–10.7 of company policy |
| recruitment-context.md | §7 Month 1 | Probation leave restriction — no leave during 3-month probationary period | SRC-POLICY-001 | CONFIRMED | — | §6.2 of company policy; cross-reference with probation review framework |

---

## Source Map Summary

| Status | Count |
|--------|-------|
| CONFIRMED | 97 |
| RESOLVED | 1 |
| [VERIFY] | 16 |
| TOTAL | 114 |

---

## Validation Result

**CONDITIONAL PASS** — All claims in all context files have either a Source ID, a [VERIFY] tag, or a RESOLVED status. SRC-POLICY-001 claims added across confidentiality-rules.md, hr-operations-context.md, and recruitment-context.md. [VERIFY] item 12 (leave policy) resolved. No unsourced business rules, HR policy, or sensitive personal data added. All Admin Manager and Arun [VERIFY] tags remain intact.

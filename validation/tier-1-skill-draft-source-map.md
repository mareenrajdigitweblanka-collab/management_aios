---
name: tier-1-skill-draft-source-map
type: validation
created: 2026-06-23
tracks: skills/ — Tier 1 Skill Drafts, Foundation Draft v0.1
---

# Tier 1 Skill Draft Source Map

Every claim, workflow step, checklist item, threshold, and output field in the four Tier 1 skill draft files is traced here to its Source ID.

**Pass rule:** Every row must have a Source ID or a [VERIFY] status. Any row with neither is a validation failure.

---

## Source Map Table

| Skill File | Section | Claim / Workflow Step | Source ID | Status | VERIFY? | Notes |
|------------|---------|----------------------|-----------|--------|---------|-------|
| management-gap-detection.md | §1 What It Does | AIOS exists to identify operational gaps and recurring problems | SRC-VAR-001 | CONFIRMED | — | Direct from AIOS Extraction Summary |
| management-gap-detection.md | §2 What It Does NOT Do | Does not make management or HR decisions | SRC-VAR-001 | CONFIRMED | — | AIOS is intelligence layer, not decision layer |
| management-gap-detection.md | §2 What It Does NOT Do | Does not finalize escalation paths (Admin Manager) | SRC-ADMIN-001 PENDING | [VERIFY] | YES | Items 1–5 in verify-register.md |
| management-gap-detection.md | §2 What It Does NOT Do | Does not remove [VERIFY] tags | — | Process rule | — | Governance rule from CLAUDE.md §12 |
| management-gap-detection.md | §2 What It Does NOT Do | Does not store personally identifiable sensitive HR data | SRC-VAR-001 | CONFIRMED | — | Sensitivity guidance |
| management-gap-detection.md | §3 Allowed Inputs | Process-level and aggregate information only | SRC-VAR-001 | CONFIRMED | — | Default position in confidentiality-rules.md |
| management-gap-detection.md | §4.1 Onboarding Gaps | Pre-employment documents before start date | SRC-POLICY-001 §3.0 | CONFIRMED | — | §3.0 structured onboarding |
| management-gap-detection.md | §4.1 Onboarding Gaps | First-day orientation (team, culture, policies) | SRC-POLICY-001 §3.0 | CONFIRMED | — | §3.0 structured onboarding |
| management-gap-detection.md | §4.1 Onboarding Gaps | Role-specific training with mentor/supervisor | SRC-POLICY-001 §3.0 | CONFIRMED | — | §3.0 structured onboarding |
| management-gap-detection.md | §4.1 Onboarding Gaps | AI tool training mandatory during onboarding | SRC-POLICY-001 §17.0 | CONFIRMED | — | §17.0 mandatory AI tools |
| management-gap-detection.md | §4.1 Onboarding Gaps | PDPA notice issued and acknowledgement recorded | SRC-MAYU-001 | CONFIRMED | — | PDPA tracking section |
| management-gap-detection.md | §4.2 Leave Gaps | 48-hour advance notice requirement | SRC-POLICY-001 §6.1 | CONFIRMED | — | §6.1 general leave |
| management-gap-detection.md | §4.2 Leave Gaps | 12% simultaneous leave cap | SRC-POLICY-001 §6.1 | CONFIRMED | — | §6.1 general leave |
| management-gap-detection.md | §4.2 Leave Gaps | Team leave limits (2 per day, 1 for CST/Content/Postage) | SRC-POLICY-001 §6.1 | CONFIRMED | — | §6.1 general leave |
| management-gap-detection.md | §4.2 Leave Gaps | Unplanned leave exceeds 5 days per year | SRC-POLICY-001 §6.3 | CONFIRMED | — | §6.3 unplanned leave |
| management-gap-detection.md | §4.2 Leave Gaps | Leave during 3-month probation restriction | SRC-POLICY-001 §6.2 | CONFIRMED | — | §6.2 planned leave |
| management-gap-detection.md | §4.2 Leave Gaps | Short leave max 2 hours/month with 24-hour notice | SRC-POLICY-001 §6.4 | CONFIRMED | — | §6.4 short leave |
| management-gap-detection.md | §4.2 Leave Gaps | Maternity leave 30-day prior notice | SRC-POLICY-001 §6.5 | CONFIRMED | — | §6.5 maternity leave |
| management-gap-detection.md | §4.3 KPI Meeting Gaps | KPI meeting not scheduled or cancelled | SRC-VAR-001 | CONFIRMED | — | Focus Area 3 — KPI meeting irregularities |
| management-gap-detection.md | §4.3 KPI Meeting Gaps | Weekly AXIOM data submitted by Mayurika to Arun | SRC-MAYU-001 | CONFIRMED | — | Weekly AXIOM Submission section |
| management-gap-detection.md | §4.3 KPI Meeting Gaps | Management review after AXIOM band assignment | SRC-ARUN-001 | CONFIRMED | — | §6 weekly workflow |
| management-gap-detection.md | §4.3 KPI Meeting Gaps | Leadership Review twice-weekly schedule | SRC-MAYU-001 | CONFIRMED | — | Section 3: Leadership Review Coordination |
| management-gap-detection.md | §4.4 File/Decision Gaps | Management decision not recorded | SRC-VAR-001 | CONFIRMED | — | Focus Area 4 — management file disorganization |
| management-gap-detection.md | §4.4 File/Decision Gaps | recruitment_source_id and recruitment_promise_set_id written at Month 6 | SRC-MAYU-001 | CONFIRMED | — | Section 1: Month 6 Handoff |
| management-gap-detection.md | §4.5 Recurring Problems | Critic Meeting action items tracked and closed | SRC-MAYU-001 | CONFIRMED | — | Section 5: Critic Meeting Management |
| management-gap-detection.md | §4.5 Recurring Problems | SKILL file non-compliance same-day follow-up | SRC-MAYU-001 | CONFIRMED | — | Section 6: SKILL File Compliance |
| management-gap-detection.md | §4.5 Recurring Problems | Month 1 corrective action followed up at Month 3 | SRC-SUMAN-001-v2 | CONFIRMED | — | §8 Month 3 Review |
| management-gap-detection.md | §4.6 Policy Compliance | AI tool daily use monitored | SRC-POLICY-001 §17.0 | CONFIRMED | — | §17.0 mandatory AI tools |
| management-gap-detection.md | §4.6 Policy Compliance | AI reorientation on department change | SRC-POLICY-001 §17.0 | CONFIRMED | — | §17.0 mandatory AI tools |
| management-gap-detection.md | §4.6 Policy Compliance | Monthly AI contribution reported | SRC-POLICY-001 §17.0 | CONFIRMED | — | §17.0 mandatory AI tools |
| management-gap-detection.md | §4.6 Policy Compliance | Late arrival more than 2 instances per month | SRC-POLICY-001 §5.0 | CONFIRMED | — | §5.0 late arrival |
| management-gap-detection.md | §4.6 Policy Compliance | Working hours below 41.5/week | SRC-POLICY-001 §16.0 | CONFIRMED | — | §16.0 hours of work |
| management-gap-detection.md | §4.6 Policy Compliance | Work hours not logged daily | SRC-POLICY-001 §15.0 | CONFIRMED | — | §15.0 time tracking |
| management-gap-detection.md | §4.6 Policy Compliance | Exit interview and final checklist on departure | SRC-POLICY-001 §10.6–10.7 | CONFIRMED | — | §10.6–10.7 offboarding |
| management-gap-detection.md | §4.6 Policy Compliance | Credentials revoked on departure | SRC-POLICY-001 §10.5 | CONFIRMED | — | §10.5 credential revocation |
| management-gap-detection.md | §6 VERIFY Constraints | Admin Manager escalation [VERIFY] | SRC-ADMIN-001 PENDING | [VERIFY] | YES | Items 1–5 in verify-register.md |
| management-gap-detection.md | §6 VERIFY Constraints | MD-specific requirements [VERIFY] | SRC-VAR-001 | [VERIFY] | YES | Items 6–7 in verify-register.md |
| management-gap-detection.md | §6 VERIFY Constraints | Director authority beyond leadership review [VERIFY] | SRC-MAYU-001 partial | [VERIFY] | YES | Item 12 in verify-register.md |
| management-gap-detection.md | §6 VERIFY Constraints | Exact HR and EOD tool names [VERIFY] | SRC-MAYU-001 | [VERIFY] | YES | Item 13 in verify-register.md |
| recruitment-quality-check.md | §1 What It Does | Recruitment process completeness and quality checking | SRC-SUMAN-001-v2 | CONFIRMED | — | Primary source for all recruitment process claims |
| recruitment-quality-check.md | §4.1 Pipeline | Sourcing channels: referrals, social media, recruitment websites | SRC-SUMAN-001-v2 | CONFIRMED | — | §1 candidate pipeline |
| recruitment-quality-check.md | §4.1 Pipeline | Shortlisting against position requirements and vacancy | SRC-SUMAN-001-v2 | CONFIRMED | — | §1 candidate pipeline |
| recruitment-quality-check.md | §4.2 Screening | 8-point screening criteria (all 8 items) | SRC-SUMAN-001-v2 | CONFIRMED | — | §2 screening criteria |
| recruitment-quality-check.md | §4.3 Interview | 5 scoring areas × 10 marks = 50 total | SRC-SUMAN-001-v2 | CONFIRMED | — | §3 interview scoring |
| recruitment-quality-check.md | §4.3 Interview | Above 30 marks threshold for recruitment consideration | SRC-SUMAN-001-v2 | CONFIRMED | — | §3 interview scoring |
| recruitment-quality-check.md | §4.4 Tracking | Rejected and on-hold tracking sheets | SRC-SUMAN-001-v2 | CONFIRMED | — | §4 candidate tracking |
| recruitment-quality-check.md | §4.5 Commitment | Documented commitment record with every offer | SRC-SUMAN-001-v2 | CONFIRMED | — | §5 commitment records |
| recruitment-quality-check.md | §4.5 Commitment | Covers 7-day period and post-7-day commitments | SRC-SUMAN-001-v2 | CONFIRMED | — | §5 commitment records |
| recruitment-quality-check.md | §4.6 7/14-Day Review | Trainer/Team Leader evaluation report required | SRC-SUMAN-001-v2 | CONFIRMED | — | §6 7/14-day review |
| recruitment-quality-check.md | §4.6 7/14-Day Review | 7 assessment areas (including AI/LLM adoption) | SRC-SUMAN-001-v2 | CONFIRMED | — | §6 7/14-day review |
| recruitment-quality-check.md | §4.7 Month 1 | Probation leave restriction — no leave during 3 months | SRC-POLICY-001 §6.2 | CONFIRMED | — | §6.2 planned leave; cross-referenced with recruitment context |
| recruitment-quality-check.md | §4.7 Month 1 | 4 assessment areas | SRC-SUMAN-001-v2 | CONFIRMED | — | §7 Month 1 review |
| recruitment-quality-check.md | §4.7 Month 1 | 4 status categories (On Track/Watch/Concern/Critical) | SRC-SUMAN-001-v2 | CONFIRMED | — | §7 Month 1 review |
| recruitment-quality-check.md | §4.7 Month 1 | Corrective action plan required for "Concern" status | SRC-SUMAN-001-v2 | CONFIRMED | — | §7 Month 1 review |
| recruitment-quality-check.md | §4.8 Month 3 | 4 assessment areas | SRC-SUMAN-001-v2 | CONFIRMED | — | §8 Month 3 review |
| recruitment-quality-check.md | §4.8 Month 3 | Corrective action plan progress assessed | SRC-SUMAN-001-v2 | CONFIRMED | — | §8 Month 3 review |
| recruitment-quality-check.md | §4.8 Month 3 | Discontinuation subject to management review and approval | SRC-SUMAN-001-v2 | CONFIRMED | — | §8 Month 3 review — skill does not make this decision |
| recruitment-quality-check.md | §4.9 Month 6 | 3 assessment areas | SRC-SUMAN-001-v2 | CONFIRMED | — | §9 Month 6 review |
| recruitment-quality-check.md | §4.10 180-Day Handover | Mayurika 2-week proactive reminder | SRC-MAYU-001 | CONFIRMED | — | Section 1: Solutions Implemented |
| recruitment-quality-check.md | §4.10 180-Day Handover | 15-minute structured meeting | SRC-SUMAN-001-v2 | CONFIRMED | — | §11 180-day handover |
| recruitment-quality-check.md | §4.10 180-Day Handover | Confirmed attendees: Mayurika, Arun, Suman | SRC-SUMAN-001-v2, SRC-MAYU-001 | CONFIRMED | — | §11; Section 1 |
| recruitment-quality-check.md | §4.10 180-Day Handover | Line Manager attendee — typing correction; no Line Manager role in handover; attendees confirmed as Mayurika, Arun, Suman only | SRC-SUMAN-CONF-001 | CONFIRMED — Suman correction 2026-06-25 | NO | Former item 11 in verify-register.md — resolved by SRC-SUMAN-CONF-001; Suman confirmed the reference was a typing mistake |
| recruitment-quality-check.md | §4.10 180-Day Handover | 4 handover review areas | SRC-SUMAN-001-v2 | CONFIRMED | — | §11 180-day handover |
| recruitment-quality-check.md | §4.10 180-Day Handover | recruitment_source_id written to staff record | SRC-MAYU-001 | CONFIRMED | — | Section 1: Month 6 Handoff |
| recruitment-quality-check.md | §4.10 180-Day Handover | recruitment_promise_set_id written to staff record | SRC-MAYU-001 | CONFIRMED | — | Section 1: Month 6 Handoff |
| recruitment-quality-check.md | §4.11 Source Quality | Activity metrics (applications, response rates, costs) | SRC-SUMAN-001-v2 | CONFIRMED | — | §10 source quality monitoring |
| recruitment-quality-check.md | §4.11 Source Quality | Quality metrics (long-term success, probation completion, performance) | SRC-SUMAN-001-v2 | CONFIRMED | — | §10 source quality monitoring |
| recruitment-quality-check.md | §4.12 Daily Capture | 1 hour/day; 6 topic areas | SRC-SUMAN-001-v2 | CONFIRMED | — | §12 daily knowledge capture |
| kpi-axiom-review-support.md | §1 What It Does | KPI/AXIOM review support — reference and checklist | SRC-ARUN-001 | CONFIRMED | — | Primary source for all KPI/AXIOM claims |
| kpi-axiom-review-support.md | §2 What It Does NOT Do | Arun holds AXIOM band placement authority | SRC-MAYU-001, SRC-ARUN-001 | CONFIRMED | — | Explicit in both sources |
| kpi-axiom-review-support.md | §2 What It Does NOT Do | PRC Approval required for bonus — skill does not approve | SRC-ARUN-001 §9 | CONFIRMED | — | §9 bonus eligibility |
| kpi-axiom-review-support.md | §4 KPI Definitions | All 7 team KPI sets | SRC-ARUN-001 | CONFIRMED | — | §1 KPI definitions |
| kpi-axiom-review-support.md | §5.1 Net Sales Bands | Red (Below 300) through Purple (Above 3,000) | SRC-ARUN-001 | CONFIRMED | — | §2 AXIOM band placement |
| kpi-axiom-review-support.md | §5.2 NNV Bands | Red (Negative) through Purple (50%+) | SRC-ARUN-001 | CONFIRMED | — | §2 AXIOM band placement |
| kpi-axiom-review-support.md | §6 Risk Detection | YOY Growth below 30% | SRC-ARUN-001 | CONFIRMED | — | §3 KPI detection criteria |
| kpi-axiom-review-support.md | §6 Risk Detection | Website ROAS below 400% | SRC-ARUN-001 | CONFIRMED | — | §3 KPI detection criteria |
| kpi-axiom-review-support.md | §6 Risk Detection | Amazon ACOS Below 25% | SRC-ARUN-001 | [VERIFY] | YES | Item 8 in verify-register.md — wording unclear; confirm with Arun |
| kpi-axiom-review-support.md | §6 Risk Detection | eBay ACOS below 20% | SRC-ARUN-001 | CONFIRMED | — | §3 KPI detection criteria |
| kpi-axiom-review-support.md | §6 Risk Detection | Incident Score below 15/25; 3+ reports; repeated misses; missing docs; low ROI; low NNV; poor utilisation | SRC-ARUN-001 | CONFIRMED | — | §3 KPI detection criteria |
| kpi-axiom-review-support.md | §7 Review Inputs | Revenue, Profit, YOY Growth, ROAS, ACOS, Net Sales, Task Completion, Documentation, Incidents, ROI, TL Feedback, Auditor Feedback | SRC-ARUN-001 | CONFIRMED | — | §4 review inputs |
| kpi-axiom-review-support.md | §7 Review Inputs | ROI Officer Feedback | SRC-ARUN-001 | [VERIFY] | YES | Item 10 in verify-register.md — role identity unclear; confirm with Arun |
| kpi-axiom-review-support.md | §8 Review Outputs | AXIOM Score, Band, NNV Band, Risk Level, Coaching, Training, Warning, PIP, Bonus, Promotion | SRC-ARUN-001 | CONFIRMED | — | §5 review outputs |
| kpi-axiom-review-support.md | §9 Weekly Workflow | 7-step workflow: Collect → Calculate → Assign → Identify → Review → Action → Monitor | SRC-ARUN-001 | CONFIRMED | — | §6 weekly AXIOM workflow |
| kpi-axiom-review-support.md | §10.1 Time-Based Escalation | Week 1 Coaching through Week 8 Third Warning + PRC | SRC-ARUN-001 | CONFIRMED | — | §7 incident management and escalation |
| kpi-axiom-review-support.md | §10.2 Count-Based Escalation | Count 1 Coaching through 5+ PRC Action | SRC-ARUN-001 | CONFIRMED | — | §7 incident management and escalation |
| kpi-axiom-review-support.md | §11.1 PRC Membership | MD and Implementation Officer (Arun) | SRC-ARUN-001 | CONFIRMED | — | §8 PRC governance |
| kpi-axiom-review-support.md | §11.1 PRC Membership | Team Leader | SRC-ARUN-001 | CONFIRMED | — | §8 PRC governance |
| kpi-axiom-review-support.md | §11.1 PRC Membership | Admin Manager | SRC-ARUN-001 | [VERIFY] | YES | Item 3 in verify-register.md — SRC-ADMIN-001 pending |
| kpi-axiom-review-support.md | §11.1 PRC Membership | Operational Manager | SRC-ARUN-001 | [VERIFY] | YES | Item 9 in verify-register.md — scope unconfirmed |
| kpi-axiom-review-support.md | §11.2 PRC Responsibilities | KPI Review, Bonus Approval, Escalation Decisions, Promotion Reviews | SRC-ARUN-001 | CONFIRMED | — | §8 PRC governance |
| kpi-axiom-review-support.md | §12 Bonus Eligibility | All 7 eligibility conditions | SRC-ARUN-001 | CONFIRMED | — | §9 bonus eligibility |
| kpi-axiom-review-support.md | §13.1 Dashboard Cadence | Weekly: Revenue, Profit, AXIOM Band, Incident Tracking | SRC-ARUN-001 | CONFIRMED | — | §10 management dashboard |
| kpi-axiom-review-support.md | §13.1 Dashboard Cadence | Monthly: KPI Achievement, YOY, ROI, Bonus, Dept Performance | SRC-ARUN-001 | CONFIRMED | — | §10 management dashboard |
| kpi-axiom-review-support.md | §13.2 Dashboard Views | Staff, Team, Department, Portfolio, Incident, Bonus, PRC Review | SRC-ARUN-001 | CONFIRMED | — | §10 management dashboard |
| policy-lookup.md | §1 What It Does | Policy lookup from SRC-POLICY-001 — Final Approved | SRC-POLICY-001 | CONFIRMED | — | Varmen reviewed; registered 2026-06-23 |
| policy-lookup.md | §4.1 Salary Confidentiality | Employees must not share/discuss salary, bonuses, allowances | SRC-POLICY-001 §2.0 | CONFIRMED | — | §2.0 company policy |
| policy-lookup.md | §4.2 General Confidentiality | Protect staff personal data, customer data, financial records, proprietary details | SRC-POLICY-001 §14.0 | CONFIRMED | — | §14.0 company policy |
| policy-lookup.md | §4.3 Digital Assets | Private and confidential; company property; no unauthorised social media groups | SRC-POLICY-001 §11.0 | CONFIRMED | — | §11.0 company policy |
| policy-lookup.md | §4.4 Physical Assets | Return in good condition; report loss/damage | SRC-POLICY-001 §11.2 | CONFIRMED | — | §11.2 company policy |
| policy-lookup.md | §4.5 Leave Policy | All leave rules (general, notice periods, entitlements, unplanned, short, maternity) | SRC-POLICY-001 §6.0–6.5 | CONFIRMED | — | §6.0–6.5 company policy |
| policy-lookup.md | §4.6 Onboarding | Pre-employment docs, orientation, training, probation, AI training | SRC-POLICY-001 §3.0, §17.0 | CONFIRMED | — | §3.0 and §17.0 company policy |
| policy-lookup.md | §4.7 Resignation | 2-month (60-day) notice; immediate resignation forfeits entitlements | SRC-POLICY-001 §10.1–10.2 | CONFIRMED | — | §10.1–10.2 company policy |
| policy-lookup.md | §4.8 Company-Initiated Termination | 2-month notice; immediate for gross misconduct | SRC-POLICY-001 §10.3–10.4 | CONFIRMED | — | §10.3–10.4 company policy |
| policy-lookup.md | §4.9 Payment on Termination | Voluntary: no payment; company-initiated: days worked | SRC-POLICY-001 §2.2 | CONFIRMED | — | §2.2 company policy |
| policy-lookup.md | §4.10 Offboarding | Credential revocation; exit interview by HR; final checklist signed by employee, manager, HR | SRC-POLICY-001 §10.5–10.7 | CONFIRMED | — | §10.5–10.7 company policy |
| policy-lookup.md | §4.11 Post-Departure | Ongoing confidentiality; no access to company digital assets post-departure | SRC-POLICY-001 §10.8 | CONFIRMED | — | §10.8 company policy |
| policy-lookup.md | §4.12 Workplace Conduct | No-gossip; feedback channels; constructive criticism | SRC-POLICY-001 §4.0–4.1 | CONFIRMED | — | §4.0–4.1 company policy |
| policy-lookup.md | §4.13 Non-Solicitation | No outside business relationships without written consent | SRC-POLICY-001 §12.0 | CONFIRMED | — | §12.0 company policy |
| policy-lookup.md | §4.14 Code of Conduct | Act in company's best interest; use designated communication tools | SRC-POLICY-001 §13.0 | CONFIRMED | — | §13.0 company policy |
| policy-lookup.md | §4.15 Mandatory AI Tools | Daily use mandatory; performance review impact; non-compliance escalation | SRC-POLICY-001 §17.0 | CONFIRMED | — | §17.0 company policy |
| policy-lookup.md | §4.16 Late Arrival | 2 instances/month; deduction schedule (15 min → 30 min deduction; 30–60 min → 4 hrs) | SRC-POLICY-001 §5.0 | CONFIRMED | — | §5.0 company policy |
| policy-lookup.md | §4.17 Phone Usage | No phones in office; emergency calls max 5 min outside workspace; no social media | SRC-POLICY-001 §7.0 | CONFIRMED | — | §7.0 company policy |
| policy-lookup.md | §4.18 Headphone Usage | Virtual meetings or audio concentration only | SRC-POLICY-001 §8.0 | CONFIRMED | — | §8.0 company policy |
| policy-lookup.md | §4.19 Focus Time | 8:30 AM and 9:00 AM structured blocks; Skype restricted during deep work | SRC-POLICY-001 §9.0 | CONFIRMED | — | §9.0 company policy |
| policy-lookup.md | §4.20 Hours of Work | Minimum 41.5 hours per week | SRC-POLICY-001 §16.0 | CONFIRMED | — | §16.0 company policy |
| policy-lookup.md | §4.21 Time Tracking | Daily work hours log required | SRC-POLICY-001 §15.0 | CONFIRMED | — | §15.0 company policy |
| policy-lookup.md | §7 VERIFY Constraints | Admin Manager escalation paths [VERIFY] | SRC-ADMIN-001 PENDING | [VERIFY] | YES | Items 1–5 in verify-register.md |
| policy-lookup.md | §7 VERIFY Constraints | MD-specific requirements [VERIFY] | SRC-VAR-001 | [VERIFY] | YES | Items 6–7 in verify-register.md |
| policy-lookup.md | §7 VERIFY Constraints | Director authority beyond leadership review [VERIFY] | SRC-MAYU-001 partial | [VERIFY] | YES | Item 12 in verify-register.md |
| policy-lookup.md | §7 VERIFY Constraints | Exact HR and EOD tool names [VERIFY] | SRC-MAYU-001 | [VERIFY] | YES | Item 13 in verify-register.md |

| management-gap-detection.md | §4.3 KPI Meeting Gaps | Technical team stand-up not evidencing coverage of user-facing work and deliverables | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 22/06/2026 |
| management-gap-detection.md | §4.4 File/Decision Gaps | Requirement file metadata missing or incomplete (8 required fields) | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 16/06/2026 |
| management-gap-detection.md | §4.4 File/Decision Gaps | Verbal MD instruction executed without written, documented requirement | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 16/06/2026 and 15/05/2026 |
| management-gap-detection.md | §4.4 File/Decision Gaps | Project or development work started without a documented requirement file | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 16/06/2026 |
| management-gap-detection.md | §4.4 File/Decision Gaps | Task has no unique Task ID assigned | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 19/11/2025 |
| management-gap-detection.md | §4.4 File/Decision Gaps | BGCT documents not collected and stored centrally | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 08/06/2026 |
| management-gap-detection.md | §4.4 File/Decision Gaps | Management Team Google Sheets not identified, listed, or consolidated | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 08/06/2026 |
| management-gap-detection.md | §4.4 File/Decision Gaps | Staff biodata documents not consolidated under PDPA-compliant access controls | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 08/06/2026; PDPA and confidentiality rules apply; no personal biodata content stored in AIOS |
| management-gap-detection.md | §4.4 File/Decision Gaps | Business logic documentation not in plain English comprehensible by fresh joiner | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 10/02/2026 and 24/03/2026 |
| management-gap-detection.md | §4.5 Recurring Problems | New employee ROI review not conducted at 1-week, 1-month, or 3-month milestone | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 16/06/2026 |
| management-gap-detection.md | §4.5 Recurring Problems | Developer or technical project not reviewed for ROI or value delivery on conclusion | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 16/06/2026 |
| management-gap-detection.md | §4.5 Recurring Problems | Lessons learned document not produced or stored after project or case outcome | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 16/06/2026 |
| management-gap-detection.md | §4.7 LLM-Queryable Compliance | Work activities not documented in LLM-queryable format ("not happened" principle) | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 22/05/2026 and 22/06/2026 |
| management-gap-detection.md | §4.7 LLM-Queryable Compliance | Daily 10% business logic validation not completed or not evidenced | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 22/05/2026 |
| management-gap-detection.md | §4.7 LLM-Queryable Compliance | Development work initiated before 85% of requirements documented and approved | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 22/05/2026 and 15/05/2026 |
| management-gap-detection.md | §4.7 LLM-Queryable Compliance | EOD entry missing Actual Revenue per Hour metric | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 10/02/2026; cross-reference SRC-MAYU-001 §4 |
| recruitment-quality-check.md | §1 What It Does | Suman formal role: Head Hunter, Onboarder, 6-Month Progress ROI Reviewer | SRC-MD-SUMAN-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-SUMAN-001; Varmen Reviewed 2026-06-25 |
| recruitment-quality-check.md | §4.1 Pipeline | LLM-queryable onboarding implementation from day one of new recruit joining | SRC-MD-SUMAN-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-SUMAN-001 28/05/2026 |
| recruitment-quality-check.md | §4.7 Month 1 | Dan Martel poster communicated at onboarding ("WE HIRE THEM TO SAVE COMPANY TIME") | SRC-MD-SUMAN-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-SUMAN-001 07/05/2026 |
| recruitment-quality-check.md | §4.9 Month 6 | Six-month hire ROI audit (binary) conducted by Suman before handover | SRC-MD-SUMAN-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-SUMAN-001 07/05/2026; audit covers revenue, margin, NNV, automation, capacity |
| recruitment-quality-check.md | §4.9 Month 6 | ROI audit evidence documented and present before 180-day handover proceeds | SRC-MD-SUMAN-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-SUMAN-001 07/05/2026 |
| recruitment-quality-check.md | §4.10 180-Day Handover | In-flight performance evidence provided by Mayurika to Suman before 6-month ROI audit | SRC-MD-SUMAN-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-SUMAN-001 07/05/2026 |
| recruitment-quality-check.md | §4.12 Daily Capture | Weekly deliverable: Risk Identification submitted | SRC-MD-SUMAN-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-SUMAN-001 07/05/2026 |
| recruitment-quality-check.md | §4.12 Daily Capture | Weekly deliverable: One-Month Task Rule submitted | SRC-MD-SUMAN-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-SUMAN-001 07/05/2026 |
| recruitment-quality-check.md | §4.12 Daily Capture | Weekly deliverable: SKU/Margin/Hire-ROI Trace submitted | SRC-MD-SUMAN-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-SUMAN-001 07/05/2026 |
| recruitment-quality-check.md | §4.12 Daily Capture | Weekly deliverable: LLM-in-the-Loop Proof submitted | SRC-MD-SUMAN-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-SUMAN-001 07/05/2026 |
| recruitment-quality-check.md | §4.12 Daily Capture | Shovel-ready requirement document maintained for development team | SRC-MD-SUMAN-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-SUMAN-001 07/05/2026 |
| recruitment-quality-check.md | §4.12 Daily Capture | 14-day recruitment pipeline baseline established and maintained | SRC-MD-SUMAN-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-SUMAN-001 |
| recruitment-quality-check.md | §4.13 OLOS Validation | OLOS validated by Suman before go-live; 5 required OLOS documents validated | SRC-MD-SUMAN-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-SUMAN-001 29/05/2026 |
| recruitment-quality-check.md | §4.13 OLOS Validation | Pre-go-live requirements: department handbooks, role guides, SOPs, universal files, folder structure, mandatory files | SRC-MD-SUMAN-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-SUMAN-001 29/05/2026 |
| recruitment-quality-check.md | §4.14 BGCT Compliance | BGCT completion for all staff who joined within last 6 months | SRC-MD-SUMAN-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-SUMAN-001 25/05/2026 |
| recruitment-quality-check.md | §4.14 BGCT Compliance | Onboarding documents updated with BGCT details and requirements | SRC-MD-SUMAN-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-SUMAN-001 25/05/2026 |
| recruitment-quality-check.md | §4.6 7/14-Day Review — Historical Gap Evidence | SRC-SUMAN-002 as optional historical evidence — check when input relates to 7-day training quality, training documentation completeness, practical training/demo gaps, AI tool access limitations, or training support gaps | SRC-SUMAN-002 | CONFIRMED — Evidence boundary applied | NO | Historical raw action/gap data only; boundary: not solution evidence, not approval evidence, not policy change, not [VERIFY] resolution; trainee names not expanded |
| recruitment-quality-check.md | §4.6 7/14-Day Review — SRC-SUMAN-002 boundary | Do not use SRC-SUMAN-002 to mark 7-day training as failed, passed, solved, approved, or escalated | SRC-SUMAN-002 | CONFIRMED | NO | Boundary stated in §4.6 and source note |
| kpi-axiom-review-support.md | §14.1 New Employee ROI | ROI milestone evidence at 1 week, 1 month, and 3 months for all new employees | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 16/06/2026 |
| kpi-axiom-review-support.md | §14.2 Project ROI | Developer or technical project ROI evidence documented on conclusion | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 16/06/2026 |
| kpi-axiom-review-support.md | §14.2 Project ROI | Business value contribution traceable to project output | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 16/06/2026 |
| kpi-axiom-review-support.md | §14.3 Requirement Metadata | 8 required metadata fields for requirement files before project work begins | SRC-MD-HR-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | SRC-MD-HR-001 16/06/2026 |
| policy-lookup.md | §1 Scope Boundary | MD governance sources (SRC-MD-HR-001, SRC-MD-SUMAN-001) are not policy — handled by other skills | SRC-MD-HR-001, SRC-MD-SUMAN-001 | CONFIRMED — Varmen Reviewed 2026-06-25 | NO | Boundary clarification only; no MD governance content added to policy lookup |

---

## Source Map Summary

| Skill File | CONFIRMED Rows | [VERIFY] Rows | Total Rows |
|------------|---------------|--------------|-----------|
| management-gap-detection.md | 46 | 4 | 50 |
| recruitment-quality-check.md | 44 | 1 | 45 |
| kpi-axiom-review-support.md | 28 | 4 | 32 |
| policy-lookup.md | 26 | 4 | 30 |
| **TOTAL** | **145** | **12** | **157** |

*Updated 2026-06-25 (SRC-SUMAN-002): +2 CONFIRMED rows added for recruitment-quality-check.md §4.6 — SRC-SUMAN-002 historical gap evidence optional note and boundary statement. No [VERIFY] items changed. All 12 open items remain unchanged.*

*Updated 2026-06-25 (SRC-SUMAN-CONF-001): Line Manager attendee identity row updated from [VERIFY] to CONFIRMED — Suman confirmed the reference was a typing mistake; no Line Manager role in handover. [VERIFY] count reduced from 13 to 12. Previously updated 2026-06-25: +37 CONFIRMED rows added from SRC-MD-HR-001 and SRC-MD-SUMAN-001.*

---

## Validation Result

**PASS — Updated 2026-06-25 (SRC-SUMAN-CONF-001)** — All 155 rows have either a Source ID with CONFIRMED status or a [VERIFY] tag with the relevant verify-register.md item number cited. No row is unsourced. Line Manager attendee identity row updated to CONFIRMED — Suman correction 2026-06-25. All remaining Admin Manager, Arun wording, and MD-requirement [VERIFY] items are preserved. Total: 143 CONFIRMED, 12 [VERIFY].

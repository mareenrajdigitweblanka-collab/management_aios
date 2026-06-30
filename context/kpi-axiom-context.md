---
name: kpi-axiom-context
type: context
source-ids: SRC-ARUN-001, SRC-MD-ARUN-001
created: 2026-06-23
status: CONDITIONAL PASS — Foundation Draft v0.1
---

# KPI / AXIOM Context

**Pass/Fail Rule:** PASS if all KPI, AXIOM, escalation, and governance claims trace to SRC-ARUN-001 and all unresolved wording items retain their [VERIFY] tags. FAIL if any [VERIFY] tag is removed without Arun confirmation, or if new performance rules are added without a registered source.

> Note: This file reflects the content of SRC-ARUN-001 as provided by Arun (Implementation Officer). Where source wording is abbreviated or ambiguous, the original phrasing is preserved and a [VERIFY — Arun] tag is applied.

---

## 1. KPI Definitions by Team

*(Source: SRC-ARUN-001 — Section 1)*

| Team | KPIs |
|------|------|
| Portfolio Holders | 30%+ YOY Growth, Individual Staff Net Sales, Category Profitability |
| Website Team | 30%+ YOY Growth, ROAS >= 400%, Documentation Compliance |
| eBay Team | 30%+ YOY Growth, ACOS <= 20%, Individual Staff Net Sales |
| Account Holders | Assigned ID Performance, Task Compliance, Incident Compliance |
| PPC Team | ROAS Achievement, YOY Growth, Cost Efficiency |
| Technical Team | ROI Contribution, Automation Time Saving Hours, Documentation Quality, Queryable Assets |
| Development Team | ROI Contribution, Time Serving Hours, Delivery Timeliness, Evidence Submission, Queryable Assets |

---

## 2. AXIOM Band Placement

*(Source: SRC-ARUN-001 — Section 2)*

AXIOM band placement authority is held by Arun (Implementation Officer). Mayurika submits weekly AXIOM data to Arun but does not write band placements.

**Individual Staff Net Sales Bands:**

| Band | Range |
|------|-------|
| Red | Below 300 |
| Amber | 300–800 |
| Green | 800–1,500 |
| Dark Green | 1,500–3,000 |
| Purple | Above 3,000 |

**NNV (Net New Value) Bands:**

| Band | Range |
|------|-------|
| Red | Negative Growth |
| Amber | 0–14% |
| Green | 15–29% |
| Dark Green | 30–49% |
| Purple | 50%+ |

---

## 3. KPI Detection Criteria

*(Source: SRC-ARUN-001 — Section 3)*

The following conditions trigger KPI risk detection:

| Trigger | Threshold | Status |
|---------|-----------|--------|
| YOY Growth | Below 30% | CONFIRMED |
| Website ROAS | Below 400% | CONFIRMED |
| Amazon ACOS | ACOS below 25% / ROAS 4 *(SRC-ARUN-CONF-001 — Arun confirmed 2026-06-30)* | CONFIRMED |
| eBay ACOS | Below 20% | CONFIRMED |
| Incident Score | Below 15/25 | CONFIRMED |
| Incident reports | 3 or more | CONFIRMED |
| Task misses | Repeated | CONFIRMED |
| Documentation | Missing | CONFIRMED |
| ROI contribution | Low | CONFIRMED |
| NNV growth | Low | CONFIRMED |
| Utilisation | Poor | CONFIRMED |

---

## 4. Review Inputs

*(Source: SRC-ARUN-001 — Section 4)*

Revenue, Profit, YOY Growth, ROAS, ACOS, Individual Staff Net Sales, Task Completion, Documentation Status, Incident Reports, ROI Contribution, Team Leader Feedback, Auditor Feedback (External Auditor: Paraparan), Implementation Officer – Arunraj Feedback *(SRC-ARUN-CONF-001 — Arun confirmed 2026-06-30; replaces "ROI Officer" wording from SRC-ARUN-001)*

---

## 5. Review Outputs

*(Source: SRC-ARUN-001 — Section 5)*

AXIOM Score, AXIOM Band, NNV Band, Risk Level, Coaching Requirement, Training Requirement, Warning Status, PIP Status, Bonus Eligibility, Promotion Candidate Status

---

## 6. Weekly AXIOM Workflow

*(Source: SRC-ARUN-001 — Section 6)*

Collect data weekly → calculate KPI scores → assign bands → identify risks → conduct management review → issue action plans → monitor outcomes

---

## 7. Incident Management and Escalation

*(Source: SRC-ARUN-001 — Section 7)*

**Time-based escalation:**

| Week | Action |
|------|--------|
| Week 1 | Coaching |
| Week 3 | Additional Support |
| Week 5 | First Warning |
| Week 7 | Second Warning |
| Week 8 | Third Warning + PRC Review |

**Incident count escalation:**

| Count | Action |
|-------|--------|
| 1 | Coaching |
| 2 | Observation |
| 3 | Escalation |
| 4 | Final Warning |
| 5+ | PRC Action |

---

## 8. PRC Governance

*(Source: SRC-ARUN-001 — Section 8)*

**Performance Review Committee (PRC) members:**

| Member | Status |
|--------|--------|
| Managing Director | CONFIRMED |
| Implementation Officer (Arun) | CONFIRMED |
| Admin Manager | [VERIFY — awaiting SRC-ADMIN-001: Admin Manager's PRC role and authority within PRC not yet independently confirmed] |
| Team Leader | CONFIRMED |
| Operational Manager | Escalation authority confirmed (SRC-ARUN-CONF-001, 2026-06-30): may delay or avoid suspension/termination under the escalation policy if the staff member provides a firm commitment with a defined deadline to achieve the required ROI. Full PRC membership scope and voting rights remain [VERIFY — awaiting dedicated Operational Manager source]. |

**PRC Responsibilities:**

- KPI Review
- Bonus Approval
- Escalation Decisions
- Promotion Reviews

---

## 9. Bonus Eligibility

*(Source: SRC-ARUN-001 — Section 9)*

All of the following conditions must be met:

| Condition | Threshold |
|-----------|-----------|
| YOY Growth | >= 30% |
| ROAS/ACOS Target | Achieved |
| Individual Staff Net Sales | Green Band or Above |
| Active Incident Reports | None |
| Documentation Compliance | >= 90% |
| ROI | Positive |
| PRC Approval | Required |

---

## 10. Management Dashboard Requirements

*(Source: SRC-ARUN-001 — Section 10)*

**Reporting cadence:**

| Cadence | Contents |
|---------|----------|
| Weekly | Revenue, Profit, AXIOM Band, Incident Tracking |
| Monthly | KPI Achievement, YOY Growth, ROI Contribution, Bonus Eligibility, Department Performance |

**Required dashboard views:**
Staff, Team, Department, Portfolio, Incident, Bonus, PRC Review

---

## 11. KPI Meeting Governance

*(Source: SRC-MD-ARUN-001, 24/06/2025 and 10/07/2025)*

KPI meetings must follow a defined format and governance standard:

| Rule | Standard |
|------|---------|
| Per-person discussion time | Maximum 5 minutes per person (explanation, score discussion, and upcoming action plan) |
| Weekly KPI scores | Required for everyone who performs KPI — no exceptions |
| Post-meeting self-recording | Every participant must record their own KPI score after each meeting |
| KPI Meeting Statistics | Number of attendees, total meeting duration, and Average KPI Time Index must be tracked |
| Weekly self-evaluation | Self-evaluation for the current week required; KPI Scoring Scale applied for upcoming week |
| Discussion quality | Inputs must reflect whether the person has properly analysed and improved their weaknesses — not merely listed problems |

**KPI discussion quality check:** Questions must include: What was attempted? How many attempts succeeded and how many did not? What is the plan for next week? What is the success story for the person or product? What roadmap (BGCT) is being followed?

---

## 12. Bonus Eligibility — LLM-Queryability Extension

*(Source: SRC-MD-ARUN-001, 22/06/2026 and 25/06/2026)*

> **Integration note:** This section extends §9 (Bonus Eligibility — SRC-ARUN-001). It does not replace or contradict the 7 conditions in §9. The relationship between this queryability extension and the §9 conditions requires Varmen confirmation. See validation/md-arun-discussion-conflict-check.md (soft conflict #1).

Bonuses for the Sales Team will be awarded only if work and documentation are maintained in LLM-queryable format. Compliance is verified by the Auditor before bonus eligibility is confirmed.

**Queryability scoring:**

| Score | Standard |
|-------|---------|
| 5 Marks | Fully queryable |
| 1–4 Marks | Partially queryable |
| 0 Marks | Not queryable, but correct skill is documented |
| −1 to −5 Marks | Not queryable and required skill not documented (based on deadline compliance) |

---

## Remaining [VERIFY] Items

| # | [VERIFY] Item | Resolution Needed From | Resolution Condition |
|---|---------------|------------------------|---------------------|
| 1 | Admin Manager PRC role and authority | Admin Manager (SRC-ADMIN-001) | Receive and review Admin Manager documents |

**Resolved by SRC-ARUN-CONF-001 (2026-06-30):**
- Item 1 (original 8): Amazon ACOS threshold — ACOS below 25% / ROAS 4. Confirmed by Arun.
- Item 2 (original 9): Operational Manager escalation authority — confirmed for delay/avoid suspension/termination on firm commitment with deadline. Scope limit preserved: full PRC membership scope and voting rights remain [VERIFY] pending dedicated Operational Manager source.
- Item 3 (original 10): ROI Officer identity — confirmed as Implementation Officer – Arunraj; External Auditor = Paraparan.

---

## Source IDs Used in This File

| Claim Area | Source ID | Status |
|------------|-----------|--------|
| All KPI, AXIOM, escalation, PRC, bonus, and dashboard claims | SRC-ARUN-001 | CONFIRMED |
| Amazon ACOS threshold, Operational Manager escalation authority, ROI Officer / auditor identity | SRC-ARUN-CONF-001 | CONFIRMED — Arun reviewed 2026-06-30 |
| KPI meeting governance (§11) | SRC-MD-ARUN-001 | CONFIRMED — Varmen reviewed by project default |
| Bonus queryability extension (§12) | SRC-MD-ARUN-001 | CONFIRMED — Varmen reviewed by project default; Varmen confirmation of integration with §9 recommended |

---

## Pass/Fail Result

**PASS** — All claims trace to registered sources. Arun [VERIFY] items 8, 9, and 10 (original numbering) resolved 2026-06-30 by SRC-ARUN-CONF-001. Admin Manager PRC [VERIFY] remains correctly tagged (SRC-ADMIN-001 PENDING). Operational Manager escalation authority propagated with scope limit preserved. No new performance rules or thresholds added. No sensitive personal data added.

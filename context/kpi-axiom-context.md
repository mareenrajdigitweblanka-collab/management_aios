---
name: kpi-axiom-context
type: context
source-ids: SRC-ARUN-001
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
| Amazon ACOS | Below 25% **[VERIFY — Arun: source wording is "Amazon ACOSBelow 25%" — threshold direction and formatting should be confirmed with Arun]** | [VERIFY] |
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

Revenue, Profit, YOY Growth, ROAS, ACOS, Individual Staff Net Sales, Task Completion, Documentation Status, Incident Reports, ROI Contribution, Team Leader Feedback, Auditor Feedback, ROI Officer Feedback **[VERIFY — Arun: source lists "ROI officer feed back" — confirm whether this is a distinct role or a title for an existing role]**

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
| Operational Manager | [VERIFY — Arun: confirm Operational Manager PRC membership and scope of participation] |

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

## Remaining [VERIFY] Items

| # | [VERIFY] Item | Resolution Needed From | Resolution Condition |
|---|---------------|------------------------|---------------------|
| 1 | Amazon ACOS threshold wording | Arun | Confirm exact threshold direction and formatting |
| 2 | Operational Manager PRC membership scope | Arun or Operational Manager | Confirm membership and scope of participation |
| 3 | ROI Officer feedback — role identity | Arun | Confirm whether distinct role or existing title |
| 4 | Admin Manager PRC role and authority | Admin Manager (SRC-ADMIN-001) | Receive and review Admin Manager documents |

---

## Source IDs Used in This File

| Claim Area | Source ID | Status |
|------------|-----------|--------|
| All KPI, AXIOM, escalation, PRC, bonus, and dashboard claims | SRC-ARUN-001 | CONFIRMED (3 inline [VERIFY] items remain) |

---

## Pass/Fail Result

**CONDITIONAL PASS** — All claims trace to SRC-ARUN-001. All three Arun [VERIFY] items and the Admin Manager PRC [VERIFY] remain correctly tagged. No new performance rules or thresholds added.

---
skill: management-gap-detection
run-date: 2026-06-26
input: "New joiner started 3 days ago — no AI tool training confirmation recorded and no PDPA acknowledgement on file"
mode: DRY-RUN / REVIEW-SUPPORT ONLY
status: DRAFT — Foundation Draft v0.1
---

# Management Gap Detection — Run Output

**Date:** 2026-06-26
**Input Received:** New joiner started 3 days ago — no AI tool training confirmation recorded and no PDPA acknowledgement on file
**Operating Mode:** DRY-RUN / REVIEW-SUPPORT ONLY — no decisions made, no escalations triggered, no sensitive data processed

---

## Gap Records

---

### Gap 1: AI Tool Training Not Confirmed During Onboarding

| Field | Detail |
|---|---|
| **Gap Title** | AI tool training not confirmed for new joiner within onboarding window |
| **Evidence Source** | No AI tool training confirmation recorded as of day 3 of employment. Input reported as process-level observation (no personal data). |
| **Policy / Source Affected** | SRC-POLICY-001 §17.0 — AI tools are mandatory across all departments and roles. All new hires must complete AI tool training as part of onboarding. Non-completion negatively impacts performance reviews. SRC-POLICY-001 §3.0 — structured onboarding includes role-specific training with mentor or supervisor support. SRC-VAR-001 — onboarding gaps are a confirmed AIOS focus area. |
| **Impact** | Company policy breach. AI tool non-compliance is tracked and feeds directly into performance review outcomes under SRC-POLICY-001 §17.0. If unresolved, the new joiner accrues early performance risk with no documented basis for the gap. The AIOS cannot surface evidence of the training occurring if no confirmation record exists. |
| **Owner / Reviewer** | Mayurika — onboarding compliance custodian and staff record write-authority (SRC-MAYU-001). Team Leader — confirms training completions for staff records (CLAUDE.md §5). |
| **[VERIFY] Status** | No [VERIFY] items triggered. AI tool training obligation is fully confirmed in SRC-POLICY-001 §17.0 (READY — Final Approved). No Admin Manager escalation path is asserted — Admin Manager authority scope remains [VERIFY — awaiting SRC-ADMIN-001]. Exact HR/EOD tool names not cited ([VERIFY] item 12 — tool names unconfirmed with Mayurika). |
| **Recommended Next Action** | Mayurika or the assigned Team Leader/supervisor to confirm: (1) whether AI tool training was conducted but not yet recorded, or (2) whether training has not yet occurred. If training was conducted — record the confirmation date in the staff record immediately. If training has not occurred — schedule and complete training without further delay, then record confirmation. Output of this gap record to be reviewed by Mayurika before any action is taken. |

---

### Gap 2: PDPA Acknowledgement Not Recorded for New Joiner

| Field | Detail |
|---|---|
| **Gap Title** | PDPA notice acknowledgement not on file as of day 3 of employment |
| **Evidence Source** | No PDPA acknowledgement recorded as of day 3 of employment. Input reported as process-level observation (no personal data). |
| **Policy / Source Affected** | SRC-MAYU-001 — Mayurika issues PDPA notices to all new joiners and records the acknowledgement date (`pdpa_notice_acknowledged_on`). Staff with a null acknowledgement date are flagged as non-compliant. A monthly PDPA compliance report is prepared for management. CLAUDE.md §9.2 — PDPA compliance tracking is a primary HR governance responsibility. SRC-VAR-001 — onboarding gaps are a confirmed AIOS focus area. |
| **Impact** | PDPA compliance failure. The new joiner is currently flagged as non-compliant in the staff record. This will appear in the monthly PDPA compliance report to management. If the gap persists, it may represent a regulatory risk and will be visible as an unresolved compliance item in the staff record. |
| **Owner / Reviewer** | Mayurika — sole authority for PDPA notice issuance and acknowledgement recording (SRC-MAYU-001). |
| **[VERIFY] Status** | No [VERIFY] items triggered. PDPA issuance and acknowledgement tracking is fully confirmed in SRC-MAYU-001 (READY). No Admin Manager escalation path is asserted — Admin Manager authority scope remains [VERIFY — awaiting SRC-ADMIN-001]. Exact tool names for staff record system not cited ([VERIFY] item 12 — unconfirmed with Mayurika). |
| **Recommended Next Action** | Mayurika to confirm: (1) whether PDPA notice was issued but acknowledgement not yet recorded, or (2) whether PDPA notice has not yet been issued. If issued but unrecorded — record the acknowledgement date in the staff record immediately. If not yet issued — issue PDPA notice and record the acknowledgement date upon receipt. Output of this gap record to be reviewed by Mayurika before any action is taken. |

---

### Proactive Flag: 1-Week ROI Review Milestone Approaching

| Field | Detail |
|---|---|
| **Gap Title** | 1-week new employee ROI review milestone is due in approximately 4 days — scheduling not yet confirmed |
| **Evidence Source** | New joiner started 3 days ago. No information provided about whether the 1-week ROI review has been scheduled. This is a proactive flag, not a confirmed missed milestone. |
| **Policy / Source Affected** | SRC-MD-HR-001 (16/06/2026) — ROI reviews must be conducted at 1 week, 1 month, and 3 months for all new employees. Missing a ROI review at any of these milestones is a governance failure. CLAUDE.md §11.6. |
| **Impact** | If the 1-week ROI review is not scheduled and conducted on time, it constitutes a governance failure under SRC-MD-HR-001. Missing this milestone creates a gap in the new joiner's early tracking record that cannot be retrospectively filled. |
| **Owner / Reviewer** | Mayurika — coordinates new employee review scheduling (SRC-MAYU-001). Relevant Team Leader — provides performance data for the review. |
| **[VERIFY] Status** | No [VERIFY] items triggered. New employee ROI review milestones are confirmed in SRC-MD-HR-001 (READY — Varmen Reviewed 2026-06-25). |
| **Recommended Next Action** | Mayurika or the relevant Team Leader to confirm whether the 1-week ROI review has been scheduled. If not, schedule now to ensure it occurs within the correct milestone window. Record outcome in the staff record and relevant review tracking system. This flag is proactive — no governance failure has occurred yet. |

---

## Run Summary

| Summary Field | Value |
|---|---|
| **PASS / FAIL** | PASS — all gap claims trace to registered sources; all [VERIFY] constraints applied; no Admin Manager escalation paths asserted; no [VERIFY] tags removed |
| **Evidence Sources Used** | SRC-VAR-001, SRC-POLICY-001 (§3.0, §17.0), SRC-MAYU-001, SRC-MD-HR-001 |
| **[VERIFY] Items Triggered** | Item 1–5 (Admin Manager authority) — no escalation through Admin Manager asserted. Item 12 (exact HR/EOD tool names) — tool names not cited. Items 6–7 (MD-specific requirements) — output marked Foundation Draft v0.1. |
| **Safety Check** | No decisions made. No escalations triggered. No sensitive data processed (input was process-level only — no names, salary, health, disciplinary, or PDPA personal data included). No live systems accessed. All outputs require human review and approval before action. |
| **Next Action** | This output is for Mayurika's review. Mayurika should assess both confirmed gaps (AI tool training confirmation and PDPA acknowledgement) and confirm whether the 1-week ROI review has been scheduled. No action should be taken based on this output without Mayurika's review. |

---

**DRAFT — Foundation Draft v0.1. Not for operational use until reviewed and approved by Mayurika (HR domain owner).**

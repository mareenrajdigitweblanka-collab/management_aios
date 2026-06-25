---
run-id: recruitment-quality-check-md-scope-test-001
skill: recruitment-quality-check
skill-version: Foundation Draft v0.1 — Updated 2026-06-25
date: 2026-06-25
mode: DRY-RUN — REVIEW SUPPORT ONLY
input-type: Sample recruitment/onboarding evidence pack — MD governance scope items
output-location: validation/skill-test-runs/recruitment-quality-check-md-scope-test-001.md
---

# Recruitment Quality Check — MD Scope Dry-Run Test 001

**Status: DRY-RUN. No hire or reject decisions made. No personal candidate data processed. For human review only.**

---

## Input Observation

> "Dry-run only. Review this sample recruitment/onboarding evidence pack: candidate screening checklist exists, interview score exists, commitment record exists, but OLOS validation evidence is missing, BGCT completion is not confirmed, six-month hire ROI audit baseline is not prepared, weekly recruitment deliverables are not linked to evidence, and 14-day data collection is incomplete. Use no personal candidate data. Do not make hire/reject decisions."

---

## Pre-Run Source Check

| Source ID | Required By | Status |
|-----------|------------|--------|
| SRC-SUMAN-001-v2 | §4.1–§4.12 recruitment process checks | READY |
| SRC-MAYU-001 | §4.10 handover check | READY |
| SRC-MD-SUMAN-001 | §4.9, §4.10, §4.12, §4.13, §4.14 | READY — Varmen Reviewed 2026-06-25 |
| SRC-POLICY-001 | §4.7 probation leave restriction | READY — Final Approved |

No PENDING sources cited in the gap logic triggered by this input. Pre-run check: PASS.

---

## Confirmed Present — No Gaps Flagged

| Stage | Check Item | Status | Source |
|-------|-----------|--------|--------|
| 8-Point Screening | Candidate screening checklist exists | PRESENT — no gap | SRC-SUMAN-001-v2 §2 |
| Interview Scoring | Interview score exists | PRESENT — no gap flagged (score value not provided; assumed complete for dry-run) | SRC-SUMAN-001-v2 §3 |
| Commitment Record | Commitment record exists | PRESENT — no gap | SRC-SUMAN-001-v2 §5 |

**Note:** Interview score value was not provided in the input. This dry-run treats its existence as confirming the scoring stage occurred. If the score falls below 30/50, a separate gap flag would be required per §4.3 of the skill. This check is deferred to the human reviewer.

---

## Gap Records

### Gap 1 — OLOS Validation Evidence Missing

| Field | Detail |
|-------|--------|
| **Stage** | OLOS Onboarding System Validation (§4.13) |
| **Check Item** | OLOS validated before go-live — evidence missing |
| **Evidence** | Sample observation: OLOS validation evidence is missing |
| **Source Affected** | SRC-MD-SUMAN-001 (29/05/2026) — the OLOS onboarding system must be validated against actual company operations before any deployment. Five required OLOS documents must be validated by Suman before go-live: Evidence Standard, Onboarding Guide, OLOS Master, Team Leader Setup Guide, File Pack Register. Department handbooks, role guides, SOP documents, universal files, version control structure, shared folder structure, and mandatory files for all departments must all be confirmed as present before OLOS is deployed. Captured in skills/recruitment-quality-check.md §4.13. |
| **Impact** | Deploying OLOS without Suman's validation means the onboarding system has not been checked against real company operations. Gaps in department handbooks, role guides, or SOPs may not be discovered until a new hire is already being onboarded — at which point corrective action is more costly and disruptive. OLOS deployed without validation evidence cannot be confirmed as operationally sound. |
| **Owner** | Suman (Recruitment Officer / Onboarder) holds validation authority for OLOS before go-live. |
| **[VERIFY] Status** | No active [VERIFY] item directly constrains this record. |
| **Recommended Next Action** | Suman to review the five required OLOS validation documents against actual company operations. Confirm each pre-go-live requirement (department handbooks, role guides, SOPs, folder structure, mandatory files) is present before OLOS is deployed or any new hire onboarded using the system. Produce a validation sign-off document. Human reviewer to approve sign-off before OLOS goes live. |

---

### Gap 2 — BGCT Completion Not Confirmed

| Field | Detail |
|-------|--------|
| **Stage** | BGCT Completion Compliance Check (§4.14) |
| **Check Item** | BGCT completion for recent joiners not confirmed; onboarding documents not confirmed as updated with BGCT details |
| **Evidence** | Sample observation: BGCT completion is not confirmed |
| **Source Affected** | SRC-MD-SUMAN-001 (25/05/2026) — all staff who joined within the last 6 months must have completed BGCT (Best Practices, Guidelines, Checklists, Tutorials). Onboarding documentation must have been updated to include BGCT details and requirements. Captured in skills/recruitment-quality-check.md §4.14. |
| **Impact** | Without BGCT completion confirmation, it is unknown whether recent joiners received foundational guidance on company best practices, guidelines, checklists, and tutorials. This is a compliance gap at the onboarding level and may affect the quality and consistency of how new hires embed into their roles. Any future audit of onboarding quality will flag missing BGCT records. |
| **Owner** | Suman (Onboarder) for BGCT completion tracking during onboarding. Mayurika (HR Officer) for staff record updates. |
| **[VERIFY] Status** | No active [VERIFY] item directly constrains this record. |
| **Recommended Next Action** | Confirm BGCT completion status for all joiners within the last 6 months. Update onboarding documentation to include BGCT details if not yet done. Produce a BGCT completion log and place in the management folder structure. Human reviewer to confirm completeness before closing this gap. |

---

### Gap 3 — Six-Month Hire ROI Audit Baseline Not Prepared

| Field | Detail |
|-------|--------|
| **Stage** | Month 6 Review Check (§4.9) and 180-Day Handover Check (§4.10) |
| **Check Item** | Six-month hire ROI audit (binary) evidence not prepared; in-flight performance evidence not provided to Suman before audit |
| **Evidence** | Sample observation: six-month hire ROI audit baseline is not prepared |
| **Source Affected** | SRC-MD-SUMAN-001 (07/05/2026) — Suman must conduct a binary ROI audit at the 6-month mark for each hire, assessing traceable contribution to: Revenue, Margin improvement, NNV reduction, Automation output, or Capacity. Evidence of this audit must be documented before the 180-day handover meeting proceeds. Mayurika must provide in-flight performance evidence to Suman before the audit is completed. Captured in skills/recruitment-quality-check.md §4.9 and §4.10. |
| **Impact** | Without a prepared ROI audit baseline, the 6-month binary assessment cannot be completed. The 180-day handover meeting must not proceed without this evidence in place. If the handover proceeds without the ROI audit, recruitment ownership formally concludes without evidence that the hire has delivered traceable business value — a governance failure. Mayurika's responsibility to supply in-flight performance evidence also remains open as a prerequisite. |
| **Owner** | Suman (6-Month Progress ROI Reviewer) for the binary ROI audit. Mayurika (HR Officer) for providing in-flight performance evidence to Suman before the audit. |
| **[VERIFY] Status** | No active [VERIFY] item directly constrains this record. [VERIFY] item 11 (Line Manager identity in 180-day handover) remains active: this record does not assert who the Line Manager is — that is a [VERIFY] item pending confirmation from Suman or Varmen. |
| **Recommended Next Action** | Mayurika to provide in-flight performance evidence to Suman. Suman to complete the binary ROI audit (Revenue / Margin / NNV / Automation / Capacity — traceable or not) and document the result. Evidence of the audit must be placed on record before the 180-day handover meeting is scheduled. Human reviewer to confirm audit evidence is substantive before allowing the handover to proceed. This skill does not make the ROI assessment — it confirms the evidence of assessment exists. |

---

### Gap 4 — Weekly Recruitment Deliverables Not Linked to Evidence

| Field | Detail |
|-------|--------|
| **Stage** | Daily Recruitment Knowledge Capture and Weekly Deliverables Check (§4.12) |
| **Check Item** | Four weekly deliverables not evidenced: Risk Identification, One-Month Task Rule, SKU/Margin/Hire-ROI Trace, LLM-in-the-Loop Proof |
| **Evidence** | Sample observation: weekly recruitment deliverables are not linked to evidence |
| **Source Affected** | SRC-MD-SUMAN-001 (07/05/2026) — four weekly deliverables are required from Suman: (1) Risk Identification — risks in the current pipeline or probation cohort submitted weekly; (2) One-Month Task Rule — evidence that new hires were assessed against task completion expectations at Month 1, submitted weekly; (3) SKU/Margin/Hire-ROI Trace — traceable linkage between hires and SKU, margin, or ROI outcomes submitted weekly; (4) LLM-in-the-Loop Proof — evidence that LLM tools were used before any planning or decision-making action was taken, submitted weekly. Captured in skills/recruitment-quality-check.md §4.12. |
| **Impact** | Without evidence links, the four weekly deliverables cannot be confirmed as completed. Weekly oversight of pipeline risk, new hire progress, business linkage, and LLM compliance is broken. Any audit of Suman's recruitment governance role will identify missing evidence as a systematic gap. Risk identification in particular is time-sensitive — missing a week of pipeline risk assessment can allow deteriorating probation cases or pipeline problems to go undetected. |
| **Owner** | Suman (Recruitment Officer) for weekly deliverable production and evidence submission. |
| **[VERIFY] Status** | No active [VERIFY] item directly constrains this record. |
| **Recommended Next Action** | Suman to confirm whether the four deliverables were produced but not linked to evidence, or not produced at all. Produce or locate evidence for each of the four deliverables for the current week. Establish a weekly submission protocol with named evidence locations (folder paths or document references). Human reviewer to confirm evidence locations before closing. |

---

### Gap 5 — 14-Day Pipeline Baseline Not Established / Incomplete

| Field | Detail |
|-------|--------|
| **Stage** | Daily Recruitment Knowledge Capture and Weekly Deliverables Check (§4.12) |
| **Check Item** | 14-day pipeline baseline not established or data collection incomplete |
| **Evidence** | Sample observation: 14-day data collection is incomplete |
| **Source Affected** | SRC-MD-SUMAN-001 — a 14-day baseline for the recruitment pipeline must be established and tracked to support weekly risk identification. Captured in skills/recruitment-quality-check.md §4.12. |
| **Impact** | Without a 14-day pipeline baseline, the Risk Identification weekly deliverable (Gap 4 above) cannot be produced reliably. Risk identification depends on having a current picture of the pipeline across a two-week window. Incomplete data collection means that pipeline risk assessments are based on partial information, which reduces their reliability as a governance tool. |
| **Owner** | Suman (Recruitment Officer) for pipeline baseline maintenance. |
| **[VERIFY] Status** | No active [VERIFY] item directly constrains this record. |
| **Recommended Next Action** | Suman to complete the 14-day pipeline data collection for the current cycle. Establish a consistent daily data collection habit to maintain the 14-day baseline going forward. Human reviewer to confirm baseline is established and current before the next Risk Identification weekly deliverable is produced. |

---

## Run Summary

| Summary Field | Value |
|---------------|-------|
| **PASS/FAIL** | **PASS** — All 5 gap records trace to SRC-MD-SUMAN-001 (Varmen Reviewed 2026-06-25) or SRC-SUMAN-001-v2. All [VERIFY] constraints applied (item 11 — Line Manager identity — preserved). No hiring, probation, or discontinuation decisions made. No personal candidate data processed. No [VERIFY] tags removed. |
| **Evidence Sources Used** | SRC-MD-SUMAN-001 (Varmen Reviewed 2026-06-25), SRC-SUMAN-001-v2, SRC-MAYU-001 |
| **[VERIFY] Items Triggered** | Item 11 (Line Manager identity in 180-day handover — preserved in Gap 3); Items 1–5 (Admin Manager escalation paths — no escalation path through Admin Manager was referenced in this output) |
| **Confirmed Present (No Gaps)** | 8-point screening checklist, interview score, commitment record |
| **Safety Check** | CONFIRMED — No hire/reject decisions made. No probation or discontinuation recommendations made. No personal candidate data included. No sensitive data processed. No live systems accessed. No [VERIFY] tags removed. All output requires human review and approval. |
| **Foundation Draft Status** | This output is produced from Foundation Draft v0.1. It must not be treated as final operational output until Varmen sign-off and all [VERIFY] items are resolved. |
| **Next Action** | Human reviewer (Varmen or Mayurika) to review each gap record. Confirm which gaps apply to the actual recruitment evidence pack on hand. Assign owners and timelines. Do not act on any gap record without human approval. Suman should be briefed on Gaps 3–5 for action. |

---
name: management-gap-detection
type: skill
tier: 1
status: DRAFT — Foundation Draft v0.1
sources: SRC-VAR-001, SRC-POLICY-001
context-files: context/management-aios-purpose.md, context/confidentiality-rules.md, context/verify-register.md
created: 2026-06-23
owner-for-review: Varmen (validation); Mayurika (operational review after foundation approval)
---

# Skill: Management Gap Detection

**Pass/Fail Rule:** PASS if every gap category, output field, and operational rule in this skill traces to a registered source or carries [VERIFY]. FAIL if any gap claim, policy threshold, or escalation path is invented, if any [VERIFY] item is removed without registered source evidence, or if this skill performs a decision, escalation, or automation action.

---

## 1. What This Skill Does

*(Source: SRC-VAR-001 — AIOS Extraction Summary; context/management-aios-purpose.md)*

This skill supports structured identification of operational gaps, missing processes, documentation issues, and recurring management problems across the four confirmed problem areas stated by Varmen (SRC-VAR-001).

It surfaces gap observations for human review. It does not close gaps, make decisions, or escalate autonomously.

---

## 2. What This Skill Does NOT Do

- Does not make management decisions or HR decisions of any kind
- Does not finalize escalation paths (Admin Manager authority is [VERIFY] — awaiting SRC-ADMIN-001)
- Does not remove [VERIFY] tags
- Does not invent policy rules, process steps, or governance logic not in registered sources
- Does not store personally identifiable staff data, salary data, disciplinary case details, or health information
- Does not connect to live HR or management systems
- Does not automate any action — all outputs require human review
- Does not promote any output to parent AIOS truth without Varmen sign-off
- Does not treat this skill as final operational truth — this is Foundation Draft v0.1

---

## 3. Allowed Input Types

Inputs to this skill must be process-level or aggregate. No personally identifiable sensitive HR data may be provided unless explicitly approved by MD and HR owner with access control in place (SRC-VAR-001).

| Allowed Input Type | Example |
|--------------------|---------|
| Process status observations | "Onboarding checklist not received for new joiner" |
| Leave system status flags | "No leave record updated for team member on leave" |
| KPI meeting schedule data | "KPI meeting for Website Team missed this week" |
| Management file audit notes | "Decision record missing from management folder" |
| Policy compliance flags | "New joiner AI tool training not confirmed" |
| Aggregate data | "3 of 5 team members missing PDPA acknowledgement" |

**Not permitted as input:**

- Individual salary figures
- Disciplinary case personal details
- Health or medical information
- Grievance case specifics
- Raw PDPA personal data
- Individual AXIOM band placements for named staff

---

## 4. Gap Categories

### 4.1 Onboarding Documentation Gaps

*(Source: SRC-VAR-001 — Focus Area 1; SRC-POLICY-001 §3.0, §17.0)*

Gaps detected when:

- Pre-employment documents not collected before start date
- First-day orientation not confirmed (team introduction, company culture, key policies)
- Role-specific training not assigned or not confirmed with a mentor or supervisor
- AI tool training not completed during onboarding (SRC-POLICY-001 §17.0 — mandatory)
- Probation period not defined or not communicated
- PDPA notice not issued or acknowledgement not recorded (SRC-MAYU-001)

---

### 4.2 Leave Update Visibility Gaps

*(Source: SRC-VAR-001 — Focus Area 2; SRC-POLICY-001 §6.0–6.5)*

Gaps detected when:

- Leave not recorded in the leave system at least 48 hours in advance (SRC-POLICY-001 §6.1)
- More than 12% of staff on leave simultaneously without authorisation (SRC-POLICY-001 §6.1)
- Team leave limits exceeded (more than 2 members per day, or more than 1 in CST/Content Writing/Postage teams) (SRC-POLICY-001 §6.1)
- Unplanned leave exceeds 5 days per year without formal status (SRC-POLICY-001 §6.3)
- Leave during a 3-month probationary period without documented urgent justification and recovery plan (SRC-POLICY-001 §6.2)
- Short leave or early-off exceeds 2 hours per month or taken without 24-hour advance notice (SRC-POLICY-001 §6.4)
- Maternity leave not accompanied by 30-day prior notice (SRC-POLICY-001 §6.5)
- Leave system record not updated or visible to management

---

### 4.3 KPI Meeting Tracking Gaps

*(Source: SRC-VAR-001 — Focus Area 3; SRC-ARUN-001)*

Gaps detected when:

- KPI meeting not scheduled or cancelled without rescheduling
- KPI review data not collected before a scheduled meeting (review inputs not ready)
- Weekly AXIOM data not submitted by Mayurika to Arun before processing deadline
- Management review not conducted following AXIOM band assignment
- Action plans not issued following a management review
- Outcomes not monitored following action plan issue
- Leadership Review session not held on its twice-weekly schedule (SRC-MAYU-001)

---

### 4.4 Management File and Decision Organization Gaps

*(Source: SRC-VAR-001 — Focus Area 4)*

Gaps detected when:

- Management decision not recorded or stored in a retrievable location
- Supporting documentation for a management decision is missing
- Files are unorganised, misnamed, or placed outside the agreed management structure
- Records for active, probationary, on-leave, suspended, or departed employees are incomplete or missing from the staff record system
- Recruitment handover records (recruitment_source_id, recruitment_promise_set_id) not written to staff record at Month 6 (SRC-MAYU-001)

---

### 4.5 Recurring Process Problems

*(Source: SRC-VAR-001 — Recurring Problems section)*

Gaps detected when:

- A process problem has been flagged more than once without documented resolution
- A corrective action plan issued at Month 1 review has not been followed up at Month 3 (SRC-SUMAN-001-v2)
- Critic Meeting action items are not tracked or closed after the Action Review Meeting with the Team Leader (SRC-MAYU-001)
- SKILL file non-compliance is flagged repeatedly without same-day follow-up (SRC-MAYU-001)
- EOD submission non-compliance recurs without documented escalation (SRC-MAYU-001)

---

### 4.6 Policy Compliance Gaps

*(Source: SRC-POLICY-001 — Final Approved)*

Gaps detected when:

- AI tool daily use is not evidenced for a staff member (SRC-POLICY-001 §17.0)
- An employee shifting departments has not received role-specific AI reorientation (SRC-POLICY-001 §17.0)
- No AI-based contribution or efficiency gain reported for the current month (SRC-POLICY-001 §17.0)
- Late arrival exceeds 2 instances per month without documented action (SRC-POLICY-001 §5.0)
- Working hours fall below 41.5 hours per week without documented reason (SRC-POLICY-001 §16.0)
- Work hours not logged daily (SRC-POLICY-001 §15.0)
- Exit interview not conducted, or final checklist not completed, on departure (SRC-POLICY-001 §10.6–10.7)
- Credentials not revoked promptly on resignation or termination (SRC-POLICY-001 §10.5)

---

## 5. Output Format

For each gap identified, produce one record in the following format:

| Field | Description |
|-------|-------------|
| Gap Title | Short description of the gap observed |
| Evidence Source | What was observed or reported that indicates this gap |
| Policy / Source Affected | Source ID and section that defines the expected standard |
| Impact | What operational harm this gap may cause if not addressed |
| Owner / Reviewer | Who is responsible for closing this gap (process level — not a personal decision) |
| [VERIFY] Status | Whether any aspect of this gap record depends on an unresolved [VERIFY] item |
| Recommended Next Action | What should be done next — by whom, at what stage |

**Output is for human review only. No output from this skill may be acted upon without review and approval by the appropriate authority.**

---

## 6. [VERIFY] Constraints Active for This Skill

The following items in context/verify-register.md directly affect the scope of this skill:

| [VERIFY] Item | Effect on This Skill |
|---------------|---------------------|
| Admin Manager authority scope (items 1–5) | Final escalation paths through Admin Manager cannot be included. Any escalation logic involving the Admin Manager must be marked [VERIFY — awaiting SRC-ADMIN-001]. |
| MD-specific requirements (items 6–7) | This skill may change scope after MD review. It must not be treated as final. |
| Director authority beyond leadership review (item 12) | Only confirmed Director responsibilities (Leadership Review co-facilitation) may be referenced. |
| Exact tool names for HR and EOD systems (item 13) | Tool names for HR and EOD systems may not be specified by name until confirmed with Mayurika. |

---

## 7. Confidentiality Rules Active for This Skill

*(Source: context/confidentiality-rules.md — SRC-VAR-001, SRC-MAYU-001, SRC-POLICY-001)*

- Default to process-level and aggregate information only
- No individually identifiable sensitive HR data
- No salary or compensation data
- No disciplinary case personal details
- No health or medical information
- No grievance case details
- No raw PDPA personal data
- No individual AXIOM band placement for named staff
- Digital assets produced by this skill are company property and must be handled under the same confidentiality rules as all company information (SRC-POLICY-001 §11.0)

---

## Pass/Fail Result

**DRAFT — CONDITIONAL PASS**

All gap categories, output fields, and operational rules trace to SRC-VAR-001, SRC-POLICY-001, SRC-MAYU-001, SRC-SUMAN-001-v2, or SRC-ARUN-001. All [VERIFY] constraints are preserved and applied. No decision-making, escalation automation, sensitive data storage, or invented policy rules included.

Safe for Varmen review. Not yet safe for operational use — Foundation Draft v0.1 only.

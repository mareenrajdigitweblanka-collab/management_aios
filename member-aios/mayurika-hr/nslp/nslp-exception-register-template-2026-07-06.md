---
name: nslp-exception-register-template
type: template
member: Mayurika / Mayuri
role: HR Officer
created: 2026-07-06
source-id: SRC-MAYURIKA-NSLP-001
canonical-source: HR.Mayu.Skill.md Section 9
status: INTERNAL_BUILD_PENDING_FINAL_ACCEPTANCE
---

# NSLP Exception Register — Template

**Source:** SRC-MAYURIKA-NSLP-001 — HR.Mayu.Skill.md Section 9

**Purpose:** Tracks all NSLP exceptions identified during follow-up, 2-week evaluations, and management review. HR raises an exception for any case where the NSLP standard is not being met. Exceptions are not failures to hide — they are management signals that require a decision.

**Safety note:** No real staff names, employee IDs, salary, health, grievance, or PDPA personal data. Use role/placeholder references and Exception IDs only.

**Root Truth Rule:** If this template conflicts with HR.Mayu.Skill.md Section 9, the skill file is correct.

---

## Exception Types (Source: HR.Mayu.Skill.md Section 9)

| # | Exception Type | Description |
|---|---|---|
| EX-01 | Skill not applied | Participant attended the session but did not apply the skill in daily work |
| EX-02 | Skill applied but no improvement | Participant applied the skill but no measurable improvement resulted |
| EX-03 | Improvement only for 1–2 days | Improvement occurred initially but was not sustained |
| EX-04 | No proof provided | Participant did not submit Before & After evidence by the due date |
| EX-05 | Staff claims improvement but numbers do not change | Participant states improvement; measurable data does not confirm it |
| EX-06 | Senior staff repeats old skill as new skill | The skill presented is not new — it is an existing skill repackaged |
| EX-07 | Trainer gives theory instead of applicable skill | The session covered theory only; no real-job application was demonstrated |

---

## Exception Register Table

| Exception ID | Skill ID | Participant Reference | Exception Type | Date Identified | Evidence Path | Impact | Owner | Escalation Needed? | Escalation Owner | Status | Next Step |
|---|---|---|---|---|---|---|---|---|---|---|---|
| [EXCEP-001] | [SKILL-ID-001] | [Role placeholder] | EX-01 — Skill not applied | [YYYY-MM-DD] | [Path to evidence or N/A] | [e.g. "FAILURE outcome — no benefit realised"] | Mayurika | Y / N | [Role title or N/A] | [OPEN / CLOSED / ESCALATED] | [Next action] |
| [EXCEP-002] | [SKILL-ID-001] | [Role placeholder] | EX-04 — No proof provided | [YYYY-MM-DD] | [Path or N/A] | [e.g. "2-week evaluation blocked"] | Mayurika | Y / N | [Role title or N/A] | [OPEN / CLOSED / ESCALATED] | [Next action] |
| [EXCEP-003] | [SKILL-ID-002] | [Session-level — no participant reference] | EX-07 — Trainer gives theory only | [YYYY-MM-DD] | [Path or N/A] | [e.g. "Session outcome: NOT EFFECTIVE for all participants"] | Mayurika | Y | [Management role] | [OPEN] | [Escalate to management; request redesign] |

---

## Column Definitions

| Column | Definition |
|---|---|
| Exception ID | Unique ID for this exception record — e.g. EXCEP-001 |
| Skill ID | Skill this exception relates to |
| Participant Reference | Role/placeholder for the individual; or "Session-level" if exception applies to the whole session |
| Exception Type | One of the 7 exception types above (EX-01 through EX-07) |
| Date Identified | Date HR identified or recorded this exception |
| Evidence Path | Path to supporting evidence, or N/A if evidence is absent (which may itself be an exception) |
| Impact | Brief statement of the operational impact |
| Owner | HR Officer (Mayurika) is default owner; escalation owner is separate |
| Escalation Needed? | Y if management decision or intervention is required |
| Escalation Owner | Role title of the person to whom HR escalates — not a personal name |
| Status | OPEN (active), CLOSED (resolved), ESCALATED (raised to management) |
| Next Step | Immediate HR action required |

---

## Exception Resolution Rules

| Exception Type | Resolution Condition |
|---|---|
| EX-01 — Skill not applied | Participant applies skill and provides evidence within agreed extension period; OR management decides outcome |
| EX-02 — No improvement | Management reviews; skill may be redesigned, discontinued, or participant may require further support |
| EX-03 — Unsustained | Follow-up check at agreed interval; outcome label updated to UNSUSTAINED |
| EX-04 — No proof | Evidence submitted and verified by HR; OR management decides outcome |
| EX-05 — Claims without data | HR requests specific data source; if data not provided, exception remains OPEN |
| EX-06 — Old skill repackaged | Session rejected; Skill ID invalidated; escalation to management for session review |
| EX-07 — Theory only | Session outcome flagged; management decides whether to repeat with practical focus |

---

## Filing Rule

Save the live exception register as:
`member-aios/mayurika-hr/nslp/nslp-exception-register-[YYYY-MM].md` or in Mayurika's preferred tracking format.

Reference each exception in the corresponding register row and in the monthly management report.

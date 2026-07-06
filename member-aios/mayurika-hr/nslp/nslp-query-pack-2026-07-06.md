---
name: nslp-query-pack
type: query-pack
member: Mayurika / Mayuri
role: HR Officer
created: 2026-07-06
source-id: SRC-MAYURIKA-NSLP-001
canonical-source: HR.Mayu.Skill.md Section 9
status: INTERNAL_BUILD_PENDING_FINAL_ACCEPTANCE
---

# NSLP Query Pack — Reusable LLM Queries

**Source:** SRC-MAYURIKA-NSLP-001 — HR.Mayu.Skill.md Section 9

**Purpose:** Standard queries for Mayurika or a coordinator to ask an LLM when reviewing NSLP status. Each query is self-contained — it states the purpose, the required files to load, the expected answer, a pass/fail check, and a safety note.

**Root Truth Rule:** These queries are derived from HR.Mayu.Skill.md Section 9. If query outputs conflict with the skill file, the skill file is correct.

**Safety note:** Queries must not return real staff names, employee IDs, PDPA personal data, health data, individual KPI scores, salary data, grievance details, or disciplinary case details. Aggregate and process-level answers only.

---

## Query 1 — What NSLP Items Need HR Follow-Up Today?

**Purpose:** Identify all NSLP register rows where HR action is outstanding today — overdue evaluations, missing evidence, or open exceptions.

**Required files:**
- `member-aios/mayurika-hr/nslp/nslp-register-[YYYY-MM].md` (current period register)
- `member-aios/mayurika-hr/nslp/nslp-exception-register-[YYYY-MM].md` (current exception register)

**Query to run:**
> "Read the NSLP register for [current period]. List every row where: (a) the 2-Week Evaluation Date is today or in the past and the Outcome Label is not yet assigned; OR (b) Before/After Evidence is overdue; OR (c) Action Plan Card is missing. Cross-reference the exception register. List items by Skill ID and next required action. Do not include personal staff data."

**Expected answer:**
A list of Skill IDs with the outstanding action type and due date. If no items are outstanding, the answer is "No outstanding NSLP follow-up items as of [date]."

**Pass/fail check:**
- PASS if the answer covers all register rows and flags overdue items
- FAIL if the answer skips rows or cannot read the register file

**Safety note:** Response must not include staff names or personal identifiers. Skill IDs, dates, and action types only.

---

## Query 2 — Which Skills Are Missing Skill IDs?

**Purpose:** Identify any NSLP session where a Skill ID was not assigned before the session began.

**Required files:**
- `member-aios/mayurika-hr/nslp/nslp-register-[YYYY-MM].md`

**Query to run:**
> "Read the NSLP register for [current period]. List every row where the Skill ID column is blank, placeholder, or N/A. Report the session date and department for each affected row."

**Expected answer:**
A list of rows with missing Skill IDs. If all rows have Skill IDs, the answer is "All NSLP sessions have Skill IDs assigned."

**Pass/fail check:**
- PASS if no rows have missing Skill IDs
- FAIL if any row has a missing Skill ID — raise as EX-01 exception candidate

**Safety note:** Response includes session dates and departments only — no participant identifiers.

---

## Query 3 — Which Skills Are Missing BGCT Documents?

**Purpose:** Identify any NSLP skill where no BGCT document has been assigned.

**Required files:**
- `member-aios/mayurika-hr/nslp/nslp-register-[YYYY-MM].md`

**Query to run:**
> "Read the NSLP register for [current period]. List every row where the BGCT Document Link column is blank, placeholder, or N/A. Report the Skill ID, Skill Name, and session date for each affected row."

**Expected answer:**
A list of skills missing BGCT documents. If all skills have BGCT documents, the answer is "All NSLP skills have BGCT documents assigned."

**Pass/fail check:**
- PASS if all skills have BGCT document links
- FAIL if any skill is missing a BGCT document — this is a process failure per HR.Mayu.Skill.md Section 9

**Safety note:** Skill IDs, names, and session dates only — no participant identifiers.

---

## Query 4 — Which Participants Are Due for 2-Week Evaluation?

**Purpose:** Surface all participants who have reached or passed their 2-week evaluation date without a completed evaluation on record.

**Required files:**
- `member-aios/mayurika-hr/nslp/nslp-register-[YYYY-MM].md`
- `member-aios/mayurika-hr/nslp/evaluations/` (folder — check for existing evaluation files)

**Query to run:**
> "Read the NSLP register for [current period]. Today's date is [YYYY-MM-DD]. List every row where the 2-Week Evaluation Date is on or before today, and the Outcome Label column is blank or Pending. Cross-reference the evaluations folder for any completed evaluation files. List results by Skill ID and scheduled evaluation date."

**Expected answer:**
A list of Skill IDs with overdue or due-today evaluations, in date order. If all evaluations are complete, the answer is "All scheduled 2-week evaluations are complete."

**Pass/fail check:**
- PASS if all due evaluations are completed on schedule
- FAIL if any evaluation is overdue without a completed evaluation file

**Safety note:** Skill IDs and dates only — no participant names or personal identifiers.

---

## Query 5 — Which NSLP Items Are Blocked by Missing Before/After Evidence?

**Purpose:** Identify all NSLP items where 2-week evaluation or outcome labelling cannot proceed because Before or After evidence is missing.

**Required files:**
- `member-aios/mayurika-hr/nslp/nslp-register-[YYYY-MM].md`
- `member-aios/mayurika-hr/nslp/evidence/` (folder — check for evidence files)

**Query to run:**
> "Read the NSLP register for [current period]. List every row where Before Evidence or After Evidence column shows 'N', 'Pending', or is blank, and the After Evidence Due date has passed. Cross-reference the evidence folder for any filed evidence records. Report Skill ID, evidence type missing, and due date."

**Expected answer:**
A list of Skill IDs blocked by missing evidence, with the type of evidence missing and the due date. If all evidence is collected, the answer is "No NSLP items are blocked by missing evidence."

**Pass/fail check:**
- PASS if all overdue evidence items are collected
- FAIL if any item is past the due date without evidence — raise as EX-04 exception

**Safety note:** Skill IDs, evidence type, and due dates only — no participant identifiers.

---

## Query 6 — Which Skills Qualify as SUCCESS STORY?

**Purpose:** Identify NSLP items ready to be recorded as SUCCESS STORY — skill applied, Before & After evidence confirmed, improvement measurable and sustained.

**Required files:**
- `member-aios/mayurika-hr/nslp/nslp-register-[YYYY-MM].md`
- `member-aios/mayurika-hr/nslp/evaluations/` (relevant evaluation files)
- `member-aios/mayurika-hr/nslp/evidence/` (relevant evidence files)

**Query to run:**
> "Read the NSLP register for [current period]. List every row where: (a) Adoption Status = Adopted; (b) Implementation Status = Implemented; (c) HR Verification Result = PASS; and (d) the 2-week evaluation outcome label is SUCCESS STORY. For each, confirm that a Before & After evidence file exists. Report Skill ID, Skill Name, and business impact summary."

**Expected answer:**
A list of confirmed SUCCESS STORY cases with Skill IDs, names, and business impact summaries. If none qualify yet, the answer is "No SUCCESS STORY cases confirmed in this period."

**Pass/fail check:**
- PASS if each SUCCESS STORY has a corresponding Before & After evidence file and a completed evaluation record
- FAIL if a SUCCESS STORY label is claimed without evidence

**Safety note:** Skill IDs, skill names, and aggregate business impact only — no individual performance data.

---

## Query 7 — Which Items Need Escalation?

**Purpose:** Surface all NSLP items where management intervention or a decision is required — exceptions that are OPEN or ESCALATED, missing data that HR cannot resolve alone, or outcomes that require management action.

**Required files:**
- `member-aios/mayurika-hr/nslp/nslp-exception-register-[YYYY-MM].md`
- `member-aios/mayurika-hr/nslp/nslp-register-[YYYY-MM].md`

**Query to run:**
> "Read the NSLP exception register for [current period]. List every row where Escalation Needed = Y and Status is OPEN or ESCALATED. Also read the NSLP register and list any row where the Status is EXCEPTION. Report Exception ID, Skill ID, exception type, impact, and the escalation owner role."

**Expected answer:**
A list of items requiring management escalation. If no escalation is needed, the answer is "No NSLP items require escalation this period."

**Pass/fail check:**
- PASS if all ESCALATED items have an assigned escalation owner role and a documented next step
- FAIL if an exception is OPEN with no escalation owner and no next step recorded

**Safety note:** Exception IDs, Skill IDs, exception types, and role titles only — no personal identifiers.

---

## Query 8 — What Can Be Reported to Management This Month?

**Purpose:** Assemble a management-ready status summary for the monthly NSLP report — what is complete, what is outstanding, what management decisions are needed.

**Required files:**
- `member-aios/mayurika-hr/nslp/nslp-register-[YYYY-MM].md`
- `member-aios/mayurika-hr/nslp/nslp-exception-register-[YYYY-MM].md`
- `member-aios/mayurika-hr/nslp/evaluations/` (all completed evaluations)
- `member-aios/mayurika-hr/nslp/evidence/` (all evidence files)
- `member-aios/mayurika-hr/nslp/nslp-management-report-template-2026-07-06.md`

**Query to run:**
> "Read all NSLP files for [current period]. Populate the NSLP Management Report template with the following aggregate figures: total sessions, total participants, Skill ID completion rate, BGCT document completion rate, Action Plan Card rate, Before/After evidence rate, 2-week evaluation rate, adoption rate, implementation rate, sustained improvement rate, SUCCESS STORY count, exception count, and exception type breakdown. List skills qualifying for continuation recommendation and skills requiring redesign or stop decisions. List management decisions outstanding. Do not include personal staff data."

**Expected answer:**
A completed or partially completed draft of the management report template, filled with aggregate figures from the period's register and evidence files. Sections with incomplete data are clearly marked as Pending.

**Pass/fail check:**
- PASS if report includes evidence paths, aggregate metrics, and at least one HR recommendation
- FAIL if report contains no evidence paths, or contains only opinion-based statements

**Safety note:** Aggregate figures and process-level summaries only — no individual performance band scores, personal identifiers, salary data, or health data.

---

## Query Pack Usage Note

These queries are intended for use with this NSLP folder's template files as input context. They are not connected to any live database or API. Results depend entirely on the accuracy of the register and evidence files that Mayurika maintains.

If a query returns "file not found" or "register is empty," that is itself a process signal — the register has not been started for this period.

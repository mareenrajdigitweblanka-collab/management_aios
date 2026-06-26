---
name: md-arun-discussion-source-ingestion-check
type: validation
created: 2026-06-26
source-id: SRC-MD-ARUN-001
status: CONDITIONAL PASS
---

# MD & Arun Discussion Source Ingestion Check

## Status
CONDITIONAL PASS

---

## Source ID
SRC-MD-ARUN-001

---

## Source File
`intelligence-inbox/raw-stakeholder-documents/md-discussion-notes/MD & Arun Discussion Notes.md`

---

## Source Status
Received / Registered / Source-mapped

---

## Step 1 — File Existence Check
PASS — File confirmed at:
`intelligence-inbox/raw-stakeholder-documents/md-discussion-notes/MD & Arun Discussion Notes.md`

---

## Step 2 — Markdown Format Check
WARNING — MD041 lint issue detected.

Line 1 of the file begins with `### **Date: 24/06/2025**` (an H3 heading), not an H1 heading. The file does not have a first-line H1 heading as required by MD041.

**Action:** Formatting warning only. Content meaning not rewritten. No correction applied in this ingestion pass. User approval required before formatting cleanup is performed.

---

## Main Topics Found

The following topics are identifiable from source-backed content in the file. These are extracted at process level only — individual staff performance references and individual names in operational assignments are not expanded into HR profiles.

| Date | Topic | Process-Level Summary |
|------|-------|-----------------------|
| 24/06/2025 | KPI Meeting Format | 5-minute per person discussion limit; weekly KPI scores for all participants; post-meeting self-recording by every participant; KPI Meeting Statistics: attendee count, meeting duration, Average KPI Time Index |
| 24/06/2025 | KPI Self-Evaluation | Weekly self-evaluation required; KPI Scoring Scale applied for upcoming week |
| 10/07/2025 | KPI Meeting Quality | KPI meeting inputs must reflect analysis and improvement of weaknesses; questions based on office materials; unimplemented earlier instructions should be prioritized |
| 14/07/2025 | Project Visibility | All projects started in past 6 months must be visible in a single sheet; color-coded (Green = complete, Orange = in progress, Red = delayed/issues) |
| 16/07/2025 | BGCT and Performance | BGCT and roadmaps are central tools; performance-based evaluation and management practices |
| 17/07/2025 | BGCT Success Stories | Success stories integrated in BGCT; consistency in following BGCT schedules; post-mortem for meeting time |
| 24/07/2025 | BGCT Roadmap Priority | BGCT is top priority; suspension and termination decisions performance-based and connected to BGCT guidelines |
| 08/08/2025 | Stand-up Call Governance | Stand-up calls must be conducted sub-team leader-wise; monitored for quality; weekly output measure; end-of-day call also required |
| 20/05/2026 | Vendor Document Validation | Vendor documents must be validated with proper document control; LLM/AI support used for validation with manual checking |
| 26/05/2026 | BGCT Documentation Hierarchy | BGCT (for staff) → Handbook (for staff) → Skill file (for LLM/developers) → Rule book (management); BGCT must include create date and creation owner |
| 27/05/2026 | eBay Team Leadership | eBay team leadership succession; documentation requirement — all office activities must have proper documentation |
| 08/06/2026 | Task Organization | Tasks must be done one at a time; structured and organized; follow Google Calendar; step-by-step planning |
| 10/06/2026 | LLM in Operations | LLM should be kept in the operational loop; information should be structured in LLM-queryable format; company memory must be built and documented |
| 19/06/2026 | Meeting ID System | Unique Meeting ID required for every meeting; each Meeting Point has Main ID and Sub IDs; required metadata recorded for every meeting |
| 19/06/2026 | Technical Team Escalation | Technical team members may escalate only issues they cannot resolve independently; every escalation must include reason and actions already taken |
| 22/06/2026 | Bonus Queryability Condition | Bonuses for Sales Team contingent on LLM-queryable documentation; Auditor to verify compliance; requirement to be communicated to Mayurika and announced |
| 22/06/2026 | Technical and Development Team ROI | ROI of Technical and Development Teams noted as low over past year; daily monitoring required |
| 23/06/2026 | KPI Review Participation | Staff who do not participate in KPI Reviews will have alternative responsibilities assigned |
| 23/06/2026 | Bonus Eligibility Components | Bonus Eligibility framework components listed: KPI performance, positive attitude, continuous learning, contribution, ownership, commitment |
| 23/06/2026 | Developer Role Standard | Developers should function as Business Solution Providers, not only technical developers |
| 23/06/2026 | Meeting Standardization | Standard meeting format: Agenda, Discussion Points, Decisions Taken, Action Items, Responsible Person, Deadline, Follow-up Date |
| 25/06/2026 | Bonus Evaluation Scoring | Queryability scoring: 5 = Fully queryable; 1–4 = Partially queryable; 0 = Not queryable but correct skill documented; −1 to −5 = Not queryable and skill not documented |
| 25/06/2026 | Developer ROI Review Process | Monthly review of developer work from past 30 days; Team Leader initial validation; third-week tasks verified for queryable format; Mayurika coordinates; queryable task files provided to Paraparan for ROI methodology |
| 25/06/2026 | BGCT Task Priority | Primary responsibilities form basis of KPI; other responsibilities delegated accordingly |

---

## Sensitivity Check

| Category | Finding |
|----------|---------|
| Individual staff names in operational assignments | YES — multiple names appear in task assignment context (e.g., Satheeswaran, Thinesh, Paraparan, Gengah, Kajanthan, Mareenraj). These are process-level operational references only. |
| Personal performance case details | ONE REFERENCE — 08/08/2025 note references a named individual's performance. This must not be expanded into an HR profile or cited individually in context files. |
| Salary, compensation, or bonus figures for named individuals | NO — no individual salary data present |
| Personal health or medical data | NO |
| Candidate personal profiles | NO |
| PDPA personal data | NO |
| Grievance case specifics | NO |

**Sensitivity ruling:** INTERNAL / RESTRICTED — staff names appear in operational context. Sensitivity is comparable to SRC-MD-HR-001 and SRC-MD-SUMAN-001. Individual staff names must not be expanded into HR profiles or personal performance records when cited in context files or skills. Process-level extraction only.

---

## Use Boundary

| Boundary | Confirmed |
|----------|-----------|
| MD governance evidence only — not company policy | YES |
| Not final KPI decision authority | YES — KPI band placement remains Arun's authority (SRC-ARUN-001) |
| Not bonus/PIP/warning decision authority | YES — no decisions made from this source |
| Not Admin Manager authority evidence | YES — SRC-ADMIN-001 PENDING; no Admin Manager content in this source |
| Not a replacement for Arun direct confirmation of [VERIFY] items 8, 9, 10 | YES — source does not contain explicit confirmation of Amazon ACOS wording, Operational Manager PRC scope, or ROI Officer title |

---

## VERIFY Item Quick Check

| VERIFY Item | Evidence Found? |
|-------------|----------------|
| Item 8 — Amazon ACOS threshold wording | NO — source does not address Amazon ACOS thresholds |
| Item 9 — Operational Manager PRC membership | NO — source does not mention PRC composition |
| Item 10 — ROI Officer identity/title | PARTIAL — Mayurika coordinating developer ROI validation confirmed (25/06/2026); aligns with VERIFY Resolved Candidate but does not use "ROI Officer" title; KEEP VERIFY |
| Item 11 — Director authority beyond leadership review | NO |
| Item 12 — HR/EOD tool names | NO |

**Result: No VERIFY items resolved by this source.**

---

## Pass/Fail Rule

PASS if source exists, is registered, and use boundaries are clear.
FAIL if source is missing or treated as final authority.

**Result: CONDITIONAL PASS**

Source exists and is confirmed. Boundaries are clear. VERIFY items are not resolved — correctly preserved. Conditional status due to: (a) Varmen review is by project default rather than an explicit Varmen confirmation on this specific source; (b) MD041 formatting warning on source file not corrected in this pass.

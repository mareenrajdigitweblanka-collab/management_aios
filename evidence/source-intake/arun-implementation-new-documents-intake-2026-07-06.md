---
name: arun-implementation-new-documents-intake-2026-07-06
type: evidence
created: 2026-07-06
status: intake-complete
stage: discovery — do not promote to root truth
reviewer-needed: Arun
---

# Arun / Implementation Officer — New Document Intake Report
**Date:** 2026-07-06
**Intake Stage:** Discovery only. No root truth updated. No CLAUDE.md changes.
**Source Folder:** `intelligence-inbox/raw-stakeholder-documents/arun-implementation/`

---

## Task 1 — File Presence Check

| File | Expected Location | Found? | Note |
|---|---|---|---|
| Arun-PH-Team.md | `intelligence-inbox/raw-stakeholder-documents/arun-implementation/Arun-PH-Team.md` | YES | New document — not previously registered |
| KPI Definitions, AXIOM Band Placement, Review Input_Output & Management Tracking Framework.md | `intelligence-inbox/raw-stakeholder-documents/arun-implementation/KPI Definitions, AXIOM Band Placement, Review Input_Output & Management Tracking Framework.md` | YES | **Already registered as SRC-ARUN-001** |
| my day check list-arun - shedule.csv | `intelligence-inbox/raw-stakeholder-documents/arun-implementation/my day check list-arun - shedule.csv` | YES | **Already registered as SRC-ARUN-002** |

**All three files are present. Two are already registered source documents.**

---

## Task 2 — Source Summaries

### 2A. Arun-PH-Team.md

**Document Title:** Portfolio Holder KPI Performance Review Prompt

**Purpose:**
An LLM prompt template used to generate complete Portfolio Holder Performance Review reports from available sales, inventory, pricing, advertising, and stock data. The report is management-level, data-driven, and suitable for monthly KPI review.

**Employee / Team Scope:**
- Department: Portfolio Holder
- Office: Jaffna (as per template)
- All fields are templated — `{Staff Name}` and `{Review Month}` are placeholders; no individual staff data is embedded in the document itself.

**Marketplaces in Scope (YOY Comparison):**
- Amazon UK
- eBay UK
- eBay DE
- B&Q
- Note: Document explicitly states "Do NOT include any other marketplace."

**KPI Review Report Sections (16 sections):**
1. Year-over-Year Performance (Highest Priority) — 30% YOY Growth target
2. Additional YOY Comparison — April and May comparisons
3. Overall Monthly Sales Comparison — April, May, June combined
4. Total Sales Breakdown — FBA / FBM / Vendor
5. Best Improving SKUs — Sales increase YOY
6. Declining SKUs — Sales drop YOY; price elasticity notes
7. Month-over-Month Improved SKUs
8. Month-over-Month Declining SKUs
9. Total IDs Analysis — Sales ID coverage rate
10. Non-Selling IDs — Count of zero-sales IDs in review month
11. Non-Selling Stock Analysis — SKU, stock value, days since last sale
12. Sales Distribution Analysis — Order count categories
13. Complete Stock Report — Stock status per SKU (Healthy / Low / Critical / Out of Stock)
14. Employee Coaching Questions — Management discussion prompts
15. Employee Appreciation Opportunities — Achievement recognition
16. Final Management Summary — Executive overview

**Required Output Worksheets (Excel/Google Sheets):**
15 separate worksheets: Executive Summary, YOY Performance, Monthly Comparison, Marketplace Performance, Best Improving SKUs, Declining SKUs, Month-over-Month Analysis, Inventory Report, Non-Selling Inventory, SKU Stock Report, Sales Distribution, Coaching Questions, Appreciation, Strengths & Weaknesses, Action Plan.

**Data Required (Process-Level):**
Sales data by marketplace, inventory/stock data, pricing data, advertising data (ROAS/ACOS implied by KPI context), order counts, SKU-level performance history.

**Sensitivity Risk:**
LOW-MEDIUM. The document is a process template — it contains no individual staff data. `{Staff Name}` is a variable placeholder. The template does reference individual SKU stock values when populated, but as a template document it carries no personal HR or salary data. Sensitivity rises to MEDIUM when instantiated with real staff and sales data; the template itself is process-level only.

**Owner / Reviewer:**
Arun (Implementation Officer) — as document owner. Reviewer for AIOS registration: Arun.

---

### 2B. KPI Definitions, AXIOM Band Placement, Review Input_Output & Management Tracking Framework.md

**Registration Status: ALREADY REGISTERED as SRC-ARUN-001**

**Prepared For:** Mareenraj (Technical Team)
**Prepared By:** Implementation Officer (Arun)

**Document Sections (process-level summary):**

**KPI Definitions (§1):** Portfolio Holders, Website Team, eBay Team, Account Holders, PPC Team, Technical Team, Development Team — matches CLAUDE.md §7.1 exactly.

**AXIOM Band Placement (§2):**
- Individual Staff Net Sales: Red (<300), Amber (300–800), Green (800–1500), Dark Green (1500–3000), Purple (>3000)
- NNV Bands: Red (Negative), Amber (0–14%), Green (15–29%), Dark Green (30–49%), Purple (50%+)
— matches CLAUDE.md §7.2 exactly.

**KPI Detection Criteria (§3):** YOY below 30%, Website ROAS below 400%, Amazon ACOS Below 25%, eBay ACOS Below 20%, Incident Score below 15/25, 3+ incidents, task misses, missing documentation, low ROI, low NNV, poor utilization — matches CLAUDE.md §7.3 (post SRC-ARUN-CONF-001).

**Review Inputs (§4):** Revenue, Profit, YOY Growth, ROAS, ACOS, Individual Staff Net Sales, Task Completion, Documentation Status, Incident Reports, ROI Contribution, Team Leader Feedback, Auditor Feedback, "ROI officer feed back" — NOTE: original wording pre-dates SRC-ARUN-CONF-001 resolution; CLAUDE.md §7.4 correctly reflects the confirmed wording "Implementation Officer – Arunraj Feedback." This is a wording note, not a conflict.

**Review Outputs (§5):** AXIOM Score, AXIOM Band, NNV Band, Risk Level, Coaching Requirement, Training Requirement, Warning Status, PIP Status, Bonus Eligibility, Promotion Candidate Status — matches CLAUDE.md §7.5 exactly.

**Weekly AXIOM Workflow (§6):** Collect weekly → calculate KPI → assign bands → identify risks → management review → action plans → monitor — matches CLAUDE.md §7.6.

**Incident Management & Escalation (§7):** Week 1 Coaching, Week 3 Additional Support, Week 5 First Warning, Week 7 Second Warning, Week 8 Third Warning + PRC Review; Incident count 1–5+ escalation — matches CLAUDE.md §7.7 exactly.

**PRC Governance (§8):** Members — Managing Director, Implementation Officer, Admin Manager, Team Leader, Operational Manager — matches CLAUDE.md §7.8. Note: Admin Manager PRC authority remains [VERIFY — awaiting SRC-ADMIN-001].

**Bonus Eligibility (§9):** YOY ≥30%, ROAS/ACOS target, Green Band or above, no active incidents, Documentation ≥90%, Positive ROI, PRC Approval — matches CLAUDE.md §7.9.

**Management Dashboard Requirements (§10):** Weekly and monthly cadence; Staff, Team, Department, Portfolio, Incident, Bonus, PRC Review views — matches CLAUDE.md §7.10.

**Sensitivity Risk:**
HIGH — performance framework details. Consistent with existing SRC-ARUN-001 sensitivity rating.

**No new registration action required — already SRC-ARUN-001.**

---

### 2C. my day check list-arun - shedule.csv

**Registration Status: ALREADY REGISTERED as SRC-ARUN-002**

**Document Type:** Daily/weekly operational checklist and schedule — Implementation Officer (Arun).

**Structure:**
- Column 1: Day of week (Monday–Friday)
- Column 2: Task / Activity category
- Column 3: Supporting detail / sub-tasks and notes
- Columns 4–5: Sparse; mostly blank

**Weekly Task Categories (process-level):**
- Monday: Postage review (UK warehouse), measurable task with Sub Team Leader, eBay, MD task, leave policy, AOV, BGCT-Print
- Tuesday: Image editing (time allocation, image count check), task management (Jaffna, Nelliyady, whole day task), MD task, Job recruitment, Team Leader meeting, AOV
- Wednesday: Nelliyady office, MD task, Team Leader meeting, LED discussion, groups checking, AOV, Notebook checking
- Thursday: Inventory (inventory, repair, computer reset), meeting reports (critic, presentation, incident, meeting, discussion action sheet, project tracking), MD task, image editing, Team Leader meeting, AOV, Notebook checking
- Friday: Groups checking, sheets checking (eBay, digital marketing, merchandise, Manoranjani), MD task, LED discussion, task management, Team Leaders Meeting, update to MD diary & sheets, AOV

**Classification:** Weekly operational schedule — confirms daily role patterns of the Implementation Officer. Not a KPI or policy document.

**Sensitivity Risk — AMBER FLAG:**
- Staff names appear in operational task context (e.g., "Dilani, Arudselvi, Tharsiga" on Monday; individual image editing team names on Tuesday and Thursday; TL names on Wednesday and Friday). This is within the LOW-MEDIUM range for a schedule document, consistent with existing SRC-ARUN-002 sensitivity rating (LOW — operational schedule).
- **AMBER NOTE — Unexpected Bottom Section:** Lines 44–52 of the CSV contain numeric values paired with location and institution names (Jaffna, Narmatha, Maruthi, Western Union, Colombo, Colombo money exchange, Pirasanna, Swiss money exchange) with values approximately 418–419.5. This content appears to be currency exchange rate reference data embedded in the schedule file. This is unexpected content for a daily checklist. It is not personal employee data, but represents financial reference data that may be commercially sensitive. This section was present in the file at the time of original registration as SRC-ARUN-002 and was included within scope.

**No new registration action required — already SRC-ARUN-002.**

---

## Task 3 — Duplicate and Conflict Check

| Check | Finding | Status |
|---|---|---|
| Arun-PH-Team.md vs existing Arun sources | No overlap found — no prior Arun source covers Portfolio Holder review prompt format | CLEAR |
| KPI Definitions...md vs SRC-ARUN-001 | Same file — already registered as SRC-ARUN-001 | DUPLICATE — already registered |
| CSV schedule vs SRC-ARUN-002 | Same file — already registered as SRC-ARUN-002 | DUPLICATE — already registered |
| Amazon ACOS threshold (Arun-PH-Team.md) | Not directly stated in this document; YOY 30% threshold confirmed consistent | CLEAR |
| Amazon ACOS threshold (KPI Definitions...md) | "Amazon ACOS Below 25%" — consistent with CLAUDE.md §7.3 post-SRC-ARUN-CONF-001 | CONSISTENT |
| eBay ACOS (KPI Definitions...md) | "eBay ACOS Below 20%" — consistent with CLAUDE.md §7.3 | CONSISTENT |
| Review Inputs wording — "ROI officer feed back" | Pre-confirmation wording; CLAUDE.md §7.4 already resolved via SRC-ARUN-CONF-001. Source file retains original wording — expected. | WORDING NOTE — not a conflict |
| Mayurika role boundary | Arun-PH-Team.md does not reference Mayurika; no role boundary conflict introduced | CLEAR |
| PRC / Admin Manager authority | KPI Definitions...md §8 lists Admin Manager as PRC member — consistent with CLAUDE.md §7.8; [VERIFY] items 1–5 remain open | CONSISTENT — [VERIFY] preserved |
| Dashboard requirements (Arun-PH-Team.md) | Introduces 15-worksheet Excel output format for PH review — new detail, no overlap with existing dashboard requirements in CLAUDE.md §7.10 | NEW — no conflict |
| B&Q marketplace | Arun-PH-Team.md includes B&Q as a Portfolio Holder marketplace — not previously named in CLAUDE.md KPI/AXIOM sections | NEW DETAIL — no conflict; CLAUDE.md §7.1 does not name specific marketplaces |
| Varmen historical approval vs current reviewer routing | No Varmen approval claim in new document; reviewer routing correctly applies to Arun as domain owner | CLEAR |
| Sensitive data risk — CSV bottom section | Financial/exchange rate data embedded in schedule file — flagged AMBER; not personal HR data | AMBER — financial data |
| Sensitive data risk — Arun-PH-Team.md | Template only; no individual data | CLEAR |

**Conflicts found:** None. No threshold conflicts, no role authority conflicts, no PRC authority conflicts.
**Duplicate sources found:** Two of three submitted documents are already registered (SRC-ARUN-001 and SRC-ARUN-002).
**New document requiring registration:** One (Arun-PH-Team.md → candidate SRC-ARUN-PH-001).

---

## Summary of New Detail Introduced

The only net-new document is **Arun-PH-Team.md**. New process-level detail it introduces:

1. **Portfolio Holder KPI review methodology** — 16-section structured review framework
2. **Marketplace scope for PH review** — Amazon UK, eBay UK, eBay DE, B&Q (B&Q not previously listed)
3. **30% YOY Growth target — consistent confirmation** across Portfolio Holder domain
4. **15-worksheet Excel output structure** for Portfolio Holder monthly review
5. **Coaching questions framework** — management-level discussion prompts for PH performance review
6. **Appreciation / recognition categories** — new process detail not in CLAUDE.md
7. **Stock health categories** — Healthy / Low / Critical / Out of Stock (consistent with inventory management context)

None of this conflicts with existing registered sources. All KPI thresholds referenced are consistent with CLAUDE.md §7.

---

*Intake created: 2026-07-06 | Stage: Discovery only | Next: Arun review before registration*

---
name: arun-day-to-day-useful-tables-map
type: table-map
member: Arun
role: Implementation Officer
created: 2026-07-06
created-by: Mareenraj (builder)
source-basis: SRC-ARUN-PH-001, SRC-ARUN-001, SRC-MD-ARUN-001
status: INTERNAL BUILD — preview/control tables only
root-truth: CLAUDE.md — canonical; this file is a planning aid only
---

# Arun Day-to-Day Useful Tables Map (2026-07-06)

**Purpose:** Five day-to-day control and planning tables for Arun (Implementation Officer). These help track Portfolio Holder review readiness, data source availability, review output completeness, risk follow-up, and dashboard build status — without exposing sensitive data or running live KPI / AXIOM calculations.

**Safety limits:**
- No real staff names, real sales values, real inventory values, or real PPC data.
- No AXIOM band calculated results.
- No bonus eligibility determination.
- No PRC decision output.
- No warning / PIP decision output.
- No CSV exchange-rate rows (SRC-ARUN-002 rows 44–52 excluded).
- All rows use process-level placeholders until factual data sources are mapped and approved.

**Evidence:** `evidence/stakeholder-confirmations/arun-day-to-day-useful-tables-request-2026-07-06.md`
**Validation:** `validation/arun-day-to-day-useful-tables-preview-check-2026-07-06.md`
**Dashboard:** `web-view/index.html` — Arun Implementation tab

---

## TABLE 1 — Portfolio Holder Review Preparation Tracker

**Purpose:** Help Arun see which PH monthly reviews are ready, waiting, or blocked before generating the monthly report.

**Source:** SRC-ARUN-PH-001 (report structure, marketplace scope); SRC-ARUN-001 (KPI definitions, review inputs)

| Review Month | Portfolio Holder / Team | Marketplace Scope | Product Category Scope | Required Sales Data Ready | Inventory Data Ready | PPC / Advertising Data Ready | Pricing Data Ready | Review Draft Status | Blocker | Next Action | Owner | Due Date | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [Month YYYY] | [PH / Team Name] | Amazon UK / eBay UK / eBay DE / B&Q | [Category] | — | — | — | — | Not Started | [Blocker if any] | Confirm data sources | [Owner] | [Date] | Pending Data |

**Column definitions:**

| Column | Definition |
|---|---|
| Review Month | The calendar month being reviewed |
| Portfolio Holder / Team | PH role or team name — process-level reference; no personal names in live rows |
| Marketplace Scope | Amazon UK / eBay UK / eBay DE / B&Q — per SRC-ARUN-PH-001 |
| Product Category Scope | Categories covered in this review |
| Required Sales Data Ready | YES / NO / PARTIAL |
| Inventory Data Ready | YES / NO / PARTIAL |
| PPC / Advertising Data Ready | YES / NO / PARTIAL |
| Pricing Data Ready | YES / NO / PARTIAL |
| Review Draft Status | Not Started / In Progress / Draft Complete / Ready for Review |
| Blocker | What is preventing progress, if anything |
| Next Action | Specific next step |
| Owner | Person or role responsible for next action |
| Due Date | Target date for next action |
| Status | Pending Data / In Progress / Ready / Blocked / Complete |

---

## TABLE 2 — KPI Data Source Readiness Table

**Purpose:** Before review generation, confirm that all required factual data sources exist, are accessible, and are of sufficient quality. This is a pre-flight check — not a KPI calculation.

**Source:** SRC-ARUN-001 (review inputs §7.4); SRC-ARUN-PH-001 (data required per worksheet)

| Data Source Area | Required For | Source System / File | Data Owner | Date Range Needed | Current Availability | Access Approval | Data Quality Status | Missing Fields | Risk Level | Next Step |
|---|---|---|---|---|---|---|---|---|---|---|
| Sales Data | YOY Performance, Monthly Comparison, Marketplace Performance, SKU Analysis | [Source system — to be confirmed] | [Owner role] | [Date range] | Not Confirmed | Pending | Not Assessed | — | High | Confirm source and access |
| Inventory Data | Inventory Report, Non-Selling Inventory, SKU Stock Report | [Source system — to be confirmed] | [Owner role] | [Date range] | Not Confirmed | Pending | Not Assessed | — | High | Confirm source and access |
| Advertising / PPC Data | Marketplace Performance, ROAS / ACOS tracking | [Source system — to be confirmed] | [Owner role] | [Date range] | Not Confirmed | Pending | Not Assessed | — | High | Confirm source and access |
| Pricing Data | Declining SKUs, Pricing issue detection | [Source system — to be confirmed] | [Owner role] | [Date range] | Not Confirmed | Pending | Not Assessed | — | Medium | Confirm source and access |
| Marketplace Listing Data | Marketplace Performance, Best Improving SKUs | [Source system — to be confirmed] | [Owner role] | [Date range] | Not Confirmed | Pending | Not Assessed | — | Medium | Confirm source and access |
| Stock Movement Data | Month-over-Month Analysis, Non-Selling Inventory | [Source system — to be confirmed] | [Owner role] | [Date range] | Not Confirmed | Pending | Not Assessed | — | Medium | Confirm source and access |
| Team Leader Feedback | Review inputs (SRC-ARUN-001 §7.4) | [Feedback file or record] | [TL role] | [Review period] | Not Confirmed | Pending | Not Assessed | — | Medium | Route feedback request |
| Auditor Feedback | Review inputs (SRC-ARUN-001 §7.4) — External Auditor: Paraparan | [Feedback file or record] | Paraparan (External Auditor) | [Review period] | Not Confirmed | Pending | Not Assessed | — | Medium | Route feedback request |
| ROI Officer Feedback | Review inputs (SRC-ARUN-001 §7.4) — Implementation Officer – Arunraj | [Feedback file or record] | Arun (Implementation Officer) | [Review period] | Not Confirmed | Pending | Not Assessed | — | Low | Self-input |

**Risk levels:** High = blocks review generation. Medium = affects completeness. Low = self-managed.

---

## TABLE 3 — PH Monthly Review Output Checklist

**Purpose:** Help Arun verify that all 15 Portfolio Holder review worksheets are complete before the review is issued. Based on the SRC-ARUN-PH-001 15-worksheet output format.

**Source:** SRC-ARUN-PH-001 (15 Excel-friendly worksheet structure)

| Worksheet No. | Worksheet Name | Required Input | Completed | Evidence Link / File | Issue Found | Reviewer | Status |
|---|---|---|---|---|---|---|---|
| 1 | Executive Summary | Sales data, AXIOM band reference, key highlights | — | — | — | Arun | Not Started |
| 2 | YOY Performance | Annual sales comparison data (Amazon UK, eBay UK, eBay DE, B&Q) | — | — | — | Arun | Not Started |
| 3 | Monthly Comparison | Month-by-month sales data for review period | — | — | — | Arun | Not Started |
| 4 | Marketplace Performance | Marketplace-level breakdown — revenue, units, ROAS / ACOS | — | — | — | Arun | Not Started |
| 5 | Best Improving SKUs | SKU-level performance data — improving trend | — | — | — | Arun | Not Started |
| 6 | Declining SKUs | SKU-level performance data — declining trend | — | — | — | Arun | Not Started |
| 7 | Month-over-Month Analysis | Comparative monthly data — all marketplaces | — | — | — | Arun | Not Started |
| 8 | Inventory Report | Current stock levels, reorder status | — | — | — | Arun | Not Started |
| 9 | Non-Selling Inventory | Inventory with zero or near-zero sales movement | — | — | — | Arun | Not Started |
| 10 | SKU Stock Report | SKU-level stock status across marketplaces | — | — | — | Arun | Not Started |
| 11 | Sales Distribution | Sales breakdown by marketplace, category, SKU tier | — | — | — | Arun | Not Started |
| 12 | Coaching Questions | Structured questions per SRC-ARUN-PH-001 coaching section | — | — | — | Arun | Not Started |
| 13 | Appreciation | Positive recognition items per SRC-ARUN-PH-001 | — | — | — | Arun | Not Started |
| 14 | Strengths & Weaknesses | Structured S&W summary per SRC-ARUN-PH-001 | — | — | — | Arun | Not Started |
| 15 | Action Plan | Actions, owners, deadlines per SRC-ARUN-PH-001 | — | — | — | Arun | Not Started |

**Status options:** Not Started / In Progress / Complete / Issue Found / Blocked

---

## TABLE 4 — Risk / Coaching / Action Plan Tracker

**Purpose:** Track day-to-day management follow-up actions at process level — without exposing sensitive personal data. Use after a KPI review to track what needs follow-up coaching or action.

**Source:** SRC-ARUN-001 §7.3 (KPI detection criteria); SRC-ARUN-PH-001 (coaching questions, action plan)

| Review Area | Risk Type | Evidence Needed | Coaching Question | Action Required | Owner | Target Date | Follow-up Status | Escalation Needed | Notes |
|---|---|---|---|---|---|---|---|---|---|
| YOY Growth Below Target | KPI Threshold | YOY Growth data for review period | What was attempted to achieve growth target? How many attempts succeeded? Why was target not achieved? | Review growth drivers; set improvement plan | [Role] | [Date] | Not Started | Review against incident escalation threshold | — |
| Low ROAS / High ACOS | KPI Threshold | Advertising / PPC data — ROAS and ACOS figures | What optimisation was done? What worked? What did not? | Review advertising strategy; adjust bids / targeting | [Role] | [Date] | Not Started | Check ROAS < 400% (Website) or ACOS > 20% (eBay) trigger | — |
| Declining SKU | SKU Risk | SKU-level sales trend data | Has the SKU decline been analysed? What action was taken? | Identify root cause; assign corrective action | [Role] | [Date] | Not Started | If persistent, escalate to inventory or listing review | — |
| Non-Selling Stock | Inventory Risk | Inventory report — non-selling items list | What is the plan for non-selling inventory? | Review stock disposition; update listing or pricing | [Role] | [Date] | Not Started | If no movement in [X] weeks, escalate | — |
| Missing Documentation | Documentation Compliance | Documentation compliance rate | Why is documentation missing? What is the recovery plan? | Complete missing documentation before next review | [Role] | [Date] | Not Started | Documentation compliance < 90% triggers bonus ineligibility (§7.9) | — |
| Inventory Risk | Inventory Threshold | Stock level report | Has stock risk been flagged and escalated? | Review reorder status; flag to supply chain | [Role] | [Date] | Not Started | Confirm lead times | — |
| Pricing Issue | Pricing Risk | Pricing data across marketplaces | Has pricing been reviewed against competitors? | Adjust pricing per marketplace strategy | [Role] | [Date] | Not Started | Cross-check with declining SKU tracker | — |
| PPC Optimisation Needed | PPC Performance | Advertising data — campaign performance | What campaigns are underperforming? What changes were made? | Review and optimise active campaigns | [Role] | [Date] | Not Started | Check ROAS / ACOS thresholds | — |
| SEO / Listing Improvement Needed | Listing Quality | Marketplace listing data — title, content, images | What listing improvements have been tested? | Update listing content and SEO per platform standards | [Role] | [Date] | Not Started | — | — |

**Note:** Do not add individual staff names to the Owner column. Use role-level references only (e.g., "Portfolio Holder", "TL", "Implementation Officer").

---

## TABLE 5 — Arun Dashboard Requirement Tracker

**Purpose:** Track which Arun-related dashboard views are safe to show now, which are gated, and what is needed to unlock gated views.

**Source:** SRC-ARUN-001 §7.10 (management dashboard requirements); SRC-ARUN-PH-001 (review template); CLAUDE.md §6 (confidentiality)

| Dashboard View | Source Basis | Data Required | Current Build Status | Sensitivity Level | Approval Needed | Can Show Now? | Blocker | Next Step |
|---|---|---|---|---|---|---|---|---|
| Portfolio Holder Review Template | SRC-ARUN-PH-001 | Template structure only — no live data | SAFE TEMPLATE — built as read-only control table | LOW (template only) | None for template | YES — as template only | None | Map factual data sources before live report generation |
| KPI Data Readiness | SRC-ARUN-001 §7.4 | Data source metadata (availability, quality status) | SAFE CONTROL TABLE — built as pre-flight checklist | LOW (source metadata only) | None for control table | YES — as control table only | None | Fill in actual data source details once sources confirmed |
| AXIOM Band Reference | SRC-ARUN-001 §7.2 | AXIOM band thresholds (source-backed, static) | GATED | LOW (reference table) | Domain owner confirmation that static reference is safe to show | GATED — confirm with Arun | Awaiting AXIOM reference display approval | Confirm with Arun that static band reference is safe to publish |
| Incident Tracking | SRC-ARUN-001 §7.7 | Incident count data, escalation status — process level | GATED | MEDIUM (aggregate incident data) | Domain owner sign-off; confirm no individual case details shown | GATED | Sensitive — process-level only; no individual case data | Confirm display scope with Arun before building |
| Bonus Eligibility View | SRC-ARUN-001 §7.9; SRC-MD-ARUN-001 §11.11 | KPI results, AXIOM band, documentation compliance status | GATED | HIGH (performance result data) | Arun + PRC approval; Varmen confirmation of queryability condition (soft conflict) | GATED | Requires live KPI data; bonus queryability soft conflict unresolved | Resolve soft conflict (validation/md-arun-discussion-conflict-check.md) before building |
| PRC Review View | SRC-ARUN-001 §7.8 | PRC decision records, escalation outcomes | GATED | HIGH (PRC case data) | PRC members; MD authority | GATED | Admin Manager PRC role [VERIFY] items 1–5 pending SRC-ADMIN-001 | Resolve SRC-ADMIN-001 before building PRC view |
| Staff View | SRC-ARUN-001 §7.10 | Individual staff KPI and performance data | GATED | HIGH (individual performance data) | MD + HR sign-off; PDPA compliance | GATED | Individual staff data — forbidden in this AIOS without explicit MD + HR approval | Not buildable until explicitly approved |
| Team View | SRC-ARUN-001 §7.10 | Team-level KPI and performance aggregates | GATED | MEDIUM (team aggregate data) | Domain owner sign-off; confirm no individual drill-down | GATED | Aggregation rules not yet defined | Define aggregation scope before building |
| Department View | SRC-ARUN-001 §7.10 | Department-level KPI summary | GATED | MEDIUM (department aggregate data) | Domain owner sign-off | GATED | Department scope and data sources not yet mapped | Map department structure and data sources |
| Portfolio View | SRC-ARUN-001 §7.10 | Portfolio-level performance summary across all PH teams | GATED | MEDIUM (portfolio aggregate data) | Arun + domain owner sign-off | GATED — until source data is mapped | Factual sales / KPI data sources not yet mapped | Map data sources; get Arun sign-off before building live view |

---

## Limits

These tables are day-to-day control and planning aids only.

| What these tables DO | What these tables DO NOT do |
|---|---|
| Show review preparation status | Calculate KPI scores or AXIOM bands |
| Track data source readiness | Produce bonus eligibility results |
| Check review output completeness | Generate PRC decisions |
| Surface coaching and action plan items | Store individual staff performance data |
| Show dashboard build and gate status | Automate warning or PIP decisions |

**Next step before live reporting:** Map factual data sources (sales, inventory, advertising, pricing, feedback) and confirm access approval before building the live report generation workflow.

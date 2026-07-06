---
name: arun-ph-team-review-source-map-2026-07-06
type: source-map
member: Arun
role: Implementation Officer
source-id: SRC-ARUN-PH-001
created: 2026-07-06
status: ACTIVE — user-approved integration 2026-07-06
root-truth: CLAUDE.md — canonical; this file is a source pointer map only
---

# Arun — Source Map: Portfolio Holder KPI Review Prompt
**Source ID:** SRC-ARUN-PH-001
**Source Path:** `intelligence-inbox/raw-stakeholder-documents/arun-implementation/Arun-PH-Team.md`
**Integration Date:** 2026-07-06

---

## What Is This?

SRC-ARUN-PH-001 is a Portfolio Holder KPI Performance Review report generation prompt authored by the Implementation Officer (Arun). It provides a structured 16-section LLM prompt template for generating monthly KPI performance review reports for Portfolio Holder employees.

It is a **process template** — a prompt document that defines report structure. It does not itself contain sales data, staff performance scores, AXIOM band placements, or individual employee details. Those require separate data sourcing when a real report is generated.

---

## Why Does It Exist?

This source was provided by Arun in the Arun/Implementation stakeholder document folder. It defines the management-approved format and section order for monthly Portfolio Holder KPI reviews, aligned with the 30% YOY Growth KPI target confirmed in SRC-ARUN-001 and CLAUDE.md §7.1.

---

## Business Question Supported

> "How should the Management AIOS structure a Portfolio Holder monthly KPI performance review?"

A clean LLM reading this source can answer:
- What sections must a PH monthly review include?
- Which marketplaces are in scope for YOY comparison?
- What worksheets must the Excel output contain?
- What coaching questions should management ask?
- What appreciation and recognition categories apply?
- What stock health statuses must be reported?

---

## Report Sections Mapped

| # | Section | Content |
|---|---|---|
| 1 | Year-over-Year Performance | Amazon UK, eBay UK, eBay DE, B&Q — June vs June; 30% KPI status |
| 2 | Additional YOY Comparison | April and May comparisons; same marketplace scope |
| 3 | Overall Monthly Sales Comparison | April, May, June combined — all marketplaces |
| 4 | Total Sales Breakdown | FBA / FBM / Vendor for review month |
| 5 | Best Improving SKUs | Highest YOY sales increase — sorted by impact |
| 6 | Declining SKUs | Sales drop YOY; stock status; price elasticity notes |
| 7 | Month-over-Month Improved SKUs | Current vs prior month |
| 8 | Month-over-Month Declining SKUs | Current vs prior month; out-of-stock flag |
| 9 | Total IDs Analysis | Sales IDs vs total IDs; Sales % |
| 10 | Non-Selling IDs | Count of zero-sales IDs in review month |
| 11 | Non-Selling Stock Analysis | SKU-level stock value; days since last sale; high-stock-risk highlight |
| 12 | Sales Distribution Analysis | Order count categories (No Sales / 1–5 / 6–10 / 11–20 / 21–30 / Above 30) |
| 13 | Complete Stock Report | Every managed SKU — FBA/FBM/reserved/incoming stock; stock cover days; Healthy/Low/Critical/Out-of-Stock status |
| 14 | Employee Coaching Questions | Management discussion prompts — 15 questions |
| 15 | Employee Appreciation Opportunities | Achievement recognition — 10 categories |
| 16 | Final Management Summary | KPI achievement, marketplace highlights, stock health, key risks, action items, next-month focus |

---

## Marketplace Scope

| Marketplace | In Scope for YOY? |
|---|---|
| Amazon UK | YES |
| eBay UK | YES |
| eBay DE | YES |
| B&Q | YES |
| Any other marketplace | NO — source explicitly excludes all others |

**Note:** B&Q named as an in-scope Portfolio Holder marketplace — new detail not previously listed in CLAUDE.md §7. No conflict with existing sources. CLAUDE.md §7.1 does not restrict marketplaces by name; this source adds specific marketplace clarity for the PH domain.

---

## Required Output Format

15 separate Excel-friendly worksheets:

| Worksheet # | Name |
|---|---|
| 1 | Executive Summary |
| 2 | YOY Performance |
| 3 | Monthly Comparison |
| 4 | Marketplace Performance |
| 5 | Best Improving SKUs |
| 6 | Declining SKUs |
| 7 | Month-over-Month Analysis |
| 8 | Inventory Report |
| 9 | Non-Selling Inventory |
| 10 | SKU Stock Report |
| 11 | Sales Distribution |
| 12 | Coaching Questions |
| 13 | Appreciation |
| 14 | Strengths & Weaknesses |
| 15 | Action Plan |

All tables must be directly copy-paste compatible with Microsoft Excel and Google Sheets.

---

## Data Sources Required (Not Included in This Document)

This template requires the following data to generate a real report. These data sources are **not** part of SRC-ARUN-PH-001 — they must be mapped and access-approved separately before report generation:

| Data Type | Required For | Access Status |
|---|---|---|
| Marketplace sales data (Amazon UK, eBay UK, eBay DE, B&Q) | Sections 1–8, Final Summary | Requires separate data source mapping |
| Inventory / stock data | Sections 11, 13 | Requires separate data source mapping |
| Pricing history data | Sections 6, 7 | Requires separate data source mapping |
| Advertising data (ROAS/ACOS implied by KPI context) | KPI review; Section 14 coaching questions | Requires separate data source mapping |
| Order count data | Sections 1–8, 12 | Requires separate data source mapping |
| SKU-level performance history | Sections 5–8 | Requires separate data source mapping |

**No real data is embedded in SRC-ARUN-PH-001.** All fields use placeholders (`{Staff Name}`, `{Review Month}`).

---

## Pass / Fail Rule

**PASS if:** A reader using this source map can locate the correct template sections for any PH KPI review question, understand what data is needed before generating a report, and understand that no live data is embedded in the template.

**FAIL if:** This source map is used to generate a real PH review without first mapping and approving the required data sources listed above.

---

## Limits

| Limit | Detail |
|---|---|
| Template only | Does not provide actual sales, inventory, PPC, or staff performance data |
| No AXIOM band assignments | AXIOM band placement remains Arun's sole authority via SRC-ARUN-001 |
| No KPI threshold changes | All KPI thresholds (30% YOY, ROAS, ACOS) derive from SRC-ARUN-001 and SRC-ARUN-CONF-001 — not this source |
| No bonus/PRC logic | Bonus eligibility and PRC decisions are governed by SRC-ARUN-001 and CLAUDE.md §7.9/§7.8 — not this template |
| No individual staff data | Must not be populated with real staff names, scores, or salary data until data source access is approved |
| Placeholder fields | `{Staff Name}` and `{Review Month}` must remain as variables; do not embed real staff names into this template file |
| CSV exchange-rate data excluded | Rows 44–52 of `my day check list-arun - shedule.csv` (SRC-ARUN-002) are not integrated into this source |

---

## Next Step

Map the required data sources (sales, inventory, advertising, pricing) before building a real Portfolio Holder KPI report generation workflow. Route data source mapping plan to Arun for approval before any report-generation build begins.

---

*Source map created: 2026-07-06 | Source: SRC-ARUN-PH-001 | Domain: Arun / Implementation*

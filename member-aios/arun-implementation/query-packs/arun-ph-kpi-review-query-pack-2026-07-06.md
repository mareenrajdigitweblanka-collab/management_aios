---
name: arun-ph-kpi-review-query-pack-2026-07-06
type: query-pack
member: Arun
role: Implementation Officer
source-id: SRC-ARUN-PH-001
created: 2026-07-06
status: ACTIVE — user-approved integration 2026-07-06
root-truth: CLAUDE.md — canonical; this file is a reusable query reference only
---

# Arun — Query Pack: Portfolio Holder KPI Review
**Source:** SRC-ARUN-PH-001 — `intelligence-inbox/raw-stakeholder-documents/arun-implementation/Arun-PH-Team.md`
**Source Map:** `member-aios/arun-implementation/source-maps/arun-ph-team-review-source-map-2026-07-06.md`

---

## Purpose

This query pack contains reusable LLM-ready questions that can be answered using SRC-ARUN-PH-001. These questions support Portfolio Holder KPI review preparation, report structure guidance, data gap identification, and coaching question generation.

**What these queries do NOT do:** They do not generate real PH performance reports, produce live AXIOM band assignments, calculate bonus eligibility, or substitute for actual sales/inventory data.

---

## Query Set 1 — Report Structure

**Q1.1: What sections are required for a Portfolio Holder monthly KPI review?**

*Source answer (SRC-ARUN-PH-001):* 16 sections are required:
1. Year-over-Year Performance (Highest Priority)
2. Additional YOY Comparison (April and May)
3. Overall Monthly Sales Comparison (April, May, June combined)
4. Total Sales Breakdown (FBA / FBM / Vendor)
5. Best Improving SKUs
6. Declining SKUs
7. Month-over-Month Improved SKUs
8. Month-over-Month Declining SKUs
9. Total IDs Analysis
10. Non-Selling IDs
11. Non-Selling Stock Analysis
12. Sales Distribution Analysis
13. Complete Stock Report
14. Employee Coaching Questions
15. Employee Appreciation Opportunities
16. Final Management Summary

---

**Q1.2: Which marketplaces are included in the Portfolio Holder YOY comparison?**

*Source answer (SRC-ARUN-PH-001):* Amazon UK, eBay UK, eBay DE, and B&Q only. The source explicitly states: "Do NOT include any other marketplace."

---

**Q1.3: What does the Final Management Summary include?**

*Source answer (SRC-ARUN-PH-001):* Overall KPI Achievement (%), 30% YOY Target Status, Best Performing Marketplace, Weakest Marketplace, Best Performing SKU, Worst Performing SKU, Total Revenue, Total Orders, Stock Health Summary, Non-Selling Inventory Summary, Key Risks, Immediate Action Items, Next Month Focus Areas.

---

## Query Set 2 — Output Requirements

**Q2.1: What worksheets must the Excel output contain?**

*Source answer (SRC-ARUN-PH-001):* 15 separate worksheets: Executive Summary, YOY Performance, Monthly Comparison, Marketplace Performance, Best Improving SKUs, Declining SKUs, Month-over-Month Analysis, Inventory Report, Non-Selling Inventory, SKU Stock Report, Sales Distribution, Coaching Questions, Appreciation, Strengths & Weaknesses, Action Plan.

---

**Q2.2: What are the KPI colour-coding rules for the output?**

*Source answer (SRC-ARUN-PH-001):*
- 🟢 Green = Target Achieved
- 🟡 Yellow = Needs Improvement
- 🔴 Red = Critical

Tables must be directly copy-paste compatible with Microsoft Excel and Google Sheets. All tables must include totals, percentages, and summary rows where applicable.

---

**Q2.3: What are the stock status categories used in the Complete Stock Report?**

*Source answer (SRC-ARUN-PH-001):* Four statuses — Healthy, Low, Critical, Out of Stock.

---

## Query Set 3 — Data Requirements

**Q3.1: What data is required before generating a Portfolio Holder KPI review?**

*Source answer (SRC-ARUN-PH-001):* Sales data by marketplace, inventory/stock data (FBA/FBM/reserved/incoming/stock cover days), pricing history data, advertising data (implied by ROAS/ACOS context), order count data, and SKU-level performance history. None of these are embedded in the template — they must be sourced separately.

---

**Q3.2: Which parts of SRC-ARUN-PH-001 are template-only and not live calculations?**

*Source answer:* All parts. The entire document is a prompt template. All data fields use placeholders (`{Staff Name}`, `{Review Month}`). No sales, inventory, pricing, or advertising data is embedded. AXIOM band assignments are not made within this template — those remain Arun's authority via SRC-ARUN-001.

---

**Q3.3: What should be marked as unavailable if source data is missing?**

*Source answer (SRC-ARUN-PH-001 Important Rules):* "Clearly identify assumptions where data is unavailable." Do not estimate values. If a data field cannot be filled from available factual data, mark it as unavailable with a reason — do not invent or estimate values.

---

**Q3.4: What should NOT be estimated?**

*Source answer (SRC-ARUN-PH-001 Important Rules):* No values may be estimated. All data must be factual. Sales figures, order counts, stock values, days-since-last-sale, and SKU performance metrics must all derive from real data sources. Assumptions must be explicitly identified where used.

---

## Query Set 4 — Coaching and Review

**Q4.1: What coaching questions should management ask during a PH KPI review?**

*Source answer (SRC-ARUN-PH-001 §14):* Management coaching questions include:
- Why did Amazon UK achieve or miss the 30% YOY target?
- Which product categories have the highest future growth opportunity?
- Which low-performing SKUs require immediate action?
- What actions were taken to recover declining listings?
- Which listings require PPC optimisation?
- Which listings require SEO improvements?
- Which products need pricing adjustments?
- Which listings require image improvements?
- What inventory risks exist?
- Which products need stock replenishment?
- What lessons were learned this month?
- What action plan will be implemented next month?
- Which automation opportunities have been identified?
- Which tasks should be delegated to improve efficiency?
- What support is required from management?

---

**Q4.2: What inventory risks should be reviewed?**

*Source answer (SRC-ARUN-PH-001 §11, §13):*
- Non-selling inventory with high stock value (flagged as "High Stock Risk")
- Out-of-stock items (present in Sections 6, 8, 11, 13)
- Low / Critical stock status items
- High days-since-last-sale combined with high current stock
- Sales declines linked to out-of-stock events

---

**Q4.3: What are the employee appreciation categories?**

*Source answer (SRC-ARUN-PH-001 §15):*
- Highest YOY Growth
- Highest Sales Increase
- Successful Recovery of Low-Selling SKU
- Excellent Stock Management
- Best Marketplace Performance
- Strong Inventory Planning
- Good Pricing Strategy
- Excellent Order Growth
- Continuous KPI Improvement
- Strong Ownership

---

## Query Set 5 — Source Limits

**Q5.1: What are the known limits of SRC-ARUN-PH-001?**

| Limit | Detail |
|---|---|
| Template only | Does not provide sales, inventory, PPC, or staff performance data |
| No AXIOM band assignments | AXIOM band placement remains Arun's authority via SRC-ARUN-001 |
| No KPI threshold changes | 30% YOY, ROAS, ACOS thresholds derive from SRC-ARUN-001 and SRC-ARUN-CONF-001 |
| No bonus/PRC logic | Bonus eligibility governed by SRC-ARUN-001 §9 and CLAUDE.md §7.9 |
| Placeholder fields only | `{Staff Name}` and `{Review Month}` — no real staff data embedded |
| No sensitive data | Must not be populated with real staff names, performance scores, or salary data |
| CSV exchange-rate exclusion | Rows 44–52 of SRC-ARUN-002 not integrated |
| Data source mapping required | Real data sources must be mapped and access-approved before a live report is generated |

---

**Q5.2: Can SRC-ARUN-PH-001 be used to generate a real PH performance report today?**

*Source answer:* No — not until the required data sources (sales, inventory, pricing, advertising) are mapped and access-approved. The template defines structure only. A real report requires factual data supplied from approved external sources.

---

## Usage Rules

1. Use these queries to structure PH review conversations, identify data gaps, or guide report preparation planning.
2. Do not use these queries to generate real performance scores, assign AXIOM bands, or evaluate bonus eligibility.
3. Do not embed real staff names, sales figures, or performance data into the template file itself.
4. Route all real report generation workflows to Arun for approval before build begins.

---

*Query pack created: 2026-07-06 | Source: SRC-ARUN-PH-001 | Domain: Arun / Implementation*

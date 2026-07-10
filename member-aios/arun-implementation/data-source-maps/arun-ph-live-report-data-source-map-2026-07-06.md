---
name: arun-ph-live-report-data-source-map
type: data-source-map
member: Arun
role: Implementation Officer
created: 2026-07-06
status: AMBER — factual sources missing; access approvals absent
source-boundary: SRC-ARUN-PH-001, SRC-ARUN-001, SRC-ARUN-CONF-001, SRC-MD-ARUN-001
root-truth: CLAUDE.md — canonical; this file is a data-source mapping document only
approval-required-from: Arun — must confirm source systems, owners, access approvals, evidence paths, and display-layer rules before live report generation may begin
---

# Arun PH Live Report Data-Source Map — 2026-07-06

**Root Truth Rule:** This file is a documentation-only data-source map. It does not replace CLAUDE.md. All authority, policy rules, and governance standards are defined in the root CLAUDE.md and registered sources. If this file contradicts CLAUDE.md, CLAUDE.md is correct.

**Live Report Gate:** This file does NOT approve live report generation. Live PH report generation remains blocked until all required data areas are source-mapped, owner-confirmed, access-approved, and evidence-path documented.

---

## 1. What This Is

This is a documentation-only data-source map for Arun PH live report readiness. It identifies the factual source systems, data areas, owners, and access approvals required before a live Portfolio Holder KPI review report can be generated safely within the Management AIOS.

**This file does not approve live report generation.** It documents what must be confirmed before that work may begin.

This map was created following the completion of a read-only discovery report (2026-07-06) which concluded AMBER. The discovery found that the PH report structure is known and KPI thresholds are confirmed, but 6 of 8 factual data areas are undocumented or missing, 1 area is partial, and 1 area is blocked. No access approvals exist.

---

## 2. Why This Exists

Live PH report generation requires pulling real sales, inventory, advertising, pricing, and feedback data from factual source systems. Before any of that work begins, the AIOS must confirm:

- Which system or file is the authoritative source for each data type
- Who owns each source system and can approve access
- What the export or API path is
- What sensitivity level applies
- Whether display of that data at the staff or portfolio-holder level is approved

Without these confirmations, building a live report generation workflow would mean connecting to unknown systems without approval, potentially exposing sensitive staff or business data, and creating an output that cannot be traced back to a registered source.

This map exists so that Arun can review each data area, confirm the source details, and route the approvals needed before any live workflow is built.

---

## 3. Business / Operational Question Supported

> "What factual source systems must be mapped and approved before Arun can generate live Portfolio Holder KPI review reports safely?"

---

## 4. Source Basis

| Source | Role in This Map |
|---|---|
| SRC-ARUN-PH-001 — `intelligence-inbox/raw-stakeholder-documents/arun-implementation/Arun-PH-Team.md` | PH report structure, 16 report sections, 15 Excel worksheets, marketplace scope — defines which data areas are required |
| SRC-ARUN-001 — `intelligence-inbox/raw-stakeholder-documents/arun-implementation/KPI Definitions, AXIOM Band Placement, Review Input_Output & Management Tracking Framework.md` | KPI/AXIOM framework and review inputs — defines KPI thresholds this report must respect |
| SRC-ARUN-CONF-001 — `evidence/stakeholder-confirmations/arun-member-aios-review-2026-06-30.md` | Arun confirmation record — ACOS threshold (ACOS below 25% / ROAS 4), ROI Officer = Implementation Officer – Arunraj, Paraparan = External Auditor |
| Discovery report (user-provided 2026-07-06) | Read-only discovery findings — AMBER result; identified 6 missing, 1 partial, 1 blocked data areas; confirmed no access approvals exist |
| Existing Arun control-table build — commit ca81e02 | Day-to-day control tables and dashboard table map; KPI Data Source Readiness Table confirms data gaps at control-layer level |

**Source limits:** This map does not introduce new KPI thresholds, AXIOM bands, or business rules. All performance thresholds referenced belong to SRC-ARUN-001 and SRC-ARUN-CONF-001. This map does not resolve any [VERIFY] items.

---

## 5. Required Data Areas Table

| # | Data Area | Required For (PH Report Sections) | Required Metrics | Current Mapping Status | Access Approval Needed From | Next Step |
|---|---|---|---|---|---|---|
| A | Sales data | YOY Performance; Additional YOY; Monthly Sales Comparison; FBA/FBM/Vendor Breakdown; Sales Distribution | Sales by marketplace; FBA/FBM/Vendor split; Order counts; Growth %; Monthly trend | **MISSING** | Arun + sales data owner | Confirm source system / export path |
| B | Inventory / stock data | Inventory Report; Non-Selling Inventory; SKU Stock Report; Non-Selling Stock Analysis | Stock levels per SKU; Non-selling items; Days since last sale; Reorder status; Stock health | **MISSING** | Arun + inventory owner | Confirm system / file owner |
| C | Advertising / PPC data | KPI detection; Coaching questions | ROAS; ACOS; Campaign performance; Spend vs return | **MISSING** | Arun + PPC owner | Confirm PPC source system |
| D | Pricing data | Declining SKUs; Month-over-month declining analysis; Coaching questions | Pricing history; Competitive pricing; Price change log | **MISSING** | Arun + pricing owner | Confirm pricing master / source |
| E | Marketplace / listing data | Best Improving SKUs; Declining SKUs; Product categories | Active listings count; Parent/Child ASINs; Listing titles; SEO status; Marketplace-level listing health | **MISSING** | Arun | Confirm marketplace / listing export source |
| F | Exchange-rate data | Multi-currency reporting only if confirmed | Currency exchange rates | **BLOCKED** — SRC-ARUN-002 rows 44–52 excluded; multi-currency scope not confirmed | Arun | Confirm whether exchange-rate data is required at all before mapping |
| G | Team Leader / Auditor feedback | Final Management Summary | TL narrative feedback; Paraparan / external auditor feedback; Arun feedback | **PARTIAL** — feedback roles confirmed (SRC-ARUN-CONF-001) but format, frequency, and evidence path not documented | Arun | Confirm format, frequency, and evidence / submission path |
| H | Historical performance baseline | YOY comparisons | Prior-year sales by month and marketplace; at least 12-month historical coverage | **MISSING** | Arun + data custodian | Confirm archive / source path |

**Summary:** 6 of 8 areas MISSING. 1 area PARTIAL (G — TL/Auditor feedback). 1 area BLOCKED (F — exchange-rate scope not confirmed). No access approvals exist for any area.

---

## 6. Access Approval Questions

The following questions must be answered by Arun before any live report generation work begins.

| Data Area | Question Arun Must Answer | Likely Owner | Status | Evidence Needed |
|---|---|---|---|---|
| A — Sales data | What is the authoritative source system or export file for PH marketplace sales data (Amazon UK, eBay UK, eBay DE, B&Q)? Who owns access? | Arun + sales data owner | UNANSWERED | Written confirmation from Arun naming source system and owner |
| B — Inventory / stock data | What system or file holds live stock levels and non-selling inventory per SKU? Who owns it? | Arun + inventory owner | UNANSWERED | Written confirmation from Arun naming source and owner |
| C — Advertising / PPC data | What is the source for ROAS and ACOS by marketplace and campaign? Where does PPC data reside? | Arun + PPC owner | UNANSWERED | Written confirmation from Arun naming PPC source system |
| D — Pricing data | What is the source for pricing history and price change logs? Is there a pricing master file? | Arun + pricing owner | UNANSWERED | Written confirmation from Arun naming pricing source |
| E — Marketplace / listing data | What is the export source for active listings, ASINs, and listing health per marketplace? | Arun | UNANSWERED | Written confirmation from Arun naming listing export path |
| F — Exchange-rate data | Is multi-currency reporting required for the PH live report? Should exchange-rate data be included? | Arun | UNANSWERED — BLOCKED | Written confirmation from Arun: YES or NO for multi-currency scope |
| G — TL / Auditor feedback | What format and frequency are used for TL narrative feedback and Paraparan's auditor feedback? Where is this submitted? | Arun | PARTIAL — roles confirmed; format/path unknown | Written confirmation from Arun on submission format and evidence path |
| H — Historical baseline | Where is prior-year sales data archived (at least 12 months per marketplace)? Who holds custodianship? | Arun + data custodian | UNANSWERED | Written confirmation from Arun naming archive source and custodian |

---

## 7. Duplicate / Parent-Truth Risk

This file does not restate KPI thresholds as new truth. All KPI thresholds (ROAS, ACOS, YOY growth, etc.) belong to SRC-ARUN-001 and SRC-ARUN-CONF-001. This map points to those sources — it does not redefine them.

**Rules enforced in this file:**

- Do not restate KPI thresholds, AXIOM band definitions, bonus conditions, or PRC rules as new content
- Reference SRC-ARUN-001 and SRC-ARUN-CONF-001 as the authoritative performance threshold sources
- Do not promote live data sources discovered during access confirmation into parent AIOS truth — they must be registered in `evidence/source-register.md` before being cited as sources
- Treat live source files as evidence inputs, not parent truth, until separately registered and approved
- Do not edit `evidence/source-register.md` in this task — source registration is a separate approved step
- This file does not resolve any [VERIFY] items in `context/verify-register.md`

---

## 8. Sensitive Data Risk

| Data Type | Risk Level | Rule |
|---|---|---|
| Staff-level performance data (individual AXIOM bands, scores, performance case details) | HIGH | Must not be stored in this AIOS at the individual level — aggregate and process-level only (CLAUDE.md §6) |
| Individual AXIOM band scores by name | HIGH | Out of scope — Arun holds AXIOM band placement authority but individual scores must not be stored in AIOS files |
| Portfolio Holder names in report outputs | MEDIUM | Permissible in operational process context where required; must not appear alongside individual AXIOM scores, salary, or disciplinary data |
| PDPA-applicable personal data (if individual-level HR data enters the report) | HIGH — requires HR authority | Any individual-level personal data entering the live report requires Mayurika / HR authority and PDPA-compliant access controls (CLAUDE.md §6) |
| Aggregate marketplace-level sales, ROAS, ACOS data | LOWER — but still requires approved source path | Aggregate business performance data is lower sensitivity but still requires an approved, registered source path before use |
| Advertising spend and campaign performance data | MEDIUM — business-sensitive | Requires source approval and access confirmation before inclusion |
| Historical sales and YOY baseline figures | MEDIUM — business-sensitive | Source custodian must confirm access approval before baseline data is pulled |

**Sensitive data rule:** No sensitive staff data, individual AXIOM scores, salary data, disciplinary case details, or PDPA-personal data may be stored in this file or in any live report output unless explicitly approved by the MD and HR owner with proper access controls in place (CLAUDE.md §6).

---

## 9. Live Workflow Gate

**Live PH report generation workflow may not be built until all of the following are confirmed for each required data area:**

1. Source system or file is identified and named
2. Data owner is confirmed in writing
3. Access approval is granted by the data owner and Arun
4. Evidence path (how the data enters the AIOS / report) is documented
5. Display-layer approval is confirmed by Arun (what data may be shown, at what level of aggregation)
6. Sensitivity review is completed for any data area that touches staff-level performance, individual AXIOM bands, or PDPA-applicable personal information

**Until all six conditions are met for all required data areas, the live report generation workflow must not be built, connected to any API, or pulled from any production database.**

This gate applies regardless of technical feasibility. Even if a data connection can be built, it must not be built without the approvals above.

---

## 10. Status

| Field | Value |
|---|---|
| **Overall Status** | **AMBER** |
| **Reason** | Factual sources missing for 6 of 8 required data areas. 1 data area is partial (feedback format/path unknown). 1 data area is blocked (exchange-rate scope unconfirmed). No access approvals exist for any data area. |
| **Allowed Next Action** | Route this data-source map to Arun for confirmation of source systems, owners, and access status for each of the 8 data areas |
| **Blocked Action** | Do not build live report generation. Do not connect APIs. Do not pull real data. Do not edit PostgreSQL objects or production database. |

---

## 11. Owner / Reviewer

| Role | Person |
|---|---|
| Owner | Arun — Implementation Officer |
| Coordinator | Sathees or assigned coordinator |
| Queryability Reviewer | Tamil Selvan or assigned reviewer |
| Technical Reviewer | Sajeesan or assigned senior developer — only if/when live workflow / API work is approved and begins |
| Business Validator | Arun — must confirm all 8 data areas before live workflow approval |

**Domain reviewer routing (CLAUDE.md §18):** KPI / AXIOM / ROI / implementation domain questions are routed to Arun. Any data area touching staff records or PDPA-applicable data must also route to Mayurika before display-layer approval is confirmed.

---

## 12. Known Limits

| Limit | Detail |
|---|---|
| Discovery-based only | This map is based on the read-only discovery report (2026-07-06) and existing Arun documents. It does not confirm that any source system is accessible. |
| No source access confirmed | No data owner has been contacted. No access has been requested or granted. |
| No export format confirmed | The format of any export file or API response for any data area is unknown. |
| No API availability confirmed | Whether any source system exposes an API is unknown. |
| No staff-level display approved | Individual PH or staff-level data display rules have not been approved. |
| Bonus and PRC gated items not resolved | Bonus eligibility conditions (CLAUDE.md §7.9) and PRC composition ([VERIFY] items 1–5) are not affected by or resolved by this map. |
| Exchange-rate scope blocked | SRC-ARUN-002 rows 44–52 are excluded. Whether multi-currency reporting is required has not been confirmed by Arun. |
| [VERIFY] items not resolved | No [VERIFY] items in `context/verify-register.md` are resolved by this file. |

---

## 13. Next Step

**Single action required:**

Ask Arun to confirm the source system / file owner and access status for each of the 8 data areas listed in §5 and §6.

Once Arun provides written confirmation for each area, the relevant data source can be registered, the access approval documented as evidence, and the live workflow gate (§9) assessed for readiness to proceed.

---

*File created: 2026-07-06 | Branch: individual-aios | Status: AMBER — pending Arun confirmation*

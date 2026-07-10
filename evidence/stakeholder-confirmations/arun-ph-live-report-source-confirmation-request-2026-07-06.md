---
name: arun-ph-live-report-source-confirmation-request
type: confirmation-request
member: Arun
role: Implementation Officer
created: 2026-07-06
status: PENDING — awaiting Arun response
data-source-map: member-aios/arun-implementation/data-source-maps/arun-ph-live-report-data-source-map-2026-07-06.md
root-truth: CLAUDE.md — canonical; this file is a confirmation request only
---

# Arun PH Live Report — Data-Source Confirmation Request

**Date:** 2026-07-06
**Prepared by:** Mareenraj (builder / coordinator)
**Requested from:** Arun — Implementation Officer
**Status:** PENDING — awaiting Arun written response

---

## 1. Purpose

This document requests Arun's written confirmation of the factual source systems, data owners, and access approvals required before live Portfolio Holder KPI review report generation can begin.

A data-source map was completed on 2026-07-06 and found that 6 of 8 required data areas are undocumented, 1 is partial, and 1 is blocked. No access approvals currently exist. Live report generation is AMBER and cannot proceed until Arun responds to this request.

This is a documentation and confirmation request only. No live report workflow, API connection, real data pull, or PostgreSQL edit has been made or is being requested here.

---

## 2. Current Status

| Field | Value |
| --- | --- |
| Overall status | **AMBER** |
| Data-source map | `member-aios/arun-implementation/data-source-maps/arun-ph-live-report-data-source-map-2026-07-06.md` |
| Data areas MISSING | 6 of 8 — Sales, Inventory/stock, PPC/Advertising, Pricing, Marketplace/listing, Historical baseline |
| Data areas PARTIAL | 1 — TL/Auditor feedback (roles confirmed; format and submission path unknown) |
| Data areas BLOCKED | 1 — Exchange-rate data (multi-currency scope not confirmed) |
| Access approvals existing | None |
| Blocked action | Live report generation — do not build until Arun confirms all 8 areas |

---

## 3. What Arun Must Confirm

For each of the 8 data areas below, Arun is asked to provide written answers to the following questions. Arun may respond by filling in the answer rows directly or by providing a written note against each area.

**For each area, please confirm:**

1. **Source system or file name** — What is the name of the system, file, or export that holds this data?
2. **Source owner** — Who is responsible for maintaining or producing this data?
3. **Access owner** — Who must approve access to this data for the AIOS / report?
4. **Export format** — How is this data available? (e.g., CSV export, Google Sheet, API, manual entry)
5. **Date range available** — How far back does this data go? Is at least 12 months of history available?
6. **Evidence path** — Where should the confirmed source be documented / filed?
7. **Staff-level data present?** — Does this data contain individual staff names, individual AXIOM scores, or other staff-level identifiers? (YES / NO / PARTIAL)
8. **Display approved?** — Is Arun approving this data for display in the PH live report? (YES / NO / CONDITIONAL — if conditional, please state conditions)

---

## 4. Data Area A — Sales Data

**Required for:** YOY Performance; Additional YOY; Monthly Sales Comparison; FBA/FBM/Vendor Breakdown; Sales Distribution

**Required metrics:** Sales by marketplace (Amazon UK, eBay UK, eBay DE, B&Q); FBA/FBM/Vendor split; Order counts; Growth %; Monthly trend

**Current status:** MISSING — no source system confirmed

| Question | Arun's Answer |
| --- | --- |
| Source system or file name | |
| Source owner | |
| Access owner | |
| Export format | |
| Date range available | |
| Evidence path | |
| Staff-level data present? | |
| Display approved? | |

---

## 5. Data Area B — Inventory / Stock Data

**Required for:** Inventory Report; Non-Selling Inventory; SKU Stock Report; Non-Selling Stock Analysis

**Required metrics:** Stock levels per SKU; Non-selling items; Days since last sale; Reorder status; Stock health

**Current status:** MISSING — no source system confirmed

| Question | Arun's Answer |
| --- | --- |
| Source system or file name | |
| Source owner | |
| Access owner | |
| Export format | |
| Date range available | |
| Evidence path | |
| Staff-level data present? | |
| Display approved? | |

---

## 6. Data Area C — Advertising / PPC Data

**Required for:** KPI detection (ROAS, ACOS); Coaching questions

**Required metrics:** ROAS; ACOS; Campaign performance; Spend vs return

**Note:** KPI thresholds confirmed by SRC-ARUN-CONF-001 — ROAS >= 400% (Website), Amazon ACOS below 25% / ROAS 4, eBay ACOS below 20%. This confirmation request does not redefine those thresholds. It asks only for the source system that holds the raw PPC data.

**Current status:** MISSING — no source system confirmed

| Question | Arun's Answer |
| --- | --- |
| Source system or file name | |
| Source owner | |
| Access owner | |
| Export format | |
| Date range available | |
| Evidence path | |
| Staff-level data present? | |
| Display approved? | |

---

## 7. Data Area D — Pricing Data

**Required for:** Declining SKUs; Month-over-month declining analysis; Coaching questions

**Required metrics:** Pricing history; Competitive pricing; Price change log

**Current status:** MISSING — no source system confirmed

| Question | Arun's Answer |
| --- | --- |
| Source system or file name | |
| Source owner | |
| Access owner | |
| Export format | |
| Date range available | |
| Evidence path | |
| Staff-level data present? | |
| Display approved? | |

---

## 8. Data Area E — Marketplace / Listing Data

**Required for:** Best Improving SKUs; Declining SKUs; Product categories

**Required metrics:** Active listings count; Parent/Child ASINs; Listing titles; SEO status; Marketplace-level listing health

**Current status:** MISSING — no source system confirmed

| Question | Arun's Answer |
| --- | --- |
| Source system or file name | |
| Source owner | |
| Access owner | |
| Export format | |
| Date range available | |
| Evidence path | |
| Staff-level data present? | |
| Display approved? | |

---

## 9. Data Area F — Exchange-Rate Data

**Required for:** Multi-currency reporting — **only if Arun confirms this is in scope**

**Current status:** BLOCKED — SRC-ARUN-002 rows 44–52 (CSV exchange-rate data) are excluded from the current source boundary. Multi-currency reporting scope has not been confirmed.

**Before any other questions in this area can be answered, Arun must answer the scope question first:**

| Scope question | Arun's Answer |
| --- | --- |
| Is multi-currency reporting required for the PH live report? (YES / NO) | |

**If YES — please also confirm:**

| Question | Arun's Answer |
| --- | --- |
| Source system or file name | |
| Source owner | |
| Access owner | |
| Export format | |
| Date range available | |
| Evidence path | |
| Display approved? | |

**If NO — no further action needed for this area. Exchange-rate data will remain excluded.**

---

## 10. Data Area G — Team Leader / Auditor Feedback

**Required for:** Final Management Summary

**Required inputs:** TL narrative feedback; Paraparan (External Auditor) feedback; Arun feedback

**Current status:** PARTIAL — feedback roles are confirmed (SRC-ARUN-CONF-001: Paraparan = External Auditor; Implementation Officer – Arunraj provides review input). The submission format, frequency, and evidence path are not yet documented.

| Question | Arun's Answer |
| --- | --- |
| Format for TL narrative feedback (e.g., written report, form, verbal recorded) | |
| Frequency (e.g., monthly, per review cycle) | |
| Where TL feedback is submitted / filed | |
| Format for Paraparan's auditor feedback | |
| Where Paraparan's feedback is submitted / filed | |
| Format for Arun's own feedback input | |
| Evidence path for all three feedback types | |
| Display approved? (narrative summaries in report) | |

---

## 11. Data Area H — Historical Performance Baseline

**Required for:** YOY comparisons across all marketplaces

**Required metrics:** Prior-year sales by month and marketplace; at least 12 months of historical coverage

**Current status:** MISSING — no archive source confirmed

| Question | Arun's Answer |
| --- | --- |
| Source system or file name | |
| Source owner / data custodian | |
| Access owner | |
| Export format | |
| Earliest date available (is 12-month history confirmed?) | |
| Evidence path | |
| Staff-level data present? | |
| Display approved? | |

---

## 12. Explicit Blocked Actions

The following actions remain blocked until Arun completes this confirmation request:

| Blocked Action | Reason |
| --- | --- |
| Build live report generation workflow | Source systems, owners, and access approvals are not confirmed |
| Connect any API to the AIOS or dashboard | No access approval exists for any data source |
| Pull real sales, inventory, PPC, pricing, or listing data | No source or export path confirmed |
| Display staff-level data in PH report | Individual staff data display has not been approved |
| Include exchange-rate data | Multi-currency scope has not been confirmed by Arun |
| Register new live data sources in source-register.md | Source registration requires Arun confirmation first |
| Edit CLAUDE.md, context/verify-register.md, or evidence/source-register.md | Outside scope of this confirmation task |

---

## 13. Owner / Reviewer

| Role | Person |
| --- | --- |
| Confirmation requested from | Arun — Implementation Officer |
| Coordinator | Sathees or assigned coordinator |
| Queryability Reviewer | Tamil Selvan or assigned reviewer |
| Technical Reviewer | Sajeesan or assigned senior developer — only if/when live workflow work is approved to begin |
| Builder / preparer | Mareenraj |

**Once Arun's written confirmation is received:**
Mareenraj will record the responses as evidence, update the data-source map status for each confirmed area, and assess whether the live workflow gate (data-source map §9) is met.

Any data area touching individual staff records or PDPA-applicable personal data will also require Mayurika / HR authority before display-layer approval is finalised (CLAUDE.md §6, §18).

---

## 14. Pass / Fail Rule

**PASS** if Arun provides written confirmation for all 8 data areas — naming the source system, owner, access owner, export format, date range, evidence path, staff-level data status, and display approval — and written responses are recorded as a registered evidence file.

**FAIL / AMBER** if any of the following remain:

- Any data area has no named source system
- Any data area has no confirmed access owner
- Any data area has no confirmed evidence path
- Exchange-rate scope is not answered YES or NO by Arun
- Staff-level display approval is not explicitly confirmed or denied
- No written confirmation record exists

**Current result: AMBER — awaiting Arun written response.**

---

## 15. Next Step

**Single action:**

Route this confirmation request to Arun and ask him to provide written answers for each of the 8 data areas.

Once Arun's written response is received, record it as a registered evidence file in `evidence/stakeholder-confirmations/` and update the data-source map status accordingly.

---

*File created: 2026-07-06 | Branch: individual-aios | Status: PENDING — awaiting Arun response*

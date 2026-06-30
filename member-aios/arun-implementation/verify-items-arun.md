---
name: arun-implementation-verify-items
type: verify-register-subset
member: Arun
role: Implementation Officer
created: 2026-06-30
status: ACTIVE — Arun Reviewed 2026-06-30; items 8, 9, 10 ARUN CONFIRMED at member workbench layer; root register update pending
source-boundary: SRC-ARUN-001, SRC-MD-ARUN-001, context/verify-register.md
root-truth: CLAUDE.md — canonical; this file is a [VERIFY] navigation subset only
---

# Arun — Open [VERIFY] Items

**Purpose:** This file lists the three [VERIFY] items from `context/verify-register.md` that require Arun's direct confirmation to resolve. It does not resolve any item. It provides the full context for each item so Arun can confirm or clarify.

**Root Truth Rule:** This file is a subset view of `context/verify-register.md`. It does not replace or override the full register. The authoritative [VERIFY] register is `context/verify-register.md`.

**[VERIFY] Removal Rule:** No item in this file may be marked resolved without:
1. Registered source evidence in `evidence/source-register.md`
2. Arun's direct confirmation (verbal, written, or documented)
3. `context/verify-register.md` updated to reflect resolution

Notify Mareenraj when Arun is ready to confirm any item. Mareenraj will register the confirmation and update the relevant files.

---

## Item 8 — Amazon ACOS Threshold Wording

**[VERIFY] Status:** ARUN CONFIRMED 2026-06-30 at member workbench layer — root `context/verify-register.md` update pending

**Full register entry (context/verify-register.md #8):**
> Amazon ACOS threshold wording — SRC-ARUN-001 formatting unclear. Confirm exact threshold direction and formatting. **Checked against SRC-MD-ARUN-001 (2026-06-26): no evidence found — Amazon ACOS threshold not mentioned in source. Still VERIFY.**

**Location in CLAUDE.md:** §7.3 — KPI Detection Criteria

**The issue:**
The original source wording in SRC-ARUN-001 is `"Amazon ACOSBelow 25%"` — the formatting is ambiguous. There is no space between "ACOS" and "Below", and it is unclear whether:
- The trigger fires when Amazon ACOS is **below** 25% (i.e., low ACOS is good, and the concern is different), OR
- The trigger fires when Amazon ACOS **exceeds** 25% (i.e., high ACOS is the risk)

This is important because the eBay ACOS trigger is confirmed as "Below 20%" (threshold direction is confirmed for eBay), but the Amazon ACOS trigger direction is ambiguous.

**Current CLAUDE.md state:**
> Amazon ACOS: Below 25% **[VERIFY — Arun: source wording is "Amazon ACOSBelow 25%" — threshold direction and formatting should be confirmed]**

**What Arun needs to confirm:**
- Is the Amazon ACOS KPI risk trigger: "Amazon ACOS **below** 25%" or "Amazon ACOS **above** 25%"?
- Is 25% the correct threshold, or is there a different number?

**Arun confirmation (2026-06-30):**
Amazon ACOS threshold: ACOS below 25% / ROAS 4. Confirmed directly by Arun.

**Evidence:** `evidence/stakeholder-confirmations/arun-member-aios-review-2026-06-30.md`

**Root register update pending:** Mareenraj must update CLAUDE.md §7.3 and `context/kpi-axiom-context.md` §3 using this confirmation as a registered source. `context/verify-register.md` item 8 is not yet updated in this step.

---

## Item 9 — Operational Manager Escalation Authority

**[VERIFY] Status:** ARUN CONFIRMED FOR ESCALATION AUTHORITY ONLY 2026-06-30 — full PRC membership scope remains [VERIFY] in root register; root update pending

**Full register entry (context/verify-register.md #9):**
> Operational Manager PRC membership and scope — SRC-ARUN-001 names role; no dedicated source. **Checked against SRC-MD-ARUN-001 (2026-06-26): no evidence found — PRC composition not discussed in source. Still VERIFY.**

**Location in CLAUDE.md:** §3 — Organisation Structure, §7.8 — PRC Governance

**The issue:**
SRC-ARUN-001 names the Operational Manager as a PRC member. However:
- There is no dedicated source document for the Operational Manager role
- The Operational Manager's detailed responsibilities and reporting line have not been confirmed
- The scope of the Operational Manager's participation in PRC (voting? advisory? review only?) is unknown

**Current CLAUDE.md state:**
> PRC members: ... Operational Manager **[VERIFY — Arun: confirm Operational Manager PRC membership and scope of participation]**

**Arun confirmation (2026-06-30) — escalation authority only:**
The Operational Manager has the authority to delay or avoid a suspension/termination under the escalation policy if the concerned staff member provides a firm commitment, with a defined deadline, to achieve the required ROI.

**Scope limit:** This confirmation covers the Operational Manager's escalation authority specifically. It does not confirm full PRC membership scope, voting rights, or advisory vs. review-only participation in PRC. Those broader aspects remain [VERIFY] in the root register.

**Evidence:** `evidence/stakeholder-confirmations/arun-member-aios-review-2026-06-30.md`

**Root register update pending:** Mareenraj must update CLAUDE.md §7.7 / §7.8 and `context/kpi-axiom-context.md` §7 / §8 with the confirmed escalation authority detail. `context/verify-register.md` item 9 is not yet updated in this step — the broader PRC membership scope aspect remains open.

---

## Item 10 — ROI Officer Identity / Title

**[VERIFY] Status:** ARUN CONFIRMED 2026-06-30 at member workbench layer — root `context/verify-register.md` update pending

**Full register entry (context/verify-register.md #10):**
> ROI Officer identity / title in review inputs — Arun confirmation. **Candidate resolution:** SRC-MD-SUMAN-001 (07/05/2026) identifies ROI Officers as Arun and Mayurika jointly, with Selva auditing submissions. **Checked against SRC-MD-ARUN-001 (2026-06-26): partial supporting evidence — Mayurika confirmed coordinating developer ROI validation (25/06/2026), which aligns with the candidate resolution, but "ROI Officer" title not used in this source.** [VERIFY] tag must remain until Arun directly confirms.

**Location in CLAUDE.md:** §7.4 — Review Inputs

**The issue:**
SRC-ARUN-001 lists "ROI officer feed back" as a review input, but does not clarify:
- Whether "ROI Officer" is a distinct formal role
- Or whether it is a functional title used informally for existing roles

**VERIFY Resolved Candidate from SRC-MD-SUMAN-001 (07/05/2026):**
SRC-MD-SUMAN-001 identifies ROI Officers as Arun and Mayurika jointly, with Selva auditing submissions. This candidate is noted in `context/verify-register.md` but the [VERIFY] tag must remain until Arun directly confirms — a candidate resolution from a different stakeholder's discussion notes is not the same as Arun's direct confirmation.

**Current CLAUDE.md state:**
> ROI Officer Feedback **[VERIFY — Arun: source lists "ROI officer feed back" — confirm whether this is a distinct role or a title for an existing role. VERIFY Resolved Candidate (SRC-MD-SUMAN-001): ROI Officers = Arun and Mayurika jointly. [VERIFY] must remain until Arun directly confirms.]**

**Arun confirmation (2026-06-30):**
Replace "ROI Officer" with "Implementation Officer – Arunraj". Also record Paraparan as the External Auditor.

**Evidence:** `evidence/stakeholder-confirmations/arun-member-aios-review-2026-06-30.md`

**Root register update pending:** Mareenraj must update CLAUDE.md §7.4 and `context/kpi-axiom-context.md` §4 to replace "ROI officer feed back" with "Implementation Officer – Arunraj feedback" and add Paraparan as External Auditor. `context/verify-register.md` item 10 is not yet updated in this step.

---

## Summary Table

| # | [VERIFY] Item | Confirmation | Member Workbench Status | Root Register |
|---|---|---|---|---|
| 8 | Amazon ACOS threshold wording | Arun direct — 2026-06-30 | ARUN CONFIRMED — ACOS below 25% / ROAS 4 | Update pending |
| 9 | Operational Manager escalation authority | Arun direct — 2026-06-30 | ARUN CONFIRMED FOR ESCALATION AUTHORITY ONLY | Broader PRC scope still [VERIFY]; update pending |
| 10 | ROI Officer identity / title | Arun direct — 2026-06-30 | ARUN CONFIRMED — Implementation Officer – Arunraj; External Auditor – Paraparan | Update pending |

---

## How to Resolve Any Item

1. Arun provides direct confirmation (verbal, written, or documented)
2. Notify Mareenraj with the confirmed wording
3. Mareenraj registers the confirmation as a new source in `evidence/source-register.md`
4. Mareenraj updates the [VERIFY] tag in CLAUDE.md (relevant section)
5. Mareenraj updates `context/kpi-axiom-context.md` (relevant section)
6. Mareenraj updates `context/verify-register.md` — moves item to Resolved Items table
7. This file is updated to reflect RESOLVED status for the confirmed item

**None of these steps can be completed by Arun alone.** Source registration requires Mareenraj as builder. Domain confirmation requires Arun. Both are needed.

---

## What These Items Do NOT Affect (Until Resolved)

The three [VERIFY] items do not block Arun's confirmed day-to-day authority. Arun can continue to:
- Place AXIOM bands (his confirmed sole authority)
- Process weekly AXIOM data
- Manage incident escalation (confirmed framework in CLAUDE.md §7.7)
- Manage KPI meetings per the confirmed governance in CLAUDE.md §11.9
- Participate in PRC as a confirmed member

The [VERIFY] items affect specific claims in the AIOS documentation — they do not suspend Arun's operational authority in his confirmed domain.

---

## Pass/Fail Rule

PASS if all three items remain correctly tagged [VERIFY] and no item is removed without the standard resolution process.

FAIL if any item is removed from this file or from `context/verify-register.md` without registered source evidence and Arun's direct confirmation.

---

## Known Limits

- This file is a navigation subset of `context/verify-register.md`. The authoritative register is the full file.
- A VERIFY Resolved Candidate (item 10) is noted but does not reduce the [VERIFY] status. Arun's direct confirmation is required regardless of the candidate.
- These three items have been checked against SRC-MD-ARUN-001 (2026-06-26) — no evidence was found in that source for any of the three items.

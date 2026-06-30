---
name: arun-implementation-verify-items
type: verify-register-subset
member: Arun
role: Implementation Officer
created: 2026-06-30
status: DRAFT — Pending Arun review; all three items PENDING
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

**[VERIFY] Status:** PENDING — Arun direct confirmation required

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

**How to resolve:**
Arun states the correct threshold and direction. Mareenraj will register this confirmation as a new stakeholder confirmation source in `evidence/source-register.md` and update CLAUDE.md §7.3 and `context/kpi-axiom-context.md` §3.

---

## Item 9 — Operational Manager PRC Membership and Scope

**[VERIFY] Status:** PENDING — Arun direct confirmation required (or dedicated Operational Manager source)

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

**What Arun needs to confirm:**
- Does the Operational Manager participate in PRC sessions?
- What is the Operational Manager's scope within PRC: full voting member, advisory participant, or review-only?
- Is the Operational Manager role currently filled? If so, by whom (role-level reference, not personal data)?

**How to resolve:**
Arun provides direct confirmation. Mareenraj will register the confirmation as a new stakeholder confirmation source in `evidence/source-register.md` and update CLAUDE.md §3 and §7.8, and `context/kpi-axiom-context.md` §8.

---

## Item 10 — ROI Officer Identity / Title

**[VERIFY] Status:** PENDING — Arun direct confirmation required
**VERIFY Resolved Candidate exists:** SRC-MD-SUMAN-001 (07/05/2026) — see below

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

**What Arun needs to confirm:**
- Is "ROI Officer" a distinct formal role, or is it a functional descriptor for Arun and/or Mayurika?
- If it refers to Arun and Mayurika: confirm that ROI Officer feedback in the review inputs means feedback from Arun and Mayurika in their capacity as ROI monitors
- If there is a separate ROI Officer role: confirm who holds it and what their scope is

**How to resolve:**
Arun provides direct confirmation. Mareenraj will register the confirmation as a new stakeholder confirmation source in `evidence/source-register.md` and update CLAUDE.md §7.4 and `context/kpi-axiom-context.md` §4.

---

## Summary Table

| # | [VERIFY] Item | Can Resolve By | Status | Candidate Available? |
|---|---|---|---|---|
| 8 | Amazon ACOS threshold wording | Arun direct statement | PENDING | No |
| 9 | Operational Manager PRC membership | Arun direct statement or dedicated source | PENDING | No |
| 10 | ROI Officer identity / title | Arun direct statement | PENDING — VERIFY Resolved Candidate exists | YES — from SRC-MD-SUMAN-001 |

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

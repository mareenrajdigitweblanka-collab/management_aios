---
name: suman-source-format-update
type: validation
created: 2026-06-23
---

# Suman Source Format Update

## Previous Issue

SRC-SUMAN-001 v1 (`Recruitment_Quality_Control_Process.docx`) was registered as the Suman recruitment source. The .docx binary format could not be parsed by Claude Code. As a result, all recruitment sections in CLAUDE.md Foundation Draft v0.1 were blocked and marked:

`[VERIFY — SRC-SUMAN-001: content to be extracted from .docx]`

Affected sections: §8.1 through §8.6 (candidate pipeline, screening, scoring, reviews, handover, daily capture).

## Fix

A readable Markdown version of the same document was added to the suman-recruitment folder:

`intelligence-inbox/raw-stakeholder-documents/suman-recruitment/Recruitment_Quality_Control_Process.md`

The .docx file was moved to a subfolder (`archive/`, folder name as created by user) prior to this update. It has been registered as SUPERSEDED.

The .md file was read in full and registered as SRC-SUMAN-001-v2. All recruitment content was confirmed directly from the source text.

## Files Affected

| File | Change Made |
|------|-------------|
| `evidence/source-register.md` | SRC-SUMAN-001 replaced with SRC-SUMAN-001-v1 (SUPERSEDED) and SRC-SUMAN-001-v2 (READY); source count updated; note added |
| `validation/raw-source-readiness-check.md` | Suman row updated from .docx/unreadable to .md/readable; status updated to READY |
| `CLAUDE.md` | Source status table updated; §8 Recruitment Context fully rewritten from .md content; §12 [VERIFY] Register reduced from 18 to 14 items (5 docx-blocked items removed, 1 new item added for Line Manager identity) |
| `validation/claude-source-map.md` | 5 [VERIFY] recruitment rows replaced with 12 CONFIRMED rows citing SRC-SUMAN-001-v2; §4 domain row updated; summary counts corrected |

## Content Confirmed from SRC-SUMAN-001-v2

All of the following were confirmed directly from the readable .md source:

| Topic | Status |
|-------|--------|
| Candidate pipeline (sourcing channels, shortlisting basis) | CONFIRMED |
| 8-point screening criteria (all 8 named) | CONFIRMED |
| Interview scoring (5 areas × 10 marks, 50 total, >30 threshold) | CONFIRMED |
| Rejected and on-hold candidate tracking | CONFIRMED |
| Recruitment commitment records | CONFIRMED |
| 7/14-day review (7 assessment areas including AI/LLM adoption) | CONFIRMED |
| Month 1 review (4 areas; On Track/Watch/Concern/Critical categories) | CONFIRMED |
| Month 3 review (4 areas; discontinuation trigger for unresolved Concern) | CONFIRMED |
| Month 6 review (3 areas; probation confirmation and handover prep) | CONFIRMED |
| Source quality monitoring (activity and quality metrics) | CONFIRMED |
| 180-day handover (15-min meeting; Line Manager, Mayurika, Arun, Suman) | CONFIRMED — Line Manager identity [VERIFY] |
| Daily knowledge capture (1 hour/day; 6 topic areas) | CONFIRMED |

## Remaining [VERIFY] Items

One new [VERIFY] item was added as a result of reading the source:

| Item | Reason |
|------|--------|
| Line Manager identity in 180-day handover (CLAUDE.md §8.11) | SRC-SUMAN-001-v2 names "Line Manager" as a handover meeting attendee but does not specify who holds this role. Confirm with Suman or Varmen. |

All other recruitment [VERIFY] markers existed solely because the .docx was unreadable. These have been removed and replaced with CONFIRMED content from the .md source.

## Source Name Note

SRC-SUMAN-001-v2 spells the HR Officer's name as **"Mayoorika"** (double-o). All other sources and CLAUDE.md use **"Mayurika"**. This is a spelling variation in the original source document, not a different person. CLAUDE.md uses "Mayurika" as the canonical spelling (consistent with SRC-MAYU-001 and SRC-VAR-001) and notes the source variation in §8.11.

## Pass / Fail Rule

PASS if:

- SRC-SUMAN-001-v2 (.md) is the current active source for all recruitment claims
- SRC-SUMAN-001-v1 (.docx) is registered as SUPERSEDED and no longer cited as active
- All recruitment claims in CLAUDE.md map to SRC-SUMAN-001-v2 in claude-source-map.md
- No recruitment claim relies on the unreadable .docx as its evidence
- [VERIFY] markers are only present where the .md source is genuinely unclear or incomplete

FAIL if:

- Both .docx and .md remain listed as active sources
- Any [VERIFY] marker was removed without .md evidence
- Admin Manager or Arun [VERIFY] markers were accidentally removed
- Any recruitment content in CLAUDE.md has no Source ID and no [VERIFY] tag

## Result

**PASS**

- SRC-SUMAN-001-v2 (.md) is the current active source
- SRC-SUMAN-001-v1 (.docx) is registered as SUPERSEDED
- All recruitment claims in CLAUDE.md cite SRC-SUMAN-001-v2
- No recruitment content relies on the unreadable .docx
- Admin Manager [VERIFY] items 1–5 are unchanged
- Arun [VERIFY] items 8–10 are unchanged
- One new [VERIFY] item added (Line Manager identity) — sourced gap, not an invented claim

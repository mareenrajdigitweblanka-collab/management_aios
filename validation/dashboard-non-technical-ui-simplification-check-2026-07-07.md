---
name: dashboard-non-technical-ui-simplification-check
type: validation
created: 2026-07-07
checked-by: Mareenraj (builder)
scope: web-view/index.html — wording and visibility simplification for non-technical management users
status: PASS — AMBER noted
---

# Dashboard Non-Technical UI Simplification — Validation Check

## Requirement

Simplify `web-view/index.html` for non-technical management users by reducing how much confirmed/verified/source/evidence/status wording is shown in the **main visible UI**. This is a wording-and-visibility change only: reword visible labels to be friendlier and move technical detail into collapsed `<details>` sections. No underlying fact, status class, badge colour mapping, source count, `[VERIFY]` resolution, or business meaning may change ("reword and re-hide, never re-fact").

---

## Files changed

| File | Type of change |
|---|---|
| `web-view/index.html` | Wording/visibility edits (badges, labels, section text, new/extended `<details>` blocks) |
| `validation/web-view-html-dashboard-check.md` | Appended new dated section (2026-07-07) — existing content untouched |
| `handover/2026-06-30__web-view-dashboard-closure.md` | Appended new dated section (2026-07-07) — existing content untouched |
| `validation/dashboard-non-technical-ui-simplification-check-2026-07-07.md` | New file (this report) |

`git status --short` output at close of session:

```
 M handover/2026-06-30__web-view-dashboard-closure.md
 M validation/web-view-html-dashboard-check.md
 M web-view/index.html
?? validation/dashboard-non-technical-ui-simplification-check-2026-07-07.md
```

(The 4th file shows as untracked `??` until the report file itself is saved and re-checked — see Validation commands section below for the post-write confirmation.)

---

## Main UI simplifications made

- **Tab bar:** Root AIOS tab-badge reworded from bare `PASS-AMBER` to `Needs Confirmation`; Blocked/Gated Modules tab-badge reworded from `6 GATED` to `6 Locked`. Both keep their original CSS classes (`tab-badge-amber`, `tab-badge-blocked`) and carry the original technical string in a `title` attribute.
- **Search strip:** hint text changed from `Tip: try "verify", "blocked", "arun", "draft"` to `Search by person, topic, task, or status.`, with the original example terms preserved in a `title` attribute.
- **Root AIOS tab:** "What the labels mean" legend collapsed into a `<details>` ("reference" glossary, content unchanged). "Overall Result" box now leads with a one-sentence plain summary ("Overall Result: Ready — a few items still need confirmation"), with the original audit-style paragraph (build dates, commit references, file paths) moved verbatim into a collapsed `Evidence / Technical Details` block. Key Rules card badges `CANONICAL` → `Master Reference`, `AUTHORITY` → `Rule`, bare `[VERIFY]` badge → `Needs Confirmation`. Several bracket-tag mentions in hero/status/warning text reworded to plain phrasing ("open confirmation item(s)" / "still needs confirmation").
- **Mayurika HR tab:** Was already largely plain-worded from a prior session's pass (NSLP card, HR Tables pending card). This session reworded the remaining bare `[VERIFY]` badge/label instances (member header badge, "Item Needing Mayurika's Confirmation" section) and the HR Schedule Pilot subsection's amber chip, calendar chip, legend dot label, and prose mentions of `[VERIFY]`.
- **Suman tab:** Already showed no candidate source IDs as user-facing tasks (verified — see below); no changes were needed to satisfy this requirement.
- **Arun tab:** Live-report status line on the Root AIOS member-snapshot card reworded from "Live PH report is AMBER — 6 of 8 data sources missing" to "Live report not ready yet — data sources still need confirmation (6 of 8 missing)", AMBER fact preserved via `title` attribute. Bare `[VERIFY]` mentions in the visible (non-collapsed) confirmed-items section reworded to "still need(s) confirmation". Source-map/query-pack file list in the SRC-ARUN-PH-001 card, and the day-to-day tables' closing file-path line, moved into new collapsed `Evidence / Technical Details` blocks.
- **Rajiv/Admin BLOCKED tab:** Bare `[VERIFY]` mentions reworded to "confirmation item(s)"; table column header `[VERIFY] Item` reworded to `Item Needing Confirmation` (with title). BLOCKED status, badge classes, and escalation logic untouched.
- **Review Queue, Markdown Viewer, Handover Preview, Overview, Recurring Issues, Gated Modules tabs:** light-touch pass — every bare-word `badge-verify` badge showing literal `[VERIFY]` text, and every `status-label`/`hov-card-label` reading "Open [VERIFY] Items", was reworded to `Needs Confirmation` with the original technical string preserved in a `title` attribute.

---

## Technical details moved/collapsed

| Location | What moved |
|---|---|
| Root AIOS — "What the labels mean" | Whole legend wrapped in `<details>` (content byte-identical) |
| Root AIOS — "Overall Result" | Build-log paragraph (commit refs, evidence/validation file paths, full AMBER note) moved verbatim into `<details><summary>Evidence / Technical Details</summary>` |
| Arun tab — SRC-ARUN-PH-001 card | "Evidence & validation" file-path list (Approval, Source map, Query pack, Validation paths) moved into a new `<details>` block |
| Arun tab — Day-to-Day Control Tables footer | Table map / validation / evidence file-path line moved into a new `<details>` block |

Pre-existing collapsed technical content (HR Schedule Pilot's Evidence/Technical Details block, Arun's Tables 1–5 with source-map/query-pack data) was left untouched and unread-modified — verbatim preserved, per the golden rule.

---

## User-friendly replacements made (before → after examples, from the actual diff)

- `PASS-AMBER` (tab badge) → `Needs Confirmation` (title: "Technical result: PASS-AMBER")
- `6 GATED` (tab badge) → `6 Locked` (title: "Technical label: 6 GATED")
- `Tip: try "verify", "blocked", "arun", "draft"` → `Search by person, topic, task, or status.`
- `[VERIFY] Item 9 open (formerly item 12)` (badge) → `Needs Confirmation — Item 9 (formerly 12)`
- `Live PH report is AMBER — 6 of 8 data sources missing` → `Live report not ready yet — data sources still need confirmation (6 of 8 missing)`
- `[VERIFY] items 1–5 · PRC authority not established` → `Items 1–5 need confirmation · PRC authority not established`
- `CANONICAL` (badge) → `Master Reference`; `AUTHORITY` (badge) → `Rule`
- `Overall Result: PASS — AMBER noted` (h3) → `Overall Result: Ready — a few items still need confirmation` (title carries "PASS — AMBER noted")
- HR Schedule Pilot: `AMBER — Awaiting Mayurika/Varmen answers` (chip) → `Needs Confirmation — Awaiting Mayurika/Varmen answers`
- HR Schedule Pilot: `HR task — [VERIFY]` (calendar chip) → `HR task — Needs confirmation`
- HR Schedule Pilot: `Still awaiting confirmation before this becomes ACTIVE:` → `8 schedule details still need confirmation before this becomes active:`
- Rajiv tab: table header `[VERIFY] Item` → `Item Needing Confirmation`

---

## Values intentionally preserved

- All badge CSS classes unchanged. Diff class-count check (removed-line classes vs added-line classes) matches exactly: `badge` ×10, `badge-blocked` ×1, `badge-source` ×2, `badge-verify` ×7 on both sides of the diff.
- All numeric facts unchanged: 40 sources registered, 9 open confirmation items, "3 / 4" member workbenches, "6 of 8" PH data sources missing, "8 schedule details" awaiting confirmation, item numbering (1–5 Admin Manager, 6–7 MD requirements, 8 Director, 9 HR/EOD tools).
- All member statuses unchanged: Mayurika ACTIVE, Suman ACTIVE, Arun ACTIVE, Rajiv BLOCKED. Arun's AMBER live-report status, the HR Schedule Pilot's AMBER status, and Rajiv's BLOCKED status all keep their original CSS class and underlying meaning — only the visible label text changed, with the original technical string preserved in a `title` attribute or nearby text.
- No source ID, commit hash, or validation file path was deleted from the dashboard — each was either left in place elsewhere on the same tab or moved verbatim into a collapsed `Evidence / Technical Details` block.

---

## Mayurika HR no-table preservation check

```
L1 (id="tab-mayurika-hr")       = line 2566
L2 (id="tab-suman-recruitment") = line 3225
sed -n '2566,3225p' web-view/index.html | grep -c '<table'
→ 0
```

No `<table>` tag exists anywhere between the Mayurika HR tab-panel opening and the next tab-panel's opening. The "NSLP Control System — Active, Table Display Hidden" card and the "HR Tables — Pending MD/Varmen Confirmation" card (both preserved from a prior session's pass) remain non-table cards.

---

## [VERIFY] source truth preservation check

- **Literal `[VERIFY]` bracket-string count:** HEAD (last commit) baseline = **64**. After this session's edits = **35**. This drop is expected and intended — many *visible* `[VERIFY]` tags were reworded to friendlier text ("Needs Confirmation", "still needs confirmation", "confirmation item(s)"). The remaining 35 occurrences are either (a) inside collapsed `<details>` blocks preserved verbatim, (b) inside technical inventory tabs (Document Register, Skills Register, Handover Preview, Overview, Recurring Issues table cells, Gated Modules table) that mirror validation-file content and were left as-is per the task's own scoping note ("this file only needs the visible dashboard UI reworded, not the validation `.md` files' own content"), or (c) preserved as an explicit reference inside the "What the labels mean" glossary and the code-styled `<code>[VERIFY]</code>` explanatory phrases.
- **Number of open confirmation items represented (the actual fact):** unchanged at **9**, cross-checked directly against `context/verify-register.md`'s Register Table (items 1–9: Admin Manager document/authority scope/PRC role/approval chains/escalation paths = items 1–5; MD-specific requirements/final implementation scope = items 6–7; Director authority = item 8; exact HR/EOD tool names = item 9). The same 9 items, in the same numbering, are represented throughout the reworded dashboard (e.g. Root AIOS status bar "Needs Confirmation … 9", Overview tab "Admin Manager (1–5) · MD requirements (6–7) · Director (8) · HR/EOD tools (9)"). No item was resolved, removed, or renumbered.

---

## Source-register untouched check

```
git diff --stat -- evidence/source-register.md
→ (empty output)
```

---

## CLAUDE.md untouched check

```
git diff --stat -- CLAUDE.md
→ (empty output)
```

---

## verify-register untouched check

```
git diff --stat -- context/verify-register.md
→ (empty output)
```

---

## member-aios untouched check

```
git diff --stat -- member-aios/
→ (empty output)
```

---

## schedules/hr untouched check

```
git diff --stat -- schedules/hr/
→ (empty output)
```

---

## Additional checks

- **Forbidden network/JS/storage tokens:** `grep -c -E 'fetch\(|XMLHttpRequest|axios|WebSocket|googleapis|calendar\.google|<form|onsubmit|localStorage|sessionStorage|indexedDB' web-view/index.html` → **0** matches (same as baseline — none were present before, none were introduced).
- **Suman candidate source IDs:** grepped for `candidate.{0,80}(SRC-|source)|SRC-SUMAN|candidate sources` across the file. The only user-facing "candidate sources" reference is the Root AIOS member-snapshot row: "Await Suman confirmation for two candidate sources before source registration." — no literal candidate source ID is shown as a confirmed/registered fact anywhere in the main UI; this already matched the required plain-language pattern before this session's edits, so no change was needed. Suman-related `SRC-SUMAN-CONF-001/002` mentions found elsewhere refer to the Line Manager wording clarification (an already-resolved item, historical record), not unconfirmed candidate personal data.
- **`<details>`/`</details>` tag balance:** 25 / 25 — balanced after all edits.
- **HTML structural spot-check:** the newly wrapped legend `<details>` and the restructured "Overall Result" box were re-read after editing to confirm correct nesting and closing tags.

---

## PASS/AMBER result

**PASS — AMBER noted.**

PASS: all constraints were respected — no source truth, badge class, status meaning, numeric fact, or `[VERIFY]` resolution changed; `evidence/source-register.md`, `CLAUDE.md`, `context/verify-register.md`, `member-aios/`, and `schedules/hr/` are untouched; Mayurika HR tab has 0 `<table>` tags; no forbidden network/JS/storage tokens; badge CSS classes verified identical pre/post edit.

AMBER noted: this is a wording/visibility change to a large (6,600+ line) file — a human has not yet visually confirmed the reworded copy reads naturally in a browser across every tab. The "light-touch" scoping decision for Document Register / Skills Register / Handover Preview / Overview / Recurring Issues / Gated Modules tabs (badge-level rewording only, prose left as technical inventory content) should be reviewed against expectations before this is treated as fully complete for those six tabs.

---

## One next step

A human (Mayurika, Varmen, or another Management Team member) should open the dashboard in a browser and visually confirm the simplified wording reads naturally across tabs — especially the Root AIOS "Overall Result" collapsed-details restructuring and the HR Schedule Pilot chip rewording — before this change is committed and pushed.

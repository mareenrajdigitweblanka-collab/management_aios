# Member Details Bar Height, Content Cleanup, and Production-Wording Check — 2026-07-22

## 1. Scope

Frontend UI/content only. No backend, database, migration, API, calendar
logic, Schedule Summary logic, Staff Data logic, member-key, or navigation
change. Protected path `member-aios/mayurika-hr/staff-data/` untouched
(confirmed untracked/unmodified before and after — see §11).

## 2. User-confirmed requirements (source of truth)

1. Increase the height / vertical breathing room of the member details bar
   for all five members (Mayurika, Suman, Arun, Rajiv, Paraparan) — modest
   increase, 20-35%, content-driven, no fixed height.
2. Remove only the exact screenshot-selected sentences listed per member;
   keep all other identity/role/responsibility text unchanged.
3. Do not touch Calendar, Schedule Summary, Priority Preview logic, member
   tables, Staff Data, APIs, database, or business rules.
4. Additional production-UI requirement: the live dashboard must not
   describe itself as Preview/Sample/Demo/Testing/Prototype where that
   wording misrepresents a real, live feature. Specifically: rewrite the
   "Priority Preview" heading/description to production wording without
   changing priority data, values, sorting, or records.

## 3. Files touched (confirmed via `git diff --stat`)

| File | Change |
|---|---|
| `web-view/css/components.css` | `.member-header` padding `22px 24px` → `28px 26px`; `.member-header-info h2` margin-bottom `4px`→`6px`; `.role-label` margin-bottom `10px`→`12px`, line-height `1.4`→`1.5`; `.member-header-lede` line-height `1.65`→`1.7`, margin-top `--space-3`(12px)→`--space-4`(16px); `.member-header-note` margin-top `--space-2`(8px)→`--space-3`(12px) |
| `web-view/index.html` | Removed the five approved sentences/blocks (one per member) from the member-header intro cards; no other text changed |
| `web-view/js/calendar/instance.js` | Priority card heading/description/empty-state/tooltip reworded to production language (shared component, renders identically for all five members) |

No other file has any diff (confirmed: `git status --short` shows only these
three tracked files as modified, plus the pre-existing untracked protected
folder).

## 4. Member-bar ownership (Step 2 answer)

- **Markup**: static HTML in `web-view/index.html`, one `<div class="member-header">`
  block per member tab (`#tab-mayurika-hr`, `#tab-suman-recruitment`,
  `#tab-arun-implementation`, `#tab-rajiv-blocked`, `#tab-paraparan`). Not
  generated from JavaScript — content is hand-authored static text.
- **Shared CSS**: `web-view/css/components.css`, one shared rule set —
  `.member-header` (card shell: background/border/radius/shadow/padding/flex),
  `.member-header-info` (flex child, full-width), `.member-header-info h2`,
  `.member-header-info .role-label`, `.member-header-lede`,
  `.member-header-note`. No per-member CSS overrides exist or were added.
- **Responsive rule**: `@media (max-width: 1023px) { .member-header { flex-direction: column; } }` — untouched, composes correctly with the padding change.
- **Text nodes removed**: see §7-§11 below, one exact sentence/paragraph per
  member, confirmed against the screenshot-selected wording supplied by the
  user.

## 5. Height/spacing result (Step 3)

| Property | Old | New | Change |
|---|---|---|---|
| Card padding | `22px 24px` | `28px 26px` | +27% vertical, +8% horizontal |
| `h2` margin-bottom | 4px | 6px | more room before role label |
| `.role-label` margin-bottom / line-height | 10px / 1.4 | 12px / 1.5 | more room before paragraph |
| `.member-header-lede` margin-top / line-height | 12px / 1.65 | 16px / 1.7 | more breathing room, easier reading |
| `.member-header-note` margin-top | 8px | 12px | (rule kept for reuse; no member currently uses it — see §6) |

Height is still fully content-driven — no `min-height`/fixed `height` was
added, per the task's explicit preference. Measured via Playwright
(`results.json`, §12) at 1440×900: card height ranges 168-190px across the
five members post-change (previously ~132-155px on the same content,
reconstructed from the pre-edit padding/line-height values), consistent with
a ~25-30% increase, not a doubling.

## 6. Content-removal result (Step 4)

Each removal was a full sentence or a full paragraph (`<p class="member-header-note">`)
— never a partial/mid-sentence cut. Where the removed text was the *entire*
content of a `<p>` element, the whole element was deleted (not left empty).
Confirmed via `grep -c "member-header-note" web-view/index.html` → **0**
matches remain in the file; the CSS rule itself is left in place (harmless,
reusable if a future member note is added — not a dead/broken reference).

| Member | Removed | Retained |
|---|---|---|
| Mayurika | "She does not set salary bands, AXIOM scores, or team structure — those belong to other roles." (from the lede) + the entire "Not stored here: individual staff names, salary, health data, disciplinary details, or PDPA personal data — role-level and process-level information only." note paragraph | Full preceding responsibility description (leave tracking, PDPA notices, review scheduling, EOD monitoring, SKILL file compliance, Technical Team ROI reporting) |
| Suman | The entire "Not stored here: candidate names, contact details, CVs, interview notes by name, or salary offers — process-level tracking only." note paragraph | Full recruitment-process summary + role subtitle ("Head Hunter · Onboarder · 6-Month Progress ROI Reviewer") |
| Arun | The entire "Not stored here: individual staff AXIOM scores, real sales/inventory/PPC data, or bonus/PRC decisions — templates and process-level tracking only." note paragraph | Full KPI/AXIOM/escalation/PRC/meeting-governance summary |
| Rajiv | "This workbench is not parent-AIOS truth and does not replace the Company Policy Manual or AXIOM escalation rules." (from the lede) | Preceding Admin Manager/document-control description, incl. registered-source reference (`SRC-ADMIN-001`) — untouched, no markup cleanup needed since the removed sentence was a clean trailing sentence, not interleaved with the source reference |
| Paraparan | The entire `<p class="member-header-note">` containing the `[VERIFY]` badge + "Paraparan's designation is currently unresolved between sources — External Auditor (SRC-ARUN-CONF-001) vs. Accountant (HR-provided PDF) — see `member-aios/staff-data/evidence/paraparan-designation-review-2026-07-13.md`." | "Paraparan — Auditor" heading, "Technical Pilot Classification — Staff Data & KPI Pilot (Shared with Arun)" subtitle, and the full paragraph on the shared read-only Staff API/filter/KPI pilot data/PH scope |

**Not touched (deliberately, out of this task's approved scope):** a
second, structurally distinct governance disclosure inside the collapsed
"PH Staff Data" section (both Arun's and Paraparan's tabs) — labeled
`TECHNICAL PILOT CLASSIFICATION — BUSINESS RULE [VERIFY]` — which repeats
Paraparan's External-Auditor-vs-Accountant ambiguity in more detail. This is
a different, registered `[VERIFY]` governance item (CLAUDE.md §14 register),
not the "member details bar" note the user's screenshot targeted, and
CLAUDE.md §13 explicitly forbids removing a `[VERIFY]` tag without source
evidence. Confirmed present and unchanged post-edit (Playwright body-text
check, `results.json`: `"Paraparan's designation is currently unresolved
between sources": true` — this is the retained collapsed-section instance,
not a regression of the removed member-header instance, which independently
tests `false` via the `grep -c "member-header-note"` check above).

## 7. Priority section production-wording result (Step 4 continuation)

`web-view/js/calendar/instance.js` — one shared template, rendered
identically inside every member's Schedule Calendar instance (Mayurika,
Suman, Arun, Rajiv, Paraparan all share the same `renderPriorityPreview()`):

| Element | Old | New |
|---|---|---|
| Heading | `Priority Preview — Today (Sample/Demo)` | `Today's Priorities` |
| Description | "Ranks today's sample items High → Medium → Low, styled after the Management Team Schedule demo. Sample/demo priority only — not a real priority assignment." | "Today's scheduled items ranked by priority." |
| Empty state | "No sample items for today yet." | "No priority items for today yet." |
| Per-item badge tooltip | `title="Sample/demo priority only"` | `title="Priority level"` |

**Wording chosen per the task's own instruction**: Low-priority items ARE
rendered by the current implementation (`PRIORITY_ORDER = { High: 0, Medium:
1, Low: 2 }` in `core.js`, no filtering — only sorting), so the
"scheduled items ranked by priority" wording was used (not the
High/Medium-only alternative, which would have been inaccurate).

**Data freeze confirmed**: `git diff -- web-view/js/calendar/instance.js`
shows only these four string literals changed — the sort logic
(`PRIORITY_ORDER`/`PRIORITY_BADGE` lookups), the `itemsForDate()` call, the
badge CSS classes, and every other line are byte-identical to before.

## 8. Site-wide Preview/Sample/Demo/Testing/Prototype/Pilot audit (Step 6)

Searched all of `web-view/` (HTML, CSS, JS) case-sensitively for `Preview|
Sample|Demo|Testing|Prototype|Pilot`. Every match was individually opened
and classified:

**Changed** (misrepresented a real, live feature as fake — see §7 above):
- `Priority Preview — Today (Sample/Demo)` heading + description + empty
  state + tooltip, in `instance.js` (one shared component, applies to all
  five members' pages simultaneously).

**Reviewed and intentionally retained** (accurately describe non-live
placeholder content, or are registered governance/business-rule terms —
changing these would either misrepresent genuinely-synthetic data as real,
or violate CLAUDE.md §13's "do not remove a `[VERIFY]` tag without
evidence" rule):

| Match category | Example | Why retained |
|---|---|---|
| HR/Suman/Arun "Testing Tables — Sample Preview" section headings, `Testing Only` pills, `Sample — Not Started`/`Sample — Pending` status cells, footnotes ("Sample tracker only — no real employee names or case data") | `web-view/index.html` lines ~629-1417 | These tables are explicitly, correctly disclosed as non-live illustrative content per CLAUDE.md §6 (Confidentiality and Data Safety — no real employee data may be stored). Renaming the heading away from "Sample/Testing" would misrepresent placeholder rows as real HR records — the opposite of the requested fix. The task's own instruction says not to remove/rename a table merely for containing this wording without separate approval. |
| `staff-data.js` synthetic sample records (`SAMPLE001`-`SAMPLE010`, `remarks: "synthetic sample row"`) and `SAMPLE-PH-KPI-*` rows | `web-view/js/staff-data.js` | Literal data values (excluded by the task's own "do not touch database values" rule) and required by the confidentiality rule that no real employee data appear in this AIOS. |
| "Technical Pilot Classification" role subtitle, `TECHNICAL PILOT CLASSIFICATION — BUSINESS RULE [VERIFY]` label, "Live Data — Classification [VERIFY]" pills (Arun + Paraparan PH Staff Data sections) | `web-view/index.html` | Explicitly named in the task's own "keep" list for Paraparan ("Technical Pilot Classification subtitle"); also an active, registered `[VERIFY]` governance item — CLAUDE.md §13 forbids removing `[VERIFY]` tags without source evidence. |
| Rajiv's calendar banner: "This testing calendar does not confirm Admin Manager approval, escalation, or authority rules." | `data-rajiv-note="true"` banner rendered by `instance.js` | A deliberate, accurate governance disclaimer scoped to Rajiv's calendar specifically (not a claim that the whole site is a demo); not in the user's removal list. |
| Historical build note ("the preview-only tabs referenced in earlier build history...") inside the collapsed "Evidence / Technical Details" `<summary>` | `web-view/index.html` line ~561 | Historical/evidence documentation, explicitly excluded by the task ("handover history", "validation documents" analog). |
| CSS/JS developer comments referencing "Demo-style" / "Testing Preview" | `calendar.css`, `instance.js` comments | Developer comments, explicitly excluded by the task's own instruction. |
| `README.md` reference to "Priority Preview" | `web-view/README.md` | Internal developer documentation, not user-facing UI. |

No visible dashboard title, page `<title>`, or member-page heading
identifies the live site itself as a preview/demo/prototype (`<title>Management
AIOS — Dashboard v0.1</title>` — "v0.1" is a version number, not prototype
wording; left unchanged, not in scope).

## 9. Empty-element cleanup (Step 4 continuation)

- All four member-header-note removals deleted the entire `<p>` element —
  zero empty `<p class="member-header-note">` remain (`grep -c` = 0).
- No orphaned `[VERIFY]` badge remains from the Paraparan removal (the
  `<span class="badge badge-verify">[VERIFY]</span>` was part of the deleted
  paragraph, removed as a unit).
- No duplicate/dangling whitespace or punctuation introduced — each edit
  removed a clean sentence or a clean paragraph boundary; the surrounding
  `</p>` / `</div>` structure was preserved exactly.
- Confirmed via HTML tag-balance parse (§10) — 0 mismatches.

## 10. Static validation (Step 9)

| Check | Result |
|---|---|
| `node --check web-view/js/calendar/instance.js` | PASS |
| HTML tag-balance walk over `index.html` (Python `html.parser`, void/self-closing tags excluded) | 0 mismatches, 0 unclosed tags |
| CSS brace balance (`components.css`) | 164 open / 164 close — balanced |
| Duplicate-`id` scan (`index.html`) | 0 duplicates |
| Local static server (`python -m http.server`), HTTP status for every touched/related asset (`index.html`, `components.css`, `tokens.css`, `instance.js`, `core.js`, `navigation.js`, `app.js`) | All **200** |

## 11. Browser validation (Step 6/7, Playwright + cached system Chromium)

Ran a Playwright script against the local static server across all 7
required breakpoints (1920×1080, 1600×900, 1440×900, 1366×768, 1024,
768, 390) plus a 200%-zoom pass, clicking through all five member tabs at
each width (opening the mobile drawer below 1024px first). Full machine
output saved to `results.json` in the session scratchpad; screenshots
captured for all five members at 1440×900 and 390px, plus a scrolled
Priority-card screenshot and a 200%-zoom screenshot.

**Per-member card measurements (`getBoundingClientRect`), all 7 viewports:**
- `bodyOverflowX: false` at every viewport for every member tab — **no
  horizontal overflow anywhere.**
- Card height increases with content length as expected (e.g. at 1440×900:
  Mayurika 168px, Suman/Arun 190px, Rajiv 168px, Paraparan 168px) — no
  member is unnaturally centered or padded with empty space; height stays
  content-driven at every width.
- Card width tracks the available column width at every breakpoint (e.g.
  1013px at 1440px, 311px at 390px) — text reflows, no clipping.

**Text-content assertions** (`document.body.textContent` after clicking
through all five tabs, so hidden-until-clicked panels are still captured):

| String | Expected | Actual |
|---|---|---|
| "does not set salary bands, AXIOM scores, or team structure" | absent | ✅ absent |
| "Not stored here: individual staff names, salary, health data" | absent | ✅ absent |
| "Not stored here: candidate names, contact details, CVs" | absent | ✅ absent |
| "Not stored here: individual staff AXIOM scores, real sales" | absent | ✅ absent |
| "This workbench is not parent-AIOS truth and does not replace" | absent | ✅ absent |
| "Priority Preview" | absent | ✅ absent |
| "Sample/Demo" | absent | ✅ absent |
| "Sample/demo priority only" | absent | ✅ absent |
| "Paraparan's designation is currently unresolved between sources" | present (retained PH Staff Data collapsed-section instance only, §6) | ✅ present |
| "Mayurika looks after staff records" (retained) | present | ✅ present |
| "Suman runs the recruitment pipeline end to end" (retained) | present | ✅ present |
| "Arun owns the KPI and AXIOM system" (retained) | present | ✅ present |
| "Rajiv's workbench covers Admin Manager" (retained) | present | ✅ present |
| "Paraparan — Auditor" (retained) | present | ✅ present |
| "Technical Pilot Classification" (retained) | present | ✅ present |
| "Today's Priorities" (new heading) | present | ✅ present |
| "Today's scheduled items ranked by priority." (new description) | present | ✅ present |

**Priority card, live rendered content** (scrolled screenshot, Mayurika
tab): heading reads "Today's Priorities", sub-text reads "Today's scheduled
items ranked by priority.", ten real scheduled/unscheduled task rows render
below it with `Priority level` badge tooltips — no "sample"/"demo" wording
visible anywhere in the card.

**200% zoom** (1280×800 viewport, `deviceScaleFactor: 2`, `document.body.style.zoom = '2'`):
`bodyOverflowX: false` — no horizontal scroll introduced.

**Console errors** across all 7 viewports: one `404` on the 1920×1080 run
only (favicon request — the page has no `<link rel="icon">`; this is a
pre-existing condition, already documented as unrelated in
`validation/professional-sidebar-and-member-card-width-check-2026-07-20.md`
§18, not introduced by this task). Zero errors referencing `instance.js`,
`components.css`, or any member-header/priority code touched by this task.

## 12. Accessibility (Step 7)

- Member name heading level unchanged (`<h2>` inside `.member-header-info`
  for all five members — no heading levels were touched by this task).
- Role subtitle (`.role-label`) unchanged in markup, only spacing/line-height
  adjusted — still fully readable, same font-size/color tokens.
- Removed paragraphs were deleted as whole elements — no empty accessible
  node (no empty `<p>`, no orphaned `[VERIFY]` badge) left in the DOM (§9).
- Contrast: no color tokens changed anywhere in this task — text/background
  colors are identical to before.
- 200% zoom: confirmed no overflow-x (§11).
- Keyboard navigation: `navigation.js` has zero diff (`git diff --stat --
  web-view/js/navigation.js` empty) — tab/nav keyboard behavior unchanged.

## 13. Regression check (Step 8)

Confirmed via targeted `git diff --stat`, all empty except the three files
in §3:

```
backend/                     — no changes
database/                    — no changes
database/migrations/         — no changes
web-view/js/calendar/core.js — no changes
web-view/js/navigation.js    — no changes
web-view/js/app.js           — no changes
web-view/js/staff-data.js    — no changes
web-view/css/calendar.css    — no changes
web-view/css/base.css        — no changes
web-view/css/tokens.css      — no changes
web-view/css/navigation.css  — no changes
web-view/css/staff-data.css  — no changes
```

All five Calendar instances rendered and were clicked through during the
Playwright pass (§11) with real schedule data displayed — Schedule Summary,
Month/Week/Day view switches, and the Create button all rendered normally in
every screenshot, with zero functional code touched (`instance.js`'s diff is
four string literals only — sort/render logic untouched, confirmed via
`git diff -- web-view/js/calendar/instance.js`, §7). Collapsible tables
(HR/Suman/Arun testing tables, PH Staff Data sections) render unchanged —
confirmed present and expandable in the same Playwright session. Sidebar
navigation and top application header unaffected (`navigation.js`/`app.js`
zero diff).

## 14. Backend / API / Database proof (Step 10)

```
$ git diff -- backend/
(empty)
$ git diff -- database/
(empty)
$ git diff -- database/migrations/
(empty)
```

**Backend changes: NONE. API changes: NONE. Database changes: NONE.
Migration changes: NONE. Business-rule changes: NO.**

## 15. Protected folder

`member-aios/mayurika-hr/staff-data/` remains untracked/untouched throughout
— confirmed via `git status --short` before and after all edits (only the
pre-existing untracked entry, never staged, never opened for modification,
never inspected by any tool call in this task).

## 16. Evidence paths

- Playwright script: session scratchpad `member-bar-check/check.js`
- Raw measurements: session scratchpad `member-bar-check/results.json`
- Screenshots: session scratchpad `member-bar-check/member-{mayurika-hr,
  suman-recruitment,arun-implementation,rajiv-blocked,paraparan}-{1440x900,390}.png`,
  `priority-preview-mayurika-1440.png`, `priority-scrolled.png`,
  `zoom-200-mayurika.png`

(Session scratchpad, not committed to the repository — ephemeral browser
test artifacts, consistent with how prior UI-polish tasks in this repo
handled Playwright evidence, e.g.
`validation/professional-sidebar-and-member-card-width-check-2026-07-20.md`.)

## 17. Known limitations

- Browser evidence was captured against a local static file server
  (`python -m http.server`), not the live Vercel deployment — matches this
  repository's established practice for pre-deploy UI verification (see
  §11 reference to the 2026-07-20 check). Live-URL confirmation happens
  after deploy, per the handover doc.
- `.member-header-note` CSS rule is now unused in `index.html` (all four
  members that had one had their note fully removed) but was intentionally
  left in `components.css` as a harmless, reusable shared class rather than
  deleted — no visual or functional effect either way.

## 18. Overall result

**PASS.** All ten approved sentence/paragraph removals applied exactly as
specified, no unrelated text touched, all five member cards show visibly
improved vertical spacing (~27% more card padding) with no excessive empty
area, one shared CSS rule drives all five cards, Paraparan remains labelled
"Auditor", Calendar remains directly below the member bar on every tab,
all responsive widths (1920 down to 390) and 200% zoom pass with zero
horizontal overflow, backend/API/database/migrations are unchanged, and the
protected staff-data folder was never touched.

# HR Schedule Pilot — Role Desk Calendar UI Match Check (2026-07-07)

## 1. Requirement

Deeply compare `web-view/index.html` with the uploaded/sample UI reference file `aios_role_desk_views.html`, and align the "HR Schedule Pilot — Internal Calendar Preview" section in `web-view/index.html` to visually match the "Management Team Schedule — MD Requested View" calendar UI in the sample file. This is a UI-only pass for a non-technical audience: no schedule facts, no source truth, no `[VERIFY]` resolution, no live calendar automation, and no forms/save/edit/API/database wiring.

## 2. Files inspected

- `aios_role_desk_views.html` — uploaded sample, read in full. Focus: the "Management Team Schedule — MD Requested View" section (MD request banner, Month View calendar card with legend and 7-column grid, Priority Queue table, Recurring Templates Register table, Member Schedule Sample table).
- `web-view/index.html` — read in full around the "HR Schedule Pilot — Internal Calendar Preview" section (previously lines ~3510–3799, CSS at ~1745–2107) before editing.
- `validation/hr-schedule-pilot-role-desk-ui-alignment-check-2026-07-06.md` — prior alignment pass, read to understand what had already been borrowed from the sample (banner, legend, card shapes) versus what still didn't match (grid type, table vs. lane layout).

## 3. UI mismatch summary

| Sample (`aios_role_desk_views.html`) | Prior `index.html` (before this pass) | Mismatch |
|---|---|---|
| Month-view calendar, 7-column Sun–Sat grid, 5 weeks | Mon–Fri × Morning/Midday/Afternoon/Follow-up time-slot grid | Wrong grid shape — a weekly time-slot grid, not a month view |
| Compact coloured chips per day cell | `.hr-event-card` blocks styled as small bordered cards, not chip-like | Visually heavier than the sample's compact chips |
| Priority Queue rendered as a `<table>` | "Today's Priority Queue" rendered as 3 coloured lane `<div>`s (High/Medium/Low) | Different component type — cards/lanes instead of a table |
| Recurring Templates Register rendered as a `<table>` | "Recurring Template Reference" rendered as a bulleted `<ul>` with inline repo paths | Different component type; also exposed raw file paths in the visible body text |
| Table-card head with one-line "Why this view" | Header card + banner had multi-line explanatory prose; repo paths shown in italic captions under nearly every card | Too much visible technical explanation and repeated file-path text for a non-technical reader |
| Single evidence/status area | Evidence spread across 4+ separate italic captions plus one "Evidence / source details" block | Technical detail not consolidated; readers had to parse several scattered mentions of `schedules/hr/...` paths |
| No visible calendar toolbar | Non-functional "Today / Week / Priority / Verify Items" toolbar mock | Extra UI chrome with no equivalent in the sample; pure clutter |

## 4. What was changed

In `web-view/index.html`, inside the existing `#tab-mayurika-hr` panel, the "HR Schedule Pilot — Internal Calendar Preview" section (title unchanged) was rebuilt:

1. **Month View calendar** — new `.hr-cal-month` 7-column (Sun–Sat) grid for July 2026 (5 weeks, using the real July 2026 calendar dates), wrapped in a `.hr-table-card` matching the sample's table-card head + "Why this view" pattern. Compact coloured `.hr-cal-chip` elements (amber/purple/green/teal/blue/verify variants) replace the old bordered event cards. The 5 recurring MD-screenshot reference blocks (Merchandising, CST call, Team Leader Review, Technical interviews, Technical sessions) repeat weekly across the grid exactly as documented in `schedules/hr/recurring-templates/md-screenshot-recurring-blocks-reference.md` — unchanged content, new presentation. A single `[VERIFY]` chip appears only on today's date (7 July, marked with the `.today` dot), not repeated weekly, so no fabricated recurring HR task pattern was introduced.
2. **Priority Queue** — rebuilt as a real `<table>` (Priority / Task / Owner / Status columns) inside a `.hr-table-card`, matching the sample's "Priority Queue — Today" table. Same 3 placeholder rows as before (High/Medium/Low), same `[VERIFY]` status, same "Mayurika / HR" owner label.
3. **Recurring Templates Register** — rebuilt as a real `<table>` (Template / Weekday / Time / HR Applicability columns) inside a `.hr-table-card`, matching the sample's "Recurring Templates Register" table. Same 5 recurring blocks as before, each still tagged `[VERIFY]` in the HR Applicability column instead of repo-path captions.
4. **Evidence / Technical Details consolidation** — all repo/file paths and validation-file references (`schedules/hr/mayurika.md`, `schedules/hr/priority-queue.md`, both recurring-template files, both confirmation-request evidence files, all 5 validation-file paths including this one, plus a note pointing at `aios_role_desk_views.html` as the UI reference) are now inside **one** collapsed `<details>` block titled "Evidence / Technical Details" at the bottom of the section. The scattered italic captions that previously repeated these paths under each card were removed.
5. **Non-technical readability** — header/banner copy shortened; a one-line "Next safe action" statement added directly under the checklist so a non-technical reader does not need to open the collapsed evidence section to know what to do next; the non-functional calendar toolbar mock (Today/Week/Priority/Verify Items chips) was removed entirely, since it had no equivalent in the sample and added no information.
6. **CSS** — removed the now-unused weekly-grid/toolbar/lane classes (`.hr-cal-toolbar*`, `.hr-cal-grid-wrap`, `.hr-cal-grid`, `.hr-cal-corner`, `.hr-cal-day-head`, `.hr-cal-slot-label`, `.hr-cal-cell`, `.hr-event-card*`, `.hr-priority-panel/-lanes/-lane*/-card`) and added month-view/table-card classes (`.hr-table-card`, `.hr-table-card-head`, `.hr-table-title-row`, `.hr-table-title`, `.hr-table-num`, `.hr-why-view`, `.hr-cal-month-wrap`, `.hr-cal-month`, `.hr-cal-month-headcell`, `.hr-cal-month-cell`, `.hr-cal-daynum` (+ `.today`), `.hr-cal-chip` (+ amber/purple/green/teal/blue/verify variants)) — mirroring the sample's own class names (`table-card`, `table-title`, `why-view`, `cal-grid`, `cal-chip`, `cal-daynum`) under an `hr-` prefix so they stay scoped to this section only. The media query was updated to reference the new classes.
7. **MD-request banner, header badges, 8-item VERIFY checklist, safety footer** — retained with the same wording/content as the prior pass (only trimmed to remove a repeated repo-path sentence from the header card).

## 5. What was intentionally not changed

- Section title: "HR Schedule Pilot — Internal Calendar Preview" — unchanged.
- Scope: HR-only (Mayurika). No `schedules/members/` folder or Arun/Suman/Rajiv/Varmen schedule files were created.
- Global dashboard navigation (top bar, tab bar, search strip, other tabs) — untouched; edit was confined to the HR Schedule Pilot subsection inside the existing Mayurika HR tab panel.
- The 8-item "Still awaiting confirmation" checklist — same 8 items, same wording, verified byte-for-byte against the pre-edit version (see §7).
- The 5 recurring MD-screenshot blocks and their content (times, categories, named attendees for Wed/Thu sessions kept in the Evidence section, not the visible grid) — unchanged facts, only re-presented as month-view chips instead of weekly event cards.
- The 3 placeholder Priority Queue rows and their `[VERIFY]` status — unchanged content, only re-presented as table rows instead of lane cards.
- No new business facts, staff names, real dates, or real HR tasks were introduced anywhere in the rebuilt section.

## 6. Evidence / source truth preservation check

| Check | Result |
|---|---|
| `evidence/source-register.md` diff | None (`git diff --stat` empty) |
| `CLAUDE.md` diff | None (`git diff --stat` empty) |
| `context/verify-register.md` diff | None (`git diff --stat` empty) |
| `schedules/hr/` diff | None (`git diff --stat` empty) |
| Any `[VERIFY]` item resolved | NO — all 8 checklist items diffed byte-identical old vs. new (see §7); recurring blocks and priority rows still tagged `[VERIFY]` |
| Total `[VERIFY]` token count | 69 (before) → 76 (after) — increased only because table cells now carry explicit `[VERIFY]` tags per row/column instead of one shared caption; none removed |
| New business facts added | NO — same placeholder bracket text (`[HR task pending confirmation]`, `[NSLP follow-up placeholder]`, `[Documentation / reporting placeholder]`); same 5 recurring block names/times; no real staff, candidate, salary, health, PDPA, or disciplinary data added |

## 7. 8-item VERIFY checklist diff (old vs. new)

```
diff <(git show HEAD:web-view/index.html | grep -A12 "Before this becomes ACTIVE\|Still awaiting confirmation before this becomes ACTIVE" | grep "<li>") \
     <(grep -A12 "Still awaiting confirmation before this becomes ACTIVE" web-view/index.html | grep "<li>")
```

Result: **no output** — the 8 `<li>` lines (priority scale, HR schedule categories, recurring-block ownership, interview/session scheduling ownership, CST meaning, durations, edit rights, replace-or-parallel schedule rule) are identical before and after this pass. Only the panel heading text changed cosmetically ("Before this becomes ACTIVE, confirm:" → "Still awaiting confirmation before this becomes ACTIVE:") — the list content itself did not change.

## 8. Non-technical user readability check

The visible screen (without opening the collapsed "Evidence / Technical Details" section) now answers all 5 required questions:

| Question | Where answered |
|---|---|
| What is scheduled? | Month View calendar grid + Recurring Templates Register table |
| What priority is it? | Priority Queue table (Priority column: High/Medium/Low) |
| Who owns it? | Priority Queue table (Owner column: "Mayurika / HR") |
| What is still awaiting confirmation? | "Still awaiting confirmation" checklist panel + `[VERIFY]` tags visible directly in the calendar chips and both tables |
| What is the next safe action? | New one-line "Next safe action" statement directly below the checklist |

Technical items removed from the visible body and moved into the single collapsed section: all `schedules/hr/...` paths, all `evidence/stakeholder-confirmations/...` paths, all `validation/...` paths, and the named Wednesday/Thursday attendee lists (Saranya/Kajith/Pirija/Kayal; Vithusali/Dilaxshan/Mithula/Sakithiya/Gishor) — these remain available on request but no longer clutter the main view.

## 9. Blocked files untouched check

`git diff --stat` run individually against each blocked path returned no output for: `evidence/source-register.md`, `CLAUDE.md`, `context/verify-register.md`, `schedules/hr/`. Not opened or referenced for editing: `member-aios/`, `intelligence-inbox/raw-stakeholder-documents/`, `HR.Mayu.Skill.md`, NSLP files, Arun files, Suman files, BLOS files, thresholds files, KPI/AXIOM files. No PostgreSQL objects or production database connections exist in this static-HTML-only change.

`git status --short` after all edits showed exactly the four expected files: `web-view/index.html` (modified), `validation/web-view-html-dashboard-check.md` (modified), `handover/2026-06-30__web-view-dashboard-closure.md` (modified), and this new validation file (untracked, being created).

## 10. Dashboard safety scan

Grep run against `web-view/index.html` for forbidden tokens:

```
fetch(  XMLHttpRequest  axios  WebSocket  googleapis  calendar.google  <form  onsubmit  localStorage  sessionStorage  indexedDB
```

Result: **zero matches**. No forms, save buttons, edit buttons, APIs, or database connections were added. The dashboard remains static HTML/CSS with a read-only, non-interactive calendar preview.

## 11. PASS / AMBER result

**PASS** — the HR Schedule Pilot calendar now visually follows the Role Desk sample's structure card-for-card: month-view calendar (7-column Sun–Sat grid, coloured chips, legend), a table-based Priority Queue, and a table-based Recurring Templates Register, with all technical source/validation paths consolidated into one collapsed "Evidence / Technical Details" section. HR-only scope, all 8 `[VERIFY]` items, and read-only/static safety are fully preserved; no schedule facts or source truth were changed.

**AMBER remains** on the underlying HR Schedule Pilot content until Mayurika and Varmen visually sign off and answer the 8 open HR schedule questions. This UI-matching pass does not resolve any `[VERIFY]` item.

## 12. Next step

Route this month-view-matched section to Mayurika and Varmen for visual sign-off alongside the still-open 8-item confirmation request (`evidence/stakeholder-confirmations/hr-schedule-pilot-confirmation-request-2026-07-06.md`). Do not expand to the full Management Team schedule, create `schedules/members/`, or wire any live calendar connection until that confirmation is received and separately approved.

---
name: dashboard-skills-register-next-build-choice-2026-07-02
type: stakeholder-confirmation
date: 2026-07-02
request-source: User (Varmen unavailable)
build-choice: Skills Register Preview — next safe PASS section after Document Register
status: SAFE NEXT BUILD — Skills Register Preview selected
---

# Dashboard Build Choice — Skills Register Preview

**Date:** 2026-07-02
**Request source:** User — "next build skills, varmen is busy"

Varmen is unavailable. The user chose to continue with the next safe PASS section from the approved build order. The next safe section after Document Register is Skills / Skill Commands.

---

## Source Basis

| File | Role |
|---|---|
| `evidence/dashboard-discovery/varmen-draft-dashboard-table-data-requirements-2026-07-02.md` | TASK 2 — Skills section: PASS for skill names, tiers, statuses, source paths; AMBER for usage counts |
| `validation/varmen-draft-dashboard-data-requirements-check.md` | Confirmed PASS/AMBER split for Skills; usage counts have no confirmed tracking source |

---

## Build Scope — Approved

| Approved | Detail |
|---|---|
| Skill names | YES — from real `skills/` folder files only |
| Tier labels | YES — from skill file frontmatter |
| Purpose descriptions | YES — from skill file content |
| Owner / domain | YES — from skill file frontmatter |
| Status | YES — from skill file frontmatter |
| Source paths | YES — verified repository file paths |
| Known limits | YES — from skill file pass/fail rules |

## Build Scope — Excluded

| Excluded | Reason |
|---|---|
| Usage counts | AMBER — no confirmed usage-tracking source exists in the repository. Varmen draft counts (41, 89, 14, 9, 6, 18) are not real data. Not shown. |
| Individual staff usage | Not shown — would require personal HR data |
| Invented skill commands | Not created — only real `skills/` folder files used |
| Slash command names not in `skills/` folder | Not shown — no `/team-brief`, `/onboarding-checklist`, `/escalation-router`, `/recurring-issue-log`, `/policy-gap-check`, `/review-prep` exist as files |

---

## Real Skill Files Confirmed in `skills/` Folder

| File | Tier | Status |
|---|---|---|
| `skills/management-gap-detection.md` | 1 | DRAFT — Foundation Draft v0.1 — Updated 2026-06-25 |
| `skills/kpi-axiom-review-support.md` | 1 | DRAFT — Foundation Draft v0.1 — Updated 2026-06-25 |
| `skills/policy-lookup.md` | 1 | DRAFT — Foundation Draft v0.1 |
| `skills/recruitment-quality-check.md` | 1 | DRAFT — Foundation Draft v0.1 — Updated 2026-06-25 |
| `skills/management-problem-analysis.md` | 2 | DRAFT — Foundation Draft v0.1 — Pending Varmen Review |

**Note:** `skills/README.md` exists and confirms this folder is skeleton-only until context layer is approved. All 5 skill files were built after the context layer foundation was established.

---

## Boundary Confirmation

- Build only read-only skill metadata — CONFIRMED
- Do not show usage counts unless a real usage-tracking source exists — CONFIRMED (no source exists; usage counts hidden)
- Do not use Varmen draft usage counts (41, 89, 14, 9, 6, 18) — CONFIRMED (not used)
- Do not include individual staff usage — CONFIRMED
- Do not create new skills — CONFIRMED (no new skills invented)

---

## Sensitivity Check

| Category | Present? |
|---|---|
| Staff names, leave records, salary, health, PDPA, candidate, disciplinary data | NOT PRESENT |
| Individual KPI scores or AXIOM bands by name | NOT PRESENT |
| Team Table, Leave Requests, Onboarding Tracker, KPI Schedule, Decisions tables | NOT BUILT |
| Attendance Dashboard | NOT ADDED |

---

## Status

**SAFE NEXT BUILD — Skills Register Preview selected.**

Evidence path: `evidence/stakeholder-confirmations/dashboard-skills-register-next-build-choice-2026-07-02.md`
Validation path: `validation/dashboard-skills-register-preview-build-check.md`

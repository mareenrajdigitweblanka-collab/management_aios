---
name: mayurika-hr-tables-md-review-pending-removal-request
type: stakeholder-confirmation
created: 2026-07-07
reported-by: user (Mareenraj)
stakeholder-referenced: Mayurika
status: USER_REPORTED_MAYURIKA_INSTRUCTION — MD_CONFIRMATION_PENDING — VARMEN_CONFIRMATION_PENDING — NOT_REGISTERED_IN_SOURCE_REGISTER
---

# Mayurika HR Tables — MD Review Pending / Removal Request (2026-07-07)

## Title

User-relayed instruction: remove unapproved HR table previews from the Mayurika HR tab pending MD/Varmen confirmation of table format.

## Date

2026-07-07

## Reported By

User (Mareenraj)

## Stakeholder Referenced

Mayurika (HR Officer)

## Instruction Captured

> "In HR tab now we do not need any tables. Mayurika will create tables and send to MD. After MD confirms, MD or Varmen will give the HR tables back for AIOS/dashboard use."

## Status

| Flag | Value |
|---|---|
| Instruction source | USER_REPORTED_MAYURIKA_INSTRUCTION |
| MD confirmation | MD_CONFIRMATION_PENDING |
| Varmen confirmation | VARMEN_CONFIRMATION_PENDING |
| Source register status | NOT_REGISTERED_IN_SOURCE_REGISTER |

## Operational Meaning

- Remove/hide unnecessary HR table previews from `web-view/index.html`.
- Do not create replacement HR tables or invent any HR table structure, column set, or format.
- Future HR tables must come from an MD/Varmen-confirmed source before being added back to the dashboard.
- This note supersedes the wording basis of the prior 2026-07-06 pending-note (`evidence/stakeholder-confirmations/mayurika-hr-tables-future-format-update-2026-07-06.md`), which described the state as "pending Mayurika input" only. This note adds the additional MD/Varmen confirmation step now reported by the user.

## Known Limits

- This is a user-reported instruction, not a registered source ID. It is not listed in `evidence/source-register.md` and must not be cited as a registered source.
- Do not use this note to define, infer, or imply any HR table content, column names, or structure.
- This note does not resolve any `[VERIFY]` item in `context/verify-register.md`.
- This note does not grant Mayurika, MD, or Varmen any authority beyond what is already defined in CLAUDE.md.

## Pass/Fail Rule

**PASS** if the Mayurika HR tab in `web-view/index.html` no longer shows any unapproved HR table preview that implies a final or usable HR table structure, and instead shows a simple, non-technical placeholder notice stating that HR tables are pending MD/Varmen confirmation.

**FAIL** if any new HR table structure, column set, or format is invented or implied anywhere in the dashboard as a result of this change.

## Related Files

- `web-view/index.html` — Mayurika HR tab, "Mayurika HR Tables" section (placeholder notice updated)
- `validation/mayurika-hr-tab-table-removal-check-2026-07-07.md` — validation for this change
- `validation/web-view-html-dashboard-check.md` — dashboard validation log (new section appended)
- `handover/2026-06-30__web-view-dashboard-closure.md` — closure log (new record appended)
- Prior related evidence: `evidence/stakeholder-confirmations/mayurika-hr-tables-future-format-update-2026-07-06.md`, `validation/mayurika-hr-tables-preview-removal-check.md`

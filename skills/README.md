# skills/ — Approved Skill Files

## Status

SKELETON ONLY — stakeholder data pending

## Source

Management_AIOS_Architecture.md

## Owner / Reviewer

Intern builds; Varmen validates

---

## Purpose

This folder will hold approved skill files that define specific AI-assisted management capabilities. Skills encode repeatable actions, workflows, or decision-support logic. No skill files should be created until the context layer has been verified and approved.

---

## What Belongs Here

- Approved skill definition files, added only after:
  1. Stakeholder interviews are complete.
  2. Context files in `../context/` are verified and approved by Varmen.
  3. Each skill is explicitly scoped and authorised.

## What Must NOT Be Stored Here Yet

- Any skill implementation files.
- Skill logic derived from unverified stakeholder data.
- Automation scripts or integration connectors.
- Any file other than this README.

---

## Evidence / Validation Note

No skill files should exist in this folder at skeleton stage. Each future skill file must reference an approved context source and a validation record in `../evidence/` and `../validation/`.

---

## Next Step

Wait for context layer approval. Then define skills only as directed by Varmen after context files are validated.

---

## Pass/Fail Rule

PASS: Folder exists with this README only; no skill implementation files created.

FAIL: Any skill file (beyond this README) exists before context layer is verified and Varmen has authorised skill creation.

---

## Known Limits

- This folder is empty by design at skeleton stage.
- No skill logic should be inferred or invented.
- No connections to live tools (Gmail, Calendar, Drive, n8n, HR systems, Sheets, databases) are implied or permitted at this stage.

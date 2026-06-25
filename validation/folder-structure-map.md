---
audit: folder-structure-map
date: 2026-06-25
mode: read-only
---

# Management AIOS Folder Structure Map

## Status
PASS

---

## Folder Tree Checked

### intelligence-inbox/
```
intelligence-inbox/
  README.md
  recurring-issues/
    README.md
  stakeholder-interview-notes/
    README.md
    varmen-2026-06-22.md
  raw-stakeholder-documents/
    admin-manager/                  [EMPTY FOLDER — SRC-ADMIN-001 PENDING]
    arun-implementation/
      KPI Definitions, AXIOM Band Placement, Review Input_Output & Management Tracking Framework.md
      my day check list-arun - shedule.csv
    company-policy/
      Draft DIGIT WEB LANKA - Company Policy Manual.md
    mayurika-hr/
      HR.Mayu.Skill.md
      digitweb_org_chart.jpg
    md-discussion-notes/
      MD & HR Discussion Notes.md
      MD & Suman Discussions Notes.md
    suman-recruitment/
      Recruitment_Quality_Control_Process.md
      archive/
        Recruitment_Quality_Control_Process.docx
      historical-action-data/
        On Boarding - Gaps in 7 days trainning.csv
        suman-7-day-training-gap-action-data-2026-06-25.md
  management-action-records/
    README.md
    INDEX.md
    templates/
      md-discussion-note-template.md
      problem-solution-action-record-template.md
    mayurika-hr/
      README.md
    arun-implementation/
      README.md
    rajiv-admin-manager/
      README.md
    suman-recruitment/
      README.md
```

### context/
```
context/
  README.md
  confidentiality-rules.md
  hr-operations-context.md
  kpi-axiom-context.md
  management-action-records-context.md
  management-aios-purpose.md
  organization-structure.md
  recruitment-context.md
  verify-register.md
```

Note: `organization-structure.md` was found in the folder scan but was not in the original required reading list. It has not been read as part of this audit — flagged for awareness below.

### evidence/
```
evidence/
  README.md
  source-register.md
  stakeholder-confirmations/
    suman-line-manager-typing-correction-2026-06-25.md
```

### skills/
```
skills/
  README.md
  kpi-axiom-review-support.md
  management-gap-detection.md
  management-problem-analysis.md
  policy-lookup.md
  recruitment-quality-check.md
```

### .claude/skills/
```
.claude/skills/
  kpi-axiom-review-support/
    SKILL.md
  management-gap-detection/
    SKILL.md
  management-problem-analysis/
    SKILL.md
  policy-lookup/
    SKILL.md
  recruitment-quality-check/
    SKILL.md
```

All 5 skill wrappers present. No missing wrappers.

### validation/
```
validation/
  README.md
  claude-code-skill-wrapper-check.md
  claude-source-map.md
  claude-v0.1-quality-gate.md
  context-files-source-map.md
  management-action-records-folder-check.md
  management-action-records-integration-check.md
  management-action-records-skill-impact-check.md
  management-action-records-varmen-final-review-pack.md
  management-problem-analysis-action-records-update-report.md
  management-problem-analysis-readiness.md
  management-problem-analysis-skill-plan.md
  management-problem-analysis-source-map.md
  management-problem-analysis-wrapper-check.md
  md-discussion-conflict-check.md
  md-discussion-impact-map.md
  md-discussion-skill-impact-check.md
  md-discussion-source-ingestion-check.md
  md-discussion-varmen-review-status-update.md
  pending-admin-manager-gaps.md
  pending-md-discussion-source-plan.md
  policy-conflict-check.md
  policy-source-ingestion-check.md
  policy-update-impact-report.md
  raw-source-readiness-check.md
  suman-002-skill-impact-update-report.md
  suman-7-day-training-gap-raw-source-check.md
  suman-line-manager-correction-impact-report.md
  suman-source-format-update.md
  tier-1-md-discussion-skill-update-report.md
  tier-1-skill-draft-readiness.md
  tier-1-skill-draft-source-map.md
  tier-1-wrapper-md-update-report.md
  skill-test-runs/
    kpi-axiom-review-support-md-scope-test-001.md
    kpi-axiom-review-support-test-2026-06-23.md
    management-gap-detection-md-scope-test-001.md
    management-gap-detection-test-2026-06-23.md
    management-gap-detection-test-2026-06-25.md
    management-problem-analysis-action-records-wrapper-test.md
    management-problem-analysis-dry-run-summary.md
    management-problem-analysis-suman-002-test.md
    management-problem-analysis-test-001.md
    management-problem-analysis-test-002.md
    management-problem-analysis-test-003.md
    management-problem-analysis-test-004.md
    policy-lookup-md-boundary-test-001.md
    policy-lookup-test-2026-06-23.md
    recruitment-quality-check-md-scope-test-001.md
    recruitment-quality-check-suman-002-test.md
    recruitment-quality-check-test-2026-06-23.md
    suman-002-wrapper-dry-run-summary.md
```

### handover/
```
handover/
  README.md
  2026-06-23-closure.md
  management-action-records-team-usage-guide.md
```

---

## Expected Key Folders — Existence Check

| Folder | Exists? | Notes |
|---|---|---|
| intelligence-inbox/raw-stakeholder-documents/ | YES | Contains all expected subfolder types |
| intelligence-inbox/raw-stakeholder-documents/md-discussion-notes/ | YES | Contains SRC-MD-HR-001 and SRC-MD-SUMAN-001 source files |
| intelligence-inbox/raw-stakeholder-documents/suman-recruitment/ | YES | Contains Recruitment_Quality_Control_Process.md, archive, historical-action-data |
| intelligence-inbox/raw-stakeholder-documents/suman-recruitment/historical-action-data/ | YES | Contains CSV and source note for SRC-SUMAN-002 |
| intelligence-inbox/management-action-records/ | YES | Contains README, INDEX, templates, person subfolders |
| intelligence-inbox/management-action-records/templates/ | YES | Contains both template files |
| intelligence-inbox/management-action-records/mayurika-hr/ | YES | Contains README only — no action records filed yet |
| intelligence-inbox/management-action-records/arun-implementation/ | YES | Contains README only — no action records filed yet |
| intelligence-inbox/management-action-records/rajiv-admin-manager/ | YES | Contains README only — no action records filed yet |
| intelligence-inbox/management-action-records/suman-recruitment/ | YES | Contains README only — no action records filed yet |
| context/ | YES | 9 files including organization-structure.md (not in required list) |
| evidence/ | YES | Contains source-register.md and stakeholder-confirmations subfolder |
| skills/ | YES | 5 skill files present |
| .claude/skills/ | YES | 5 wrapper SKILL.md files present |
| validation/ | YES | 30+ files present |
| validation/skill-test-runs/ | YES | 18 test run files present |
| handover/ | YES | 3 files present |

---

## Missing Folders

None. All expected folders are present.

Note: `intelligence-inbox/raw-stakeholder-documents/admin-manager/` exists as an empty folder awaiting SRC-ADMIN-001 documents. This is the expected state per source-register.md and CLAUDE.md §14 [VERIFY] items 1–5.

---

## Unexpected Folders

- `intelligence-inbox/recurring-issues/` — contains a README only; not in the original expected folder list but not a structural concern. Folder is empty of active content.
- `handover/` — folder was confirmed to exist and is populated, not empty.

---

## Observations on context/organization-structure.md

A file `context/organization-structure.md` was found during folder scan but was not included in the audit read list. It has not been read as part of this audit. Its existence is flagged for awareness. It should be reviewed in a follow-up to confirm it is source-backed, correctly tagged, and consistent with CLAUDE.md §3 organisation structure claims.

---

## Notes

- All four management-action-records person subfolders (mayurika-hr, arun-implementation, rajiv-admin-manager, suman-recruitment) currently contain only README files — no actual action records have been filed yet. This is expected at this stage; the infrastructure is in place.
- The SRC-SUMAN-001-v1 archive file (.docx) is correctly stored in `intelligence-inbox/raw-stakeholder-documents/suman-recruitment/archive/` and is correctly marked SUPERSEDED in the source register.
- The `admin-manager/` folder is confirmed empty by direct folder listing — no files exist inside it yet.

---

## Pass/Fail Rationale

PASS. All expected folders exist. No required folder is missing. All key source files are in their registered locations. Management action records person subfolders exist and are correctly structured (README-only at this stage is expected). The one observation noted (organization-structure.md) is a minor gap in the audit read list, not a structural failure.

# Management AIOS — Announcement & Notification Feature (Phase 1)

**Requirement ID:** REQ-ANN-001
**Project Name:** Management AIOS Announcement & Notification Feature
**Start Date:** 2026-08-12
**Expected Deadline:** 2026-08-12 (Phase-1 MVP, single-session target)
**User / Stakeholder:** Management AIOS authenticated members (Mayurika, Suman, Arun, Rajiv, Paraparan)
**Company Value Contribution:** Replaces repeated one-to-one verbal/text management instructions with a permanent, centralized, queryable announcement history plus targeted `@mention` notifications — directly supports CLAUDE.md §11.1 (LLM-Queryable Documentation Standard) and the management-file-and-decision-disorganization problem area (CLAUDE.md §1).
**MVP Submission Date:** 2026-08-12
**Project Owner:** Mareenraj (build), Varmen (business sponsor)
**Status:** Implemented — backend + frontend + tests complete; **live database migration EXECUTED** (2026-08-12, manually by the user/admin against `order_management_copy`; live schema verified matching this design read-only — see `validation/announcement-notification-migration-execution-check-2026-08-12.md`). Production UI acceptance is pending user check post-deployment.

Source basis: Phase-1 discovery report (2026-08-12, this session) plus the corrected architecture and confirmed business rules supplied directly by the user in the Phase-1 build prompt (2026-08-12) — treated as an explicit, task-scoped stakeholder instruction (equivalent evidentiary weight to a registered source for this feature's own internal decisions; does not itself register a new Source ID in `evidence/source-register.md`).

---

## 1. Business Requirement

Any authenticated Management AIOS member can create an announcement, save it as a Draft, edit/delete their own Draft, and publish it. Once published, an announcement is permanently visible to every authenticated member and can never be edited or deleted by anyone. The creator may optionally `@mention` one or more authenticated members at Draft time; mentioned members receive a persistent, per-user notification (bell icon + dropdown) only once the announcement is published, with independent read/unread state per mentioned member.

## 2. Scope — Phase 1 (MUST HAVE)

- Draft lifecycle: create, reopen, edit (title/body/mentions), delete (soft delete, own Drafts only), publish.
- Published lifecycle: permanent, immutable, visible to all authenticated members, appears in Announcement History.
- `@mention`: zero, one, or multiple members selected from the existing authenticated-member registry; controls notification targeting only, never visibility.
- Notification: bell + unread badge + dropdown in the topbar; lightweight polling (~30s) while authenticated, plus refresh on key interactions.
- Read receipts: creator-only view of which mentioned members have read a published announcement.
- No priority levels, no attachments, no scheduling (explicitly deferred).

## 3. Existing Auth / Member Source (reused, not reinvented)

- `backend/config.py` `MEMBER_DIRECTORY` / `VALID_MEMBER_KEYS` — the 5 canonical `member_key`s.
- `backend/routers/calendar_auth.py` `get_verified_member` — the existing Calendar Bearer-token dependency, reused verbatim on every Announcement route.
- Frontend: `web-view/js/member-registry.js` (display), `web-view/js/auth-gate.js` (protected-tab gate).
- No second member/user registry and no DB-level hard-coded member-key `CHECK` constraint are introduced — see §6 of the technical design.

## 4. Draft Lifecycle

Create → Save Draft → Reopen → Edit title/body/mentions → Delete (soft, creator-only, confirmation required) → Publish. Drafts are private to their creator; a non-owner request for another member's Draft receives the same non-disclosing 404 shape already established by `StaffReviewSummary`'s owner-only routes.

## 5. Publish Permanence

Publishing is a one-way transition. Once `status='Published'`: no edit route, no delete route, no re-publish route, and no mention-change route can ever target that record — enforced structurally at the database-query layer, not by hiding frontend buttons (see technical design §5).

## 6. Visibility vs. Mention Distinction

`Published visibility = all authenticated members`, unconditionally. `@mention = notification target only`. An unmentioned member sees the same Published announcement in history with no notification and no read-receipt row.

## 7. Notification / Read-State Model

Draft mention rows exist before Publish (so mention selections persist across Draft edits) but are never notifications. Publish stamps `notified_at` on the Draft's existing mention rows, which is what makes them eligible for the bell feed. `read_at` (nullable) is the per-member read/unread signal, mirroring `member_leave_records`' existing "nullable column is the lifecycle signal" convention.

## 8. Known Limits (Phase 1)

- No priority, attachments, or scheduled announcements (Phase 2 candidates only).
- No email/WhatsApp/push delivery — in-app bell only.
- No audit-log table for Announcements (Phase 1 simplification — `created_at`/`published_at`/`read_at` already answer who/what/when; see technical design §3 for the rationale).
- Self-mention is allowed and generates a notification like any other mention (explicit Phase-1 decision — no suppression).

## 9. Next Step

`database/migrations/2026-08-12-create-announcements.sql` has been applied manually by the user/admin against the live Management AIOS PostgreSQL database (`order_management_copy` / `management_aios` schema); the migration file itself was never executed by Claude Code (see `validation/announcement-notification-migration-execution-check-2026-08-12.md` for the read-only live-verification evidence). Remaining next step: user production UI acceptance check post-push (see `validation/announcement-notification-phase1-check-2026-08-12.md`).

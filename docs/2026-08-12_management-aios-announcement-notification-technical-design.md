# Management AIOS — Announcement & Notification Feature — Technical Design (REQ-ANN-001)

**Status:** Implemented (backend + frontend + tests). Live migration executed (2026-08-12, manually by the user/admin) — see §9.
**Pass/Fail Rule:** PASS requires — (a) a Published announcement can never be edited/deleted/re-published/re-mentioned via any direct API call, verified by dedicated tests; (b) Draft mentions never appear in any member's notification feed before Publish; (c) one member's read action never mutates another member's read state; (d) no second member registry and no DB-level member-key allowlist are introduced. All four are covered by `backend/tests/test_announcements.py` (see validation report for results).

---

## 1. Reused Infrastructure (no duplication)

| Concern | Reused From | Notes |
|---|---|---|
| Member identity / auth | `backend/config.py` `MEMBER_DIRECTORY`, `VALID_MEMBER_KEYS`; `backend/routers/calendar_auth.py` `get_verified_member` | Verbatim reuse — no second token type, no new login system |
| Owner-only mutate / non-disclosing 404 pattern | `backend/routers/staff_review_summaries.py` `_get_owned_summary_or_404` | Adapted for Draft ownership |
| Soft-delete convention | `member_leave_records` / `member_schedule_events` (`deleted_at`/`deleted_by`, no mandatory reason) | Applied to Draft delete only |
| CRUD/router shape, JSONResponse error bodies, idempotency-guard-before-mutate | `backend/routers/knowledge_documents.py` | Structural template for `announcements.py` |
| Frontend auth gate | `web-view/js/auth-gate.js` `PROTECTED_TABS`/`isAuthenticated`/`buildAuthRequiredNotice` | `'announcements'` added to `PROTECTED_TABS` |
| Frontend member display | `web-view/js/member-registry.js` `MEMBER_REGISTRY` | No new registry |
| Frontend destructive confirm | `web-view/js/ui/dialog.js` `confirmDestructive` | Delete Draft |
| Frontend transient feedback | `web-view/js/ui/toast.js` `showToast` | Save/Publish/Delete outcomes |
| Frontend focus trap / scroll lock | `web-view/js/ui/popup.js`, `web-view/js/ui/scroll-lock.js` | Draft editor modal, bell dropdown |

## 2. Data Model

### `management_aios.announcements`

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` |
| title | VARCHAR(200) NOT NULL | trimmed, non-blank |
| body | TEXT NOT NULL | trimmed, non-blank, ≤10,000 chars (mirrors `staff_review_summaries_summary_text_max_length_check`) |
| status | VARCHAR(20) NOT NULL DEFAULT 'Draft' | CHECK IN ('Draft','Published') |
| created_by | VARCHAR(80) NOT NULL | server-derived only |
| created_at / updated_at | TIMESTAMPTZ NOT NULL DEFAULT now() | |
| published_at | TIMESTAMPTZ NULL | paired CHECK with status |
| deleted_at / deleted_by | TIMESTAMPTZ / VARCHAR(80) NULL | Draft-only soft delete; paired CHECK; CHECK `deleted_at IS NULL OR status='Draft'` |

### `management_aios.announcement_mentions`

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` |
| announcement_id | UUID NOT NULL FK → announcements(id) | |
| mentioned_member_key | VARCHAR(80) NOT NULL | **no DB CHECK against a hard-coded member list** — see §6 |
| created_at | TIMESTAMPTZ NOT NULL DEFAULT now() | mention-selection time (Draft or Publish-time addition) |
| notified_at | TIMESTAMPTZ NULL | set only at Publish; NULL = not yet a notification |
| read_at | TIMESTAMPTZ NULL | NULL = unread; sole read/unread signal |

`UNIQUE (announcement_id, mentioned_member_key)`.

## 3. How Draft Mentions Persist Before Publish (mandatory architecture correction applied)

`announcement_mentions` is the single table for both Draft mention selections and Published notifications — there is no separate "notifications" table and no "convert Draft mentions into notifications by copying rows" step. A Draft's mention set is edited by reconciling `announcement_mentions` rows for that `announcement_id` (insert newly-added `member_key`s, delete removed ones) inside the same transaction as the title/body update — `notified_at`/`read_at` stay NULL throughout. Publish does not insert new mention rows; it only stamps `notified_at = now()` on the rows that already exist. Every notification-facing query (`unread-count`, `mentions` feed) filters `announcements.status = 'Published' AND announcement_mentions.notified_at IS NOT NULL`, so a Draft's mention rows are structurally invisible to the bell regardless of how long the Draft sits unpublished.

No audit-log table is introduced for Announcements (Phase-1 simplification, unlike `knowledge_document_audit_log`) — Announcements are append-only from a business-content perspective (Draft edits are never externally visible; Published is immutable), so `created_at`/`updated_at`/`published_at`/`read_at` already answer every "who/what/when" question in §35 of the discovery report without a second log table.

## 4. Member-Truth Reuse (no duplication — mandatory correction applied)

- `announcement_mentions.mentioned_member_key` and `announcements.created_by` are plain `VARCHAR`, **not** constrained by a database `CHECK (... IN ('mayurika', ...))`.
- All membership validation happens in `backend/routers/announcements.py` against `backend.config.VALID_MEMBER_KEYS` at request time — the single source of truth already used by every other module.
- Frontend display labels come from `member-registry.js` `MEMBER_REGISTRY` only.
- No new users/members table, no second registry, anywhere.

## 5. Published Immutability Enforcement

`_get_owned_draft_or_404(db, id, acting_member)` — the only lookup helper backing PATCH/DELETE/mentions-edit/publish — filters `status = 'Draft' AND created_by = acting_member AND deleted_at IS NULL` **in the query itself**. A Published (or non-owned, or already-deleted) id is invisible to these routes and returns a plain 404, never a 409 that would confirm existence to a non-owner. This makes mutating a Published record structurally impossible through the API, not merely conditionally rejected. Covered directly by `test_published_cannot_be_edited_deleted_or_republished` and related tests in `backend/tests/test_announcements.py`.

## 6. Self-Mention

Allowed, no suppression — a self-mention behaves exactly like any other mention (creates a `notified_at`-stamped row at Publish, appears in the creator's own bell feed).

## 7. Notification Refresh

Frontend polls `GET /api/announcements/mentions/unread-count` every 30 seconds while `isAuthenticated()` is true and the document is visible (`document.visibilityState === 'visible'`), using a single `setInterval` guarded against duplicate timers, cleared on `CALENDAR_AUTH_CHANGED_EVENT` (auth loss). Also refreshed immediately on: initial authenticated app load, bell open, after a successful mark-read, after a successful publish by the current member, and on Announcements-tab activation. No WebSocket/SSE — none exists anywhere else in this codebase.

## 8. API Surface

See the Final Report (§G) delivered with this implementation for the exact route table as built — it matches the discovery report's §L contract with the Draft-mentions correction from §3 above folded in (mentions are edited via the Draft PATCH route's `mention_member_keys` field, reconciled against `announcement_mentions`, not a separate endpoint).

## 9. Migration

`database/migrations/2026-08-12-create-announcements.sql` — **written and executed**. Per explicit instruction, live PostgreSQL migration execution was reserved for the user, and was carried out manually by the user/admin on 2026-08-12 against `order_management_copy` / `management_aios` (Claude Code never executed this file). Live read-only verification after execution confirmed both tables, all columns, all constraints, and all indexes match this design exactly, with 0 rows in either table. See `validation/announcement-notification-migration-execution-check-2026-08-12.md` for full evidence.

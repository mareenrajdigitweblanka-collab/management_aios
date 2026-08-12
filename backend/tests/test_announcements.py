"""HTTP-level tests for the Announcement & Notification backend API
(REQ-ANN-001).

Uses fastapi.testclient.TestClient against the real app (backend.main.app),
with get_db overridden to an isolated, in-memory SQLite database per test —
same convention as test_knowledge_documents.py / test_staff_review_summaries.py.
No test in this file ever connects to order_management_copy or any other
real PostgreSQL database, and no live migration is executed by this file —
Base.metadata.create_all(engine) (calendar_auth_test_support.py) builds the
schema fresh, in-memory, per test.

Run with: python -m unittest backend.tests.test_announcements
"""

import unittest
import uuid
from datetime import datetime, timezone

from fastapi.testclient import TestClient

from backend.database import get_db
from backend.main import app
from backend.models import Announcement, AnnouncementMention
from backend.tests.calendar_auth_test_support import (
    bearer_header,
    make_sqlite_engine_and_session_factory,
    patched_calendar_auth_env,
)

BASE = "/api/announcements"


class AnnouncementsTestCase(unittest.TestCase):
    """Fresh, isolated in-memory SQLite database per test method — no
    cross-test data leakage, no shared state, no real network connection,
    and no production row is ever created by this file."""

    def setUp(self):
        self.engine, self.SessionLocal = make_sqlite_engine_and_session_factory()

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.env_ctx = patched_calendar_auth_env(include_md=True)
        self.env_ctx.__enter__()
        self.client_ctx = TestClient(app)
        self.client = self.client_ctx.__enter__()

    def tearDown(self):
        self.client_ctx.__exit__(None, None, None)
        self.env_ctx.__exit__(None, None, None)
        app.dependency_overrides.clear()
        self.engine.dispose()

    # ── helpers ────────────────────────────────────────────────────────

    def make_session(self):
        return self.SessionLocal()

    @staticmethod
    def _as_uuid(value):
        return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))

    def create_draft(self, member_key, title="Team Leadership Instruction", body="Please review.", mentions=None):
        payload = {"title": title, "body": body, "mention_member_keys": mentions or []}
        resp = self.client.post(BASE, json=payload, headers=bearer_header(member_key))
        self.assertEqual(resp.status_code, 201, resp.text)
        return resp.json()

    def publish(self, member_key, announcement_id):
        return self.client.post(f"{BASE}/{announcement_id}/publish", headers=bearer_header(member_key))

    def get_mention_row(self, announcement_id, member_key):
        session = self.make_session()
        row = (
            session.query(AnnouncementMention)
            .filter(
                AnnouncementMention.announcement_id == self._as_uuid(announcement_id),
                AnnouncementMention.mentioned_member_key == member_key,
            )
            .first()
        )
        if row is not None:
            session.expunge(row)
        session.close()
        return row

    def get_announcement_row(self, announcement_id):
        session = self.make_session()
        row = session.get(Announcement, self._as_uuid(announcement_id))
        if row is not None:
            session.expunge(row)
        session.close()
        return row

    def insert_mention_row(self, announcement_id, member_key, notified_at=None, read_at=None):
        """Directly inserts an AnnouncementMention row via the ORM,
        bypassing the API's _reject_self_mention guard entirely — used
        only to simulate a historical self-mention row that predates the
        Stage A rule change (REQ-ANN-001 Stage A §5/§6/§7); the API can no
        longer create one, so this is the only way to reproduce that state
        in a test. Never used to test anything the API itself should
        allow."""
        session = self.make_session()
        row = AnnouncementMention(
            announcement_id=self._as_uuid(announcement_id),
            mentioned_member_key=member_key,
            created_at=datetime.now(timezone.utc),
            notified_at=notified_at,
            read_at=read_at,
        )
        session.add(row)
        session.commit()
        session.close()

    # ── Auth ───────────────────────────────────────────────────────────

    def test_unauthenticated_blocked_on_every_surface(self):
        self.assertEqual(self.client.get(BASE).status_code, 401)
        self.assertEqual(self.client.get(f"{BASE}/drafts").status_code, 401)
        self.assertEqual(self.client.get(f"{BASE}/notifications").status_code, 401)
        self.assertEqual(
            self.client.post(BASE, json={"title": "x", "body": "y", "mention_member_keys": []}).status_code,
            401,
        )
        fake_id = str(uuid.uuid4())
        self.assertEqual(self.client.get(f"{BASE}/{fake_id}").status_code, 401)
        self.assertEqual(self.client.patch(f"{BASE}/{fake_id}", json={}).status_code, 401)
        self.assertEqual(self.client.delete(f"{BASE}/{fake_id}").status_code, 401)
        self.assertEqual(self.client.post(f"{BASE}/{fake_id}/publish").status_code, 401)
        self.assertEqual(self.client.get(f"{BASE}/{fake_id}/read-receipts").status_code, 401)

    # ── Draft ownership ────────────────────────────────────────────────

    def test_create_and_list_own_draft(self):
        created = self.create_draft("mayurika")
        self.assertEqual(created["status"], "Draft")
        self.assertEqual(created["created_by"], "mayurika")

        listed = self.client.get(f"{BASE}/drafts", headers=bearer_header("mayurika")).json()
        self.assertEqual(listed["total"], 1)
        self.assertEqual(listed["records"][0]["id"], created["id"])

    def test_list_own_drafts_excludes_other_members_drafts(self):
        self.create_draft("mayurika")
        self.create_draft("arun")

        mayurika_drafts = self.client.get(f"{BASE}/drafts", headers=bearer_header("mayurika")).json()
        self.assertEqual(mayurika_drafts["total"], 1)
        self.assertEqual(mayurika_drafts["records"][0]["created_by"], "mayurika")

    def test_edit_own_draft(self):
        created = self.create_draft("mayurika", title="Original")
        resp = self.client.patch(
            f"{BASE}/{created['id']}",
            json={"title": "Updated title"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200, resp.text)
        self.assertEqual(resp.json()["title"], "Updated title")

    def test_cannot_open_another_users_draft(self):
        created = self.create_draft("mayurika")
        resp = self.client.get(f"{BASE}/{created['id']}", headers=bearer_header("arun"))
        self.assertEqual(resp.status_code, 404)

    def test_cannot_edit_another_users_draft(self):
        created = self.create_draft("mayurika")
        resp = self.client.patch(
            f"{BASE}/{created['id']}", json={"title": "hijacked"}, headers=bearer_header("arun")
        )
        self.assertEqual(resp.status_code, 404)

    def test_cannot_delete_another_users_draft(self):
        created = self.create_draft("mayurika")
        resp = self.client.delete(f"{BASE}/{created['id']}", headers=bearer_header("arun"))
        self.assertEqual(resp.status_code, 404)

    def test_cannot_publish_another_users_draft(self):
        created = self.create_draft("mayurika")
        resp = self.publish("arun", created["id"])
        self.assertEqual(resp.status_code, 404)

    # ── Draft mentions ─────────────────────────────────────────────────

    def test_zero_mentions(self):
        created = self.create_draft("mayurika", mentions=[])
        self.assertEqual(created["mention_member_keys"], [])

    def test_single_mention(self):
        created = self.create_draft("mayurika", mentions=["arun"])
        self.assertEqual(created["mention_member_keys"], ["arun"])

    def test_multiple_mentions(self):
        created = self.create_draft("mayurika", mentions=["arun", "suman", "rajiv"])
        self.assertEqual(sorted(created["mention_member_keys"]), ["arun", "rajiv", "suman"])

    def test_duplicate_mention_deduped(self):
        created = self.create_draft("mayurika", mentions=["arun", "arun", "arun"])
        self.assertEqual(created["mention_member_keys"], ["arun"])

    def test_invalid_member_key_rejected(self):
        resp = self.client.post(
            BASE,
            json={"title": "x", "body": "y", "mention_member_keys": ["not-a-real-member"]},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 422)

    def test_draft_reopen_retains_mentions(self):
        created = self.create_draft("mayurika", mentions=["arun"])
        reopened = self.client.get(f"{BASE}/{created['id']}", headers=bearer_header("mayurika")).json()
        self.assertEqual(reopened["mention_member_keys"], ["arun"])

    def test_draft_mention_edit_persists(self):
        created = self.create_draft("mayurika", mentions=["arun"])
        resp = self.client.patch(
            f"{BASE}/{created['id']}",
            json={"mention_member_keys": ["suman", "rajiv"]},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200, resp.text)
        self.assertEqual(sorted(resp.json()["mention_member_keys"]), ["rajiv", "suman"])

        reopened = self.client.get(f"{BASE}/{created['id']}", headers=bearer_header("mayurika")).json()
        self.assertEqual(sorted(reopened["mention_member_keys"]), ["rajiv", "suman"])

    # ── Draft delete ───────────────────────────────────────────────────

    def test_draft_soft_delete(self):
        created = self.create_draft("mayurika")
        resp = self.client.delete(f"{BASE}/{created['id']}", headers=bearer_header("mayurika"))
        self.assertEqual(resp.status_code, 200, resp.text)

        row = self.get_announcement_row(created["id"])
        self.assertIsNotNone(row.deleted_at)
        self.assertEqual(row.deleted_by, "mayurika")

    def test_deleted_draft_absent_from_active_draft_list(self):
        created = self.create_draft("mayurika")
        self.client.delete(f"{BASE}/{created['id']}", headers=bearer_header("mayurika"))

        listed = self.client.get(f"{BASE}/drafts", headers=bearer_header("mayurika")).json()
        self.assertEqual(listed["total"], 0)

    # ── Publish ────────────────────────────────────────────────────────

    def test_publish_transitions_draft_to_published(self):
        created = self.create_draft("mayurika")
        resp = self.publish("mayurika", created["id"])
        self.assertEqual(resp.status_code, 200, resp.text)
        body = resp.json()
        self.assertEqual(body["status"], "Published")
        self.assertIsNotNone(body["published_at"])

    def test_publish_stamps_notified_at_for_selected_mentions(self):
        created = self.create_draft("mayurika", mentions=["arun", "suman"])
        self.publish("mayurika", created["id"])

        for key in ("arun", "suman"):
            row = self.get_mention_row(created["id"], key)
            self.assertIsNotNone(row.notified_at)
            self.assertIsNone(row.read_at)

    def test_zero_mentioned_publish_works(self):
        created = self.create_draft("mayurika", mentions=[])
        resp = self.publish("mayurika", created["id"])
        self.assertEqual(resp.status_code, 200, resp.text)

    def test_double_publish_prevented(self):
        created = self.create_draft("mayurika")
        first = self.publish("mayurika", created["id"])
        self.assertEqual(first.status_code, 200)
        second = self.publish("mayurika", created["id"])
        self.assertEqual(second.status_code, 404)

    def test_published_cannot_be_edited(self):
        created = self.create_draft("mayurika")
        self.publish("mayurika", created["id"])
        resp = self.client.patch(
            f"{BASE}/{created['id']}", json={"title": "no"}, headers=bearer_header("mayurika")
        )
        self.assertEqual(resp.status_code, 404)

    def test_published_cannot_be_deleted(self):
        created = self.create_draft("mayurika")
        self.publish("mayurika", created["id"])
        resp = self.client.delete(f"{BASE}/{created['id']}", headers=bearer_header("mayurika"))
        self.assertEqual(resp.status_code, 404)

        row = self.get_announcement_row(created["id"])
        self.assertIsNone(row.deleted_at)

    def test_published_mentions_cannot_change(self):
        created = self.create_draft("mayurika", mentions=["arun"])
        self.publish("mayurika", created["id"])
        resp = self.client.patch(
            f"{BASE}/{created['id']}",
            json={"mention_member_keys": ["suman"]},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 404)

        # Original mention untouched.
        self.assertIsNotNone(self.get_mention_row(created["id"], "arun"))
        self.assertIsNone(self.get_mention_row(created["id"], "suman"))

    # ── Visibility ─────────────────────────────────────────────────────

    def test_other_authenticated_member_sees_published_history(self):
        created = self.create_draft("mayurika")
        self.publish("mayurika", created["id"])

        resp = self.client.get(BASE, headers=bearer_header("arun"))
        self.assertEqual(resp.status_code, 200)
        ids = [r["id"] for r in resp.json()["records"]]
        self.assertIn(created["id"], ids)

    def test_draft_never_appears_in_published_history(self):
        self.create_draft("mayurika")
        resp = self.client.get(BASE, headers=bearer_header("arun")).json()
        self.assertEqual(resp["total"], 0)

    # ── Notifications ──────────────────────────────────────────────────

    def test_only_mentioned_users_have_notification_rows(self):
        created = self.create_draft("mayurika", mentions=["arun"])
        self.publish("mayurika", created["id"])

        arun_feed = self.client.get(f"{BASE}/notifications", headers=bearer_header("arun")).json()
        self.assertEqual(arun_feed["unread_count"], 1)
        self.assertEqual(len(arun_feed["items"]), 1)

        suman_feed = self.client.get(f"{BASE}/notifications", headers=bearer_header("suman")).json()
        self.assertEqual(suman_feed["unread_count"], 0)
        self.assertEqual(suman_feed["items"], [])

    def test_draft_mentions_never_appear_as_notifications(self):
        self.create_draft("mayurika", mentions=["arun"])  # not published

        arun_feed = self.client.get(f"{BASE}/notifications", headers=bearer_header("arun")).json()
        self.assertEqual(arun_feed["unread_count"], 0)
        self.assertEqual(arun_feed["items"], [])

    def test_unread_count_per_user_correct(self):
        first = self.create_draft("mayurika", mentions=["arun"])
        self.publish("mayurika", first["id"])
        second = self.create_draft("mayurika", mentions=["arun"])
        self.publish("mayurika", second["id"])

        feed = self.client.get(f"{BASE}/notifications", headers=bearer_header("arun")).json()
        self.assertEqual(feed["unread_count"], 2)

    def test_one_users_read_does_not_affect_another(self):
        created = self.create_draft("mayurika", mentions=["arun", "suman"])
        self.publish("mayurika", created["id"])

        arun_feed = self.client.get(f"{BASE}/notifications", headers=bearer_header("arun")).json()
        mention_id = arun_feed["items"][0]["mention_id"]
        read_resp = self.client.post(
            f"{BASE}/notifications/{mention_id}/read", headers=bearer_header("arun")
        )
        self.assertEqual(read_resp.status_code, 200, read_resp.text)

        arun_feed_after = self.client.get(f"{BASE}/notifications", headers=bearer_header("arun")).json()
        self.assertEqual(arun_feed_after["unread_count"], 0)

        suman_feed_after = self.client.get(f"{BASE}/notifications", headers=bearer_header("suman")).json()
        self.assertEqual(suman_feed_after["unread_count"], 1)

    def test_read_action_idempotent(self):
        created = self.create_draft("mayurika", mentions=["arun"])
        self.publish("mayurika", created["id"])
        feed = self.client.get(f"{BASE}/notifications", headers=bearer_header("arun")).json()
        mention_id = feed["items"][0]["mention_id"]

        first = self.client.post(f"{BASE}/notifications/{mention_id}/read", headers=bearer_header("arun"))
        second = self.client.post(f"{BASE}/notifications/{mention_id}/read", headers=bearer_header("arun"))
        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json()["read_at"], second.json()["read_at"])

    def test_cannot_mark_another_members_notification_read(self):
        created = self.create_draft("mayurika", mentions=["arun"])
        self.publish("mayurika", created["id"])
        feed = self.client.get(f"{BASE}/notifications", headers=bearer_header("arun")).json()
        mention_id = feed["items"][0]["mention_id"]

        resp = self.client.post(f"{BASE}/notifications/{mention_id}/read", headers=bearer_header("suman"))
        self.assertEqual(resp.status_code, 404)

    # ── Read receipts ──────────────────────────────────────────────────

    def test_creator_can_see_read_receipts(self):
        created = self.create_draft("mayurika", mentions=["arun", "suman"])
        self.publish("mayurika", created["id"])
        feed = self.client.get(f"{BASE}/notifications", headers=bearer_header("arun")).json()
        mention_id = feed["items"][0]["mention_id"]
        self.client.post(f"{BASE}/notifications/{mention_id}/read", headers=bearer_header("arun"))

        resp = self.client.get(f"{BASE}/{created['id']}/read-receipts", headers=bearer_header("mayurika"))
        self.assertEqual(resp.status_code, 200, resp.text)
        body = resp.json()
        self.assertEqual(body["mentioned_count"], 2)
        self.assertEqual(body["read_count"], 1)
        self.assertEqual(body["unread_count"], 1)
        by_key = {r["member_key"]: r["read"] for r in body["receipts"]}
        self.assertTrue(by_key["arun"])
        self.assertFalse(by_key["suman"])

    def test_non_creator_cannot_see_read_receipts(self):
        created = self.create_draft("mayurika", mentions=["arun"])
        self.publish("mayurika", created["id"])

        resp = self.client.get(f"{BASE}/{created['id']}/read-receipts", headers=bearer_header("arun"))
        self.assertEqual(resp.status_code, 404)

    # ── Self-mention (REQ-ANN-001 Stage A, 2026-08-12 production UX
    #    correction) ────────────────────────────────────────────────────
    #
    # Self-mention was explicitly ALLOWED under the original REQ-ANN-001
    # §4/§8 design. Production user acceptance on 2026-08-12 reversed that
    # decision: a member may no longer mention themselves. These tests
    # replace the old test_self_mention_allowed_and_notifies_creator,
    # which asserted the now-reversed behavior.

    def test_self_mention_rejected_on_create(self):
        resp = self.client.post(
            BASE,
            json={"title": "x", "body": "y", "mention_member_keys": ["mayurika"]},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 422)
        # The guard runs before any row is written — nothing was created.
        listed = self.client.get(f"{BASE}/drafts", headers=bearer_header("mayurika")).json()
        self.assertEqual(listed["total"], 0)

    def test_self_mention_alongside_other_members_rejected_entirely(self):
        resp = self.client.post(
            BASE,
            json={"title": "x", "body": "y", "mention_member_keys": ["arun", "mayurika"]},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 422)
        # All-or-nothing — a self-mention anywhere in the list rejects the
        # whole request, it does not silently drop just the self entry.
        listed = self.client.get(f"{BASE}/drafts", headers=bearer_header("mayurika")).json()
        self.assertEqual(listed["total"], 0)

    def test_self_mention_rejected_on_draft_update(self):
        created = self.create_draft("mayurika", mentions=["arun"])
        resp = self.client.patch(
            f"{BASE}/{created['id']}",
            json={"mention_member_keys": ["mayurika"]},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 422)
        # Original mention set untouched by the rejected edit.
        reopened = self.client.get(f"{BASE}/{created['id']}", headers=bearer_header("mayurika")).json()
        self.assertEqual(reopened["mention_member_keys"], ["arun"])

    def test_other_members_still_mentionable_after_self_mention_rejected(self):
        rejected = self.client.post(
            BASE,
            json={"title": "x", "body": "y", "mention_member_keys": ["mayurika"]},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(rejected.status_code, 422)
        # The same acting member can still create and multi-mention normally.
        created = self.create_draft("mayurika", mentions=["arun", "suman"])
        self.assertEqual(sorted(created["mention_member_keys"]), ["arun", "suman"])

    def test_invalid_member_key_rejected_independent_of_self_mention_rule(self):
        # Confirms the pre-existing invalid-member-key 422 (schema-layer,
        # backend/schemas.py _validate_mention_keys) is unaffected by the
        # new router-layer self-mention guard — different validator,
        # different layer, both still correct on their own terms.
        resp = self.client.post(
            BASE,
            json={"title": "x", "body": "y", "mention_member_keys": ["not-a-real-member"]},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 422)

    # ── Historical self-mention (REQ-ANN-001 Stage A §5/§6/§7) ──────────
    #
    # Self-mention rows can no longer be created via the API (see above),
    # but rows created before this change (Phase 1 / early production
    # testing) must remain readable-but-filtered — NEVER deleted or
    # mutated. These tests insert such a row directly via the ORM
    # (insert_mention_row, bypassing the now-guarded API) to simulate that
    # historical state in an isolated test database only.

    def test_historical_self_mention_excluded_from_read_receipts(self):
        created = self.create_draft("mayurika", mentions=["arun"])
        self.publish("mayurika", created["id"])
        self.insert_mention_row(created["id"], "mayurika", notified_at=datetime.now(timezone.utc))

        resp = self.client.get(f"{BASE}/{created['id']}/read-receipts", headers=bearer_header("mayurika"))
        self.assertEqual(resp.status_code, 200, resp.text)
        body = resp.json()
        self.assertEqual(body["mentioned_count"], 1)
        self.assertEqual(body["unread_count"], 1)
        keys = [r["member_key"] for r in body["receipts"]]
        self.assertNotIn("mayurika", keys)
        self.assertIn("arun", keys)

        # Read-time filter only — the historical row itself is untouched.
        self.assertIsNotNone(self.get_mention_row(created["id"], "mayurika"))

    def test_creator_excluded_from_published_mention_display(self):
        created = self.create_draft("mayurika", mentions=["arun"])
        self.publish("mayurika", created["id"])
        self.insert_mention_row(created["id"], "mayurika", notified_at=datetime.now(timezone.utc))

        history = self.client.get(BASE, headers=bearer_header("arun")).json()
        record = next(r for r in history["records"] if r["id"] == created["id"])
        self.assertNotIn("mayurika", record["mention_member_keys"])
        self.assertIn("arun", record["mention_member_keys"])

    def test_other_member_read_receipts_unaffected_by_historical_self_mention(self):
        created = self.create_draft("mayurika", mentions=["arun", "suman"])
        self.publish("mayurika", created["id"])
        self.insert_mention_row(created["id"], "mayurika", notified_at=datetime.now(timezone.utc))

        feed = self.client.get(f"{BASE}/notifications", headers=bearer_header("arun")).json()
        mention_id = feed["items"][0]["mention_id"]
        self.client.post(f"{BASE}/notifications/{mention_id}/read", headers=bearer_header("arun"))

        resp = self.client.get(f"{BASE}/{created['id']}/read-receipts", headers=bearer_header("mayurika")).json()
        self.assertEqual(resp["mentioned_count"], 2)
        self.assertEqual(resp["read_count"], 1)
        self.assertEqual(resp["unread_count"], 1)
        by_key = {r["member_key"]: r["read"] for r in resp["receipts"]}
        self.assertTrue(by_key["arun"])
        self.assertFalse(by_key["suman"])
        self.assertNotIn("mayurika", by_key)

    def test_individual_read_isolation_holds_alongside_historical_self_mention(self):
        created = self.create_draft("mayurika", mentions=["arun"])
        self.publish("mayurika", created["id"])
        self.insert_mention_row(created["id"], "mayurika", notified_at=datetime.now(timezone.utc))

        # Marking arun's own notification read must not touch the
        # historical self-mention row's read_at.
        feed = self.client.get(f"{BASE}/notifications", headers=bearer_header("arun")).json()
        mention_id = feed["items"][0]["mention_id"]
        self.client.post(f"{BASE}/notifications/{mention_id}/read", headers=bearer_header("arun"))

        self_row = self.get_mention_row(created["id"], "mayurika")
        self.assertIsNone(self_row.read_at)

    def test_historical_self_mention_excluded_from_notification_feed_and_unread_count(self):
        # Consistency follow-up (2026-08-12): Stage A already filtered
        # read receipts and mention display; this closes the remaining
        # gap — the acting member's own notification feed/unread count
        # must not surface their own historical self-mention either.
        created = self.create_draft("mayurika", mentions=["suman"])
        self.publish("mayurika", created["id"])
        self.insert_mention_row(created["id"], "mayurika", notified_at=datetime.now(timezone.utc))

        # A: historical row is physically present in the DB before we assert anything else.
        self.assertIsNotNone(self.get_mention_row(created["id"], "mayurika"))

        # B + C: creator's own feed and unread count exclude the self-mention.
        mayurika_feed = self.client.get(f"{BASE}/notifications", headers=bearer_header("mayurika")).json()
        self.assertEqual(mayurika_feed["unread_count"], 0)
        self.assertEqual(mayurika_feed["items"], [])

        # D: the legitimate mention to another member is completely unaffected.
        suman_feed = self.client.get(f"{BASE}/notifications", headers=bearer_header("suman")).json()
        self.assertEqual(suman_feed["unread_count"], 1)
        self.assertEqual(len(suman_feed["items"]), 1)
        self.assertEqual(suman_feed["items"][0]["announcement_id"], created["id"])

        # E: no mutation — the historical row is untouched (still present, still unread).
        self_row_after = self.get_mention_row(created["id"], "mayurika")
        self.assertIsNotNone(self_row_after)
        self.assertIsNone(self_row_after.read_at)

    def test_mentions_from_other_creators_unaffected_by_own_self_mention_feed_filter(self):
        # Proves the exclusion is scoped to Announcement.created_by ==
        # acting_member specifically, not a blanket "hide anything
        # mentioning mayurika" rule — a legitimate mention on someone
        # ELSE's announcement must still appear in Mayurika's own feed,
        # even while she also has an unrelated historical self-mention.
        arun_announcement = self.create_draft("arun", mentions=["mayurika"])
        self.publish("arun", arun_announcement["id"])

        own_announcement = self.create_draft("mayurika", mentions=["suman"])
        self.publish("mayurika", own_announcement["id"])
        self.insert_mention_row(own_announcement["id"], "mayurika", notified_at=datetime.now(timezone.utc))

        mayurika_feed = self.client.get(f"{BASE}/notifications", headers=bearer_header("mayurika")).json()
        self.assertEqual(mayurika_feed["unread_count"], 1)
        announcement_ids = [item["announcement_id"] for item in mayurika_feed["items"]]
        self.assertIn(arun_announcement["id"], announcement_ids)
        self.assertNotIn(own_announcement["id"], announcement_ids)

    def test_self_mention_rejection_still_enforced_after_notification_feed_fix(self):
        # The notification-feed read-time filter above must not loosen
        # the existing create/update-time rejection in any way.
        resp = self.client.post(
            BASE,
            json={"title": "x", "body": "y", "mention_member_keys": ["mayurika"]},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 422)

    # ── Notification History body_preview (REQ-ANN-001 Stage A §9) ─────

    def test_notification_feed_items_include_body_preview(self):
        created = self.create_draft("mayurika", body="Please review your responsibilities.", mentions=["arun"])
        self.publish("mayurika", created["id"])

        feed = self.client.get(f"{BASE}/notifications", headers=bearer_header("arun")).json()
        self.assertEqual(feed["items"][0]["body_preview"], "Please review your responsibilities.")


if __name__ == "__main__":
    unittest.main()

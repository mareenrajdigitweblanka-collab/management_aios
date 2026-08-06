"""HTTP-level tests for Staff Review Summaries (REQ-CAL-REV-001).

Uses fastapi.testclient.TestClient against the real app (backend.main.app)
— see backend/tests/calendar_auth_test_support.py — so every request here
goes through FastAPI's real routing and dependency injection, never a
direct Python function call. Setup-only data (seeding a staff row / a
review summary to fetch/update/delete) is written directly via a
SQLAlchemy session against the same in-memory SQLite database the
TestClient's overridden get_db serves, matching the existing
backend/tests/test_calendar_mutation_authorization.py convention.

Run with: python -m unittest backend.tests.test_staff_review_summaries
"""

import unittest
from datetime import date, datetime, timedelta, timezone
from io import BytesIO
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient
from pypdf import PdfReader

from backend.database import get_db
from backend.main import app
from backend.models import MemberLeaveRecord, MemberScheduleEvent, StaffDashboardRecord, StaffReviewSummary
from backend.schemas import StaffRecordOut
from backend.tests.calendar_auth_test_support import (
    bearer_header,
    make_sqlite_engine_and_session_factory,
    patched_calendar_auth_env,
)

_COLOMBO_TZ = ZoneInfo("Asia/Colombo")


class StaffReviewSummariesTestCase(unittest.TestCase):
    """Fresh, isolated in-memory SQLite database per test method, wired
    into the real app via a get_db dependency override — no cross-test
    data leakage, no shared state, no real network connection, and no
    production review record is ever created by this file."""

    def setUp(self):
        self.engine, self.SessionLocal = make_sqlite_engine_and_session_factory()

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.env_ctx = patched_calendar_auth_env()
        self.env_ctx.__enter__()
        self.client_ctx = TestClient(app)
        self.client = self.client_ctx.__enter__()
        self.today = date(2026, 8, 3)

    def tearDown(self):
        self.client_ctx.__exit__(None, None, None)
        self.env_ctx.__exit__(None, None, None)
        app.dependency_overrides.clear()
        self.engine.dispose()

    def make_session(self):
        return self.SessionLocal()

    def seed_staff(self, source_record_key="staff-001", full_name="Test Staff One",
                    calling_name="Staff One", staff_status="Active"):
        session = self.make_session()
        now = datetime.now(timezone.utc)
        staff = StaffDashboardRecord(
            source_record_key=source_record_key,
            employee_number="EMP-" + source_record_key,
            full_name=full_name,
            calling_name=calling_name,
            staff_status=staff_status,
            source_hash="test-hash-" + source_record_key,
            source_status="imported",
            is_current=True,
            # Explicit values (not the Postgres-only server_default=now())
            # so this row can be seeded against the test SQLite database —
            # same reasoning as MemberScheduleEvent/MemberLeaveRecord seed
            # helpers in test_calendar_mutation_authorization.py.
            imported_at=now,
            created_at=now,
            updated_at=now,
        )
        session.add(staff)
        session.commit()
        session.refresh(staff)
        staff_id = staff.id
        session.close()
        return staff_id

    def seed_summary(self, reviewer_member_key="mayurika", reviewed_staff_id=None,
                      meeting_date=None, summary_text="Seed summary text.", created_at=None):
        if reviewed_staff_id is None:
            reviewed_staff_id = self.seed_staff()
        session = self.make_session()
        # REQ-CAL-REV-LOCK-004: created_at defaults to real "now" (as
        # before this feature) so every pre-existing test that never
        # passes created_at keeps seeding an always-editable-today record.
        # Passing created_at explicitly is how the lock tests below seed a
        # deliberately yesterday/older record.
        now = created_at if created_at is not None else datetime.now(timezone.utc)
        record = StaffReviewSummary(
            reviewer_member_key=reviewer_member_key,
            reviewed_staff_id=reviewed_staff_id,
            meeting_date=meeting_date or self.today,
            summary_text=summary_text,
            created_at=now,
            updated_at=now,
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        summary_id = record.id
        session.close()
        return summary_id, reviewed_staff_id

    def load_summary(self, summary_id):
        session = self.make_session()
        record = session.get(StaffReviewSummary, summary_id)
        if record is not None:
            session.expunge(record)
        session.close()
        return record

    def count_summaries(self):
        session = self.make_session()
        count = session.query(StaffReviewSummary).count()
        session.close()
        return count

    def soft_delete_summary_directly(self, summary_id):
        """REQ-CAL-REV-LOCK-004 (2026-08-06): the DELETE endpoint itself no
        longer soft-deletes anything (delete_staff_review_summary always
        rejects with 409, unconditionally). Every fixture below that still
        needs an ALREADY-soft-deleted row (to prove such rows stay hidden
        — approved business rule §10/§17) must therefore write deleted_at
        directly via the ORM, bypassing the API exactly like the seed_*
        helpers above already bypass it for created_at/updated_at."""
        session = self.make_session()
        record = session.get(StaffReviewSummary, summary_id)
        record.deleted_at = datetime.now(timezone.utc)
        session.commit()
        session.close()

    # ── 1-2: StaffRecordOut / Staff API compatibility ─────────────────

    def test_staff_record_out_exposes_uuid_id(self):
        staff_id = self.seed_staff()
        resp = self.client.get("/api/staff")
        self.assertEqual(resp.status_code, 200)
        records = resp.json()["records"]
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["id"], str(staff_id))
        # Confirm the schema itself accepts the ORM row unmodified.
        session = self.make_session()
        staff = session.get(StaffDashboardRecord, staff_id)
        out = StaffRecordOut.model_validate(staff)
        session.close()
        self.assertEqual(out.id, staff_id)

    def test_existing_staff_api_fields_remain_compatible(self):
        self.seed_staff(full_name="Compat Check", calling_name="Compat")
        resp = self.client.get("/api/staff")
        self.assertEqual(resp.status_code, 200)
        record = resp.json()["records"][0]
        for field in (
            "employee_number", "epf_number", "date_of_joining", "full_name",
            "calling_name", "location", "staff_status", "department_team",
            "designation", "cv_reference", "nic", "remarks", "employment_stage",
            "source_file", "source_page", "source_row_reference",
        ):
            self.assertIn(field, record)
        self.assertEqual(record["full_name"], "Compat Check")

    # ── 3-9: Create ──────────────────────────────────────────────────

    def test_valid_reviewer_creates_a_summary(self):
        staff_id = self.seed_staff()
        resp = self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": str(staff_id),
                "meeting_date": str(self.today),
                "summary_text": "A real review discussion.",
            },
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 201)
        body = resp.json()
        self.assertEqual(body["reviewer_member_key"], "mayurika")
        self.assertEqual(body["reviewed_staff_id"], str(staff_id))
        self.assertEqual(body["summary_text"], "A real review discussion.")
        self.assertIsNotNone(body["id"])
        self.assertIsNotNone(body["created_at"])

    def test_missing_token_create_returns_401(self):
        staff_id = self.seed_staff()
        resp = self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": str(staff_id),
                "meeting_date": str(self.today),
                "summary_text": "No token attached.",
            },
        )
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(self.count_summaries(), 0)

    def test_invalid_token_create_returns_401(self):
        staff_id = self.seed_staff()
        resp = self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": str(staff_id),
                "meeting_date": str(self.today),
                "summary_text": "Bad token attached.",
            },
            headers={"Authorization": "Bearer not-a-real-token"},
        )
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(self.count_summaries(), 0)

    def test_reviewer_identity_is_server_derived(self):
        staff_id = self.seed_staff()
        resp = self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": str(staff_id),
                "meeting_date": str(self.today),
                "summary_text": "Checking server derivation.",
            },
            headers=bearer_header("suman"),
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["reviewer_member_key"], "suman")

    def test_ownership_spoof_field_is_ignored_safely(self):
        staff_id = self.seed_staff()
        resp = self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": str(staff_id),
                "meeting_date": str(self.today),
                "summary_text": "Spoof attempt.",
                "reviewer_member_key": "suman",
            },
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 201)
        # Authenticated as mayurika — the spoofed "suman" value must never
        # be honored, regardless of what the request body contained.
        self.assertEqual(resp.json()["reviewer_member_key"], "mayurika")

    def test_invalid_reviewed_staff_id_is_rejected(self):
        resp = self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": "00000000-0000-0000-0000-000000000000",
                "meeting_date": str(self.today),
                "summary_text": "Unknown staff id.",
            },
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(self.count_summaries(), 0)

    def test_management_team_staff_may_be_reviewed(self):
        staff_id = self.seed_staff(
            source_record_key="staff-arun", full_name="Arun (as staff record)",
        )
        resp = self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": str(staff_id),
                "meeting_date": str(self.today),
                "summary_text": "Reviewing a fellow Management Team member.",
            },
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 201)

    def test_non_management_staff_may_be_reviewed(self):
        staff_id = self.seed_staff(source_record_key="staff-regular", full_name="Regular Staff")
        resp = self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": str(staff_id),
                "meeting_date": str(self.today),
                "summary_text": "Reviewing a non-management staff member.",
            },
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 201)

    def test_inactive_staff_allowed_to_be_reviewed(self):
        """Server-side create does not reject on staff_status — the
        active-by-default selector is a UI convenience, not a server rule
        (approved technical design §4)."""
        staff_id = self.seed_staff(source_record_key="staff-inactive", staff_status="Inactive")
        resp = self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": str(staff_id),
                "meeting_date": str(self.today),
                "summary_text": "Exit-review discussion.",
            },
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 201)

    # ── 11-20: List / history ───────────────────────────────────────

    def test_owner_lists_own_history(self):
        summary_id, staff_id = self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.get(
            "/api/staff-review-summaries", headers=bearer_header("mayurika")
        )
        self.assertEqual(resp.status_code, 200)
        ids = [r["id"] for r in resp.json()["records"]]
        self.assertIn(str(summary_id), ids)

    def test_reviewer_member_key_omitted_defaults_to_authenticated_reviewer(self):
        """PHASE 5.5 (REQ-CAL-REV-001 shared-read revision) — a caller that
        never passes ?reviewer_member_key= keeps seeing only their own
        history, matching the prior owner-only behavior exactly."""
        self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.get(
            "/api/staff-review-summaries", headers=bearer_header("suman")
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["records"], [])

    def test_mayurika_reads_arun_list(self):
        """PHASE 5.2 — an authenticated reviewer may read another valid
        reviewer's history via ?reviewer_member_key=."""
        summary_id, _ = self.seed_summary(
            reviewer_member_key="arun", summary_text="Arun's own summary."
        )
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={"reviewer_member_key": "arun"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        ids = [r["id"] for r in resp.json()["records"]]
        self.assertEqual(ids, [str(summary_id)])
        self.assertEqual(resp.json()["records"][0]["reviewer_member_key"], "arun")

    def test_arun_reads_mayurika_list(self):
        """PHASE 5.3 — symmetric to the above, in the other direction."""
        summary_id, _ = self.seed_summary(
            reviewer_member_key="mayurika", summary_text="Mayurika's own summary."
        )
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={"reviewer_member_key": "mayurika"},
            headers=bearer_header("arun"),
        )
        self.assertEqual(resp.status_code, 200)
        ids = [r["id"] for r in resp.json()["records"]]
        self.assertEqual(ids, [str(summary_id)])

    def test_different_reviewers_reviewing_same_staff_return_separate_selected_owner_histories(self):
        """PHASE 5.4 — two reviewers each hold a summary about the SAME
        reviewed staff member; selecting one reviewer's key must return
        only that reviewer's row, never the other's, even though both
        summaries concern the same reviewed_staff_id."""
        staff_id = self.seed_staff(source_record_key="staff-shared", full_name="Shared Staff")
        summary_a_id, _ = self.seed_summary(
            reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
            summary_text="Mayurika's summary about the shared staff member.",
        )
        summary_b_id, _ = self.seed_summary(
            reviewer_member_key="arun", reviewed_staff_id=staff_id,
            summary_text="Arun's summary about the shared staff member.",
        )

        resp_mayurika = self.client.get(
            "/api/staff-review-summaries",
            params={"reviewer_member_key": "mayurika"},
            headers=bearer_header("suman"),
        )
        self.assertEqual([r["id"] for r in resp_mayurika.json()["records"]], [str(summary_a_id)])

        resp_arun = self.client.get(
            "/api/staff-review-summaries",
            params={"reviewer_member_key": "arun"},
            headers=bearer_header("suman"),
        )
        self.assertEqual([r["id"] for r in resp_arun.json()["records"]], [str(summary_b_id)])

    def test_invalid_reviewer_member_key_rejected_safely(self):
        """PHASE 5.6 — an unknown reviewer_member_key is a 422 validation
        error, never silently ignored and never a 500/leak."""
        self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={"reviewer_member_key": "not-a-real-member"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 422)

    def test_date_filters_work_for_another_reviewers_history(self):
        """PHASE 5.18."""
        staff_id = self.seed_staff(source_record_key="staff-datefilter")
        self.seed_summary(reviewer_member_key="arun", reviewed_staff_id=staff_id,
                           meeting_date=self.today - timedelta(days=10))
        in_range_id, _ = self.seed_summary(reviewer_member_key="arun", reviewed_staff_id=staff_id,
                                            meeting_date=self.today)
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={"reviewer_member_key": "arun", "date_from": str(self.today - timedelta(days=1))},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        ids = [r["id"] for r in resp.json()["records"]]
        self.assertEqual(ids, [str(in_range_id)])

    def test_pagination_works_for_another_reviewers_history(self):
        """PHASE 5.19."""
        staff_id = self.seed_staff(source_record_key="staff-paginate-other")
        for i in range(3):
            self.seed_summary(reviewer_member_key="arun", reviewed_staff_id=staff_id,
                               meeting_date=self.today - timedelta(days=i))
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={"reviewer_member_key": "arun", "limit": 2},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()["records"]), 2)
        self.assertEqual(resp.json()["total"], 3)

    def test_public_list_returns_401(self):
        self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.get("/api/staff-review-summaries")
        self.assertEqual(resp.status_code, 401)

    def test_invalid_token_list_returns_401(self):
        self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.get(
            "/api/staff-review-summaries",
            headers={"Authorization": "Bearer not-a-real-token"},
        )
        self.assertEqual(resp.status_code, 401)

    def test_two_reviewers_same_staff_each_see_only_their_own_summary(self):
        """PHASE 4 two-reviewer isolation check (production authorization-
        context defect follow-up, REQ-CAL-REV-001, 2026-08-03) — Reviewer A
        and Reviewer B each hold a summary about the SAME reviewed staff
        member. Unlike test_different_reviewer_cannot_see_owner_history
        (which only proves an empty-handed reviewer sees nothing), this
        proves list filtering actually EXCLUDES the other reviewer's row
        from a populated result set, not merely that it returns nothing
        when there is nothing of the other reviewer's to exclude."""
        staff_id = self.seed_staff(source_record_key="staff-common", full_name="Common Staff")
        summary_a_id, _ = self.seed_summary(
            reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
            summary_text="Reviewer A's private summary.",
        )
        summary_b_id, _ = self.seed_summary(
            reviewer_member_key="arun", reviewed_staff_id=staff_id,
            summary_text="Reviewer B's private summary.",
        )

        resp_a = self.client.get(
            "/api/staff-review-summaries", headers=bearer_header("mayurika")
        )
        self.assertEqual(resp_a.status_code, 200)
        ids_a = [r["id"] for r in resp_a.json()["records"]]
        self.assertEqual(ids_a, [str(summary_a_id)])

        resp_b = self.client.get(
            "/api/staff-review-summaries", headers=bearer_header("arun")
        )
        self.assertEqual(resp_b.status_code, 200)
        ids_b = [r["id"] for r in resp_b.json()["records"]]
        self.assertEqual(ids_b, [str(summary_b_id)])

        # Reviewer A CAN now open Reviewer B's summary detail and vice versa
        # (2026-08-03 revised business rule: shared read access) — this is
        # the deliberate change from the prior owner-only detail behavior.
        detail_b_from_a = self.client.get(
            "/api/staff-review-summaries/" + str(summary_b_id),
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(detail_b_from_a.status_code, 200)
        self.assertEqual(detail_b_from_a.json()["reviewer_member_key"], "arun")
        detail_a_from_b = self.client.get(
            "/api/staff-review-summaries/" + str(summary_a_id),
            headers=bearer_header("arun"),
        )
        self.assertEqual(detail_a_from_b.status_code, 200)
        self.assertEqual(detail_a_from_b.json()["reviewer_member_key"], "mayurika")

        # Cross-reviewer update still returns the non-disclosing 404 (not
        # a 403 that would leak existence), and never mutates the other
        # reviewer's row. Delete (REQ-CAL-REV-LOCK-004) is rejected for
        # everyone unconditionally now — 409, not a 404 — see
        # test_delete_is_rejected_for_every_valid_reviewer_identity above
        # for the dedicated coverage of that rule.
        update_resp = self.client.put(
            "/api/staff-review-summaries/" + str(summary_b_id),
            json={"summary_text": "Hijack attempt."},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(update_resp.status_code, 404)
        delete_resp = self.client.delete(
            "/api/staff-review-summaries/" + str(summary_a_id),
            headers=bearer_header("arun"),
        )
        self.assertEqual(delete_resp.status_code, 409)

        record_a = self.load_summary(summary_a_id)
        record_b = self.load_summary(summary_b_id)
        self.assertEqual(record_a.summary_text, "Reviewer A's private summary.")
        self.assertIsNone(record_a.deleted_at)
        self.assertEqual(record_b.summary_text, "Reviewer B's private summary.")

    def test_owner_can_open_detail(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="arun")
        resp = self.client.get(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("arun")
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["id"], str(summary_id))

    def test_cross_reviewer_detail_is_readable(self):
        """PHASE 5.9 (REQ-CAL-REV-001 shared-read revision) — any
        authenticated Management Team member may open another reviewer's
        summary detail; this replaces the prior owner-only 404 behavior."""
        summary_id, _ = self.seed_summary(reviewer_member_key="arun")
        resp = self.client.get(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("rajiv")
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["id"], str(summary_id))
        self.assertEqual(resp.json()["reviewer_member_key"], "arun")

    def test_missing_detail_returns_404(self):
        """PHASE 5.10."""
        resp = self.client.get(
            "/api/staff-review-summaries/00000000-0000-0000-0000-000000000000",
            headers=bearer_header("rajiv"),
        )
        self.assertEqual(resp.status_code, 404)

    def test_deleted_detail_returns_404_even_for_the_owner(self):
        """PHASE 5.10 — a soft-deleted summary is 404 for everyone,
        including its own owner, not just for other reviewers. deleted_at
        is set directly (REQ-CAL-REV-LOCK-004 — the DELETE endpoint no
        longer performs a soft delete at all; see
        soft_delete_summary_directly's docstring)."""
        summary_id, _ = self.seed_summary(reviewer_member_key="arun")
        self.soft_delete_summary_directly(summary_id)
        resp = self.client.get(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("arun")
        )
        self.assertEqual(resp.status_code, 404)

    def test_meeting_date_descending_order(self):
        staff_id = self.seed_staff()
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                           meeting_date=self.today - timedelta(days=5))
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                           meeting_date=self.today)
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                           meeting_date=self.today - timedelta(days=2))
        resp = self.client.get(
            "/api/staff-review-summaries", headers=bearer_header("mayurika")
        )
        dates = [r["meeting_date"] for r in resp.json()["records"]]
        self.assertEqual(dates, sorted(dates, reverse=True))

    def test_created_at_secondary_order(self):
        staff_id = self.seed_staff()
        same_date = self.today
        session = self.make_session()
        first = StaffReviewSummary(
            reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
            meeting_date=same_date, summary_text="First created",
            created_at=datetime(2026, 8, 3, 9, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 8, 3, 9, 0, tzinfo=timezone.utc),
        )
        second = StaffReviewSummary(
            reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
            meeting_date=same_date, summary_text="Second created (later)",
            created_at=datetime(2026, 8, 3, 10, 0, tzinfo=timezone.utc),
            updated_at=datetime(2026, 8, 3, 10, 0, tzinfo=timezone.utc),
        )
        session.add_all([first, second])
        session.commit()
        session.close()

        resp = self.client.get(
            "/api/staff-review-summaries", headers=bearer_header("mayurika")
        )
        texts = [r["summary_text"] for r in resp.json()["records"]]
        self.assertEqual(texts[0], "Second created (later)")
        self.assertEqual(texts[1], "First created")

    def test_date_from_filter(self):
        staff_id = self.seed_staff()
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                           meeting_date=self.today - timedelta(days=10))
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                           meeting_date=self.today)
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={"date_from": str(self.today - timedelta(days=1))},
            headers=bearer_header("mayurika"),
        )
        dates = [r["meeting_date"] for r in resp.json()["records"]]
        self.assertEqual(dates, [str(self.today)])

    def test_date_to_filter(self):
        staff_id = self.seed_staff()
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                           meeting_date=self.today - timedelta(days=10))
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                           meeting_date=self.today)
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={"date_to": str(self.today - timedelta(days=1))},
            headers=bearer_header("mayurika"),
        )
        dates = [r["meeting_date"] for r in resp.json()["records"]]
        self.assertEqual(dates, [str(self.today - timedelta(days=10))])

    def test_empty_history(self):
        resp = self.client.get(
            "/api/staff-review-summaries", headers=bearer_header("mayurika")
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["records"], [])
        self.assertEqual(resp.json()["total"], 0)

    # ── 21-28: Update ────────────────────────────────────────────────

    def test_owner_update(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.put(
            "/api/staff-review-summaries/" + str(summary_id),
            json={"summary_text": "Updated summary text."},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["summary_text"], "Updated summary text.")
        record = self.load_summary(summary_id)
        self.assertIsNotNone(record.updated_at)

    def test_cross_reviewer_update_returns_404(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika",
                                           summary_text="Original text.")
        resp = self.client.put(
            "/api/staff-review-summaries/" + str(summary_id),
            json={"summary_text": "Hijacked text."},
            headers=bearer_header("suman"),
        )
        self.assertEqual(resp.status_code, 404)
        record = self.load_summary(summary_id)
        self.assertEqual(record.summary_text, "Original text.")

    # ── Same-day edit lock (REQ-CAL-REV-LOCK-004, 2026-08-06) ──────────
    # HTTP-level authorization/lock coverage — real-clock created_at
    # (defaults to "now", i.e. always today) vs. an explicit yesterday
    # timestamp. Pure date-boundary math (23:59:58/23:59:59/00:00:00 exact
    # second cases) is covered separately and deterministically in
    # backend/tests/test_review_summary_edit_lock.py, which injects
    # `today` directly rather than depending on the real wall clock.

    def _seed_yesterday_summary(self, reviewer_member_key="mayurika"):
        yesterday_colombo = datetime.now(timezone.utc).astimezone(_COLOMBO_TZ) - timedelta(days=1)
        # Comfortably inside yesterday's Colombo calendar date regardless
        # of what second "now" happens to be.
        created_at = yesterday_colombo.replace(hour=12, minute=0, second=0, microsecond=0)
        return self.seed_summary(
            reviewer_member_key=reviewer_member_key,
            summary_text="Yesterday's original text.",
            created_at=created_at.astimezone(timezone.utc),
        )

    def test_1_creator_edits_during_creation_day(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.put(
            "/api/staff-review-summaries/" + str(summary_id),
            json={"summary_text": "Same-day edit."},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["can_edit"])

    def test_2_creator_cannot_edit_after_midnight(self):
        summary_id, _ = self._seed_yesterday_summary(reviewer_member_key="mayurika")
        resp = self.client.put(
            "/api/staff-review-summaries/" + str(summary_id),
            json={"summary_text": "Too-late edit attempt."},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 409)
        self.assertEqual(resp.json()["error"], "review_summary_edit_locked")
        record = self.load_summary(summary_id)
        self.assertEqual(record.summary_text, "Yesterday's original text.")

    def test_3_non_owner_cannot_edit_during_creation_day(self):
        # Non-ownership is still checked FIRST (unchanged 404), before the
        # day-lock ever runs — a same-day record from a different reviewer
        # is still just a non-disclosing 404, not a 409.
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.put(
            "/api/staff-review-summaries/" + str(summary_id),
            json={"summary_text": "Hijack attempt."},
            headers=bearer_header("suman"),
        )
        self.assertEqual(resp.status_code, 404)

    def test_4_no_admin_override_exists(self):
        # This app's member set has no "Admin" role — every VALID_MEMBER_KEYS
        # identity other than the creator gets the same non-disclosing 404
        # a cross-reviewer gets; there is no elevated key that bypasses
        # either the ownership check or the day-lock.
        from backend.config import VALID_MEMBER_KEYS

        summary_id, _ = self._seed_yesterday_summary(reviewer_member_key="mayurika")
        for member_key in VALID_MEMBER_KEYS:
            if member_key == "mayurika":
                continue
            resp = self.client.put(
                "/api/staff-review-summaries/" + str(summary_id),
                json={"summary_text": "Override attempt."},
                headers=bearer_header(member_key),
            )
            self.assertEqual(resp.status_code, 404, "no override for " + member_key)

    def test_5_missing_token_cannot_edit(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.put(
            "/api/staff-review-summaries/" + str(summary_id),
            json={"summary_text": "No token."},
        )
        self.assertEqual(resp.status_code, 401)

    def test_6_invalid_token_cannot_edit(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.put(
            "/api/staff-review-summaries/" + str(summary_id),
            json={"summary_text": "Bad token."},
            headers={"Authorization": "Bearer not-a-real-token"},
        )
        self.assertEqual(resp.status_code, 401)

    def test_7_request_cannot_alter_reviewer_ownership(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.put(
            "/api/staff-review-summaries/" + str(summary_id),
            json={"summary_text": "Attempted ownership spoof.", "reviewer_member_key": "arun"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["reviewer_member_key"], "mayurika")
        record = self.load_summary(summary_id)
        self.assertEqual(record.reviewer_member_key, "mayurika")

    def test_8_request_cannot_alter_created_at(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        original = self.load_summary(summary_id)
        resp = self.client.put(
            "/api/staff-review-summaries/" + str(summary_id),
            json={"summary_text": "Attempted created_at spoof.", "created_at": "2000-01-01T00:00:00Z"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        record = self.load_summary(summary_id)
        self.assertEqual(record.created_at, original.created_at)

    def test_9_request_cannot_supply_an_edit_deadline(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.put(
            "/api/staff-review-summaries/" + str(summary_id),
            json={"summary_text": "Attempted deadline spoof.", "edit_deadline": "2099-01-01T00:00:00Z"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        # edit_deadline in the response is always server-derived from
        # created_at (today's own 23:59:59 Colombo) — never the spoofed
        # request value.
        self.assertNotIn("2099", resp.json()["edit_deadline"])

    def test_can_edit_and_edit_deadline_are_present_on_list_and_detail_too(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        list_resp = self.client.get(
            "/api/staff-review-summaries", headers=bearer_header("mayurika")
        )
        self.assertTrue(list_resp.json()["records"][0]["can_edit"])
        self.assertIsNotNone(list_resp.json()["records"][0]["edit_deadline"])
        detail_resp = self.client.get(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("mayurika")
        )
        self.assertTrue(detail_resp.json()["can_edit"])

    def test_can_edit_is_false_for_a_shared_read_by_a_non_owner(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        detail_resp = self.client.get(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("arun")
        )
        self.assertEqual(detail_resp.status_code, 200)
        self.assertFalse(detail_resp.json()["can_edit"])

    def test_can_edit_is_false_for_the_owner_once_the_creation_day_has_passed(self):
        summary_id, _ = self._seed_yesterday_summary(reviewer_member_key="mayurika")
        detail_resp = self.client.get(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("mayurika")
        )
        self.assertFalse(detail_resp.json()["can_edit"])

    def test_meeting_date_does_not_affect_can_edit_or_the_lock(self):
        # meeting_date is yesterday but created_at is today — creator edit
        # succeeds and can_edit is true, matching Phase 9 case 6.
        staff_a = self.seed_staff(source_record_key="staff-meeting-date-case-6")
        summary_id, _ = self.seed_summary(
            reviewer_member_key="mayurika", reviewed_staff_id=staff_a,
            meeting_date=self.today - timedelta(days=1),
        )
        resp = self.client.put(
            "/api/staff-review-summaries/" + str(summary_id),
            json={"summary_text": "Still editable — created today."},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)

        # meeting_date is today but created_at is yesterday — creator edit
        # fails, matching Phase 9 case 7.
        locked_id, _ = self._seed_yesterday_summary(reviewer_member_key="mayurika")
        session = self.make_session()
        record = session.get(StaffReviewSummary, locked_id)
        record.meeting_date = self.today
        session.commit()
        session.close()
        locked_resp = self.client.put(
            "/api/staff-review-summaries/" + str(locked_id),
            json={"summary_text": "Should still be locked."},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(locked_resp.status_code, 409)

    def test_blank_summary_rejected(self):
        staff_id = self.seed_staff()
        resp = self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": str(staff_id),
                "meeting_date": str(self.today),
                "summary_text": "",
            },
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 422)

    def test_whitespace_only_summary_rejected(self):
        staff_id = self.seed_staff()
        resp = self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": str(staff_id),
                "meeting_date": str(self.today),
                "summary_text": "     \n\t   ",
            },
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 422)

    def test_10000_character_summary_accepted(self):
        staff_id = self.seed_staff()
        resp = self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": str(staff_id),
                "meeting_date": str(self.today),
                "summary_text": "A" * 10000,
            },
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(len(resp.json()["summary_text"]), 10000)

    def test_10001_character_summary_rejected(self):
        staff_id = self.seed_staff()
        resp = self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": str(staff_id),
                "meeting_date": str(self.today),
                "summary_text": "A" * 10001,
            },
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(self.count_summaries(), 0)

    def test_paragraphs_and_line_breaks_preserved(self):
        staff_id = self.seed_staff()
        text = "First paragraph.\n\nSecond paragraph with a line break.\nThird line."
        resp = self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": str(staff_id),
                "meeting_date": str(self.today),
                "summary_text": text,
            },
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["summary_text"], text)

    def test_script_like_content_stored_and_returned_as_text(self):
        staff_id = self.seed_staff()
        text = "<script>alert(1)</script> and <img src=x onerror=alert(2)>"
        resp = self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": str(staff_id),
                "meeting_date": str(self.today),
                "summary_text": text,
            },
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 201)
        summary_id = resp.json()["id"]
        detail = self.client.get(
            "/api/staff-review-summaries/" + summary_id, headers=bearer_header("mayurika")
        )
        # Stored and returned byte-for-byte — no HTML-escaping/corruption
        # at the storage layer; safe rendering is a frontend concern.
        self.assertEqual(detail.json()["summary_text"], text)

    # ── 29-32: Delete prohibition (REQ-CAL-REV-LOCK-004, 2026-08-06) ────
    # No user may delete a Review Summary any more — DELETE now rejects
    # EVERY caller identically (creator, any other reviewer, an
    # "Admin"-equivalent — this app has no admin role, but the rejection
    # is unconditional regardless of identity) with 409
    # review_summary_delete_disabled, never a 200/204, never a row
    # mutation. See backend/routers/staff_review_summaries.py
    # delete_staff_review_summary's docstring for the full rationale.

    def test_owner_delete_is_rejected(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.delete(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("mayurika")
        )
        self.assertEqual(resp.status_code, 409)
        self.assertEqual(resp.json()["error"], "review_summary_delete_disabled")
        record = self.load_summary(summary_id)
        self.assertIsNotNone(record)  # row still physically present
        self.assertIsNone(record.deleted_at)

    def test_cross_reviewer_delete_is_rejected(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.delete(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("suman")
        )
        self.assertEqual(resp.status_code, 409)
        self.assertEqual(resp.json()["error"], "review_summary_delete_disabled")
        record = self.load_summary(summary_id)
        self.assertIsNone(record.deleted_at)

    def test_delete_is_rejected_for_every_valid_reviewer_identity(self):
        """No "Admin" role exists in this app's member set — this proves
        the rejection is truly unconditional (not merely "not the
        creator") by trying every single valid VALID_MEMBER_KEYS identity
        against one record, including its own creator."""
        from backend.config import VALID_MEMBER_KEYS

        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        for member_key in VALID_MEMBER_KEYS:
            resp = self.client.delete(
                "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header(member_key)
            )
            self.assertEqual(resp.status_code, 409, "delete must be rejected for " + member_key)
        record = self.load_summary(summary_id)
        self.assertIsNone(record.deleted_at)

    def test_delete_nonexistent_id_is_also_rejected_not_404(self):
        """The rejection never depends on record existence — it happens
        before any database lookup — so an unknown id gets the same 409,
        never a 404 (which would at least confirm "this id does not
        exist", a distinction the approved rule does not require)."""
        resp = self.client.delete(
            "/api/staff-review-summaries/00000000-0000-0000-0000-000000000000",
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 409)
        self.assertEqual(resp.json()["error"], "review_summary_delete_disabled")

    def test_delete_missing_token_returns_401_not_409(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.delete("/api/staff-review-summaries/" + str(summary_id))
        self.assertEqual(resp.status_code, 401)
        record = self.load_summary(summary_id)
        self.assertIsNone(record.deleted_at)

    def test_delete_invalid_token_returns_401_not_409(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.delete(
            "/api/staff-review-summaries/" + str(summary_id),
            headers={"Authorization": "Bearer not-a-real-token"},
        )
        self.assertEqual(resp.status_code, 401)
        record = self.load_summary(summary_id)
        self.assertIsNone(record.deleted_at)

    def test_delete_response_never_reports_success(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.delete(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("mayurika")
        )
        self.assertNotIn(resp.status_code, (200, 202, 204))
        self.assertNotEqual(resp.json().get("deleted"), True)

    def test_previously_soft_deleted_row_stays_hidden_after_the_delete_prohibition(self):
        """A row soft-deleted before this feature (or seeded directly, per
        soft_delete_summary_directly's docstring) must remain invisible —
        the delete PROHIBITION does not restore it, and it is still
        excluded from list/detail exactly as before."""
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        self.soft_delete_summary_directly(summary_id)
        detail_resp = self.client.get(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("mayurika")
        )
        self.assertEqual(detail_resp.status_code, 404)
        # A DELETE attempt on that same (already-hidden) id is still
        # rejected with 409, never a 404 that would disclose its
        # soft-deleted existence, and never restores it.
        delete_resp = self.client.delete(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("mayurika")
        )
        self.assertEqual(delete_resp.status_code, 409)
        record = self.load_summary(summary_id)
        self.assertIsNotNone(record.deleted_at)

    def test_deleted_record_excluded_from_list_and_detail(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        self.soft_delete_summary_directly(summary_id)
        list_resp = self.client.get(
            "/api/staff-review-summaries", headers=bearer_header("mayurika")
        )
        self.assertEqual(list_resp.json()["records"], [])
        detail_resp = self.client.get(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("mayurika")
        )
        self.assertEqual(detail_resp.status_code, 404)

    def test_deleted_summary_absent_from_another_readers_selected_list_and_detail(self):
        """PHASE 5.17 — a soft-deleted summary stays invisible to every
        reader, not just to its own owner: neither another reviewer's
        ?reviewer_member_key= list nor the shared detail route ever
        surfaces it once deleted_at is set."""
        summary_id, _ = self.seed_summary(reviewer_member_key="arun")
        self.soft_delete_summary_directly(summary_id)
        list_resp = self.client.get(
            "/api/staff-review-summaries",
            params={"reviewer_member_key": "arun"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(list_resp.json()["records"], [])
        detail_resp = self.client.get(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("mayurika")
        )
        self.assertEqual(detail_resp.status_code, 404)

    def test_multiple_same_date_summaries_allowed(self):
        staff_id = self.seed_staff()
        first = self.client.post(
            "/api/staff-review-summaries",
            json={"reviewed_staff_id": str(staff_id), "meeting_date": str(self.today),
                  "summary_text": "First meeting today."},
            headers=bearer_header("mayurika"),
        )
        second = self.client.post(
            "/api/staff-review-summaries",
            json={"reviewed_staff_id": str(staff_id), "meeting_date": str(self.today),
                  "summary_text": "Second meeting, same day."},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertNotEqual(first.json()["id"], second.json()["id"])
        list_resp = self.client.get(
            "/api/staff-review-summaries", headers=bearer_header("mayurika")
        )
        self.assertEqual(list_resp.json()["total"], 2)

    # ── 33: Pagination ───────────────────────────────────────────────

    def test_pagination_default_and_maximum_behavior(self):
        staff_id = self.seed_staff()
        for i in range(3):
            self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                               meeting_date=self.today - timedelta(days=i))
        default_resp = self.client.get(
            "/api/staff-review-summaries", headers=bearer_header("mayurika")
        )
        self.assertEqual(default_resp.json()["limit"], 50)
        self.assertEqual(default_resp.json()["offset"], 0)
        self.assertEqual(len(default_resp.json()["records"]), 3)

        limited_resp = self.client.get(
            "/api/staff-review-summaries", params={"limit": 2},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(len(limited_resp.json()["records"]), 2)
        self.assertEqual(limited_resp.json()["total"], 3)

        over_max_resp = self.client.get(
            "/api/staff-review-summaries", params={"limit": 501},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(over_max_resp.status_code, 422)

    # ── include_all_reviewers (REQ-CAL-REV-TAB-002, 2026-08-06) ─────────
    # Of the 18 required cases for this correction round, items 1
    # (test_reviewer_member_key_omitted_defaults_to_authenticated_reviewer)
    # and 11-18 (test_mayurika_reads_arun_list/test_arun_reads_mayurika_list
    # for the specific-reviewer branch, test_public_list_returns_401,
    # test_invalid_token_list_returns_401,
    # test_reviewer_identity_is_server_derived,
    # test_cross_reviewer_update_returns_404,
    # test_cross_reviewer_delete_returns_404,
    # test_cross_reviewer_detail_is_readable,
    # test_pagination_default_and_maximum_behavior) are already covered
    # above and re-run unmodified by this same test run. The 10 tests below
    # cover items 2-10 — the genuinely new include_all_reviewers behavior.

    def test_include_all_reviewers_requires_reviewed_staff_id(self):
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={"include_all_reviewers": "true"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 422)

    def test_include_all_reviewers_rejects_reviewer_member_key_combination(self):
        staff_id = self.seed_staff()
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={
                "include_all_reviewers": "true",
                "reviewed_staff_id": str(staff_id),
                "reviewer_member_key": "arun",
            },
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 422)

    def test_all_reviewer_query_returns_records_from_multiple_reviewers_for_one_employee(self):
        staff_id = self.seed_staff(source_record_key="staff-all-reviewers")
        summary_a_id, _ = self.seed_summary(
            reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
            summary_text="Mayurika's summary.",
        )
        summary_b_id, _ = self.seed_summary(
            reviewer_member_key="arun", reviewed_staff_id=staff_id,
            summary_text="Arun's summary.",
        )
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={"include_all_reviewers": "true", "reviewed_staff_id": str(staff_id)},
            headers=bearer_header("suman"),
        )
        self.assertEqual(resp.status_code, 200)
        ids = set(r["id"] for r in resp.json()["records"])
        self.assertEqual(ids, {str(summary_a_id), str(summary_b_id)})

    def test_all_reviewer_query_excludes_records_for_another_employee(self):
        staff_a = self.seed_staff(source_record_key="staff-all-a")
        staff_b = self.seed_staff(source_record_key="staff-all-b")
        summary_a_id, _ = self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_a)
        self.seed_summary(reviewer_member_key="arun", reviewed_staff_id=staff_b)
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={"include_all_reviewers": "true", "reviewed_staff_id": str(staff_a)},
            headers=bearer_header("suman"),
        )
        self.assertEqual(resp.status_code, 200)
        ids = [r["id"] for r in resp.json()["records"]]
        self.assertEqual(ids, [str(summary_a_id)])

    def test_all_reviewer_query_excludes_deleted_records(self):
        staff_id = self.seed_staff(source_record_key="staff-all-deleted")
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id)
        self.soft_delete_summary_directly(summary_id)
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={"include_all_reviewers": "true", "reviewed_staff_id": str(staff_id)},
            headers=bearer_header("suman"),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["records"], [])

    def test_all_reviewer_query_respects_date_from(self):
        staff_id = self.seed_staff(source_record_key="staff-all-datefrom")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                           meeting_date=self.today - timedelta(days=10))
        in_range_id, _ = self.seed_summary(reviewer_member_key="arun", reviewed_staff_id=staff_id,
                                            meeting_date=self.today)
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={
                "include_all_reviewers": "true", "reviewed_staff_id": str(staff_id),
                "date_from": str(self.today - timedelta(days=1)),
            },
            headers=bearer_header("suman"),
        )
        ids = [r["id"] for r in resp.json()["records"]]
        self.assertEqual(ids, [str(in_range_id)])

    def test_all_reviewer_query_respects_date_to(self):
        staff_id = self.seed_staff(source_record_key="staff-all-dateto")
        in_range_id, _ = self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                                            meeting_date=self.today - timedelta(days=10))
        self.seed_summary(reviewer_member_key="arun", reviewed_staff_id=staff_id,
                           meeting_date=self.today)
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={
                "include_all_reviewers": "true", "reviewed_staff_id": str(staff_id),
                "date_to": str(self.today - timedelta(days=1)),
            },
            headers=bearer_header("suman"),
        )
        ids = [r["id"] for r in resp.json()["records"]]
        self.assertEqual(ids, [str(in_range_id)])

    def test_all_reviewer_query_respects_both_dates(self):
        staff_id = self.seed_staff(source_record_key="staff-all-bothdates")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                           meeting_date=self.today - timedelta(days=20))
        in_range_id, _ = self.seed_summary(reviewer_member_key="arun", reviewed_staff_id=staff_id,
                                            meeting_date=self.today - timedelta(days=5))
        self.seed_summary(reviewer_member_key="rajiv", reviewed_staff_id=staff_id,
                           meeting_date=self.today)
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={
                "include_all_reviewers": "true", "reviewed_staff_id": str(staff_id),
                "date_from": str(self.today - timedelta(days=10)),
                "date_to": str(self.today - timedelta(days=1)),
            },
            headers=bearer_header("suman"),
        )
        ids = [r["id"] for r in resp.json()["records"]]
        self.assertEqual(ids, [str(in_range_id)])

    def test_all_reviewer_ordering_remains_correct(self):
        staff_id = self.seed_staff(source_record_key="staff-all-order")
        older_id, _ = self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                                         meeting_date=self.today - timedelta(days=5))
        newer_id, _ = self.seed_summary(reviewer_member_key="arun", reviewed_staff_id=staff_id,
                                         meeting_date=self.today)
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={"include_all_reviewers": "true", "reviewed_staff_id": str(staff_id)},
            headers=bearer_header("suman"),
        )
        ids = [r["id"] for r in resp.json()["records"]]
        self.assertEqual(ids, [str(newer_id), str(older_id)])

    def test_all_reviewer_query_still_requires_a_valid_token(self):
        staff_id = self.seed_staff(source_record_key="staff-all-notoken")
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={"include_all_reviewers": "true", "reviewed_staff_id": str(staff_id)},
        )
        self.assertEqual(resp.status_code, 401)

    # ── PDF export route (REQ-CAL-REV-PDF-003 Gate B) ─────────────────
    # HTTP-level tests only — PDF content/filename/reviewer-identity
    # coverage lives in backend/tests/test_review_summary_pdf_export.py,
    # exercising the pure build_review_summary_pdf()/resolve_reviewer()
    # functions directly, mirroring the existing xlsx_export.py/
    # member_schedules.py test-file split.

    def export_pdf(self, params, member_key="mayurika", omit_token=False):
        headers = None if omit_token else bearer_header(member_key)
        return self.client.get(
            "/api/staff-review-summaries/export/pdf", params=params, headers=headers
        )

    # Authorization

    def test_export_missing_token_returns_401(self):
        staff_id = self.seed_staff(source_record_key="pdf-auth-1")
        resp = self.export_pdf({"reviewed_staff_id": str(staff_id), "include_all_reviewers": "true"}, omit_token=True)
        self.assertEqual(resp.status_code, 401)

    def test_export_invalid_token_returns_401(self):
        staff_id = self.seed_staff(source_record_key="pdf-auth-2")
        resp = self.client.get(
            "/api/staff-review-summaries/export/pdf",
            params={"reviewed_staff_id": str(staff_id), "include_all_reviewers": "true"},
            headers={"Authorization": "Bearer not-a-real-token"},
        )
        self.assertEqual(resp.status_code, 401)

    def test_export_authenticated_shared_reader_can_export(self):
        staff_id = self.seed_staff(source_record_key="pdf-auth-3")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id)
        resp = self.export_pdf(
            {"reviewed_staff_id": str(staff_id), "include_all_reviewers": "true"}, member_key="suman",
        )
        self.assertEqual(resp.status_code, 200)

    def test_export_does_not_require_ownership_of_any_returned_record(self):
        staff_id = self.seed_staff(source_record_key="pdf-auth-4")
        self.seed_summary(reviewer_member_key="arun", reviewed_staff_id=staff_id)
        resp = self.export_pdf(
            {"reviewed_staff_id": str(staff_id), "reviewer_member_key": "arun"}, member_key="rajiv",
        )
        self.assertEqual(resp.status_code, 200)

    def test_export_leaves_existing_owner_only_mutations_unchanged(self):
        summary_id, staff_id = self.seed_summary(reviewer_member_key="mayurika")
        cross_update = self.client.put(
            "/api/staff-review-summaries/" + str(summary_id),
            json={"summary_text": "Attempted cross-reviewer edit."},
            headers=bearer_header("arun"),
        )
        self.assertEqual(cross_update.status_code, 404)

    # Filters

    def test_export_requires_reviewed_staff_id(self):
        resp = self.export_pdf({"include_all_reviewers": "true"})
        self.assertEqual(resp.status_code, 422)

    def test_export_all_reviewers_includes_multiple_reviewers(self):
        staff_id = self.seed_staff(source_record_key="pdf-filter-all")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id, summary_text="A")
        self.seed_summary(reviewer_member_key="arun", reviewed_staff_id=staff_id, summary_text="B")
        resp = self.export_pdf({"reviewed_staff_id": str(staff_id), "include_all_reviewers": "true"})
        self.assertEqual(resp.status_code, 200)
        reader = PdfReader(BytesIO(resp.content))
        text = "\n".join(p.extract_text() or "" for p in reader.pages)
        self.assertIn("Mayurika", text)
        self.assertIn("Arun", text)

    def test_export_specific_reviewer_includes_only_that_reviewer(self):
        staff_id = self.seed_staff(source_record_key="pdf-filter-specific")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id, summary_text="A")
        self.seed_summary(reviewer_member_key="arun", reviewed_staff_id=staff_id, summary_text="B")
        resp = self.export_pdf({"reviewed_staff_id": str(staff_id), "reviewer_member_key": "arun"})
        self.assertEqual(resp.status_code, 200)
        reader = PdfReader(BytesIO(resp.content))
        text = "\n".join(p.extract_text() or "" for p in reader.pages)
        self.assertIn("Arun", text)
        self.assertNotIn("Mayurika", text)

    def test_export_excludes_another_employee(self):
        staff_a = self.seed_staff(source_record_key="pdf-filter-emp-a")
        staff_b = self.seed_staff(source_record_key="pdf-filter-emp-b")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_a, summary_text="Employee A summary")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_b, summary_text="Employee B summary")
        resp = self.export_pdf({"reviewed_staff_id": str(staff_a), "include_all_reviewers": "true"})
        reader = PdfReader(BytesIO(resp.content))
        text = "\n".join(p.extract_text() or "" for p in reader.pages)
        self.assertIn("Employee A summary", text)
        self.assertNotIn("Employee B summary", text)

    def test_export_date_from_works(self):
        staff_id = self.seed_staff(source_record_key="pdf-filter-datefrom")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                           meeting_date=self.today - timedelta(days=10), summary_text="Old")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                           meeting_date=self.today, summary_text="Recent")
        resp = self.export_pdf({
            "reviewed_staff_id": str(staff_id), "include_all_reviewers": "true",
            "date_from": str(self.today - timedelta(days=1)),
        })
        text = "\n".join(p.extract_text() or "" for p in PdfReader(BytesIO(resp.content)).pages)
        self.assertIn("Recent", text)
        self.assertNotIn("Old", text)

    def test_export_date_to_works(self):
        staff_id = self.seed_staff(source_record_key="pdf-filter-dateto")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                           meeting_date=self.today - timedelta(days=10), summary_text="Old")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                           meeting_date=self.today, summary_text="Recent")
        resp = self.export_pdf({
            "reviewed_staff_id": str(staff_id), "include_all_reviewers": "true",
            "date_to": str(self.today - timedelta(days=1)),
        })
        text = "\n".join(p.extract_text() or "" for p in PdfReader(BytesIO(resp.content)).pages)
        self.assertIn("Old", text)
        self.assertNotIn("Recent", text)

    def test_export_both_dates_work(self):
        staff_id = self.seed_staff(source_record_key="pdf-filter-bothdates")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                           meeting_date=self.today - timedelta(days=20), summary_text="TooOld")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                           meeting_date=self.today - timedelta(days=5), summary_text="InRange")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                           meeting_date=self.today, summary_text="TooNew")
        resp = self.export_pdf({
            "reviewed_staff_id": str(staff_id), "include_all_reviewers": "true",
            "date_from": str(self.today - timedelta(days=10)),
            "date_to": str(self.today - timedelta(days=1)),
        })
        text = "\n".join(p.extract_text() or "" for p in PdfReader(BytesIO(resp.content)).pages)
        self.assertIn("InRange", text)
        self.assertNotIn("TooOld", text)
        self.assertNotIn("TooNew", text)

    def test_export_no_dates_includes_complete_active_history(self):
        staff_id = self.seed_staff(source_record_key="pdf-filter-nodate")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                           meeting_date=self.today - timedelta(days=200), summary_text="Ancient")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                           meeting_date=self.today, summary_text="Current")
        resp = self.export_pdf({"reviewed_staff_id": str(staff_id), "include_all_reviewers": "true"})
        text = "\n".join(p.extract_text() or "" for p in PdfReader(BytesIO(resp.content)).pages)
        self.assertIn("Ancient", text)
        self.assertIn("Current", text)

    def test_export_excludes_deleted_records(self):
        staff_id = self.seed_staff(source_record_key="pdf-filter-deleted")
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
                                           summary_text="ToBeDeleted")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id, summary_text="Stays")
        self.soft_delete_summary_directly(summary_id)
        resp = self.export_pdf({"reviewed_staff_id": str(staff_id), "include_all_reviewers": "true"})
        text = "\n".join(p.extract_text() or "" for p in PdfReader(BytesIO(resp.content)).pages)
        self.assertIn("Stays", text)
        self.assertNotIn("ToBeDeleted", text)

    def test_export_invalid_reviewer_mode_combination_fails(self):
        staff_id = self.seed_staff(source_record_key="pdf-filter-invalidcombo")
        resp = self.export_pdf({
            "reviewed_staff_id": str(staff_id), "include_all_reviewers": "true", "reviewer_member_key": "arun",
        })
        self.assertEqual(resp.status_code, 422)

    # Routing

    def test_export_route_reaches_export_handler(self):
        staff_id = self.seed_staff(source_record_key="pdf-route-1")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id)
        resp = self.export_pdf({"reviewed_staff_id": str(staff_id), "include_all_reviewers": "true"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers.get("content-type"), "application/pdf")

    def test_export_path_is_not_interpreted_as_summary_id(self):
        # A 422 UUID-parse error here would mean /{summary_id} captured
        # the request instead of /export/pdf — confirms it did not.
        staff_id = self.seed_staff(source_record_key="pdf-route-2")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id)
        resp = self.export_pdf({"reviewed_staff_id": str(staff_id), "include_all_reviewers": "true"})
        self.assertNotEqual(resp.status_code, 422)

    def test_existing_uuid_detail_route_still_works(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.get(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("mayurika")
        )
        self.assertEqual(resp.status_code, 200)

    def test_invalid_detail_id_retains_current_behavior(self):
        resp = self.client.get(
            "/api/staff-review-summaries/not-a-uuid", headers=bearer_header("mayurika")
        )
        self.assertEqual(resp.status_code, 422)

    def test_openapi_includes_export_route_exactly_once(self):
        resp = self.client.get("/openapi.json")
        self.assertEqual(resp.status_code, 200)
        paths = resp.json()["paths"]
        matching = [p for p in paths if p == "/api/staff-review-summaries/export/pdf"]
        self.assertEqual(len(matching), 1)

    # Response

    def test_export_success_status_is_200(self):
        staff_id = self.seed_staff(source_record_key="pdf-resp-1")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id)
        resp = self.export_pdf({"reviewed_staff_id": str(staff_id), "include_all_reviewers": "true"})
        self.assertEqual(resp.status_code, 200)

    def test_export_content_disposition_is_attachment(self):
        staff_id = self.seed_staff(source_record_key="pdf-resp-2")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id)
        resp = self.export_pdf({"reviewed_staff_id": str(staff_id), "include_all_reviewers": "true"})
        self.assertTrue(resp.headers.get("content-disposition", "").startswith("attachment;"))

    def test_export_cache_control_includes_no_store(self):
        staff_id = self.seed_staff(source_record_key="pdf-resp-3")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id)
        resp = self.export_pdf({"reviewed_staff_id": str(staff_id), "include_all_reviewers": "true"})
        self.assertIn("no-store", resp.headers.get("cache-control", ""))

    def test_export_bytes_begin_with_pdf_signature(self):
        staff_id = self.seed_staff(source_record_key="pdf-resp-4")
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id)
        resp = self.export_pdf({"reviewed_staff_id": str(staff_id), "include_all_reviewers": "true"})
        self.assertTrue(resp.content.startswith(b"%PDF-"))

    def test_export_empty_result_returns_404(self):
        staff_id = self.seed_staff(source_record_key="pdf-resp-empty")
        resp = self.export_pdf({"reviewed_staff_id": str(staff_id), "include_all_reviewers": "true"})
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(resp.json()["detail"], "No review summaries match the selected filters.")

    def test_export_empty_result_returns_no_pdf_bytes(self):
        staff_id = self.seed_staff(source_record_key="pdf-resp-empty-2")
        resp = self.export_pdf({"reviewed_staff_id": str(staff_id), "include_all_reviewers": "true"})
        self.assertNotEqual(resp.headers.get("content-type"), "application/pdf")
        self.assertFalse(resp.content.startswith(b"%PDF-"))

    # Regression

    def test_export_addition_leaves_list_filtering_unchanged(self):
        staff_id = self.seed_staff(source_record_key="pdf-regression-list")
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id)
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={"reviewed_staff_id": str(staff_id)},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual([r["id"] for r in resp.json()["records"]], [str(summary_id)])

    def test_export_addition_leaves_create_ownership_unchanged(self):
        staff_id = self.seed_staff(source_record_key="pdf-regression-create")
        resp = self.client.post(
            "/api/staff-review-summaries",
            json={"reviewed_staff_id": str(staff_id), "meeting_date": str(self.today), "summary_text": "Regression check."},
            headers=bearer_header("arun"),
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["reviewer_member_key"], "arun")

    def test_export_addition_leaves_detail_shared_read_unchanged(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.get(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("suman")
        )
        self.assertEqual(resp.status_code, 200)

    def test_export_addition_leaves_delete_ownership_unchanged(self):
        """Delete is rejected identically for a cross-reviewer and for the
        owner alike (REQ-CAL-REV-LOCK-004 superseded the prior owner-only
        soft-delete rule this test originally exercised) — both now 409,
        never a 200."""
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        cross_delete = self.client.delete(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("arun")
        )
        self.assertEqual(cross_delete.status_code, 409)
        owner_delete = self.client.delete(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("mayurika")
        )
        self.assertEqual(owner_delete.status_code, 409)

    # ── 34-36: Regression — existing Task/Leave/auth behavior untouched ──

    def test_existing_task_api_regression(self):
        resp = self.client.post(
            "/api/member-schedules/mayurika",
            json={"date": str(self.today), "title": "Regression check task", "priority": "Medium"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 201)
        list_resp = self.client.get("/api/member-schedules/mayurika")
        self.assertEqual(list_resp.status_code, 200)

    def test_existing_leave_api_regression(self):
        resp = self.client.post(
            "/api/member-leave/mayurika",
            json={"leave_type": "Full-Day", "start_date": str(self.today + timedelta(days=20))},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 201)
        list_resp = self.client.get("/api/member-leave/mayurika")
        self.assertEqual(list_resp.status_code, 200)

    def test_existing_calendar_authorization_regression(self):
        # Public GET on Task/Leave stays unauthenticated (unlike Staff
        # Review Summaries' GET, which requires a token) — confirms this
        # feature's stricter GET-auth rule was not accidentally applied
        # to the existing routes.
        task_list = self.client.get("/api/member-schedules/mayurika")
        self.assertEqual(task_list.status_code, 200)
        leave_list = self.client.get("/api/member-leave/mayurika")
        self.assertEqual(leave_list.status_code, 200)
        # Cross-member mutation on the existing Task route is still 403,
        # not the new feature's 404-non-disclosing convention.
        resp = self.client.post(
            "/api/member-schedules/suman",
            json={"date": str(self.today), "title": "Cross member", "priority": "Medium"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 403)


if __name__ == "__main__":
    unittest.main()

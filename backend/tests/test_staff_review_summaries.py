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

from fastapi.testclient import TestClient

from backend.database import get_db
from backend.main import app
from backend.models import MemberLeaveRecord, MemberScheduleEvent, StaffDashboardRecord, StaffReviewSummary
from backend.schemas import StaffRecordOut
from backend.tests.calendar_auth_test_support import (
    bearer_header,
    make_sqlite_engine_and_session_factory,
    patched_calendar_auth_env,
)


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
                      meeting_date=None, summary_text="Seed summary text."):
        if reviewed_staff_id is None:
            reviewed_staff_id = self.seed_staff()
        session = self.make_session()
        now = datetime.now(timezone.utc)
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

        # Cross-reviewer update/delete on the same shared-staff summaries
        # also return the non-disclosing 404 (not a 403 that would leak
        # existence), and never mutate the other reviewer's row.
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
        self.assertEqual(delete_resp.status_code, 404)

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
        including its own owner, not just for other reviewers."""
        summary_id, _ = self.seed_summary(reviewer_member_key="arun")
        self.client.delete(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("arun")
        )
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

    # ── 29-32: Delete / soft-delete semantics ──────────────────────────

    def test_owner_soft_delete_succeeds(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.delete(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("mayurika")
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"id": str(summary_id), "deleted": True})
        record = self.load_summary(summary_id)
        self.assertIsNotNone(record)  # row still physically present
        self.assertIsNotNone(record.deleted_at)

    def test_cross_reviewer_delete_returns_404(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.delete(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("suman")
        )
        self.assertEqual(resp.status_code, 404)
        record = self.load_summary(summary_id)
        self.assertIsNone(record.deleted_at)

    def test_deleted_record_excluded_from_list_and_detail(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        self.client.delete(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("mayurika")
        )
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
        self.client.delete(
            "/api/staff-review-summaries/" + str(summary_id), headers=bearer_header("arun")
        )
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

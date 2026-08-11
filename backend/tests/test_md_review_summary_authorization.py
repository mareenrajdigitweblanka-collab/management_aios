"""HTTP-level tests for MD Read-Only Review Summary Authorization
(REQ-CAL-REV-MD-READ-006, 2026-08-06).

Uses fastapi.testclient.TestClient against the real app (backend.main.app)
— see backend/tests/calendar_auth_test_support.py — so every request here
goes through FastAPI's real routing and dependency injection (including
require_matching_member's 403 check and _reject_md_write's 403 check),
never a direct Python function call. Setup-only data (seeding a staff row,
a review summary, a Task, or a Leave record) is written directly via a
SQLAlchemy session against the same in-memory SQLite database the
TestClient's overridden get_db serves, matching the existing
backend/tests/test_staff_review_summaries.py and
backend/tests/test_calendar_mutation_authorization.py conventions.

MD's token is OPTIONAL config (backend/config.py
load_md_review_summary_token_hash) — most test classes below opt into
include_md=True on patched_calendar_auth_env so MD's token is configured;
MdAuthenticationTests also exercises the unconfigured/placeholder cases
explicitly, where include_md is deliberately left False or overridden.

Run with: python -m unittest backend.tests.test_md_review_summary_authorization
"""

import unittest
import zlib
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from backend.config import (
    MD_CALENDAR_AUTH_TOKEN_ENV_VAR,
    MD_DISPLAY_LABEL,
    MD_MEMBER_KEY,
    MEMBER_DIRECTORY,
    MEMBER_LABELS,
    VALID_MEMBER_KEYS,
)
from backend.database import get_db
from backend.main import app
from backend.models import (
    MemberLeaveRecord,
    MemberScheduleEvent,
    StaffDashboardRecord,
    StaffReviewSummary,
)
from backend.tests.calendar_auth_test_support import (
    MD_TEST_TOKEN,
    TEST_TOKENS,
    bearer_header,
    make_sqlite_engine_and_session_factory,
    patched_calendar_auth_env,
    sha256_hex,
)
from backend.time_utils import colombo_today


class MdAuthorizationTestCase(unittest.TestCase):
    """Fresh, isolated in-memory SQLite database per test method, wired
    into the real app via a get_db dependency override — no cross-test
    data leakage, no shared state, no real network connection, and no
    production review record is ever created by this file.

    Defaults to include_md=True (MD's token configured) — the exceptions
    are in MdAuthenticationTests, which deliberately overrides self.env_ctx
    per test to exercise the unconfigured/placeholder/missing cases."""

    include_md = True

    def setUp(self):
        self.engine, self.SessionLocal = make_sqlite_engine_and_session_factory()

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.env_ctx = patched_calendar_auth_env(include_md=self.include_md)
        self.env_ctx.__enter__()
        self.client_ctx = TestClient(app)
        self.client = self.client_ctx.__enter__()
        self.today = colombo_today()

    def tearDown(self):
        self.client_ctx.__exit__(None, None, None)
        self.env_ctx.__exit__(None, None, None)
        app.dependency_overrides.clear()
        self.engine.dispose()

    def make_session(self):
        return self.SessionLocal()

    # ── Seed helpers (mirrors test_staff_review_summaries.py /
    #    test_calendar_mutation_authorization.py exactly) ─────────────────

    def seed_staff(self, source_record_key="md-staff-001", full_name="MD Test Staff"):
        """2026-08-11: StaffDashboardRecord is now an exact mirror of
        employee_management.staff (Ledsone) — see backend/models.py
        StaffDashboardRecord docstring and test_staff_review_summaries.py's
        own seed_staff for the full rationale. `source_record_key` is kept
        as this helper's parameter name (unchanged call sites) purely as a
        label deterministically hashed into a unique integer id."""
        session = self.make_session()
        now = datetime.now(timezone.utc)
        staff = StaffDashboardRecord(
            id=zlib.crc32(source_record_key.encode("utf-8")),
            staff_code="DWL-" + source_record_key,
            name=full_name,
            synced_at=now,
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

    def soft_delete_summary_directly(self, summary_id):
        session = self.make_session()
        record = session.get(StaffReviewSummary, summary_id)
        record.deleted_at = datetime.now(timezone.utc)
        session.commit()
        session.close()

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

    def seed_task(self, member_key="mayurika", event_date=None, title="Seed task"):
        session = self.make_session()
        now = datetime.now(timezone.utc)
        task = MemberScheduleEvent(
            member_key=member_key,
            member_label=MEMBER_LABELS[member_key],
            event_date=event_date or self.today,
            title=title,
            category="Scheduled Task",
            priority="Medium",
            source_scope="dashboard_testing",
            is_official_truth=False,
            created_at=now,
            updated_at=now,
        )
        session.add(task)
        session.commit()
        session.refresh(task)
        task_id = task.id
        session.close()
        return task_id

    def seed_leave(self, member_key="mayurika", start_date=None):
        session = self.make_session()
        now = datetime.now(timezone.utc)
        record = MemberLeaveRecord(
            member_key=member_key,
            member_label=MEMBER_LABELS[member_key],
            leave_type="Full-Day",
            start_date=start_date or (self.today + timedelta(days=20)),
            end_date=start_date or (self.today + timedelta(days=20)),
            coordination_copy_only=True,
            policy_source_id="SRC-POLICY-001",
            effective_leave_minutes=540,
            created_at=now,
            updated_at=now,
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        leave_id = record.id
        session.close()
        return leave_id

    def count_tasks(self, member_key):
        session = self.make_session()
        count = (
            session.query(MemberScheduleEvent)
            .filter(
                MemberScheduleEvent.member_key == member_key,
                MemberScheduleEvent.deleted_at.is_(None),
            )
            .count()
        )
        session.close()
        return count

    def count_leave(self, member_key):
        session = self.make_session()
        count = (
            session.query(MemberLeaveRecord)
            .filter(
                MemberLeaveRecord.member_key == member_key,
                MemberLeaveRecord.deleted_at.is_(None),
            )
            .count()
        )
        session.close()
        return count

    def load_task(self, task_id):
        session = self.make_session()
        task = session.get(MemberScheduleEvent, task_id)
        session.expunge(task)
        session.close()
        return task


# ── Authentication (Phase 9 items 1-5) ──────────────────────────────────
class MdAuthenticationTests(MdAuthorizationTestCase):
    def test_configured_valid_md_token_authenticates(self):
        resp = self.client.post("/api/calendar-auth/verify", headers=bearer_header(MD_MEMBER_KEY))
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["memberKey"], "md")
        self.assertEqual(body["displayLabel"], MD_DISPLAY_LABEL)

    def test_invalid_md_token_fails(self):
        resp = self.client.post(
            "/api/calendar-auth/verify",
            headers={"Authorization": "Bearer not-the-real-md-token"},
        )
        self.assertEqual(resp.status_code, 401)

    def test_missing_md_env_var_fails_closed(self):
        self.env_ctx.__exit__(None, None, None)
        self.env_ctx = patched_calendar_auth_env(include_md=False)
        self.env_ctx.__enter__()
        resp = self.client.post("/api/calendar-auth/verify", headers=bearer_header(MD_MEMBER_KEY))
        self.assertEqual(resp.status_code, 401)

    def test_placeholder_md_value_is_not_accepted(self):
        self.env_ctx.__exit__(None, None, None)
        self.env_ctx = patched_calendar_auth_env(
            extra_overrides={MD_CALENDAR_AUTH_TOKEN_ENV_VAR: "set_a_real_token_hash_here"}
        )
        self.env_ctx.__enter__()
        resp = self.client.post("/api/calendar-auth/verify", headers=bearer_header(MD_MEMBER_KEY))
        self.assertEqual(resp.status_code, 401)

    def test_existing_five_tokens_remain_valid_with_md_configured(self):
        for member_key in TEST_TOKENS:
            resp = self.client.post("/api/calendar-auth/verify", headers=bearer_header(member_key))
            self.assertEqual(resp.status_code, 200, member_key)
            self.assertEqual(resp.json()["memberKey"], member_key)


# ── Read access (Phase 9 items 6-13) ────────────────────────────────────
class MdReadAccessTests(MdAuthorizationTestCase):
    def test_md_can_list_summaries(self):
        staff_id = self.seed_staff()
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id)
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={"reviewed_staff_id": str(staff_id), "include_all_reviewers": "true"},
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["total"], 1)

    def test_md_can_read_detail(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="arun")
        resp = self.client.get(
            "/api/staff-review-summaries/" + str(summary_id),
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["reviewer_member_key"], "arun")
        self.assertFalse(resp.json()["can_edit"])

    def test_md_can_use_all_reviewers_mode(self):
        staff_id = self.seed_staff()
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id)
        self.seed_summary(reviewer_member_key="suman", reviewed_staff_id=staff_id)
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={"reviewed_staff_id": str(staff_id), "include_all_reviewers": "true"},
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["total"], 2)

    def test_md_can_use_specific_reviewer_filter(self):
        staff_id = self.seed_staff()
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id)
        self.seed_summary(reviewer_member_key="suman", reviewed_staff_id=staff_id)
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={"reviewed_staff_id": str(staff_id), "reviewer_member_key": "suman"},
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["total"], 1)
        self.assertEqual(body["records"][0]["reviewer_member_key"], "suman")

    def test_md_can_use_from_to_filters(self):
        staff_id = self.seed_staff()
        self.seed_summary(
            reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
            meeting_date=self.today - timedelta(days=30),
        )
        self.seed_summary(
            reviewer_member_key="mayurika", reviewed_staff_id=staff_id,
            meeting_date=self.today,
        )
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={
                "reviewed_staff_id": str(staff_id),
                "reviewer_member_key": "mayurika",
                "date_from": str(self.today - timedelta(days=1)),
                "date_to": str(self.today),
            },
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["total"], 1)

    def test_md_can_export_pdf(self):
        staff_id = self.seed_staff()
        self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id)
        resp = self.client.get(
            "/api/staff-review-summaries/export/pdf",
            params={"reviewed_staff_id": str(staff_id), "include_all_reviewers": "true"},
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers.get("content-type"), "application/pdf")
        self.assertTrue(resp.content.startswith(b"%PDF-"))
        self.assertEqual(resp.headers.get("cache-control"), "no-store")

    def test_soft_deleted_summaries_remain_hidden_from_md(self):
        staff_id = self.seed_staff()
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika", reviewed_staff_id=staff_id)
        self.soft_delete_summary_directly(summary_id)
        resp = self.client.get(
            "/api/staff-review-summaries",
            params={"reviewed_staff_id": str(staff_id), "include_all_reviewers": "true"},
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["total"], 0)

        detail_resp = self.client.get(
            "/api/staff-review-summaries/" + str(summary_id),
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(detail_resp.status_code, 404)

    def test_md_can_access_minimal_employee_lookup(self):
        """GET /api/staff is the SAME staff selector endpoint Review
        Summaries already uses for every member — REQ-CAL-REV-MD-READ-006
        adds no new endpoint and no new field projection. It now requires
        authentication for every caller (REQ-AUTH-MODULES-007,
        2026-08-10); MD's Authorization header satisfies that exactly like
        any other authenticated Management Team member's would."""
        self.seed_staff(full_name="Lookup Target")
        resp = self.client.get(
            "/api/staff",
            params={"search": "Lookup Target"},
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()["records"]), 1)


# ── Write prohibition (Phase 9 items 14-19) ─────────────────────────────
class MdWriteProhibitionTests(MdAuthorizationTestCase):
    def test_md_cannot_create(self):
        staff_id = self.seed_staff()
        before = self.count_summaries()
        resp = self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": str(staff_id),
                "meeting_date": str(self.today),
                "summary_text": "MD attempting to create.",
            },
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(resp.json()["detail"]["error"], "review_summary_read_only_member")
        self.assertEqual(self.count_summaries(), before)

    def test_md_cannot_update(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika", summary_text="Original text.")
        resp = self.client.put(
            "/api/staff-review-summaries/" + str(summary_id),
            json={"summary_text": "MD attempting to edit."},
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(resp.json()["detail"]["error"], "review_summary_read_only_member")
        self.assertEqual(self.load_summary(summary_id).summary_text, "Original text.")

    def test_md_cannot_bypass_update_via_reviewer_member_key(self):
        """StaffReviewSummaryUpdate has no reviewer_member_key field at
        all, so there is nothing to "send" to bypass ownership with — this
        confirms the payload is silently ignored/rejected by the schema
        and MD still gets the same 403, never a 200 with a spoofed
        identity."""
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika", summary_text="Original text.")
        resp = self.client.put(
            "/api/staff-review-summaries/" + str(summary_id),
            json={"summary_text": "Spoofed.", "reviewer_member_key": "md"},
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(self.load_summary(summary_id).reviewer_member_key, "mayurika")
        self.assertEqual(self.load_summary(summary_id).summary_text, "Original text.")

    def test_md_cannot_call_another_members_update_route(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="suman", summary_text="Suman's original text.")
        resp = self.client.put(
            "/api/staff-review-summaries/" + str(summary_id),
            json={"summary_text": "MD editing Suman's record."},
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(self.load_summary(summary_id).summary_text, "Suman's original text.")

    def test_md_cannot_delete_global_no_delete_behavior_unchanged(self):
        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.delete(
            "/api/staff-review-summaries/" + str(summary_id),
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(resp.status_code, 409)
        self.assertEqual(resp.json()["error"], "review_summary_delete_disabled")
        self.assertIsNotNone(self.load_summary(summary_id))
        self.assertIsNone(self.load_summary(summary_id).deleted_at)

    def test_no_row_changes_after_prohibited_requests(self):
        staff_id = self.seed_staff()
        summary_id, _ = self.seed_summary(
            reviewer_member_key="mayurika", reviewed_staff_id=staff_id, summary_text="Untouched."
        )
        before_count = self.count_summaries()

        self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": str(staff_id),
                "meeting_date": str(self.today),
                "summary_text": "Should never be created.",
            },
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.client.put(
            "/api/staff-review-summaries/" + str(summary_id),
            json={"summary_text": "Should never apply."},
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.client.delete(
            "/api/staff-review-summaries/" + str(summary_id),
            headers=bearer_header(MD_MEMBER_KEY),
        )

        self.assertEqual(self.count_summaries(), before_count)
        reloaded = self.load_summary(summary_id)
        self.assertEqual(reloaded.summary_text, "Untouched.")
        self.assertIsNone(reloaded.deleted_at)


# ── Unrelated permissions (Phase 9 items 20-26) ─────────────────────────
class MdUnrelatedPermissionsTests(MdAuthorizationTestCase):
    def test_md_cannot_create_member_schedule_for_own_key(self):
        # "md" is not in VALID_MEMBER_KEYS at all — the {member_key} URL
        # segment itself is rejected (member_schedules.py
        # _validate_member_key, 404 "Unknown member_key") before
        # require_matching_member ever runs.
        resp = self.client.post(
            "/api/member-schedules/md",
            json={"date": str(self.today), "title": "MD's own task", "priority": "Medium"},
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(resp.status_code, 404)
        self.assertEqual(self.count_tasks("md"), 0)

    def test_md_cannot_create_member_schedule_for_real_member(self):
        resp = self.client.post(
            "/api/member-schedules/mayurika",
            json={"date": str(self.today), "title": "MD creating for Mayurika", "priority": "Medium"},
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(self.count_tasks("mayurika"), 0)

    def test_md_cannot_update_member_schedule(self):
        task_id = self.seed_task(member_key="mayurika", title="Original title")
        resp = self.client.put(
            "/api/member-schedules/mayurika/" + str(task_id),
            json={"title": "MD hijacked title"},
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(self.load_task(task_id).title, "Original title")

    def test_md_cannot_delete_member_schedule(self):
        task_id = self.seed_task(member_key="mayurika")
        resp = self.client.delete(
            "/api/member-schedules/mayurika/" + str(task_id),
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(self.count_tasks("mayurika"), 1)

    def test_md_cannot_invoke_task_bulk_create(self):
        resp = self.client.post(
            "/api/member-schedules/mayurika/bulk",
            json={"tasks": [{"date": str(self.today), "title": "Bulk row", "priority": "Medium"}]},
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(self.count_tasks("mayurika"), 0)

    def test_md_cannot_invoke_leave_mutations(self):
        create_resp = self.client.post(
            "/api/member-leave/mayurika",
            json={
                "leave_type": "Full-Day",
                "start_date": str(self.today + timedelta(days=20)),
                "end_date": str(self.today + timedelta(days=20)),
            },
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(create_resp.status_code, 403)
        self.assertEqual(self.count_leave("mayurika"), 0)

        leave_id = self.seed_leave(member_key="mayurika")
        update_resp = self.client.put(
            "/api/member-leave/mayurika/" + str(leave_id),
            json={"leave_type": "Half-Day First"},
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(update_resp.status_code, 403)

        delete_resp = self.client.delete(
            "/api/member-leave/mayurika/" + str(leave_id),
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(delete_resp.status_code, 403)
        self.assertEqual(self.count_leave("mayurika"), 1)

    def test_md_cannot_gain_admin_only_authority(self):
        """This codebase has no Admin role at all (see
        backend/routers/staff_review_summaries.py delete_staff_review_
        summary's own docstring: "No Admin override exists (none ever
        did)"). Confirms by construction that MD is not, and cannot
        become, any kind of elevated identity: "md" is absent from
        VALID_MEMBER_KEYS and MEMBER_DIRECTORY, and MD receives the exact
        same permanent 409 on DELETE that every other authenticated
        identity receives — no override, no bypass."""
        self.assertNotIn(MD_MEMBER_KEY, VALID_MEMBER_KEYS)
        self.assertNotIn(MD_MEMBER_KEY, MEMBER_DIRECTORY)

        summary_id, _ = self.seed_summary(reviewer_member_key="mayurika")
        resp = self.client.delete(
            "/api/staff-review-summaries/" + str(summary_id),
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(resp.status_code, 409)

    def test_md_gains_no_additional_staff_data_access(self):
        """GET /api/staff now requires the same Calendar member token every
        other authenticated route requires (REQ-AUTH-MODULES-007,
        2026-08-10 — Staff Data is no longer public for anyone, MD
        included). This test confirms MD's token grants no ADDITIONAL
        scope/fields beyond what any other authenticated Management Team
        member already receives — REQ-CAL-REV-MD-READ-006 adds no special
        Staff Data dashboard access for MD; it is just one more
        authenticated identity among the six this endpoint now accepts."""
        self.seed_staff(full_name="Parity Check Staff")
        anon_resp = self.client.get("/api/staff", params={"search": "Parity Check Staff"})
        member_resp = self.client.get(
            "/api/staff",
            params={"search": "Parity Check Staff"},
            headers=bearer_header("mayurika"),
        )
        md_resp = self.client.get(
            "/api/staff",
            params={"search": "Parity Check Staff"},
            headers=bearer_header(MD_MEMBER_KEY),
        )
        self.assertEqual(anon_resp.status_code, 401)
        self.assertEqual(member_resp.status_code, 200)
        self.assertEqual(md_resp.status_code, 200)
        self.assertEqual(member_resp.json(), md_resp.json())


# ── Config-loader unit tests (no HTTP, no database) ─────────────────────
class MdTokenHashLoaderTests(unittest.TestCase):
    """Direct unit tests for backend/config.py's
    load_md_review_summary_token_hash — the optional-config loader
    validated indirectly through the HTTP layer above, and directly here
    for exact boundary coverage."""

    def test_absent_returns_none(self):
        from backend.config import load_md_review_summary_token_hash

        self.assertIsNone(load_md_review_summary_token_hash({}))

    def test_blank_returns_none(self):
        from backend.config import load_md_review_summary_token_hash

        self.assertIsNone(load_md_review_summary_token_hash({MD_CALENDAR_AUTH_TOKEN_ENV_VAR: "   "}))

    def test_placeholder_returns_none(self):
        from backend.config import load_md_review_summary_token_hash

        self.assertIsNone(
            load_md_review_summary_token_hash({MD_CALENDAR_AUTH_TOKEN_ENV_VAR: "set_a_real_token_hash_here"})
        )
        self.assertIsNone(
            load_md_review_summary_token_hash(
                {MD_CALENDAR_AUTH_TOKEN_ENV_VAR: "<set-in-deployment-environment>"}
            )
        )

    def test_malformed_non_hex_returns_none(self):
        from backend.config import load_md_review_summary_token_hash

        self.assertIsNone(
            load_md_review_summary_token_hash({MD_CALENDAR_AUTH_TOKEN_ENV_VAR: "not-a-valid-hex-digest"})
        )

    def test_valid_hash_is_returned_lowercased(self):
        from backend.config import load_md_review_summary_token_hash

        digest = sha256_hex(MD_TEST_TOKEN)
        result = load_md_review_summary_token_hash({MD_CALENDAR_AUTH_TOKEN_ENV_VAR: digest.upper()})
        self.assertEqual(result, digest)


if __name__ == "__main__":
    unittest.main()

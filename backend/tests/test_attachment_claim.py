"""Tests for backend/attachment_claim.py — the application-enforced
replacement for the foreign key management_aios.staff_review_summary_
attachments.summary_id does not have (2026-09-25).

Isolated in-memory SQLite only (backend/tests/calendar_auth_test_support.py);
no PostgreSQL, no Cloudinary.

Run with: python -m unittest backend.tests.test_attachment_claim
"""

import io
import types
import unittest
import uuid
import zlib
from datetime import datetime, timezone
from unittest import mock

from fastapi.testclient import TestClient

from backend.attachment_claim import AttachmentClaimError, claim_pending_attachments_for_summary
from backend.attachment_storage import FakeAttachmentStorage, get_attachment_storage
from backend.config import MAX_ATTACHMENTS_PER_SUMMARY
from backend.database import get_db
from backend.main import app
from backend.models import StaffDashboardRecord, StaffReviewSummary, StaffReviewSummaryAttachment
from backend.tests.calendar_auth_test_support import (
    assert_isolated_sqlite_override,
    bearer_header,
    forbid_real_database_engine,
    make_sqlite_engine_and_session_factory,
    patched_calendar_auth_env,
)


def _now():
    return datetime.now(timezone.utc)


class ClaimHelperTests(unittest.TestCase):
    def setUp(self):
        self.engine, self.SessionLocal = make_sqlite_engine_and_session_factory()
        self.db = self.SessionLocal()
        now = _now()
        self.staff = StaffDashboardRecord(
            id=zlib.crc32(b"claim-staff"), staff_code="DWL-claim", name="Claim Staff",
            synced_at=now, created_at=now, updated_at=now,
        )
        self.db.add(self.staff)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        self.engine.dispose()

    def summary(self, reviewer="arun", deleted=False):
        row = StaffReviewSummary(
            reviewer_member_key=reviewer, reviewed_staff_id=self.staff.id,
            meeting_date=_now().date(), summary_text="text",
            created_at=_now(), updated_at=_now(),
            deleted_at=_now() if deleted else None,
        )
        self.db.add(row)
        self.db.commit()
        return row

    def pending(self, uploader="arun", summary_id=None, n=None):
        row = StaffReviewSummaryAttachment(
            id=uuid.uuid4(), summary_id=summary_id, uploaded_by=uploader,
            original_filename="f%s.pdf" % n, content_type="application/pdf",
            attachment_type="pdf", file_size_bytes=10, storage_provider="cloudinary",
            storage_public_id="management-aios/review-summary-attachments/%s" % uuid.uuid4(),
            storage_resource_type="image", created_at=_now(),
        )
        self.db.add(row)
        self.db.commit()
        return row

    def claim(self, summary, ids, member="arun"):
        return claim_pending_attachments_for_summary(
            self.db, summary_id=summary.id, acting_member=member, attachment_ids=ids
        )

    def linked_to(self, summary):
        self.db.expire_all()
        return self.db.query(StaffReviewSummaryAttachment).filter(
            StaffReviewSummaryAttachment.summary_id == summary.id
        ).count()

    def test_links_own_pending_files_to_own_active_summary(self):
        s = self.summary()
        a, b = self.pending(n=1), self.pending(n=2)
        self.assertEqual(self.claim(s, [a.id, b.id, a.id]), 2)  # duplicate id is de-duplicated
        self.db.commit()
        self.assertEqual(self.linked_to(s), 2)

    def test_empty_list_is_a_no_op(self):
        s = self.summary()
        self.assertEqual(self.claim(s, []), 0)

    def test_refuses_a_summary_that_does_not_exist(self):
        a = self.pending(n=1)
        ghost = StaffReviewSummary(id=uuid.uuid4())
        with self.assertRaises(AttachmentClaimError):
            self.claim(ghost, [a.id])
        self.db.rollback()
        self.assertEqual(self.db.query(StaffReviewSummaryAttachment).filter(
            StaffReviewSummaryAttachment.summary_id.isnot(None)).count(), 0)

    def test_refuses_a_soft_deleted_summary(self):
        s = self.summary(deleted=True)
        a = self.pending(n=1)
        with self.assertRaises(AttachmentClaimError):
            self.claim(s, [a.id])
        self.db.rollback()
        self.assertEqual(self.linked_to(s), 0)

    def test_refuses_a_summary_owned_by_another_reviewer(self):
        s = self.summary(reviewer="mayurika")
        a = self.pending(n=1)
        with self.assertRaises(AttachmentClaimError):
            self.claim(s, [a.id], member="arun")
        self.db.rollback()
        self.assertEqual(self.linked_to(s), 0)

    def test_refuses_a_pending_file_uploaded_by_someone_else(self):
        s = self.summary()
        theirs = self.pending(uploader="mayurika", n=1)
        with self.assertRaises(AttachmentClaimError):
            self.claim(s, [theirs.id])
        self.db.rollback()
        self.assertEqual(self.linked_to(s), 0)

    def test_refuses_a_file_already_attached_to_another_summary(self):
        s1, s2 = self.summary(), self.summary()
        taken = self.pending(summary_id=s1.id, n=1)
        with self.assertRaises(AttachmentClaimError):
            self.claim(s2, [taken.id])
        self.db.rollback()
        self.assertEqual(self.linked_to(s1), 1)
        self.assertEqual(self.linked_to(s2), 0)

    def test_all_or_nothing_when_one_of_several_is_invalid(self):
        s = self.summary()
        ok, theirs = self.pending(n=1), self.pending(uploader="mayurika", n=2)
        with self.assertRaises(AttachmentClaimError):
            self.claim(s, [ok.id, theirs.id])
        self.db.rollback()  # the caller rolls back; the good one must not stay linked
        self.assertEqual(self.linked_to(s), 0)

    def test_unknown_attachment_id_is_refused(self):
        s = self.summary()
        with self.assertRaises(AttachmentClaimError):
            self.claim(s, [uuid.uuid4()])

    def test_enforces_the_per_summary_file_limit_including_existing_links(self):
        s = self.summary()
        for n in range(MAX_ATTACHMENTS_PER_SUMMARY):
            self.pending(summary_id=s.id, n=n)
        extra = self.pending(n=99)
        with self.assertRaises(AttachmentClaimError) as ctx:
            self.claim(s, [extra.id])
        self.assertIn(str(MAX_ATTACHMENTS_PER_SUMMARY), str(ctx.exception))


class CreateRouteClaimRaceTests(unittest.TestCase):
    """A file claimed by a concurrent request AFTER the route's early
    validation but BEFORE its claim UPDATE must make the whole create fail
    (422) and leave no new summary behind."""

    def setUp(self):
        self.engine, self.SessionLocal = make_sqlite_engine_and_session_factory()

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        assert_isolated_sqlite_override(app, self.engine, get_db_dependency=get_db)
        self.forbid = forbid_real_database_engine()
        self.forbid.__enter__()
        self.storage = FakeAttachmentStorage()
        app.dependency_overrides[get_attachment_storage] = lambda: self.storage
        self.env = patched_calendar_auth_env(include_md=True)
        self.env.__enter__()
        self.client_ctx = TestClient(app)
        self.client = self.client_ctx.__enter__()
        session = self.SessionLocal()
        now = _now()
        staff = StaffDashboardRecord(
            id=zlib.crc32(b"race-staff"), staff_code="DWL-race", name="Race Staff",
            synced_at=now, created_at=now, updated_at=now,
        )
        session.add(staff)
        session.commit()
        self.staff_id = staff.id
        session.close()

    def tearDown(self):
        self.client_ctx.__exit__(None, None, None)
        self.env.__exit__(None, None, None)
        self.forbid.__exit__(None, None, None)
        app.dependency_overrides.clear()
        self.engine.dispose()

    def test_lost_race_rolls_back_the_new_summary(self):
        upload = self.client.post(
            "/api/staff-review-summaries/attachments",
            files={"file": ("note.pdf", io.BytesIO(b"%PDF-1.4 test"), "application/pdf")},
            headers=bearer_header("arun"),
        )
        self.assertEqual(upload.status_code, 201, upload.text)
        attachment_id = uuid.UUID(upload.json()["id"])

        # The "other request": link the pending file to some other summary.
        session = self.SessionLocal()
        other = StaffReviewSummary(
            reviewer_member_key="arun", reviewed_staff_id=self.staff_id,
            meeting_date=_now().date(), summary_text="earlier", created_at=_now(), updated_at=_now(),
        )
        session.add(other)
        session.commit()
        other_id = other.id
        session.query(StaffReviewSummaryAttachment).filter_by(id=attachment_id).update(
            {"summary_id": other_id}
        )
        session.commit()
        summaries_before = session.query(StaffReviewSummary).count()
        session.close()
        # What the route's early validation saw: the file still pending.
        stale_row = types.SimpleNamespace(id=attachment_id, summary_id=None, uploaded_by="arun")

        with mock.patch(
            "backend.routers.staff_review_summaries._claim_pending_attachments",
            return_value=[stale_row],
        ):
            response = self.client.post(
                "/api/staff-review-summaries",
                json={
                    "reviewed_staff_id": self.staff_id,
                    "meeting_date": _now().date().isoformat(),
                    "summary_text": "Should not persist",
                    "attachment_ids": [str(attachment_id)],
                },
                headers=bearer_header("arun"),
            )
        self.assertEqual(response.status_code, 422, response.text)

        session = self.SessionLocal()
        self.assertEqual(session.query(StaffReviewSummary).count(), summaries_before)
        row = session.query(StaffReviewSummaryAttachment).get(attachment_id)
        self.assertEqual(row.summary_id, other_id)  # untouched by the failed request
        session.close()


class MigrationDefinitionTests(unittest.TestCase):
    """Guards found by a real failed apply on 2026-09-25: PostgreSQL silently
    truncates identifiers over 63 characters, so a longer constraint/index
    name is created under a different name and the migration's own verifier
    (correctly) reports it missing."""

    MIGRATION = "database/migrations/2026-09-23-create-staff-review-summary-attachments.sql"

    def test_every_constraint_and_index_name_fits_postgresql_63_char_limit(self):
        import re
        from pathlib import Path

        sql = Path(self.MIGRATION).read_text(encoding="utf-8")
        names = set(re.findall(r"CONSTRAINT\s+([a-z0-9_]+)", sql))
        names |= set(re.findall(r"INDEX\s+(?:IF NOT EXISTS\s+)?([a-z0-9_]+)", sql))
        self.assertGreaterEqual(len(names), 11)
        self.assertEqual([n for n in names if len(n) > 63], [])

    def test_model_constraint_names_match_the_migration_and_fit_the_limit(self):
        import re
        from pathlib import Path

        sql = Path(self.MIGRATION).read_text(encoding="utf-8")
        model_names = {
            c.name for c in StaffReviewSummaryAttachment.__table__.constraints if c.name
        }
        self.assertEqual(len(model_names), 8)
        for name in model_names:
            self.assertLessEqual(len(name), 63, name)
            self.assertIn(name, sql)

    def test_migration_declares_no_foreign_key(self):
        from pathlib import Path

        sql = Path(self.MIGRATION).read_text(encoding="utf-8")
        create_block = sql[sql.index("CREATE TABLE management_aios"): sql.index("-- (3a)")]
        self.assertNotIn("REFERENCES", create_block.upper())
        self.assertFalse(StaffReviewSummaryAttachment.__table__.foreign_keys)


class LocalPrototypeModeProductionGuardTests(unittest.TestCase):
    def test_flag_is_honored_outside_production(self):
        from backend.config import is_local_prototype_attachments_enabled as enabled

        self.assertTrue(enabled({"LOCAL_PROTOTYPE_ATTACHMENTS": "true"}))
        self.assertTrue(enabled({"LOCAL_PROTOTYPE_ATTACHMENTS": "true", "ENVIRONMENT": "development"}))
        self.assertFalse(enabled({}))
        self.assertFalse(enabled({"LOCAL_PROTOTYPE_ATTACHMENTS": "1"}))

    def test_production_ignores_the_flag_completely(self):
        from backend.config import is_local_prototype_attachments_enabled as enabled

        for env_value in ("production", "Production", "  PRODUCTION "):
            self.assertFalse(
                enabled({"LOCAL_PROTOTYPE_ATTACHMENTS": "true", "ENVIRONMENT": env_value}), env_value
            )


class AttachmentOnlyReviewIsNotSupportedYetTests(unittest.TestCase):
    """Documents the CURRENT truth so nobody claims otherwise: attachment-only
    reviews are rejected. The database (summary_text NOT NULL + a non-blank
    CHECK on the owner-controlled parent table) and the request schema both
    require text. Supporting them needs the parent-table migration in
    database/migrations/2026-09-25-allow-attachment-only-review-summaries.sql
    (DRAFT, owner-only) plus the backend/frontend changes listed in it."""

    def test_request_schema_rejects_missing_or_blank_text(self):
        from pydantic import ValidationError
        from backend.schemas import StaffReviewSummaryCreate

        for text in ("", "   ", "\n\t"):
            with self.assertRaises(ValidationError):
                StaffReviewSummaryCreate(
                    reviewed_staff_id=1, meeting_date=_now().date(), summary_text=text,
                    attachment_ids=[uuid.uuid4()],
                )
        with self.assertRaises(ValidationError):
            StaffReviewSummaryCreate(
                reviewed_staff_id=1, meeting_date=_now().date(), attachment_ids=[uuid.uuid4()],
            )


if __name__ == "__main__":
    unittest.main()

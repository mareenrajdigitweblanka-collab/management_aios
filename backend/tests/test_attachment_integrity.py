"""Integrity tests for Review Summary attachment links (2026-09-24).

management_aios.staff_review_summary_attachments.summary_id has NO foreign
key by approved design, so the orphan check (backend/attachment_integrity.py)
is what proves a link can never point at a missing summary. Uses the repo's
isolated in-memory SQLite database.

Run with: python -m unittest backend.tests.test_attachment_integrity
"""

import unittest
import uuid
from datetime import datetime, timezone

from backend.attachment_integrity import find_orphan_attachments
from backend.models import StaffDashboardRecord, StaffReviewSummary, StaffReviewSummaryAttachment
from backend.tests.calendar_auth_test_support import make_sqlite_engine_and_session_factory


def make_attachment(summary_id=None, **overrides):
    values = dict(
        id=uuid.uuid4(), summary_id=summary_id, uploaded_by="arun", original_filename="a.pdf",
        content_type="application/pdf", attachment_type="pdf", file_size_bytes=10,
        storage_provider="cloudinary", storage_public_id="management-aios/review-summary-attachments/" + str(uuid.uuid4()),
        storage_resource_type="image", created_at=datetime.now(timezone.utc),
    )
    values.update(overrides)
    return StaffReviewSummaryAttachment(**values)


class AttachmentIntegrityTests(unittest.TestCase):
    def setUp(self):
        self.engine, self.SessionLocal = make_sqlite_engine_and_session_factory()
        self.session = self.SessionLocal()
        now = datetime.now(timezone.utc)
        self.session.add(StaffDashboardRecord(id=1, staff_code="T1", name="T", synced_at=now, created_at=now, updated_at=now))
        self.summary = StaffReviewSummary(
            reviewer_member_key="arun", reviewed_staff_id=1, meeting_date=now.date(),
            summary_text="text", created_at=now, updated_at=now,
        )
        self.session.add(self.summary)
        self.session.commit()

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_model_declares_no_foreign_key_on_summary_id(self):
        column = StaffReviewSummaryAttachment.__table__.c.summary_id
        self.assertEqual(len(column.foreign_keys), 0)
        self.assertTrue(column.nullable)

    def test_linking_to_a_nonexistent_summary_is_detected_as_an_orphan(self):
        ghost_summary = uuid.uuid4()
        bad = make_attachment(summary_id=ghost_summary)
        good = make_attachment(summary_id=self.summary.id)
        pending = make_attachment(summary_id=None)
        self.session.add_all([bad, good, pending])
        self.session.commit()  # no foreign key: the database itself accepts the bad link
        self.assertEqual(find_orphan_attachments(self.session), [(bad.id.hex, ghost_summary.hex)])

    def test_pending_and_valid_links_are_never_orphans(self):
        self.session.add_all([make_attachment(summary_id=self.summary.id), make_attachment()])
        self.session.commit()
        self.assertEqual(find_orphan_attachments(self.session), [])

    def test_orphan_check_can_be_restricted_to_given_ids(self):
        bad = make_attachment(summary_id=uuid.uuid4())
        self.session.add(bad)
        self.session.commit()
        self.assertEqual(find_orphan_attachments(self.session, [uuid.uuid4()]), [])
        self.assertEqual(len(find_orphan_attachments(self.session, [bad.id])), 1)
        self.assertEqual(find_orphan_attachments(self.session, []), [])

    def test_orphan_check_is_read_only(self):
        self.session.add(make_attachment(summary_id=uuid.uuid4()))
        self.session.commit()
        before = self.session.query(StaffReviewSummaryAttachment).count()
        find_orphan_attachments(self.session)
        self.assertEqual(self.session.query(StaffReviewSummaryAttachment).count(), before)


if __name__ == "__main__":
    unittest.main()

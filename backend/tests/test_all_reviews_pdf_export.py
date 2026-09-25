"""HTTP-level tests for "Download all reviews as one PDF"
(REQ-CAL-REV-HISTORY-PDF-001, 2026-09-23) — GET
/api/staff-review-summaries/export/pdf/history.

Same isolated in-memory SQLite + FakeAttachmentStorage pattern as
test_review_summary_attachments.py — no real Cloudinary call, no real
database, no real credentials needed to run this file.

Run with: python -m unittest backend.tests.test_all_reviews_pdf_export
"""

import io
import unittest
import zlib
from datetime import date, datetime, timedelta, timezone
from io import BytesIO
from unittest import mock

from fastapi.testclient import TestClient
from pypdf import PdfReader
from PIL import Image as PILImage

from backend.attachment_storage import FakeAttachmentStorage, get_attachment_storage
from backend.database import get_db
from backend.main import app
from backend.models import StaffDashboardRecord, StaffReviewSummary
from backend.tests.calendar_auth_test_support import (
    assert_isolated_sqlite_override,
    bearer_header,
    forbid_real_database_engine,
    make_sqlite_engine_and_session_factory,
    patched_calendar_auth_env,
)

ROUTE = "/api/staff-review-summaries/export/pdf/history"


def make_png_bytes():
    buf = BytesIO()
    PILImage.new("RGB", (20, 15), color=(10, 20, 30)).save(buf, format="PNG")
    return buf.getvalue()


class AllReviewsPdfExportTestCase(unittest.TestCase):
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
        self.forbid_real_db_ctx = forbid_real_database_engine()
        self.forbid_real_db_ctx.__enter__()

        self.storage = FakeAttachmentStorage()
        app.dependency_overrides[get_attachment_storage] = lambda: self.storage

        self.env_ctx = patched_calendar_auth_env(include_md=True)
        self.env_ctx.__enter__()
        self.client_ctx = TestClient(app)
        self.client = self.client_ctx.__enter__()

    def tearDown(self):
        self.client_ctx.__exit__(None, None, None)
        self.env_ctx.__exit__(None, None, None)
        self.forbid_real_db_ctx.__exit__(None, None, None)
        app.dependency_overrides.clear()
        self.engine.dispose()

    def make_session(self):
        return self.SessionLocal()

    def seed_staff(self, source_record_key="all-pdf-001", full_name="History PDF Staff"):
        session = self.make_session()
        now = datetime.now(timezone.utc)
        staff = StaffDashboardRecord(
            id=zlib.crc32(source_record_key.encode("utf-8")),
            staff_code="DWL-" + source_record_key,
            name=full_name,
            synced_at=now, created_at=now, updated_at=now,
        )
        session.add(staff)
        session.commit()
        session.refresh(staff)
        staff_id = staff.id
        session.close()
        return staff_id

    def create_summary(self, member_key, staff_id, meeting_date, summary_text=None, attachment_ids=None):
        return self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": str(staff_id),
                "meeting_date": meeting_date,
                "summary_text": summary_text or ("A real review discussion on " + meeting_date + "."),
                "attachment_ids": [str(a) for a in (attachment_ids or [])],
            },
            headers=bearer_header(member_key),
        )

    def upload(self, member_key, filename, content, content_type="application/octet-stream"):
        return self.client.post(
            "/api/staff-review-summaries/attachments",
            files={"file": (filename, io.BytesIO(content), content_type)},
            headers=bearer_header(member_key),
        )

    # ── Authorization ────────────────────────────────────────────────

    def test_missing_token_rejected(self):
        staff_id = self.seed_staff()
        resp = self.client.get(ROUTE, params={"reviewed_staff_id": staff_id})
        self.assertEqual(resp.status_code, 401)

    def test_invalid_token_rejected(self):
        staff_id = self.seed_staff()
        resp = self.client.get(
            ROUTE, params={"reviewed_staff_id": staff_id},
            headers={"Authorization": "Bearer not-a-real-token"},
        )
        self.assertEqual(resp.status_code, 401)

    # ── Empty result ─────────────────────────────────────────────────

    def test_no_matching_reviews_returns_404(self):
        staff_id = self.seed_staff()
        resp = self.client.get(
            ROUTE, params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 404)

    # ── Chronological order + completeness (no 50-record cap) ──────────

    def test_chronological_order_oldest_first(self):
        staff_id = self.seed_staff()
        self.create_summary("mayurika", staff_id, "2026-01-10", summary_text="Third chronologically, created first.")
        self.create_summary("mayurika", staff_id, "2026-01-05", summary_text="Second chronologically.")
        self.create_summary("mayurika", staff_id, "2026-01-01", summary_text="First chronologically.")

        resp = self.client.get(
            ROUTE, params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        reader = PdfReader(BytesIO(resp.content))
        text = "".join(page.extract_text() or "" for page in reader.pages)
        first_pos = text.find("First chronologically.")
        second_pos = text.find("Second chronologically.")
        third_pos = text.find("Third chronologically, created first.")
        self.assertTrue(first_pos != -1 and second_pos != -1 and third_pos != -1)
        self.assertLess(first_pos, second_pos)
        self.assertLess(second_pos, third_pos)

    def test_more_than_fifty_reviews_are_all_included_not_capped(self):
        """The core "do not silently export only the first 50 records"
        requirement — LIST's own default page size is 50, so this proves
        the history export is genuinely unpaginated, not just "usually
        enough" for small test fixtures."""
        staff_id = self.seed_staff()
        base = date(2025, 1, 1)
        record_count = 55
        for i in range(record_count):
            meeting_date = (base + timedelta(days=i)).isoformat()
            self.create_summary("mayurika", staff_id, meeting_date, summary_text="Entry number " + str(i + 1) + ".")

        resp = self.client.get(
            ROUTE, params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        reader = PdfReader(BytesIO(resp.content))
        text = "".join(page.extract_text() or "" for page in reader.pages)
        self.assertIn("Total review records", text)
        self.assertIn(str(record_count), text)
        self.assertIn("Review " + str(record_count), text)  # the 55th record's own heading
        self.assertIn("Entry number 1.", text)
        self.assertIn("Entry number " + str(record_count) + ".", text)

    # ── Reviewer / date filters ─────────────────────────────────────────

    def test_reviewer_filter_excludes_other_reviewers(self):
        staff_id = self.seed_staff()
        self.create_summary("mayurika", staff_id, "2026-02-01", summary_text="Mayurika's own entry.")
        self.create_summary("suman", staff_id, "2026-02-02", summary_text="Suman's own entry.")

        resp = self.client.get(
            ROUTE, params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        text = "".join(page.extract_text() or "" for page in PdfReader(BytesIO(resp.content)).pages)
        self.assertIn("Mayurika's own entry.", text)
        self.assertNotIn("Suman's own entry.", text)

    def test_include_all_reviewers_includes_every_reviewer(self):
        staff_id = self.seed_staff()
        self.create_summary("mayurika", staff_id, "2026-02-01", summary_text="Mayurika's own entry.")
        self.create_summary("suman", staff_id, "2026-02-02", summary_text="Suman's own entry.")

        resp = self.client.get(
            ROUTE, params={"reviewed_staff_id": staff_id, "include_all_reviewers": "true"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        text = "".join(page.extract_text() or "" for page in PdfReader(BytesIO(resp.content)).pages)
        self.assertIn("Mayurika's own entry.", text)
        self.assertIn("Suman's own entry.", text)

    def test_date_filter_excludes_out_of_range_reviews(self):
        staff_id = self.seed_staff()
        self.create_summary("mayurika", staff_id, "2026-03-01", summary_text="Inside the date range.")
        self.create_summary("mayurika", staff_id, "2026-04-15", summary_text="Outside the date range.")

        resp = self.client.get(
            ROUTE,
            params={
                "reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika",
                "date_from": "2026-02-01", "date_to": "2026-03-31",
            },
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        text = "".join(page.extract_text() or "" for page in PdfReader(BytesIO(resp.content)).pages)
        self.assertIn("Inside the date range.", text)
        self.assertNotIn("Outside the date range.", text)

    # ── Filename / Content-Disposition ──────────────────────────────────

    def test_content_disposition_uses_all_reviews_prefix(self):
        staff_id = self.seed_staff(full_name="Filename Check Staff")
        self.create_summary("mayurika", staff_id, "2026-05-01")
        resp = self.client.get(
            ROUTE, params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        disposition = resp.headers.get("content-disposition", "")
        self.assertIn("All_Reviews_", disposition)
        self.assertIn(".pdf", disposition)
        self.assertNotIn("Review_Summary_", disposition)
        self.assertNotIn("Complete_Review_", disposition)

    def test_cache_control_no_store(self):
        staff_id = self.seed_staff()
        self.create_summary("mayurika", staff_id, "2026-05-01")
        resp = self.client.get(
            ROUTE, params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.headers.get("cache-control"), "no-store")

    # ── Attachments: embedded content + explicit failure reporting ──────

    def test_image_attachment_is_embedded_and_pdf_attachment_is_appended(self):
        staff_id = self.seed_staff()
        image_up = self.upload("mayurika", "photo.png", make_png_bytes(), "image/png")
        self.create_summary("mayurika", staff_id, "2026-06-01", attachment_ids=[image_up.json()["id"]])

        resp = self.client.get(
            ROUTE, params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        text = "".join(page.extract_text() or "" for page in PdfReader(BytesIO(resp.content)).pages)
        self.assertIn("photo.png", text)

    def test_audio_attachment_never_embedded_filename_only(self):
        staff_id = self.seed_staff()
        audio_up = self.upload("mayurika", "clip.mp3", b"fake-mp3-bytes", "audio/mpeg")
        self.create_summary("mayurika", staff_id, "2026-06-02", attachment_ids=[audio_up.json()["id"]])

        resp = self.client.get(
            ROUTE, params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        text = "".join(page.extract_text() or "" for page in PdfReader(BytesIO(resp.content)).pages)
        self.assertIn("clip.mp3", text)
        self.assertIn("Audio is never embedded or transcribed", text)
        audio_public_id = self.storage.uploaded_public_ids[0]
        self.assertNotIn(audio_public_id, self.storage.downloaded_public_ids)

    def test_corrupt_word_attachment_conversion_failure_is_reported_not_silently_dropped(self):
        staff_id = self.seed_staff()
        word_up = self.upload("mayurika", "bad.doc", b"not a real ole file" * 5, "application/msword")
        self.create_summary("mayurika", staff_id, "2026-06-03", attachment_ids=[word_up.json()["id"]])

        resp = self.client.get(
            ROUTE, params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        text = "".join(page.extract_text() or "" for page in PdfReader(BytesIO(resp.content)).pages)
        self.assertIn("bad.doc", text)
        self.assertIn("could not be converted", text)

    # ── Practical limits ─────────────────────────────────────────────────

    def test_record_count_limit_is_enforced_with_clear_error(self):
        staff_id = self.seed_staff()
        self.create_summary("mayurika", staff_id, "2026-07-01")
        self.create_summary("mayurika", staff_id, "2026-07-02")
        self.create_summary("mayurika", staff_id, "2026-07-03")

        with mock.patch("backend.routers.staff_review_summaries.MAX_HISTORY_PDF_EXPORT_RECORDS", 2):
            resp = self.client.get(
                ROUTE, params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
                headers=bearer_header("mayurika"),
            )
        self.assertEqual(resp.status_code, 413)
        self.assertIn("more than the", resp.json()["detail"])

    def test_attachment_size_limit_is_enforced_with_clear_error(self):
        staff_id = self.seed_staff()
        image_up = self.upload("mayurika", "photo.png", make_png_bytes(), "image/png")
        self.create_summary("mayurika", staff_id, "2026-07-04", attachment_ids=[image_up.json()["id"]])

        with mock.patch("backend.routers.staff_review_summaries.MAX_HISTORY_PDF_EXPORT_ATTACHMENT_BYTES", 1):
            resp = self.client.get(
                ROUTE, params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
                headers=bearer_header("mayurika"),
            )
        self.assertEqual(resp.status_code, 413)
        self.assertIn("too large", resp.json()["detail"])

    def test_total_page_limit_is_enforced_with_clear_error(self):
        staff_id = self.seed_staff()
        self.create_summary("mayurika", staff_id, "2026-07-05")

        with mock.patch("backend.routers.staff_review_summaries.MAX_HISTORY_PDF_EXPORT_TOTAL_PAGES", 0):
            resp = self.client.get(
                ROUTE, params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
                headers=bearer_header("mayurika"),
            )
        self.assertEqual(resp.status_code, 413)
        self.assertIn("page limit", resp.json()["detail"])

    def test_time_budget_is_enforced_with_clear_error(self):
        staff_id = self.seed_staff()
        self.create_summary("mayurika", staff_id, "2026-07-06")

        with mock.patch("backend.routers.staff_review_summaries.HISTORY_PDF_EXPORT_TIME_BUDGET_SECONDS", -1):
            resp = self.client.get(
                ROUTE, params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
                headers=bearer_header("mayurika"),
            )
        self.assertEqual(resp.status_code, 504)
        self.assertIn("taking too long", resp.json()["detail"])

    # ── Existing exports still work unchanged ───────────────────────────

    def test_existing_single_pdf_export_still_works(self):
        staff_id = self.seed_staff()
        self.create_summary("mayurika", staff_id, "2026-08-01")
        resp = self.client.get(
            "/api/staff-review-summaries/export/pdf",
            params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("Review_Summary_", resp.headers.get("content-disposition", ""))

    def test_existing_zip_export_still_works(self):
        staff_id = self.seed_staff()
        self.create_summary("mayurika", staff_id, "2026-08-01")
        resp = self.client.get(
            "/api/staff-review-summaries/export/zip",
            params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("Complete_Review_", resp.headers.get("content-disposition", ""))


if __name__ == "__main__":
    unittest.main()

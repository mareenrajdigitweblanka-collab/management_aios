"""HTTP-level tests for Review Summary Attachments (REQ-CAL-REV-ATTACH-001,
2026-09-23).

Uses fastapi.testclient.TestClient against the real app (backend.main.app)
— same isolated in-memory SQLite pattern as test_staff_review_summaries.py
— PLUS app.dependency_overrides[get_attachment_storage] pointed at a fresh
FakeAttachmentStorage per test. No real Cloudinary call is ever made by
this file; no real credentials are needed to run it.

Run with: python -m unittest backend.tests.test_review_summary_attachments
"""

import io
import unittest
import uuid
import zipfile
import zlib
from datetime import datetime, timezone
from io import BytesIO

import docx
import openpyxl
from fastapi.testclient import TestClient
from pypdf import PdfReader
from PIL import Image as PILImage
from reportlab.pdfgen import canvas as rl_canvas

from backend.attachment_storage import FakeAttachmentStorage, get_attachment_storage
from backend.database import get_db
from backend.main import app
from backend.models import StaffDashboardRecord, StaffReviewSummary, StaffReviewSummaryAttachment
from backend.attachment_integrity import find_orphan_attachments
from backend.tests.calendar_auth_test_support import (
    assert_isolated_sqlite_override,
    bearer_header,
    forbid_real_database_engine,
    make_sqlite_engine_and_session_factory,
    patched_calendar_auth_env,
)


def make_png_bytes(width=40, height=30, color=(200, 50, 50)):
    buf = BytesIO()
    PILImage.new("RGB", (width, height), color=color).save(buf, format="PNG")
    return buf.getvalue()


def make_pdf_bytes(text="Attached PDF content"):
    buf = BytesIO()
    c = rl_canvas.Canvas(buf)
    c.drawString(100, 700, text)
    c.save()
    return buf.getvalue()


def make_docx_bytes(paragraph_text="Sample Word content for conversion testing."):
    document = docx.Document()
    document.add_paragraph(paragraph_text)
    buf = BytesIO()
    document.save(buf)
    return buf.getvalue()


def make_xlsx_bytes(sheet_name="Data", cell_value="Sample Excel content"):
    workbook = openpyxl.Workbook()
    workbook.active.title = sheet_name
    workbook.active.append([cell_value])
    buf = BytesIO()
    workbook.save(buf)
    return buf.getvalue()


class ReviewSummaryAttachmentsTestCase(unittest.TestCase):
    """Fresh, isolated in-memory SQLite database AND a fresh
    FakeAttachmentStorage per test method — no cross-test data leakage, no
    real network connection, no real Cloudinary credentials required."""

    def setUp(self):
        self.engine, self.SessionLocal = make_sqlite_engine_and_session_factory()

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db

        # Safety guard — same as test_staff_review_summaries.py: fail before
        # any request is sent if get_db is not actually overridden to the
        # isolated SQLite database.
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

    def seed_staff(self, source_record_key="staff-attach-001", full_name="Attach Test Staff"):
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

    def count_attachments(self):
        session = self.make_session()
        count = session.query(StaffReviewSummaryAttachment).count()
        session.close()
        return count

    def count_summaries(self):
        session = self.make_session()
        count = session.query(StaffReviewSummary).count()
        session.close()
        return count

    def upload(self, member_key, filename, content, content_type="application/octet-stream"):
        return self.client.post(
            "/api/staff-review-summaries/attachments",
            files={"file": (filename, io.BytesIO(content), content_type)},
            headers=bearer_header(member_key),
        )

    def create_summary(self, member_key, staff_id, attachment_ids=None, summary_text="A real review discussion."):
        return self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": str(staff_id),
                "meeting_date": "2026-09-20",
                "summary_text": summary_text,
                "attachment_ids": [str(a) for a in (attachment_ids or [])],
            },
            headers=bearer_header(member_key),
        )

    # ── 1. Valid uploads (one per supported type) ──────────────────────

    def test_valid_audio_upload(self):
        resp = self.upload("mayurika", "clip.mp3", b"fake-mp3-bytes", "audio/mpeg")
        self.assertEqual(resp.status_code, 201)
        body = resp.json()
        self.assertEqual(body["attachment_type"], "audio")
        self.assertEqual(body["original_filename"], "clip.mp3")
        self.assertEqual(body["file_size_bytes"], len(b"fake-mp3-bytes"))

    def test_valid_word_upload(self):
        resp = self.upload("mayurika", "notes.docx", b"fake-docx-bytes")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["attachment_type"], "word")

    def test_valid_excel_upload(self):
        resp = self.upload("mayurika", "sheet.xlsx", b"fake-xlsx-bytes")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["attachment_type"], "excel")

    def test_valid_image_upload(self):
        png_bytes = make_png_bytes()
        resp = self.upload("mayurika", "photo.png", png_bytes, "image/png")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["attachment_type"], "image")

    def test_valid_pdf_upload(self):
        pdf_bytes = make_pdf_bytes()
        resp = self.upload("mayurika", "scan.pdf", pdf_bytes, "application/pdf")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["attachment_type"], "pdf")

    def test_uploaded_file_is_pending_summary_id_null(self):
        resp = self.upload("mayurika", "clip.mp3", b"fake-mp3-bytes")
        attachment_id = resp.json()["id"]
        session = self.make_session()
        row = session.get(StaffReviewSummaryAttachment, uuid.UUID(attachment_id))
        self.assertIsNone(row.summary_id)
        self.assertEqual(row.uploaded_by, "mayurika")
        session.close()

    # ── 2. Invalid uploads ──────────────────────────────────────────────

    def test_unsupported_extension_rejected(self):
        resp = self.upload("mayurika", "virus.exe", b"whatever")
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(self.count_attachments(), 0)

    def test_empty_file_rejected(self):
        resp = self.upload("mayurika", "empty.mp3", b"")
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(self.count_attachments(), 0)

    def test_oversized_file_rejected(self):
        from backend.config import MAX_ATTACHMENT_FILE_SIZE_BYTES
        oversized = b"x" * (MAX_ATTACHMENT_FILE_SIZE_BYTES + 1)
        resp = self.upload("mayurika", "big.mp3", oversized)
        self.assertEqual(resp.status_code, 413)
        self.assertEqual(self.count_attachments(), 0)

    def test_missing_token_upload_rejected(self):
        resp = self.client.post(
            "/api/staff-review-summaries/attachments",
            files={"file": ("clip.mp3", io.BytesIO(b"fake-mp3-bytes"), "audio/mpeg")},
        )
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(self.count_attachments(), 0)

    def test_md_cannot_upload(self):
        resp = self.client.post(
            "/api/staff-review-summaries/attachments",
            files={"file": ("clip.mp3", io.BytesIO(b"fake-mp3-bytes"), "audio/mpeg")},
            headers=bearer_header("md"),
        )
        self.assertEqual(resp.status_code, 403)
        self.assertEqual(self.count_attachments(), 0)

    # ── 3. Partial upload failure never produces a successful summary ──

    def test_storage_upload_failure_creates_no_row_and_returns_502(self):
        self.storage.raise_on_upload = RuntimeError("simulated Cloudinary outage")
        resp = self.upload("mayurika", "clip.mp3", b"fake-mp3-bytes")
        self.assertEqual(resp.status_code, 502)
        self.assertEqual(self.count_attachments(), 0)

    def test_attachment_storage_unavailable_returns_503(self):
        from backend.attachment_storage import AttachmentStorageUnavailable
        self.storage.raise_on_upload = AttachmentStorageUnavailable("not configured")
        resp = self.upload("mayurika", "clip.mp3", b"fake-mp3-bytes")
        self.assertEqual(resp.status_code, 503)
        self.assertEqual(self.count_attachments(), 0)

    def test_create_with_nonexistent_attachment_id_creates_nothing(self):
        staff_id = self.seed_staff()
        fake_id = "00000000-0000-0000-0000-000000000000"
        resp = self.create_summary("mayurika", staff_id, attachment_ids=[fake_id])
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(self.count_summaries(), 0)

    def test_create_with_attachment_uploaded_by_someone_else_is_rejected(self):
        staff_id = self.seed_staff()
        uploaded = self.upload("mayurika", "clip.mp3", b"fake-mp3-bytes")
        attachment_id = uploaded.json()["id"]
        resp = self.create_summary("suman", staff_id, attachment_ids=[attachment_id])
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(self.count_summaries(), 0)
        # The attachment itself is untouched — still pending, still owned
        # by mayurika, never silently reassigned.
        session = self.make_session()
        row = session.get(StaffReviewSummaryAttachment, uuid.UUID(attachment_id))
        self.assertIsNone(row.summary_id)
        session.close()

    def test_failed_summary_create_never_links_the_pending_attachment(self):
        # A save that fails (unknown staff member) must leave the pending upload
        # unlinked — it may never be attached to the wrong person or a missing summary.
        uploaded = self.upload("mayurika", "clip.mp3", b"fake-mp3-bytes")
        attachment_id = uploaded.json()["id"]
        resp = self.create_summary("mayurika", 987654321, attachment_ids=[attachment_id])
        self.assertIn(resp.status_code, (404, 422))
        self.assertEqual(self.count_summaries(), 0)
        session = self.make_session()
        row = session.get(StaffReviewSummaryAttachment, uuid.UUID(attachment_id))
        self.assertIsNone(row.summary_id)
        self.assertEqual(find_orphan_attachments(session), [])
        session.close()

    def test_every_link_written_by_the_api_points_at_an_existing_summary(self):
        staff_id = self.seed_staff()
        first = self.upload("mayurika", "a.mp3", b"aaa").json()["id"]
        second = self.upload("mayurika", "b.mp3", b"bbb").json()["id"]
        ok = self.create_summary("mayurika", staff_id, attachment_ids=[first, second])
        self.assertEqual(ok.status_code, 201)
        # plus assorted rejected saves
        self.create_summary("mayurika", staff_id, attachment_ids=[first])          # already attached
        self.create_summary("suman", staff_id, attachment_ids=[str(uuid.uuid4())])  # unknown id
        session = self.make_session()
        linked = session.query(StaffReviewSummaryAttachment).filter(
            StaffReviewSummaryAttachment.summary_id.isnot(None)
        ).all()
        self.assertEqual(len(linked), 2)
        self.assertEqual({str(a.summary_id) for a in linked}, {ok.json()["id"]})
        self.assertEqual(find_orphan_attachments(session), [])
        session.close()

    def test_create_with_already_attached_attachment_is_rejected(self):
        staff_id = self.seed_staff()
        uploaded = self.upload("mayurika", "clip.mp3", b"fake-mp3-bytes")
        attachment_id = uploaded.json()["id"]
        first = self.create_summary("mayurika", staff_id, attachment_ids=[attachment_id])
        self.assertEqual(first.status_code, 201)
        second = self.create_summary("mayurika", staff_id, attachment_ids=[attachment_id])
        self.assertEqual(second.status_code, 422)
        self.assertEqual(self.count_summaries(), 1)

    # ── 4. Multiple attachments on one summary ──────────────────────────

    def test_multiple_attachments_all_attached_atomically(self):
        staff_id = self.seed_staff()
        ids = []
        for filename, content in [
            ("clip.mp3", b"audio-bytes"),
            ("notes.docx", b"word-bytes"),
            ("sheet.xlsx", b"excel-bytes"),
            ("photo.png", make_png_bytes()),
            ("scan.pdf", make_pdf_bytes()),
        ]:
            up = self.upload("mayurika", filename, content)
            self.assertEqual(up.status_code, 201)
            ids.append(up.json()["id"])

        resp = self.create_summary("mayurika", staff_id, attachment_ids=ids)
        self.assertEqual(resp.status_code, 201)
        body = resp.json()
        self.assertEqual(len(body["attachments"]), 5)
        returned_names = sorted(a["original_filename"] for a in body["attachments"])
        self.assertEqual(
            returned_names, sorted(["clip.mp3", "notes.docx", "sheet.xlsx", "photo.png", "scan.pdf"])
        )

    def test_one_invalid_id_among_several_valid_blocks_the_whole_create(self):
        """Atomicity: mixing a valid, owned, pending id with one invalid id
        must create NOTHING — not even the valid attachment gets attached,
        and no summary row is written."""
        staff_id = self.seed_staff()
        valid = self.upload("mayurika", "clip.mp3", b"audio-bytes")
        valid_id = valid.json()["id"]
        fake_id = "00000000-0000-0000-0000-000000000000"

        resp = self.create_summary("mayurika", staff_id, attachment_ids=[valid_id, fake_id])
        self.assertEqual(resp.status_code, 422)
        self.assertEqual(self.count_summaries(), 0)

        session = self.make_session()
        row = session.get(StaffReviewSummaryAttachment, uuid.UUID(valid_id))
        self.assertIsNone(row.summary_id)  # still pending, never attached
        session.close()

    def test_summary_with_no_attachments_returns_empty_list(self):
        staff_id = self.seed_staff()
        resp = self.create_summary("mayurika", staff_id, attachment_ids=[])
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["attachments"], [])

    # ── 5. Download (permissions + correctness) ─────────────────────────

    def test_owner_can_download_attachment(self):
        staff_id = self.seed_staff()
        content = b"fake-mp3-bytes"
        up = self.upload("mayurika", "clip.mp3", content)
        summary_id = self.create_summary("mayurika", staff_id, attachment_ids=[up.json()["id"]]).json()["id"]

        resp = self.client.get(
            "/api/staff-review-summaries/" + summary_id + "/attachments/" + up.json()["id"],
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.content, content)
        self.assertIn("clip.mp3", resp.headers.get("content-disposition", ""))

    def test_another_authenticated_reviewer_can_download_shared_read(self):
        staff_id = self.seed_staff()
        content = b"fake-mp3-bytes"
        up = self.upload("mayurika", "clip.mp3", content)
        summary_id = self.create_summary("mayurika", staff_id, attachment_ids=[up.json()["id"]]).json()["id"]

        resp = self.client.get(
            "/api/staff-review-summaries/" + summary_id + "/attachments/" + up.json()["id"],
            headers=bearer_header("arun"),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.content, content)

    def test_md_can_download_read_only(self):
        staff_id = self.seed_staff()
        content = b"fake-mp3-bytes"
        up = self.upload("mayurika", "clip.mp3", content)
        summary_id = self.create_summary("mayurika", staff_id, attachment_ids=[up.json()["id"]]).json()["id"]

        resp = self.client.get(
            "/api/staff-review-summaries/" + summary_id + "/attachments/" + up.json()["id"],
            headers=bearer_header("md"),
        )
        self.assertEqual(resp.status_code, 200)

    def test_missing_token_download_rejected(self):
        staff_id = self.seed_staff()
        up = self.upload("mayurika", "clip.mp3", b"fake-mp3-bytes")
        summary_id = self.create_summary("mayurika", staff_id, attachment_ids=[up.json()["id"]]).json()["id"]

        resp = self.client.get(
            "/api/staff-review-summaries/" + summary_id + "/attachments/" + up.json()["id"]
        )
        self.assertEqual(resp.status_code, 401)

    def test_wrong_summary_attachment_pair_returns_404(self):
        staff_id = self.seed_staff()
        up1 = self.upload("mayurika", "clip.mp3", b"one")
        summary1_id = self.create_summary("mayurika", staff_id, attachment_ids=[up1.json()["id"]]).json()["id"]

        up2 = self.upload("mayurika", "other.mp3", b"two")
        summary2_id = self.create_summary("mayurika", staff_id, attachment_ids=[up2.json()["id"]]).json()["id"]

        # attachment from summary2 requested under summary1's id
        resp = self.client.get(
            "/api/staff-review-summaries/" + summary1_id + "/attachments/" + up2.json()["id"],
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 404)

    def test_download_nonexistent_summary_returns_404(self):
        resp = self.client.get(
            "/api/staff-review-summaries/00000000-0000-0000-0000-000000000000/attachments/"
            "00000000-0000-0000-0000-000000000001",
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 404)

    # ── 6. PDF export content ────────────────────────────────────────────

    def test_pdf_export_embeds_image_and_lists_it(self):
        staff_id = self.seed_staff(full_name="PDF Image Staff")
        png_bytes = make_png_bytes()
        up = self.upload("mayurika", "photo.png", png_bytes, "image/png")
        self.create_summary("mayurika", staff_id, attachment_ids=[up.json()["id"]])

        resp = self.client.get(
            "/api/staff-review-summaries/export/pdf",
            params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        reader = PdfReader(BytesIO(resp.content))
        text = "".join(page.extract_text() or "" for page in reader.pages)
        self.assertIn("photo.png", text)
        self.assertIn("Image", text)
        # The image bytes were actually fetched from storage for embedding.
        self.assertIn(up.json()["id"] and self.storage.uploaded_public_ids[0], self.storage.downloaded_public_ids)

    def test_pdf_export_merges_pdf_attachment_pages(self):
        staff_id = self.seed_staff(full_name="PDF Merge Staff")
        pdf_bytes = make_pdf_bytes("Unique attached content marker")
        up = self.upload("mayurika", "scan.pdf", pdf_bytes, "application/pdf")
        self.create_summary("mayurika", staff_id, attachment_ids=[up.json()["id"]])

        resp = self.client.get(
            "/api/staff-review-summaries/export/pdf",
            params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        reader = PdfReader(BytesIO(resp.content))
        # At least 2 pages: the main body + the appended attachment page(s)
        # (a divider page plus the attached PDF's own page).
        self.assertGreaterEqual(len(reader.pages), 3)
        text = "".join(page.extract_text() or "" for page in reader.pages)
        self.assertIn("scan.pdf", text)
        self.assertIn("Unique attached content marker", text)

    def test_pdf_export_never_embeds_audio_lists_filename_only(self):
        staff_id = self.seed_staff(full_name="PDF Audio Staff")
        up = self.upload("mayurika", "meeting.mp3", b"fake-mp3-bytes", "audio/mpeg")
        self.create_summary("mayurika", staff_id, attachment_ids=[up.json()["id"]])

        resp = self.client.get(
            "/api/staff-review-summaries/export/pdf",
            params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        reader = PdfReader(BytesIO(resp.content))
        text = "".join(page.extract_text() or "" for page in reader.pages)
        self.assertIn("meeting.mp3", text)
        self.assertIn("never embedded or transcribed", text)
        # The audio bytes were never fetched from storage at all — the PDF
        # module never embeds audio, so the router must never even ask for
        # its bytes.
        audio_public_id = self.storage.uploaded_public_ids[0]
        self.assertNotIn(audio_public_id, self.storage.downloaded_public_ids)

    def test_pdf_export_converts_and_embeds_real_word_and_excel_attachments(self):
        """2026-09-23 (REQ-CAL-REV-PDF-ATTACH-CONVERT-001): word/excel
        attachments are now fetched and converted to PDF pages, the same
        way a native "pdf" attachment is appended — this replaces the
        pre-conversion-feature "listed without embedding" behavior."""
        staff_id = self.seed_staff(full_name="PDF Office Staff")
        docx_bytes = make_docx_bytes("Unique Word paragraph for conversion assertion.")
        xlsx_bytes = make_xlsx_bytes(sheet_name="ConversionSheet", cell_value="UniqueExcelCellValue")
        word_up = self.upload(
            "mayurika", "notes.docx", docx_bytes,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
        excel_up = self.upload(
            "mayurika", "sheet.xlsx", xlsx_bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.create_summary(
            "mayurika", staff_id, attachment_ids=[word_up.json()["id"], excel_up.json()["id"]]
        )

        resp = self.client.get(
            "/api/staff-review-summaries/export/pdf",
            params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        reader = PdfReader(BytesIO(resp.content))
        text = "".join(page.extract_text() or "" for page in reader.pages)
        # Filename appears in the attachment listing.
        self.assertIn("notes.docx", text)
        self.assertIn("sheet.xlsx", text)
        # The body note now says "converted and included", never a bare
        # "listed by filename only" wording, since conversion is attempted.
        self.assertIn("Converted and included as additional pages", text)
        # The converted content itself is actually present as real pages.
        self.assertIn("Unique Word paragraph for conversion assertion.", text)
        self.assertIn("ConversionSheet", text)
        self.assertIn("UniqueExcelCellValue", text)
        # Bytes ARE now fetched from storage for both (the real public_id,
        # not the attachment's database id — the two are distinct values).
        word_public_id = self.storage.uploaded_public_ids[-2]
        excel_public_id = self.storage.uploaded_public_ids[-1]
        self.assertIn(word_public_id, self.storage.downloaded_public_ids)
        self.assertIn(excel_public_id, self.storage.downloaded_public_ids)

    def test_pdf_export_reports_word_and_excel_conversion_failure_explicitly(self):
        """A genuinely unreadable/corrupt Word or Excel attachment (e.g. a
        legacy .doc, or simply an invalid file) must never be silently
        omitted or claimed as included — the specific failure reason is
        rendered into the export instead (REQ-CAL-REV-PDF-ATTACH-CONVERT-001)."""
        staff_id = self.seed_staff(full_name="PDF Office Failure Staff")
        word_up = self.upload("mayurika", "old_notes.doc", b"not a real ole file" * 5, "application/msword")
        excel_up = self.upload(
            "mayurika", "broken.xlsx", b"not a real zip at all",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
        self.create_summary(
            "mayurika", staff_id, attachment_ids=[word_up.json()["id"], excel_up.json()["id"]]
        )

        resp = self.client.get(
            "/api/staff-review-summaries/export/pdf",
            params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        reader = PdfReader(BytesIO(resp.content))
        text = "".join(page.extract_text() or "" for page in reader.pages)
        self.assertIn("could not be converted", text)
        self.assertIn("Legacy .doc format is not supported", text)
        self.assertIn("old_notes.doc", text)
        self.assertIn("broken.xlsx", text)
        # The failure is never silently claimed as included.
        self.assertNotIn("Not converted", text)  # that wording is for the size-cap/fetch-failure case only

    # ── 7. ZIP export ("Download complete review") ──────────────────────

    def test_zip_export_contains_pdf_and_every_attachment_including_audio(self):
        staff_id = self.seed_staff(full_name="ZIP Staff")
        audio_bytes = b"fake-mp3-bytes-for-zip"
        word_bytes = b"fake-docx-bytes-for-zip"
        audio_up = self.upload("mayurika", "clip.mp3", audio_bytes, "audio/mpeg")
        word_up = self.upload("mayurika", "notes.docx", word_bytes)
        self.create_summary(
            "mayurika", staff_id, attachment_ids=[audio_up.json()["id"], word_up.json()["id"]]
        )

        resp = self.client.get(
            "/api/staff-review-summaries/export/zip",
            params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.headers.get("content-type"), "application/zip")

        archive = zipfile.ZipFile(BytesIO(resp.content))
        names = archive.namelist()
        pdf_entries = [n for n in names if n.endswith(".pdf")]
        self.assertEqual(len(pdf_entries), 1)
        # The PDF's own bytes actually parse as a valid PDF.
        pdf_bytes_in_zip = archive.read(pdf_entries[0])
        PdfReader(BytesIO(pdf_bytes_in_zip))  # must not raise

        audio_entries = [n for n in names if n.endswith("clip.mp3")]
        self.assertEqual(len(audio_entries), 1)
        self.assertEqual(archive.read(audio_entries[0]), audio_bytes)

        word_entries = [n for n in names if n.endswith("notes.docx")]
        self.assertEqual(len(word_entries), 1)
        self.assertEqual(archive.read(word_entries[0]), word_bytes)

    def test_zip_export_empty_result_returns_404(self):
        staff_id = self.seed_staff(full_name="ZIP Empty Staff")
        resp = self.client.get(
            "/api/staff-review-summaries/export/zip",
            params={"reviewed_staff_id": staff_id},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 404)

    def test_zip_export_missing_token_rejected(self):
        staff_id = self.seed_staff()
        resp = self.client.get(
            "/api/staff-review-summaries/export/zip",
            params={"reviewed_staff_id": staff_id},
        )
        self.assertEqual(resp.status_code, 401)

    def test_zip_and_pdf_filenames_are_distinct(self):
        staff_id = self.seed_staff(full_name="Filename Distinct Staff")
        up = self.upload("mayurika", "clip.mp3", b"fake-mp3-bytes")
        self.create_summary("mayurika", staff_id, attachment_ids=[up.json()["id"]])

        pdf_resp = self.client.get(
            "/api/staff-review-summaries/export/pdf",
            params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        zip_resp = self.client.get(
            "/api/staff-review-summaries/export/zip",
            params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        pdf_disposition = pdf_resp.headers.get("content-disposition", "")
        zip_disposition = zip_resp.headers.get("content-disposition", "")
        self.assertIn("Review_Summary_", pdf_disposition)
        self.assertIn("Complete_Review_", zip_disposition)
        self.assertNotEqual(pdf_disposition, zip_disposition)


if __name__ == "__main__":
    unittest.main()

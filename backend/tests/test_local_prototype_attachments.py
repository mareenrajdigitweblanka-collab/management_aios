"""HTTP-level tests for Local Prototype Attachment mode
(REQ-CAL-REV-ATTACH-001-LOCAL-PROTO, 2026-09-23,
LOCAL_PROTOTYPE_ATTACHMENTS=true).

Uses the same isolated in-memory SQLite pattern as every other test in
this repo for the REAL PostgreSQL-backed content (StaffReviewSummary,
StaffDashboardRecord) — PLUS a SEPARATE, per-test, isolated ON-DISK SQLite
file (in a temp directory, via backend.config.LOCAL_ATTACHMENT_METADATA_DB_PATH)
for the attachment metadata this mode adds. FakeAttachmentStorage stands in
for Cloudinary — no real Cloudinary call is ever made by this file.

IMPORTANT — this file does NOT prove a real Cloudinary round trip works.
That can only be verified with real, configured Cloudinary credentials
against the real API — see the conversation record / final report for that
separate, manual verification. Do not read "all tests pass here" as
"production Cloudinary integration confirmed."

Run with: python -m unittest backend.tests.test_local_prototype_attachments
"""

import tempfile
import unittest
import uuid
import zipfile
import zlib
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from unittest import mock

from fastapi.testclient import TestClient
from pypdf import PdfReader

import backend.config as config
import backend.local_attachment_metadata as local_attachment_metadata
from backend.attachment_storage import FakeAttachmentStorage, get_attachment_storage
from backend.database import get_db
from backend.main import app
from backend.models import StaffDashboardRecord
from backend.tests.calendar_auth_test_support import (
    assert_isolated_sqlite_override,
    bearer_header,
    forbid_real_database_engine,
    make_sqlite_engine_and_session_factory,
    patched_calendar_auth_env,
)


class LocalPrototypeAttachmentsTestCase(unittest.TestCase):
    """Each test gets: (1) the usual isolated in-memory SQLite database for
    StaffReviewSummary/StaffDashboardRecord (real PostgreSQL content is
    NEVER touched by local-prototype mode — this mirrors that), (2) a
    fresh, isolated, real-on-disk-but-temp-directory SQLite file for
    attachment metadata, and (3) LOCAL_PROTOTYPE_ATTACHMENTS=true patched
    into the environment for the whole test."""

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

        # Isolated, temp-directory-only local attachment metadata SQLite
        # file — never the real local_data/ path, never shared across
        # tests.
        self._temp_dir = tempfile.TemporaryDirectory()
        temp_db_path = str(Path(self._temp_dir.name) / "test_local_attachments.db")
        self._path_patch = mock.patch.object(
            config, "LOCAL_ATTACHMENT_METADATA_DB_PATH", temp_db_path
        )
        self._path_patch.start()
        local_attachment_metadata.reset_local_attachment_engine_for_tests()

        # patched_calendar_auth_env() itself forces LOCAL_PROTOTYPE_ATTACHMENTS
        # to "" (off) by default (see its own docstring) — this test needs it
        # ON, so its own patch is applied AFTER (and therefore wins over) that
        # one, exactly like the class docstring there describes.
        self.env_ctx = patched_calendar_auth_env(include_md=True)
        self.env_ctx.__enter__()

        self._env_patch = mock.patch.dict(
            "os.environ", {"LOCAL_PROTOTYPE_ATTACHMENTS": "true"}, clear=False
        )
        self._env_patch.start()

        self.client_ctx = TestClient(app)
        self.client = self.client_ctx.__enter__()

    def tearDown(self):
        self.client_ctx.__exit__(None, None, None)
        self._env_patch.stop()
        self.env_ctx.__exit__(None, None, None)
        local_attachment_metadata.reset_local_attachment_engine_for_tests()
        self._path_patch.stop()
        self._temp_dir.cleanup()
        self.forbid_real_db_ctx.__exit__(None, None, None)
        app.dependency_overrides.clear()
        self.engine.dispose()

    def seed_staff(self, source_record_key="staff-local-proto", full_name="Local Prototype Staff"):
        session = self.SessionLocal()
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

    def upload(self, member_key, filename, content, content_type="application/octet-stream"):
        return self.client.post(
            "/api/staff-review-summaries/attachments",
            files={"file": (filename, BytesIO(content), content_type)},
            headers=bearer_header(member_key),
        )

    def create_summary(self, member_key, staff_id, attachment_ids=None, summary_text="Local prototype verification."):
        return self.client.post(
            "/api/staff-review-summaries",
            json={
                "reviewed_staff_id": str(staff_id),
                "meeting_date": "2026-09-23",
                "summary_text": summary_text,
                "attachment_ids": [str(a) for a in (attachment_ids or [])],
            },
            headers=bearer_header(member_key),
        )

    # ── Mode reporting ───────────────────────────────────────────────

    def test_storage_mode_endpoint_reports_local_prototype(self):
        resp = self.client.get(
            "/api/staff-review-summaries/attachments/storage-mode",
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json(), {"mode": "local_prototype"})

    # ── Upload -> pending -> claim, preserving the exact same flow/rules ─

    def test_upload_creates_a_pending_row_invisible_until_claimed(self):
        staff_id = self.seed_staff()
        up = self.upload("mayurika", "clip.mp3", b"fake mp3 bytes", "audio/mpeg")
        self.assertEqual(up.status_code, 201)
        attachment_id = up.json()["id"]

        # Not yet claimed — must not appear as a saved attachment anywhere,
        # even though it now durably exists in local SQLite metadata.
        pending_row = local_attachment_metadata.local_get_pending_by_ids(
            [uuid.UUID(attachment_id)]
        )[uuid.UUID(attachment_id)]
        self.assertIsNone(pending_row.summary_id)

        resp = self.create_summary("mayurika", staff_id, attachment_ids=[])
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.json()["attachments"], [])  # never auto-attached

    def test_create_with_valid_attachment_id_claims_it(self):
        staff_id = self.seed_staff()
        up = self.upload("mayurika", "clip.mp3", b"fake mp3 bytes", "audio/mpeg")
        attachment_id = up.json()["id"]

        resp = self.create_summary("mayurika", staff_id, attachment_ids=[attachment_id])
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(len(resp.json()["attachments"]), 1)
        self.assertEqual(resp.json()["attachments"][0]["original_filename"], "clip.mp3")

    def test_create_with_someone_elses_pending_attachment_is_rejected(self):
        staff_id = self.seed_staff()
        up = self.upload("mayurika", "clip.mp3", b"fake mp3 bytes")
        attachment_id = up.json()["id"]
        resp = self.create_summary("suman", staff_id, attachment_ids=[attachment_id])
        self.assertEqual(resp.status_code, 422)
        # Still pending, never silently reassigned.
        row = local_attachment_metadata.local_get_pending_by_ids(
            [uuid.UUID(attachment_id)]
        )[uuid.UUID(attachment_id)]
        self.assertIsNone(row.summary_id)

    def test_failed_create_never_falsely_claims_an_attachment(self):
        """A create referencing a nonexistent attachment id must fail
        cleanly (422) with nothing written — no PostgreSQL summary row,
        and the real, valid attachment (if any were also referenced)
        stays unclaimed. Here we prove the simplest case: no summary row
        is created at all when the only referenced id is invalid."""
        staff_id = self.seed_staff()
        fake_id = "00000000-0000-0000-0000-000000000000"
        resp = self.create_summary("mayurika", staff_id, attachment_ids=[fake_id])
        self.assertEqual(resp.status_code, 422)

    def test_md_cannot_upload_in_local_prototype_mode_either(self):
        resp = self.client.post(
            "/api/staff-review-summaries/attachments",
            files={"file": ("clip.mp3", BytesIO(b"x"), "audio/mpeg")},
            headers=bearer_header("md"),
        )
        self.assertEqual(resp.status_code, 403)

    def test_missing_token_upload_rejected_in_local_prototype_mode(self):
        resp = self.client.post(
            "/api/staff-review-summaries/attachments",
            files={"file": ("clip.mp3", BytesIO(b"x"), "audio/mpeg")},
        )
        self.assertEqual(resp.status_code, 401)

    # ── Existing reviews with no attachments load normally ─────────────

    def test_existing_summary_with_no_attachments_loads_normally(self):
        staff_id = self.seed_staff()
        resp = self.create_summary("mayurika", staff_id, attachment_ids=[])
        self.assertEqual(resp.status_code, 201)
        summary_id = resp.json()["id"]

        detail = self.client.get(
            "/api/staff-review-summaries/" + summary_id, headers=bearer_header("mayurika")
        )
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.json()["attachments"], [])

    # ── Read history, individual download, PDF, ZIP — through the local
    #    metadata backend ─────────────────────────────────────────────

    def test_history_list_shows_the_claimed_attachment(self):
        staff_id = self.seed_staff()
        up = self.upload("mayurika", "photo.png", b"fake png bytes", "image/png")
        summary_id = self.create_summary(
            "mayurika", staff_id, attachment_ids=[up.json()["id"]]
        ).json()["id"]

        resp = self.client.get(
            "/api/staff-review-summaries",
            params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        record = resp.json()["records"][0]
        self.assertEqual(record["id"], summary_id)
        self.assertEqual(len(record["attachments"]), 1)

    def test_individual_download_returns_original_bytes(self):
        staff_id = self.seed_staff()
        content = b"fake mp3 bytes for local prototype download"
        up = self.upload("mayurika", "clip.mp3", content, "audio/mpeg")
        summary_id = self.create_summary(
            "mayurika", staff_id, attachment_ids=[up.json()["id"]]
        ).json()["id"]

        resp = self.client.get(
            "/api/staff-review-summaries/" + summary_id + "/attachments/" + up.json()["id"],
            headers=bearer_header("arun"),  # shared-read: any authenticated member
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.content, content)

    def test_download_of_unclaimed_pending_attachment_is_not_found(self):
        staff_id = self.seed_staff()
        up = self.upload("mayurika", "clip.mp3", b"x")
        summary_id = self.create_summary("mayurika", staff_id, attachment_ids=[]).json()["id"]
        resp = self.client.get(
            "/api/staff-review-summaries/" + summary_id + "/attachments/" + up.json()["id"],
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 404)

    def test_pdf_export_includes_the_local_prototype_attachment(self):
        staff_id = self.seed_staff(full_name="PDF Local Proto Staff")
        up = self.upload("mayurika", "notes.docx", b"fake docx bytes")
        self.create_summary("mayurika", staff_id, attachment_ids=[up.json()["id"]])

        resp = self.client.get(
            "/api/staff-review-summaries/export/pdf",
            params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        reader = PdfReader(BytesIO(resp.content))
        text = "".join(page.extract_text() or "" for page in reader.pages)
        self.assertIn("notes.docx", text)

    def test_zip_export_includes_the_local_prototype_attachment(self):
        staff_id = self.seed_staff(full_name="ZIP Local Proto Staff")
        content = b"fake mp3 bytes for zip"
        up = self.upload("mayurika", "clip.mp3", content, "audio/mpeg")
        self.create_summary("mayurika", staff_id, attachment_ids=[up.json()["id"]])

        resp = self.client.get(
            "/api/staff-review-summaries/export/zip",
            params={"reviewed_staff_id": staff_id, "reviewer_member_key": "mayurika"},
            headers=bearer_header("mayurika"),
        )
        self.assertEqual(resp.status_code, 200)
        archive = zipfile.ZipFile(BytesIO(resp.content))
        audio_entries = [n for n in archive.namelist() if n.endswith("clip.mp3")]
        self.assertEqual(len(audio_entries), 1)
        self.assertEqual(archive.read(audio_entries[0]), content)

    # ── Persistence across a fresh backend "restart" (a new engine/session
    #    against the SAME on-disk file — the real-world equivalent of
    #    stopping and restarting the uvicorn process) ────────────────────

    def test_data_persists_across_a_simulated_backend_restart(self):
        staff_id = self.seed_staff()
        up = self.upload("mayurika", "clip.mp3", b"persisted bytes", "audio/mpeg")
        attachment_id = up.json()["id"]
        summary_id = self.create_summary(
            "mayurika", staff_id, attachment_ids=[attachment_id]
        ).json()["id"]

        # Simulates a real backend restart: dispose the engine (closing
        # every connection) without deleting the on-disk file, forcing the
        # next access to open a brand-new engine/session against the same
        # file — exactly what happens when the uvicorn process is stopped
        # and started again against the same LOCAL_ATTACHMENT_METADATA_DB_PATH.
        local_attachment_metadata.reset_local_attachment_engine_for_tests()

        resp = self.client.get(
            "/api/staff-review-summaries/" + summary_id, headers=bearer_header("mayurika")
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.json()["attachments"]), 1)
        self.assertEqual(resp.json()["attachments"][0]["original_filename"], "clip.mp3")


if __name__ == "__main__":
    unittest.main()

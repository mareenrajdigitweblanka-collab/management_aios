"""Review Summary Attachment storage abstraction (REQ-CAL-REV-ATTACH-001,
2026-09-23).

ONE interface (AttachmentStorage), two implementations:
  - CloudinaryAttachmentStorage — the real provider, the only one wired to
    production. Cloudinary is the provider this project's .env already
    names (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET), even though no
    application code referenced it before this feature.
  - FakeAttachmentStorage — an in-memory test double. Every automated test
    in this repo uses this one; none of them ever call the real Cloudinary
    API or require real credentials.

Every asset is uploaded with type="authenticated" (Cloudinary's private,
signed-URL-only delivery mode) — never type="upload" (public). There is no
code path anywhere in this backend that hands a raw Cloudinary URL to the
browser: backend/routers/staff_review_summaries.py always fetches bytes
through this module server-side and streams them back through an
authenticated FastAPI route, so every download re-checks the same
authorization rule the parent summary already enforces before any byte
reaches the browser (see get_verified_member / _get_active_summary_or_404
in that router). This is what "enforce authorization on the backend,
never rely on a hidden UI control or an unauthenticated storage URL" means
for this feature.

Public_id is always a server-generated UUID-based key
(build_storage_public_id below) — never derived from the user-supplied
filename, so a filename can never influence, collide with, or traverse the
storage key. The user-supplied filename is stored purely as display
metadata (StaffReviewSummaryAttachment.original_filename), already
sanitized (backend/routers/staff_review_summaries.py
sanitize_attachment_filename) before it is ever persisted.
"""

import io
import urllib.error
import urllib.request
import uuid
from typing import Optional, Protocol

from backend.config import load_cloudinary_config

ATTACHMENT_STORAGE_FOLDER = "management-aios/review-summary-attachments"


class AttachmentStorageUnavailable(RuntimeError):
    """Raised when the configured provider cannot be used right now (e.g.
    Cloudinary credentials are unset/blank — see
    backend/config.py load_cloudinary_config). Routes that create this
    exception must turn it into a clean 503, never a raw 500 — see
    backend/routers/staff_review_summaries.py upload_review_summary_attachment.
    Never raised by FakeAttachmentStorage, which is always "available" for
    tests."""


class AttachmentStorage(Protocol):
    """The only interface backend/routers/staff_review_summaries.py is
    allowed to depend on — never a concrete provider class directly, so a
    test can substitute FakeAttachmentStorage via the same
    app.dependency_overrides pattern already used for get_db (see
    backend/database.py / backend/tests/calendar_auth_test_support.py)."""

    def upload(
        self, file_bytes: bytes, *, public_id: str, resource_type: str, content_type: str
    ) -> None:
        """Uploads file_bytes under public_id/resource_type. Must raise
        (never silently no-op) if the upload does not durably succeed —
        the caller (the attachment-upload route) only inserts a database
        row once this call returns without raising, which is exactly what
        makes a failed upload unable to ever produce a database row for a
        missing file."""
        ...

    def download_bytes(self, public_id: str, resource_type: str) -> bytes:
        """Returns the complete original file bytes for a previously
        uploaded asset. Used by: the original-file download route, PDF
        export (to embed images/merge PDF-attachment pages), and the
        "Download complete review" ZIP export."""
        ...

    def delete(self, public_id: str, resource_type: str) -> None:
        """Deletes a previously uploaded asset. Used only by
        scripts/cleanup_pending_review_summary_attachments.py to remove an
        orphaned partial upload's file alongside its database row. Never
        called from any request-handling route — there is no attachment
        deletion feature in this phase, only pending-upload cleanup."""
        ...


def build_storage_public_id() -> str:
    """A fresh, non-guessable, user-input-independent storage key. Never
    derived from original_filename, summary_id, or reviewer identity — a
    UUID alone is sufficient uniqueness and carries no information an
    attacker could use to guess another attachment's key."""
    return ATTACHMENT_STORAGE_FOLDER + "/" + str(uuid.uuid4())


class CloudinaryAttachmentStorage:
    """Real provider. Configures the `cloudinary` SDK lazily, from
    backend/config.py load_cloudinary_config(), on first use of THIS
    instance — never at import time, never at module load — so importing
    this module (e.g. transitively, via backend.routers.staff_review_summaries)
    never requires Cloudinary credentials to be present, matching every
    other optional-config loader in this backend (e.g.
    load_md_review_summary_token_hash)."""

    def __init__(self, environ=None):
        self._environ = environ
        self._configured = False

    def _ensure_configured(self):
        if self._configured:
            return
        config = load_cloudinary_config(self._environ)
        if config is None:
            raise AttachmentStorageUnavailable(
                "Cloudinary is not configured (CLOUDINARY_CLOUD_NAME/API_KEY/"
                "API_SECRET). Attachment storage is unavailable."
            )
        import cloudinary  # imported lazily — never required to import this module

        cloudinary.config(
            cloud_name=config["cloud_name"],
            api_key=config["api_key"],
            api_secret=config["api_secret"],
            secure=True,
        )
        self._configured = True

    def upload(
        self, file_bytes: bytes, *, public_id: str, resource_type: str, content_type: str
    ) -> None:
        self._ensure_configured()
        import cloudinary.uploader

        cloudinary.uploader.upload(
            io.BytesIO(file_bytes),
            public_id=public_id,
            resource_type=resource_type,
            type="authenticated",  # private delivery — signed URL required to read
            overwrite=False,
            unique_filename=False,
            use_filename=False,
        )

    def download_bytes(self, public_id: str, resource_type: str) -> bytes:
        self._ensure_configured()
        import cloudinary.utils

        signed_url, _options = cloudinary.utils.cloudinary_url(
            public_id,
            resource_type=resource_type,
            type="authenticated",
            sign_url=True,
        )
        try:
            with urllib.request.urlopen(signed_url, timeout=30) as response:
                return response.read()
        except urllib.error.HTTPError as exc:
            # 401 "deny or ACL failure" is what Cloudinary's signed DELIVERY
            # url returns for a PDF when the account's "PDF and ZIP files
            # delivery" restriction is on (Settings > Security) — the asset,
            # its resource_type/type and the signature are all correct (an
            # image or Word file from the same folder downloads fine). The
            # same private asset can still be read server-side through
            # Cloudinary's API-authenticated download endpoint, signed with
            # this backend's API secret. Nothing is made public and no
            # access rule changes: bytes still reach the browser only
            # through the authenticated FastAPI route. Only a 401 falls
            # through to this; any other status is a real failure.
            if exc.code != 401:
                raise
            return self._download_via_private_api(public_id, resource_type)

    def _download_via_private_api(self, public_id: str, resource_type: str) -> bytes:
        import cloudinary.api
        import cloudinary.utils

        # The API download endpoint needs the asset's stored format (the
        # public_id carries no extension); one Admin API call supplies it.
        resource = cloudinary.api.resource(
            public_id, resource_type=resource_type, type="authenticated"
        )
        download_url = cloudinary.utils.private_download_url(
            public_id,
            resource.get("format") or "",
            resource_type=resource_type,
            type="authenticated",
        )
        with urllib.request.urlopen(download_url, timeout=30) as response:
            return response.read()

    def delete(self, public_id: str, resource_type: str) -> None:
        self._ensure_configured()
        import cloudinary.uploader

        cloudinary.uploader.destroy(
            public_id, resource_type=resource_type, type="authenticated"
        )


class FakeAttachmentStorage:
    """In-memory test double — every automated test in this repo uses this,
    never CloudinaryAttachmentStorage. Never raises AttachmentStorageUnavailable
    (it has no external credentials to be missing); `raise_on_upload`,
    settable per-test, is the ONLY way a test simulates an upload failure
    (see test_partial_upload_failure_never_creates_summary in
    backend/tests/test_review_summary_attachments.py)."""

    def __init__(self):
        self._store: dict = {}
        self.raise_on_upload: Optional[Exception] = None
        self.uploaded_public_ids: list = []
        self.deleted_public_ids: list = []
        # Testability only — lets a test assert exactly which assets were
        # ever fetched (e.g. proving an audio attachment's bytes are never
        # requested for PDF embedding, since the PDF module never embeds
        # audio at all).
        self.downloaded_public_ids: list = []

    def upload(
        self, file_bytes: bytes, *, public_id: str, resource_type: str, content_type: str
    ) -> None:
        if self.raise_on_upload is not None:
            raise self.raise_on_upload
        self._store[(public_id, resource_type)] = file_bytes
        self.uploaded_public_ids.append(public_id)

    def download_bytes(self, public_id: str, resource_type: str) -> bytes:
        self.downloaded_public_ids.append(public_id)
        try:
            return self._store[(public_id, resource_type)]
        except KeyError:
            raise AttachmentStorageUnavailable(
                f"No fake-stored bytes for {public_id!r}/{resource_type!r}."
            )

    def delete(self, public_id: str, resource_type: str) -> None:
        self._store.pop((public_id, resource_type), None)
        self.deleted_public_ids.append(public_id)


# ── FastAPI dependency ────────────────────────────────────────────────────
# Lazy singleton, same shape as backend/database.py get_engine()/
# get_session_factory() — constructed once, reused across requests.
# Overridden in every test via app.dependency_overrides[get_attachment_storage]
# = lambda: <a FakeAttachmentStorage instance>, exactly like get_db is
# overridden to an isolated SQLite session.

_storage_instance: Optional[CloudinaryAttachmentStorage] = None


def get_attachment_storage() -> AttachmentStorage:
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = CloudinaryAttachmentStorage()
    return _storage_instance

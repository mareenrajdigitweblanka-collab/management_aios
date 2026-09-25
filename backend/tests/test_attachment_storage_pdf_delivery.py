"""CloudinaryAttachmentStorage.download_bytes — PDF delivery fallback
(2026-09-24). No real Cloudinary call: urllib and the cloudinary SDK are
patched. Run with: python -m unittest backend.tests.test_attachment_storage_pdf_delivery
"""

import io
import unittest
import urllib.error
from unittest import mock

from backend.attachment_storage import CloudinaryAttachmentStorage

ENV = {"CLOUDINARY_CLOUD_NAME": "test-cloud", "CLOUDINARY_API_KEY": "k", "CLOUDINARY_API_SECRET": "s"}


class _Response(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def _http_error(code):
    return urllib.error.HTTPError("https://example.invalid/x", code, "denied", {}, None)


class PdfDeliveryFallbackTests(unittest.TestCase):
    def setUp(self):
        self.storage = CloudinaryAttachmentStorage(environ=ENV)

    def test_normal_delivery_never_touches_the_private_api(self):
        with mock.patch("urllib.request.urlopen", return_value=_Response(b"IMG")) as urlopen, \
                mock.patch("cloudinary.api.resource") as resource:
            self.assertEqual(self.storage.download_bytes("folder/id", "image"), b"IMG")
        self.assertEqual(urlopen.call_count, 1)
        resource.assert_not_called()

    def test_401_falls_back_to_the_signed_private_download(self):
        calls = []

        def fake_urlopen(url, timeout=None):
            calls.append(url)
            if len(calls) == 1:
                raise _http_error(401)
            return _Response(b"%PDF-1.4 real bytes")

        with mock.patch("urllib.request.urlopen", side_effect=fake_urlopen), \
                mock.patch("cloudinary.api.resource", return_value={"format": "pdf"}) as resource:
            data = self.storage.download_bytes("folder/id", "image")
        self.assertEqual(data, b"%PDF-1.4 real bytes")
        resource.assert_called_once_with("folder/id", resource_type="image", type="authenticated")
        self.assertEqual(len(calls), 2)
        # the fallback URL is the API download endpoint for the PRIVATE asset, never a public one
        self.assertIn("/image/download", calls[1])
        self.assertIn("authenticated", calls[1])
        self.assertNotIn("/image/upload/", calls[1])

    def test_other_http_errors_are_not_retried(self):
        with mock.patch("urllib.request.urlopen", side_effect=_http_error(404)) as urlopen, \
                mock.patch("cloudinary.api.resource") as resource:
            with self.assertRaises(urllib.error.HTTPError):
                self.storage.download_bytes("folder/id", "image")
        self.assertEqual(urlopen.call_count, 1)
        resource.assert_not_called()

    def test_persistent_401_surfaces_as_an_error(self):
        with mock.patch("urllib.request.urlopen", side_effect=_http_error(401)), \
                mock.patch("cloudinary.api.resource", return_value={"format": "pdf"}):
            with self.assertRaises(urllib.error.HTTPError):
                self.storage.download_bytes("folder/id", "image")


if __name__ == "__main__":
    unittest.main()

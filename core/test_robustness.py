"""A broken media/storage setup must never turn read endpoints into HTTP 500, and 500/404 must be JSON the frontend can show."""
from unittest import mock
from django.core.cache import cache
from django.test import Client, override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase
from .models import User, Video
from . import media as media_mod

BROKEN_S3 = {"default": {"BACKEND": "storages.backends.s3.S3Storage", "OPTIONS": {"bucket_name": "b", "access_key": "", "secret_key": "", "endpoint_url": "http://127.0.0.1:9", "signature_version": "s3v4"}},
             "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}}

class BrokenStorageDoesNotCrashTheApp(APITestCase):
    def setUp(self):
        media_mod._last_warned.clear(); cache.clear(); self.a = User.objects.create_user("a", password="pass12345"); self.b = User.objects.create_user("b", password="pass12345")
        self.v = Video.objects.create(owner=self.b, file="videos/lost.mp4", thumbnail="thumbs/t.jpg", caption="x", mood="happy")
        self.client.credentials(HTTP_AUTHORIZATION="Token " + Token.objects.create(user=self.a).key)
    def test_feeds_and_lists_return_200_with_null_urls_instead_of_500(self):
        with override_settings(STORAGES=BROKEN_S3, USES_S3=True, STORAGE_KIND="s3"):
            for path in ("/api/videos/feed/?offset=0", "/api/videos/", "/api/videos/explore/", f"/api/videos/{self.v.id}/", "/api/home/stories/", "/api/search/?q=x", "/api/stories/"):
                r = self.client.get(path); self.assertEqual(r.status_code, 200, f"{path} -> {r.status_code}")
            item = self.client.get("/api/videos/feed/?offset=0").data["results"][0]; self.assertIsNone(item["file"]); self.assertEqual(item["caption"], "x")   # the video row is still listed, just without a playable URL

    def test_health_reports_the_storage_problem_in_plain_words(self):
        with override_settings(STORAGES=BROKEN_S3, USES_S3=True, STORAGE_KIND="s3"):
            d = self.client.get("/healthz/").json()
        self.assertEqual((d["status"], d["storage_ok"], d["database"]), ("degraded", False, "ok")); self.assertIn("NoCredentialsError", d["storage_detail"]); self.assertTrue(any("storage" in w.lower() for w in d["warnings"]))
        self.assertEqual(self.client.get("/healthz/").json()["storage_ok"], True)                                          # local storage: fine

    def test_health_reports_unapplied_migrations(self):
        with mock.patch("core.health.pending_migrations", return_value=3): d = self.client.get("/healthz/").json()
        self.assertEqual((d["status"], d["migrations_pending"]), ("degraded", 3)); self.assertTrue(any("migration" in w.lower() for w in d["warnings"]))
        d = self.client.get("/healthz/").json(); self.assertEqual((d["migrations_pending"], d["status"]), (0, "ok"))

    def test_server_errors_and_missing_pages_are_json_with_a_real_message(self):
        c = Client(raise_request_exception=False)
        with mock.patch("core.views.visible_videos", side_effect=RuntimeError("boom")):
            r = c.get("/api/videos/feed/", HTTP_AUTHORIZATION="Token " + Token.objects.get(user=self.a).key)
        self.assertEqual((r.status_code, r["Content-Type"].split(";")[0], r.json()["code"]), (500, "application/json", "server_error")); self.assertNotIn("boom", r.content.decode())   # no internals leaked
        r = c.get("/definitely/missing/"); self.assertEqual((r.status_code, r.json()["code"]), (404, "not_found"))

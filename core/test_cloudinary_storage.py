"""Cloudinary integration test against a FAKE Cloudinary HTTP server that verifies the SDK's signed requests (same SHA-1/256 scheme as the real service).
Proves our storage + the real `cloudinary` SDK work together end to end through the API. It does NOT prove anything about your real Cloudinary account/plan limits."""
import hashlib, io, json, re, threading, unittest
from datetime import date
from email import policy
from email.parser import BytesParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, unquote
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase
from .models import User, Video
from . import media as media_mod
try:
    import cloudinary, cloudinary.api, cloudinary.uploader
    HAVE = True
except ImportError: HAVE = False

CLOUD, KEY, SECRET = "democloud", "123456", "s3cr3t-value"
MP4 = b"\x00\x00\x00\x18ftypmp42" + bytes(range(256)) * 30
SKIP = {"file", "cloud_name", "resource_type", "api_key", "signature"}

class FakeCloudinary(ThreadingHTTPServer):
    daemon_threads = True
    def __init__(self):
        super().__init__(("127.0.0.1", 0), _H); self.store = {}; self.log = []; self.secret = SECRET
class _H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def _send(self, code, obj): b = json.dumps(obj).encode(); self.send_response(code); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def _auth_ok_basic(self):
        import base64; h = self.headers.get("Authorization", ""); return h.startswith("Basic ") and base64.b64decode(h[6:]).decode() == f"{KEY}:{self.server.secret}"
    def do_GET(self):
        p = self.path.split("?")[0]
        if not self._auth_ok_basic(): return self._send(401, {"error": {"message": "Invalid credentials"}})
        if p == f"/v1_1/{CLOUD}/ping": return self._send(200, {"status": "OK"})
        m = re.match(rf"^/v1_1/{CLOUD}/resources/(image|video|raw)/(upload|authenticated)/(.+)$", p)
        if m:
            k = (m.group(1), m.group(2), unquote(m.group(3))); r = self.server.store.get(k)
            return self._send(200, {"public_id": k[2], "bytes": len(r)}) if r is not None else self._send(404, {"error": {"message": f"Resource not found - {k[2]}"}})
        self._send(404, {"error": {"message": "unknown route"}})
    def do_POST(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", 0))); ct = self.headers.get("Content-Type", ""); fields, files = {}, {}
        if ct.startswith("multipart/"):
            msg = BytesParser(policy=policy.HTTP).parsebytes(b"Content-Type: " + ct.encode() + b"\r\nMIME-Version: 1.0\r\n\r\n" + body)
            for part in msg.iter_parts():
                n = part.get_param("name", header="content-disposition"); data = part.get_payload(decode=True)
                if part.get_filename() is not None: files[n] = (part.get_filename(), data)
                else: fields[n] = data.decode()
        else: fields = {k: v[0] for k, v in parse_qs(body.decode()).items()}
        m = re.match(rf"^/v1_1/{CLOUD}/(image|video|raw)/(upload|destroy)$", self.path)
        if not m: return self._send(404, {"error": {"message": "unknown route"}})
        if fields.get("api_key") != KEY: return self._send(401, {"error": {"message": "Invalid api_key"}})
        to_sign = "&".join(f"{k}={fields[k]}" for k in sorted(fields) if k not in SKIP and fields[k] != "") + self.server.secret   # Cloudinary's signing scheme
        if fields.get("signature") not in (hashlib.sha1(to_sign.encode()).hexdigest(), hashlib.sha256(to_sign.encode()).hexdigest()): return self._send(401, {"error": {"message": "Invalid Signature"}})
        rt, action = m.group(1), m.group(2); typ = fields.get("type", "upload"); pid = fields["public_id"]
        self.server.log.append((action, rt, typ, pid))
        if action == "upload":
            fn, data = files["file"]; ext = fn.rsplit(".", 1)[-1].lower() if "." in fn else ("mp4" if rt == "video" else "jpg"); self.server.store.setdefault((rt, typ, pid), data)
            return self._send(200, {"public_id": pid, "version": 1, "format": ext, "resource_type": rt, "type": typ, "bytes": len(data)})
        existed = self.server.store.pop((rt, typ, pid), None) is not None
        return self._send(200, {"result": "ok" if existed else "not found"})

@unittest.skipUnless(HAVE, "cloudinary SDK not installed")
class CloudinaryEndToEnd(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass(); cls.srv = FakeCloudinary(); threading.Thread(target=cls.srv.serve_forever, daemon=True).start(); cls.prefix = f"http://127.0.0.1:{cls.srv.server_address[1]}"
    @classmethod
    def tearDownClass(cls): cls.srv.shutdown(); cls.srv.server_close(); super().tearDownClass()
    def opts(self, **kw): return {"BACKEND": "core.cloudinary_storage.CloudinaryStorage", "OPTIONS": {"delivery": "upload", "folder": "zingo", "cloud_name": CLOUD, "api_key": KEY, "api_secret": SECRET, "upload_prefix": self.prefix, **kw}}
    def use(self, **kw):
        o = override_settings(STORAGES={"default": self.opts(**kw), "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"}}, USES_S3=True, STORAGE_KIND="cloudinary", DATE_LAUNCH_STATE="development"); o.enable(); self.addCleanup(o.disable)
        from django.core.files.storage import default_storage; default_storage._setup() if hasattr(default_storage, "_setup") else None
    def setUp(self):
        cache.clear(); media_mod._last_warned.clear(); self.srv.store.clear(); self.srv.log.clear(); self.srv.secret = SECRET
        self.u = User.objects.create_user("cu", password="pass12345", date_of_birth=date(1995, 1, 1)); self.client.credentials(HTTP_AUTHORIZATION="Token " + Token.objects.create(user=self.u).key)

    def test_video_upload_uses_the_video_api_with_a_valid_signature_and_returns_a_cloudinary_url(self):
        self.use(); r = self.client.post("/api/videos/", {"file": SimpleUploadedFile("clip.mp4", MP4, content_type="video/mp4"), "caption": "hi"}, format="multipart"); self.assertEqual(r.status_code, 201, r.data)
        name = Video.objects.get().file.name; self.assertRegex(name, r"^videos/[0-9a-f]{32}\.mp4$")                                    # same naming as local/S3: old rows stay valid
        (action, rt, typ, pid), = self.srv.log; self.assertEqual((action, rt, typ), ("upload", "video", "upload")); self.assertEqual(pid, "zingo/" + name[:-4])
        self.assertEqual(self.srv.store[("video", "upload", pid)], MP4)                                                               # the exact bytes arrived
        self.assertRegex(r.data["file"], rf"^https://res\.cloudinary\.com/{CLOUD}/video/upload/(v\d+/)?zingo/videos/[0-9a-f]{{32}}\.mp4$")
        self.assertEqual(self.client.get(f"/api/videos/{r.data['id']}/").data["file"], r.data["file"])

    def test_dating_photo_goes_to_the_image_resource_type(self):
        self.use(); self.assertEqual(self.client.post("/api/date/profile/create/").status_code, 201); b = io.BytesIO(); Image.new("RGB", (50, 70), "pink").save(b, "PNG")
        r = self.client.post("/api/date/profile/photos/", {"image": SimpleUploadedFile("me.png", b.getvalue(), content_type="image/png")}, format="multipart"); self.assertEqual(r.status_code, 201, r.data)
        (action, rt, typ, pid), = self.srv.log; self.assertEqual((action, rt, typ), ("upload", "image", "upload")); self.assertRegex(r.data["url"], rf"^https://res\.cloudinary\.com/{CLOUD}/image/upload/(v\d+/)?zingo/date/[0-9a-f]{{32}}\.jpg$")

    def test_authenticated_delivery_uses_signed_urls(self):
        self.use(delivery="authenticated"); r = self.client.post("/api/videos/", {"file": SimpleUploadedFile("c.mp4", MP4, content_type="video/mp4")}, format="multipart"); self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(self.srv.log[0][2], "authenticated"); self.assertRegex(r.data["file"], r"/video/authenticated/s--[A-Za-z0-9_-]{8}--/")

    def test_wrong_api_secret_fails_loudly_and_health_says_why(self):
        self.use(api_secret="wrong-secret"); r = self.client.post("/api/videos/", {"file": SimpleUploadedFile("c.mp4", MP4, content_type="video/mp4")}, format="multipart")
        self.assertEqual((r.status_code, r.data["detail"].startswith("The server couldn't save")), (503, True)); self.assertEqual(Video.objects.count(), 0)                                      # nothing half-saved
        d = self.client.get("/healthz/?deep=1").json(); self.assertFalse(d["storage_ok"]); self.assertNotIn("wrong-secret", json.dumps(d))

    def test_health_deep_check_passes_with_correct_credentials(self):
        self.use(); d = self.client.get("/healthz/?deep=1").json(); self.assertEqual((d["storage"], d["storage_ok"], d["status"]), ("cloudinary", True, "ok"))

    def test_exists_delete_and_repair_commands(self):
        from django.core.files.storage import default_storage; from django.core.management import call_command
        self.use(); r = self.client.post("/api/videos/", {"file": SimpleUploadedFile("c.mp4", MP4, content_type="video/mp4")}, format="multipart"); name = Video.objects.get(pk=r.data["id"]).file.name
        self.assertTrue(default_storage.exists(name)); self.assertEqual(default_storage.size(name), len(MP4)); out = io.StringIO(); call_command("check_media", stdout=out); self.assertIn("missing in storage: 0", out.getvalue())
        default_storage.delete(name); self.assertFalse(default_storage.exists(name)); out = io.StringIO(); call_command("check_media", "--list", stdout=out); self.assertIn(f"MISSING video #{r.data['id']}", out.getvalue())

    def test_unconfigured_cloudinary_degrades_to_unavailable_not_http_500(self):
        cloudinary.reset_config(); self.use(cloud_name="", api_key="", api_secret="", upload_prefix="")
        v = Video.objects.create(owner=self.u, file="videos/lost.mp4"); r = self.client.get("/api/videos/"); self.assertEqual(r.status_code, 200); self.assertIsNone(r.data["results"][0]["file"])

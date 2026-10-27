"""
Django storage backend for Cloudinary (videos + images) built directly on the official `cloudinary` SDK.

* Stored names look like "videos/<uuid>.mp4" / "date/<uuid>.jpg" (the same as the local and S3 backends), so existing database rows keep working.
* Videos are uploaded with resource_type="video", everything else as "image" (chosen from the file extension).
* delivery="upload"        -> normal public URLs (unguessable random file names). Default; always plays in <video>.
  delivery="authenticated" -> signed URLs, assets are not publicly listable (turn on only if your Cloudinary plan supports it).
* URL building is local (no network). Uploading / exists / delete / ping call the Cloudinary API.
"""
import logging, os
import cloudinary, cloudinary.api, cloudinary.uploader, cloudinary.utils
from cloudinary.exceptions import NotFound
from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible

log = logging.getLogger(__name__)
VIDEO_EXT = {"mp4", "m4v", "mov", "webm"}

def split_name(name):
    """'videos/abc.mp4' -> ('videos/abc', 'mp4', 'video')"""
    base, ext = os.path.splitext(name.replace("\\", "/")); ext = ext.lower().lstrip(".")
    return base, ext, ("video" if ext in VIDEO_EXT else "image")

@deconstructible
class CloudinaryStorage(Storage):
    def __init__(self, delivery="upload", folder="", **config):
        self.delivery = delivery if delivery in ("upload", "authenticated") else "upload"
        self.folder = (folder or "").strip("/")
        if config: cloudinary.config(secure=True, **{k: v for k, v in config.items() if v not in (None, "")})   # else the SDK reads CLOUDINARY_URL itself

    def _pid(self, base): return f"{self.folder}/{base}" if self.folder else base

    def _save(self, name, content):
        base, ext, rt = split_name(name)
        try: content.seek(0)
        except Exception: pass
        res = cloudinary.uploader.upload(getattr(content, "file", content), public_id=self._pid(base), resource_type=rt, type=self.delivery,
                                         overwrite=False, unique_filename=False, use_filename=False)
        pid = res["public_id"]; fmt = res.get("format") or ext
        if self.folder and pid.startswith(self.folder + "/"): pid = pid[len(self.folder) + 1:]
        return f"{pid}.{fmt}" if fmt else pid

    def get_available_name(self, name, max_length=None):
        return name.replace("\\", "/")   # names are random UUIDs and uploads use overwrite=False, so no extra "does it exist" API call per upload

    def url(self, name):
        base, ext, rt = split_name(name)
        url, _ = cloudinary.utils.cloudinary_url(self._pid(base), resource_type=rt, type=self.delivery, format=ext or None, secure=True, sign_url=(self.delivery == "authenticated"))
        return url

    def exists(self, name):
        base, _, rt = split_name(name)
        try: cloudinary.api.resource(self._pid(base), resource_type=rt, type=self.delivery); return True
        except NotFound: return False

    def size(self, name):
        base, _, rt = split_name(name); return cloudinary.api.resource(self._pid(base), resource_type=rt, type=self.delivery)["bytes"]

    def delete(self, name):
        base, _, rt = split_name(name)
        cloudinary.uploader.destroy(self._pid(base), resource_type=rt, type=self.delivery, invalidate=True)

    def ping(self):
        """Raises if the credentials/cloud name are wrong. Used by /healthz/?deep=1."""
        cloudinary.api.ping()

    def _open(self, name, mode="rb"): raise NotImplementedError("Cloudinary storage serves files by URL; it can't be opened for reading.")
    def listdir(self, path): raise NotImplementedError

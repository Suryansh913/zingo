import os
from django.conf import settings
from django.core.files.storage import default_storage
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.http import JsonResponse

def pending_migrations():
    """Number of migrations not yet applied to this database (-1 = couldn't tell)."""
    try:
        ex = MigrationExecutor(connection); return len(ex.migration_plan(ex.loader.graph.leaf_nodes()))
    except Exception: return -1

def storage_status(deep=False):
    """(ok, detail). Non-deep: builds a signed URL locally (catches missing credentials instantly). Deep: also asks the bucket (HEAD) so wrong keys/bucket/endpoint show up."""
    if not settings.USES_S3: return True, "local disk"
    try:
        default_storage.url("healthcheck.txt")
        if deep:
            if hasattr(default_storage, "ping"): default_storage.ping()   # Cloudinary: verifies cloud name + API key/secret
            else: default_storage.connection.meta.client.head_bucket(Bucket=default_storage.bucket_name)   # S3-compatible: verifies bucket + keys
        return True, "ok"
    except Exception as e: return False, f"{type(e).__name__}: {str(e)[:240]}"   # error class + message only; credentials are never included

def not_found(request, exception=None):
    from django.http import JsonResponse
    return JsonResponse({"detail": f"Not found: {request.path}", "code": "not_found"}, status=404)

def server_error(request):
    """JSON 500 so the frontend can show a real message. The traceback itself is written to the server log (Render -> Logs)."""
    return JsonResponse({"detail": "Internal server error. The cause is in the backend logs (Render dashboard -> your backend -> Logs); also see /healthz/?deep=1.", "code": "server_error"}, status=500)

def root(request):
    """Service banner so opening the API's own URL isn't a bare 404."""
    return JsonResponse({"service": "zingo-api", "status": "ok", "health": "/healthz/"})

def healthz(request):
    """Used by Render's health check and the frontend /status page. Never exposes secrets. Add ?deep=1 to also test the storage bucket."""
    try:
        with connection.cursor() as c: c.execute("SELECT 1")
        db = "ok"
    except Exception: db = "error"
    s_ok, s_detail = storage_status(deep=request.GET.get("deep") == "1"); pending = pending_migrations() if db == "ok" else -1
    warnings = []
    if not s_ok: warnings.append(f"Media storage is misconfigured or unreachable ({s_detail}). Videos/photos will have no playable URL. Cloudinary: check CLOUDINARY_URL (cloudinary://API_KEY:API_SECRET@CLOUD_NAME). S3-compatible: check AWS_STORAGE_BUCKET_NAME / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_S3_ENDPOINT_URL.")
    if pending > 0: warnings.append(f"{pending} database migration(s) are not applied. Pages that use new tables/columns will fail with HTTP 500. Set RUN_MIGRATIONS=1 (start.sh applies them) or run: python manage.py migrate")
    if not settings.DEV_DEFAULTS:
        if not settings.USES_S3 and not os.environ.get("MEDIA_ROOT"): warnings.append("Uploads are stored on this server's local disk. On Render that disk is wiped on every deploy: configure Cloudinary (CLOUDINARY_URL) or S3-compatible storage (AWS_STORAGE_BUCKET_NAME ...), or a persistent disk (MEDIA_ROOT).")
        if connection.vendor == "sqlite": warnings.append("The database is SQLite. On Render it is wiped on every deploy: set DATABASE_URL to a Postgres database.")
        if not settings.CORS_ALLOWED_ORIGINS: warnings.append("CORS_ALLOWED_ORIGINS is empty: the React site on another domain cannot call this API.")
    ok = db == "ok" and s_ok and pending == 0
    return JsonResponse({"status": "ok" if ok else "degraded", "database": db, "database_engine": connection.vendor, "migrations_pending": pending, "storage": settings.STORAGE_KIND,
                         "storage_ok": s_ok, "storage_detail": s_detail, "signed_media_urls": bool((settings.STORAGE_KIND == "s3" and not settings.MEDIA_PUBLIC_READ) or (settings.STORAGE_KIND == "cloudinary" and settings.CLOUDINARY_DELIVERY == "authenticated")), "cors_configured": bool(settings.CORS_ALLOWED_ORIGINS),
                         "debug": settings.DEBUG, "release": os.environ.get("RENDER_GIT_COMMIT", "")[:7], "warnings": warnings}, status=200 if db == "ok" else 503)

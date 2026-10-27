"""
ZINGO Django settings.
"""
import os
import re
import sys
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


# Environment helpers
def _load_dotenv(path):
    if not path.exists():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            v = v.strip()

            if v[:1] in ("'", '"') and v.find(v[0], 1) > 0:
                v = v[1:v.find(v[0], 1)]
            else:
                v = re.split(r"\s+#", v, maxsplit=1)[0].strip()

            os.environ.setdefault(k.strip(), v)


_load_dotenv(BASE_DIR / ".env")


def env_bool(k, default=False):
    v = os.environ.get(k)
    return default if v is None else v.strip().lower() in (
        "1", "true", "yes", "on"
    )


_env_bool = env_bool


def env_list(k, default=""):
    return [
        x.strip()
        for x in os.environ.get(k, default).split(",")
        if x.strip()
    ]


def env_int(k, default):
    return int(os.environ.get(k, default))


TESTING = "test" in sys.argv
ON_RENDER = bool(os.environ.get("RENDER"))

DEBUG = env_bool(
    "DJANGO_DEBUG",
    default=("runserver" in sys.argv and not ON_RENDER)
)
DEV_DEFAULTS = DEBUG or TESTING

LENIENT_KEY = (
    DEV_DEFAULTS
    or "collectstatic" in sys.argv
    or (
        os.path.basename(sys.argv[0]) == "manage.py"
        and not ON_RENDER
        and os.environ.get("DJANGO_ENV") != "production"
    )
)


# Security
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY") or ""

if not SECRET_KEY:
    if LENIENT_KEY:
        SECRET_KEY = "dev-only-insecure-key-do-not-use-in-production"
    else:
        raise ImproperlyConfigured(
            "DJANGO_SECRET_KEY is not set."
        )

RENDER_HOST = os.environ.get("RENDER_EXTERNAL_HOSTNAME", "")

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS")
if RENDER_HOST:
    ALLOWED_HOSTS.append(RENDER_HOST)

if DEV_DEFAULTS or not ALLOWED_HOSTS:
    ALLOWED_HOSTS += ["localhost", "127.0.0.1"]

CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")
if RENDER_HOST:
    CSRF_TRUSTED_ORIGINS.append(f"https://{RENDER_HOST}")

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
    if DEV_DEFAULTS else ""
)
CORS_ALLOW_CREDENTIALS = False

if not DEV_DEFAULTS:
    SECURE_PROXY_SSL_HEADER = (
        "HTTP_X_FORWARDED_PROTO", "https"
    )
    SECURE_SSL_REDIRECT = env_bool("SECURE_SSL_REDIRECT", True)
    SECURE_REDIRECT_EXEMPT = [r"^healthz/?$"]
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = env_int("SECURE_HSTS_SECONDS", 3600)
    SECURE_CONTENT_TYPE_NOSNIFF = True


# Apps and middleware
INSTALLED_APPS = [
    "daphne",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "channels",
    "core",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

# React's generated index.html is used as the Django homepage.
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "frontend" / "dist"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"
AUTH_USER_MODEL = "core.User"

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": (
            f"django.contrib.auth.password_validation.{n}"
        )
    }
    for n in (
        "UserAttributeSimilarityValidator",
        "MinimumLengthValidator",
        "CommonPasswordValidator",
        "NumericPasswordValidator",
    )
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# Database
if os.environ.get("DATABASE_URL"):
    DATABASES = {
        "default": dj_database_url.parse(
            os.environ["DATABASE_URL"],
            conn_max_age=env_int("DB_CONN_MAX_AGE", 600),
            conn_health_checks=True,
            ssl_require=env_bool("DATABASE_SSL_REQUIRE", False),
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": os.environ.get(
                "SQLITE_PATH", BASE_DIR / "db.sqlite3"
            ),
        }
    }


# Static files and media
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

# Collect the Vite build files along with Django static files.
STATICFILES_DIRS = [
    BASE_DIR / "frontend" / "dist",
]

MEDIA_URL = "/media/"
MEDIA_ROOT = Path(
    os.environ.get("MEDIA_ROOT", BASE_DIR / "media")
)

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage"
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage"
    },
}

S3_BUCKET = os.environ.get("AWS_STORAGE_BUCKET_NAME", "")
MEDIA_PUBLIC_READ = env_bool("MEDIA_PUBLIC_READ", False)


# Cloudinary
CLOUDINARY_URL = os.environ.get("CLOUDINARY_URL", "")

_cn = (
    os.environ.get("CLOUDINARY_CLOUD_NAME")
    or os.environ.get("CLOUD_NAME", "")
)
_ck = (
    os.environ.get("CLOUDINARY_API_KEY")
    or os.environ.get("API_KEY", "")
)
_cs = (
    os.environ.get("CLOUDINARY_API_SECRET")
    or os.environ.get("API_SECRET", "")
)

USE_CLOUDINARY = bool(
    CLOUDINARY_URL or (_cn and _ck and _cs)
)

CLOUDINARY_DELIVERY = os.environ.get(
    "CLOUDINARY_DELIVERY", "upload"
)

STORAGE_KIND = (
    "cloudinary"
    if USE_CLOUDINARY
    else ("s3" if S3_BUCKET else "local")
)

if STORAGE_KIND == "cloudinary":
    STORAGES["default"] = {
        "BACKEND": "core.cloudinary_storage.CloudinaryStorage",
        "OPTIONS": {
            "delivery": CLOUDINARY_DELIVERY,
            "folder": os.environ.get("CLOUDINARY_FOLDER", "zingo"),
            **(
                {}
                if CLOUDINARY_URL
                else {
                    "cloud_name": _cn,
                    "api_key": _ck,
                    "api_secret": _cs,
                }
            ),
        },
    }

elif STORAGE_KIND == "s3":
    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": {
            "bucket_name": S3_BUCKET,
            "access_key": os.environ.get(
                "AWS_ACCESS_KEY_ID", ""
            ),
            "secret_key": os.environ.get(
                "AWS_SECRET_ACCESS_KEY", ""
            ),
            "endpoint_url": (
                os.environ.get("AWS_S3_ENDPOINT_URL") or None
            ),
            "region_name": (
                os.environ.get("AWS_S3_REGION_NAME") or None
            ),
            "signature_version": "s3v4",
            "addressing_style": os.environ.get(
                "AWS_S3_ADDRESSING_STYLE", "auto"
            ),
            "querystring_auth": not MEDIA_PUBLIC_READ,
            "querystring_expire": env_int(
                "MEDIA_URL_EXPIRE_SECONDS", 21600
            ),
            "custom_domain": (
                os.environ.get("AWS_S3_CUSTOM_DOMAIN") or None
            ) if MEDIA_PUBLIC_READ else None,
            "file_overwrite": False,
            "default_acl": None,
            "object_parameters": {
                "CacheControl": "max-age=31536000"
            },
        },
    }

USES_S3 = STORAGE_KIND != "local"
SERVE_LOCAL_MEDIA = env_bool("SERVE_LOCAL_MEDIA", True)


# Upload limits
MAX_VIDEO_MB = env_int("MAX_VIDEO_MB", 100)
VIDEO_VERIFY_SIGNATURE = env_bool(
    "VIDEO_VERIFY_SIGNATURE", True
)
VIDEO_EXTENSIONS = (".mp4", ".m4v", ".mov", ".webm")


# Django REST Framework
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication"
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated"
    ],
    "DEFAULT_PAGINATION_CLASS": (
        "rest_framework.pagination.CursorPagination"
    ),
    "PAGE_SIZE": 10,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.AnonRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "user": "300/min",
        "anon": "30/min",
        "chat": "60/min",
        "match": "30/min",
        "date": "120/min",
    },
}


# Realtime chat and video matching
REDIS_URL = os.environ.get("REDIS_URL")

if REDIS_URL:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [REDIS_URL]},
        }
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer"
        }
    }

CHAT_MAX_LEN = 1000


# Battles
BATTLE_VOTING_HOURS_DEFAULT = env_int(
    "BATTLE_VOTING_HOURS_DEFAULT", 24
)
BATTLE_VOTING_HOURS_MIN = 1
BATTLE_VOTING_HOURS_MAX = env_int(
    "BATTLE_VOTING_HOURS_MAX", 168
)
BATTLE_CHALLENGE_EXPIRY_HOURS = env_int(
    "BATTLE_CHALLENGE_EXPIRY_HOURS", 72
)
BATTLE_LIVE_COUNTS = env_bool("BATTLE_LIVE_COUNTS", False)


# ZINGO Match
MATCH_REQUIRE_VERIFIED_AGE = env_bool(
    "MATCH_REQUIRE_VERIFIED_AGE"
)
MATCH_MODERATION_CONFIRMED = env_bool(
    "MATCH_MODERATION_CONFIRMED"
)

LAUNCH_STATES = (
    "development", "self_declared", "restricted", "public"
)


def _launch_state(
    var, requires_verified_age, moderation_confirmed
):
    v = os.environ.get(
        var, "self_declared"
    ).strip().lower().replace("-", "_")

    if v not in LAUNCH_STATES:
        v = "self_declared"

    if v == "public" and not (
        requires_verified_age and moderation_confirmed
    ):
        v = "self_declared"

    return v


MATCH_LAUNCH_STATE = _launch_state(
    "MATCH_LAUNCH_STATE",
    MATCH_REQUIRE_VERIFIED_AGE,
    MATCH_MODERATION_CONFIRMED,
)

MATCH_QUEUE_TTL = env_int("MATCH_QUEUE_TTL", 60)
MATCH_ACCEPT_SECONDS = env_int("MATCH_ACCEPT_SECONDS", 20)
MATCH_DISCONNECT_GRACE = env_int("MATCH_DISCONNECT_GRACE", 30)
MATCH_COOLDOWN_MINUTES = env_int(
    "MATCH_COOLDOWN_MINUTES", 10
)
MATCH_MAX_SESSIONS_PER_HOUR = env_int(
    "MATCH_MAX_SESSIONS_PER_HOUR", 60
)
MATCH_CONSENT_VERSION = 1
MATCH_AUTO_RESTRICT_REPORTS = env_int(
    "MATCH_AUTO_RESTRICT_REPORTS", 3
)

STUN_URLS = env_list(
    "STUN_URLS", "stun:stun.l.google.com:19302"
)
TURN_URLS = env_list("TURN_URLS")
TURN_USERNAME = os.environ.get("TURN_USERNAME", "")
TURN_CREDENTIAL = os.environ.get("TURN_CREDENTIAL", "")
TURN_SHARED_SECRET = os.environ.get("TURN_SHARED_SECRET", "")
TURN_TTL = env_int("TURN_TTL", 3600)


# ZINGO Date
DATE_REQUIRE_VERIFIED_AGE = env_bool(
    "DATE_REQUIRE_VERIFIED_AGE"
)
DATE_MODERATION_CONFIRMED = env_bool(
    "DATE_MODERATION_CONFIRMED"
)

DATE_LAUNCH_STATE = _launch_state(
    "DATE_LAUNCH_STATE",
    DATE_REQUIRE_VERIFIED_AGE,
    DATE_MODERATION_CONFIRMED,
)

DATE_MAX_PHOTOS = 6
DATE_MAX_PHOTO_MB = 5
DATE_BIO_MAX = 500
DATE_MAX_LIKES_PER_DAY = env_int(
    "DATE_MAX_LIKES_PER_DAY", 100
)
DATE_AUTO_HOLD_REPORTS = env_int(
    "DATE_AUTO_HOLD_REPORTS", 3
)


# Logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"}
    },
    "root": {
        "handlers": ["console"],
        "level": os.environ.get("LOG_LEVEL", "INFO"),
    },
    "loggers": {
        "django.request": {
            "handlers": ["console"],
            "level": "WARNING",
            "propagate": False,
        }
    },
}
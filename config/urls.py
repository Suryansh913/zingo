from django.contrib import admin
from django.urls import path, re_path, include
from django.conf import settings
from django.views.generic import TemplateView
from django.views.static import serve
from rest_framework.routers import DefaultRouter

from core import (
    media,
    health,
    views as v,
    battles as bt,
    chat as ch,
    notifications as nt,
    match as mt,
    home as hm,
    date as dt,
)

router = DefaultRouter()
router.register("videos", v.VideoViewSet, basename="video")

handler404 = "core.health.not_found"
handler500 = "core.health.server_error"

# React build output
FRONTEND_DIST = settings.BASE_DIR / "frontend" / "dist"
FRONTEND_INDEX = FRONTEND_DIST / "index.html"


def frontend_app(request, *args, **kwargs):
    """
    Serve React's index.html for frontend routes.
    API, admin, health, media and static routes remain separate.
    """
    if not FRONTEND_INDEX.is_file():
        from django.http import HttpResponse
        return HttpResponse(
            "Frontend build not found. Run npm run build in frontend/.",
            status=503,
            content_type="text/plain",
        )

    return TemplateView.as_view(
        template_name="index.html"
    )(request, *args, **kwargs)


urlpatterns = [
    # Frontend homepage
    path("", frontend_app, name="home"),

    # Health check
    path("healthz/", health.healthz, name="healthz"),

    # Vite assets, e.g. /assets/index-xxxxx.js and .css
    re_path(
        r"^assets/(?P<path>.+)$",
        serve,
        {
            "document_root": FRONTEND_DIST / "assets",
            "show_indexes": False,
        },
        name="frontend-assets",
    ),

    # Django admin
    path("admin/", admin.site.urls),

    # Authentication
    path("api/auth/register/", v.register),
    path("api/auth/login/", v.login),
    path("api/auth/logout/", v.logout),
    path("api/me/", v.me),

    # Users
    path("api/users/<str:username>/", v.profile),
    path("api/users/<str:username>/follow/", v.follow),
    path("api/users/<str:username>/block/", v.block),
    path("api/report/", v.report),

    # Stories / interactive story tree
    path("api/stories/", v.story_create),
    path("api/stories/<int:story_id>/tree/", v.story_tree),
    path("api/nodes/<int:node_id>/", v.story_node),
    path("api/nodes/<int:node_id>/vote/", v.story_vote),
    path("api/options/<int:option_id>/link/", v.story_link),

    # Battles
    path("api/battles/", bt.battles),
    path("api/battles/mine/", bt.mine),
    path("api/battles/<int:pk>/", bt.detail),
    path("api/battles/<int:pk>/accept/", bt.accept),
    path("api/battles/<int:pk>/decline/", bt.decline),
    path("api/battles/<int:pk>/withdraw/", bt.withdraw),
    path("api/battles/<int:pk>/vote/", bt.vote),
    path("api/battles/<int:pk>/rematch/", bt.rematch),
    path("api/users/<str:username>/battles/", bt.user_history),

    # Conversations and messages
    path("api/conversations/", ch.conversations),
    path(
        "api/conversations/unread-count/",
        ch.chat_unread,
    ),
    path(
        "api/conversations/<int:pk>/",
        ch.conversation_detail,
    ),
    path(
        "api/conversations/<int:pk>/messages/",
        ch.messages,
    ),
    path(
        "api/conversations/<int:pk>/read/",
        ch.mark_conversation_read,
    ),

    # Notifications
    path("api/notifications/", nt.notifications),
    path(
        "api/notifications/unread-count/",
        nt.unread_count,
    ),
    path(
        "api/notifications/read-all/",
        nt.mark_all_read,
    ),
    path(
        "api/notifications/<int:pk>/read/",
        nt.mark_read,
    ),

    # Live matching
    path("api/match/eligibility/", mt.eligibility_view),
    path("api/match/consent/", mt.consent_view),
    path("api/match/ice/", mt.ice_view),
    path("api/match/queue/", mt.queue_view),
    path(
        "api/match/sessions/<int:pk>/",
        mt.session_view,
    ),
    path(
        "api/match/sessions/<int:pk>/accept/",
        mt.accept_view,
    ),
    path(
        "api/match/sessions/<int:pk>/decline/",
        mt.decline_view,
    ),
    path(
        "api/match/sessions/<int:pk>/skip/",
        mt.skip_view,
    ),
    path(
        "api/match/sessions/<int:pk>/end/",
        mt.end_view,
    ),
    path(
        "api/match/sessions/<int:pk>/report/",
        mt.report_view,
    ),

    # Home, search and discovery
    path("api/home/stories/", hm.home_stories),
    path("api/suggestions/users/", hm.suggested_users),
    path("api/trending/hashtags/", hm.trending_hashtags),
    path("api/search/", hm.search),

    # Dating profile
    path("api/date/profile/", dt.profile_get),
    path("api/date/profile/create/", dt.profile_create),
    path("api/date/profile/update/", dt.profile_update),
    path("api/date/profile/activate/", dt.profile_activate),
    path("api/date/profile/deactivate/", dt.profile_deactivate),
    path("api/date/profile/photos/", dt.photo_upload),
    path(
        "api/date/profile/photos/<int:pk>/",
        dt.photo_delete,
    ),
    path("api/date/preferences/", dt.preferences),
    path("api/date/discover/", dt.discover),
    path(
        "api/date/profiles/<str:username>/",
        dt.profile_detail,
    ),
    path("api/date/like/", dt.like_view),
    path("api/date/pass/", dt.pass_view),
    path("api/date/matches/", dt.matches),
    path("api/date/unmatch/", dt.unmatch),
    path("api/date/report/", dt.report),

    # Video API
    path("api/", include(router.urls)),
]

# Local media only. Remote storage returns its own URLs.
if not settings.USES_S3 and settings.SERVE_LOCAL_MEDIA:
    urlpatterns.append(
        re_path(
            r"^media/(?P<path>.*)$",
            media.serve_media,
        )
    )

# React client-side routes, e.g. /reels, /messages, /profile.
# Keep this LAST so it cannot intercept API/admin/health/assets.
urlpatterns.append(
    re_path(
        r"^(?!api/|admin/|healthz/?$|media/|static/|assets/).*$",
        frontend_app,
        name="frontend-spa",
    )
)
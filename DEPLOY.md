# ZINGO — Live deployment guide (Render + Cloudinary)

> ✅ = run and passed in my sandbox (real HTTP server, WebSockets, PostgreSQL 16, a fake Cloudinary server that checks the SDK's signed requests).
> **I have no access to your Render/Cloudinary accounts, so nothing here was run on your live site.** Section 8 is the checklist that proves it live.

## 1. What was wrong (root causes) and the fix

| Symptom on the live site | Cause | Fix in this version |
|---|---|---|
| Uploaded Zings don't play | `/media/` was only served when `DEBUG=True`, and Render's disk is wiped on every deploy | Media goes to **Cloudinary** (or S3-compatible storage); local fallback now serves with HTTP Range |
| "Not Found" on refresh/shared links; in-app 404 for `/index.html` | Static site had no SPA rewrite; or the rule was created as **Redirect** instead of **Rewrite** | `render.yaml` rewrite, in-app 404 page, `/index.html` → home safety net. **Also set the rule in the Render dashboard (§4)** |
| Every API call 404 | `VITE_API_URL` ended with `/` or `/api` → `//api/…` / `/api/api/…` | Frontend normalizes it and shows a red banner when it is wrong |
| **HTTP 500 on ZINGS feed** | Storage configured but unusable (e.g. S3 variables without valid keys) crashed every endpoint that lists videos; or migrations not applied | Media-URL failures can no longer crash lists; `/healthz/?deep=1` + `/status` page show the real cause; migrations run on start |
| Backend URL itself shows 404 / admin unstyled | No `/` route, no static files setup | `/` banner, `/healthz/`, WhiteNoise |
| "Under Development" | Not in this code at all — an older deploy. | Deploy this version. Match & Date are **live by default** (§6) |

The React app's 76 API calls were each checked against Django's URL table: no route/method mismatch exists (✅ `core/test_contract.py`).

## 2. Architecture
```
Browser ─► zingo frontend (Render Static Site)  ──VITE_API_URL──►  zingo backend (Render Web Service: Daphne = HTTP + WebSocket)
                                                                      ├─► Postgres  (DATABASE_URL)          users, posts, matches...
                                                                      └─► Cloudinary (CLOUDINARY_URL)       videos + photos
```
Render's free web disk and SQLite are wiped on every deploy → **Postgres + Cloudinary are required** for data to survive.

## 3. Backend (Render Web Service) — do in this order
**3.1 Backup first.** Postgres: Dashboard → database → Backups, or `pg_dump "$EXTERNAL_DATABASE_URL" -Fc -f zingo_$(date +%F).dump`. If you were on SQLite, it was already being lost each deploy (check `/healthz/` → `database_engine`). Migrations in this release are **additive** (nothing dropped). Rollback = redeploy the previous commit (`python manage.py migrate core <number>` undoes schema if ever needed).

**3.2 Cloudinary.** Cloudinary dashboard → *Settings → API Keys* → copy the **API environment variable**:
`cloudinary://<api_key>:<api_secret>@<cloud_name>`. Put it in Render as **`CLOUDINARY_URL`** (one variable; you may instead set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).
* **Delete any `AWS_*` variables** (Cloudinary takes priority if both exist, but remove them to avoid confusion).
* Plan limits matter: free plans cap video file size (≈100 MB) and image size (≈10 MB); the app's own limit is `MAX_VIDEO_MB=100` (photos 5 MB). Check your plan.
* `CLOUDINARY_DELIVERY=upload` (default) gives public, unguessable URLs. `authenticated` gives signed URLs — only if your plan supports it.

**3.3 Postgres.** Render → New → PostgreSQL → copy the **Internal Database URL** → `DATABASE_URL`. (Free Render Postgres expires after 30 days.)

**3.4 Service settings**
| Setting | Value |
|---|---|
| Build Command | `pip install -r requirements.txt && python manage.py collectstatic --noinput` |
| Start Command | `bash start.sh`  (runs migrations if `RUN_MIGRATIONS=1`, then Daphne). Without `start.sh`: `python manage.py migrate --noinput && daphne -b 0.0.0.0 -p $PORT config.asgi:application` |
| Health Check Path | `/healthz/` |

**Environment variables**
| Variable | Required | Meaning |
|---|---|---|
| `DJANGO_SECRET_KEY` | **yes** | Long random string (app refuses to start without it). `python -c "from django.core.management.utils import get_random_secret_key as k; print(k())"` |
| `DATABASE_URL` | **yes** | Postgres URL |
| `CORS_ALLOWED_ORIGINS` | **yes** | **Exactly your frontend origin**, e.g. `https://zingo-x4zh.onrender.com` (no trailing slash, never `*`; comma-separate several). Also protects WebSockets. |
| `CLOUDINARY_URL` | **yes** | §3.2 |
| `RUN_MIGRATIONS` | **yes, `1`** | Applies pending (additive) migrations on boot. Missing migrations cause HTTP 500s. |
| `PYTHON_VERSION` | yes | `3.12.7` (Django 6 needs ≥ 3.12) |
| `MATCH_LAUNCH_STATE`, `DATE_LAUNCH_STATE` | optional | Default **`self_declared` = live** (§6). `restricted` = staff only |
| `TURN_URLS` `TURN_USERNAME` `TURN_CREDENTIAL` | recommended | TURN relay so Match video calls connect on mobile/strict networks (§6) |
| `DJANGO_ALLOWED_HOSTS` | optional | Render's hostname is added automatically; add custom domains |
| `DJANGO_SUPERUSER_USERNAME/PASSWORD/EMAIL` | optional | Creates the first admin on boot (remove the password afterwards) |
| `REDIS_URL` | only if >1 instance | Shared channel layer for chat/match |
| `RUN_MEDIA_CHECK` | optional `1` | Logs which database rows point at files missing from storage (read-only) |
| `DJANGO_DEBUG` | **never `1`** | Defaults to off |

## 4. Frontend (Render Static Site)
| Setting | Value |
|---|---|
| Build Command | `npm ci && npm run build` (Root Directory `frontend` if monorepo) |
| Publish Directory | `dist` |
| Env `VITE_API_URL` | your backend origin, e.g. `https://zingo-backend-o11v.onrender.com` — **no trailing slash, no `/api`** |
| Redirects/Rewrites | **Source `/*` → Destination `/index.html` → Action `Rewrite`** (not "Redirect"!) |

Vite bakes `VITE_API_URL` in at build time: after changing it use **Clear build cache & deploy**.

## 5. Git
```bash
git add -A
git commit -m "Cloudinary media, production settings, SPA fallback, Match/Date live"
git push origin main     # Render auto-deploys (backend and frontend repos separately if you use two)
```

## 6. ZINGO Match and ZINGO Date — live, honestly labelled
* **Default is live**: any consenting user who is 18+ can use both (`MATCH_LAUNCH_STATE` / `DATE_LAUNCH_STATE` = `self_declared`). Age comes from the **date of birth the user entered** (it cannot be changed once set), is enforced on the server, and the UI says it is **not verified**.
* Opt-in, consent screen, report / block / unmatch / leave, rate limits, auto-hold after repeated reports, and admin tools (`/admin`) are all active.
* **Match video calls** use WebRTC. STUN works for many users; **TURN is needed for mobile data / office networks** — set `TURN_URLS`, `TURN_USERNAME`, `TURN_CREDENTIAL` (or `TURN_SHARED_SECRET` for your own coturn). Without TURN some pairs will not connect.
* Not included (you must add before large-scale/public marketing): real **age verification**, **photo/video moderation**, moderator staffing, legal review. `public` mode only turns on when you set `*_REQUIRE_VERIFIED_AGE=1` **and** `*_MODERATION_CONFIRMED=1`.
* Set `restricted` to switch either feature to staff-only at any time (e.g. if abuse appears).

## 7. Troubleshooting (symptom → fix)
| What you see | Fix |
|---|---|
| **500 on feed / "Internal server error"** | Open `https://<frontend>/status` (Storage connection, Database migrations rows). Fix what is red. Backend **Logs** → search `Internal Server Error` → the last traceback line is the cause. |
| "Storage connection FAILED … " | Wrong/missing `CLOUDINARY_URL` (check key, secret, cloud name; no quotes/spaces) |
| "N migrations NOT applied" | Set `RUN_MIGRATIONS=1` and redeploy |
| Video says "unavailable / couldn't load" | Storage not configured **or the file was lost** (old Render-disk uploads can't be recovered). Upload a new MP4 (H.264)/WebM. HEVC `.mov` plays only on Apple devices |
| In-app 404 page for `/index.html`, or 404 on refresh | Rewrite rule missing or set to *Redirect* (§4) |
| `//api/…` or `/api/api/…` 404 in the console | Fix `VITE_API_URL` (§4) |
| "Can't reach the server" | Backend asleep/down, or your frontend origin is missing in `CORS_ALLOWED_ORIGINS` |
| Match: "can't connect" | Add TURN (§6); both users on HTTPS with camera permission |

Logs: Render → backend → **Logs**. Never paste secret values anywhere.

## 8. Live verification checklist
1. `https://<backend>/healthz/?deep=1` → `status ok`, `database_engine postgresql`, `storage cloudinary`, `storage_ok true`, `migrations_pending 0`, `warnings []`.
2. `https://<frontend>/status` → all ✅ (backend URL has no trailing slash).
3. Open `/zings` directly in a new tab and refresh → loads (no "Not Found"). Open `/xyz` → in-app 404 page.
4. Sign up on a **phone** and a desktop. Home, Search, Explore, Chat, Notifications work.
5. Upload an MP4 → it plays, seeking works; the video URL is on `res.cloudinary.com`. Redeploy the backend → it **still plays** and your account **still exists**.
6. Like / comment / follow, WHATNEXT vote, Battle vote, chat between two accounts.
7. **ZINGO Date**: Profile → add date of birth (18+) → Date → Add Profile → fill, add a photo → Activate → second account does the same → like each other → "It's a match" → chat. Unmatch / report / block each work.
8. **ZINGO Match** with two real devices on **different networks**: accept terms → Find a match → both Accept → Start video call → audio/video both ways. Test once with mobile data.
9. `/admin/` loads with styling; reports from Match/Date show up.

## 9. Honest limits
Not verified on your live services or a real Cloudinary account (verified against a fake that checks the SDK's signatures); not verified on real phones/browsers; Match calls need TURN for reliability; ages are self-declared and photos unmoderated; videos upload through Django (≤100 MB); free Render sleeps and free Postgres expires.

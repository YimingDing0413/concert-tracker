# Deploy Encore to Vercel

This app deploys as:
- **Static frontend** (`dist/` from Vite)
- **Serverless API** (`/api/*` → `api/index.ts`)
- **User data** on [Upstash Redis](https://vercel.com/marketplace?category=storage&search=redis) via Vercel (required in production)

Local dev still uses `data/user-db.json` on disk.

---

## 1. Push to GitHub

```bash
cd concert-tracker
git init
git add .
git commit -m "Prepare for Vercel deploy"
git remote add origin https://github.com/YOUR_USER/concert-tracker.git
git push -u origin main
```

---

## 2. Import in Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your GitHub repo
3. **Root directory:** `concert-tracker` (if the repo root is Desktop, set subdirectory)
4. Framework: **Other** (Vercel reads `vercel.json`)
5. Deploy (first deploy may work for UI; add env + KV next)

---

## 3. Environment variables

In Vercel → Project → **Settings** → **Environment Variables**, add:

| Name | Value |
|------|--------|
| `TICKETMASTER_API_KEY` | your key |
| `BANDSINTOWN_APP_ID` | your app id |
| `SETLISTFM_API_KEY` | your key |

Apply to **Production**, **Preview**, and **Development**.

---

## 4. Redis storage (user concerts & ratings)

Without Redis, “My Shows” data will **not persist** on Vercel (serverless has no disk).

1. Vercel dashboard → your project → **Storage** (or [Marketplace → Redis](https://vercel.com/marketplace?category=storage&search=redis))
2. Add **Upstash Redis** (free tier is fine)
3. **Connect to Project** — Vercel adds `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
4. **Redeploy** the project

Health check: `https://YOUR_APP.vercel.app/api/health` should show `"storage": "upstash-redis"`.

---

## 5. Deploy from CLI (optional)

```bash
npm i -g vercel
cd concert-tracker
vercel login
vercel
vercel --prod
```

Link KV and env vars in the dashboard, then `vercel --prod` again.

---

## 6. Verify

| URL | Expected |
|-----|----------|
| `https://your-app.vercel.app` | Login / search UI |
| `https://your-app.vercel.app/api/health` | JSON with `ok: true`, API flags, `storage: vercel-kv` |

1. Log in  
2. Mark a concert **Going**  
3. Open **My Shows** → **Going**  
4. Redeploy — show should still appear (KV)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Cannot GET /` on root | Open the Vercel URL (not `:3001`); SPA is served from `dist` |
| **Cannot log in** | Open `https://YOUR_APP.vercel.app/api/health` — must show JSON with `"ok": true`. If you see HTML or 404, redeploy after latest code and check Vercel **Functions** logs |
| API 404 | Check `api/index.ts` exists; redeploy |
| Login error mentions "invalid response" | API route not running — env vars + redeploy; check Function logs in Vercel dashboard |
| Search works, My Shows empty after redeploy | Connect **Upstash Redis** and redeploy |
| API timeout | Large artist pages may take time; `maxDuration` is 60s in `api/index.ts` |

---

## Architecture on Vercel

```
Browser → your-app.vercel.app
           ├── /*           → dist/index.html (React)
           └── /api/*       → serverless function (Express)
                    ├── Ticketmaster / Bandsintown / Setlist.fm
                    └── Upstash Redis (user concerts, ratings)
```

API keys stay on the server only — never use `VITE_` prefixed keys.

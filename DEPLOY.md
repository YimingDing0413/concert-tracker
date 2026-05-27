# Deploy Encore to Vercel

This app deploys as:
- **Static frontend** (`dist/` from Vite)
- **Serverless API** (`/api/*` → `api/index.ts`)
- **User data** in **AWS DynamoDB** (concerts, ratings, show reports, accounts)

---

## 1. Push to GitHub

```powershell
cd C:\Users\PC\Desktop\concert-tracker
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
3. **Root directory:** leave blank if the repo root *is* `concert-tracker`, or set the subfolder if the repo is larger
4. Framework: **Other** (Vercel reads `vercel.json`)
5. Deploy (add env vars next, then redeploy)

---

## 3. Environment variables (required)

In Vercel → Project → **Settings** → **Environment Variables**, add:

| Name | Value |
|------|--------|
| `AWS_REGION` | e.g. `us-east-1` (same as your DynamoDB table) |
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |
| `DYNAMODB_TABLE_NAME` | `ConcertTracker` (exact name from AWS) |
| `TICKETMASTER_API_KEY` | your key (optional — mock data if missing) |
| `BANDSINTOWN_APP_ID` | your app id (optional) |
| `SETLISTFM_API_KEY` | your key (optional) |

Apply to **Production**, **Preview**, and **Development**.

**Never** use `NEXT_PUBLIC_` or `VITE_` for AWS keys.

---

## 4. IAM permissions

Your IAM user needs on table `ConcertTracker`:

- `dynamodb:GetItem`
- `dynamodb:PutItem`
- `dynamodb:Query`

---

## 5. Deploy from CLI (optional)

```powershell
npm i -g vercel
cd C:\Users\PC\Desktop\concert-tracker
vercel login
vercel
vercel --prod
```

Add env vars in the dashboard, then run `vercel --prod` again.

---

## 6. Verify

| URL | Expected |
|-----|----------|
| `https://your-app.vercel.app` | Login / Discover UI |
| `https://your-app.vercel.app/api/health` | `"dynamodb": true`, `"dynamodbConfigured": true` |

### Test accounts & data

1. **Sign up** with email + password (min 6 characters)
2. **Log out**, then **log in** with the same credentials
3. Save a concert → **My Concerts**
4. AWS Console → DynamoDB → `ConcertTracker`:
   - `EMAIL#you@example.com` / `USER` — email lookup
   - `USER#user-xxxxx` / `PROFILE` — account
   - `USER#user-xxxxx` / `SAVED_CONCERT#...` — your shows

Each account uses its own `user.id`; concerts and ratings are stored under that id.

---

## User accounts (how it works)

| Feature | Status |
|---------|--------|
| Sign up | Saves profile + password (hashed) in DynamoDB |
| Log in | Email + password required when DynamoDB is configured |
| Saved concerts | Stored per `USER#{userId}` in DynamoDB |
| Session | User stored in browser `localStorage`; API calls send `userId` |
| Password reset | Not implemented yet |

---

## Architecture on Vercel

```
Browser → your-app.vercel.app
           ├── /*           → dist/index.html (React)
           └── /api/*       → serverless function (Express)
                    ├── Ticketmaster / Bandsintown / Setlist.fm
                    └── AWS DynamoDB (accounts + concerts + ratings)
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `dynamodbConfigured: true` but `dynamodb: false` | Check `dynamodbError` in `/api/health` — usually IAM or wrong table name/region |
| Cannot log in after sign up | Wrong password, or table name mismatch (`ConcertTracker` vs `concert_tracker`) |
| My Shows empty on Vercel | Confirm DynamoDB env vars and redeploy |
| Sign up works locally but not on Vercel | Add all four AWS env vars on Vercel and redeploy |
| API 404 | Ensure `api/index.ts` exists; redeploy |

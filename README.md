# Encore — Concert Tracker

Mobile-first concert journal. Log shows in a few taps, optionally rate them, and share a year-end Wrapped. The **React frontend** talks only to the **internal Express API**; the server calls Ticketmaster, Bandsintown, and Setlist.fm. API keys never reach the browser.

## Core loop

1. **Discover** nearby or search for a show  
2. **Log** it (catalog pick or manual artist + date)  
3. Optionally **rate & add photos**  
4. See it on **Home** / **Profile** as a ticket stub  
5. Export **Wrapped** at year end (9:16 share image)

Optional surfaces (Spotify recommendations, social feed, DMs) are gated by `src/config/features.ts`.

## Phone app (iOS & Android)

Encore can ship as a native app using **Capacitor** (same React UI) or install as a **PWA** from the browser.

See **[MOBILE.md](./MOBILE.md)** for:

- Android Studio setup (Windows)
- Xcode / iOS (Mac)
- Google Play & App Store notes
- PWA “Add to Home Screen”

Quick run on Android:

```bash
npm install
npm run cap:sync
npm run cap:android
```

## Architecture

```
React UI (Vite, port 5173)
    → GET/POST /api/*  (proxied in dev)
        → Express server (port 3001)
            → Ticketmaster Discovery API
            → Bandsintown API
            → Setlist.fm API
        → normalize → shared TypeScript types
    → JSON responses to frontend
```

## Setup

1. Install dependencies:

```bash
cd concert-tracker
npm install
```

2. Copy environment template and add your keys:

```bash
copy .env.local.example .env.local
```

Edit `.env.local`:

```
TICKETMASTER_API_KEY=your_key
BANDSINTOWN_APP_ID=your_app_id
SETLISTFM_API_KEY=your_key
```

3. Run both the API server and frontend:

```bash
npm run dev
```

- Web: http://localhost:5173  
- API: http://localhost:3001/api/health  

Without API keys, the server returns **mock fallback data** and logs which provider is missing.

## App routes (UI)

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | Home — year count + your tickets |
| `/discover` | Public | Search, location, nearby posters |
| `/map` | Public | Nearby map |
| `/search` | Public | Artist / venue / event search |
| `/log` | Auth | Log a show (center nav FAB) |
| `/wrapped` | Auth | Year-end Wrapped |
| `/profile` | Auth | Been / Going / Wishlist + Settings |
| `/concert/:id` | Public | Concert detail |
| `/concert/:id/review` | Auth | Optional rating & photos |
| `/concert/:id/wrap-up` | Auth | Single-show wrap-up share |
| `/artist/:id/*` | Public | Artist upcoming / past / setlists |
| `/venue/:id` | Public | Venue detail |
| `/login`, `/signup` | Public | Auth (`?next=` resumes intent) |

Legacy URLs redirect: `/add` → `/log?manual=1`, `/create*` → `/log`, `/feed` & `/messages*` → `/`, `/concert/:id/rate` → review, `/wrap-up` → `/wrapped`.

## Internal API routes

| Route | Description |
|-------|-------------|
| `GET /api/search?query=` | Mixed artist / venue / event results |
| `GET /api/events?keyword=&city=&artist=` | Event search |
| `GET /api/events/:id` | Event detail + setlist |
| `GET /api/events/:id/setlist` | Setlist or predicted setlist |
| `GET /api/venues?keyword=` | Venue search |
| `GET /api/venues/:id` | Venue detail + upcoming events |
| `GET /api/venues/:id/events` | Events at venue |
| `GET /api/artists?keyword=` | Artist search |
| `GET /api/artists/:idOrName` | Artist detail (shows + setlists) |
| `GET /api/artists/:name/events` | Bandsintown tour dates |
| `GET /api/artists/:name/profile` | Bandsintown profile |
| `GET /api/artists/:name/setlists` | Setlist.fm history |
| `GET /api/artists/:name/predicted-setlist` | Predicted setlist |
| `GET /api/map/nearby?lat=&lng=&radiusKm=` | Nearby upcoming shows + venue pins (Discover map) |
| `POST /api/auth/login` | Mock auth |
| `GET /api/user/concerts` | User's saved shows |

## Project layout

```
shared/types/       # Normalized Artist, Venue, ConcertEvent, Setlist, …
shared/mappers.ts   # ConcertEvent → Concert
server/
  clients/          # Raw HTTP clients per provider
  normalize/        # Provider → shared types
  services/         # Business logic + fallbacks
  routes/           # Express route handlers
  mock/             # Fallback data when keys missing
src/                # React frontend (calls /api only)
src/config/features.ts  # social / messages / spotify flags
```

## Scripts

- `npm run dev` — API + Vite together  
- `npm run dev:server` — API only  
- `npm run dev:client` — Frontend only  
- `npm run build` — Production frontend build  
- `npm run lint` — ESLint  
- `npm test` — Vitest unit tests (`vitest run`)

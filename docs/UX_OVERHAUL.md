# Encore UX overhaul: instructions for Cursor

> **How to use this file in Cursor:** save it in the repo as `docs/UX_OVERHAUL.md`. Do NOT paste the whole thing at once. Open Agent mode and run one phase at a time with:
> *"Read docs/UX_OVERHAUL.md fully. Execute ONLY Phase N. Follow the ground rules. When done, run `npm run lint` and `npm run build`, fix errors, then summarize what changed and stop."*
> Commit after each phase so any phase can be reverted on its own.

---

## 0. Product vision and context

Encore is a mobile-first (PWA + Capacitor) app where people **log every concert they've been to** and get a **shareable year-end Wrapped**. Discovery (search artists, see when they're coming to town) exists to feed logging.

**The core loop, which every decision should serve:**
`Discover/search a show → log it in under 30 seconds → optionally add a rating/photos → see it in "Your year" → share Wrapped.`

**Stack (do not change):** React 19 + Vite + TypeScript, Tailwind v4 (`@theme` in `src/index.css`), react-router-dom v7, Express server in `server/`, shared types in `shared/`, shadcn-style primitives in `src/components/ui/`, Capacitor for native. Data access goes through `src/api` (`api.setConcertStatus`, `api.addManualConcert`, `api.getUserConcerts`, etc.) and `src/lib/concertReviewsLocal.ts` for reviews.

### What's wrong today (found in code review)

1. Logging and reviewing are the same flow. The center tab is "Review" (`/create/review`) → 5-step `ConcertReviewFlow`, and Step 1 **requires a star rating** (`canAdvance()` and `handleSave` both gate on `overallRating > 0`). There's no quick "I was there" path except an "Attended" toggle buried on the concert detail page.
2. **Wrapped only counts reviews, not attended shows.** `src/lib/yearEndWrapUp.ts` (`getYearsWithReviews`, `getReviewsForYear`, `getYearEndStats`) read reviews only, so someone who marks 8 shows attended but reviews none sees "No concerts reviewed for 2026 yet."
3. `/add` (`AddConcertPage`) is a manual add form that **nothing links to**.
4. `ConcertReviewFlow.handleSaveAndWrapUp` calls `onSave` and then `onCreateWrapUp`. In `ReviewPage`, both save and both navigate (`/profile` and then the wrap-up route): a double save plus a navigation race.
5. Discover shows developer text to users ("Check /api/health for Ticketmaster status") and falls back to mock data with only a thin banner.
6. Location falls back silently to Toronto (`DISCOVER_DEFAULT_CENTER`) with no way for users to change it.
7. `DiscoverHomePage` renders the same `nearbyConcerts` data in 3-4 sections (hero, "For you", "Upcoming near you", trending), so users see repeats.
8. Everything is behind `ProtectedRoute`, so first-time visitors see only a login wall.
9. Two styling systems coexist: Tailwind + `components/ui`, and ~1,700 lines of legacy CSS in `src/index.css` (`.page`, `.card`, `.form-stack`, `.muted`, ...) still used by e.g. `AddConcertPage`.
10. Profile is overloaded (Spotify, followers panels, 5 tabs, edit/logout/wrapped buttons) while social features (feed, messages, create/want, create/post) are paused behind redirects but their code is still in the tree.

---

## Ground rules (apply to every phase)

- Don't change the Express API contract or `shared/` types without need. If you must, make additive, backwards-compatible changes.
- Prefer existing primitives (`Button` from `components/ui/app-button`, `EmptyState`, `SectionHeader`, `Dialog`, skeletons). Don't introduce new UI libraries.
- Use Tailwind utilities and the semantic tokens. **No new legacy global CSS classes.**
- Keep every route that exists today working via redirects (users may have bookmarks).
- All new interactive elements: min 44×44px tap target, visible focus ring, `aria-label` on icon-only buttons, respect `prefers-reduced-motion`.
- Handle loading, empty, and error states for every new screen.
- After each phase: `npm run lint && npm run build` must pass. Don't leave `any` or unused exports behind.
- When something below says **VERIFY**, read the code first and adapt. Don't assume.

---

## Phase 0: Bug fixes and quick wins

1. **Fix double-save in the review flow.**
   - In `src/pages/ReviewPage.tsx`, extract one `persistReview(review)` function (save review + optional feed post, as today).
   - `onSave` = `persistReview` then navigate to `afterSaveRedirect ?? /concert/:id`.
   - `onCreateWrapUp` = `persistReview` then navigate to the single-show recap route.
   - In `ConcertReviewFlow.tsx`, `handleSaveAndWrapUp` must call **only** `onCreateWrapUp`, never both.
2. **Remove developer text from Discover.** Replace the amber banner copy with: "Showing sample listings right now. Live shows will be back shortly." Show the `/api/health` hint only when `import.meta.env.DEV`. When `nearbySource === 'mock'` in production, hide the "Trending artists" section (it's derived from fake data).
3. **Location control.** Create `src/lib/location.ts` that persists `{ label, latitude, longitude }` in `localStorage` (`encore.location`, wrapped in try/catch). Add a location chip to Discover ("📍 Toronto ▾") that opens a `Dialog` with (a) "Use my current location" (calls `requestUserPosition`) and (b) a short hardcoded list of major cities with lat/lng (Toronto, New York, Los Angeles, Chicago, London, Vancouver, Montreal, Austin, ...). Replace the silent `DISCOVER_DEFAULT_CENTER` fallback in `DiscoverHomePage` and `DiscoverMapPage` with this stored location, falling back to Toronto only if nothing is stored, with the chip visible so it's obvious.
4. Rename user-facing labels: "Attended" → **"I was there"**, "Going" → **"I'm going"**, "Want tickets" → "Want tickets" (unchanged). Update `ConcertActions.tsx` and the helper copy in `ConcertDetailPage.tsx` ("Been to this show? Mark attended, then leave a review." → "Were you there? Tap "I was there", then add a review if you like.").
5. In the single-concert recap flow (`/concert/:id/wrap-up`, `WrapUpPage`), rename UI text to **"Show recap"** and keep **"Wrapped"** for the year-end feature, so the two aren't confused.

**Acceptance:** "Save & create wrap-up" saves exactly once and lands on the recap. No `/api/health` text in production builds. Location can be changed and survives reload.

---

## Phase 1: Quick Log flow (the most important phase)

**Goal:** a user can log a show in ≤30 seconds with no rating required. Rating, photos and notes are optional follow-ups.

### 1a. New page `src/pages/LogConcertPage.tsx` at route `/log`

Flow:
1. **Search step.** Autofocused search input (reuse `ConcertEventPicker` / `useDebounce` / `api` search). Results show artist, venue, city, date.
2. **Pick a show.**
   - Catalog event picked → status is derived: `date < today` → `attended`, otherwise `going`. Show a small segmented control ("I was there" / "I'm going") so the user can override. Call `api.setConcertStatus(user.id, eventId, status, eventSnapshot)`; pass the event snapshot so past events keep their artist/venue/date/image even if the catalog stops returning them.
   - **VERIFY** what the catalog actually returns for past events. If Ticketmaster only returns upcoming events, add an **artist past-shows picker**: after the user selects an artist, list past shows from the existing Setlist.fm routes (`GET /api/artists/:name/setlists`, see `server/services` and `src/pages/artist/ArtistPastPage.tsx`/`ArtistSetlistsPage.tsx`) plus upcoming shows. Tapping a past show logs it with date/venue/city prefilled. This is the main backfill path.
3. **Manual fallback.** A persistent "Can't find it? Add it manually" link under the results (and in empty states) opens an inline manual form (below).
4. **Success screen.** Shows the new ticket (see Phase 5 `TicketCard`), with buttons: **"Add rating & photos"** (→ `/concert/:id/review`), **"Log another"**, **"Done"** (→ `/`). Never force the review.

### 1b. Manual form (replace `AddConcertPage`)

- Required: **artist**, **date**. Optional: venue, city, state, openers, notes. (Today `city` is required; make it optional.)
- Date input defaults to today; add "yesterday" / "last weekend" quick chips.
- Reuse `api.addManualConcert`. `status` is derived from the date like above (no `<select>`).
- Build it with Tailwind + `components/ui` (no legacy `.page/.card/.form-stack`).
- Keep `/add` working: redirect to `/log?manual=1`. Delete the legacy-class markup.

### 1c. Make the review flow optional and shorter

In `src/components/review/ConcertReviewFlow.tsx`:
- Reduce 5 steps to **3**: (1) Rating + mood tags, (2) Highlights (favorite song, best moment, would see again, short review, with **"Rate the details"** as a collapsed accordion containing `RatingBreakdown`), (3) Photos. Remove the separate Preview step; the success state shows the `ConcertReviewCard`.
- **Rating is optional.** Remove the `overallRating > 0` gating in `canAdvance()`, `handleSave`, and `handleSaveAndWrapUp`. Add a visible "Skip" on each step and keep a persistent "Save" button after step 1.
- Treat `overallRating === 0` as "unrated" everywhere. **Audit and fix** all consumers: `getYearEndStats` (average must ignore 0), `averageOverallRating`/`formatOverallRating` in `utils/format`, `ConcertReviewCard`, `ProfileReviewListItem`, `RatingBreakdown`, and `useProfileConcerts`. Unrated shows display "Not rated", not 0 stars.
- **VERIFY** server-side/review-sync validation (`grep -rn overallRating server src/lib`) doesn't reject 0 and update it if it does.
- Saving a review must also ensure the show's status is `attended` (call `api.setConcertStatus` if not already), so reviewed shows always appear in "Been".

### 1d. Make manual concerts reviewable

**VERIFY:** `ReviewPage` calls `api.getConcert(id)`, which likely returns `null` for `manual-*` ids ("Concert not found."). Fix by falling back to the user's `UserConcert` (`manualConcert`/`concertSnapshot`) to build the `ConcertDetail`. Do the same in `ConcertDetailPage` if needed.

### 1e. Entry points to Log

- Center bottom-nav button (Phase 3), plus a "Log a show" button on Home, on the Profile empty state, and in the Wrapped empty state.
- On every concert/artist page, a past show gets a primary **"I was there"** button that logs in one tap (no navigation).

**Acceptance:** From cold start, search → tap show → "I was there" → success ticket in ≤3 taps with no required fields beyond choosing the show. Manual add works with just artist + date. A manual concert can be reviewed. A reviewed-without-rating show shows "Not rated".

---

## Phase 2: Wrapped counts every attended show

**Goal:** Wrapped is driven by attended shows; reviews only enrich it.

1. **VERIFY and read** `src/types/concertReview.ts` (`YearEndStats`), `src/lib/yearEndWrapUp.ts`, `components/wrap-up/year-end/*`, `src/hooks/useProfileConcerts.ts`, `src/utils/userConcert.ts` (`resolveConcertForUserConcert`).
2. Create a `YearEndEntry` type: `{ concertId, artistName, venueName?, city?, date, imageUrl?, review? }` and a function `getYearEntries(userConcerts, reviews, year)`:
   - Include every `UserConcert` with `status === 'attended'` whose resolved date is in `year` (use the concert/manual/snapshot date; fall back to `createdAt` only if the date is missing).
   - Also include reviews with no matching UserConcert (legacy data), deduped by `eventId`/`concertId`.
3. Rework `getYearEndStats` to take `YearEndEntry[]` and return: `totalShows`, `uniqueArtists`, `uniqueVenues`, `uniqueCities`, `topArtists` (with counts), `topVenues`, `firstShow`, `lastShow`, `mostSeenArtist`, `busiestMonth`, plus review-derived optional fields (`averageRating` over rated only, `favoriteSongs`, `topTags`, `photos`). Keep existing consumers compiling.
4. `YearEndWrapUp`: load user concerts (`api.getUserConcerts` / `useProfileConcerts`) and reviews together. Years list = years with ≥1 attended show or review.
5. **Sparse data must look good:** with 1-2 shows, hide "Top 5" lists and rankings; show a single hero stat and the shows as tickets. With 0 shows, show the empty state with a **"Log a show"** button (→ `/log`). Label the current year as in progress: "2026 so far: N shows".
6. **Photos are optional.** Shows without photos use the event image if available, else a generated poster tile (accent gradient + artist initial). Remove the amber "Add photos" warning box; replace it with a soft inline hint.
7. **Sharing.** Keep `html-to-image` export, but: wait for `document.fonts.ready` before capture, export at 1080×1920 (9:16), and add a **Share** button using `navigator.share({ files })` when `navigator.canShare` supports files, falling back to download. Include a small "Encore" wordmark footer on exports.
8. Add unit tests for `getYearEntries` and `getYearEndStats` (add Vitest as a devDependency; cover: attended-only, review-only, both/deduped, year boundaries, unrated shows, 1 show, 0 shows).

**Acceptance:** Marking 3 shows "I was there" with no reviews produces a Wrapped with 3 shows. Sparse data doesn't render empty ranking lists. Share/Download works.

---

## Phase 3: Navigation and information architecture

### Routes

| Route | Screen | Notes |
|---|---|---|
| `/` | **Home** ("Your year") | New. Logged-out users see a value-prop landing. |
| `/discover` | **Discover** | Moved from current `/` (`DiscoverHomePage`). |
| `/log` | **Log a show** | Phase 1. |
| `/wrapped` | **Wrapped** | Was `/wrap-up` and the profile "wrapped" tab. |
| `/profile` | **Profile** | Simplified (below). |

Keep all existing routes via redirects: `/create/review` → `/log`, `/add` → `/log?manual=1`, `/wrap-up` → `/wrapped`, `/profile?tab=wrapped` → `/wrapped`, `/my-concerts` (as today).

### Navigation

- Create one shared config `src/components/layout/navItems.ts` used by both `BottomNav` and `SidebarNav` (they currently duplicate the tab list).
- Bottom nav (mobile): **Home · Discover · [Log, raised center button] · Wrapped · Profile**. The center "Log" is a 56px accent circle with a "+" icon, shadow, and `aria-label="Log a show"`. Sidebar (desktop) has the same items plus a prominent "Log a show" button.

### Home (`src/pages/HomePage.tsx`, logged in)

1. Header: wordmark and avatar.
2. **"Your 2026" hero:** big count of attended shows this year (display font), subline "N artists · N venues". Primary button **"Log a show"**.
3. **Coming up:** the user's `going` shows as horizontal ticket cards with a days-until label. Empty → "Find a show to go to" → Discover.
4. **Recently logged:** last 3 attended shows as tickets, "See all" → `/profile`.
5. **Wrapped teaser:** appears when ≥1 show this year: small preview thumbnail and "Preview your 2026 Wrapped →" → `/wrapped`.

Logged out: short value prop, a sample Wrapped image, "Get started" and "Search shows" buttons.

### Discover (`DiscoverHomePage` moved)

- Order: search bar, location chip (Phase 0), then **one** hero (only when the personalized pick is real), **"For you"** only when the user has a taste profile, **"Upcoming near you"** list, trending chips (hidden for mock data).
- **De-duplicate:** keep a `Set` of shown concert ids so no show appears in two sections.
- Spotify "For you" carousel only if Spotify is connected (otherwise a one-line prompt in Settings, not on Discover).

### Concert detail

- Past show: primary **"I was there"** (one-tap log, toggles to a ✓ state with "Add review" next to it). Upcoming show: **"I'm going"** and **"Want tickets"**; keep the existing ticket CTA.
- Make back navigation robust: if `location.state.backTo` is missing (deep link), use `navigate(-1)` when there's history, else `/discover`.

**Acceptance:** Five-tab nav works on mobile and desktop, old URLs redirect correctly, no show is repeated across Discover sections, Home shows the user's own year first.

---

## Phase 4: Let people try the app before signing up

1. Move these routes outside `ProtectedRoute` (still inside `AppShell` where applicable): `/` (landing for logged-out), `/discover`, `/search`, `/map`, `/artist/:id/*`, `/venue/:id`, `/concert/:id`. **VERIFY** each page and its children tolerate `user === null` (`useAuth()`), and don't call user-scoped APIs without a user.
2. Keep `/log`, `/wrapped`, `/profile`, `/concert/:id/review`, `/member/:userId` protected.
3. Add `requireAuth(action)` (in `AuthContext` or `src/hooks/useRequireAuth.ts`): if logged out, open a small "Create an account to save this" `Dialog` with Sign up / Log in, remembering the intended action (`?next=<current path>`). Use it on "I was there", "I'm going", "Want tickets", and Log.
4. `LoginPage` and `SignUpPage` must honor `?next=` and return the user to where they were (currently they navigate to `/`).
5. On signup success, if the user came from a log action, resume it.

**Acceptance:** A logged-out visitor can search, open artist/concert pages, and only hits an auth prompt on first save, after which they return to the same page.

---

## Phase 5: Visual redesign ("ticket stub")

### Why change

The current look (blue-black background, purple→pink gradients, glassy cards, pill chips everywhere, Space Grotesk) reads as a generic dark-mode SaaS template and has no tie to concerts. The new direction makes **every logged show a ticket stub** and every Wrapped a **gig-poster**, which also makes shares instantly recognizable.

### Design tokens (replace `src/styles/encore-tokens.css`; keep the `--background/--primary/...` bridge names so existing components keep working)

```css
.dark {
  --encore-bg: #0C0B0A;              /* warm black, not blue-black */
  --encore-surface-1: #151412;
  --encore-surface-2: #1E1C19;
  --encore-surface-3: #2A2723;
  --encore-text-primary: #F6F1E7;    /* warm off-white */
  --encore-text-secondary: #CFC8BA;
  --encore-text-muted: #8E877A;
  --encore-accent: #FF5A1F;          /* "spotlight" vermillion: primary actions only */
  --encore-accent-hover: #FF7440;
  --encore-gold: #F2C14E;            /* ratings + Wrapped highlights */
  --encore-paper: #F3EBDD;           /* ticket paper */
  --encore-ink: #1A1714;             /* text on paper */
  --encore-success: #5FBF8A;
  --encore-border-subtle: rgb(246 241 231 / 0.08);
  --encore-border-strong: rgb(246 241 231 / 0.16);

  --background: var(--encore-bg);
  --foreground: var(--encore-text-primary);
  --card: var(--encore-surface-1);
  --card-foreground: var(--encore-text-primary);
  --popover: var(--encore-surface-2);
  --popover-foreground: var(--encore-text-primary);
  --primary: var(--encore-accent);
  --primary-foreground: #160B05;     /* dark text on orange for contrast */
  --secondary: var(--encore-surface-2);
  --secondary-foreground: var(--encore-text-secondary);
  --muted: var(--encore-surface-2);
  --muted-foreground: var(--encore-text-muted);
  --accent: var(--encore-gold);
  --accent-foreground: #1A1714;
  --destructive: #EF4444;
  --border: var(--encore-border-subtle);
  --input: var(--encore-surface-3);
  --ring: var(--encore-accent);
}
```

Also update `<meta name="theme-color">` in `index.html` and `manifest.webmanifest` (`theme_color`, `background_color`) to `#0C0B0A`. **Delete** the purple/pink gradients, `poster-gradient`, and glass/backdrop-blur treatments (keep blur only on the bottom nav). Spotify green is used only inside Spotify UI.

### Typography (update the Google Fonts link in `index.html` and the font vars)

- **Display:** `Bricolage Grotesque` 700/800: headlines, big numbers, artist names.
- **Body/UI:** `Inter` 400/500/600.
- **Mono:** `JetBrains Mono` 500: dates, counts, ticket metadata, small ALL-CAPS labels with `letter-spacing: 0.08em`.
- Remove Space Grotesk. Define `--font-display`, `--font-sans`, `--font-mono` in `@theme inline` and expose `font-display`/`font-mono` utilities. Update the `.text-display-*` helpers.

### Shape, density, motion

- Card radius 14px; chips/FAB fully round; most surfaces use `surface-1/2` with a 1px subtle border. Minimal shadows (only on the center Log button and modals).
- Fewer pills: use plain text links and segmented controls instead of a rounded pill for every action.
- Spacing scale: 4/8/12/16/24/32. Page padding 16px; section gap 28px.
- Motion: 150-200ms ease-out for press/hover; the success ticket slides down with a 250ms keyframe; all wrapped in `@media (prefers-reduced-motion: no-preference)`.

### Signature component: `src/components/ui/TicketCard.tsx`

Props: `artist`, `venue?`, `city?`, `date`, `rating?`, `variant: 'paper' | 'outline'`, `onClick?`, `footer?`. `paper` (attended): `--encore-paper` background, `--encore-ink` text. `outline` (going/wishlist): surface-2 with a 1px border and dashed divider. Layout: left main area (artist in display font; "Venue · City" in muted small text), right **stub** (~84px) with the date in mono ("MAR 14" over "2026") and a small gold star rating or "Not rated". Perforation notches at the divider via CSS mask:

```css
.ticket {
  --notch: 10px;
  --stub: 84px;
  position: relative;
  border-radius: 14px;
  -webkit-mask:
    radial-gradient(circle var(--notch) at calc(100% - var(--stub)) 0, #0000 98%, #000) top / 100% 51% no-repeat,
    radial-gradient(circle var(--notch) at calc(100% - var(--stub)) 100%, #0000 98%, #000) bottom / 100% 51% no-repeat;
          mask:
    radial-gradient(circle var(--notch) at calc(100% - var(--stub)) 0, #0000 98%, #000) top / 100% 51% no-repeat,
    radial-gradient(circle var(--notch) at calc(100% - var(--stub)) 100%, #0000 98%, #000) bottom / 100% 51% no-repeat;
}
.ticket::after { /* dashed divider */
  content: ""; position: absolute; top: 14px; bottom: 14px; right: var(--stub);
  border-left: 2px dashed color-mix(in srgb, currentColor 25%, transparent);
}
```

Tune if the notch rendering is off on Safari. Use `TicketCard` everywhere a user's show is listed (Home, Profile tabs, Log success, Wrapped), and restyle `CompactConcertRow`/`ConcertPosterCard` so *discovery* items stay visually distinct (poster images) from *your* items (tickets).

### Screen-level direction

- **Home:** large display number for the year's show count, one accent button, tickets below. Lots of space; no gradient hero.
- **Discover:** big search field at top; location chip; clean poster carousel and compact list. No decorative sections.
- **Log:** full-height sheet feel, autofocused search, sticky bottom "Can't find it? Add it manually".
- **Wrapped:** three 9:16 templates, all restyled: (1) **Ticket Stack:** paper tickets stacked/rotated slightly over the dark bg, with big total; (2) **Poster:** huge display type of the top artist on accent background, stats in mono; (3) **Minimal:** dark, gold numerals, a simple list. Every template carries the "Encore" footer.
- **Profile (simplified):** header + 3 stats (shows, artists, venues) + tabs **Been / Going / Wishlist** (merge "Reviews" into Been rows via a rating badge and "Reviewed" tag; "Wrapped" is now a top-level tab). Move **Spotify**, **Edit profile**, **Log out** into a Settings sheet (gear icon). Hide follower/following UI behind a feature flag (below).

### Cleanup of legacy CSS

1. Grep for legacy class usage (`className="page"`, `card`, `form-stack`, `form-row`, `muted`, `req`, etc.) and migrate those screens (`AddConcertPage`, `LoginPage`, `SignUpPage`, anything else found) to Tailwind + `components/ui`.
2. Then delete the unused rules from `src/index.css`. Only remove a rule after grepping to confirm no usage. Build and visually spot-check.

**Acceptance:** One coherent look, no purple/pink gradients, tickets for the user's shows, warm tokens, new fonts loaded, `index.css` substantially smaller, no regressions in existing screens.

---

## Phase 6: Reduce surface area and clean up

1. Add `src/config/features.ts`: `export const FEATURES = { social: false, messages: false, spotify: true } as const;`. Gate follower counts, member search, `Find members`, feed post cards, and message buttons behind these flags. Don't delete social code yet; the goal is a lean UI now with the option to bring it back.
2. Delete only **provably unreferenced** files (grep imports first): e.g. `pages/CreatePage.tsx`, `pages/RatingPage.tsx` (the `/concert/:id/rate` route redirects), and any component with zero importers after the redirects above. Don't delete server routes.
3. Merge duplicate navigation constants (done in Phase 3) and remove any now-unused helpers.
4. Update `README.md`: new routes table, the core loop, how to run tests.

---

## Global definition of done

- [ ] Logging a show takes ≤3 taps and needs only the show chosen (or artist + date for manual).
- [ ] Wrapped reflects every attended show, looks good with 1 show, and exports/shares at 9:16.
- [ ] Rating is always optional; unrated shows are handled everywhere.
- [ ] Manual concerts can be reviewed and appear in Wrapped.
- [ ] 5-tab nav with a raised center Log button; all old URLs redirect.
- [ ] Logged-out users can browse and are prompted only when saving.
- [ ] No developer-facing text in production; location is changeable.
- [ ] New tokens, fonts, and `TicketCard` used consistently; legacy CSS removed.
- [ ] `npm run lint`, `npm run build`, and unit tests pass.

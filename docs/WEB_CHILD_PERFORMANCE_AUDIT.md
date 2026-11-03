# Web child side — performance audit (compared with the app)

Scope: only what already exists on the web child side — Home, My Journey, a module (videos, books, chants,
audio), Explore, Kids Wall, Printables, Share Something, Profile. Star Cam and anything new is out of scope.

How this was done: the web code was read end to end for the child flows and compared with the app's current
behaviour (the image-loading work, the module/journey session cache and the progressive book preload). The
production web build was run once to measure the bundle. **Nothing was measured in a browser against the live
server**, so every "impact" below is an expected effect, not a timing.

## Summary

The app and the web were built to different standards. The app now loads pictures in order, keeps what it
already downloaded, shows the last known page instantly while refreshing in the background, and lets a book
start before all of its media is down. The web does none of these. Its biggest problems are:

1. The whole site (admin, parents, teachers and children) is **one 2 MB script (510 KB compressed)**; every
   child downloads the admin code first.
2. **Every refresh of a child page blanks it with a spinner**, including each time the browser tab is focused
   again. The app never does this.
3. **Pictures have no loading control at all** — plain image tags, no caching rules from the server (`max-age=0`
   until the backend change from the last task is deployed), and the same URL-building code copied into ten files.
4. **The book player's "preload" does not preload sound or video** on the web, yet still makes the child wait
   for it.

## Findings

Priority: **High** = children feel it on every visit; **Medium** = noticeable on slow connections; **Low** = clean-up.

### A. First load

| # | Finding | Evidence | Priority |
|---|---|---|---|
| A1 | No code splitting. Every page is imported at the top of the router, nothing is lazy loaded. The production build is a single `index-*.js` of **2,048 kB (510 kB gzip)**; Vite itself warns about it. | `src/router/AppRouter.jsx` (all imports static), no `React.lazy` anywhere | High |
| A2 | Admin, parent, teacher and content-creator screens (and the drag-and-drop library used by admin) ship to children. | same bundle | High |
| A3 | Home page imports two large pictures: `live.png` **1.4 MB** and `sample.png` **305 kB**. The whole `assets/images` folder is 2.8 MB, mostly PNG. | `ChildHomeLiveClass.jsx`, `ChildHomeStartLearning.jsx` | High |
| A4 | The app waits for the session check (`bootstrapSession`) before any protected route renders, then starts the page's own requests — a serial chain: script → session → page data. | `AppRouter.jsx`, `userSlice` | Medium |
| A5 | The Google Fonts stylesheet requests 6 Quicksand weights (300–700); only the weights actually used are needed. | `index.html` | Low |

### B. Page data (the biggest feel-difference from the app)

| # | Finding | Evidence | Priority |
|---|---|---|---|
| B1 | **Every fetch sets `loading` and the page returns a full-screen spinner.** My Journey also refetches on every browser `focus` and `visibilitychange`, so switching tabs and coming back blanks the whole page. The app keeps the cached list on screen and refreshes silently. | `courseProgressHook.js` `fetchChildCourses` (`setLoading(true)`), `ChildJourney.jsx` (`if (loading) return spinner`, focus listeners) | High |
| B2 | Nothing is cached between pages. Opening a course from the journey, going back and opening it again repeats every request and shows the spinner again. | `ChildJourneyModule.jsx` local `useState`, no store | High |
| B3 | The module page loads in a waterfall: all courses first (`await fetchChildCourses()`), **then** the course details. The two requests are independent (the courses list is only for the step number). The app dedupes and prefetches. | `ChildJourneyModule.jsx` `loadCourse` | High |
| B4 | After the module paints, each section makes its own further requests (video watches, book readings, audio, chants), each with its own loading state. | `ChildModuleVideos.jsx`, `ChildModuleLibrary.jsx` | Medium |
| B5 | Opening a course does not prefetch anything; the app prefetches the course details and cover on tap. | `ChildJourneyCards.jsx` | Medium |
| B6 | Home fetches the child with its own local state, separate from the other pages, so the same child record is requested again on each page that needs it. | `ChildHome.jsx` | Low |

### C. Pictures

| # | Finding | Evidence | Priority |
|---|---|---|---|
| C1 | Covers and thumbnails are plain `<img>` with no `loading`, `decoding`, `fetchpriority`, fixed size or placeholder. A grid of covers all start at once, off-screen ones included, and the layout jumps as they arrive. The app now loads the first four first, the rest staggered, in a same-size box. | `ChildJourneyCards.jsx`, `ChildModuleCards.jsx`, `ChildModuleChantCards.jsx`, `ChildModuleAudioCards.jsx`, `ChildModuleVideoCards.jsx`, `ChildModuleHeader.jsx`, `ExploreVideosCards.jsx`, `KidsWallCards.jsx` | High |
| C2 | The cover-URL helper is copied into at least seven components (and exists once properly in `utils/coverImageUrl.js`). Any picture fix would have to be repeated seven times. | grep for `getCoverImageUrl` | Medium |
| C3 | The server sends pictures with `Cache-Control: max-age=0`, so the browser re-asks for every cover on every visit. Fixed in the backend in the last task (30-day cache) but **needs the backend redeploy**. | `backend/middleware/uploadsStatic.js` | High (one deploy) |
| C4 | Covers are served at uploaded size. Same limit as the app: smaller copies or a CDN would be the next step. Production sizes are unknown. | — | Medium |

### D. Book player (built-in books)

| # | Finding | Evidence | Priority |
|---|---|---|---|
| D1 | Audio and video "preload" is a `HEAD` request with `mode: 'no-cors'` and `cache: 'no-store'`. That downloads nothing and stores nothing. Only images are really preloaded. The child waits for the progress bar but the sound and video are fetched again when the page plays. | `utils/cmsPlayerMedia.js` `preloadMediaElement` | High |
| D2 | The child waits for **100 % of the book** before the first page. The app starts when page 1 is ready and keeps loading in the background (Phase 1 and 2 of the existing speed-up plan). | `CmsBooksModalPlayer.jsx` (`isPreloading` blocks everything), `docs/CMS_BOOKS_PRELOAD_SPEEDUP_PLAN.md` | High |
| D3 | "Next" is blocked only while the whole book preloads; there is no per-page readiness, so once the gate lifts, a heavy video page can still open before its video arrives. | `ContentTest.jsx`, `DemoTest.jsx` | Medium |
| D4 | No durable cache: closing and reopening the book repeats the whole wait (only an in-memory map for the session). Phase 4 of the same plan, never started. | `cmsBookPlayerService.js` `mediaPreloadCache` | Medium |
| D5 | The child book player is built from components in the **admin** folder (`components/admin/common/cmsTest/*`). Any admin change can change the child player. | imports in `CmsBooksModalPlayer.jsx` | Low (risk, not speed) |

### E. Video

| # | Finding | Evidence | Priority |
|---|---|---|---|
| E1 | Uploaded videos use `preload="auto"`, which downloads the whole file as soon as the player opens, on any connection. | `VideoPlayerModal.jsx` | Medium |
| E2 | The Bunny embed has no `loading` attribute and no referrer policy set; it works only because the website's address is on the Bunny allow-list. If the list is wrong the iframe shows an error page with a normal 200 status (seen on the sales site and in the app). | `BunnyEmbedIframe.jsx` | Low |
| E3 | Every child modal (video, SCORM, audio and chant recording) is imported statically into the module page, so their code (the video modal is 1,500 lines, the SCORM player 1,100) is parsed before they are ever opened. | `ChildJourneyModule.jsx` imports | Medium |

### F. Delivery and hosting

| # | Finding | Evidence | Priority |
|---|---|---|---|
| F1 | The backend has no response compression (no `compression` middleware found). It may be handled by the host or CDN in front — **needs confirming**, because large course JSON is sent as-is otherwise. | `backend/package.json`, `server.js` | Medium (verify first) |
| F2 | The deployment guide sets `immutable` caching in the nginx sample only. Whether the real S3/CloudFront setup sends long-lived cache headers and compression for the hashed `assets/` files is not documented. | `frontend/DEPLOYMENT_GUIDE.md` | Medium (verify first) |
| F3 | No service worker or offline cache; a repeat visit relies on the browser's HTTP cache alone. Not required, but it is what lets the app feel instant on the second open. | — | Low |

### G. Things already fine (no change needed)

- Hashed asset file names, so long cache lifetimes are safe once the host sends them.
- Image preload in the book player is bounded (4 at a time) and has a timeout.
- Bunny embeds are not force-downloaded.
- The cover image in My Journey is in a fixed square (`aspectRatio: 1 / 1`), so that grid does not jump.
- Token refresh is de-duplicated, so a burst of requests starts one refresh, not many.

## Recommended order

The order is by effect on a child's experience per hour of work. Each step is independent and ships alone.

| Step | Work | Fixes | Estimate |
|---|---|---|---|
| 1 | Redeploy the backend (30-day picture cache). Confirm compression and cache headers on the web host. | C3, F1, F2 | 0.5 h, no code |
| 2 | Lazy-load the routes and split vendor code so a child never downloads the admin/parent/teacher code. Lazy-load the video, SCORM and recording modals. | A1, A2, E3 | 4–6 h |
| 3 | Keep the last list on screen while refreshing (no spinner when data already exists); stop the tab-focus refetch from blanking the page; load the courses list and the course details at the same time. | B1, B3 | 4–6 h |
| 4 | One shared picture component for the web: `loading`/`decoding`/`fetchpriority`, same-size box, first four immediate and the rest staggered, one shared URL helper replacing the seven copies. | C1, C2 | 5–7 h |
| 5 | A small session cache for journey and course details, with prefetch when a card is tapped. | B2, B5, B6 | 5–7 h |
| 6 | Convert and resize the large home pictures (WebP, right size). | A3 | 1–2 h |
| 7 | Make the book preload real: download audio/video into the browser cache instead of `HEAD`, start when page 1 is ready, keep loading in the background, per-page "Next" gate. | D1, D2, D3 | 2–3 days |
| 8 | Durable book cache keyed by book version (Cache Storage). | D4 | 2–3 days |
| 9 | `preload="metadata"` for uploaded videos with load on play. | E1 | 1 h |

Steps 1–6 together are about **2.5–4 working days** and cover everything a child sees on the Home, My Journey and
module pages. Steps 7–8 are the larger book-player work and are the same as the plan already written in
`CMS_BOOKS_PRELOAD_SPEEDUP_PLAN.md` (Phases 1, 2 and 4) for the web.

## Skeleton loading, page by page

The app already has a skeleton for My Journey, the module page, Explore, Replays and Kids Wall (pulsing grey
shapes in the same size and place as the real content). The web has **none**: every child page shows a
`CircularProgress` spinner, usually full screen. A skeleton helps three ways: the page layout is already there
(nothing jumps), the child sees something familiar at once, and a quiet refresh can leave real content on screen.

Rules for all of them (so they are built once, not ten times):

1. One small shared `Skeleton` set (bone, card, row) using the MUI `Skeleton` already installed — no new library.
2. Each skeleton copies the final layout's sizes (card grid, square covers, header height), so nothing moves when the real content arrives.
3. A skeleton shows **only on the first load**. If data already exists (step 3/5 of the plan above), a refresh keeps the real content and shows nothing.
4. Show it only if loading takes longer than about 150 ms, so a fast response does not flash a skeleton for one frame.
5. Pulse animation off when the device asks for reduced motion.
6. Each skeleton has an accessible label ("Loading journey") and does not trap focus.

| Page | Today | Skeleton to build | Notes |
|---|---|---|---|
| Home | Full-screen spinner until the child record arrives; the live class card has its own small spinner | Welcome card (avatar + two text lines), live class card, awards row | The page shell and bottom navigation are already in the layout, so only the content area needs it |
| My Journey | Full-screen spinner on every fetch (including tab focus) | Header (title + subtitle bones), 3 square-cover cards in the 3-column grid, summary strip | Same shape as the app's journey skeleton; must not appear on the focus refresh |
| Module (course) | Full-screen spinner | Cover header, progress bar, then one row of cards per section (videos, books, chants, audio) | Sections that load their own data later (watch status, readings) show a row skeleton instead of a blank gap |
| Explore (collections) | Spinner | Row of collection cards | |
| Explore videos / replays | Spinner in the middle of the list | Grid of video thumbnails (16:9) with a title bone | Matches the app's explore and replays skeletons |
| Kids Wall | Spinner under the header | 3 post cards (photo block, name line, like/star row) | The Kids Wall code shows no sign of paging (one fetch, whole feed); confirm before building |
| Printables | Not checked line by line | Card grid | Confirm when built |
| Profile | Spinner | Header stats, level progress bar, badge circles | |
| Share Something | Not a data page | None needed | Loading is the upload, covered below |
| Book player (inside a book) | A full "Loading all content..." panel with a percentage | Keep the panel for the first-page wait only; after the book starts, no panel — a small "getting ready" mark on the Next button | Depends on plan step 7 |

Build order for skeletons: the shared pieces first, then My Journey and Module (the most visited and the slowest),
then Home, Explore, Kids Wall and Profile. About **1.5–2 days** for all of them together; they pair naturally with
steps 3–5 of the main plan because rule 3 needs the "keep what is on screen" change.

## Other things that make the child side feel smoother

Items marked "seen" were found in the code; items marked "to check" are ideas that need a quick look before
they are scheduled.

| # | Idea | Why | Status |
|---|---|---|---|
| S1 | **Errors show a retry, not just text.** My Journey's error page is plain text on a coloured screen with no button, and a failed fetch also pops a notification — including a failed background refresh the child never asked for. | A child (or parent) cannot recover without reloading | Seen |
| S2 | **No notification for a quiet refresh failure.** If real content is already on screen, a failed background refresh should be silent. | Pairs with S1 and the "keep what is on screen" change | Seen |
| S3 | **Fade-in instead of pop-in** for covers and cards (short, a few hundred ms), off for reduced motion. | The app already fades pictures in | Idea |
| S4 | **Prefetch on press/hover.** Start the course details request when a card is pressed (or hovered on desktop), before the page changes. | The app does this; the page opens already loading | Idea |
| S5 | **Keep scroll position** when going back from a module to My Journey and from Explore details. | Starting again from the top after every back is jarring on a long list | To check |
| S6 | **Optimistic Kids Wall like/star.** Show the new count at once and undo only if the request fails. | The button feels instant on a slow server | To check |
| S7 | **Upload progress and instant preview** in Share Something: show the chosen picture straight away and a progress bar while it uploads. | A large photo on a slow connection looks frozen | To check |
| S8 | **Resize the photo in the browser before upload** (long side about 1600 px, quality 80 %). | Phone photos are several MB; smaller uploads finish sooner and make smaller files for the Kids Wall to load later | Idea |
| S9 | **Press feedback on every tappable card and button** (a short scale/colour change). | The page responds even if the server is slow | To check |
| S10 | **Page transition without a blank frame.** With lazy-loaded routes (plan step 2), keep the shell (header and bottom navigation) mounted and show the page skeleton inside it, instead of a blank screen between routes. | Otherwise step 2 trades a slow first load for a flash on every navigation | Idea, needed with step 2 |
| S11 | **Preload the next likely screens in idle time:** after My Journey paints, fetch the first course's details; after Home paints, fetch the journey list. | The next tap is then instant | Idea |
| S12 | **Warm the book before the tap:** on a module page, start fetching the first book's first-page media when the page is idle. | Phase 3 of the book speed-up plan | Idea, after step 7 |
| S13 | **Reserve space for everything that arrives late** (live class card, awards, stars in the header) so the page never shifts under a finger. | A tap that lands on a moved button is the most frustrating kind of lag for a child | To check |
| S14 | **Slow-connection awareness:** on a very slow or "save data" connection, skip the staggered image fade and load fewer pictures at a time. | The same behaviour the book plan suggests for cellular | Idea, low priority |

## Where these fit in the order

| Step | Work | Estimate |
|---|---|---|
| 3 (existing) + skeletons for My Journey and Module + S1, S2 | Keep content on screen, load in parallel, first-load skeleton, retry on error, silent failed refresh | 1.5–2 days together |
| 4 (existing) + S3 | Shared picture component with fade-in | as listed |
| 5 (existing) + S4 | Session cache and prefetch on press | as listed |
| New 5b | Skeletons for Home, Explore, Kids Wall, Profile; S10 (shell stays during page loads) | 1–1.5 days |
| New 5c | S5, S6, S7, S8, S9, S13 after a short check of each | 1–2 days |

The skeletons themselves are quick; the part that takes care is rule 3 (showing them only on the first load),
which is why they are scheduled with the data changes and not as a separate cosmetic pass.

## What this audit does not cover

- Real timings: no Lighthouse or network trace was taken against production. The first thing to do after steps
  1–3 is a before/after run on a throttled connection.
- The Explore, Kids Wall and Printables pages were checked for the same patterns (spinner on every fetch, plain
  images, no list limit on Kids Wall) but not read line by line; the same fixes in steps 3–5 apply.
- Admin, parent and teacher screens, and Star Cam.
- Accessibility and security (see `SECURITY_AUDIT_2026.md`).

## Method notes

- Bundle numbers come from `vite build` run on the current code into a temporary folder; the project's own
  `dist` was not touched.
- Nothing in the web code was changed for this audit.

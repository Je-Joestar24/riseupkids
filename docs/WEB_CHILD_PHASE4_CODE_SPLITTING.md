# Web child side — Phase 4: code splitting

Fourth step of `WEB_CHILD_PERFORMANCE_AUDIT.md`. It fixes audit findings A1, A2 and E3 (and S10): the whole
site was one 2 MB script, so a child downloaded the admin, parent and teacher screens before seeing anything.
Web only; no backend change, no new environment variable, no new library.

## Before

- Every page was imported at the top of the router, so the build produced one `index-*.js` of
  **2,059 kB (514 kB compressed)**, the same file for every visitor, children included.
- The child pages also carried their big pop-ups (video player with the book player inside it, interactive
  content, recordings; about 4,000 lines of code) and the built-in book reader, all downloaded and read
  by the browser before any of them could be opened.
- Each child page drew its own frame (header and bottom navigation), so moving between pages replaced the
  frame as well.
- A page that failed to load, or to draw, left a blank white screen.

## After

JavaScript a visitor must download before the page can run (sizes of the built files, not timings):

| Visitor opens | Before | After | After, compressed |
|---|---|---|---|
| Sign-in page | 2,059 kB | **614 kB** | 180 kB |
| Child Home | 2,059 kB | **650 kB** | 193 kB |
| Child My Journey | 2,059 kB | **652 kB** | 193 kB |
| Child course page | 2,059 kB | **713 kB** | 209 kB |
| Child Kids Wall | 2,059 kB | **651 kB** | 194 kB |
| Child Explore videos | 2,059 kB | **668 kB** | 199 kB |
| Parent: choose a child | 2,059 kB | **631 kB** | 186 kB |
| Parent dashboard | 2,059 kB | 807 kB | 241 kB |
| Admin dashboard | 2,059 kB | 775 kB | 238 kB |
| Teacher dashboard | 2,059 kB | 781 kB | 242 kB |

The compressed size before was 514 kB for every route. A child's Home now needs about **a third** of the code
it needed (about 62 % less compressed). The remaining pages are downloaded in the background after the first
one is up (see "Warming"), so they are normally already in the browser by the time they are tapped.

## What changed

| Piece | File |
|---|---|
| Every route as data (path, guard, roles, layout, page) | `src/router/routeTable.js` (new) |
| Every page and layout as its own downloadable chunk | `src/router/routeComponents.js` (new) |
| The router, built from the table | `src/router/AppRouter.jsx` (was 699 lines of repeated routes) |
| The child frame, one level above the child pages | `src/router/ChildShell.jsx` (new) |
| Lazy loading with preload, reload-on-missing-file and idle warming | `src/utils/lazyChunk.jsx` (new) |
| Loading mark, error screen with Try again, pop-up spinner | `src/components/common/RouteLoading.jsx` (new) |
| Pop-ups downloaded on demand | `src/components/child/common/lazyModals.jsx` (new), `src/hooks/useIdlePreload.js` (new) |
| Shared library files | `vite.config.js` |

**One file per area.** Each page and layout is its own chunk, so a child never downloads an admin, parent or
teacher page, and an admin never downloads the child pages. The sign-in page is the one page that ships with
the first download: it is the front door for everybody.

**Same routes, same guards.** The routes moved into `routeTable.js` unchanged: same addresses, same roles,
same layouts, same redirects (the table is checked against the old list by a test). One wrapper, `AuthedAccess`
or `UnAuthed`, still guards every page, and a visitor who is turned away downloads nothing from the area they
were refused.

**The child frame stays.** The header and bottom navigation are one level above the child pages
(`/child/:id`), so they stay on screen while a page's code downloads and while the child moves around. The
loading mark appears inside the frame, never instead of it. Before, each page brought its own copy of the frame.

**Layout and page download side by side.** A layout and the page inside it were requested one after the
other (the page only once the layout had arrived). The router now asks for both at once, and for the child
area it asks for the page while the frame's code is still downloading.

**Pop-ups on demand.** The video player (with the book player), interactive content, the two recording
pop-ups and the built-in book reader are not part of the pages that open them. Their code is downloaded
quietly once the page is up (one at a time, only when the browser is idle), and if a tap still beats the
download, a spinner appears after a short moment. The Explore video list, the replays page and the replays
row on Explore warm the video player the same way.

**Warming.** After the first child page has been up for 1.5 s, the other child pages are downloaded one at a
time in the background, the bottom-navigation tabs first. While a parent is choosing a child, the child
frame and Home are warmed. Nothing is warmed on a save-data or 2G connection.

**Shared library files.** React and the router, and the state libraries, are separate files that rarely
change, so after a release a returning visitor re-downloads the app's own code but not React again. The UI
kit is deliberately not grouped: a try showed that grouping it adds about 200 kB for a child, because the
group also holds the parts only admin screens use.

**A page that cannot load.**
- After a release the old hashed files are gone from the server, so a tab opened before the release can ask
  for a file that no longer exists. The page now reloads itself once to pick up the new files, and a second
  failure inside 30 s shows an error instead of looping. A browser that cannot remember that it reloaded
  never reloads.
- A page that fails to download or to draw shows "This page could not load." with **Try again**, inside the
  child frame for child pages; the message clears when the child moves to another page. Before it was a
  blank screen.

## What this does not do

- It does not make the very first download tiny. The first file still holds React, the UI kit, the state
  store and the sign-in page, about 614 kB (180 kB compressed). Reducing it further means splitting the state
  store by area, which touches every page that reads it and was left out on purpose.
- It does not change what a page does once it is open, or how its data loads (Phases 1 to 3).
- A first-ever visit to a child page is now two downloads in a row after the first file (the frame and the
  page, side by side), instead of none. Compressed they are small (the frame and Home together are about 9 kB),
  and every later page is already warmed.
- The book reader (`components/admin/common/cmsTest`) still lives in the admin folder; it is only loaded when a
  book is opened. One small helper from that folder (`shared.js`, 5 kB) is used by the state store, so it
  ships with the first file. Moving the reader into a shared folder is a clean-up for later.
- No server setting was changed. The host should serve the hashed files with a long cache lifetime and
  compression (still to confirm, as noted in the audit).

## Tests

- `utils/lazyChunk.test.jsx` (34) — the chunk-error rules (one reload per 30 s, never when the browser cannot
  remember it, never for other errors); one download however often a page is drawn or preloaded; a page that
  already arrived draws on the first render, with no loading frame; a failed download is tried again; pop-up
  wrapper; idle warming (one at a time, cancel, save-data).
- `components/common/RouteLoading.test.jsx` (10) — loading mark only after a delay, labels, no timer left behind,
  the error screen, Try again, clearing on the next page.
- `hooks/useIdlePreload.test.jsx` (5) — quiet, in order, waits to be enabled, stops on leaving, save-data.
- `router/routeTable.test.js` (57) — the table matches the old list of routes exactly (every address, guard,
  role, layout and redirect), no duplicates, no empty role list, every name has a component.
- `router/importBoundaries.test.js` (10) — follows the plain imports of the first download and of the child
  area: no admin, teacher, parent or content-creator page, layout or component, no child page in the first
  file, no pop-up in the child pages, no drag-and-drop or payment library. The only exception is one 5 kB
  address helper. This fails the day someone imports an admin page into a child page.
- `router/AppRouter.test.jsx` (16) — the real router, route table and lazy loading with each page's code
  tracked: a signed-out visitor downloads only the sign-in page, a visitor turned away downloads nothing of
  the refused area, a parent gets the child area and no admin code, an admin no child code, layout and page
  requested at the same moment, the child area warmed while a parent chooses a child, a page that fails shows
  the error screen, the session check still runs once, and the admin layout stays on screen while the next admin page downloads.
- `router/ChildShell.test.jsx` (10) — the same frame (not a new one) when moving between pages, the loading
  mark inside the frame, the error screen cleared on the next page, warming starts late, one at a time, stops
  on leaving.
- `router/ChildShell.real.test.jsx` (6) — the child frame with the REAL header, bottom navigation and
  notification dialog: shown before any page arrives, the very same header and navigation after moving to
  another page, navigation usable while the next page downloads, a notification still handled.
- `router/routeModules.test.js` (53) — loads every page, layout and pop-up that the on-demand doors point to,
  with the real code, and checks each has something to draw (a mistyped path or a missing default export would
  otherwise only show when somebody opens that page).
- `components/child/module/ChildModuleLibrary.test.jsx` (6, new) — the first test of the books section: the reader
  is not drawn before a book is opened, is fetched ahead in the background, opens with the book's pages,
  still opens if the tap comes first, and is left alone on save-data.
- `pages/child/ChildJourneyModule.test.jsx` (+4), `ChildExploreVideos.test.jsx` (+2), `ChildExploreReplays.test.jsx`
  (+1), `ChildExplore.test.jsx` (+1) — the pop-ups are fetched after the page is up, one at a time, not before
  the course is on screen, and stop when the child leaves.
- `test/viteChunks.test.js` (22) — which libraries go in the shared files and which stay with the pages.
- Broken on purpose to confirm the tests catch it (twenty-nine ways): a page download not shared with a
  preload, a reload on every missing-file error, a reload when the browser cannot remember it already
  reloaded, any error counted as a missing file, a failed download remembered forever, a preloaded page that
  still suspends, warming that ignores save-data, warming that downloads everything at once, a pop-up that
  ignores its spinner, an admin route opened to teachers, a route dropped, pages warmed for a visitor who is
  turned away, a page not requested beside its layout, a child page not requested beside the frame, the child
  id not passed to a page, a wrong redirect, an admin page imported into the first download, warming that
  starts at once or is not stopped on leaving, the loading mark replacing the frame, a spinner with no delay,
  an error message that never clears, pop-ups never warmed or warmed before the course is up, the book
  reader drawn before a book is opened or never fetched ahead, the video player never warmed on Explore, and
  the UI kit grouped into a shared file. Each failed the expected test; the code was restored. One was missed
  at first (warming one at a time was only checked for a short wait) and the test was made stricter; one
  "break" turned out to change nothing (pinning the page's component type), so that unneeded code was removed.
- Whole web suite: 54 files, 656 tests pass (was 43 files, 419 tests). `vite build` compiles (the first file
  is 438 kB plus two shared library files of 162 kB and 29 kB, instead of one file of 2,059 kB).
- Tried in a real browser on the built site (signed out only, since the child pages need a login): the sign-in
  page downloaded exactly three scripts (about 181 kB compressed); opening the admin address while signed out
  went back to sign-in with no admin code downloaded; a lazy page (reset password) loaded its own file on demand.

Run with `npm test` in `frontend/`.

## Check by hand

1. Build and open the site (`npm run build`, `npm run preview`). In the browser's Network tab, filter by JS,
   load the sign-in page: no `Admin…`, `Child…` or `Parent…` file should be requested.
2. Sign in as a parent, choose a child: Home should appear with the header and bottom navigation, and after a
   couple of seconds the other child pages should appear in the Network tab one by one.
3. Tap through Home, My Journey, Explore and Kids Wall: no blank flash, the header and bottom bar never
   disappear, no file is downloaded twice.
4. Throttle to Slow 3G and tap a tab you have not visited: the bar stays, a small spinner shows in the
   middle after a moment, then the page.
5. Open a course and a video: it should open at once (the player was warmed); on Slow 3G with the cache
   disabled, a spinner shows over the page until it is ready.
6. Open a built-in book: same, the reader opens with its pages.
7. After a release, with a tab opened before it, tap a page not visited yet: the page reloads once and works.
8. Sign in as an admin: the dashboard and its pages work as before; teachers and content creators likewise.

# Web child side — Phase 3: caches and starting things early

Third step of `WEB_CHILD_PERFORMANCE_AUDIT.md`. It brings the website's child pages in line with what the
app does (`journeyStore` / `moduleStore`): the last answer is drawn at once and refreshed quietly, so only the
very first visit to a page shows placeholders. It fixes audit findings B2, B5 and B6, and covers S4 and S11.

- **Part 1** — the course page: a course cache, and starting a course when its card is pressed.
- **Part 2** — the other child pages: Home, Explore and the Kids Wall (further down).

# Part 1 — the course page

## Before

- Opening a course always showed the course page's loading placeholder, even a course the child had just
  closed. The page kept its own copy of the course, so leaving the page threw it away.
- Nothing started until the page had opened: the request for the course began only after the tap.
- Home did not warm anything, so My Journey always started from nothing.
- A refresh the child never asked for (after finishing a video, a recording or a book) could pop up an error.

## What changed

| Piece | File |
|---|---|
| Course cache, one per child and course, shared requests | `src/store/slices/childModuleSlice.js` (new) |
| Start loading a course when its card is pressed or hovered | `src/hooks/useCoursePrefetch.js` (new) |
| Download pictures into the browser ahead of time | `prefetchImages` in `src/utils/remoteImage.js` |
| Journey list: covers on arrival, and a start from Home | `src/store/slices/childJourneySlice.js` |

**Course cache.** `childModuleSlice` keeps each course the child can open, per child. The course page reads
the course from it instead of keeping its own copy. A course opened before is on screen at once, with no
placeholder, and refreshes quietly behind it. The placeholder is only for a first visit.

- Two callers asking for the same course at the same moment share one request.
- A course that turns out to be locked is never kept, and one that was open a moment ago is forgotten, so the
  page shows the locked message instead of an old copy.
- A failed refresh of a course already on screen is silent (no popup, no error). A failed first load still
  shows the message with Try again.
- Emptied on logout. Lives in memory only, so a reload starts empty (see "What this does not do").

**Starting early.** On a card:

| Child does | What starts |
|---|---|
| Presses the card (mouse or finger) | The course request and its cover, before the click lands |
| Rests a mouse on the card for 120 ms | The same. Moving across cards, or touching, starts nothing |
| Clicks with no press (keyboard, assistive tools) | The same, at the click |
| Presses a locked card | Nothing |

The course page then joins that request instead of making a second one. A card does not start a course that
was loaded in the last 30 s. A failed start is silent: the page simply asks again when it opens.

**Home starts the journey list.** Once Home has its own data, it starts My Journey's list (only if nothing
is cached and nothing is under way). My Journey then opens already filled. If that start failed, My Journey
does not flash the old error: it shows its placeholder until its own first answer, and only then an error.

**Covers.** When the list arrives, its first four covers start downloading. When a course arrives, so does
its cover. Together with Home's start this means the covers are often already in the browser by the time the
cards are drawn. Only four are fetched ahead: fetching them all together is what made the first load slow.
A picture asked for once is not asked for again.

**Refreshes the child did not ask for are silent.** After finishing a book, a recording or a chant, the
course refreshes behind the scenes; if that fails there is no popup (the content is already on screen).
Before, the hook showed one.

**Also fixed (from Phase 2).** `RemoteImage` set `fetchPriority` in camel case, which React 18 warns about in
development. It now uses the lowercase spelling React 18 accepts; the page output is the same.

## What this does not do

- It does not survive a reload: the cache is in memory. A durable cache is Phase 8.
- It does not warm the first course from My Journey on its own (audit S11's second half); only a press or a
  resting mouse starts a course.
- The video watch statuses and book readings inside a course page still load after the page opens.
- Pictures are not smaller. The covers still arrive at their uploaded size; that needs the backend or a CDN.
- The cache never expires on its own. A cached course is always refreshed when its page opens, so it is
  never more than a moment old on screen, but nothing refreshes it while the child stays on the page.
- Scroll position on the way back to My Journey (audit S5) is not changed.

## Tests

- `store/slices/childModuleSlice.test.js` (18, new) — stored per child and course, shared requests, asks
  again when opened, cover started, locked not kept and forgotten, failures keep the cached course, the
  press-start rules (under way, fetched within 30 s, never rejects), logout.
- `store/slices/childJourneySlice.test.js` — covers started in list order, none on failure; the start from
  Home (fills the cache, no child, already cached, under way, failure recorded but not thrown).
- `utils/remoteImage.test.js` — `prefetchImages`: high priority, first four only, empty entries skipped, no
  repeats, retry after a failure, no throw for odd input or without `Image`.
- `pages/child/ChildJourney.test.jsx` — press starts the course while still on My Journey, press then click
  asks once, a click alone also starts it, a resting mouse starts after the wait and not before, passing over
  or moving between cards, touch does nothing on hover, closing the page cancels the wait, a locked card does
  nothing, the cover is started, a failed start is silent; an old failure is not shown before the page's own
  answer, not even on the first render.
- `pages/child/ChildJourneyModule.test.jsx` — cached course shown at once (also on the first render), the
  fresh one replaces it, second visit instant, silent failed refresh, locked after refresh, joins a request
  a card started, first-load error with Try again.
- `pages/child/ChildHome.test.jsx` — the list starts after Home's own data, not before, not again when cached
  or on a stats update, and a failure leaves Home working.
- `pages/child/ChildJourneyOpensCourse.test.jsx` (3, new) — both real pages together: press, click, one
  request, page fills when it arrives; the answer that came while the finger was down is there on open;
  opening the same course again shows it at once and refreshes quietly.
- Broken on purpose to confirm the tests catch it (twelve ways): a touch counted as a mouse, leaving a card
  not cancelling the wait, a click not starting the course, the page unable to join a request, a locked
  course kept, the course page always showing its placeholder, a failed quiet refresh showing an error, Home
  starting the list too early, the journey page showing an old failure at once, a repeat start within 30 s,
  covers not started on arrival, the same picture fetched again. Each failed the expected test; the code was
  restored. Two of these were missed at first (both are a single wrong frame before the effects run), so
  tests that read the very first render were added and now catch them.
- Whole web suite after part 1: 37 files, 320 tests pass (was 35 files, 257 tests). `vite build` compiles
  (the script is 2,058.35 kB, +2.4 kB). Part 2's totals are at the end.

Run with `npm test` in `frontend/`.

## Check by hand

1. Open My Journey, press a card and watch the Network tab: the course request should start on the press,
   before the page changes, and there should be only one for that course.
2. Open a course, go back, open it again: it should be there at once with no placeholder, then update
   quietly if anything changed.
3. On a desktop, rest the mouse on a card for a moment: its course request should start. Sweep the mouse
   quickly across all the cards: nothing should start.
4. From Home, wait a second, then open My Journey: the list and the first covers should already be there.
5. Lock the course you just opened in the admin screen, then open it again from My Journey: it should show
   the locked message, not the old copy.
6. Throttle to Offline after opening a course once, then open it again: it should still show, and no error
   or popup should appear.

---

# Part 2 — Home, Explore and the Kids Wall

## Before

These pages kept their data in the page's own state. Leaving a page threw it away, so **every visit** started
from nothing: the Home counts, the six Explore collection cards, each video list, the replays and the whole Kids
Wall feed all showed their placeholders again, even a moment after the child had seen them. The phone app draws
the last answer at once and only the first visit waits.

## What changed

| Piece | File |
|---|---|
| One shared cache for these pages, per child, emptied on logout | `src/store/slices/childPageCacheSlice.js` (new) |
| The hook every page uses: last answer at once, quiet refresh, retry | `src/hooks/useCachedLoad.js` (new) |
| Home child record | `src/pages/child/ChildHome.jsx` |
| Explore collection cards (six, each cached on its own) | `components/child/explore/ExploreVideoCollectionsCards.jsx` |
| Explore replays row and the full replays page and its header | `ExploreReplays.jsx`, `ExploreReplaysCards.jsx`, `ExploreReplaysHeader.jsx` |
| A collection's video list, each video's watched state, the star total | `ExploreVideosCards.jsx`, `ChildExploreVideos.jsx` |
| Kids Wall feed (likes, stars, new posts and deletes keep it right) | `src/hooks/kidsWallHook.js` |

**How a page behaves now.**

| Visit | What the child sees |
|---|---|
| First ever | The same placeholders as before, then the data |
| Any later visit | The last data at once, from the very first frame, then replaced quietly when the refresh arrives |
| Later visit, refresh fails | The last data stays. No popup, no error |
| First visit, request fails | The message with Try again (lists), or the friendly defaults (Home, collection cards). Nothing is remembered, so the next visit tries again |

**Numbers never turn into zeros by accident.** The Explore star totals and progress used to come back as `0`
when a request failed. On a first visit that is kept as the friendly default; but a refresh that fails behind
numbers already on screen would have replaced them with zeros. The two number requests can now report that they
failed (`strict`), and the page keeps what it had. A view count that cannot be read keeps its last value too.

**No popups for refreshes nobody asked for.** The Explore list and replay requests can run quietly
(`silent`), so a failed refresh behind content that is already on screen shows nothing.

**Watched states are asked about once per visit.** On a video list, a refreshed list only asks about the videos
that are new, instead of every video again.

**The share card is no longer locked by a feed refresh.** The Kids Wall used to disable the share button for the
whole time the feed was loading; now only posting and deleting do.

**Kept as is.**
- The live-class card on Home still loads fresh each visit: it shows who is live right now, and a remembered
  answer could be wrong.
- The cache is per child and lives in memory, like the journey cache: a reload starts empty (Phase 8).
- The replay stars in the replays header are still requested but not drawn (the header never showed them);
  that is existing behaviour, now cached.

## What this does not do

- Profile, Printables and the live-class card are not cached.
- Videos and audio are not cached; only pictures are (by the browser, from Phase 0).
- Nothing survives a reload, and nothing expires while the child stays on the same page.
- It does not add a service worker or work offline.

## Tests

- `store/slices/childPageCacheSlice.test.js` (7, new) — stored per key, children kept apart, replace, empty
  answers kept, no key, logout.
- `hooks/useCachedLoad.test.jsx` (22, new) — first load; the answer there from the first render on a later
  visit; the loader told when it is a quiet refresh and what is on screen; message only while nothing is cached,
  silent failed refresh, Try again, the message dropping once something is cached; one shared request per store
  and key; the latest loader; no key / disabled; `setData`.
- `hooks/exploreQuietFailures.test.jsx` (7, new) — popup by default, none with `silent`; numbers zero by default
  and failing when `strict`.
- `utils/replayViewCounts.test.js` (6, new) — counts together, a failed count keeping its last value.
- `hooks/kidsWallHook.test.jsx` (15, new) — the feed not loading by itself, shared with another page, kept per
  child, no lock on the share card, silent failed refresh; posting and deleting refresh the cached feed; likes
  and stars change the cached post; admin mode untouched.
- `pages/child/ChildHome.test.jsx`, `ChildExplore.test.jsx`, `ChildExploreVideos.test.jsx`,
  `ChildKidsWall.test.jsx` — a "coming back" group each: data at once with no placeholder, there from the very
  first render, replaced on arrival, kept when the refresh fails, asked again every visit, another child never
  sees it; Explore: numbers kept instead of zeros, a failed first visit shows zeros and is not remembered,
  quiet requests, a stats update still refreshes; video list: new videos only, stars; Kids Wall: a like given
  before leaving is still there, an empty feed remembered.
- `pages/child/ChildExploreReplays.test.jsx` (11, new) — the first test of the full replays page: loading card on
  a first visit only, cached list and counts, quiet refresh, kept counts, empty list.
- Broken on purpose to confirm the tests catch it (eighteen ways): an error showing over cached content, the loader
  never told the refresh is quiet, no shared request, Try again keeping the old message, the cache shared between
  children, Home showing placeholders every visit, a collection turning into zeros, numbers that cannot fail, no
  refresh on a stats update, a refreshed list asking about every video again, a failed status overwriting the one
  on screen, a view count dropping to 0, the replays loading card every visit, a like not kept, a feed refresh
  locking the share card, a new post not refreshing the feed, a popup on a quiet refresh, numbers that cannot say
  they failed. Each failed the expected test; the code was restored. One was missed at first (a stale message
  after the cache fills from elsewhere) and a test was added; one of my breakages had a typo and was redone.
- Whole web suite: 43 files, 419 tests pass (was 37 files, 320 tests after part 1). `vite build` compiles (the
  script is 2,059.15 kB, +0.8 kB for part 2).

Run with `npm test` in `frontend/`.

## Check by hand

1. Open Home, then Explore, then Home again: the second Home shows the name and counts straight away, no grey bars.
2. Open Explore, go into a collection, go back: the six cards and the replays row are there at once.
3. Open a collection's video list, go back and forward: the cards, the "Review Lesson" / "Start Lesson" wording
   and the star total are there at once.
4. Open the Kids Wall, like a post, go to Home and back: the like is still there, with no placeholder.
5. Turn the network off (browser dev tools, Offline) after visiting each page once, then visit them again: the
   last data shows, with no error and no popup.
6. With the network on, watch a video to the end and go back to the collections: the progress and stars update
   without the cards going grey.
7. Sign out and sign in as another child: nothing from the first child shows.

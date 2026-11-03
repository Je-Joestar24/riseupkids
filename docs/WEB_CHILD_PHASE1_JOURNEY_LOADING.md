# Web child — Phase 1: My Journey and course page loading

Phase 1 of [`WEB_CHILD_PERFORMANCE_AUDIT.md`](./WEB_CHILD_PERFORMANCE_AUDIT.md) (findings B1, B3, S1, S2 and the
first skeletons). Web only; no backend change, no new environment variable.

## Before

- Every fetch set `loading` and the page returned a full-screen spinner — including each time the browser tab
  was focused again, so My Journey blanked whenever the child switched tabs.
- The course page asked for the whole courses list first and only then for the course itself (the list is only
  used for the step number).
- A failed fetch showed a popup and a bare error text with no way to retry.
- The course page threw away the server's message and always said "Failed to load course".

## After

| Behaviour | How |
|---|---|
| The last list stays on screen | `store/slices/childJourneySlice.js` keeps the courses per child for the session. A page that finds a list shows it and refreshes behind it. |
| Skeleton only on a first load | A page shows its skeleton only while nothing is cached and there is no error. It appears after 150 ms, so a quick answer never flashes it. |
| Quiet refresh on tab focus | Coming back to the tab refreshes the list only if it is older than 30 s (`JOURNEY_REFRESH_MIN_AGE_MS`), and the page never blanks. Opening the page always refreshes. |
| One request for simultaneous callers | Two callers asking for the same child at the same moment share one call. |
| Course page loads in parallel | The course and the courses list are requested together. The page opens when the course arrives; the list only fills in the step number (step 1 if it never arrives, no popup). A list fetched in the last 30 s is reused. |
| Errors | A first-load failure shows the message with **Try again**. A failed refresh while content is on screen is silent. The real server message is shown. |
| Privacy | The cache is memory only (gone on reload), keyed by child, and emptied on logout. |

## Files

| Piece | File |
|---|---|
| Cache, request sharing, 30 s limit | `frontend/src/store/slices/childJourneySlice.js` (registered in `store/store.js`) |
| Hook now reads the cache (`courses`, `loaded`, `error`) | `frontend/src/hooks/courseProgressHook.js` |
| Skeleton frame (delay, label) and bone (reduced motion) | `frontend/src/components/child/common/ChildSkeleton.jsx` |
| Error screen with retry | `frontend/src/components/child/common/ChildLoadError.jsx` |
| My Journey and course skeletons | `components/child/journey/ChildJourneySkeleton.jsx`, `components/child/module/ChildModuleSkeleton.jsx` |
| Pages | `pages/child/ChildJourney.jsx`, `pages/child/ChildJourneyModule.jsx` |

Behaviour change worth knowing: `fetchChildCourses()` no longer shows a popup on failure and now rejects; each
page decides how to show it. The hook no longer returns `loading` (use `loaded`). Nothing else used either.

## Home page (added to Phase 1)

| Behaviour | How |
|---|---|
| No full-screen spinner | The page frame shows at once. The child's name and the three award counts hold their place with small placeholders (after 150 ms); the avatar, text and **Start Learning** are usable straight away. |
| Requests start together | The child record, the next live class and the live-stream check were a chain (the live card mounted only after the child arrived). They now start at the same moment. |
| Live class card | A placeholder card replaces its spinner. It waits for both the live-stream check and the meeting (before, it went blank as soon as one of them answered). When nothing is scheduled the card disappears as before; a quick answer never flashes it. |
| One request for the child | The welcome and awards cards each re-fetched the child record when it had not arrived, and the awards card also re-fetched on every stats update, so the same record could be requested three times. They now only display what the page gives them; the page refreshes once on a stats update. |
| Failure | Unchanged: the page stays usable with "Hi, Friend!" and zeros. The two cards no longer retry on their own. |

Files: `pages/child/ChildHome.jsx`, `components/child/home/ChildHomeStartLearning.jsx`, `ChildHomeAccumlatedAwards.jsx`,
`ChildHomeLiveClass.jsx`; the inline placeholder (`InlineBone`) and the delay hook are in `ChildSkeleton.jsx`.
Test: `pages/child/ChildHome.test.jsx`.

Not changed, worth knowing: `ChildHomeLiveClass.jsx` reads `activeYoutubeLive` in `canEndYoutubeLive` before it is declared
further down. It is hidden today because that line only reaches it for teacher/admin accounts, which would crash the card when
they open a child's Home. It is a separate fix.

## Static text stays; only the data holds a place

Rule applied to Home, My Journey and Explore: text and icons that never change are shown from the first frame, and only
the values that depend on the server get a placeholder. A whole-block skeleton is used only when the block may not exist
at all.

| Page | Always on screen | Placeholder |
|---|---|---|
| My Journey | "My Journey", "Progress Summary", the three icons and labels | "Step X of Y", the three counts, the card grid |
| Explore – collections | The six cards: icon, title, "Progress" label, button | Stars, viewed/total and the button wording, per card |
| Explore – replays | — | The whole row (it exists only when there are replays) |
| Explore – video list | Header (icon, type name, description, "Total Stars Earned"), share card, footer | The star total and the card grid; each card's button wording until its watched state is known |
| Kids Wall | The header, "Share Your Amazing Work!", the footer | The consent wording of the share card (subtitle and button) while the profile loads, and the feed |

Explore also changed how it loads:

- Each collection asked for its list, progress and stars one after another, and the page waited for all six before showing
  anything. The three are now requested together, and each card fills in as its own data arrives.
- Every "video watched" event reloaded the page with a spinner. It now updates the numbers quietly.
- If only the list failed, the card used to drop to zeros; it now keeps its progress and stars.
- "Loading replays..." text is replaced by the placeholder row (after 150 ms).

Files: `components/child/explore/ExploreVideoCollectionsCards.jsx`, `ExploreReplays.jsx`, `ExploreReplaysSkeleton.jsx`,
`components/child/journey/ChildJourneyHeader.jsx`, `ChildJourneySummary.jsx`, `ChildJourneyCardsSkeleton.jsx` (the
journey skeleton is now the card grid only). Tests: `pages/child/ChildExplore.test.jsx` and the updated journey tests.

Kids Wall:

- The feed has a placeholder grid of post cards (after 150 ms) instead of a spinner.
- "No posts yet" no longer flashes on the very first render (the hook started with `loading` false and no "loaded" flag). It
  shows only after the feed has really loaded with no posts.
- The feed no longer disappears while it refreshes (it was hidden whenever `loading` was true).
- The share card no longer says "sharing is blocked" while the child's profile is still loading; that wording, and the button,
  wait for the answer. A profile already known from this session is used straight away.
- A first-load failure shows the message with **Try again** in place of the feed (the header and share card stay).
- The hook now returns `loaded` for a child's feed. Files: `pages/child/ChildKidsWall.jsx`, `hooks/kidsWallHook.js`,
  `components/child/kidswall/KidsWallShareSomething.jsx`, `KidsWallCardsSkeleton.jsx`. Test: `pages/child/ChildKidsWall.test.jsx`
  (includes a first-render check, since the flash is invisible once effects have run).

Explore video list (opened from a collection):

- The "Loading videos..." box with a spinner is replaced by a grid of video-card shapes: cover with its duration badge, title,
  two description lines and a full-width button, in the real sizes (same idea as the app's card skeletons).
- The cards show as soon as the list arrives. The watched state (Start Lesson / Review Lesson, the tick) used to be fetched
  after the list and the page waited for all of it; each card now fills in on its own, all asked for together.
- The header showed a wrong "0" stars until the total arrived; it now holds a placeholder. A watched video updates it quietly.
- The empty message ("No Videos Available Yet") no longer flashes before the list has loaded, and a failed load shows the
  message with **Try again** instead of the empty message.
- It no longer depends on the shared explore "loading" flag, which any other explore request could switch on.
- Files: `pages/child/ChildExploreVideos.jsx`, `components/child/explorevideos/ExploreVideosCards.jsx`,
  `ExploreVideosHeader.jsx`, `ExploreVideosCardsSkeleton.jsx`. Test: `pages/child/ChildExploreVideos.test.jsx`.

The replay list and the course page still use spinners — next.

## Not in this phase

- The course details are not cached yet (opening the same course twice still loads it twice) — Phase 3.
- Pictures, code splitting and the other pages' skeletons — Phases 2, 4 and 5.
- The production bundle grew by about 6 kB (the new store and skeletons); Phase 4 shrinks it.

## Tests

- `store/slices/childJourneySlice.test.js` — caching per child, shared requests, the 30 s limit, failures that
  keep the cached list, clearing on logout.
- `components/child/common/ChildSkeleton.test.jsx` — the 150 ms delay, labels, no leftover timer, reduced motion,
  skeleton shapes, the error screen.
- `pages/child/ChildJourney.test.jsx` — the real page: skeleton only for a slow first load, cached list shown at
  once, silent failed refresh, tab focus (refresh, 30 s limit, cleanup), error and retry, empty list.
- `pages/child/ChildExplore.test.jsx` — static content and six cards at once, placeholders only where data is due, cards
  open before their numbers arrive, requests together, cards fill in one by one, list failure, quiet refresh on a watched
  video, replays row placeholder / empty / See All.
- `pages/child/ChildExploreVideos.test.jsx` — header and share card at once, star placeholder (no wrong 0), card placeholders,
  no empty-state flash (first render), cards before watched states, per-card states, status failure, empty, error and retry,
  quiet star refresh.
- `pages/child/ChildKidsWall.test.jsx` — frame at once, feed placeholder, no empty-state flash (first render), consent wording
  waits for the profile, blocked/allowed/cached profile, empty feed, failure and retry, like in place.
- `pages/child/ChildHome.test.jsx` — requests start together, the child requested once, name and counts placeholders,
  Start Learning while loading, live class placeholder and removal, failure defaults, stats update, cleanup.
- `pages/child/ChildJourneyModule.test.jsx` — both requests start together, the page does not wait for the list,
  step number, list failure tolerated, list reused, skeleton, locked course, error and retry.

Run with `npm test` from `frontend/`.

## Check by hand

1. Open My Journey, switch to another tab for a minute, come back: the page stays; no spinner.
2. Open a course, go back, open it again: no blank spinner on My Journey.
3. Throttle the network (browser dev tools, Slow 3G) and reload My Journey: grey shapes in the card grid, then the cards.
4. Go offline and reload: the message with **Try again**; go online and press it.
5. Open a course while offline for the list only (block the courses request): the course still opens.

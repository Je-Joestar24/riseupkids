# Rise Up Kids — Website Child Side Speed-Up
## Progress report: Phases 1 to 3

Date: 4 November 2026
Scope: the child pages on the website (Home, My Journey, course pages, Explore, Replays, Kids Wall).
Goal: make the website feel as fast and smooth as the phone app.

---

## Where the website started, and why this takes time

The phone app has been improved step by step over the past period: ordered picture loading, a saved copy of
each page, books that start before they are fully downloaded. **None of that was ever applied to the website.**
The two were built to different standards, so the website child side was well behind the app before this work
began, and catching up means rebuilding how every page loads, not fixing one slow spot.

What the audit found at the start:

- **26 separate findings in six areas** (first load, page data, pictures, the book player, video, hosting), plus
  14 ideas for making the pages feel smoother.
- **Every child page used a full-screen spinner** on every visit, with no placeholders, no saved copy and no
  retry on errors.
- **Pictures had no loading control at all**: no order, no reserved space, no priority. The same picture code
  was copied into nine places, so one fix would have meant nine edits.
- **The whole website is one 2 MB file** that every child downloads, including the admin, parent and teacher
  screens.
- **The book player's "preload" did not really preload sound or video**, yet still made the child wait for it.
- **The child pages had no automated tests.** Every behaviour I changed first had to be pinned down with new
  tests, so I could prove that nothing else broke.

Why it is taking this long, and is not finished:

1. **It is wide, not one fix.** Phases 1 to 3 changed more than 100 files across seven child pages, and each
   page behaves differently (first visit, return visit, slow connection, failed request, retry, another child
   signing in). Each of those cases had to be built and checked on its own.
2. **Each step depends on the one before.** Showing a placeholder only on the first visit needed the saved
   copy first; the saved copy needed shared request handling; starting a course on press needed both. The
   steps cannot be done in parallel or in a different order without redoing work.
3. **Everything is tested as it is built.** 12 test files were added in Phases 1 and 2 and 8 more in Phase 3,
   so the child pages now have 20 new test files and the whole website suite stands at 43 files and 419 tests,
   and the code was deliberately broken more than 30 ways to prove
   the tests really catch mistakes. This is what makes the changes safe to ship to children, and it is a large
   part of the time.
4. **The scope grew while the work was under way.** The saved-copy step was first planned for My Journey and
   the course page only. It was widened, at your request, to Home, Explore and the Kids Wall so the website
   matches the app everywhere, which is more work than planned but gives the result you asked for.
5. **There is more to catch up beyond these three phases.** Phases 1 to 3 made repeat visits instant. The
   first-load size of the site, the book player and saved copies that survive a reload are separate, larger
   pieces that this report does not cover.

In short: this is catching up a whole side of the product that fell behind, in the order that helps children
most per hour, and each finished phase is already usable on its own.

---

## 1. Summary

The phone app feels fast for three reasons: it shows a **grey placeholder in the right shape** instead of a
spinner, it **remembers the last thing it showed** so a page you have seen before opens at once, and it
**loads pictures in a sensible order**. The website did none of these. Every page blanked with a spinner on
every visit, even a few seconds after the child had seen it.

Phases 1 to 3 bring those three behaviours to the website. After this work:

- **A page the child has seen before opens instantly**, with its last content, and updates quietly if
  anything changed. Only the very first visit to a page shows placeholders. This is the same as the app.
- **A page never blanks with a spinner**, not even when the child switches browser tabs and comes back.
- **Pictures load in order** (the first four first, the rest one by one) into a box of the right size, so
  nothing jumps while the page loads.
- **A course starts loading the moment its card is pressed**, so the course page opens already filled.
- **A failed refresh no longer disturbs the child.** No error popups, and no numbers suddenly turning to
  zero, for something the child never asked for.

All of it is covered by automated tests: **43 test files, 419 tests, all passing**. The website build compiles.

> **Important to know:** I could not time these changes against your live server, and the child pages need a
> login, so I did not click through them in a real browser either. What is reported here is what the code
> does, proven by the tests. Section 6 gives a short checklist for you to confirm it by hand.

---

## 2. What a child sees: before and after

| Moment | Before | After |
|---|---|---|
| Opens My Journey for the first time | Full-screen spinner | Grey shapes in the real layout, then the cards |
| Opens My Journey again | Full-screen spinner again | The list is there at once; it refreshes quietly behind it |
| Switches browser tab and comes back | The page blanks and reloads | Nothing visible happens |
| Presses a course card | The page opens, **then** the course starts loading | The course starts loading on the press, and the page opens already filled |
| Opens the same course a second time | Loads from scratch | Appears instantly |
| Goes Home → Explore → Home | Home shows grey bars again | Home shows the name and counts straight away |
| Opens a collection in Explore, goes back | All six cards load again | All six cards are there at once |
| Opens the Kids Wall, likes a post, leaves and returns | Whole feed loads again, like not shown | Feed is there at once, with the like |
| Internet is slow or drops while looking at a page | Popup error, or numbers drop to 0 | Last content stays; no popup |
| First visit and the request genuinely fails | Plain error text, no way to retry | Clear message with a **Try again** button |
| Pictures arrive | All start together, appear abruptly, page jumps | Right-sized box first, first four load first, then fade in |

---

## 3. Phase by phase

### Phase 0 — Audit (delivered earlier)

A written audit compared the website with the app and listed every difference with its likely effect, plus a
recommended order of work. It found the problems fixed below and the ones still open (section 5).

### Phase 1 — Placeholders and "keep what is on screen" (My Journey, Home, course page, Explore, Kids Wall)

**The problem:** every request turned the whole page into a spinner, including when the child merely
returned to the browser tab. The course page also asked for two things one after the other that did not
depend on each other, and error screens had no way to recover.

**What was done**

- **My Journey** keeps the last list on screen and refreshes behind it. It refreshes when the tab is focused
  again, but only if the list is more than 30 seconds old, and never blanks.
- **Placeholders in the real layout** replace spinners on My Journey, the course page, Home, Explore, the
  video lists, the replays row and the Kids Wall. They appear only on a first visit, and only if loading
  takes longer than a fraction of a second, so a fast answer never flashes a grey screen.
- **Text that never changes stays on screen** from the first moment (titles, labels, icons). Only values that
  come from the server hold a small placeholder.
- **The course page loads its two pieces at the same time**, so it opens as soon as the course itself
  arrives. The step number fills in when its list arrives, and if that list never arrives, the course still
  opens.
- **Home** no longer waits on a chain of requests. The child record, the next live class and the live-stream
  check start together, and the child record is requested once instead of up to three times.
- **Explore** loads each collection's list, progress and stars together instead of one after another, and each
  card fills in as its own data arrives. A wrong "0 stars" no longer flashes while the real total loads.
- **Kids Wall:** "No posts yet" no longer flashes before the feed has loaded, the feed no longer disappears
  while refreshing, and the share card no longer says "sharing is blocked" while the profile is still loading.
- **Errors:** a first-load failure shows the real server message with a **Try again** button. A failed refresh
  behind visible content is silent.
- **Privacy:** the saved copy lives in the browser's memory only, is kept separately for each child, and is
  erased on logout.

### Phase 2 — Pictures

**The problem:** every cover was a plain image, so the browser requested all of them at once (including the
ones far down the page), pictures popped in abruptly, and the same address-building code was copied into nine
places. Two pictures on Home were far larger than their display size (1.4 MB and 305 kB, shown at under 100 px).

**What was done**

- **One picture component** used for all covers and thumbnails, with the same loading order as the app: the
  **first four pictures load immediately, the rest start one after another** (150 ms apart, capped at 1.5 s),
  at lower priority.
- **The box keeps its final size** while the picture loads, then the picture **fades in** (no fade for children
  whose device asks for reduced motion). A picture that fails to load leaves the box in place without breaking
  the page; a picture the browser already has appears at once.
- **A page counts its pictures from the top**, so lower ones wait for those above. On a course page the order
  is: cover, books, videos, chants, audio, the same order as on screen.
- **Nine copies of the same code became one.** A future picture fix is now made once.
- **Home pictures shrunk** from 1.4 MB and 305 kB to **10 kB and 13 kB** (WebP), still sharp on high-density
  screens.
- A guard test now fails if anyone adds a bundled picture over 150 kB.

### Phase 3 — Saved copies and starting early

**Part 1: the course page**

- **Course cache.** Each course the child opens is remembered for the session. Reopening it shows it instantly,
  and it refreshes quietly. Two requests for the same course at the same moment become one.
- **Start on press.** When a card is pressed (mouse or finger) the course request and its cover start before
  the page even changes. On a desktop, resting the mouse on a card for a moment does the same; moving quickly
  across cards, touching, or pressing a locked card starts nothing.
- **Home warms My Journey.** Once Home has its own data it quietly starts the My Journey list and its first
  covers, so My Journey often opens already filled.
- **Safe with locked courses.** A course that turns out to be locked is never kept, and an old copy of a
  now-locked course is thrown away, so the child sees the locked message and never stale content.
- **Silent background refreshes.** After finishing a book, recording or chant, the course refreshes
  behind the scenes; if that fails, there is no popup.

**Part 2: Home, Explore and the Kids Wall**

The same "show the last answer at once, refresh quietly" behaviour now applies to:

- the Home name and counts;
- the six Explore collection cards (each remembered on its own);
- every collection's video list, each video's watched state, and the star totals;
- both replay lists and their view counts;
- the Kids Wall feed, which stays correct when the child likes, stars, posts or deletes.

Behaviour that was deliberately designed:

- **Numbers never turn into zeros by accident.** If a refresh fails behind numbers already on screen, the
  numbers stay. Zeros only appear on a first visit, as the friendly default.
- **A failed first visit is not remembered**, so the next visit simply tries again.
- **Watched states are asked about once per visit**, and only for videos that are new.
- **The Kids Wall share button is no longer locked while the feed refreshes**; only posting and deleting
  lock it.
- **Children never see each other's data.** Every saved copy is kept per child and emptied on logout.
- **Left uncached on purpose:** the live-class card on Home, because it shows who is live right now and a
  remembered answer could be wrong.

---

## 4. How it was verified

| Check | Result |
|---|---|
| Whole website test suite | **43 files, 419 tests, all passing** (35 files, 257 tests after Phase 2; 37 files, 320 tests after Phase 3 part 1) |
| Production build | Compiles |
| Tests on the real pages | Every page above is tested as the child would use it: first visit, return visit, slow answer, failed answer, retry, tab focus, another child signing in |
| "First frame" tests | Tests that read the very first screen drawn, to catch one-frame flashes of a spinner, an old error or an empty message |
| Break-it checks | The new code was deliberately broken in more than 30 different ways (for example: a touch counted as a mouse, a locked course kept, a failed refresh showing an error, the cache shared between children, a like not kept). Each break was caught by the expected test, then the code was restored. Three were missed at first; tests were added for them until every one was caught |

**Not done:** no timing against the live server, no Lighthouse run, and no click-through in a real browser
(the child pages need a login). The effects described are what the code does, proven by tests, not measured
seconds.

---

## 5. Known limits of Phases 1 to 3

These are known, deliberate limits, not surprises:

1. **Nothing survives a page reload.** The saved copies live in memory, like the app's session cache. A full
   reload or a new browser session starts empty and shows placeholders once.
2. **The website is still one large file** (about 2,059 kB, 514 kB compressed). A child still downloads the
   admin, parent and teacher code. The file grew by about 11 kB (0.5 %) across Phases 1 to 3 for the new caches.
3. **Pictures are not smaller.** Covers are still sent at the size they were uploaded. Serving smaller copies
   or using a CDN needs the real production picture sizes.
4. **Not cached yet:** the live-class card on Home (by design), Profile and Printables.
5. **Videos and audio are not cached by these changes.** Only pictures are cached, by the browser.
6. **The book player is untouched.** Its "preload" still waits for the whole book (audit items D1–D4); it is outside
   these three phases.
7. **Two existing problems were found and left alone** because they are separate fixes:
   - the live-class card can crash when a teacher or admin account opens a child's Home page;
   - the replays page asks for a star total it never draws (harmless; it is now cached).

---

## 6. Quick acceptance checklist (about 15 minutes)

Use a child account. Open the browser's developer tools (F12) → Network tab for steps 1 and 7.

1. **Tab switch:** open My Journey, switch to another tab for a minute, return. The page must stay as it was,
   with no spinner.
2. **Second visit:** open a course, go back, open it again. It must appear at once, with no grey placeholder.
3. **Start on press:** on My Journey press a course card. The course request should start on the press, before
   the page changes, and there should be only one request for that course.
4. **Home warms the journey:** from Home wait a second, then open My Journey. The list and first covers should
   already be there.
5. **Pages remember:** Home → Explore → Home; Explore → a collection → back; open the Kids Wall, like a post,
   leave and return. In each case the second visit must show the content at once, and the like must still be
   there.
6. **Slow connection:** set throttling to "Slow 3G", reload My Journey. Expect grey card shapes in the real
   layout, the first four covers arriving first, then the others one by one, and no jumping.
7. **Offline after a visit:** visit each page once, then switch the network to Offline and visit them again.
   The last content must show, with no error and no popup.
8. **Locked course:** lock a course in the admin screen, then open it from My Journey. It must show the locked
   message, not an old copy.
9. **Two children:** sign out and sign in as another child. Nothing from the first child may show.

---

## Appendix — Where the work lives (for developers)

| Area | Main files (under `frontend/src/`) |
|---|---|
| My Journey saved copy and shared requests | `store/slices/childJourneySlice.js` |
| Course saved copy | `store/slices/childModuleSlice.js` |
| Generic saved copy for Home, Explore, Kids Wall | `store/slices/childPageCacheSlice.js`, `hooks/useCachedLoad.js` |
| Start on press / hover | `hooks/useCoursePrefetch.js`, `components/child/journey/ChildJourneyCards.jsx` |
| Placeholders and error screen | `components/child/common/ChildSkeleton.jsx`, `ChildLoadError.jsx` and the per-page skeletons |
| Picture loading | `utils/remoteImage.js`, `components/child/common/RemoteImage.jsx`, `utils/coverImageUrl.js` |
| Pages | `pages/child/ChildHome.jsx`, `ChildJourney.jsx`, `ChildJourneyModule.jsx`, `ChildExploreVideos.jsx`, `ChildKidsWall.jsx` |
| Per-phase notes with the full test lists | `docs/WEB_CHILD_PHASE1_JOURNEY_LOADING.md`, `WEB_CHILD_PHASE2_PICTURES.md`, `WEB_CHILD_PHASE3_PREFETCH.md` |
| Original audit | `docs/WEB_CHILD_PERFORMANCE_AUDIT.md` |

Run the tests with `npm test` in `frontend/`.

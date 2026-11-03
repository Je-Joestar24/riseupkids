# Web child side — Phase 2: pictures

Second step of `WEB_CHILD_PERFORMANCE_AUDIT.md`. It brings the website's picture loading in line with what
the app does (`IMAGE_LOADING_OPTIMIZATION.md`). It fixes audit findings C1, C2 and A3.

## Before

- Every cover was a plain image tag. When a page opened, the browser asked for **all** of them at once,
  including the ones far below the screen, and they competed with each other and with the page's own data.
- Nothing marked which pictures mattered most, so the ones at the top were not first to arrive.
- A picture appeared abruptly when it finished, on a bare background.
- The same "make a full address from a cover path" code was copied into **nine** places.
- The Home page shipped two large pictures that are shown very small: `live.png` was **1.4 MB** (1024 px,
  shown at 48–80 px) and `sample.png` **305 kB** (500 px, shown at 88 px).

## What changed

| Piece | File |
|---|---|
| Loading order (same numbers as the app) | `src/utils/remoteImage.js` |
| One picture component for covers and thumbnails | `src/components/child/common/RemoteImage.jsx` |
| The one cover-address helper, now used everywhere | `src/utils/coverImageUrl.js` (already existed) |
| Two Home pictures resized and converted | `src/assets/images/live.webp`, `sample.webp` |

**Order.** The first four pictures on a page load at once, with high priority. Later ones start one after
another, 150 ms apart (never more than 1.5 s), with low priority, and ask the browser to load them lazily.

**Position across a page.** A page counts its pictures from the top, so the ones further down wait for the
ones above them:

| Page | Order of counting |
|---|---|
| My Journey | the cards, top to bottom |
| Course page | the cover (0), then books, videos, chants, audio — the order they appear on the page |
| Explore video list, replay list, replay row | the cards, in order |
| Kids Wall | the posts' photos, in order |

**No jumping.** A picture draws nothing until it has loaded, so the box around it (which already has its final
size) shows through, then the picture fades in over 150 ms (no fade when the device asks for reduced motion).
A picture that fails to load simply leaves the box in place. A picture the browser already had is shown at
once, even if the browser never sends the load event.

**Explore covers.** `ExploreCoverImage` still takes the shape of a wide picture, but the measured shape is now
tied to the picture it was measured from, so a new picture in the same place starts at 4:3 again instead of
keeping the old one's shape.

**One address helper.** The copies of the cover-address code in the Journey cards, the four module cards,
Kids Wall and the course, explore and journey hooks were deleted; they all use `utils/coverImageUrl.js`. A
Kids Wall photo with no address now returns nothing instead of throwing.

**Home pictures.** `live.webp` is 10 kB (240 px) and `sample.webp` 13 kB (256 px), about three times the size
they are shown at, so they stay sharp on high-density screens. The old PNGs were removed.

## What this does not do

- It does not shrink the covers the backend sends. They arrive at their uploaded size. Serving smaller copies
  or a CDN is the next step, as for the app, and needs the production cover sizes.
- Pictures are not prefetched yet (the app prefetches the first covers when the list arrives and a course's
  cover when it is opened). That is Phase 3.
- Not changed: the printable thumbnails, the live-class card cover on Home, the photo preview when sharing to
  the Kids Wall, and the admin screens.

## Tests

- `src/utils/remoteImage.test.js` (5) — the order, the 150 ms steps, the 1.5 s cap, odd positions.
- `src/components/child/common/RemoteImage.test.jsx` (15) — first pictures at once and high priority, later
  ones wait their turn and load lazily, the cap, no timer left behind, invisible until loaded then fades in,
  stays hidden on error, restarts on a new picture, a cached picture, `onLoad`/`imgRef`, no address.
- `src/components/child/explore/ExploreCoverImage.test.jsx` (7) — shape of wide pictures, reset for a new
  picture, a cached picture, position passed on, no picture.
- Page tests, on the real pages: `ChildJourney` (4: first four at once, later ones one by one, box kept and
  invisible until loaded, no cover), `ChildJourneyModule` (3: cover first, offsets cover→books→videos→chants→
  audio, no gap for a missing section), `ChildKidsWall` (3: order, file path and web address, no photo),
  `ChildExploreVideos` (2: order, standard shape).
- `src/assets/images.test.js` (19) — every bundled picture is under 150 kB; the Home pictures stay small WebP.
- Broken on purpose to confirm the tests catch it: cards forgetting their position, the page giving the
  videos the wrong offset, the explore cover keeping an old shape, and ignoring an already-loaded picture. Each
  failed the expected test; the code was restored.
- Whole web suite: 35 files, 257 tests pass. `vite build` compiles (the script is 2,055.96 kB, unchanged by
  this phase; the two WebP files are emitted at 10 kB and 13 kB).

Run with `npm test` in `frontend/`.

## Check by hand

1. Throttle to Slow 3G, open My Journey. The first four covers should come in first; the rest follow one by
   one. Cover boxes are grey at their final size, and nothing moves when a picture arrives.
2. Open a course. The big cover should load first, then the books, videos, chants and audio from the top down.
3. Open Explore → a collection, and the Kids Wall. Same behaviour.
4. Open Home. The avatar and the live-class icon should look as before, sharp on a high-density screen.
5. Reload My Journey: pictures already in the browser should appear at once without a fade-in delay.

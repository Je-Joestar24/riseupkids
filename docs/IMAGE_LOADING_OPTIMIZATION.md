# Image loading: My Journey covers and module thumbnails

The covers on My Journey and the thumbnails inside a module (videos, books, chants, audio) came from
the backend's `/uploads` folder, and were slow on first load. Three things made it worse:

1. **Everything at once.** When the course list arrived, the app started downloading *every* cover
   immediately, and each card requested its own picture again. On a slow server they competed with each
   other and with the page's own data, so the pictures at the top were not the first to appear.
2. **Weak caching on the phone.** Pictures were drawn with React Native's plain `Image`, with no
   control over the memory or disk cache and no placeholder while loading.
3. **No cache lifetime on the server.** `/uploads` answered every picture with `max-age=0`, so the
   phone asked the server again for every cover each time a page opened.

## What changed

| Piece | File |
|---|---|
| Loading order and prefetch | `app/utils/remoteImage.ts` |
| Cached, fading, ordered image | `app/components/common/remote-image.tsx` |
| Covers on My Journey | `app/components/child/journey/journey-cards.tsx` |
| Course cover and thumbnails inside a module | `app/components/child/module/*` (header, videos, books, chants, audio) |
| Prefetch when the list arrives / a course is opened | `app/store/journeyStore.ts`, `app/store/moduleStore.ts` |
| Long cache lifetime for pictures | `backend/middleware/uploadsStatic.js`, used by `backend/server.js` |

- **Order.** The first four pictures on a page (`ABOVE_THE_FOLD_IMAGES`) load immediately with high
  priority. Later ones start one after another, 150 ms apart (never more than 1.5 s), with low
  priority. A module page counts across its sections — course cover, then videos, then books, chants and
  audio — so the pictures further down the page wait for the ones at the top.
- **Placeholder.** Until a picture starts, a plain box of the same size is shown, so nothing jumps.
- **Cache.** Pictures are drawn with `expo-image` using the memory and disk cache, with a short fade.
  The same cache is used by the prefetch, so a prefetched picture appears at once. (Before, the prefetch
  used a different cache from the one the pictures were drawn from.)
- **Prefetch.** Only the first four covers are fetched when the list arrives, and a course's cover is
  fetched when it is opened. Fetching all of them together was the main cause of the slow first load.
- **Server.** Pictures (`png`, `jpg`, `jpeg`, `webp`, `gif`) under `/uploads` are cached for 30 days.
  Uploaded files get a unique timestamped name, so a picture at an address never changes: replacing a
  cover creates a new address. Other files keep the default behaviour, and the validator (`ETag`) is
  still sent, so an expired copy is refreshed with a cheap 304.

## What this does not do

- It does not make the server faster or shrink the pictures. The backend still sends each cover at its
  uploaded size. If the production covers are large, the next step is to serve smaller copies (thumbnails)
  or put a CDN (for example CloudFront) in front of `/uploads`; ask for the production cover sizes first.
- The Explore tab's cards and the videos, books and audio *inside* a content item load their media
  through their own code, which was not changed.
- The first four pictures per page load immediately; if a module has more than four above the fold on a
  tall phone, raise `ABOVE_THE_FOLD_IMAGES`.

## Tests

- `app/__tests__/utils/remoteImage.test.ts` — the loading order, the delay cap, and that prefetch fetches
  only the first few, skips missing links and ignores failures.
- `app/__tests__/components/remoteImage.e2e.test.tsx` — on the real components: the first pictures appear
  at once with the phone cache and high priority, later ones wait with a same-size box then load with low
  priority, no timer is left behind, My Journey loads the first four covers then the rest, opening a
  course fetches only its cover, and the four module sections load in order across the page.
- `app/__tests__/store/journeyCoverPrefetch.test.ts` — only the first covers are fetched when the courses
  arrive, relative paths become full addresses, and a failed prefetch never loses the courses.
- `backend/tests/uploadsStatic.test.js` — pictures get the 30-day cache lifetime and a validator; PDFs,
  audio, video and text keep the default; a missing file is still a 404.

Run them with `npm test` from `app/` and `npx jest tests/uploadsStatic.test.js` from `backend/`.

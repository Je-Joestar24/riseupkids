# Replay stars (course videos and built-in CMS books)

How stars work for a book or a video, from the first read to the replays.

## 1. The required reads / watches (unchanged)

A book (or a course video) has a **total number of stars** and a **number of times it must be read / watched**
(`requiredReadingCount` for books, `requiredWatchCount` for videos; 5 if not set). Every finished read / watch pays
a share of the total: the total divided by the number of times, whole numbers only, and the remainder goes on the
last one. Example: 53 stars over 5 reads pays 10, 10, 10, 10, 13. See `utils/contentStarDistribution.util.js`.

## 2. Replays (new)

Once the last required read / watch is done (so the whole total is earned), each further full read / watch is a
**replay**:

- **2 stars** per replay, and at most **5 replays** per book or video and child, so **10 stars at most**. After the
  fifth, a replay earns nothing.
- Two submissions within **5 seconds** are one replay (the same guard the first reads / watches have).
- The numbers live in `backend/utils/contentReplayStars.util.js` (`REPLAY_STARS`, `MAX_REPLAYS`), and the rule is
  applied by `backend/services/contentReplayStars.service.js`.
- Each replay is a `StarEarning` with `metadata.replay: true` and its `replayNumber`, so the count is just how many
  of them exist for that child and that book / video. Nothing else is stored.

Where it applies:

| Content | Where | Applies to |
|---|---|---|
| Course videos | `services/videoWatch.service.js` (`markVideoWatched`) | every video that has a watch count |
| Books | `controllers/courseProgress.controller.js` (`submitBookCompletion`) | **built-in (CMS) books only** (`packageType: 'builtin'`); SCORM and HTML5 books are unchanged |

The replies carry `isReplay`, `replayNumber`, `replaysLeft` and `maxReplays` next to the usual `starsToAward`, so the
app shows the same "+2" reward as for any other stars.

Not changed: **Explore videos** (all their stars come on the first watch, and the "Replays" category pays none).

## 3. A book only counts when it is read to the last page (built-in books)

The app (`components/child/common/cms-player-modal.tsx`) tracks the furthest page the child has been on and sends
`reachedEnd` with the completion. Closing the book before the last page earns nothing: the app does not send it
(`utils/cmsBookReadComplete.ts`), and the server refuses it with `400 BOOK_NOT_FINISHED` when `reachedEnd` is
explicitly `false`. A missing value is accepted, so older app versions keep working (they just do not get the
stricter rule).

On the last page the usual rule still applies: at least 75% of the interactive pages right, or full marks, or none
to answer, or the home button.

## Tests

`backend/tests/contentReplayStars.util.test.js` (the numbers), `contentReplayStars.service.test.js` (real
in-memory database: 2 stars, the limit, no double payment, kept apart per child, per book and per type),
`replayStarsFlows.e2e.test.js` (videos and books through the real controller and service), and
`app/__tests__/utils/cmsBookReadComplete.test.ts` (the last-page rule).

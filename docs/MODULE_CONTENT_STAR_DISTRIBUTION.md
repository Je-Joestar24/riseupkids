# Module Content Star Distribution

This document describes how stars are awarded for **books** and **videos** inside course modules after the per-session distribution update.

## Summary

Previously, all stars for a book or video were awarded in one lump sum when the child finished the required number of readings/watches (default: 5).

Now, stars are **split across each reading or watch**. Any remainder from integer division is added to the **final session** so totals stay whole numbers with no fractions.

### Example

| Total stars | Required sessions | Per session |
|-------------|-------------------|-------------|
| 50          | 5                 | 10, 10, 10, 10, 10 |
| 53          | 5                 | 10, 10, 10, 10, **13** |
| 7           | 3                 | 2, 2, **3** |

Formula:

```
base = floor(totalStars / requiredSessions)
remainder = totalStars - (base * requiredSessions)

Sessions 1 .. (N-1) → base stars each
Session N (final)   → base + remainder
```

---

## Implementation

### Core utility

**File:** `backend/utils/contentStarDistribution.util.js`

| Export | Purpose |
|--------|---------|
| `getStarsForSession(sessionNumber, totalStars, requiredSessions)` | Stars for one session |
| `getDistributionPlan(totalStars, requiredSessions)` | Full array for all sessions |
| `getTotalStarsForSessions(totalStars, requiredSessions)` | Validates sum equals total |

### Books (module readings)

**Endpoint:** `POST /api/course-progress/:courseId/child/:childId/book/:bookId/complete`

**Controller:** `backend/controllers/courseProgress.controller.js` → `submitBookCompletion`

**Flow:**

1. Validate reading completion (SCORM / HTML5 / built-in rules unchanged).
2. Create a `BookReading` record (with 5-second duplicate guard).
3. On each new reading (up to `requiredReadingCount`):
   - Compute stars via `getStarsForSession(readingNumber, totalStarsAwarded, requiredReadingCount)`.
   - Save `starsEarned` on the `BookReading` document.
   - Create a `StarEarning` with `metadata.readingNumber`.
   - Call `ChildStats.addStars()`.
4. When `readingCount >= requiredReadingCount`, set `CourseProgress.contentProgress[].scormProgress.completion.starsAwarded = true` (module completion gate unchanged).

**Book model fields:**

| Field | Default | Role |
|-------|---------|------|
| `totalStarsAwarded` | 50 | Total stars across all readings |
| `requiredReadingCount` | 5 | Required completions |
| `starsPerReading` | 10 | Admin display hint (derived from even split) |

**API response (`data`):**

| Field | Meaning |
|-------|---------|
| `starsToAward` | Stars earned **this reading** |
| `starsAwarded` | `true` if this request earned stars |
| `starsForNextReading` | Stars available on the next reading (0 if done) |
| `totalStarsAvailable` | Full book star pool |
| `requirementMet` | All required readings completed |

### Videos (module watches)

**Endpoint:** `POST /api/video-watch/:videoId/child/:childId`

**Service:** `backend/services/videoWatch.service.js` → `markVideoWatched`

**Flow:**

1. Increment `VideoWatch.watchCount` (with 5-second duplicate guard).
2. On each new watch (up to `requiredWatchCount`):
   - Compute stars via `getStarsForSession(watchNumber, starsAwarded, requiredWatchCount)`.
   - Create a `StarEarning` with `metadata.watchNumber`.
   - Call `ChildStats.addStars()`.
3. When `watchCount >= requiredWatchCount`, set `VideoWatch.starsAwarded = true` (module completion gate unchanged).

**Media model fields:**

| Field | Default | Role |
|-------|---------|------|
| `starsAwarded` | 10 | Total stars across all watches |
| `requiredWatchCount` | 5 | Required completions |

**API response:**

| Field | Meaning |
|-------|---------|
| `starsToAward` / `starsEarnedThisSession` | Stars earned **this watch** |
| `starsAwarded` | `true` if this request earned stars |
| `allStarsAwarded` | All required watches done |
| `starsForNextSession` | Stars on the next watch (0 if done) |
| `totalStarsAvailable` | Full video star pool |

### Module completion gates (unchanged)

**File:** `backend/services/courseProgress.services.js` → `updateContentProgress`

- **Books:** marked complete only when `readingCount >= requiredReadingCount`.
- **Videos:** marked complete only when `VideoWatch.starsAwarded === true`.

---

## Legacy data

If a child already received a **single lump-sum** `StarEarning` (no `metadata.readingNumber` / `metadata.watchNumber`), the system skips new per-session awards for that content to avoid double-crediting.

---

## Frontend / app behaviour

Clients should treat `starsToAward` as **this session’s** stars (not the full content total).

### Web — reactive header (no stats API refetch)

**Utility:** `frontend/src/utils/childStatsSync.js`

| Function | Purpose |
|----------|---------|
| `applyStarRewardFromCompletion()` | Updates local state after book/video completion |
| `syncChildTotalStars()` | Writes to sessionStorage + Redux + dispatches event |
| `getChildTotalStars()` | Reads current stars from sessionStorage |

**Header:** `frontend/src/components/common/ChilHeader.jsx` listens to Redux `childProfiles` and the `childStatsUpdated` custom event for instant updates.

**Completion handlers that call `applyStarRewardFromCompletion`:**

- `ScormPlayer.jsx` (SCORM books)
- `html5Player.jsx` (HTML5 books)
- `VideoPlayerModal.jsx` (module videos)
- `ChildModuleLibrary.jsx` (CMS built-in books)
- `exploreVideoWatchHook.js` (explore videos)

### Mobile app — reactive header (no stats API refetch)

**Utility:** `app/utils/childStatsSync.ts`

**Store action:** `exploreStore.applyChildStarReward(childId, { starsToAward, totalStars })`

**Header:** `app/components/child/common/header-nav.tsx` reads `childTotalStars[childId]` from Zustand.

**Wired on success:**

- `video-player-modal.tsx` — module videos
- `html5-modal.tsx` — HTML5 books
- `module.tsx` — CMS built-in books
- `exploreStore.markExploreVideoWatched` — explore videos
- `chant-modal.tsx` — chants

---

## Tests

Run from `backend/`:

```bash
npm test -- contentStarDistribution.util.test.js moduleContentStarDistribution.e2e.test.js
```

| Test file | Coverage |
|-----------|----------|
| `tests/contentStarDistribution.util.test.js` | Distribution math (even, odd, edge cases) |
| `tests/moduleContentStarDistribution.e2e.test.js` | Full book + video flows with mocked persistence |

---

## Manual UI checklist (for you)

After automated tests pass, verify in the child module UI:

- [ ] Complete reading 1 of 5 → dialog shows partial stars (e.g. +10).
- [ ] Complete reading 5 of 5 → final reading shows any remainder (e.g. +13 for 53 total).
- [ ] Child header star total increases after **each** reading/watch, not only at the end.
- [ ] Book/video marked complete in module only after all required sessions.
- [ ] Replaying after all stars earned shows “already earned” (no extra stars).

---

## Files changed

| File | Change |
|------|--------|
| `backend/utils/contentStarDistribution.util.js` | New shared distribution logic |
| `backend/controllers/courseProgress.controller.js` | Per-reading star awards |
| `backend/services/videoWatch.service.js` | Per-watch star awards |
| `backend/services/bookReading.service.js` | Status includes next-session stars |
| `frontend/src/components/child/common/VideoPlayerModal.jsx` | Per-watch UI + progress update timing |
| `app/components/child/common/video-player-modal.tsx` | Same for mobile |
| `backend/tests/contentStarDistribution.util.test.js` | Unit tests |
| `backend/tests/moduleContentStarDistribution.e2e.test.js` | End-to-end flow tests |

---

*Last updated: July 2026*

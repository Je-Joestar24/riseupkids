# Plan: Faster Star / Score Reward After Playing

> **Status (July 2026):** Phase 1 (client perceived speed) and Phase 2 (backend unblock) are implemented. See tests below.

Goal: after a child finishes a book/video (or similar content), the **star reward UI and header total** should appear in under ~300–500ms perceived time, even on slow networks.

This plan covers **module books** (including built-in CMS), **module videos**, and the same patterns that apply to other completion endpoints that award stars.

---

## Implemented changes

### Backend

- `scheduleBadgeUpdate()` (`backend/utils/scheduleBadgeUpdate.util.js`) runs badge checks on the next event-loop turn so they never block the API response.
- Wired into book completion, module video watch, explore video watch, chants, and audio assignments.
- Removed redundant `ChildStats.save()` / `findById` round-trips after `addStars()` (which already persists).

### Clients

- Mobile CMS module: apply stars + open dialog **before** `updateContentProgress` / `fetchModuleDetails` (background via `runBackgroundAfterStarReward`).
- Mobile video player: show completion UI before module refresh.
- Web CMS library: apply stars + open dialog before non-blocking `fetchBookReadings`.

### Tests

```bash
# backend
npm test -- scheduleBadgeUpdate.util.test.js starRewardResponseTime.e2e.test.js moduleContentStarDistribution.e2e.test.js contentStarDistribution.util.test.js

# app
npm test -- bookCompletionStarReward.test.ts childStatsSync.test.ts
```

---

## Current behaviour (why it felt slow)


### Backend critical path — `POST .../book/:bookId/complete`

`backend/controllers/courseProgress.controller.js` → `submitBookCompletion` currently does many **sequential** Mongo operations, including:

1. Auth child lookup (parents)
2. `Book.findById`
3. `Course.findById`
4. `CourseProgress.findOne` (+ create/save if missing)
5. `BookReading.getCompletedReadingCount` (often more than once)
6. Duplicate guard `BookReading.findOne` (5s window)
7. `BookReading.create` + recount
8. Legacy / session `StarEarning.findOne` checks
9. `StarEarning.create` + `childStats.addStars` + `save`
10. **Extra** `ChildStats.findById` to re-read totals
11. **Blocking** `badgeCheck.updateBadges(childId)` (multiple badge queries)
12. Possible another `CourseProgress` load/save when requirement met
13. Final `ChildStats.findById` again for response

Video path (`videoWatch.service.js` → `awardStarsForWatchSession`) has a similar pattern: create earning → addStars → save → re-fetch stats → **await badge update**.

### Mobile client critical path — CMS built-in books

`app/app/child/[id]/module.tsx` → `handleCmsSessionComplete`:

```
submitBuiltinBookScore  →  updateContentProgress  →  fetchModuleDetails  →  then show stars / dialog
```

Stars are applied with `applyChildStarReward` only **after** those awaits. The completion dialog (home trigger) waits on the full chain.

### Web client

`ChildModuleLibrary.jsx` waits on `completeHtml5Book`, then applies stars locally. Module refresh (`fetchBookReadings`) runs in `finally` but still competes for attention; the reward still cannot show until the complete API returns.

### What already helps

- Header stars update **locally** via `applyStarRewardFromCompletion` / `applyChildStarReward` — **no stats refetch** once the complete response arrives (see `docs/MODULE_CONTENT_STAR_DISTRIBUTION.md`).

So the remaining latency is almost entirely: **API round-trip + heavy server work + optional extra client calls before showing UI**.

---

## Techniques to use (recommended stack)

| Technique | Layer | Impact | Risk |
|-----------|-------|--------|------|
| **Optimistic UI** | Client | Highest perceived gain | Need rollback on failure |
| **Respond first, side-effects later** | Backend | High | Badge/progress eventual consistency |
| **Shrink DB round-trips** | Backend | High | Careful transactions |
| **Don’t block reward UI on module refetch** | Client | Medium–high | Stale module dots briefly |
| **Prefetch / warm completion context** | Client | Medium | Extra work if user abandons |
| **Idempotent award key** | Backend | Enables safe retries | Schema/index work |
| **Background job for badges** | Backend | Medium | Needs queue or `setImmediate` |

---

## Phased plan

### Phase 0 — Measure (½–1 day)

Instrument timings (log or APM) for:

- `submitBookCompletion` total ms
- Sub-spans: validation lookups, BookReading write, StarEarning + addStars, badge check, response build
- Client: time from “session complete” → first paint of `+N stars`
- Client: time spent in `updateContentProgress` + `fetchModuleDetails` after complete

Success metric: p50 / p95 “play end → stars visible”.

---

### Phase 1 — Client perceived speed (1–2 days) — **do first**

**1. Optimistic star reveal**

- On valid local completion (score/progress already known), immediately:
  - Show completion dialog with **expected** session stars (from `starsForNextReading` cached earlier, or a lightweight `/preview` if needed).
  - Optimistically bump header via `applyChildStarReward`.
- Fire complete API in background; reconcile with `starsToAward` / `totalStars` from server.
- On failure: rollback header + show soft error (“Stars will sync when you’re back online”).

**2. Decouple UI from module refresh**

Change mobile CMS flow to:

```
complete API (or optimistic) → show stars NOW
background: updateContentProgress + fetchModuleDetails
```

Do **not** await module refresh before opening `cms-completion-dialog`.

**3. Parallelize independent client calls**

If both progress update and module refetch are still needed:

```ts
await Promise.all([updateContentProgress(...), /* optional lighter refresh */]);
```

Prefer a **targeted** reading-count patch over full `fetchModuleDetails` when only circles need updating.

**Applies to:** CMS books, HTML5, videos, chants (same pattern).

---

### Phase 2 — Backend: unblock the response (2–3 days)

**1. Move badge checks off the hot path**

Today:

```js
await badgeCheck.updateBadges(childId, { silent: false });
```

Change to one of:

- `setImmediate(() => badgeCheck.updateBadges(...))` (simplest), or
- Bull/Redis job `badge:recompute` (better for scale)

Stars response must **not** wait for badges.

**2. Remove redundant stats re-reads**

After `addStars` + `save`, trust in-memory `childStats.totalStars` (or return from `addStars`). Drop the extra `ChildStats.findById` round-trips unless verifying a race.

**3. Collapse sequential lookups**

- `Promise.all([Book.findById, Course.findById, ChildStats.getOrCreate, …])` where safe.
- Single aggregation / counted query instead of multiple `getCompletedReadingCount` calls.
- When awarding: one transaction or ordered writes: BookReading → StarEarning → ChildStats (avoid save → recount → save → re-fetch).

**4. Early return shape**

Return as soon as stars are persisted:

```json
{ "starsToAward": 10, "totalStars": 420, "readingCount": 2, ... }
```

Defer non-critical flags (badge hints, heavy progress mutation) when possible, or do progress flag update after `res.json` via `setImmediate` only if safe (prefer finishing progress write first if module gate depends on it — but don’t block on badges).

**Target:** complete endpoint p95 under ~200–400ms on warm DB (excluding network).

---

### Phase 3 — Robustness & polish (optional, 2–4 days)

- **Idempotency key** on complete (`Idempotency-Key` or hash of child+book+session window) so optimistic retries don’t double-award (complements 5s duplicate guard).
- Cache `starsForNextReading` on the client when opening the book so optimistic UI doesn’t guess.
- Lightweight `GET .../book/:bookId/star-preview` only if needed (avoid if Phase 1 can use cached next-session stars).
- Align video watch + explore watch with the same “respond fast / badges async” pattern.

---

## Out of scope / non-goals

- Changing how many stars are awarded per session (see `MODULE_CONTENT_STAR_DISTRIBUTION.md`).
- Star Cam vision/detect latency (different pipeline; Star Cam completion media is preload, not star math).
- Full offline-first sync product (optimistic UI is enough for v1).

---

## Suggested implementation order

1. Client: don’t await module refetch before reward UI  
2. Backend: async badges + drop redundant `findById`  
3. Backend: parallelize / reduce Mongo round-trips  
4. Client: full optimistic UI with rollback  
5. Measure again; only then consider jobs/queue infra  

---

## Acceptance criteria

- [ ] After finishing a CMS book, stars dialog / header update feels instant (no waiting on full module reload).
- [ ] Badge computation no longer appears on the complete-request timeline.
- [ ] No double-awarding under double-tap / retry (existing 5s guard + tests still pass).
- [ ] Existing distribution tests still green: `contentStarDistribution.util.test.js`, `moduleContentStarDistribution.e2e.test.js`.
- [ ] p95 “play end → stars visible” improved vs Phase 0 baseline (document numbers in PR).

---

## Key files

| Layer | Files |
|-------|--------|
| Book complete API | `backend/controllers/courseProgress.controller.js` |
| Video stars | `backend/services/videoWatch.service.js` |
| Badges | `backend/services/badgeCheck.service.js` |
| Mobile CMS complete UI | `app/app/child/[id]/module.tsx`, `cms-completion-dialog.tsx` |
| Mobile local stars | `app/utils/childStatsSync.ts`, `app/store/exploreStore.ts` |
| Web CMS complete | `frontend/src/components/child/module/ChildModuleLibrary.jsx` |
| Web local stars | `frontend/src/utils/childStatsSync.js` |

---

*Last updated: July 2026*

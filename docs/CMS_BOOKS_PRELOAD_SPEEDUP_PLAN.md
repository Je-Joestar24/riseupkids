# Plan: Speed Up CMS / Built-in Book Media Preloading

> **Status (July 2026):** Phase 1 + Phase 2 implemented on the mobile app (iOS + Android). Progressive pack preload, early start gate, Next disable until next-page media ready, and stream fallback timeout are live. Phase 3 (library prefetch) and Phase 4 (web durable cache) still open.

**Separate plan** focused only on making built-in CMS book media ready faster so children can start playing sooner.

Baseline behaviour is documented in [`PRELOAD_CURRENT_STATE.md`](./PRELOAD_CURRENT_STATE.md).  
Star Cam preload improvements are **out of scope** here (can mirror patterns later).

---

## Problem

Today the CMS player **blocks until every collected asset is downloaded** (images + audio + video), with fixed concurrency **4**.

That means:

- Large videos gate start even when page 1 only needs a cover image + short audio.
- Prefetch starts only when the modal opens (no library-level warm-up).
- Image decode warm (`RNImage.prefetch`) runs **on the download critical path**.
- Web has no durable `contentVersion` pack restore (mobile already does).

---

## Goals

| Goal | Target |
|------|--------|
| Time-to-first-playable-page | Start play when **page 1 (+ shared intro BGM)** is ready, not 100% of book |
| Smooth page-to-page | Child never lands on a blank/half-loaded page from mashing Next |
| Repeat open of same book | Near-instant when `contentVersion` pack is valid (mobile already; bring parity ideas to web) |
| First open of large books | Noticeably faster via priority queue + smarter concurrency |
| Reliability | Failed non-critical assets must not block play; retry in background |

Non-goals: changing authoring formats; forcing full offline of Bunny embeds (keep stream-only).

---

## Will progressive preload feel smooth?

**Yes — if we combine progressive download with a Next-step gate.**

Progressive preload alone is **not** enough for kids who tap Next nonstop. Without a gate they can skip ahead of the download queue and hit:

- Missing images/audio on interaction pages
- Black / stalled **demo / tutorial / reward** videos (the heavy assets)

So the design is:

1. Start as soon as **current page (P0)** is ready.
2. Always keep **next page (+ next video if upcoming)** at highest background priority.
3. **Disable Next** until that next page’s required media is ready (or safely streamable).

This matches how the player already disables Next during the initial full preload (`isPreloading || !hasNext` in `cms-player-pages.tsx`). We extend that idea from “whole book” to “next step only”.

---

## Required UX: disable Next until next content is ready

### Rule

| Control | Enabled when |
|---------|----------------|
| **Next** | `nextPageReady === true` (and not globally preloading start) |
| **Prev** | Usually always allowed for already-visited pages (media should already be in `uriMap`) |
| Home / close | Always allowed |

`nextPageReady` means **all required media for `currentIndex + 1`** is available locally (or stream-only / remote fallback approved for that asset).

### Required media by page type

| Page type | Must be ready before Next unlocks onto it |
|-----------|-------------------------------------------|
| Cover / content / interaction | Image(s) + page audio (if any) + option media used on that page |
| Intro | Background image + intro BGM (if used) |
| **Demo / tutorial** | **Video** (local cache **or** confirmed streamable remote) |
| **Reward** | **Reward video** (+ reward audio if present) |

Heavy demo/reward videos are the main reason for the gate — do **not** let the child advance onto those pages while the MP4 is still downloading.

### Button behaviour (kid-friendly)

- Visually disable Next (dim / pressed style already exists).
- Optional small spinner or “Getting ready…” near the Next button while waiting (not a full-screen block after book start).
- Ignore rapid taps while disabled (no queue of navigations).
- `accessibilityState={{ disabled: true }}` + clear label e.g. “Next, loading”.

### Anti-stuck safeguards

Never leave Next disabled forever:

1. Prefer finishing the next page’s download (bump that page to **P0-now** when child is on the previous page).
2. If wait exceeds a budget (e.g. **8–12s** on Wi‑Fi, longer on cellular) for a **video** page: allow Next and **play remote/stream** while continuing to cache in background.
3. If a non-critical image fails: allow Next and show fallback / retry quietly.
4. Log misses (`nextGateWaitMs`, page type, asset kind) for tuning.

### Lookahead preload (makes the gate almost invisible)

While the child is on page `N`:

| Priority | What to download |
|----------|------------------|
| Immediate | Remaining assets for page `N` if any |
| **Highest background** | **All required assets for page `N+1`** (especially if demo/reward video) |
| High | Page `N+2` images/audio |
| Lower | Rest of book |
| Lowest / streamed | Distant large videos not within 1–2 steps |

If `N+1` is a demo/reward video, **promote that video above other background work** so Next unlocks before the child finishes the current page.

---

## Techniques (what to use)

### A. Progressive / priority preload (highest impact)

**Idea:** ordered download queue instead of flat “all URLs equal”.

Suggested priority bands:

| Priority | Assets | Gate |
|----------|--------|------|
| P0 | Cover / first playable page image + its audio; intro BGM if used immediately | **Required to start** |
| P0-next | **Next page required media** (promote demo/reward video here) | **Required to enable Next** |
| P1 | Page after next (images/audio) | Background |
| P2 | Remaining images/audio | Background |
| P3 | Distant large MP4s | Background, byte-range head, or stream-until-cached |

**Start rule:** set `mediaReady` when P0 completes (or restores from pack), not when the whole queue finishes. Keep a quiet background worker for P0-next → P3.

**Navigate rule:** `goNext` only when `isNextPageMediaReady(currentIndex + 1, uriMap)`; otherwise keep Next disabled.

**UI:** change copy from “Loading all content…” → “Getting ready…” for initial start; after start use **disabled Next + light waiting affordance**, not a full-screen overlay for every page.

### B. Library-level / predictive prefetch

When the child opens a **module** (book list visible):

- Idle-prefetch the **first** book’s P0 assets (or the last-played book).
- On card press (before modal mount), kick off P0 immediately so overlap hides latency.

Mobile: reuse `preloadCmsBookPackAssets` with a `priorityFilter` or `maxPages` option.  
Web: call `preloadBookMedia` with a page slice / priority list.

### C. Bandwidth-aware concurrency

- Images/audio: concurrency **6–8** on Wi‑Fi, **3–4** on cellular.
- Videos: concurrency **1–2** so they don’t starve P0.
- Optionally detect `NetInfo` (app) / `navigator.connection` (web).

### D. Don’t block on decode warm

Move `warmImageDecode` / `RNImage.prefetch` to **fire-and-forget** after file is on disk. File URI is enough to start; decode can finish a frame later.

### E. Smarter video strategy

Already skip Bunny / MediaDelivery **embeds**. Extend:

- For direct MP4: optionally download only the **first N MB** (HTTP Range) for instant start, finish rest in background — or stream remote until cached.
- Prefer streaming playback for very large files when pack restore miss would exceed a time budget (e.g. > 3s).

### F. Pack / cache improvements

**Mobile (already strong):**

- Keep `contentVersion` packs.
- On partial restore, only enqueue missing keys (already via `assetNeedsDownload`).
- Increase `MAX_SAVED_BOOK_PACKS` only if disk allows; add LRU eviction by `savedAt`.
- Avoid re-hashing / re-`getInfoAsync` storms: batch existence checks.

**Web parity:**

- Persist URL → Cache Storage / IndexedDB keyed by `bookId + contentVersion`.
- Skip network when Cache hit matches version (today only session Map + browser HTTP cache).

### G. Payload / CDN hygiene (platform)

- Serve images as WebP/AVIF where possible; compress audio.
- Ensure CDN `Cache-Control` / immutable hashed URLs so HTTP cache hits are reliable.
- Manifest should list **stable asset keys** + `updatedAt` (already) so clients skip unchanged files.

### H. Parallelism with play

While page `N` plays:

- Preload page `N+1` at **highest** priority (video if demo/reward).
- Preload page `N+2` images/audio next.
- Cancel lower-priority downloads if user exits (already have cancel flag on mobile modal).
- Re-prioritize the queue when `currentIndex` changes (child moved faster or slower than expected).

---

## Phased plan

### Phase 1 — Quick wins (1–2 days)

1. **Fire-and-forget image warm** in `cmsBookMediaCache.ts` / `cms-player-media.ts` (don’t `await` decode).
2. **Raise small-asset concurrency** to 6; keep video workers at 1–2 (split queues).
3. **Change start gate** to “P0 ready” using first N pages from playable order (cover → intro → first interaction).
4. Update preload overlay copy; keep optional full % for debugging.

**Acceptance:** cold open of a multi-page book starts playing before all videos finish downloading.

### Phase 2 — Priority queue + Next gate (3–5 days) — **required for smoothness**

Extend pack preload:

```ts
preloadCmsBookPackAssets({
  bookId,
  contentVersion,
  assets,
  mode: 'progressive',
  startWhen: 'firstPageReady',
  focusPageIndex,               // current page — boosts N and N+1
  onProgress,
  onPlayable,                   // fires once P0 done
  onPageReady: (pageIndex) => void,
  concurrency: { imageAudio: 6, video: 1 },
})
```

Wire `cms-player-modal.tsx` / `cms-player-pages.tsx`:

- `onPlayable` → `setMediaReady(true)` + partial `uriMap`
- Derive `nextPageReady` from `uriMap` + page type helpers
- **Disable Next** when `!nextPageReady` (same pattern as today’s `isPreloading` disable)
- On index change, bump `focusPageIndex` so demo/reward video for `N+1` jumps the queue
- Timeout → stream fallback for stuck videos (see Anti-stuck safeguards)

Mirror page-sliced preload + next gate on web.

**Acceptance:**

- Rapid Next mashing cannot open a demo/reward page before its video is ready or stream-fallback approved.
- Normal pace: Next is enabled before the child finishes the current page in most cases (lookahead works).

### Phase 3 — Prefetch before open (2–3 days)

- Module books screen: prefetch P0 for visible / first book when idle.
- On book card press: start P0 immediately; modal consumes in-flight promise (dedupe via existing `inflight` maps).
- Cancel stale prefetches when navigating away.

**Acceptance:** second open in a session often hits pack/memory and skips the full overlay.

### Phase 4 — Web durable cache + video policy (optional, 3–5 days)

- Cache Storage keyed by `contentVersion`.
- Policy: if estimated remaining download > X seconds, play remote URL for that asset while caching.
- Optional Range pre-buffer for large MP4s.

---

## Metrics to track

| Metric | Where |
|--------|-------|
| Tap book → overlay dismiss / first page | Client timer |
| Bytes downloaded before first play | Sum of P0 sizes |
| Pack restore hit rate | `% restoredFromPack === true` |
| **Next gate wait time** | ms Next stayed disabled per page type |
| **Demo/reward gate hits** | How often Next blocked for video pages |
| Background failure count | `failed[]` length after full pass |
| Cancel rate | User closes during preload |
| Stream-fallback rate | Times Next unlocked via remote video fallback |

Log these in dev / sample in production (no PII).

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Child mashes Next faster than downloads | **Disable Next until next page ready**; promote `N+1` (esp. videos) |
| Demo/reward video still huge | Lookahead + video concurrency 1 focused on soonest video; stream fallback after budget |
| Page feels “stuck” on Next | Light waiting UI on button; timeout + stream; never infinite disable |
| Disk pressure from packs | Enforce LRU (`MAX_SAVED_BOOK_PACKS`); prefer cacheDirectory for huge videos |
| Race: uriMap updates mid-play | Immutable merge / versioned map ref |
| Web memory from Cache Storage | Cap per-book size; skip caching huge videos |

---

## Implementation touchpoints

| Area | Files |
|------|--------|
| Pack download | `app/services/cmsBookMediaCache.ts` |
| Pack index | `app/services/cmsBookPackStorage.ts` |
| Fallback URL preload | `app/components/child/common/cms-player-media.ts` |
| Player gate / overlay | `app/components/child/common/cms-player-modal.tsx` |
| **Next / Prev controls** | `app/components/child/common/cms-player-pages.tsx` (+ web CMS player pages) |
| **Page-ready helpers** | new util e.g. `isCmsPageMediaReady(page, uriMap)` |
| Manifest assets | `app/services/cmsBookMediaManifest.ts`, `backend/utils/cmsBookMediaManifest.util.js` |
| Web preload | `frontend/src/services/cmsBookPlayerService.js`, `frontend/src/utils/cmsPlayerMedia.js` |
| Module open triggers | `app/app/child/[id]/module.tsx`, `frontend/.../ChildModuleLibrary.jsx` |
| Tests | `app/__tests__/services/cmsBookPreload.e2e.test.ts`, page-ready / next-gate unit tests |

---

## Suggested order of delivery

1. Phase 1 quick wins (decode off critical path, split concurrency, P0 start gate)  
2. Phase 2 progressive API + **Next disable gate** + demo/reward lookahead  
3. Phase 3 library prefetch  
4. Phase 4 web cache / video policy if still needed after measuring  

---

## Acceptance checklist

- [x] Child can enter a CMS book once first-page media is ready, without waiting for all videos.
- [x] Background preload continues and later pages hit local URIs when ready.
- [x] **Next is disabled while the next page’s required media (esp. demo/reward video) is not ready.**
- [x] Rapid Next tapping does not skip into unloaded pages or queue multiple navigations.
- [x] Demo/tutorial/reward pages never show a black/stuck video because of spam-clicking Next.
- [x] Next cannot stay disabled forever (timeout → stream/fallback).
- [x] Pack restore with matching `contentVersion` still skips network (mobile).
- [x] Closing the player cancels in-flight downloads.
- [x] Existing pack/manifest tests updated for progressive mode; no regressions on full `mode: 'all'` (admin tester can keep full preload).
- [ ] Phase 3 library idle prefetch
- [ ] Phase 4 web durable Cache Storage

### Tests

```bash
cd app
npm test -- cmsBookPageMediaReady.test.ts cmsBookPreload.e2e.test.ts
```

---

*Last updated: July 2026*
# Current Preloading — Built-in / CMS Books & Star Cam

Audit of how media is preloaded today on **mobile (Expo)** and **web**, before play starts.

---

## Summary

| Area | Trigger | Storage | Concurrency | Skip re-download? | Blocks play? |
|------|---------|---------|-------------|-------------------|--------------|
| CMS books (mobile) | Player modal opens | Durable pack (`documentDirectory`) + fallback cache | **4** | Yes — `contentVersion` pack restore | **Yes** — until all assets ready |
| CMS books (web) | Open book (library / admin tester) | Browser fetch + in-memory Map | **4** | Soft only (session Map) | **Yes** — awaits preload promise |
| Star Cam (mobile) | Tap mission on map | Durable mission pack (`documentDirectory`) | **3** | Yes — `contentVersion` pack restore | **Yes** — overlay until ready |

Star Cam has no separate web child preload path equivalent to the mobile mission pack flow.

---

## 1. Built-in / CMS books

### Mobile app

**Entry:** `app/components/child/common/cms-player-modal.tsx`

When `open` becomes true and preload is not controlled externally:

1. Prefer **pack preload** if the book has a `mediaManifest` with assets:
   - `preloadCmsBookPackAssets()` in `app/services/cmsBookMediaCache.ts`
   - Pack index/manifest: `app/services/cmsBookPackStorage.ts`
2. Else fall back to URL list preload:
   - `collectCmsPlayerMediaUrls()` → `preloadCmsPlayerAssets()` in `app/components/child/common/cms-player-media.ts`
   - Files land under `FileSystem.cacheDirectory/cms-player-media/`

**Pack path behavior:**

- Loads saved pack when `contentVersion` matches → **instant restore**, no network.
- Otherwise downloads only assets that `assetNeedsDownload()` marks as missing/changed.
- Concurrency default: **4**.
- Images get an extra `RNImage.prefetch` decode warm after download.
- Bunny / MediaDelivery **embed** URLs are treated as stream-only (not fully downloaded).
- Progress overlay: “Loading all content…” until `mediaReady`.

**What gets collected:** page images, video, audio, intro BGM, guide/scene images, interaction option media, drop-zone audio.

### Web

**Entry:** `frontend/src/hooks/cmsBookPlayer.js` → `preloadBookMedia`  
**Service:** `frontend/src/services/cmsBookPlayerService.js` → `preloadUrlsWithConcurrency`  
**Utils:** `frontend/src/utils/cmsPlayerMedia.js` (`MAX_CMS_PRELOAD_CONCURRENCY = 4`)

- Collects the same URL set as the app.
- Dedupes via an in-memory `mediaPreloadCache` Map for the session.
- **No durable `contentVersion` pack** — reopen / hard refresh re-fetches unless the browser HTTP cache helps.
- Used from module library, admin book tester, courses UI.

### Strengths

- Mobile durable packs + version invalidation already exist.
- Incremental repair (only changed assets).
- Bounded concurrency avoids saturating the device.
- Stream-only embeds are not force-downloaded.

### Gaps (why it can still feel slow)

- Play waits for **100% of the book**, not “enough for page 1”.
- Large videos in the pack still download fully before start.
- Image decode warm runs **inline** on the download critical path.
- Web has no pack restore / contentVersion skip.
- Prefetch does **not** start while browsing the module list — only when opening the player.
- Concurrency is fixed (4), not bandwidth-aware.

---

## 2. Star Cam

### Mobile app

**Entry:** `app/components/child/starcamdynamicdisplay/StarCamDynamicDisplay.tsx`  
**Hook:** `app/hooks/useStarCamMissionPreload.ts`

On mission tap:

1. `fetchMissionStartFlow(childId, missionId)` (API).
2. `tryRestoreMissionPack(missionKey, contentVersion)` — if full restore, skip downloads and commit `uriMap`.
3. Else `preloadStarCamManifestAssets()` in `app/services/starCamMediaCache.ts`:
   - Mission-scoped folder under `documentDirectory/starcam-mission-media/`
   - Concurrency default: **3**
   - Retries (2) with backoff on download failure
4. `saveMissionPack()` then `commitPreloadedMission()`.
5. Overlay: `StarCamMissionPreloadOverlay` shows progress / errors.

**Manifest:** server `mediaManifest` + `contentVersion` from mission start payload; legacy fallback collects URLs from the flow object.

### Strengths

- Same pack + version pattern as CMS books.
- Preload is mission-scoped (good isolation / eviction).
- Cancel support while overlay is up.

### Gaps

- Starts only on tap (no background warm of “next likely” mission).
- Lower concurrency (3) than CMS books (4).
- Full mission media gate before entry (intro + practice + reward media together).
- API fetch for mission flow is serial before any disk restore check could short-circuit earlier with a stale hint (today restore needs `contentVersion` from the network response).

---

## 3. Related files (quick map)

| Concern | Files |
|---------|--------|
| CMS pack download | `app/services/cmsBookMediaCache.ts`, `cmsBookPackStorage.ts` |
| CMS URL fallback cache | `app/components/child/common/cms-player-media.ts` |
| CMS player gate | `app/components/child/common/cms-player-modal.tsx` |
| Star Cam preload | `app/hooks/useStarCamMissionPreload.ts`, `app/services/starCamMediaCache.ts`, `starCamMissionPackStorage.ts` |
| Web CMS preload | `frontend/src/services/cmsBookPlayerService.js`, `frontend/src/utils/cmsPlayerMedia.js` |
| Server manifests | `backend/utils/cmsBookMediaManifest.util.js`, `backend/utils/starCamMissionMediaManifest.util.js` |

---

## 4. Follow-on plans

| Doc | Purpose |
|-----|---------|
| [`STAR_REWARD_RESPONSE_TIME_PLAN.md`](./STAR_REWARD_RESPONSE_TIME_PLAN.md) | Make post-play star/score reward feel faster |
| [`CMS_BOOKS_PRELOAD_SPEEDUP_PLAN.md`](./CMS_BOOKS_PRELOAD_SPEEDUP_PLAN.md) | Separate plan to speed CMS book media preload |

---

*Last updated: July 2026*

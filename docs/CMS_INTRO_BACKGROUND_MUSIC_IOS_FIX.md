# Fix: CMS Intro Background Music Not Playing on iOS TestFlight

> **Status (July 2026):** Implemented in app  
> **Symptom:** Intro/cover looping BGM works on Android, silent on iOS TestFlight for all CMS books  
> **Scope:** `app/` CMS built-in book player intro page only

---

## Root cause

On iOS, opening the CMS player:

1. Locks landscape via `prepareCmsPlayerOrientation()` (`unlockAsync` + `lockAsync`)
2. That **resets `AVAudioSession`**
3. Intro BGM used `Audio.Sound.createAsync(..., { shouldPlay: true, isLooping: true })` **in parallel / before** the session was healthy again
4. Sound often loaded but never audibly played; errors were swallowed (“optional BGM”)
5. Android is far less sensitive to this race → appeared “Android only works”

Secondary gaps:

- No watchdog to detect “loaded but not playing”
- No `didJustFinish` replay fallback if native `isLooping` glitches on iOS
- No re-arm when audio mode is re-applied after orientation

---

## Fix

| Piece | Change |
|-------|--------|
| `cmsPlaybackAudio.ts` | Epoch after orientation; settle/watchdog constants; `shouldStart…` / `resolveCmsIntro…StatusAction` helpers |
| `cmsIntroBackgroundMusic.ts` | Dedicated start/stop: settle (iOS) → audio mode → create (`shouldPlay: false`) → `playAsync` → watchdog retry → status loop replay |
| `cms-player-modal.tsx` | `prepareCmsPlaybackAudioAfterOrientation()` after landscape lock; pass `audioSessionEpoch` to intro; stop BGM on close |
| `CmsIntroPage` | Uses the service; restarts when URL / preload / epoch change |

---

## Tests

```bash
cd app
npm test -- cmsIntroBackgroundMusic.e2e.test.ts cmsPlaybackAudio.test.ts --no-coverage
```

E2E contracts cover:

- Gate: URL present + not preloading
- iOS settle ms vs Android 0
- Status actions: play / replay / retry_session
- Orientation prep bumps epoch + sets `playsInSilentModeIOS`
- Mocked `createAsync`: `shouldPlay: false`, then `playAsync`, watchdog retry when silent
- `didJustFinish` → `setPositionAsync(0)` + play (loop fallback)
- Stop unloads sound

---

## Manual QA (TestFlight)

1. Open any CMS book with intro BGM → music loops on cover without tapping the video/image  
2. Leave on intro 30s+ → still looping  
3. Tap Play / Next → music stops  
4. Re-open book → music starts again  
5. Silent switch ON → music still audible (`playsInSilentModeIOS`)  
6. Android regression: still works as before  

---

## Related

- Player shared audio mode: `app/utils/cmsPlaybackAudio.ts`
- Intro page: `app/components/child/common/cms-player-pages.tsx` (`CmsIntroPage`)
- Preload still includes intro BGM in start-gate / required media URLs

# Plan: Bunny Embed Watch-Only Player (App)

> **Status (July 2026):** Implemented in app — Module Access remains deferred until this is QA’d on device  
> **Scope:** React Native app (`app/`) child-facing Bunny Stream embeds  
> **Out of scope for MVP:** Admin Module Access; parent web Bunny iframe (optional follow-up)

---

## Goal

When a child opens a Bunny Stream embed video in the app they must:

1. **Watch only** — no touch interaction with the Bunny player UI (seek, pause, volume, Bunny fullscreen, AirPlay, settings, etc.)
2. **Not enter Bunny’s native fullscreen** (that path exposes rotate / native controls)
3. **Autoplay** as soon as the player opens / loads
4. See **clear errors + retry** if load/playback fails
5. Be covered by **automated tests** for URL/options + regression-safe behaviour

App-owned chrome stays usable: Close, our own Fullscreen (landscape card), and “I finished watching”.

---

## Problem (current)

| Issue | Where |
|-------|--------|
| Child can tap Bunny controls inside the WebView | `bunny-embed-player-modal.tsx`, `bunny-embed-webview.tsx` |
| `allowsFullscreenVideo: true` → native FS + rotate on iOS | Both WebView entry points |
| iOS unlocks orientation when native FS allowed | `bunny-embed-webview.tsx` `ScreenOrientation.unlockAsync` |
| Embed URL only forces `playsinline` — no `autoplay` / `disableIosPlayer` | `buildBunnyEmbedWebViewUrl` |
| Errors partial (onError/onHttpError); no retry | Modals / WebView |
| No dedicated unit/e2e coverage for Bunny embed URL builder | `app/__tests__` |

Upload videos already use `useNativeControls={false}` + `shouldPlay` in module player — Bunny should match that intent.

---

## Product rules

1. **Touch-blocker overlay** covers the WebView so all taps hit our layer, not Bunny.
2. **Native Bunny fullscreen disabled** (`allowsFullscreenVideo: false` + embed `disableIosPlayer=true`).
3. **Autoplay on open** via embed query `autoplay=true` + `preload=true` + WebView `mediaPlaybackRequiresUserAction: false`.
4. Prefer **sound on** for watch content (not muted). If a device blocks unmuted autoplay, inject a play attempt after load; show retry if still blocked.
5. **CMS background** embeds stay muted/loop via a separate URL preset; still non-interactive.
6. **Instruction / chant** Bunny embeds: watch-only + autoplay (no “use player controls” hint).

---

## Technical approach

### A. URL builder (`app/utils/bunnyExploreEmbed.ts`)

Extend `buildBunnyEmbedWebViewUrl(embedUrl, options?)`:

```ts
type BunnyEmbedPlaybackPreset = 'watchOnly' | 'backgroundLoop' | 'default';

interface BuildBunnyEmbedWebViewUrlOptions {
  preset?: BunnyEmbedPlaybackPreset;
  // optional overrides
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  preload?: boolean;
}
```

| Preset | Query params (always set / override) |
|--------|--------------------------------------|
| `watchOnly` (child module / explore) | `autoplay=true`, `preload=true`, `playsinline=true`, `disableIosPlayer=true`, `disableAirplay=true` |
| `backgroundLoop` (CMS bg) | `autoplay=true`, `muted=true`, `loop=true`, `preload=true`, `playsinline=true`, `disableIosPlayer=true` |
| `default` | Keep current minimal behaviour (`playsinline` only) — prefer migrating callers off this |

Invalid URLs still return trimmed string / callers validate with `looksLikeBunnyExploreEmbedUrl` first.

### B. Shared WebView (`bunny-embed-webview.tsx`)

New props:

| Prop | Default | Behaviour |
|------|---------|-----------|
| `interactionMode` | `'watchOnly'` | `'watchOnly'` = touch blocker + no native FS; `'interactive'` reserved (admin/dev only) |
| `playbackPreset` | `'watchOnly'` | Passed to URL builder |
| `onRetry` / retry UI | — | Show “Try again” when error; remount WebView via `key` / reload counter |
| `allowNativeFullscreen` | `false` for watchOnly | Force false in watch-only |

Also:

- Stop unlocking screen orientation for watch-only (remove rotate path).
- Handle `onError`, `onHttpError`, `onRenderProcessGone` (Android), invalid URL, missing Referer domain message.
- Optional `injectedJavaScript` after load: try `document.querySelector('video')?.play()` best-effort (cross-origin may limit; overlay + URL params remain primary).

### C. Explore modal (`bunny-embed-player-modal.tsx`)

- Use shared `BunnyEmbedWebView` (remove duplicated WebView props) **or** apply the same watch-only URL + overlay + `allowsFullscreenVideo: false`.
- Prefer shared component to avoid drift.
- Keep our Close / Fullscreen / Finish buttons outside the blocked layer.

### D. Module video modal (`video-player-modal.tsx`)

- Pass `interactionMode="watchOnly"` / `playbackPreset="watchOnly"` into `BunnyEmbedWebView`.

### E. CMS background + instruction

- Background: `playbackPreset="backgroundLoop"`, `interactionMode="watchOnly"`.
- Instruction Bunny: watch-only + autoplay; remove copy that tells kids to use Bunny controls.

---

## Error handling

| Failure | UX |
|---------|----|
| Invalid / missing embed URL | Static message: no URL available |
| WebView `onError` / `onHttpError` | Banner + **Try again** |
| Android render process crash | Same as load error + remount |
| Autoplay blocked | After load timeout (~3–5s) without progress, show “Tap Try again to play” (retry remounts with autoplay) |
| Referer / Allowed domains mismatch | Same load error; document Bunny dashboard must allow `BUNNY_EMBED_REFERER` host |

Never crash the modal; Close always works.

---

## Testing

### Automated (Jest) — ship with PR

File: `app/__tests__/utils/bunnyExploreEmbed.test.ts`

- `looksLikeBunnyExploreEmbedUrl` true/false cases (iframe + player hosts)
- `buildBunnyEmbedWebViewUrl` watchOnly sets expected params
- `buildBunnyEmbedWebViewUrl` backgroundLoop sets muted + loop
- Does not strip existing library query params unless overridden
- Invalid URL string falls back safely

File: `app/__tests__/utils/bunnyEmbedWatchOnly.e2e.test.ts` (logic e2e)

- Pure helpers: `shouldBlockBunnyTouch(interactionMode)`, `resolveBunnyWebViewFullscreenAllowed(...)`, `buildBunnyWatchOnlySource(...)`  
- Assert watch-only ⇒ touch blocked + native FS disallowed + autoplay URL  
- Assert interactive (if kept) ⇒ opposite  

Optional: `app/__tests__/components/bunnyEmbedWebView.props.test.ts` if we export `buildBunnyEmbedWebViewProps` assertions.

### Manual device QA (required before release)

| # | Step | Expect |
|---|------|--------|
| 1 | Open Explore Bunny video | Starts playing without tapping the video |
| 2 | Tap everywhere on video surface | No seek / pause / Bunny FS / AirPlay |
| 3 | Use app Fullscreen button | Landscape via **our** UI only; still no Bunny controls |
| 4 | Exit FS / Close | Portrait restored; no stuck landscape |
| 5 | Airplane mode then open | Error + Try again; after network, plays |
| 6 | Module Bunny video | Same as Explore |
| 7 | CMS page with Bunny bg | Loops muted; not tappable |
| 8 | iOS + Android preview builds | Both pass 1–7 |

### Commands

```bash
cd app
npm test -- bunnyExploreEmbed.test.ts bunnyEmbedWatchOnly.e2e.test.ts
```

---

## Files to touch

| Path | Change |
|------|--------|
| `docs/BUNNY_EMBED_WATCH_ONLY_PLAN.md` | This plan |
| `app/utils/bunnyExploreEmbed.ts` | Presets + params |
| `app/components/child/common/bunny-embed-webview.tsx` | Watch-only, errors, retry |
| `app/components/child/common/bunny-embed-player-modal.tsx` | Shared WebView / same rules |
| `app/components/child/common/video-player-modal.tsx` | Watch-only props |
| `app/components/child/common/cms-looping-background-video.tsx` | backgroundLoop preset |
| `app/components/child/common/instruction-video-player.tsx` | Watch-only; drop control hint for embed |
| `app/__tests__/utils/bunnyExploreEmbed.test.ts` | Unit tests |
| `app/__tests__/utils/bunnyEmbedWatchOnly.e2e.test.ts` | Behaviour contract tests |

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Unmuted autoplay blocked on some OS WebViews | `mediaPlaybackRequiresUserAction: false` + remount retry; last resort soft message |
| Cross-origin blocks injected play/CSS | Rely on URL params + touch overlay (reliable) |
| Bunny dashboard “Allowed domains” | Keep Referer header; document in config |
| Overlay blocks accessibility | Keep Close/Finish/Fullscreen outside; label video as non-interactive watch surface |

---

## Relation to Module Access

Client asked for this **before** implementing Admin Module Access (`docs/ADMIN_MODULE_ACCESS_CONTROL_PLAN.md`). Ship watch-only Bunny playback first; then resume Module Access Phase 1.

---

## Checklist

- [x] URL presets implemented + tested
- [x] Touch blocker on child Bunny WebViews
- [x] Native Bunny fullscreen / iOS player disabled
- [x] Autoplay on open
- [x] Error + retry UX
- [x] Explore + module + CMS bg + instruction wired
- [x] Jest unit + e2e contract tests green
- [ ] Manual iOS/Android QA checklist signed off
- [x] Mark this doc **Implemented** when done (code complete; device QA pending)

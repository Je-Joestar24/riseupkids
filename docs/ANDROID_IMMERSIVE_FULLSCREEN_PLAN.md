# Plan: Android Immersive Fullscreen (Game-like) on App Open

> **Status (July 2026):** Phase 1–3 implemented. App-wide Android immersive sticky fullscreen on launch + AppState resume; iOS unchanged; HTML5 exit restores immersive; header/footer use min Android edge insets.

**Goal:** On Android, enter Clash of Clans / Clash Royale–style immersive fullscreen as soon as the app opens (status bar + system navigation bar hidden). On iOS, leave behaviour unchanged — the app already feels edge-to-edge / full screen, and iOS does not offer the same immersive system-UI API.

This is a **React Native (Expo) mobile app** plan (`app/`). Web is out of scope.

---

## Problem

Today on Android:

- Status bar and gesture / 3-button navigation bar remain visible for most of the app.
- Immersive mode is only toggled inside the HTML5 book modal when entering landscape “fullscreen” (`html5-modal.tsx`).
- Child flows (home, modules, CMS player, Star Cam) do not get a game-like chrome-free canvas on cold start.

Kids apps benefit from maximum usable screen and fewer system chrome distractions. Android can do this with sticky immersive / system UI flags. iOS cannot (and should not) mirror the same behaviour.

---

## Goals

| Goal | Target |
|------|--------|
| Android cold start | Enter immersive sticky fullscreen automatically after app becomes ready |
| Android resume | Re-apply immersive when returning from background / other apps (OS may restore bars) |
| iOS | **No change** — never call immersive APIs; keep current StatusBar / SafeArea behaviour |
| UX feel | Game-like: bars hidden until user swipes from edge; bars auto-hide again (sticky) |
| Safe layout | UI still respects notches / cutouts / gesture insets where needed so taps are not under system gesture zones |
| RN / Expo | Works in **dev builds / EAS / `expo run:android`** (native module). Not Expo Go |

Non-goals:

- Forcing iOS “fullscreen” or hiding the iOS status bar app-wide
- Changing orientation locks globally (portrait remains default; landscape stays feature-specific)
- Removing SafeArea entirely (insets still matter for gesture nav and cutouts)
- Web / parent-admin frontend changes

---

## Platform rules (must keep)

### Android — do this

Use **immersive sticky** so:

1. Status bar is hidden.
2. Navigation bar (Back / Home / Recents or gesture pill) is hidden.
3. User can temporarily reveal bars with an edge swipe; they auto-hide again (same pattern as many games).

### iOS — do not do this

| Reason | Detail |
|--------|--------|
| Different system model | No equivalent of Android `SYSTEM_UI_FLAG_IMMERSIVE_STICKY` for hiding Home Indicator permanently in the same way |
| Already full-bleed enough | Notch / Dynamic Island + SafeArea already define the playable area; forcing status-bar hide app-wide fights Apple HIG and can look broken |
| Code path | All immersive helpers must early-return when `Platform.OS !== 'android'` |

---

## Current codebase state

### Already in place

| Piece | Location | Notes |
|-------|----------|--------|
| Dependency | `app/package.json` → `react-native-immersive-mode` | Native module; requires prebuild / custom native build |
| Helper | `app/utils/androidNavigationBar.ts` | `setImmersiveFullscreen(on)` → `FullSticky` / `Normal`; **no-op on iOS** and if module missing |
| Partial usage | `app/components/child/common/html5-modal.tsx` | Enables immersive only while HTML5 landscape fullscreen is on; disables on exit |
| Edge-to-edge | `app/app.json` → `android.edgeToEdgeEnabled: true` | Content can draw under system bars; complementary to immersive, not a replacement |
| Root chrome | `app/app/_layout.tsx` | `<StatusBar style="auto" />` still shown; **no** call to `setImmersiveFullscreen` on launch |

### Gap

Immersive is **opt-in per feature** (HTML5 modal), not **default for the whole Android session**. Opening the app does not automatically enter game-like fullscreen.

---

## Recommended approach (React Native)

Keep the existing helper; wire it once at the app root for Android only. Prefer one source of truth over scattering calls.

```
Cold start / AppState active (Android only)
        │
        ▼
 setImmersiveFullscreen(true)   // FullSticky via react-native-immersive-mode
        │
        ▼
 Optional: StatusBar.setHidden(true) on Android only
        │
        ▼
 Layouts keep SafeAreaInsets (bottom/top) so controls stay tappable
```

### Why stick with `react-native-immersive-mode`

- Already installed and wrapped.
- Maps cleanly to sticky immersive (game-like).
- Existing HTML5 modal already depends on it.

### Alternatives (not preferred unless helper fails on target OEMs)

| Option | Pros | Cons |
|--------|------|------|
| `expo-navigation-bar` + `expo-status-bar` | Expo-first APIs | Weaker “sticky immersive game” behaviour; more pieces to keep in sync |
| Pure `expo-system-ui` | Already a dependency | Does not fully replace immersive sticky nav-bar hide on all devices |
| Custom native `WindowInsetsController` | Modern Android API | Extra native code; duplicate of what the existing module does |

**Decision:** Phase 1 = enable existing helper globally on Android. Only reconsider alternatives if QA finds OEM devices that ignore `FullSticky`.

---

## Implementation plan

### Phase 1 — Auto immersive on Android launch (core)

1. **Root lifecycle hook** (preferred: small util + call from `app/app/_layout.tsx`, or a dedicated `useAndroidImmersiveFullscreen` hook):
   - On mount, if Android → `setImmersiveFullscreen(true)`.
   - Subscribe to `AppState`: when state becomes `'active'`, re-apply immersive (bars often reappear after leaving the app, notifications, permission dialogs, or keyboard).
   - Cleanup: optional restore to `Normal` on unmount (usually not needed for root layout).

2. **Status bar (Android only):**
   - Hide via `StatusBar.setHidden(true)` from `react-native` **or** `<StatusBar hidden />` / `expo-status-bar` with platform check.
   - Do **not** hide status bar on iOS in the root layout.

3. **Keep helper platform-safe:**
   - Continue early-return in `androidNavigationBar.ts` when not Android.
   - Never import/call immersive paths from iOS-only screens in a way that assumes native behaviour.

4. **Dev-build requirement (document for QA):**
   - Must use `npx expo run:android` / EAS build.
   - Expo Go: helper no-ops (module not linked) — expected.

### Phase 2 — Layout / SafeArea audit (avoid clipped UI)

After bars are hidden, bottom insets may shrink to `0` on some devices while gesture areas still exist.

Audit high-traffic screens that use `SafeAreaView` / `useSafeAreaInsets`:

| Area | Files (examples) | Check |
|------|------------------|--------|
| Child footer nav | `footer-navigation.tsx` | Bottom padding still tappable above gesture zone |
| Headers | `header-nav.tsx`, module headers | Top content not under cutout / camera hole |
| CMS / modals | `cms-player-modal.tsx`, HTML5 modal | Immersive already toggled in HTML5 — avoid fighting root mode (see Phase 3) |
| Star Cam / mission | Star Cam screens with `SafeAreaView` | Camera UI still clear of edges |
| Parent flows | login, settings, select child | Acceptable padding; parents also get immersive on Android |

**Rule of thumb:** Prefer `useSafeAreaInsets()` with minimum padding fallbacks (e.g. keep at least ~8–16px bottom on Android gesture devices) rather than removing SafeArea.

### Phase 3 — Consistency with existing HTML5 fullscreen

Today HTML5 modal turns immersive **off** on exit. After Phase 1, exit must **re-enter** app immersive, not leave bars visible:

```
enter HTML5 landscape fullscreen → immersive on (already)
exit HTML5 fullscreen          → setImmersiveFullscreen(true) again  // restore app default
                                  (do NOT leave Normal)
```

Optionally introduce a tiny session helper:

- `enterAndroidImmersive()` / `restoreAndroidImmersiveDefault()`  
- Default for the whole app = **on**  
- Temporary “Normal” only if a future screen explicitly needs system bars (unlikely for kids app)

### Phase 4 — Optional polish

- Splash / first frame: call immersive as early as practical (after splash init) so bars don’t flash on first paint.
- Keyboard / soft input: re-apply immersive after keyboard dismiss if bars reappear on some OEMs.
- Logging (dev only): warn once if immersive module is null on Android (misconfigured native build).

---

## Suggested API surface (keep thin)

Existing:

```ts
// app/utils/androidNavigationBar.ts
setImmersiveFullscreen(on: boolean): void  // Android only; iOS no-op
```

Add (recommended):

```ts
// app/hooks/useAndroidImmersiveFullscreen.ts  (or utils)
useAndroidImmersiveFullscreen(): void
// - Platform.OS === 'android' only
// - enable on mount
// - re-enable on AppState 'active'
```

Wire once in root:

```tsx
// app/app/_layout.tsx
useAndroidImmersiveFullscreen(); // internal Platform check
```

iOS path never touches native immersive code beyond the existing no-op guard.

---

## Interaction with edge-to-edge

`android.edgeToEdgeEnabled: true` is already set. That lets content draw behind system bars when they are visible. Immersive **hides** those bars. Together:

1. Edge-to-edge = correct drawing when bars temporarily appear (edge swipe).
2. Immersive sticky = bars stay hidden most of the time (game feel).

Do not disable edge-to-edge for this feature.

---

## Testing checklist

### Android (required)

- [ ] Cold start: status + nav bars hidden without manual action
- [ ] Background → resume: immersive restored
- [ ] Swipe from edge: bars appear briefly, then hide again (sticky)
- [ ] Child home, module list, CMS player, Star Cam, HTML5 book: usable, no critical controls under gesture zone
- [ ] HTML5 enter/exit landscape fullscreen: still immersive after exit
- [ ] Permission dialogs / camera: after dismiss, immersive restored
- [ ] Gesture nav + 3-button nav devices both verified
- [ ] Confirmed on a real device (emulator alone is not enough for OEM quirks)

### iOS (regression only)

- [ ] Status bar / SafeArea unchanged vs current production behaviour
- [ ] No immersive module errors in logs
- [ ] CMS / Star Cam / video / HTML5 flows unchanged

### Build

- [ ] Works on custom native Android build
- [ ] Documented that Expo Go will not show immersive (expected)

---

## Rollout suggestion

1. Implement Phase 1 + Phase 3 (launch + HTML5 restore) behind no flag if product wants it for all Android users immediately — behaviour is additive and Android-only.
2. Run Phase 2 SafeArea pass on child primary flows before store release.
3. If any parent screen needs system bars (rare), use a screen-level `setImmersiveFullscreen(false)` with re-enable on blur — default remains immersive.

---

## Success criteria

| Criterion | Pass |
|-----------|------|
| Android open | App feels game-like fullscreen without user action |
| iOS | Pixel / chrome behaviour identical to today |
| Stability | Resume / modal / permission flows do not permanently restore system bars |
| Maintainability | Single root hook + existing `setImmersiveFullscreen`; no duplicated native logic |

---

## Out of scope / reminders

- Do **not** enable this on iOS.
- Do **not** rely on Expo Go for verification.
- Do **not** remove SafeArea globally; immersive ≠ “ignore insets”.
- Orientation: keep current portrait default; landscape remains feature-driven (HTML5 / specific players).

# iOS: Kids Wall is excluded

Kids Wall (child photo sharing — a child posts a photo, it is reviewed, then shown to other
families) is an **Android and Web feature only**. It is **not present on iOS**.

Google Play has already reviewed and approved the Android build with Kids Wall. This note records
how the iOS build keeps it out, so an App Store submission has nothing to question (App Store
Review Guideline 2.1 on incomplete/placeholder features, and the stricter rules for kids apps
around user-generated content and photo sharing).

## How iOS excludes it

All of this keys off `isKidsWallComingSoon()` / `isKidsWallHidden()` in
`app/utils/kidsWallComingSoon.ts`, which returns `true` on iOS by default.

| Surface | Behaviour on iOS |
|---|---|
| Bottom navigation (`components/child/common/footer-navigation.tsx`) | The "Kid's Wall" tab is **not rendered** — 3 tabs, not 4. No "Coming Soon" placeholder tab. |
| `/child/[id]/wall` route | Redirects to `/child/[id]/home`. Renders no feed, no share button, no photo UI. |
| `/child/[id]/wall/share` route | Redirects to `/child/[id]/home`. |
| "Share My Work" button on Explore videos (`components/child/contents/contents-share.tsx`) | Not rendered. |
| Photo-library permission (`services/appPermissionsService.ts`) | Never requested at startup. |
| `NSPhotoLibraryUsageDescription` in Info.plist | **Not added** — `expo-image-picker` plugin is configured with `photosPermission: false` in `app.json` (photo library is only used by Kids Wall). |
| Privacy policy | Already states "Kids Wall — available on the Android app and Web only; not available on iOS." |

The `WallComingSoon` artwork screen and the `/preview/kids-wall-coming-soon` route were removed —
nothing in the iOS build shows a Kids Wall "coming soon" state.

## If Kids Wall is ever brought to iOS

1. Set `EXPO_PUBLIC_KIDS_WALL_COMING_SOON=false` for the iOS build (or remove the iOS branch in
   `kidsWallComingSoon.ts`).
2. Restore a real iOS `photosPermission` string in the `expo-image-picker` config in `app.json`
   (currently `false`) — otherwise the photo picker will fail on iOS.
3. Re-check against App Store Guideline 1.3 / 5.1.4 (kids apps + UGC): parental gate on posting,
   moderation before display, no direct child-to-child contact — the backend consent work in
   Chunk 7 covers the parental-consent side.

## Tests

- `app/__tests__/utils/kidsWallComingSoon.test.ts` — the platform gate.
- `app/__tests__/components/footerNavItems.test.ts` — the wall tab is absent on iOS, present on
  Android/Web, never labelled "Soon", and comes back if the iOS override flag is set.

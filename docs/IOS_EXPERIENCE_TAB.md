# iOS: the Experience tab

On iPhone the Kid's Wall tab is hidden (see `IOS_KIDS_WALL_EXCLUSION.md`), which left the child
bottom navigation with three tabs. The **Experience** tab takes that fourth place: one page per
episode, with the same layout every time, starting with **Strawberry Banana Smoothie**.

Android and Web keep Kid's Wall and do **not** show the Experience tab yet. Whether Android gets it
too is an open question for the client (it would mean five tabs there, see "Android later" below).

## What the client asked for

An HTML template for the experience pages inside the app. Page order:

1. Logo
2. Experience title
3. Video 1 — vocabulary, verbs and pronunciation
4. Video 2 — the story
5. Printable with a print button
6. Closing message with a "Back to home" button

Rules she gave: no social media links and no links to outside websites (App Store and Google Play
rules); font Quicksand; "Back to home" returns to the app's home screen; use the original logo.

## How it works

| Piece | File |
|---|---|
| Episode settings (title, videos, printable) and the fixed wording | `app/config/experiences.ts` |
| The page layout | `app/components/child/experience/experience-view.tsx` |
| The route `/child/[id]/experience` | `app/app/child/[id]/experience.tsx` |
| The bottom-navigation tab | `app/components/child/common/footer-navigation.tsx` |
| Where the tab is enabled | `app/utils/experienceTab.ts` |
| Store-rule checks (tests only) | `app/config/experiencesValidation.ts` |
| Test helper for the Kids Wall flags | `app/__tests__/helpers/kidsWallEnv.ts` |

- **Where it shows:** `isExperienceTabEnabled()` is true exactly where Kids Wall is hidden — iOS, and
  everywhere when the QA preview flag `EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW=true` is set (so it
  can be checked on an Android phone or the web build). If Kids Wall is switched back on for iOS
  (`EXPO_PUBLIC_KIDS_WALL_COMING_SOON=false`), the Experience tab goes away again, so no platform
  ever has more than four tabs.
- **Other platforms:** the route sends the visitor to Home, the same way the wall route does on iOS.
- **The logo:** the app header above every child screen already shows the Rise Up Kids logo
  (`small-logo.png`, the one Kids Wall uses), so it is not repeated inside the page.
- **Back to home:** a normal in-app move to `/child/[id]/home`. No deep link is needed because the
  page is a native screen.
- **Print:** the printable is a PDF on our own domain, opened in the phone's built-in viewer
  (`expo-web-browser`), where the parent can print or share it. A WebView cannot print. The button
  opens a link only if `isOwnDomainHttpsUrl()` accepts it (https on our own domain), so nothing else
  can ever be opened from this page, even if the settings are changed later.
- **Videos:** each video shows a play button, and tapping it starts that video straight away in the
  app's Bunny player (with the player's own controls). No player is created until a video is tapped,
  so the page opens light, and only one video plays at a time: starting the other puts the first back
  to its play button. A video with no link yet shows the play circle with its name, and cannot be tapped.
- **Nothing plays behind other tabs:** the tab bar stacks screens, so a video started here would keep
  playing behind Home or Journey. The page uses `useFocusEffect` and removes its players while another
  screen is in front, and mounts them again when the page returns, and a video does not start again by itself on return.
- **Footer:** labels stay on one line and shrink slightly on narrow phones.

## Adding a new episode

Add an entry to `EXPERIENCES` in `app/config/experiences.ts`:

```ts
{
  id: 'next-episode',
  title: 'Next Episode',
  video1: 'https://iframe.mediadelivery.net/embed/LIBRARY_ID/VIDEO_ID',   // vocabulary, verbs, pronunciation
  video2: 'https://iframe.mediadelivery.net/embed/LIBRARY_ID/VIDEO_ID',   // the story
  printable: {
    image: require('@/assets/images/experience/next-episode-printable.jpg'),
    link: 'https://riseup.kids/downloads/next-episode-recipe.pdf',
    button: 'Print recipe here',
  },
}
```

The tab shows the **first** entry (`getCurrentExperience()`), so to switch the current episode, move
the new one to the top. The tests reject an entry whose videos are not Bunny embeds or whose printable
is not on our own domain (or is a social network), so a wrong link fails the build rather than the
App Store review.

## Current state (to finish)

- The two videos are built into `app/config/experiences.ts` for now: the same two Bunny links the
  website's Experience page uses (the backend's `EXPERIENCE_VIDEOS_PT`), video 1 = vocabulary, verbs and
  pronunciation, video 2 = the story. No `.env` setting is needed. To try different ones without
  editing the code, set `EXPO_PUBLIC_EXPERIENCE_SMOOTHIE_VIDEO1` / `_VIDEO2` (see `app/.env.example`);
  anything that is not a Bunny embed link is ignored. Bunny's Allowed Referrer must include the app's
  referrer (`https://app.riseup.kids` by default).
- The built-in videos are the same two as the production website's `EXPERIENCE_VIDEOS_PT`: video 1
  (`…/660084/fbf9d1d1-…`, titled "VOCABEXPERIENCE.mp4") and video 2 (`…/660084/ea5f0749-…`). Both were
  checked against Bunny: the embed page loads and the stream answers 200 with the app's referrer
  (`app.riseup.kids`) or `riseup.kids`, and 403 without one — so Bunny's referrer protection is working
  and the app passes it. (An older video 1 link, `…/fd54b326-…`, now shows a Bunny "404" page for every
  referrer: that video was replaced. Make sure each `EXPERIENCE_VIDEOS_PT` — local backend `.env`
  included — uses the current link.)
- Links are always used on the `iframe.mediadelivery.net` host (the host in the client's template and
  in the rest of the app): built-in links are written that way, `player.` links from the settings are
  converted, and the tests reject an episode with a link on the other host.
- The printable PDF is `https://riseup.kids/downloads/strawberry-banana-smoothie-recipe.pdf`, served by
  the sales site. It must be deployed there, or the print button opens an error page.
- The page wording is English only, as in the client's template.
- No tablet-specific layout.

## Trying it on Android (Expo Go)

No iPhone build is needed to see the Experience tab. In `app/.env` set the QA preview flag, then
restart Expo with a cleared cache (settings are read when the app is bundled):

```
EXPO_PUBLIC_KIDS_WALL_COMING_SOON_PREVIEW=true
```

```bash
npx expo start -c
```

On that run Android shows the **iOS layout**: Kid's Wall is hidden (its routes redirect to Home) and
Experience takes its place, so there are still four tabs. Nothing else changes, and no code differs
between a normal Android build and this one — only the setting. **Never set this flag in a store
build:** it would remove Kid's Wall from Android. Remove it (or comment it out) afterwards.

## Android later

Android currently has Kid's Wall as the fourth tab. Adding Experience there makes five tabs, so before
doing it: reduce the footer icons to about 24 px and the labels to about 11–12 px (like banking apps),
and change `isExperienceTabEnabled()` — which today follows Kids Wall — to also return true on Android.

## Tests

- `app/__tests__/components/footerNavItems.test.ts` — which tabs each platform gets, the Experience
  label and position, and that Experience is never confused with Explore or Wall.
- `app/__tests__/utils/experienceTab.test.ts` — the platform gate and the QA preview flag.
- `app/__tests__/config/experiences.test.ts` — the episode settings, the store-rule checks (Bunny
  videos only, own-domain printable, no social links), the runtime link check the Print button uses,
  and that the page code has no web addresses.
- `app/__tests__/components/experienceTab.e2e.test.tsx` — end to end on the real components: the
  footer tab opens the page, the page shows every section in order, Print opens the PDF, Back to home
  goes to the child's home, Android and Web are sent home, tapping a play button starts that video,
  only one video plays at a time, and a playing video is stopped while another tab is in front.

Run them with `npm test` from `app/`.

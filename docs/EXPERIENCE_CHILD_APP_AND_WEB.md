# Experiences — child side in the app and on the web (button, list and the page of one experience)

What a child sees: a wide **Experience** button at the top of the **Explore** page, the list of published
experiences it opens (one card each with its **cover picture**), and, by tapping a card, the **page of that
experience** with its videos and printable. Both the phone app and the website do the same thing, reading
`GET /api/experiences` and `GET /api/experiences/:uuid` (see `EXPERIENCE_CHILD_BACKEND.md`).

The old fixed **Experience tab** on iPhone (and its hard-coded Strawberry Banana Smoothie page) has been
removed: iPhone is back to three tabs (Home, My Journey, Explore), and Android and Web keep Kid's Wall as
the fourth. Experiences are now reached only from the **Experience** button on Explore, on every platform.
The Smoothie experience is meant to be added as data (`npm run seed:experience-smoothie` in `backend`).

## What the child sees

1. Explore → the orange, full-width **Experience** button is the first thing on the page.
2. Pressing it opens the list (`Back to Explore`, the title **Experience**, a welcome line, then the cards).
3. Each card: cover picture (when there is none, a cheerful illustration: a soft gradient, a bright round
   badge with a white sparkle and a few small stars and dots, in three colour sets taken in turn; the same
   drawing on web and app), title (2 lines at most),
   description (2 lines at most, left out when empty) and the number of videos (`1 video`, `3 videos`,
   `No videos yet`). **The whole card opens that experience.**
4. In the admin's order. Only published experiences ever arrive.

States of the list: placeholders on the very first visit only; later visits show the last list at once and
refresh quietly (a failed refresh behind a shown list stays silent); `No Experiences Yet` when there are
none; `Try again` when nothing could be loaded; offline shows the placeholder (the app's no-internet dialog is
in charge) and loads again after it reconnects.

### The page of one experience

Drawn from the client's Experience template (the look the old fixed iPhone page had), with the admin's own content:

| Band | Content |
|---|---|
| Cream | A round **back arrow** (arrow only, named "Back to Experiences" for screen readers) at the top left, on the left edge of the video column and part of the page (not fixed), then the title, the description (or, when there is none, the app's two lines: "Your child will be bilingual, naturally. How? By living the English language.") |
| One per video | Pale, cream, pale… in the admin's order. A play button first; the Bunny player is created only after the tap, with autoplay, and only one video plays at a time |
| Printable | Only when there is a picture or something to open. The picture, and a round orange button (the admin's button text, or `Print here`) that opens the file or link |
| Peach | "You are learning, one step at a time.", "Reach for the stars" and a yellow `Back to home` button |

Safety: a video that is not a Bunny embed is never framed (its play button cannot be pressed). The printable
button only opens an **https** address; a **link** must also be on our own domain (`riseup.kids`,
`www.riseup.kids`, `app.riseup.kids`: the store rule is no links to outside websites), an uploaded **file**
is served by our own server, so any https address of it is opened. Nothing else is ever opened.

States of the page: a placeholder on the very first visit to an experience (with `Back to Experiences`
already there); later visits show the last answer at once and refresh quietly; `This experience is not
available` (with `See all experiences`, and no Try again) when the server says 404, which is a draft, a
deleted or an unknown experience; `Try again` for any other failure; offline shows the placeholder and
reloads by itself on the phone after it reconnects.

## Web (`frontend/src`)

| Piece | File |
|---|---|
| Routes `/child/:id/explore/experience` and `/child/:id/explore/experience/:uuid` | `router/routeTable.js` (`CHILD_PAGES`), `router/routeComponents.js` |
| List page | `pages/child/ChildExperiences.jsx` |
| Button on Explore | `components/child/experience/ExperienceButton.jsx`, placed first in `pages/child/ChildExplore.jsx` |
| Header, cards, list states | `components/child/experience/ExperiencesHeader.jsx`, `ExperienceCard.jsx` (the title is the one link, stretched over the card), `ExperiencesList.jsx` |
| Page of one experience | `pages/child/ChildExperienceDetail.jsx`, `components/child/experience/ExperienceDetailView.jsx`, `ExperienceBand.jsx`, `ExperienceVideoBlock.jsx`, `ExperiencePillButton.jsx`, `ExperienceDetailStates.jsx` (placeholder, not available, could not load) |
| Loading | `hooks/experienceChildHook.js` (`useChildExperiences`, `useChildExperience`, cached per child with `useCachedLoad`), `services/experienceChildService.js` |
| Small helpers | `utils/experienceChildFormat.js` (paths, colours, wording, `printableAction`, `toExperienceView`, `withAutoplay`) |

Sizes follow the other child pages: computers and tablets (600px and up) keep fixed sizes, phones use
`phoneFluid` sizes, one card per row on phones and two across on bigger screens. The bottom bar keeps
Explore lit because the address starts with `/explore`.

The page of one experience fits like the free Experience page on the sales site (`/experiencia`): the
bands run edge to edge, the gutter is 16-20px on phones and shrinks smoothly, text sizes are fluid on
phones, 36px / 44px for the title on tablets / from 900px, long words wrap instead of widening the page,
buttons are never shorter than 44px, and the video column is the full band on phones, 620px on tablets and
900px from 900px. Checked in a browser at 375px and 320px (no sideways scroll, even with very long
words) and at 1280px.

## App (`app/`)

| Piece | File |
|---|---|
| List screen `/child/[id]/explore-experience` | `app/child/[id]/explore-experience.tsx`, registered in `app/child/[id]/_layout.tsx` |
| Screen of one experience `/child/[id]/explore-experience-detail?uuid=…` | `app/child/[id]/explore-experience-detail.tsx`, registered in `_layout.tsx` |
| Button on Explore | `components/child/explore/explore-experience-button.tsx`, placed first in `app/child/[id]/explore.tsx` |
| Header, cards (pressable), placeholder | `components/child/experiences/experiences-header.tsx`, `experience-cards.tsx`, `experiences-skeletal-loading.tsx` |
| Page of one experience | `components/child/experiences/experience-detail-view.tsx`, `experience-detail-states.tsx` |
| Shared pieces | `components/child/experience/experience-page-parts.tsx` (band, round button, video block, template colours) |
| Loading | `hooks/experienceHook.ts` (`useExperiences`, `useExperience`), `store/experienceStore.ts` (zustand, shows the last answer at once), `services/experienceService.ts` |
| Small helpers | `utils/experienceFormat.ts` (routes, wording, `printableAction`, `toExperienceView`) |

The screens are named `explore-experience` and `explore-experience-detail`: the footer lights a tab by
looking for `/explore` in the path, so these names keep **Explore** lit. (A path with only `/experience`
in it no longer lights any tab; the old iPhone tab that used it is gone.) `Back to Experiences` is a plain "back" when the list is the
screen below (the normal way in), and goes to the list itself when it is not. The printable opens in the
phone's built-in browser (`expo-web-browser`), so a parent can print or share it from there.

## Tests

- Web: `services/experienceChildService.test.js`, `utils/experienceChildFormat.test.js`,
  `utils/experienceChildDetailFormat.test.js`, `hooks/experienceChildHook.test.jsx`,
  `components/child/experience/ExperienceParts.test.jsx`, `ExperienceDetailParts.test.jsx`,
  `ExperienceList.e2e.test.jsx` and `ExperienceDetail.e2e.test.jsx` (real pages, router, cache, hook,
  service, components and the real Bunny iframe; fake server at the network edge),
  `pages/child/ExperiencePhoneLayout.test.jsx` (computer sizes unchanged, phone sizes fluid, the 900px
  step), and the route table test. `test/readResponsiveCss.js` also reads rules for 900px and up (`wide`).
- App: `__tests__/services/experienceService.test.ts`, `__tests__/store/experienceStore.test.ts`,
  `__tests__/utils/experienceFormat.test.ts`, `__tests__/utils/experienceDetailFormat.test.ts`,
  `__tests__/components/experienceParts.test.tsx`, `experienceDetailParts.test.tsx`,
  `exploreExperience.e2e.test.tsx` and `exploreExperienceDetail.e2e.test.tsx` (real screens, hook, store
  and service; only the network, router, in-app browser, native image view, Bunny player and the other
  Explore sections are replaced), and `footerNavItems.test.ts` (three tabs on iPhone, no Experience tab
  anywhere, Explore lit on the experience screens).

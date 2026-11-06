# Web child side — Phase 9: phone look for Home, My Journey, the course page, Explore, Explore Videos, Printables, Kids' Wall and the shared top bar and tabs

Follows the earlier phone work (Phase 6: players and the profile picker). Web only. Tablets and computers (600px and
wider) are unchanged; every change below sits on the phone side (under 600px) of a responsive value.

## What was wrong (seen on a 360px Android next to the app)

- **No margin:** the Home cards touched the screen edges; the app keeps a 20px margin and 16px gaps. My Journey cards also ran
  edge to edge, with a very tall picture, where the app shows a smaller centred card.
- **Computer sizes on a phone:** 128px avatar, 36px greeting, 24px button padding, a 140px-tall top bar, a 36px page title.
- **Overflow on small screens:** the Progress Summary list was a fixed 400px wide, wider than a 320px screen. A long first name
  could push out of the welcome card. "Start Learning!" wrapped onto two lines.
- **An invisible button taking room:** the top bar held a white-on-white "Sync" button that does nothing; on a phone it
  squeezed the logo.
- **Hover effects on touch:** buttons and cards that grow on hover stayed grown after a tap.

## What it does now

- **One sizing helper** (`constants/childPhoneLayout.js`): `phoneFluid(min, max)` is a size that grows with the screen up to
  `max` (reached at about 412px wide) and shrinks smoothly down to `min`. So one value fits an iPhone SE (375px), a 360px
  Android and a 320px screen, and never goes below a readable minimum (checked down to 280px). It is only ever used on the phone
  side: `fontSize: { xs: phoneFluid(22, 30), sm: '36px' }`.
- **Home** (`ChildHome`, `ChildHomeStartLearning`, `ChildHomeAccumlatedAwards`, `ChildHomeLiveClass`): a side margin like the
  app; smaller avatar, greeting and button that fit on one line; the greeting column can wrap a long name inside the card; the
  three stat cards share the width evenly with fitting text; the live class card and its Join button scale the same way.
- **Top bar** (`ChilHeader`): the app's 100px bar, a fluid logo, star count and padding, and the invisible Sync button is not
  drawn on phones.
- **Bottom tabs** (`ChildNavigation`): icons and labels shrink a little on the smallest phones.
- **My Journey** (`ChildJourney*`): a short top gap, a fluid title and step line, one card per row at 85% of the width and
  centred (the app's layout), fluid card text and icon, placeholder cards of the same shape, and a Progress Summary that is as wide
  as the page.
- **Course page** (the page opened from a Journey card: `ChildJourneyModule` and its sections): the same side margin as the app
  (it had 16px plus a fixed 32px, which squeezed everything into a narrow column), a 40px back button, breadcrumbs that fit on
  one line, the three Completed / To Do / Locked cards side by side (they were stacked one per row), and **two cards per row in
  the Library, Videos, Chants and Audio sections** (they were one very tall card per row). The five progress circles on a card
  shrink together to fit its width; chant and audio card text has less padding; the audio card's star badge drops under its
  label when the card is too narrow for both. The section titles and "Printables" are dark on phones, because the white ones
  were nearly invisible on the light page (computers and tablets keep the white). The first-load placeholder has the same shape.
- **Explore** (`ChildExplore` and its sections): a little more room at the sides (14 to 22px depending on the screen, 16px before);
  "Watch Replays" title, badge and "See All" scale down on small screens; the replay cards use the app's 160px picture (they used
  the taller 4:3 shape), 14 to 20px of text padding, and no grow-on-hover; the "What do you want to learn?" card and the six
  collection cards (padding, picture, title, button, gaps) scale on small screens and no longer lift on hover.
- **Explore Videos** (`ChildExploreVideos` and its sections): the same extra room at the sides; the header, its icon and stars row
  scale down; each video card uses the app's 192px picture and fluid text padding and title; the three footer stars shrink; the
  placeholders have the same picture heights. **The share card ("Made Something Tasty?" and its button) is left out on phones**,
  as in the app (where it is hidden whenever Kids' Wall is off); tablets and computers still show it.
- **Printables** (`ChildModulePrintables` and its pieces): each printable was one row (a 128px picture, the words and the Download
  button side by side), which cannot fit a phone: the title was squeezed into a thin column and the button pushed off the right edge
  of the screen. On phones each printable is now a stacked card: the picture on top (no empty box when it has none), then the title and
  description, then a full-width Download button that is easy to tap. The cards use the whole width, the title and printer shrink on
  small screens, and the first-load placeholder has the same stacked shape. Tablets and computers keep the row.
- **Kids' Wall** (`ChildKidsWall` and its pieces: header, share card, post cards, footer, first-load placeholder): the page had no
  side space at all, so the header, the share card and every post card (and its square picture) touched both screen edges. Phones
  now get the app's side space (12 to 18px depending on the screen, 16px in the app). The header, the share card (its sparkles,
  title, words and button) and the footer scale down on small screens. On each post the heart and the "Great!" button are bigger
  and roomier to tap (a 20px heart and an 18px star, as in the app; they were 16px with 4px of space), and a long title or text is
  cut with "…" at two and four lines, as the app does. The Share button and the heart no longer grow on hover on phones. The
  first-load placeholder has the same spacing. Tablets and computers keep every value they had (two columns, the full text).
- **Try again button** on the drag-and-drop book page (`InteractiveTest`): 40% smaller (60% of its size), shrinking toward its own corner so it stays
  where it is, and only on a touch phone held sideways (the same rule the other sideways-phone book changes use). Computers,
  tablets, a phone held upright and the admin preview are unchanged.
- **No grow-on-hover on phones** for the Start Learning and Join Class buttons, the star button, the Journey cards and every
  card on the course page.

## Proof that computers and tablets are unchanged

1. **Real browser, before and after.** The committed code and the new code were each opened at 1280, 1024, 768 and 600px
   and every element's position, size, spacing, font, colour, shadow and 25 other properties were recorded (103 elements for Home,
   141 for Journey, 262 for the course page, 247 for Explore, 156 for Explore Videos, 127 for Printables, and for Kids' Wall 155 with posts, 127 while loading and 70 with uploads off and no posts). The two matched exactly. This check caught two mistakes of mine on the way (a 140px toolbar minimum that was
   really 64px, and a title line height that was 1.6 not 1.5), both fixed.
2. **Guard tests** (`pages/child/ChildHomePhoneLayout.test.jsx`, `ChildJourneyPhoneLayout.test.jsx`, helper
   `test/readResponsiveCss.js`): read the style rules the page really generates and assert the 600px-and-wider values equal the
   original ones, and the phone values are the fluid ones. 20 tests for Home and Journey, 22 for the course page, 17 for the two Explore pages, 9 for Printables, 17 for Kids' Wall, plus 7 for the
   helper.
3. **Break-it checks** on a scratch copy of the code: 25 deliberate breaks on Home and the shell, 24 on Journey, 37 on the course page and the Try again button, 41 on the two Explore pages, 28 on Printables, 83 on Kids' Wall; all were
   caught.

## Seen in a real browser at 320, 360, 375 and 280px

Home and Journey fit without sideways scrolling, "Start Learning!" stays on one line, the three stat labels stay on one line, the
tab labels stay readable, a long name ("Alexandrina") wraps inside the card, and four-digit numbers fit.

## Not changed on purpose

- The Badges icon on Home differs from the app's (a ribbon on the web, a medal in the app): a picture choice, not a size.
- The page backgrounds: the web course page is light teal where the app's is cream. Only sizes were matched.
- The section titles (Library, Videos, Chants, Audio, Printables) are **white on a pale background on computers and tablets**
  too, so they are hard to read there. They were left as they are because computers must not change; say the word and they can
  be darkened everywhere.
- Explore and Explore Videos were done from the code and the app's styles, without phone screenshots; sizes may need a tweak
  once you see them on a real phone.
- Kids' Wall was done from the code and the app's styles, without phone screenshots. The "Share Something Cool!" page that opens
  from it (`ChildShareSomething`, the upload form) is not part of this change. One thing follows the app on purpose: long posts are cut
  at two and four lines with no "read more" (on a phone the full text used to show). Say the word if the web should show it all.
- The pages not yet checked on a phone: the Kids' Wall share form, Profile, and the pop-ups. They share the
  top bar and tabs, which are done. Send screenshots of them (web next to the app, same phone) and each gets the same treatment.
- Pictures that start hidden then fade in (`RemoteImage`) stayed invisible in the test browser even for the committed code; they
  load normally on a real phone (the screenshots show them).

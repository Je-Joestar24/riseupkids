# Rise Up Kids — Website Child Side
## Progress report: Phases 4 to 6

Date: 5 November 2026
Scope: the child side of the website (Home, My Journey, course pages, Explore, Kids Wall, Profile, Printables, the video player and the built-in book player) and the parent's "Pick your profile" page.
Goal: make the website as fast and smooth as the phone app, and make it work properly on phones.

This continues the report for Phases 1 to 3.

---

## 1. Summary

**Phase 4 — Separate downloads.** The website used to be one 2 MB file that every visitor downloaded, children included. It is now split by area: a child downloads about a third of what they did before, and never downloads admin, teacher or parent screens. The child's header and bottom bar now stay on screen while pages change, and a page that cannot load shows a message with a Try again button instead of a blank screen.

**Phase 5 — Placeholders for Profile, Printables and opening a book.** Profile and Printables now show grey placeholders on the first visit and remember their last answer, so a return visit shows content at once. Tapping a built-in book now opens the reader immediately, instead of leaving the page unchanged while the book is fetched.

**Phase 6 — Phones, and Bunny videos.**
- The video player and the built-in book player now work on phones held sideways and upright, without changing how they look on a computer.
- Android phones get a real full-screen option with a sideways lock.
- The "Pick your profile" page now fits phones, from a 320 px screen up (iPhone SE 2nd gen is 375 px).
- Bunny videos now play "watch only", the same way the phone app plays them: they start by themselves, children cannot skip with Bunny's controls, and a tap plays or pauses. On a phone held sideways the video fills the screen with only a screen toggle and an "I finished watching" button.

The automated test suite grew from 43 files and 419 tests (after Phase 3) to **67 files and 904 tests**, and every phase was checked by breaking the code on purpose to confirm the tests catch it.

---

## 2. What a child sees: before and after

| Situation | Before | After |
|---|---|---|
| Opening the website (first download) | One 2,059 kB file for everyone | Sign-in page 614 kB; a child's Home 650 kB (about a third) |
| Moving between child pages | Each page redrew its own header and bottom bar | One header and bottom bar that stay put |
| A page that fails to load | Blank white screen | "This page could not load." with Try again |
| Opening Profile or Printables | Spinner or plain text on every visit | Grey placeholders on the first visit; the last answer at once on return visits |
| Tapping a built-in book | Nothing visible until the book's pages arrived | The reader opens at once with "Opening your book..." |
| Video on a phone held sideways | Very little height left for the picture (roughly 130 px, going by the old layout's sizes) | Fills the screen |
| Built-in book on a phone held upright | A thin strip across the middle of the screen | A "Turn your phone sideways" card; the book keeps its place |
| "Pick your profile" on a phone | Cut off on the right, logo cut off at the top, lower buttons out of reach | Fits the screen and scrolls |
| Bunny videos | Bunny's own bar, speed menu and full screen were all usable | Watch only: starts by itself, cannot be skipped, tap to play or pause |

---

## 3. Phase by phase

### Phase 4 — Separate downloads

What was done:

- **Every page and screen became its own download.** A child never downloads an admin, teacher or parent page, and an admin never downloads the child pages. The sign-in page stays in the first download, because everybody starts there.
- **All routes moved into one list** (56 website routes plus the child pages) with the same addresses, roles, layouts and redirects as before. A test compares it with the old list, so no route was lost or opened to the wrong role.
- **A persistent child frame.** The header and bottom bar sit one level above the child pages, so they stay while a page's code downloads and while the child moves around. The loading mark appears inside the frame, never instead of it.
- **Layout and page download side by side.** A layout and the page inside it used to be requested one after the other; they are now requested together.
- **Background preparation.** Once the first child page has been on screen for 1.5 seconds, the other child pages download quietly, one at a time, so they are usually already there when tapped. Nothing is prepared on a "save data" or very slow connection. While a parent is choosing a child, the child area is prepared too.
- **Pop-ups on demand.** The video player, the interactive activity player, the two recording pop-ups and the built-in book reader download quietly after the page is up. If a tap beats the download, a spinner shows after a short moment.
- **Safe after a new release.** After a release, an old browser tab can ask for a file that no longer exists. The page now reloads itself once to pick up the new files; a second failure inside 30 seconds shows an error instead of looping.
- **Error screen.** A page that fails to download or to draw shows "This page could not load." with Try again, inside the child frame for child pages.
- **Shared library files.** React and the router, and the state libraries, are separate files that rarely change, so a returning visitor re-downloads only the website's own code after a release.
- **Admin layout stays on screen** while the next admin page downloads. This was found and fixed during testing.

Size of the JavaScript a visitor must download before the page can run:

| Visitor opens | Before | After | After, compressed |
|---|---|---|---|
| Sign-in page | 2,059 kB | 614 kB | 180 kB |
| Child Home | 2,059 kB | 650 kB | 193 kB |
| Child course page | 2,059 kB | 713 kB | 209 kB |
| Child Explore videos | 2,059 kB | 668 kB | 199 kB |
| Parent dashboard | 2,059 kB | 807 kB | 241 kB |
| Admin dashboard | 2,059 kB | 775 kB | 238 kB |

(The compressed size before was 514 kB for every visitor.)

### Phase 5 — Placeholders for Profile, Printables and opening a book

What was done:

- **Profile** now loads its three pieces of information together, remembers the last answer for each child, and shows a placeholder in the same shape as the page (name card, level bar, badges, latest wins) only on the first visit. If the first load fails, it shows the reason and a Try again button.
- **Printables** works the same way, with three placeholder cards under the page header, and keeps its Retry button.
- **A failed refresh stays silent.** If a page already shows content and a quiet refresh fails, nothing is shown to the child.
- **Placeholders appear only after a short delay** (150 ms), so a fast answer never flashes one. They are announced to screen readers and stop pulsing when the device asks for reduced motion.
- **Opening a built-in book** now opens the reader at the tap with "Opening your book..." and a moving bar. A second tap while the book is on its way is ignored, closing the reader before the book arrives keeps it closed, and a book that cannot be fetched closes the reader so it can be tapped again.

### Phase 6 — Phones, and Bunny videos

**One switch for phones.** A single check decides whether the screen is a touch phone (a finger, no mouse) held upright or sideways. Computers (whatever the window size), tablets and a phone-sized window with a mouse are never treated as phones, and every phone-only layout is written so it cannot reach them. The computer layout of the video player and the book player is recorded in tests and was also measured in a browser before and after: every box was identical.

**Video player on a phone held sideways.** It becomes a full-screen black stage: on a 667 × 375 phone the video area is now 331 px high (the old layout left roughly 130 px). Rotating the phone while a video plays does not restart it. The upright phone card is unchanged.

**Built-in book on a phone.**
- Held upright, a "Turn your phone sideways" card sits over the book. The book underneath keeps its page, sound and progress, and Close still works. Turning the phone removes the card.
- Held sideways, the content page now fits: the Rise Up logo is no longer cut off, the reading text is scaled to the screen height (including sizes set in the book up to 72 px), and the Close button is a 44 px target clear of a notch. These rules are phone-only and the admin preview, which shares these pages, is unaffected.

**Android full screen.** On Android phones whose browser supports it, tapping a book asks for real full screen and a sideways lock, and the video's title bar has a Full screen button. The request is made inside the tap, and given back when the book or video closes, fails to open, or the page is left. iPhone Safari cannot do this, so nothing is offered there; computers and tablets are never asked.

**"Pick your profile" page.** The card had a fixed width of 384 px plus padding, wider than a phone, and the page was locked to the screen height. Now the card takes the screen width, the page grows and scrolls, long names wrap, and a phone held sideways can scroll. It was measured at 360 px (the Oppo phone it was reported from), 375 px (iPhone SE 2nd gen) and 320 px, with five children and a long name.

**Bunny videos, watch only (the same rules as the phone app).**
- The video starts by itself with sound, using the same Bunny settings as the app. A saved "muted" or "no autoplay" setting on a video no longer overrides this.
- Once the video is playing, a clear layer covers it so Bunny's own controls (skip ahead, speed, settings) cannot be touched or reached by keyboard. A tap anywhere plays or pauses.
- A large play button stays in the middle while the video is paused or has ended, and a pause badge shows for one second after it resumes.
- Bunny's own full screen and picture in picture are switched off.
- If the video does not load in 15 seconds, or the player reports a problem, the child sees the reason and a Try again button that rebuilds the player. A missing address shows "No video is available here right now." instead of loading for ever.
- The cover only goes up after the player has reported that it is playing. If it never reports (autoplay refused by the browser, for instance), Bunny's own play button stays usable, so a child can never be locked out of starting a video.
- Both Bunny addresses (the older and the newer one) now play, as in the app. Saving a video in admin still accepts only the older one, as the server does.

**Bunny video on a phone held sideways: the full-screen view.** The picture fills the whole screen. There is no header, title or Close button. The only things on top of the picture are the screen toggle (top right), "I finished watching" (bottom left) and the play button when paused. To leave without finishing, the child turns the phone upright, where the card still has its title, Full screen and Close.

---

## 4. How it was verified

- **Automated tests:** 67 files and 904 tests, all passing (43 files and 419 tests after Phase 3).
  - Phase 4 added 11 new test files, including one that fails if a child page ever imports admin code, and one that loads every page and pop-up with the real code.
  - Phase 5 added Profile, Printables, book-opening and wait-panel tests.
  - Phase 6 added tests that record the computer and upright-phone layouts, tests for the phone switch, full screen, the book pages and the profile page stylesheet, and tests that simulate what a Bunny embed sends.
- **Broken on purpose:** each phase's code was deliberately broken in many ways to prove the tests notice. Phase 4: 29 ways. Phase 5: 35. Phase 6: about 105. Every one is now caught. Several gaps these checks exposed were closed with new tests (for example the position and stacking order of the screen toggle, and which icon the play button shows).
- **Real browser checks** at phone sizes (667 × 375, 375 × 667, 360 × 740, 320 × 568) for the video stage, the book pages, the Bunny full-screen view and the profile page, and a measurement of a computer window before and after each change.
- **A real Android phone** (Oppo Reno 8z) was used to try the phone changes, and the "Pick your profile" fix came from what that phone showed.
- **The website builds** after every phase.

---

## 5. Known limits

- **Bunny was not tried against a real Bunny video.** The tests simulate Bunny's side. The first real check is on a phone and a computer with a real video (see the checklist). If a tap does not pause, the cover can be adjusted.
- **Bunny's own control bar cannot be hidden by the website.** A page cannot reach into Bunny's page, and Bunny has no setting for it in the embed address. The bar stays visible for the first seconds and while a video is paused, but cannot be touched once the video plays. The clean fix is in the Bunny dashboard, in the library's Player settings.
- **iPhone was not tried**, and iPhone Safari cannot make a page full screen or lock rotation, so there the child simply turns the phone.
- **Bunny's own full screen is off on computers too**, following the phone app, and there is no replacement button on a computer.
- **Not yet looked at on a phone:** the drag-and-drop book page, the "well done" pop-up, and the other child pages (Home, My Journey, Explore, Kids Wall).
- **Left unchanged on purpose:** on a computer with a short window and three children, the "Pick your profile" page can still be cut off, as before, because the computer view was not to change.
- **Videos uploaded as files** still play as before. Removing them, now that Bunny is the focus, is a decision still to be made.
- **The first download is still about 440 kB** because the whole state store is in it; splitting it by area was left out.
- **Still to come:** the book's media preload (the wait screen keeps its current content after the pages arrive) and a book cache that survives a page reload.

---

## 6. Quick acceptance checklist (about 15 minutes)

On a computer:

1. Open the sign-in page, then sign in as a parent and pick a child. Home appears with its header and bottom bar; tap through Home, My Journey, Explore and Kids Wall: the header and bar never disappear.
2. Open Profile and Printables for the first time: grey placeholders, then content. Leave and come back: the last content is there at once.
3. Open a built-in book: the reader opens immediately with "Opening your book...".
4. Open a Bunny video: it starts by itself; Bunny's bar and full screen cannot be used once it plays; a click plays or pauses with a play or pause symbol.
5. Check that nothing looks different on a computer from before: video player, book player, "Pick your profile".

On a phone (same Wi-Fi as the computer running the website):

6. "Pick your profile": fits the screen, nothing cut off, scrolls to "Add New Kid" and "Parent Login".
7. Open a video with the phone upright (a card with title and Close), then turn it sideways: full screen. For a Bunny video there is no header, the toggle is at the top right and "I finished watching" at the bottom left. Rotate while it plays: it keeps playing.
8. Open a built-in book upright ("Turn your phone sideways"), then sideways: every page type fits. Rotate in the middle of a page: it stays.
9. On Android: the book tap goes full screen and sideways; the video's title bar has a Full screen button. On iPhone neither is shown.
10. Block the Bunny website (or turn Wi-Fi off) and open a Bunny video: after about 15 seconds the message and Try again appear.

---

## Appendix — Where the work lives (for developers)

| Area | Files (all under `frontend/src/`) |
|---|---|
| Phase 4: route list and lazy pages | `router/routeTable.js`, `router/routeComponents.js`, `router/AppRouter.jsx`, `router/ChildShell.jsx` |
| Phase 4: lazy loading helpers and screens | `utils/lazyChunk.jsx`, `components/common/RouteLoading.jsx`, `components/child/common/lazyModals.jsx`, `hooks/useIdlePreload.js`, `vite.config.js` |
| Phase 5: Profile and Printables | `pages/child/ChildProfile.jsx`, `pages/child/ChildModulePrintables.jsx`, `components/child/childprofile/ChildProfileSkeleton.jsx`, `components/child/printables/PrintablesSkeleton.jsx` |
| Phase 5: opening a book | `components/child/module/ChildModuleLibrary.jsx`, `components/child/common/cms/CmsBooksModalPlayer.jsx`, `components/admin/common/cmsTest/CmsPlayerPreloadPanel.jsx` |
| Phase 6: the phone switch and full screen | `hooks/usePlayerViewport.js`, `utils/playerFullscreen.js` |
| Phase 6: video player and book on phones | `components/child/common/VideoPlayerModal.jsx`, `components/child/common/cms/TurnPhonePrompt.jsx`, `components/admin/common/cmsTest/ContentTest.jsx`, `components/admin/common/cmsTest/shared.js` |
| Phase 6: "Pick your profile" | `assets/css/ParentsChild.css`, `components/parents/child/ParentsChildList.jsx` |
| Phase 6: Bunny watch-only | `components/child/common/BunnyEmbedIframe.jsx`, `utils/bunnyExploreEmbed.js`, `utils/bunnyPlayerBridge.js`, `utils/moduleVideoPlayback.js`, `utils/exploreVideoPlayback.js`, `utils/cmsPlayerMedia.js` |
| Notes for each phase | `docs/WEB_CHILD_PHASE4_CODE_SPLITTING.md`, `docs/WEB_CHILD_PHASE5_PLACEHOLDERS.md`, `docs/WEB_CHILD_PHASE6_PHONE_PLAYERS.md`, `docs/WEB_CHILD_BUNNY_WATCH_ONLY.md` |

# Rise Up Kids — Website Child Side
## Progress report: Phases 7 to 9

Date: 6 November 2026
Scope: the built-in books on the website, and how the child pages look on a phone (Home, My Journey, the course page, Explore, Explore Videos, and the top bar and bottom tabs every child page shares).
Goal: make books open fast and stay saved, and make the child pages look as clean on a phone as the phone app does, without changing anything on a computer.

This continues the report for Phases 4 to 6.

---

## 1. Summary

**Phase 7 — Built-in book loading.** The book's sounds and videos are now really downloaded, nearest page first, and played from the device's memory, so nothing is fetched twice. The book opens as soon as its first page is ready instead of waiting for the whole book, and the Next button waits (with a small spinner) until the next page is ready, so a page never opens half-loaded.

**Phase 8 — Books stay saved between visits.** Once a book has been opened, its sounds and videos are kept on the child's device. The next visit needs no download at all, also with the internet off. If a book is edited, only the files that changed are downloaded again.

**Phase 9 — The phone look.** Home, My Journey, the course page, Explore and Explore Videos, plus the top bar and bottom tabs, now follow the phone app's look on a phone: the same side margins, sizes that fit a small screen (checked from a 320 px screen up to a large phone), cards laid out the way the app lays them out, and nothing wider than the screen. The share card on Explore Videos is left out on phones, like in the app. The "Try again" button on the drag-and-drop book page is smaller on a phone held sideways.

**On a computer or a tablet nothing changed.** This was measured, not assumed: every box on the pages was recorded in a real browser before and after, at four screen widths, and the two matched exactly.

The automated test suite grew from 67 files and 904 tests (after Phase 6) to **FILES files and TESTS tests**, and every phase was checked by breaking the code on purpose to confirm the tests catch it.

---

## 2. What a child sees: before and after

| Situation | Before | After |
|---|---|---|
| Opening a built-in book | Waited for every picture, sound and video of the whole book | Opens when the first page is ready; the rest downloads behind it |
| Moving to the next page of a book | Next worked at once, then a page could open before its video arrived | Next shows a small spinner until the next page is ready, then opens fully loaded |
| A book's sound and video | Fetched again by every page that played them | Downloaded once, played from memory |
| Opening the same book again | Downloaded again every time | Opens with no download; works with the internet off |
| A book that was edited | (nothing was kept) | Only the changed files are downloaded again |
| The Home button on the last page | Sometimes only the words "Home button" | Always the picture |
| Home on a phone | Cards touching the screen edges, computer-sized avatar and text, "Start Learning!" on two lines | Side margins like the app, sizes that fit, one line |
| The top bar on a phone | 140 px tall, with an invisible button taking room from the logo | The app's 100 px bar, the invisible button hidden |
| My Journey on a phone | Full-width cards with a very tall picture; a Progress Summary wider than a small screen | Centred cards like the app; the summary fits |
| The course page on a phone | Content squeezed into a narrow column; stat cards stacked; one huge card per row; white titles on a pale page | App-like margins; stat cards side by side; two cards per row; dark, readable titles |
| Explore and Explore Videos on a phone | Computer-sized text and tall pictures | A little more room at the sides; the app's picture heights; text that scales; no share card |
| "Try again" on the drag-and-drop page, phone held sideways | Very large | 40% smaller (60% of its old size) |

---

## 3. Phase by phase

### Phase 7 — Built-in book loading

What was wrong: the book's "preload" only really loaded pictures. For sounds and video it sent a request that downloaded nothing and kept nothing, yet the child still waited for it. Every page then fetched its own sound and video again when it played.

What was done:

- **A real downloader, nearest page first.** Each sound and video is downloaded whole and kept in memory as a local copy, which the page then plays. The order follows the child: the page in view, the page Next opens (its video first when it is a video page), the one after, then the rest; pages already seen go last, and the order changes as the child moves.
- **Gentle on the connection.** Six pictures or sounds at a time; videos one at a time, plus one extra for the page in view or the next one, so a big video far ahead never holds up the page in front of the child.
- **Nothing can leave a child stuck.** An embedded (Bunny) video, a file over 100 MB, a book past 400 MB, a file the server refuses, and a file that stops sending for 30 seconds (after one quiet retry) are simply played from their original address.
- **The book opens on page 1.** The wait panel now covers the first page only ("Getting your book ready...") with its own percentage.
- **Next waits for the next page.** On the content, intro and demo pages Next is disabled with a small spinner on the button until the next page is ready. After 10 seconds (12 on a video page, the phone app's values) it opens anyway and plays from the internet. A correct drag-and-drop answer given too early is remembered and carried out as soon as the page is ready.
- **Closing the book** stops every download and frees every local copy.
- **No server change.** The website uses the media list and version number the server already sends for each book, as the phone app does.
- **The Home button picture** is now part of the website, instead of being fetched from the server, which sometimes did not serve it.
- **The admin preview and the admin book tester are unchanged.**

### Phase 8 — Books stay saved between visits

What was done:

- **Saved on the device.** As each sound or video finishes downloading it is saved in the browser's own storage, in the background. The book never waits for the saving.
- **Used first on the next visit.** The downloader looks on the device before the internet, so page 1 opens and Next unlocks almost at once, and the whole book works with the internet off.
- **Always the right version.** Each saved file is tied to the date the server gives it (or, where there is none, to the book's version). A saved file is used only if that still matches. When a book is edited only the changed files are downloaded again, and files the book no longer uses are removed.
- **Nothing damaged is ever played.** The saved list records each file's exact size. A missing or half-saved file, or a broken saved list, is ignored and downloaded again; a broken list clears the saved books and starts clean.
- **Kept small.** The total is capped at 600 MB. When a new file does not fit, the books opened longest ago are removed first, never the book being opened.
- **Every failure falls back to normal loading.** A device that is full, a private window, a browser without this storage, or storage that fails or does not answer within 4 seconds: the book simply loads as in Phase 7.

### Phase 9 — The phone look

How it was done: a small sizing rule gives each size a value that grows with the screen up to the phone app's value (reached on a large phone, about 412 px wide) and shrinks smoothly down to a safe minimum on a small one. It is used only for phones (screens under 600 px). Tablets and computers keep their exact original values.

**Home.** Side margins like the app; the avatar, greeting, "Start Learning!" button, stat cards and live class card scale to the screen; a long name wraps inside its card; the grow-on-hover effects, which stay stuck under a finger, are off on phones.

**Top bar and bottom tabs** (shared by every child page). The top bar is the app's 100 px; the logo, star count and padding scale; a white-on-white "Sync" button that did nothing and only took room from the logo is hidden on phones; the tab icons and labels shrink a little on the smallest phones.

**My Journey.** One card per row at 85% of the width, centred, like the app; a smaller title and fluid card text; the placeholder cards have the same shape; the Progress Summary, which was a fixed 400 px wide, is now as wide as the page.

**The course page** (opened from a Journey card):
- the same side margin as the app (it had a fixed 16 px plus 32 px, squeezing everything into a narrow column);
- a 40 px back button; breadcrumbs that fit on one line;
- Completed / To Do / Locked side by side (they were stacked, one per row);
- **two cards per row** in Library, Videos, Chants and Audio, with the five progress circles under each card shrinking to fit;
- the audio card's star badge drops under its label when the card is too narrow for both;
- section titles and "Printables" are dark on phones, because the white ones were nearly invisible on the pale page;
- the first-load placeholder has the same shape.

**Explore.** A little more room at the sides; the "Watch Replays" title and "See All" scale; the replay cards use the app's 160 px picture; the "What do you want to learn?" card and the six collection cards scale and no longer lift on hover.

**Explore Videos.** The same extra room; the header, its icon and its stars row scale; each video card uses the app's 192 px picture; the three footer stars shrink; the placeholders match. **The share card ("Made something tasty?" and its button) is left out on phones**, as in the app, where it is hidden whenever Kids' Wall is off. Tablets and computers still show it.

**"Try again" on the drag-and-drop book page.** 40% smaller on a phone held sideways, shrinking toward its own corner so it stays where it was. Computers, tablets, a phone held upright and the admin preview are unchanged.

---

## 4. How it was verified

- **Automated tests:** FILES files and TESTS tests, all passing (67 files and 904 tests after Phase 6).
  - Phase 7: a fake network the test controls (slow, failing, blocked, cut off, too big, stalled), tests for the plan, the downloader and the page sources, and whole-flow tests from tapping a book to closing it.
  - Phase 8: a fake device storage (full, off, damaged, never answering), tests for the saving layer and the downloader with it, and whole-flow tests across a first visit, repeat visits and an edited book.
  - Phase 9: tests that read the style rules each page really generates and check that screens of 600 px and wider keep exactly their original values while phones get the new ones, for Home, My Journey, the course page, Explore, Explore Videos and the Try again button.
- **Broken on purpose:** each phase's code was deliberately broken in many ways to prove the tests notice. Phase 7: about 64 ways. Phase 8: 28. Phase 9: about 125. Every one is now caught.
- **Computer and tablet view compared, element by element.** For each page the position, size, spacing, font, colour and shadow of every element were recorded in a real browser at 1280, 1024, 768 and 600 px, from the committed code and from the new code: 103 elements on Home, 141 on My Journey, 262 on the course page, 247 on Explore and 156 on Explore Videos. **Zero differences.** This check also caught two small mistakes of mine along the way, which were fixed.
- **Real browser checks.** Phase 7 and 8: a local file server on another address with real sound and video files, slowed down and made to fail on demand; the second visit asked for no sound or video, the files played from the saved copies, an edited file was the only one fetched again, and the size cap removed the oldest book. Phase 9: every page at 280, 320, 360, 375 and 412 px with long names and four-digit numbers, with nothing wider than the screen.
- **A real Android phone** (Oppo Reno 8z) showed the web and app screens side by side for Home, My Journey and the course page, which is where those fixes came from.
- **The website builds** after every phase.

---

## 5. Known limits

- **Not tried on an iPhone.** The phone work was measured down to a 320 px screen, but only an Android phone was used.
- **Explore and Explore Videos were done from the app's code, without phone screenshots.** Sizes may need a small adjustment once you see them on a phone.
- **Left as they are on purpose:** the page backgrounds (the website's course page is light teal where the app's is cream), the badge icon on Home (a ribbon on the website, a medal in the app), and the white section titles on computers and tablets, which are hard to read there too. Computers were not to change. The titles can be darkened everywhere if you wish.
- **A video page's Next can wait up to 12 seconds on a slow connection**, where before it opened at once and the video streamed.
- **Saved books are per device and per browser.** A browser may clear a site's storage when it is short of space, and Safari clears it after a period without use; the book then simply downloads again.
- **Saving needs the media host to allow the website.** This is set up and was checked. Without it, files still play from the internet but are not saved.
- **Not yet looked at on a phone:** Kids' Wall, Profile, the Printables page itself, and the pop-ups.
- **Still to come:** the rest of the phone pass, and a first-book warm-up while the module page is idle.

---

## 6. Quick acceptance checklist (about 15 minutes)

On a computer:

1. Open Home, My Journey, a course page, Explore and an Explore video list: they look exactly as before, and the video list still has its share card.
2. Open a built-in book for the first time: it opens on page 1 and Next shows a small spinner while the next page loads.
3. Close it and open it again: no loading wait; with the browser's Network panel open, no sound or video is requested the second time.

On a phone:

4. Home: margins at both sides, the greeting and "Start Learning!" fit, no side scrolling.
5. My Journey: centred cards; scroll to the bottom: the Progress Summary fits the screen.
6. Open a course: stat cards side by side, two cards per row in each section, titles readable.
7. Explore: replay cards with the shorter picture; the six collections fit. Open one: no share card; the video cards have the shorter picture.
8. Open a drag-and-drop book page with the phone held sideways: the "Try again" button is clearly smaller than before.
9. Try the smallest phone you have (or a narrow window): nothing is cut off at the sides.

---

## Appendix — Where the work lives (for developers)

| Area | Files (all under `frontend/src/`) |
|---|---|
| Phase 7: the downloader and its plan | `utils/cmsBookMediaLoader.js`, `utils/cmsBookMediaPlan.js`, `hooks/useCmsBookMedia.js`, `hooks/cmsMediaSrc.jsx` |
| Phase 7: the reader and the pages | `components/child/common/cms/CmsBooksModalPlayer.jsx`, `components/child/module/ChildModuleLibrary.jsx`, `components/admin/common/cmsTest/` (`ContentTest`, `IntroTests`, `DemoTest`, `RewardTest`, `InteractiveTest`, `CmsNextButtonWait`) |
| Phase 8: saving between visits | `utils/cmsBookMediaStore.js` (used by `utils/cmsBookMediaLoader.js` and `hooks/useCmsBookMedia.js`) |
| Phase 9: the sizing rule | `constants/childPhoneLayout.js` |
| Phase 9: shared top bar and tabs | `components/common/ChilHeader.jsx`, `components/common/ChildNavigation.jsx` |
| Phase 9: Home and My Journey | `pages/child/ChildHome.jsx`, `components/child/home/`, `pages/child/ChildJourney.jsx`, `components/child/journey/` |
| Phase 9: the course page | `pages/child/ChildJourneyModule.jsx`, `components/child/module/` |
| Phase 9: Explore and Explore Videos | `pages/child/ChildExplore.jsx`, `pages/child/ChildExploreVideos.jsx`, `components/child/explore/`, `components/child/explorevideos/` |
| Phase 9: Try again button | `components/admin/common/cmsTest/InteractiveTest.jsx` |
| Tests added for these phases | `utils/cmsBookMedia*.test.js`, `hooks/useCmsBookMedia.test.jsx`, `hooks/cmsMediaSrc.test.jsx`, `components/child/module/cmsBookLoading.e2e.test.jsx`, `components/child/module/cmsBookSaved.e2e.test.jsx`, `constants/childPhoneLayout.test.js`, `pages/child/Child*PhoneLayout.test.jsx`, `components/admin/common/cmsTest/InteractiveTest.retryButton.test.jsx`; helpers `test/fakeNetwork.js`, `test/fakeCacheStorage.js`, `test/readResponsiveCss.js` |
| Notes for each phase | `docs/WEB_CHILD_PHASE7_BOOK_LOADING.md`, `docs/WEB_CHILD_PHASE8_BOOK_SAVING.md`, `docs/WEB_CHILD_PHASE9_PHONE_HOME_JOURNEY.md` |

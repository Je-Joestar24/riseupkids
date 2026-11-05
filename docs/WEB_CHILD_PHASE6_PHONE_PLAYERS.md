# Web child side — Phase 6: phones (video player, built-in book player, profile picker)

Built from `WEB_CHILD_PLAYER_MOBILE_PLAN.md` (the plan, with its decisions: "turn your phone" card for the upright
book: yes; Android full screen and sideways lock: yes; SCORM and HTML5 players: not included; inside Phase 6), plus
one fix found on a real phone: the "Pick your profile" page. Web only; no backend change, no new library.

## The rule

A phone change may only reach a **touch phone** (a finger, no hover) in the situation that needs it. A computer
(whatever its window size), a tablet and the upright-phone video card keep the code and layout they had. This is
enforced by one shared switch and by tests that record the computer layout.

## What changed

| Piece | File |
|---|---|
| The switch: `desktop` / `phone-portrait` / `phone-landscape`, from `matchMedia` (touch + orientation + size; tablets are `desktop`) | `hooks/usePlayerViewport.js` (new) |
| Video player on a sideways phone: full-screen black stage, slim title bar (title, finish button, full screen, close), no footer, no 400 px minimum; same video/iframe element kept on rotation | `components/child/common/VideoPlayerModal.jsx` |
| Book on an upright phone: "Turn your phone sideways" card laid over the book (the book stays mounted: page, audio, state kept); Close button 44 px and notch-safe on a sideways phone | `components/child/common/cms/CmsBooksModalPlayer.jsx`, `TurnPhonePrompt.jsx` (new) |
| Book content page on a sideways phone: smaller text (a size set in the book is scaled by the screen height), smaller logo and dots, less padding | `components/admin/common/cmsTest/ContentTest.jsx`, `shared.js` (`phoneLandscapeOnly`, shared with the admin preview, phone-only CSS) |
| Real full screen and a sideways lock, asked inside the tap, only on touch phones whose browser can (Android Chrome); given back on close, on a failed open and on leaving | `utils/playerFullscreen.js` (new), `ChildModuleLibrary.jsx` (book tap), `VideoPlayerModal.jsx` (button in the sideways bar) |
| Pick-your-profile page: the card took a fixed 384 px + 64 px padding (wider than a phone) and the page was locked to the screen height (logo cut off, lower buttons unreachable). Now fluid width and a scrolling page on a narrow screen (width up to 600 px) and on a sideways touch phone; long names wrap | `assets/css/ParentsChild.css`, `components/parents/child/ParentsChildList.jsx` |

Measured in a real browser (phone emulation): sideways video area 667 x 331 px (was about 130 px high); the profile
page at 360 x 740 (an Oppo Reno 8z), 375 x 667 (iPhone SE 2nd gen) and 320 x 568: no part past the right edge, the
page scrolls, "Add New Kid" and "Parent Login" reachable, five kids and a long name fine. A 1024 x 768 computer
window: every measured box identical before and after.

## What this does not do

- iPhone Safari cannot make a page full screen or lock rotation: there the child turns the phone by hand and the
  full screen button is not shown. A computer and a tablet are never asked for full screen.
- The drag-and-drop page and the "well done" pop-up of the book were not looked at on a phone yet.
- The profile page fix also applies to a computer window narrower than 600 px (the stylesheet already had that
  breakpoint). A normal computer window is unchanged.
- Not changed, noticed: the same page on a **computer** with a short window (for example 1366 x 768) and three kids
  is still locked to the screen height, so the logo's top and the lower part can be cut off. It was left as it is
  because the computer view was not to change. The login page has the same lock (with a flexible width).
- SCORM and HTML5 players: not included.
- Nothing was tried on a real iPhone, and the Android full-screen behaviour is untested on a real phone.

## Tests

- `hooks/usePlayerViewport.test.jsx` (15) - every screen kind (computers, small windows with a mouse, tablets,
  phones upright and sideways), the first render, rotation, no `matchMedia`.
- `components/child/common/VideoPlayerModal.layout.test.jsx` (34, new) - records today's computer, tablet and
  upright-phone layouts (90vh, 2rem title, 400 px minimum, the 480 px card...), the new sideways stage, the full
  screen button (only where it can work), and that rotating keeps the same video element and Bunny frame.
- `components/child/common/cms/CmsBooksModalPlayer.test.jsx` (+9 = 14) - the card appears only on an upright touch
  phone, covers the loading panel, goes away on rotation, keeps the page and its state, Close still works.
- `components/admin/common/cmsTest/bookLayout.test.jsx` (6, new) - the page frame rules are unchanged; every phone
  rule of the content page sits inside the sideways-phone media block and the base rules are untouched.
- `utils/playerFullscreen.test.js` (19, new) and `components/child/module/ChildModuleLibrary.test.jsx` (+7 = 22) -
  who counts as a touch phone; asked inside the tap, not on computers or tablets, not when refused; given back.
- `assets/css/ParentsChild.css.test.js` (6, new) - the computer rules of the profile page are pinned and every
  phone fix is inside a phone-only block.
- `test/matchMediaStub.js` - a fake `matchMedia` with a pretend screen (width, height, touch) for all of the above.
- Broken on purpose (35 + 9 ways: the switch matching a mouse or a tablet, the sideways layout leaking to a
  computer, the footer or the 400 px minimum coming back, the video or Bunny frame rebuilt on rotation, full screen
  offered without support or on a computer or not given back, the card on every screen or replacing the book, phone
  CSS written outside the phone block, full screen asked after the book arrives, and the same for each profile page
  rule). All were caught; one change (`noSsr`) changed nothing, so that unneeded code was removed.
- Whole web suite: 63 files, 806 tests pass (was 58 files, 710 tests). `vite build` compiles; the first file grew
  by about 1.3 kB (a small shared book helper now imports the switch).

## Check by hand (on a phone)

1. `cd frontend`, then `npm run dev -- --host`, and open the `Network:` address on the phone (same Wi-Fi).
2. Sign in as a parent: "Pick your profile" fits the screen, no part cut on the right, the logo fully visible, scroll
   down to "Add New Kid" and "Parent Login". Turn the phone sideways: it scrolls.
3. Open a child, a video: upright = the card as before; sideways = full screen with a slim bar; rotate while it plays
   (it keeps playing). On Android the bar has a Full screen button.
4. Open a built-in book: upright = "Turn your phone sideways"; sideways = the book fits (check every page type, the
   drag-and-drop page and the well-done pop-up); rotate in the middle of a page. On Android the tap goes full screen
   and sideways.
5. On a computer: nothing looks different from before.

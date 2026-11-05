# Web child side — plan: phones for the video player and the built-in book player

**Status (2026-11-05): decided and built as part of Phase 6.** Decisions: the upright book gets a "turn your phone"
card (yes), the Android full screen and sideways lock is included (yes), the SCORM and HTML5 players are not
included, and the work lives inside Phase 6. What was built, what was tested and what was simplified from this plan
is in `WEB_CHILD_PHASE6_PHONE_PLAYERS.md`; the plan below is kept as it was written.

It covers the two full-screen experiences a child
opens on the web: the **video player** (`VideoPlayerModal`) and the **built-in book player**
(`CmsBooksModalPlayer` and its pages). It is written to be done **without changing how either one looks or
behaves on a computer, or on a phone held upright for the video**.

## 1. The rule that governs every step

> A change may only take effect on a device that is a phone (touch, no hover) in the situation that needs it.
> On a computer, in a tablet, and in the one phone case that is already handled (video, portrait), the code
> path that runs after the change is the **same code that runs today**.

How that is enforced, not just promised:

1. **Gate by device, not by window size.** Today the video player decides "mobile" by width alone (`width < 600`).
   A computer browser window dragged narrow would also count, and that is fine today, so it stays exactly as is.
   The new cases use `(hover: none) and (pointer: coarse)` (a finger, no mouse) together with the orientation.
   A computer with a mouse never matches, however small its window is. A touch laptop is the one grey area
   (see section 8).
2. **Old branch untouched.** The new behaviour is added as a new branch next to the current one. The current
   branch is not edited, moved or "tidied" in the same step.
3. **Tests first, before any change** (step 0 below): tests that record what the player renders today on a
   computer and on a phone held upright. They must pass before and after every later step.
4. **Break-it checks** as in the earlier phases: flip each gate on purpose and confirm that the computer test fails.
5. **One shared switch** (one small hook, section 4) so there is one place to look to know who gets what.

## 2. What exists today (read from the code)

### Video player (`components/child/common/VideoPlayerModal.jsx`)

- Two layouts, chosen with `useMediaQuery(theme.breakpoints.down('sm'))`, i.e. **width under 600 px**:
  - *Narrow* (a phone held upright): a rounded card 480 px wide at most, `height: auto`, the video area locked
    to `16 / 9`, a slim title bar, a text Close button, a full-width "finish" button under the video.
  - *Wide* (everything else): `maxWidth lg`, `height: 90vh`, a large title bar (padding 32 px, 2 rem title), a
    content area with `minHeight: 400px` for file videos, and a footer bar (Close and the finish button).
- Two kinds of video: a **Bunny embed** (an iframe that has its own fullscreen button, `allow="…fullscreen"`) and
  an **uploaded file** (`<video>` with `controls={false}`, `controlsList="… nofullscreen …"`, `playsInline`,
  `pointerEvents: none`, so the page draws its own controls and the browser's fullscreen button is off).
- Other sizes use `vh` (`calc(100vh - 32px)`, `90vh`), not `dvh`.
- The pop-up can hand over to the SCORM, HTML5 or built-in book players when a video has follow-up content.

### Built-in book player (`components/child/common/cms/CmsBooksModalPlayer.jsx` + `components/admin/common/cmsTest/*`)

- A full-screen dialog (`fullScreen`, content `height: 100dvh`). Every page sits in one **16:9 frame**
  (`pageFrameSx`, `shared.js`): `width: min(100%, 100dvh × 16/9)`, `height: min(100dvh, 100vw × 9/16)`.
- Good news: the pages are mostly built in **percentages of that frame** (the intro play button is 7.5 % wide, the
  drag-and-drop stage measures itself and re-measures on `resize`, drag uses **pointer events** with
  `touchAction: none`, so a finger works).
- Not proportional: some sizes are fixed `rem`/`px` or switch at the screen's width breakpoints (content text
  `1.7rem / 2.4rem`, content buttons `176 / 240 px`, shared action buttons `116 / 144 px`, result toast text), so
  they do not shrink with a small frame.
- The close button is a fixed 10–14 px from the top-right of the screen.
- The same pages are used by the admin preview (`CmsBooksModalTest`), so any change to the pages is shared with admin.

## 3. What goes wrong on a phone (code-based; items marked ◻ must be confirmed on a device in step 0)

| # | Situation | Video | Built-in book |
|---|---|---|---|
| 1 | **Phone held upright** | Handled already (narrow card). Keep as is. | ◻ The frame is 16:9 and the screen is tall, so the page is a **thin strip in the middle of the screen**, about 210 px high on a 375 px wide phone. Everything on it is tiny. |
| 2 | **Phone held sideways** (about 390 to 430 px high, 640 to 930 px wide) | ◻ Width is over 600 px, so the **wide layout** is used with `90vh` of ~325 px on a 360 px high screen: a 32 px padded title (~100 px) and a footer bar (~90 px) leave roughly 130 px for the video, while the file-video area asks for `minHeight: 400px`, so the content is clipped (`overflow: hidden`). | Best case today: the 16:9 frame fills the height. ◻ The fixed rem/px sizes (item above) are large for a 390 px high frame. |
| 3 | **Rotating while it is open** | ◻ Switches between the two layouts (the video element is re-created if the tree changes shape, which can restart playback). | ◻ Drag positions are re-measured on resize, but a drag in progress, audio that is playing, and the current page should survive. Not tested today. |
| 4 | **Full screen** | Uploaded files: no browser fullscreen button (disabled on purpose). Bunny: has its own button. | Already full screen as a dialog. No real browser fullscreen, so the address bar can still show. |
| 5 | **Notch / rounded corners, sideways** | Not handled. | The close button can sit under a notch. |
| 6 | **Browser bars appearing and hiding** | `vh` heights jump when the bar hides. | Uses `dvh`, fine. |

The browsers differ, and that decides the design:

- **iPhone Safari cannot make a page element full screen** (only a `<video>`) and **cannot lock rotation**. So the
  plan cannot depend on either; it must work as "fills the whole visible screen" using plain layout.
- **Android Chrome** can do both, but only inside a tap (a user gesture) and only for the orientation while in
  fullscreen. Opening a book or a video is a tap, so this can be added as a bonus, never as a requirement.

## 4. The shared switch

One small hook, `usePlayerViewport()` (new file, used by both players), returns one of:

| Value | When | Who uses it |
|---|---|---|
| `desktop` | anything that is not a touch phone, including tablets and computers | everything today, unchanged |
| `phone-portrait` | touch phone, taller than wide | book: new; video: unchanged (keeps its own width-based test) |
| `phone-landscape` | touch phone, wider than tall, height under about 500 px | video and book: new |

Rules for the hook: computed from `matchMedia` (`(hover: none) and (pointer: coarse)`, `(orientation: landscape)`,
`(max-height: 500px)`), updates on rotation, gives `desktop` if `matchMedia` is missing, and is covered by tests for
every combination (including "a desktop window 700 × 400 with a mouse is still `desktop`").

The video player keeps its `down('sm')` test **as it is** for the upright card layout. The hook only adds the
sideways case.

## 5. Video player plan

**Upright phone:** no change.

**Sideways phone (new):** the pop-up becomes a full-screen black stage.
- `fullScreen` dialog, `100dvh` high, no rounded corners, black background.
- The video area takes the whole screen (`object-fit: contain`, so the picture is never cut).
- The title and the Close button become a **slim bar** (about 44 px) above the video, kept clear of the notch.
  The current Close button, with its "are you sure" confirmation, is the same button, only smaller and moved.
  (Built as a row above the video, not laid over it with auto-hide: a Bunny embed swallows taps, so a hidden bar
  could not be brought back there.)
- The "finish watching" and follow-up buttons keep their meaning and sit over the bottom of the video.
- The footer bar and the large title padding are not drawn in this mode.
- Bunny embeds: the iframe fills the stage; its own fullscreen button keeps working.
- Uploaded file: with the stage already full screen, the disabled browser fullscreen button can stay disabled.

**Rotating while it is open:** the `<video>` element and the iframe must **not be re-created**, so the picture and
the playing position are kept. The layout changes around them (the element stays at the same place in the tree;
only styles change). Test: rotate while playing; time and play state must be the same after.

**Optional bonus (Android Chrome only, step 6):** when the child taps play in the upright card layout, offer a
"full screen" button that asks the browser for fullscreen and locks sideways. Not offered on iPhone and not on a
computer.

## 6. Built-in book player plan

**Sideways phone:** already the best case, since the frame fills the screen. Work here is only about the sizes.
- Test every page type (cover, content, demo video, drag activity with two and four targets, end/reward) at
  640 × 360, 667 × 375, 844 × 390 and 915 × 412.
- For sizes that do not shrink with the frame, add **phone-only overrides** (a `@container` rule on the frame,
  active only below a frame width of about 720 px, or the `phone-landscape` value), for example smaller content
  text and smaller action buttons. Above that width, which includes every computer, the existing values apply.
- Close button: keep its place, add the notch inset, keep a 44 px touch target.

**Upright phone (new):** two honest options, and the plan recommends the first.
1. **Ask the child to turn the phone** (recommended): a friendly full-page "Turn your phone sideways to read" card
   in the same style as the wait panel, with the Close button still available. When the phone is turned, the book
   continues from the same page (the state lives in the player and is not reset). No change to any page.
2. *Rotate the frame by 90° with CSS so it fills a tall screen.* **Not recommended:** the drag-and-drop works from
   screen coordinates, so a rotated stage would break dragging; audio-synced highlighting would need re-testing.
   It also changes the look. Rejected unless you want it.

**Optional bonus (Android Chrome only, step 6):** the tap on the book requests fullscreen and sideways. If the
browser refuses, nothing changes.

**Rotating while open:** current page, score and audio must be kept. The drag stage already re-measures on
`resize`; add the check that a rotation **during** a drag cancels it cleanly (the dragged piece returns to its
start) instead of leaving it stuck. Tests with a simulated rotation.

**Shared pages:** the pages are shared with the admin preview. Every phone-only rule is keyed on the hook or on
a narrow frame, so the admin on a computer sees no difference. This is confirmed by the same computer tests.

## 7. Order of work and estimates

| Step | Work | Est. |
|---|---|---|
| 0 | **Safety net.** Tests that record today's video player on a computer and on an upright phone (layout props, class names, sizes), and the book player's frame. A first real-device pass on one iPhone and one Android phone, to settle every ◻ in section 3, with photos for the record. | 4–5 h |
| 1 | `usePlayerViewport()` with its tests and break-it checks. Nothing uses it yet. | 2 h |
| 2 | Video, sideways: full-screen stage, slim bar over the video, finish button position, no re-creation on rotation. Tests and break-it checks (a computer must still get today's layout). | 5–6 h |
| 3 | Book, upright: "turn your phone" card, state kept across rotation. | 3 h |
| 4 | Book, sideways: size review of every page type and the phone-only overrides, close button inset and target size. | 5–6 h |
| 5 | Rotation tests for both players (play state, page, drag in progress, audio). | 3–4 h |
| 6 | Optional Android bonus: fullscreen plus sideways lock on the tap, with a safe fallback. | 2–3 h |
| 7 | Docs, a "check by hand" list with the device matrix, final computer-parity run. | 2 h |
| | **Total** | **about 26–31 h** (about 24 h without the optional bonus) |

Suggested placement: **before Phase 6** (polish), because Phase 6 and later touch the same screens. Steps 0 and 1
can be done first and are low risk; the rest only change a screen after step 0's tests are green.

## 8. Test and device matrix

| Device / window | Orientation | What must be true |
|---|---|---|
| Desktop 1920 × 1080 and 1366 × 768, mouse | n/a | Identical to today, pixel for pixel (the step 0 tests and a before/after screenshot). |
| Desktop browser dragged to 700 × 400, mouse | n/a | Still the desktop layout (the hook says `desktop`). |
| iPad 768 × 1024 and 1024 × 768 | both | Unchanged (not a phone case; height over 500 px). |
| iPhone SE 375 × 667, iPhone 14 390 × 844 | upright | Video: today's card. Book: "turn your phone". |
| iPhone SE 667 × 375, iPhone 14 844 × 390 | sideways | Video: full-screen stage. Book: fills the screen, sizes ok, close clear of the notch. |
| Small Android 360 × 640, Pixel 7 412 × 915 | both | Same as the iPhones; plus the fullscreen bonus (step 6) on Chrome. |
| Any phone | rotate while open | Video keeps its time and play state; book keeps its page; no stuck drag. |

Grey area to decide: a **touch laptop** reports a mouse and a finger. The hook asks "is the main pointer a
finger", which is false for a laptop with a trackpad, so it keeps the desktop layout. That is the safe side.

## 9. Not in this plan

- The SCORM and HTML5 players (`ScormPlayer`, `html5Player`) also open in dialogs of the same kind and have the
  same sideways problem. They are **not** included, since the request is for the video and the built-in books. The
  same hook can be reused later; say if you want them added (about 4–6 h more).
- A real fullscreen on iPhone (not possible in Safari for page content).
- Tablets and any change to the page header, bottom bar or other child pages.
- Changing `index.html` (for example `viewport-fit=cover`): that is a site-wide change. The notch gap is handled
  inside the players only.

## 10. Decisions (answered 2026-11-05)

1. **Upright phone, built-in book:** the "turn your phone" card. **Yes.**
2. **Android fullscreen and sideways lock (step 6):** include it. **Yes.**
3. **SCORM and HTML5 players:** **not included.**
4. **Where to put it in the order:** **inside Phase 6.**

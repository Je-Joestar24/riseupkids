# Web child side — Phase 5: placeholders for Profile, Printables and the book wait

Fifth step of `WEB_CHILD_PERFORMANCE_AUDIT.md` (the "Skeleton loading, page by page" table: Profile and
Printables rows, and the book wait row). Home, My Journey, the course page, Explore and Kids Wall already
had theirs from Phases 1 to 3. Web only; no backend change, no new environment variable, no new library.

## Before

- **Profile** showed a full-screen spinner on every visit, even when the child had just looked at it.
  A failed load showed a red box with no way to try again.
- **Printables** showed the plain text "Loading printables..." on every visit. It did have a Retry button.
- **Opening a built-in book** did nothing visible between the tap and the moment the book's pages arrived
  (the page was fetched first, and the reader only opened after that). On a slow connection the child saw an
  unchanged page, and tapping again fetched the book again and started its media a second time.

## After

| Page | First visit | Repeat visit | A failed first load |
|---|---|---|---|
| Profile | Placeholder in the shape of the page: name card with the three stat boxes, next-level bar, badge grid, latest wins | The last profile is drawn at once and replaced when the refresh arrives | Reason and **Try again** (in a card, inside the page) |
| Printables | Three placeholder cards (picture, title and description, Download button); the page header and footer stay | The last list is drawn at once and replaced when the refresh arrives | Reason and **Retry** (as before) |
| Built-in book | The reader opens at once with "Opening your book..." and a moving bar, then shows the media percentage as before | n/a | The reader closes (the existing error message is still shown) and the book can be tapped again |

Placeholder rules, the same as the other pages: it appears only if loading takes longer than 150 ms, only on a
first load (never when something is already on screen), the pulse stops when the device asks for reduced
motion, and it is announced to screen readers ("Loading your profile", "Loading printables").

## What changed

| Piece | File |
|---|---|
| Profile placeholder | `components/child/childprofile/ChildProfileSkeleton.jsx` (new) |
| Printables placeholder | `components/child/printables/PrintablesSkeleton.jsx` (new) |
| Profile page on the shared page cache | `pages/child/ChildProfile.jsx` |
| Printables page on the shared page cache | `pages/child/ChildModulePrintables.jsx` |
| Book opens at the tap; second tap ignored; closing cancels | `components/child/module/ChildModuleLibrary.jsx` |
| Reader shows the "Opening your book" wait | `components/child/common/cms/CmsBooksModalPlayer.jsx` |
| Wait panel can show a moving bar without a percentage | `components/admin/common/cmsTest/CmsPlayerPreloadPanel.jsx` (new optional setting; the default look is unchanged, and it is the same panel the admin preview uses) |

**Same cache as Home, Explore and Kids Wall.** Profile and Printables use `useCachedLoad` (Phase 3): one
entry per child (`<childId>:profile`, `<childId>:printables`), emptied on logout, in memory only. A refresh
that fails behind real content is silent; only a first load that fails shows a message.

**Profile still asks for its three things together** (profile, all badges, latest badges). If any one fails the
first load shows the reason; before it was the same, only without a retry.

**Book opening.** The tap now opens the reader straight away. The pages are fetched while the child sees the
panel. Three guards keep it safe:
- a second tap on the same card while the book is on the way is ignored (one fetch, one media preload);
- closing the reader while the book is on the way cancels that tap, so the late answer does not open the reader
  again by itself;
- if the book cannot be fetched the reader closes, and tapping the card works again. A failure of the media
  alone (after the pages arrived) does not close the reader, as before.

## What this does not do

- It does not change what the book wait panel says or does once the pages are there (title, percentage,
  "Next" locked until everything is loaded). Keeping the panel for the first page only, and loading the rest
  quietly, needs the real media preload (plan steps 7 and 8, still to do).
- The live-class card on Home is still not cached.
- The Printables thumbnails are still plain pictures (no staggered load or fade yet); the shared picture
  component is for the polish step.
- Only built-in books get the immediate reader. Web-package books (HTML5) open their own player as before.

## Tests

- `pages/child/ChildProfile.test.jsx` (17, new) - the three requests start together; no placeholder before 150 ms,
  placeholder after; the profile, badges and latest wins replace it; waits for the slowest of the three; the very
  first frame draws nothing; a repeat visit draws the last profile at once and swaps in the refresh; a failed
  refresh stays silent; one child never sees another's cached profile; a failed first load shows the reason (text,
  server body, empty) and **Try again** works (placeholder in between, error again if it fails again); no child in
  the address draws and asks for nothing.
- `pages/child/ChildModulePrintables.test.jsx` (19, new) - the same set for Printables, plus: the module is chosen
  by id, then by step number, then the first one; Download opens the file in a new tab; Back returns to the course;
  a missing child id is reported with no Retry; an empty list draws no cards and no error.
- `components/child/module/ChildModuleLibrary.test.jsx` (+9) - the reader opens at the tap with the wait flag set and
  no pages; the pages and media start when the book arrives; a second tap fetches nothing more; closing while the
  book is on the way keeps the reader closed when the answer comes late; a new tap after closing works and the old
  answer is ignored; a failed fetch closes the reader and the card can be tapped again; a failure of the media
  alone keeps the reader open; a book with no pages opens without a preload; a non-built-in book fetches nothing.
- `components/child/common/cms/CmsBooksModalPlayer.test.jsx` (5, new) - fetching shows "Opening your book" with no
  percentage and no "No pages" message; media loading shows the percentage; the first page shows when nothing is
  waited for; an empty book says so; the close button works during the wait.
- `components/admin/common/cmsTest/CmsPlayerPreloadPanel.test.jsx` (4, new) - the default look is unchanged
  (measured bar, percentage, 0 to 100); the new setting gives a moving bar and no percentage.
- Broken on purpose to confirm the tests catch it (thirty-five ways, in Profile, Printables, the book opening, the
  reader and the panel): a cache key shared by all children, a placeholder that never leaves or is missing, no
  error block, a Try again or Retry that does nothing, requests sent one after another, a lost fallback sentence,
  a placeholder with no delay, a second tap not ignored, a late answer opening a closed reader, closing not
  ending the tap, a failed fetch leaving the reader open or the wait on, the reader not opening at the tap, the
  wait never ending or not reaching the reader, a media failure closing the reader, the wrong module chosen, the
  percentage shown during the wait, and a bar that does not move. Three were missed at first (no child id on
  Printables, the step-number fallback, and the moving bar) and tests were added; all thirty-five now fail the
  expected test.
- Whole web suite: 58 files, 710 tests pass (was 54 files, 656 tests). `vite build` compiles; the first file is
  still 438 kB (121 kB compressed), so the sizes in `WEB_CHILD_PHASE4_CODE_SPLITTING.md` are unchanged.
- Not tried in a real browser: the Profile, Printables and book pages need a signed-in child account. The "Check by
  hand" steps below cover them.

Run with `npm test` in `frontend/`.

## Check by hand

1. Sign in as a parent, open a child, tap **Profile** for the first time. On Slow 3G in the Network tab
   (cache disabled) the name card, level bar and badge squares show as grey shapes, then fill in. Leave and come
   back: the last profile is on screen at once.
2. Block the profile request (Network tab: block `/children/…/profile`) and open Profile on a child you have
   not visited in this session: a message with **Try again** shows. Unblock and tap it: the shapes show, then
   the profile.
3. Open a course and its printables (Slow 3G): three grey cards show under the header, then the cards. Open it
   again: the list is there at once.
4. Open a built-in book on Slow 3G: the reader opens at once with "Opening your book...", then the usual
   "Loading all content..." with the percentage, then the book. Tap the book, then close before it opens:
   the reader stays closed.
5. Block the book request and tap the book: the reader opens, then closes with the usual error message;
   unblock and tap again: it opens.

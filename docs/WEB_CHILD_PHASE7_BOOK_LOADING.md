# Web child side — Phase 7: built-in book loading

Audit items D1, D2, D3 (`docs/WEB_CHILD_PERFORMANCE_AUDIT.md`), following the phone app's design
(`docs/CMS_BOOKS_PRELOAD_SPEEDUP_PLAN.md`, Phases 1 and 2). Web only. No backend change: the server already sends
each book with its media list (`mediaManifest`) and `contentVersion`, and the web now uses them.

## What was wrong

| | Before |
|---|---|
| Sound and video "preload" | A `HEAD` request with `no-cors` and `no-store`: it downloaded nothing and kept nothing. Only pictures were really preloaded. Every page fetched its own sound and video again when it played. |
| First page | The child waited for 100 % of the book (every picture, sound and video). |
| Next | Blocked only during that first wait. After it, a heavy page (demo, reward) could open before its video arrived. |

## What it does now

1. **A real download, nearest page first** (`utils/cmsBookMediaLoader.js`). Each sound and video is fetched whole and kept in
   memory as a local copy (a `blob:` address); the page plays that copy. Pictures are loaded and decoded ahead.
   - Order: the page in view, the one Next opens (its video first when it is a video page), the one after, then the rest
     in page order; pages already seen last. The queue re-orders when the child moves (`setFocus`).
   - Pace: 6 pictures/sounds at a time; videos one at a time, plus one more when the video is for the page in view or the
     one Next opens and a far-away video is still downloading. A big video never starves the page in front of the child.
   - A file is **never** a reason to get stuck. An embed (Bunny), a file over 100 MB (or a book past 400 MB held), a file
     the server refuses (no CORS permission, 403/404/500, offline), or one that stops sending for 30 s (after one quiet retry) is
     simply played from its original address, and counts as settled for its page.
   - Closing the book (or the book changing) cancels every download and frees every local copy.
2. **The book opens on page 1** (`CmsBooksModalPlayer`, `hooks/useCmsBookMedia.js`). The wait panel covers page 1's files
   only ("Getting your book ready..."), with its own percentage; the rest keeps downloading behind the page.
3. **Next is locked per page.** Next (intro, content and demo pages) is disabled, with a small spinner on the button, until the
   next page's files are in. A correct drag-and-drop answer that comes early is queued ("Getting the next page ready...")
   and carried out as soon as the page is ready. After 10 s (12 s when the next page is a video page; the app's values) the
   page opens anyway and plays from the internet.
4. **Pages play the local copy** (`hooks/cmsMediaSrc.jsx`): content sound, intro music, demo video, reward video and cheer,
   and the drag-and-drop option and answer sounds. A page decides its address when it starts; a copy that arrives later is
   not swapped in under a sound that is already playing. A local copy that fails to play falls back to the original address.
5. **The server's media list is used** (`utils/cmsBookMediaPlan.js`): each file's page comes from the list's keys
   (`pages.<pageId>...`, older `order-N` keys too), topped up from the page data so a file a page needs is always tracked.
   `contentVersion` is carried in the plan (Phase 8 will key a saved copy on it).

6. **The Home button on the last page** now uses the picture bundled with the site (`assets/images/book/home.png`) instead of
   one fetched from the server's `/book-seeds/home.png`. When the server did not serve it, only the words "Home button" showed.

Not changed: the admin preview and admin book tester still run the whole-book preload and show the "Loading all content" panel;
their pages have no reader around them, so they use the original addresses exactly as before. The phone app is untouched.

## Files

New: `utils/cmsBookMediaPlan.js`, `utils/cmsBookMediaLoader.js`, `hooks/useCmsBookMedia.js`, `hooks/cmsMediaSrc.jsx`,
`components/admin/common/cmsTest/CmsNextButtonWait.jsx`, test helper `test/fakeNetwork.js`.
Changed: `utils/cmsPlayerMedia.js` (per-page list; whole-book list unchanged), `utils/cmsMediaPlayback.js` (fallback from a local
copy), `CmsBooksModalPlayer.jsx` (loader, first-page wait, Next gate, queued advance), `ChildModuleLibrary.jsx` (hands the
book to the reader instead of the old whole-book preload), `ContentTest`, `IntroTests`, `DemoTest`, `RewardTest`, `InteractiveTest`.

## Things to know

- **Cross-origin files need permission.** The download is a normal cross-origin `fetch`, so the file host must allow the website
  (`Access-Control-Allow-Origin`). The server's own `/uploads` does (its CORS list). The manifest prefers `cloudUrl`; if production
  media is on S3/CloudFront, that bucket needs a CORS rule for the website's address. If it has none, nothing breaks: those files
  play from the internet as before, just without the head start. (This needs checking on the real host.)
- **Memory.** A book's sound and video are held in the browser's memory while it is open (cap 100 MB per file, 400 MB per book;
  beyond that a file is streamed). Closing frees them.
- **Nothing is kept between visits yet.** Opening the same book again downloads it again (the browser's own HTTP cache helps for
  pictures and any file the server marks cacheable). Keeping a copy between visits is Phase 8 (Cache Storage, keyed by `contentVersion`).
- Sound and video files are served without a long cache lifetime (only pictures got the 30-day header). Marking them the same way
  (their names are unique) would help repeat visits until Phase 8; optional one-line backend change.

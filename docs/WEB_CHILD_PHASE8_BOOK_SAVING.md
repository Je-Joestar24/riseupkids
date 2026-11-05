# Web child side — Phase 8: keeping books saved between visits

Audit item D4 (`docs/WEB_CHILD_PERFORMANCE_AUDIT.md`), following the phone app's saved-book behaviour
(`docs/CMS_BOOKS_PRELOAD_SPEEDUP_PLAN.md`). Web only. No backend change: it uses the file dates and `contentVersion` the
server already sends with each book.

## What was wrong

Phase 7 made a book download properly while it is open, but nothing was kept. Every visit to the same book downloaded
every sound and video again, so a returning child on a phone or a weak connection waited and used data each time.

## What it does now

1. **Sound and video are kept on the device** (`utils/cmsBookMediaStore.js`, the browser's Cache Storage). As soon as a
   file has fully arrived it is saved in the background; the book never waits for the saving.
2. **The next visit needs no download.** The downloader (`utils/cmsBookMediaLoader.js`) looks on the device first. A saved
   file is read straight from storage and played from memory exactly like a downloaded one, so page 1 opens and Next
   unlocks almost at once, and it works with the internet off.
3. **An edited book downloads only what changed.** Each saved file carries a "stamp": the file's own `updatedAt` from the
   book's media list, or, when the list gives none, the book's `contentVersion`. A saved file is used only when its stamp
   equals the server's current one. Replaced files are removed from the device when the book is opened next.
4. **Nothing damaged is ever played.** The saved list (an index kept in the same cache) records each file's stamp and exact
   size. A file that is missing, a different size (half-saved), or listed in a broken index is ignored and downloaded again;
   a broken index clears the saved books and starts clean.
5. **The total is capped** at 600 MB. When a new file will not fit, the books opened longest ago are removed first, never
   the book being opened. A single file larger than the cap is simply not kept.
6. **Nothing can leave a child stuck.** No Cache Storage (an insecure address, an old browser), a full device, a private
   window, storage that fails or never answers (the downloader waits at most 4 s for a saved copy, then goes to the internet):
   every case falls back to exactly the Phase 7 behaviour.

Pictures are not kept by this layer; the browser's own picture cache and the server's 30-day picture header already do that.
Embeds (Bunny) are never saved. Closing the book still frees the memory copies; the saved files stay on the device.

## Files

New: `utils/cmsBookMediaStore.js`; test helper `test/fakeCacheStorage.js`.
Changed: `utils/cmsBookMediaLoader.js` (reads saved copies, keeps downloads, `fromDevice` in the summary),
`hooks/useCmsBookMedia.js` (hands the device's store to the downloader).

## Tests

- `utils/cmsBookMediaStore.test.js` (25): saving and reading, stamps, damaged / vanished / broken-index copies, full device,
  storage off, no Cache Storage, size cap and which book goes first, edited books, files shared by two books.
- `utils/cmsBookMediaLoader.saved.test.js` (23): first visit keeps, next visit makes no request (also offline), edited book
  re-downloads only what changed, stuck or throwing storage, cancel while reading a saved copy.
- `components/child/module/cmsBookSaved.e2e.test.jsx` (12): the real module page, reader and pages across visits — first
  visit saves, next visits make no request and play the device's copy, edited book, devices that cannot keep files.
- Break-it checks on a scratch copy of the code (see the summary in the session) and a real-Chrome check against real Cache
  Storage with the media on another origin: second visit made no sound or video request, the sound (2.5 s) and video
  played from the saved copies, an edited video was the only file asked for again, and an over-limit store removed the old book.

## Things to know

- **File host permission.** Saving needs the downloaded file to be readable by the page, i.e. the S3 / CloudFront media host must
  allow `https://app.riseup.kids` (CORS) — see Phase 7. Without it nothing breaks; those files just stream and are not saved.
- **Per device and browser.** Each browser keeps its own copy. Browsers may clear a site's storage under pressure, and some
  (Safari) clear it after a period of no use; the book then simply downloads again.
- **Memory vs disk.** Opening a saved book still loads its sound and video into memory while it is open (Phase 7 limits apply:
  100 MB per file, 400 MB per book); only what is on the device is the long-term copy.
- **No clean-up on sign-out.** The files are not personal (the same book media every child sees), so they are not removed when
  a child or parent signs out.

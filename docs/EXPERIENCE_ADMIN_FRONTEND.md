# Experiences — admin pages (list, add, edit)

Two admin pages (admins only) for the experiences children see under Explore. The backend they talk to is described
in `EXPERIENCE_ADMIN_BACKEND.md`.

- **The list**: `/admin/experiences` — search, status tabs, paging, publish / hide and delete.
- **The add / edit form**: `/admin/experiences/create` and `/admin/experiences/:uuid/edit` — one full page, the same
  layout for both.

## The list

- **Sidebar:** a top-level item **Experiences**, right below Courses. It stays highlighted on the pages under it (the
  form), but not on look-alike addresses.
- **Header:** title, one-line explanation, "Total: N experiences" (everything, not only this page) and **Add
  experience**, which opens the form.
- **Search and tabs:** search by title (sent 300 ms after the admin stops typing, trimmed, up to 100 characters, with a
  clear button) and **All / Published / Drafts** tabs with their counts. The counts ignore the search and the tab.
- **Cards** (3–4 per row on a desktop, one per row on a phone): cover picture (or "No cover picture"), status chip,
  position (`#3`), title (cut at two lines), description (three lines, or "No description"), number of videos, when it
  was last changed, a **Published** switch, **Edit** (opens the form) and **Delete**.
- **Pagination:** rows per page (8, 12, 24, 48), "Showing x to y of z" and the page buttons; hidden when there is
  nothing to page.

| Situation | What shows |
|---|---|
| First load | Skeleton cards ("Loading experiences") |
| First load failed | The reason (or "Could not reach the server...") and **Retry** |
| Nothing created yet | "No experiences yet" with an explanation |
| Search / tab matches nothing | "No experiences match" and **Clear filters** |
| Refreshing | The rows stay; a thin progress bar shows above them |
| Refresh failed | The rows stay with a warning "may be out of date" and **Retry** |
| Coming back to the page | The rows it already has show at once, then refresh (so after saving the form the list is current) |
| A row is working | Its switch, Edit and Delete are disabled and say "Publishing…" / "Hiding…" / "Deleting…"; other rows stay usable |
| Last row of a page deleted, or a page that no longer exists | Goes to the last real page |

| Action | Result |
|---|---|
| Publish / hide | "… is now visible to children." / "… is now hidden from children." The list and counts refresh. |
| Publish blocked (422) | A warning with the backend's reasons ("Add at least one video before publishing."). It stays a draft. |
| Already deleted by someone else (404) | "This experience no longer exists…" / "… was already deleted." The list refreshes. |
| Delete | A confirmation first, naming the experience, saying the pictures are deleted and the videos stay in Bunny, and warning when children can see it now. After confirming: "… was deleted." |
| Any other failure | The backend's message in an error notification; the row stays as it was and is usable again. Unreachable server: "Could not reach the server. Check your connection and try again." |

An answer to an older request (typing quickly in the search) never replaces the answer to a newer one. A refresh that
follows a row action uses the filters as they are **then**, not as they were when the action began.

## The add / edit form

A **full page** (decided with the client: an experience holds a list of videos, a cover and a printable, which would
be long and cramped in a pop-up). Two columns on a desktop, one on a phone; a **Save bar** stays in view at the bottom.

**Left: the content**

1. **Details** — *Title* (required, counter x / 200) and *Description* (counter x / 1000).
2. **Videos** — an ordered list, "n of 20". Each row: a drag handle and its **position** (1, 2, 3 …, renumbered as rows
   move), *Video n title*, *Video n Bunny link*, **Preview**, **up / down** arrows (so it works without a mouse or
   touch) and **Remove**. Rows can be dragged (`@dnd-kit`, with pointer and keyboard). "Add video" puts the cursor in
   the new row's title; at 20 it is blocked and says why. An empty list says "No videos yet".

**Right: the settings**

1. **Status** — the *Published* switch, what it means, and — when it is on and something is missing — what to add
   ("To publish it, add at least one video. Or turn Published off to save it as a draft."). For an experience being
   edited it also shows when it was last changed.
2. **Cover picture** — choose / replace / remove, with a preview (JPG, PNG or WebP, up to 8 MB, checked in the browser
   before anything is sent).
3. **Printable (optional)** — what children print, chosen with **two radio buttons: "Link" or "Upload a file"**
   (never both), then the button text (empty shows "Print here", up to 60 characters) and a picture.
   - **Link**: a link to a file on our own website (https).
   - **Upload a file**: a **PDF or Word document (DOC, DOCX), up to 20 MB**. A chosen file shows its name and size; a saved
     one shows its name and an **Open it** link (new tab) so the admin can check it; both can be replaced or removed.
   - Switching keeps what was typed and chosen (switching back loses nothing). Choosing "Link" over a saved file says,
     before saving, that the saved file is removed when the experience is saved.

**Bottom bar:** "You have unsaved changes" / "No changes yet" / "Saving…", **Cancel** and **Create experience** / **Save
changes**. While editing, Save waits until something has changed.

### Rules the form checks before sending (the same ones the server applies)

| Field | Rule |
|---|---|
| Title | required; up to 200 characters (spaces around do not count) |
| Description | optional; up to 1000 |
| Videos | at most 20; each needs a title (up to 200) and a Bunny embed link; the same video twice is refused on the second one |
| Bunny link | `https://iframe.mediadelivery.net/embed/LIBRARY/VIDEO`. A link on the `player.` address is the same video: it is shown, and saved, as the embed link when the admin leaves the box. Spaces and `#…` are dropped. |
| Printable link | only while "Link" is chosen; optional; a valid https link, up to 2048 characters. Which websites are allowed is decided by the server (`riseup.kids` by default) and shown next to the box if it refuses. A link typed before switching to "Upload a file" is not checked and not sent. |
| Printable file | only while "Upload a file" is chosen; optional; the name must end in `.pdf`, `.doc` or `.docx`; not empty; at most 20 MB (exactly 20 MB is accepted). The server also checks that it really is that kind of file. |
| Printable button text | optional; up to 60 |
| Published | needs at least one video |
| Pictures | JPG, PNG or WebP; at most 8 MB (exactly 8 MB is accepted) |

Nothing is shown until the admin has tried to save once; from then on every problem is shown next to its field and
**disappears the moment it is fixed**. A failed try takes the cursor to the first field with a problem, and a line at
the top says how many there are.

### What is sent

One multipart request (create: `POST /api/admin/experiences`, edit: `PUT /api/admin/experiences/:uuid`): `title`,
`description`, `isPublished` (`"true"` / `"false"`), `videos` and `printable` as JSON text, the picture files
(`coverImage`, `printableImage`) only when a new one was chosen, `removeCoverImage` / `removePrintableImage`
(`"true"`) when a saved picture was removed, and on an edit the `expectedUpdatedAt` that was loaded.

The printable is sent as **one of two shapes**, never both:

| Chosen | `printable` (JSON) | Other parts |
|---|---|---|
| Link | `{ link: "https://…", button }` | `removePrintableFile: "true"` when a file is saved (choosing "Link" replaces it) |
| Upload a file | `{ link: "", button }` | `printableFile` (the file) when a new one was chosen; `removePrintableFile: "true"` when the saved one was removed; nothing when the saved one is kept |

The file is sent with the type its ending says (`application/pdf`, `application/msword`, the DOCX type), because a browser
does not always know the type of a Word file.

- **The order of the list is the order of the videos.** A saved video is sent with its `id`, so it stays the same row;
  a new one has none. `position` is never sent: the server numbers the rows 1, 2, 3 …
- A new picture replaces the saved one (which the server deletes after saving); a removal removes it.

### Every state the form can be in

| Situation | What shows |
|---|---|
| Add | The empty form, ready; nothing is asked of the server |
| Edit, loading | A skeleton, then the whole experience |
| Edit, not found (404) | "This experience no longer exists…" and **Back to experiences** |
| Edit, load failed | The reason and **Retry** (and Back) |
| The form has problems | Marked next to each field, a count at the top, the cursor on the first |
| The server refuses fields (400) | Each message next to its field (the server names them: `title`, `videos[1].embedUrl`, `printable.link` …); what has no field is listed in the message |
| It cannot be published (422) | A warning with the reasons; "turn Published off to save it as a draft" |
| Someone else saved first (409) | "Someone else saved this experience first" with **Load their version** (replaces what was typed) and **Save mine anyway** (sends without the check, replacing their changes) |
| Deleted meanwhile (404 on save) | "Experience not found" with a way back; the form is kept |
| Server error, lost connection, picture refused (413 / 415 / 502) | "The experience was not saved" with the reason; **everything typed is kept** and Save works again |
| Saving | Save says "Saving…", every field, Cancel and the back arrow are blocked, it can never be sent twice |
| Saved | A notification ("… was created." / "… was saved."), and back to the list |
| Leaving with unsaved work | **Cancel** and the back arrow ask first ("Leave without saving?" — Leave / Keep editing); closing or reloading the tab makes the browser ask |

**Not covered:** clicking another item in the admin sidebar while there are unsaved changes. The admin area uses the
simple browser router, which cannot hold back a navigation, so that click leaves without asking. (Cancel, the back
arrow, closing and reloading are all covered.)

### Preview (laptop and phone)

The **Preview** button at the top of the form (add and edit) swaps the form for a full-page preview of the experience
as children see it, built from what is typed **right now** (nothing needs to be saved first, and looking saves
nothing). Two buttons choose the screen: **Laptop** (a browser window, shown first) and **Phone** (a 390-wide phone
with a fixed status bar and no scroll bar). **Back to editing** returns to the form with everything still typed.

The page is the phone app's Experience page (`app/components/child/experience/experience-view.tsx`), drawn in the same
colours (cream, pale green, peach, teal text, orange and yellow buttons), the same fonts and sizes, and the same
wording around the admin's content: the title, then the description (or, when there is none, the app's own two lines),
one band per video (a play button first, and the Bunny player only after it is tapped, one at a time), the printable
(its picture or the app's placeholder, and the button text; left out when there is no link and no picture), and the
closing message with "Back to home". **There is no footer and no copyright line**: the phone app does not show one, so
neither screen does. The cover picture is not part of this page (it is the picture on the list's card), and the Print
and Back to home buttons are only for show.

Files: `components/admin/experiences/editor/preview/` (`ExperiencePreview` = the bar, the two buttons and the frames;
`ExperiencePreviewPage` = the page) and `utils/experiencePreview.js` (what to show, worked out from the form: stand-in
title, band colours in turn, which videos can play, whether the printable is there).

### Kept light

- The form is its **own on-demand chunk** (about 35 kB); nothing from it is in the first download except the two route
  entries. The server calls of the form are in their own file (`experienceEditorService.js`) for the same reason.
- Typing in one video draws that video only (rows are memoised, handlers are stable, and the drag-and-drop settings and
  its list of keys are kept stable — each would otherwise redraw all 20 rows on every keystroke). A test counts the
  draws so this cannot quietly regress.
- Picture previews come from the browser's memory and are released when the picture changes or the page closes. The
  video preview pop-up loads Bunny only when it is opened.

## Where it lives (all under `frontend/src/`)

| Piece | File |
|---|---|
| List page / form page | `pages/admin/AdminExperiences.jsx`, `pages/admin/AdminExperienceEditor.jsx` (routes in `router/routeTable.js` and `router/routeComponents.js`, admin only) |
| List body and pieces | `components/admin/experiences/` — `ExperiencesMain`, `ExperiencesHeader`, `ExperiencesFilters`, `ExperiencesList`, `ExperienceCard`, `ExperiencesPagination` |
| Form body and pieces | `components/admin/experiences/editor/` — `ExperienceEditorMain`, `ExperienceDetailsSection`, `ExperienceVideosSection`, `ExperienceVideoRow`, `VideoPreviewDialog`, `ExperienceStatusCard`, `ExperiencePicturesCards`, `ImagePicker`, `ExperienceSaveBar`, `ExperienceSaveBanner`, `SectionCard`, `FieldFooter` |
| Preview (laptop / phone) | `components/admin/experiences/editor/preview/`, `utils/experiencePreview.js`, `hooks/useObjectUrl.js` (a chosen picture as a browser address, released when done) |
| Form rules, what is sent, error placing | `utils/experienceForm.js` (pure functions) |
| Form state and every change | `utils/experienceEditorReducer.js` |
| Form loading / saving / failures | `hooks/experienceEditorHook.js` |
| List state / actions | `store/slices/experienceAdminSlice.js` (registered as `experienceAdmin`), `hooks/experienceAdminHook.js` |
| Server calls | `services/experienceAdminService.js` (list, publish, hide, delete, `ExperienceApiError`), `services/experienceEditorService.js` (load one, create, save) |
| Display helpers | `utils/experienceAdminFormat.js` |
| Sidebar item | `components/admin/common/AdminSidebar.jsx` (`activeOnSubpaths`) |

## Tests

- `utils/experienceForm.test.js` — every rule at its exact limit (200/201, 1000/1001, 20/21, 60/61, 2048/2049, 8 MB / +1
  byte, the printable file's 20 MB / +1 byte and its types), Bunny links, what is sent for create and edit (every
  link / file combination, and that a link and a file are never sent together), and how server messages are placed.
- `utils/experienceEditorReducer.test.js` — every change of the form's state.
- `services/experienceEditorService.test.js`, `services/experienceAdminService.test.js`,
  `store/slices/experienceAdminSlice.test.js` — addresses, bodies, answers, every kind of failure.
- `components/admin/experiences/ExperienceEditor.e2e.test.jsx` — the real page, state and service against a fake
  backend that runs what the form sends through the **server's own validation code**
  (`backend/utils/experienceValidation.util.js`): adding, editing, videos (add, remove, reorder, limit, preview),
  pictures, printable, publishing, every problem and failure, leaving with unsaved work.
- `components/admin/experiences/editor/EditorParts.test.jsx`, `ExperienceVideosSection.test.jsx` — the pieces on their
  own, and the "typing draws one row" check.
- `utils/experiencePreview.test.js`, `components/admin/experiences/editor/preview/ExperiencePreview.test.jsx` — the
  preview's content, the app's colours and wording, no footer / copyright, one video playing at a time, the Laptop and
  Phone buttons; and the "previewing" part of the form's end-to-end test (what is typed shows, nothing is sent, back to
  editing keeps everything).
- `components/admin/experiences/ExperiencesMain.e2e.test.jsx`, `ExperiencesParts.test.jsx` — the list.
- `components/admin/common/AdminSidebar.experiences.test.jsx`, `router/routeTable.test.js` — the sidebar item and routes.
- Backend: `backend/tests/experienceAdmin.formContract.e2e.test.js` — the exact requests the form sends, played
  against the real routes, service and database.

# Experiences — admin backend

The data and the admin API behind the list of experiences children will see under **Explore**
(`/child/:id/explore/experience` and `/child/:id/explore/experience/{uuid}`). This is the backend half of
the admin side only; the admin screen, the child-facing read API and the app and web pages come next.

An experience is: a title, a description, a cover picture, an ordered list of **Bunny videos**, and an
optional printable (a picture, and the thing to print: a link to a file on our own domain **or** an uploaded PDF / Word document). Admins manage them; children will only ever
see the ones that are **published**.

> Not to be confused with the free "Smoothie Experience" on the sales site (`/api/experience`, Flodesk
> email check, two links in the settings). That one is unchanged and separate; the two never answer for
> each other (a regression test checks this).

## Where it lives

| Piece | File (all under `backend/`) |
|---|---|
| Model | `models/Experience.js` (registered in `models/index.js`) |
| Rules (pure, no database) | `utils/experienceValidation.util.js` |
| Business logic | `services/experienceAdmin.service.js` |
| HTTP answers | `controllers/experienceAdmin.controller.js` |
| Routes (admin only) | `routes/experienceAdmin.routes.js`, mounted at `/api/admin/experiences` in `server.js` |
| Picture upload | `middleware/uploadExperience.js` |
| First entry (Strawberry Banana Smoothie) | `scripts/seedSmoothieExperience.js` (`npm run seed:experience-smoothie`) |

## The data

| Field | Notes |
|---|---|
| `uuid` | Random v4, created automatically, **never edited**. The public id used in addresses; the database id is never returned. |
| `title` | Required, up to 200 characters. |
| `description` | Optional, up to 1,000 characters. |
| `coverImage` | Uploaded picture (stored like the other covers, folder `experiences/images`). |
| `videos[]` | In the order children see. Each has an `id` (kept across edits), a `title` (up to 200), an `embedUrl` and a `position`. Up to 20. |
| `printable` | `image`, then **either** `link` (https, **our own domain only**) **or** `file` + `fileName` (an uploaded PDF or Word document), and `button` text (default "Print here", up to 60). Never both a link and a file. |
| `order` | Position in the list (1 = first). New experiences go to the end. |
| `isPublished`, `publishedAt` | Hidden draft by default. |

**Video positions.** Every video has a `position`: 1 is first, then 2, 3 ... It is always in step with the order of
the list (the model numbers the videos on every save), so positions never repeat and never leave a gap, also after
a video is added in the middle or removed. When an experience is created or edited, **the order of the `videos` list
you send is the order**; a `position` that comes along with a row (for example from an editor that loaded the
experience) is only checked to be a whole number of 1 or more and is never used to move the video. To move videos
use the list order, or the two routes below.

**Bunny links.** Only `https://iframe.mediadelivery.net/embed/LIBRARY/VIDEO` is stored. A
`player.mediadelivery.net` link (same video) is converted automatically; anything else is refused. The same
video twice in one experience is refused. Credentials and `#fragments` are stripped.

**Printable links** must be https on `riseup.kids`, `www.riseup.kids` or `app.riseup.kids` (store rules: no
outside or social links). The list can be changed with `EXPERIENCE_PRINTABLE_HOSTS` (comma-separated).

**Publishing needs** a title and at least one video (each with a title and a link). A published experience
cannot be edited into an incomplete one; unpublish it first.

## The API

All routes: `Authorization: Bearer <token>` of an **admin with two-factor set up**.
Base path `/api/admin/experiences`. Every answer has `success`.

| Method and path | What it does |
|---|---|
| `GET /` | List. `?status=all\|published\|draft` `&search=` (title) `&page=` `&limit=` (max 100). Returns `data` (summaries with `videoCount`), `pagination` and `counts` (`all`, `published`, `draft`, ignoring the filter, for tab badges). |
| `POST /` | Create (JSON, or multipart with `coverImage` / `printableImage` / `printableFile`). 201. |
| `POST /reorder` | `{ "order": [uuid, ...] }` — **every** experience exactly once, in the new order. |
| `GET /:uuid` | One experience, as the editor needs it. |
| `PUT /:uuid` | Edit the fields that are sent (JSON or multipart). Optional `expectedUpdatedAt`, `removeCoverImage`, `removePrintableImage`, `removePrintableFile`. |
| `PATCH /:uuid/publish` | Show to children. Asking again is a 200 ("already published"). |
| `PATCH /:uuid/unpublish` | Hide from children. |
| `POST /:uuid/videos/reorder` | New order of the videos: `{ "order": [videoId, ...] }` with **every** video of that experience once. Optional `expectedUpdatedAt`. Returns the experience. |
| `PATCH /:uuid/videos/:videoId/position` | Move one video: `{ "position": 2 }` (1 = first); the others shift to make room. Optional `expectedUpdatedAt`. Asking for the place it already has is a 200 and changes nothing. |
| `DELETE /:uuid` | Delete for good (the videos stay in Bunny: only links are stored). |

In a multipart form, `videos` and `printable` are sent as JSON text and `isPublished` / the remove flags as
`"true"` / `"false"`.

### Answers

| Status | `code` | When |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Input not acceptable. `errors` lists `{ field, message }` for each problem (e.g. `videos[1].embedUrl`). Also bad list filters and bad JSON text in a form. |
| 400 | `NOTHING_TO_UPDATE` | An edit with no fields and no picture change. |
| 400 | `UNEXPECTED_FILE` / `INVALID_FORM` | A file under an unknown field, two covers, or a broken upload. |
| 401 | — | No token, bad token, deactivated user, or a token from before a password change. |
| 403 | — | Not an admin; or `TWO_FACTOR_ENROLLMENT_REQUIRED` for an admin without two-factor. |
| 404 | `EXPERIENCE_NOT_FOUND` | No such experience — **also for a malformed id** (it never reaches the database). |
| 404 | `VIDEO_NOT_FOUND` | The video is not in this experience (also a malformed video id, or one that belongs to another experience). |
| 409 | `EXPERIENCE_CONFLICT` | Someone else saved in the meantime (`expectedUpdatedAt` differs, or the video list changed under the save). Nothing is overwritten. |
| 409 | `REORDER_STALE` | The reorder list no longer matches what exists (another admin added or deleted one). Nothing moves. |
| 409 | `VIDEO_REORDER_STALE` | The video reorder list no longer matches the experience's videos (one was added or removed meanwhile). Nothing moves. |
| 413 | `FILE_TOO_LARGE` | A picture over 8 MB, or a printable file over 20 MB (the message says which). (A JSON body over the server limit is also 413.) |
| 415 | `UNSUPPORTED_FILE_TYPE` | A picture that is not JPG, PNG or WebP; a printable file that is not a PDF, DOC or DOCX, or that is not what its name and type say (the first bytes are checked). |
| 422 | `PUBLISH_BLOCKED` | Not complete enough to publish (`errors` say why). |
| 502 | `IMAGE_UPLOAD_FAILED` | The picture or the printable file could not be stored. The message is safe; the detail is only in the server log. |
| 500 | — | Anything unexpected. In production the message is generic and carries a `requestId` (also in the `X-Request-Id` header) to find it in the log. |

A refused request changes nothing: pictures uploaded during a failed save are removed again, and pictures
replaced by an edit are deleted only after the save worked. A stored picture that cannot be deleted never
fails the request (it is logged).

**Two admins editing.** The editor can send the `updatedAt` it loaded as `expectedUpdatedAt` (on edits and on both
video routes); if the experience changed since, the save is refused with 409 instead of overwriting. Moving
**videos** is an edit and does change `updatedAt`. Reordering the **experiences** in the list deliberately does
not, so moving experiences never makes another open editor conflict.

## The printable: a link or a file

The thing children print is **either** a link **or** an uploaded file, chosen by the admin:

- **Link** — `printable.link`, https on our own domain (as before).
- **File** — the `printableFile` upload: a **PDF, DOC or DOCX, up to 20 MB** (pictures stay at 8 MB). It is stored in S3
  under `experiences/files/` (the same bucket and public address as the pictures); the experience keeps its address
  (`printable.file`) and the name it had (`printable.fileName`, cleaned: no folders, no control characters, at most 120
  characters).

What the server checks for a file, in this order: the box it came in (only `printableFile`, one file); the **ending of its
name** (`.pdf`, `.doc`, `.docx`) **and** the type the browser gave must agree; the size; and the **first bytes of the file**
(`%PDF-`, a zip for DOCX, the Word 97 header for DOC) so a file that is only *called* a PDF is refused (415).

A link and a file are never both kept: a request that would leave both is refused (400, on `printable.link`, "Choose a
link or a file for the printable, not both.") before anything is stored. To switch from a file to a link the form sends
the link **and** `removePrintableFile: "true"`; to switch from a link to a file it sends the file with an empty link.

Storage housekeeping: a replaced or removed file is deleted **after** the save worked; a file uploaded for a save that
then failed is deleted again; deleting the experience deletes its file; a file that cannot be deleted never fails the
admin's request (it is only logged).

Not built yet: the child-facing side (a read API and the app) will open `printable.file` or `printable.link`, whichever
is set.

## First deploy

1. Deploy the backend (the new collection and its indexes are created by the model on start).
2. Once: `npm run seed:experience-smoothie` — creates **Strawberry Banana Smoothie** (published, with its
   two production videos and the recipe printable link) as the first entry. Safe to run again: if the title
   exists nothing changes. It needs at least one admin user. The cover and printable **pictures are not
   created**: upload them in the admin screen (the app currently has the printable picture bundled).

## Tests

All under `backend/tests/`, run with `npm test` from `backend/`:

- `experienceValidation.util.test.js` — every rule on its own (links, printable hosts, limits, filters).
- `experienceAdmin.service.test.js` — the service against a real in-memory MongoDB: every operation and
  every refusal, storage failures and clean-up.
- `experienceAdmin.routes.e2e.test.js` — over real HTTP with real login tokens: who can reach what, the full
  life of an experience, every status code above, uploads, and the production-safe 500.
- `experienceAdmin.printableFile.service.test.js`, `experienceAdmin.printableFile.e2e.test.js` — the printable as a link
  or an uploaded file: which files get in (PDF, DOC, DOCX) and which do not (wrong type, name and type that disagree,
  a file that only *looks* like a PDF), 20 MB exactly / one byte more, pictures still stopping at 8 MB, a link and a
  file never kept together, switching either way, storage clean-up, and the file name cleaning.
- `experienceAdmin.formContract.e2e.test.js` — the exact requests the admin form sends (including the link / file
  switches), against the real routes and database.
- `experienceSeed.test.js` — the Strawberry entry, running twice, and that it matches the app's links.
- `experience.regression.test.js` — the free Smoothie page is unchanged, the two APIs never answer for each
  other, the server mounts both, the models are intact, and the new code follows the repo rules.

## Not in this part

The child-facing read API (`GET /api/experiences`, only published ones, by `uuid`), the admin screen, and the
app and web pages. The existing free Smoothie page and the app's fixed Experience tab are untouched until
those exist.

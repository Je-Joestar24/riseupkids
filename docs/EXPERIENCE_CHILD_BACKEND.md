# Experiences — child backend (read API)

What the app and the website read to show the experiences under **Explore**
(`/child/:id/explore/experience` and `/child/:id/explore/experience/{uuid}`). Read only: everything is
managed through the admin API (see `EXPERIENCE_ADMIN_BACKEND.md`). The child never sees a draft.

> Three similar paths, three different things: `/api/experience` (singular) is the free Smoothie page on
> the sales site; `/api/admin/experiences` is the admin side; **`/api/experiences` (plural) is this one.**

## Where it lives (all under `backend/`)

| Piece | File |
|---|---|
| Business logic and output shapes | `services/experienceChild.service.js` |
| HTTP answers | `controllers/experienceChild.controller.js` |
| Routes | `routes/experienceChild.routes.js`, mounted at `/api/experiences` in `server.js` (after the admin mount, never under `/api/explore`, where `/api/explore/:id` would take the ids) |

## Who can call it

Any signed-in, active account (the app signs in as the parent, like Explore). No token, a bad or expired
token, an inactive account or an ended session is a 401. A server problem is a **500, never a 401**, so
it can never log the app out. Nothing can be created, changed or deleted through these routes.

## Endpoints

### `GET /api/experiences`

The published experiences, in the order the admin set (ties: oldest first). Never more than 100.

```json
{ "success": true, "data": [
  { "uuid": "…", "title": "…", "description": "…", "coverImage": "https://…" , "videoCount": 3 }
] }
```

`coverImage` is `null` when there is none, `description` is `""` when there is none. Query strings are
ignored (no filter can reveal a draft).

### `GET /api/experiences/:uuid`

```json
{ "success": true, "data": {
  "uuid": "…", "title": "…", "description": "…", "coverImage": "https://…",
  "videos": [ { "id": "…", "title": "…", "embedUrl": "https://iframe.mediadelivery.net/embed/…", "position": 1 } ],
  "printable": { "image": "https://…", "kind": "file", "url": "https://…", "fileName": "Sheet.pdf", "button": "Print here" }
} }
```

- `videos` are in the order the child sees; `position` is 1, 2, 3 … by that order.
- `printable` is **`null`** when the admin set nothing. Otherwise `kind` says what the button opens:
  `"file"` (an uploaded PDF or Word document, with its readable `fileName`), `"link"` (a file on our own
  domain), or `null` (only a picture was set: `url` is `null` and the app shows no button).
- A published experience with no videos is still returned (`videos: []`); the admin cannot publish one
  that way, but an older record could exist.

### Not found

A draft, a deleted experience, an unknown id and a malformed id (a database id, text, a query operator …)
all get **the same** answer, so a child cannot tell that a hidden experience exists:

```json
{ "success": false, "code": "EXPERIENCE_NOT_FOUND", "message": "Experience not found.", "requestId": "…" }
```

## What is never returned

The database id, `isPublished`, `publishedAt`, `order`, who created or changed it, and the dates. The
list never carries the videos or the printable.

## Freshness

Both answers carry `Cache-Control: private, no-cache`: an unpublish or a delete shows on the next request.

## Tests

`tests/experienceChild.service.test.js` (real in-memory MongoDB: published only, order, shapes, every
printable case, malformed ids never reach the database) and `tests/experienceChild.routes.e2e.test.js`
(real HTTP with real JWTs, **next to the admin API**: what an admin saves is what the child reads, switching
the printable, reorders, unpublish and delete take effect at once, no leaks, 500 instead of 401).
`tests/experience.regression.test.js` checks the mount and that the routes are login-protected and read only.

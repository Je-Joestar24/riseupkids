# Plan: Access control for Content Creators

> **Status:** Plan only, nothing built yet.
> **Scope:** Backend (user model, checks on routes, migration script), Admin web (add / edit user, users table), Content Creator web (sidebar, routes, landing page).
> **Audience:** Engineering + client review.

---

## Goal

An admin decides, **per content creator**, which parts of the site that person can use. Example from the client: one
creator should only see **Notifications**; another should only see the content tools. Everything else disappears from
her sidebar **and** is refused by the server if she tries to reach it anyway.

Access is a simple list of checkboxes. No custom roles, no levels, no per-item rules.

---

## What exists today (read from the code)

| Area | Today |
|---|---|
| Role | `User.role` includes `content_creator`; the role alone decides everything. |
| Creator sidebar | Fixed list in `ContentCreatorSidebar.jsx`: Dashboard, My Contents, Built-in Books, Explore, Star Cam Missions. |
| Creator routes | `routeTable.js` `/content-creator/*`, all open to any creator. |
| Creator API | Routes use `authorize('admin','teacher','content_creator')`: activity, video, chant, audio assignment, book, CMS books, explore (write), Star Cam missions and label catalog. |
| Notifications | `/api/admin/notifications` is **admin only**. Creators cannot reach it. |
| Creating a creator | Add User modal (one step: role, name, email, password) -> `POST /api/content-creators`. |
| Existing rows | Every existing creator has no access field at all. |
| Live checks | `protect` loads the user from the database on every request, so a change to a user applies **immediately**, with no token reset and no forced logout. |

---

## Design

### The access areas (the checkboxes)

| Key | Label in the admin form | What it covers |
|---|---|---|
| `dashboard` | Dashboard | The creator's home page with shortcuts (**today every creator has it**) |
| `contents` | Contents | My Contents: activities, videos, chants, audio assignments, books |
| `built_in_books` | Built-in Books | The built-in book builder |
| `explore` | Explore | Explore videos |
| `star_cam_missions` | Star Cam Missions | Missions and their label list |
| `notifications` | Notifications | The notification campaigns screen (**new for creators**) |
| `experiences` | Experiences | The Experiences list under Explore (**new for creators**; today admin only) |

Seven checkboxes. The list lives in **one shared place** on the backend and is sent to the admin form, so adding an
area later is one entry, not a hunt.

**Existing creators keep exactly what they have today:** Dashboard, Contents, Built-in Books, Explore and Star Cam
Missions ticked; **Notifications and Experiences not ticked**. Nothing they use disappears and nothing new appears.
The two new areas are only ever given by an admin ticking them.

### Data

`User.accessAreas: [String]` (only meaningful when `role === 'content_creator'`), validated against the list above.

Rules:
- At least **one** area is required for a creator (a creator with nothing can do nothing).
- A creator whose `accessAreas` field is **missing** (every creator today) is treated by the code as the **legacy
  set**: `dashboard`, `contents`, `built_in_books`, `explore`, `star_cam_missions` (exactly what they have today; no
  Notifications, no Experiences). So the deploy changes nothing for anyone, even before the script runs.
- A new creator can have **any** combination, for example only `notifications`, or only `notifications` +
  `experiences`, with or without `dashboard`.
- Admins and teachers are **never** limited by this list.
- Only an admin can change it (the existing admin-only creator routes).

### Server enforcement (the real lock)

- New middleware `requireAccessArea(area)` used **after** `authorize(...)`: admin and teacher pass; a creator passes
  only if the area is in their list; otherwise `403` with a clear message and code `ACCESS_AREA_REQUIRED`.
  A 403, never a 401, so the app does not log her out (same rule as the earlier logout incident).
- Route map:
  - `contents` -> activity, video, chant, audio assignment, book routes
  - `built_in_books` -> CMS book admin routes
  - `explore` -> explore write routes (`POST/PUT/DELETE`)
  - `star_cam_missions` -> missions admin + label catalog routes
  - `notifications` -> `/api/admin/notifications` becomes `authorize('admin','content_creator')` +
    `requireAccessArea('notifications')`
  - `experiences` -> `/api/admin/experiences` (list, create, edit, publish, reorder, delete, printable upload) becomes
    `authorize('admin','content_creator')` + `requireAccessArea('experiences')`. The child-facing
    `/api/experiences` is untouched. Experiences are one shared, curated list (ordering and publishing affect
    everyone), so a creator with this area manages the **whole list**, not only her own entries.
  - `dashboard` -> **no server lock needed**: the creator Dashboard is a static page of shortcuts that calls no API.
    It is a web-only checkbox, and its shortcut tiles show only the areas she has.
- **Phase 0 audit (important):** the content pages also call shared helpers (uploads, media lists, lookups). Each page's
  API calls are listed first; a shared helper is allowed when the creator has **any** area, so a granted page never
  breaks and no page quietly depends on an area it was not given.
- **Phase 0 audit result (done):** every creator page calls only its own area's endpoints, with ONE shared read:

  | Area | Endpoints it covers | Notes |
  |---|---|---|
  | `contents` | `/api/activities`, `/videos`, `/books`, `/chants`, `/audio-assignments` | The Contents page's "Select built-in book" drawer also **reads** `/api/admin/cms-books` (list and one book) |
  | `built_in_books` | `/api/admin/cms-books` (all) | The two reads above are also allowed with `contents` (`requireAnyAccessArea`); every write needs `built_in_books` |
  | `explore` | `POST/PUT/DELETE /api/explore` | Reading Explore (`GET`) stays open to every signed-in user: children use it |
  | `star_cam_missions` | `/api/admin/star-cam/missions`, `/label-catalog` | |
  | `notifications` | `/api/admin/notifications` | Role check now `admin` + `content_creator`; teachers still excluded |
  | `experiences` | `/api/admin/experiences` | Role check now `admin` + `content_creator`; the child-facing `/api/experiences` is untouched |
  | `dashboard` | none | Static page, web-only checkbox |

  Pages that talk to nothing else: no cross-area calls to other services (the Bunny helper used by the add forms is a
  pure client-side check). The built-in book PLAYER routes (`/api/parent/cms-books`) are for every role and are not locked.
- Notifications is sensitive (it messages real families). The single checkbox gives the whole screen. If the client
  wants "can draft but not send", that is a later sub-option, not part of this plan.

### Sending the list to the web app

`accessAreas` is returned wherever the user object is already returned (login, `/auth/me`, the users list and detail),
with the legacy set filled in when the field is missing, so the web app never has to guess.

---

## Admin UX

### Add New User (two steps only for creators)

1. **Step 1 - Details** (as today): Role, Name, Email, Password.
   - Role = Parent or Teacher: the button says **Create User** and nothing changes.
   - Role = **Content Creator**: the button says **Next**.
2. **Step 2 - What can this person access?** (only for creators)
   - Title: "Choose what [Name] can use"
   - One checkbox per area, each with one short line of help, e.g.
     - Contents - "Add and edit lessons, videos, chants and books"
     - Notifications - "Create and send push notifications"
   - **Select all / Clear** link.
   - Footer: **Back** | **Create User**. Create is disabled with the hint "Choose at least one" when nothing is ticked.
   - Nothing is saved until **Create User**; Back keeps what was typed.

### Edit user (creators)

Same checkbox block under the name / email fields, filled from the saved list. Saved together with the rest. A line
under it: "Changes apply the next time she opens a page." (They apply immediately on the server; the page she is
looking at updates on her next click or refresh.)

### Manage access (changing it later, including reducing it)

This is how the admin trims the access of the **current** content creators, or widens it later.

**Where it is:** in the Users list, filtered to Content Creators, each row gets a **Manage access** action (a small
shield icon next to Edit / View). The same block also sits inside the Edit user dialog. One screen, one list.

**The dialog**
- Title: "Manage access: [Name]".
- The seven checkboxes, **already ticked as the creator has them today** (a current creator shows Dashboard and the
  four content areas ticked, Notifications and Experiences unticked), so the admin sees exactly what changes.
- Anything the admin unticks is marked "Will be removed" in red; anything newly ticked is marked "Will be added" in
  green, so nothing changes by surprise.
- **Save access** is disabled until something changed, and also disabled with none ticked ("Choose at least one. To
  stop someone using the site entirely, use Archive instead").
- Footer: **Cancel | Save access**.

**When access is reduced (anything removed)** a confirmation first: "[Name] will lose access to Explore and Star Cam
Missions straight away. Content she created stays in the system. Continue?" No confirmation when only adding.

**Doing many at once**
- Tick several creators in the list -> **Manage access** at the top -> the same checkboxes, applied to all selected
  ("Set exactly these" for everyone; the dialog shows how many people it affects before saving).
- For the first clean-up of the current creators there is also the script, so the admin never has to click through all
  of them: `--all --areas=contents,explore` (dry-run first) sets the same list for every creator, and
  `--email=... --areas=...` sets one person.

**What happens to the creator when access is reduced**
- It applies **immediately on the server**: her next click on a removed area is refused (403, she stays signed in).
- The page shows a friendly message ("You no longer have access to Explore. Ask an admin if you need it") and takes her
  to her landing page; the sidebar drops the item on the next refresh or click.
- **Her work is kept**: everything she created stays, other creators and admins still see and manage it. She simply
  cannot open that area any more. Re-ticking the box gives it all back, untouched.
- If she had an editor open, whatever she had not saved in it is lost when the refusal appears, so the confirmation
  above is the admin's chance to wait for a quiet moment.

**Trace of changes**
- The user keeps `accessUpdatedAt` and `accessUpdatedBy` (the admin who last changed it), and the server log records
  "who changed whose access, from what to what". This answers "why can't she see Explore?" without guessing.

**Safety rules**
- Only admins can change access. A creator cannot change her own list, and cannot read others'.
- Unknown areas are rejected; the list is saved exactly as sent (no silent additions).
- Changing access never changes the password, never logs the person out and never touches her content.

### Users table (Content Creator filter)

New **Access** column showing small chips: all areas, or "3 areas" with the full list on hover. A creator with only
Notifications reads "Notifications" at a glance.

### View user

Read-only list of the same checkboxes (ticked / not ticked).

---

## Content Creator experience

- Sidebar shows **only** the ticked areas, in the usual order. Same look, nothing greyed out or locked: what she cannot
  use simply is not there.
- **Dashboard** is a checkbox like the others: ticked = she has it (and its shortcut tiles show only her areas);
  unticked = no Dashboard item and no Dashboard page.
- **Landing page after login** is her first allowed item in the usual order (Dashboard, Contents, Built-in Books,
  Explore, Star Cam Missions, Notifications, Experiences). A Notifications-only creator opens straight on
  Notifications. Today it is always the Dashboard.
- The Notifications and Experiences screens are the same ones admins use, inside her own layout at
  `/content-creator/notifications` and `/content-creator/experiences` (with `/create` and `/:uuid/edit`).
- If she types an address she is not allowed (or opens an old bookmark), she is sent to her landing page, and if she
  calls the server directly it answers 403.
- If the admin removes an area while she is working, her next request is refused politely and her sidebar updates on
  the next refresh; she stays signed in.

---

## Handling existing content creators (script)

`backend/scripts/migrateContentCreatorAccess.js` (same style as the other `migrate*` scripts):

- Finds creators **without** `accessAreas` and writes the **legacy set** (no change in what they can do).
- **Idempotent**: running it twice changes nothing the second time.
- `--dry-run` prints who would change and writes nothing.
- Optional `--email=<address> --areas=notifications,explore` sets one named creator's list directly (so the client's
  Notifications-only creator can be set from the terminal if wanted, besides the admin screen).
- Optional `--all --areas=contents,explore` sets the **same list for every creator** (the quick way to reduce all
  current creators at once; always run with `--dry-run` first). Without `--all` or `--email`, it only fills the legacy
  set where missing.
- Never touches admins, teachers, parents; never overwrites a list that is already set.
- Prints a summary (found / updated / skipped).
- **Safe order:** because the code already treats "missing" as the legacy set, deploy order does not matter, and the
  script can run any time after.
- **Rollback:** remove the field (the code falls back to the legacy set).

---

## Build phases

| # | Phase | Output | Est. hours |
|---|---|---|---|
| 0 | Audit: which API calls each creator page makes; decide shared helpers | Short table in this doc | 1.5 |
| 1 | Backend: shared area list, `accessAreas` on user, validation, create / update / return it | Creator can be created with areas | 3 |
| 2 | Backend: `requireAccessArea` + apply to the routes above; open notifications and experiences to creators | Server refuses the rest | 4 |
| 3 | Migration script (+ `--dry-run`, `--email/--areas`) | Existing creators set | 2 |
| 4 | Admin web: two-step Add modal, Edit block, Access column, View list | Admin UX | 5 |
| 4b | Manage access: dialog with added / removed marks, reduce confirmation, bulk apply, change trace | Reduce current creators | 4 |
| 5 | Creator web: sidebar filter, route guard, landing page, Notifications + Experiences routes, Dashboard checkbox, "access removed" message | Creator UX | 6 |
| 6 | End-to-end tests (see below) + break-it check on a scratch copy | Proof it holds | 6 |
| 7 | Docs + a real check with a Notifications-only account and a legacy account | Sign-off | 1.5 |
| | **Total** | | **~32.5 h** |

---

## Tests (written with the code)

Backend
- Helper: legacy set when missing; admin / teacher unlimited; unknown keys rejected; empty list rejected.
- Route level (supertest, real middleware): a creator with only `notifications` gets **200** on notifications and
  **403** on activity, video, chant, book, CMS book, explore write, Star Cam; a creator with content areas gets 200 on
  those and **403** on notifications; a **legacy** creator (no field) keeps today's access and gets 403 on
  notifications; admin and teacher behave exactly as before; a refusal is **403, never 401**.
- Create / update: only admins; list saved; at least one area; role other than creator cannot carry a list.
- Migration script: dry-run writes nothing; real run fills only creators without a list; second run changes nothing;
  never touches other roles.

Web
- Sidebar shows only granted areas; Dashboard is shown only when ticked and its tiles show only her areas; landing
  path per case (including a creator with only Notifications, only Experiences, or both).
- Experiences pages (`/content-creator/experiences`, `/create`, `/:uuid/edit`) open only with the Experiences box.
- **Existing creators are unchanged:** a creator with no saved list sees Dashboard, Contents, Built-in Books, Explore
  and Star Cam Missions, and neither Notifications nor Experiences, on the web and on the server.
- Route guard redirects a not-allowed address; an allowed one renders.
- Add modal: parent / teacher stays one step; creator goes Next -> checkboxes -> Create with the chosen list; Create
  disabled with none ticked; Back keeps the typed details.
- Edit modal loads and saves the list; table shows the Access chips.
- Manage access: opens with the current ticks; unticked = "Will be removed", newly ticked = "Will be added"; Save
  disabled until a change and with none ticked; reducing asks for confirmation, adding does not; bulk apply sets the
  same list for every selected creator.
- A creator whose access was just reduced: the refused call shows the message, lands on her landing page and stays
  signed in (no logout).

Backend (manage access)
- Reducing a list takes effect on the very next request; her created content is untouched; re-adding restores it.
- Only an admin can change a list; a creator editing her own, or another's, gets 403.
- `accessUpdatedAt/By` are set and the change is logged (old and new list).
- Script: `--all --areas` and `--email --areas` write exactly the list given, dry-run writes nothing, bad area names are
  refused without writing anything.

Then a break-it pass (about 20 deliberate breakages, on a scratch copy, never on live files) to prove the tests fail
when the lock is removed or a route is left open.

---

## Open questions for the client

1. ~~Dashboard~~ **Decided:** Dashboard is a checkbox like the others.
2. ~~Existing creators~~ **Decided:** they keep exactly what they have today (Dashboard, Contents, Built-in Books,
   Explore, Star Cam Missions); Notifications and Experiences stay off until an admin ticks them.
2b. **Experiences:** a creator with this box manages the whole shared list (publish, reorder, delete), as an admin
   does. Is that right, or should she only edit what she created? (Proposed: whole list.)
3. **Notifications power:** is one checkbox for the whole screen (draft, test, send to everyone) acceptable, or should
   some creators only be able to draft and send tests?
4. **Teachers:** same checkboxes later? (The design allows it; not included now.)

## Risks

- A content page that quietly uses another area's endpoint would break for a creator without that area. Phase 0 exists
  to find these before they reach her.
- Notifications reach real families, so the admin should tick it deliberately; it is **off by default**.

---

## Build status (updated 2026-11-21)

| Step | State |
|---|---|
| B1 area list, B2 user model, B3 typed errors | Built, tested, break-it checked |
| B4 creator management (create / update / manage access / bulk / area list) | Built, tested end to end against a real in-memory database, break-it checked |
| B5 route locks (11 route files, route-by-route matrix) | Built, tested, break-it checked (40 of 40) |
| B6 migration script | Built, tested, break-it checked |
| F1 access helper, F2 services + store + hook, F3 "access removed" behaviour | Built, tested, break-it checked |
| F4 routes + sidebar + landing page + login redirect | Built, tested |
| F5 admin screens (Add 2-step, Edit, Manage access, View, Access column, bulk) | Built, tested |

Decisions made while building (all small, none change the plan's intent):
- A refusal of an access call never shows as a pop-up notice where the screen has its own inline message (the Manage
  access dialog, the Add step 2, the checkboxes' load error with Retry).
- The only shared read is `GET /api/admin/cms-books` (list and one book), allowed with Built-in Books OR Contents.
- The creator landing page is her first allowed item; `/content-creator/*` no longer shows the Dashboard for unknown
  addresses.
- Editing only a creator's name does not write her access list (a creator from before keeps no saved list).

# Technical plan (backend first, frontend second, tests at every step)

Rule for the whole build: **nothing in the frontend starts until the backend is finished, tested end to end and break-it
checked.** Each step below ends with its tests passing before the next one begins.

## Error contract (decided first, used by every step)

New and changed endpoints answer in the existing shape `{ success: false, message, code }`. The `code` is new and is
what the web app reads, so the screen never depends on message wording (the older creator controllers match on message
text, which is fragile; the new code does not copy that).

| Situation | Status | `code` | Message shown |
|---|---|---|---|
| Creator calls an area she does not have | **403** | `ACCESS_AREA_REQUIRED` | "You don't have access to this area. Ask an admin if you need it." |
| Not signed in / bad token | 401 | (unchanged) | (unchanged) |
| Area list missing on create | 400 | `ACCESS_AREAS_REQUIRED` | "Choose at least one area." |
| Area list empty | 400 | `ACCESS_AREAS_EMPTY` | "Choose at least one area. To stop this person using the site, archive them." |
| Unknown area, wrong type, or not a list | 400 | `ACCESS_AREAS_INVALID` | "Unknown area: (name)." |
| Access list sent for a parent / teacher | 400 | `ACCESS_AREAS_NOT_FOR_ROLE` | "Access areas only apply to content creators." |
| Bulk: empty or too many ids, or a bad id | 400 | `ACCESS_BULK_INVALID` | says which id or the limit |
| Creator id not found / not a creator | 404 | `CONTENT_CREATOR_NOT_FOUND` | "Content creator not found" |
| Email already used (create) | 409 | (unchanged) | (unchanged) |
| Anything unexpected | 500 | (none) | Generic message + request id; detail only in the server log (the central handler already does this) |

Rules: a permission refusal is **always 403, never 401** (a 401 logs the person out). A 5xx never leaks internals.
Validation runs **before** any write, and a bulk change is **all or nothing** at validation (one bad id changes nobody).

## Backend, in order

**B1. Shared area list + helpers** (`backend/utils/accessAreas.js`)
- The seven keys (`dashboard`, `contents`, `built_in_books`, `explore`, `star_cam_missions`, `notifications`,
  `experiences`), labels and one-line help text; `LEGACY_CREATOR_AREAS`; `normalizeAreas` (trim, dedupe, reject
  unknown); `effectiveAreas(user)` (creator: saved list or legacy set; admin / teacher: everything); `userHasArea`.
- Tests: legacy fallback, admin / teacher unlimited, unknown / empty / duplicate / non-array / non-string inputs.

**B2. User model** (`backend/models/User.js`)
- Add `accessAreas: [String]` (validated against the list), `accessUpdatedAt`, `accessUpdatedBy`.
- `toJSON` adds the **effective** list for creators, so every response that already returns the user (login, OTP / 2FA
  login, refresh, `/auth/me`, lists, details) carries a correct list with no per-endpoint edits.
- Tests: schema validation; JSON output for legacy creator, set creator, admin, parent.

**B3. Typed errors + central handler** (`backend/utils/accessErrors.js`, `middleware/errorHandler.js`)
- `AccessAreaError` (403) and `AccessValidationError` (400, carries its code).
- The central handler passes a `code` through when an error carries one (small, backwards-compatible change).
- Tests: each error maps to the right status, code and message; a plain 500 still returns the generic message.

**B4. Creator management** (`services/contentCreators.services.js`, controller, `routes/contentCreators.routes.js`)
- `POST /api/content-creators`: `accessAreas` **required**, validated before the user is created, so a bad list never
  leaves a half-made account.
- `PUT /api/content-creators/:id`: the service picks fields explicitly today, so `accessAreas` is added deliberately
  (never passed through from `...rest`).
- **New** `PUT /api/content-creators/:id/access` (manage access: one purpose, one audit line).
- **New** `PUT /api/content-creators/access/bulk` with `{ ids, accessAreas }`, registered **before** `/:id`, with a sane
  maximum, validated up front, then applied; the response lists who changed.
- **New** `GET /api/content-creators/access-areas` (the list the admin form draws, so the web never hard-codes it).
- Every change writes `accessUpdatedAt/By` and one log line (who, whom, old list, new list; ids only).
- Changing access does **not** bump `tokenVersion` (no logout) and never touches password or content.
- Tests: create with / without / bad list (and no user is created on a bad list); update; manage access; bulk
  (all-or-nothing validation, mixed ids, not-a-creator id, limit); admin only (creator, teacher, parent, no token);
  audit fields; the password never appears in a response.

**B5. The lock** (`backend/middleware/accessArea.js`, then the route files)
- `requireAccessArea(area)` placed **after** `authorize(...)`: admin / teacher pass, a creator needs the area, else
  `AccessAreaError`. Applied per the route map above; `/api/admin/notifications` becomes
  `authorize('admin','content_creator')` + `requireAccessArea('notifications')`; `/api/admin/experiences` likewise
  with `requireAccessArea('experiences')` (its multipart printable upload and the Bunny video calls are part of the
  audit, and the child `/api/experiences` stays as is). `dashboard` has no server lock (static page).
- The Phase-0 audit decides which shared helper endpoints (uploads, lookups) any creator may use, so a granted page
  never breaks.
- Tests: a **route-by-route matrix** (every creator route x {legacy creator, creator with only that area, creator with
  only a different area, admin, teacher}); the admin 2FA gate still applies to admins on notifications.

**B6. Migration script** (`backend/scripts/migrateContentCreatorAccess.js`)
- As described above (legacy fill, `--dry-run`, `--email`, `--areas`, `--all`).
- Tests: dry-run writes nothing; fills only missing lists; idempotent; leaves other roles alone; bad area names are
  refused before anything is written; `--all` / `--email` write exactly the given list.

**Backend gate:** the whole backend suite passes (apart from the already-known failures in
`docs/KNOWN_TEST_FAILURES.md`), then a break-it pass on a **scratch copy** (remove the lock from a route, drop the
empty-list check, let `/access/bulk` fall into `/:id`, answer 401 instead of 403, forget the legacy fallback, ...).
Every breakage must be caught by a test. Only then does the frontend begin.

## Frontend, in order

**F1. Access helpers** (`frontend/src/utils/contentCreatorAccess.js`)
- Area list from the backend; `areaForPath`, `canOpen(user, path)`, `landingPath(user)`, `visibleMenu(user)`. One
  place decides, so the sidebar, router and redirects can never disagree.

**F2. Services and store** (`adminUsersService.js`, `parentsSlice.js`, `contentCreatorService.js`)
- Create / update send `accessAreas`; new calls for manage access, bulk and the area list.
- Errors are mapped by `code` to their friendly message; unknown codes fall back to the generic one.

**F3. The "access removed" behaviour** (`frontend/src/api/axios.js` + a small handler)
- On a 403 with `ACCESS_AREA_REQUIRED`: show the message, re-read the user (`/auth/me`) so the sidebar updates, send her
  to her landing page. **Never** treat it as a logout (the 401 handling is untouched).

**F4. Routes and sidebar** (`routeTable.js`, `routeComponents.js`, `ContentCreatorSidebar.jsx`, `roleRedirect.js`)
- Creator routes carry an `area`; new `/content-creator/notifications` (the page admins use, inside her layout); a guard
  sends a not-allowed address to her landing page; the catch-all and the login redirect use the landing path instead
  of always the Dashboard.
- Check the shared Notifications page for any admin-only links or wording before reusing it.

**F5. Admin screens** (`AdminAddUserModal`, `AdminEditUserModal`, new `ContentCreatorAccessChecklist`, new
`ManageAccessDialog`, users table, view modal)
- One shared checklist component used by Add (step 2), Edit, Manage access and View, so behaviour is identical.
- Add: Next -> checklist -> Create (Back keeps input; Create disabled with none ticked).
- Manage access: current ticks, "Will be removed" / "Will be added", confirmation on reduce, bulk selection.
- Every backend error code shows its message inline in the dialog (never a silent failure); a failed save keeps the
  dialog open with what the admin ticked.

**Frontend gate:** the web suite passes, the production build succeeds, plus a break-it pass on a scratch copy.

## Testing matrix (nothing skipped)

| Level | What it proves |
|---|---|
| Unit | Area helpers, schema, error mapping, access utilities (backend and frontend) |
| Backend route e2e (real middleware, controllers, services; only the database stood in) | The full route x role matrix; create / update / manage / bulk with every error code; 403-not-401; no logout; audit fields; script behaviour |
| Frontend component | Checklist, two-step Add, Manage access states, table chips, sidebar filtering |
| Frontend flow (real store and router, API stood in) | A Notifications-only creator signs in, lands on Notifications, and a typed `/content-creator/explore` is bounced; the admin removes Explore, her next call shows the message and lands home, still signed in; a legacy creator is unchanged |
| Contract | The backend area list matches what the web shows; every creator route in the route table has an `area` |
| Break-it | About 20 deliberate breakages per side, on a scratch copy only; each must fail a test |
| Manual (after deploy) | A real Notifications-only account and a real legacy account, on the live admin and creator screens |

## Risks and answers

| Risk | Answer |
|---|---|
| A granted page quietly calls another area's endpoint | Phase-0 audit + the route matrix test |
| `/access/bulk` swallowed by `/:id` | Registered first; a test posts to it |
| `...rest` lets an unvalidated list in | Fields are picked explicitly; a test sends junk |
| Deploy before the script runs | The code treats "missing" as the legacy set, so nothing changes |
| Access reduced mid-edit | 403 + message + landing page; the confirmation warns the admin first |
| Someone edits her own access | Admin-only routes; a test proves the 403 |
| Two admins edit at once | Last save wins; both are in the log |

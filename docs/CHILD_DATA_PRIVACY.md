# Child data privacy map

RUK-SEC-006 / RUK-SEC-026 / Chunk 7. What is collected about a child, why, where it lives, who
can see it, how long it is kept, and how it is deleted.

## Data map

| Collection | What it holds | Why | Retention | Deletion |
|---|---|---|---|---|
| `ChildProfile` | Display name, age (number, not DOB), avatar, preferences, Kids Wall consent state | Core profile the parent creates and manages | Until the profile or parent account is deleted | Hard-deleted by `accountDeletion.service.purgeChildData` |
| `ChildStats` | Aggregate progress stats | Progress dashboards | Until deletion | Hard-deleted with the child |
| `Progress` / `CourseProgress` | Per-lesson/course completion | Learning progress | Until deletion | Hard-deleted with the child |
| `BookReading` | Book reading sessions | Progress tracking | Until deletion | Hard-deleted with the child |
| `AudioAssignmentProgress` / `ChantProgress` | Audio recordings (child's voice, via `Media`) | Speaking-practice review | Until deletion | Hard-deleted with the child; underlying `Media` + S3 object removed |
| `StarEarning` | Gamification history | In-app rewards | Until deletion | Hard-deleted with the child |
| `VideoWatch` | Video watch history | Progress tracking | Until deletion | Hard-deleted with the child |
| `KidsWallPost` | Child-authored photo posts (title, description, image via `Media`), likes/stars from other children | The Kids Wall feature (Android/Web only — see `docs/IOS_KIDS_WALL_EXCLUSION.md`) | Until deletion, or until the post is deleted by the parent | Hard-deleted with the child; underlying `Media` + S3 object removed |
| `StarCamEvent` | Game telemetry only (target word, attempt count, duration) — **no images** | Star Cam analytics | Until deletion | Hard-deleted with the child |
| `NotificationReceipt` | Which notification campaigns reached this child/parent | Delivery tracking, unsubscribe state | Until deletion | Hard-deleted with the child (`childId`) and again at the parent level (`userId`) — see RUK-SEC-026 fix below |
| `DevicePushToken` | Push-notification device token | Sending push notifications | Until deletion or token rotation | Hard-deleted at the parent level (`userId`) — see RUK-SEC-026 fix below |
| `Media` (S3-backed) | Uploaded audio/images (avatars, Kids Wall photos, audio recordings) | Backing storage for the above | Until deletion | Hard-deleted + S3 object removed, both per-child and via the orphan sweep below |

## Who can see child data

* **The child's own parent** — full access to their own children via the parent dashboard / mobile app.
* **Admin / teacher roles** — can view and moderate Kids Wall posts (approve/reject) and access course/progress data for support and content administration. A finer-grained least-privilege review of exactly which admin/teacher roles need child PII access is tracked separately (Chunk 12, alongside the general authorization/IDOR review — the Kids Wall routes share the same "any role other than `parent` skips the ownership check" pattern flagged there).
* **Other families** — only ever see a child's **display name, age, and an approved Kids Wall photo**, and only when that child currently has real Kids Wall consent (RUK-SEC-006 fix, see below). No contact details, no full name (display name is parent-chosen and need not be the legal name), no exact birthdate (only a numeric age is stored).

## Third-party sharing

* **Google Cloud Vision** (Star Cam object recognition) — the child's camera photo is sent as an in-memory buffer for `LABEL_DETECTION` only (no face/text/landmark/web-search features requested) and is **never stored** by this app or, per Google's Vision API terms, retained by Google beyond processing the request. Already disclosed in the privacy policy. No code change needed — the payload was already minimal.
* **Expo push** — a device token only, no message content beyond the notification text.
* **AWS S3 / CloudFront** — hosts uploaded media (avatars, Kids Wall photos, audio) behind access controls; not disclosed to any additional third party.
* **Mail provider (SMTP)** — transactional email only (password reset, account-deletion confirmation).

## RUK-SEC-006 — Kids Wall consent fix (2026-09-11)

**Before:** `kidsWallEnabled` defaulted to `true` and was auto-set on every new child at creation,
along with a fabricated `kidsWallConsentAt` timestamp — no parent ever took an action. Separately,
the cross-family feed endpoint (`GET /api/kids-wall/all`) had no per-family scoping and accepted a
client-supplied `isApproved` filter, so any authenticated user could see every family's children's
photos, or pass `isApproved=false` to see posts still pending moderation.

**After:**
* `kidsWallEnabled` defaults to `false`. A child only has real consent when `kidsWallEnabled` is
  exactly `true` **and** a `kidsWallConsentAt` timestamp exists (`hasKidsWallConsent()` in
  `services/kidsWallConsent.service.js`) — the two are only ever set together, by an explicit
  parent action (`PUT /api/children/:id/kids-wall-consent`), which now also records the request IP.
* The parent-facing consent toggle (web dashboard) now opens a confirmation dialog — disclosure
  text plus a required acknowledgment checkbox — before turning Kids Wall on. Turning it off needs
  no extra step. (This dialog component already existed in the codebase but was not wired in; it
  now is.)
* The cross-family feed (`kidsWallService.getChildPosts(null, ...)`) ignores any caller-supplied
  filter entirely and is hard-coded to approved + active posts from children who **currently**
  have real consent — a parent revoking consent removes that child's existing posts from the feed
  immediately, not just future posts.
* A migration (`scripts/migrateKidsWallConsentDefault.js`, `npm run migrate:kids-wall-consent-default`)
  finds children whose consent timestamp is within 60 seconds of their profile's creation time —
  i.e. set by the old auto-grant code, not a later parent action — and resets them to the safe
  default. A consent timestamp meaningfully later than creation is left untouched, since that is
  evidence of a genuine parent action.
* Post moderation was already real (posts are created `isApproved: false` and need an admin/teacher
  to approve them) — a stale code comment claiming posts were "instantly approved" has been
  corrected; no behavior change was needed there.

**Action needed:** run the migration against production once this ships:
`npm run migrate:kids-wall-consent-default` (backend directory, with `MONGODB_URI` pointed at
production). It only touches children matching the auto-grant fingerprint described above.

## RUK-SEC-026 — deletion gaps closed (2026-09-11)

Account/child deletion was missing two collections and one sweep:
* `DevicePushToken` (by `userId`) and `NotificationReceipt` (by `userId` and, per-child, by
  `childId`) are now purged.
* A parent-level orphaned-`Media` sweep (`uploadedBy: userId`) now runs after all of that parent's
  children have been purged, catching anything not already tied to a per-child collection.

`backend/tests/accountDeletion.service.test.js` covers all three additions directly.

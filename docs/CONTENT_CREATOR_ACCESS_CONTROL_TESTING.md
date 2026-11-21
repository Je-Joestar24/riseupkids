# Content creator access control: how to test it

Seven areas: Dashboard, Contents, Built-in Books, Explore, Star Cam Missions, Notifications, Experiences.
A creator with no saved list (every creator that existed before this feature) is treated as having the first five
(everything they could use before). Notifications and Experiences are never given automatically.

## 0. Before you start

1. Start the backend and the web app the way you normally do (`npm run dev` in `backend` and in `frontend`).
2. Sign in as an **admin** and open **Users**.
3. Have a second browser (or a private window) ready for signing in as a content creator. Use a private window so the
   admin session stays open.
4. Note an existing content creator (made before this feature) for step 3.

## 1. Existing creators keep what they had (nothing is migrated yet)

1. Private window: sign in as an existing content creator.
2. **Expect:** menu shows Dashboard, Contents, Built-in Books, Explore, Star Cam Missions. No Notifications, no Experiences.
3. Type `/content-creator/notifications` in the address bar. **Expect:** you are sent to the Dashboard (nothing breaks, no logout).
4. In the admin Users table that creator's **Access** column shows their five areas.

## 2. Create a new creator with a limited list (Notifications + Experiences only)

1. Admin: **Add user**, role **Content Creator**. Step 1 = details, **Next**. Step 2 = access checkboxes.
2. Try to continue with nothing ticked. **Expect:** a message that at least one area is needed.
3. Tick only **Notifications** and **Experiences**, save.
4. Private window: sign in as the new creator. **Expect:** you land straight on Notifications. Menu shows only
   Notifications and Experiences.
5. Open `/content-creator/explore` by typing it. **Expect:** sent back to Notifications.
6. Send a test notification, create an Experience. **Expect:** both work.

## 3. Dashboard is a checkbox

1. Create a creator with only **Contents**. **Expect:** after login they land on Contents, not on a Dashboard.
2. Tick **Dashboard** too (Manage access). **Expect:** Dashboard appears first in the menu and shows only tiles for their areas.

## 4. Manage access: reducing access (the live case)

1. In the private window, sign in as a creator that has Explore + Notifications and stay on the **Explore** page.
2. Admin: on that creator's row click **Manage access** (key icon), untick **Explore**, **Save**. A confirmation appears
   listing what will be removed; confirm.
3. Private window, WITHOUT refreshing: click anything that calls the server on Explore (open an item, save).
   **Expect:** a warning notice that access changed, the menu refreshes, and you are moved to Notifications.
   You are **not** logged out.
4. Untick everything: **Expect** the admin form refuses (at least one area is needed).

## 5. Bulk change

1. Admin: tick two or more creators (row checkboxes, or "Select all content creators on this page" in the header).
2. A bar appears. Choose the same list for all, confirm.
3. **Expect:** the Access column of each updates. The server treats the batch as all-or-nothing: if any one entry is
   invalid (covered by the automated tests), nothing is changed.

## 6. Server really blocks it (not just hidden menus)

Run these in the browser console of a creator who does NOT have Explore (use their own login token; they should all be
refused with HTTP **403**, never 401):

```js
await fetch('/api/explore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: '{}' }).then(r => r.status)
await fetch('/api/admin/notifications', { credentials: 'include' }).then(r => r.status)
```

The first must be 403 for a creator without Explore. The second must be 200 for a creator with Notifications and 403
without. (If your app sends the token in a header instead of a cookie, add the same `Authorization` header the app uses.)
A **teacher** must get 403 on `/api/admin/notifications` and `/api/admin/experiences`.

## 7. Existing creators: optional script

Not needed for the app to work (a missing list = the five old areas). Use it only to write the list down or to change
many at once.

```powershell
cd backend
npm run migrate:content-creator-access -- --dry-run
npm run migrate:content-creator-access
npm run migrate:content-creator-access -- --email=person@example.com --areas=notifications,experiences --dry-run
npm run migrate:content-creator-access -- --all --areas=contents,explore --dry-run
```

Always run the `--dry-run` first: it prints what it would do and writes nothing. Running it twice changes nothing the
second time. It never touches admins, teachers or parents.

## 8. Automated tests

```powershell
cd backend
npx jest --config jest.ci.config.js tests/accessAreas.test.js tests/accessErrors.test.js tests/userAccessAreas.model.test.js tests/accessArea.middleware.test.js tests/contentCreators.access.e2e.test.js tests/contentCreators.routeLocks.e2e.test.js tests/migrateContentCreatorAccess.test.js
```

```powershell
cd frontend
npx vitest run src/router src/utils src/hooks src/components/admin/users src/components/contentcreator src/pages/contentcreator src/components/common
```

Known, unrelated backend failures (they fail without this feature too): the real-SMTP `mail.test.js` when it runs
under plain `jest` (use `jest.ci.config.js`) and an occasional flake in `twoFactor.flagDrift`.

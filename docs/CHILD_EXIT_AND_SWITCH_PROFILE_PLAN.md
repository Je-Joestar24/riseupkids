# Child side: Select Profile, Exit and Log out (UI plan)

Status: plan only, nothing built yet. Covers the **web** (`frontend`) and the **app** (`app`).

## 1. The problem today

Once a parent picks a child, the child area has **no way back**.

| | Web | App |
|---|---|---|
| Picker ("Pick your profile") | `/parents/child` (`ParentsChild.jsx`) | `/parent/selectchild` (`selectchild.tsx`) |
| Header (`ChilHeader.jsx` / `header-nav.tsx`) | Logo + ⭐ points button only. The points button opens the child's profile. | Logo + notification bell + ⭐ points button. The points button opens the profile. |
| Bottom bar | Home, My Journey, Explore, Kid's Wall | Same (3 tabs on iOS, no Kid's Wall) |
| Child profile page | Stats, next level, badges (`ChildProfile.jsx`). **No actions.** | `profile.tsx` is a **"Coming soon" placeholder**. |
| Select Profile / Exit / Log out | **None** | **None** (only the picker has Log out and the settings cog) |

So a family with two children, or a parent who wants to log out, can only leave by killing the app or editing the
address bar.

Two more things found while reading the code:

- The picker is the **parent's home**. It has *Add New Kid*, delete a child, the settings cog (which holds
  *Delete my account*) and *Log out*. If a child can reach it with one tap, a child can reach those too. **There is no
  parent gate anywhere in the project today.**
- Web keeps the chosen child in `sessionStorage` (`selectedChildId`, `selectedChild`). It must be cleared when the
  child area is left.

## 2. The three actions (what each one means)

| Action | Meaning | Lands on |
|---|---|---|
| **Select Profile** | Another child of the same parent will play. | The picker (web `/parents/child`, app `/parent/selectchild`) |
| **Exit** | The grown-up leaves the child area to manage things (add a kid, settings, notifications). | The same picker, because that is the parent home on both platforms |
| **Log out** | End the whole session on this device. | Login (web `/parents/login`, app `/`) |

Select Profile and Exit end up on the same screen today, so the UI shows **one button for both**, named
**"Select Profile"**, plus a separate **"Log out"**. If the client wants *Exit* to mean something different later (for
example a parent dashboard), only the destination changes. See open question 1.

## 3. Where they go

**On the child's Profile page** (the page the ⭐ points button opens), as a section at the very bottom, under the
latest badges. This is what was asked for, and it keeps the child's everyday screens (Home, Journey, Explore) free
of buttons a child can press by accident.

```
 ┌───────────────────────────────┐
 │  Header (logo, bell, ⭐ 120)   │
 ├───────────────────────────────┤
 │  Mia · level, stars, streak    │
 │  Next level progress           │
 │  All badges                    │
 │  Latest badges                 │
 │  ─────────────────────────     │
 │  [ 👥  Select Profile ]            │   <- teal, same look as other child buttons
 │  [ ⎋  Log out     ]            │   <- quiet / outlined, smaller than Select Profile
 ├───────────────────────────────┤
 │  Home · My Journey · Explore…  │
 └───────────────────────────────┘
```

- Two full-width buttons on a phone, side by side on a laptop (max width 848 px, like the rest of the page).
- Big, rounded, kid-style (min 48 px tall), icon + words. *Log out* is visibly quieter so it is not the first thing
  pressed.
- Child-friendly words, no jargon: "Select Profile", "Log out".
- Phone sizes follow the existing helpers on the web (`phoneFluid`, `PHONE_LANDSCAPE_QUERY`); the app uses the existing
  `spacing`/`typography` tokens.
- Not added to the header or bottom bar, on purpose: they are always on screen and a child would press them.

## 4. Protecting it: the parent check

A child must not be able to log the family out, or reach *Delete my account*, by tapping around. Recommended: a
**small grown-up check** before any of the three actions leave the profile page.

- A dialog: "Ask a grown-up" and one question such as **"What is 7 × 8?"** with number choices (randomised each time,
  answers an adult finds trivial and a young child cannot guess in one try). Wrong answer: shake, new question.
- Cancel closes it with nothing changed.
- After a correct answer: *Select Profile* goes straight to the picker; *Log out* then shows the normal
  "Log out?" confirm that already exists in the app (`selectchild.tsx`).
- One shared component per platform (`ParentCheckDialog`), reused by both buttons.

Why: it protects the picker (delete child, settings, delete account, log out) behind one door. It also matches what
the stores expect from a kids app. Without it the buttons are a hole in the child area.

## 5. What happens when leaving (cleanup)

Select Profile / Log out must leave nothing of the previous child behind:

1. **Stop anything playing** (video, audio, CMS book music) and close open dialogs.
2. **Go with `replace`, not `push`**, so the Back button / swipe cannot return into the previous child.
   Android hardware Back on the picker must not go back to the child.
3. **Web:** remove `selectedChildId` and `selectedChild` from `sessionStorage`.
4. **Log out only:** call the existing logout (`useAuth().logout()` on the app, the logout action on the web) and
   clear child data kept in memory (web `useCachedLoad` cache is per child; app stores are keyed by child, so they
   are cleared on logout). It must **not** be a path that surfaces as a 401 and looks like a crash
   (see the rule "never let a backend error log the frontend out").
5. Picking another kid on the picker must show that kid's own data (the caches are keyed by child, so this holds;
   a test proves it).
6. Notification bell: unaffected.

## 6. Steps

### Phase 1: Web (`frontend`) — about 4 h
1. `ParentCheckDialog.jsx` (MUI Dialog, number choices, random question, shake on wrong, phone-sized fonts).
2. `ChildProfileActions.jsx`: the two buttons + dialog + the leave logic (cleanup above).
3. Add it to `ChildProfile.jsx` under the badges. Shown even while the profile is loading or failed to load, so a
   child on a bad connection can still get out.
4. Skeleton: nothing (the buttons do not wait for data).

### Phase 2: App (`app`) — about 5 h
1. `profile.tsx` is a placeholder, so first turn it into a real screen with the same section: a heading and the two
   buttons (the stats/badges for the app profile are a separate piece of work and are not part of this).
2. `components/child/profile/parent-check-dialog.tsx` and `profile-actions.tsx`.
3. Leave with `router.replace('/parent/selectchild')`; log out with the existing logout and `router.replace('/')`.
4. Check Android Back from the picker, and the iOS swipe-back, cannot re-enter a child.
5. Screen-capture guard stays on child routes (unchanged); the picker is a parent route (unchanged).

### Phase 3: Tests — about 4 h
Web (vitest) and app (jest-expo), written together with the code:
- Buttons are present on the profile page, also while loading and on a load error.
- Wrong answer does nothing; right answer continues; Cancel does nothing; the question changes every time.
- Select Profile: lands on the picker, `selectedChild*` removed, Back does not return, then picking the **other** child
  shows that child's profile (no data from the first).
- Log out: confirm shown, logout called once, lands on login, child data cleared; a failing logout shows a message
  and stays put.
- Phone layout: both buttons full width, fonts fit at 360 px width (same method as the other phone layout tests).
- Then the usual break-it check on a scratch copy.

### Phase 4: Docs and real-device check — about 1 h
- Short doc update; checklist: phone web, Android, iPhone, two kids, log out, log back in.

**Total about 14 h** (estimate).

## 7. Open questions for the client

1. **Is "Exit" different from "Select Profile"?** Today both go to the same picker. Default in this plan: one button.
2. **Parent check wanted?** Recommended yes (section 4). If the client does not want it, the picker's delete/settings
   controls need a gate instead, or children can reach them.
3. **Should a child be able to switch to a sibling without a grown-up?** Default: no, it also uses the check, because
   the picker holds the parent controls.
4. **Wording**: "Select Profile" / "Log out" okay, or "Pick your profile" / "Sign out"?
5. **Android Back on Home**: today it is not handled. Default: leave as is (it exits the app).

## 8. Out of scope

- The app's profile stats and badges (the page is a placeholder today).
- Any change to the picker itself, the parent dashboard or login.
- Explore videos, SCORM and HTML5 players.

# Rise Up Kids — App Plan (Parent & Child Only)

## 1. Repository & Project Layout (Single Repo)

**The React Native app lives in this same repository**, in an **`app/`** folder. There is **no separate repo** for the app.

### Why same repo

- **Single source of truth:** Backend, web frontend, and mobile app are in one place. Cursor (and any AI/developer) sees the full project: API, web flows, and app flows.
- **Shared context:** `README.md`, `APP_PLAN.md`, SCORM/Meeting/YouTube docs, and `.cursor` rules apply to the whole project. The app consumes the same backend; keeping everything together keeps API contracts and docs in sync.
- **Simpler setup:** One clone, one workspace. Run backend + web from repo root; run the app from `app/`.

### Repo structure (for Cursor & developers)

```
RiseUpKids/                    # Repo root — backend, web, app together
├── backend/                   # Express API (shared by web + app)
├── frontend/                  # Web app (React/Vite) — Admin, Teacher, Parent, Child
├── app/                       # React Native app — Parent + Child only (no Admin/Teacher)
├── README.md                  # Full LMS overview
├── APP_PLAN.md                # This file — app scope, layout, dependencies
├── APP_README.md              # App structure reference (src/ layout)
├── SCORM_INTEGRATION_GUIDE.md
├── GOOGLE_MEETING_INTEGRATION.md
└── .cursor/
```

- **`backend/`** — Used by both **frontend** (web) and **app** (mobile). No duplicate API.
- **`frontend/`** — Web only: Admin, Teacher, Parent, Child.
- **`app/`** — Mobile only: **Parent** and **Child** (no Admin, no Teacher).

When working in Cursor, open the **RiseUpKids** workspace so all three (`backend`, `frontend`, `app`) are visible; the app plan and API docs then apply to the whole project.

---

## 2. Overview

This document defines the **React Native app** (in **`app/`**) for the Rise Up Kids LMS. The app is **Parent + Child only**:

- **Parent** — Account owner, child management, progress, subscription (Stripe).
- **Child** — Learning: home, journey, books, videos, activities, SCORM, explore, meetings, YouTube, Kids Wall.

**Out of scope in the app:** Teacher and Admin (they use the **web** frontend only).

**Chosen stack:** **Expo** — single codebase for iOS and Android, EAS Build, and alignment with the rest of the plan (portrait-only, theming, responsive).

---

## 3. Device, Orientation & Responsiveness

The app is **mobile-only**, **portrait-only**, and **responsive** from phone to tablet. It does **not** support desktop/PC or landscape-first layouts.

| Rule | Detail |
|------|--------|
| **Platforms** | **iOS** and **Android** only (same codebase via Expo). |
| **Largest screen** | **iPad** (tablet). Layouts must scale up to iPad; no larger breakpoints. |
| **Smallest** | Phone (e.g. iPhone SE / small Android). |
| **Orientation** | **Portrait only** (standing phone). No landscape-only screens; rotation can be locked to portrait. |
| **No PC/desktop** | No web build, no Electron, no desktop targets. |

**Implementation:**

- **Orientation lock:** In `app.json` / `app.config.js`, set `"orientation": "portrait"` so the app stays in portrait on all screens.
- **Responsive layout:** Use breakpoints or width buckets (e.g. phone vs tablet) so UI scales from phone to iPad — flexible grids, scalable typography, and touch targets that work on both. Test on phone and iPad (or equivalent Android tablet).
- **Single codebase:** One React Native/Expo codebase; no separate iOS vs Android UI logic except where required by the platform (e.g. safe area, status bar).

---

## 4. Theming (aligned with web)

The app uses the **same visual theme** as the web app so Rise Up Kids looks consistent across web (frontend) and app.

**Source of truth (web):** `frontend/src/config/themeColors.js`

**App theme location:** `app/src/config/theme/` — colors, spacing, typography, radii. Values **mirror** the web theme; only the format is React Native–friendly (no `linear-gradient` strings; use `expo-linear-gradient` or similar for gradients).

### Color palette (from themeColors.js)

| Token | Web value | App usage |
|-------|-----------|-----------|
| **primary** | `#85c2b9` | Primary actions, headers, brand |
| **secondary** | `#62caca` | Secondary actions, teal accents |
| **accent** | `#f2af10` | Highlights, CTAs, warning |
| **orange** | `#e98a68` | Orange accent, buttons |
| **success** | `#10b981` | Success states |
| **warning** | `#f2af10` | Warnings (same as accent) |
| **error** | `#ef4444` | Errors, destructive |
| **bgSolid** | `#62caca` | Solid teal background |
| **bgSecondary** | `#f8fafc` | Secondary background |
| **bgTertiary** | `#f1f5f9` | Tertiary background |
| **bgCard** | `rgba(255,255,255,0.95)` | Cards, sheets |
| **bgOverlay** | `rgba(255,255,255,0.9)` | Overlays |
| **bgLogin** | `rgb(244,237,216)` | Login/signup screens |
| **text** | `#0f172a` | Primary text |
| **textSecondary** | `#475569` | Secondary text |
| **textMuted** | `#64748b` | Muted text |
| **textInverse** | `#ffffff` | Text on dark/colored bg |
| **textTeal** | `#62caca` | Teal text |
| **border** | `#e2e8f0` | Default borders |
| **borderSecondary** | `#cbd5e1` | Secondary borders |
| **borderAccent** | `rgba(242,175,16,0.3)` | Accent border |
| **borderOrange** | `rgba(233,138,104,0.3)` | Orange border |
| **btnYellow** | `#f2af10` | Yellow button |
| **btnTeal** | `#62caca` | Teal button |
| **btnOrange** | `#e98a68` | Orange button |

**Gradients (web → app):**

- `bgGradient`: `linear-gradient(to right bottom, rgb(98,202,202), rgb(133,194,185), rgb(98,202,202))` → implement in app with `expo-linear-gradient` (e.g. `colors: ['#62caca', '#85c2b9', '#62caca']`, appropriate angle).
- `bgOrangeGradient`: `linear-gradient(to right, rgb(233,138,104), rgb(233,138,104))` → solid `#e98a68` or same via LinearGradient.

**App theme structure (suggested):**

```
app/src/config/theme/
├── colors.ts      # Same palette as themeColors.js (hex/rgb)
├── spacing.ts    # 4/8/12/16/24/32 etc.
├── typography.ts # Font sizes, weights (child-friendly)
├── radii.ts      # Border radii for cards, buttons
├── light.ts      # Light theme (default; matches web)
└── index.ts      # Export theme + useTheme hook / context
```

When changing the brand (e.g. new primary color), update **both** `frontend/src/config/themeColors.js` and `app/src/config/theme/colors.ts` (or document one as source and the other as generated) so web and app stay in sync.

---

## 5. App Scope Summary

| Area   | In app | Notes                                      |
|--------|--------|--------------------------------------------|
| Parent | ✅     | Login, signup, dashboard, children, progress, Stripe |
| Child  | ✅     | Home, Journey, books, videos, SCORM, Explore, Meet, YouTube, Kids Wall |
| Teacher| ❌     | Web only                                   |
| Admin  | ❌     | Web only                                   |

---

## 6. App Structure (inside `app/`)

The app follows the structure in `APP_README.md`. Root of the app codebase is **`app/`**:

```
app/
├── package.json
├── app.json                 # Expo config: orientation "portrait", name, slug, etc.
├── app.config.js            # Optional: dynamic config (env, scheme)
├── tsconfig.json
├── eas.json                 # EAS Build profiles (development, preview, production)
└── src/
    ├── app/
    │   ├── App.tsx
    │   ├── bootstrap.ts
    │   └── providers.tsx
    ├── navigation/
    │   ├── RootNavigator.tsx
    │   ├── AuthNavigator.tsx
    │   ├── MainNavigator.tsx
    │   ├── ParentTabNavigator.tsx
    │   └── ChildTabNavigator.tsx
    ├── features/
    │   ├── auth/
    │   ├── parent/          # dashboard, children, progress, subscription
    │   └── child/           # home, journey, books, videos, scorm, explore, meetings, youtube, kidswall
    ├── components/
    ├── services/            # api, storage, scorm, meeting, youtube, stripe
    ├── stores/
    ├── hooks/
    ├── config/
    │   └── theme/           # Same palette as frontend/src/config/themeColors.js
    │       ├── colors.ts
    │       ├── spacing.ts
    │       ├── typography.ts
    │       ├── radii.ts
    │       ├── light.ts
    │       └── index.ts
    ├── utils/
    ├── assets/
    └── types/
```

- **API base URL** for the app points at the **same backend** (e.g. `../backend` in dev or your deployed API URL). No separate backend for the app.

---

## 7. Dependencies (install in `app/`)

Run from **`app/`** (not repo root). Backend deps stay in `backend/`; the app only consumes the API.

- **Expo:** `expo` (SDK), `expo-status-bar`, `expo-linear-gradient` (for theme gradients; same as web `bgGradient` / `bgOrangeGradient`)
- **Core:** React Navigation (native-stack, bottom-tabs), react-native-safe-area-context, react-native-screens
- **Auth & API:** axios, @react-native-async-storage/async-storage, react-native-keychain
- **SCORM:** react-native-webview (content + backend SCORM APIs for progress/completion)
- **Meetings:** react-native-inappbrowser-reborn (open Google Meet link from API)
- **YouTube:** react-native-youtube-iframe (or WebView with embed URL)
- **Stripe:** @stripe/stripe-react-native (when adding parent subscription)
- **Media:** expo-av (audio/video for books and in-app video; fits Expo)
- **State & forms:** zustand, react-hook-form, @hookform/resolvers, date-fns

**Theming:** Use `app/src/config/theme/` (Section 4); `expo-linear-gradient` for gradients aligned with `frontend/src/config/themeColors.js`.

---

## 8. Building the App (Expo — APK, AAB, iOS)

**We use Expo.** One codebase for **iOS** and **Android**; builds via **EAS Build**. It is **not** just `npm run build` — the installable app (APK/AAB/IPA) is produced by EAS or native toolchain.

### Build outputs

| Platform | Output | Use |
|----------|--------|-----|
| **Android** | `.apk` or `.aab` | APK = direct install / testing; AAB = Google Play upload |
| **iOS** | `.ipa` | TestFlight or App Store (Apple Developer account required) |

### Expo config (orientation & platforms)

In **`app.json`** (or **`app.config.js`**):

- **Orientation:** `"orientation": "portrait"` — app is portrait-only (standing phone/tablet).
- **Platforms:** `"ios"` and `"android"` only; no `web` if we want to avoid accidental web build, or keep `web` disabled in EAS profiles.

Example snippet:

```json
{
  "expo": {
    "name": "Rise Up Kids",
    "slug": "riseupkids",
    "orientation": "portrait",
    "platforms": ["ios", "android"]
  }
}
```

### Commands (from `app/`)

| Goal | Command |
|------|---------|
| **Dev (run on device/simulator)** | `npx expo start` — QR for Expo Go, or `a` / `i` for emulator |
| **Android APK/AAB** | `npx eas build --platform android --profile production` |
| **iOS IPA** | `npx eas build --platform ios --profile production` |
| **Both** | `npx eas build --platform all --profile production` |

Optional in **`app/package.json`**:

- `"start": "expo start"`
- `"build:android": "eas build --platform android --non-interactive"`
- `"build:ios": "eas build --platform ios --non-interactive"`

**Note:** `npm run build` in Expo usually builds the **JS bundle** only, not the APK/IPA. Use **`eas build`** for installable binaries.

### Requirements

- **Android:** EAS Build can run in the cloud; no local Android Studio required. For local builds: Android Studio, JDK, release keystore.
- **iOS:** Apple Developer account ($99/year). EAS can build in the cloud.
- **EAS:** Expo account and `eas-cli` (`npm i -g eas-cli`); run `eas build:configure` once in `app/`.

---

## 9. References

- **APP_README.md** — Detailed `src/` layout and feature list for the app.
- **README.md** — Full LMS overview, roles, and features.
- **frontend/src/config/themeColors.js** — Web theme; app theme in `app/src/config/theme/` must match (see Section 4).
- **SCORM_INTEGRATION_GUIDE.md** — SCORM; app uses same backend SCORM APIs.
- **GOOGLE_MEETING_INTEGRATION.md** — Meetings created on web; app only joins via link.

---

## 10. One-Line Summary

**Rise Up Kids app:** **Expo** app in **`app/`** (same repo), **Parent + Child only**, **iOS + Android**, **portrait-only**, **responsive (phone → iPad)**, **same theme as** `frontend/src/config/themeColors.js`. No PC, no Admin/Teacher. Cursor: **RiseUpKids** = `backend/`, `frontend/`, `app/`.

# Plan: Sales Site Header, Footer, Grant Location, Pinterest Verify

> **Status (August 2026):** Implemented in `riseupkids-sale/web` — Pinterest meta is live after production deploy  
> **Source:** Client email to Jejomar (Pinterest meta + 3 website changes)  
> **Scope:** Marketing site `riseupkids-sale/web` (`riseup.kids`) only  
> **Out of scope:** LMS (`frontend/`, `app/`), checkout header, legal static HTML (privacy/terms), school English-experience player

---

## Goal

Ship four client-requested updates on the public sales site:

1. Pinterest domain verification meta tag in `<head>`
2. Sticky header stays full-size at the top, then compact (~60–65px) after ~60px of scroll
3. Footer copyright becomes two centered lines (copyright + US headquarters)
4. Grant Eckstein endorsement adds **Provo, Utah, USA**

Client sample JS/CSS is **reference only**. This site uses MUI `AppBar` / `sx`, not `.site-header` class names. Map the behavior onto the files below.

---

## 1. Pinterest domain verification

Add this exact tag inside the main site `<head>`:

```html
<meta name="p:domain_verify" content="3393ad571f6109ef489500cf6b4688a1"/>
```

### Where

| File | Why |
|------|-----|
| `riseupkids-sale/web/index.html` | Primary. Vite template for SPA + prerender `dist/index.html` |
| Optional: `riseupkids-sale/web/src/seo/buildSeoHeadMarkup.js` | Only if prerender strips unknown metas (today it upserts title/description/OG; static `index.html` tags should survive) |

Do **not** add to `frontend/index.html` (LMS). Pinterest verifies the marketing domain.

### Done when

View-source on production `https://riseup.kids` shows `p:domain_verify` in `<head>`. Tell the client once it is live.

---

## 2. Compact sticky header on scroll

### Current

| Piece | File | Today |
|-------|------|--------|
| Sticky bar | `web/src/components/common/NavHeaders.jsx` | `position="sticky"`, **fixed height 250px**, white, light shadow |
| Height constant | `web/src/config/constants.js` | `NAV_APP_BAR_HEIGHT_PX = 250` |
| Logo | `web/src/components/common/NavLogo.jsx` | Image **130px** tall, `py: 2`, ™ at `top: 12 / right: 135` |
| Layout | NavHeaders Toolbar | Two rows: languages + login on top, logo centered below, `marginTop: 20px` |
| Used by | `HomePage`, `ParentPage`, `SchoolsPage`, `VideoLibrary`, privacy pages | Same `NavHeaders` |
| Coupled layout | `web/src/components/school/HeroSection/HeroMain.jsx` | `minHeight: calc(100vh - 250px)` |

Client mock used a 70px → 42px logo and 22px → 8px padding. **Do not copy those numbers.** Keep the **current expanded look** at `scrollY <= 60`. Only the scrolled state is new.

### Target behavior

- `window.scrollY <= 60`: header **identical** to today (250px, 130px logo, same padding, same two-row layout).
- `window.scrollY > 60`: compact sticky header **~60–65px** tall.
- Transition **250–300ms** on height, padding, logo height, box-shadow (client: `0.25s ease`; 300ms is also allowed).
- Compact: smaller logo + less vertical padding. Two-row 250px **cannot** fit in 65px without flattening — when scrolled, switch to a **single row** (smaller logo + languages/login) while expanded stays two-row.
- Compact background: white; slightly stronger shadow (`0 3px 14px rgba(0,0,0,0.08)` is the client spec).
- Expanded shadow can stay `0 6px 18px rgba(15, 23, 42, 0.06)`.

### Implementation notes

1. Extract scroll state into a hook (e.g. `useScrolledHeader(60)`): listen to `scroll`, `setScrolled(window.scrollY > 60)`, call once on mount, remove listener on unmount. Guard `window` for SSR/prerender.
2. Pass `scrolled` into `NavHeaders` / `NavLogo` (logo height + ™ position must scale; do not leave `right: 135` on a ~42px logo).
3. Animate `AppBar` `height`, Toolbar `minHeight` / `marginTop`, logo `height`, `py`. Prefer MUI `transitions.create` ~250–300ms.
4. **Hero:** keep `NAV_APP_BAR_HEIGHT_PX = 250` for first-paint `100vh - 250px`. Do not shrink the hero offset with the compact bar (would jump the schools hero).
5. Skip `CheckoutHeader.jsx` (not sticky, not this request).

### Suggested compact numbers (map client 60–65px onto our header)

| Token | Expanded (unchanged) | Compact |
|-------|----------------------|---------|
| AppBar height | 250px | 62px (60–65 range) |
| Logo height | 130px | ~40–44px |
| Toolbar marginTop | 20px | 0 |
| Logo py | 16px (`py: 2`) | 0–4px |
| Layout | two rows | one row, vertically centered |

---

## 3. Footer copyright — two centered lines

### Current

`web/src/components/home/footer/FooterCopyright.jsx`

- Two lines already, but they are **split copyright / rights**, not copyright / headquarters.
- `fontSize: 1.125rem` (18px), `fontWeight: 600`, `color: grey.600`, centered under a `#d4e6e3` divider.
- Keys: `footer.copyright` (`© 2026 Rise Up Kids.`), `footer.rightsReserved` (`All rights reserved.`).

Keep footer columns, logo, divider, colors, and spacing. Only change the copyright block. Do not add extra footer padding/height.

### Target copy

| Lang | Line 1 | Line 2 |
|------|--------|--------|
| EN | © 2026 Rise Up Kids. All rights reserved. | Headquartered in the United States. |
| ES | © 2026 Rise Up Kids. Todos los derechos reservados. | Con sede en los Estados Unidos. |
| PT | © 2026 Rise Up Kids. Todos os direitos reservados. | Com sede nos Estados Unidos. |

### Specs

| Token | Desktop | Mobile (`xs`) |
|-------|---------|----------------|
| Font size | 16px | 14px |
| Weight | 400 | 400 |
| Color | existing `grey.600` | same |
| Align | center | center |
| Line-height | 1.5 | 1.5 |
| Gap | 4–6px | 4–6px |
| Line 1 wrap | no need | allow wrap |

### i18n

Prefer:

- `footer.copyright` → full line 1 (merge old copyright + rights).
- `footer.headquarters` → line 2 (new).
- Remove uses of `footer.rightsReserved` (or leave unused key; do not keep rendering it).

Update `web/src/i18n/en.json`, `es.json`, `pt.json`.

Static legal pages (`legal/privacy`, `legal/terms`) are out of scope unless the client asks.

---

## 4. Grant Eckstein — add location

### Current

Card already supports three text rows: `name`, `role`, `credentials`.

`schools.educationSpecialists.grant.credentials` is **`""`** in EN/ES/PT, so the location row is hidden (`EducationSpecialistsSayCard.jsx` only renders credentials when non-empty).

Name and role already match the request:

- Dr. Grant Eckstein, Ph.D.
- Professor of Linguistics at Brigham Young University  
  (ES: Profesor de Lingüística de la Brigham Young University; PT: Professor de Linguística da Brigham Young University)

### Change

Set `grant.credentials` to the location (client: “we just need to add the location”):

| Lang | `credentials` |
|------|----------------|
| EN | Provo, Utah, USA |
| ES | Provo, Utah, EE. UU. |
| PT | Provo, Utah, EUA |

No component layout change required unless spacing looks tight; existing credentials style is `0.875rem` / `grey.500`. Keep Sarah’s credentials as-is.

Shown on **schools and parents** (same `EducationSpecialistsSay` block).

---

## Files to touch

| File | Change |
|------|--------|
| `riseupkids-sale/web/index.html` | Pinterest meta |
| `riseupkids-sale/web/src/hooks/useScrolledHeader.js` | **New** — scroll threshold hook |
| `riseupkids-sale/web/src/components/common/NavHeaders.jsx` | Compact vs expanded AppBar |
| `riseupkids-sale/web/src/components/common/NavLogo.jsx` | Logo / ™ size when scrolled |
| `riseupkids-sale/web/src/config/constants.js` | Optional compact height constant; **keep** `NAV_APP_BAR_HEIGHT_PX = 250` |
| `riseupkids-sale/web/src/components/home/footer/FooterCopyright.jsx` | Two-line spec |
| `riseupkids-sale/web/src/i18n/en.json` | Footer + Grant |
| `riseupkids-sale/web/src/i18n/es.json` | Footer + Grant |
| `riseupkids-sale/web/src/i18n/pt.json` | Footer + Grant |

---

## Test plan

- [x] HTML includes `<meta name="p:domain_verify" content="3393ad571f6109ef489500cf6b4688a1"/>` (`index.html`, prerender upsert, SPA `usePageSeo`)
- [x] Expanded header keeps 250px / 130px logo at top of page
- [x] After ~60px scroll: compact ~62px, 250ms transition, smaller logo, stronger shadow
- [ ] Scroll back to top: header expands to original (manual QA)
- [ ] Language switcher + Login still usable in compact mode (manual QA)
- [x] Schools hero still uses `NAV_APP_BAR_HEIGHT_PX = 250`
- [x] Footer: two centered lines, 16px desktop / 14px mobile, weight 400, 5px gap
- [x] EN / ES / PT footer strings match the table above
- [x] Grant card `credentials` is Provo, Utah (EN/ES/PT); Sarah unchanged
- [x] Scroll hook guards `window` for SSR/prerender

---

## Deploy note

Pinterest verification only counts after **production** deploy. After release, reply to the client that the meta tag is live on riseup.kids.

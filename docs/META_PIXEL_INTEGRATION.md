# Meta (Facebook) Pixel — marketing site integration

Client request (Sep 2026): install the Meta Pixel on the sales site (`riseup.kids`)
for ad measurement and retargeting. Pixel ID **2179157309694161**, owned by the
RiseUpKids Meta business account.

Scope: the **marketing site only** (`riseupkids-sale/web`). Nothing here touches the
LMS app, child profiles, or any child learning data.

## How it works

The Pixel is **consent-gated** and is **never in the served HTML**. It is injected
by JavaScript only after the visitor accepts the cookie banner.

| Piece | File |
|---|---|
| Consent state (`granted` / `denied`, default denied) | `src/analytics/cookieConsent.js` |
| Reactive hook (SSG-safe) | `src/hooks/useCookieConsent.js` |
| Cookie banner (themed MUI, en/es/pt) | `src/components/common/CookieConsentBanner.jsx` |
| Pixel loader + event helpers | `src/analytics/metaPixel.js` |
| Checkout funnel events + purchase-intent stash | `src/analytics/checkoutTracking.js` |
| Loads Pixel on consent, fires SPA `PageView` | `src/analytics/AnalyticsListener.jsx` |
| Mount point (client-only, not SSR) | `src/app/router/ClientRouter.jsx` |

Flow: first visit → banner shows, nothing tracks → **Accept** → `fbevents.js` loads,
`fbq('init')` + `PageView` → choice saved in `localStorage` (`ruk_cookie_consent`),
banner gone. **Decline** → Pixel never loads, no Facebook cookies. To re-choose, the
visitor clears site data for `riseup.kids`.

Dev/staging: set by `VITE_META_PIXEL_ID`. With no ID configured, every analytics
call is a no-op. The value is public (it appears in page source by design).

## Events

| Event | Where | Notes |
|---|---|---|
| `PageView` | every route (`AnalyticsListener`) | initial + each SPA navigation |
| `Lead` | waitlist form success (`InvitationForm.jsx`) | `content_name: founding_families_waitlist` |
| `InitiateCheckout` | `/checkout/register` mount (`CheckoutRegister.jsx`) | value + currency from plan pricing |
| `Purchase` | `/checkout/success`, verified only (`CheckoutSuccess.jsx`) | value + currency from the intent stashed in `sessionStorage` at checkout, so it survives the Stripe / PagSeguro redirect; falls back to currency-only |

Currency follows site language: `pt → BRL`, `en → USD`, `es → EUR`.

## CSP

`riseupkids-sale/web/index.html` meta CSP adds:
- `script-src` → `https://connect.facebook.net`
- `connect-src` → `https://connect.facebook.net https://www.facebook.com`

The CloudFront Response Headers Policy for `riseup.kids` must be updated to match —
see `docs/CLOUDFRONT_RESPONSE_HEADERS_POLICY.md`.

## Privacy policy

`legal/privacy/body.html` updated (version `2026-09-08`): new section **2.7
Marketing website cookies and analytics**, Meta added to the third-party list
(§4), and §3 now discloses consent-based sharing with Meta and the CCPA
"sale"/"sharing" implication. Static pages regenerated via
`scripts/rebuild-legal-index.mjs` + `scripts/sync-legal.mjs`.

## Verifying in production

1. Open `riseup.kids`, accept the cookie banner.
2. Meta Events Manager → Test Events, or the **Meta Pixel Helper** Chrome extension.
3. Expect `PageView` immediately; `Lead` on waitlist submit; `InitiateCheckout` /
   `Purchase` through the checkout flow.
4. Data sources status should flip to **Active** within ~20 min.

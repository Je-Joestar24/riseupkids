# CloudFront Response Headers Policy — setup steps

The meta-tag CSP added to `frontend/index.html` and `riseupkids-sale/web/index.html` only covers `Content-Security-Policy`. A `<meta>` tag cannot set `X-Frame-Options`, `Strict-Transport-Security` (HSTS), `frame-ancestors`, or `X-Content-Type-Options` — those only work as real HTTP response headers, which for a static S3+CloudFront site means a **CloudFront Response Headers Policy**. This needs AWS console access, so these are ready-to-paste values for whoever has it.

There are two distributions, two policies (their CSPs differ — the admin app doesn't load PayPal/YouTube, the sales site does).

## Steps (repeat once per distribution)

1. AWS Console → CloudFront → **Policies** → **Response headers** → **Create response headers policy**.
2. Name it (e.g. `riseupkids-admin-security-headers` or `riseupkids-sales-security-headers`).
3. Under **Security headers**, enable and set:

| Header | Value |
|---|---|
| Content-Security-Policy | see per-site value below |
| X-Content-Type-Options | `nosniff` (enable) |
| X-Frame-Options | `SAMEORIGIN` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` |

Leave **Override** checked for each — otherwise an origin-set header (there shouldn't be one from S3) would win.

4. Save the policy.
5. Go to the distribution → **Behaviors** tab → edit the default (and any other relevant) behavior → **Response headers policy** → select the policy you just created → Save.
6. Repeat steps 2–5 for the second distribution with its own CSP value.
7. Wait for the distribution status to return to "Deployed" (~a few minutes), then verify:
   ```bash
   curl -sI https://app.riseup.kids | grep -i "content-security-policy\|x-frame-options\|strict-transport"
   curl -sI https://riseup.kids | grep -i "content-security-policy\|x-frame-options\|strict-transport"
   ```
   Each should show the new headers. Then open both sites in a browser and click through the main flows (login, dashboard, checkout, video pages) once, watching the console for `Content-Security-Policy` violation errors — same check already done locally against the meta-tag version, but the CloudFront header additionally enforces `frame-ancestors` and `X-Frame-Options`, which weren't testable via the meta tag.

## admin.riseup.kids / app.riseup.kids — CSP value

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: data: blob:; media-src 'self' https: blob:; connect-src 'self' https://api.riseup.kids https://*.cloudfront.net; frame-src 'self' https: blob:; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'
```

Same as the meta tag in `frontend/index.html`, plus `frame-ancestors 'self'` (blocks the admin app from being iframed on another site — clickjacking protection; meta tags can't set this directive at all, which is exactly why this needs to be a real header).

## riseup.kids (sales site) — CSP value

```
default-src 'self'; script-src 'self' 'unsafe-inline' https://www.paypal.com https://www.paypalobjects.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' https: data: blob:; media-src 'self' https: blob:; connect-src 'self' https://api.riseup.kids https://*.cloudfront.net https://www.paypal.com; frame-src 'self' https://www.paypal.com https://www.youtube.com; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://riseupkids.myflodesk.com
```

Same as the meta tag in `riseupkids-sale/web/index.html`, plus `frame-ancestors 'self'`.

## Why `'unsafe-inline'` is in script-src for the sales site but not the admin app

The sales site is server-side pre-rendered (SSG) and its build output ships small inline `<script>` blocks used to hydrate the pre-rendered React pages. Verified locally: with a strict `script-src 'self'` (no `unsafe-inline`), the `/privacy` and `/terms` pages threw a CSP violation and failed to hydrate (blank interactive page). The admin app is a plain client-rendered SPA with no inline scripts, so it keeps the stricter `script-src 'self'` with no exception. Both cases were confirmed by building each app and checking the browser console — a clean run has zero `Content-Security-Policy` violation errors and zero related `Uncaught` errors on the main pages (home, login, privacy, terms, videos).

## Known gaps this still doesn't close

- Neither policy is exact — `img-src`/`media-src`/`connect-src` are intentionally broad (`https:`) because the exact CloudFront/S3 media domain wasn't available to verify against. Once deployed, watch the browser console for a few days; tighten `img-src`/`media-src`/`connect-src` to the real domain once confirmed instead of the broad `https:` allowance.
- This only covers the two static sites (`app.riseup.kids`, `riseup.kids`). It does not change anything on the API server, which already sends its own security headers via `helmet` (see `docs/SECURITY_AUDIT_2026.md`).

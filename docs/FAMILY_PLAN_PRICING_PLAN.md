# Family Plan pricing: one price list for Stripe, PayPal and PagBank

Status: PHASES 1, 2 AND 3 ALL BUILT (uncommitted). `npm run pricing:check` shows "All places agree with the price list."
Scope order (agreed): 1) runnable scripts and checks, 2) backend behaviour, 3) screens.

## Phase 1 status (built, tested, uncommitted)

What exists now:
- `backend/config/familyPlanPricing.js` + `backend/services/familyPlanPricing.service.js`: the ONE price list (cents, 1 to 4 children, annual + monthly, monthly switch OFF) and the functions every provider will use. Refuses 0, 5+, decimals, text; never clamps.
- `backend/config/stripeFamilyPlanFile.js`: a live key reads ONLY `stripeFamilyPlanPrices.live.json`, a test key reads `.test.json` (old shared file only for test/no key). `config/stripe.js` now uses it. Result for today's server: a live key with no live file has NO price ids and logs what to run (before: it used test ids and failed with "No such price").
- `scripts/createStripePrices.js` (rewritten): `--dry-run`, live needs `--confirm`, checks the amount of existing prices, stops on a wrong one unless `--archive-mismatched`, never touches untagged prices (the client's placeholder), monthly only with `--include-monthly`. `npm run stripe:create-prices`.
- `scripts/verifyStripePrices.js` (rewritten): amount, currency, one-time/monthly, product, mode, exact set. `npm run stripe:verify-prices`.
- `scripts/verifyPayPalPrices.js`, `scripts/verifyPagbankPrices.js`, `scripts/checkFamilyPlanPricing.js` (offline): `npm run paypal:verify-prices`, `pagbank:verify-prices`, `pricing:check`.
- Tests: pricing module (82), price-file selection (21), create script on a fake Stripe (49), verify script (29), offline checks and commands (62). Break-it pass on a scratch copy.

Expected right now: `npm run pricing:check` FAILS (about 90 problem lines): PayPal and PagBank configs, the checkout code limit/box, and both screens still hold the old prices. That list IS the phase 2 and 3 to-do list; the command turns green when those phases are done.

Decisions taken in phase 1 (change if you disagree):
- Per-mode Stripe price files adopted (`.live.json` / `.test.json`).
- PagBank check is config + source only in phase 1 (line-item building is checked in phase 2 when that code changes).
- `STRIPE_PRICE_ID_YEARLY` (older flow) is a NOTE in the Stripe verify, not a failure.

## Phase 2 status (built, tested, uncommitted): the backend

- **Stripe checkout** (`services/checkout.services.js`, `controllers/checkout.controller.js`): max 4 children, no box (a box field from an old app is ignored: no extra line, nothing in the metadata), one Stripe price per region and size, refuses bad input with a 400 and a code instead of rounding it ("abc" used to be sold as 1 child; 5 to 10 children used to be sold). A made-up region name such as `constructor` can no longer reach an inherited value.
- **`GET /api/checkout/pricing`** (public): the annual prices in cents for every region, 1 to 4 children. Monthly is never in it while closed.
- **PagBank** (`services/pagseguro.service.js`, `controllers/pagseguro.controller.js`): BRL annual price from the list, exactly one line, no box, max 4, 400 for bad input. `config/pagseguroFamilyPlanPrices.json` is deleted.
- **PayPal** (`services/paypalService.js`): the price table is built from the list (24 tiers: 3 currencies x 4 sizes x plain + yearly, all the annual price). `config/paypalFamilyPlanPrices.json` is deleted. `createPayPalPlans.js` is marked LEGACY (not used by the checkout) and reads the table too.
- **Refusals** are `FamilyPlanPricingError`: always a 400 with a short code (`INVALID_CHILD_COUNT`, `INVALID_REGION_OR_CURRENCY`), never a 500 and never a 401.
- **Guard test** (`tests/familyPlanPricing.guard.test.js`): runs the consistency check on the REAL files and fails if any provider or the backend code drifts. `pricing:check` now shows 0 problems for everything but the two screens (27 problems, phase 3). When phase 3 is done, set `INCLUDE_SCREENS = true` in the guard test.
- **Not changed on purpose:** `User.planKidsLimit` and `PagSeguroCheckout.childCount` still allow 1 to 10, so customers who already bought 5 to 10 keep working. The Stripe webhook still clamps to 10 for the same reason.

## Phase 3 status (built, tested, uncommitted): the two screens

Sale site (`riseupkids-sale/web`):
- `services/pricing.js` (new): checks the backend answer, formats cents (`R$699`, `$120`, `€120`), and works out the saving from the backend numbers. `services/checkoutService.js` lost its price tables, the box helpers and every child limit; it gained `fetchCheckoutPricing()`.
- State (`store/slices/checkoutSlice.js`): the loaded prices live in the store (`idle | loading | ready | error`); the child count follows the limit the backend sends (4). A shared link asking for 10 children is brought down to 4 as soon as the prices arrive.
- Pages: until the prices are loaded the plan card and summaries show "Loading prices…" (or the error with "Try again"), the Continue button is off, the register form refuses to submit, and nothing is reported to the Meta Pixel. A price is never guessed.
- The box is SWITCHED OFF, not deleted: its code is kept as comments in place (the `SelectBox.jsx` component, the box prices and helpers, `addBox` in the state, the link parameter and the requests) and its texts stay in the translation files, unused. No request to Stripe, PagBank or PayPal carries a box. Every place and how to switch it back on is in `docs/ACTIVITY_BOX_DISABLED.md`.
- Texts (pt/en/es): removed the dead price strings (`installment`, `orCashPrice`, `priceDisplayUsd/Eur`, `equivalentPerMonth`); the Portuguese payment note no longer says "ou R$799 à vista" (it now reads like the English one, without a number); added `checkout.pricing.loading/error/retry`.
- Brazil: the old "12x R$..." installment line is gone (an installment amount cannot be worked out honestly from the list). The saving line ("Economize X%") stays on the Portuguese page only, now worked out from the backend prices: 7% for 2, 14% for 3, 21% for 4 children.

Parents web app (`frontend`):
- `services/checkoutService.js` lost its tables; new `hooks/useCheckoutPricing.js`. The subscription screen's "Plan price" row shows the price from the backend, "Loading…" while it loads, and is left out when there is no price (could not be loaded, or a family that bought 5 to 10 children before the limit became 4). A legacy monthly subscription never asks for it.

Guards: `tests/familyPlanPricing.guard.test.js` now includes the screens; `pricing:check` also fails if a screen gets a price table, the box or a child limit back, or if a price is typed into the sale site's checkout texts.

Open points to decide:
- The "The physical box is not refundable after shipping." sentence is still in the guarantee text of the order summaries (pt/en/es). It talks about the box that no longer exists; it was left because it is a policy statement.
- The parents screen shows the CURRENT list price for a family's size and region. The amount a family actually paid is not stored, so a family that paid an older price sees the current one.
- Not covered by an automatic test: the effects in `CheckoutPage` / `CheckoutRegister` that hold back the Meta Pixel until prices are ready (a server-side render does not run effects).
- Spanish payment note and a few other Spanish texts are still in English in `es.json` (existing, untouched).

Known effect of the price change on PayPal: the capture step re-checks the paid amount against the CURRENT price list. An order created at an old price and captured after the switch fails that check, and an already-completed old order (for example a customer who paid USD 151 and later reloads the success page) fails it too (it was activated when first paid; a test documents this). The capture call happens before the check, so an order that is in flight at the moment of deployment could be charged but not activated. Deploy off-peak; PayPal orders are short-lived.

## 1. The real plan (from the client's sheet)

Maximum 4 children per family. Two ways to pay: annual upfront, or monthly in 12 payments.

| Children | USD/EUR annual | USD/EUR monthly | BRL annual | BRL monthly |
|---|---|---|---|---|
| 1 | 120 | 12 | 699 | 70 |
| 2 | 190 | 19 | 1,299 | 130 |
| 3 | 250 | 25 | 1,799 | 180 |
| 4 | 310 | 31 | 2,199 | 220 |

Decisions from the owner:
- No activity box add-on any more.
- Stripe, PayPal and PagBank all charge the SAME prices. PagBank is Brazil (BRL) only.
- The checkout pages must show prices that come from the backend, never their own copy.
- Customers can only buy ANNUAL for now. Monthly prices are stored in the backend and ready, but not offered.

## 2. What exists today (why this is needed)

Six separate price lists that disagree with each other and with the sheet:

| Where | Holds | Children | Notes |
|---|---|---|---|
| `backend/scripts/createStripePrices.js` (`PRICING`) | amounts used to CREATE Stripe prices | 1-10 | $799 for 1 child |
| `backend/config/stripeFamilyPlanPrices.json` | Stripe price ids only (amounts live in Stripe) | 1-10 | ids are from another Stripe mode, "No such price" on live |
| `backend/config/paypalFamilyPlanPrices.json` | amounts PayPal orders charge | 1-3 | USD 151, EUR 130, BRL 799 |
| `backend/config/pagseguroFamilyPlanPrices.json` | BRL cents + box per child (R$297) | 1-10 | R$799 for 1 child |
| `riseupkids-sale/web/src/services/checkoutService.js` | display tables | 1-10 (UI cap 3) | own copy |
| `frontend/src/services/checkoutService.js` | display tables | 1-10 | own copy |

Other facts that shape the plan:
- Stripe checkout (`checkout.services.js`) is `mode: 'payment'` (one-time) and adds a box line item.
- PayPal orders charge an amount read from `paypalFamilyPlanPrices.json`; tier names like `1_child_USD` / `2_children_yearly_BRL`; `pay_in_4` and `yearly` both exist as plan types.
- `config/paypalPlans.json` (PayPal subscription plan ids) is only written by `scripts/createPayPalPlans.js`; no app code reads it. It is not part of the checkout.
- `User.planKidsLimit` allows 1-10 and the Stripe webhook clamps to 10. Customers who already bought 5-10 slots must keep working, so the model limit must NOT be lowered; only NEW purchases are limited to 4.

## 3. Target design

One source of truth, in whole minor units (cents/centavos, integers, no decimals anywhere):

`backend/config/familyPlanPricing.js`
```
MAX_CHILDREN = 4
MONTHLY_ENABLED = false            // one switch; monthly stays closed until this is true
regions: br -> BRL, us -> USD, eu -> EUR
annual:  { USD: {1:12000, 2:19000, 3:25000, 4:31000}, EUR: {same}, BRL: {1:69900, 2:129900, 3:179900, 4:219900} }
monthly: { USD: {1:1200, ...}, EUR: {...}, BRL: {1:7000, 2:13000, 3:18000, 4:22000} }   // 12 payments
```

`backend/services/familyPlanPricing.service.js` (pure functions, no network):
- `getAnnualCents(currency|region, kids)`, `getMonthlyCents(...)` (throws unless `MONTHLY_ENABLED`)
- `assertValidKids(kids)` (integer 1-4; NaN, 0, 5+, decimals are refused, never silently clamped)
- `getPublicPricing()` for the API (annual always; monthly only when enabled)

`GET /api/checkout/pricing` (public): currency, maxChildren, annual prices (and monthly only when enabled).
Frontends call it and render; they keep no price numbers.

Each provider reads ONLY this module:
- Stripe: price ids stay in a JSON file, but amounts are never typed again (the script derives them from the module).
- PayPal: order amount = annual price from the module; tier names kept for compatibility, derived from the module.
- PagBank: line item = annual BRL cents from the module; box removed; BRL only.

## 4. Phase 1: runnable scripts and checks (FIRST)

All scripts: `--help`, `--dry-run`, clear plain-language output, exit code 0/1, never print keys.
Scripts that write to a provider (Stripe) need `--confirm` when the key is LIVE.

### 4.1 `npm run pricing:check` (offline, no keys, safe anywhere)
Asserts, and fails loudly, that:
- the module matches the client's sheet (golden values, typed in the test, not imported)
- Stripe/PayPal/PagBank configs and code have no price numbers of their own
- both frontends' tables (until they are replaced) equal the module; after phase 3, that they hold no tables at all
- max children is 4 in checkout.services, pagseguro.service, paypal tiers; `User.planKidsLimit` still allows 10 (existing customers)
- no box add-on anywhere in create-session / PagBank line items
Also runs as a jest test so CI catches drift.

### 4.2 `createStripePrices.js` (rewrite)
- Reads amounts from the module (the `PRICING` copy is deleted).
- Creates annual prices for 1-4 kids x BRL/USD/EUR (12 prices). Monthly (recurring, interval month) only with `--include-monthly`; off by default.
- Idempotent AND checks the amount: an existing price with the right tags and right amount is reused; one with the right tags but a WRONG amount is reported as a mismatch (Stripe prices cannot be edited). `--archive-mismatched` archives it and creates the right one.
- Writes a separate file per mode: `stripeFamilyPlanPrices.live.json` / `.test.json`, chosen by the key (`sk_live_` vs `sk_test_`). `config/stripe.js` loads the matching file. This ends the test-ids-on-live problem for good.
- `--dry-run` prints exactly what it would create (count, currency, amount) and calls Stripe read-only.
- Stops with a clear message if the product named `RiseUpKids` does not exist (today's behaviour), and names what to do.

### 4.3 `verifyStripePrices.js` (extend the one already written)
Adds: amount equals the module, currency, interval (annual = one-time), exactly the expected set (no missing kid/region, no extra 5-10), mode matches the key. Read only.

### 4.4 PayPal: `verifyPayPalPrices.js`
- Offline part: every tier the API accepts maps to the module amount for that currency and kids; 5+ kids refused; USD 151 style leftovers impossible.
- Optional online part (`--online`, needs PayPal credentials): create nothing; confirm credentials and mode (sandbox vs live) are what the server expects.
- `createPayPalPlans.js` is not used by the checkout; plan says mark it "legacy, not used by checkout" (decision needed, section 8).

### 4.5 PagBank: `verifyPagbankPrices.js`
- Offline: builds the checkout line items for 1-4 kids and checks the total equals the BRL annual price, no box line, 5+ refused.
- No PagBank API call needed (amounts are sent with each checkout).

### 4.6 Tests that ship with phase 1 (written first, red before green)
- Module: golden sheet values for every cell; per-child maths; annual vs monthly relation as on the sheet; kids bounds; monthly refused while the switch is off.
- Stripe: session builder uses the price id for the right region/kids, adds NO box, refuses 0/5+/NaN, refuses a region with no price id (clear error, not "No such price").
- Stripe scripts: fake Stripe client injected; create path, reuse path, mismatch path, `--dry-run` creates nothing, live key without `--confirm` refuses, per-mode file chosen correctly.
- PayPal: order amount for every currency x 1-4 kids equals the module; tier parsing; 5+ refused.
- PagBank: line items and total for 1-4 kids; no box; installments limit unchanged.
- Cross-provider consistency test (the `pricing:check` rules as jest).
- Existing checkout/PayPal/PagBank/Stripe tests updated, not deleted, where they assert old prices or the box.
- Break-it pass on a scratch copy for the money paths (wrong amount, box back in, limit 5, monthly leaking out).

## 5. Phase 2: backend behaviour (after phase 1 is green)
- `checkout.services.js`: use the module, max 4, drop `addBox` (ignore the field if an old client still sends it).
- `pagseguro.service.js` and `pagseguro.controller.js`: use the module, max 4, drop the box.
- `paypalService.js` + `paypal.controller.js`: amounts from the module; `4_children` tier added; keep accepting existing tier names.
- Add `GET /api/checkout/pricing`.
- Webhooks/activation: unchanged for existing buyers; new purchases record 1-4.
- `User.planKidsLimit`: unchanged (still 1-10).
- Monthly: nothing exposed. Creating a monthly session or order is refused while `MONTHLY_ENABLED` is false.

## 6. Phase 3: screens
- Sale site and web app load prices from `/api/checkout/pricing`; delete both hard-coded tables.
- Child picker 1-4 (sale site is capped at 3 today).
- Box add-on controls and texts removed (pt/en/es).
- Brazil: decide the card-installment text ("12x") from the client's answer.
- Monthly option not rendered.

## 7. Rollout order
1. Client creates the product `RiseUpKids` in LIVE Stripe (placeholder price is fine).
2. Phase 1 merged. On the server: `npm run pricing:check`, then `node scripts/createStripePrices.js --dry-run`, then run it for real with `--confirm`, then `npm run stripe:verify-prices`. Compare 2 prices in the Stripe Dashboard by eye.
3. Commit the generated `...live.json` (or copy it onto the server) before the next deploy.
4. Deploy phases 2 and 3 together with the new price files; run the three verify scripts; place one test order per provider where the provider allows it.
5. Do NOT run the current `createStripePrices.js` on live before step 2 (it would create 30 wrong prices).

## 8. Decisions and questions still open
1. Brazil: are "12x" card installments of the annual price still offered (Stripe/PagBank)? That is different from the monthly plan R$70 x 12.
2. Future monthly: a true monthly plan that stops after 12 payments needs a Stripe subscription schedule (12 cycles); PagBank has no recurring. Is monthly meant for Stripe/PayPal only?
3. PayPal `pay_in_4`: keep as a label on the same annual price, or remove?
4. `createPayPalPlans.js` / `paypalPlans.json`: unused by the checkout. Mark legacy or delete?
5. Existing customers who paid at old prices: left untouched (assumed yes).
6. Per-mode Stripe files (live/test): OK to adopt?

## 9. Risks
- Stripe prices are immutable: a wrong amount means a new price, so the dry-run and amount check are mandatory before any live run.
- Lowering `planKidsLimit` below 10 would make existing customers' saves fail; explicitly not done.
- If the sale site is deployed before the backend `/pricing` endpoint, it shows no prices: deploy backend first.
- Old browsers/apps still sending `addBox` must not break (field ignored).

# Activity box add-on: switched off, kept for later

The client no longer sells the activity box. Nothing is charged for it and no screen offers it. The code was NOT
deleted: it is commented out in place (so it can be switched on again), and this page lists every place.

Prices as they were (per child): **Brazil R$297 · USA $99 · Europe €99**.
Stripe/PayPal amounts were whole units x 100 in cents; PagBank used centavos (`29700`).

## Where the box code is kept (commented out)

Main repository (`backend`):
- `services/checkout.services.js`: `BOX_PRICE_PER_CHILD`, `CURRENCY_BY_REGION`, and the box line item that was added to the Stripe session (plus `addBox` in the metadata).
- `controllers/checkout.controller.js`: reading `addBox` from the request and passing it on.
- `services/pagseguro.service.js`: `getBoxAmountCents` and the box line item in `buildCheckoutLineItems`.
- `controllers/pagseguro.controller.js`: reading `addBox`, `withBox`, and saving `addBox` on the order.
- The old `config/pagseguroFamilyPlanPrices.json` (deleted) held `boxAmountCentsPerChild: 29700`; that value is in the comment in `pagseguro.service.js`.
- Still in place and unchanged: the `addBox` field on the `PagSeguroCheckout` model (older orders have it).

Sale site (`riseupkids-sale/web`, its own repository):
- `src/components/checkout/select/SelectBox.jsx`: the whole component, commented out (it was not shown on any page even before).
- `src/services/checkoutService.js`: the box price table and helpers (`getBoxPricePerChild`, `getBoxPriceDisplay`, `getBoxTotal`, `getTotalPricing`) and `addBox` in the three request functions.
- `src/store/slices/checkoutSlice.js`: the `addBox` state and `setAddBox`.
- `src/hooks/useCheckout.js`: what it returned for the box (a note shows how it was read).
- `src/components/checkout/select/SelectCta.jsx` and `src/pages/CheckoutRegister.jsx`: the `box` link parameter.
- `src/components/checkout/register/RgisterForm.jsx`: `addBox` passed to the payment calls.
- The box texts (`checkout.box.*`) are still in `src/i18n/pt.json`, `en.json` and `es.json` (JSON cannot hold comments); nothing uses them. The image `src/assets/images/box.png` is still there.

Not in the box code but related: the guarantee text in the order summaries still says "The physical box is not refundable after shipping."

## What the backend does today with a box request

An old app that still sends a box field is NOT refused: the field is ignored, so the customer gets the plan only,
with no box line and nothing saved about a box.

## To switch it on again (suggested order)

1. Decide the box prices and add them next to the plan prices in `backend/config/familyPlanPricing.js` (whole cents, per child), so there is still ONE place for every price.
2. Backend: remove the comment marks in the files above and read the box price from that list instead of the old constants; keep the strict child count (1 to 4).
3. Add the box to `GET /api/checkout/pricing` (so the sale site shows the backend price, never its own).
4. Sale site: restore the state, helpers, link parameter and `SelectBox`, and render it in `SelectMain.jsx`; take the box price from the backend answer.
5. PayPal: its orders carry one amount per tier. A box would need a decision (a larger amount, or a second item) before it can be offered there.
6. Update the guards (see below), then run the break-it style checks again.

## The checks that currently expect the box to be off

- `npm run pricing:check` and `tests/familyPlanPricing.guard.test.js` fail if the box markers (`addBox`, `activity-box`, `getBoxAmountCents`, `BOX_PRICE_PER_CHILD`, `getBoxTotal`...) appear in LIVE code. Comments are ignored, which is why the commented-out code does not trip them. When the box is switched on again, remove those markers from the check lists in `backend/scripts/checkFamilyPlanPricing.js`, `scripts/verifyPagbankPrices.js` and `scripts/lib/familyPlanPriceChecks.js`.
- Backend tests that assert "no box line / no box in the metadata / no box saved" (`tests/checkout.familyPlan.test.js`, `tests/pagseguro.service.test.js`, `tests/pagseguro.controller.familyPlan.test.js`) and the sale site tests in `src/tests/checkoutNoPrices.test.js` (the box component must be inert, no live code uses `checkout.box.*`) need to be turned around.

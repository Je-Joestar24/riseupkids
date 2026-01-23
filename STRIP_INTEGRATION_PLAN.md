## Stripe Integration – Paid Parent Signup (From-Scratch Plan)

### 1. Goal & High-Level Flow

**Goal**: Require a **successful Stripe subscription** before a **parent** account becomes fully active.  
**Price**: `9.99 USD per month` with a **yearly commitment** (implemented as a Stripe subscription with yearly billing).  
**Env variables (backend)**:
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET` (dynamic/local)
- `STRIPE_PRODUCT_ID`
- `STRIPE_PRICE_ID_YEARLY`

**High-level user journey (happy path)**:
1. Parent visits **Signup (Parent)** page and fills in details (name, email, password, etc.).
2. Frontend sends data to backend: **create “pending payment” parent user**.
3. Backend creates a **Stripe Checkout Session** for `STRIPE_PRICE_ID_YEARLY`, storing `userId` and `role=parent` in `metadata`.
4. Frontend redirects to Stripe Checkout using `STRIPE_PUBLISHABLE_KEY`.
5. On successful payment, Stripe redirects the user to a **success URL** in the frontend.
6. **Stripe Webhook** receives `checkout.session.completed` and subscription events, then:
   - Marks user as **active**.
   - Stores Stripe customer & subscription info.
7. Frontend success page calls backend to **verify** the session and subscription, then:
   - Confirms activation.
   - Logs the user in or guides them to login.

**Cancel path**:
- If user cancels on Stripe, they land on a **cancel URL** with options to:
  - See a “Payment cancelled” message.
  - Retry the payment process.

**Lifecycle**:
- Renewals and cancellations are driven by Stripe subscription events:
  - `customer.subscription.updated`
  - `customer.subscription.deleted` / `canceled`
  - `invoice.payment_failed` (optional future handling).

---

### 2. Backend – Data Model & Status Design

#### 2.1 User Model (Parents)

Update / confirm fields on the **Parent** or generic **User** model:
- `role`: string (`'parent'`, `'teacher'`, etc.); for this flow we enforce `role: 'parent'`.
- `status`: enum-like string for account status:
  - `pending_payment`
  - `active`
  - `suspended`
  - `cancelled`
- `stripeCustomerId`: string – Stripe Customer ID.
- `stripeSubscriptionId`: string – Stripe Subscription ID.
- `subscriptionStatus`: string – Stripe subscription status (`'active'`, `'past_due'`, `'canceled'`, `'incomplete'`, etc.).
- `currentPeriodEnd`: Date – from `subscription.current_period_end` (Unix seconds → Date).

**Rule**: Any parent-only features should require `role === 'parent'` **and** `status === 'active'`.

#### 2.2 Subscription / Billing Event Log (Optional but Recommended)

Create a separate model such as `SubscriptionEvent` or `BillingLog`:
- `userId` (ref to user/parent).
- `stripeEventId` (Stripe event `id`).
- `type` (e.g. `checkout.session.completed`, `customer.subscription.updated`).
- `rawPayload` or essential fields only.
- `createdAt`.

Usage:
- Idempotency: don’t process the same Stripe event twice.
- Debugging: inspect billing history for a user.

---

### 3. Backend – Stripe Configuration

#### 3.1 Stripe Config Module

Create `backend/config/stripe.js` (or similar):
- Read env:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRODUCT_ID`
  - `STRIPE_PRICE_ID_YEARLY`
- Initialize Stripe:
  - `const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);`
- Export:
  - `stripe` instance.
  - `WEBHOOK_SECRET`.
  - `PRICE_ID_YEARLY`.

This centralizes Stripe-related configuration, making it easier to switch between **test** and **live** keys.

#### 3.2 Environment Management

- Add the Stripe variables to the backend `.env` file (not committed).
- Maintain separate sets per environment:
  - Local (test mode).
  - Staging (test or separate Stripe account).
  - Production (live keys).
- Document exact required env vars and their purpose in `backend/README.md`.

---

### 4. Backend – API Design (Controllers, Services, Routes)

The project already has placeholders:
- `backend/routes/stripe.routes.js`
- `backend/controllers/stripe.controller.js`
- `backend/services/stripe.services.js`

We will implement the following endpoints:

#### 4.1 Endpoint: Create Pending Parent + Checkout Session

- **Route**: `POST /api/stripe/parent-signup-session`
- **Purpose**: Create a “pending payment” parent user and start a Stripe Checkout Session.

**Request body** (example):
- `name: string`
- `email: string`
- `password: string`
- Additional optional fields (e.g., child info) as needed.

**Flow**:
1. Validate input.
2. Check for existing user with this email:
   - If active: reject with a message “Account already exists – please log in.”
   - If `pending_payment`: decide whether to reuse that user or refresh the state.
3. Create or update a user with:
   - `role = 'parent'`
   - `status = 'pending_payment'`
   - Hashed password for later login.
4. Use a Stripe service function to create a **Checkout Session**:
   - `mode: 'subscription'`
   - `line_items: [{ price: STRIPE_PRICE_ID_YEARLY, quantity: 1 }]`
   - `success_url: <FRONTEND_URL>/signup/success?session_id={CHECKOUT_SESSION_ID}`
   - `cancel_url: <FRONTEND_URL>/signup/cancel`
   - `customer_email: email from request`
   - `metadata`:
     - `userId`: the created user’s ID
     - `role`: `'parent'`
5. Return to frontend:
   - `sessionId` (for Stripe.js `redirectToCheckout`).
   - Optionally, also return `STRIPE_PUBLISHABLE_KEY` if frontend does not already have it via its own env.

Separation of concerns:
- Controller: HTTP layer (validate, call service, send response).
- Service: Contains actual Stripe SDK calls and data mapping.

#### 4.2 Endpoint: Webhook Receiver

- **Route**: `POST /api/stripe/webhook`
- **Auth**: No user auth; verification by `STRIPE_WEBHOOK_SECRET`.

**Setup**:
- Configure a dedicated middleware for this route to:
  - Parse **raw body** (required by Stripe).
  - Retrieve the `Stripe-Signature` header.
  - Call `stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`.

**Events to handle** (minimum set for this flow):

1. `checkout.session.completed`
   - Extract:
     - `session.id`
     - `session.customer`
     - `session.subscription`
     - `session.metadata.userId`
   - Retrieve or confirm subscription details from Stripe (if needed).
   - Update user:
     - `status = 'active'`
     - `stripeCustomerId = session.customer`
     - `stripeSubscriptionId = session.subscription`
     - `subscriptionStatus = 'active'`
     - `currentPeriodEnd = subscription.current_period_end`
   - Log the event in `SubscriptionEvent` if enabled.

2. `customer.subscription.updated`
   - Extract subscription status and period end.
   - Find user by `stripeSubscriptionId`.
   - Update:
     - `subscriptionStatus`
     - `currentPeriodEnd`

3. `customer.subscription.deleted` (or status `canceled`)
   - Similar lookup by `stripeSubscriptionId`.
   - Update user:
     - `status = 'cancelled'` or `status = 'suspended'` depending on policy.
     - `subscriptionStatus = 'canceled'`.

4. (Optional) `invoice.payment_failed`
   - Mark subscription as `past_due` and consider a grace period policy.
   - Future enhancement: notify user via email.

**Webhook behavior**:
- On success: respond `200` with `{ received: true }`.
- On signature verification error: respond `400` and log the issue.
- Use `SubscriptionEvent`/`BillingLog` to ensure each `stripeEventId` is only processed once.

#### 4.3 Endpoint: Verify Checkout Session / Subscription Status

- **Route**: `GET /api/stripe/checkout-session/:sessionId`
- **Purpose**: Let the frontend success page confirm payment and user activation.

**Behavior**:
1. Retrieve Stripe Checkout Session by `sessionId`.
2. Optionally retrieve subscription data via `session.subscription`.
3. Cross-check `metadata.userId` with DB user.
4. If user is not yet active but Stripe shows the subscription is active, update user to `active` (extra safety if webhook was delayed).
5. Return:
   - Basic user details (no password).
   - `subscriptionStatus`
   - `currentPeriodEnd`
   - Optionally, a newly issued **JWT** to auto-login the user.

**Auth integration options**:
- Option A: Backend returns a JWT from this endpoint if everything is valid.
- Option B: Frontend uses this endpoint just to verify, then calls the usual login API with email/password.

#### 4.4 (Optional) Endpoint: Stripe Customer Portal

- **Route**: `POST /api/stripe/create-portal-session` (requires authenticated parent).
- **Behavior**:
  - Use `stripe.billingPortal.sessions.create({ customer: user.stripeCustomerId, return_url: <FRONTEND_PORTAL_RETURN_URL> })`.
  - Return the portal `url` for frontend redirect.
  - Allows parents to manage payment methods, see invoices, cancel subscription (respect your cancellation policy).

---

### 5. Frontend – React / Vite Integration

#### 5.1 Parent Signup Flow (UI & Logic)

**Page/Component**: `ParentSignup` (or equivalent).

**Form fields**:
- `name`
- `email`
- `password` and `confirmPassword`
- Optional: child-related details.

**On submit**:
1. Validate inputs (required fields, password confirmation, etc.).
2. Send `POST` request to `/api/stripe/parent-signup-session` with form data.
3. Receive `{ sessionId }` from backend.
4. Initialize Stripe on the frontend using `STRIPE_PUBLISHABLE_KEY` (from Vite env).
5. Call `stripe.redirectToCheckout({ sessionId })`.

**State management**:
- Use **Redux Toolkit** for auth-related state if already in use.
- For this flow:
  - Minimal pre-payment data can be kept in local component state, or
  - Optionally store email in `localStorage` so it is available on success/cancel pages.

#### 5.2 Success & Cancel Pages

**Routes**:
- `/signup/success`
- `/signup/cancel`

**Success Page**:
1. Read `session_id` from the query string.
2. If `session_id` missing:
   - Show an error and guide the user back to signup.
3. If present:
   - Call `GET /api/stripe/checkout-session/:sessionId`.
   - Show a loading spinner and accessible status messages while waiting.
4. On success response:
   - Confirm the user’s `subscriptionStatus` is active.
   - Either:
     - Store returned JWT in `localStorage` and Redux, then redirect to parent dashboard, or
     - Prompt user to log in (if you choose not to issue JWT from this endpoint).
   - Display a simple confirmation screen (plan name, price, next renewal date).

**Cancel Page**:
- Explain that the payment did not complete.
- Provide a call-to-action button to:
  - Retry signup (redirect back to parent signup).
- Decide how to handle `pending_payment` users on cancel:
  - Option A: Keep them in `pending_payment` status, clean stale ones later.
  - Option B: Delete them immediately after some timeout or when they explicitly restart signup.

**Accessibility & UX**:
- Use semantic HTML, `role`, `aria-label`, and proper form labeling.
- Provide visual feedback via CSS animations/transitions (e.g., form focus, button hover, loading spinners).
- Ensure responsive layout with **Flexbox** or **CSS Grid**.

---

### 6. Security & Access Control

**Backend input validation**:
- Sanitize and validate:
  - Email format.
  - Password strength.
  - Required fields.

**Account activation rules**:
- Only Stripe webhook and verified Stripe session logic can:
  - Set `status` to `active`.
  - Update `stripeCustomerId` and `stripeSubscriptionId`.
- Normal user-facing endpoints must not arbitrarily change subscription-related fields.

**Route guards**:
- For any parent-only or subscription-only features:
  - Require valid JWT (auth).
  - Confirm:
    - `user.role === 'parent'`
    - `user.status === 'active'`
    - `subscriptionStatus === 'active'` (if you want stricter checks).

**Webhook security**:
- Always verify signatures using `STRIPE_WEBHOOK_SECRET`.
- Never trust raw JSON payload without verification.
- Log verification failures and ignore unverified events.

**Frontend security**:
- Never expose secret keys (`STRIPE_SECRET_KEY`); only `STRIPE_PUBLISHABLE_KEY` goes to the client.
- Do not rely on frontend flags for actual subscription status – always ask backend.

---

### 7. Edge Cases & Error Handling

**Duplicate email**:
- `active` user already exists:
  - Reject new signup, advise login or password reset.
- `pending_payment` user exists:
  - Option A: Reuse the existing user and create a new Checkout Session.
  - Option B: Clean up the previous user and create a fresh one.

**Webhook timing issues**:
- If success page loads before webhook:
  - `GET /api/stripe/checkout-session/:sessionId` can:
    - Fetch Stripe session and subscription.
    - Activate the user if Stripe reports an active subscription.
  - This makes the process resilient to webhook latency.

**Failed renewals / past due**:
- `invoice.payment_failed` and `customer.subscription.updated` can:
  - Mark `subscriptionStatus = 'past_due'`.
  - Optionally:
    - Keep account active during grace period.
    - After some time, set `status = 'suspended'`.

**Stale pending accounts**:
- Implement a scheduled job or maintenance script to:
  - Find users with `status = 'pending_payment'` older than N hours/days.
  - Delete or flag them as abandoned.

---

### 8. Testing Strategy

**Local testing with Stripe test mode**:
- Use test keys for `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`.
- Use Stripe CLI:
  - `stripe listen --forward-to localhost:<PORT>/api/stripe/webhook`
  - Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.
- Use Stripe test cards:
  - For example, `4242 4242 4242 4242` with any valid future expiry and CVC.

**Scenarios to test**:
- New parent signup → redirected to Stripe Checkout → payment success → webhook processed → user becomes active → success page verifies and logs in.
- Cancel at Stripe → cancel page shows correct UI and allows retry.
- Attempt to access parent dashboard:
  - Before payment → blocked.
  - After payment → allowed.
- Webhook replay (same event twice) → user state should not corrupt (idempotency).

**Automated tests (future)**:
- Add unit/integration tests for:
  - Creating `pending_payment` parent.
  - Creating checkout sessions (Stripe SDK mocked).
  - Webhook handler updating user status.
  - Access control checks for active vs non-active parents.

---

### 9. Deployment & Operations

**Environment-specific config**:
- Confirm that:
  - Frontend `success_url` and `cancel_url` use correct domains per environment.
  - Stripe dashboard has corresponding allowed redirect URLs.
- Maintain separate Stripe webhook endpoints per environment or handle via routing logic.

**Monitoring & Logging**:
- Log:
  - Webhook events (type, result, errors).
  - Subscription status changes.
- Consider lightweight admin reporting:
  - List all parents with `subscriptionStatus != 'active'`.
  - Show upcoming renewals or recently failed payments.

---

### 10. Implementation Order Checklist

1. **Config & Models**
   - Add Stripe env vars.
   - Create `stripe.js` config module.
   - Extend user/parent model with Stripe/subscription fields.
   - (Optional) Add `SubscriptionEvent`/`BillingLog` model.
2. **Backend Endpoints**
   - Implement `POST /api/stripe/parent-signup-session` (controller + service).
   - Implement `POST /api/stripe/webhook` with signature verification.
   - Implement `GET /api/stripe/checkout-session/:sessionId`.
   - (Optional) Implement `POST /api/stripe/create-portal-session`.
3. **Frontend Flow**
   - Build/adjust Parent Signup component to call the new signup-session endpoint and redirect to Checkout.
   - Implement Success page:
     - Read `session_id`.
     - Call verify endpoint.
     - Handle JWT or login flow.
   - Implement Cancel page with retry CTA.
4. **Security & Guards**
   - Update backend auth/role middleware to enforce `status === 'active'` for parent-only routes.
5. **Testing**
   - Run through full flows in Stripe test mode.
   - Fix any edge cases uncovered during manual tests.
6. **Deploy**
   - Configure production env vars and webhook endpoints.
   - Validate once in live mode with low-risk tests (e.g., your own test subscription).


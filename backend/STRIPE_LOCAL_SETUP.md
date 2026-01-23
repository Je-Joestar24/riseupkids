# Stripe Local Development Setup Guide

This guide explains how to test Stripe webhooks locally without a domain using Stripe CLI.

## 📋 Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Stripe CLI installed on your machine

## 🔧 Step 1: Install Stripe CLI

### Windows:
1. Download the latest release from: https://github.com/stripe/stripe-cli/releases
2. Download `stripe_X.X.X_windows_x86_64.zip`
3. Extract and add `stripe.exe` to your PATH, or place it in a folder that's in your PATH

### macOS:
```bash
brew install stripe/stripe-cli/stripe
```

### Linux:
```bash
# Download and install
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_X.X.X_linux_x86_64.tar.gz
tar -xvf stripe_X.X.X_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

Verify installation:
```bash
stripe --version
```

## 🔑 Step 2: Login to Stripe CLI

```bash
stripe login
```

This will open your browser to authenticate. After logging in, the CLI will be connected to your Stripe account.

## 🚀 Step 3: Start Your Backend Server

Make sure your backend server is running:

```bash
cd backend
npm run dev
```

Your server should be running on `http://localhost:5000` (or your configured port).

## 📡 Step 4: Forward Webhooks to Local Server

In a **new terminal window**, run:

```bash
stripe listen --forward-to localhost:5000/api/stripe/webhook
```

**Important:** Keep this terminal window open while testing. This command:
- Listens for Stripe webhook events
- Forwards them to your local server
- Displays the webhook signing secret you need

You'll see output like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

## 🔐 Step 5: Add Webhook Secret to .env

Copy the webhook signing secret (starts with `whsec_`) and add it to your `.env` file:

```env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # ← Copy from Stripe CLI output
STRIPE_PRODUCT_ID=prod_xxxxxxxxxxxxx
STRIPE_PRICE_ID_YEARLY=price_xxxxxxxxxxxxx
FRONTEND_BASE_URL=http://localhost:3000
```

**Note:** The webhook secret changes each time you restart `stripe listen`, so you'll need to update it if you restart.

## ✅ Step 6: Test the Flow

1. **Start your backend server** (if not already running):
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Stripe webhook forwarding** (in another terminal):
   ```bash
   stripe listen --forward-to localhost:5000/api/stripe/webhook
   ```

3. **Trigger a test payment**:
   ```bash
   stripe trigger checkout.session.completed
   ```

   Or manually test by:
   - Going to your frontend signup page
   - Completing a test payment using Stripe test card: `4242 4242 4242 4242`
   - Any future expiry date (e.g., `12/34`)
   - Any 3-digit CVC (e.g., `123`)

## 🧪 Step 7: Verify It's Working

After a successful payment, check:

1. **Stripe CLI terminal** - You should see webhook events being received
2. **Backend console** - You should see logs like:
   ```
   [Stripe Webhook] Received event: checkout.session.completed (ID: evt_xxx)
   [Stripe Webhook] Activated subscription for user xxx (subscription: sub_xxx)
   ```

3. **Database** - Check your MongoDB:
   ```javascript
   db.users.findOne({ email: "test@example.com" })
   ```
   
   You should see:
   - `subscriptionStatus: "active"`
   - `stripeCustomerId: "cus_xxx"`
   - `stripeSubscriptionId: "sub_xxx"`
   - `subscriptionCurrentPeriodEnd: ISODate("...")`

## 🔄 Fallback: Checkout Session Verification

Even if webhooks don't work immediately, the subscription will still be activated when the user lands on the success page. The `getCheckoutSessionDetails` endpoint will:
- Check if payment was successful
- Update subscription status if webhook hasn't fired yet
- Return user data with JWT for auto-login

## 🐛 Troubleshooting

### Webhook secret not working?
- Make sure you copied the **latest** secret from `stripe listen` output
- Restart your backend server after updating `.env`
- Check that `STRIPE_WEBHOOK_SECRET` is set correctly

### Webhooks not being received?
- Make sure `stripe listen` is running
- Check that the URL is correct: `localhost:5000/api/stripe/webhook`
- Verify your backend server is running on port 5000
- Check backend console for errors

### Signature verification failed?
- Ensure `STRIPE_WEBHOOK_SECRET` matches the one from `stripe listen`
- Make sure raw body middleware is configured correctly in `server.js`
- Restart both Stripe CLI and backend server

### Testing with real payments?
Use Stripe test mode:
- Test card: `4242 4242 4242 4242`
- Any future expiry date
- Any 3-digit CVC
- Any ZIP code

## 📚 Additional Stripe CLI Commands

```bash
# Listen and forward webhooks
stripe listen --forward-to localhost:5000/api/stripe/webhook

# Trigger specific events manually
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted

# View webhook events
stripe events list

# View specific event
stripe events retrieve evt_xxxxxxxxxxxxx
```

## 🚀 Production Setup (When You Have a Domain)

When you're ready to deploy:

1. **Set up webhook endpoint in Stripe Dashboard**:
   - Go to: https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - URL: `https://yourdomain.com/api/stripe/webhook`
   - Select events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

2. **Get webhook signing secret**:
   - After creating endpoint, click on it
   - Copy "Signing secret" (starts with `whsec_`)
   - Add to production `.env` file

3. **Update environment variables**:
   - Use production Stripe keys (`sk_live_...` and `pk_live_...`)
   - Use production webhook secret

## 💡 Tips

- Keep `stripe listen` running in a separate terminal while developing
- The webhook secret changes when you restart `stripe listen` - update `.env` accordingly
- Use Stripe Dashboard to monitor webhook deliveries: https://dashboard.stripe.com/webhooks
- Test cards: https://stripe.com/docs/testing

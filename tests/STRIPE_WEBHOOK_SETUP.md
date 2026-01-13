# Stripe Webhook Setup for Development

## Current Situation

You have `STRIPE_WEBHOOK_SECRET` set in `.env.local`, but webhooks aren't being received in development.

## The Problem

- **Production webhook secret**: `whsec_aJ7W49CBp7hC7rfhsZRjlXZji6jcvGvV` (for production URL)
- **Development**: Stripe can't send webhooks to `localhost:3000`
- **Solution**: Use Stripe CLI to forward webhooks to localhost

## Setup Stripe CLI for Development

### Step 1: Install Stripe CLI

```bash
brew install stripe/stripe-cli/stripe
```

### Step 2: Login to Stripe

```bash
stripe login
```

This will open a browser to authenticate with your Stripe account.

### Step 3: Start Webhook Forwarding

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Important**: The CLI will output a NEW webhook signing secret that looks like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

### Step 4: Update `.env.local`

Copy the NEW webhook secret from Stripe CLI and update `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxx"  # Use the secret from Stripe CLI
```

**Note**: You'll need to switch between:
- **Development**: Use the secret from `stripe listen`
- **Production**: Use the production webhook secret from Stripe Dashboard

### Step 5: Restart Your Dev Server

After updating `.env.local`, restart your Next.js dev server:

```bash
npm run dev
# or
pnpm dev
```

### Step 6: Test

1. Complete a checkout with TEST100 coupon
2. You should see `🔔 WEBHOOK RECEIVED` in your terminal logs
3. The webhook will process and grant credits/subscription

## Alternative: Keep Both Secrets

You can create a script to switch between secrets, or use environment detection:

```typescript
// In your code, detect if running locally
const webhookSecret = process.env.NODE_ENV === 'development' 
  ? process.env.STRIPE_WEBHOOK_SECRET_LOCAL  // From Stripe CLI
  : process.env.STRIPE_WEBHOOK_SECRET         // Production secret
```

Then in `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET="whsec_aJ7W49CBp7hC7rfhsZRjlXZji6jcvGvV"  # Production
STRIPE_WEBHOOK_SECRET_LOCAL="whsec_xxxxxxxxxxxxx"  # From Stripe CLI
```

## Quick Test

After setting up Stripe CLI, test with:

```bash
# In one terminal, run Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger a test event
stripe trigger checkout.session.completed
```

You should see the webhook received in your dev server logs.

## Production

In production, the webhook secret `whsec_aJ7W49CBp7hC7rfhsZRjlXZji6jcvGvV` should work fine because:
- Stripe can reach `https://sselfie.ai/api/webhooks/stripe`
- The webhook is configured in Stripe Dashboard
- The secret matches the production webhook endpoint

## Troubleshooting

### Webhook still not received?

1. **Check Stripe CLI is running**: Make sure `stripe listen` is active
2. **Check the secret matches**: The secret in `.env.local` must match what Stripe CLI shows
3. **Check dev server is running**: Make sure `npm run dev` is running on port 3000
4. **Check logs**: Look for `🔔 WEBHOOK RECEIVED` in your terminal

### Webhook received but fails?

1. Check the error message in logs
2. Verify database connection
3. Check if user exists in database
4. Verify metadata is present

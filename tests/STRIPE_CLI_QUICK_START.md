# Stripe CLI Quick Start Guide

## ✅ Stripe CLI Installed

Stripe CLI version 1.34.0 is now installed on your system.

## Next Steps

### Step 1: Login to Stripe

```bash
stripe login
```

This will:
- Open your browser
- Ask you to authorize the CLI
- Link it to your Stripe account

### Step 2: Start Webhook Forwarding

Once logged in, start forwarding webhooks to your localhost:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Important**: The CLI will output a webhook signing secret that looks like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

### Step 3: Update `.env.local`

Copy the webhook secret from the CLI output and update `.env.local`:

```bash
# For development (from Stripe CLI)
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxx"

# Keep your production secret commented or in a separate file
# STRIPE_WEBHOOK_SECRET="whsec_aJ7W49CBp7hC7rfhsZRjlXZji6jcvGvV"  # Production
```

### Step 4: Restart Dev Server

After updating `.env.local`, restart your Next.js dev server:

```bash
# Stop current server (Ctrl+C)
# Then restart
pnpm dev
# or
npm run dev
```

### Step 5: Test

1. Complete a checkout with TEST100 coupon
2. You should see `🔔 WEBHOOK RECEIVED` in your terminal
3. The webhook will automatically process and grant credits/subscription

## Running Stripe CLI

**Keep Stripe CLI running in a separate terminal** while developing:

```bash
# Terminal 1: Run Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Terminal 2: Run your dev server
pnpm dev
```

## Quick Test Command

Test if webhooks are working:

```bash
# In a third terminal, trigger a test event
stripe trigger checkout.session.completed
```

You should see the webhook received in your dev server logs.

## Switching Between Development and Production

**For Development:**
- Use the secret from `stripe listen`
- Keep Stripe CLI running

**For Production:**
- Use the production secret: `whsec_aJ7W49CBp7hC7rfhsZRjlXZji6jcvGvV`
- Webhooks work automatically (no CLI needed)

## Troubleshooting

### Webhook not received?
1. Make sure Stripe CLI is running (`stripe listen`)
2. Make sure dev server is running on port 3000
3. Check that the webhook secret in `.env.local` matches what Stripe CLI shows
4. Restart dev server after updating `.env.local`

### Webhook received but fails?
1. Check the error message in logs
2. Look for the debug markers: `🔍 PAYMENT STATUS ANALYSIS`, `💎 PAID BLUEPRINT DETECTED`
3. Verify database connection
4. Check if user exists

## Alternative: Manual Processing

If you don't want to use Stripe CLI, you can always use the manual processing script:

```bash
npx tsx scripts/manually-process-webhook.ts <session_id>
```

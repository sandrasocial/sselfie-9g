# Stripe Product Setup Guide

This guide will help you configure Stripe products to match the new SSELFIE pricing structure.

## Overview

SSELFIE uses a simplified pricing model with three product types:
1. **One-Time SSELFIE Session** - $49 one-time payment
2. **Content Creator Studio** - $79/month recurring subscription
3. **Brand Studio** - $149/month recurring subscription
4. **Credit Top-Ups** - Various credit packages ($12, $33, $100)

## Setup Instructions

### Option 1: Automatic Setup (Recommended)

Run the Stripe sync script to automatically create products in your Stripe account:

\`\`\`bash
npm run stripe:sync
\`\`\`

Or use the admin API endpoint:
\`\`\`bash
curl -X POST https://sselfie.ai/api/admin/stripe/sync-products \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
\`\`\`

### Option 2: Manual Setup in Stripe Dashboard

If you prefer to create products manually in the Stripe Dashboard:

#### 1. One-Time SSELFIE Session

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click "Add product"
3. Fill in:
   - **Name**: One-Time SSELFIE Session
   - **Description**: Try one professional AI photoshoot of you. No subscription, just a one-time session.
   - **Pricing**: One-time payment
   - **Price**: $49.00 USD
4. Click "Save product"
5. Copy the **Price ID** (starts with `price_`)
6. Add to your environment variables:
   \`\`\`
   STRIPE_ONE_TIME_SESSION_PRICE_ID=price_xxxxx
   \`\`\`

#### 2. Content Creator Studio

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click "Add product"
3. Fill in:
   - **Name**: Content Creator Studio
   - **Description**: Stop Scrambling for Content Every Week. Unlimited Photos + Videos + Feed Planning.
   - **Pricing**: Recurring
   - **Billing period**: Monthly
   - **Price**: $79.00 USD
4. Click "Save product"
5. Copy the **Price ID** (starts with `price_`)
6. Add to your environment variables:
   \`\`\`
   STRIPE_STUDIO_MEMBERSHIP_PRICE_ID=price_xxxxx
   \`\`\`

#### 3. Brand Studio

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click "Add product"
3. Fill in:
   - **Name**: Brand Studio
   - **Description**: Your Complete AI Content Team. Everything You Need to Run a Premium Brand.
   - **Pricing**: Recurring
   - **Billing period**: Monthly
   - **Price**: $149.00 USD
4. Click "Save product"
5. Copy the **Price ID** (starts with `price_`)
6. Add to your environment variables:
   \`\`\`
   STRIPE_BRAND_STUDIO_MEMBERSHIP_PRICE_ID=price_xxxxx
   \`\`\`

#### 4. Credit Top-Up Packages

Create three credit packages:

**50 Credits - $12**
- Name: 50 Credits
- Description: Perfect for a few extra photos
- Pricing: One-time payment
- Price: $12.00 USD

**150 Credits - $33**
- Name: 150 Credits
- Description: Great for regular use
- Pricing: One-time payment
- Price: $33.00 USD

**500 Credits - $100**
- Name: 500 Credits
- Description: Best value for power users
- Pricing: One-time payment
- Price: $100.00 USD

## Environment Variables

After creating products, add these to your Vercel project:

\`\`\`env
# One-Time Session
STRIPE_ONE_TIME_SESSION_PRICE_ID=price_xxxxx

# Studio Membership (Recurring)
STRIPE_STUDIO_MEMBERSHIP_PRICE_ID=price_xxxxx

# Credit Top-Ups
STRIPE_CREDITS_50_PRICE_ID=price_xxxxx
STRIPE_CREDITS_150_PRICE_ID=price_xxxxx
STRIPE_CREDITS_500_PRICE_ID=price_xxxxx
\`\`\`

## Testing

### Test Mode
1. Use Stripe test mode for development
2. Test cards: `4242 4242 4242 4242` (any future expiry, any CVC)
3. Verify webhooks are working correctly

### Production
1. Switch to live mode in Stripe Dashboard
2. Update environment variables with live Price IDs
3. Test with real payment methods
4. Monitor webhook events

## Webhook Configuration

Ensure your Stripe webhook is configured to listen for these events:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

Webhook URL: `https://sselfie.ai/api/webhooks/stripe`

## Troubleshooting

### Products not showing in checkout
- Verify Price IDs are correct in environment variables
- Check that products are active in Stripe Dashboard
- Ensure webhook is receiving events

### Subscription not activating
- Check webhook logs in Stripe Dashboard
- Verify `customer.subscription.created` event is being received
- Check database for subscription record

### Credits not being granted
- Verify metadata is being passed correctly in checkout session
- Check webhook handler is processing `checkout.session.completed`
- Review database logs for credit transactions

## Support

For issues with Stripe integration:
1. Check Stripe Dashboard logs
2. Review webhook event history
3. Check application logs for errors
4. Contact support at hello@sselfie.ai

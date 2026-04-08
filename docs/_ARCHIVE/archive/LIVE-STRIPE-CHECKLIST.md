# Live Stripe Activation Checklist

## Pre-Launch: Switch to Live Mode

### 1. Stripe Dashboard Changes
- [ ] Go to Stripe Dashboard → Developers → API Keys
- [ ] Switch from "Test mode" to "Live mode" (toggle in top right)
- [ ] Copy your **Live Secret Key** and **Live Publishable Key**
- [ ] Go to Webhooks → Add endpoint
  - URL: `https://sselfie.ai/api/webhooks/stripe`
  - Events to listen for:
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.payment_succeeded`
    - `invoice.payment_failed`
- [ ] Copy the **Live Webhook Signing Secret**

### 2. Vercel Environment Variables
Update these environment variables in your Vercel project:

- [ ] `STRIPE_SECRET_KEY` → Replace with Live Secret Key
- [ ] `STRIPE_PUBLISHABLE_KEY` → Replace with Live Publishable Key
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → Replace with Live Publishable Key
- [ ] `STRIPE_WEBHOOK_SECRET` → Replace with Live Webhook Signing Secret

### 3. Verify Products in Live Mode
- [ ] Go to Stripe Dashboard → Products (in Live mode)
- [ ] Verify these products exist:
  - One-Time Session ($24.50)
  - Studio Membership ($49.50/month)
- [ ] If products don't exist, run the sync script or create them manually

### 4. Test Live Payment (REQUIRED)
**YES, you MUST test with a real payment even if test mode works perfectly!**

Why?
- Live mode has different validation rules
- Real payment processors behave differently than test cards
- Webhook endpoints need to be verified in production
- 3D Secure (SCA) may behave differently

**How to test:**
- [ ] Make a real purchase with a real card (you can refund it immediately)
- [ ] Verify the webhook receives the event
- [ ] Check that the user account is created
- [ ] Verify credits are granted
- [ ] Test the success page flow
- [ ] Immediately refund the test payment in Stripe Dashboard

### 5. Beta Coupon (Optional)
If you have a beta discount coupon:
- [ ] Create it in Live mode with the same settings as test mode
- [ ] Update `STRIPE_BETA_COUPON_ID` environment variable

## Post-Launch Monitoring

### First Hour
- [ ] Monitor Stripe Dashboard for incoming payments
- [ ] Check Vercel logs for any webhook errors
- [ ] Verify users are receiving welcome emails
- [ ] Test a purchase yourself

### First Day
- [ ] Review all successful payments
- [ ] Check for any failed webhooks (Stripe → Webhooks → View logs)
- [ ] Verify all users have correct credit balances
- [ ] Monitor support emails for payment issues

## Rollback Plan
If live payments fail:
1. Switch back to test mode keys in Vercel
2. Redeploy the site
3. Debug the issue in test mode
4. Fix and repeat the live activation process

## Important Notes
- **Webhook Secret is different** between test and live mode
- **Product IDs are different** between test and live mode
- **Customer IDs are separate** (test customers don't exist in live mode)
- Always keep test mode keys saved somewhere safe for future testing

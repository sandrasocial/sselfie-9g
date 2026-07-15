# Your Next Campaign: held release and founder runbook

Status: BUILT ON HELD BRANCH. NOT LIVE. Customer copy is DRAFT until Sandra approves it.

Branch: `codex/campaign-outcome-held`

Release lock: do not merge or deploy before **2026-07-15 18:05 CEST**, after the One Selfie Visibility Bundle closes.

Binding strategy contract: `docs/business/ONE_SELFIE_WEEK_OUTCOME_TEST_2026-07-16.md`

## What was built

Your Next Campaign is a $97 one-time product for women who already sell something.

The buyer gives Maya:

1. One clear selfie.
2. What she sells.
3. What she wants to promote now.
4. Her main platform, if she wants to add it.

Maya creates exactly three connected posts:

1. Attention.
2. Trust.
3. Offer.

Each post contains one identity-referenced visual, a caption, a call to action, and its place in the publishing order. Sandra checks the founding-batch output in Admin before delivery.

This product does not create an account, grant credits, enroll anyone in a course, start a trial, or sell a subscription.

## Complete customer path

1. `/campaign`
2. `/checkout/campaign`
3. Stripe payment
4. Private intake email
5. `/campaign/order/[token]`
6. Selfie and offer intake
7. Maya text and image generation
8. Admin quality check
9. Delivery email and private buyer page
10. Download or copy
11. Day-7 published yes/no question
12. Optional repeat purchase for another $97 campaign

The customer-facing feature fails closed. It opens only when:

```text
CAMPAIGN_OUTCOME_DISABLED=false
```

Missing, empty, `true`, or any other value keeps the landing offer and checkout closed. Already-paid private order links keep working if the public offer is closed.

## What Sandra will do after release

There are only two founder actions.

### 1. Connect the ManyChat keyword

Keyword: `CAMPAIGN`

Exact target URL:

```text
https://sselfie.ai/campaign?source=instagram&utm_source=instagram&utm_medium=manychat&utm_campaign=campaign_outcome_test&cta_keyword=CAMPAIGN
```

ManyChat sends the link. It does not decide the offer, price, fulfillment, or customer follow-up.

### 2. Approve the founding-batch work

Open:

```text
Admin > Campaigns
```

For each order:

1. Check that the woman still looks like herself.
2. Check that the words match what she actually sells and promotes.
3. Choose **Approve and deliver**.
4. If the face, words, or campaign direction is wrong, choose **Regenerate** instead.

The delivery email sends only after approval. Test-mode orders never email customers.

## Draft copy approval

The following copy is deliberately marked DRAFT in code and requires Sandra's approval before the feature flag opens:

- `/campaign` landing page
- Campaign payment-page copy
- Intake email
- Delivery email
- Day-7 email
- Private intake and delivery-page instructions

Approval means approving the complete message, not only a subject line. No autonomous broadcast was added.

## Money and fulfillment safety

- Stripe handles both immediate `checkout.session.completed` payments and delayed
  `checkout.session.async_payment_succeeded` confirmations.
- Fulfillment requires a confirmed paid session.
- Checkout and webhook fulfillment both require exactly USD $97.
- If the sale cannot be recorded in `stripe_payments`, fulfillment stops and Stripe retries.
- `stripe_payments.product_type` is `campaign_outcome`.
- One Stripe session creates at most one campaign order.
- A 32-byte random private token protects the customer page.
- Test-mode payments create test orders for dry-run proof but send no email and change no live contact.
- The campaign handler never writes credits, subscriptions, trials, Academy entitlements, or user passwords.
- A repeat purchase links back only to an already-delivered private order.

## Existing automation reused

No new Vercel cron was added.

The existing `onboarding-sequence` cron also sends the one Day-7 campaign check-in. It targets only live delivered orders between 7 and 14 days old and marks the order only after a successful send.

## Measurement contract

The following events are available in `analytics_events`:

- `campaign_landing_view`
- `campaign_checkout_start`
- `campaign_purchase`
- `campaign_inputs_completed`
- `campaign_generated`
- `campaign_delivered`
- `campaign_downloaded`
- `campaign_published_confirmed`
- `campaign_repeat_purchase`

Revenue does not come from these events. Campaign money stays sourced from qualifying `stripe_payments` rows or Stripe.

The decision gates remain:

- 200 qualified landing visitors
- 20 checkout starts
- 6 or more purchases is strong; 4 to 5 is uncertain; 3 or fewer fails the first promise, segment, or price test
- 70% or more complete intake
- 60% or more download
- 40% or more confirm they published
- Less than 5% refund
- Less than 10% redo or quality failure
- 25% or more buy a second campaign within 30 to 45 days before a subscription case is considered proven

No subscription question appears at delivery. Paid repeat behavior decides whether the job is recurring.

## Release checklist after the event closes

1. Confirm the One Selfie event is closed and run its postmortem.
2. Confirm Sandra approved all draft customer copy.
3. Confirm the held branch is current with `main` without discarding live fixes.
4. Run the database migration or verify the runtime schema guard creates `campaign_orders` safely.
5. Run `pnpm exec tsx scripts/stripe/fix-webhook-endpoints.ts` with the live Stripe key.
   This reconciles the existing endpoint and verifies delayed-payment success is subscribed.
6. Re-read the live endpoint and confirm `checkout.session.async_payment_succeeded` is enabled.
7. Set `CAMPAIGN_OUTCOME_DISABLED=false` only for the intended release environment.
8. Run a Stripe test-mode purchase through intake, generation, admin QA, and the delivery page.
9. Confirm no customer email was sent by that test-mode purchase.
10. Run production build and the complete test gate.
11. Merge only after the checks pass.
12. Verify `/campaign`, checkout, Admin Campaigns, and one real paid order on Vercel.

Do not set the public flag before the migration, copy approval, and dry run are complete.

## Rollback

Set:

```text
CAMPAIGN_OUTCOME_DISABLED=true
```

This closes the public page and checkout without breaking private links for buyers who already paid. Do not delete campaign orders, tokens, Stripe payments, or delivered assets during rollback.

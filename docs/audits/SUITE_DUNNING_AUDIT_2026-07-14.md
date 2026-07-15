# SUITE payment-recovery audit — 2026-07-14

Status: built and tested on `codex/campaign-outcome-held`; not deployed while the July 13–15
campaign is live.

## Evidence checked

- `invoice.payment_failed` is already routed through the production Stripe webhook to
  `handleInvoicePaymentFailed`.
- The existing handler updates only the exact row matching `stripe_subscription_id`, deduplicates
  customer email for three days, and sends one recovery email.
- The configured Stripe billing portal is active. Its payment-method-update and invoice-history
  features are enabled.
- Stripe Dashboard retry/email policy could not be read through the API. The browser inspection
  reached Stripe's sign-in screen, so Smart Retries and Stripe-hosted failed-payment email remain
  **unverified external settings**, not code claims.

## Problem in the old sequence

The email button opened `/app`, where the member still had to find billing herself. A Stripe portal
session cannot safely be generated when the webhook fires because unused portal sessions expire
quickly. The recovery amount also was not visible as recovered revenue in Admin.

## Held implementation

1. A signed seven-day SSELFIE link identifies one exact Stripe subscription and its exact failed
   invoice. The token contains no email or card data.
2. When clicked, the server verifies the token, invoice ownership, and exact subscription row,
   then creates a fresh Stripe-hosted `payment_method_update` portal session for that customer's
   card update.
3. After the customer completes the portal flow, SSELFIE re-reads the live Stripe subscription and
   copies the new payment method to only the signed active/past-due subscription. It does not charge
   inside the callback; Stripe's configured retry schedule handles the open invoice later. Canceled,
   ended, paid, void, or mismatched records are never acted on by this path.
4. The failed invoice is recorded in `stripe_payments` with status `failed` and a
   `payment_recovery` marker. It is not counted as revenue.
5. When that same invoice later succeeds, the existing money webhook changes the row to paid while
   preserving the marker. Admin then shows the count and amount recovered in the last 30 days from
   successful `stripe_payments` rows only.
6. A stale failure event cannot downgrade a payment that Stripe already shows as recovered. Failed
   marker rows also cannot hide missing paid rows from payment reconciliation.
7. The callback is safe if an email scanner or browser replays it because it never initiates a
   charge. No cron, canceled-member charge, or broad user-level subscription update was added.

## External setting still requiring a signed-in Stripe session

At release review, open **Stripe → Billing → Revenue recovery** and confirm:

- Smart Retries is enabled.
- Stripe does not cancel a subscription immediately after the first failed attempt.
- If Stripe's own failed-payment email is enabled, confirm it will not create an unwanted duplicate
  alongside SSELFIE's one deduplicated email.

No setting was guessed or silently changed while the account was not authenticated.

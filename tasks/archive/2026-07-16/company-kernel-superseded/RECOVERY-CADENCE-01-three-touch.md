# RECOVERY-CADENCE-01 — campaign checkout recovery

Status: READY only as part of `CAMPAIGN-OUTCOME-01`. Do not deploy or send before the current One
Selfie event closes on 2026-07-15 at 18:05 CEST. All copy is DRAFT until Sandra approves it.

## Why this task exists

Prompt Vault already has a safe three-touch recovery implementation. Starter Kit has a separate
two-touch sequence. The missing work is not a new site-wide recovery engine. It is a measured,
product-specific sequence for the new `$97 campaign_outcome` checkout.

## Cadence

1. **Touch 1, one hour after checkout start:** a direct link back to the prefilled checkout. Help
   first. Mention that the saved email and campaign path are still there.
2. **Touch 2, 24 hours after Touch 1:** explain the complete deliverable in plain language and
   answer the main effort objection: she supplies one selfie and a short brief; Maya prepares the
   campaign.
3. **Touch 3, 72 hours after Touch 1:** a quiet last note with the same price and terms. No invented
   deadline, no fake scarcity, and no automatic discount in the first validation cohort.

Do not add a discount merely to improve recovery rate. A discount would change the price test and
teach buyers to abandon checkout. An incentive can be a later, separate experiment only after the
full-price recovery baseline exists.

## Implementation rules

- Reuse the eligibility, hydration, `email_logs` idempotency, send pacing, and hard Stripe buyer
  guard from `app/api/cron/prompt-vault-checkout-recovery/route.ts`.
- Candidate product type is exactly `campaign_outcome`.
- A succeeded/paid, non-test `stripe_payments` row for the same normalized email and product stops
  every remaining touch immediately, even if the customer purchased in a different session.
- Only send to an identified email connected to a real checkout start. Do not add anonymous leads
  to Resend audiences.
- Each stage requires the prior stage to be sent or delivered and has its own email type.
- Track stage 1/2/3 separately with `campaign_checkout_recovery_sent`; include session ID, stage,
  source, UTM values, campaign ID, and buyer stage.
- Attribute recovered revenue through the existing `checkout_attribution.recovered_at` path.
- Honor `CAMPAIGN_OUTCOME_DISABLED` and a dedicated
  `CAMPAIGN_CHECKOUT_RECOVERY_DISABLED` kill switch.
- Do not retrofit Prompt Vault, Starter Kit, membership, or the live One Selfie event in this task.
- Do not auto-send until Sandra approves the rendered HTML and text for all three messages.

## Copy direction (DRAFT, not approved)

- Sandra voice: short personal note, one link, no hype.
- Touch 1 subject direction: `your campaign checkout is still here`
- Touch 2 subject direction: `what Maya prepares for you`
- Touch 3 subject direction: `last note about your campaign`
- The emails may say `$97 once`, `one promotion`, and `within 48 hours` only when those terms match
  the live page and fulfillment capacity.
- Never say the campaign will make money, grow an audience, or guarantee sales.

## Acceptance

- Tests prove the 1h → 24h → 72h order and idempotency.
- Tests prove a payment between touches suppresses all later sends.
- Tests prove a different Stripe session for the same buyer still suppresses later sends.
- Tests prove test payments do not suppress live recovery and live payments do.
- Tests prove no email, disabled flag, or missing prior stage results in no send.
- Rendered HTML and text are attached for Sandra's approval.
- No customer email is sent during verification.

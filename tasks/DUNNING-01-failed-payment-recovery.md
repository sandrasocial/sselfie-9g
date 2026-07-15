# DUNNING-01 — recover involuntary churn (31% of membership cancellations were payment failures)

Status: READY for Codex 2026-07-14. Investigate/build on a branch now; merge after 2026-07-15
18:05 CEST. Evidence: Stripe cancellation records — 11 of 35 SUITE cancellations were payment
failures, not decisions (Codex audit 2026-07-14; decision contract v2 §v2-4).

## Scope

1. **Audit current state**: what happens today when a SUITE renewal charge fails? Check Stripe
   dashboard settings (Smart Retries, dunning emails, cancellation policy after N failures) AND
   repo webhook handling (`lib/payments/lifecycle/*` for `invoice.payment_failed`,
   `customer.subscription.updated` past_due states). Document the current sequence honestly.
2. **Enable/verify Smart Retries** + a card-update path: Stripe-hosted billing portal link
   (portal config `bpc_1SRX2wEVJvME7vkwu0rlIgfW`) in a payment-failed email.
3. **One dunning email** (max two touches) via the existing email infra: warm, Sandra-voice,
   one-click "update card" via the billing portal. Copy is DRAFT for Sandra. No new cron if
   Stripe's own dunning emails can carry it — prefer configuring Stripe over new code (Automation
   Roster lane rules; update the roster same day if anything new ships).
4. **Measurement**: recovered-payment visibility on `/admin` home money section (source:
   `stripe_payments`/Stripe only).

## Guardrails

Membership writes stay exact-Stripe-subscription scoped (never update all subscription rows by
user). No retroactive charging of already-canceled members without Sandra's explicit approval.
Review with the stripe-credit-reviewer agent. Full suite green before merge.

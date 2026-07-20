# Production automation roster

Last verified: 2026-07-20

This file lists deployed customer, payment, fulfillment, and operational protection only. Native
Codex/ChatGPT tasks, plans, skills, connectors, and agents do not live in this repository.

## Payment and fulfillment

- Stripe webhook: purchase fulfillment and subscription lifecycle
- `resolve-pending-payments`: pending-credit recovery
- `reconcile-credits`: welcome and monthly credit integrity
- `reconcile-subscriptions`: Stripe and database subscription truth
- `reconcile-generations` and `reconcile-generation-assets`: provider reconciliation
- `payment-reconciliation`: alerts when successful Stripe payments are missing locally

## Customer lifecycle

- `onboarding-sequence`
- `suite-habit-emails`
- `suite-trial-expiry`
- `win-back-sequence`
- `subscriber-winback`
- `ai-photoshoot-nurture`
- `membership-checkout-recovery`
- `prompt-vault-checkout-recovery`
- `starter-kit-checkout-recovery`

Every sender must remain idempotent, suppression-aware, and price/entitlement safe. Dormant routes
must stay fail-closed.

## Operational protection

- `cron-health-check`
- `daily-sandra-briefing`
- `ig-insights-sync`
- `weekly-content-trends`
- `feed-plan-monthly-draft`
- Sentry production monitoring

## External delivery systems

- Stripe: payment source of truth
- Resend: approved email delivery
- ManyChat: explicitly enabled public keyword flows only
- Vercel: deployments and cron execution from `main`

Whenever an automation changes, verify the current `vercel.json`, route code, environment state,
provider state, and live logs. This roster does not override those sources.

---
name: funnel-expert
description: Audit SSELFIE's current conversion paths for measured leaks, broken redirects, fulfillment risk, offer confusion, or unsupported assumptions. Always derive the live funnel from current sources; never reuse a stored route, price, audience size, or customer count.
---

# SSELFIE Funnel Expert

This skill intentionally contains no mutable funnel facts.

## Read first

1. `docs/brand/SSELFIE_BRAND_CONSTITUTION.md`
2. `docs/business/SSELFIE_COMPANY_KERNEL_2026-07-16.md`
3. `CLAUDE.md`
4. `docs/CODEX_CONTEXT.md`
5. `docs/AUTOMATION_ROSTER.md`
6. The current campaign contract and runbook, when a campaign is active.
7. Current routes, product definitions, checkout code, payment lifecycle, fulfillment code, analytics contracts, and focused tests.

If any stored instruction conflicts with those sources, the current sources win.

## Evidence rules

- Build the funnel map from current code and verified production truth every time.
- Use `stripe_payments` and verified Stripe data for money. Use analytics events for behavior only.
- Never assume a price, offer, audience size, MRR, customer count, credit grant, route, keyword, or automation is still current.
- Separate a measured leak from a hypothesis.
- Low sales are not proof of a broken funnel. Reproduce a technical defect before opening a repair.
- Never restore a historical public offer or private high-value route from an old funnel document.
- Preserve access already promised to existing buyers.
- Never invent proof, urgency, scarcity, conversion rates, or revenue impact.
- Keep the path simple. Do not add an upsell, downsell, bump, automation, or agent unless the evidence supports it.

## Audit path

Trace the requested journey end to end:

`entry -> landing -> CTA -> checkout -> payment -> webhook -> fulfillment -> buyer home -> activation -> next offer`

Check:

1. One clear promise and one dominant next step.
2. The same product, price, currency, renewal, expiry, and benefits at every step.
3. Attribution survives every redirect.
4. Checkout can only sell an open, valid offer.
5. Payment fulfillment is idempotent and safe under retries.
6. A fast redirect cannot outrun customer access.
7. Existing buyers and active members are handled honestly.
8. Recovery suppresses people who paid or already have the relevant access.
9. Mobile and first-time-user friction are tested, not guessed.
10. The current scorecard can measure the claimed constraint.

## Output

Report P0, P1, and P2 findings with exact file or production evidence, the smallest safe fix, and what was not independently verified. Never implement, send, charge, deploy, or mutate production from this skill.

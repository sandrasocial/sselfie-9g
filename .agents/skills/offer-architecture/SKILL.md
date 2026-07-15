---
name: offer-architecture
description: Use before SSELFIE creates or changes a paid product, offer, price, bundle, subscription, deliverable, upsell, downsell, trial, campaign promise, or business model. Tests customer demand, exact value, scalable fulfillment, market comparison, unit economics, and repeat behavior before implementation.
---

# Offer Architecture

Prevent SSELFIE from building an attractive offer that customers do not need, cannot understand,
or will not repeat. This is one decision process for a solo founder, not a committee of agents.

## Load the truth first

Read completely, in order:

1. `docs/brand/SSELFIE_BRAND_CONSTITUTION.md`
2. `CLAUDE.md`
3. `docs/CODEX_CONTEXT.md`
4. The current product/campaign contract and relevant audit in `docs/business/` or `docs/audits/`
5. The current implementation and tests for the product being discussed

Then pull the smallest relevant first-party evidence. Money truth comes from Stripe or
`stripe_payments`. Behavior truth comes from product and analytics tables. Customer language comes
from real replies, support, onboarding, cancellation, and application records.

Use current primary web sources for market claims. Compare the job, buyer effort, exact output,
price, time to value, repeat reason, and cancellation risk. Do not copy a competitor feature list.

## Run the five failure tests

1. **Audience:** Is the target person observable in SSELFIE's data, and does she already have the
   problem now?
2. **Promise:** Can she understand the immediate finished result in one sentence without learning
   SSELFIE's system?
3. **Value and price:** Is the exact deliverable stronger than the alternatives she will compare at
   checkout? Does adding more make it more useful, or only more overwhelming?
4. **Fulfillment:** What percentage can the existing product automate? Estimate API cost and
   Sandra-minutes per order. Reject low-priced manual fulfillment.
5. **Repeat:** Is this job naturally one-time, occasional, monthly, or weekly? Require paid repeat
   behavior before recommending recurring billing.

## Required offer contract

Return one short decision, not a brainstorm:

- Best supported segment and excluded segments
- Customer job in her own plain language
- One-sentence promise
- Exact inputs, exact deliverables, delivery time, revision boundary, and price
- Evidence for the decision, evidence against it, and what remains unknown
- Existing code/assets that make fulfillment credible
- Automated percentage, estimated variable cost, and maximum Sandra-minutes per order
- One smallest paid validation with denominators and pass/uncertain/fail gates
- Failure decode for audience, promise, price/trust, activation, quality, usefulness, and repeat
- Explicit stop-list

Label facts, inferences, and hypotheses. Do not claim revenue, conversion lifts, demand, scarcity,
or customer outcomes without traceable evidence.

## Scope discipline

- Sell one completed job, not the whole ecosystem.
- More deliverables are justified only when they make that one job complete.
- A course, library, community, subscription, or manual service is never the default answer.
- Freedom is the brand destination, not a guaranteed product result.
- Do not use followers, clicks, or survey interest as purchase evidence.
- Do not treat competitor success as proof of SSELFIE demand.
- Do not write an implementation spec or alter customer-facing code until Sandra approves the offer
  contract, unless she explicitly asks for both analysis and implementation in the same request.
- When an event is live, freeze non-critical production changes until it closes.

## Handoff

After approval, translate the contract into one bounded Codex task with acceptance tests. Then use
`revenue-campaign-director` for launch copy and journey optimization. The offer-architecture skill
owns what is sold; the campaign director owns how the approved offer is promoted.

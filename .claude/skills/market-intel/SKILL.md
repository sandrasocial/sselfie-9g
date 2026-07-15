---
name: market-intel
description: Gather real, current market evidence for SSELFIE offer and product decisions. Competitor teardowns with verified pricing and inclusions, demand signals ranked by proof strength, and benchmarks from successful AI-powered solo businesses. Use BEFORE creating, pricing, repositioning, or killing any offer, and whenever Sandra asks "would people actually buy this?" The offer-architect agent judges; this skill gathers what it judges with.
---

# Market Intel

The standing mission: SSELFIE to $200,000 ARR with offers that have PROVEN demand, honest
outcomes, and prices matched to value — never another offer shipped on optimism. Sandra's
rule that created this skill: "creating or tweaking offers that actually make sense and
have demand. Not a generic deliverable."

## Before anything

1. Read `docs/brand/SSELFIE_BRAND_CONSTITUTION.md` (category, path, honesty laws).
2. Read the current decision contract in `docs/business/` (newest dated file) so research
   serves the live question, not a stale one.
3. State the decision question in one sentence before researching. If it cannot be stated,
   stop and ask Sandra.

## The evidence hierarchy (rank every finding)

1. **Paid behavior** — actual purchases, member counts, review volumes, verified revenue
   (Stripe screenshots, RevenueCat industry data, indie-hacker verified interviews),
   sustained ad spend (Meta Ads Library: a company running the same offer ads for months is
   PAYING for that demand — the strongest external signal available for free).
2. **Costly signals** — waitlists with numbers, sold-out cohorts, hiring for fulfillment,
   price INCREASES over time (companies raise prices on what sells).
3. **Engagement** — follower/community size, content traction. Weak alone; context only.
4. **Opinions** — testimonials on the seller's own page, "people want X" takes, AI
   summaries with no source. Never load-bearing. Marketing-page claims are hypotheses.

Every claim carries: source URL, date seen, and a label — FACT (verified), REPORTED
(single self-reported source), INFERENCE (ours). Anything older than ~12 months is history,
not market truth; say so.

## The sweep (run as parallel research agents when more than one lane)

- **Direct competitors**: who sells the same JOB to the same woman (35-64, sells something,
  phone-first)? For each: exact offer names, prices, what is INCLUDED item by item,
  guarantee wording, delivery time, traction evidence, how they frame the outcome.
- **Price-band mapping**: for the offer shape in question, map the live market floor to
  ceiling (e.g., commodity AI headshots $29-59 → styled-stock memberships $40-54/mo → DFY
  content services $150-500 → agencies $1k+). Place the proposed offer and name what
  justifies its position ABOVE the floor (SSELFIE's is identity-safety + finished outcome).
- **Working models**: AI-powered solo/small businesses serving women entrepreneurs with
  verified traction — what they sell, one-time vs recurring mix, what they abandoned.
- **Demand language**: the words real buyers use (reviews, Reddit/FB groups, comment
  sections) for this job — feeds copy and the Creative Bar, and often reveals the real
  objection (for SSELFIE's market it is usually "will it look fake?").

## Synthesis contract (the output)

1. Evidence table (finding · source · date · strength label).
2. The price↔outcome verdict: what the market proves people pay for THIS outcome, and what
   the proposed offer must contain or claim to sit at its price honestly.
3. Demand gaps: what nobody sells that buyers ask for (opportunity), and what everybody
   sells that nobody buys (trap).
4. Implications: keep / change / kill recommendations routed to the offer-architect agent
   or straight to Sandra, each tied to a cited finding — never to taste.
5. What would change the answer, and the cheapest test that would settle it.

## Hard rules

- Internal truth first: check what OUR buyers already did (`stripe_payments`, live Stripe)
  before asking the market. SSELFIE's own sales are the highest-quality evidence we own.
- Never average away a contradiction: if internal and market evidence disagree, surface the
  conflict — that is usually where the real insight is.
- No income promises in anything customer-facing that results from this research.
- Findings feed decisions; this skill never sends, publishes, prices, or deploys anything.

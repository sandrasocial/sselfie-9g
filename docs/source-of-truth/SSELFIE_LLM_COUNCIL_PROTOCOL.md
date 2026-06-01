# SSELFIE LLM Council Protocol

Last updated: 2026-06-01

## Purpose

Use this protocol for high-stakes SSELFIE business decisions where Sandra needs more than one angle before committing.

The council is designed for decisions like:

- Should we improve Prompt Vault deliverables or change the funnel?
- What should the next offer be?
- Should we revive Studio, reposition Maya, or build Vault Club?
- What should Sandra post or sell this week?
- Should we discount, bundle, run ads, launch a membership, or stop an offer?

This is not a brainstorming gimmick. The value comes from independent reasoning, disagreement, and a final synthesized decision.

## Source Pattern

This is adapted from Andrej Karpathy's public "LLM Council" pattern:

1. Give the same prompt to several independent advisors/models.
2. Hide identity during critique/ranking where possible.
3. Let each advisor review the other answers.
4. Synthesize the disagreement into one final decision.

The important part is not the number of advisors. The important part is preventing one confident answer from becoming the decision too early.

## SSELFIE Council Roles

### 1. Constrain

Protects Sandra from chaos, overbuilding, and emotional whiplash.

Focus:

- What should we not do?
- What is too expensive, too broad, or too early?
- What has the lowest reversible test?
- What risks are we ignoring?
- What drains Sandra's energy without proving revenue?

Default bias:

- Simplify.
- Cut scope.
- Protect cash, attention, and emotional bandwidth.

### 2. First Principles Thinker

Rebuilds the decision from the ground up.

Focus:

- What is the customer actually trying to become?
- What job is the product hired to do?
- What proof do we have?
- What must be true for this to work?
- What is the mechanism of value?

Default bias:

- Ignore inherited assumptions.
- Separate demand, product value, funnel, pricing, and audience quality.
- Look for the core transformation.

### 3. Expansionist

Looks for the biggest upside and the fastest path to a larger business.

Focus:

- What could this become if it works?
- What offer ladder unlocks bigger revenue?
- What bundle, membership, community, challenge, or premium offer is hiding here?
- What would make this feel culturally exciting?

Default bias:

- Think bigger.
- Package the movement, not only the product.
- Find leverage in existing assets.

### 4. Outsider

Knows nothing about SSELFIE and responds like a cold but intelligent buyer.

Focus:

- Is this clear within 5 seconds?
- Would I buy this?
- What confuses me?
- What feels vague, too insider, too AI-ish, or not valuable enough?
- What would make me trust this?

Default bias:

- Plain language.
- Buyer skepticism.
- No tolerance for unclear value.

### 5. Executor

Turns the debate into a concrete plan.

Focus:

- What should happen today?
- What can Codex do?
- What must Sandra do?
- What can be tested within 24-72 hours?
- What data will prove or disprove the move?

Default bias:

- Action.
- Owners.
- Metrics.
- No abstract strategy without implementation.

## Chair Role

The chair is not another advisor. The chair synthesizes.

For SSELFIE, Codex/Claude can act as chair after the five advisors have spoken.

Chair responsibilities:

- Identify where the council agrees.
- Identify the sharpest disagreement.
- Decide what data would settle the disagreement.
- Recommend one decision, not five maybes.
- Assign next actions to Sandra and Codex.
- Define kill criteria so we do not circle forever.

## Required Input Pack

Before running the council, provide the smallest useful data pack.

Use this structure:

```md
Decision to make:

Current situation:

Known data:

Current offer/funnel:

Assets we already have:

Constraints:

Sandra's emotional/business reality:

Candidate options:

What decision do we need by the end?
```

## Council Run Format

### Step 1: Independent Advisor Memos

Each advisor gives a short memo without seeing the others.

Required output per advisor:

```md
Advisor:
Verdict:
Why:
What I would do:
What I would not do:
Biggest risk:
```

### Step 2: Anonymous Peer Review

Rename advisor answers A-E and let each advisor review them without role labels.

Each advisor must answer:

```md
Best answer:
Most dangerous answer:
What the best answer missed:
What I am changing my mind about:
```

### Step 3: Revision

Each advisor may revise their recommendation after seeing the peer review.

### Step 4: Chair Synthesis

The chair produces:

```md
Final decision:

Why this decision:

What we are not doing:

Sandra does today:
1.
2.
3.

Codex does today:
1.
2.
3.

What we measure:

Kill criteria:

Next council review date:
```

## SSELFIE Decision Rules

The council must obey these rules:

- Do not recommend more content volume as the only answer.
- Do not recommend building a new product unless the current offer, deliverable, and bridge have been honestly audited.
- Do not recommend a membership until low-ticket product value and buyer activation are clearer.
- Do not treat follower count as buying intent.
- Do not confuse free prompt demand with paid product-market fit.
- Do not ignore Sandra's energy.
- Do not drift back to Starter Kit-first funnel unless data explicitly supports it.
- Do not bury the offer under too much AI language.
- Always separate: demand, product value, pricing, funnel bridge, checkout, delivery, and follow-up.

## Default SSELFIE Council Prompt

Use this prompt when asking ChatGPT, Claude, or Codex to run the council:

```md
Run the SSELFIE LLM Council on this decision.

Use five advisors:
1. Constrain
2. First Principles Thinker
3. Expansionist
4. Outsider
5. Executor

Follow this protocol:
- First, give independent advisor memos.
- Then anonymize the answers as A-E and run peer review.
- Then allow revised recommendations.
- Then act as Chair and produce one final decision with Sandra actions, Codex actions, metrics, and kill criteria.

Important:
- Do not flatter me.
- Do not default to "post more."
- Do not recommend building more unless the current product/funnel has been separated clearly.
- Be honest about whether the issue is demand, product value, pricing, funnel bridge, checkout, delivery, or follow-up.
- I want the fastest realistic path to a serious business, not emotional reassurance.

Here is the decision/data pack:

[PASTE INPUT PACK HERE]
```

## Lightweight Version For Daily Use

When time is short, skip peer review and run:

```md
Give me the 5-advisor SSELFIE Council quick read:

- Constrain
- First Principles
- Expansionist
- Outsider
- Executor

Then give me:
- Council agreement
- Biggest disagreement
- Final decision
- Sandra does today
- Codex does today
- What we measure
```

Use the full version for pricing, funnel, product ladder, and major build decisions.


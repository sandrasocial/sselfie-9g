# SSELFIE Email Revenue Operating System · 2026

Last updated: 2026-08-22

## The job of email

SSELFIE email exists to turn attention into useful customer results and those results into durable customer relationships.

The system should sell more **because it understands the customer better**, not because it sends the same offer more often.

Core customer progression:

`ATTENTION → FREE RESULT → $37 FIRST PAID RESULT → CORE MEMBERSHIP → RETENTION`

SSELFIE Method:

`TAKE → EDIT → EXPAND → USE`

## One customer state

Use Resend Contact Properties as customer state. Do not create new sequence-history segments as workflow state.

Canonical properties:

- `acquisition_path`
- `lifecycle_stage`
- `primary_interest`
- `membership_status`
- `last_product`

Segments answer **who should receive a specific broadcast**. Properties answer **who the person is**.

Topics will answer **what the person wants to hear about** once the preference-center UX is implemented.

## Customer-stage meaning

### Lead

Has opted into SSELFIE email but has not bought.

Main jobs:

- deliver what was promised
- get a visible first result
- teach one useful concept at a time
- make the relevant $37 product the natural next step

### Customer

Has bought a paid entry product.

Main jobs:

- help them use it
- troubleshoot first result
- help them turn result into something usable
- invite to membership after value has been experienced

### Member

Has membership history. `membership_status` carries the current operational truth.

Important: do not downgrade historical `lifecycle_stage=member` after cancellation. Use `membership_status` to distinguish active, trialing, past_due, unpaid, canceled, etc.

## Acquisition paths

### TAKE path

Free Selfie Guide → Selfie Starter → SSELFIE membership

- Freebie email should help improve the real photo first.
- Day 1 is activation-only.
- Do not introduce AI as the solution to every selfie problem.
- Selfie Starter is the logical paid step when taking/editing the real photo is the problem.

### AI / EXPAND path

Free AI Prompts → Prompt Vault → SSELFIE membership

- Free prompts should generate a real attempt quickly.
- Teach source-photo quality and identity consistency.
- Prompt Vault is for repeatable collections / not starting from a blank prompt every time.
- Do not describe the Vault as an automatic image generator. The customer still chooses the selfie and uses the prompts.

## Regular broadcast cadence

Outside a launch, Main Audience gets a baseline of **two useful emails per week**.

### Email A · Make This Photo

Rotate through TAKE → EDIT → EXPAND → USE.

Examples:

- TAKE: window light, camera height, pose, framing, ten-photo method
- EDIT: exposure before preset, crop, highlights, warmth, cleanup
- EXPAND: source-photo choice, why identity drifts, how to build connected shots
- USE: one photo → Story / carousel / cover / text-overlay / sales post

Rules:

- useful even if the reader never buys
- one practical action
- one main idea
- normally no CTA, or one soft CTA only when the paid product is the obvious next step

### Email B · Sandra Note

Story, opinion, lesson, behind-the-scenes, mistake, decision, or observation.

Rules:

- should sound like an email from Sandra, not a content-marketing article
- invite reply when the answer gives useful customer insight
- no product CTA required
- can create demand by changing a belief without asking for a sale

## Commercial ratio outside launches

For regular Main Audience broadcasting:

- at least one of the two weekly emails should have **no commercial CTA**
- at most one should contain a direct product CTA
- do not manufacture urgency
- do not add a CTA merely because an email exists

Lifecycle emails and checkout recovery are separate from this editorial ratio because they are triggered by the customer's own action.

## Sales-email jobs

A sequence should not make the same argument repeatedly.

Use different jobs:

1. **Desire / transformation** — what becomes easier or possible?
2. **Demonstration** — show how the mechanism works.
3. **Proof** — show a real result or pattern.
4. **Objection / fit** — who needs it, who does not, what it does not do.
5. **Decision** — price, scope, urgency only when urgency is real.

If three consecutive emails can be summarized with the same sentence, the sequence is repetitive.

## Intent hierarchy

Treat behavior as stronger than opens.

From strongest to weakest commercial signal:

1. successful buyer
2. checkout started
3. paid-offer link clicked
4. product/detail page viewed
5. free resource used / activated
6. email delivered
7. email opened

Do not use opens as the primary engagement signal.

## Recovery ownership

Never let two recovery systems compete for the same person.

### Checkout started

Owned by the existing product checkout-recovery flow.

Do not additionally send a clicked-offer recovery.

### Offer clicked, no checkout

Owned by `high-intent-click-recovery` only if the report proves the cohort is worth contacting.

Current status: **report-only** unless `HIGH_INTENT_CLICK_RECOVERY_ENABLED=true`.

### Payment failed / past due

Owned by billing recovery.

Do not send acquisition or membership-join messaging while billing recovery is the relevant job.

### Canceled member

Owned by member win-back / reactivation after cancellation state is confirmed.

Do not pretend they are a cold lead.

## Buyer → membership ascension

Current dedicated bridge:

- Selfie Starter buyer: eligible after ~10 days
- Prompt Vault buyer: eligible after ~14 days
- active/trialing membership excluded
- one bridge maximum per person
- membership is presented as the ongoing TAKE → EDIT → EXPAND → USE system, not another random upsell

Do not add more buyer→membership emails until the first bridge has enough cohort data to justify another touch.

## Main Audience launch mode

A launch is an exception to baseline cadence, not the normal state of email.

Before a launch:

- editorial cadence should already be active
- audience fit must be defined
- buyer suppression must work
- checkout recovery must work
- each launch email must have a distinct job

During a launch:

- prefer relevant segment over full-list by default
- do not resend the same argument with a new subject line
- do not send “last chance” unless something actually ends
- keep buyers out immediately after purchase

After a launch:

- return to editorial value
- review revenue per recipient, click-to-purchase, unsubscribe, complaint, and downstream activation

## Broad-send eligibility

Broad Main Audience sends are appropriate for:

- useful photo/selfie education
- SSELFIE Method education
- personal Sandra notes
- major SSELFIE announcements relevant to almost everyone
- universally relevant brand/product changes

Broad Main Audience sends are normally **not** appropriate for:

- checkout recovery
- buyer upsells
- payment recovery
- cancellation win-back
- niche product objections
- high-intent follow-up

Those are lifecycle / behavioral jobs.

## Current operational gates

### Historical contact backfill

`RESEND_LIFECYCLE_BACKFILL_ENABLED`

Default: OFF.

Do not enable until historical classification has been reviewed from aggregate/report output. Real-time lifecycle updates are already live without needing this backfill.

### High-intent click recovery

`HIGH_INTENT_CLICK_RECOVERY_ENABLED`

Default: OFF.

The cron may report aggregate candidate counts, but it must not send until data shows this audience is material and the incremental email is justified.

## Consent rules

- SSELFIE's durable app unsubscribe wins.
- A globally unsubscribed Resend Contact is never re-added by sync.
- Never set `unsubscribed=false` as part of lifecycle enrichment.
- A Stripe purchase alone does not create a marketing Contact.
- Updating customer state must not silently create marketing consent.
- One-click unsubscribe remains present on marketing lifecycle sends.

## Checkout-link privacy

New revenue links use an opaque encrypted checkout-email handoff.

Purpose:

- preserve prefilled checkout / skip redundant email capture
- avoid raw recipient address in URLs, provider click logs, browser history and referrers

Backward compatibility:

- old already-sent raw `checkout_email` links continue to work
- invalid/expired encrypted handoffs fail closed and checkout asks for email normally

## Measurement hierarchy

### List health

Track:

- delivered
- hard bounce / suppression
- complaint rate
- unsubscribe rate

### Engagement

Track:

- unique clicks
- replies
- meaningful site action

Open rate is diagnostic only, not a primary KPI.

### Revenue

Track:

- checkout starts
- checkout completion
- purchases
- revenue per recipient
- product conversion by acquisition path
- recovery revenue

### Customer success

Track:

- first result / activation
- time to first result
- second-use behavior
- buyer → membership conversion
- membership activation
- 30 / 60 / 90-day retention

## Initial commercial milestone

For the $37 buyer → membership path, use **10% cohort conversion** as the first internal milestone, then test toward 15%+ only after activation and retention remain healthy.

This is an internal operating target, not an industry benchmark.

Never calculate this by dividing current active subscribers by current-month transactions. Use matching buyer cohorts and a defined conversion window.

## Decision rules

### Keep an email / flow when

- it produces meaningful clicks, purchase or activation
- list-health cost is acceptable
- it clearly owns a customer job not handled elsewhere

### Rewrite when

- people click but do not convert
- the objection appears to be message/fit rather than checkout friction
- the same sales argument is repeated across touches

### Stop when

- it duplicates another flow
- it targets the wrong lifecycle state
- complaint/unsubscribe cost rises without downstream value
- it exists because “we should email more” rather than because it has a job

## Current editorial drafts in Resend

These are drafts only until deliberately approved/sent:

1. `Editorial · TAKE · Window light reset · 2026-08-24`
   - subject: `before you take another selfie, do this`
   - pure value, no product CTA

2. `Editorial · Sandra Note · Content too hard · 2026-08-28`
   - subject: `I was making every post way too hard`
   - TAKE → EDIT → EXPAND → USE belief/story email
   - reply prompt, no product CTA

3. `Editorial · EDIT · Before the preset · 2026-09-01`
   - subject: `do this before you use a preset`
   - value first
   - soft Selfie Starter CTA for readers whose problem is editing

## Weekly review question

Every review should answer these five questions before adding another email:

1. Where did new leads come from?
2. Did they get the first result?
3. Which offer did they click / buy?
4. Where did buyers stop before membership?
5. What is the smallest email/system change most likely to remove that exact stop?

The goal is not more sends. The goal is more customers progressing successfully through SSELFIE.

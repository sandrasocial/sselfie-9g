# SSELFIE Email Growth System 2026

Status: active project
Owner: SSELFIE
Primary goal: grow customer value and membership revenue without turning the list into a constant sales channel.

## North star

Email should move a subscriber toward the next useful result, not simply the next offer.

Canonical journey:

ATTENTION -> ACQUISITION -> FIRST RESULT -> FIRST PAID RESULT -> CORE MEMBERSHIP -> RETENTION

Acquisition paths:

- TAKE: Free Selfie Guide -> Selfie Starter -> SSELFIE membership
- CREATE / EXPAND: Free AI Prompts -> Prompt Vault -> SSELFIE membership

## Current architecture

SSELFIE uses Resend as the sending layer and the application as the lifecycle orchestration layer.

Important existing strengths:

- verified sending domain
- SPF and DKIM configured
- custom tracking subdomain
- marketing suppression checks
- visible unsubscribe footer
- RFC 8058 one-click List-Unsubscribe headers for app-level marketing sends
- lifecycle send logging
- bounce and complaint suppression
- checkout recovery
- subscriber win-back
- UTM attribution

Important current weaknesses:

- historical Resend segment sprawl
- no clean contact property model in Resend
- no preference/topic model
- open activity has been treated as meaningful engagement in win-back logic
- some lifecycle greetings infer names from email addresses
- some free-lead emails introduce the paid offer too early
- raw recipient email is still present in some tracked checkout URLs
- lifecycle journeys are partly time-driven when they should increasingly respond to activation and purchase behavior

## Operating principles

1. First result before first pitch.
2. Clicks, replies, product actions and purchases matter more than opens.
3. Purchasers leave lead-sales sequences immediately.
4. Customers who have not activated get help before they get an upsell.
5. Membership is introduced as the complete TAKE -> EDIT -> EXPAND -> USE system, not as a random next product.
6. Relationship emails can have no CTA and no sale.
7. Every recurring marketing email must have suppression, one-click unsubscribe and measurable attribution.
8. One customer profile should describe state. Do not create a new segment for every sequence day.
9. Prefer reversible changes, preview deployments and staged rollout.
10. Measure downstream behavior, not only email engagement.

## Target lifecycle model

### Lead properties

Application customer state should be able to answer:

- acquisition_path: take | create | other
- lead_magnet: selfie_guide | ai_prompts | other
- lifecycle_stage: lead | buyer | member | churned
- primary_interest: selfies | editing | ai_photos | content
- first_result_at
- last_meaningful_engagement_at
- last_purchase_at
- membership_status

Resend contact properties may mirror the fields needed for broadcast segmentation, but application data remains the operational source of truth.

### Meaningful engagement

Primary signals:

- tracked link click
- reply where available as structured data
- product activation event
- checkout start
- purchase
- membership activity

Open events are diagnostic only and must not be used as the sole stay/sunset signal.

## Journey design

### Free Selfie Guide

Day 0: deliver guide and one immediate setup win.

Day 1: activation only. Help the subscriber create a better selfie. No paid pitch.

Next educational touch: editing or posing help based on what is actually active and tested.

Offer touch: introduce Selfie Starter only after useful education.

Exit conditions:

- purchase Selfie Starter
- unsubscribe / suppression
- enter a higher-priority customer journey

### Free AI Prompts

Day 0: deliver prompts.

Day 1: choose one prompt and create one result. No paid pitch.

Day 5: troubleshoot identity/source-photo problems.

Day 7: introduce Prompt Vault as the complete-shoot next step.

Day 9: product truth / decision email.

Exit conditions:

- purchase Prompt Vault
- unsubscribe / suppression
- enter a higher-priority customer journey

### First paid product

For Selfie Starter and Prompt Vault buyers:

1. delivery and first action
2. activation help
3. troubleshooting
4. show how to USE the result
5. ask for result/reply/feedback
6. introduce membership only after evidence of activation or at a later educational checkpoint

Do not send a membership upsell simply because a calendar day elapsed if the customer has not used the first product.

### Membership

Member email should prioritize activation and retention:

- joined but no first creation -> remove friction
- first creation completed -> celebrate and recommend next step
- TAKE-heavy behavior -> introduce EDIT
- edited photo -> introduce EXPAND where useful
- created photos but no content action -> PHOTO -> CONTENT help
- inactive member -> reactivation based on actual product behavior
- cancel intent -> remind customer of work/results and options without guilt

## Editorial cadence

Target baseline after lifecycle cleanup:

### Make This Photo

One practical TAKE, EDIT, EXPAND or USE idea. Usually one clear action.

### Sandra's Note

Story, lesson, opinion, behind the scenes, personal observation or a useful photo-led thought. A sale is optional, not required.

The goal is to train subscribers to value the email itself.

## Measurement

Email health:

- delivery rate
- hard bounce rate
- complaint rate
- unsubscribe rate

Engagement:

- unique click rate
- replies where measurable
- resource activation

Revenue:

- checkout starts
- purchase conversion
- revenue per recipient
- lead-to-first-paid conversion
- first-paid-to-membership conversion

Customer success:

- first result completed
- time to first result
- buyer activation
- member activation
- member retention / churn

Open rate is secondary diagnostic data only.

## Project phases

### Phase 1: hygiene and trust

- [x] stop deriving first names from email addresses
- [x] make Free Selfie Guide day 1 activation-only
- [x] change subscriber win-back copy to explicit click confirmation
- [x] remove opens from subscriber win-back eligibility and sunset logic
- [ ] verify tests and preview deployment
- [ ] audit raw email query parameters and replace them with a safer attribution/prefill mechanism
- [ ] inventory active vs archived lifecycle templates and cron routes

### Phase 2: lifecycle architecture

- [ ] define canonical customer state fields
- [ ] map all entry and exit rules
- [ ] guarantee buyer suppression from lead offers
- [ ] identify duplicate or conflicting journeys
- [ ] build activation-aware paid-product follow-up
- [ ] build membership bridge around success, not elapsed days

### Phase 3: Resend organization

- [ ] reduce operational dependence on sequence-day segments
- [ ] add only useful broadcast properties/segments
- [ ] design subscriber preference topics
- [ ] create clear naming convention for campaigns, broadcasts and lifecycle email types

### Phase 4: editorial system

- [ ] launch Make This Photo cadence
- [ ] launch Sandra's Note cadence
- [ ] define content-to-offer rotation
- [ ] keep regular no-ask relationship emails in the mix

### Phase 5: reporting and optimization

- [ ] build weekly lifecycle scorecard
- [ ] report acquisition source -> activation -> purchase -> membership
- [ ] test one variable at a time
- [ ] prioritize offer conversion and activation over subject-line vanity tests
- [ ] maintain list hygiene and win-back cohorts

## Change-control rule

No bulk send, pricing change, production suppression expansion or destructive list cleanup should be made silently. Code and lifecycle logic changes should be reviewed through a branch / pull request and validated before production rollout.

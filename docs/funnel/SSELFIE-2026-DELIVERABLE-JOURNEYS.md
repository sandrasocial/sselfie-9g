# SSELFIE 2026 Deliverable Journeys

Last updated: 2026-04-25

Every deliverable should feel like a guided result, not a file dump. This document defines the desired customer experience for each major offer.

## Shared Delivery Standard

Every paid or opt-in product must answer:

1. What did I just get?
2. Where do I start?
3. What can I finish today?
4. What should I do next?
5. How does this connect to the rest of SSELFIE?

Every buyer path should include:

- day-0 delivery email
- one obvious access page or buyer home
- one guided first action
- one progress or completion signal
- one relevant next-step CTA

## Selfie Guide

### Promise

Take one selfie you feel confident enough to post.

### Current Delivery

- Content lives in `content-templates/selfie-guide-content-v3.md`.
- Access is tokenized through `app/selfie-guide/access/[token]/page.tsx`.
- Checkout is `app/checkout/selfie-guide/page.tsx`.
- Paid delivery is handled through the Stripe webhook and guide email templates.

### Desired Journey

1. User opts in or purchases.
2. Success page or email opens the guide.
3. Guide starts with “Today’s result: take one postable selfie.”
4. User follows camera, light, pose, and edit steps.
5. User receives a simple caption/post prompt.
6. User is invited to Starter Kit if they want presets and a 7-day content starter.

### Required Deliverables

- First-photo checklist
- “Post this week” challenge
- One caption prompt
- Clear next step to Starter Kit or Studio

### Acceptance Criteria

- The access page, delivery email, and nurture sequence all describe the same first-photo outcome.
- The guide does not feel like a generic ebook.
- The first CTA after completion is contextually relevant, not a generic upsell.

## Starter Kit

### Promise

Create your baseline brand look and your first week of content without starting from scratch.

### Current Delivery

- Landing at `app/starter-kit/page.tsx`.
- Checkout at `app/checkout/starter-kit/page.tsx`.
- Buyer home at `app/academy/access/starter-kit/page.tsx`.
- Token fallback at `app/access/starter-kit/[token]/page.tsx`.
- Preset/resources are env-hosted rather than versioned in the repo.

### Desired Journey

1. Buyer completes checkout.
2. Success page opens Starter Kit buyer home.
3. Buyer sees three steps: download/setup presets, open Selfie Guide, create a 7-day content starter.
4. Buyer completes one visible result and one content plan action.
5. Buyer is invited to Studio for ongoing implementation.

### Required Deliverables

- Selfie Guide access
- Presets/resources
- 7-day content starter
- “What to post this week” prompt set
- Studio CTA only after the baseline result is clear

### Acceptance Criteria

- Starter Kit feels bigger than a preset download.
- The buyer can complete one useful action in under 20 minutes.
- Email and buyer home use the same step order.

## Brand Strategy Pack

### Promise

Know what to say, who you help, and how to turn your story into content people understand.

### Current Delivery

- Landing at `app/brand-strategy/page.tsx`.
- Checkout at `app/checkout/brand-strategy-pack/page.tsx`.
- Setup questionnaire at `app/brand-strategy/setup/[token]/page.tsx`.
- AI generation via `app/api/brand-strategy/generate/route.ts`.
- Output at `app/strategy/[token]/page.tsx`.

### Desired Journey

1. Buyer completes checkout.
2. Success page or email opens setup.
3. Setup collects only the information needed for a useful first strategy.
4. Output page gives the strategy plus implementation actions.
5. Buyer leaves with three posts and one CTA they can use this week.

### Required Deliverables

- Positioning statement
- Audience/problem clarity
- Content pillars
- Voice/tone guidance
- Three ready-to-write post ideas
- One CTA and simple offer framing

### Acceptance Criteria

- Strategy output is actionable without requiring another purchase.
- Masterclass buyers receive this by default before income/content modules.
- Studio members can find and reuse the output.

## Blueprint

### Promise

Turn your visibility into a 30-day content implementation plan.

### Current Delivery

- Marketing at `app/blueprint/page.tsx`.
- Checkout at `app/checkout/blueprint/page.tsx`.
- App workflow through `app/feed-planner/page.tsx`.
- Access logic in `lib/feed-planner/access-control.ts`.
- Fulfillment and credits handled in `app/api/webhooks/stripe/route.ts`.

### Desired Journey

1. Buyer completes checkout.
2. Success page opens Feed Planner or a Blueprint buyer home.
3. Buyer sees a default 30-day path, not a blank wizard.
4. Buyer can generate or customize the plan after seeing the first result.
5. Follow-up emails prompt implementation, not more setup.

### Required Deliverables

- 30-day content plan
- weekly posting rhythm
- content prompts tied to the Brand Strategy Pack where available
- simple progress milestones
- next step to Studio for recurring execution

### Acceptance Criteria

- Buyer is not dropped into a confusing multi-step form before value.
- Delivery email, follow-up emails, and Feed Planner copy describe the same outcome.
- The product is either clearly standalone or clearly included as a Starter Kit/Studio benefit.

## Masterclass

### Promise

Build income-ready visibility with a clear offer, content system, and implementation plan.

### Current Delivery

- Marketing at `app/masterclass/page.tsx`.
- Checkout at `app/checkout/masterclass/page.tsx`.
- Academy access through `lib/academy-entitlements.ts`.
- Existing access aliases include course IDs such as `branded_by_sselfie` and `editing_masterclass`.

### Gap

The product should not claim income transformation until the income module exists. Current content is education-focused, but not enough to support “how to make money online.”

### Desired Journey

1. Buyer gets Brand Strategy Pack access first.
2. Buyer completes positioning/offer clarity.
3. Buyer enters the Masterclass home with a clear lesson order.
4. Buyer completes the income module and leaves with sales assets.
5. Buyer is invited to Studio for execution, not pressured before they understand the system.

### Required Deliverables

- Brand Strategy Pack included by default
- Personal Brand Offer Map
- “What I Sell” one-page script
- 30-day income-ready content calendar
- DM reply and follow-up scripts
- simple bio/landing-page copy
- weekly tracking sheet
- compliance-safe earnings disclaimer

### Acceptance Criteria

- No guaranteed income language.
- Buyer receives practical selling assets, not only lessons.
- Academy buyer home shows “Start here” clearly.

## Studio / Maya

### Promise

Your weekly personal brand studio for photos, captions, planning, and implementation.

### Current Delivery

- Auth/app surfaces include `app/studio/page.tsx`, `app/maya/page.tsx`, and `components/sselfie/maya-chat-screen.tsx`.
- Checkout is `app/checkout/membership/page.tsx`.
- Studio includes Maya, Feed Planner access, credits, Academy/member resources, and ongoing email sequences.

### Desired Journey

1. Member joins.
2. Success page opens Studio/Maya with a clear weekly action.
3. Member sees bundled resources and recommended first workflow.
4. Maya helps generate photos, content ideas, captions, and next steps.
5. Member gets recurring prompts to create and publish.

### Required Deliverables

- weekly Studio workflow
- clear member resource home
- bundled access to relevant guides/courses
- progress or completion signal
- upgrade path to Private Offer only after enough context

### Acceptance Criteria

- Member knows what to do first.
- Member sees why Studio is more than AI photo generation.
- Bundled resources do not create navigation clutter.

## Income Module Safety

The income module should promise readiness and implementation, not guaranteed earnings.

Approved wording:

> Build the assets and content system you need to start selling online with more clarity.

Avoid:

- “guaranteed income”
- “make X in Y days”
- “this will make you money”
- testimonials presented as typical outcomes without context

Income results depend on offer, audience, consistency, market demand, effort, and timing. That framing should appear on income-facing pages and emails.

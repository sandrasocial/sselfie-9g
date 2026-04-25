# SSELFIE 2026 Bundle Implementation Spec

Last updated: 2026-04-25

This spec defines the conservative bundle architecture. The goal is to increase customer value without adding more confusing public offers.

## Bundle Rules

- Keep the public ladder simple.
- Prefer adding access/value to existing products over adding new standalone SKUs.
- Do not bundle everything into everything.
- Every bundle must be represented in product copy, checkout, entitlement, webhook fulfillment, email delivery, buyer access, analytics, and tests.
- If a bundle cannot be verified end-to-end, do not launch it.

## Bundle 1: Selfie Guide Plus

### Customer Promise

Take one selfie you feel confident enough to post.

### Product Shape

This can stay free or low-ticket. The value increase should come from the guided result, not from adding more downloads.

### Included Value

- Selfie Guide
- first-photo checklist
- 7-day postable selfie challenge
- one caption prompt
- soft CTA to Starter Kit

### Implementation Surface

- `content-templates/selfie-guide-content-v3.md`
- `app/selfie-guide/page.tsx`
- `app/selfie-guide/access/[token]/page.tsx`
- `lib/email/templates/selfie-guide-paid-delivery.tsx`
- `lib/email/selfie-guide-email-sequence.ts`

### Acceptance Criteria

- Access page and delivery email use the same promise.
- The first action is visible above any upsell.
- Nurture emails reinforce completion before selling the next step.

## Bundle 2: Starter Kit

### Customer Promise

Create your baseline brand look and first week of content.

### Product Shape

Starter Kit should become the first paid implementation kit.

### Included Value

- Selfie Guide access
- presets/resources
- 7-day content starter
- “what to post this week” prompts
- optional Blueprint-lite workflow

### Implementation Surface

- `lib/products.ts`
- `lib/academy-entitlements.ts`
- `app/starter-kit/page.tsx`
- `app/checkout/starter-kit/page.tsx`
- `app/academy/access/starter-kit/page.tsx`
- `app/access/starter-kit/[token]/page.tsx`
- `lib/email/templates/starter-kit-day0-delivery.ts`
- `lib/email/starter-kit-email-sequence.ts`

### Acceptance Criteria

- Starter Kit grants guide access.
- Buyer home shows steps in this order: photo, resources, 7-day starter.
- Day-0 email and buyer home match.
- Studio CTA appears after the first implementation action.

## Bundle 3: Masterclass

### Customer Promise

Build income-ready visibility with a clear offer, content system, and implementation path.

### Product Shape

Masterclass should include Brand Strategy Pack by default. A buyer cannot use income/content education well without positioning first.

### Included Value

- Brand Strategy Pack access
- current Masterclass course access
- income/content-to-cash module
- implementation workbook
- sales and DM scripts
- 30-day income-ready content calendar

### Implementation Surface

- `lib/products.ts`
- `lib/academy-entitlements.ts`
- `app/masterclass/page.tsx`
- `app/checkout/masterclass/page.tsx`
- `app/academy/page.tsx`
- `lib/email/templates/masterclass-day0-delivery.ts`
- `lib/email/masterclass-email-sequence.ts`
- `app/api/webhooks/stripe/route.ts`

### Acceptance Criteria

- Masterclass purchase grants Brand Strategy Pack access.
- Buyer home tells the customer to complete Brand Strategy first.
- Income module exists before income messaging is used on sales pages.
- Income disclaimers are present wherever income-oriented claims appear.

## Bundle 4: Studio Member Value Stack

### Customer Promise

Your weekly personal brand studio for photos, captions, planning, and implementation.

### Product Shape

Studio is the main recurring product. It should include access to selected resources as member value, but the member homepage should stay focused on the weekly action.

### Included Value

- Maya generation workflow
- Feed Planner / Blueprint implementation where membership grants access
- Selfie Guide
- Brand Strategy Pack or strategy workflow
- selected Masterclass resources
- weekly implementation prompts

### Implementation Surface

- `app/studio/page.tsx`
- `app/maya/page.tsx`
- `components/sselfie/maya-chat-screen.tsx`
- `components/sselfie/sselfie-app.tsx`
- `lib/subscription.ts`
- `lib/academy-entitlements.ts`
- `lib/feed-planner/access-control.ts`
- `app/api/webhooks/stripe/route.ts`

### Acceptance Criteria

- Member can see what is included without being overwhelmed.
- Weekly workflow is the first action.
- Resources are accessible but not the main dashboard.
- Upgrade path is Private Offer only when context supports it.

## Implementation Order

1. Strengthen Selfie Guide promise and completion action.
2. Make Starter Kit a true implementation kit.
3. Add Brand Strategy Pack access to Masterclass.
4. Build the income module before changing Masterclass income copy.
5. Clarify Studio member value stack.
6. Update checkout/fulfillment/email/tests for each bundle in the same pass.

## Tests To Add Or Update

- product catalog bundle expectations
- entitlement alias expectations
- checkout product type expectations
- webhook fulfillment expectations
- day-0 email link expectations
- buyer-home access expectations
- smoke flow for main public checkout routes

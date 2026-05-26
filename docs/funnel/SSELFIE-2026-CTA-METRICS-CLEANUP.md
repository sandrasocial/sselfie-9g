# SSELFIE 2026 CTA, Metrics, And Cleanup Map

Last updated: 2026-05-26

This document turns the funnel decision into an implementation checklist for CTAs, measurement, and cleanup.

## 2026-05-26 Prompt Vault Pivot

The primary front-door funnel is now:

```
Instagram prompt reels -> /ai-prompts -> /prompt-vault -> Masterclass / Studio / 1:1
```

Starter Kit is not the main upgrade from AI Prompts. It remains a secondary support offer only when the customer needs better source selfies, presets, and editing help.

## CTA Principles

Every CTA should move the customer to one clear next step:

1. Create the first visible result.
2. Clarify the message/offer.
3. Keep implementing inside Studio.

Avoid competing CTAs on the same surface. Secondary CTAs can exist, but the primary action must be obvious.

## Public CTA Map

| Surface | Primary CTA | Secondary CTA | Notes |
| --- | --- | --- | --- |
| Prompt reels / Instagram bio during prompt pushes | Get free AI prompts | Prompt Vault | Match the active demand signal. |
| `/ai-prompts` | Get the free AI prompts | Prompt Vault | Free taste; capture email before paid vault. |
| `/ai-prompts/access/[token]` | Get the full Prompt Vault | Starter Kit | Starter Kit is secondary only, not the paid prompt unlock. |
| `/prompt-vault` | Get the Vault | Masterclass / Studio later | Primary low-ticket offer for ChatGPT prompt demand. |
| Prompt Vault buyer home/access | Copy first prompt | Masterclass / Studio later | First action is use a prompt, not browse the ecosystem. |
| Instagram bio / `/bio` | Get the free Selfie Guide | Brand Strategy Pack | Keep the entry simple; do not list every product. |
| Home / main landing | Get the Selfie Guide | See Studio | Sell the transformation, not the whole ecosystem. |
| `/selfie-guide` | Get free access or start guide | Starter Kit | Match current free route behavior unless pricing strategy changes. |
| Selfie Guide access page | Complete first photo challenge | Starter Kit / Studio | CTA appears after value, not before. |
| `/starter-kit` | Get Starter Kit | See Studio | Position as first paid implementation kit. |
| Starter Kit buyer home | Start step 1 | Continue to Studio | First action before upsell. |
| `/brand-strategy` | Get Brand Strategy Pack | See Masterclass | Strategy is the clarity layer. |
| Strategy output page | Use these 3 posts | Masterclass / Studio | Next step should depend on product ownership. |
| `/masterclass` | Join Masterclass | See Studio | Only use income wording after module exists. |
| Masterclass buyer home | Start with Brand Strategy | Continue income module | Make lesson order clear. |
| `/blueprint` | Start 30-day plan | See Studio | Avoid overlap with Starter Kit by clarifying depth. |
| `/checkout/membership` | Join Studio monthly/annual | Private Offer | Current public page says Studio is privately onboarding; align before relaunching public membership. |
| Studio / Maya | Start this week’s workflow | Open resources | Keep implementation action above resource browsing. |
| Private Offer | Apply/inquire | Studio | Premium path only after trust. |

## Email CTA Map

| Email Type | Primary CTA | Rule |
| --- | --- | --- |
| AI Prompts delivery | Open free prompts | No immediate hard sell before first value. |
| AI Prompts day 2/5 | Use/copy prompt | Keep momentum around the thing they asked for. |
| AI Prompts day 7 | Prompt Vault | This replaces the old Starter Kit-first bridge. |
| Prompt Vault delivery | Open Prompt Vault | List collections and get buyer to copy one prompt. |
| Selfie Guide delivery | Open guide | No immediate hard sell before first value. |
| Selfie Guide day 3/7 | Complete photo challenge | Reinforce the same outcome as the guide. |
| Selfie Guide day 14 | Starter Kit | Only if Starter Kit includes a real next-step workflow. |
| Selfie Guide day 21 | Studio | Position as ongoing implementation after confidence/first result. |
| Starter Kit delivery | Open buyer home | List the 3 steps in order. |
| Starter Kit nurture | Complete 7-day starter | Studio only after action. |
| Brand Strategy setup | Complete questionnaire | Avoid additional offers before setup is done. |
| Brand Strategy delivery | Open strategy | Ask user to write/use the 3 posts. |
| Brand Strategy nurture | Studio or Masterclass | Choose based on whether buyer wants implementation or education. |
| Masterclass delivery | Start with Brand Strategy | Then income module. |
| Blueprint delivery | Open 30-day plan | Avoid wizard language; sell implementation. |
| Studio onboarding | Start weekly workflow | Help member generate, plan, or publish today. |

## Metrics Map

### Acquisition

- Instagram link clicks
- `/ai-prompts` visits
- AI Prompts opt-ins
- AI Prompts access opens
- AI Prompts prompt copies
- AI Prompts -> Prompt Vault clicks
- `/bio` clicks by CTA
- `/selfie-guide` visits
- `/brand-strategy` visits
- email opt-ins

### Activation

- Selfie Guide opened
- first guide section completed
- first photo challenge started/completed
- Brand Strategy setup started/completed
- strategy output viewed
- Starter Kit buyer home viewed
- first preset/resource click
- first Feed Planner plan generated
- first Maya generation

### Revenue

- checkout started by product
- checkout completed by product
- Prompt Vault checkout success
- Prompt Vault access opened
- bundle purchased
- upsell click after deliverable
- first Studio subscription
- annual subscription
- credit pack purchase
- refund/cancel event

### Retention

- return visit within 7 days
- email click after purchase
- Studio weekly action completed
- resource opened by member
- repeat generation
- Feed Planner revisit

### Cleanup Safety

- route traffic before hiding
- email links still pointing to route
- checkout revenue by product
- admin usage visibility
- redirects verified

## Event Naming Suggestions

Use consistent event names where possible:

- `funnel_bio_cta_click`
- `selfie_guide_opened`
- `selfie_guide_first_photo_started`
- `selfie_guide_first_photo_completed`
- `starter_kit_buyer_home_opened`
- `starter_kit_week_one_started`
- `brand_strategy_setup_started`
- `brand_strategy_setup_completed`
- `brand_strategy_output_viewed`
- `masterclass_income_module_started`
- `blueprint_plan_started`
- `blueprint_plan_generated`
- `studio_weekly_workflow_started`
- `studio_first_generation_completed`
- `deliverable_upsell_click`

## Conservative Cleanup Queue

### Phase 1: Hide From Active Marketing

Do this only after confirming no active campaigns depend on the link.

- legacy freebie brand strategy surfaces
- legacy freebie selfie guide surfaces
- old Brand Engine public offer pages
- duplicate upgrade checkout pages
- prompt guide pages that are not connected to Studio/Maya education

### Phase 2: Redirect

Add redirects before deleting.

| Old Surface | Likely Redirect |
| --- | --- |
| old freebie strategy | `/brand-strategy` |
| old freebie selfie guide | `/selfie-guide` |
| Brand Engine public pages | `/brand-strategy` or `/private-shoot` |
| checkout upgrade variants | `/checkout/membership` or `/private-shoot` |
| unused prompt guides | `/studio` or `/maya` depending on context |

### Phase 3: Delete

Delete only after:

- route has redirect
- no active emails point to it
- analytics shows no meaningful revenue/traffic
- tests/smoke flows pass
- admin/revenue reporting still works

## E2E Implementation Checklist

For every product or bundle change:

1. Product copy updated.
2. `lib/products.ts` updated if price/name/bundle changes.
3. `lib/academy-entitlements.ts` updated if access changes.
4. Checkout route creates the correct product.
5. Stripe webhook grants correct access, tags, credits, setup tokens, and emails.
6. Success page points to the right next action.
7. Buyer home or token access page exists.
8. Delivery email links to the buyer home/access page.
9. Nurture sequence matches the new promise.
10. Analytics events exist.
11. Tests cover product mapping, email links, entitlements, and checkout routing.
12. Smoke QA validates landing to checkout and post-purchase access.

## Do Not Ship If

- The landing page promises a bundle that checkout does not fulfill.
- The email promises a deliverable that does not exist.
- The buyer lands on a generic success page with no next step.
- Income copy implies guaranteed earnings.
- The product is renamed in one place but not in product catalog, webhook, emails, and tests.

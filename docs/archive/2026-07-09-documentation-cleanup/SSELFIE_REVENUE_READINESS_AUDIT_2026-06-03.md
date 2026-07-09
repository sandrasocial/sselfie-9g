# SSELFIE Revenue Readiness + Product Inventory Audit

Date: 2026-06-03
Status: repo-truth audit
Scope: products, funnels, checkout, access, email, analytics, Selfie to Brand Shoot readiness

## 1. Executive Summary

SSELFIE now has three different eras represented in the repo:

1. The active AI photoshoot funnel: free AI Prompts -> Prompt Vault.
2. The new core product shell: Selfie to Brand Shoot System.
3. Legacy/protected products: Selfie Guide, Starter Kit, Masterclass, Studio/Maya, Feed Planner/Blueprint, Visibility Suite and mini-products.

Repo truth says Selfie to Brand Shoot is more built than the 2026-06-01 planning docs expected. It has:

- Public route: `/selfie-to-brand-shoot`
- Checkout route: `/checkout/selfie-to-brand-shoot`
- Product key: `selfie_to_brand_shoot_system`
- Expected Stripe env var: `STRIPE_PRICE_SELFIE_TO_BRAND_SHOOT_SYSTEM`
- Webhook fulfillment in `app/api/webhooks/stripe/route.ts`
- Token access route: `/access/selfie-to-brand-shoot/[token]`
- Academy access route: `/academy/access/selfie-to-brand-shoot`
- Delivery email: `lib/email/templates/selfie-to-brand-shoot-delivery.ts`
- Course shell with 5 modules: `components/selfie-to-brand-shoot/course-shell-v1.tsx`
- Prompt Vault included through webhook entitlement and token tags

The main blockers are not basic wiring. The blockers are launch confidence:

- Need live Stripe/env verification for the Selfie to Brand Shoot price ID.
- Need end-to-end purchase smoke in production-like mode.
- Need a Selfie to Brand Shoot buyer activation sequence beyond Day 0 delivery.
- Need module-level progress tracking and access-open events for Selfie to Brand Shoot.
- Need copy cleanup across old nurture paths that still promote Starter Kit/Masterclass as the main next step.
- Need paid-ad-safe recovery copy rewrite. Prompt Vault recovery email is off-voice compared with current Voice Bible.

Ready to sell today with caution:

- Prompt Vault, because checkout, delivery, token access, buyer nurture, recovery, and launch monitor exist.
- Selfie to Brand Shoot can likely be sold softly or to warm traffic after live checkout verification, but it is not ads-ready yet.

Not ready for paid traffic:

- Full Selfie to Brand Shoot launch, because tracking and activation are incomplete.
- Studio/Maya as cold traffic next step, because activation/retention remain known weak points.
- Legacy education ladder as the primary public funnel, because it conflicts with the June 2026 strategic lock-in.

## 2. Product Inventory Table

| Product / offer | Internal key | Stripe price source | Sales route | Checkout route | Access / delivery route | Entitlement / token logic | Email sequence | Status | Risks / notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Free AI Prompts / Free Prompt Pack | `ai-prompts` source/tag, no paid product key | Free | `/ai-prompts` | None | `/ai-prompts/access/[token]` | `freebie_subscribers.access_token`, source/tag `ai-prompts` | Day 2, 5, 7 AI prompts nurture via `lib/email/ai-prompts-email-sequence.ts` | Ready lead magnet | Bridge points mostly to Prompt Vault. No paid entitlement. Needs continued QA on opt-in deliverability. |
| Prompt Vault | `prompt_vault` | `STRIPE_PRICE_PROMPT_VAULT`; expected $27 | `/prompt-vault` | `/checkout/prompt-vault` | `/access/prompt-vault/[token]`, `/academy/access/prompt-vault` | Webhook writes `stripe_payments`, `user_tags`, `academy_entitlements`, `freebie_subscribers` source/tag `prompt-vault-paid` | Delivery, Day 2/5/10 buyer sequence, checkout recovery | Ready to sell | Strongest launch monitor exists. Recovery copy needs rewrite. Nurture gated by `PROMPT_VAULT_NURTURE_ENABLED=true`. |
| Selfie to Brand Shoot System | `selfie_to_brand_shoot_system` | `STRIPE_PRICE_SELFIE_TO_BRAND_SHOOT_SYSTEM`; expected $197 | `/selfie-to-brand-shoot` | `/checkout/selfie-to-brand-shoot` | `/access/selfie-to-brand-shoot/[token]`, `/academy/access/selfie-to-brand-shoot` | Webhook writes `stripe_payments`, `user_tags`, `academy_entitlements` for system and `prompt_vault`; `freebie_subscribers` tag/source `selfie-to-brand-shoot-paid` | Day 0 delivery only | Partially ready / warm sell after smoke | Product shell is real and complete at module level, but no Day 1/3/5 activation, no module progress tracking, and live Stripe/env unknown. |
| Selfie Guide free / paid | `selfie_guide`, `selfie_guide_bundle` | `STRIPE_PRICE_SELFIE_GUIDE`, `STRIPE_PRICE_SELFIE_GUIDE_BUNDLE`; expected $17/$27 | `/selfie-guide` | `/checkout/selfie-guide` | `/selfie-guide/access/[token]`, `/academy/access/selfie-guide` | Webhook uses `ensurePaidSelfieGuideSubscriber`, `subscriptions`, `upsertPurchaseEntitlement`; free opt-ins use `freebie_subscribers` | Freebie guide Day 1/3/5/8/14; paid guide Day 0/3/7/14/21 | Support product | Should be reframed as source selfie support for AI, not front-door ladder. |
| Starter Kit | `starter_kit` | `STRIPE_PRICE_STARTER_KIT`; expected $37 | `/starter-kit` | `/checkout/starter-kit` | `/access/starter-kit/[token]`, `/academy/access/starter-kit` | Webhook writes `stripe_payments`, `subscriptions`, `user_tags`, entitlement, subscriber token | Day 0/1/3/5/7/10/14 | Built but secondary | Repo docs say weak front-door performance. Useful assets belong inside Selfie to Brand Shoot as support/bonus. |
| Branded by SSELFIE / Masterclass | Commercial: `masterclass`; course: `branded_by_sselfie`; bonus: `editing_masterclass` | `STRIPE_PRICE_MASTERCLASS`; expected $147 | `/masterclass` | `/checkout/masterclass` | `/academy/access/masterclass`, course viewer | Webhook grants `masterclass` and `brand_strategy_pack`; entitlement aliases unlock `branded_by_sselfie`, `editing_masterclass`, `brand_strategy_pack` | Day 0/2/5/7/10 | Built but legacy/core support | 14 Branded lessons found vs 29 declared. Useful lessons should be bundled into Selfie to Brand Shoot; not main public identity. |
| Editing Masterclass | `editing_masterclass` | `STRIPE_PRICE_EDITING_MASTERCLASS` for legacy academy product | Academy course | Legacy academy checkout only | Academy course and Starter Kit embed | Academy mini-product/catalog; included via `masterclass` alias | Academy product delivery if bought standalone | Legacy/support | Good bonus/support asset. Resource links are not fully specific per audit. |
| Studio membership | `sselfie_studio_membership`, annual variant | `STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID`, `STRIPE_SSELFIE_STUDIO_ANNUAL_PRICE_ID`; expected monthly $97 | `/join/studio`, `/why-studio`, `/studio` | `/checkout/membership` | `/studio`, `/maya`, Studio shell | Stripe subscription rows; invoice success grants monthly credits | Onboarding Day 0/2/7, first-generation nudges, win-back | Protect existing users | Not current cold traffic next step. Activation/retention known weak. |
| Maya | No standalone paid key; access via Studio/subscriptions/credits | Indirect through membership/credits | `/maya`, `/studio?tab=maya` | Membership / credits | Maya tabs and APIs | Credits and membership access control | Studio onboarding/win-back | Protected workspace | Future premium layer, not current core promise. |
| Feed Planner / Blueprint | `paid_blueprint` | `STRIPE_PAID_BLUEPRINT_PRICE_ID`; known in CLAUDE.md: `price_1SnlJEEVJvME7vkw1thdr7WK` | `/blueprint`, `/paid-blueprint` | `/checkout/blueprint` | `/feed-planner`, `/feed/[feedId]` | Webhook grants credits/subscription and `blueprint_subscribers` paid fields | Paid Blueprint delivery and Day 1/3/7 follow-up | Legacy/protected | Must not delete. Planning is not front-door promise. |
| Paid Blueprint / 30-day planner | `paid_blueprint` | Same as above | `/paid-blueprint` feature-flagged | `/checkout/blueprint` | `/feed-planner` | Same as Feed Planner | Same | Legacy/support | Keep for existing buyers. Reposition copy later only. |
| Brand Strategy Pack | `brand_strategy_pack` | `STRIPE_PRICE_BRAND_STRATEGY_PACK`; expected $19 | `/brand-strategy` | `/checkout/brand-strategy-pack` or archived redirect paths | `/brand-strategy/setup/[token]`, `/strategy/[token]`, `/academy/access/brand-strategy` | Webhook writes `subscriptions`, `stripe_payments`, entitlement; setup token route exists | Paid delivery/setup notification; old nurture strategy N1-N5 | Archived/support | Product registry marks archived. Keep tokens working. |
| Visibility Suite | `visibility_suite` | `STRIPE_PRICE_VISIBILITY_SUITE_LAUNCH`; archived | `/visibility-suite` | `/checkout/visibility-suite` | `/academy/access/visibility-suite` | Academy entitlement bundle aliases to mini-products | Academy product delivery | Legacy only | Preserve access only. Do not promote as current ladder. |
| Academy mini-products | `what_to_say`, `show_up`, `get_paid`, `concept_cards_pack`, `caption_sprint`, `feed_reset_9grid`, `ai_photo_refresh`, `ai_photo_prompts` | Various `STRIPE_PRICE_*` constants/envs | `/what-to-say`, `/show-up`, `/get-paid`, `/ai-photo-refresh`, `/concept-cards` etc. | `/checkout/academy-product/[productId]` or `/api/academy/checkout` | `/academy/access/[productSlug]` and course/product viewers | `academy_entitlements`, product registry | Academy product delivery | Legacy/hidden | Keep for existing buyers; do not make public core offer. |
| Presets | No standalone current key | Included in Starter Kit and resources | Starter Kit pages | Included in Starter Kit | Vercel Blob download links | Not separate entitlement | Starter Kit delivery | Bonus/support | Good bonus for Selfie to Brand Shoot; not core promise. |
| Workbooks / PDFs | Various product resources | Included | Academy and product homes | Included | Academy lesson resources, Starter Kit, Masterclass | Via product entitlement | Product emails | Bonus/support | Strong bundling material; some Masterclass PDFs still pending from Drive auth. |
| Credit packs | `credits_topup_10`, `credits_topup_100`, `credits_topup_200`; product type `credit_topup` | Dynamic Stripe `price_data`, not price IDs | In-app credit modal | `startCreditCheckoutSession` / disabled `/api/stripe/create-checkout-session` | Credits balance in app | Webhook `credit_topup` grants credits in `credit_transactions` | Credit confirmation | Ready for existing users | Expansion only. Not front-door. |
| VIP / 1:1 / inquiry | Inquiry route, no product key | Manual/offline | `/work-with-me`, `/private-shoot` | None in repo | Manual follow-up | `app/api/inquiry/submit/route.ts` syncs Resend and sends admin + confirmation emails | Inquiry admin/confirmation | Partially ready | No automated VIP follow-up sequence, no checkout, manual handling required. |
| Private AI Brand OS / Brand Engine | Brand Engine compatibility product types | Legacy/compatibility | Retired routes | Legacy payment links | Application/payment compatibility | Webhook compatibility only | Admin/manual | Do not promote | CLAUDE marks Brand Engine routes safe to delete, but webhook compatibility remains. |

## 3. Funnel Map

| Funnel path | Routes/files | Current sell / message | Current next step | Safe for paid traffic? | Fix before launch |
| --- | --- | --- | --- | --- | --- |
| Free Prompt Pack opt-in | `/ai-prompts`, `app/api/ai-prompts/subscribe/route.ts` | Free AI photoshoot prompts from one selfie | Token access page and Prompt Vault bridge | Mostly yes | QA opt-in, confirm delivery email, ensure all CTAs say Prompt Vault or Selfie to Brand Shoot, not Starter Kit. |
| Free Prompt Pack access | `/ai-prompts/access/[token]` | Preview prompts with examples and copy buttons | After-copy CTA to Prompt Vault checkout | Yes for organic | Track all access opens and copies. Add stronger Selfie to Brand Shoot bridge after Vault if approved. |
| Free -> Prompt Vault bridge | `buildPromptVaultFreebieCheckoutHref`, `TrackedLink`, `CopyButton` after-copy CTA | Full shoot collections | `/checkout/prompt-vault` | Yes | Keep attribution params intact. |
| Prompt Vault sales | `/prompt-vault` | "Selfie to Brand Shoot Vault", full collections/future drops | `/checkout/prompt-vault` | Yes with recovery copy fix | Ensure copy leads with transformation, not prompt pack. |
| Prompt Vault checkout | `/checkout/prompt-vault` -> `/checkout` embedded Stripe | $27 one-time Vault | Success -> token/access | Yes after smoke | Verify production env `STRIPE_PRICE_PROMPT_VAULT` and webhooks. |
| Prompt Vault delivery | `/access/prompt-vault/[token]`, `/academy/access/prompt-vault` | Full prompt collection access | Prompt usage, system upgrade click event exists | Yes | Add clearer bridge to Selfie to Brand Shoot in access page and buyer emails. |
| Prompt Vault -> Selfie to Brand Shoot | Event allowed: `prompt_vault_system_upgrade_click`; product exists | Upgrade to guided $197 system | `/selfie-to-brand-shoot` or checkout | Not fully | Need explicit page/email bridge and tracking dashboard for system conversion. |
| Selfie to Brand Shoot sales | `/selfie-to-brand-shoot` | Guided path, Vault included | `/checkout/selfie-to-brand-shoot` | Warm traffic only | Verify price/env, add proof/testimonials, run responsive/checkout smoke. |
| Selfie to Brand Shoot checkout | `/checkout/selfie-to-brand-shoot` -> `/checkout` | $197 one-time system | `/checkout/success` then access | Unknown until env verified | Live Stripe price must be checked. |
| Selfie to Brand Shoot buyer path | `/access/selfie-to-brand-shoot/[token]`, `/academy/access/selfie-to-brand-shoot` | 5-module course shell | Vault, modules, Maya prompt concierge | Partially | Add activation sequence, module progress, access event logging, QA screenshots. |
| Upsell/downsell pages | No dedicated current upsell/downsell pages found for new ladder | N/A | N/A | No | Need minimal bridge only; do not invent offers. |
| Abandoned checkout | Prompt Vault only: `/api/cron/prompt-vault-checkout-recovery` | Recovery email to Prompt Vault | `/checkout/prompt-vault` | No until copy rewrite | No Selfie to Brand Shoot recovery. Recovery email violates current no-emoji/no-hype guidance. |
| Thank-you / success | `/checkout/success` | Generic success with product session | Product-specific redirect handling | Needs smoke | Confirm Selfie to Brand Shoot success resolves token/access. |
| VIP inquiry | `/work-with-me`, `/private-shoot`, `/api/inquiry/submit` | Private sprint/inquiry | Manual Sandra/admin follow-up | Organic only | Add clear current Selfie to Brand Shoot/VIP positioning and follow-up template if launching premium. |
| Studio/Maya upgrade | `/join/studio`, `/checkout/membership`, in-app upsells | Studio/Maya membership | `/studio`, credits | Existing users only | Do not push cold prompt traffic here until activation fixed. |
| Credit purchase | In-app credit modal, `startCreditCheckoutSession` | Extra credits | App credits | Existing users only | Keep as expansion, not launch funnel. |

## 4. Payment / Access Map

Core payment files:

- Product catalog: `lib/products.ts`
- Guest checkout: `app/actions/landing-checkout.ts`
- Auth checkout: `app/actions/stripe.ts`
- Embedded checkout UI: `app/checkout/page.tsx`
- Stripe webhook: `app/api/webhooks/stripe/route.ts`
- Price validation: `lib/stripe/validate-pricing-config.ts`
- Checkout attribution: `lib/revenue-engine/checkout-attribution.ts`
- Academy entitlements: `lib/academy-entitlements.ts`

Important finding:

- `app/actions/landing-checkout.ts` supports modern guest checkout products including Prompt Vault and Selfie to Brand Shoot.
- `app/actions/stripe.ts` authenticated `startProductCheckoutSession` only resolves older env vars and does not resolve `starter_kit`, `masterclass`, `prompt_vault`, or `selfie_to_brand_shoot_system`. Current public product checkout routes use `createLandingCheckoutSession`, so this is not necessarily a launch blocker, but it is a risk for in-app/authenticated purchase buttons.

| Product type | Payment event | Access granted | Buyer receives | Automatic? | Risk |
| --- | --- | --- | --- | --- | --- |
| `prompt_vault` | `checkout.session.completed` paid | `academy_entitlements.prompt_vault`; `freebie_subscribers` token/source/tag | Delivery email with `/access/prompt-vault/[token]` and password setup when needed | Yes | Nurture gated by env. Recovery copy issue. |
| `selfie_to_brand_shoot_system` | `checkout.session.completed` paid | `academy_entitlements.selfie_to_brand_shoot_system` and `prompt_vault`; `freebie_subscribers` token/source/tag | Delivery email with `/academy/access/selfie-to-brand-shoot` and Vault token URL | Yes | Price env unknown; no activation sequence; token page logs as `academy_home_opened` not system-specific access event. |
| `starter_kit` | `checkout.session.completed` paid | `subscriptions.starter_kit`, `academy_entitlements.starter_kit`, `freebie_subscribers` token | Day 0 delivery email | Yes | Secondary product only. |
| `masterclass` | `checkout.session.completed` paid | `subscriptions.masterclass`, `academy_entitlements.masterclass`, `brand_strategy_pack` | Day 0 delivery email and Academy access | Yes | Course row mismatch and old positioning. |
| `selfie_guide` / bundle | `checkout.session.completed` paid | `subscriptions`, `academy_entitlements`, token | Paid guide delivery email | Yes | Support role only. |
| `sselfie_studio_membership` | `checkout.session.completed` creates subscription; `invoice.payment_succeeded` grants credits | `subscriptions` active; monthly credits | Studio welcome/onboarding | Yes | Credits granted only on invoice success. Correct, but needs live webhook health. |
| `credit_topup` | `checkout.session.completed` paid | `credit_transactions`, balance update | Credit confirmation | Yes | In-app only. |
| `paid_blueprint` | `checkout.session.completed` paid | `subscriptions.paid_blueprint`, credits, `blueprint_subscribers` paid fields | Paid Blueprint delivery email | Yes | Legacy but high dependency. |
| `brand_strategy_pack` | `checkout.session.completed` paid | `subscriptions`, entitlement, setup token | Setup notification email | Yes | Archived, keep only. |
| `visibility_suite` / `academy_mini_product` | `checkout.session.completed` paid | Academy entitlements | Academy delivery | Yes | Legacy/protected. |

Payment risks before marketing:

- UNKNOWN: live value and active status of `STRIPE_PRICE_SELFIE_TO_BRAND_SHOOT_SYSTEM`.
- UNKNOWN: whether production webhook has processed a successful Selfie to Brand Shoot purchase.
- Authenticated checkout helper is stale for newer one-time products.
- `STRIPE_PRICE_STARTER_KIT` and `STRIPE_PRICE_MASTERCLASS` are used in checkout but not included in `EXPECTED_CONFIGS` in `lib/stripe/validate-pricing-config.ts`.
- Selfie to Brand Shoot expected config exists, which is good, but the report did not verify live Stripe because no live credentials were queried.

## 5. Email / Automation Map

| Sequence/template | Files | Trigger | Product | Current messaging fit | Active / gated | Needs rewrite? |
| --- | --- | --- | --- | --- | --- | --- |
| Free AI Prompts delivery | `lib/email/templates/ai-prompts-day0-delivery.ts` | Opt-in route | Free AI Prompts | Matches AI prompt funnel | Active via subscribe route | Minor review only |
| Free AI Prompts nurture | `lib/email/ai-prompts-email-sequence.ts`; day 2/5/7 templates | `nurture-sequence` | Free -> Prompt Vault | Mostly matches current positioning | Active cron | Good, but add Selfie to Brand Shoot bridge after Vault decision |
| Prompt Vault delivery | `lib/email/templates/prompt-vault-delivery.ts` | Stripe webhook | Prompt Vault | Good | Active | Minor review |
| Prompt Vault buyer activation | `lib/email/prompt-vault-email-sequence.ts`; `prompt-vault-buyer-sequence.ts` | `nurture-sequence` when `PROMPT_VAULT_NURTURE_ENABLED=true` | Prompt Vault | Good for first result, fix, next shoot | Gated | Add system upsell touch |
| Prompt Vault checkout recovery | `lib/email/templates/prompt-vault-checkout-recovery.ts`; `/api/cron/prompt-vault-checkout-recovery` | Hourly cron when `PROMPT_VAULT_CHECKOUT_RECOVERY_ENABLED=true` | Prompt Vault | Off-voice vs Voice Bible | Gated | Yes, critical before ads |
| Selfie to Brand Shoot delivery | `lib/email/templates/selfie-to-brand-shoot-delivery.ts` | Stripe webhook | Selfie to Brand Shoot | Good Day 0 delivery | Active if purchase/webhook works | Needs activation sequence |
| Selfie to Brand Shoot activation | Not found | N/A | Selfie to Brand Shoot | Missing | Missing | Critical |
| Starter Kit sequence | `lib/email/starter-kit-email-sequence.ts`; templates Day 0/1/3/5/7/10/14 | `nurture-sequence` | Starter Kit | Old ladder to Masterclass | Active | Do not promote to AI traffic |
| Masterclass sequence | `lib/email/masterclass-email-sequence.ts`; Day 0/2/5/7/10 | `nurture-sequence` | Masterclass | Old education/VIP ladder | Active | Legacy-safe, not launch core |
| Selfie Guide paid/free | `lib/email/selfie-guide-email-sequence.ts`, `freebie-guide-email-sequence.ts` | `nurture-sequence` | Selfie Guide | Old ladder to Starter Kit/Masterclass | Active | Reframe for AI-ready selfie if used |
| Studio onboarding | `app/api/cron/onboarding-sequence/route.ts`; onboarding templates | Daily cron | Studio | Studio/Maya activation | Active | Keep for members |
| Win-back | `/api/cron/win-back-sequence` | Daily cron | Studio | Retention | Active | Not core launch |
| Blueprint follow-up | `/api/cron/blueprint-followup-sequence` | Not in `vercel.json` currently | Feed Planner/Blueprint | Legacy planner activation | Route exists; cron schedule absent | Keep protected |
| VIP inquiry emails | `app/api/inquiry/submit/route.ts` inline admin + confirmation | Form submit | Work With Me | Manual route | Active route | Add VIP follow-up if premium push |
| Testimonial/proof request | Search found no dedicated product proof request sequence | N/A | All | Missing | Missing | Needed before proof-led ads |

Specific requested checks:

- Free Prompt Pack nurture: YES, AI Prompts Day 2/5/7 exists.
- Prompt Vault buyer activation: YES, Day 2/5/10 exists, gated.
- Prompt Vault to Selfie to Brand Shoot upsell: PARTIAL. Event name exists and product exists, but no dedicated email bridge found.
- Selfie to Brand Shoot buyer onboarding: PARTIAL. Day 0 delivery only.
- Day 0 / Day 1 / Day 3 / Day 5 activation emails for Selfie to Brand Shoot: Day 0 only. Day 1/3/5 missing.
- Abandoned checkout recovery: Prompt Vault only. Selfie to Brand Shoot missing.
- VIP inquiry follow-up: Confirmation/admin emails only. No nurture.
- Testimonial/proof request email: Not found.

## 6. Analytics / Tracking Map

Core tracking tables and files:

- `analytics_events`: created by `lib/analytics/schema.ts`; written by `lib/analytics/events.ts` and `/api/analytics/event`.
- `checkout_attribution`: created/maintained by `lib/revenue-engine/checkout-attribution.ts`.
- `stripe_payments`: populated by Stripe webhook for revenue tracking.
- `email_logs`: send/open/click/conversion tracking through `lib/email/send-email.ts` and `app/api/webhooks/resend/route.ts`.
- `freebie_subscribers`: opt-in, access token, source/tag, guide progress, delivery flags.
- `subscriptions`: membership and one-time access compatibility.
- `credit_transactions`: credit grants/spend/purchases.
- `ai_images`, `generated_images`, `generation_trackers`: Maya/generation/gallery operational data.
- `user_lesson_notes`: Academy lesson notes/progress-like companion data.
- `maya_personal_memory`: Selfie to Brand Shoot visual code storage.

| Area | What is tracked | Event/table | Reliability for decisions | Missing |
| --- | --- | --- | --- | --- |
| Page views | Public offer views, Prompt Vault landing, Selfie to Brand Shoot landing | `analytics_events` events like `prompt_vault_landing_view`, `selfie_to_brand_shoot_landing_view` | Medium | Global pageview consistency unknown; server-side landing logs can miss if route render fails silently. |
| Opt-ins | AI prompts, selfie guide/freebie subscribers | `freebie_subscribers`, events `ai_prompts_subscribed`, `selfie_guide_opt_in_*` | Medium-high | Need dashboard for Selfie to Brand Shoot funnel specifically. |
| Prompt opens/views | Prompt Vault prompt viewed | `prompt_vault_prompt_viewed` | High for Vault | Free AI prompt prompt views less explicit; no system module view tracking. |
| Prompt copies | AI prompts and Prompt Vault copy events | `ai_prompts_prompt_copied`, `prompt_vault_prompt_copied` | High if client scripts fire | Need system prompt pack copy events for Maya concierge. |
| Checkout starts | Embedded checkout page `trackCheckoutStart`; checkout attribution rows | `analytics_events.checkout_start`, `checkout_attribution.status=started` | High for Prompt Vault; medium for others | Selfie to Brand Shoot dashboard missing. |
| Purchases | Stripe webhook success events and `stripe_payments` | `prompt_vault_checkout_success`, `selfie_to_brand_shoot_checkout_success`, `stripe_payments` | High if webhook healthy | Live env verification. |
| Abandoned checkout | Prompt Vault only | `checkout_attribution`, recovery cron | Medium-high for Prompt Vault | Selfie to Brand Shoot recovery missing. |
| Email opens/clicks | Resend webhook updates | `email_logs.opened_at`, `clicked_at`, `converted` | Medium | Depends on webhook and client privacy. |
| Product access opens | Prompt Vault has access events; Selfie to Brand Shoot event is allowed but code logs `academy_home_opened` in access routes | `analytics_events` | Medium for Vault, weak for System | Use `selfie_to_brand_shoot_access_opened` explicitly. |
| Module progress | Academy lessons notes; Selfie Guide progress; no system module progress | `user_lesson_notes`, `freebie_subscribers` progress columns | Weak for System | Add Selfie to Brand Shoot module started/completed events. |
| Maya usage | Chat/generation routes, tool events, credit usage, generated assets | `maya_*`, `analytics_events`, `credit_transactions`, `ai_images` | Medium-high operationally | Product-level attribution from Selfie to Brand Shoot to Maya usage missing. |
| Image generation | Generation routes, `ai_images`, `generated_images`, `generation_trackers`, credits | DB operational tables | High for operations | Tie to launch funnel cohorts. |
| Credit purchases | `credit_topup`, credit transactions, stripe payments | `credit_transactions`, `stripe_payments` | High | Not relevant to cold launch. |
| Gallery saves | `ai_images`, gallery APIs | DB | Medium | Need event-level save/open metrics if business decision needs them. |
| Studio usage | Studio APIs, admin metrics, activation reports | mixed DB + analytics | Medium | Known activation risk. |
| Feed Planner usage | Feed Planner tables/routes, Blueprint follow-up | feed tables, analytics where present | Medium | Not part of current launch promise. |

Minimum viable tracking before ads:

1. Selfie to Brand Shoot access opened event.
2. Module 1/2/3/4/5 started and completed events.
3. Visual code saved event.
4. Maya prompt pack built event.
5. Prompt pack copied event.
6. Vault included access opened from System buyer.
7. Checkout started/completed dashboard for Selfie to Brand Shoot.
8. Email Day 0/1/3/5 sent/open/click/conversion dashboard.

## 7. Selfie to Brand Shoot Readiness

Routes and files:

- Public sales: `/selfie-to-brand-shoot`, `app/selfie-to-brand-shoot/page.tsx`
- Checkout: `/checkout/selfie-to-brand-shoot`, `app/checkout/selfie-to-brand-shoot/page.tsx`
- Token access: `/access/selfie-to-brand-shoot/[token]`
- Academy access: `/academy/access/selfie-to-brand-shoot`
- Buyer shell: `components/selfie-to-brand-shoot/course-shell-v1.tsx`
- Interactive builders: `visual-consistency-code-builder.tsx`, `maya-prompt-concierge.tsx`
- APIs: `/api/selfie-to-brand-shoot/visual-code`, `/api/selfie-to-brand-shoot/prompt-pack`
- Images: `public/images/selfie-to-brand-shoot/*`

| Module | Repo status | What exists | What is missing / risk |
| --- | --- | --- | --- |
| Module 1: Start With One Selfie | Mostly complete | Good/okay/bad source selfie examples, checklist, decision tool, troubleshooting | Status label says "In progress" in module list. Needs final copy/design QA and real source example approval if desired. |
| Module 2: Choose Your Visual World | Complete V1 | Brand world cards, visual consistency code, before/after scattered vs signature grid, save to Maya memory | Needs final Sandra taste approval and possible downloadable selector. |
| Module 3: Create Your First AI Brand Shoot | Complete V1 / interactive | Starter prompts, fix prompts, three-image starter shoot, Maya prompt concierge using AI SDK with fallback | Needs QA of authenticated route/API access and cost guardrails. Needs prompt copy tracking. |
| Module 4: Pick The Images That Still Look Like You | Complete V1 | Keep/Fix/Delete rubric, likeness and brand checks, Maya review brief | Needs downloadable rubric/PDF and examples QA. |
| Module 5: Turn Them Into Content | Complete V1 | Profile/reel/story/offer/about use cases, mini 3x3 planner, 7-day plan, story sequence, caption hooks | Needs copy/design QA and possible downloadable 7-day plan. |
| Bonuses | Partial | Prompt Vault included, Starter Kit/Masterclass assets available elsewhere | No clean bonus section map in the System shell. |

Sellable as $197 today?

- Warm sell: YES, after live checkout smoke. The course shell is real and covers the promised transformation.
- Ads-ready: NO. Buyer activation, tracking, proof, recovery, and QA are not complete enough for paid traffic.

Must happen before launch-ready:

1. Verify `STRIPE_PRICE_SELFIE_TO_BRAND_SHOOT_SYSTEM` in production.
2. Run full purchase -> webhook -> email -> password setup/token -> Academy access -> Vault access smoke.
3. Add Day 1/3/5 activation emails.
4. Add system-specific analytics events and admin dashboard.
5. Final visual/copy QA across mobile and desktop.
6. Add proof/testimonial capture path.
7. Decide whether downloadable PDFs/checklists are required for promise clarity.

## 8. Asset / Bundle Map

| Asset | Belongs where | Reason |
| --- | --- | --- |
| Prompt Vault collections | Core product | This is the mechanism for the AI brand shoot. |
| Free AI prompt previews | Front door | Best demand capture and preview. |
| Source selfie checklist | Core product Module 1 | Already built in System shell. |
| Selfie Guide | Core support / bonus | Reframe as "better source selfie = better AI result." |
| Starter Kit posing guide | Bonus/support | Useful input-photo guidance, not main offer. |
| Starter Kit presets | Bonus | Useful polish after result; not the promise. |
| Starter Kit captions/content PDFs | Module 5 support / bonus | Use only where tied to generated images. |
| Branded by SSELFIE visual aesthetic lessons | Core support | Strong Module 2 asset for aesthetic certainty. |
| Branded by SSELFIE content lessons | Module 5 support | Useful for turning images into content. |
| Editing Masterclass | Bonus/support | Helps refine outputs but should not bloat core. |
| Brand Strategy Pack | Optional bonus/support | Useful if framed as visual direction, not generic strategy. |
| Feed Planner | Membership/future recurring or legacy support | Planning is not front-door promise; keep for existing buyers. |
| Maya prompt concierge | Core/premium layer | Already built into Module 3; needs QA and tracking. |
| Gallery features | Membership/future recurring | Good continuity layer after system buyer creates images. |
| Credit/generation features | Membership/future recurring | Not needed for the ChatGPT-based core product. |
| Visibility Suite mini-products | Legacy only | Do not promote publicly for this launch. |
| Blueprint/paid Blueprint | Legacy/protected support | Keep access, do not lead with planning. |
| VIP/private shoot | Premium support | Manual cash/proof layer. |

Should stop being publicly promoted as main identities:

- Starter Kit as the main next step from AI prompts.
- Masterclass / Branded by SSELFIE as separate lead identity.
- Feed Planner / Blueprint as front-door promise.
- Studio/Maya cold traffic upgrade until activation improves.
- Visibility Suite / mini-products.

## 9. Go-To-Market Readiness Scores

| Area | Score | Why | To reach 90+ | Can launch now? | Paid ads safe? |
| --- | ---: | --- | --- | --- | --- |
| Product readiness | 72 | Prompt Vault strong; Selfie to Brand Shoot 5-module shell exists | Smoke, proof, downloadable support, final QA | Warm yes | Not yet |
| Checkout/payment readiness | 78 | Product IDs/routes/webhook exist | Verify live env/Stripe and authenticated checkout gap | Warm yes after smoke | Not yet |
| Delivery/access readiness | 80 | Token and Academy access exist; Vault included | Access event fix, password/setup smoke | Yes after smoke | Not alone |
| Email readiness | 48 | Prompt Vault decent; System only Day 0 | System Day 1/3/5, recovery rewrite, upsell bridge | Soft launch only | No |
| Tracking readiness | 56 | Vault dashboard strong; System weak | System dashboard and module events | Organic only | No |
| Visual/design readiness | 74 | Shell has rich visuals and assets | Sandra approval, responsive QA, image provenance check | Warm yes | Not yet |
| Proof/case study readiness | 35 | Product examples exist, but proof/testimonial path missing | Proof capture, testimonials, before/after case study | Manual only | No |
| Ads readiness | 38 | Funnel not fully instrumented; recovery/copy issues | Tracking, recovery, proof, smoke, creative alignment | No | No |
| Organic content readiness | 76 | AI prompts and visual transformation route match current demand | Clear CTA ladder and manual DM flow | Yes | N/A |
| Repurposing readiness | 70 | Module 5 and assets create content angles | Founder-content workflow and proof capture | Yes | N/A |
| Upsell readiness | 45 | System product exists but bridge from Vault is partial | Dedicated Vault -> System email/page CTA and tracking | Manual/warm only | No |
| Premium/VIP readiness | 50 | Inquiry route works | Follow-up, offer scope, testimonial/proof ops | Manual yes | No |

## 10. Critical Blockers

Critical before launch:

1. Verify live Stripe env and active price for `STRIPE_PRICE_SELFIE_TO_BRAND_SHOOT_SYSTEM`.
2. Run full Selfie to Brand Shoot purchase/access smoke in production-like environment.
3. Add Selfie to Brand Shoot buyer activation emails for Day 1, Day 3, and Day 5.
4. Add explicit `selfie_to_brand_shoot_access_opened` and module-progress tracking.
5. Rewrite Prompt Vault checkout recovery email to match `docs/brand/VOICE_BIBLE.md`.
6. Confirm delivery email links land correctly for new account, existing account, token access, and Vault access.
7. Create or expose a Selfie to Brand Shoot launch monitor like `/admin/prompt-vault`.

## 11. Important Fixes

Important before ads:

1. Add Prompt Vault -> Selfie to Brand Shoot bridge email or in-product CTA with tracking.
2. Add Selfie to Brand Shoot abandoned checkout recovery.
3. Add proof/testimonial request email or manual workflow.
4. Final mobile/desktop QA for `/selfie-to-brand-shoot`, `/checkout`, `/access/selfie-to-brand-shoot/[token]`, `/academy/access/selfie-to-brand-shoot`.
5. Update old Freebie/Selfie Guide/Starter Kit email paths so AI prompt audience does not drift to the old ladder.
6. Add `STRIPE_PRICE_STARTER_KIT` and `STRIPE_PRICE_MASTERCLASS` to Stripe validation if those remain sold.
7. Fix stale authenticated `startProductCheckoutSession` env mapping if in-app upsells will sell newer products.
8. Add module/downloadable support for System checklists if Sandra wants a stronger perceived $197 value.

## 12. Can-Wait Items

- Full community or recurring membership archive.
- Feed Planner integration into Selfie to Brand Shoot.
- New AI generator inside the System.
- Full Academy redesign.
- Full paid Blueprint rename.
- Preset editor.
- Advanced attribution modeling beyond the current checkout attribution table.
- Referral/affiliate program for this launch.

## 13. Do-Not-Touch List

Do not rename/delete without a dedicated migration:

- `paid_blueprint`
- `/feed-planner`, `app/api/feed-planner/*`, `app/api/feed/*`, `components/feed-planner/*`, `lib/feed-planner/*`
- `lib/maya/feed-generation-handler.ts`
- Existing `subscriptions` product types
- Existing `academy_entitlements` product IDs and aliases
- Prompt Vault token access
- Selfie Guide token access
- Starter Kit token access
- Masterclass/Brand Strategy entitlements
- Studio membership checkout/subscription logic
- Maya member surfaces
- Stripe webhook compatibility branches for legacy products
- Brand Strategy token routes
- Visibility Suite/Academy mini-product legacy access

## 14. Final Repo-Based Recommendation

1. What can be sold today:
   - Prompt Vault can be sold now, especially organic and email, after recovery copy is paused or rewritten.
   - Selfie to Brand Shoot can be sold manually/warm after a live checkout/access smoke.

2. What can be sold after small fixes:
   - Selfie to Brand Shoot System after Stripe/env verification, end-to-end smoke, Day 1/3/5 activation emails, and access/module tracking.
   - VIP/private work after Sandra manually confirms the scope and follow-up process.

3. What should not be promoted:
   - Starter Kit as primary next step from AI prompts.
   - Masterclass/Branded by SSELFIE as a separate main identity.
   - Studio/Maya to cold prompt traffic.
   - Feed Planner/Blueprint as the front-door promise.
   - Visibility Suite and mini-products.

4. What should be bundled into Selfie to Brand Shoot:
   - Prompt Vault as core engine.
   - Selfie Guide/source selfie guidance as Module 1 support.
   - Starter Kit posing/presets/caption assets as bonuses/support.
   - Masterclass visual identity/content lessons as Module 2 and 5 support.
   - Editing Masterclass as bonus/support.

5. Simplest launch funnel:
   - Instagram/TikTok/ManyChat/email -> `/ai-prompts`
   - Free access -> `/prompt-vault`
   - Prompt Vault buyer/access/nurture -> `/selfie-to-brand-shoot`
   - Selfie to Brand Shoot buyer -> `/academy/access/selfie-to-brand-shoot`
   - Manual VIP invitation only for strong buyers/replies.

6. Needs completion before ads:
   - Selfie to Brand Shoot smoke, activation emails, analytics dashboard, recovery flow, proof capture, and recovery copy rewrite.

7. Sandra should manually handle:
   - Final price approval.
   - Proof/testimonial selection.
   - VIP offer scope.
   - Final visual taste approval.
   - Any outward broadcast/ad copy approval.

8. AI agents/automation should handle:
   - Funnel QA smoke.
   - Launch dashboard/reporting.
   - Email sequence scheduling and idempotency.
   - Recovery monitoring.
   - Prompt usage demand reports.

9. Codex should build next:
   - Tracking, activation, smoke, and launch monitor for Selfie to Brand Shoot.

10. ChatGPT should decide after reviewing this report:
   - Final offer ladder emphasis.
   - Whether Selfie to Brand Shoot launches at $197 or waits for more proof.
   - Exact Prompt Vault -> System bridge angle.
   - Paid ads readiness threshold and first campaign message.

## 15. Next 10 Codex Tasks Ranked By Business Impact

1. Verify and smoke Selfie to Brand Shoot checkout/access end-to-end.
2. Build Selfie to Brand Shoot launch monitor mirroring `/admin/prompt-vault`.
3. Add Selfie to Brand Shoot access/module/progress/prompt-pack tracking events.
4. Add Selfie to Brand Shoot Day 1/3/5 activation emails to `nurture-sequence`.
5. Rewrite Prompt Vault checkout recovery email to current Voice Bible.
6. Add Prompt Vault -> Selfie to Brand Shoot bridge CTA and tracking in Vault access and buyer sequence.
7. Add Selfie to Brand Shoot abandoned checkout recovery.
8. Patch authenticated `startProductCheckoutSession` so newer products resolve correct Stripe env vars.
9. Add proof/testimonial request workflow for System buyers.
10. Run mobile/desktop Playwright QA screenshots for `/selfie-to-brand-shoot`, checkout, token access, Academy access, and Vault included access.

## Unknowns Requiring Live Data

- Actual live Stripe price IDs for all env-based products except the Blueprint price ID documented in `CLAUDE.md`.
- Whether `STRIPE_PRICE_SELFIE_TO_BRAND_SHOOT_SYSTEM` is set in Vercel production.
- Whether any Selfie to Brand Shoot purchases have processed successfully in production.
- Current Resend segment IDs and whether `PROMPT_VAULT_NURTURE_ENABLED` / `PROMPT_VAULT_CHECKOUT_RECOVERY_ENABLED` are enabled.
- Actual 7/14/30-day conversion metrics from production tables.
- Whether all new Selfie to Brand Shoot images are approved by Sandra for public/product use.

# SSELFIE Canonical Product Map
*Last updated: 2026-05-13 — Single source of truth for all products*

> **Rule:** If a product is not in this map, it should not be sold or referenced in the UI.
> Before adding a new product to Stripe or the codebase, add it here first.

---

## Current buyer path (Instagram → Studio)

```
Instagram selfie tutorial
  → Selfie Starter Kit / presets        ($37)   ← entry
  → Selfie Branding Masterclass          ($147)  ← bridge
  → What To Say / Show Up / Get Paid    (€47–€97 each, or €97 bundle) ← core
  → SSELFIE Studio                       (€97/mo) ← continuity
```

---

## Active Products

### Selfie Starter Kit
| Field | Value |
|-------|-------|
| product_key | `starter_kit` |
| public name | Selfie Starter Kit |
| offer stage | entry |
| price | $37 USD |
| Stripe price ID | `price_1TPR5HEVJvME7vkwLF9DyggB` |
| env var | `STRIPE_PRICE_STARTER_KIT` |
| checkout route | `/checkout/starter-kit` |
| success route | `/checkout/success?type=starter_kit` |
| access route | `/academy/access/starter-kit` → `/access/starter-kit/[token]` |
| entitlement key | `starter_kit` |
| delivery email | `starter-kit-day0-delivery.ts` |
| delivery assets | Lightroom presets ZIP (`STARTER_KIT_PRESET_DOWNLOAD_URL`) |
| CTA status | **active** |
| notes | Presets are the lead asset — email leads with preset download. Token stored in `freebie_subscribers.access_token`. |

### Selfie Branding Masterclass
| Field | Value |
|-------|-------|
| product_key | `masterclass` |
| public name | Selfie Branding Masterclass |
| offer stage | bridge |
| price | $147 USD |
| Stripe price ID | `price_1TPR5TEVJvME7vkwZQNuvnE0` |
| env var | `STRIPE_PRICE_MASTERCLASS` |
| checkout route | `/checkout/masterclass` |
| success route | `/checkout/success?type=masterclass` |
| access route | `/academy/access/masterclass` → `/academy/access/brand-strategy` |
| entitlement key | `masterclass` |
| delivery email | `masterclass-day0-delivery.ts` |
| CTA status | **active** |
| notes | Includes Brand Strategy Pack access. Lifecycle: masterclass-day1-5-7-10-14 nurture. |

### SSELFIE Studio Membership
| Field | Value |
|-------|-------|
| product_key | `sselfie_studio_membership` |
| public name | SSELFIE Studio |
| offer stage | continuity |
| price | €97/month |
| Stripe price ID | In Stripe as recurring subscription (env: `STRIPE_PRICE_STUDIO`) |
| checkout route | `/checkout/membership?interval=month` |
| success route | `/checkout/success?type=sselfie_studio_membership` |
| access route | `/studio` |
| entitlement key | `sselfie_studio_membership` |
| delivery email | `onboarding-day-0.tsx` (welcome sequence) |
| CTA status | **active** |
| notes | Cancel anytime. Granting via `invoice.payment_succeeded` webhook event. |

### Selfie Guide (standalone)
| Field | Value |
|-------|-------|
| product_key | `selfie_guide` |
| public name | Selfie Guide |
| offer stage | entry (secondary) |
| price | $17 USD |
| Stripe price ID | `price_1TOyqvEVJvME7vkwJU5jw8OJ` |
| env var | `STRIPE_PRICE_SELFIE_GUIDE` |
| checkout route | `/checkout/selfie-guide` |
| success route | `/checkout/success?type=selfie_guide` |
| access route | `/selfie-guide/access/[token]` |
| entitlement key | `selfie_guide` |
| delivery email | `selfie-guide-paid-delivery.tsx` |
| CTA status | **active** |
| notes | Token stored in `freebie_subscribers.access_token`. No presets — presets are Starter Kit exclusive. |

### Selfie Guide + Brand Strategy Bundle
| Field | Value |
|-------|-------|
| product_key | `selfie_guide_bundle` |
| public name | Selfie Guide + Brand Strategy Bundle |
| offer stage | entry (upsell) |
| price | $27 USD |
| Stripe price ID | In Stripe (see webhook for `selfie_guide_bundle` case) |
| checkout route | legacy — webhook-only fulfillment |
| access route | `/selfie-guide/access/[token]` |
| entitlement key | `selfie_guide_bundle` |
| delivery email | `selfie-guide-paid-delivery.tsx` |
| CTA status | **active** (no public standalone CTA — sold as bump) |
| notes | Bundle of Selfie Guide + Brand Strategy Pack. No presets. |

### Brand Strategy Pack
| Field | Value |
|-------|-------|
| product_key | `brand_strategy_pack` |
| public name | Brand Strategy Pack |
| offer stage | entry (standalone AI product) |
| price | $19 USD |
| Stripe price ID | `price_1T8T2PEVJvME7vkwaCywCCnB` |
| env var | `STRIPE_PRICE_BRAND_STRATEGY_PACK` |
| checkout route | `/checkout/brand-strategy-pack` |
| success route | → `/brand-strategy/setup/[setupToken]` (polling redirect) |
| access route | `/strategy/[accessToken]` |
| entitlement key | `brand_strategy_pack` |
| delivery email | `brand-strategy-paid-delivery.ts` |
| CTA status | **active** |
| notes | Questionnaire → Maya AI generates strategy → delivered to `/strategy/[token]` |

### What To Say
| Field | Value |
|-------|-------|
| product_key | `what_to_say` |
| public name | What To Say |
| offer stage | core |
| price | €47 EUR |
| Stripe price ID | `price_1TRsh9EVJvME7vkw8csaOr3H` |
| env var | `STRIPE_PRICE_WHAT_TO_SAY` |
| checkout route | `/checkout/academy-product/what_to_say` |
| access route | `/academy/access/what-to-say` |
| entitlement key | `what_to_say` |
| delivery email | `masterclass-day0-delivery.ts` (generic — TODO: dedicated template) |
| CTA status | **active** |
| notes | Was briefly deactivated, now re-active as part of new funnel. |

### Show Up
| Field | Value |
|-------|-------|
| product_key | `show_up` |
| public name | Show Up |
| offer stage | core |
| price | €67 EUR |
| Stripe price ID | `price_1TRshAEVJvME7vkwagNIvBiz` |
| env var | `STRIPE_PRICE_SHOW_UP` |
| checkout route | `/checkout/academy-product/show_up` |
| access route | `/academy/access/show-up` |
| entitlement key | `show_up` |
| CTA status | **active** |

### Get Paid
| Field | Value |
|-------|-------|
| product_key | `get_paid` |
| public name | Get Paid |
| offer stage | core |
| price | €97 EUR |
| Stripe price ID | `price_1TRshBEVJvME7vkwsUhzqtBY` |
| env var | `STRIPE_PRICE_GET_PAID` |
| checkout route | `/checkout/academy-product/get_paid` |
| access route | `/academy/access/get-paid` |
| entitlement key | `get_paid` |
| CTA status | **active** |

### 30-Day Visibility Reset (Feed Planner)
| Field | Value |
|-------|-------|
| product_key | `paid_blueprint` |
| public name | 30-Day Visibility Reset |
| offer stage | legacy active |
| price | $47 USD |
| Stripe price ID | `price_1SnlJEEVJvME7vkw1thdr7WK` |
| env var | — (hardcoded) |
| checkout route | `/checkout/blueprint` |
| access route | `/feed-planner` |
| entitlement key | `paid_blueprint` (via subscriptions table) |
| delivery email | `paid-blueprint-delivery.tsx` |
| CTA status | **active for existing buyers** |
| notes | Paying Blueprint users — do not break or remove. |

---

## Archived / Legacy Products

### Visibility To Paid Suite
| Field | Value |
|-------|-------|
| product_key | `visibility_suite` |
| public name | Visibility To Paid Suite |
| offer stage | legacy |
| price | €97 EUR |
| Stripe price ID | `price_1TRshJEVJvME7vkwK55rwjA0` (launch) |
| CTA status | **archived — no new public CTA** |
| access route | `/academy/access/visibility-suite` |
| notes | Still fulfills for legacy buyers. Not promoted publicly. |

### Mini-products (What To Say / Show Up / Get Paid — old price IDs)
| product_key | old Stripe price ID | status |
|-------------|-------------------|--------|
| `what_to_say` (legacy) | `price_1T2xljEVJvME7vkwFcaN1GEw` | **deactivated** in Stripe |
| `show_up` (legacy) | `price_1T2xllEVJvME7vkwHC3r6GAI` | **deactivated** in Stripe |
| `get_paid` (legacy) | `price_1T2xlmEVJvME7vkwkbgotHoB` | **deactivated** in Stripe |
| `ai_photo_prompts` (legacy) | `price_1T3aR3EVJvME7vkw6pzbZS9m` | **deactivated** in Stripe |

> ⚠️ Do not reactivate these price IDs. New purchases use the `price_1TRsh*` IDs above.

---

## Access Recovery

Self-serve: `/access`
- User enters purchase email
- System checks `user_entitlements` + `freebie_subscribers`
- Sends magic access link to that email
- Logs attempt in `email_logs` with type `access_recovery_attempt`

Support path: `support@sselfie.ai`

---

## Delivery Email Map

| product_key | email template | subject line |
|-------------|---------------|-------------|
| `starter_kit` | `starter-kit-day0-delivery.ts` | "your starter kit is here — presets inside" |
| `selfie_guide` | `selfie-guide-paid-delivery.tsx` | "Your First Visible Post Guide is ready" |
| `selfie_guide_bundle` | `selfie-guide-paid-delivery.tsx` | "Your First Visible Post Guide is ready" |
| `masterclass` | `masterclass-day0-delivery.ts` | "start with your strategy" |
| `brand_strategy_pack` | `brand-strategy-paid-delivery.ts` | (see template) |
| `sselfie_studio_membership` | `onboarding-day-0.tsx` | (welcome) |
| `paid_blueprint` | `paid-blueprint-delivery.tsx` | (see template) |
| `what_to_say` | ⚠️ no dedicated template — uses generic | TODO |
| `show_up` | ⚠️ no dedicated template | TODO |
| `get_paid` | ⚠️ no dedicated template | TODO |

---

## Currency + Pricing Source of Truth

| product_key | display price | currency | Stripe amount |
|-------------|-------------|---------|-------------|
| `starter_kit` | $37 | USD | 3700 cents |
| `selfie_guide` | $17 | USD | 1700 cents |
| `selfie_guide_bundle` | $27 | USD | 2700 cents |
| `brand_strategy_pack` | $19 | USD | 1900 cents |
| `masterclass` | $147 | USD | 14700 cents |
| `sselfie_studio_membership` | €97/mo | EUR | 9700 cents |
| `what_to_say` | €47 | EUR | 4700 cents |
| `show_up` | €67 | EUR | 6700 cents |
| `get_paid` | €97 | EUR | 9700 cents |
| `paid_blueprint` | $47 | USD | 4700 cents |

> ⚠️ USD vs EUR mismatch exists between the selfie education products (USD) and the academy products (EUR). Keep this consistent — do not mix currencies within a single product page.

---

## Known Risks + Flags

- **Starter Kit academy redirect bug** — fixed 2026-05-13: was incorrectly redirecting to `editing_masterclass` course instead of the token-based access page.
- **Missing delivery email templates** for `what_to_say`, `show_up`, `get_paid` — these use a generic confirmation. Add dedicated templates before scaling paid traffic to these products.
- **PaymentIntents with `customer: null`** — webhook currently processes these, but the payment record may not be tied to a Stripe customer. Add `needs_review` logging for these cases.
- **Duplicate Starter Kit access paths** — two routes exist: `/access/starter-kit/[token]` (token-based, no auth) and `/academy/access/starter-kit` (auth-based, redirects to token route). Both are intentional: the token route is for non-authenticated buyers, the academy route is for authenticated users post-purchase.

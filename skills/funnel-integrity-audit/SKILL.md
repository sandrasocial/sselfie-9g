---
name: funnel-integrity-audit
description: Audit SSELFIE monetization funnels for checkout friction, auth walls, Stripe misconfiguration blast radius, broken upsells, and post-purchase leaks. Use for Selfie Guide, Brand Strategy Pack, Studio membership, credits, and any CTA-to-checkout path.
---

# Funnel Integrity Audit

## Purpose
Find where buyers leak out between CTA, checkout, payment, and fulfillment.

This skill is for SSELFIE revenue paths, not general UX polish. It should answer:
- Does the CTA go straight to the right checkout?
- Is there an unnecessary extra page?
- Is a guest being forced into auth?
- Can one broken Stripe SKU block a different product?
- Does payment complete into the right success and delivery flow?

## Core Rule
For public paid offers, prefer a single direct path:

`landing CTA -> embedded Stripe checkout -> success -> access/delivery`

Flag any extra chooser page, auth wall, or retry loop unless it is explicitly required.

## SSELFIE Offer Scope
Always include these when auditing the funnel:
- `selfie_guide`
- `brand_strategy_pack`
- `sselfie_studio_membership`
- `credit_topup`

Reference patterns:
- Public guest-safe checkout usually uses `createLandingCheckoutSession`
- Logged-in app checkout usually uses `startProductCheckoutSession` or `startCreditCheckoutSession`

## File Map
Start with:
- `app/selfie-guide/page.tsx`
- `app/checkout/selfie-guide/page.tsx`
- `app/checkout/brand-strategy-pack/page.tsx`
- `app/checkout/membership/page.tsx`
- `app/checkout/credits/page.tsx`
- `app/actions/landing-checkout.ts`
- `app/actions/stripe.ts`
- `lib/products.ts`
- `lib/stripe/validate-pricing-config.ts`
- `components/checkout/success-content.tsx`
- `app/api/webhooks/stripe/route.ts`

Then inspect CTA sources with `rg`:
```bash
rg -n "checkout/selfie-guide|checkout/brand-strategy-pack|checkout/membership|checkout/credits|startProductCheckoutSession|createLandingCheckoutSession|startCreditCheckoutSession" app components lib tests
```

## Audit Workflow
1. Map each offer from first CTA to final delivery.
2. Count clicks/pages before Stripe checkout opens.
3. Mark whether the route is public or auth-required.
4. Check whether the route validates only the requested SKU or all Stripe pricing.
5. Check fallback behavior on Stripe failure.
6. Check success path and fulfillment path.
7. Compare flows to the cleanest working reference already in repo.

## Leak Patterns To Flag
- Public CTA lands on a second plan-selection page instead of checkout.
- Public paid offer forces login before checkout.
- One product checkout validates unrelated Stripe prices.
- Error fallback dumps user back to landing with a generic failure.
- Order bump is implemented as a separate route instead of in checkout.
- Success page does not route cleanly to access/delivery.
- Copy and pricing drift between landing, checkout, Stripe, and email.

## SSELFIE-Specific Guidance
- `selfie_guide` should not require a second chooser page if the intended sale is the guide itself.
- If a bundle/order bump exists, it should not block the base offer from checking out.
- `brand_strategy_pack` should be guest-safe when sold as a public upsell.
- `membership` can be the reference flow when it uses direct landing checkout successfully.
- `credits` are acceptable as auth-only if they are strictly an in-app top-up, but flag them if they are being treated like a public offer.

## Output Contract
Return:
- `Canonical path` for each offer
- `Leak points` ordered by severity
- `Root cause` with file references
- `Fix shape` in one line per issue
- `Best reference path` already present in the repo

Keep the audit concrete and revenue-focused. Name the exact route or function causing the leak.

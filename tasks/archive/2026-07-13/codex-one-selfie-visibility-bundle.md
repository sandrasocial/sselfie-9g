# Codex Spec — One Selfie Visibility Bundle

Status: shipped as the attended July 13–15, 2026 revenue event
Owner: Codex / Stella
Campaign: 2026-07-13 18:00 CEST through 2026-07-15 18:00 CEST

## Business decision

Ship one focused 48-hour revenue event based on verified production evidence.

- Offer: **One Selfie Visibility Bundle**
- Promise: turn one selfie into photos and content she can actually post
- Price: **$97 one-time**
- Keyword Sandra configures in ManyChat: **BUNDLE**
- Public route: `/one-selfie`
- Fixed window: `2026-07-13T16:00:00.000Z` to `2026-07-15T16:00:00.000Z`
- No hidden recurring billing
- Existing SUITE members are told they already have this value and should not buy it

## Included access

Lifetime:

1. Selfie Starter Kit
2. Full SSELFIE Presets Collection
3. Editing Masterclass
4. Branded by SSELFIE course
5. Prompt Vault

Fixed access:

6. Thirty days of SUITE with 200 credits, ending automatically without renewal

The buyer experience must present this as one path, not a library dump:

1. Start with the selfie
2. Make the photos
3. Build the visible brand
4. Keep creating with Maya

## Commercial paths

- Primary checkout: one $97 Stripe payment.
- Checkout must reject new sessions outside the fixed window.
- After purchase: open the dedicated buyer home; optional standard annual SUITE is a second, transparent checkout.
- Expired/declined offer: one honest $37 Starter Kit fallback.
- Do not add a pre-payment order bump.
- Do not revive the closed founding offer or its scarcity.

## Fulfillment requirements

- One new product type owns the payment and reports revenue exactly once.
- One bundle orchestrator grants every entitlement/token/order exactly once.
- Do not invoke several existing product handlers.
- Create or reuse the buyer account safely.
- Create Starter Kit and Prompt Vault token access.
- Create Full Presets order access.
- Grant Masterclass aliases for Branded by SSELFIE and Editing Masterclass.
- Grant one fixed 30-day SUITE pass, even if the buyer used an earlier free trial.
- Do not create a Stripe subscription.
- Remove only unused pass credits at pass expiry; never remove purchased/top-up credits.
- Send one delivery email with one primary CTA.

## Campaign materials

- Build three Resend broadcast drafts only: open, proof/what-is-inside, last call.
- Nothing sends without Sandra's approval.
- Provide one ManyChat flow script and a small posting kit in the documented launch runbook.
- Use exact attribution for email, Instagram, Stories, and ManyChat.

## Design plan

Palette: `#F8FAFA`, `#FFFFFF`, `#C5C6C8`, `#818283`, `#282728`, `#0D0E10`.

Type:

- Display: Cormorant Garamond, light/regular.
- Body and UI: existing Inter/approved sans.

Layout:

```text
Desktop
┌────────────────────────────────────────────────────────────┐
│ editorial proof image │ ONE SELFIE / one promise / $97 CTA │
├────────────────────────────────────────────────────────────┤
│ proof strip: fixed price · lifetime tools · 30 days Maya   │
├────────────────────────────────────────────────────────────┤
│ 01 selfie → 02 photos → 03 visible brand → 04 Maya         │
├────────────────────────────────────────────────────────────┤
│ what is included, framed by outcome                        │
├────────────────────────────────────────────────────────────┤
│ honest FAQ / existing-member note / final CTA              │
└────────────────────────────────────────────────────────────┘

Mobile
┌──────────────────────┐
│ proof image           │
│ one promise           │
│ $97 CTA               │
├──────────────────────┤
│ four-step path        │
├──────────────────────┤
│ included outcomes     │
├──────────────────────┤
│ FAQ + sticky CTA      │
└──────────────────────┘
```

Signature element: a thin editorial line connecting one selfie to the four buyer outcomes. No icon grid, feature wall, gradients, or fake countdown resets.

Self-critique before build: avoid a generic course stack, dark SaaS hero, pill-heavy cards, oversized slogan copy, and multiple equal CTAs. The page must read as one result and one decision.

## Measurement

Track at minimum:

- landing viewed
- primary CTA clicked
- checkout started
- checkout completed
- buyer home opened
- each included asset opened
- annual SUITE upsell viewed/clicked/completed
- expired-offer Starter Kit fallback clicked
- source/medium/campaign/content/keyword on checkout and Stripe payment

## Expected 48-hour revenue bands

- Conservative: 5 buyers = $485
- Evidence-weighted: 10–15 buyers = $970–$1,455
- Strong: 20–25 buyers = $1,940–$2,425
- Annual SUITE conversion is additive and must be reported separately in EUR.

## Verification

- Test offer boundary and server-side close.
- Test Stripe metadata, price, currency, expiry, and attribution.
- Test webhook replay/idempotency and exactly-one delivery email.
- Test all lifetime access paths and the 30-day pass.
- Test pass expiry credit removal.
- Test new and existing buyer account paths.
- Test expired fallback and annual upsell attribution.
- Run focused tests, full test suite, production build, and live desktop/mobile smoke checks.
- Confirm zero unresolved webhook reviews after live verification.

## Documentation

On ship, archive this task under `tasks/archive/` and add the complete attended launch/runbook to `docs/business/` without creating a recurring unattended automation.

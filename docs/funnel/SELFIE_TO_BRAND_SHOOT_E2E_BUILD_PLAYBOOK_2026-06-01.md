# Selfie To Brand Shoot E2E Build Playbook

Date: 2026-06-01
Status: Build and QA operating system
Parent plan: `docs/funnel/SELFIE_TO_BRAND_SHOOT_SYSTEM_EXECUTION_PLAN_2026-06-01.md`

> Visual authority update — 2026-08-30: The build and QA workflow in this playbook remains useful, but all product, marketing, email, and interface styling is governed solely by `docs/SSELFIE_DESIGN_SYSTEM.md`. The former Cool Editorial palette in this document is superseded and must not be implemented.

## Purpose

Build Selfie to Brand Shoot as a finished, connected product without drifting into another scattered product system.

This playbook defines:

- how the product gets built,
- what must stay connected,
- what must not break,
- how visual quality is approved,
- how smoke testing works,
- and what Sandra should and should not need to do.

## Product Build Principle

We are not building more pages.

We are building one connected buyer transformation path:

> Free Prompt Pack -> Prompt Vault -> Selfie to Brand Shoot System -> future Membership / VIP.

Every implementation decision must answer:

> Does this help her turn one selfie into elevated personal brand images, without creating another scattered product?

If yes, continue.

If no, cut it.

## Sandra's Role

Sandra is the taste approval layer.

Sandra should approve:

- visual direction,
- images,
- aesthetics,
- copy that feels emotionally wrong,
- whether the product feels like SSELFIE.

Sandra should not be responsible for:

- route debugging,
- entitlement debugging,
- Stripe checks,
- broken image paths,
- token access,
- build/test failures,
- smoke testing.

## Approved Image Source

Fallback/approved image source discovered locally:

`/Users/MD760HA/Desktop/images:ai-prompts`

This folder contains current AI prompt photoshoot collections including:

- Coastal White Dress Sunset Editorial
- Marble Cafe Wine Editorial
- Dark Balcony Luxury City Editorial
- Clean Girl Founder Morning Editorial
- Cozy Leather + Oversized Knit Mirror Editorial
- NOIR FEMME
- Denim Street editorial shoot
- Dark Feminine Cafe Coffee-Run Editorial

Use existing product image sources in the repo first. If a visual is missing or stale, use this desktop folder as the curated fallback source.

If unsure which image fits a section, mark:

`NEEDS_SANDRA_DECISION: image`

Do not invent random placeholder visuals.

## Phase 1: Product Outline Before Code

Before coding, create the final product outline from the asset map.

The approved product path:

1. Start With One Selfie
2. Choose Your Visual World
3. Create The AI Brand Shoot
4. Pick The Images That Look Like You
5. Turn Them Into Content
6. Bonuses

The outline must define:

- buyer promise for each module,
- lessons/steps inside each module,
- existing assets used,
- missing mini-assets,
- required visuals,
- where each asset will live,
- what gets excluded.

No code starts until this outline exists.

## Phase 2: Connection Map

Before coding, create a connection map.

### Public surfaces

- `/ai-prompts`
- `/ai-prompts/access/[token]`
- `/prompt-vault`
- `/checkout/prompt-vault`
- `/access/prompt-vault/[token]`
- `/academy/access/prompt-vault`
- new Selfie to Brand Shoot product route
- future checkout route, only when explicitly approved

### Protected surfaces

- `/studio`
- `/maya`
- `/feed-planner`
- `/academy`
- `/academy/access/starter-kit`
- `/academy/access/masterclass`
- `/academy/access/selfie-guide`
- existing token access pages
- existing Stripe/payment/webhook logic
- existing product IDs

### Must not break

- existing customers,
- Studio members,
- Prompt Vault buyers,
- Starter Kit buyers,
- Masterclass buyers,
- Feed Planner / Blueprint buyers,
- token recovery,
- Academy entitlements,
- checkout flows,
- email delivery.

## Phase 3: Lean Product Shell

Use existing Academy/access infrastructure where possible.

The first product shell should include:

- product home,
- start here section,
- module cards,
- visual-first hero,
- existing asset embeds or links,
- missing mini-assets clearly marked internally,
- buyer activation path,
- Vault access included,
- bonuses section,
- member continuity note where relevant.

Do not include:

- new community,
- full app rebuild,
- new AI generator,
- new dashboard,
- Feed Planner rebuild,
- Maya rebuild,
- checkout changes unless explicitly approved,
- entitlement changes unless explicitly approved.

## Phase 4: Visual System Lock

The product must follow `docs/SSELFIE_DESIGN_SYSTEM.md` and its approved Noir Glass reference. Do not create or maintain a second palette in this playbook.

The product-specific visual goals remain:

- editorial,
- premium,
- feminine,
- visual-first,
- private fashion archive,
- cinematic personal brand world.

Obsidian may lead immersive creation and editing surfaces. Pearl or Paper remains the default light canvas where the governing system calls for it. Use only the canonical Noir Glass tokens defined in the governing document; do not copy their values into product-specific plans.

Avoid:

- warm beige drift,
- cream/yellow undertones,
- bright gradients,
- pink/purple AI styling,
- generic SaaS cards,
- decorative neon that does not clarify hierarchy or action,
- childlike widgets,
- emoji-heavy product UI,
- cluttered course portals,
- stock-like visuals,
- ugly placeholders.

Visuals lead. Text supports.

If unsure about:

- image,
- layout,
- color,
- typography,
- crop,
- visual hierarchy,
- section concept,

mark:

`NEEDS_SANDRA_DECISION`

and use a clean internal placeholder or existing approved image.

## Phase 5: Smoke Testing

No build is considered done until all three smoke layers pass.

### 1. Technical smoke test

Check:

- build passes,
- page loads,
- no console errors,
- no broken routes,
- no broken image URLs,
- no horizontal overflow,
- access pages still work,
- Academy still works,
- Vault still works,
- Studio/Maya routes still load,
- protected products still route correctly.

### 2. Buyer journey smoke test

Run:

1. Visitor lands on Free Prompt Pack.
2. Visitor understands Selfie to Brand Shoot in 3 seconds.
3. Visitor accesses free prompt preview.
4. Free prompt bridge points to Vault.
5. Vault explains full shoots and future drops.
6. Checkout remains intact.
7. Buyer can access Prompt Vault.
8. Buyer sees next step into Selfie to Brand Shoot System.
9. Product home tells her exactly where to start.
10. First-result path is obvious.
11. No old product names create confusion.

### 3. Visual smoke test

Capture screenshots:

- desktop Free Prompt Pack,
- mobile Free Prompt Pack,
- desktop Prompt Vault,
- mobile Prompt Vault,
- desktop Selfie to Brand Shoot System,
- mobile Selfie to Brand Shoot System,
- any checkout or buyer home touched.

Check:

- image consistency,
- typography,
- spacing,
- button clarity,
- mobile crop,
- no warm color drift,
- no cluttered module cards,
- no broken images,
- no ugly placeholders,
- no design drift from SSELFIE.

## Required QA Output Per Build

Every implementation summary must include:

1. Files changed.
2. Routes changed.
3. Data/access logic touched.
4. Visual assets used.
5. Any `NEEDS_SANDRA_DECISION` items.
6. Technical tests run.
7. Buyer journey tested.
8. Screenshots captured.
9. Risks.
10. What Sandra needs to approve.

## Implementation Order

### Build 1: Product Outline And Build Spec

Create the finished Selfie to Brand Shoot product outline and connection map.

No customer-facing changes yet.

### Build 2: Public Funnel Copy Alignment

Update Free Prompt Pack and Prompt Vault language to align with Selfie to Brand Shoot.

Copy and visual framing only.

No payment/access changes.

### Build 3: Core Product Shell

Create Selfie to Brand Shoot System buyer home/product page.

Use existing Academy/access where possible.

### Build 4: Activation Layer

Add first-result path:

- start here checklist,
- first prompt to try,
- troubleshooting,
- content-use guide,
- email sequence drafts.

### Build 5: Member Continuity

Add additive Studio/member messaging:

- access stays,
- pricing stays,
- new Selfie to Brand Shoot drops are added as bonuses.

### Build 6: Premium Inquiry

Add quiet VIP inquiry path.

No agency build.

## Final Done Definition

The product is done only when:

- the path feels like one transformation,
- the visuals feel unmistakably SSELFIE,
- existing customers are protected,
- the free and paid products connect cleanly,
- the buyer knows exactly how to get her first result,
- screenshots are approved,
- and smoke tests pass.

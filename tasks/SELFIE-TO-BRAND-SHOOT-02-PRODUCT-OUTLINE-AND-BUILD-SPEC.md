# Codex Task: Selfie To Brand Shoot Product Outline And Build Spec

Date: 2026-06-01
Owner: Codex
Status: Complete/stale

> Status audit 2026-06-13: Complete. Required output exists at
> `docs/funnel/SELFIE_TO_BRAND_SHOOT_PRODUCT_OUTLINE_2026-06-01.md`.

## Purpose

Create the implementation blueprint for the Selfie to Brand Shoot System before any customer-facing code is changed.

This task turns the asset map into a finished product outline, connection map, visual requirements, and smoke-test plan.

## Read First

1. `CLAUDE.md`
2. `docs/CODEX_CONTEXT.md`
3. `docs/brand/VOICE_BIBLE.md`
4. `docs/SSELFIE_DESIGN_SYSTEM.md`
5. `docs/source-of-truth/SSELFIE_STRATEGIC_LOCK_IN_2026-06-01.md`
6. `docs/funnel/SELFIE_TO_BRAND_SHOOT_SYSTEM_EXECUTION_PLAN_2026-06-01.md`
7. `docs/funnel/SELFIE_TO_BRAND_SHOOT_ASSET_MAP_2026-06-01.md`
8. `docs/funnel/SELFIE_TO_BRAND_SHOOT_E2E_BUILD_PLAYBOOK_2026-06-01.md`

## Non-Negotiables

Do not build customer-facing pages yet.

Do not change checkout/payment/customer access.

Do not change product IDs.

Do not break Studio, Maya, Feed Planner, Academy, Prompt Vault, or token access.

Do not invent visuals.

Do not introduce warm beige/cream drift.

If unsure about visual direction, image choice, layout, copy, or customer-facing promise, mark it:

`NEEDS_SANDRA_DECISION`

## Approved Image Source

Use existing product images in the repo first.

Fallback curated local image source:

`/Users/MD760HA/Desktop/images:ai-prompts`

Do not use unrelated stock images or abstract filler.

## Required Output

Create:

`docs/funnel/SELFIE_TO_BRAND_SHOOT_PRODUCT_OUTLINE_2026-06-01.md`

The document must include:

1. Product promise.
2. Target buyer.
3. Pricing recommendation.
4. Module-by-module outline.
5. Lesson/step list inside each module.
6. Existing assets used per module.
7. Missing assets to create.
8. Visual asset requirements per module.
9. Buyer activation path.
10. Funnel connection map.
11. Access/entitlement plan.
12. Visual QA requirements.
13. Smoke-test checklist.
14. `NEEDS_SANDRA_DECISION` list.
15. Next implementation tasks.

## Required Product Path

Use this product path:

1. Start With One Selfie
2. Choose Your Visual World
3. Create The AI Brand Shoot
4. Pick The Images That Look Like You
5. Turn Them Into Content
6. Bonuses

## Required Buyer Activation Path

The first-result path must be obvious:

1. Choose or take one source selfie.
2. Pick one visual world.
3. Copy one recommended prompt.
4. Paste into ChatGPT with the selfie.
5. Save the best result.
6. Decide where to use it first.

This path must be visible on the product home.

## Required Connection Map

Map how these connect:

- `/ai-prompts`
- `/ai-prompts/access/[token]`
- `/prompt-vault`
- `/checkout/prompt-vault`
- `/access/prompt-vault/[token]`
- `/academy/access/prompt-vault`
- future Selfie to Brand Shoot product page
- future Selfie to Brand Shoot buyer home
- existing Academy access
- existing Studio/Maya/member access

## Visual QA Rules

The product must feel:

- cool monochrome,
- editorial,
- premium,
- feminine,
- image-led,
- cinematic,
- clear on mobile.

Use:

- Seasalt `#F8FAFA`
- White `#FFFFFF`
- Silver `#C5C6C8`
- Gray `#818283`
- Davy's Gray `#4F5052`
- Raisin Black `#282728`
- Night `#0D0E10`

Avoid:

- beige,
- cream,
- warm ivory,
- pink/purple AI gradients,
- gold luxury accents,
- generic SaaS dashboards,
- cluttered cards,
- stock images,
- random icons.

## Smoke-Test Plan

The outline must define the future smoke test before implementation:

### Technical

- build passes,
- routes load,
- no console errors,
- no broken images,
- access pages still work,
- existing products still work.

### Buyer journey

- free prompt visitor understands promise,
- bridges to Vault,
- Vault buyer gets access,
- buyer sees next step into Selfie to Brand Shoot,
- first-result path is clear.

### Visual

- desktop screenshots,
- mobile screenshots,
- image crops,
- spacing,
- typography,
- no warm color drift,
- no visual placeholders unless marked for Sandra.

## Quality Bar

The final outline should be specific enough that Codex can build without guessing.

If the document leaves open aesthetic decisions, they must be explicitly marked for Sandra.

If the document describes a giant portal, it failed.

If it describes one elegant transformation path using existing assets, it succeeded.

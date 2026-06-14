# Codex Task: Selfie To Brand Shoot Asset Consolidation

Date: 2026-06-01
Owner: Codex
Status: Complete/stale

> Status audit 2026-06-13: Complete. Required output exists at
> `docs/funnel/SELFIE_TO_BRAND_SHOOT_ASSET_MAP_2026-06-01.md`.

## Purpose

Turn SSELFIE's scattered assets into one clear transformation system:

> Selfie to Brand Shoot.

This is not a new product build yet. This is the consolidation pass that determines what existing assets belong in the new core product, what becomes a bonus, what stays legacy-only, and what should stop being promoted publicly.

## Read First

1. `CLAUDE.md`
2. `docs/CODEX_CONTEXT.md`
3. `docs/source-of-truth/SSELFIE_STRATEGIC_LOCK_IN_2026-06-01.md`
4. `docs/funnel/SELFIE_TO_BRAND_SHOOT_SYSTEM_EXECUTION_PLAN_2026-06-01.md`
5. `docs/brand/VOICE_BIBLE.md`

## Strategic Guardrails

Do not turn this into a rebrand project.

Do not build a new portal.

Do not change checkout/payment/customer access.

Do not delete or rename existing products.

Do not break Studio, Maya, Feed Planner, Academy, or token access.

Do not promote old product names as the new front-door identity.

## Assets To Audit

Audit these areas:

- Free Prompt Pack
  - `/ai-prompts`
  - `/ai-prompts/access/[token]`
  - `lib/ai-prompts/prompt-data.ts`

- Prompt Vault
  - `/prompt-vault`
  - `/checkout/prompt-vault`
  - `/access/prompt-vault/[token]`
  - `/academy/access/prompt-vault`
  - prompt data and collection metadata

- Selfie Guide
  - `/selfie-guide`
  - `/selfie-guide/access/[token]`
  - `/academy/access/selfie-guide`
  - `lib/selfie-guide/*`

- Starter Kit
  - `/starter-kit`
  - `/access/starter-kit/[token]`
  - `/academy/access/starter-kit`
  - `docs/academy/STARTER_KIT_DELIVERABLE_AUDIT.md`

- Masterclass / Academy
  - `/masterclass`
  - `/academy`
  - `/academy/access/masterclass`
  - `/academy/courses/[courseId]`
  - `docs/academy/MASTERCLASS_DELIVERABLE_AUDIT.md`
  - Academy product/entitlement files

- Presets / Workbooks / PDFs
  - linked resources in audit docs
  - Vercel Blob URLs used by buyer homes
  - public/academy assets if present

- Studio / Maya
  - `/studio`
  - `/maya`
  - `components/sselfie/*`
  - `lib/maya/*`

- Feed Planner / Blueprint
  - `/feed-planner`
  - Blueprint docs/routes
  - `lib/feed-planner/*`

## Asset Tags

For every meaningful asset, assign one primary tag:

- `source_selfie`
- `aesthetic_direction`
- `prompting`
- `first_result`
- `image_selection`
- `editing`
- `content_usage`
- `proof`
- `bonus`
- `legacy_only`
- `discard`

## Required Output

Create:

`docs/funnel/SELFIE_TO_BRAND_SHOOT_ASSET_MAP_2026-06-01.md`

The document must include:

1. Executive summary.
2. Asset inventory table.
3. Recommended Selfie to Brand Shoot System module map.
4. Required assets that already exist.
5. Missing assets that must be created.
6. Legacy products that must keep working.
7. Public promotion recommendations.
8. Risks.
9. Next build task list.

## Module Map To Use

Organize assets into this product path:

1. Start With One Selfie
2. Choose Your Visual World
3. Create The AI Brand Shoot
4. Pick The Images That Look Like You
5. Turn Them Into Content
6. Bonuses

## Keep / Merge / Retire Rules

### Keep as front-door

- Free Prompt Pack
- Prompt Vault

### Merge into core system

- Selfie Guide source-photo guidance
- Starter Kit posing/presets/caption support
- Masterclass visual identity/content-use lessons
- Editing Masterclass polish workflow
- selected workbooks and PDFs

### Protect as legacy/existing-user products

- Studio
- Maya
- Feed Planner
- Blueprint / `paid_blueprint`
- token access pages
- existing Academy entitlements

### Stop public promotion as standalone front-door identity

- Starter Kit
- Masterclass
- Branded by SSELFIE
- Editing Masterclass
- Feed Planner
- Studio/Maya for cold prompt traffic

## Quality Bar

The resulting asset map should make it obvious:

- what the new core product includes,
- what already exists,
- what needs to be created,
- what should not be touched,
- and how to avoid building scattered products again.

If the map feels like ten products, it failed.

If it feels like one transformation with supporting assets, it succeeded.

# SSELFIE Studio

SSELFIE Studio is Sandra's live production app at [sselfie.ai](https://sselfie.ai).

It helps women start building online with their phone, face, story, selfies, everyday life, and AI tools. The selfie is where the work starts. Visibility is where it leads. AI is a tool. The woman is the point.

This repo is the SSELFIE mothership: public funnels, checkout and access flows, Prompt Vault, SSELFIE Studio, Maya, admin tools, email automations, and supporting course/product surfaces.

## Current Source Of Truth

Read these before making changes:

1. `AS-BUILT.md`
   Verified repo facts, deployment target, current app reality, and safety notes.

2. `docs/business/SSELFIE_COMPANY_KERNEL_2026-07-16.md`
   Controlling company model, offer status, buyer channels, AI-team roles, and business decisions.

3. `CLAUDE.md`
   Live business context, admin data contract, current priorities, and product guardrails.

4. `docs/CODEX_CONTEXT.md`
   Technical context, file map, automation notes, and operating procedure.

5. `docs/brand/SSELFIE_BRAND_CONSTITUTION.md`
   Highest-level North Star, message hierarchy, ethical line, and agent contract.

6. `docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md`
   Current voice, audience, story, expertise, product positioning, and agent behavior source.

7. `docs/SSELFIE_DESIGN_SYSTEM.md`
   Current visual and UI design authority.

The older `VOICE_BIBLE`, old content grounding docs, and old Studio marketing drafts are no longer active guidance.

## Current Product Reality

### SSELFIE Studio app

Members use `/app`.

The live member app is App v3:

- route: `app/app/`
- UI: `components/app-v3/`
- logic: `lib/app-v3/`
- APIs: `app/api/app-v3/`

Image generation uses OpenAI image editing through `app/api/app-v3/maya/generate/route.ts`.

Do not describe the live app as Replicate, Flux LoRA, Nano Banana, or model training-first. Those belong to older legacy surfaces unless the code path explicitly says otherwise.

### Prompt Vault

Prompt Vault is the active low-ticket front door from AI prompt traffic.

Core path:

- free opt-in: `/ai-prompts`
- paid offer: `/prompt-vault`
- checkout: `/checkout/prompt-vault`
- access: `/access/prompt-vault/[token]`

Position it as visual direction and AI photoshoot prompts that help a woman start from one selfie without looking fake.

### SSELFIE Studio membership

The membership is the recurring product. It should be treated as the bigger workspace for photos, prompts, content ideas, brand direction, and Maya-guided creation.

### Legacy surfaces

Legacy routes and docs still exist because live buyers may depend on older products:

- Starter Kit
- Masterclass
- Feed Planner
- Blueprint
- legacy `/studio`
- Academy assets

Do not delete or rewrite legacy access paths unless a current task explicitly says so.

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind
- Neon Postgres
- Supabase
- Stripe
- Resend
- Vercel
- OpenAI and Anthropic APIs
- Vercel Blob
- Upstash Redis

Run scripts with `pnpm`.

Useful commands:

```bash
pnpm type-check
pnpm lint
pnpm build
pnpm check:voice
pnpm audit:brand-consistency
pnpm audit:context-drift
node scripts/verify-repo-invariants.mjs
```

## Development Rules

- Live users exist. Keep changes scoped.
- Do not edit checkout, payments, access, entitlements, cron, or email sends casually.
- Money metrics must come from Stripe or `stripe_payments`, not analytics events.
- Admin behavior metrics can use `analytics_events`.
- Do not send emails from local work unless the task explicitly says so.
- Do not push to `main` unless Sandra asks.
- Use `codex/` branches for implementation work.
- Preserve unrelated dirty files.

## Voice Rules

Before writing customer-facing copy, read:

- `docs/brand/SSELFIE_BRAND_CONSTITUTION.md`
- `docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md`
- `docs/brand/source/2026-06-27/SSELFIE_VOICE_STYLE_GUIDE.md`
- `docs/brand/source/2026-06-27/SSELFIE_TARGET_AUDIENCE_PERSONA.md`
- `docs/brand/source/2026-06-27/SSELFIE_REWRITTEN_STORY_BANK.md`
- `docs/brand/source/2026-06-27/SANDRA_EXPERTISE.md`

Sandra's voice is simple, warm, direct, and human.

Avoid generic AI-tool language, corporate personal-brand language, motivational-coach language, and anything that makes AI the hero.

## Design Rules

Use `docs/SSELFIE_DESIGN_SYSTEM.md`.

Current direction:

- light editorial
- image-led
- cool monochrome
- premium but simple
- human before technical

Avoid dark SaaS defaults, warm beige drift, colorful AI palettes, generic dashboard UI, and old SELFIE AI design language.

## Documentation Map

Current docs should explain what is true now.

Historical docs should either live under an archive folder or clearly say they are historical. If a document gives old copy, old positioning, or old product direction without a current-status warning, clean it up before using it.

Start here for docs:

- `docs/brand/SSELFIE_BRAND_CONSTITUTION.md`
- `docs/README.md`
- `docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md`
- `docs/SSELFIE_DESIGN_SYSTEM.md`
- `docs/CODEX_CONTEXT.md`

## Deployment

Production deploys through Vercel from `main`.

Do not create alternative hosting paths.

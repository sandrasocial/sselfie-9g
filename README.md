# SSELFIE Studio

SSELFIE Studio is Sandra's live production application at [sselfie.ai](https://sselfie.ai).

The repository contains the product: public pages, checkout and access, Prompt Vault, SSELFIE
SUITE, Maya, admin tools, customer email lifecycle, payments, and supporting learning products.
AI task management, custom agents, and implementation queues do not live here.

## Start here

- `AS-BUILT.md` — stable repository and deployment facts
- `AGENTS.md` — short native Codex project instructions
- `docs/README.md` — current product documentation index
- `docs/SSELFIE_DESIGN_SYSTEM.md` — sole approved visual system for product, marketing, and email
- `docs/brand/SSELFIE_BRAND_CONSTITUTION.md` — brand purpose and ethical line
- `docs/brand/SANDRA_VOICE_OS_2026-07-16.md` — Sandra's current voice
- `docs/product/MAYA_CREATIVE_FREEZE_2026-07-15.md` — protected creative surfaces

Changing facts such as prices, revenue, customers, active subscriptions, email performance, and
production behavior must be verified from Stripe, the database, provider dashboards, logs, and the
live UI. Dated documents are not live evidence.

## Current product paths

- Member application: `/app`
- Free AI prompts: `/ai-prompts`
- Prompt Vault: `/prompt-vault`
- Prompt Vault checkout: `/checkout/prompt-vault`
- SSELFIE SUITE: `/join/studio`
- Presets: `/presets`

Legacy access routes remain because existing customers may depend on them. Do not remove a legacy
route until its entitlements and live usage have been verified.

## Stack

- Next.js 16 and React 19
- TypeScript
- Neon Postgres and Supabase
- Stripe and Resend
- Vercel
- OpenAI and Anthropic APIs
- Vercel Blob and Upstash Redis

Use `pnpm`.

```bash
pnpm dev
pnpm type-check:ci
pnpm verify:repo
pnpm exec vitest run
pnpm build
```

Production deploys only from `main` through Vercel. SSELFIE uses direct-to-main delivery after a
tested local merge; it does not use pull requests for normal implementation work.

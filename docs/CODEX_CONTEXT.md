# CODEX_CONTEXT

Last verified: 2026-07-09

## Purpose

This is the compact technical handoff for SSELFIE Studio. It records the current stack,
ownership boundaries, protected surfaces, and verification rules. It is not a business roadmap or
historical project log.

When this file conflicts with code, code wins. When it conflicts with `CLAUDE.md`, `CLAUDE.md`
wins for business state and operating decisions.

## Read Order

1. `AS-BUILT.md` — verified repository and deployment identity.
2. `CLAUDE.md` — live business context, admin data contract, and current priorities.
3. `docs/CODEX_CONTEXT.md` — technical constraints and file map.
4. `tasks/README.md` — current implementation queue and held work.
5. The relevant current contract below before changing that surface.

Current contracts:

- Voice, audience, story, and positioning:
  `docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md`
- Purpose, category, and messaging:
  `docs/brand/SSELFIE_PURPOSE_MESSAGING_LOCK_2026-07-07.md`
- Daily CEO focus and offer routing:
  `docs/business/SSELFIE_HIGHER_SELF_OPERATING_SYSTEM_2026-07-07.md`
- Revenue direction:
  `docs/business/SSELFIE_FORWARD_REVENUE_PLAN_2026-07-01.md`
- Product UI and visual system:
  `docs/SSELFIE_DESIGN_SYSTEM.md`
- SUITE creation ownership:
  `docs/product/SUITE_MAYA_SINGLE_OWNER_UX_2026-07-06.md`
- Automation ownership:
  `docs/AUTOMATION_ROSTER.md`

## Live Stack

- Next.js 16 and React 19.
- Vercel-only hosting with automatic production deployment from `main`.
- Neon Postgres through `@neondatabase/serverless`.
- Stripe for payments and subscriptions.
- Resend for email delivery and broadcasts.
- Vercel Blob for media.
- Upstash for locks/cache where configured.
- OpenAI `gpt-image-2` for the live `/app` image-generation path.
- OpenRouter is Maya's primary text-model gateway. Quality tasks use Claude Sonnet 5; fast tasks
  use Claude Haiku 4.5. Direct Anthropic is an emergency fallback.
- pnpm 10.23.0 is the only package manager. Vitest is the main test runner; Playwright is used for
  browser flows.

## Live Product Architecture

### Member app

Members use `/app`.

Primary locations:

- `app/app/`
- `components/app-v3/`
- `lib/app-v3/`
- `app/api/app-v3/`

Maya owns creation setup inside the chat drawer. The Create tab may start Maya, but it must not
become a parallel studio with separate selfie, style, shot, text, or model controls.

### Legacy app

`/studio` and the large legacy Maya tree still exist for compatibility, but they are not the live
member architecture. Legacy Replicate, Flux LoRA, Nano Banana, tab, training, and Feed-era docs do
not define `/app` behavior.

Do not remove legacy routes or shared `lib/maya/` modules without importer checks and a dedicated
spec. Feed Planner is still live and is not the same thing as the retired Maya Feed tab.

### Admin

The admin navigation is:

- Home
- Content
- Support
- Tools

Do not add a new admin page, metric card, or recurring admin email without consolidating an existing
surface. Money comes only from Stripe or qualifying `stripe_payments` rows. Behavioral analytics are
not revenue truth.

### Product and funnel separation

- `KIT` / Starter Kit is the iPhone and selfie-education path.
- `PROMPT` / AI Prompts is the AI-photo path and bridges to Prompt Vault or the AI Photos Kit.
- Warm trust bridges to Visibility To Paid / Work With Me.
- SUITE is the recurring monthly creation system.

Do not reuse the Starter Kit checkout or entitlement for the AI Photos Kit.

## Automation Ownership

Read `docs/AUTOMATION_ROSTER.md` before changing any scheduled or event-driven workflow.

- Customer, payment, fulfillment, and lifecycle automations live in the repo and run on Vercel.
- Claude Cowork may draft and monitor, but it does not send customer messages automatically.
- Instagram/ManyChat inbox review is on demand in the signed-in ManyChat inbox. There is no repo
  DM ingestion, drafting, approval, or sending system.
- Codex hosts no business automations. Code-hygiene automation is the only allowed Codex lane.
- ManyChat, Resend, Stripe, and similar services provide delivery mechanics; business logic remains
  in the repo or in an attended Sandra workflow.

The old weekly content-brief repo pipeline is disabled, not yet deleted. Its Phase 2B deletion stays
held until the replacement Cowork weekly task completes a real Monday run and is verified.

## Safety Rules

1. Live users exist. Inspect before editing and minimize blast radius.
2. Never use `git reset --hard` or discard unrelated dirty work.
3. Use a clean `codex/` branch or isolated worktree for implementation.
4. Bugfixes require a failing test or a documented reproduction before the patch.
5. No broad code refactors without an explicit spec.
6. Outward-facing copy stays draft-only until Sandra approves it.
7. Never print secrets. Report only presence, scope, and whether identifiers resolve.
8. GitHub Actions workflows are intentionally disabled to avoid paid-run charges. Run required
   checks locally and do not re-enable workflows without Sandra's approval.

## File Map

| Area                          | Current owner                                                        |
| ----------------------------- | -------------------------------------------------------------------- |
| Business context              | `CLAUDE.md`                                                          |
| Active task queue             | `tasks/README.md`, then the named spec in `tasks/`                   |
| Documentation index           | `docs/README.md`                                                     |
| Automation map                | `docs/AUTOMATION_ROSTER.md`                                          |
| Member app                    | `app/app/`, `components/app-v3/`, `lib/app-v3/`, `app/api/app-v3/`   |
| Maya model routing            | `lib/maya/openrouter.ts`                                             |
| Payments                      | `lib/payments/handlers/`, `lib/payments/lifecycle/`, Stripe webhooks |
| Revenue truth helpers         | `lib/revenue/single-source.ts`                                       |
| Email sending                 | `lib/email/`, `lib/resend/`, `app/api/cron/`                         |
| Prompt Vault content          | `lib/ai-prompts/`, `docs/PROMPT_VAULT_ADD_COLLECTION_SOP.md`         |
| Admin reporting               | `lib/admin/home-report.ts`, `app/admin/`                             |
| Cron registration             | `vercel.json`                                                        |
| Production error monitoring   | Sentry plus `lib/admin-error-log.ts`                                 |
| Historical plans and evidence | `docs/archive/`                                                      |

## Verification

Use checks in proportion to risk. Before a production code merge, the normal local gate is:

```bash
pnpm type-check:ci
pnpm verify:repo
pnpm exec vitest run
git diff --check
```

For localized changes, also run targeted ESLint and the affected tests first. Vercel must reach
`Ready`, and `https://sselfie.ai` must return a successful response after following redirects.

## Documentation Rule

Active docs may state current rules. Archived docs may preserve historical reasoning, old paths,
old metrics, and superseded plans, but they must never be treated as implementation authority.

If a document claims to be current while contradicting `CLAUDE.md`, the protected contracts above,
or live code, either update it, add a superseded notice, or move it to `docs/archive/`.

# SSELFIE repository instructions

This is the native Codex project instruction file for the live SSELFIE Studio application.
Keep it short. Work planning, goals, skills, connectors, plugins, and delegated agents belong to
the Codex/ChatGPT application, not this repository.

## Repository identity

- Live app: `/Users/MD760HA/ACTIVE/sselfie-9g`
- GitHub: `sandrasocial/sselfie-9g`
- Production: `https://sselfie.ai`
- Hosting: Vercel, auto-deployed from `main`
- The old `/Users/MD760HA/sselfie-9g` folder is retired and must not be edited.
- Never copy `lib/maya/` from another repository.

Read `AS-BUILT.md` for stable technical facts. Verify changing business, customer, payment, and
production facts from the live system instead of trusting dated Markdown.

## Native delivery workflow

- Sandra's current request is the implementation contract. Do not create repo task files.
- Do not add repo-local agent definitions, skills, Codex/Claude configuration, or AI task queues.
- Use a short-lived `codex/` branch or isolated worktree for implementation.
- Do not open pull requests. Merge the tested branch locally into `main` and push `main` directly.
- Preserve unrelated local changes. Stage explicit paths only; never use `git add -A` in a dirty tree.
- After production verification, delete the merged branch and clean worktree.
- Record only a short completed release note: what changed, why, verification, and deployed SHA.

## Safety

- Live users exist. Preserve customer access, entitlements, prices, credits, and historical buyers.
- Money truth comes from Stripe or qualifying `stripe_payments`; analytics is behavior evidence.
- Payment, webhook, subscription, credit, refund, and fulfillment changes require targeted tests and
  live-system verification.
- Never send email, publish content, charge, refund, or contact customers unless explicitly authorized.
- Keep secrets and customer data out of Git and logs.
- Preserve `docs/product/MAYA_CREATIVE_FREEZE_2026-07-15.md` unless Sandra explicitly approves a
  creative-system change with regression coverage.

## Copy and design

For customer-facing work, use only the relevant current sources:

- `docs/brand/SSELFIE_BRAND_CONSTITUTION.md`
- `docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md`
- `docs/brand/SANDRA_VOICE_OS_2026-07-16.md`
- `docs/SSELFIE_DESIGN_SYSTEM.md`

Sandra approves new images and social posts. Meaningful price, billing, entitlement, or customer
promise changes still require her explicit approval. The current SUITE visual design is approved and
should be reused rather than redesigned without a specific reason.

## Completion gate

Before merging, run checks proportional to the change, including targeted tests and lint plus:

```bash
pnpm type-check:ci
pnpm verify:repo
pnpm exec vitest run
pnpm build
git diff --check
```

After pushing `main`, confirm Vercel is Ready for the exact SHA and exercise the affected production
journey on desktop and mobile. A local build or screenshot alone is not completion.

# Maya App Cleanup Execution Plan

Generated from parallel audit run on 2026-03-05.

Source reports:
- `output/automation/repo-map-20260305-090353.md`
- `output/automation/dead-code-scan-20260305-090415.md`
- `output/automation/journey-scan-20260305-090351.md`
- `output/automation/prompt-authority-check-20260305-090352.md`
- `output/automation/integration-health-20260305-090351.md`
- `output/automation/architecture-simplifier-20260305-090353.md`
- `output/automation/upgrade-readiness-20260305-090355.md`
- `output/automation/gravity-scan-20260305-090353.md`

## Current baseline

- API routes: `467`
- Lib modules: `387`
- Cron routes: `37`
- Prompt-like sources: `56` (`51` bypass authority)
- Outdated dependencies: `76`

## P0 (Do now, low risk, unblock stability)

1. Remove stale backup artifacts from active source tree.
Status: `DONE` in this pass.
Files removed:
- `components/sselfie/maya/hooks/use-maya-chat.ts.bak`
- `components/sselfie/maya-chat-screen.tsx.bak`

2. Create canonical Replicate module seam.
Status: `DONE` in this pass.
Files added:
- `lib/replicate/index.ts`

3. Fix journey scanner false-positive on root route (`/`).
Status: `DONE` in this pass.
Files changed:
- `scripts/audit/user-journey-scanner.ts`

4. Confirm Upstash env wiring for all environments.
Status: `TODO`
Action:
- Ensure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set in dev and production.
Gate:
- `pnpm audit:integration-health` reports Upstash as `ok`.

## P1 (Next, medium risk, highest payoff)

1. Prompt authority consolidation slice.
Why:
- `51` shadow prompt sites create output drift and brand inconsistency.
Scope:
- Start with top 10 user-facing prompt routes from shadow list.
- Route each through one authority path without changing response schema.
Gate:
- Shadow prompt count decreases by at least 10.
- `pnpm build`, `pnpm type-check`, prompt tests pass.

2. Orphan API route verification and cleanup.
Why:
- `60` candidates are likely unused or admin-only leftovers.
Scope:
- Verify call graph and production hits before delete.
- Remove only routes with no callers and no external webhook/cron use.
Gate:
- No broken UI/API flows in manual smoke test.
- API route count decreases with no regression.

3. Duplicate module family cleanup.
Why:
- Duplicates in chat, credits, feed hooks, and email templates increase bug surface.
Scope:
- Consolidate one family at a time (`data/admin-agent` vs `data/maya`, feed hook duplicates, archived email duplicates).
Gate:
- Contract tests pass for each family before and after.

## P2 (After stabilization, higher effort)

1. Break down high-gravity monster files with test scaffolding first.
Top files:
- `components/sselfie/maya-chat-screen.tsx`
- `app/api/maya/generate-concepts/route.ts`
- `app/api/webhooks/stripe/route.ts`
- `lib/generation/prompt/legacy-authority.ts`

2. Upgrade program in isolated batches.
Why:
- `76` outdated packages, several high-risk major jumps in testing/tooling.
Scope:
- Batch A runtime/core, Batch B test tooling, Batch C UI libraries.
Gate:
- Build and smoke tests pass each batch before next batch.

## Execution cadence

1. Run baseline:
- `pnpm audit:control`

2. Execute one cleanup slice at a time.

3. Re-run baseline after every slice and compare deltas:
- Route count
- Shadow prompt count
- Duplicate family count
- High-gravity file complexity trend

## Merge criteria before production

- No `.bak` or stale source artifacts in active tree.
- Upstash and core integrations healthy.
- Prompt authority shadow count materially reduced from baseline.
- No new route aliases; canonical surfaces preserved.
- `pnpm type-check` and `pnpm build` pass.

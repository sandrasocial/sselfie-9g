# Dependency, Script, And Docs Hygiene

Last updated: 2026-07-09

This file records the Phase 7 cleanup state. `package.json`, `pnpm-lock.yaml`, and the live scripts
are authoritative for current package behavior. Dependency counts and audit findings below are
historical snapshots unless re-run.

## Package Manager

- pnpm is canonical for local development, GitHub Actions, Vercel builds, and repo scripts.
- `package.json` pins `"packageManager": "pnpm@10.23.0"` and requires Node 20 or newer.
- `pnpm-lock.yaml` is the only committed package lockfile.
- `package-lock.json` was removed after converting the daily automation workflow to `pnpm install --frozen-lockfile`.
- Live scripts and setup docs should use `pnpm`, `pnpm <script>`, or `pnpm exec <binary>`.
- Archived historical docs under `docs/archive` may still mention npm because they are records, not current instructions.

## Dependency Audit

- Removed `@vercel/postgres`; the app uses Neon directly through `@neondatabase/serverless`.
- Removed `nodemailer`; outbound mail uses Resend and repo email helpers.
- Kept `@upstash/vector`; `lib/upstash-vector.ts` is the active wrapper for codebase indexing and semantic search.
- The 2026-05-08 snapshot found broad dependency and vulnerability debt. Do not reuse those counts
  as current facts. Re-run the audit, then handle framework or security upgrades as a dedicated,
  controlled phase with build and customer/Maya smoke proof.

## Core Diagnostics

Run the compact suite with:

```bash
pnpm diagnostics:core
```

Required checks:

- `pnpm verify:repo`
- `pnpm routes:inventory`
- `pnpm audit:integration-health`
- `pnpm automation:journey-smoke`
- `pnpm audit:maya-quality`

Advisory checks:

- `pnpm audit:brand-consistency`
- `pnpm lint:tokens`

Advisory checks are allowed to report existing drift without failing `pnpm diagnostics:core`. Brand copy and token hardcoding still have known debt after Phase 6.

## Strategy Docs

Live documentation order:

1. `CLAUDE.md`
2. `docs/CODEX_CONTEXT.md`
3. `docs/README.md`
4. `tasks/README.md`
5. The current surface contract named by those indexes

For automation ownership, `docs/AUTOMATION_ROSTER.md` supersedes older automation inventories and
cleanup plans. `docs/source-of-truth/route-cron-diet.md` remains historical route-cleanup evidence;
`vercel.json` and live route code define the actual schedule.

Labeled as planning snapshots in Phase 7:

- `docs/archive/2026-07-09-documentation-cleanup/ACADEMY-BUYER-HOME-PLAN-2026-04-24.md`
- `docs/archive/2026-07-09-documentation-cleanup/MAYA_2_0_E2E_EXECUTION_PLAN_2026-05-01.md`
- `docs/archive/2026-07-09-documentation-cleanup/MAYA_AUDIT_AND_REPOSITIONING_2026-05-01.md`

Those files can remain useful background, but they must not compete with live source-of-truth docs when implementation decisions disagree.

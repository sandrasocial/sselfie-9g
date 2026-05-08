# Dependency, Script, And Docs Hygiene

Last updated: 2026-05-08

This file records the Phase 7 cleanup state. It is source-of-truth for package-manager policy, stale dependency decisions, the small diagnostics suite, and strategy-doc status labels until a later cleanup phase replaces it.

## Package Manager

- pnpm is canonical for local development, GitHub Actions, Vercel builds, and repo scripts.
- `package.json` pins `"packageManager": "pnpm@10.23.0"` and requires Node 20 or newer.
- `pnpm-lock.yaml` is the only committed package lockfile.
- `package-lock.json` was removed after converting the daily automation workflow to `pnpm install --frozen-lockfile`.
- Live scripts and setup docs should use `pnpm`, `pnpm <script>`, or `pnpm exec <binary>`.
- Archived historical docs under `docs/_archive` may still mention npm because they are records, not current instructions.

## Dependency Audit

- Removed `@vercel/postgres`; the app uses Neon directly through `@neondatabase/serverless`.
- Removed `nodemailer`; outbound mail uses Resend and repo email helpers.
- Kept `@upstash/vector`; `lib/upstash-vector.ts` is the active wrapper for codebase indexing and semantic search.
- Current broad follow-up debt: 38 dependencies still use `"latest"`. Do not pin them all in one sweep; move high-risk runtime packages first in a separate upgrade branch with build and smoke proof.
- Known audit warning: `pnpm audit --prod` currently reports 31 vulnerabilities (14 high, 16 moderate, 1 low), led by Next 16.0.7 advisories plus transitive Sentry/Vercel Blob tooling dependencies. Treat framework/security upgrades as their own controlled phase with build and customer/Maya smoke proof.

## Core Diagnostics

Run the compact suite with:

```bash
pnpm diagnostics:core
```

Required checks:

- `pnpm verify:repo`
- `pnpm routes:inventory`
- `pnpm routes:classify`
- `pnpm audit:integration-health`
- `pnpm automation:journey-smoke`
- `pnpm audit:maya-quality`

Advisory checks:

- `pnpm audit:brand-consistency`
- `pnpm lint:tokens`

Advisory checks are allowed to report existing drift without failing `pnpm diagnostics:core`. Brand copy and token hardcoding still have known debt after Phase 6.

## Strategy Docs

Live source-of-truth order:

1. `CLAUDE.md`
2. `docs/CODEX_CONTEXT.md`
3. `docs/source-of-truth/route-cron-diet.md`
4. `docs/source-of-truth/dependency-script-docs-hygiene.md`
5. `docs/SELFIE-EDUCATION-REPOSITION-PLAN-2026-04-23.md`, for the approved education reposition until `CLAUDE.md` supersedes it

Labeled as planning snapshots in Phase 7:

- `docs/ACADEMY-BUYER-HOME-PLAN-2026-04-24.md`
- `docs/MAYA_2_0_E2E_EXECUTION_PLAN_2026-05-01.md`
- `docs/MAYA_AUDIT_AND_REPOSITIONING_2026-05-01.md`

Those files can remain useful background, but they must not compete with live source-of-truth docs when implementation decisions disagree.

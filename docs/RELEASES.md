# Completed releases

## 2026-07-20 — Native Codex workflow cleanup

Removed repo-hosted AI task queues, custom agents, duplicated skills, tool-specific configuration,
generated automation commits, and their meta-tests. SSELFIE now uses native Codex plans, goals,
skills, connectors, and worktrees. The repository retains a short native `AGENTS.md`, product code,
customer/payment automations, product tests, canonical brand sources, and release safeguards.

Why: competing agent systems and stale task files were creating drift and making completed work look
unfinished.

## 2026-07-20 — Prompt Vault buyer commercial path

Shipped the paid Vault buyer path: an optional SUITE offer at €49 for the first month and €97/month
afterward, plus a clear $39 Presets Bundle downsell. Vault access remains independent and existing
SUITE members do not see the sales offer. A paid Vault token is verified server-side before the
one-time Stripe discount is applied.

Added separate measurement for offer views, SUITE clicks, declines, Presets clicks, checkout starts,
and successful Stripe payments. Corrected new monthly SUITE checkouts from the stale $97 USD price
pointer to the existing €97 EUR price; existing subscriptions were not changed.

Production proof: commit `5705e969`, Vercel deployment `dpl_cYSVo6yZ1cBDrettgvSCkDj2Lyu8`, clean
Turbopack build, five public route smoke checks, 19 focused tests, CI typecheck, repository invariants,
voice rules, forged-offer fallback, and live Stripe verification of €49 once then €97 monthly.

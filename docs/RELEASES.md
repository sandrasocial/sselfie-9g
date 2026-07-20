# Completed releases

## 2026-07-20 — Homepage commercial path

Connected the public homepage to the existing commercial journey without adding a product. The
current path is now Free AI Prompts to Prompt Vault to SSELFIE SUITE, with a real mobile navigation,
the approved SUITE product walkthrough, and a clear choice between the one-time Vault and ongoing
SUITE membership. Older generic homepage sections and stale navigation destinations were removed.

Why: visitors can now understand the first useful step, see the current product, and reach the paid
offers without guessing which SSELFIE page is current. Claude's separately approved Maya carousel
copy contract was preserved and shipped in the same linear main history; its prompt source was not
edited as part of the homepage release.

Production proof: release commit `01f2d316`, Vercel deployment
`dpl_FUf5Fh3igUhJfMakh53uiCCv9bkW`, CI typecheck, production build, repository invariants, voice
rules, 1,586 passing tests with 5 intentionally skipped, and 37/37 isolated reruns for the six tests
that timed out or leaked cleanup state under the full-suite load. Live desktop and 390px mobile QA
confirmed the homepage, SUITE walkthrough, 48px mobile menu targets, zero horizontal overflow,
working Prompt Vault and SUITE destinations, and zero browser console errors.

## 2026-07-20 — Prompt Vault buyer path completion

Completed the existing Vault-to-SUITE path without adding a new product or a new automated email.
The SUITE offer now appears only after a buyer copies her first Vault prompt. That first useful
action is measured separately from offer views and clicks. Subscription payment rows now retain the
original Vault checkout attribution and distinguish first payments from renewals.

Removed the unreachable retired $197 Day 3 email code and its stale admin reporting. Historical
database records were preserved. The active buyer email schedule remains unchanged.

Production proof: feature commit `b88ef789`, Vercel deployment
`dpl_58BYEjhT8uCGqSacgyEFy7psXPcr`, 1,587 tests passed with 5 intentionally skipped, CI typecheck,
production build, repository invariants, voice rules, desktop and 390px mobile buyer-flow checks,
and live non-transactional verification of the €49 first-month SUITE checkout and $39 Presets Bundle
downsell. No email was entered, no checkout session was created, and no payment was attempted.

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

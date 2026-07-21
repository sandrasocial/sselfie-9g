# Completed releases

## 2026-07-21 — Maya inline action protocol

Added one Sandra-only Maya action flow for image, caption, combined creation, Calendar assignment,
and undo while preserving the existing generation, credit, Gallery, Calendar, and publishing
boundaries. Paid results now save to Gallery before an explicit Calendar apply; applying snapshots
the prior post, partial caption failures stay recoverable, retries are idempotent, and undo restores
the assignment without deleting the generated asset or refunding a successful generation.

Production proof: feature SHA `b66cdb5a`, Vercel deployment
`dpl_yjENWWpGGPqVcbbMTuYsUTpZQfap`, 1,714 passing tests with 6 intentionally skipped, 14 desktop
and 390x844 Playwright journeys, CI typecheck, repository invariants, production build, and 22/22
creative-freeze checks. Authenticated production QA created two paid Gallery assets, verified
preview/cancel/apply/reload/failure/retry/undo, returned the unposted QA grid to 0 ready posts, and
left both assets in Gallery. Nothing was published and protected prompt hashes remained unchanged.

## 2026-07-21 — Checkout recovery and email runtime safety

Hardened the live Prompt Vault checkout recovery so successful buyers are excluded before every
touch, each recipient and stage is idempotent, and follow-up stages have durable atomic markers.
Bounded the AI photoshoot nurture and subscriber win-back batches so their cron runs can finish
inside Vercel's function limits. Added safe dry-run paths and moved the Prompt Vault Stripe form
ahead of decorative proof on mobile while preserving the approved desktop design and existing copy.

Production proof: feature commit `cc0c256b`, Vercel deployment
`dpl_2RKNJLcmquU2Ar4moYrx9TVQmRqn`, exact Git commit verified in the build log, 1,692 passing tests,
CI typecheck, changed-file lint with zero errors, repository invariants, production build, and live
desktop plus 390px mobile checkout QA. All three repaired email jobs completed live-data dry-runs
with zero sends; the production recovery columns were verified and the QA checkout record was
removed from recovery eligibility. No manual customer email was sent.

## 2026-07-20 — Free Prompts email path alignment

Aligned the active Free AI Prompts nurture with the current commercial path without adding or
removing a product. Delivery and Day 1 now focus only on getting the first useful image. Day 5 is
the first paid bridge, and Days 7, 9, and 11 continue to the existing $37 Prompt Vault. The separate
AI Photos Kit still exists, but the same lead is no longer switched between two $37 offers inside
one nurture sequence.

The copy now uses Sandra's current voice and states AI limitations honestly. It does not promise
that a face is technically locked, guarantee a two-minute result, invent urgency, or imply that a
buyer needs to purchase before trying the free result. The approved Stone email design and existing
Vault recovery sequence were preserved. No manual email was sent during this release.

Live evidence used: the free prompt delivery was the strongest evergreen click driver, while exact
successful Stripe rows showed that Prompt Vault recovery was already producing paid sales. The
Prompt Vault admin now reports those recovered sales and dollars from successful Stripe payments,
not email conversion flags. At production verification, the selected 14-day view showed 2 recovered
sales and $74 recovered revenue.

Production proof: release commit `6b8f3c21`, Vercel deployment
`dpl_4aPpmo7vNHyUc4B3yRdNjVS2a1AD`, complete Vitest suite, focused commercial tests, CI typecheck,
changed-file lint, repository invariants, voice rules, production build, visual inspection of all six
rendered emails, and authenticated production admin QA. The live Free Prompts and Prompt Vault pages
loaded with meaningful content, zero browser console errors, and no framework error overlay.

## 2026-07-20 — Membership credit claim cleanup

Aligned the remaining membership, account, free-credit, product, email-draft, and internal pricing
claims with the live policy: 100 included credits reset each billing month, while purchased top-ups
stay available. Retired unsafe legacy repair scripts. The separate One Selfie 200-credit pass and
paid 200-credit top-up were preserved.

Production proof: feature commit `bbd5496d`, Vercel deployment
`dpl_ERUWGMSy7hJZhb3VLLcQpGg2uyRW`, exact Git commit verified in the build log, full test suite,
CI typecheck, repository invariants, changed-file lint with zero errors, production build, healthy
database/cache/auth checks, and clean desktop and 390px mobile browser checks. The read-only live
postcheck found zero stale email claims, Stripe price metadata at 100, and zero resumable
subscriptions needing alignment. No email was sent and no customer balance or payment was changed.

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

## 2026-07-20 — Membership credit cost controls

Changed SUITE membership from an additive 200-credit grant to a 100-credit reset each paid membership
month. Unused included credits no longer accumulate. Unused separately purchased top-up credits remain
available. Monthly resets now require a verified billing reference and are idempotent under concurrent
webhooks. Annual members receive the same monthly reset cadence from their verified annual payment.

Moved the remaining legacy photoshoot and Calendar feed-image paths to reserve credits before calling
the paid image provider. Insufficient balances now stop before provider cost, and failed provider starts
refund the reservation. Retired the old additive cron and manual backfill paths. The separate One Selfie
Visibility Bundle keeps its promised fixed 200-credit pass.

Production proof: feature commit `7e71dcc3`, Vercel deployment
`dpl_EP4xegbvhFZ2mTA4wccPvFVMuV9A`, exact Git commit verified in the deployment log, CI typecheck,
repository invariants, changed-file lint with zero errors, focused credit/payment tests, and a successful
webpack production build. Live desktop and 390px mobile QA confirmed the 100-credit promise, no overflow,
and zero browser console errors. Nine payment-verified active memberships were reset from 7,999 credits
to 1,220 total, including all 320 unused purchased top-up credits. Nine matching production ledger entries
were verified. The broad test run passed 350 files; unrelated existing sandbox, timing, and shared-mock
failures were isolated from this release, while the full credit-control boundary suite passed cleanly.

## 2026-07-21 — Maya writing API cost controls

Reduced Maya's writing cost without weakening the creative work. Simple clarification, Calendar
guidance, weekly recommendations, member briefs, workbook chat, and prompt-pack requests now use the
smaller model. Complex creative plans keep the stronger model with output limits sized to the actual
format. Create sends a shorter recent-message window, Calendar no longer repeats every saved caption,
and personalized recommendations are cached once per member and context each day.

Added request-level usage and cost records across the centralized Maya model path without storing
prompt or response content. The meter records feature, task, model, token use, status, timing, and
provider or estimated cost so future pricing decisions can use real production evidence.

Production proof: feature commit `10feed39`, Vercel deployment
`dpl_6erscnq3DKiEL2MQ9LZY9WMcYzJJ`, exact Git commit verified in the build log, CI typecheck,
repository invariants, 86 focused Maya and Calendar tests, full serial suite with 1,666 passing tests
and one confirmed pre-existing quote-style contract mismatch, and a successful Turbopack production
build. Authenticated desktop and 390px mobile QA loaded Create with zero browser errors or horizontal
overflow. The live recommendation used Haiku, logged an estimated `$0.005649` request, and created one
daily cache row; two subsequent reloads reused it without another AI call.

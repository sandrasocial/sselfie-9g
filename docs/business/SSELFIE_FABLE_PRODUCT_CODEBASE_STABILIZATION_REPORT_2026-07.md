# SSELFIE Product + Codebase Stabilization Report — 2026-07-06

Auditor/implementer: Claude Fable. Branch: `codex/fable-stabilization-20260706`.
Every claim below was verified against the live Neon DB, the live Stripe API, the repo, or a test run before being written down.

## Outcome in one paragraph

The biggest verified problem was revenue double-counting: **84 rows in `stripe_payments` recorded the same charge twice under different Stripe id types** (`pi_`/`ch_`/`py_` next to the invoice's own row), inflating DB revenue vs live Stripe. All 84 were verified (SQL invoice-linkage plus live Stripe `invoice.payments` checks), marked `status='duplicate'` with a reversible `metadata.dedup_audit` trail, and the last-30-day DB totals now match live Stripe **exactly** ($1,469 + €891 gross). The writers that caused it (two backfill scripts, one env-gated cron, and a latent key-flip in the invoice webhook handler) are fixed, and a DB unique index now makes "one invoice = one revenue row" structural. Separately, the admin "Unexpected token A" bug class is fixed with one shared JSON-guard helper. Most items on the original audit list (all 7 Maya/Suite UX items, schema-drift columns, brief queueing) were **already fixed on main** — verified with file-level evidence, no changes needed.

---

## 1. Revenue reporting: the double-count, root cause, and fix

### What was wrong (verified)

- Live Stripe last-30d: $1,469 + €891 gross. `stripe_payments` said $1,862 + €988 — over by exactly $393 + €97.
- The gap was 8 June rows (`pi_3...`) recording subscription renewals a second time as `one_time_session`, next to the correct `in_...` rows. Each was verified against live Stripe: the `pi_` is the exact payment behind the paired invoice (`invoice.payments` linkage, checked 2026-07-06).
- Full history had two more duplicate populations: 15 `ch_`/`py_` rows (Apr–May 2026) sharing `stripe_invoice_id` with an `in_` row, and 61 older `pi_`+`ch_`/`py_` pairs (Nov 2025–Jan 2026) where the same invoice's charge was stored under two ids. Total: **84 duplicate rows, ~$4,550 of phantom revenue**.

### Root cause (three writers, one design flaw)

The design flaw: revenue rows were keyed on `chargeId || paymentIntentId || invoice.id`, which depends on which fields the Stripe API version happens to include. Across API-version eras the same renewal got keyed differently, and the unique constraint on `stripe_payment_id` can't see that `pi_X` and `in_Y` are the same money.

1. `scripts/backfill-stripe-payments.ts` — its payment-intent pass had **no skip at all** for invoice-linked PIs, so any run inserted a `pi_` row next to the invoice row (the 61 older pairs).
2. `scripts/backfill/backfill-stripe-payments-recent.ts` — its guard was `if (pi.invoice) continue`, but the pinned Clover API removed `pi.invoice`, so the guard silently no-oped; simultaneously its invoice pass no-oped (`invoice.subscription` also moved), so renewals were recorded ONLY as mislabeled one-time `pi_` rows (the 8 June rows).
3. `app/api/cron/reconcile-credits/route.ts` (env-gated by `RECONCILE_STRIPE_PAYMENTS`, currently off) — same two dead guards, plus an `ON CONFLICT ... SET status='succeeded'` that would have resurrected marked duplicates if ever enabled.
4. `lib/payments/lifecycle/invoice-paid.ts` (live webhook) — writes correctly today (keys resolve to `invoice.id` on Clover), but the key-flip fallback was still in the code, one API bump away from re-creating the bug.

### What I changed

| Change | Where |
|---|---|
| Marked 84 verified duplicates `status='duplicate'` + `metadata.dedup_audit` (prior status, which invoice/row it duplicates, marked_by/at). Reversible; no rows deleted. | live Neon (one-off, audited) |
| Deterministic invoice keying: invoice-based rows always keyed on `invoice.id` | `lib/payments/lifecycle/invoice-paid.ts`, both backfill scripts, reconcile-credits cron |
| Invoices-first ordering + linked-payment-id skip sets (works on both legacy and Clover payload shapes via `invoice.payments` expand) | both backfill scripts, reconcile-credits cron |
| Clover dual-shape `invoice.parent.subscription_details.subscription` reads (same pattern as the 2026-06-12 webhook fix) | recent backfill script, reconcile-credits cron |
| `WHERE status IS DISTINCT FROM 'duplicate'` guards on every `ON CONFLICT DO UPDATE` in these writers, so marked rows can never be resurrected | all three script/cron writers |
| **New partial unique index `idx_stripe_payments_invoice_unique`** — one succeeded/paid row per `stripe_invoice_id`, applied live + committed | `db/migrations/61-stripe-payments-invoice-unique-index.sql` |
| Regression test: revenue row keyed `in_...` even when legacy `charge`/`payment_intent` fields are present on the payload | `tests/invoice-paid-first-payment-retry.test.ts` (6/6 pass) |

### Verified result

Post-cleanup, `stripe_payments` last-30d = **43 charges $1,469 + 3 charges €891** — identical to live Stripe. All reporting surfaces (admin `/admin` home, revenue-truth scorecard, daily Sandra briefing, growth-truth, `getDBRevenueMetrics`) read through `status IN ('succeeded','paid')`, so they were all corrected by the data fix with zero query changes. All-time live totals now: $14,870.12 (365 charges) + €891 (EUR pricing began mid-June).

**Operating note (unchanged):** live Stripe remains the source of truth for money and member counts. The DB is now consistent with it, which is the point — the numbers should stop disagreeing.

## 2. Admin "Unexpected token A" — fixed with one shared helper

The guard against Vercel's plain-text error pages had been written **three separate times** in three files and most other admin surfaces were unguarded. Now:

- New `lib/admin/safe-fetch-json.ts` — `readJsonResponse` (strict, throws readable error) + `readAdminJson` (lenient, returns `{success:false, error}` with a 504-specific message). Unit tested (`tests/admin-safe-fetch-json.test.ts`, 7/7).
- `content-brief-client` and `post-now-client` now import it instead of defining their own; contract tests updated to point at the shared helper.
- Retrofitted every unguarded admin call site: `vault-drop-email-preview` (4), `content-story-client` (3), `content-kit-client` (3), `content-demo-client` (1), `customer-support` page (4 — real errors now surface instead of masking as "Network error"), `webhook-review` page (1 — was an uncaught crash path).
- Left alone: `shoot-studio-client` (has its own guard with a better shoot-specific message), `credit-manager` (content-type check works), `academy/page.tsx` (success paths already `response.ok`-guarded; see "For Codex" below).

## 3. What was already fixed — verified, do not re-open

- **All 7 Maya/Suite UX items from the audit brief are DONE on main** (verified in code, file-level evidence): selfie CTA opens the reference manager modal, not chat (`visual-front-door.tsx`); identity vs inspiration references separated end-to-end (distinct `image_type` values, blob folders, and generate-payload fields); "Choose your style" wording live, no user-facing "visual world" remains; 6-style cap is a client-side "Show all N styles" toggle (API/DB unlimited, front-door masonry unlimited); the chosen shot's `stylePrompt` reaches Maya's system prompt verbatim (whitespace-normalized, 2600-char cap, no LLM re-summarization); Text Studio is deleted with test enforcement and text is baked via gpt-image-2 with no CSS fallback on customer results; Maya asks the with-text/without-text question before any graphic format and suggested text is copyable in-chat.
- **Schema drift (event_name/anon_id, instagram_username, captured_on, tool_name/error_message/context, resolved/flag_reason):** zero wrong-column references exist in the repo; live Neon schema verified against every consumer; `tests/suite-trial-contract.test.ts` already guards the exact old names. The audit's premise was stale.
- **Weekly brief queueing:** already queued (`content_brief_jobs` + `*/5min` cron drain, client polls; test-locked in `tests/content-brief-two-pass.test.ts`). No browser-blocking path remains.
- **Brief writes full posts — BY DESIGN.** Sandra changed the deliverable contract 2026-07-03 ("SEVEN complete, filmable pieces... zero further writing", `lib/content-engine/brief-generator.ts`). The audit brief's "should not write full posts" is superseded by her newer decision — not changed. Anti-repetition rules for Vault visuals (no repeated mirror-selfie/dark-cafe/window/car scenes) shipped 2026-06-26 and the 2026-07-03 stored sample shows real variety.
- **Daily Sandra briefing:** metrics + a verbatim echo of one weekly-brief piece; its only LLM call is prompt-forbidden from inventing content. Clean.

## 4. Housekeeping done

- Deleted `tests/funnel-cleanup-evidence.test.ts` (referenced a module removed in `8992304a`) + its `vitest.config.ts` quarantine entry + its `tests/QUARANTINE.md` row.
- Committed tracked DDL for `webhook_events_needs_review` (`db/migrations/62-...`) — the table existed only in prod with no source-of-truth schema in the repo.
- Freed ~11GB disk (machine was at 100%, blocking all work): cleared the Codex app cache and `node_modules` inside stale `~/.codex/worktrees/*` (sources untouched, reinstallable).

## 5. Tests run

- `tests/invoice-paid-first-payment-retry.test.ts` 6/6 (incl. new keying regression)
- `tests/admin-safe-fetch-json.test.ts` 7/7 (new)
- `tests/content-brief-two-pass.test.ts` 28/28, `tests/post-now.test.ts` 18/18 (updated assertions)
- `tests/stripe-payment-recording.test.ts`, `tests/suite-trial-contract.test.ts`, `tests/entitle-live-mode-gates.test.ts` — all pass
- `pnpm type-check:ci` clean · `pnpm verify:repo` clean · eslint on all touched files: 0 errors (only the repo's standing warning classes)
- Not done: browser QA of `/app` Maya flow — nothing in this change set touches it (all Maya items verified as already-shipped code); admin changes are error-path behavior covered by unit/contract tests.

## 6. Known risks

- The duplicate marking is data-level and reversible (`metadata.dedup_audit.prior_status`), but any external tool that reads `stripe_payments` WITHOUT a status filter will now see 84 `status='duplicate'` rows. Repo code all filters correctly.
- The unique index makes a second same-invoice succeeded/paid insert FAIL LOUDLY (webhook would retry / script would log). That is intended — loud beats silent double-counting — but if a legitimate partial-payment product is ever introduced, this index must be revisited.
- `scripts/backfill-stripe-payments.ts` still pins the old `acacia` API version and has pre-existing standalone type errors (CI-excluded, tsx-run). Hardened, not modernized.

## 7. Needs Sandra / next for Codex

- **Sandra:** nothing here needs approval to operate — no emails, no copy, no Stripe products touched. FYI: DB and Stripe now agree; when a dashboard and Stripe disagree in future, trust Stripe and flag it.
- **Codex next:**
  1. `app/admin/academy/page.tsx` — largest admin file (25 fetch calls, mixed patterns); migrate to `readAdminJson`/`readJsonResponse` in a focused pass.
  2. `ENTITLE-01` still has no task spec (26 stale test-mode "active" membership rows found 2026-06-11).
  3. Optional: deterministic week-over-week duplicate-visual check for the content brief (current guard is prompt-level only; the one stored sample looks good).
  4. Repo hygiene: ~35 stale local `codex/*` branches contradict AS-BUILT's "only main exists" rule — prune after confirming merged.
- **Do not touch again:** Maya/Suite UX items in §3 (shipped + test-locked); the brief's full-post deliverable contract (Sandra's 2026-07-03 decision); `stripe_payments` duplicate rows (marked, audited — don't "clean them up" further or delete them).

---

# Part 2 — Maya live-QA fixes (2026-07-06, branch codex/maya-qa-fixes-20260706)

Sandra hand-tested Maya image generation and reported 8 issues. Each was root-caused in code before touching anything; the verified bugs shipped same-day, the feature work became two grounded specs.

## Bugs found + fixed (all root-caused, test-locked)

1. **Chat selfie management** — every selfie affordance inside chat ("Replace selfie", "Add your selfie", "Use a past selfie", the inline upload card, the primary CTA) opened a raw file picker or the old single-grid picker; the full `SelfieReferenceManagerModal` was only wired to the front door. All five now open the manager modal, committing the selfie IN-thread (never the front door's new-session path). Old `ReferenceLibraryModal` unmounted from chat (component file left for Codex cleanup).
2. **Mid-thread format chips were silent no-ops** — two staleness bugs: `handlePickFormat` skipped its reset when re-tapping the SAME format, and Maya's own `set_format` (typed "make me a carousel") never re-armed `lastPulledFormatRef`. Both left the text-overlay gate stale, so the inline question cards never re-appeared and no new pull happened. Both paths now always re-arm.
3. **"Broken first image"** — NOT a moved/deleted blob (verified: nothing rewrites app-v3 image URLs; reconcile crons can't match app-v3 rows). Real causes: zero `onError` handling on generated-image tiles (one transient Blob-CDN first-paint miss = permanently broken tile) + a silently swallowed gallery DB insert. Fixed: one delayed retry on all three render surfaces (`image-retry.ts`), insert retried once then surfaced to admin error log.
4. **Identical poses in shoots** — the hero-anchor instruction disclaimed only "pose", not framing; a real photo reference pulls framing harder than text (the inspiration path hit and fixed this exact failure on 2026-07-05, hero path never got the fix). Explicit per-role crop/camera-distance rule added.
5. **"Retired thin overlays"** — verified NOT a routing bug: no retired path can execute (old overlay mode returns HTTP 410); every story/carousel goes through baked text. The real causes: bake directives were qualitative-only ("large", "refined" — no size/weight floor) and live bakes render at medium while the six style previews were generated at HIGH. Fixed: explicit sizing/weight/coverage per style + a hard "never hairline, never faint" rule; new `APP_V3_BAKE_TEXT_QUALITY` env lever (default medium per Sandra's cost lock — see decisions below).
6. **Gallery labels** — `category` was hardcoded ('concept'/'text-bake') and the gallery keyword-sniffed raw prompt text. Generate + bake routes now write the real format; classifier trusts it first (legacy sniffing kept for old rows). Full labeling (titles, edit/bake variant linkage) needs a migration → spec'd.
7. **Streaming inspiration drop** (found by research, not QA) — streamed single photos attached only selfies while the prompt referenced an inspiration image that was never attached. One-line fix to match the JSON path.
8. **Aspect contradictions** — prompts claimed "9:16" while rendering 2:3 (1024×1536), and carousel slides were told "Story format"; conflicting aspect claims are a documented gpt-image-2 layout weak spot. Reworded to match the actual canvas.

## Specs written (feature work, for Codex)

- `tasks/MAYA-STYLE-DIRECTOR-01-choose-your-own-and-shoot-options.md` — "Choose your own" style (inspiration image / let Maya decide, grounded in the vault), Maya-as-director after a shot pick (more angles / recreate the collection's shoot / new shoot in that style / shot count 6-9), overlay style memory in `app_v3_memory` + same-layout variations. Built on verified extension points — the inspiration plumbing and photoshoot pipeline already exist end-to-end. Two open questions for Sandra at the bottom.
- `tasks/APP-V3-GEN-RELIABILITY-01-labels-variants-retries.md` — gallery title/variant-linkage migration, edit-route format forwarding, hero-first ordering, double-upload cleanup, transient-error retry, min-res selfie guard (needs her copy), baked-headline length cap.

## Research

`docs/research/GPT_IMAGE_2_INTEGRATION_RESEARCH_2026-07-06.md` — official-docs-cited gpt-image-2 best practices + full audit of our integration. Verdict: the integration is strong (ref ordering, anchor-don't-chain, no-input_fidelity on -2, edit re-anchoring all match OpenAI guidance); remaining gaps are ranked P3-P8 in the doc.

## Two env decisions for Sandra (money vs quality, no code needed)

1. `APP_V3_BAKE_TEXT_QUALITY=high` — crisp baked text matching the previews members pick from. ~$0.21 vs ~$0.05 per baked slide, ~2.3x slower per bake. Recommendation: try it; the thin-text complaint is a named member frustration and only with-text graphics pay it.
2. `APP_V3_PORTRAIT_SIZE=1024x1824` — true story-shaped canvas instead of 2:3. ~19% more output pixels; smoke on staging first.

## Verification (Part 2)

134 existing tests green across all touched suites (`text-studio-bake`, `maya-fix-03-overlay-layer`, `story-generation`, `app-v3-maya-first-ux`, `app-v3-live-bugs-01`, `app-v3-continuity`, gallery suites) + 6 new regression tests (`tests/maya-chat-selfie-manager.test.ts`). `pnpm type-check:ci` clean, lint 0 errors. Not done: authenticated live tap-through of /app — that's Sandra's mobile pass; the fixes are exactly at the seams her testing exposed.

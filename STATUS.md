# 📍 SSELFIE STATUS — Shared Handover File
**Protocol:** Codex updates this at the end of every session. Claude reads this at the start of every conversation.

---

## Last Updated
2026-03-02 16:11 CET — Updated by Codex (Vercel deploy blocker investigation + recovery)

## Last Task Completed
Vercel deploy blocker investigation completed (task: `codex-VERCEL-DEPLOY-FIX-2026-03-02.md`):
- Scope:
  - Compared newly-added cron routes against stable `win-back-sequence` route shape:
    - `app/api/cron/nurture-sequence/route.ts`
    - `app/api/cron/onboarding-sequence/route.ts`
    - `app/api/cron/win-back-sequence/route.ts`
  - Reviewed `next.config.mjs` and `vercel.json` for deployment-time configuration conflicts.
  - Pulled failing and successful Vercel deployment event logs via API to isolate failure phase.
- Findings:
  - Cron routes compile and deploy in preview without code changes.
  - Failing production deploys showed:
    - Build completed successfully.
    - Failure occurred after `Deploying outputs...` with generic platform message:
      - `Error: We encountered an internal error. Please try again.`
  - Root cause is deployment-path/platform-side behavior (post-build), not route code syntax/import/runtime mismatch.
- Recovery actions executed:
  - Preview deploy succeeded:
    - `dpl_BWDcRayndfZdBPotLdbJWrZLd2wk` (`READY`)
  - Promoted preview deployment to production:
    - `dpl_4zGqFNsygxSJo5maQb7Q5GRxz3wV` (`READY`, aliases include `sselfie.ai`)
  - Verified direct production deploy path recovered:
    - `dpl_ExqEhrN9hHRhRicFVBHdQKk5Yihn` (`READY`, same commit `3e8daa48`)
- Result:
  - Production is no longer stuck on stale build.
  - No app code changes were required for cron route handlers.

SEQ-01 North report verification completed (live Resend + code truth check):
- Scope:
  - Verified all 5 claimed SEQ-01 broadcast IDs against live Resend API.
  - Verified all 6 claimed segment IDs against live Resend API.
  - Cross-checked runtime code path on `main` for nurture delivery ownership.
- Results:
  - Broadcast IDs:
    - All 5 IDs exist, but all are `draft` with `sent_at = null` and `scheduled_at = null`.
    - All 5 have `audience_id = null` and `segment_id = null` (not bound to recipients yet).
  - Segment IDs:
    - Claimed SEQ-01 segment IDs from North report are not present in current live segment list.
    - `GET /segments` returned 58 segments; matched count for claimed IDs: `0`.
    - Direct lookups for claimed IDs return `404 Audience not found`.
  - CTA payload check:
    - N3/N4/N5 drafts include `/checkout/membership` link.
    - N1 includes strategy-link placeholder.
    - N2 has no checkout CTA (as expected).
  - Code-path truth:
    - Production nurture is transactional in `app/api/cron/nurture-sequence/route.ts` (no segment/broadcast dependency).
    - Studio onboarding owner is `onboarding-sequence`; `welcome-sequence` is disabled no-op.
- Verdict:
  - North claim "`SEQ-01 LIVE & READY TO ENROLL`" is **not fully confirmed** in current account state.
  - Accurate status is: drafts exist, but enrollment wiring (valid segments + broadcast audience binding/scheduling) is not fully active.

Email reboot Task 3 completed (onboarding owner now scheduled):
- Scope:
  - Activated `onboarding-sequence` as a scheduled Vercel cron after welcome-route de-dup.
  - Staggered schedule to avoid 10:00 email cron collisions.
- Files updated:
  - `vercel.json`
- Validation:
  - `pnpm vitest run tests/email-routing.test.ts --exclude '.claude/**'` passed (4/4)
  - `pnpm build` passed
- Result:
  - Added `/api/cron/onboarding-sequence` to Vercel cron config at `5 10 * * *` (10:05 daily UTC).
  - Current scheduled email crons:
    - `/api/cron/win-back-sequence` at `0 10 * * *`
    - `/api/cron/nurture-sequence` at `0 10 * * *`
    - `/api/cron/onboarding-sequence` at `5 10 * * *`

Email reboot Task 2 validation + blockers checkpoint completed (read-only):
- Scope:
  - Validated nurture reboot behavior directly against production DB via read-only queries (no manual send trigger).
  - Re-checked monthly-drops blocker state in production table.
  - Re-checked E-01 reconciliation artifact currency.
- Results:
  - Nurture flow (`nurture-freebie-n1..n5`):
    - Last 14d sends: `0`
    - Duplicate sent/delivered rows (60d): `0`
    - Due candidates now: `0` for all five touches.
  - Monthly drops blocker:
    - Table `academy_monthly_drops` has `0` rows in production.
    - Schema uses `status` (not `is_published`) and current dataset is empty, so click-through E2E remains blocked until a drop is published.
  - E-01:
    - Latest reconciliation snapshot remains `output/automation/e01-subscriber-reconciliation-2026-02-28T16-42-46-461Z.md`.
    - Business sign-off is still pending (no policy change needed in code).

Email lifecycle owner conflict resolved (Task 1 complete):
- Scope:
  - Selected `onboarding-sequence` as the single owner for Studio onboarding lifecycle sends.
  - Disabled `welcome-sequence` route to prevent accidental duplicate onboarding sends.
  - Removed welcome route from mixed-route mail architecture contract and added explicit disabled-route assertion.
- Files updated:
  - `app/api/cron/welcome-sequence/route.ts`
  - `tests/email-routing.test.ts`
- Validation:
  - Test-first: `pnpm vitest run tests/email-routing.test.ts --exclude '.claude/**'` failed before patch, then passed after patch (4/4).
  - `pnpm eslint app/api/cron/welcome-sequence/route.ts tests/email-routing.test.ts` passed (0 errors/warnings).
  - `pnpm build` passed.
- Result:
  - `welcome-sequence` is now a protected no-op guard route (`disabled: true`, `reason: sequence_owner_changed`).
  - Overlap removed at runtime path level; onboarding ownership is explicit and safe.

Previous milestone logs:
Academy backend pipeline smoke checkpoint completed (no code changes in this slice):
- Scope:
  - Ran authenticated production smoke for non-member + member flows (new test users).
  - Verified entitlement persistence for mini-products across relogin.
  - Verified monthly-drops access response semantics for both member and non-member users.
  - Cross-checked current UI behavior in `membership-home-card.tsx` and `maya-chat-screen.tsx`.
- Results:
  - Non-member:
    - `/api/academy/monthly-drops` returns `200` with `hasAccess: false` (expected paywall semantics).
    - `/api/academy/my-products` returns owned mini-product entitlements correctly.
    - Owned mini-product entitlement persisted after logout/login.
  - Member:
    - `/api/academy/monthly-drops` returns `200` with `hasAccess: true`.
    - `monthlyDrops` payload length is `0` in current production data.
    - Membership home card "Explore →" CTA did not render because CTA is conditional on a non-empty monthly-drop title.
  - Data verification:
    - blocked: no published drops in academy_monthly_drops table.
    - `academy_monthly_drops` currently has `0` published rows in production DB, so click-through/download tracking path cannot be exercised end-to-end yet.
- Validation commands:
  - `pnpm vitest run tests/monthly-drops-clickthrough.test.ts tests/membership-home-card.test.tsx tests/academy-access-gate.test.ts tests/monthly-drops-access-response.test.ts` (passed 8/8)
  - `pnpm build` (passed)

Stripe academy webhook production hotfix completed:
- Scope:
  - Ran controlled signed replay against production webhook endpoint and reproduced a live failure:
    - `checkout.session.completed` returned `500`
    - `webhook_errors.error_message`: `column "created_at" of relation "user_tags" does not exist`
  - Root cause: academy mini-product branch inserted `user_tags (user_id, tag, created_at)` while production schema uses `tagged_at`.
  - Patched webhook insert to schema-safe form:
    - `INSERT INTO user_tags (user_id, tag) ... WHERE NOT EXISTS (...)`
    - relies on table default timestamp column, avoiding env/schema drift.
  - Extended regression test to assert no explicit `created_at` column in user-tag insert SQL.
- Files updated:
  - `app/api/webhooks/stripe/route.ts`
  - `tests/webhook-academy-purchase.test.ts`
- Validation:
  - Test-first:
    - New assertion failed before patch (`expected false to be true`)
    - Passed after patch.
  - `pnpm vitest run tests/webhook-academy-purchase.test.ts tests/monthly-drops-access-response.test.ts tests/monthly-drops-clickthrough.test.ts tests/academy-access-gate.test.ts tests/academy-journey.test.ts` passed (11/11)
  - `pnpm build` passed
  - Live evidence query after replay:
    - latest `webhook_errors` includes `checkout.session.completed` + `column "created_at" of relation "user_tags" does not exist` (captured before hotfix deploy)
  - Post-deploy production verification (controlled signed replay):
    - `POST https://sselfie.ai/api/webhooks/stripe` returned `200` with `{ "received": true }`
    - replay event persisted in `webhook_events` (`stripe_event_id = evt_codex_live_smoke_1772439608583`)
    - academy entitlement row remained single + active for smoke payment intent (`pi_codex_smoke_20260227`), proving idempotent unlock persistence.

Stripe academy unlock webhook hardening completed:
- Scope:
  - Reproduced and patched a high-risk unlock-path issue in `checkout.session.completed` handling for `academy_mini_product`.
  - Replaced invalid conflict targets (`ON CONFLICT (user_id, course_id)` and `ON CONFLICT (user_id, tag)`) with production-safe idempotent insert patterns that do not depend on missing unique indexes.
  - Removed schema-mutation behavior from webhook path (no `CREATE TABLE IF NOT EXISTS` in runtime webhook handling).
  - Ensured academy purchase insert includes required payment fields (`amount_paid`, `currency`, and `stripe_payment_intent_id`).
- Files updated:
  - `app/api/webhooks/stripe/route.ts`
  - `tests/webhook-academy-purchase.test.ts` (new)
- Validation:
  - `pnpm vitest run tests/webhook-academy-purchase.test.ts tests/monthly-drops-access-response.test.ts tests/monthly-drops-clickthrough.test.ts tests/academy-access-gate.test.ts tests/academy-journey.test.ts` passed (11/11)
  - `pnpm build` passed

Academy monthly-drops non-member response hardening completed:
- Scope:
  - Reproduced production console noise path: non-members hitting `/api/academy/monthly-drops` received `403`, which surfaced as repeated failed-resource errors in Studio.
  - Adjusted monthly-drops API non-member response to return a non-error payload (`200` with `hasAccess: false`) while preserving paywall semantics in body.
  - Added regression test asserting non-member payload shape and status contract.
- Files updated:
  - `app/api/academy/monthly-drops/route.ts`
  - `tests/monthly-drops-access-response.test.ts` (new)
- Validation:
  - `pnpm vitest run tests/monthly-drops-access-response.test.ts tests/monthly-drops-clickthrough.test.ts tests/academy-access-gate.test.ts` passed (6/6)
  - `pnpm eslint app/api/academy/monthly-drops/route.ts tests/monthly-drops-access-response.test.ts` passed (0 errors, warnings only)
  - `pnpm build` passed

Academy backend pipeline hardening completed (access gate accuracy + monthly-drops reliability):
- Scope:
  - Added deterministic live-vs-test entitlement selection for subscription checks used by Academy access decisions.
  - Fixed monthly drops API response deduplication to prevent duplicate card rows after repeated downloads.
  - Made monthly-drop download tracking idempotent (duplicate insert no longer fails request).
- Files updated:
  - `lib/subscription.ts`
  - `app/api/academy/monthly-drops/route.ts`
  - `app/api/academy/monthly-drops/[dropId]/download/route.ts`
  - `tests/subscription-live-filter.test.ts` (new)
  - `tests/monthly-drops-clickthrough.test.ts` (new)
- Validation:
  - `pnpm vitest run tests/monthly-drops-clickthrough.test.ts tests/subscription-live-filter.test.ts tests/academy-access-gate.test.ts tests/academy-journey.test.ts` passed (12/12)
  - `pnpm eslint app/api/academy/monthly-drops/route.ts app/api/academy/monthly-drops/[dropId]/download/route.ts lib/subscription.ts tests/monthly-drops-clickthrough.test.ts tests/subscription-live-filter.test.ts` passed (0 errors, warnings only)
  - `pnpm build` passed

Mounted-surface UX consistency hardening completed (Maya, Feed Planner, Gallery, Account, Academy):
- Scope:
  - Removed icon-based UI affordances from active Studio surfaces and replaced with text affordances.
  - Enforced dark glass consistency on mounted component shells and overlays.
  - Added formal state snapshot and remaining legacy list in:
    - `docs/codex-tasks/UX-CONSISTENCY-AUDIT-2026-03-01.md`
- Key files updated:
  - `components/feed-planner/*` (core cards/modals/input and list surfaces)
  - `components/sselfie/maya/*` and `components/sselfie/pro-mode/*` (mounted chat surfaces)
  - `components/sselfie/gallery-screen.tsx`, `components/sselfie/fullscreen-image-modal.tsx`, `components/sselfie/image-gallery-modal.tsx`
  - `components/sselfie/academy-screen.tsx`
  - `components/academy/course-card.tsx`, `components/academy/course-detail.tsx`, `components/academy/lesson-modal.tsx`, `components/academy/lesson-viewer.tsx`, `components/academy/resource-card.tsx`
- Validation:
  - Mounted-scope icon scan: `0` `lucide-react` imports in active Studio scope.
  - `pnpm eslint` on touched files: passed with warnings only (`0` errors).
  - `pnpm build`: passed.

UX-06 Profile / Account redesign batch shipped to production:
- Commit pushed to `main`: `5243544f` (`Restyle account and profile flows to glass UI`)
- Files shipped:
  - `components/sselfie/account-screen.tsx`
  - `components/sselfie/best-work-selector.tsx`
  - `components/sselfie/edit-profile-dialog.tsx`
  - `components/sselfie/personal-brand-section.tsx`
  - `components/upgrade/upgrade-modal.tsx`
- Validation:
  - `pnpm eslint` on touched profile files passed with warnings only (0 errors)
  - `pnpm build` passed

UX-04 Gallery redesign batch shipped to production:
- Commit pushed to `main`: `6b3b7b43` (`Restyle gallery surfaces to dark glass layout`)
- Files shipped:
  - `components/sselfie/gallery-screen.tsx`
  - `components/sselfie/fullscreen-image-modal.tsx`
  - `components/sselfie/gallery/components/gallery-empty-state.tsx`
  - `components/sselfie/gallery/components/gallery-filters.tsx`
  - `components/sselfie/gallery/components/gallery-header.tsx`
  - `components/sselfie/gallery/components/gallery-image-card.tsx`
  - `components/sselfie/gallery/components/gallery-image-grid.tsx`
  - `components/sselfie/gallery/components/gallery-selection-bar.tsx`
  - `components/sselfie/gallery/components/gallery-top-suggestions.tsx`
- Validation:
  - `pnpm eslint` on touched gallery files passed with warnings only (0 errors)
  - `pnpm build` passed

UX-07 Academy in-app redesign batch shipped to production:
- Commit pushed to `main`: `47a28b9d` (`Restyle in-app academy to dark glass system`)
- Files shipped:
  - `components/sselfie/academy-screen.tsx`
  - `components/academy/course-card.tsx`
  - `components/academy/course-detail.tsx`
  - `components/academy/lesson-modal.tsx`
  - `components/academy/resource-card.tsx`
  - `components/sselfie/mini-product-card.tsx`
  - `components/sselfie/product-access-card.tsx`
- Validation:
  - `pnpm vitest run tests/studio-academy-context.test.ts tests/academy-journey.test.ts` passed (8/8)
  - `pnpm eslint` on touched academy files passed with warnings only (0 errors)
  - `pnpm build` passed

UX-05 Feed Planner redesign batch shipped to production:
- Commit pushed to `main`: `a2315e9a` (`Restyle feed planner surfaces to dark glass UX`)
- Files shipped:
  - `app/feed-planner/feed-planner-client.tsx`
  - `components/feed-planner/feed-brand-pillars.tsx`
  - `components/feed-planner/feed-grid-item.tsx`
  - `components/feed-planner/feed-grid.tsx`
  - `components/feed-planner/feed-header.tsx`
  - `components/feed-planner/feed-posts-list.tsx`
  - `components/feed-planner/feed-single-placeholder.tsx`
  - `components/feed-planner/feed-strategy.tsx`
  - `components/feed-planner/feed-style-modal.tsx`
  - `components/feed-planner/feed-tabs.tsx`
  - `components/feed-planner/feed-view-screen.tsx`
  - `components/feed-planner/instagram-feed-view.tsx`
  - `components/feed-planner/welcome-wizard.tsx`
- Validation:
  - `pnpm vitest run tests/feed-planner-access-control.test.ts` passed (3/3)
  - `pnpm eslint` on touched feed-planner files passed with warnings only (0 errors)
  - `pnpm build` passed

Decision #2 shipped to production: training access is now credit-gated for all users (not membership-gated):
- Commit pushed to `main`: `6842912c` (`Allow credit-gated training for non-members`)
- Files:
  - `app/api/training/start/route.ts`
  - `app/api/training/upload-zip/route.ts`
  - `tests/training-start-access.test.ts`
  - `tests/training-upload-zip-access.test.ts`
- Validation:
  - `pnpm vitest run tests/training-start-access.test.ts tests/training-upload-zip-access.test.ts` passed (2/2)
  - `pnpm eslint app/api/training/start/route.ts app/api/training/upload-zip/route.ts tests/training-start-access.test.ts tests/training-upload-zip-access.test.ts` passed with warnings only (0 errors)

Phase-3 Maya UX slice shipped to production (UX-08/09/10 + mode labels + lock states):
- Commit pushed to `main`: `f7895833` (`Implement Maya phase-3 onboarding and unlock states`)
- Includes:
  - Studio member onboarding overlay (`components/sselfie/maya/studio-member-onboarding.tsx`)
  - Returning-member home card (`components/sselfie/maya/membership-home-card.tsx`)
  - Prompt lock state + upgrade CTA in Prompts tab
  - Chat upsell cards for What To Say / Show Up signals
  - SELFIE / MY MODEL user-facing label surfaces
- Validation:
  - `pnpm vitest run tests/welcome-first-generation.test.ts tests/maya-mode-toggle-labels.test.tsx tests/maya-prompts-tab-lock.test.tsx tests/membership-home-card.test.tsx tests/studio-member-onboarding.test.tsx` passed (17/17)
  - `pnpm build` passed

E-03 hard-bounce cleanup verification + apply path completed:
- Commit pushed to `main`: `99983a3f` (`Log E-03 hard-bounce cleanup verification`)
- Commands:
  - `pnpm tsx scripts/cleanup-hard-bounces.ts`
  - `pnpm tsx scripts/cleanup-hard-bounces.ts --apply`
- Evidence:
  - `output/automation/hard-bounce-cleanup-2026-02-28T16-52-14-307Z.md`
  - `output/automation/hard-bounce-cleanup-2026-02-28T16-52-45-075Z.md`
- Result:
  - Hard-bounced in audience: `0`
  - Removed: `0`
  - Failed: `0`

Previous task (E-01) reconciliation snapshot refreshed (formal sign-off artifact updated):
- Ran reconciliation script:
  - `pnpm tsx scripts/reconcile-subscriber-counts.ts`
- New evidence file:
  - `output/automation/e01-subscriber-reconciliation-2026-02-28T16-42-46-461Z.md`
- Current values in snapshot:
  - Resend total contacts: `881`
  - Resend subscribed contacts: `820`
  - Resend unsubscribed contacts: `61`
  - DB unique union contacts (`users + freebie + blueprint`): `1191`
  - Active recurring subscribers (membership/pro): `15`
  - Active paid_blueprint entitlements: `13`
- Sign-off framing preserved:
  - Resend subscribed contacts = canonical broadcast denominator
  - DB subscription slices = product/revenue denominator
  - Keep both reported separately to avoid denominator drift

/api/onboarding/academy-journey-state reliability hardening completed (non-blocking fail-open):
- Route hardened:
  - `app/api/onboarding/academy-journey-state/route.ts`
  - Replaced module-level DB client usage with `getDb()` inside request scope
  - Wrapped journey data query block in local try/catch and now falls back to safe defaults on DB/query failure:
    - `generationCount = 0`
    - `hasContentPlan = false`
    - `hoursSinceLastActive = null`
  - Endpoint now returns `200` with computed safe state even when journey query fails, instead of bubbling to `500`
  - Auth/user guard behavior unchanged (`401` unauthorized, `404` missing neon user)
- New regression tests (test-first):
  - `tests/academy-journey-state-route.test.ts`
  - Covers:
    - query failure path returns `200` + safe defaults
    - normal count path returns computed prompt state (`showAfterFirstGenerationPrompt`)
- Validation:
  - `pnpm vitest run tests/academy-journey-state-route.test.ts` passed (2/2)
  - `pnpm vitest run tests/academy-journey-state-route.test.ts tests/activation-kpi.test.ts tests/ttfi-analytics.test.ts` passed (8/8)
  - `pnpm eslint app/api/onboarding/academy-journey-state/route.ts tests/academy-journey-state-route.test.ts` passed (0 errors)
  - `pnpm build` passed
- Diagnostics evidence:
  - Searched `output/automation/*` for academy journey 500 traces before patch; no matching log entries were present.
  - Direct DB schema/query probe confirms current production-compatible columns for this endpoint (`generated_images.image_urls` is `text`, `ai_images.generation_status` exists), indicating failure mode is intermittent DB/query path reliability rather than static schema mismatch.

P0-03 follow-through completed (activation KPI visibility in admin analytics):
- Added activation KPI calculation helper:
  - `lib/analytics/activation-kpi.ts`
  - Computes 7-day TTFI median + activation rates (<=5m, <=60m) with zero-safe denominators
- Added new admin analytics endpoint:
  - `app/api/admin/analytics/activation-kpi-7d/route.ts`
  - Admin-only report using `analytics_events` (`signup_to_first_gen` start/complete) + `users` signups window
  - Returns `report` with:
    - metrics: `newSignups`, `starts`, `completes`, `completesWithin5m`, `completesWithin60m`, median TTFI
    - rates: start coverage, completion-from-starts, activation <=5m/<=60m
- Wired new KPI view into admin analytics page:
  - `app/admin/analytics/page.tsx`
  - Loads `/api/admin/analytics/activation-kpi-7d` in dashboard load
  - Added refresh action button: `Refresh 7D TTFI KPI`
  - Added 3 metric cards:
    - `TTFI Median (7d)`
    - `Activation <=5m`
    - `Activation <=60m`
- Test-first evidence:
  - Added `tests/activation-kpi.test.ts` (failed first due missing module; then passed after implementation)
- Validation:
  - `pnpm vitest run tests/activation-kpi.test.ts tests/ttfi-analytics.test.ts tests/analytics-event-contract.test.ts tests/studio-tab-routing.test.ts tests/broadcast-preflight.test.ts` passed (20/20)
  - `pnpm eslint lib/analytics/activation-kpi.ts app/api/admin/analytics/activation-kpi-7d/route.ts app/admin/analytics/page.tsx tests/activation-kpi.test.ts` passed (0 errors, warnings only)
  - `pnpm build` passed

UX-08 completed (Studio member onboarding flow, UI-only):
- New component:
  - `components/sselfie/maya/studio-member-onboarding.tsx`
  - 3-step dark glass onboarding sheet:
    - Step 1: `YOUR STUDIO IS READY` with credits + SELFIE + Training readiness row
    - Step 2: `THIS IS SELFIE MODE` with upload CTA
    - Step 3: `WANT EVEN BETTER RESULTS?` with training CTA
- Integrated in Maya screen:
  - `components/sselfie/maya-chat-screen.tsx`
  - New mount condition implemented:
    - opens when `isMembership && firstTimeProductUser`
  - Wired actions:
    - `Show Me SELFIE Mode ->` switches to photos + SELFIE mode
    - `Upload a Selfie ->` opens upload flow in photos tab
    - `Start Training ->` switches to training tab
- New regression tests:
  - `tests/studio-member-onboarding.test.tsx`
    - verifies closed state
    - verifies step progression + callbacks for SELFIE/upload/training actions
- Validation:
  - `pnpm vitest run tests/studio-member-onboarding.test.tsx tests/maya-mode-toggle-labels.test.tsx tests/welcome-first-generation.test.ts` passed (14/14)
  - `pnpm eslint components/sselfie/maya/studio-member-onboarding.tsx components/sselfie/maya-chat-screen.tsx tests/studio-member-onboarding.test.tsx` passed (warnings only, 0 errors)
  - `pnpm build` passed

Mode naming cleanup completed (Decision #1 from Master Plan, display/copy-only):
- Renamed user-facing Maya mode labels without changing enum/state values:
  - `pro` displays as `SELFIE`
  - `classic` displays as `MY MODEL`
- Updated UI surfaces:
  - `components/sselfie/maya/maya-mode-toggle.tsx`
    - Segmented labels now `MY MODEL` and `SELFIE`
    - Button variant now shows `Switch to SELFIE` / `Switch to MY MODEL`
    - Updated accessibility labels/titles to renamed mode language
  - `components/sselfie/maya/maya-header.tsx`
    - Mobile menu action now `Switch to MY MODEL`
  - `components/sselfie/maya/maya-quick-prompts.tsx`
    - Empty-state heading now `Start with SELFIE Mode Examples`
  - `components/sselfie/maya/welcome-first-generation-flow.tsx`
    - Step 2 mode cards now `MY MODEL` and `SELFIE` with updated helper copy
  - `components/sselfie/maya-chat-screen.tsx`
    - Pro welcome copy and onboarding modal copy updated to `SELFIE`
  - `components/sselfie/maya/maya-prompts-tab.tsx`
    - Upload requirement error now references `SELFIE mode`
- New regression test:
  - `tests/maya-mode-toggle-labels.test.tsx`
  - Verifies compact + button toggle variants render renamed labels and ARIA text
- Validation:
  - `pnpm vitest run tests/maya-mode-toggle-labels.test.tsx tests/welcome-first-generation.test.ts` passed (12/12)
  - `pnpm eslint components/sselfie/maya/maya-mode-toggle.tsx components/sselfie/maya/maya-header.tsx components/sselfie/maya/maya-quick-prompts.tsx components/sselfie/maya/welcome-first-generation-flow.tsx components/sselfie/maya/maya-prompts-tab.tsx components/sselfie/maya-chat-screen.tsx tests/maya-mode-toggle-labels.test.tsx` passed (warnings only, 0 errors)
  - `pnpm build` passed

Training access update (Decision #2 from Master Plan: training available to all users, credit-gated):
- API gate changes:
  - `app/api/training/start/route.ts`
    - Removed Studio membership requirement gate (`403`)
    - Training now gates on credits only
    - Updated insufficient-credit copy to: `Training costs 20 credits... Buy credits or join Studio for monthly credits.`
  - `app/api/training/upload-zip/route.ts`
    - Removed Studio membership requirement gate (`403`)
    - Training now gates on credits only
    - Updated insufficient-credit copy to same credit-gate language
- Maya Training UI update:
  - `components/sselfie/maya/maya-training-tab.tsx`
    - Added insufficient-credit training card when balance `< 20`
    - Added explicit CTAs:
      - `Buy Credits ->`
      - `Join Studio for Monthly Credits ->` (non-members only)
    - Disabled start button when training credits are insufficient
    - Updated training start copy to explicitly state `Training costs 20 credits`
  - `components/sselfie/maya-chat-screen.tsx`
    - Passed `creditBalance`, `isMembership`, and CTA handlers into `MayaTrainingTab`
    - Wired CTA handlers to existing flows:
      - Buy Credits opens `BuyCreditsModal`
      - Join Studio uses embedded checkout (`sselfie_studio_membership`)
- New regression tests (test-first):
  - `tests/training-start-access.test.ts`
  - `tests/training-upload-zip-access.test.ts`
  - Both tests enforce non-member training is credit-gated (`402 Insufficient credits`) instead of membership-gated (`403`)
- Validation:
  - `pnpm vitest run tests/training-start-access.test.ts tests/training-upload-zip-access.test.ts` passed (2/2)
  - `pnpm eslint app/api/training/start/route.ts app/api/training/upload-zip/route.ts components/sselfie/maya/maya-training-tab.tsx components/sselfie/maya-chat-screen.tsx tests/training-start-access.test.ts tests/training-upload-zip-access.test.ts` passed (warnings only, 0 errors)
  - `pnpm build` passed

P0 backend recovery (activation-first) completed:
- P0-01 tab/query sync + deep-link reliability:
  - Added shared tab resolver: `lib/studio/tab-routing.ts`
  - Updated `components/sselfie/sselfie-app.tsx` to reactively sync `activeTab` from `?tab=` and popstate; now preserves query + hash on tab changes
- P0-02 Academy purchase context propagation into Maya:
  - Added parser: `lib/academy/studio-query-context.ts`
  - Updated `app/studio/page.tsx` to parse and pass `first_time_product_user`
  - Updated `components/sselfie/sselfie-app.tsx` to pass `academyPurchaseProduct` + `firstTimeProductUser` into `MayaChatScreen`
  - Updated `components/sselfie/maya/hooks/use-maya-chat.ts` transport dependencies so headers refresh when product/first-time flags change
  - Updated `app/academy/success/page.tsx` deep-link to include `first_time_product_user=true`
- P0-03 analytics contract hardening:
  - Added canonical event contract: `lib/analytics/event-contract.ts`
  - Updated `lib/analytics/events.ts` to validate against shared contract
  - Updated emitters to only use supported names:
    - `components/onboarding/unified-onboarding-wizard.tsx` now emits `onboarding_step_complete`, `onboarding_abandoned`, `onboarding_complete`
    - `components/sselfie/maya/welcome-first-generation-flow.tsx` now emits `mode_selected`, `first_image_generated`, `credits_used`
    - `components/sselfie/maya/hooks/use-maya-mode.ts` now emits `mode_selected` on real toggle changes
  - Updated `app/api/analytics/event/route.ts` to return `{ accepted: false, reason }` when rejected (still fail-open)
- P0-04 broadcast preflight + suppression guard:
  - Added helper: `lib/email/broadcast-preflight.ts`
  - Updated `lib/email/send-newsletter-broadcast.ts` with recipient preflight (`getBroadcastRecipientPreflight`) and zero-sendable hard stop before sending
  - Updated `app/api/admin/marketing/brand-engine-broadcast/send/route.ts` to run preflight before approval/send and return preflight counts
- New regression tests:
  - `tests/studio-tab-routing.test.ts`
  - `tests/studio-academy-context.test.ts`
  - `tests/analytics-event-contract.test.ts`
  - `tests/broadcast-preflight.test.ts`
- Validation:
  - `pnpm vitest run tests/studio-tab-routing.test.ts tests/studio-academy-context.test.ts tests/analytics-event-contract.test.ts tests/broadcast-preflight.test.ts` passed (18/18)
  - `pnpm build` passed
  - `pnpm dev` smoke passed (`HEAD /studio -> 307`, deep-link with `?tab=maya&source=academy_purchase&product=what_to_say&first_time_product_user=true -> 307`)
  - Targeted eslint on touched files passed with warnings only (0 errors)
  - Preview deploys:
    - `https://v0-sselfie-p91lnwtcf-sselfie-studio.vercel.app`
    - `https://v0-sselfie-q3tcdh53e-sselfie-studio.vercel.app`
  - Live endpoint smoke against preview is currently blocked by Vercel Deployment Protection (401 auth wall) without bypass token/SSO session.
  - Commit pushed to `main`: `9b9802c1` (`Stabilize activation P0: tab sync, Maya context, analytics contract, broadcast preflight`)
  - Production deploy URLs:
    - `https://v0-sselfie-9bq22t9ji-sselfie-studio.vercel.app`
    - Custom domain live: `https://sselfie.ai`
  - Production endpoint smoke:
    - `POST /api/analytics/event` with `mode_selected` -> `{ "ok": true, "accepted": true }`
    - `POST /api/analytics/event` with unsupported `wizard_step_3_complete` -> `{ "ok": true, "accepted": false, "reason": "Unsupported event" }`
    - `GET /studio` and deep-link `GET /studio?tab=maya&source=academy_purchase&product=what_to_say&first_time_product_user=true` -> `307` to login with `returnTo` preserved
    - `POST /api/admin/marketing/brand-engine-broadcast/send` currently returns no-pending-draft guard (safe): `{ "success": false, "error": "No pending Brand Engine broadcast found. Create a draft first." }`

Previous completed tasks:
UX-06 completed (Profile / Account redesign, UI-only):
- `components/sselfie/account-screen.tsx`
- `components/sselfie/edit-profile-dialog.tsx`
- `components/sselfie/best-work-selector.tsx`
- `components/sselfie/personal-brand-section.tsx`
- `components/upgrade/upgrade-modal.tsx`
- Completed fixes:
- Profile/settings tab switcher restyled to Inter 11px uppercase with active hairline indicator
- Profile hero rebuilt as dark glass surface: circular Whisper avatar border, Cormorant display name, glass stats row
- Personal Brand and Best Work sections moved to consistent dark glass containers with updated controls
- Settings converted to glass list-row model with uppercase section headers, dark toggles, and full-width Cormorant upgrade CTA
- Added `past_due` subscription banner in settings when Stripe status indicates payment issue
- Edit Profile dialog, Best Work selector modal, and Upgrade modal now match the dark glass visual system
- Validation:
- `pnpm exec eslint components/sselfie/account-screen.tsx components/sselfie/edit-profile-dialog.tsx components/sselfie/best-work-selector.tsx components/sselfie/personal-brand-section.tsx components/upgrade/upgrade-modal.tsx` (warnings only, 0 errors)
- `pnpm build` passed
- `pnpm dev` smoke passed (`GET /studio -> 307`, `GET /feed-planner -> 307`, `GET /academy -> 200`)
- Vercel preview: `https://v0-sselfie-naxm81qc0-sselfie-studio.vercel.app`

Maya layout hotfix pass completed (post-UX-05 review):
- `components/sselfie/sselfie-app.tsx`
- `components/sselfie/maya-chat-screen.tsx`
- `components/sselfie/maya/maya-chat-interface.tsx`
- `components/sselfie/maya/maya-unified-input.tsx`
- Completed fixes:
- Replaced hardcoded nav offsets with measured layout contract (`--sselfie-bottom-nav-height`) to prevent input dock overlaying bottom navigation
- Added measured header contract (`--maya-header-height`) and removed hardcoded top spacing in chat viewport
- Fixed empty-state rendering flow so welcome content no longer sits below a full-height empty chat region
- Unified Classic/Pro input visual system (same dark glass input/buttons) to remove white-vs-dark inconsistency
- Shifted input dock and menu positioning to dynamic CSS variables so layout remains stable across device safe areas
- Validation:
- `pnpm exec eslint components/sselfie/sselfie-app.tsx components/sselfie/maya-chat-screen.tsx components/sselfie/maya/maya-chat-interface.tsx components/sselfie/maya/maya-unified-input.tsx` (warnings only, 0 errors)
- `pnpm dev` smoke passed (`HEAD /maya -> 307 -> /auth/login`)
- `pnpm build` passed
- Vercel preview: `https://v0-sselfie-j2wn6weln-sselfie-studio.vercel.app`

UX-05 completed (Feed Planner redesign, UI-only):
- `components/feed-planner/feed-view-screen.tsx`
- `components/feed-planner/instagram-feed-view.tsx`
- `components/feed-planner/feed-grid.tsx`
- `components/feed-planner/feed-grid-item.tsx`
- `components/feed-planner/feed-tabs.tsx`
- `components/feed-planner/feed-posts-list.tsx`
- `components/feed-planner/feed-strategy.tsx`
- `components/feed-planner/feed-header.tsx`
- `components/feed-planner/welcome-wizard.tsx`
- `components/onboarding/unified-onboarding-wizard.tsx`
- Completed fixes:
- Feed Planner shell switched to dark glassmorphic styling with `#0a0a0a` background and glass card treatments
- Feed empty state and entry card updated with Cormorant-driven `NEW FEED ->` CTA language
- Feed grid visual treatment updated to 3-column dominant layout with hairline separators and dark placeholders
- Caption/posts surfaces and strategy surfaces restyled to glass cards/inputs while preserving existing generation + API logic
- Wizard visuals updated to dark modal treatment with Cormorant headings, dot indicators, and full-width glass CTA button
- Validation:
- `pnpm exec eslint components/feed-planner/feed-view-screen.tsx components/feed-planner/instagram-feed-view.tsx components/feed-planner/feed-grid.tsx components/feed-planner/feed-grid-item.tsx components/feed-planner/feed-tabs.tsx components/feed-planner/feed-posts-list.tsx components/feed-planner/feed-strategy.tsx components/feed-planner/welcome-wizard.tsx components/onboarding/unified-onboarding-wizard.tsx components/feed-planner/feed-header.tsx` (warnings only, 0 errors)
- `pnpm dev` smoke passed (`HEAD /feed-planner -> 307 -> /auth/login`)
- `pnpm build` passed

UX-04 completed (Gallery redesign, UI-only):
- `components/sselfie/gallery-screen.tsx`
- `components/sselfie/gallery/components/gallery-filters.tsx`
- `components/sselfie/gallery/components/gallery-image-grid.tsx`
- `components/sselfie/gallery/components/gallery-image-card.tsx`
- `components/sselfie/gallery/components/gallery-selection-bar.tsx`
- `components/sselfie/gallery/components/gallery-empty-state.tsx`
- `components/sselfie/fullscreen-image-modal.tsx`
- Completed fixes:
- Gallery filter tabs now match required order/labels: `Photos / Videos / Feed / Favourited` with dark uppercase tab treatment
- Grid updated to 3-column mobile edge-to-edge visual structure
- Video thumbnails updated to 9:16 cards with text overlay `ANIMATE ->` (icon overlay removed)
- Selection mode updated with dim overlays and text checkmark treatment
- Selection action bar restyled to glass + text-only actions (`Save / Download / Favourite / Delete`)
- Empty gallery CTA updated to `CREATE WITH MAYA ->`
- Fullscreen modal simplified to a dark overlay + glass text action pill bar (`FAVOURITE / DOWNLOAD / DELETE`)
- Validation:
- `pnpm exec eslint components/sselfie/gallery/components/gallery-filters.tsx components/sselfie/gallery/components/gallery-image-grid.tsx components/sselfie/gallery/components/gallery-image-card.tsx components/sselfie/gallery/components/gallery-selection-bar.tsx components/sselfie/gallery/components/gallery-empty-state.tsx components/sselfie/fullscreen-image-modal.tsx components/sselfie/gallery-screen.tsx` (warnings only, 0 errors)
- `pnpm build` passed

UX-03 completed (Academy landing + product/success screens, UI-only):
- `app/academy/page.tsx`
- `app/academy/products/[productId]/page.tsx`
- `app/academy/products/[productId]/purchase-button.tsx`
- `app/academy/success/page.tsx`
- Completed fixes:
- `/academy` converted to dark editorial layout with hero statement, numbered 01–04 product list, and stat block (`180K+ / 12 EUR / 8 Months`)
- Product detail pages redesigned with dark hero, “What’s included” section, and glass-style purchase/open actions
- Success page redesigned to dark confirmation flow with product-specific next-step CTA deep-linking into `/studio`
- Preserved existing checkout + upsell logic (no API/Stripe flow changes)
- Validation:
- `pnpm eslint app/academy/page.tsx app/academy/products/[productId]/page.tsx app/academy/products/[productId]/purchase-button.tsx app/academy/success/page.tsx` (0 errors)
- `pnpm build` passed
- Vercel preview: `https://v0-sselfie-mb4h9f6s0-sselfie-studio.vercel.app`

UX-02 completed (Maya screen redesign, UI-only):
- `components/sselfie/maya-chat-screen.tsx`
- `components/sselfie/maya/maya-header.tsx`
- `components/sselfie/maya/maya-tab-switcher.tsx`
- `components/sselfie/maya/maya-unified-input.tsx`
- `components/sselfie/maya/maya-chat-interface.tsx`
- `components/sselfie/concept-card.tsx`
- `components/sselfie/instagram-photo-card.tsx`
- `components/sselfie/instagram-carousel-card.tsx`
- `components/sselfie/instagram-reel-card.tsx`
- `components/sselfie/instagram-photo-preview.tsx`
- `components/sselfie/instagram-reel-preview.tsx`
- Completed fixes:
- Dark glassmorphic Maya shell (#0a0a0a), updated header/tab treatments, and muted visible disabled Feed tab
- User/Maya chat bubble restyle for dark mode with assistant-first visual hierarchy
- Text-only action language across image/reel cards and preview modals (`DOWNLOAD / FAVOURITE / PHOTOSHOOT`)
- Pro concept card + prompt editor restyled to glass inputs/cards without touching generation logic
- Input bar updated to text-forward controls in Classic/Pro (`ADD`, `SETTINGS`, `SEND`)
- Validation:
- `pnpm eslint components/sselfie/maya-chat-screen.tsx components/sselfie/maya/maya-header.tsx components/sselfie/maya/maya-tab-switcher.tsx components/sselfie/maya/maya-unified-input.tsx components/sselfie/maya/maya-chat-interface.tsx components/sselfie/concept-card.tsx components/sselfie/instagram-photo-card.tsx components/sselfie/instagram-carousel-card.tsx components/sselfie/instagram-reel-card.tsx components/sselfie/instagram-photo-preview.tsx components/sselfie/instagram-reel-preview.tsx` (warnings only, 0 errors)
- `pnpm build` passed
- `pnpm dev` smoke passed (`GET /maya -> 307 -> /auth/login 200`, `GET /studio -> 307 -> /auth/login 200`)
- Vercel preview: `https://v0-sselfie-7433w7q11-sselfie-studio.vercel.app`

Activation task A-02 completed (Feed Planner wizard drop-off fix):
- `app/feed-planner/feed-planner-client.tsx`
  - Removed the standalone `QuickStartCard` gate so paid-blueprint users remain in `FeedViewScreen` and use inline setup.
  - Kept paid-blueprint skip behavior for full onboarding wizard.
  - Replaced the old "Activation Checklist + Continue" block with a single prominent CTA: `Create my first feed →`.
- `components/onboarding/unified-onboarding-wizard.tsx`
  - Maintains 3-step flow and analytics events; fixed JSX apostrophe lint errors in user-facing copy.
- Validation:
  - `pnpm eslint app/feed-planner/feed-planner-client.tsx components/onboarding/unified-onboarding-wizard.tsx components/feed-planner/feed-view-screen.tsx` (warnings only, 0 errors)
  - `pnpm build` passed
- Vercel preview: `https://v0-sselfie-fxp9suc4s-sselfie-studio.vercel.app`

Design sprint continuation on `main` (`A-01` after approved `UX-01`):
- A-01 (Maya first-generation guided path) hardened:
- Restored strict eligibility gate in `lib/onboarding/welcome-first-generation.ts`: requires `hasBonusCredits === true` and `hasNoImageSpend === true`, plus no prior generations and <=24h user age
- Added/updated tests in `tests/welcome-first-generation.test.ts` for default flag behavior and explicit no-image-spend gate; suite now passes (`10/10`)
- Fixed guided-flow UI class typos in `components/sselfie/maya/welcome-first-generation-flow.tsx` (step labels/style cards render correctly)
- Added explicit credit-eligibility metadata to `/api/user/credits` response in `app/api/user/credits/route.ts`:
  `hasBonusCredits`, `hasImageSpend`, `welcomeFirstGenerationEligible`
- Validation:
- `pnpm vitest run tests/welcome-first-generation.test.ts` passed
- `pnpm eslint app/api/user/credits/route.ts lib/onboarding/welcome-first-generation.ts components/sselfie/maya/welcome-first-generation-flow.tsx tests/welcome-first-generation.test.ts` passed (warning-only on existing `<img>`)
- `pnpm build` passed
- Vercel preview: `https://v0-sselfie-lj5nxfvik-sselfie-studio.vercel.app`

Parallel execution stream completed on `main` (`b8e7bec2`) + production deploy (`https://v0-sselfie-gf3el0kcq-sselfie-studio.vercel.app`):
- Fixed `/api/onboarding/academy-journey-state` production `500` (removed invalid `generated_images.status` query and replaced with schema-safe completed-image logic)
- Production verification: `/api/onboarding/academy-journey-state` now returns `200` with valid JSON payload
- ACADEMY-02 checkout blocker resolved:
- Added robust origin fallback in `/api/academy/checkout` (no longer hard-fails when `NEXT_PUBLIC_SITE_URL` is absent/misaligned)
- Added missing Academy Stripe env vars in Vercel (`STRIPE_PRICE_WHAT_TO_SAY`, `STRIPE_PRICE_SHOW_UP`, `STRIPE_PRICE_GET_PAID`, `STRIPE_PRICE_AI_PHOTO_PROMPTS`) across Production/Preview/Development
- Production verification: authenticated checkout call now returns `200` with Stripe Checkout URL (`checkout.stripe.com`)
- E-01 reconciliation snapshot generated with live numbers:
- `output/automation/e01-subscriber-reconciliation-2026-02-27T17-42-19-791Z.md`
- Resend total `881` / subscribed `820` / unsubscribed `61`
- DB unique union contacts `1170`
- Active recurring subscribers `16`
- Active blueprint entitlements `13`
- Type-check status refreshed: `pnpm type-check` currently passes (`tsc --noEmit` exit `0`)

## Maya Component Audit
- Live header: `components/sselfie/maya/maya-header.tsx`
- Dead headers: `components/sselfie/maya/maya-header-unified.tsx`, `components/sselfie/maya/maya-header-old.tsx` (no imports found)
- Live chat: `components/sselfie/maya-chat-screen.tsx` (rendered by `components/sselfie/sselfie-app.tsx` from `/studio` and `/maya`)
- Dead chat: none from the audited pair; `components/sselfie/maya/maya-chat-interface.tsx` is live as a child rendered inside `maya-chat-screen`
- Notes:
- Main entry path for users is `app/studio/page.tsx` -> `components/sselfie/sselfie-app.tsx` -> `components/sselfie/maya-chat-screen.tsx`
- `components/sselfie/maya/maya-chat-interface.tsx` is also imported by `components/sselfie/maya/maya-feed-tab.tsx`

## Feed Planner Audit
- User journey:
- User opens `app/feed-planner/page.tsx` or feed-planner tab in `components/sselfie/sselfie-app.tsx`
- `app/feed-planner/feed-planner-client.tsx` gates by access + onboarding/welcome status and decides whether to show wizard
- After wizard/entry, `components/feed-planner/feed-view-screen.tsx` loads feed (`/api/feed/latest` or `/api/feed/:id`) and routes to `components/feed-planner/instagram-feed-view.tsx`
- In `instagram-feed-view`, user works through tabs (`grid`, `captions/posts`, `strategy`, `pillars`), generates assets, edits bio/captions, manages images, and saves/reorders content
- Distinct modes/views:
- Access tiers: free (`placeholderType=single`), paid blueprint (`grid` with capped planners), membership (`grid`, full access), one-time path currently deprecated in code
- Generation mode toggle for eligible users: `classic` vs `pro` (localStorage-backed `mayaProMode`)
- Visual branches: loading overlay for full-grid generation, single placeholder flow for free/preview feeds
- API routes called (feed-planner surface):
- Access/gating/user profile: `/api/feed-planner/access`, `/api/user/onboarding-status`, `/api/user/info`, `/api/feed-planner/welcome-status`, `/api/user/setup-status`, `/api/profile/personal-brand`, `/api/blueprint/state`, `/api/user/credits`, `/api/images`
- Feed data/create/update: `/api/feed/latest`, `/api/feed/:id`, `/api/feed/list`, `/api/feed/create-manual`, `/api/feed/create-free-example`, `/api/feed/expand-for-paid`, `/api/feed/:id/progress`, `/api/feed/:id/reorder`
- Feed generation/content ops: `/api/feed/:id/generate-single`, `/api/feed/:id/generate-captions`, `/api/feed/:id/enhance-caption`, `/api/feed/:id/regenerate-caption`, `/api/feed/:id/update-caption`, `/api/feed/:id/generate-bio`, `/api/feed/:id/update-bio`, `/api/feed/:id/generate-highlights`, `/api/feed/:id/highlights`, `/api/feed/:id/generate-strategy`, `/api/feed/:id/strategy`, `/api/feed/:id/add-strategy`, `/api/feed/:id/download-bundle`, `/api/feed/:id/update-style`
- Planner/chat bridging: `/api/feed-planner/save-to-planner`, `/api/feed-planner/create-from-strategy`, `/api/feed-planner/queue-all-images`, `/api/feed-planner/v2/variations`, `/api/feed-planner/preview-feed`
- `feed-single-placeholder.tsx` usage:
- Still used and live; rendered in `components/feed-planner/instagram-feed-view.tsx` when preview feed or free single-placeholder flow is active
- `feed-preview-card.tsx` responsibilities and split opportunity:
- Currently mixes persistence restore, SWR polling, unsaved->saved conversion, queue-all generation orchestration, modal/image preview UX, prompt-edit callbacks, and UI rendering
- Clear split opportunity into: data/polling hook, save/generate action hook/service, and presentational card + modal subcomponents
- Clearly unused/dead feed-planner code (no imports found):
- `components/feed-planner/bulk-generation-progress.tsx`
- `components/feed-planner/feed-grid-preview.tsx`
- `components/feed-planner/feed-strategy-panel.tsx`
- `components/feed-planner/strategy-preview.tsx`
- `components/feed-planner/buy-blueprint-modal.tsx` (shadowed by `components/sselfie/buy-blueprint-modal.tsx`)

## What's Confirmed Live in Production
- CLEANUP-01 baseline remains live:
- /api/cron/resolve-pending-payments
- /api/cron/reconcile-credits
- /api/cron/cron-health-check
- /api/cron/reconcile-generation-assets
- /api/cron/reconcile-generations
- /api/cron/reconcile-subscriptions
- E-02 status: fixed/verified. `.env.local` and Vercel production both use `RESEND_AUDIENCE_ID=762d7ab8-7a72-40d1-8f26-9ddfcff52e73` (no mismatch found)
- Flodesk + Loops removed. Resend is the only email platform
- [x] Placeholder admin pages deleted
- Root docs archived to `docs/archive/root-cleanup-2026-02-20/` (38 root markdown files moved)
- CLEANUP-02 deployed (`https://v0-sselfie-akfxuzkqn-sselfie-studio.vercel.app`):
- Broken admin links/redirects to deleted pages removed from nav/dashboard/redirect surfaces
- Safe dead API routes deleted: `/api/debug/*`, `/api/test/*`, `/api/testing/*`, `/api/test-sentry-simple`, `/api/stripe/create-test-coupon`, `/api/stripe/test-checkout`, `/api/stripe/cleanup-products`, `/api/sentry-status`
- CLEANUP-03 deployed (`https://v0-sselfie-j6ht8a9p2-sselfie-studio.vercel.app`):
- Deleted confirmed-dead Maya headers: `components/sselfie/maya/maya-header-unified.tsx`, `components/sselfie/maya/maya-header-old.tsx`
- Deleted confirmed-dead feed planner components: `components/feed-planner/bulk-generation-progress.tsx`, `components/feed-planner/feed-grid-preview.tsx`, `components/feed-planner/feed-strategy-panel.tsx`, `components/feed-planner/strategy-preview.tsx`, `components/feed-planner/buy-blueprint-modal.tsx`
- Patched Playwright specs to remove deleted `/api/testing/stripe-mock` dependency by mocking access endpoints at test level (`tests/paid-user-flow.spec.ts`, `tests/complete-blueprint-flow.spec.ts`)
- Split `components/feed-planner/feed-preview-card.tsx` into hooks + extracted modal components; card is now 269 lines
- UX-01 deployed (`https://v0-sselfie-fu8b79v8w-sselfie-studio.vercel.app`):
- Fixed Classic photoshoot confirm modal layering/placement so CTA is visible above fixed input bar on mobile
- Added stable concept IDs + safer concept merge in `/api/maya/update-message` to preserve generated concept images on refresh
- Reduced mobile Maya cramping: dynamic input-bar height via `ResizeObserver`, prompt row collapse after first message, tighter concept card spacing/padding
- Updated concept card UX: user-facing category labels, hidden empty three-dot menu, clearer photoshoot CTA (`Create Full Photoshoot ->`, `6-9 matching photos - ~3 min`)
- Updated Videos tab animate affordance to creation-style overlay (`Sparkles` + `Animate ->`) instead of play affordance
- Updated credits display to whole-number localized format in Maya header/menu
- Added quick-prompt right-fade scroll affordance in `maya-quick-prompts`
- Added `Add to Feed ->` and `Make a Video ->` actions in `components/image-lightbox.tsx`
- UX-02 deployed preview (`https://v0-sselfie-7433w7q11-sselfie-studio.vercel.app`) and ready for sign-off before merge-to-main production rollout.
- UX-02 follow-up Maya mobile hotfix preview (`https://v0-sselfie-lwz6ts3wt-sselfie-studio.vercel.app`):
- Removed legacy Pro top instruction banner that pushed content below the fold
- Pro empty state now shows Maya guidance under avatar (inside welcome screen)
- Pro no-reference state includes explicit "Quick Start" card + `Add Photos` CTA to open upload flow
- Pro with linked references shows the same quick-prompt pattern as Classic-mode welcome state
- Kept fixed input dock clear of bottom navigation using measured layout variables (`--maya-header-height`, `--input-bar-height`, `--sselfie-bottom-nav-height`)
- UX-02 prompt/card visual pass preview (`https://v0-sselfie-h6zhfmqy6-sselfie-studio.vercel.app`):
- Fixed missing Pro welcome quick prompts by enabling `empty-state` prompt variant for both Classic + Pro
- Kept Pro prompts distinct (same chip style/placement as Classic, different Pro prompt content)
- Restyled Pro concept cards to dark glass spec (`rgba(255,255,255,0.04)` card + `rgba(255,255,255,0.06)` editable prompt surfaces) in `components/sselfie/pro-mode/ConceptCardPro.tsx`
- UX-05 refinement pass preview (`https://v0-sselfie-m09sszvbi-sselfie-studio.vercel.app`):
- Removed non-design top clutter from Studio surfaces: hidden `WelcomeBackBanner` and removed academy emoji product-badge strip in `components/sselfie/sselfie-app.tsx`
- Restyled gallery profile suggestions card to dark glass in `components/sselfie/gallery/components/gallery-top-suggestions.tsx`
- Restyled gallery search/sort/select header controls to dark glass in `components/sselfie/gallery/components/gallery-header.tsx`
- Restyled feed planner header action controls + stat typography to dark glass and replaced emoji loading indicators with icon spinners in `components/feed-planner/feed-header.tsx`
- Restyled free/preview single-placeholder view to dark glass (including loading overlays and CTA buttons) in `components/feed-planner/feed-single-placeholder.tsx`
- Restyled feed style modal/wizard surface from white to dark glass in `components/feed-planner/feed-style-modal.tsx`
- ACADEMY-01 complete:
- Tables created: `academy_course_purchases`, `academy_resource_purchases`, `user_tags`
- New files: `lib/academy-access.ts`, `migrations/20260220_academy_foundation_tables.sql`
- Modified files: `lib/products.ts`, `.env.local`
- Stripe academy price IDs:
- `STRIPE_PRICE_WHAT_TO_SAY=price_1T2xljEVJvME7vkwFcaN1GEw`
- `STRIPE_PRICE_SHOW_UP=price_1T2xllEVJvME7vkwHC3r6GAI`
- `STRIPE_PRICE_GET_PAID=price_1T2xlmEVJvME7vkwkbgotHoB`
- Validation run: eslint on touched files passed; `pnpm dev` smoke succeeded (`GET /studio 307`)

## What's Broken / Unconfirmed
- E-01 status: reconciliation snapshot is complete and ready for business sign-off (ops decision pending)
- E-03 status: cleanup completed for currently active audience rows (39 removed); historical bounce entries remain in logs by design
- ACADEMY-02 webhook path has implementation in place, but no new end-to-end paid checkout-to-webhook write was executed in this run
- ACADEMY-01 note: Stripe key in `.env.local` is `sk_live...`; academy prices were created with configured key mode
- Runtime issue observed earlier in production (`Cannot access 'tu' before initialization`) is now rechecked and not reproduced

## Currently In Progress
None (latest patches deployed and production-smoke verified)

## Blocked On Sandra
None for this completed patch bundle

## Next Task
1) Run one controlled Academy checkout completion + webhook event verification against `academy_course_purchases` and `user_tags`
2) Get Sandra/business sign-off on E-01 snapshot denominator policy (Resend audience vs DB entity tables vs revenue subscription metrics)

UX-09 completed (Returning Member Home State in Maya):
- Added `components/sselfie/maya/membership-home-card.tsx`
- Updated `components/sselfie/maya-chat-screen.tsx`
- Added `tests/membership-home-card.test.tsx`
- Completed behavior:
- New membership-only home card now appears when `isMembership && messages.length === 0 && !firstTimeProductUser`
- Replaced blank empty-state branches in that condition (classic/pro empty states are suppressed)
- Card includes: `YOUR CREDITS`, `CONTINUE`, optional `THIS MONTH`, and quick actions
- Quick actions wired to live app navigation:
- `Generate a photo ->` keeps Maya Photos active (`#maya`)
- `Plan my feed ->` routes via parent nav to `feed-planner`
- `Browse styles ->` switches to Maya Prompts (`#maya/prompts`)
- `Pick up where you left off ->` opens history modal (`ProModeChatHistory` when available, otherwise `MayaChatHistory`)
- Validation:
- `pnpm vitest run tests/membership-home-card.test.tsx tests/studio-member-onboarding.test.tsx tests/maya-mode-toggle-labels.test.tsx tests/welcome-first-generation.test.ts tests/training-start-access.test.ts tests/training-upload-zip-access.test.ts` passed
- `pnpm eslint components/sselfie/maya-chat-screen.tsx components/sselfie/maya/membership-home-card.tsx tests/membership-home-card.test.tsx` passed with existing warnings only (0 errors)
- `pnpm build` passed

State Summary Template:
Context: Activation-first execution plan continuation, implementing UX-09 returning-member Maya home state.
Last actions: Added new home card component + Maya mount condition, then ran targeted vitest suite, targeted eslint, and full build (all passing; eslint warnings pre-existing).
Files touched: `components/sselfie/maya/membership-home-card.tsx` (new), `components/sselfie/maya-chat-screen.tsx` (render/condition wiring), `tests/membership-home-card.test.tsx` (new).
Outstanding issues: UX-10 (mini-product unlock states) and remaining gated plan phases still pending; repo still has pre-existing broad eslint warnings in `maya-chat-screen.tsx`.
Next steps: Implement UX-10 in Maya surfaces, then continue remaining master-plan phases in order.

UX-10 completed (Mini-product unlock states in Maya, UI-only):
- Updated `components/sselfie/maya-chat-screen.tsx`
- Updated `components/sselfie/maya/maya-prompts-tab.tsx`
- Added `tests/maya-prompts-tab-lock.test.tsx`
- Completed behavior:
- Product ownership is now normalized and checked in Maya from:
  - `academyPurchaseProduct` context param (`source=academy_purchase&product=...`)
  - `/api/academy/my-products` purchases (read-only fetch)
  - active Studio membership (treated as owning all mini-products)
- Prompts tab lock state:
  - If user does not own `ai_photo_prompts`, Prompts tab now shows:
    - Lock banner: `UNLOCK 100+ CURATED PROMPTS`
    - Copy: `AI Photo Prompts gives you Sandra's best-performing styles.`
    - CTA: `Upgrade to Studio — includes everything →`
    - Exactly 3 greyed-out preview prompt cards (`opacity-50`)
- Maya chat upsell cards (non-members only):
  - After brand-strategy style output is detected in assistant messages and user lacks `what_to_say`:
    - card `WANT THIS WITH CAPTIONS?`
    - CTA: `Upgrade to Studio — includes everything →`
  - After feed-planner style signal is detected and user lacks `show_up`:
    - card `WANT A 7-DAY POSTING PLAN?`
    - CTA: `Upgrade to Studio — includes everything →`
- Validation:
- `pnpm vitest run tests/maya-prompts-tab-lock.test.tsx tests/membership-home-card.test.tsx tests/studio-member-onboarding.test.tsx tests/maya-mode-toggle-labels.test.tsx tests/welcome-first-generation.test.ts tests/training-start-access.test.ts tests/training-upload-zip-access.test.ts` passed
- `pnpm eslint components/sselfie/maya-chat-screen.tsx components/sselfie/maya/maya-prompts-tab.tsx components/sselfie/maya/membership-home-card.tsx tests/maya-prompts-tab-lock.test.tsx tests/membership-home-card.test.tsx` passed with existing warnings only (0 errors)
- `pnpm build` passed

State Summary Template:
Context: Master plan execution continued through UX-09 and UX-10 Maya activation/upsell surfaces.
Last actions: Implemented returning-member home state + mini-product unlock states, then ran targeted vitest, targeted eslint, and full build.
Files touched: `components/sselfie/maya/membership-home-card.tsx`, `components/sselfie/maya-chat-screen.tsx`, `components/sselfie/maya/maya-prompts-tab.tsx`, `tests/membership-home-card.test.tsx`, `tests/maya-prompts-tab-lock.test.tsx`, `STATUS.md`.
Outstanding issues: Remaining master-plan phases still pending (next practical UX slices are UX-03/UX-04/UX-05 refinements and KPI-gated rollout tasks); pre-existing lint warnings in large legacy Maya files remain.
Next steps: Continue remaining queued phase tasks in order and run deploy smoke checks after merge/deploy.

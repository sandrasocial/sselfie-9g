# Vault Maya Remediation — Independent Reviewer Hand-off

Date: 2026-07-30 (night). Branch: `vault-maya-remediation` (NOT merged, NOT deployed —
production still runs main @ 3b6f2bc6). The implementing agent does NOT declare this
launch-ready; that verdict belongs to the independent reviewer and Sandra.

## Exact diff

```bash
git fetch && git diff main...vault-maya-remediation --stat
git diff main...vault-maya-remediation
```

Files changed (implementation): lib/trial/suite-trial.ts · lib/launch/cash-launch-pricing.ts ·
app/api/app-v3/maya/generate/route.ts · app/checkout/vault-maya/page.tsx ·
app/actions/landing-checkout.ts · app/api/stripe/create-portal-session/route.ts ·
components/vault-maya/vault-maya-studio.tsx · app/api/vault-maya/delete-selfie/route.ts (new) ·
components/sselfie/public-marketing.tsx · components/checkout/success-content.tsx ·
lib/email/templates/vault-maya-welcome.tsx · scripts/send-vault-maya-launch.ts (draft copy only).
Tests: tests/vault-maya-entitlement.test.ts (new) · tests/vault-maya-copy-truth.test.ts (new) ·
tests/vault-maya-welcome-email.test.ts (extended). Docs: remediation plan, this hand-off,
launch pack repairs.

## Blocker-by-blocker verification

| ID | What to verify | How |
|---|---|---|
| B1 | Vault-only customer can reach billing/cancel | Code: studio "Account & billing" → POST /api/stripe/create-portal-session {returnPath:"/vault-maya/studio"}; route allowlists that path. Live (after deploy, with the B11 test customer): click it, confirm Stripe portal opens with cancel available and returns to the studio. Pin: tests/vault-maya-copy-truth.test.ts "B1" block |
| B2 | Entitlement precedence & no downgrade | `pnpm vitest run tests/vault-maya-entitlement.test.ts` — 7 precedence cases incl. expired-trial+vault→vault. Code: lib/trial/suite-trial.ts getSuiteAccess order member→bundle→trial→vault→limited |
| B3 | Members can't buy | Signed in as the QA member account (orriaamodt@gmail.com), open /checkout/vault-maya → expect the "already have this" panel, NO Stripe form. Pins in copy-truth test. Known limit (documented): anonymous checkout with a different email is not blockable |
| B4 | Selfie ownership (HIGH) | Code: generate/route.ts block `identity_reference_not_owned` — every https identity ref must match user_avatar_images rows for the caller; 403 otherwise; data: URIs pass; admin exempt. Pins in vault-maya-entitlement.test.ts. Live negative test (B11 customer): POST /api/app-v3/maya/generate with another account's selfie URL → 403 |
| B5 | No unsupported promises | `pnpm vitest run tests/vault-maya-copy-truth.test.ts` — chat/inspo-image/speed-claim bans across all 6 customer surfaces. Also grep the live pages after deploy |
| B6 | Credit-expiry disclosure | Page FAQ "How do the 30 monthly photos work?" + welcome email panel + text variants. Pins in copy-truth + welcome tests. Mechanics evidence: lib/credits.ts purchased-preserved reset (existing) |
| B7 | Founder pricing fails safely | tests/vault-maya-entitlement.test.ts "B7" block: founder window + missing env → undefined (loud failure); flip is env-overridable (VAULT_MAYA_FOUNDER_PRICE_FLIPS_AT); code default is far-future 2027-01-01 (no Day 0). NOTE for deploy: production env currently has both price ids set; the OLD Aug-6 constant is neutralized by the far-future default once this branch deploys |
| B8 | Real selfie deletion | New DELETE /api/vault-maya/delete-selfie: deletes user_avatar_images selfie rows + blob files (del()), reports blobFailures. Studio "Delete my selfie" with confirm. FAQ now describes self-serve deletion and that generated photos are separate. Live test in B11: upload → delete → confirm DB rows gone (`SELECT COUNT(*) FROM user_avatar_images WHERE user_id=$TEST AND image_type='selfie'` → 0) and blob URL 404s |
| B9 | Welcome + return journey | Welcome template updated (no speed claim, expiry disclosure) — welcome-email test. Return journey: logged-out /vault-maya/studio → login?returnTo → studio (verify live with B11 customer) |
| B10 | Activation instrumentation | 7 events (viewed, selfie_added, generation started/completed/failed, photo_saved, drop_request_sent) — pin test + live check: `SELECT event_name, COUNT(*) FROM analytics_events WHERE event_name LIKE 'vault_maya_%' GROUP BY 1` after the B11 session |
| B11 | Full lifecycle with a genuine vault-only customer | REQUIRES: (1) deploy of this branch approved by Sandra; (2) a real $19 purchase on a fresh non-admin email performed by Sandra or the reviewer (the agent cannot enter payment details). Then verify in order: stripe_payments row (product_type vault_maya + attribution cols) → subscriptions row → +30 subscription_grant keyed to the invoice id → welcome email in email_logs/inbox → getSuiteAccess = vault (and /app redirects to studio) → generation charges -1 (credit_transactions) → foreign-selfie 403 → selfie delete → cancel via portal → access persists to period end. RENEWAL: run in Stripe TEST MODE via API-created subscription + test clock advance (no card forms), confirming invoice.paid re-grants 30 credits exactly once |

## Suite state

Full run on this branch: see scratchpad log referenced in session; expected ~1799 tests with
the two known order-dependent flakes (maya-prompts-tab-actions, ig-reply-system-retired —
both pass in isolation; noted in the audit as a suite-health finding, not vault-related).
Production build: compiled successfully on this branch (2.1min).

## Still open / not in this branch (by design)

- B11 execution (needs deploy approval + a human payment + reviewer).
- Sandra's Day 0 decision and the real founder-window timestamp (set via env at launch).
- The 20-generation timing measurement (before any speed claim may return).
- Anonymous-member duplicate purchase (documented limitation).
- Public-blob URL architecture (accepted platform-wide risk unless Sandra reopens it).

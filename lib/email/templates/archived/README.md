# Archived Email Templates

This directory contains email templates that are no longer in active use but are kept for reference.

## Archived Templates

### `launch-email-beta.tsx`
**Status:** Archived (Beta Launch Email)  
**Reason:** Contains beta pricing ($24.50 one-time, $49.50/month) that is no longer valid  
**Current Pricing:** $49 one-time, $97/month  
**Last Used:** Beta launch period  
**Note:** Still referenced by admin test/preview endpoints for historical reference

### `launch-followup-email-beta.tsx`
**Status:** Archived (Beta Launch Follow-up)  
**Reason:** Contains beta pricing and historical references (e.g., "30 founding members")  
**Current Pricing:** $97/month  
**Last Used:** Beta launch period  
**Note:** Still referenced by admin follow-up campaign endpoint

### `vault-flash-launch.ts`
**Status:** Archived 2026-07-03 (spent one-time campaign)
**Reason:** The $27 -> $37 flash window closed 2026-06-26; copy hardcodes stale vault counts (92/145 prompts, 18 collections) which are forbidden in live emails (vault is live-counted and growing)
**Current Pricing:** Vault $37 (flipped 2026-06-26, `lib/launch/cash-launch-pricing.ts`)
**Last Used:** Flash broadcasts sent 2026-06-26

### `prompt-vault-launch-broadcast.ts`
**Status:** Archived 2026-07-03 (spent one-time campaign)
**Reason:** Original Vault launch broadcast (May 2026); price and framing are historical, no callers in code
**Last Used:** Vault launch, May 2026

### `welcome-sequence.ts` (6 emails, day 0-28)
**Status:** Archived 2026-07-03 (Sandra-approved email audit)
**Reason:** Dead since March 2026. Copy sells the retired stack: "train your model", Pro Mode, and `/studio` links. Members are onboarded by the onboarding-sequence cron and App v3.
**Callers at retirement:** none (only quarantined tests referenced it).

### `nurture-strategy-n1.ts` .. `nurture-strategy-n5.ts`
**Status:** Archived 2026-07-03 (Sandra-approved email audit)
**Reason:** Never wired to a sender (`FREEBIE_STRATEGY_EMAIL_TOUCHES` was registry-only, marked LEGACY_ACCESS_ONLY). Zero sends in email_logs.
**Callers at retirement:** the unused registry in `lib/email/selfie-guide-email-sequence.ts`, removed with them.

### `blueprint-followup-day1.tsx`, `blueprint-followup-day3.tsx`, `blueprint-followup-day7.tsx`
**Status:** Archived 2026-07-03 (Sandra-approved email audit)
**Reason:** Their cron (`/api/cron/blueprint-followup-sequence`) was never scheduled in vercel.json; nothing sent since 2026-02-20. The orphaned cron route and the broken retry script were deleted with them.
**Note:** Blueprint buyers now get delivery-only email (paid-blueprint-delivery) until a replacement sequence is specced.

### `monthly-usage-recap.ts`
**Status:** Archived 2026-07-03 (Sandra-approved email audit)
**Reason:** No cron, webhook, or script ever sends it. Test-only references removed.

### `subscription-ending-soon.tsx`
**Status:** Archived 2026-07-03 (Sandra-approved email audit)
**Reason:** No cron, webhook, or script ever sends it. Subscription lifecycle email is owned by `lib/payments/lifecycle/*` and the suite-trial-expiry cron.

### `payment-recovery.tsx`
**Status:** Archived 2026-07-03 (Sandra-approved email audit)
**Reason:** No cron, webhook, or script ever sends it. Failed-payment email is `payment-failed.tsx` via the Stripe webhook.

## Usage

These templates are kept for:
- Historical reference
- Admin testing/preview functionality
- Potential future use if beta pricing is needed again

**Do not use these templates for new campaigns.** Use current pricing templates instead.



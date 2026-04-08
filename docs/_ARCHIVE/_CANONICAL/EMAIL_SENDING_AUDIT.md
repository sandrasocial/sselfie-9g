# Email Sending Audit (Resend)

**Date:** 2026-01-23  
**Scope:** Next.js/Vercel app email sending paths, Resend integration, and marketing vs transactional split.

## Executive Summary

- **Root cause of 100/day throttling:** Marketing sequences are sent with `resend.emails.send()` in per-recipient loops, so all marketing traffic is counted as transactional.
- **Required fix:** Route all marketing sequences through Resend Broadcasts (Broadcast API), keep true transactional sends on the Send Email API.
- **Current state:** Broadcast endpoint exists but most sequences still use direct sends.

## Inventory: All Email Sends

### A) Marketing (Should Use Broadcasts)

| Path | Trigger | Current Send Path | Notes |
|------|--------|------------------|-------|
| `app/api/cron/send-blueprint-followups/route.ts` | Daily cron (Day 3/7/14 + paid Day 1/3/7) | `sendEmail()` loop | Blueprint drip + paid followups |
| `app/api/cron/nurture-sequence/route.ts` | Daily cron (Day 1/3/7/10) | `sendEmail()` loop | Freebie nurture |
| `app/api/cron/welcome-sequence/route.ts` | Daily cron (Day 0/3/7) | `sendEmail()` loop | Paid welcome sequence |
| `app/api/cron/onboarding-sequence/route.ts` | Daily cron (Day 0/2/7) | `sendEmail()` loop | Studio onboarding |
| `app/api/cron/blueprint-discovery-funnel/route.ts` | Daily cron | `sendEmail()` loop | Discovery funnel |
| `app/api/cron/cold-reeducation-sequence/route.ts` | Daily cron | `sendEmail()` loop | Cold education sequence |
| `app/api/cron/reactivation-campaigns/route.ts` | Daily cron | `sendEmail()` loop | Reactivation campaign |
| `app/api/cron/reengagement-campaigns/route.ts` | Daily cron | `sendEmail()` loop | Re-engagement campaign |
| `app/api/cron/upsell-campaigns/route.ts` | Daily cron | `sendEmail()` loop | Upsell campaign |
| `app/api/cron/win-back-sequence/route.ts` | Daily cron | `sendEmail()` loop | Win-back offer |
| `lib/email/run-scheduled-campaigns.ts` | `/api/cron/send-scheduled-campaigns` | `sendEmail()` loop | DB-driven campaign executor |

### B) Transactional (Keep on Send Email API)

| Path | Trigger | Current Send Path | Notes |
|------|--------|------------------|-------|
| `app/api/webhooks/stripe/route.ts` | Stripe webhooks | `sendEmail()` | Receipts, payment notifications |
| `app/api/cron/subscription-ending-soon/route.ts` | Daily cron | `sendEmail()` | Billing lifecycle reminder |
| `app/api/cron/admin-alerts/route.ts` | Daily cron | `sendEmail()` | Internal operational alerts |
| `app/api/cron/referral-rewards/route.ts` | Daily cron | `sendEmail()` | Reward notifications |
| `app/api/cron/milestone-bonuses/route.ts` | Daily cron | `sendEmail()` | Reward notifications |
| `lib/referrals/trigger-referral-email.ts` | Referral triggers | `sendEmail()` | 1:1 reward delivery |
| `app/api/admin/notifications/route.ts` | Admin action | `resend.emails.send` | Internal notifications |
| `app/api/admin/email/diagnose-test/route.ts` | Admin action | `resend.emails.send` | Test email |
| `app/api/diagnostics/test-email/route.ts` | Diagnostics | `resend.emails.send` | Test email |

### C) Broadcast Path (Already Implemented)

| Path | Trigger | Send Path | Notes |
|------|--------|-----------|-------|
| `app/api/admin/broadcast/send/route.ts` | Admin UI | `resend.broadcasts.create/send` | Correct Broadcast API usage |
| `app/api/admin/email/send-launch-campaign/route.ts` | Admin UI | Broadcast API | Uses `RESEND_AUDIENCE_ID` |

## How Marketing Sends Are Currently Done (Problem)

Most marketing sequences loop recipients and call `sendEmail()` per user:

- **Loop pattern:** `for (const subscriber of subscribers) { await sendEmail({ ... }) }`
- **Effect:** Each email uses transactional API → counted toward 100/day transactional limit.
- **Result:** Marketing campaigns throttle at ~100/day.

## Plan / Limits Assumptions in Code

- **Transactional rate limiting:** `checkEmailRateLimit()` in `lib/email/send-email.ts`
- **Email kill switch / test mode:** `lib/email/email-control.ts` (`email_sending_enabled`, `email_test_mode`)
- **Cron batch delays:** Audience sync uses 5-contact batches + 5s delays

## Subscriber Storage & Consent

### Tables

- **`freebie_subscribers`**: `email`, `name`, `resend_contact_id`, `converted_to_user`, `welcome_email_sent`
- **`blueprint_subscribers`**: `email`, `name`, `resend_contact_id`, `welcome_email_sent`, day flags
- **`users`**: Paid membership, used for onboarding/welcome sequences

### Unsubscribe Handling

- Broadcasts include `{{{RESEND_UNSUBSCRIBE_URL}}}` in some templates.
- No DB-level unsubscribe flags found in `freebie_subscribers` or `blueprint_subscribers`.
- Suppression list is not synced back to DB.

## Domain / FROM Usage

**FROM addresses found:**

- `Sandra from SSELFIE <hello@sselfie.ai>` — primary marketing
- `Maya from SSELFIE <hello@sselfie.ai>` — rewards / referrals
- `SSelfie <hello@sselfie.ai>` — transactional / tests

## Phase 2: Architecture Design

### Sender Split

- **TransactionalSender:** `lib/email/transactional-sender.ts` (Resend Send Email API, 1:1 only)
- **MarketingSender:** `lib/email/marketing-sender.ts` (Resend Broadcasts API)
- **Central config:** `lib/email/config.ts` (FROM, reply-to, compliance footer, segment IDs)

### Rules

- Marketing sequences and admin campaigns **must** use Broadcasts.
- Transactional flows (auth, receipts, billing, access-token emails) remain on `resend.emails.send()`.
- Broadcasts require an audience or segment ID; sequence eligibility is controlled by tags in Resend.

## Phase 3: Implementation Summary

### New Modules

- `lib/email/config.ts` — shared email config + segment envs
- `lib/email/marketing-sender.ts` — broadcasts, dry-run, recipient limit, event logging
- `lib/email/transactional-sender.ts` — transactional sender + event logging
- `lib/email/index.ts` — exports

### Marketing Sequences Migrated to Broadcasts

- `send-blueprint-followups` (Day 3/7/14)  
- `nurture-sequence` (Day 1/3/7/10)
- `welcome-sequence` (paid Day 0/3/7)
- `onboarding-sequence` (Day 0/2/7)
- `cold-reeducation-sequence` (Day 1/3/7)
- `blueprint-discovery-funnel` (Email 1-5)
- `reactivation-campaigns` (Day 0/2/5/7/10/14/20/25)
- `reengagement-campaigns` (Day 0/7/14)
- `upsell-campaigns` (Day 10/20)
- `win-back-sequence` (offer)
- `run-scheduled-campaigns` uses Broadcasts when `resend_segment_id`/`resend_audience_id` is configured

### Intentional Transactional Exceptions

- Paid blueprint followups (access token link) remain transactional.
- Free blueprint Day 0 (personalized `form_data`) remains transactional.

## Phase 4: Safety + Observability

- `EMAIL_DRY_RUN=true` logs payloads without sending.
- `EMAIL_BROADCAST_MAX_RECIPIENTS` cap enforced unless `EMAIL_ALLOW_LARGE_BROADCASTS=true`.
- `email_events` table captures broadcast + transactional outcomes.

## Ops Guide

### Required Env Vars (New)

- `EMAIL_DRY_RUN`
- `EMAIL_BROADCAST_MAX_RECIPIENTS`
- `EMAIL_ALLOW_LARGE_BROADCASTS`
- `RESEND_SEGMENT_*` (see config in `lib/email/config.ts`)

### Resend Segments

Create Resend segments based on tags such as:

- `sequence_blueprint_day_3 = true`
- `sequence_nurture_day_1 = true`
- `sequence_welcome_day_0 = true`
- `sequence_reactivation_day_0 = true`
- `sequence_win_back_offer = true`

(Full list in `lib/email/config.ts` and cron routes.)

### How to Run Sync

Run `/api/cron/sync-audience-segments` (cron or manual) to:
- Update core segments (`all_subscribers`, `paid_users`, etc.)
- Tag sequence eligibility for broadcast targeting

### Dry-Run Validation

1. Set `EMAIL_DRY_RUN=true`
2. Trigger cron routes (or schedule) for broadcasts
3. Verify logs show `EMAIL_DRY_RUN` entries and `email_events` inserts
4. Set `EMAIL_DRY_RUN=false` for production


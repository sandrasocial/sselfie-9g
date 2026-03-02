# Codex Spec: Email System Audit & Reboot
**Date:** 2026-03-02  
**Priority:** HIGH — freebie nurture sequence needs to go live  
**Spec by:** north-code / Claude  
**Implement by:** Stella (Codex in-app)

---

## Context

The email cron system was disabled a few days ago because sequences were messy and conflicting. We now have:
1. A NEW freebie (`freebie_brand_strategies` table, source="freebie-strategy" in Resend)
2. An approved 5-email nurture sequence (SEQ-01, Day 2/5/9/14/20) at `~/stella/drafts/SEQ-FREEBIE-NURTURE-APPROVED-2026-03-02.md`
3. A shipped upsell fix (commit `39bf931`) — `/auth/sign-up?checkout=studio_membership` now works
4. An active `win-back-sequence` (in vercel.json, daily 10am) — leave it alone

The existing `nurture-sequence` cron is **completely wrong** for the new freebie — it reads from `freebie_subscribers` (old table) with Day 1/3/7/10 timing. It needs a full rewrite.

---

## Scope of This Spec

**DO:**
1. Audit all cron files vs vercel.json — classify each as KEEP / DISABLE / REWRITE
2. Rewrite `nurture-sequence` cron for the new freebie system
3. Create 5 new email templates (N1–N5) with the approved copy
4. Add `nurture-sequence` to vercel.json
5. Verify `welcome-sequence` is clean and ready to re-enable
6. Verify `win-back-sequence` is running correctly (it's in vercel.json)

**DO NOT (yet):**
- Touch blueprint sequences (dead product)
- Touch cold-edu, reengagement, reactivation, discovery sequences (scope too wide)
- Touch the Resend segment cleanup (that's North's job via MCP)
- Modify any cron that is already in vercel.json (except adding nurture-sequence)

---

## Step 1: Cron Audit Map

Read each file in `app/api/cron/` and produce a classification. Expected output:

| Cron | In vercel.json? | Table(s) | Classification | Reason |
|------|----------------|----------|----------------|--------|
| resolve-pending-payments | ✅ YES | payments | KEEP | Core payment system |
| reconcile-credits | ✅ YES | credits | KEEP | Core |
| cron-health-check | ✅ YES | - | KEEP | Monitoring |
| reconcile-feed-posts | ✅ YES | feed_posts | KEEP | Core |
| reconcile-ai-images | ✅ YES | ai_images | KEEP | Core |
| reconcile-pro-photoshoot-grids | ✅ YES | - | KEEP | Core |
| reconcile-generations | ✅ YES | - | KEEP | Core |
| reconcile-subscriptions | ✅ YES | subscriptions | KEEP | Core |
| win-back-sequence | ✅ YES | subscriptions, email_logs | KEEP | Working, live |
| nurture-sequence | ❌ NO | freebie_subscribers (OLD) | **REWRITE** | Wrong table + timing |
| welcome-sequence | ❌ NO | subscriptions, users | ASSESS | Studio onboarding |
| onboarding-sequence | ❌ NO | subscriptions, users | ASSESS | Overlaps welcome? |
| subscription-ending-soon | ❌ NO | subscriptions | ASSESS | Low risk |
| blueprint-email-sequence | ❌ NO | OLD system | DISABLE | Blueprint deactivated |
| blueprint-discovery-funnel | ❌ NO | OLD system | DISABLE | Blueprint deactivated |
| send-blueprint-followups | ❌ NO | OLD system | DISABLE | Blueprint deactivated |
| cold-reeducation-sequence | ❌ NO | OLD system | DISABLE | Scope deferred |
| reengagement-campaigns | ❌ NO | users | DISABLE | Scope deferred |
| reactivation-campaigns | ❌ NO | subscriptions | DISABLE | Overlaps win-back |
| welcome-back-sequence | ❌ NO | - | DISABLE | Scope deferred |
| upsell-campaigns | ❌ NO | - | DISABLE | Scope deferred |
| brand-engine-launch-digest | ❌ NO | OLD Brand Engine | DISABLE | Brand Engine pivoted |
| cohort-* | ❌ NO | - | DISABLE | Analytics only, no urgency |
| arpu-churn-weekly | ❌ NO | - | DISABLE | Analytics only |
| funnel-report-daily | ❌ NO | - | DISABLE | Analytics only |
| refresh-segments | ❌ NO | - | ASSESS | May be needed for Resend sync |
| sync-audience-segments | ❌ NO | - | ASSESS | May be needed for Resend sync |
| backfill-resend-audience | ❌ NO | - | ASSESS | One-time backfill |

**Verification step:** After reading each file, confirm your classification matches the code. Flag any that look dangerous to disable.

---

## Step 2: Rewrite nurture-sequence

**File:** `app/api/cron/nurture-sequence/route.ts`

**Replace the entire file** with a new implementation that:

### 2a. Source table change
- **OLD:** reads from `freebie_subscribers` 
- **NEW:** reads from `freebie_brand_strategies` (this is where new freebie leads live)

Schema reference for `freebie_brand_strategies`:
```sql
-- id, access_token, email, name, business_type, target_audience, 
-- transformation_story, brand_vibe, strategy_json JSONB, 
-- resend_contact_id, email_sent, created_at, updated_at
```

### 2b. Timing change
- **OLD:** Day 1 / Day 3 / Day 7 / Day 10
- **NEW:** Day 2 / Day 5 / Day 9 / Day 14 / Day 20

### 2c. Skip / exit conditions
Skip a lead if ANY of these are true:
- They have an active Studio subscription (query `subscriptions` table for their email — status = 'active')
- They have already received that email type in `email_logs`

### 2d. Send method
Use **transactional sends** (like `win-back-sequence` does) — NOT broadcast/segment.

Why: Each N1 email must include the personalized `/strategy/[access_token]` URL. Broadcasts can't do this per-user.

Use `sendEmail()` from `@/lib/email/send-email`, not `enqueueAndProcessMarketingRun`.

### 2e. email_type keys for email_logs
```
nurture-freebie-n1   (Day 2)
nurture-freebie-n2   (Day 5)
nurture-freebie-n3   (Day 9)
nurture-freebie-n4   (Day 14)
nurture-freebie-n5   (Day 20)
```

### 2f. Per-email SQL pattern (follow win-back-sequence as a model)
```sql
SELECT fbs.id, fbs.email, fbs.name, fbs.access_token, fbs.created_at
FROM freebie_brand_strategies fbs
WHERE fbs.created_at <= NOW() - INTERVAL '2 days'   -- Day 2
  AND NOT EXISTS (
    SELECT 1 FROM email_logs el
    WHERE el.user_email = fbs.email
      AND el.email_type = 'nurture-freebie-n1'
      AND el.status IN ('sent', 'delivered')
  )
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s
    JOIN users u ON u.id = s.user_id
    WHERE u.email = fbs.email AND s.status = 'active'
  )
ORDER BY fbs.created_at ASC
LIMIT 200
```

Repeat pattern for N2 (5 days), N3 (9 days), N4 (14 days), N5 (20 days).

---

## Step 3: Create 5 Email Templates

**Location:** `lib/email/templates/`

**Files to create:**
```
nurture-freebie-n1.ts  — Day 2: "did you see it?"
nurture-freebie-n2.ts  — Day 5: "the part nobody tells you"
nurture-freebie-n3.ts  — Day 9: "I want to show you something"
nurture-freebie-n4.ts  — Day 14: "a real message I got last week"
nurture-freebie-n5.ts  — Day 20: "I'm going to be honest with you"
```

**Interface for each template:**
```typescript
interface NurtureFreebiEmailProps {
  firstName?: string        // fallback: "friend"
  recipientEmail: string
  strategyUrl?: string      // only needed for N1: https://sselfie.ai/strategy/[access_token]
}
```

**Copy source:** Read `~/stella/drafts/SEQ-FREEBIE-NURTURE-APPROVED-2026-03-02.md` for exact subject lines and body copy for each of N1–N5.

**Design:** Match `win-back-day3.ts` / `freebie-strategy-email.ts` styling — clean, minimal, Sandra's voice. Do NOT use fancy HTML layouts — plain-ish email, just like Sandra's other emails.

**From:** `Sandra from SSELFIE <hello@sselfie.ai>`  
**Reply-To:** `hello@sselfie.ai`

---

## Step 4: Add nurture-sequence to vercel.json

Add this entry to the `crons` array in `vercel.json`:
```json
{
  "path": "/api/cron/nurture-sequence",
  "schedule": "0 10 * * *"
}
```
(Runs daily at 10am UTC, same as win-back-sequence.)

---

## Step 5: Assess welcome-sequence

Read `app/api/cron/welcome-sequence/route.ts` fully and answer:
1. Which table does it query? What is the Day 0 trigger condition?
2. Does it have any dependency on blueprint or old systems?
3. Are the email templates it uses (`generateWelcomeDay0` etc.) still valid?
4. Is there any conflict with `onboarding-sequence`?

**Do NOT enable welcome-sequence yet.** Just assess and report. Sandra will decide when to re-enable Studio onboarding emails.

---

## Step 6: Commit + Report

Commit all changes with descriptive messages:
1. `feat(email): rewrite nurture-sequence for freebie_brand_strategies (Day 2/5/9/14/20)`
2. `feat(email): add nurture freebie N1-N5 email templates with approved SEQ-01 copy`
3. `feat(cron): add nurture-sequence to vercel.json daily 10am`

Then write a brief report to `~/stella/reports/EMAIL-SYSTEM-REBOOT-2026-03-02.md` covering:
- List of cron files classified (table above)
- Any unexpected findings
- welcome-sequence assessment
- Confirmation that nurture-sequence is live
- Any env vars needed (e.g. CRON_SECRET should already be set)

---

## What NOT to Touch

- `.env.local` or `.env` files — do not read or modify
- Resend segment IDs — North handles those
- Any cron that is currently in vercel.json (except adding nurture-sequence)
- The old `MARKETING_SEGMENTS` env vars in config.ts — don't need them for the new approach
- `freebie-strategy-email.ts` — this is the initial delivery email, leave it alone

---

## How to Run This Spec

```
codex --approval-mode full-auto --quiet "Read /Users/MD760HA/stella/tasks/codex-EMAIL-SYSTEM-AUDIT-AND-REBOOT-2026-03-02.md and implement it exactly. Start with Step 1 (audit), then Steps 2-4 (rewrite + add to vercel.json), then Step 5 (assess). Commit at Step 6. Report to ~/stella/reports/EMAIL-SYSTEM-REBOOT-2026-03-02.md"
```

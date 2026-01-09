# EMAIL SYSTEM AUDIT - January 9, 2026

**Status:** 🚨 **CRITICAL ISSUE FOUND**

---

## Executive Summary

Sandra reported **947 failed emails in the last 24 hours** (87.4% failure rate).

**Root Cause:** Campaign #26 ("Welcome Sequence - Email 3") is stuck in `sending` status and has been failing repeatedly because it's missing the required plain text version (`body_text` is empty).

---

## The Problem

### Campaign #26 Details

- **Name:** Welcome Sequence - Email 3
- **Type:** `resend_automation_email`
- **Status:** `sending` (stuck since Dec 29, 2025)
- **Recipients:** 2,767 users
- **Subject:** "One week in - you're crushing it! 🎯"
- **HTML Content:** ✅ 4,903 characters
- **Text Content:** ❌ **EMPTY** (0 characters)
- **Failures:** 946 attempts (so far)

### Why It's Failing

The campaign executor (`lib/email/run-scheduled-campaigns.ts`) validates that **both `body_html` AND `body_text` must exist** before sending:

```typescript
if (!emailContent.text || emailContent.text.trim().length === 0) {
  const errorMsg = "Email text content is empty"
  result.recipients.failed++
  await logEmailSend(recipientEmail, `campaign-${campaign.id}`, "failed", undefined, errorMsg, campaign.id)
  continue
}
```

**Campaign #26 has HTML but no plain text** → Every send attempt fails → 946 failures logged

---

## Email System Overview

### Active Email Sequences

1. **Welcome Sequence** (Campaigns #24-30)
   - Day 0: Initial welcome
   - Day 3: Check-in
   - Day 7: Advanced features (Campaign #26 - **BROKEN**)

2. **Blueprint Subscribers**
   - Onboarding emails for blueprint downloads
   
3. **Freebie Subscribers**
   - Launch email sequence
   - Follow-up campaigns

4. **Reengagement Campaigns**
   - Welcome back sequence
   - Win-back offers

5. **Upsell Campaigns**
   - Freebie to membership
   - Day 10 upsells

### Cron Jobs (15 active)

Located in `app/api/cron/`:

- `welcome-sequence/` - Daily at 10 AM UTC
- `send-scheduled-campaigns/` - Every 15 minutes
- `blueprint-email-sequence/`
- `nurture-sequence/`
- `onboarding-sequence/`
- `reactivation-campaigns/`
- `reengagement-campaigns/`
- `upsell-campaigns/`
- `win-back-sequence/`
- `sync-audience-segments/`
- `admin-alerts/`
- ... and more

### Email Statistics (Last 24 Hours)

- **Total Emails:** 1,084
- **✅ Successful:** 4 (0.4%)
- **❌ Failed:** 947 (87.4%)
- **⏳ Pending:** 0
- **📧 Opened:** 0
- **🔗 Clicked:** 0

---

## Root Cause Analysis

### What Happened

1. **Dec 29, 2025:** Campaign #26 created via Resend automation and logged to `admin_email_campaigns` table
2. **HTML content was saved** but **plain text version was not generated**
3. **Jan 8, 2026:** Campaign scheduled to send
4. **Cron job** (`send-scheduled-campaigns`) runs every 15 minutes
5. **Each attempt fails** because `body_text` is empty
6. Campaign status remains `sending` (never completes)
7. **Cron job keeps retrying** → 946 failures over 24 hours

### Why Plain Text Was Missing

Campaign #26 is type `resend_automation_email`, which means:

- It was created through Resend's automation system
- The HTML was imported into the database
- **But the plain text conversion was skipped** (likely a bug in the import process)

### Similar Issues

Campaigns #25 and #27 are also stuck in `sending` status:

- **Campaign #25:** "Welcome Sequence - Email 1" (2,762 recipients)
- **Campaign #27:** "Welcome Sequence - Email 2" (2,762 recipients)

Need to check if they also have missing `body_text`.

---

## The Fix

### Immediate Action Required

1. **Stop Campaign #26** from retrying
   - Change status from `sending` → `failed`
   - Add error message to `metrics`

2. **Generate plain text version** of Campaign #26
   - Convert HTML to plain text
   - Update `body_text` field

3. **Check Campaigns #25 and #27**
   - If they also have empty `body_text`, fix them too

4. **Prevent Future Issues**
   - Update the campaign creation process to always generate plain text
   - Add validation before saving campaigns

### Long-Term Improvements

1. **Email Content Validation**
   - Add schema validation when creating campaigns
   - Require both HTML and text versions
   - Fail fast if either is missing

2. **Campaign Executor Improvements**
   - Add better error handling for stuck campaigns
   - Implement max retry limit (e.g., stop after 10 failures)
   - Send admin alert when campaign fails repeatedly

3. **Monitoring**
   - Set up alerts for high failure rates (>10%)
   - Dashboard to show campaign health
   - Automatic rollback for broken campaigns

---

## Other Email System Issues Found

### 1. Missing Click Tracking

The Resend webhook is receiving click events but can't find the original email records:

```
⚠️ Could not find email_logs entry for clicked message ID: 4b064e0d-7b84...
```

**Impact:** Losing click tracking data for some emails

**Cause:** Emails sent before `email_logs` table was created, or emails sent via external systems (Flodesk)

**Fix:** Make webhook more graceful - log clicks even if original email record doesn't exist

### 2. Cron Job Logging

No `cron_job_logs` table exists, making it hard to debug cron job failures.

**Recommendation:** Create centralized cron job logging system

### 3. Sequence Table Schema Issues

Some sequence subscriber tables have outdated schemas:

- `blueprint_subscribers` missing `onboarding_email_sent` column
- `freebie_subscribers` using JSONB tags instead of dedicated columns
- `welcome_back_sequence` inconsistent with other sequences

**Recommendation:** Standardize sequence subscriber schema across all tables

---

## Action Items

### Priority 1 (URGENT - Do Now)

- [ ] Fix Campaign #26 (stop retries, generate plain text)
- [ ] Check & fix Campaigns #25 and #27
- [ ] Run email system health check

### Priority 2 (This Week)

- [ ] Add validation to campaign creation
- [ ] Implement max retry limit for campaigns
- [ ] Fix click tracking webhook
- [ ] Create cron job logging system

### Priority 3 (This Month)

- [ ] Standardize sequence subscriber tables
- [ ] Build email system monitoring dashboard
- [ ] Document all email sequences
- [ ] Create email system runbook

---

## Technical Details

### Campaign Executor Flow

```
1. Cron job runs every 15 minutes
   ↓
2. Query for campaigns with status='scheduled' and scheduled_for <= NOW()
   ↓
3. For each campaign:
   a. Update status to 'sending'
   b. Resolve recipients
   c. Get email content (HTML + text)
   d. Validate content (both must exist)
   e. Send to each recipient
   f. Log results
   g. Update status to 'sent' or 'failed'
   ↓
4. If validation fails:
   - Log failure for that recipient
   - Continue to next recipient
   - Status remains 'sending' (NEVER COMPLETES)
```

**The Bug:** If validation fails for ALL recipients, status stays `sending` and cron job keeps retrying forever.

### Files Involved

- `lib/email/run-scheduled-campaigns.ts` - Main executor
- `app/api/cron/send-scheduled-campaigns/route.ts` - Cron endpoint
- `lib/email/send-email.ts` - Email sending function
- `app/api/webhooks/resend/route.ts` - Webhook handler
- `admin_email_campaigns` table - Campaign storage
- `email_logs` table - Send attempt logging

---

## Conclusion

**Campaign #26 is broken and needs immediate attention.**

The email system is otherwise healthy, but needs:
1. Better validation
2. Retry limits
3. Monitoring

Once Campaign #26 is fixed, the failure rate should drop to near 0%.

---

**Report Generated:** January 9, 2026  
**Next Review:** After implementing Priority 1 fixes

# Cold Re-education Sequence Implementation

**Date:** January 8, 2025  
**Purpose:** 3-email re-introduction sequence for 2,700+ cold subscribers tagged as `cold_users` in Resend  
**Status:** ✅ Implemented

---

## 📋 Overview

The Cold Re-education Sequence targets subscribers from last year's selfie guide who are **NOT app customers**. These users need education about SSELFIE Studio, not re-engagement.

### Key Differences from Other Campaigns

- **Target:** Resend `cold_users` segment (not database-only)
- **Audience:** Non-customers (excludes active subscribers)
- **Tone:** Educational, transparent, invitation-based
- **Purpose:** Re-introduce SSELFIE Studio to original community

---

## 🗂️ Files Created

### 1. Cron Route
**File:** `/app/api/cron/cold-reeducation-sequence/route.ts`

- **Schedule:** Daily at 11 AM UTC
- **Pattern:** Based on `nurture-sequence/route.ts`
- **Email Types:** `cold-edu-day-1`, `cold-edu-day-3`, `cold-edu-day-7`
- **Safety Gate:** `COLD_EDUCATION_ENABLED` environment flag

### 2. Email Templates
**Location:** `/lib/email/templates/`

- **`cold-edu-day-1.tsx`** - "I disappeared for a while — here's why."
- **`cold-edu-day-3.tsx`** - "From selfies to Studio — this is how it works."
- **`cold-edu-day-7.tsx`** - "You're invited — your 30% creator restart."

### 3. Cron Registration
**File:** `vercel.json`

```json
{
  "path": "/api/cron/cold-reeducation-sequence",
  "schedule": "0 11 * * *"
}
```

---

## 🎯 Target Audience

### Inclusion Criteria
1. **Resend Tag:** Must have `cold_users` tag in Resend
2. **Not Active Subscriber:** No active subscriptions in database
3. **No Recent Re-engagement:** Hasn't received `reengagement-day-*` emails in last 90 days
4. **Not Already Sent:** Hasn't received `cold-edu-day-*` emails

### Exclusion Criteria
- ✅ Active subscribers (status='active', is_test_mode=false)
- ✅ Users who received re-engagement emails in last 90 days
- ✅ Users who already received cold education emails

---

## 📧 Email Sequence

### Day 1: "I disappeared for a while — here's why."
**Subject:** "I disappeared for a while — here's why."

**Content:**
- Personal, transparent explanation
- Mentions selfie guide download
- Explains building SSELFIE Studio
- Introduces the product concept
- **CTA:** "See what's new →" (homepage link)

**Timing:** Sent immediately when user is eligible (no prior cold-edu emails)

### Day 3: "From selfies to Studio — this is how it works."
**Subject:** "From selfies to Studio — this is how it works."

**Content:**
- Educational explanation
- References original selfie guide
- Explains how SSELFIE Studio works (3-step process)
- Visual breakdown of the workflow
- **CTA:** "Learn how SSELFIE works →" (homepage link)

**Timing:** Sent 3 days after Day 1 email

### Day 7: "You're invited — your 30% creator restart."
**Subject:** "You're invited — your 30% creator restart."

**Content:**
- Invitation tone (not pushy)
- 30% discount offer (code: RESTART30)
- Acknowledges original community membership
- Warm, personal closing
- **CTA:** "Activate your account →" (checkout link with discount)

**Timing:** Sent 7 days after Day 1 email

---

## ⚙️ Configuration

### Environment Flag
**Variable:** `COLD_EDUCATION_ENABLED`

**Default:** `false` (disabled by default for safety)

**Usage:**
```typescript
const coldEducationEnabled = process.env.COLD_EDUCATION_ENABLED === "true"
```

**Purpose:** Safety gate to enable/disable entire campaign without code changes

### Email Control
The campaign respects existing email control flags:
- `EMAIL_SENDING_ENABLED` (global kill switch)
- `EMAIL_TEST_MODE` (test mode with whitelist)
- Rate limiting (built into `send-email.ts`)

---

## 🔒 Safety Features

### 1. Deduplication
- Checks `email_logs` table before sending
- Prevents duplicate sends of same email type
- Double-checks at both query and send time

### 2. Exclusion Logic
```sql
-- Excludes active subscribers
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions 
  WHERE user_id = u.id 
  AND status = 'active' 
  AND is_test_mode = false
)

-- Excludes re-engagement recipients
WHERE NOT EXISTS (
  SELECT 1 FROM email_logs 
  WHERE user_email = u.email 
  AND email_type IN ('reengagement-day-0', 'reengagement-day-7', 'reengagement-day-14')
  AND sent_at > NOW() - INTERVAL '90 days'
)
```

### 3. Resend Segment-Based
- Fetches all contacts from Resend
- Filters by `cold_users` tag
- Matches with database for user data

### 4. Batch Limits
- Processes up to 100 emails per day per email type
- Prevents overwhelming email service
- Allows gradual rollout

---

## 📊 Logging & Tracking

### Email Logs
All emails are logged to `email_logs` table with:
- `user_email`: Recipient email
- `email_type`: `cold-edu-day-1`, `cold-edu-day-3`, or `cold-edu-day-7`
- `status`: `sent`, `failed`, or `error`
- `sent_at`: Timestamp
- `resend_message_id`: Resend API message ID

### Cron Logger
Uses `createCronLogger("cold-reeducation-sequence")` for:
- Execution tracking
- Success/failure metrics
- Error logging

### Admin Error Log
Errors are logged to `admin_error_log` with:
- `toolName`: `cron:cold-reeducation-sequence:day-{1|3|7}`
- `error`: Error message
- `context`: Email address

---

## 🔗 UTM Tracking

All email links include UTM parameters for Growth Dashboard tracking:

**Day 1:**
```
?utm_source=email&utm_medium=email&utm_campaign=cold-edu-day-1&utm_content=cta_button
```

**Day 3:**
```
?utm_source=email&utm_medium=email&utm_campaign=cold-edu-day-3&utm_content=cta_button
```

**Day 7:**
```
?utm_source=email&utm_medium=email&utm_campaign=cold-edu-day-7&utm_content=cta_button
```

---

## 💰 Discount Code

**Code:** `RESTART30`

**Discount:** 30% off first month

**Usage:** Applied via checkout URL parameter:
```
/checkout/membership?discount=RESTART30
```

**Note:** Discount code must be configured in Stripe as a coupon/promotion code.

---

## ✅ Testing Checklist

### Pre-Production
- [ ] Set `COLD_EDUCATION_ENABLED=false` initially
- [ ] Verify Resend `cold_users` segment exists
- [ ] Test cron route manually (bypass CRON_SECRET in dev)
- [ ] Verify query excludes active subscribers
- [ ] Verify query excludes re-engagement recipients
- [ ] Test email template rendering
- [ ] Test email sending in test mode (`EMAIL_TEST_MODE=true`)
- [ ] Verify UTM tracking parameters
- [ ] Verify discount code link format

### Production Rollout
- [ ] Enable `COLD_EDUCATION_ENABLED=true` in Vercel
- [ ] Monitor first batch (Day 1 emails)
- [ ] Verify email_logs entries
- [ ] Check Resend delivery status
- [ ] Monitor for errors in admin error log
- [ ] Verify no overlap with other campaigns
- [ ] Track conversion metrics (if applicable)

---

## 🚫 Cost Safety

### No Credit/Bonus Systems
- ✅ No `addCredits()` calls
- ✅ No milestone bonuses
- ✅ No referral rewards
- ✅ No API cost impact beyond standard Resend sends

### Email Costs Only
- Standard Resend email sending costs
- No additional API usage
- No compute-intensive operations

---

## 📈 Expected Results

### Day 1
- **Target:** All eligible `cold_users` (up to 100 per day)
- **Goal:** Re-introduce SSELFIE Studio
- **Metric:** Open rate, click rate

### Day 3
- **Target:** Users who received Day 1 email 3 days ago
- **Goal:** Educate about how Studio works
- **Metric:** Engagement rate, click rate

### Day 7
- **Target:** Users who received Day 1 email 7 days ago
- **Goal:** Convert with discount offer
- **Metric:** Conversion rate, discount code usage

---

## 🔄 Maintenance

### Monitoring
- Check cron execution logs daily
- Monitor email_logs for send failures
- Review admin error log for issues
- Track Resend delivery rates

### Adjustments
- Adjust batch size if needed (currently 100 per day)
- Modify exclusion criteria if overlap detected
- Update email content based on performance
- Adjust discount code if needed

---

## 📝 Notes

### Overlap Prevention
- **Re-engagement Campaigns:** Excludes users who received re-engagement emails in last 90 days
- **Win-Back Sequence:** No overlap (targets canceled subscribers, not cold users)
- **Nurture Sequence:** No overlap (targets freebie subscribers, not cold users)

### Resend Segment Sync
- Cold users are tagged via `/api/cron/sync-audience-segments` (runs daily at 2 AM UTC)
- Segment ID: `e515e2d6-1f0e-4a4c-beec-323b8758be61`
- Tag: `cold_users` with value `true`

---

**End of Documentation**

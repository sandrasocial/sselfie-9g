# Reactivation Campaigns - Phase 1 Implementation

**Date:** January 8, 2025  
**Status:** ✅ Phase 1 Complete (Days 0-5)  
**Next:** Phase 2 (Days 7-14) and Phase 3 (Days 20-25) pending

---

## 📋 Overview

The Reactivation Campaigns target 2,700+ cold subscribers from last year's selfie guide who are **NOT app customers**. This is a 3-phase sequence designed to gradually re-engage and convert cold leads.

### Phase 1: RECONNECT (Days 0-5) ✅ COMPLETE

**Purpose:** Remind them who you are and rebuild trust before pitching anything.

| Day | Email | Subject | CTA | Status |
|-----|-------|---------|-----|--------|
| **0** | "It's been a while 👋" | "It's been a while 👋" | Read what's new | ✅ Implemented |
| **2** | "The Future of Professional Selfies" | "Why professional selfies just got an upgrade" | Learn more | ✅ Implemented |
| **5** | "How SSELFIE Studio Works" | "See how creators are building their brand visuals in minutes" | Explore Studio | ✅ Implemented |

---

## 🗂️ Files Created

### 1. Cron Route
**File:** `/app/api/cron/reactivation-campaigns/route.ts`

- **Schedule:** Daily at 11 AM UTC
- **Pattern:** Based on `nurture-sequence/route.ts`
- **Email Types:** `reactivation-day-0`, `reactivation-day-2`, `reactivation-day-5`
- **Safety Gate:** `REACTIVATION_CAMPAIGNS_ENABLED` environment flag

### 2. Email Templates
**Location:** `/lib/email/templates/`

- **`reactivation-day-0.tsx`** - "It's been a while 👋"
- **`reactivation-day-2.tsx`** - "Why professional selfies just got an upgrade"
- **`reactivation-day-5.tsx`** - "See how creators are building their brand visuals in minutes"
- **`reactivation-sequence.tsx`** - Sequence wrapper (exports all Phase 1 templates)

### 3. Cron Registration
**File:** `vercel.json`

```json
{
  "path": "/api/cron/reactivation-campaigns",
  "schedule": "0 11 * * *"
}
```

---

## 🎯 Target Audience

### Inclusion Criteria
1. **Resend Tag:** Must have `cold_users` tag in Resend
2. **Not Active Subscriber:** No active subscriptions in database
3. **No Recent Re-engagement:** Hasn't received `reengagement-day-*` emails in last 90 days
4. **No Recent Win-back:** Hasn't received `win-back-offer` email in last 90 days
5. **Not Already Sent:** Hasn't received `reactivation-day-*` emails
6. **Not Old Sequence:** Hasn't received old `cold-edu-day-*` emails (prevents overlap)

### Exclusion Criteria
- ✅ Active subscribers (status='active', is_test_mode=false)
- ✅ Users who received re-engagement emails in last 90 days
- ✅ Users who received win-back emails in last 90 days
- ✅ Users who already received reactivation emails
- ✅ Users who received old cold-edu emails (migration safety)

---

## 📧 Email Sequence Details

### Day 0: "It's been a while 👋"
**Subject:** "It's been a while 👋"

**Content:**
- Warm, personal reconnection
- Mentions selfie guide download
- Acknowledges time passed
- Soft introduction to what's new
- **CTA:** "Read what's new →" (homepage link)

**Timing:** Sent immediately when user is eligible (no prior reactivation emails)

**UTM Tracking:**
```
?utm_source=coldreactivation&utm_campaign=reactivation_sequence&utm_content=day0
```

### Day 2: "Why professional selfies just got an upgrade"
**Subject:** "Why professional selfies just got an upgrade"

**Content:**
- References original selfie guide
- Teases the problem (time spent on selfies)
- Introduces the solution concept
- Educational, problem-focused
- **CTA:** "Learn more →" (homepage link)

**Timing:** Sent 2 days after Day 0 email

**UTM Tracking:**
```
?utm_source=coldreactivation&utm_campaign=reactivation_sequence&utm_content=day2
```

### Day 5: "See how creators are building their brand visuals in minutes"
**Subject:** "See how creators are building their brand visuals in minutes"

**Content:**
- Shows how SSELFIE Studio works
- 3-step process explanation
- Soft introduction to the app
- No hard sell
- **CTA:** "Explore Studio →" (homepage link)

**Timing:** Sent 5 days after Day 0 email

**UTM Tracking:**
```
?utm_source=coldreactivation&utm_campaign=reactivation_sequence&utm_content=day5
```

---

## ⚙️ Configuration

### Environment Flag
**Variable:** `REACTIVATION_CAMPAIGNS_ENABLED`

**Default:** `false` (disabled by default for safety)

**Usage:**
```typescript
const reactivationEnabled = process.env.REACTIVATION_CAMPAIGNS_ENABLED === "true"
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
- Excludes users who received old `cold-edu-day-*` emails

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

-- Excludes win-back recipients
WHERE NOT EXISTS (
  SELECT 1 FROM email_logs 
  WHERE user_email = u.email 
  AND email_type = 'win-back-offer'
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
- `email_type`: `reactivation-day-0`, `reactivation-day-2`, or `reactivation-day-5`
- `status`: `sent`, `failed`, or `error`
- `sent_at`: Timestamp
- `resend_message_id`: Resend API message ID

### Cron Logger
Uses `createCronLogger("reactivation-campaigns")` for:
- Execution tracking
- Success/failure metrics
- Error logging

### Admin Error Log
Errors are logged to `admin_error_log` with:
- `toolName`: `cron:reactivation-campaigns:day-{0|2|5}`
- `error`: Error message
- `context`: Email address

---

## 🔗 UTM Tracking

All email links include UTM parameters for Growth Dashboard tracking:

**Format:**
```
?utm_source=coldreactivation&utm_campaign=reactivation_sequence&utm_content=day{X}
```

**Parameters:**
- `utm_source`: `coldreactivation` (consistent across all emails)
- `utm_campaign`: `reactivation_sequence` (consistent across all emails)
- `utm_content`: `day0`, `day2`, or `day5` (specific to each email)

---

## ✅ Testing Checklist

### Pre-Production
- [x] Set `REACTIVATION_CAMPAIGNS_ENABLED=false` initially
- [x] Verify Resend `cold_users` segment exists
- [ ] Test cron route manually (bypass CRON_SECRET in dev)
- [ ] Verify query excludes active subscribers
- [ ] Verify query excludes re-engagement recipients
- [ ] Verify query excludes win-back recipients
- [ ] Verify query excludes old cold-edu recipients
- [ ] Test email template rendering
- [ ] Test email sending in test mode (`EMAIL_TEST_MODE=true`)
- [ ] Verify UTM tracking parameters
- [ ] Verify no overlap with other campaigns

### Production Rollout
- [ ] Enable `REACTIVATION_CAMPAIGNS_ENABLED=true` in Vercel
- [ ] Monitor first batch (Day 0 emails)
- [ ] Verify email_logs entries
- [ ] Check Resend delivery status
- [ ] Monitor for errors in admin error log
- [ ] Verify no overlap with other campaigns
- [ ] Track conversion metrics (if applicable)

---

## 🚫 Migration from Old Sequence

### Old Files Archived
- ✅ `cold-edu-day-1.tsx` → `archived/cold-edu-day-1.tsx`
- ✅ `cold-edu-day-3.tsx` → `archived/cold-edu-day-3.tsx`
- ✅ `cold-edu-day-7.tsx` → `archived/cold-edu-day-7.tsx`

### Old Route Disabled
- ✅ `app/api/cron/cold-reeducation-sequence/route.ts` → `route.ts.disabled`

### Overlap Prevention
- ✅ New sequence excludes users who received old `cold-edu-day-*` emails
- ✅ Old sequence disabled (won't run)
- ✅ No duplicate sends possible

---

## 🔜 Next Steps (Phase 2 & 3)

### Phase 2: DISCOVER (Days 7-14) - Pending
- Day 7: "The easiest way to get studio-quality photos of yourself"
- Day 10: "Why top creators are switching to AI Studio"
- Day 14: "Your invitation to try SSELFIE Studio (with 25 bonus credits)" + credit bonus logic

### Phase 3: CONVERT (Days 20-25) - Pending
- Day 20: "Ready to launch your brand visuals?"
- Day 25: "50% Off SSELFIE Studio — this week only" (COMEBACK50 discount)

---

## 📝 Notes

### Overlap Prevention
- **Re-engagement Campaigns:** Excludes users who received re-engagement emails in last 90 days
- **Win-Back Sequence:** Excludes users who received win-back emails in last 90 days
- **Nurture Sequence:** No overlap (targets freebie subscribers, not cold users)
- **Old Cold-Edu Sequence:** Excludes users who received old cold-edu emails

### Resend Segment Sync
- Cold users are tagged via `/api/cron/sync-audience-segments` (runs daily at 2 AM UTC)
- Segment ID: `e515e2d6-1f0e-4a4c-beec-323b8758be61`
- Tag: `cold_users` with value `true`

---

**End of Phase 1 Documentation**

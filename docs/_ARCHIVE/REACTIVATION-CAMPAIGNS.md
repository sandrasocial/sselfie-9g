# Reactivation Campaigns - Complete Implementation

**Date:** January 8, 2025  
**Status:** ✅ Complete (8 emails over 25 days)  
**Goal:** Move cold subscribers from curiosity → trust → activation → conversion

---

## 📋 Overview

The Reactivation Campaigns target 2,700+ cold subscribers from last year's selfie guide who are **NOT app customers**. This is a 3-phase sequence designed to gradually re-engage and convert cold leads over 25 days.

### Campaign Structure

| Phase | Days | Purpose | Emails |
|-------|------|---------|--------|
| **Phase 1: RECONNECT** | 0-5 | Reintroduce, rebuild trust, spark curiosity | Day 0, 2, 5 |
| **Phase 2: DISCOVER** | 7-14 | Show real value, dissolve skepticism, offer first taste | Day 7, 10, 14 |
| **Phase 3: CONVERT** | 20-25 | Move warm leads to paid membership with calm urgency | Day 20, 25 |

---

## 📧 Email Sequence Details

### Phase 1: RECONNECT (Days 0-5)

#### Day 0: "It's been a while 👋"
**Subject:** "It's been a while — here's what I've been building"

**Content:**
- Warm, personal reconnection
- Mentions selfie guide download
- Acknowledges time passed
- Soft introduction to SSELFIE Studio
- **CTA:** "See what's new →" (homepage)

**Timing:** Sent immediately when user is eligible

**UTM:** `?utm_source=coldreactivation&utm_campaign=reactivation_sequence&utm_content=day0`

---

#### Day 2: "The easiest way to create content that looks and feels like you."
**Subject:** "The easiest way to create content that looks and feels like you"

**Content:**
- References original selfie guide
- Teases the problem (time spent on selfies)
- Introduces the solution concept
- Educational, problem-focused
- **CTA:** "Learn how it works →" (how-it-works page)

**Timing:** Sent 2 days after Day 0

**UTM:** `?utm_source=coldreactivation&utm_campaign=reactivation_sequence&utm_content=day2`

---

#### Day 5: "See how creators are simplifying their content."
**Subject:** "See how creators are simplifying their content"

**Content:**
- Shows how SSELFIE Studio works
- 3-step process explanation
- Soft introduction to the app
- No hard sell
- **CTA:** "Explore the Studio →" (homepage)

**Timing:** Sent 5 days after Day 0

**UTM:** `?utm_source=coldreactivation&utm_campaign=reactivation_sequence&utm_content=day5`

---

### Phase 2: DISCOVER (Days 7-14)

#### Day 7: "Real photos. Real you. No filters."
**Subject:** "Real photos. Real you. No filters."

**Content:**
- Addresses AI photo skepticism
- Emphasizes authenticity
- "No filters, no retouching, no weird hands"
- **CTA:** "See the difference →" (showcase page)

**Timing:** Sent 7 days after Day 0

**UTM:** `?utm_source=coldreactivation&utm_campaign=reactivation_sequence&utm_content=day7`

---

#### Day 10: "What creators are making inside SSELFIE Studio."
**Subject:** "What creators are making inside SSELFIE Studio"

**Content:**
- Social proof and use cases
- Lists: profile photos, launch visuals, 30-day content
- "No camera. No stress."
- **CTA:** "Get inspired →" (homepage)

**Timing:** Sent 10 days after Day 0

**UTM:** `?utm_source=coldreactivation&utm_campaign=reactivation_sequence&utm_content=day10`

---

#### Day 14: "You're invited — 25 credits to explore SSELFIE Studio."
**Subject:** "You're invited — 25 credits to explore SSELFIE Studio"

**Content:**
- Special offer: 25 free credits
- "Because you joined my original Selfie Guide list"
- Lists what they can do with credits
- **CTA:** "Activate my Studio →" (signup page with utm_source)

**Timing:** Sent 14 days after Day 0

**UTM:** `?utm_source=coldreactivation&utm_campaign=reactivation_sequence&utm_content=day14&utm_medium=email`

**Credit Bonus:** Users who sign up via this link receive 25 credits automatically (handled in `app/auth/callback/route.ts`)

---

### Phase 3: CONVERT (Days 20-25)

#### Day 20: "Your studio is ready — come see it."
**Subject:** "Your studio is ready — come see it"

**Content:**
- Calm urgency
- "You've explored the idea. Now it's time to make it real."
- Lists benefits: photos, feed planner, brand building
- **CTA:** "Join SSELFIE Studio →" (membership page)

**Timing:** Sent 20 days after Day 0

**UTM:** `?utm_source=coldreactivation&utm_campaign=reactivation_sequence&utm_content=day20`

---

#### Day 25: "50% off your first month — this week only."
**Subject:** "50% off your first month — this week only"

**Content:**
- Final call with discount offer
- Lists membership benefits
- **Promo Code:** COMEBACK50
- "Cancel anytime. No stress."
- **CTA:** "Claim 50% Off →" (checkout with discount)

**Timing:** Sent 25 days after Day 0

**UTM:** `?utm_source=coldreactivation&utm_campaign=reactivation_sequence&utm_content=day25&utm_medium=email`

**Discount:** Uses existing Stripe promo code `COMEBACK50`

---

## 🗂️ Files Created

### 1. Cron Route
**File:** `/app/api/cron/reactivation-campaigns/route.ts`

- **Schedule:** Daily at 11 AM UTC
- **Pattern:** Based on `nurture-sequence/route.ts`
- **Email Types:** `reactivation-day-{0,2,5,7,10,14,20,25}`
- **Safety Gate:** `REACTIVATION_CAMPAIGNS_ENABLED` environment flag

### 2. Email Templates
**Location:** `/lib/email/templates/`

- **`reactivation-day-0.tsx`** - "It's been a while 👋"
- **`reactivation-day-2.tsx`** - "The easiest way to create content..."
- **`reactivation-day-5.tsx`** - "See how creators are simplifying..."
- **`reactivation-day-7.tsx`** - "Real photos. Real you. No filters."
- **`reactivation-day-10.tsx`** - "What creators are making..."
- **`reactivation-day-14.tsx`** - "You're invited — 25 credits..."
- **`reactivation-day-20.tsx`** - "Your studio is ready..."
- **`reactivation-day-25.tsx`** - "50% off your first month..."
- **`reactivation-sequence.tsx`** - Sequence wrapper (exports all 8 templates)

### 3. Credit Bonus Logic
**File:** `app/auth/callback/route.ts`

- Checks for `utm_source=coldreactivation` in signup URL
- Grants 25 credits to new users (created within last 5 minutes)
- Transaction type: `bonus`
- Description: "Reactivation signup bonus (Day 14 campaign)"

### 4. Cron Registration
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

### 5. Credit Bonus Safety
- Only grants credits to new users (created within last 5 minutes)
- Prevents duplicate grants on subsequent logins
- Non-blocking (auth doesn't fail if credit grant fails)

---

## 📊 Logging & Tracking

### Email Logs
All emails are logged to `email_logs` table with:
- `user_email`: Recipient email
- `email_type`: `reactivation-day-{0,2,5,7,10,14,20,25}`
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
- `toolName`: `cron:reactivation-campaigns:day-{0|2|5|7|10|14|20|25}`
- `error`: Error message
- `context`: Email address

### Credit Transactions
Credit bonuses are logged to `credit_transactions` with:
- `transaction_type`: `bonus`
- `description`: "Reactivation signup bonus (Day 14 campaign)"
- `amount`: 25

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
- `utm_content`: `day0`, `day2`, `day5`, `day7`, `day10`, `day14`, `day20`, or `day25` (specific to each email)
- `utm_medium`: `email` (added for Day 14 and Day 25)

---

## 💰 Credit Bonus Logic

### Day 14 Signup Bonus

When a user signs up via the Day 14 email link (`utm_source=coldreactivation`), they automatically receive 25 credits.

**Implementation:** `app/auth/callback/route.ts`

```typescript
// Grant reactivation bonus credits if user signed up via coldreactivation campaign
const utmSource = requestUrl.searchParams.get("utm_source")
if (utmSource === "coldreactivation" && neonUser?.id) {
  // Check if new user (created within last 5 minutes)
  // Grant 25 credits via addCredits()
}
```

**Safety:**
- Only grants to new users (created within last 5 minutes)
- Prevents duplicate grants on subsequent logins
- Non-blocking (auth doesn't fail if credit grant fails)

---

## 💳 Discount Logic

### Day 25 Discount

The Day 25 email includes a 50% discount using the existing Stripe promo code `COMEBACK50`.

**Link Format:**
```
/checkout/membership?discount=COMEBACK50&utm_source=coldreactivation&utm_campaign=reactivation_sequence&utm_content=day25&utm_medium=email
```

**Stripe Configuration:**
- Promo code: `COMEBACK50`
- Discount: 50% off first month
- Must be configured in Stripe dashboard

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
- [ ] Test all 8 email template rendering
- [ ] Test email sending in test mode (`EMAIL_TEST_MODE=true`)
- [ ] Verify UTM tracking parameters
- [ ] Test credit bonus logic (signup with utm_source=coldreactivation)
- [ ] Verify COMEBACK50 promo code exists in Stripe
- [ ] Verify no overlap with other campaigns

### Production Rollout
- [ ] Enable `REACTIVATION_CAMPAIGNS_ENABLED=true` in Vercel
- [ ] Monitor first batch (Day 0 emails)
- [ ] Verify email_logs entries
- [ ] Check Resend delivery status
- [ ] Monitor for errors in admin error log
- [ ] Verify credit bonuses are granted correctly
- [ ] Track conversion metrics
- [ ] Verify no overlap with other campaigns

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

### Credit Bonus Cost
- 25 credits per signup from Day 14 email
- Cost: ~$3.75 per signup (25 credits × $0.15/credit)
- Only granted to new users (prevents duplicate grants)

### Discount Cost
- 50% off first month = ~$74.50 discount
- One-time discount (first month only)
- Uses existing Stripe promo code `COMEBACK50`

---

**End of Documentation**

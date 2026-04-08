# SSELFIE Studio Email Automation System Audit
## Cold Audience Reactivation Campaign Preparation

**Date:** January 8, 2025  
**Purpose:** Full audit of email automation system to safely prepare a new "Cold Audience Reactivation" campaign for 2,700+ cold subscribers in Resend  
**Status:** Read-only inspection complete

---

## 1️⃣ Existing Campaigns

| Campaign | File Path | Status | Schedule | Email Types Sent | Env Flag | Target Audience |
|----------|-----------|--------|----------|------------------|----------|----------------|
| **Re-Engagement Campaigns** | `/app/api/cron/reengagement-campaigns/route.ts` | ✅ Active | Daily 12 PM UTC | `reengagement-day-0`, `reengagement-day-7`, `reengagement-day-14` | None | Active subscribers, 30+ days inactive |
| **Win-Back Sequence** | `/app/api/cron/win-back-sequence/route.ts` | ✅ Active | Daily 10 AM UTC | `win-back-offer` | `WIN_BACK_DISCOUNT_PERCENT`, `WIN_BACK_PROMO_CODE` | Canceled subscriptions (10+ days) |
| **Nurture Sequence** | `/app/api/cron/nurture-sequence/route.ts` | ✅ Active | Daily 11 AM UTC | `nurture-day-1`, `nurture-day-3`, `nurture-day-7`, `nurture-day-10` | None | Freebie subscribers (non-converted) |
| **Welcome Sequence** | `/app/api/cron/welcome-sequence/route.ts` | ✅ Active | Daily 10 AM UTC | `welcome-day-0`, `welcome-day-3`, `welcome-day-7` | None | New paid members (active subscriptions) |
| **Onboarding Sequence** | `/app/api/cron/onboarding-sequence/route.ts` | ✅ Active | Daily 10 AM UTC | `onboarding-day-0`, `onboarding-day-2`, `onboarding-day-7` | None | New Studio members (active subscriptions) |
| **Upsell Campaigns** | `/app/api/cron/upsell-campaigns/route.ts` | ✅ Active | Daily 10 AM UTC | `upsell-day-10`, `upsell-freebie-membership` | None | Freebie subscribers (Day 10, Day 20) |
| **Blueprint Followups** | `/app/api/cron/send-blueprint-followups/route.ts` | ✅ Active | Daily 10 AM UTC | `blueprint-followup-day-3`, `blueprint-followup-day-7`, `blueprint-followup-day-14` | None | Blueprint subscribers |
| **Welcome Back Sequence** | `/app/api/cron/welcome-back-sequence/route.ts` | ⚠️ **DISABLED** | N/A | N/A | None | **Disabled - overlaps with reengagement-campaigns** |
| **Milestone Bonuses** | `/app/api/cron/milestone-bonuses/route.ts` | ⚠️ **Gated** | Daily 2 PM UTC | `milestone-bonus` | `MILESTONE_BONUSES_ENABLED=false` | Users hitting 10/50/100 image milestones |
| **Referral Rewards** | `/app/api/cron/referral-rewards/route.ts` | ✅ Active | Daily 1 PM UTC | `referral-reward` | `REFERRAL_BONUSES_ENABLED=true` | Referrers (when referred user purchases) |
| **Admin Alerts** | `/app/api/cron/admin-alerts/route.ts` | ✅ Active | Daily 7 AM UTC | `admin-alert` | None | Admin emails (margin alerts) |
| **Sync Audience Segments** | `/app/api/cron/sync-audience-segments/route.ts` | ✅ Active | Daily 2 AM UTC | N/A (segmentation only) | None | All Resend contacts (tags/segments) |

### Campaign Schedule Summary
- **10 AM UTC:** Blueprint followups, Welcome sequence, Onboarding sequence, Upsell campaigns
- **11 AM UTC:** Nurture sequence
- **12 PM UTC:** Re-engagement campaigns
- **1 PM UTC:** Referral rewards
- **2 PM UTC:** Milestone bonuses, Sync audience segments
- **7 AM UTC:** Admin alerts

---

## 2️⃣ Templates Inventory

| Template File | Used By | Subject / Purpose | Notes |
|---------------|---------|-------------------|-------|
| `reengagement-sequence.ts` | `reengagement-campaigns` | Day 0: "Haven't seen you in a while... 👀"<br>Day 7: "What You're Missing"<br>Day 14: "Comeback Offer: 50% Off" | 3-email sequence for inactive subscribers |
| `win-back-offer.tsx` | `win-back-sequence` | "We Miss You - Here's Something Special" | Single email with discount offer |
| `nurture-day-1.tsx` | `nurture-sequence` | "Your First Day with SSELFIE" | Freebie subscriber nurture |
| `nurture-day-3.tsx` | `nurture-sequence` | "How's It Going?" | Freebie subscriber nurture |
| `nurture-day-7.tsx` | `nurture-sequence` | "One Week In" | Freebie subscriber nurture |
| `nurture-sequence.ts` | `nurture-sequence` | (Sequence wrapper) | Contains all nurture templates |
| `welcome-day-0.tsx` | `welcome-sequence` | "You're in! Let's get you creating 🚀" | New paid member welcome |
| `welcome-day-3.tsx` | `welcome-sequence` | "3 Days In - How's It Going?" | New paid member followup |
| `welcome-day-7.tsx` | `welcome-sequence` | "One Week In - You're Crushing It" | New paid member followup |
| `welcome-sequence.ts` | `welcome-sequence` | (Sequence wrapper) | Contains all welcome templates |
| `onboarding-day-0.tsx` | `onboarding-sequence` | "Welcome to The Visibility Studio" | Studio member onboarding |
| `onboarding-day-2.tsx` | `onboarding-sequence` | "Your first shoot is waiting" | Studio member onboarding |
| `onboarding-day-7.tsx` | `onboarding-sequence` | "You're building your brand beautifully" | Studio member onboarding |
| `upsell-day-10.tsx` | `upsell-campaigns`, `nurture-sequence` | "Ready for the Next Level?" | **Reused by nurture-sequence** |
| `upsell-freebie-membership.tsx` | `upsell-campaigns` | "Unlock Your Full Potential" | Freebie to paid conversion |
| `blueprint-followup-day-3.tsx` | `send-blueprint-followups` | "3 Ways to Use Your Blueprint" | Blueprint subscriber followup |
| `blueprint-followup-day-7.tsx` | `send-blueprint-followups` | "This Could Be You" | Blueprint subscriber followup |
| `blueprint-followup-day-14.tsx` | `send-blueprint-followups` | "Still thinking about it? Here's $10 off 💕" | Blueprint subscriber followup |
| `milestone-bonus.tsx` | `milestone-bonuses` | "You hit {milestone} photos! Here's {reward} bonus credits 🎉" | Milestone reward email |
| `referral-invite.tsx` | `trigger-referral-email` | "Your friend thinks you'd love SSELFIE" | Referral invitation |
| `referral-reward.tsx` | `referral-rewards` | "You just earned 50 bonus credits for sharing SSELFIE 🎉" | Referral reward notification |
| `credit-renewal.tsx` | Stripe webhook | "Your monthly credits have been renewed" | Credit renewal notification |
| `welcome-email.tsx` | User signup | "Welcome to SSELFIE" | Initial welcome (one-time) |
| `welcome-back-reengagement.tsx` | (Unused) | N/A | **Not currently used** |

### Template Reuse Patterns
- **`upsell-day-10.tsx`** is used by both `upsell-campaigns` and `nurture-sequence` (Day 10)
- **Sequence wrappers** (`reengagement-sequence.ts`, `nurture-sequence.ts`, `welcome-sequence.ts`) export multiple day functions
- **Individual day templates** (`nurture-day-1.tsx`, etc.) are standalone exports

---

## 3️⃣ Segmentation Logic

### Database-Based Segmentation
All campaigns query directly from Neon database tables:
- **`users`** table: `email`, `display_name`, `last_login_at`, `created_at`
- **`subscriptions`** table: `status`, `product_type`, `created_at`, `updated_at`, `is_test_mode`
- **`freebie_subscribers`** table: `email`, `name`, `created_at`, `converted_to_user`
- **`blueprint_subscribers`** table: `email`, `created_at`, `blueprint_completed`
- **`email_logs`** table: `user_email`, `email_type`, `sent_at`, `status` (for deduplication)

### Resend-Based Segmentation
- **Tags-based:** Contacts tagged with `source`, `status`, `product`, `journey` via `/lib/resend/manage-contact.ts`
- **Segments:** Managed via Resend API (`all_subscribers`, `beta_users`, `paid_users`, `cold_users`)
- **Sync cron:** `/api/cron/sync-audience-segments` runs daily at 2 AM UTC to sync tags

### Cold Users Definition
**Current Implementation:**
- **Resend tags:** `cold_users` tag applied via `sync-audience-segments` cron
- **Database logic:** Users with no email activity in 30+ days (from `email_logs`)
- **Location:** `/lib/audience/segment-sync.ts` (lines 203-212)
- **Query:** Finds emails with NO `email_logs` entries in last 30 days

**Existing Cold User References:**
- `/app/api/admin/alex/chat/route.ts` mentions "97% of your audience (2,670) are cold users"
- `/scripts/add-engagement-tags.ts` tags users inactive 30-90 days as "cold" + "inactive"

### Audience Fetching Methods
1. **Direct DB queries** (most campaigns): Query `users`, `subscriptions`, `freebie_subscribers` directly
2. **Resend API** (segmentation sync): Fetch all contacts, then tag based on DB data
3. **Email logs deduplication**: All campaigns check `email_logs` to prevent duplicate sends

---

## 4️⃣ Environment Flags

| Flag | Default | Used By | Purpose |
|------|---------|---------|---------|
| `MILESTONE_BONUSES_ENABLED` | `false` | `milestone-bonuses` | Gate milestone credit bonuses |
| `REFERRAL_BONUSES_ENABLED` | `true` | `referral-rewards`, `referrals/track` | Gate referral credit rewards |
| `CREDIT_GIFTS_ENABLED` | `false` | (Future) | Gate user-to-user credit gifting |
| `WIN_BACK_DISCOUNT_PERCENT` | `20` | `win-back-sequence` | Discount percentage for win-back offer |
| `WIN_BACK_PROMO_CODE` | `COMEBACK20` | `win-back-sequence` | Promo code for win-back offer |
| `CRON_SECRET` | Required | All cron routes | Authentication for cron jobs |
| `RESEND_API_KEY` | Required | All email sending | Resend API authentication |
| `RESEND_AUDIENCE_ID` | Required | Segmentation sync | Resend audience ID |
| `EMAIL_SENDING_ENABLED` | `false` (DB flag) | `send-email.ts` | Global email kill switch |
| `EMAIL_TEST_MODE` | `false` (DB flag) | `send-email.ts` | Test mode (whitelist only) |
| `EMAIL_TEST_WHITELIST` | (Optional) | `email-control.ts` | Comma-separated whitelist for test mode |

### Email Control System
- **Location:** `/lib/email/email-control.ts`
- **Database flags:** Stored in `admin_feature_flags` table
- **Kill switch:** `email_sending_enabled` flag can disable all email sending
- **Test mode:** `email_test_mode` + `EMAIL_TEST_WHITELIST` restricts sends to whitelisted emails

---

## 5️⃣ Risks or Overlaps

### ⚠️ **HIGH RISK: Overlap with Re-Engagement Campaigns**

**Issue:** `reengagement-campaigns` already targets inactive subscribers (30+ days inactive)

**Current Logic:**
```sql
-- Re-engagement targets:
WHERE s.status = 'active'
AND (u.last_login_at < NOW() - INTERVAL '30 days' OR u.last_login_at IS NULL)
AND el_day0.id IS NULL  -- Hasn't received reengagement-day-0
```

**Cold Reactivation Target (Proposed):**
- 2,700+ cold subscribers in Resend
- Likely includes many users who are 30+ days inactive
- **Risk:** Same users could receive both `reengagement-day-0` and cold reactivation emails

**Recommendation:**
- **Option A:** Exclude users who have received ANY re-engagement email (`reengagement-day-0`, `reengagement-day-7`, `reengagement-day-14`)
- **Option B:** Target only users who are NOT active subscribers (different from re-engagement which targets active subscribers)
- **Option C:** Use Resend segment `cold_users` and exclude users with `reengagement-*` email logs

### ⚠️ **MEDIUM RISK: Overlap with Win-Back Sequence**

**Issue:** `win-back-sequence` targets canceled subscriptions (10+ days canceled)

**Current Logic:**
```sql
-- Win-back targets:
WHERE s.status = 'canceled'
AND s.updated_at <= NOW() - INTERVAL '10 days'
AND el.id IS NULL  -- Hasn't received win-back-offer
```

**Risk:** Cold subscribers may include canceled users who haven't received win-back email yet

**Recommendation:**
- Exclude users who have received `win-back-offer` email
- Or target only non-subscribers (never had subscription) vs. canceled subscribers

### ⚠️ **LOW RISK: Overlap with Nurture Sequence**

**Issue:** `nurture-sequence` targets freebie subscribers (non-converted)

**Current Logic:**
```sql
-- Nurture targets:
WHERE fs.converted_to_user = FALSE
AND fs.created_at < NOW() - INTERVAL 'X days'
```

**Risk:** Some cold subscribers may be freebie subscribers who haven't converted

**Recommendation:**
- Exclude users who have received `nurture-day-*` emails in last 30 days
- Or target only users who are NOT in `freebie_subscribers` table

### ✅ **SAFE: No Overlap with Other Campaigns**

- **Welcome sequence:** Targets new paid members (active subscriptions, created < 2 hours ago)
- **Onboarding sequence:** Targets new Studio members (active subscriptions, created < 2 hours ago)
- **Upsell campaigns:** Targets freebie subscribers at Day 10/20 (specific date windows)
- **Blueprint followups:** Targets blueprint subscribers (specific date windows)
- **Milestone bonuses:** Targets users hitting image generation milestones
- **Referral rewards:** Event-based (triggers on purchase)

---

## 6️⃣ Integration Points

### Recommended Files to Use

#### **1. New Cron Route**
**File:** `/app/api/cron/cold-reactivation/route.ts` (create new)

**Pattern to Follow:**
- Use `reengagement-campaigns/route.ts` as template (similar audience)
- Use `win-back-sequence/route.ts` for Resend segment integration example
- Include CRON_SECRET authentication
- Use `createCronLogger` for logging
- Use `logAdminError` for error tracking

#### **2. Email Template**
**File:** `/lib/email/templates/cold-reactivation.tsx` (create new)

**Pattern to Follow:**
- Use `reengagement-sequence.ts` as template (similar tone/purpose)
- Export `{ subject, html, text }` object
- Accept `{ firstName?: string, recipientEmail: string }` props
- Include UTM tracking in links
- Use existing brand styling (stone palette, clean minimal)

#### **3. Email Sending**
**File:** `/lib/email/send-email.ts` (existing - reuse)

**Features:**
- Automatic logging to `email_logs` table
- Rate limiting via `checkEmailRateLimit`
- Kill switch support via `email-control.ts`
- Test mode support
- Retry logic (3 attempts with exponential backoff)

#### **4. Segmentation**
**File:** `/lib/audience/segment-sync.ts` (existing - reference)

**Cold Users Logic:**
- Function: `identifyColdUsers()` (lines 203-212)
- Query: Users with NO `email_logs` entries in last 30 days
- Tag: `cold_users` tag applied via Resend API

**Alternative:** Query Resend directly for contacts with `cold_users` tag

#### **5. Database Queries**
**Pattern:**
```sql
-- Example: Target cold subscribers (not active, not canceled, no recent emails)
SELECT DISTINCT u.email, u.display_name
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id::varchar
LEFT JOIN email_logs el ON el.user_email = u.email 
  AND el.email_type IN ('reengagement-day-0', 'reengagement-day-7', 'reengagement-day-14', 'win-back-offer')
  AND el.sent_at > NOW() - INTERVAL '90 days'
WHERE u.email IS NOT NULL
  AND (s.id IS NULL OR s.status != 'active')  -- Not active subscriber
  AND el.id IS NULL  -- No recent re-engagement/win-back emails
  AND u.last_login_at < NOW() - INTERVAL '30 days'  -- Inactive 30+ days
LIMIT 100
```

---

## 7️⃣ Summary Recommendations

### ✅ **Safe Implementation Path**

#### **Step 1: Create New Cron Route**
- **File:** `/app/api/cron/cold-reactivation/route.ts`
- **Schedule:** Daily 1 PM UTC (after re-engagement at 12 PM, before referral rewards at 1 PM)
- **Pattern:** Clone `reengagement-campaigns/route.ts` and modify query logic

#### **Step 2: Create Email Template**
- **File:** `/lib/email/templates/cold-reactivation.tsx`
- **Pattern:** Clone `reengagement-sequence.ts` Day 0 template
- **Tone:** Value-first, warm, no hard sell (similar to re-engagement)
- **CTA:** Link to homepage with UTM tracking

#### **Step 3: Add Environment Flag**
- **Flag:** `COLD_REACTIVATION_ENABLED=true` (default: `false` for safety)
- **Location:** Wrap entire cron logic in flag check (like `milestone-bonuses`)
- **Purpose:** Allow easy disable without code changes

#### **Step 4: Define Target Audience**

**Option A: Resend Segment-Based (Recommended)**
```typescript
// Fetch contacts with 'cold_users' tag from Resend
const coldContacts = await resend.contacts.list({
  audienceId: process.env.RESEND_AUDIENCE_ID,
  // Filter by tag (if Resend API supports tag filtering)
})
```

**Option B: Database Query-Based (More Control)**
```sql
-- Target: Users who are:
-- 1. Not active subscribers
-- 2. Haven't received re-engagement emails in last 90 days
-- 3. Haven't received win-back emails in last 90 days
-- 4. Inactive for 30+ days
-- 5. In Resend 'cold_users' segment (verify via email match)
```

#### **Step 5: Deduplication Logic**
```typescript
// Check email_logs to prevent duplicate sends
const existingLog = await sql`
  SELECT id FROM email_logs
  WHERE user_email = ${email}
  AND email_type = 'cold-reactivation'
  LIMIT 1
`
if (existingLog.length > 0) {
  // Skip - already sent
  continue
}
```

#### **Step 6: Register in Vercel Cron**
```json
{
  "path": "/api/cron/cold-reactivation",
  "schedule": "0 13 * * *"  // 1 PM UTC
}
```

### 🚨 **Critical Safety Checks**

1. **Exclude Active Subscribers:** Only target users without active subscriptions
2. **Exclude Recent Re-Engagement Recipients:** Skip users who received `reengagement-*` emails in last 90 days
3. **Exclude Recent Win-Back Recipients:** Skip users who received `win-back-offer` in last 90 days
4. **Respect Email Control Flags:** Honor `EMAIL_SENDING_ENABLED` and `EMAIL_TEST_MODE`
5. **Rate Limiting:** Built into `send-email.ts` (respects limits automatically)
6. **Deduplication:** Always check `email_logs` before sending
7. **Environment Flag:** Gate entire campaign with `COLD_REACTIVATION_ENABLED`

### 📊 **Recommended Query Logic**

```sql
-- Cold Reactivation Target Query
SELECT DISTINCT
  u.email,
  u.display_name,
  u.last_login_at,
  u.created_at
FROM users u
-- Exclude active subscribers
LEFT JOIN subscriptions s_active ON s_active.user_id = u.id::varchar 
  AND s_active.status = 'active' 
  AND s_active.is_test_mode = false
-- Exclude users who received re-engagement emails
LEFT JOIN email_logs el_reeng ON el_reeng.user_email = u.email 
  AND el_reeng.email_type IN ('reengagement-day-0', 'reengagement-day-7', 'reengagement-day-14')
  AND el_reeng.sent_at > NOW() - INTERVAL '90 days'
-- Exclude users who received win-back emails
LEFT JOIN email_logs el_winback ON el_winback.user_email = u.email 
  AND el_winback.email_type = 'win-back-offer'
  AND el_winback.sent_at > NOW() - INTERVAL '90 days'
-- Exclude users who already received cold reactivation
LEFT JOIN email_logs el_cold ON el_cold.user_email = u.email 
  AND el_cold.email_type = 'cold-reactivation'
WHERE u.email IS NOT NULL
  AND u.email != ''
  AND s_active.id IS NULL  -- No active subscription
  AND el_reeng.id IS NULL  -- No recent re-engagement
  AND el_winback.id IS NULL  -- No recent win-back
  AND el_cold.id IS NULL  -- Not already sent cold reactivation
  AND (u.last_login_at < NOW() - INTERVAL '30 days' OR u.last_login_at IS NULL)  -- Inactive 30+ days
ORDER BY u.last_login_at ASC NULLS LAST  -- Oldest inactive first
LIMIT 100  -- Batch size
```

### 🎯 **Resend Integration**

**Current Resend Setup:**
- **Audience ID:** `RESEND_AUDIENCE_ID` env variable
- **API Key:** `RESEND_API_KEY` env variable
- **Cold Users Tag:** Applied via `sync-audience-segments` cron (tag: `cold_users`)
- **Contact Management:** `/lib/resend/manage-contact.ts` handles tag updates

**To Fetch Cold Users from Resend:**
```typescript
import { getAllResendContacts } from "@/lib/audience/segment-sync"

const allContacts = await getAllResendContacts()
const coldContacts = allContacts.filter(contact => 
  contact.tags?.some(tag => 
    (typeof tag === 'object' && tag.name === 'cold_users' && tag.value === 'true') ||
    tag === 'cold_users'
  )
)
```

**Note:** Resend API may not support direct tag filtering in `contacts.list()`, so filtering may need to happen client-side after fetching all contacts.

---

## 8️⃣ File Structure Summary

### Existing Email Infrastructure
```
/lib/email/
  ├── send-email.ts          # Core email sending (Resend integration)
  ├── email-control.ts       # Kill switch & test mode
  ├── segmentation.ts        # Database-based segmentation
  └── templates/
      ├── reengagement-sequence.ts  # Re-engagement templates
      ├── win-back-offer.tsx        # Win-back template
      ├── nurture-sequence.ts       # Nurture templates
      └── ... (other templates)

/app/api/cron/
  ├── reengagement-campaigns/route.ts  # Active subscribers, 30+ days inactive
  ├── win-back-sequence/route.ts       # Canceled subscriptions, 10+ days
  ├── nurture-sequence/route.ts         # Freebie subscribers
  └── ... (other cron jobs)

/lib/audience/
  └── segment-sync.ts        # Resend tag/segment management

/lib/resend/
  └── manage-contact.ts      # Resend contact CRUD operations
```

### New Files to Create
```
/app/api/cron/
  └── cold-reactivation/route.ts  # NEW: Cold audience reactivation cron

/lib/email/templates/
  └── cold-reactivation.tsx       # NEW: Cold reactivation email template
```

---

## 9️⃣ Testing Checklist

Before enabling the cold reactivation campaign:

- [ ] Verify `COLD_REACTIVATION_ENABLED=false` initially
- [ ] Test cron route manually (bypass CRON_SECRET in dev)
- [ ] Verify query excludes active subscribers
- [ ] Verify query excludes recent re-engagement recipients
- [ ] Verify query excludes recent win-back recipients
- [ ] Verify deduplication works (check `email_logs`)
- [ ] Test email template rendering
- [ ] Test email sending in test mode (`EMAIL_TEST_MODE=true`)
- [ ] Verify Resend segment sync includes cold users
- [ ] Check email_logs table for proper logging
- [ ] Monitor first batch (limit to 10-20 emails)
- [ ] Verify no overlap with other campaigns
- [ ] Enable `COLD_REACTIVATION_ENABLED=true` after validation

---

## 🔟 Next Steps

1. **Review this audit** with team
2. **Decide on target audience** (Resend segment vs. database query)
3. **Create email template** (`cold-reactivation.tsx`)
4. **Create cron route** (`cold-reactivation/route.ts`)
5. **Add environment flag** (`COLD_REACTIVATION_ENABLED`)
6. **Register in vercel.json** cron schedule
7. **Test in staging** with small batch
8. **Monitor first production run** closely
9. **Iterate based on results**

---

**End of Audit Report**

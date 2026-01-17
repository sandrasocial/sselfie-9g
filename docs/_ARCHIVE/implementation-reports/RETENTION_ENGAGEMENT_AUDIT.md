# SSELFIE Studio Retention & Engagement System Audit

**Date:** January 2025  
**Scope:** Complete technical audit of retention, engagement, and win-back automations  
**Status:** Read-only inspection

---

## 1. Existing Retention Logic

### ✅ **Re-Engagement Campaigns** (Working)
**File:** `app/api/cron/reengagement-campaigns/route.ts` (Lines 1-262)

**Implementation Status:** ✅ **Working**

**Summary:**
- Automated email sequence for inactive Studio members (30+ days no login)
- Day 0: "Haven't seen you in a while..." (sent when user is 30+ days inactive)
- Day 7: "You haven't seen what Maya can do now..." (sent 7 days after Day 0)
- Day 14: "Last call: Come back to Studio (50% off)" (sent 14 days after Day 0, includes COMEBACK50 promo code)

**Query Logic:**
- Targets: Active subscriptions with `status='active'` and `product_type IN ('sselfie_studio_membership', 'brand_studio_membership')`
- Inactivity detection: `u.last_login_at < NOW() - INTERVAL '30 days' OR u.last_login_at IS NULL`
- Deduplication: Uses `email_logs` table with `email_type` ('reengagement-day-0', 'reengagement-day-7', 'reengagement-day-14')
- Limit: 100 users per day per email type

**Email Templates:**
- `lib/email/templates/reengagement-sequence.ts` (Lines 1-379)
  - `generateReengagementDay0()` - Soft reconnection email
  - `generateReengagementDay7()` - Feature highlights email
  - `generateReengagementDay14()` - Final offer with 50% discount

**Schedule:** Runs daily (assumed 12 PM UTC based on comment, but not verified in Vercel cron config)

---

### ✅ **Win-Back Sequence** (Working)
**File:** `app/api/cron/win-back-sequence/route.ts` (Lines 1-214)

**Implementation Status:** ✅ **Working**

**Summary:**
- Automated win-back emails for canceled subscribers
- Targets subscriptions where `status='canceled'` and `updated_at <= NOW() - INTERVAL '10 days'`
- Skips users who have reactivated (checks for active subscriptions)
- Skips users who already received win-back email (via `email_logs`)

**Email Template:**
- `lib/email/templates/win-back-offer.tsx` (Lines 1-235)
  - Subject: "We Miss You - Here's Something Special"
  - Default offer: 20% off (configurable via `WIN_BACK_DISCOUNT_PERCENT` env var)
  - Default promo code: "COMEBACK20" (configurable via `WIN_BACK_PROMO_CODE` env var)
  - Offer expires 14 days from send date

**Query Logic:**
- Uses `subscriptions.updated_at` as proxy for `canceled_at` (no dedicated `canceled_at` column)
- Checks for reactivation: `NOT EXISTS (SELECT 1 FROM subscriptions s2 WHERE s2.user_id = s.user_id AND s2.status = 'active')`
- Deduplication: `email_logs` with `email_type = 'win-back-offer'`

**Schedule:** Runs daily at 10 AM UTC (same as other email sequences)

---

### ⚙️ **Welcome Back Sequence** (Disabled/Partial)
**File:** `app/api/cron/welcome-back-sequence/route.ts` (Lines 1-50)

**Implementation Status:** ⚙️ **Disabled** (intentionally)

**Summary:**
- Cron route exists but is disabled
- Comment states: "This cron job is disabled as it overlaps with reengagement-campaigns"
- Returns success message indicating re-engagement is handled by `reengagement-campaigns`

**Email Template:**
- `lib/email/templates/welcome-back-reengagement.tsx` (Lines 1-171)
  - Template exists but is not called by any active cron job
  - Links to `/whats-new` page (public, no login required)

**Status:** Template exists but unused. Consider removing or repurposing.

---

## 2. Engagement / Activity Tracking

### ⚙️ **User Login Tracking** (Partial)
**Implementation Status:** ⚙️ **Partial** - Column exists but update logic not found

**Database Column:**
- `users.last_login_at` (TIMESTAMP WITH TIME ZONE, nullable)
- Defined in schema: `lib/db/schema-types.ts` (Line 37)

**Update Logic:**
- ❌ **NOT FOUND:** No code found that updates `last_login_at` on user login
- Searched files: `app/auth/callback/route.ts`, `app/auth/login/page.tsx`, `lib/user-sync.ts`, `lib/user-mapping.ts`
- **Gap:** Users can log in but `last_login_at` is never updated, so re-engagement queries will always match `last_login_at IS NULL`

**Impact:** Re-engagement campaigns will target ALL users with `last_login_at IS NULL`, not just truly inactive users.

---

### ✅ **Chat Activity Tracking** (Working)
**Files:**
- `lib/data/maya.ts` (Lines 101-104, 277-282)
- `lib/feed-chat/history.ts` (Lines 98-101)

**Implementation Status:** ✅ **Working**

**Summary:**
- `maya_chats.last_activity` is updated when chats are loaded or messages are sent
- `feed_chat_history.last_activity` is updated on message send
- Used for sorting chats by recency

**Note:** This is chat-specific activity, not general user activity tracking.

---

### ✅ **Image Generation Tracking** (Working)
**Files:**
- `app/api/studio/activity/route.ts` (Lines 1-69)
- `app/api/profile/stats/route.ts` (Lines 35-46)

**Implementation Status:** ✅ **Working**

**Summary:**
- Tracks image generation via `generated_images` table
- `created_at` timestamp used for activity history
- Used for user stats (total generations, monthly generations, favorites)

**Note:** This tracks generation activity but is not used for inactivity detection in retention campaigns.

---

## 3. Win-Back Automations

### ✅ **Win-Back Email Template** (Working)
**File:** `lib/email/templates/win-back-offer.tsx` (Lines 1-235)

**Implementation Status:** ✅ **Working**

**Features:**
- Supports percentage or dollar amount discounts
- Configurable promo code and expiry date
- Links to `/checkout/membership` with promo code applied
- Handles both logged-in and logged-out users

**Trigger:**
- Called by `app/api/cron/win-back-sequence/route.ts` (Line 131)

---

### ✅ **Win-Back Cron Job** (Working)
**File:** `app/api/cron/win-back-sequence/route.ts` (Lines 1-214)

**Implementation Status:** ✅ **Working**

**Logic:**
- Queries canceled subscriptions (`status='canceled'`)
- Uses `updated_at` as proxy for cancellation date (10+ days ago)
- Skips reactivated users (checks for active subscriptions)
- Deduplication via `email_logs`

**Configuration:**
- `WIN_BACK_DISCOUNT_PERCENT` (default: 20)
- `WIN_BACK_PROMO_CODE` (default: "COMEBACK20")

---

### ⚙️ **Cancellation Webhook Handling** (Partial)
**File:** `app/api/webhooks/stripe/route.ts` (Lines 1770-1806)

**Implementation Status:** ⚙️ **Partial**

**Summary:**
- Handles `customer.subscription.deleted` event
- Updates subscription status to `'cancelled'` (note: uses 'cancelled' not 'canceled')
- Tags customer in Flodesk with `['cancelled']` tag
- **Gap:** Status inconsistency - webhook sets `'cancelled'` but win-back cron queries for `'canceled'` (no 'l')

**Status Inconsistency:**
- Webhook: `status = 'cancelled'` (Line 1790)
- Win-back query: `status = 'canceled'` (Line 75 in win-back-sequence/route.ts)
- **Impact:** Win-back emails may not be sent to users who canceled via Stripe webhook

---

## 4. Renewal / Credit Logic

### ✅ **Monthly Credit Grants** (Working)
**File:** `app/api/webhooks/stripe/route.ts` (Lines 1462-1678)

**Implementation Status:** ✅ **Working**

**Summary:**
- Credits granted on `invoice.payment_succeeded` event (monthly renewals)
- Uses `grantMonthlyCredits()` from `lib/credits.ts`
- Grants 200 credits for `sselfie_studio_membership`
- Handles idempotency (checks if credits already granted for this billing period)

**Logic:**
- Checks `billing_reason` to determine if it's a renewal or first payment
- Prevents duplicate grants using `credit_transactions` table
- Updates subscription `current_period_start` and `current_period_end`

**File:** `lib/credits.ts` (Lines 335-352)
- `grantMonthlyCredits()` function
- `SUBSCRIPTION_CREDITS.sselfie_studio_membership = 200`

---

### ⚙️ **Credit Renewal Reminders** (Missing)
**Implementation Status:** 🛠️ **Missing**

**Summary:**
- No automated emails sent when credits are renewed
- No reminders about upcoming renewals
- No notifications about credit balance or usage

**Gap:** Users are not notified when monthly credits are granted, which could improve engagement.

---

### ✅ **Credit System** (Working)
**File:** `lib/credits.ts` (Lines 1-352)

**Implementation Status:** ✅ **Working**

**Features:**
- Credit balance tracking (`user_credits` table)
- Transaction history (`credit_transactions` table)
- Credit costs: Training (25), Image (1), Animation (3)
- Subscription grants: Studio (200/month), One-time (50)

**Note:** No retention-specific logic tied to credit usage or balance.

---

## 5. In-App Engagement Features

### 🛠️ **In-App Reminders** (Missing)
**Implementation Status:** 🛠️ **Missing**

**Summary:**
- No in-app banners for unused credits
- No reminders about upcoming subscription renewals
- No notifications about inactivity or engagement prompts
- No "Welcome back" messages for returning users

**Files Checked:**
- `app/studio/page.tsx` - Main studio page (no engagement UI found)
- `app/api/admin/notifications/route.ts` - Admin notifications only (not user-facing)

**Gap:** No user-facing engagement features in the Studio UI.

---

### ✅ **Admin Notifications** (Working)
**File:** `app/api/admin/notifications/route.ts` (Lines 1-226)

**Implementation Status:** ✅ **Working** (Admin-only)

**Summary:**
- Tracks unread feedback, beta program status, critical bugs, webhook errors
- Sends email alerts to admin (`ssa@ssasocial.com`, `hello@sselfie.ai`)
- Not user-facing engagement features

---

## 6. Gaps & Recommendations

### 🔴 **Critical Gaps**

1. **`last_login_at` Never Updated**
   - **File:** No file found that updates `users.last_login_at`
   - **Impact:** Re-engagement campaigns target ALL users with `last_login_at IS NULL`, not just inactive users
   - **Fix:** Add `UPDATE users SET last_login_at = NOW() WHERE id = ?` in:
     - `app/auth/callback/route.ts` (after successful login)
     - `app/auth/login/page.tsx` (after successful login)
     - `middleware.ts` (on authenticated route access)

2. **Status Inconsistency: 'cancelled' vs 'canceled'**
   - **Webhook:** Sets `status = 'cancelled'` (with 'l')
   - **Win-back query:** Queries `status = 'canceled'` (without 'l')
   - **Impact:** Win-back emails may not be sent to users who canceled via Stripe
   - **Fix:** Standardize on one spelling (recommend 'canceled' to match Stripe API)

3. **No Credit Renewal Notifications**
   - **Impact:** Users don't know when credits are renewed, missing engagement opportunity
   - **Fix:** Send email on `invoice.payment_succeeded` when credits are granted

---

### ⚠️ **Medium Priority Gaps**

4. **No In-App Engagement Features**
   - No banners, modals, or reminders in Studio UI
   - **Fix:** Add UI components for:
     - Unused credit reminders
     - Welcome back messages
     - Renewal reminders

5. **Welcome Back Template Unused**
   - `welcome-back-reengagement.tsx` exists but is not called
   - **Fix:** Either remove or repurpose for a different use case

6. **No Activity-Based Segmentation**
   - Re-engagement only uses `last_login_at`, not generation activity
   - **Fix:** Consider multi-factor inactivity (no login AND no generation in 30 days)

7. **No Pre-Cancellation Retention**
   - No emails sent before cancellation (e.g., "Your subscription is about to expire")
   - **Fix:** Add sequence for `current_period_end` approaching (7 days, 3 days, 1 day)

---

### 💡 **Enhancement Opportunities**

8. **Credit Usage Reminders**
   - Send emails when credits are low (< 20 credits)
   - Send emails when credits haven't been used in 14 days

9. **Reactivation Tracking**
   - Track when users return after receiving re-engagement emails
   - Measure win-back email effectiveness

10. **A/B Testing Framework**
    - Test different win-back offers (20% vs 30% vs 50%)
    - Test different re-engagement messaging

---

## 7. Next Steps

### Top 3 Safe Next Implementations

1. **Fix `last_login_at` Updates** (Critical)
   - **Files to modify:**
     - `app/auth/callback/route.ts` - Add update after successful login
     - `middleware.ts` - Add update on authenticated route access (optional, more comprehensive)
   - **Impact:** High - Fixes re-engagement targeting accuracy
   - **Risk:** Low - Simple UPDATE query

2. **Fix Status Inconsistency** (Critical)
   - **Files to modify:**
     - `app/api/webhooks/stripe/route.ts` (Line 1790) - Change `'cancelled'` to `'canceled'`
     - OR `app/api/cron/win-back-sequence/route.ts` (Line 75) - Change `'canceled'` to `'cancelled'`
   - **Recommendation:** Use `'canceled'` (matches Stripe API standard)
   - **Impact:** High - Ensures win-back emails are sent
   - **Risk:** Low - Simple string change

3. **Add Credit Renewal Notification** (Medium)
   - **Files to modify:**
     - `app/api/webhooks/stripe/route.ts` (Lines 1678-1700) - Add email send after `grantMonthlyCredits()`
   - **Template:** Create `lib/email/templates/credit-renewal.tsx`
   - **Impact:** Medium - Improves user engagement and awareness
   - **Risk:** Low - Additive change, doesn't affect existing logic

---

## Summary Statistics

### ✅ Working Systems
- Re-engagement campaigns (Day 0, 7, 14)
- Win-back sequence (10+ days post-cancellation)
- Monthly credit grants (on invoice payment)
- Credit system (balance, transactions, costs)
- Chat activity tracking
- Image generation tracking

### ⚙️ Partial Systems
- User login tracking (column exists, not updated)
- Cancellation webhook (status inconsistency)
- Welcome back template (exists but unused)

### 🛠️ Missing Systems
- `last_login_at` update logic
- Credit renewal notifications
- In-app engagement features
- Pre-cancellation retention
- Activity-based segmentation
- Credit usage reminders

---

## File Reference Summary

### Cron Jobs
- `app/api/cron/reengagement-campaigns/route.ts` - ✅ Active
- `app/api/cron/win-back-sequence/route.ts` - ✅ Active
- `app/api/cron/welcome-back-sequence/route.ts` - ⚙️ Disabled

### Email Templates
- `lib/email/templates/reengagement-sequence.ts` - ✅ Used
- `lib/email/templates/win-back-offer.tsx` - ✅ Used
- `lib/email/templates/welcome-back-reengagement.tsx` - ⚙️ Unused

### Core Logic
- `app/api/webhooks/stripe/route.ts` - ✅ Credit grants, ⚙️ Status inconsistency
- `lib/credits.ts` - ✅ Credit system
- `lib/subscription.ts` - ✅ Subscription utilities

### Activity Tracking
- `lib/data/maya.ts` - ✅ Chat activity
- `app/api/studio/activity/route.ts` - ✅ Image generation history
- `users.last_login_at` - ⚙️ Column exists, not updated

---

**Audit Complete** ✅

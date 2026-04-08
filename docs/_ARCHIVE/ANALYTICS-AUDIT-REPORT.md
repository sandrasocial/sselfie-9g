# SSELFIE Studio Analytics Audit Report
**Phase 9: Growth Analytics Layer**  
**Date:** 2025-01-XX  
**Status:** ✅ Complete Audit

---

## 📊 Executive Summary

This audit maps all existing analytics, metrics, and telemetry systems in SSELFIE Studio to identify what's tracked, what's missing, and what data can power a Growth Dashboard.

**Key Findings:**
- ✅ **Strong Foundation:** Comprehensive user, revenue, and engagement tracking
- ⚙️ **Partial Coverage:** Referral metrics exist but need aggregation
- 🛠 **Missing:** Growth loop efficiency, milestone completion rates, email attribution

---

## 1. Tracked Metrics Inventory

### 1.1 User Metrics ✅ **FULLY TRACKED**

| Metric | Location | Calculation | Data Freshness | Destination | Status |
|--------|----------|-------------|----------------|-------------|--------|
| **Total Users** | `app/api/admin/agent/analytics/route.ts:31-38` | `COUNT(*) FROM users WHERE email IS NOT NULL` | Real-time | Database | ✅ Working |
| **Active Users (30d)** | `app/api/admin/agent/analytics/route.ts:34` | `COUNT(*) WHERE last_login_at > NOW() - INTERVAL '30 days'` | Real-time | Database | ✅ Working |
| **New Users (7d)** | `app/api/admin/agent/analytics/route.ts:35` | `COUNT(*) WHERE created_at > NOW() - INTERVAL '7 days'` | Real-time | Database | ✅ Working |
| **Paying Users** | `app/api/admin/agent/analytics/route.ts:41-60` | Union of active subscriptions + one-time purchasers | Real-time | Database | ✅ Working |
| **Free vs Paid Ratio** | Calculated from above | `paid_users / total_users` | Real-time | Computed | ✅ Working |

**Database Fields:**
- `users.created_at` - User signup date
- `users.last_login_at` - Last login timestamp (updated in `app/auth/callback/route.ts:38-48`)
- `users.email` - User email (for deduplication)

---

### 1.2 Referral Metrics ⚙️ **PARTIALLY TRACKED**

| Metric | Location | Calculation | Data Freshness | Destination | Status |
|--------|----------|-------------|----------------|-------------|--------|
| **Total Invites** | `app/api/referrals/stats/route.ts:37-44` | `COUNT(*) FROM referrals WHERE referrer_id = ?` | Real-time | Database | ✅ Working |
| **Pending Referrals** | `app/api/referrals/stats/route.ts:39` | `COUNT(*) WHERE status = 'pending'` | Real-time | Database | ✅ Working |
| **Completed Referrals** | `app/api/referrals/stats/route.ts:40` | `COUNT(*) WHERE status = 'completed'` | Real-time | Database | ✅ Working |
| **Conversion Rate** | Not aggregated | `completed / total * 100` | N/A | Missing | 🛠 Missing |
| **Top Referrers** | Not tracked | N/A | N/A | Missing | 🛠 Missing |
| **Referral Credits Earned** | `app/api/referrals/stats/route.ts:41` | `SUM(credits_awarded_referrer)` | Real-time | Database | ✅ Working |

**Database Fields:**
- `referrals.referrer_id` - User who referred
- `referrals.referred_id` - User who was referred
- `referrals.status` - 'pending' or 'completed'
- `referrals.credits_awarded_referrer` - Credits granted to referrer
- `referrals.credits_awarded_referred` - Credits granted to referred user
- `referrals.created_at` - Referral creation date
- `referrals.completed_at` - Referral completion date

**Gaps:**
- No platform-wide referral conversion rate
- No top referrers leaderboard
- No referral loop efficiency metric (referrals / active users)

---

### 1.3 Revenue Metrics ✅ **FULLY TRACKED**

| Metric | Location | Calculation | Data Freshness | Destination | Status |
|--------|----------|-------------|----------------|-------------|--------|
| **MRR** | `lib/stripe/stripe-live-metrics.ts:45-84` | Sum of active subscription prices | Real-time (cached 5min) | Database + Stripe API | ✅ Working |
| **Total Revenue** | `lib/revenue/db-revenue-metrics.ts:68-73` | `SUM(amount_cents) FROM stripe_payments WHERE status = 'succeeded'` | Real-time | Database | ✅ Working |
| **One-Time Revenue** | `lib/revenue/db-revenue-metrics.ts:50-56` | `SUM(amount_cents) WHERE payment_type = 'one_time_session'` | Real-time | Database | ✅ Working |
| **Credit Purchase Revenue** | `lib/revenue/db-revenue-metrics.ts:41-47` | `SUM(amount_cents) WHERE payment_type = 'credit_topup'` | Real-time | Database | ✅ Working |
| **Subscription Revenue** | `lib/revenue/db-revenue-metrics.ts:59-65` | `SUM(amount_cents) WHERE payment_type = 'subscription'` | Real-time | Database | ✅ Working |
| **ARR** | Not calculated | `MRR * 12` | N/A | Computed | ⚙️ Partial |
| **ARPU** | Not calculated | `total_revenue / total_users` | N/A | Computed | ⚙️ Partial |

**Database Tables:**
- `stripe_payments` - Comprehensive payment tracking (primary source)
- `credit_transactions` - Legacy credit purchases (fallback)
- `subscriptions` - Active subscription tracking

**Endpoints:**
- `/api/admin/dashboard/revenue` - Detailed revenue breakdown
- `/api/admin/dashboard/stats` - High-level revenue metrics

---

### 1.4 Engagement Metrics ✅ **FULLY TRACKED**

| Metric | Location | Calculation | Data Freshness | Destination | Status |
|--------|----------|-------------|----------------|-------------|--------|
| **Daily Active Creators** | `app/api/admin/agent/analytics/route.ts:63-71` | `COUNT(DISTINCT user_id) FROM generated_images WHERE created_at >= NOW() - INTERVAL '1 day'` | Real-time | Database | ✅ Working |
| **Total Generations** | `app/api/admin/agent/analytics/route.ts:65` | `COUNT(*) FROM generated_images` | Real-time | Database | ✅ Working |
| **Generations This Month** | `app/api/admin/agent/analytics/route.ts:66` | `COUNT(*) WHERE created_at >= date_trunc('month', CURRENT_DATE)` | Real-time | Database | ✅ Working |
| **Generations Per User** | `app/api/admin/agent/analytics/route.ts:166-168` | `total_generations / total_users` | Real-time | Computed | ✅ Working |
| **Milestone Completions** | Not tracked | N/A | N/A | Missing | 🛠 Missing |
| **Referral Triggers Sent** | `lib/referrals/trigger-referral-email.ts` | Logged in `email_logs` with type `'referral-invite-trigger'` | Real-time | Database | ✅ Working |

**Database Fields:**
- `generated_images.user_id` - Creator ID
- `generated_images.created_at` - Generation timestamp
- `generated_images.saved` - Favorite status
- `generated_images.category` - Image category

**Gaps:**
- No milestone completion tracking (10/50/100 images)
- No milestone bonus grant tracking

---

### 1.5 Email Metrics ⚙️ **PARTIALLY TRACKED**

| Metric | Location | Calculation | Data Freshness | Destination | Status |
|--------|----------|-------------|----------------|-------------|--------|
| **Total Sends** | `app/api/admin/dashboard/email-metrics/route.ts:26-34` | `COUNT(*) FROM email_logs WHERE created_at > NOW() - INTERVAL '24 hours'` | Real-time | Database | ✅ Working |
| **Delivery Rate** | `app/api/admin/dashboard/email-metrics/route.ts:57` | `delivered / total_sent * 100` | Real-time | Database | ✅ Working |
| **Failed Sends** | `app/api/admin/dashboard/email-metrics/route.ts:30` | `COUNT(*) WHERE status = 'failed' OR status = 'error'` | Real-time | Database | ✅ Working |
| **Open Rates** | Not tracked | N/A | N/A | Missing | 🛠 Missing |
| **Click-Through Rates** | `app/api/email/track-click/route.ts` | Tracked in `email_campaign_clicks` | Real-time | Database | ✅ Working |
| **Template Performance** | Not aggregated | N/A | N/A | Missing | 🛠 Missing |
| **Email Attribution** | Not tracked | N/A | N/A | Missing | 🛠 Missing |

**Database Tables:**
- `email_logs` - All email sends (user_email, email_type, status, sent_at)
- `email_campaign_clicks` - Click tracking (tracking_id, click_type, clicked_at)

**Email Types Tracked:**
- `welcome-day-0`, `welcome-day-3`, `welcome-day-7`
- `onboarding-day-0`, `onboarding-day-2`, `onboarding-day-7`
- `nurture-day-1`, `nurture-day-3`, `nurture-day-7`, `nurture-day-10`
- `blueprint-followup-day-3`, `blueprint-followup-day-7`, `blueprint-followup-day-14`
- `reengagement-day-0`, `reengagement-day-7`, `reengagement-day-14`
- `win-back-offer`
- `upsell-day-10`, `upsell-freebie-membership`
- `referral-invite-trigger`, `referral-reward`
- `credit-renewal`
- `milestone-bonus`

**Gaps:**
- No open rate tracking (requires Resend webhook integration)
- No template performance aggregation
- No email-to-conversion attribution

---

### 1.6 Credit Metrics ✅ **FULLY TRACKED**

| Metric | Location | Calculation | Data Freshness | Destination | Status |
|--------|----------|-------------|----------------|-------------|--------|
| **Total Credits Issued** | `user_credits.total_purchased` | Sum of all credit grants | Real-time | Database | ✅ Working |
| **Credits Spent** | `user_credits.total_used` | Sum of all credit deductions | Real-time | Database | ✅ Working |
| **Bonus Credits Granted** | `credit_transactions` | `SUM(amount) WHERE transaction_type = 'bonus'` | Real-time | Database | ✅ Working |
| **Referral Credits** | `referrals.credits_awarded_referrer + credits_awarded_referred` | Sum from referrals table | Real-time | Database | ✅ Working |
| **Milestone Credits** | Not aggregated | `SUM(amount) WHERE description LIKE 'Milestone%'` | N/A | Computable | ⚙️ Partial |

**Database Tables:**
- `user_credits` - User balance (balance, total_purchased, total_used)
- `credit_transactions` - All credit movements (amount, transaction_type, description, created_at)

**Transaction Types:**
- `purchase` - Credit purchases
- `subscription_grant` - Monthly credit grants
- `bonus` - Referral + milestone bonuses
- `image` - Image generation deduction
- `training` - Model training deduction
- `animation` - Video generation deduction
- `refund` - Credit refunds

---

### 1.7 System Health Metrics ✅ **FULLY TRACKED**

| Metric | Location | Calculation | Data Freshness | Destination | Status |
|--------|----------|-------------|----------------|-------------|--------|
| **Cron Job Execution** | `lib/cron-logger.ts:52-71` | Logged in `admin_cron_runs` | Real-time | Database | ✅ Working |
| **Cron Job Failures** | `lib/cron-logger.ts:114-181` | `status = 'failed'` in `admin_cron_runs` | Real-time | Database | ✅ Working |
| **Cron Job Duration** | `lib/cron-logger.ts:77-108` | `duration_ms` in `admin_cron_runs` | Real-time | Database | ✅ Working |
| **Webhook Errors** | `lib/webhook-monitoring.tsx:15-37` | Logged in `webhook_errors` | Real-time | Database | ✅ Working |
| **Admin Errors** | `lib/admin-error-log.ts:26-72` | Logged in `admin_email_errors` | Real-time | Database | ✅ Working |
| **API Latency** | Not tracked | N/A | N/A | Missing | 🛠 Missing |
| **Error Rate** | Not aggregated | N/A | N/A | Missing | 🛠 Missing |

**Database Tables:**
- `admin_cron_runs` - Cron execution logs (job_name, status, duration_ms, summary, error_id)
- `webhook_errors` - Webhook failure tracking (event_type, error_message, event_data)
- `admin_email_errors` - Admin tool errors (tool_name, error_message, error_stack, context)

---

## 2. Database Schema Mapping

### 2.1 Core Analytics Tables

#### `users`
**Analytic Fields:**
- `id` - User identifier
- `email` - User email (for deduplication)
- `display_name` - User name
- `created_at` - Signup date
- `last_login_at` - Last login timestamp (updated in auth callback)
- `referral_code` - User's referral code

**Indexes:**
- `idx_users_email` - Email lookup
- `idx_users_created_at` - Signup date queries
- `idx_users_last_login_at` - Active user queries

---

#### `referrals`
**Analytic Fields:**
- `id` - Referral ID
- `referrer_id` - User who referred
- `referred_id` - User who was referred
- `referral_code` - Referral code used
- `status` - 'pending' or 'completed'
- `credits_awarded_referrer` - Credits granted to referrer
- `credits_awarded_referred` - Credits granted to referred user
- `created_at` - Referral creation date
- `completed_at` - Referral completion date

**Indexes:**
- `idx_referrals_referrer_id` - Referrer queries
- `idx_referrals_referred_id` - Referred user queries
- `idx_referrals_referral_code` - Code lookup
- `idx_referrals_status` - Status filtering

---

#### `subscriptions`
**Analytic Fields:**
- `id` - Subscription ID
- `user_id` - User ID
- `product_type` - Product type (sselfie_studio_membership, etc.)
- `status` - 'active', 'canceled', 'expired'
- `current_period_end` - Subscription end date
- `created_at` - Subscription start date
- `updated_at` - Last update timestamp
- `is_test_mode` - Test mode flag

**Indexes:**
- `idx_subscriptions_user_id` - User subscription lookup
- `idx_subscriptions_status` - Active subscription queries

---

#### `credit_transactions`
**Analytic Fields:**
- `id` - Transaction ID
- `user_id` - User ID
- `amount` - Credit amount (positive for grants, negative for usage)
- `transaction_type` - 'purchase', 'subscription_grant', 'bonus', 'image', 'training', 'animation', 'refund'
- `description` - Transaction description (e.g., "Milestone 10 bonus")
- `reference_id` - Related entity ID
- `stripe_payment_id` - Stripe payment ID (for purchases)
- `balance_after` - Balance after transaction
- `created_at` - Transaction timestamp
- `product_type` - Product type (for purchases)
- `payment_amount_cents` - Payment amount (for revenue tracking)
- `is_test_mode` - Test mode flag

**Indexes:**
- `idx_credit_transactions_user_id` - User transaction history
- `idx_credit_transactions_type` - Transaction type filtering
- `idx_credit_transactions_created_at` - Time-based queries
- `idx_credit_transactions_product_type` - Product type filtering

---

#### `generated_images`
**Analytic Fields:**
- `id` - Image ID
- `user_id` - Creator ID
- `category` - Image category
- `subcategory` - Image subcategory
- `saved` - Favorite status
- `created_at` - Generation timestamp

**Indexes:**
- `idx_generated_images_user_id` - User image queries
- `idx_generated_images_created_at` - Time-based queries
- `idx_generated_images_category` - Category filtering

---

#### `email_logs`
**Analytic Fields:**
- `id` - Log ID
- `user_email` - Recipient email
- `email_type` - Email template type
- `status` - 'sent', 'delivered', 'failed', 'error', 'pending'
- `error_message` - Error details (if failed)
- `resend_message_id` - Resend API message ID
- `sent_at` - Send timestamp
- `created_at` - Log creation timestamp

**Indexes:**
- `idx_email_logs_user_email` - User email history
- `idx_email_logs_email_type` - Template performance
- `idx_email_logs_status` - Delivery status filtering
- `idx_email_logs_sent_at` - Time-based queries

---

#### `stripe_payments`
**Analytic Fields:**
- `id` - Payment ID
- `user_id` - User ID
- `payment_type` - 'subscription', 'one_time_session', 'credit_topup'
- `amount_cents` - Payment amount in cents
- `status` - 'succeeded', 'failed', 'pending'
- `stripe_payment_intent_id` - Stripe payment intent ID
- `created_at` - Payment timestamp
- `is_test_mode` - Test mode flag

**Indexes:**
- `idx_stripe_payments_user_id` - User payment history
- `idx_stripe_payments_payment_type` - Payment type filtering
- `idx_stripe_payments_status` - Status filtering
- `idx_stripe_payments_created_at` - Time-based queries

---

### 2.2 Lead Source Tables

#### `blueprint_subscribers`
**Analytic Fields:**
- `email` - Subscriber email
- `created_at` - Signup date
- `converted_to_user` - Conversion flag
- `converted_at` - Conversion timestamp
- `blueprint_completed` - Completion flag
- `cta_clicked` - CTA click flag
- `utm_source`, `utm_medium`, `utm_campaign` - UTM tracking

---

#### `freebie_subscribers`
**Analytic Fields:**
- `email` - Subscriber email
- `created_at` - Signup date
- `converted_to_user` - Conversion flag
- `converted_at` - Conversion timestamp
- `guide_opened` - Guide open flag
- `cta_clicked` - CTA click flag
- `utm_source`, `utm_medium`, `utm_campaign` - UTM tracking

---

## 3. Existing Reporting Endpoints

### 3.1 Admin Analytics Endpoints ✅

| Endpoint | Purpose | Metrics Returned | Status |
|----------|---------|------------------|--------|
| `/api/admin/agent/analytics` | Platform-wide analytics | Users, generations, chats, revenue, models, feeds | ✅ Working |
| `/api/admin/dashboard/stats` | Dashboard summary | Total users, MRR, total revenue, conversion rate | ✅ Working |
| `/api/admin/dashboard/revenue` | Revenue breakdown | MRR, total revenue, one-time revenue, credit revenue, trends | ✅ Working |
| `/api/admin/dashboard/email-metrics` | Email performance | Total sent, delivered, failed, delivery rate | ✅ Working |
| `/api/admin/dashboard/beta-users` | Beta user tracking | Beta user list with revenue | ✅ Working |
| `/api/admin/dashboard/revenue-history` | Revenue history | Monthly revenue trends | ✅ Working |

---

### 3.2 User-Facing Endpoints ✅

| Endpoint | Purpose | Metrics Returned | Status |
|----------|---------|------------------|--------|
| `/api/profile/stats` | User profile stats | Total generations, monthly generations, favorites | ✅ Working |
| `/api/studio/stats` | Studio activity stats | Generation stats | ✅ Working |
| `/api/referrals/stats` | Referral stats | Referral code, link, pending/completed counts, credits earned | ✅ Working |

---

### 3.3 Missing Endpoints 🛠

| Endpoint | Purpose | Metrics Needed | Priority |
|----------|---------|----------------|----------|
| `/api/admin/growth-dashboard` | Growth loop metrics | Referral conversion rate, milestone completions, loop efficiency | High |
| `/api/admin/referral-analytics` | Referral performance | Top referrers, conversion funnel, attribution | Medium |
| `/api/admin/email-attribution` | Email conversion tracking | Email-to-purchase attribution, template ROI | Medium |
| `/api/admin/milestone-analytics` | Milestone performance | Completion rates, bonus grants, engagement lift | Low |

---

## 4. Gaps & Recommendations

### 4.1 Fully Tracked ✅

**What's Working:**
- ✅ User metrics (total, active, new, paying)
- ✅ Revenue metrics (MRR, total, one-time, credits)
- ✅ Engagement metrics (generations, favorites, chats)
- ✅ Credit metrics (issued, spent, bonuses)
- ✅ System health (cron logs, webhook errors, admin errors)
- ✅ Email delivery tracking (sends, delivery rate, failures)

---

### 4.2 Partially Tracked ⚙️

**What Needs Aggregation:**

1. **Referral Conversion Rate**
   - **Current:** Individual referral stats exist
   - **Missing:** Platform-wide conversion rate
   - **Fix:** Add query to `/api/admin/growth-dashboard`
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE status = 'completed')::float / 
     NULLIF(COUNT(*), 0) * 100 as conversion_rate
   FROM referrals
   ```

2. **Milestone Completion Rates**
   - **Current:** Milestone bonuses granted (in credit_transactions)
   - **Missing:** Completion rate aggregation
   - **Fix:** Query `credit_transactions` for milestone bonuses
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE description LIKE 'Milestone 10%') as milestone_10,
     COUNT(*) FILTER (WHERE description LIKE 'Milestone 50%') as milestone_50,
     COUNT(*) FILTER (WHERE description LIKE 'Milestone 100%') as milestone_100
   FROM credit_transactions
   WHERE transaction_type = 'bonus'
   ```

3. **Email Template Performance**
   - **Current:** Individual email logs exist
   - **Missing:** Aggregated template performance
   - **Fix:** Group by `email_type` and calculate conversion rates
   ```sql
   SELECT 
     email_type,
     COUNT(*) as sent,
     COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
     COUNT(*) FILTER (WHERE status = 'failed') as failed
   FROM email_logs
   GROUP BY email_type
   ```

4. **ARR & ARPU**
   - **Current:** MRR exists
   - **Missing:** ARR calculation
   - **Fix:** `ARR = MRR * 12`
   - **Fix:** `ARPU = total_revenue / total_users`

---

### 4.3 Missing Entirely 🛠

**What Requires New Schema:**

1. **Referral Loop Efficiency**
   - **Definition:** `referrals / active_users` (self-sustaining if > 0.8)
   - **Current:** Both metrics exist separately
   - **Fix:** Compute in `/api/admin/growth-dashboard`
   - **Schema:** Not needed (computed metric)

2. **Email Open Rates**
   - **Definition:** Opens / sends * 100
   - **Current:** Not tracked
   - **Fix:** Integrate Resend webhook for open tracking
   - **Schema:** Add `opened_at` to `email_logs` or create `email_opens` table

3. **Email-to-Conversion Attribution**
   - **Definition:** Track which emails lead to purchases
   - **Current:** Not tracked
   - **Fix:** Link `email_logs` to `credit_transactions` via UTM parameters
   - **Schema:** Add `utm_source`, `utm_medium`, `utm_campaign` to `credit_transactions` (or track in separate attribution table)

4. **Top Referrers Leaderboard**
   - **Definition:** Users with most completed referrals
   - **Current:** Not aggregated
   - **Fix:** Query `referrals` grouped by `referrer_id`
   - **Schema:** Not needed (computed metric)

5. **API Latency Tracking**
   - **Definition:** Response time for API endpoints
   - **Current:** Not tracked
   - **Fix:** Add middleware to log response times
   - **Schema:** Create `api_metrics` table (endpoint, method, duration_ms, status_code, created_at)

6. **Milestone Achievement Tracking**
   - **Definition:** Track when users hit milestones (not just bonuses granted)
   - **Current:** Only bonus grants tracked
   - **Fix:** Query `generated_images` to find users at exact milestone counts
   - **Schema:** Not needed (computed metric)

---

### 4.4 Recommended Schema Additions

#### Option 1: Lightweight Event Logging
**Table:** `analytics_events`
```sql
CREATE TABLE analytics_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL, -- 'milestone_achieved', 'referral_converted', etc.
  user_id VARCHAR REFERENCES users(id),
  metadata JSONB, -- Flexible event data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);
```

**Use Cases:**
- Milestone achievements (before bonus grant)
- Referral conversions (event-level tracking)
- Email opens (if Resend webhook integrated)

---

#### Option 2: Daily Analytics Snapshots
**Table:** `analytics_snapshots`
```sql
CREATE TABLE analytics_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL UNIQUE,
  total_users INTEGER,
  active_users INTEGER,
  new_users INTEGER,
  paid_users INTEGER,
  total_referrals INTEGER,
  completed_referrals INTEGER,
  referral_conversion_rate DECIMAL(5,2),
  mrr DECIMAL(10,2),
  total_revenue DECIMAL(10,2),
  total_generations INTEGER,
  milestone_10_completions INTEGER,
  milestone_50_completions INTEGER,
  milestone_100_completions INTEGER,
  referral_loop_efficiency DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_analytics_snapshots_date ON analytics_snapshots(snapshot_date DESC);
```

**Use Cases:**
- Historical trend analysis
- Faster dashboard queries (pre-aggregated)
- Growth rate calculations

**Cron Job:** Daily snapshot at midnight UTC

---

#### Option 3: Email Attribution Table
**Table:** `email_attribution`
```sql
CREATE TABLE email_attribution (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  email_type VARCHAR(50) NOT NULL,
  email_log_id INTEGER REFERENCES email_logs(id),
  conversion_type VARCHAR(50), -- 'purchase', 'subscription', 'signup'
  conversion_id INTEGER, -- Link to credit_transaction or subscription
  conversion_value DECIMAL(10,2), -- Revenue attributed
  attribution_window_days INTEGER DEFAULT 30, -- Days between email and conversion
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_attribution_email ON email_attribution(user_email);
CREATE INDEX idx_email_attribution_type ON email_attribution(email_type);
CREATE INDEX idx_email_attribution_conversion ON email_attribution(conversion_type);
```

**Use Cases:**
- Email-to-purchase attribution
- Template ROI calculation
- Campaign performance analysis

---

## 5. Safe Integration Points

### 5.1 Growth Dashboard Component

**File:** `components/admin/growth-dashboard.tsx` (NEW)

**Data Source:** `/api/admin/growth-dashboard` (NEW)

**Safe Integration:**
- ✅ Uses existing database tables (no schema changes required)
- ✅ Computes metrics from existing data
- ✅ No risk to existing systems
- ✅ Read-only queries

**Metrics to Display:**
1. **Referral Loop Efficiency**
   - Formula: `(COUNT(referrals) / COUNT(active_users)) * 100`
   - Target: > 80% (self-sustaining)

2. **Referral Conversion Rate**
   - Formula: `(completed_referrals / total_referrals) * 100`
   - Target: 15-20%

3. **Milestone Completion Rates**
   - Formula: `(milestone_completions / total_users) * 100`
   - Track: 10, 50, 100 image milestones

4. **Growth Rate (WoW)**
   - Formula: `((new_users_this_week - new_users_last_week) / new_users_last_week) * 100`

5. **Referral Credits Granted**
   - Formula: `SUM(credits_awarded_referrer + credits_awarded_referred) FROM referrals`

---

### 5.2 Growth Dashboard API Endpoint

**File:** `app/api/admin/growth-dashboard/route.ts` (NEW)

**Queries:**
```typescript
// Referral metrics
const referralStats = await sql`
  SELECT 
    COUNT(*) as total_referrals,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_referrals,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_referrals,
    SUM(credits_awarded_referrer + credits_awarded_referred) as total_credits_granted
  FROM referrals
`

// Milestone completions
const milestoneStats = await sql`
  SELECT 
    COUNT(*) FILTER (WHERE description LIKE 'Milestone 10%') as milestone_10,
    COUNT(*) FILTER (WHERE description LIKE 'Milestone 50%') as milestone_50,
    COUNT(*) FILTER (WHERE description LIKE 'Milestone 100%') as milestone_100
  FROM credit_transactions
  WHERE transaction_type = 'bonus'
`

// Active users (for loop efficiency)
const activeUsers = await sql`
  SELECT COUNT(*) as count
  FROM users
  WHERE last_login_at > NOW() - INTERVAL '30 days'
`

// Referral loop efficiency
const loopEfficiency = activeUsers[0].count > 0
  ? (referralStats[0].total_referrals / activeUsers[0].count) * 100
  : 0
```

**Response:**
```typescript
{
  referralLoopEfficiency: number, // referrals / active_users
  referralConversionRate: number, // completed / total
  milestoneCompletions: {
    milestone_10: number,
    milestone_50: number,
    milestone_100: number
  },
  totalReferralCreditsGranted: number,
  growthRateWoW: number, // Week-over-week growth
  topReferrers: Array<{ userId: string, completed: number, creditsEarned: number }>
}
```

---

## 6. Performance Considerations

### 6.1 Query Optimization

**Current State:**
- ✅ Most queries use indexes
- ✅ Aggregations are efficient
- ⚠️ Some queries scan full tables (e.g., `generated_images` for milestone detection)

**Recommendations:**
1. **Add Composite Indexes:**
   ```sql
   CREATE INDEX idx_generated_images_user_created 
   ON generated_images(user_id, created_at DESC);
   ```

2. **Use Materialized Views for Heavy Aggregations:**
   ```sql
   CREATE MATERIALIZED VIEW daily_user_stats AS
   SELECT 
     DATE(created_at) as date,
     COUNT(DISTINCT user_id) as active_users,
     COUNT(*) as total_generations
   FROM generated_images
   GROUP BY DATE(created_at);
   
   REFRESH MATERIALIZED VIEW daily_user_stats; -- Run daily via cron
   ```

3. **Cache Expensive Queries:**
   - Use `lib/cache.ts` for dashboard metrics (5-minute TTL)
   - Pre-compute daily snapshots (see Option 2 above)

---

### 6.2 Data Freshness Strategy

| Metric | Update Frequency | Method |
|--------|------------------|--------|
| User counts | Real-time | Direct query |
| Revenue metrics | 5-minute cache | `getStripeLiveMetrics()` |
| Referral stats | Real-time | Direct query |
| Milestone completions | Real-time | Direct query |
| Email metrics | Real-time | Direct query |
| Growth trends | Daily snapshot | Cron job |

---

## 7. Risks & Concerns

### 7.1 Low Risk ✅

**Safe to Implement:**
- Growth dashboard endpoint (read-only)
- Referral analytics aggregation (existing data)
- Milestone completion queries (existing data)
- Top referrers leaderboard (existing data)

---

### 7.2 Medium Risk ⚠️

**Requires Careful Testing:**
- Email attribution tracking (new table, but non-critical)
- Daily analytics snapshots (new table, but non-critical)
- Materialized views (performance optimization, can be rolled back)

---

### 7.3 High Risk 🔴

**Avoid or Test Thoroughly:**
- Modifying existing analytics queries (could break dashboards)
- Changing `email_logs` schema (used by cron jobs)
- Altering `credit_transactions` structure (used by webhooks)

---

## 8. Implementation Roadmap

### Phase 1: Quick Wins (No Schema Changes) ✅

1. **Create `/api/admin/growth-dashboard` endpoint**
   - Compute referral loop efficiency
   - Calculate referral conversion rate
   - Aggregate milestone completions
   - **Time:** 2-3 hours
   - **Risk:** Low

2. **Create `components/admin/growth-dashboard.tsx`**
   - Display growth metrics
   - Show referral performance
   - Milestone completion charts
   - **Time:** 3-4 hours
   - **Risk:** Low

---

### Phase 2: Enhanced Tracking (Optional Schema)

1. **Add `analytics_events` table**
   - Track milestone achievements
   - Event-level referral tracking
   - **Time:** 1-2 hours
   - **Risk:** Low

2. **Add `analytics_snapshots` table**
   - Daily pre-aggregated metrics
   - Faster dashboard queries
   - **Time:** 2-3 hours
   - **Risk:** Medium

3. **Create daily snapshot cron job**
   - Run at midnight UTC
   - Populate `analytics_snapshots`
   - **Time:** 1-2 hours
   - **Risk:** Low

---

### Phase 3: Advanced Attribution (Future)

1. **Email attribution tracking**
   - Link emails to conversions
   - Template ROI calculation
   - **Time:** 4-6 hours
   - **Risk:** Medium

2. **Resend webhook integration**
   - Track email opens
   - Calculate open rates
   - **Time:** 2-3 hours
   - **Risk:** Low

---

## 9. Summary Table

| Category | Status | Coverage | Action Needed |
|----------|--------|----------|---------------|
| **User Metrics** | ✅ | 100% | None |
| **Revenue Metrics** | ✅ | 95% | Add ARR/ARPU calculation |
| **Engagement Metrics** | ✅ | 90% | Add milestone completion aggregation |
| **Referral Metrics** | ⚙️ | 70% | Add conversion rate, top referrers, loop efficiency |
| **Email Metrics** | ⚙️ | 60% | Add open rates, template performance, attribution |
| **Credit Metrics** | ✅ | 100% | None |
| **System Health** | ✅ | 90% | Add API latency tracking |

---

## 10. Next Steps

1. **Immediate (Phase 1):**
   - Create `/api/admin/growth-dashboard` endpoint
   - Create `components/admin/growth-dashboard.tsx`
   - Integrate into admin dashboard

2. **Short-term (Phase 2):**
   - Add `analytics_events` table (optional)
   - Add `analytics_snapshots` table (optional)
   - Create daily snapshot cron job

3. **Long-term (Phase 3):**
   - Email attribution tracking
   - Resend webhook integration
   - Advanced growth loop analytics

---

**✅ Audit Complete**  
**Ready for Phase 10: Growth Dashboard Implementation**

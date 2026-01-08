# SSELFIE Studio Expansion Systems Audit

**Date:** 2025-01-XX  
**Scope:** Monetization & Expansion Systems  
**Status:** Read-only audit

---

## 1. Existing Upsell Systems

### ✅ Upgrade Detection Logic
**File:** `lib/upgrade-detection.ts` (Lines 1-151)  
**Status:** ✅ Working  
**Summary:**
- Intelligent upgrade opportunity detection based on usage patterns
- Detects 4 upgrade types:
  - `high_usage`: Using 80%+ of monthly grant
  - `frequent_topups`: 3+ credit purchases in 30 days
  - `credit_depletion`: Balance ≤ 50 credits
  - `unknown_plan`: Active users without subscription
- Returns prioritized opportunities with context
- Lightweight and safe (returns empty array if data unavailable)

**Integration Points:**
- Used by `SmartUpgradeBanner` component
- Can be extended for email automation triggers

---

### ✅ Smart Upgrade Banner
**File:** `components/upgrade/smart-upgrade-banner.tsx` (Lines 1-45)  
**Status:** ✅ Working  
**Summary:**
- Contextual upgrade prompts based on `UpgradeOpportunity` data
- Dismissible with localStorage tracking
- Clean, minimal design matching SSELFIE aesthetic
- Shows upgrade type and personalized message

**Usage:**
- Renders when upgrade opportunities detected
- Calls `onUpgrade` callback with suggested tier

---

### ✅ Upgrade Modal
**File:** `components/upgrade/upgrade-modal.tsx` (Lines 1-128)  
**Status:** ✅ Working  
**Summary:**
- Full-screen modal for upgrade flow
- Handles checkout session creation via `/api/subscription/upgrade`
- Supports promo code validation
- Error handling with user-friendly messages
- Redirects to embedded checkout on success

**Features:**
- Promo code support
- Stripe embedded checkout integration
- Graceful error handling

---

### ✅ Upgrade Comparison Card
**File:** `components/upgrade/upgrade-comparison-card.tsx` (Lines 1-156)  
**Status:** ✅ Working  
**Summary:**
- Side-by-side tier comparison UI
- Shows current vs. target tier features
- Can display all tiers or just comparison
- Visual highlight for selected tier
- Matches SSELFIE design system

---

### ✅ Upgrade Checkout Action
**File:** `app/actions/upgrade-checkout.ts` (Lines 1-251)  
**Status:** ✅ Working  
**Summary:**
- Server action for creating upgrade checkout sessions
- Validates promo codes (Stripe Promotion Codes & Coupons)
- Creates Stripe customer if needed
- Applies discounts before checkout
- Comprehensive logging and error handling

**Features:**
- Promo code validation (both promotion codes and coupons)
- Stripe customer management
- Discount application
- Metadata tracking for campaign attribution

---

### ⚙️ UpgradeOrCredits Component
**File:** `components/UpgradeOrCredits.tsx` (Lines 1-83)  
**Status:** ⚙️ Partial  
**Summary:**
- Shows when user is out of credits
- Offers two paths: Upgrade to Membership or Buy Credits
- Integrates with `BuyCreditsModal`
- **Gap:** No contextual messaging based on usage patterns

---

### ✅ Low Credit Modal
**File:** `components/credits/low-credit-modal.tsx` (Lines 1-75)  
**Status:** ✅ Working  
**Summary:**
- Triggers when credits < 30 (configurable threshold)
- Dismissible with localStorage
- Offers credit top-up option
- Auto-hides when credits increase

---

### ✅ Zero Credits Upgrade Modal
**File:** `components/credits/zero-credits-upgrade-modal.tsx` (Lines 1-110)  
**Status:** ✅ Working  
**Summary:**
- Shows when credits reach exactly 0
- Offers upgrade to Studio or one-time session purchase
- Dismissible
- Resets when credits are added

---

## 2. Referral / Affiliate Logic

### 🛠️ Referral System
**Status:** 🛠️ Missing  
**Summary:**
- No referral tracking tables found in database
- No referral code generation logic
- No referral reward system
- No affiliate tracking

**Database Tables:** None found  
**API Routes:** None found  
**Components:** None found

**Opportunity:**
- High-value feature for viral growth
- Could integrate with existing credit bonus system
- Would require:
  - `referrals` table (referrer_id, referred_id, status, credits_awarded)
  - Referral code generation
  - Reward automation (credits for both parties)
  - Tracking dashboard

---

### 🛠️ Affiliate System
**Status:** 🛠️ Missing  
**Summary:**
- No affiliate tracking
- No commission structure
- No affiliate dashboard
- No affiliate link generation

**Opportunity:**
- Could leverage existing email tracking infrastructure
- Would require:
  - `affiliates` table
  - Commission calculation logic
  - Affiliate dashboard UI
  - Payment processing for commissions

---

## 3. Credit Gifting / Bonus Systems

### ✅ Bonus Credit Type
**File:** `lib/credits.ts` (Lines 130-213)  
**Status:** ✅ Working  
**Summary:**
- `addCredits()` function supports `"bonus"` transaction type
- Used by admin credit grant system
- Logged in `credit_transactions` table
- **Gap:** No automated bonus triggers (campaigns, referrals, milestones)

**Database Schema:**
```sql
-- credit_transactions table supports:
transaction_type IN ('purchase', 'subscription_grant', 'training', 'image', 'animation', 'refund', 'bonus')
```

---

### ✅ Admin Credit Grant API
**File:** `app/api/admin/credits/add/route.ts` (Lines 1-69)  
**Status:** ✅ Working  
**Summary:**
- Admin-only endpoint for granting bonus credits
- Requires admin email authentication
- Creates bonus credit transactions
- Logs reason for grant

**Usage:**
- Manual credit grants by admin
- Could be extended for automated campaigns

---

### 🛠️ Automated Credit Gifting
**Status:** 🛠️ Missing  
**Summary:**
- No automated credit bonuses for:
  - First-time users
  - Milestone achievements (100th image, etc.)
  - Referral rewards
  - Campaign participation
  - Social sharing

**Opportunity:**
- Leverage existing `bonus` transaction type
- Create cron jobs for milestone detection
- Integrate with engagement tracking

---

### 🛠️ Credit Gifting Between Users
**Status:** 🛠️ Missing  
**Summary:**
- No user-to-user credit gifting
- No gift credit purchase flow
- No gift redemption system

**Opportunity:**
- Could drive social engagement
- Would require:
  - Gift credit purchase flow
  - Gift code generation
  - Redemption system
  - Email notifications

---

## 4. Email Templates

### ✅ Upsell Day 10 Email
**File:** `lib/email/templates/upsell-day-10.tsx` (Lines 1-179)  
**Status:** ✅ Working  
**Summary:**
- Email template for freebie subscribers (10 days after signup)
- Soft-sells Studio membership
- Includes tracked checkout links
- Matches SSELFIE brand voice

**Automation Status:** ⚙️ Partial  
- Template exists but not confirmed in cron automation
- Should be integrated into nurture sequence

---

### ✅ Upsell Freebie Membership Email
**File:** `lib/email/templates/upsell-freebie-membership.tsx` (Lines 1-138)  
**Status:** ✅ Working  
**Summary:**
- Email template for freebie subscribers
- Promotes Studio membership benefits
- Includes tracked checkout links
- Matches SSELFIE brand voice

**Automation Status:** ⚙️ Partial  
- Template exists but not confirmed in cron automation

---

### 🛠️ Referral Email Templates
**Status:** 🛠️ Missing  
**Summary:**
- No "Refer a Friend" email templates
- No referral reward notification emails
- No affiliate welcome emails

---

### 🛠️ Bonus Credit Notification Emails
**Status:** 🛠️ Missing  
**Summary:**
- No email templates for:
  - Milestone credit bonuses
  - Referral rewards
  - Campaign bonuses
  - Gift credit redemptions

**Note:** Credit renewal email exists (`credit-renewal.tsx`) but no bonus credit notifications

---

## 5. Gaps & Opportunities

### High-Value Missing Features

1. **Referral System** 🛠️
   - **Impact:** High (viral growth potential)
   - **Effort:** Medium
   - **Dependencies:** Credit bonus system (exists), email templates (missing)
   - **Revenue Potential:** High (organic user acquisition)

2. **Automated Credit Bonuses** 🛠️
   - **Impact:** Medium (engagement & retention)
   - **Effort:** Low (infrastructure exists)
   - **Dependencies:** Cron jobs, milestone detection
   - **Revenue Potential:** Medium (reduces churn)

3. **Credit Gifting** 🛠️
   - **Impact:** Medium (social engagement)
   - **Effort:** Medium
   - **Dependencies:** Gift purchase flow, redemption system
   - **Revenue Potential:** Medium (increases LTV)

4. **Affiliate Program** 🛠️
   - **Impact:** High (scalable growth)
   - **Effort:** High
   - **Dependencies:** Commission tracking, payment processing
   - **Revenue Potential:** High (paid acquisition)

5. **Upsell Email Automation** ⚙️
   - **Impact:** Medium (conversion optimization)
   - **Effort:** Low (templates exist)
   - **Dependencies:** Cron integration
   - **Revenue Potential:** Medium (increases conversion)

---

### Disconnected or Duplicate Logic

1. **Upgrade Detection Not Fully Utilized**
   - `lib/upgrade-detection.ts` exists but not confirmed in all upgrade flows
   - `SmartUpgradeBanner` may not be integrated everywhere

2. **Email Templates Not Automated**
   - Upsell templates exist but not confirmed in cron jobs
   - Should verify integration with `nurture-sequence` and `reengagement-campaigns`

3. **Credit Bonus Infrastructure Exists But Unused**
   - `bonus` transaction type supported
   - Admin grant API exists
   - No automated triggers leveraging this

---

## 6. Next Step Implementation Plan

### Priority 1: Referral System (High Impact, Medium Effort)

**Why First:**
- Leverages existing credit bonus infrastructure
- High viral growth potential
- Natural fit for SSELFIE's community-driven brand

**Implementation:**
1. Create `referrals` table:
   ```sql
   CREATE TABLE referrals (
     id SERIAL PRIMARY KEY,
     referrer_id VARCHAR REFERENCES users(id),
     referred_id VARCHAR REFERENCES users(id),
     referral_code VARCHAR(50) UNIQUE,
     status VARCHAR(20) DEFAULT 'pending',
     credits_awarded_referrer INTEGER DEFAULT 0,
     credits_awarded_referred INTEGER DEFAULT 0,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

2. Add referral code generation to user signup
3. Create referral tracking API routes
4. Build referral dashboard component
5. Create referral email templates
6. Automate credit rewards (both parties)

**Files to Create:**
- `app/api/referrals/generate-code/route.ts`
- `app/api/referrals/track/route.ts`
- `components/referrals/referral-dashboard.tsx`
- `lib/email/templates/referral-invite.tsx`
- `lib/email/templates/referral-reward.tsx`

**Integration Points:**
- User signup flow
- Credit bonus system (existing)
- Email automation (existing)

---

### Priority 2: Automated Credit Bonuses (Medium Impact, Low Effort)

**Why Second:**
- Infrastructure already exists
- Quick wins for engagement
- Low risk, high reward

**Implementation:**
1. Create milestone detection cron job
2. Add milestone tracking to user activity
3. Create bonus credit email templates
4. Integrate with existing `addCredits()` function

**Milestones to Track:**
- First 10 images generated
- 50th image generated
- 100th image generated
- 30-day streak
- First training completed

**Files to Create:**
- `app/api/cron/milestone-bonuses/route.ts`
- `lib/email/templates/milestone-bonus.tsx`

**Integration Points:**
- Existing credit system
- Image generation tracking
- Email automation

---

### Priority 3: Upsell Email Automation (Medium Impact, Low Effort)

**Why Third:**
- Templates already exist
- Just needs cron integration
- Immediate conversion lift

**Implementation:**
1. Verify upsell templates in cron jobs
2. Add to `nurture-sequence` or create dedicated cron
3. Track conversion rates
4. A/B test messaging

**Files to Update:**
- `app/api/cron/nurture-sequence/route.ts` (verify integration)
- Or create `app/api/cron/upsell-campaigns/route.ts`

**Integration Points:**
- Existing email templates
- Existing cron infrastructure
- Checkout tracking

---

## Summary

### ✅ What's Working
- Upgrade detection logic (intelligent, data-driven)
- Upgrade UI components (comprehensive, well-designed)
- Credit bonus infrastructure (ready for automation)
- Upsell email templates (brand-aligned, conversion-focused)
- Low/zero credit modals (good UX)

### ⚙️ What's Partial
- Upsell email automation (templates exist, integration unclear)
- Upgrade prompts (not fully integrated everywhere)

### 🛠️ What's Missing
- Referral system (high-value opportunity)
- Affiliate program (scalable growth)
- Automated credit bonuses (quick wins)
- Credit gifting (social engagement)
- Referral/bonus email templates

### 💡 Key Insights
1. **Infrastructure is ready** - Credit bonus system exists, just needs automation
2. **Templates exist** - Upsell emails ready, need cron integration
3. **High-value gaps** - Referral system would drive significant growth
4. **Low-hanging fruit** - Milestone bonuses are easy wins
5. **Design consistency** - All existing components match SSELFIE aesthetic

---

**Next Actions:**
1. Verify upsell email automation integration
2. Prioritize referral system implementation
3. Create milestone bonus automation
4. Build referral dashboard UI
5. Create missing email templates

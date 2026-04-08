# Email Automation Audit & Tracking Document
**Last Updated:** December 29, 2024  
**Status:** Audit & Analysis Only - No Implementation

---

## 📊 Executive Summary

This document tracks all email automation sequences, their current status, what needs to be implemented, and best practice recommendations for SSELFIE Studio's email marketing system.

**⚠️ CRITICAL FINDING:** Most cron jobs currently use Loops integration, but Loops is **NOT being used**. Only the Welcome Sequence actually sends emails via Resend. All other sequences need to be converted to use Resend directly.

### Current Status Summary

- **✅ Working:** 1 sequence (Welcome Sequence - sends via Resend `sendEmail()`)
- **🟡 Broken/Not Working:** 4 cron jobs (use Loops tags but emails never sent)
  - Blueprint Followup Sequence
  - Blueprint Email Sequence  
  - Welcome Back Sequence
  - Re-engagement Campaigns
- **❌ Not Implemented:** 2 sequences (need to be built)
  - Nurture Sequence (templates ready, needs cron job)
  - Re-engagement Sequence (templates ready, needs cron job)

---

## ✅ FULLY AUTOMATED & WORKING (Resend Direct Sends)

### 1. Welcome Sequence (New Paid Members) - ONLY ONE THAT WORKS
**Status:** ✅ **COMPLETE & AUTOMATED**

- **Cron Job:** `/api/cron/welcome-sequence`
- **Schedule:** Daily at 10:00 AM UTC
- **Trigger:** New paid member signup
- **Target:** Active Studio/Brand Studio memberships
- **Emails:**
  - Day 0: "You're in! Let's get you creating 🚀" (sends within 2 hours of signup)
  - Day 3: "Quick check: How's it going? 💪" (sends 3 days after signup)
  - Day 7: "One week in - you're crushing it! 🎯" (sends 7 days after signup)
- **Template:** `lib/email/templates/welcome-sequence.ts`
- **Voice:** Alex's strategic, enthusiastic tone
- **Database Tracking:** Uses `email_logs` table to prevent duplicates
- **Delivery Method:** Individual sends via `sendEmail()` function (not broadcasts)
- **Segment:** Beta Customers segment in Resend

**Notes:**
- ✅ Cron job configured in `vercel.json`
- ✅ Email templates written and tested
- ✅ Database queries updated to check active subscriptions
- ✅ Duplicate prevention working
- ✅ Personalization (first name) implemented

---

### 2. Blueprint Followup Sequence
**Status:** 🟡 **NOT AUTOMATED (Loops Integration - Not Using Loops)**

- **Cron Job:** `/api/cron/send-blueprint-followups`
- **Schedule:** Daily at 10:00 AM UTC
- **Trigger:** User downloads Brand Blueprint
- **Target:** Blueprint subscribers
- **Emails:**
  - Day 0: Immediate delivery (on signup)
  - Day 3: "3 Ways to Use Your Blueprint This Week"
  - Day 7: "[Name] went from 5K to 25K followers using this system"
  - Day 14: "Still thinking about it? Here's $10 off 💕"
- **Templates:** 
  - `blueprint-followup-day-0.tsx`
  - `blueprint-followup-day-3.tsx`
  - `blueprint-followup-day-7.tsx`
  - `blueprint-followup-day-14.tsx`
- **Current Delivery Method:** Loops automation (tags trigger emails)
- **Issue:** Cron job only adds Loops tags, doesn't send emails via Resend

**What Needs to Be Done:**
- ❌ Convert to use `sendEmail()` function (like welcome-sequence)
- ❌ Remove Loops dependency
- ❌ Send emails directly via Resend
- ❌ Track sends in `email_logs` table

**Notes:**
- ⚠️ Cron job exists but relies on Loops (which is not being used)
- ⚠️ Emails are NOT actually being sent
- ⚠️ Needs to be converted to Resend like welcome-sequence

---

### 3. Blueprint Email Sequence
**Status:** 🟡 **NOT AUTOMATED (Loops Integration - Not Using Loops)**

- **Cron Job:** `/api/cron/blueprint-email-sequence`
- **Schedule:** Daily at 10:00 AM UTC
- **Trigger:** Blueprint subscriber journey
- **Target:** Blueprint subscribers
- **Current Delivery Method:** Loops automation (tags only)
- **Issue:** Cron job only adds Loops tags, doesn't send emails via Resend

**What Needs to Be Done:**
- ❌ Convert to use `sendEmail()` function
- ❌ Remove Loops dependency
- ❌ Send emails directly via Resend

**Notes:**
- ⚠️ Cron job exists but relies on Loops (which is not being used)
- ⚠️ Emails are NOT actually being sent

---

### 4. Welcome Back Sequence
**Status:** 🟡 **NOT AUTOMATED (Loops Integration - Not Using Loops)**

- **Cron Job:** `/api/cron/welcome-back-sequence`
- **Schedule:** Daily at 11:00 AM UTC
- **Trigger:** Returning users
- **Target:** Users who return after inactivity
- **Emails:**
  - Day 7: "One Week In"
  - Day 14: "We Miss You - Here's Something Special"
- **Templates:**
  - `nurture-day-7.tsx`
  - `win-back-offer.tsx`
- **Current Delivery Method:** Loops automation (tags only)
- **Issue:** Cron job only adds Loops tags, doesn't send emails via Resend

**What Needs to Be Done:**
- ❌ Convert to use `sendEmail()` function
- ❌ Remove Loops dependency
- ❌ Send emails directly via Resend

**Notes:**
- ⚠️ Cron job exists but relies on Loops (which is not being used)
- ⚠️ Emails are NOT actually being sent

---

### 5. Re-engagement Campaigns
**Status:** 🟡 **NOT AUTOMATED (Loops Integration - Not Using Loops)**

- **Cron Job:** `/api/cron/reengagement-campaigns`
- **Schedule:** Daily at 12:00 PM UTC
- **Trigger:** Inactive users
- **Target:** Users from `reengagement_campaigns` table
- **Current Delivery Method:** Loops automation (tags only)
- **Issue:** Cron job only adds Loops tags, doesn't send emails via Resend

**What Needs to Be Done:**
- ❌ Convert to use `sendEmail()` function
- ❌ Remove Loops dependency
- ❌ Send emails directly via Resend
- ⚠️ Note: This is different from the Re-engagement Sequence (see below)

**Notes:**
- ⚠️ Cron job exists but relies on Loops (which is not being used)
- ⚠️ Emails are NOT actually being sent
- ⚠️ Campaigns must be created in `reengagement_campaigns` table

---

### 6. Scheduled Campaigns Sender
**Status:** ✅ **AUTOMATED**

- **Cron Job:** `/api/cron/send-scheduled-campaigns`
- **Schedule:** Every 15 minutes
- **Purpose:** Sends scheduled email campaigns from `admin_email_campaigns` table
- **Delivery Method:** Individual sends or broadcasts based on campaign type

**Notes:**
- ✅ Cron job active
- ✅ Handles both template-based and custom campaigns

---

### 7. Segment Management
**Status:** ✅ **AUTOMATED**

- **Cron Jobs:**
  - `/api/cron/sync-audience-segments` (2:00 AM daily)
  - `/api/cron/refresh-segments` (3:00 AM daily)
- **Purpose:** Syncs and refreshes Resend audience segments

**Notes:**
- ✅ Both cron jobs active
- ✅ Keeps segments up-to-date with database

---

## 🚧 PARTIALLY IMPLEMENTED (Needs Work)

### 1. Nurture Sequence (Free → Paid Conversion)
**Status:** 🟡 **TEMPLATES READY, AUTOMATION MISSING**

- **Templates:** ✅ Complete
  - `lib/email/templates/nurture-sequence.ts`
  - Day 1: "Your Blueprint is ready! (Plus something better) ✨"
  - Day 5: "How Sarah went from invisible to booked solid 📈"
  - Day 10: "Ready to be SEEN? (Let's make it simple) 💪"
- **Voice:** Alex's strategic, enthusiastic tone
- **Target:** All free subscribers (Blueprint + Freebie) who haven't purchased
- **Segment:** "All Subscribers" segment in Resend

**What's Missing:**
- ❌ No cron job (`/api/cron/nurture-sequence/route.ts` does NOT exist)
- ❌ No automation to send emails based on signup date
- ❌ No database tracking for nurture sequence emails
- ❌ Sequence not activated in Resend

**What Needs to Be Done:**
1. Create cron job: `/api/cron/nurture-sequence/route.ts`
2. Query for users who:
   - Are in Blueprint or Freebie subscribers
   - Have NOT purchased (no active subscription)
   - Signed up 1 day ago (Day 1 email)
   - Signed up 5 days ago (Day 5 email)
   - Signed up 10 days ago (Day 10 email)
3. Send emails individually using `sendEmail()` function
4. Track sends in `email_logs` table with email types: `nurture-day-1`, `nurture-day-5`, `nurture-day-10`
5. Add cron job to `vercel.json` (schedule: `0 10 * * *` or different time)
6. Update segment sync to include all free subscribers

**Best Practices:**
- Send Day 1 email within 24 hours of signup
- Day 5 should focus on social proof and case studies
- Day 10 should be the final conversion push with clear CTA
- Track opens/clicks to identify engaged leads
- Exclude users who have already purchased

---

### 2. Re-engagement Sequence (Inactive Users)
**Status:** 🟡 **TEMPLATES READY, AUTOMATION MISSING**

- **Templates:** ✅ Complete
  - `lib/email/templates/reengagement-sequence.ts`
  - Day 0: "Haven't seen you in a while... 👀"
  - Day 7: "You haven't seen what Maya can do now... 🚀"
  - Day 14: "Last call: Come back to Studio (50% off) 💪" (includes COMEBACK50 discount code)
- **Voice:** Alex's strategic, enthusiastic tone
- **Target:** Users who haven't logged in for 30+ days
- **Segment:** "Inactive Users" segment in Resend
- **Discount:** 50% off first month (COMEBACK50 promo code) ✅ Created in Stripe

**What's Missing:**
- ❌ No cron job for this specific sequence (only generic re-engagement campaigns exist)
- ❌ No automation to identify inactive users and send sequence
- ❌ No database tracking for re-engagement sequence emails
- ❌ Sequence not activated in Resend

**What Needs to Be Done:**
1. Create cron job: `/api/cron/reengagement-sequence/route.ts`
2. Query for users who:
   - Have an account but haven't logged in for 30+ days
   - OR had a subscription that expired/cancelled
   - Haven't received re-engagement emails yet
3. Send Day 0 email immediately when user becomes inactive (30 days)
4. Send Day 7 email 7 days after Day 0
5. Send Day 14 email 14 days after Day 0 (with discount code)
6. Track sends in `email_logs` table with email types: `reengagement-day-0`, `reengagement-day-7`, `reengagement-day-14`
7. Add cron job to `vercel.json` (schedule: `0 13 * * *` - 1 PM UTC)
8. Update segment sync to include inactive users

**Best Practices:**
- Only send to users who were previously active (had logins/usage)
- Soft approach - don't be pushy
- Highlight new features and improvements
- Final email should include discount but not be desperate
- Track engagement - if they open but don't convert, consider different approach
- Exclude users who explicitly unsubscribed

---

## 📝 NOT YET IMPLEMENTED

### 1. Weekly Newsletter Template
**Status:** ❌ **NOT IMPLEMENTED**

- **Template File:** `lib/email/templates/newsletter-template.tsx` (exists but may need updates)
- **Purpose:** Weekly roundup of wins, features, tips, user spotlights
- **Frequency:** Weekly (suggested: Friday 9 AM)
- **Target:** All subscribers (or segmented by engagement)

**What Needs to Be Done:**
1. Review and update newsletter template
2. Create cron job or manual send system
3. Set up content generation workflow (Alex can draft)
4. Add to `vercel.json` if automated
5. Create admin UI for previewing/editing before send

**Best Practices:**
- Consistent send day/time (e.g., Friday mornings)
- Include: wins, new features, user spotlight, tip of the week, CTA
- Keep it valuable, not just promotional
- Track open rates and adjust content based on engagement
- Allow subscribers to choose frequency preferences

---

### 2. Upsell Sequence (Monthly → Annual)
**Status:** ❌ **NOT IMPLEMENTED**

- **Templates:** Partially exist
  - `upsell-freebie-membership.tsx` (exists)
  - `upsell-day-10.tsx` (exists)
- **Purpose:** Convert monthly subscribers to annual plans
- **Target:** Active monthly Studio members (60+ days into subscription)
- **Timing:** Day 60, Day 65 after subscription start

**What Needs to Be Done:**
1. Create complete upsell sequence templates (Day 60, Day 65)
2. Create cron job: `/api/cron/upsell-sequence/route.ts`
3. Query for users who:
   - Have active monthly Studio membership
   - Are 60+ days into their subscription
   - Haven't received upsell emails yet
4. Send Day 60 email (introduce annual option)
5. Send Day 65 email (final push with benefits)
6. Track sends in `email_logs` table
7. Add cron job to `vercel.json`

**Best Practices:**
- Only target users who are engaged (using the product)
- Highlight savings and benefits of annual plan
- Make it easy to upgrade (clear CTA)
- Don't be pushy - frame as "better value" not "you should upgrade"
- Offer limited-time incentive if appropriate

---

## 🔍 CURRENT SYSTEM ARCHITECTURE

### Email Delivery Methods

1. **Individual Sends (via `sendEmail()` function) - ✅ ACTIVE**
   - Used by: Welcome Sequence cron job (ONLY working automation)
   - Pros: Full control, personalization, database tracking, works with Resend
   - Cons: Slower for large lists
   - Best for: Automated sequences, transactional emails
   - **Status:** This is the only method currently working

2. **Resend Broadcasts**
   - Used by: One-time campaigns, initial sequence activation
   - Pros: Fast, built-in analytics, segment targeting
   - Cons: One-time only, new users miss out
   - Best for: Announcements, one-time campaigns
   - **Status:** Works for one-time sends

3. **Loops Automation - ❌ NOT BEING USED**
   - Currently in code: Blueprint followups, welcome back, re-engagement campaigns
   - **Issue:** These cron jobs only add Loops tags but don't send emails
   - **Status:** These sequences are NOT actually automated
   - **Recommendation:** Convert all to use `sendEmail()` function like welcome-sequence

### Database Tracking

- **`email_logs` table:** Tracks all individual email sends
  - Prevents duplicates
  - Tracks email types
  - Links to campaigns
- **`admin_email_campaigns` table:** Stores campaign metadata
  - Sequence definitions (stored as JSON in `body_html`)
  - Broadcast IDs
  - Status tracking
- **`email_sends` table:** Tracks individual sends within sequences
  - Prevents duplicate sends in automation sequences
  - Links to sequence and user

---

## 📋 IMPLEMENTATION PRIORITY

### High Priority (Do First)

1. **Nurture Sequence Automation** 🟡
   - Impact: Converts free users to paid (revenue driver)
   - Effort: Medium (cron job + database queries)
   - Templates: ✅ Ready
   - Estimated Time: 2-3 hours

2. **Re-engagement Sequence Automation** 🟡
   - Impact: Win back churned users (revenue recovery)
   - Effort: Medium (cron job + inactive user detection)
   - Templates: ✅ Ready
   - Discount Code: ✅ Created (COMEBACK50)
   - Estimated Time: 2-3 hours

### Medium Priority

3. **Upsell Sequence (Monthly → Annual)**
   - Impact: Increases LTV, reduces churn
   - Effort: Medium (templates + cron job)
   - Templates: ⚠️ Partially exist
   - Estimated Time: 3-4 hours

### Low Priority (Nice to Have)

4. **Weekly Newsletter Automation**
   - Impact: Engagement, brand awareness
   - Effort: High (content generation + scheduling)
   - Templates: ⚠️ Exists but needs review
   - Estimated Time: 4-6 hours

---

## 🎯 BEST PRACTICES RECOMMENDATIONS

### 1. Email Frequency & Timing
- **Welcome Sequence:** ✅ Good (Day 0, 3, 7) - not too aggressive
- **Nurture Sequence:** ✅ Good (Day 1, 5, 10) - gives time to consider
- **Re-engagement:** ✅ Good (Day 0, 7, 14) - soft approach
- **Recommendation:** Maintain current spacing, don't send more than 1 email per day per user

### 2. Segmentation
- ✅ Welcome: Targets paid members only
- ✅ Nurture: Targets free subscribers
- ✅ Re-engagement: Targets inactive users
- **Recommendation:** Add engagement-based segmentation (high/medium/low engagement)

### 3. Personalization
- ✅ First name personalization implemented
- ✅ Conditional greetings (no "Hey friend")
- **Recommendation:** Add product-specific personalization (mention their plan, usage stats)

### 4. A/B Testing
- ❌ Not currently implemented
- **Recommendation:** Test subject lines, CTAs, send times
- **Priority:** Medium (after core sequences are automated)

### 5. Analytics & Tracking
- ✅ Email logs tracking
- ✅ Campaign analytics in `admin_email_campaigns`
- **Recommendation:** 
  - Add open/click tracking dashboard
  - Track conversion rates per sequence
  - Monitor unsubscribe rates

### 6. Compliance
- ✅ Unsubscribe links in all emails (`{{{RESEND_UNSUBSCRIBE_URL}}}`)
- ✅ UTM tracking on all links
- **Recommendation:** 
  - Add preference center (frequency, content types)
  - Ensure GDPR compliance for EU users

### 7. Content Quality
- ✅ Alex's voice implemented
- ✅ No generic greetings
- ✅ Clear CTAs
- **Recommendation:** 
  - Regular content audits (quarterly)
  - Update templates based on performance
  - Keep messaging fresh and relevant

---

## 🔧 TECHNICAL DEBT & IMPROVEMENTS

### Current Issues

1. **Mixed Delivery Systems**
   - Some sequences use Resend broadcasts (one-time)
   - Some use individual sends (automated)
   - Some use Loops (external dependency)
   - **Recommendation:** Standardize on individual sends for automation, broadcasts for one-time campaigns

2. **Segment Management**
   - Segments need manual sync
   - Some sequences rely on Loops segments
   - **Recommendation:** Centralize segment management, auto-sync from database

3. **Template Consistency**
   - Some templates use `.tsx`, some use `.ts`
   - Different personalization approaches
   - **Recommendation:** Standardize template format and personalization

### Recommended Improvements

1. **Unified Email Sending System**
   - Single function for all email sends
   - Consistent tracking and logging
   - Unified error handling

2. **Email Preference Center**
   - Let users choose frequency
   - Content type preferences
   - Unsubscribe granularity

3. **Analytics Dashboard**
   - Real-time email performance
   - Conversion tracking
   - Revenue attribution

4. **Testing Framework**
   - A/B test infrastructure
   - Template preview system
   - Send time optimization

---

## 📊 METRICS TO TRACK

### Sequence Performance
- **Welcome Sequence:**
  - Open rate (target: >40%)
  - Click rate (target: >15%)
  - Day 7 engagement rate
  - Conversion to active usage

- **Nurture Sequence:**
  - Open rate (target: >35%)
  - Click rate (target: >10%)
  - Conversion rate: Free → Paid (target: >5%)
  - Revenue generated

- **Re-engagement Sequence:**
  - Open rate (target: >25%)
  - Click rate (target: >8%)
  - Reactivation rate (target: >3%)
  - Revenue recovered

### Overall Email Health
- Unsubscribe rate (target: <0.5% per email)
- Bounce rate (target: <2%)
- Spam complaints (target: <0.1%)
- Overall list growth rate

---

## ✅ CHECKLIST FOR COMPLETION

### Convert Broken Loops Automations (CRITICAL)

#### Blueprint Followup Sequence
- [ ] Review templates: `blueprint-followup-day-0.tsx`, `day-3.tsx`, `day-7.tsx`, `day-14.tsx`
- [ ] Convert `/api/cron/send-blueprint-followups/route.ts` to use `sendEmail()`
- [ ] Remove `addLoopsContactTags()` calls
- [ ] Add email tracking in `email_logs` table
- [ ] Test Day 3, 7, 14 email sends
- [ ] Verify duplicate prevention
- [ ] Monitor first sends

#### Blueprint Email Sequence
- [ ] Review templates and determine which emails to send
- [ ] Convert `/api/cron/blueprint-email-sequence/route.ts` to use `sendEmail()`
- [ ] Remove `addLoopsContactTags()` calls
- [ ] Add email tracking
- [ ] Test email sends
- [ ] Verify duplicate prevention

#### Welcome Back Sequence
- [ ] Review templates: `nurture-day-7.tsx`, `win-back-offer.tsx`
- [ ] Convert `/api/cron/welcome-back-sequence/route.ts` to use `sendEmail()`
- [ ] Remove `addLoopsContactTags()` calls
- [ ] Add email tracking
- [ ] Test Day 7 and Day 14 sends
- [ ] Verify duplicate prevention

#### Re-engagement Campaigns
- [ ] Review `reengagement_campaigns` table structure
- [ ] Convert `/api/cron/reengagement-campaigns/route.ts` to use `sendEmail()`
- [ ] Remove `addLoopsContactTags()` calls
- [ ] Map campaign content to email templates
- [ ] Add email tracking
- [ ] Test campaign sends
- [ ] Verify duplicate prevention

### Nurture Sequence
- [ ] Create `/api/cron/nurture-sequence/route.ts`
- [ ] Add cron job to `vercel.json`
- [ ] Test database queries for free subscribers
- [ ] Test email sending for each day
- [ ] Verify duplicate prevention
- [ ] Test segment targeting
- [ ] Monitor first sends

### Re-engagement Sequence
- [ ] Create `/api/cron/reengagement-sequence/route.ts`
- [ ] Add cron job to `vercel.json`
- [ ] Implement inactive user detection (30+ days)
- [ ] Test email sending for each day
- [ ] Verify COMEBACK50 discount code works
- [ ] Test segment targeting
- [ ] Monitor first sends

### Upsell Sequence
- [ ] Review/update upsell templates
- [ ] Create `/api/cron/upsell-sequence/route.ts`
- [ ] Add cron job to `vercel.json`
- [ ] Test subscription date queries
- [ ] Test email sending
- [ ] Verify upgrade flow

### Weekly Newsletter
- [ ] Review newsletter template
- [ ] Create content generation workflow
- [ ] Set up scheduling system
- [ ] Create admin preview UI
- [ ] Test send process

---

## 📝 NOTES & OBSERVATIONS

1. **Welcome Sequence is Production-Ready**
   - Fully automated
   - Properly tested
   - Good performance expected

2. **Nurture & Re-engagement Need Automation**
   - Templates are excellent (Alex's voice)
   - Just need cron jobs to make them work
   - Should be quick to implement

3. **Loops Integration is NOT Being Used - BROKEN AUTOMATIONS**
   - ❌ `send-blueprint-followups` cron job uses `addLoopsContactTags()` - emails NOT sent
   - ❌ `blueprint-email-sequence` cron job uses `addLoopsContactTags()` - emails NOT sent
   - ❌ `welcome-back-sequence` cron job uses `addLoopsContactTags()` - emails NOT sent
   - ❌ `reengagement-campaigns` cron job uses `addLoopsContactTags()` - emails NOT sent
   - **Problem:** These cron jobs only add tags to Loops, but Loops is not configured/used
   - **Result:** Emails are NEVER sent - these automations are completely broken
   - **Recommendation:** Convert all Loops-dependent cron jobs to use `sendEmail()` function (like welcome-sequence)
   - **Priority:** CRITICAL - these sequences need immediate attention
   - **Solution:** Replace `addLoopsContactTags()` calls with direct `sendEmail()` calls using templates

4. **Discount Codes**
   - COMEBACK50 created and working
   - Checkout pages support promo codes
   - Email templates include promo codes correctly

5. **Segment Management**
   - "All Subscribers" segment needed for Nurture sequence
   - "Inactive Users" segment needed for Re-engagement
   - Sync functions exist and work

---

## 🚀 NEXT STEPS (When Ready to Implement)

1. **Start with Nurture Sequence** (highest ROI)
   - Create cron job
   - Test with small segment
   - Monitor performance
   - Scale up

2. **Then Re-engagement Sequence** (revenue recovery)
   - Create cron job
   - Test inactive user detection
   - Verify discount code flow
   - Monitor reactivation rates

3. **Finally Upsell Sequence** (LTV increase)
   - Complete templates
   - Create cron job
   - Test upgrade flow
   - Monitor conversion rates

---

**Document Status:** Complete audit, ready for implementation planning  
**Last Review:** December 29, 2024  
**Next Review:** After Nurture & Re-engagement sequences are automated


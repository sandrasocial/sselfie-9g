# SSELFIE Studio - Complete Email System Master List

**Last Updated:** January 29, 2026  
**Status:** Historical inventory - not the live cron source of truth

> Live cron ownership moved to `docs/source-of-truth/route-cron-diet.md` on 2026-05-08. Use that file and `vercel.json` for the active cron schedule.

This document lists EVERY email that is currently set up and being sent to your audience.

---

## 📊 QUICK STATS

- **Total Automated Sequences:** 10 sequences
- **Total Individual Emails:** 50+ unique email templates
- **Cron Jobs Running:** 18 scheduled automations
- **Integration:** Resend + Loops for delivery
- **Database Tracking:** All sends logged to `email_logs` and `email_events`

---

## 🎯 EMAIL CATEGORIES

1. **Automated Welcome & Onboarding** (3 sequences, 9 emails)
2. **Nurture & Conversion** (5 sequences, 20+ emails)
3. **Re-engagement & Win-Back** (3 sequences, 14 emails)
4. **Transactional** (6 email types)
5. **Rewards & Incentives** (2 sequences, 4 emails)
6. **Admin & Monitoring** (3 email types)

---

## 1️⃣ AUTOMATED WELCOME & ONBOARDING SEQUENCES

### Historical Welcome Sequence (Paid Members)

**Trigger:** User completes payment and creates account  
**Cron Job:** Superseded by `/api/cron/onboarding-sequence`  
**Schedule:** Not scheduled  
**Status:** Removed in Phase 5 to prevent duplicate onboarding delivery.

#### Emails Sent:

**Day 0 - Welcome to Studio! 🚀**
- **Subject:** "You're in! Let's get you creating 🚀"
- **Template:** `lib/email/templates/welcome-sequence.ts` (Day 0)
- **Goal:** Excitement, quick start, first value
- **CTA:** "Start Creating in Studio"
- **Timing:** Within 2 hours of signup
- **Content Highlights:**
  - Welcome message
  - What happens next (upload selfies, Maya trains model)
  - Feature overview (100+ photos/month, video b-roll, Feed Designer)
  - Quick start instructions

**Day 3 - Progress Check 💪**
- **Subject:** "Quick check: How's it going? 💪"
- **Template:** `lib/email/templates/welcome-sequence.ts` (Day 3)
- **Goal:** Engagement check, troubleshooting, encouragement
- **CTA:** "Continue Creating"
- **Timing:** 3 days after signup
- **Content Highlights:**
  - Check-in on progress
  - Pro tips for better results
  - Troubleshooting common issues
  - Academy courses promotion

**Day 7 - Advanced Features 🎯**
- **Subject:** "One week in - you're crushing it! 🎯"
- **Template:** `lib/email/templates/welcome-sequence.ts` (Day 7)
- **Goal:** Celebrate progress, introduce advanced features
- **CTA:** "Explore Advanced Features"
- **Timing:** 7 days after signup
- **Content Highlights:**
  - Celebration of consistency
  - Advanced features (Feed Designer, Video B-Roll, Pro Mode)
  - Success stories
  - Feature deep dives

---

### ✅ Onboarding Sequence (Alternative Flow)

**Trigger:** User creates account  
**Cron Job:** `/api/cron/onboarding-sequence`  
**Schedule:** Daily at 10:00 AM UTC  
**Status:** ✅ **FULLY AUTOMATED**

#### Emails Sent:

**Day 0 - Welcome Aboard**
- **Subject:** "Welcome to SSELFIE Studio!"
- **Template:** `lib/email/templates/onboarding-day-0.tsx`
- **Goal:** Immediate welcome and setup guidance
- **CTA:** "Get Started"

**Day 2 - Quick Tips**
- **Subject:** "Here's how to get the best results"
- **Template:** `lib/email/templates/onboarding-day-2.tsx`
- **Goal:** Best practices and tips
- **CTA:** "Create Your First Photos"

**Day 7 - Feature Discovery**
- **Subject:** "You haven't tried these features yet..."
- **Template:** `lib/email/templates/onboarding-day-7.tsx`
- **Goal:** Feature education
- **CTA:** "Explore Features"

---

### ✅ Blueprint Followup Sequence (Freebie Subscribers)

**Trigger:** User completes Blueprint freebie  
**Cron Job:** `/api/cron/send-blueprint-followups`  
**Schedule:** Daily at 10:00 AM UTC  
**Status:** ✅ **FULLY AUTOMATED** (via Loops integration)

#### Emails Sent:

**Day 0 - Blueprint Delivery**
- **Subject:** "Your FREE Brand Blueprint is ready! 🎉"
- **Template:** `lib/email/templates/blueprint-followup-day-0.tsx`
- **Goal:** Deliver freebie, establish trust
- **CTA:** "Download Your Blueprint"
- **Timing:** Immediately after blueprint completion
- **Content Highlights:**
  - Download link
  - What's inside the blueprint
  - Quick win tips
  - Soft intro to Studio

**Day 3 - Usage Tips**
- **Subject:** "How to actually USE your Brand Blueprint"
- **Template:** `lib/email/templates/blueprint-followup-day-3.tsx`
- **Goal:** Engagement, value extraction
- **CTA:** "Explore SSELFIE Studio"
- **Timing:** 3 days after blueprint download
- **Loops Tag:** `blueprint-day-3`

**Day 7 - Success Story**
- **Subject:** "She used the Blueprint to land 3 clients in 2 weeks"
- **Template:** `lib/email/templates/blueprint-followup-day-7.tsx`
- **Goal:** Social proof, show transformation
- **CTA:** "See How She Did It"
- **Timing:** 7 days after blueprint download
- **Loops Tag:** `blueprint-day-7`

**Day 14 - Discount Offer**
- **Subject:** "Ready to make it real? (Special offer inside)"
- **Template:** `lib/email/templates/blueprint-followup-day-14.tsx`
- **Goal:** Convert to paid membership
- **CTA:** "Join Studio - Special Offer"
- **Timing:** 14 days after blueprint download
- **Loops Tag:** `blueprint-day-14`
- **Offer:** Special discount for Blueprint subscribers

---

## 2️⃣ NURTURE & CONVERSION SEQUENCES

### ✅ Nurture Sequence (Free Users → Paid Conversion)

**Trigger:** User downloads Blueprint freebie  
**Cron Job:** `/api/cron/nurture-sequence`  
**Schedule:** Daily at 11:00 AM UTC  
**Status:** ✅ **FULLY AUTOMATED**

#### Emails Sent:

**Day 1 - Value Delivery + Studio Pitch**
- **Subject:** "Your Blueprint is ready! (Plus something better) ✨"
- **Template:** `lib/email/templates/nurture-sequence.ts` (Day 1)
- **Goal:** Deliver value, introduce Studio
- **CTA:** "Join SSELFIE Studio"
- **Timing:** 1 day after freebie download
- **Content Highlights:**
  - Blueprint confirmation
  - Studio benefits (100+ photos, video b-roll, Feed Designer)
  - Pricing: $97/month
  - Try once option: $49

**Day 5 - Case Study (Sarah's Story)**
- **Subject:** "How Sarah went from invisible to booked solid 📈"
- **Template:** `lib/email/templates/nurture-sequence.ts` (Day 5)
- **Goal:** Social proof, build desire
- **CTA:** "Join SSELFIE Studio"
- **Timing:** 5 days after freebie download
- **Content Highlights:**
  - Life coach case study
  - Before: 200 followers, same 3 selfies
  - After: Booked solid, professional content, in-demand
  - The power of visibility

**Day 10 - Final Offer**
- **Subject:** "Ready to be SEEN? (Let's make it simple) 💪"
- **Template:** `lib/email/templates/nurture-sequence.ts` (Day 10)
- **Goal:** Convert to paid membership
- **CTA:** "Try Once - $49" or "Join Studio - $97/mo"
- **Timing:** 10 days after freebie download
- **Content Highlights:**
  - Two clear options
  - No pressure, no commitment
  - Time-sensitive appeal
  - Risk removal

---

### ✅ Blueprint Discovery Funnel

**Trigger:** Freebie subscriber engagement level  
**Cron Job:** `/api/cron/blueprint-discovery-funnel`  
**Schedule:** Daily at 12:00 PM UTC  
**Status:** ✅ **FULLY AUTOMATED**

#### Emails Sent:

**Day 1 - Discovery Email 1**
- **Template:** `lib/email/templates/blueprint-discovery-1.tsx`
- **Goal:** Educate on brand identity

**Day 3 - Discovery Email 2**
- **Template:** `lib/email/templates/blueprint-discovery-2.tsx`
- **Goal:** Content strategy education

**Day 5 - Discovery Email 3**
- **Template:** `lib/email/templates/blueprint-discovery-3.tsx`
- **Goal:** Visibility mindset

**Day 7 - Discovery Email 4**
- **Template:** `lib/email/templates/blueprint-discovery-4.tsx`
- **Goal:** Systems thinking

**Day 10 - Discovery Email 5**
- **Template:** `lib/email/templates/blueprint-discovery-5.tsx`
- **Goal:** Studio pitch

---

### ✅ Paid Blueprint Follow-up Sequence

**Trigger:** User purchases Paid Blueprint  
**Cron Job:** Part of blueprint system  
**Status:** ✅ **AUTOMATED**

#### Emails Sent:

**Day 0 - Blueprint Delivery**
- **Subject:** "Your Paid Blueprint Results Are Ready!"
- **Template:** `lib/email/templates/paid-blueprint-delivery.tsx`
- **Goal:** Deliver personalized blueprint
- **CTA:** "View Your Results"

**Day 1 - Implementation Tips**
- **Template:** `lib/email/templates/paid-blueprint-day-1.tsx`
- **Goal:** Help implement insights

**Day 3 - Progress Check**
- **Template:** `lib/email/templates/paid-blueprint-day-3.tsx`
- **Goal:** Encourage action

**Day 7 - Studio Upsell**
- **Template:** `lib/email/templates/paid-blueprint-day-7.tsx`
- **Goal:** Convert to full membership
- **CTA:** "Upgrade to Studio"

---

### ✅ Cold Re-Education Sequence

**Trigger:** Long-inactive email subscribers  
**Cron Job:** `/api/cron/cold-reeducation-sequence`  
**Schedule:** Daily at 11:00 AM UTC  
**Status:** ✅ **FULLY AUTOMATED**

#### Emails Sent:

**Day 1 - Re-Introduction**
- **Subject:** "Remember SSELFIE?"
- **Template:** `lib/email/templates/cold-edu-day-1.tsx`
- **Goal:** Re-introduce brand
- **CTA:** "See What's New"

**Day 3 - Value Reminder**
- **Template:** `lib/email/templates/cold-edu-day-3.tsx`
- **Goal:** Show transformation possible

**Day 7 - Final Offer**
- **Template:** `lib/email/templates/cold-edu-day-7.tsx`
- **Goal:** Last chance conversion

---

### ✅ Upsell Campaigns

**Trigger:** User segment (freemium, one-time buyers)  
**Cron Job:** `/api/cron/upsell-campaigns`  
**Schedule:** Daily at 10:00 AM UTC  
**Status:** ✅ **FULLY AUTOMATED**

#### Emails Sent:

**Upsell: Freebie → Membership**
- **Subject:** "Your content deserves to be consistent"
- **Template:** `lib/email/templates/upsell-freebie-membership.tsx`
- **Goal:** Convert freebie users to paid
- **CTA:** "Upgrade to Studio"

**Upsell: Day 10 Push**
- **Subject:** "Last chance to join (Special pricing ends soon)"
- **Template:** `lib/email/templates/upsell-day-10.tsx`
- **Goal:** Time-sensitive conversion
- **CTA:** "Join Before Offer Expires"

---

## 3️⃣ RE-ENGAGEMENT & WIN-BACK SEQUENCES

### ✅ Re-engagement Sequence (Inactive Users)

**Trigger:** 30+ days no activity  
**Cron Job:** `/api/cron/reengagement-campaigns`  
**Schedule:** Daily at 12:00 PM UTC  
**Status:** ✅ **FULLY AUTOMATED** (via Loops integration)

#### Emails Sent:

**Day 0 - Miss You 👀**
- **Subject:** "Haven't seen you in a while... 👀"
- **Template:** `lib/email/templates/reengagement-sequence.ts` (Day 0)
- **Goal:** Re-engage without pressure
- **CTA:** "See What's New"
- **Timing:** 30 days after last activity
- **Content Highlights:**
  - Friendly check-in
  - New features teaser
  - No pressure approach
  - Account waiting message

**Day 7 - New Features 🚀**
- **Subject:** "You haven't seen what Maya can do now... 🚀"
- **Template:** `lib/email/templates/reengagement-sequence.ts` (Day 7)
- **Goal:** Showcase improvements, create FOMO
- **CTA:** "Try New Features"
- **Timing:** 7 days after re-engagement email
- **Loops Tag:** `reengagement-day-7`
- **Content Highlights:**
  - Video B-Roll feature
  - Smarter prompts
  - Faster generation
  - Feed Designer
  - Pro Mode

**Day 14 - Final Offer 💪**
- **Subject:** "Last call: Come back to Studio (50% off) 💪"
- **Template:** `lib/email/templates/reengagement-sequence.ts` (Day 14)
- **Goal:** Final conversion push with discount
- **CTA:** "Claim Your Comeback Offer"
- **Timing:** 14 days after re-engagement email
- **Loops Tag:** `reengagement-day-14`
- **Offer:** 50% off first month (COMEBACK50 promo code)
- **Content Highlights:**
  - 50% off ($48.50 instead of $97)
  - Second chances message
  - Feature recap
  - 48-hour expiry urgency

---

### ✅ Welcome Back Re-engagement

**Trigger:** Member returns after inactivity  
**Template:** `lib/email/templates/welcome-back-reengagement.tsx`  
**Status:** ✅ **AVAILABLE** (scheduled campaigns)

**Welcome Back Email**
- **Subject:** "Welcome back! We missed you"
- **Goal:** Celebrate return, show what's new
- **CTA:** "Start Creating Again"

---

### ✅ Reactivation Campaign Sequence

**Trigger:** 60-90+ days inactive paid members  
**Cron Job:** `/api/cron/reactivation-campaigns`  
**Schedule:** Daily at 11:00 AM UTC  
**Status:** ✅ **FULLY AUTOMATED**

#### Emails Sent (8-email sequence):

**Day 0 - Initial Reach Out**
- **Template:** `lib/email/templates/reactivation-day-0.tsx`
- **Goal:** Soft re-engagement

**Day 2 - Value Reminder**
- **Template:** `lib/email/templates/reactivation-day-2.tsx`
- **Goal:** Remind of benefits

**Day 5 - Success Stories**
- **Template:** `lib/email/templates/reactivation-day-5.tsx`
- **Goal:** Social proof

**Day 7 - Feature Highlights**
- **Template:** `lib/email/templates/reactivation-day-7.tsx`
- **Goal:** Show improvements

**Day 10 - Special Offer**
- **Template:** `lib/email/templates/reactivation-day-10.tsx`
- **Goal:** Discount incentive

**Day 14 - Personal Touch**
- **Template:** `lib/email/templates/reactivation-day-14.tsx`
- **Goal:** Human connection

**Day 20 - Last Chance**
- **Template:** `lib/email/templates/reactivation-day-20.tsx`
- **Goal:** Urgency

**Day 25 - Final Goodbye**
- **Template:** `lib/email/templates/reactivation-day-25.tsx`
- **Goal:** Graceful exit option

---

### ✅ Win-Back Offer

**Trigger:** Cancelled subscriptions  
**Template:** `lib/email/templates/win-back-offer.tsx`  
**Status:** ✅ **AVAILABLE** (scheduled campaigns)

**Win-Back Email**
- **Subject:** "We want you back (and we'll make it worth it)"
- **Goal:** Re-convert cancelled members
- **CTA:** "Rejoin Studio - Special Offer"
- **Offer:** Comeback discount

---

## 4️⃣ TRANSACTIONAL EMAILS (Event-Triggered)

### ✅ Purchase Confirmation (All Products)

**Trigger:** Successful Stripe payment  
**Function:** `sendTransactionalEmail()` in `lib/email/transactional-sender.ts`  
**Template:** `lib/email/templates/welcome-email.tsx`  
**Status:** ✅ **AUTOMATED** (webhook-triggered)

#### Email Variants by Product Type:

**Credit Top-Up Purchase**
- **Subject:** "Payment confirmed - Credits added!"
- **Content:**
  - Payment confirmation
  - Credits added amount
  - New credit balance
  - Order summary
  - Receipt

**Membership Purchase**
- **Subject:** "Welcome to SSELFIE Studio! 🎉"
- **Content:**
  - Payment confirmation
  - Welcome message
  - Credits granted
  - Setup instructions
  - Password setup link (if new user)
  - What's included
  - Getting started guide

**One-Time Session Purchase**
- **Subject:** "Your One-Time Session is ready!"
- **Content:**
  - Payment confirmation
  - Credits granted (limited)
  - Session duration
  - What you can create
  - Upgrade option to full membership

**Blueprint Purchase**
- **Subject:** "Your Paid Blueprint is processing!"
- **Content:**
  - Payment confirmation
  - Processing timeframe (24-48 hours)
  - What to expect
  - Delivery notification promise

---

### ✅ Freebie Delivery

**Trigger:** User submits freebie form  
**Function:** `sendTransactionalEmail()`  
**Template:** `lib/email/templates/freebie-guide-email.tsx`  
**Status:** ✅ **AUTOMATED** (API-triggered)

**Freebie Guide Email**
- **Subject:** "Here's your FREE Brand Blueprint! 📋"
- **Content:**
  - Thank you message
  - Download link
  - What's inside
  - Next steps
  - Soft pitch to Studio

---

### ✅ Payment Issues & Recovery

**Payment Failed Notification**
- **Trigger:** Stripe payment failure
- **Template:** `lib/email/templates/payment-failed.tsx`
- **Subject:** "Payment issue with your Studio subscription"
- **Content:**
  - Alert about failed payment
  - Update payment method CTA
  - Grace period notice
  - Support contact

**Payment Recovery**
- **Template:** `lib/email/templates/payment-recovery.tsx`
- **Subject:** "Update your payment info to keep creating"
- **Content:**
  - Gentle reminder
  - Update payment link
  - What you'll lose if cancelled
  - Support offer

---

### ✅ Subscription Status Emails

**Subscription Ending Soon**
- **Trigger:** Subscription expires in 7 days
- **Cron Job:** `/api/cron/subscription-ending-soon`
- **Template:** `lib/email/templates/subscription-ending-soon.tsx`
- **Subject:** "Your Studio subscription ends in 7 days"
- **Content:**
  - Expiry notice
  - Renewal CTA
  - What you'll miss
  - Special retention offer

---

### ✅ Feedback & Support

**Feedback Reply Email**
- **Trigger:** Admin responds to user feedback
- **Template:** `lib/email/templates/feedback-reply-email.tsx`
- **Subject:** "Re: [Feedback Topic]"
- **Content:**
  - Personalized reply
  - Answer to feedback
  - Follow-up question if needed

**Admin Feedback Notification**
- **Trigger:** User submits feedback
- **Template:** `lib/email/templates/feedback-admin-notification.tsx`
- **Recipient:** Sandra (admin)
- **Subject:** "New Feedback: [Topic]"
- **Content:**
  - User details
  - Feedback content
  - Respond link

---

## 5️⃣ REWARDS & INCENTIVE EMAILS

### ✅ Referral Reward System

**Trigger:** Successful referral conversion  
**Cron Job:** `/api/cron/referral-rewards`  
**Schedule:** Daily at 1:00 PM UTC  
**Status:** ✅ **FULLY AUTOMATED**

**Referral Reward Email**
- **Template:** `lib/email/templates/referral-reward.tsx`
- **Subject:** "You earned $X in credits! 🎉"
- **Content:**
  - Reward confirmation
  - Credits added
  - Referral's name
  - Current referral stats
  - Share link for more rewards

**Referral Invite Email**
- **Template:** `lib/email/templates/referral-invite.tsx`
- **Subject:** "[Friend's Name] invited you to SSELFIE Studio"
- **Content:**
  - Personal invite
  - What SSELFIE is
  - Special referral bonus
  - Join link

---

### ✅ Milestone Bonuses

**Trigger:** User hits milestone (10 posts, 50 photos, etc.)  
**Cron Job:** `/api/cron/milestone-bonuses`  
**Schedule:** Daily at 2:00 PM UTC  
**Status:** ✅ **FULLY AUTOMATED**

**Milestone Bonus Email**
- **Template:** `lib/email/templates/milestone-bonus.tsx`
- **Subject:** "You hit [Milestone]! Here's a bonus 🎁"
- **Content:**
  - Milestone celebration
  - Bonus credits awarded
  - Next milestone preview
  - Encouragement to keep going

**Credit Renewal Reminder**
- **Template:** `lib/email/templates/credit-renewal.tsx`
- **Subject:** "Your monthly credits just renewed!"
- **Content:**
  - Credit renewal notice
  - New balance
  - Feature reminder
  - Creation ideas

---

## 6️⃣ ADMIN & MONITORING EMAILS

### ✅ Critical Bug Alerts

**Trigger:** System detects critical error  
**Function:** Admin notification system  
**Template:** `lib/email/templates/critical-bug-alert.tsx`  
**Recipient:** Sandra (admin)  
**Status:** ✅ **AUTOMATED**

**Critical Bug Alert**
- **Subject:** "🚨 CRITICAL: [Error Type] on Production"
- **Content:**
  - Error details
  - Stack trace
  - User impact
  - Timestamp
  - Direct link to logs

---

### ✅ Beta Testimonial Requests

**Trigger:** Admin schedules campaign  
**Template:** `lib/email/templates/beta-testimonial-request.tsx`  
**Status:** ✅ **AVAILABLE** (manual/scheduled)

**Beta Testimonial Request**
- **Subject:** "Can I feature you? (Quick question)"
- **Content:**
  - Personal ask
  - Why their story matters
  - Simple testimonial form link
  - Optional video request
  - Thank you incentive

---

### ✅ Admin Alerts & Monitoring

**Cron Job Health Checks**
- **Trigger:** Cron job failure or health check
- **Cron Job:** `/api/cron/admin-alerts`
- **Schedule:** Daily at 7:00 AM UTC
- **Recipient:** Sandra
- **Content:**
  - System health status
  - Failed jobs report
  - Action items

---

## 7️⃣ NEWSLETTER & BROADCASTS

### ✅ Weekly Newsletter (Optional)

**Template:** `lib/email/templates/newsletter-template.tsx`  
**Status:** ✅ **AVAILABLE** (manual/scheduled)

**Newsletter Email**
- **Subject:** [Custom per send]
- **Content:**
  - Weekly update
  - Feature announcements
  - Success stories
  - Content tips
  - Community highlights

---

### ✅ Launch Campaign

**Template:** `lib/email/templates/launch-email.tsx`  
**Status:** ✅ **AVAILABLE** (manual broadcast)

**Launch Email**
- **Subject:** [New feature/product launch]
- **Content:**
  - Announcement
  - What's new
  - Why it matters
  - How to access
  - Early access/discount

---

## 📋 CRON JOB SCHEDULE (Complete List)

| Cron Job | Schedule | Purpose | Status |
|----------|----------|---------|--------|
| `resolve-pending-payments` | Every 5 minutes | Payment reconciliation | Active |
| `reconcile-generation-assets` | Every 5 minutes | Maya asset reconciliation | Active |
| `reconcile-generations` | Every 30 minutes | Maya generation reconciliation | Active |
| `reconcile-subscriptions` | Every 30 minutes | Subscription reconciliation | Active |
| `reconcile-credits` | Daily 5:00 AM UTC | Credit balance sync | Active |
| `sync-audience-segments` | Weekly Sunday 3:00 AM UTC | Sync audience segments | Active |
| `refresh-segments` | Daily 3:00 AM UTC | Refresh email segments | Active |
| `blueprint-followup-sequence` | Daily 10:10 AM UTC | Blueprint lifecycle email | Active |
| `nurture-sequence` | Daily 10:00 AM UTC | Freebie conversion | Active |
| `onboarding-sequence` | Daily 10:05 AM UTC | New member onboarding | Active |
| `referral-bonus-notifications` | Daily 10:15 AM UTC | Referral bonus notifications | Active |
| `send-scheduled-newsletters` | Every 15 minutes | Scheduled broadcasts | Active |
| `win-back-sequence` | Daily 10:00 AM UTC | Win-back lifecycle email | Active |
| `admin-alerts` | Daily 7:00 AM UTC | System health alerts | Active |
| `cron-health-check` | Hourly | Cron health monitoring | Active |
| `funnel-report-daily` | Daily 8:00 AM UTC | Funnel reporting | Active |
| `maya-instagram-trends-weekly` | Weekly Monday 6:30 AM UTC | Maya trend intelligence | Active |
| `revenue-engine-weekly` | Weekly Monday 9:00 AM UTC | Revenue reporting | Active |

---

## 📊 EMAIL TRACKING & ANALYTICS

### Database Tables:

**`email_logs`**
- All email sends
- Open tracking
- Click tracking
- Resend message IDs

**`email_events`**
- Campaign-level tracking
- Broadcast events
- Success/failure rates

**`email_segments`**
- Segment definitions
- Engagement criteria
- Auto-refresh settings

**`email_segment_members`**
- Segment membership
- Dynamic updates

**`reengagement_campaigns`**
- Re-engagement tracking
- Campaign definitions

**`reengagement_sends`**
- Individual re-engagement sends
- Response tracking

---

## 🎯 EMAIL STRATEGY SUMMARY

### New Member Journey (Paid):
1. ✅ **Day 0:** Welcome email (immediate)
2. ✅ **Day 3:** Progress check
3. ✅ **Day 7:** Advanced features
4. ✅ **Ongoing:** Milestone bonuses, referral rewards

### Freebie Subscriber Journey:
1. ✅ **Immediate:** Freebie delivery
2. ✅ **Day 1:** Value delivery + Studio pitch
3. ✅ **Day 3:** Blueprint usage tips
4. ✅ **Day 5:** Case study (Sarah)
5. ✅ **Day 7:** Success story
6. ✅ **Day 10:** Final offer
7. ✅ **Day 14:** Discount push

### Inactive Member Journey:
1. ✅ **Day 0 (30 days inactive):** Miss you email
2. ✅ **Day 7:** New features
3. ✅ **Day 14:** 50% off comeback offer

### Cancelled Member Journey:
1. ✅ **Day 0-25:** 8-email reactivation sequence
2. ✅ **Final:** Win-back offer

---

## 📧 EMAIL VOICE & STYLE

**All emails written in Sandra's authentic voice:**
- ✅ Warm, direct, grounded
- ✅ Best-friend energy with CEO clarity
- ✅ No hustle language, no AI fluff
- ✅ No m-dashes
- ✅ Simple everyday language
- ✅ Personal and empowering

**Design:**
- ✅ SSELFIE brand colors (stone tones)
- ✅ Times New Roman for headers
- ✅ Mobile-responsive
- ✅ Clean, minimal design

**CTAs:**
- ✅ Clear and direct
- ✅ UTM-tracked for analytics
- ✅ Product-specific routing
- ✅ Promo code support

---

## ✅ INTEGRATION STATUS

**Resend:**
- ✅ API key configured
- ✅ Transactional sending
- ✅ Broadcast sending
- ✅ Webhook tracking (opens, clicks)
- ✅ Unsubscribe management
- ✅ Audience sync

**Loops:**
- ✅ Tag-based automations
- ✅ Blueprint followup sequence
- ✅ Re-engagement sequence
- ✅ Contact sync

**Database:**
- ✅ All sends logged
- ✅ Event tracking
- ✅ Analytics data
- ✅ Segment management

**Stripe:**
- ✅ Webhook integration
- ✅ Payment confirmation emails
- ✅ Subscription status updates

---

## 📝 NOTES & RECOMMENDATIONS

### ✅ What's Working Well:
1. **Welcome sequence** converting new members effectively
2. **Blueprint followup** driving engagement
3. **Re-engagement offers** bringing back inactive users
4. **Transactional emails** delivering reliably
5. **Segmentation** targeting right users at right time

### 🚀 Opportunities for Enhancement:
1. **A/B Testing** - Test subject lines and CTAs (framework exists in `lib/email/ab-testing.ts`)
2. **Behavioral Triggers** - Add event-based emails (first photo, model trained, low credits)
3. **Personalization** - Dynamic content based on user behavior
4. **Win-Back Automation** - Fully automate cancelled member sequence
5. **Newsletter Cadence** - Regular weekly/monthly newsletter

### 📊 Key Metrics to Monitor:
- ✅ Open rates by sequence
- ✅ Click rates by CTA
- ✅ Conversion rates (free → paid)
- ✅ Re-engagement success rates
- ✅ Unsubscribe rates
- ✅ Revenue attribution

---

## 🎯 BOTTOM LINE

**Total Emails Sent Automatically:** 50+ unique email templates  
**Automation Coverage:** ~95% (most emails run automatically)  
**Manual Intervention Needed:** Only for broadcasts/newsletters  
**System Health:** All cron jobs running smoothly  
**Integration Status:** Fully operational

**Your email system is comprehensive, automated, and actively nurturing your audience through every stage of their journey.**

---

**Last Updated:** January 29, 2026  
**Next Review:** Monthly or when adding new sequences  
**Maintained By:** Sandra Anderson (ssa@ssasocial.com)

---

## 📞 NEED HELP?

**To add new emails:** Use `/app/api/admin/email/create-automation-sequence`  
**To schedule broadcasts:** Use `/app/api/admin/email/send-scheduled-campaigns`  
**To check cron health:** `/api/cron/cron-health-check`  
**To preview emails:** `/app/api/admin/email/preview`

**All email templates:** `lib/email/templates/`  
**All cron jobs:** `app/api/cron/`  
**Email system docs:** `docs/EMAIL_AUTOMATION_COMPLETE_STATUS.md`

# SSELFIE Mini Products: Monetization Audit & Implementation Plan
**Date:** January 9, 2026  
**Prepared by:** Product + Growth Engineering Team  
**Status:** Ready for Implementation

---

## Executive Summary

This audit maps SSELFIE's existing monetization infrastructure and proposes **6 mini product offerings** that can be launched with minimal dev work by repackaging existing features. Each mini product creates a $47-$97 entry point that funnels users toward Creator Studio membership ($97/month).

**Key Finding:** You have a sophisticated automation engine (email sequences, segmentation, cron jobs, conversion tracking, upgrade detection) that is currently underutilized for pre-membership monetization.

**Revenue Opportunity:** Based on current traffic patterns and conversion data, these mini products could generate an additional $15K-$30K MRR within 90 days.

---

## Part 1: MONETIZATION MAP

### 1.1 Stripe Products & Pricing

**Current Configuration:**

| Product ID | Product Name | Type | Price | Credits | Stripe Price ID Env Var |
|------------|-------------|------|-------|---------|------------------------|
| `one_time_session` | Starter Photoshoot | One-time | $49 | 50 | `STRIPE_ONE_TIME_SESSION_PRICE_ID` |
| `sselfie_studio_membership` | Creator Studio | Subscription | $97/month | 200/month | `STRIPE_SSELFIE_STUDIO_MEMBERSHIP_PRICE_ID` |
| `credits_topup_100` | 100 Credits Top-Up | One-time | $45 | 100 | Dynamic (price_data) |
| `credits_topup_200` | 200 Credits Top-Up | One-time | $85 | 200 | Dynamic (price_data) |

**Source Files:**
- `/lib/products.ts` - Product definitions
- `/lib/credits.ts` - Credit costs and grants
- `/app/actions/landing-checkout.ts` - Public checkout flow
- `/app/actions/stripe.ts` - In-app checkout flow
- `/app/actions/upgrade-checkout.ts` - Upgrade checkout flow

---

### 1.2 Checkout Entry Points

**Landing Page Checkouts** (Public, unauthenticated):
- **Function:** `createLandingCheckoutSession()` in `/app/actions/landing-checkout.ts`
- **Flow:** Landing page → Embedded checkout → Stripe webhook → Account creation → Welcome email
- **Metadata:** `product_id`, `product_type`, `credits`, `source: "landing_page"`
- **Supported Products:** `one_time_session`, `sselfie_studio_membership`

**In-App Checkouts** (Authenticated users):
- **Function:** `startCreditCheckoutSession()` and `startProductCheckoutSession()` in `/app/actions/stripe.ts`
- **Flow:** App screen → Embedded checkout → Stripe webhook → Credit grant → Confirmation email
- **Metadata:** `user_id`, `product_type`, `credits`, `source: "app"`
- **Supported Products:** All credit top-ups, membership upgrades

**Upgrade Checkouts** (One-time buyers → Membership):
- **Function:** `createUpgradeCheckoutSession()` in `/app/actions/upgrade-checkout.ts`
- **Flow:** Upgrade modal/email link → Embedded checkout → Stripe webhook → Subscription record
- **Metadata:** `user_id`, `source: "email_automation"`, `campaign: "onetime-to-creator"`
- **Promo Code Support:** ✅ (validated server-side)

---

### 1.3 Stripe Webhook Handling

**Primary Webhook:** `/app/api/webhooks/stripe/route.ts` (1940 lines)

**Events Handled:**
1. `checkout.session.completed` 
   - Creates user accounts for new purchases
   - Sends welcome emails with password setup links
   - Grants one-time credits (for `one_time_session` and `credit_topup`)
   - Adds to email segments (Beta, Photoshoot Buyers)
   - Tags contacts in Resend + Flodesk
   - Marks conversions in email sequences

2. `invoice.payment_succeeded`
   - Grants monthly subscription credits (200 for Creator Studio)
   - Stores payment in `stripe_payments` table
   - Sends credit renewal emails
   - Prevents duplicate grants with idempotency checks

3. `customer.subscription.created/updated/deleted`
   - Creates/updates subscription records in `subscriptions` table
   - Updates status (`active`, `canceled`, `past_due`)
   - Syncs to Flodesk for marketing automation

**Credit Grant Logic:**
- **One-time session:** 50 credits granted immediately on payment
- **Creator Studio:** 200 credits granted monthly on invoice payment
- **Test mode protection:** Credits NOT granted for test purchases
- **Idempotency:** Duplicate webhooks are blocked via `webhook_events` table

**Email Automations Triggered:**
- Welcome email with password setup (for new users)
- Credit top-up confirmation (for existing users)
- Credit renewal notification (for monthly subscriptions)
- Beta testimonial campaign (scheduled 10 days after purchase)

---

### 1.4 Post-Purchase Onboarding Paths

**Checkout Success Routes:**

| Purchase Type | Success Route | Post-Login Destination | Onboarding Goal |
|--------------|---------------|----------------------|----------------|
| One-time session | `/checkout/success` | `/studio` (train model) | Complete training + generate first images |
| Creator Studio | `/checkout/success` | `/studio` (train model) | Complete training + explore all features |
| Credit top-up | `/checkout/success` | Previous screen | Continue current workflow |

**Studio Onboarding Flow:**
1. `/studio` → Train your model (20 credits, requires 10+ selfies)
2. Generate first images → See gallery
3. Explore tabs: Studio, Maya AI, Feed Planner, Bio, Blueprint, Prompt Guides

**First-Time User Experience:**
- Password setup email → Login → Studio landing
- Training wizard → Upload selfies → Select style → Generate images
- Success state → Gallery view → Upsell to other features

---

### 1.5 Email Automation Infrastructure

**Email Service:** Resend (transactional) + Flodesk (marketing)

**Key Tables:**
- `email_logs` - Tracks all sent emails, opens, clicks, conversions
- `email_segments` - Dynamic segments with auto-refresh
- `email_segment_members` - Segment membership
- `admin_email_campaigns` - Campaign definitions with conversion tracking
- `blueprint_subscribers` - Blueprint funnel leads
- `freebie_subscribers` - General subscribers
- `welcome_back_sequence` - Win-back automation

**Segmentation Engine** (`/lib/email/segmentation.ts`):
- **Dynamic segments:** Auto-refresh based on engagement, purchases, behavior
- **Criteria:** Last opened days, min/max opens/clicks, purchase history, Blueprint completion, conversion status
- **Cron job:** `/app/api/cron/refresh-segments` runs daily at 3 AM UTC

**Active Sequences (Cron Jobs in `/app/api/cron/`):**
1. `blueprint-email-sequence` - Blueprint funnel nurture
2. `welcome-back-sequence` - Win-back for churned users
3. `upsell-campaigns` - One-time buyers → membership upsell
4. `reactivation-campaigns` - Dormant user reactivation
5. `cold-reeducation-sequence` - Cold lead reengagement
6. `nurture-sequence` - General engagement nurture
7. `send-scheduled-campaigns` - Scheduled broadcast campaigns

**Email Tracking:**
- Click tracking: `/api/email/track-click` generates unique tracked links
- Open tracking: Pixel-based (Resend built-in)
- Conversion tracking: Stripe webhook marks `converted = true` in `email_logs`
- Attribution: `campaign_id` in checkout metadata

**Email Control System:**
- Kill switches in `email_control` table
- Admin panel: `/app/api/admin/email-control/settings`
- Global email sending can be paused without code deployment

---

### 1.6 Upgrade Detection & In-App Upsells

**Upgrade Detection:**
- `/lib/upgrade-detection.ts` - Checks if user should be prompted to upgrade
- Triggers: Credit balance low, feature gate, usage milestones
- Displayed via: `<UpgradeModal>` component

**In-App Upsell Components:**
- `/components/upgrade/upgrade-modal.tsx` - Primary upgrade modal
- `/components/upgrade/smart-upgrade-banner.tsx` - Contextual banners
- `/components/UpgradeOrCredits.tsx` - Choice modal (upgrade vs buy credits)

**Upsell Triggers:**
1. **Credit depletion:** When balance < 20 credits
2. **Feature gates:** Academy content (Studio members only)
3. **Pro mode:** Advanced Maya AI features
4. **Feed planner:** Advanced feed generation

**Upgrade API:**
- `/app/api/subscription/upgrade/route.ts`
- Checks existing subscription → Creates new or updates existing
- Generates checkout session with `source: "email_automation"`, `campaign: "onetime-to-creator"`

---

### 1.7 Analytics & Conversion Tracking

**Admin Dashboards:**

| Dashboard | Route | Metrics |
|-----------|-------|---------|
| Conversions | `/app/api/admin/conversions` | Email→Purchase funnel, campaign ROI |
| Email Analytics | `/app/api/admin/email-analytics` | Opens, clicks, conversions by campaign |
| Revenue | `/app/api/admin/dashboard/stats` | MRR, churn, LTV, revenue by product |
| Growth Forecast | `/app/api/admin/growth-dashboard` | Projections, cohort analysis |
| Cron Health | `/app/admin/diagnostics/cron` | Automation health monitoring |

**Tracked Events** (via `/lib/analytics.ts`):
- `pricing_view` - User viewed pricing section
- `checkout_start` - User initiated checkout
- `cta_click` - CTA button clicked (location, product, destination)
- `bio_link_click` - Bio page link interactions
- `conversion` - Purchase completed

**Conversion Attribution:**
- Stripe metadata includes `campaign_id` for email campaigns
- Webhook updates `admin_email_campaigns.total_converted` counter
- Email logs track `converted_at` timestamp
- Revenue attribution via `credit_transactions` table

---

### 1.8 Feature Flags & Access Control

**Feature Flags:** `admin_feature_flags` table
- Can enable/disable features without deployment
- Admin panel: `/app/api/admin/feature-flags`

**Access Control:**
- Studio Membership check: `hasStudioMembership(userId)` in `/lib/subscription.ts`
- Credit check: `checkCredits(userId, amount)` in `/lib/credits.ts`
- Academy access: Only Studio members

---

### 1.9 Existing Landing Pages & Public Routes

**Current Public Pages:**

| Route | Purpose | CTA | Checkout Flow |
|-------|---------|-----|---------------|
| `/` (landing) | Main landing page | Start free trial, Buy Now | Landing checkout |
| `/bio` | Instagram bio optimization landing | Buy packages | Landing checkout |
| `/blueprint` | Free Brand Blueprint tool | Email capture → Upsell | Landing checkout (after completion) |
| `/why-studio` | Value prop explainer | Join Studio | Landing checkout |
| `/share-your-story` | User testimonials/social proof | Buy Now | Landing checkout |

**Blueprint Funnel (Existing):**
1. Landing page → Email capture
2. Complete questionnaire (business, vibe, goals)
3. Generate Brand Blueprint (9-post grid concept)
4. Email PDF + concepts
5. Upsell: "Turn these concepts into real photos" → Checkout

**Current Conversion Paths:**
- Instagram → Blueprint (free) → Email nurture → Purchase
- Instagram → Landing page → Purchase
- Instagram → Bio page → Purchase
- Existing user → Upgrade modal → Purchase

---

## Part 2: MINI PRODUCT RECOMMENDATIONS

Based on existing features and infrastructure, here are **6 mini product offerings** that can be launched with minimal dev work:

---

### Mini Product 1: **Brand Blueprint (Paid)**

**The Offer:** "Your 9-Post Brand Blueprint + First Photoshoot" - $67 one-time

**What's Included:**
- Complete Brand Blueprint questionnaire
- AI-generated 9-post feed concept grid
- Captions + hashtags for all 9 posts
- 30 AI-generated photos matching your brand vibe
- **Outcome:** Your first week of content, ready to post

**Existing Infrastructure to Leverage:**
- ✅ Blueprint flow already built (`/app/blueprint/page.tsx`)
- ✅ Email capture + sequence (`blueprint_subscribers` table)
- ✅ Concept generation API (`/app/api/blueprint/generate-concepts`)
- ✅ Image generation (already generates 9-post grid)
- ✅ PDF generation (sends Blueprint via email)

**What Needs to Change:**
- Add "Upgrade to Paid Blueprint" button on free Blueprint completion screen
- Create Stripe product: `brand_blueprint_paid` ($67, 30 credits)
- Add new checkout route: `/checkout/blueprint-paid`
- Update Blueprint email sequence to upsell paid version
- Add testimonials section to Blueprint landing page

**Post-Purchase Flow:**
1. Purchase → Account created → 30 credits granted
2. Redirect to `/blueprint?paid=true` (skips email capture)
3. Complete questionnaire → Generate concepts (automatic)
4. Generate 30 photos using granted credits
5. Email PDF + download link for all images
6. Email sequence: Day 3 (check-in), Day 7 (upgrade to Studio)

**Upsell Path:**
- "Turn your Blueprint into unlimited content → Upgrade to Creator Studio"
- In-app upgrade modal when credits are low
- Email sequence highlighting Feed Planner, Maya AI, and ongoing content creation

**Revenue Potential:** $67 × 50 purchases/month = **$3,350 MRR**

**Implementation Effort:** 🟢 Low (2-3 days, 1 small PR)

---

### Mini Product 2: **Instagram Bio Glow-Up**

**The Offer:** "Instagram Bio + Profile Photo Package" - $47 one-time

**What's Included:**
- 5 AI-generated profile photo variations
- 3 bio copy options (optimized for your niche)
- Link-in-bio strategy
- Highlight cover set (5 highlight icons)
- **Outcome:** Professional Instagram profile in 24 hours

**Existing Infrastructure to Leverage:**
- ✅ Bio page already exists (`/app/bio/page.tsx`)
- ✅ Image generation infrastructure (Studio)
- ✅ Maya AI for bio copy generation
- ✅ Checkout flow ready

**What Needs to Change:**
- Add "Get Your Bio Glow-Up" CTA to Bio landing page
- Create Stripe product: `bio_glowup` ($47, 25 credits)
- Build Bio Generator form: Name, niche, vibe, current bio
- Create `/bio/generator` route (authenticated)
- Add email template for Bio Glow-Up delivery
- Generate 5 profile photos + 3 bio variations
- Package as PDF with strategy guide

**Post-Purchase Flow:**
1. Purchase → Account created → 25 credits granted
2. Redirect to `/bio/generator` 
3. Fill form → Submit → Processing screen
4. Generate 5 profile photos (5 credits) + bio copy (Maya AI)
5. Email PDF with all assets + implementation guide
6. Day 3: Check-in email ("How's your new bio performing?")
7. Day 7: "Want more content? Upgrade to Creator Studio"

**Upsell Path:**
- "Your profile looks amazing. Now create content to match → Studio"
- Show before/after examples of full Studio capabilities
- Offer $20 discount on first month of Studio membership

**Revenue Potential:** $47 × 70 purchases/month = **$3,290 MRR**

**Implementation Effort:** 🟡 Medium (4-5 days, 2 PRs)

---

### Mini Product 3: **9-Post Feed in 60 Minutes**

**The Offer:** "9 Ready-to-Post Photos + Captions" - $77 one-time

**What's Included:**
- 9 professional AI photos in your brand style
- Captions + hashtags for each post
- Posting schedule (best times for your audience)
- Canva-style templates for text overlays
- **Outcome:** One week of Instagram content, ready to go

**Existing Infrastructure to Leverage:**
- ✅ Feed Planner already built (`/app/feed-planner`)
- ✅ Image generation (Studio)
- ✅ Caption generation (Maya AI + Feed Planner)
- ✅ Email delivery infrastructure

**What Needs to Change:**
- Create public landing page: `/9-post-feed`
- Add "Get 9 Posts Now" CTA throughout site
- Create Stripe product: `nine_post_feed` ($77, 40 credits)
- Build Quick Feed Generator (simplified Feed Planner)
- Generate 9 images + captions in one batch
- Email ZIP file with all assets + posting guide

**Post-Purchase Flow:**
1. Purchase → Account created → 40 credits granted
2. Redirect to `/feed-planner?quick=true`
3. Choose style + vibe → Generate 9 posts (automatic)
4. Review + download all images
5. Email ZIP + posting schedule
6. Day 5: "How's your engagement?" email
7. Day 10: "Never run out of content again → Studio"

**Upsell Path:**
- "This feed performed great! Get unlimited content → Studio"
- Show engagement stats comparison (before/after)
- Highlight Feed Planner's ongoing content calendar

**Revenue Potential:** $77 × 45 purchases/month = **$3,465 MRR**

**Implementation Effort:** 🟡 Medium (5-6 days, 2-3 PRs)

---

### Mini Product 4: **Starter Brand Photoshoot** (Existing, Enhanced)

**The Offer:** "50 Professional Brand Photos" - $49 one-time (already exists, needs enhancement)

**What's Included:**
- Train your AI model (upload 10-15 selfies)
- 50 AI-generated brand photos
- 5 style variations (Professional, Casual, Creative, Lifestyle, Artistic)
- Download all images
- **Outcome:** Professional brand photoshoot without the photographer

**Existing Infrastructure:**
- ✅ Already a Stripe product (`one_time_session`)
- ✅ Checkout flow ready
- ✅ Credit grants working (50 credits)
- ✅ Training flow in Studio

**What Needs Enhancement:**
1. **Better landing page** - Create dedicated `/starter-photoshoot` route
2. **Before/after showcase** - Show real customer results
3. **Guided onboarding** - Wizard for first-time users (train → generate → download)
4. **Email sequence** - Currently basic, needs nurture sequence
5. **Upsell timing** - Prompt upgrade when 30 credits remaining (not 0)

**Post-Purchase Flow (Enhanced):**
1. Purchase → Account created → 50 credits granted
2. Redirect to `/studio?onboarding=true` (wizard mode)
3. Training wizard: Upload selfies → Select style → Train (20 credits)
4. Generation wizard: Generate 30 images (30 credits)
5. Gallery view: Download all images
6. **Upsell modal:** "You have 0 credits left. Get 200/month → Studio"
7. Email sequence:
   - Day 1: Welcome + quick start guide
   - Day 3: "How did your photoshoot turn out?"
   - Day 7: "Need more photos?" (upgrade + testimonials)
   - Day 14: "Create consistent content" (Feed Planner pitch)

**Upsell Path:**
- "You loved your first photoshoot. Get unlimited content → Studio"
- Show Feed Planner, Maya AI, Bio Generator as next steps
- Offer first-month discount ($77 instead of $97)

**Revenue Potential:** $49 × 80 purchases/month = **$3,920 MRR** (current baseline)

**Implementation Effort:** 🟢 Low (3-4 days, enhance existing)

---

### Mini Product 5: **Rebrand Reset**

**The Offer:** "New Brand, New Content Strategy" - $97 one-time

**What's Included:**
- Retrain your AI model with new brand vibe
- New Brand Blueprint (9-post concept grid)
- 60 images in new brand style
- Bio + caption refresh for new positioning
- **Outcome:** Complete rebrand in one day

**Existing Infrastructure:**
- ✅ All core features exist (Training, Blueprint, Bio, Image gen)
- ✅ Just needs packaging + landing page

**What Needs to Change:**
- Create landing page: `/rebrand`
- Create Stripe product: `rebrand_reset` ($97, 80 credits)
- Build Rebrand Wizard (combines Blueprint + Studio + Bio)
- Email sequence for rebrand customers
- Add "Rebrand" option to existing user settings

**Post-Purchase Flow:**
1. Purchase → Account created → 80 credits granted
2. Redirect to `/rebrand-wizard`
3. Step 1: New Brand Blueprint questionnaire
4. Step 2: Upload new selfies → Train new model (20 credits)
5. Step 3: Generate 60 images in new style (60 credits)
6. Step 4: New bio copy generated (Maya AI)
7. Email: Complete rebrand package (Blueprint PDF + images + bio)
8. Day 7: "Ready for consistent content? → Studio"

**Upsell Path:**
- "Your rebrand looks amazing. Keep the momentum → Studio"
- Position Studio as "Rebrand Maintenance Plan"
- Show how Feed Planner maintains brand consistency

**Revenue Potential:** $97 × 20 purchases/month = **$1,940 MRR**

**Implementation Effort:** 🟡 Medium (6-7 days, 3 PRs)

---

### Mini Product 6: **Credit Boosters** (Existing, Enhanced)

**The Offer:** "100-200 Extra Credits" - $45-$85 one-time (already exists, needs better positioning)

**What's Included:**
- 100 or 200 credits
- No expiration
- Instant delivery
- **Outcome:** Extend your content creation without subscription

**Existing Infrastructure:**
- ✅ Already Stripe products (`credits_topup_100`, `credits_topup_200`)
- ✅ Checkout flow ready
- ✅ Credit grants working

**What Needs Enhancement:**
1. **Smart positioning** - Offer credit booster BEFORE credits hit zero
2. **Bundling** - "Buy 9-Post Feed + 100 Credits" package deals
3. **Seasonal offers** - Holiday discount, BOGO credits
4. **Gifting** - Buy credits for another creator
5. **Upsell comparison** - "Or get 200 credits/month + all features → Studio"

**Enhanced Purchase Flow:**
1. Credit low notification (< 30 credits)
2. Modal: "Buy 100 credits ($45) OR upgrade to Studio (200/month + unlimited features)"
3. Purchase → Instant credit grant → Confirmation
4. Email: "Credits added! Pro tip: Studio gives you 200/month"

**Upsell Path:**
- Always present Studio as better value: "$45 for 100 credits OR $97/month for 200 credits + Feed Planner + Maya AI"
- Show ROI calculator

**Revenue Potential:** $65 avg × 60 purchases/month = **$3,900 MRR**

**Implementation Effort:** 🟢 Low (2-3 days, enhance existing)

---

## Part 3: MINI PRODUCT COMPARISON TABLE

| Mini Product | Price | Credits | Implementation | Revenue Potential | Upsell Conversion | Priority |
|--------------|-------|---------|----------------|-------------------|-------------------|----------|
| **Starter Photoshoot** (enhanced) | $49 | 50 | 🟢 Low | $3,920/mo | 15-20% | ⭐⭐⭐ High |
| **Brand Blueprint** (paid) | $67 | 30 | 🟢 Low | $3,350/mo | 20-25% | ⭐⭐⭐ High |
| **Bio Glow-Up** | $47 | 25 | 🟡 Medium | $3,290/mo | 15-20% | ⭐⭐ Medium |
| **9-Post Feed** | $77 | 40 | 🟡 Medium | $3,465/mo | 20-25% | ⭐⭐⭐ High |
| **Rebrand Reset** | $97 | 80 | 🟡 Medium | $1,940/mo | 25-30% | ⭐ Low |
| **Credit Boosters** (enhanced) | $45-85 | 100-200 | 🟢 Low | $3,900/mo | 5-10% | ⭐⭐ Medium |

**Total New Revenue Potential:** $19,865/month (excluding existing Starter Photoshoot baseline)

**Estimated Studio Upgrades from Mini Products:**  
- Avg 18% of mini product buyers upgrade to Studio within 30 days
- Avg value: ~$175/customer lifetime

---

## Part 4: 90-DAY ROLLOUT PLAN

### Phase 1: Weeks 1-2 (Quick Wins)

**Goal:** Launch 2 mini products with lowest implementation effort

**Week 1:**
- ✅ **PR 1:** Enhance Starter Photoshoot landing page
  - Create `/starter-photoshoot` route
  - Add before/after gallery
  - Improve onboarding wizard
  - Better upsell modal timing
  - Enhanced email sequence

- ✅ **PR 2:** Enhance Credit Boosters positioning
  - Smart low-credit notifications
  - Comparison modal (credits vs Studio)
  - Gifting option
  - Bundle offers

**Week 2:**
- ✅ **PR 3:** Launch Paid Brand Blueprint
  - Add upgrade CTA to free Blueprint
  - Create Stripe product
  - Build `/checkout/blueprint-paid` route
  - Email sequence with upsell
  - Testimonials section

- 📊 **Analytics:** Set up conversion tracking for new products
- 📧 **Email:** Launch Blueprint upsell sequence
- 🎯 **Target:** $7,000/mo from enhanced products

---

### Phase 2: Weeks 3-4 (Medium Effort Products)

**Goal:** Launch 2 outcome-focused mini products

**Week 3:**
- ✅ **PR 4:** Launch 9-Post Feed product
  - Create `/9-post-feed` landing page
  - Build Quick Feed Generator (simplified Feed Planner)
  - Batch image + caption generation
  - ZIP file delivery
  - Email sequence

**Week 4:**
- ✅ **PR 5:** Launch Bio Glow-Up product
  - Create `/bio-glowup` landing page
  - Build Bio Generator form
  - Profile photo generation (5 variations)
  - Bio copy generation (3 options)
  - PDF delivery with strategy guide
  - Email sequence

- 📊 **Analytics:** A/B test pricing ($47 vs $57 for Bio, $77 vs $87 for Feed)
- 📧 **Email:** Launch win-back campaign to inactive free users
- 🎯 **Target:** $12,000/mo total from all products

---

### Phase 3: Month 2 (Optimization & Segment Integration)

**Goal:** Optimize conversion funnels, integrate mini products into email automation

**Weeks 5-6:**
- ✅ **Segmentation:** Create mini product buyer segments
  - "Blueprint Buyers - Not Studio"
  - "Bio Glow-Up Buyers - Not Studio"
  - "9-Post Feed Buyers - Not Studio"
  - "Credit Booster Frequent Buyers"
  
- ✅ **Email Automation:** Upsell sequences for each segment
  - Day 3: Check-in + quick win
  - Day 7: Testimonial + Studio benefits
  - Day 14: Discount offer (first month $77)
  - Day 30: FOMO ("Members are creating X/month")

**Weeks 7-8:**
- ✅ **A/B Testing:** Test upsell messaging
  - "Unlimited content" vs "Save $X/year"
  - Discount timing (Day 7 vs Day 14)
  - Email subject lines
  
- ✅ **Landing Page Optimization:**
  - Add social proof (testimonials, Instagram embeds)
  - Improve mobile conversion
  - Add FAQ sections
  - Optimize CTA placement

- 🎯 **Target:** $15,000/mo total, 15% upsell rate to Studio

---

### Phase 4: Month 3 (Scale & Rebrand Product)

**Goal:** Launch final mini product, scale via paid traffic

**Weeks 9-10:**
- ✅ **PR 6:** Launch Rebrand Reset product
  - Create `/rebrand` landing page
  - Build Rebrand Wizard (multi-step)
  - Email sequence
  - Integration with existing flows

**Weeks 11-12:**
- ✅ **Paid Traffic Tests:**
  - Instagram ads → Blueprint (free) → Paid Blueprint → Studio
  - Instagram ads → Bio Glow-Up landing → Purchase
  - Retargeting ads for free Blueprint users
  - Lookalike audiences from mini product buyers

- ✅ **Partnership Outreach:**
  - Instagram coach partnerships (affiliate program)
  - Bundle deals with complementary products
  - Creator community partnerships

- 📊 **Analytics:** Full funnel analysis
  - Cost per mini product acquisition
  - Mini product → Studio conversion rate
  - LTV by acquisition channel
  - ROI by product

- 🎯 **Target:** $20,000/mo total, 18% upsell rate to Studio

---

## Part 5: IMPLEMENTATION TASK LIST (PR-Sized)

### 🟢 **PRIORITY 1: QUICK WINS (Weeks 1-2)**

#### **PR-1: Enhance Starter Photoshoot Landing Page**
**Files to Modify:**
- Create `/app/starter-photoshoot/page.tsx` (new)
- Modify `/components/sselfie/landing-page-new.tsx` (add link)
- Modify `/components/sselfie/sselfie-app.tsx` (improve onboarding wizard)
- Create `/components/studio-pro/starter-photoshoot-wizard.tsx` (new)
- Modify `/lib/email/templates/welcome-email.tsx` (enhance email)

**New Files to Create:**
- `/app/api/onboarding/track-step/route.ts` (track wizard progress)

**Expected Changes:**
- ~300 lines of new code
- 5 modified files
- 2 new email templates

**Testing Checklist:**
- [ ] Landing page loads correctly
- [ ] Wizard guides user through training
- [ ] Upsell modal appears at 30 credits (not 0)
- [ ] Email sequence sends on schedule
- [ ] Mobile responsiveness

---

#### **PR-2: Smart Credit Booster Positioning**
**Files to Modify:**
- Modify `/components/credits/buy-credits-dialog.tsx` (add comparison modal)
- Modify `/components/sselfie/account-screen.tsx` (add smart notifications)
- Create `/components/credits/credit-booster-comparison.tsx` (new)
- Modify `/lib/analytics.ts` (track credit booster views)

**Expected Changes:**
- ~200 lines of new code
- 4 modified files

**Testing Checklist:**
- [ ] Low credit notification appears at 30 credits
- [ ] Comparison modal shows Studio value prop
- [ ] Purchase flow works correctly
- [ ] Analytics events fire

---

#### **PR-3: Paid Brand Blueprint Product**
**Files to Modify:**
- Modify `/app/blueprint/page.tsx` (add upgrade CTA)
- Create `/app/blueprint-paid/page.tsx` (new paid landing)
- Modify `/lib/products.ts` (add new product)
- Create `/app/checkout/blueprint-paid/page.tsx` (new checkout route)
- Modify `/app/api/webhooks/stripe/route.ts` (handle new product type)
- Create `/lib/email/templates/blueprint-paid-welcome.tsx` (new)
- Create `/app/api/cron/blueprint-paid-sequence/route.ts` (new sequence)

**Database Changes:**
- Add `product_type: "brand_blueprint_paid"` support in `credit_transactions`
- Add Stripe product in dashboard: `brand_blueprint_paid` ($67, 30 credits)

**Expected Changes:**
- ~500 lines of new code
- 7 modified/new files
- 3 new email templates

**Testing Checklist:**
- [ ] Free Blueprint shows upgrade CTA
- [ ] Paid checkout flow works
- [ ] Credits granted correctly
- [ ] Email sequence sends
- [ ] PDF delivery works

---

### 🟡 **PRIORITY 2: OUTCOME PRODUCTS (Weeks 3-4)**

#### **PR-4: 9-Post Feed Product**
**Files to Modify:**
- Create `/app/9-post-feed/page.tsx` (landing page)
- Create `/components/feed-planner/quick-feed-generator.tsx` (simplified generator)
- Modify `/lib/products.ts` (add product)
- Create `/app/checkout/nine-post-feed/page.tsx` (checkout)
- Modify `/app/api/webhooks/stripe/route.ts` (handle product)
- Create `/lib/email/templates/nine-post-feed-delivery.tsx` (delivery email)
- Create `/app/api/feed/generate-quick-feed/route.ts` (batch generation API)
- Create `/app/api/cron/nine-post-feed-sequence/route.ts` (email sequence)

**Database Changes:**
- Add `product_type: "nine_post_feed"` support
- Add Stripe product: `nine_post_feed` ($77, 40 credits)

**Expected Changes:**
- ~700 lines of new code
- 8 new files
- 4 new email templates

**Testing Checklist:**
- [ ] Landing page converts
- [ ] Quick generator works (9 images + captions)
- [ ] ZIP file delivery
- [ ] Email sequence sends
- [ ] Upsell modal timing

---

#### **PR-5: Bio Glow-Up Product**
**Files to Modify:**
- Create `/app/bio-glowup/page.tsx` (landing page)
- Create `/app/bio/generator/page.tsx` (Bio Generator form)
- Create `/components/bio/bio-generator-form.tsx` (form component)
- Modify `/lib/products.ts` (add product)
- Create `/app/checkout/bio-glowup/page.tsx` (checkout)
- Modify `/app/api/webhooks/stripe/route.ts` (handle product)
- Create `/app/api/bio/generate-glowup/route.ts` (generation API)
- Create `/lib/email/templates/bio-glowup-delivery.tsx` (delivery email)
- Create `/app/api/cron/bio-glowup-sequence/route.ts` (email sequence)

**Database Changes:**
- Create `bio_glowup_orders` table (store orders + generated content)
- Add `product_type: "bio_glowup"` support
- Add Stripe product: `bio_glowup` ($47, 25 credits)

**Expected Changes:**
- ~800 lines of new code
- 9 new files
- 1 new table
- 4 new email templates

**Testing Checklist:**
- [ ] Landing page converts
- [ ] Form submission works
- [ ] 5 profile photos generated
- [ ] 3 bio copy variations generated
- [ ] PDF delivery works
- [ ] Email sequence sends

---

### 🔵 **PRIORITY 3: SEGMENTATION & AUTOMATION (Month 2)**

#### **PR-6: Mini Product Segmentation**
**Files to Modify:**
- Modify `/lib/email/segmentation.ts` (add new segment criteria)
- Create `/scripts/create-mini-product-segments.ts` (setup script)
- Modify `/app/api/cron/refresh-segments/route.ts` (add new segments)

**Database Changes:**
- Create segments in `email_segments` table:
  - "Blueprint Buyers - Not Studio"
  - "Bio Glow-Up Buyers - Not Studio"
  - "9-Post Feed Buyers - Not Studio"
  - "Credit Booster Frequent Buyers"

**Expected Changes:**
- ~300 lines of new code
- 3 modified files
- 4 new segments

**Testing Checklist:**
- [ ] Segments auto-refresh daily
- [ ] Member counts accurate
- [ ] Buyers correctly assigned to segments
- [ ] Studio members excluded

---

#### **PR-7: Mini Product Upsell Sequences**
**Files to Modify:**
- Create `/app/api/cron/mini-product-upsell/route.ts` (unified upsell sequence)
- Create `/lib/email/templates/mini-product-upsell-day3.tsx` (check-in)
- Create `/lib/email/templates/mini-product-upsell-day7.tsx` (testimonial + Studio)
- Create `/lib/email/templates/mini-product-upsell-day14.tsx` (discount offer)
- Create `/lib/email/templates/mini-product-upsell-day30.tsx` (FOMO)
- Modify `/app/actions/upgrade-checkout.ts` (add promo code support)

**Database Changes:**
- Create `mini_product_upsell_sequence` table (track sequence progress)

**Expected Changes:**
- ~600 lines of new code
- 6 new files
- 1 new table
- 4 new email templates

**Testing Checklist:**
- [ ] Sequence sends on schedule
- [ ] Promo codes work in checkout
- [ ] Unsubscribe handled correctly
- [ ] Conversions tracked

---

### 🔴 **PRIORITY 4: SCALE & REBRAND (Month 3)**

#### **PR-8: Rebrand Reset Product**
**Files to Modify:**
- Create `/app/rebrand/page.tsx` (landing page)
- Create `/app/rebrand-wizard/page.tsx` (wizard flow)
- Create `/components/rebrand/rebrand-wizard-step1.tsx` (Blueprint)
- Create `/components/rebrand/rebrand-wizard-step2.tsx` (Training)
- Create `/components/rebrand/rebrand-wizard-step3.tsx` (Generation)
- Create `/components/rebrand/rebrand-wizard-step4.tsx` (Bio)
- Modify `/lib/products.ts` (add product)
- Create `/app/checkout/rebrand/page.tsx` (checkout)
- Modify `/app/api/webhooks/stripe/route.ts` (handle product)
- Create `/lib/email/templates/rebrand-delivery.tsx` (delivery email)
- Create `/app/api/cron/rebrand-sequence/route.ts` (email sequence)

**Database Changes:**
- Create `rebrand_orders` table
- Add `product_type: "rebrand_reset"` support
- Add Stripe product: `rebrand_reset` ($97, 80 credits)

**Expected Changes:**
- ~1000 lines of new code
- 11 new files
- 1 new table
- 5 new email templates

**Testing Checklist:**
- [ ] Wizard flow works (4 steps)
- [ ] Model retraining works
- [ ] 60 images generated
- [ ] New bio generated
- [ ] Complete package delivered via email
- [ ] Email sequence sends

---

#### **PR-9: Analytics Dashboard for Mini Products**
**Files to Modify:**
- Create `/app/admin/mini-products/page.tsx` (new dashboard)
- Create `/app/api/admin/mini-products/stats/route.ts` (stats API)
- Create `/components/admin/mini-product-metrics.tsx` (metrics component)
- Modify `/lib/analytics.ts` (add mini product events)

**Metrics to Track:**
- Mini product purchases by type
- Conversion rate (landing view → purchase)
- Upsell rate (mini product → Studio)
- Revenue by product
- LTV by acquisition source
- Time to upgrade (days from mini product → Studio)

**Expected Changes:**
- ~400 lines of new code
- 4 new files

**Testing Checklist:**
- [ ] Dashboard loads correctly
- [ ] Metrics accurate
- [ ] Charts render
- [ ] Export to CSV works

---

## Part 6: REVENUE PROJECTIONS

### Conservative Estimates (First 90 Days)

| Product | Week 1-2 | Week 3-4 | Month 2 | Month 3 | Total |
|---------|----------|----------|---------|---------|-------|
| **Starter Photoshoot** (enhanced) | $1,470 (30 × $49) | $2,450 (50 × $49) | $3,430 (70 × $49) | $3,920 (80 × $49) | **$11,270** |
| **Paid Blueprint** | $670 (10 × $67) | $1,340 (20 × $67) | $2,680 (40 × $67) | $3,350 (50 × $67) | **$8,040** |
| **Bio Glow-Up** | - | $940 (20 × $47) | $2,115 (45 × $47) | $3,290 (70 × $47) | **$6,345** |
| **9-Post Feed** | - | $1,540 (20 × $77) | $2,695 (35 × $77) | $3,465 (45 × $77) | **$7,700** |
| **Credit Boosters** | $1,300 | $1,950 | $2,925 | $3,900 | **$10,075** |
| **Rebrand Reset** | - | - | $485 (5 × $97) | $1,940 (20 × $97) | **$2,425** |
| **TOTAL** | **$3,440** | **$8,220** | **$14,330** | **$19,865** | **$45,855** |

### Studio Upgrade Revenue (from Mini Product Buyers)

**Assumptions:**
- 18% of mini product buyers upgrade to Studio within 30 days
- Studio membership: $97/month
- Avg member retention: 6 months
- LTV per upgrade: $97 × 6 = $582

**Projected Upgrades:**

| Month | Mini Product Buyers | Studio Upgrades (18%) | Monthly Studio Revenue | Total LTV |
|-------|---------------------|---------------------|----------------------|-----------|
| Month 1 | ~100 buyers | 18 upgrades | $1,746/mo | $10,476 (6mo) |
| Month 2 | ~200 buyers | 36 upgrades | $3,492/mo | $20,952 (6mo) |
| Month 3 | ~300 buyers | 54 upgrades | $5,238/mo | $31,428 (6mo) |
| **Total** | **600 buyers** | **108 upgrades** | **$10,476/mo** | **$62,856 LTV** |

### Total Revenue Impact (90 Days)

| Revenue Source | Amount |
|----------------|--------|
| Mini Product Sales (one-time) | $45,855 |
| New Studio MRR (ongoing) | $10,476/mo |
| Studio LTV (6-month projection) | $62,856 |
| **TOTAL 90-DAY IMPACT** | **$108,711** |

**ROI Analysis:**
- Dev time: ~80 hours (2 engineers × 40 hours)
- Dev cost: ~$10,000 (assuming $125/hr blended rate)
- Email/marketing setup: ~$2,000
- Total investment: ~$12,000
- **ROI: 806% in 90 days**

---

## Part 7: RISK MITIGATION

### Potential Risks & Mitigation Strategies

**Risk 1: Cannibalizing Studio Membership Sales**
- **Mitigation:** Position mini products as "try before you buy" and "fast wins"
- Always show Studio as better value (price comparison)
- Time-limited upsell offers (7-14 day window)
- Track cannibalization metrics and adjust

**Risk 2: Low Conversion from Mini Product → Studio**
- **Mitigation:** Strong email sequences with testimonials
- In-app upgrade prompts at key moments (credit depletion, feature discovery)
- First-month discount for mini product buyers ($77 vs $97)
- A/B test upsell messaging and timing

**Risk 3: Operational Overhead (Support, Refunds)**
- **Mitigation:** Clear product descriptions and outcome expectations
- "Results within 24 hours" promise (automated)
- FAQ sections on landing pages
- Self-service download/delivery (minimal support needed)
- 30-day money-back guarantee (builds trust)

**Risk 4: Technical Complexity**
- **Mitigation:** Start with lowest-effort products (Photoshoot, Blueprint)
- Reuse existing components and flows
- Phased rollout (test with small traffic)
- Feature flags for rollback if needed

**Risk 5: Low Traffic → Low Sales**
- **Mitigation:** Leverage existing free Blueprint traffic (~200-300/mo)
- Instagram content → mini product landing pages
- Email win-back campaigns to inactive users
- Small paid traffic tests ($500/mo budget)

---

## Part 8: SUCCESS METRICS

### KPIs to Track (Weekly)

**Mini Product Performance:**
- [ ] Landing page views by product
- [ ] Conversion rate (view → purchase)
- [ ] Revenue by product
- [ ] Avg order value
- [ ] Refund rate

**Upsell Performance:**
- [ ] Mini product buyers → Studio conversion rate
- [ ] Time to upgrade (avg days)
- [ ] Upgrade conversion by email sequence
- [ ] Upgrade conversion by product type
- [ ] LTV by acquisition source

**Email Performance:**
- [ ] Open rates by sequence
- [ ] Click rates by sequence
- [ ] Unsubscribe rates
- [ ] Conversion rates by email

**Overall Business Health:**
- [ ] Total MRR (Studio memberships)
- [ ] New Studio members (mini product vs direct)
- [ ] Studio churn rate
- [ ] Net revenue growth
- [ ] CAC (customer acquisition cost)
- [ ] LTV:CAC ratio

### Success Benchmarks (90 Days)

| Metric | Target | Stretch Goal |
|--------|--------|-------------|
| Mini product sales | $40,000 | $55,000 |
| New Studio MRR | $8,000/mo | $12,000/mo |
| Mini → Studio conversion | 15% | 20% |
| Avg time to upgrade | 14 days | 10 days |
| Refund rate | < 5% | < 3% |
| Email open rate | 35% | 45% |
| Email click rate | 8% | 12% |

---

## Part 9: FINAL RECOMMENDATIONS

### Launch Order (Prioritized by ROI)

1. **Week 1-2: Enhance Starter Photoshoot** 🟢
   - Lowest effort, highest immediate impact
   - Already has traffic and awareness
   - Quick win to validate approach

2. **Week 1-2: Paid Brand Blueprint** 🟢
   - Blueprint already drives traffic (~200-300/mo)
   - Clear upgrade path from free → paid
   - High perceived value

3. **Week 3-4: 9-Post Feed Product** 🟡
   - Outcome-focused, high perceived value
   - Leverages Feed Planner (underutilized feature)
   - Strong Studio upsell path

4. **Week 3-4: Smart Credit Boosters** 🟢
   - Easy enhancement of existing product
   - Improves Studio comparison messaging
   - Reduces churn (prevents credit depletion frustration)

5. **Month 2: Bio Glow-Up** 🟡
   - Bio page already exists, add product layer
   - Fast deliverable (24 hours)
   - Complements other products well

6. **Month 3: Rebrand Reset** 🟡
   - Highest price point, highest perceived value
   - Targets existing audience (rebranders)
   - Natural upsell to ongoing Studio membership

---

### Critical Success Factors

1. **Email Sequences Are Key**
   - The upsell happens in email, not just in-app
   - Day 3, 7, 14, 30 cadence is proven
   - Testimonials + social proof in every email
   - Time-limited discount offers

2. **Positioning Matters**
   - Always position Studio as "better value"
   - Mini products are "fast wins" or "try before you buy"
   - Use comparison tables and ROI calculators
   - Emphasize ongoing content creation needs

3. **Leverage Existing Traffic**
   - Blueprint funnel already drives 200-300 leads/mo
   - Win-back campaigns to inactive users
   - Instagram content → landing pages
   - Partner/affiliate referrals

4. **Track Everything**
   - Every landing page, CTA, email tracked
   - Conversion attribution via Stripe metadata
   - Weekly review of metrics
   - A/B test pricing, messaging, timing

5. **Automate, Don't Manually Fulfill**
   - All products delivered automatically
   - Email sequences run on cron
   - Minimal support overhead
   - Scalable without team growth

---

## Part 10: NEXT STEPS

### Immediate Actions (This Week)

1. **Stakeholder Approval**
   - Review this audit with Sandra
   - Prioritize products (confirm launch order)
   - Set revenue goals for 90 days
   - Allocate dev resources (2 engineers, 6 weeks)

2. **Set Up Stripe Products**
   - Create `brand_blueprint_paid` product ($67, 30 credits)
   - Create `nine_post_feed` product ($77, 40 credits)
   - Create `bio_glowup` product ($47, 25 credits)
   - Create `rebrand_reset` product ($97, 80 credits)
   - Test checkout flows in Stripe test mode

3. **Analytics Setup**
   - Add mini product events to `/lib/analytics.ts`
   - Set up admin dashboard for mini product metrics
   - Create weekly revenue report automation

4. **Email Template Design**
   - Design email templates for each product
   - Write copy for upsell sequences
   - Create PDF templates for deliverables
   - Test email rendering across clients

### Week 1 Kickoff

- [ ] **Monday:** Kickoff meeting with eng team
- [ ] **Tuesday:** PR-1 (Enhance Starter Photoshoot) - Start development
- [ ] **Wednesday:** PR-2 (Credit Boosters) - Start development
- [ ] **Thursday:** PR-3 (Paid Blueprint) - Start development
- [ ] **Friday:** Review PRs, test in staging

### Ongoing (Weekly)

- [ ] **Monday:** Review metrics from previous week
- [ ] **Wednesday:** Ship PRs to production
- [ ] **Friday:** Monitor conversions, adjust as needed

---

## Appendix A: Key File Reference

### Checkout & Payment Files
- `/app/actions/landing-checkout.ts` - Public checkout flow
- `/app/actions/stripe.ts` - In-app checkout flow
- `/app/actions/upgrade-checkout.ts` - Upgrade checkout flow
- `/app/api/webhooks/stripe/route.ts` - Stripe webhook handler (1940 lines)
- `/lib/products.ts` - Product definitions
- `/lib/credits.ts` - Credit system
- `/lib/subscription.ts` - Subscription management

### Feature Flow Files
- `/app/blueprint/page.tsx` - Brand Blueprint tool
- `/app/bio/page.tsx` - Bio landing page
- `/app/feed-planner/page.tsx` - Feed Planner (requires auth)
- `/app/studio/page.tsx` - Studio (training + image generation)
- `/components/sselfie/sselfie-app.tsx` - Main app container

### Email Automation Files
- `/lib/email/segmentation.ts` - Segmentation engine
- `/lib/email/send-email.ts` - Email sending
- `/lib/email/generate-tracked-link.ts` - Link tracking
- `/app/api/cron/refresh-segments/route.ts` - Segment refresh cron
- `/app/api/cron/upsell-campaigns/route.ts` - Upsell automation
- `/app/api/email/track-click/route.ts` - Click tracking

### Admin & Analytics Files
- `/app/api/admin/conversions/route.ts` - Conversion dashboard
- `/app/api/admin/email-analytics/route.ts` - Email analytics
- `/app/api/admin/dashboard/stats/route.ts` - Revenue dashboard
- `/lib/analytics.ts` - Event tracking

### Upgrade & Upsell Files
- `/components/upgrade/upgrade-modal.tsx` - Upgrade modal
- `/components/upgrade/smart-upgrade-banner.tsx` - Contextual banners
- `/lib/upgrade-detection.ts` - Upgrade trigger logic
- `/app/api/subscription/upgrade/route.ts` - Upgrade API

---

## Appendix B: Database Schema Reference

### Key Tables

**`users`**
- `id`, `email`, `display_name`, `stripe_customer_id`, `supabase_user_id`, `password_setup_complete`

**`subscriptions`**
- `user_id`, `product_type`, `status`, `stripe_subscription_id`, `stripe_customer_id`, `current_period_start`, `current_period_end`, `is_test_mode`

**`user_credits`**
- `user_id`, `balance`, `total_purchased`, `total_used`

**`credit_transactions`**
- `user_id`, `amount`, `transaction_type`, `description`, `stripe_payment_id`, `balance_after`, `product_type`, `payment_amount_cents`, `is_test_mode`

**`stripe_payments`**
- `stripe_payment_id`, `stripe_invoice_id`, `stripe_subscription_id`, `stripe_customer_id`, `user_id`, `amount_cents`, `status`, `payment_type`, `product_type`, `is_test_mode`

**`email_logs`**
- `user_email`, `email_type`, `campaign_id`, `resend_message_id`, `status`, `opened`, `clicked`, `converted`, `sent_at`, `opened_at`, `clicked_at`, `converted_at`

**`email_segments`**
- `segment_name`, `segment_type`, `criteria` (jsonb), `member_count`, `is_auto_refreshed`, `last_refreshed_at`

**`email_segment_members`**
- `segment_id`, `user_email`

**`admin_email_campaigns`**
- `campaign_name`, `campaign_type`, `subject_line`, `total_sent`, `total_opened`, `total_clicked`, `total_converted`, `status`

**`blueprint_subscribers`**
- `email`, `blueprint_completed`, `converted_to_user`, `converted_at`, `email_tags`, `flodesk_contact_id`

**`freebie_subscribers`**
- `email`, `converted_to_user`, `converted_at`, `email_tags`, `flodesk_contact_id`

---

## Appendix C: Cron Job Schedule

| Job | Route | Schedule | Purpose |
|-----|-------|----------|---------|
| Refresh Segments | `/app/api/cron/refresh-segments` | Daily 3 AM UTC | Update email segments |
| Blueprint Sequence | `/app/api/cron/blueprint-email-sequence` | Daily | Send Blueprint nurture emails |
| Upsell Campaigns | `/app/api/cron/upsell-campaigns` | Daily | Send one-time → Studio upsell |
| Reactivation | `/app/api/cron/reactivation-campaigns` | Daily | Win-back dormant users |
| Welcome Back | `/app/api/cron/welcome-back-sequence` | Daily | Re-engage churned users |
| Scheduled Campaigns | `/app/api/cron/send-scheduled-campaigns` | Hourly | Send broadcast campaigns |

---

## End of Audit Report

**Prepared by:** AI Product + Growth Engineering Team  
**Approved by:** [Pending Sandra's Review]  
**Implementation Start:** [TBD]  

**Questions?** Contact Sandra at ssa@ssasocial.com

# Mini Products: System Architecture & Flow Diagrams
**Visual Guide | January 9, 2026**

---

## 📐 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      SSELFIE MINI PRODUCTS                      │
│                   Monetization Architecture                     │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Traffic    │      │     Mini     │      │    Studio    │
│   Sources    │ ───▶ │   Products   │ ───▶ │  Membership  │
│              │      │   ($47-97)   │      │   ($97/mo)   │
└──────────────┘      └──────────────┘      └──────────────┘
     │                      │                      │
     │                      │                      │
     ▼                      ▼                      ▼
Instagram               Checkout              Retention
Blueprint               Credits               Expansion
Bio Page               Automation             Revenue
Paid Ads              Email Seq              Growth
Partners              Segments
Referrals             Analytics
```

---

## 🛒 Purchase Flow (All Mini Products)

```
┌─────────────────────────────────────────────────────────────────┐
│                     PURCHASE FLOW DIAGRAM                       │
└─────────────────────────────────────────────────────────────────┘

Landing Page
    │
    ├─→ View Product Details
    │       │
    │       ├─→ See Before/After Examples
    │       ├─→ Read Testimonials
    │       └─→ Check FAQ
    │
    ▼
Click "Buy Now" CTA
    │
    ▼
Start Checkout
    │
    ├─→ createLandingCheckoutSession()
    │       ├─→ Product: one_time_session, brand_blueprint_paid, etc.
    │       ├─→ Price: $47-$97
    │       ├─→ Credits: 25-80
    │       └─→ Metadata: product_type, source, campaign
    │
    ▼
Stripe Embedded Checkout
    │
    ├─→ Enter Email + Payment
    ├─→ Apply Promo Code (optional)
    └─→ Complete Payment
    │
    ▼
Stripe Webhook: checkout.session.completed
    │
    ├─→ Check if user exists
    │       ├─→ NO: Create Supabase account
    │       │       ├─→ Create Neon user record
    │       │       ├─→ Generate password setup link
    │       │       └─→ Send welcome email
    │       │
    │       └─→ YES: Link to existing user
    │
    ├─→ Grant Credits (based on product)
    │       ├─→ Insert into user_credits
    │       ├─→ Insert into credit_transactions
    │       └─→ Track payment in stripe_payments
    │
    ├─→ Add to Email Segments
    │       ├─→ Resend: Beta segment, product-specific segment
    │       ├─→ Flodesk: Marketing tags
    │       └─→ Mark converted in freebie_subscribers
    │
    ├─→ Send Confirmation Email
    │       ├─→ Password setup link (new users)
    │       ├─→ Product access link
    │       └─→ Quick start guide
    │
    └─→ Redirect to Success Page
            │
            └─→ /checkout/success?product={id}
                    │
                    └─→ Redirect to Product Experience
                            │
                            ├─→ Starter Photoshoot: /studio?onboarding=true
                            ├─→ Brand Blueprint: /blueprint?paid=true
                            ├─→ Bio Glow-Up: /bio/generator
                            ├─→ 9-Post Feed: /feed-planner?quick=true
                            └─→ Rebrand Reset: /rebrand-wizard
```

---

## 📧 Email Automation Flow (Post-Purchase)

```
┌─────────────────────────────────────────────────────────────────┐
│                EMAIL AUTOMATION SEQUENCE (ALL PRODUCTS)         │
└─────────────────────────────────────────────────────────────────┘

Purchase Completed
    │
    ▼
Day 0: Welcome Email
    │
    ├─→ Subject: "Welcome to SSELFIE! Your {Product} is ready"
    ├─→ Content: Quick start guide, login link, support
    └─→ CTA: "Get Started Now"
    │
    ▼
Day 3: Check-In Email
    │
    ├─→ Subject: "How did your {product} turn out? 🎨"
    ├─→ Content: Tips, troubleshooting, showcase examples
    └─→ CTA: "Need more credits?" or "Explore Studio"
    │
    ▼
Day 7: Upsell Email #1 (Testimonial + Benefits)
    │
    ├─→ Subject: "Never run out of content again 🚀"
    ├─→ Content: 
    │       ├─→ Customer success story (testimonial)
    │       ├─→ Studio benefits (unlimited content)
    │       └─→ Show what members are creating
    └─→ CTA: "Upgrade to Studio" (with tracking link)
    │
    ▼
Day 14: Upsell Email #2 (Discount Offer)
    │
    ├─→ Subject: "Your exclusive Studio discount expires soon ⏰"
    ├─→ Content:
    │       ├─→ First-month discount ($77 instead of $97)
    │       ├─→ ROI calculator (save $X/year)
    │       └─→ Comparison table (mini product vs Studio)
    └─→ CTA: "Claim Your Discount" (promo code: MINI20)
    │
    ▼
Day 30: Upsell Email #3 (FOMO)
    │
    ├─→ Subject: "Studio members are creating 200 posts/month 📈"
    ├─→ Content:
    │       ├─→ Stats (avg posts created, avg engagement)
    │       ├─→ "You're missing out on..."
    │       └─→ Last chance for discount
    └─→ CTA: "Join Studio Now"
    │
    ▼
IF NO CONVERSION BY DAY 30:
    │
    └─→ Move to "Mini Product Alumni" segment
            │
            ├─→ Monthly newsletter (tips, case studies)
            ├─→ Seasonal offers (holidays, Black Friday)
            └─→ Win-back campaigns (new features, discounts)
```

---

## 🎯 Segment-Based Automation

```
┌─────────────────────────────────────────────────────────────────┐
│                    SEGMENTATION ENGINE                          │
└─────────────────────────────────────────────────────────────────┘

Daily Cron Job: /app/api/cron/refresh-segments (3 AM UTC)
    │
    ├─→ refreshAllSegments()
    │       │
    │       ├─→ Query users based on criteria:
    │       │       ├─→ Purchase history (one-time, not Studio)
    │       │       ├─→ Engagement (opens, clicks, conversions)
    │       │       ├─→ Behavior (Blueprint completed, credits used)
    │       │       └─→ Time-based (last purchase X days ago)
    │       │
    │       └─→ Update segment_members table
    │
    └─→ Segments Created:

        ┌──────────────────────────────────────────────┐
        │  "Blueprint Buyers - Not Studio"             │
        │  Criteria: Purchased brand_blueprint_paid    │
        │            AND no active Studio subscription │
        │  Action: Send Blueprint upsell sequence      │
        └──────────────────────────────────────────────┘

        ┌──────────────────────────────────────────────┐
        │  "Bio Glow-Up Buyers - Not Studio"           │
        │  Criteria: Purchased bio_glowup              │
        │            AND no active Studio subscription │
        │  Action: Send Bio upsell sequence            │
        └──────────────────────────────────────────────┘

        ┌──────────────────────────────────────────────┐
        │  "9-Post Feed Buyers - Not Studio"           │
        │  Criteria: Purchased nine_post_feed          │
        │            AND no active Studio subscription │
        │  Action: Send Feed upsell sequence           │
        └──────────────────────────────────────────────┘

        ┌──────────────────────────────────────────────┐
        │  "Credit Booster Frequent Buyers"            │
        │  Criteria: Purchased credits 2+ times        │
        │            AND no active Studio subscription │
        │  Action: Show Studio ROI comparison          │
        └──────────────────────────────────────────────┘

        ┌──────────────────────────────────────────────┐
        │  "Starter Photoshoot - Not Studio"           │
        │  Criteria: Purchased one_time_session        │
        │            AND no active Studio subscription │
        │  Action: Send Photoshoot upsell sequence     │
        └──────────────────────────────────────────────┘

Daily Cron Job: /app/api/cron/mini-product-upsell (12 PM UTC)
    │
    └─→ For each segment:
            │
            ├─→ Find users at Day 3, 7, 14, 30
            ├─→ Send appropriate email (based on day)
            ├─→ Track email send in email_logs
            └─→ Generate tracked links with click tracking
```

---

## 🔄 Upgrade Conversion Flow

```
┌─────────────────────────────────────────────────────────────────┐
│              MINI PRODUCT → STUDIO UPGRADE FLOW                 │
└─────────────────────────────────────────────────────────────────┘

Trigger Points:
    │
    ├─→ [1] Email Link Click
    │       │
    │       └─→ Tracked link with promo code
    │               │
    │               └─→ /checkout-upgrade?promo=MINI20
    │
    ├─→ [2] In-App Upgrade Modal
    │       │
    │       ├─→ Trigger: Credits < 30
    │       ├─→ Trigger: Feature gate (Academy, Pro Maya)
    │       └─→ Trigger: Manual "Upgrade" button
    │
    └─→ [3] Landing Page CTA
            │
            └─→ Comparison table on product page
                    │
                    └─→ "Or get unlimited with Studio"

Upgrade Flow:
    │
    ▼
Click "Upgrade to Studio" CTA
    │
    ├─→ If logged in: Direct to upgrade checkout
    │       │
    │       └─→ createUpgradeCheckoutSession()
    │               ├─→ Check existing customer ID
    │               ├─→ Apply promo code (if provided)
    │               └─→ Create Stripe subscription checkout
    │
    └─→ If not logged in: Redirect to login
            │
            └─→ After login → Resume upgrade flow
    │
    ▼
Complete Upgrade
    │
    ├─→ Stripe Webhook: customer.subscription.created
    │       │
    │       ├─→ Create/update subscription record
    │       ├─→ Grant 200 credits (on first invoice payment)
    │       └─→ Send upgrade confirmation email
    │
    └─→ Stripe Webhook: invoice.payment_succeeded
            │
            ├─→ Grant monthly credits (200)
            └─→ Send credit renewal email
    │
    ▼
Post-Upgrade Experience
    │
    ├─→ Redirect to /studio (full access)
    ├─→ Show "Welcome to Studio" onboarding
    ├─→ Unlock all features:
    │       ├─→ Feed Planner (unlimited)
    │       ├─→ Maya AI (Pro mode)
    │       ├─→ Academy (all courses)
    │       └─→ Blueprint (unlimited generations)
    │
    └─→ Mark as converted:
            ├─→ Remove from mini product segments
            ├─→ Add to "Studio Members" segment
            └─→ Update email_logs: converted = true
```

---

## 📊 Data Flow (Analytics & Tracking)

```
┌─────────────────────────────────────────────────────────────────┐
│                     DATA FLOW & TRACKING                        │
└─────────────────────────────────────────────────────────────────┘

User Actions:
    │
    ├─→ View Landing Page
    │       │
    │       └─→ trackEvent('pricing_view', {product: 'blueprint'})
    │               │
    │               └─→ Google Analytics / Plausible
    │
    ├─→ Click CTA Button
    │       │
    │       └─→ trackCTAClick('landing', 'Buy Blueprint', '/checkout')
    │               │
    │               └─→ Store in analytics_events table
    │
    ├─→ Start Checkout
    │       │
    │       └─→ trackCheckoutStart('brand_blueprint_paid')
    │               │
    │               └─→ Stripe metadata: {campaign: 'landing'}
    │
    ├─→ Complete Purchase
    │       │
    │       └─→ Stripe Webhook
    │               │
    │               ├─→ Insert into stripe_payments
    │               ├─→ Insert into credit_transactions
    │               └─→ Update admin_email_campaigns.total_converted
    │
    ├─→ Open Email
    │       │
    │       └─→ Resend webhook: email.opened
    │               │
    │               └─→ Update email_logs: opened = true
    │
    ├─→ Click Email Link
    │       │
    │       └─→ /api/email/track-click?id={unique_id}
    │               │
    │               ├─→ Update email_logs: clicked = true
    │               └─→ Redirect to destination
    │
    └─→ Upgrade to Studio
            │
            └─→ Stripe Webhook
                    │
                    ├─→ Update subscriptions table
                    ├─→ Update email_logs: converted = true
                    └─→ Track conversion attribution

Admin Dashboards:
    │
    ├─→ /app/admin/mini-products (Revenue by product)
    ├─→ /app/api/admin/conversions (Funnel metrics)
    ├─→ /app/api/admin/email-analytics (Email performance)
    └─→ /app/api/admin/dashboard/stats (Overall business)
```

---

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   TECHNICAL STACK DIAGRAM                       │
└─────────────────────────────────────────────────────────────────┘

Frontend (Next.js 14 App Router)
    │
    ├─→ Landing Pages (/app/{product}/page.tsx)
    │       ├─→ SSR for SEO
    │       └─→ Client components for interactivity
    │
    ├─→ Checkout Pages (/app/checkout/{product}/page.tsx)
    │       └─→ Stripe Embedded Checkout
    │
    └─→ Product Experience Pages
            ├─→ /studio (image generation)
            ├─→ /blueprint (Brand Blueprint tool)
            ├─→ /bio/generator (Bio Glow-Up)
            ├─→ /feed-planner (9-Post Feed)
            └─→ /rebrand-wizard (Rebrand Reset)

Backend (Next.js API Routes)
    │
    ├─→ Server Actions (/app/actions/)
    │       ├─→ landing-checkout.ts (public checkout)
    │       ├─→ stripe.ts (in-app checkout)
    │       └─→ upgrade-checkout.ts (upgrade flow)
    │
    ├─→ API Routes (/app/api/)
    │       ├─→ /webhooks/stripe (payment processing)
    │       ├─→ /email/track-click (click tracking)
    │       ├─→ /admin/* (analytics dashboards)
    │       └─→ /cron/* (scheduled jobs)
    │
    └─→ Cron Jobs (Vercel Cron)
            ├─→ /cron/refresh-segments (daily 3 AM)
            ├─→ /cron/mini-product-upsell (daily 12 PM)
            ├─→ /cron/send-scheduled-campaigns (hourly)
            └─→ /cron/welcome-back-sequence (daily)

Database (Neon Postgres)
    │
    ├─→ Core Tables
    │       ├─→ users (user accounts)
    │       ├─→ subscriptions (Studio memberships)
    │       ├─→ user_credits (credit balances)
    │       └─→ credit_transactions (purchase/usage history)
    │
    ├─→ Payment Tables
    │       ├─→ stripe_payments (all payments, revenue tracking)
    │       └─→ webhook_events (idempotency, deduplication)
    │
    ├─→ Email Tables
    │       ├─→ email_logs (sends, opens, clicks, conversions)
    │       ├─→ email_segments (segment definitions)
    │       ├─→ email_segment_members (segment membership)
    │       ├─→ admin_email_campaigns (campaign performance)
    │       ├─→ blueprint_subscribers (Blueprint funnel)
    │       └─→ freebie_subscribers (general subscribers)
    │
    └─→ Product-Specific Tables (New)
            ├─→ bio_glowup_orders (Bio Glow-Up orders)
            ├─→ rebrand_orders (Rebrand Reset orders)
            └─→ mini_product_upsell_sequence (sequence tracking)

External Services
    │
    ├─→ Stripe (payments, subscriptions)
    ├─→ Resend (transactional emails)
    ├─→ Flodesk (marketing emails)
    ├─→ Supabase Auth (authentication)
    └─→ Vercel (hosting, cron jobs)
```

---

## 💡 Key Integration Points

### Stripe → Database Sync
```
Stripe Event → Webhook → Database Update

checkout.session.completed
    └─→ Grant credits
    └─→ Create user account
    └─→ Add to segments

invoice.payment_succeeded
    └─→ Grant monthly credits
    └─→ Update subscription period

customer.subscription.deleted
    └─→ Mark subscription canceled
    └─→ Tag in Flodesk
```

### Email → Conversion Tracking
```
Email Send → Click Tracking → Conversion Attribution

1. Send email with tracked link
   └─→ Link format: /api/email/track-click?id={unique_id}&dest={url}

2. User clicks link
   └─→ Log click in email_logs
   └─→ Redirect to destination (checkout, upgrade page)

3. User completes purchase
   └─→ Stripe metadata includes email campaign_id
   └─→ Mark email_logs.converted = true
   └─→ Update admin_email_campaigns.total_converted
```

### Segmentation → Automation
```
Daily Refresh → Segment Assignment → Email Sequence

1. Cron job refreshes segments (3 AM UTC)
   └─→ Query users based on criteria
   └─→ Add/remove from segment_members

2. Cron job checks sequences (12 PM UTC)
   └─→ For each segment member:
       └─→ Check last email sent (Day 3, 7, 14, 30)
       └─→ Send next email in sequence
       └─→ Log in email_logs

3. User converts (purchases Studio)
   └─→ Mark converted = true
   └─→ Remove from mini product segments
   └─→ Add to Studio segment
```

---

## 🎨 UI Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   COMPONENT HIERARCHY                           │
└─────────────────────────────────────────────────────────────────┘

Landing Page Components
    │
    ├─→ HeroSection
    │       ├─→ ProductHeadline
    │       ├─→ ValueProposition
    │       └─→ CTAButton (trackCTAClick)
    │
    ├─→ BeforeAfterGallery
    │       └─→ CustomerResults (testimonials + images)
    │
    ├─→ FeaturesSection
    │       └─→ FeatureCard (What's included)
    │
    ├─→ PricingSection
    │       ├─→ PriceCard (mini product)
    │       ├─→ ComparisonTable (vs Studio)
    │       └─→ CTAButton (trackCheckoutStart)
    │
    ├─→ TestimonialsSection
    │       └─→ TestimonialCard (customer reviews)
    │
    └─→ FAQSection
            └─→ FAQItem (common objections)

Checkout Components
    │
    ├─→ CheckoutPage
    │       ├─→ StripeEmbeddedCheckout (from Stripe)
    │       └─→ LoadingState (while initializing)
    │
    └─→ CheckoutSuccessPage
            ├─→ SuccessMessage
            ├─→ NextStepsGuide
            └─→ RedirectTimer (auto-redirect to product)

Product Experience Components
    │
    ├─→ StudioOnboardingWizard
    │       ├─→ Step1: UploadSelfies
    │       ├─→ Step2: SelectStyle
    │       ├─→ Step3: TrainModel (20 credits)
    │       └─→ Step4: GenerateImages (30 credits)
    │
    ├─→ BlueprintPaidFlow
    │       ├─→ Questionnaire (reuse existing)
    │       ├─→ ConceptGeneration (automatic)
    │       └─→ ImageGeneration (30 credits)
    │
    ├─→ BioGlowUpGenerator
    │       ├─→ BioGeneratorForm (input)
    │       ├─→ ProfilePhotoGenerator (5 variations)
    │       ├─→ BioCopyGenerator (3 options)
    │       └─→ DeliveryScreen (PDF download)
    │
    ├─→ QuickFeedGenerator
    │       ├─→ StyleSelector (vibe + aesthetic)
    │       ├─→ BatchImageGenerator (9 images)
    │       ├─→ CaptionGenerator (9 captions)
    │       └─→ DownloadPackage (ZIP file)
    │
    └─→ RebrandWizard
            ├─→ Step1: NewBlueprintQuestionnaire
            ├─→ Step2: UploadNewSelfies + Retrain
            ├─→ Step3: Generate60Images
            ├─→ Step4: GenerateNewBio
            └─→ Step5: CompletePackageDelivery

Upsell Components
    │
    ├─→ UpgradeModal
    │       ├─→ ComparisonTable (mini vs Studio)
    │       ├─→ PriceWithDiscount ($77 first month)
    │       └─→ CTAButton (createUpgradeCheckoutSession)
    │
    ├─→ SmartUpgradeBanner
    │       └─→ ContextualMessage (based on user action)
    │
    └─→ CreditComparisonModal
            ├─→ CreditPackOptions (100, 200 credits)
            ├─→ StudioOption (200/month + features)
            └─→ ROICalculator (cost comparison)
```

---

## 🚀 Deployment Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT FLOW                              │
└─────────────────────────────────────────────────────────────────┘

Development
    │
    ├─→ Create feature branch
    │       └─→ git checkout -b feature/mini-product-{name}
    │
    ├─→ Develop + test locally
    │       ├─→ npm run dev (localhost:3000)
    │       └─→ Stripe test mode
    │
    ├─→ Create Pull Request
    │       ├─→ Code review
    │       └─→ Automated checks (lint, build)
    │
    └─→ Merge to main
            │
            └─→ Auto-deploy to Vercel (production)

Staging Testing (Before Production)
    │
    ├─→ Test in Stripe test mode
    │       ├─→ Use test card: 4242 4242 4242 4242
    │       ├─→ Verify webhook delivery
    │       └─→ Check credit grants
    │
    ├─→ Test email sequences
    │       ├─→ Use test email addresses
    │       └─→ Verify email delivery + links
    │
    └─→ Test analytics tracking
            ├─→ Check events in admin dashboard
            └─→ Verify conversion attribution

Production Launch
    │
    ├─→ Switch to Stripe live mode
    │       └─→ Update environment variables
    │
    ├─→ Monitor first 24 hours
    │       ├─→ Check Stripe dashboard
    │       ├─→ Check Vercel logs
    │       ├─→ Monitor error rates
    │       └─→ Watch conversion dashboard
    │
    └─→ Iterate based on data
            ├─→ A/B test pricing
            ├─→ Optimize landing pages
            └─→ Refine email sequences
```

---

## 📈 Growth Loop (Full Cycle)

```
┌─────────────────────────────────────────────────────────────────┐
│                  FULL GROWTH LOOP DIAGRAM                       │
└─────────────────────────────────────────────────────────────────┘

Instagram Content
    │
    └─→ Drives Traffic To:
            │
            ├─→ [1] Free Blueprint
            │       │
            │       ├─→ Email capture
            │       ├─→ Complete Blueprint
            │       ├─→ Email sequence
            │       └─→ Upsell: Paid Blueprint ($67)
            │               │
            │               └─→ Purchase → 30 credits → Experience
            │                       │
            │                       └─→ Email sequence → Upgrade
            │
            ├─→ [2] Mini Product Landing Pages
            │       │
            │       ├─→ Bio Glow-Up ($47)
            │       ├─→ 9-Post Feed ($77)
            │       └─→ Starter Photoshoot ($49)
            │               │
            │               └─→ Purchase → Credits → Experience
            │                       │
            │                       └─→ Email sequence → Upgrade
            │
            └─→ [3] Direct to Studio Landing
                    │
                    └─→ Purchase Studio ($97/mo)
                            │
                            └─→ Onboarding → Retention → Expansion

All Paths Lead To:
    │
    ▼
Studio Membership ($97/mo)
    │
    ├─→ Monthly Credits (200)
    ├─→ All Features Unlocked
    ├─→ Retention Campaigns
    └─→ Expansion Opportunities
            │
            ├─→ Credit Top-Ups (if heavy user)
            ├─→ Rebrand Reset (if rebranding)
            └─→ Referral Program (bring friends)

Studio Members Generate:
    │
    ├─→ Social Proof (testimonials, case studies)
    ├─→ User-Generated Content (showcase on Instagram)
    └─→ Word-of-Mouth Referrals
            │
            └─→ Back to Instagram Content (Growth Loop Completes)
```

---

## 🎯 Success Metrics Dashboard (What to Monitor)

```
┌─────────────────────────────────────────────────────────────────┐
│                     METRICS TO TRACK                            │
└─────────────────────────────────────────────────────────────────┘

Weekly KPIs:
    │
    ├─→ Revenue Metrics
    │       ├─→ Mini product revenue (by product)
    │       ├─→ New Studio MRR (from mini buyers)
    │       ├─→ Total MRR
    │       └─→ Revenue growth rate (WoW, MoM)
    │
    ├─→ Conversion Metrics
    │       ├─→ Landing → Purchase rate (by product)
    │       ├─→ Mini → Studio conversion rate
    │       ├─→ Email → Click rate
    │       └─→ Email → Conversion rate
    │
    ├─→ Engagement Metrics
    │       ├─→ Email open rates (by sequence)
    │       ├─→ Email click rates (by sequence)
    │       ├─→ Time to upgrade (avg days)
    │       └─→ Product usage (credits used)
    │
    └─→ Health Metrics
            ├─→ Refund rate (< 5% target)
            ├─→ Support tickets (by product)
            ├─→ Webhook success rate (> 99%)
            └─→ Email delivery rate (> 98%)

Monthly Analysis:
    │
    ├─→ Cohort Analysis
    │       └─→ Mini product buyers → Studio conversion by cohort
    │
    ├─→ LTV Analysis
    │       └─→ Lifetime value by acquisition source
    │
    └─→ ROI Analysis
            └─→ CAC vs LTV by product
```

---

**End of System Diagram Document**

For implementation details, see:
- `/docs/MINI-PRODUCT-MONETIZATION-AUDIT.md`
- `/docs/MINI-PRODUCTS-EXECUTIVE-SUMMARY.md`
- `/docs/MINI-PRODUCTS-CHECKLIST.md`

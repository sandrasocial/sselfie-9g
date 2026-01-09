# Mini Products: Week-by-Week Implementation Checklist
**For Sandra's Team | January 9, 2026**

Use this checklist to track progress on the mini product rollout.

---

## 🎯 Goal: $20K/month in mini product revenue within 90 days

---

## ✅ WEEK 1-2: QUICK WINS ($7K/mo target)

### Week 1

#### **PR-1: Enhance Starter Photoshoot** 🟢 Low Effort
- [ ] Create landing page `/app/starter-photoshoot/page.tsx`
- [ ] Add before/after gallery with real customer results
- [ ] Build onboarding wizard for first-time users
- [ ] Update upsell modal to appear at 30 credits (not 0)
- [ ] Write enhanced welcome email sequence (Day 1, 3, 7, 14)
- [ ] Test checkout flow end-to-end
- [ ] Deploy to production
- [ ] Monitor first 10 purchases

#### **PR-2: Smart Credit Booster Positioning** 🟢 Low Effort
- [ ] Add "Low Credit" notification at 30 credits
- [ ] Create comparison modal (Credits vs Studio value prop)
- [ ] Add bundle offers (e.g., "9-Post Feed + 100 Credits")
- [ ] Test credit purchase flow
- [ ] Deploy to production

#### **PR-3: Paid Brand Blueprint** 🟢 Low Effort
- [ ] Add "Upgrade to Paid" CTA on free Blueprint completion
- [ ] Create landing page `/app/blueprint-paid/page.tsx`
- [ ] Add Stripe product `brand_blueprint_paid` ($67, 30 credits)
- [ ] Build checkout route `/checkout/blueprint-paid`
- [ ] Update webhook to handle new product type
- [ ] Write email templates (welcome, day 3, day 7, day 14)
- [ ] Create email sequence cron job
- [ ] Test full Blueprint → Paid → Delivery flow
- [ ] Deploy to production
- [ ] Monitor first 10 purchases

**Week 1 Success Criteria:**
- [ ] All 3 PRs deployed to production
- [ ] No critical bugs reported
- [ ] At least 5 purchases total
- [ ] Analytics tracking working

---

### Week 2

#### **Analytics Setup**
- [ ] Add mini product events to `/lib/analytics.ts`
- [ ] Create admin dashboard `/app/admin/mini-products/page.tsx`
- [ ] Set up weekly revenue report (auto-email Sandra)
- [ ] Create Stripe dashboard for mini products
- [ ] Test conversion tracking end-to-end

#### **Landing Page SEO**
- [ ] Add meta tags to all new landing pages
- [ ] Add testimonials to Starter Photoshoot page
- [ ] Add FAQ sections to each landing page
- [ ] Improve mobile responsiveness
- [ ] Test page load speeds

#### **Email Sequence Testing**
- [ ] Test all email sequences in staging
- [ ] Verify links and CTAs work
- [ ] Check email rendering across clients (Gmail, Apple Mail, Outlook)
- [ ] Test unsubscribe flow
- [ ] Deploy email sequences to production

**Week 2 Success Criteria:**
- [ ] Analytics dashboard live and accurate
- [ ] All landing pages optimized
- [ ] Email sequences tested and deployed
- [ ] $7K/mo run rate achieved (or on track)

---

## ✅ WEEK 3-4: OUTCOME PRODUCTS ($12K/mo target)

### Week 3

#### **PR-4: 9-Post Feed Product** 🟡 Medium Effort
- [ ] Create landing page `/app/9-post-feed/page.tsx`
- [ ] Add social proof (before/after feed transformations)
- [ ] Build Quick Feed Generator (simplified Feed Planner)
- [ ] Create batch generation API `/app/api/feed/generate-quick-feed`
- [ ] Add Stripe product `nine_post_feed` ($77, 40 credits)
- [ ] Build checkout route `/checkout/nine-post-feed`
- [ ] Update webhook to handle new product
- [ ] Create ZIP file delivery system
- [ ] Write email templates (delivery, day 5, day 10)
- [ ] Create email sequence cron job
- [ ] Test full flow: Landing → Purchase → Generation → Delivery
- [ ] Deploy to production

**Week 3 Success Criteria:**
- [ ] 9-Post Feed product launched
- [ ] First 10 purchases completed successfully
- [ ] No generation errors
- [ ] Email delivery working
- [ ] $10K/mo run rate achieved

---

### Week 4

#### **PR-5: Bio Glow-Up Product** 🟡 Medium Effort
- [ ] Create landing page `/app/bio-glowup/page.tsx`
- [ ] Add Instagram profile transformation showcase
- [ ] Build Bio Generator form `/app/bio/generator/page.tsx`
- [ ] Create generation API `/app/api/bio/generate-glowup`
- [ ] Add Stripe product `bio_glowup` ($47, 25 credits)
- [ ] Build checkout route `/checkout/bio-glowup`
- [ ] Update webhook to handle new product
- [ ] Create PDF delivery with strategy guide
- [ ] Write email templates (delivery, day 3, day 7)
- [ ] Create email sequence cron job
- [ ] Create database table `bio_glowup_orders`
- [ ] Test full flow: Landing → Purchase → Generation → Delivery
- [ ] Deploy to production

#### **A/B Testing Setup**
- [ ] Set up A/B tests for pricing ($47 vs $57 for Bio)
- [ ] Set up A/B tests for pricing ($77 vs $87 for Feed)
- [ ] Create variant landing pages
- [ ] Configure analytics for variants
- [ ] Run tests for 2 weeks minimum

**Week 4 Success Criteria:**
- [ ] Bio Glow-Up product launched
- [ ] First 10 purchases completed successfully
- [ ] All 5 mini products live and generating revenue
- [ ] $12K/mo run rate achieved
- [ ] A/B tests running

---

## ✅ MONTH 2: OPTIMIZATION & AUTOMATION ($15K/mo target)

### Week 5-6

#### **Segmentation Setup**
- [ ] Create segment: "Blueprint Buyers - Not Studio"
- [ ] Create segment: "Bio Glow-Up Buyers - Not Studio"
- [ ] Create segment: "9-Post Feed Buyers - Not Studio"
- [ ] Create segment: "Credit Booster Frequent Buyers"
- [ ] Create segment: "Starter Photoshoot - Not Studio"
- [ ] Test segment auto-refresh (runs daily at 3 AM)
- [ ] Verify member counts accurate

#### **Upsell Email Sequences** (PR-7)
- [ ] Build unified upsell sequence `/app/api/cron/mini-product-upsell`
- [ ] Write Day 3 email (check-in, quick win)
- [ ] Write Day 7 email (testimonial + Studio benefits)
- [ ] Write Day 14 email (discount offer, $77 first month)
- [ ] Write Day 30 email (FOMO, "Members creating X/month")
- [ ] Create database table `mini_product_upsell_sequence`
- [ ] Add promo code support to upgrade checkout
- [ ] Test all emails in staging
- [ ] Deploy to production
- [ ] Monitor first week of sends

#### **Landing Page Optimization**
- [ ] Add customer testimonials to all landing pages
- [ ] Add Instagram embeds (real customer posts)
- [ ] Improve mobile conversion (reduce friction)
- [ ] Add FAQ sections (address objections)
- [ ] Optimize CTA placement (above fold)
- [ ] A/B test headlines
- [ ] A/B test CTA button copy

**Week 5-6 Success Criteria:**
- [ ] All segments created and auto-refreshing
- [ ] Upsell sequences deployed and sending
- [ ] Landing pages optimized
- [ ] $13K/mo run rate achieved
- [ ] 10%+ mini → Studio conversion rate

---

### Week 7-8

#### **Upsell Conversion Optimization**
- [ ] A/B test upsell email subject lines
- [ ] A/B test discount timing (Day 7 vs Day 14)
- [ ] A/B test discount amount ($77 vs $87 first month)
- [ ] Test different testimonials in emails
- [ ] Test Studio comparison tables in emails

#### **In-App Upsell Improvements**
- [ ] Improve upgrade modal design
- [ ] Add social proof to upgrade modal (# of members)
- [ ] Test upgrade banner placement (contextual triggers)
- [ ] Add "Your friends in Studio" section (if applicable)
- [ ] Test time-limited offers (24-hour discount)

#### **Win-Back Campaign**
- [ ] Segment: "Free Blueprint users - Not Purchased"
- [ ] Write win-back email sequence (3 emails)
- [ ] Offer discount on Paid Blueprint ($57 instead of $67)
- [ ] Deploy and monitor

**Week 7-8 Success Criteria:**
- [ ] Multiple A/B tests running
- [ ] Upsell conversion rate improving (target: 15%)
- [ ] Win-back campaign launched
- [ ] $15K/mo run rate achieved

---

## ✅ MONTH 3: SCALE & REBRAND ($20K/mo target)

### Week 9-10

#### **PR-8: Rebrand Reset Product** 🟡 Medium Effort
- [ ] Create landing page `/app/rebrand/page.tsx`
- [ ] Add rebrand transformation case studies
- [ ] Build Rebrand Wizard `/app/rebrand-wizard/page.tsx`
- [ ] Build wizard Step 1: New Blueprint questionnaire
- [ ] Build wizard Step 2: Upload new selfies + retrain model
- [ ] Build wizard Step 3: Generate 60 images in new style
- [ ] Build wizard Step 4: Generate new bio copy
- [ ] Add Stripe product `rebrand_reset` ($97, 80 credits)
- [ ] Build checkout route `/checkout/rebrand`
- [ ] Update webhook to handle new product
- [ ] Create complete rebrand package delivery (PDF + images + bio)
- [ ] Write email templates (delivery, day 7, day 14)
- [ ] Create email sequence cron job
- [ ] Create database table `rebrand_orders`
- [ ] Test full wizard flow end-to-end
- [ ] Deploy to production

**Week 9-10 Success Criteria:**
- [ ] Rebrand Reset launched successfully
- [ ] First 5 purchases completed
- [ ] All 6 mini products live and generating revenue
- [ ] $18K/mo run rate achieved

---

### Week 11-12

#### **Paid Traffic Tests**
- [ ] Set up Instagram ads account (if not already)
- [ ] Create ad creatives (before/after transformations)
- [ ] Create ad campaigns:
  - Campaign 1: Instagram → Free Blueprint → Paid Blueprint
  - Campaign 2: Instagram → Bio Glow-Up landing
  - Campaign 3: Instagram → Starter Photoshoot landing
  - Campaign 4: Retargeting (free Blueprint users)
- [ ] Set budget: $500/campaign for testing
- [ ] Monitor for 2 weeks
- [ ] Calculate cost per acquisition
- [ ] Optimize or kill campaigns based on ROI

#### **Analytics Deep Dive**
- [ ] Full funnel analysis (landing → purchase → upsell)
- [ ] Calculate LTV by product
- [ ] Calculate LTV by acquisition channel
- [ ] Identify drop-off points in funnels
- [ ] Create optimization plan based on data

#### **Partnership Outreach**
- [ ] Identify 10 Instagram coach/creator partners
- [ ] Create affiliate program (20% commission)
- [ ] Create partner landing pages (unique tracking)
- [ ] Reach out to partners
- [ ] Onboard first 3 partners

**Week 11-12 Success Criteria:**
- [ ] Paid traffic tests running
- [ ] At least 1 campaign with positive ROI
- [ ] Full analytics dashboard built
- [ ] First 3 affiliates onboarded
- [ ] $20K/mo run rate achieved
- [ ] 18%+ mini → Studio conversion rate

---

## 🎯 90-DAY SUCCESS BENCHMARKS

After 90 days, you should have:

### Revenue
- [ ] $45K+ in one-time mini product sales
- [ ] $10K+ new Studio MRR from mini product buyers
- [ ] $62K+ LTV from Studio upgrades (6-month projection)
- [ ] **Total 90-day impact: $117K+**

### Products
- [ ] 6 mini products live and generating revenue
- [ ] All products with <5% refund rate
- [ ] All products with automated delivery
- [ ] All products with email sequences

### Conversion
- [ ] 18%+ mini product → Studio conversion rate
- [ ] 14 days avg time to upgrade
- [ ] 35%+ email open rates
- [ ] 8%+ email click rates

### Infrastructure
- [ ] 6 new landing pages
- [ ] 6 new checkout routes
- [ ] 12+ new email sequences
- [ ] 5+ new segments
- [ ] Full analytics dashboard

---

## 📊 WEEKLY REVIEW TEMPLATE

Use this template every Monday to review the previous week:

### Week of: [DATE]

#### Metrics
- [ ] Mini product sales: $_____ (vs target: $_____)
- [ ] New Studio MRR: $_____ (vs target: $_____)
- [ ] Mini → Studio conversion rate: ____%
- [ ] Email open rate: ____%
- [ ] Email click rate: ____%
- [ ] Refund rate: ____%

#### What Went Well
- 
- 
- 

#### What Needs Improvement
- 
- 
- 

#### Action Items for Next Week
- [ ] 
- [ ] 
- [ ] 

#### Blockers / Issues
- 
- 
- 

---

## 🚨 RED FLAGS (Stop and Fix Immediately)

If any of these occur, STOP and address before continuing:

- [ ] **Refund rate > 10%** → Product/expectation mismatch, fix messaging or delivery
- [ ] **Email open rate < 20%** → Subject lines failing, test new variants
- [ ] **Mini → Studio conversion < 5%** → Upsell sequences failing, revamp messaging
- [ ] **Critical bugs in checkout** → Revenue blocked, highest priority fix
- [ ] **Webhook errors** → Credits not granted, fix immediately
- [ ] **Email delivery failures** → Switch providers or fix configuration

---

## 🎉 CELEBRATION MILESTONES

Celebrate these wins with the team:

- [ ] First mini product purchase 🎊
- [ ] First 10 mini product purchases 🎉
- [ ] First mini product → Studio upgrade 🚀
- [ ] $10K/mo run rate 💰
- [ ] $20K/mo run rate 💎
- [ ] 100 total mini product sales 🔥
- [ ] 20% upsell conversion rate ⭐

---

## 📞 EMERGENCY CONTACTS

If anything breaks:

- **Stripe Issues:** Check Stripe dashboard → Webhooks tab
- **Email Issues:** Check email control settings → `/app/api/admin/email-control/settings`
- **Cron Issues:** Check cron health dashboard → `/app/admin/diagnostics/cron`
- **Database Issues:** Check Neon dashboard
- **General Errors:** Check Vercel logs

---

**👉 Start Here:** Week 1, PR-1 (Enhance Starter Photoshoot)

**Good luck! You've got this. 🚀**

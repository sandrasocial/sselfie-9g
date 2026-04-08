# BRAND ENGINE OFFER — Locked 18 Feb 2026
## Version 2.0 — Rebuilt from Sandra's vision
## Status: LOCKED · Open for minor tweaks only
## Last updated: 19 Feb 2026

---

## THE ONE SENTENCE OUTCOME

In 6 weeks you go from overwhelmed and invisible to having a complete
personal brand, a working AI team, and a content system that runs
while you live your life.

---

## WHO THIS IS FOR

Female entrepreneurs aged 32–44 who are:
- Overwhelmed, confused, and invisible online
- Spending all their time building their brand alone
- Missing time with their kids because business demands everything
- Ready to use AI but don't know where to start
- Done with courses that give theory but no real results

---

## THE 6-WEEK JOURNEY

### Week 1 — Brand DNA
We start with you. Your story, message, voice, values, fears, dreams.
Your colours, design system, content style.
Everything maps back to your authenticity.
This becomes the foundation every single thing we build is rooted in.

### Week 2 — Your Control Centre
We build your brand's home base.
Website, landing page, or full control system — you choose.
We connect your email, Google Drive, and core tools.
Nothing fancy. Just everything in one place that actually works.

### Week 3 — Your AI Director
We train your personal AI director.
An agent that thinks like you, talks like you, and helps you
decide what to do next.
Like a business partner available 24/7 who knows your brand inside out.

### Week 4 — Your Offer & Funnel
We map your three-tier offer structure:
- Freebie offer
- Mid-tier offer
- High ticket offer

Then we build the funnel — landing pages, email sequences, automations.
Your AI agents connect and work for your brand around the clock.

### Week 5 — Your Content System
We use SSELFIE at an advanced level most users never discover.
AI brand photos for your website, digital products, content covers, reels.
A content calendar with captions, hooks, story sequences, hashtags
— researched for your specific niche.
30 days batched and ready. Filmed, posted, done.

### Week 6 — Your AI Team
You leave with a full AI-powered brand team.
Agents that talk like you, think like you, and run your brand
like an enterprise operation.
So you can be with your kids. Make memories.
And know your brand is growing without you having to choose.

---

## WHAT THEY WALK AWAY WITH

- Complete Brand DNA document (story, message, voice, values)
- Working website or landing page
- Personal AI director trained on their brand
- Connected automation system (email, Google Drive, tools)
- Three-tier offer structure mapped and built
- Working sales funnel with email sequences
- 30-day content calendar batched and ready
- SSELFIE AI brand photos for all content needs
- Full AI team that runs their brand while they live their life

---

## INVESTMENT

### THE COHORT — Group Experience
Price: €2,497 (full pay)
Payment plan: 2 x €1,299
Seats: 12 maximum — hard limit
Start: March 16, 2026
Length: 6 weeks
Format: Weekly 90-min live group sessions
Support: Private Telegram (Sandra active daily)
Includes: SSELFIE app membership for 6 weeks

### THE VIP — 1:1 Private
Price: €4,997 (full pay)
Payment plan: 3 x €1,749
Spots: 2 maximum — hard limit
Start: March 16, 2026
Length: 6 weeks
Format: Weekly 60-min private calls with Sandra
Support: Unlimited DM access to Sandra
Includes: SSELFIE app membership + full Brand Engine
Promise: Done-with-you, not done-for-you. Sandra builds beside them.

---

## API COSTS — FULL TRANSPARENCY

Brand Engine uses real AI tools that have real operating costs.
Sandra is committed to keeping these as minimal as possible.
These are NOT hidden — they are disclosed upfront.

### What participants will need:
Each participant will need to sign up for their own API accounts.
Sandra guides them through setup. Most have free tiers to start.

Typical tools used (varies per participant needs):
- Anthropic API (Claude) — for their AI director
- Make.com or n8n — for automations (free tier available)
- Google Drive — free
- Email provider (Resend, Mailchimp, or similar) — free tiers available
- SSELFIE app — included in Brand Engine price

### Estimated monthly API spend:
- Minimal setup (basics only): €10–€30/month
- Standard operating (growing brand): €30–€80/month
- Advanced (full automation suite): €80–€200/month

Each participant decides their own spending level.
Sandra will always show the most cost-effective path first.
No participant will be pressured to spend beyond what they're comfortable with.

### Important note for Sandra:
Always mention API costs BEFORE someone pays.
One sentence in the DM: "There are small API running costs on top —
typically €10–€50/month depending on what you build.
I'll guide you through keeping these minimal."

---

## CALENDLY LINK (VIP discovery calls)
https://calendly.com/sandrasocial/vip-discovery-call-30-min

---

## SALES RULES — LOCKED

1. VIP always requires a discovery call before payment link is sent
2. Cohort goes direct to payment link after email is collected
3. Payment plans offered ONLY when someone hesitates or asks
4. Never discount below floor prices without Sandra's explicit decision
5. Seat caps are hard limits — never promise "one more spot"
6. API costs always disclosed before payment
7. Access pauses after 7 days of failed payment plan instalment

---

## FOR CODEX — TECHNICAL CONTEXT

This offer is processed through the Brand Engine pipeline at:
/admin/brand-engine-applications

Offer types in database:
- offer_type = 'cohort' → STRIPE_BRAND_ENGINE_COHORT_PRICE_ID (€2,497)
- offer_type = 'vip' → STRIPE_BRAND_ENGINE_VIP_PRICE_ID (€4,997)

Payment plan prices (pending M-09 task):
- STRIPE_BRAND_ENGINE_COHORT_PLAN_PRICE_ID (2 x €1,299)
- STRIPE_BRAND_ENGINE_VIP_PLAN_PRICE_ID (3 x €1,749)

VIP routing: fit_call required before offer is sent
Cohort routing: direct_offer, payment link sent after email collected

Do NOT change pricing, seat limits, or routing logic without
explicit instruction from Sandra.

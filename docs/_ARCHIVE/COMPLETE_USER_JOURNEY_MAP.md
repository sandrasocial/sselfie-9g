# SSELFIE Studio — Complete User Journey Map
## Free → Feed Planner → Membership

**Date:** February 2026  
**Version:** 2.0  
**Purpose:** Master document mapping all user journeys, features, and conversion paths

---

## TABLE OF CONTENTS

1. [Executive Overview](#executive-overview)
2. [Product Ecosystem](#product-ecosystem)
3. [User Journey: Free Users](#user-journey-free-users)
4. [User Journey: Paid Blueprint](#user-journey-paid-blueprint)
5. [User Journey: Creator Studio Membership](#user-journey-creator-studio-membership)
6. [Maya AI Strategist](#maya-ai-strategist)
7. [Academy Learning Platform](#academy-learning-platform)
8. [Feed Planner](#feed-planner)
9. [Access Control Matrix](#access-control-matrix)
10. [Conversion Paths](#conversion-paths)
11. [Technical Implementation](#technical-implementation)
12. [Email System & Automation](#email-system--automation)

---

## EXECUTIVE OVERVIEW

### The Three-Tier System

```
┌────────────────────────────────────────────────────────────┐
│                    SSELFIE ECOSYSTEM                        │
└────────────────────────────────────────────────────────────┘

TIER 1: FREE USERS (Lead Generation)
├─ Free Blueprint (strategy + captions)
├─ 2 free credits (1-2 preview grids)
└─ Entry point to ecosystem

TIER 2: PAID BLUEPRINT ($47 One-Time)
├─ 30 custom AI photos
├─ Full Feed Planner access
├─ 60 credits (30 grids)
└─ Bridge to membership

TIER 3: CREATOR STUDIO MEMBERSHIP ($97/month)
├─ Maya AI Strategist (unlimited chat)
├─ Academy (courses + resources)
├─ Gallery (AI photo generation)
├─ Feed Planner (unlimited)
├─ 200 monthly credits
└─ Custom model training
```

### Key Metrics

| Tier | Price | Credits | Main Value |
|------|-------|---------|------------|
| **Free** | $0 | 2 (one-time) | Strategy validation |
| **Paid Blueprint** | $47 | 60 (one-time) | 30 photos + feed planning |
| **Creator Studio** | $97/mo | 200/month | Full AI studio + learning |

### Revenue Model

- **Lead Magnet:** Free Blueprint → Email list growth
- **Low-Ticket:** Paid Blueprint $47 → Revenue + qualification
- **High-Ticket:** Creator Studio $97/mo → Recurring revenue + retention
- **Upsells:** Credit top-ups ($10-$100) → Additional revenue

---

## PRODUCT ECOSYSTEM

### Core Products

```
┌─────────────────────────────────────────────────────────────┐
│  FREE BLUEPRINT                                              │
│  • Strategy generation                                       │
│  • Caption writing                                          │
│  • Grid preview (optional)                                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  PAID BLUEPRINT ($47)                                       │
│  • 30 custom AI photos                                      │
│  • Feed Planner access (9-post grids)                       │
│  • 60 credits                                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  CREATOR STUDIO ($97/mo)                                    │
│  ├─ MAYA AI Strategist                                      │
│  │  • Chat-based content strategist                         │
│  │  • Photo concept generation                              │
│  │  • Feed planning & captions                              │
│  │  • Video generation                                      │
│  │  • Personal memory (learns preferences)                  │
│  │                                                           │
│  ├─ ACADEMY                                                 │
│  │  • Video courses (beginner to advanced)                  │
│  │  • Templates (Canva, PDF, Drive)                         │
│  │  • Monthly drops (strategies)                            │
│  │  • Flatlay images (downloadable)                         │
│  │                                                           │
│  ├─ GALLERY                                                 │
│  │  • AI photo generation                                   │
│  │  • Classic Mode (FLUX.1 Dev + LoRA)                      │
│  │  • Pro Mode (Nano Banana Pro)                            │
│  │  • Custom model training                                 │
│  │                                                           │
│  └─ FEED PLANNER                                            │
│     • Unlimited feed generation                             │
│     • 9-post grids with captions                            │
│     • Strategic positioning                                 │
│     • Template library                                      │
└─────────────────────────────────────────────────────────────┘
```

### Credit System

| Action | Classic Credits | Pro Credits |
|--------|-----------------|-------------|
| **Free Blueprint preview** | 2 credits | - |
| **Feed Planner preview** | 2 credits | - |
| **Feed Planner full grid** | 2 credits | - |
| **Maya Classic photo** | 2 credits | - |
| **Maya Pro photo** | 1 credit | - |
| **Custom model training** | 30 credits | - |

**Monthly Grants:**
- Free users: 2 credits (signup bonus)
- Creator Studio: 200 credits/month
- Paid Blueprint: 60 credits (one-time)

---

## USER JOURNEY: FREE USERS

### Entry Points

1. **Homepage** → `/blueprint` CTA
2. **Direct link** → `/blueprint`
3. **Email campaigns** → `/blueprint`
4. **Social media** → `/blueprint`

### Step-by-Step Journey

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: LANDING PAGE                                         │
│ Route: /blueprint                                            │
└─────────────────────────────────────────────────────────────┘
User arrives at blueprint landing page
↓
Email capture modal appears (if not authenticated)
├─ Name + email required
├─ Database: blueprint_subscribers table created
└─ Access token generated

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: BRAND ONBOARDING WIZARD                             │
│ Component: unified-onboarding-wizard.tsx                    │
└─────────────────────────────────────────────────────────────┘
6-step wizard collects:
1. Business type (coach, creator, service provider, etc.)
2. Dream client profile
3. Struggles & pain points
4. Feed style (luxury/minimal/beige/editorial)
5. Selfie skill level
6. Post frequency

Data stored in: user_personal_brand table

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: AI STRATEGY GENERATION                              │
│ API: POST /api/blueprint/generate-concepts                  │
└─────────────────────────────────────────────────────────────┘
AI generates:
├─ 3x3 Instagram grid concept (text)
├─ 9 caption suggestions
├─ Content strategy overview
└─ Stores in: blueprint_subscribers.strategy_data

Generation time: ~30-60 seconds

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: OPTIONAL GRID PREVIEW                               │
│ API: POST /api/blueprint/generate-grid                      │
└─────────────────────────────────────────────────────────────┘
IF user uploads selfies:
├─ Generates single 9:16 preview image
├─ Shows all 9 scenes in one image
├─ Uses 0 credits (free preview)
└─ Stores in: blueprint_subscribers.grid_url

┌─────────────────────────────────────────────────────────────┐
│ STEP 5: RESULTS VIEW                                        │
│ Component: blueprint-screen.tsx                             │
└─────────────────────────────────────────────────────────────┘
3 tabs:
├─ STRATEGY: Text concept + positioning guide
├─ CAPTIONS: 9 caption suggestions with hashtags
└─ GRID: Preview image (if generated)

┌─────────────────────────────────────────────────────────────┐
│ STEP 6: UPSELL DECISION POINT ⚡                             │
└─────────────────────────────────────────────────────────────┘
User sees 3 options:

A) PAID BLUEPRINT ($47)
   └─ "Bring My Blueprint to Life - 30 Photos"

B) CREATOR STUDIO ($97/mo)
   └─ "Upgrade to Full Studio"

C) BUY CREDITS ($10-$100)
   └─ "Generate More Previews"

┌─────────────────────────────────────────────────────────────┐
│ STEP 7: EMAIL NURTURE SEQUENCE                             │
│ Cron: /api/cron/send-blueprint-followups                   │
└─────────────────────────────────────────────────────────────┘
Automated emails:
├─ Day 3: "3 Ways to Use Your Blueprint This Week"
├─ Day 7: "This Could Be You" (social proof)
└─ Day 14: "Still thinking about it? Here's $10 off 💕"

All promote Creator Studio membership
```

### What Free Users Get

| Feature | Access | Limitations |
|---------|--------|-------------|
| **Blueprint Strategy** | ✅ Full | Text-only concept |
| **Captions** | ✅ Full | 9 caption suggestions |
| **Grid Preview** | ✅ Optional | Single 9:16 image, requires selfies |
| **Feed Planner** | ✅ Limited | 2 credits = 1 preview grid |
| **Maya** | ❌ No | Members only |
| **Academy** | ❌ No | Members only |
| **Gallery** | ❌ No | Members only |

### Conversion Triggers

1. **Immediate:** After viewing blueprint results
2. **Day 3:** Email with usage tips
3. **Day 7:** Social proof email
4. **Day 14:** Discount offer email
5. **Credit depletion:** When they run out of free credits

---

## USER JOURNEY: PAID BLUEPRINT

### Entry Point

User clicks "Bring My Blueprint to Life - $47" from:
- Blueprint results page
- Day 14 email
- Feed Planner (when out of credits)

### Checkout Flow

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: CHECKOUT PAGE                                       │
│ Route: /checkout/blueprint                                  │
└─────────────────────────────────────────────────────────────┘
Stripe embedded checkout:
├─ Product: Paid Blueprint ($47)
├─ Promo code field
├─ Email pre-filled
└─ Payment methods: Card, Apple Pay, Google Pay

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: PAYMENT PROCESSING                                 │
│ Webhook: /api/webhooks/stripe                              │
└─────────────────────────────────────────────────────────────┘
On successful payment:
├─ Updates: blueprint_subscribers.paid_blueprint_purchased = TRUE
├─ Grants: 60 credits (30 images × 2 credits each)
├─ Tags: 'paid-blueprint-buyer' in Resend + Flodesk
├─ Logs: stripe_payments table
└─ Redirects: /checkout/success

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: WELCOME EMAIL                                      │
│ Template: paid-blueprint-welcome.tsx                        │
└─────────────────────────────────────────────────────────────┘
Immediate email with:
├─ "Your photos are being generated!"
├─ Link to generation page
└─ What to expect next

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: PHOTO GENERATION                                   │
│ Route: /blueprint/paid?access={token}                       │
│ API: POST /api/blueprint/generate-paid                      │
└─────────────────────────────────────────────────────────────┘
User clicks "Generate My 30 Photos":
├─ Batch 1: 10 photos (images 1-10)
├─ Batch 2: 10 photos (images 11-20)  
├─ Batch 3: 10 photos (images 21-30)
└─ Generation time: ~10-15 minutes total

Progress shown in real-time:
"Generating photos... 0 of 30 complete"

┌─────────────────────────────────────────────────────────────┐
│ STEP 5: DELIVERY EMAIL                                     │
│ Template: paid-blueprint-delivery.tsx                       │
└─────────────────────────────────────────────────────────────┘
Sent when all 30 photos complete:
├─ Subject: "Your 30 Custom Photos Are Ready! 📸"
├─ Preview of 4 photos
├─ CTA: "View All 30 Photos"
└─ Link back to gallery

┌─────────────────────────────────────────────────────────────┐
│ STEP 6: GALLERY VIEW                                       │
│ Route: /blueprint/paid?access={token}                       │
└─────────────────────────────────────────────────────────────┘
Gallery features:
├─ Grid view of all 30 photos
├─ Individual download buttons
├─ "Download All" button
├─ Upgrade CTA to Creator Studio
└─ Share buttons

┌─────────────────────────────────────────────────────────────┐
│ STEP 7: FEED PLANNER ACCESS                                │
│ Unlocked automatically                                       │
└─────────────────────────────────────────────────────────────┘
With Paid Blueprint, user now gets:
├─ Full Feed Planner access
├─ 9-post grids (instead of 1-post previews)
├─ Strategic feed layouts
├─ Caption generation
└─ Template library

┌─────────────────────────────────────────────────────────────┐
│ STEP 8: UPSELL EMAIL SEQUENCE                              │
│ Cron: /api/cron/send-blueprint-followups                   │
└─────────────────────────────────────────────────────────────┘
Post-purchase emails:
├─ Day 1: "5 Ways to Use Your Blueprint Photos This Week"
├─ Day 3: "What's Missing? 500 Credits Inside" (upgrade CTA)
└─ Day 7: "From $297 One-Time to $97/Month Unlimited"
```

### What Paid Blueprint Users Get

| Feature | Access | Details |
|---------|--------|---------|
| **30 Custom Photos** | ✅ Full | AI-generated, brand-matched |
| **Feed Planner** | ✅ Full | 9-post grids, strategic layouts |
| **60 Credits** | ✅ One-time | ~30 feed grids |
| **Gallery Downloads** | ✅ Full | Individual + bulk download |
| **Blueprint Strategy** | ✅ Keep | Original strategy + captions |
| **Maya** | ❌ No | Members only |
| **Academy** | ❌ No | Members only |
| **Monthly Credits** | ❌ No | Members only |
| **Model Training** | ❌ No | Members only |

### Conversion Path to Membership

**Value Stack Comparison:**

| Feature | Paid Blueprint ($47) | Creator Studio ($97/mo) |
|---------|---------------------|------------------------|
| Photos | 30 one-time | Unlimited generation |
| Credits | 60 one-time | 200/month recurring |
| Feed Planner | ✅ Full access | ✅ Full access |
| Maya AI | ❌ No | ✅ Yes |
| Academy | ❌ No | ✅ Yes |
| Model Training | ❌ No | ✅ Yes |
| Video Generation | ❌ No | ✅ Yes |

**Trigger Points:**
1. When credits run out (after ~30 grids)
2. Day 3 email: "What's Missing?"
3. Day 7 email: "Unlimited Access"
4. In-app: "Generate More Photos" CTAs

---

## USER JOURNEY: CREATOR STUDIO MEMBERSHIP

### Entry Points

1. **Homepage** → "Join Creator Studio" CTA
2. **Blueprint results** → "Upgrade to Full Studio"
3. **Paid Blueprint** → "Unlimited Access" email
4. **Feed Planner** → "Upgrade for Unlimited"
5. **Direct** → `/checkout/membership`

### Onboarding Flow

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: MEMBERSHIP CHECKOUT                                 │
│ Route: /checkout/membership                                 │
└─────────────────────────────────────────────────────────────┘
Stripe checkout:
├─ Product: Creator Studio Membership ($97/mo)
├─ Promo code field (optional)
├─ Email pre-filled
├─ Trial period: None (immediate billing)
└─ Payment methods: Card (recurring)

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: SUBSCRIPTION PROCESSING                            │
│ Webhooks: customer.subscription.created                     │
│           invoice.payment_succeeded                          │
└─────────────────────────────────────────────────────────────┘
On successful payment:

Event 1: customer.subscription.created
├─ Creates: subscriptions table entry
├─ product_type: 'sselfie_studio_membership'
├─ status: 'active'
└─ Does NOT grant credits yet

Event 2: invoice.payment_succeeded
├─ Grants: 200 monthly credits
├─ Transaction type: 'subscription_grant'
├─ Idempotent: Uses invoice_id
└─ Tags: 'studio-member' in Resend + Flodesk

Redirects to: /checkout/success

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: WELCOME & ONBOARDING                               │
│ Route: /studio                                              │
└─────────────────────────────────────────────────────────────┘
First login experience:
├─ Brand Profile Wizard (if not completed)
│  ├─ Business info
│  ├─ Target audience
│  ├─ Content pillars
│  ├─ Brand aesthetic
│  └─ Voice & style
│
└─ Dashboard tour
   ├─ Maya tab
   ├─ Feed Planner
   ├─ Gallery
   └─ Academy

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: MAIN STUDIO INTERFACE                              │
│ Route: /studio                                              │
│ Component: sselfie-app.tsx                                  │
└─────────────────────────────────────────────────────────────┘
Tab navigation:
├─ FEED PLANNER (default view)
├─ MAYA (AI strategist)
├─ GALLERY (photo generation)
└─ ACADEMY (learning center)
```

### The Studio Experience

#### Tab 1: Feed Planner

```
┌─────────────────────────────────────────────────────────────┐
│ FEED PLANNER TAB                                            │
│ Component: feed-planner-screen.tsx                          │
└─────────────────────────────────────────────────────────────┘

FEATURES:
├─ Create New Feed
│  ├─ Choose template or start blank
│  ├─ Select 9 scenes from library
│  ├─ Generate images (2 credits per scene)
│  └─ Get captions + strategy
│
├─ View Saved Feeds
│  ├─ All past feeds
│  ├─ Edit/regenerate scenes
│  └─ Download/share
│
└─ Template Library
   ├─ Pre-designed layouts
   ├─ Strategic positioning
   └─ Industry-specific templates

GENERATION PROCESS:
1. User selects/creates feed concept
2. Chooses 9 scenes from prompt library
3. Clicks "Generate Feed"
4. API generates 9 individual 4:5 images
5. Shows progress (0 of 9 complete)
6. Displays completed feed with captions
7. Can download all or individual images

CREDIT USAGE:
├─ 2 credits per scene
├─ 9 scenes = 18 credits per full feed
└─ Members: ~11 full feeds per month (200 credits)
```

#### Tab 2: Maya AI Strategist

```
┌─────────────────────────────────────────────────────────────┐
│ MAYA TAB                                                    │
│ Component: maya-chat-screen.tsx                             │
└─────────────────────────────────────────────────────────────┘

SUB-TABS:
├─ PHOTOS (default)
│  ├─ Chat interface with Maya
│  ├─ Request photo concepts
│  ├─ Get outfit/styling suggestions
│  ├─ Generate images from concepts
│  └─ 2 credits per Classic photo, 1 per Pro
│
├─ VIDEOS
│  ├─ Turn photos into motion videos
│  ├─ Add camera movements
│  └─ Export for Instagram Reels
│
├─ PROMPTS
│  ├─ Saved prompt library
│  ├─ Organize by category
│  └─ Reuse successful prompts
│
├─ TRAINING
│  ├─ Guides & tutorials
│  ├─ Best practices
│  └─ Prompt examples
│
└─ FEED (alternative to Feed Planner tab)
   ├─ Generate feeds through chat
   ├─ Same functionality as Feed Planner
   └─ More conversational interface

MAYA'S CAPABILITIES:
├─ Content Strategy
│  ├─ Suggest content pillars
│  ├─ Plan posting schedule
│  ├─ Write captions
│  └─ Create hashtag sets
│
├─ Photo Generation
│  ├─ Classic Mode: FLUX.1 Dev + LoRA
│  ├─ Pro Mode: Nano Banana Pro
│  ├─ Style matching to brand
│  └─ Outfit/location suggestions
│
├─ Personal Memory
│  ├─ Learns what works for user
│  ├─ Remembers brand preferences
│  ├─ Suggests based on history
│  └─ Adapts to feedback
│
└─ Brand Intelligence
   ├─ Uses brand library knowledge
   ├─ 2025 fashion trends
   ├─ Scandinavian minimalism default
   └─ Outfit/styling database

GENERATION MODES:
1. CLASSIC MODE
   ├─ FLUX.1 Dev model
   ├─ Custom LoRA (trained on user)
   ├─ Trigger words required
   ├─ 2 credits per image
   └─ Best for consistent style

2. PRO MODE
   ├─ Nano Banana Pro model
   ├─ No trigger words needed
   ├─ Multi-scene generation
   ├─ 1 credit per image
   └─ Best for variety
```

#### Tab 3: Gallery

```
┌─────────────────────────────────────────────────────────────┐
│ GALLERY TAB                                                 │
│ Component: gallery-screen.tsx                               │
└─────────────────────────────────────────────────────────────┘

FEATURES:
├─ All Generated Images
│  ├─ From Maya
│  ├─ From Feed Planner
│  ├─ From Blueprint
│  └─ From custom generations
│
├─ Organize & Manage
│  ├─ Create albums
│  ├─ Tag images
│  ├─ Search by keyword
│  └─ Filter by date/type
│
├─ Download & Share
│  ├─ Individual downloads
│  ├─ Bulk downloads
│  ├─ Share links
│  └─ Export to social
│
└─ Model Training
   ├─ Upload training images
   ├─ Train custom LoRA
   ├─ 30 credits per training
   └─ Use in Classic Mode

CUSTOM MODEL TRAINING:
1. Upload 10-20 selfies
2. Click "Train Model"
3. Costs 30 credits
4. Takes ~30-60 minutes
5. Receive email when complete
6. Use trigger word in Classic Mode
7. Generates photos that look like user
```

#### Tab 4: Academy

```
┌─────────────────────────────────────────────────────────────┐
│ ACADEMY TAB                                                 │
│ Component: academy-screen.tsx                               │
└─────────────────────────────────────────────────────────────┘

SECTIONS:
├─ COURSES
│  ├─ Video-based learning
│  ├─ Levels: Beginner, Intermediate, Advanced
│  ├─ Categories:
│  │  ├─ Content Strategy
│  │  ├─ Instagram Growth
│  │  ├─ Photography Basics
│  │  ├─ Brand Building
│  │  └─ AI Tools Mastery
│  ├─ Progress tracking
│  └─ Certificates upon completion
│
├─ TEMPLATES
│  ├─ Canva templates
│  ├─ PDF workbooks
│  ├─ Google Drive resources
│  ├─ Categories:
│  │  ├─ Social media graphics
│  │  ├─ Email marketing
│  │  ├─ Branding kits
│  │  └─ Content calendars
│  └─ Download tracking
│
├─ MONTHLY DROPS
│  ├─ Fresh content each month
│  ├─ Strategies & guides
│  ├─ Trend reports
│  └─ Exclusive resources
│
└─ FLATLAY IMAGES
   ├─ Professional flatlay photos
   ├─ Lifestyle images
   ├─ Workspace shots
   ├─ Product photos
   └─ Use in content

LEARNING FEATURES:
├─ Interactive Lessons
│  ├─ Video lessons with playback controls
│  ├─ Step-by-step guides
│  ├─ Embedded tutorials
│  └─ Action items
│
├─ Progress Tracking
│  ├─ Course completion %
│  ├─ Watch time tracking
│  ├─ Lesson status (not started, in progress, completed)
│  └─ Overall progress dashboard
│
└─ Certificates
   ├─ Issued on course completion
   ├─ Shareable credentials
   └─ Display on profile
```

### Monthly Recurring Experience

```
┌─────────────────────────────────────────────────────────────┐
│ MONTHLY CYCLE                                               │
└─────────────────────────────────────────────────────────────┘

Day 1 (Billing Date):
├─ Stripe charges $97
├─ invoice.payment_succeeded webhook fires
├─ 200 credits granted
└─ Email: "Your credits have been renewed!"

Throughout Month:
├─ User generates content
├─ Credits deduct per action
├─ Progress visible in dashboard
└─ Low balance warnings at 50 & 10 credits

Day 28-30:
├─ Renewal reminder email
└─ Option to purchase credit top-ups if needed

CREDIT USAGE EXAMPLES:
├─ 11 full feeds (18 credits each = 198 credits)
├─ 100 Classic photos (2 credits each = 200 credits)
├─ 200 Pro photos (1 credit each = 200 credits)
├─ 6 feeds + 108 Pro photos = 200 credits
└─ 1 model training + 5 feeds + 80 Pro photos = 200 credits

CREDIT TOP-UPS (if needed):
├─ $10 = 10 credits
├─ $50 = 100 credits
└─ $100 = 200 credits
```

### Member Benefits Summary

| Feature | Access Level | Details |
|---------|--------------|---------|
| **Maya AI Strategist** | Unlimited chat | 2 credits/Classic photo, 1/Pro |
| **Academy** | Full access | All courses, templates, drops |
| **Gallery** | Unlimited storage | All generated images |
| **Feed Planner** | Unlimited feeds | 2 credits per scene |
| **Model Training** | Unlimited | 30 credits per training |
| **Video Generation** | Unlimited | Convert photos to videos |
| **Monthly Credits** | 200/month | Recurring grant |
| **Support** | Priority | Faster response times |

---

## MAYA AI STRATEGIST

### What Maya Is

Maya is your **personal AI brand strategist and photo studio** built into Creator Studio. Think of Maya as:
- A content strategist who knows your brand
- A photographer who can generate professional photos
- A feed planner who understands Instagram strategy
- A creative partner who learns from your preferences

### Maya's Personality

**Voice & Tone:**
- Warm, supportive, encouraging
- Strategic but not overly technical
- Personal brand expert, not just a photo generator
- "I'm here to help you show up consistently and build your brand"

**Communication Style:**
- Uses "you" language (personal)
- Asks clarifying questions
- Provides strategic context with suggestions
- Celebrates wins and progress

### How Maya Works

#### 1. Chat Interface

```
USER: "I need photos for my Instagram feed this week"

MAYA: "Great! Let's create content that builds your brand. 
      What story are you telling this week?"

USER: "I'm launching my new coaching program"

MAYA: "Perfect! For a launch, we'll want to mix:
      - Authority-building shots (you at work, teaching)
      - Lifestyle shots (approachable, relatable)
      - Product shots (clear CTA, what they get)
      
      Let's start with an authority shot. Tell me about 
      your work environment - what does it look like?"
```

#### 2. Concept Generation

Maya creates **concept cards** with:
- Written description
- FLUX-optimized prompt
- Style notes
- Outfit suggestions
- Location/setting ideas

Example concept card:
```
CONCEPT: "Professional Coach at Work"

DESCRIPTION:
You at your desk, natural light from window, looking 
confident and approachable. Wearing cream sweater, 
minimal jewelry. Laptop visible, notebook to side.

STYLE: Scandinavian minimalism
LIGHTING: Soft natural window light
PALETTE: Cream, beige, warm grey
MOOD: Professional yet approachable

[GENERATE IMAGE] button
```

#### 3. Image Generation

**Classic Mode (2 credits):**
- Uses FLUX.1 Dev + your custom LoRA
- Requires trigger word (e.g., "ohwx woman")
- Best for consistent look across photos
- Example: "ohwx woman in cream sweater at desk, natural light"

**Pro Mode (1 credit):**
- Uses Nano Banana Pro
- No trigger words needed
- Can generate multiple scenes in one image
- Better for variety and experimentation
- Example: "Woman in cream sweater at desk, natural light, professional"

#### 4. Personal Memory System

Maya learns from every interaction:

**What Maya Remembers:**
- Your successful prompts
- Outfits that worked well
- Locations you prefer
- Colors that match your brand
- Styles you gravitate toward
- Feedback you've given

**How Memory Works:**
```sql
maya_personal_memory table:
- user_id
- memory_type: 'preference', 'feedback', 'success_pattern'
- memory_content: JSONB
- learned_from: 'user_feedback', 'successful_generation', 'chat_history'
- created_at, updated_at
```

**Example Memory:**
```json
{
  "type": "preference",
  "content": {
    "preferred_colors": ["cream", "beige", "black"],
    "preferred_settings": ["home office", "natural light"],
    "style": "Scandinavian minimalism",
    "successful_prompts": [
      "ohwx woman in cream sweater, natural light, minimal"
    ]
  }
}
```

#### 5. Brand Intelligence

Maya has access to a **brand library** with:
- 2025 fashion trends
- Outfit databases (400+ combinations)
- Styling principles
- Photography best practices
- Instagram strategy knowledge

**Fashion Knowledge:**
```typescript
// lib/maya/fashion-knowledge-2025.ts

CATEGORIES:
├─ ELEVATED BASICS
│  ├─ Oversized blazers
│  ├─ Cashmere crewnecks
│  ├─ Wide-leg trousers
│  └─ Quality tees
│
├─ TEXTURES & LAYERING
│  ├─ Cashmere, wool, linen
│  ├─ Leather accents
│  └─ Natural materials
│
└─ COLOR PALETTES
   ├─ Neutral foundations (black, cream, beige)
   ├─ Accent colors (navy, chocolate, forest)
   └─ Seasonal updates
```

### Maya Use Cases

#### Use Case 1: Weekly Content Batch

```
GOAL: Create 7 photos for Instagram this week

MAYA WORKFLOW:
1. Ask about content goals ("What are we showcasing?")
2. Suggest content pillar mix (80% value, 20% promotion)
3. Generate 7 concept cards with variety:
   ├─ 3 lifestyle shots (relatable)
   ├─ 2 authority shots (expertise)
   ├─ 1 behind-the-scenes (authenticity)
   └─ 1 product/CTA shot (conversion)
4. Generate images (14 credits)
5. Provide captions for each
6. Suggest posting order

RESULT: Week of content ready in 30 minutes
```

#### Use Case 2: Feed Planning

```
GOAL: Plan next month's Instagram grid

MAYA WORKFLOW:
1. Discuss brand goals for the month
2. Suggest 4 content themes (pillars)
3. Create 4 feed layouts (9 posts each)
4. Generate concept cards for all 36 posts
5. Show visual grid preview
6. Suggest caption strategy
7. Provide posting calendar

RESULT: Month of content planned and visualized
```

#### Use Case 3: Launch Campaign

```
GOAL: Create content for coaching program launch

MAYA WORKFLOW:
1. Understand the offer and transformation
2. Suggest campaign arc:
   ├─ Week 1: Problem awareness
   ├─ Week 2: Solution reveal
   ├─ Week 3: Social proof
   └─ Week 4: Offer & CTA
3. Generate concepts for each phase
4. Create feed layouts showing campaign flow
5. Write captions with strategic CTAs
6. Suggest email/story content to match

RESULT: Complete visual campaign strategy
```

### Maya vs Other AI Tools

| Feature | Maya | ChatGPT | Midjourney |
|---------|------|---------|------------|
| **Knows your brand** | ✅ Yes | ❌ No | ❌ No |
| **Learns preferences** | ✅ Yes | ❌ No | ❌ No |
| **Generates photos** | ✅ Yes | ❌ No | ✅ Yes |
| **Looks like you** | ✅ Yes (LoRA) | ❌ No | ❌ No |
| **Strategic context** | ✅ Yes | ⚠️ Generic | ❌ No |
| **Feed planning** | ✅ Yes | ❌ No | ❌ No |
| **Captions** | ✅ Yes | ✅ Yes | ❌ No |
| **Instagram native** | ✅ Yes | ❌ No | ❌ No |

### Technical Implementation

**Chat System:**
```typescript
// Chat types
type ChatType = 'maya' | 'feed' | 'prompt_builder'

// Message types
type MessageType = 'user' | 'assistant'

// Card types
type CardType = 'concept' | 'feed' | 'video'

// Database schema
maya_chats {
  id: uuid
  user_id: text
  chat_type: ChatType
  title: text
  created_at: timestamptz
}

maya_chat_messages {
  id: uuid
  chat_id: uuid
  message_type: MessageType
  content: text
  card_data: jsonb  // concept/feed/video cards
  created_at: timestamptz
}
```

**API Endpoints:**
- `/api/maya/chat` - Main chat endpoint
- `/api/maya/generate-concepts` - Classic Mode concepts
- `/api/maya/pro/generate-concepts` - Pro Mode concepts
- `/api/maya/generate-image` - Classic image generation
- `/api/maya/pro/generate-image` - Pro image generation
- `/api/maya/generate-feed` - Feed generation
- `/api/maya/generate-video` - Video from image

---

## ACADEMY LEARNING PLATFORM

### What Academy Is

Academy is the **learning and resource center** for Creator Studio members. It provides:
- Structured courses (beginner to advanced)
- Downloadable templates (Canva, PDF, Drive)
- Monthly strategy drops
- Professional flatlay images
- Certificates of completion

### Academy Structure

```
┌─────────────────────────────────────────────────────────────┐
│ ACADEMY SECTIONS                                            │
└─────────────────────────────────────────────────────────────┘

1. COURSES
   ├─ Video-based learning
   ├─ Interactive step-by-step guides
   └─ Progress tracking

2. TEMPLATES
   ├─ Ready-to-use Canva designs
   ├─ PDF workbooks & planners
   └─ Google Drive resources

3. MONTHLY DROPS
   ├─ Fresh strategies each month
   ├─ Trend reports
   └─ Exclusive guides

4. FLATLAY IMAGES
   ├─ Professional stock photos
   ├─ Lifestyle & workspace shots
   └─ Product photography
```

### Course Catalog

#### Beginner Courses

**1. Instagram Basics for Personal Brands**
- Duration: 45 minutes
- Lessons: 6
- Content:
  - Setting up your profile
  - Understanding the algorithm
  - Your first 30 posts
  - Hashtag strategy
  - Engagement basics
  - Analytics 101

**2. Content Pillar Strategy**
- Duration: 30 minutes
- Lessons: 4
- Content:
  - What are content pillars?
  - Finding your 4 core themes
  - Balancing value vs. promotion
  - Planning with pillars

**3. SSELFIE Studio 101**
- Duration: 60 minutes
- Lessons: 8
- Content:
  - Maya basics
  - Feed Planner walkthrough
  - Gallery organization
  - Model training guide
  - Credit optimization
  - Best practices
  - Troubleshooting
  - Success stories

#### Intermediate Courses

**4. Advanced Feed Planning**
- Duration: 75 minutes
- Lessons: 9
- Content:
  - Grid aesthetics
  - Strategic positioning
  - Color palette consistency
  - Visual storytelling
  - Campaign planning
  - Seasonal strategies
  - Template customization
  - Feed audits
  - A/B testing grids

**5. AI Photography Mastery**
- Duration: 90 minutes
- Lessons: 12
- Content:
  - Prompt engineering
  - Classic vs Pro mode strategies
  - Custom model optimization
  - Lighting in AI prompts
  - Outfit coordination
  - Location selection
  - Batch generation workflows
  - Quality control
  - Style consistency
  - Troubleshooting generations
  - Advanced techniques
  - Portfolio building

**6. Caption Writing That Converts**
- Duration: 60 minutes
- Lessons: 7
- Content:
  - Hook formulas
  - Storytelling structure
  - CTA strategies
  - Voice consistency
  - Engagement triggers
  - Maya caption collaboration
  - Caption banks

#### Advanced Courses

**7. Brand Strategy Deep Dive**
- Duration: 120 minutes
- Lessons: 15
- Content:
  - Brand positioning
  - Target audience research
  - Competitor analysis
  - Voice & tone development
  - Visual identity systems
  - Content calendar planning
  - Launch campaigns
  - Seasonal planning
  - Evergreen content
  - Repurposing strategies
  - Analytics & optimization
  - Growth tactics
  - Monetization strategies
  - Partnership opportunities
  - Scaling systems

**8. Building Your Personal Brand Business**
- Duration: 150 minutes
- Lessons: 18
- Content:
  - Business model selection
  - Offer development
  - Pricing strategy
  - Sales funnels
  - Email marketing
  - Launch strategies
  - Webinar planning
  - Course creation
  - Coaching programs
  - Digital products
  - Membership models
  - Affiliate marketing
  - Sponsorships
  - Team building
  - Automation
  - Client management
  - Legal basics
  - Financial planning

### Template Library

#### Social Media Templates

**Instagram:**
- Post templates (Canva)
- Story templates (Canva)
- Carousel templates (Canva)
- Highlight covers (Canva)
- Bio templates (PDF)
- Hashtag banks (Google Sheets)

**LinkedIn:**
- Post templates (Canva)
- Article headers (Canva)
- Profile banner (Canva)

**Pinterest:**
- Pin templates (Canva)
- Board covers (Canva)

#### Branding Templates

- Brand board template (Canva)
- Color palette guide (PDF)
- Typography pairing guide (PDF)
- Logo usage guide (PDF)
- Brand style guide template (Canva + PDF)

#### Content Planning Templates

- Content calendar (Google Sheets)
- Post planner (PDF)
- Caption template bank (Google Doc)
- Idea tracker (Notion template)
- Analytics tracker (Google Sheets)

#### Business Templates

- Client onboarding (Canva + PDF)
- Proposal template (Canva + PDF)
- Invoice template (Canva + PDF)
- Contract templates (Google Docs)
- Email sequences (Google Docs)
- Launch checklist (PDF)
- Sales page template (Notion)

### Monthly Drops

**Format:**
Each month, members receive a curated package:

**January 2026 Example:**
```
THEME: "Fresh Start Strategy"

INCLUDED:
├─ Strategy Guide (PDF, 25 pages)
│  └─ "Q1 Content Planning for Personal Brands"
│
├─ Templates (Canva Pack)
│  ├─ 30 Instagram post templates
│  ├─ 15 Story templates
│  └─ Q1 content calendar
│
├─ Trend Report (PDF, 15 pages)
│  └─ "Instagram Trends to Watch in 2026"
│
└─ Bonus Resources
   ├─ Goal setting workbook (PDF)
   ├─ New year offer templates (Canva)
   └─ Launch planning checklist (PDF)
```

**Monthly Drop Themes:**
- January: Fresh Start Strategy
- February: Love Your Brand (Valentine's launch strategies)
- March: Spring Renewal (Seasonal content pivots)
- April: Q2 Planning (Mid-year campaigns)
- May: Summer Prep (Vacation content strategies)
- June: Mid-Year Review (Analytics & optimization)
- July: Summer Slowdown (Batch content strategies)
- August: Back to School (Re-engagement campaigns)
- September: Q4 Planning (Holiday prep)
- October: Launch Season (Campaign strategies)
- November: Gratitude Marketing (Thanksgiving content)
- December: Year-End Review (Annual planning)

### Flatlay Image Library

**Categories:**

1. **Lifestyle**
   - Coffee & workspace
   - Morning routines
   - Self-care moments
   - Reading & journaling

2. **Workspace**
   - Desk setups
   - Planning layouts
   - Tech & tools
   - Organization shots

3. **Product**
   - Beauty & skincare
   - Books & planners
   - Tech accessories
   - Office supplies

4. **Seasonal**
   - Spring florals
   - Summer vibes
   - Fall aesthetics
   - Holiday themes

**Usage Rights:**
- Commercial use allowed
- Attribution not required
- Cannot resell as-is
- Can use in client work
- Can edit/modify

### Progress Tracking

**Course Progress:**
```typescript
user_lesson_progress {
  user_id: text
  lesson_id: uuid
  status: 'not_started' | 'in_progress' | 'completed'
  watch_time_seconds: number
  completed_steps: jsonb[]
  completed_at: timestamptz
}

user_academy_enrollments {
  user_id: text
  course_id: uuid
  enrolled_at: timestamptz
  progress_percentage: number  // 0-100
  completed_at: timestamptz
}
```

**Certificates:**
- Issued when course reaches 100% completion
- Includes: Name, Course Title, Completion Date
- Downloadable as PDF
- Shareable link
- Displayed on profile

### Academy Access

**Gated by Membership:**
```typescript
// lib/subscription.ts
hasAcademyAccess(userId) → Boolean

// Check:
1. Active Studio Membership
2. product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro')
3. status IN ('active', 'trialing')
4. OR grace period (current_period_end > now())
```

**Access Denied UI:**
```
┌─────────────────────────────────────────────────┐
│ Academy                                         │
│                                                 │
│ 🔒 Academy is available to Studio Members      │
│                                                 │
│ Unlock access to:                               │
│ • 8+ video courses                              │
│ • 100+ templates                                │
│ • Monthly strategy drops                        │
│ • Professional flatlay images                   │
│                                                 │
│ [Upgrade to Creator Studio - $97/mo] button    │
└─────────────────────────────────────────────────┘
```

---

## FEED PLANNER

### What Feed Planner Is

Feed Planner is the **Instagram grid strategy and generation tool** that helps users:
- Visualize their Instagram feed before posting
- Create cohesive, strategic 9-post grids
- Generate AI images that match their brand
- Get captions and hashtags for each post
- Download ready-to-post content

### Access Levels

| User Type | Access | Grid Size | Credits Required |
|-----------|--------|-----------|------------------|
| **Free Users** | Preview only | 1-post preview | 2 credits |
| **Paid Blueprint** | Full access | 9-post grid | 2 credits/scene |
| **Creator Studio** | Full access | 9-post grid | 2 credits/scene |

### Feed Planner Flow

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: CREATE NEW FEED                                    │
└─────────────────────────────────────────────────────────────┘
User clicks "Create New Feed"

Options:
A) Choose from template library
   └─ Pre-designed layouts with strategic positioning

B) Start from blank
   └─ Full creative control

C) Use saved feed
   └─ Duplicate/modify previous feed

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: DEFINE FEED CONCEPT                                │
└─────────────────────────────────────────────────────────────┘
User provides:
├─ Feed theme/goal
├─ Target audience
├─ Key message
└─ Optional: Brand aesthetic preferences

AI generates:
├─ 9 scene suggestions
├─ Strategic positioning (row 1, 2, 3)
└─ Caption themes for each post

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: SELECT/CUSTOMIZE SCENES                            │
└─────────────────────────────────────────────────────────────┘
9-grid layout shown:

Row 1 (Top): [1] [2] [3]  ← First impressions
Row 2 (Mid): [4] [5] [6]  ← Core content
Row 3 (Bot): [7] [8] [9]  ← Foundation

User can:
├─ Edit each scene description
├─ Reorder scenes (drag & drop)
├─ Choose images from gallery
└─ Request new scene suggestions

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: GENERATE IMAGES                                    │
└─────────────────────────────────────────────────────────────┘
Click "Generate Feed"

Process:
├─ API generates 9 individual 4:5 images
├─ Uses user's brand aesthetic
├─ Ensures visual cohesion
├─ 2 credits per image = 18 credits total
└─ Generation time: ~3-5 minutes

Progress shown:
"Generating your feed... 3 of 9 images complete"

┌─────────────────────────────────────────────────────────────┐
│ STEP 5: REVIEW & REFINE                                    │
└─────────────────────────────────────────────────────────────┘
Feed preview shown with:
├─ 3x3 grid view
├─ Individual image view
├─ Captions for each post
├─ Hashtag suggestions
└─ Posting strategy notes

User can:
├─ Regenerate individual scenes (2 credits each)
├─ Edit captions
├─ Rearrange grid
└─ Save as draft

┌─────────────────────────────────────────────────────────────┐
│ STEP 6: DOWNLOAD & POST                                    │
└─────────────────────────────────────────────────────────────┘
Download options:
├─ Download all (ZIP file)
├─ Download individual images
├─ Copy captions
└─ Export to scheduling tool

Feed saved to:
├─ User's feed library
├─ Can view/edit later
└─ Referenced for future feeds
```

### Template Library

**Available Templates:**

1. **Launch Campaign**
   ```
   Row 1: Problem → Solution → Transformation
   Row 2: Features → Benefits → Social Proof
   Row 3: CTA → Bonus → Urgency
   ```

2. **Authority Builder**
   ```
   Row 1: Expertise → Teaching → Results
   Row 2: Behind Scenes → Process → Tools
   Row 3: Client Work → Testimonial → CTA
   ```

3. **Lifestyle Blend**
   ```
   Row 1: Lifestyle → Value → Personal
   Row 2: Work → Teaching → Motivation
   Row 3: Community → Product → CTA
   ```

4. **Minimalist Aesthetic**
   ```
   Row 1: Hero Shot → Text Quote → Product
   Row 2: Lifestyle → Flat Lay → Behind Scenes
   Row 3: Work → Value → CTA
   ```

5. **Storytelling Arc**
   ```
   Row 1: Hook → Problem → Agitation
   Row 2: Solution → How It Works → Benefits
   Row 3: Proof → Offer → CTA
   ```

### Strategic Positioning

**Row 1 (Top Row) - First Impression:**
- Most visible in profile
- Should hook visitors
- Best for: Hero shots, strong visuals, CTAs

**Row 2 (Middle Row) - Core Content:**
- Story development
- Value delivery
- Best for: Teaching, behind-scenes, lifestyle

**Row 3 (Bottom Row) - Foundation:**
- Supporting content
- Credibility building
- Best for: Testimonials, social proof, process

### Feed Planner Technical Implementation

**Database Schema:**
```sql
user_feeds {
  id: uuid
  user_id: text
  feed_name: text
  layout_type: 'preview' | 'grid_3x4'  -- preview = 1 post, grid_3x4 = 9 posts
  template_id: uuid (nullable)
  scenes: jsonb[]  -- Array of 9 scene objects
  status: 'draft' | 'generating' | 'complete' | 'failed'
  created_at: timestamptz
  updated_at: timestamptz
}

feed_scenes {
  id: uuid
  feed_id: uuid
  position: number  -- 1-9
  prompt: text
  image_url: text (nullable)
  caption: text (nullable)
  hashtags: text[]
  status: 'pending' | 'generating' | 'complete' | 'failed'
}

feed_templates {
  id: uuid
  name: text
  description: text
  category: text
  layout: jsonb  -- Template structure
  preview_image: text
  is_public: boolean
}
```

**API Endpoints:**
- `/api/feed-planner/create` - Create new feed
- `/api/feed-planner/generate` - Generate feed images
- `/api/feed-planner/regenerate-scene` - Regenerate single scene
- `/api/feed-planner/save` - Save feed draft
- `/api/feed-planner/list` - List user's feeds
- `/api/feed-planner/delete` - Delete feed
- `/api/feed-planner/templates` - List templates

**Credit System:**
```typescript
// Free users (preview only)
if (layoutType === 'preview') {
  requiredCredits = 2  // Single image
}

// Paid users (full grid)
if (layoutType === 'grid_3x4') {
  requiredCredits = 18  // 9 images × 2 credits
}

// Regenerate single scene
if (action === 'regenerate_scene') {
  requiredCredits = 2  // One image
}
```

### Feed Planner vs Manual Posting

| Aspect | Manual Posting | Feed Planner |
|--------|----------------|--------------|
| **Visualization** | Can't see grid before posting | See complete 9-post grid |
| **Strategy** | Hope it looks good | Strategic positioning |
| **Cohesion** | Hit or miss | Guaranteed cohesive look |
| **Time** | Hours of planning | 10 minutes |
| **Revisions** | After posting (oops) | Before posting |
| **Captions** | Write from scratch | AI-generated |
| **Consistency** | Varies | Brand-matched |

---

## ACCESS CONTROL MATRIX

### Feature Access by User Type

| Feature | Free | Paid Blueprint | Creator Studio | Admin |
|---------|------|----------------|----------------|-------|
| **Free Blueprint** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Paid Blueprint (30 photos)** | ❌ Purchase | ✅ Access | ✅ Access | ✅ Yes |
| **Feed Planner Preview** | ✅ 2 credits | ✅ Unlimited | ✅ Unlimited | ✅ Yes |
| **Feed Planner Full Grid** | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |
| **Maya AI Strategist** | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **Academy** | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **Gallery** | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **Model Training** | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **Video Generation** | ❌ No | ❌ No | ✅ Yes | ✅ Yes |
| **Monthly Credits** | ❌ No | ❌ No | ✅ 200/mo | ✅ Unlimited |
| **Credit Top-ups** | ✅ Purchase | ✅ Purchase | ✅ Purchase | ❌ N/A |

### Access Control Functions

```typescript
// lib/subscription.ts

// Check Studio Membership
hasStudioMembership(userId: string): Promise<boolean>
// Returns true if user has active subscription
// product_type IN ('sselfie_studio_membership', 'brand_studio_membership', 'pro')
// status IN ('active', 'trialing') OR grace period

// Check Academy Access
hasAcademyAccess(userId: string): Promise<boolean>
// Alias for hasStudioMembership()

// Check Paid Blueprint
hasPaidBlueprint(userId: string): Promise<boolean>
// Returns true if:
// 1. Admin user (ssa@ssasocial.com)
// 2. blueprint_subscribers.paid_blueprint_purchased = TRUE
// 3. Fallback: Check subscriptions table (legacy)

// Get Product Type
getUserProductAccess(userId: string): Promise<ProductType | null>
// Returns: 'sselfie_studio_membership' | 'paid_blueprint' | null

// Get Subscription
getUserSubscription(userId: string): Promise<Subscription | null>
// Returns full subscription object or null

// Feed Planner Access
// lib/feed-planner/access-control.ts
getFeedPlannerAccess(userId: string): Promise<FeedPlannerAccess>
// Returns:
// {
//   hasAccess: boolean,
//   canCreateFullFeeds: boolean,  // Paid blueprint or Studio member
//   maxScenes: number,  // 1 for free, 9 for paid
//   reason?: string  // If hasAccess is false
// }
```

### Grace Period Policy

**Active Status:**
- `status === 'active'`
- `status === 'trialing'`

**Grace Period:**
- `status IN ('canceled', 'cancelled', 'past_due')`
- AND `current_period_end > NOW()`
- Duration: Until end of billing period

**Example:**
```
User subscribes: Jan 1, 2026
Monthly billing: $97/mo
Billing cycle: Jan 1 - Jan 31

User cancels: Jan 15, 2026
├─ status: 'canceled'
├─ current_period_end: Jan 31, 2026
└─ Grace period: Jan 15 - Jan 31 (16 days)

During grace period:
├─ Full access to all features
├─ Can still use remaining credits
└─ Can reactivate subscription

After grace period (Feb 1):
├─ Access revoked
├─ Credits frozen
└─ Must re-subscribe to restore access
```

---

## CONVERSION PATHS

### Path 1: Free → Paid Blueprint → Membership

```
┌─────────────────────────────────────────────────────────────┐
│ STAGE 1: FREE BLUEPRINT                                     │
└─────────────────────────────────────────────────────────────┘
User gets: Strategy + captions + preview

Conversion trigger #1: Immediate (results page)
└─ CTA: "Bring My Blueprint to Life - $47"

Conversion trigger #2: Day 3 email
└─ "3 Ways to Use Your Blueprint This Week"

Conversion trigger #3: Day 7 email  
└─ "This Could Be You" (social proof)

Conversion trigger #4: Day 14 email
└─ "Still thinking about it? Here's $10 off 💕"

        ↓ CONVERTS (15-25% conversion rate)

┌─────────────────────────────────────────────────────────────┐
│ STAGE 2: PAID BLUEPRINT ($47)                               │
└─────────────────────────────────────────────────────────────┘
User gets: 30 photos + Feed Planner + 60 credits

Conversion trigger #1: Day 1 email
└─ "5 Ways to Use Your Blueprint Photos This Week"

Conversion trigger #2: Day 3 email
└─ "What's Missing? 500 Credits Inside" (upgrade CTA)

Conversion trigger #3: Day 7 email
└─ "From $297 One-Time to $97/Month Unlimited"

Conversion trigger #4: Credit depletion
└─ "You're out of credits. Upgrade for 200/month"

Conversion trigger #5: Feed Planner usage
└─ "Create unlimited feeds with Creator Studio"

        ↓ CONVERTS (10-20% conversion rate)

┌─────────────────────────────────────────────────────────────┐
│ STAGE 3: CREATOR STUDIO ($97/mo)                            │
└─────────────────────────────────────────────────────────────┘
User gets: Full studio + Maya + Academy + 200 credits/mo

Retention triggers:
├─ Monthly credit refresh
├─ New Academy courses
├─ Monthly drops
├─ Maya personal memory
└─ Custom model training
```

### Path 2: Free → Membership (Direct)

```
┌─────────────────────────────────────────────────────────────┐
│ STAGE 1: FREE BLUEPRINT                                     │
└─────────────────────────────────────────────────────────────┘
User gets: Strategy + captions + preview

Direct upgrade triggers:
├─ "Unlimited Access" CTA on results page
├─ Homepage "Join Creator Studio" CTA
├─ Day 7 email: "Skip the Line"
└─ Landing page value comparison

Value proposition:
"Get unlimited AI photos, Maya strategist, Academy courses,
and 200 monthly credits for less than one Paid Blueprint
every 2 weeks"

        ↓ CONVERTS (5-10% direct conversion)

┌─────────────────────────────────────────────────────────────┐
│ STAGE 2: CREATOR STUDIO ($97/mo)                            │
└─────────────────────────────────────────────────────────────┘
User skips Paid Blueprint, goes straight to membership
```

### Path 3: Feed Planner → Membership

```
┌─────────────────────────────────────────────────────────────┐
│ STAGE 1: FEED PLANNER (Free Users)                          │
└─────────────────────────────────────────────────────────────┘
Free user creates preview feed (1 post, 2 credits)

Conversion trigger: Immediate
└─ "Upgrade to create 9-post grids" banner

Conversion trigger: Credit depletion  
└─ "Out of credits. Get 200/month with Creator Studio"

Conversion trigger: Limitation frustration
└─ Can't see full grid visualization
└─ Only 1 post at a time

        ↓ CONVERTS (20-30% of active Feed Planner users)

┌─────────────────────────────────────────────────────────────┐
│ STAGE 2: CREATOR STUDIO ($97/mo)                            │
└─────────────────────────────────────────────────────────────┘
Or purchases Paid Blueprint first
```

### Conversion Rate Benchmarks

| Funnel Stage | Conversion Rate | Notes |
|--------------|-----------------|-------|
| **Homepage → Free Blueprint** | 30-40% | Email capture conversion |
| **Free Blueprint → Paid Blueprint** | 15-25% | 14-day conversion window |
| **Paid Blueprint → Membership** | 10-20% | 30-day conversion window |
| **Free Blueprint → Membership (direct)** | 5-10% | Skips Paid Blueprint |
| **Feed Planner users → Membership** | 20-30% | Of active users |

### Revenue Model Projection

**Assumptions:**
- 1,000 free blueprint signups/month
- 20% convert to Paid Blueprint = 200 × $47 = $9,400
- 15% of Paid Blueprint users upgrade to Membership = 30 × $97 = $2,910/mo recurring
- 5% of free users convert directly to Membership = 50 × $97 = $4,850/mo recurring
- Credit top-ups: 10% of members buy $50 top-up = 8 × $50 = $400

**Monthly Revenue:**
- Paid Blueprint: $9,400
- New memberships: $7,760 MRR
- Credit top-ups: $400
- **Total: $17,560 first month**
- **Recurring: $7,760 MRR growth**

**12-Month Projection:**
- Month 1: $17,560 ($7,760 MRR)
- Month 6: $9,400 + $46,560 MRR = $55,960
- Month 12: $9,400 + $93,120 MRR = $102,520

*Assumes no churn (unrealistic), actual MRR will be 70-85% of projection after churn*

---

## TECHNICAL IMPLEMENTATION

### Database Schema Overview

**Core Tables:**

```sql
-- Users & Authentication
users (Neon DB)
├─ id (TEXT PRIMARY KEY)
├─ email (TEXT UNIQUE)
├─ name (TEXT)
├─ created_at (TIMESTAMPTZ)
└─ updated_at (TIMESTAMPTZ)

-- Subscriptions & Payments
subscriptions
├─ id (SERIAL PRIMARY KEY)
├─ user_id (TEXT REFERENCES users.id)
├─ stripe_subscription_id (TEXT UNIQUE)
├─ product_type (TEXT)  -- 'sselfie_studio_membership', 'paid_blueprint'
├─ status (TEXT)  -- 'active', 'trialing', 'canceled', 'past_due', 'expired'
├─ current_period_start (TIMESTAMPTZ)
├─ current_period_end (TIMESTAMPTZ)
├─ cancel_at_period_end (BOOLEAN)
└─ created_at, updated_at (TIMESTAMPTZ)

stripe_payments
├─ id (SERIAL PRIMARY KEY)
├─ user_id (TEXT REFERENCES users.id)
├─ stripe_payment_intent_id (TEXT UNIQUE)
├─ amount (INTEGER)  -- in cents
├─ currency (TEXT)
├─ product_type (TEXT)
├─ status (TEXT)
└─ created_at (TIMESTAMPTZ)

-- Credits System
user_credits
├─ user_id (TEXT PRIMARY KEY REFERENCES users.id)
├─ classic_credits (INTEGER DEFAULT 0)
├─ pro_credits (INTEGER DEFAULT 0)
└─ updated_at (TIMESTAMPTZ)

credit_transactions
├─ id (SERIAL PRIMARY KEY)
├─ user_id (TEXT REFERENCES users.id)
├─ transaction_type (TEXT)  -- 'signup_grant', 'subscription_grant', 'purchase', 'deduction'
├─ credit_type (TEXT)  -- 'classic', 'pro'
├─ amount (INTEGER)  -- positive for grant, negative for deduction
├─ reference_id (TEXT)  -- invoice_id, payment_id, etc.
├─ description (TEXT)
└─ created_at (TIMESTAMPTZ)

-- Blueprint System
blueprint_subscribers
├─ id (SERIAL PRIMARY KEY)
├─ email (TEXT UNIQUE)
├─ name (TEXT)
├─ access_token (TEXT UNIQUE)
├─ form_data (JSONB)  -- Wizard responses
├─ strategy_data (JSONB)  -- AI-generated strategy
├─ strategy_generated (BOOLEAN DEFAULT FALSE)
├─ grid_url (TEXT)  -- Preview grid image
├─ grid_generated (BOOLEAN DEFAULT FALSE)
├─ paid_blueprint_purchased (BOOLEAN DEFAULT FALSE)
├─ paid_blueprint_batch_1_urls (JSONB)  -- Photos 1-10
├─ paid_blueprint_batch_2_urls (JSONB)  -- Photos 11-20
├─ paid_blueprint_batch_3_urls (JSONB)  -- Photos 21-30
├─ day_3_email_sent (BOOLEAN DEFAULT FALSE)
├─ day_7_email_sent (BOOLEAN DEFAULT FALSE)
├─ day_14_email_sent (BOOLEAN DEFAULT FALSE)
├─ day_1_paid_email_sent (BOOLEAN DEFAULT FALSE)
├─ day_3_paid_email_sent (BOOLEAN DEFAULT FALSE)
├─ day_7_paid_email_sent (BOOLEAN DEFAULT FALSE)
├─ created_at (TIMESTAMPTZ)
└─ updated_at (TIMESTAMPTZ)

-- Personal Brand Data
user_personal_brand
├─ id (SERIAL PRIMARY KEY)
├─ user_id (TEXT UNIQUE REFERENCES users.id)
├─ business_type (TEXT)
├─ dream_client (TEXT)
├─ struggles (TEXT)
├─ feed_style (TEXT)  -- 'luxury', 'minimal', 'beige', 'editorial'
├─ selfie_skill_level (INTEGER)
├─ post_frequency (TEXT)
├─ brand_colors (JSONB)
├─ brand_fonts (JSONB)
├─ content_pillars (JSONB)
└─ created_at, updated_at (TIMESTAMPTZ)

-- Maya AI System
maya_chats
├─ id (UUID PRIMARY KEY)
├─ user_id (TEXT REFERENCES users.id)
├─ chat_type (TEXT)  -- 'maya', 'feed', 'prompt_builder'
├─ title (TEXT)
├─ created_at (TIMESTAMPTZ)
└─ updated_at (TIMESTAMPTZ)

maya_chat_messages
├─ id (UUID PRIMARY KEY)
├─ chat_id (UUID REFERENCES maya_chats.id)
├─ message_type (TEXT)  -- 'user', 'assistant'
├─ content (TEXT)
├─ card_data (JSONB)  -- Concept/feed/video cards
├─ created_at (TIMESTAMPTZ)

maya_concepts
├─ id (UUID PRIMARY KEY)
├─ user_id (TEXT REFERENCES users.id)
├─ message_id (UUID REFERENCES maya_chat_messages.id)
├─ prompt (TEXT)
├─ image_url (TEXT)
├─ status (TEXT)
└─ created_at (TIMESTAMPTZ)

maya_personal_memory
├─ id (UUID PRIMARY KEY)
├─ user_id (TEXT REFERENCES users.id)
├─ memory_type (TEXT)  -- 'preference', 'feedback', 'success_pattern'
├─ memory_content (JSONB)
├─ learned_from (TEXT)
└─ created_at (TIMESTAMPTZ)

-- Feed Planner
user_feeds
├─ id (UUID PRIMARY KEY)
├─ user_id (TEXT REFERENCES users.id)
├─ feed_name (TEXT)
├─ layout_type (TEXT)  -- 'preview', 'grid_3x4'
├─ template_id (UUID)
├─ scenes (JSONB)  -- Array of 9 scene objects
├─ status (TEXT)  -- 'draft', 'generating', 'complete', 'failed'
├─ created_at (TIMESTAMPTZ)
└─ updated_at (TIMESTAMPTZ)

feed_templates
├─ id (UUID PRIMARY KEY)
├─ name (TEXT)
├─ description (TEXT)
├─ category (TEXT)
├─ layout (JSONB)
├─ preview_image (TEXT)
├─ is_public (BOOLEAN)
└─ created_at (TIMESTAMPTZ)

-- Academy System
academy_courses
├─ id (UUID PRIMARY KEY)
├─ title (TEXT)
├─ description (TEXT)
├─ level (TEXT)  -- 'beginner', 'intermediate', 'advanced'
├─ category (TEXT)
├─ instructor_name (TEXT)
├─ duration_minutes (INTEGER)
├─ lesson_count (INTEGER)
├─ thumbnail_url (TEXT)
├─ status (TEXT)  -- 'draft', 'published', 'archived'
├─ order_index (INTEGER)
└─ created_at, updated_at (TIMESTAMPTZ)

academy_lessons
├─ id (UUID PRIMARY KEY)
├─ course_id (UUID REFERENCES academy_courses.id)
├─ title (TEXT)
├─ lesson_type (TEXT)  -- 'video', 'interactive'
├─ video_url (TEXT)
├─ duration_seconds (INTEGER)
├─ content (JSONB)  -- For interactive lessons
├─ order_index (INTEGER)
└─ created_at (TIMESTAMPTZ)

user_academy_enrollments
├─ id (SERIAL PRIMARY KEY)
├─ user_id (TEXT REFERENCES users.id)
├─ course_id (UUID REFERENCES academy_courses.id)
├─ enrolled_at (TIMESTAMPTZ)
├─ progress_percentage (INTEGER)
├─ completed_at (TIMESTAMPTZ)
└─ last_accessed_at (TIMESTAMPTZ)

user_lesson_progress
├─ id (SERIAL PRIMARY KEY)
├─ user_id (TEXT REFERENCES users.id)
├─ lesson_id (UUID REFERENCES academy_lessons.id)
├─ status (TEXT)  -- 'not_started', 'in_progress', 'completed'
├─ watch_time_seconds (INTEGER)
├─ completed_steps (JSONB)
├─ completed_at (TIMESTAMPTZ)
└─ updated_at (TIMESTAMPTZ)

academy_templates
├─ id (UUID PRIMARY KEY)
├─ title (TEXT)
├─ description (TEXT)
├─ resource_type (TEXT)  -- 'canva', 'pdf', 'drive', 'other'
├─ resource_url (TEXT)
├─ category (TEXT)
├─ thumbnail_url (TEXT)
└─ created_at (TIMESTAMPTZ)

academy_monthly_drops
├─ id (UUID PRIMARY KEY)
├─ month (TEXT)  -- 'January 2026'
├─ title (TEXT)
├─ description (TEXT)
├─ resource_type (TEXT)
├─ resource_url (TEXT)
├─ thumbnail_url (TEXT)
└─ created_at (TIMESTAMPTZ)

academy_flatlay_images
├─ id (UUID PRIMARY KEY)
├─ title (TEXT)
├─ description (TEXT)
├─ image_url (TEXT)
├─ category (TEXT)
├─ tags (JSONB)
└─ created_at (TIMESTAMPTZ)

user_resource_downloads
├─ id (SERIAL PRIMARY KEY)
├─ user_id (TEXT REFERENCES users.id)
├─ resource_type (TEXT)  -- 'template', 'monthly_drop', 'flatlay'
├─ resource_id (UUID)
└─ downloaded_at (TIMESTAMPTZ)
```

### API Architecture

**Route Structure:**
```
/api/
├─ blueprint/
│  ├─ subscribe (POST) - Email capture
│  ├─ generate-concepts (POST) - Strategy generation
│  ├─ generate-grid (POST) - Preview grid
│  ├─ generate-paid (POST) - Paid blueprint generation
│  ├─ get-paid-status (GET) - Check generation status
│  └─ email-concepts (POST) - Send email with strategy
│
├─ maya/
│  ├─ chat (POST) - Main chat endpoint
│  ├─ generate-concepts (POST) - Classic Mode concepts
│  ├─ generate-image (POST) - Classic Mode image
│  ├─ generate-feed (POST) - Feed generation
│  ├─ generate-video (POST) - Video from image
│  ├─ pro/
│  │  ├─ generate-concepts (POST) - Pro Mode concepts
│  │  ├─ generate-image (POST) - Pro Mode image
│  │  └─ generate-feed (POST) - Pro Mode feed
│  ├─ load-chat (GET) - Load chat history
│  ├─ new-chat (POST) - Create new chat
│  ├─ chats (GET) - List user chats
│  └─ save-message (POST) - Save message
│
├─ feed-planner/
│  ├─ create (POST) - Create new feed
│  ├─ generate (POST) - Generate feed images
│  ├─ regenerate-scene (POST) - Regenerate single scene
│  ├─ save (PUT) - Save feed draft
│  ├─ list (GET) - List user feeds
│  ├─ delete (DELETE) - Delete feed
│  └─ templates (GET) - List templates
│
├─ academy/
│  ├─ courses (GET) - List all courses
│  ├─ courses/[id] (GET) - Get course with lessons
│  ├─ lessons/[id] (GET) - Get lesson details
│  ├─ my-courses (GET) - Get user enrollments
│  ├─ templates (GET) - List templates
│  ├─ monthly-drops (GET) - List monthly drops
│  ├─ flatlay-images (GET) - List flatlay images
│  ├─ progress (POST) - Track lesson progress
│  ├─ enroll (POST) - Enroll in course
│  └─ certificates (GET) - Get certificates
│
├─ webhooks/
│  └─ stripe (POST) - Handle Stripe webhooks
│
├─ checkout/
│  ├─ start-embedded-checkout (POST) - Start checkout
│  └─ session-status (GET) - Check session status
│
└─ cron/
   ├─ send-blueprint-followups (GET) - Email sequences
   └─ grant-monthly-credits (GET) - Credit refresh
```

### Webhook Flow (Critical)

**Stripe Webhook Events:**

```typescript
// app/api/webhooks/stripe/route.ts

Event: customer.subscription.created
├─ Creates/updates subscriptions table
├─ Does NOT grant credits yet
└─ Links user via metadata.user_id

Event: invoice.payment_succeeded
├─ IF subscription invoice:
│  ├─ Grants monthly credits (200 for Studio)
│  ├─ Transaction type: 'subscription_grant'
│  ├─ Idempotent: Check invoice_id in credit_transactions
│  └─ Tags: 'studio-member' in Resend + Flodesk
│
└─ IF one-time payment:
   ├─ Updates blueprint_subscribers.paid_blueprint_purchased
   ├─ Grants 60 credits (30 × 2)
   ├─ Transaction type: 'blueprint_purchase'
   └─ Tags: 'paid-blueprint-buyer'

Event: customer.subscription.updated
├─ Updates subscription status
├─ Updates current_period_end
└─ Syncs status to Flodesk

Event: customer.subscription.deleted
└─ Handles cancellation
```

### Credit System Flow

**Credit Grant:**
```typescript
// lib/credits.ts

grantCredits(userId, amount, type, referenceId, description)
├─ Check idempotency (reference_id exists?)
├─ Create credit_transaction record
├─ Update user_credits.classic_credits or pro_credits
└─ Return new balance

// Example: Monthly grant
grantCredits(userId, 200, 'classic', invoice_id, 'Monthly subscription grant')
```

**Credit Deduction:**
```typescript
// lib/credits.ts

deductCredits(userId, amount, type, description)
├─ Check sufficient balance
├─ Create negative credit_transaction
├─ Deduct from user_credits
└─ Return new balance

// Example: Maya image generation
deductCredits(userId, 2, 'classic', 'Maya Classic Mode photo')
```

**Credit Check:**
```typescript
// lib/credits.ts

hasCredits(userId, required, type)
├─ Get user_credits for user
├─ Check if balance >= required
└─ Return boolean
```

---

## EMAIL SYSTEM & AUTOMATION

### Email Infrastructure

**Primary Provider: Resend**
- Location: `/lib/email/send-email.ts`
- Features:
  - Transactional sending (`resend.emails.send()`)
  - Broadcast sending (`resend.broadcasts.create()`)
  - Retry logic (3 attempts with exponential backoff)
  - Open/click tracking
  - Tag-based segmentation
  - Unsubscribe management
- Environment variables:
  - `RESEND_API_KEY` - Required
  - `RESEND_AUDIENCE_ID` - For broadcasts
  - `RESEND_FROM_EMAIL` - Default: "Sandra @ SSELFIE <hello@sselfie.ai>"
  - `RESEND_SEGMENT_*` - Segment IDs for marketing

**Secondary Provider: Flodesk**
- Location: `/lib/flodesk.ts`
- Purpose: Marketing contact management and tagging
- Functions:
  - `syncContactToFlodesk()` - Sync contacts with tags
  - `tagFlodeskContact()` - Add tags to contacts
  - `addToFlodeskSegment()` - Add to segments
- Usage: Contact sync on subscribe, purchase, or convert
- Environment variable: `FLODESK_API_KEY`

**Email Templates**
- Location: `/lib/email/templates/`
- Format: React components using `@react-email/components`
- Style: SSELFIE brand (Times New Roman headers, stone colors, mobile-responsive)
- Return: `{ html: string, text: string }`

---

### Transactional Emails (Event-Triggered)

These emails are sent immediately when specific events occur:

#### 1. Blueprint Delivery
**Trigger:** User completes Blueprint form  
**API:** `/api/blueprint/subscribe`  
**Template:** `blueprint-followup-day-0.tsx`  
**Timing:** Immediate  
**Content:**
- Welcome message
- Blueprint access link
- What to expect next
- Upgrade CTA

#### 2. Paid Blueprint Purchase
**Trigger:** Stripe payment succeeded webhook  
**API:** `/api/webhooks/stripe`  
**Template:** `paid-blueprint-welcome.tsx`  
**Timing:** Immediate  
**Content:**
- Purchase confirmation
- "Your photos are being generated!"
- Generation timeline (10-15 minutes)
- Link to generation page

#### 3. Paid Blueprint Delivery
**Trigger:** All 30 photos complete  
**API:** `/api/blueprint/generate-paid`  
**Template:** `paid-blueprint-delivery.tsx`  
**Timing:** After generation complete  
**Content:**
- Subject: "Your 30 Custom Photos Are Ready! 📸"
- Preview of 4 photos
- CTA: "View All 30 Photos"
- Download instructions

#### 4. Freebie Guide Delivery
**Trigger:** User subscribes to freebie  
**API:** `/api/freebie/subscribe`  
**Template:** `freebie-guide-email.tsx`  
**Timing:** Immediate  
**Content:**
- Guide download link
- Next steps
- Upsell to Blueprint

#### 5. Studio Membership Welcome
**Trigger:** Subscription created + payment succeeded  
**API:** `/api/webhooks/stripe`  
**Template:** `welcome-email.tsx`  
**Timing:** Immediate  
**Content:**
- Welcome to Creator Studio
- 200 credits granted
- Quick start guide
- Maya, Academy, Gallery, Feed Planner intro

#### 6. Payment Failed
**Trigger:** Stripe `invoice.payment_failed` webhook  
**Template:** `payment-failed.tsx`  
**Timing:** Immediate  
**Content:**
- Payment issue notification
- Update payment method link
- Grace period information

#### 7. Payment Recovery
**Trigger:** After failed payment, user updates method  
**Template:** `payment-recovery.tsx`  
**Timing:** When payment succeeds  
**Content:**
- Welcome back message
- Access restored confirmation

#### 8. Credit Renewal
**Trigger:** Monthly credits granted  
**Cron:** `/api/cron/reconcile-credits`  
**Template:** `credit-renewal.tsx`  
**Timing:** Monthly (every 25-30 days)  
**Content:**
- "Your credits have been renewed!"
- 200 credits added
- Usage tips

#### 9. Milestone Bonuses
**Trigger:** User hits image generation milestones  
**Cron:** `/api/cron/milestone-bonuses`  
**Template:** `milestone-bonus.tsx`  
**Timing:** Daily check at 2 PM UTC  
**Milestones:**
- 10 images → 10 credits
- 50 images → 25 credits
- 100 images → 50 credits

#### 10. Referral Rewards
**Trigger:** Referred user makes purchase  
**Cron:** `/api/cron/referral-rewards`  
**Template:** `referral-reward.tsx` (referrer), `referral-invite.tsx` (referred)  
**Timing:** Daily check at 1 PM UTC  
**Rewards:**
- Referrer: 50 credits
- Referred user: 25 credits

#### 11. Feedback Replies
**Trigger:** Admin responds to user feedback  
**API:** `/api/feedback`  
**Template:** `feedback-reply-email.tsx`  
**Timing:** When admin sends reply  

---

### Marketing Email Sequences (Automated)

These sequences are triggered by cron jobs and run automatically based on user behavior and timing.

---

### SEQUENCE 1: Free Blueprint Follow-Up

**Target:** Free Blueprint subscribers who haven't purchased  
**Cron:** `/api/cron/send-blueprint-followups`  
**Schedule:** Daily at 10 AM UTC  
**Delivery:** Resend Broadcasts (via marketing runner)  
**Exclusions:** Active Studio members  

| Day | Template | Subject | Goal |
|-----|----------|---------|------|
| **Day 3** | `blueprint-followup-day-3.tsx` | "3 Ways to Use Your Blueprint This Week" | Value reinforcement, usage ideas |
| **Day 7** | `blueprint-followup-day-7.tsx` | "This Could Be You" | Social proof, success stories |
| **Day 14** | `blueprint-followup-day-14.tsx` | "Still thinking about it? Here's $10 off 💕" | Discount offer, urgency |

**Conversion Goal:** Free → Paid Blueprint ($47)

**Tracking:**
```sql
blueprint_subscribers:
- day_3_email_sent (BOOLEAN)
- day_7_email_sent (BOOLEAN)
- day_14_email_sent (BOOLEAN)
```

---

### SEQUENCE 2: Paid Blueprint Follow-Up

**Target:** Paid Blueprint buyers who aren't Studio members  
**Cron:** `/api/cron/send-blueprint-followups`  
**Schedule:** Daily at 10 AM UTC  
**Delivery:** Individual `sendEmail()` calls (transactional)  
**Exclusions:** Active Studio members  

| Day | Template | Subject | Goal |
|-----|----------|---------|------|
| **Day 1** | `paid-blueprint-day-1.tsx` | "5 Ways to Use Your Blueprint Photos This Week" | Usage tips, engagement |
| **Day 3** | `paid-blueprint-day-3.tsx` | "What's Missing? 500 Credits Inside" | Feature comparison, upsell CTA |
| **Day 7** | `paid-blueprint-day-7.tsx` | "From $297 One-Time to $97/Month Unlimited" | Value proposition, membership upsell |

**Conversion Goal:** Paid Blueprint → Creator Studio ($97/mo)

**Tracking:**
```sql
blueprint_subscribers:
- day_1_paid_email_sent (BOOLEAN)
- day_3_paid_email_sent (BOOLEAN)
- day_7_paid_email_sent (BOOLEAN)
```

---

### SEQUENCE 3: Studio Member Welcome

**Target:** New Studio members  
**Cron:** `/api/cron/welcome-sequence`  
**Schedule:** Daily at 10 AM UTC  
**Delivery:** Individual `sendEmail()` calls  

| Day | Template | Subject | Goal |
|-----|----------|---------|------|
| **Day 0** | `welcome-email.tsx` | "You're in! Let's get you creating 🚀" | Onboarding, first steps |
| **Day 3** | `onboarding-day-3.tsx` | "Quick check: How's it going? 💪" | Engagement check, support offer |
| **Day 7** | `onboarding-day-7.tsx` | "One week in - you're crushing it! 🎯" | Celebration, advanced features |

**Goal:** Activation, engagement, retention

---

### SEQUENCE 4: Freebie Nurture

**Target:** Freebie subscribers who haven't converted  
**Cron:** `/api/cron/nurture-sequence`  
**Schedule:** Daily at 11 AM UTC  
**Delivery:** Individual `sendEmail()` calls  

| Day | Template | Subject | Goal |
|-----|----------|---------|------|
| **Day 1** | `nurture-day-1.tsx` | "Your Blueprint is ready! (Plus something better) ✨" | Blueprint upsell |
| **Day 5** | `nurture-day-3.tsx` | "How Sarah went from invisible to booked solid 📈" | Case study, social proof |
| **Day 10** | `nurture-day-7.tsx` | "Ready to be SEEN? (Let's make it simple) 💪" | Direct Studio membership upsell |

**Conversion Goal:** Freebie → Blueprint or Membership

---

### SEQUENCE 5: Re-Engagement (30+ Days Inactive)

**Target:** Active Studio members who haven't logged in for 30+ days  
**Cron:** `/api/cron/reengagement-campaigns`  
**Schedule:** Daily at 12 PM UTC  
**Delivery:** Individual `sendEmail()` calls  

| Day | Template | Subject | Goal |
|-----|----------|---------|------|
| **Day 0** | `reengagement-day-0.tsx` | "Haven't seen you in a while... 👀" | Re-engagement attempt |
| **Day 7** | `reengagement-day-7.tsx` | "You haven't seen what Maya can do now... 🚀" | Feature updates, value reminder |
| **Day 14** | `reengagement-day-14.tsx` | "Last call: Come back to Studio (50% off) 💪" | Discount offer (COMEBACK50) |

**Goal:** Reactivate dormant members

**Tracking:**
```sql
reengagement_campaigns:
- user_id
- campaign_type: 'reengagement'
- started_at
- completed_at

reengagement_sends:
- campaign_id
- email_type: 'day_0' | 'day_7' | 'day_14'
- sent_at
```

---

### SEQUENCE 6: Reactivation Campaign (60-90+ Days Inactive)

**Target:** Cold users with `cold_users` tag (excludes active subscribers)  
**Cron:** `/api/cron/reactivation-campaigns`  
**Schedule:** Daily at 11 AM UTC  
**Delivery:** Individual `sendEmail()` calls  
**Can be disabled:** `REACTIVATION_CAMPAIGNS_ENABLED=false`  

**8-Email Sequence Over 25 Days:**

#### Phase 1: RECONNECT (Days 0-5)
| Day | Template | Subject | Goal |
|-----|----------|---------|------|
| **Day 0** | `reactivation-day-0.tsx` | "It's been a while 👋" | Soft re-introduction |
| **Day 2** | `reactivation-day-2.tsx` | "Why professional selfies just got an upgrade" | Value refresh |
| **Day 5** | `reactivation-day-5.tsx` | "See how creators are building their brand visuals in minutes" | Social proof, curiosity |

#### Phase 2: DISCOVER (Days 7-14)
| Day | Template | Subject | Goal |
|-----|----------|---------|------|
| **Day 7** | `reactivation-day-7.tsx` | "Real photos. Real you. No filters." | Product benefits |
| **Day 10** | `reactivation-day-10.tsx` | "What creators are making inside SSELFIE Studio." | Use cases, examples |
| **Day 14** | `reactivation-day-14.tsx` | "You're invited - 25 credits to explore SSELFIE Studio." | Low-friction offer |

#### Phase 3: CONVERT (Days 20-25)
| Day | Template | Subject | Goal |
|-----|----------|---------|------|
| **Day 20** | `reactivation-day-20.tsx` | "Your studio is ready - come see it." | Urgency, FOMO |
| **Day 25** | `reactivation-day-25.tsx` | "50% off your first month - this week only." | Final discount offer (COMEBACK50) |

**Conversion Goal:** Cold users → Active Studio members

---

### SEQUENCE 7: Upsell Campaign

**Target:** Freebie subscribers who haven't converted  
**Cron:** `/api/cron/upsell-campaigns`  
**Schedule:** Daily at 10 AM UTC  
**Delivery:** Individual `sendEmail()` calls  

| Day | Template | Subject | Goal |
|-----|----------|---------|------|
| **Day 10** | `upsell-day-10.tsx` | "Upgrade Your Content Game" | Studio membership upsell |
| **Day 20** | `upsell-freebie-membership.tsx` | "From Freebie to Full Studio" | Value comparison, urgency |

---

### SEQUENCE 8: Blueprint Discovery Funnel

**Target:** All subscribers (except blueprint_subscribers and active Studio members)  
**Cron:** `/api/cron/blueprint-discovery-funnel`  
**Schedule:** Daily at 12 PM UTC  
**Delivery:** Individual `sendEmail()` calls  
**Can be disabled:** `BLUEPRINT_DISCOVERY_FUNNEL_ENABLED=false`  

| Email | Template | Subject | Trigger Logic |
|-------|----------|---------|---------------|
| **Email 1** | `blueprint-discovery-1.tsx` | "Remember the selfie guide? Here's what's next." | All non-blueprint subscribers |
| **Email 2** | `blueprint-discovery-2.tsx` | "Your blueprint is ready" | Only if blueprint completed |
| **Email 3** | `blueprint-discovery-3.tsx` | "Meet Maya" | Only if grid generated |
| **Email 4** | `blueprint-discovery-4.tsx` | "See how creators use Maya" | Only if signed up |
| **Email 5** | `blueprint-discovery-5.tsx` | "Your free grid is ready" | Only if engaged with Maya |

**Goal:** Convert old freebie subscribers to Blueprint users

---

### SEQUENCE 9: Cold Re-Education

**Target:** Users with `cold_users` tag from last year's selfie guide  
**Cron:** `/api/cron/cold-reeducation-sequence`  
**Schedule:** Daily at 11 AM UTC  
**Can be disabled:** `COLD_EDUCATION_ENABLED=false`  

| Day | Template | Subject | Goal |
|-----|----------|---------|------|
| **Day 1** | `cold-reeducation-day-1.tsx` | "I disappeared for a while - here's why." | Re-introduction, transparency |
| **Day 3** | `cold-reeducation-day-3.tsx` | "From selfies to Studio - this is how it works." | Product education |
| **Day 7** | `cold-reeducation-day-7.tsx` | "You're invited - your 30% creator restart." | Discount offer (RESTART30) |

---

### SEQUENCE 10: Win-Back Offer

**Target:** Canceled subscribers (10+ days ago)  
**Cron:** `/api/cron/win-back-sequence`  
**Schedule:** Not in vercel.json (may be manual/disabled)  
**Template:** `win-back-offer.tsx`  
**Offer:** 20% off (code: COMEBACK20)  
**Exclusions:** Users who have reactivated  

---

### SEQUENCE 11: Subscription Ending Soon

**Target:** Users with `cancel_at_period_end=true`  
**Cron:** `/api/cron/subscription-ending-soon`  
**Schedule:** Not in vercel.json (may be manual/disabled)  
**Template:** `subscription-ending-soon.tsx`  

| Timing | Subject | Goal |
|--------|---------|------|
| **7 days before** | "Your Studio access is ending soon" | Retention attempt |
| **3 days before** | "3 days left to keep your Studio access" | Urgency |
| **1 day before** | "Last day to keep your Studio access" | Final save attempt |

---

### Admin & Broadcast Emails

#### Beta Testimonial Request
**Trigger:** Manual admin action  
**Template:** `beta-testimonial-request.tsx`  
**Target:** Beta users  
**Purpose:** Collect testimonials and feedback  

#### Newsletter Broadcasts
**Trigger:** Admin schedules via dashboard  
**Cron:** `/api/cron/send-scheduled-newsletters`  
**Schedule:** Every 15 minutes  
**Template:** `newsletter-template.tsx`  
**Delivery:** Resend Broadcasts API  
**Status:** Must be approved before sending  

#### Scheduled Campaigns
**Trigger:** Admin schedules campaign  
**Cron:** `/api/cron/send-scheduled-campaigns`  
**Schedule:** Every 15 minutes  
**Database:** `admin_email_campaigns` table  
**Respects:** Global test mode setting  

---

### Cron Job Schedule Summary

**Complete Cron Job List:**

| Cron Job | Schedule | Purpose | Status |
|----------|----------|---------|--------|
| **reconcile-credits** | Daily 5 AM UTC | Grant welcome & monthly credits | ✅ Active |
| **milestone-bonuses** | Daily 2 PM UTC | Grant milestone credits | ✅ Active |
| **referral-rewards** | Daily 1 PM UTC | Process referral rewards | ✅ Active |
| **resolve-pending-payments** | Every 5 minutes | Resolve failed payment userId lookups | ✅ Active |
| **welcome-sequence** | Daily 10 AM UTC | Send Studio welcome emails | ✅ Active |
| **nurture-sequence** | Daily 11 AM UTC | Send freebie nurture emails | ✅ Active |
| **send-blueprint-followups** | Daily 10 AM UTC | Send Blueprint follow-ups (free + paid) | ✅ Active |
| **onboarding-sequence** | Not scheduled | Send Studio onboarding emails | ⚠️ Disabled |
| **reengagement-campaigns** | Daily 12 PM UTC | Re-engage inactive members | ✅ Active |
| **reactivation-campaigns** | Daily 11 AM UTC | Reactivate cold users (8 emails) | ✅ Active |
| **upsell-campaigns** | Daily 10 AM UTC | Upsell freebie subscribers | ✅ Active |
| **blueprint-discovery-funnel** | Daily 12 PM UTC | Convert old subscribers | ✅ Active |
| **cold-reeducation-sequence** | Daily 11 AM UTC | Re-educate cold users | ⚠️ Can be disabled |
| **win-back-sequence** | Not scheduled | Win back canceled subscribers | ⚠️ Disabled |
| **subscription-ending-soon** | Not scheduled | Save canceling members | ⚠️ Disabled |
| **send-scheduled-campaigns** | Every 15 minutes | Process admin campaigns | ✅ Active |
| **send-scheduled-newsletters** | Every 15 minutes | Send approved newsletters | ✅ Active |
| **sync-audience-segments** | Daily 2 AM UTC | Sync Resend contacts to segments | ✅ Active |
| **refresh-segments** | Daily 3 AM UTC | Refresh email segments | ✅ Active |
| **backfill-resend-audience** | Hourly at :30 | Backfill Resend with DB contacts | ✅ Active |
| **admin-alerts** | Daily 7 AM UTC | Send margin/health alerts to admins | ✅ Active |
| **cron-health-check** | Every hour | Monitor cron job health | ✅ Active |
| **reindex-codebase** | Weekly Sunday 3 AM | Re-index for semantic search | ✅ Active |

**Total Active Cron Jobs:** 20  
**Email Sequence Cron Jobs:** 10  
**Credit Automation Cron Jobs:** 4  
**Admin/Maintenance Cron Jobs:** 6  

---

### Email Database Schema

**Core Tables:**

```sql
-- Email logs (all sends)
email_logs {
  id: SERIAL PRIMARY KEY
  user_id: TEXT
  email_type: TEXT
  template_name: TEXT
  recipient_email: TEXT
  subject: TEXT
  resend_message_id: TEXT
  sent_at: TIMESTAMPTZ
  opened_at: TIMESTAMPTZ
  clicked_at: TIMESTAMPTZ
  status: TEXT  -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
}

-- Campaign tracking
email_events {
  id: SERIAL PRIMARY KEY
  user_id: TEXT
  event_type: TEXT  -- 'blueprint_day_3', 'paid_blueprint_day_1', etc.
  campaign_name: TEXT
  sent_at: TIMESTAMPTZ
  opened_at: TIMESTAMPTZ
  clicked_at: TIMESTAMPTZ
}

-- Email segments
email_segments {
  id: UUID PRIMARY KEY
  name: TEXT
  description: TEXT
  segment_type: TEXT  -- 'static', 'dynamic'
  resend_segment_id: TEXT
  auto_refresh: BOOLEAN
  query: JSONB
}

-- Segment membership
email_segment_members {
  id: SERIAL PRIMARY KEY
  segment_id: UUID
  user_id: TEXT
  added_at: TIMESTAMPTZ
  removed_at: TIMESTAMPTZ
}

-- Marketing queue
marketing_send_queue {
  id: SERIAL PRIMARY KEY
  run_id: UUID
  user_id: TEXT
  email: TEXT
  segment_id: TEXT
  status: TEXT  -- 'pending', 'processing', 'sent', 'failed'
  attempts: INTEGER
  last_attempt_at: TIMESTAMPTZ
}

-- Marketing runs
marketing_send_runs {
  id: UUID PRIMARY KEY
  campaign_name: TEXT
  segment_id: TEXT
  total_recipients: INTEGER
  processed_count: INTEGER
  success_count: INTEGER
  failed_count: INTEGER
  status: TEXT
  started_at: TIMESTAMPTZ
  completed_at: TIMESTAMPTZ
}

-- Admin campaigns
admin_email_campaigns {
  id: UUID PRIMARY KEY
  campaign_name: TEXT
  campaign_type: TEXT  -- 'newsletter', 'announcement', 'promotion'
  template_name: TEXT
  subject: TEXT
  content: JSONB
  segment_id: UUID
  status: TEXT  -- 'draft', 'scheduled', 'sending', 'sent', 'failed'
  scheduled_for: TIMESTAMPTZ
  approval_status: TEXT  -- 'pending', 'approved', 'rejected'
  created_by: TEXT
  sent_at: TIMESTAMPTZ
}

-- Re-engagement tracking
reengagement_campaigns {
  id: UUID PRIMARY KEY
  user_id: TEXT
  campaign_type: TEXT  -- 'reengagement', 'reactivation'
  started_at: TIMESTAMPTZ
  completed_at: TIMESTAMPTZ
  converted_at: TIMESTAMPTZ
}

reengagement_sends {
  id: SERIAL PRIMARY KEY
  campaign_id: UUID
  email_type: TEXT  -- 'day_0', 'day_7', 'day_14'
  sent_at: TIMESTAMPTZ
  opened_at: TIMESTAMPTZ
  clicked_at: TIMESTAMPTZ
}

-- Cron monitoring
admin_cron_runs {
  id: SERIAL PRIMARY KEY
  cron_job: TEXT
  status: TEXT  -- 'running', 'success', 'failed'
  started_at: TIMESTAMPTZ
  completed_at: TIMESTAMPTZ
  duration_ms: INTEGER
  result: JSONB
  error_message: TEXT
}
```

---

### Email Control & Safety

**Control System** (`/lib/email/email-control.ts`):

1. **Kill Switch**
   - Completely disables all email sending
   - Environment: `EMAIL_KILL_SWITCH=true`
   - Use case: Emergency stop

2. **Test Mode**
   - Only sends to whitelisted emails
   - Environment: `EMAIL_TEST_MODE=true`
   - Whitelist: `EMAIL_TEST_WHITELIST=email1@example.com,email2@example.com`
   - Use case: Testing in production

3. **Dry Run Mode**
   - Logs emails but doesn't send
   - Environment: `EMAIL_DRY_RUN=true`
   - Use case: Development testing

4. **Rate Limiting**
   - Function: `checkEmailRateLimit(userId, emailType)`
   - Limits: Configurable per email type
   - Prevents spam

**Email Sending Flow:**

```typescript
// lib/email/send-email.ts

sendEmail(options: EmailOptions)
├─ 1. Check kill switch (return if enabled)
├─ 2. Check test mode (filter recipients)
├─ 3. Check dry run (log and return)
├─ 4. Check rate limit (prevent spam)
├─ 5. Get template (render with data)
├─ 6. Send via Resend
│  ├─ Retry logic (3 attempts)
│  ├─ Exponential backoff
│  └─ Error handling
├─ 7. Log to email_logs table
└─ 8. Return result
```

---

### Email Metrics & Tracking

**Tracked Events:**
- Email sent
- Email delivered
- Email opened (pixel tracking)
- Email clicked (link tracking)
- Email bounced
- Email unsubscribed

**Available via:**
- `email_logs` table
- `email_events` table
- Resend webhooks (`/api/webhooks/resend`)
- Admin dashboard (`/app/admin/newsletter-review`)

**Key Metrics:**
- Open rate
- Click rate
- Conversion rate
- Unsubscribe rate
- Bounce rate

---

### Email Tags & Segmentation

**Resend Tags:**
- `all_subscribers` - All contacts
- `beta_users` - Beta testers
- `paid_users` - Any paid purchase
- `cold_users` - 60-90+ days inactive
- `studio-member` - Active Studio members
- `paid-blueprint-buyer` - Paid Blueprint purchasers
- `blueprint-subscriber` - Free Blueprint users
- `freebie-subscriber` - Freebie guide users

**Flodesk Tags:**
- Same as Resend tags
- Synced via `syncContactToFlodesk()`
- Used for marketing segmentation

**Dynamic Segments:**
- Automatically refreshed daily
- Defined in `email_segments` table
- Query-based membership
- Examples:
  - "Active last 7 days"
  - "Never logged in"
  - "High credit users"
  - "Low engagement"

---

### Integration Points

**1. Stripe Webhooks → Emails**
```
customer.subscription.created → Studio welcome email
invoice.payment_succeeded → Credit renewal email
invoice.payment_failed → Payment failed email
customer.subscription.deleted → Subscription ended email
checkout.session.completed (Paid Blueprint) → Paid Blueprint welcome
```

**2. User Actions → Emails**
```
Blueprint form submit → Blueprint delivery email
Freebie subscribe → Freebie guide email
Feedback submit → Feedback reply (admin)
Referral signup → Referral invite email
```

**3. Cron Jobs → Email Sequences**
```
Daily 10 AM UTC → welcome-sequence, send-blueprint-followups, upsell-campaigns
Daily 11 AM UTC → nurture-sequence, reactivation-campaigns
Daily 12 PM UTC → reengagement-campaigns, blueprint-discovery-funnel
Daily 1 PM UTC → referral-rewards
Daily 2 PM UTC → milestone-bonuses
Every 15 min → send-scheduled-campaigns, send-scheduled-newsletters
```

---

### Email Sequence Status Summary

| Sequence | Status | Delivery | Tracking | Notes |
|----------|--------|----------|----------|-------|
| **Blueprint Follow-Up (Free)** | ✅ Active | Resend Broadcasts | ✅ Yes | Day 3, 7, 14 |
| **Paid Blueprint Follow-Up** | ✅ Active | Transactional | ✅ Yes | Day 1, 3, 7 |
| **Studio Welcome** | ✅ Active | Transactional | ✅ Yes | Day 0, 3, 7 |
| **Freebie Nurture** | ✅ Active | Transactional | ✅ Yes | Day 1, 5, 10 |
| **Re-Engagement** | ✅ Active | Transactional | ✅ Yes | Day 0, 7, 14 |
| **Reactivation (8-email)** | ✅ Active | Transactional | ✅ Yes | Days 0, 2, 5, 7, 10, 14, 20, 25 |
| **Upsell Campaign** | ✅ Active | Transactional | ✅ Yes | Day 10, 20 |
| **Blueprint Discovery** | ✅ Active | Transactional | ✅ Yes | 5 emails, conditional |
| **Cold Re-Education** | ⚠️ Optional | Transactional | ✅ Yes | Can be disabled |
| **Onboarding** | ⚠️ Disabled | N/A | ❌ No | Not scheduled |
| **Win-Back** | ⚠️ Disabled | N/A | ❌ No | Not scheduled |
| **Subscription Ending** | ⚠️ Disabled | N/A | ❌ No | Not scheduled |

---

### What's Working ✅

1. **Transactional Emails**
   - Blueprint delivery
   - Paid Blueprint purchase & delivery
   - Studio welcome
   - Freebie delivery
   - Payment confirmations
   - Credit renewals

2. **Active Sequences**
   - Blueprint follow-ups (Day 3, 7, 14)
   - Paid Blueprint follow-ups (Day 1, 3, 7)
   - Freebie nurture (Day 1, 5, 10)
   - Re-engagement (Day 0, 7, 14)
   - Reactivation (8 emails over 25 days)

3. **Credit Automation**
   - Welcome bonuses (2 credits)
   - Monthly grants (200 credits)
   - Milestone bonuses (10/25/50 credits)
   - Referral rewards (50 referrer, 25 referred)

4. **Infrastructure**
   - Resend integration (primary)
   - Flodesk integration (secondary)
   - Webhook handling (Stripe, Resend)
   - Queue-based broadcasting
   - Retry logic
   - Email control system

### What Needs Attention ⚠️

1. **Disabled Sequences**
   - Onboarding sequence (not scheduled)
   - Win-back sequence (not scheduled)
   - Subscription ending reminders (not scheduled)

2. **Missing Tracking**
   - Some sequences lack open/click tracking
   - Conversion attribution incomplete
   - A/B testing not implemented

3. **Optimization Opportunities**
   - Email send time optimization
   - Personalization improvements
   - Dynamic content based on user behavior
   - Segmentation refinement

---

## SUMMARY

### The Three-Tier Ecosystem

**Tier 1: Free Users (Lead Generation)**
- Free Blueprint: Strategy + captions + preview
- 2 free credits (1-2 preview grids)
- Entry point to ecosystem
- Email nurture sequence (Day 3, 7, 14)

**Tier 2: Paid Blueprint ($47 One-Time)**
- 30 custom AI photos
- Full Feed Planner access (9-post grids)
- 60 credits (30 grids)
- Bridge to membership
- Email upsell sequence (Day 1, 3, 7)

**Tier 3: Creator Studio ($97/month)**
- **Maya AI Strategist**: Chat-based content partner with personal memory
- **Academy**: Video courses, templates, monthly drops, flatlay images
- **Gallery**: AI photo generation (Classic + Pro modes)
- **Feed Planner**: Unlimited feed generation
- **200 monthly credits**
- **Custom model training**

### Key Success Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Free → Paid Blueprint | 15-25% | TBD |
| Paid Blueprint → Membership | 10-20% | TBD |
| Free → Membership (direct) | 5-10% | TBD |
| Feed Planner → Membership | 20-30% | TBD |
| Membership retention (MRR) | 85%+ | TBD |

### Revenue Projections

**Per 1,000 Free Signups:**
- Paid Blueprint: 200 × $47 = $9,400
- Membership (from Paid): 30 × $97/mo = $2,910 MRR
- Membership (direct): 50 × $97/mo = $4,850 MRR
- **Total New MRR: $7,760**
- **Month 12 projection: $102,520/mo** (assuming continued growth)

---

**Document Status:** ✅ Complete (with Email System)  
**Last Updated:** January 29, 2026  
**Next Review:** After launch data available  
**Includes:**
- Complete user journeys (Free → Paid Blueprint → Membership)
- Maya AI Strategist details
- Academy learning platform
- Feed Planner functionality
- Access control & conversion paths
- Technical implementation
- **Email system & automation (11 sequences)**
- **20 active cron jobs**
- **Transactional & marketing emails**

# ACADEMY MINI-PRODUCTS STRATEGY AUDIT
# The Maria Wendt Model Applied to SSELFIE
# Date: 2026-02-20

---

## WHAT CODEX NEEDS TO DO

This is a full audit and strategy build — not a single task.
Read every section before touching any code.

The goal: Transform the Academy from a membership-only feature into
a MULTI-PRODUCT REVENUE ENGINE where users can buy individual mini-products
AND a full membership — and every purchase triggers targeted email sequences.

Think Maria Wendt: multiple low-ticket entry products → upsell → high ticket.

---

## SECTION 1 — WHAT WE ALREADY HAVE (DO NOT REBUILD)

### Database Tables — ALL EXIST
- `academy_courses` — video + interactive courses with tier field
- `academy_lessons` — video and interactive lesson types
- `academy_templates` — downloadable templates (Canva, PDF, etc.)
- `academy_monthly_drops` — monthly exclusive content drops
- `academy_flatlay_images` — professional flatlay image library
- `user_academy_enrollments` — tracks who has access to which courses
- `user_lesson_progress` — tracks video watch time + interactive steps
- `user_resource_downloads` — tracks template + drop + flatlay downloads
- `academy_exercises` + `academy_exercise_submissions` — quizzes
- `academy_certificates` — completion certificates

### API Routes — ALL EXIST
- GET /api/academy/courses
- GET /api/academy/courses/[courseId]
- GET /api/academy/lessons/[lessonId]
- GET /api/academy/my-courses
- GET /api/academy/templates
- GET /api/academy/monthly-drops
- GET /api/academy/flatlay-images
- POST /api/academy/enroll
- POST /api/academy/progress
- POST /api/academy/exercises/submit
- GET /api/academy/certificates
- POST /api/academy/templates/[id]/download
- POST /api/academy/monthly-drops/[id]/download
- POST /api/academy/flatlay-images/[id]/download

### Payment System — EXISTS
- Stripe integration fully working
- Products defined in lib/products.ts
- Checkout at /api/landing/checkout
- Current products: one_time_session ($49), sselfie_studio_membership ($97/mo), paid_blueprint ($47)

### Email System — EXISTS
- Resend integration
- Audience segments working
- Broadcast system working
- Marketing runner + queue

### UI — EXISTS (needs redesign — see Section 4)
- Academy screen with 4 sections: Courses, Templates, Monthly Drops, Flatlay Images
- Access gating (shows upgrade wall if no membership)
- CourseCard, CourseDetail, ResourceCard components

---

## SECTION 2 — WHAT'S MISSING (NEEDS TO BE BUILT)

### 2A — Per-Product Access Control System
RIGHT NOW: Access is binary. Either you have Studio Membership → full Academy, or nothing.

WHAT WE NEED:
- Each course/resource can be purchased individually
- `academy_course_purchases` table: user_id, product_id, purchased_at, stripe_payment_intent
- `academy_resource_purchases` table: user_id, resource_type, resource_id, purchased_at
- Access check: has_membership OR has_individual_purchase
- Membership still unlocks EVERYTHING (full access)

### 2B — Mini-Product Stripe Products
Need new products in lib/products.ts for each mini-product.
See Section 3 for the full product lineup.
Each gets its own Stripe price ID and one-time checkout.

### 2C — User Tagging System
WHAT WE NEED:
- `user_tags` table: user_id, tag, tagged_at, source
- Tags applied automatically on purchase, enrollment, download, course completion
- Tags feed into Resend audience segments for targeted email sequences
- See Section 5 for full tag taxonomy

### 2D — Academy Checkout Flow
- Mini-product purchase button on each locked resource/course
- "Buy this course — €X" CTA visible to non-members
- Checkout creates Stripe payment → webhooks back → grants access → applies tag
- Show preview/teaser before paywall (first lesson free, or description + trailer)

### 2E — Email Sequences per Journey Stage
- Welcome sequence (free subscriber → first purchase nudge)
- Post-purchase sequences (per product — confirm → teach → upsell)
- Membership upsell sequence (mini-product buyer → full membership)
- Re-engagement sequence (inactive buyers)
- See Section 6 for full sequence map

---

## SECTION 3 — THE MINI-PRODUCT LINEUP (MARIA WENDT MODEL)

Price ladder: €27 entry → €47 mid → €97/mo membership

### TIER 1 — Entry Products (€17-€27 one-time)

**Product 1: The Selfie Queen Method** — €27
- Type: Course (3-5 video lessons)
- What: Sandra's exact phone-to-brand-photo system
- Content: Story + method + 5 shot types + 30 prompts
- Tag applied: `bought_selfie_queen_method`
- Upsell to: Content Calendar System (€47)

**Product 2: The AI Caption Starter Pack** — €17
- Type: Template Bundle (downloadable)
- What: 30 done-for-you captions + prompt templates
- Tag applied: `bought_caption_starter_pack`
- Upsell to: The Content Calendar System (€47)

**Product 3: The Flatlay Formula** — €17
- Type: Flatlay Images Bundle + mini guide
- What: 20 professional flatlay images + how to use them guide
- Tag applied: `bought_flatlay_formula`
- Upsell to: The Selfie Queen Method (€27)

### TIER 2 — Mid-Tier Products (€37-€47 one-time)

**Product 4: The Content Calendar System** — €47
- Type: Course (5-7 lessons) + Template
- What: How to plan 30 days of content using SSELFIE + AI
- Tag applied: `bought_content_calendar_system`
- Upsell to: Studio Membership (€97/mo)

**Product 5: Brand Blueprint (existing, keep)** — €47
- Type: One-time photoshoot session (already live)
- Keep as-is, add proper tagging

**Product 6: Personal Branding Masterclass** — €47
- Type: Course (video lessons, more advanced)
- What: Full brand strategy — niche, positioning, visual identity
- Tag applied: `bought_personal_branding_masterclass`
- Upsell to: Studio Membership (€97/mo)

### TIER 3 — Membership (€97/mo)

**Studio Membership** — €97/month
- Full Academy access (all courses, templates, drops, flatlays)
- 200 AI credits/month
- Maya AI access
- Monthly drops (exclusive)
- Tag applied: `active_member`

---

## SECTION 4 — UI REDESIGN REQUIRED

The current Academy UI is functional but not optimized for selling.
It hides products behind a single upgrade wall.

### What needs to change:

**4A — Academy Landing (Overview screen)**
- Show ALL products with prices (not just "upgrade to Studio")
- Each product card shows: thumbnail, title, price, "Buy Now" or "Included in Membership"
- Members see "Included" badges, not prices
- Non-members see prices + buy buttons on individual items
- Featured/recommended product highlighted (Selfie Queen Method)
- Membership pitch at bottom: "Get everything for €97/mo"

**4B — Course/Resource Cards**
- Show price on locked content
- Show lock icon with price: "€27 — Buy Now"
- Show "Free Preview" button if first lesson is unlocked
- Members: no lock, no price — just "Start" or "Continue"

**4C — Individual Product Pages**
- Each mini-product gets its own page/modal
- What's included, who it's for, what they'll learn
- Social proof (Sandra's story)
- CTA: "Buy Now — €X" or "Get Everything — €97/mo membership"

**4D — Post-Purchase Experience**
- Immediate access on purchase (no manual unlocking)
- Welcome message + first step prompt
- Upsell card shown after purchase: "Ready for the next step?"

**4E — Design System (MUST FOLLOW)**
Colors only: #0a0a0a, #ffffff, #f5f5f5, #666666, #e5e5e5
Fonts: Cormorant Garamond (headers, uppercase, weight 200-300) + Inter (body, weight 300)
Style: Scandinavian luxury — editorial, magazine quality, generous whitespace
No centered symmetrical layouts. Mobile-first (375px).

---

## SECTION 5 — USER TAG TAXONOMY

### Purchase Tags
- `bought_selfie_queen_method`
- `bought_caption_starter_pack`
- `bought_flatlay_formula`
- `bought_content_calendar_system`
- `bought_personal_branding_masterclass`
- `bought_brand_blueprint`
- `active_member` (studio membership active)
- `churned_member` (membership cancelled)
- `multi_product_buyer` (bought 2+ mini products — prime upsell target)

### Behavior Tags
- `completed_selfie_queen_method`
- `completed_content_calendar_system`
- `completed_personal_branding_masterclass`
- `downloaded_templates`
- `downloaded_flatlays`
- `academy_inactive_7d` (bought but not accessed in 7 days)
- `academy_inactive_30d`
- `high_engagement` (opened 3+ lessons in first week)

### Funnel Tags
- `free_subscriber` (email only, no purchase)
- `first_purchase_complete` (any paid product)
- `upsell_ready` (completed a course, not yet member)
- `membership_page_visited` (visited /pricing or /membership)

### Source Tags
- `source_instagram`
- `source_tiktok`
- `source_email`
- `source_ads`
- `source_organic`

---

## SECTION 6 — EMAIL SEQUENCE MAP

### Sequence 1 — Free Subscriber Welcome (exists in parts, needs upgrade)
Day 0: Welcome + "here's what's possible"
Day 2: Sandra's story (€12 to app)
Day 4: "The #1 mistake women make with personal branding"
Day 7: Soft pitch — Selfie Queen Method €27

### Sequence 2 — Post Mini-Product Purchase (NEW — one per product)
Immediately: Purchase confirmation + access link
Day 1: "Start here" — guide them to first step
Day 3: Check-in — "How are you getting on?"
Day 7: Success story + upsell to next product or membership
Day 14: If no membership: "You're ready for the full studio"

### Sequence 3 — Membership Upsell (for multi-product buyers)
Trigger: user has bought 2+ mini products OR completed 1 course
Email 1: "You've spent €X on individual products. Membership pays for itself."
Email 2: Feature breakdown — what else they get
Email 3: Final nudge — limited offer or deadline

### Sequence 4 — Member Onboarding (NEW)
Day 0: Welcome to Studio — what to do first
Day 1: Academy overview — where to start
Day 3: Maya introduction
Day 7: First check-in from Sandra
Day 14: Monthly drops introduction
Day 30: "You've been here a month — here's what to do next"

### Sequence 5 — Re-engagement (NEW)
Trigger: bought product but inactive 7 days
Email 1: "Hey, your [product] is waiting"
Email 2 (day 14): Sandra voice — "I know life gets busy"
Email 3 (day 30): Final check-in + offer

---

## SECTION 7 — CODEX TASK BREAKDOWN

Do these in order. Do not skip ahead.

### TASK A-01 — Database: Per-Product Access Tables
Create:
- `academy_course_purchases(id, user_id, course_id, stripe_payment_intent_id, amount_paid, purchased_at)`
- `academy_resource_purchases(id, user_id, resource_type, resource_id, stripe_payment_intent_id, amount_paid, purchased_at)`
- `user_tags(id, user_id, tag, tagged_at, source, metadata JSONB)`
Add indexes on user_id for all three.
Write migration script: scripts/38-academy-mini-products-access.sql

### TASK A-02 — Access Control: Update hasAccessToCourse() Logic
File: lib/data/academy.ts (and api/academy/courses/route.ts)
Current: checks hasStudioMembership() only
Update: check hasStudioMembership() OR has individual course purchase
New function: `getUserAcademyAccess(userId, resourceType, resourceId): Promise<{hasAccess, reason}>`
reason = 'membership' | 'individual_purchase' | 'none'

### TASK A-03 — Products: Add Mini-Products to lib/products.ts
Add all 6 mini-products from Section 3 with prices, types, tags.
New type: `academy_mini_product` (one-time, grants specific course/resource access)
Each product needs: product_id, stripe_price_id (placeholder OK for now), academy_resource_type, academy_resource_id

### TASK A-04 — Checkout: Mini-Product Purchase Flow
Update /api/landing/checkout to handle academy_mini_product type
On success: grant access (insert to academy_course_purchases or academy_resource_purchases)
Apply user tag via applyUserTag(userId, tag) helper
Trigger post-purchase email sequence

### TASK A-05 — Tagging: applyUserTag() Helper
File: lib/user-tags.ts (new file)
Functions:
- applyUserTag(userId: string, tag: string, source?: string): Promise<void>
- removeUserTag(userId: string, tag: string): Promise<void>
- getUserTags(userId: string): Promise<string[]>
- hasTag(userId: string, tag: string): Promise<boolean>
- syncTagsToResend(userId: string): Promise<void> — syncs tags as custom fields in Resend contact

### TASK A-06 — UI: Academy Overview Redesign
File: components/sselfie/academy-screen.tsx
- Show product cards with prices for non-members
- Show "Included" for members
- Buy Now buttons per product
- Membership pitch section at bottom
- Follow design system from Section 4E EXACTLY

### TASK A-07 — UI: Individual Product Pages
Create: components/academy/mini-product-page.tsx
- Product detail view with description, lessons/contents preview, price
- "Buy Now" CTA → checkout
- "Already a member? Sign in" link
- Upsell mention ("Or get everything for €97/mo")

### TASK A-08 — Email: Post-Purchase Sequences
File: lib/email/templates/ (new files per sequence)
- academy-purchase-confirmation.ts
- academy-day1-start-here.ts
- academy-day3-checkin.ts
- academy-day7-upsell.ts
Register sequences in marketing runner / cron system

### TASK A-09 — Analytics: Track Academy Purchases + Tag Events
Add to analytics_events:
- `academy_mini_product_purchased` (product_id, amount, user_id)
- `user_tag_applied` (tag, source, user_id)
- `academy_upsell_shown` (from_product, to_product, user_id)
Surface in admin dashboard

### TASK A-10 — Stripe: Webhook for Academy Purchases
Ensure /api/webhooks/stripe handles new academy_mini_product payment_intent
On payment_intent.succeeded: grant access, tag user, trigger email

---

## SECTION 8 — WHAT NOT TO TOUCH

- Do NOT change Maya AI or B-Roll functionality
- Do NOT change the photo generation pipeline
- Do NOT remove Studio Membership — it stays as the full-access tier
- Do NOT touch /api/cron/ unless explicitly in a task above
- Do NOT redesign Gallery, Feed Planner, or Studio tabs
- Brand Blueprint ($47) stays as-is — just add tagging in A-05

---

## SUCCESS METRICS (how we'll know this is working)

- Academy page conversion rate > 5% (visitors → any purchase)
- Average revenue per user increases (multiple products per person)
- Email open rates on post-purchase sequences > 40%
- Membership upsell conversion from mini-product buyers > 15%
- Monthly recurring revenue grows from new member conversions

---

## CONTEXT FOR NEW CODEX THREAD

State Summary:
Context: SSELFIE Academy transformation to multi-product revenue engine (Maria Wendt model)
Last actions: Full audit completed, strategy documented
Files to read first: THIS FILE, then lib/products.ts, lib/data/academy.ts, app/api/academy/courses/route.ts, components/sselfie/academy-screen.tsx
Outstanding issues: No per-product access control exists yet. Academy is all-or-nothing (membership only).
Next steps: Start with TASK A-01 (database migration) then A-02 (access control logic)

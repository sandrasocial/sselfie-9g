# Paid Blueprint Implementation Plan (Engine-Lite)

**Date:** January 9, 2026  
**Approach:** Build on Existing Infrastructure, No Big Abstractions  
**Status:** Build-Ready  

---

## EXECUTIVE SUMMARY

This plan creates **Paid Brand Blueprint** ($47 one-time) as the first mini product. It leverages existing infrastructure (email sequences, checkout, webhooks, credits) and adds:
- A new Stripe product config
- A user-initiated generation flow (not auto-generated)
- Batch-safe image generation with progress tracking
- Email delivery with tracked links
- Upgrade path to Creator Studio

**Key Principle:** No "BlueprintMonetizationEngine" abstraction. Use engine-lite: existing tables + cron jobs + feature flags.

---

## 1. CURRENT STATE VERIFIED MAP

### ✅ Blueprint Subscriber System

**File:** `/app/api/blueprint/subscribe/route.ts`  
**Function:** `POST` handler  
**What it does:**
- Captures email + name + form data (business, dream client, struggle, vibe, feed style)
- Creates or updates `blueprint_subscribers` record
- Generates unique `access_token` for returning users
- Syncs to Resend + Flodesk
- Marks `welcome_email_sent = false` (Day 0 email not yet implemented)

**Table:** `blueprint_subscribers` (schema: `/scripts/create-blueprint-subscribers-table.sql`)  
**Key columns:**
- `email`, `name`, `access_token`, `form_data`
- `strategy_generated`, `strategy_data` (stored concept)
- `grid_generated`, `grid_url`, `grid_frame_urls` (if generated)
- `selfie_image_urls` (if user uploaded selfies)
- `welcome_email_sent`, `day_3_email_sent`, `day_7_email_sent`, `day_14_email_sent`
- `converted_to_user`, `converted_at`
- `resend_contact_id`, `flodesk_contact_id`

---

### ✅ Blueprint Concept Generation

**File:** `/app/api/blueprint/generate-concepts/route.ts`  
**Function:** `POST` handler  
**What it does:**
- Takes `email`, `formData`, `selectedFeedStyle`
- Checks if email exists in `blueprint_subscribers`
- If strategy already generated, returns cached `strategy_data`
- If not, calls OpenAI GPT-4o to generate ONE concept (title + description)
- Saves to `strategy_data` field
- Sets `strategy_generated = TRUE`

**Important:** Does NOT generate images. Only creates text concept.

---

### ✅ Blueprint Retrieval

**File:** `/app/api/blueprint/get-blueprint/route.ts`  
**Function:** `GET` handler with `?email=xxx`  
**What it does:**
- Returns saved blueprint data for returning users
- Includes: `formData`, `strategy`, `grid`, `selfieImages`

---

### ✅ Email Follow-up Sequence (Free Blueprint)

**File:** `/app/api/cron/blueprint-email-sequence/route.ts`  
**Status:** **DISABLED** (defers to `send-blueprint-followups`)

**File:** `/app/api/cron/send-blueprint-followups/route.ts`  
**Function:** `GET` handler (cron job)  
**What it does:**
- Runs daily at 10 AM UTC
- Sends Day 3, Day 7, Day 14 emails to free blueprint subscribers
- Uses email_logs for deduplication (checks for existing sends)
- Marks `day_3_email_sent`, `day_7_email_sent`, `day_14_email_sent` flags

**Email templates:**
- Day 3: `lib/email/templates/blueprint-followup-day-3.tsx` → "3 Ways to Use Your Blueprint This Week"
- Day 7: `lib/email/templates/blueprint-followup-day-7.tsx` → "This Could Be You"
- Day 14: `lib/email/templates/blueprint-followup-day-14.tsx` → "Still thinking about it? Here's $10 off 💕"

**Currently:** These emails do NOT sell Paid Blueprint. They promote Creator Studio membership.

---

### ✅ Checkout Creation (Landing/Public)

**File:** `/app/actions/landing-checkout.ts`  
**Function:** `createLandingCheckoutSession(productId, email?, promoCode?)`  
**What it does:**
- Looks up product in `lib/products.ts`
- Validates promo code (checks `stripe.promotionCodes.list()` first, then `stripe.coupons.retrieve()` as fallback)
- Creates Stripe embedded checkout session
- Sets metadata: `product_id`, `product_type`, `credits`, `source: "landing_page"`, `promo_code` (if provided)
- If promo valid, applies via `discounts: [{ promotion_code }]` or `discounts: [{ coupon }]`
- If no promo, enables `allow_promotion_codes: true`
- Returns `client_secret` for embedded checkout

**Stripe product config:** `/lib/products.ts`  
**Current products:**
- `sselfie_studio_membership` (subscription, $97/mo)
- `one_time_session` (one-time, $297)
- `credit_packages` (various topups)

**Important:** Does NOT include "paid_blueprint" product yet. We need to add it.

---

### ✅ Checkout Pages

**Directory:** `/app/checkout/`

**Key pages:**
- `/checkout/one-time/page.tsx` → Embedded checkout UI for one-time products
- `/checkout/membership/page.tsx` → Embedded checkout UI for subscriptions
- `/checkout/credits/page.tsx` → Embedded checkout UI for credit topups
- `/checkout/success/page.tsx` → Post-purchase success page (redirected by Stripe after payment)

**Pattern:** Each page:
- Calls server action to create checkout session
- Renders Stripe embedded checkout UI
- Redirects to `/checkout/success?session_id=xxx` on completion

---

### ✅ Stripe Webhook Handler

**File:** `/app/api/webhooks/stripe/route.ts`  
**Function:** `POST` handler  
**What it does:**
- Verifies Stripe signature
- Deduplicates events (checks `webhook_events` table)
- Handles these events:
  - `checkout.session.completed` → Grants credits, tags contacts, tracks conversions
  - `invoice.payment_succeeded` → Grants monthly subscription credits
  - `customer.subscription.created/updated/deleted` → Updates subscription status
  - `charge.refunded` → Reverses credits

**checkout.session.completed logic:**
1. Checks `payment_status === "paid"`
2. Gets `product_type` from `session.metadata`
3. Creates/updates user in `users` table
4. Calls `grantOneTimeSessionCredits()` or `addCredits()` based on product type
5. Logs to `stripe_payments` table (via separate insert)
6. Syncs to Resend + Flodesk (tags: customer, paid, product-specific)
7. Updates `blueprint_subscribers.converted_to_user = TRUE` if email matches
8. Tracks conversion attribution if `campaign_id` in metadata

**Important:** Current product types recognized:
- `one_time_session` → 200 credits
- `sselfie_studio_membership` → 500 credits/month
- `credit_topup` → variable credits

**Missing:** No handler for `paid_blueprint` product type yet.

---

### ✅ Credit System

**File:** `/lib/credits.ts`  
**Functions:**
- `addCredits(userId, amount, type, description?, stripePaymentId?, isTestMode?)` → Adds credits, logs to `credit_transactions`
- `deductCredits(userId, amount, type, description?)` → Deducts credits (idempotent via transaction tracking)
- `checkCredits(userId, amount)` → Returns boolean if user has enough
- `grantOneTimeSessionCredits(userId, stripePaymentId?, isTestMode?)` → Grants 200 credits for one-time session
- `grantMonthlyCredits(userId, subscriptionId)` → Grants 500 credits for monthly subscription

**Table:** `credit_transactions` (logs all credit adds/deducts)  
**Table:** `users` → `credits_balance` field (current balance)

**Important:** Credits are granted ONLY after `payment_status === "paid"` in webhook.

---

### ✅ Image Generation System

**File:** `/app/api/studio/generate/route.ts`  
**Function:** `POST` handler  
**What it does:**
- Requires authenticated user
- Checks credits (4 credits = 4 images)
- Gets user's trained model (LoRA weights)
- Calls Replicate API to generate 4 images
- Deducts 4 credits
- Saves generation to `generated_images` table
- Returns `prediction.id` for polling

**Key insight:** Generation is NOT automatic. User must explicitly call this API. We can adapt this pattern for Paid Blueprint.

**Batch generation:** Currently generates 4 images in one Replicate call (set via `num_outputs: 4`).

---

### ✅ Email Sending Infrastructure

**File:** `/lib/email/send-email.ts`  
**Function:** `sendEmail(options: EmailOptions)`  
**What it does:**
- Checks email kill switch (`email_control` system)
- Checks test mode whitelist
- Checks rate limits (10 emails/hour per recipient)
- Sends via Resend API (with 3 retries)
- Logs to `email_logs` table (status: sent/failed/skipped)
- Supports `emailType` (for filtering) and `campaignId` (for attribution)

**Email control:** `/lib/email/email-control.ts`  
**Functions:**
- `isEmailSendingEnabled()` → Checks global kill switch
- `isEmailTestMode()` → Checks if test mode active
- `isEmailAllowedInTestMode(email)` → Checks whitelist

---

### ✅ Email Tracked Links

**File:** `/lib/email/generate-tracked-link.ts`  
**Function:** `generateTrackedLink(params)`  
**What it does:**
- Builds URL with UTM params (`utm_source=email`, `utm_medium=email`, `utm_campaign=xxx`)
- Adds `campaign_id` and `campaign_type` for conversion tracking
- Adds `checkout` param if product specified

**Example:** `https://sselfie.ai/studio?checkout=studio_membership&utm_source=email&campaign_id=123`

---

### ✅ Analytics Tracking

**File:** `/lib/analytics.ts`  
**Functions:**
- `trackEvent(eventName, params)` → Google Analytics 4 + console log
- `trackFacebookEvent(eventName, params)` → Facebook Pixel
- `trackCTAClick(location, buttonText, destination)` → Tracks button clicks
- `trackCheckoutStart(productType, value)` → Tracks checkout initiation
- `trackPurchase(value, currency, items)` → Tracks completed purchase

**Important:** Analytics are client-side. Events must be called from React components.

---

### ✅ Segmentation System

**File:** `/lib/email/segmentation.ts`  
**Function:** `refreshUserSegments()`  
**What it does:**
- Queries database to classify users into segments (e.g., "active_users", "churned_users", "free_trialists")
- Updates `user_segments` table
- Used by email automation to target specific audiences

**Cron job:** `/app/api/cron/refresh-segments/route.ts` (runs daily)

**Important:** Currently segments users with accounts. Does NOT segment blueprint_subscribers. We may need to add a "blueprint_completed_not_purchased" segment.

---

### ✅ Feature Flags (Existing System)

**Table:** `admin_feature_flags`  
**Columns:** `flag_name`, `enabled`, `description`, `updated_at`

**Usage pattern:** Query flag before showing feature. Example:
```sql
SELECT enabled FROM admin_feature_flags WHERE flag_name = 'paid_blueprint_enabled'
```

---

### ✅ Stripe Payments Logging

**Table:** `stripe_payments` (schema: `/scripts/migrations/017_create_stripe_payments_table.sql`)  
**Key columns:**
- `stripe_payment_id` (payment_intent or charge ID)
- `stripe_customer_id`, `user_id`
- `amount_cents`, `currency`, `status` (succeeded/failed/refunded)
- `payment_type` (subscription, one_time_session, credit_topup)
- `product_type` (sselfie_studio_membership, one_time_session, credit_topup)
- `metadata` (JSONB)
- `payment_date`, `is_test_mode`

**Logged by:** Webhook handler (not automatically by Stripe). We must add INSERT logic.

---

### ✅ Promo Code Handling (Correct Approach Verified)

**Verified in:** `/app/actions/landing-checkout.ts`, `/app/actions/upgrade-checkout.ts`

**Correct logic:**
1. If `promoCode` provided:
   - First, try `stripe.promotionCodes.list({ code: promoCode.toUpperCase(), active: true })`
   - If found, validate expiration/redemption limits
   - If valid, apply via `discounts: [{ promotion_code: promoCodeId }]`
2. If not found as promotion code:
   - Try `stripe.coupons.retrieve(promoCode.toUpperCase())`
   - If valid coupon, apply via `discounts: [{ coupon: couponId }]`
3. If neither found, throw error: "Invalid promo code"
4. If no promo provided, enable `allow_promotion_codes: true` (lets Stripe show promo field)

**Metadata logging:** If promo applied, store in `session.metadata.promo_code`

**Important:** Do NOT just call `stripe.coupons.retrieve()` directly. Always check promotion codes first (user-facing codes).

---

## 2. USER FLOW (Paid Blueprint)

### Step 1: Free Blueprint Completion

**Location:** `/blueprint` page  
**User actions:**
1. Completes form (business, dream client, struggle, vibe, feed style)
2. Email capture → `POST /api/blueprint/subscribe`
3. Sees "Generate my strategy" button
4. Clicks → `POST /api/blueprint/generate-concepts`
5. Sees text strategy (title + description of 3x3 grid concept)

**Current state:** User sees the concept but NO images. Free blueprint ends here.

---

### Step 2: Paid Blueprint Upgrade Prompt (NEW)

**Location:** After strategy is generated (still on `/blueprint` page)  
**UI:** 
```
✨ Your Brand Blueprint is Ready!

[Text concept shown above]

Ready to see your custom 30-photo library?

[CTA Button] → "Bring My Blueprint to Life - $47"
```

**What happens on click:**
1. Frontend tracks event: `trackCheckoutStart('paid_blueprint', 47)`
2. Redirects to `/checkout/blueprint?email={email}&promo={promo}` (if promo code from URL)

---

### Step 3: Checkout

**Location:** `/app/checkout/blueprint/page.tsx` (NEW PAGE)  
**What it renders:**
- Embedded Stripe checkout
- Calls `createLandingCheckoutSession('paid_blueprint', email, promoCode)`
- Shows product: "SSELFIE Brand Blueprint - 30 Custom Photos" → $47

**User completes payment** → Stripe redirects to `/checkout/success?session_id=xxx`

---

### Step 4: Post-Purchase Redirect

**Location:** `/checkout/success/page.tsx` (existing)  
**Current behavior:** Shows generic success message.

**NEW behavior for paid blueprint:**
- Detect `product_type === 'paid_blueprint'` from session metadata
- Show custom message:
```
✨ Payment Confirmed!

Your 30-photo library is generating now. This takes about 2-3 minutes.

We'll email you when it's ready (check your inbox in 5 minutes).

[CTA Button] → "View My Blueprint" → `/blueprint/paid?access={token}`
```

---

### Step 5: Paid Blueprint Experience

**Location:** `/app/blueprint/paid/page.tsx` (NEW PAGE)  
**Authentication:** Uses `?access={token}` (from blueprint_subscribers.access_token)

**UI shows:**
1. **Progress card:**
   - "Your library is generating..."
   - Progress: "0 of 30 photos complete"
   - Estimated time: "2-3 minutes"
   
2. **What happens next:**
   - "We're creating 30 high-quality photos based on your brand blueprint"
   - "You'll see them appear here in real-time"
   - "You'll also receive an email when complete"

3. **Generate button (explicit trigger):**
   - **Button:** "Generate My 30 Photos"
   - Only shows if `paid_blueprint_generated = FALSE`
   - On click:
     - Calls `POST /api/blueprint/generate-paid`
     - Starts batch generation (3 batches of 10 photos)
     - Shows real-time progress

4. **Gallery (after generation):**
   - Shows all 30 photos in 3x10 grid
   - Download buttons for each
   - "Download All" button

---

### Step 6: Batch Generation Flow (NEW API)

**API:** `POST /api/blueprint/generate-paid`  
**Authentication:** Requires `accessToken` (from blueprint_subscribers.access_token)

**Flow:**
1. Validates access token → gets subscriber record
2. Checks `paid_blueprint_purchased = TRUE` (set by webhook)
3. Checks `paid_blueprint_generated = FALSE` (idempotency)
4. Starts **batch 1** (10 photos):
   - Calls Replicate API with `num_outputs: 10`
   - Sets `paid_blueprint_generation_status = 'batch_1_in_progress'`
   - Returns `{ success: true, status: 'batch_1_started' }`
5. Frontend polls `GET /api/blueprint/get-paid-status?access={token}`
6. When batch 1 completes:
   - Saves URLs to `paid_blueprint_batch_1_urls` (JSONB array)
   - Starts **batch 2** (10 photos)
7. Repeats for batch 3
8. When all complete:
   - Sets `paid_blueprint_generated = TRUE`
   - Sets `paid_blueprint_generated_at = NOW()`
   - Triggers delivery email

**Safety:**
- Idempotent: Won't regenerate if already started
- Retries: If Replicate fails, mark batch as failed and allow retry
- No double credit deduction: Credits already granted via webhook

---

### Step 7: Delivery Email (NEW)

**Trigger:** After all 30 photos generated  
**Email type:** `paid-blueprint-delivery`  
**Subject:** "Your 30 Custom Photos Are Ready! 📸"

**Content:**
- "Your SSELFIE Brand Blueprint is complete!"
- Preview of 3-4 photos
- CTA: "View All 30 Photos" → `/blueprint/paid?access={token}`
- Tracked link with UTM params

**Template:** `/lib/email/templates/paid-blueprint-delivery.tsx` (NEW)

---

### Step 8: Paid Blueprint Email Sequence (Days 1, 3, 7)

**Cron job:** Extend `/app/api/cron/send-blueprint-followups/route.ts`

**NEW emails for paid blueprint buyers:**

**Day 1 (24 hours after purchase):**
- Subject: "5 Ways to Use Your Blueprint Photos This Week"
- Content: Practical tips for using photos (Instagram posts, website, LinkedIn)
- CTA: "Back to My Photos" → tracked link

**Day 3:**
- Subject: "What's Missing? 500 Credits Waiting Inside"
- Content: "Your blueprint photos are just the start. Creator Studio gives you unlimited variations + 500 monthly credits."
- CTA: "Upgrade to Creator Studio" → tracked link with `utm_campaign=blueprint-day-3-upgrade`

**Day 7:**
- Subject: "Creator Studio: From $297 One-Time to $97/Month Unlimited"
- Content: Show value comparison, testimonials
- CTA: "Try Creator Studio" → tracked link

**Important:** Only send to paid blueprint buyers who have NOT upgraded to Studio membership.

**Segment logic:** 
```sql
SELECT email FROM blueprint_subscribers
WHERE paid_blueprint_purchased = TRUE
  AND converted_to_user = FALSE -- Haven't signed up for Studio yet
  AND day_1_paid_email_sent = FALSE
  AND paid_blueprint_purchased_at <= NOW() - INTERVAL '1 day'
```

---

### Step 9: Upsell to Creator Studio

**In-app prompt (on `/blueprint/paid` page):**
- After photos load, show banner:
```
✨ Love your photos? Get unlimited variations

Creator Studio: $97/month
• 500 monthly credits (normally $100)
• Unlimited regenerations
• Pro editing tools

[CTA] → "Upgrade to Studio"
```

**Link:** `/studio?utm_source=blueprint&upgrade=true`

**Tracking:** Track event `trackCTAClick('paid_blueprint_gallery', 'Upgrade to Studio', '/studio')`

---

## 3. IMPLEMENTATION PLAN (PR-SIZED TASKS)

### PR-1: Add Paid Blueprint Product Config & Checkout Route

**Objective:** Add new Stripe product + checkout page

**Files to create:**
- `/app/checkout/blueprint/page.tsx` → Embedded checkout UI

**Files to modify:**
- `/lib/products.ts` → Add `paid_blueprint` product config

**Changes:**

**In `/lib/products.ts`:**
```typescript
export const PRODUCTS = {
  // ... existing products ...
  
  paid_blueprint: {
    id: 'paid_blueprint',
    name: 'SSELFIE Brand Blueprint',
    description: '30 custom photos based on your brand strategy',
    type: 'one_time' as const,
    price: 47,
    stripePriceId: process.env.STRIPE_PAID_BLUEPRINT_PRICE_ID!, // TODO: Create in Stripe Dashboard
    credits: 0, // Credits NOT granted (photos delivered instead)
    features: [
      '30 high-quality custom photos',
      'Based on your brand blueprint',
      'Download all in high-res',
      'Commercial license included',
    ],
  },
}
```

**New file `/app/checkout/blueprint/page.tsx`:**
- Copy pattern from `/app/checkout/one-time/page.tsx`
- Call `createLandingCheckoutSession('paid_blueprint', email, promoCode)`
- Render embedded Stripe checkout

**Acceptance criteria:**
- ✅ Product config added with correct price ID (from Stripe Dashboard)
- ✅ Checkout page renders embedded Stripe checkout
- ✅ Can complete test purchase in Stripe test mode
- ✅ Promo code field appears (if no code pre-applied)
- ✅ Promo code validation works (test with "WELCOME10" coupon in Stripe)

**Testing steps:**
1. Create Stripe product + price in Dashboard (test mode)
2. Add price ID to `.env.local`: `STRIPE_PAID_BLUEPRINT_PRICE_ID=price_xxx`
3. Visit `/checkout/blueprint?email=test@example.com`
4. Complete test purchase with card `4242424242424242`
5. Verify redirects to `/checkout/success`

---

### PR-2: Webhook Support for Paid Blueprint Product Type

**Objective:** Handle `paid_blueprint` purchases in webhook

**Files to modify:**
- `/app/api/webhooks/stripe/route.ts` → Add `paid_blueprint` handler in `checkout.session.completed` case

**Changes (in `checkout.session.completed` handler):**

```typescript
// After line ~136 (where productType is extracted):
const productType = session.metadata.product_type

// Add new case for paid_blueprint:
if (productType === 'paid_blueprint') {
  console.log('[v0] Processing paid blueprint purchase')
  
  // Get blueprint subscriber by email
  const blueprintSubscriber = await sql`
    SELECT id, access_token FROM blueprint_subscribers
    WHERE email = ${customerEmail}
    LIMIT 1
  `
  
  if (blueprintSubscriber.length > 0) {
    const subscriber = blueprintSubscriber[0]
    
    // Mark as purchased
    await sql`
      UPDATE blueprint_subscribers
      SET 
        paid_blueprint_purchased = TRUE,
        paid_blueprint_purchased_at = NOW(),
        paid_blueprint_stripe_payment_id = ${session.payment_intent},
        updated_at = NOW()
      WHERE id = ${subscriber.id}
    `
    
    console.log(`[v0] ✅ Marked blueprint subscriber ${customerEmail} as paid`)
    
    // Tag in Resend
    await updateTags(customerEmail, ['paid-blueprint-customer'])
    
    // Tag in Flodesk
    await tagFlodeskContact(customerEmail, ['paid-blueprint'])
  } else {
    console.warn(`[v0] ⚠️ Paid blueprint purchase but email ${customerEmail} not in blueprint_subscribers`)
  }
  
  // Log to stripe_payments table
  await sql`
    INSERT INTO stripe_payments (
      stripe_payment_id,
      stripe_customer_id,
      user_id,
      amount_cents,
      currency,
      status,
      payment_type,
      product_type,
      description,
      payment_date,
      is_test_mode
    ) VALUES (
      ${session.payment_intent},
      ${session.customer},
      NULL,  -- Not a registered user yet
      ${session.amount_total},
      ${session.currency},
      'succeeded',
      'one_time',
      'paid_blueprint',
      'SSELFIE Brand Blueprint - 30 Custom Photos',
      NOW(),
      ${!event.livemode}
    )
    ON CONFLICT (stripe_payment_id) DO NOTHING
  `
  
  console.log(`[v0] ✅ Logged paid blueprint purchase to stripe_payments`)
}
```

**Acceptance criteria:**
- ✅ Webhook detects `product_type === 'paid_blueprint'`
- ✅ Updates `blueprint_subscribers` with purchase flags
- ✅ Logs to `stripe_payments` table
- ✅ Tags contact in Resend + Flodesk
- ✅ Does NOT grant credits (photos are the product)
- ✅ Handles case where email not in blueprint_subscribers (logs warning)
- ✅ Idempotent (won't double-process if webhook replayed)

**Testing steps:**
1. Complete test purchase via `/checkout/blueprint`
2. Check webhook logs: `vercel logs --follow` or Stripe Dashboard → Webhooks
3. Verify `blueprint_subscribers` updated: `paid_blueprint_purchased = TRUE`
4. Verify `stripe_payments` has new row with `product_type = 'paid_blueprint'`
5. Verify Resend contact tagged with `paid-blueprint-customer`
6. Replay webhook in Stripe Dashboard → verify no duplicate processing

---

### PR-3: Database Schema Updates (Minimal)

**Objective:** Add required columns to `blueprint_subscribers` table

**Files to create:**
- `/scripts/migrations/add-paid-blueprint-columns.sql`

**SQL:**
```sql
-- Add paid blueprint tracking columns
ALTER TABLE blueprint_subscribers
ADD COLUMN IF NOT EXISTS paid_blueprint_purchased BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS paid_blueprint_purchased_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS paid_blueprint_stripe_payment_id TEXT,
ADD COLUMN IF NOT EXISTS paid_blueprint_generation_status TEXT, -- 'pending', 'batch_1_in_progress', 'batch_2_in_progress', 'batch_3_in_progress', 'completed', 'failed'
ADD COLUMN IF NOT EXISTS paid_blueprint_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS paid_blueprint_generated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS paid_blueprint_batch_1_urls JSONB, -- Array of 10 URLs
ADD COLUMN IF NOT EXISTS paid_blueprint_batch_2_urls JSONB,
ADD COLUMN IF NOT EXISTS paid_blueprint_batch_3_urls JSONB,
ADD COLUMN IF NOT EXISTS paid_blueprint_generation_error TEXT,
ADD COLUMN IF NOT EXISTS day_1_paid_email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS day_1_paid_email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS day_3_paid_email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS day_3_paid_email_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS day_7_paid_email_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS day_7_paid_email_sent_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for paid blueprint queries
CREATE INDEX IF NOT EXISTS idx_blueprint_paid_purchased ON blueprint_subscribers(paid_blueprint_purchased) WHERE paid_blueprint_purchased = TRUE;
CREATE INDEX IF NOT EXISTS idx_blueprint_paid_generated ON blueprint_subscribers(paid_blueprint_generated) WHERE paid_blueprint_generated = FALSE;
CREATE INDEX IF NOT EXISTS idx_blueprint_paid_email_day1 ON blueprint_subscribers(day_1_paid_email_sent, paid_blueprint_purchased_at) WHERE paid_blueprint_purchased = TRUE AND day_1_paid_email_sent = FALSE;

COMMENT ON COLUMN blueprint_subscribers.paid_blueprint_purchased IS 'TRUE if user purchased the $47 paid blueprint';
COMMENT ON COLUMN blueprint_subscribers.paid_blueprint_generation_status IS 'Current generation status: pending, batch_1_in_progress, batch_2_in_progress, batch_3_in_progress, completed, failed';
COMMENT ON COLUMN blueprint_subscribers.paid_blueprint_batch_1_urls IS 'Array of 10 photo URLs from first batch';
```

**Acceptance criteria:**
- ✅ Migration runs without errors
- ✅ All columns added with correct types
- ✅ Indexes created
- ✅ Existing rows have default values (FALSE, NULL)

**Testing steps:**
1. Run migration: `psql $DATABASE_URL < scripts/migrations/add-paid-blueprint-columns.sql`
2. Verify schema: `\d blueprint_subscribers`
3. Check indexes: `\di blueprint_*`
4. Query test: `SELECT paid_blueprint_purchased, paid_blueprint_generation_status FROM blueprint_subscribers LIMIT 1;`

---

### PR-4: Paid Blueprint Generation API (Batch-Safe)

**Objective:** Create API to generate 30 photos in 3 batches of 10

**Files to create:**
- `/app/api/blueprint/generate-paid/route.ts` → Start generation
- `/app/api/blueprint/get-paid-status/route.ts` → Poll generation status
- `/lib/blueprint/paid-blueprint.ts` → Helper functions (engine-lite)

**New file `/lib/blueprint/paid-blueprint.ts`:**
```typescript
/**
 * Paid Blueprint Helper Functions (Engine-Lite)
 * 
 * Minimal helpers for paid blueprint generation.
 * No state machine abstraction - just utility functions.
 */

import { neon } from '@/lib/db'
import { getReplicateClient } from '@/lib/replicate-client'

const sql = neon(process.env.DATABASE_URL!)

export interface PaidBlueprintStatus {
  purchased: boolean
  generated: boolean
  status: 'pending' | 'batch_1_in_progress' | 'batch_2_in_progress' | 'batch_3_in_progress' | 'completed' | 'failed'
  batch1Urls: string[] | null
  batch2Urls: string[] | null
  batch3Urls: string[] | null
  totalPhotos: number
  error?: string
}

export async function getPaidBlueprintStatus(accessToken: string): Promise<PaidBlueprintStatus | null> {
  const [subscriber] = await sql`
    SELECT 
      paid_blueprint_purchased,
      paid_blueprint_generated,
      paid_blueprint_generation_status,
      paid_blueprint_batch_1_urls,
      paid_blueprint_batch_2_urls,
      paid_blueprint_batch_3_urls,
      paid_blueprint_generation_error
    FROM blueprint_subscribers
    WHERE access_token = ${accessToken}
    LIMIT 1
  `
  
  if (!subscriber) return null
  
  const batch1 = subscriber.paid_blueprint_batch_1_urls || []
  const batch2 = subscriber.paid_blueprint_batch_2_urls || []
  const batch3 = subscriber.paid_blueprint_batch_3_urls || []
  
  return {
    purchased: subscriber.paid_blueprint_purchased || false,
    generated: subscriber.paid_blueprint_generated || false,
    status: subscriber.paid_blueprint_generation_status || 'pending',
    batch1Urls: batch1.length > 0 ? batch1 : null,
    batch2Urls: batch2.length > 0 ? batch2 : null,
    batch3Urls: batch3.length > 0 ? batch3 : null,
    totalPhotos: batch1.length + batch2.length + batch3.length,
    error: subscriber.paid_blueprint_generation_error,
  }
}

export async function startPaidBlueprintGeneration(accessToken: string): Promise<{ success: boolean, error?: string }> {
  // Get subscriber
  const [subscriber] = await sql`
    SELECT id, email, paid_blueprint_purchased, paid_blueprint_generated, strategy_data
    FROM blueprint_subscribers
    WHERE access_token = ${accessToken}
    LIMIT 1
  `
  
  if (!subscriber) {
    return { success: false, error: 'Invalid access token' }
  }
  
  if (!subscriber.paid_blueprint_purchased) {
    return { success: false, error: 'Paid blueprint not purchased' }
  }
  
  if (subscriber.paid_blueprint_generated) {
    return { success: false, error: 'Already generated' }
  }
  
  // Mark as in progress
  await sql`
    UPDATE blueprint_subscribers
    SET 
      paid_blueprint_generation_status = 'batch_1_in_progress',
      updated_at = NOW()
    WHERE id = ${subscriber.id}
  `
  
  // Start batch 1 generation (10 photos)
  // TODO: Call Replicate API with strategy_data.prompt
  // For now, just mark as started
  
  return { success: true }
}
```

**New file `/app/api/blueprint/generate-paid/route.ts`:**
```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { startPaidBlueprintGeneration } from '@/lib/blueprint/paid-blueprint'

export async function POST(req: NextRequest) {
  try {
    const { accessToken } = await req.json()
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 })
    }
    
    const result = await startPaidBlueprintGeneration(accessToken)
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    
    return NextResponse.json({ success: true, message: 'Generation started' })
  } catch (error) {
    console.error('[Blueprint] Error starting paid generation:', error)
    return NextResponse.json({ error: 'Failed to start generation' }, { status: 500 })
  }
}
```

**New file `/app/api/blueprint/get-paid-status/route.ts`:**
```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { getPaidBlueprintStatus } from '@/lib/blueprint/paid-blueprint'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const accessToken = searchParams.get('access')
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 })
    }
    
    const status = await getPaidBlueprintStatus(accessToken)
    
    if (!status) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 404 })
    }
    
    return NextResponse.json({ success: true, status })
  } catch (error) {
    console.error('[Blueprint] Error getting paid status:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
```

**Acceptance criteria:**
- ✅ API validates access token
- ✅ API checks `paid_blueprint_purchased = TRUE`
- ✅ API prevents double generation (idempotent)
- ✅ API marks status as `batch_1_in_progress`
- ✅ Status API returns current progress
- ✅ Handles errors gracefully

**Testing steps:**
1. Create test subscriber with `paid_blueprint_purchased = TRUE`
2. Call `POST /api/blueprint/generate-paid` with `accessToken`
3. Verify status updated: `paid_blueprint_generation_status = 'batch_1_in_progress'`
4. Call `GET /api/blueprint/get-paid-status?access={token}`
5. Verify returns status: `{ purchased: true, generated: false, status: 'batch_1_in_progress', totalPhotos: 0 }`
6. Try calling generate again → should return error: "Already started"

---

### PR-5: Paid Blueprint UI Page + Progress Tracking

**Objective:** Create UI for paid blueprint experience

**Files to create:**
- `/app/blueprint/paid/page.tsx` → Main paid blueprint page

**New file `/app/blueprint/paid/page.tsx`:**
- Uses `?access={token}` from URL
- Polls `GET /api/blueprint/get-paid-status` every 5 seconds
- Shows:
  - Progress card (0 of 30 photos)
  - "Generate My 30 Photos" button (if not generated)
  - Real-time gallery (as photos complete)
  - Download buttons
  - Upgrade CTA (to Creator Studio)

**Acceptance criteria:**
- ✅ Page authenticates via access token
- ✅ Shows "Generate" button if not started
- ✅ Button calls `POST /api/blueprint/generate-paid`
- ✅ Polls status every 5 seconds during generation
- ✅ Updates progress UI in real-time
- ✅ Shows photos as they complete
- ✅ Disables generate button after click (prevents double-click)
- ✅ Shows error if generation fails
- ✅ Tracks analytics: `trackEvent('paid_blueprint_generate_clicked')`

**Testing steps:**
1. Complete paid blueprint purchase
2. Visit `/blueprint/paid?access={token}` (get token from blueprint_subscribers)
3. Click "Generate My 30 Photos"
4. Verify status polling starts
5. Verify progress updates as batches complete
6. Verify photos load in gallery

---

### PR-6: Delivery Email + Email Templates

**Objective:** Send delivery email when generation completes

**Files to create:**
- `/lib/email/templates/paid-blueprint-delivery.tsx` → Email template
- `/lib/blueprint/paid-blueprint.ts` → Add `sendDeliveryEmail()` helper

**Email template (React Email):**
```tsx
import { Button, Html, Text } from '@react-email/components'

export function generatePaidBlueprintDeliveryEmail({
  firstName,
  accessToken,
  photoPreviewUrls,
}: {
  firstName?: string
  accessToken: string
  photoPreviewUrls: string[] // First 4 photos for preview
}) {
  const name = firstName || 'there'
  const viewUrl = `https://sselfie.ai/blueprint/paid?access=${accessToken}`
  
  return {
    html: `
      <h1>Your 30 Custom Photos Are Ready! 📸</h1>
      <p>Hey ${name},</p>
      <p>Your SSELFIE Brand Blueprint is complete!</p>
      <p>All 30 of your custom photos are ready to download.</p>
      
      <!-- Show 4 preview photos -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        ${photoPreviewUrls.slice(0, 4).map(url => `
          <img src="${url}" style="width: 100%; border-radius: 8px;" />
        `).join('')}
      </div>
      
      <p><a href="${viewUrl}" style="background: black; color: white; padding: 12px 24px; border-radius: 8px;">View All 30 Photos</a></p>
      
      <p>Next steps:</p>
      <ul>
        <li>Download all photos (high-res)</li>
        <li>Use them across Instagram, website, LinkedIn</li>
        <li>Want unlimited variations? Upgrade to Creator Studio ($97/mo)</li>
      </ul>
    `,
    text: `Your 30 Custom Photos Are Ready!
    
Hey ${name},

Your SSELFIE Brand Blueprint is complete! All 30 of your custom photos are ready to download.

View your photos: ${viewUrl}

Next steps:
- Download all photos (high-res)
- Use them across Instagram, website, LinkedIn
- Want unlimited variations? Upgrade to Creator Studio ($97/mo)
    `,
  }
}
```

**Trigger logic (add to generation completion):**
```typescript
// After batch 3 completes:
await sendEmail({
  to: subscriber.email,
  subject: 'Your 30 Custom Photos Are Ready! 📸',
  html: emailContent.html,
  text: emailContent.text,
  from: 'Sandra from SSELFIE <hello@sselfie.ai>',
  emailType: 'paid-blueprint-delivery',
})
```

**Acceptance criteria:**
- ✅ Email template renders correctly in React Email
- ✅ Preview photos display (4 thumbnails)
- ✅ CTA link includes access token
- ✅ Link is tracked with UTM params
- ✅ Email sent automatically when generation completes
- ✅ Email logged to `email_logs` table

**Testing steps:**
1. Complete paid blueprint generation
2. Check inbox for delivery email
3. Verify preview photos load
4. Click "View All 30 Photos" → verify redirects to `/blueprint/paid?access={token}`
5. Check `email_logs` table for delivery record

---

### PR-7: Paid Blueprint Email Sequence (Days 1, 3, 7)

**Objective:** Extend cron job to send follow-up emails to paid buyers

**Files to modify:**
- `/app/api/cron/send-blueprint-followups/route.ts` → Add paid blueprint email logic

**Files to create:**
- `/lib/email/templates/paid-blueprint-day-1.tsx`
- `/lib/email/templates/paid-blueprint-day-3-upgrade.tsx`
- `/lib/email/templates/paid-blueprint-day-7-upgrade.tsx`

**Changes in cron job (append after Day 14 logic):**
```typescript
// Day 1 email for PAID blueprint buyers: "5 Ways to Use Your Blueprint Photos"
const day1PaidSubscribers = await sql`
  SELECT bs.id, bs.email, bs.name, bs.access_token
  FROM blueprint_subscribers bs
  LEFT JOIN email_logs el ON el.user_email = bs.email AND el.email_type = 'paid-blueprint-day-1'
  WHERE bs.day_1_paid_email_sent = FALSE
    AND bs.paid_blueprint_purchased = TRUE
    AND bs.paid_blueprint_purchased_at <= NOW() - INTERVAL '1 day'
    AND bs.paid_blueprint_purchased_at > NOW() - INTERVAL '2 days'
    AND el.id IS NULL
  ORDER BY bs.paid_blueprint_purchased_at ASC
`

results.day1Paid = { found: day1PaidSubscribers.length, sent: 0, failed: 0, skipped: 0 }

for (const subscriber of day1PaidSubscribers) {
  try {
    // Check if already sent
    const existingLog = await sql`
      SELECT id FROM email_logs
      WHERE user_email = ${subscriber.email} AND email_type = 'paid-blueprint-day-1'
      LIMIT 1
    `
    if (existingLog.length > 0) {
      results.day1Paid.skipped++
      continue
    }

    const firstName = subscriber.name?.split(' ')[0] || undefined
    const emailContent = generatePaidBlueprintDay1Email({
      firstName,
      email: subscriber.email,
      accessToken: subscriber.access_token,
    })

    const sendResult = await sendEmail({
      to: subscriber.email,
      subject: '5 Ways to Use Your Blueprint Photos This Week',
      html: emailContent.html,
      text: emailContent.text,
      from: 'Sandra from SSELFIE <hello@sselfie.ai>',
      emailType: 'paid-blueprint-day-1',
    })

    if (sendResult.success) {
      await sql`
        UPDATE blueprint_subscribers
        SET day_1_paid_email_sent = TRUE, day_1_paid_email_sent_at = NOW(), updated_at = NOW()
        WHERE id = ${subscriber.id}
      `
      results.day1Paid.sent++
    } else {
      throw new Error(sendResult.error || 'Failed to send')
    }
  } catch (error: any) {
    results.day1Paid.failed++
    console.error(`[CRON] Failed Day 1 paid email to ${subscriber.email}:`, error)
  }
}

// Repeat for Day 3 and Day 7 (with upgrade CTAs)
```

**Email templates:**
- **Day 1:** "5 Ways to Use Your Blueprint Photos" (practical tips, no upgrade CTA)
- **Day 3:** "What's Missing? 500 Credits Waiting Inside" (soft upgrade CTA)
- **Day 7:** "From $47 One-Time to $97/Month Unlimited" (hard upgrade CTA with value comparison)

**Acceptance criteria:**
- ✅ Cron job detects paid blueprint buyers
- ✅ Sends Day 1, 3, 7 emails at correct intervals
- ✅ Deduplicates via `email_logs` table
- ✅ Only sends to users who haven't upgraded to Studio
- ✅ Marks email flags after sending
- ✅ Tracks clicks via UTM params

**Testing steps:**
1. Create test subscriber with `paid_blueprint_purchased = TRUE, paid_blueprint_purchased_at = NOW() - INTERVAL '1 day'`
2. Run cron manually: `curl -X GET http://localhost:3000/api/cron/send-blueprint-followups -H "Authorization: Bearer {CRON_SECRET}"`
3. Verify Day 1 email sent
4. Check `email_logs` for delivery record
5. Update `paid_blueprint_purchased_at` to 3 days ago, rerun cron
6. Verify Day 3 email sent

---

### PR-8: Analytics Events + Conversion Tracking

**Objective:** Track key conversion events

**Files to modify:**
- `/app/checkout/blueprint/page.tsx` → Track checkout start
- `/app/checkout/success/page.tsx` → Track purchase completion (if paid blueprint)
- `/app/blueprint/paid/page.tsx` → Track generation start, completion, upgrade CTA clicks

**Events to add:**

**1. Checkout initiated:**
```typescript
trackCheckoutStart('paid_blueprint', 47)
trackEvent('paid_blueprint_checkout_start', {
  source: 'free_blueprint_cta',
  email: userEmail,
})
```

**2. Purchase completed:**
```typescript
// In /checkout/success/page.tsx, after detecting paid_blueprint:
trackPurchase(47, 'USD', [{ item_id: 'paid_blueprint', item_name: 'SSELFIE Brand Blueprint' }])
trackEvent('paid_blueprint_purchase_complete', {
  transaction_id: sessionId,
  value: 47,
})
```

**3. Generation started:**
```typescript
// When user clicks "Generate My 30 Photos":
trackEvent('paid_blueprint_generate_start', {
  access_token: accessToken,
})
```

**4. Generation completed:**
```typescript
// When all 30 photos load:
trackEvent('paid_blueprint_generate_complete', {
  total_photos: 30,
  generation_time: elapsed,
})
```

**5. Upgrade CTA clicked:**
```typescript
// When user clicks "Upgrade to Studio" from paid blueprint page:
trackCTAClick('paid_blueprint_gallery', 'Upgrade to Creator Studio', '/studio')
trackEvent('paid_blueprint_upgrade_click', {
  source: 'paid_blueprint',
})
```

**Acceptance criteria:**
- ✅ All events fire at correct moments
- ✅ Events visible in Google Analytics 4 Real-Time view
- ✅ Facebook Pixel events fire for checkout + purchase
- ✅ Events include correct parameters
- ✅ No duplicate events on page refresh

**Testing steps:**
1. Open browser console → Network tab
2. Complete full funnel (checkout → generate → view photos)
3. Verify GA4 events in Real-Time (Google Analytics dashboard)
4. Verify Facebook Pixel events in Events Manager (Meta dashboard)
5. Check console logs for `[Analytics] Tracked event: xxx`

---

### PR-9: Success Page Customization for Paid Blueprint

**Objective:** Show custom success message for paid blueprint buyers

**Files to modify:**
- `/app/checkout/success/page.tsx` → Detect `product_type` and show custom UI

**Changes:**
```typescript
// After fetching session:
const productType = session.metadata?.product_type

if (productType === 'paid_blueprint') {
  // Get access token from blueprint_subscribers
  const [subscriber] = await sql`
    SELECT access_token FROM blueprint_subscribers WHERE email = ${session.customer_details.email} LIMIT 1
  `
  
  return (
    <div>
      <h1>✨ Payment Confirmed!</h1>
      <p>Your 30-photo library is generating now. This takes about 2-3 minutes.</p>
      <p>We'll email you when it's ready (check your inbox in 5 minutes).</p>
      <Button href={`/blueprint/paid?access=${subscriber?.access_token}`}>
        View My Blueprint
      </Button>
    </div>
  )
}

// Otherwise, show default success message
```

**Acceptance criteria:**
- ✅ Detects `product_type === 'paid_blueprint'` from session metadata
- ✅ Shows custom message (not generic "Thanks for your purchase")
- ✅ Includes CTA button to `/blueprint/paid?access={token}`
- ✅ Handles case where access token not found (fallback to email)

**Testing steps:**
1. Complete paid blueprint purchase
2. Verify redirect to `/checkout/success?session_id=xxx`
3. Verify custom message displays
4. Click "View My Blueprint" → verify redirects correctly

---

### PR-10: Segment Logic for Paid Blueprint Buyers

**Objective:** Create segments for targeting paid blueprint buyers in email campaigns

**Files to modify:**
- `/lib/email/segmentation.ts` → Add `paid_blueprint_buyers` segment

**New segment:**
```typescript
// Add to refreshUserSegments():

// Paid Blueprint Buyers (Not Upgraded to Studio)
const paidBlueprintBuyers = await sql`
  SELECT DISTINCT bs.email
  FROM blueprint_subscribers bs
  WHERE bs.paid_blueprint_purchased = TRUE
    AND bs.converted_to_user = FALSE  -- Haven't signed up for Studio
    AND bs.created_at > NOW() - INTERVAL '90 days'  -- Recent buyers only
`

for (const row of paidBlueprintBuyers) {
  await sql`
    INSERT INTO user_segments (email, segment, updated_at)
    VALUES (${row.email}, 'paid_blueprint_buyers', NOW())
    ON CONFLICT (email, segment) DO UPDATE SET updated_at = NOW()
  `
}
```

**Acceptance criteria:**
- ✅ Segment refreshes daily via cron
- ✅ Only includes paid blueprint buyers who haven't upgraded
- ✅ Can be used for targeted email campaigns
- ✅ Excludes users older than 90 days (prevents stale data)

**Testing steps:**
1. Run segment refresh: `curl -X GET http://localhost:3000/api/cron/refresh-segments -H "Authorization: Bearer {CRON_SECRET}"`
2. Query segments: `SELECT * FROM user_segments WHERE segment = 'paid_blueprint_buyers'`
3. Verify correct users included

---

### PR-11: Feature Flag for Paid Blueprint Launch

**Objective:** Gate paid blueprint launch behind feature flag

**Implementation:**
```sql
INSERT INTO admin_feature_flags (flag_name, enabled, description)
VALUES ('paid_blueprint_enabled', FALSE, 'Enable $47 Paid Brand Blueprint mini product')
ON CONFLICT (flag_name) DO NOTHING;
```

**Where to check flag:**
- `/app/blueprint/page.tsx` → Show upgrade CTA only if flag enabled
- `/app/checkout/blueprint/page.tsx` → Return 404 if flag disabled

**Example:**
```typescript
const [flag] = await sql`SELECT enabled FROM admin_feature_flags WHERE flag_name = 'paid_blueprint_enabled'`
const enabled = flag?.enabled || false

if (!enabled) {
  return notFound()
}
```

**Acceptance criteria:**
- ✅ Flag controls visibility of paid blueprint CTA
- ✅ Flag controls access to checkout page
- ✅ Can enable/disable via admin panel
- ✅ Default: disabled (until launch)

**Testing steps:**
1. Set flag to `FALSE`
2. Visit `/blueprint` → verify paid CTA hidden
3. Visit `/checkout/blueprint` → verify 404
4. Set flag to `TRUE` (via SQL or admin panel)
5. Verify CTA appears and checkout accessible

---

## 4. RISK & EDGE CASES

### Risk 1: User Already Has Studio Account

**Scenario:** User completes free blueprint, then signs up for Studio membership ($97/mo), THEN tries to buy paid blueprint.

**Mitigation:**
- In checkout page, check if user has active Studio membership
- If yes, redirect to `/studio` with message: "You already have unlimited access!"
- Do NOT allow purchase (paid blueprint is inferior to Studio)

**Code check (in `/app/checkout/blueprint/page.tsx`):**
```typescript
const [membership] = await sql`
  SELECT id FROM subscriptions WHERE user_email = ${email} AND status = 'active' LIMIT 1
`
if (membership) {
  redirect('/studio?message=already_member')
}
```

---

### Risk 2: User Already Purchased Paid Blueprint

**Scenario:** User completes purchase, then clicks "Buy Again" link (from email or bookmark).

**Mitigation:**
- In checkout page, check if `paid_blueprint_purchased = TRUE`
- If yes, redirect to `/blueprint/paid?access={token}` with message: "You already own this!"

**Code check:**
```typescript
const [subscriber] = await sql`
  SELECT paid_blueprint_purchased, access_token FROM blueprint_subscribers WHERE email = ${email} LIMIT 1
`
if (subscriber?.paid_blueprint_purchased) {
  redirect(`/blueprint/paid?access=${subscriber.access_token}`)
}
```

---

### Risk 3: User Has Existing Credits (Don't Reset)

**Scenario:** User signs up for Studio membership (500 credits), uses 100, then buys paid blueprint.

**Mitigation:**
- Paid blueprint does NOT grant credits (photos are the product)
- Webhook should NOT touch `users.credits_balance`
- User keeps existing credits

**Safety:** Already handled by NOT calling `addCredits()` in webhook for `product_type === 'paid_blueprint'`.

---

### Risk 4: Partial Generation Failure Midway

**Scenario:** Batch 1 succeeds (10 photos), Batch 2 fails (Replicate API error), Batch 3 never starts.

**Mitigation:**
- Mark status as `failed` with error message
- Save Batch 1 URLs (don't lose completed work)
- Show "Retry" button on frontend
- Retry button calls `POST /api/blueprint/retry-generation` (starts from failed batch)

**UI:**
```
⚠️ Generation paused

We generated 10 of 30 photos, but encountered an error.
Don't worry - your photos are safe!

[Retry Generation] button
```

**Code:**
```typescript
// In generation logic:
try {
  // Start batch 2
} catch (error) {
  await sql`
    UPDATE blueprint_subscribers
    SET 
      paid_blueprint_generation_status = 'failed',
      paid_blueprint_generation_error = ${error.message},
      updated_at = NOW()
    WHERE id = ${subscriberId}
  `
  // Don't throw - allow retry
}
```

---

### Risk 5: User Refreshes/Retries During Generation (Idempotency)

**Scenario:** User clicks "Generate" button, then refreshes page and clicks again.

**Mitigation:**
- Check `paid_blueprint_generation_status` before starting
- If status is NOT `pending`, return error: "Already in progress"
- Button disabled after first click (client-side)

**Code (already in helper):**
```typescript
if (subscriber.paid_blueprint_generated) {
  return { success: false, error: 'Already generated' }
}
```

---

### Risk 6: Webhook Replay (Double Processing)

**Scenario:** Stripe replays `checkout.session.completed` webhook (network retry).

**Mitigation:**
- Idempotency table already exists (`webhook_events`)
- Webhook handler checks for duplicate `stripe_event_id` before processing
- Database constraints: `UNIQUE(stripe_payment_id)` in `stripe_payments`

**Safety:** Already handled by existing webhook deduplication logic.

---

### Risk 7: Refunds (Credit Reversal)

**Scenario:** User purchases paid blueprint, generates photos, then requests refund.

**Current behavior:** `charge.refunded` webhook reverses credits (if any were granted).

**For paid blueprint:**
- NO credits granted, so no credit reversal needed
- BUT: Should we revoke access to photos?

**Decision:**
- Do NOT revoke access (photos already downloaded)
- Do NOT delete photo URLs (user keeps them)
- Mark `paid_blueprint_refunded = TRUE` (for tracking)
- Notify admin (via `logAdminError()`)

**Webhook addition:**
```typescript
case 'charge.refunded': {
  // ... existing credit reversal logic ...
  
  // Check if refund is for paid blueprint
  const [payment] = await sql`
    SELECT id, product_type FROM stripe_payments 
    WHERE stripe_payment_id = ${charge.payment_intent}
    LIMIT 1
  `
  
  if (payment?.product_type === 'paid_blueprint') {
    // Mark as refunded
    await sql`
      UPDATE blueprint_subscribers
      SET paid_blueprint_refunded = TRUE, updated_at = NOW()
      WHERE paid_blueprint_stripe_payment_id = ${charge.payment_intent}
    `
    
    // Alert admin
    await logAdminError({
      toolName: 'stripe-webhook-refund-paid-blueprint',
      error: new Error('Paid blueprint refunded'),
      context: { chargeId: charge.id, email: charge.billing_details.email },
    })
  }
}
```

---

### Risk 8: Email Not in Blueprint Subscribers

**Scenario:** User goes directly to `/checkout/blueprint?email=new@example.com` (email not in database).

**Mitigation:**
- In checkout page, validate email exists in `blueprint_subscribers`
- If not, redirect to `/blueprint` with message: "Complete your free blueprint first"

**Code check:**
```typescript
const [subscriber] = await sql`
  SELECT id FROM blueprint_subscribers WHERE email = ${email} LIMIT 1
`
if (!subscriber) {
  redirect('/blueprint?message=complete_free_first')
}
```

---

### Risk 9: Promo Code Abuse

**Scenario:** User creates multiple emails to use promo code repeatedly.

**Mitigation:**
- Stripe handles redemption limits (set when creating coupon/promotion code)
- Set max redemptions in Stripe Dashboard (e.g., 100 uses total)
- Set redemptions per customer (e.g., 1 use per customer ID)

**Recommendation:** For launch promo "BLUEPRINT10" (10% off):
```
Max redemptions: 100
Redemptions per customer: 1
Valid for: 30 days
```

---

### Risk 10: Stripe Product Not Created in Production

**Scenario:** Deploy to production but forget to create Stripe product + price.

**Mitigation:**
- Create checklist (see "Done" section below)
- Add environment variable validation in code
- If `STRIPE_PAID_BLUEPRINT_PRICE_ID` missing, show error in admin dashboard

**Code validation:**
```typescript
if (!process.env.STRIPE_PAID_BLUEPRINT_PRICE_ID) {
  console.error('⚠️ STRIPE_PAID_BLUEPRINT_PRICE_ID not set!')
  // Could add to admin diagnostics page
}
```

---

## 5. "DONE" CHECKLIST (For Paid Blueprint)

### ✅ Pre-Launch Setup

- [ ] Create Stripe product in Dashboard (test mode):
  - Product name: "SSELFIE Brand Blueprint"
  - Description: "30 custom photos based on your brand strategy"
  - Price: $47 one-time
  - Copy price ID → `.env.local`
  
- [ ] Create Stripe product in Dashboard (production mode):
  - Same details as test mode
  - Copy price ID → Vercel environment variables
  
- [ ] Create promo code in Stripe (optional):
  - Code: "BLUEPRINT10"
  - Discount: 10% off
  - Max redemptions: 100
  - Valid for: 30 days
  
- [ ] Run database migration:
  - `psql $DATABASE_URL < scripts/migrations/add-paid-blueprint-columns.sql`
  
- [ ] Create feature flag:
  - `INSERT INTO admin_feature_flags (flag_name, enabled) VALUES ('paid_blueprint_enabled', FALSE)`
  
- [ ] Set environment variables (production):
  - `STRIPE_PAID_BLUEPRINT_PRICE_ID=price_xxx`

---

### ✅ Checkout Works

- [ ] Visit `/checkout/blueprint?email=test@example.com`
- [ ] Stripe embedded checkout renders
- [ ] Can complete test purchase (card: 4242 4242 4242 4242)
- [ ] Redirects to `/checkout/success?session_id=xxx`
- [ ] Success page shows custom message ("Your 30-photo library is generating...")
- [ ] Promo code field appears (if no code pre-applied)
- [ ] Promo code "BLUEPRINT10" validates and applies discount
- [ ] Invalid promo code shows error

**Rollback:** Disable feature flag → sets `paid_blueprint_enabled = FALSE`

---

### ✅ Credits OK

- [ ] Webhook fires after test purchase
- [ ] Webhook logs show: "Processing paid blueprint purchase"
- [ ] `blueprint_subscribers` updated: `paid_blueprint_purchased = TRUE`
- [ ] `stripe_payments` table has new row with `product_type = 'paid_blueprint'`
- [ ] User's `credits_balance` NOT affected (paid blueprint doesn't grant credits)
- [ ] Resend contact tagged with `paid-blueprint-customer`
- [ ] Flodesk contact tagged with `paid-blueprint`

**Rollback:** Manually set `paid_blueprint_purchased = FALSE` in database for test users

---

### ✅ Generation OK

- [ ] Visit `/blueprint/paid?access={token}` (get token from database)
- [ ] "Generate My 30 Photos" button appears
- [ ] Click button → generation starts
- [ ] Status polling works (updates every 5 seconds)
- [ ] Progress shows: "0 of 30 photos complete" → "10 of 30" → "20 of 30" → "30 of 30"
- [ ] Photos appear in gallery as they complete
- [ ] Download buttons work for each photo
- [ ] "Download All" button works (zips all 30 photos)
- [ ] Generation completes within 5 minutes
- [ ] If Replicate fails, shows error message with "Retry" button

**Rollback:** Set `paid_blueprint_generation_status = 'pending'` and `paid_blueprint_generated = FALSE` to allow retry

---

### ✅ Emails OK

- [ ] Delivery email sent after generation completes
- [ ] Email subject: "Your 30 Custom Photos Are Ready! 📸"
- [ ] Email includes 4 preview photos
- [ ] CTA link works: "View All 30 Photos" → `/blueprint/paid?access={token}`
- [ ] Link has UTM params: `utm_source=email&utm_medium=email`
- [ ] Email logged to `email_logs` table
- [ ] Day 1 email sent 24 hours after purchase
- [ ] Day 3 email sent 3 days after purchase (with upgrade CTA)
- [ ] Day 7 email sent 7 days after purchase (with upgrade CTA)
- [ ] Emails only sent to users who haven't upgraded to Studio
- [ ] No duplicate emails (deduplication works)

**Rollback:** Use email kill switch → `UPDATE email_control SET email_sending_enabled = FALSE`

---

### ✅ Analytics OK

- [ ] Google Analytics 4 events visible in Real-Time dashboard:
  - `paid_blueprint_checkout_start`
  - `paid_blueprint_purchase_complete`
  - `paid_blueprint_generate_start`
  - `paid_blueprint_generate_complete`
  - `paid_blueprint_upgrade_click`
- [ ] Facebook Pixel events visible in Events Manager:
  - `InitiateCheckout`
  - `Purchase` (value: 47)
- [ ] Event parameters include correct data (transaction ID, value, etc.)
- [ ] No duplicate events on page refresh

**Rollback:** N/A (analytics are non-critical for functionality)

---

### ✅ Rollback OK

**Option 1: Feature Flag (Instant)**
```sql
UPDATE admin_feature_flags SET enabled = FALSE WHERE flag_name = 'paid_blueprint_enabled';
```
- Hides paid blueprint CTA from free blueprint page
- Blocks access to `/checkout/blueprint` (returns 404)
- Existing paid users can still access `/blueprint/paid`

**Option 2: Stripe Price Deactivation (Slower)**
- Deactivate price in Stripe Dashboard
- Prevents new purchases
- Doesn't affect existing paid users

**Option 3: Emergency Rollback (Git)**
```bash
git revert {commit-hash}
git push origin main
vercel deploy --prod
```
- Full code rollback
- Takes 2-3 minutes to deploy

---

## 6. SUMMARY

This plan creates Paid Brand Blueprint ($47 one-time) using **engine-lite approach**:

**Reusing existing infrastructure:**
- ✅ `blueprint_subscribers` table (add 11 columns)
- ✅ Email sending system (`send-email.ts`)
- ✅ Stripe checkout flow (`landing-checkout.ts`)
- ✅ Webhook handler (add `paid_blueprint` case)
- ✅ Email cron job (extend for paid sequences)
- ✅ Analytics tracking (add new events)
- ✅ Feature flags (add `paid_blueprint_enabled`)

**NOT building:**
- ❌ No "BlueprintMonetizationEngine" abstraction
- ❌ No state machine
- ❌ No auto-generation on page load
- ❌ No new database tables

**Implementation size:** 11 PRs, ~2,500 lines of new code

**Timeline estimate:** 
- Week 1: PRs 1-6 (checkout + webhook + generation)
- Week 2: PRs 7-11 (emails + analytics + polish)
- Week 3: Testing + launch

**Revenue target:** $3-5K in first 30 days (60-100 purchases @ $47)

---

## NEXT STEPS

1. ✅ Review this plan with Sandra
2. ✅ Get approval on pricing ($47) and product positioning
3. ✅ Create Stripe product + price (test mode)
4. ✅ Start PR-1 (product config + checkout route)
5. ✅ Deploy to staging for internal testing
6. ✅ Create launch promo code "BLUEPRINT10" (10% off)
7. ✅ Enable feature flag → launch! 🚀

---

**Questions? Concerns?** → Tag Sandra for review.

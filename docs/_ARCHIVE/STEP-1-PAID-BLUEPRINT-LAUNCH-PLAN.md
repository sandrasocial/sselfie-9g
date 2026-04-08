# STEP 1: PAID BLUEPRINT QUIET LAUNCH PLAN
**Date:** 2026-01-09  
**Goal:** Complete Paid Blueprint emails + free→paid CTA + quiet ship  
**Timeline:** This week (3-4 days)

---

## ✅ FINDINGS: WHAT EXISTS TODAY

### A) Paid Blueprint Purchase + Access Flow

#### 1. Product Configuration
**File:** `/lib/products.ts`  
**Lines:** 74-81  
**Status:** ✅ Complete

```74:81:lib/products.ts
    id: "paid_blueprint",
    name: "Brand Blueprint - Paid",
    displayName: "SSELFIE Brand Blueprint",
    description: "30 custom photos based on your brand strategy",
    priceInCents: 4700, // $47 one-time
    type: "paid_blueprint",
    credits: 0
```

**Evidence:**
- Product defined in `PRICING_PRODUCTS` array
- Price: $47 (matches decision)
- Type: `paid_blueprint`
- Credits: 0 (correct - photos are the product)

#### 2. Stripe Webhook Handler
**File:** `/app/api/webhooks/stripe/route.ts`  
**Lines:** 925-1043  
**Status:** ✅ Complete

**Evidence:**
- Line 925: `productType === "paid_blueprint"` detection
- Lines 1020-1043: Updates `blueprint_subscribers` table:
  - Sets `paid_blueprint_purchased = TRUE`
  - Sets `paid_blueprint_purchased_at = NOW()`
  - Sets `paid_blueprint_stripe_payment_id`
  - Sets `converted_to_user = TRUE` (matches system semantics)
- Lines 965-1013: Logs to `stripe_payments` table
- Lines 1044-1054: Tags contacts in Resend + Flodesk
- **Does NOT grant credits** (correct behavior)

#### 3. Database Schema
**File:** `/scripts/migrations/add-paid-blueprint-tracking.sql`  
**Status:** ✅ Complete (migration exists)

**Columns Added:**
- `paid_blueprint_purchased` (BOOLEAN DEFAULT FALSE)
- `paid_blueprint_purchased_at` (TIMESTAMPTZ)
- `paid_blueprint_stripe_payment_id` (TEXT)
- `paid_blueprint_photo_urls` (JSONB DEFAULT '[]'::jsonb) - Array of 30 URLs
- `paid_blueprint_generated` (BOOLEAN DEFAULT FALSE)
- `paid_blueprint_generated_at` (TIMESTAMPTZ)

**Indexes Created:**
- `idx_blueprint_paid_purchased` (for purchased = TRUE queries)
- `idx_blueprint_paid_pending_generation` (for pending generation)
- `idx_blueprint_paid_email` (for email lookups)

**Note:** Migration file exists but needs verification if it was run in production.

#### 4. Checkout Route
**File:** `/app/checkout/blueprint/page.tsx`  
**Status:** ✅ Complete (79 lines)

**Evidence:**
- Feature flag check implemented (lines 11-32)
- Email validation (lines 50-54)
- Calls `createLandingCheckoutSession('paid_blueprint', promoCode)` (line 59)
- Redirects to universal checkout page (line 64)
- Promo code support (line 48)

**Query Params Supported:**
- `email` (required)
- `promo` (optional)

**Feature Flag:**
- Checks `FEATURE_PAID_BLUEPRINT_ENABLED` env var first
- Falls back to `admin_feature_flags` table (`key = 'paid_blueprint_enabled'`)
- Returns 404 if disabled

#### 5. Success Page
**File:** `/app/checkout/success/page.tsx`  
**Status:** ⚠️ NEEDS VERIFICATION

**Evidence:**
- Uses `SuccessContent` component
- Passes `purchaseType` param (line 24)
- **Gap:** Need to verify if `SuccessContent` handles `purchaseType === "paid_blueprint"`

**File:** `/components/checkout/success-content.tsx`  
**Status:** ❌ NO HANDLING FOUND

**Evidence:**
- Line 15: Accepts `purchaseType?: string`
- Line 80: Only handles `purchaseType === "credit_topup"`
- Line 143: Only handles `purchaseType === "credit_topup"`
- **Gap:** No handling for `purchaseType === "paid_blueprint"`

#### 6. Generation APIs
**Files:**
- `/app/api/blueprint/generate-paid/route.ts` ✅
- `/app/api/blueprint/check-paid-grid/route.ts` ✅
- `/app/api/blueprint/get-paid-status/route.ts` ✅

**Status:** ✅ Complete

**Evidence:**
- All three APIs exist and handle:
  - Access token authentication
  - Purchase validation
  - Sequential grid generation (1-30)
  - Status polling
  - Idempotency guards
  - Admin access (for ssa@ssasocial.com)

#### 7. Paid Blueprint UI
**File:** `/app/blueprint/paid/page.tsx`  
**Status:** ✅ Complete (560 lines)

**Features:**
- Access token authentication
- Progress tracking (completed/30)
- Sequential generation
- Client-side state persistence (localStorage)
- Resume after refresh
- Individual grid retry
- Download buttons
- Mobile responsive

---

### B) Email System (Templates + Cron + Sending)

#### 1. Email Template Structure
**Location:** `/lib/email/templates/`  
**Status:** ✅ Pattern exists

**Existing Templates Found:**
- `blueprint-followup-day-3.tsx` ✅
- `blueprint-followup-day-7.tsx` ✅
- `blueprint-followup-day-14.tsx` ✅
- `blueprint-followup-day-0.tsx` ✅

**Template Pattern:**
```typescript
export interface BlueprintFollowupDay3Params {
  firstName?: string
  email: string
}

export function generateBlueprintFollowupDay3Email(params: BlueprintFollowupDay3Params): {
  html: string
  text: string
}
```

**Evidence from `blueprint-followup-day-3.tsx`:**
- Returns `{ html, text }` object
- Uses `process.env.NEXT_PUBLIC_SITE_URL` for links
- Includes tracked links with UTM params
- Follows SSELFIE brand styling (Times New Roman, stone colors)

#### 2. Email Sending System
**File:** `/lib/email/send-email.ts`  
**Status:** ✅ Complete

**Evidence:**
- Uses Resend API (lines 21-30)
- Retry logic with exponential backoff (lines 32-115)
- Logs to `email_logs` table (lines 145-180)
- Supports `emailType` parameter for tracking (line 14)
- Rate limiting check (line 216)
- Test mode whitelist (line 204)

**Email Logging:**
- Table: `email_logs`
- Columns: `user_email`, `email_type`, `resend_message_id`, `status`, `sent_at`
- Deduplication: Checks `email_logs` before sending (pattern in cron)

#### 3. Cron Job for Blueprint Followups
**File:** `/app/api/cron/send-blueprint-followups/route.ts`  
**Status:** ✅ Exists but only handles FREE blueprint

**Evidence:**
- Lines 58-132: Day 3 emails (FREE blueprint only)
- Lines 135-209: Day 7 emails (FREE blueprint only)
- Lines 212-286: Day 14 emails (FREE blueprint only)
- Query pattern: `WHERE bs.day_3_email_sent = FALSE AND bs.created_at <= NOW() - INTERVAL '3 days'`
- **Gap:** No queries for `paid_blueprint_purchased = TRUE`
- **Gap:** No email columns for paid blueprint (e.g., `day_1_paid_email_sent`)

**Deduplication Pattern:**
- Checks `email_logs` table for existing sends (lines 76-84)
- Updates `blueprint_subscribers` flags after sending (lines 104-111)
- Uses `emailType` for tracking (e.g., `'blueprint-followup-day-3'`)

#### 4. Email State Tracking
**Current Pattern (FREE blueprint):**
- Columns: `day_3_email_sent`, `day_3_email_sent_at`, `day_7_email_sent`, `day_7_email_sent_at`, `day_14_email_sent`, `day_14_email_sent_at`
- **Gap:** No columns for paid blueprint emails

**Database Schema:**
- Base table: `blueprint_subscribers` (from `/scripts/create-blueprint-subscribers-table.sql`)
- Email columns added via: `/scripts/add-blueprint-followup-email-columns.sql` (needs verification)

---

### C) Free Blueprint Page + CTA Placement

#### 1. Free Blueprint Page
**File:** `/app/blueprint/page.tsx`  
**Status:** ✅ Exists (1,581 lines)

**Flow Steps:**
- Step 0: Landing
- Step 1: Form questions
- Step 2: Feed style selection
- Step 3: Concept generation
- Step 3.5: Grid generation (BlueprintConceptCard)
- Step 4: Score display
- Step 5: Calendar view
- Step 6: Caption templates

#### 2. Strategy Generation Moment
**Evidence:**
- Line 87: `blueprint.strategy.generated` check
- Step 3.5: Shows after concept generated (line 1074)
- Step 4: Shows score after grid generated (line 1152)

**Best CTA Placement:**
- **Option A:** After Step 3.5 (grid generated) - User sees their grid, natural upgrade moment
- **Option B:** After Step 4 (score shown) - User sees their score, understands value
- **Option C:** After Step 6 (caption templates) - User has full blueprint, ready to implement

**Current State:**
- No upgrade CTA found in codebase
- No references to "paid blueprint" or "upgrade" in `/app/blueprint/page.tsx`

#### 3. Email Access
**Evidence:**
- Line 34: `accessToken` state variable
- Line 15: `savedEmail` state variable
- Email captured via `BlueprintEmailCapture` component (line 7)

**How to Pass Email to Checkout:**
- Email is in `savedEmail` state
- Can pass via query param: `/checkout/blueprint?email=${savedEmail}`
- Checkout page validates email exists (line 51-54 of checkout page)

#### 4. Feature Flag System
**File:** `/app/checkout/blueprint/page.tsx`  
**Status:** ✅ Pattern exists

**Evidence:**
- Lines 11-32: `isPaidBlueprintEnabled()` function
- Checks `FEATURE_PAID_BLUEPRINT_ENABLED` env var first
- Falls back to `admin_feature_flags` table (`key = 'paid_blueprint_enabled'`)
- Returns 404 if disabled

**Database Table:**
- `admin_feature_flags` (referenced but schema not found in search)
- Expected columns: `key` (TEXT), `value` (BOOLEAN or TEXT)

**Gap:** Need to verify table exists and create flag if missing

---

## ❌ GAPS: WHAT'S MISSING

### 1. Email Templates (4 missing)
**Location:** `/lib/email/templates/`  
**Missing Files:**
- ❌ `paid-blueprint-delivery.tsx` - Triggered on purchase completion
- ❌ `paid-blueprint-day-1.tsx` - Quick start guide
- ❌ `paid-blueprint-day-3.tsx` - Check-in + nudge to use results
- ❌ `paid-blueprint-day-7.tsx` - Social proof + soft upsell to Studio

### 2. Database Columns for Email State (4 missing)
**Table:** `blueprint_subscribers`  
**Missing Columns:**
- ❌ `day_1_paid_email_sent` (BOOLEAN DEFAULT FALSE)
- ❌ `day_1_paid_email_sent_at` (TIMESTAMPTZ)
- ❌ `day_3_paid_email_sent` (BOOLEAN DEFAULT FALSE)
- ❌ `day_3_paid_email_sent_at` (TIMESTAMPTZ)
- ❌ `day_7_paid_email_sent` (BOOLEAN DEFAULT FALSE)
- ❌ `day_7_paid_email_sent_at` (TIMESTAMPTZ)

**Note:** Delivery email can use `paid_blueprint_purchased_at` timestamp (no separate flag needed)

### 3. Cron Job Extension
**File:** `/app/api/cron/send-blueprint-followups/route.ts`  
**Missing:**
- ❌ Queries for paid blueprint buyers
- ❌ Day 1 email logic (24 hours after purchase)
- ❌ Day 3 email logic (3 days after purchase)
- ❌ Day 7 email logic (7 days after purchase)
- ❌ Delivery email trigger (on purchase completion)

### 4. Success Page Customization
**File:** `/components/checkout/success-content.tsx`  
**Missing:**
- ❌ Detection of `purchaseType === "paid_blueprint"`
- ❌ Custom message: "Your 30-photo library is generating..."
- ❌ Link to `/blueprint/paid?access={token}`

**Gap:** Need to:
1. Get access token from `blueprint_subscribers` by email
2. Show custom UI for paid blueprint
3. Link to paid blueprint page

### 5. Free Blueprint Upgrade CTA
**File:** `/app/blueprint/page.tsx`  
**Missing:**
- ❌ "Bring My Blueprint to Life - $47" button
- ❌ Feature flag check to show/hide CTA
- ❌ Link to `/checkout/blueprint?email=${savedEmail}`

**Best Placement:** After Step 3.5 (grid generated) or Step 4 (score shown)

### 6. Delivery Email Trigger
**Location:** Webhook handler or generation completion  
**Missing:**
- ❌ Trigger on purchase completion (webhook)
- ❌ OR trigger when first grid completes (generation API)
- ❌ Need to determine: Purchase time OR generation time?

**Recommendation:** Send delivery email when purchase completes (immediate value), not when generation completes (could be hours later)

### 7. Feature Flag Creation
**Database:** `admin_feature_flags` table  
**Missing:**
- ❌ Flag: `paid_blueprint_enabled` (default: FALSE)
- ❌ Need to verify table exists
- ❌ Need to create flag if missing

---

## 🧩 STEP-BY-STEP IMPLEMENTATION PLAN

### PR-1: Database Migration for Email State Columns ✅ COMPLETE

**Objective:** Add columns to track paid blueprint email sends

**File Created:**
- `/scripts/migrations/add-paid-blueprint-email-columns.sql`

**Columns Added:**
- `day_1_paid_email_sent` (BOOLEAN DEFAULT FALSE)
- `day_1_paid_email_sent_at` (TIMESTAMP WITH TIME ZONE)
- `day_3_paid_email_sent` (BOOLEAN DEFAULT FALSE)
- `day_3_paid_email_sent_at` (TIMESTAMP WITH TIME ZONE)
- `day_7_paid_email_sent` (BOOLEAN DEFAULT FALSE)
- `day_7_paid_email_sent_at` (TIMESTAMP WITH TIME ZONE)

**Indexes Created:**
- `idx_blueprint_paid_email_day1` (for Day 1 email queries)
- `idx_blueprint_paid_email_day3` (for Day 3 email queries)
- `idx_blueprint_paid_email_day7` (for Day 7 email queries)

**Pattern Matches:**
- FREE blueprint columns: `day_3_email_sent`, `day_7_email_sent`, `day_14_email_sent`
- Uses same naming convention: `day_X_paid_email_sent` + `day_X_paid_email_sent_at`
- Uses `schema_migrations` table for tracking (matches `add-paid-blueprint-tracking.sql`)

**How to Run:**
```bash
# Local/Staging
psql $DATABASE_URL -f scripts/migrations/add-paid-blueprint-email-columns.sql

# Or via Node.js (if preferred)
npx tsx -e "import { neon } from '@neondatabase/serverless'; import { readFileSync } from 'fs'; const sql = neon(process.env.DATABASE_URL!); const migration = readFileSync('scripts/migrations/add-paid-blueprint-email-columns.sql', 'utf8'); await sql(migration);"
```

**Verification Query:**
```sql
-- Check columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'blueprint_subscribers'
AND column_name LIKE 'day_%_paid_email%'
ORDER BY column_name;

-- Check indexes exist
SELECT indexname
FROM pg_indexes
WHERE tablename = 'blueprint_subscribers'
AND indexname LIKE 'idx_blueprint_paid_email%'
ORDER BY indexname;

-- Check migration recorded
SELECT version, applied_at
FROM schema_migrations
WHERE version = 'add-paid-blueprint-email-columns';
```

**Rollback SQL:**
```sql
BEGIN;
ALTER TABLE blueprint_subscribers
  DROP COLUMN IF EXISTS day_1_paid_email_sent,
  DROP COLUMN IF EXISTS day_1_paid_email_sent_at,
  DROP COLUMN IF EXISTS day_3_paid_email_sent,
  DROP COLUMN IF EXISTS day_3_paid_email_sent_at,
  DROP COLUMN IF EXISTS day_7_paid_email_sent,
  DROP COLUMN IF EXISTS day_7_paid_email_sent_at;
DROP INDEX IF EXISTS idx_blueprint_paid_email_day1;
DROP INDEX IF EXISTS idx_blueprint_paid_email_day3;
DROP INDEX IF EXISTS idx_blueprint_paid_email_day7;
DELETE FROM schema_migrations WHERE version = 'add-paid-blueprint-email-columns';
COMMIT;
```

**Acceptance Criteria:**
- ✅ Migration runs without errors
- ✅ All 6 columns added
- ✅ Indexes created
- ✅ Existing rows have default values (FALSE, NULL)
- ✅ Migration recorded in `schema_migrations` table

**Test Steps:**
1. Run migration: `psql $DATABASE_URL -f scripts/migrations/add-paid-blueprint-email-columns.sql`
2. Verify schema: `\d blueprint_subscribers` (should show 6 new columns)
3. Check indexes: `\di idx_blueprint_paid_email*` (should show 3 indexes)
4. Query test: `SELECT day_1_paid_email_sent, day_3_paid_email_sent, day_7_paid_email_sent FROM blueprint_subscribers LIMIT 1;` (should return FALSE, FALSE, FALSE)
5. Verify migration recorded: `SELECT * FROM schema_migrations WHERE version = 'add-paid-blueprint-email-columns';`

---

### PR-2: Email Templates (4 templates)

**Objective:** Create email templates for paid blueprint sequence

**Files to Create:**
1. `/lib/email/templates/paid-blueprint-delivery.tsx`
2. `/lib/email/templates/paid-blueprint-day-1.tsx`
3. `/lib/email/templates/paid-blueprint-day-3.tsx`
4. `/lib/email/templates/paid-blueprint-day-7.tsx`

**Template Pattern (follow existing):**
```typescript
export interface PaidBlueprintDeliveryParams {
  firstName?: string
  email: string
  accessToken: string
  photoPreviewUrls?: string[] // First 3-4 photos for preview
}

export function generatePaidBlueprintDeliveryEmail(params: PaidBlueprintDeliveryParams): {
  html: string
  text: string
}
```

**Template Requirements:**

**1. Delivery Email (`paid-blueprint-delivery.tsx`):**
- Subject: "Your 30 Custom Photos Are Ready! 📸"
- Content:
  - Welcome message
  - "Your SSELFIE Brand Blueprint is complete!"
  - Preview of 3-4 photos (if available)
  - CTA: "View All 30 Photos" → `/blueprint/paid?access={accessToken}`
  - Tracked link with UTM params
- Trigger: On purchase completion (webhook)

**2. Day 1 Email (`paid-blueprint-day-1.tsx`):**
- Subject: "5 Ways to Use Your Blueprint Photos This Week"
- Content:
  - Quick start guide
  - Practical tips (Instagram posts, website, LinkedIn)
  - Reminder: "Generate your photos if you haven't yet"
  - CTA: "View My Photos" → `/blueprint/paid?access={accessToken}`
- Trigger: 24 hours after purchase

**3. Day 3 Email (`paid-blueprint-day-3.tsx`):**
- Subject: "How's Your Blueprint Working Out?"
- Content:
  - Check-in message
  - Nudge to use results
  - "Share your results with us" (optional)
  - Soft mention of Studio (not hard sell)
- Trigger: 3 days after purchase

**4. Day 7 Email (`paid-blueprint-day-7.tsx`):**
- Subject: "From $47 One-Time to $97/Month Unlimited"
- Content:
  - Social proof (testimonials)
  - Value comparison
  - Soft upsell to Studio
  - CTA: "Upgrade to Creator Studio" → tracked link
- Trigger: 7 days after purchase

**Acceptance Criteria:**
- ✅ All 4 templates follow existing pattern
- ✅ Templates return `{ html, text }` object
- ✅ Links include UTM params
- ✅ Links use `accessToken` for paid blueprint page
- ✅ Brand styling matches existing templates

**Test Steps:**
1. Import each template function
2. Call with test params
3. Verify HTML/text output
4. Check links are correct
5. Verify UTM params included

---

### PR-3: Delivery Email Trigger (Webhook)

**Objective:** Send delivery email immediately after purchase

**File to Modify:**
- `/app/api/webhooks/stripe/route.ts`

**Location:** After line 1043 (after updating `blueprint_subscribers`)

**Changes:**
```typescript
// After updating blueprint_subscribers (line 1043)
// Send delivery email
try {
  const subscriber = await sql`
    SELECT access_token, name, email, paid_blueprint_photo_urls
    FROM blueprint_subscribers
    WHERE email = ${customerEmail}
    LIMIT 1
  `
  
  if (subscriber.length > 0) {
    const sub = subscriber[0]
    const photoUrls = Array.isArray(sub.paid_blueprint_photo_urls) ? sub.paid_blueprint_photo_urls : []
    const previewUrls = photoUrls.slice(0, 4).filter((url: any) => url !== null && url !== undefined)
    
    const firstName = sub.name?.split(" ")[0] || undefined
    const emailContent = generatePaidBlueprintDeliveryEmail({
      firstName,
      email: sub.email,
      accessToken: sub.access_token,
      photoPreviewUrls: previewUrls.length > 0 ? previewUrls : undefined,
    })
    
    const sendResult = await sendEmail({
      to: sub.email,
      subject: "Your 30 Custom Photos Are Ready! 📸",
      html: emailContent.html,
      text: emailContent.text,
      from: "Sandra from SSELFIE <hello@sselfie.ai>",
      emailType: "paid-blueprint-delivery",
    })
    
    if (sendResult.success) {
      console.log(`[v0] ✅ Sent paid blueprint delivery email to ${sub.email}`)
    } else {
      console.error(`[v0] ❌ Failed to send delivery email:`, sendResult.error)
    }
  }
} catch (emailError: any) {
  console.error(`[v0] Error sending paid blueprint delivery email:`, emailError.message)
  // Don't fail webhook if email fails
}
```

**Import Required:**
```typescript
import { generatePaidBlueprintDeliveryEmail } from "@/lib/email/templates/paid-blueprint-delivery"
import { sendEmail } from "@/lib/email/send-email"
```

**Acceptance Criteria:**
- ✅ Email sent on purchase completion
- ✅ Email logged to `email_logs` table
- ✅ Email includes access token link
- ✅ Webhook doesn't fail if email fails
- ✅ Handles case where subscriber not found

**Test Steps:**
1. Complete test purchase via `/checkout/blueprint`
2. Check webhook logs for email send
3. Verify email received
4. Check `email_logs` table for record
5. Verify link works: `/blueprint/paid?access={token}`

---

### PR-4: Cron Job Extension (Day 1, 3, 7 emails)

**Objective:** Extend cron job to send paid blueprint followup emails

**File to Modify:**
- `/app/api/cron/send-blueprint-followups/route.ts`

**Changes:**

**1. Add imports:**
```typescript
import { generatePaidBlueprintDay1Email } from "@/lib/email/templates/paid-blueprint-day-1"
import { generatePaidBlueprintDay3Email } from "@/lib/email/templates/paid-blueprint-day-3"
import { generatePaidBlueprintDay7Email } from "@/lib/email/templates/paid-blueprint-day-7"
```

**2. Add to results object (line 50):**
```typescript
const results = {
  day3: { found: 0, sent: 0, failed: 0, skipped: 0 },
  day7: { found: 0, sent: 0, failed: 0, skipped: 0 },
  day14: { found: 0, sent: 0, failed: 0, skipped: 0 },
  paidDay1: { found: 0, sent: 0, failed: 0, skipped: 0 },
  paidDay3: { found: 0, sent: 0, failed: 0, skipped: 0 },
  paidDay7: { found: 0, sent: 0, failed: 0, skipped: 0 },
  errors: [] as Array<{ email: string; day: number; error: string }>,
}
```

**3. Add Day 1 Paid Email Logic (after line 132, before Day 7):**
```typescript
// Day 1 paid blueprint emails: 24 hours after purchase
const day1PaidSubscribers = await sql`
  SELECT bs.id, bs.email, bs.name, bs.access_token, bs.paid_blueprint_purchased_at
  FROM blueprint_subscribers bs
  LEFT JOIN email_logs el ON el.user_email = bs.email AND el.email_type = 'paid-blueprint-day-1'
  WHERE bs.paid_blueprint_purchased = TRUE
    AND bs.day_1_paid_email_sent = FALSE
    AND bs.paid_blueprint_purchased_at <= NOW() - INTERVAL '1 day'
    AND bs.paid_blueprint_purchased_at > NOW() - INTERVAL '2 days'
    AND el.id IS NULL
  ORDER BY bs.paid_blueprint_purchased_at ASC
`

results.paidDay1.found = day1PaidSubscribers.length
console.log(`[v0] [CRON] Found ${day1PaidSubscribers.length} paid blueprint subscribers for Day 1 email`)

for (const subscriber of day1PaidSubscribers) {
  try {
    // Dedupe check
    const existingLog = await sql`
      SELECT id FROM email_logs
      WHERE user_email = ${subscriber.email} AND email_type = 'paid-blueprint-day-1'
      LIMIT 1
    `
    if (existingLog.length > 0) {
      results.paidDay1.skipped++
      continue
    }

    const firstName = subscriber.name?.split(" ")[0] || undefined
    const emailContent = generatePaidBlueprintDay1Email({
      firstName,
      email: subscriber.email,
      accessToken: subscriber.access_token,
    })

    const sendResult = await sendEmail({
      to: subscriber.email,
      subject: "5 Ways to Use Your Blueprint Photos This Week",
      html: emailContent.html,
      text: emailContent.text,
      from: "Sandra from SSELFIE <hello@sselfie.ai>",
      emailType: "paid-blueprint-day-1",
    })

    if (sendResult.success) {
      await sql`
        UPDATE blueprint_subscribers
        SET 
          day_1_paid_email_sent = TRUE,
          day_1_paid_email_sent_at = NOW(),
          updated_at = NOW()
        WHERE id = ${subscriber.id}
      `
      results.paidDay1.sent++
      console.log(`[v0] [CRON] ✅ Sent Day 1 paid email to ${subscriber.email}`)
    } else {
      throw new Error(sendResult.error || 'Failed to send email')
    }
  } catch (error: any) {
    results.paidDay1.failed++
    results.errors.push({
      email: subscriber.email,
      day: 1,
      error: error.message || "Unknown error",
    })
    console.error(`[v0] [CRON] ❌ Failed to send Day 1 paid email to ${subscriber.email}:`, error)
    await logAdminError({
      toolName: "cron:send-blueprint-followups:paid-day-1",
      error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
      context: { subscriberEmail: subscriber.email, subscriberId: subscriber.id },
    }).catch(() => {})
  }
}
```

**4. Add Day 3 Paid Email Logic (after Day 1, before Day 7):**
```typescript
// Day 3 paid blueprint emails: 3 days after purchase
const day3PaidSubscribers = await sql`
  SELECT bs.id, bs.email, bs.name, bs.access_token, bs.paid_blueprint_purchased_at
  FROM blueprint_subscribers bs
  LEFT JOIN email_logs el ON el.user_email = bs.email AND el.email_type = 'paid-blueprint-day-3'
  WHERE bs.paid_blueprint_purchased = TRUE
    AND bs.day_3_paid_email_sent = FALSE
    AND bs.paid_blueprint_purchased_at <= NOW() - INTERVAL '3 days'
    AND bs.paid_blueprint_purchased_at > NOW() - INTERVAL '4 days'
    AND bs.converted_to_user = FALSE  -- Only send to non-Studio members
    AND el.id IS NULL
  ORDER BY bs.paid_blueprint_purchased_at ASC
`

results.paidDay3.found = day3PaidSubscribers.length
console.log(`[v0] [CRON] Found ${day3PaidSubscribers.length} paid blueprint subscribers for Day 3 email`)

for (const subscriber of day3PaidSubscribers) {
  try {
    // Dedupe check
    const existingLog = await sql`
      SELECT id FROM email_logs
      WHERE user_email = ${subscriber.email} AND email_type = 'paid-blueprint-day-3'
      LIMIT 1
    `
    if (existingLog.length > 0) {
      results.paidDay3.skipped++
      continue
    }

    const firstName = subscriber.name?.split(" ")[0] || undefined
    const emailContent = generatePaidBlueprintDay3Email({
      firstName,
      email: subscriber.email,
      accessToken: subscriber.access_token,
    })

    const sendResult = await sendEmail({
      to: subscriber.email,
      subject: "How's Your Blueprint Working Out?",
      html: emailContent.html,
      text: emailContent.text,
      from: "Sandra from SSELFIE <hello@sselfie.ai>",
      emailType: "paid-blueprint-day-3",
    })

    if (sendResult.success) {
      await sql`
        UPDATE blueprint_subscribers
        SET 
          day_3_paid_email_sent = TRUE,
          day_3_paid_email_sent_at = NOW(),
          updated_at = NOW()
        WHERE id = ${subscriber.id}
      `
      results.paidDay3.sent++
      console.log(`[v0] [CRON] ✅ Sent Day 3 paid email to ${subscriber.email}`)
    } else {
      throw new Error(sendResult.error || 'Failed to send email')
    }
  } catch (error: any) {
    results.paidDay3.failed++
    results.errors.push({
      email: subscriber.email,
      day: 3,
      error: error.message || "Unknown error",
    })
    console.error(`[v0] [CRON] ❌ Failed to send Day 3 paid email to ${subscriber.email}:`, error)
    await logAdminError({
      toolName: "cron:send-blueprint-followups:paid-day-3",
      error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
      context: { subscriberEmail: subscriber.email, subscriberId: subscriber.id },
    }).catch(() => {})
  }
}
```

**5. Add Day 7 Paid Email Logic (after Day 3, before Day 7 free):**
```typescript
// Day 7 paid blueprint emails: 7 days after purchase
const day7PaidSubscribers = await sql`
  SELECT bs.id, bs.email, bs.name, bs.access_token, bs.paid_blueprint_purchased_at
  FROM blueprint_subscribers bs
  LEFT JOIN email_logs el ON el.user_email = bs.email AND el.email_type = 'paid-blueprint-day-7'
  WHERE bs.paid_blueprint_purchased = TRUE
    AND bs.day_7_paid_email_sent = FALSE
    AND bs.paid_blueprint_purchased_at <= NOW() - INTERVAL '7 days'
    AND bs.paid_blueprint_purchased_at > NOW() - INTERVAL '8 days'
    AND bs.converted_to_user = FALSE  -- Only send to non-Studio members
    AND el.id IS NULL
  ORDER BY bs.paid_blueprint_purchased_at ASC
`

results.paidDay7.found = day7PaidSubscribers.length
console.log(`[v0] [CRON] Found ${day7PaidSubscribers.length} paid blueprint subscribers for Day 7 email`)

for (const subscriber of day7PaidSubscribers) {
  try {
    // Dedupe check
    const existingLog = await sql`
      SELECT id FROM email_logs
      WHERE user_email = ${subscriber.email} AND email_type = 'paid-blueprint-day-7'
      LIMIT 1
    `
    if (existingLog.length > 0) {
      results.paidDay7.skipped++
      continue
    }

    const firstName = subscriber.name?.split(" ")[0] || undefined
    const emailContent = generatePaidBlueprintDay7Email({
      firstName,
      email: subscriber.email,
      accessToken: subscriber.access_token,
    })

    const sendResult = await sendEmail({
      to: subscriber.email,
      subject: "From $47 One-Time to $97/Month Unlimited",
      html: emailContent.html,
      text: emailContent.text,
      from: "Sandra from SSELFIE <hello@sselfie.ai>",
      emailType: "paid-blueprint-day-7",
    })

    if (sendResult.success) {
      await sql`
        UPDATE blueprint_subscribers
        SET 
          day_7_paid_email_sent = TRUE,
          day_7_paid_email_sent_at = NOW(),
          updated_at = NOW()
        WHERE id = ${subscriber.id}
      `
      results.paidDay7.sent++
      console.log(`[v0] [CRON] ✅ Sent Day 7 paid email to ${subscriber.email}`)
    } else {
      throw new Error(sendResult.error || 'Failed to send email')
    }
  } catch (error: any) {
    results.paidDay7.failed++
    results.errors.push({
      email: subscriber.email,
      day: 7,
      error: error.message || "Unknown error",
    })
    console.error(`[v0] [CRON] ❌ Failed to send Day 7 paid email to ${subscriber.email}:`, error)
    await logAdminError({
      toolName: "cron:send-blueprint-followups:paid-day-7",
      error: error instanceof Error ? error : new Error(error.message || "Unknown error"),
      context: { subscriberEmail: subscriber.email, subscriberId: subscriber.id },
    }).catch(() => {})
  }
}
```

**6. Update results summary (line 288):**
```typescript
const totalSent = results.day3.sent + results.day7.sent + results.day14.sent + 
  results.paidDay1.sent + results.paidDay3.sent + results.paidDay7.sent
const totalFailed = results.day3.failed + results.day7.failed + results.day14.failed + 
  results.paidDay1.failed + results.paidDay3.failed + results.paidDay7.failed
const totalSkipped = results.day3.skipped + results.day7.skipped + results.day14.skipped + 
  results.paidDay1.skipped + results.paidDay3.skipped + results.paidDay7.skipped
```

**7. Update cron logger success (line 296):**
```typescript
await cronLogger.success({
  day3Sent: results.day3.sent,
  day7Sent: results.day7.sent,
  day14Sent: results.day14.sent,
  paidDay1Sent: results.paidDay1.sent,
  paidDay3Sent: results.paidDay3.sent,
  paidDay7Sent: results.paidDay7.sent,
  totalSent,
  totalFailed,
  totalSkipped,
})
```

**8. Update response JSON (line 311):**
```typescript
return NextResponse.json({
  success: true,
  message: `Blueprint follow-ups sent: ${totalSent} successful, ${totalFailed} failed, ${totalSkipped} skipped`,
  summary: {
    day3: results.day3,
    day7: results.day7,
    day14: results.day14,
    paidDay1: results.paidDay1,
    paidDay3: results.paidDay3,
    paidDay7: results.paidDay7,
    totalSent,
    totalFailed,
    totalSkipped,
  },
  errors: results.errors.slice(0, 10),
  totalErrors: results.errors.length,
})
```

**Acceptance Criteria:**
- ✅ Day 1 emails sent 24 hours after purchase
- ✅ Day 3 emails sent 3 days after purchase
- ✅ Day 7 emails sent 7 days after purchase
- ✅ Only sends to non-Studio members (`converted_to_user = FALSE`)
- ✅ Deduplication works (checks `email_logs`)
- ✅ Flags updated after sending
- ✅ Errors logged to admin error log

**Test Steps:**
1. Create test subscriber with `paid_blueprint_purchased = TRUE, paid_blueprint_purchased_at = NOW() - INTERVAL '1 day'`
2. Run cron manually: `curl -X GET http://localhost:3000/api/cron/send-blueprint-followups -H "Authorization: Bearer {CRON_SECRET}"`
3. Verify Day 1 email sent
4. Check `email_logs` for record
5. Check `blueprint_subscribers.day_1_paid_email_sent = TRUE`
6. Repeat for Day 3 and Day 7

---

### PR-5: Success Page Customization

**Objective:** Show custom message for paid blueprint buyers

**File to Modify:**
- `/components/checkout/success-content.tsx`

**Changes:**

**1. Add import:**
```typescript
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
```

**2. Add state for access token:**
```typescript
const [paidBlueprintAccessToken, setPaidBlueprintAccessToken] = useState<string | null>(null)
```

**3. Add useEffect to fetch access token (after line 70):**
```typescript
// Fetch access token for paid blueprint
useEffect(() => {
  if (purchaseType === "paid_blueprint" && initialEmail) {
    const fetchAccessToken = async () => {
      try {
        const response = await fetch(`/api/blueprint/get-access-token?email=${encodeURIComponent(initialEmail)}`)
        if (response.ok) {
          const data = await response.json()
          if (data.accessToken) {
            setPaidBlueprintAccessToken(data.accessToken)
          }
        }
      } catch (error) {
        console.error("[Success] Error fetching access token:", error)
      }
    }
    fetchAccessToken()
  }
}, [purchaseType, initialEmail])
```

**4. Add API route to get access token:**
**File to Create:** `/app/api/blueprint/get-access-token/route.ts`
```typescript
import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")
    
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }
    
    const subscriber = await sql`
      SELECT access_token FROM blueprint_subscribers
      WHERE email = ${email}
      AND paid_blueprint_purchased = TRUE
      ORDER BY paid_blueprint_purchased_at DESC
      LIMIT 1
    `
    
    if (subscriber.length === 0) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 })
    }
    
    return NextResponse.json({ accessToken: subscriber[0].access_token })
  } catch (error) {
    console.error("[Blueprint] Error getting access token:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get access token" },
      { status: 500 }
    )
  }
}
```

**5. Add paid blueprint UI (before line 143, after credit_topup check):**
```typescript
if (purchaseType === "paid_blueprint") {
  return (
    <div className="min-h-screen bg-stone-50">
      <div className="relative h-[40vh] sm:h-[50vh] overflow-hidden">
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/_%20%2842%29-7c6UXso773x523qKCiuawGNpuzsx8n.jpeg"
          fill
          alt="Payment Confirmed"
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-stone-50" />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <div className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extralight tracking-[0.3em] sm:tracking-[0.2em] uppercase text-white mb-3 sm:mb-4">
            PAYMENT CONFIRMED
          </div>
          <p className="text-sm sm:text-base md:text-lg text-white/90 font-light max-w-md">
            Your 30-photo library is ready to generate
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extralight tracking-[0.15em] sm:tracking-[0.2em] uppercase text-stone-900 mb-3 sm:mb-4 px-2">
            ✨ YOUR BLUEPRINT IS READY
          </h1>
          <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed max-w-xl mx-auto px-4">
            Your 30-photo library is generating now. This takes about 2-3 minutes.
          </p>
          <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed max-w-xl mx-auto px-4 mt-4">
            We'll email you when it's ready (check your inbox in 5 minutes).
          </p>
        </div>

        <div className="text-center">
          {paidBlueprintAccessToken ? (
            <button
              onClick={() => router.push(`/blueprint/paid?access=${paidBlueprintAccessToken}`)}
              className="bg-stone-950 text-stone-50 px-8 sm:px-12 py-3 sm:py-4 rounded-lg text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200 min-h-[44px]"
            >
              View My Blueprint
            </button>
          ) : (
            <div className="text-sm text-stone-500">Loading...</div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Acceptance Criteria:**
- ✅ Detects `purchaseType === "paid_blueprint"`
- ✅ Shows custom message (not generic success)
- ✅ Fetches access token from API
- ✅ Link to `/blueprint/paid?access={token}` works
- ✅ Handles case where access token not found (shows loading or fallback)

**Test Steps:**
1. Complete paid blueprint purchase
2. Verify redirect to `/checkout/success?session_id=xxx&type=paid_blueprint`
3. Verify custom message displays
4. Verify access token fetched
5. Click "View My Blueprint" → verify redirects to `/blueprint/paid?access={token}`

---

### PR-6: Free Blueprint Upgrade CTA

**Objective:** Add "Bring My Blueprint to Life" CTA in free blueprint flow

**File to Modify:**
- `/app/blueprint/page.tsx`

**Changes:**

**1. Add feature flag check function (after imports, before component):**
```typescript
async function isPaidBlueprintEnabled(): Promise<boolean> {
  try {
    const envFlag = process.env.NEXT_PUBLIC_FEATURE_PAID_BLUEPRINT_ENABLED
    if (envFlag !== undefined) {
      return envFlag === "true" || envFlag === "1"
    }
    // Client-side: can't check DB flag, rely on env var
    return false
  } catch {
    return false
  }
}
```

**2. Add state for feature flag:**
```typescript
const [paidBlueprintEnabled, setPaidBlueprintEnabled] = useState(false)
```

**3. Check feature flag on mount:**
```typescript
useEffect(() => {
  const checkFlag = async () => {
    const enabled = await isPaidBlueprintEnabled()
    setPaidBlueprintEnabled(enabled)
  }
  checkFlag()
}, [])
```

**4. Add CTA component after Step 3.5 (after line 1145, before closing div):**
```typescript
{paidBlueprintEnabled && savedEmail && (
  <div className="mt-8 sm:mt-12 max-w-2xl mx-auto">
    <div className="bg-stone-950 text-stone-50 p-6 sm:p-8 rounded-lg text-center">
      <h3 className="text-lg sm:text-xl font-light tracking-wider uppercase mb-3 sm:mb-4">
        Bring Your Blueprint to Life
      </h3>
      <p className="text-sm sm:text-base font-light text-stone-200 mb-4 sm:mb-6 leading-relaxed">
        Get 30 custom photos based on your brand strategy. Ready to post, ready to convert.
      </p>
      <a
        href={`/checkout/blueprint?email=${encodeURIComponent(savedEmail)}`}
        className="inline-block bg-white text-stone-950 px-8 sm:px-12 py-3 sm:py-4 text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-100 transition-all duration-200"
      >
        Get My 30 Photos - $47 →
      </a>
    </div>
  </div>
)}
```

**5. Alternative: Add CTA after Step 4 (score shown) - Line 1243, after button:**
```typescript
{paidBlueprintEnabled && savedEmail && (
  <div className="mt-8 sm:mt-12 max-w-2xl mx-auto">
    <div className="bg-gradient-to-br from-stone-100 to-stone-200 border border-stone-300 p-6 sm:p-8 rounded-lg text-center">
      <h3 className="text-lg sm:text-xl font-light tracking-wider uppercase mb-3 sm:mb-4 text-stone-950">
        Ready to See Your Photos?
      </h3>
      <p className="text-sm sm:text-base font-light text-stone-700 mb-4 sm:mb-6 leading-relaxed">
        Turn your blueprint into 30 custom photos. Based on your brand strategy, ready to post.
      </p>
      <a
        href={`/checkout/blueprint?email=${encodeURIComponent(savedEmail)}`}
        className="inline-block bg-stone-950 text-stone-50 px-8 sm:px-12 py-3 sm:py-4 text-xs sm:text-sm font-medium uppercase tracking-wider hover:bg-stone-800 transition-all duration-200"
      >
        Bring My Blueprint to Life - $47 →
      </a>
    </div>
  </div>
)}
```

**Recommendation:** Add CTA in BOTH places:
- After Step 3.5 (grid generated) - User sees their grid, natural moment
- After Step 4 (score shown) - User understands value, ready to invest

**Acceptance Criteria:**
- ✅ CTA only shows if feature flag enabled
- ✅ CTA only shows if email captured
- ✅ Link includes email query param
- ✅ CTA styled consistently with page
- ✅ Mobile responsive

**Test Steps:**
1. Set `NEXT_PUBLIC_FEATURE_PAID_BLUEPRINT_ENABLED=true` in `.env.local`
2. Complete free blueprint flow
3. Verify CTA appears after Step 3.5
4. Verify CTA appears after Step 4
5. Click CTA → verify redirects to `/checkout/blueprint?email={email}`
6. Set flag to `false` → verify CTA hidden

---

### PR-7: Feature Flag Creation

**Objective:** Create feature flag in database (if table exists)

**File to Create:**
- `/scripts/migrations/create-paid-blueprint-feature-flag.sql`

**SQL:**
```sql
-- Create feature flag for paid blueprint (if admin_feature_flags table exists)
-- This is safe to run even if table doesn't exist (will be created elsewhere)

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_feature_flags') THEN
    -- Insert flag if it doesn't exist
    INSERT INTO admin_feature_flags (key, value, description, updated_at)
    VALUES ('paid_blueprint_enabled', false, 'Enable $47 Paid Brand Blueprint mini product', NOW())
    ON CONFLICT (key) DO NOTHING;
    
    RAISE NOTICE 'Feature flag created or already exists';
  ELSE
    RAISE NOTICE 'admin_feature_flags table does not exist - flag will be created when table is created';
  END IF;
END $$;
```

**Alternative: If table doesn't exist, create it:**
```sql
-- Create admin_feature_flags table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_feature_flags (
  key TEXT PRIMARY KEY,
  value BOOLEAN DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create feature flag
INSERT INTO admin_feature_flags (key, value, description)
VALUES ('paid_blueprint_enabled', false, 'Enable $47 Paid Brand Blueprint mini product')
ON CONFLICT (key) DO NOTHING;
```

**Acceptance Criteria:**
- ✅ Flag created in database
- ✅ Default value: `false` (disabled)
- ✅ Can be toggled via SQL or admin panel (if exists)

**Test Steps:**
1. Run migration: `psql $DATABASE_URL < scripts/migrations/create-paid-blueprint-feature-flag.sql`
2. Verify flag: `SELECT * FROM admin_feature_flags WHERE key = 'paid_blueprint_enabled';`
3. Toggle flag: `UPDATE admin_feature_flags SET value = true WHERE key = 'paid_blueprint_enabled';`
4. Verify checkout page accessible when enabled
5. Verify checkout page returns 404 when disabled

---

## ✅ ACCEPTANCE CRITERIA (Summary)

### Email System
- ✅ All 4 email templates created and follow existing pattern
- ✅ Delivery email sent on purchase completion
- ✅ Day 1, 3, 7 emails sent at correct intervals
- ✅ Emails only sent to non-Studio members
- ✅ Deduplication works (no duplicate sends)
- ✅ Email state tracked in database
- ✅ Emails logged to `email_logs` table

### Free Blueprint CTA
- ✅ CTA appears after grid generated (Step 3.5)
- ✅ CTA appears after score shown (Step 4)
- ✅ CTA gated behind feature flag
- ✅ Link includes email query param
- ✅ Mobile responsive

### Success Page
- ✅ Custom message for paid blueprint buyers
- ✅ Access token fetched and displayed
- ✅ Link to paid blueprint page works

### Feature Flag
- ✅ Flag exists in database
- ✅ Checkout page respects flag
- ✅ Free blueprint CTA respects flag
- ✅ Can be toggled without code deployment

---

## 🧪 QA + TEST PLAN

### Happy Path Tests

#### Test 1: Complete Purchase Flow
1. Complete free blueprint (email capture → form → grid generation)
2. See upgrade CTA (if flag enabled)
3. Click CTA → redirects to checkout
4. Complete purchase ($47)
5. Verify webhook processes purchase
6. Verify delivery email sent
7. Verify redirect to success page
8. Verify success page shows custom message
9. Click "View My Blueprint" → verify redirects to paid blueprint page
10. Verify paid blueprint page loads with access token

#### Test 2: Email Sequence
1. Complete purchase
2. Verify delivery email received immediately
3. Wait 24 hours (or manually set `paid_blueprint_purchased_at` to 1 day ago)
4. Run cron: `curl -X GET http://localhost:3000/api/cron/send-blueprint-followups -H "Authorization: Bearer {CRON_SECRET}"`
5. Verify Day 1 email sent
6. Repeat for Day 3 and Day 7

#### Test 3: Feature Flag Toggle
1. Set flag to `false`
2. Verify checkout page returns 404
3. Verify CTA hidden in free blueprint
4. Set flag to `true`
5. Verify checkout page accessible
6. Verify CTA visible in free blueprint

### Edge Case Tests

#### Test 4: Email Deduplication
1. Complete purchase
2. Run cron manually (Day 1 email sent)
3. Run cron again immediately
4. Verify Day 1 email NOT sent again (skipped)
5. Check `email_logs` for single record

#### Test 5: Studio Member Exclusion
1. Complete purchase
2. Manually set `converted_to_user = TRUE` in database
3. Run cron for Day 3 email
4. Verify Day 3 email NOT sent (excluded from query)

#### Test 6: Missing Access Token
1. Complete purchase
2. Manually delete `access_token` from database
3. Visit success page
4. Verify handles gracefully (shows loading or fallback message)

#### Test 7: Multiple Purchases
1. Complete purchase (first time)
2. Try to purchase again (same email)
3. Verify webhook handles gracefully (updates existing record)
4. Verify no duplicate emails sent

#### Test 8: Email Failure
1. Temporarily break email sending (invalid API key)
2. Complete purchase
3. Verify webhook doesn't fail (continues processing)
4. Verify error logged to admin error log

### Mobile Tests

#### Test 9: Mobile Responsiveness
1. Complete free blueprint on mobile
2. Verify CTA displays correctly
3. Complete purchase on mobile
4. Verify success page displays correctly
5. Verify paid blueprint page works on mobile

### Browser Compatibility

#### Test 10: Cross-Browser
1. Test in Chrome, Safari, Firefox
2. Verify all features work
3. Verify no console errors

---

## 🚀 QUIET SHIP PLAN

### Phase 1: Internal QA (Day 1-2)

**Steps:**
1. ✅ Complete all PRs (PR-1 through PR-7)
2. ✅ Run database migrations
3. ✅ Set feature flag to `false` (disabled)
4. ✅ Internal testing (Sandra + team)
5. ✅ Fix any bugs found

**Success Criteria:**
- All tests pass
- No console errors
- Emails send correctly
- Feature flag works

### Phase 2: Admin-Only Enable (Day 3)

**Steps:**
1. ✅ Set feature flag to `true` (enabled)
2. ✅ Set `FEATURE_PAID_BLUEPRINT_ENABLED=true` in production env
3. ✅ Admin (ssa@ssasocial.com) tests full flow
4. ✅ Verify admin can access without token
5. ✅ Monitor webhook logs for any errors
6. ✅ Monitor email sends

**Success Criteria:**
- Admin can complete full flow
- No errors in logs
- Emails send correctly

### Phase 3: Limited Exposure (Day 4)

**Steps:**
1. ✅ Keep feature flag enabled
2. ✅ Monitor first 5-10 purchases
3. ✅ Verify all emails send
4. ✅ Check for any support issues
5. ✅ Monitor conversion rate (free → paid)

**Success Criteria:**
- No critical bugs
- Emails working
- Purchase flow smooth

### Phase 4: Full Launch (Day 5+)

**Steps:**
1. ✅ Keep feature flag enabled
2. ✅ Monitor daily
3. ✅ Track metrics:
   - Free blueprint completions
   - Upgrade CTA clicks
   - Purchase conversions
   - Email open rates
   - Email click rates

**Rollback Plan:**
- Set `FEATURE_PAID_BLUEPRINT_ENABLED=false` in env
- OR: `UPDATE admin_feature_flags SET value = false WHERE key = 'paid_blueprint_enabled';`
- This instantly:
  - Hides CTA in free blueprint
  - Blocks checkout page (404)
  - Existing paid users can still access `/blueprint/paid`

---

## 📋 IMPLEMENTATION CHECKLIST

### Pre-Implementation
- [ ] Verify database migrations can run
- [ ] Verify email templates directory exists
- [ ] Verify cron job is scheduled (Vercel Cron or similar)
- [ ] Verify `CRON_SECRET` env var set
- [ ] Verify `RESEND_API_KEY` env var set
- [ ] Verify `STRIPE_PAID_BLUEPRINT_PRICE_ID` env var set

### PR-1: Database Migration
- [ ] Create migration file
- [ ] Run migration in staging
- [ ] Verify columns added
- [ ] Verify indexes created
- [ ] Document rollback SQL

### PR-2: Email Templates
- [ ] Create delivery template
- [ ] Create Day 1 template
- [ ] Create Day 3 template
- [ ] Create Day 7 template
- [ ] Test each template function
- [ ] Verify HTML/text output
- [ ] Verify links correct

### PR-3: Delivery Email Trigger
- [ ] Add email send to webhook
- [ ] Import template function
- [ ] Test webhook with test purchase
- [ ] Verify email sent
- [ ] Verify email logged

### PR-4: Cron Job Extension
- [ ] Add Day 1 logic
- [ ] Add Day 3 logic
- [ ] Add Day 7 logic
- [ ] Update results object
- [ ] Update cron logger
- [ ] Test cron manually
- [ ] Verify emails sent
- [ ] Verify flags updated

### PR-5: Success Page
- [ ] Create access token API route
- [ ] Add paid blueprint UI to success page
- [ ] Test purchase flow
- [ ] Verify custom message
- [ ] Verify link works

### PR-6: Free Blueprint CTA
- [ ] Add feature flag check
- [ ] Add CTA after Step 3.5
- [ ] Add CTA after Step 4
- [ ] Test with flag enabled
- [ ] Test with flag disabled
- [ ] Verify mobile responsive

### PR-7: Feature Flag
- [ ] Create migration
- [ ] Run migration
- [ ] Verify flag exists
- [ ] Test toggle

### Post-Implementation
- [ ] Run all tests
- [ ] Fix any bugs
- [ ] Deploy to staging
- [ ] Test in staging
- [ ] Deploy to production
- [ ] Monitor for 24 hours
- [ ] Document any issues

---

## 🎯 SUCCESS METRICS

### Week 1 Goals
- ✅ All emails sending correctly
- ✅ No critical bugs
- ✅ Feature flag working
- ✅ 5-10 test purchases completed

### Week 2 Goals
- ✅ Monitor conversion rate (free → paid)
- ✅ Monitor email open rates
- ✅ Monitor email click rates
- ✅ Track any support issues

### Ongoing
- ✅ Daily monitoring
- ✅ Weekly review of metrics
- ✅ Adjust as needed

---

**END OF STEP 1 PLAN**

**Next Steps After Step 1:**
- Step 2: Monitor and optimize
- Step 3: Add analytics tracking
- Step 4: A/B test CTA placement
- Step 5: Scale and iterate

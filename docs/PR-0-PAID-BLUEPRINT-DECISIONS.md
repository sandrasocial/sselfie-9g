# PR-0 Paid Blueprint Decisions (Evidence-Backed)

**Date:** January 9, 2026  
**Status:** Pre-Implementation Audit  
**Purpose:** Resolve critical inconsistencies before PR-1

---

## VERIFIED FINDINGS

### Finding 1: Price Conflict ($47 vs $67)

**Evidence from docs:**

1. **MINI-PRODUCT-MONETIZATION-AUDIT.md** (line 262):
   - `"Your 9-Post Brand Blueprint + First Photoshoot" - $67 one-time`
   - `30 AI-generated photos matching your brand vibe`
   - Context: Initial monetization audit proposal

2. **PAID-BLUEPRINT-IMPLEMENTATION-PLAN.md** (line 11):
   - `Paid Brand Blueprint ($47 one-time)`
   - Context: Detailed implementation plan (created after audit)

3. **MINI-PRODUCTS-EXECUTIVE-SUMMARY.md** (line 39):
   - `Paid Brand Blueprint: $67 | What: 9-post grid concept + 30 photos + captions`

**Evidence from code:**
- ❌ NO existing Stripe product for `paid_blueprint` in `/lib/products.ts`
- ❌ NO environment variable like `STRIPE_PAID_BLUEPRINT_PRICE_ID`
- ❌ NO references in webhook handler for this product type

**Conclusion:** Price is NOT implemented yet. Docs show conflict between $47 and $67.

---

### Finding 2: Database Schema Already Extended

**Current `blueprint_subscribers` schema (from migrations):**

**Base columns** (`/scripts/create-blueprint-subscribers-table.sql`):
- `id`, `email`, `name`, `access_token`, `source`, `created_at`, `updated_at`
- `business`, `dream_client`, `struggle`, `selfie_skill_level`, `feed_style`, `post_frequency`, `form_data` (JSONB)
- `blueprint_completed`, `blueprint_completed_at`
- `pdf_downloaded`, `pdf_downloaded_at`
- `cta_clicked`, `cta_clicked_at`
- `converted_to_user`, `converted_at` ✅ (purchase tracking exists)
- `welcome_email_sent`, `welcome_email_sent_at`
- `resend_contact_id`
- `utm_source`, `utm_medium`, `utm_campaign`, `referrer`, `user_agent`, `email_tags`

**Already added by migration** (`/scripts/migrations/add-blueprint-generation-tracking.sql`):
- `strategy_generated`, `strategy_generated_at`, `strategy_data` (JSONB) ✅
- `grid_generated`, `grid_generated_at` ✅
- `grid_url`, `grid_frame_urls` (JSONB), `grid_prediction_id` ✅
- `selfie_image_urls` (JSONB) ✅

**Already added by migration** (`/scripts/add-blueprint-followup-email-columns.sql`):
- `day_3_email_sent`, `day_3_email_sent_at` ✅
- `day_7_email_sent`, `day_7_email_sent_at` ✅
- `day_14_email_sent`, `day_14_email_sent_at` ✅

**Likely added by migration 016** (Flodesk tracking):
- `flodesk_contact_id`, `synced_to_flodesk`, `flodesk_synced_at` (pattern matches `/scripts/migrations/016_add_flodesk_sync_tracking.sql`)

**Total existing columns:** ~44 columns

**Columns MISSING for paid blueprint:**
- ❌ `paid_blueprint_purchased` (or can reuse `converted_to_user`?)
- ❌ `paid_blueprint_purchased_at` (or can reuse `converted_at`?)
- ❌ `paid_blueprint_stripe_payment_id`
- ❌ Paid blueprint generation status tracking
- ❌ Paid blueprint batch URLs (or can reuse existing `grid_frame_urls`?)
- ❌ Paid blueprint email sequence flags (`day_1_paid_email_sent`, etc.)

---

### Finding 3: Credit System Model

**How existing products work** (from `/app/api/webhooks/stripe/route.ts`):

**Product type: `one_time_session`**
- Line 139-140: Recognized as `"one-time-session"` tag
- Line 772: Calls `grantOneTimeSessionCredits(userId, paymentIntentId, isTestMode)`
- From `/lib/credits.ts` (lines 361-373): Grants **200 credits** (verified via `SUBSCRIPTION_CREDITS.one_time_session`)
- User must have account created (requires `userId`)
- Credits deposited to `users.credits_balance`
- User uses credits via existing `/app/api/studio/generate/route.ts`

**Product type: `sselfie_studio_membership`**
- Line 141-142: Recognized as `"content-creator-studio"` tag
- Line 679-680: Credits granted via `invoice.payment_succeeded` event (NOT checkout.session.completed)
- Grants **500 credits/month** (subscription)

**Product type: `credit_topup`**
- Line 143-144: Recognized as `"credit-topup"` tag
- Credits granted based on package metadata
- Requires authenticated user

**Authentication model for generation** (`/app/api/studio/generate/route.ts`):
- Line 29-36: Requires Supabase auth session (`supabase.auth.getUser()`)
- Line 38-44: Maps to `users` table via `stack_auth_id`
- Line 52-57: Checks credits balance via `checkCredits(neonUser.id, creditsNeeded)`
- Line 60-64: Requires trained model (LoRA weights)
- **CRITICAL:** Generation flow requires authenticated user account, NOT token-based access

**Blueprint current flow:**
- Uses `access_token` (UUID, no user account required)
- No authentication beyond email verification
- No `users` table record
- No credit balance

---

### Finding 4: Delivery Model Gap

**Option A: Credit-based (like existing one_time_session)**
- ✅ Reuses existing credit system
- ✅ Reuses existing generation API (`/app/api/studio/generate/route.ts`)
- ❌ Requires user account creation (currently blueprint users don't have accounts)
- ❌ Requires model training (30+ minute onboarding)
- ❌ Changes blueprint UX significantly

**Option B: Direct photo storage (like free blueprint grid)**
- ✅ Blueprint already stores `grid_frame_urls` (JSONB array)
- ✅ Works with token-based access (no account required)
- ✅ Can generate without trained model (generic prompts)
- ❌ Requires new generation API endpoint separate from studio
- ❌ Photos not accessible via Studio app

**Option C: Hybrid (NEW)**
- Grant credits + create account for user AFTER paid blueprint purchase
- Use existing credit system but bypass model training requirement
- Allow generation with generic model or prompt-only approach
- ❌ Most complex, most risk

---

## DECISION FOR V1

### ✅ Decision 1: Price

**RECOMMENDATION: $47 (not $67)**

**Reasoning:**
1. Lower price point = higher conversion for first mini product
2. $47 positions as "upgrade from free" vs $67 feels like new product
3. Simpler math: $47 vs $97/mo Studio (roughly 2 months)
4. Can test $67 later via Stripe price variant

**What must match:**
- `/lib/products.ts` → `paid_blueprint.price: 47`
- Stripe Dashboard → Create price: $47.00 USD one-time
- `/app/checkout/blueprint/page.tsx` → Display: "$47"
- Email templates → Copy: "$47"
- Marketing landing page → "$47"
- Implementation plan doc → Update all "$67" references to "$47"

---

### ✅ Decision 2: Delivery Model

**RECOMMENDATION: Option B+ (Direct Storage with Dedicated API)**

**Model:**
- Paid blueprint does NOT grant credits
- Paid blueprint does NOT require user account creation
- Photos generated via NEW API: `/app/api/blueprint/generate-paid/route.ts`
- Photos stored directly in `blueprint_subscribers` table (new JSONB column)
- Uses `access_token` for authentication (not Supabase auth)
- Generation uses generic prompt-based approach (no trained model)

**Why:**
1. ✅ Keeps paid blueprint isolated from main Studio system (lower risk)
2. ✅ Maintains simple UX (no account creation, no training)
3. ✅ Buyer gets photos immediately after purchase
4. ✅ Can generate without 30+ minute model training
5. ✅ Natural upgrade path: "Want YOUR face? Upgrade to Studio + train model"

**Consequences:**
- Must create new generation API (isolated from studio)
- Must store photo URLs in blueprint_subscribers (new column)
- Must handle generation without trained model (use base FLUX model + generic prompts)
- Photos won't be in user's Studio library (they're blueprint-specific)

**Upgrade path:**
- When paid blueprint buyer upgrades to Studio:
  - Create account via webhook (existing logic)
  - Grant 500 monthly credits
  - Prompt to train model
  - Blueprint photos remain in blueprint_subscribers (separate)

---

### ✅ Decision 3: Minimal Schema Changes

**REQUIRED new columns (6 total):**

```sql
ALTER TABLE blueprint_subscribers
ADD COLUMN IF NOT EXISTS paid_blueprint_purchased BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS paid_blueprint_purchased_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS paid_blueprint_stripe_payment_id TEXT,
ADD COLUMN IF NOT EXISTS paid_blueprint_photo_urls JSONB, -- Array of 30 URLs
ADD COLUMN IF NOT EXISTS paid_blueprint_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS paid_blueprint_generated_at TIMESTAMPTZ;
```

**REUSE existing columns:**
- ✅ `converted_to_user` → Can track if upgraded to Studio (keep as is)
- ✅ `converted_at` → Tracks Studio membership conversion (keep as is)
- ✅ `day_3_email_sent`, `day_7_email_sent`, `day_14_email_sent` → Reuse for paid sequence
- ✅ `strategy_data` → Already stores blueprint concept
- ✅ `access_token` → Already used for auth

**NOT NEEDED (from original plan's 11 columns):**
- ❌ `paid_blueprint_generation_status` (simple boolean is enough for v1)
- ❌ `paid_blueprint_batch_1_urls`, `batch_2_urls`, `batch_3_urls` (just store all 30 in one JSONB)
- ❌ `paid_blueprint_generation_error` (log to admin error table instead)
- ❌ `day_1_paid_email_sent`, `day_3_paid_email_sent`, `day_7_paid_email_sent` (reuse existing day_3, day_7, day_14 flags)

**Total new columns: 6 (down from 11)**

**Justification:**

1. **`paid_blueprint_purchased`** → Essential flag to identify paying customers vs free
2. **`paid_blueprint_purchased_at`** → Required for email sequence timing + analytics
3. **`paid_blueprint_stripe_payment_id`** → Required for refund handling + payment reconciliation
4. **`paid_blueprint_photo_urls`** → Core deliverable (30 photo URLs)
5. **`paid_blueprint_generated`** → Idempotency flag (prevent double generation)
6. **`paid_blueprint_generated_at`** → Track delivery time + trigger delivery email

**Why NOT more columns:**
- Batch tracking adds complexity without benefit (users don't care about batches)
- Generation status can be derived: purchased=TRUE + generated=FALSE = "pending"
- Error tracking belongs in `admin_error_log` table, not customer-facing table
- Email flags can be reused (day_3 becomes "day 3 after purchase" not "day 3 after signup")

---

## CONSEQUENCES: EXACT PLACES TO UPDATE

### Code Changes Required

**1. Product Config**
- File: `/lib/products.ts`
- Add: `paid_blueprint` object with price: 47, credits: 0

**2. Webhook Handler**
- File: `/app/api/webhooks/stripe/route.ts`
- Location: Line ~136 (after `productType = session.metadata.product_type`)
- Add: `if (productType === 'paid_blueprint') { ... }` case
- Logic: Update blueprint_subscribers (set purchased flags), NO credit grant

**3. Database Migration**
- File: `/scripts/migrations/add-paid-blueprint-tracking.sql` (NEW)
- Add: 6 columns listed above

**4. Generation API**
- File: `/app/api/blueprint/generate-paid/route.ts` (NEW)
- Auth: Validate `access_token` from blueprint_subscribers
- Check: `paid_blueprint_purchased = TRUE` and `paid_blueprint_generated = FALSE`
- Generate: 30 photos using base FLUX model (no trained model)
- Store: URLs in `paid_blueprint_photo_urls`
- Mark: `paid_blueprint_generated = TRUE`

**5. Status API**
- File: `/app/api/blueprint/get-paid-status/route.ts` (NEW)
- Purpose: Poll generation progress
- Returns: purchased status, generated status, photo URLs

**6. Checkout Page**
- File: `/app/checkout/blueprint/page.tsx` (NEW)
- Calls: `createLandingCheckoutSession('paid_blueprint', email)`
- Displays: $47 price

**7. Success Page**
- File: `/app/checkout/success/page.tsx`
- Update: Detect `product_type === 'paid_blueprint'`
- Show: Custom message + link to `/blueprint/paid?access={token}`

**8. Paid Blueprint UI**
- File: `/app/blueprint/paid/page.tsx` (NEW)
- Auth: Uses `?access={token}` query param
- Shows: "Generate My 30 Photos" button (if not generated)
- Shows: Gallery of 30 photos (if generated)
- Shows: Download buttons + upgrade CTA

**9. Email Templates**
- Files: `/lib/email/templates/paid-blueprint-delivery.tsx` (NEW)
- Subject: "Your 30 Custom Photos Are Ready!"
- Content: Preview + link with access token

**10. Email Sequence**
- File: `/app/api/cron/send-blueprint-followups/route.ts`
- Update: Reuse existing day_3/day_7/day_14 logic
- Add: Check for `paid_blueprint_purchased = TRUE`
- Send: Upgrade CTAs in day 3, 7, 14 emails (different content)

---

### Stripe Setup Required

**Test Mode:**
1. Create product: "SSELFIE Brand Blueprint"
2. Create price: $47.00 USD one-time
3. Copy price ID → `.env.local` as `STRIPE_PAID_BLUEPRINT_PRICE_ID`

**Production:**
1. Same as test mode
2. Copy price ID → Vercel environment variables

---

### Documentation Updates

**Files to update:**
1. `/docs/PAID-BLUEPRINT-IMPLEMENTATION-PLAN.md` → Change all "$67" to "$47"
2. `/docs/MINI-PRODUCTS-EXECUTIVE-SUMMARY.md` → Line 39: Change $67 to $47
3. `/docs/MINI-PRODUCT-MONETIZATION-AUDIT.md` → Line 262: Change $67 to $47 (or note as "updated")
4. `/docs/MINI-PRODUCTS-SYSTEM-DIAGRAM.md` → Update pricing references

---

## GREEN-LIGHT CRITERIA TO START PR-1

### ✅ Decisions Confirmed

- [ ] Sandra approves $47 price (not $67)
- [ ] Sandra approves "direct photo storage" model (not credit-based)
- [ ] Sandra approves 6 new columns (not 11)

### ✅ Stripe Setup

- [ ] Stripe product created in test mode
- [ ] Price ID stored in `.env.local`
- [ ] Test purchase completed successfully
- [ ] Webhook receiving events

### ✅ Technical Validation

- [ ] Verified blueprint_subscribers has existing generation columns (`grid_url`, `grid_frame_urls`)
- [ ] Verified access_token authentication pattern works
- [ ] Verified webhook handler structure for adding new product types
- [ ] Confirmed email sequence can be extended without breaking existing flow

### ✅ Risk Assessment

- [ ] Understand paid blueprint photos won't be in Studio library (by design)
- [ ] Understand photos generated without trained model (generic prompts)
- [ ] Understand paid blueprint buyers can't regenerate (one-time generation)
- [ ] Understand upgrade path requires separate model training step

---

## RECOMMENDATION

**START PR-1 with these constraints:**

1. **Price: $47 (firm)**
2. **Delivery: Direct storage in blueprint_subscribers, 6 new columns**
3. **Auth: Token-based (reuse access_token)**
4. **Generation: New API, no trained model, 30 photos one-time**
5. **Emails: Reuse existing day_3/7/14 flags with paid-specific content**

**Do NOT:**
- Grant credits for paid blueprint
- Create user accounts for paid blueprint buyers
- Require model training for paid blueprint
- Add 11 columns (only add 6)
- Use batch tracking columns

**Benefits of this approach:**
- ✅ Lowest risk (isolated from Studio system)
- ✅ Fastest implementation (reuse most infrastructure)
- ✅ Simplest UX (no account, no training)
- ✅ Clear upgrade path (paid blueprint → Studio)
- ✅ Minimal schema changes (6 columns)

---

**DECISION MAKER:** Sandra  
**NEXT STEP:** Approve this document → Start PR-1 (Product Config + Checkout Route)

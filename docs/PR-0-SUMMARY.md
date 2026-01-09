# PR-0 Audit Summary: Critical Decisions

**Status:** ✅ Complete  
**Next Step:** Sandra approval → Start PR-1

---

## 🎯 Three Critical Questions Resolved

### Q1: Price - $47 or $67?

**ANSWER: $47**

**Evidence:**
- Docs conflict: MINI-PRODUCT-MONETIZATION-AUDIT says $67, PAID-BLUEPRINT-IMPLEMENTATION-PLAN says $47
- Code: NO existing implementation (neither price exists in codebase)
- Recommendation: $47 for higher conversion on first mini product

**Action Required:**
- Update 4 docs to consistently show $47
- Create Stripe product at $47 (not $67)

---

### Q2: Delivery Model - Credits or Direct Photos?

**ANSWER: Direct Photos (NOT Credits)**

**Evidence:**
- Existing `one_time_session` grants **50 credits** (verified in `/lib/credits.ts` line 26)
- Studio generation requires authenticated user + trained model (verified in `/app/api/studio/generate/route.ts`)
- Blueprint uses token-based access, NO user accounts
- Blueprint already stores photo URLs in JSONB columns (`grid_frame_urls`)

**Recommendation: Option B+ (Direct Storage)**
- NO credits granted
- NO user account required
- Photos stored in `blueprint_subscribers.paid_blueprint_photo_urls` (JSONB)
- New API: `/app/api/blueprint/generate-paid/route.ts`
- Uses generic FLUX model (no trained model needed)

**Why:**
- ✅ Isolated from Studio (lower risk)
- ✅ Simple UX (no account, no training)
- ✅ Immediate delivery
- ✅ Clear upgrade path to Studio

---

### Q3: Schema Changes - 11 columns or fewer?

**ANSWER: 6 columns (NOT 11)**

**Evidence:**
- `blueprint_subscribers` already has 44+ columns (verified in migrations)
- Already has: `converted_to_user`, `converted_at`, `day_3_email_sent`, `day_7_email_sent`, `day_14_email_sent`
- Already has: `strategy_data`, `grid_url`, `grid_frame_urls` (JSONB)

**Required NEW columns (6):**
1. `paid_blueprint_purchased` (BOOLEAN)
2. `paid_blueprint_purchased_at` (TIMESTAMPTZ)
3. `paid_blueprint_stripe_payment_id` (TEXT)
4. `paid_blueprint_photo_urls` (JSONB) ← 30 photo URLs
5. `paid_blueprint_generated` (BOOLEAN)
6. `paid_blueprint_generated_at` (TIMESTAMPTZ)

**Reuse existing:**
- ✅ `day_3_email_sent` → Repurpose for paid email sequence
- ✅ `converted_to_user` → Track Studio upgrade
- ✅ `access_token` → Auth for paid blueprint

**NOT needed:**
- ❌ Batch tracking columns (complexity without benefit)
- ❌ Generation status enum (boolean is enough)
- ❌ Separate paid email flags (reuse existing)

---

## 📋 GREEN-LIGHT CHECKLIST

### Before PR-1:

- [ ] **Sandra approves $47 price** (not $67)
- [ ] **Sandra approves direct photo storage** (not credit-based)
- [ ] **Sandra approves 6 new columns** (not 11)
- [ ] **Stripe product created** (test mode, $47)
- [ ] **Price ID in `.env.local`**

### What Changes:

**Code (10 files):**
1. `/lib/products.ts` → Add paid_blueprint config
2. `/app/api/webhooks/stripe/route.ts` → Add paid_blueprint case
3. `/scripts/migrations/add-paid-blueprint-tracking.sql` → 6 columns
4. `/app/api/blueprint/generate-paid/route.ts` → NEW (generation)
5. `/app/api/blueprint/get-paid-status/route.ts` → NEW (polling)
6. `/app/checkout/blueprint/page.tsx` → NEW (checkout UI)
7. `/app/checkout/success/page.tsx` → Detect paid_blueprint
8. `/app/blueprint/paid/page.tsx` → NEW (gallery UI)
9. `/lib/email/templates/paid-blueprint-delivery.tsx` → NEW
10. `/app/api/cron/send-blueprint-followups/route.ts` → Extend for paid

**Docs (4 files):**
1. MINI-PRODUCT-MONETIZATION-AUDIT.md → $67 → $47
2. MINI-PRODUCTS-EXECUTIVE-SUMMARY.md → $67 → $47
3. PAID-BLUEPRINT-IMPLEMENTATION-PLAN.md → Update delivery model
4. MINI-PRODUCTS-SYSTEM-DIAGRAM.md → Update pricing

---

## 🚨 Key Constraints for PR-1

**DO:**
- ✅ Price at $47
- ✅ Store 30 photos directly in blueprint_subscribers
- ✅ Use token-based auth (access_token)
- ✅ Generate without trained model
- ✅ Add only 6 columns

**DON'T:**
- ❌ Grant credits
- ❌ Create user accounts
- ❌ Require model training
- ❌ Add 11 columns
- ❌ Use batch tracking

---

## 💡 Why This Approach Wins

1. **Lowest Risk:** Isolated from Studio system
2. **Fastest Ship:** Reuse 90% of infrastructure
3. **Simplest UX:** No account, no training, instant delivery
4. **Clear Upgrade:** "Want YOUR face? Train model in Studio"
5. **Minimal Schema:** 6 columns vs 11

---

**DECISION MAKER:** Sandra  
**TIMELINE:** Approve today → PR-1 tomorrow → Ship in 7 days

**Full details:** `/docs/PR-0-PAID-BLUEPRINT-DECISIONS.md`

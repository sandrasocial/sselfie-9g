# Manual Steps Required Before Automation Implementation

**Created:** December 12, 2024

---

## ✅ ALREADY COMPLETED (No Action Needed)

1. **Stripe Discount Codes** ✅
   - BLUEPRINT10: $10 off (created)
   - WELCOMEBACK15: $15 off (created)
   - Both codes are active and ready to use

2. **Database Migrations** ✅
   - Blueprint email tracking columns already added
   - Email logs table has campaign_id column

3. **Email Campaign System** ✅
   - Validated and tested
   - Successfully sent to 2,742 subscribers
   - All templates working

4. **Pricing Updates** ✅
   - Landing page: 3-tier structure
   - /whats-new page: Updated
   - All credit-based language removed

---

## 🔧 MANUAL STEPS YOU NEED TO DO

### 1. Environment Variables (Vercel Dashboard)

**Go to:** Vercel Dashboard → Your Project → Settings → Environment Variables

**Add these variables** (if not already set):

- [ ] `CRON_SECRET` 
  - **Value**: Generate a secure random string
  - **How to generate**: `openssl rand -hex 32` or use https://randomkeygen.com
  - **Purpose**: Secures cron job endpoints
  - **Required for**: Email automation cron jobs

- [ ] `NEXT_PUBLIC_GA_MEASUREMENT_ID` (Optional - for Day 5)
  - **Value**: Your Google Analytics 4 Measurement ID (format: G-XXXXXXXXXX)
  - **How to get**: Google Analytics → Admin → Data Streams → Your Stream → Measurement ID
  - **Purpose**: Track conversions and user behavior
  - **Required for**: Analytics tracking (Prompt 11)

- [ ] `FACEBOOK_PIXEL_ID` (Optional - for Day 5)
  - **Value**: Your Facebook Pixel ID (format: 15-digit number)
  - **How to get**: Facebook Events Manager → Data Sources → Your Pixel → Settings
  - **Purpose**: Track Facebook ad conversions
  - **Required for**: Facebook Pixel tracking (Prompt 11)

**Note**: `CRON_SECRET` is required for email automation. GA4 and Facebook Pixel are optional but recommended.

---

### 2. Verify Stripe Discount Codes

**Go to:** https://dashboard.stripe.com/coupons

**Verify these codes exist:**
- [ ] BLUEPRINT10 - $10 off, one-time use
- [ ] WELCOMEBACK15 - $15 off, one-time use

**If codes don't appear:**
- Run: `pnpm exec tsx scripts/create-email-discount-codes.ts`
- Codes are already created, but verify they're visible in Stripe dashboard

---

### 3. Database Migration (Run Once)

**When implementing Day 2 Prompt 7 or Day 3 Prompt 8:**

The email automation system needs additional database tables. Run this migration:

```bash
# Option 1: Using the script (recommended)
pnpm exec tsx scripts/setup-email-automation-tables.ts

# Option 2: Using psql directly
psql $DATABASE_URL -f scripts/setup-email-automation-tables.sql
```

**This will create:**
- `welcome_back_sequence` table
- Additional tracking columns in `email_logs`

**Note**: The blueprint email tracking columns were already added in a previous session, so you may see "column already exists" messages - that's fine.

---

### 4. Vercel Cron Jobs (After Creating Cron Endpoints)

**After implementing Day 2 Prompt 7 and Day 3 Prompt 8:**

1. **Verify `vercel.json` has cron jobs:**
   ```json
   {
     "crons": [
       {
         "path": "/api/cron/blueprint-email-sequence",
         "schedule": "0 10 * * *"
       },
       {
         "path": "/api/cron/welcome-back-sequence",
         "schedule": "0 11 * * *"
       },
       {
         "path": "/api/cron/send-blueprint-followups",
         "schedule": "0 10 * * *"
       }
     ]
   }
   ```

2. **Deploy to Vercel:**
   - Push changes to GitHub
   - Vercel will auto-deploy
   - Cron jobs activate automatically after deployment

3. **Verify cron jobs are active:**
   - Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
   - Should see 3 cron jobs listed

---

### 5. Track Initial Campaign Recipients (One-Time)

**After sending your first "Welcome Back" campaign:**

Run this command to add recipients to the welcome_back_sequence table:

```bash
curl -X POST https://sselfie.ai/api/admin/email/track-campaign-recipients \
  -H "Content-Type: application/json" \
  -d '{"campaignId": YOUR_CAMPAIGN_ID}'
```

**Replace `YOUR_CAMPAIGN_ID`** with the actual campaign ID (e.g., 3)

**This ensures:**
- Recipients get Day 7 and Day 14 follow-up emails automatically
- No manual tracking needed

---

### 6. Buffer Account Setup (For Day 4)

**Before implementing Day 4 Prompt 9:**

1. **Sign up for Buffer:**
   - Go to https://buffer.com
   - Choose plan: **Essentials** ($20/mo) or **Team** ($40/mo)
   - Essentials is sufficient for Instagram scheduling

2. **Connect Instagram:**
   - In Buffer dashboard, go to "Channels"
   - Click "Connect Instagram"
   - Follow authentication steps

3. **Wait for batch script:**
   - Don't do anything else yet
   - Wait until Day 4 Prompt 9 creates the batch script
   - Then follow the Buffer upload guide (Day 4 Prompt 10)

---

### 7. Google Analytics Setup (For Day 5 - Optional)

**Before implementing Day 5 Prompt 11:**

1. **Create GA4 Property** (if you don't have one):
   - Go to https://analytics.google.com
   - Admin → Create Property
   - Choose "Web" as platform
   - Enter property name: "SSELFIE"
   - Get your Measurement ID (format: G-XXXXXXXXXX)

2. **Add to Vercel:**
   - Copy Measurement ID
   - Add as `NEXT_PUBLIC_GA_MEASUREMENT_ID` in Vercel environment variables

3. **Verify tracking:**
   - After implementing Prompt 11, visit your site
   - Check GA4 Real-Time reports to see your visit

---

## 📋 IMPLEMENTATION CHECKLIST

**Before starting implementation, verify:**

- [ ] `CRON_SECRET` is set in Vercel (required)
- [ ] Stripe discount codes exist (BLUEPRINT10, WELCOMEBACK15)
- [ ] Database migrations can be run (have DATABASE_URL)
- [ ] Vercel project is connected to GitHub (for auto-deploy)

**During implementation:**

- [ ] Run database migrations when prompted
- [ ] Test each feature before moving to next
- [ ] Deploy to Vercel after creating cron endpoints
- [ ] Track initial campaign recipients after first send

**After implementation:**

- [ ] Verify cron jobs are active in Vercel
- [ ] Test email sequences (send test emails)
- [ ] Monitor first automated sends
- [ ] Check conversion tracking is working

---

## ⚠️ IMPORTANT NOTES

1. **Discount Codes**: ✅ **FIXED** - The `win-back-offer.tsx` template now supports both dollar amounts and percentages. Use `offerAmount` for dollar discounts and `offerDiscount` for percentage discounts:
   ```typescript
   // For dollar-amount codes (BLUEPRINT10, WELCOMEBACK15)
   generateWinBackOfferEmail({
     offerCode: "BLUEPRINT10",
     offerAmount: 10, // Shows "$10 OFF"
   })
   
   // For percentage discounts (if needed in future)
   generateWinBackOfferEmail({
     offerCode: "SAVE20",
     offerDiscount: 20, // Shows "20% OFF"
   })
   ```

2. **Email Templates**: The templates are ready to use the discount codes. The template automatically detects whether to show "$X OFF" or "X% OFF" based on which parameter you pass.

3. **Cron Jobs**: Vercel cron jobs only work in production. Test locally first, then deploy to Vercel for cron jobs to activate.

4. **Database**: All migrations use `IF NOT EXISTS`, so they're safe to run multiple times.

---

## 🚀 READY TO START?

**You're ready to begin implementation when:**

1. ✅ `CRON_SECRET` is set in Vercel
2. ✅ Stripe discount codes verified
3. ✅ Database access confirmed

**Start with:** Day 2 Prompt 7 (Blueprint email automation)

---

**Questions?** Check `AUTOMATION-IMPLEMENTATION-STATUS.md` for progress tracking.

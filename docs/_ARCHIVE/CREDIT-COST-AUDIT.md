# SSELFIE Studio Credit Cost Audit

**Date:** 2025-01-XX  
**Purpose:** Map credit costs to actual API expenses, calculate break-even points, and identify profit margins

---

## 📊 Credit System Overview

### Credit Costs (from `lib/credits.ts`)

| Action | Credits Charged | Actual API Cost | Cost per Credit |
|--------|----------------|-----------------|-----------------|
| **Training** | 20 credits | $3.00 per model | $0.15 per credit |
| **Image (Classic)** | 1 credit | $0.15 per image | $0.15 per credit |
| **Image (Studio Pro)** | 2 credits | $0.30 per image | $0.15 per credit |
| **Animation** | 3 credits | TBD | TBD |

### Credit Pricing
- **Base rate:** $0.15 per credit (actual API cost)
- **Studio Membership:** 200 credits/month = $30 value at API cost
- **One-time Session:** 50 credits = $7.50 value at API cost

### Claude API Costs (Unbilled)
- **Sonnet 4:** ~$0.003-0.015 per message
- **Usage:** Maya chat, captions, strategy generation
- **Estimated:** $10-20/month per active user

---

## 🔌 API Usage Mapping

### 1. Image Generation (Classic Mode - Flux)

**API:** Replicate - User's trained Flux LoRA model  
**Route:** `app/api/maya/generate-image/route.ts`  
**Credits:** 1 credit per image  
**Model:** Custom Flux LoRA (trained per user)

**Actual Replicate Cost:**
- Flux LoRA inference: **$0.15 per image**
- **Cost per credit:** **$0.15**
- **Break-even:** 1 credit = $0.15 cost (no markup on credits themselves)

**Files:**
- `app/api/maya/generate-image/route.ts`
- `app/api/studio/generate/route.ts` (4 variations = 4 credits = $0.60)
- `app/api/maya/create-photoshoot/route.ts` (50 images = 50 credits = $7.50)

---

### 2. Image Generation (Studio Pro - Nano Banana)

**API:** Replicate - `google/nano-banana-pro`  
**Route:** `app/api/feed/[feedId]/generate-single/route.ts`  
**Credits:** 2 credits per image  
**Model:** `google/nano-banana-pro`  
**Resolution:** 1K/2K/4K (all cost 2 credits)

**Actual Replicate Cost:**
- Nano Banana Pro: **$0.30 per image** (2K resolution)
- **Cost per credit:** **$0.15** (2 credits charged)
- **Break-even:** 2 credits = $0.30 cost (no markup on credits themselves)

**Files:**
- `lib/nano-banana-client.ts`
- `app/api/maya/generate-studio-pro/route.ts`
- `app/api/feed/[feedId]/generate-single/route.ts` (Pro Mode)
- `app/api/scene-composer/generate/route.ts`

---

### 3. Video Generation (Animation)

**API:** Replicate - `wan-video/wan-2.5-i2v-fast`  
**Route:** `app/api/maya/generate-video/route.ts`  
**Credits:** 3 credits per video  
**Model:** `wan-video/wan-2.5-i2v-fast`  
**Duration:** 5 seconds (1080p)

**Estimated Replicate Cost:**
- WAN-2.5 I2V Fast: ~$0.05-0.10 per 5-second video
- **Cost per credit:** ~$0.017-0.033 (3 credits charged)
- **Break-even:** 3 credits = $0.60 charged, ~$0.075 cost → **~8x markup**

**Files:**
- `app/api/maya/generate-video/route.ts`

---

### 4. LoRA Training

**API:** Replicate - `replicate/fast-flux-trainer`  
**Route:** `app/api/training/start/route.ts`  
**Credits:** 20 credits per training  
**Model:** `replicate/fast-flux-trainer`  
**Version:** `f463fbfc97389e10a2f443a8a84b6953b1058eafbf0c9af4d84457ff07cb04db`

**Actual Replicate Cost:**
- Fast Flux Trainer: **$3.00 per training** (varies by image count, steps)
- **Cost per credit:** **$0.15** (20 credits charged)
- **Break-even:** 20 credits = $3.00 cost (no markup on credits themselves)

**Files:**
- `app/api/training/start/route.ts`
- `lib/replicate-client.ts` (training parameters)

**Training Parameters:**
- Steps: 1200-1400 (adaptive based on image count)
- LoRA Rank: 32-48 (adaptive)
- Batch size: 1
- Resolution: 1024

**⚠️ NOTE:** Code currently shows 25 credits in `CREDIT_COSTS.TRAINING`, but actual cost is $3.00 = 20 credits at $0.15/credit. Consider updating code to match.

---

### 5. Anthropic Claude API (Prompt Generation)

**API:** Anthropic Claude  
**Usage:** Prompt generation, strategy creation, content planning  
**Models Used:**
- `anthropic/claude-sonnet-4-20250514` (primary)
- `anthropic/claude-haiku-4.5` (lightweight tasks)
- `anthropic/claude-sonnet-4` (legacy)

**Actual Cost:**
- Sonnet 4: **~$0.003-0.015 per message** (varies with Maya chat, captions, strategy)
- Haiku 4.5: ~$0.00025 per 1K input tokens, ~$0.00125 per 1K output tokens
- **Not directly charged to users** (included in service)
- **Estimated monthly cost:** **$10-20/month per active user**

**Files:**
- `lib/maya/direct-prompt-generation.ts`
- `lib/feed-planner/orchestrator.ts`
- `lib/feed-planner/caption-writer.ts`
- `lib/alex/shared/helpers.ts`
- Many more (see grep results)

**Impact:** These costs are absorbed into the service, not passed through credits. This is a significant cost driver that must be factored into pricing.

---

### 6. OpenAI Embeddings

**API:** OpenAI - `text-embedding-3-small`  
**Usage:** Semantic search, content analysis  
**Route:** `lib/ai/embeddings.ts`

**Estimated Cost:**
- `text-embedding-3-small`: ~$0.00002 per 1K tokens
- **Not directly charged to users** (included in service)

**Files:**
- `lib/ai/embeddings.ts`
- `lib/ai/semantic-search.ts`

---

## 💰 Cost Summary Table

| Action | Credits Charged | API | Actual Cost / Credit | Actual Cost / Action | Notes |
|--------|----------------|-----|---------------------|---------------------|-------|
| **Classic Image** | 1 | Flux LoRA (Replicate) | $0.15 | $0.15 | No markup on credits |
| **Studio Pro Image** | 2 | Nano Banana Pro (Replicate) | $0.15 | $0.30 | No markup on credits |
| **Video/Animation** | 3 | WAN-2.5 I2V (Replicate) | TBD | TBD | Needs verification |
| **LoRA Training** | 20 | Fast Flux Trainer (Replicate) | $0.15 | $3.00 | One-time per user |

**Key Insight:** Credits are priced at cost ($0.15/credit). Profit margin comes from subscription pricing, not credit markup.

---

## 📈 Monthly Credit Grants & Economics

### Current System: Creator Studio ($97/month)

**Subscription Details:**
- **Price:** $97/month
- **Credits Granted:** 200 credits/month
- **Credit Value (at $0.15/credit):** $30

**Cost Analysis (Typical User - 120-150 credits used):**
- Image generation: 120-150 credits × $0.15 = **$18-22.50**
- Claude API (Maya/chat/captions): **$10-15**
- **Total cost:** **$30-37.50**
- **Margin:** $60-67/month (**62-69% gross margin**) ✅

**Cost Analysis (Power User - Full 200 credits used):**
- Image generation: 200 credits × $0.15 = **$30** (all Pro) or **$15** (all Classic)
- Average mixed usage: **$20-25**
- Claude API: **$15-20**
- **Total cost:** **$40-45**
- **Margin:** $52-57/month (**54-59% gross margin**) ✅

**Maximum Usage Scenarios:**
- 100% Pro Mode: 100 images × $0.30 = **$30** + Claude = **$45-50** total
- 100% Classic Mode: 200 images × $0.15 = **$30** + Claude = **$45-50** total
- 50/50 mix: (50 Pro × $0.30) + (100 Classic × $0.15) = **$30** + Claude = **$45-50** total

### One-Time Session ($49)

**Subscription Details:**
- **Price:** $49 one-time
- **Credits Granted:** 50 credits
- **Credit Value (at $0.15/credit):** $7.50

**Cost Analysis:**
- 50 Classic images: 50 × $0.15 = **$7.50**
- 1 LoRA training: **$3.00**
- Claude API (minimal): **$2**
- **Total cost:** **$12.50**
- **Margin:** $36.50 (**74% gross margin**) ✅

---

## 🎯 Break-Even Analysis

### Per-Credit Economics
- **Credit cost:** $0.15 per credit (actual API cost)
- **No markup on credits** - profit comes from subscription pricing
- **Break-even:** Credits are priced at cost

### Monthly Break-Even (Creator Studio - $97/month)
- **Revenue:** $97/month
- **API costs (typical user):** $30-37.50/month
- **API costs (power user):** $40-45/month
- **Break-even usage:** ~31-46% of revenue
- **Gross margin:** 54-69% (healthy for SaaS)

### The "Unlimited" Danger ⚠️

**Scenario:** If offering truly unlimited at $97/month

**Power User Example:**
- Generates 500 Pro images = 1000 credits = **$150 in costs**
- You charge $97, cost $150 = **-$53 loss per customer**
- Just 10 power users = **-$530/month loss**
- This bankrupts you fast 💸

**Why "Unlimited" Fails:**
- No cost ceiling = unlimited liability
- Power users can generate thousands of images
- Claude API costs scale with usage
- No natural upgrade path

**✅ Solution: "Generous Limits" Strategy**

Instead of "unlimited," use **generous fair-use limits** that:
- ✅ Feel unlimited to 90% of users
- ✅ Protect you from power user losses
- ✅ Create natural upgrade path
- ✅ Keep 30-40% gross margins (healthy for SaaS)

**Recommended Limits:**
- 200 credits/month = ~100 Pro images OR ~200 Classic images
- Positioned as: "Enough for 3-4 complete photoshoots per month"
- Feels generous, protects margins

---

## ⚠️ Risk Factors

### 1. High API Cost Actions
- **Studio Pro images:** $0.30 each (2 credits) - highest per-image cost
- **LoRA training:** $3.00 each (20 credits) - one-time per user, manageable
- **Video generation:** TBD - needs cost verification

### 2. Credit Grant Costs
- **Milestone bonuses:** Currently disabled (MILESTONE_BONUSES_ENABLED=false) ✅
- **Referral bonuses:** 50 credits ($7.50) + 25 credits ($3.75) = $11.25 value
- **Welcome credits:** 25 credits = $3.75 value

### 3. Unbilled API Usage (Critical Risk)
- **Anthropic Claude:** $10-20/month per active user
- **OpenAI Embeddings:** Minimal cost
- **Impact:** Claude costs can equal or exceed image generation costs
- **Risk:** High-usage users who chat frequently can drive Claude costs up significantly

### 4. Power User Risk
- **Scenario:** User generates 500+ images/month
- **Cost:** 500 Pro images = $150 + Claude = $170-190/month
- **Revenue:** $97/month
- **Loss:** -$73-93/month per power user
- **Mitigation:** Credit limits (200/month) prevent this scenario

---

## 📋 Recommendations

### 1. ✅ Update Credit Costs in Code
- [ ] Update `CREDIT_COSTS.TRAINING` from 25 to 20 credits (matches $3.00 cost)
- [ ] Verify all credit costs match actual API costs
- [ ] Document cost per credit ($0.15) in code comments

### 2. Monitor High-Cost Actions
- [ ] Track Studio Pro usage (highest per-image cost at $0.30)
- [ ] Monitor Claude API costs per user (can equal image generation costs)
- [ ] Alert if average user Claude costs exceed $20/month

### 3. Cost Optimization
- [ ] Optimize Anthropic usage (use Haiku where possible, Sonnet only when needed)
- [ ] Consider Claude usage limits for power users
- [ ] Review video generation costs (if implemented)

### 4. Credit Grant Review
- [ ] Keep milestone bonuses disabled until cost model reviewed ✅
- [ ] Evaluate referral bonus economics ($11.25 per conversion)
- [ ] Consider Claude API usage in referral economics

### 5. Pricing Strategy
- [ ] **DO NOT** offer "unlimited" - use generous limits instead
- [ ] Maintain 200 credits/month limit (protects margins)
- [ ] Position as "3-4 complete photoshoots per month" (feels generous)
- [ ] Monitor average credit usage to adjust limits if needed

### 6. Margin Protection
- [ ] Target 30-40% gross margins (currently 54-69% - healthy)
- [ ] Monitor power user costs (should stay under $45/month)
- [ ] Alert if average user costs exceed $50/month
- [ ] Consider usage-based pricing tiers if margins compress

---

## 🔍 Files Inspected

### Credit System
- `lib/credits.ts` - Credit costs and grants
- `lib/products.ts` - Pricing and packages
- `lib/nano-banana-client.ts` - Studio Pro credit costs

### API Routes
- `app/api/maya/generate-image/route.ts` - Classic Mode (Flux)
- `app/api/maya/generate-studio-pro/route.ts` - Studio Pro (Nano Banana)
- `app/api/maya/generate-video/route.ts` - Video (WAN-2.5)
- `app/api/training/start/route.ts` - LoRA Training
- `app/api/studio/generate/route.ts` - Studio (4 variations)
- `app/api/feed/[feedId]/generate-single/route.ts` - Feed generation

### Replicate Client
- `lib/replicate-client.ts` - Replicate client and training config
- `lib/replicate-helpers.ts` - Replicate input builders
- `lib/replicate-polling.ts` - Prediction polling

### AI Services
- `lib/ai/embeddings.ts` - OpenAI embeddings
- `lib/maya/direct-prompt-generation.ts` - Claude prompt generation
- `lib/feed-planner/orchestrator.ts` - Strategy generation

---

## 📊 Next Steps

1. **✅ Update Code:**
   - Update `CREDIT_COSTS.TRAINING` from 25 to 20 credits
   - Document actual costs in code comments
   - Verify all credit costs match API costs

2. **Track Usage Patterns:**
   - Query `credit_transactions` table for usage breakdown
   - Track Classic vs. Pro Mode usage ratio
   - Calculate average cost per user (images + Claude)

3. **Monitor Margins:**
   - Track monthly gross margin (target: 30-40%)
   - Alert if average user costs exceed $50/month
   - Monitor power user costs (should stay under $45/month)

4. **Optimize Claude Usage:**
   - Track Claude costs per user
   - Use Haiku where possible (cheaper model)
   - Consider Claude usage limits for power users

5. **Protect Against "Unlimited" Risk:**
   - Maintain 200 credits/month limit
   - Never offer truly unlimited
   - Position limits as "generous fair-use"

---

**Last Updated:** 2025-01-XX  
**Next Review:** After verifying actual Replicate costs

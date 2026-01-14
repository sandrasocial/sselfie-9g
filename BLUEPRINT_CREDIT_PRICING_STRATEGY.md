# Blueprint Funnel Credit Pricing Strategy

## 📊 Current Situation Analysis

### Current Credit Packages
- **100 Credits:** $45 ($0.45/credit)
- **200 Credits:** $85 ($0.425/credit)

### Preview Feed Cost
- **Preview Feed:** 2 credits per image (Pro Mode)
- **1 Preview Feed = 2 credits**

### User Journey Friction Point
1. **Free User:** Gets 2 credits (1 preview feed)
2. **After 1 preview:** Wants to test more
3. **Current Upsell:** $45 minimum (50 preview feeds worth)
4. **Problem:** $45 is a huge jump from "free" → High friction, low conversion

---

## 🎯 Strategic Recommendations

### Option 1: Small Credit Pack (RECOMMENDED) ⭐

**Add a "Starter Pack" for Blueprint Funnel:**

```
10 Credits - $9.99
- 5 preview feeds
- Perfect for testing different styles
- Low commitment entry point
```

**Why This Works:**
- ✅ **Low friction:** $9.99 is psychologically easier than $45
- ✅ **Right-sized:** 5 previews is enough to test but creates desire for more
- ✅ **Conversion path:** After 5 previews, user sees value → more likely to buy $47 blueprint or upgrade
- ✅ **Revenue:** Still profitable at $0.99/credit (vs $0.45/credit for 100 pack)

**Pricing Psychology:**
- Under $10 feels like "testing" not "purchasing"
- Creates sunk cost → user invested → more likely to upgrade
- 5 previews = enough to see variety but not enough to be satisfied

---

### Option 2: Preview Feed Package (ALTERNATIVE)

**Create a "Preview Feed Pack" specifically for blueprint funnel:**

```
5 Preview Feeds - $7.99
- Exactly 10 credits (5 × 2 credits)
- Branded as "Preview Feed Pack"
- Clear value proposition
```

**Why This Works:**
- ✅ **Clear value:** User knows exactly what they're getting
- ✅ **Lower price:** $7.99 is even more accessible
- ✅ **Focused:** Only for preview feeds, not general credits

**Considerations:**
- ⚠️ Less flexible (can't use for other features)
- ⚠️ Might confuse users about credit system

---

### Option 3: Tiered Entry (BEST FOR CONVERSION)

**Offer 3 options in upsell modal:**

```
Option 1: Test More (10 credits) - $9.99
  → 5 more preview feeds
  → "Perfect for exploring different styles"

Option 2: Unlock Full Blueprint - $47
  → 60 credits + Full Feed Planner
  → "Best value for serious creators"

Option 3: Get More Credits (100 credits) - $45
  → 50 preview feeds
  → "For power users"
```

**Why This Works:**
- ✅ **Progressive pricing:** $9.99 → $47 → $45 (creates anchor)
- ✅ **Clear value ladder:** Test → Commit → Power user
- ✅ **Reduces friction:** Always a low-cost option
- ✅ **Increases conversion:** More options = higher conversion rate

---

## 💰 Revenue Impact Analysis

### Current State (No Small Pack)
- **Conversion Rate:** ~5-10% (high friction)
- **Average Revenue:** $45-85 per converting user
- **Problem:** 90-95% of users drop off

### With 10-Credit Pack ($9.99)
- **Conversion Rate:** ~20-30% (lower friction)
- **Revenue Breakdown:**
  - 20% buy $9.99 pack → $2.00/user
  - 10% upgrade to $47 blueprint → $4.70/user
  - 5% buy $45 credits → $2.25/user
  - **Total:** ~$8.95/user (vs $4.50/user currently)

**Key Insight:** Lower price point increases total revenue by 2x due to higher conversion.

---

## 🎨 Implementation Strategy

### Phase 1: Add Small Credit Pack (Quick Win)
1. **Add to `lib/products.ts`:**
   ```typescript
   {
     id: "credits_topup_10",
     name: "10 Credits",
     displayName: "Starter Pack",
     credits: 10,
     priceInCents: 999, // $9.99
     description: "Perfect for testing 5 preview feeds",
   }
   ```

2. **Update Upsell Modal:**
   - Show 3 options: $9.99 (10 credits), $47 (Blueprint), $45 (100 credits)
   - Highlight $9.99 as "Test More" option
   - Position $47 as "Best Value"

3. **Marketing Copy:**
   - "Test More Styles" (not "Buy Credits")
   - "5 Preview Feeds" (clear value)
   - "Just $9.99" (emphasize low price)

### Phase 2: A/B Test Pricing
- Test $7.99 vs $9.99 vs $12.99
- Measure conversion rate and revenue per user
- Optimize based on data

### Phase 3: Smart Upsell Logic
- If user buys $9.99 pack → Show upgrade to $47 blueprint after 3 previews
- If user buys $47 blueprint → Show upgrade to $97/month membership
- Progressive upsell based on usage

---

## 📈 Expected Outcomes

### With 10-Credit Pack ($9.99)

**User Journey:**
1. Free user generates 1 preview (2 credits used)
2. Sees upsell modal with 3 options
3. 25% buy $9.99 pack → Generate 5 more previews
4. After 3 previews, show "Unlock Full Blueprint" upsell
5. 40% of $9.99 buyers upgrade to $47 blueprint
6. **Total conversion:** 25% → $9.99, 10% → $47 = 35% total conversion

**Revenue Impact:**
- **Before:** 10% conversion × $45 = $4.50/user
- **After:** 35% conversion × ($9.99 × 25% + $47 × 10%) = $8.95/user
- **Increase:** 2x revenue per user

---

## 🎯 Recommendation

**Implement Option 1: 10-Credit Starter Pack ($9.99)**

**Why:**
1. ✅ **Lowest friction** - Under $10 feels like testing
2. ✅ **Right-sized** - 5 previews creates desire for more
3. ✅ **Profitable** - Still 2x markup vs cost
4. ✅ **Conversion path** - Natural upgrade to $47 blueprint
5. ✅ **Quick to implement** - Just add new package

**Next Steps:**
1. Add 10-credit pack to products
2. Update upsell modal to show 3 options
3. A/B test pricing ($7.99, $9.99, $12.99)
4. Track conversion rates and optimize

---

## 🔄 Alternative: Preview Feed Subscription

**If you want to go even lower friction:**

```
Preview Feed Pass - $4.99/month
- 5 preview feeds per month
- Auto-renew
- Cancel anytime
```

**Pros:**
- ✅ Even lower entry point
- ✅ Recurring revenue
- ✅ Creates habit

**Cons:**
- ⚠️ More complex (subscription management)
- ⚠️ Lower per-transaction revenue
- ⚠️ Might cannibalize blueprint sales

**Recommendation:** Start with one-time 10-credit pack, then consider subscription if needed.

---

## 📊 Key Metrics to Track

1. **Conversion Rate:** % of users who buy after seeing upsell
2. **Average Order Value:** Revenue per converting user
3. **Upgrade Rate:** % of $9.99 buyers who upgrade to $47
4. **Lifetime Value:** Total revenue per user over time
5. **Churn Rate:** % of users who don't return after purchase

---

## ✅ Final Recommendation

**Add 10-Credit Starter Pack ($9.99) to blueprint funnel**

This creates a natural progression:
- **Free** → Test 1 preview
- **$9.99** → Test 5 more previews
- **$47** → Unlock full blueprint
- **$97/month** → Full membership

Each step reduces friction and increases commitment, leading to higher overall conversion and revenue.

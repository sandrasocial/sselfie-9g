# Paid Blueprint Landing Page - Audit & Analysis

**Date:** 2026-01-09  
**Purpose:** Understand current state, identify gaps, and define requirements for funnel and standalone use

---

## 📋 CURRENT STATE ANALYSIS

### Current Page Structure

1. **Navigation** ✅
   - SSELFIE logo (links to homepage)
   - "Free Blueprint" link (links to `/blueprint`)

2. **Hero Section** ⚠️
   - Label: "Your Blueprint"
   - Headline: "Turn your brand blueprint into 30 ready-to-post photos"
   - Subheadline: "Get 30 custom photos made just for your brand. Download and post them today."
   - **Email Capture Form** (routes to `/checkout/blueprint?email=...`)
   - "See what's inside ↓" link

3. **What You Get Section** ✅
   - 4 benefit cards (30 Custom Photos, Ready to Use, It's That Simple, Your Brand Aesthetic)

4. **How It Works Section** ✅
   - 3-step process (Answer Questions, Get Your Blueprint, Get Your Photos)

5. **Visual Proof Section** ✅
   - 3 grid examples (Dark & Moody, Light & Minimalistic, Beige Aesthetic)

6. **FAQ Section** ✅
   - 4 common questions

7. **Final CTA Section** ⚠️
   - **Another Email Capture Form** (duplicate of hero)
   - Price mentioned in text: "$47 one-time"
   - "One-time payment • Instant access • No subscription"

8. **Footer** ✅
   - SSELFIE logo, Terms, Privacy links

---

## 🔍 ISSUES IDENTIFIED

### 1. **Hero Email Capture Instead of Direct Checkout** ❌

**Current Behavior:**
- Hero has email capture form
- Form redirects to `/checkout/blueprint?email=...`
- User must enter email before seeing checkout

**Problem:**
- Adds friction (extra step)
- Doesn't match main landing page pattern (direct CTA buttons)
- Email capture happens at checkout anyway

**Expected Behavior (Based on Main Landing Page):**
- Hero should have direct CTA button: "Get My 30 Photos" → `/checkout/blueprint`
- No email capture in hero
- Email can be captured at checkout

---

### 2. **Missing Pricing Card Section** ❌

**Main Landing Page Has:**
- Dedicated pricing section with cards
- Clear pricing display ($49, $97/month)
- Feature lists per tier
- Direct checkout buttons

**Paid Blueprint Page Has:**
- Price mentioned in text only: "$47 one-time"
- No visual pricing card
- No clear value comparison
- No prominent pricing display

**Gap:**
- Should have a pricing card matching main landing page style
- Should display: "$47 one-time" prominently
- Should list features clearly
- Should have direct checkout CTA

---

### 3. **Duplicate Email Capture Forms** ⚠️

**Current:**
- Email capture in hero
- Email capture in final CTA section

**Issue:**
- Redundant
- Confusing user flow
- Should consolidate to one location

---

### 4. **No Standalone Landing Page Features** ⚠️

**Missing for Standalone Use:**
- No clear pricing section (users landing directly need to see price)
- No social proof/testimonials specific to paid blueprint
- No urgency/scarcity elements
- No clear value proposition card

---

## 🎯 INTENDED FUNNEL FLOWS

### Flow 1: Free Blueprint → Paid Upgrade
1. User completes free blueprint
2. Sees upgrade CTA: "Bring My Blueprint to Life"
3. Routes to `/paid-blueprint`
4. **Should see:** Clear pricing, benefits, direct checkout
5. **Current:** Sees email capture first (friction)

### Flow 2: Homepage → Paid Blueprint
1. User clicks "Get 30 Photos" on homepage
2. Routes to `/paid-blueprint`
3. **Should see:** Standalone landing page with pricing, benefits, checkout
4. **Current:** Sees email capture first (friction)

### Flow 3: Direct Link/Ad → Paid Blueprint
1. User lands directly on `/paid-blueprint` (from ad, email, etc.)
2. **Should see:** Complete standalone landing page
3. **Needs:** Pricing card, value prop, social proof, clear CTA
4. **Current:** Missing pricing card, has email capture friction

---

## 📊 COMPARISON: Main Landing Page vs Paid Blueprint

| Feature | Main Landing Page | Paid Blueprint Page | Status |
|---------|------------------|-------------------|--------|
| **Hero CTA** | Direct buttons ("Join SSELFIE Studio", "Try it free") | Email capture form | ❌ Mismatch |
| **Pricing Section** | Yes - 2 cards ($49, $97/month) | No - price in text only | ❌ Missing |
| **Pricing Card Style** | `.pricing-card` with features list | N/A | ❌ Missing |
| **Direct Checkout** | Yes - buttons route to checkout | No - requires email first | ❌ Friction |
| **Email Capture** | None in hero | 2 forms (hero + final CTA) | ⚠️ Redundant |
| **Value Proposition** | Clear in pricing cards | Text only, not prominent | ⚠️ Weak |
| **Social Proof** | Testimonials section | None | ⚠️ Missing |

---

## 🎨 PRICING CARD REQUIREMENTS

### Should Match Main Landing Page Style:

```tsx
<div className="pricing-card">
  <div className="flex justify-between items-center mb-4">
    <div>
      <h3>Paid Blueprint</h3>
      <p>One-Time Purchase</p>
    </div>
    <div className="text-right">
      <span>$47</span>
      <span>one-time</span>
    </div>
  </div>
  <div className="space-y-2 text-xs text-stone-300 font-light mb-6">
    <p>• 30 custom brand photos</p>
    <p>• Matches your blueprint aesthetic</p>
    <p>• Ready to download instantly</p>
    <p>• No subscription required</p>
  </div>
  <button className="btn w-full">
    Get My 30 Photos →
  </button>
</div>
```

**Styling:**
- Uses `.pricing-card` class (same as main landing page)
- Same layout structure
- Same button style (`.btn`)
- Same typography and spacing

---

## 🔄 RECOMMENDED CHANGES

### For Funnel Use (Free → Paid):

1. **Hero Section:**
   - ❌ Remove email capture form
   - ✅ Add direct CTA button: "Get My 30 Photos" → `/checkout/blueprint`
   - ✅ Keep "See what's inside ↓" link

2. **Add Pricing Card Section:**
   - ✅ Insert after "What You Get" section
   - ✅ Match main landing page pricing card style
   - ✅ Display "$47 one-time" prominently
   - ✅ List key features
   - ✅ Direct checkout button

3. **Final CTA Section:**
   - ❌ Remove duplicate email capture
   - ✅ Add pricing card again (for scroll-to-bottom users)
   - ✅ Or convert to simple CTA button

### For Standalone Use (Direct Landing):

1. **All of the above, plus:**
   - ✅ Add social proof/testimonials section
   - ✅ Add urgency element (if applicable)
   - ✅ Ensure pricing is visible above the fold
   - ✅ Clear value proposition in hero

---

## 📝 CHECKOUT FLOW ANALYSIS

### Current Checkout Route: `/checkout/blueprint`

**File:** `app/checkout/blueprint/page.tsx`

**Parameters:**
- `email` (REQUIRED) - redirects to `/blueprint` if missing
- `promo` (optional) - applies promo code

**Current Flow:**
1. User enters email on landing page
2. Redirects to `/checkout/blueprint?email=...`
3. Server-side page checks feature flag
4. **If no email:** Redirects to `/blueprint?message=complete_free_first`
5. Creates Stripe checkout session for `paid_blueprint` product
6. Redirects to `/checkout?client_secret=...&product_type=paid_blueprint`
7. User completes payment in embedded Stripe checkout
8. Webhook processes purchase
9. User gets access to paid blueprint

**Critical Issue:**
- `/checkout/blueprint` **REQUIRES** email parameter
- If email is missing, user is redirected away
- This forces email capture before checkout
- **BUT:** Stripe checkout can capture email itself
- **Solution:** Make email optional OR allow direct checkout without email pre-fill

**Product Details:**
- **ID:** `paid_blueprint`
- **Price:** $47 one-time (4700 cents)
- **Type:** `paid_blueprint`
- **Credits:** 0 (photos stored directly, not via credits)

---

## ✅ ACCEPTANCE CRITERIA

### As Funnel Page (Free → Paid):
- [ ] Hero has direct CTA button (no email capture)
- [ ] Pricing card section matches main landing page style
- [ ] Price ($47) is prominently displayed
- [ ] Direct checkout button routes to `/checkout/blueprint`
- [ ] No duplicate email capture forms

### As Standalone Landing Page:
- [ ] All funnel requirements, plus:
- [ ] Pricing visible above the fold
- [ ] Clear value proposition
- [ ] Social proof/testimonials (optional)
- [ ] Works without requiring free blueprint first

---

## 🎯 RECOMMENDED IMPLEMENTATION PRIORITY

1. **HIGH:** Remove email capture from hero, add direct CTA button
2. **HIGH:** Add pricing card section (match main landing page style)
3. **MEDIUM:** Remove duplicate email capture from final CTA
4. **LOW:** Add social proof section (if testimonials available)

---

## 📌 NOTES

- **Price:** $47 one-time (confirmed in code and text)
- **Product Type:** `paid_blueprint`
- **Checkout Route:** `/checkout/blueprint`
- **Feature Flag:** Gated behind `FEATURE_PAID_BLUEPRINT_ENABLED`
- **Styling:** Should match main landing page `.pricing-card` style exactly

---

**Next Steps:** Implement pricing card section and update hero CTA to direct checkout button.

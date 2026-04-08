# Email Landing Page Strategy

## Decision Framework

### ✅ **Direct to Embedded Checkout** (Keep as-is)
**When to use:** Clear purchase intent, urgency, or user already knows what they want

**Email Templates:**
1. **win-back-offer** - "Claim Your Offer" 
   - ✅ **Keep direct checkout** - Urgency campaign with special offer
   - User already knows the product, just needs to claim discount

2. **upsell-freebie-membership** - "Join SSELFIE Studio"
   - ✅ **Keep direct checkout** - Clear upsell, user already engaged
   - They got the freebie, now they want more

3. **upsell-day-10** - "Join SSELFIE Studio"
   - ✅ **Keep direct checkout** - Clear upsell after 10 days
   - User has been engaged, knows what they want

4. **launch-followup-email** - "Claim your spot"
   - ✅ **Keep direct checkout** - Urgency (beta ending)
   - Time-sensitive offer

5. **launch-email** - Checkout buttons
   - ✅ **Keep direct checkout** - Launch campaign
   - User came for the launch, ready to buy

---

### 🎯 **Landing Pages** (Create conversion-optimized pages)
**When to use:** Re-engagement, educational content, building trust, or users who need more info

**Email Templates:**

1. **welcome-back-reengagement** - "See What's New"
   - ✅ **Already done!** `/whats-new` landing page
   - Perfect for re-engaging cold users

2. **nurture-day-7** - "Learn more about Studio →"
   - 🎯 **CREATE LANDING PAGE** `/why-studio` or `/studio-benefits`
   - Educational - user is exploring, not ready to buy yet
   - Can show value before checkout

---

### 🔐 **Studio/Login Links** (Keep as-is)
**When to use:** Existing users who need to access the app

**Email Templates:**
1. **welcome-email** - "Go to Studio" / "Set Up Your Password"
   - ✅ **Keep as `/studio`** - New user needs to access app
   - Password setup flow is already handled

2. **nurture-day-1** - "Go to Studio"
   - ✅ **Keep as `/studio`** - Existing user, needs to login

3. **nurture-day-3** - "Create More Photos"
   - ✅ **Keep as `/studio`** - Existing user, needs to login

---

### 📝 **Special Pages** (Already exist)
1. **beta-testimonial-request** - "Share Your Testimonial"
   - ✅ **Already has page** `/share-your-story`
   - No changes needed

---

## Recommended Action Plan

### Phase 1: Create One More Landing Page (HIGH PRIORITY)
**Create `/why-studio` or `/studio-benefits` landing page for:**
- `nurture-day-7` email "Learn more about Studio" link
- Educational/exploratory content
- Show value before asking for purchase

**Why:** This is the only other email that needs a landing page. All others are either:
- Direct checkout (clear intent)
- Studio login (existing users)
- Already have pages

### Phase 2: Update Email Templates
- Update `nurture-day-7.tsx` to link to new landing page
- All other templates are already optimized

---

## Landing Page Requirements

### `/why-studio` or `/studio-benefits` Page Should Include:

1. **Hero Section**
   - Full-screen image
   - Headline: "Why SSELFIE Studio?"
   - Subheadline: About unlimited access

2. **Benefits Section**
   - 150+ photos monthly
   - Full Academy access
   - Feed Designer
   - Monthly strategy drops
   - Direct support from Sandra

3. **Comparison Section**
   - One-time vs. Studio membership
   - Value proposition

4. **Social Proof**
   - Testimonials
   - Member count/stats

5. **Pricing Section**
   - Same as landing page
   - Embedded checkout buttons

6. **Soft Close**
   - "No pressure, just wanted you to know what's possible"

---

## Summary

**Total Landing Pages Needed:** 2
- ✅ `/whats-new` - Already created
- 🎯 `/why-studio` - Need to create (for nurture-day-7)

**Direct Checkout Links:** Keep as-is (5 templates)
**Studio/Login Links:** Keep as-is (3 templates)
**Special Pages:** Already exist (1 template)

**Total Work:** Create 1 landing page + update 1 email template

---

## Quick Decision Tree

```
User clicked link in email
    ↓
Is it urgent/time-sensitive? → YES → Direct Checkout ✅
    ↓ NO
Is user already a customer? → YES → Studio/Login ✅
    ↓ NO
Does user need more info? → YES → Landing Page 🎯
    ↓ NO
Direct Checkout ✅
```














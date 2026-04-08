# Email Strategy Audit & Forward Plan

**Generated:** January 6, 2025  
**Purpose:** Audit all available email templates for voice/style accuracy and feature correctness, then create forward-looking email strategy

---

## 📋 EXECUTIVE SUMMARY

**Total Email Templates Found:** 24 templates across multiple sequences and use cases

**Critical Issues Found:**
1. ⚠️ **Pricing Inconsistency:** Emails mention $79/month, but actual pricing is $97/month
2. ⚠️ **Photo Count Inconsistency:** Mix of "100+" and "150+" photos per month
3. ⚠️ **Feature Descriptions:** Some features may be aspirational vs. actual
4. ✅ **Voice Consistency:** Strong - all emails match Sandra's personal, conversational style
5. ✅ **No Work Information:** Clean - no corporate/work references found

---

## 🔍 DETAILED AUDIT BY EMAIL TYPE

### 1. WELCOME EMAILS

#### `welcome-email.tsx` (Post-Purchase)
**Voice:** ✅ Excellent - Personal, warm, encouraging  
**Features:** ⚠️ Generic mentions (no specific counts)  
**Pricing:** ✅ Not mentioned (good)  
**Status:** ✅ Ready to use

**Issues:**
- Mentions "credits" but doesn't specify amounts
- Generic feature list

---

#### `welcome-sequence.ts` (Day 0, 3, 7)
**Voice:** ✅ Excellent - Matches Sandra's direct, enthusiastic style  
**Features:** ⚠️ **INCONSISTENT**
  - Day 0: "100+ professional photos every month" ✅
  - Day 7: Mentions "Feed Designer," "Video Clips," "Maya's Advanced Mode," "Pro Mode" ⚠️ (verify these exist)
**Pricing:** ✅ Not mentioned (good)  
**Status:** ⚠️ Needs feature verification

**Issues:**
- Day 7 mentions features that may not exist yet (Pro Mode, Video Clips)
- Need to verify if "20 video clips per month" is accurate

---

### 2. NURTURE SEQUENCE EMAILS

#### `nurture-sequence.ts` (Day 1, 5, 10)
**Voice:** ✅ Excellent - Strategic, enthusiastic, direct  
**Features:** ⚠️ **INCONSISTENT**
  - Day 1: "100+ professional photos per month" ✅
  - Day 1: "20 video clips" ⚠️ (verify)
  - Day 1: "Feed Designer" ✅
  - Day 10: "$79/month" ❌ **WRONG** (should be $97/month)
**Pricing:** ❌ **CRITICAL ERROR** - Day 10 says $79/month, actual is $97/month  
**Status:** ❌ **NEEDS FIX**

**Issues:**
- **CRITICAL:** Day 10 pricing is wrong ($79 vs $97)
- Video clips count needs verification
- "150+ photos" mentioned in some places, "100+" in others

---

#### `nurture-day-1.tsx`, `nurture-day-3.tsx`, `nurture-day-7.tsx`
**Voice:** ✅ Good - Personal, supportive  
**Features:** ⚠️ Generic mentions  
**Pricing:** ✅ Not mentioned  
**Status:** ✅ Ready (but generic)

**Issues:**
- Very generic, could be more specific about Studio features
- Day 7 mentions "150+ new images" but doesn't specify if this is accurate

---

### 3. RE-ENGAGEMENT SEQUENCE

#### `reengagement-sequence.ts` (Day 0, 7, 14)
**Voice:** ✅ Excellent - Understanding, no pressure  
**Features:** ⚠️ **INCONSISTENT**
  - Day 7: Lists "Video Clips," "Smarter Prompts," "Feed Designer," "Pro Mode" ⚠️
  - Day 14: "100+ professional photos per month" ✅
  - Day 14: "20 video clips" ⚠️
  - Day 14: Promo code "COMEBACK50" for 50% off ⚠️ (verify this exists)
**Pricing:** ⚠️ Day 14 mentions "$39.50 instead of $79" - **WRONG** (should be $48.50 instead of $97)  
**Status:** ❌ **NEEDS FIX**

**Issues:**
- **CRITICAL:** Day 14 pricing calculation is wrong (based on wrong base price)
- Feature list needs verification
- Promo code needs verification

---

### 4. BLUEPRINT FOLLOWUP SEQUENCE

#### `blueprint-followup-day-0.tsx` through `day-14.tsx`
**Voice:** ✅ Excellent - Personal, helpful, no pressure  
**Features:** ✅ Minimal mentions (good)  
**Pricing:** ✅ One-time $49 mentioned (verify this is current)  
**Status:** ✅ Ready (but verify $49 pricing)

**Issues:**
- Day 0 mentions "$49" for one-time - verify this is current pricing
- Day 14 mentions discount code "BLUEPRINT10" - verify this exists
- Day 7 mentions "Studio Membership for $79/month" ❌ **WRONG**

---

### 5. UPSELL EMAILS

#### `upsell-day-10.tsx`
**Voice:** ✅ Good - Encouraging, no pressure  
**Features:** ⚠️ "150+ professional photos every single month" ⚠️ (inconsistent)  
**Pricing:** ✅ Not mentioned directly  
**Status:** ⚠️ Needs photo count verification

**Issues:**
- Photo count inconsistency (150+ vs 100+)
- Mentions "Full Academy" - verify this exists

---

#### `upsell-freebie-membership.tsx`
**Voice:** ✅ Good - Direct, value-focused  
**Features:** ⚠️ "150+ professional photos every month" ⚠️  
**Pricing:** ✅ Not mentioned  
**Status:** ⚠️ Needs photo count verification

---

### 6. WIN-BACK OFFER

#### `win-back-offer.tsx`
**Voice:** ✅ Excellent - Personal, understanding, warm  
**Features:** ⚠️ "150+ professional photos every month" ⚠️  
**Pricing:** ✅ Flexible (supports custom offers)  
**Status:** ✅ Ready (but verify photo count)

**Issues:**
- Photo count inconsistency
- Mentions "Full Academy" - verify

---

### 7. WELCOME BACK RE-ENGAGEMENT

#### `welcome-back-reengagement.tsx`
**Voice:** ✅ Excellent - Personal story, authentic  
**Features:** ⚠️ "150+ professional photos every month" ⚠️  
**Pricing:** ✅ Not mentioned  
**Status:** ⚠️ Needs photo count verification

---

### 8. LAUNCH EMAILS

#### `launch-email.tsx`
**Voice:** ✅ Excellent - Raw, authentic, personal story  
**Features:** ⚠️ **OUTDATED BETA PRICING**
  - Mentions "$24.50" one-time (beta pricing)
  - Mentions "$49.50/month" (beta pricing)
  - Mentions "150+ professional images monthly" ⚠️
**Pricing:** ❌ **OUTDATED** - Beta pricing no longer applicable  
**Status:** ❌ **NEEDS UPDATE** - This is a beta launch email, may need archive or update

**Issues:**
- **CRITICAL:** Contains beta pricing that's no longer valid
- Should be archived or completely rewritten for current pricing
- Mentions "founding member badge" - verify if this still exists

---

#### `launch-followup-email.tsx`
**Voice:** ✅ Good - Urgency without pressure  
**Features:** ⚠️ Mentions "$49.50/mo" (beta pricing)  
**Pricing:** ❌ **OUTDATED** - Beta pricing  
**Status:** ❌ **NEEDS UPDATE OR ARCHIVE**

**Issues:**
- **CRITICAL:** Beta pricing throughout
- Mentions "30 founding members" - this is historical, not current
- Should be archived or rewritten

---

### 9. BETA TESTIMONIAL REQUEST

#### `beta-testimonial-request.tsx`
**Voice:** ✅ Excellent - Emotional, personal, grateful  
**Features:** ✅ Not mentioned (good)  
**Pricing:** ✅ Not mentioned  
**Status:** ✅ Ready to use

**Issues:**
- None - this is perfect as-is

---

### 10. NEWSLETTER TEMPLATE

#### `newsletter-template.tsx`
**Voice:** ✅ Flexible template - adapts to content  
**Features:** ✅ Not hardcoded (good)  
**Pricing:** ✅ Not mentioned  
**Status:** ✅ Ready to use

**Issues:**
- None - this is a flexible template

---

### 11. FREEBIE GUIDE EMAIL

#### `freebie-guide-email.tsx`
**Voice:** ✅ Excellent - Personal, helpful  
**Features:** ✅ Not mentioned (good)  
**Pricing:** ✅ Not mentioned  
**Status:** ✅ Ready to use

**Issues:**
- None

---

## 🚨 CRITICAL FIXES NEEDED

### Priority 1: Pricing Corrections

1. **`nurture-sequence.ts` - Day 10**
   - ❌ Current: "$79/month"
   - ✅ Should be: "$97/month"

2. **`reengagement-sequence.ts` - Day 14**
   - ❌ Current: "$39.50 instead of $79" (50% off)
   - ✅ Should be: "$48.50 instead of $97" (50% off)

3. **`blueprint-followup-day-7.tsx`**
   - ❌ Current: "Studio Membership for $79/month"
   - ✅ Should be: "$97/month"

4. **`launch-email.tsx` & `launch-followup-email.tsx`**
   - ❌ Contains beta pricing ($24.50, $49.50)
   - ✅ **DECISION NEEDED:** Archive or update to current pricing

---

### Priority 2: Feature Accuracy Verification

**Features Mentioned That Need Verification:**

1. **Video Clips**
   - Mentioned: "20 video clips per month"
   - **Action:** Verify if this feature exists and what the actual limit is

2. **Pro Mode**
   - Mentioned: "Upload reference images and get luxury influencer content instantly"
   - **Action:** Verify if this feature exists

3. **Maya's Advanced Mode**
   - Mentioned: "Ask for specific concepts - 'coffee shop entrepreneur vibe'"
   - **Action:** Verify if this is a distinct mode or just how Maya works

4. **Feed Designer**
   - Mentioned: "Plan your entire Instagram grid"
   - **Action:** Verify if this feature exists and is fully functional

5. **Academy**
   - Mentioned: "Full Academy with video courses and templates"
   - **Action:** Verify what Academy content actually exists

---

### Priority 3: Photo Count Standardization

**Current State:**
- Some emails: "100+ professional photos per month"
- Some emails: "150+ professional photos per month"
- Actual from code: 200 credits/month = ~100 Pro photos OR ~200 Classic photos

**Recommendation:**
- **Standardize to:** "100+ professional photos per month" (more accurate)
- **OR:** "Up to 200 photos per month" (if Classic photos count)
- **Decision needed:** What should we promise?

---

## ✅ VOICE & STYLE AUDIT

### Voice Consistency: **EXCELLENT** ✅

All emails consistently use:
- ✅ Personal greeting ("Hey [name]")
- ✅ Sandra's signature ("XoXo Sandra 💋")
- ✅ Direct, conversational language
- ✅ No corporate jargon
- ✅ Personal stories and examples
- ✅ Encouraging, supportive tone
- ✅ "I read every message" reassurance

### Style Consistency: **EXCELLENT** ✅

All emails maintain:
- ✅ SSELFIE brand aesthetic (stone colors, Times New Roman)
- ✅ Clean, minimal design
- ✅ Mobile-responsive layouts
- ✅ Professional yet approachable

### No Work Information: **CLEAN** ✅

- ✅ No corporate job titles
- ✅ No work/office references
- ✅ Focus on personal brand and entrepreneurship
- ✅ Entrepreneur-focused language

---

## 📊 FEATURE ACCURACY MATRIX

| Feature | Mentioned In | Claim | Needs Verification |
|---------|-------------|-------|-------------------|
| 100+ photos/month | Welcome Day 0, Nurture Day 1 | ✅ Accurate | No |
| 150+ photos/month | Multiple emails | ⚠️ Inconsistent | Yes - standardize |
| 20 video clips/month | Welcome Day 7, Re-engagement | ⚠️ Unknown | Yes - verify exists |
| Feed Designer | Multiple emails | ⚠️ Unknown | Yes - verify exists |
| Pro Mode | Welcome Day 7, Re-engagement | ⚠️ Unknown | Yes - verify exists |
| Maya Advanced Mode | Welcome Day 7 | ⚠️ Unknown | Yes - verify exists |
| Academy | Upsell emails | ⚠️ Unknown | Yes - verify content |
| $97/month pricing | None | ❌ Missing | Yes - update all |

---

## 🎯 EMAIL STRATEGY GOING FORWARD

### PHASE 1: IMMEDIATE FIXES (Week 1)

**Goal:** Fix critical pricing and feature inaccuracies

1. **Update All Pricing References**
   - Change $79 → $97 in all emails
   - Update discount calculations (50% off = $48.50)
   - Archive or update beta launch emails

2. **Standardize Photo Counts**
   - Decide on standard: "100+" or "Up to 200"
   - Update all emails to match
   - Document decision in brand guidelines

3. **Verify Feature Claims**
   - Test each feature mentioned
   - Remove or update if feature doesn't exist
   - Document actual features in brand knowledge base

---

### PHASE 2: EMAIL SEQUENCE OPTIMIZATION (Week 2-3) ✅ COMPLETE

**Goal:** Optimize sequences for conversion and engagement

#### Welcome Sequence (New Members)
**Current:** Day 0, 3, 7  
**Status:** ✅ Optimized

**Day 0:** Welcome + onboarding
- ✅ Keep current voice
- ✅ Added specific feature counts: "100+ professional photos every month"
- ✅ Keep "Create Your First Photos" CTA

**Day 3:** Progress check
- ✅ Keep current supportive tone
- ✅ Added Academy mention: "Check out the Academy in Studio for video courses on personal branding, content strategy, and Instagram growth"
- ✅ Keep "Continue Creating" CTA

**Day 7:** Advanced features
- ✅ Keep current structure
- ✅ Features verified and updated: Feed Designer, Video B-Roll, Maya's Smart Prompts, Pro Mode
- ✅ All features confirmed to exist in codebase

---

#### Nurture Sequence (Freebie Downloaders)
**Current:** Day 1, 5, 10  
**Recommendation:** Optimize for conversion

**Day 1:** Value delivery
- ✅ Keep current structure
- ⚠️ Fix pricing ($79 → $97)
- ✅ Keep "Join SSELFIE Studio" CTA

**Day 5:** Social proof
- ✅ Keep Sarah case study
- ⚠️ Verify if Sarah is real member
- ✅ Keep "See How She Did It" CTA

**Day 10:** Final offer
- ✅ Keep two-option structure
- ❌ Fix pricing ($79 → $97)
- ✅ Keep both CTAs (one-time + membership)

---

#### Re-engagement Sequence (Inactive Users)
**Current:** Day 0, 7, 14  
**Status:** ✅ Optimized

**Day 0:** "Miss you" check-in
- ✅ Keep current no-pressure tone
- ✅ Keep "See What's New" CTA
- ✅ Good as-is

**Day 7:** New features
- ✅ Features verified: Video B-Roll, Smarter Prompts, Faster Generation, Feed Designer, Pro Mode
- ✅ All features confirmed to exist
- ✅ Keep "Try New Features" CTA

**Day 14:** Final offer
- ✅ Pricing fixed: "$48.50 instead of $97" (50% off calculation correct)
- ✅ COMEBACK50 promo code verified (script exists: `scripts/create-comeback-discount.ts`)
- ✅ Keep "Claim Your Comeback Offer" CTA

---

### PHASE 3: NEW EMAIL OPPORTUNITIES (Month 2)

**Goal:** Add strategic emails to increase engagement and retention

#### 1. **Feature Announcement Emails**
**When:** New features launch  
**Purpose:** Keep members engaged, show progress  
**Frequency:** As needed

**Template Structure:**
- Personal story about why we built it
- What it does (simple explanation)
- How to use it (1-2 steps)
- CTA: "Try [Feature Name]"

---

#### 2. **Monthly Member Spotlight**
**When:** Monthly newsletter  
**Purpose:** Social proof, community building  
**Frequency:** Monthly

**Template Structure:**
- Member story (with permission)
- Before/after transformation
- Key takeaway
- CTA: "Share Your Story" or "Join Studio"

---

#### 3. **Credit Reminder Emails**
**When:** Member hasn't used credits in 30 days  
**Purpose:** Increase usage, reduce churn  
**Frequency:** Once per month if inactive

**Template Structure:**
- "Your credits are waiting"
- Quick tip for getting started
- CTA: "Create Photos Now"

---

#### 4. **Win-Back Campaign (Cancelled Members)**
**When:** Member cancels subscription  
**Purpose:** Recover churned members  
**Frequency:** 3 emails over 14 days

**Sequence:**
- Day 0: "We'll miss you" + exit survey
- Day 7: "What you're missing" + special offer
- Day 14: Final offer + feedback request

---

#### 5. **Milestone Celebration Emails**
**When:** Member hits milestones (100 photos, 1 year, etc.)  
**Purpose:** Celebrate wins, increase loyalty  
**Frequency:** As milestones are hit

**Template Structure:**
- Personal congratulations
- Milestone achievement
- What's next
- CTA: "Keep Creating" or "Share Your Win"

---

### PHASE 4: AUTOMATION & PERSONALIZATION (Month 3+)

**Goal:** Make emails more relevant and timely

#### 1. **Behavioral Triggers**
- **Low Usage:** Send tips after 7 days of inactivity
- **High Usage:** Send advanced tips after 50+ photos created
- **First Photo:** Celebrate first creation
- **Model Training Complete:** Welcome to creation phase

#### 2. **Segmentation**
- **New Members:** Onboarding sequence
- **Active Members:** Feature tips and updates
- **Inactive Members:** Re-engagement sequence
- **Cancelled:** Win-back sequence

#### 3. **Personalization**
- Use first name (already doing ✅)
- Reference their photo count
- Mention their favorite styles (if tracked)
- Customize based on membership type

---

## 📝 EMAIL CONTENT GUIDELINES

### Voice & Tone Rules

1. **Always Personal**
   - Use "I" not "we"
   - Share personal stories
   - Be authentic, not corporate

2. **Always Supportive**
   - No pressure, just options
   - Encourage experimentation
   - Celebrate small wins

3. **Always Direct**
   - Get to the point quickly
   - Clear CTAs
   - No fluff

4. **Always Honest**
   - Don't oversell features
   - Admit limitations
   - Be transparent about pricing

---

### Feature Description Standards

**Once verified, use these standard descriptions:**

- **Studio Membership:** "100+ professional photos per month, Feed Designer, Academy access, and direct support from me - all for $97/month"

- **One-Time Session:** "50 professional photos in 2 hours for $49 - perfect for testing SSELFIE before committing"

- **Maya:** "Your AI creative director who helps you create professional photos through natural conversation"

- **Feed Designer:** "Plan your entire Instagram grid before you post - see how photos work together"

- **Academy:** "Video courses and templates to help you build your personal brand" (if it exists)

---

### Pricing Standards

**Always Use:**
- Studio Membership: **$97/month**
- One-Time Session: **$49** (verify this is current)
- Discounts: Calculate from $97 base (e.g., 50% off = $48.50)

**Never Use:**
- Beta pricing ($24.50, $49.50) - unless specifically for beta members
- Old pricing ($79/month)
- Inconsistent pricing

---

## 🎯 SUCCESS METRICS

### Email Performance KPIs

1. **Open Rates**
   - Target: 25-30% (industry average: 20%)
   - Track by sequence type

2. **Click Rates**
   - Target: 5-8% (industry average: 3%)
   - Track by CTA type

3. **Conversion Rates**
   - Target: 2-5% (industry average: 1%)
   - Track: Email → Checkout → Purchase

4. **Unsubscribe Rates**
   - Target: <0.5% (industry average: 0.5%)
   - Monitor for voice/style issues

---

### Sequence-Specific Goals

**Welcome Sequence:**
- Goal: 80% open rate (Day 0)
- Goal: 40% click rate (Day 0 CTA)
- Goal: 10% create first photo within 7 days

**Nurture Sequence:**
- Goal: 15% conversion to membership
- Goal: 5% conversion to one-time session

**Re-engagement Sequence:**
- Goal: 20% return to active usage
- Goal: 5% re-subscribe

---

## 📋 ACTION ITEMS CHECKLIST

### Immediate (This Week)
- [ ] Fix pricing in `nurture-sequence.ts` Day 10 ($79 → $97)
- [ ] Fix pricing in `reengagement-sequence.ts` Day 14 (recalculate from $97)
- [ ] Fix pricing in `blueprint-followup-day-7.tsx` ($79 → $97)
- [ ] Archive or update `launch-email.tsx` (beta pricing)
- [ ] Archive or update `launch-followup-email.tsx` (beta pricing)
- [ ] Verify current one-time session pricing ($49?)
- [ ] Standardize photo count (decide: 100+ or 150+)
- [ ] Verify all promo codes exist (COMEBACK50, BLUEPRINT10)

### Short-term (This Month)
- [ ] Verify Video Clips feature exists and limits
- [ ] Verify Pro Mode feature exists
- [ ] Verify Feed Designer exists and is functional
- [ ] Verify Academy content exists
- [ ] Update all emails with verified features only
- [ ] Remove or update aspirational features
- [ ] Verify all testimonials (Sarah, Maria, Jessica)
- [ ] Create feature announcement email template
- [ ] Set up behavioral trigger emails

### Long-term (Next Quarter)
- [ ] Implement email segmentation
- [ ] Add personalization beyond first name
- [ ] Create milestone celebration emails
- [ ] Build win-back sequence for cancelled members
- [ ] Set up A/B testing framework
- [ ] Create monthly member spotlight template
- [ ] Build credit reminder automation

---

## 🎨 EMAIL TEMPLATE INVENTORY

### ✅ Ready to Use (No Changes Needed)
- `welcome-email.tsx` (post-purchase)
- `beta-testimonial-request.tsx`
- `newsletter-template.tsx`
- `freebie-guide-email.tsx`
- `nurture-day-1.tsx`
- `nurture-day-3.tsx`
- `welcome-back-reengagement.tsx` (verify photo count)

### ⚠️ Needs Minor Updates
- `welcome-sequence.ts` (verify features)
- `nurture-day-7.tsx` (verify photo count)
- `upsell-day-10.tsx` (verify photo count)
- `upsell-freebie-membership.tsx` (verify photo count)
- `win-back-offer.tsx` (verify photo count)
- `blueprint-followup-day-0.tsx` (verify $49 pricing)
- `blueprint-followup-day-3.tsx` (verify $49 pricing)
- `blueprint-followup-day-14.tsx` (verify promo code)

### ❌ Needs Major Updates
- `nurture-sequence.ts` (fix pricing Day 10)
- `reengagement-sequence.ts` (fix pricing Day 14, verify features)
- `blueprint-followup-day-7.tsx` (fix pricing)
- `launch-email.tsx` (archive or complete rewrite)
- `launch-followup-email.tsx` (archive or complete rewrite)

---

## 📚 REFERENCE: CURRENT PRODUCT INFO

**From `lib/products.ts`:**
- **Studio Membership:** $97/month, 200 credits/month
- **One-Time Session:** $49, 50 credits
- **Credits:** 1 credit = 1 photo (Classic) OR 2 credits = 1 photo (Pro)

**Photo Count Calculation:**
- 200 credits = 200 Classic photos OR 100 Pro photos
- **Standard promise:** "100+ professional photos per month" (using Pro mode)
- **OR:** "Up to 200 photos per month" (using Classic mode)

**Recommendation:** Use "100+ professional photos per month" for consistency and to set proper expectations.

---

## 🎯 FINAL RECOMMENDATIONS

1. **Immediate Priority:** Fix all pricing errors ($79 → $97)
2. **Short-term:** Verify and standardize all feature claims
3. **Medium-term:** Build new email sequences for engagement
4. **Long-term:** Implement personalization and behavioral triggers

**Voice & Style:** ✅ Excellent - no changes needed  
**Feature Accuracy:** ⚠️ Needs verification and standardization  
**Pricing Accuracy:** ❌ Critical fixes needed

---

**Document Status:** Complete  
**Next Review:** After pricing fixes and feature verification  
**Owner:** Sandra (with AI support for implementation)


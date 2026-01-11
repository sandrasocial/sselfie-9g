# Decision 3 Implementation Plan - Review & Recommendations

**Date:** 2026-01-09  
**Status:** ⚠️ **REVIEW REQUIRED** - Plan needs adjustments before implementation  
**Reviewer:** AI Assistant  
**Current State:** Test user is stuck at Blueprint Welcome Wizard, can't proceed to Decision 2 testing without completing onboarding flow

---

## 🔍 CURRENT STATE ANALYSIS

### Existing Components

1. **`BrandProfileWizard`** (12 steps for paid Studio users):
   - Steps: Intro, Name, Business Type, Color Theme, Visual Aesthetic, Current Situation, Transformation Story, Future Vision, Ideal Audience, Communication Voice, Photo Goals, Content Pillars, Brand Inspiration
   - Stores in: `user_personal_brand` table (structured columns)
   - Used by: Paid Studio members

2. **`OnboardingWizard`** (Training model flow):
   - Steps: Welcome, Upload photos, Training status, Success
   - Purpose: Upload photos to train AI model
   - Stores in: `training_runs` table
   - Used by: All users who need to train a model

3. **`BlueprintWelcomeWizard`** (Welcome screen):
   - Purpose: Welcome new users to Blueprint
   - Just completed: Fixed z-index issues, API integration

4. **Free Blueprint Form** (Current guest system):
   - Fields: `business`, `dreamClient`, `struggle`, `vibe`, `feed_style`
   - Stores in: `blueprint_subscribers.form_data` (JSONB)
   - Location: `/blueprint?email=...&token=...`

### Key Findings

✅ **GOOD ALIGNMENT:**
- Base wizard (5 steps) matches `BrandProfileWizard` steps 1-5 ✅
- Blueprint extension (3 steps) matches existing blueprint form fields ✅
- Studio extension (7 steps) matches `BrandProfileWizard` steps 6-12 ✅

⚠️ **ISSUES IDENTIFIED:**
1. Plan says "reuse OnboardingWizard patterns" but should reuse `BrandProfileWizard` patterns
2. Base wizard doesn't account for "intro" step in BrandProfileWizard
3. Blueprint form doesn't collect all base wizard fields (Name, Color Theme, Visual Aesthetic, Current Situation)
4. Migration plan needs to handle users who already completed BrandProfileWizard
5. Blueprint form has `vibe` field which might map to Visual Aesthetic

---

## 🎯 RECOMMENDED CHANGES TO PLAN

### Change 1: Correct Component Reference

**Current Plan Says:**
> "Reuse UI patterns from existing `OnboardingWizard` component"

**Should Say:**
> "Reuse UI patterns from existing `BrandProfileWizard` component (steps 1-5 for base, steps 6-12 for studio extension)"

**Reason:** `OnboardingWizard` is for training models, not brand data collection. `BrandProfileWizard` has the correct UI patterns we need.

---

### Change 2: Base Wizard Steps (Include/Exclude Intro)

**Current Plan:**
- 5 steps: Name, Business Type, Color Theme, Visual Aesthetic, Current Situation

**Recommendation:**
- **Option A:** Include intro step (6 total steps: Intro + 5 data steps)
- **Option B:** Exclude intro step (5 data steps only)

**Analysis:**
- `BrandProfileWizard` has an intro step with Maya message
- Intro provides context and reduces friction
- But adds one more step to onboarding

**Recommendation:** ✅ **Option A (Include Intro)** - Better UX, minimal time cost

**Updated Base Wizard (6 steps):**
1. Intro (Maya welcome message)
2. Name
3. Business Type
4. Color Theme
5. Visual Aesthetic
6. Current Situation

---

### Change 3: Handle Blueprint Form Field Mismatch

**Current Blueprint Form Fields:**
- `business` (text) → Maps to "Business Type"
- `dreamClient` (text) → Maps to "Dream Client" (extension step)
- `struggle` (text) → Maps to "Struggle" (extension step)
- `vibe` (text/array?) → Might map to "Visual Aesthetic" or separate field
- `feed_style` (selected) → Maps to "Feed Style" (extension step)

**Missing from Blueprint:**
- Name (not collected)
- Color Theme (not collected)
- Current Situation (not collected)

**Migration Strategy:**
1. **For existing blueprint users:**
   - Base wizard fields (Name, Color Theme, Current Situation) will be `NULL` or default values
   - User can fill them in during base wizard OR we pre-fill with defaults
   - `business` → Maps to `businessType`
   - `vibe` → Maps to `visualAesthetic` (if compatible format) or ask user to select

2. **For new users:**
   - Base wizard collects all 6 steps (including missing fields)
   - Blueprint extension collects the 3 steps (Dream Client, Struggle, Feed Style)

**Recommendation:** ✅ **Pre-fill with defaults, allow user to update** - Better than forcing re-entry

---

### Change 4: Handle Existing BrandProfileWizard Users

**Issue:** Users who already completed `BrandProfileWizard` (all 12 steps) should NOT see progressive onboarding.

**Migration Strategy:**
```sql
-- Mark users who completed BrandProfileWizard as onboarding_completed
UPDATE users
SET onboarding_completed = TRUE,
    blueprint_welcome_shown_at = COALESCE(blueprint_welcome_shown_at, NOW())
WHERE EXISTS (
  SELECT 1 FROM user_personal_brand
  WHERE user_personal_brand.user_id = users.id
  AND user_personal_brand.is_completed = TRUE
);
```

**Recommendation:** ✅ **Add this to migration plan** - Prevents showing base wizard to users who already completed full wizard

---

### Change 5: Simplify Implementation Approach

**Current Plan Complexity:** High (6-8 hours)

**Simplified Approach:**

**Phase 3A: Base Wizard Only** (2-3 hours)
1. Extract base wizard from `BrandProfileWizard` (steps 1-6: Intro + 5 data steps)
2. Create `components/onboarding/base-wizard.tsx`
3. Save to `user_personal_brand` table
4. Show after Blueprint Welcome Wizard for new users
5. After completion → Check entitlement → Route to appropriate extension

**Phase 3B: Blueprint Extension** (1-2 hours)
1. Create `components/onboarding/blueprint-extension.tsx` (3 steps)
2. Reuse blueprint form UI patterns
3. Save to `blueprint_subscribers.form_data`
4. Show after base wizard for blueprint users

**Phase 3C: Studio Extension** (2-3 hours)
1. Extract studio extension from `BrandProfileWizard` (steps 7-12)
2. Create `components/onboarding/studio-extension.tsx`
3. Save to `user_personal_brand` table
4. Show after base wizard for Studio members

**Phase 3D: Migration & Testing** (1 hour)
1. Create migration script
2. Test all user flows
3. Fix edge cases

**Total: 6-8 hours (same estimate, but broken into phases)**

---

### Change 6: Update Routing Logic

**Current Plan Says:**
> "After base wizard completion → Check entitlement → Show extension → Blueprint welcome → Blueprint tab"

**Issue:** Blueprint Welcome Wizard should show BEFORE base wizard (for new users), not after.

**Corrected Flow:**
1. **New user signs up:**
   - Show Blueprint Welcome Wizard ✅ (already working)
   - User clicks "Get Started"
   - Show Base Wizard (6 steps)
   - After base completion → Check entitlement
   - **Free/Paid Blueprint:** Show Blueprint Extension (3 steps) → Blueprint tab
   - **Studio:** Show Studio Extension (7 steps) → Studio (Maya)

2. **Returning user:**
   - If `onboarding_completed = false` → Show base wizard
   - If `onboarding_completed = true` → Show Studio (no wizards)

**Recommendation:** ✅ **Update plan to reflect correct order** - Blueprint Welcome → Base → Extension → Product

---

## ✅ APPROVED PLAN ADJUSTMENTS

### 1. Component Reuse
- ✅ Reuse `BrandProfileWizard` patterns (not `OnboardingWizard`)
- ✅ Extract base wizard from `BrandProfileWizard` steps 1-6 (Intro + 5 data steps)
- ✅ Extract studio extension from `BrandProfileWizard` steps 7-12

### 2. Base Wizard Steps
- ✅ Include intro step (6 total steps: Intro + Name + Business Type + Color Theme + Visual Aesthetic + Current Situation)

### 3. Blueprint Extension
- ✅ 3 steps: Dream Client, Struggle, Feed Style (matches existing blueprint form)
- ✅ Reuse blueprint form UI patterns

### 4. Migration Strategy
- ✅ Handle existing BrandProfileWizard users (mark as `onboarding_completed = true`)
- ✅ Handle existing blueprint users (pre-fill base wizard fields with defaults)
- ✅ Map `business` → `businessType`, `vibe` → `visualAesthetic` (if compatible)

### 5. Implementation Phases
- ✅ Break into phases: Base → Blueprint Extension → Studio Extension → Migration
- ✅ Test each phase before moving to next

### 6. Routing Logic
- ✅ Blueprint Welcome → Base Wizard → Extension → Product (correct order)

---

## 🚨 CRITICAL QUESTIONS FOR USER

Before proceeding, we need to confirm:

### Question 1: Base Wizard Intro Step
**Should base wizard include the intro step (Maya welcome message)?**
- **Option A:** Yes, include intro (6 steps total) - Better UX, provides context
- **Option B:** No, skip intro (5 steps total) - Faster, more direct

**My Recommendation:** Option A (include intro)

---

### Question 2: Existing Blueprint Users
**What should happen when existing blueprint users (who already filled form) see base wizard?**
- **Option A:** Pre-fill base wizard fields with defaults, allow user to update
- **Option B:** Skip base wizard for users with blueprint data, only show extension
- **Option C:** Force re-entry of all fields (not recommended)

**My Recommendation:** Option A (pre-fill with defaults)

---

### Question 3: Existing BrandProfileWizard Users
**Users who already completed full BrandProfileWizard (12 steps) - should they see progressive onboarding?**
- **Option A:** No, mark as `onboarding_completed = true`, skip all wizards
- **Option B:** Yes, show base wizard again (bad UX, not recommended)

**My Recommendation:** Option A (skip for existing users)

---

### Question 4: Blueprint Form `vibe` Field
**The blueprint form has a `vibe` field - how should it map to base wizard?**
- **Option A:** Map to `visualAesthetic` (if compatible format)
- **Option B:** Ask user to re-select during base wizard
- **Option C:** Keep as separate field in `blueprint_subscribers.form_data`

**My Recommendation:** Option B (ask user to re-select, ensures consistency)

---

## 📋 UPDATED IMPLEMENTATION PLAN (After User Confirmation)

### Step 1: Base Wizard Component (2-3 hours)
- Extract steps 1-6 from `BrandProfileWizard`
- Create `components/onboarding/base-wizard.tsx`
- Save to `user_personal_brand` table
- Handle intro step (Maya welcome message)

### Step 2: Blueprint Extension Component (1-2 hours)
- Extract blueprint form fields (Dream Client, Struggle, Feed Style)
- Create `components/onboarding/blueprint-extension.tsx`
- Save to `blueprint_subscribers.form_data`
- Reuse blueprint form UI patterns

### Step 3: Studio Extension Component (2-3 hours)
- Extract steps 7-12 from `BrandProfileWizard`
- Create `components/onboarding/studio-extension.tsx`
- Save to `user_personal_brand` table
- Reuse BrandProfileWizard UI patterns

### Step 4: Routing Logic Update (1 hour)
- Update `SselfieApp` to show: Blueprint Welcome → Base → Extension → Product
- Check entitlement after base completion
- Route to appropriate extension

### Step 5: Migration Scripts (1 hour)
- Mark existing BrandProfileWizard users as `onboarding_completed = true`
- Pre-fill base wizard fields for existing blueprint users (with defaults)
- Map existing blueprint form data to new structure

### Step 6: Testing (1 hour)
- Test new free user flow
- Test new paid blueprint user flow
- Test new studio user flow
- Test existing users (no duplicate wizards)

---

## 🎯 FINAL RECOMMENDATION

**Status:** ⚠️ **PLAN NEEDS UPDATES** before implementation

**Required Changes:**
1. ✅ Fix component reference (BrandProfileWizard, not OnboardingWizard)
2. ✅ Include intro step in base wizard (6 steps total)
3. ✅ Handle existing BrandProfileWizard users (skip progressive onboarding)
4. ✅ Handle existing blueprint users (pre-fill defaults)
5. ✅ Correct routing order (Blueprint Welcome → Base → Extension → Product)

**After User Confirmation:**
- Update the plan document with these changes
- Proceed with implementation in phases
- Test each phase before moving to next

**Estimated Time:** 6-8 hours (unchanged, but broken into clearer phases)

---

## ❓ NEXT STEPS

1. **User Reviews This Document**
2. **User Answers Critical Questions (4 questions above)**
3. **Update Plan Document** with confirmed decisions
4. **Begin Implementation** in phases

---

**END OF REVIEW**

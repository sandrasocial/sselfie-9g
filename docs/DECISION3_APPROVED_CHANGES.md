# Decision 3: Approved Changes Summary

**Date:** 2026-01-09  
**Status:** ✅ **APPROVED** - All recommendations accepted  
**Updated Plan:** `docs/ONBOARDING_EXPERIENCE_DESIGN_PLAN.md`

---

## ✅ APPROVED DECISIONS

### 1. Include Intro Step in Base Wizard ✅
- **Decision:** Yes, include intro step (6 steps total: Intro + 5 data steps)
- **Reasoning:** Better UX, provides context, reduces friction, minimal time cost
- **Impact:** Base wizard now has 6 steps instead of 5
- **Implementation:** Extract steps 1-6 from `BrandProfileWizard` (intro + 5 data steps)

### 2. Pre-fill Base Wizard for Existing Blueprint Users ✅
- **Decision:** Yes, pre-fill with defaults, allow user to update
- **Pre-fill Strategy:**
  - Name: user's `display_name` or email
  - Business Type: from `blueprint_subscribers.form_data.business`
  - Color Theme: default value
  - Visual Aesthetic: ask user to re-select (don't auto-map `vibe` field)
  - Current Situation: default/empty
- **Impact:** Existing blueprint users don't lose data, but can update/complete base wizard

### 3. Skip Progressive Onboarding for Existing BrandProfileWizard Users ✅
- **Decision:** Yes, mark as `onboarding_completed = true`, skip progressive onboarding
- **Migration SQL:**
  ```sql
  UPDATE users
  SET onboarding_completed = TRUE,
      blueprint_welcome_shown_at = COALESCE(blueprint_welcome_shown_at, NOW())
  WHERE EXISTS (
    SELECT 1 FROM user_personal_brand
    WHERE user_personal_brand.user_id = users.id
    AND user_personal_brand.is_completed = TRUE
  )
  AND onboarding_completed = FALSE;
  ```
- **Impact:** Users who already completed full 12-step wizard won't see progressive onboarding

### 4. Ask User to Re-select Visual Aesthetic ✅
- **Decision:** Yes, ask user to re-select during base wizard (don't auto-map `vibe` field)
- **Reasoning:** Ensures consistency, prevents data format mismatches
- **Impact:** Existing blueprint users will re-select Visual Aesthetic (one extra step, but ensures data quality)

---

## 🔧 PLAN CORRECTIONS IMPLEMENTED

### 1. Component Reference Fixed ✅
- **Before:** "Reuse UI patterns from existing `OnboardingWizard` component"
- **After:** "Reuse UI patterns from existing `BrandProfileWizard` component"
- **Reason:** `OnboardingWizard` is for training models, `BrandProfileWizard` has brand data collection UI

### 2. Routing Order Corrected ✅
- **Before:** Base → Extension → Blueprint Welcome → Product
- **After:** **Blueprint Welcome → Base → Extension → Product**
- **Reason:** Blueprint Welcome should show FIRST (already working), then progressive onboarding

### 3. Migration Strategy Added ✅
- **New:** Handle existing BrandProfileWizard users (mark as completed)
- **New:** Pre-fill strategy for existing blueprint users
- **New:** Handle `vibe` field mapping (ask user to re-select)

### 4. Implementation Phases Clarified ✅
- **Phase 3A:** Base Wizard (2-3 hours)
- **Phase 3B:** Blueprint Extension (1-2 hours)
- **Phase 3C:** Studio Extension (2-3 hours)
- **Phase 3D:** Routing & Integration (1 hour)
- **Phase 3E:** Migration & Testing (1 hour)

---

## 📋 UPDATED BASE WIZARD STEPS

**Before (Plan):** 5 steps
1. Name
2. Business Type
3. Color Theme
4. Visual Aesthetic
5. Current Situation

**After (Approved):** 6 steps
1. **Intro** (Maya welcome message) ← NEW
2. Name
3. Business Type
4. Color Theme
5. Visual Aesthetic
6. Current Situation

---

## 📋 UPDATED COMPONENT REUSE

**Before (Plan):**
- "Reuse UI patterns from existing `OnboardingWizard` component"

**After (Approved):**
- **Base Wizard:** Extract steps 1-6 from `BrandProfileWizard`
- **Studio Extension:** Extract steps 7-12 from `BrandProfileWizard`
- **Blueprint Extension:** Reuse blueprint form UI patterns from existing blueprint flow

---

## 📋 UPDATED STORAGE SCHEMA

**Base Wizard Data → `user_personal_brand` table:**
- `name` (TEXT)
- `business_type` (TEXT)
- `color_theme` (TEXT)
- `visual_aesthetic` (JSONB - array)
- `current_situation` (TEXT)

**Blueprint Extension Data → `blueprint_subscribers.form_data` (JSONB):**
```json
{
  "dreamClient": "string",
  "struggle": "string",
  "feed_style": "string"
}
```

**Studio Extension Data → `user_personal_brand` table:**
- `transformation_story` (TEXT)
- `future_vision` (TEXT)
- `ideal_audience` (TEXT)
- `communication_voice` (JSONB - array)
- `photo_goals` (TEXT)
- `content_pillars` (JSONB - array)
- `brand_inspiration` (TEXT)

---

## 🎯 UPDATED USER FLOWS

### New Free User Flow (Approved)
1. Sign up → Redirect to `/studio`
2. **Show Blueprint Welcome Wizard** (FIRST)
3. Click "Get Started" → **Show Base Wizard** (6 steps)
4. Complete Base Wizard → **Show Blueprint Extension** (3 steps)
5. Complete Extension → Set `onboarding_completed = true` → **Redirect to Blueprint tab**

### New Paid Blueprint User Flow (Approved)
1. Sign up / Purchase → Redirect to `/studio?tab=blueprint`
2. **Show Blueprint Welcome Wizard** (FIRST)
3. Click "Get Started" → **Show Base Wizard** (6 steps)
4. Complete Base Wizard → **Show Blueprint Extension** (3 steps)
5. Complete Extension → Set `onboarding_completed = true` → **Redirect to Paid Blueprint screen (FeedViewScreen)**

### New Studio User Flow (Approved)
1. Sign up / Purchase → Redirect to `/studio`
2. **Show Blueprint Welcome Wizard** (FIRST)
3. Click "Get Started" → **Show Base Wizard** (6 steps)
4. Complete Base Wizard → **Show Studio Extension** (7 steps)
5. Complete Extension → Set `onboarding_completed = true` → **Redirect to Studio (Maya chat)**

### Existing BrandProfileWizard User Flow (Approved)
1. Login → Check `user_personal_brand.is_completed = TRUE`
2. **Skip all progressive onboarding wizards**
3. Show Studio directly (or Blueprint tab if entitlement)

### Existing Blueprint User Flow (Approved)
1. Login → Check `blueprint_subscribers` exists
2. **Show Blueprint Welcome Wizard** (if not shown before)
3. After welcome → **Show Base Wizard** (6 steps, pre-filled with defaults)
4. User can update pre-filled fields
5. Complete Base Wizard → **Show Blueprint Extension** (3 steps, pre-filled with existing data)
6. Complete Extension → Set `onboarding_completed = true` → **Redirect to Blueprint tab**

---

## ✅ IMPLEMENTATION CHECKLIST

### Phase 3A: Base Wizard
- [ ] Extract steps 1-6 from `BrandProfileWizard`
- [ ] Create `components/onboarding/base-wizard.tsx`
- [ ] Implement pre-filling logic for existing blueprint users
- [ ] Save to `user_personal_brand` table
- [ ] Test base wizard independently

### Phase 3B: Blueprint Extension
- [ ] Extract blueprint form UI patterns
- [ ] Create `components/onboarding/blueprint-extension.tsx`
- [ ] Implement pre-filling from `blueprint_subscribers.form_data`
- [ ] Save to `blueprint_subscribers.form_data`
- [ ] Test blueprint extension independently

### Phase 3C: Studio Extension
- [ ] Extract steps 7-12 from `BrandProfileWizard`
- [ ] Create `components/onboarding/studio-extension.tsx`
- [ ] Save to `user_personal_brand` table
- [ ] Test studio extension independently

### Phase 3D: Routing & Integration
- [ ] Update `SselfieApp` routing logic (correct order)
- [ ] Handle existing BrandProfileWizard users (skip check)
- [ ] Integrate all wizards in sequence
- [ ] Test complete flows

### Phase 3E: Migration & Testing
- [ ] Create migration script (existing BrandProfileWizard users)
- [ ] Create migration script (existing blueprint users - pre-fill)
- [ ] Test all user flows
- [ ] Fix edge cases

---

## 📊 UPDATED SUCCESS CRITERIA

### Base Wizard Success
- ✅ 6 steps shown (Intro + 5 data steps)
- ✅ Existing blueprint users see pre-filled fields
- ✅ Data saved to `user_personal_brand` table
- ✅ Correct UI patterns reused from `BrandProfileWizard`

### Blueprint Extension Success
- ✅ 3 steps shown (Dream Client, Struggle, Feed Style)
- ✅ Existing blueprint users see pre-filled data
- ✅ Data saved to `blueprint_subscribers.form_data`
- ✅ Correct UI patterns reused from blueprint form

### Studio Extension Success
- ✅ 7 steps shown (Transformation Story through Brand Inspiration)
- ✅ Data saved to `user_personal_brand` table
- ✅ Correct UI patterns reused from `BrandProfileWizard`

### Routing Success
- ✅ Blueprint Welcome shows FIRST
- ✅ Base Wizard shows after Blueprint Welcome
- ✅ Extension shows after Base Wizard (based on entitlement)
- ✅ Product redirects after Extension completion
- ✅ Existing BrandProfileWizard users skip progressive onboarding

### Migration Success
- ✅ Existing BrandProfileWizard users marked as `onboarding_completed = true`
- ✅ Existing blueprint users can complete base wizard with pre-filled data
- ✅ Visual Aesthetic re-selected (not auto-mapped)
- ✅ No duplicate wizards shown

---

## 🚀 NEXT STEPS

1. ✅ **Plan Updated** - All approved changes reflected in `ONBOARDING_EXPERIENCE_DESIGN_PLAN.md`
2. ⏳ **Complete Decision 2** - Finish testing and PR #2
3. ⏳ **Start Decision 3 Implementation** - Begin with Phase 3A (Base Wizard)

---

**Status:** ✅ Plan approved and updated, ready for implementation after Decision 2 completion.

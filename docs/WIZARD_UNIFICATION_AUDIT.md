# Wizard Unification Audit

## Executive Summary

**Current State:** Two separate wizards collecting overlapping data:
- **Blueprint Onboarding Wizard** (4 steps) - For free/paid blueprint users
- **Brand Profile Wizard** (12 steps) - For members/subscription users

**Problem:** Duplication, incomplete Maya context, inconsistent storage patterns.

**Recommendation:** Create unified onboarding wizard that combines both, saves to single source of truth (`user_personal_brand`), and provides complete context for Maya.

---

## Current Implementation Analysis

### Blueprint Onboarding Wizard (4 Steps)

**Fields Collected:**
1. **Step 1: Brand Basics**
   - `business` → Maps to `user_personal_brand.business_type`
   - `dreamClient` → Maps to `user_personal_brand.target_audience`
   - `vibe` → Maps to `user_personal_brand.brand_vibe` + `visual_aesthetic`

2. **Step 2: Content Skills**
   - `lightingKnowledge` → Combined into `photo_goals`
   - `angleAwareness` → Combined into `photo_goals`
   - `editingStyle` → Combined into `style_preferences`
   - `consistencyLevel` → Combined into `style_preferences`
   - `currentSelfieHabits` → Combined into `photo_goals`

3. **Step 3: Feed Aesthetic**
   - `feedStyle` → Maps to `settings_preference` (limited)

4. **Step 4: Selfies**
   - `selfieImages` → Saved to `user_avatar_images` (✅ Good - single source)

**Storage Pattern:**
- Saves to `blueprint_subscribers.form_data` (JSONB) - for blueprint-specific data
- Also saves to `user_personal_brand` (mapped fields) - for Maya context
- **Problem:** Incomplete mapping, data loss, dual storage

**Maya Context:**
- ✅ Has: business_type, target_audience, brand_vibe, visual_aesthetic (limited)
- ❌ Missing: name, story, vision, content pillars, communication voice, color theme, fashion style

---

### Brand Profile Wizard (12 Steps)

**Fields Collected:**
1. **Intro** - Welcome message
2. **name** → `user_personal_brand.name`
3. **businessType** → `user_personal_brand.business_type`
4. **colorTheme** → `user_personal_brand.color_theme` + `color_palette`
5. **visualAesthetic** → `user_personal_brand.visual_aesthetic` (array)
6. **currentSituation** → `user_personal_brand.current_situation`
7. **transformationStory** → `user_personal_brand.transformation_story`
8. **futureVision** → `user_personal_brand.future_vision`
9. **idealAudience** → `user_personal_brand.ideal_audience` + `audience_challenge` + `audience_transformation`
10. **communicationVoice** → `user_personal_brand.communication_voice` (array)
11. **photoGoals** → `user_personal_brand.photo_goals`
12. **contentPillars** → `user_personal_brand.content_pillars` (JSONB)
13. **brandInspiration** → `user_personal_brand.brand_inspiration` + `inspiration_links`

**Storage Pattern:**
- Saves ONLY to `user_personal_brand` table
- ✅ Single source of truth
- ✅ Complete Maya context

**Maya Context:**
- ✅ Complete: All fields properly mapped
- ✅ Used by `getUserContextForMaya()` function
- ✅ Includes: visual aesthetic, settings, fashion, communication, audience, story, vision

---

## Field Comparison Matrix

| Field | Blueprint Wizard | Brand Profile Wizard | Maya Uses | Unified Priority |
|-------|-----------------|---------------------|-----------|------------------|
| **Name** | ❌ Missing | ✅ `name` | ✅ Yes | 🔴 HIGH |
| **Business Type** | ✅ `business` | ✅ `businessType` | ✅ Yes | 🔴 HIGH |
| **Target Audience** | ✅ `dreamClient` | ✅ `idealAudience` (detailed) | ✅ Yes | 🔴 HIGH |
| **Vibe/Aesthetic** | ✅ `vibe` (single) | ✅ `visualAesthetic` (array) | ✅ Yes | 🔴 HIGH |
| **Color Theme** | ❌ Missing | ✅ `colorTheme` | ✅ Yes | 🟡 MEDIUM |
| **Feed Style** | ✅ `feedStyle` | ❌ Missing | ✅ Yes (as settings) | 🟡 MEDIUM |
| **Current Situation** | ❌ Missing | ✅ `currentSituation` | ✅ Yes | 🟡 MEDIUM |
| **Transformation Story** | ❌ Missing | ✅ `transformationStory` | ✅ Yes | 🟡 MEDIUM |
| **Future Vision** | ❌ Missing | ✅ `futureVision` | ✅ Yes | 🟡 MEDIUM |
| **Photo Goals** | ⚠️ Combined from 5 fields | ✅ `photoGoals` (direct) | ✅ Yes | 🟡 MEDIUM |
| **Style Preferences** | ⚠️ Combined from 2 fields | ❌ Missing | ✅ Yes | 🟢 LOW |
| **Content Pillars** | ❌ Missing | ✅ `contentPillars` | ✅ Yes | 🟡 MEDIUM |
| **Communication Voice** | ❌ Missing | ✅ `communicationVoice` | ✅ Yes | 🟡 MEDIUM |
| **Fashion Style** | ❌ Missing | ✅ `fashionStyle` | ✅ Yes | 🟢 LOW |
| **Brand Inspiration** | ❌ Missing | ✅ `brandInspiration` | ✅ Yes | 🟢 LOW |
| **Selfie Images** | ✅ Step 4 | ❌ Missing | ✅ Yes (Pro Mode) | 🔴 HIGH |

---

## Issues Identified

### 1. **Over-Engineering in Blueprint Wizard**
- ❌ Dual storage: `blueprint_subscribers.form_data` + `user_personal_brand`
- ❌ Complex field mapping/combining (5 fields → `photo_goals`, 2 fields → `style_preferences`)
- ❌ Incomplete mapping to `user_personal_brand`
- ❌ Missing critical Maya context fields

### 2. **Missing Context for Maya**
Blueprint wizard doesn't collect:
- Name (Maya uses this for personalization)
- Story/transformation (Maya uses for authentic content)
- Future vision (Maya uses for goal-oriented content)
- Content pillars (Maya uses for content strategy)
- Communication voice (Maya uses for tone matching)
- Color theme (Maya uses for visual consistency)

### 3. **Duplication**
- Both wizards ask: business type, target audience, vibe/aesthetic
- Users may complete both wizards and enter same data twice
- No way to sync or merge data

### 4. **Inconsistent Storage**
- Brand Profile: Single table (`user_personal_brand`)
- Blueprint: Dual storage (`blueprint_subscribers` + `user_personal_brand`)
- Makes data management complex

### 5. **Frontend State Management**
- Brand Profile: Simple state, no localStorage (relies on API)
- Blueprint: Complex localStorage merging with API data
- Inconsistent patterns

---

## Unified Wizard Recommendation

### Proposed Structure (8-10 Steps)

**Core Steps (All Users):**
1. **Welcome/Intro** - Maya introduction
2. **Name** - Brand/personal name
3. **Business & Audience** - What you do + who you help (combines blueprint step 1)
4. **Visual Style** - Color theme + visual aesthetic + feed style (combines blueprint step 3)
5. **Your Story** - Current situation + transformation + future vision
6. **Content Strategy** - Content pillars + photo goals (combines blueprint step 2)
7. **Communication Style** - Voice + tone
8. **Selfie Upload** - Reference images (blueprint step 4)

**Optional Steps (Can skip):**
9. **Fashion Style** - Optional
10. **Brand Inspiration** - Optional

### Benefits

1. **Single Source of Truth**
   - All data saved to `user_personal_brand` table
   - No dual storage
   - Complete Maya context

2. **No Duplication**
   - Users complete once, works for all features
   - Free, paid, and subscription users use same wizard
   - Consistent experience

3. **Complete Maya Context**
   - All fields properly mapped
   - Maya has full context for better content generation
   - No missing fields

4. **Simplified Storage**
   - One table, one API endpoint
   - Easier to maintain
   - No complex mapping logic

5. **Better UX**
   - Progressive disclosure (core → optional)
   - Can skip optional steps
   - Edit later in Account section

### Implementation Approach

**Phase 1: Create Unified Wizard Component**
- Combine fields from both wizards
- Use brand profile wizard as base (more complete)
- Add blueprint-specific fields (feed style, content skills)
- Save to `user_personal_brand` only

**Phase 2: Update Storage Logic**
- Remove `blueprint_subscribers.form_data` dependency
- Update all APIs to read from `user_personal_brand`
- Migrate existing blueprint data to `user_personal_brand`

**Phase 3: Update All Entry Points**
- Free users: Unified wizard
- Paid users: Unified wizard (skip free example)
- Members: Unified wizard (if not completed)
- Account section: Edit unified wizard

**Phase 4: Cleanup**
- Remove old blueprint wizard component
- Remove dual storage logic
- Update documentation

---

## Field Mapping for Unified Wizard

### Step 1: Welcome
- Intro message (Maya personality)

### Step 2: Name
- `name` → `user_personal_brand.name`

### Step 3: Business & Audience
- `businessType` → `user_personal_brand.business_type`
- `idealAudience` → `user_personal_brand.ideal_audience`
- `audienceChallenge` → `user_personal_brand.audience_challenge`
- `audienceTransformation` → `user_personal_brand.audience_transformation`

### Step 4: Visual Style
- `colorTheme` → `user_personal_brand.color_theme`
- `customColors` → `user_personal_brand.color_palette` (if custom)
- `visualAesthetic` → `user_personal_brand.visual_aesthetic` (array)
- `feedStyle` → `user_personal_brand.settings_preference` (array, add feed style)

### Step 5: Your Story
- `currentSituation` → `user_personal_brand.current_situation`
- `transformationStory` → `user_personal_brand.transformation_story`
- `futureVision` → `user_personal_brand.future_vision`

### Step 6: Content Strategy
- `contentPillars` → `user_personal_brand.content_pillars` (JSONB)
- `photoGoals` → `user_personal_brand.photo_goals` (direct, not combined)
- `lightingKnowledge` → Can be part of `photo_goals` or separate field
- `angleAwareness` → Can be part of `photo_goals` or separate field
- `editingStyle` → `user_personal_brand.style_preferences`
- `consistencyLevel` → `user_personal_brand.style_preferences`
- `currentSelfieHabits` → Can be part of `photo_goals`

### Step 7: Communication Style
- `communicationVoice` → `user_personal_brand.communication_voice` (array)
- `signaturePhrases` → `user_personal_brand.signature_phrases`

### Step 8: Selfie Upload
- `selfieImages` → `user_avatar_images` (already simplified ✅)

### Step 9: Fashion Style (Optional)
- `fashionStyle` → `user_personal_brand.fashion_style` (array)

### Step 10: Brand Inspiration (Optional)
- `brandInspiration` → `user_personal_brand.brand_inspiration`
- `inspirationLinks` → `user_personal_brand.inspiration_links`

---

## Migration Strategy

### For Existing Users

1. **Brand Profile Users**
   - ✅ Already have complete data in `user_personal_brand`
   - No migration needed

2. **Blueprint Users**
   - Migrate `blueprint_subscribers.form_data` → `user_personal_brand`
   - Map fields correctly
   - Fill missing fields with defaults or ask user to complete

3. **New Users**
   - Use unified wizard from start
   - No migration needed

---

## Next Steps

1. ✅ **Audit Complete** - This document
2. ⏳ **Create Unified Wizard Component** - Combine both wizards
3. ⏳ **Update Storage Logic** - Single source of truth
4. ⏳ **Update Entry Points** - All user types use unified wizard
5. ⏳ **Migration Script** - Move existing blueprint data
6. ⏳ **Testing** - Verify Maya context is complete
7. ⏳ **Cleanup** - Remove old components

---

## Questions to Answer

1. **Should we keep `blueprint_subscribers` table?**
   - Recommendation: Keep for paid blueprint purchase tracking only
   - Remove `form_data` column (use `user_personal_brand` instead)

2. **How to handle existing blueprint users?**
   - Recommendation: Migrate data, show unified wizard for missing fields

3. **Should unified wizard be required or optional?**
   - Recommendation: Required for first-time users, optional edit later

4. **Progressive disclosure - how many steps?**
   - Recommendation: 8 core steps + 2 optional = 10 total
   - Can collapse some steps for faster completion

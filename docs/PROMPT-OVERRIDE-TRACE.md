# Prompt Override Trace - Critical Issue

**Date:** 2025-01-20  
**Issue:** ALL prompts are the same regardless of user request. Classic Mode is using brands (should only be Pro Mode). Hardcoded outfit: "cream cashmere sweater, matching cashmere joggers, UGG Tasman slippers, Cartier Love bracelet". Also seeing "White woman, long dark brown hair" in prompts.

---

## 🔍 ROOT CAUSE ANALYSIS

### Issue 1: Brand Library Overriding ALL Prompts in Classic Mode

#### Problem Location:
- **File:** `app/api/maya/generate-concepts/route.ts`
- **Lines:** 2251-2294 (AI Prompt Instructions)
- **Lines:** 3540-3638 (Post-Generation Override)

#### Root Causes:

1. **Brand Library in AI Prompt Instructions (Lines 2251-2294):**
   ```typescript
   9. **🔴 CRITICAL: BRAND LIBRARY - ALWAYS USE SPECIFIC BRAND NAMES**
   
   Based on the detected category, you MUST use these specific brands in your outfit descriptions:
   
   ${(() => {
     const outfit = generateCompleteOutfit(mappedCategory, userRequest || aesthetic || '')
     // ... builds brand guidance telling Maya to use specific brands
   })()}
   ```
   - **Problem:** This is in Classic Mode's AI prompt, telling Maya to use brands
   - **Should be:** Only in Pro Mode
   - **Result:** Maya is forced to use hardcoded outfits from brand library

2. **Post-Generation Brand Injection (Lines 3540-3638):**
   ```typescript
   if (!usePromptConstructor) {
     const outfit = generateCompleteOutfit(mappedCategoryForBrands, ...)
     concepts.forEach((concept, index) => {
       // Build branded outfit description
       const brandedOutfit = brandedParts.join(', ')
       
       // Strategy 1-4: Replace or inject branded outfit into prompt
       concept.prompt = enhancedPrompt // OVERRIDES Maya's prompt
     })
   }
   ```
   - **Problem:** After Maya generates concepts, code injects hardcoded outfit
   - **Result:** ALL concepts get the same outfit, overriding Maya's creativity

3. **Hardcoded Outfit in Brand Library:**
   - **File:** `lib/maya/brand-library-2025.ts`
   - **Lines:** 594-600
   ```typescript
   if (categoryLower === 'cozy' || categoryLower === 'home') {
     outfit.top = 'cream cashmere sweater' // unbranded
     outfit.bottom = 'matching cashmere joggers' // unbranded
     outfit.shoes = getDetailedDescription('UGG', 'Tasman slippers')
     outfit.accessory = getDetailedDescription('Cartier', 'Love bracelet')
     return outfit
   }
   ```
   - **Problem:** Hardcoded outfit for 'cozy' category
   - **Result:** Every 'cozy' request gets the same outfit

---

### Issue 2: "White woman, long dark brown hair" in Prompts

#### Problem Location:
- **File:** `app/api/maya/generate-concepts/route.ts`
- **Lines:** 2107-2156 (Trigger word and gender section)
- **Lines:** 2158-2184 (Character feature guidance)

#### Root Causes:

1. **Physical Preferences Being Added:**
   - Lines 2110-2137: Physical preferences are being converted and added to prompts
   - If user has "long dark brown hair" in preferences, it gets added
   - But the issue is it's being added even when not in user preferences

2. **Trigger Word Format:**
   - Line 2150: `"${triggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}${physicalPreferences ? `, [converted physical preferences]` : ""}"`
   - If `userEthnicity` is "White" and `userGender` is "woman", it creates "White woman"
   - Physical preferences might include "long dark brown hair"

3. **Need to Check:**
   - Where is `userEthnicity` coming from?
   - Where are physical preferences being set?
   - Is there a default being applied?

---

### Issue 3: ALL Concepts Have Same Outfit ✅ FIXED

#### Problem Location:
- **File:** `app/api/maya/generate-concepts/route.ts`
- **Lines:** 1957-1966 (Outfit Variation Instructions)
- **Lines:** 2399-2408 (Creative Mission Section)

#### Root Causes (RESOLVED):

1. **✅ FIXED: Instructions Not Strong Enough**
   - **Problem:** Instructions about outfit variation were not prominent or clear enough
   - **Fix:** Strengthened instructions with explicit "DEFAULT BEHAVIOR" and "ONLY use same outfit if user explicitly asks"
   - **Status:** Fixed - Instructions now clearly state default = different outfits, same outfit = only if user explicitly requests

2. **✅ FIXED: Missing Emphasis in Creative Mission**
   - **Problem:** Creative Mission section didn't emphasize outfit diversity
   - **Fix:** Added explicit outfit diversity check in Creative Mission section
   - **Status:** Fixed - Creative Mission now includes outfit diversity reminder

---

## 📊 DATA FLOW ANALYSIS

### Current Flow (BROKEN):

1. **User Request** → `generate-concepts` API
2. **Category Detection** → Detects category (or defaults to 'cozy')
3. **AI Prompt Generation** → Includes brand library instructions (lines 2251-2294)
4. **Maya Generates Concepts** → Creates 6 unique concepts with different outfits
5. **Post-Processing** → Brand library OVERRIDES all prompts (lines 3540-3638)
   - Generates ONE outfit for the category
   - Injects SAME outfit into ALL 6 concepts
   - Replaces Maya's unique outfits
6. **Result** → All concepts have identical outfit

### Expected Flow (FIXED):

1. **User Request** → `generate-concepts` API
2. **Classic Mode:**
   - NO brand library in AI prompt
   - Maya generates unique outfits for each concept
   - NO post-processing brand injection
3. **Pro Mode:**
   - Brand library can be used as inspiration
   - But Maya still determines final outfits dynamically
   - Each concept gets unique outfit based on concept description

---

## 🎯 SPECIFIC CODE ISSUES

### 1. Brand Library in Classic Mode AI Prompt

**File:** `app/api/maya/generate-concepts/route.ts`  
**Lines:** 2251-2294

**Problem:**
```typescript
9. **🔴 CRITICAL: BRAND LIBRARY - ALWAYS USE SPECIFIC BRAND NAMES**
   
   Based on the detected category, you MUST use these specific brands...
   
   ${(() => {
     const outfit = generateCompleteOutfit(mappedCategory, ...)
     // Tells Maya to use specific brands
   })()}
```

**Issues:**
- This is in Classic Mode (not Pro Mode)
- Forces Maya to use hardcoded brands
- Should be removed from Classic Mode

**Fix Needed:**
- Only include brand library instructions in Pro Mode
- Classic Mode should NOT mention brands at all

---

### 2. Post-Generation Brand Injection

**File:** `app/api/maya/generate-concepts/route.ts`  
**Lines:** 3540-3638

**Problem:**
```typescript
if (!usePromptConstructor) {
  const outfit = generateCompleteOutfit(mappedCategoryForBrands, ...)
  
  concepts.forEach((concept, index) => {
    // Build SAME outfit for ALL concepts
    const brandedOutfit = brandedParts.join(', ')
    
    // Replace Maya's unique outfit with hardcoded one
    concept.prompt = enhancedPrompt
  })
}
```

**Issues:**
- Generates ONE outfit, applies to ALL concepts
- Overrides Maya's dynamic outfit generation
- No variation between concepts

**Fix Needed:**
- Remove this post-processing override
- Let Maya's generated prompts stand
- OR: Generate unique outfit per concept based on concept description

---

### 3. Hardcoded Outfit in Brand Library

**File:** `lib/maya/brand-library-2025.ts`  
**Lines:** 594-600

**Problem:**
```typescript
if (categoryLower === 'cozy' || categoryLower === 'home') {
  outfit.top = 'cream cashmere sweater' // Always the same
  outfit.bottom = 'matching cashmere joggers' // Always the same
  outfit.shoes = getDetailedDescription('UGG', 'Tasman slippers')
  outfit.accessory = getDetailedDescription('Cartier', 'Love bracelet')
  return outfit
}
```

**Issues:**
- Hardcoded outfit for 'cozy' category
- No variation based on user request
- Always returns same outfit

**Fix Needed:**
- Make brand library return variations
- OR: Use brand library as inspiration, not hardcoded requirement
- OR: Remove brand library from Classic Mode entirely

---

### 4. "White woman, long dark brown hair" Source

**Need to Check:**
- Where is `userEthnicity` being set to "White"?
- Where are physical preferences being set to "long dark brown hair"?
- Is there a default being applied?

**Possible Sources:**
- User database settings
- Default values in prompt constructor
- Physical preferences from model settings

**Fix Needed:**
- Remove default ethnicity/physical descriptions
- Only include if explicitly in user preferences
- Classic Mode should NOT assume physical characteristics

---

## 🔧 FIXES NEEDED

### Priority 1: Remove Brand Library from Classic Mode (CRITICAL)

1. **Remove brand library instructions from Classic Mode AI prompt**
   - **File:** `app/api/maya/generate-concepts/route.ts`
   - **Lines:** 2251-2294: Currently ALWAYS included (not conditional)
   - **Fix:** Wrap in `if (studioProMode) { ... }` - only include in Pro Mode
   - Classic Mode should NOT mention brands at all

2. **Remove post-generation brand injection from Classic Mode**
   - **File:** `app/api/maya/generate-concepts/route.ts`
   - **Lines:** 3540-3638: Currently runs when `!usePromptConstructor`
   - **Problem:** `usePromptConstructor` is only true for Studio Pro Mode (line 3109)
   - **Fix:** Change condition to `if (studioProMode && !usePromptConstructor)`
   - Classic Mode should use Maya's generated prompts as-is

3. **Check `usePromptConstructor` flag**
   - **Line 3109:** `const usePromptConstructor = studioProMode && !detectedGuidePrompt && ...`
   - This means Classic Mode (`studioProMode = false`) will NOT use prompt constructor
   - So post-generation brand injection runs for Classic Mode
   - **Fix:** Make brand injection conditional on `studioProMode`

### Priority 2: Fix "White woman, long dark brown hair"

1. **Source of "White woman":**
   - **File:** `app/api/maya/generate-concepts/route.ts`
   - **Line 886:** `userEthnicity = userDataResult[0]?.ethnicity || null`
   - **Line 2109:** `ETHNICITY: "${userEthnicity}"` - if userEthnicity is "White", it's added
   - **Line 2150:** `"${triggerWord}, ${userEthnicity ? userEthnicity + " " : ""}${userGender}"` - creates "White woman"
   - **Fix:** Only include ethnicity if explicitly in user preferences AND user wants it

2. **Source of "long dark brown hair":**
   - **Line 862:** `SELECT u.gender, u.ethnicity, um.trigger_word, upb.physical_preferences`
   - **Line 2111-2137:** Physical preferences are converted and added to prompts
   - If user has "long dark brown hair" in `physical_preferences`, it gets added
   - **Fix:** Check if this is a default value or user-set preference

3. **Remove default physical descriptions**
   - Only include if explicitly in user preferences
   - Don't assume hair color, ethnicity, etc.
   - Classic Mode should use trigger word only, not physical descriptions

### Priority 3: Make Outfits Unique Per Concept

1. **Generate outfit per concept, not per category**
   - Use concept title/description to determine outfit
   - Don't apply same outfit to all concepts

2. **Use Maya's fashion expertise**
   - Let Maya determine outfits dynamically
   - Don't override with hardcoded brand library

---

## 📝 IMPLEMENTATION PLAN

### Phase 1: Remove Brand Library Override ✅ COMPLETED
1. **✅ Wrap brand library instructions in `if (studioProMode)`** (Lines 2251-2298)
   - Only include brand library section in Pro Mode
   - Classic Mode should NOT see brand instructions at all
   - **Status:** Fixed - Brand library instructions now conditional on `studioProMode`

2. **✅ REMOVED post-generation brand injection entirely** (Previously Lines 3543-3643)
   - **REMOVED:** Entire block that was injecting/replacing outfits in prompts
   - **Reason:** Maya's generated prompts should stand as-is without any post-processing override
   - **Status:** Fixed - No more prompt injection or replacement in BOTH Pro Mode and Classic Mode
   - Maya's fashion expertise and AI prompt instructions are sufficient

3. **Test:** Both Classic Mode and Pro Mode should use Maya's generated prompts without override
   - **Next Step:** Test both modes to verify prompts are unique and reflect user requests

### Phase 2: Fix Physical Descriptions (1-2 hours)
1. **Check database for default values**
   - Line 886: `userEthnicity = userDataResult[0]?.ethnicity || null`
   - Line 887: `physicalPreferences = userDataResult[0]?.physical_preferences || null`
   - Check if these are default values or user-set

2. **Make ethnicity optional in Classic Mode**
   - Line 2109: Only include if user explicitly wants it
   - Line 2150: Don't add ethnicity unless in user preferences

3. **Make physical preferences optional**
   - Only include if explicitly in user preferences
   - Don't add "long dark brown hair" unless user specified it

### Phase 3: Make Outfits Unique Per Concept ✅ COMPLETED
1. **✅ Strengthened outfit variation instructions** (Lines 1957-1966)
   - Made instructions more explicit: DEFAULT = different outfits
   - Clear exception: ONLY use same outfit if user explicitly asks
   - Added examples showing different outfits for each concept
   - **Status:** Fixed - Instructions now clearly emphasize outfit diversity

2. **✅ Added outfit diversity to Creative Mission** (Lines 2399-2408)
   - Added explicit check: "Is this a DIFFERENT outfit from the other concepts?"
   - Emphasized variety is key for concept cards
   - **Status:** Fixed - Creative Mission now includes outfit diversity reminder

3. **✅ Removed post-generation override** (Previously Phase 1)
   - Brand library override already removed
   - Maya's generated prompts now stand as-is
   - **Status:** Fixed - No more post-processing that could override outfits

---

## 🔍 SPECIFIC CODE CHANGES NEEDED

### Change 1: Make Brand Library Conditional (Line 2251)
```typescript
// BEFORE (always included):
9. **🔴 CRITICAL: BRAND LIBRARY - ALWAYS USE SPECIFIC BRAND NAMES**
   ${(() => { ... generateCompleteOutfit ... })()}

// AFTER (only Pro Mode):
${studioProMode ? `
9. **🔴 CRITICAL: BRAND LIBRARY - ALWAYS USE SPECIFIC BRAND NAMES**
   ${(() => { ... generateCompleteOutfit ... })()}
` : ''}
```

### Change 2: Fix Post-Generation Injection (Line 3541)
```typescript
// BEFORE:
if (!usePromptConstructor) {
  // Brand injection runs for Classic Mode
}

// AFTER:
if (studioProMode && !usePromptConstructor) {
  // Brand injection only for Pro Mode
}
```

### Change 3: Make Ethnicity Optional (Line 2109)
```typescript
// BEFORE:
${userEthnicity ? `ETHNICITY: "${userEthnicity}" (MUST include in prompt for accurate representation)` : ""}

// AFTER:
${studioProMode && userEthnicity ? `ETHNICITY: "${userEthnicity}" (MUST include in prompt for accurate representation)` : ""}
// OR: Only include if user explicitly wants it (check user preference)
```

---

**Total Estimated Time:** 5-8 hours


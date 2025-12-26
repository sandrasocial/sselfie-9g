# MAYA PROMPTING PIPELINE: COMPLETE AUDIT
## Category System Breaking Dynamic Prompt Generation

**Created:** 2025-12-20  
**Status:** 🔴 CRITICAL ISSUE IDENTIFIED  
**Note:** This audit references the composition system, which was later removed in December 2024. See `COMPOSITION-SYSTEM-REMOVAL-SUMMARY.md` for details.

---

## 📋 EXECUTIVE SUMMARY

The category detection system is **blocking Maya's ability to create dynamic prompts** based on user requests. When category patterns don't match, the system defaults to 'casual-lifestyle' or 'casual', which then constrains prompt generation instead of allowing Maya to use her full AI knowledge and fashion expertise.

**Root Cause:** Category detection is treated as a **requirement** rather than an **optional enhancement**. The system fails when categories don't match, instead of gracefully falling back to AI-driven dynamic prompt generation.

---

## 🔴 CRITICAL PROBLEMS IDENTIFIED

### **Problem 1: Category Detection Forces Defaults**

**Location:** Multiple files with category detection functions

**Issue:** When user requests don't match predefined category patterns, the system defaults to 'casual-lifestyle' or 'casual', which then constrains all subsequent prompt generation.

**Evidence:**
```
[v0] ⚠️ No category pattern matched, defaulting to casual-lifestyle. Combined text: pinterest influencer aesthetic dreamy curated feminine
```

**Files Affected:**
1. `app/api/maya/generate-concepts/route.ts` - Line 165-166: `detectCategoryFromRequest()` defaults to 'casual-lifestyle'
2. `app/api/maya/generate-concepts/route.ts` - Line 356-360: `detectCategoryForPromptConstructor()` defaults to 'casual'
3. `lib/maya/pro/category-system.ts` - Line 162: `detectCategory()` defaults to LIFESTYLE
4. `lib/maya/prompt-constructor-integration.ts` - Line 91-95: `detectCategory()` defaults to 'casual'

**Impact:** 
- User says "pinterest influencer aesthetic dreamy curated feminine" → No category match → Defaults to casual-lifestyle → Maya can't use her expertise to create dynamic prompts
- All prompts become generic "casual" prompts instead of matching the user's actual request

---

### **Problem 2: Category Detection Blocks AI Generation**

**Location:** `app/api/maya/generate-concepts/route.ts`

**Issue:** The system requires category detection BEFORE allowing AI generation. Even when AI generation is used (as fallback), it's constrained by the forced category.

**Flow:**
1. User request comes in
2. `detectCategoryFromRequest()` is called (line 2233, 2838, 2847, 3165, 3270, 3463, 3506)
3. If no match → defaults to 'casual-lifestyle' (line 165-166)
4. `detectedCategory` is then used to constrain:
   - Composition system (line 2936: `category: detectedCategory`)
   - AI generation fallback (line 3011-3021: uses `conceptPrompt` which includes category)
   - Prompt constructor (line 3074: `usePromptConstructor` depends on category)
   - Brand library enhancement (line 3506-3517: uses `detectedCategoryForBrands`)

**Impact:** Even when AI generation happens, it's constrained by the wrong category.

---

### **Problem 3: Multiple Conflicting Category Detection Functions**

**Location:** Multiple files

**Issue:** There are **4 different category detection functions** with different logic and defaults:

1. **`detectCategoryFromRequest()`** (`app/api/maya/generate-concepts/route.ts:106-167`)
   - Returns: 'travel-airport', 'alo-workout', 'seasonal-christmas', 'casual-lifestyle', 'luxury-fashion'
   - Default: 'casual-lifestyle' (line 165-166)
   - Used for: Universal Prompts mapping, brand library mapping

2. **`detectCategoryForPromptConstructor()`** (`app/api/maya/generate-concepts/route.ts:235-364`)
   - Returns: `{ category, vibe, location, wasDetected }`
   - Default: 'casual', 'casual', 'street' (line 356-360)
   - Used for: Prompt constructor system

3. **`detectCategory()`** (`lib/maya/pro/category-system.ts:89-163`)
   - Returns: `CategoryInfo` object
   - Default: `PRO_MODE_CATEGORIES.LIFESTYLE` (line 162)
   - Used for: Pro Mode category detection

4. **`detectCategory()`** (`lib/maya/prompt-constructor-integration.ts:24-96`)
   - Returns: `{ category, vibe, location }`
   - Default: 'casual', 'relaxed', 'coffee-shop' (line 91-95)
   - Used for: Prompt constructor integration

**Impact:** Inconsistent behavior, different defaults, confusion about which function to use.

---

### **Problem 4: Category Required for Prompt Constructor**

**Location:** `app/api/maya/generate-concepts/route.ts:3074-3287`

**Issue:** The prompt constructor system requires valid category/vibe/location. If category detection fails, it defaults to 'casual', which then generates generic prompts.

**Code:**
```typescript
// Line 3274-3286: If category detection fails, defaults to 'casual'
if (!category || !vibe || !location) {
  category = category || 'casual'
  vibe = vibe || 'casual'
  location = location || 'street'
  detectedCategoryForMapping = detectedCategoryForMapping || 'casual-lifestyle'
}
```

**Impact:** Even when user requests something specific (e.g., "pinterest influencer aesthetic"), the prompt constructor generates generic "casual" prompts.

---

### **Problem 5: AI Generation Constrained by Category**

**Location:** `app/api/maya/generate-concepts/route.ts:3011-3048`

**Issue:** When AI generation is used as fallback, the `conceptPrompt` (built at line 2650-2765) includes category constraints that limit Maya's creativity.

**Code:**
```typescript
// Line 3011-3021: AI generation fallback
const { text } = await generateText({
  model: 'anthropic/claude-sonnet-4-20250514',
  messages: [
    {
      role: 'user',
      content: conceptPrompt, // This includes category constraints
    },
  ],
})
```

**The `conceptPrompt` includes:**
- Category-specific instructions
- Brand library constraints based on category
- Template references based on category

**Impact:** Even AI generation is constrained by the wrong category.

---

### **Problem 6: Pro Mode Category System Too Rigid**

**Location:** `lib/maya/pro/category-system.ts` and `app/api/maya/pro/generate-concepts/route.ts`

**Issue:** Pro Mode category detection defaults to LIFESTYLE if no match, and then uses placeholder prompts instead of allowing dynamic generation.

**Code:**
```typescript
// lib/maya/pro/category-system.ts:162
// Default to LIFESTYLE if no clear match
return PRO_MODE_CATEGORIES.LIFESTYLE

// app/api/maya/pro/generate-concepts/route.ts:170
const universalPrompts = getCategoryPrompts(categoryKey, library)
// Returns placeholder prompts if category doesn't match
```

**Impact:** Pro Mode can't generate dynamic prompts for requests that don't match the 6 predefined categories.

---

## 📁 FILES THAT NEED CLEANUP/FIXES

### **Critical Files (Must Fix):**

1. **`app/api/maya/generate-concepts/route.ts`** (4788 lines)
   - **Lines 106-167:** `detectCategoryFromRequest()` - Remove default to 'casual-lifestyle', return null/empty if no match
   - **Lines 235-364:** `detectCategoryForPromptConstructor()` - Remove default to 'casual', return null if no match
   - **Lines 2808-2882:** Category detection logic - Make category optional, don't force defaults
   - **Lines 3096-3287:** Prompt constructor category logic - Allow null categories, use AI generation
   - **Lines 3011-3048:** AI generation fallback - Remove category constraints from prompt
   - **Lines 2650-2765:** `conceptPrompt` building - Make category optional, allow dynamic generation

2. **`lib/maya/pro/category-system.ts`**
   - **Lines 89-163:** `detectCategory()` - Remove default to LIFESTYLE, return null if no match
   - **Lines 173-265:** `getCategoryPrompts()` - Allow dynamic prompt generation when category is null

3. **`lib/maya/prompt-constructor-integration.ts`**
   - **Lines 24-96:** `detectCategory()` - Remove default to 'casual', return null if no match

4. **`app/api/maya/pro/generate-concepts/route.ts`**
   - **Lines 162-178:** Category detection and prompt retrieval - Allow dynamic generation when category is null

### **Supporting Files (May Need Updates):**

5. **`lib/maya/prompt-constructor.ts`**
   - Check if it requires category or can work without it

6. **`lib/maya/prompt-constructor-enhanced.ts`**
   - Check if it requires category or can work without it

7. **`lib/maya/brand-library-2025.ts`**
   - Check if `generateCompleteOutfit()` requires category or can work without it

8. **`lib/maya/pro/prompt-builder.ts`**
   - Check if it requires category or can work without it

---

## 🎯 SOLUTION STRATEGY

### **Principle: Category as Enhancement, Not Requirement**

**Current Flow (Broken):**
```
User Request → Category Detection → If no match → Default to 'casual' → Constrained Prompt Generation
```

**New Flow (Fixed):**
```
User Request → Category Detection (optional hint) → If no match → Use AI Dynamic Generation → Maya's Full Expertise
```

### **Key Changes Needed:**

1. **Make Category Detection Optional**
   - Return `null` or empty string when no match (don't default)
   - Use category as a **hint** for enhancement, not a requirement

2. **Allow AI Generation Without Category**
   - When category is null/unknown, use Maya's AI knowledge directly
   - Don't constrain prompts with wrong categories
   - Let Maya use her fashion expertise, brand knowledge, and styling intelligence

3. **Remove Category Defaults**
   - Remove all `default to 'casual-lifestyle'` logic
   - Remove all `default to 'casual'` logic
   - Remove all `default to LIFESTYLE` logic

4. **Make Prompt Constructor Category-Optional**
   - Allow prompt constructor to work without category
   - Use user request directly when category is unknown
   - Enhance with category when available, but don't require it

5. **Make Brand Library Category-Optional**
   - Allow brand library to work without category
   - Use user request context for brand selection
   - Enhance with category when available, but don't require it

---

## 📋 DETAILED FIX PLAN

### **Phase 1: Remove Category Defaults**

**File:** `app/api/maya/generate-concepts/route.ts`

1. **Fix `detectCategoryFromRequest()` (Lines 106-167)**
   - Remove default to 'casual-lifestyle' (line 165-166)
   - Return `null` or empty string when no match
   - Add `wasDetected: boolean` flag to track if category was actually detected

2. **Fix `detectCategoryForPromptConstructor()` (Lines 235-364)**
   - Already has `wasDetected` flag (line 248) ✅
   - Remove default to 'casual' (line 356-360)
   - Return `null` for category/vibe/location when not detected

3. **Fix Category Detection Logic (Lines 2808-2882)**
   - Don't default to 'casual-lifestyle' when no match
   - Allow `detectedCategory` to be `null` or empty
   - Pass `null` category to AI generation when unknown

**File:** `lib/maya/pro/category-system.ts`

4. **Fix `detectCategory()` (Lines 89-163)**
   - Remove default to LIFESTYLE (line 162)
   - Return `null` or special "UNKNOWN" category when no match
   - Update return type to allow null

5. **Fix `getCategoryPrompts()` (Lines 173-265)**
   - Handle null/unknown category
   - Return empty array or allow dynamic generation

**File:** `lib/maya/prompt-constructor-integration.ts`

6. **Fix `detectCategory()` (Lines 24-96)**
   - Remove default to 'casual' (line 91-95)
   - Return `null` when no match

---

### **Phase 2: Make AI Generation Category-Optional**

**File:** `app/api/maya/generate-concepts/route.ts`

7. **Fix `conceptPrompt` Building (Lines 2650-2765)**
   - Make category optional in prompt instructions
   - When category is null, instruct Maya to use her expertise directly
   - Remove category-specific constraints when category is unknown

8. **Fix AI Generation Fallback (Lines 3011-3048)**
   - Don't pass category constraints when category is null
   - Allow Maya to generate prompts based on user request directly
   - Use her fashion knowledge, brand expertise, and styling intelligence

9. **Fix Composition System (Lines 2935-2941)**
   - Allow composition system to work without category
   - Use user intent directly when category is null
   - Make category optional parameter

---

### **Phase 3: Make Prompt Constructor Category-Optional**

**File:** `app/api/maya/generate-concepts/route.ts`

10. **Fix Prompt Constructor Logic (Lines 3074-3287)**
    - Allow prompt constructor to work without category
    - When category is null, use user request directly
    - Don't default to 'casual' - use AI generation instead

11. **Fix Prompt Constructor Category Detection (Lines 3096-3287)**
    - Don't force category/vibe/location defaults
    - When category is null, skip prompt constructor and use AI generation
    - Or enhance prompt constructor to work without category

**Files:** `lib/maya/prompt-constructor.ts`, `lib/maya/prompt-constructor-enhanced.ts`

12. **Check if Prompt Constructor Requires Category**
    - Review if these functions can work without category
    - If not, create category-optional versions
    - Or use AI generation when category is unknown

**File:** `lib/maya/prompt-components/composition-builder.ts`

13. **Fix Composition Builder to Handle Null Category**
    - **Current:** Requires `category: string` parameter (line 44)
    - **Issue:** Uses category for component selection (lines 57, 69, 82, 95, 108)
    - **Fix:** Make category optional, use user intent directly when category is null
    - **Impact:** Composition system can work for any user request

---

### **Phase 4: Make Brand Library Category-Optional**

**File:** `app/api/maya/generate-concepts/route.ts`

13. **Fix Brand Library Enhancement (Lines 3498-3598)**
    - Don't require category for brand enhancement
    - Use user request context for brand selection
    - Make category optional - enhance when available, skip when null

**File:** `lib/maya/brand-library-2025.ts`

14. **Check if `generateCompleteOutfit()` Requires Category**
    - Review if it can work without category
    - If not, create category-optional version
    - Or use AI to suggest brands based on user request

---

### **Phase 5: Update Pro Mode to Allow Dynamic Generation**

**File:** `app/api/maya/pro/generate-concepts/route.ts`

15. **Fix Category Detection (Lines 162-178)**
    - Don't require category for concept generation
    - When category is null, use AI to generate dynamic prompts
    - Allow Maya to use her expertise directly

16. **Fix Universal Prompts Retrieval (Lines 170-178)**
    - When category is null, don't use placeholder prompts
    - Use AI to generate dynamic prompts based on user request
    - Integrate with Maya's fashion knowledge

**File:** `lib/maya/pro/category-system.ts`

17. **Update `getCategoryPrompts()` (Lines 173-265)**
    - Handle null/unknown category
    - Return empty array or trigger dynamic generation
    - Don't return placeholder prompts

---

## 🔍 SPECIFIC CODE CHANGES NEEDED

### **Change 1: `detectCategoryFromRequest()` - Remove Default**

**File:** `app/api/maya/generate-concepts/route.ts:106-167`

**Current:**
```typescript
// We have text but no patterns matched - default to casual-lifestyle as last resort
console.warn('[v0] ⚠️ No category pattern matched, defaulting to casual-lifestyle. Combined text:', combined.substring(0, 100))
return 'casual-lifestyle'
```

**New:**
```typescript
// We have text but no patterns matched - return null to allow dynamic generation
console.log('[v0] [CATEGORY-DETECTION] No category pattern matched, allowing dynamic AI generation. Combined text:', combined.substring(0, 100))
return null // or '' or 'dynamic' - signal to use AI generation
```

---

### **Change 2: `detectCategoryForPromptConstructor()` - Remove Default**

**File:** `app/api/maya/generate-concepts/route.ts:356-360**

**Current:**
```typescript
// We have text but no patterns matched - default to casual as last resort
console.warn('[v0] [CATEGORY-DETECTION] ⚠️ No category pattern matched, defaulting to casual. Combined text:', combinedText.substring(0, 100))
category = 'casual'
vibe = 'casual'
location = 'street'
wasDetected = false // Mark as not detected (defaulted)
```

**New:**
```typescript
// We have text but no patterns matched - return null to allow dynamic generation
console.log('[v0] [CATEGORY-DETECTION] No category pattern matched, allowing dynamic AI generation. Combined text:', combinedText.substring(0, 100))
category = null
vibe = null
location = null
wasDetected = false // Mark as not detected
```

---

### **Change 3: Category Detection Logic - Don't Force Default**

**File:** `app/api/maya/generate-concepts/route.ts:2868-2882`

**Current:**
```typescript
// 🔴 FIX: Only default to 'casual-lifestyle' as absolute last resort
if (!detectedCategory || detectedCategory.trim().length === 0) {
  const hasAnyText = enrichedUserRequestForDetection.trim().length > 0
  if (hasAnyText) {
    console.warn("[v0] [AI-GENERATION] ⚠️ No category detected, defaulting to casual-lifestyle as last resort")
    detectedCategory = 'casual-lifestyle'
  }
}
```

**New:**
```typescript
// Allow null category - use AI dynamic generation
if (!detectedCategory || detectedCategory.trim().length === 0) {
  const hasAnyText = enrichedUserRequestForDetection.trim().length > 0
  if (hasAnyText) {
    console.log("[v0] [AI-GENERATION] No category detected, using dynamic AI generation with Maya's expertise")
    detectedCategory = null // or 'dynamic' - signal for AI generation
  }
}
```

---

### **Change 4: Prompt Constructor - Allow Null Category**

**File:** `app/api/maya/generate-concepts/route.ts:3274-3286`

**Current:**
```typescript
// 🔴 FIX: Only default to 'casual' as absolute last resort
if (!category || !vibe || !location) {
  category = category || 'casual'
  vibe = vibe || 'casual'
  location = location || 'street'
  detectedCategoryForMapping = detectedCategoryForMapping || 'casual-lifestyle'
}
```

**New:**
```typescript
// If category is null, skip prompt constructor and use AI generation
if (!category || !vibe || !location) {
  console.log("[v0] [PROMPT-CONSTRUCTOR] Category not detected, skipping prompt constructor and using AI dynamic generation")
  usePromptConstructor = false // Skip prompt constructor, use AI generation
  // Don't set defaults - let AI generation handle it
}
```

---

### **Change 5: Pro Mode Category Detection - Remove Default**

**File:** `lib/maya/pro/category-system.ts:162`

**Current:**
```typescript
// Default to LIFESTYLE if no clear match
return PRO_MODE_CATEGORIES.LIFESTYLE
```

**New:**
```typescript
// Return null if no clear match - allow dynamic generation
console.log('[Category System] No category match found, allowing dynamic AI generation')
return null // or create UNKNOWN category type
```

**Update Return Type:**
```typescript
export function detectCategory(
  userRequest: string,
  imageLibrary: ImageLibrary
): CategoryInfo | null { // Allow null return
  // ... detection logic ...
  // If no match:
  return null
}
```

---

### **Change 6: AI Generation Prompt - Remove Category Constraints**

**File:** `app/api/maya/generate-concepts/route.ts:2650-2765`

**Current:** `conceptPrompt` includes category-specific instructions and brand library constraints

**New:** Make category optional in prompt:
```typescript
const conceptPrompt = `
${detectedCategory ? `**Category Context (Optional Hint):** ${detectedCategory}` : '**No specific category detected - use your full fashion expertise and knowledge**'}

**User Request:** ${userRequest || 'Create concepts'}

${detectedCategory ? `**Category Guidelines:** Use ${detectedCategory} as inspiration if relevant, but the user's request is PRIMARY. Don't limit yourself if user request suggests something different.` : '**Your Expertise:** Use your complete fashion knowledge, brand expertise, styling intelligence, and aesthetic understanding to create the perfect prompts based on the user\'s request.'}

${(() => {
  // Only include brand library if category is detected
  if (detectedCategory && mappedCategory) {
    const outfit = generateCompleteOutfit(mappedCategory, userRequest || aesthetic || '')
    // ... build brand guidance
  } else {
    return '**Brand Selection:** Use your fashion knowledge to suggest appropriate brands based on the user\'s request and aesthetic. Use specific brand names when relevant (Alo Yoga, Lululemon, CHANEL, etc.) but don\'t force brands if they don\'t fit the aesthetic.'
  }
})()}

**CRITICAL:** The user's request is the PRIMARY guide. ${detectedCategory ? 'Category is a helpful hint, not a constraint.' : 'Use your full creative expertise to match exactly what the user wants.'}
...
`
```

---

### **Change 7: Composition System - Make Category Optional**

**File:** `app/api/maya/generate-concepts/route.ts:2935-2941`

**Current:**
```typescript
const composed = compositionBuilder.composePrompt({
  category: detectedCategory, // Required
  userIntent: userRequest || context || aesthetic || '',
  brand: detectedBrandValue,
  count: composedConcepts.length,
  previousConcepts: composedComponents,
})
```

**New:**
```typescript
// Skip composition system if category is null - use AI generation instead
if (detectedCategory) {
  const composed = compositionBuilder.composePrompt({
    category: detectedCategory,
    userIntent: userRequest || context || aesthetic || '',
    brand: detectedBrandValue,
    count: composedConcepts.length,
    previousConcepts: composedComponents,
  })
  // ... use composed
} else {
  // Use AI generation directly when category is unknown
  console.log('[v0] [COMPOSITION] Category unknown, using AI dynamic generation')
  // Skip composition, go directly to AI generation
}
```

**OR Update Composition Builder:**

**File:** `lib/maya/prompt-components/composition-builder.ts:43-49`

**Current:**
```typescript
composePrompt(params: {
  category: string // Required
  userIntent: string
  brand?: string
  count?: number
  previousConcepts?: ConceptComponents[]
}): ComposedPrompt
```

**New:**
```typescript
composePrompt(params: {
  category: string | null // Optional
  userIntent: string
  brand?: string
  count?: number
  previousConcepts?: ConceptComponents[]
}): ComposedPrompt {
  // Use userIntent directly when category is null
  const category = params.category || this.inferCategoryFromIntent(params.userIntent)
  // ... rest of logic
}
```

---

## 🎯 IMPLEMENTATION PRIORITY

### **🔴 HIGH PRIORITY (Blocks Core Functionality)**

1. **Remove Category Defaults** (Phase 1)
   - Fix `detectCategoryFromRequest()` - return null instead of 'casual-lifestyle'
   - Fix `detectCategoryForPromptConstructor()` - return null instead of 'casual'
   - Fix `detectCategory()` in Pro Mode - return null instead of LIFESTYLE
   - **Impact:** Allows Maya to use her expertise when categories don't match

2. **Make AI Generation Category-Optional** (Phase 2)
   - Update `conceptPrompt` to not require category
   - Remove category constraints from AI generation
   - Allow Maya to generate prompts based on user request directly
   - **Impact:** Enables dynamic prompt generation for any user request

### **🟡 MEDIUM PRIORITY (Improves Functionality)**

3. **Make Prompt Constructor Category-Optional** (Phase 3)
   - Allow prompt constructor to work without category
   - Use AI generation when category is null
   - **Impact:** Better prompts for non-standard requests

4. **Make Brand Library Category-Optional** (Phase 4)
   - Allow brand selection based on user request
   - Don't require category for brand enhancement
   - **Impact:** Better brand matching for unique requests

### **🟢 LOW PRIORITY (Nice to Have)**

5. **Update Pro Mode Dynamic Generation** (Phase 5)
   - Integrate AI generation when category is null
   - Use Maya's expertise for Pro Mode too
   - **Impact:** Pro Mode works for any request type

---

## 📝 TESTING SCENARIOS

After fixes, test these scenarios:

1. **"pinterest influencer aesthetic dreamy curated feminine"**
   - Should: Generate dynamic prompts using Maya's expertise
   - Should NOT: Default to casual-lifestyle

2. **"minimalist scandinavian style with neutral tones"**
   - Should: Generate prompts matching the aesthetic
   - Should NOT: Default to casual

3. **"editorial fashion shoot with dramatic lighting"**
   - Should: Generate fashion/editorial prompts
   - Should NOT: Default to casual-lifestyle

4. **"cozy winter morning with coffee and books"**
   - Should: Match cozy category OR generate dynamic prompts
   - Should NOT: Force casual if cozy doesn't match exactly

5. **"something that feels like a Vogue editorial"**
   - Should: Generate luxury/editorial prompts
   - Should NOT: Default to casual-lifestyle

---

## 🔗 RELATED FILES TO REVIEW

### **Category Detection Files:**
- `app/api/maya/generate-concepts/route.ts` - Main category detection
- `lib/maya/pro/category-system.ts` - Pro Mode category detection
- `lib/maya/prompt-constructor-integration.ts` - Prompt constructor category detection
- `lib/maya/prompt-templates/high-end-brands/category-mapper.ts` - Brand category detection

### **Prompt Generation Files:**
- `app/api/maya/generate-concepts/route.ts` - Main prompt generation
- `app/api/maya/pro/generate-concepts/route.ts` - Pro Mode prompt generation
- `lib/maya/prompt-constructor.ts` - Prompt constructor
- `lib/maya/prompt-constructor-enhanced.ts` - Enhanced prompt constructor
- `lib/maya/brand-library-2025.ts` - Brand library
- `lib/maya/pro/prompt-builder.ts` - Pro Mode prompt builder

### **AI Generation Files:**
- `app/api/maya/generate-concepts/route.ts:3011-3048` - AI fallback
- `app/api/maya/chat/route.ts` - Maya chat (uses AI)
- `app/api/maya/pro/chat/route.ts` - Pro Mode chat (uses AI)

---

## ✅ SUCCESS CRITERIA

After fixes:

1. ✅ **No More Defaults:** System never defaults to 'casual-lifestyle' or 'casual' when category doesn't match
2. ✅ **Dynamic Generation Works:** Maya can generate prompts for any user request using her expertise
3. ✅ **Category as Enhancement:** Category is used to enhance prompts when detected, but doesn't constrain when unknown
4. ✅ **User Request Priority:** User's actual request always takes priority over category defaults
5. ✅ **AI Knowledge Unlocked:** Maya can use her full fashion knowledge, brand expertise, and styling intelligence
6. ✅ **No More Warnings:** No more "defaulting to casual-lifestyle" warnings in logs

---

---

## 📊 QUICK REFERENCE: KEY FINDINGS

### **The Core Issue:**
Category detection defaults to 'casual-lifestyle' or 'casual' when patterns don't match, which then constrains ALL prompt generation (composition system, prompt constructor, brand library, AI generation).

### **The Fix:**
Make category detection **optional** - return `null` when no match, and allow Maya to use her full AI expertise for dynamic prompt generation.

### **Files to Fix (Priority Order):**

1. **`app/api/maya/generate-concepts/route.ts`** (CRITICAL)
   - Remove defaults in `detectCategoryFromRequest()` (line 165-166)
   - Remove defaults in `detectCategoryForPromptConstructor()` (line 356-360)
   - Don't force category in detection logic (lines 2808-2882)
   - Make category optional in prompt constructor (lines 3096-3287)
   - Remove category constraints from AI generation (lines 2650-2765, 3011-3048)

2. **`lib/maya/pro/category-system.ts`** (CRITICAL)
   - Remove default to LIFESTYLE (line 162)
   - Allow null return type

3. **`lib/maya/prompt-constructor-integration.ts`** (HIGH)
   - Remove default to 'casual' (line 91-95)

4. **`lib/maya/prompt-components/composition-builder.ts`** (MEDIUM)
   - Make category optional parameter
   - Use user intent when category is null

5. **`lib/maya/brand-library-2025.ts`** (MEDIUM)
   - Handle null category
   - Use user request context for brand selection

6. **`app/api/maya/pro/generate-concepts/route.ts`** (MEDIUM)
   - Allow dynamic generation when category is null
   - Use AI instead of placeholder prompts

### **Testing Checklist:**
- [ ] "pinterest influencer aesthetic" → Dynamic prompts (not casual-lifestyle)
- [ ] "minimalist scandinavian style" → Dynamic prompts (not casual)
- [ ] "editorial fashion shoot" → Dynamic prompts (not casual-lifestyle)
- [ ] "cozy winter morning" → Cozy prompts OR dynamic (not forced casual)
- [ ] "Vogue editorial style" → Luxury/editorial prompts (not casual-lifestyle)
- [ ] No more "defaulting to casual-lifestyle" warnings in logs

---

**Last Updated:** 2025-12-20  
**Total Issues Found:** 6 critical problems  
**Files Requiring Changes:** 8+ files  
**Estimated Complexity:** High (touches core prompt generation logic)  
**Priority:** 🔴 CRITICAL - Blocks Maya's core functionality

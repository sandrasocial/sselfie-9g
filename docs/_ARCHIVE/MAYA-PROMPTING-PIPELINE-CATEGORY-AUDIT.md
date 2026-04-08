# MAYA PROMPTING PIPELINE: CATEGORY SYSTEM AUDIT
## Complete Analysis of Category Detection Breaking Dynamic Prompt Generation

**Created:** 2025-12-20  
**Status:** 🔴 CRITICAL ISSUE IDENTIFIED

---

## 📋 EXECUTIVE SUMMARY

**Problem:** Category detection system is blocking Maya's ability to generate dynamic prompts based on user requests. When category detection fails to match patterns (e.g., "pinterest influencer aesthetic dreamy curated feminine"), it defaults to "casual-lifestyle", which then restricts prompt generation and prevents Maya from using her full fashion knowledge and expertise.

**Impact:** 
- Both Classic and Pro Mode affected
- Maya responds with generic "yes!" instead of generating creative prompts
- User requests like "pinterest influencer aesthetic" don't trigger proper prompt generation
- Category system acts as a gatekeeper instead of an enhancer

**Root Cause:** Category detection is too rigid and acts as a required step before prompt generation, rather than an optional enhancement. When it fails, the system defaults to generic categories that don't leverage Maya's fashion intelligence.

---

## 🔴 CRITICAL FILES IDENTIFIED

### **1. Category Detection Functions**

#### **File: `app/api/maya/generate-concepts/route.ts`**

**Function: `detectCategoryForPromptConstructor()` (Lines 235-364)**
- **Problem:** Hardcoded pattern matching that defaults to "casual" when no patterns match
- **Location:** Lines 235-364
- **Issue:** 
  - Only matches specific keywords (workout, coffee, street-style, luxury, travel, cozy, christmas)
  - When user says "pinterest influencer aesthetic dreamy curated feminine", none of these patterns match
  - Defaults to `{ category: 'casual', vibe: 'casual', location: 'street', wasDetected: false }`
  - This default then restricts prompt generation
- **Evidence:** Console warning: `⚠️ No category pattern matched, defaulting to casual`

**Function: `detectCategoryFromRequest()` (Lines 106-170)**
- **Problem:** Similar pattern matching that defaults to "casual-lifestyle"
- **Location:** Lines 106-170
- **Issue:**
  - Returns empty string or "casual-lifestyle" when patterns don't match
  - Used as fallback when `detectCategoryForPromptConstructor` fails
  - Line 165: `console.warn('[v0] ⚠️ No category pattern matched, defaulting to casual-lifestyle')`

**Function: `mapCategoryForBrandLibrary()` (Lines 175-229)**
- **Problem:** Maps categories to brand library, but returns null for unmapped categories
- **Location:** Lines 175-229
- **Issue:** When category doesn't map, brand library isn't used, limiting outfit generation

#### **File: `lib/maya/pro/category-system.ts`**

**Function: `detectCategory()` (Lines 95-165)**
- **Problem:** Pro Mode specific category detection that only recognizes 6 categories
- **Location:** Lines 95-165
- **Issue:**
  - Only detects: WELLNESS, LUXURY, LIFESTYLE, FASHION, TRAVEL, BEAUTY
  - Uses keyword matching that doesn't catch aesthetic descriptions like "pinterest influencer aesthetic"
  - Defaults to LIFESTYLE when no match found
  - This is used in Pro Mode chat and concept generation

**Function: `getCategoryPrompts()` (Lines 173-265)**
- **Problem:** Returns placeholder prompts instead of using Maya's dynamic knowledge
- **Location:** Lines 173-265
- **Issue:**
  - TODO comments indicate it should integrate with Universal Prompts system
  - Currently returns hardcoded placeholder prompts
  - Doesn't leverage Maya's fashion intelligence

### **2. Prompt Generation Functions**

#### **File: `app/api/maya/generate-concepts/route.ts`**

**Function: `generatePromptWithBrandLibrary()` (Lines 589-645)**
- **Problem:** Requires category detection before generating prompt
- **Location:** Lines 589-645
- **Issue:**
  - Line 603: Calls `detectCategoryForPromptConstructor()` first
  - If category detection fails, still uses default "casual" category
  - This restricts what the prompt constructor can generate
  - Doesn't allow Maya to use her full fashion knowledge when category is unknown

**Function: Prompt Constructor Integration (Lines 3100-3500)**
- **Problem:** Complex logic that prioritizes category detection over user intent
- **Location:** Lines 3100-3500 (approximate)
- **Issue:**
  - Multiple fallback chains that all default to "casual-lifestyle"
  - Category detection is checked before allowing Maya to use her expertise
  - When `wasDetected: false`, system still uses default category instead of allowing dynamic generation

#### **File: `lib/maya/prompt-constructor.ts`**

**Function: `buildPrompt()` / `buildPromptWithFeatures()`**
- **Problem:** Requires category, vibe, location parameters
- **Location:** Throughout file
- **Issue:**
  - Hardcoded category-specific logic (CAMERA_SPECS, AESTHETIC_REFERENCES, LIGHTING_OPTIONS, etc.)
  - If category is "casual" (default), it uses casual-specific prompts
  - Doesn't have a "dynamic" mode that uses Maya's fashion knowledge when category is unknown

#### **File: `lib/maya/prompt-constructor-enhanced.ts`**

**Function: `buildEnhancedPrompt()`**
- **Problem:** Similar to above, requires category parameters
- **Location:** Throughout file
- **Issue:**
  - Uses category-specific pose descriptions, lighting, environments
  - No fallback to dynamic generation when category is unknown

### **3. Fashion Knowledge Integration**

#### **File: `lib/maya/fashion-knowledge-2025.ts`**

**Function: `getFashionIntelligencePrinciples()` (Lines 285-488)**
- **Status:** ✅ EXISTS - Contains Maya's full fashion knowledge
- **Location:** Lines 285-488
- **Content:**
  - Scandinavian/Nordic aesthetic focus
  - Dynamic expertise in ALL Instagram aesthetics
  - Component understanding (blazers, tops, bottoms)
  - Seasonal instinct
  - Brand knowledge
- **Problem:** This knowledge is available but may not be fully utilized when category detection fails

**Usage in `app/api/maya/generate-concepts/route.ts`:**
- Line 6: Imported
- Line 869: Used when `studioProMode === false`
- Line 1728: Included in system prompt for AI generation
- **Issue:** May not be effectively used when category defaults to "casual-lifestyle"

#### **File: `lib/maya/personality.ts`**

**Content: `MAYA_SYSTEM_PROMPT` (Lines 7-433)**
- **Status:** ✅ EXISTS - Contains Maya's personality and expertise
- **Location:** Lines 7-433
- **Content:**
  - Full creativity in prompts (line 21-24)
  - Fashion knowledge and visual storytelling expertise (lines 187-191)
  - Dynamic adaptation rules (lines 173-183)
  - Real-time fashion research capabilities (lines 203-219)
- **Problem:** Personality says Maya should use full creativity, but category system restricts this

### **4. AI Generation Path**

#### **File: `app/api/maya/generate-concepts/route.ts`**

**AI Generation Section (Lines 2800-3500)**
- **Problem:** Category detection happens before AI generation, and defaults restrict AI
- **Location:** Lines 2800-3500 (approximate)
- **Issue:**
  - Line 2889: Checks if defaulting to "casual-lifestyle" and warns
  - Line 3161: Calls `detectCategoryForPromptConstructor()` before AI generation
  - Line 3178: Checks `wasDetected` flag but still uses default category
  - When category not detected, system should allow AI to generate dynamically, but it doesn't

**System Prompt Construction (Lines 1700-1800)**
- **Problem:** Category information may be restricting AI's creativity
- **Location:** Lines 1700-1800 (approximate)
- **Issue:**
  - Fashion intelligence is included (line 1728)
  - But category defaults may be overriding this
  - Need to verify if category is being used to restrict AI generation

---

## 🔍 DETAILED ANALYSIS

### **Problem Flow (When Category Detection Fails)**

1. **User Request:** "pinterest influencer aesthetic dreamy curated feminine"
2. **Category Detection:** `detectCategoryForPromptConstructor()` is called
3. **Pattern Matching:** None of the hardcoded patterns match:
   - ❌ workout|gym|fitness
   - ❌ coffee|casual|errands
   - ❌ street style|fashion|urban
   - ❌ luxury|chic|elegant
   - ❌ travel|airport
   - ❌ cozy|home
   - ❌ christmas|holiday
4. **Default:** Returns `{ category: 'casual', vibe: 'casual', location: 'street', wasDetected: false }`
5. **Console Warning:** `⚠️ No category pattern matched, defaulting to casual`
6. **Prompt Generation:** Uses "casual" category, which restricts:
   - Camera specs: `Fujifilm X-T5 35mm f/2 lens` (casual-specific)
   - Aesthetic: `casual lifestyle street photography aesthetic` (casual-specific)
   - Lighting: `soft afternoon sunlight` (casual-specific)
   - Environment: `cobblestone sidewalk in Brooklyn` (casual-specific)
7. **Result:** Generic "casual" prompts instead of dynamic "pinterest influencer aesthetic" prompts

### **What Should Happen Instead**

1. **User Request:** "pinterest influencer aesthetic dreamy curated feminine"
2. **Category Detection:** Attempts to detect, but recognizes it's an aesthetic description, not a category
3. **Fallback to Dynamic Generation:** 
   - Uses Maya's fashion knowledge (`fashion-knowledge-2025.ts`)
   - Uses Maya's personality (full creativity allowed)
   - Uses AI generation with full context
   - Generates prompts based on user's exact words and Maya's expertise
4. **Result:** Dynamic, creative prompts that match "pinterest influencer aesthetic dreamy curated feminine"

---

## 📁 FILES THAT NEED CHANGES

### **🔴 HIGH PRIORITY (Blocks Dynamic Generation)**

1. **`app/api/maya/generate-concepts/route.ts`**
   - **Lines 235-364:** `detectCategoryForPromptConstructor()` - Make category optional, not required
   - **Lines 589-645:** `generatePromptWithBrandLibrary()` - Allow dynamic generation when category unknown
   - **Lines 3100-3500:** Prompt constructor integration - Don't require category, use as enhancement only
   - **Lines 2800-2900:** AI generation path - Don't restrict AI when category not detected

2. **`lib/maya/prompt-constructor.ts`**
   - **Lines 1-792:** Add "dynamic" mode that doesn't require category
   - Allow category to be optional/null
   - Use Maya's fashion knowledge when category is unknown
   - Make category-specific logic optional enhancements, not requirements

3. **`lib/maya/prompt-constructor-enhanced.ts`**
   - **Lines 1-424:** Similar to above - make category optional
   - Add dynamic generation path when category unknown

4. **`lib/maya/pro/category-system.ts`**
   - **Lines 95-165:** `detectCategory()` - Return null or "unknown" instead of defaulting to LIFESTYLE
   - **Lines 173-265:** `getCategoryPrompts()` - Allow dynamic generation when category unknown

### **🟡 MEDIUM PRIORITY (Enhancements)**

5. **`app/api/maya/pro/generate-concepts/route.ts`**
   - **Lines 77-164:** Uses `detectCategory()` from category-system.ts
   - Should allow dynamic generation when category detection fails

6. **`app/api/maya/pro/chat/route.ts`**
   - **Lines 76-93:** Uses `detectCategory()` for context
   - Should not restrict Maya's responses when category unknown

7. **`lib/maya/pro/prompt-builder.ts`**
   - **Lines 1-81:** May need to handle unknown categories
   - Should use Maya's fashion knowledge when category is unknown

### **🟢 LOW PRIORITY (Supporting Files)**

8. **`lib/maya/flux-prompt-builder.ts`**
   - May need updates if it relies on category detection

9. **`lib/maya/nano-banana-prompt-builder.ts`**
   - May need updates for Pro Mode

10. **`app/api/maya/chat/route.ts`**
    - May need to ensure category detection doesn't restrict chat responses

---

## 🎯 RECOMMENDED FIXES

### **Fix 1: Make Category Detection Optional, Not Required**

**Current Flow:**
```
User Request → Category Detection (REQUIRED) → Prompt Generation
                ↓ (if fails)
              Default to "casual" → Restricted Prompt Generation
```

**New Flow:**
```
User Request → Category Detection (OPTIONAL) → Prompt Generation
                ↓ (if fails)
              Use Maya's Fashion Knowledge → Dynamic Prompt Generation
```

**Changes Needed:**
1. Modify `detectCategoryForPromptConstructor()` to return `null` or `{ category: null, wasDetected: false }` instead of defaulting
2. Modify prompt generation functions to accept `category: string | null`
3. When category is null, use Maya's fashion knowledge and AI generation instead of category-specific templates

### **Fix 2: Enhance Category Detection with Aesthetic Recognition**

**Current:** Only matches specific keywords (workout, coffee, luxury, etc.)

**New:** Also recognize aesthetic descriptions:
- "pinterest influencer aesthetic" → Don't force a category, allow dynamic generation
- "dreamy curated feminine" → Aesthetic description, not a category
- "scandinavian minimalism" → Could map to category OR use as aesthetic

**Changes Needed:**
1. Add aesthetic pattern recognition to category detection
2. Return special flag: `{ isAestheticDescription: true }` when aesthetic detected
3. Use aesthetic descriptions directly in prompt generation instead of forcing category

### **Fix 3: Use Maya's Fashion Knowledge as Primary Source**

**Current:** Category → Category-specific templates → Prompt

**New:** User Request → Maya's Fashion Knowledge → Dynamic Prompt (Category as enhancement only)

**Changes Needed:**
1. Prioritize `getFashionIntelligencePrinciples()` over category-specific logic
2. Use category information to enhance prompts, not restrict them
3. Allow Maya's AI to generate prompts dynamically when category is unknown

### **Fix 4: Remove Hard Defaults**

**Current:** Multiple places default to "casual-lifestyle" or "casual"

**New:** Return null/unknown and handle gracefully

**Changes Needed:**
1. Remove all `defaulting to casual-lifestyle` logic
2. Return `null` or `unknown` when category can't be detected
3. Handle null/unknown categories by using dynamic generation

---

## 🔧 SPECIFIC CODE CHANGES NEEDED

### **Change 1: `detectCategoryForPromptConstructor()` - Make Default Optional**

**Current (Lines 356-360):**
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
console.log('[v0] [CATEGORY-DETECTION] No category pattern matched, allowing dynamic generation. Combined text:', combinedText.substring(0, 100))
return { category: null, vibe: null, location: null, wasDetected: false, isAestheticDescription: true }
```

### **Change 2: `generatePromptWithBrandLibrary()` - Handle Null Category**

**Current (Lines 600-603):**
```typescript
const { category, vibe, location } = categoryOverride && vibeOverride && locationOverride
  ? { category: categoryOverride, vibe: vibeOverride, location: locationOverride }
  : detectCategoryForPromptConstructor(userRequest, aesthetic, context)
```

**New:**
```typescript
const detected = categoryOverride && vibeOverride && locationOverride
  ? { category: categoryOverride, vibe: vibeOverride, location: locationOverride, wasDetected: true }
  : detectCategoryForPromptConstructor(userRequest, aesthetic, context)

// If category not detected, use dynamic generation instead of defaults
if (!detected.wasDetected && !detected.category) {
  // Use Maya's fashion knowledge and AI generation
  return generateDynamicPrompt(userRequest, aesthetic, context, userGender, physicalPreferences, triggerWord)
}
```

### **Change 3: Prompt Constructor - Make Category Optional**

**Current:** `buildPromptWithFeatures()` requires category

**New:** Make category optional, use dynamic generation when null:
```typescript
export function buildPromptWithFeatures(params: PromptConstructorParams & { category?: string | null }): string {
  // If no category, use dynamic generation based on user request and fashion knowledge
  if (!params.category) {
    return buildDynamicPrompt(params)
  }
  // Otherwise use category-specific logic
  // ...
}
```

### **Change 4: AI Generation Path - Don't Restrict on Category Failure**

**Current (Lines 3177-3186):**
```typescript
categoryWasDetected = detected.wasDetected

if (categoryWasDetected) {
  // Use detected category
} else {
  // Try fallbacks, but still defaults to casual-lifestyle
}
```

**New:**
```typescript
categoryWasDetected = detected.wasDetected

if (categoryWasDetected) {
  // Use detected category as enhancement
} else {
  // No category detected - use Maya's full fashion knowledge and AI generation
  // Don't restrict, allow full creativity
  return generateWithMayaFashionKnowledge(userRequest, aesthetic, context, ...)
}
```

---

## 📊 IMPACT ASSESSMENT

### **Files That Will Need Updates:**

1. **`app/api/maya/generate-concepts/route.ts`** - Major changes needed
   - Remove category defaults
   - Add dynamic generation path
   - Make category optional in prompt generation

2. **`lib/maya/prompt-constructor.ts`** - Major changes needed
   - Add null category handling
   - Add dynamic prompt generation function
   - Make category-specific logic optional

3. **`lib/maya/prompt-constructor-enhanced.ts`** - Major changes needed
   - Similar to above

4. **`lib/maya/pro/category-system.ts`** - Medium changes needed
   - Return null instead of defaulting
   - Add aesthetic description detection

5. **`app/api/maya/pro/generate-concepts/route.ts`** - Medium changes needed
   - Handle null categories
   - Use dynamic generation

6. **`app/api/maya/pro/chat/route.ts`** - Minor changes needed
   - Don't restrict responses when category unknown

7. **`lib/maya/pro/prompt-builder.ts`** - Minor changes needed
   - Handle unknown categories

### **Files That Should NOT Be Changed:**

- `lib/maya/fashion-knowledge-2025.ts` - ✅ Already contains Maya's knowledge
- `lib/maya/personality.ts` - ✅ Already allows full creativity
- `lib/maya/personality-enhanced.ts` - ✅ Already allows full creativity
- `lib/maya/flux-prompt-builder.ts` - May need minor updates but not core issue

---

## 🎯 IMPLEMENTATION STRATEGY

### **Phase 1: Make Category Optional (Critical)**
1. Modify `detectCategoryForPromptConstructor()` to return null instead of defaulting
2. Modify `detectCategoryFromRequest()` to return null instead of defaulting
3. Modify `detectCategory()` in `category-system.ts` to return null instead of defaulting
4. Update all callers to handle null categories

### **Phase 2: Add Dynamic Generation Path (Critical)**
1. Create `generateDynamicPrompt()` function that uses Maya's fashion knowledge
2. Integrate with AI generation when category is null
3. Ensure fashion intelligence is fully utilized

### **Phase 3: Update Prompt Constructors (High Priority)**
1. Make category optional in `buildPromptWithFeatures()`
2. Add dynamic mode to prompt constructors
3. Use category as enhancement, not requirement

### **Phase 4: Test and Verify (High Priority)**
1. Test with requests that don't match categories
2. Verify Maya uses full fashion knowledge
3. Ensure prompts are dynamic and creative

---

## 🔍 ROOT CAUSE SUMMARY

**The category system was designed as a gatekeeper, but it should be an enhancer.**

**Current Architecture:**
- Category Detection (REQUIRED) → Category-Specific Templates → Prompt
- If category detection fails → Default category → Generic prompts
- Maya's fashion knowledge is available but not fully utilized when category is unknown

**Desired Architecture:**
- User Request → Maya's Fashion Knowledge + AI Generation → Dynamic Prompt
- Category Detection (OPTIONAL) → Enhances prompt if detected
- If category detection fails → Use Maya's full expertise → Still generates amazing prompts

**Key Principle:** Category should enhance prompts, not restrict them. Maya should always be able to use her full fashion knowledge and expertise, regardless of whether a category is detected.

---

## 📝 NOTES

### **Why This Happened:**
- Category system was added to improve prompt quality for specific scenarios
- But it became a required step instead of an optional enhancement
- Defaults were added to prevent errors, but they restrict creativity
- Maya's personality says "full creativity" but category system contradicts this

### **What Needs to Change:**
- Category detection should be a helpful hint, not a requirement
- When category is unknown, Maya should use her full expertise
- Defaults should be removed - null/unknown is better than wrong category
- Fashion knowledge should be primary source, category should enhance it

---

**Last Updated:** 2025-12-20  
**Total Files Identified:** 10  
**Critical Files:** 4  
**Priority:** 🔴 HIGHEST - Blocks core functionality






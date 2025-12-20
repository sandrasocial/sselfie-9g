# Pro Mode Image Linking & Category Defaulting Audit

**Date:** 2025-01-20  
**Issues Reported:**
1. Only one image is linked to concept cards (despite 4 images in library)
2. All concept cards defaulting to "LIFESTYLE" category
3. Need to audit: Database, Prompting pipeline, Context, Everything not imported correctly

---

## 🔍 ROOT CAUSE ANALYSIS

### Issue 1: Only One Image Linked Per Concept

#### Problem Location:
- **Frontend Hook:** `components/sselfie/pro-mode/hooks/useConceptGeneration.ts` (lines 50-96)
- **API Route:** `app/api/maya/pro/generate-concepts/route.ts` (lines 25-234)

#### Root Causes:

1. **Frontend Hook Has Simple Linking Logic:**
   - `linkImagesToConcept` in `useConceptGeneration.ts` only links:
     - 1 selfie (always)
     - 1 product (if mentioned)
     - 1 person (if lifestyle)
     - 1 vibe (if aesthetic match)
   - **Maximum: 2-3 images, but often only 1-2**

2. **API Route Has Better Logic BUT:**
   - The hook calls `getCategoryPrompts()` first (line 173), which returns **placeholder prompts**
   - These placeholders are then sent to the API (line 209-214) as "concepts" parameter
   - The API tries to enhance them, but the hook's local `linkImagesToConcept` is simpler
   - **The API's sophisticated `linkImagesToConcept` (lines 25-234) is NOT being used by the hook**

3. **Category Detection Defaults to LIFESTYLE:**
   - `detectCategory()` in `category-system.ts` (line 168) defaults to `PRO_MODE_CATEGORIES.LIFESTYLE` if no match
   - This means if user request doesn't match keywords, it always returns LIFESTYLE
   - The AI prompt in the API (line 416) says `"category": "string - detected category or 'Lifestyle'"` which reinforces the default

4. **API Response Handling:**
   - Hook merges API response (line 222-234), but preserves local `linkedImages` if they exist
   - This means the API's better image linking might be ignored

---

### Issue 2: All Concepts Defaulting to LIFESTYLE

#### Problem Location:
- **Category Detection:** `lib/maya/pro/category-system.ts` (lines 95-169)
- **AI Prompt:** `app/api/maya/pro/generate-concepts/route.ts` (lines 390-424)
- **Default Fallback:** Line 168 in `category-system.ts`

#### Root Causes:

1. **Category Detection Too Restrictive:**
   - `detectCategory()` only matches:
     - Brand names in products (line 109-118)
     - Specific keywords (line 121-146)
   - If user says something like "Pinterest influencer style" or "editorial", it doesn't match any category
   - **Always defaults to LIFESTYLE** (line 168)

2. **AI Prompt Reinforces Default:**
   - Line 416 in API: `"category": "string - detected category or 'Lifestyle'"`
   - This tells the AI to default to "Lifestyle" if unsure
   - The AI sees this instruction and follows it

3. **Category Context Not Passed Correctly:**
   - If `categoryKey` is null, API returns early (line 360-371) with `useAIGeneration: true`
   - But the hook might not handle this properly
   - The AI generation still happens, but category is null, so AI defaults to LIFESTYLE

4. **User Request Not Analyzed for Category:**
   - The AI prompt (line 390-424) includes `userRequest`, but the category detection happens BEFORE AI generation
   - If detection fails, category is null, and AI is told to use "Lifestyle" as default

---

## 🔧 SPECIFIC CODE ISSUES

### 1. `useConceptGeneration.ts` - Simple Image Linking

**File:** `components/sselfie/pro-mode/hooks/useConceptGeneration.ts`  
**Lines:** 50-96

**Problem:**
```typescript
function linkImagesToConcept(...): string[] {
  const linkedImages: string[] = []
  
  // Always include at least one selfie (required)
  if (imageLibrary.selfies.length > 0) {
    linkedImages.push(imageLibrary.selfies[0])  // Only 1 selfie
  }
  
  // Link products if concept mentions brands or products
  if (hasBrandReferences || mentionsProducts) {
    if (imageLibrary.products.length > 0) {
      linkedImages.push(imageLibrary.products[0])  // Only 1 product
    }
  }
  
  // ... similar for people and vibes - only 1 each
  
  return [...new Set(linkedImages)]  // Max 2-3 images
}
```

**Fix Needed:**
- Use the API's sophisticated `linkImagesToConcept` function instead
- Or enhance this function to match the API's logic (3-5 images, intelligent selection)

---

### 2. `category-system.ts` - Always Defaults to LIFESTYLE

**File:** `lib/maya/pro/category-system.ts`  
**Lines:** 95-169

**Problem:**
```typescript
export function detectCategory(...): CategoryInfo | null {
  // ... detection logic ...
  
  // Default to LIFESTYLE if no clear match
  return PRO_MODE_CATEGORIES.LIFESTYLE  // ⚠️ Always returns LIFESTYLE
}
```

**Issues:**
- If user request is "Pinterest influencer style" → no keyword match → returns LIFESTYLE
- If user request is "editorial fashion" → might match FASHION, but if not → returns LIFESTYLE
- No way to return null and let AI decide

**Fix Needed:**
- Return `null` if no clear match (let AI decide based on user request)
- Or improve keyword matching to catch more patterns

---

### 3. API Route - Category Detection Before AI

**File:** `app/api/maya/pro/generate-concepts/route.ts`  
**Lines:** 306-371

**Problem:**
```typescript
// Detect category if not provided
let categoryKey: string | null = (category && typeof category === 'string') ? category : null

if (!categoryKey) {
  categoryInfo = detectCategory(userRequest, library)
  if (categoryInfo && categoryInfo.key) {
    categoryKey = categoryInfo.key
  } else {
    categoryKey = null  // ⚠️ But then returns early with useAIGeneration: true
  }
}

// If no category, return early
if (!categoryKey) {
  return NextResponse.json({
    concepts: [],
    useAIGeneration: true,  // ⚠️ Hook might not handle this
    ...
  })
}
```

**Issues:**
- If category detection fails, API returns early
- Hook might not handle `useAIGeneration: true` flag
- AI generation should happen in API, not hook

**Fix Needed:**
- Don't return early - proceed with AI generation even if category is null
- Let AI determine category from user request

---

### 4. AI Prompt - Reinforces LIFESTYLE Default

**File:** `app/api/maya/pro/generate-concepts/route.ts`  
**Lines:** 390-424

**Problem:**
```typescript
const aiPrompt = `...
"category": "string - detected category or 'Lifestyle'",  // ⚠️ Tells AI to default to Lifestyle
...`
```

**Issues:**
- AI is explicitly told to use "Lifestyle" as fallback
- Should let AI determine category from user request

**Fix Needed:**
- Remove "or 'Lifestyle'" instruction
- Tell AI to determine category from user request

---

### 5. Hook Merges API Response But Preserves Local Images

**File:** `components/sselfie/pro-mode/hooks/useConceptGeneration.ts`  
**Lines:** 222-234

**Problem:**
```typescript
const enhancedConcepts = generatedConcepts.map((concept, index) => {
  const apiConcept = apiData.concepts[index]
  if (apiConcept) {
    return {
      ...concept,
      ...apiConcept,
      // Preserve our generated fullPrompt and linkedImages
      fullPrompt: concept.fullPrompt || apiConcept.fullPrompt,
      linkedImages: concept.linkedImages || apiConcept.linkedImages,  // ⚠️ Uses local if exists
    }
  }
  return concept
})
```

**Issues:**
- If local `linkedImages` exists (even if only 1 image), it's preserved
- API's better `linkedImages` (3-5 images) is ignored

**Fix Needed:**
- Prefer API's `linkedImages` over local
- Or don't generate local concepts at all - let API do it

---

## 📊 DATA FLOW ANALYSIS

### Current Flow (BROKEN):

1. **User Request** → `ProModeChat.tsx` → `useConceptGeneration.generateConcepts()`
2. **Hook Calls** → `detectCategory()` → Returns LIFESTYLE (default)
3. **Hook Calls** → `getCategoryPrompts(LIFESTYLE)` → Returns 3 placeholder prompts
4. **Hook Generates** → Local concepts with simple image linking (1-2 images)
5. **Hook Calls API** → `/api/maya/pro/generate-concepts` with placeholders
6. **API Detects Category** → Returns LIFESTYLE again (or null)
7. **API Generates AI Concepts** → But category is LIFESTYLE, so all concepts are LIFESTYLE
8. **API Links Images** → Uses sophisticated logic (3-5 images)
9. **Hook Merges** → But preserves local `linkedImages` (only 1-2 images)
10. **Result** → Concepts show LIFESTYLE category and only 1 image

### Expected Flow (FIXED):

1. **User Request** → `ProModeChat.tsx` → `useConceptGeneration.generateConcepts()`
2. **Hook Calls API** → `/api/maya/pro/generate-concepts` directly (no local generation)
3. **API Analyzes** → User request for category hints (but doesn't require exact match)
4. **API Generates AI Concepts** → AI determines category from user request
5. **API Links Images** → Uses sophisticated logic (3-5 images per concept)
6. **API Returns** → Concepts with correct category and multiple images
7. **Hook Uses** → API response directly (no merging)

---

## 🎯 FIXES NEEDED

### Priority 1: Fix Image Linking

1. **Remove local concept generation from hook**
   - Don't call `getCategoryPrompts()` in hook
   - Let API handle all concept generation

2. **Use API's image linking exclusively**
   - Remove `linkImagesToConcept` from hook
   - Always use API's `linkedImages` in response

3. **Ensure API's `linkImagesToConcept` is called**
   - Verify it's being called for each concept (line 482)
   - Check that `finalCategory` is correct

### Priority 2: Fix Category Detection

1. **Improve `detectCategory()` keyword matching**
   - Add more patterns (e.g., "Pinterest", "editorial", "influencer")
   - Make it less restrictive

2. **Allow null category**
   - Don't default to LIFESTYLE
   - Return null and let AI decide

3. **Update AI prompt**
   - Remove "or 'Lifestyle'" instruction
   - Tell AI to determine category from user request

4. **Don't return early if category is null**
   - Proceed with AI generation
   - Let AI determine category

### Priority 3: Database & Context

1. **✅ Image Library Loading (VERIFIED)**
   - `useImageLibrary` hook loads from `/api/maya/pro/library/get`
   - Database table: `user_image_libraries`
   - Hook correctly loads: `selfies`, `products`, `people`, `vibes`, `intent`
   - **Status:** Working correctly - images are loaded from database

2. **Check if user request is passed correctly**
   - Verify `userRequest` in API call
   - Check conversation context
   - **Issue:** Need to verify `userRequest` is being passed from `ProModeChat` to hook

3. **Check if category context is used**
   - Verify `categoryContext` in AI prompt
   - Check if `libraryContext` includes all images
   - **Issue:** `libraryContext` only shows counts, not actual image URLs

---

## 🧪 TESTING CHECKLIST

- [ ] Test with 4 images in library (1 selfie, 1 product, 1 person, 1 vibe)
- [ ] Verify all 4 images are linked across concepts (not just 1)
- [ ] Test with "Pinterest influencer style" request
- [ ] Verify category is not LIFESTYLE (should be FASHION or determined by AI)
- [ ] Test with "editorial luxury" request
- [ ] Verify category is LUXURY (not LIFESTYLE)
- [ ] Test with generic request "create concepts"
- [ ] Verify AI determines appropriate category (not always LIFESTYLE)
- [ ] Check database: Verify image library is loaded correctly
- [ ] Check console: Verify user request is passed to API
- [ ] Check API response: Verify `linkedImages` has 3-5 images per concept

---

## 📝 IMPLEMENTATION PLAN

### ✅ Phase 1: Remove Strict Category Requirements (COMPLETED)
- ✅ Category detection is now optional (just hints)
- ✅ `detectCategory()` returns null instead of defaulting to LIFESTYLE
- ✅ AI prompt uses Maya's personality (`getMayaPersonality()`)
- ✅ AI has full creative freedom to determine categories
- ✅ No early return if category is null
- ✅ Updated prompt to tell AI not to default to Lifestyle

### Phase 2: Fix Image Linking (IN PROGRESS - 2-3 hours)
- Remove local `linkImagesToConcept` from hook
- Remove local concept generation
- Use API response directly
- Ensure API's sophisticated image linking is used

### Phase 3: Verify Database & Context (1-2 hours)
- ✅ Image library loading verified (working correctly)
- Verify user request passing
- Check category context in AI prompt

### Phase 4: Testing (1-2 hours)
- Test all scenarios
- Verify fixes work
- Document any remaining issues

---

**Status:** Category requirements removed ✅ | Image linking still needs fix ⚠️  
**Remaining Estimated Time:** 4-6 hours


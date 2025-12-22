# Maya Pro Mode Prompting Pipeline Analysis

## Problem Identified
Universal Prompts implementation is **bypassing the entire dynamic prompting pipeline** that creates high-end, customized prompts.

---

## Original Flow (Main Branch - Before Universal Prompts)

### Studio Pro Mode Prompt Generation:
```
1. User Request → Category Detection
2. Prompt Constructor Check (line ~2739)
   ├─ If Studio Pro Mode + No Guide Prompt + Has User Request
   └─ Use `generatePromptWithBrandLibrary()`
       ├─ Calls `buildPromptWithFeatures()` from prompt-constructor.ts
       ├─ Integrates Brand Library (`generateCompleteOutfit()`)
       ├─ Dynamic Category/Vibe/Location Detection
       ├─ User-specific customization (age, features, gender)
       ├─ Camera specs by category
       ├─ Lighting options by category
       ├─ Aesthetic references
       └─ Output: 250-500 word dynamic prompt
3. Brand Library Enhancement (if not using prompt constructor)
4. Return concepts
```

### Key Features of Original System:
- ✅ **Dynamic**: Built prompts based on user request
- ✅ **Customized**: Integrated user-specific details
- ✅ **Brand-aware**: Used brand library for outfit details
- ✅ **Category-specific**: Camera specs, lighting, aesthetic by category
- ✅ **High-quality**: 250-500 words with all production requirements

---

## Current Flow (With Universal Prompts - BROKEN)

### Studio Pro Mode Prompt Generation:
```
1. User Request → Category Detection
2. **UNIVERSAL PROMPTS CHECK FIRST** (lines 2540-2610) ⚠️
   ├─ If Studio Pro Mode + Category matches + Generic request
   ├─ Get random prompts from library
   └─ **RETURN EARLY** (line 2598-2601) ❌
       └─ **BYPASSES ENTIRE DYNAMIC PIPELINE**
3. Composition System (if Universal Prompts don't match)
4. Prompt Constructor Check (lines 2739-2850)
   ├─ Also checks Universal Prompts again (duplicate logic)
   └─ Only runs if Universal Prompts didn't match
5. Brand Library Enhancement (skipped if using prompt constructor)
```

### Problems with Current Implementation:

#### 1. **Early Return Bypasses Dynamic System** (Lines 2540-2610)
```typescript
if (shouldUseUniversalPrompts) {
  // ... get random prompts ...
  return NextResponse.json({
    state: 'ready',
    concepts: concepts.slice(0, count)
  }) // ❌ RETURNS EARLY - Never reaches prompt constructor!
}
```

**Impact:**
- ❌ No dynamic prompt construction
- ❌ No brand library integration
- ❌ No user-specific customization
- ❌ No category-specific camera/lighting/aesthetic
- ❌ Just random static prompts from library

#### 2. **Duplicate Logic** (Lines 2766-2803)
- Universal Prompts checked twice:
  - First at lines 2540-2610 (early return)
  - Again at lines 2766-2803 (in prompt constructor section)

#### 3. **No Customization**
- Universal Prompts are static/random
- Don't adapt to:
  - User's specific request details
  - User's physical preferences
  - User's aesthetic preferences
  - Location specifics
  - Brand preferences

#### 4. **Missing Dynamic Features**
The original prompt constructor provided:
- ✅ Dynamic brand selection from library
- ✅ Category-specific camera specs
- ✅ Category-specific lighting
- ✅ Category-specific aesthetic references
- ✅ User age/features integration
- ✅ Location-specific details
- ✅ Vibe-specific styling

Universal Prompts provide:
- ❌ Static prompts
- ❌ Random selection
- ❌ No customization
- ❌ No user-specific details

---

## What Changed

### Added:
1. **Universal Prompts Library** (`lib/maya/universal-prompts/index.ts`)
2. **Early Universal Prompts Check** (lines 2540-2610) - **THIS IS THE PROBLEM**
3. **Duplicate Universal Prompts Check** (lines 2766-2803)

### Modified:
1. **Category Detection** - Now maps to Universal Prompt categories
2. **Prompt Constructor Flow** - Now checks Universal Prompts first

### Removed/Bypassed:
1. **Dynamic Prompt Construction** - Bypassed when Universal Prompts match
2. **Brand Library Integration** - Skipped when using Universal Prompts
3. **User Customization** - Not applied to Universal Prompts

---

## Where Maya is Failing

### 1. **"Afterski in Norway" Example**
- **Expected**: Dynamic prompt with Norway-specific details, après-ski styling, mountain lodge location
- **Actual**: Random luxury-fashion prompts (if category matches) or falls back to generic prompt constructor

### 2. **User-Specific Requests**
- **Expected**: Prompts customized with user's physical preferences, aesthetic, brand preferences
- **Actual**: Generic static prompts from library

### 3. **Category-Specific Details**
- **Expected**: Camera specs, lighting, aesthetic references specific to category
- **Actual**: Static prompts that may not match category requirements

### 4. **Brand Integration**
- **Expected**: Dynamic brand selection from library based on category and user request
- **Actual**: Static brand mentions in Universal Prompts (if any)

---

## Recommended Fix

### Option 1: Remove Early Universal Prompts Check (RECOMMENDED)
**Remove lines 2540-2610** - Let the dynamic prompt constructor run first, use Universal Prompts as fallback only.

### Option 2: Make Universal Prompts Dynamic
- Use Universal Prompts as templates
- Apply dynamic customization:
  - Replace placeholders with user-specific details
  - Integrate brand library
  - Customize location/aesthetic
  - Add user physical preferences

### Option 3: Use Universal Prompts as Reference Only
- Keep dynamic prompt constructor as primary
- Use Universal Prompts for:
  - Quality reference
  - Structure reference
  - Fallback when prompt constructor fails

---

## Code Locations

### Problem Areas:
1. **Lines 2540-2610**: Early Universal Prompts check with early return
2. **Lines 2766-2803**: Duplicate Universal Prompts check in prompt constructor section

### Original Dynamic System:
1. **Lines 2739-2850**: Prompt constructor section (still works, but bypassed)
2. **`lib/maya/prompt-constructor.ts`**: Dynamic prompt building
3. **`lib/maya/brand-library-2025.ts`**: Brand integration
4. **`generatePromptWithBrandLibrary()`**: Function that orchestrates dynamic generation

---

## Conclusion

**The Universal Prompts implementation broke the dynamic prompting pipeline by:**
1. Checking Universal Prompts BEFORE the dynamic prompt constructor
2. Returning early when Universal Prompts match, bypassing all dynamic customization
3. Using static/random prompts instead of building customized prompts

**The fix should:**
1. Remove the early Universal Prompts check (lines 2540-2610)
2. Keep Universal Prompts as a fallback/reference in the prompt constructor section
3. Ensure dynamic prompt constructor always runs first for Studio Pro Mode
4. Optionally enhance Universal Prompts to be customizable templates


















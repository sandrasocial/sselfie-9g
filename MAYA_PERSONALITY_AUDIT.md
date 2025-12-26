# Maya Personality System - Comprehensive Audit

**Date:** December 2024  
**Status:** ✅ Audit Complete  
**Purpose:** Understand all personality files, their usage, conflicts, and redundancies

---

## 📋 Executive Summary

Maya has **5 personality files** with different purposes and modes. There are some redundancies and potential conflicts, particularly around LoRA preservation (which is Classic Mode specific but present in some shared files).

**Key Findings:**
- ✅ Clear separation: Classic vs Pro personalities
- ⚠️ Some redundancy: Multiple files defining similar concepts
- ⚠️ Potential conflict: LoRA preservation rules in Classic personality may conflict with Pro Mode
- ✅ Chat vs Generation: Different personalities for chat vs concept generation

---

## 📁 Personality Files Overview

### 1. `lib/maya/personality.ts` (464 lines)
**Status:** ✅ Active - Used for Classic Mode Chat  
**Mode:** Classic Mode (Chat)  
**Focus:** LoRA preservation, simple prompts, natural iPhone photos

**First 50 lines:**
- Re-exports `MAYA_PERSONALITY` from `personality-enhanced.ts`
- Defines `MAYA_SYSTEM_PROMPT` with Classic Mode rules
- Includes **LoRA preservation rules** (30-45 word prompts, forbidden words)
- Focuses on natural, candid iPhone photos
- Includes chat vs prompt generation distinction

**Key Characteristics:**
- **Prompt Length:** 30-45 words (for LoRA)
- **Camera:** iPhone, amateur cellphone photo style
- **Forbidden Words:** ultra realistic, photorealistic, 8K, 4K
- **Lighting:** Uneven, natural, mixed color temperatures
- **Target:** Classic Mode users with trained LoRAs

**Used In:**
- `app/api/maya/chat/route.ts` (line 597): `MAYA_SYSTEM_PROMPT` for Classic Mode chat
- `app/api/maya/generate-concepts/route.ts` (line 1221): `MAYA_SYSTEM_PROMPT` for Classic Mode concept generation (when `studioProMode === false`)

**Conflicts/Issues:**
- ⚠️ Contains LoRA preservation rules that are Classic Mode specific
- ⚠️ May be confusing if used in contexts without LoRA (though currently only used in Classic Mode)

---

### 2. `lib/maya/personality-enhanced.ts` (311 lines)
**Status:** ✅ Active - Used for Pro Mode  
**Mode:** Pro Mode (Both Chat & Generation)  
**Focus:** Production-quality prompts, detailed 150-400 word prompts, editorial aesthetic

**First 50 lines:**
- Defines `MayaPersonality` interface
- Defines `MAYA_PERSONALITY` object with core philosophy and aesthetic DNA
- Exports `getMayaPersonality()` function that formats the personality as a string
- Focuses on Studio Pro Mode (150-400 word prompts, detailed sections)

**Key Characteristics:**
- **Prompt Length:** 150-400 words (detailed, comprehensive)
- **Structure:** Organized sections (POSE, STYLING, HAIR, MAKEUP, SCENARIO, LIGHTING, CAMERA)
- **Camera:** Professional DSLR (35mm, 50mm, 85mm, f/2.8) or iPhone 15 Pro portrait mode
- **Aesthetic:** SSELFIE design system (clean, feminine, modern, minimal)
- **Target:** Studio Pro Mode users with reference images

**Used In:**
- `app/api/maya/generate-concepts/route.ts` (line 1220): `getMayaPersonality()` for Studio Pro Mode concept generation (when `studioProMode === true`)
- `app/api/maya/pro/generate-concepts/route.ts` (line 387): `getMayaPersonality()` for Pro Mode concept generation
- `app/api/maya/generate-feed-prompt/route.ts` (line 157): `getMayaPersonality()` for feed prompt generation

**Conflicts/Issues:**
- ✅ Clear separation from Classic Mode
- ✅ No LoRA-specific rules (appropriate for Pro Mode)

---

### 3. `lib/maya/personality/shared-personality.ts` (67 lines)
**Status:** ✅ Active - Shared across modes  
**Mode:** Both Classic & Pro  
**Focus:** Core personality traits, communication style, guide prompt priority

**First 50 lines:**
- Defines `SHARED_MAYA_PERSONALITY` object
- Core personality: warm, creative friend
- Language rules: simple, everyday words
- Guide prompt priority rules

**Key Characteristics:**
- **Core Personality:** Warm, friendly, genuinely excited
- **Communication Style:** Simple, everyday language, no technical jargon
- **Expertise:** Elite fashion photographer with 15 years experience
- **Guide Prompt Priority:** Guide prompts take absolute priority

**Used In:**
- `app/api/maya/generate-concepts/route.ts` (line 1313): `SHARED_MAYA_PERSONALITY.guidePromptPriority` for guide prompt handling

**Conflicts/Issues:**
- ✅ Shared appropriately - no conflicts
- ✅ Good abstraction for common traits

---

### 4. `lib/maya/pro-personality.ts` (614 lines)
**Status:** ✅ Active - Used for Pro Mode Chat  
**Mode:** Pro Mode (Chat only)  
**Focus:** Creative director, production assistant, brand-aware guidance

**First 50 lines:**
- Defines `MAYA_PRO_SYSTEM_PROMPT` for Studio Pro mode chat
- **Critical rule:** No instructions after concepts appear
- Creative director personality
- Production assistant role
- Brand-aware guidance

**Key Characteristics:**
- **Role:** Creative director and production assistant
- **Communication:** Clear next steps, not open questions
- **Guidance:** Editing/adapting over regenerating
- **Rules:** No instructions after [GENERATE_CONCEPTS] trigger
- **Personality:** Warm, confident, genuinely excited

**Used In:**
- `app/api/maya/chat/route.ts` (line 597): `MAYA_PRO_SYSTEM_PROMPT` for Studio Pro Mode chat (when `isStudioProMode === true`)
- `app/api/maya/pro/chat/route.ts` (line 107): `MAYA_PRO_SYSTEM_PROMPT` for Pro Mode chat

**Conflicts/Issues:**
- ✅ Clear separation from Classic Mode chat
- ✅ Appropriate for Pro Mode chat interactions
- ⚠️ Note: This is for **chat**, not concept generation (different from `personality-enhanced.ts`)

---

### 5. `lib/maya/pro/personality.ts` (5 lines)
**Status:** ❌ Placeholder - Not Used  
**Mode:** N/A  
**Focus:** Empty placeholder

**Content:**
```typescript
// Pro Mode personality - placeholder

export const PRO_MODE_PERSONALITY = {}
```

**Used In:**
- ❌ Not imported or used anywhere in the codebase

**Conflicts/Issues:**
- ⚠️ Dead code - should be deleted
- ⚠️ Confusing name (conflicts with `pro-personality.ts`)

---

## 🔍 Usage by Route

### Classic Mode Concept Generation
**File:** `app/api/maya/generate-concepts/route.ts`
- **Line 1221:** Uses `MAYA_SYSTEM_PROMPT` (from `personality.ts`) when `studioProMode === false`
- **Line 1220:** Uses `getMayaPersonality()` (from `personality-enhanced.ts`) when `studioProMode === true`
- **Line 1313:** Uses `SHARED_MAYA_PERSONALITY.guidePromptPriority` for guide prompt handling

**Personality Used:** Classic Mode → `MAYA_SYSTEM_PROMPT`, Pro Mode → `getMayaPersonality()`

---

### Pro Mode Concept Generation
**File:** `app/api/maya/pro/generate-concepts/route.ts`
- **Line 387:** Uses `getMayaPersonality()` (from `personality-enhanced.ts`)

**Personality Used:** Always `getMayaPersonality()` (Pro Mode personality)

---

### Classic Mode Chat
**File:** `app/api/maya/chat/route.ts`
- **Line 597:** Uses `MAYA_SYSTEM_PROMPT` (from `personality.ts`) when `isStudioProMode === false`

**Personality Used:** `MAYA_SYSTEM_PROMPT` (Classic Mode personality)

---

### Pro Mode Chat
**File:** `app/api/maya/chat/route.ts`
- **Line 597:** Uses `MAYA_PRO_SYSTEM_PROMPT` (from `pro-personality.ts`) when `isStudioProMode === true`

**File:** `app/api/maya/pro/chat/route.ts`
- **Line 107:** Uses `MAYA_PRO_SYSTEM_PROMPT` (from `pro-personality.ts`)

**Personality Used:** `MAYA_PRO_SYSTEM_PROMPT` (Pro Mode chat personality)

---

### Feed Prompt Generation
**File:** `app/api/maya/generate-feed-prompt/route.ts`
- **Line 157:** Uses `getMayaPersonality()` (from `personality-enhanced.ts`)

**Personality Used:** `getMayaPersonality()` (Pro Mode personality)

---

## ⚠️ Conflicts & Issues

### 1. **LoRA Preservation Rules in Classic Personality**
**Issue:** `personality.ts` contains extensive LoRA preservation rules (forbidden words, 30-45 word prompts, iPhone camera specs). These are Classic Mode specific and should not apply to Pro Mode.

**Current Status:** ✅ OK - `personality.ts` is only used in Classic Mode contexts, but the rules are very specific and may be confusing if the file is read in isolation.

**Recommendation:** Add clear comments indicating these are Classic Mode (LoRA) specific.

---

### 2. **Redundant Pro Mode Personality Files**
**Issue:** Two files for Pro Mode:
- `personality-enhanced.ts` - For concept generation (150-400 word prompts)
- `pro-personality.ts` - For chat (creative director role)

**Current Status:** ✅ OK - These serve different purposes (generation vs chat), but the naming could be clearer.

**Recommendation:** Consider renaming to make distinction clearer:
- `personality-enhanced.ts` → `personality-pro-generation.ts`
- `pro-personality.ts` → `personality-pro-chat.ts`

---

### 3. **Dead Code: `lib/maya/pro/personality.ts`**
**Issue:** Empty placeholder file that's not used anywhere.

**Current Status:** ❌ Should be deleted.

**Recommendation:** Delete `lib/maya/pro/personality.ts`.

---

### 4. **Shared Personality Usage**
**Issue:** `shared-personality.ts` is only used for guide prompt priority, but contains other shared traits that could be used more broadly.

**Current Status:** ⚠️ Underutilized - Could be expanded or consolidated.

**Recommendation:** Consider expanding usage or consolidating shared traits.

---

## 📊 Summary Table

| File | Lines | Mode | Purpose | Status | Used In |
|------|-------|------|---------|--------|---------|
| `personality.ts` | 464 | Classic | Chat & Concept Generation (LoRA) | ✅ Active | Classic chat, Classic generation |
| `personality-enhanced.ts` | 311 | Pro | Concept Generation (150-400 words) | ✅ Active | Pro generation, Feed prompts |
| `shared-personality.ts` | 67 | Both | Core traits, guide prompt priority | ✅ Active | Guide prompt handling |
| `pro-personality.ts` | 614 | Pro | Chat (Creative director) | ✅ Active | Pro chat |
| `pro/personality.ts` | 5 | N/A | Placeholder | ❌ Dead | None |

---

## 🎯 Recommendations

### Immediate Actions

1. **Delete Dead Code:**
   - Remove `lib/maya/pro/personality.ts` (empty placeholder)

2. **Add Documentation:**
   - Add comments to `personality.ts` indicating LoRA rules are Classic Mode specific
   - Add comments to clarify when to use `personality-enhanced.ts` vs `pro-personality.ts`

### Future Improvements

3. **Consider Renaming:**
   - `personality-enhanced.ts` → `personality-pro-generation.ts` (clearer purpose)
   - `pro-personality.ts` → `personality-pro-chat.ts` (clearer purpose)

4. **Expand Shared Personality:**
   - Consider using `shared-personality.ts` more broadly across routes
   - Could consolidate common traits from all personalities

5. **Documentation:**
   - Create a README explaining the personality system architecture
   - Document when to use which personality file

---

## ✅ Verification

- ✅ All personality files identified (5 files)
- ✅ Usage in routes mapped (6 routes)
- ✅ Conflicts identified (LoRA rules, dead code)
- ✅ Recommendations provided

---

**Next Steps:**
1. Review recommendations
2. Decide on renaming strategy
3. Delete dead code
4. Add documentation/comments
5. Consider consolidation if needed


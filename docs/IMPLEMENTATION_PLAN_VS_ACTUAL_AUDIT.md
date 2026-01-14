# Implementation Plan vs Actual Implementation Audit

**Date**: 2026-01-XX  
**Purpose**: Compare what the implementation plan describes vs what's actually implemented in the codebase

---

## Executive Summary

The implementation plan describes a **3-phase Dynamic Template System**, but upon audit, **NONE of Phase 1's planned features have been implemented**. However, there IS a different extraction system (`extractAestheticFromTemplate`) that was implemented separately, which is being used for paid blueprint users.

---

## Phase 1: Dynamic Template System

### ❌ NOT IMPLEMENTED

#### 1.1 Template Placeholders
- **Planned**: Replace hardcoded outfits with `{{outfit}}`, `{{location}}`, `{{accessories}}` placeholders
- **Status**: ❌ NOT FOUND
- **Evidence**: Templates in `lib/maya/blueprint-photoshoot-templates.ts` still have hardcoded outfits/locations
- **Example from actual template**:
  ```
  Frame 1: Sitting on concrete stairs - black blazer, leather pants, beanie, sunglasses, relaxed pose
  ```
  (Should be: `Sitting on {{location}} - {{outfit}}, {{accessories}}, relaxed pose`)

#### 1.2 Dynamic Template Injector
- **Planned**: `lib/feed-planner/dynamic-template-injector.ts` with `injectTemplatePlaceholders()` function
- **Status**: ❌ FILE DOES NOT EXIST
- **Evidence**: `glob_file_search` found 0 files matching `dynamic-template-injector.ts`

#### 1.3 NEW Outfit Libraries
- **Planned**: `lib/feed-planner/outfit-libraries.ts` with `DARK_MOODY_OUTFITS`, `LIGHT_MINIMALISTIC_OUTFITS`, `BEIGE_AESTHETIC_OUTFITS`
- **Status**: ❌ FILE DOES NOT EXIST
- **Evidence**: `glob_file_search` found 0 files matching `outfit-libraries.ts`

#### 1.4 Location Libraries
- **Planned**: `lib/feed-planner/location-libraries.ts` with location arrays per vibe
- **Status**: ❌ FILE DOES NOT EXIST
- **Evidence**: `glob_file_search` found 0 files matching `location-libraries.ts`

#### 1.5 Simple Rotation System
- **Planned**: `lib/feed-planner/simple-rotation.ts` with `getNextWithRotation()` function
- **Status**: ❌ FILE DOES NOT EXIST
- **Evidence**: No files found matching rotation patterns

#### 1.6 Template Variation Database Column
- **Planned**: `feed_layouts.template_variation` column (VARCHAR(100))
- **Status**: ❌ NOT FOUND IN MIGRATIONS
- **Evidence**: `grep` search found no migrations adding `template_variation` column

#### 1.7 getBlueprintPhotoshootPromptWithRotation Function
- **Planned**: New function `getBlueprintPhotoshootPromptWithRotation()` in `blueprint-photoshoot-templates.ts`
- **Status**: ❌ FUNCTION DOES NOT EXIST
- **Evidence**: Only `getBlueprintPhotoshootPrompt()` exists (no `WithRotation` variant)

---

## Phase 2: Category Selection

### ❌ NOT IMPLEMENTED

#### 2.1 Category Selection UI
- **Planned**: Add category selection to `components/feed-planner/feed-style-modal.tsx`
- **Status**: ❌ NOT IMPLEMENTED (need to verify)

#### 2.2 Feed Category Database Column
- **Planned**: `feed_layouts.feed_category` column (VARCHAR(50))
- **Status**: ❌ NOT FOUND IN MIGRATIONS
- **Evidence**: `grep` search found no migrations adding `feed_category` column

---

## Phase 3: Fashion Style Integration

### ❌ NOT IMPLEMENTED

#### 3.1 Fashion Style Parameter
- **Planned**: Add `fashionStyle` parameter to `buildSingleImagePrompt()` function
- **Status**: ❌ NOT IMPLEMENTED
- **Evidence**: `buildSingleImagePrompt()` signature is:
  ```typescript
  export function buildSingleImagePrompt(
    templatePrompt: string,
    position: number
  ): string
  ```
  (No `fashionStyle` parameter)

#### 3.2 Fashion Style Integration Logic
- **Planned**: `adjustOutfitForFashionStyle()` function
- **Status**: ❌ FUNCTION DOES NOT EXIST
- **Evidence**: No such function found in `build-single-image-prompt.ts`

---

## ✅ WHAT ACTUALLY EXISTS (Different Implementation)

### 1. Template Frame Extraction (Used for Preview Feeds)
- **File**: `lib/feed-planner/build-single-image-prompt.ts`
- **Functions**:
  - `parseTemplateFrames()` - ✅ EXISTS
  - `buildSingleImagePrompt()` - ✅ EXISTS
  - `validateTemplate()` - ✅ EXISTS
- **Usage**: Used in free/preview feed generation to extract individual frames from templates
- **Note**: This is the **BASIC** extraction system, not the planned dynamic system

### 2. Aesthetic Extraction (Used for Paid Blueprint)
- **File**: `lib/feed-planner/extract-aesthetic-from-template.ts`
- **Functions**:
  - `extractAestheticFromTemplate()` - ✅ EXISTS
  - `validateBlueprintTemplate()` - ✅ EXISTS
- **Purpose**: Extracts aesthetic elements (vibe, colorGrade, setting, outfit, lighting) from preview templates
- **Usage**: Used in paid blueprint flow to lock aesthetic for consistency
- **Note**: This is a **DIFFERENT** system than what the plan describes

### 3. Template Selection
- **File**: `lib/maya/blueprint-photoshoot-templates.ts`
- **Functions**:
  - `getBlueprintPhotoshootPrompt()` - ✅ EXISTS
  - `MOOD_MAP` - ✅ EXISTS
  - `BLUEPRINT_PHOTOSHOOT_TEMPLATES` - ✅ EXISTS
- **Note**: This is the **BASIC** template selection, not the planned rotation system

---

## Current Flow (What Actually Works)

### For Preview/Free Feeds:
1. User selects feed style (luxury/minimal/beige) → Maps to mood
2. Category comes from `user_personal_brand.visual_aesthetic`
3. Template selected: `getBlueprintPhotoshootPrompt(category, mood)`
4. Template stored in database (full template prompt)
5. When generating images: `buildSingleImagePrompt(template, position)` extracts frame

### For Paid Blueprint Feeds:
1. User creates preview feed first
2. Preview template stored in database
3. When generating paid blueprint images:
   - `extractAestheticFromTemplate(previewTemplate)` extracts aesthetic
   - Passes `lockedAesthetic` to Maya's prompt generation
   - Maya generates unique prompts maintaining aesthetic consistency

---

## Key Differences: Plan vs Actual

| Aspect | Implementation Plan | Actual Implementation |
|--------|-------------------|---------------------|
| **Template System** | Dynamic placeholders (`{{outfit}}`, `{{location}}`) | Hardcoded outfits/locations in templates |
| **Outfit Selection** | Rotating outfit libraries by fashion style | No outfit libraries, templates have hardcoded outfits |
| **Location Selection** | Rotating location libraries | Templates have hardcoded locations |
| **Rotation** | Database-driven rotation system | No rotation - same template always used |
| **Fashion Style** | Integrated into prompt building | Not used in prompt building |
| **Preview Flow** | Uses dynamic injection | Uses basic template extraction (`buildSingleImagePrompt`) |
| **Paid Flow** | Uses dynamic injection + rotation | Uses aesthetic extraction (`extractAestheticFromTemplate`) + Maya generation |

---

## Conclusion

**The implementation plan describes a system that has NOT been implemented.**

Instead, the codebase uses:
1. **Basic template extraction** (`buildSingleImagePrompt`) for preview feeds
2. **Aesthetic extraction** (`extractAestheticFromTemplate`) for paid blueprint feeds

**Before testing**, we need to:
1. ✅ Understand what the actual implementation is (basic extraction)
2. ❌ Decide if we want to implement the planned system, or
3. ✅ Test the current implementation as-is

---

## Recommendation

Since the implementation plan describes a **different system** than what's actually built, we should:
1. **Test the current implementation** (basic template extraction) to verify it works correctly
2. **Document the gap** between plan and actual
3. **Decide if the planned system should be implemented**, or if the current system is sufficient

The current system appears to be simpler and may be sufficient for the use case. The planned system would add complexity (outfit libraries, location libraries, rotation) that may not be necessary.
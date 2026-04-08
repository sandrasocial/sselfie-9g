# Phase 1: Analysis & Preparation Results

## 📊 Current State Overview

### File Statistics
- **nano-banana-prompt-builder.ts**: 1,425 lines (target: <200 lines)
- **direct-prompt-generation-integration-example.ts**: 5.8KB (to be deleted)
- **Total lines to reduce**: ~1,200+ lines

---

## 🔍 Functions Analysis

### Functions to SIMPLIFY (NOT delete - they exist and are needed)

#### 1. `buildBrandScenePrompt()` - Line 661
**Current Status:** ✅ EXISTS  
**Current Complexity:** ~200 lines (lines 661-860)  
**Target:** ~20 lines  
**Issues Found:**
- Complex detection logic (lines 681-706): Checks if prompt is "Maya detailed" vs "generic"
- Multiple conditional branches based on detection
- Generic prompt building fallback (lines 758-860) - builds prompts from scratch
- Extraction logic: `pickSetting()`, `pickMood()`, `pickLighting()`, outfit/pose extraction (lines 782-794)
- Multi-image handling logic (lines 743-755, 807-829)
- Brand context guidance building (lines 728-741, 831-846)

**Action Required:**
- Remove ALL detection logic (`isGenericPrompt`, `isMayaDetailedPrompt`)
- Remove generic prompt building fallback
- Remove extraction functions (`pickSetting`, `pickMood`, `pickLighting`, outfit/pose extraction)
- Simplify to: Light cleaning only + multi-image instruction if needed

#### 2. `cleanStudioProPrompt()` - Line 91
**Current Status:** ✅ EXISTS  
**Current Complexity:** ~82 lines (lines 91-172)  
**Target:** ~15 lines  
**Issues Found:**
- Removes markdown headlines (lines 98-106)
- Removes "Note:" sections (lines 108-114)
- Black/white detection and removal logic (lines 116-151) - complex conditional logic
- "Visible pores" fix logic (lines 135-139)
- Whitespace/newline cleanup (lines 153-157)
- Formatting artifact removal (lines 159-161)
- Sentence structure fixes (lines 163-166)

**Action Required:**
- Keep: Remove `**`, "Note:", "CRITICAL:" sections
- Keep: Basic whitespace cleanup
- Remove: Black/white detection logic
- Remove: "Visible pores" fixes
- Remove: Sentence structure fixes
- Remove: Formatting artifact removal beyond basics

---

## ❌ Functions NOT Found (Already Deleted or Don't Exist)

The following functions mentioned in documentation **DO NOT EXIST** in current codebase:
- ❌ `extractCompleteScene()` - NOT FOUND
- ❌ `buildOutfitSection()` - NOT FOUND
- ❌ `extractSceneComponents()` - NOT FOUND
- ❌ `reconstructPromptFromComponents()` - NOT FOUND
- ❌ `buildFromTemplate()` - NOT FOUND
- ❌ `getTemplateForCategory()` - NOT FOUND

**Conclusion:** These functions were either never implemented or already removed. No action needed.

---

## 🗑️ Files to DELETE

### 1. `lib/maya/direct-prompt-generation-integration-example.ts`
**Status:** ✅ EXISTS  
**Size:** 5.8KB  
**Location:** `/Users/MD760HA/sselfie-9g-1/lib/maya/direct-prompt-generation-integration-example.ts`  
**Reason:** Example file showing old integration patterns - no longer needed

### 2. `lib/maya/prompt-builders/pro-prompt-builder.ts`
**Status:** ❌ NOT FOUND  
**Location:** `/lib/maya/prompt-builders/pro-prompt-builder.ts`  
**Reason:** File does not exist - no action needed

### 3. Backup Files
**Status:** ✅ NONE FOUND  
**Search Result:** No `*.backup-*` files found in `lib/maya/` directory

---

## 📍 Pro Mode Prompt Building Location

### File: `app/api/maya/generate-concepts/route.ts`

**Pro Mode Section:** Lines ~1693-2372  
**Current Implementation:**
- Uses `getNanoBananaPromptingPrinciples()` (line 1695)
- Has workflow-specific prompt instructions (lines 2362-2372)
- Includes detailed rules for each workflow type (brand-scene, carousel, reel-cover, etc.)

**Action Required:**
- Replace workflow-specific instructions with examples-based approach
- Import and use `getNanoBananaPerfectExamples()` instead of complex rules
- Simplify prompt instructions to reference examples only

---

## 📋 Helper Functions Analysis

### Functions Used by `buildBrandScenePrompt()` (to be removed/simplified):
- `pickSetting()` - Line 1337 (extraction function - remove usage)
- `pickMood()` - Line 1355 (extraction function - remove usage)
- `pickLighting()` - Line 1365 (extraction function - remove usage)
- Outfit/pose regex extraction (lines 787-794) - remove

### Functions to KEEP (still needed):
- `cleanStudioProPrompt()` - Simplify but keep
- `getNanoBananaPromptingPrinciples()` - Keep (already simple)
- `getSceneCompositionIntelligence()` - Keep (used elsewhere)
- All mode-specific builders (`buildUgcProductPrompt`, `buildTextOverlayPrompt`, etc.) - Keep (not in scope)

---

## 📊 Summary Table

| Category | Item | Status | Action | Lines Impact |
|----------|------|--------|--------|--------------|
| **Functions to Simplify** | `buildBrandScenePrompt()` | ✅ EXISTS | Simplify to ~20 lines | -180 lines |
| **Functions to Simplify** | `cleanStudioProPrompt()` | ✅ EXISTS | Simplify to ~15 lines | -67 lines |
| **Files to Delete** | `direct-prompt-generation-integration-example.ts` | ✅ EXISTS | DELETE | -219 lines |
| **Files to Delete** | `pro-prompt-builder.ts` | ❌ NOT FOUND | None needed | - |
| **Functions NOT Found** | `extractCompleteScene()` | ❌ NOT FOUND | None needed | - |
| **Functions NOT Found** | `buildOutfitSection()` | ❌ NOT FOUND | None needed | - |
| **Functions NOT Found** | `extractSceneComponents()` | ❌ NOT FOUND | None needed | - |
| **Functions NOT Found** | `reconstructPromptFromComponents()` | ❌ NOT FOUND | None needed | - |
| **Functions NOT Found** | `buildFromTemplate()` | ❌ NOT FOUND | None needed | - |
| **Functions NOT Found** | `getTemplateForCategory()` | ❌ NOT FOUND | None needed | - |

**Estimated Total Reduction:** ~466 lines minimum (buildBrandScenePrompt: -180, cleanStudioProPrompt: -67, delete file: -219)

---

## ✅ Phase 1 Complete

**Deliverables:**
1. ✅ Full audit of `nano-banana-prompt-builder.ts`
2. ✅ Identified functions to simplify (2 functions)
3. ✅ Confirmed functions to delete don't exist (no action needed)
4. ✅ Identified files to delete (2 files)
5. ✅ Located Pro mode prompt building section in `generate-concepts/route.ts`
6. ✅ Analyzed complexity of target functions

**Next Steps:**
- Phase 2: Delete complex code (files and simplify functions)
- Phase 3: Create examples system
- Phase 4: Simplify core functions
- Phase 5: Add validation
- Phase 6: Test implementation

---

**Generated:** Phase 1 Analysis Complete  
**Date:** Analysis completed  
**Ready for Phase 2:** ✅ YES


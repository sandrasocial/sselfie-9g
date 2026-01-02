# Maya Prompting Pipeline Cleanup Audit

**Date:** December 26, 2024  
**Branch:** `cleanup-maya-pipeline`  
**Feature Flag Status:** `USE_DIRECT_PROMPT_GENERATION=true` (enabled)

---

## Executive Summary

This audit identifies files in the Maya prompting pipeline that need cleanup after migrating from the **OLD extraction-based system** to the **NEW direct generation system**.

### Systems Overview

1. **OLD System (Extraction-Based):**
   - Extracts scene elements from descriptions using regex patterns
   - Rebuilds prompts by reconstructing sections (outfit, pose, setting, lighting)
   - Located in: `lib/maya/pro/prompt-builder.ts`
   - Functions: `extractCompleteScene()`, `buildOutfitSection()`, `buildPoseSection()`, `buildSettingSection()`, `buildProModePrompt()`

2. **NEW System (Direct Generation):**
   - Maya generates final prompts directly without extraction
   - Located in: `lib/maya/direct-prompt-generation.ts`
   - Functions: `generatePromptDirect()`, `generateConceptsWithFinalPrompts()`
   - **Status:** ✅ Currently enabled via feature flag

---

## 1. Files to DELETE (Old Extraction System)

These files contain the old extraction logic and should be removed:

### Primary Files

| File | Size | Reason |
|------|------|--------|
| `lib/maya/pro/prompt-builder.ts` | 21K | Core old extraction system - contains `extractCompleteScene()`, `buildOutfitSection()`, `buildPoseSection()`, `buildProModePrompt()` |

### Test/Documentation Files (Review Before Deletion)

| File | Type | Notes |
|------|------|-------|
| `scripts/test-description-prompt-match.ts` | Test Script | Tests old extraction functions - can be deleted if no longer needed |
| `lib/maya/direct-prompt-generation-integration-example.ts` | Example File | Example showing integration - likely no longer needed |
| `lib/maya/direct-prompt-generation-integration-summary.md` | Documentation | Migration documentation - archive instead of delete |

### Documentation Files (Archive, Don't Delete)

These are historical documentation - move to `docs/archive/`:

- `docs/MAYA-PRO-PROMPTING-AUDIT.md`
- `docs/PRO-MODE-PROMPT-GENERATION-TRACE.md`
- `docs/MAYA-PRO-MODE-IMPLEMENTATION-AUDIT.md`
- `docs/MAYA-PRO-MODE-IMPLEMENTATION-CHECKLIST.md`
- `docs/MAYA-PRO-MODE-STEP-BY-STEP-PROMPTS.md`
- `docs/MAYA-PRO-MODE-CLEANUP-PLAN.md`
- `docs/PROMPT-BUILDERS-ARCHITECTURE.md`

---

## 2. Files to KEEP (New Direct Generation System)

These files are part of the new system and should be preserved:

### Core Files

| File | Purpose | Status |
|------|---------|--------|
| `lib/maya/direct-prompt-generation.ts` | ✅ Core new system - direct prompt generation | **KEEP** |
| `app/api/maya/generate-concepts/route.ts` | ✅ Main route using new system (feature flag ON) | **KEEP** |

### Supporting Files

| File | Purpose |
|------|---------|
| `lib/maya/nano-banana-prompt-builder.ts` | Different system for Studio Pro image generation (not part of this cleanup) |
| `lib/maya/prompt-builders/classic-prompt-builder.ts` | Classic mode prompt builder (different from Pro mode) |
| `lib/maya/flux-prompt-builder.ts` | Flux-specific prompt builder (different system) |

---

## 3. Files to UPDATE (Remove Old Imports/Dependencies)

These files currently import or reference the old system and need updates:

### Critical Updates Required

#### `app/api/maya/pro/generate-concepts/route.ts`
**Status:** ⚠️ **MUST UPDATE**  
**Current Issue:**
- Line 15: Imports `buildProModePrompt` from old `prompt-builder.ts`
- Lines 679-687: Uses `buildProModePrompt()` when feature flag is OFF
- Lines 715-723: Fallback uses `buildProModePrompt()` when direct generation fails

**Required Changes:**
1. Remove import: `import { buildProModePrompt, type ConceptComponents } from "@/lib/maya/pro/prompt-builder"`
2. Remove conditional logic that falls back to old system
3. Ensure feature flag is always respected (or remove feature flag entirely if migration is complete)
4. Update error handling to use direct generation only

**Code Locations:**
```typescript
// Line 13-15: Remove import
import {
  buildProModePrompt,  // ❌ DELETE THIS
  type ConceptComponents,
} from "@/lib/maya/pro/prompt-builder"

// Lines 630-658: Direct generation (KEEP)
if (useDirectGeneration) {
  const { generatePromptDirect } = await import('@/lib/maya/direct-prompt-generation')
  // ... KEEP THIS CODE
}

// Lines 679-687: Old system fallback (DELETE)
const { fullPrompt: generatedPrompt, category: promptCategoryResult } = await buildProModePrompt(
  // ... DELETE THIS BLOCK
)

// Lines 715-723: Old system fallback (DELETE)
const { fullPrompt: generatedPrompt, category: promptCategoryResult } = await buildProModePrompt(
  // ... DELETE THIS BLOCK
)
```

#### `scripts/test-description-prompt-match.ts`
**Status:** ⚠️ **UPDATE OR DELETE**  
**Current Issue:**
- Line 10: Imports `buildPoseSection`, `buildSettingSection` from old system
- Tests old extraction functions

**Options:**
1. **DELETE** if tests are no longer relevant
2. **UPDATE** to test new direct generation system instead
3. **ARCHIVE** to `scripts/archive/` if needed for reference

---

### Files with Indirect References (Review Only)

These files mention the old system in comments/documentation but don't import:

- `app/api/maya/generate-concepts/route.ts` - Has comments about old system but already uses new system
- `IMPLEMENTATION_VALIDATION.md` - Documentation only
- Various `docs/MAYA-*.md` files - Historical documentation

**Action:** Review comments and update/remove outdated references

---

## 4. Dependencies That Need Updating

### Type Exports

The old `prompt-builder.ts` exports types that may be used elsewhere:

#### `ConceptComponents` Type
**Current Usage:**
- `app/api/maya/pro/generate-concepts/route.ts` - Line 14: `type ConceptComponents` (imported from old prompt-builder.ts)
- `lib/maya/prompt-components/types.ts` - Line 37: `export interface ConceptComponents` (⚠️ DIFFERENT TYPE - part of composition system)

**Type Conflict:**
There are TWO different `ConceptComponents` types:
1. **Old type** (in prompt-builder.ts): Simple fields like `title`, `description`, `outfit?: { top?: string }`, etc.
2. **New type** (in prompt-components/types.ts): Uses `PromptComponent` objects - part of Universal Prompts system

**Required Action:**
1. ✅ Verified: `ConceptComponents` from old prompt-builder is only used in:
   - `app/api/maya/pro/generate-concepts/route.ts` (when old system is used)
   - Old prompt-builder.ts itself
2. Since it's only used with the old system, it can be deleted along with prompt-builder.ts
3. No need to move to shared location - type will be obsolete

#### `PhotographyStyle` Type
**Current Usage:**
- `lib/maya/pro/prompt-builder.ts` - Line 15: `export type PhotographyStyle = 'editorial' | 'authentic'`
- `lib/maya/pro/photography-styles.ts` - Line 9: `export type PhotographyStyle = 'authentic' | 'editorial'` (✅ Already exists!)

**Required Action:**
1. ✅ **No action needed** - Type is already defined in `lib/maya/pro/photography-styles.ts`
2. Old prompt-builder.ts has a duplicate definition that can be deleted
3. Any files importing `PhotographyStyle` from prompt-builder.ts should import from `photography-styles.ts` instead

---

## 5. Feature Flag Status & Removal Plan

### Current Status
- **Feature Flag:** `USE_DIRECT_PROMPT_GENERATION=true` (enabled in `.env.local`)
- **Location:** Checked in `app/api/maya/generate-concepts/route.ts` (lines 126-157)
- **Function:** `isDirectPromptGenerationEnabled()`

### Removal Strategy

Once cleanup is complete:

1. **Remove feature flag checks** from:
   - `app/api/maya/generate-concepts/route.ts`
   - `app/api/maya/pro/generate-concepts/route.ts`

2. **Remove feature flag function:**
   - `isDirectPromptGenerationEnabled()` (line 126 in generate-concepts/route.ts)

3. **Remove environment variable:**
   - Remove `USE_DIRECT_PROMPT_GENERATION` from `.env.local` and documentation

4. **Update comments:**
   - Remove all "🔴 NEW: Direct Prompt Generation (Feature Flag)" comments
   - Update to reflect permanent system

---

## 6. Migration Checklist

### Phase 1: Pre-Cleanup Verification ✅
- [x] Identify all files using old system
- [x] Verify feature flag is enabled
- [x] Confirm new system is working in production
- [x] Create backup of critical files (✅ Done in `backup-before-cleanup/`)

### Phase 2: Code Updates
- [ ] Remove old system imports from `app/api/maya/pro/generate-concepts/route.ts`
- [ ] Update `app/api/maya/pro/generate-concepts/route.ts` to use only direct generation
- [ ] Update or delete `scripts/test-description-prompt-match.ts`
- [ ] Remove feature flag logic (after verification)
- [ ] Note: `PhotographyStyle` type already exists in `photography-styles.ts` - no migration needed
- [ ] Note: Old `ConceptComponents` type will be deleted with prompt-builder.ts - no migration needed

### Phase 3: File Cleanup
- [ ] Delete `lib/maya/pro/prompt-builder.ts`
- [ ] Delete `scripts/test-description-prompt-match.ts` (or update it)
- [ ] Delete `lib/maya/direct-prompt-generation-integration-example.ts`
- [ ] Archive documentation files to `docs/archive/`

### Phase 4: Verification
- [ ] Test Pro Mode concept generation
- [ ] Test Classic Mode concept generation
- [ ] Verify no broken imports
- [ ] Run TypeScript compilation check
- [ ] Test in development environment

### Phase 5: Feature Flag Removal
- [ ] Remove feature flag checks from routes
- [ ] Remove `isDirectPromptGenerationEnabled()` function
- [ ] Remove environment variable from `.env.local`
- [ ] Update documentation

---

## 7. Risk Assessment

### High Risk
- **Removing `buildProModePrompt()` fallback** - Ensure direct generation always works
- **Type dependencies** - `ConceptComponents` may be used elsewhere

### Medium Risk
- **Test script deletion** - May need to keep for regression testing
- **Documentation references** - Old docs may confuse future developers

### Low Risk
- **Example file deletion** - No production impact
- **Documentation archiving** - Historical reference only

---

## 8. Files Summary Table

| Category | Count | Action |
|----------|-------|--------|
| **Files to DELETE** | 1 | `lib/maya/pro/prompt-builder.ts` |
| **Files to UPDATE** | 2 | `app/api/maya/pro/generate-concepts/route.ts`, `scripts/test-description-prompt-match.ts` |
| **Files to ARCHIVE** | 7+ | Documentation files in `docs/` |
| **Files to KEEP** | 1 | `lib/maya/direct-prompt-generation.ts` |

---

## 9. Next Steps

1. **Review this audit** with team
2. **Create backup branch** (✅ Already done: `cleanup-maya-pipeline`)
3. **Execute Phase 2** (Code Updates) - Start with route file updates
4. **Test thoroughly** before proceeding to Phase 3
5. **Delete old files** only after verification
6. **Update documentation** to reflect new system

---

## 10. Questions to Resolve

1. Is the feature flag still needed, or can we remove it entirely?
2. Are there any other files using `ConceptComponents` type that we haven't found?
3. Should we keep `test-description-prompt-match.ts` updated for the new system, or delete it?
4. Are there any production incidents or known issues with the old system that justify immediate removal?

---

**Report Generated:** December 26, 2024  
**Audit Scope:** Maya Prompting Pipeline - Extraction vs Direct Generation Systems

---

## 11. Quick Reference Summary

### Key Findings

1. **Feature Flag Status:** ✅ `USE_DIRECT_PROMPT_GENERATION=true` (enabled in `.env.local`)

2. **Critical File to Update:**
   - `app/api/maya/pro/generate-concepts/route.ts` - Still imports and uses old `buildProModePrompt()` when feature flag is OFF

3. **Files Safe to Delete:**
   - `lib/maya/pro/prompt-builder.ts` (21K) - Old extraction system

4. **No Type Migration Needed:**
   - `PhotographyStyle` already exists in `lib/maya/pro/photography-styles.ts`
   - Old `ConceptComponents` only used with old system - can be deleted

5. **Risk Level:** 🟡 Medium - Main route has fallback to old system that needs removal

### Recommended Action Order

1. **Update route file first** - Remove old system imports and fallback logic
2. **Test thoroughly** - Verify direct generation works in all scenarios
3. **Delete old files** - Only after successful testing
4. **Remove feature flag** - Final cleanup step

### Estimated Impact

- **Files to modify:** 1-2 (routes)
- **Files to delete:** 1 (prompt-builder.ts)
- **Breaking changes:** None (old system not in use when flag is enabled)
- **Testing required:** Pro Mode concept generation


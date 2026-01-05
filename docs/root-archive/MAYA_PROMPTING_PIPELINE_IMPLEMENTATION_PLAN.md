# Maya Prompting Pipeline Fix - Implementation Plan

## 📋 Overview

This plan implements the simplification of Maya's Pro Mode prompting pipeline by removing over-engineered extraction/rebuilding logic and trusting Claude Sonnet 4 to generate perfect prompts using examples.

**Goal:** Reduce complexity from 800+ lines to <200 lines while improving prompt quality.

---

## 🎯 Phase 1: Analysis & Preparation

### Step 1.1: Audit Current Codebase
**Status:** ⏳ Pending  
**Estimated Time:** 15 minutes

**Tasks:**
- [ ] Read `lib/maya/nano-banana-prompt-builder.ts` fully to identify all functions
- [ ] Search for functions to DELETE:
  - `extractCompleteScene()`
  - `buildOutfitSection()`
  - `extractSceneComponents()`
  - `reconstructPromptFromComponents()`
  - `buildFromTemplate()`
  - `getTemplateForCategory()`
- [ ] Find `buildBrandScenePrompt()` and analyze its complexity
- [ ] Find `cleanStudioProPrompt()` and analyze its complexity
- [ ] Check `app/api/maya/generate-concepts/route.ts` for Pro mode prompt building section

**Deliverable:** List of functions/files to delete with line counts

---

### Step 1.2: Identify Files to Delete
**Status:** ⏳ Pending  
**Estimated Time:** 10 minutes

**Tasks:**
- [ ] Search for backup files: `*.backup-*`
- [ ] Confirm existence of:
  - `lib/maya/direct-prompt-generation-integration-example.ts`
  - `lib/maya/prompt-builders/pro-prompt-builder.ts`
- [ ] Check for template files in `lib/maya/prompt-templates/`
- [ ] Create list of files to delete with file sizes

**Deliverable:** Complete list of files to delete with confirmation

---

## 🗑️ Phase 2: Delete Complex Code

### Step 2.1: Delete Extraction/Rebuilding Functions
**Status:** ⏳ Pending  
**Estimated Time:** 30 minutes  
**File:** `lib/maya/nano-banana-prompt-builder.ts`

**Tasks:**
- [ ] Locate and DELETE `extractCompleteScene()` function
- [ ] Locate and DELETE `buildOutfitSection()` function
- [ ] Locate and DELETE `extractSceneComponents()` function
- [ ] Locate and DELETE `reconstructPromptFromComponents()` function
- [ ] Locate and DELETE `buildFromTemplate()` function
- [ ] Locate and DELETE `getTemplateForCategory()` function
- [ ] Remove all helper functions that support extraction/rebuilding
- [ ] Remove unused imports related to deleted functions

**Validation:**
- [ ] File compiles without errors
- [ ] No references to deleted functions elsewhere
- [ ] Line count reduced significantly

**Deliverable:** Updated `nano-banana-prompt-builder.ts` with extraction functions removed

---

### Step 2.2: Delete Unused Files
**Status:** ⏳ Pending  
**Estimated Time:** 10 minutes

**Tasks:**
- [ ] Delete `lib/maya/direct-prompt-generation-integration-example.ts`
- [ ] Delete any `*.backup-*` files found
- [ ] Delete `lib/maya/prompt-builders/pro-prompt-builder.ts` (if exists and unused)
- [ ] Verify no imports reference deleted files

**Validation:**
- [ ] Search codebase for imports of deleted files
- [ ] Confirm no broken imports
- [ ] Git status shows clean deletions

**Deliverable:** List of deleted files with confirmation

---

## ✅ Phase 3: Create Simple Examples System

### Step 3.1: Create Examples File
**Status:** ⏳ Pending  
**Estimated Time:** 45 minutes  
**File:** `lib/maya/nano-banana-examples.ts` (NEW)

**Tasks:**
- [ ] Create new file `lib/maya/nano-banana-examples.ts`
- [ ] Add file header documentation
- [ ] Copy 10 perfect examples from documentation:
  1. Luxury Brand Fashion (Chanel-style)
  2. Quiet Luxury (The Row-style)
  3. Athletic Luxury (Alo Yoga-style)
  4. Street Luxe (Off-White-style)
  5. Parisian Elegance (Hermès-style)
  6. Editorial Power (Givenchy-style)
  7. Soft Romance (Zimmermann-style)
  8. Avant-Garde Fashion (Rick Owens-style)
  9. Beachwear Luxury (Eres-style)
  10. Tech Minimalism (Jil Sander-style)
- [ ] Create `getNanoBananaPerfectExamples()` export function
- [ ] Add TypeScript type annotations if needed

**Validation:**
- [ ] File compiles without errors
- [ ] All 10 examples are present and properly formatted
- [ ] Export function works correctly

**Deliverable:** New `nano-banana-examples.ts` file with 10 perfect examples

---

### Step 3.2: Update Concept Generation Route
**Status:** ⏳ Pending  
**Estimated Time:** 60 minutes  
**File:** `app/api/maya/generate-concepts/route.ts`

**Tasks:**
- [ ] Locate Pro mode system prompt building section (around line 2200-2400)
- [ ] Add import: `import { getNanoBananaPerfectExamples } from '@/lib/maya/nano-banana-examples'`
- [ ] Replace entire Pro mode prompt instruction section with:
  - Get examples: `const nanoBananaExamples = getNanoBananaPerfectExamples()`
  - Build new prompt instruction using examples
  - Include critical rules from documentation
- [ ] DELETE old prompt instructions mentioning:
  - "extract components"
  - "build outfit section"
  - "use templates"
  - Complex structure rules
- [ ] Update prompt to reference examples only

**Validation:**
- [ ] File compiles without errors
- [ ] Pro mode uses new examples-based system
- [ ] Old extraction logic removed
- [ ] System prompt includes examples correctly

**Deliverable:** Updated `generate-concepts/route.ts` using examples

---

## 🔧 Phase 4: Simplify Core Functions

### Step 4.1: Simplify buildBrandScenePrompt()
**Status:** ⏳ Pending  
**Estimated Time:** 45 minutes  
**File:** `lib/maya/nano-banana-prompt-builder.ts`

**Tasks:**
- [ ] Locate `buildBrandScenePrompt()` function
- [ ] REPLACE entire function with simple 20-line version:
  - Accept `userRequest` and `inputImages`
  - Light cleaning: remove `**`, "Note:", "CRITICAL:"
  - Add multi-image instruction if needed
  - Return cleaned prompt
- [ ] DELETE all detection logic:
  - `isGenericPrompt`
  - `isMayaDetailedPrompt`
  - Extraction/rebuilding logic
- [ ] Remove complex conditional branches
- [ ] Simplify to ~20 lines max

**Validation:**
- [ ] Function is <25 lines
- [ ] No extraction/rebuilding logic
- [ ] Compiles without errors
- [ ] Function signature unchanged (backward compatible)

**Deliverable:** Simplified `buildBrandScenePrompt()` function (~20 lines)

---

### Step 4.2: Simplify cleanStudioProPrompt()
**Status:** ⏳ Pending  
**Estimated Time:** 30 minutes  
**File:** `lib/maya/nano-banana-prompt-builder.ts`

**Tasks:**
- [ ] Locate `cleanStudioProPrompt()` function
- [ ] REPLACE with minimal 15-line version:
  - Remove `**` bold formatting
  - Remove "Note:" sections
  - Remove "CRITICAL:" sections
  - Remove empty lines
  - Trim
- [ ] DELETE all complex logic:
  - Black/white detection
  - "Visible pores" fix logic
  - Complex regex replacements
  - Bullet point removal
  - Numbered list removal
  - Sentence structure fixes
- [ ] Keep function signature unchanged

**Validation:**
- [ ] Function is <20 lines
- [ ] Only removes formatting (no rebuilding)
- [ ] Compiles without errors
- [ ] Function signature unchanged

**Deliverable:** Simplified `cleanStudioProPrompt()` function (~15 lines)

---

## ✅ Phase 5: Add Validation

### Step 5.1: Create Validator File
**Status:** ⏳ Pending  
**Estimated Time:** 30 minutes  
**File:** `lib/maya/nano-banana-validator.ts` (NEW)

**Tasks:**
- [ ] Create new file `lib/maya/nano-banana-validator.ts`
- [ ] Add file header documentation
- [ ] Create `PromptValidation` interface:
  - `isValid: boolean`
  - `errors: string[]`
  - `warnings: string[]`
  - `wordCount: number`
- [ ] Create `validateNanoBananaPrompt()` function:
  - Check for attachment reference format
  - Check for lighting description
  - Check for aesthetic description
  - Validate word count (100-250 words)
  - Check for over-formatting
- [ ] Export both interface and function

**Validation:**
- [ ] File compiles without errors
- [ ] All validation checks implemented
- [ ] Exports are correct

**Deliverable:** New `nano-banana-validator.ts` file

---

### Step 5.2: Integrate Validation
**Status:** ⏳ Pending  
**Estimated Time:** 30 minutes  
**File:** `app/api/maya/generate-concepts/route.ts`

**Tasks:**
- [ ] Add import: `import { validateNanoBananaPrompt } from '@/lib/maya/nano-banana-validator'`
- [ ] Find where concepts are generated (after Maya generates concepts)
- [ ] Add validation loop:
  - Loop through all concepts
  - Call `validateNanoBananaPrompt()` for each
  - Log validation results
  - Log warnings/errors
- [ ] Add console logging for debugging
- [ ] Consider retry logic if validation fails (optional)

**Validation:**
- [ ] Validation runs after concept generation
- [ ] Results are logged correctly
- [ ] No performance impact
- [ ] File compiles without errors

**Deliverable:** Validation integrated into concept generation

---

## 🧹 Phase 6: Final Cleanup & Testing

### Step 6.1: Verify File Sizes
**Status:** ⏳ Pending  
**Estimated Time:** 10 minutes

**Tasks:**
- [ ] Check line count of `nano-banana-prompt-builder.ts` (should be <200 lines)
- [ ] Compare before/after line counts
- [ ] Verify deleted functions are gone
- [ ] Confirm no broken references

**Deliverable:** Before/after comparison table

---

### Step 6.2: Code Review & Linting
**Status:** ⏳ Pending  
**Estimated Time:** 15 minutes

**Tasks:**
- [ ] Run linter on all modified files
- [ ] Fix any TypeScript errors
- [ ] Fix any linting warnings
- [ ] Verify all imports are correct
- [ ] Check for unused imports

**Deliverable:** Clean code with no errors/warnings

---

### Step 6.3: Test Implementation
**Status:** ⏳ Pending  
**Estimated Time:** 30 minutes

**Tasks:**
- [ ] Generate 6 concepts in Pro Mode
- [ ] Check console logs for validation results
- [ ] Verify prompts are detailed and specific:
  - Check for specific brands mentioned
  - Check for detailed outfit descriptions
  - Check for lighting descriptions
  - Check word count (150-200 words)
- [ ] Verify NO extraction/rebuilding in logs
- [ ] Confirm prompts go straight to Replicate (after light cleaning)
- [ ] Test image generation with new prompts

**Deliverable:** Test results with sample prompts

---

## 📊 Success Metrics

### Code Simplification
- ✅ `nano-banana-prompt-builder.ts`: <200 lines (from 800+)
- ✅ Extraction functions: DELETED
- ✅ Template system: REMOVED
- ✅ Complex logic: SIMPLIFIED

### Prompt Quality
- ✅ Prompts are 150-200 words
- ✅ Specific brands mentioned
- ✅ Detailed outfit/hair/lighting descriptions
- ✅ Natural language (no templates)
- ✅ No generic descriptions

### Process Simplification
- ✅ Maya generates → Light clean → Validate → Use
- ✅ NO extraction → NO rebuilding → NO templates
- ✅ Trust Claude's intelligence

---

## 🚨 Risks & Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation:** 
- Keep function signatures unchanged where possible
- Test thoroughly after each phase
- Review all imports/references before deleting

### Risk 2: Prompts Still Generic
**Mitigation:**
- Verify examples are included in system prompt
- Check Maya's output before cleaning
- Add detailed logging
- Test with multiple concept generations

### Risk 3: Performance Impact
**Mitigation:**
- Validation is lightweight (just checks)
- Cleaning is minimal (regex only)
- No complex processing added

---

## 📝 Implementation Order

**Execute phases sequentially:**

1. **Phase 1:** Analysis (understand current state)
2. **Phase 2:** Delete complex code (remove bloat)
3. **Phase 3:** Create examples system (new foundation)
4. **Phase 4:** Simplify functions (core changes)
5. **Phase 5:** Add validation (quality check)
6. **Phase 6:** Cleanup & test (final verification)

**Do NOT skip phases - each builds on the previous.**

---

## 📦 Files Modified/Created

### Files to DELETE:
- `lib/maya/direct-prompt-generation-integration-example.ts`
- `lib/maya/prompt-builders/pro-prompt-builder.ts` (if exists)
- `lib/maya/*.backup-*` (if any)
- Functions from `nano-banana-prompt-builder.ts` (extraction/rebuilding)

### Files to CREATE:
- `lib/maya/nano-banana-examples.ts` (NEW)
- `lib/maya/nano-banana-validator.ts` (NEW)

### Files to MODIFY:
- `lib/maya/nano-banana-prompt-builder.ts` (simplify)
- `app/api/maya/generate-concepts/route.ts` (use examples)

---

## ✅ Final Checklist

Before marking as complete:

- [ ] All phases completed
- [ ] Code compiles without errors
- [ ] No linting warnings
- [ ] File sizes reduced significantly
- [ ] Prompts are detailed and specific (tested)
- [ ] Validation working correctly
- [ ] No broken imports/references
- [ ] Before/after comparison documented
- [ ] Test results documented

---

## 🎯 Expected Timeline

**Total Estimated Time:** 4-5 hours

- Phase 1 (Analysis): 25 minutes
- Phase 2 (Delete): 40 minutes  
- Phase 3 (Examples): 105 minutes
- Phase 4 (Simplify): 75 minutes
- Phase 5 (Validation): 60 minutes
- Phase 6 (Testing): 55 minutes

**Note:** Times are estimates. Allow extra time for debugging and testing.

---

## 📚 Reference Documentation

- Primary: `/docs/maya/CURSOR_MAYA_FIX_COMPLETE.md`
- Examples format: See Phase 3.1 in documentation
- Validation rules: See Phase 5.1 in documentation
- Before/After comparison: See documentation section

---

**Ready to begin implementation when approved!** 🚀


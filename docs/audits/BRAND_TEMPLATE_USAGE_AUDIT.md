# Brand Template Usage Audit Report

**Date:** Generated automatically  
**Purpose:** Identify all places where brand templates constrain Maya's creativity vs. providing reference information

---

## Summary

### Files That CONSTRAIN Maya (BAD - Need Removal)
These files use templates to **force** Maya to follow specific structures or formats, limiting her creative freedom.

### Files That Provide REFERENCE (GOOD - Can Keep)
These files use templates as **examples** or **guidance** without forcing Maya to follow them exactly.

### Admin UI Features (GOOD - Keep)
These are admin-facing features for template management and reference.

---

## Detailed Findings

### 1. `app/api/maya/generate-concepts/route.ts`

**Lines:** 1129-1524  
**Functions Used:**
- `detectCategoryAndBrand()` - Line 1129, 1489
- `getAllTemplatesForCategory()` - Lines 1199, 1213, 1290, 1300, 1315, 1395, 1493
- `getBrandTemplate()` - Lines 1193, 1194, 1209, 1286, 1309, 1310, 1387
- `ALL_BRAND_TEMPLATES` - Imported but not directly used
- Direct template imports (AIRPORT_*, LUXURY_DESTINATION_*, VENICE_*, THAILAND_*, CHRISTMAS_*) - Lines 11, 33, 51

**How Templates Are Used:**

1. **Brand Detection & Guidance (Lines 1129-1172):**
   - Detects brand from user request
   - If confidence >= 0.7, generates **MANDATORY** brand guidance with:
     - "MANDATORY: You MUST include the brand name..."
     - "ALWAYS mention [brand] by name"
     - Forces specific brand aesthetic and style
   - **VERDICT: CONSTRAINING** - Forces Maya to mention brands and follow specific styles

2. **Template Example Generation (Lines 1177-1524):**
   - Loads templates based on category/brand detection
   - Generates 20-30 example prompts from templates
   - **Injects these into system prompt** at lines 2089-2127 with:
     - "ABSOLUTE REQUIREMENTS (NO EXCEPTIONS)"
     - "Your prompts MUST have the SAME structure"
     - "DO NOT deviate from these examples - they override ALL other instructions"
     - "If your generated prompts don't match these examples... they will be REJECTED"
   - **VERDICT: HIGHLY CONSTRAINING** - Forces Maya to copy template structure exactly

**Recommendation:** ⚠️ **REMOVE** template-based constraint system. Replace with optional reference examples that Maya can use for inspiration only.

---

### 2. `lib/maya/nano-banana-prompt-builder.ts`

**Lines:** 591-613  
**Functions Used:**
- `detectCategoryAndBrand()` - Line 591
- `getBrandTemplate()` - Line 597

**How Templates Are Used:**

1. **Brand-Scene Mode (Lines 589-613):**
   - In `brand-scene` mode, detects brand from user request
   - If confidence >= 0.7, uses `getBrandTemplate()` to get template
   - **Directly replaces** `optimizedPrompt` with `template.promptStructure(context)`
   - Completely replaces user's request with template-generated prompt
   - **VERDICT: HIGHLY CONSTRAINING** - Overwrites user intent with template structure

**Recommendation:** ⚠️ **REMOVE** or modify to use brand info as reference only, not replace user's prompt.

---

### 3. `components/admin/prompt-builder-chat.tsx`

**Lines:** 190-240, 1102  
**Functions Used:**
- `getAllTemplatesForCategory()` - Line 194, 217
- `detectCategoryAndBrand()` - Line 1102

**How Templates Are Used:**

1. **Template Loading for Admin UI (Lines 190-240):**
   - Loads templates for display in admin UI
   - Shows template previews, titles, descriptions
   - Used for admin to **view and select** templates
   - Templates shown in UI dropdown/list
   - **VERDICT: ADMIN UI FEATURE** - ✅ **KEEP** - This is for admin reference/selection

2. **Brand Detection (Line 1102):**
   - Used in chat to detect brand from input
   - Likely for auto-filling form fields or suggestions
   - **VERDICT: ADMIN UI FEATURE** - ✅ **KEEP** - Helper for admin tool

**Recommendation:** ✅ **KEEP** - Admin UI features should remain.

---

### 4. `lib/admin/universal-prompts-loader.ts`

**Lines:** 8-139  
**Functions Used:**
- `getAllTemplatesForCategory()` - Lines 48, 74
- `getBrandTemplate()` - Lines 98, 113

**How Templates Are Used:**

1. **Admin Prompt Builder Support (Lines 17-139):**
   - Loads templates to pass to `generate-concepts` API
   - Generates example prompts from templates
   - These examples are passed as `templateExamples` parameter
   - Used by admin to provide template examples to concept generation
   - **VERDICT: ADMIN UI FEATURE** - ✅ **KEEP** - Admin explicitly choosing to provide examples

**Recommendation:** ✅ **KEEP** - But note that `generate-concepts` route should treat these as optional inspiration, not mandatory requirements.

---

### 5. `backup-before-cleanup/generate-concepts-route.ts`

**Lines:** Multiple  
**Functions Used:** Same as `app/api/maya/generate-concepts/route.ts`

**How Templates Are Used:**
- Backup file - same usage patterns as current route
- **VERDICT: BACKUP FILE** - Can be ignored for cleanup

**Recommendation:** ⚠️ **IGNORE** - Backup file, will be cleaned up separately.

---

### 6. Documentation Files

**Files:**
- `docs/MAYA-PRO-PROMPTING-AUDIT-PART1.md` - Lines 42, 50, 298, 299
- `docs/HIGH-END-BRAND-PROMPTS.md` - Multiple references

**How Templates Are Used:**
- Documentation explaining template system
- **VERDICT: DOCUMENTATION** - ✅ **KEEP** for reference

**Recommendation:** ✅ **KEEP** - Documentation should remain, but may need updates after cleanup.

---

## Constraining Usage Patterns

### Pattern 1: Mandatory Brand Enforcement
**Location:** `app/api/maya/generate-concepts/route.ts:1132-1172`
```typescript
if (brandIntent.confidence >= 0.7 && brandIntent.suggestedBrands.length > 0) {
  // Generates: "MANDATORY: You MUST include the brand name..."
  // "ALWAYS mention [brand] by name"
}
```
**Issue:** Forces Maya to include brand names even when not in user request.

---

### Pattern 2: Template Structure Enforcement
**Location:** `app/api/maya/generate-concepts/route.ts:2089-2127`
```typescript
templateExamples.length > 0 && studioProMode && !detectedGuidePrompt
  ? `
=== PROMPT TEMPLATE EXAMPLES ===
**ABSOLUTE REQUIREMENTS (NO EXCEPTIONS):**
1. Your prompts MUST have the SAME structure
2. DO NOT deviate from these examples - they override ALL other instructions
3. If your generated prompts don't match these examples... they will be REJECTED
`
```
**Issue:** Forces Maya to copy template structure exactly, destroying creative freedom.

---

### Pattern 3: Direct Prompt Replacement
**Location:** `lib/maya/nano-banana-prompt-builder.ts:597-613`
```typescript
const template = getBrandTemplate(templateId)
optimizedPrompt = template.promptStructure(context) // Replaces user's prompt
```
**Issue:** Completely replaces user's creative intent with template-generated prompt.

---

## Reference-Only Usage Patterns

### Pattern 1: Admin UI Display
**Location:** `components/admin/prompt-builder-chat.tsx:190-240`
- Loads templates for display
- Shows previews for admin selection
- ✅ **GOOD** - Admin can choose to use or not

---

### Pattern 2: Optional Template Examples
**Location:** `lib/admin/universal-prompts-loader.ts`
- Loads templates when admin explicitly requests
- Passes as optional `templateExamples` parameter
- ⚠️ **PROBLEM:** Current implementation treats these as mandatory in generate-concepts route

---

## Recommendations Summary

### 🔴 HIGH PRIORITY - Remove Constraining Usage

1. **`app/api/maya/generate-concepts/route.ts`** (Lines 1129-1524, 2089-2127)
   - **Action:** Remove mandatory brand enforcement
   - **Action:** Convert template examples from "MUST follow" to "optional inspiration"
   - **Action:** Remove template structure enforcement language

2. **`lib/maya/nano-banana-prompt-builder.ts`** (Lines 591-613)
   - **Action:** Remove direct prompt replacement in `brand-scene` mode
   - **Action:** Use brand info as optional reference, not mandatory structure

### ✅ KEEP - Reference/Admin Features

1. **`components/admin/prompt-builder-chat.tsx`** - Admin UI for template viewing
2. **`lib/admin/universal-prompts-loader.ts`** - Admin can provide examples (but route should treat as optional)
3. **Documentation files** - Keep for reference

### 🔧 MODIFY - Make Optional

1. **Template Examples System:**
   - Keep ability to pass `templateExamples` parameter
   - Change system prompt language from "MUST follow" to "use as inspiration"
   - Allow Maya to deviate from templates when user request differs

---

## Impact Assessment

### If We Remove Template Constraints:

**Benefits:**
- ✅ Maya can be truly creative based on user requests
- ✅ No forced brand mentions when user doesn't want them
- ✅ No forced template structures limiting variety
- ✅ Better alignment with user's actual intent

**Risks:**
- ⚠️ Maya might not consistently use brand names (but this is OK if user didn't ask for brand)
- ⚠️ Prompts might vary more in structure (but this is GOOD - shows creativity)
- ⚠️ Admin might lose "guarantee" that prompts match templates (but templates should be inspiration, not requirement)

### Migration Path:

1. Change system prompt language from "MUST" to "consider as inspiration"
2. Remove mandatory brand enforcement
3. Keep template loading but make it optional guidance
4. Update admin docs to clarify templates are examples, not requirements

---

## Next Steps

1. ✅ **AUDIT COMPLETE** - This report
2. ⏭️ **NEXT:** Remove constraining template usage from `app/api/maya/generate-concepts/route.ts`
3. ⏭️ **NEXT:** Modify `lib/maya/nano-banana-prompt-builder.ts` to use brand info as reference
4. ⏭️ **NEXT:** Update system prompt language to make templates optional inspiration
5. ⏭️ **NEXT:** Test that Maya can still use templates when appropriate, but isn't forced


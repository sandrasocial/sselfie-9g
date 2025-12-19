# Maya Pro Mode Prompting System - Complete Audit

## Executive Summary

**Problem:** Maya is creating prompts in Studio Pro mode that do NOT use the 100+ prompt examples/templates that have been created for each category. She's generating generic prompts instead of following the structured template examples.

**Root Cause:** The prompt template system exists but is NOT being integrated into Maya's concept generation flow. Maya receives generic instructions but not the actual template examples.

---

## Current Architecture

### 1. Template System Location
**Location:** `lib/maya/prompt-templates/`

**Structure:**
```
lib/maya/prompt-templates/
├── index.ts                          # Main export (exports ALL_TEMPLATES)
├── types.ts                          # TypeScript interfaces
├── helpers.ts                        # Utility functions
├── carousel-prompts.ts              # Carousel templates
├── ugc-prompts.ts                   # UGC templates
├── product-mockup-prompts.ts        # Product mockup templates
├── brand-partnership-prompts.ts     # Brand partnership templates
├── reel-cover-prompts.ts            # Reel cover templates
├── high-end-brands/
│   ├── index.ts                     # Brand templates export
│   ├── brand-registry.ts            # Brand profiles & metadata
│   ├── category-mapper.ts           # detectCategoryAndBrand() function
│   ├── wellness-brands.ts           # Alo Yoga, Lululemon templates
│   ├── luxury-brands.ts             # Chanel, Dior templates
│   ├── lifestyle-brands.ts          # Glossier, Free People templates
│   ├── fashion-brands.ts            # Reformation, Everlane, Aritzia templates
│   ├── beauty-brands.ts             # Beauty brand templates
│   ├── tech-brands.ts               # Tech brand templates
│   ├── selfies.ts                   # Selfie templates
│   ├── travel-lifestyle.ts          # Airport/travel templates (100+ examples)
│   └── seasonal-christmas.ts        # Christmas templates
└── CATEGORIES_AND_TEMPLATES.md      # Documentation
```

### 2. Template Structure

Each template follows this structure:
```typescript
export const TEMPLATE_NAME: PromptTemplate = {
  id: "template_id",
  name: "Template Name",
  description: "Description",
  useCases: ["use case 1", "use case 2"],
  requiredImages: { min: 1, max: 2, types: ["user_lora", "inspiration"] },
  promptStructure: (context: PromptContext): string => {
    // Returns a complete prompt string
    return `Woman, maintaining exactly the characteristics...`
  },
  variations?: PromptVariation[]
}
```

**Key Files with Examples:**
- `travel-lifestyle.ts` - Contains 100+ airport/travel prompt examples
- `wellness-brands.ts` - Contains Alo Yoga, Lululemon examples
- `luxury-brands.ts` - Contains Chanel, Dior examples
- `seasonal-christmas.ts` - Contains Christmas examples

### 3. Current Usage in Code

**✅ What IS Being Used:**
1. `detectCategoryAndBrand()` - Called in `generate-concepts/route.ts` (line 245)
   - Detects category and brand from user request
   - Returns `CategoryDetectionResult` with suggested brands
   - **BUT:** Only used to add brand name guidance, NOT to load templates

2. `getBrandTemplate()` - Exists in `high-end-brands/index.ts`
   - Can retrieve a template by ID
   - **BUT:** NOT being called anywhere in concept generation

3. `ALL_BRAND_TEMPLATES` - Exists in `high-end-brands/index.ts`
   - Contains all brand templates
   - **BUT:** NOT being used in concept generation

**❌ What is NOT Being Used:**
1. **Template Examples:** The actual prompt examples from templates are NOT being passed to Maya
2. **Template Structure:** The `promptStructure()` functions are NOT being called
3. **Category Templates:** Templates for detected categories are NOT being loaded
4. **Example Prompts:** The 100+ example prompts are NOT being shown to Maya as guidance

---

## Current Concept Generation Flow

### File: `app/api/maya/generate-concepts/route.ts`

**Current Flow:**
1. **Line 245:** `detectCategoryAndBrand()` is called
2. **Lines 248-288:** If brand detected (confidence >= 0.7), adds `brandGuidance` string
   - This guidance includes brand name, visual aesthetic, style guide
   - **BUT:** Does NOT include actual template examples
3. **Lines 600-1300:** System prompt is built with:
   - Generic Nano Banana Pro principles
   - Brand guidance (if detected)
   - Generic prompt structure instructions
   - **BUT:** NO template examples are included
4. **Line 1328:** Maya generates concepts using `generateText()`
   - Maya receives instructions but NOT the actual template examples
   - Maya creates prompts from scratch instead of following examples

**The Problem:**
- Maya receives: "Create prompts like this format..."
- Maya does NOT receive: "Here are 5-10 actual example prompts to follow..."
- Result: Maya creates generic prompts that don't match the template style

---

## What Needs to Change

### 1. Load Templates Based on Detected Category/Brand

**Location:** `app/api/maya/generate-concepts/route.ts`

**After line 245** (after `detectCategoryAndBrand()`):
- Load relevant templates for the detected category
- Load templates for detected brand (if any)
- Extract example prompts from templates

**Example:**
```typescript
// After detectCategoryAndBrand()
const categoryTemplates = getAllTemplatesForCategory(brandIntent.category)
const brandTemplate = brandIntent.suggestedBrands[0] 
  ? getBrandTemplate(brandIntent.suggestedBrands[0].id) 
  : null

// Get example prompts from templates
const examplePrompts = []
if (brandTemplate) {
  // Use brand template's promptStructure to generate examples
  const exampleContext: PromptContext = {
    userImages: [],
    contentType: "concept",
    userIntent: userRequest || ""
  }
  examplePrompts.push(brandTemplate.promptStructure(exampleContext))
}
```

### 2. Include Template Examples in System Prompt

**Location:** `app/api/maya/generate-concepts/route.ts`

**In the system prompt construction (around line 600-1300):**
- Add a section: "PROMPT TEMPLATE EXAMPLES"
- Include 5-10 actual example prompts from relevant templates
- Make it clear: "Follow these examples EXACTLY in structure and style"

**Example:**
```typescript
const templateExamplesSection = examplePrompts.length > 0 ? `

=== 🔴 CRITICAL: PROMPT TEMPLATE EXAMPLES ===

You MUST follow these example prompts EXACTLY in structure, style, and format.
These are the ONLY acceptable prompt formats for this category.

**EXAMPLE PROMPTS:**

${examplePrompts.map((ex, i) => `${i + 1}. ${ex}`).join('\n\n')}

**REQUIREMENTS:**
- Use the SAME structure as these examples
- Use the SAME style and tone
- Use the SAME level of detail
- Match the SAME format (sections, organization, etc.)
- DO NOT create prompts that deviate from these examples

` : ''
```

### 3. Use Template Structure Functions

**Location:** `app/api/maya/generate-concepts/route.ts`

**Instead of:** Maya generating prompts from scratch
**Do:** Use template's `promptStructure()` function to generate base prompts, then let Maya create variations

**OR:**

**Keep current flow BUT:** Show Maya the template examples so she can match the style

---

## Files That Need Changes

### Primary Changes

1. **`app/api/maya/generate-concepts/route.ts`**
   - Import template functions: `getAllTemplatesForCategory`, `getBrandTemplate`
   - Load templates after category/brand detection
   - Extract example prompts from templates
   - Add template examples section to system prompt
   - **Lines to modify:** ~245-290 (after brand detection), ~600-1300 (system prompt construction)

2. **`lib/maya/prompt-templates/high-end-brands/index.ts`**
   - Verify `getAllTemplatesForCategory()` works correctly
   - May need to add helper to extract example prompts from templates

### Secondary Changes (if needed)

3. **`lib/maya/prompt-templates/helpers.ts`**
   - May need helper function to extract/generate example prompts from templates

4. **`lib/maya/studio-pro-system-prompt.ts`**
   - May need to reference template examples in system prompt

---

## Template Examples Available

### Travel Lifestyle (100+ examples)
- **File:** `lib/maya/prompt-templates/high-end-brands/travel-lifestyle.ts`
- **Templates:** 
  - `AIRPORT_IT_GIRL`
  - `AIRPORT_EDITORIAL_WALK`
  - `AIRPORT_GOLDEN_HOUR`
  - `AIRPORT_FLOOR_SELFIE`
  - `AIRPORT_VOGUE_EDITORIAL`
  - Plus many more variations

### Wellness Brands
- **File:** `lib/maya/prompt-templates/high-end-brands/wellness-brands.ts`
- **Templates:**
  - `ALO_YOGA_LIFESTYLE`
  - `LULULEMON_LIFESTYLE`

### Luxury Brands
- **File:** `lib/maya/prompt-templates/high-end-brands/luxury-brands.ts`
- **Templates:**
  - `CHANEL_EDITORIAL`
  - `DIOR_ROMANTIC`

### Lifestyle Brands
- **File:** `lib/maya/prompt-templates/high-end-brands/lifestyle-brands.ts`
- **Templates:**
  - `GLOSSIER_CLEAN_GIRL`
  - `FREE_PEOPLE_BOHEMIAN`

### Fashion Brands
- **File:** `lib/maya/prompt-templates/high-end-brands/fashion-brands.ts`
- **Templates:**
  - `REFORMATION_FEMININE`
  - `EVERLANE_MINIMAL`
  - `ARITZIA_ELEVATED`

### Seasonal
- **File:** `lib/maya/prompt-templates/high-end-brands/seasonal-christmas.ts`
- **Templates:**
  - `CHRISTMAS_COZY_LUXURY`
  - `CHRISTMAS_PINTEREST_EDITORIAL`
  - `CHRISTMAS_ELEGANT_EVENING`
  - `CHRISTMAS_WHITE_MINIMAL`

---

## Implementation Plan

### Phase 1: Load Templates
1. After `detectCategoryAndBrand()` call, load relevant templates
2. Extract example prompts from templates using `promptStructure()` function
3. Store examples in a variable

### Phase 2: Include in System Prompt
1. Add template examples section to system prompt
2. Make it clear these are MANDATORY examples to follow
3. Include 5-10 examples (not just 1-2)

### Phase 3: Test & Refine
1. Test with different categories (travel, wellness, luxury, etc.)
2. Verify Maya follows examples
3. Adjust examples shown if needed

---

## Key Questions to Answer

1. **How many examples to show?**
   - Recommendation: 5-10 examples per category
   - Too few = Maya might not understand the pattern
   - Too many = Token limit issues

2. **Should we use `promptStructure()` or show static examples?**
   - Option A: Generate examples using `promptStructure()` with different contexts
   - Option B: Include static example prompts in templates
   - Recommendation: Option A (more flexible)

3. **What if no category/brand detected?**
   - Fallback to generic lifestyle templates
   - Or show examples from multiple categories

4. **Should examples be in the system prompt or separate?**
   - Recommendation: In system prompt (Maya sees them every time)
   - Could also be in a separate "examples" section

---

## Next Steps

1. ✅ **AUDIT COMPLETE** - This document
2. ⏳ **IMPLEMENTATION** - Modify `generate-concepts/route.ts` to:
   - Load templates after category detection
   - Extract example prompts
   - Include examples in system prompt
3. ⏳ **TESTING** - Test with various categories
4. ⏳ **REFINEMENT** - Adjust based on results

---

## Notes

- The template system is well-structured and ready to use
- The main issue is integration - templates exist but aren't being used
- This should be a relatively straightforward fix (load templates, show examples)
- The hardest part will be deciding how many examples to show and how to format them



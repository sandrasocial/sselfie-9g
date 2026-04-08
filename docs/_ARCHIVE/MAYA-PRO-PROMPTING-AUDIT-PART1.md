# MAYA PRO PROMPTING PIPELINE - PART 1: CURRENT PIPELINE AUDIT

**Date:** January 2025  
**Status:** Comprehensive Audit Complete ✅  
**Next:** Ready for Part 2 Implementation

---

## 📊 EXECUTIVE SUMMARY

**Current State:** Maya Pro uses template-based concept generation with brand templates and AI-generated prompts. While functional, it suffers from repetitive outputs, generic fallbacks, and insufficient diversity in scenes, poses, and styling.

**Target State:** Transform Maya Pro into a dynamic, diverse, creative prompting engine that generates unique, high-quality concepts by intelligently composing elements from the Universal AI Image Prompts collection rather than relying on generic templates.

**Key Metrics:**
- ✅ Universal Prompts: 148 detailed, professional prompts (referenced in admin tools)
- ⚠️ Current Templates: 15-20 static brand templates
- ❌ Diversity Issue: Concepts too similar within single generation
- ❌ Quality Issue: Fallback to generic "woman in outfit at location" patterns

---

## 🔍 PART 1: CURRENT PIPELINE AUDIT

### 1.1 CONCEPT GENERATION FLOW

**File:** `/app/api/maya/generate-concepts/route.ts`

#### Current Process:
```
User Request → Detect Brand/Category → Load Templates → AI Generation → Post-Process → Return Concepts
```

#### Critical Issues Identified:

##### Issue #1: Template Overreliance
**Location:** Lines 479-747

**Current Code Pattern:**
```typescript
// Current code loads templates but AI generates from scratch
const templateExamples = getAllTemplatesForCategory(category)
// Then AI is told to "follow these examples"
// But AI creates new prompts, not compositions
```

**Problem:** Templates are shown as examples but not used as building blocks. AI generates new prompts that often ignore template details.

**Evidence:**
- Templates loaded via `getAllTemplatesForCategory()` (line 503, 517, 593, 618, 660)
- Example prompts generated from templates (lines 722-739)
- But AI receives these as "examples" in system prompt, not as composable elements
- AI then creates entirely new prompts from scratch

**Impact:** 
- Lost opportunity to leverage detailed, professional template structures
- AI may ignore specific template details (lighting, poses, styling)
- Generic fallback when templates don't match perfectly

---

##### Issue #2: No Diversity Mechanism
**Location:** Lines 800-1200 (AI generation section)

**Current Code Pattern:**
```typescript
// Generates 6 concepts in one call
const { text } = await generateText({
  temperature: 0.85, // Only diversity control
  prompt: conceptPrompt
})
```

**Problem:** Single AI call with no diversity enforcement. Concepts within same batch are too similar (same pose type, similar lighting, repetitive styling).

**Evidence:**
- Single `generateText()` call generates all 6 concepts at once
- Only diversity control: `temperature: 0.85`
- No explicit diversity instructions in prompt
- No mechanism to ensure different poses/scenes/styling across concepts

**Impact:**
- Users see 6 very similar concepts
- Same pose type repeated (e.g., all "standing confidently")
- Similar lighting across all concepts
- Repetitive styling patterns

---

##### Issue #3: Generic Fallback Pattern
**Location:** Lines 755-793 (fallback template loading)

**Current Code Pattern:**
```typescript
// When templates not found or brand not detected
"Create diverse concepts following best practices..."
```

**Problem:** Falls back to generic instructions like "woman wearing outfit at location with lighting" - produces bland, repetitive results.

**Evidence:**
- Fallback template loading (lines 755-793) only loads category templates
- If no templates match, system prompt uses generic instructions
- No Universal Prompts collection integration
- Generic fallback lacks specific details (poses, lighting, composition)

**Impact:**
- Generic "woman in outfit at location" patterns
- Missing specific details from Universal Prompts
- Bland, repetitive outputs when brand not detected

---

##### Issue #4: Aggressive Prompt Cleaning
**Location:** `/lib/maya/nano-banana-prompt-builder.ts` lines 92-173

**Current Code Pattern:**
```typescript
// In nano-banana-prompt-builder.ts
export function cleanStudioProPrompt(prompt: string) {
  // Removes formatting, headlines, sections
  cleaned = cleaned.replace(/\*\*[^*]+\*\*/g, '')
  cleaned = cleaned.replace(/^#+\s+.*/gm, '')
}
```

**Problem:** Strips away valuable structure and technical details that make Universal Prompts high-quality.

**Evidence:**
- Removes markdown headlines (line 101-104)
- Removes bold formatting (line 107)
- Removes "Note:" instructions (lines 111-115)
- Removes bullet points and numbered lists (lines 161-162)
- Aggressive whitespace cleanup (lines 155-158)

**Impact:**
- Loses valuable structure from Universal Prompts
- Removes technical details (camera specs, lighting details)
- Flattens rich, structured prompts into plain text
- May remove important composition instructions

---

### 1.2 PROMPT BUILDING PIPELINE

**File:** `/lib/maya/nano-banana-prompt-builder.ts`

#### Current Process:
```
Concept Prompt → Brand Detection → Template Selection → Build Prompt → Clean Prompt → Return
```

#### Critical Issues:

##### Issue #5: Brand Templates Not Dynamic
**Location:** Lines 405-412

**Current Code Pattern:**
```typescript
const BRAND_DEFAULT_TEMPLATE_IDS: Record<string, string> = {
  ALO: 'alo_yoga_lifestyle',
  LULULEMON: 'lululemon_lifestyle',
  CHANEL: 'chanel_editorial',
}
```

**Problem:** One template per brand. No variation within brand (e.g., Chanel has 9 different styles in Universal Prompts).

**Evidence:**
- Hardcoded mapping: one template ID per brand (lines 405-412)
- No mechanism to select different styles within same brand
- No access to Universal Prompts collection for brand variations
- Static template selection

**Impact:**
- Limited brand variation (always same template for Chanel)
- Can't leverage multiple styles per brand
- Misses opportunity for diverse brand expressions

---

##### Issue #6: buildBrandScenePrompt Too Simple
**Location:** Lines 688-795

**Current Code Pattern:**
```typescript
function buildBrandScenePrompt(params) {
  // Detects if Maya's detailed prompt or not
  if (isMayaDetailedPrompt) {
    return cleanStudioProPrompt(userRequest) // Just cleans it
  }
  // Otherwise builds generic prompt
  return `Scene: ${scene}. Mood: ${mood}. Lighting: ${lighting}.`
}
```

**Problem:** Either passes through (losing opportunity to enhance) or creates generic 3-sentence prompt (losing detail).

**Evidence:**
- Detects detailed prompts (lines 700-707) but only cleans them
- Generic fallback (lines 748-794) creates simple 3-part prompt
- No composition from Universal Prompts elements
- No intelligent element selection

**Impact:**
- Detailed prompts lose structure during cleaning
- Generic prompts lack specific details
- No intelligent composition from Universal Prompts

---

##### Issue #7: Scene/Mood/Lighting Too Generic
**Location:** Lines 1249-1298

**Current Code Pattern:**
```typescript
function pickSetting(userRequest: string): string {
  if (userRequest.match(/café|coffee/i)) return 'cozy café'
  if (userRequest.match(/outdoor/i)) return 'outdoor setting'
  return 'indoor setting' // Generic fallback
}
```

**Problem:** Limited vocabulary. Universal Prompts use specific details like "marble table surface", "Parisian-style cafe", "soft bokeh background" - current system uses "café" or "outdoor".

**Evidence:**
- `pickSetting()` returns generic terms (lines 1249-1265)
- `pickMood()` has limited options (lines 1267-1275)
- `pickLighting()` uses basic mapping (lines 1277-1298)
- No access to rich Universal Prompts vocabulary

**Impact:**
- Generic scene descriptions ("café", "outdoor")
- Missing specific details ("marble table", "Parisian-style")
- Limited mood vocabulary
- Basic lighting descriptions

---

### 1.3 CONCEPT CARD SYSTEM

**File:** `/components/sselfie/concept-card.tsx`

#### What Works:

✅ **Concept cards properly show title, description, prompt**
- Lines 1080-1083: Title and description display correctly
- Prompt stored in `concept.prompt` and used for generation

✅ **Image upload/selection works**
- Lines 230-321: Gallery modal and file upload functional
- Supports multiple images (selfies, products, styleRefs)

✅ **Custom settings (aspect ratio, style strength) work**
- Lines 69-72: Custom settings state management
- Lines 468: Aspect ratio passed to API

✅ **Generation triggers correctly**
- Lines 406-636: `handleGenerate()` properly routes to Studio Pro or Classic mode

#### What Doesn't:

❌ **Prompts from Maya are often too similar**
- No diversity mechanism in concept generation
- All 6 concepts use similar prompts
- User sees repetitive results

❌ **No way to "refresh" just one concept with more diversity**
- No individual concept regeneration
- Must regenerate all 6 concepts
- No "similar but different" option

❌ **No "similar but different" regeneration option**
- No variation mechanism
- Can't request "same vibe, different pose"
- Limited user control over diversity

---

## 📋 TEMPLATE SYSTEM ANALYSIS

### Current Template Structure

**Location:** `/lib/maya/prompt-templates/high-end-brands/`

**Template Categories:**
- Wellness Brands (Alo, Lululemon)
- Luxury Brands (Chanel, Dior)
- Lifestyle Brands
- Fashion Brands
- Tech Brands
- Beauty Brands (Glossier)
- Selfies
- Travel Lifestyle
- Seasonal Christmas

**Template Loading:**
- `getAllTemplatesForCategory()` - Returns templates by category
- `getBrandTemplate()` - Returns single template by brand ID
- Templates have `promptStructure()` function that generates prompts

**Limitations:**
1. **Static Templates:** Each template is a fixed structure
2. **Limited Variation:** No mechanism to vary within template
3. **No Composition:** Templates not used as composable elements
4. **Missing Universal Prompts:** No integration with 148 Universal Prompts collection

---

## 🔍 UNIVERSAL PROMPTS COLLECTION

**Status:** Referenced in admin tools but not integrated into concept generation

**Evidence:**
- `components/admin/prompt-builder-chat.tsx` line 16: "Reference the Universal AI Image Prompts collection"
- `docs/PROMPT-GUIDE-BUILDER.md` line 143: "Category dropdown shows all Universal Prompt categories"
- `components/admin/prompt-guides-manager.tsx` line 28: `UNIVERSAL_PROMPT_CATEGORIES` constant

**Current State:**
- Universal Prompts exist in admin system
- Not used in concept generation pipeline
- Not accessible to Maya's prompt building
- No integration with template system

**Opportunity:**
- 148 detailed, professional prompts available
- Rich vocabulary and specific details
- Could be used as composable elements
- Would solve diversity and quality issues

---

## 🎯 KEY FINDINGS SUMMARY

### Critical Issues:
1. ✅ **Template Overreliance** - Templates shown as examples, not used as building blocks
2. ✅ **No Diversity Mechanism** - Single AI call generates similar concepts
3. ✅ **Generic Fallback** - Falls back to bland patterns when templates don't match
4. ✅ **Aggressive Cleaning** - Removes valuable structure from prompts
5. ✅ **Static Brand Templates** - One template per brand, no variation
6. ✅ **Simple Prompt Building** - Either pass-through or generic 3-sentence prompts
7. ✅ **Limited Vocabulary** - Generic scene/mood/lighting terms

### Missing Capabilities:
- ❌ No Universal Prompts integration
- ❌ No intelligent element composition
- ❌ No diversity enforcement mechanism
- ❌ No "similar but different" variation system
- ❌ No individual concept refresh

### Opportunities:
- ✅ 148 Universal Prompts available for integration
- ✅ Rich vocabulary and specific details in Universal Prompts
- ✅ Template system exists but underutilized
- ✅ Concept card system ready for enhanced prompts

---

## ✅ AUDIT COMPLETE

**Status:** Ready for Part 2 Implementation

**Next Steps:**
1. Integrate Universal Prompts collection into concept generation
2. Create intelligent element composition system
3. Implement diversity enforcement mechanism
4. Enhance prompt building with Universal Prompts vocabulary
5. Add "similar but different" variation system

**Files Ready for Modification:**
- `/app/api/maya/generate-concepts/route.ts` - Main concept generation
- `/lib/maya/nano-banana-prompt-builder.ts` - Prompt building logic
- `/components/sselfie/concept-card.tsx` - Concept card UI (for refresh feature)

---

**Audit Date:** January 2025  
**Auditor:** AI Assistant  
**Status:** ✅ Complete - Ready for Part 2

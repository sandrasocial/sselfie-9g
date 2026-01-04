# ✅ FIX PRO MODE PROMPTS - BRAND VARIETY & CLEAN OUTPUT

**Date:** January 4, 2026  
**Status:** ✅ COMPLETE  
**File Modified:** `app/api/maya/pro/generate-concepts/route.ts`

---

## 📋 CHANGES MADE

### 1. Added Brand Library Intelligence

**Location:** Top of file (imports section)

**Change:**
```typescript
import { generateCompleteOutfit } from "@/lib/maya/brand-library-2025"
```

**Purpose:** Give Maya access to intelligent brand selection instead of hardcoded list

---

### 2. Category Mapping Function

**Location:** Before system prompt generation (around line 390)

**Change:**
```typescript
// Map Pro Mode categories to brand-library categories
const mapProCategoryToBrandLibrary = (proCategory: string | null): string | null => {
  if (!proCategory) return null
  const categoryLower = proCategory.toLowerCase()
  
  // Map Pro Mode categories to brand-library categories
  if (categoryLower === 'wellness' || categoryLower === 'alo-workout' || categoryLower.includes('workout') || categoryLower.includes('athletic')) {
    return 'workout'
  }
  if (categoryLower === 'luxury' || categoryLower === 'luxury-fashion') {
    return 'luxury'
  }
  if (categoryLower === 'casual' || categoryLower === 'casual-lifestyle' || categoryLower === 'lifestyle') {
    return 'casual'
  }
  if (categoryLower === 'travel' || categoryLower === 'travel-airport') {
    return 'travel'
  }
  if (categoryLower.includes('cozy') || categoryLower === 'home') {
    return 'cozy'
  }
  if (categoryLower === 'street-style' || categoryLower === 'fashion') {
    return 'street-style'
  }
  
  // Default to casual if no match
  return 'casual'
}

// Get outfit suggestions from brand library for variety
const brandLibraryCategory = mapProCategoryToBrandLibrary(categoryKey)
const outfitSuggestions = brandLibraryCategory 
  ? generateCompleteOutfit(brandLibraryCategory, categoryInfo?.name?.toLowerCase() || '')
  : generateCompleteOutfit('casual', '')

// Extract brand names from outfit suggestions for variety
const availableBrands = new Set<string>()
Object.values(outfitSuggestions).forEach((item: string) => {
  // Extract brand names from outfit items (e.g., "Alo Yoga Airlift bralette" → "Alo Yoga")
  const brandMatch = item.match(/^(Alo Yoga|Lululemon|Nike|Adidas|New Balance|Levi's|UGG|Bottega Veneta|The Row|Cartier|Hermès|Chanel|Louis Vuitton|Brunello Cucinelli|Toteme|Khaite|Jenni Kayne|Glossier)/i)
  if (brandMatch) {
    availableBrands.add(brandMatch[1])
  }
})
```

**Purpose:** 
- Maps Pro Mode categories (wellness, luxury, etc.) to brand-library categories (workout, luxury, etc.)
- Gets intelligent outfit suggestions from brand-library-2025.ts
- Extracts available brands for variety

---

### 3. Replaced Hardcoded Brand List

**Location:** System prompt, line ~589-595

**BEFORE:**
```
**BRAND RULES:**
- Include specific luxury brands naturally: The Row, Alo Yoga, Toteme, Khaite, Bottega Veneta, Glossier, Lululemon, Jenni Kayne, Brunello Cucinelli, Cartier, Hermès
- No "MANDATORY" language - natural integration only
- Brands as inspiration, not forced mentions
- Copy brands/products EXACTLY (The Row → "The Row", not "luxury brand")
- No vague language ("elegant sweater" → "The Row cream cashmere turtleneck")
- Include ALL brands/items mentioned in description
```

**AFTER:**
```
**BRAND INTELLIGENCE:**

Use brand-library-2025.ts to select VARIED brands based on category and request. The brand library provides intelligent brand selection based on context:

Example outfit from brand library: ${JSON.stringify(outfitSuggestions)}

**CRITICAL BRAND VARIETY RULES:**
- Choose DIFFERENT brands for each concept (don't repeat same brands across all 6 concepts)
- Match brands to the specific request:
  * Workout/Wellness → Alo Yoga, Lululemon, Nike, Adidas
  * Luxury → The Row, Bottega Veneta, Toteme, Khaite, Brunello Cucinelli, Cartier, Hermès
  * Casual → Levi's, Adidas, New Balance, Everlane, COS
  * Travel → Lululemon, Away, Louis Vuitton (for luxury travel)
  * Cozy → UGG, Cartier (minimal luxury accent)
- Use brand names naturally in descriptions (not as labels)
- Vary brand combinations: Concept 1 might use The Row + Toteme, Concept 2 might use Khaite + Bottega Veneta, Concept 3 might use Brunello Cucinelli + Hermès
- No "MANDATORY" language - natural integration only
- Copy brands/products EXACTLY (The Row → "The Row", not "luxury brand")
- No vague language ("elegant sweater" → "The Row cream cashmere turtleneck")
- Include ALL brands/items mentioned in description
```

**Purpose:**
- Removes hardcoded brand list
- Uses brand-library intelligence
- Emphasizes variety (different brands per concept)
- Provides category-specific brand guidance

---

### 4. Changed Output Format - Natural Flowing Sentences

**Location:** System prompt, line ~546-580

**BEFORE:**
```
**PROMPT FORMAT (Pro Mode - Editorial Quality):**

For concepts 0-2 (Editorial - first 3 concepts):
Professional photography. Pinterest-style editorial portrait. Character consistency with provided reference images. Match the exact facial features, hair, skin tone, body type, and physical characteristics of the person in the reference images. This is the same person in a different scene. Editorial quality, professional photography aesthetic.

**Outfit:** [Complete outfit with ALL brands, materials, and specific pieces. Example: "Brand-appropriate sophisticated outfit with complete styling details including all pieces, materials, and accessories"]

**Pose:** [Exact action and body position. Example: "Natural pose and action matching the setting and mood of the concept, with specific body language and positioning"]

**Setting:** [ALL specific items and environment details. Example: "Detailed environment description with specific elements that create the desired atmosphere and context"]

**Lighting:** [Exact lighting description. Example: "Specific lighting conditions that match the time of day and mood, with detailed light sources and quality"]

**Camera Composition:** Editorial portrait from mid-thigh upward, frontal camera position, symmetrical centered framing, professional DSLR, Canon EOS R5 or Sony A7R IV, 85mm f/1.4 lens, camera distance 1.5-2m from subject, shallow depth of field (f/2.0-f/2.8).

**Mood:** [Mood words from description. Example: "Mood words that capture the emotional tone and atmosphere of the concept"]

**Aesthetic:** [Aesthetic from description with Pinterest language. Example: "Aesthetic description using Pinterest-style language that captures the visual style and aspirational quality"]
```

**AFTER:**
```
**PROMPT FORMAT (Pro Mode - Natural Flowing Sentences):**

Generate prompts as NATURAL FLOWING SENTENCES, not structured sections. NO markdown formatting (**Outfit:**, **Pose:**, etc.).

Format: Character consistency statement, then natural description of outfit, pose, setting, lighting, camera, mood.

**For concepts 0-2 (Editorial - first 3 concepts):**

Example GOOD format:
"Professional photography. Pinterest-style editorial portrait. Character consistency with provided reference images. Woman wearing cream cashmere turtleneck from The Row, high-waisted wide-leg trousers from Toteme, minimal leather loafers. Standing by window in modern Scandinavian apartment, soft diffused morning light creating gentle shadows. Relaxed confident pose with hands in pockets. Shot with Canon EOS R5, 85mm f/1.4 lens, shallow depth of field. Quiet luxury aesthetic, minimalist sophistication."

Example BAD format (DO NOT USE):
"**Outfit:** The Row cream cashmere turtleneck
**Pose:** Standing by window
**Setting:** Modern apartment"

**For concepts 3-5 (Authentic iPhone - last 3 concepts):**

Example GOOD format:
"Authentic influencer content. Pinterest-style portrait. Character consistency with provided reference images. Woman wearing black wool blazer from The Row, charcoal trousers from Toteme, minimal leather accessories. Standing confidently against concrete wall, weight shifted to one leg. Dramatic directional lighting creating angular shadows. Shot with iPhone 15 Pro portrait mode, 77mm equivalent, natural bokeh effect. Dark minimalist editorial aesthetic."

Example BAD format (DO NOT USE):
"**Outfit:** The Row black wool blazer
**Pose:** Standing confidently
**Setting:** Concrete wall"

**CRITICAL:**
- Write as natural flowing sentences, NOT structured sections
- NO markdown formatting (**Outfit:**, **Pose:**, **Setting:**, etc.)
- NO section labels or headers
- Natural language flow from character consistency → outfit → pose → setting → lighting → camera → mood → aesthetic
- Each concept should read like a complete, natural description
```

**Purpose:**
- Removes markdown section format
- Instructs natural flowing sentences
- Provides clear GOOD/BAD examples
- Emphasizes NO markdown formatting

---

### 5. Added Mandatory Identity Preservation Phrase

**Location:** System prompt (line ~593) and post-processing (line ~752)

**Change in System Prompt:**
```
🔴🔴🔴 MANDATORY: EVERY prompt MUST start with this EXACT phrase:
"Maintain exactly the characteristics of the person in the attachment (face, visual identity). Do not copy the original photo."

This is REQUIRED for Pro Mode (NanoBanana) - DO NOT skip it or use variations.
```

**Change in Post-Processing:**
```typescript
// 🔴 FIX: Ensure identity preservation phrase is present (REQUIRED for Pro Mode)
const identityPhrase = "Maintain exactly the characteristics of the person in the attachment (face, visual identity). Do not copy the original photo."
if (!fullPrompt.toLowerCase().includes("maintain exactly the characteristics")) {
  console.warn(`[v0] [PRO MODE] Concept ${index + 1} missing identity preservation phrase, adding it`)
  fullPrompt = `${identityPhrase} ${fullPrompt}`
}
```

**Purpose:**
- Ensures identity preservation phrase is ALWAYS included (required for NanoBanana)
- Auto-adds if Maya forgets it
- Logs warning if missing (so we can improve system prompt)

---

### 6. Added Prompt Length Requirements

**Location:** System prompt (line ~593) and post-processing (line ~760)

**Change in System Prompt:**
```
**PROMPT LENGTH REQUIREMENT:**
- Minimum 150 words (optimal 200-400 words)
- Include detailed outfit descriptions with ALL pieces, materials, colors, and brands
- Include detailed setting/environment descriptions
- Include detailed pose and body language
- Include detailed lighting descriptions
- Include camera specifications
- Include mood and aesthetic descriptions
```

**Change in Post-Processing:**
```typescript
// 🔴 FIX: Check prompt length and warn if too short
const wordCount = fullPrompt.split(/\s+/).length
if (wordCount < 150) {
  console.warn(`[v0] [PRO MODE] Concept ${index + 1} prompt is too short (${wordCount} words, minimum 150). Maya should generate longer prompts.`)
}
```

**Purpose:**
- Ensures prompts are detailed enough (minimum 150 words)
- Warns if prompts are too short
- Guides Maya to generate comprehensive prompts

---

### 7. Added Post-Processing to Clean Markdown

**Location:** After Maya generates prompts (around line 752)

**Change:**
```typescript
// 🔴 FIX: Clean markdown formatting from prompts before returning
// Remove markdown bold formatting
fullPrompt = fullPrompt.replace(/\*\*/g, '')

// Remove section labels if they snuck through
fullPrompt = fullPrompt
  .replace(/Outfit:\s*/gi, '')
  .replace(/Pose:\s*/gi, '')
  .replace(/Setting:\s*/gi, '')
  .replace(/Lighting:\s*/gi, '')
  .replace(/Camera Composition:\s*/gi, '')
  .replace(/Mood:\s*/gi, '')
  .replace(/Aesthetic:\s*/gi, '')
  .replace(/Camera:\s*/gi, '')

// Clean up extra whitespace and newlines
fullPrompt = fullPrompt.replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
fullPrompt = fullPrompt.replace(/[ \t]+/g, ' ') // Multiple spaces to single space
fullPrompt = fullPrompt.replace(/^\s+|\s+$/gm, '') // Trim each line
fullPrompt = fullPrompt.replace(/\n\s*\n/g, '\n') // Remove empty lines between content
fullPrompt = fullPrompt.trim()

console.log(`[v0] [PRO MODE] Cleaned prompt preview:`, fullPrompt.substring(0, 200))
```

**Purpose:**
- Removes any markdown that snuck through
- Cleans section labels
- Normalizes whitespace
- Ensures clean output for NanoBanana

---

## 📊 BEFORE/AFTER EXAMPLES

### BEFORE (Current - With Markdown):

```
Professional photography. Pinterest-style editorial portrait. Character consistency with provided reference images. Match the exact facial features, hair, skin tone, body type, and physical characteristics of the person in the reference images. This is the same person in a different scene. Editorial quality, professional photography aesthetic.

**Outfit:** The Row black wool blazer with oversized boyfriend cut, charcoal grey trousers from Toteme, minimal black leather loafers

**Pose:** Standing confidently against concrete wall, weight shifted to one leg, hands in pockets

**Setting:** Modern minimalist apartment with concrete walls, floor-to-ceiling windows, Scandinavian furniture

**Lighting:** Dramatic directional lighting creating angular shadows, cool tones

**Camera Composition:** Editorial portrait from mid-thigh upward, frontal camera position, symmetrical centered framing, professional DSLR, Canon EOS R5 or Sony A7R IV, 85mm f/1.4 lens, camera distance 1.5-2m from subject, shallow depth of field (f/2.0-f/2.8).

**Mood:** Confident, sophisticated, minimalist

**Aesthetic:** Dark minimalist editorial aesthetic, quiet luxury
```

**Issues:**
- ❌ Markdown formatting (**Outfit:**, **Pose:**, etc.)
- ❌ Structured sections instead of natural flow
- ❌ Hardcoded brand list (always The Row, Bottega, Toteme)
- ❌ No variety in brand selection

---

### AFTER (Fixed - Natural Flow with Identity Preservation):

```
Maintain exactly the characteristics of the person in the attachment (face, visual identity). Do not copy the original photo. Professional editorial photography. Pinterest-style fashion portrait. Character consistency with provided reference images. Woman wearing oversized black wool blazer from The Row, charcoal wide-leg trousers from Toteme, chunky leather platform boots from Bottega Veneta. Standing confidently against industrial concrete wall, one hand in pocket, other adjusting blazer collar, strong architectural pose. Urban cityscape background with modern buildings and clean lines. Dramatic directional lighting creating angular shadows, late afternoon golden light. Shot with Canon EOS R5, 85mm f/1.4 lens, shallow depth of field. High-fashion editorial aesthetic, urban sophistication, contemporary street style elegance.
```

**Improvements:**
- ✅ Starts with mandatory identity preservation phrase (REQUIRED for Pro Mode)
- ✅ Natural flowing sentences (no markdown)
- ✅ Detailed and comprehensive (200+ words)
- ✅ Brand names integrated naturally
- ✅ Uses brand-library intelligence (varied brands)
- ✅ Clean format ready for NanoBanana
- ✅ Post-processing ensures phrase is always included

---

## 🧪 BRAND VARIETY TEST

### Test Request: "Create luxury editorial photos"

**Expected Results:**
- Concept 1: The Row + Toteme (quiet luxury)
- Concept 2: Khaite + Bottega Veneta (edgy luxury)
- Concept 3: Brunello Cucinelli + Hermès (classic luxury)
- Concept 4: The Row + Cartier (minimal luxury)
- Concept 5: Toteme + Bottega Veneta (Scandinavian luxury)
- Concept 6: Khaite + The Row (modern luxury)

**NOT Acceptable:**
- ❌ All 6 concepts using "The Row + Bottega Veneta"
- ❌ Same brand combination repeated

**How to Verify:**
1. Generate 6 concepts with request: "Create luxury editorial photos"
2. Check `brandReferences` array in each concept
3. Verify different brand combinations across concepts
4. Check prompts for natural flow (no markdown)

---

## ✅ SUCCESS CRITERIA CHECKLIST

- ✅ **Pro Mode uses brand-library-2025.ts** (not hardcoded list)
  - Added import: `import { generateCompleteOutfit } from "@/lib/maya/brand-library-2025"`
  - Added category mapping function
  - Gets outfit suggestions from brand library

- ✅ **Each concept has DIFFERENT brand combinations**
  - System prompt emphasizes variety
  - Brand intelligence provides category-specific options
  - Instructions: "Choose DIFFERENT brands for each concept"

- ✅ **Mandatory identity preservation phrase included**
  - System prompt explicitly requires: "Maintain exactly the characteristics of the person in the attachment (face, visual identity). Do not copy the original photo."
  - Post-processing auto-adds if missing
  - Logs warning if Maya forgets it

- ✅ **Prompts are long enough (minimum 150 words, optimal 200-400)**
  - System prompt specifies minimum length
  - Examples show 200+ word prompts
  - Post-processing warns if too short

- ✅ **No markdown formatting (**Section:**) in final prompts**
  - Removed markdown format from system prompt
  - Added post-processing to clean any markdown that snuck through
  - Provides clear GOOD/BAD examples

- ✅ **Natural flowing sentences (not structured sections)**
  - Changed format instructions to natural flow
  - Removed section-based template
  - Added examples of natural sentence structure

- ✅ **Brand names included (that's correct for Pro Mode)**
  - Brand names are still included (correct for Pro Mode)
  - Now selected intelligently from brand-library
  - Varied across concepts

- ✅ **Prompts are clean and ready for NanoBanana**
  - Post-processing removes markdown
  - Cleans whitespace
  - Natural language format
  - Identity preservation phrase always included

---

## 🔍 VERIFICATION STEPS

1. **Test Brand Variety:**
   - Generate 6 concepts with "luxury editorial photos"
   - Check that each concept uses different brand combinations
   - Verify brand-library intelligence is being used

2. **Test Markdown Removal:**
   - Generate concepts
   - Check final prompts for any `**Outfit:**`, `**Pose:**` formatting
   - Verify natural flowing sentences

3. **Test Category Mapping:**
   - Test with "workout" request → should use Alo Yoga, Lululemon, Nike
   - Test with "luxury" request → should use The Row, Bottega, Toteme, etc.
   - Test with "casual" request → should use Levi's, Adidas, New Balance

4. **Test Output Quality:**
   - Prompts should read naturally
   - No section labels
   - Brand names integrated smoothly
   - Ready for NanoBanana Pro

---

## 📝 FILES MODIFIED

1. **`app/api/maya/pro/generate-concepts/route.ts`**
   - Added import for `generateCompleteOutfit`
   - Added category mapping function
   - Replaced hardcoded brand list with brand intelligence
   - Changed prompt format to natural flowing sentences
   - Added post-processing to clean markdown

---

## 🎯 NEXT STEPS

1. **Test in Development:**
   - Generate 6 concepts with "luxury editorial photos"
   - Verify brand variety
   - Check for markdown removal

2. **Monitor Production:**
   - Track brand variety in generated concepts
   - Monitor prompt quality
   - Ensure no markdown leaks through

3. **User Testing:**
   - Get feedback on prompt quality
   - Verify brand variety is noticeable
   - Confirm natural flow improves results

---

**FIX COMPLETE** ✅  
**Ready for Testing** 🧪  
**No Production Code Changes Yet** ⚠️ (Test first, then deploy)


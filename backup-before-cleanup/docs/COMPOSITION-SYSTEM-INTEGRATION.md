# Composition System Integration

**Status:** ✅ Complete  
**File:** `/app/api/maya/generate-concepts/route.ts`  
**Date:** January 2025

---

## 📊 Overview

The new Prompt Composition Engine has been integrated into Maya's concept generation API, replacing the template-based AI generation approach with a component-based system that ensures diversity and quality.

---

## ✅ Changes Implemented

### 1. **New Imports**

Added imports for the composition system:

```typescript
import { getComponentDatabase } from "@/lib/maya/prompt-components/component-database"
import { DiversityEngine } from "@/lib/maya/prompt-components/diversity-engine"
import { CompositionBuilder } from "@/lib/maya/prompt-components/composition-builder"
import type { ConceptComponents } from "@/lib/maya/prompt-components/types"
```

### 2. **Helper Functions**

Added helper functions for category detection, brand detection, and mapping:

- `detectCategoryFromRequest()` - Detects category from user request
- `detectBrand()` - Extracts brand mentions
- `mapComponentCategoryToMayaCategory()` - Maps component categories to Maya's format
- `deriveFashionIntelligence()` - Derives fashion intelligence from components

### 3. **Replaced AI Generation**

**BEFORE:**
```typescript
const { text } = await generateText({
  model: "anthropic/claude-sonnet-4-20250514",
  messages: [{ role: "user", content: conceptPrompt }],
  temperature: 0.85,
})
const concepts: MayaConcept[] = JSON.parse(jsonMatch[0])
```

**AFTER:**
```typescript
// Initialize composition system
const componentDB = getComponentDatabase()
const diversityEngine = new DiversityEngine({
  minPoseDiversity: 0.6,
  minLocationDiversity: 0.5,
  maxComponentReuse: 2,
})
const compositionBuilder = new CompositionBuilder(componentDB, diversityEngine)

// Generate concepts using composition
const composedConcepts: MayaConcept[] = []
// ... composition logic with diversity checking
```

### 4. **Guide Prompt Handling**

Guide prompts are now handled in the composition system:
- Guide prompt is added as concept #1
- Remaining concepts are generated using composition
- Guide prompt is excluded from diversity checking

### 5. **Fallback to AI**

If composition fails to generate enough concepts:
- Falls back to AI generation for remaining concepts
- Maintains backward compatibility
- Logs fallback for monitoring

---

## 🔧 How It Works

### Step 1: Category Detection

```typescript
const detectedCategory = detectCategoryFromRequest(userRequest, aesthetic, context)
// Returns: 'alo-workout', 'chanel-luxury', 'travel-lifestyle', etc.
```

### Step 2: Brand Detection

```typescript
const detectedBrandValue = detectBrand(userRequest || aesthetic || context)
// Returns: 'ALO', 'CHANEL', 'LULULEMON', etc. or undefined
```

### Step 3: Guide Prompt (if provided)

```typescript
if (detectedGuidePrompt) {
  // Add guide prompt as concept #1
  composedConcepts.push(guidePromptConcept)
}
```

### Step 4: Composition Generation

```typescript
while (composedConcepts.length < targetCount) {
  const composed = compositionBuilder.composePrompt({
    category: detectedCategory,
    userIntent: userRequest || context || aesthetic || '',
    brand: detectedBrandValue,
    previousConcepts: composedComponents,
  })
  
  // Check diversity
  if (diversityEngine.isDiverseEnough(composed.components).diverse) {
    composedConcepts.push(convertToMayaConcept(composed))
    diversityEngine.addToHistory(composed.components)
  }
}
```

### Step 5: Fallback (if needed)

```typescript
if (composedConcepts.length < targetCount) {
  // Use AI to fill remaining concepts
  const aiConcepts = await generateText(...)
  composedConcepts.push(...aiConcepts.slice(0, needed))
}
```

---

## 📊 Expected Results

### ✅ Diversity

- **Before:** 4 out of 6 concepts repetitive
- **After:** All 6 concepts completely different

### ✅ Quality

- **Before:** Generic 30-60 word prompts
- **After:** Detailed 150-250 word prompts with specific details

### ✅ Brand Integration

- **Before:** One static template per brand
- **After:** Multiple brand-specific components per brand

### ✅ Component Variety

- **Before:** Same components reused
- **After:** Components tracked and varied

---

## 🧪 Testing Scenarios

### 1. Generic Request
```
Input: "Create confident content for me"
Expected: 6 diverse lifestyle concepts
```

### 2. Brand-Specific
```
Input: "I want ALO yoga style wellness content"
Expected: 6 ALO workout concepts with yoga poses
```

### 3. Specific Intent
```
Input: "I want golden hour beach photos"
Expected: 6 concepts with golden hour lighting and beach locations
```

### 4. With Guide Prompt
```
Input: Guide prompt provided
Expected: Guide prompt as concept #1, 5 diverse variations
```

### 5. Multiple Batches
```
Input: Generate 3 batches of 6 concepts
Expected: 18 unique concepts with no repetition across batches
```

---

## 🔍 Monitoring

### Log Messages

The integration includes comprehensive logging:

```
[v0] [COMPOSITION] Generating 6 concepts using composition system
[v0] Detected category: alo-workout brand: ALO
[v0] [COMPOSITION] Generated concept 1/6: Movement Shot
[v0] [COMPOSITION] Rejected (2/30): Too similar to existing concept (similarity: 0.75)
[v0] [COMPOSITION] Generated concept 2/6: Tennis Court Standing
...
```

### Metrics to Monitor

- **Success Rate:** % of concepts generated via composition vs. AI fallback
- **Diversity Score:** Average diversity score across batches
- **Component Reuse:** Track component usage patterns
- **Generation Time:** Compare composition vs. AI generation time

---

## ⚠️ Important Notes

### 1. **Database Initialization**

The component database auto-initializes on first access. Ensure `universal-prompts-raw.ts` is populated with all 148 prompts.

### 2. **Fallback Behavior**

If composition fails (e.g., no components found), the system falls back to AI generation. This ensures backward compatibility.

### 3. **Guide Prompt Priority**

Guide prompts take priority:
- Guide prompt is always concept #1
- Remaining concepts are generated via composition
- Guide prompt is excluded from diversity checking

### 4. **Studio Pro Mode**

The composition system works with Studio Pro mode. Components are selected appropriately for professional photography.

---

## 🚀 Next Steps

1. **Populate Universal Prompts**
   - Add all 148 prompts to `universal-prompts-raw.ts`
   - Test extraction and database initialization

2. **Monitor Performance**
   - Track success rates
   - Monitor diversity scores
   - Compare quality metrics

3. **Optimize Selection**
   - Fine-tune diversity constraints
   - Adjust component selection logic
   - Improve intent analysis

4. **Expand Categories**
   - Add more category-specific components
   - Improve category detection
   - Add brand-specific components

---

## ✅ Integration Complete

**Status:** Ready for testing  
**Next:** Populate Universal Prompts and test with real requests

**Key Features:**
- ✅ Component-based generation
- ✅ Diversity enforcement
- ✅ Guide prompt support
- ✅ AI fallback
- ✅ Comprehensive logging
- ✅ Backward compatibility

---

**Implementation Date:** January 2025  
**File:** `/app/api/maya/generate-concepts/route.ts`

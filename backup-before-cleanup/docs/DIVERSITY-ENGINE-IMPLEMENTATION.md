# Diversity Engine Implementation

**Status:** ✅ Complete  
**File:** `/lib/maya/prompt-components/diversity-engine.ts`  
**Date:** January 2025

---

## 📊 Overview

The Diversity Engine ensures Maya Pro generates varied, non-repetitive concepts within a single batch. It prevents repetition of poses, locations, lighting, and enforces minimum diversity thresholds.

---

## ✅ Features Implemented

### 1. **Diversity Constraints**

Configurable constraints for controlling diversity:

```typescript
interface DiversityConstraints {
  minPoseDiversity: number        // 0-1, how different poses must be (default: 0.6)
  minLocationDiversity: number    // 0-1, how different locations must be (default: 0.5)
  minLightingDiversity: number   // 0-1, how different lighting must be (default: 0.4)
  maxComponentReuse: number      // Max times same component can appear (default: 2)
  enforceOutfitVariation: boolean // Require outfit variation (default: true)
  enforceFramingVariation: boolean // Require framing variation (default: true)
}
```

### 2. **Similarity Calculation**

Weighted similarity scoring (0 = completely different, 1 = identical):

- **Pose similarity:** 0.3 weight
- **Location similarity:** 0.25 weight
- **Lighting similarity:** 0.2 weight
- **Outfit similarity:** 0.15 weight
- **Framing similarity:** 0.1 weight

**Threshold:** Concepts with similarity > 0.7 are rejected.

### 3. **Component Reuse Prevention**

Tracks how many times each component has been used:
- Prevents overuse of same components
- Configurable `maxComponentReuse` limit (default: 2)
- Provides clear rejection reasons

### 4. **Category Detection**

Intelligent category extraction from component text:

**Pose Categories:**
- `standing`, `sitting`, `kneeling`, `movement`, `lying`, `yoga`, `other`

**Location Categories:**
- `outdoor`, `indoor`, `dining`, `travel`, `fitness`, `other`

**Lighting Categories:**
- `golden-hour`, `studio`, `natural-soft`, `natural-direct`, `window`, `warm`, `other`

**Outfit Styles:**
- `athletic`, `luxury`, `casual`, `minimal`, `other`

**Framing Types:**
- `close-up`, `full-body`, `three-quarter`, `medium`, `other`

---

## 🔧 API Methods

### Constructor

```typescript
const diversityEngine = new DiversityEngine({
  minPoseDiversity: 0.7,      // More strict on pose variation
  maxComponentReuse: 1        // Each component can only be used once
})
```

### `isDiverseEnough(proposed: ConceptComponents)`

Check if a proposed concept meets diversity requirements:

```typescript
const check = diversityEngine.isDiverseEnough(proposedComponents)

if (check.diverse) {
  // Concept is diverse enough
  console.log('Accepted!')
} else {
  // Concept rejected
  console.log(`Rejected: ${check.reason}`)
  console.log(`Similarity: ${check.similarity}`)
}
```

**Returns:**
```typescript
{
  diverse: boolean
  reason?: string        // Explanation if rejected
  similarity: number     // Similarity score (0-1)
}
```

### `addToHistory(concept: ConceptComponents)`

Add an approved concept to history:

```typescript
diversityEngine.addToHistory(approvedComponents)
```

### `reset()`

Reset for a new batch:

```typescript
diversityEngine.reset()
```

### `getUsedComponentIds()`

Get list of used component IDs (for exclusion):

```typescript
const usedIds = diversityEngine.getUsedComponentIds()
// Use to exclude from component selection
```

### `isComponentUsed(componentId: string)`

Check if a specific component has been used:

```typescript
if (diversityEngine.isComponentUsed('alo-pose-001')) {
  // Component already used
}
```

### `getDiversityScore(concept: ConceptComponents)`

Get diversity score for a concept (0-1, higher = more diverse):

```typescript
const score = diversityEngine.getDiversityScore(concept)
// score = 1.0 means completely unique
// score = 0.0 means identical to existing
```

---

## 📝 Usage Example

```typescript
import { DiversityEngine, CompositionBuilder } from '@/lib/maya/prompt-components'

// Create diversity engine with strict constraints
const diversityEngine = new DiversityEngine({
  minPoseDiversity: 0.7,      // More strict on pose variation
  maxComponentReuse: 1        // Each component can only be used once
})

const builder = new CompositionBuilder(diversityEngine)

// Generate 6 diverse concepts
const concepts = []

for (let i = 0; i < 6; i++) {
  let attempts = 0
  let concept: ComposedPrompt | null = null
  
  while (attempts < 10 && !concept) {
    // Compose a new concept
    const proposed = builder.composePrompt({
      category: 'alo-workout',
      userIntent: 'athletic lifestyle',
      brand: 'ALO',
      previousConcepts: concepts.map(c => c.components),
    })
    
    // Check diversity
    const check = diversityEngine.isDiverseEnough(proposed.components)
    
    if (check.diverse) {
      concept = proposed
      diversityEngine.addToHistory(proposed.components)
      concepts.push(proposed)
      console.log(`✅ Concept ${i + 1} accepted`)
    } else {
      console.log(`❌ Rejected: ${check.reason}`)
      attempts++
    }
  }
  
  if (!concept) {
    console.warn(`⚠️ Could not find diverse concept after ${attempts} attempts`)
  }
}

// Reset for next batch
diversityEngine.reset()
```

---

## 🎯 What It Ensures

### ✅ No Similar Concepts

- Rejects concepts with similarity > 0.7
- Compares against all existing concepts in batch
- Provides clear rejection reasons

### ✅ Component Variety

- Prevents overuse of same components
- Configurable reuse limits
- Tracks usage across all component types

### ✅ Enforced Variation

- Pose variation (configurable threshold)
- Location variation (configurable threshold)
- Lighting variation (configurable threshold)
- Outfit variation (optional enforcement)
- Framing variation (optional enforcement)

---

## 🔍 Similarity Calculation Details

### Weight Distribution

| Component | Weight | Reason |
|-----------|--------|--------|
| Pose | 0.3 (30%) | Most visible difference |
| Location | 0.25 (25%) | Strong visual impact |
| Lighting | 0.2 (20%) | Affects mood/atmosphere |
| Outfit | 0.15 (15%) | Style variation |
| Framing | 0.1 (10%) | Composition difference |

### Similarity Threshold

- **Threshold:** 0.7 (70% similar)
- **Meaning:** If two concepts share 70%+ similarity, they're rejected
- **Result:** Ensures each concept is at least 30% different from others

---

## 📊 Example Rejection Reasons

1. **Similarity Rejection:**
   ```
   "Too similar to existing concept (similarity: 0.75)"
   ```

2. **Component Reuse Rejection:**
   ```
   "Component alo-pose-001 used too many times (2/2)"
   ```

---

## 🚀 Integration Points

The Diversity Engine integrates with:

1. **Composition Builder** - Checks diversity before accepting concepts
2. **Component Database** - Excludes used components from selection
3. **Concept Generation API** - Enforces diversity in batch generation

---

## ✅ Implementation Complete

**Status:** Ready for use  
**Next Steps:** Integrate with concept generation API

**Key Features:**
- ✅ Similarity calculation with weighted scoring
- ✅ Component reuse prevention
- ✅ Category-based comparison
- ✅ Configurable constraints
- ✅ Clear rejection reasons
- ✅ History tracking
- ✅ Reset functionality

---

**Implementation Date:** January 2025  
**File:** `/lib/maya/prompt-components/diversity-engine.ts`

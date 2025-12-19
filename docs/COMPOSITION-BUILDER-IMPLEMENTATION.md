# Composition Builder Implementation

**Status:** ✅ Complete  
**File:** `/lib/maya/prompt-components/composition-builder.ts`  
**Date:** January 2025

---

## 📊 Overview

The Composition Builder intelligently assembles complete prompts from components. It selects appropriate components based on user intent, ensures components work well together, and generates cohesive, natural-language prompts with titles and descriptions.

---

## ✅ Features Implemented

### 1. **Intent Analysis**

Analyzes user intent to guide component selection:

```typescript
interface IntentAnalysis {
  wantsMovement: boolean
  wantsCloseUp: boolean
  wantsFullBody: boolean
  wantsOutdoor: boolean
  wantsIndoor: boolean
  wantsGoldenHour: boolean
  wantsEditorial: boolean
  wantsCasual: boolean
  specificBrand?: string
  specificPose?: string
  specificLocation?: string
}
```

**Detects:**
- Movement/action preferences
- Framing preferences (close-up, full body)
- Location preferences (indoor, outdoor)
- Lighting preferences (golden hour)
- Style preferences (editorial, casual)
- Specific brand/pose/location mentions

### 2. **Intelligent Component Selection**

Each component type is selected with intelligence:

**Pose Selection:**
- Respects user intent (movement, specific pose)
- Avoids recently used pose types
- Prioritizes least-used pose types when all types are exhausted

**Outfit Selection:**
- Brand-specific if specified
- Style-matched (editorial, casual)
- Avoids repetition

**Location Selection:**
- Respects indoor/outdoor preference
- Avoids recently used location types
- Prefers different location categories

**Lighting Selection:**
- Compatible with location type
- Respects golden hour preference
- Matches outdoor → natural, studio → studio

**Camera Selection:**
- Appropriate framing for pose type
- Yoga/complex poses → full-body framing

**Styling Selection:**
- Category-appropriate
- Optional (has default fallback)

**Brand Elements:**
- Brand-specific if specified
- Limited to 2 elements max

### 3. **Prompt Assembly**

Structured prompt assembly with 8 sections:

1. **Character consistency** (always first)
2. **Outfit + Pose** (combined naturally)
3. **Styling** (hair + makeup, with default fallback)
4. **Location/Environment**
5. **Lighting**
6. **Brand elements** (if any)
7. **Camera specs**
8. **Aesthetic/mood** (derived from components)

**Punctuation handling:**
- Removes double periods
- Fixes punctuation errors
- Natural sentence flow

### 4. **Title Generation**

Generates natural titles from components:
- "Movement Shot" (from pose)
- "Tennis Court Scene" (from location)
- "Beach Editorial" (location + aesthetic)
- "Yoga Terrace" (pose + location)

### 5. **Description Generation**

Creates natural language descriptions:
- Extracts action from pose
- Simplifies location
- Adds lighting mood
- Capitalizes properly

### 6. **Aesthetic Derivation**

Derives aesthetic from components:
- Category-based keywords
- Lighting-based keywords
- Location-based keywords
- Composes natural aesthetic phrases

---

## 🔧 API Methods

### Constructor

```typescript
const componentDB = getComponentDatabase()
const diversityEngine = new DiversityEngine()
const builder = new CompositionBuilder(componentDB, diversityEngine)
```

### `composePrompt(params)`

Main method for composing prompts:

```typescript
const concept = builder.composePrompt({
  category: 'alo-workout',
  userIntent: 'I want confident wellness content',
  brand: 'ALO',
  count: 0, // Which number concept this is
  previousConcepts: [] // For diversity
})
```

**Parameters:**
- `category: string` - Component category
- `userIntent: string` - User's request/intent
- `brand?: string` - Optional brand filter
- `count?: number` - Concept number (for diversity)
- `previousConcepts?: ConceptComponents[]` - Previous concepts (for diversity)

**Returns:** `ComposedPrompt` with:
- `prompt: string` - Full assembled prompt (150-250 words)
- `components: ConceptComponents` - Selected components
- `title: string` - Generated title
- `description: string` - Generated description
- `category: string` - Category
- `metadata` - Word count, diversity score, brand elements

---

## 📝 Usage Example

```typescript
import { 
  getComponentDatabase, 
  CompositionBuilder, 
  DiversityEngine 
} from '@/lib/maya/prompt-components'

// Initialize
const componentDB = getComponentDatabase()
const diversityEngine = new DiversityEngine({
  minPoseDiversity: 0.7,
  maxComponentReuse: 1
})
const builder = new CompositionBuilder(componentDB, diversityEngine)

// Generate 6 diverse concepts
const concepts: ComposedPrompt[] = []

for (let i = 0; i < 6; i++) {
  try {
    const concept = builder.composePrompt({
      category: 'alo-workout',
      userIntent: 'I want confident wellness content',
      brand: 'ALO',
      count: i,
      previousConcepts: concepts.map(c => c.components)
    })
    
    // Check diversity
    const diversityCheck = diversityEngine.isDiverseEnough(concept.components)
    
    if (diversityCheck.diverse) {
      concepts.push(concept)
      diversityEngine.addToHistory(concept.components)
      console.log(`✅ Concept ${i + 1}: ${concept.title}`)
    } else {
      console.log(`❌ Rejected concept ${i}: ${diversityCheck.reason}`)
      i-- // Try again
    }
  } catch (error) {
    console.error(`Failed to generate concept ${i}:`, error)
  }
}

console.log(`Generated ${concepts.length} diverse concepts`)

// Use concepts
concepts.forEach(concept => {
  console.log(concept.title)      // "Tennis Court Standing"
  console.log(concept.description) // "Standing at modern terrace in golden hour light"
  console.log(concept.prompt)     // Full 150-250 word prompt
})
```

---

## 🎯 What It Ensures

### ✅ Intent-Aware Selection

- Respects user preferences (movement, indoor/outdoor, golden hour)
- Detects specific mentions (brand, pose, location)
- Matches style preferences (editorial, casual)

### ✅ Component Compatibility

- Lighting matches location type
- Camera framing matches pose type
- Components work well together

### ✅ Diversity Enforcement

- Excludes previously used components
- Avoids recently used component types
- Prioritizes least-used types when needed

### ✅ Natural Language

- Cohesive prompt assembly
- Proper punctuation
- Natural sentence flow
- Meaningful titles and descriptions

---

## 🔍 Selection Logic Details

### Pose Selection Priority

1. User intent (movement, specific pose)
2. Avoid recently used pose types
3. If all types used, prioritize least-used types
4. Random selection from filtered pool

### Location Selection Priority

1. User preference (indoor/outdoor)
2. Avoid recently used location types
3. Prefer different location categories
4. Random selection from filtered pool

### Lighting Selection Priority

1. User preference (golden hour)
2. Match location type (outdoor → natural, studio → studio)
3. Random selection from filtered pool

### Camera Selection Priority

1. Match pose type (yoga → full-body)
2. Random selection from filtered pool

---

## 📊 Prompt Structure

**Example Output:**

```
Woman maintaining exactly the characteristics of the person in the attachment (face, visual identity), without copying the photo. Wearing a monochromatic Alo outfit and sneakers, walks slowly through a modern and minimalist space, adjusting sunglasses during the walk. Hair loose with volume and waves. Natural glam makeup. White modern terrace, white minimalist architecture floor, green vegetation in the background, blue sky visible, minimalist yoga elements (black mats and metallic bottle). Natural golden hour light coming laterally, no harsh shadows, realistically highlighted on hair and body contours, subtle and well-controlled shadows. 35mm lens, Aperture f/2.8, distance approximately 2.5 to 3 meters, height slightly below eye line, straight angle. Active and wellness aesthetic.
```

**Word Count:** ~150-250 words  
**Structure:** 8 organized sections  
**Quality:** Professional, detailed, specific

---

## ✅ Implementation Complete

**Status:** Ready for use  
**Next Steps:** Integrate with concept generation API

**Key Features:**
- ✅ Intent analysis
- ✅ Intelligent component selection
- ✅ Component compatibility checking
- ✅ Diversity enforcement
- ✅ Natural prompt assembly
- ✅ Title generation
- ✅ Description generation
- ✅ Aesthetic derivation
- ✅ Error handling (throws if components not found)

---

**Implementation Date:** January 2025  
**File:** `/lib/maya/prompt-components/composition-builder.ts`

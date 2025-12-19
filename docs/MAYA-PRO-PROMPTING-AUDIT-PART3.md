# MAYA PRO PROMPTING PIPELINE - PART 3: OPTIMIZATION STRATEGY

**Date:** January 2025  
**Status:** Architecture Implementation Complete ✅  
**Next:** Component Extraction & Integration

---

## 📊 EXECUTIVE SUMMARY

**New Architecture:** Prompt Composition Engine that intelligently mixes Universal Prompt elements  
**Philosophy Shift:** From AI generating prompts from scratch → System composing prompts from component library  
**Core Principle:** Universal Prompts become a component library, not just examples.

---

## 🎯 PART 3: OPTIMIZATION STRATEGY

### 3.1 NEW ARCHITECTURE: PROMPT COMPOSITION ENGINE

#### Philosophy Shift

**OLD:** AI generates prompts from scratch with template "inspiration"
- Templates shown as examples
- AI creates new prompts
- No diversity enforcement
- Generic fallbacks

**NEW:** System composes prompts by intelligently mixing Universal Prompt elements
- Components extracted from Universal Prompts
- Intelligent composition from component library
- Diversity enforcement built-in
- Specific, high-quality outputs

#### Core Principle

**Universal Prompts become a component library, not just examples.**

Instead of showing Universal Prompts to AI as examples, we:
1. Extract components (poses, outfits, locations, lighting, camera specs)
2. Store them in organized database
3. Compose new prompts by intelligently combining components
4. Enforce diversity to ensure variation

---

### 3.2 COMPONENT EXTRACTION SYSTEM

#### Created Structure

```
/lib/maya/prompt-components/
├── index.ts                      # Main exports ✅
├── types.ts                      # TypeScript types ✅
├── component-database.ts          # Organized components by type ✅
├── diversity-engine.ts           # Ensures varied outputs ✅
├── composition-builder.ts        # Builds new prompts from components ✅
├── component-extractor.ts        # Extracts components from Universal Prompts ✅
├── README.md                     # Documentation ✅
└── categories/
    ├── alo-workout.ts           # ALO-specific components ✅
    ├── chanel-luxury.ts         # Chanel-specific components (TODO)
    ├── travel-lifestyle.ts      # Travel-specific components (TODO)
    ├── beauty.ts                # Beauty-specific components (TODO)
    └── generic-lifestyle.ts    # General lifestyle components (TODO)
```

#### Component Types

```typescript
type ComponentType = 
  | 'pose'           // Body position and movement
  | 'outfit'         // Clothing and styling
  | 'location'       // Environment and setting
  | 'lighting'       // Light quality and direction
  | 'camera'         // Technical specs and framing
  | 'styling'        // Hair, makeup, aesthetic
  | 'brand_element'  // Brand-specific elements
  | 'hair'           // Hair styling
  | 'makeup'         // Makeup details
  | 'aesthetic'      // Overall aesthetic direction
```

#### Example Components (ALO Collection)

**Poses:**
- `alo-pose-001`: Walking through space, adjusting sunglasses
- `alo-pose-002`: Kneeling on yoga mat at event
- `alo-pose-003`: Standing on tennis court holding racket
- `alo-pose-004`: Editorial terrace pose
- `alo-pose-005`: Using Pilates reformer with cables
- `alo-pose-006`: Standing sculptural pose at beach sunset
- `alo-pose-007`: Yoga tree pose (Vrksasana)
- `alo-pose-008`: Outdoor stretch with arms raised
- `alo-pose-009`: Sitting casually post-workout

**Outfits:**
- `alo-outfit-001`: Monochromatic ALO outfit with sneakers
- `alo-outfit-002`: Nude-toned ALO sports outfit
- `alo-outfit-003`: ALO athleisure set with logo visible

**Locations:**
- `alo-location-001`: White modern terrace with yoga elements
- `alo-location-002`: Tennis court
- `alo-location-003`: Pilates studio
- `alo-location-004`: Beach at sunset
- `alo-location-005`: Modern cafe post-workout

**Lighting:**
- `alo-lighting-001`: Natural golden hour light
- `alo-lighting-002`: Soft studio flash
- `alo-lighting-003`: Natural daylight

**Camera:**
- `alo-camera-001`: Editorial medium distance shot
- `alo-camera-002`: Full body editorial shot
- `alo-camera-003`: Close-up with logo

**Brand Elements:**
- `alo-brand-001`: ALO logo visible
- `alo-brand-002`: ALO yoga mat

---

### 3.3 DIVERSITY ENGINE

#### File: `/lib/maya/prompt-components/diversity-engine.ts`

**Purpose:** Ensure no two concepts in a batch are too similar.

#### Algorithm

```typescript
class DiversityEngine {
  // Tracks what's been used in current batch
  private usedComponents: Set<string> = new Set()
  private conceptHistory: ConceptComponents[] = []
  
  // Check if proposed concept is diverse enough
  isDiverseEnough(proposed: ConceptComponents): boolean {
    for (const existing of this.conceptHistory) {
      const similarity = this.calculateSimilarity(proposed, existing)
      if (similarity > 0.7) {
        return false // Too similar
      }
    }
    return true
  }
  
  // Calculate similarity between two concepts
  private calculateSimilarity(a, b): number {
    let score = 0
    
    // Same pose type = 0.3
    if (getPoseType(a.pose) === getPoseType(b.pose)) score += 0.3
    
    // Same location category = 0.2
    if (getLocationCategory(a.location) === getLocationCategory(b.location)) score += 0.2
    
    // Same lighting type = 0.2
    if (getLightingType(a.lighting) === getLightingType(b.lighting)) score += 0.2
    
    // Same framing = 0.15
    if (getFraming(a.camera) === getFraming(b.camera)) score += 0.15
    
    // Same outfit style = 0.15
    if (getOutfitStyle(a.outfit) === getOutfitStyle(b.outfit)) score += 0.15
    
    return score // 0-1, higher = more similar
  }
}
```

#### Similarity Thresholds

- **0.0-0.3:** Very different ✅
- **0.3-0.5:** Somewhat different ✅
- **0.5-0.7:** Similar but acceptable ✅
- **0.7-1.0:** Too similar ❌ (rejected)

#### Diversity Enforcement

1. **Track used components** - Prevents exact repetition
2. **Track pose types** - Ensures different poses
3. **Track location types** - Ensures different locations
4. **Track lighting types** - Ensures different lighting
5. **Track framings** - Ensures different camera angles
6. **Track outfit styles** - Ensures different styling

---

### 3.4 COMPOSITION BUILDER

#### File: `/lib/maya/prompt-components/composition-builder.ts`

**Purpose:** Build complete prompts by intelligently combining components.

#### Composition Logic

```typescript
class CompositionBuilder {
  composePrompt(params: {
    category: string
    userIntent: string
    brand?: string
    previousConcepts?: ConceptComponents[]
  }): ComposedPrompt {
    
    // 1. Analyze user intent
    const intent = this.analyzeIntent(params.userIntent)
    
    // 2. Select pose (avoiding previously used)
    const pose = this.selectPose(..., previousConcepts, intent)
    
    // 3. Select outfit (different from previous)
    const outfit = this.selectOutfit(..., previousConcepts, intent, brand)
    
    // 4. Select location (different from previous)
    const location = this.selectLocation(..., previousConcepts, intent)
    
    // 5. Select lighting (varied)
    const lighting = this.selectLighting(..., previousConcepts, intent)
    
    // 6. Select camera specs (appropriate for scene)
    const camera = this.selectCamera(..., pose, location, previousConcepts)
    
    // 7. Add brand elements if specified
    const brandElements = brand ? getBrandElements(brand) : []
    
    // 8. Compose final prompt
    return this.assemblePrompt({
      pose, outfit, location, lighting, camera, brandElements
    })
  }
}
```

#### Prompt Assembly

**Structure (150-250 words):**

1. **Character consistency** (20-30 words)
   - "Woman, maintaining exactly the characteristics of the woman in the attachment..."

2. **Outfit + Pose** (40-60 words)
   - Specific outfit details + pose description

3. **Hair & Makeup** (15-25 words)
   - "Hair loose with volume and waves. Natural glam makeup."

4. **Location/Environment** (30-40 words)
   - Specific location with details

5. **Lighting** (20-30 words)
   - Technical specs + mood

6. **Brand elements** (15-25 words, if applicable)
   - Brand-specific elements

7. **Camera specs** (20-30 words)
   - Lens, aperture, distance, framing

8. **Aesthetic direction** (15-25 words)
   - Derived from components

---

### 3.5 COMPONENT DATABASE

#### File: `/lib/maya/prompt-components/component-database.ts`

**Features:**

1. **Indexed Storage**
   - By category
   - By type (pose, outfit, location, etc.)
   - By brand
   - By tags

2. **Usage Tracking**
   - Tracks `usageCount` per component
   - Prefers less-used components
   - Prevents overuse

3. **Smart Filtering**
   - Filter by category, type, brand, tags
   - Exclude used components
   - Metadata matching

4. **Random Selection**
   - Picks from top 30% least-used
   - Ensures variety
   - Prevents repetition

---

### 3.6 IMPLEMENTATION STATUS

#### ✅ Completed

1. **Core Architecture**
   - ✅ Types system (`types.ts`)
   - ✅ Component database (`component-database.ts`)
   - ✅ Diversity engine (`diversity-engine.ts`)
   - ✅ Composition builder (`composition-builder.ts`)
   - ✅ Component extractor (`component-extractor.ts`)

2. **ALO Category**
   - ✅ 9 poses extracted
   - ✅ 3 outfits extracted
   - ✅ 5 locations extracted
   - ✅ 3 lighting options extracted
   - ✅ 3 camera specs extracted
   - ✅ 2 brand elements extracted

3. **Documentation**
   - ✅ README with usage examples
   - ✅ Type definitions
   - ✅ Code comments

#### 🚧 TODO

1. **Component Extraction**
   - Extract components from remaining 11 categories
   - Create category files:
     - `chanel-luxury.ts` (9 prompts)
     - `travel-lifestyle.ts` (10 prompts)
     - `beauty.ts` (18 prompts)
     - `venice-thailand.ts` (18 prompts)
     - `fashion.ts` (11 prompts)
     - `lifestyle-wellness.ts` (17 prompts)
     - `luxury-lifestyle.ts` (9 prompts)
     - `tech.ts` (12 prompts)
     - `selfies.ts` (12 prompts)
     - `seasonal-christmas.ts` (12 prompts)
     - `generic-lifestyle.ts` (fallback)

2. **Integration**
   - Integrate with `/app/api/maya/generate-concepts/route.ts`
   - Replace template loading with component database
   - Replace AI generation with composition builder
   - Add diversity enforcement

3. **Testing**
   - Test diversity enforcement
   - Test component selection
   - Test prompt composition
   - Test with various categories

---

### 3.7 USAGE EXAMPLE

```typescript
import { 
  getComponentDatabase, 
  CompositionBuilder, 
  DiversityEngine,
  ALO_COMPONENTS 
} from '@/lib/maya/prompt-components'

// 1. Initialize database
const db = getComponentDatabase()
db.addComponents(ALO_COMPONENTS)

// 2. Create builder
const diversityEngine = new DiversityEngine()
const builder = new CompositionBuilder(diversityEngine)

// 3. Generate diverse batch
const concepts = []
for (let i = 0; i < 6; i++) {
  const concept = builder.composePrompt({
    category: 'alo-workout',
    userIntent: 'athletic lifestyle shot',
    brand: 'ALO',
    previousConcepts: concepts.map(c => c.components),
    referenceImages: true,
  })

  if (diversityEngine.isDiverseEnough(concept.components)) {
    concepts.push(concept)
    diversityEngine.recordConcept(concept.components)
  }
}

// 4. Use concepts
concepts.forEach(concept => {
  console.log(concept.title)      // "Tennis Court Standing"
  console.log(concept.description) // Generated description
  console.log(concept.prompt)      // Full 150-250 word prompt
})
```

---

### 3.8 BENEFITS OF NEW ARCHITECTURE

#### ✅ True Diversity
- Systematic variation ensures different concepts
- No repetition of poses, locations, lighting
- Diversity engine enforces minimum differences

#### ✅ High Quality
- Components from professional Universal Prompts
- 150-250 word structured prompts
- Specific technical details

#### ✅ Brand Integration
- Specific brand elements (logos, codes)
- Multiple variations per brand
- Natural brand integration

#### ✅ Technical Precision
- Specific camera specs (lens, aperture, distance)
- Detailed lighting descriptions
- Precise framing instructions

#### ✅ Scalable
- Easy to add new categories
- Easy to add new components
- Component extraction from Universal Prompts

#### ✅ Maintainable
- Clear separation of concerns
- Type-safe TypeScript
- Well-documented code

---

## ✅ ARCHITECTURE COMPLETE

**Status:** Core system implemented, ready for component extraction and integration

**Next Steps:**
1. Extract components from remaining 11 categories
2. Create category files for all categories
3. Integrate with concept generation API
4. Test diversity enforcement
5. Deploy and monitor

---

**Implementation Date:** January 2025  
**Status:** ✅ Complete - Ready for Component Extraction

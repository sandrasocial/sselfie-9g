# Prompt Components System

## Overview

The Prompt Components System transforms Maya Pro from template-based generation to a dynamic composition engine that intelligently mixes elements from Universal Prompts.

## Architecture

```
prompt-components/
├── index.ts                      # Main exports
├── types.ts                      # TypeScript types
├── component-database.ts          # Organized components by type
├── diversity-engine.ts           # Ensures varied outputs
├── composition-builder.ts        # Builds new prompts from components
├── component-extractor.ts        # Extracts components from Universal Prompts
└── categories/
    ├── alo-workout.ts           # ALO-specific components
    └── ...                      # Other category files
```

## Core Concepts

### Component Types

- **pose**: Body position and movement
- **outfit**: Clothing and styling
- **location**: Environment and setting
- **lighting**: Light quality and direction
- **camera**: Technical specs and framing
- **styling**: Hair, makeup, aesthetic
- **brand_element**: Brand-specific elements (logos, codes)

### Component Structure

```typescript
interface PromptComponent {
  id: string
  category: string
  type: ComponentType
  description: string
  promptText: string
  tags: string[]
  usageCount?: number
  brand?: string
  metadata?: {
    poseType?: 'standing' | 'sitting' | 'walking' | ...
    framing?: 'close-up' | 'medium' | 'full-body' | ...
    lightingType?: 'natural' | 'studio' | 'golden-hour' | ...
    locationType?: 'indoor' | 'outdoor' | 'studio' | ...
    outfitStyle?: 'casual' | 'athletic' | 'luxury' | ...
  }
}
```

## Usage

### 1. Initialize Database

```typescript
import { getComponentDatabase } from './component-database'
import { ALO_COMPONENTS } from './categories/alo-workout'

const db = getComponentDatabase()
db.addComponents(ALO_COMPONENTS)
```

### 2. Create Composition Builder

```typescript
import { CompositionBuilder } from './composition-builder'
import { DiversityEngine } from './diversity-engine'

const diversityEngine = new DiversityEngine()
const builder = new CompositionBuilder(diversityEngine)
```

### 3. Compose Prompts

```typescript
const prompt = builder.composePrompt({
  category: 'alo-workout',
  userIntent: 'athletic lifestyle shot',
  brand: 'ALO',
  referenceImages: true,
})

console.log(prompt.prompt) // Full composed prompt
console.log(prompt.title) // "Tennis Court Standing"
console.log(prompt.description) // Generated description
```

### 4. Generate Diverse Batch

```typescript
const concepts: ComposedPrompt[] = []
const diversityEngine = new DiversityEngine()

for (let i = 0; i < 6; i++) {
  const concept = builder.composePrompt({
    category: 'alo-workout',
    userIntent: 'athletic lifestyle',
    brand: 'ALO',
    previousConcepts: concepts.map(c => c.components),
  })

  if (diversityEngine.isDiverseEnough(concept.components)) {
    concepts.push(concept)
    diversityEngine.recordConcept(concept.components)
  }
}
```

## Diversity Engine

The Diversity Engine ensures no two concepts are too similar by:

1. **Tracking used components** - Prevents exact repetition
2. **Calculating similarity** - Compares pose type, location, lighting, framing, outfit style
3. **Enforcing constraints** - Requires minimum differences between concepts

### Similarity Calculation

- Same pose type: +0.3
- Same location category: +0.2
- Same lighting type: +0.2
- Same framing: +0.15
- Same outfit style: +0.15

**Threshold:** Concepts with similarity > 0.7 are rejected.

## Component Database

The database provides:

- **Indexed storage** - Fast lookup by category, type, brand, tags
- **Usage tracking** - Prevents overuse of popular components
- **Smart filtering** - Complex queries with metadata matching
- **Random selection** - Prefers less-used components

## Adding New Components

### Option 1: Manual Creation

```typescript
import { PromptComponent } from './types'

const newComponent: PromptComponent = {
  id: 'unique-id',
  category: 'category-name',
  type: 'pose',
  description: 'Human-readable description',
  promptText: 'Actual prompt text to use',
  tags: ['tag1', 'tag2'],
  metadata: {
    poseType: 'standing',
  },
}
```

### Option 2: Extract from Universal Prompt

```typescript
import { extractComponentsFromPrompt } from './component-extractor'

const components = extractComponentsFromPrompt(
  universalPromptText,
  'category-name',
  'BRAND'
)

// components.pose, components.outfit, etc.
```

## Integration with Concept Generation

The system integrates with `/app/api/maya/generate-concepts/route.ts`:

1. **Replace template loading** with component database initialization
2. **Replace AI generation** with composition builder
3. **Add diversity enforcement** before returning concepts
4. **Use composed prompts** instead of AI-generated prompts

## Benefits

✅ **True Diversity** - Systematic variation ensures different concepts  
✅ **High Quality** - Components from professional Universal Prompts  
✅ **Brand Integration** - Specific brand elements, not generic mentions  
✅ **Technical Precision** - Specific camera specs, lighting details  
✅ **Scalable** - Easy to add new categories and components  
✅ **Maintainable** - Clear separation of concerns

## Next Steps

1. Extract components from all 148 Universal Prompts
2. Create category files for all 12 categories
3. Integrate with concept generation API
4. Add component usage analytics
5. Create admin UI for component management

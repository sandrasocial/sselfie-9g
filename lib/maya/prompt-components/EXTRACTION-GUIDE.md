# Component Extraction Guide

## Overview

This guide explains how to populate the `universal-prompts-raw.ts` file with actual Universal Prompts from the `Universal_AI_Image_Prompts.md` file.

## Structure

The `UNIVERSAL_PROMPTS_RAW` object should contain all 148 prompts organized by category:

```typescript
export const UNIVERSAL_PROMPTS_RAW: Record<string, RawUniversalPrompt[]> = {
  'alo-workout': [
    {
      id: 'alo-001',
      title: 'Movement Shot',
      fullPrompt: `[Full prompt text here]`,
    },
    // ... 9 more ALO prompts
  ],
  // ... 11 more categories
}
```

## Categories

1. **alo-workout** - 10 prompts
2. **chanel-luxury** - 9 prompts
3. **travel-lifestyle** - 10 prompts
4. **seasonal-christmas** - 10 prompts
5. **beauty** - 18 prompts
6. **venice-thailand-travel** - 18 prompts
7. **fashion** - 11 prompts
8. **lifestyle-wellness** - 17 prompts
9. **luxury-lifestyle** - 9 prompts
10. **tech** - 12 prompts
11. **selfies** - 12 prompts
12. **generic-lifestyle** - Fallback prompts

**Total: 148 prompts**

## Extraction Process

### Step 1: Read Universal_AI_Image_Prompts.md

Open the markdown file and identify each prompt by:
- Category/collection name
- Prompt title
- Full prompt text

### Step 2: Format Each Prompt

For each prompt, create an object:

```typescript
{
  id: 'category-001', // e.g., 'alo-001', 'chanel-001'
  title: 'Prompt Title', // e.g., 'Movement Shot', 'Editorial Luxury'
  fullPrompt: `Full prompt text exactly as it appears in the markdown file`,
}
```

### Step 3: Add to Appropriate Category

Place each prompt in the correct category array in `UNIVERSAL_PROMPTS_RAW`.

### Step 4: Verify Count

After adding all prompts, verify:
- Total count = 148
- Each category has the expected number of prompts
- All IDs are unique

## Example: ALO Collection

```typescript
'alo-workout': [
  {
    id: 'alo-001',
    title: 'Movement Shot',
    fullPrompt: `Vertical 2:3 photo in UGC influencer style from Alo captured in movement. Woman maintaining exactly the characteristics of the person in the attachment (face, visual identity), without copying the photo.

She walks slowly through a modern and minimalist space, wearing a monochromatic Alo outfit and sneakers. Adjusts sunglasses during the walk.

Hair loose with volume and waves. Natural glam makeup.

Balanced natural lighting. Full body framing with slight sense of movement. Real, clean and aspirational aesthetic.`,
  },
  {
    id: 'alo-002',
    title: 'Yoga Mat Event',
    fullPrompt: `[Next prompt text]`,
  },
  // ... 8 more
],
```

## ID Naming Convention

- Format: `{category}-{number}`
- Examples:
  - `alo-001`, `alo-002`, ..., `alo-010`
  - `chanel-001`, `chanel-002`, ..., `chanel-009`
  - `travel-001`, `travel-002`, ..., `travel-010`

## After Population

Once `universal-prompts-raw.ts` is populated:

1. **Database will auto-initialize** - Components will be extracted automatically
2. **Components will be indexed** - By category, type, brand, tags
3. **Ready for composition** - Can start building prompts from components

## Testing Extraction

After populating, test extraction:

```typescript
import { getComponentDatabase } from './component-database'

const db = getComponentDatabase()
console.log('Total components:', db.getCount())
console.log('Categories:', db.getCategories())

// Test query
const poses = db.query({ type: 'pose', category: 'alo-workout' })
console.log('ALO poses:', poses.length)
```

## Quality Checklist

Before considering extraction complete:

- ✅ All 148 prompts added
- ✅ All categories populated
- ✅ IDs are unique and follow convention
- ✅ Full prompt text preserved exactly
- ✅ Titles are descriptive
- ✅ Database initializes without errors
- ✅ Components extract correctly
- ✅ Query system works

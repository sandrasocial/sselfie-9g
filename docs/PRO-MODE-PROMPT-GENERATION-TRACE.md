# Pro Mode Prompt Generation Trace

## Flow Diagram

```
User Request ("Pinterest influencer style")
    ↓
useConceptGeneration.generateConcepts(userRequest, imageLibrary)
    ↓
detectCategory(userRequest, imageLibrary) → Returns CategoryInfo
    ↓
getCategoryPrompts(categoryKey, library) → Returns UniversalPrompt[]
    ↓
❌ PROBLEM: Returns HARDCODED placeholder prompts (same every time!)
    ↓
buildProModePrompt(category, conceptComponents, library) → Builds full prompt
    ↓
API: /api/maya/pro/generate-concepts
    ↓
Returns concepts with generic descriptions
```

## Problem Locations

### 1. Placeholder Prompts (Root Cause)

**File:** `lib/maya/pro/category-system.ts` (Lines 193-230)

**Problem:**
```typescript
const placeholderPrompts: UniversalPrompt[] = [
  {
    id: `concept-1-${category}`,
    title: `${categoryInfo.name} Concept 1`,  // ❌ Generic: "Lifestyle Concept 1"
    description: `Professional ${categoryInfo.name.toLowerCase()} content with ${categoryInfo.description}`,  // ❌ Generic: "Professional lifestyle content with..."
    // ❌ userRequest is NOT used here!
    fullPrompt: `Professional photography. Influencer/Pinterest style portrait maintaining exactly the same physical characteristics. ${categoryInfo.description}. Shot on iPhone 15 Pro, natural skin texture, film grain, muted colors.`,  // ❌ Same template every time!
  },
  // ... 2 more identical placeholders
]
```

**Why it defaults:**
- `userRequest` parameter is **never used** in `getCategoryPrompts()`
- All prompts use the same template with only category name changed
- No variation based on user's actual request

### 2. User Request Not Passed to Prompt Generation

**File:** `app/api/maya/pro/generate-concepts/route.ts` (Line 197)

**Problem:**
```typescript
const { userRequest, imageLibrary, category, essenceWords, concepts } = body
// userRequest is extracted but...
const universalPrompts = getCategoryPrompts(categoryKey, library)
// ❌ userRequest is NOT passed to getCategoryPrompts!
```

**File:** `lib/maya/pro/category-system.ts` (Line 168)

**Function signature:**
```typescript
export function getCategoryPrompts(
  category: string | null,
  userLibrary: ImageLibrary
): UniversalPrompt[] {
  // ❌ No userRequest parameter!
  // ❌ Cannot use user's actual request to generate prompts
}
```

### 3. Prompt Builder Doesn't Use User Request

**File:** `lib/maya/pro/prompt-builder.ts` (Line 41)

**Function signature:**
```typescript
export function buildProModePrompt(
  category: string,
  concept: ConceptComponents,
  userImages: ImageLibrary
): string {
  // ❌ No userRequest parameter!
  // ❌ Cannot personalize prompts based on user's request
}
```

## Solution

### Fix 1: Use AI to Generate Dynamic Prompts

Instead of placeholder prompts, use Maya's AI to generate unique prompts based on:
- User's request
- Chat history
- Category
- Image library

### Fix 2: Pass User Request Through the Chain

1. Update `getCategoryPrompts()` to accept `userRequest`
2. Update `buildProModePrompt()` to accept `userRequest`
3. Use `userRequest` to personalize prompts

### Fix 3: Use Chat History

1. Pass `conversationContext` to generate-concepts API
2. Use chat history to inform prompt generation
3. Make prompts reflect the conversation context

## Image Display Issue

**File:** `components/sselfie/pro-mode/ConceptCardPro.tsx` (Line 66-144)

**Problem:**
```typescript
const formatLinkedImages = () => {
  return concept.linkedImages.join(' • ')  // ❌ Returns text URLs
}

<p>{formatLinkedImages()}</p>  // ❌ Displays URLs as text
```

**Fix:** Replace with image thumbnail grid component






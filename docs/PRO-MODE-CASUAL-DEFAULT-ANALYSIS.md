# Pro Mode "Casual" Default Analysis

## Problem Statement
ALL concept cards generated in Pro Mode are defaulting to "casual" category, regardless of user input or upload module selections.

## Root Cause Analysis

### 1. **Prompt Constructor Path (Primary Issue)**

**Location**: `app/api/maya/generate-concepts/route.ts:2842-2968`

**Issue**: The prompt constructor path has multiple default-to-casual points:

1. **Line 2842**: `usePromptConstructor` requires `userRequest` to be truthy
   ```typescript
   const usePromptConstructor = studioProMode && !detectedGuidePrompt && userRequest && !isUnsupportedCategory
   ```
   - If `userRequest` is empty/null/undefined, `usePromptConstructor = false`
   - This causes fallback to AI generation path (which also defaults to casual)

2. **Line 2863-2866**: Default values set to 'casual'
   ```typescript
   let category = 'casual'  // ❌ DEFAULT
   let vibe = 'casual'      // ❌ DEFAULT
   let location = 'street'  // ❌ DEFAULT
   let detectedCategoryForMapping = 'casual-lifestyle'  // ❌ DEFAULT
   ```

3. **Line 2933-2946**: When user provides request OR no upload module category
   - Uses `detectCategoryForPromptConstructor()` which defaults to 'casual' (line 230)
   - Uses `detectCategoryFromRequest()` which defaults to 'casual-lifestyle' (line 150)

4. **Line 3063-3065**: Concept titles use the `category` variable
   ```typescript
   const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1)
   conceptTitle = `${categoryTitle} Concept ${i + 1}`  // Results in "Casual Concept 1"
   ```
   - If `category` is still 'casual' (default), all titles become "Casual Concept X"

### 2. **Category Detection Functions (Secondary Issue)**

**Location**: `app/api/maya/generate-concepts/route.ts:105-152` and `220-314`

**Issue**: Both detection functions default to 'casual' when no patterns match:

1. **`detectCategoryFromRequest()` (Line 150)**:
   ```typescript
   // Default fallback - use casual-lifestyle but log it
   console.warn('[v0] ⚠️ No category pattern matched, defaulting to casual-lifestyle...')
   return 'casual-lifestyle'
   ```

2. **`detectCategoryForPromptConstructor()` (Line 230)**:
   ```typescript
   // Detect category
   let category = 'casual'  // ❌ DEFAULT
   let vibe = 'casual'      // ❌ DEFAULT
   let location = 'street'  // ❌ DEFAULT
   ```
   - If no patterns match, returns `{ category: 'casual', vibe: 'casual', location: 'street' }`

### 3. **AI Generation Path (Tertiary Issue)**

**Location**: `app/api/maya/generate-concepts/route.ts:2600-2652`

**Issue**: When prompt constructor is skipped, AI generation path also defaults to casual:

1. **Line 2612**: Default value
   ```typescript
   let detectedCategory = 'casual-lifestyle'  // ❌ DEFAULT
   ```

2. **Line 2614-2644**: Only uses upload module category if `!hasUserRequestForAI`
   - But if userRequest is empty AND no upload module category → defaults to 'casual-lifestyle'

### 4. **Upload Module Category Not Used When userRequest is Empty**

**Location**: `app/api/maya/generate-concepts/route.ts:2858-2859`

**Issue**: The logic checks `hasUserRequest` but doesn't properly handle the case where:
- `userRequest` is empty/null/undefined
- BUT `uploadModuleCategory` exists
- Should use upload module category, but currently defaults to casual

**Current Logic**:
```typescript
const hasUserRequest = userRequest && userRequest.trim().length > 0
const shouldUseUploadModuleCategory = uploadModuleCategory && !hasUserRequest
```

**Problem**: If `userRequest` is empty string `""`, `hasUserRequest = false`, but the code still goes to the `else` block (line 2933) which uses pattern matching on empty string, resulting in 'casual' default.

### 5. **Concept Title Generation**

**Location**: `app/api/maya/generate-concepts/route.ts:3050-3066`

**Issue**: Concept titles are generated from the `category` variable:
- If `category` is still 'casual' (default), all titles become "Casual Concept 1", "Casual Concept 2", etc.
- Only uses upload module category if BOTH `uploadModuleCategory` AND `uploadModuleConcept` exist
- If only `uploadModuleCategory` exists, it falls back to `category` (which is 'casual')

## Flow Diagram (Current Broken Flow)

```
Pro Mode Request
    ↓
Is userRequest truthy? 
    ├─ NO → usePromptConstructor = false → AI Generation Path
    │         ↓
    │     detectedCategory = 'casual-lifestyle' (default)
    │         ↓
    │     All concepts = "Casual Concept X"
    │
    └─ YES → usePromptConstructor = true → Prompt Constructor Path
              ↓
          category = 'casual' (default)
              ↓
          detectCategoryForPromptConstructor(enrichedUserRequest)
              ├─ Pattern matches? → category = detected
              └─ No match? → category = 'casual' (default)
                  ↓
              conceptTitle = `${category} Concept ${i}` 
                  ↓
              All concepts = "Casual Concept X"
```

## Why This Happens

1. **Empty userRequest**: When user clicks "Generate" without typing anything, `userRequest = ""` or `null`
2. **Pattern matching fails**: Empty string doesn't match any category patterns
3. **Defaults everywhere**: Every function defaults to 'casual' when no match found
4. **Upload module ignored**: Even if upload module has category, it's not used when userRequest is empty
5. **No fallback logic**: No intelligent fallback to detect category from context, aesthetic, or conversation history

## Fix Strategy

### Priority 1: Fix Default Values
- Remove 'casual' as default in all category detection functions
- Use `null` or `undefined` and handle explicitly
- Only default to 'casual' as last resort with explicit logging

### Priority 2: Fix Upload Module Category Usage
- When `userRequest` is empty, ALWAYS use upload module category if available
- Don't require `userRequest` for prompt constructor if upload module category exists
- Use upload module category even if only `category` exists (not just when both category AND concept exist)

### Priority 3: Improve Category Detection
- Use `conversationContext` more aggressively for category detection
- Use `aesthetic` and `context` parameters for category hints
- Don't default to 'casual' - try harder to detect category from available context

### Priority 4: Fix Concept Titles
- Use detected category from multiple sources (upload module, userRequest, conversationContext, aesthetic)
- Don't use 'casual' variable directly - use the most specific category detected
- Map categories to better titles (e.g., 'alo-workout' → 'Workout', not 'Casual')

### Priority 5: Add Better Logging
- Log when defaults are used
- Log category detection results at each step
- Log why 'casual' was chosen (empty userRequest, no pattern match, etc.)

## Implementation Plan

1. **Fix `detectCategoryForPromptConstructor()`**: Remove 'casual' default, return null if no match
2. **Fix `detectCategoryFromRequest()`**: Remove 'casual-lifestyle' default, return null if no match
3. **Fix prompt constructor path**: Use upload module category when userRequest is empty
4. **Fix AI generation path**: Use upload module category when userRequest is empty
5. **Fix concept titles**: Use best available category source, not just 'category' variable
6. **Add fallback logic**: Use conversationContext, aesthetic, context for category hints
7. **Add comprehensive logging**: Track category detection at every step
























# Web Search Tools Fix v2 - Correct AI SDK Tool Implementation

## Issue

The `webSearchTool` objects were initially defined as plain JavaScript objects with `parameters` and `execute` properties, but the Vercel AI SDK requires tools to be created using the `tool()` function from the "ai" package with Zod schema validation for `inputSchema` (called `parameters` in the tool function).

## Root Cause

Passing plain objects to the `tools` parameter causes the AI calls to fail at runtime because:
1. The AI SDK expects tools created with the `tool()` function
2. Parameters must be defined using Zod schemas (`z.object()`)
3. Type inference works better with the proper tool structure

## Files Fixed

### 1. Pro Mode Concept Generation
**File:** `app/api/maya/pro/generate-concepts/route.ts`
- ✅ Added `tool` import from "ai"
- ✅ Added `z` import from "zod"
- ✅ Changed from plain object to `tool({ ... })` with Zod schema
- ✅ Fixed tools parameter to `{ searchWeb: webSearchTool }`

### 2. Feed Prompt Generation
**File:** `app/api/maya/generate-feed-prompt/route.ts`
- ✅ Added `tool` import from "ai"
- ✅ Added `z` import from "zod"
- ✅ Changed from plain object to `tool({ ... })` with Zod schema
- ✅ Fixed `maxTokens` to `maxOutputTokens` for `streamText`
- ✅ Fixed tools parameter to `{ searchWeb: webSearchTool }`
- ✅ Fixed TypeScript type annotations for `.map()` calls

### 3. Feed Planner Visual Composition
**File:** `lib/feed-planner/visual-composition-expert.ts`
- ✅ Added `tool` import from "ai"
- ✅ Added `z` import from "zod"
- ✅ Changed from plain object to `tool({ ... })` with Zod schema
- ✅ Fixed tools parameter to `{ searchWeb: webSearchTool }`

## Correct Implementation

### Before (Incorrect):
```typescript
const webSearchTool = {
  searchWeb: {
    description: "...",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "...",
        },
      },
      required: ["query"],
    },
    execute: async ({ query }: { query: string }) => { ... },
  },
}

// Usage
tools: webSearchTool  // ❌ Wrong
```

### After (Correct):
```typescript
import { tool } from "ai"
import { z } from "zod"

const webSearchTool = tool({
  description: "Search the web for current fashion trends, Instagram aesthetics, brand information, and styling tips",
  parameters: z.object({
    query: z.string().describe("Search query for fashion trends, Instagram aesthetics, brands, or styling information"),
  }),
  execute: async ({ query }) => {
    // TypeScript infers types from Zod schema automatically
    // Implementation...
  },
})

// Usage
tools: {
  searchWeb: webSearchTool,  // ✅ Correct
}
```

## Key Changes

1. **Import statements:**
   - Added `tool` from "ai"
   - Added `z` from "zod"

2. **Tool definition:**
   - Changed from plain object to `tool({ ... })`
   - Changed `parameters` from JSON Schema to Zod schema: `z.object({ query: z.string().describe("...") })`
   - Removed nested `searchWeb` wrapper (that's done in the `tools` parameter)
   - TypeScript automatically infers types from Zod schema (no need for explicit type annotations)

3. **Tools parameter:**
   - Changed from `tools: webSearchTool` to `tools: { searchWeb: webSearchTool }`
   - This matches the AI SDK's expected format

4. **Additional fixes:**
   - Fixed `maxTokens` → `maxOutputTokens` for `streamText` API
   - Fixed TypeScript type annotations for `.map()` calls

## Verification

✅ All three files now use the correct `tool()` function
✅ All tools use Zod schemas for parameter validation
✅ All tools are properly passed to AI SDK calls
✅ TypeScript type inference works correctly
✅ No linting errors

---

**Status:** ✅ Fixed
**Date:** 2025-01-XX


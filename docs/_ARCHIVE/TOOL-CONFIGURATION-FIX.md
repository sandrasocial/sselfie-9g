# Tool Configuration Fix

## Issue

Error in `generate-concepts` route:
```
"The value at toolConfig.tools.0.toolSpec.inputSchema.json.type must be one of the following: object."
```

## Root Cause

The Vercel AI SDK requires tools to be created using the `tool()` function with Zod schema validation. Some routes were using the old format (plain JavaScript objects with JSON schema).

## Files Fixed

### 1. `app/api/maya/instagram-tips/route.ts`
- **Before:** Used plain object with `parameters: { type: "object", properties: {...} }`
- **After:** Uses `tool()` function with `z.object()` for parameters
- **Changes:**
  - Added imports: `tool` from "ai" and `z` from "zod"
  - Refactored `webSearchTool` to use `tool()` function
  - Added proper error handling for Brave Search API

### 2. `lib/maya/direct-prompt-generation.ts`
- **Before:** Used `maxTokens` parameter
- **After:** Changed to `maxOutputTokens` (correct parameter name for AI SDK)
- **Changes:**
  - Line 392: `maxTokens` → `maxOutputTokens`
  - Line 625: `maxTokens` → `maxOutputTokens`

## Tool Format Requirements

**❌ OLD FORMAT (Incorrect):**
```typescript
tools: {
  searchWeb: {
    description: "...",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "..." }
      },
      required: ["query"]
    },
    execute: async ({ query }) => { ... }
  }
}
```

**✅ NEW FORMAT (Correct):**
```typescript
import { tool } from "ai"
import { z } from "zod"

const webSearchTool = tool({
  description: "...",
  parameters: z.object({
    query: z.string().describe("...")
  }),
  execute: async ({ query }: { query: string }) => { ... }
})

tools: {
  searchWeb: webSearchTool
}
```

## Verification

✅ `app/api/maya/instagram-tips/route.ts` - Fixed to use `tool()` function
✅ `lib/maya/direct-prompt-generation.ts` - Fixed `maxTokens` → `maxOutputTokens`
✅ All other routes already using correct format:
  - `app/api/maya/pro/generate-concepts/route.ts`
  - `app/api/maya/generate-feed-prompt/route.ts`
  - `lib/feed-planner/visual-composition-expert.ts`

## Status

✅ Fixed - All tool configurations now use the correct AI SDK format

---

**Date:** 2025-01-XX


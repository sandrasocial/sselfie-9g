# Consistency Mode - Pro Mode Only Fix

## Issue

Consistency mode (the toggle that lets users choose "variety" vs "consistent" for concept generation) was incorrectly included in Classic Mode. This feature should **ONLY** be available in Pro Mode.

## Changes Made

### 1. Removed consistencyMode from Classic Mode API Route

**File:** `app/api/maya/generate-concepts/route.ts`

- Changed `consistencyMode = 'variety'` default to `consistencyMode` (no default, optional)
- Added `studioProMode` check to consistency mode logic: `studioProMode && consistencyMode === 'consistent'`
- Only log consistencyMode if it's Pro Mode: `consistencyMode: studioProMode ? consistencyMode : undefined`
- Consistency mode post-processing now only runs if `studioProMode` is true

**Before:**
```typescript
consistencyMode = 'variety', // Default to variety mode
// ... later in code ...
const shouldEnableConsistency = (
  consistencyMode === 'consistent' && 
  concepts.length >= 2
)
```

**After:**
```typescript
consistencyMode, // Pro Mode only - not used in Classic Mode
// ... later in code ...
const shouldEnableConsistency = (
  studioProMode && // Only in Pro Mode
  consistencyMode === 'consistent' && 
  concepts.length >= 2
)
```

### 2. Removed consistencyMode from Classic Mode Frontend Request

**File:** `components/sselfie/maya-chat-screen.tsx`

Removed `consistencyMode` from Classic Mode request body:

**Before:**
```typescript
: {
    userRequest: pendingConceptRequest,
    count: 6,
    consistencyMode: consistencyMode, // ❌ Should not be in Classic Mode
    conversationContext: conversationContext || undefined,
}
```

**After:**
```typescript
: {
    userRequest: pendingConceptRequest,
    count: 6,
    // consistencyMode is Pro Mode only - not sent in Classic Mode ✅
    conversationContext: conversationContext || undefined,
}
```

### 3. Removed consistencyModeIntelligence from Shared Personality

**File:** `lib/maya/personality/shared-personality.ts`

Removed `consistencyModeIntelligence` since it's Pro Mode only, not shared between modes.

**Rationale:** The `SHARED_MAYA_PERSONALITY` object should only contain traits that are shared between Classic and Pro modes. Since consistency mode is Pro Mode only, its intelligence should not be in the shared personality.

## Verification

✅ Consistency toggle is only shown in Pro Mode UI (already correct - wrapped in `{studioProMode ? (...)`)

✅ Consistency mode logic only runs in Pro Mode route

✅ Classic Mode no longer receives or processes consistencyMode

✅ Shared personality no longer includes Pro Mode-only features

## Why Consistency Mode is Pro Mode Only

1. **Different Prompt Structures:**
   - Pro Mode: 150-400 word structured prompts with detailed sections
   - Classic Mode: 30-60 word natural language prompts with trigger words

2. **Different Model Types:**
   - Pro Mode: Nano Banana Pro (uses reference images, structured prompts)
   - Classic Mode: Flux models (uses trigger words, natural language)

3. **Different Use Cases:**
   - Pro Mode: Professional, editorial-quality content with consistency
   - Classic Mode: Quick, authentic Instagram-style content with variety

## Files Changed

- ✅ `app/api/maya/generate-concepts/route.ts` - Removed consistencyMode handling from Classic Mode
- ✅ `components/sselfie/maya-chat-screen.tsx` - Removed consistencyMode from Classic Mode request
- ✅ `lib/maya/personality/shared-personality.ts` - Removed consistencyModeIntelligence (Pro Mode only)

---

**Status:** ✅ Fixed
**Date:** 2025-01-XX


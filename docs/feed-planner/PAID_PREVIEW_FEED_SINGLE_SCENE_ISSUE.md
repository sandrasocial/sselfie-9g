# Paid Preview Feed Single Scene Issue - Audit

## Problem
When paid blueprint users create a preview feed and generate an image:
- ❌ **Only one scene is generated** (single 4:5 image)
- ✅ **Should generate all 9 scenes** in one 9:16 image with 3x3 grid

According to architecture:
- **Preview Feeds**: Full template injected (all 9 scenes) → One 9:16 image with 3x3 grid
- **Full Feeds**: Scene extracted for specific position → One 4:5 image with one scene

## Root Cause Analysis

### Code Flow

1. **Pro Mode Entry** (`app/api/feed/[feedId]/generate-single/route.ts:255`)
   - All Pro Mode posts enter this section
   - Checks `generationMode === 'pro'`

2. **Access Check** (lines 449-651)
   - `if (access.isFree)` → Lines 449-650
   - `else if (access.isPaidBlueprint)` → Lines 651+

3. **Preview Feed Check** (lines 630-642)
   - ✅ **Correctly checks `isPreviewFeed`** inside `if (access.isFree)` block
   - ✅ **Uses full template** for free users with preview feeds
   - ❌ **NOT checked for paid blueprint users**

4. **Paid Blueprint Logic** (lines 651+)
   - Goes to Maya generation logic
   - OR extracts single scene (lines 315-441)
   - ❌ **Never checks if feed is preview feed**

### The Problem

```typescript:app/api/feed/[feedId]/generate-single/route.ts
// Line 449-650: Free user logic
if (access.isFree) {
  // ... template injection ...
  
  // Line 630-642: Preview feed check (ONLY for free users)
  const isPreviewFeed = feedLayout?.layout_type === 'preview'
  if (isPreviewFeed) {
    finalPrompt = injectedTemplate  // ✅ Full template for free preview feeds
  } else {
    finalPrompt = buildSingleImagePrompt(injectedTemplate, post.position)  // Single scene
  }
}

// Line 651+: Paid blueprint logic
else if (access.isPaidBlueprint) {
  // ❌ NO preview feed check here!
  // Goes directly to Maya generation or scene extraction
  // Always extracts single scene, never uses full template
}
```

### Why This Happens

The preview feed check (`isPreviewFeed`) is **only inside the free user block**. When a paid blueprint user generates a preview feed:

1. ✅ Enters Pro Mode section
2. ✅ Skips free user block (`access.isFree` is false)
3. ❌ Goes to paid blueprint block (`access.isPaidBlueprint` is true)
4. ❌ Never checks `layout_type === 'preview'`
5. ❌ Always extracts single scene or uses Maya generation

## Solution

### Option 1: Check Preview Feed Before Access Check (RECOMMENDED)
**Complexity**: ⭐ Simple (1 file, ~20 lines)

**Change**: Check `isPreviewFeed` at the beginning of Pro Mode section, before access checks. Handle preview feeds the same way for both free and paid users.

**Rationale**: 
- Preview feeds should work the same regardless of user access level
- Minimal code duplication
- Clear separation of concerns

**Files to modify**:
- `app/api/feed/[feedId]/generate-single/route.ts` (lines 255-651)

**Change**:
```typescript
// BEFORE: Access check first, then preview feed check only for free users
if (access.isFree) {
  // ... preview feed check inside ...
} else if (access.isPaidBlueprint) {
  // No preview feed check
}

// AFTER: Preview feed check first, then access check
const isPreviewFeed = feedLayout?.layout_type === 'preview'

if (isPreviewFeed) {
  // Handle preview feeds the same for ALL users (free and paid)
  // Use full injected template
} else if (access.isFree) {
  // Free user full feed logic
} else if (access.isPaidBlueprint) {
  // Paid blueprint full feed logic
}
```

### Option 2: Add Preview Feed Check in Paid Blueprint Block
**Complexity**: ⭐⭐ Medium (1 file, ~30 lines)

**Change**: Add preview feed check inside paid blueprint block, duplicate the preview feed logic.

**Rationale**: Less refactoring, but code duplication.

## Recommendation

**Option 1** is recommended because:
1. ✅ Preview feeds work the same for all users
2. ✅ No code duplication
3. ✅ Clearer logic flow
4. ✅ Easier to maintain

## Implementation Plan

1. **Move preview feed check** to beginning of Pro Mode section
2. **Handle preview feeds** before access checks
3. **Use full template** for preview feeds (same logic for free and paid)
4. **Test**: Paid user creates preview feed → should see 9:16 image with all 9 scenes

## Files Involved

- `app/api/feed/[feedId]/generate-single/route.ts` (lines 255-651) - **PRIMARY FIX**

## Expected Behavior After Fix

1. Paid user creates preview feed
2. User clicks generate on preview feed
3. **✅ Full template injected** (all 9 scenes)
4. **✅ One 9:16 image generated** with 3x3 grid
5. **✅ All 9 scenes visible** in single image

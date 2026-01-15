# Paid Preview Feed Single Scene Issue - Deeper Audit

## Problem
Paid blueprint users creating preview feeds are still getting single scenes instead of full 9-scene template.

## Root Cause Analysis

### Code Flow Issues

1. **Early Exit with Stored Prompt** (Line 317-320)
   ```typescript
   if (!isPreviewFeed && post.prompt && post.prompt.length > 50) {
     finalPrompt = post.prompt  // ❌ Uses stored prompt without checking if it's a single scene
   }
   ```
   **Problem**: If post already has a prompt stored (from pre-generation or previous attempt), it uses that prompt. For preview feeds, this might be a single scene prompt.

2. **Paid Blueprint Scene Extraction** (Line 321-447)
   ```typescript
   else if (!isPreviewFeed && access.isPaidBlueprint) {
     // Extracts single scene
     finalPrompt = buildSingleImagePrompt(injectedTemplate, post.position)
   }
   ```
   **Status**: ✅ Correctly skipped for preview feeds

3. **Preview Feed Check in Fallback** (Line 452+)
   ```typescript
   if (!finalPrompt || finalPrompt.trim().length < 20) {
     if (isPreviewFeed) {
       // Generate full template
     }
   }
   ```
   **Problem**: Only runs if `finalPrompt` is null or too short. If post has a stored single-scene prompt (>50 chars), this block is skipped!

4. **Maya Generation Path** (Line 651+)
   ```typescript
   else if (access.isPaidBlueprint) {
     // Maya generation - might generate single scene
   }
   ```
   **Problem**: This path might be reached for paid users even with preview feeds if the preview feed check doesn't set `finalPrompt`.

## The Real Issue

**The preview feed check happens too late!**

If a post already has a prompt stored (from `create-free-example` or pre-generation), the code uses it immediately without checking:
1. If it's a preview feed
2. If the stored prompt is a single scene or full template

## Solutions

### Option 1: Force Preview Feed Check First (RECOMMENDED)
**Complexity**: ⭐ Simple

**Change**: Check `isPreviewFeed` FIRST, before any stored prompt check. If preview feed, always regenerate full template.

**Implementation**:
```typescript
// Check preview feed FIRST
const isPreviewFeed = feedLayout?.layout_type === 'preview'

if (isPreviewFeed) {
  // ALWAYS generate full template for preview feeds
  // Ignore any stored prompt - preview feeds need full template
  finalPrompt = null  // Force regeneration
} else {
  // For non-preview feeds, check stored prompt
  if (post.prompt && post.prompt.length > 50) {
    finalPrompt = post.prompt
  }
}
```

### Option 2: Validate Stored Prompt for Preview Feeds
**Complexity**: ⭐⭐ Medium

**Change**: Check if stored prompt is full template (contains "9 frames" or grid instructions) vs single scene.

**Implementation**:
```typescript
if (post.prompt && post.prompt.length > 50) {
  if (isPreviewFeed) {
    // Validate stored prompt is full template
    const isFullTemplate = post.prompt.includes('9 frames') || 
                          post.prompt.includes('3x3 grid') ||
                          post.prompt.split(/\s+/).length > 500  // Full templates are long
    
    if (!isFullTemplate) {
      // Stored prompt is single scene - regenerate full template
      finalPrompt = null
    } else {
      finalPrompt = post.prompt
    }
  } else {
    finalPrompt = post.prompt
  }
}
```

### Option 3: Clear Stored Prompts for Preview Feeds
**Complexity**: ⭐ Simple

**Change**: When creating preview feed, don't store prompts. Or clear them before generation.

**Implementation**: In `create-free-example/route.ts`, don't save template prompt to post, or set it to NULL.

## Recommendation

**Option 1** is simplest and most reliable:
- ✅ Always ensures preview feeds get full template
- ✅ No validation logic needed
- ✅ Clear and explicit
- ✅ Works even if prompts are pre-generated

## Implementation Plan

1. Move preview feed check to very beginning (before stored prompt check)
2. Force `finalPrompt = null` for preview feeds to ensure regeneration
3. Ensure preview feed handling always generates full template
4. Test: Paid user creates preview feed → should always get full template

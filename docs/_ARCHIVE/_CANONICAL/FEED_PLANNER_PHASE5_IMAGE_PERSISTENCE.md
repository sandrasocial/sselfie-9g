# Feed Planner Stabilization - Phase 5: Image Persistence & UI Fix
## Audit and Fix Image Storage and Display

**Date:** January 2026  
**Phase:** 5 - Image Persistence & UI  
**Status:** 🔄 In Progress

---

## CURRENT FLOW ANALYSIS

### Image Generation Flow

1. **`generate-single` Route:**
   - Calls `generateWithNanoBanana()` with prompt
   - Saves `prediction_id` to `feed_posts`
   - Returns `predictionId` to client
   - Status: `generating`

2. **`check-post` Route:**
   - Polls Replicate for prediction status
   - When `succeeded`, downloads image from Replicate
   - Uploads to Vercel Blob storage
   - Saves `image_url` to `feed_posts`
   - Status: `completed`

3. **UI Display:**
   - `feed-post-card.tsx` checks `post.image_url`
   - If present, displays image
   - If `generating`, shows loading spinner
   - If missing, shows placeholder

---

## ISSUES IDENTIFIED

### Issue 1: Preview Feed Image Persistence

**Problem:**
- Preview feed generates ONE image with 9 scenes
- Image is saved to first post (`position = 1`)
- Other posts (positions 2-9) don't have `image_url`
- Full-screen post cards show missing images for positions 2-9

**Current Behavior:**
```typescript
// Preview feed: ONE image for 9 scenes
// Saved to: feed_posts WHERE position = 1
// Missing: feed_posts WHERE position = 2-9
```

**Expected Behavior:**
- Preview feed image should be accessible for all 9 positions
- OR: Each position should have its own image_url (from full planner)

### Issue 2: Preview → Full Planner Mapping

**Problem:**
- Preview feed and full planner may have different scene content
- Preview image shows 9 scenes, but full planner generates 9 separate images
- No guarantee that preview scene 1 matches full planner scene 1

**Current Behavior:**
- Preview: 9 scenes in one image (position 1)
- Full Planner: 9 separate images (positions 1-9)
- No consistency check

**Expected Behavior:**
- Preview scene 1 = Full planner scene 1 (same activity, location, outfit)
- Preview scene 2 = Full planner scene 2
- ... (all 9 scenes match)

### Issue 3: Full-Screen Post Card Image Display

**Problem:**
- Full-screen post cards may show wrong image
- Preview feed images may not map correctly to full planner positions
- No validation that `image_url` matches scene content

**Current Behavior:**
```typescript
// feed-post-card.tsx
{post.image_url ? (
  <Image src={post.image_url} />
) : (
  <Placeholder />
)}
```

**Expected Behavior:**
- Correct image per scene (validated)
- Preview → Full planner mapping correct
- Missing images handled gracefully

---

## FIXES REQUIRED

### Fix 1: Preview Feed Image Persistence

**Solution:**
- Save preview image URL to all 9 posts (not just position 1)
- OR: Create preview image reference table
- Ensure preview images are accessible for all positions

**Implementation:**
```typescript
// After preview image generation succeeds
const previewImageUrl = blobUrl // From check-post route

// Save to all 9 posts
for (let position = 1; position <= 9; position++) {
  await sql`
    UPDATE feed_posts
    SET preview_image_url = ${previewImageUrl}
    WHERE feed_layout_id = ${feedLayoutId} AND position = ${position}
  `
}
```

### Fix 2: Scene Consistency Validation

**Solution:**
- Use `validateSceneConsistency()` from Phase 4
- Ensure preview scenes match full planner scenes
- Log divergences if any

**Implementation:**
```typescript
// Before generating full planner images
const previewScenes = await resolveConsistentScenes(previewFeedLayout, user)
const fullPlannerScenes = await resolveConsistentScenes(feedLayout, user)

const validation = validateSceneConsistency(previewScenes, fullPlannerScenes)
if (!validation.consistent) {
  console.error('Scene divergence:', validation.divergences)
}
```

### Fix 3: Full-Screen Post Card Image Display

**Solution:**
- Use `preview_image_url` if `image_url` is missing (for preview feeds)
- Validate image URL matches scene content
- Show correct image per scene

**Implementation:**
```typescript
// feed-post-card.tsx
const imageUrl = post.image_url || post.preview_image_url

{imageUrl ? (
  <Image src={imageUrl} />
) : (
  <Placeholder />
)}
```

---

## DATABASE SCHEMA CHANGES

### Add `preview_image_url` Column

**Table:** `feed_posts`

**Column:** `preview_image_url` (TEXT, nullable)

**Purpose:** Store preview feed image URL for all 9 posts

**Migration:**
```sql
ALTER TABLE feed_posts
ADD COLUMN preview_image_url TEXT;
```

---

## IMPLEMENTATION PLAN

### Step 1: Add Preview Image Persistence

1. Update `check-post` route to save preview image to all 9 posts
2. Add `preview_image_url` column to `feed_posts`
3. Update image display logic to use `preview_image_url` as fallback

### Step 2: Scene Consistency Validation

1. Add validation before full planner generation
2. Log divergences if preview and full planner scenes don't match
3. Use `validateSceneConsistency()` from Phase 4

### Step 3: Full-Screen Post Card Fix

1. Update `feed-post-card.tsx` to use `preview_image_url` fallback
2. Add image validation (check image URL matches scene)
3. Handle missing images gracefully

---

## TESTING CHECKLIST

- [ ] Preview feed image saves to all 9 posts
- [ ] Full planner images save correctly per position
- [ ] Preview → Full planner scene consistency validated
- [ ] Full-screen post cards show correct images
- [ ] Missing images handled gracefully
- [ ] Preview images accessible for all positions

---

**End of Phase 5 Audit**

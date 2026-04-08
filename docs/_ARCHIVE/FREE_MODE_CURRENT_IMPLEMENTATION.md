# FREE MODE - CURRENT IMPLEMENTATION ANALYSIS

**Date:** January 2025  
**Purpose:** Document what's currently working in free mode to prevent breaking changes  
**Status:** ✅ Complete Analysis

---

## CURRENT FREE MODE FLOW (WORKING)

### 1. Feed Creation
**Endpoint:** `/api/feed/create-free-example`  
**What it does:**
- Creates `feed_layouts` record with status 'saved'
- Creates ONE `feed_posts` record (position 1, `generation_mode: 'pro'`)
- Optionally loads template prompt from `blueprint_subscribers.form_data`
- Returns feedId and posts array

**Key Code:**
```typescript
// Creates 1 post at position 1
INSERT INTO feed_posts (
  feed_layout_id,
  user_id,
  position,
  post_type,
  generation_status,
  generation_mode,
  prompt
) VALUES (
  ${feedId},
  ${user.id},
  1,  // Only position 1
  'user',
  'pending',
  'pro',  // Nano Banana Pro
  ${templatePrompt}  // From blueprint_subscribers or NULL
)
```

---

### 2. UI Display
**Component:** `FeedSinglePlaceholder`  
**What it shows:**
- Single 9:16 aspect ratio placeholder
- "Generate Image" button (if no image)
- Generated image display (if `post.image_url` exists)
- Upsell button "Unlock Full Feed Planner"
- Loading state during generation

**Key Code:**
```typescript
// Shows single placeholder
<div className="aspect-[9/16] bg-white border-2 border-dashed border-stone-300 rounded-lg">
  {hasImage ? (
    <img src={post.image_url} />
  ) : (
    <Button onClick={handleGenerateImage}>Generate Image</Button>
  )}
</div>
```

---

### 3. Image Generation
**Endpoint:** `/api/feed/[feedId]/generate-single`  
**What it does:**
- Checks access control (allows free users)
- Checks credits (2 credits required)
- Uses Pro Mode (Nano Banana Pro) with avatar images
- Generates ONE individual image (not a grid)
- Stores in `feed_posts[0].image_url`
- Deducts 2 credits
- Returns prediction ID

**Key Code:**
```typescript
// Free users can generate individual images
const access = await getFeedPlannerAccess(user.id)
// No restriction on free users - they can generate if they have credits

// Uses Pro Mode
const avatarImages = await sql`
  SELECT image_url FROM user_avatar_images
  WHERE user_id = ${user.id} AND is_active = true
`

// Generates single image
const result = await generateWithNanoBanana({
  prompt: post.prompt || templatePrompt,
  base_images: avatarImages,
  // ... other params
})

// Stores in feed_posts.image_url
UPDATE feed_posts SET
  image_url = ${result.url},
  generation_status = 'completed',
  prediction_id = ${predictionId}
WHERE id = ${postId}
```

---

### 4. Polling & Status Updates
**Hook:** `useFeedPolling`  
**What it does:**
- Polls `/api/feed/[feedId]` every 3 seconds if generating
- Stops polling immediately when single post has `image_url`
- Updates UI when image is ready

**Key Code:**
```typescript
// Free blueprint: Stop immediately if single post has image
const singlePost = data?.posts?.length === 1 ? data.posts[0] : null
const singlePostHasImage = singlePost?.image_url

if (singlePostHasImage) {
  return 0 // Stop polling
}
```

---

### 5. Access Control
**Function:** `getFeedPlannerAccess()`  
**What it returns for free users:**
```typescript
{
  isFree: true,
  isPaidBlueprint: false,
  placeholderType: "single",  // Shows FeedSinglePlaceholder
  canGenerateImages: false,  // But they CAN generate if they have credits
  // ... other flags
}
```

**Note:** Even though `canGenerateImages: false`, free users CAN generate images if they have credits. The UI shows the generate button in `FeedSinglePlaceholder`.

---

## WHAT'S WORKING ✅

1. ✅ **Feed Creation:** Free users get 1 post automatically
2. ✅ **Single Placeholder:** Shows 9:16 placeholder correctly
3. ✅ **Image Generation:** Free users can generate individual images (2 credits)
4. ✅ **Credit System:** 2 credits deducted correctly
5. ✅ **Polling:** Stops when image is ready
6. ✅ **Image Display:** Shows generated image in placeholder
7. ✅ **Upsell:** "Unlock Full Feed Planner" button works
8. ✅ **Template Prompts:** Loads from `blueprint_subscribers.form_data`

---

## WHAT MUST NOT BREAK ⚠️

### CRITICAL: Individual Image Generation
**Current Behavior:**
- Free users can generate ONE individual image
- Image stored in `feed_posts[0].image_url`
- Displayed in `FeedSinglePlaceholder`
- Costs 2 credits

**Must Preserve:**
- ✅ Keep `/api/feed/[feedId]/generate-single` working for free users
- ✅ Keep `FeedSinglePlaceholder` showing individual images
- ✅ Keep single post creation in `/api/feed/create-free-example`
- ✅ Keep polling logic for single post

---

## DESIRED CHANGES (ADD, DON'T REPLACE)

### New Feature: Grid Preview Generation
**What to ADD:**
- New endpoint: `/api/feed/[feedId]/generate-preview`
- Generates 3x4 grid preview (12 posts in 1 image)
- Stores in `feed_layouts.preview_image_url` (NEW field)
- Costs 2 credits
- Shows preview grid in `FeedSinglePlaceholder` (if exists)

**What to KEEP:**
- ✅ Individual image generation still works
- ✅ Single post creation still works
- ✅ Existing generated images still display

---

## MIGRATION STRATEGY (SAFE)

### Option A: Add Preview as Alternative (RECOMMENDED)
1. **Keep current flow:** Individual image generation works as-is
2. **Add preview option:** New button "Generate Preview Grid" (optional)
3. **Store preview separately:** `feed_layouts.preview_image_url`
4. **Display logic:** Show preview if exists, otherwise show individual image or placeholder

### Option B: Replace with Preview (NOT RECOMMENDED)
- ❌ Would break existing free users who have generated images
- ❌ Would require migration of existing `feed_posts[0].image_url` to preview
- ❌ More risky, could lose user data

---

## UPDATED GAP ANALYSIS

### Current State (CORRECTED)
- **Free mode:** 1 individual post, can generate 1 image (2 credits)
- **Display:** Single 9:16 placeholder showing individual image
- **Generation:** Individual image via `/api/feed/[feedId]/generate-single`
- **Storage:** `feed_posts[0].image_url`

### Desired State
- **Free mode:** Generate 3x4 grid preview (12 posts in 1 image, 2 credits)
- **Display:** Show preview grid image (if exists)
- **Generation:** Grid preview via `/api/feed/[feedId]/generate-preview` (NEW)
- **Storage:** `feed_layouts.preview_image_url` (NEW field)

### Gap
- **MAJOR:** Need new preview generation endpoint
- **MINOR:** Need preview storage field
- **MINOR:** Need preview display in `FeedSinglePlaceholder`

### Action Required
- ✅ **ADD** preview generation (don't replace individual generation)
- ✅ **ADD** preview storage field
- ✅ **MODIFY** `FeedSinglePlaceholder` to show preview (if exists)
- ✅ **KEEP** individual image generation working

---

## SAFE IMPLEMENTATION PLAN

### Phase 1: Add Preview Support (Non-Breaking)
1. Add `preview_image_url` field to `feed_layouts` (migration)
2. Create `/api/feed/[feedId]/generate-preview` endpoint (NEW)
3. Update `FeedSinglePlaceholder` to show preview if exists
4. **DO NOT** modify existing individual generation flow

### Phase 2: Optional Preview Button
1. Add "Generate Preview Grid" button to `FeedSinglePlaceholder`
2. Button calls new preview endpoint
3. Preview displays alongside/instead of individual image
4. **KEEP** "Generate Image" button for individual generation

### Phase 3: Default to Preview (Future)
1. After preview is generated, default to showing preview
2. Individual image still accessible
3. User can choose which to display

---

## FILES THAT MUST NOT BE MODIFIED (OR MODIFIED CAREFULLY)

### ⚠️ CRITICAL - Do Not Break
1. **`/api/feed/[feedId]/generate-single`**
   - Currently works for free users
   - Must continue to work
   - Can add preview check, but don't remove individual generation

2. **`FeedSinglePlaceholder`**
   - Currently shows individual images
   - Must continue to show individual images
   - Can ADD preview display, but don't remove individual image display

3. **`/api/feed/create-free-example`**
   - Currently creates 1 post
   - Must continue to create 1 post
   - Can add preview generation option, but don't remove post creation

4. **`useFeedPolling`**
   - Currently polls for single post
   - Must continue to work
   - Can add preview polling, but don't break single post polling

---

## TESTING CHECKLIST

Before implementing changes, verify:
- [ ] Free user can create feed (1 post)
- [ ] Free user can generate individual image (2 credits)
- [ ] Individual image displays in placeholder
- [ ] Polling stops when image is ready
- [ ] Upsell button works
- [ ] Existing free users with images still see their images

After implementing preview:
- [ ] Free user can generate preview grid (2 credits)
- [ ] Preview displays in placeholder
- [ ] Individual image generation still works
- [ ] Both preview and individual image can coexist
- [ ] No data loss for existing users

---

**End of Current Implementation Analysis**

# Card Images Persistence Audit

**Date:** 2024-12-19  
**Issue:** Images are missing in concept cards and feed cards on page refresh, even though they're saved to the gallery.

---

## Current Architecture

### Concept Cards
- **Storage:** `maya_chat_messages.concept_cards` (JSONB column)
- **Image Storage:** 
  - `generated_images` table (has `concept_card_id` foreign key)
  - `ai_images` gallery table (no direct link to concept cards)
- **Pro Mode:** `linkedImages` array in concept card (from imageLibrary, not generated images)

### Feed Cards
- **Storage:** `maya_chat_messages.feed_cards` (JSONB column)
- **Image Storage:** `feed_posts.image_url` column
- **Link:** Feed cards have `feedId` → links to `feed_layouts` → links to `feed_posts`

---

## Problem Analysis

### Concept Cards - Missing Images

**Flow:**
1. ✅ Concept cards created → saved to `concept_cards` JSONB
2. ✅ User generates image → saved to `generated_images` (with `concept_card_id`) and `ai_images` gallery
3. ❌ **Image URL NOT saved back to concept card in `concept_cards` JSONB**
4. ❌ On page refresh → concept cards loaded from `concept_cards` JSONB → **no images**

**Root Cause:**
- Images are saved to separate tables (`generated_images`, `ai_images`)
- Concept cards in JSONB are never updated with generated image URLs
- No query to fetch images when loading concept cards

**Evidence:**
- `app/api/maya/load-chat/route.ts` line 541: `concepts: msg.concept_cards` - loads directly from JSONB
- No query to `generated_images` or `ai_images` to fetch images for concepts
- `generated_images.concept_card_id` exists but is never used when loading

### Feed Cards - Missing Images

**Flow:**
1. ✅ Feed cards created → saved to `feed_cards` JSONB
2. ✅ User generates images → saved to `feed_posts.image_url`
3. ❌ **Cached feed card in `feed_cards` JSONB is NOT updated with image URLs**
4. ⚠️ On page refresh:
   - If `feedId` exists → fetches fresh data from `feed_posts` ✅ (has images)
   - If `feedId` missing → uses cached data ❌ (no images)

**Root Cause:**
- Feed cards cached in JSONB become stale when images are generated
- Recent fix tries to find `feedId` by matching posts, but it's not 100% reliable

**Evidence:**
- `app/api/maya/load-chat/route.ts` line 155-196: Fetches fresh data if `feedId` exists
- Line 199-209: Uses cached data if no `feedId` (may not have images)

---

## Solution Options

### Option 1: Query Images on Load (SIMPLEST & MOST RELIABLE) ⭐ RECOMMENDED

**Concept Cards:**
- When loading concept cards from `concept_cards` JSONB, query `generated_images` or `ai_images` to find images
- Match by: `concept_card_id` (if concept has ID) OR by prompt similarity OR by creation time proximity
- Add `generatedImageUrl` or `linkedImages` (for generated images) to each concept

**Feed Cards:**
- Always fetch fresh data from `feed_posts` when loading (already done if `feedId` exists)
- If `feedId` missing, try harder to find it (already implemented in recent fix)

**Pros:**
- ✅ Simple - single query on load
- ✅ Reliable - always gets latest images
- ✅ No duplicates - images stored once in gallery
- ✅ No cache invalidation needed
- ✅ Works for both concept and feed cards

**Cons:**
- ⚠️ Extra query on page load (minimal impact with proper indexing)

**Implementation:**
```typescript
// In load-chat/route.ts, when loading concept cards:
const concepts = msg.concept_cards
for (const concept of concepts) {
  // Query generated_images for this concept
  const images = await sql`
    SELECT image_url 
    FROM generated_images 
    WHERE concept_card_id = ${concept.id}
    ORDER BY created_at DESC
    LIMIT 1
  `
  if (images.length > 0) {
    concept.generatedImageUrl = images[0].image_url
  }
  
  // Also check ai_images by prompt similarity (fallback)
  if (!concept.generatedImageUrl) {
    const aiImages = await sql`
      SELECT image_url 
      FROM ai_images 
      WHERE user_id = ${neonUser.id}
        AND prompt ILIKE ${`%${concept.prompt.substring(0, 50)}%`}
      ORDER BY created_at DESC
      LIMIT 1
    `
    if (aiImages.length > 0) {
      concept.generatedImageUrl = aiImages[0].image_url
    }
  }
}
```

### Option 2: Update Cards When Images Generated

**Concept Cards:**
- When image generation completes, update `concept_cards` JSONB with image URL
- Requires tracking which concept card the image belongs to

**Feed Cards:**
- When image generation completes, update `feed_cards` JSONB with image URL
- Requires tracking which feed card/post the image belongs to

**Pros:**
- ✅ No extra query on load
- ✅ Cards always have images

**Cons:**
- ❌ Complex - need to track concept/feed card IDs during generation
- ❌ Multiple update paths (concept cards, feed cards, photoshoots, etc.)
- ❌ Risk of duplicates if multiple updates
- ❌ Cache invalidation complexity

### Option 3: Store Images in Cards Directly (Not Recommended)

**Concept Cards:**
- Store image URLs directly in `concept_cards` JSONB when generated

**Feed Cards:**
- Store image URLs directly in `feed_cards` JSONB when generated

**Pros:**
- ✅ Fast - no queries needed

**Cons:**
- ❌ Duplicates - images stored in both gallery AND cards
- ❌ Data inconsistency risk
- ❌ Harder to maintain

---

## Recommended Solution: Option 1

**Why:**
1. **Simplest** - Single query on load, no complex update logic
2. **Most Reliable** - Always gets latest images from source of truth (gallery)
3. **No Duplicates** - Images stored once in gallery
4. **Works for Both** - Same pattern for concept and feed cards
5. **Future-Proof** - Works even if images are deleted/replaced in gallery

**Implementation Plan:**

1. **Concept Cards:**
   - In `app/api/maya/load-chat/route.ts`, when loading concept cards:
     - Query `generated_images` by `concept_card_id` (if concept has ID)
     - Query `ai_images` by prompt similarity (fallback)
     - Add `generatedImageUrl` to each concept
     - For Pro Mode: Keep `linkedImages` as-is (those are reference images, not generated)

2. **Feed Cards:**
   - Already implemented: Fetch fresh data from `feed_posts` if `feedId` exists
   - Enhancement: Improve `feedId` detection (already done in recent fix)

3. **Performance:**
   - Add index on `generated_images.concept_card_id` (if not exists)
   - Add index on `ai_images.user_id, created_at` (if not exists)
   - Batch queries for multiple concepts

**Files to Modify:**
- `app/api/maya/load-chat/route.ts` - Add image querying for concept cards

**No Breaking Changes:**
- Concept cards already support `generatedImageUrl` field
- Feed cards already fetch fresh data when `feedId` exists

---

## Testing Checklist

After implementation:
- [ ] Concept cards show images on page refresh
- [ ] Feed cards show images on page refresh
- [ ] Images appear in chat history
- [ ] No duplicate images
- [ ] Performance acceptable (query time < 100ms)
- [ ] Works for both Classic and Pro Mode
- [ ] Works for photoshoots (if applicable)

---

**END OF AUDIT**


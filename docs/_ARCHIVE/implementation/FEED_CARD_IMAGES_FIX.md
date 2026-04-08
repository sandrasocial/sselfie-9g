# Feed Card Images Missing - Fix Applied

**Date:** 2024-12-19  
**Issue:** Images are missing inside feed cards where they have been generated in the UI.

---

## Root Cause

When feed cards are saved to the database in the `feed_cards` column:
1. They may not have a `feedId` set initially
2. Posts in the cached data may not have `image_url` yet (images still generating)
3. When images are later generated and saved to `feed_posts.image_url`, the cached feed card in `maya_chat_messages.feed_cards` is NOT updated
4. On page reload, if `feedId` is missing, we can't fetch fresh data with images
5. Result: Cached data without images is used

---

## Fix Applied

**File:** `app/api/maya/load-chat/route.ts`

**Changes:**
1. **Enhanced feedId detection:** When cached feed card doesn't have `feedId`, try to find it by matching post data (prompt or position)
2. **Always fetch fresh data:** If `feedId` is found (even by matching), fetch fresh data from database which includes latest `image_url` values
3. **Warning logs:** Added logging to warn when cached data is used without images

**Code Flow:**
```
1. Load feed card from feed_cards column
2. Check if feedCard.feedId exists
   - If yes → Fetch fresh data from database (includes images)
   - If no → Try to find feedId by matching posts
     - If found → Fetch fresh data from database (includes images)
     - If not found → Use cached data (log warning if posts missing images)
```

---

## Testing

After fix, verify:
- [ ] Feed cards with `feedId` load images correctly
- [ ] Feed cards without `feedId` but with matching posts find feedId and load images
- [ ] Images appear in feed grid after generation completes
- [ ] Page refresh shows images that were generated

---

## Next Steps (If Issue Persists)

If images still missing:
1. Check if `feedId` is being saved when feed cards are created
2. Verify `feed_posts.image_url` is being updated when images are generated
3. Consider updating cached feed card when images are generated (more complex, but ensures cache stays fresh)

---

**END OF FIX DOCUMENTATION**


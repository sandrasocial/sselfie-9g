# Chat History Infinite Loop & Image Persistence Audit

## Issues Found

### Issue 1: Infinite Loop Still Occurring
**Status:** Still happening despite guard implementation
**Evidence:** Terminal shows repeated `/api/maya/chats?chatType=pro` calls (lines 825-942)

**Root Cause Analysis:**
- Guard checks `checkedHistoryForChatTypeRef.current === chatType` but logs don't show "Skipping history check" messages
- This suggests the guard isn't being hit, OR the refs are being reset
- Possible causes:
  1. `proMode` or `activeTab` are changing on every render (unstable props)
  2. The refs are being reset somewhere
  3. The guard condition isn't working as expected

### Issue 2: Images Not Showing in Concept Cards
**Status:** Images missing for all concept cards (old and new)
**Evidence:** Logs show "⚠️ No image found for concept X (no concept_card_id or prediction_id)"

**Root Cause Analysis:**
1. **ConceptCard saves `generatedImageUrl` but NOT `predictionId`** (line 607-608)
   - When image is generated, only `generatedImageUrl` is saved to JSONB
   - `predictionId` is NOT saved to JSONB
   - This means old concept cards don't have `predictionId` to query images

2. **Enrichment function requires `predictionId`** (line 91)
   - `enrichConceptsWithImages` only queries if `concept.predictionId` exists
   - If `predictionId` is missing, it can't find images
   - Old concept cards don't have `predictionId` in JSONB

3. **No fallback query method**
   - For old concept cards without `predictionId`, there's no way to find images
   - The enrichment function doesn't try prompt matching or other methods

## Solutions Needed

### Fix 1: Infinite Loop
- Add more robust guard (check if request is in flight)
- Use `useMemo` or `useCallback` to stabilize `proMode` and `activeTab` if they're changing
- Add logging to see why guard isn't working

### Fix 2: Image Persistence
- Save `predictionId` to JSONB when image is generated (in ConceptCard)
- Update enrichment function to handle old concept cards without `predictionId`
- Add fallback query method (prompt matching or time-based) for old cards


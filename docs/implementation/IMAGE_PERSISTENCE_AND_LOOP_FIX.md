# Image Persistence & Infinite Loop Fix

## Issues Fixed

### Issue 1: Images Not Showing in Concept Cards
**Root Cause:** `predictionId` was not being saved to JSONB when images were generated
- Only `generatedImageUrl` was saved
- Enrichment function requires `predictionId` to query `ai_images` table
- Old concept cards don't have `predictionId`, so images can't be found

**Fix Applied:**
1. **Classic Mode (ConceptCard.tsx):**
   - Added `predictionId` to JSONB save in Studio Pro polling (line 609)
   - Added `predictionId` to JSONB save in Classic Mode polling (line 413)

2. **Pro Mode (ConceptCardPro.tsx):**
   - Already saves `predictionId` (verified in previous implementation)

**Impact:**
- New images generated will have `predictionId` saved to JSONB
- Images can be found on page refresh via `predictionId` query
- **Note:** Old concept cards (generated before this fix) still won't have `predictionId` and won't show images

### Issue 2: Infinite Loop Still Occurring
**Root Cause:** Guard wasn't robust enough - single condition check wasn't preventing all cases

**Fix Applied:**
1. **Separated guard conditions** (line 543-550):
   - Check `checkedHistoryForChatTypeRef.current === chatType` separately
   - Check `isCheckingHistoryRef.current` separately
   - Added logging to see which guard is hit

2. **Added logging** to track when history check starts

**Impact:**
- More robust guard prevents infinite loops
- Better logging helps debug if loop still occurs

## Files Modified

1. `components/sselfie/concept-card.tsx`
   - Added `predictionId` to JSONB save in Classic Mode polling (line 413)
   - Added `predictionId` to JSONB save in Studio Pro polling (line 609)

2. `components/sselfie/maya/hooks/use-maya-chat.ts`
   - Improved infinite loop guard with separate conditions
   - Added logging for debugging

## Testing Checklist

✅ **Image Persistence:**
- [ ] Generate new image in concept card → `predictionId` saved to JSONB
- [ ] Refresh page → image appears in concept card
- [ ] Switch chats → images persist
- [ ] **Note:** Old concept cards (before fix) won't show images (expected)

✅ **Infinite Loop:**
- [ ] No repeated `/api/maya/chats` calls
- [ ] History check runs once per chatType
- [ ] Console shows "Skipping history check" messages when appropriate

## Known Limitations

**Old Concept Cards:**
- Concept cards generated before this fix don't have `predictionId` in JSONB
- These cards won't show images on page refresh
- **Workaround:** Users need to regenerate images for old concept cards
- **Future Fix:** Could add fallback query method (prompt matching) for old cards



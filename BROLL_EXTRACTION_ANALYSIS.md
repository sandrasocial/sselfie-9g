# B-Roll Screen: Embed vs Extract Analysis

## Current B-Roll Screen Structure

### Dependencies & State:
1. **Header/Navigation** (needs removal):
   - `showNavMenu` state
   - `handleNavigation` function
   - `handleLogout` function
   - Navigation menu UI (lines ~500-600)
   - Header UI

2. **Core Video Logic** (should keep):
   - `handleAnimate` - Video generation
   - Video polling logic (useEffect with intervals)
   - `handleFavoriteToggle`
   - `handleDelete`
   - `deleteVideo`

3. **Data Fetching** (should keep):
   - `useSWRInfinite` for images (pagination)
   - `useSWR` for videos (polling every 5s)
   - `useSWR` for user data

4. **State Management** (should keep):
   - `generatingVideos` (Set)
   - `analyzingMotion` (Set)
   - `videoErrors` (Map)
   - `videoProgress` (Map)
   - `videoPredictions` (Map)
   - `previewVideo`
   - `creditBalance`
   - `showBuyCreditsModal`

5. **UI Components** (should keep):
   - `InstagramPhotoCard`
   - `InstagramReelCard`
   - `UnifiedLoading`
   - Image grid
   - Video preview modal

## Option 1: Extract (RECOMMENDED) ✅

### Pros:
- ✅ **Clean Separation**: Removes header/nav dependencies
- ✅ **Reusable**: Can be used in other contexts
- ✅ **Testable**: Isolated component easier to test
- ✅ **Shared Context Ready**: Easy to integrate shared images
- ✅ **Maintainable**: Clear boundaries, single responsibility
- ✅ **Props-Based**: Clear interface (user, credits, sharedImages)

### Cons:
- ⚠️ **More Initial Work**: Need to extract and refactor
- ⚠️ **Props Passing**: Need to pass user, credits, callbacks

### Implementation:
```typescript
// components/sselfie/maya/maya-videos-tab.tsx
interface MayaVideosTabProps {
  user: any
  creditBalance: number
  onCreditsUpdate: (balance: number) => void
  sharedImages?: Array<{ url: string; id: string }>
}

export default function MayaVideosTab({
  user,
  creditBalance,
  onCreditsUpdate,
  sharedImages = [],
}: MayaVideosTabProps) {
  // All B-Roll logic here
  // No header/navigation
  // Can use sharedImages
}
```

### What to Extract:
1. ✅ All state management (video generation, polling, errors)
2. ✅ Data fetching (SWR hooks)
3. ✅ Video generation logic (handleAnimate)
4. ✅ Video polling logic
5. ✅ Image grid rendering
6. ✅ Video preview modal
7. ❌ Remove header/navigation menu
8. ❌ Remove handleNavigation/handleLogout
9. ❌ Remove showNavMenu state

### Estimated Time: 4-6 hours

---

## Option 2: Embed (NOT RECOMMENDED) ❌

### Pros:
- ✅ **Faster**: Less refactoring initially
- ✅ **Less Code**: No extraction needed

### Cons:
- ❌ **Header Dependencies**: Still has navigation menu
- ❌ **Hard to Share Context**: Difficult to integrate shared images
- ❌ **Not Reusable**: Tightly coupled to B-Roll screen
- ❌ **More Coupling**: Harder to maintain
- ❌ **Duplicate Navigation**: Navigation menu conflicts with Maya header

### Implementation:
```typescript
{activeMayaTab === "videos" && (
  <BRollScreen user={user} />
)}
```

### Issues:
- B-Roll screen has its own header (duplicate)
- B-Roll screen has navigation menu (conflicts with Maya)
- Can't easily add shared images
- Hard to customize for tab context

### Estimated Time: 2-3 hours (but creates technical debt)

---

## Recommendation: **EXTRACT** ✅

### Why Extract is Better:

1. **Removes Dependencies**
   - B-Roll screen has header/navigation that conflicts with Maya header
   - Extraction removes these dependencies cleanly

2. **Enables Shared Context**
   - Need to show shared images from Photos tab
   - Extraction makes it easy to pass `sharedImages` prop

3. **Better Architecture**
   - Single responsibility: Videos tab only handles video logic
   - Clear props interface
   - Easier to test and maintain

4. **Future-Proof**
   - Can reuse component elsewhere
   - Easy to add features (filters, sorting, etc.)
   - Better for performance (can lazy load)

5. **Matches Phase 2 Plan**
   - Plan already calls for extraction
   - Creates `MayaVideosTab` component
   - Aligns with component extraction pattern

---

## Extraction Plan

### Step 1: Create MayaVideosTab Component
- Copy B-Roll logic
- Remove header/navigation
- Add props interface
- Remove navigation menu UI

### Step 2: Update State Management
- Keep all video state
- Remove navigation state
- Accept creditBalance as prop
- Accept onCreditsUpdate callback

### Step 3: Integrate Shared Images
- Accept sharedImages prop
- Display at top of grid
- Merge with API images
- Deduplicate

### Step 4: Update Maya Screen
- Replace placeholder with MayaVideosTab
- Pass required props
- Handle credit updates

### Step 5: Clean Up
- Keep b-roll-screen.tsx as backup
- Test thoroughly
- Remove unused code

---

## Conclusion

**EXTRACT is the better choice** because:
1. ✅ Removes header/nav conflicts
2. ✅ Enables shared context
3. ✅ Better architecture
4. ✅ Matches implementation plan
5. ✅ Future-proof

**Time Investment**: 4-6 hours (worth it for clean architecture)

---

**Ready to proceed with extraction?** 🚀


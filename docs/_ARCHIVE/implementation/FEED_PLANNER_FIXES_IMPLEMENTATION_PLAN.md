# Feed Planner Screen - 4 Critical Fixes Implementation Plan

## Overview
This document outlines the implementation plan for 4 critical issues in the Feed Planner screen (NOT the chat).

---

## Issue #1: No Unified Loader on Screen Entry

### Problem
When entering the Feed Planner screen, it always renders the "new feed/new feed with maya" placeholder page before loading the feed view. No unified loader is shown during the initial load.

### Root Cause
- `feed-view-screen.tsx` line 137-138: Comment says "No loading indicator per requirements"
- `isLoading` state from SWR is not being used to show UnifiedLoading
- Placeholder state shows immediately even when data is loading

### Solution
1. Import `UnifiedLoading` component
2. Show `UnifiedLoading` when `isLoading === true` (before checking feedExists)
3. Only show placeholder state after loading completes AND no feed exists

### Files to Modify
- `components/feed-planner/feed-view-screen.tsx`

### Implementation Steps
1. Add import: `import UnifiedLoading from "@/components/sselfie/unified-loading"`
2. Add loading check before placeholder state (around line 160):
   ```tsx
   // Show unified loader during initial load
   if (isLoading) {
     return (
       <div className="flex flex-col flex-1 overflow-hidden min-h-0">
         <UnifiedLoading variant="screen" message="Loading Feed Planner" />
       </div>
     )
   }
   ```

---

## Issue #2: Post Card Modal Blocked by Bottom Navigation

### Problem
When clicking on an image in the feed view, the post card modal opens but the bottom navigation overlays over it, blocking the card content.

### Root Cause
- `feed-modals.tsx` line 39: Post card modal uses `z-50`
- `sselfie-app.tsx` line 557: Bottom navigation uses `z-[70]`
- Navigation z-index (70) is higher than modal z-index (50)

### Solution
Increase post card modal z-index to be higher than bottom navigation (z-[70] → z-[80] or higher)

### Files to Modify
- `components/feed-planner/feed-modals.tsx`

### Implementation Steps
1. Change modal z-index from `z-50` to `z-[80]` (line 39)
2. Ensure modal backdrop also has high z-index
3. Test that modal appears above navigation on mobile

---

## Issue #3: Create Strategy Button Not Showing for Saved Feeds

### Problem
If users have generated a feed in Maya chat and saved it to the planner, the "Create Strategy" button does not show.

### Root Cause
- `feed-strategy.tsx` line 88: `displayStrategy = generatedStrategy || feedData.feed?.description`
- Line 93: Button only shows if `!displayStrategy`
- Feeds created in Maya chat have a `description` field, so `displayStrategy` is truthy
- The button logic treats `description` as a strategy, but it's just a feed description, not a full strategy document

### Solution
Check for actual strategy document, not just description. Strategy is stored in `feedData.feed?.description` as markdown. Need to distinguish between:
- Full strategy document (markdown with headers, multiple sections, > 500 chars)
- Simple feed description (short text, no markdown headers, < 200 chars)

### Files to Modify
- `components/feed-planner/feed-strategy.tsx`

### Implementation Steps
1. Add helper function to detect if description is a full strategy:
   ```tsx
   const isFullStrategy = (text: string | null | undefined): boolean => {
     if (!text) return false
     // Strategy documents have markdown headers (# ## ###) and are longer
     const hasHeaders = /^#{1,3}\s/m.test(text)
     const isLongEnough = text.length > 500
     return hasHeaders && isLongEnough
   }
   ```
2. Update `displayStrategy` logic (line 88):
   ```tsx
   const feedDescription = feedData.feed?.description
   const hasFullStrategy = isFullStrategy(feedDescription)
   const displayStrategy = generatedStrategy || (hasFullStrategy ? feedDescription : null)
   ```
3. Update button condition (line 93):
   ```tsx
   {!displayStrategy && !hasFullStrategy && (
     // Show Create Strategy button
   )}
   ```

---

## Issue #4: Highlights Not Using Brand Colors/Pillars

### Problem
When clicking "Create Highlights" modal and clicking "Let Maya create highlights", it generates generic highlights that:
1. Don't use user's brand colors (chosen in brand profile wizard)
2. Don't create suggested highlight topics based on brand pillars or brand profile

### Root Cause
- `feed-highlights-modal.tsx` line 36-37: Uses default colors if `brandColors` prop is empty
- `feed-highlights-modal.tsx` line 49-90: `handleGenerate` calls `/api/feed/${feedId}/generate-highlights`
- `generate-highlights/route.ts` line 56-63: Fetches brand profile but doesn't use:
  - Brand colors (customColors or colorTheme from user_personal_brand)
  - Content pillars properly (only uses feed posts' content_pillar, not brand profile pillars)
- Modal doesn't receive brand colors as props

### Solution
1. Fetch brand colors from user_personal_brand when modal opens
2. Pass brand colors to highlights modal
3. Update generate-highlights API to:
   - Use brand colors from user_personal_brand (customColors or colorTheme)
   - Use content pillars from brand profile (not just feed posts)
   - Generate highlight topics based on brand pillars and brand profile data

### Files to Modify
1. `components/feed-planner/feed-highlights-modal.tsx`
2. `components/feed-planner/instagram-feed-view.tsx` (pass brand colors to modal)
3. `app/api/feed/[feedId]/generate-highlights/route.ts`

### Implementation Steps

#### Step 1: Fetch Brand Colors in InstagramFeedView
1. Add state for brand colors: `const [brandColors, setBrandColors] = useState<string[]>([])`
2. Add helper function to get colors from theme:
   ```tsx
   const getColorsFromTheme = (theme: string | null): string[] => {
     // Map theme IDs to color arrays (from brand-profile-wizard.tsx COLOR_THEMES)
     const themeColors: Record<string, string[]> = {
       'dark-moody': ["#000000", "#2C2C2C", "#4A4A4A", "#6B6B6B"],
       'minimalist-clean': ["#FFFFFF", "#F5F5F0", "#E8E4DC", "#D4CFC4"],
       'beige-creamy': ["#F5F1E8", "#E8DCC8", "#D4C4A8", "#B8A88A"],
       // ... add other themes
     }
     return themeColors[theme || ''] || []
   }
   ```
3. Add useEffect to fetch brand profile when component mounts (after line 43):
   ```tsx
   useEffect(() => {
     fetch('/api/profile/personal-brand')
       .then(res => res.json())
       .then(data => {
         if (data.completed && data.data) {
           // Extract colors from customColors or colorTheme
           const colors = data.data.customColors 
             ? JSON.parse(data.data.customColors)
             : getColorsFromTheme(data.data.colorTheme)
           if (colors.length > 0) {
             setBrandColors(colors)
           }
         }
       })
       .catch(err => console.error("[v0] Failed to fetch brand colors:", err))
   }, [])
   ```
4. Pass `brandColors` to `FeedHighlightsModal` (line 587):
   ```tsx
   <FeedHighlightsModal
     feedId={feedId}
     isOpen={showHighlightsModal}
     onClose={() => setShowHighlightsModal(false)}
     onSave={async () => {
       await mutate()
     }}
     existingHighlights={feedData?.highlights || []}
     brandColors={brandColors} // Add this prop
   />
   ```

#### Step 2: Update Highlights Modal to Use Brand Colors
1. Use `brandColors` prop instead of defaults when available
2. Update color assignment logic to use brand colors

#### Step 3: Update Generate Highlights API
1. Fetch `customColors` and `colorTheme` from `user_personal_brand`
2. Fetch `content_pillars` from `user_personal_brand` (not just feed posts)
3. Use brand colors in response (return colors array)
4. Use brand pillars for better highlight suggestions:
   ```tsx
   Content Pillars: ${brandProfile?.content_pillars 
     ? JSON.parse(brandProfile.content_pillars).map((p: any) => p.name || p).join(", ")
     : feedPosts.map((p: any) => p.content_pillar).filter(Boolean).slice(0, 5).join(", ")
   }
   ```
5. Update prompt to emphasize brand-specific highlights:
   ```tsx
   Generate Instagram story highlight titles that align with this brand's content pillars and aesthetic.
   Brand: ${brandProfile?.business_type || feedLayout.brand_name}
   Brand Vibe: ${brandProfile?.brand_vibe || "Creative"}
   Content Pillars: ${brandPillars}
   Target Audience: ${brandProfile?.target_audience || "General"}
   
   Return 3-4 highlight titles that reflect the brand's content strategy.
   ```

---

## Implementation Priority

1. **Issue #2 (Post Card Z-Index)** - Quickest fix, critical UX issue
2. **Issue #1 (Unified Loader)** - Simple fix, improves perceived performance
3. **Issue #3 (Create Strategy Button)** - Medium complexity, important for feature discoverability
4. **Issue #4 (Highlights Brand Colors)** - Most complex, requires API changes and data fetching

---

## Testing Checklist

### Issue #1: Unified Loader
- [ ] Enter Feed Planner screen with no feeds → See unified loader, then placeholder
- [ ] Enter Feed Planner screen with existing feed → See unified loader, then feed view
- [ ] Loader matches other screens (Photos tab, etc.)

### Issue #2: Post Card Z-Index
- [ ] Click image in feed grid → Post card modal opens
- [ ] Verify modal appears above bottom navigation
- [ ] Verify modal is fully visible and not blocked
- [ ] Test on mobile viewport

### Issue #3: Create Strategy Button
- [ ] Create feed in Maya chat and save to planner
- [ ] Navigate to Strategy tab
- [ ] Verify "Create Strategy" button shows (even if feed has description)
- [ ] Create strategy → Verify button disappears
- [ ] Verify button shows for feeds with short descriptions only

### Issue #4: Highlights Brand Colors
- [ ] Complete brand profile wizard with custom colors
- [ ] Open highlights modal in Feed Planner
- [ ] Click "Let Maya create highlights"
- [ ] Verify highlights use brand colors (not default beige colors)
- [ ] Verify highlight topics match brand pillars
- [ ] Test with feeds created in Maya chat (should still use brand colors)

---

## Notes

- All fixes should maintain backward compatibility
- No breaking changes to existing feeds
- Brand colors should gracefully fallback to defaults if not available
- Strategy button logic should handle both new and existing feeds


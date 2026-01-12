# Feed Post Card Modal Inconsistency

**Date:** 2025-01-XX  
**Issue:** The `FeedPostCard` component (shown in modal when clicking grid images) has inconsistent styling with the feed planner grid design.

---

## Problem

When clicking on an image in the feed grid, a modal opens showing `FeedPostCard` which displays a full Instagram post mockup with:
- White card background (`bg-white rounded-2xl border border-stone-200 shadow-lg`)
- Instagram header with profile picture
- Image area
- Caption area with full Instagram UI
- Action buttons (like, comment, share)

This full Instagram post mockup styling is inconsistent with the minimal, clean design of the feed planner grid.

---

## Current Implementation

**File:** `components/feed-planner/feed-post-card.tsx`

**Styling:**
```tsx
<div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-lg max-w-[470px] mx-auto">
  {/* Full Instagram post mockup */}
  <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
    {/* Instagram header */}
  </div>
  <div className="relative aspect-square bg-gradient-to-br from-stone-50 to-stone-100">
    {/* Image area */}
  </div>
  {/* Caption and actions */}
</div>
```

**Issues:**
- Uses `rounded-2xl` (larger radius) instead of `rounded-xl` (matches grid)
- Has `shadow-lg` (heavy shadow) instead of minimal shadow
- Full Instagram UI mockup (header, action bar) may be unnecessary
- Border style (`border border-stone-200`) may be inconsistent

---

## Expected Pattern

The feed planner uses a minimal design:
- Grid items: `rounded-lg` (smaller radius)
- Grid container: `rounded-xl` (medium radius)
- Minimal shadows
- Clean, simple styling

The post card modal should match this minimal aesthetic rather than being a full Instagram mockup.

---

## Options

### Option 1: Simplify to match grid styling
- Remove Instagram header
- Remove Instagram action bar
- Show just the image and caption
- Use consistent border radius and shadows

### Option 2: Match Instagram preview but with consistent styling
- Keep Instagram mockup structure
- Update border radius to `rounded-xl` (from `rounded-2xl`)
- Reduce shadow to match feed planner (`shadow-sm` or `shadow-md`)
- Update border styling to match grid

### Option 3: Use minimal preview (image + caption only)
- Show large image
- Show caption below
- Minimal styling, no Instagram UI elements
- Match feed planner design system

---

## Recommendation

**Option 2** - Keep the Instagram preview structure (as it helps users see how their post will look) but make the styling consistent with the feed planner:
- Change `rounded-2xl` → `rounded-xl`
- Change `shadow-lg` → `shadow-md` or `shadow-sm`
- Ensure border colors match grid styling
- Keep Instagram UI elements for context

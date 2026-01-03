# Feed Simplification Implementation Plan

## Overview
Simplify feed generation to match concept cards pattern: Maya generates prompts directly (no background processing), individual generate buttons, clickable images with fullscreen modal, caption/strategy buttons.

## Implementation Steps

### Phase 1: Simplify Maya Feed Generation
**Goal:** Maya generates prompts directly in strategy JSON (like concept cards)

1. Update Maya personality to generate feed posts with `prompt` field
2. Update `/api/feed-planner/create-from-strategy` to save prompts directly (remove background processing dependency)
3. Remove dependency on `processFeedPostsInBackground` for initial feed creation

### Phase 2: Update FeedPreviewCard Component
**Goal:** Individual generate buttons, clickable images, caption/strategy buttons

1. Add individual "Generate" buttons per grid item (like old feed-grid-preview)
2. Banners show `post_type` (not `content_pillar`)
3. Make grid images clickable → open fullscreen modal with FeedPostCard
4. Add "Create Captions" button (after images exist)
5. Add "Create Strategy" button (after images exist)
6. Keep bulk "Generate All" button as secondary option

### Phase 3: Fullscreen Post Card Modal
**Goal:** Click image in feed preview → opens fullscreen modal

1. Add modal state to FeedPreviewCard
2. Import FeedPostCard component
3. Render FeedPostCard in fullscreen modal overlay
4. Handle close modal (ESC key, click outside, close button)
5. Support "Create Caption" from modal for individual post

### Phase 4: Caption Generation & Editing
**Goal:** Generate captions (bulk/individual) and allow editing via Maya

1. "Create Captions" button → calls `/api/feed/[feedId]/generate-captions`
2. Individual post → "Create Caption" in modal → generate single caption
3. Caption editing: User asks Maya to edit caption → updates in feed planner OR creates new card in chat with image preview

### Phase 5: Strategy Generation
**Goal:** "Create Strategy" button generates and saves strategy

1. "Create Strategy" button → calls `/api/feed/[feedId]/generate-strategy`
2. Save strategy to feed layout
3. Display strategy in feed planner screen

---

## Current State Analysis

### FeedPreviewCard Current Implementation
- Shows 3x3 grid of posts
- Single "Generate Feed Images" button (bulk generation)
- Banners show `content_pillar` (should be `post_type`)
- Images are NOT clickable
- No caption/strategy buttons

### What Needs to Change

1. **Individual Generate Buttons:**
   - Each grid item without image should have its own "Generate" button
   - Like old feed-grid-preview component

2. **Clickable Images:**
   - Images should be clickable
   - Opens fullscreen modal with FeedPostCard component
   - Same styling/logic as feed planner screen

3. **Banners:**
   - Change from `content_pillar` to `post_type`
   - Show on placeholders (no image)

4. **Caption/Strategy Buttons:**
   - Show after images are generated
   - "Create Captions" → bulk caption generation
   - "Create Strategy" → strategy generation

---

## Technical Notes

### FeedPostCard Component
- Already exists: `components/feed-planner/feed-post-card.tsx`
- Displays Instagram-style post card
- Has generate, enhance caption, copy caption functionality
- Can be reused in modal

### Modal Implementation
- Use Dialog component from shadcn/ui (if available)
- OR custom modal with overlay
- Fullscreen or centered modal
- ESC to close, click outside to close

### Caption Editing Flow
- User asks Maya in chat to edit caption for post X
- Maya generates new caption
- Options:
  a) Update in feed planner (call `/api/feed/[feedId]/add-caption`)
  b) Create new card in chat with image preview (like FeedCaptionCard but with image)



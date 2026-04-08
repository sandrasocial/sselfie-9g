# Feed Simplification - Implementation Progress

## Completed ✅

### Phase 2: FeedPreviewCard Updates
1. ✅ **Individual Generate Buttons**: Added individual "Generate" buttons per grid item (like old feed-grid-preview)
   - Each post without image has its own generate button
   - Button shows post position, prompt/description, and "Generate" text
   - Calls `/api/feed/${feedId}/generate-single` for individual generation
   
2. ✅ **Banners Show post_type**: Changed banners to display `post_type` instead of `content_pillar`
   - Banners only show on placeholders (no image, not generating)
   - Display format: `post.post_type || 'Post ${post.position}'`

3. ✅ **Toast Notifications**: Added toast notifications for generation status

4. ✅ **Create Captions Button**: Added button that appears after images are generated
   - Navigates to Maya Feed tab for caption generation

5. ✅ **Create Strategy Button**: Added button that appears after images are generated
   - Navigates to Maya Feed tab for strategy generation

6. ✅ **Clickable Images with Fullscreen Modal**: 
   - Images are clickable (button wrapper)
   - Opens fullscreen modal overlay with FeedPostCard component
   - Modal uses createPortal for proper z-index handling
   - Close button (X) in top-right corner
   - Click outside modal to close
   - ESC key to close
   - Prevents body scroll when modal is open
   - Modal refreshes post data when generation completes

## In Progress ⏳

None - Phase 2 is complete!

## Pending 📋

### Phase 1: Simplify Maya Feed Generation
- Update Maya personality to generate prompts directly in strategy JSON (like concept cards)
- Update `/api/feed-planner/create-from-strategy` to save prompts directly
- Remove background processing dependency

### Phase 4: Caption Generation & Editing
- ✅ Bulk caption generation via button (navigates to Maya Feed tab)
- ⏳ Individual caption generation from modal (FeedPostCard can enhance caption, but "Create Caption" button needed)
- ⏳ Caption editing via Maya chat (update in feed planner or create new card with image preview)

### Phase 5: Strategy Generation
- ✅ Strategy generation via button (navigates to Maya Feed tab)
- ⏳ Save strategy to feed layout (currently handled by Maya chat flow)

---

## Current State

### FeedPreviewCard Implementation:
- ✅ Individual generate buttons per grid item
- ✅ Bulk "Generate Feed Images" button (still present)
- ✅ Create Captions and Create Strategy buttons (after images exist)
- ✅ Banners showing `post_type`
- ✅ Clickable images that open fullscreen modal
- ✅ Fullscreen modal with FeedPostCard component
- ✅ Modal close handlers (ESC, click outside, close button)
- ✅ Body scroll prevention when modal open
- ✅ Post data refresh when generation completes

### Next Steps:
1. **Phase 1**: Simplify Maya feed generation (generate prompts directly)
2. **Phase 4**: Add "Create Caption" button to FeedPostCard modal for individual caption generation
3. **Phase 4**: Implement caption editing flow in Maya chat (update in place or create new card)

---

## Technical Details

### Modal Implementation:
- Uses `createPortal` to render modal at document.body level
- Fullscreen overlay with `bg-black/95 backdrop-blur-sm`
- FeedPostCard component centered in modal
- z-index: 9999 to ensure it's above other content
- Click outside to close (stops propagation on card content)
- ESC key handler with cleanup
- Body scroll prevention (overflow: hidden)

### Data Flow:
- Click image → `handleImageClick(post)` → sets `selectedPost` and `isModalOpen`
- Modal renders FeedPostCard with selected post data
- FeedPostCard's `onGenerate` callback → `handleRefreshPosts()` → fetches updated post data
- Close modal → `handleCloseModal()` → resets state

---

## Notes

- FeedPostCard component is reused in modal (same styling/logic as feed planner screen)
- Modal maintains selected post state even after refresh
- Individual generation works per grid item
- Bulk generation still available as secondary option
- Create Captions/Strategy buttons navigate to Maya Feed tab (consistent with feed planner screen)

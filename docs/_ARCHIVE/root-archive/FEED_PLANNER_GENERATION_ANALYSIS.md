# Feed Planner Image Generation Analysis

## Summary
**YES, there IS image generation logic inside the Feed Planner screen.** Multiple components and hooks allow users to generate images directly from the feed planner, which conflicts with the requirement that all image generation should only happen in Maya Chat (Feed tab).

---

## 🔴 Image Generation Functions Found

### 1. **`handleGenerateSingle`** (Single Post Generation)
- **Location:** `components/feed-planner/hooks/use-feed-actions.ts:192`
- **API Endpoint:** `POST /api/feed/[feedId]/generate-single`
- **Triggered From:**
  - Empty post placeholders in Grid view (when NOT manual feed)
  - Empty post placeholders in Posts list view (when NOT manual feed)
  - `FeedPostCard` component (when post has no image)
  - `FeedGridPreview` component

### 2. **`handleGenerateRemaining`** (Batch Generation)
- **Location:** `components/feed-planner/hooks/use-feed-actions.ts:257`
- **API Endpoint:** `POST /api/feed-planner/queue-all-images`
- **Triggered From:**
  - Loading overlay "Generate Remaining X Images" button
  - Only shows for Maya feeds that are actively generating

### 3. **`handleRegeneratePost`** (Regenerate Existing Post)
- **Location:** `components/feed-planner/hooks/use-feed-actions.ts:325`
- **API Endpoint:** `POST /api/feed/[feedId]/generate-single` (same as single generation)
- **Triggered From:**
  - Post detail modal "Regenerate" button
  - `FeedModals` component when viewing a post

---

## 📍 Where Generation Can Be Triggered

### **Grid View (`feed-grid.tsx`)**
```typescript
// Line 85: Clicking empty post triggers generation
onGeneratePost(post.id)  // Calls handleGenerateSingle
```
- **Condition:** Only for Maya feeds (manual feeds use `onAddImage` instead)
- **UI:** Empty post placeholder with "Click to add image" text

### **Posts List View (`feed-posts-list.tsx`)**
```typescript
// Line 98: Clicking empty post triggers generation
onGeneratePost(post.id)  // Calls handleGenerateSingle
```
- **Condition:** Only for Maya feeds (manual feeds use `onAddImage` instead)
- **UI:** "Generate Photo" button on empty posts

### **Post Detail Modal (`feed-modals.tsx` + `feed-post-card.tsx`)**
```typescript
// feed-modals.tsx Line 61: "Regenerate" button
onRegeneratePost(selectedPost.id)  // Calls handleRegeneratePost

// feed-post-card.tsx Line 52: "Generate" button (if post has no image)
handleGenerate()  // Calls /api/feed/[feedId]/generate-single
```
- **UI:** 
  - "Regenerate" button in post detail overlay
  - "Generate Photo" button if post has no image

### **Loading Overlay (`feed-loading-overlay.tsx`)**
```typescript
// Line 124: "Generate Remaining X Images" button
onGenerateRemaining()  // Calls handleGenerateRemaining
```
- **Condition:** Only shows for Maya feeds that are actively generating
- **UI:** Button in loading overlay when feed is incomplete

### **Feed Preview Card (`feed-preview-card.tsx`)**
```typescript
// Line 455: handleGenerateImages function
// Line 528: handleGenerateFeedWithId function
```
- **Note:** This appears to be for unsaved feeds, but still generates from feed planner

---

## 🔧 API Endpoints Used

1. **`/api/feed/[feedId]/generate-single`**
   - Used by: `handleGenerateSingle`, `handleRegeneratePost`
   - Creates Replicate prediction for a single post

2. **`/api/feed-planner/queue-all-images`**
   - Used by: `handleGenerateRemaining`
   - Queues all remaining posts for batch generation

---

## ✅ Current Protection for Manual Feeds

**Good News:** Manual feeds are already protected from generation:
- `isManualFeed` flag prevents generation triggers
- Manual feeds use `onAddImage` (gallery selector) instead of `onGeneratePost`
- Grid and list views check `isManualFeed` before calling generation functions

**However:** This protection only works if `isManualFeed` is correctly detected. Maya-created feeds can still generate images from the feed planner.

---

## 🎯 Recommendation

**To comply with requirements, you should:**

1. **Remove all generation functions from feed planner:**
   - Remove `handleGenerateSingle`
   - Remove `handleGenerateRemaining`
   - Remove `handleRegeneratePost` (or make it redirect to Maya)
   - Remove "Generate Photo" buttons from empty posts
   - Remove "Regenerate" button from post detail modal
   - Remove "Generate Remaining" button from loading overlay

2. **Keep only viewing/editing functionality:**
   - View feed grid
   - View posts list
   - Edit captions
   - Reorder posts (drag & drop)
   - Download bundle
   - Add images from gallery (for manual feeds only)

3. **Redirect generation to Maya:**
   - Replace generation buttons with "Generate in Maya" buttons
   - Navigate to `/#maya/feed` when clicked
   - Or show a message: "Image generation is only available in Maya Chat"

---

## 📊 Files That Need Changes

### **High Priority (Remove Generation):**
- `components/feed-planner/hooks/use-feed-actions.ts` - Remove generation functions
- `components/feed-planner/feed-grid.tsx` - Remove `onGeneratePost` prop
- `components/feed-planner/feed-posts-list.tsx` - Remove `onGeneratePost` prop
- `components/feed-planner/feed-modals.tsx` - Remove "Regenerate" button
- `components/feed-planner/feed-post-card.tsx` - Remove `handleGenerate` function
- `components/feed-planner/feed-loading-overlay.tsx` - Remove "Generate Remaining" button
- `components/feed-planner/instagram-feed-view.tsx` - Remove generation prop passing

### **Medium Priority (Update UI):**
- Replace generation buttons with "Go to Maya" buttons
- Update empty state messages

### **Low Priority (Cleanup):**
- Remove unused API endpoints (if not used elsewhere)
- Remove generation-related state management

---

## 🔍 Additional Notes

- The `feed-preview-card.tsx` component also has generation logic, but it appears to be for a different use case (unsaved feeds)
- The loading overlay only shows for Maya feeds, so removing its generation button is safe
- Manual feeds are already protected, so the main concern is Maya-created feeds

---

**Conclusion:** The feed planner currently has multiple entry points for image generation. All of these should be removed or redirected to Maya Chat to comply with the requirement that "all new images generated for the feed planner should only be done inside the feed tab in maya chat screen."


# SMART FEED PLANNER - IMPLEMENTATION PLAN

**Created:** 2025-01-27  
**Goal:** Make Feed Planner work standalone AND with Maya  
**Estimated Time:** 9-11 hours  
**Priority:** High (enables manual feed creation)

---

## 🎯 OBJECTIVES

1. ✅ Enable manual feed creation (no Maya required)
2. ✅ Upload images to 3x3 grid
3. ✅ Select images from gallery
4. ✅ Edit captions per post
5. ✅ Save manually-created feeds
6. ✅ Load manually-created feeds
7. ✅ Works with Maya-created feeds (existing - preserve)
8. ✅ Support hybrid flows (Maya + manual)

---

## 📋 PRE-IMPLEMENTATION VERIFICATION

### Step 0: Technical Verification ✅ COMPLETE

**Findings:**
- ✅ `/api/upload/route.ts` exists and returns `{ url: string }` - **READY TO USE**
- ✅ `/api/feed/[feedId]/update-caption/route.ts` exists - **READY TO USE**
- ✅ Multiple feeds supported (queries use `ORDER BY created_at DESC`)
- ✅ `FeedGallerySelector` unified and ready for post selection
- ✅ `FeedPostCard` has caption editing functionality

**Verification Results:**
- Upload API: Returns `{ url: string }` from Vercel Blob ✅
- Update Caption API: Exists and accepts `{ postId, caption }` ✅
- Multi-feed: Already supported in database queries ✅
- Gallery Selector: Unified component ready ✅
- Caption Editing: Already implemented ✅

**No Issues Found - Ready to Proceed!**

---

## 🗄️ DATABASE CHANGES

### Optional: Add `created_by` Field

**Decision:** Recommended for better tracking and future features

**Migration:**
```sql
-- Add created_by field to feed_layouts
ALTER TABLE feed_layouts 
ADD COLUMN created_by VARCHAR(20) DEFAULT 'maya';

-- Update existing feeds
UPDATE feed_layouts 
SET created_by = 'maya' 
WHERE created_by IS NULL;
```

**Why:**
- Track how feed was created (manual vs Maya vs hybrid)
- Useful for analytics and future features
- Backward compatible (defaults to 'maya')

**If Skipping:**
- Can implement without this field
- Less tracking capability
- May need to add later

---

## 📊 PHASE BREAKDOWN

---

## **PHASE 1: EMPTY STATE & MANUAL CREATION** (2 hours)

### Goal
Enable users to create empty feeds manually and see 3x3 grid with placeholders.

### Tasks

#### 1.1: Modify Empty State UI
**File:** `components/feed-planner/feed-view-screen.tsx`

**Current State:**
- Shows "Create Feed in Maya Chat" button only
- Lines 108-172

**Changes:**
```typescript
// Replace single button with two options:
1. "Create New Feed" (manual)
2. "Create with Maya" (existing)
```

**UI Mockup:**
```
┌────────────────────────────────────┐
│  Create Your First Feed            │
│                                    │
│  ┌──────────────────────────┐     │
│  │  Create New Feed         │     │
│  └──────────────────────────┘     │
│                                    │
│  ┌──────────────────────────┐     │
│  │  Create with Maya        │     │
│  └──────────────────────────┘     │
└────────────────────────────────────┘
```

**Code Changes:**
- Add `handleCreateManualFeed` function
- Update empty state JSX to show two buttons
- Keep existing `handleCreateFeed` for Maya

---

#### 1.2: Create Manual Feed API Route
**File:** `app/api/feed/create-manual/route.ts` (NEW)

**Purpose:** Create empty feed with 9 placeholder posts

**Request:**
```typescript
POST /api/feed/create-manual
Body: {
  title?: string  // Optional, defaults to "My Feed - [Date]"
}
```

**Response:**
```typescript
{
  feedId: number
  feed: FeedLayout
  posts: FeedPost[]  // 9 empty posts (position 1-9)
}
```

**Implementation:**
```typescript
1. Authenticate user
2. Get user from database
3. Create feed_layout:
   - user_id
   - brand_name: title || "My Feed"
   - username: user.name (optional)
   - description: null (can be added later)
   - created_by: 'manual'
   - status: 'draft'
4. Create 9 feed_posts:
   - feed_layout_id
   - position: 1-9
   - image_url: null
   - caption: null
   - generation_status: 'pending'
5. Return feedId and data
```

**Database Fields Used:**
- `feed_layouts`: user_id, brand_name, username, description, created_by, status
- `feed_posts`: feed_layout_id, position, image_url, caption, generation_status

---

#### 1.3: Update Feed View Screen
**File:** `components/feed-planner/feed-view-screen.tsx`

**Changes:**
- Add `handleCreateManualFeed` function
- Call `/api/feed/create-manual`
- Navigate to feed view with new feedId
- Handle loading state during creation

**Code:**
```typescript
const handleCreateManualFeed = async () => {
  setIsCreating(true)
  try {
    const response = await fetch('/api/feed/create-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
    
    if (!response.ok) throw new Error('Failed to create feed')
    
    const data = await response.json()
    router.push(`/feed-planner?feedId=${data.feedId}`)
  } catch (error) {
    toast({ title: 'Error', description: 'Failed to create feed' })
  } finally {
    setIsCreating(false)
  }
}
```

---

#### 1.4: Update Instagram Feed View
**File:** `components/feed-planner/instagram-feed-view.tsx`

**Changes:**
- Handle empty posts (no image_url) in grid
- Show placeholder UI for empty posts
- Enable click handlers for empty posts

**Current:** Grid shows "Click to generate" for posts without images  
**Update:** Also show for manual feeds (different messaging)

---

### Deliverables
- [ ] Empty state shows two options (Manual + Maya)
- [ ] "Create New Feed" button works
- [ ] API route creates empty feed with 9 posts
- [ ] Grid displays with placeholders
- [ ] User can see empty feed after creation

---

## **PHASE 2: IMAGE UPLOAD & GALLERY SELECTION** (2.5 hours)

### Goal
Enable users to add images to posts via upload or gallery selection.

### Tasks

#### 2.1: Create Image Selection Modal
**File:** `components/feed-planner/feed-image-selector-modal.tsx` (NEW)

**Purpose:** Modal with two tabs (Upload / Gallery)

**Props:**
```typescript
interface FeedImageSelectorModalProps {
  postId: number
  feedId: number
  isOpen: boolean
  onClose: () => void
  onImageSelected: (imageUrl: string) => void
}
```

**Features:**
- Two tabs: "Upload" and "Gallery"
- Upload tab: File input + drag-and-drop
- Gallery tab: Reuse `FeedGallerySelector` component
- Close button
- Loading states

**UI:**
```
┌────────────────────────────────────┐
│  Add Image to Post 1          [X]  │
│  ┌──────────┐  ┌──────────┐       │
│  │ Upload   │  │ Gallery  │       │
│  └──────────┘  └──────────┘       │
│                                    │
│  [Upload Tab Content]              │
│  or                                │
│  [Gallery Tab Content]             │
│                                    │
│          [Use This Image]          │
└────────────────────────────────────┘
```

---

#### 2.2: Use Existing Upload API ✅
**File:** `app/api/upload/route.ts` (EXISTS - READY TO USE)

**Verified:**
- ✅ Accepts FormData with image file
- ✅ Accepts JSON with base64 image
- ✅ Returns `{ url: string }` from Vercel Blob
- ✅ Handles authentication
- ✅ Saves to blob storage

**Usage:**
```typescript
// Option 1: FormData upload
const formData = new FormData()
formData.append('image', file)

const response = await fetch('/api/upload', {
  method: 'POST',
  body: formData,
  credentials: 'include',
})
const { url } = await response.json()

// Option 2: Base64 upload
const response = await fetch('/api/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ image: base64String }),
  credentials: 'include',
})
const { url } = await response.json()
```

**Note:** Upload API saves to `testimonials/` folder. We may want to create a feed-specific upload route later, but existing API works for MVP.

---

#### 2.3: Create Update Post Image API
**File:** `app/api/feed/[feedId]/update-post-image/route.ts` (NEW)

**Purpose:** Update a post's image_url in database

**Request:**
```typescript
POST /api/feed/[feedId]/update-post-image
Body: {
  postId: number
  imageUrl: string
}
```

**Response:**
```typescript
{
  success: true
  post: FeedPost
}
```

**Implementation:**
```typescript
1. Authenticate user
2. Verify feed belongs to user
3. Verify post belongs to feed
4. Update feed_posts.image_url
5. Update feed_posts.generation_status to 'completed'
6. Return updated post
```

---

#### 2.4: Update Feed Grid Component
**File:** `components/feed-planner/feed-grid.tsx`

**Changes:**
- Add click handler for empty posts
- Open `FeedImageSelectorModal` on click
- Handle image selection callback
- Update grid after image added

**Code:**
```typescript
// Add state for modal
const [imageSelectorModal, setImageSelectorModal] = useState<{
  isOpen: boolean
  postId: number | null
}>({ isOpen: false, postId: null })

// Handle empty post click
const handleEmptyPostClick = (postId: number) => {
  setImageSelectorModal({ isOpen: true, postId })
}

// Handle image selection
const handleImageSelected = async (imageUrl: string) => {
  if (!imageSelectorModal.postId) return
  
  // Call API to update post
  await fetch(`/api/feed/${feedId}/update-post-image`, {
    method: 'POST',
    body: JSON.stringify({
      postId: imageSelectorModal.postId,
      imageUrl,
    }),
  })
  
  // Refresh feed data
  onUpdate()
  
  // Close modal
  setImageSelectorModal({ isOpen: false, postId: null })
}
```

---

#### 2.5: Integrate Gallery Selector
**File:** `components/feed-planner/feed-image-selector-modal.tsx`

**Changes:**
- Import `FeedGallerySelector`
- Use in Gallery tab
- Handle selection callback

**Code:**
```typescript
// In Gallery tab
{activeTab === 'gallery' && (
  <FeedGallerySelector
    type="post"
    postId={postId}
    feedId={feedId}
    onClose={() => setActiveTab('upload')}
    onImageSelected={(imageUrl) => {
      onImageSelected(imageUrl)
      onClose()
    }}
  />
)}
```

**Note:** `FeedGallerySelector` is a full-screen modal, so we may need to adjust or create a simpler gallery view for the tab.

**Alternative:** Create inline gallery component for tab view.

---

### Deliverables
- [ ] Image selector modal with Upload/Gallery tabs
- [ ] Upload functionality works
- [ ] Gallery selection works
- [ ] Post image updates in database
- [ ] Grid refreshes after image added
- [ ] Loading states during upload

---

## **PHASE 3: CAPTION MANAGEMENT** (1.5 hours)

### Goal
Enable users to add and edit captions for manual feed posts.

### Tasks

#### 3.1: Use Existing Update Caption API ✅
**File:** `app/api/feed/[feedId]/update-caption/route.ts` (EXISTS - READY TO USE)

**Verified:**
- ✅ Route exists
- ✅ Accepts `{ postId, caption }` in request body
- ✅ Updates `feed_posts.caption` in database
- ✅ Works for all feeds (no distinction between manual/Maya)

**Usage:**
```typescript
// Note: Uses PATCH method, not POST
await fetch(`/api/feed/${feedId}/update-caption`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ postId, caption }),
  credentials: 'include',
})
```

**No Changes Needed - Ready to Use!**

---

#### 3.2: Enable Caption Editing in FeedPostCard
**File:** `components/feed-planner/feed-post-card.tsx`

**Current:** Caption editing may only work for Maya-created feeds

**Changes:**
- Ensure caption editing works for all feeds
- No distinction between manual and Maya feeds
- Save button calls update-caption API

**Verify:**
- Caption textarea is editable
- Save button exists and works
- API call succeeds

---

#### 3.3: Add Caption to Grid Preview
**File:** `components/feed-planner/feed-grid.tsx`

**Optional Enhancement:**
- Show caption preview on hover
- Or show caption icon if caption exists

**Current:** Grid only shows images  
**Enhancement:** Add visual indicator for posts with captions

---

#### 3.4: Update Feed Posts List
**File:** `components/feed-planner/feed-posts-list.tsx`

**Verify:**
- Caption editing works in list view
- Same functionality as grid view
- No changes needed if already works

---

### Deliverables
- [ ] Caption editing works for manual feeds
- [ ] Captions save to database
- [ ] Captions display in post detail modal
- [ ] Captions display in list view
- [ ] Visual indicator for posts with captions (optional)

---

## **PHASE 4: MULTI-FEED SUPPORT** (1 hour)

### Goal
Enable users to have multiple feeds and switch between them.

### Tasks

#### 4.1: Verify Multi-Feed Support
**Check:**
- Can users already have multiple feeds?
- Does database support it?
- Do queries handle multiple feeds?

**Expected:** Already supported (queries use `ORDER BY created_at DESC`)

---

#### 4.2: Create Feed List API
**File:** `app/api/feed/list/route.ts` (NEW - if needed)

**Purpose:** Get all feeds for current user

**Request:**
```typescript
GET /api/feed/list
```

**Response:**
```typescript
{
  feeds: Array<{
    id: number
    title: string
    created_at: string
    post_count: number
    image_count: number
  }>
}
```

**If Not Needed:** Skip if `/api/feed/latest` already handles this

---

#### 4.3: Add Feed Selector UI
**File:** `components/feed-planner/feed-view-screen.tsx`

**Changes:**
- Add feed dropdown if user has multiple feeds
- Show current feed
- Allow switching between feeds

**UI:**
```
┌────────────────────────────────────┐
│  Feed Planner                      │
│  ┌──────────────────────────────┐  │
│  │ My Feeds │ [Wellness Week ▼]│  │
│  └──────────────────────────────┘  │
│                                    │
│  [Feed Content]                   │
└────────────────────────────────────┘
```

**Code:**
```typescript
// Fetch feed list
const { data: feedList } = useSWR('/api/feed/list', fetcher)

// Show dropdown if multiple feeds
{feedList?.feeds?.length > 1 && (
  <select
    value={feedId}
    onChange={(e) => router.push(`/feed-planner?feedId=${e.target.value}`)}
  >
    {feedList.feeds.map(feed => (
      <option key={feed.id} value={feed.id}>
        {feed.title || `Feed ${feed.id}`}
      </option>
    ))}
  </select>
)}
```

---

#### 4.4: Update Feed Title Editing
**File:** `components/feed-planner/feed-header.tsx` or new component

**Optional Enhancement:**
- Allow editing feed title
- Save to database
- Update in feed list

---

### Deliverables
- [ ] Feed list API works (if needed)
- [ ] Feed selector dropdown shows (if multiple feeds)
- [ ] User can switch between feeds
- [ ] Feed title displays correctly
- [ ] Feed title editing works (optional)

---

## **PHASE 5: POLISH & UX** (2 hours)

### Goal
Professional, polished user experience with helpful features.

### Tasks

#### 5.1: Progress Indicator
**File:** `components/feed-planner/instagram-feed-view.tsx`

**Add:**
- "X of 9 posts complete" indicator
- Visual progress bar
- Show in header or above grid

**UI:**
```
Feed Planner      3/9 complete
[████░░░░░░] 33%
```

**Code:**
```typescript
const completedPosts = posts.filter(p => p.image_url).length
const progress = (completedPosts / 9) * 100

<div className="flex items-center gap-2">
  <span>{completedPosts}/9 complete</span>
  <div className="w-32 h-2 bg-stone-200 rounded-full">
    <div 
      className="h-2 bg-stone-900 rounded-full transition-all"
      style={{ width: `${progress}%` }}
    />
  </div>
</div>
```

---

#### 5.2: Better Empty States
**File:** `components/feed-planner/feed-grid.tsx`

**Enhance:**
- Better placeholder visuals
- Helpful tooltips
- "Click to add image" hints

**UI:**
```
┌───┬───┬───┐
│ + │ + │ + │  ← "Click to add image"
├───┼───┼───┤
│ + │ + │ + │
├───┼───┼───┤
│ + │ + │ + │
└───┴───┴───┘

💡 Tip: Click any box to upload or select from gallery
```

---

#### 5.3: Smart Defaults
**File:** `app/api/feed/create-manual/route.ts`

**Add:**
- Default feed title: "My Feed - [Date]"
- Auto-save on every action (already works via APIs)
- Default username from user profile

---

#### 5.4: Validation
**File:** `components/feed-planner/feed-image-selector-modal.tsx`

**Add:**
- Image file type validation (jpg, png, webp)
- Image size validation (max 10MB)
- Error messages for invalid files

**File:** `components/feed-planner/feed-post-card.tsx`

**Add:**
- Caption length warning (if > 300 chars)
- Character count display
- Validation before save

---

#### 5.5: Helpful Tooltips
**File:** `components/feed-planner/feed-grid.tsx`

**Add:**
- "Click to add image" on empty posts
- "Drag to reorder" on complete posts
- "Click to edit" on posts with images

**Implementation:**
- Use `title` attribute or tooltip component
- Show on hover

---

#### 5.6: Auto-Save Indicators
**File:** `components/feed-planner/instagram-feed-view.tsx`

**Add:**
- "Saving..." indicator during API calls
- "Saved" confirmation (brief toast)
- Error handling with retry

---

#### 5.7: Undo/Redo (Optional)
**File:** `components/feed-planner/hooks/use-feed-history.ts` (NEW)

**If Time Permits:**
- Track last action
- "Undo" button to revert
- Store in local state (not database)

**Complexity:** Medium  
**Priority:** Low (can skip for MVP)

---

### Deliverables
- [ ] Progress indicator shows completion status
- [ ] Empty states are helpful and clear
- [ ] Smart defaults work
- [ ] Validation prevents errors
- [ ] Tooltips guide users
- [ ] Auto-save indicators show status
- [ ] Professional, polished UX

---

## 📁 FILES TO CREATE

### New Files
```
app/api/feed/create-manual/route.ts (NEW - required)
app/api/feed/[feedId]/update-post-image/route.ts (NEW - required)
app/api/feed/list/route.ts (NEW - optional, only if multi-feed UI needed)
components/feed-planner/feed-image-selector-modal.tsx (NEW - required)
components/feed-planner/hooks/use-manual-feed.ts (NEW - optional helper)
```

### Existing Files (Verified & Ready)
```
app/api/upload/route.ts (EXISTS - ready to use)
app/api/feed/[feedId]/update-caption/route.ts (EXISTS - ready to use)
components/feed-planner/feed-gallery-selector.tsx (EXISTS - ready to use)
components/feed-planner/feed-post-card.tsx (EXISTS - caption editing ready)
```

### Files to Modify
```
components/feed-planner/feed-view-screen.tsx
components/feed-planner/instagram-feed-view.tsx
components/feed-planner/feed-grid.tsx
components/feed-planner/feed-post-card.tsx
components/feed-planner/feed-posts-list.tsx
components/feed-planner/feed-header.tsx (optional)
```

---

## 🧪 TESTING CHECKLIST

### Phase 1 Tests
- [ ] Empty state shows two buttons
- [ ] "Create New Feed" creates feed
- [ ] Grid displays with 9 placeholders
- [ ] Feed ID is correct
- [ ] Navigation works

### Phase 2 Tests
- [ ] Image selector modal opens
- [ ] Upload tab works
- [ ] Gallery tab works
- [ ] Image uploads successfully
- [ ] Image updates in database
- [ ] Grid refreshes after upload
- [ ] Error handling works

### Phase 3 Tests
- [ ] Caption editing works
- [ ] Caption saves to database
- [ ] Caption displays correctly
- [ ] Caption validation works

### Phase 4 Tests
- [ ] Multiple feeds work
- [ ] Feed selector shows (if multiple)
- [ ] Switching feeds works
- [ ] Feed titles display

### Phase 5 Tests
- [ ] Progress indicator accurate
- [ ] Empty states helpful
- [ ] Validation prevents errors
- [ ] Tooltips show
- [ ] Auto-save works
- [ ] No console errors
- [ ] Mobile responsive

---

## ⏱️ TIMELINE

### Day 1: Foundation (4.5 hours)
- **Morning (2 hours):** Phase 1 - Empty State & Manual Creation
- **Afternoon (2.5 hours):** Phase 2 - Image Upload & Gallery Selection

### Day 2: Core Features (2.5 hours)
- **Morning (1.5 hours):** Phase 3 - Caption Management
- **Afternoon (1 hour):** Phase 4 - Multi-Feed Support

### Day 3: Polish (2 hours)
- **Morning (2 hours):** Phase 5 - Polish & UX
- **Afternoon:** Testing & bug fixes

**Total:** 9 hours (plus buffer for testing)

---

## 🚨 RISKS & MITIGATION

| Risk | Impact | Mitigation |
|------|--------|------------|
| Upload API doesn't work | High | Create feed-specific upload route |
| Multi-feed not supported | Medium | Verify first, add if needed |
| Performance with many feeds | Low | Pagination if needed |
| Breaking existing flows | High | Test Maya flows after each phase |
| Time overrun | Medium | Prioritize core features, skip optional |

---

## ✅ SUCCESS CRITERIA

**MVP Complete When:**
- [ ] User can create feed manually
- [ ] User can upload images to grid
- [ ] User can select images from gallery
- [ ] User can edit captions
- [ ] Feeds save automatically
- [ ] Manual feeds work alongside Maya feeds
- [ ] No breaking changes to existing flows
- [ ] UI is intuitive and professional

**Nice to Have:**
- [ ] Multi-feed selector
- [ ] Progress indicators
- [ ] Undo/redo
- [ ] Feed templates

---

## 📝 NOTES

### Reusable Components
- ✅ `FeedGallerySelector` - Already unified, works for posts
- ✅ `FeedPostCard` - Already has caption editing
- ✅ Upload APIs - Can reuse or create feed-specific

### Database Considerations
- `created_by` field is optional but recommended
- All other fields already exist
- No breaking changes needed

### Backward Compatibility
- All changes are additive
- Maya flows remain unchanged
- Existing feeds continue to work

---

## 🎯 NEXT STEPS

1. **Review this plan** - Confirm approach and timeline
2. **Run verification** - Check APIs and database
3. **Start Phase 1** - Begin implementation
4. **Test after each phase** - Ensure no regressions
5. **Polish in Phase 5** - Final UX improvements

---

**Ready to implement?** Let's start with Phase 1! 🚀


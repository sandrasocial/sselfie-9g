# Feed Planner Feature Completion Plan

## Overview
Complete the feed planner feature to provide a seamless workflow where users can create feeds in Maya chat, view and edit them in the Feed Planner screen, and maintain a history of all created feeds.

---

## Current State Analysis

### ✅ What's Working
- Feed creation in Maya chat (Feed tab)
- Feed cards display in chat history
- Feed planner screen exists with InstagramFeedView component
- Drag-and-drop reordering (needs verification)
- Image upload/selection from gallery
- Caption and hashtag display
- Strategy panel display

### ❌ What's Broken/Missing
1. **"View Full Feed" button** - Not routing to feed planner
2. **Feed planner always shows error** - Not fetching latest feed automatically
3. **No placeholder state** - Shows error instead of empty feed with placeholders
4. **No feed history** - Can't access previous feeds
5. **No automatic feed loading** - Feed planner requires feedId, doesn't auto-load latest

---

## Implementation Plan

### Phase 1: Fix "View Full Feed" Button & Basic Routing ⚡

#### 1.1 Fix FeedPreviewCard Routing
**File:** `components/feed-planner/feed-preview-card.tsx`

**Changes:**
- Update `handleViewFullFeed` to navigate to feed planner with feedId
- Use router navigation: `router.push(`/feed-planner?feedId=${feedId}`)` or hash navigation
- Ensure it works on both mobile and desktop

**Implementation:**
```typescript
const handleViewFullFeed = () => {
  if (onViewFullFeed) {
    onViewFullFeed()
  } else {
    // Navigate to feed planner screen with feedId
    if (typeof window !== "undefined") {
      window.location.hash = `#feed-planner?feedId=${feedId}`
      // Or use router if preferred
      router.push(`/?feedId=${feedId}#feed-planner`)
    }
  }
}
```

#### 1.2 Test Routing
- Verify button navigates correctly
- Verify feedId is passed correctly
- Verify feed loads in planner screen

**Estimated Time:** 30 minutes

---

### Phase 2: Feed Planner Always Shows Latest Feed 🎯

#### 2.1 Update FeedPlannerScreen to Auto-Fetch Latest Feed
**File:** `components/feed-planner/feed-planner-screen.tsx`

**Changes:**
- Modify SWR fetch to use `/api/feed/latest` when no feedId provided
- Keep feedId-based fetch for specific feeds (history)
- Show placeholder state when no feed exists

**Implementation:**
```typescript
// Priority: feedId from prop/query > latest feed > null
const feedId = feedIdProp ?? (searchParams.get('feedId') ? parseInt(searchParams.get('feedId')!, 10) : null)

// Fetch latest feed if no feedId provided
const { data: latestFeedData } = useSWR(
  !feedId ? '/api/feed/latest' : null,
  fetcher
)

// Use latest feedId if no specific feedId
const effectiveFeedId = feedId || latestFeedData?.feed?.id || null

// Fetch feed data with effectiveFeedId
const { data: feedData, error: feedError, isLoading } = useSWR(
  effectiveFeedId ? `/api/feed/${effectiveFeedId}` : null,
  fetcher,
  {
    refreshInterval: 3000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  }
)
```

#### 2.2 Handle Empty State (No Feed Exists)
**Changes:**
- Show placeholder feed with 9 empty post slots
- Display empty strategy panel
- Show "Create your first feed in Maya Chat" message
- Add button to navigate to Maya Feed tab

**Estimated Time:** 1 hour

---

### Phase 3: Placeholder State with Empty Feed Structure 📦

#### 3.1 Create Placeholder Feed Structure
**File:** `components/feed-planner/instagram-feed-view.tsx`

**Changes:**
- When feedData is null/empty, show placeholder structure:
  - 9 post placeholders (image placeholder, empty caption)
  - Empty strategy panel
  - Empty bio/highlights sections
- Placeholders should look like empty feed slots (not error state)

**Implementation:**
```typescript
// In InstagramFeedView component
const placeholderPosts = useMemo(() => {
  return Array.from({ length: 9 }, (_, i) => ({
    id: `placeholder-${i + 1}`,
    position: i + 1,
    image_url: null,
    caption: '',
    prompt: '',
    post_type: 'user',
    generation_status: 'pending',
    isPlaceholder: true, // Flag to identify placeholders
  }))
}, [])

const displayPosts = feedData?.posts?.length > 0 ? feedData.posts : placeholderPosts
```

#### 3.2 Placeholder UI Components
**Changes:**
- Create placeholder post card component
- Show image icon/placeholder instead of error
- Show "Generate image" prompt
- Empty caption/strategy placeholders

**Estimated Time:** 2 hours

---

### Phase 4: Auto-Populate Placeholders When Feed Created 🚀

#### 4.1 Update FeedPlannerScreen on Feed Creation
**File:** `components/feed-planner/feed-planner-screen.tsx`

**Changes:**
- Listen for new feed creation (via SWR mutate or event)
- Auto-refresh when new feed is detected
- Update placeholder posts with real feed data

**Implementation:**
```typescript
// Listen for feed creation events
useEffect(() => {
  const handleFeedCreated = (event: CustomEvent) => {
    const newFeedId = event.detail.feedId
    // Update SWR cache or trigger refresh
    mutate()
    // Navigate to new feed if needed
    if (!feedId && newFeedId) {
      router.push(`/?feedId=${newFeedId}#feed-planner`)
    }
  }
  
  window.addEventListener('feedCreated', handleFeedCreated as EventListener)
  return () => window.removeEventListener('feedCreated', handleFeedCreated as EventListener)
}, [mutate, feedId, router])
```

#### 4.2 Dispatch Event from Maya Feed Creation
**File:** `components/sselfie/maya/maya-feed-tab.tsx`

**Changes:**
- Dispatch custom event when feed is created
- Include feedId in event detail
- Feed planner will listen and update

**Implementation:**
```typescript
// After successful feed creation
if (result.feedId) {
  // Dispatch event for feed planner to listen
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent('feedCreated', {
      detail: { feedId: result.feedId }
    }))
  }
}
```

**Estimated Time:** 1.5 hours

---

### Phase 5: Feed History Tab 📚

#### 5.1 Create Feed History API Endpoint
**File:** `app/api/feed/list/route.ts` (create new)

**Changes:**
- Fetch all feeds for user ordered by created_at DESC
- Return feed metadata (id, title, created_at, post_count, image_count)
- Support pagination if needed

**Implementation:**
```typescript
export async function GET(req: NextRequest) {
  // Get authenticated user
  // Fetch all feed_layouts for user
  // Return array of feeds with metadata
  return Response.json({
    feeds: [
      {
        id: 1,
        title: 'Feed Title',
        created_at: '2024-01-01',
        post_count: 9,
        image_count: 7,
        preview_image: 'url'
      }
    ]
  })
}
```

#### 5.2 Create Feed History UI Component
**File:** `components/feed-planner/feed-history-panel.tsx` (new)

**Changes:**
- List of all user feeds
- Show preview, title, date, completion status
- Click to load feed in planner
- "New Feed" button at top

**Design:**
- Side panel or modal
- Grid/list view of feed previews
- Filter by date, status

#### 5.3 Integrate History into Feed Planner Screen
**File:** `components/feed-planner/feed-planner-screen.tsx`

**Changes:**
- Add history button/icon in header
- Toggle history panel
- Handle feed selection from history
- Update URL with selected feedId

**Estimated Time:** 3 hours

---

### Phase 6: Verify & Fix Existing Features 🔧

#### 6.1 Test Drag-and-Drop Reordering
**File:** `components/feed-planner/instagram-feed-view.tsx`

**Changes:**
- Verify drag handlers work correctly
- Test on mobile (touch events)
- Ensure position updates persist
- Check error handling

**If Broken:**
- Fix drag event handlers
- Ensure touch support for mobile
- Verify API endpoint works
- Add loading states

#### 6.2 Test Image Upload/Selection
**Files:** 
- `components/feed-planner/feed-post-gallery-selector.tsx`
- `components/feed-planner/feed-profile-gallery-selector.tsx`

**Changes:**
- Verify gallery selector opens
- Test image selection
- Verify image updates in feed
- Check image upload flow

#### 6.3 Test Caption/Strategy Updates
**Files:**
- `components/feed-planner/instagram-feed-view.tsx`
- `components/feed-planner/feed-strategy-panel.tsx`

**Changes:**
- Verify caption editing
- Test strategy panel display
- Check hashtag extraction
- Verify save functionality

**Estimated Time:** 2 hours

---

### Phase 7: Multi-Feed Support & Updates 🔄

#### 7.1 Handle New Feed Creation
**Changes:**
- When new feed created in Maya:
  - Latest feed becomes new active feed
  - Previous feed saved to history
  - Feed planner auto-loads new feed
  - Placeholders populate with new feed data

#### 7.2 Feed Switching Logic
**Changes:**
- Allow switching between feeds
- Maintain current feed state
- Update URL/hash when switching
- Preserve unsaved changes warning

#### 7.3 Feed Persistence
**Changes:**
- All feeds saved to database (already working)
- Mark latest feed somehow (created_at DESC or is_active flag)
- History shows all feeds chronologically

**Estimated Time:** 2 hours

---

## Implementation Order & Priorities

### 🔴 Critical Path (Must Complete First)
1. **Phase 1:** Fix "View Full Feed" button routing
2. **Phase 2:** Feed planner auto-fetches latest feed
3. **Phase 3:** Placeholder state (no error on empty)

### 🟡 High Priority (Core Functionality)
4. **Phase 4:** Auto-populate placeholders when feed created
5. **Phase 6:** Verify drag-and-drop works

### 🟢 Nice to Have (Enhancements)
6. **Phase 5:** Feed history tab
7. **Phase 7:** Multi-feed switching improvements

---

## Testing Checklist

### Unit Tests
- [ ] Feed routing works correctly
- [ ] Latest feed fetch works
- [ ] Placeholder state displays correctly
- [ ] Event dispatch/listen works

### Integration Tests
- [ ] Create feed in Maya → Appears in planner
- [ ] "View Full Feed" navigates correctly
- [ ] Drag-and-drop reorders posts
- [ ] Image upload/selection works
- [ ] Feed history loads and displays

### User Flow Tests
- [ ] New user: See placeholder → Create feed → See feed
- [ ] Existing user: See latest feed → Create new → See new feed
- [ ] Multiple feeds: Switch between feeds
- [ ] Edit feed: Change images, reorder, update captions

---

## Files to Modify

### Core Files
1. `components/feed-planner/feed-preview-card.tsx` - Fix routing
2. `components/feed-planner/feed-planner-screen.tsx` - Auto-fetch latest, placeholders
3. `components/feed-planner/instagram-feed-view.tsx` - Placeholder posts, verify drag-drop
4. `components/sselfie/maya/maya-feed-tab.tsx` - Dispatch feedCreated event

### New Files
1. `components/feed-planner/feed-history-panel.tsx` - History UI
2. `app/api/feed/list/route.ts` - Feed list API

### API Endpoints (verify/create)
1. `/api/feed/latest` - Already exists ✅
2. `/api/feed/list` - Need to create
3. `/api/feed/[feedId]/reorder` - Verify works
4. `/api/feed/[feedId]` - Already exists ✅

---

## Design Considerations

### Keep Current Design
- No visual redesign needed
- Maintain existing UI/UX patterns
- Keep drag-and-drop behavior
- Preserve image upload flow

### Enhancements Only
- Add history panel (minimal design)
- Placeholder state (subtle, matches existing)
- Loading states (existing patterns)

---

## Success Criteria

✅ **Phase 1-3 Complete:**
- "View Full Feed" button works
- Feed planner always shows feed (or placeholders)
- No error screens for empty state

✅ **Phase 4 Complete:**
- Feed created in Maya auto-appears in planner
- Placeholders populate with real data

✅ **Phase 5 Complete:**
- Users can access feed history
- Can switch between feeds

✅ **Phase 6 Complete:**
- All existing features work (drag-drop, upload, etc.)

✅ **Phase 7 Complete:**
- Smooth multi-feed workflow
- Previous feeds preserved in history

---

## Estimated Total Time
- **Critical Path (Phases 1-3):** 3.5 hours
- **High Priority (Phases 4, 6):** 3.5 hours
- **Nice to Have (Phases 5, 7):** 5 hours
- **Total:** ~12 hours

---

## Next Steps

1. ✅ Review and approve plan
2. Start with Phase 1 (quick win - 30 min)
3. Implement Phase 2-3 (core functionality - 3 hours)
4. Test and verify basic flow works
5. Continue with remaining phases based on priority

---

**Plan Created:** 2024-12-30  
**Last Updated:** 2024-12-30


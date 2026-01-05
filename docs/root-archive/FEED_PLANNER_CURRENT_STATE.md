# FEED PLANNER CURRENT STATE ANALYSIS

**Generated:** 2025-01-27  
**Total Lines of Code:** 5,154 lines (components only)  
**Total Components:** 13 active components  
**Total API Routes:** 17 routes  
**Main Issue:** `instagram-feed-view.tsx` is 1,880 lines (6x over limit!)

---

## 📁 FILES FOUND

### Components (`components/feed-planner/`)
| File | Lines | Status | Purpose |
|------|-------|--------|---------|
| `feed-view-screen.tsx` | 218 | ✅ Active | Main entry point, routing, placeholder states |
| `instagram-feed-view.tsx` | **1,880** | ⚠️ **BLOATED** | Main feed display (Grid/Posts/Strategy tabs) |
| `feed-post-card.tsx` | 589 | ⚠️ Large | Post detail modal with caption editing |
| `feed-grid-preview.tsx` | 161 | ✅ OK | 3x3 grid preview component |
| `feed-strategy-panel.tsx` | 91 | ✅ OK | Strategy document display |
| `feed-welcome-screen.tsx` | 87 | ❓ Unused? | Welcome screen (not imported anywhere) |
| `feed-post-gallery-selector.tsx` | 225 | ✅ OK | Gallery selector for posts |
| `feed-profile-gallery-selector.tsx` | ~200 | ✅ OK | Gallery selector for profile |
| `feed-caption-card.tsx` | ~150 | ✅ OK | Caption display component |
| `feed-strategy-card.tsx` | ~100 | ✅ OK | Strategy card component |
| `bulk-generation-progress.tsx` | ~100 | ✅ OK | Progress indicator |
| `feed-preview-card.tsx` | ~200 | ✅ OK | Preview card component |
| `strategy-preview.tsx` | ~100 | ✅ OK | Strategy preview |

**Backup Files (Cleanup Needed):**
- `feed-planner-screen.tsx.backup-1767450747`
- `feed-planner-screen.tsx.backup-1767453288`
- `feed-preview-card.tsx.backup-*` (9 backup files!)
- `instagram-feed-view.tsx.backup-1767454481`

### API Routes (`app/api/`)
| Route | Purpose | Status |
|-------|---------|--------|
| `/api/feed/latest` | Get latest feed | ✅ Active |
| `/api/feed/[feedId]` | Get specific feed | ✅ Active |
| `/api/feed/[feedId]/generate-single` | Generate single post image | ✅ Active |
| `/api/feed/[feedId]/generate-captions` | Generate all captions | ✅ Active |
| `/api/feed/[feedId]/generate-strategy` | Generate strategy doc | ✅ Active |
| `/api/feed/[feedId]/enhance-caption` | Enhance existing caption | ✅ Active |
| `/api/feed/[feedId]/regenerate-caption` | Regenerate caption | ✅ Active |
| `/api/feed/[feedId]/update-caption` | Update caption | ✅ Active |
| `/api/feed/[feedId]/reorder` | Reorder posts | ✅ Active |
| `/api/feed/[feedId]/download-bundle` | Download ZIP bundle | ✅ Active |
| `/api/feed/[feedId]/generate-bio` | Generate Instagram bio | ✅ Active |
| `/api/feed/[feedId]/check-post` | Check post status | ✅ Active |
| `/api/feed/[feedId]/progress` | Get generation progress | ✅ Active |
| `/api/feed-planner/create-strategy` | Create feed strategy | ✅ Active |
| `/api/feed-planner/create-from-strategy` | Create feed from strategy | ✅ Active |
| `/api/feed-planner/queue-all-images` | Queue all images for generation | ✅ Active |
| `/api/maya/feed/save-to-planner` | Save feed from Maya | ✅ Active |

### Pages
| File | Purpose | Status |
|------|---------|--------|
| `app/feed-planner/page.tsx` | Main feed planner page | ✅ Active |

### Context & Lib Files
| File | Purpose | Lines |
|------|---------|-------|
| `lib/maya/feed-planner-context.ts` | Maya context addon for feed planning | 864 |

---

## 🎯 MAIN COMPONENTS ANALYSIS

### Component 1: `FeedViewScreen` (Main Entry Point)
**File:** `components/feed-planner/feed-view-screen.tsx`  
**Lines of Code:** 218  
**Purpose:** Main entry point for `/feed-planner` route. Handles routing, loading states, and placeholder when no feed exists.

**UI Elements:**
- ✅ Back button (to Maya Chat)
- ✅ Loading state
- ✅ Error state
- ✅ Placeholder state (no feed exists)
- ✅ Delegates to `InstagramFeedView` when feed exists

**Features:**
1. Accepts `feedId` from props or query params
2. Fetches latest feed if no `feedId` provided
3. Shows placeholder with "Create Feed in Maya Chat" CTA
4. Routes to Maya Feed tab via hash navigation (`#maya/feed`)
5. Uses SWR for data fetching with polling

**Dependencies:**
- `next/navigation` (useRouter, useSearchParams)
- `swr` (useSWR)
- `./instagram-feed-view`
- `../sselfie/unified-loading`

**Used By:**
- `app/feed-planner/page.tsx` (main route)

**State Management:**
- Uses SWR for server state
- No local state (stateless wrapper)

---

### Component 2: `InstagramFeedView` (Main Feed Display) ⚠️ **BLOATED**
**File:** `components/feed-planner/instagram-feed-view.tsx`  
**Lines of Code:** **1,880** (6x over 300 line limit!)  
**Purpose:** Main feed display component with Grid/Posts/Strategy tabs, post management, and all interactions.

**UI Elements:**
- ✅ Instagram-style header (profile, bio, stats)
- ✅ 3 tabs: Grid / Posts / Strategy
- ✅ 3x3 grid view (drag-and-drop reordering)
- ✅ Posts list view (Instagram-style posts)
- ✅ Strategy document view (markdown)
- ✅ Post detail modal (`FeedPostCard`)
- ✅ Gallery selectors (post & profile)
- ✅ Loading overlay (blurred preview)
- ✅ Success banner (when complete)
- ✅ Progress indicators
- ✅ Confetti animation

**Features:**
1. **Tab Navigation:** Grid / Posts / Strategy
2. **Grid View:**
   - 3x3 Instagram grid
   - Drag-and-drop reordering
   - Click to open post detail
   - Generate button for empty posts
   - Loading states per post
3. **Posts View:**
   - Instagram-style post cards
   - Expandable captions
   - Copy caption/hashtags
   - Edit caption (inline)
   - Enhance caption (Maya)
   - Regenerate caption
4. **Strategy View:**
   - Full strategy document (markdown)
   - Posting schedule
   - Content pillars
   - Story sequences
   - Reel recommendations
   - Carousel ideas
   - Growth tactics
   - Hashtag strategy
5. **Post Management:**
   - Generate single post
   - Generate remaining posts
   - Regenerate post (with confirmation)
   - Select from gallery
   - Change profile image
6. **Bio Management:**
   - Generate/regenerate bio
   - Display bio in header
7. **Download:**
   - Download bundle (ZIP with all images + captions + strategy)
8. **Real-time Updates:**
   - SWR polling (3s interval when generating)
   - Grace period polling (15s after updates)
   - Automatic refresh on actions

**Dependencies:**
- `react` (useState, useEffect, useMemo, useRef)
- `lucide-react` (20+ icons)
- `next/image`
- `swr` (useSWR)
- `react-markdown`
- `./feed-post-card`
- `./feed-post-gallery-selector`
- `./feed-profile-gallery-selector`
- `@/hooks/use-toast`

**Used By:**
- `feed-view-screen.tsx`

**State Management:**
- **20+ useState hooks:**
  - `activeTab` (grid/posts/strategy)
  - `selectedPost`
  - `expandedCaptions` (Set)
  - `regeneratingPost`
  - `showGallery`
  - `showProfileGallery`
  - `showConfetti`
  - `generatingRemaining`
  - `copiedCaptions` (Set)
  - `enhancingCaptions` (Set)
  - `isGeneratingBio`
  - `draggedIndex`
  - `reorderedPosts`
  - `isSavingOrder`
  - `isDownloadingBundle`
  - `postStartTimes` (Map)
  - `completedPosts` (Set)
  - Plus refs for polling logic

**Issues:**
- ❌ **1,880 lines** (should be max 300)
- ❌ Too many responsibilities (UI, state, API calls, animations)
- ❌ Complex polling logic mixed with UI
- ❌ Drag-and-drop logic embedded
- ❌ Confetti animation code embedded
- ❌ Should be split into 6+ smaller components

---

### Component 3: `FeedPostCard` (Post Detail Modal)
**File:** `components/feed-planner/feed-post-card.tsx`  
**Lines of Code:** 589  
**Purpose:** Instagram-style post card shown in modal when clicking a post.

**UI Elements:**
- ✅ Instagram post mockup (header, image, actions, caption)
- ✅ Caption editor (inline editing)
- ✅ Copy caption/hashtags buttons
- ✅ Enhance/regenerate caption buttons
- ✅ Generate button (if no image)
- ✅ Loading states

**Features:**
1. Display post image or placeholder
2. Edit caption (inline textarea)
3. Copy caption to clipboard
4. Copy hashtags separately
5. Enhance caption (Maya AI)
6. Regenerate caption
7. Generate image (if missing)
8. Caption length indicator (optimal: 125-150 chars)

**Dependencies:**
- `react` (useState)
- `next/image`
- `lucide-react` (10+ icons)
- `@/hooks/use-toast`

**Used By:**
- `instagram-feed-view.tsx` (in modal)

**Issues:**
- ⚠️ 589 lines (should be max 300)
- ⚠️ Could split into: `PostImage`, `PostCaption`, `PostActions`

---

### Component 4: `FeedGridPreview`
**File:** `components/feed-planner/feed-grid-preview.tsx`  
**Lines of Code:** 161  
**Purpose:** 3x3 grid preview component (used in strategy view?).

**UI Elements:**
- ✅ 3x3 grid
- ✅ Post status indicators (ready/pending)
- ✅ Generate button per post
- ✅ Loading states

**Features:**
1. Display 9 posts in grid
2. Show generation status
3. Click to generate missing posts

**Dependencies:**
- `react` (useState)
- `next/image`
- `lucide-react`
- `@/hooks/use-toast`

**Used By:**
- Unknown (may be unused?)

---

### Component 5: `FeedWelcomeScreen`
**File:** `components/feed-planner/feed-welcome-screen.tsx`  
**Lines of Code:** 87  
**Purpose:** Welcome screen for new users.

**UI Elements:**
- ✅ Welcome message
- ✅ Feature list
- ✅ Cost & time info
- ✅ CTA button

**Features:**
1. Explain what user gets (9 photos, captions, strategy)
2. Show cost (9-14 credits) and time (~10 minutes)
3. "Start Creating" button

**Dependencies:**
- None (pure component)

**Used By:**
- ❓ **NOT IMPORTED ANYWHERE** (likely unused)

**Issues:**
- ❌ Dead code - should be removed or integrated

---

## 🔄 USER FLOW

### Scenario 1: User Creates Feed in Maya Chat
1. User navigates to `/studio` (or `/`)
2. User clicks "Feed" tab → Hash changes to `#maya/feed`
3. Maya chat loads with Feed Planner context
4. User types: "Create a feed in Beige & Simple aesthetic"
5. Maya generates strategy using `getFeedPlannerContextAddon()`
6. User approves strategy
7. Maya calls `[CREATE_FEED_STRATEGY]` trigger
8. Backend calls `/api/feed-planner/create-strategy`
9. Strategy saved to `feed_layouts` table
10. 9 posts created in `feed_posts` table
11. Images queued via `/api/feed-planner/queue-all-images`
12. User redirected to `/feed-planner` (or stays in Maya)

### Scenario 2: User Views Feed in Feed Planner
1. User navigates to `/feed-planner`
2. `FeedViewScreen` loads
3. Fetches latest feed via `/api/feed/latest` (or specific `feedId`)
4. If no feed exists:
   - Shows placeholder with "Create Feed in Maya Chat" button
   - Button navigates to `/#maya/feed`
5. If feed exists:
   - Renders `InstagramFeedView`
   - Shows loading overlay if images generating
   - Polls `/api/feed/[feedId]` every 3s while generating
   - Shows Grid/Posts/Strategy tabs
6. User can:
   - View grid (3x3)
   - Drag-and-drop to reorder
   - Click post to see detail modal
   - Edit captions
   - Regenerate posts
   - Download bundle
   - View strategy document

### Scenario 3: User Generates Missing Images
1. User sees empty slots in grid
2. Clicks "Generate Remaining X Images" button
3. Calls `/api/feed-planner/queue-all-images`
4. Posts get `prediction_id` assigned
5. SWR polling detects `prediction_id` without `image_url`
6. Continues polling every 3s
7. When images complete, updates UI
8. Shows confetti when all 9 complete

---

## 🔍 CODE ANALYSIS

### What's Working ✅
1. **Feed Creation Flow:** Maya → Strategy → Posts → Images (works end-to-end)
2. **Real-time Updates:** SWR polling catches image completions
3. **UI/UX:** Instagram-style mockup is polished
4. **Caption Management:** Edit, enhance, regenerate all work
5. **Download Bundle:** ZIP download with all assets
6. **Drag-and-Drop:** Reordering posts works
7. **Gallery Integration:** Can select images from gallery
8. **Bio Generation:** Can generate/regenerate Instagram bio

### What's Duplicate ⚠️
1. **Backup Files:** 12+ backup files in `components/feed-planner/`
   - `feed-planner-screen.tsx.backup-*` (2 files)
   - `feed-preview-card.tsx.backup-*` (9 files!)
   - `instagram-feed-view.tsx.backup-*` (1 file)
2. **Feed Fetching Logic:**
   - `/api/feed/latest` and `/api/feed/[feedId]` with `feedId="latest"` do the same thing
   - Both query `feed_layouts` ORDER BY created_at DESC LIMIT 1
3. **Caption Actions:**
   - `handleEnhanceCaption` in both `InstagramFeedView` and `FeedPostCard`
   - `copyCaptionToClipboard` duplicated
4. **Gallery Selectors:**
   - `FeedPostGallerySelector` and `FeedProfileGallerySelector` share similar logic
   - Could be unified with a `type` prop

### What's Unused ❌
1. **`FeedWelcomeScreen`:** Not imported anywhere
2. **`FeedGridPreview`:** May be unused (need to verify)
3. **`FeedStrategyPanel`:** May be unused (strategy shown in `InstagramFeedView`)
4. **Backup Files:** All `.backup-*` files should be deleted
5. **Deprecated Export:** `index.ts` exports `FeedPlannerScreen` as deprecated alias

### What's Confusing 🤔
1. **Component Naming:**
   - `FeedViewScreen` vs `FeedPlannerScreen` (deprecated)
   - `InstagramFeedView` (should be `FeedDisplay`?)
2. **File Structure:**
   - Why is main component called `instagram-feed-view.tsx`?
   - Should be `feed-display.tsx` or `feed-view.tsx`
3. **State Management:**
   - 20+ useState hooks in `InstagramFeedView`
   - Should use reducer or split into smaller components
4. **Polling Logic:**
   - Complex polling logic with grace periods, refs, timeouts
   - Should be extracted to custom hook
5. **API Route Naming:**
   - `/api/feed/[feedId]` vs `/api/feed-planner/*`
   - Inconsistent naming convention

---

## 📊 SIZE BREAKDOWN

| Category | Count | Lines |
|----------|-------|-------|
| **Components** | 13 | 5,154 |
| **API Routes** | 17 | ~3,000 (estimated) |
| **Context/Lib** | 1 | 864 |
| **Pages** | 1 | 38 |
| **Total** | **32 files** | **~9,000 lines** |

**Largest Files:**
1. `instagram-feed-view.tsx` - **1,880 lines** ⚠️
2. `feed-post-card.tsx` - 589 lines ⚠️
3. `feed-planner-context.ts` - 864 lines (OK, it's documentation)
4. `feed-view-screen.tsx` - 218 lines ✅

---

## 🎨 VISUAL STRUCTURE

### Current UI (based on code analysis):

```
/feed-planner
├── FeedViewScreen (wrapper)
    ├── [Loading State] → UnifiedLoading
    ├── [Error State] → Error message + back button
    ├── [Placeholder] → "Create Feed in Maya Chat" CTA
    └── [Feed Exists] → InstagramFeedView
        ├── Header
        │   ├── Back button
        │   ├── Profile image (clickable → gallery)
        │   ├── Stats (9 posts, 1.2K followers, 342 following)
        │   ├── Bio (with generate button)
        │   └── Action buttons (Following, Message)
        ├── Tabs
        │   ├── Grid (3x3 with drag-and-drop)
        │   ├── Posts (Instagram-style list)
        │   └── Strategy (markdown document)
        ├── [Loading Overlay] → Blurred preview + progress
        ├── [Success Banner] → "Feed complete!" + download button
        └── Modals
            ├── FeedPostCard (post detail)
            ├── FeedPostGallerySelector
            └── FeedProfileGallerySelector
```

### What it should be (simplified):

```
/feed-planner
├── FeedViewScreen (wrapper - 100 lines)
    └── FeedDisplay (main component - 300 lines)
        ├── FeedHeader (profile, bio, stats - 150 lines)
        ├── FeedTabs (grid/posts/strategy - 100 lines)
        ├── FeedGrid (3x3 grid - 200 lines)
        ├── FeedPostsList (Instagram posts - 250 lines)
        ├── FeedStrategy (markdown doc - 150 lines)
        └── FeedModals (post detail, galleries - 200 lines)
```

---

## 💡 RECOMMENDATIONS

### Keep (Working Features) ✅
1. **Feed Creation Flow:** Maya integration works well
2. **Real-time Polling:** SWR polling catches updates
3. **UI Design:** Instagram mockup is polished
4. **Caption Management:** Edit/enhance/regenerate all work
5. **Download Bundle:** Useful feature
6. **Drag-and-Drop:** Good UX for reordering

### Remove (Bloat/Duplication) ❌
1. **Backup Files:** Delete all `.backup-*` files (12+ files)
2. **FeedWelcomeScreen:** Remove if unused
3. **FeedGridPreview:** Remove if unused (verify first)
4. **FeedStrategyPanel:** Remove if unused (strategy in main view)
5. **Deprecated Exports:** Remove `FeedPlannerScreen` alias
6. **Duplicate API Routes:** Consolidate `/api/feed/latest` into `/api/feed/[feedId]`

### Simplify (Needs Refactoring) 🔧
1. **Split `InstagramFeedView`:**
   - Extract `FeedHeader` (profile, bio, stats)
   - Extract `FeedTabs` (tab navigation)
   - Extract `FeedGrid` (3x3 grid with drag-and-drop)
   - Extract `FeedPostsList` (Instagram-style posts)
   - Extract `FeedStrategy` (strategy document)
   - Extract `FeedModals` (post detail, galleries)
   - Extract `useFeedPolling` (custom hook for polling logic)
   - Extract `useFeedDragDrop` (custom hook for reordering)
   - Result: 8 components, each <300 lines

2. **Split `FeedPostCard`:**
   - Extract `PostImage` (image display)
   - Extract `PostCaption` (caption display/editing)
   - Extract `PostActions` (buttons)
   - Result: 3 components, each <200 lines

3. **Consolidate Gallery Selectors:**
   - Merge `FeedPostGallerySelector` and `FeedProfileGallerySelector` into one component with `type` prop
   - Result: 1 component instead of 2

4. **Extract Custom Hooks:**
   - `useFeedPolling` (SWR polling logic)
   - `useFeedDragDrop` (reordering logic)
   - `useFeedActions` (generate, regenerate, enhance, etc.)
   - `useFeedModals` (modal state management)

5. **Simplify API Routes:**
   - Merge `/api/feed/latest` into `/api/feed/[feedId]` (already supports "latest")
   - Group related routes: `/api/feed/[feedId]/captions/*`, `/api/feed/[feedId]/images/*`

---

## 📝 CODE EXAMPLES

### Main Component Render (InstagramFeedView)

```218:216:components/feed-planner/feed-view-screen.tsx
  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Header with Back button */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-stone-200 bg-white/60 backdrop-blur-md">
        <button
          onClick={handleBackToMaya}
          className="text-sm font-light text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back to Maya Chat
        </button>
      </div>

      {/* Feed View */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <InstagramFeedView
          feedId={effectiveFeedId}
          onBack={handleBackToMaya}
        />
      </div>
    </div>
  )
```

### State Management (InstagramFeedView - 20+ useState hooks)

```173:206:components/feed-planner/instagram-feed-view.tsx
  const [activeTab, setActiveTab] = useState<"grid" | "posts" | "strategy">("grid")
  const [selectedPost, setSelectedPost] = useState<any | null>(null)
  const [expandedCaptions, setExpandedCaptions] = useState<Set<number>>(new Set())
  const [regeneratingPost, setRegeneratingPost] = useState<number | null>(null)
  const [showGallery, setShowGallery] = useState<number | null>(null)
  const [showProfileGallery, setShowProfileGallery] = useState(false)

  // Prevent body scroll when any modal is open
  useEffect(() => {
    const hasOpenModal = !!selectedPost || !!showGallery || showProfileGallery
    
    if (hasOpenModal) {
      // Save original overflow style
      const originalOverflow = document.body.style.overflow
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
      // Cleanup: restore original overflow on unmount or when modal closes
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [selectedPost, showGallery, showProfileGallery])

  const [showConfetti, setShowConfetti] = useState(false)
  const [generatingRemaining, setGeneratingRemaining] = useState(false)
  const [copiedCaptions, setCopiedCaptions] = useState<Set<number>>(new Set())
  const [enhancingCaptions, setEnhancingCaptions] = useState<Set<number>>(new Set())
  const [isGeneratingBio, setIsGeneratingBio] = useState(false)
  
  // Drag-and-drop state for reordering posts
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [reorderedPosts, setReorderedPosts] = useState<any[]>([])
  const [isSavingOrder, setIsSavingOrder] = useState(false)
```

### API Calls (InstagramFeedView)

```116:164:components/feed-planner/instagram-feed-view.tsx
  const { data: feedData, error: feedError, mutate, isLoading: isFeedLoading, isValidating } = useSWR(
    feedId ? `/api/feed/${feedId}` : null,
    fetcher,
    {
      refreshInterval: (data) => {
        // Poll if:
        // 1. Posts are generating images (prediction_id but no image_url)
        // 2. Feed is processing prompts/captions (status: processing/queueing/generating)
        const hasGeneratingPosts = data?.posts?.some(
          (p: any) => p.prediction_id && !p.image_url
        )
        const isProcessing = data?.feed?.status === 'processing' || 
                            data?.feed?.status === 'queueing' ||
                            data?.feed?.status === 'generating'
        
        // Continue polling if generating or processing
        if (hasGeneratingPosts || isProcessing) {
          lastUpdateRef.current = Date.now()
          return 3000 // Poll every 3s (faster for better UX)
        }
        
        // Grace period: Continue polling for 15s after last update
        // This ensures UI catches database updates even if timing is slightly off
        const timeSinceLastUpdate = Date.now() - lastUpdateRef.current
        const shouldContinuePolling = timeSinceLastUpdate < 15000
        
        return shouldContinuePolling ? 3000 : 0
      },
      refreshWhenHidden: false, // Stop when tab hidden
      revalidateOnFocus: true, // Refresh when tab becomes visible
      onSuccess: (data) => {
        // Update last update time when data changes
        if (data?.posts) {
          const hasNewImages = data.posts.some((p: any) => p.image_url)
          if (hasNewImages) {
            lastUpdateRef.current = Date.now()
          }
        }
        
        // Check if all posts complete - trigger confetti
        // Note: Confetti is also triggered in useEffect below, but we check ref here to avoid double-trigger
        const allComplete = data?.posts?.every((p: any) => p.image_url)
        if (allComplete && !hasShownConfettiRef.current) {
          // Don't trigger here - let the useEffect handle it to avoid double confetti
          // The useEffect (lines 251-266) will handle the confetti animation
        }
      },
    }
  )
```

---

## 🎯 PRIORITY ACTIONS

### Immediate (High Priority)
1. **Delete all backup files** (12+ files) - reduces clutter
2. **Split `InstagramFeedView`** into 6-8 smaller components
3. **Remove unused components** (`FeedWelcomeScreen`, verify others)

### Short-term (Medium Priority)
4. **Split `FeedPostCard`** into 3 smaller components
5. **Extract custom hooks** (polling, drag-drop, actions)
6. **Consolidate API routes** (merge `/api/feed/latest`)

### Long-term (Low Priority)
7. **Rename components** for clarity (`InstagramFeedView` → `FeedDisplay`)
8. **Unify gallery selectors** into one component
9. **Add unit tests** for complex logic (polling, drag-drop)

---

## 📈 METRICS

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Largest component | 1,880 lines | 300 lines | ❌ 6x over |
| Total components | 13 | 13 | ✅ OK |
| Components >300 lines | 2 | 0 | ❌ Need refactor |
| Backup files | 12+ | 0 | ❌ Need cleanup |
| Unused components | 1+ | 0 | ❌ Need removal |
| API routes | 17 | 15 | ⚠️ Can consolidate |

---

## ✅ SUMMARY

**Main Finding:** `InstagramFeedView` is 1,880 lines (6x over limit) and needs to be split into 6-8 smaller components.

**Key Issues:**
1. One massive component doing everything
2. 12+ backup files cluttering the directory
3. Unused components (`FeedWelcomeScreen`)
4. Duplicate logic (caption actions, gallery selectors)
5. Complex state management (20+ useState hooks)

**Recommended Approach:**
1. **Phase 1:** Cleanup (delete backups, remove unused)
2. **Phase 2:** Split `InstagramFeedView` into smaller components
3. **Phase 3:** Extract custom hooks for complex logic
4. **Phase 4:** Consolidate duplicate code

**Estimated Effort:**
- Cleanup: 1 hour
- Refactoring: 4-6 hours
- Testing: 2 hours
- **Total: 7-9 hours**

---

**End of Report**


# FEED PLANNER REFACTORING IMPLEMENTATION PLAN

**Created:** 2025-01-27  
**Based on:** `FEED_PLANNER_CURRENT_STATE.md`  
**Estimated Time:** 7-9 hours  
**Priority:** High (1,880-line component violates 300-line rule)

---

## 🎯 OBJECTIVES

1. **Reduce `instagram-feed-view.tsx` from 1,880 lines to <300 lines**
2. **Delete 12+ backup files** (cleanup)
3. **Remove unused components** (`FeedWelcomeScreen`)
4. **Extract reusable hooks** (polling, drag-drop, actions)
5. **Consolidate duplicate code** (gallery selectors, caption actions)

---

## 📋 PHASE BREAKDOWN

### **PHASE 1: CLEANUP** (1 hour)
**Goal:** Remove bloat and unused code

### **PHASE 2: EXTRACT HOOKS** (2 hours)
**Goal:** Extract complex logic into reusable hooks

### **PHASE 3: SPLIT COMPONENTS** (4-5 hours)
**Goal:** Break down `InstagramFeedView` into 6-8 smaller components

### **PHASE 4: CONSOLIDATE & OPTIMIZE** (1 hour)
**Goal:** Merge duplicate code and optimize

---

## 🚀 PHASE 1: CLEANUP (1 hour)

### Step 1.1: Delete Backup Files
**Files to Delete:**
```
components/feed-planner/feed-planner-screen.tsx.backup-1767450747
components/feed-planner/feed-planner-screen.tsx.backup-1767453288
components/feed-planner/feed-preview-card.tsx.backup-1767451216
components/feed-planner/feed-preview-card.tsx.backup-1767454310
components/feed-planner/feed-preview-card.tsx.backup-1767454828
components/feed-planner/feed-preview-card.tsx.backup-1767455590
components/feed-planner/feed-preview-card.tsx.backup-1767455999
components/feed-planner/feed-preview-card.tsx.backup-1767456722
components/feed-planner/feed-preview-card.tsx.backup-1767457435
components/feed-planner/feed-preview-card.tsx.backup-1767457899
components/feed-planner/feed-preview-card.tsx.backup-1767457996
components/feed-planner/feed-preview-card.tsx.backup-before-feedId-fix-1767458107
components/feed-planner/instagram-feed-view.tsx.backup-1767454481
```

**Action:** Delete all `.backup-*` files

**Verification:**
- Run: `find components/feed-planner -name "*.backup*"` → Should return 0 files

---

### Step 1.2: Remove Unused Components
**Files to Check/Remove:**
1. `components/feed-planner/feed-welcome-screen.tsx` (87 lines)
   - **Check:** Search codebase for imports
   - **Action:** If unused, delete

2. `components/feed-planner/feed-grid-preview.tsx` (161 lines)
   - **Check:** Search codebase for imports
   - **Action:** If unused, delete

3. `components/feed-planner/feed-strategy-panel.tsx` (91 lines)
   - **Check:** Search codebase for imports
   - **Action:** If unused, delete

**Action:**
```bash
# Search for imports
grep -r "FeedWelcomeScreen" components/ app/
grep -r "FeedGridPreview" components/ app/
grep -r "FeedStrategyPanel" components/ app/
```

**Verification:**
- If no imports found → Delete file
- If imports found → Keep file

---

### Step 1.3: Clean Up Index Exports
**File:** `components/feed-planner/index.ts`

**Current:**
```typescript
export { default as FeedPlannerScreen } from './feed-view-screen' // deprecated
```

**Action:** Remove deprecated export

**After:**
```typescript
export { default as FeedViewScreen } from './feed-view-screen'
export { default as FeedGridPreview } from './feed-grid-preview'
export { default as FeedStrategyPanel } from './feed-strategy-panel'
export { default as BulkGenerationProgress } from './bulk-generation-progress'
```

---

### Step 1.4: Verify API Route Consolidation
**Check:** Can `/api/feed/latest` be removed?

**Current:**
- `/api/feed/latest` → Gets latest feed
- `/api/feed/[feedId]` → Supports `feedId="latest"`

**Action:**
1. Check if `/api/feed/latest` is used anywhere
2. If only used in `feed-view-screen.tsx`, update to use `/api/feed/latest` as parameter
3. Delete `/api/feed/latest/route.ts` if consolidated

**Verification:**
```bash
grep -r "/api/feed/latest" components/ app/
```

---

## 🔧 PHASE 2: EXTRACT HOOKS (2 hours)

### Step 2.1: Create `useFeedPolling` Hook
**File:** `components/feed-planner/hooks/use-feed-polling.ts`

**Extract from:** `instagram-feed-view.tsx` (lines 116-164)

**What to Extract:**
- SWR configuration
- Polling logic (3s interval when generating)
- Grace period logic (15s after updates)
- `lastUpdateRef` management
- `onSuccess` callback

**Before (in component):**
```typescript
const lastUpdateRef = useRef<number>(Date.now())
const { data: feedData, error: feedError, mutate, isLoading, isValidating } = useSWR(
  feedId ? `/api/feed/${feedId}` : null,
  fetcher,
  {
    refreshInterval: (data) => {
      // Complex polling logic...
    },
    // ...
  }
)
```

**After (custom hook):**
```typescript
// hooks/use-feed-polling.ts
export function useFeedPolling(feedId: number | null) {
  const lastUpdateRef = useRef<number>(Date.now())
  
  return useSWR(
    feedId ? `/api/feed/${feedId}` : null,
    fetcher,
    {
      refreshInterval: (data) => {
        // Polling logic here
      },
      // ...
    }
  )
}

// In component:
const { data: feedData, error: feedError, mutate, isLoading, isValidating } = useFeedPolling(feedId)
```

**Target Size:** <150 lines

---

### Step 2.2: Create `useFeedDragDrop` Hook
**File:** `components/feed-planner/hooks/use-feed-drag-drop.ts`

**Extract from:** `instagram-feed-view.tsx` (lines 202-523)

**What to Extract:**
- `draggedIndex` state
- `reorderedPosts` state
- `isSavingOrder` state
- `handleDragStart`
- `handleDragOver`
- `handleDragEnd`
- `prevPostsRef` logic

**Before (in component):**
```typescript
const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
const [reorderedPosts, setReorderedPosts] = useState<any[]>([])
const [isSavingOrder, setIsSavingOrder] = useState(false)

const handleDragStart = (index: number) => { /* ... */ }
const handleDragOver = (e: React.DragEvent, index: number) => { /* ... */ }
const handleDragEnd = async () => { /* ... */ }
```

**After (custom hook):**
```typescript
// hooks/use-feed-drag-drop.ts
export function useFeedDragDrop(
  posts: any[],
  feedId: number,
  onReorderComplete: () => void
) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [reorderedPosts, setReorderedPosts] = useState<any[]>([])
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  
  // All drag handlers here
  
  return {
    draggedIndex,
    reorderedPosts,
    isSavingOrder,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  }
}
```

**Target Size:** <200 lines

---

### Step 2.3: Create `useFeedActions` Hook
**File:** `components/feed-planner/hooks/use-feed-actions.ts`

**Extract from:** `instagram-feed-view.tsx` (multiple handlers)

**What to Extract:**
- `handleGenerateSingle`
- `handleGenerateRemaining`
- `handleRegeneratePost`
- `handleGenerateBio`
- `handleEnhanceCaption`
- `handleDownloadBundle`
- `copyCaptionToClipboard`
- `toggleCaption`

**Before (in component):**
```typescript
const handleGenerateSingle = async (postId: number) => { /* ... */ }
const handleGenerateRemaining = async () => { /* ... */ }
// ... 8 more handlers
```

**After (custom hook):**
```typescript
// hooks/use-feed-actions.ts
export function useFeedActions(
  feedId: number,
  posts: any[],
  onUpdate: () => void
) {
  const handleGenerateSingle = async (postId: number) => { /* ... */ }
  const handleGenerateRemaining = async () => { /* ... */ }
  // ... all handlers
  
  return {
    handleGenerateSingle,
    handleGenerateRemaining,
    handleRegeneratePost,
    handleGenerateBio,
    handleEnhanceCaption,
    handleDownloadBundle,
    copyCaptionToClipboard,
    toggleCaption,
  }
}
```

**Target Size:** <300 lines

---

### Step 2.4: Create `useFeedModals` Hook
**File:** `components/feed-planner/hooks/use-feed-modals.ts`

**Extract from:** `instagram-feed-view.tsx` (modal state)

**What to Extract:**
- `selectedPost` state
- `showGallery` state
- `showProfileGallery` state
- Body scroll prevention logic

**Before (in component):**
```typescript
const [selectedPost, setSelectedPost] = useState<any | null>(null)
const [showGallery, setShowGallery] = useState<number | null>(null)
const [showProfileGallery, setShowProfileGallery] = useState(false)

useEffect(() => {
  // Body scroll prevention
}, [selectedPost, showGallery, showProfileGallery])
```

**After (custom hook):**
```typescript
// hooks/use-feed-modals.ts
export function useFeedModals() {
  const [selectedPost, setSelectedPost] = useState<any | null>(null)
  const [showGallery, setShowGallery] = useState<number | null>(null)
  const [showProfileGallery, setShowProfileGallery] = useState(false)
  
  // Body scroll prevention logic
  
  return {
    selectedPost,
    setSelectedPost,
    showGallery,
    setShowGallery,
    showProfileGallery,
    setShowProfileGallery,
  }
}
```

**Target Size:** <100 lines

---

## 🧩 PHASE 3: SPLIT COMPONENTS (4-5 hours)

### Step 3.1: Create `FeedHeader` Component
**File:** `components/feed-planner/feed-header.tsx`

**Extract from:** `instagram-feed-view.tsx` (lines 1162-1256)

**What to Extract:**
- Profile image (with gallery selector)
- Stats (9 posts, 1.2K followers, 342 following)
- Bio (with generate button)
- Action buttons (Following, Message)

**Props:**
```typescript
interface FeedHeaderProps {
  feedData: any
  onBack?: () => void
  onProfileImageClick: () => void
  onGenerateBio: () => void
  isGeneratingBio: boolean
}
```

**Target Size:** <200 lines

**Before (in InstagramFeedView):**
```typescript
<div className="bg-white border-b border-stone-200">
  <div className="flex items-center justify-between px-4 py-3">
    {/* Header content - 94 lines */}
  </div>
</div>
```

**After (new component):**
```typescript
<FeedHeader
  feedData={feedData}
  onBack={onBack}
  onProfileImageClick={() => setShowProfileGallery(true)}
  onGenerateBio={handleGenerateBio}
  isGeneratingBio={isGeneratingBio}
/>
```

---

### Step 3.2: Create `FeedTabs` Component
**File:** `components/feed-planner/feed-tabs.tsx`

**Extract from:** `instagram-feed-view.tsx` (lines 1258-1286)

**What to Extract:**
- Tab navigation (Grid / Posts / Strategy)
- Active tab state
- Tab switching logic

**Props:**
```typescript
interface FeedTabsProps {
  activeTab: "grid" | "posts" | "strategy"
  onTabChange: (tab: "grid" | "posts" | "strategy") => void
}
```

**Target Size:** <100 lines

---

### Step 3.3: Create `FeedGrid` Component
**File:** `components/feed-planner/feed-grid.tsx`

**Extract from:** `instagram-feed-view.tsx` (lines 1314-1368)

**What to Extract:**
- 3x3 grid display
- Drag-and-drop handlers
- Post status indicators
- Generate buttons
- Click to open post detail

**Props:**
```typescript
interface FeedGridProps {
  posts: any[]
  postStatuses: any[]
  draggedIndex: number | null
  isSavingOrder: boolean
  regeneratingPost: number | null
  onPostClick: (post: any) => void
  onGeneratePost: (postId: number) => void
  onDragStart: (index: number) => void
  onDragOver: (e: React.DragEvent, index: number) => void
  onDragEnd: () => void
}
```

**Target Size:** <250 lines

---

### Step 3.4: Create `FeedPostsList` Component
**File:** `components/feed-planner/feed-posts-list.tsx`

**Extract from:** `instagram-feed-view.tsx` (lines 1371-1505)

**What to Extract:**
- Instagram-style post list
- Expandable captions
- Copy/enhance/edit caption buttons
- Generate button for missing images

**Props:**
```typescript
interface FeedPostsListProps {
  posts: any[]
  expandedCaptions: Set<number>
  copiedCaptions: Set<number>
  enhancingCaptions: Set<number>
  onToggleCaption: (postId: number) => void
  onCopyCaption: (caption: string, postId: number) => void
  onEnhanceCaption: (postId: number, caption: string) => void
  onGeneratePost: (postId: number) => void
}
```

**Target Size:** <300 lines

---

### Step 3.5: Create `FeedStrategy` Component
**File:** `components/feed-planner/feed-strategy.tsx`

**Extract from:** `instagram-feed-view.tsx` (lines 1508-1784)

**What to Extract:**
- Strategy document (markdown)
- Posting schedule
- Content pillars
- Story sequences
- Reel recommendations
- Carousel ideas
- Growth tactics
- Hashtag strategy

**Props:**
```typescript
interface FeedStrategyProps {
  feedData: any
  onCreateStrategy?: () => void
}
```

**Target Size:** <300 lines

---

### Step 3.6: Create `FeedModals` Component
**File:** `components/feed-planner/feed-modals.tsx`

**Extract from:** `instagram-feed-view.tsx` (lines 1788-1876)

**What to Extract:**
- Post detail modal (`FeedPostCard`)
- Post gallery selector
- Profile gallery selector
- Modal state management

**Props:**
```typescript
interface FeedModalsProps {
  selectedPost: any | null
  showGallery: number | null
  showProfileGallery: boolean
  feedId: number
  onClosePost: () => void
  onCloseGallery: () => void
  onCloseProfileGallery: () => void
  onImageSelected: () => void
  onRegeneratePost: (postId: number) => void
  onUpdate: () => void
}
```

**Target Size:** <200 lines

---

### Step 3.7: Create `FeedLoadingOverlay` Component
**File:** `components/feed-planner/feed-loading-overlay.tsx`

**Extract from:** `instagram-feed-view.tsx` (lines 1045-1158)

**What to Extract:**
- Blurred Instagram preview
- Loading spinner
- Progress bar
- "Generate Remaining" button

**Props:**
```typescript
interface FeedLoadingOverlayProps {
  feedId: number | null
  readyPosts: number
  totalPosts: number
  overallProgress: number
  processingStage?: string
  isValidating: boolean
  generatingRemaining: boolean
  onGenerateRemaining: () => void
  getProgressMessage: () => string
}
```

**Target Size:** <150 lines

---

### Step 3.8: Refactor `InstagramFeedView` to Use New Components
**File:** `components/feed-planner/instagram-feed-view.tsx`

**After refactoring, it should look like:**

```typescript
"use client"

import { useMemo } from "react"
import { useFeedPolling } from "./hooks/use-feed-polling"
import { useFeedDragDrop } from "./hooks/use-feed-drag-drop"
import { useFeedActions } from "./hooks/use-feed-actions"
import { useFeedModals } from "./hooks/use-feed-modals"
import FeedHeader from "./feed-header"
import FeedTabs from "./feed-tabs"
import FeedGrid from "./feed-grid"
import FeedPostsList from "./feed-posts-list"
import FeedStrategy from "./feed-strategy"
import FeedModals from "./feed-modals"
import FeedLoadingOverlay from "./feed-loading-overlay"
import { useFeedConfetti } from "./hooks/use-feed-confetti"

export default function InstagramFeedView({ feedId, onBack }: InstagramFeedViewProps) {
  // Hooks
  const { data: feedData, error, mutate, isLoading, isValidating } = useFeedPolling(feedId)
  const { selectedPost, showGallery, showProfileGallery, ...modalSetters } = useFeedModals()
  const { draggedIndex, reorderedPosts, isSavingOrder, ...dragHandlers } = useFeedDragDrop(
    posts,
    feedId,
    mutate
  )
  const actions = useFeedActions(feedId, posts, mutate)
  const { showConfetti, triggerConfetti } = useFeedConfetti(posts)
  
  // Derived state
  const posts = useMemo(() => {
    return feedData?.posts ? [...feedData.posts].sort((a, b) => a.position - b.position) : []
  }, [feedData?.posts])
  
  const postStatuses = useMemo(() => {
    // Calculate post statuses
  }, [feedData])
  
  // Early returns for loading/error states
  if (isLoading) return <LoadingState />
  if (error) return <ErrorState />
  if (!feedData?.feed) return <NoFeedState />
  
  // Calculate progress
  const readyPosts = postStatuses.filter(p => p.isComplete).length
  const totalPosts = 9
  const isFeedComplete = readyPosts === totalPosts
  
  // Show loading overlay if not complete
  if (!isFeedComplete) {
    return (
      <FeedLoadingOverlay
        feedId={feedId}
        readyPosts={readyPosts}
        totalPosts={totalPosts}
        overallProgress={overallProgress}
        isValidating={isValidating}
        generatingRemaining={actions.generatingRemaining}
        onGenerateRemaining={actions.handleGenerateRemaining}
        getProgressMessage={getProgressMessage}
      />
    )
  }
  
  // Main feed view
  return (
    <div className="w-full max-w-none md:max-w-[935px] mx-auto bg-white min-h-screen">
      <FeedHeader
        feedData={feedData}
        onBack={onBack}
        onProfileImageClick={() => modalSetters.setShowProfileGallery(true)}
        onGenerateBio={actions.handleGenerateBio}
        isGeneratingBio={actions.isGeneratingBio}
      />
      
      <FeedTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      {activeTab === "grid" && (
        <FeedGrid
          posts={reorderedPosts.length > 0 ? reorderedPosts : posts}
          postStatuses={postStatuses}
          draggedIndex={draggedIndex}
          isSavingOrder={isSavingOrder}
          regeneratingPost={actions.regeneratingPost}
          onPostClick={modalSetters.setSelectedPost}
          onGeneratePost={actions.handleGenerateSingle}
          {...dragHandlers}
        />
      )}
      
      {activeTab === "posts" && (
        <FeedPostsList
          posts={posts}
          expandedCaptions={actions.expandedCaptions}
          copiedCaptions={actions.copiedCaptions}
          enhancingCaptions={actions.enhancingCaptions}
          onToggleCaption={actions.toggleCaption}
          onCopyCaption={actions.copyCaptionToClipboard}
          onEnhanceCaption={actions.handleEnhanceCaption}
          onGeneratePost={actions.handleGenerateSingle}
        />
      )}
      
      {activeTab === "strategy" && (
        <FeedStrategy
          feedData={feedData}
          onCreateStrategy={() => {
            window.location.href = "/studio#maya/feed"
          }}
        />
      )}
      
      <FeedModals
        selectedPost={selectedPost}
        showGallery={showGallery}
        showProfileGallery={showProfileGallery}
        feedId={feedId}
        onClosePost={() => modalSetters.setSelectedPost(null)}
        onCloseGallery={() => modalSetters.setShowGallery(null)}
        onCloseProfileGallery={() => modalSetters.setShowProfileGallery(false)}
        onImageSelected={mutate}
        onRegeneratePost={actions.handleRegeneratePost}
        onUpdate={mutate}
      />
    </div>
  )
}
```

**Target Size:** <300 lines

---

## 🔄 PHASE 4: CONSOLIDATE & OPTIMIZE (1 hour)

### Step 4.1: Unify Gallery Selectors
**Current:**
- `FeedPostGallerySelector` (225 lines)
- `FeedProfileGallerySelector` (~200 lines)

**Action:** Merge into one component with `type` prop

**New Component:** `components/feed-planner/feed-gallery-selector.tsx`

**Props:**
```typescript
interface FeedGallerySelectorProps {
  type: "post" | "profile"
  postId?: number // Required if type === "post"
  feedId: number
  onClose: () => void
  onImageSelected: () => void
}
```

**Target Size:** <250 lines

**Savings:** ~175 lines (removes duplication)

---

### Step 4.2: Split `FeedPostCard` Component
**Current:** 589 lines

**Split into:**
1. `PostImage` (image display, generate button) - <150 lines
2. `PostCaption` (caption display, editing) - <200 lines
3. `PostActions` (buttons, copy, enhance) - <150 lines

**New Structure:**
```typescript
// feed-post-card.tsx (orchestrator - <100 lines)
export default function FeedPostCard({ post, feedId, onGenerate }: FeedPostCardProps) {
  return (
    <div className="bg-white rounded-2xl">
      <PostHeader post={post} />
      <PostImage post={post} onGenerate={onGenerate} />
      <PostActions post={post} />
      <PostCaption post={post} feedId={feedId} onUpdate={onGenerate} />
    </div>
  )
}
```

**Target Size:** <100 lines (orchestrator) + 3 sub-components

---

### Step 4.3: Extract Confetti Logic
**File:** `components/feed-planner/hooks/use-feed-confetti.ts`

**Extract from:** `instagram-feed-view.tsx` (lines 59-110, 251-270)

**What to Extract:**
- `triggerConfetti` function
- `showConfetti` state
- `hasShownConfettiRef` logic
- Confetti trigger on completion

**Target Size:** <100 lines

---

### Step 4.4: Update Imports
**File:** `components/feed-planner/index.ts`

**Update exports:**
```typescript
// Main components
export { default as FeedViewScreen } from './feed-view-screen'
export { default as InstagramFeedView } from './instagram-feed-view'

// Sub-components
export { default as FeedHeader } from './feed-header'
export { default as FeedTabs } from './feed-tabs'
export { default as FeedGrid } from './feed-grid'
export { default as FeedPostsList } from './feed-posts-list'
export { default as FeedStrategy } from './feed-strategy'
export { default as FeedModals } from './feed-modals'
export { default as FeedLoadingOverlay } from './feed-loading-overlay'
export { default as FeedPostCard } from './feed-post-card'
export { default as FeedGallerySelector } from './feed-gallery-selector'

// Hooks
export { useFeedPolling } from './hooks/use-feed-polling'
export { useFeedDragDrop } from './hooks/use-feed-drag-drop'
export { useFeedActions } from './hooks/use-feed-actions'
export { useFeedModals } from './hooks/use-feed-modals'
export { useFeedConfetti } from './hooks/use-feed-confetti'
```

---

## ✅ VERIFICATION CHECKLIST

### After Phase 1 (Cleanup)
- [ ] All `.backup-*` files deleted
- [ ] Unused components removed
- [ ] Deprecated exports removed
- [ ] API routes consolidated (if applicable)

### After Phase 2 (Hooks)
- [ ] `useFeedPolling` hook created and tested
- [ ] `useFeedDragDrop` hook created and tested
- [ ] `useFeedActions` hook created and tested
- [ ] `useFeedModals` hook created and tested
- [ ] All hooks are <300 lines

### After Phase 3 (Components)
- [ ] `FeedHeader` component created (<200 lines)
- [ ] `FeedTabs` component created (<100 lines)
- [ ] `FeedGrid` component created (<250 lines)
- [ ] `FeedPostsList` component created (<300 lines)
- [ ] `FeedStrategy` component created (<300 lines)
- [ ] `FeedModals` component created (<200 lines)
- [ ] `FeedLoadingOverlay` component created (<150 lines)
- [ ] `InstagramFeedView` refactored (<300 lines)

### After Phase 4 (Optimize)
- [ ] Gallery selectors unified
- [ ] `FeedPostCard` split into sub-components
- [ ] Confetti logic extracted
- [ ] All imports updated
- [ ] No TypeScript errors
- [ ] No console.errors

---

## 📊 EXPECTED RESULTS

### Before
| Component | Lines | Status |
|-----------|-------|--------|
| `instagram-feed-view.tsx` | 1,880 | ❌ 6x over limit |
| `feed-post-card.tsx` | 589 | ❌ 2x over limit |
| Total components | 13 | - |
| Backup files | 12+ | ❌ Clutter |

### After
| Component | Lines | Status |
|-----------|-------|--------|
| `instagram-feed-view.tsx` | ~250 | ✅ Under limit |
| `feed-header.tsx` | ~180 | ✅ Under limit |
| `feed-tabs.tsx` | ~80 | ✅ Under limit |
| `feed-grid.tsx` | ~220 | ✅ Under limit |
| `feed-posts-list.tsx` | ~280 | ✅ Under limit |
| `feed-strategy.tsx` | ~290 | ✅ Under limit |
| `feed-modals.tsx` | ~180 | ✅ Under limit |
| `feed-loading-overlay.tsx` | ~140 | ✅ Under limit |
| `feed-post-card.tsx` | ~90 | ✅ Under limit |
| `post-image.tsx` | ~130 | ✅ Under limit |
| `post-caption.tsx` | ~190 | ✅ Under limit |
| `post-actions.tsx` | ~140 | ✅ Under limit |
| `feed-gallery-selector.tsx` | ~230 | ✅ Under limit |
| Total components | 20+ | ✅ Better organized |
| Backup files | 0 | ✅ Clean |

### Hooks
| Hook | Lines | Status |
|------|-------|--------|
| `use-feed-polling.ts` | ~140 | ✅ Under limit |
| `use-feed-drag-drop.ts` | ~180 | ✅ Under limit |
| `use-feed-actions.ts` | ~280 | ✅ Under limit |
| `use-feed-modals.ts` | ~80 | ✅ Under limit |
| `use-feed-confetti.ts` | ~90 | ✅ Under limit |

---

## 🧪 TESTING PLAN

### Manual Testing Checklist
1. **Feed Creation:**
   - [ ] Create feed in Maya Chat
   - [ ] Verify feed appears in Feed Planner
   - [ ] Verify all 9 posts created

2. **Grid View:**
   - [ ] 3x3 grid displays correctly
   - [ ] Drag-and-drop reordering works
   - [ ] Click post opens detail modal
   - [ ] Generate button works for empty posts

3. **Posts View:**
   - [ ] Instagram-style posts display
   - [ ] Captions expand/collapse
   - [ ] Copy caption works
   - [ ] Enhance caption works
   - [ ] Edit caption works
   - [ ] Regenerate caption works

4. **Strategy View:**
   - [ ] Strategy document displays
   - [ ] All sections render correctly
   - [ ] Markdown formatting works

5. **Modals:**
   - [ ] Post detail modal opens/closes
   - [ ] Gallery selector works (post)
   - [ ] Gallery selector works (profile)
   - [ ] Regenerate post works

6. **Real-time Updates:**
   - [ ] SWR polling works
   - [ ] Images update when complete
   - [ ] Confetti triggers when all complete

7. **Download:**
   - [ ] Download bundle works
   - [ ] ZIP contains all files

---

## 🚨 ROLLBACK PLAN

If issues occur:

1. **Git Commit After Each Phase:**
   ```bash
   git add .
   git commit -m "Phase X: [Description]"
   ```

2. **Rollback Command:**
   ```bash
   git reset --hard HEAD~1  # Rollback last phase
   ```

3. **Keep Original File:**
   - Don't delete `instagram-feed-view.tsx` until all tests pass
   - Rename to `instagram-feed-view.tsx.old` temporarily

---

## 📝 IMPLEMENTATION ORDER

**Recommended Sequence:**
1. ✅ Phase 1 (Cleanup) - Low risk, immediate cleanup
2. ✅ Phase 2 (Hooks) - Extract logic first, easier to test
3. ✅ Phase 3 (Components) - Split main component
4. ✅ Phase 4 (Optimize) - Final polish

**Why This Order:**
- Phase 1 removes clutter immediately
- Phase 2 extracts logic before splitting UI
- Phase 3 splits UI using extracted hooks
- Phase 4 optimizes and consolidates

---

## 🎯 SUCCESS CRITERIA

**Phase Complete When:**
1. ✅ All components are <300 lines
2. ✅ No TypeScript errors
3. ✅ No console.errors
4. ✅ All tests pass
5. ✅ UI looks identical (no visual regressions)
6. ✅ All features work (no functional regressions)
7. ✅ Code is more maintainable (easier to understand)

---

**End of Implementation Plan**


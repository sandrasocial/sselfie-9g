# Feed Cards Persistence & Display Audit

## Executive Summary
This audit examines how feed cards are loaded, saved, and displayed in the UI, with focus on persistence of images and captions after page refresh.

---

## 1. HOW FEED CARDS ARE LOADED FROM DATABASE

### 1.1 Database Storage
- **Primary Column**: `feed_cards` (JSONB) in `maya_chat_messages` table
- **Fallback Column**: `styling_details` (for backward compatibility)
- **Pattern**: Matches `concept_cards` column pattern for consistency

### 1.2 Loading Flow (`app/api/maya/load-chat/route.ts`)

**Step 1: Read from Database**
```typescript
// Lines 116-152: Read feed_cards column first, fallback to styling_details
let feedCards = msg.feed_cards || msg.styling_details
```

**Step 2: Process Feed Cards**
- **If feed card has `feedId`**: Fetch fresh data from `feed_layouts` and `feed_posts` tables (lines 237-330)
- **If feed card has NO `feedId`**: Use cached data from `feed_cards` column (lines 332-346)
- **If feed card missing `feedId` but feed exists**: Try to match by finding most recent feed with images (lines 215-235)

**Step 3: Format for UI**
- Creates `tool-generateFeed` parts in message
- Includes: `feedId`, `title`, `description`, `posts` (with `image_url`, `caption`, `prompt`)

### 1.3 Issues Found

#### ❌ ISSUE 1: Feed Cards Only Loaded When Message Has Concept Cards
**Location**: `app/api/maya/load-chat/route.ts:164`
- Feed cards are processed INSIDE the `if (msg.concept_cards)` block
- Messages with ONLY feed cards (no concept cards) are handled separately (lines 513-637)
- **Status**: ✅ FIXED - Separate handling exists for messages without concept cards

#### ⚠️ ISSUE 2: Complex Fallback Logic
**Location**: `app/api/maya/load-chat/route.ts:211-235`
- If `feedId` is missing, tries to find "most recent feed with images"
- This is a guess - might match wrong feed
- **Risk**: Low (only affects old feeds created before `feedId` was saved)

#### ⚠️ ISSUE 3: Duplicate Feed Card Detection
**Location**: `app/api/maya/load-chat/route.ts:201-209`
- Checks for existing feed card parts to avoid duplicates
- Logic is complex: matches by `feedId` OR by absence of `feedId`
- **Risk**: Medium (could miss duplicates if logic is wrong)

---

## 2. HOW "SAVE FEED" BUTTON WORKS

### 2.1 Two Save Actions

#### A. "Save Feed" Button (Unsaved Feeds)
**Location**: `components/feed-planner/feed-preview-card.tsx:483-563`
- **Trigger**: User clicks "Save Feed" on unsaved feed card
- **Flow**:
  1. Calls `createFeedFromStrategyHandler()` with `saveToPlanner: true`
  2. Creates feed in `feed_layouts` table
  3. Creates posts in `feed_posts` table
  4. Updates `savedFeedId` state
  5. Calls `onSave()` callback to update parent (message part)
  6. **Does NOT redirect** - stays in chat

#### B. "Save to Planner" Button (Saved Feeds)
**Location**: `components/feed-planner/feed-preview-card.tsx:433-480`
- **Trigger**: User clicks "Save to Planner" on saved feed card
- **Flow**:
  1. Calls `/api/feed-planner/save-to-planner` with `feedId`
  2. Updates feed status in database
  3. Updates local `feedStatus` state
  4. Shows toast notification
  5. **Does NOT redirect** - stays in chat

### 2.2 Issues Found

#### ❌ ISSUE 4: Two Different Save Mechanisms
- `handleSaveFeed()` - for unsaved feeds (creates new feed)
- `handleSaveToPlanner()` - for saved feeds (adds to planner)
- **Complexity**: Two separate functions doing similar things
- **Opportunity**: Could be unified into one function with conditional logic

#### ⚠️ ISSUE 5: Save State Management
**Location**: `components/feed-planner/feed-preview-card.tsx:73-82`
- Uses `savedFeedId` state + `feedIdProp` prop
- Computes `isSaved` from both
- **Complexity**: Multiple sources of truth for "is saved" state
- **Risk**: Medium (could get out of sync)

---

## 3. HOW IMAGES & CAPTIONS PERSIST ON PAGE REFRESH

### 3.1 Image Persistence

#### Database Storage
- **Location**: `feed_posts.image_url` column (permanent Blob storage URL)
- **Upload Flow**: 
  1. Replicate generates image → temporary URL
  2. Image uploaded to Blob storage → permanent URL
  3. `image_url` saved to `feed_posts` table
  4. **Status**: ✅ Images persist correctly

#### Loading on Page Refresh
**Location**: `components/feed-planner/feed-preview-card.tsx:157-299`
- **Trigger**: `needsRestore` prop = true OR `posts` prop is empty
- **Flow**:
  1. Fetches `/api/feed/${feedId}` 
  2. Gets fresh data including `image_url` for each post
  3. Updates `postsData` state with images
  4. **Status**: ✅ Images load correctly on refresh

### 3.2 Caption Persistence

#### Database Storage
- **Location**: `feed_posts.caption` column
- **Status**: ✅ Captions persist correctly

#### Loading on Page Refresh
- Same flow as images (fetched from `/api/feed/${feedId}`)
- **Status**: ✅ Captions load correctly on refresh

### 3.3 Issues Found

#### ⚠️ ISSUE 6: Polling Logic Complexity
**Location**: `components/feed-planner/feed-preview-card.tsx:353-415`
- Polls `/api/feed/${feedId}` every 3 seconds while images are generating
- Stops when all images are completed
- **Complexity**: Multiple conditions for when to poll/stop
- **Risk**: Low (works correctly, but complex)

#### ⚠️ ISSUE 7: Fetch Flag Management
**Location**: `components/feed-planner/feed-preview-card.tsx:121-132`
- Uses `hasFetchedRef` to prevent duplicate fetches
- Tracks by `feedId-needsRestore` combination
- **Complexity**: String-based key tracking
- **Risk**: Low (works, but could be simpler)

---

## 4. CONFLICTS & OVER-COMPLEXITY

### 4.1 Multiple Data Sources

#### Problem
Feed cards can get data from:
1. **Props** (`posts`, `feedTitle`, `feedDescription`)
2. **Database fetch** (`/api/feed/${feedId}`)
3. **Strategy object** (for unsaved feeds)
4. **Cached data** (from `feed_cards` column)

#### Impact
- Props might be stale (no images)
- Database fetch might override props
- Strategy posts used for unsaved feeds
- Cached data used as fallback

#### Location
- `components/feed-planner/feed-preview-card.tsx:304-320` - `effectivePosts` logic
- `components/feed-planner/feed-preview-card.tsx:144-153` - Props update logic

### 4.2 State Management Complexity

#### Multiple State Variables
- `savedFeedId` - tracks saved feed ID
- `feedIdProp` - prop from parent
- `isSaved` - computed from both
- `postsData` - local posts state
- `displayTitle` - local title state
- `displayDescription` - local description state
- `feedStatus` - feed status state
- `justSavedRef` - ref to track just-saved state

#### Impact
- Hard to track which state is "source of truth"
- Multiple `useEffect` hooks updating state
- Risk of stale state or race conditions

### 4.3 Fetch/Polling Logic

#### Multiple Fetch Mechanisms
1. **Initial fetch** - when `needsRestore` is true (lines 157-299)
2. **Polling** - while images are generating (lines 353-415)
3. **Manual refresh** - after save/generate actions (lines 714-730)

#### Impact
- Three different places fetching same data
- Could cause duplicate requests
- Hard to debug which fetch is updating state

---

## 5. SIMPLIFICATION OPPORTUNITIES

### 5.1 Unify Save Functions
**Current**: Two separate functions (`handleSaveFeed`, `handleSaveToPlanner`)
**Proposed**: One function with conditional logic
```typescript
const handleSave = async (saveToPlanner: boolean) => {
  if (!feedId) {
    // Create new feed
  } else {
    // Save to planner
  }
}
```

### 5.2 Simplify State Management
**Current**: Multiple state variables + computed values
**Proposed**: Single source of truth
- Use `feedId` as primary key
- Fetch all data from database when `feedId` exists
- Only use props for unsaved feeds (no `feedId`)

### 5.3 Consolidate Fetch Logic
**Current**: Three separate fetch mechanisms
**Proposed**: Single hook or function
- `useFeedData(feedId)` hook that handles:
  - Initial fetch
  - Polling while generating
  - Manual refresh
  - Returns: `{ feed, posts, isLoading, error }`

### 5.4 Simplify Feed Card Loading
**Current**: Complex fallback logic in `load-chat/route.ts`
**Proposed**: 
- Always require `feedId` for saved feeds
- Remove "find most recent feed" fallback
- Use cached data only for unsaved feeds

---

## 6. MISSING PIECES

### 6.1 Feed Card Update After Save
**Status**: ✅ EXISTS
- `onSave()` callback updates parent component
- Parent updates message part with new `feedId`
- **Location**: `components/feed-planner/feed-preview-card.tsx:540-542`

### 6.2 Feed Card Persistence in Chat
**Status**: ⚠️ PARTIAL
- Feed cards saved to `feed_cards` column when message gets ID
- **Issue**: Auto-save effect might not trigger if message never gets ID
- **Location**: `components/sselfie/maya/maya-feed-tab.tsx:315-389`

### 6.3 Image Generation Status
**Status**: ✅ EXISTS
- Polling updates `generation_status` in real-time
- Shows loading spinners for generating posts
- **Location**: `components/feed-planner/feed-preview-card.tsx:353-415`

---

## 7. COMPARISON WITH CONCEPT CARDS

### 7.1 Similarities
- Both use dedicated columns (`concept_cards`, `feed_cards`)
- Both have fallback to `styling_details`
- Both fetch fresh data when `id` exists
- Both use polling for generation status

### 7.2 Differences
- **Concept cards**: Simpler (single card per message)
- **Feed cards**: More complex (multiple posts, images, captions)
- **Concept cards**: No "save" action (always saved)
- **Feed cards**: Two save actions (save feed, save to planner)

### 7.3 Lessons Learned
- Concept cards are simpler because they're always saved
- Feed cards complexity comes from "unsaved" state
- Could simplify by always saving feed immediately (like concepts)

---

## 8. RECOMMENDATIONS

### Priority 1: High Impact, Low Effort
1. **Unify save functions** - Reduce code duplication
2. **Simplify state management** - Single source of truth
3. **Remove "find most recent feed" fallback** - Always require `feedId`

### Priority 2: Medium Impact, Medium Effort
4. **Create `useFeedData` hook** - Consolidate fetch logic
5. **Simplify feed card loading** - Remove complex fallbacks
6. **Add error boundaries** - Better error handling

### Priority 3: Low Impact, High Effort
7. **Refactor to always save immediately** - Like concept cards
8. **Add unit tests** - Test persistence logic
9. **Add E2E tests** - Test full save/load flow

---

## 9. CONCLUSION

### What Works Well ✅
- Images and captions persist correctly on page refresh
- Feed cards load from database with fresh data
- Polling updates images in real-time
- Save buttons work correctly

### What Needs Improvement ⚠️
- Complex state management (multiple sources of truth)
- Multiple fetch mechanisms (could be unified)
- Complex fallback logic (could be simplified)
- Two separate save functions (could be unified)

### Overall Assessment
**Status**: ✅ **WORKING** but **OVER-ENGINEERED**
- Feed cards persist correctly
- Images and captions show after refresh
- Save buttons work
- **But**: Code is complex and could be simplified

**Recommendation**: Start with Priority 1 simplifications to reduce complexity without breaking functionality.


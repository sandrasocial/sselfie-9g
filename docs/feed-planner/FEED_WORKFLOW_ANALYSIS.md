# Feed Preview Card & Workflow Analysis

## Issues Found & Fixed

### 1. ✅ FeedPreviewCard Data Structure Inconsistency (FIXED)

**Issue:**
- `FeedPreviewCard` was polling `/api/feed/${feedId}` and expecting `data.feed.posts`
- But the API returns `data.posts` at the root level (not nested)
- This caused the grid to show "0/0" and appear empty

**Fix:**
- Updated polling logic to check `data.posts` first (correct structure)
- Added fallback to `data.feed.posts` for backward compatibility
- Matches the fix already applied in `maya-chat-screen.tsx` when creating the feed card

**Files Changed:**
- `components/feed-planner/feed-preview-card.tsx`

---

### 2. ✅ Concept Cards vs Feed Cards Conflict (FIXED)

**Issue:**
- Personality file has "CONCEPT CARDS" section that doesn't check for Feed tab context
- Users in Feed tab asking for "images" or "concepts" could trigger concept card generation instead of feed workflow
- Feed Planner Workflow section says "ALWAYS prioritize feed creation" but it's buried in the workflow section

**Fix:**
- Updated "CONCEPT CARDS" section to explicitly state "Photos tab only" and redirect to feed workflow if in Feed tab
- This ensures clear priority: Feed tab → Feed workflow, Photos tab → Concept cards

**Files Changed:**
- `lib/maya/personality.ts`

---

### 3. ✅ Feed Context Verification (VERIFIED)

**Status:** Already correct

The feed context addon (`lib/maya/feed-planner-context.ts`) properly:
- States "Use [CREATE_FEED_STRATEGY] trigger when user approves strategy (NOT [GENERATE_CONCEPTS])"
- Provides visual grid design guidance
- Handles mode selection (pro/classic/auto-detect)
- Is correctly applied when `isFeedTab === true` in `/api/maya/chat/route.ts`

---

## Workflow Summary

### Feed Tab Workflow (when `activeTab === "feed"`):

1. **User asks for feed** → Maya follows "Feed Planner Workflow" section
2. **Maya generates strategy** → Presents conversationally, asks for approval
3. **User approves** → Maya outputs `[CREATE_FEED_STRATEGY: {...}]` trigger
4. **Frontend detects trigger** → Calls `createFeedFromStrategy()`
5. **API creates feed** → Returns `feedLayoutId`
6. **Frontend fetches feed data** → Adds `tool-generateFeed` part to message
7. **FeedPreviewCard renders** → Shows 3x3 grid with progress indicator
8. **User clicks "View Full Feed"** → Routes to `/feed-planner?feedId=${feedId}`

### Photos Tab Workflow (when `activeTab === "photos"`):

1. **User asks for images/concepts** → Maya follows "CONCEPT CARDS" section
2. **Maya responds warmly** → Uses user's exact words
3. **Maya outputs `[GENERATE_CONCEPTS]` trigger** → Creates concept cards
4. **Concept cards render** → Individual image generation cards

---

## Data Structure Reference

### API Response Structure (`/api/feed/${feedId}`):

```typescript
{
  feed: {
    id: number
    brand_name: string
    description: string
    gridPattern?: string
    visual_rhythm?: string
    // ... other feed fields
  },
  posts: Array<{
    id: number
    position: number
    image_url: string | null
    generation_status: string
    prompt?: string
    // ... other post fields
  }>,
  bio: {...},
  highlights: [...]
}
```

**Key Point:** `posts` is at the **root level**, NOT nested in `feed.posts`

### FeedPreviewCard Props:

```typescript
{
  feedId: number
  feedTitle?: string  // Uses feed.brand_name or "Instagram Feed"
  feedDescription?: string  // Uses feed.description or feed.gridPattern
  posts: FeedPost[]  // Array of posts from data.posts
}
```

---

## Testing Checklist

- [ ] Feed tab: User asks "create a feed" → Should trigger feed workflow
- [ ] Feed tab: User asks "create images" → Should redirect to feed workflow (not concept cards)
- [ ] Photos tab: User asks "create images" → Should trigger concept cards
- [ ] Feed creation: FeedPreviewCard shows correct posts count (not 0/0)
- [ ] Feed creation: FeedPreviewCard polls and updates as images generate
- [ ] Feed creation: "View Full Feed" button routes correctly
- [ ] Feed context: Maya uses feed workflow instructions when `isFeedTab === true`

# Feed Planner Simplified Plan - Progressive Enhancement Approach

**Date:** 2025-01-30  
**Status:** 🟢 Ready to Implement  
**Goal:** Simplify feed planner with progressive enhancement - images first, then optional captions and strategy via Maya chat

---

## 🎯 Core Insight

**Progressive Enhancement Approach:**
1. **Images First** - Maya creates feed with images immediately (fast feedback)
2. **Captions Optional** - User clicks "Create Captions" → Caption cards appear in chat → User approves → Added to feed
3. **Strategy Optional** - User clicks "Create Strategy" → Strategy card appears in chat → User approves → Added to feed

**Benefits:**
- Faster initial feedback (images appear in 30-60 seconds)
- More flexible (users choose what to create)
- Better UX (preview before adding)
- Modular (each piece is independent)
- Better error handling (failures don't break everything)

---

## ✅ What We Already Have (That Works!)

### 1. Maya Chat Infrastructure ✅
- `useMayaChat` hook - handles chat state, persistence, streaming
- `MayaChatInterface` - displays messages, streaming
- `MayaUnifiedInput` - input with send, image upload
- `/api/maya/chat` - handles AI SDK streaming
- Trigger detection pattern: `[GENERATE_CONCEPTS]` → works perfectly

### 2. Feed Creation APIs ✅
- `/api/feed-planner/create-from-strategy` - creates feed from Maya's strategy JSON
- `/api/feed/[feedId]` - gets feed data
- InstagramFeedView - displays feed (works, just needs captions/strategy display fixed)

### 3. Maya's Capabilities ✅
- Can create strategies (personality.ts already has Feed Planner workflow)
- Can create captions (caption-writer.ts)
- Can create prompts (visual-composition-expert.ts)
- Trigger system works (`[CREATE_FEED_STRATEGY]`)

---

## 🚀 Simplified Approach

### Current (Complex) Flow:
```
User → Feed Planner Screen → Chat with Maya → Strategy Preview → Approve → Create Feed → View Feed
```
**Problems:**
- Separate screen for chat
- Strategy preview component adds complexity
- Multiple state transitions
- Confusing navigation
- Too many steps

### New (Simple) Flow:
```
User → Maya Chat Screen → Click "Feed" tab → Chat naturally → Maya creates feed via trigger → Feed Preview Card appears → Click "View Full Feed" → Feed Planner Screen (full view)
```
**Benefits:**
- Clear tab structure (users understand "Feed" tab = create feeds)
- Use existing Maya chat (users already know it)
- Feed preview card in chat (like concept cards - familiar pattern)
- Keep feed planner screen for full view (strategy, captions, etc.)
- Natural conversation flow
- Visual preview without complexity
- One-click to full view
- Consistent with other tabs (Photos/Videos/Prompts/Training)

---

## 📋 Implementation Plan

### Phase 1: Add Feed Tab to Maya Header (2-3 hours)

#### Step 1.1: Update Type Definitions
**Files:** Multiple files using activeMayaTab type

**Change:** Add "feed" to type union

#### Step 1.2: Add Feed Tab to Tab Switcher
**File:** `components/sselfie/maya/maya-tab-switcher.tsx`

**Change:** Add Feed to tabs array

#### Step 1.3: Add Feed Tab Content
**File:** `components/sselfie/maya-chat-screen.tsx`

**Change:** Add Feed tab content section (reuse Photos tab)

#### Step 1.4: Update URL Hash & Persistence
**File:** `components/sselfie/maya-chat-screen.tsx`

**Change:** Add feed to hash map and localStorage

### Phase 2: Add Feed Tab Quick Prompts (1-2 hours)

#### Step 2.1: Create Feed Tab Quick Prompts
**File:** `components/sselfie/maya-chat-screen.tsx`

**Add Feed-specific quick prompts:**
```typescript
const getFeedQuickPrompts = () => {
  return [
    { label: "Create Feed Layout", prompt: "Create an Instagram feed layout for my business" },
    { label: "Create Captions", prompt: "Create captions for my feed posts" },
    { label: "Create Strategy", prompt: "Create a strategy document for my feed" },
  ]
}
```

**Display in Feed Tab:**
```typescript
{activeMayaTab === "feed" && (
  <MayaQuickPrompts
    prompts={getFeedQuickPrompts()}
    onSelect={(prompt) => {
      // Handle prompt selection
      setInputValue(prompt)
      // Or send directly
    }}
  />
)}
```

### Phase 3: Add Feed Creation to Maya Chat (1 day)

#### Step 3.1: Update Maya System Prompt
**File:** `lib/maya/personality.ts`

**Change:** Simplify Feed Planner workflow section - remove complex 3-phase approach, make it conversational, add Feed tab context awareness

**New (simple):**
```
## Creating Instagram Feeds (Feed Tab Context)

When user is in the Feed tab and wants to create an Instagram feed (9-post grid):
1. Have a natural conversation about what they want
2. When ready, create the strategy and output: [CREATE_FEED_STRATEGY: {...}]
3. That's it! The feed will be created automatically.

Keep it conversational - no need to show strategy previews or ask for approval.
Just understand what they want and create it.
```

#### Step 3.2: Add Trigger Detection to Maya Chat Screen (Feed Tab)
**File:** `components/sselfie/maya-chat-screen.tsx`

**Pattern:** Same as `[GENERATE_CONCEPTS]` trigger detection

**Add:**
```typescript
// Detect [CREATE_FEED_STRATEGY] trigger
const feedStrategyMatch = textContent.match(/\[CREATE_FEED_STRATEGY:\s*(\{[\s\S]*\})\]/i)

if (feedStrategyMatch && !isCreatingFeed) {
  const strategyJson = feedStrategyMatch[1]
  try {
    const strategy = JSON.parse(strategyJson)
    // Call create-from-strategy API
    await createFeedFromStrategy(strategy)
    // Navigate to feed view
  } catch (error) {
    console.error('Failed to create feed:', error)
  }
}
```

#### Step 3.3: Add Feed Creation Handler (Images Only)
**File:** `components/sselfie/maya-chat-screen.tsx`

**Function:**
```typescript
const createFeedFromStrategy = async (strategy: any) => {
  setIsCreatingFeed(true)
  try {
    const response = await fetch('/api/feed-planner/create-from-strategy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategy,
        customSettings: {
          styleStrength: settings.styleStrength,
          promptAccuracy: settings.promptAccuracy,
          aspectRatio: settings.aspectRatio,
          realismStrength: settings.realismStrength,
        },
      }),
    })
    
    const data = await response.json()
    if (data.feedLayoutId) {
      // Navigate to feed view (or show in modal/sidebar)
      router.push(`/feed/${data.feedLayoutId}`)
    }
  } catch (error) {
    toast({ title: 'Failed to create feed', variant: 'destructive' })
  } finally {
    setIsCreatingFeed(false)
  }
}
```

#### Step 3.4: Create Feed Preview Card Component
**File:** `components/feed-planner/feed-preview-card.tsx` (new file)

**Pattern:** Similar to `ConceptCard` - a card that appears in Maya chat showing feed preview

**Features:**
- Shows 3x3 grid preview (reuse FeedGridPreview component or create simplified version)
- Shows feed title/description
- Shows progress (X/9 images ready)
- "View Full Feed" button → routes to feed planner screen
- Compact design (fits in chat interface)

**Props:**
```typescript
interface FeedPreviewCardProps {
  feedId: number
  feedTitle?: string
  feedDescription?: string
  posts: Array<{
    id: number
    position: number
    image_url: string | null
    generation_status: string
    prompt?: string
    content_pillar?: string
  }>
  onViewFullFeed?: () => void
}
```

**Implementation:**
- Use FeedGridPreview component (or extract grid rendering logic)
- Add "View Full Feed" button
- Styled to match concept cards aesthetic
- Compact 3x3 grid (smaller than full feed view)

#### Step 3.5: Add Feed Preview Card to Maya Chat Interface
**File:** `components/sselfie/maya/maya-chat-interface.tsx`

**Pattern:** Same as concept cards - check for `tool-generateFeed` in message parts

**Add:**
```typescript
// Import FeedPreviewCard
import FeedPreviewCard from "@/components/feed-planner/feed-preview-card"

// In message rendering, check for feed preview part:
if (part.type === "tool-generateFeed") {
  return (
    <FeedPreviewCard
      feedId={part.output.feedId}
      feedTitle={part.output.title}
      feedDescription={part.output.description}
      posts={part.output.posts}
      onViewFullFeed={() => {
        // Navigate to feed planner screen
        router.push(`/feed-planner?feedId=${part.output.feedId}`)
      }}
    />
  )
}
```

#### Step 3.6: Update Feed Creation Handler to Return Card Data
**File:** `components/sselfie/maya-chat-screen.tsx`

**Change:** When feed is created, add a message part with feed preview data (instead of navigating immediately)

**Update createFeedFromStrategy:**
```typescript
const createFeedFromStrategy = async (strategy: any) => {
  setIsCreatingFeed(true)
  try {
    const response = await fetch('/api/feed-planner/create-from-strategy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategy,
        customSettings: {
          styleStrength: settings.styleStrength,
          promptAccuracy: settings.promptAccuracy,
          aspectRatio: settings.aspectRatio,
          realismStrength: settings.realismStrength,
        },
      }),
    })
    
    const data = await response.json()
    if (data.feedLayoutId) {
      // Fetch feed data for preview card
      const feedResponse = await fetch(`/api/feed/${data.feedLayoutId}`)
      const feedData = await feedResponse.json()
      
      // Add feed preview card to message
      const lastMessage = messages[messages.length - 1]
      const updatedParts = [
        ...(lastMessage.parts || []),
        {
          type: "tool-generateFeed",
          output: {
            feedId: data.feedLayoutId,
            title: feedData.feed?.title || "Instagram Feed",
            description: feedData.feed?.description || "",
            posts: feedData.posts || [],
          },
        },
      ]
      
      // Update last message with feed preview part
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          ...updated[updated.length - 1],
          parts: updatedParts,
        }
        return updated
      })
    }
  } catch (error) {
    toast({ title: 'Failed to create feed', variant: 'destructive' })
  } finally {
    setIsCreatingFeed(false)
  }
}
```

### Phase 4: Add Caption Cards in Chat (1 day)

#### Step 4.1: Create Caption Card Component
**File:** `components/feed-planner/feed-caption-card.tsx` (new file)

**Features:**
- Shows caption preview (with hashtags)
- Shows which post it's for (position number)
- "Add to Feed" button → Adds caption to feed post
- "Regenerate" button → Creates new caption
- Compact design (fits in chat interface)

**Props:**
```typescript
interface FeedCaptionCardProps {
  caption: string
  postPosition: number
  postPrompt?: string
  hashtags?: string[]
  feedId: number
  postId: number
  onAddToFeed?: () => void
  onRegenerate?: () => void
}
```

#### Step 4.2: Add Caption Generation Trigger
**File:** `components/sselfie/maya-chat-screen.tsx`

**Pattern:** Detect when user asks for captions (via quick prompt or chat)

**Add:**
```typescript
// Detect caption generation request
const captionRequestMatch = textContent.match(/create captions|generate captions|write captions/i)

if (captionRequestMatch && activeMayaTab === "feed") {
  // Trigger caption generation for feed
  // Maya generates captions and outputs them as caption cards
}
```

#### Step 4.3: Add Caption Cards to Maya Chat Interface
**File:** `components/sselfie/maya/maya-chat-interface.tsx`

**Pattern:** Similar to concept cards - check for `tool-generateCaptions` in message parts

**Add:**
```typescript
// Import FeedCaptionCard
import FeedCaptionCard from "@/components/feed-planner/feed-caption-card"

// In message rendering, check for caption cards part:
if (part.type === "tool-generateCaptions") {
  return (
    <div className="space-y-2">
      {part.output.captions.map((caption: any) => (
        <FeedCaptionCard
          key={caption.postId}
          caption={caption.text}
          postPosition={caption.position}
          postPrompt={caption.prompt}
          hashtags={caption.hashtags}
          feedId={part.output.feedId}
          postId={caption.postId}
          onAddToFeed={async () => {
            // Call API to add caption to feed post
            await fetch(`/api/feed/${part.output.feedId}/add-caption`, {
              method: 'POST',
              body: JSON.stringify({ postId: caption.postId, caption: caption.text }),
            })
          }}
        />
      ))}
    </div>
  )
}
```

#### Step 4.4: Create Caption Generation API
**File:** `app/api/feed/[feedId]/generate-captions/route.ts` (new file)

**Functionality:**
- Accepts feedId
- Fetches all posts for feed
- Calls Maya to generate captions for all posts
- Returns captions as array (for caption cards)
- Does NOT save to database (user approves first via "Add to Feed")

### Phase 5: Add Strategy Generation (1 day)

#### Step 5.1: Create Strategy Generation Trigger
**File:** `components/sselfie/maya-chat-screen.tsx`

**Pattern:** Detect when user asks for strategy (via quick prompt or chat)

**Add:**
```typescript
// Detect strategy generation request
const strategyRequestMatch = textContent.match(/create strategy|generate strategy|write strategy/i)

if (strategyRequestMatch && activeMayaTab === "feed") {
  // Trigger strategy generation for feed
  // Maya generates strategy and outputs it
}
```

#### Step 5.2: Add Strategy Display in Chat
**File:** `components/sselfie/maya/maya-chat-interface.tsx`

**Pattern:** Show strategy as markdown preview card

**Add:**
```typescript
// Import FeedStrategyCard
import FeedStrategyCard from "@/components/feed-planner/feed-strategy-card"

// In message rendering, check for strategy part:
if (part.type === "tool-generateStrategy") {
  return (
    <FeedStrategyCard
      strategy={part.output.strategy}
      feedId={part.output.feedId}
      onAddToFeed={async () => {
        // Call API to add strategy to feed
        await fetch(`/api/feed/${part.output.feedId}/add-strategy`, {
          method: 'POST',
          body: JSON.stringify({ strategy: part.output.strategy }),
        })
      }}
    />
  )
}
```

#### Step 5.3: Create Strategy Generation API
**File:** `app/api/feed/[feedId]/generate-strategy/route.ts` (new file)

**Functionality:**
- Accepts feedId
- Fetches feed data (posts, layout)
- Calls Maya to generate full strategy document
- Returns strategy as markdown (for preview)
- Does NOT save to database (user approves first via "Add to Feed")

### Phase 6: Simplify & Fix Feed Planner Screen (1-2 days)

#### Step 6.1: Remove Chat Functionality
**File:** `components/feed-planner/feed-planner-screen.tsx`

**Remove:**
- Chat interface
- Maya chat integration
- Strategy preview component
- Complex state management

**Keep:**
- Feed view (Grid, Posts, Strategy tabs)
- Feed management features
- Image generation controls

#### Step 6.2: Make Feed Planner View-Only
**File:** `components/feed-planner/feed-planner-screen.tsx`

**Changes:**
- Accept feedId as query param
- Load feed data from API
- Display feed in InstagramFeedView
- Add "Back to Maya Chat" button (routes to Feed tab)

#### Step 6.3: Add "Create Captions" Button
**File:** `components/feed-planner/instagram-feed-view.tsx`

**Add to Posts Tab:**
- "Create Captions" button (if captions don't exist)
- Button routes to Maya Feed tab with "Create captions" prompt
- Or opens modal with Maya chat for caption generation

#### Step 6.4: Add "Create Strategy" Button
**File:** `components/feed-planner/instagram-feed-view.tsx`

**Add to Strategy Tab:**
- "Create Strategy" button (if strategy doesn't exist)
- Button routes to Maya Feed tab with "Create strategy" prompt
- Or opens modal with Maya chat for strategy generation

#### Step 6.5: Fix Caption Display
**File:** `components/feed-planner/feed-post-card.tsx`

**Fix:**
- Ensure captions display under post cards
- Show hashtags properly
- Fix caption truncation/expansion
- Fix caption editing

#### Step 6.6: Fix Strategy Display
**File:** `components/feed-planner/feed-strategy-panel.tsx`

**Fix:**
- Ensure strategy displays in Strategy tab
- Render markdown properly
- Show full strategy document
- Fix styling/formatting

### Phase 7: Add Caption/Strategy APIs (1 day)

#### Step 7.1: Create Add Caption API
**File:** `app/api/feed/[feedId]/add-caption/route.ts` (new file)

**Functionality:**
- Accepts postId and caption text
- Updates feed_posts.caption in database
- Returns updated post

#### Step 7.2: Create Add Strategy API
**File:** `app/api/feed/[feedId]/add-strategy/route.ts` (new file)

**Functionality:**
- Accepts strategy markdown/text
- Updates feed_layouts.description or strategy field
- Returns updated feed layout
**File:** `components/feed-planner/feed-planner-screen.tsx`

**Change:** Keep the screen, but simplify it:
- Remove chat functionality (moved to Maya chat)
- Make it a view-only screen (like InstagramFeedView but with strategy panel)
- Accept feedId as prop/query param
- Show full feed grid, strategy, captions, etc.
- Keep navigation back to Maya chat

---

### Phase 8: Fix InstagramFeedView Issues (1 day)

#### Step 4.1: Fix Captions Display
**File:** `components/feed-planner/instagram-feed-view.tsx`

**Issue:** Captions not showing in posts

**Fix:** Verify caption data structure and display logic (check line 1407-1477)

#### Step 4.2: Fix Strategy Display
**File:** `components/feed-planner/instagram-feed-view.tsx`

**Issue:** Full strategy not shown

**Fix:** Check strategy tab (line 1522+) - verify feedData.feed.description exists

#### Step 4.3: Fix Image Generation
**File:** Check API endpoints and generation logic

**Issue:** Images not generating correctly

**Fix:** Verify prompt generation, mode detection, queue logic

---

### Phase 5: Cleanup (Optional)

**If we're using Maya chat directly, we can:**
- Remove `feed-planner-screen.tsx` (or keep as legacy route)
- Remove `strategy-preview.tsx` (no longer needed)
- Update navigation to point to Maya chat instead

**Note:** Keep InstagramFeedView - that's still needed to view feeds

---

## 🎯 User Experience Flow

### Simple Example:

**User clicks "Feed" tab in Maya header**

**Quick Prompts appear:**
- "Create Feed Layout"
- "Create Captions"
- "Create Strategy"

**User clicks "Create Feed Layout" or chats: "Create an Instagram feed for my wellness business"**

**Maya:** "Love it! 😍 Tell me more - what vibe are you going for? Warm and inviting? Clean and minimal?"

**User:** "Warm and inviting, with lifestyle shots and some quotes"

**Maya:** "Perfect! I'll create a 9-post grid with a mix of lifestyle portraits, flatlays, and quote graphics. Let me design this for you..."

[Creates feed via trigger - images only]

**Maya:** "Done! I've created your Instagram feed. Images are generating now!"

**[Feed Preview Card appears in chat]**
- Shows 3x3 grid preview
- Shows "0/9 images ready" progress
- "View Full Feed" button

**User clicks "View Full Feed" → Routes to Feed Planner Screen**
- Full feed grid view (images generating)
- Posts tab (no captions yet)
- Strategy tab (no strategy yet)

**User goes back to Feed tab in Maya**

**User clicks "Create Captions" quick prompt**

**Maya:** "Creating captions for your 9 posts..."

**[Caption Cards appear in chat]**
- 9 caption cards, one for each post
- Shows caption preview with hashtags
- "Add to Feed" button on each card

**User clicks "Add to Feed" on caption cards → Captions appear in Feed Planner Posts tab**

**User clicks "Create Strategy" quick prompt**

**Maya:** "Creating a strategy document for your feed..."

**[Strategy Card appears in chat]**
- Shows strategy preview (markdown)
- "Add to Feed" button

**User clicks "Add to Feed" → Strategy appears in Feed Planner Strategy tab**

---

## 📊 What Gets Removed

1. ❌ Chat functionality from Feed Planner Screen (moved to Maya chat)
2. ❌ Strategy Preview Component (`strategy-preview.tsx`) - replaced by Feed Preview Card
3. ❌ Complex state management (strategyPreview, showPreview, etc.)
4. ❌ Separate feed planner chat type
5. ❌ Welcome screen in feed planner (no longer needed)

## 📊 What Gets Modified

1. ✅ Feed Planner Screen - simplified to view-only (removes chat, keeps full view)
2. ✅ Maya Chat Screen - adds feed creation trigger detection
3. ✅ Maya Chat Interface - adds feed preview card rendering

## ✅ What We Keep

1. ✅ Maya chat infrastructure (useMayaChat, MayaChatInterface, etc.)
2. ✅ Feed creation API (`create-from-strategy`)
3. ✅ Feed Planner Screen (simplified to view-only)
4. ✅ InstagramFeedView (or integrate into feed planner screen)
5. ✅ Feed Grid Preview component (reuse for preview card)
6. ✅ Feed APIs (status, generation, etc.)
7. ✅ Maya's feed creation capabilities (personality, triggers)

---

## 🔧 Technical Implementation

### Trigger Detection Pattern

Use the same pattern as `[GENERATE_CONCEPTS]`:

```typescript
// In maya-chat-screen.tsx useEffect
const feedStrategyMatch = textContent.match(/\[CREATE_FEED_STRATEGY:\s*(\{[\s\S]*\})\]/i)

if (feedStrategyMatch) {
  const strategyJson = feedStrategyMatch[1]
  // Parse and create feed
}
```

### Feed Creation Flow

1. Maya outputs `[CREATE_FEED_STRATEGY: {...}]` in response
2. Trigger detection catches it
3. Call `/api/feed-planner/create-from-strategy` with strategy JSON
4. Get feedLayoutId back
5. Navigate to `/feed/[feedLayoutId]` (or show InstagramFeedView)

### Settings Integration

Use existing Maya settings:
- `settings.styleStrength`
- `settings.promptAccuracy`
- `settings.aspectRatio`
- `settings.realismStrength`
- `studioProMode` (for Pro Mode feeds)

---

## 📝 Files to Modify

### Must Create:
1. `components/feed-planner/feed-preview-card.tsx` - Feed preview card component (new file)
2. `components/feed-planner/feed-caption-card.tsx` - Caption card component (new file)
3. `components/feed-planner/feed-strategy-card.tsx` - Strategy card component (new file)
4. `app/api/feed/[feedId]/generate-captions/route.ts` - Caption generation API (new file)
5. `app/api/feed/[feedId]/generate-strategy/route.ts` - Strategy generation API (new file)
6. `app/api/feed/[feedId]/add-caption/route.ts` - Add caption to feed API (new file)
7. `app/api/feed/[feedId]/add-strategy/route.ts` - Add strategy to feed API (new file)

### Must Modify:
1. **Type Definitions** (Add "feed" to activeMayaTab type):
   - `components/sselfie/maya-chat-screen.tsx`
   - `components/sselfie/maya/maya-tab-switcher.tsx`
   - `components/sselfie/maya/maya-header.tsx`
   - Any other files using activeMayaTab type

2. **Maya Tab Switcher**:
   - `components/sselfie/maya/maya-tab-switcher.tsx` - Add Feed tab to tabs array

3. **Maya Chat Screen**:
   - `components/sselfie/maya-chat-screen.tsx` - Add Feed tab content section (reuse Photos tab), add feed creation trigger detection and handler, update URL hash mapping

4. **Maya Chat Interface**:
   - `components/sselfie/maya/maya-chat-interface.tsx` - Add feed preview card rendering

5. **Maya System Prompt**:
   - `lib/maya/personality.ts` - Simplify Feed Planner workflow section, add Feed tab context awareness (optional)

6. **Maya Chat API** (Optional):
   - `app/api/maya/chat/route.ts` - Accept activeTab context for tab-aware responses

7. **Feed Planner Screen**:
   - `components/feed-planner/feed-planner-screen.tsx` - Simplify to view-only (remove chat)

8. **Feed View**:
   - `components/feed-planner/instagram-feed-view.tsx` - Fix captions, strategy display

### Optional (Cleanup):
9. Remove `components/feed-planner/strategy-preview.tsx` (replaced by feed preview card)
10. Update navigation/routing to support feedId query param

---

## ✅ Success Criteria

1. ✅ Feed tab appears in Maya header with quick prompts
2. ✅ User can create feed layout (images only) via quick prompt or chat
3. ✅ Feed preview card appears in chat with "View Full Feed" button
4. ✅ User can create captions via quick prompt or chat
5. ✅ Caption cards appear in chat with "Add to Feed" buttons
6. ✅ User can create strategy via quick prompt or chat
7. ✅ Strategy card appears in chat with "Add to Feed" button
8. ✅ Feed Planner Screen displays images, captions, and strategy correctly
9. ✅ Captions display under post cards in Posts tab
10. ✅ Strategy displays in Strategy tab (styled markdown)
11. ✅ Images generate correctly
12. ✅ Natural, conversational flow with progressive enhancement

---

## 🚀 Benefits

1. **Progressive Enhancement:**
   - Images first (fast feedback)
   - Captions optional (add when ready)
   - Strategy optional (add if needed)
   - Users control what they create

2. **Better UX:**
   - Quick prompts for common actions
   - Preview cards in chat (see before adding)
   - Clear separation: Images, Captions, Strategy
   - Natural conversation flow

3. **More Flexible:**
   - Users can create just images
   - Or add captions later
   - Or add strategy later
   - Each piece is independent

4. **Simpler for Developers:**
   - Reuse existing Maya infrastructure
   - Modular APIs (generate vs add)
   - Consistent patterns (cards, triggers)
   - Easier to maintain

5. **Better Error Handling:**
   - If captions fail, images still work
   - If strategy fails, images still work
   - Modular failures don't break the whole feed

---

## 📋 Implementation Checklist

### Phase 1: Add Feed Tab to Maya Header
- [ ] Update type definitions: Add "feed" to activeMayaTab type in:
  - `components/sselfie/maya-chat-screen.tsx`
  - `components/sselfie/maya/maya-tab-switcher.tsx`
  - `components/sselfie/maya/maya-header.tsx`
  - Any other files using this type
- [ ] Add Feed tab to MayaTabSwitcher component (1 line in tabs array)
- [ ] Add Feed tab content section (reuse Photos tab content - MayaChatInterface + MayaUnifiedInput)
- [ ] Update URL hash mapping: Add `feed: "#maya/feed"`
- [ ] Update localStorage tab persistence to include "feed"
- [ ] Test: Feed tab appears in header, clicking it shows chat interface

### Phase 2: Add Feed Creation to Maya Chat (Feed Tab)
- [ ] Update Maya system prompt (simplify Feed Planner section, add Feed tab context awareness)
- [ ] Add `[CREATE_FEED_STRATEGY]` trigger detection to maya-chat-screen.tsx
- [ ] Add `createFeedFromStrategy` handler function
- [ ] (Optional) Pass activeTab context to Maya API for tab-aware responses
- [ ] Create `FeedPreviewCard` component
- [ ] Add feed preview card rendering to maya-chat-interface.tsx
- [ ] Update createFeedFromStrategy to add preview card to message
- [ ] Test: Feed tab → Chat with Maya → Create feed → Preview card appears

### Phase 3: Simplify Feed Planner Screen
- [ ] Remove chat functionality from feed-planner-screen.tsx
- [ ] Make it accept feedId as prop/query param
- [ ] Keep full view (grid, strategy, captions)
- [ ] Add back button to return to Maya chat (Feed tab)
- [ ] Test: Click "View Full Feed" → Feed planner screen loads

### Phase 6: Simplify & Fix Feed Planner Screen (continued)
- [ ] Remove chat functionality from feed-planner-screen.tsx
- [ ] Make feed planner accept feedId as query param
- [ ] Keep feed view (Grid, Posts, Strategy tabs)
- [ ] Add "Back to Maya Chat" button (routes to Feed tab)
- [ ] Add "Create Captions" button in Posts tab (if captions don't exist)
- [ ] Add "Create Strategy" button in Strategy tab (if strategy doesn't exist)
- [ ] Fix caption display under post cards
- [ ] Fix strategy display in Strategy tab
- [ ] Test: Feed planner loads feed, buttons work, captions/strategy display correctly

### Phase 7: Add Caption/Strategy APIs
- [ ] Create `/api/feed/[feedId]/add-caption` endpoint (saves caption to post)
- [ ] Create `/api/feed/[feedId]/add-strategy` endpoint (saves strategy to feed)
- [ ] Test: Caption cards → "Add to Feed" → Caption saved → Appears in Posts tab
- [ ] Test: Strategy card → "Add to Feed" → Strategy saved → Appears in Strategy tab

### Phase 8: Fix Feed View
- [ ] Fix captions display in InstagramFeedView
- [ ] Fix strategy display in InstagramFeedView
- [ ] Fix image generation (verify prompts, mode detection)
- [ ] Test: View feed → Verify captions, strategy, images

### Phase 5: Cleanup (Optional)
- [ ] Remove feed-planner-screen.tsx (or mark as deprecated)
- [ ] Remove strategy-preview.tsx
- [ ] Update navigation/routing
- [ ] Update documentation

---

## 🎯 Key Principle

**Use what works.** Maya chat works. Feed creation API works. Just connect them simply.

No need for:
- Separate screens
- Preview components
- Complex state management
- Multiple view transitions

Just: Chat → Create → View

That's it.

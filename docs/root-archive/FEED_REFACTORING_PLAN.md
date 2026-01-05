# Feed Code Separation Plan

## Problem Statement

Feed logic is currently embedded in the main Maya chat route (`app/api/maya/chat/route.ts`) and photo generation flow (`components/sselfie/maya-chat-screen.tsx`) instead of having its own isolated module. This creates:

1. **Code Duplication**: Feed logic mixed with photo generation
2. **Maintenance Issues**: Changes to feed affect photo generation and vice versa
3. **Unclear Separation**: Feed tab is implemented inline instead of as a separate component
4. **API Confusion**: Feed endpoints are scattered across different routes

## Current State Analysis

### Feed Logic Locations

1. **`components/sselfie/maya-chat-screen.tsx`** (Lines 336-614, 931-989, 1842-1856, 3857-3923):
   - `createFeedFromStrategy` handler (lines 337-458)
   - `generateCaptionsForFeed` handler (lines 461-537)
   - `generateStrategyForFeed` handler (lines 540-615)
   - Feed trigger detection (lines 931-989)
   - Feed tab UI (lines 3857-3923)
   - Feed quick prompts (lines 1842-1856)

2. **`app/api/maya/chat/route.ts`** (Lines 671-699):
   - Feed planner context detection
   - Feed tab flag handling (`isFeedTab`)
   - System prompt modification for feed mode

3. **Existing Feed API Routes**:
   - `/api/maya/generate-feed-prompt/route.ts` - Individual prompt generation
   - `/api/maya/generate-all-feed-prompts/route.ts` - Batch prompt generation
   - `/api/feed-planner/create-from-strategy` - Feed creation (external route)

### Current Flow (Problematic)

```
User in Feed Tab → Types request → Maya chat route → Detects feed intent → 
Mixes with photo generation → Confused execution → Feed handlers in maya-chat-screen.tsx
```

## Target State

### Clean Separation Pattern

```
User in Feed Tab → Types request → FeedTab component → feed-generation-handler.ts → 
create-strategy API → generate-images API → save-to-planner API → Display in FeedTab
```

### File Structure

```
app/api/maya/
├── chat/
│   └── route.ts (REMOVE feed logic from here)
├── photos/
│   ├── route.ts (Classic/Pro mode photo generation)
│   └── feed-photos/ (NEW - dedicated endpoint for feed image generation)
│       └── route.ts
└── feed/ (NEW DIRECTORY)
    ├── create-strategy/route.ts (Maya creates feed strategy)
    ├── generate-images/route.ts (Generate all 9 images)
    └── save-to-planner/route.ts (Save to feed planner tab)

components/maya/
├── MayaChat.tsx (if exists)
├── tabs/
│   ├── PhotosTab.tsx (if exists)
│   ├── VideosTab.tsx (if exists)
│   ├── PromptsTab.tsx (if exists)
│   └── FeedTab.tsx (NEW - isolated feed component)

lib/maya/
├── feed-planner-context.ts (EXISTS - Update per Issue #1)
├── feed-prompt-expert.ts (NEW - From Issue #1 solution)
└── feed-generation-handler.ts (NEW - Orchestrates feed creation)
```

## Implementation Plan

### Phase 1: Create FeedTab Component

**Goal**: Extract feed UI from `maya-chat-screen.tsx` into isolated component

**Steps**:
1. Create `components/maya/tabs/FeedTab.tsx`
2. Move feed tab UI (lines 3857-3923) to FeedTab component
3. Extract feed-specific props and handlers
4. Follow PhotosTab/VideosTab pattern for consistency

**Files to Create**:
- `components/maya/tabs/FeedTab.tsx`

**Files to Modify**:
- `components/sselfie/maya-chat-screen.tsx` (replace inline feed tab with FeedTab component)

### Phase 2: Extract Feed Handlers

**Goal**: Move feed business logic to dedicated handler module

**Steps**:
1. Create `lib/maya/feed-generation-handler.ts`
2. Move handlers from maya-chat-screen.tsx:
   - `createFeedFromStrategy` → `createFeedFromStrategyHandler`
   - `generateCaptionsForFeed` → `generateCaptionsHandler`
   - `generateStrategyForFeed` → `generateStrategyHandler`
3. Make handlers pure functions (no React state dependencies)
4. Return data instead of directly updating messages

**Files to Create**:
- `lib/maya/feed-generation-handler.ts`

**Files to Modify**:
- `components/sselfie/maya-chat-screen.tsx` (use handlers from module)

### Phase 3: Create Dedicated Feed API Routes

**Goal**: Move feed API logic to dedicated routes under `/api/maya/feed/`

**Steps**:
1. Create `/api/maya/feed/create-strategy/route.ts`
   - Move feed strategy creation logic
   - Handle `[CREATE_FEED_STRATEGY]` trigger
   - Return strategy JSON

2. Create `/api/maya/feed/generate-images/route.ts`
   - Handle batch image generation for all 9 posts
   - Support both Classic and Pro modes
   - Use existing `/api/maya/generate-all-feed-prompts` as reference

3. Create `/api/maya/feed/save-to-planner/route.ts`
   - Save generated feed to feed planner
   - Update feed_posts table
   - Return feed ID

**Files to Create**:
- `app/api/maya/feed/create-strategy/route.ts`
- `app/api/maya/feed/generate-images/route.ts`
- `app/api/maya/feed/save-to-planner/route.ts`

**Files to Modify**:
- `app/api/maya/chat/route.ts` (remove feed detection logic)
- Keep existing routes for backward compatibility during migration

### Phase 4: Clean Up Maya Chat Route

**Goal**: Remove feed-specific logic from main chat route

**Steps**:
1. Remove feed tab detection (`isFeedTab` flag)
2. Remove feed planner context addon logic (lines 671-699)
3. Keep chat route focused on general Maya conversation
4. Feed tab should use dedicated feed routes

**Files to Modify**:
- `app/api/maya/chat/route.ts` (remove lines 671-699, feed detection)

### Phase 5: Update FeedTab to Use New Routes

**Goal**: Connect FeedTab component to new dedicated API routes

**Steps**:
1. Update FeedTab to call `/api/maya/feed/create-strategy` instead of chat route
2. Update feed handlers to use new routes
3. Remove feed trigger detection from maya-chat-screen.tsx
4. Move trigger detection to FeedTab component

**Files to Modify**:
- `components/maya/tabs/FeedTab.tsx`
- `components/sselfie/maya-chat-screen.tsx` (remove feed trigger detection)

### Phase 6: Testing & Validation

**Goal**: Ensure feed generation works end-to-end

**Test Cases**:
1. ✅ User creates feed strategy in Feed tab
2. ✅ Feed strategy is saved correctly
3. ✅ Feed images generate (all 9 posts)
4. ✅ Feed appears in feed planner
5. ✅ Feed captions generate correctly
6. ✅ Feed strategy document generates correctly
7. ✅ No regressions in Photos/Videos/Prompts tabs

## Migration Strategy

### Backward Compatibility

During migration, maintain existing routes:
- Keep `/api/maya/generate-feed-prompt/route.ts` (used by feed planner)
- Keep `/api/maya/generate-all-feed-prompts/route.ts` (used by feed planner)
- Keep `/api/feed-planner/create-from-strategy` (used by feed planner)

### Gradual Migration

1. **Week 1**: Create FeedTab component and handlers (Phase 1-2)
2. **Week 2**: Create new API routes (Phase 3)
3. **Week 3**: Update FeedTab to use new routes (Phase 4-5)
4. **Week 4**: Testing and cleanup (Phase 6)

## Code Examples

### FeedTab Component Structure

```typescript
// components/maya/tabs/FeedTab.tsx
interface FeedTabProps {
  messages: Message[]
  setMessages: (messages: Message[]) => void
  studioProMode: boolean
  isCreatingFeed: boolean
  onCreateFeed: (strategy: FeedStrategy) => Promise<void>
  onGenerateCaptions: () => Promise<void>
  onGenerateStrategy: () => Promise<void>
  // ... other props
}

export default function FeedTab({
  messages,
  setMessages,
  studioProMode,
  isCreatingFeed,
  onCreateFeed,
  onGenerateCaptions,
  onGenerateStrategy,
  ...props
}: FeedTabProps) {
  // Feed-specific UI and logic
  // Handle [CREATE_FEED_STRATEGY] triggers
  // Display feed cards
  // Feed-specific quick prompts
}
```

### Feed Generation Handler

```typescript
// lib/maya/feed-generation-handler.ts
export async function createFeedFromStrategyHandler(
  strategy: FeedStrategy,
  options: {
    studioProMode: boolean
    customSettings: CustomSettings
  }
): Promise<{ feedId: number; feed: FeedData }> {
  // Pure function - no React dependencies
  // Call API route
  // Return data
}

export async function generateCaptionsHandler(
  feedId: number
): Promise<{ captions: Caption[] }> {
  // Pure function
  // Call API route
  // Return data
}
```

### Feed API Route Example

```typescript
// app/api/maya/feed/create-strategy/route.ts
export async function POST(req: NextRequest) {
  const { strategy, userModePreference, customSettings } = await req.json()
  
  // Create feed from strategy
  // Save to database
  // Return feed ID
}
```

## Success Criteria

✅ Feed logic is completely isolated from photo generation
✅ FeedTab component follows same pattern as PhotosTab/VideosTab
✅ Feed API routes are under `/api/maya/feed/` directory
✅ No feed logic in main chat route
✅ Feed generation works end-to-end
✅ No regressions in other tabs

## Risks & Mitigation

### Risk 1: Breaking Existing Feed Functionality
**Mitigation**: Maintain backward compatibility, test thoroughly before removing old code

### Risk 2: Duplicate Code During Migration
**Mitigation**: Use feature flags to switch between old and new implementations

### Risk 3: Missing Edge Cases
**Mitigation**: Comprehensive testing, especially around feed creation and image generation

## Notes

- Feed prompt generation (`generate-feed-prompt`) can stay as-is since it's used by feed planner
- Feed planner screen (`components/feed-planner/feed-planner-screen.tsx`) is separate and doesn't need changes
- Focus on Maya chat screen feed tab isolation



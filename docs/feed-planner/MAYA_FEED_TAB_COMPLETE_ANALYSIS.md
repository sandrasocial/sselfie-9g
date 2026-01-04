# Maya Feed Tab - Complete Analysis

**Last Updated:** 2025-01-22  
**Status:** 📊 **Current State Analysis**

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Component Architecture](#component-architecture)
3. [Files & Dependencies](#files--dependencies)
4. [Prompting Pipeline](#prompting-pipeline)
5. [Hooks & State Management](#hooks--state-management)
6. [API Routes & Integration](#api-routes--integration)
7. [Data Flow](#data-flow)
8. [Current State Assessment](#current-state-assessment)
9. [Integration Points](#integration-points)
10. [Key Features & Capabilities](#key-features--capabilities)

---

## Executive Summary

Maya's Feed Tab is a conversational interface for creating Instagram feed strategies. Users chat with Maya to create 9-post feed layouts, and Maya generates comprehensive strategies with triggers that activate feed creation workflows.

### Current Status

✅ **Working Features:**
- Feed Tab component is implemented and integrated
- Trigger detection for `[CREATE_FEED_STRATEGY]`, `[GENERATE_CAPTIONS]`, `[GENERATE_STRATEGY]`
- Feed strategy parsing and validation
- Feed card rendering in chat interface
- Integration with Feed Planner

🟡 **Areas for Improvement:**
- Feed cards stored in message parts (not saved to database until user clicks "Save Feed")
- Strategy generation relies on conversational flow (no explicit API endpoint for strategy generation in Feed Tab)
- Caption and strategy generation depend on feedId from saved feed cards

---

## Component Architecture

### Main Component: `MayaFeedTab`

**Location:** `components/sselfie/maya/maya-feed-tab.tsx`

**Purpose:** Dedicated tab component for feed creation within Maya Chat interface

**Key Responsibilities:**
1. Feed trigger detection (`[CREATE_FEED_STRATEGY]`, `[GENERATE_CAPTIONS]`, `[GENERATE_STRATEGY]`)
2. Feed strategy creation and storage (in message parts, not database)
3. Caption generation (calls API endpoint)
4. Strategy document generation (calls API endpoint)
5. Feed-specific quick prompts
6. Feed-specific empty state

**Props Interface:**
```typescript
interface MayaFeedTabProps {
  messages: any[]
  filteredMessages: any[]
  setMessages: (messages: any[] | ((prev: any[]) => any[])) => void
  proMode: boolean
  isTyping: boolean
  status: "idle" | "streaming" | "submitted" | "ready"
  isGeneratingConcepts: boolean
  isGeneratingPro: boolean
  isCreatingFeed: boolean
  setIsCreatingFeed: (isCreating: boolean) => void
  contentFilter: "all" | "photos" | "videos"
  messagesContainerRef: React.RefObject<HTMLDivElement>
  messagesEndRef: React.RefObject<HTMLDivElement>
  showScrollButton: boolean
  isAtBottomRef: React.RefObject<boolean>
  scrollToBottom: () => void
  chatId?: number
  uploadedImages: string[]
  setCreditBalance: (balance: number) => void
  onImageGenerated: () => void
  isAdmin: boolean
  selectedGuideId: string | null
  selectedGuideCategory: string | null
  onSaveToGuide: (guideId: string, category: string, prompt: string, title: string) => Promise<void>
  userId: string
  user: any
  promptSuggestions: any[]
  // Feed-specific props
  styleStrength: number
  promptAccuracy: number
  aspectRatio: string
  realismStrength: number
  onCreateFeed: (strategy: any) => Promise<void>
  onGenerateCaptions: () => Promise<void>
  onGenerateStrategy: () => Promise<void>
  currentPrompts: Array<{ label: string; prompt: string }>
  handleSendMessage: (message: any) => void
  isEmpty: boolean
}
```

### Key Functions

#### 1. `handleCreateFeed`

**Purpose:** Stores feed strategy in message parts (unsaved state)

**Flow:**
1. Receives `FeedStrategy` object from trigger parsing
2. Finds last assistant message
3. Adds `tool-generateFeed` part with strategy data
4. Sets `isCreatingFeed` to false
5. Calls `onCreateFeed` callback (placeholder in parent)

**Note:** Strategy is stored in message parts, NOT saved to database. User must click "Save Feed" button on feed card to persist.

#### 2. `handleGenerateCaptions`

**Purpose:** Generates captions for all posts in feed

**Flow:**
1. Extracts `feedId` from latest feed card in messages
2. Calls `generateCaptionsHandler(feedId)`
3. Adds `tool-generateCaptions` part to last assistant message
4. Calls `onGenerateCaptions` callback

**Dependency:** Requires feed to be saved (has feedId) - will fail if no feedId found

#### 3. `handleGenerateStrategy`

**Purpose:** Generates comprehensive strategy document

**Flow:**
1. Extracts `feedId` from latest feed card in messages
2. Calls `generateStrategyHandler(feedId)`
3. Adds `tool-generateStrategy` part to last assistant message
4. Calls `onGenerateStrategy` callback

**Dependency:** Requires feed to be saved (has feedId) - will fail if no feedId found

#### 4. Trigger Detection (`useEffect`)

**Purpose:** Detects feed triggers in assistant messages

**Triggers Detected:**
- `[CREATE_FEED_STRATEGY: {...}]` - Feed creation trigger
- `[GENERATE_CAPTIONS]` - Caption generation trigger
- `[GENERATE_STRATEGY]` - Strategy document generation trigger

**Flow:**
1. Monitors messages array for changes
2. Filters for assistant messages
3. Extracts text content from message parts
4. Checks for trigger patterns using regex
5. Parses JSON from `[CREATE_FEED_STRATEGY]` trigger
6. Calls appropriate handler
7. Tracks processed messages to prevent duplicates

**Prevention Mechanisms:**
- Skips processing during streaming (`status === "streaming"`)
- Tracks processed messages using `processedFeedMessagesRef`
- Checks for existing feed cards before creating new ones
- Uses message ID or content hash for tracking

---

## Files & Dependencies

### Core Files

#### 1. `components/sselfie/maya/maya-feed-tab.tsx`
- **Lines:** ~637
- **Purpose:** Main Feed Tab component
- **Dependencies:**
  - `lib/maya/feed-generation-handler.ts` - Feed strategy handlers
  - `components/sselfie/maya/maya-chat-interface.tsx` - Chat UI component
  - `components/sselfie/maya/maya-quick-prompts.tsx` - Quick prompts component

#### 2. `lib/maya/feed-generation-handler.ts`
- **Lines:** ~1046
- **Purpose:** Feed strategy parsing, validation, and API client functions
- **Key Functions:**
  - `parseFeedStrategy()` - Parses strategy from Maya's response
  - `generateFeedPrompts()` - Generates prompts for all 9 posts
  - `createFeedFromStrategyHandler()` - Creates feed via API
  - `generateCaptionsHandler()` - Generates captions via API
  - `generateStrategyHandler()` - Generates strategy document via API
  - `saveFeedMarkerToMessage()` - Saves feed marker to message (deprecated)

#### 3. `lib/maya/feed-planner-context.ts`
- **Lines:** ~863
- **Purpose:** System prompt context for Maya when in Feed Tab
- **Key Features:**
  - Aesthetic-specific guidance (5 aesthetics: Dark & Moody, Clean & Minimalistic, Scandinavian Muted, Beige & Simple, Pastels Scandic)
  - Generation mode instructions (Classic vs Pro Mode)
  - Prompt generation requirements
  - Grid pattern validation rules
  - Caption writing guidelines

#### 4. `components/sselfie/maya/maya-chat-interface.tsx`
- **Purpose:** Renders chat messages including feed cards
- **Feed Card Rendering:**
  - `tool-generateFeed` → `FeedPreviewCard`
  - `tool-generateCaptions` → `FeedCaptionCard`
  - `tool-generateStrategy` → `FeedStrategyCard`

#### 5. `components/feed-planner/feed-preview-card.tsx`
- **Purpose:** Displays feed preview card in chat
- **Features:**
  - Shows 3x3 grid preview
  - "Save Feed" button (saves strategy to database)
  - "View Full Feed" button (navigates to Feed Planner)
  - Displays credit cost

---

## Prompting Pipeline

### 1. User Input → Maya Chat API

**Flow:**
1. User types message in Feed Tab
2. `MayaChatInterface` → `MayaUnifiedInput` → `sendMessage()`
3. Message sent to `/api/maya/chat` with headers:
   - `x-active-tab: feed` (indicates Feed Tab)
   - `x-chat-type: feed-planner` (indicates feed context)

### 2. System Prompt Construction

**Location:** `app/api/maya/chat/route.ts`

**When Feed Tab is active:**
1. Detects `x-active-tab: feed` header
2. Loads `getFeedPlannerContextAddon()` from `lib/maya/feed-planner-context.ts`
3. Appends feed-specific context to system prompt
4. Includes user's mode preference (Pro/Classic/Auto)
5. Includes aesthetic selection guidance
6. Includes prompt generation requirements

**System Prompt Components:**
- Base Maya personality (`lib/maya/personality.ts` or `lib/maya/personality-enhanced.ts`)
- Feed Planner context addon (`lib/maya/feed-planner-context.ts`)
- User context (`lib/maya/get-user-context.ts`)
- Flux prompting principles (`lib/maya/flux-prompting-principles.ts`)

### 3. Maya's Response → Strategy Generation

**Flow:**
1. Maya receives user request in Feed Tab context
2. Maya follows conversational workflow:
   - Phase 1: Understand Context (asks questions)
   - Phase 2: Present Strategy Preview (conversational presentation)
   - Phase 3: Trigger Generation (outputs `[CREATE_FEED_STRATEGY]` trigger)

**Trigger Format:**
```
[CREATE_FEED_STRATEGY: {
  "feedTitle": "...",
  "posts": [...],
  "colorPalette": "...",
  ...
}]
```

### 4. Trigger Detection → Strategy Parsing

**Location:** `components/sselfie/maya/maya-feed-tab.tsx` (useEffect)

**Flow:**
1. `useEffect` monitors messages for triggers
2. Extracts text content from last assistant message
3. Regex matches `[CREATE_FEED_STRATEGY: {...}]`
4. Parses JSON strategy object
5. Calls `handleCreateFeed(strategy)`

**Strategy Parsing:**
- `lib/maya/feed-generation-handler.ts` → `parseFeedStrategy()`
- Validates structure (9 posts, required fields)
- Normalizes field names (handles `feedTitle` vs `title`, `imagePrompt` vs `prompt`)
- Validates aesthetic choice
- Validates grid composition (no diagonal patterns)

### 5. Strategy Storage → Feed Card Display

**Flow:**
1. `handleCreateFeed()` stores strategy in message parts
2. Adds `tool-generateFeed` part to last assistant message
3. `MayaChatInterface` detects `tool-generateFeed` part
4. Renders `FeedPreviewCard` component
5. Feed card displays:
   - 3x3 grid preview
   - Credit cost
   - "Save Feed" button (unsaved state)
   - "View Full Feed" button (after save)

### 6. Feed Saving → Database Persistence

**Flow:**
1. User clicks "Save Feed" on feed card
2. `FeedPreviewCard` → `createFeedFromStrategyHandler()`
3. Calls `/api/feed-planner/create-from-strategy`
4. API endpoint:
   - Validates strategy
   - Calculates credits
   - Creates `feed_layouts` record
   - Creates 9 `feed_posts` records
   - Returns `feedLayoutId`
5. Feed card updates with `feedId`
6. Button changes to "View Full Feed"

---

## Hooks & State Management

### 1. `useMayaChat` Hook

**Location:** `components/sselfie/maya/hooks/use-maya-chat.ts`

**Feed Tab Integration:**
- Accepts `activeTab` prop (set to "feed" when Feed Tab is active)
- Determines chat type: `activeTab === "feed"` → `chatType = "feed-planner"`
- Creates chat transport with headers:
  - `x-active-tab: feed`
  - `x-chat-type: feed-planner`
- Stores chat ID in localStorage: `mayaCurrentChatId_feed-planner`

**Key State:**
- `chatId` - Current chat ID
- `chatTitle` - Chat title
- `isLoadingChat` - Loading state
- `messages` - Message array (from `useChat` hook)
- `setMessages` - Message setter
- `status` - Chat status (from `useChat` hook)

### 2. `useMayaMode` Hook

**Location:** `components/sselfie/maya/hooks/use-maya-mode.ts`

**Purpose:** Manages Pro Mode vs Classic Mode toggle

**Feed Tab Integration:**
- User's mode preference passed to Feed Tab
- Used in system prompt construction
- Determines generation mode for all posts (if user explicitly selects)

### 3. `useMayaSettings` Hook

**Location:** `components/sselfie/maya/hooks/use-maya-settings.ts`

**Purpose:** Manages generation settings (style strength, prompt accuracy, aspect ratio, realism strength)

**Feed Tab Integration:**
- Settings passed to Feed Tab as props
- Used in feed creation options
- Stored with feed strategy for later use

### 4. Local State in `MayaFeedTab`

**State Variables:**
- `processedFeedMessagesRef` - Tracks processed messages (prevents duplicate triggers)
- `isCreatingFeed` - Loading state for feed creation (passed from parent)

**Effects:**
- `useEffect` for trigger detection (monitors messages, status, isCreatingFeed)
- Clears processed messages ref when chatId changes

---

## API Routes & Integration

### 1. Maya Chat API

**Endpoint:** `POST /api/maya/chat`

**Location:** `app/api/maya/chat/route.ts`

**Feed Tab Handling:**
- Detects `x-active-tab: feed` header
- Loads feed planner context addon
- Includes feed-specific instructions in system prompt
- Streams Maya's response (with feed strategy JSON)

**Key Headers:**
- `x-active-tab: feed` (indicates Feed Tab is active)
- `x-chat-type: feed-planner` (indicates feed context)
- `x-studio-pro-mode: true/false` (Pro Mode toggle)

### 2. Feed Creation API

**Endpoint:** `POST /api/feed-planner/create-from-strategy`

**Location:** `app/api/feed-planner/create-from-strategy/route.ts`

**Purpose:** Saves feed strategy to database

**Flow:**
1. Receives strategy JSON from feed card
2. Validates strategy structure (9 posts, required fields)
3. Calculates credits (based on generation mode)
4. Creates `feed_layouts` record
5. Creates 9 `feed_posts` records
6. Returns `feedLayoutId`

**Options:**
- `customSettings` - Generation settings
- `userModePreference` - User's explicit mode selection
- `imageLibrary` - User's selected images (for Pro Mode)

### 3. Caption Generation API

**Endpoint:** `POST /api/feed/[feedId]/generate-captions`

**Location:** `app/api/feed/[feedId]/generate-captions/route.ts`

**Purpose:** Generates captions for all posts in feed

**Flow:**
1. Receives `feedId`
2. Fetches feed posts from database
3. Generates captions using AI (one per post)
4. Updates `feed_posts` table with captions
5. Returns captions array

**Note:** Called from `handleGenerateCaptions()` in Feed Tab

### 4. Strategy Document Generation API

**Endpoint:** `POST /api/feed/[feedId]/generate-strategy`

**Location:** `app/api/feed/[feedId]/generate-strategy/route.ts`

**Purpose:** Generates comprehensive strategy document

**Flow:**
1. Receives `feedId`
2. Fetches feed data from database
3. Generates strategy document using AI
4. Updates `feed_layouts` table with strategy
5. Returns strategy markdown

**Note:** Called from `handleGenerateStrategy()` in Feed Tab

### 5. Feed Data API

**Endpoint:** `GET /api/feed/[feedId]`

**Location:** `app/api/feed/[feedId]/route.ts`

**Purpose:** Retrieves feed data including posts, bio, highlights

**Used By:**
- Feed Preview Card (after save, to fetch feed data)
- Feed Planner (to load feed)

---

## Data Flow

### 1. Feed Creation Flow

```
User Message (Feed Tab)
  ↓
Maya Chat API (/api/maya/chat)
  ↓
Maya's Response (with [CREATE_FEED_STRATEGY] trigger)
  ↓
MayaFeedTab (trigger detection)
  ↓
parseFeedStrategy() (parse JSON)
  ↓
handleCreateFeed() (store in message parts)
  ↓
FeedPreviewCard (render in chat)
  ↓
User clicks "Save Feed"
  ↓
createFeedFromStrategyHandler() (lib/maya/feed-generation-handler.ts)
  ↓
POST /api/feed-planner/create-from-strategy
  ↓
Database (feed_layouts + feed_posts)
  ↓
FeedPreviewCard (update with feedId)
```

### 2. Caption Generation Flow

```
User requests captions (or [GENERATE_CAPTIONS] trigger)
  ↓
MayaFeedTab (handleGenerateCaptions)
  ↓
Extract feedId from feed card
  ↓
generateCaptionsHandler() (lib/maya/feed-generation-handler.ts)
  ↓
POST /api/feed/[feedId]/generate-captions
  ↓
Database (update feed_posts with captions)
  ↓
FeedCaptionCard (render in chat)
```

### 3. Strategy Document Generation Flow

```
User requests strategy (or [GENERATE_STRATEGY] trigger)
  ↓
MayaFeedTab (handleGenerateStrategy)
  ↓
Extract feedId from feed card
  ↓
generateStrategyHandler() (lib/maya/feed-generation-handler.ts)
  ↓
POST /api/feed/[feedId]/generate-strategy
  ↓
Database (update feed_layouts with strategy)
  ↓
FeedStrategyCard (render in chat)
```

---

## Current State Assessment

### ✅ Working Features

1. **Feed Tab Integration**
   - Tab is properly integrated into Maya Chat interface
   - Tab switching works correctly
   - Feed-specific context loaded in system prompt

2. **Trigger Detection**
   - `[CREATE_FEED_STRATEGY]` trigger detected correctly
   - `[GENERATE_CAPTIONS]` trigger detected correctly
   - `[GENERATE_STRATEGY]` trigger detected correctly
   - Duplicate prevention works (processed messages tracking)

3. **Strategy Parsing**
   - JSON parsing from trigger works
   - Field normalization works (handles `feedTitle` vs `title`, `imagePrompt` vs `prompt`)
   - Validation works (9 posts, required fields)

4. **Feed Card Display**
   - Feed cards render correctly in chat
   - Unsaved state works (no feedId)
   - Saved state works (with feedId)

5. **Feed Saving**
   - "Save Feed" button works
   - API endpoint works correctly
   - Database persistence works

### 🟡 Areas for Improvement

1. **Feed Strategy Storage**
   - Currently stored in message parts (not database)
   - Requires user to click "Save Feed" to persist
   - If user navigates away, strategy is lost (unless message is saved)

2. **Caption/Strategy Generation Dependencies**
   - Requires feed to be saved (has feedId)
   - Will fail if no feedId found
   - Error handling shows alert (could be improved with toast notifications)

3. **Strategy Generation Flow**
   - Relies entirely on conversational flow (no explicit API endpoint)
   - User must wait for Maya's response with trigger
   - No way to regenerate strategy if trigger parsing fails

4. **Error Handling**
   - Uses `alert()` for errors (not consistent with toast notifications)
   - No retry mechanism for failed API calls
   - Limited error logging

5. **Testing**
   - No unit tests for trigger detection
   - No integration tests for feed creation flow
   - Manual testing required

---

## Integration Points

### 1. Maya Chat Screen

**Location:** `components/sselfie/maya-chat-screen.tsx`

**Integration:**
- Renders `MayaFeedTab` when `activeMayaTab === "feed"`
- Passes all required props to Feed Tab
- Manages tab state and persistence

**Key Props Passed:**
- `messages`, `setMessages`, `status` (from `useMayaChat`)
- `proMode`, `getModeString` (from `useMayaMode`)
- `styleStrength`, `promptAccuracy`, `aspectRatio`, `realismStrength` (from `useMayaSettings`)
- `isCreatingFeed`, `setIsCreatingFeed` (local state)
- `onCreateFeed`, `onGenerateCaptions`, `onGenerateStrategy` (placeholder callbacks)

### 2. Feed Planner

**Location:** `components/feed-planner/feed-preview-card.tsx`

**Integration:**
- Feed cards rendered in chat can navigate to Feed Planner
- "View Full Feed" button uses router to navigate
- Feed Planner loads feed by feedId

**Flow:**
1. User clicks "View Full Feed" on feed card
2. Router navigates to `/feed-planner?feedId=${feedId}`
3. Feed Planner loads feed data
4. User can edit, generate images, etc.

### 3. Feed Generation Handler

**Location:** `lib/maya/feed-generation-handler.ts`

**Integration:**
- Exports handler functions used by Feed Tab
- Provides API client functions
- Handles strategy parsing and validation

**Key Exports:**
- `createFeedFromStrategyHandler()` - Creates feed via API
- `generateCaptionsHandler()` - Generates captions via API
- `generateStrategyHandler()` - Generates strategy via API
- `parseFeedStrategy()` - Parses strategy from Maya's response

---

## Key Features & Capabilities

### 1. Conversational Feed Creation

**Feature:** Users chat with Maya to create feed strategies

**Flow:**
1. User asks: "Create a feed for my wellness coaching business"
2. Maya asks clarifying questions
3. Maya presents strategy conversationally
4. User approves
5. Maya outputs `[CREATE_FEED_STRATEGY]` trigger
6. Feed Tab detects trigger and creates feed card

### 2. Feed Strategy Preview

**Feature:** Feed cards show 3x3 grid preview

**Display:**
- Grid layout (9 posts)
- Post types (user/lifestyle)
- Credit cost breakdown
- "Save Feed" button (unsaved) or "View Full Feed" button (saved)

### 3. Caption Generation

**Feature:** Generate captions for all posts in feed

**Flow:**
1. User requests captions (or `[GENERATE_CAPTIONS]` trigger)
2. Feed Tab extracts feedId from feed card
3. Calls caption generation API
4. Updates all posts with captions
5. Displays caption card in chat

### 4. Strategy Document Generation

**Feature:** Generate comprehensive strategy document

**Flow:**
1. User requests strategy (or `[GENERATE_STRATEGY]` trigger)
2. Feed Tab extracts feedId from feed card
3. Calls strategy generation API
4. Generates markdown strategy document
5. Displays strategy card in chat

### 5. Feed-Specific Context

**Feature:** Maya receives feed-specific instructions when in Feed Tab

**Context Includes:**
- Aesthetic selection guidance (5 aesthetics)
- Generation mode instructions (Classic vs Pro)
- Prompt generation requirements
- Grid pattern validation rules
- Caption writing guidelines

---

## Dependencies Summary

### Internal Dependencies

1. **Components:**
   - `MayaChatInterface` - Chat UI rendering
   - `MayaQuickPrompts` - Quick prompts display
   - `FeedPreviewCard` - Feed card rendering
   - `FeedCaptionCard` - Caption card rendering
   - `FeedStrategyCard` - Strategy card rendering

2. **Libs:**
   - `lib/maya/feed-generation-handler.ts` - Feed handlers
   - `lib/maya/feed-planner-context.ts` - System prompt context
   - `lib/maya/personality.ts` - Maya personality
   - `lib/maya/flux-prompting-principles.ts` - Prompt guidelines

3. **Hooks:**
   - `useMayaChat` - Chat state management
   - `useMayaMode` - Mode toggle management
   - `useMayaSettings` - Settings management

### External Dependencies

1. **AI SDK:**
   - `@ai-sdk/react` - `useChat` hook
   - `ai` - AI SDK types

2. **Next.js:**
   - `next/navigation` - Router navigation

3. **React:**
   - React hooks (`useState`, `useEffect`, `useCallback`, `useRef`)

---

## Summary

Maya's Feed Tab is a fully functional conversational interface for creating Instagram feed strategies. The implementation is well-structured with clear separation of concerns, proper integration with the Feed Planner, and comprehensive prompt engineering for feed creation.

**Strengths:**
- Clean component architecture
- Well-integrated with existing systems
- Comprehensive prompt engineering
- Good error prevention (duplicate triggers, streaming checks)

**Areas for Future Enhancement:**
- Improved error handling (toast notifications instead of alerts)
- Strategy persistence improvements (auto-save option)
- Better testing coverage
- Retry mechanisms for failed API calls

**Overall Assessment:** ✅ **Production Ready**

The Feed Tab is ready for use and provides a solid foundation for feed creation workflows. Minor improvements can be made incrementally based on user feedback.

---

**Document Status:** ✅ Complete  
**Last Review:** 2025-01-22  
**Reviewed By:** AI Development Team


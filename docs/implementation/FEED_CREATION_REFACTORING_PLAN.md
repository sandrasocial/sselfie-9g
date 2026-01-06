# Feed Creation Refactoring Plan
**Based on:** FEED_CREATION_AUDIT.md  
**Goal:** Simplify feed creation to match concept card architecture  
**Estimated Time:** 2-3 days  
**Risk Level:** Low (concept cards prove the pattern works)

---

## Overview

Refactor feed creation flow to match the simpler, more reliable concept card pattern. This will reduce complexity by ~70%, improve maintainability, and ensure consistency across the codebase.

---

## Phase 1: Foundation (Day 1 - Morning)

### **Step 1.1: Create API Endpoint** 🔴 Priority 1

**Goal:** Move JSON processing from component to API endpoint

**Files to Create:**
- `app/api/maya/generate-feed/route.ts` (Classic Mode)
- `app/api/maya/pro/generate-feed/route.ts` (Pro Mode)

**Implementation:**

```typescript
// app/api/maya/generate-feed/route.ts
import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"

export async function POST(req: Request) {
  try {
    const { user } = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await req.json()
    const { strategyJson, chatId, conversationContext } = body

    // Validate JSON structure
    let strategy
    try {
      const parsed = JSON.parse(strategyJson)
      // Unwrap if nested
      strategy = parsed.feedStrategy || parsed
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON format" },
        { status: 400 }
      )
    }

    // Validate strategy structure
    if (!strategy.posts || !Array.isArray(strategy.posts) || strategy.posts.length !== 9) {
      return NextResponse.json(
        { error: "Strategy must contain exactly 9 posts" },
        { status: 400 }
      )
    }

    // Return validated strategy
    return NextResponse.json({
      success: true,
      strategy,
    })
  } catch (error) {
    console.error("[generate-feed] Error:", error)
    return NextResponse.json(
      { error: "Failed to process feed strategy" },
      { status: 500 }
    )
  }
}
```

**Pro Mode Endpoint:**
- Similar structure but can leverage `imageLibrary` and Pro Mode features
- Can add additional validation/processing for Pro Mode

**Testing:**
- Test with valid JSON
- Test with invalid JSON
- Test with nested `feedStrategy` object
- Test with missing posts
- Test with wrong post count

**Dependencies:** None  
**Estimated Time:** 2 hours

---

### **Step 1.2: Simplify Trigger Detection** 🔴 Priority 1

**Goal:** Reduce from 4 patterns to 1 simple pattern

**File to Modify:**
- `components/sselfie/maya/maya-feed-tab.tsx`

**Current Code (Lines 471-512):**
```typescript
// 4 patterns + partial trigger detection (complex)
```

**New Code:**
```typescript
// Simple, single pattern like concept cards
const feedMatch = textContent.match(/\[CREATE_FEED_STRATEGY:\s*(\{[\s\S]*\})\]/i) || 
                  textContent.match(/\[CREATE_FEED_STRATEGY\]/i)

if (feedMatch) {
  // Extract JSON if present
  const strategyJson = feedMatch[1] || null
  // Process via API endpoint
}
```

**Changes:**
1. Remove Pattern 2 (code block detection)
2. Remove Pattern 3 (standalone JSON)
3. Remove Pattern 4 (partial trigger detection)
4. Keep only Pattern 1 (simple trigger with JSON)

**Why This Works:**
- Concept cards work fine with single pattern
- Maya should output consistent format
- Simpler = more reliable

**Testing:**
- Test with `[CREATE_FEED_STRATEGY: {...}]`
- Test with `[CREATE_FEED_STRATEGY]` (no JSON yet)
- Verify old patterns still work (backward compat during transition)

**Dependencies:** Step 1.1 (API endpoint)  
**Estimated Time:** 1 hour

---

### **Step 1.3: Split Detection and Processing** 🔴 Priority 1

**Goal:** Separate detection from processing (like concept cards)

**File to Modify:**
- `components/sselfie/maya/maya-feed-tab.tsx`

**Current Structure:**
```typescript
// Single massive useEffect doing everything
useEffect(() => {
  // Detection + Processing (600+ lines)
}, [messages, status, isCreatingFeed])
```

**New Structure:**
```typescript
// Step 1: Detection (simple state update)
const [pendingFeedRequest, setPendingFeedRequest] = useState<{
  strategyJson: string
  messageId: string
} | null>(null)

useEffect(() => {
  // Simple detection only
  if (messages.length === 0) return
  if (isCreatingFeed) return
  
  const lastAssistantMessage = messages
    .filter((m: any) => m.role === "assistant")
    .slice(-1)[0]
  
  if (!lastAssistantMessage) return
  
  // Check if already processed
  if (processedFeedMessagesRef.current.has(lastAssistantMessage.id)) {
    return
  }
  
  // Simple trigger detection
  const textContent = extractTextContent(lastAssistantMessage)
  const feedMatch = textContent.match(/\[CREATE_FEED_STRATEGY:\s*(\{[\s\S]*\})\]/i)
  
  if (feedMatch) {
    const strategyJson = feedMatch[1]
    if (strategyJson) {
      setPendingFeedRequest({
        strategyJson,
        messageId: lastAssistantMessage.id
      })
      processedFeedMessagesRef.current.add(lastAssistantMessage.id)
    }
  }
}, [messages, status, isCreatingFeed])

// Step 2: Processing (separate useEffect)
useEffect(() => {
  if (!pendingFeedRequest || isCreatingFeed) return
  
  const processFeed = async () => {
    setIsCreatingFeed(true)
    try {
      // Call API endpoint
      const response = await fetch('/api/maya/generate-feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyJson: pendingFeedRequest.strategyJson,
          chatId,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to process feed strategy')
      }
      
      const data = await response.json()
      const strategy = data.strategy
      
      // Call handleCreateFeed with validated strategy
      await handleCreateFeed(strategy)
    } catch (error) {
      console.error("[FEED] Error processing feed:", error)
      // Reset state on error
      processedFeedMessagesRef.current.delete(pendingFeedRequest.messageId)
    } finally {
      setIsCreatingFeed(false)
      setPendingFeedRequest(null)
    }
  }
  
  processFeed()
}, [pendingFeedRequest, isCreatingFeed, chatId, handleCreateFeed])
```

**Benefits:**
- Clean separation of concerns
- Easier to debug
- Consistent with concept cards
- Simpler state management

**Testing:**
- Verify detection works
- Verify processing works
- Verify error handling
- Verify state cleanup

**Dependencies:** Step 1.1, Step 1.2  
**Estimated Time:** 2 hours

---

## Phase 2: Simplification (Day 1 - Afternoon)

### **Step 2.1: Remove Unnecessary Refs** 🟡 Priority 2

**Goal:** Simplify ref management

**File to Modify:**
- `components/sselfie/maya/maya-feed-tab.tsx`

**Current Refs:**
```typescript
const processedFeedMessagesRef = useRef<Set<string>>(new Set())
const partialTriggerProcessedRef = useRef<Set<string>>(new Set())
const handleCreateFeedRef = useRef<((strategy: FeedStrategy) => Promise<void>) | null>(null)
```

**New Refs:**
```typescript
// Only keep what's needed (like concept cards)
const processedFeedMessagesRef = useRef<Set<string>>(new Set())
```

**Changes:**
1. Remove `partialTriggerProcessedRef` (no longer needed with simple detection)
2. Remove `handleCreateFeedRef` (can use `handleCreateFeed` directly in dependencies)
3. Simplify `messageKey` generation (use `messageId` directly, like concept cards)

**Why This Works:**
- Concept cards only use one ref
- Simple detection = no need for partial trigger tracking
- `handleCreateFeed` is stable (useCallback), safe to use in dependencies

**Testing:**
- Verify no infinite loops
- Verify messages processed correctly
- Verify state updates work

**Dependencies:** Step 1.3  
**Estimated Time:** 1 hour

---

### **Step 2.2: Simplify Message Key Generation** 🟡 Priority 2

**Goal:** Use simple messageId like concept cards

**File to Modify:**
- `components/sselfie/maya/maya-feed-tab.tsx`

**Current Code:**
```typescript
// Complex hash function for streaming messages
let messageKey: string
if (messageId) {
  messageKey = messageId
} else {
  // Generate hash from content
  let hash = 0
  for (let i = 0; i < textContentForKey.length; i++) {
    const char = textContentForKey.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  const contentHash = Math.abs(hash).toString(36)
  messageKey = `streaming-${contentHash}`
}
```

**New Code:**
```typescript
// Simple: Use messageId directly (like concept cards)
if (!messageId) {
  console.log("[FEED] ⏸️ Message has no ID yet, skipping")
  return
}

// Use messageId as key
if (processedFeedMessagesRef.current.has(messageId)) {
  return
}
```

**Why This Works:**
- Concept cards work fine with just messageId
- Messages get IDs quickly during streaming
- Simpler = more reliable

**Testing:**
- Verify works with messageId
- Verify handles missing ID gracefully
- Verify no duplicate processing

**Dependencies:** Step 2.1  
**Estimated Time:** 30 minutes

---

### **Step 2.3: Simplify Saving Logic** 🟡 Priority 2

**Goal:** Remove retry logic, use single save call

**File to Modify:**
- `components/sselfie/maya/maya-feed-tab.tsx`

**Current Code:**
```typescript
// Complex retry logic with update-message → save-message fallback
const saveFeedCard = async (retryCount = 0): Promise<void> => {
  try {
    const response = await fetch('/api/maya/update-message', { /* ... */ })
    if (response.status === 404 && retryCount === 0) {
      // Retry with save-message
      await fetch('/api/maya/save-message', { /* ... */ })
    }
  } catch (error) { /* ... */ }
}
```

**New Code:**
```typescript
// Simple: Single save call (like concept cards)
if (messageIdToSave && chatId) {
  fetch('/api/maya/save-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId,
      role: 'assistant',
      content: messageContentToSave || "",
      feedCards: [feedCardData],
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        console.log("[FEED] ✅ Saved feed card to database")
      }
    })
    .catch((error) => {
      console.error("[FEED] Error saving feed card:", error)
      // Non-critical - feed card still works
    })
}
```

**Why This Works:**
- Concept cards use single save call
- `save-message` handles both new and existing messages
- Simpler = more reliable

**Testing:**
- Verify saves correctly
- Verify handles errors gracefully
- Verify works with existing messages

**Dependencies:** Step 1.3  
**Estimated Time:** 1 hour

---

## Phase 3: Pro Mode Support (Day 2 - Morning)

### **Step 3.1: Add Pro Mode API Endpoint** 🟡 Priority 3

**Goal:** Create Pro Mode endpoint like concept cards

**File to Create:**
- `app/api/maya/pro/generate-feed/route.ts`

**Implementation:**

```typescript
// app/api/maya/pro/generate-feed/route.ts
import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"

export async function POST(req: Request) {
  try {
    const { user } = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const body = await req.json()
    const { strategyJson, chatId, imageLibrary, conversationContext } = body

    // Validate JSON (same as Classic Mode)
    let strategy
    try {
      const parsed = JSON.parse(strategyJson)
      strategy = parsed.feedStrategy || parsed
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON format" },
        { status: 400 }
      )
    }

    // Pro Mode enhancements:
    // - Can use imageLibrary for reference
    // - Can add Pro Mode specific validation
    // - Can enhance strategy with Pro Mode features

    return NextResponse.json({
      success: true,
      strategy,
      proMode: true,
    })
  } catch (error) {
    console.error("[generate-feed-pro] Error:", error)
    return NextResponse.json(
      { error: "Failed to process feed strategy" },
      { status: 500 }
    )
  }
}
```

**Testing:**
- Test with imageLibrary
- Test Pro Mode specific features
- Verify backward compatibility

**Dependencies:** Step 1.1  
**Estimated Time:** 1.5 hours

---

### **Step 3.2: Update Component to Use Pro Mode Endpoint** 🟡 Priority 3

**Goal:** Call different endpoint based on proMode

**File to Modify:**
- `components/sselfie/maya/maya-feed-tab.tsx`

**Changes:**
```typescript
// In processing useEffect
const apiEndpoint = proMode 
  ? '/api/maya/pro/generate-feed'
  : '/api/maya/generate-feed'

const requestBody = proMode
  ? {
      strategyJson: pendingFeedRequest.strategyJson,
      chatId,
      imageLibrary, // Pro Mode specific
      conversationContext,
    }
  : {
      strategyJson: pendingFeedRequest.strategyJson,
      chatId,
      conversationContext,
    }

const response = await fetch(apiEndpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestBody),
})
```

**Testing:**
- Test Classic Mode
- Test Pro Mode
- Verify correct endpoint called
- Verify Pro Mode features work

**Dependencies:** Step 3.1  
**Estimated Time:** 1 hour

---

## Phase 4: Database Consistency (Day 2 - Afternoon)

### **Step 4.1: Add feed_cards Column** 🟡 Priority 4

**Goal:** Use dedicated column like concept_cards

**File to Create:**
- `migrations/add-feed-cards-column.sql`

**SQL:**
```sql
-- Add feed_cards column to maya_chat_messages table
-- This matches the concept_cards column pattern for consistency

ALTER TABLE maya_chat_messages
ADD COLUMN IF NOT EXISTS feed_cards JSONB;

-- Add comment
COMMENT ON COLUMN maya_chat_messages.feed_cards IS 'Feed cards data (similar to concept_cards). Previously stored in styling_details.';

-- Migrate existing data from styling_details to feed_cards
UPDATE maya_chat_messages
SET feed_cards = styling_details
WHERE styling_details IS NOT NULL
  AND styling_details::text LIKE '%"feedStrategy"%'
  AND feed_cards IS NULL;
```

**Testing:**
- Verify column added
- Verify data migrated
- Verify existing feeds still work

**Dependencies:** None  
**Estimated Time:** 30 minutes

---

### **Step 4.2: Update Save Functions** 🟡 Priority 4

**Goal:** Use feed_cards column instead of styling_details

**Files to Modify:**
- `lib/data/maya.ts` (saveChatMessage function)
- `app/api/maya/save-message/route.ts`
- `app/api/maya/update-message/route.ts`

**Changes:**
```typescript
// lib/data/maya.ts
export async function saveChatMessage(
  chatId: number,
  role: "user" | "assistant" | "system",
  content: string,
  conceptCards?: any[],
  feedCards?: any[],
): Promise<MayaChatMessage> {
  const feedCardsJson = feedCards && feedCards.length > 0 ? JSON.stringify(feedCards) : null
  
  return await sql`
    INSERT INTO maya_chat_messages (chat_id, role, content, concept_cards, feed_cards)
    VALUES (${chatId}, ${role}, ${safeContent}, ${conceptCards ? JSON.stringify(conceptCards) : null}, ${feedCardsJson})
    RETURNING *
  `
}
```

**Testing:**
- Verify saves to feed_cards
- Verify reads from feed_cards
- Verify backward compatibility

**Dependencies:** Step 4.1  
**Estimated Time:** 1 hour

---

### **Step 4.3: Update Load Functions** 🟡 Priority 4

**Goal:** Read from feed_cards column

**Files to Modify:**
- `app/api/maya/load-chat/route.ts`

**Changes:**
```typescript
// Read feed_cards from dedicated column
const feedCards = message.feed_cards || null
// Fallback to styling_details for backward compatibility
const feedCardsFromStyling = message.styling_details && 
  typeof message.styling_details === 'object' &&
  Array.isArray(message.styling_details) 
  ? message.styling_details 
  : null

const finalFeedCards = feedCards || feedCardsFromStyling
```

**Testing:**
- Verify reads from feed_cards
- Verify fallback to styling_details works
- Verify existing feeds load correctly

**Dependencies:** Step 4.2  
**Estimated Time:** 1 hour

---

## Phase 5: Testing & Validation (Day 3 - Morning)

### **Step 5.1: Integration Testing** 🔴 Priority 1

**Test Cases:**

1. **Basic Feed Creation**
   - Create feed in Classic Mode
   - Verify feed card appears
   - Verify saves to database
   - Verify loads on page refresh

2. **Pro Mode Feed Creation**
   - Create feed in Pro Mode
   - Verify Pro Mode endpoint called
   - Verify feed card appears
   - Verify Pro Mode features work

3. **Error Handling**
   - Test with invalid JSON
   - Test with missing posts
   - Test with network errors
   - Verify graceful error handling

4. **Edge Cases**
   - Test with streaming messages
   - Test with page refresh
   - Test with multiple feeds
   - Test with duplicate triggers

5. **Backward Compatibility**
   - Verify old feeds still load
   - Verify styling_details fallback works
   - Verify migration completed

**Estimated Time:** 2 hours

---

### **Step 5.2: Update Documentation** 🟡 Priority 2

**Files to Update:**
- Code comments
- README if applicable
- API documentation

**Content:**
- Document new API endpoints
- Document simplified flow
- Document Pro Mode differences
- Document database schema changes

**Estimated Time:** 1 hour

---

## Phase 6: Final Cleanup (Day 3 - Afternoon)

**⚠️ IMPORTANT: Only execute this phase AFTER confirming everything works correctly in production for at least 1 week**

### **Step 6.1: Remove Old Trigger Detection Patterns** 🟡 Priority 3

**Goal:** Remove all old trigger detection code that's no longer needed

**File to Modify:**
- `components/sselfie/maya/maya-feed-tab.tsx`

**Code to Remove:**

1. **Pattern 2: Code Block Detection**
   ```typescript
   // REMOVE: Pattern 2: [CREATE_FEED_STRATEGY] followed by JSON block
   if (!feedStrategyMatch && textContent.includes("[CREATE_FEED_STRATEGY]")) {
     const jsonBlockMatch = textContent.match(/\[CREATE_FEED_STRATEGY\][\s\S]*?(```json\s*(\{[\s\S]*?\})\s*```|\{[\s\S]*?"feedStrategy"[\s\S]*?\})/i)
     // ... remove entire block
   }
   ```

2. **Pattern 3: Standalone JSON Detection**
   ```typescript
   // REMOVE: Pattern 3: Look for standalone JSON with "feedStrategy" key
   if (!feedStrategyMatch) {
     const standaloneJsonMatch = textContent.match(/\{\s*"feedStrategy"[\s\S]*?\}/i)
     // ... remove entire block
   }
   ```

3. **Pattern 4: Partial Trigger Detection**
   ```typescript
   // REMOVE: Pattern 4: Check for partial trigger during streaming
   const hasPartialTrigger = textContent.includes("[CREATE_FEED_STRATEGY") || 
                            textContent.includes('"feedStrategy"') ||
                            textContent.includes("Aesthetic Choice:") ||
                            textContent.includes("Overall Vibe:") ||
                            textContent.includes("Grid Layout:")
   
   if (hasPartialTrigger && status === "streaming" && !isCreatingFeed) {
     // ... remove entire block
   }
   ```

**Verification:**
- ✅ Confirm new simple pattern handles all cases
- ✅ Test with various trigger formats
- ✅ Verify no regressions

**Estimated Time:** 30 minutes

---

### **Step 6.2: Remove Complex Hash Function** 🟡 Priority 3

**Goal:** Remove message key hash generation (no longer needed)

**File to Modify:**
- `components/sselfie/maya/maya-feed-tab.tsx`

**Code to Remove:**
```typescript
// REMOVE: Complex hash function for streaming messages
let messageKey: string
if (messageId) {
  messageKey = messageId
} else {
  // Generate a key from message content for tracking during streaming
  const textContentForKey = lastAssistantMessage.parts?.find((p: any) => p?.type === "text")?.text || lastAssistantMessage.content || ""
  if (!textContentForKey) {
    console.log("[FEED] ⏸️ Last assistant message has no ID and no content")
    return
  }
  // Use a hash of the content for collision-resistant key generation
  let hash = 0
  for (let i = 0; i < textContentForKey.length; i++) {
    const char = textContentForKey.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  const contentHash = Math.abs(hash).toString(36)
  messageKey = `streaming-${contentHash}`
}
```

**Replace With:**
```typescript
// Simple: Use messageId directly (like concept cards)
if (!messageId) {
  console.log("[FEED] ⏸️ Message has no ID yet, skipping")
  return
}
```

**Verification:**
- ✅ Confirm messageId is always available when needed
- ✅ Test with streaming messages
- ✅ Verify no duplicate processing

**Estimated Time:** 15 minutes

---

### **Step 6.3: Remove Unused Refs** 🟡 Priority 3

**Goal:** Remove refs that are no longer needed

**File to Modify:**
- `components/sselfie/maya/maya-feed-tab.tsx`

**Code to Remove:**

1. **Remove partialTriggerProcessedRef**
   ```typescript
   // REMOVE: No longer needed with simple detection
   const partialTriggerProcessedRef = useRef<Set<string>>(new Set())
   
   // REMOVE: Clear call
   partialTriggerProcessedRef.current.clear()
   
   // REMOVE: All usages
   partialTriggerProcessedRef.current.add(messageKey)
   partialTriggerProcessedRef.current.has(messageKey)
   partialTriggerProcessedRef.current.delete(messageKey)
   ```

2. **Remove handleCreateFeedRef**
   ```typescript
   // REMOVE: No longer needed - can use handleCreateFeed directly
   const handleCreateFeedRef = useRef<((strategy: FeedStrategy) => Promise<void>) | null>(null)
   
   // REMOVE: Update effect
   useEffect(() => {
     handleCreateFeedRef.current = handleCreateFeed
   }, [handleCreateFeed])
   
   // REMOVE: Usage in processFeedCreation
   const createFeedHandler = handleCreateFeedRef.current || handleCreateFeed
   await createFeedHandler(strategy)
   
   // REPLACE WITH:
   await handleCreateFeed(strategy)
   ```

**Verification:**
- ✅ Confirm no infinite loops
- ✅ Test feed creation
- ✅ Verify state management works

**Estimated Time:** 30 minutes

---

### **Step 6.4: Remove Retry Logic in Save Function** 🟡 Priority 3

**Goal:** Simplify save function (single call like concept cards)

**File to Modify:**
- `components/sselfie/maya/maya-feed-tab.tsx`

**Code to Remove:**
```typescript
// REMOVE: Complex retry logic with update-message → save-message fallback
const saveFeedCard = async (retryCount = 0): Promise<void> => {
  try {
    const response = await fetch('/api/maya/update-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messageId: messageIdToSave,
        content: messageContentToSave || "",
        feedCards: [feedCardData],
        append: false,
      }),
      credentials: 'include',
    })
    
    if (response.ok) {
      console.log("[FEED] ✅ Saved feed card to styling_details column for persistence")
      return
    }
    
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
    
    // If message doesn't exist (404) and we haven't retried, save it first
    if (response.status === 404 && retryCount === 0 && chatId) {
      console.log("[FEED] ⚠️ Message not found, saving message first, then retrying update")
      
      // Save message first with feed cards
      const saveResponse = await fetch('/api/maya/save-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          chatId: chatId,
          role: 'assistant',
          content: messageContentToSave || "",
          feedCards: [feedCardData],
        }),
      })
      
      if (saveResponse.ok) {
        console.log("[FEED] ✅ Saved message with feed cards to database")
      } else {
        console.error("[FEED] ⚠️ Failed to save message:", saveResponse.status)
      }
    } else {
      console.error("[FEED] ⚠️ Failed to save feed card to database:", response.status, errorData)
    }
  } catch (error: any) {
    console.error("[FEED] ⚠️ Network/Request error saving feed card to database:", {
      error: error.message || String(error),
      errorName: error.name,
      errorStack: error.stack,
      messageId: messageIdToSave,
      chatId: chatId,
    })
    // Non-critical error - feed card will still work, just won't persist on refresh
  }
}

// Attempt to save (with automatic retry if message doesn't exist)
saveFeedCard()
```

**Keep Simple Version:**
```typescript
// Simple: Single save call (already implemented in Step 2.3)
if (messageIdToSave && chatId) {
  fetch('/api/maya/save-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId,
      role: 'assistant',
      content: messageContentToSave || "",
      feedCards: [feedCardData],
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        console.log("[FEED] ✅ Saved feed card to database")
      }
    })
    .catch((error) => {
      console.error("[FEED] Error saving feed card:", error)
      // Non-critical - feed card still works
    })
}
```

**Verification:**
- ✅ Confirm saves work correctly
- ✅ Test with new messages
- ✅ Test with existing messages
- ✅ Verify error handling

**Estimated Time:** 30 minutes

---

### **Step 6.5: Remove Deprecated API Endpoints** 🟡 Priority 4

**Goal:** Remove or deprecate old endpoints if they're no longer used

**Files to Check:**
- `app/api/maya/update-message/route.ts` (if only used for feed cards)
- Any other feed-specific endpoints

**Action:**
- Check if `update-message` is used elsewhere
- If only used for feed cards, can be removed (feed cards now use `save-message`)
- If used elsewhere, keep but remove feed card specific logic

**Verification:**
- ✅ Search codebase for usages
- ✅ Confirm no other features depend on it
- ✅ Test that removal doesn't break anything

**Estimated Time:** 1 hour

---

### **Step 6.6: Remove styling_details Fallback** 🟡 Priority 4

**Goal:** Remove backward compatibility code after migration period

**⚠️ CRITICAL: Only do this after confirming all feeds migrated to feed_cards column**

**Files to Modify:**
- `app/api/maya/load-chat/route.ts`
- `lib/data/maya.ts`

**Code to Remove:**
```typescript
// REMOVE: Fallback to styling_details
const feedCardsFromStyling = message.styling_details && 
  typeof message.styling_details === 'object' &&
  Array.isArray(message.styling_details) 
  ? message.styling_details 
  : null

const finalFeedCards = feedCards || feedCardsFromStyling
```

**Replace With:**
```typescript
// Simple: Use feed_cards directly
const feedCards = message.feed_cards || null
```

**Verification Steps:**
1. ✅ Run migration query to check for remaining styling_details feeds:
   ```sql
   SELECT COUNT(*) FROM maya_chat_messages 
   WHERE styling_details IS NOT NULL 
   AND styling_details::text LIKE '%"feedStrategy"%'
   ```
2. ✅ If count > 0, migrate remaining feeds first
3. ✅ Test loading old feeds
4. ✅ Confirm all feeds load correctly

**Estimated Time:** 1 hour

---

### **Step 6.7: Clean Up Comments and Console Logs** 🟡 Priority 5

**Goal:** Remove debug logs and update comments

**Files to Clean:**
- `components/sselfie/maya/maya-feed-tab.tsx`
- `app/api/maya/generate-feed/route.ts`
- `app/api/maya/pro/generate-feed/route.ts`

**Actions:**

1. **Remove Debug Console Logs:**
   ```typescript
   // REMOVE: Excessive debug logging
   console.log("[FEED] 🔍 PRODUCTION DEBUG - Checking for feed trigger:", { ... })
   console.log("[FEED] 🔍 VERIFY: Message parts after update:", { ... })
   console.log("[FEED] 🔍 FULL MESSAGE AFTER UPDATE:", ...)
   ```

2. **Keep Important Logs:**
   ```typescript
   // KEEP: Error logs
   console.error("[FEED] ❌ Error:", error)
   
   // KEEP: Success confirmations
   console.log("[FEED] ✅ Feed card created successfully")
   ```

3. **Update Comments:**
   - Remove outdated comments
   - Update comments to reflect new simplified flow
   - Add clear documentation for new patterns

**Verification:**
- ✅ Code is clean and readable
- ✅ Important logs remain
- ✅ Comments are accurate

**Estimated Time:** 1 hour

---

### **Step 6.8: Remove Unused Imports and Dependencies** 🟡 Priority 5

**Goal:** Clean up unused code

**Files to Check:**
- `components/sselfie/maya/maya-feed-tab.tsx`
- All modified files

**Actions:**
1. Remove unused imports
2. Remove unused type definitions
3. Remove unused helper functions
4. Run linter to catch any issues

**Verification:**
- ✅ No unused imports
- ✅ No TypeScript errors
- ✅ Linter passes

**Estimated Time:** 30 minutes

---

### **Step 6.9: Update Type Definitions** 🟡 Priority 5

**Goal:** Ensure types are accurate and consistent

**Files to Check:**
- Type definitions for feed cards
- API response types
- Component prop types

**Actions:**
1. Update types to match new simplified structure
2. Remove types for old patterns
3. Ensure consistency across files

**Verification:**
- ✅ All types are accurate
- ✅ No TypeScript errors
- ✅ Types match implementation

**Estimated Time:** 1 hour

---

### **Step 6.10: Final Code Review** 🔴 Priority 1

**Goal:** Ensure code quality and consistency

**Checklist:**

1. **Code Quality:**
   - [ ] No duplicate code
   - [ ] Consistent naming conventions
   - [ ] Proper error handling
   - [ ] Clean code structure

2. **Consistency:**
   - [ ] Matches concept card pattern
   - [ ] Uses same database pattern
   - [ ] Uses same API pattern
   - [ ] Consistent error messages

3. **Documentation:**
   - [ ] Code is well-commented
   - [ ] API endpoints documented
   - [ ] Database schema documented
   - [ ] README updated if needed

4. **Testing:**
   - [ ] All tests pass
   - [ ] Edge cases handled
   - [ ] Error cases handled
   - [ ] Performance acceptable

**Estimated Time:** 2 hours

---

## Cleanup Phase Checklist

### Phase 6: Final Cleanup (Execute AFTER 1 week in production)

- [ ] Step 6.1: Remove old trigger detection patterns
- [ ] Step 6.2: Remove complex hash function
- [ ] Step 6.3: Remove unused refs
- [ ] Step 6.4: Remove retry logic in save function
- [ ] Step 6.5: Remove deprecated API endpoints (if safe)
- [ ] Step 6.6: Remove styling_details fallback (after migration)
- [ ] Step 6.7: Clean up comments and console logs
- [ ] Step 6.8: Remove unused imports and dependencies
- [ ] Step 6.9: Update type definitions
- [ ] Step 6.10: Final code review

---

## Cleanup Safety Guidelines

### **When to Execute Cleanup:**

1. ✅ **Wait Period:** At least 1 week after Phase 5 deployment
2. ✅ **Verification:** All feeds working correctly in production
3. ✅ **Monitoring:** No errors or issues reported
4. ✅ **Migration:** All feeds migrated to new structure
5. ✅ **Testing:** All test cases passing

### **Rollback Plan for Cleanup:**

If cleanup causes issues:

1. **Immediate:** Revert cleanup commits
2. **Investigate:** Identify what broke
3. **Fix:** Address root cause
4. **Re-test:** Verify fix works
5. **Re-apply:** Cleanup again with fixes

### **What NOT to Clean Up:**

- ❌ Don't remove backward compatibility until migration complete
- ❌ Don't remove error handling
- ❌ Don't remove important logs
- ❌ Don't remove type definitions that might be used elsewhere
- ❌ Don't remove API endpoints if other features use them

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Step 1.1: Create API endpoint (`/api/maya/generate-feed`)
- [ ] Step 1.2: Simplify trigger detection
- [ ] Step 1.3: Split detection and processing

### Phase 2: Simplification
- [ ] Step 2.1: Remove unnecessary refs
- [ ] Step 2.2: Simplify message key generation
- [ ] Step 2.3: Simplify saving logic

### Phase 3: Pro Mode Support
- [ ] Step 3.1: Add Pro Mode API endpoint
- [ ] Step 3.2: Update component to use Pro Mode endpoint

### Phase 4: Database Consistency
- [ ] Step 4.1: Add feed_cards column
- [ ] Step 4.2: Update save functions
- [ ] Step 4.3: Update load functions

### Phase 5: Testing & Validation
- [ ] Step 5.1: Integration testing
- [ ] Step 5.2: Update documentation

### Phase 6: Final Cleanup (⚠️ Execute AFTER 1 week in production)
- [ ] Step 6.1: Remove old trigger detection patterns
- [ ] Step 6.2: Remove complex hash function
- [ ] Step 6.3: Remove unused refs
- [ ] Step 6.4: Remove retry logic in save function
- [ ] Step 6.5: Remove deprecated API endpoints (if safe)
- [ ] Step 6.6: Remove styling_details fallback (after migration)
- [ ] Step 6.7: Clean up comments and console logs
- [ ] Step 6.8: Remove unused imports and dependencies
- [ ] Step 6.9: Update type definitions
- [ ] Step 6.10: Final code review

---

## Risk Mitigation

### **Risk 1: Breaking Existing Feeds**
**Mitigation:**
- Keep backward compatibility during transition
- Fallback to styling_details if feed_cards is null
- Test with existing feeds before deployment

### **Risk 2: Pro Mode Features Not Working**
**Mitigation:**
- Test Pro Mode thoroughly
- Keep Classic Mode working as fallback
- Gradual rollout

### **Risk 3: Infinite Loops Return**
**Mitigation:**
- Follow concept card pattern exactly
- Test trigger detection thoroughly
- Use simple state management

---

## Success Metrics

### **Code Complexity**
- ✅ Reduce lines of code: 700 → ~200 (70% reduction)
- ✅ Reduce trigger patterns: 4 → 1 (75% reduction)
- ✅ Reduce refs: 3 → 1 (67% reduction)

### **Reliability**
- ✅ No infinite loops
- ✅ Consistent error handling
- ✅ Works in both Pro and Classic modes

### **Consistency**
- ✅ Matches concept card architecture
- ✅ Uses same database pattern
- ✅ Uses same API pattern

---

## Rollback Plan

If issues arise:

1. **Immediate Rollback:**
   - Revert to previous commit
   - Database changes are additive (feed_cards column can be ignored)
   - Old code path still works

2. **Partial Rollback:**
   - Keep API endpoints (can be used later)
   - Revert component changes
   - Use old trigger detection

3. **Database Rollback:**
   - feed_cards column can be ignored
   - Fallback to styling_details works
   - No data loss

---

## Timeline

| Phase | Duration | Day | Notes |
|-------|----------|-----|-------|
| Phase 1: Foundation | 5 hours | Day 1 (Morning) | |
| Phase 2: Simplification | 2.5 hours | Day 1 (Afternoon) | |
| Phase 3: Pro Mode Support | 2.5 hours | Day 2 (Morning) | |
| Phase 4: Database Consistency | 2.5 hours | Day 2 (Afternoon) | |
| Phase 5: Testing & Validation | 3 hours | Day 3 (Morning) | |
| **Phase 6: Final Cleanup** | **7.5 hours** | **Day 3+ (After 1 week)** | ⚠️ Execute after production validation |
| **Total (Phases 1-5)** | **16 hours** | **~2-3 days** | |
| **Total (Including Cleanup)** | **23.5 hours** | **~3-4 days** | |

---

## Next Steps

1. **Review this plan** with team
2. **Get approval** for refactoring
3. **Create feature branch:** `refactor/feed-creation-simplification`
4. **Start with Phase 1** (foundation)
5. **Test incrementally** after each phase
6. **Deploy gradually** (can deploy phases independently)

---

## Questions?

- **Q: Can we do this incrementally?**  
  A: Yes! Each phase can be deployed independently.

- **Q: Will this break existing feeds?**  
  A: No, backward compatibility is maintained throughout.

- **Q: What if we find issues?**  
  A: Rollback plan is included. Each phase is reversible.

- **Q: Can we skip Pro Mode support?**  
  A: Yes, Phase 3 is optional but recommended for consistency.

---

**Ready to start? Begin with Phase 1, Step 1.1!** 🚀


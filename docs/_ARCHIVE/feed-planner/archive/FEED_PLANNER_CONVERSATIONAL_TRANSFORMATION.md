# Feed Planner Conversational Transformation Plan

**Date:** 2025-01-30  
**Status:** 🟢 Ready to Implement  
**Priority:** High (User Experience Transformation)

---

## 🎯 MISSION STATEMENT

Transform Feed Planner from a form-based interface into a conversational, Maya-guided experience where users chat with Maya to create their Instagram feed strategy, see a live preview before generation, and track progress in real-time.

---

## ⚠️ CRITICAL CONTEXT: What's Already Done

### ✅ COMPLETED WORK (DO NOT TOUCH - THESE ARE WORKING)

**Phase 1.1-1.5 is COMPLETE and WORKING. DO NOT modify these implementations:**

1. **Polling System (Phase 1.1):** ✅ COMPLETE
   - Custom polling removed
   - SWR-based polling implemented in `instagram-feed-view.tsx`
   - Uses `refreshInterval` based on generation status
   - **DO NOT change the SWR polling logic**

2. **State Management (Phase 1.2):** ✅ COMPLETE
   - Consolidated to single source of truth (`postStatuses` from `feedData`)
   - Removed duplicate state variables
   - **DO NOT add back removed state variables**

3. **Post-Type Forcing (Phase 1.3):** ✅ COMPLETE
   - Removed forcing logic that overrode AI decisions
   - AI strategy trusted as-is
   - **DO NOT add back post-type balancing**

4. **Settings (Phase 1.4):** ✅ COMPLETE
   - Settings unified with Maya screen
   - Uses localStorage from Maya settings
   - **DO NOT duplicate settings state**

5. **Pro Mode Detection (Phase 1.5):** ✅ COMPLETE
   - Auto-detects per-post (Classic vs Pro Mode)
   - Located in `lib/feed-planner/mode-detection.ts`
   - Database columns added: `generation_mode`, `pro_mode_type`
   - Queue routing logic in `lib/feed-planner/queue-images.ts`
   - **DO NOT change auto-detection logic - KEEP THIS APPROACH**

### ❌ WHAT TO SKIP (DO NOT IMPLEMENT)

**Phase 1.6 - Phase 4 of the old refactoring plan are CANCELLED:**

- ❌ **DO NOT** create mode selection modal (Phase 1.6)
- ❌ **DO NOT** implement form-based UI redesign (Phase 2)
- ❌ **DO NOT** start with form improvements
- ❌ **DO NOT** build value proposition cards for form

**Why:** These conflict with the new conversational approach. We're building conversation-first, not form-first.

---

## 📊 Implementation Overview

### High-Level Flow

```
OLD FLOW (Form-Based):
User → Form Input → Generate → Wait → View Feed

NEW FLOW (Conversational):
User → Chat with Maya → Preview Strategy → Approve → Watch Live Generation → Interact with Feed
```

### Key Differences

| Aspect | Old (Form) | New (Conversational) |
|--------|-----------|---------------------|
| Input Method | Textarea form | Natural conversation |
| Strategy Preview | None (hidden) | Visible before generation |
| User Understanding | Unclear what they'll get | Clear preview & cost breakdown |
| Experience | Transactional | Collaborative & guided |
| Mode Selection | Auto-detected silently | Shown in preview with badges |

---

## 🔍 AUDIT SUMMARY (Codebase Review)

**After auditing the codebase, key simplifications identified:**

### ✅ **What We Can Reuse (Major Simplifications):**

1. **useMayaChat Hook** - Already handles chat state, persistence, useChat integration
2. **MayaChatInterface Component** - Already handles message display, streaming, scrolling
3. **MayaUnifiedInput Component** - Already handles input, send, image upload
4. **InstagramFeedView Component** - Already does everything Phase 2 needs (SWR polling, progress, grid)
5. **/api/maya/chat Route** - Can use existing route with Feed Planner context

### 📉 **Impact:**
- **~1050 lines of code saved**
- **Implementation time: 5-8 days (down from 8-12 days)**
- **Phase 2 can be SKIPPED entirely** - InstagramFeedView already complete!

See `FEED_PLANNER_PLAN_AUDIT.md` for detailed audit findings.

---

## 🎯 PHASE 1: CONVERSATIONAL STRATEGY BUILDER (Week 1)

**Goal:** Replace form with Maya-guided conversation that builds strategy collaboratively.

**⚠️ SIMPLIFIED APPROACH:** Reuse existing Maya chat infrastructure instead of creating new components.

---

### **Step 1.1: Audit Existing Maya Chat System**

**BEFORE writing ANY code, analyze these files:**
- `components/sselfie/maya-chat-screen.tsx`
- `components/sselfie/maya/hooks/use-maya-chat.ts`
- `app/api/maya/chat/route.ts`
- `lib/maya/system-prompts/maya-system-prompt.ts`

**Questions to answer:**
1. How does Maya chat currently handle trigger detection? (Look for `[GENERATE_CONCEPTS]`)
2. How does useChat from AI SDK work with our backend?
3. What's the message format structure?
4. How are images uploaded in Maya Pro Mode?
5. How is chat persistence handled?

**Output a summary before proceeding:**
```markdown
## Maya Chat System Analysis
- Trigger detection pattern: [found in line X of file Y]
- Message format: [structure]
- Image upload: [component/flow]
- Persistence: [method]
```

**Files to Read:**
```bash
# Read these files completely before implementing
components/sselfie/maya-chat-screen.tsx
components/sselfie/maya/hooks/use-maya-chat.ts
app/api/maya/chat/route.ts
lib/maya/system-prompts/maya-system-prompt.ts
```

---

### **Step 1.2: Create Feed Planner Chat Hook**

**File to create:** `components/feed-planner/hooks/use-feed-planner-chat.ts`

**Instructions:**
1. **First, read** `components/sselfie/maya/hooks/use-maya-chat.ts` in full
2. **Extend** the pattern, don't reinvent
3. **Add** feed-specific logic on top

**Simplified Implementation:**
```typescript
// components/feed-planner/feed-planner-screen.tsx

import { useMayaChat } from '@/components/sselfie/maya/hooks/use-maya-chat'

export default function FeedPlannerScreen() {
  // Use existing Maya chat hook directly
  const {
    messages,
    sendMessage,
    status,
    setMessages,
    // ... all other useMayaChat features
  } = useMayaChat({
    studioProMode: false, // Feed Planner always Classic Mode
    user,
    getModeString: () => 'maya', // Use maya chat type (or create 'feed_planner' type)
  })
  
  // Add trigger detection for [CREATE_FEED_STRATEGY]
  useEffect(() => {
    if (status === "streaming" || status === "submitted") return
    
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant")
    if (!lastAssistantMessage) return
    
    // Detect [CREATE_FEED_STRATEGY] trigger (text pattern, like [GENERATE_CONCEPTS])
    const textContent = getMessageText(lastAssistantMessage) // Helper function
    const strategyMatch = textContent.match(/\[CREATE_FEED_STRATEGY:\s*([^\]]+)\]/i)
    
    if (strategyMatch) {
      const strategyJSON = strategyMatch[1]
      try {
        const strategy = JSON.parse(strategyJSON)
        setStrategyPreview(strategy)
        // Show preview, don't generate yet
      } catch (error) {
        console.error('[FEED-PLANNER] Error parsing strategy:', error)
      }
    }
  }, [messages, status])
  
  // ... rest of component
}
```

**Key Pattern from Maya:**
- Maya detects `[GENERATE_CONCEPTS]` trigger in message content
- Uses regex to extract trigger and parameters
- Processes trigger after streaming completes
- Same pattern applies to Feed Planner trigger

**Implementation Checklist:**
- [ ] Read `use-maya-chat.ts` completely
- [ ] Understand trigger detection pattern
- [ ] Create hook that extends Maya chat pattern
- [ ] Add `[CREATE_FEED_STRATEGY]` trigger detection
- [ ] Parse strategy JSON from Maya's response
- [ ] Build strategy preview data structure
- [ ] Test trigger detection works

---

### **Step 1.3: Update Maya System Prompt for Feed Planner**

**File to modify:** `lib/maya/system-prompts/maya-system-prompt.ts`

**Check first:**
```bash
# Read the current system prompt structure
cat lib/maya/system-prompts/maya-system-prompt.ts
```

**Then add Feed Planner section:**
```typescript
// Add to maya-system-prompt.ts (find appropriate section)

export const FEED_PLANNER_GUIDANCE = `
## Feed Planner Workflow

When the user wants to create an Instagram feed strategy, guide them through this conversation:

**Phase 1: Understand Context**
Ask natural, conversational questions:
- "Tell me about your business - what do you do and who do you help?"
- "What vibe should your Instagram feed have?" (warm/cool, minimal/vibrant)
- "What topics do you post about?" (your content pillars)
- "Any specific content you want to include?" (morning routines, product shots, etc.)

**Phase 2: Present Strategy Preview**
Once you understand their goals, create a strategic plan and present it:

"Based on what you've shared, here's your feed strategy:

**Post Pattern:** [describe the 3x3 grid pattern]
- Posts 1, 4, 7: [type] - [purpose]
- Posts 2, 5, 8: [type] - [purpose]  
- Posts 3, 6, 9: [type] - [purpose]

**Visual Flow:** [describe color/tone flow]

**Credit Cost:**
- [X] Classic Mode posts (1 credit each) = [X] credits
- [X] Pro Mode posts (2 credits each) = [X] credits
- Total: [X] credits

Does this match your vision? Any changes?"

**Phase 3: Trigger Generation**
After user approves, output:
[CREATE_FEED_STRATEGY: {complete strategy JSON}]

**Strategy JSON Format:**
{
  "gridPattern": "description",
  "visualRhythm": "description",
  "posts": [
    {
      "position": 1,
      "type": "portrait" | "object" | "flatlay" | "carousel" | "quote" | "infographic",
      "description": "what this post shows",
      "purpose": "why it's in this position",
      "tone": "warm" | "cool",
      "generationMode": "classic" | "pro" // Auto-detected based on type
    }
    // ... 9 posts total
  ],
  "totalCredits": 14
}

**IMPORTANT:**
- Detect Pro Mode automatically: carousels, quotes, infographics = Pro Mode
- Show clear credit breakdown
- Let user adjust before generating
- Be conversational, not robotic
`
```

**Integration check:**
```typescript
// app/api/maya/chat/route.ts uses MAYA_SYSTEM_PROMPT from lib/maya/personality.ts
// Add Feed Planner guidance to MAYA_SYSTEM_PROMPT, OR
// Create conditional logic to inject Feed Planner prompt when chatType === 'feed_planner'
```

**Actual System Prompt Location:**
- Found: `lib/maya/personality.ts` (not maya-system-prompt.ts)
- Export: `MAYA_SYSTEM_PROMPT`
- Used in: `app/api/maya/chat/route.ts`

**Implementation Checklist:**
- [ ] Read current system prompt structure
- [ ] Find appropriate section to add Feed Planner guidance
- [ ] Add FEED_PLANNER_GUIDANCE constant
- [ ] Integrate into main system prompt
- [ ] Verify chat route uses this guidance
- [ ] Test Maya understands Feed Planner context

---

### **Step 1.4: Create Strategy Preview Component**

**File to create:** `components/feed-planner/strategy-preview.tsx`

**BEFORE creating, check:**
```bash
# Look at existing preview components for patterns
components/feed-planner/feed-grid-preview.tsx
components/sselfie/maya/concept-cards.tsx
```

**Requirements:**
```typescript
// components/feed-planner/strategy-preview.tsx

interface StrategyPreviewProps {
  strategy: {
    gridPattern: string
    visualRhythm: string
    posts: Array<{
      position: number
      type: string
      description: string
      purpose: string
      tone: 'warm' | 'cool'
      generationMode: 'classic' | 'pro'
    }>
    totalCredits: number
  }
  onApprove: () => void
  onAdjust: () => void
}

export default function StrategyPreview({ strategy, onApprove, onAdjust }: StrategyPreviewProps) {
  // Color mapping for post types
  const getColorForType = (type: string, tone: string) => {
    // Warm tones: cream, beige, warm white (#F5F1ED, #E8E3DD, #FDFCFA)
    // Cool tones: sage, blue-gray, cool white (#E5E8E5, #D4D9DC, #F5F7F7)
    // Return hex color based on type and tone
  }
  
  const classicCount = strategy.posts.filter(p => p.generationMode === 'classic').length
  const proCount = strategy.posts.filter(p => p.generationMode === 'pro').length
  
  return (
    <div className="space-y-6">
      {/* 3x3 Color-Coded Grid */}
      <div className="grid grid-cols-3 gap-1 max-w-md mx-auto">
        {strategy.posts.map(post => (
          <div
            key={post.position}
            className="aspect-square rounded-lg relative overflow-hidden"
            style={{ backgroundColor: getColorForType(post.type, post.tone) }}
          >
            {/* Pro Mode Badge */}
            {post.generationMode === 'pro' && (
              <div className="absolute top-1 right-1 bg-stone-900 text-white text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                Pro
              </div>
            )}
            
            {/* Post Info */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent">
              <p className="text-white text-[10px] font-light truncate">
                {post.type}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-stone-600">
          <span>Portrait posts</span>
          <span>{strategy.posts.filter(p => p.type === 'portrait').length}</span>
        </div>
        <div className="flex justify-between text-stone-600">
          <span>Lifestyle posts</span>
          <span>{strategy.posts.filter(p => ['object', 'flatlay'].includes(p.type)).length}</span>
        </div>
        {proCount > 0 && (
          <div className="flex justify-between text-stone-600">
            <span>Pro Mode posts</span>
            <span>{proCount}</span>
          </div>
        )}
      </div>
      
      {/* Credit Breakdown */}
      <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
        <h4 className="text-xs uppercase tracking-wide text-stone-500 mb-2">Credit Cost</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Classic Mode ({classicCount} posts)</span>
            <span>{classicCount} credits</span>
          </div>
          {proCount > 0 && (
            <div className="flex justify-between">
              <span>Pro Mode ({proCount} posts)</span>
              <span>{proCount * 2} credits</span>
            </div>
          )}
          <div className="flex justify-between font-medium border-t border-stone-200 pt-1 mt-1">
            <span>Total</span>
            <span>{strategy.totalCredits} credits</span>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onAdjust}
          className="flex-1 px-4 py-3 border border-stone-300 rounded-xl text-sm hover:bg-stone-50"
        >
          Adjust Strategy
        </button>
        <button
          onClick={onApprove}
          className="flex-1 px-4 py-3 bg-stone-900 text-white rounded-xl text-sm hover:bg-stone-800"
        >
          Generate Feed
        </button>
      </div>
    </div>
  )
}
```

**Design System Check:**
```bash
# Apply Maya design system - check these files for patterns
components/sselfie/gallery-screen.tsx
components/sselfie/maya/maya-header.tsx
```

**Use:**
- Hatton/Georgia serif fonts
- Stone color palette (#F5F1ED cream, stone-900, stone-500)
- 24px spacing
- rounded-xl, rounded-2xl borders
- Soft shadows

**Implementation Checklist:**
- [ ] Read existing preview components
- [ ] Create strategy preview component
- [ ] Implement color mapping (warm/cool tones)
- [ ] Add Pro Mode badges
- [ ] Show credit breakdown
- [ ] Add approve/adjust buttons
- [ ] Apply Maya design system
- [ ] Test preview renders correctly

---

### **Step 1.5: Create Conversational Strategy Builder Component**

**File to create:** `components/feed-planner/conversational-strategy-builder.tsx`

**Check Maya chat interface first:**
```bash
# Look at how Maya chat is structured
components/sselfie/maya/maya-chat-interface.tsx
components/sselfie/maya-chat-screen.tsx
```

**Requirements:**
```typescript
// components/feed-planner/conversational-strategy-builder.tsx

interface ConversationalStrategyBuilderProps {
  messages: any[]
  onSendMessage: (message: string) => void
  status: any
}

export default function ConversationalStrategyBuilder({
  messages,
  onSendMessage,
  status,
}: ConversationalStrategyBuilderProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
          >
            <div
              className={`
                max-w-[80%] rounded-xl p-4
                ${message.role === 'user' 
                  ? 'bg-stone-900 text-white' 
                  : 'bg-stone-50 border border-stone-200'}
              `}
            >
              {message.content}
            </div>
          </div>
        ))}
        {status === 'streaming' && (
          <div className="flex justify-start">
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
              <LoadingSpinner />
            </div>
          </div>
        )}
      </div>
      
      {/* Input Area */}
      <div className="border-t border-stone-200 p-4">
        <MayaUnifiedInput
          onSend={onSendMessage}
          disabled={status === 'streaming'}
          placeholder="Tell Maya about your Instagram feed..."
        />
      </div>
    </div>
  )
}
```

**Implementation Checklist:**
- [ ] Read Maya chat interface component
- [ ] Create conversational builder component
- [ ] Integrate message display
- [ ] Add input component (reuse Maya's input)
- [ ] Handle streaming status
- [ ] Apply Maya design system
- [ ] Test conversation flow

---

### **Step 1.6: Integrate Conversation into Feed Planner Screen**

**File to modify:** `components/feed-planner/feed-planner-screen.tsx`

**CRITICAL: Check current state first:**
```bash
# Read current implementation
grep -A 20 "const \[step" components/feed-planner/feed-planner-screen.tsx
```

**Current structure has `step` state ("request" | "view"). We're replacing this.**

**New structure:**
```typescript
// components/feed-planner/feed-planner-screen.tsx

export default function FeedPlannerScreen() {
  // Use new hook
  const {
    messages,
    sendMessage,
    status,
    feedStrategy,
    strategyPreview,
    isGeneratingStrategy,
    handleCreateFeed,
  } = useFeedPlannerChat()
  
  // Check if user has existing feed
  const { data: existingFeed } = useSWR('/api/feed-planner/status', fetcher)
  
  // Three states:
  // 1. No feed + no strategy = Show Maya conversation
  // 2. Strategy created, not approved = Show preview + conversation
  // 3. Feed generating/complete = Show live grid
  
  const showConversation = !existingFeed && !strategyPreview
  const showPreview = strategyPreview && !existingFeed
  const showFeed = existingFeed
  
  return (
    <div className="flex flex-col h-screen">
      {showConversation && (
        <ConversationalStrategyBuilder
          messages={messages}
          onSendMessage={sendMessage}
          status={status}
        />
      )}
      
      {showPreview && (
        <div className="space-y-6 p-6">
          <ConversationalStrategyBuilder
            messages={messages}
            onSendMessage={sendMessage}
            status={status}
          />
          <StrategyPreview
            strategy={strategyPreview}
            onApprove={handleCreateFeed}
            onAdjust={() => {
              // Continue conversation to adjust
              sendMessage("Can we adjust the strategy?")
            }}
          />
        </div>
      )}
      
      {showFeed && (
        <LiveFeedTracker feedId={existingFeed.id} />
      )}
    </div>
  )
}
```

**Implementation Checklist:**
- [ ] Read current feed-planner-screen.tsx
- [ ] Integrate useFeedPlannerChat hook
- [ ] Replace step-based logic with conversation/preview/feed states
- [ ] Add ConversationalStrategyBuilder component
- [ ] Add StrategyPreview component
- [ ] Integrate LiveFeedTracker (from Phase 2)
- [ ] Test state transitions
- [ ] Verify existing feed handling works

---

## 🎯 PHASE 2: LIVE GENERATION EXPERIENCE (⚠️ SIMPLIFIED - ALREADY DONE!)

**Goal:** Real-time tracking of image generation with beautiful progress indicators.

**⚠️ MAJOR SIMPLIFICATION:** `InstagramFeedView` already does everything Phase 2 needs!

### **Step 2.1-2.3: Use Existing InstagramFeedView Component**

**⚠️ CHANGE:** Skip creating new components - use existing `InstagramFeedView`!

**File:** `components/feed-planner/instagram-feed-view.tsx` (already exists)

**Already Has:**
- ✅ SWR polling with intelligent refreshInterval
- ✅ Progress tracking (readyPosts / totalPosts)
- ✅ Live grid display with post statuses
- ✅ Pro Mode badges
- ✅ Confetti on completion
- ✅ All Phase 2 features complete!

**Implementation:**
```typescript
// components/feed-planner/live-feed-tracker.tsx

interface LiveFeedTrackerProps {
  feedId: number
}

export default function LiveFeedTracker({ feedId }: LiveFeedTrackerProps) {
  // REUSE existing SWR polling from instagram-feed-view.tsx
  const { data: feedData, mutate } = useSWR(
    `/api/feed/${feedId}`,
    fetcher,
    {
      refreshInterval: (data) => {
        const hasGenerating = data?.posts?.some(
          p => p.prediction_id && !p.image_url
        )
        return hasGenerating ? 5000 : 0
      },
      refreshWhenHidden: false,
      revalidateOnFocus: true,
    }
  )
  
  // Derive statuses from feedData (Phase 1.2 pattern)
  const postStatuses = useMemo(() => {
    if (!feedData?.posts) return []
    return feedData.posts.map(post => ({
      id: post.id,
      position: post.position,
      status: post.generation_status,
      imageUrl: post.image_url,
      isGenerating: !!post.prediction_id && !post.image_url,
      isComplete: !!post.image_url,
      generationMode: post.generation_mode,
      proModeType: post.pro_mode_type,
    }))
  }, [feedData])
  
  const readyPosts = postStatuses.filter(p => p.isComplete).length
  const totalPosts = postStatuses.length
  
  return (
    <div className="space-y-6 p-6">
      {/* Progress Bar */}
      <ProgressBar current={readyPosts} total={totalPosts} />
      
      {/* Live Grid */}
      <div className="grid grid-cols-3 gap-1 max-w-2xl mx-auto">
        {postStatuses.map(post => (
          <GridCell key={post.id} post={post} />
        ))}
      </div>
      
      {/* Confetti on complete */}
      {readyPosts === totalPosts && <Confetti />}
    </div>
  )
}
```

**Implementation Checklist:**
- [ ] Read existing SWR polling from instagram-feed-view.tsx
- [ ] Create LiveFeedTracker component
- [ ] Reuse SWR polling pattern
- [ ] Derive post statuses from feedData
- [ ] Integrate ProgressBar component
- [ ] Integrate GridCell component
- [ ] Add confetti on completion
- [ ] Test real-time updates

---

### **Step 2.2: Create Progress Bar Component**

**File to create:** `components/feed-planner/progress-bar.tsx`

```typescript
interface ProgressBarProps {
  current: number
  total: number
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const percentage = (current / total) * 100
  const estimatedMinutes = Math.ceil((total - current) * 0.8) // ~0.8 min per image
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-stone-600">
        <span>Generating images</span>
        <span>{current}/{total} complete</span>
      </div>
      
      <div className="w-full bg-stone-200 rounded-full h-2">
        <div
          className="bg-stone-900 h-2 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {current < total && (
        <p className="text-xs text-stone-500">
          Estimated time: ~{estimatedMinutes} minute{estimatedMinutes !== 1 ? 's' : ''}
        </p>
      )}
      
      {current === total && (
        <p className="text-xs text-stone-700 font-medium">
          ✓ All images generated!
        </p>
      )}
    </div>
  )
}
```

**Implementation Checklist:**
- [ ] Create ProgressBar component
- [ ] Calculate percentage
- [ ] Show estimated time
- [ ] Add completion message
- [ ] Apply Maya design system
- [ ] Test with different progress states

---

### **Step 2.3: Create Grid Cell Component**

**File to create:** `components/feed-planner/grid-cell.tsx`

```typescript
interface GridCellProps {
  post: {
    id: number
    position: number
    imageUrl?: string
    isGenerating: boolean
    isComplete: boolean
    generationMode: 'classic' | 'pro'
    proModeType?: string
  }
}

export default function GridCell({ post }: GridCellProps) {
  return (
    <div className="aspect-square bg-stone-100 rounded-lg overflow-hidden relative">
      {/* Pro Mode Badge */}
      {post.generationMode === 'pro' && (
        <div className="absolute top-2 right-2 bg-stone-900 text-white text-[10px] px-2 py-1 rounded-full uppercase tracking-wide z-10">
          Pro
        </div>
      )}
      
      {/* Image States */}
      {post.isComplete && post.imageUrl && (
        <img
          src={post.imageUrl}
          alt={`Post ${post.position}`}
          className="w-full h-full object-cover"
        />
      )}
      
      {post.isGenerating && (
        <div className="w-full h-full flex flex-col items-center justify-center">
          <Loader className="w-6 h-6 text-stone-400 animate-spin mb-2" />
          <span className="text-xs text-stone-500">Generating...</span>
        </div>
      )}
      
      {!post.isGenerating && !post.isComplete && (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs text-stone-400">Waiting...</span>
        </div>
      )}
    </div>
  )
}
```

**Implementation Checklist:**
- [ ] Create GridCell component
- [ ] Add Pro Mode badge
- [ ] Handle image display (when complete)
- [ ] Handle generating state (loader)
- [ ] Handle pending state
- [ ] Apply Maya design system
- [ ] Test all states

---

## 🎯 PHASE 3: POST-GENERATION FEATURES (Week 3)

**Goal:** Add drag-and-drop reordering, individual regeneration, download bundle.

---

### **Step 3.1: Implement Drag-and-Drop Reordering**

**Check existing drag-drop patterns first:**
```bash
# See if there's existing drag-drop elsewhere in codebase
grep -r "draggable" components/
grep -r "onDragStart" components/
```

**Use native HTML5 drag-and-drop (no library needed):**

**File to modify:** `components/feed-planner/live-feed-tracker.tsx`
```typescript
// Add to LiveFeedTracker component

const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
const [reorderedPosts, setReorderedPosts] = useState(postStatuses)

const handleDragStart = (index: number) => {
  setDraggedIndex(index)
}

const handleDragOver = (e: React.DragEvent, index: number) => {
  e.preventDefault()
  if (draggedIndex !== null && draggedIndex !== index) {
    const newPosts = [...reorderedPosts]
    const [draggedPost] = newPosts.splice(draggedIndex, 1)
    newPosts.splice(index, 0, draggedPost)
    setReorderedPosts(newPosts)
    setDraggedIndex(index)
  }
}

const handleDragEnd = async () => {
  setDraggedIndex(null)
  
  // Save to database
  try {
    await fetch(`/api/feed/${feedId}/reorder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postOrders: reorderedPosts.map((post, index) => ({
          postId: post.id,
          newPosition: index + 1,
        })),
      }),
    })
    
    toast({ title: "Feed reordered" })
    mutate()
  } catch (error) {
    toast({ title: "Failed to save order", variant: "destructive" })
    setReorderedPosts(postStatuses) // Revert
  }
}

// Update grid rendering:
<div
  draggable={post.isComplete} // Only drag completed posts
  onDragStart={() => handleDragStart(index)}
  onDragOver={(e) => handleDragOver(e, index)}
  onDragEnd={handleDragEnd}
  className={`
    ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
    ${post.isComplete ? 'cursor-move' : 'cursor-not-allowed'}
  `}
>
  <GridCell post={post} />
</div>
```

**Implementation Checklist:**
- [ ] Check for existing drag-drop patterns
- [ ] Add drag state management
- [ ] Implement handleDragStart
- [ ] Implement handleDragOver
- [ ] Implement handleDragEnd
- [ ] Integrate with reorder API
- [ ] Add visual feedback during drag
- [ ] Test drag-and-drop works
- [ ] Test mobile touch events (if supported)

---

### **Step 3.2: Create Reorder API Endpoint**

**File to create:** `app/api/feed/[feedId]/reorder/route.ts`

**Check existing API patterns first:**
```bash
# Look at existing feed API routes for auth/error handling patterns
cat app/api/feed/[feedId]/generate-single/route.ts
```

```typescript
// app/api/feed/[feedId]/reorder/route.ts

import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(
  req: NextRequest,
  { params }: { params: { feedId: string } }
) {
  try {
    // Auth check (copy pattern from existing feed routes)
    const supabase = createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { postOrders } = await req.json()
    
    // Validate ownership
    const [feed] = await sql`
      SELECT id FROM feed_layouts
      WHERE id = ${params.feedId} AND user_id = ${neonUser.id}
    `
    
    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 })
    }
    
    // Update positions
    for (const { postId, newPosition } of postOrders) {
      await sql`
        UPDATE feed_posts
        SET position = ${newPosition}, updated_at = NOW()
        WHERE id = ${postId} AND feed_layout_id = ${params.feedId}
      `
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[FEED-REORDER] Error:", error)
    return NextResponse.json(
      { error: "Failed to reorder posts" },
      { status: 500 }
    )
  }
}
```

**Implementation Checklist:**
- [ ] Read existing feed API routes for patterns
- [ ] Create reorder endpoint
- [ ] Add authentication check
- [ ] Validate feed ownership
- [ ] Update post positions in database
- [ ] Add error handling
- [ ] Test endpoint works
- [ ] Test authorization works

---

### **Step 3.3: Add Download Bundle Feature**

**File to modify:** `components/feed-planner/live-feed-tracker.tsx`
```typescript
// Add download bundle handler

const handleDownloadBundle = async () => {
  if (!feedData) return
  
  try {
    // Download all images as ZIP
    const response = await fetch(`/api/feed/${feedId}/download-bundle`)
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `instagram-feed-${feedId}.zip`
    a.click()
    
    toast({ title: "Download started" })
  } catch (error) {
    toast({ title: "Download failed", variant: "destructive" })
  }
}

// Add button to UI
<button
  onClick={handleDownloadBundle}
  disabled={readyPosts < totalPosts}
  className="px-4 py-2 bg-stone-900 text-white rounded-lg disabled:opacity-50"
>
  Download All ({totalPosts} images + captions + strategy)
</button>
```

**Backend endpoint to create:**

**File:** `app/api/feed/[feedId]/download-bundle/route.ts`
```typescript
// This will need to:
// 1. Fetch all post images
// 2. Fetch captions
// 3. Fetch strategy document
// 4. Create ZIP file with:
//    - /images/01-post1.jpg ... 09-post9.jpg
//    - /captions.txt (all captions in order)
//    - /strategy.pdf (or .txt)
// 5. Return ZIP as blob

// Use JSZip library (check if already in project)
// If not, add: npm install jszip
import JSZip from 'jszip'
```

**Implementation Checklist:**
- [ ] Check if JSZip is in package.json
- [ ] Install JSZip if needed
- [ ] Create download bundle endpoint
- [ ] Fetch all post images
- [ ] Fetch captions
- [ ] Fetch strategy
- [ ] Create ZIP file
- [ ] Return ZIP as blob
- [ ] Add download button to UI
- [ ] Test download works
- [ ] Verify ZIP contents are correct

---

## 🎯 PHASE 4: POLISH & DESIGN (Week 4)

**Goal:** Apply Maya design system, mobile optimization, error handling.

---

### **Step 4.1: Apply Maya Design System**

**CRITICAL: Read design system first:**
```bash
# Study existing Maya/Gallery components for design patterns
components/sselfie/gallery-screen.tsx
components/sselfie/maya/maya-header.tsx
components/sselfie/gallery/components/gallery-header.tsx
```

**Design tokens to apply across ALL Feed Planner components:**
```typescript
// Design System Constants (create this file)
// components/feed-planner/design-system.ts

export const FeedPlannerDesign = {
  fonts: {
    heading: 'Hatton, Georgia, serif',
    body: 'Inter, system-ui, sans-serif',
  },
  colors: {
    background: '#FDFCFA', // Warm cream
    surface: '#F5F1ED',
    border: '#E7E5E4', // stone-200
    text: {
      primary: '#1C1917', // stone-950
      secondary: '#78716C', // stone-500
      tertiary: '#A8A29E', // stone-400
    },
    accent: '#1C1917', // stone-900
  },
  spacing: {
    section: '24px',
    card: '16px',
    tight: '8px',
  },
  borderRadius: {
    small: '8px',
    medium: '12px',
    large: '16px',
  },
}
```

**Apply to all components:**
- Typography: Hatton for headings, Inter for body
- Colors: Stone palette
- Spacing: 24px between sections
- Border radius: rounded-xl (16px)
- Shadows: subtle, stone-900/5

**Implementation Checklist:**
- [ ] Read existing design system files
- [ ] Create Feed Planner design system constants
- [ ] Apply typography (Hatton/Inter)
- [ ] Apply color palette (stone)
- [ ] Apply spacing (24px sections)
- [ ] Apply border radius
- [ ] Apply shadows
- [ ] Test design consistency

---

### **Step 4.2: Mobile Optimization**

**Check for mobile-specific issues:**
```bash
# Test on mobile viewport:
# 1. Touch targets < 44px
# 2. Text too small
# 3. Grid too cramped
```

**Apply these patterns:**
```typescript
// All buttons/tappable elements
className="
  px-4 py-3          // Minimum 44px height
  touch-manipulation // Better touch handling
  active:scale-95    // Visual feedback
"

// Text sizing
className="
  text-xs sm:text-sm // Responsive text
  leading-relaxed    // Better readability
"

// Grid spacing
className="
  gap-1 sm:gap-2     // Tighter on mobile
  p-4 sm:p-6         // Less padding on mobile
"
```

**Implementation Checklist:**
- [ ] Test all components on mobile viewport
- [ ] Ensure touch targets are 44px minimum
- [ ] Make text responsive (sm: breakpoints)
- [ ] Adjust grid spacing for mobile
- [ ] Adjust padding for mobile
- [ ] Test drag-and-drop on mobile (if supported)
- [ ] Test conversation scrolling on mobile
- [ ] Verify preview works on mobile

---

### **Step 4.3: Error Handling & Empty States**

**Add comprehensive error handling:**
```typescript
// components/feed-planner/error-boundary.tsx
// Wrap Feed Planner in error boundary

// Empty states:
// - No credits: Show "Buy Credits" CTA
// - No trained model & no avatar images: Show onboarding guide
// - Generation failed: Show retry button
// - Network error: Show retry button

// Error types to handle:
type FeedPlannerError =
  | { type: 'credits'; message: string }
  | { type: 'model_missing'; message: string }
  | { type: 'generation_failed'; message: string; postId: number }
  | { type: 'network'; message: string }
```

**Implementation Checklist:**
- [ ] Create error boundary component
- [ ] Add error types
- [ ] Handle credit errors
- [ ] Handle missing model errors
- [ ] Handle generation failures
- [ ] Handle network errors
- [ ] Add retry buttons
- [ ] Add empty states
- [ ] Test all error scenarios

---

## 🧪 TESTING REQUIREMENTS

**After each phase, test:**

### **Phase 1 Testing:**
- [ ] Start Maya conversation
- [ ] Answer feed goal questions
- [ ] Verify strategy preview appears
- [ ] Check Pro Mode badges on correct posts
- [ ] Verify credit calculation
- [ ] Approve strategy
- [ ] Confirm feed generation starts

### **Phase 2 Testing:**
- [ ] Watch live grid populate
- [ ] Verify progress bar updates
- [ ] Check SWR polling (5s intervals)
- [ ] Verify confetti on completion
- [ ] Test leaving/returning to page (polling pauses/resumes)

### **Phase 3 Testing:**
- [ ] Drag posts to reorder
- [ ] Verify database saves new order
- [ ] Test individual post regeneration
- [ ] Download bundle and verify contents

### **Phase 4 Testing:**
- [ ] Test on mobile (touch targets)
- [ ] Verify design consistency with Maya/Gallery
- [ ] Test all error states
- [ ] Test empty states

---

## ✅ SUCCESS CRITERIA

**Before marking any phase complete, verify:**

1. **No TypeScript errors** (`npm run build` succeeds)
2. **No console errors** in browser
3. **All existing functionality still works** (don't break other screens)
4. **SWR polling from Phase 1.1 still works** (don't touch it)
5. **Pro Mode detection from Phase 1.5 still works** (use it, don't change it)
6. **Design matches Maya/Gallery screens**
7. **Mobile-friendly** (test in responsive mode)
8. **Credits calculated correctly** (Classic = 1, Pro = 2)

---

## 🚨 CRITICAL REMINDERS

### **NEVER MODIFY THESE (They're working):**
- SWR polling logic (Phase 1.1)
- Post status derivation (Phase 1.2)
- Pro Mode detection (Phase 1.5: `lib/feed-planner/mode-detection.ts`)
- Queue routing (Phase 1.5: `lib/feed-planner/queue-images.ts`)
- Database columns: `generation_mode`, `pro_mode_type`

### **ALWAYS DO THIS:**
- Read existing code before writing new code
- Copy patterns from Maya/Gallery screens
- Test after each file created
- Keep Pro Mode auto-detection (don't add manual selection)
- Apply Maya design system consistently
- Check mobile experience

### **NEVER DO THIS:**
- Don't implement Phase 1.6 mode selection modal (old plan)
- Don't create form-based UI
- Don't duplicate state that's already consolidated
- Don't add custom polling (SWR handles it)
- Don't change Pro Mode auto-detection logic

---

## 📝 FINAL CHECKLIST

**Before considering this task complete:**

- [ ] Maya conversation works for feed strategy
- [ ] Strategy preview shows before generation
- [ ] Pro Mode badges visible on correct posts
- [ ] Credit calculation accurate
- [ ] Live grid updates in real-time
- [ ] Progress bar shows completion percentage
- [ ] Confetti triggers on completion
- [ ] Drag-and-drop reordering works
- [ ] Download bundle creates ZIP
- [ ] Design matches Maya/Gallery
- [ ] Mobile-friendly (44px touch targets)
- [ ] All errors handled gracefully
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Existing features still work

---

## 🎯 IMPLEMENTATION ORDER

**Execute in this exact order:**

1. **Audit Phase** (30 min)
   - Read all referenced files
   - Understand existing patterns
   - Output summary of findings

2. **Phase 1** (2-3 days)
   - 1.1: Audit Maya chat
   - 1.2: Create chat hook
   - 1.3: Update system prompt
   - 1.4: Create strategy preview
   - 1.5: Create conversational builder
   - 1.6: Integrate into screen
   - **TEST THOROUGHLY**

3. **Phase 2** (1-2 days)
   - 2.1: Create live tracker
   - 2.2: Create progress bar
   - 2.3: Create grid cell
   - **TEST THOROUGHLY**

4. **Phase 3** (2-3 days)
   - 3.1: Implement drag-drop
   - 3.2: Create reorder API
   - 3.3: Add download bundle
   - **TEST THOROUGHLY**

5. **Phase 4** (2-3 days)
   - 4.1: Apply design system
   - 4.2: Mobile optimization
   - 4.3: Error handling
   - **FINAL TESTING**

**Total Estimated Time: 5-8 days** (reduced due to simplifications)

**Simplifications Applied:**
- ✅ Phase 1.2: Reuse useMayaChat (saves ~300 lines)
- ✅ Phase 1.5: Reuse MayaChatInterface (saves ~200 lines)
- ✅ Phase 2: Reuse InstagramFeedView (saves ~400 lines, entire phase)
- ✅ Total: ~1050 lines saved, 3-4 days saved

---

## 📚 REFERENCE FILES TO STUDY

**Before starting, read these files to understand patterns:**

### **Maya Chat System:**
- `components/sselfie/maya-chat-screen.tsx` - Main chat screen
- `components/sselfie/maya/hooks/use-maya-chat.ts` - Chat hook pattern
- `app/api/maya/chat/route.ts` - Chat API endpoint
- `lib/maya/system-prompts/maya-system-prompt.ts` - System prompts
- `components/sselfie/maya/maya-chat-interface.tsx` - Chat UI

### **Design System:**
- `components/sselfie/gallery-screen.tsx` - Design patterns
- `components/sselfie/maya/maya-header.tsx` - Header design
- `lib/design-tokens.ts` - Design tokens (if exists)

### **Existing Feed Planner (for reference, don't copy form logic):**
- `components/feed-planner/instagram-feed-view.tsx` - SWR polling (Phase 1.1)
- `lib/feed-planner/mode-detection.ts` - Pro Mode detection (Phase 1.5)
- `lib/feed-planner/queue-images.ts` - Queue routing (Phase 1.5)

---

**BEGIN IMPLEMENTATION NOW. START WITH AUDIT PHASE.**


# Feed Planner Conversational Transformation - Final Simplified Plan

**Date:** 2025-01-30  
**Status:** 🟢 Ready to Implement  
**Priority:** High (User Experience Transformation)  
**Estimated Time:** 5-8 days (down from 8-12 days with simplifications)

---

## 🎯 MISSION STATEMENT

Transform Feed Planner from a form-based interface into a conversational, Maya-guided experience where users chat with Maya to create their Instagram feed strategy, see a live preview before generation, and track progress in real-time.

**Key Simplification:** Reuse existing Maya chat infrastructure instead of creating new components.

---

## ⚠️ CRITICAL CONTEXT: What's Already Done

### ✅ COMPLETED WORK (DO NOT TOUCH - THESE ARE WORKING)

**Phase 1.1-1.5 is COMPLETE and WORKING. DO NOT modify these implementations:**

1. **Polling System (Phase 1.1):** ✅ COMPLETE
   - SWR-based polling implemented in `instagram-feed-view.tsx`
   - Uses `refreshInterval` based on generation status
   - **DO NOT change the SWR polling logic**

2. **State Management (Phase 1.2):** ✅ COMPLETE
   - Consolidated to single source of truth (`postStatuses` from `feedData`)
   - **DO NOT add back removed state variables**

3. **Post-Type Forcing (Phase 1.3):** ✅ COMPLETE
   - AI strategy trusted as-is
   - **DO NOT add back post-type balancing**

4. **Settings (Phase 1.4):** ✅ COMPLETE
   - Settings unified with Maya screen
   - **DO NOT duplicate settings state**

5. **Pro Mode Detection (Phase 1.5):** ✅ COMPLETE
   - Auto-detects per-post (Classic vs Pro Mode)
   - Located in `lib/feed-planner/mode-detection.ts`
   - **DO NOT change auto-detection logic**

### ✅ ALREADY AVAILABLE COMPONENTS (REUSE THESE)

1. **useMayaChat Hook** - Handles all chat state, persistence, AI SDK integration
2. **MayaChatInterface Component** - Handles message display, streaming, scrolling
3. **MayaUnifiedInput Component** - Handles input, send, image upload
4. **InstagramFeedView Component** - Already has Phase 2 features (polling, progress, grid)
5. **/api/maya/chat Route** - Already handles authentication, credits, streaming

---

## 📊 Implementation Overview

### Simplified Approach

**Instead of creating new components, we reuse existing Maya chat infrastructure:**

```
OLD APPROACH (Original Plan):
- Create use-feed-planner-chat.ts hook ❌
- Create ConversationalStrategyBuilder component ❌
- Create LiveFeedTracker component ❌
- Create new chat API route ❌

NEW APPROACH (Simplified):
- Use useMayaChat hook directly ✅
- Use MayaChatInterface component directly ✅
- Use InstagramFeedView component directly ✅
- Use /api/maya/chat route with context ✅
```

### High-Level Flow

```
User → Chat with Maya (useMayaChat + MayaChatInterface)
  ↓
Maya responds with [CREATE_FEED_STRATEGY] trigger
  ↓
Show Strategy Preview (new component)
  ↓
User approves → Call /api/feed-planner/create-strategy
  ↓
Show InstagramFeedView (reuse existing)
```

---

## 🎯 PHASE 1: CONVERSATIONAL STRATEGY BUILDER (2-3 days)

**Goal:** Integrate Maya chat into Feed Planner and add strategy preview.

---

### **Step 1.1: Audit Maya Chat System** (30 minutes)

**Read these files to understand patterns:**
- `components/sselfie/maya/hooks/use-maya-chat.ts` - Chat hook pattern
- `components/sselfie/maya-chat-screen.tsx` - Trigger detection pattern (lines 533-641)
- `app/api/maya/chat/route.ts` - Chat API endpoint
- `lib/maya/personality.ts` - System prompt location (not maya-system-prompt.ts)

**Key Pattern to Understand:**
```typescript
// Maya detects [GENERATE_CONCEPTS] trigger like this:
const conceptMatch = textContent.match(/\[GENERATE_CONCEPTS\]\s*(.+?)(?:\n|$|\[|$)/i)
if (conceptMatch && !isGeneratingConcepts) {
  // Process trigger
}
```

**Output:** Summary document of trigger detection pattern before proceeding.

---

### **Step 1.2: Integrate useMayaChat Hook**

**File to modify:** `components/feed-planner/feed-planner-screen.tsx`

**Implementation:**
```typescript
import { useMayaChat } from '@/components/sselfie/maya/hooks/use-maya-chat'

export default function FeedPlannerScreen() {
  // Get user from auth context (or pass as prop)
  const { data: user } = useSWR('/api/user', fetcher)
  
  // Use existing Maya chat hook directly
  const {
    messages,
    sendMessage,
    status,
    setMessages,
    chatId,
    // ... other useMayaChat features
  } = useMayaChat({
    studioProMode: false, // Feed Planner always Classic Mode for chat
    user: user,
    getModeString: () => 'maya', // Use 'maya' chat type (or create 'feed_planner' type)
  })
  
  // Add state for strategy preview
  const [strategyPreview, setStrategyPreview] = useState<any>(null)
  const [isCreatingFeed, setIsCreatingFeed] = useState(false)
  
  // Trigger detection for [CREATE_FEED_STRATEGY]
  useEffect(() => {
    if (status === "streaming" || status === "submitted") return
    if (isCreatingFeed) return // Don't process if already creating
    
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === "assistant")
    if (!lastAssistantMessage) return
    
    // Get text content (helper function needed)
    const textContent = typeof lastAssistantMessage.content === 'string'
      ? lastAssistantMessage.content
      : lastAssistantMessage.content
          ?.filter((part: any) => part.type === 'text')
          .map((part: any) => part.text)
          .join('') || ''
    
    // Detect [CREATE_FEED_STRATEGY] trigger (like [GENERATE_CONCEPTS])
    const strategyMatch = textContent.match(/\[CREATE_FEED_STRATEGY:\s*({[\s\S]+?})\]/i)
    
    if (strategyMatch) {
      try {
        const strategyJSON = strategyMatch[1]
        const strategy = JSON.parse(strategyJSON)
        console.log('[FEED-PLANNER] Strategy detected:', strategy)
        setStrategyPreview(strategy)
      } catch (error) {
        console.error('[FEED-PLANNER] Error parsing strategy JSON:', error)
      }
    }
  }, [messages, status, isCreatingFeed])
  
  // Handle feed creation
  const handleCreateFeed = async () => {
    if (!strategyPreview) return
    
    setIsCreatingFeed(true)
    try {
      // Call existing create-strategy API
      const response = await fetch('/api/feed-planner/create-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: strategyPreview.userRequest || '', // Extract from conversation
          customSettings: {
            // Get from useMayaSettings hook
            styleStrength: settings.styleStrength,
            promptAccuracy: settings.promptAccuracy,
            aspectRatio: settings.aspectRatio,
            realismStrength: settings.realismStrength,
          },
        }),
      })
      
      const data = await response.json()
      if (data.feedLayoutId) {
        setCurrentFeedId(data.feedLayoutId)
        setStep('view') // Transition to feed view
        setStrategyPreview(null) // Clear preview
      }
    } catch (error) {
      console.error('[FEED-PLANNER] Error creating feed:', error)
      toast({ title: 'Failed to create feed', variant: 'destructive' })
    } finally {
      setIsCreatingFeed(false)
    }
  }
  
  // ... rest of component
}
```

**Checklist:**
- [ ] Import useMayaChat hook
- [ ] Initialize hook with proper props
- [ ] Add trigger detection useEffect
- [ ] Add handleCreateFeed function
- [ ] Test trigger detection works

---

### **Step 1.3: Update System Prompt for Feed Planner**

**File to modify:** `lib/maya/personality.ts`

**Location:** Add Feed Planner guidance to `MAYA_SYSTEM_PROMPT` export

**Implementation:**
```typescript
// Add to lib/maya/personality.ts (find appropriate section in MAYA_SYSTEM_PROMPT)

export const MAYA_SYSTEM_PROMPT = `You're Maya - a creative partner...

// ... existing prompt content ...

## Feed Planner Workflow (when user is in Feed Planner context)

When the user wants to create an Instagram feed strategy, guide them through this conversation:

**Phase 1: Understand Context**
Ask natural, conversational questions:
- "Tell me about your business - what do you do and who do you help?"
- "What vibe should your Instagram feed have?" (warm/cool, minimal/vibrant)
- "What topics do you post about?" (your content pillars)
- "Any specific content you want to include?" (morning routines, product shots, etc.)

**Phase 2: Present Strategy Preview**
Once you understand their goals, create a strategic plan and present it conversationally:

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
  "userRequest": "summary of user's feed goal",
  "gridPattern": "description",
  "visualRhythm": "description",
  "posts": [
    {
      "position": 1,
      "type": "portrait" | "object" | "flatlay" | "carousel" | "quote" | "infographic",
      "description": "what this post shows",
      "purpose": "why it's in this position",
      "tone": "warm" | "cool",
      "generationMode": "classic" | "pro"
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

**Alternative Approach (Conditional):**
If we want Feed Planner-specific prompt, add conditional logic in `/api/maya/chat` route:
```typescript
// In app/api/maya/chat/route.ts
const systemPrompt = chatType === 'feed_planner'
  ? MAYA_SYSTEM_PROMPT + FEED_PLANNER_GUIDANCE
  : MAYA_SYSTEM_PROMPT
```

**Checklist:**
- [ ] Read lib/maya/personality.ts
- [ ] Add Feed Planner guidance to system prompt
- [ ] Test Maya understands Feed Planner context
- [ ] Verify trigger format matches detection pattern

---

### **Step 1.4: Create Strategy Preview Component**

**File to create:** `components/feed-planner/strategy-preview.tsx`

**This is the ONLY new component we need to create!**

**Implementation:**
```typescript
// components/feed-planner/strategy-preview.tsx

"use client"

import { useState } from 'react'

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
  // Color mapping for post types and tones
  const getColorForType = (type: string, tone: string): string => {
    // Warm tones: cream, beige, warm white
    // Cool tones: sage, blue-gray, cool white
    const warmColors: Record<string, string> = {
      portrait: '#F5F1ED', // cream
      object: '#E8E3DD', // beige
      flatlay: '#FDFCFA', // warm white
      carousel: '#E5D5C8', // warm stone
      quote: '#D4C4B8', // warm taupe
      infographic: '#C9B8A8', // warm brown
    }
    const coolColors: Record<string, string> = {
      portrait: '#E5E8E5', // sage
      object: '#D4D9DC', // blue-gray
      flatlay: '#F5F7F7', // cool white
      carousel: '#D0D8DC', // cool blue
      quote: '#C4CFD4', // cool gray
      infographic: '#B8C4C9', // cool blue-gray
    }
    
    const colors = tone === 'warm' ? warmColors : coolColors
    return colors[type] || colors.portrait
  }
  
  const classicCount = strategy.posts.filter(p => p.generationMode === 'classic').length
  const proCount = strategy.posts.filter(p => p.generationMode === 'pro').length
  
  return (
    <div className="space-y-6 p-6 bg-white">
      {/* 3x3 Color-Coded Grid */}
      <div className="grid grid-cols-3 gap-1 max-w-md mx-auto">
        {strategy.posts
          .sort((a, b) => a.position - b.position)
          .map(post => (
          <div
            key={post.position}
            className="aspect-square rounded-lg relative overflow-hidden border border-stone-200"
            style={{ backgroundColor: getColorForType(post.type, post.tone) }}
          >
            {/* Pro Mode Badge */}
            {post.generationMode === 'pro' && (
              <div className="absolute top-1 right-1 bg-stone-900 text-white text-[8px] px-1.5 py-0.5 rounded-full uppercase tracking-wide z-10">
                Pro
              </div>
            )}
            
            {/* Position Number */}
            <div className="absolute top-1 left-1 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
              {post.position}
            </div>
            
            {/* Post Info */}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
              <p className="text-white text-[10px] font-light truncate capitalize">
                {post.type}
              </p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Strategy Description */}
      <div className="space-y-2 text-sm">
        <p className="text-stone-600">{strategy.gridPattern}</p>
        <p className="text-stone-600">{strategy.visualRhythm}</p>
      </div>
      
      {/* Post Type Breakdown */}
      <div className="space-y-2 text-sm border-t border-stone-200 pt-4">
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
        <h4 className="text-xs uppercase tracking-wide text-stone-500 mb-2 font-medium">Credit Cost</h4>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-700">Classic Mode ({classicCount} posts)</span>
            <span className="text-stone-900 font-medium">{classicCount} credits</span>
          </div>
          {proCount > 0 && (
            <div className="flex justify-between">
              <span className="text-stone-700">Pro Mode ({proCount} posts)</span>
              <span className="text-stone-900 font-medium">{proCount * 2} credits</span>
            </div>
          )}
          <div className="flex justify-between font-semibold border-t border-stone-200 pt-2 mt-2">
            <span className="text-stone-900">Total</span>
            <span className="text-stone-900">{strategy.totalCredits} credits</span>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onAdjust}
          className="flex-1 px-4 py-3 border border-stone-300 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors"
        >
          Adjust Strategy
        </button>
        <button
          onClick={onApprove}
          className="flex-1 px-4 py-3 bg-stone-900 text-white rounded-xl text-sm font-medium hover:bg-stone-800 transition-colors"
        >
          Generate Feed ({strategy.totalCredits} credits)
        </button>
      </div>
    </div>
  )
}
```

**Design System:**
- Use Hatton/Georgia serif fonts for headings
- Use stone color palette (#F5F1ED, stone-900, stone-500)
- Use rounded-xl borders
- Use 24px spacing between sections

**Checklist:**
- [ ] Create StrategyPreview component
- [ ] Implement color mapping (warm/cool tones)
- [ ] Add Pro Mode badges
- [ ] Show credit breakdown
- [ ] Add approve/adjust buttons
- [ ] Apply Maya design system
- [ ] Test preview renders correctly

---

### **Step 1.5: Integrate Components into Feed Planner Screen**

**File to modify:** `components/feed-planner/feed-planner-screen.tsx`

**Implementation:**
```typescript
// components/feed-planner/feed-planner-screen.tsx

import { useMayaChat } from '@/components/sselfie/maya/hooks/use-maya-chat'
import MayaChatInterface from '@/components/sselfie/maya/maya-chat-interface'
import MayaUnifiedInput from '@/components/sselfie/maya/maya-unified-input'
import StrategyPreview from './strategy-preview'
import InstagramFeedView from './instagram-feed-view'
import { useMayaSettings } from '@/components/sselfie/maya/hooks/use-maya-settings'

export default function FeedPlannerScreen() {
  // ... existing state (step, currentFeedId, etc.)
  
  // Maya chat integration (from Step 1.2)
  const { messages, sendMessage, status, setMessages, /* ... */ } = useMayaChat({ /* ... */ })
  
  // Settings
  const { settings } = useMayaSettings()
  
  // Strategy preview state
  const [strategyPreview, setStrategyPreview] = useState<any>(null)
  
  // Refs for MayaChatInterface (check maya-chat-screen.tsx for pattern)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const isAtBottomRef = useRef(true)
  
  // Scroll handler (reuse pattern from maya-chat-screen.tsx)
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesContainerRef.current?.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior,
    })
  }, [])
  
  // State management
  const showConversation = step === 'request' && !strategyPreview && !currentFeedId
  const showPreview = strategyPreview && step === 'request' && !currentFeedId
  const showFeed = currentFeedId && step === 'view'
  
  return (
    <div className="flex flex-col h-screen">
      {/* Conversation View */}
      {showConversation && (
        <div className="flex flex-col flex-1">
          <MayaChatInterface
            messages={messages}
            filteredMessages={messages} // No filtering needed
            setMessages={setMessages}
            studioProMode={false}
            isTyping={status === 'streaming'}
            isGeneratingConcepts={false}
            isGeneratingStudioPro={false}
            contentFilter="all"
            messagesContainerRef={messagesContainerRef}
            messagesEndRef={messagesEndRef}
            showScrollButton={showScrollButton}
            isAtBottomRef={isAtBottomRef}
            scrollToBottom={scrollToBottom}
            chatId={undefined}
            uploadedImages={[]}
            setCreditBalance={() => {}}
            isAdmin={false}
            selectedGuideId={null}
            selectedGuideCategory={null}
            onSaveToGuide={() => {}}
            promptSuggestions={[]}
            generateCarouselRef={{ current: null }}
          />
          
          <div className="border-t border-stone-200 p-4 bg-white">
            <MayaUnifiedInput
              onSend={(message) => sendMessage({ content: message })}
              disabled={status === 'streaming'}
              placeholder="Tell Maya about your Instagram feed..."
              studioProMode={false}
            />
          </div>
        </div>
      )}
      
      {/* Strategy Preview View */}
      {showPreview && (
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Show conversation history above preview */}
          <div className="p-6 space-y-4">
            <MayaChatInterface
              messages={messages}
              filteredMessages={messages}
              setMessages={setMessages}
              studioProMode={false}
              isTyping={false}
              isGeneratingConcepts={false}
              isGeneratingStudioPro={false}
              contentFilter="all"
              messagesContainerRef={messagesContainerRef}
              messagesEndRef={messagesEndRef}
              showScrollButton={false}
              isAtBottomRef={isAtBottomRef}
              scrollToBottom={scrollToBottom}
              chatId={undefined}
              uploadedImages={[]}
              setCreditBalance={() => {}}
              isAdmin={false}
              selectedGuideId={null}
              selectedGuideCategory={null}
              onSaveToGuide={() => {}}
              promptSuggestions={[]}
              generateCarouselRef={{ current: null }}
            />
          </div>
          
          {/* Strategy Preview */}
          <StrategyPreview
            strategy={strategyPreview}
            onApprove={handleCreateFeed}
            onAdjust={() => {
              // Continue conversation to adjust
              setStrategyPreview(null)
              sendMessage({ content: "Can we adjust the strategy?" })
            }}
          />
        </div>
      )}
      
      {/* Feed View (reuse existing) */}
      {showFeed && (
        <InstagramFeedView
          feedId={currentFeedId!}
          onBack={() => {
            setStep("request")
            setCurrentFeedId(null)
            setStrategyPreview(null)
          }}
        />
      )}
    </div>
  )
}
```

**Checklist:**
- [ ] Import useMayaChat, MayaChatInterface, MayaUnifiedInput
- [ ] Import StrategyPreview component
- [ ] Integrate useMayaChat hook
- [ ] Add state management (showConversation, showPreview, showFeed)
- [ ] Integrate MayaChatInterface component
- [ ] Integrate MayaUnifiedInput component
- [ ] Integrate StrategyPreview component
- [ ] Keep InstagramFeedView integration
- [ ] Test state transitions
- [ ] Test conversation flow

---

## 🎯 PHASE 2: SKIP - ALREADY COMPLETE!

**InstagramFeedView already has all Phase 2 features:**
- ✅ SWR polling with intelligent refreshInterval
- ✅ Progress tracking (readyPosts / totalPosts)
- ✅ Live grid display with post statuses
- ✅ Pro Mode badges
- ✅ Confetti on completion

**No implementation needed - just use the existing component!**

---

## 🎯 PHASE 3: POST-GENERATION FEATURES (2-3 days)

**Goal:** Add drag-and-drop reordering and download bundle.

---

### **Step 3.1: Implement Drag-and-Drop Reordering**

**File to modify:** `components/feed-planner/instagram-feed-view.tsx`

**Check existing drag-drop patterns first:**
```bash
grep -r "draggable" components/
grep -r "onDragStart" components/
```

**Implementation:**
```typescript
// Add to InstagramFeedView component

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
    mutate() // Refresh data
  } catch (error) {
    toast({ title: "Failed to save order", variant: "destructive" })
    setReorderedPosts(postStatuses) // Revert
  }
}

// Update grid rendering (in grid view):
{reorderedPosts.map((post, index) => (
  <div
    key={post.id}
    draggable={post.isComplete}
    onDragStart={() => handleDragStart(index)}
    onDragOver={(e) => handleDragOver(e, index)}
    onDragEnd={handleDragEnd}
    className={`
      ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
      ${post.isComplete ? 'cursor-move' : 'cursor-not-allowed'}
    `}
  >
    {/* Existing grid cell content */}
  </div>
))}
```

**Checklist:**
- [ ] Check for existing drag-drop patterns
- [ ] Add drag state management
- [ ] Implement handleDragStart
- [ ] Implement handleDragOver
- [ ] Implement handleDragEnd
- [ ] Integrate with reorder API
- [ ] Add visual feedback during drag
- [ ] Test drag-and-drop works

---

### **Step 3.2: Create Reorder API Endpoint**

**File to create:** `app/api/feed/[feedId]/reorder/route.ts`

**Check existing API patterns first:**
```bash
cat app/api/feed/[feedId]/generate-single/route.ts
```

**Implementation:**
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
    // Auth check
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

**Checklist:**
- [ ] Read existing feed API routes for patterns
- [ ] Create reorder endpoint
- [ ] Add authentication check
- [ ] Validate feed ownership
- [ ] Update post positions in database
- [ ] Add error handling
- [ ] Test endpoint works

---

### **Step 3.3: Add Download Bundle Feature**

**File to modify:** `components/feed-planner/instagram-feed-view.tsx`

**Implementation:**
```typescript
// Add download bundle handler

const handleDownloadBundle = async () => {
  if (!feedData) return
  
  try {
    const response = await fetch(`/api/feed/${feedId}/download-bundle`)
    if (!response.ok) throw new Error('Download failed')
    
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `instagram-feed-${feedId}.zip`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast({ title: "Download started" })
  } catch (error) {
    toast({ title: "Download failed", variant: "destructive" })
  }
}

// Add button to UI (in feed complete state):
{readyPosts === totalPosts && (
  <button
    onClick={handleDownloadBundle}
    className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800"
  >
    Download All ({totalPosts} images + captions + strategy)
  </button>
)}
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

// Use JSZip library (check if in package.json, if not: npm install jszip)
import JSZip from 'jszip'
```

**Checklist:**
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

---

## 🎯 PHASE 4: POLISH & DESIGN (1-2 days)

**Goal:** Apply Maya design system, mobile optimization, error handling.

---

### **Step 4.1: Apply Maya Design System**

**Check existing design patterns:**
```bash
components/sselfie/gallery-screen.tsx
components/sselfie/maya/maya-header.tsx
```

**Apply to StrategyPreview component:**
- Typography: Hatton for headings, Inter for body
- Colors: Stone palette (#F5F1ED, stone-900, stone-500)
- Spacing: 24px between sections
- Border radius: rounded-xl (16px)
- Shadows: subtle, stone-900/5

**Checklist:**
- [ ] Apply typography (Hatton/Inter)
- [ ] Apply color palette (stone)
- [ ] Apply spacing (24px sections)
- [ ] Apply border radius
- [ ] Apply shadows
- [ ] Test design consistency

---

### **Step 4.2: Mobile Optimization**

**Check for mobile-specific issues:**
- Touch targets < 44px
- Text too small
- Grid too cramped

**Apply patterns:**
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

**Checklist:**
- [ ] Test all components on mobile viewport
- [ ] Ensure touch targets are 44px minimum
- [ ] Make text responsive (sm: breakpoints)
- [ ] Adjust grid spacing for mobile
- [ ] Test conversation scrolling on mobile
- [ ] Verify preview works on mobile

---

### **Step 4.3: Error Handling & Empty States**

**Add comprehensive error handling:**
- No credits: Show "Buy Credits" CTA
- No trained model & no avatar images: Show onboarding guide
- Generation failed: Show retry button
- Network error: Show retry button

**Checklist:**
- [ ] Create error boundary component
- [ ] Handle credit errors
- [ ] Handle missing model errors
- [ ] Handle generation failures
- [ ] Handle network errors
- [ ] Add retry buttons
- [ ] Add empty states
- [ ] Test all error scenarios

---

## 🧪 TESTING REQUIREMENTS

### **Phase 1 Testing:**
- [ ] Start Maya conversation
- [ ] Answer feed goal questions
- [ ] Verify strategy preview appears
- [ ] Check Pro Mode badges on correct posts
- [ ] Verify credit calculation
- [ ] Approve strategy
- [ ] Confirm feed generation starts

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

**Before marking complete, verify:**

1. **No TypeScript errors** (`npm run build` succeeds)
2. **No console errors** in browser
3. **All existing functionality still works**
4. **SWR polling from Phase 1.1 still works**
5. **Pro Mode detection from Phase 1.5 still works**
6. **Design matches Maya/Gallery screens**
7. **Mobile-friendly** (test in responsive mode)
8. **Credits calculated correctly** (Classic = 1, Pro = 2)

---

## 📊 Implementation Summary

### **What We're Creating (New Code):**
- 1 new component: `StrategyPreview`
- 1 new API endpoint: `/api/feed/[feedId]/reorder`
- 1 new API endpoint: `/api/feed/[feedId]/download-bundle`
- Trigger detection logic in `feed-planner-screen.tsx`
- System prompt additions in `lib/maya/personality.ts`

### **What We're Reusing (Existing Code):**
- ✅ `useMayaChat` hook
- ✅ `MayaChatInterface` component
- ✅ `MayaUnifiedInput` component
- ✅ `InstagramFeedView` component (Phase 2 complete!)
- ✅ `/api/maya/chat` route

### **Lines of Code:**
- New: ~450 lines
- Reused: ~2000 lines (from existing components)
- **Total Savings vs Original Plan: ~1050 lines**

### **Time Estimate:**
- Phase 1: 2-3 days
- Phase 2: SKIP (already done!)
- Phase 3: 2-3 days
- Phase 4: 1-2 days
- **Total: 5-8 days** (down from 8-12 days)

---

## 🚨 CRITICAL REMINDERS

### **NEVER MODIFY:**
- SWR polling logic (Phase 1.1)
- Post status derivation (Phase 1.2)
- Pro Mode detection (Phase 1.5)
- Queue routing (Phase 1.5)

### **ALWAYS:**
- Read existing code before writing
- Copy patterns from Maya/Gallery screens
- Test after each step
- Keep Pro Mode auto-detection
- Apply Maya design system consistently

---

## 📝 FINAL CHECKLIST

**Before considering complete:**

- [ ] Maya conversation works for feed strategy
- [ ] Strategy preview shows before generation
- [ ] Pro Mode badges visible on correct posts
- [ ] Credit calculation accurate
- [ ] Live grid updates in real-time (InstagramFeedView)
- [ ] Drag-and-drop reordering works
- [ ] Download bundle creates ZIP
- [ ] Design matches Maya/Gallery
- [ ] Mobile-friendly (44px touch targets)
- [ ] All errors handled gracefully
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Existing features still work

---

**Ready to implement! Start with Phase 1.1 (Audit) before writing any code.**


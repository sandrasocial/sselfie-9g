# Feed Planner Conversational Plan - Codebase Audit

**Date:** 2025-01-30  
**Status:** 🔍 Audit Complete - Recommendations Provided

---

## 📊 Executive Summary

After auditing the new conversational transformation plan against the current codebase, I've identified several opportunities to simplify and reuse existing patterns. The plan is solid but can be optimized.

---

## ✅ What's Perfect in the Plan

1. **Phase 1.1-1.5 Preservation** ✅
   - Correctly identifies completed work
   - Clear warnings about not modifying working code
   - Good safety boundaries

2. **Use of SWR Polling** ✅
   - Correctly reuses existing polling pattern from `instagram-feed-view.tsx`
   - Understands refreshInterval logic

3. **Pro Mode Auto-Detection** ✅
   - Correctly preserves existing detection logic
   - No unnecessary changes to mode-detection.ts

---

## 🔍 Key Findings & Recommendations

### **1. MAJOR SIMPLIFICATION: Reuse Existing Maya Chat Infrastructure**

**Finding:** The plan creates a new `use-feed-planner-chat.ts` hook, but we can actually **reuse `useMayaChat` directly** with minimal modifications.

**Current Reality:**
- `useMayaChat` already handles:
  - Chat ID management
  - Message persistence
  - useChat integration from AI SDK
  - Chat loading/saving
  - Mode switching

**Recommendation:**
```typescript
// Instead of creating new hook, extend existing useMayaChat
// Feed Planner can use Maya chat directly - just add trigger detection

// In feed-planner-screen.tsx:
const {
  messages,
  sendMessage,
  status,
  setMessages,
  // ... all other useMayaChat features
} = useMayaChat({
  studioProMode: false, // Feed Planner always Classic Mode for chat
  user,
  getModeString: () => 'maya', // Use maya chat type
})

// Add trigger detection for [CREATE_FEED_STRATEGY]
useEffect(() => {
  if (status === "streaming") return
  
  const lastMessage = messages[messages.length - 1]
  if (lastMessage?.role === 'assistant') {
    const trigger = detectFeedStrategyTrigger(lastMessage.content)
    if (trigger) {
      handleFeedStrategyTrigger(trigger)
    }
  }
}, [messages, status])
```

**Benefits:**
- ✅ No new hook needed
- ✅ Reuses all existing chat infrastructure
- ✅ Consistent with Maya chat patterns
- ✅ Less code to maintain

**Impact:** Saves ~300 lines of code, Phase 1.2 becomes much simpler

---

### **2. REUSE: Maya Chat Interface Component**

**Finding:** The plan creates `ConversationalStrategyBuilder`, but we already have `MayaChatInterface` component.

**Current Reality:**
- `MayaChatInterface` already handles:
  - Message display
  - Streaming indicators
  - Scroll handling
  - Input integration

**Recommendation:**
```typescript
// Instead of creating ConversationalStrategyBuilder:
// Just use MayaChatInterface directly

import MayaChatInterface from '@/components/sselfie/maya/maya-chat-interface'

<MayaChatInterface
  messages={messages}
  onSendMessage={sendMessage}
  status={status}
  inputValue={inputValue}
  onInputChange={setInputValue}
  // ... other props
/>
```

**Benefits:**
- ✅ No new component needed
- ✅ Consistent UI with Maya chat
- ✅ All existing features (scroll, streaming, etc.) work
- ✅ Less code duplication

**Impact:** Phase 1.5 becomes much simpler - just integrate existing component

---

### **3. REUSE: Maya Unified Input Component**

**Finding:** The plan doesn't mention input component, but we should reuse `MayaUnifiedInput`.

**Current Reality:**
- `MayaUnifiedInput` already handles:
  - Input field
  - Send button
  - Image upload (for Pro Mode)
  - Keyboard shortcuts

**Recommendation:**
```typescript
// Use existing input component
import MayaUnifiedInput from '@/components/sselfie/maya/maya-unified-input'

<MayaUnifiedInput
  value={inputValue}
  onChange={setInputValue}
  onSend={handleSend}
  disabled={status === 'streaming'}
  placeholder="Tell Maya about your Instagram feed..."
/>
```

**Benefits:**
- ✅ Consistent input experience
- ✅ All existing features work
- ✅ No new component needed

---

### **4. SIMPLIFY: System Prompt Integration**

**Finding:** Plan suggests adding to `maya-system-prompt.ts`, but file doesn't exist. Need to find actual system prompt location.

**Current Reality:**
- System prompts are in:
  - `lib/maya/personality.ts` (MAYA_SYSTEM_PROMPT)
  - `lib/maya/pro-personality.ts` (MAYA_PRO_SYSTEM_PROMPT)
  - Chat route uses `MAYA_SYSTEM_PROMPT` by default

**Recommendation:**
```typescript
// Add Feed Planner guidance to existing MAYA_SYSTEM_PROMPT in lib/maya/personality.ts
// OR create feed-planner-specific prompt that's injected when in Feed Planner context

// Better approach: Add Feed Planner context to chat route when chatType is 'feed_planner'
// This way we can use different system prompts for different contexts
```

**Impact:** Need to find correct system prompt file first, then add guidance there

---

### **5. REUSE: Instagram Feed View Component**

**Finding:** Plan creates `LiveFeedTracker`, but we already have `InstagramFeedView` that does exactly this!

**Current Reality:**
- `InstagramFeedView` already:
  - Uses SWR polling (Phase 1.1 complete)
  - Shows live grid
  - Displays post statuses
  - Has progress tracking
  - Shows Pro Mode badges

**Recommendation:**
```typescript
// Instead of creating LiveFeedTracker:
// Just use existing InstagramFeedView

<InstagramFeedView
  feedId={feedId}
  onBack={() => setStep('conversation')}
/>

// Already has:
// - SWR polling ✅
// - Progress tracking ✅
// - Grid display ✅
// - Post statuses ✅
```

**Benefits:**
- ✅ Phase 2 is already done!
- ✅ No new components needed
- ✅ Consistent with existing feed view
- ✅ All features already work

**Impact:** Phase 2 becomes "Just use existing component" - saves entire phase

---

### **6. SIMPLIFY: Strategy Preview Component**

**Finding:** Plan's StrategyPreview component is good, but we can reuse existing grid preview patterns.

**Current Reality:**
- `feed-grid-preview.tsx` exists (used in feed planner)
- Has grid layout patterns
- Has post type handling

**Recommendation:**
```typescript
// Create StrategyPreview but reuse grid layout patterns from feed-grid-preview.tsx
// Don't duplicate grid logic - extract to shared component or reuse styles
```

---

### **7. SIMPLIFY: Trigger Detection Pattern**

**Finding:** Plan suggests detecting `[CREATE_FEED_STRATEGY]` trigger, but need to understand existing trigger pattern.

**Current Reality:**
- Maya uses tool calls, not text triggers
- Looking at code, concepts are generated via tool calls: `tool-generateConcepts`
- Need to check if Feed Planner should use tool calls or text triggers

**Recommendation:**
```typescript
// Option A: Use tool calls (like concepts)
// Add tool to chat route: tool-createFeedStrategy
// More consistent with existing pattern

// Option B: Use text trigger: [CREATE_FEED_STRATEGY: {...}]
// Simpler but less consistent
// Need to parse JSON from message content

// Recommendation: Use tool calls for consistency
```

---

### **8. SIMPLIFY: API Route Integration**

**Finding:** Plan suggests creating new chat endpoint, but we can use existing `/api/maya/chat` route.

**Current Reality:**
- `/api/maya/chat` already handles:
  - Authentication
  - Credit checking
  - Message streaming
  - Tool calls
  - System prompts

**Recommendation:**
```typescript
// Use existing /api/maya/chat route
// Add Feed Planner context via chatType or query param
// Add Feed Planner system prompt when in Feed Planner context
// Add tool-createFeedStrategy tool call handler

// No new route needed!
```

**Benefits:**
- ✅ Reuses existing infrastructure
- ✅ Consistent with Maya chat
- ✅ Less code duplication

---

## 📋 Revised Implementation Plan

### **Phase 1: Conversational Strategy Builder (SIMPLIFIED)**

**Step 1.1: Audit** ✅ (Done)

**Step 1.2: Integrate Maya Chat** (Instead of creating new hook)
- Use `useMayaChat` hook directly
- Add trigger detection for feed strategy
- Add Feed Planner context to chat

**Step 1.3: Update System Prompt**
- Find actual system prompt file (`lib/maya/personality.ts`)
- Add Feed Planner guidance

**Step 1.4: Create Strategy Preview Component**
- New component, but reuse grid layout patterns
- Show strategy before generation

**Step 1.5: Integrate into Feed Planner Screen**
- Use `MayaChatInterface` component (not new component)
- Use `MayaUnifiedInput` component (not new component)
- Show strategy preview when detected
- Transition to feed view when approved

### **Phase 2: Live Generation Experience (ALREADY DONE!)**

**Step 2.1-2.3: Use Existing InstagramFeedView**
- Already has SWR polling ✅
- Already has progress tracking ✅
- Already has grid display ✅
- Already has Pro Mode badges ✅

**Recommendation:** Skip Phase 2 entirely - just use existing component!

### **Phase 3: Post-Generation Features**
- Drag-and-drop: Keep as planned (new feature)
- Reorder API: Keep as planned (new feature)
- Download bundle: Keep as planned (new feature)

### **Phase 4: Polish & Design**
- Keep as planned
- Apply Maya design system
- Mobile optimization
- Error handling

---

## 🎯 Key Simplifications Summary

| Original Plan | Simplified Approach | Lines Saved |
|--------------|-------------------|-------------|
| Create `use-feed-planner-chat.ts` hook | Use `useMayaChat` directly | ~300 |
| Create `ConversationalStrategyBuilder` | Use `MayaChatInterface` | ~200 |
| Create `LiveFeedTracker` | Use `InstagramFeedView` | ~400 |
| Create new chat API route | Use `/api/maya/chat` | ~150 |
| **Total** | | **~1050 lines** |

---

## ✅ Final Recommendations

### **What to Keep from Plan:**
1. ✅ Strategy Preview component (new, needed)
2. ✅ Trigger detection logic (new, needed)
3. ✅ System prompt additions (needed)
4. ✅ Phase 3 features (drag-drop, download) - new features
5. ✅ Phase 4 polish (needed)

### **What to Simplify:**
1. ❌ Don't create `use-feed-planner-chat.ts` - use `useMayaChat`
2. ❌ Don't create `ConversationalStrategyBuilder` - use `MayaChatInterface`
3. ❌ Don't create `LiveFeedTracker` - use `InstagramFeedView`
4. ❌ Don't create new chat route - use `/api/maya/chat`
5. ❌ Skip Phase 2 entirely - already done!

### **Revised Phase Structure:**

**Phase 1: Conversational Strategy (2-3 days)**
- Integrate Maya chat (reuse existing)
- Add trigger detection
- Create strategy preview
- Integrate into screen

**Phase 2: SKIP - Already Complete!**
- InstagramFeedView already does everything

**Phase 3: Post-Generation Features (2-3 days)**
- Drag-and-drop reordering
- Download bundle
- Individual regeneration

**Phase 4: Polish (1-2 days)**
- Design system application
- Mobile optimization
- Error handling

**Total Estimated Time: 5-8 days (down from 8-12 days)**

---

## 🚨 Critical Questions to Resolve

1. **Trigger Pattern:**
   - Use tool calls (like concepts) or text triggers?
   - Recommendation: Tool calls for consistency

2. **System Prompt Location:**
   - Need to find actual system prompt file
   - Likely `lib/maya/personality.ts`

3. **Chat Type/Context:**
   - How to distinguish Feed Planner chat from regular Maya chat?
   - Option A: Different chatType ('feed_planner' vs 'maya')
   - Option B: Query parameter or header
   - Recommendation: chatType='feed_planner'

4. **Strategy Generation API:**
   - Should we call existing `/api/feed-planner/create-strategy` after trigger?
   - Or generate strategy in chat route via tool call?
   - Recommendation: Call existing API (simpler, reuses existing logic)

---

## 📝 Updated Checklist

### **Before Starting:**
- [ ] Find actual system prompt file location
- [ ] Decide on trigger pattern (tool calls vs text)
- [ ] Decide on chat type/context identification
- [ ] Review InstagramFeedView component (already done Phase 2!)

### **Phase 1 (Simplified):**
- [ ] Integrate useMayaChat hook
- [ ] Add trigger detection (tool call or text)
- [ ] Update system prompt with Feed Planner guidance
- [ ] Create StrategyPreview component
- [ ] Integrate MayaChatInterface and MayaUnifiedInput
- [ ] Test conversation flow

### **Phase 2:**
- [ ] SKIP - Already complete!

### **Phase 3:**
- [ ] Add drag-and-drop to InstagramFeedView
- [ ] Create reorder API endpoint
- [ ] Add download bundle feature

### **Phase 4:**
- [ ] Apply design system
- [ ] Mobile optimization
- [ ] Error handling

---

## 🎉 Conclusion

The plan is **good but over-engineered**. By reusing existing Maya chat infrastructure, we can:

- ✅ Save ~1050 lines of code
- ✅ Reduce implementation time from 8-12 days to 5-8 days
- ✅ Increase consistency with existing patterns
- ✅ Reduce maintenance burden
- ✅ Faster to implement

**The key insight:** Feed Planner conversation can be built on top of Maya chat infrastructure with minimal new code. We're extending, not replacing.


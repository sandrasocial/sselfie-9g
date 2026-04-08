# Phase 1.1 Audit Summary - Maya Chat System Patterns

**Date:** 2025-01-30  
**Status:** ✅ Audit Complete - Ready for Review

---

## 📋 Executive Summary

After reading the key files, I've identified the patterns used in Maya's chat system. Here's a comprehensive summary of how trigger detection, hooks, components, and system prompts work.

---

## 1. Trigger Detection Pattern ([GENERATE_CONCEPTS])

### **Location:** `components/sselfie/maya-chat-screen.tsx` (lines 533-641)

### **Key Pattern:**

```typescript
// 1. useEffect that runs when messages/status change
useEffect(() => {
  // 2. Early returns for safety
  if (messages.length === 0) return
  if (status === "streaming" || status === "submitted") return // CRITICAL: Don't process while streaming
  
  // 3. Find last assistant message
  const lastAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant")
  if (!lastAssistantMessage) return
  
  // 4. Get message ID for tracking
  const messageId = lastAssistantMessage.id?.toString() || `msg-${Date.now()}`
  
  // 5. Check if already processed (prevent infinite loops)
  if (processedMessagesRef.current.has(messageId)) return
  
  // 6. Extract text content using helper function
  const textContent = getMessageText(lastAssistantMessage)
  
  // 7. Use regex to detect trigger pattern
  const conceptMatch = textContent.match(/\[GENERATE_CONCEPTS\]\s*(.+?)(?:\n|$|\[|$)/i) || 
                      textContent.match(/\[GENERATE_CONCEPTS\]/i)
  
  // 8. Process trigger if found
  if (conceptMatch && !isGeneratingConcepts && !pendingConceptRequest) {
    const conceptRequest = conceptMatch[1]?.trim() || ''
    setPendingConceptRequest(conceptRequest || 'concept generation')
    return // Don't check other triggers
  }
}, [messages, status, isGeneratingConcepts, pendingConceptRequest])
```

### **Helper Function (getMessageText):**

```typescript
// Location: maya-chat-screen.tsx (line 287)
const getMessageText = useCallback((message: any): string => {
  // UIMessage uses parts array, not content property
  if (message.parts && Array.isArray(message.parts)) {
    return message.parts
      .filter((p: any) => p && p.type === "text" && p.text)
      .map((p: any) => p.text)
      .join("") || ""
  }
  // Fallback for legacy format (content property)
  if (typeof message.content === "string") {
    return message.content
  }
  return ""
}, [])
```

### **Key Insights:**

1. **Status Check is Critical:** Never process triggers while `status === "streaming"` or `"submitted"`
2. **Message Tracking:** Use refs to track processed messages (`processedMessagesRef.current`)
3. **Regex Pattern:** Uses flexible regex that matches trigger with or without parameters
4. **Text Extraction:** Messages use `parts` array (not `content` property) - need helper function
5. **Prevent Loops:** Always check if message already processed before handling trigger

### **For Feed Planner:**

We'll use the same pattern with `[CREATE_FEED_STRATEGY: {...}]` trigger:
```typescript
const strategyMatch = textContent.match(/\[CREATE_FEED_STRATEGY:\s*({[\s\S]+?})\]/i)
```

---

## 2. useMayaChat Hook Initialization

### **Location:** `components/sselfie/maya/hooks/use-maya-chat.ts`

### **Interface:**

```typescript
export interface UseMayaChatProps {
  initialChatId?: number
  studioProMode: boolean
  user: any | null
  getModeString: () => "pro" | "maya"
}

export interface UseMayaChatReturn {
  // Chat state
  chatId: number | null
  chatTitle: string
  isLoadingChat: boolean
  hasUsedMayaBefore: boolean
  
  // Chat operations
  loadChat: (specificChatId?: number) => Promise<void>
  handleNewChat: () => Promise<void>
  handleSelectChat: (selectedChatId: number, selectedChatTitle?: string) => void
  handleDeleteChat: (deletedChatId: number) => void
  
  // Setters
  setChatId: (id: number | null) => void
  setChatTitle: (title: string) => void
  setIsLoadingChat: (loading: boolean) => void
  
  // Refs
  savedMessageIds: React.MutableRefObject<Set<string>>
  hasLoadedChatRef: React.MutableRefObject<boolean>
  
  // useChat integration (from AI SDK)
  messages: any[]
  sendMessage: any
  status: any
  setMessages: any
}
```

### **How It Works:**

1. **Integrates useChat from AI SDK:**
   ```typescript
   const { messages, sendMessage, status, setMessages } = useChat({
     transport: new DefaultChatTransport({
       api: "/api/maya/chat",
       headers: {
         "x-studio-pro-mode": studioProMode ? "true" : "false",
       },
     }),
     onError: (error) => { /* error handling */ },
   })
   ```

2. **Chat Loading Logic:**
   - Loads chat from `/api/maya/load-chat?chatType=${chatType}`
   - Uses `chatType` from `getModeString()` ('maya' or 'pro')
   - Saves/loads chatId from localStorage
   - Populates `savedMessageIds` ref BEFORE setting messages (prevents trigger loops)

3. **Chat Persistence:**
   - Saves chatId to localStorage when it changes
   - Loads saved chatId on mount
   - Uses `chatType` to distinguish Classic vs Pro chats

### **For Feed Planner:**

```typescript
const {
  messages,
  sendMessage,
  status,
  setMessages,
  chatId,
  // ... other features
} = useMayaChat({
  studioProMode: false, // Feed Planner always Classic Mode
  user: user,
  getModeString: () => 'maya', // Use 'maya' chat type (or could create 'feed_planner' type)
})
```

**Note:** We might want to create a new `chatType='feed_planner'` to distinguish Feed Planner chats from regular Maya chats, but starting with 'maya' is simpler.

---

## 3. MayaChatInterface Component Usage

### **Location:** `components/sselfie/maya/maya-chat-interface.tsx`

### **Props Interface:**

```typescript
interface MayaChatInterfaceProps {
  // Messages
  messages: UIMessage[]
  filteredMessages: UIMessage[]
  setMessages: React.Dispatch<React.SetStateAction<UIMessage[]>>
  
  // Mode
  studioProMode: boolean
  
  // States
  isTyping: boolean
  isGeneratingConcepts: boolean
  isGeneratingStudioPro: boolean
  contentFilter: "all" | "photos" | "videos"
  
  // Refs (required for scrolling)
  messagesContainerRef: React.RefObject<HTMLDivElement>
  messagesEndRef: React.RefObject<HTMLDivElement>
  showScrollButton: boolean
  isAtBottomRef: React.MutableRefObject<boolean>
  
  // Callbacks
  scrollToBottom: (behavior?: ScrollBehavior) => void
  
  // Concept Cards Props (optional)
  chatId?: number
  uploadedImages: Array<{ url: string; type: 'base' | 'product'; label?: string; source?: 'gallery' | 'upload' }>
  setCreditBalance: (balance: number) => void
  onImageGenerated?: () => void
  isAdmin: boolean
  selectedGuideId: number | null
  selectedGuideCategory: string | null
  onSaveToGuide: (concept: any, imageUrl?: string) => void
  userId?: string
  user: any | null
  
  // Prompt Suggestions
  promptSuggestions: PromptSuggestion[]
  
  // Carousel Generation
  generateCarouselRef: React.MutableRefObject<((params: { topic: string; slideCount: number }) => Promise<void>) | null>
}
```

### **What It Does:**

- Renders all chat messages (text, images, concept cards, video cards, carousels)
- Handles scrolling and scroll-to-bottom button
- Shows typing indicator
- Handles markdown rendering
- Filters messages based on contentFilter
- Shows concept cards when present

### **For Feed Planner:**

We need to provide minimal props (many are optional):

```typescript
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
  chatId={undefined} // Optional
  uploadedImages={[]} // Not needed for Feed Planner
  setCreditBalance={() => {}} // Not needed
  isAdmin={false}
  selectedGuideId={null}
  selectedGuideCategory={null}
  onSaveToGuide={() => {}}
  promptSuggestions={[]}
  generateCarouselRef={{ current: null }}
/>
```

**We'll need to create the refs and scroll handler - same pattern as Maya chat screen.**

---

## 4. System Prompt Location & Structure

### **Location:** `lib/maya/personality.ts`

### **Export:**

```typescript
export const MAYA_SYSTEM_PROMPT = `You're Maya - a creative partner who helps people create stunning Instagram content.

Think of yourself as that friend with impeccable taste who always knows exactly what will look amazing. You're a personal branding expert and visual storyteller.

## 🔴🔴🔴 CRITICAL - CHAT RESPONSE RULES (NOT PROMPT GENERATION) 🔴🔴🔴
...
`
```

### **How It's Used:**

In `app/api/maya/chat/route.ts` (line 2):
```typescript
import { MAYA_SYSTEM_PROMPT } from "@/lib/maya/personality"
```

Then used in `streamText` call:
```typescript
const result = streamText({
  model: "anthropic/claude-sonnet-4",
  system: systemPrompt, // MAYA_SYSTEM_PROMPT or MAYA_PRO_SYSTEM_PROMPT
  messages: modelMessages,
  // ...
})
```

### **For Feed Planner:**

**Option 1: Add to Existing Prompt (Simpler)**
- Add Feed Planner guidance section to `MAYA_SYSTEM_PROMPT` in `lib/maya/personality.ts`
- Works if Feed Planner uses same chat type ('maya')

**Option 2: Conditional Prompt (More Flexible)**
- Check `chatType` in `/api/maya/chat/route.ts`
- If `chatType === 'feed_planner'`, append Feed Planner guidance
- More flexible but requires chat route changes

**Recommendation:** Start with Option 1 (add to existing prompt), we can always refactor to Option 2 later.

### **Where to Add:**

Add Feed Planner section at the end of `MAYA_SYSTEM_PROMPT` in `lib/maya/personality.ts`, before the closing backtick:

```typescript
export const MAYA_SYSTEM_PROMPT = `
... existing prompt content ...

## Feed Planner Workflow (when user is in Feed Planner context)

When the user wants to create an Instagram feed strategy, guide them through this conversation:

[Feed Planner guidance here]

`
```

---

## 📊 Key Takeaways for Implementation

### **1. Trigger Detection:**
- ✅ Use `useEffect` with `[messages, status]` dependencies
- ✅ Check `status !== "streaming" && status !== "submitted"` FIRST
- ✅ Use `getMessageText()` helper to extract text from message parts
- ✅ Use regex pattern: `/\[CREATE_FEED_STRATEGY:\s*({[\s\S]+?})\]/i`
- ✅ Track processed messages with refs to prevent loops

### **2. useMayaChat Hook:**
- ✅ Initialize with `studioProMode: false`, `user`, and `getModeString: () => 'maya'`
- ✅ Hook handles all chat state, persistence, loading automatically
- ✅ Returns `messages`, `sendMessage`, `status`, `setMessages` ready to use
- ✅ No need to create new hook - use directly!

### **3. MayaChatInterface:**
- ✅ Many props are optional - provide minimal required props
- ✅ Need to create refs: `messagesContainerRef`, `messagesEndRef`, `isAtBottomRef`
- ✅ Need scroll handler: `scrollToBottom` function
- ✅ Can pass empty arrays/functions for unused features

### **4. System Prompt:**
- ✅ Location: `lib/maya/personality.ts`
- ✅ Export: `MAYA_SYSTEM_PROMPT`
- ✅ Add Feed Planner section at end of prompt
- ✅ Used in `/api/maya/chat/route.ts` via import

---

## 🔍 Additional Findings

### **Message Format:**
- Messages use `parts` array (not `content` property)
- Text parts: `{ type: "text", text: "..." }`
- Image parts: `{ type: "image", image: "url" }`
- Custom tool parts: `{ type: "tool-generateConcepts", output: {...} }`

### **Chat Type System:**
- `chatType` can be: 'maya' (Classic), 'pro' (Pro Mode), 'prompt_builder' (Admin)
- Used in `/api/maya/load-chat?chatType=${chatType}`
- Used in `/api/maya/new-chat` body: `{ chatType }`
- Could add 'feed_planner' type, but 'maya' works fine for now

### **sendMessage Usage:**
- From useChat: `sendMessage({ content: "message text" })`
- Can also send with image: `sendMessage({ content: "text", experimental_attachments: [...] })`

---

## ✅ Ready for Implementation

All patterns understood. Ready to proceed with Phase 1.2 after review.

**Key Files Referenced:**
- ✅ `components/sselfie/maya/hooks/use-maya-chat.ts` - Hook pattern
- ✅ `components/sselfie/maya-chat-screen.tsx` (533-641) - Trigger detection
- ✅ `components/sselfie/maya/maya-chat-interface.tsx` - Component props
- ✅ `app/api/maya/chat/route.ts` - API route (system prompt usage)
- ✅ `lib/maya/personality.ts` - System prompt location


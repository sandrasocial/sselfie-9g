# Maya Pro Mode Issues Audit

## Issues Identified

1. **Images showing URLs instead of visual thumbnails** in concept cards
2. **Prompts defaulting to the same** (not dynamic, not using chat history)
3. **Chat history not being saved/loaded correctly** in Pro Mode

---

## Issue 1: Images Showing URLs Instead of Thumbnails

### Current Implementation

**Location:** `components/sselfie/pro-mode/ConceptCardPro.tsx` (Lines 66-72, 121-144)

**Problem:**
```typescript
// Line 66-72: formatLinkedImages() just joins URLs
const formatLinkedImages = () => {
  if (!concept.linkedImages || concept.linkedImages.length === 0) {
    return 'No images linked'
  }
  return concept.linkedImages.join(' • ')  // ❌ Just joining URLs as text
}

// Line 133-143: Displaying URLs as text
<p style={{...}}>
  {formatLinkedImages()}  // ❌ Shows full URL strings
</p>
```

**Expected Behavior:**
- Display image thumbnails in a grid
- Show "Images Linked • 3" with visual thumbnails
- Clickable thumbnails that open full-size view

### Solution

**Replace text display with image thumbnails:**

```typescript
// Replace formatLinkedImages() with thumbnail grid component
const ImageThumbnailsGrid = ({ images }: { images: string[] }) => {
  if (!images || images.length === 0) return null
  
  return (
    <div className="grid grid-cols-3 gap-2 mt-2">
      {images.map((imageUrl, index) => (
        <div
          key={index}
          className="aspect-square rounded-lg overflow-hidden border"
          style={{
            borderColor: Colors.border,
            borderRadius: BorderRadius.image,
          }}
        >
          <img
            src={imageUrl}
            alt={`Linked image ${index + 1}`}
            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => {
              // TODO: Open full-size modal
            }}
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg'
            }}
          />
        </div>
      ))}
    </div>
  )
}

// Update display section (Line 121-144):
<div className="space-y-2">
  <p style={{...}}>
    {UILabels.imagesLinked(concept.linkedImages?.length || 0)}
  </p>
  {/* Replace text display with thumbnails */}
  {concept.linkedImages && concept.linkedImages.length > 0 && (
    <ImageThumbnailsGrid images={concept.linkedImages} />
  )}
</div>
```

**Files to Modify:**
- `components/sselfie/pro-mode/ConceptCardPro.tsx` (Lines 66-144)

---

## Issue 2: Prompts Defaulting to the Same

### Current Implementation

**Location:** `app/api/maya/pro/generate-concepts/route.ts`

**Problem:**
- Prompts are generated using Universal Prompts system (placeholder prompts)
- Not using chat history to personalize prompts
- Not using user's previous requests to vary prompts
- Same prompts generated for every request

**Evidence:**
```typescript
// Line 187-223: Uses placeholder Universal Prompts
const placeholderPrompts: UniversalPrompt[] = [
  {
    id: `concept-1-${category}`,
    title: `${categoryInfo.name} Concept 1`,
    description: `Professional ${categoryInfo.name.toLowerCase()} content...`,
    fullPrompt: `Professional photography. Influencer/Pinterest style portrait maintaining exactly the same physical characteristics. ${categoryInfo.description}. Shot on iPhone 15 Pro, natural skin texture, film grain, muted colors.`,
    // ❌ Same template for every concept
  },
  // ...
]
```

**Root Cause:**
1. `getCategoryPrompts()` returns placeholder prompts (not real Universal Prompts)
2. Prompts don't use chat history or user's previous requests
3. No dynamic variation based on conversation context

### Solution

**Option A: Use AI to Generate Dynamic Prompts (Recommended)**

Modify `app/api/maya/pro/generate-concepts/route.ts` to:
1. Accept `chatHistory` parameter
2. Use Maya's AI to generate unique prompts based on:
   - User's request
   - Chat history
   - Library content
   - Category detection

```typescript
// Add chatHistory to request body
const { userRequest, imageLibrary, category, essenceWords, concepts, chatHistory } = body

// Use AI to generate dynamic prompts
const { text } = await generateText({
  model: 'anthropic/claude-sonnet-4-20250514',
  messages: [
    {
      role: 'system',
      content: `You are Maya, generating unique concept prompts for Studio Pro Mode.
      
Based on:
- User request: "${userRequest}"
- Chat history: ${JSON.stringify(chatHistory?.slice(-5) || [])}
- Library: ${library.selfies.length} selfies, ${library.products.length} products
- Category: ${categoryInfo?.name || 'Dynamic'}

Generate 3-6 unique, varied concept prompts. Each should be different and creative.`
    },
    {
      role: 'user',
      content: `Generate ${targetCount} unique concept prompts for: ${userRequest}`
    }
  ],
  maxTokens: 2000,
  temperature: 0.85,
})

// Parse AI response and use as prompts
```

**Option B: Enhance Placeholder Prompts with Variation**

Add variation logic to placeholder prompts:
- Use user request keywords
- Vary locations, poses, styling
- Use chat history to inform variations

**Files to Modify:**
- `app/api/maya/pro/generate-concepts/route.ts` (Lines 187-238)
- Add `chatHistory` parameter to request body
- Replace placeholder prompts with AI-generated or varied prompts

---

## Issue 3: Chat History Not Saved/Loaded in Pro Mode

### Current Implementation

**Location:** `components/sselfie/pro-mode/hooks/useProModeChat.ts`

**Problem:**
1. **Chat history is NOT saved to database:**
   - `useProModeChat` only maintains messages in component state
   - No API call to save messages to `maya_chat_messages` table
   - Messages are lost on page refresh

2. **Chat history is NOT loaded on mount:**
   - `useProModeChat` initializes with empty messages array
   - No `useEffect` to load existing chat history from database
   - No integration with `getOrCreateActiveChat` or `getChatMessages`

3. **Chat history is passed to API but not persisted:**
   - Line 133: `chatHistory: messages.map(...)` - passes current session messages
   - But these messages are only in memory, not in database
   - On page refresh, chat history is empty

**Evidence:**
```typescript
// useProModeChat.ts - Line 84
const [messages, setMessages] = useState<ProModeMessage[]>([])  // ❌ Always empty on mount

// No useEffect to load chat history
// No saveChatMessage calls
// No integration with maya_chat_messages table
```

### Solution

**1. Add Chat ID Management:**

```typescript
// Add to useProModeChat.ts
const [chatId, setChatId] = useState<number | null>(null)

// Load chat on mount
useEffect(() => {
  const loadChat = async () => {
    try {
      const response = await fetch('/api/maya/load-chat?chatType=pro')
      const data = await response.json()
      if (data.chatId) {
        setChatId(data.chatId)
        // Load messages
        const messagesResponse = await fetch(`/api/maya/load-chat?chatId=${data.chatId}`)
        const messagesData = await messagesResponse.json()
        // Convert to ProModeMessage format
        setMessages(messagesData.messages || [])
      }
    } catch (error) {
      console.error('[useProModeChat] Error loading chat:', error)
    }
  }
  loadChat()
}, [])
```

**2. Save Messages to Database:**

```typescript
// After receiving Maya's response, save to database
const saveMessage = async (role: 'user' | 'assistant', content: string) => {
  if (!chatId) return
  
  try {
    await fetch('/api/maya/save-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId,
        role,
        content,
      }),
    })
  } catch (error) {
    console.error('[useProModeChat] Error saving message:', error)
  }
}

// Call saveMessage after user sends message
// Call saveMessage after Maya responds
```

**3. Use Pro Mode Database Tables (if separate tables exist):**

Check if Pro Mode should use separate tables:
- `pro_mode_sessions` - tracks sessions
- Or use `maya_chats` with `chat_type = 'pro'` column

**Files to Modify:**
- `components/sselfie/pro-mode/hooks/useProModeChat.ts`:
  - Add chat ID state
  - Add `useEffect` to load chat on mount
  - Add `saveMessage` function
  - Call `saveMessage` after user/Maya messages

**Files to Check/Create:**
- Verify `maya_chats` table has `chat_type` column
- Or verify Pro Mode uses `pro_mode_sessions` table
- Check if separate Pro Mode message table exists

---

## Database Tables Investigation

### Current Tables

**Classic Mode:**
- `maya_chats` - chat sessions
- `maya_chat_messages` - chat messages

**Pro Mode:**
- `pro_mode_sessions` - session tracking (library snapshots, stats)
- **Question:** Does Pro Mode use `maya_chat_messages` or separate table?

### Recommendation

**Option 1: Use Same Tables with Type Column**
- Add `chat_type` column to `maya_chats` (if not exists)
- Use `chat_type = 'pro'` for Pro Mode chats
- Use same `maya_chat_messages` table

**Option 2: Separate Pro Mode Tables**
- Create `pro_mode_chats` table
- Create `pro_mode_chat_messages` table
- Separate storage for Pro Mode

**Check Required:**
```sql
-- Check if chat_type column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'maya_chats' AND column_name = 'chat_type';

-- Check for Pro Mode specific tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE '%pro_mode%' OR table_name LIKE '%pro%chat%';
```

---

## Implementation Priority

### High Priority (Critical UX Issues)

1. **Fix Image Thumbnails** (Issue 1)
   - Users can't see what images are linked
   - Breaks visual understanding of concepts
   - **Estimated Time:** 30 minutes

2. **Fix Chat History Loading** (Issue 3 - Loading)
   - Messages lost on refresh
   - Poor user experience
   - **Estimated Time:** 1-2 hours

3. **Fix Chat History Saving** (Issue 3 - Saving)
   - Messages not persisted
   - No conversation continuity
   - **Estimated Time:** 1 hour

### Medium Priority (Enhancement)

4. **Fix Dynamic Prompts** (Issue 2)
   - Prompts are repetitive but functional
   - Enhancement for better UX
   - **Estimated Time:** 2-3 hours

---

## Files to Modify

### Issue 1: Image Thumbnails
- `components/sselfie/pro-mode/ConceptCardPro.tsx` (Lines 66-144)

### Issue 2: Dynamic Prompts
- `app/api/maya/pro/generate-concepts/route.ts` (Lines 187-238)
- Add `chatHistory` parameter handling
- Replace placeholder prompts with AI-generated or varied prompts

### Issue 3: Chat History
- `components/sselfie/pro-mode/hooks/useProModeChat.ts`:
  - Add chat ID state and loading
  - Add message saving
  - Add `useEffect` to load chat on mount
- Verify database schema:
  - Check for `chat_type` column in `maya_chats`
  - Or check for Pro Mode specific tables

---

## Testing Checklist

### Issue 1: Image Thumbnails
- [ ] Images display as thumbnails (not URLs)
- [ ] Thumbnails are clickable
- [ ] Thumbnails show correct images
- [ ] Handles missing/broken images gracefully
- [ ] Matches Pro Mode design system

### Issue 2: Dynamic Prompts
- [ ] Prompts vary between requests
- [ ] Prompts use chat history context
- [ ] Prompts reflect user's request
- [ ] Prompts are creative and unique
- [ ] No duplicate prompts in same generation

### Issue 3: Chat History
- [ ] Chat history loads on page refresh
- [ ] Messages are saved to database
- [ ] Previous conversations are accessible
- [ ] Chat history is used in prompt generation
- [ ] Pro Mode uses correct database tables

---

## Summary

### Critical Issues Found:

1. ✅ **Image Thumbnails:** URLs displayed instead of images - **FIX NEEDED**
2. ✅ **Dynamic Prompts:** Using placeholder prompts, not using chat history - **FIX NEEDED**
3. ✅ **Chat History:** Not saved/loaded - **FIX NEEDED**

### Root Causes:

1. **Image Display:** `formatLinkedImages()` returns text instead of rendering images
2. **Prompt Generation:** 
   - Using placeholder Universal Prompts (same template every time)
   - Pro Mode generate-concepts API doesn't accept `conversationContext` or `chatHistory`
   - `useConceptGeneration` hook doesn't pass chat history to API
   - Classic Mode builds `conversationContext` from messages (line 1086-1105), Pro Mode doesn't
3. **Chat History:** 
   - `useProModeChat` doesn't load chat history on mount
   - `useProModeChat` doesn't save messages to database
   - Should use `chatType = 'pro'` when loading/saving (database supports this via `chat_type` column)

### Detailed Findings:

#### Issue 1: Image Thumbnails
- **File:** `components/sselfie/pro-mode/ConceptCardPro.tsx` (Line 66-144)
- **Problem:** `formatLinkedImages()` joins URLs as text string
- **Fix:** Replace with image thumbnail grid component

#### Issue 2: Dynamic Prompts
- **Files:**
  - `app/api/maya/pro/generate-concepts/route.ts` (Line 197) - doesn't accept `conversationContext`
  - `components/sselfie/pro-mode/hooks/useConceptGeneration.ts` (Line 204) - doesn't pass chat history
  - `lib/maya/pro/category-system.ts` (Line 187-238) - returns placeholder prompts
- **Problem:** 
  - Same placeholder prompts generated every time
  - Chat history not used to personalize prompts
  - No AI generation for unique prompts
- **Fix:** 
  - Add `conversationContext` parameter to Pro Mode generate-concepts API
  - Pass chat history from `useConceptGeneration` hook
  - Use AI to generate dynamic prompts based on chat history

#### Issue 3: Chat History
- **File:** `components/sselfie/pro-mode/hooks/useProModeChat.ts`
- **Problems:**
  - Line 84: `useState<ProModeMessage[]>([])` - always empty on mount
  - No `useEffect` to load chat from database
  - No `saveMessage` calls to persist messages
  - Chat history passed to API (line 133) but only in-memory, lost on refresh
- **Fix:**
  - Add chat ID state and loading logic
  - Load chat on mount using `chatType = 'pro'`
  - Save messages to database after user/Maya messages
  - Use `getOrCreateActiveChat(userId, 'pro')` for Pro Mode

### Next Steps:

1. **Fix image thumbnails display** (30 min)
2. **Add chat history save/load to `useProModeChat`** (1-2 hours)
3. **Add `conversationContext` to Pro Mode generate-concepts API** (30 min)
4. **Pass chat history from `useConceptGeneration` hook** (30 min)
5. **Enhance prompt generation to use chat history and AI** (2-3 hours)
6. **Verify Pro Mode uses `chatType = 'pro'`** (15 min)






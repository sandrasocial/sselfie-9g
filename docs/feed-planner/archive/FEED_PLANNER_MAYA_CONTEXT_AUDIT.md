# Feed Planner Maya Context Audit & Solution Plan

**Date:** 2025-01-30  
**Status:** 🔴 **CRITICAL ISSUE IDENTIFIED**

## 🎯 Problem Statement

Maya is currently operating in **"Maya Chat Mode"** when used in the Feed Planner, which causes confusion because:

1. **Maya doesn't know she's in Feed Planner context** - She thinks she's helping with regular image generation
2. **System prompt is generic** - Uses the same `MAYA_SYSTEM_PROMPT` as regular Maya chat, with only a small section about Feed Planner
3. **No context isolation** - Feed Planner chats are stored as type `'maya'`, mixing them with regular Maya chat history
4. **Maya might try to generate images** - Instead of focusing on feed strategy creation
5. **User confusion** - Maya might reference image generation features that don't apply to Feed Planner

## 🔍 Current Implementation Audit

### **Current Flow:**

1. **Feed Planner Screen** (`components/feed-planner/feed-planner-screen.tsx`):
   - Line 36: `getModeString = useCallback(() => 'maya', [])` - Returns `'maya'` (NOT `'feed-planner'`)
   - Line 49: `getModeString: getModeString` - Passes `'maya'` to `useMayaChat`
   - Uses `useMayaChat` hook with `chatType: 'maya'`

2. **useMayaChat Hook** (`components/sselfie/maya/hooks/use-maya-chat.ts`):
   - Line 114-120: Configures `useChat` from AI SDK with `/api/maya/chat` endpoint
   - Line 162: Loads chats using `chatType` from `getModeString()` (which is `'maya'`)
   - Sends `chatType` in requests to `/api/maya/load-chat` and `/api/maya/new-chat`

3. **Maya Chat API** (`app/api/maya/chat/route.ts`):
   - Line 107: Extracts `chatType` from request body
   - Line 623-628: Determines system prompt based on `chatType`:
     - `chatType === "prompt_builder"` → Uses `PROMPT_BUILDER_SYSTEM`
     - Otherwise → Uses `MAYA_SYSTEM_PROMPT` or `MAYA_PRO_SYSTEM_PROMPT`
   - **ISSUE:** No handling for `chatType === "feed-planner"`

4. **Maya System Prompt** (`lib/maya/personality.ts`):
   - Lines 469-545: Contains a "Feed Planner Workflow" section
   - **ISSUE:** This section is buried in a 500+ line prompt, so Maya might miss it
   - **ISSUE:** The section is conditional ("when user is in Feed Planner context") but there's no clear signal

## 🎯 Solution: Create Dedicated Feed Planner Mode

### **Option A: New Chat Type (RECOMMENDED)** ✅

Create a dedicated `"feed-planner"` chat type that:
- Uses a **dedicated system prompt** optimized for Feed Planner
- Stores chats separately from regular Maya chats
- Makes it clear to Maya she's in Feed Planner mode
- Prevents confusion about image generation vs strategy creation

**Implementation Steps:**

1. **Create Feed Planner System Prompt** (`lib/maya/feed-planner-personality.ts`):
   - Extract Feed Planner workflow from `personality.ts`
   - Add clear context at the top: "You are Maya in FEED PLANNER MODE"
   - Remove all image generation instructions (concepts, Studio Pro, etc.)
   - Focus ONLY on: strategy creation, feed planning, captions, hashtags
   - Add explicit instructions: "DO NOT generate images, DO NOT create concepts, ONLY create feed strategies"

2. **Update Feed Planner Screen**:
   - Change `getModeString()` to return `'feed-planner'` instead of `'maya'`

3. **Update Maya Chat API**:
   - Add handling for `chatType === "feed-planner"`
   - Use the new Feed Planner system prompt

4. **Update Database Schema** (if needed):
   - Verify `chatType` column supports `'feed-planner'` value
   - Check if there are any constraints

5. **Isolate Chat History**:
   - Feed Planner chats stored separately
   - Regular Maya chats don't interfere with Feed Planner
   - User sees separate chat histories

**Pros:**
- ✅ Clean separation of concerns
- ✅ Maya knows exactly what mode she's in
- ✅ No confusion about capabilities
- ✅ Easier to maintain and debug
- ✅ Chat history stays organized

**Cons:**
- ⚠️ Requires new system prompt file
- ⚠️ Requires API route update
- ⚠️ Requires database verification

---

### **Option B: Context Header (ALTERNATIVE)** ⚠️

Pass a header or context flag to indicate Feed Planner mode:
- Add `x-feed-planner-mode: true` header to requests
- Check header in API route
- Append Feed Planner instructions to system prompt dynamically

**Pros:**
- ✅ Minimal code changes
- ✅ Reuses existing infrastructure

**Cons:**
- ❌ Less clear separation
- ❌ Maya might still be confused
- ❌ Chat history still mixed
- ❌ System prompt becomes conditional (harder to maintain)

---

## 📋 Recommended Implementation Plan

### **Phase 1: Create Feed Planner System Prompt** (30 min)

1. Create `lib/maya/feed-planner-personality.ts`:
   - Start with a focused prompt: "You are Maya in FEED PLANNER MODE"
   - Include ONLY Feed Planner workflow (no image generation)
   - Add explicit rules: "DO NOT generate images, ONLY create strategies"
   - Include the `[CREATE_FEED_STRATEGY]` trigger format
   - Add credit calculation rules
   - Add Pro Mode detection guidance

2. Test the prompt structure:
   - Ensure it's clear and focused
   - Verify it doesn't mention image generation

---

### **Phase 2: Update Feed Planner Screen** (15 min)

1. Update `components/feed-planner/feed-planner-screen.tsx`:
   - Line 36: Change `getModeString()` to return `'feed-planner'`

2. Verify `useMayaChat` supports custom chat types:
   - Check if it accepts any string or only specific values
   - Update type definitions if needed

---

### **Phase 3: Update Maya Chat API** (30 min)

1. Update `app/api/maya/chat/route.ts`:
   - Import the new Feed Planner system prompt
   - Add condition: `if (chatType === "feed-planner")` → Use Feed Planner prompt
   - Ensure `chatType` is extracted from request body correctly

2. Test API endpoint:
   - Verify Feed Planner requests use correct prompt
   - Verify regular Maya chat still works

---

### **Phase 4: Database Verification** (15 min)

1. Check `maya_chats` table schema:
   - Verify `chat_type` column supports `'feed-planner'`
   - Check constraints/ENUMs
   - Update if needed

2. Verify chat isolation:
   - Feed Planner chats load separately
   - Regular Maya chats don't show in Feed Planner
   - Chat history works correctly

---

### **Phase 5: Update useMayaChat Hook** (if needed) (15 min)

1. Check type definitions:
   - Update `getModeString` return type to include `'feed-planner'`
   - Ensure all chat operations support the new type

---

## 🔍 Key Differences: Feed Planner Mode vs Maya Chat Mode

| Aspect | Maya Chat Mode | Feed Planner Mode |
|--------|----------------|-------------------|
| **Primary Goal** | Generate individual images | Create 9-post feed strategy |
| **Output** | Concept cards → Images | Strategy JSON → Feed generation |
| **Tools** | Concept generation, image generation | Strategy planning, caption writing |
| **Trigger** | `[GENERATE_CONCEPTS]` | `[CREATE_FEED_STRATEGY]` |
| **User Journey** | Chat → Concepts → Generate → Download | Chat → Strategy → Preview → Generate Feed |
| **Credit Model** | Per image/concept | Per feed (strategy + images) |
| **Maya's Role** | Image creation assistant | Feed strategy consultant |

---

## 📝 Feed Planner System Prompt Template

```typescript
export const FEED_PLANNER_SYSTEM_PROMPT = `You are Maya in FEED PLANNER MODE.

## YOUR ROLE

You are helping users create strategic 9-post Instagram feeds. Your ONLY job is to:
- Understand their brand and goals
- Create a cohesive feed strategy
- Generate captions and hashtags
- Present the strategy for approval

## CRITICAL: WHAT YOU DO NOT DO

- ❌ DO NOT generate individual images
- ❌ DO NOT create concept cards
- ❌ DO NOT use [GENERATE_CONCEPTS] trigger
- ❌ DO NOT mention Studio Pro Mode or Classic Mode (except in credit calculation)
- ❌ DO NOT reference image generation features

## WHAT YOU DO

✅ Ask questions about their brand and feed goals
✅ Create strategic 9-post plans
✅ Present strategies conversationally
✅ Use [CREATE_FEED_STRATEGY] trigger when ready
✅ Help adjust strategies based on feedback

## Feed Planner Workflow

[Include existing Feed Planner workflow from personality.ts]

Be warm. Be strategic. Be Maya in Feed Planner Mode.`
```

---

## ✅ Success Criteria

After implementation, Maya should:

1. ✅ **Never mention image generation** in Feed Planner
2. ✅ **Focus on strategy** - ask about brand, goals, content pillars
3. ✅ **Use correct trigger** - `[CREATE_FEED_STRATEGY]` not `[GENERATE_CONCEPTS]`
4. ✅ **Know her role** - "I'm helping you create a feed strategy"
5. ✅ **Chat history isolation** - Feed Planner chats separate from Maya chats

---

## 🧪 Testing Checklist

- [ ] Feed Planner opens with Feed Planner system prompt
- [ ] Maya introduces herself in Feed Planner context
- [ ] Maya asks Feed Planner questions (not image generation questions)
- [ ] Maya doesn't mention concepts, Studio Pro, or image generation
- [ ] Maya uses `[CREATE_FEED_STRATEGY]` trigger correctly
- [ ] Regular Maya chat still works with regular system prompt
- [ ] Chat histories are separate (Feed Planner vs Maya)
- [ ] No cross-contamination between modes

---

## 🚀 Implementation Priority

**CRITICAL** - This should be implemented before further Feed Planner features because:
- Users are already experiencing confusion
- Maya might generate incorrect triggers
- Chat history mixing causes UX issues
- System prompt is too generic for specialized use case

**Estimated Time:** 2-3 hours
**Complexity:** Medium
**Risk:** Low (clean separation, easy to test)

---

## 📚 Related Files

- `components/feed-planner/feed-planner-screen.tsx` - Feed Planner UI
- `components/sselfie/maya/hooks/use-maya-chat.ts` - Chat hook
- `app/api/maya/chat/route.ts` - Chat API endpoint
- `lib/maya/personality.ts` - Current Maya system prompt
- `lib/data/maya.ts` - Chat data layer (check chatType support)

---

## 💡 Alternative: Hybrid Approach (If Option A is too complex)

If creating a new chat type is too complex, we could:

1. Keep chat type as `'maya'`
2. Add `x-feed-planner-mode: true` header
3. Check header in API route
4. Prepend Feed Planner context to system prompt

This is less clean but faster to implement.


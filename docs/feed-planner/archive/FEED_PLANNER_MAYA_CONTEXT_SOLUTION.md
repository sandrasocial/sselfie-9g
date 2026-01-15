# Feed Planner Maya Context - Implementation Solution

**Date:** 2025-01-30  
**Priority:** 🔴 **CRITICAL** - Affects user experience and Maya's behavior

---

## 🎯 **RECOMMENDED SOLUTION: Dedicated Feed Planner Chat Type**

Create a separate `"feed-planner"` chat type with dedicated system prompt to ensure Maya knows she's in Feed Planner mode and focuses on strategy creation, not image generation.

---

## 📋 **Implementation Steps**

### **Step 1: Create Feed Planner System Prompt** (30 min)

Create `lib/maya/feed-planner-personality.ts`:

```typescript
export const FEED_PLANNER_SYSTEM_PROMPT = `You are Maya in FEED PLANNER MODE.

## 🔴 CRITICAL CONTEXT

You are helping users create strategic 9-post Instagram feeds. You are NOT helping with individual image generation.

## YOUR ROLE

You are a Feed Strategy Consultant. Your ONLY job is to:
- Understand the user's brand, goals, and target audience
- Create cohesive 9-post feed strategies
- Generate strategic captions and hashtags
- Present strategies conversationally for user approval

## ❌ WHAT YOU DO NOT DO

- DO NOT generate individual images
- DO NOT create concept cards
- DO NOT use [GENERATE_CONCEPTS] trigger
- DO NOT mention Studio Pro Mode or Classic Mode (except when calculating credits)
- DO NOT reference image generation features
- DO NOT talk about prompt generation
- DO NOT suggest individual photo concepts

## ✅ WHAT YOU DO

- Ask questions about their brand and feed goals
- Create strategic 9-post plans (3x3 grid)
- Present strategies conversationally
- Use [CREATE_FEED_STRATEGY] trigger when ready
- Help adjust strategies based on feedback
- Calculate credit costs (Classic Mode = 1 credit, Pro Mode = 2 credits per post)

## Feed Planner Workflow

**Phase 1: Understand Context**
Ask natural, conversational questions:
- "Tell me about your business - what do you do and who do you help?"
- "What vibe should your Instagram feed have?" (warm/cool, minimal/vibrant, elegant/casual)
- "What topics do you post about?" (content pillars)
- "Any specific content you want to include?" (morning routines, product shots, behind-the-scenes, etc.)
- "Who is your target audience?"

**Phase 2: Present Strategy Preview**
Once you understand their goals, create a strategic 9-post plan and present it conversationally:

"Based on what you've shared, here's your feed strategy:

**Post Pattern:** [describe the 3x3 grid pattern]
- Posts 1, 4, 7: [type] - [purpose]
- Posts 2, 5, 8: [type] - [purpose]
- Posts 3, 6, 9: [type] - [purpose]

**Visual Flow:** [describe color/tone flow]
**Content Strategy:** [describe how posts connect]

**Credit Cost Breakdown:**
- [X] Classic Mode posts (1 credit each) = [X] credits
- [X] Pro Mode posts (2 credits each) = [X] credits
- Total: [X] credits

Does this match your vision? Any changes you'd like to make?"

**Phase 3: Trigger Generation**
After user approves (says "yes", "looks good", "let's do it", "create it", etc.), output:

[CREATE_FEED_STRATEGY: {complete strategy JSON}]

**Strategy JSON Format (CRITICAL - must be valid JSON):**
{
  "userRequest": "summary of user's feed goal",
  "gridPattern": "description of 3x3 grid pattern",
  "visualRhythm": "description of visual flow",
  "posts": [
    {
      "position": 1,
      "type": "portrait" | "object" | "flatlay" | "carousel" | "quote" | "infographic",
      "description": "what this post shows visually",
      "purpose": "why this post is in this position",
      "tone": "warm" | "cool",
      "generationMode": "classic" | "pro"
    },
    // ... 9 posts total (positions 1-9)
  ],
  "totalCredits": 14
}

**IMPORTANT Rules:**
- **Pro Mode Detection:** Automatically detect which posts need Pro Mode:
  - Carousels, quotes, infographics = Pro Mode (2 credits)
  - Portraits, objects, flatlays = Classic Mode (1 credit)
  - Set generationMode field accordingly
- **Post Types:** Use appropriate types
- **Credit Calculation:** Count Classic Mode × 1 + Pro Mode × 2 = totalCredits
- **Conversational Flow:** Be natural - don't show JSON until triggering
- **User Approval:** Wait for confirmation before triggering

**Example Conversation:**
User: "I want to create a feed for my wellness coaching business"
You: "Love it! 😍 Tell me about your business - what do you do and who do you help?"
[User responds]
You: "Perfect! What vibe should your feed have? Warm and inviting? Or clean and minimal?"
[User responds]
You: "Got it! Based on what you've shared, here's your feed strategy: [present conversationally]"
[User approves]
You: "Amazing! Let's create your feed! 🎨"
[CREATE_FEED_STRATEGY: {...}]

Be warm. Be strategic. Be Maya in Feed Planner Mode.`
```

---

### **Step 2: Update Feed Planner Screen** (15 min)

Update `components/feed-planner/feed-planner-screen.tsx`:

```typescript
// Line 36: Change this
const getModeString = useCallback(() => 'feed-planner', []) // Changed from 'maya'
```

---

### **Step 3: Update useMayaChat Hook Type** (10 min)

Update `components/sselfie/maya/hooks/use-maya-chat.ts`:

```typescript
// Line 26: Update return type
getModeString: () => "pro" | "maya" | "feed-planner" // Add "feed-planner"
```

---

### **Step 4: Update Maya Chat API** (45 min)

Update `app/api/maya/chat/route.ts`:

1. **Import Feed Planner prompt:**
```typescript
import { FEED_PLANNER_SYSTEM_PROMPT } from "@/lib/maya/feed-planner-personality"
```

2. **Update system prompt selection (around line 622):**
```typescript
let systemPrompt: string
if (chatType === "prompt_builder") {
  systemPrompt = PROMPT_BUILDER_SYSTEM
  console.log("[Maya Chat] Using Prompt Builder system prompt")
} else if (chatType === "feed-planner") {
  systemPrompt = FEED_PLANNER_SYSTEM_PROMPT
  console.log("[Maya Chat] Using Feed Planner system prompt")
} else {
  // Use Maya Pro personality if in Studio Pro mode, otherwise use standard Maya
  systemPrompt = isStudioProMode ? MAYA_PRO_SYSTEM_PROMPT : MAYA_SYSTEM_PROMPT
}
```

3. **Verify chatType is received:** Ensure `chatType` is extracted from request body (line 107)

---

### **Step 5: Custom Transport to Send chatType** (30 min)

**CRITICAL:** `DefaultChatTransport` from AI SDK might not automatically include `chatType` in the request body. We need to customize the transport.

Update `components/sselfie/maya/hooks/use-maya-chat.ts`:

```typescript
// Around line 114-120, update useChat configuration:
const { messages, sendMessage, status, setMessages } = useChat({
  api: "/api/maya/chat",
  body: {
    chatId,
    chatType: getModeString(), // Add chatType to request body
  },
  headers: {
    "x-studio-pro-mode": studioProMode ? "true" : "false",
  },
  onError: (error) => {
    // ... existing error handling
  },
  // ... rest of config
})
```

**Note:** If `useChat` doesn't support `body` parameter directly, we might need to use a custom transport. Check AI SDK documentation or use `bodyProvider` if available.

---

### **Step 6: Verify Database Support** (15 min)

Check if `maya_chats` table supports `'feed-planner'` as a chat type:

```sql
-- Check current chat_type column
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'maya_chats' AND column_name = 'chat_type';

-- If it's ENUM or CHECK constraint, verify 'feed-planner' is allowed
-- If not, we might need to alter the constraint
```

**If needed, update database:**
```sql
-- If chat_type has a CHECK constraint, update it:
ALTER TABLE maya_chats 
DROP CONSTRAINT IF EXISTS maya_chats_chat_type_check;

ALTER TABLE maya_chats
ADD CONSTRAINT maya_chats_chat_type_check 
CHECK (chat_type IN ('maya', 'pro', 'feed-planner', 'prompt_builder'));
```

---

## 🧪 **Testing Plan**

### **Test 1: Feed Planner Mode Activation**
1. Open Feed Planner
2. Check browser console for: `"[Maya Chat] Using Feed Planner system prompt"`
3. Send a message to Maya
4. Verify Maya introduces herself as "Feed Planner Mode" Maya
5. Verify Maya doesn't mention image generation

### **Test 2: Chat Type Isolation**
1. Create a chat in Feed Planner
2. Verify it's stored with `chat_type = 'feed-planner'`
3. Open regular Maya chat
4. Verify Feed Planner chats don't appear in regular Maya chat history
5. Verify regular Maya chats don't appear in Feed Planner

### **Test 3: System Prompt Correctness**
1. Start Feed Planner conversation
2. Maya should ask Feed Planner questions (brand, goals, vibe)
3. Maya should NOT ask about image generation
4. Maya should NOT mention concepts, Studio Pro, etc.
5. Maya should use `[CREATE_FEED_STRATEGY]` trigger (not `[GENERATE_CONCEPTS]`)

### **Test 4: Regular Maya Still Works**
1. Open regular Maya chat
2. Verify it uses regular Maya system prompt
3. Verify image generation features work
4. Verify concept generation works

---

## 🔍 **Alternative: Header-Based Approach (If Chat Type Doesn't Work)**

If passing `chatType` in body doesn't work with `DefaultChatTransport`, use headers:

```typescript
// In useMayaChat hook:
headers: {
  "x-studio-pro-mode": studioProMode ? "true" : "false",
  "x-feed-planner-mode": getModeString() === "feed-planner" ? "true" : "false",
}

// In API route:
const isFeedPlanner = req.headers.get("x-feed-planner-mode") === "true" || chatType === "feed-planner"
```

This is less clean but ensures it works.

---

## ✅ **Success Criteria**

After implementation:

1. ✅ Maya introduces herself correctly in Feed Planner context
2. ✅ Maya focuses on strategy creation (not image generation)
3. ✅ Maya uses correct trigger (`[CREATE_FEED_STRATEGY]`)
4. ✅ Chat histories are isolated (Feed Planner vs Maya)
5. ✅ Regular Maya chat still works normally
6. ✅ No confusion about capabilities

---

## 📊 **Impact**

**Before:**
- Maya thinks she's in regular chat mode
- Might mention image generation features
- Confusing for users
- Chat history mixed

**After:**
- Maya knows she's in Feed Planner mode
- Focuses on strategy creation
- Clear user experience
- Separate chat histories

---

## 🚀 **Next Steps**

1. Review this solution
2. Approve approach (dedicated chat type vs header-based)
3. Implement Step 1 (create Feed Planner system prompt)
4. Test incrementally after each step
5. Deploy when all tests pass

---

**Ready to implement? Let me know and I'll start with Step 1!** 🎯


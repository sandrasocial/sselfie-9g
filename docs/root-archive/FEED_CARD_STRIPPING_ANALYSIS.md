# Feed Card Stripping Analysis

## Problem
Feed cards appear initially but then disappear on page refresh or when switching tabs.

## Root Cause Identified

### Issue: Component Remounting
When switching tabs in `sselfie-app.tsx`:
- `MayaChatScreen` is conditionally rendered: `{activeTab === "maya" && <MayaChatScreen />}`
- When you switch to "feed-planner" tab, `MayaChatScreen` **unmounts**
- When you switch back to "maya" tab, `MayaChatScreen` **remounts**
- On remount, `useMayaChat` hook calls `loadChat()`
- `loadChat()` loads messages from database via `/api/maya/load-chat`
- **If feed card markers aren't in database `content`, feed cards can't be restored**

### The "My Feeds" Feature
Found in `components/feed-planner/feed-header.tsx` line 206:
- "My Feeds:" dropdown selector (only in Feed Planner screen)
- This is **NOT** the issue - it's just a UI element for selecting feeds
- It doesn't interact with Maya chat messages

### The Real Problem: Message Saving Without Feed Markers

**When messages are saved, feed card markers might be stripped:**

1. **AI SDK saves messages automatically:**
   - The `useChat` hook from AI SDK automatically saves messages
   - When streaming finishes, it might save the message `content` **without** feed card markers
   - This overwrites the `content` that had `[FEED_CARD:feedId]` or `[CREATE_FEED_STRATEGY:...]` markers

2. **User message saving:**
   - In `maya-chat-screen.tsx` line 1132-1140, user messages are saved
   - This extracts only `textContent` from message parts
   - Feed card markers are in `content`, not in parts, so they might be lost

3. **Assistant message saving:**
   - When assistant messages finish streaming, the AI SDK might save them
   - The saved `content` might not include feed card markers if they were added after streaming

## Evidence

### Component Remounting
```typescript
// sselfie-app.tsx line 530-544
<motion.div key={activeTab}>  // ⚠️ key={activeTab} causes remount on tab switch
  {activeTab === "maya" && (
    <MayaChatScreen />  // ⚠️ Unmounts when activeTab !== "maya"
  )}
  {activeTab === "feed-planner" && <FeedPlannerScreen />}
</motion.div>
```

### Message Saving Without Markers
```typescript
// maya-chat-screen.tsx line 1132-1140
fetch("/api/maya/save-message", {
  body: JSON.stringify({
    chatId,
    role: "user",
    content: textContent,  // ⚠️ Only text content, no feed markers
  }),
})
```

## Solution

Feed cards need to be saved to a **dedicated database column** (like `concept_cards`), not as markers in `content`:

1. **Add `feed_cards` JSONB column** to `maya_chat_messages` table (or use `styling_details`)
2. **Save feed cards to column** when feed is created/saved
3. **Load feed cards from column** in `load-chat` route (like concept cards)
4. **Remove dependency on markers** in `content` column

This ensures feed cards persist even when:
- Component remounts
- Messages are reloaded
- AI SDK overwrites `content`
- User switches tabs


# Feed List Display Analysis

## Root Cause Identified

**Issue:** All feed cards/previews are showing above chat messages even in a new/empty chat.

**Location:** `components/sselfie/maya/maya-feed-tab.tsx` line 612

### Current Behavior

The "Your Feeds" section is displayed whenever:
```typescript
{(feeds.length > 0 || feedsLoading) && (
```

This means:
- The "Your Feeds" list shows ALL saved feeds from `/api/maya/feed/list`
- It displays regardless of chat state (new chat, old chat, empty chat)
- It's a SEPARATE, persistent list - not related to chat messages
- It's positioned ABOVE the chat interface (line 612-699)

### Problem

When a user creates a new chat:
1. The "Your Feeds" list still shows ALL their saved feeds (from database)
2. This appears above the empty chat welcome screen
3. User sees feeds from previous sessions even though they started a new conversation
4. This creates confusion - feeds appear to be "in" the new chat when they're actually from the persistent list

### Code Structure

```
MayaFeedTab Component:
├── "Your Feeds" Section (lines 612-699)
│   ├── Fetches from `/api/maya/feed/list` (all saved feeds)
│   ├── Displays when: `feeds.length > 0 || feedsLoading`
│   └── Shows ALL saved feeds regardless of chat state
│
└── MayaChatInterface (line 701)
    ├── Displays chat messages
    ├── Can contain feed cards embedded in messages
    └── Shows empty state when `isEmpty && !isTyping`
```

### Two Sources of Feed Cards

1. **"Your Feeds" List** (persistent, database)
   - Source: `/api/maya/feed/list`
   - Shows: ALL saved feeds for the user
   - Position: Above chat interface
   - Condition: `feeds.length > 0 || feedsLoading`

2. **Chat Messages** (ephemeral, conversation context)
   - Source: Messages array from `useChat` hook
   - Shows: Feed cards embedded in chat messages
   - Position: Inside chat interface
   - Condition: Based on message content

### Screenshots Analysis

Based on user's screenshots:
- Image 1: Feed grid with 0/9 posts (empty feed strategy)
- Image 2: Feed grid with 9/9 posts (complete feed)
- Image 3: Welcome screen ("Hi, I'm Maya...")

All three are from a NEW chat, but showing feeds from the "Your Feeds" list.

### Intended UX (Hypothesis)

The "Your Feeds" list should probably:
- **Option A:** Always be visible (current behavior) - but user doesn't want this
- **Option B:** Only show when chat is NOT empty (`!isEmpty`)
- **Option C:** Only show when user has messages in the current chat
- **Option D:** Be hidden by default, shown via toggle/button

### Next Steps

Need to determine the intended UX:
1. Should "Your Feeds" list be hidden in new/empty chats?
2. Should it only show when `!isEmpty`?
3. Or should it have a different visibility condition?

Based on user feedback ("all feeds showing above all messages in new chat"), the intended behavior is likely:
- Hide "Your Feeds" list when `isEmpty === true`
- Show it when the user has messages or has engaged with the feed tab


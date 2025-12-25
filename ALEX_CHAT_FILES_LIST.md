# Alex Chat - Complete File List

## 🎯 PRIMARY FILES (Core Chat Functionality)

### Frontend (React Components)
1. **`app/admin/alex/page.tsx`**
   - Main page component that renders Alex chat
   - Handles authentication and user validation
   - Renders `AdminAgentChatNew` component

2. **`components/admin/admin-agent-chat-new.tsx`**
   - **PRIMARY CHAT UI COMPONENT** (currently used by Alex page)
   - Handles all chat UI, message display, tool interactions
   - Uses `useChat` hook with `DefaultChatTransport`
   - Manages email previews, gallery selection, campaign status
   - **~1886 lines** - Main frontend chat interface

3. **`components/admin/alex-chat.tsx`**
   - Alternative/legacy chat component (may not be actively used)
   - Similar functionality to `admin-agent-chat-new.tsx`
   - Uses `/api/admin/agent/chat` endpoint

### Backend (API Routes)
4. **`app/api/admin/agent/chat/route.ts`**
   - **PRIMARY CHAT API ROUTE** (currently used by Alex)
   - Handles POST requests for chat messages
   - Streams responses using Anthropic SDK
   - Executes 5 email marketing tools
   - **~1803 lines** - Main backend chat handler

5. **`app/api/admin/alex/chat/route.ts`**
   - Alternative/backup chat route (may be used as reference)
   - Similar implementation to agent route
   - Uses Alex-specific system prompt
   - **~2059 lines** - Backup/reference implementation

6. **`app/api/admin/agent/load-chat/route.ts`**
   - Loads existing chat messages from database
   - GET endpoint for fetching chat history

7. **`app/api/admin/agent/chats/route.ts`**
   - Lists all chats for a user
   - GET endpoint for chat list

8. **`app/api/admin/agent/new-chat/route.ts`**
   - Creates a new chat session
   - POST endpoint for new chat creation

---

## 🔧 SUPPORTING FILES (Utilities & Helpers)

### Database & Data Layer
9. **`lib/data/admin-agent.ts`**
   - Database functions for admin agent chats
   - `saveChatMessage()` - Save messages to database
   - `createNewChat()` - Create new chat sessions
   - `getOrCreateActiveChat()` - Get or create active chat
   - `getChatMessages()` - Load chat messages
   - `loadChatById()` - Load specific chat by ID

### Admin Utilities
10. **`lib/admin/anthropic-tool-converter.ts`**
    - Converts AI SDK tool format to Anthropic format
    - `convertToolsToAnthropicFormat()` - Tool conversion
    - `convertMessagesToAnthropicFormat()` - Message conversion

11. **`lib/admin/alex-system-prompt.ts`**
    - Alex-specific system prompt generation
    - `getAlexSystemPrompt()` - Returns Alex's system instructions
    - Used by Alex route (not agent route)

12. **`lib/admin/get-complete-context.ts`**
    - Generates complete admin context for agent
    - `getCompleteAdminContext()` - Builds context with knowledge base
    - Used by agent route

13. **`lib/admin/get-sandra-voice.ts`**
    - Sandra's voice/style for responses
    - `getSandraVoice()` - Returns voice instructions
    - Used by Alex route

14. **`lib/admin/alex-backup-manager.ts`**
    - Backup/restore functionality for Alex
    - Used by Alex route for file operations

### Frontend Supporting Components
15. **`components/admin/email-preview-card.tsx`**
    - Displays email preview in chat
    - Shows HTML preview, subject line, preview text
    - Used by `admin-agent-chat-new.tsx`

16. **`components/admin/email-quick-actions.tsx`**
    - Quick action buttons for emails
    - Used by `admin-agent-chat-new.tsx`

17. **`components/admin/segment-selector.tsx`**
    - Segment selection UI
    - Used by `admin-agent-chat-new.tsx`

18. **`components/admin/campaign-status-cards.tsx`**
    - Displays campaign status information
    - Used by `admin-agent-chat-new.tsx`

---

## 📦 DEPENDENCIES & IMPORTS

### External Libraries Used
- `@ai-sdk/react` - `useChat` hook
- `ai` - `DefaultChatTransport`, `streamText`, `tool`, etc.
- `@anthropic-ai/sdk` - Direct Anthropic SDK
- `zod` - Schema validation for tools
- `@neondatabase/serverless` - Database client
- `resend` - Email API client
- `react-markdown` - Markdown rendering
- `next/image` - Image optimization
- `lucide-react` - Icons

### Internal Dependencies
- `@/lib/supabase/server` - Supabase authentication
- `@/lib/user-mapping` - User mapping utilities
- `@/hooks/use-toast` - Toast notifications

---

## 🔄 CURRENT STATE

### Active Route
- **Frontend:** Uses `/api/admin/agent/chat` (via `admin-agent-chat-new.tsx`)
- **Backend:** `app/api/admin/agent/chat/route.ts` is the active route

### Backup/Reference Route
- **Backend:** `app/api/admin/alex/chat/route.ts` exists as backup/reference
- Uses Alex-specific system prompt and voice

---

## 📝 NOTES

1. **Two Chat Routes:**
   - `/api/admin/agent/chat` - Currently active, uses `getCompleteAdminContext()`
   - `/api/admin/alex/chat` - Backup/reference, uses `getAlexSystemPrompt()`

2. **Two Frontend Components:**
   - `admin-agent-chat-new.tsx` - Currently used (more features)
   - `alex-chat.tsx` - Alternative/legacy component

3. **Shared Database Layer:**
   - Both routes use `lib/data/admin-agent.ts` for database operations

4. **Tool Conversion:**
   - Both routes use `lib/admin/anthropic-tool-converter.ts` to convert AI SDK tools to Anthropic format

---

## 🐛 DEBUGGING FILES

If you're debugging streaming issues, focus on:
1. `app/api/admin/agent/chat/route.ts` - Main streaming logic
2. `components/admin/admin-agent-chat-new.tsx` - Frontend stream handling
3. `lib/admin/anthropic-tool-converter.ts` - Tool format conversion

---

## 📊 FILE SIZES (Approximate)

- `app/api/admin/agent/chat/route.ts` - ~1803 lines
- `app/api/admin/alex/chat/route.ts` - ~2059 lines
- `components/admin/admin-agent-chat-new.tsx` - ~1886 lines
- `components/admin/alex-chat.tsx` - ~731 lines
- `lib/data/admin-agent.ts` - ~200+ lines
- `lib/admin/anthropic-tool-converter.ts` - ~100+ lines


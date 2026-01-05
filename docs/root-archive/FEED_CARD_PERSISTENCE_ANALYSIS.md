# Feed Card Persistence Analysis

## How Concept Cards Work (CORRECT IMPLEMENTATION)

### 1. Saving Concept Cards
- **Database Column:** `concept_cards` JSONB column in `maya_chat_messages` table
- **Save Method:** 
  - When concepts are generated, frontend calls `/api/maya/save-message` with `conceptCards` array
  - `saveChatMessage()` saves `conceptCards` to `concept_cards` column: `INSERT INTO maya_chat_messages (chat_id, role, content, concept_cards) VALUES (..., JSON.stringify(conceptCards))`
  - This creates a NEW message row with concept cards
- **Location:** `components/sselfie/maya-chat-screen.tsx` line 736-747

### 2. Loading Concept Cards
- **Load Method:**
  - `getChatMessages()` reads from database: `SELECT * FROM maya_chat_messages WHERE chat_id = ${chatId}`
  - Returns messages with `concept_cards` column populated
- **Restoration:**
  - `load-chat/route.ts` checks: `if (msg.concept_cards && Array.isArray(msg.concept_cards) && msg.concept_cards.length > 0)`
  - Creates `tool-generateConcepts` part: `parts.push({ type: "tool-generateConcepts", output: { concepts: msg.concept_cards } })`
- **Location:** `app/api/maya/load-chat/route.ts` line 67-95

### 3. Key Points
- ✅ Concept cards are stored in a **dedicated database column** (`concept_cards`)
- ✅ They persist independently of message `content`
- ✅ They're restored directly from the database column
- ✅ No markers or parsing needed

---

## How Feed Cards Currently Work (BROKEN IMPLEMENTATION)

### 1. Saving Feed Cards
- **Database Column:** ❌ NO dedicated column - relies on markers in `content`
- **Save Method:**
  - **Unsaved feeds:** Strategy JSON saved to `content` as `[CREATE_FEED_STRATEGY:{...}]` marker
  - **Saved feeds:** Feed ID saved to `content` as `[FEED_CARD:feedId]` marker
  - Uses `/api/maya/update-message` to update existing message `content`
- **Location:** 
  - `components/sselfie/maya/maya-feed-tab.tsx` line 238-287 (unsaved)
  - `components/sselfie/maya-chat-screen.tsx` line 1042-1105 (saved)

### 2. Loading Feed Cards
- **Load Method:**
  - `getChatMessages()` reads from database: `SELECT * FROM maya_chat_messages WHERE chat_id = ${chatId}`
  - Returns messages with `content` column (which should contain markers)
- **Restoration:**
  - `load-chat/route.ts` parses `content` for markers:
    - `[CREATE_FEED_STRATEGY:{...}]` → Creates unsaved feed card part
    - `[FEED_CARD:feedId]` → Fetches feed from `feed_layouts` table and creates feed card part
- **Location:** `app/api/maya/load-chat/route.ts` line 97-135 (unsaved), 138-233 (saved in concept card messages), 259-295 (unsaved in regular messages), 297-410 (saved in regular messages)

### 3. Key Problems
- ❌ Feed cards rely on **markers in `content` column** (fragile)
- ❌ If `content` is overwritten by AI SDK or other processes, markers are lost
- ❌ No dedicated database column like `concept_cards`
- ❌ Parsing JSON from `content` is error-prone
- ❌ Markers might not be saved correctly or might be overwritten

---

## Root Cause Analysis

### Problem 1: Message Content Can Be Overwritten
- The AI SDK's `useChat` hook manages messages and may update `content`
- When streaming finishes, the SDK might overwrite message `content`
- If feed card markers are in `content`, they get lost

### Problem 2: No Dedicated Storage
- Concept cards have `concept_cards` JSONB column
- Feed cards have NO equivalent column
- Feed cards must be reconstructed from markers in `content`

### Problem 3: Update vs Insert
- `save-message` API does `INSERT` (creates new message)
- `update-message` API does `UPDATE` (updates existing message)
- Feed cards use `update-message` which might conflict with AI SDK's message management

---

## Recommended Solution

### Option 1: Add `feed_cards` Column (Like `concept_cards`)
- Add `feed_cards` JSONB column to `maya_chat_messages` table
- Save feed card data to this column (similar to concept cards)
- Load feed cards from this column (similar to concept cards)
- **Pros:** Consistent with concept cards, reliable persistence
- **Cons:** Requires database migration

### Option 2: Ensure Markers Are Always Saved
- Verify `[FEED_CARD:feedId]` marker is saved to `content` when feed is saved
- Verify `[CREATE_FEED_STRATEGY:{...}]` marker is saved to `content` when feed is created
- Ensure markers are NOT overwritten by AI SDK
- **Pros:** No database changes needed
- **Cons:** Still fragile, markers can be lost

### Option 3: Store Feed Card Data in Message Metadata
- Use existing `metadata` or `styling_details` JSONB column if available
- Store feed card data there instead of in `content`
- **Pros:** No new column needed
- **Cons:** Need to check if column exists and is appropriate

---

## Database Schema Analysis

### `maya_chat_messages` Table Columns:
- `id` SERIAL PRIMARY KEY
- `chat_id` INTEGER
- `role` TEXT ('user', 'assistant')
- `content` TEXT (message text content)
- `concept_cards` JSONB ✅ (used for concept cards)
- `styling_details` JSONB ✅ (available but not used for feed cards)
- `created_at` TIMESTAMPTZ

### Key Finding:
- ✅ `styling_details` JSONB column exists and is available
- ❌ Feed cards are NOT using this column
- ❌ Feed cards rely on markers in `content` column (fragile)

## Root Cause Identified

**The Problem:**
1. Feed cards store data in `content` as markers (`[FEED_CARD:feedId]` or `[CREATE_FEED_STRATEGY:...]`)
2. The AI SDK's `useChat` hook manages messages and may overwrite `content` during streaming
3. When `content` is overwritten, feed card markers are lost
4. On page refresh, markers are missing, so feed cards can't be restored

**Why Concept Cards Work:**
1. Concept cards are saved to `concept_cards` JSONB column (dedicated storage)
2. They persist independently of `content`
3. AI SDK doesn't touch the `concept_cards` column
4. On page refresh, concept cards are loaded directly from the column

## Recommended Solution

**Use `styling_details` JSONB column for feed cards (like `concept_cards` for concept cards):**

1. **Save feed cards to `styling_details` column:**
   - Store feed card data as JSON in `styling_details` column
   - Similar to how `concept_cards` stores concept data
   - Persists independently of `content`

2. **Load feed cards from `styling_details` column:**
   - Read from `styling_details` column in `load-chat` route
   - Create `tool-generateFeed` part from stored data
   - Similar to how concept cards are restored

3. **Migration:**
   - Update `saveChatMessage()` to accept `feedCards` parameter
   - Update `MayaChatMessage` interface to include `feed_cards` or use `styling_details`
   - Update `load-chat` route to read from column instead of parsing `content`

## Next Steps

1. ✅ Confirmed: `styling_details` JSONB column exists and is available
2. ⚠️ Need to verify: Is `styling_details` used for anything else?
3. ⚠️ Need to implement: Save feed cards to `styling_details` column (like concept cards to `concept_cards`)
4. ⚠️ Need to implement: Load feed cards from `styling_details` column (like concept cards from `concept_cards`)


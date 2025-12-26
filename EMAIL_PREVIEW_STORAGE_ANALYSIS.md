# Email Preview Storage Analysis

## Overview
This document explains where Alex stores email previews, how they're saved, and potential database schema issues.

## Storage Flow

### 1. **Email Generation (Alex creates email)**
- Location: `app/api/admin/agent/chat/route.ts` (lines 4348-4356)
- When Alex calls `compose_email` tool, the result contains:
  ```typescript
  {
    html: string,
    subjectLine: string,
    preview: string,
    readyToSend: boolean
  }
  ```

### 2. **Saving to Database**
- Location: `app/api/admin/agent/chat/route.ts` (line 4484)
- Function: `saveChatMessage(activeChatId, "assistant", accumulatedText, emailPreviewData)`
- The `emailPreviewData` is saved to: `admin_agent_messages.email_preview_data` (JSONB column)

### 3. **Database Schema**
- **Table**: `admin_agent_messages`
- **Column**: `email_preview_data` (JSONB, nullable)
- **Structure**:
  ```json
  {
    "html": "<!DOCTYPE html>...",
    "subjectLine": "Email Subject",
    "preview": "Preview text...",
    "readyToSend": true
  }
  ```

### 4. **Loading Email Previews**
- Location: `app/api/admin/agent/load-chat/route.ts` (lines 51-95)
- The load-chat route extracts `email_preview_data` from the database
- Formats it as a `tool-result` part for the frontend

### 5. **Frontend Display**
- Location: `components/admin/admin-agent-chat-new.tsx` (lines 503-577)
- The frontend extracts email preview from `toolInvocations` or `parts` arrays
- Displays in `EmailPreviewCard` component

## Database Schema Details

### Table: `admin_agent_messages`
```sql
CREATE TABLE IF NOT EXISTS admin_agent_messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER NOT NULL REFERENCES admin_agent_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  email_preview_data JSONB,  -- ⚠️ This column might not exist!
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Migration Script
- **File**: `scripts/38-add-email-preview-data-column.sql`
- **Purpose**: Adds `email_preview_data` column if it doesn't exist
- **Status**: ⚠️ **MUST BE RUN** for email previews to persist

## Potential Issues

### 1. **Missing Column (Most Likely Issue)**
- **Symptom**: Email previews disappear on page reload
- **Cause**: `email_preview_data` column doesn't exist in database
- **Fix**: Run migration script: `scripts/38-run-email-preview-data-migration.ts`

### 2. **Fallback Logic**
- The code has fallback logic in `lib/data/admin-agent.ts`:
  - If column doesn't exist, it falls back to saving without `email_preview_data`
  - Email previews are then lost on reload
  - The frontend tries to extract HTML from `content` field as fallback

### 3. **Schema Conflicts**
- The migration script creates the table if it doesn't exist
- If the table was created elsewhere (e.g., in `00-create-all-tables.sql`), the column might be missing
- **Solution**: Run the migration script to ensure the column exists

## Verification Steps

1. **Check if column exists**:
   ```sql
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'admin_agent_messages'
   AND column_name = 'email_preview_data';
   ```

2. **Check if emails are being saved**:
   ```sql
   SELECT id, chat_id, role, 
          email_preview_data IS NOT NULL as has_preview,
          created_at
   FROM admin_agent_messages
   WHERE role = 'assistant'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

3. **Check email preview data structure**:
   ```sql
   SELECT id, 
          email_preview_data->>'html' as html_preview,
          email_preview_data->>'subjectLine' as subject,
          email_preview_data->>'preview' as preview_text
   FROM admin_agent_messages
   WHERE email_preview_data IS NOT NULL
   ORDER BY created_at DESC
   LIMIT 5;
   ```

## How to Fix

### Option 1: Run Migration Script (Recommended)
```bash
npx tsx scripts/38-run-email-preview-data-migration.ts
```

### Option 2: Manual SQL
```sql
-- Check if column exists
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.columns 
  WHERE table_name = 'admin_agent_messages' 
  AND column_name = 'email_preview_data'
) as exists;

-- If doesn't exist, add it:
ALTER TABLE admin_agent_messages 
ADD COLUMN IF NOT EXISTS email_preview_data JSONB;

-- Add comment
COMMENT ON COLUMN admin_agent_messages.email_preview_data IS 
'Structured email preview data from compose_email tool: {html, subjectLine, preview, readyToSend}';
```

## Code Locations

### Saving Email Previews
- **File**: `app/api/admin/agent/chat/route.ts`
- **Line**: 4484
- **Function**: `saveChatMessage(chatId, role, content, emailPreviewData)`

### Loading Email Previews
- **File**: `app/api/admin/agent/load-chat/route.ts`
- **Lines**: 51-95
- **Function**: Extracts `email_preview_data` from database messages

### Database Functions
- **File**: `lib/data/admin-agent.ts`
- **Functions**: 
  - `saveChatMessage()` - Saves with fallback if column missing
  - `getChatMessages()` - Loads with fallback if column missing

## Summary

**Email previews are stored in:**
- **Table**: `admin_agent_messages`
- **Column**: `email_preview_data` (JSONB)
- **Format**: `{html, subjectLine, preview, readyToSend}`

**Critical Issue:**
- The `email_preview_data` column might not exist in your database
- This causes email previews to disappear on page reload
- **Solution**: Run the migration script to add the column


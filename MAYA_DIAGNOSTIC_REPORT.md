# Maya Diagnostic Report
**Date:** January 2026  
**Issue:** Maya broken after feed planner implementation - not responding or generating concept cards

## Summary
Maya chat and concept card generation are failing in production. This report documents all potential failure points and diagnostic checks.

## Critical Issues Found

### 1. Feed Planner Context Loading Logic
**Location:** `app/api/maya/chat/route.ts:686-732`

**Issue:** Feed planner context is only loaded when BOTH conditions are true:
- `chatType === "feed-planner"` 
- `isFeedTab === true`

**Potential Problem:** If `chatType` is incorrectly set to `"feed-planner"` for regular Maya chats, OR if `isFeedTab` header is incorrectly set, the massive feed planner context (880+ lines) could be loaded into regular chats, potentially breaking Maya's responses.

**Check:**
- Verify `chatType` is correctly set to `"maya"` or `"pro"` for regular chats
- Verify `x-active-tab` header is not being set to `"feed"` for Photos tab chats
- Check logs for feed planner context being loaded in regular chats

### 2. Anthropic API Key
**Location:** `app/api/maya/chat/route.ts:1074-1076`

**Check:** Verify `ANTHROPIC_API_KEY` environment variable is set and valid.

### 3. Concept Generation API Route
**Location:** `app/api/maya/generate-concepts/route.ts`

**Potential Issues:**
- Complex error handling with multiple fallback paths
- Authority layer may be failing silently
- Prompt constructor failures may not be properly surfaced

**Check:** Review error logs for:
- `[CONCEPT-CARDS] ❌ Authority Layer failed`
- `[PROMPT-CONSTRUCTOR] ❌ Error generating prompts`
- Any 500 errors from `/api/maya/generate-concepts`

### 4. Database Connectivity
**Check:** Verify database connection is working for:
- `maya_chats` table
- `maya_chat_messages` table
- `concept_cards` JSONB column

### 5. Frontend Trigger Detection
**Location:** `components/sselfie/maya-chat-screen.tsx:331-454`

**Potential Issue:** `[GENERATE_CONCEPTS]` trigger may not be detected if:
- Message status is still "streaming" or "submitted"
- Message format is incorrect
- Trigger is filtered out before processing

## Diagnostic Endpoints Created

### `/api/admin/maya-health`
New health check endpoint that verifies:
- Database connectivity
- Anthropic API key presence
- Recent chat errors
- Concept generation success rate
- Feed planner context loading
- Environment variables

**Usage:**
```bash
# Access from admin dashboard or directly
GET /api/admin/maya-health
```

## Recommended Diagnostic Steps

### Step 1: Check Health Endpoint
```bash
curl https://sselfie.ai/api/admin/maya-health \
  -H "Cookie: [admin session cookie]"
```

### Step 2: Check Recent Errors
Review production logs for:
- `[Maya Chat API]` errors
- `[CONCEPT-CARDS]` failures
- `[PROMPT-CONSTRUCTOR]` errors
- Anthropic API errors

### Step 3: Verify Chat Type Detection
Check if regular Maya chats are incorrectly being marked as `feed-planner`:
```sql
SELECT chat_type, COUNT(*) 
FROM maya_chats 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY chat_type;
```

### Step 4: Check Concept Generation Success Rate
```sql
SELECT 
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN concept_cards IS NOT NULL AND jsonb_array_length(concept_cards) > 0 THEN 1 END) as successful,
  COUNT(CASE WHEN concept_cards IS NULL OR jsonb_array_length(concept_cards) = 0 THEN 1 END) as failed
FROM maya_chat_messages
WHERE role = 'assistant'
  AND created_at > NOW() - INTERVAL '24 hours'
  AND (content LIKE '%[GENERATE_CONCEPTS]%' OR concept_cards IS NOT NULL);
```

### Step 5: Test Concept Generation Directly
```bash
curl -X POST https://sselfie.ai/api/maya/generate-concepts \
  -H "Content-Type: application/json" \
  -H "Cookie: [session cookie]" \
  -d '{
    "userRequest": "elegant street style",
    "count": 3
  }'
```

## Files Modified

1. **Created:** `app/api/admin/maya-health/route.ts`
   - Comprehensive health check endpoint for Maya system

## Next Steps

1. **Immediate:** Check the health endpoint to identify specific failures
2. **Review Logs:** Check production logs for the specific error patterns
3. **Test:** Manually test concept generation in production
4. **Fix:** Address the specific issues identified by the health check

## Potential Root Causes

1. **Feed Planner Context Leak:** Feed planner context being loaded into regular chats
2. **API Key Missing/Invalid:** Anthropic API key not configured correctly
3. **Database Issues:** Connection failures or query errors
4. **Frontend Bug:** Trigger detection not working correctly
5. **Authority Layer Failure:** New authority layer failing silently

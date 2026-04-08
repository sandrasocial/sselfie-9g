# Feed Creation Refactoring - Test Plan

## Overview
This document outlines the test cases for the refactored feed creation flow. The refactoring simplified the codebase, added Pro Mode support, and improved database consistency.

## Test Environment Setup
- **Classic Mode**: Test with Flux LoRA generation
- **Pro Mode**: Test with Nano Banana Pro generation
- **Database**: Ensure migration has been run (`migrations/add-feed-cards-column.sql`)

---

## Test Cases

### 1. Basic Feed Creation (Classic Mode)

#### Test 1.1: Create Feed via Chat
**Steps:**
1. Navigate to Feed Tab in Classic Mode
2. Send message: "Create an Instagram feed for my business"
3. Wait for Maya to respond with `[CREATE_FEED_STRATEGY: {...}]`
4. Verify feed card appears in chat
5. Verify feed card shows 9 posts
6. Verify feed card has title and description

**Expected Results:**
- ✅ Feed card appears immediately after trigger detected
- ✅ Loading indicator shows during processing
- ✅ Feed card displays correctly with all 9 posts
- ✅ Feed card saved to database (`feed_cards` column)
- ✅ Feed card persists on page refresh

**API Calls to Verify:**
- `POST /api/maya/generate-feed` called (not Pro Mode endpoint)
- `POST /api/maya/save-message` called with `feedCards` in body

---

#### Test 1.2: Feed Card Persistence
**Steps:**
1. Create a feed (as in Test 1.1)
2. Refresh the page
3. Navigate back to the same chat

**Expected Results:**
- ✅ Feed card loads from database
- ✅ Feed card displays correctly
- ✅ All 9 posts visible
- ✅ No duplicate feed cards

**Database Verification:**
```sql
SELECT id, feed_cards FROM maya_chat_messages 
WHERE feed_cards IS NOT NULL 
ORDER BY created_at DESC LIMIT 1;
```

---

### 2. Pro Mode Feed Creation

#### Test 2.1: Create Feed in Pro Mode
**Steps:**
1. Switch to Pro Mode
2. Navigate to Feed Tab
3. Send message: "Create an Instagram feed for my business"
4. Wait for Maya to respond with `[CREATE_FEED_STRATEGY: {...}]`
5. Verify feed card appears

**Expected Results:**
- ✅ Pro Mode endpoint called: `POST /api/maya/pro/generate-feed`
- ✅ `imageLibrary` passed in request body (if available)
- ✅ Feed card appears correctly
- ✅ Feed card saved to database

**API Calls to Verify:**
- `POST /api/maya/pro/generate-feed` called (not Classic Mode endpoint)
- Request body includes `imageLibrary` field

---

#### Test 2.2: Pro Mode with Image Library
**Steps:**
1. Switch to Pro Mode
2. Upload images to image library (selfies, products, etc.)
3. Navigate to Feed Tab
4. Create a feed
5. Verify feed creation uses image library

**Expected Results:**
- ✅ `imageLibrary` passed to Pro Mode endpoint
- ✅ Feed strategy potentially enhanced with image library data
- ✅ Feed card created successfully

---

### 3. Error Handling

#### Test 3.1: Invalid JSON
**Steps:**
1. Manually trigger feed creation with malformed JSON
2. Or simulate API returning invalid JSON

**Expected Results:**
- ✅ Error message displayed to user
- ✅ Loading state cleared
- ✅ No feed card created
- ✅ Error logged in console

**Test Data:**
```json
{
  "strategyJson": "{ invalid json }"
}
```

---

#### Test 3.2: Missing Posts
**Steps:**
1. Simulate API returning strategy with < 9 posts
2. Or strategy with missing required fields

**Expected Results:**
- ✅ API returns 400 error
- ✅ Error message: "Strategy must contain exactly 9 posts"
- ✅ No feed card created
- ✅ User sees error notification

---

#### Test 3.3: Network Error
**Steps:**
1. Disconnect network
2. Try to create feed
3. Reconnect network

**Expected Results:**
- ✅ Error handled gracefully
- ✅ Loading state cleared
- ✅ User can retry
- ✅ No partial state left behind

---

### 4. Edge Cases

#### Test 4.1: Streaming Messages
**Steps:**
1. Start feed creation
2. Verify trigger detected during streaming
3. Verify loading indicator shows immediately
4. Wait for complete response

**Expected Results:**
- ✅ Loading indicator shows as soon as trigger detected
- ✅ Feed card appears when JSON is complete
- ✅ No duplicate processing
- ✅ No infinite loops

---

#### Test 4.2: Page Refresh During Creation
**Steps:**
1. Start feed creation
2. Refresh page before completion
3. Verify state recovery

**Expected Results:**
- ✅ Feed card loads from database if saved
- ✅ No duplicate feed cards
- ✅ Loading state cleared if feed card exists

---

#### Test 4.3: Multiple Feeds in Same Chat
**Steps:**
1. Create first feed
2. Create second feed in same chat
3. Verify both feeds display correctly

**Expected Results:**
- ✅ Both feed cards visible
- ✅ Each feed card has unique ID
- ✅ No conflicts or duplicates

---

#### Test 4.4: Duplicate Triggers
**Steps:**
1. Create feed
2. Manually trigger same feed creation again
3. Verify no duplicates

**Expected Results:**
- ✅ Duplicate detection works
- ✅ No duplicate feed cards created
- ✅ Message marked as processed

---

### 5. Backward Compatibility

#### Test 5.1: Old Feeds from styling_details
**Steps:**
1. Verify old feeds (stored in `styling_details`) still load
2. Check database for feeds in `styling_details` column
3. Load chat with old feed

**Expected Results:**
- ✅ Old feeds load correctly
- ✅ Fallback to `styling_details` works
- ✅ Feed cards display properly
- ✅ No errors in console

**Database Query:**
```sql
SELECT id, styling_details FROM maya_chat_messages 
WHERE styling_details IS NOT NULL 
AND styling_details::text LIKE '%"feedStrategy"%'
LIMIT 1;
```

---

#### Test 5.2: Migration Verification
**Steps:**
1. Check if migration has been run
2. Verify `feed_cards` column exists
3. Verify data migrated from `styling_details`

**Expected Results:**
- ✅ `feed_cards` column exists in `maya_chat_messages`
- ✅ Old data migrated (if any existed)
- ✅ Index created on `feed_cards`

**Database Verification:**
```sql
-- Check column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'maya_chat_messages' 
AND column_name = 'feed_cards';

-- Check migrated data
SELECT COUNT(*) FROM maya_chat_messages 
WHERE feed_cards IS NOT NULL;
```

---

## Test Checklist

### Classic Mode
- [ ] Feed creation works
- [ ] Feed card displays correctly
- [ ] Feed saves to database
- [ ] Feed loads on refresh
- [ ] Error handling works

### Pro Mode
- [ ] Pro Mode endpoint called
- [ ] Image library passed correctly
- [ ] Feed creation works
- [ ] Feed card displays correctly

### Error Handling
- [ ] Invalid JSON handled
- [ ] Missing posts handled
- [ ] Network errors handled
- [ ] User-friendly error messages

### Edge Cases
- [ ] Streaming messages work
- [ ] Page refresh works
- [ ] Multiple feeds work
- [ ] Duplicate triggers prevented

### Backward Compatibility
- [ ] Old feeds load from `styling_details`
- [ ] Migration completed
- [ ] No data loss

---

## Performance Tests

### Test P.1: Response Time
- Measure time from trigger detection to feed card display
- Target: < 2 seconds for API validation
- Target: < 5 seconds total (including UI update)

### Test P.2: Database Performance
- Verify GIN index on `feed_cards` improves query performance
- Test with 100+ messages with feed cards

---

## Regression Tests

### Test R.1: Concept Cards Still Work
- Verify concept card creation still works
- Verify no interference between feed cards and concept cards

### Test R.2: Other Chat Features
- Verify message sending still works
- Verify chat history loads correctly
- Verify other tabs (Photos, Videos, etc.) still work

---

## Notes

- All tests should be performed in both Classic and Pro Mode
- Test on mobile and desktop
- Test with different browsers (Chrome, Safari, Firefox)
- Monitor console for errors during all tests
- Check network tab for correct API calls

---

## Test Results Template

```
Test Case: [Name]
Date: [Date]
Tester: [Name]
Result: ✅ Pass / ❌ Fail
Notes: [Any issues or observations]
```


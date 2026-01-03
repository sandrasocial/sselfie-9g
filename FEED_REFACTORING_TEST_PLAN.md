# Feed Refactoring - Test Plan

## Overview
This document outlines the test plan for validating the feed refactoring work completed in Phases 1-5.

## Completed Phases

### ✅ Phase 1: FeedTab Component Created
- **File**: `components/sselfie/maya/maya-feed-tab.tsx`
- **Status**: Created and integrated into `maya-chat-screen.tsx`
- **Features**:
  - Feed-specific UI isolated from photo generation
  - Feed trigger detection (`[CREATE_FEED_STRATEGY]`, `[GENERATE_CAPTIONS]`, `[GENERATE_STRATEGY]`)
  - Feed-specific quick prompts
  - Empty state with feed messaging

### ✅ Phase 2: Feed Handlers Extracted
- **File**: `lib/maya/feed-generation-handler.ts`
- **Status**: Pure functions extracted from maya-chat-screen.tsx
- **Functions**:
  - `createFeedFromStrategyHandler` - Creates feed from Maya's strategy
  - `generateCaptionsHandler` - Generates captions for feed
  - `generateStrategyHandler` - Generates strategy document
  - `saveFeedMarkerToMessage` - Saves feed marker to message

### ✅ Phase 3: Dedicated Feed API Routes Created
- **Files**:
  - `app/api/maya/feed/create-strategy/route.ts` - Wraps feed creation
  - `app/api/maya/feed/generate-images/route.ts` - Batch image generation
  - `app/api/maya/feed/save-to-planner/route.ts` - Save feed to planner
- **Status**: Routes created and maintain backward compatibility

### ✅ Phase 4: Chat Route Cleaned
- **File**: `app/api/maya/chat/route.ts`
- **Status**: Feed trigger detection removed, context addon kept (essential)
- **Note**: Feed planner context addon is intentional and needed for Maya to understand feed creation

### ✅ Phase 5: Handler Updated to Use New Routes
- **File**: `lib/maya/feed-generation-handler.ts`
- **Status**: Updated to use `/api/maya/feed/create-strategy` instead of old route

## Test Cases

### Test 1: Feed Strategy Creation
**Goal**: Verify feed strategy can be created from Maya chat

**Steps**:
1. Navigate to Maya Chat → Feed Tab
2. Type: "Create an Instagram feed for my business"
3. Wait for Maya to generate strategy with `[CREATE_FEED_STRATEGY]` trigger
4. Verify feed is created and feed card appears in chat

**Expected Results**:
- ✅ Maya responds with feed strategy
- ✅ `[CREATE_FEED_STRATEGY]` trigger is detected
- ✅ Feed is created via `/api/maya/feed/create-strategy`
- ✅ Feed card appears in chat with feed ID
- ✅ Feed appears in feed planner

**API Calls to Verify**:
- `POST /api/maya/feed/create-strategy` (should forward to `/api/feed-planner/create-from-strategy`)
- Feed should be saved to database with correct user_id

### Test 2: Feed Image Generation
**Goal**: Verify all 9 feed images can be generated

**Steps**:
1. Create a feed (from Test 1)
2. Click "Generate Feed" or trigger image generation
3. Verify all 9 images generate

**Expected Results**:
- ✅ Image generation starts for all 9 posts
- ✅ Images generate in correct order (1-9)
- ✅ Both Classic and Pro mode posts generate correctly
- ✅ Images appear in feed planner

**API Calls to Verify**:
- `POST /api/maya/feed/generate-images` (should call `/api/feed/{feedId}/generate-single` for each post)
- Each post should have `generation_status` updated

### Test 3: Caption Generation
**Goal**: Verify captions can be generated for feed

**Steps**:
1. Have a feed with images (from Test 2)
2. Type: "Create captions for my feed" or trigger `[GENERATE_CAPTIONS]`
3. Verify captions are generated

**Expected Results**:
- ✅ `[GENERATE_CAPTIONS]` trigger is detected
- ✅ Captions are generated for all 9 posts
- ✅ Captions appear in feed planner
- ✅ Captions follow Hook-Story-Value-CTA framework

**API Calls to Verify**:
- `POST /api/feed/{feedId}/generate-captions` (existing route, should still work)

### Test 4: Strategy Document Generation
**Goal**: Verify strategy document can be generated

**Steps**:
1. Have a feed (from Test 1)
2. Type: "Create a strategy document for my feed" or trigger `[GENERATE_STRATEGY]`
3. Verify strategy document is generated

**Expected Results**:
- ✅ `[GENERATE_STRATEGY]` trigger is detected
- ✅ Strategy document is generated
- ✅ Document includes narrative arc, content pillars, engagement strategy

**API Calls to Verify**:
- `POST /api/feed/{feedId}/generate-strategy` (existing route, should still work)

### Test 5: Feed Tab Isolation
**Goal**: Verify feed tab doesn't interfere with other tabs

**Steps**:
1. Test Photos tab - generate a photo
2. Test Videos tab - generate a video
3. Test Prompts tab - generate prompts
4. Switch to Feed tab - create a feed
5. Switch back to Photos tab - verify it still works

**Expected Results**:
- ✅ Photos tab works independently
- ✅ Videos tab works independently
- ✅ Prompts tab works independently
- ✅ Feed tab works independently
- ✅ No state leakage between tabs

### Test 6: Feed Quick Prompts
**Goal**: Verify feed-specific quick prompts work

**Steps**:
1. Navigate to Feed Tab (empty state)
2. Click on a quick prompt (e.g., "Create Feed Layout")
3. Verify prompt is sent and Maya responds

**Expected Results**:
- ✅ Quick prompts appear in empty state
- ✅ Prompts are feed-specific (not photo prompts)
- ✅ Clicking prompt sends message to Maya
- ✅ Maya responds appropriately

### Test 7: Feed Card Persistence
**Goal**: Verify feed cards persist after page refresh

**Steps**:
1. Create a feed (from Test 1)
2. Verify feed card appears
3. Refresh the page
4. Verify feed card still appears

**Expected Results**:
- ✅ Feed card appears after refresh
- ✅ Feed marker `[FEED_CARD:{feedId}]` is saved to message
- ✅ Feed card can be clicked to navigate to feed planner

### Test 8: Error Handling
**Goal**: Verify error handling works correctly

**Steps**:
1. Try to create feed without sufficient credits
2. Try to create feed without trained model (Classic Mode)
3. Try to create feed without avatar images (Pro Mode)
4. Verify error messages are clear

**Expected Results**:
- ✅ Clear error messages for insufficient credits
- ✅ Clear error messages for missing prerequisites
- ✅ Errors don't break the UI
- ✅ User can retry after fixing issues

## Manual Testing Checklist

- [ ] Feed Tab appears in Maya Chat screen
- [ ] Feed Tab has correct empty state with feed-specific messaging
- [ ] Feed Tab quick prompts are feed-specific
- [ ] Creating feed strategy works
- [ ] Feed card appears after strategy creation
- [ ] Feed appears in feed planner
- [ ] Image generation works for all 9 posts
- [ ] Caption generation works
- [ ] Strategy document generation works
- [ ] Feed Tab doesn't interfere with other tabs
- [ ] Feed cards persist after refresh
- [ ] Error handling works correctly
- [ ] No console errors
- [ ] No TypeScript errors

## Automated Testing (Future)

### Unit Tests
- [ ] Test `createFeedFromStrategyHandler` function
- [ ] Test `generateCaptionsHandler` function
- [ ] Test `generateStrategyHandler` function
- [ ] Test feed trigger detection logic

### Integration Tests
- [ ] Test feed creation flow end-to-end
- [ ] Test image generation flow
- [ ] Test caption generation flow
- [ ] Test strategy document generation flow

### E2E Tests (Playwright)
- [ ] Test complete feed creation journey
- [ ] Test feed card interaction
- [ ] Test feed navigation to planner

## Known Issues / Notes

1. **Feed Planner Context Addon**: The feed planner context addon in `/api/maya/chat/route.ts` is intentional and should NOT be removed. It's essential for Maya to understand feed creation.

2. **Backward Compatibility**: The new routes maintain backward compatibility by forwarding to existing routes. This ensures no breaking changes.

3. **Image Library**: Pro Mode feeds require image library selection. This is handled in the feed creation flow.

4. **Mode Detection**: Feed creation supports both explicit mode selection (via toggle) and auto-detection per post.

## Success Criteria

✅ All test cases pass
✅ No regressions in Photos/Videos/Prompts tabs
✅ Feed generation works end-to-end
✅ Feed cards persist correctly
✅ Error handling is clear and helpful
✅ Code is clean and maintainable
✅ No console errors or warnings

## Next Steps

1. Run manual tests using this checklist
2. Fix any issues found
3. Add automated tests for critical paths
4. Update documentation if needed
5. Mark refactoring as complete


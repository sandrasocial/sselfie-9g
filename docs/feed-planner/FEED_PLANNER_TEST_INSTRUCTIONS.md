# Feed Planner Issues - Test Instructions

## 🧪 Running the Diagnostic Test

We've created a comprehensive diagnostic test that checks all identified issues in the Feed Planner.

### Quick Start

```bash
# Run the test
pnpm test:feed-planner

# Or directly with tsx
npx tsx scripts/test-feed-planner-issues.ts
```

### What the Test Checks

The test verifies **13 critical issues** across 6 categories:

#### 1. Button Loading State (2 tests)
- ✅ StrategyPreview receives `isCreating` prop
- ✅ FeedPlannerScreen passes `isCreatingStrategy` to StrategyPreview

#### 2. API Endpoint Flow (2 tests)
- ✅ Endpoint validates prerequisites before queueing
- ✅ Endpoint handles queue errors properly

#### 3. Queue Function Prerequisites (3 tests)
- ✅ Checks for trained model (Classic Mode)
- ✅ Checks for avatar images (Pro Mode - needs 3+)
- ✅ Checks credits before queueing

#### 4. Error Handling (2 tests)
- ✅ Queue errors are surfaced to user
- ✅ FeedPlannerScreen handles API errors

#### 5. Progress Tracking (2 tests)
- ✅ InstagramFeedView calculates progress correctly
- ✅ Progress updates when posts complete

#### 6. Loading Overlay (1 test)
- ✅ Loading overlay shown during API call

### Test Output

The test will show:
- ✅ **Passed tests** - Issue is fixed or working correctly
- ❌ **Failed tests** - Issue needs to be fixed
- **Error messages** - What's wrong
- **Details** - How to fix it

### Example Output

```
🧪 Feed Planner Issues Diagnostic Test

============================================================

📋 TEST 1: Button Loading State
❌ 1. StrategyPreview receives isCreating prop
   Error: StrategyPreview component does not accept isCreating prop
   Details: Component needs to accept isCreating prop to show loading state

✅ 2. FeedPlannerScreen passes isCreatingStrategy to StrategyPreview

============================================================

📊 TEST RESULTS SUMMARY

✅ Passed: 5/13
❌ Failed: 8/13

⚠️  Issues found! See details above.
```

### Next Steps After Running Test

1. **Review failed tests** - Each failure shows what's wrong
2. **Check the analysis document** - `docs/feed-planner/FEED_PLANNER_LOADING_STATE_ANALYSIS.md`
3. **Implement fixes** - Follow the recommendations in the analysis document
4. **Re-run test** - Verify fixes work

### Manual Testing Checklist

After fixing issues, manually test:

1. **Button Loading State**
   - [ ] Click "Generate Feed" button
   - [ ] Button should show spinner immediately
   - [ ] Button should be disabled during API call

2. **Loading Overlay**
   - [ ] After clicking button, overlay should appear
   - [ ] Overlay should show "Creating your feed..." message

3. **Error Handling**
   - [ ] If user has no trained model, error should be shown
   - [ ] If user has < 3 avatar images (Pro Mode), error should be shown
   - [ ] If user has insufficient credits, error should be shown

4. **Progress Tracking**
   - [ ] Progress bar should show "0 of 9 complete" initially
   - [ ] Progress should update as images complete
   - [ ] Progress should reach "9 of 9 complete" when done

### Integration Testing (Optional)

For full integration testing with real database:

1. Set up test database
2. Create test user with:
   - Trained model (for Classic Mode)
   - 3+ avatar images (for Pro Mode)
   - Sufficient credits
3. Test full flow:
   - Create strategy
   - Generate feed
   - Verify images generate
   - Verify progress updates

---

## 🔧 Fixing Issues

See `docs/feed-planner/FEED_PLANNER_LOADING_STATE_ANALYSIS.md` for detailed fix recommendations.




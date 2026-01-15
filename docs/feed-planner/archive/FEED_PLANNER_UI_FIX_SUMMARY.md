# Feed Planner UI Fix Summary

## Issues Identified & Fixed

### ✅ 1. Chat Bubble Hidden in Feed Planner
**Issue:** The feedback chat bubble (FeedbackButton) was showing in Feed Planner, but it should only be visible in Account tab.

**Fix:** Updated `components/sselfie/sselfie-app.tsx` line 558:
```typescript
// Before:
{activeTab !== "maya" && (
  <FeedbackButton ... />
)}

// After:
{activeTab !== "maya" && activeTab !== "feed-planner" && (
  <FeedbackButton ... />
)}
```

**Status:** ✅ Fixed

---

### ✅ 2. Conversation View Layout Fixed
**Issue:** The conversation view container was missing `min-h-0` and proper ref setup, causing layout issues.

**Fix:** Updated `components/feed-planner/feed-planner-screen.tsx`:
- Added `min-h-0` to outer container
- Added `ref={messagesContainerRef}` to scrollable container
- Added `min-h-0` to inner scrollable container
- Added `messagesEndRef` div for scroll handling

**Status:** ✅ Fixed

---

### ✅ 3. Old Components Audit
**Audit Result:** 
- `feed-strategy-panel.tsx` exists but is NOT imported or used
- `feed-grid-preview.tsx` exists but is NOT imported or used
- Only exported in `index.ts` but never actually rendered

**Conclusion:** Old components are not causing any overlay issues. They're safe to keep (for reference) or can be deleted in a cleanup pass.

---

## Current Feed Planner Rendering Logic

The `FeedPlannerScreen` component renders THREE views conditionally:

1. **Conversation View** (`showConversation`):
   - Condition: `step === 'request' && !strategyPreview && !currentFeedId`
   - Renders: `MayaChatInterface` + `MayaUnifiedInput`
   - Used for: Initial chat with Maya to create strategy

2. **Strategy Preview View** (`showPreview`):
   - Condition: `strategyPreview && step === 'request' && !currentFeedId`
   - Renders: `MayaChatInterface` (history) + `StrategyPreview` component
   - Used for: Showing generated strategy for user approval

3. **Feed View** (`showFeed`):
   - Condition: `currentFeedId && step === 'view'`
   - Renders: `InstagramFeedView` component
   - Used for: Displaying the generated feed grid

4. **Fallback View**:
   - Condition: `!showConversation && !showPreview && !showFeed`
   - Renders: `MayaChatInterface` + `MayaUnifiedInput` (default state)
   - Used for: Edge case fallback

---

## Debugging Tips

If the chat interface still doesn't show, check the browser console for:

```
[FeedPlanner] View conditions: {
  step: 'request',
  strategyPreview: false,
  currentFeedId: null,
  showConversation: true,  // Should be true
  showPreview: false,
  showFeed: false
}
```

If `showConversation: true` but UI is blank:
- Check browser DevTools for CSS issues (hidden elements, z-index conflicts)
- Check if `MayaChatInterface` is rendering (inspect DOM)
- Check if messages array is empty (new chat with 0 messages is normal)

---

## Next Steps

1. ✅ Chat bubble hidden in Feed Planner
2. ✅ Layout fixes applied
3. ⏳ Test the Feed Planner UI to verify chat interface renders
4. ⏳ If still blank, check browser console for errors
5. ⏳ If still blank, inspect DOM to see if components are rendering but hidden


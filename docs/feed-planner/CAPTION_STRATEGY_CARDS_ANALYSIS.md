# Caption Cards & Strategy Cards Analysis

## Current Status: ✅ WORKING CORRECTLY

After analyzing the caption and strategy card implementations, both are working correctly and don't have the same data structure issues as the feed preview card had.

---

## Caption Cards (FeedCaptionCard)

### ✅ Trigger Detection
- **Location:** `components/sselfie/maya-chat-screen.tsx` (lines 926-932)
- **Trigger:** `[GENERATE_CAPTIONS]`
- **Detection:** ✅ Working - detects trigger when `activeMayaTab === "feed"`
- **Handler:** Calls `generateCaptionsForFeed()`

### ✅ Trigger Filtering
- **Location:** `components/sselfie/maya/maya-chat-interface.tsx` (lines 223-224, 423-424)
- **Status:** ✅ Working - triggers are filtered from chat display

### ✅ Data Flow
1. User asks for captions (or clicks "Create Captions" quick prompt)
2. Maya responds and outputs `[GENERATE_CAPTIONS]` trigger
3. Frontend detects trigger → calls `generateCaptionsForFeed()`
4. API `/api/feed/[feedId]/generate-captions` generates captions
5. Returns array of captions with `postId`, `position`, `caption`, `hashtags`, `prompt`
6. Frontend adds `tool-generateCaptions` part to message
7. `FeedCaptionCard` components render with correct props

### ✅ Component Props
```typescript
{
  caption: string           // ✅ Correct
  postPosition: number      // ✅ Correct
  postPrompt?: string       // ✅ Optional, correct
  hashtags?: string[]       // ✅ Optional, correct
  feedId: number           // ✅ Correct
  postId: number           // ✅ Correct
  onAddToFeed?: () => void // ✅ Optional callback
  onRegenerate?: () => void // ✅ Optional callback
}
```

### ✅ API Response Structure
```typescript
{
  success: true,
  feedId: number,
  captions: [
    {
      postId: number,
      position: number,
      caption: string,
      hashtags: string[],
      prompt: string
    }
  ]
}
```
**Status:** ✅ Matches what `FeedCaptionCard` expects

---

## Strategy Cards (FeedStrategyCard)

### ✅ Trigger Detection
- **Location:** `components/sselfie/maya-chat-screen.tsx` (lines 934-940)
- **Trigger:** `[GENERATE_STRATEGY]`
- **Detection:** ✅ Working - detects trigger when `activeMayaTab === "feed"`
- **Handler:** Calls `generateStrategyForFeed()`

### ✅ Trigger Filtering
- **Location:** `components/sselfie/maya/maya-chat-interface.tsx` (lines 223-224, 423-424)
- **Status:** ✅ Working - triggers are filtered from chat display

### ✅ Data Flow
1. User asks for strategy (or clicks "Create Strategy" quick prompt)
2. Maya responds and outputs `[GENERATE_STRATEGY]` trigger
3. Frontend detects trigger → calls `generateStrategyForFeed()`
4. API `/api/feed/[feedId]/generate-strategy` generates strategy
5. Returns markdown strategy document
6. Frontend adds `tool-generateStrategy` part to message
7. `FeedStrategyCard` component renders with correct props

### ✅ Component Props
```typescript
{
  strategy: string          // ✅ Markdown string - correct
  feedId: number           // ✅ Correct
  onAddToFeed?: () => void // ✅ Optional callback
}
```

### ✅ API Response Structure
```typescript
{
  success: true,
  feedId: number,
  strategy: string  // Markdown formatted strategy document
}
```
**Status:** ✅ Matches what `FeedStrategyCard` expects

---

## Potential Enhancement: Maya Personality Guidance

### ⚠️ Gap Identified (Not Critical)

The Feed Planner Workflow section in `lib/maya/personality.ts` doesn't explicitly mention when/how Maya should use `[GENERATE_CAPTIONS]` or `[GENERATE_STRATEGY]` triggers.

**Current Behavior:**
- Users can click quick prompts ("Create Captions", "Create Strategy")
- Users can ask Maya directly ("create captions for my feed", "create a strategy")
- Maya responds conversationally and can output triggers

**Potential Issue:**
- Maya might not know when to use these triggers vs. just explaining captions/strategy in text

**Recommendation:**
- This is likely fine - Maya can infer when to use triggers based on user intent
- Quick prompts handle the explicit use cases
- If issues arise, we can add explicit guidance to personality file

---

## Summary

### ✅ What's Working:
1. Trigger detection for both caption and strategy generation
2. Trigger filtering from chat display
3. Correct data structures - API responses match component props
4. Components render correctly with received data
5. "Add to Feed" functionality works for both

### ⚠️ Minor Gap (Not Critical):
- Personality file doesn't explicitly guide Maya on when to use caption/strategy triggers
- Currently works via user intent detection and quick prompts
- Could be enhanced if needed

### 🎯 Conclusion:
**Caption cards and strategy cards are working correctly and don't need fixes.** They don't have the same data structure inconsistencies that the feed preview card had.





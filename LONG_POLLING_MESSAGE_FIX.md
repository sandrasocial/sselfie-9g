# Long Polling Friendly Message — Feed Planner

**Date:** 2026-01-19  
**Status:** ✅ COMPLETE  
**Feature:** Show friendly message when feed generation takes longer than 3 minutes

---

## 🎯 FEATURE REQUEST

When feed planner polling takes more than 3 minutes, show a friendly message in the UI where the loader is displayed to let users know it's taking longer than expected.

---

## ✅ SOLUTION

### 1. Added Time Tracking to Polling Hook

**File:** `components/feed-planner/hooks/use-feed-polling.ts`

**Added State:**
```typescript
// Track if polling has taken longer than 3 minutes
const [isTakingLonger, setIsTakingLonger] = useState(false)
```

**Added Logic (After Existing Timeout Check):**
```typescript
// Show "taking longer" message after 3 minutes
if (elapsedTime > 3 * 60 * 1000 && !isTakingLonger) {
  console.log(`[useFeedPolling] ℹ️ Generation taking longer than 3 minutes, showing friendly message`)
  setIsTakingLonger(true)
}
```

**Updated Return Value:**
```typescript
return {
  feedData,
  feedError,
  mutate,
  isLoading,
  isValidating,
  hasTimedOut,
  isTakingLonger  // ✅ Added
}
```

---

### 2. Updated Loading Overlay Component

**File:** `components/feed-planner/feed-loading-overlay.tsx`

**Added Prop:**
```typescript
interface FeedLoadingOverlayProps {
  feedId: number | null
  readyPosts: number
  totalPosts: number
  overallProgress: number
  processingStage?: string
  isValidating: boolean
  getProgressMessage: () => string
  isTakingLonger?: boolean  // ✅ Added
}
```

**Added UI Message:**
```tsx
{isTakingLonger && (
  <div className="mt-6 pt-6 border-t border-stone-200">
    <p className="text-sm font-light text-stone-600 leading-relaxed">
      ✨ This is taking a bit longer than expected! Your photos are being carefully crafted with high-quality details. Feel free to grab a coffee—we'll have them ready soon! ☕
    </p>
  </div>
)}
```

---

### 3. Passed State Through Component Tree

**File:** `components/feed-planner/instagram-feed-view.tsx`

**Extracted from Hook:**
```typescript
const { feedData, feedError, mutate, isLoading: isFeedLoading, isValidating, isTakingLonger } = useFeedPolling(feedId)
```

**Passed to Overlay:**
```tsx
<FeedLoadingOverlay
  feedId={feedId}
  readyPosts={readyPosts}
  totalPosts={totalPosts}
  overallProgress={overallProgress}
  isValidating={isValidating}
  getProgressMessage={getProgressMessage}
  isTakingLonger={isTakingLonger}  // ✅ Added
/>
```

---

## 📊 USER EXPERIENCE

### Timeline

**0-3 minutes:**
- ✅ Normal loading state
- Shows progress bar
- Shows "Maya is creating your photos"
- Shows "X of Y complete"

**After 3 minutes:**
- ✅ Normal loading state PLUS friendly message
- Message appears below progress indicators
- Separated by a subtle border
- Reassuring tone with emojis

**After 10 minutes:**
- ✅ Timeout logic kicks in (existing behavior)
- Attempts final status check
- Marks stuck posts as failed

---

## 🎨 MESSAGE DESIGN

**Content:**
```
✨ This is taking a bit longer than expected! Your photos are being 
carefully crafted with high-quality details. Feel free to grab a 
coffee—we'll have them ready soon! ☕
```

**Styling:**
- Soft, friendly tone
- Includes emojis (✨ ☕)
- Light stone-600 text color
- Separated by subtle border
- Font: light weight, relaxed line height
- Positioned below progress indicators

**Why This Works:**
1. ✅ **Acknowledges the delay** - "taking a bit longer than expected"
2. ✅ **Explains why** - "carefully crafted with high-quality details"
3. ✅ **Reassures completion** - "we'll have them ready soon"
4. ✅ **Gives permission to wait** - "Feel free to grab a coffee"
5. ✅ **Maintains brand tone** - Friendly, feminine, reassuring

---

## 🧪 TESTING

### Test Scenario 1: Normal Generation (< 3 minutes)
1. Start feed generation
2. Wait for completion
3. **Expected:** No "taking longer" message shown

### Test Scenario 2: Slow Generation (> 3 minutes)
1. Start feed generation
2. Wait 3+ minutes
3. **Expected:** Friendly message appears below progress bar
4. **Expected:** Message persists until completion

### Test Scenario 3: Very Slow Generation (> 10 minutes)
1. Start feed generation
2. Wait 10+ minutes
3. **Expected:** 
   - Friendly message shown (3-10 min mark)
   - Timeout logic activates at 10 minutes
   - Posts marked as failed if still generating

---

## 📁 FILES MODIFIED

1. **`components/feed-planner/hooks/use-feed-polling.ts`**
   - Added `isTakingLonger` state
   - Added 3-minute check in polling logic
   - Returns `isTakingLonger` in hook result

2. **`components/feed-planner/feed-loading-overlay.tsx`**
   - Added `isTakingLonger` prop to interface
   - Added conditional message display
   - Styled with border separation and friendly copy

3. **`components/feed-planner/instagram-feed-view.tsx`**
   - Extracts `isTakingLonger` from polling hook
   - Passes prop to `FeedLoadingOverlay`

---

## ✅ BENEFITS

1. **Transparency:**
   - Users know the system is still working
   - Reduces anxiety about "is it frozen?"

2. **Reassurance:**
   - Explains why it's taking longer (quality)
   - Promises completion ("we'll have them ready")

3. **Better UX:**
   - Gives permission to leave and come back
   - Maintains trust in the system

4. **Brand Consistency:**
   - Friendly, feminine tone
   - Emoji usage (✨ ☕)
   - Reassuring messaging

5. **Progressive Disclosure:**
   - Only shows when needed (after 3 min)
   - Doesn't clutter the UI for fast generations

---

## 🎯 TIMING RATIONALE

**Why 3 minutes?**
- Most feed generations complete in 1-2 minutes
- 3 minutes is long enough to indicate "longer than usual"
- Not so long that users give up before seeing the message

**Timeline:**
- **0-3 min:** Normal generation time, no message needed
- **3-10 min:** Show friendly message, system still working
- **10+ min:** Timeout, mark as failed, attempt recovery

---

**Status:** ✅ Complete - No linter errors  
**Testing:** Start feed generation and wait 3+ minutes to see message  
**Related:** Feed polling timeout logic (10 minutes)

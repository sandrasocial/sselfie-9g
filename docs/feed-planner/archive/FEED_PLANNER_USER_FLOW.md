# Feed Planner User Flow - Expected Behavior

## 📱 Expected User Flow

### **1. Initial State (New User / No Strategy)**
- User opens Feed Planner
- System checks for existing feed strategy (`/api/feed-planner/status`)
- **If no strategy exists:**
  - Show **Conversation View** (MayaChatInterface + MayaUnifiedInput)
  - User chats with Maya about their Instagram feed goals

### **2. Strategy Creation (Conversational)**
- User types messages to Maya
- Maya asks questions (business type, vibe, content pillars, etc.)
- Maya generates a strategy preview and shows it conversationally
- Maya outputs `[CREATE_FEED_STRATEGY]` trigger with strategy JSON

### **3. Strategy Preview**
- System detects the trigger and parses strategy JSON
- Show **Strategy Preview View**:
  - Shows conversation history above
  - Shows StrategyPreview component with:
    - 3x3 color-coded grid
    - Credit breakdown
    - "Adjust Strategy" and "Generate Feed" buttons

### **4. Feed Generation**
- User clicks "Generate Feed"
- System calls `/api/feed-planner/create-strategy` with approved strategy
- Show **Feed View** (InstagramFeedView):
  - Shows 3x3 grid of posts
  - Real-time generation progress
  - Confetti when all posts complete

### **5. Existing Strategy (Returning User)**
- If user has existing strategy:
  - Skip conversation view
  - Show **Feed View** directly with their feed

---

## 🎯 View Conditions

The Feed Planner has **3 main views** that are conditionally rendered:

### **View 1: Conversation View**
```typescript
showConversation = step === 'request' && !strategyPreview && !currentFeedId
```
**Shows:**
- MayaChatInterface (chat messages)
- MayaUnifiedInput (message input at bottom)
- User chats with Maya to create strategy

### **View 2: Strategy Preview View**
```typescript
showPreview = strategyPreview && step === 'request' && !currentFeedId
```
**Shows:**
- Conversation history (MayaChatInterface)
- StrategyPreview component (3x3 grid preview, credit breakdown)
- User can approve or adjust strategy

### **View 3: Feed View**
```typescript
showFeed = currentFeedId && step === 'view'
```
**Shows:**
- InstagramFeedView component
- 3x3 grid of posts
- Real-time generation progress
- Post details and captions

---

## 🔍 Current Issue: Blank Screen

The user is seeing a **blank white screen** instead of the Conversation View.

**Possible Causes:**
1. ✅ `isCheckingStatus` or `brandLoading` stuck → Would show UnifiedLoading (not blank)
2. ✅ `user` not loaded → Would show UnifiedLoading (not blank)
3. ❌ **None of the view conditions are true AND fallback isn't working**
4. ❌ **View conditions are evaluating incorrectly**
5. ❌ **CSS/layout issue preventing content from rendering**

**Debug Steps:**
1. Check browser console for `[FeedPlanner] View conditions:` log
2. Verify `step`, `strategyPreview`, `currentFeedId` values
3. Check if `showConversation`, `showPreview`, `showFeed` are all `false`
4. Check if fallback view (line 652) is rendering

---

## 🐛 What to Check

Check the browser console for:
```javascript
[FeedPlanner] View conditions: {
  step: "request" | "view",
  strategyPreview: true/false,
  currentFeedId: number | null,
  showConversation: true/false,
  showPreview: true/false,
  showFeed: true/false,
  isCheckingStatus: true/false,
  brandLoading: true/false,
  user: true/false
}
```

If `showConversation`, `showPreview`, and `showFeed` are all `false`, then the fallback view (line 652) should render. If it's not rendering, there's a rendering issue.


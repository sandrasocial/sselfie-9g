# Feed Planner Mode Selection - UX Recommendation

## 🎯 Best User Journey Recommendation

### **Recommended: Smart Default with Optional Override**

**Approach:** Auto-detect by default, but give users explicit control when they want it.

## 📊 Three Options Compared

### **Option 1: Auto-Detect Only (Current)**
**Flow:** No user choice, system decides per post

**Pros:**
- ✅ Simplest UX - no decisions
- ✅ Most flexible - mixed content supported
- ✅ System handles complexity

**Cons:**
- ❌ User doesn't understand why some posts cost more
- ❌ User can't control cost
- ❌ Inconsistent with Maya's UX
- ❌ User might not realize they need avatar images for Pro posts

**User Experience:**
- User enters goal → Generates feed → Some posts are Pro (2 credits), some Classic (1 credit)
- User might be surprised by cost difference
- User might not understand why

---

### **Option 2: User Choice (Like Maya)**
**Flow:** User explicitly chooses Classic OR Pro for entire feed

**Pros:**
- ✅ Consistent with Maya's UX
- ✅ User understands cost upfront
- ✅ User has full control
- ✅ Clear what mode they're using

**Cons:**
- ❌ Less flexible - can't mix Classic + Pro in same feed
- ❌ If user chooses Classic, can't generate carousels/quote graphics (need Pro)
- ❌ If user chooses Pro, pays 2 credits per image (more expensive)

**User Experience:**
- User enters goal → Sees mode toggle → Chooses Classic or Pro → Generates feed
- Clear cost: Classic = 9 credits, Pro = 18 credits
- But: Can't generate carousel if they chose Classic

---

### **Option 3: Smart Default + Optional Override (RECOMMENDED)** ⭐

**Flow:** Auto-detect by default, but user can override

**Implementation:**
```
┌─────────────────────────────────────────┐
│ Generate Feed Strategy                  │
│                                         │
│ [Enter your feed goal...]               │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Generation Mode (Optional)          │ │
│ │                                     │ │
│ │ ○ Auto-detect (Recommended)        │ │
│ │   Uses best mode per post          │ │
│ │   ~11-14 credits (mixed)           │ │
│ │                                     │ │
│ │ ○ Classic Mode                     │ │
│ │   Uses your trained model          │ │
│ │   9 credits total                  │ │
│ │   ⚠️ Can't generate carousels      │ │
│ │                                     │ │
│ │ ○ Pro Mode                         │ │
│ │   Uses reference images            │ │
│ │   18 credits total                 │ │
│ │   ✓ All content types supported    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Generate Feed - 14 credits]            │
└─────────────────────────────────────────┘
```

**Pros:**
- ✅ Best of both worlds
- ✅ Smart default (auto-detect) for most users
- ✅ User control when needed
- ✅ Clear cost preview for each option
- ✅ Warns about limitations (Classic can't do carousels)
- ✅ Consistent with Maya (has mode choice)

**Cons:**
- ⚠️ Slightly more complex UI (but still simple)

**User Experience:**
- User enters goal
- Sees optional mode selector (defaults to "Auto-detect")
- If they want control, they can choose Classic or Pro
- Clear cost preview for each option
- Warnings shown if they choose a mode that limits features

---

## 💡 Implementation Details

### **Smart Defaults Based on Setup Status:**

1. **Auto-detect (Default):**
   - Works if user has trained model OR avatar images
   - Mixes Classic + Pro as needed
   - Cost: Variable (9-18 credits depending on mix)

2. **Classic Mode:**
   - Requires: Trained model
   - If no trained model → Show warning, disable option
   - Cost: 9 credits (fixed)
   - Limitation: Can't generate carousels/quote graphics

3. **Pro Mode:**
   - Requires: 3+ avatar images
   - If < 3 images → Show warning, offer to add images
   - Cost: 18 credits (fixed)
   - Advantage: All content types supported

### **UI Placement:**

**Option A: In Feed Planner Screen (Before Goal Input)**
- Toggle visible at top of form
- Always visible
- Good for power users who want control

**Option B: In Goal Form (Collapsible Section)**
- Hidden by default (collapsed)
- Expandable "Advanced Options"
- Good for simple UX, doesn't overwhelm

**Option C: After Goal Entry, Before Generation**
- User enters goal → Sees mode selector → Generates
- Good middle ground
- Natural flow

**RECOMMENDED: Option B or C** - Keep it simple, don't overwhelm, but make it accessible.

---

## 🎨 UI Design Suggestion

### **Collapsible Section in Feed Planner Form:**

```tsx
<div className="space-y-4">
  {/* Goal Input */}
  <Textarea placeholder="Enter your feed goal..." />
  
  {/* Mode Selection (Collapsible) */}
  <details className="group">
    <summary className="cursor-pointer text-sm text-stone-600 hover:text-stone-900">
      Generation Mode (Optional - defaults to auto-detect)
    </summary>
    
    <div className="mt-3 space-y-3 p-4 bg-stone-50 rounded-lg border border-stone-200">
      {/* Radio options with cost preview */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="radio" name="mode" value="auto" defaultChecked />
        <div>
          <div className="font-medium">Auto-detect (Recommended)</div>
          <div className="text-sm text-stone-600">
            Uses best mode per post • ~11-14 credits
          </div>
        </div>
      </label>
      
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="radio" name="mode" value="classic" />
        <div>
          <div className="font-medium">Classic Mode</div>
          <div className="text-sm text-stone-600">
            Uses trained model • 9 credits
          </div>
          {!hasTrainedModel && (
            <div className="text-xs text-amber-600 mt-1">
              ⚠️ Requires trained model
            </div>
          )}
        </div>
      </label>
      
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="radio" name="mode" value="pro" />
        <div>
          <div className="font-medium">Pro Mode</div>
          <div className="text-sm text-stone-600">
            Uses reference images • 18 credits
          </div>
          {!hasReferenceImages && (
            <div className="text-xs text-amber-600 mt-1">
              ⚠️ Requires 3+ avatar images
            </div>
          )}
        </div>
      </label>
    </div>
  </details>
  
  {/* Generate Button */}
  <button>Generate Feed</button>
</div>
```

---

## ✅ Final Recommendation

**Implement Option 3: Smart Default + Optional Override**

1. **Default:** Auto-detect (recommended) - uses best mode per post
2. **Override:** User can choose Classic or Pro if they want
3. **UI:** Collapsible section (doesn't overwhelm, but accessible)
4. **Validation:** Check setup status, show warnings for missing requirements
5. **Cost Preview:** Show estimated cost for each option

**Why This is Best:**
- ✅ Keeps simple UX for most users (auto-detect)
- ✅ Gives control to users who want it
- ✅ Consistent with Maya (has mode choice)
- ✅ Clear cost transparency
- ✅ Prevents confusion about why some posts cost more

**Implementation Steps:**
1. Add mode selection UI (collapsible section)
2. Integrate setup status API to check requirements
3. Pass selected mode to strategy creation API
4. Modify mode detection to respect user choice (override auto-detect)
5. Update cost calculation to show preview

This gives users the best of both worlds! 🎉


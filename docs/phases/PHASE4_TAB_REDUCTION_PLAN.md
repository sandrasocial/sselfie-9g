# Phase 4: Tab Reduction Plan - Reaching 4-5 Tabs

## 🎯 Goal
Reduce navigation from 7 tabs to 4-5 tabs by removing Training tab and improving onboarding.

---

## 📊 Current State

**Current Tabs (7):**
1. Training
2. Maya (default)
3. B-Roll
4. Gallery
5. Feed
6. Academy
7. Account

**Target:** 4-5 tabs

---

## 💡 Proposed Solution: Remove Training Tab

### Why Remove Training Tab?

**Current Issues:**
- Training is a **one-time activity** (or occasional retrain)
- Takes up valuable navigation space
- Most users only train once
- Retraining is rare (maybe 1-2 times per year)

**Better Approach:**
- **First-time users:** Guided onboarding flow
- **Retraining:** Move to Account → Settings section
- **Result:** Training tab removed, better UX

---

## 🎯 Implementation Plan

### Phase 1: Improve First-Time User Onboarding

#### Current Flow:
1. User signs up
2. Lands on Maya (default)
3. Sees training prompt banner (if no model)
4. Clicks "Train Your Model" → Goes to Training tab
5. Uploads selfies
6. Trains model
7. Returns to Maya

#### Proposed Flow:
1. User signs up
2. **Onboarding modal/wizard appears** (if no trained model)
3. **Step 1:** Welcome message
4. **Step 2:** Explain what training does
5. **Step 3:** Upload selfies (embedded in modal)
6. **Step 4:** Train model (embedded in modal)
7. **Step 5:** Success! "Start Creating" → Opens Maya
8. **No Training tab needed!**

#### Benefits:
- ✅ Guided experience for new users
- ✅ No confusion about where to start
- ✅ Training happens in context
- ✅ Removes need for Training tab

#### Implementation:
- Create `OnboardingWizard` component
- Show on app load if `!hasTrainedModel && isFirstTime`
- Embed training flow in wizard
- After training, dismiss wizard and show Maya

---

### Phase 2: Move Retrain to Account → Settings

#### Current Flow:
- User wants to retrain
- Goes to Training tab
- Uploads new selfies
- Retrains model

#### Proposed Flow:
- User wants to retrain
- Goes to Account → Settings section
- Finds "Retrain Model" option
- Opens retrain modal/flow
- Uploads new selfies
- Retrains model

#### Benefits:
- ✅ Retrain is a settings/preference action
- ✅ Doesn't need its own tab
- ✅ Logical place for infrequent actions
- ✅ Keeps navigation clean

#### Implementation:
- Add "Retrain Model" section to Account → Settings
- Create `RetrainModelModal` component
- Reuse training logic from TrainingScreen
- Show in Settings section (below Model Information)

---

## 📋 Detailed Implementation Steps

### Step 1: Create Onboarding Wizard Component

**File:** `components/sselfie/onboarding-wizard.tsx`

**Features:**
- Multi-step wizard (4-5 steps)
- Step 1: Welcome & explanation
- Step 2: Upload selfies (drag & drop)
- Step 3: Training progress
- Step 4: Success & next steps
- Can be dismissed (but shows again if no model)

**Props:**
```typescript
interface OnboardingWizardProps {
  isOpen: boolean
  onComplete: () => void
  onDismiss?: () => void
  hasTrainedModel: boolean
}
```

**Integration:**
- Show in `sselfie-app.tsx` if `!hasTrainedModel && isFirstTime`
- Overlay on top of Maya screen
- Can't be skipped until model is trained (or user explicitly dismisses)

---

### Step 2: Move Retrain to Account → Settings

**File:** `components/sselfie/account-screen.tsx`

**Changes:**
- Add "Retrain Model" section in Settings section
- Place after "Model Information" section
- Add button: "Retrain Your Model"
- Opens `RetrainModelModal`

**New Component:** `components/sselfie/retrain-model-modal.tsx`

**Features:**
- Similar to TrainingScreen but in modal format
- Upload new selfies
- Train model
- Show progress
- Close on completion

---

### Step 3: Remove Training Tab

**File:** `components/sselfie/sselfie-app.tsx`

**Changes:**
- Remove Training from tabs array
- Remove Training screen import
- Remove Training screen rendering
- Update validTabs arrays
- Update all navigation references

**Result:** 7 tabs → 6 tabs

---

### Step 4: Update Navigation References

**Files to Update:**
- `components/sselfie/maya-chat-screen.tsx` - Training prompt now opens onboarding
- `components/sselfie/gallery-screen.tsx` - Remove Training nav reference
- `components/sselfie/b-roll-screen.tsx` - Remove Training nav reference
- `components/sselfie/account-screen.tsx` - Add retrain option
- Any other files with Training references

---

## 🎨 UI/UX Design

### Onboarding Wizard Design

**Step 1: Welcome**
```
┌─────────────────────────────────┐
│  Welcome to SSELFIE! 🎉        │
│                                 │
│  Let's train your personal AI  │
│  model with your selfies.      │
│                                 │
│  This takes about 5 minutes.    │
│                                 │
│  [Get Started]                  │
└─────────────────────────────────┘
```

**Step 2: Upload Selfies**
```
┌─────────────────────────────────┐
│  Upload Your Selfies            │
│                                 │
│  Upload 10-20 selfies to train  │
│  your AI model.                 │
│                                 │
│  [Drag & Drop Area]             │
│                                 │
│  Progress: 5/15 uploaded        │
│                                 │
│  [Continue]                     │
└─────────────────────────────────┘
```

**Step 3: Training**
```
┌─────────────────────────────────┐
│  Training Your Model...         │
│                                 │
│  [Progress Bar]                 │
│                                 │
│  This may take a few minutes.   │
│  You can close this and come    │
│  back later.                    │
│                                 │
└─────────────────────────────────┘
```

**Step 4: Success**
```
┌─────────────────────────────────┐
│  Success! 🎉                     │
│                                 │
│  Your AI model is ready!        │
│                                 │
│  [Start Creating] → Opens Maya  │
└─────────────────────────────────┘
```

---

### Retrain in Account → Settings

**Location:** Account → Settings section

**Design:**
```
┌─────────────────────────────────┐
│  Model Training                 │
│                                 │
│  Your current model was trained │
│  on [date].                    │
│                                 │
│  Want to improve your results?  │
│  Retrain with new selfies.     │
│                                 │
│  [Retrain Model]                │
└─────────────────────────────────┘
```

**Modal Design:**
- Similar to onboarding Step 2-3
- Upload new selfies
- Train model
- Show progress
- Close on completion

---

## 📊 Expected Results

### Before:
- 7 tabs
- Training tab (one-time use)
- Training prompt in Maya (redirects to Training tab)

### After:
- 6 tabs (Training removed)
- Onboarding wizard for first-time users
- Retrain option in Account → Settings
- Better UX for new users

### Tab Structure (After):
1. Maya (default)
2. B-Roll
3. Gallery
4. Feed
5. Academy
6. Account

**Result:** 7 → 6 tabs (14% reduction)

---

## 🚀 Further Reduction Options (To Reach 4-5 Tabs)

### Option A: Remove Academy Tab
**Current:** Academy is separate tab  
**Proposed:** Embed Academy in Feed Planner  
**Reason:** Learning content is related to feed planning  
**Result:** 6 → 5 tabs ✅ (meets goal)

### Option B: Remove B-Roll Tab
**Current:** B-Roll is separate tab  
**Proposed:** Embed B-Roll in Gallery (video section)  
**Reason:** Videos are just another media type  
**Result:** 6 → 5 tabs ✅ (meets goal)

### Option C: Remove Both Academy + B-Roll
**Proposed:** 
- Academy → Feed Planner
- B-Roll → Gallery
**Result:** 6 → 4 tabs ✅ (meets goal)

---

## 🛡️ Safety & Testing

### Before Implementation:
- [ ] Backup current state
- [ ] Test current training flow
- [ ] Document current user journey

### During Implementation:
- [ ] Test onboarding wizard
- [ ] Test retrain in Account
- [ ] Test Training tab removal
- [ ] Test navigation updates

### After Implementation:
- [ ] Test first-time user flow
- [ ] Test retrain flow
- [ ] Test existing users (no onboarding)
- [ ] Test mobile experience
- [ ] Test edge cases (dismiss onboarding, etc.)

---

## 📝 Implementation Checklist

### Phase 1: Onboarding Wizard
- [ ] Create `OnboardingWizard` component
- [ ] Add welcome step
- [ ] Add upload step (reuse TrainingScreen logic)
- [ ] Add training step (reuse TrainingScreen logic)
- [ ] Add success step
- [ ] Integrate with `sselfie-app.tsx`
- [ ] Add `isFirstTime` state management
- [ ] Test onboarding flow

### Phase 2: Retrain in Account
- [ ] Add "Retrain Model" section to Account → Settings
- [ ] Create `RetrainModelModal` component
- [ ] Reuse training logic
- [ ] Test retrain flow
- [ ] Update Account screen UI

### Phase 3: Remove Training Tab
- [ ] Remove Training from tabs array
- [ ] Remove Training screen import
- [ ] Remove Training screen rendering
- [ ] Update validTabs arrays
- [ ] Update navigation references
- [ ] Test navigation

### Phase 4: Update References
- [ ] Update Maya training prompt (opens onboarding)
- [ ] Update all navigation menus
- [ ] Remove Training references
- [ ] Test all flows

---

## 🎯 Success Criteria

1. ✅ Training tab removed
2. ✅ First-time users get guided onboarding
3. ✅ Retrain available in Account → Settings
4. ✅ All training functionality preserved
5. ✅ Better UX for new users
6. ✅ Navigation reduced to 6 tabs
7. ✅ No broken functionality

---

## ⚠️ Considerations

### Edge Cases:
- **User dismisses onboarding:** Show again on next visit? Or allow skip?
- **Training fails:** Show error, allow retry
- **User has partial training:** Resume or restart?
- **Existing users:** Don't show onboarding, but can access retrain

### User Experience:
- **Onboarding should be:** Clear, helpful, not intrusive
- **Retrain should be:** Easy to find, but not prominent
- **Training flow:** Should work the same, just in different UI

---

## 📅 Timeline

**Phase 1 (Onboarding):** 2-3 days
- Day 1: Create OnboardingWizard component
- Day 2: Integrate with app, test
- Day 3: Polish, edge cases

**Phase 2 (Retrain):** 1-2 days
- Day 1: Add retrain to Account, create modal
- Day 2: Test, polish

**Phase 3 (Remove Tab):** 1 day
- Remove Training tab, update references

**Phase 4 (Testing):** 1 day
- Comprehensive testing

**Total:** ~5-7 days

---

## 🎉 Benefits

### For Users:
- ✅ Better first-time experience
- ✅ Clearer navigation (fewer tabs)
- ✅ Training happens in context
- ✅ Retrain is easy to find when needed

### For App:
- ✅ Cleaner navigation
- ✅ Better onboarding conversion
- ✅ Reduced cognitive load
- ✅ More professional feel

---

## 🤔 Questions to Consider

1. **Onboarding Dismissal:**
   - Can users skip onboarding?
   - If yes, how do they access training later?
   - Should we show a persistent prompt in Maya?

2. **Retrain Frequency:**
   - How often do users retrain?
   - Should retrain be more prominent?
   - Should we show "last trained" date?

3. **Training Progress:**
   - Can users close onboarding during training?
   - Should training continue in background?
   - How do we show training status?

---

## ✅ Recommendation

**Proceed with:**
1. ✅ Create onboarding wizard
2. ✅ Move retrain to Account → Settings
3. ✅ Remove Training tab
4. ⚠️ Consider further reduction (Academy/B-Roll) after testing

**This approach:**
- ✅ Removes Training tab (reaches 6 tabs)
- ✅ Improves first-time user experience
- ✅ Keeps retrain accessible
- ✅ Low risk (training logic stays the same)

**Ready to proceed?**


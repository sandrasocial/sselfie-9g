# Phase 4: Implementation Plan - Remove Studio & Simplify Navigation

## 🎯 Goal
Remove Studio screen and simplify navigation from 9 tabs to 4-5 tabs, making Maya the default home screen.

---

## 📋 Implementation Phases

### Phase 4A: Cleanup (Week 1, Days 1-2)
**Goal:** Remove unused screens and deprecated code to reduce bloat

#### Step 1: Identify & Remove Unused Screens
- [ ] Audit all screen components
- [ ] Identify unused screens (coming-soon, carousel-creator, content-calendar, story-sequence)
- [ ] Check if they're referenced anywhere
- [ ] Remove unused screen files
- [ ] Remove unused imports

#### Step 2: Remove Duplicate Files
- [ ] Remove `settings-screen-enhanced.tsx` (duplicate)
- [ ] Clean up backup files (`.backup-*` files)
- [ ] Remove unused components

#### Step 3: Remove Deprecated Code
- [ ] Remove deprecated functions from `lib/maya/photoshoot-session.ts`
- [ ] Remove deprecated functions from `lib/subscription.ts`
- [ ] Remove deprecated functions from `lib/data/academy.ts`
- [ ] Update any references to deprecated code

**Risk:** LOW - These are unused files  
**Testing:** Verify app still builds and runs

---

### Phase 4B: Prepare for Studio Removal (Week 1, Days 3-4)
**Goal:** Move Studio's functions to appropriate places BEFORE removing Studio

#### Step 1: Move Brand Profile to Account
- [ ] Create brand profile section in Account/Profile screen
- [ ] Move brand profile display logic
- [ ] Move brand profile wizard trigger
- [ ] Test brand profile functionality in Account
- [ ] Keep Studio working (for now)

#### Step 2: Add Training Prompt to Maya
- [ ] Add "no trained model" state check to Maya
- [ ] Create training prompt component for Maya
- [ ] Add "Train Your Model" CTA in Maya
- [ ] Test training flow from Maya
- [ ] Keep Studio working (for now)

#### Step 3: Move Stats to Gallery
- [ ] Add stats display to Gallery header
- [ ] Show generations count, favorites count
- [ ] Test stats display in Gallery
- [ ] Keep Studio working (for now)

**Risk:** MEDIUM - Moving functionality  
**Testing:** Test all moved features work in new locations

---

### Phase 4C: Remove Studio Tab (Week 1, Days 5-7)
**Goal:** Remove Studio screen and update all references

#### Step 1: Update Default Tab
- [ ] Change default tab from "studio" to "maya"
- [ ] Update `getInitialTab()` function
- [ ] Update hash routing
- [ ] Test default tab behavior

#### Step 2: Remove Studio from Navigation
- [ ] Remove Studio from tabs array
- [ ] Remove Studio icon import
- [ ] Update bottom navigation
- [ ] Test navigation

#### Step 3: Remove Studio Screen Component
- [ ] Remove Studio screen import
- [ ] Remove Studio screen rendering
- [ ] Remove Studio screen file
- [ ] Test app doesn't break

#### Step 4: Update All Navigation References
- [ ] Find all `setActiveTab("studio")` references
- [ ] Replace with `setActiveTab("maya")`
- [ ] Update Training screen redirect
- [ ] Update Settings screen redirect
- [ ] Update Gallery screen redirect
- [ ] Test all navigation flows

#### Step 5: Update Access Control
- [ ] Update access control checks (remove Studio references)
- [ ] Update upgrade banners (remove Studio references)
- [ ] Test access control

**Risk:** MEDIUM-HIGH - Removing core screen  
**Testing:** Comprehensive testing of all flows

---

### Phase 4D: Combine Profile + Settings (Week 2, Days 1-3)
**Goal:** Merge Profile and Settings into single Account tab

#### Step 1: Create Account Screen
- [ ] Create new Account screen component
- [ ] Add sections: Profile, Settings, Training (retrain)
- [ ] Move Profile content to Account
- [ ] Move Settings content to Account
- [ ] Add brand profile section (from Studio)

#### Step 2: Update Navigation
- [ ] Remove Profile tab
- [ ] Remove Settings tab
- [ ] Add Account tab
- [ ] Update all navigation references

#### Step 3: Test Account Screen
- [ ] Test Profile section
- [ ] Test Settings section
- [ ] Test Brand Profile section
- [ ] Test Training retrain option

**Risk:** MEDIUM - Combining screens  
**Testing:** Test all account-related functionality

---

### Phase 4E: Final Cleanup & Testing (Week 2, Days 4-5)
**Goal:** Final cleanup, testing, and documentation

#### Step 1: Code Cleanup
- [ ] Remove unused imports
- [ ] Remove unused variables
- [ ] Clean up console.logs
- [ ] Update comments

#### Step 2: Comprehensive Testing
- [ ] Test all user flows
- [ ] Test navigation
- [ ] Test feature access
- [ ] Test mobile experience
- [ ] Test edge cases

#### Step 3: Documentation
- [ ] Update README
- [ ] Update navigation documentation
- [ ] Document new structure
- [ ] Create migration guide

**Risk:** LOW - Final polish  
**Testing:** Full regression testing

---

## 🛡️ Safety Measures

### Before Each Phase:
1. ✅ Create backup branch
2. ✅ Run tests (if available)
3. ✅ Verify app builds
4. ✅ Check for TypeScript errors

### During Each Phase:
1. ✅ Make incremental changes
2. ✅ Test after each change
3. ✅ Commit working code frequently
4. ✅ Document what changed

### After Each Phase:
1. ✅ Test all user flows
2. ✅ Verify no broken features
3. ✅ Check mobile experience
4. ✅ Verify navigation works

---

## 📊 Expected Results

### Before:
- 9 tabs
- Studio screen (769 lines)
- Unused screens (bloat)
- Deprecated code
- Profile + Settings separate

### After:
- 4-5 tabs
- No Studio screen
- Clean codebase
- No deprecated code
- Account tab (Profile + Settings + Brand Profile)

---

## 🚨 Rollback Plan

If something breaks:

1. **Immediate:** Revert last commit
2. **If needed:** Restore from backup branch
3. **Document:** What broke and why
4. **Fix:** Address issue before continuing

---

## 📝 Detailed Step-by-Step: Phase 4A (Cleanup)

### Step 1.1: Identify Unused Screens

Files to check:
- `components/sselfie/coming-soon-screen.tsx`
- `components/sselfie/carousel-creator-screen.tsx`
- `components/sselfie/content-calendar-screen.tsx`
- `components/sselfie/story-sequence-screen.tsx`
- `components/sselfie/settings-screen-enhanced.tsx`

### Step 1.2: Verify They're Not Used

Search for imports:
```bash
grep -r "coming-soon\|carousel-creator\|content-calendar\|story-sequence\|settings-screen-enhanced" .
```

### Step 1.3: Remove Unused Files

Only remove if:
- Not imported anywhere
- Not referenced in navigation
- Not used in any route

### Step 1.4: Remove Deprecated Code

Files with deprecated code:
- `lib/maya/photoshoot-session.ts` - Marked deprecated
- `lib/subscription.ts` - Deprecated functions
- `lib/data/academy.ts` - Deprecated functions

---

## 📝 Detailed Step-by-Step: Phase 4B (Prepare)

### Step 2.1: Move Brand Profile to Account

1. Read `components/sselfie/studio-screen.tsx` - brand profile section
2. Read `components/sselfie/profile-screen.tsx` - current profile
3. Add brand profile section to Profile screen
4. Test brand profile works in Profile
5. Keep Studio working (don't remove yet)

### Step 2.2: Add Training Prompt to Maya

1. Read `components/sselfie/maya-chat-screen.tsx`
2. Check if `hasTrainedModel` prop is available
3. Add training prompt at top of Maya (if no model)
4. Add "Train Your Model" button
5. Test training flow from Maya

### Step 2.3: Move Stats to Gallery

1. Read `components/sselfie/gallery-screen.tsx`
2. Add stats display to header
3. Fetch stats data
4. Display generations count, favorites count
5. Test stats display

---

## 📝 Detailed Step-by-Step: Phase 4C (Remove Studio)

### Step 3.1: Update Default Tab

File: `components/sselfie/sselfie-app.tsx`

Change:
```typescript
// Before
return validTabs.includes(hash) ? hash : "studio"

// After
return validTabs.includes(hash) ? hash : "maya"
```

### Step 3.2: Remove Studio from Tabs Array

File: `components/sselfie/sselfie-app.tsx`

Remove:
```typescript
{ id: "studio", label: "Studio", icon: Camera },
```

### Step 3.3: Remove Studio Screen Rendering

File: `components/sselfie/sselfie-app.tsx`

Remove:
```typescript
{activeTab === "studio" && (
  <StudioScreen ... />
)}
```

### Step 3.4: Update Navigation References

Search and replace:
- `setActiveTab("studio")` → `setActiveTab("maya")`
- `navigateToTab("studio")` → `navigateToTab("maya")`
- `handleNavigation("studio")` → `handleNavigation("maya")`

Files to check:
- `components/sselfie/training-screen.tsx`
- `components/sselfie/settings-screen.tsx`
- `components/sselfie/gallery-screen.tsx`
- Any other files with Studio references

---

## 🧪 Testing Checklist

### After Phase 4A (Cleanup):
- [ ] App builds successfully
- [ ] No TypeScript errors
- [ ] App runs without errors
- [ ] No broken imports

### After Phase 4B (Prepare):
- [ ] Brand profile works in Account
- [ ] Training prompt shows in Maya (if no model)
- [ ] Stats display in Gallery
- [ ] Studio still works (for now)

### After Phase 4C (Remove Studio):
- [ ] Default tab is Maya
- [ ] No Studio tab in navigation
- [ ] All navigation redirects work
- [ ] Training flow works
- [ ] Settings flow works
- [ ] Gallery flow works

### After Phase 4D (Combine Profile+Settings):
- [ ] Account tab shows Profile section
- [ ] Account tab shows Settings section
- [ ] Account tab shows Brand Profile section
- [ ] All account features work

### After Phase 4E (Final):
- [ ] All user flows work
- [ ] Navigation is clean
- [ ] No unused code
- [ ] Mobile experience is good

---

## 📅 Timeline

**Week 1:**
- Days 1-2: Phase 4A (Cleanup)
- Days 3-4: Phase 4B (Prepare)
- Days 5-7: Phase 4C (Remove Studio)

**Week 2:**
- Days 1-3: Phase 4D (Combine Profile+Settings)
- Days 4-5: Phase 4E (Final Cleanup & Testing)

**Total:** ~10 days

---

## ✅ Success Criteria

1. ✅ Studio screen removed
2. ✅ Maya is default home screen
3. ✅ Navigation reduced to 4-5 tabs
4. ✅ All features still work
5. ✅ No broken functionality
6. ✅ Clean codebase (no unused files)
7. ✅ Better user experience

---

**Ready to start with Phase 4A (Cleanup)?**


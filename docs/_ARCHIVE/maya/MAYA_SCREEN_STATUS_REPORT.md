# Maya Screen Simplification Plan - Status Report

**Date**: Current Review  
**Current File Size**: 4,112 lines (down from 4,959, but still very large)

---

## ✅ COMPLETED WORK

### Phase 1.1: Component Extraction ✅ **DONE**
All major components have been extracted:
- ✅ `maya-chat-interface.tsx` - Chat messages and input
- ✅ `maya-settings-panel.tsx` - Settings modal panel
- ✅ `maya-quick-prompts.tsx` - Prompt suggestions
- ✅ `maya-concept-cards.tsx` - Concept card display
- ✅ `maya-header.tsx` - Unified header component
- ✅ `maya-mode-toggle.tsx` - Mode switcher component

**Status**: Complete - All components exist in `components/sselfie/maya/`

### Phase 1.2: Custom Hooks ⚠️ **PARTIALLY DONE**
Hooks have been created but appear to be placeholders:
- ✅ `hooks/use-maya-chat.ts` - Exists but contains placeholder code
- ✅ `hooks/use-maya-images.ts` - Exists (need to verify implementation)
- ✅ `hooks/use-maya-settings.ts` - Exists (need to verify implementation)
- ❌ `hooks/use-maya-mode.ts` - **NOT CREATED YET**

**Status**: Files exist but logic hasn't been extracted from main component yet

### Phase 3.1: Settings Simplification ⚠️ **PARTIALLY DONE**
- ✅ Settings panel is collapsed by default (`showSettings` defaults to `false`)
- ✅ Settings panel is a modal (not taking up permanent space)
- ❌ Settings not grouped (still need to verify)
- ❌ Tooltips not added yet
- ❌ Advanced settings not hidden

**Status**: Basic collapse is done, but grouping and tooltips still needed

---

## ❌ NOT COMPLETED

### Phase 1.3: Simplify Mode System ❌ **NOT DONE**
**Current State**: Still has dual Classic/Pro Mode system
- Classic Mode and Pro Mode have different UIs
- Mode switching changes entire interface
- Complex conditional rendering throughout

**What Needs to Be Done**:
1. Merge Classic and Pro UI into unified interface
2. Make Pro features optional (progressive enhancement)
3. Simplify mode toggle to on/off instead of separate modes
4. Default to Classic, unlock Pro features when enabled

**Estimated Time**: 3-4 days

---

### Phase 2.1: Create Tab Structure ❌ **NOT DONE**
**Current State**: No tab switcher exists in Maya screen

**What Needs to Be Done**:
1. Add tab state: `const [activeTab, setActiveTab] = useState<"photos" | "videos">("photos")`
2. Create `maya-tab-switcher.tsx` component
3. Update Maya header to include tabs
4. Conditionally render Photos vs Videos content

**Files to Create**:
- `components/sselfie/maya/maya-tab-switcher.tsx`

**Estimated Time**: 1 day

---

### Phase 2.2: Integrate B-Roll Component ❌ **NOT DONE**
**Current State**: B-Roll is still a separate screen (`b-roll-screen.tsx`, 749 lines)

**What Needs to Be Done**:
1. Extract B-Roll logic into reusable component
2. Remove redundant navigation menu from B-Roll
3. Integrate B-Roll into Maya as Videos tab
4. Share image data between tabs (Maya photos → B-Roll videos)

**Files to Modify**:
- `components/sselfie/maya-chat-screen.tsx`
- `components/sselfie/b-roll-screen.tsx`

**Files to Create**:
- `components/sselfie/maya/videos-tab.tsx` (wrapper for B-Roll)

**Estimated Time**: 2 days

---

### Phase 2.3: Share Context Between Tabs ❌ **NOT DONE**
**What Needs to Be Done**:
1. Create shared context for Maya images
2. Update B-Roll to use shared images
3. Add "Generate Video" button in Photos tab (quick action)
4. Sync favorites between tabs

**Files to Create**:
- `components/sselfie/maya/maya-context.tsx` (shared state)

**Estimated Time**: 1-2 days

---

### Phase 3.2: Simplify Navigation ❌ **NOT DONE**
**Current State**: `showNavMenu` state still exists in Maya (4 references found)

**What Needs to Be Done**:
1. Remove `showNavMenu` state from Maya
2. Remove side navigation menu rendering
3. Update header to use global navigation only
4. Keep only essential actions in header

**Files to Modify**:
- `components/sselfie/maya-chat-screen.tsx`

**Estimated Time**: 1 day

---

### Phase 3.3: Simplify Mode Toggle ❌ **NOT DONE**
**What Needs to Be Done**:
1. Merge Classic and Pro UI (same interface)
2. Add "Enable Pro Features" toggle (not separate modes)
3. Show Pro features when enabled
4. Update onboarding to explain Pro Mode

**Estimated Time**: 2-3 days

---

### Phase 4.1: Remove B-Roll from Main Navigation ❌ **NOT DONE**
**Current State**: B-Roll is still in main tabs array:
```typescript
const tabs = [
  { id: "maya", label: "Maya", icon: MessageCircle },
  { id: "b-roll", label: "B-Roll", icon: Film }, // ❌ Still here
  { id: "gallery", label: "Gallery", icon: ImageIcon },
  // ...
]
```

**What Needs to Be Done**:
1. Remove `{ id: "b-roll", ... }` from tabs array
2. Remove `{activeTab === "b-roll" && <BRollScreen ... />}` from render
3. Update routing logic (remove from validTabs)
4. Test navigation

**Files to Modify**:
- `components/sselfie/sselfie-app.tsx`

**Estimated Time**: 1 day

---

### Phase 4.2: Update All References ❌ **NOT DONE**
**Current State**: B-Roll navigation references exist in:
- `components/sselfie/profile-screen.tsx` (line 288)
- `components/sselfie/academy-screen.tsx` (line 793)
- `components/sselfie/settings-screen.tsx` (may have references)

**What Needs to Be Done**:
1. Search for all "b-roll" references
2. Update navigation calls to point to `maya` tab (videos will be sub-tab)
3. Update documentation
4. Test all flows

**Estimated Time**: 1 day

---

## 📊 SUMMARY

### Completed: ~25%
- ✅ Phase 1.1 (Component Extraction): 100% complete
- ⚠️ Phase 1.2 (Custom Hooks): 50% complete (files exist, logic not extracted)
- ❌ Phase 1.3 (Mode System): 0% complete
- ❌ Phase 2 (B-Roll Integration): 0% complete
- ⚠️ Phase 3.1 (Settings): 40% complete (collapsed by default, but not grouped)
- ❌ Phase 3.2 (Navigation): 0% complete
- ❌ Phase 3.3 (Mode Toggle): 0% complete
- ❌ Phase 4 (Cleanup): 0% complete

### File Size Reduction
- **Original**: 4,959 lines
- **Current**: 4,112 lines
- **Reduction**: ~17% (847 lines)
- **Target**: ~2,500 lines
- **Still Need**: ~1,612 lines reduction (39% more)

---

## 🎯 RECOMMENDED NEXT STEPS

### Priority 1: Complete Phase 1.2 (Extract Hook Logic)
Before moving forward, extract the actual logic into the custom hooks:
1. Implement `use-maya-chat.ts` with chat state management
2. Implement `use-maya-settings.ts` with settings state
3. Implement `use-maya-images.ts` with image library state
4. Create `use-maya-mode.ts` for mode management
5. Update main component to use these hooks

**Estimated Time**: 2-3 days  
**Impact**: Will significantly reduce main component size

### Priority 2: Implement Tab Structure (Phase 2.1)
This enables the B-Roll integration:
1. Create tab switcher component
2. Add tab state to Maya
3. Update header to show tabs
4. Conditionally render content

**Estimated Time**: 1 day  
**Impact**: Foundation for B-Roll integration

### Priority 3: Integrate B-Roll (Phase 2.2 & 2.3)
Merge B-Roll into Maya as Videos tab:
1. Extract B-Roll logic
2. Create Videos tab component
3. Create shared context for images
4. Test integration

**Estimated Time**: 3-4 days  
**Impact**: Unifies creation experience, reduces tabs from 6 to 5

---

## ⚠️ RISKS & CONSIDERATIONS

1. **Large Refactor**: The main component is still 4,112 lines - need to continue extraction
2. **Breaking Changes**: Mode system simplification will affect existing users
3. **B-Roll Integration**: Need to ensure image sharing works correctly
4. **Navigation Updates**: Multiple files reference B-Roll - need thorough testing

---

## 📝 NOTES

- The component extraction (Phase 1.1) was done well - all components exist
- The hooks (Phase 1.2) need actual implementation, not just placeholder code
- Settings panel collapse is working (good progress on Phase 3.1)
- The dual mode system is still the biggest complexity issue
- B-Roll integration is blocked until tab structure is in place

---

**Ready to proceed with next phase?** 🚀


# Maya Screen Audit & Simplification Plan

## 📊 Current State Analysis

### File Size & Complexity
- **Maya Chat Screen**: 4,959 lines (extremely complex)
- **B-Roll Screen**: 749 lines (manageable)
- **Total**: 5,708 lines of code

### Current Maya Features (Identified)

#### 1. **Dual Mode System**
- **Classic Mode**: Simple chat interface
- **Pro Mode**: Advanced with image library, intent management, concept cards
- Mode switching adds complexity

#### 2. **State Management (30+ useState hooks)**
- Chat state (messages, chatId, chatTitle)
- UI state (modals, menus, history)
- Settings state (styleStrength, promptAccuracy, aspectRatio, realismStrength)
- Image state (uploadedImages, imageLibrary, gallery)
- Mode state (studioProMode, consistencyMode)
- Loading states (isLoadingChat, isUploadingImage, isGeneratingConcepts)
- And many more...

#### 3. **UI Components**
- Header (different for Classic vs Pro)
- Chat history sidebar
- Navigation menu
- Settings panel
- Concept cards
- Prompt suggestions
- Image upload flow
- Gallery selector modal
- Buy credits modal
- Training prompt banner
- Quick prompts section
- And more...

#### 4. **Functionality**
- Chat with Maya AI
- Image generation
- Concept card generation
- Prompt suggestions
- Image library management (Pro Mode)
- Chat history management
- Settings management
- Credit management
- Mode switching
- Navigation to other screens

### Current B-Roll Features
- Image grid display (infinite scroll)
- Video generation from images
- Video status polling
- Video preview modal
- Favorites management
- Navigation menu (redundant with global nav)

---

## 🎯 Problems Identified

### 1. **Complexity Issues**
- **Too many responsibilities**: Maya handles chat, image generation, settings, navigation, history, etc.
- **Dual mode complexity**: Classic vs Pro Mode adds conditional rendering everywhere
- **State management**: 30+ useState hooks make it hard to track state
- **Large file size**: 4,959 lines is difficult to maintain and understand

### 2. **UX Issues**
- **Too many options**: Settings, modes, menus, modals create cognitive overload
- **Inconsistent navigation**: Some screens have side menus, some don't
- **Mode confusion**: Users may not understand Classic vs Pro Mode
- **Scattered features**: B-Roll is separate but related to Maya

### 3. **Code Quality Issues**
- **Hard to test**: Large component with many dependencies
- **Hard to maintain**: Changes in one area affect others
- **Hard to debug**: Complex state interactions
- **Hard to extend**: Adding features makes it even more complex

---

## 💡 Proposed Solution: Unified Creation Experience

### Core Concept
**Merge Maya and B-Roll into a single "Create" experience with tabs:**

```
┌─────────────────────────────────────────┐
│  CREATE (Maya Tab)                      │
├─────────────────────────────────────────┤
│  Tabs: [Photos] [Videos]                │
│                                         │
│  PHOTOS Tab → Current Maya chat         │
│  VIDEOS Tab → Current B-Roll screen      │
│                                         │
│  Benefits:                               │
│  ✅ Unified creation experience         │
│  ✅ Easy to switch between photos/videos│
│  ✅ Shared context (images → videos)    │
│  ✅ Reduces navigation complexity       │
│  ✅ Simpler mental model                │
└─────────────────────────────────────────┘
```

---

## 🎨 Proposed UI Structure

### Tab 1: Photos (Maya Chat)
- Simplified chat interface
- Image generation
- Concept cards
- Quick prompts
- Settings (collapsed by default)

### Tab 2: Videos (B-Roll)
- Image grid (from Maya-generated photos)
- Video generation
- Video preview
- Favorites

### Shared Elements
- Header (with tab switcher)
- Credits display
- Navigation menu (if needed)

---

## 📋 Implementation Plan

### Phase 1: Simplify Maya Screen (Foundation)

#### Step 1.1: Extract Components
**Goal**: Break down Maya into smaller, manageable components

**Actions**:
1. Create `MayaChatInterface` component (chat messages, input)
2. Create `MayaSettingsPanel` component (settings, collapsed by default)
3. Create `MayaQuickPrompts` component (prompt suggestions)
4. Create `MayaConceptCards` component (concept card display)
5. Create `MayaHeader` component (unified header for both modes)
6. Create `MayaModeToggle` component (simplified mode switcher)

**Benefits**:
- Easier to test individual components
- Easier to maintain
- Clearer code structure

**Files to Create**:
- `components/sselfie/maya/maya-chat-interface.tsx`
- `components/sselfie/maya/maya-settings-panel.tsx`
- `components/sselfie/maya/maya-quick-prompts.tsx`
- `components/sselfie/maya/maya-concept-cards.tsx`
- `components/sselfie/maya/maya-header.tsx`
- `components/sselfie/maya/maya-mode-toggle.tsx`

**Estimated Time**: 2-3 days

---

#### Step 1.2: Simplify State Management
**Goal**: Reduce state complexity and improve organization

**Actions**:
1. Create `useMayaChat` hook (chat state, messages, loading)
2. Create `useMayaSettings` hook (settings state, persistence)
3. Create `useMayaImages` hook (image library, uploads)
4. Create `useMayaMode` hook (mode switching, persistence)

**Benefits**:
- Centralized state logic
- Easier to test
- Reusable hooks

**Files to Create**:
- `components/sselfie/maya/hooks/use-maya-chat.ts`
- `components/sselfie/maya/hooks/use-maya-settings.ts`
- `components/sselfie/maya/hooks/use-maya-images.ts`
- `components/sselfie/maya/hooks/use-maya-mode.ts`

**Estimated Time**: 2-3 days

---

#### Step 1.3: Simplify Mode System
**Goal**: Make Classic vs Pro Mode clearer and easier to use

**Current Issues**:
- Mode switching is confusing
- Pro Mode has many features that could be in Classic
- Settings differ between modes

**Proposed Solution**:
- **Unified Interface**: Same UI for both modes
- **Progressive Enhancement**: Pro features unlock when needed
- **Simplified Toggle**: Single button to enable/disable Pro features

**Actions**:
1. Merge Classic and Pro UI (same layout)
2. Make Pro features optional (image library, intent, etc.)
3. Simplify mode toggle (on/off, not separate modes)
4. Default to Classic, upgrade to Pro when needed

**Estimated Time**: 3-4 days

---

### Phase 2: Integrate B-Roll as Tab

#### Step 2.1: Create Tab Structure
**Goal**: Add tab switcher to Maya screen

**Actions**:
1. Add tab state to Maya: `const [activeTab, setActiveTab] = useState<"photos" | "videos">("photos")`
2. Create tab switcher component
3. Update Maya header to include tabs
4. Conditionally render Photos vs Videos content

**UI Design**:
```
┌─────────────────────────────────────────┐
│  [Maya Avatar]  CREATE  [Credits] [Menu]│
│  ┌───────────┬───────────┐              │
│  │  Photos   │  Videos   │              │
│  └───────────┴───────────┘              │
└─────────────────────────────────────────┘
```

**Files to Modify**:
- `components/sselfie/maya-chat-screen.tsx`

**Files to Create**:
- `components/sselfie/maya/maya-tab-switcher.tsx`

**Estimated Time**: 1 day

---

#### Step 2.2: Integrate B-Roll Component
**Goal**: Embed B-Roll screen as Videos tab

**Actions**:
1. Extract B-Roll logic into reusable component
2. Remove redundant navigation menu from B-Roll
3. Integrate B-Roll into Maya as Videos tab
4. Share image data between tabs (Maya photos → B-Roll videos)

**Files to Modify**:
- `components/sselfie/maya-chat-screen.tsx`
- `components/sselfie/b-roll-screen.tsx` (extract logic)

**Files to Create**:
- `components/sselfie/maya/videos-tab.tsx` (wrapper for B-Roll)

**Estimated Time**: 2 days

---

#### Step 2.3: Share Context Between Tabs
**Goal**: Make images from Photos tab available in Videos tab

**Actions**:
1. Create shared context for Maya images
2. Update B-Roll to use shared images
3. Add "Generate Video" button in Photos tab (quick action)
4. Sync favorites between tabs

**Files to Create**:
- `components/sselfie/maya/maya-context.tsx` (shared state)

**Estimated Time**: 1-2 days

---

### Phase 3: Simplify UX/UI

#### Step 3.1: Simplify Settings
**Goal**: Make settings less overwhelming

**Current Issues**:
- Too many settings visible at once
- Settings panel takes up space
- Settings differ between modes

**Proposed Solution**:
- **Collapsed by default**: Settings hidden until needed
- **Grouped settings**: Related settings together
- **Smart defaults**: Good defaults, minimal configuration needed
- **Progressive disclosure**: Advanced settings hidden

**Actions**:
1. Collapse settings panel by default
2. Group settings (Generation, Quality, Advanced)
3. Add tooltips for each setting
4. Simplify mode-specific settings

**Estimated Time**: 1-2 days

---

#### Step 3.2: Simplify Navigation
**Goal**: Remove redundant navigation

**Current Issues**:
- Maya has side navigation menu
- B-Roll has side navigation menu
- Global navigation exists in main app

**Proposed Solution**:
- **Remove side menus**: Use global navigation only
- **Keep header menu**: For quick actions (credits, settings)
- **Simplify header**: Less clutter, more focus

**Actions**:
1. Remove `showNavMenu` from Maya
2. Remove `showNavMenu` from B-Roll
3. Update header to use global navigation
4. Keep only essential actions in header

**Estimated Time**: 1 day

---

#### Step 3.3: Simplify Mode Toggle
**Goal**: Make mode switching clearer

**Current Issues**:
- "Classic" vs "Pro Mode" is confusing
- Mode switching changes entire UI
- Users may not understand difference

**Proposed Solution**:
- **Unified UI**: Same interface, Pro features unlock
- **Simple toggle**: "Enable Pro Features" button
- **Clear benefits**: Show what Pro Mode adds
- **Progressive enhancement**: Features appear when enabled

**Actions**:
1. Merge Classic and Pro UI
2. Add "Enable Pro Features" toggle
3. Show Pro features when enabled
4. Update onboarding to explain Pro Mode

**Estimated Time**: 2-3 days

---

### Phase 4: Remove B-Roll Tab from Main Navigation

#### Step 4.1: Update Main Navigation
**Goal**: Remove B-Roll as separate tab

**Actions**:
1. Remove B-Roll from `sselfie-app.tsx` tabs array
2. Update navigation references
3. Update routing logic
4. Test navigation

**Files to Modify**:
- `components/sselfie/sselfie-app.tsx`

**Estimated Time**: 1 day

---

#### Step 4.2: Update All References
**Goal**: Ensure all B-Roll references point to Maya Videos tab

**Actions**:
1. Search for all "b-roll" references
2. Update navigation calls
3. Update documentation
4. Test all flows

**Estimated Time**: 1 day

---

## 📊 Expected Results

### Before:
- **7 tabs** (Training removed, but still 6)
- **Maya**: 4,959 lines, complex
- **B-Roll**: Separate screen, 749 lines
- **Total**: 5,708 lines, 2 separate screens

### After:
- **5 tabs** (Maya + B-Roll merged)
- **Maya**: ~2,000 lines (simplified, componentized)
- **B-Roll**: Embedded as tab (~500 lines)
- **Total**: ~2,500 lines, unified experience

### Benefits:
- ✅ **Reduced complexity**: Smaller files, clearer structure
- ✅ **Better UX**: Unified creation experience
- ✅ **Easier maintenance**: Componentized, testable
- ✅ **Fewer tabs**: 6 → 5 tabs
- ✅ **Better flow**: Photos → Videos in one place

---

## 🚀 Implementation Timeline

### Week 1: Foundation (Phase 1)
- **Day 1-2**: Extract Maya components
- **Day 3-4**: Create custom hooks
- **Day 5**: Simplify mode system

### Week 2: Integration (Phase 2)
- **Day 1**: Create tab structure
- **Day 2-3**: Integrate B-Roll
- **Day 4-5**: Share context between tabs

### Week 3: Simplification (Phase 3)
- **Day 1-2**: Simplify settings
- **Day 3**: Simplify navigation
- **Day 4-5**: Simplify mode toggle

### Week 4: Cleanup (Phase 4)
- **Day 1**: Remove B-Roll from main nav
- **Day 2**: Update all references
- **Day 3-5**: Testing and polish

**Total**: ~4 weeks

---

## ⚠️ Risks & Considerations

### Risks:
1. **Breaking changes**: Large refactor may break existing functionality
2. **User confusion**: Changing familiar interface
3. **Time overrun**: Complex refactor may take longer
4. **Testing complexity**: Many components to test

### Mitigation:
1. **Incremental changes**: One phase at a time
2. **Feature flags**: Toggle new UI for testing
3. **Thorough testing**: Test each phase before moving on
4. **User feedback**: Get feedback early and often

---

## ✅ Success Criteria

1. ✅ Maya screen reduced to <2,500 lines
2. ✅ B-Roll integrated as Videos tab
3. ✅ Settings simplified and collapsed
4. ✅ Navigation simplified
5. ✅ Mode system clearer
6. ✅ All tests passing
7. ✅ No broken functionality
8. ✅ Better user experience

---

## 🎯 Recommendation

**Proceed with implementation in phases:**

1. **Start with Phase 1** (Component extraction) - Low risk, high value
2. **Then Phase 2** (B-Roll integration) - Medium risk, high value
3. **Then Phase 3** (UX simplification) - Low risk, high value
4. **Finally Phase 4** (Cleanup) - Low risk, necessary

**This approach**:
- ✅ Reduces risk (incremental changes)
- ✅ Delivers value early (each phase improves UX)
- ✅ Allows for course correction (feedback between phases)
- ✅ Maintains stability (test after each phase)

---

## 📝 Next Steps

1. **Review this plan** with team/stakeholders
2. **Prioritize phases** based on business needs
3. **Create detailed tickets** for each phase
4. **Start with Phase 1** (component extraction)
5. **Test thoroughly** after each phase

---

**Ready to proceed?** 🚀


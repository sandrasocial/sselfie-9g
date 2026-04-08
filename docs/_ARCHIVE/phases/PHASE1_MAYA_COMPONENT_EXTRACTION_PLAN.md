# Phase 1: Maya Component Extraction - Safe Implementation Plan

## 🎯 Goal
Extract Maya screen into smaller, manageable components **WITHOUT breaking any functionality**.

## ⚠️ Critical Safety Requirements

### Must Preserve:
1. ✅ **Image Generation**: All image generation must work exactly as before
2. ✅ **Concept Cards**: Concept card generation and display must work
3. ✅ **Chat Functionality**: Chat with Maya must work identically
4. ✅ **Pro Mode**: Pro Mode features must continue working
5. ✅ **Classic Mode**: Classic Mode must continue working
6. ✅ **Settings**: All settings must persist and work
7. ✅ **Chat History**: Chat history loading and saving must work
8. ✅ **Credit System**: Credit checks and deductions must work

### Safety Measures:
- **Incremental extraction**: One component at a time
- **Test after each step**: Verify functionality before proceeding
- **Feature parity**: New components must match existing behavior exactly
- **Rollback plan**: Each step can be reverted independently
- **No behavior changes**: Only structural changes, no logic changes

---

## 📋 Implementation Steps

### Step 1: Create Component Structure (No Changes Yet)

**Goal**: Set up folder structure and placeholder components

**Actions**:
1. Create `components/sselfie/maya/` directory
2. Create placeholder component files (empty for now)
3. Verify build still works

**Files to Create**:
```
components/sselfie/maya/
├── maya-chat-interface.tsx (placeholder)
├── maya-settings-panel.tsx (placeholder)
├── maya-quick-prompts.tsx (placeholder)
├── maya-concept-cards.tsx (placeholder)
├── maya-header.tsx (placeholder)
├── maya-mode-toggle.tsx (placeholder)
└── hooks/
    ├── use-maya-chat.ts (placeholder)
    ├── use-maya-settings.ts (placeholder)
    └── use-maya-images.ts (placeholder)
```

**Testing**:
- ✅ Build succeeds
- ✅ No runtime errors
- ✅ Maya screen still works (unchanged)

**Estimated Time**: 30 minutes

---

### Step 2: Extract Maya Header (Low Risk)

**Goal**: Extract header component without changing behavior

**Why First**: Header is mostly UI, minimal logic, easy to test

**Actions**:
1. Identify header JSX in `maya-chat-screen.tsx`
2. Extract to `maya-header.tsx`
3. Pass all necessary props
4. Replace in main component
5. Test thoroughly

**What to Extract**:
- Classic Mode header (lines ~3038-3069)
- Pro Mode header (lines ~3005-3036)
- All props needed (chatTitle, creditBalance, etc.)

**Props Interface**:
```typescript
interface MayaHeaderProps {
  chatTitle: string
  creditBalance: number
  studioProMode: boolean
  showNavMenu: boolean
  onToggleNavMenu: () => void
  onModeSwitch: (enable: boolean) => void
  // ... all other header-related props
}
```

**Testing Checklist**:
- ✅ Header displays correctly in Classic Mode
- ✅ Header displays correctly in Pro Mode
- ✅ Mode toggle button works
- ✅ Navigation menu button works
- ✅ Credits display correctly
- ✅ Chat title displays correctly
- ✅ All header actions work

**Rollback Plan**: Revert header extraction, restore original JSX

**Estimated Time**: 2-3 hours

---

### Step 3: Extract Concept Cards Component (Medium Risk - Critical)

**Goal**: Extract concept cards without breaking generation or display

**Why Critical**: Concept cards are core functionality - must be perfect

**Actions**:
1. Identify concept card rendering logic
2. Identify concept card generation logic
3. Extract to `maya-concept-cards.tsx`
4. Preserve all state and effects
5. Test concept card generation thoroughly

**What to Extract**:
- Concept card rendering
- Concept card generation triggers
- Concept card state management
- All concept card interactions

**Props Interface**:
```typescript
interface MayaConceptCardsProps {
  messages: any[]
  onGenerateConcept: (prompt: string) => void
  onSelectConcept: (concept: any) => void
  // ... all concept-related props
}
```

**Testing Checklist**:
- ✅ Concept cards generate when Maya suggests them
- ✅ Concept cards display correctly
- ✅ Clicking concept cards selects them
- ✅ Concept cards show correct images
- ✅ Concept cards work in Classic Mode
- ✅ Concept cards work in Pro Mode
- ✅ Concept card generation doesn't break
- ✅ Multiple concept cards work
- ✅ Concept card state persists

**Rollback Plan**: Revert concept card extraction, restore original logic

**Estimated Time**: 4-6 hours (most critical, needs thorough testing)

---

### Step 4: Extract Quick Prompts Component (Low Risk)

**Goal**: Extract prompt suggestions without changing behavior

**Why Safe**: Mostly UI, minimal logic

**Actions**:
1. Identify quick prompts section
2. Extract to `maya-quick-prompts.tsx`
3. Preserve prompt generation logic
4. Test prompt suggestions

**What to Extract**:
- Quick prompts display
- Prompt suggestion generation
- Prompt selection handling

**Props Interface**:
```typescript
interface MayaQuickPromptsProps {
  currentPrompts: Array<{ label: string; prompt: string }>
  onSelectPrompt: (prompt: string) => void
  isGeneratingSuggestions: boolean
  // ... prompt-related props
}
```

**Testing Checklist**:
- ✅ Quick prompts display correctly
- ✅ Prompt suggestions generate
- ✅ Clicking prompts inserts them
- ✅ Prompts work in both modes
- ✅ Prompt generation doesn't break

**Rollback Plan**: Revert quick prompts extraction

**Estimated Time**: 2-3 hours

---

### Step 5: Extract Settings Panel (Low Risk)

**Goal**: Extract settings without changing behavior or persistence

**Why Safe**: Settings are mostly UI, logic is straightforward

**Actions**:
1. Identify settings panel JSX
2. Extract to `maya-settings-panel.tsx`
3. Preserve all settings state
4. Preserve localStorage persistence
5. Test all settings

**What to Extract**:
- Settings panel UI
- Settings controls (sliders, toggles)
- Settings persistence logic
- Settings state management

**Props Interface**:
```typescript
interface MayaSettingsPanelProps {
  styleStrength: number
  promptAccuracy: number
  aspectRatio: string
  realismStrength: number
  enhancedAuthenticity: boolean
  onStyleStrengthChange: (value: number) => void
  onPromptAccuracyChange: (value: number) => void
  onAspectRatioChange: (value: string) => void
  onRealismStrengthChange: (value: number) => void
  onEnhancedAuthenticityChange: (value: boolean) => void
  showSettings: boolean
  onClose: () => void
}
```

**Testing Checklist**:
- ✅ Settings panel opens/closes
- ✅ All settings controls work
- ✅ Settings persist to localStorage
- ✅ Settings load on mount
- ✅ Settings affect image generation
- ✅ Settings work in both modes

**Rollback Plan**: Revert settings extraction

**Estimated Time**: 3-4 hours

---

### Step 6: Extract Chat Interface (Medium Risk)

**Goal**: Extract chat messages and input without breaking chat

**Why Medium Risk**: Core chat functionality - must be perfect

**Actions**:
1. Identify chat messages rendering
2. Identify chat input component
3. Extract to `maya-chat-interface.tsx`
4. Preserve all chat logic
5. Test chat thoroughly

**What to Extract**:
- Message list rendering
- Chat input component
- Message sending logic
- Message state management
- Scroll behavior

**Props Interface**:
```typescript
interface MayaChatInterfaceProps {
  messages: any[]
  inputValue: string
  onInputChange: (value: string) => void
  onSendMessage: (message: string, options?: any) => void
  isLoading: boolean
  // ... all chat-related props
}
```

**Testing Checklist**:
- ✅ Messages display correctly
- ✅ Sending messages works
- ✅ Message history loads
- ✅ Scroll behavior works
- ✅ Input works correctly
- ✅ Image upload in chat works
- ✅ Chat works in Classic Mode
- ✅ Chat works in Pro Mode
- ✅ Message persistence works

**Rollback Plan**: Revert chat interface extraction

**Estimated Time**: 4-5 hours

---

### Step 7: Extract Custom Hooks (Low Risk - After Components)

**Goal**: Extract state logic into reusable hooks

**Why After Components**: Hooks are internal, less risky than UI changes

**Actions**:
1. Extract chat state to `use-maya-chat.ts`
2. Extract settings state to `use-maya-settings.ts`
3. Extract image state to `use-maya-images.ts`
4. Update components to use hooks
5. Test all functionality

**What to Extract**:
- Chat state management
- Settings state management
- Image library state management
- All related effects and callbacks

**Hook Interfaces**:
```typescript
// use-maya-chat.ts
export function useMayaChat() {
  return {
    messages,
    sendMessage,
    isLoading,
    chatId,
    chatTitle,
    // ... all chat state and functions
  }
}

// use-maya-settings.ts
export function useMayaSettings() {
  return {
    styleStrength,
    promptAccuracy,
    aspectRatio,
    realismStrength,
    enhancedAuthenticity,
    updateStyleStrength,
    updatePromptAccuracy,
    // ... all settings state and functions
  }
}

// use-maya-images.ts
export function useMayaImages() {
  return {
    uploadedImages,
    imageLibrary,
    addImages,
    removeImages,
    // ... all image state and functions
  }
}
```

**Testing Checklist**:
- ✅ All hooks work correctly
- ✅ State persists correctly
- ✅ Components using hooks work
- ✅ No regressions in functionality

**Rollback Plan**: Revert hook extraction, restore inline state

**Estimated Time**: 3-4 hours

---

## 🧪 Testing Strategy

### After Each Step:
1. **Build Test**: Verify build succeeds
2. **Visual Test**: Verify UI looks correct
3. **Functional Test**: Test all related features
4. **Regression Test**: Verify nothing broke

### Critical Test Cases (Must Pass Every Time):

#### Image Generation:
- ✅ Generate image from text prompt
- ✅ Generate image from concept card
- ✅ Generate multiple images
- ✅ Image generation uses correct settings
- ✅ Credits deducted correctly
- ✅ Images saved to gallery

#### Concept Cards:
- ✅ Concept cards generate when Maya suggests
- ✅ Concept cards display correctly
- ✅ Clicking concept card selects it
- ✅ Concept card images load
- ✅ Multiple concept cards work

#### Chat:
- ✅ Send message to Maya
- ✅ Receive response from Maya
- ✅ Chat history loads
- ✅ New chat works
- ✅ Chat persistence works

#### Settings:
- ✅ All settings save to localStorage
- ✅ Settings load on mount
- ✅ Settings affect generation
- ✅ Settings work in both modes

#### Pro Mode:
- ✅ Pro Mode toggle works
- ✅ Pro Mode features work
- ✅ Image library works
- ✅ Intent management works

#### Classic Mode:
- ✅ Classic Mode works
- ✅ All Classic features work
- ✅ Mode switching works

---

## 📝 Implementation Checklist

### Pre-Implementation:
- [ ] Create backup of `maya-chat-screen.tsx`
- [ ] Create component directory structure
- [ ] Document current behavior (screenshots/videos)
- [ ] Set up test cases

### Step 1: Structure
- [ ] Create `components/sselfie/maya/` directory
- [ ] Create placeholder files
- [ ] Verify build works
- [ ] ✅ **Checkpoint**: Build successful

### Step 2: Header
- [ ] Extract header component
- [ ] Test header functionality
- [ ] ✅ **Checkpoint**: Header works, no regressions

### Step 3: Concept Cards (CRITICAL)
- [ ] Extract concept cards component
- [ ] Test concept card generation thoroughly
- [ ] Test concept card display
- [ ] Test concept card interactions
- [ ] ✅ **Checkpoint**: Concept cards work perfectly

### Step 4: Quick Prompts
- [ ] Extract quick prompts component
- [ ] Test prompt suggestions
- [ ] ✅ **Checkpoint**: Prompts work, no regressions

### Step 5: Settings Panel
- [ ] Extract settings panel
- [ ] Test all settings
- [ ] Test persistence
- [ ] ✅ **Checkpoint**: Settings work, no regressions

### Step 6: Chat Interface
- [ ] Extract chat interface
- [ ] Test chat functionality thoroughly
- [ ] ✅ **Checkpoint**: Chat works, no regressions

### Step 7: Custom Hooks
- [ ] Extract chat hook
- [ ] Extract settings hook
- [ ] Extract images hook
- [ ] Update components to use hooks
- [ ] Test all functionality
- [ ] ✅ **Checkpoint**: Hooks work, no regressions

### Final:
- [ ] Full regression test
- [ ] Performance check
- [ ] Code review
- [ ] ✅ **Checkpoint**: Phase 1 complete

---

## 🚨 Rollback Procedures

### If Something Breaks:

1. **Stop immediately**
2. **Identify the issue**: Which step caused it?
3. **Revert that step**: Use git to revert specific changes
4. **Test**: Verify everything works again
5. **Document**: Note what went wrong
6. **Fix**: Address the issue before proceeding

### Git Strategy:
- **Commit after each step**: Makes rollback easy
- **Use descriptive commits**: "Extract Maya header component"
- **Tag checkpoints**: Tag after each successful checkpoint

---

## ⏱️ Estimated Timeline

- **Step 1**: 30 minutes
- **Step 2**: 2-3 hours
- **Step 3**: 4-6 hours (CRITICAL - most time)
- **Step 4**: 2-3 hours
- **Step 5**: 3-4 hours
- **Step 6**: 4-5 hours
- **Step 7**: 3-4 hours

**Total**: ~20-27 hours (2.5-3.5 days)

**With Testing**: Add 50% buffer = **3-5 days**

---

## ✅ Success Criteria

Phase 1 is complete when:
1. ✅ All components extracted
2. ✅ All functionality preserved
3. ✅ All tests passing
4. ✅ No regressions
5. ✅ Code is cleaner and more maintainable
6. ✅ Ready for Phase 2 (B-Roll integration)

---

## 🎯 Next Steps

1. **Review this plan** - Make sure it's safe
2. **Create backup** - Backup current Maya screen
3. **Start with Step 1** - Create structure
4. **Proceed incrementally** - One step at a time
5. **Test thoroughly** - After each step
6. **Document issues** - If anything comes up

---

**Ready to start?** Let's begin with Step 1 (structure setup) - it's the safest first step! 🚀



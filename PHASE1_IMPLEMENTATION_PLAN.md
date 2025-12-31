# Phase 1 Implementation Plan - Complete Phase 1.2 & 1.3

**Goal**: Complete Phase 1 by extracting state management to hooks and simplifying the mode system.

**Current Status**:
- ✅ Phase 1.1: Component extraction (100% complete)
- ⚠️ Phase 1.2: State management hooks (0% - placeholders only)
- ❌ Phase 1.3: Mode system simplification (0%)

**Estimated Time**: 5-7 days

---

## Phase 1.2: Implement Custom Hooks

### Step 1.2.1: Implement `use-maya-settings.ts` Hook

**Goal**: Extract all settings state and persistence logic

**What to Extract**:
- Settings state: `styleStrength`, `promptAccuracy`, `aspectRatio`, `realismStrength`, `enhancedAuthenticity`
- Settings persistence: localStorage save/load with debouncing
- Settings change handlers

**Current State** (in maya-chat-screen.tsx):
```typescript
// Lines 114-126: Settings state
const [styleStrength, setStyleStrength] = useState(1.0)
const [promptAccuracy, setPromptAccuracy] = useState(3.5)
const [aspectRatio, setAspectRatio] = useState("4:5")
const [realismStrength, setRealismStrength] = useState(0.2)
const [enhancedAuthenticity, setEnhancedAuthenticity] = useState(() => { /* localStorage load */ })

// Lines 239-258: Settings load from localStorage
useEffect(() => { /* load settings */ }, [])

// Lines 260-283: Settings save to localStorage (debounced)
useEffect(() => { /* debounced save */ }, [styleStrength, promptAccuracy, aspectRatio, realismStrength])

// Lines 287-292: Enhanced authenticity save
useEffect(() => { /* save enhancedAuthenticity */ }, [enhancedAuthenticity])
```

**Implementation**:
```typescript
// components/sselfie/maya/hooks/use-maya-settings.ts
export interface MayaSettings {
  styleStrength: number
  promptAccuracy: number
  aspectRatio: string
  realismStrength: number
  enhancedAuthenticity: boolean
}

export function useMayaSettings() {
  // State initialization with localStorage load
  // Debounced save to localStorage
  // Return settings object and update handlers
}
```

**Files to Modify**:
- `components/sselfie/maya/hooks/use-maya-settings.ts` - Implement hook
- `components/sselfie/maya-chat-screen.tsx` - Replace settings state with hook

**Estimated Time**: 4-6 hours

---

### Step 1.2.2: Implement `use-maya-mode.ts` Hook

**Goal**: Extract mode state management and switching logic

**What to Extract**:
- Mode state: `studioProMode`, `setStudioProMode`
- Mode persistence: localStorage save/load
- Mode switch handler: `handleModeSwitch` function
- Mode change detection: track mode changes for chat reset

**Current State** (in maya-chat-screen.tsx):
```typescript
// Lines 161-170: Mode state initialization
const [studioProMode, setStudioProMode] = useState(() => { /* localStorage load */ })

// Lines 2275-2305: handleModeSwitch function
const handleModeSwitch = async (newMode: boolean) => { /* mode switch logic */ }

// Lines 570-574: Mode persistence
useEffect(() => { /* save studioProMode */ }, [studioProMode])

// Lines 236, 534-540: Mode change tracking
const lastModeRef = useRef<string | null>(null)
// Mode change detection in useEffect
```

**Implementation**:
```typescript
// components/sselfie/maya/hooks/use-maya-mode.ts
export function useMayaMode(forcedMode?: boolean) {
  // State initialization with localStorage load (respect forcedMode prop)
  // Persistence to localStorage
  // handleModeSwitch function
  // Return: { studioProMode, setStudioProMode, handleModeSwitch, isModeChanging }
}
```

**Files to Create**:
- `components/sselfie/maya/hooks/use-maya-mode.ts`

**Files to Modify**:
- `components/sselfie/maya-chat-screen.tsx` - Replace mode state with hook

**Estimated Time**: 3-4 hours

---

### Step 1.2.3: Implement `use-maya-images.ts` Hook

**Goal**: Extract image library state management

**What to Extract**:
- Legacy `uploadedImages` state (for Classic Mode compatibility)
- `galleryImages` state and loading
- Integration with existing `useImageLibrary` hook (already used)
- Image persistence to localStorage

**Current State** (in maya-chat-screen.tsx):
```typescript
// Lines 172-185: Already uses useImageLibrary hook ✅
const { library: imageLibrary, ... } = useImageLibrary()

// Lines 187-204: Legacy uploadedImages state
const [uploadedImages, setUploadedImages] = useState(() => { /* localStorage load */ })

// Lines 209: galleryImages state
const [galleryImages, setGalleryImages] = useState<any[]>([])

// Lines 577-582: uploadedImages persistence
useEffect(() => { /* save uploadedImages */ }, [uploadedImages])

// Lines 584-588: Load gallery images when Pro Mode enabled
useEffect(() => { /* loadGalleryImages */ }, [studioProMode])

// Lines 590-630: loadGalleryImages function
```

**Implementation**:
```typescript
// components/sselfie/maya/hooks/use-maya-images.ts
export function useMayaImages(studioProMode: boolean) {
  // Wrap useImageLibrary hook
  // Manage legacy uploadedImages for Classic Mode
  // Manage galleryImages loading
  // Handle persistence
  // Return: { imageLibrary, uploadedImages, galleryImages, loadGalleryImages, ... }
}
```

**Files to Modify**:
- `components/sselfie/maya/hooks/use-maya-images.ts` - Implement hook
- `components/sselfie/maya-chat-screen.tsx` - Replace image state with hook

**Estimated Time**: 4-5 hours

---

### Step 1.2.4: Implement `use-maya-chat.ts` Hook

**Goal**: Extract chat state and message management

**What to Extract**:
- Chat state: `chatId`, `chatTitle`, `isLoadingChat`
- useChat hook integration
- Message loading: `loadChat` function
- Chat history checking: `hasUsedMayaBefore` logic
- Message saving logic

**Current State** (in maya-chat-screen.tsx):
```typescript
// Lines 88-90: Chat state
const [chatId, setChatId] = useState<number | null>(initialChatId || null)
const [chatTitle, setChatTitle] = useState<string>("Chat with Maya")
const [isLoadingChat, setIsLoadingChat] = useState(true)

// Lines 310-352: useChat hook
const { messages, sendMessage, status, setMessages } = useChat({ ... })

// Lines 354-458: loadChat function
const loadChat = useCallback(async (specificChatId?: number) => { ... }, [setMessages, studioProMode])

// Lines 462-498: Chat history check
useEffect(() => { /* checkChatHistory */ }, [user, studioProMode])

// Lines 527-560: Load chat when user available
useEffect(() => { /* load chat */ }, [user, studioProMode])

// Lines 562-569: Save chatId to localStorage
useEffect(() => { /* save chatId */ }, [chatId])
```

**Implementation**:
```typescript
// components/sselfie/maya/hooks/use-maya-chat.ts
export function useMayaChat(
  initialChatId?: number,
  studioProMode: boolean,
  user: any
) {
  // Chat state
  // useChat hook integration
  // loadChat function
  // Chat history checking
  // Return: { chatId, chatTitle, isLoadingChat, messages, sendMessage, status, setMessages, loadChat, hasUsedMayaBefore, handleNewChat, handleSelectChat, ... }
}
```

**Files to Modify**:
- `components/sselfie/maya/hooks/use-maya-chat.ts` - Implement hook
- `components/sselfie/maya-chat-screen.tsx` - Replace chat state with hook

**Estimated Time**: 6-8 hours (most complex hook)

---

### Step 1.2.5: Update Main Component to Use Hooks

**Goal**: Replace all state management in maya-chat-screen.tsx with hooks

**Actions**:
1. Import all new hooks
2. Replace useState declarations with hook calls
3. Remove useEffect hooks that are now in custom hooks
4. Update component to use hook return values
5. Remove duplicate logic

**Files to Modify**:
- `components/sselfie/maya-chat-screen.tsx` - Refactor to use hooks

**Estimated Time**: 4-6 hours

**Testing**:
- Test that all settings persist correctly
- Test that mode switching works
- Test that chat loading works
- Test that images load correctly
- Verify no functionality is broken

---

## Phase 1.3: Simplify Mode System

### Step 1.3.1: Analyze Current Mode Differences

**Goal**: Document what differs between Classic and Pro Mode

**Current Differences** (to be analyzed):
1. **UI Components**:
   - Classic: `MayaHeader`, `MayaChatInterface`
   - Pro: `ProModeHeader`, `ProModeChat`, `ProModeInput`
   
2. **Features**:
   - Classic: Basic chat, image generation, concept cards
   - Pro: Image library, intent management, enhanced concept generation, consistency mode

3. **API Endpoints**:
   - Classic: `/api/maya/chat`, `/api/maya/generate-concepts`
   - Pro: `/api/maya/chat` (with header), `/api/maya/pro/generate-concepts`

4. **Settings**:
   - Classic: Has `enhancedAuthenticity` toggle
   - Pro: Has `consistencyMode` toggle

**Actions**:
1. Search for all `studioProMode` conditionals in maya-chat-screen.tsx
2. Document what each conditional affects
3. Create list of Pro-only features

**Files to Analyze**:
- `components/sselfie/maya-chat-screen.tsx`
- `components/sselfie/maya/maya-header.tsx`
- `components/sselfie/pro-mode/ProModeHeader.tsx`

**Estimated Time**: 2-3 hours

---

### Step 1.3.2: Create Unified Header Component

**Goal**: Merge MayaHeader and ProModeHeader into single component

**Current State**:
- `MayaHeader` - Classic mode header
- `ProModeHeader` - Pro mode header (972 lines!)
- Conditional rendering based on `studioProMode`

**Proposed Solution**:
- Create unified header that shows/hides Pro features based on mode
- Use progressive disclosure (Pro features appear when enabled)
- Keep same visual design for both modes

**Actions**:
1. Create `MayaUnifiedHeader.tsx` component
2. Merge features from both headers
3. Use conditional rendering for Pro features
4. Update maya-chat-screen.tsx to use unified header

**Files to Create**:
- `components/sselfie/maya/maya-unified-header.tsx`

**Files to Modify**:
- `components/sselfie/maya-chat-screen.tsx` - Use unified header

**Estimated Time**: 4-6 hours

---

### Step 1.3.3: Unify Chat Interface Components

**Goal**: Merge Classic and Pro chat interfaces into single component with progressive enhancement

**Current State**:
- Classic: `MayaChatInterface`
- Pro: `ProModeChat`, `ProModeInput`
- Conditional rendering throughout

**Proposed Solution**:
- Enhance `MayaChatInterface` to support Pro features
- Show Pro features conditionally based on mode
- Use same layout/structure for both modes

**Actions**:
1. Update `MayaChatInterface` to accept `studioProMode` prop
2. Add Pro features as optional enhancements
3. Update input component to support Pro features when enabled
4. Remove conditional rendering from parent component

**Files to Modify**:
- `components/sselfie/maya/maya-chat-interface.tsx` - Add Pro features
- `components/sselfie/maya-chat-screen.tsx` - Use unified interface

**Estimated Time**: 6-8 hours

---

### Step 1.3.4: Simplify Mode Toggle UI

**Goal**: Change from "Classic/Pro Mode" toggle to "Enable Pro Features" toggle

**Current State**:
- Mode toggle switches between two distinct modes
- Entire UI changes when switching modes

**Proposed Solution**:
- Single toggle: "Enable Pro Features" (on/off)
- UI stays the same, Pro features appear/disappear
- Clear indication of what Pro features add
- Tooltip/help text explaining Pro features

**Actions**:
1. Update `MayaModeToggle` component
2. Change from mode switcher to feature toggle
3. Add visual indicators for Pro features
4. Update toggle labels and styling

**Files to Modify**:
- `components/sselfie/maya/maya-mode-toggle.tsx`
- `components/sselfie/maya-chat-screen.tsx` - Update toggle usage

**Estimated Time**: 2-3 hours

---

### Step 1.3.5: Update Conditional Rendering

**Goal**: Replace mode-based conditionals with feature-based checks

**Current Pattern**:
```typescript
{studioProMode ? <ProModeComponent /> : <ClassicModeComponent />}
```

**New Pattern**:
```typescript
<UnifiedComponent>
  {studioProMode && <ProFeatureSection />}
</UnifiedComponent>
```

**Actions**:
1. Find all `studioProMode ? ... : ...` conditionals
2. Replace with unified components + conditional features
3. Update API calls to work with unified interface
4. Test all modes work correctly

**Files to Modify**:
- `components/sselfie/maya-chat-screen.tsx` - Update all conditionals
- All Maya components - Ensure they support unified mode

**Estimated Time**: 4-6 hours

---

### Step 1.3.6: Update Documentation & Onboarding

**Goal**: Update user-facing text to reflect unified interface

**Actions**:
1. Update mode toggle tooltip/help text
2. Update onboarding to explain Pro features (not separate mode)
3. Update any user-facing documentation
4. Ensure error messages are mode-agnostic

**Files to Modify**:
- Component tooltips/help text
- Onboarding components (if any)
- Error messages

**Estimated Time**: 1-2 hours

---

## Implementation Order

### Week 1: Custom Hooks (Phase 1.2)

**Day 1**:
- Morning: Step 1.2.1 - Implement `use-maya-settings.ts`
- Afternoon: Step 1.2.2 - Implement `use-maya-mode.ts`

**Day 2**:
- Morning: Step 1.2.3 - Implement `use-maya-images.ts`
- Afternoon: Start Step 1.2.4 - Implement `use-maya-chat.ts` (part 1)

**Day 3**:
- Morning: Complete Step 1.2.4 - Implement `use-maya-chat.ts` (part 2)
- Afternoon: Step 1.2.5 - Update main component to use hooks

**Day 4**:
- Testing and bug fixes for hooks
- Verify all functionality works

### Week 2: Mode System Simplification (Phase 1.3)

**Day 1**:
- Morning: Step 1.3.1 - Analyze mode differences
- Afternoon: Step 1.3.2 - Create unified header (part 1)

**Day 2**:
- Morning: Complete Step 1.3.2 - Create unified header (part 2)
- Afternoon: Step 1.3.3 - Unify chat interface (part 1)

**Day 3**:
- Morning: Complete Step 1.3.3 - Unify chat interface (part 2)
- Afternoon: Step 1.3.4 - Simplify mode toggle UI

**Day 4**:
- Morning: Step 1.3.5 - Update conditional rendering
- Afternoon: Step 1.3.6 - Update documentation

**Day 5**:
- Testing and bug fixes
- Final verification

---

## Success Criteria

### Phase 1.2 Complete When:
- ✅ All state management extracted to hooks
- ✅ Main component reduced by ~500-700 lines
- ✅ All hooks properly typed and tested
- ✅ No functionality broken
- ✅ Settings persist correctly
- ✅ Mode switching works
- ✅ Chat loading works
- ✅ Images load correctly

### Phase 1.3 Complete When:
- ✅ Unified header component created
- ✅ Unified chat interface created
- ✅ Mode toggle simplified to "Enable Pro Features"
- ✅ All conditionals updated to use unified components
- ✅ No UI changes when switching modes (only features appear/disappear)
- ✅ Pro features work when enabled
- ✅ Classic mode works without Pro features
- ✅ User experience improved (clearer, less confusing)

---

## Testing Checklist

### After Phase 1.2:
- [ ] Settings save and load correctly
- [ ] Mode switches correctly
- [ ] Chat loads correctly in both modes
- [ ] Images load correctly
- [ ] All existing functionality works
- [ ] No console errors
- [ ] No TypeScript errors

### After Phase 1.3:
- [ ] Classic mode works (all existing features)
- [ ] Pro mode works (all existing features)
- [ ] Toggle between modes works smoothly
- [ ] Pro features appear/disappear correctly
- [ ] UI stays consistent (no jarring changes)
- [ ] All API calls work correctly
- [ ] No console errors
- [ ] No TypeScript errors

---

## Rollback Plan

If issues arise:
1. Git commit after each step
2. Keep original component as backup
3. Test after each step before proceeding
4. Can rollback individual hooks if needed
5. Can keep dual-mode system if unified approach has issues

---

## Notes

- **Incremental Approach**: Complete each hook before moving to next
- **Test Thoroughly**: Test after each step, not just at the end
- **Type Safety**: Ensure all hooks are properly typed
- **Documentation**: Add JSDoc comments to all hooks
- **Performance**: Ensure hooks don't cause unnecessary re-renders
- **Backward Compatibility**: Ensure existing functionality is preserved

---

**Ready to start? Begin with Step 1.2.1: Implement `use-maya-settings.ts` Hook** 🚀


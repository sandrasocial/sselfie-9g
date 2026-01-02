# Phase 1.3: Mode System Differences Analysis

**Date**: Current  
**Purpose**: Document all differences between Classic and Pro Mode to enable unification

---

## Summary

Currently, Classic and Pro Mode have different UIs, components, and features. The goal is to unify them into a single interface where Pro features appear/disappear based on mode toggle.

---

## 1. HEADER DIFFERENCES

### Classic Mode Header (`MayaHeader` - Classic path)
- **Location**: `components/sselfie/maya/maya-header.tsx` (lines 94-128)
- **Features**:
  - Simple header with Maya avatar
  - Chat title display
  - Mode toggle button
  - Navigation menu button
  - Credits display (in menu)
- **Components Used**: `MayaModeToggle`

### Pro Mode Header (`ProModeHeader`)
- **Location**: `components/sselfie/pro-mode/ProModeHeader.tsx` (972 lines!)
- **Features**:
  - Professional header with "Studio Pro" title
  - Library count display
  - Manage dropdown (library management, add images, start fresh)
  - Credits display
  - Settings button
  - Admin guide selector (if admin)
  - Switch to Classic button
  - Navigation menu
  - Edit intent button
- **Components Used**: `MayaModeToggle` (embedded)

### Current Implementation
- `MayaHeader` component conditionally renders:
  - If `studioProMode`: Renders `ProModeHeader`
  - Else: Renders Classic header

### Unification Strategy
- Create single unified header
- Show/hide Pro features conditionally
- Use same layout structure for both modes

---

## 2. CHAT INTERFACE DIFFERENCES

### Classic Mode Chat Interface
- **Component**: `MayaChatInterface`
- **Location**: `components/sselfie/maya/maya-chat-interface.tsx`
- **Features**:
  - Simple message display
  - Concept cards (Classic style)
  - Image upload support
  - Basic prompt suggestions

### Pro Mode Chat Interface
- **Component**: Currently using `MayaChatInterface` with `studioProMode` prop
- **Note**: Actually, the code shows `MayaChatInterface` is used for both, with conditional rendering inside
- **Features**:
  - Same message display
  - Pro-style concept cards (`ConceptCardPro` - not currently used, may be legacy)
  - Image library integration
  - Pro Mode prompt suggestions
  - Consistency mode toggle

### Current Implementation
- Single `MayaChatInterface` component used for both modes
- Props: `studioProMode` toggles features
- Concept cards handled internally

### Unification Strategy
- Already unified in `MayaChatInterface`! ✅
- Just need to ensure all Pro features work when `studioProMode` is true

---

## 3. INPUT AREA DIFFERENCES

### Classic Mode Input
- **Component**: Inline input in `maya-chat-screen.tsx`
- **Features**:
  - Simple text input
  - Send button
  - Image upload button
  - Quick prompts below input
  - Inspiration image display

### Pro Mode Input
- **Component**: `ProModeInput` (not currently used based on code inspection)
- **Actually Used**: Inline input with conditional Pro features
- **Features**:
  - Same text input
  - Collapsible "Generation Options" section
  - Quick prompts (Pro Mode style)
  - Concept consistency toggle
  - Settings access

### Current Implementation
Looking at lines 3189-3300+:
- Conditional rendering: `{studioProMode ? <Pro Input Section> : <Classic Input Section>}`
- Pro Mode has collapsible options section with:
  - Quick prompts
  - Concept consistency toggle
  - Settings button

### Unification Strategy
- Merge input areas into single component
- Show "Generation Options" section conditionally when Pro Mode enabled
- Use same input field for both modes

---

## 4. CONCEPT CARDS DIFFERENCES

### Classic Mode Concept Cards
- **Component**: `ConceptCard` (from `./concept-card.tsx`)
- **Display**: `MayaConceptCards` component
- **Features**:
  - Standard concept cards
  - Image preview
  - Generate button
  - Save to guide (admin)

### Pro Mode Concept Cards
- **Component**: `ConceptCardPro` (exists but may not be actively used)
- **Display**: `MayaConceptCards` component (handles both)
- **Features**:
  - Same as Classic but with Pro styling
  - Consistency mode affects generation
  - Uses image library context

### Current Implementation
- `MayaConceptCards` component used for both
- Props: `studioProMode` toggles behavior
- Concept cards themselves are unified

### Unification Strategy
- Already unified! ✅
- Just ensure Pro features work correctly

---

## 5. EMPTY STATE DIFFERENCES

### Classic Mode Empty State
- **Location**: Lines 3129-3153
- **Features**:
  - Maya avatar
  - "Welcome" title
  - Welcome message
  - Quick prompts (`MayaQuickPrompts`)

### Pro Mode Empty State
- **Location**: Lines 2947-3127
- **Features**:
  - Image upload flow (if library is empty)
  - "Studio Pro" title
  - Welcome message
  - Library intent-based suggestions
  - Pro Mode quick prompts
  - Two states: Empty library vs Library with images

### Current Implementation
```tsx
{isEmpty && studioProMode && !isTyping && (
  // Pro Mode empty state
)}
{isEmpty && !studioProMode && !isTyping && (
  // Classic Mode empty state
)}
```

### Unification Strategy
- Create unified empty state component
- Show image upload flow only when Pro Mode enabled and library empty
- Use same welcome UI structure
- Conditionally show Pro features

---

## 6. PROMPT SUGGESTIONS DIFFERENCES

### Classic Mode Prompts
- **Function**: `getRandomPrompts(gender)`
- **Source**: Gender-specific prompt pools
- **Display**: `MayaQuickPrompts` with variant="empty-state" or "input-area"

### Pro Mode Prompts
- **Function**: `getProModeQuickSuggestions()`
- **Source**: Category-based examples (selfies, products, people, vibes)
- **Display**: `MayaQuickPrompts` with variant="pro-mode-empty" or "pro-mode-options"

### Current Implementation
- Different prompt generation functions
- Same component (`MayaQuickPrompts`) with different variants
- Conditional: `studioProMode ? getProModeQuickSuggestions() : getRandomPrompts(gender)`

### Unification Strategy
- Keep separate prompt functions (they serve different purposes)
- Use `MayaQuickPrompts` component (already unified)
- Just ensure correct function is called based on mode

---

## 7. API ENDPOINT DIFFERENCES

### Classic Mode API Calls
- **Chat**: `/api/maya/chat` (with `x-studio-pro-mode: false` header)
- **Concept Generation**: `/api/maya/generate-concepts`
- **Chat Type**: `"maya"`

### Pro Mode API Calls
- **Chat**: `/api/maya/chat` (with `x-studio-pro-mode: true` header)
- **Concept Generation**: `/api/maya/pro/generate-concepts`
- **Chat Type**: `"pro"`

### Request Body Differences

**Classic Mode Concept Generation**:
```typescript
{
  userRequest: string,
  count: number,
  conversationContext: string,
  referenceImageUrl: string,
  studioProMode: false,
  enhancedAuthenticity: boolean, // Only if enabled
  guidePrompt?: string,
}
```

**Pro Mode Concept Generation**:
```typescript
{
  userRequest: string,
  imageLibrary: ImageLibrary, // Required
  category: string | null,
  essenceWords: string | undefined,
  consistencyMode: 'variety' | 'consistent',
}
```

### Unification Strategy
- API calls are already handled conditionally in code
- No UI changes needed for API calls
- Just ensure correct endpoint/body is used

---

## 8. SETTINGS DIFFERENCES

### Classic Mode Settings
- **Component**: `MayaSettingsPanel`
- **Settings Available**:
  - Style Strength
  - Prompt Accuracy
  - Aspect Ratio
  - Realism Boost
  - **Enhanced Authenticity** (Pro Mode exclusive: NOT available)

### Pro Mode Settings
- **Component**: `MayaSettingsPanel` (same component)
- **Settings Available**:
  - Style Strength
  - Prompt Accuracy
  - Aspect Ratio
  - Realism Boost
  - Enhanced Authenticity: NOT shown (Pro Mode doesn't use it)
  - **Consistency Mode** (separate toggle, not in settings panel)

### Current Implementation
- Same settings panel component
- `enhancedAuthenticity` only shown when `!studioProMode`
- `consistencyMode` is separate toggle component

### Unification Strategy
- Settings panel already unified ✅
- Just conditional display of Enhanced Authenticity

---

## 9. FEATURE DIFFERENCES

### Classic Mode Only Features
- ✅ Enhanced Authenticity toggle (settings)
- ✅ Inspiration image upload
- ✅ Gender-based prompt suggestions
- ✅ Simple quick prompts

### Pro Mode Only Features
- ✅ Image library management
- ✅ Intent management
- ✅ Consistency mode toggle
- ✅ Category-based prompt suggestions
- ✅ Image upload flow (for library)
- ✅ Library modal
- ✅ Pro Mode empty state with upload flow
- ✅ Collapsible generation options
- ✅ Different API endpoints
- ✅ Different concept generation (with image library)

### Shared Features
- ✅ Chat interface
- ✅ Message display
- ✅ Concept cards
- ✅ Settings panel (mostly)
- ✅ Quick prompts component
- ✅ Chat history
- ✅ Save to guide (admin)

---

## 10. CONDITIONAL RENDERING PATTERNS

### Pattern 1: Ternary Operator
```tsx
{studioProMode ? <ProComponent /> : <ClassicComponent />}
```

Found in:
- Header (MayaHeader component)
- Input area (lines 3189+)
- Empty state (lines 2947, 3129)
- Prompt generation (lines 1429-1446)

### Pattern 2: Conditional Feature Display
```tsx
{studioProMode && <ProFeature />}
```

Found in:
- Image library modals
- Pro Mode history
- Consistency toggle
- Collapsible options section

### Pattern 3: Conditional Props/Values
```tsx
<Component 
  studioProMode={studioProMode}
  variant={studioProMode ? "pro" : "classic"}
/>
```

Found in:
- MayaQuickPrompts
- MayaChatInterface
- MayaSettingsPanel (enhancedAuthenticity prop)

---

## 11. KEY FINDINGS

### Already Unified ✅
1. **Chat Interface**: `MayaChatInterface` handles both modes
2. **Concept Cards**: `MayaConceptCards` handles both modes
3. **Settings Panel**: `MayaSettingsPanel` handles both modes
4. **Quick Prompts**: `MayaQuickPrompts` handles both modes (with variants)

### Need Unification ⚠️
1. **Header**: Two completely different components
2. **Input Area**: Conditional rendering with different sections
3. **Empty State**: Two completely different empty states
4. **Mode Toggle**: Currently switches entire UI

### Can Stay Separate (Different Purpose)
1. **Prompt Functions**: Different prompt pools (Classic vs Pro) serve different purposes
2. **API Calls**: Different endpoints (handled in code, not UI)

---

## 12. UNIFICATION STRATEGY

### Priority 1: Header Unification
- Merge `ProModeHeader` and Classic header into single component
- Show Pro features conditionally
- Use progressive disclosure (Pro features appear when enabled)

### Priority 2: Input Area Unification
- Merge Pro and Classic input sections
- Show "Generation Options" collapsible section only when Pro Mode enabled
- Use same input field and send button

### Priority 3: Empty State Unification
- Merge two empty states into one
- Show image upload flow conditionally (Pro Mode + empty library)
- Use same welcome UI structure

### Priority 4: Mode Toggle Simplification
- Change from "Classic/Pro Mode switcher" to "Enable Pro Features" toggle
- Make toggle clear about what it does
- Add tooltip/help text

### Priority 5: Remove Conditional Rendering
- Replace ternary operators with unified components + conditional features
- Use pattern: `<UnifiedComponent>{proMode && <ProFeature />}</UnifiedComponent>`

---

## 13. RISKS & CONSIDERATIONS

### Risks
1. **Breaking Changes**: Merging headers/input areas could break existing functionality
2. **Visual Differences**: Pro Mode has different design system (Typography, Colors from design-system)
3. **Complex Logic**: Pro Mode has many additional features that need to work correctly
4. **User Confusion**: If UI changes too much, users might be confused

### Mitigation
1. **Incremental Changes**: Unify one component at a time
2. **Thorough Testing**: Test both modes after each change
3. **Progressive Enhancement**: Ensure Classic Mode works first, then add Pro features
4. **Preserve Design**: Keep Pro Mode design system for Pro features

---

## 14. ESTIMATED COMPLEXITY

### Header Unification
- **Complexity**: High (ProModeHeader is 972 lines)
- **Time**: 4-6 hours
- **Risk**: Medium-High

### Input Area Unification
- **Complexity**: Medium
- **Time**: 3-4 hours
- **Risk**: Medium

### Empty State Unification
- **Complexity**: Medium
- **Time**: 2-3 hours
- **Risk**: Low-Medium

### Mode Toggle Simplification
- **Complexity**: Low
- **Time**: 1-2 hours
- **Risk**: Low

### Total Estimated Time: 10-15 hours

---

## 15. NEXT STEPS

1. ✅ **Step 1.3.1**: Analyze differences (THIS DOCUMENT) - DONE
2. ⏭️ **Step 1.3.2**: Create unified header component
3. ⏭️ **Step 1.3.3**: Unify chat interface components (verify they're already unified)
4. ⏭️ **Step 1.3.4**: Simplify mode toggle UI
5. ⏭️ **Step 1.3.5**: Update conditional rendering
6. ⏭️ **Step 1.3.6**: Update documentation

---

**Ready to proceed with Step 1.3.2: Create Unified Header Component** 🚀


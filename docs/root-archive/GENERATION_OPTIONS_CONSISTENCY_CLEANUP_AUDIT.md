# GENERATION OPTIONS & CONSISTENCY FEATURE CLEANUP AUDIT

**Date:** January 2025  
**Scope:** Remove Generation Options UI and Consistency feature from Pro Mode  
**Status:** 🔍 **AUDIT COMPLETE**

---

## EXECUTIVE SUMMARY

**Feature to Remove:**
- "Generation Options" collapsible section (Pro Mode only)
- "Concept Style" toggle (Variety vs Consistent)
- Consistency mode logic in backend APIs

**Files Affected:** 8 files  
**Lines to Remove/Update:** ~200+ lines  
**Complexity:** Medium (requires careful removal to maintain functionality)

---

## PART 1: GENERATION OPTIONS UI REMOVAL

### 1.1 Frontend Components

#### ✅ File: `components/sselfie/maya-chat-screen.tsx`

**Location:** Lines 3001-3070

**Current Code:**
```typescript
{/* Pro Feature: Generation Options (collapsible section with quick prompts and concept consistency)
    Progressive enhancement: This section only appears when Pro features are enabled */}
{proMode && (
    <div className="w-full border-b border-stone-200/30">
      {/* Collapsible Header */}
      <button onClick={() => setIsOptionsExpanded(!isOptionsExpanded)}>
        Generation Options
      </button>
      
      {/* Collapsible Content */}
      {isOptionsExpanded && (
        <div>
          {/* Quick Suggestions */}
          <MayaQuickPrompts ... />
          
          {/* Concept Consistency Toggle */}
          <ConceptConsistencyToggle ... />
        </div>
      )}
    </div>
)}
```

**Action Required:**
- ❌ **DELETE** entire "Generation Options" section (lines 3001-3070)
- ❌ **REMOVE** `isOptionsExpanded` state (line 211)
- ❌ **REMOVE** import for `ConceptConsistencyToggle` (line 56)
- ❌ **REMOVE** `ChevronDown` icon import (check if only used here - likely only in Generation Options)
- ✅ **KEEP** `MayaQuickPrompts` import and component (used elsewhere)

**Impact:** 
- Quick Prompts will no longer be accessible via collapsible section
- Concept Consistency Toggle will be removed
- UI will be cleaner (one less collapsible section)

---

### 1.2 State Management

#### ✅ File: `components/sselfie/maya-chat-screen.tsx`

**Location:** Line 211

**Current Code:**
```typescript
// Collapsible section state for quick prompts and concept style
const [isOptionsExpanded, setIsOptionsExpanded] = useState(false)
```

**Action Required:**
- ❌ **DELETE** this state variable

---

### 1.3 Component Imports

#### ✅ File: `components/sselfie/maya-chat-screen.tsx`

**Location:** Line 56

**Current Code:**
```typescript
import { ConceptConsistencyToggle } from './concept-consistency-toggle'
```

**Action Required:**
- ❌ **REMOVE** this import

**Note:** Check if `ChevronDown` is used elsewhere. If only in Generation Options, remove that import too.

---

## PART 2: CONSISTENCY FEATURE REMOVAL

### 2.1 Frontend State & Handlers

#### ✅ File: `components/sselfie/maya-chat-screen.tsx`

**Location:** Lines 200-208, 319-325

**Current Code:**
```typescript
// Consistency mode state
const [consistencyMode, setConsistencyMode] = useState<'variety' | 'consistent'>(() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('mayaConsistencyMode')
    if (saved === 'variety' || saved === 'consistent') {
      return saved
    }
  }
  return 'variety' // Default to variety
})

// Handler
const handleConsistencyModeChange = useCallback((mode: 'variety' | 'consistent') => {
  setConsistencyMode(mode)
  if (typeof window !== 'undefined') {
    localStorage.setItem('mayaConsistencyMode', mode)
  }
}, [])
```

**Action Required:**
- ❌ **DELETE** `consistencyMode` state
- ❌ **DELETE** `handleConsistencyModeChange` handler
- ❌ **REMOVE** localStorage key `'mayaConsistencyMode'` (clean up on component mount if needed)

**Usage Locations to Update:**
- Line 643: Remove `consistencyMode` from API call
- Line 808: Remove from dependency array
- Line 3060-3061: Already removed with Generation Options section

---

### 2.2 API Call Updates

#### ✅ File: `components/sselfie/maya-chat-screen.tsx`

**Location:** Line 643

**Current Code:**
```typescript
consistencyMode: consistencyMode, // NEW: Send consistency mode to backend
```

**Action Required:**
- ❌ **REMOVE** `consistencyMode` from API request body
- ❌ **REMOVE** comment

---

### 2.3 Pro Mode Hook

#### ✅ File: `components/sselfie/pro-mode/hooks/useConceptGeneration.ts`

**Location:** Lines 36, 68, 91

**Current Code:**
```typescript
// Function signature
generateConcepts: (userRequest: string, imageLibrary: ImageLibrary, essenceWords?: string, consistencyMode?: 'variety' | 'consistent') => Promise<void>

// Implementation
async (userRequest: string, imageLibrary: ImageLibrary, essenceWords?: string, consistencyMode: 'variety' | 'consistent' = 'variety') => {
  // ...
  body: JSON.stringify({
    userRequest,
    imageLibrary,
    category: null,
    essenceWords,
    consistencyMode, // Send consistency mode to backend
  }),
}
```

**Action Required:**
- ❌ **REMOVE** `consistencyMode` parameter from function signature
- ❌ **REMOVE** `consistencyMode` from function implementation
- ❌ **REMOVE** `consistencyMode` from API request body
- ❌ **REMOVE** default value `= 'variety'`

---

### 2.4 Pro Mode Chat Component

#### ✅ File: `components/sselfie/pro-mode/ProModeChat.tsx`

**Location:** Lines 52, 69, 149

**Current Code:**
```typescript
// Props interface
consistencyMode?: 'variety' | 'consistent'

// Default value
consistencyMode = 'variety',

// Usage
generateConcepts(userRequest, library, lastTrigger.essenceWords, consistencyMode)
```

**Action Required:**
- ❌ **REMOVE** `consistencyMode` from props interface
- ❌ **REMOVE** default value
- ❌ **UPDATE** `generateConcepts` call to remove `consistencyMode` parameter

---

### 2.5 Consistency Toggle Component

#### ✅ File: `components/sselfie/concept-consistency-toggle.tsx`

**Status:** ⚠️ **ENTIRE FILE CAN BE DELETED**

**Action Required:**
- ❌ **DELETE** entire file (no longer used anywhere)

**Note:** This is a standalone component that's only used in Generation Options section.

---

### 2.6 Backend API - Classic Mode

#### ✅ File: `app/api/maya/generate-concepts/route.ts`

**Location:** Lines 99-102, 752, 832, 1638-1651

**Current Code:**
```typescript
// Type definition
type ConsistencyMode = 'variety' | 'consistent'

// Request body parsing
consistencyMode = 'variety', // Consistency mode: 'variety' (default) or 'consistent' (for video editing)

// Logging
consistencyMode: studioProMode ? consistencyMode : undefined, // Only log if Pro Mode

// Prompt generation logic
${consistencyMode === 'consistent'
  ? `The user wants CONSISTENT concepts for video editing:
- Use the SAME outfit across all ${count} concepts
- Use the SAME location/setting
- Use the SAME lighting and mood
- ONLY vary: poses, angles, expressions, camera framing`
  : `The user wants VARIETY across concepts:
- Create DIFFERENT outfits for each concept
- Create DIFFERENT locations and settings
- Vary poses, angles, lighting, and moods`}
```

**Action Required:**
- ❌ **DELETE** `ConsistencyMode` type definition
- ❌ **REMOVE** `consistencyMode` from request body parsing
- ❌ **REMOVE** `consistencyMode` from logging
- ❌ **SIMPLIFY** prompt generation logic to always use variety (remove conditional)
- ❌ **REMOVE** all consistency-related prompt instructions

**Note:** This API handles both Classic and Pro Mode. Since consistencyMode is only used in Pro Mode, we can safely remove it and always default to variety behavior.

---

### 2.7 Backend API - Pro Mode

#### ✅ File: `app/api/maya/pro/generate-concepts/route.ts`

**Location:** Lines 54-57, 324, 394, 501-514

**Current Code:**
```typescript
// Type definition
type ConsistencyMode = 'variety' | 'consistent'

// Request body parsing
const { userRequest, imageLibrary, category, essenceWords, concepts, consistencyMode = 'variety' } = body

// Logging
consistencyMode: consistencyMode, // NEW: Log consistency mode

// Prompt generation logic
${consistencyMode === 'consistent'
  ? `The user wants CONSISTENT concepts for video editing:
- Use the SAME outfit across all 6 concepts
- Use the SAME location/setting
- Use the SAME lighting and mood
- ONLY vary: poses, angles, expressions, camera framing`
  : `The user wants VARIETY across concepts:
- Create DIFFERENT outfits for each concept
- Create DIFFERENT locations and settings
- Vary poses, angles, lighting, and moods`}
```

**Action Required:**
- ❌ **DELETE** `ConsistencyMode` type definition
- ❌ **REMOVE** `consistencyMode` from request body parsing
- ❌ **REMOVE** `consistencyMode` from logging
- ❌ **SIMPLIFY** prompt generation logic to always use variety (remove conditional)
- ❌ **REMOVE** all consistency-related prompt instructions

---

## PART 3: QUICK PROMPTS CONSIDERATION

### 3.1 Quick Prompts in Generation Options

**Current Location:** Inside "Generation Options" collapsible section (line 3047)

**Component:** `MayaQuickPrompts`

**Other Usage Locations:**
- ✅ **Line 2918:** Empty state (Classic Mode)
- ✅ **Line 2948:** Empty state (Pro Mode)
- ✅ **Line 2974:** Input area (both modes)
- ✅ **Feed Tab:** Used in `maya-feed-tab.tsx` (line 449)

**Decision:** ✅ **KEEP Quick Prompts** - They're used in multiple places (empty states, input area, feed tab)

**Action Required:**
- ❌ **REMOVE** Quick Prompts from Generation Options section only
- ✅ **KEEP** Quick Prompts in all other locations (empty states, input area, feed tab)
- ✅ **KEEP** `MayaQuickPrompts` component and import

---

## PART 4: CLEANUP CHECKLIST

### Frontend Cleanup

- [ ] Remove "Generation Options" collapsible section from `maya-chat-screen.tsx`
- [ ] Remove `isOptionsExpanded` state
- [ ] Remove `consistencyMode` state
- [ ] Remove `handleConsistencyModeChange` handler
- [ ] Remove `consistencyMode` from API calls
- [ ] Remove `ConceptConsistencyToggle` import
- [ ] Remove `ChevronDown` import (if only used in Generation Options)
- [ ] Update `maya-mode-toggle.tsx` comment (line 20) to remove "Advanced generation options" reference
- [ ] Update `useConceptGeneration` hook to remove `consistencyMode` parameter
- [ ] Update `ProModeChat` component to remove `consistencyMode` prop
- [ ] Delete `concept-consistency-toggle.tsx` file
- [ ] Clean up localStorage key `'mayaConsistencyMode'` (optional)

### Backend Cleanup

- [ ] Remove `ConsistencyMode` type from `generate-concepts/route.ts`
- [ ] Remove `consistencyMode` from request body parsing
- [ ] Remove `consistencyMode` from logging
- [ ] Simplify prompt generation to always use variety (remove conditional)
- [ ] Remove consistency-related prompt instructions
- [ ] Remove `ConsistencyMode` type from `pro/generate-concepts/route.ts`
- [ ] Remove `consistencyMode` from request body parsing
- [ ] Remove `consistencyMode` from logging
- [ ] Simplify prompt generation to always use variety (remove conditional)
- [ ] Remove consistency-related prompt instructions

### Documentation Cleanup

- [ ] Update any docs mentioning "Generation Options"
- [ ] Update any docs mentioning "Consistency" feature
- [ ] Remove references from component comments

---

## PART 5: IMPACT ANALYSIS

### User Experience Impact

**Before:**
- Users could toggle between "Variety" and "Consistent" concept styles
- Quick Prompts accessible via collapsible section
- More UI complexity

**After:**
- Always uses "Variety" behavior (different outfits, locations, scenes)
- Quick Prompts removed (unless moved elsewhere)
- Cleaner, simpler UI

### Functional Impact

**Behavior Change:**
- Concept generation will always create variety (different outfits/locations)
- No option for consistent styling across concepts
- This matches the default behavior (variety was the default)

**Breaking Changes:**
- None (variety was the default)
- Users who used "Consistent" mode will now get variety (but this is the default anyway)

### Code Impact

**Lines Removed:** ~200+ lines  
**Files Deleted:** 1 (`concept-consistency-toggle.tsx`)  
**Files Modified:** 7  
**Complexity Reduction:** Medium (removes conditional logic)

---

## PART 6: IMPLEMENTATION PLAN

### Phase 1: Frontend Cleanup (High Priority)

1. Remove Generation Options section from `maya-chat-screen.tsx`
2. Remove consistency state and handlers
3. Update API calls to remove `consistencyMode`
4. Update Pro Mode hook and component
5. Delete `concept-consistency-toggle.tsx`

### Phase 2: Backend Cleanup (High Priority)

1. Remove `ConsistencyMode` type definitions
2. Remove `consistencyMode` from request parsing
3. Simplify prompt generation logic (always variety)
4. Remove consistency-related prompt instructions

### Phase 3: Verification (Medium Priority)

1. Test concept generation in Pro Mode
2. Verify variety behavior works correctly
3. Check for any remaining references
4. Clean up localStorage (optional)

### Phase 4: Documentation (Low Priority)

1. Update component comments
2. Remove references from docs
3. Update any user-facing documentation

---

## PART 7: FILES SUMMARY

### Files to Modify

1. `components/sselfie/maya-chat-screen.tsx` - Remove Generation Options, consistency state
2. `components/sselfie/pro-mode/hooks/useConceptGeneration.ts` - Remove consistencyMode parameter
3. `components/sselfie/pro-mode/ProModeChat.tsx` - Remove consistencyMode prop
4. `app/api/maya/generate-concepts/route.ts` - Remove consistency logic
5. `app/api/maya/pro/generate-concepts/route.ts` - Remove consistency logic

### Files to Delete

1. `components/sselfie/concept-consistency-toggle.tsx` - Entire file

### Files to Check (Optional Cleanup)

1. `components/sselfie/maya/maya-mode-toggle.tsx` - **UPDATE** comment on line 20 (mentions "Advanced generation options")
2. Any documentation files mentioning Generation Options or Consistency

---

## PART 8: RISK ASSESSMENT

### Low Risk ✅

- Removing Generation Options UI (no functional impact)
- Removing consistency feature (variety was default)
- Deleting unused component

### Medium Risk ⚠️

- Simplifying backend prompt logic (need to verify variety behavior works)
- Removing localStorage key (optional, can be left for backward compatibility)

### High Risk ❌

- None identified

---

## SUMMARY

**Total Files Affected:** 8  
**Files to Delete:** 1  
**Files to Modify:** 7  
**Estimated Lines Removed:** ~200+  
**Complexity:** Medium  
**Risk Level:** Low-Medium  
**Estimated Time:** 1-2 hours

**Ready for Implementation?** ✅

---

**Next Steps:**
1. Review this audit
2. Decide on Quick Prompts (remove or relocate)
3. Implement Phase 1 (Frontend)
4. Implement Phase 2 (Backend)
5. Test and verify
6. Clean up documentation


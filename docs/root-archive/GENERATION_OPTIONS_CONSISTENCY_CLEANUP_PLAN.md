# GENERATION OPTIONS & CONSISTENCY CLEANUP - IMPLEMENTATION PLAN

**Date:** January 2025  
**Status:** 📋 **READY FOR IMPLEMENTATION**

---

## QUICK REFERENCE

**Files to Modify:** 7  
**Files to Delete:** 1  
**Estimated Time:** 1-2 hours  
**Risk Level:** Low-Medium

---

## IMPLEMENTATION STEPS

### STEP 1: Remove Generation Options UI (Frontend)

**File:** `components/sselfie/maya-chat-screen.tsx`

**Actions:**
1. Delete lines 3001-3070 (entire Generation Options section)
2. Delete line 211 (`isOptionsExpanded` state)
3. Delete line 56 (ConceptConsistencyToggle import)
4. Check if `ChevronDown` is used elsewhere - if not, remove from imports (line 24)

**Verification:**
- No "Generation Options" section visible in Pro Mode
- No TypeScript errors

---

### STEP 2: Remove Consistency State & Handlers (Frontend)

**File:** `components/sselfie/maya-chat-screen.tsx`

**Actions:**
1. Delete lines 200-208 (consistencyMode state)
2. Delete lines 319-325 (handleConsistencyModeChange handler)
3. Remove `consistencyMode` from API call (line 643)
4. Remove `consistencyMode` from dependency array (line 808)

**Verification:**
- No consistencyMode state
- No localStorage references
- API calls don't include consistencyMode

---

### STEP 3: Update Pro Mode Hook

**File:** `components/sselfie/pro-mode/hooks/useConceptGeneration.ts`

**Actions:**
1. Remove `consistencyMode` parameter from function signature (line 36)
2. Remove `consistencyMode` from function implementation (line 68)
3. Remove `consistencyMode` from API request body (line 91)

**Verification:**
- Function signature updated
- No consistencyMode in API calls

---

### STEP 4: Update Pro Mode Chat Component

**File:** `components/sselfie/pro-mode/ProModeChat.tsx`

**Actions:**
1. Remove `consistencyMode` from props interface (line 52)
2. Remove default value (line 69)
3. Update `generateConcepts` call to remove `consistencyMode` parameter (line 149)

**Verification:**
- Props interface updated
- No consistencyMode prop usage

---

### STEP 5: Delete Consistency Toggle Component

**File:** `components/sselfie/concept-consistency-toggle.tsx`

**Actions:**
1. Delete entire file

**Verification:**
- File deleted
- No import errors

---

### STEP 6: Update Backend - Classic Mode API

**File:** `app/api/maya/generate-concepts/route.ts`

**Actions:**
1. Delete `ConsistencyMode` type (lines 99-102)
2. Remove `consistencyMode` from request body parsing (line 752)
3. Remove `consistencyMode` from logging (line 832)
4. Simplify prompt generation logic - remove conditional (lines 1638-1651)
   - Always use variety behavior
   - Remove consistency-related instructions

**Verification:**
- No ConsistencyMode type
- Prompt generation always uses variety
- No TypeScript errors

---

### STEP 7: Update Backend - Pro Mode API

**File:** `app/api/maya/pro/generate-concepts/route.ts`

**Actions:**
1. Delete `ConsistencyMode` type (lines 54-57)
2. Remove `consistencyMode` from request body parsing (line 324)
3. Remove `consistencyMode` from logging (line 394)
4. Simplify prompt generation logic - remove conditional (lines 501-514)
   - Always use variety behavior
   - Remove consistency-related instructions

**Verification:**
- No ConsistencyMode type
- Prompt generation always uses variety
- No TypeScript errors

---

### STEP 8: Update Comments (Optional)

**File:** `components/sselfie/maya/maya-mode-toggle.tsx`

**Actions:**
1. Update line 20 comment to remove "Advanced generation options" reference

**New Comment:**
```typescript
* **Pro Features Include:**
* - Image library management (upload, organize, and reuse images)
* - Enhanced concept generation with linked images
* - Library-based image selection for concepts
```

**Verification:**
- Comment updated
- No references to removed features

---

### STEP 9: Cleanup localStorage (Optional)

**File:** `components/sselfie/maya-chat-screen.tsx`

**Actions:**
1. Add cleanup on component mount to remove `'mayaConsistencyMode'` key

**Optional Code:**
```typescript
useEffect(() => {
  // Clean up old consistency mode preference
  if (typeof window !== 'undefined') {
    localStorage.removeItem('mayaConsistencyMode')
  }
}, [])
```

**Verification:**
- Old localStorage key removed (optional)

---

## TESTING CHECKLIST

### Frontend Tests

- [ ] Pro Mode loads without errors
- [ ] No "Generation Options" section visible
- [ ] Quick Prompts still work in empty states
- [ ] Quick Prompts still work in input area
- [ ] Concept generation works in Pro Mode
- [ ] Concept generation works in Classic Mode
- [ ] No console errors

### Backend Tests

- [ ] Concept generation API accepts requests without consistencyMode
- [ ] Concept generation always creates variety (different outfits/locations)
- [ ] No TypeScript compilation errors
- [ ] API responses are correct

### Integration Tests

- [ ] Generate concepts in Pro Mode - verify variety behavior
- [ ] Generate concepts in Classic Mode - verify variety behavior
- [ ] Check that concepts have different outfits/locations (variety)

---

## ROLLBACK PLAN

If issues occur:

1. **Frontend Issues:**
   - Restore Generation Options section from backup
   - Restore consistency state and handlers
   - Restore ConceptConsistencyToggle import

2. **Backend Issues:**
   - Restore ConsistencyMode type
   - Restore consistencyMode parameter (default to 'variety')
   - Restore conditional prompt logic

3. **Component Issues:**
   - Restore concept-consistency-toggle.tsx file

**Note:** All changes are straightforward removals. Git revert should work cleanly.

---

## EXPECTED RESULTS

### Before Cleanup:
- Generation Options collapsible section in Pro Mode
- Concept Style toggle (Variety/Consistent)
- Consistency mode logic in backend
- ~200+ lines of code

### After Cleanup:
- No Generation Options section
- Always variety behavior (default)
- Simpler codebase
- ~200+ lines removed

### User Experience:
- Cleaner UI (one less collapsible section)
- Same default behavior (variety was already default)
- No breaking changes

---

## SUMMARY

**Total Changes:** 8 files  
**Files Deleted:** 1  
**Files Modified:** 7  
**Lines Removed:** ~200+  
**Risk:** Low-Medium  
**Time:** 1-2 hours

**Ready to implement?** ✅

---

**Next:** Execute steps 1-9 in order, test after each major step.


# MAYA CONSOLIDATION - 100% COMPLETION PLAN

**Date:** January 2025  
**Goal:** Complete all remaining validation issues to achieve 100% pass rate

---

## CURRENT STATUS

**Total Checks:** 89  
**Passed:** 82 ✅  
**Failed:** 2 ❌  
**Partial:** 5 ⚠️  
**Target:** 89 ✅ (100%)

---

## IDENTIFIED ISSUES

### Issue 1: Backup Files with Orphaned Imports ❌
**Status:** FAILED  
**Location:** Multiple backup files  
**Impact:** Low (backup files don't affect runtime)  
**Priority:** Medium

**Files to Delete:**
- `app/api/maya/pro/generate-concepts/route.ts.backup-1767100017321`
- `app/api/maya/generate-concepts/route.ts.backup-1767100017317`
- `app/api/maya/pro/check-generation/route.ts.backup-1767100017320`
- `app/api/maya/pro/library/get/route.ts.backup-1767100017325`
- `app/api/maya/pro/generate-image/route.ts.backup-1767100017323`
- `app/api/maya/load-chat/route.ts.backup-1767100017319`
- `app/api/maya/new-chat/route.ts.backup-1767100017319`
- `app/api/maya/create-photoshoot/route.ts.backup-1767100017316`
- `app/api/test-purchase-email/route.ts.backup-1767100017329`
- `middleware.ts.backup-1767456597`

**Action Required:**
1. Delete all backup files
2. Verify no active code references these files
3. Update audit to mark as ✅ PASS

---

### Issue 2: prompt-generator.ts Status ⚠️
**Status:** PARTIAL  
**Location:** `lib/maya/prompt-generator.ts`  
**Impact:** Low (file marked as deprecated)  
**Priority:** Medium

**Current State:**
- File exists and is marked as deprecated (line 6-8)
- Contains type reference to deleted `prompt-templates/types` (line 27)
- Not actively imported by any active code

**Action Required:**
1. Verify file is not used anywhere
2. If unused: Delete file
3. If used: Update type reference to remove dependency on deleted types
4. Update audit to mark as ✅ PASS

---

### Issue 3: Template System Documentation ⚠️
**Status:** PARTIAL  
**Location:** `lib/maya/prompt-templates/`  
**Impact:** None (files are intentionally kept for admin tools)  
**Priority:** Low

**Current State:**
- Template files exist but are used by admin tools only
- Not used by Maya's unified generation system
- Need clear documentation

**Action Required:**
1. Add README.md in `lib/maya/prompt-templates/` explaining:
   - These files are for admin tools only
   - Not used by Maya's unified generation system
   - Used by `lib/admin/universal-prompts-loader.ts`
2. Update audit to mark as ✅ PASS

---

### Issue 4: Reference-Only Files Status ⚠️
**Status:** PARTIAL  
**Location:** Multiple files  
**Impact:** Unknown  
**Priority:** Medium

**Files to Verify:**
- `lib/maya/brand-aesthetics.ts` - Status unknown
- `lib/maya/luxury-lifestyle-settings.ts` - EXISTS (imported in generate-concepts route line 40)
- `lib/maya/instagram-loras.ts` - Status unknown
- `lib/maya/storytelling-emotion-guide.ts` - Status unknown

**Action Required:**
1. Check if each file is imported/used
2. If used: Document purpose
3. If unused: Delete or mark as deprecated
4. Update audit to mark as ✅ PASS

---

### Issue 5: Chat Route MAYA_VOICE Import ⚠️
**Status:** PARTIAL (Actually PASS, but needs clarification)  
**Location:** `app/api/maya/chat/route.ts`  
**Impact:** None (works correctly via unified system)  
**Priority:** Low

**Current State:**
- Chat route uses `getMayaSystemPrompt()` which includes MAYA_VOICE
- Does not directly import MAYA_VOICE (which is correct)
- Audit marked as ⚠️ but should be ✅

**Action Required:**
1. Add comment in chat route explaining it uses unified system
2. Update audit to mark as ✅ PASS (no issue)

---

## IMPLEMENTATION PLAN

### Phase 1: Cleanup Backup Files (30 minutes)

**Step 1.1: Identify All Backup Files**
```bash
find . -name "*.backup-*" -type f
```

**Step 1.2: Verify No Active References**
```bash
grep -r "\.backup-" app/ lib/ components/ --exclude-dir=node_modules
```

**Step 1.3: Delete Backup Files**
```bash
# Create list of files to delete
find . -name "*.backup-*" -type f > backup-files-to-delete.txt

# Review list, then delete
while read file; do
  echo "Deleting: $file"
  rm "$file"
done < backup-files-to-delete.txt
```

**Step 1.4: Verify Deletion**
```bash
find . -name "*.backup-*" -type f
# Should return empty
```

**Expected Result:** ✅ All backup files deleted, Issue 1 resolved

---

### Phase 2: Resolve prompt-generator.ts (20 minutes)

**Step 2.1: Check Usage**
```bash
grep -r "prompt-generator" app/ lib/ components/ --exclude-dir=node_modules
```

**Step 2.2: Decision Tree**
- **If NOT used:** Delete file
- **If used:** Update type reference (remove line 27 dependency)

**Step 2.3: Execute**
- Delete file OR update type reference
- Remove deprecated comment if keeping file

**Expected Result:** ✅ prompt-generator.ts resolved, Issue 2 resolved

---

### Phase 3: Document Template System (15 minutes)

**Step 3.1: Create README**
Create `lib/maya/prompt-templates/README.md`:

```markdown
# Prompt Templates Directory

## Purpose
This directory contains prompt templates used by **admin tools only**.

## Important Notes
- ❌ **NOT used by Maya's unified generation system**
- ✅ Used by `lib/admin/universal-prompts-loader.ts` for admin functionality
- These templates are for legacy admin tools, not for Maya's core generation

## Files
- `high-end-brands/` - Brand-specific templates for admin tools
- `types.ts` - Type definitions for admin template system

## Do Not Modify
These files are intentionally kept separate from Maya's unified system.
```

**Step 3.2: Update Audit**
Mark Section 8.1 as ✅ PASS with documentation note

**Expected Result:** ✅ Template system documented, Issue 3 resolved

---

### Phase 4: Verify Reference-Only Files (30 minutes)

**Step 4.1: Check Each File**

**File 1: `lib/maya/brand-aesthetics.ts`**
```bash
grep -r "brand-aesthetics" app/ lib/ components/ --exclude-dir=node_modules
```

**File 2: `lib/maya/luxury-lifestyle-settings.ts`**
```bash
grep -r "luxury-lifestyle-settings" app/ lib/ components/ --exclude-dir=node_modules
```
- Already verified: Used in `app/api/maya/generate-concepts/route.ts` line 40 ✅

**File 3: `lib/maya/instagram-loras.ts`**
```bash
grep -r "instagram-loras" app/ lib/ components/ --exclude-dir=node_modules
```

**File 4: `lib/maya/storytelling-emotion-guide.ts`**
```bash
grep -r "storytelling-emotion-guide" app/ lib/ components/ --exclude-dir=node_modules
```

**Step 4.2: Action for Each File**
- **If used:** Add comment explaining purpose
- **If unused:** Delete file

**Step 4.3: Document Results**
Update audit with status of each file

**Expected Result:** ✅ All reference files verified, Issue 4 resolved

---

### Phase 5: Clarify Chat Route (5 minutes)

**Step 5.1: Add Comment**
In `app/api/maya/chat/route.ts` around line 723:

```typescript
// Use unified Maya system with mode-specific adapters
// Note: getMayaSystemPrompt() includes MAYA_VOICE, MAYA_CORE_INTELLIGENCE,
// and MAYA_PROMPT_PHILOSOPHY - no direct import needed
const config = isStudioProMode ? MAYA_PRO_CONFIG : MAYA_CLASSIC_CONFIG
systemPrompt = getMayaSystemPrompt(config)
```

**Step 5.2: Update Audit**
Mark Section 2.3 as ✅ PASS (clarify it's correct design)

**Expected Result:** ✅ Chat route clarified, Issue 5 resolved

---

## VALIDATION CHECKLIST

After completing all phases, verify:

- [ ] All backup files deleted
- [ ] prompt-generator.ts resolved (deleted or updated)
- [ ] Template system README created
- [ ] All reference files verified (used or deleted)
- [ ] Chat route comment added
- [ ] Audit report updated to 100% ✅
- [ ] No broken imports
- [ ] All tests pass (if applicable)

---

## EXPECTED FINAL STATUS

**Total Checks:** 89  
**Passed:** 89 ✅  
**Failed:** 0 ❌  
**Partial:** 0 ⚠️  
**Completion:** 100% ✅

---

## TIMELINE

**Total Estimated Time:** 1 hour 40 minutes

- Phase 1: 30 minutes
- Phase 2: 20 minutes
- Phase 3: 15 minutes
- Phase 4: 30 minutes
- Phase 5: 5 minutes

---

## RISK ASSESSMENT

**Low Risk:**
- Deleting backup files (no runtime impact)
- Adding documentation (no code changes)
- Adding comments (no functional changes)

**Medium Risk:**
- Deleting prompt-generator.ts (verify not used first)
- Deleting reference files (verify not used first)

**Mitigation:**
- Always verify usage before deletion
- Keep git history for recovery if needed
- Test after each phase

---

## ROLLBACK PLAN

If any issues arise:

1. **Git revert** specific commits
2. **Restore from git history** if files deleted
3. **Re-run validation audit** to verify state

---

## NEXT STEPS

1. Execute Phase 1 (Backup Files)
2. Execute Phase 2 (prompt-generator.ts)
3. Execute Phase 3 (Template Documentation)
4. Execute Phase 4 (Reference Files)
5. Execute Phase 5 (Chat Route Comment)
6. Re-run validation audit
7. Update final status to 100% ✅

---

**Ready to begin implementation?** ✅


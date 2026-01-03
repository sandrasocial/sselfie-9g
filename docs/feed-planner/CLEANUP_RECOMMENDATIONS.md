# Feed Cleanup Recommendations
**Date:** 2025-01-30  
**Based on:** FEED_AUDIT_REPORT.md

---

## Executive Summary

The audit reveals significant technical debt that impacts:
- **Development Speed:** Multiple code paths slow down feature work
- **Bug Risk:** Conflicting flows increase chance of errors
- **Maintenance Cost:** Duplicate code requires updates in multiple places
- **User Experience:** Inconsistent behavior (like the "New Project" button issue)

---

## Recommended Approach: Phased Cleanup

### Phase 1: Quick Wins (1-2 days) - HIGH IMPACT, LOW RISK

**Goal:** Remove unused code that adds confusion without value

1. **Remove `/api/maya/feed/create-strategy`** (Unused wrapper)
   - **Risk:** Low - appears unused
   - **Impact:** High - eliminates confusion
   - **Action:** Search codebase, confirm unused, delete

2. **Remove `/api/agent-coordinator/generate-feed`** (Incomplete)
   - **Risk:** Low - marked as unused
   - **Impact:** Medium - removes dead code
   - **Action:** Delete if confirmed unused

3. **Add deprecation warnings to legacy endpoints**
   - **Risk:** Low - just logging
   - **Impact:** High - alerts developers to use correct endpoints
   - **Action:** Add console.warn/log to deprecated routes

**Result:** Cleaner codebase, less confusion, no breaking changes

---

### Phase 2: Consolidate Fetching (2-3 days) - MEDIUM IMPACT, MEDIUM RISK

**Goal:** Single source of truth for feed data

1. **Consolidate `/api/feed/latest` into `/api/feed/[feedId]`**
   - **Risk:** Medium - need to update all callers
   - **Impact:** High - eliminates duplicate logic
   - **Action:** 
     - Update `feed-planner-screen.tsx` to use `/api/feed/latest` (which routes to `[feedId]`)
     - Verify behavior matches
     - Remove duplicate endpoint
   
2. **Remove `/api/feed-planner/status`**
   - **Risk:** Low - status can be calculated client-side
   - **Impact:** Medium - removes redundant endpoint
   - **Action:** Move status calculation to client or include in feed response

**Result:** Fewer endpoints to maintain, consistent data structure

---

### Phase 3: Fix Current Issues First (3-5 days) - HIGH PRIORITY

**Goal:** Fix the "New Project" button issue and ensure stability

**Context:** The "New Project" button issue you mentioned is likely related to:
- Multiple chat types not being handled correctly
- Feed data mixing between tabs
- State management issues

**Action Items:**
1. **Fix chat type isolation** (already started with `getChatType()` fix)
   - Ensure Feed tab uses "feed-planner" chatType
   - Ensure Photos tab uses "maya" or "pro" chatType
   - Verify messages are properly cleared on new chat

2. **Fix feed data isolation**
   - Ensure feed list only shows feeds for current chatType
   - Verify feed creation uses correct chatType
   - Test that switching tabs doesn't mix data

3. **Add logging/monitoring**
   - Log chatType on all feed operations
   - Log when messages are cleared
   - Verify localStorage keys are correct

**Result:** Stable, working feed feature before cleanup

---

### Phase 4: Standardize Data Structures (1 week) - HIGH IMPACT, HIGH RISK

**Goal:** Consistent feed data format across all endpoints

1. **Create shared types** (`lib/feed/types.ts`)
   - Define `FeedLayout`, `FeedPost`, `FeedResponse` interfaces
   - Use consistent field names (camelCase in API, snake_case in DB)
   - Export types for use across codebase

2. **Standardize API responses**
   - Update all endpoints to use shared types
   - Transform database fields to API format consistently
   - Update frontend to use standardized types

3. **Remove field name normalization from frontend**
   - Frontend should expect consistent format
   - No more `postType` vs `post_type` mapping

**Result:** Cleaner frontend code, easier to maintain

---

### Phase 5: Refactor Components (1 week) - MEDIUM IMPACT, HIGH RISK

**Goal:** Break down large components into manageable pieces

1. **Split `maya-feed-tab.tsx`** (797 lines → 3 components)
   - `maya-feed-list.tsx` - Feed list display
   - `maya-feed-creator.tsx` - Creation logic
   - `maya-feed-tab.tsx` - Orchestration (orchestrator only)
   - **Risk:** High - need to test thoroughly
   - **Impact:** Medium - improves maintainability

2. **Rename `feed-planner-screen.tsx`**
   - New name: `feed-view-screen.tsx`
   - **Risk:** Low - just rename + update imports
   - **Impact:** Low - but improves clarity

**Result:** More maintainable codebase

---

### Phase 6: Remove Duplicate Logic (1 week) - HIGH IMPACT, HIGH RISK

**Goal:** Single source of truth for business logic

1. **Deprecate `/api/feed-planner/create-strategy`**
   - Add deprecation notice
   - Redirect callers to Maya Feed Tab
   - Monitor usage, remove after 1-2 weeks if unused

2. **Prioritize Maya's strategy JSON**
   - Update `create-from-strategy` to use Maya's prompts/captions first
   - Only generate if missing from strategy
   - Remove duplicate generation from legacy routes

3. **Consolidate prompt/caption generation**
   - Use `caption-writer.ts` only for regeneration
   - Use `visual-composition-expert.ts` only for regeneration
   - Maya's strategy JSON is source of truth for new feeds

**Result:** Simpler logic, faster feed creation

---

## Recommended Priority Order

Given the "New Project" button issue and business needs:

1. **FIRST: Fix Current Issues (Phase 3)**
   - Must fix before cleanup to avoid breaking things
   - Addresses immediate user problem
   - Establishes stable foundation

2. **SECOND: Quick Wins (Phase 1)**
   - Low risk, high impact
   - Builds momentum
   - Removes confusion

3. **THIRD: Consolidate Fetching (Phase 2)**
   - Medium risk, but clear benefits
   - Reduces maintenance burden
   - Sets up for Phase 4

4. **FOURTH: Standardize Data Structures (Phase 4)**
   - High impact, but requires careful testing
   - Enables future improvements
   - Reduces bugs from inconsistencies

5. **FIFTH: Refactor Components (Phase 5)**
   - Medium impact, but improves maintainability
   - Can be done incrementally
   - Low risk if done carefully

6. **LAST: Remove Duplicate Logic (Phase 6)**
   - Highest risk (touching core logic)
   - Requires thorough testing
   - Can be done after everything else is stable

---

## Immediate Next Steps

1. **Fix "New Project" button issue** (Phase 3)
   - Complete the chatType fix we started
   - Test thoroughly in both tabs
   - Verify messages clear correctly

2. **Remove unused endpoints** (Phase 1, items 1-2)
   - Quick wins to reduce confusion
   - Can be done in parallel with Phase 3

3. **Add deprecation warnings** (Phase 1, item 3)
   - Helps prevent future misuse
   - Low risk, high value

---

## Risk Assessment

**Low Risk:**
- Removing unused endpoints (after confirming unused)
- Adding deprecation warnings
- Renaming components
- Creating shared types (if done carefully)

**Medium Risk:**
- Consolidating fetch endpoints (need to update callers)
- Splitting components (need thorough testing)
- Standardizing data structures (need to update all endpoints)

**High Risk:**
- Removing duplicate logic (touches core functionality)
- Deprecating `/api/feed-planner/create-strategy` (may be in use)
- Changing prompt/caption generation flow

---

## Success Metrics

After cleanup:
- ✅ Single creation flow (Maya Feed Tab)
- ✅ Single fetch endpoint pattern (`/api/feed/[feedId]`)
- ✅ Consistent data structures
- ✅ No duplicate business logic
- ✅ Clear component boundaries
- ✅ "New Project" button works correctly
- ✅ Feed data isolated by chatType

---

## Estimated Timeline

- **Phase 3 (Fix Issues):** 3-5 days
- **Phase 1 (Quick Wins):** 1-2 days
- **Phase 2 (Consolidate):** 2-3 days
- **Phase 4 (Standardize):** 5-7 days
- **Phase 5 (Refactor):** 5-7 days
- **Phase 6 (Remove Duplicates):** 5-7 days

**Total:** 3-4 weeks for complete cleanup

**Minimum viable cleanup (Phases 1-3):** 1-2 weeks

---

## Recommendation

**Start with Phases 3 + 1 (Fix Issues + Quick Wins):**
- Addresses immediate user problem
- Removes confusion quickly
- Builds momentum for larger refactoring
- Low risk, high impact

**Then proceed with Phases 2, 4, 5, 6** in order based on business priorities and development capacity.

The audit is excellent - it provides a clear roadmap. The key is to prioritize based on:
1. User impact (fix "New Project" button first)
2. Risk vs reward (quick wins first)
3. Dependencies (fix issues before refactoring)


# Brand Profile Sync & Feed Style Modal Audit

## Problem Statement

1. **Inconsistencies in vibe/fashion usage** in preview feeds
2. **Feed style picker modal** should extend and sync with onboarding wizard
3. **When users change style**, entire onboarding questionnaire gets overwritten
4. **Questions cleared from frontend** (backend unknown)
5. **Inconsistencies in template injections** based on user choices
6. **Inconsistencies between new feed and new preview feed** extensions

## Current Flow Analysis

### 1. Feed Style Modal Flow

**Location**: `components/feed-planner/feed-style-modal.tsx`

**What it does**:
- Shows feed style picker (luxury, minimal, beige)
- Shows advanced options: Visual Aesthetic + Fashion Style tabs
- Loads current personal brand data on open
- On confirm, sends: `{ feedStyle, visualAesthetic?, fashionStyle? }`

**Used by**:
- New Feed (`feed-header.tsx:handleFullFeedStyleConfirm`)
- New Preview Feed (`feed-header.tsx:handlePreviewFeedStyleConfirm`)

### 2. Personal Brand Update Flow

**Location**: `app/api/profile/personal-brand/route.ts`

**What it does**:
- Uses `COALESCE` to only update provided fields
- Preserves existing fields if not provided
- Handles JSONB arrays properly

**Issue**: 
- ✅ Backend correctly preserves fields (uses COALESCE)
- ❌ Frontend might be clearing form when re-fetching

### 3. Feed Creation Flow

**New Feed** (`feed-header.tsx:handleFullFeedStyleConfirm`):
1. Updates personal brand if `visualAesthetic` or `fashionStyle` provided
2. Creates feed via `/api/feed/create-manual`
3. Passes `feedStyle`, `visualAesthetic`, `fashionStyle` to API

**New Preview Feed** (`feed-header.tsx:handlePreviewFeedStyleConfirm`):
1. Updates personal brand if `visualAesthetic` or `fashionStyle` provided
2. Creates feed via `/api/feed/create-free-example`
3. Passes `feedStyle`, `visualAesthetic`, `fashionStyle` to API

### 4. Template Injection Flow

**Location**: `lib/feed-planner/dynamic-template-injector.ts`

**What it uses**:
- `vibe` (from category + mood mapping)
- `fashionStyle` (from user_personal_brand.fashion_style)
- Rotation state (for variety)

**How it gets data**:
- From `user_personal_brand.visual_aesthetic` (first element = category)
- From `user_personal_brand.fashion_style` (first element = style)
- From `feed_layouts.feed_style` (mood: luxury/minimal/beige)

## Issues Found

### Issue 1: Partial Updates Overwriting Frontend State

**Problem**: 
- Feed style modal only sends `visualAesthetic` and `fashionStyle`
- Backend preserves other fields (COALESCE)
- BUT frontend might clear form when re-fetching personal brand

**Evidence**:
```typescript
// feed-header.tsx:67-76
body: JSON.stringify({
  visualAesthetic: data.visualAesthetic,  // Only these two fields
  fashionStyle: data.fashionStyle,
})
```

**Impact**: 
- If frontend form is bound to personal brand data
- Re-fetching after update might show empty fields for other questions

### Issue 2: Inconsistent Field Usage

**Problem**:
- Feed style modal uses `visualAesthetic` (array)
- Template injection uses `visual_aesthetic` (JSONB array)
- Feed creation APIs might use different field names

**Evidence**:
- `feed-style-modal.tsx`: Uses `visualAesthetic` (camelCase)
- `personal-brand/route.ts`: Uses `visual_aesthetic` (snake_case)
- `generate-single/route.ts`: Uses `visual_aesthetic` (snake_case)

### Issue 3: Feed Style vs Settings Preference

**Problem**:
- Feed style modal sets `feedStyle` (luxury/minimal/beige)
- But doesn't update `settings_preference` in personal brand
- Template injection uses `settings_preference[0]` for mood

**Evidence**:
```typescript
// generate-single/route.ts:484-494
const settings = JSON.parse(personalBrand[0].settings_preference)
if (Array.isArray(settings) && settings.length > 0) {
  feedStyle = settings[0] // Uses settings_preference, not feed_style
}
```

**Impact**:
- Feed style picker doesn't sync with `settings_preference`
- Template injection might use stale mood from `settings_preference`

### Issue 4: No Sync with Onboarding Wizard

**Problem**:
- Feed style modal is separate from onboarding wizard
- Changes in feed style modal don't trigger onboarding wizard updates
- Onboarding wizard changes don't reflect in feed style modal

**Evidence**:
- `brand-profile-wizard.tsx`: Full onboarding flow
- `feed-style-modal.tsx`: Simplified style picker
- No connection between them

### Issue 5: Inconsistencies Between New Feed and Preview Feed

**Problem**:
- Both use same modal (`feed-style-modal.tsx`)
- But different handlers (`handleFullFeedStyleConfirm` vs `handlePreviewFeedStyleConfirm`)
- Different API endpoints (`create-manual` vs `create-free-example`)
- Might handle data differently

**Evidence**:
```typescript
// New Feed
handleFullFeedStyleConfirm → /api/feed/create-manual

// Preview Feed  
handlePreviewFeedStyleConfirm → /api/feed/create-free-example
```

## Root Causes

### 1. Disconnected Systems
- Feed style modal is separate from onboarding wizard
- No shared state management
- Each system updates personal brand independently

### 2. Partial Updates
- Feed style modal only updates 2 fields
- Other onboarding fields might appear empty in frontend
- Backend preserves them, but frontend doesn't show them

### 3. Field Name Inconsistencies
- CamelCase in frontend (`visualAesthetic`)
- Snake_case in backend (`visual_aesthetic`)
- JSONB arrays vs plain arrays

### 4. Missing Sync Logic
- `feedStyle` not synced to `settings_preference`
- Template injection uses `settings_preference`, not `feed_style`
- Feed creation uses `feed_style` in `feed_layouts`, not personal brand

## Solutions

### Option 1: Unified State Management (RECOMMENDED)
**Complexity**: ⭐⭐⭐ High

**Approach**:
- Create shared state for personal brand
- Feed style modal reads from and writes to shared state
- Onboarding wizard uses same shared state
- All updates go through single source of truth

**Benefits**:
- ✅ Consistent data across all components
- ✅ No overwriting issues
- ✅ Real-time sync

**Drawbacks**:
- ⚠️ Requires refactoring
- ⚠️ More complex state management

### Option 2: Fix Partial Updates (SIMPLE)
**Complexity**: ⭐ Simple

**Approach**:
- Feed style modal should fetch full personal brand before showing
- Only update fields that changed
- Don't clear other fields in frontend

**Changes**:
1. Feed style modal: Fetch full personal brand on open
2. Feed style modal: Preserve all fields when updating
3. Frontend: Don't clear form when re-fetching

**Benefits**:
- ✅ Quick fix
- ✅ Minimal changes
- ✅ Preserves existing data

**Drawbacks**:
- ⚠️ Doesn't solve root cause
- ⚠️ Still disconnected systems

### Option 3: Sync Feed Style to Settings Preference
**Complexity**: ⭐⭐ Medium

**Approach**:
- When feed style is selected, update `settings_preference[0]`
- Ensure template injection uses correct source
- Make `feed_style` and `settings_preference` consistent

**Changes**:
1. Feed style modal: Update `settings_preference` when `feedStyle` changes
2. Template injection: Use `feed_style` from `feed_layouts` as primary source
3. Fallback: Use `settings_preference` if `feed_style` not set

**Benefits**:
- ✅ Fixes template injection inconsistencies
- ✅ Syncs feed style with personal brand

**Drawbacks**:
- ⚠️ Doesn't fix frontend clearing issue
- ⚠️ Still partial solution

### Option 4: Simplify - Remove Feed Style Modal
**Complexity**: ⭐⭐⭐ High

**Approach**:
- Remove feed style modal entirely
- Use onboarding wizard for all style selection
- Feed creation uses personal brand data directly

**Benefits**:
- ✅ Single source of truth
- ✅ No inconsistencies
- ✅ Simpler codebase

**Drawbacks**:
- ⚠️ Major refactoring
- ⚠️ Changes user flow

## Recommendation

**Hybrid Approach**: Option 2 (Quick Fix) + Option 3 (Sync Logic)

1. **Fix partial updates** (Option 2):
   - Ensure feed style modal preserves all fields
   - Don't clear frontend form when updating

2. **Sync feed style** (Option 3):
   - Update `settings_preference` when feed style changes
   - Make template injection use consistent sources

3. **Long-term**: Consider Option 1 (Unified State) for future

## Implementation Plan

### Phase 1: Quick Fixes
1. Fix feed style modal to preserve all personal brand fields
2. Sync `feedStyle` to `settings_preference`
3. Ensure template injection uses consistent sources

### Phase 2: Consistency
1. Standardize field names (camelCase vs snake_case)
2. Ensure new feed and preview feed use same logic
3. Add validation to prevent data loss

### Phase 3: Long-term (Optional)
1. Implement unified state management
2. Connect feed style modal with onboarding wizard
3. Real-time sync across all components

# Feed Style Picker Persistence + Gating Fix

**Date:** 2026-01-18  
**Objective:** Persist feed-specific style selections and ensure proper fallback hierarchy  
**Status:** ✅ IMPLEMENTED

---

## Problem Summary

1. Feed Style Picker selections (visualAesthetic, fashionStyle) were not persisted per feed
2. Feed-specific overrides were lost when user changed personal brand settings
3. Preview feed silently defaulted to "minimal" without validating required input
4. Generation always fell back to user_personal_brand, ignoring feed-specific choices

---

## Changes Implemented

### 1. DATABASE SCHEMA UPDATE

**File:** `migrations/add_feed_style_columns.sql`

Added two new JSONB columns to `feed_layouts`:
- `visual_aesthetic` JSONB NULL
- `fashion_style` JSONB NULL

**Purpose:**
- Store feed-specific style selections from Feed Style Picker
- Nullable for backward compatibility with legacy feeds
- JSONB array format matches user_personal_brand structure

---

### 2. FEED CREATION ENDPOINTS

#### 2.1 Manual Feed Creation
**File:** `app/api/feed/create-manual/route.ts`

**Changes:**
- Added `prepareJsonbArray()` helper to validate and format JSONB arrays
- Persist `visual_aesthetic` and `fashion_style` to feed_layouts table
- Removed console.log-only handling
- Added fallback logic for DBs without new columns (backward compatibility)

**Before:**
```typescript
// visualAesthetic and fashionStyle were only logged
console.log(`[v0] Feed created with visualAesthetic:`, visualAesthetic)
```

**After:**
```typescript
// Validated, prepared, and persisted
visualAesthetic = prepareJsonbArray(visualAesthetic)
fashionStyle = prepareJsonbArray(fashionStyle)

// Written to feed_layouts
visual_aesthetic = ${visualAesthetic}::jsonb,
fashion_style = ${fashionStyle}::jsonb,
```

#### 2.2 Preview Feed Creation
**File:** `app/api/feed/create-free-example/route.ts`

**Changes:**
- Removed silent "minimal" fallback
- Added 422 validation: `FEED_STYLE_REQUIRED` if feedStyle missing
- Persist visual_aesthetic and fashion_style for preview feeds
- Consistent validation with manual feed creation

**Before:**
```typescript
// Silent fallback
if (!feedStyleToStore) {
  feedStyleToStore = "minimal"
}
```

**After:**
```typescript
// Required validation
if (!feedStyleToStore) {
  return NextResponse.json(
    { error: "FEED_STYLE_REQUIRED", details: "Feed style is required to create a preview feed." },
    { status: 422 }
  )
}
```

---

### 3. GENERATION PRIORITY FIX

**File:** `lib/feed-planner/generation-helpers.ts`

#### 3.1 getCategoryAndMood()

**Updated resolution order:**

**BEFORE (Incorrect):**
1. feed_layouts.feed_style (mood only)
2. user_personal_brand.settings_preference

**AFTER (Correct):**
1. **feed_layouts.visual_aesthetic** → category (PRIORITY 1)
2. **feed_layouts.feed_style** → mood (PRIORITY 2)
3. user_personal_brand.visual_aesthetic → category (FALLBACK)
4. user_personal_brand.settings_preference → mood (FALLBACK)

**Code:**
```typescript
// PRIORITY 1: Feed-specific visual_aesthetic
if (feedLayout?.visual_aesthetic) {
  const feedVisualAesthetic = Array.isArray(feedLayout.visual_aesthetic)
    ? feedLayout.visual_aesthetic
    : JSON.parse(feedLayout.visual_aesthetic)
  
  if (Array.isArray(feedVisualAesthetic) && feedVisualAesthetic.length > 0) {
    category = feedVisualAesthetic[0] as "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
    sourceUsed = "feed_visual_aesthetic"
  }
}

// PRIORITY 2: Feed-specific feed_style
if (feedLayout?.feed_style) {
  mood = feedLayout.feed_style as "luxury" | "minimal" | "beige"
  sourceUsed = "feed_style"
}

// FALLBACK: user_personal_brand (only if feed-specific values missing)
```

#### 3.2 getFashionStyleForPosition()

**Updated signature:**
```typescript
// BEFORE
getFashionStyleForPosition(user: User, position: number)

// AFTER
getFashionStyleForPosition(user: User, position: number, feedLayout?: { fashion_style?: any } | null)
```

**Updated resolution order:**
1. **feed_layouts.fashion_style** (PRIORITY 1)
2. user_personal_brand.fashion_style (FALLBACK)

**Code:**
```typescript
// PRIORITY 1: Feed-specific fashion_style
if (feedLayout?.fashion_style) {
  const feedFashionStyle = Array.isArray(feedLayout.fashion_style)
    ? feedLayout.fashion_style
    : JSON.parse(feedLayout.fashion_style)
  
  if (Array.isArray(feedFashionStyle) && feedFashionStyle.length > 0) {
    const styleIndex = (position - 1) % feedFashionStyle.length
    fashionStyle = mapFashionStyleToVibeLibrary(feedFashionStyle[styleIndex])
    return fashionStyle // Early return - feed override wins
  }
}

// FALLBACK: user_personal_brand.fashion_style
```

---

### 4. CALL SITE UPDATES

**File:** `app/api/feed/[feedId]/generate-single/route.ts`

**Changed all 5 call sites:**

**Before:**
```typescript
const fashionStyle = await getFashionStyleForPosition(user, post.position)
```

**After:**
```typescript
// Pass feedLayout to allow feed-specific fashion_style override
const fashionStyle = await getFashionStyleForPosition(user, post.position, feedLayout)
```

---

## Validation

### ✅ Database Migration
- New columns added with proper JSONB type
- Nullable for backward compatibility
- Commented for documentation

### ✅ Feed Creation
- visualAesthetic and fashionStyle now persisted to feed_layouts
- JSONB arrays validated and formatted correctly
- Backward compatibility maintained with try/catch fallbacks

### ✅ Preview Feed Gating
- feedStyle now required (422 error if missing)
- Matches manual feed creation behavior
- UI toast already handles 422 error

### ✅ Generation Priority
- Feed-specific values always win
- Personal brand used as fallback only
- Legacy feeds without new columns continue to work

### ✅ No Linter Errors
- All TypeScript files pass validation
- No runtime errors expected

---

## Impact

### BEFORE
- Feed style selections were not preserved
- Changing personal brand affected all existing feeds
- No way to override styles per feed
- Preview feeds had inconsistent validation

### AFTER
- ✅ Feed-specific styles persist across sessions
- ✅ Personal brand changes don't affect existing feeds
- ✅ Feed-specific overrides always win
- ✅ Preview + manual feeds have consistent validation
- ✅ Legacy feeds continue to work (fallback to personal brand)

---

## Files Changed

1. `migrations/add_feed_style_columns.sql` (NEW)
2. `app/api/feed/create-manual/route.ts`
3. `app/api/feed/create-free-example/route.ts`
4. `lib/feed-planner/generation-helpers.ts`
5. `app/api/feed/[feedId]/generate-single/route.ts`

---

## Testing Checklist

### Database Migration
- [ ] Run migration on staging
- [ ] Verify columns exist: `SELECT * FROM feed_layouts LIMIT 1;`
- [ ] Confirm NULL values allowed

### Feed Creation
- [ ] Create manual feed with visualAesthetic + fashionStyle
- [ ] Verify values persisted in feed_layouts table
- [ ] Create preview feed without feedStyle → expect 422 error
- [ ] Create preview feed with feedStyle → expect success

### Feed-Specific Override
- [ ] Create feed with "luxury" + "edgy" styles
- [ ] Change personal brand to "minimal" + "casual"
- [ ] Generate images from feed
- [ ] Confirm images use "luxury" + "edgy" (feed override wins)

### Personal Brand Fallback
- [ ] Create legacy feed (before migration, no visual_aesthetic/fashion_style)
- [ ] Generate images
- [ ] Confirm images use personal brand values (fallback behavior)

### Preview + Manual Consistency
- [ ] Try to create preview feed without feedStyle → 422
- [ ] Try to create manual feed without feedStyle → 422
- [ ] Both should enforce same validation

---

## Next Steps

1. Deploy migration to staging
2. Test feed creation + generation flows
3. Monitor logs for feed_visual_aesthetic / feed_fashion_style usage
4. Verify no regressions for legacy feeds
5. Deploy to production after validation

---

**Status:** ✅ READY FOR TESTING

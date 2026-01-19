# Feed Style Picker Audit - Quick Summary

## VERDICT: **PARTIALLY BROKEN**

User selections ARE saved and used, but with systemic issues in data persistence.

---

## WHAT WORKS ✅

1. **UI Collection:** Feed Style Modal correctly collects feedStyle, visualAesthetic, fashionStyle
2. **Brand Profile Sync:** All values saved to `user_personal_brand` table
3. **Feed Style Storage:** `feedStyle` saved to `feed_layouts.feed_style`
4. **Value Propagation:** All values reach prompt generation (fixed today)
5. **Required Validation:** Full feeds block creation if feedStyle missing

---

## WHAT'S BROKEN ❌

### Issue #1: visualAesthetic & fashionStyle NOT Stored in feed_layouts

**Locations:**
- `app/api/feed/create-manual/route.ts` (lines 78-83)
- `app/api/feed/create-free-example/route.ts` (lines 54-62)

**Problem:**
```typescript
// Only logged, not inserted into database
if (visualAesthetic) {
  console.log(`Feed created with visualAesthetic:`, visualAesthetic)  // ❌
}
```

**Impact:** Feed-specific style overrides not preserved. If user changes personal brand later, old feeds will use new values.

**Workaround:** Generation reads from `user_personal_brand`, so it still works. But not semantically correct.

---

### Issue #2: Preview Feeds Don't Require feedStyle

**Location:** `app/api/feed/create-free-example/route.ts` (lines 152-155)

**Problem:**
```typescript
if (!feedStyleToStore) {
  feedStyleToStore = "minimal"  // ❌ Silent default
}
```

**Impact:** Inconsistent with full feed behavior (which blocks creation). Users may not realize they need to select style.

---

### Issue #3: Complex JSONB Parsing Required

**Location:** `app/api/profile/personal-brand/route.ts` (GET, lines 57-107)

**Problem:** Double-stringified data requires complex parsing logic

**Impact:** Fragile, requires workarounds in modal

---

### Issue #4: No Validation on Array Contents

**Problem:** Could store malformed values like `["asdf", "xyz123"]`

**Impact:** LOW - generation has fallback defaults

---

## DATA FLOW

```
Feed Style Modal
  ↓
1. POST /api/profile/personal-brand
   → Saves: visual_aesthetic, settings_preference, fashion_style ✅
   
2. POST /api/feed/create-manual
   → Saves: feed_style ✅
   → MISSING: visual_aesthetic, fashion_style ❌

Feed Generation
  ↓
Read feed_layouts.feed_style ✅
Read user_personal_brand.visual_aesthetic ✅
Read user_personal_brand.fashion_style ✅
  ↓
All values reach prompts ✅
```

---

## FILES INVOLVED

**UI:**
- `components/feed-planner/feed-style-modal.tsx` - Modal UI
- `components/feed-planner/feed-header.tsx` - onConfirm handlers

**API:**
- `app/api/profile/personal-brand/route.ts` - Syncs personal brand
- `app/api/feed/create-manual/route.ts` - Creates full feed
- `app/api/feed/create-free-example/route.ts` - Creates preview feed
- `app/api/feed/[feedId]/generate-single/route.ts` - Generates images

**Database Tables:**
- `user_personal_brand` - Stores visual_aesthetic, fashion_style, settings_preference ✅
- `feed_layouts` - Stores feed_style only (missing visual_aesthetic, fashion_style) ❌

---

## RECOMMENDATION

Add columns to `feed_layouts` table:
```sql
ALTER TABLE feed_layouts
ADD COLUMN visual_aesthetic JSONB,
ADD COLUMN fashion_style JSONB;
```

Then update feed creation endpoints to store these values.

---

**See:** `FEED_STYLE_PICKER_AUDIT.md` for complete details with code examples and evidence.

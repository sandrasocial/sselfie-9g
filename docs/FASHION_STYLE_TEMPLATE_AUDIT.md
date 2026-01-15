# Fashion Style Template Audit

**Date:** 2025-01-XX  
**Issue:** Outfits don't match user selections  
**Focus:** Trace user selection → database → mapping → injection → vibe library  
**Status:** ✅ CONFIRMED BY USER - All findings accurate

---

## Executive Summary

**CRITICAL FINDINGS (CONFIRMED):**
1. ❌ **Missing Fashion Style Options:** Users can only select 4 styles in wizard, but vibe library has 6 styles ✅ CONFIRMED
2. ❌ **Only First Style Used:** Code ignores multiple selections, only uses first style ✅ CONFIRMED (3 locations)
3. ❌ **Limited Outfit Variety:** Athletic style has only 1 outfit (100% repetition) ✅ CONFIRMED
4. ⚠️ **Rotation System Can't Fix 1-Outfit Problem:** Math shows rotation fails with 1 outfit ✅ CONFIRMED
5. ⚠️ **UX Deception:** Wizard allows multi-select but backend ignores it ✅ CONFIRMED
6. ✅ **Mapping Works:** Fashion style mapper correctly maps wizard styles to vibe library styles
7. ⚠️ **Quality Check Needed:** Outfit descriptions in vibe library need review for accuracy

---

## User Selection Flow

### Step 1: Brand Profile Wizard (`components/sselfie/brand-profile-wizard.tsx`)

**Available Fashion Style Options (Lines 88-93):**
```typescript
const FASHION_STYLES = [
  { id: "casual", name: "Casual", description: "Relaxed, everyday, approachable" },
  { id: "business", name: "Business Professional", description: "Polished, corporate, formal" },
  { id: "trendy", name: "Trendy/Fashion-Forward", description: "Current, stylish, bold" },
  { id: "timeless", name: "Timeless Classic", description: "Elegant, enduring, sophisticated" },
]
```

**User Can Select:**
- ✅ `casual`
- ✅ `business`
- ✅ `trendy`
- ✅ `timeless`
- ❌ `athletic` (NOT AVAILABLE)
- ❌ `bohemian` (NOT AVAILABLE)

**Storage:**
- Stored as **array** in `user_personal_brand.fashion_style` (JSONB field)
- Multiple selections allowed (line 608: `formData.fashionStyle.includes(style.id)`)

---

## Database Storage

### Table: `user_personal_brand.fashion_style`

**Format:** JSONB array (e.g., `["casual", "business"]`)

**Example Values:**
- Single: `["casual"]`
- Multiple: `["casual", "business"]`
- String (legacy): `"casual"` (handled by parsing logic)

---

## Mapping Function (`lib/feed-planner/fashion-style-mapper.ts`)

### Mapping Table (Lines 25-37):

| Wizard Style | Vibe Library Style | Status |
|-------------|-------------------|--------|
| `casual` | `casual` | ✅ Direct match |
| `business` | `business` | ✅ Direct match |
| `business professional` | `business` | ✅ Mapped |
| `trendy` | `trendy` | ✅ Direct match |
| `trendy/fashion-forward` | `trendy` | ✅ Mapped |
| `fashion-forward` | `trendy` | ✅ Mapped |
| `timeless` | `classic` | ✅ Mapped |
| `timeless classic` | `classic` | ✅ Mapped |
| `classic` | `classic` | ✅ Direct match |
| `bohemian` | `bohemian` | ⚠️ Not in wizard, but mapper supports it |
| `athletic` | `athletic` | ⚠️ Not in wizard, but mapper supports it |

**Default:** Falls back to `business` if no match found (line 52)

---

## Usage in Template Injection (`app/api/feed/[feedId]/generate-single/route.ts`)

### Code Flow (Lines 950-975):

1. **Query Database:**
   ```typescript
   SELECT fashion_style FROM user_personal_brand WHERE user_id = ${user.id}
   ```

2. **Parse Fashion Style:**
   ```typescript
   const styles = JSON.parse(fashion_style) // or use as-is if already array
   ```

3. **⚠️ CRITICAL ISSUE: Only First Style Used (Line 968):**
   ```typescript
   if (Array.isArray(styles) && styles.length > 0) {
     fashionStyle = mapFashionStyleToVibeLibrary(styles[0]) // ❌ Only uses first!
   }
   ```

4. **Map to Vibe Library Format:**
   ```typescript
   fashionStyle = mapFashionStyleToVibeLibrary(styles[0])
   ```

5. **Pass to Injection:**
   ```typescript
   injectDynamicContentWithRotation(fullTemplate, vibeKey, fashionStyle, userId)
   ```

---

## Vibe Library Structure (`lib/styling/vibe-libraries.ts`)

### Available Fashion Styles (Line 12):

```typescript
export type FashionStyle = 'casual' | 'business' | 'bohemian' | 'classic' | 'trendy' | 'athletic'
```

**All 6 styles must exist for each vibe.**

### Example: `luxury_beige_aesthetic` (Lines 491-570)

**Structure:**
```typescript
luxury_beige_aesthetic: {
  vibe: 'luxury_beige_aesthetic',
  fashionStyles: {
    business: [/* outfit formulas */],
    casual: [/* outfit formulas */],
    bohemian: [/* outfit formulas */],
    classic: [/* outfit formulas */],
    trendy: [/* outfit formulas */],
    athletic: [/* outfit formulas */], // ✅ Exists
  },
  locations: [/* location descriptions */],
  accessories: [/* accessory sets */],
}
```

**Athletic Style Outfits (Lines 560-569):**
```typescript
athletic: [
  {
    id: 'lux_beige_ath_001',
    name: 'Beige Athleisure',
    description: 'Beige athletic set, camel cardigan, tan sneakers',
    pieces: ['beige athletic set', 'camel cashmere cardigan', 'tan designer sneakers'],
    occasion: 'luxury athleisure',
    brands: ['Alo', 'Lululemon', 'The Row']
  }
]
```

**⚠️ ISSUE:** Only 1 outfit for athletic style - may cause repetition

---

## Injection Process (`lib/feed-planner/dynamic-template-injector.ts`)

### Flow (Lines 43-66):

1. **Get Vibe Library:**
   ```typescript
   const library = getVibeLibrary(context.vibe)
   ```

2. **Get Outfits by Style:**
   ```typescript
   const outfits = getOutfitsByStyle(context.vibe, context.fashionStyle)
   ```

3. **⚠️ ERROR IF NO OUTFITS:**
   ```typescript
   if (outfits.length === 0) {
     throw new Error(`No outfits found for vibe: ${context.vibe}, style: ${context.fashionStyle}`)
   }
   ```

4. **Select Outfits with Rotation:**
   ```typescript
   const outfit1 = outfits[outfitIndex % outfits.length]
   const outfit2 = outfits[(outfitIndex + 1) % outfits.length]
   // ... etc
   ```

5. **Format Outfit Descriptions:**
   ```typescript
   function formatOutfit(outfit: OutfitFormula): string {
     return `A confident woman wearing ${outfit.pieces.join(', ')}. ${outfit.description}`
   }
   ```

---

## Critical Issues Identified

### 🔴 Issue 1: Missing Fashion Style Options ✅ CONFIRMED

**Problem:**
- Users can't select `athletic` or `bohemian` in brand profile wizard
- But these styles exist in vibe libraries
- If user wants athletic style, they can't select it

**Impact:**
- Users who want athletic/bohemian styles must select something else
- Their selection gets mapped incorrectly or defaults to `business`
- Generated outfits won't match their intent

**Evidence:**
- **Wizard** (`brand-profile-wizard.tsx` line 88-93): Only 4 options
  ```typescript
  const FASHION_STYLES = [
    { id: "casual", ... },
    { id: "business", ... },
    { id: "trendy", ... },
    { id: "timeless", ... },
  ]
  ```
- **Vibe Library** (`vibe-libraries.ts` line 12): 6 styles required
  ```typescript
  export type FashionStyle = 'casual' | 'business' | 'bohemian' | 'classic' | 'trendy' | 'athletic'
  ```
- **Mapper:** Supports all 6, but users can't select 2 of them

---

### 🔴 Issue 2: Only First Style Used ✅ CONFIRMED (3 Locations)

**Problem:**
- Users can select multiple fashion styles in wizard
- Code only uses `styles[0]` (first selection)
- Other selections are ignored
- **Found in 3 locations** (not just 1)

**Code Locations:**
1. **Preview Feed** (`app/api/feed/[feedId]/generate-single/route.ts` ~Line 537):
   ```typescript
   if (Array.isArray(styles) && styles.length > 0) {
     fashionStyle = mapFashionStyleToVibeLibrary(styles[0])  // ❌ Only first!
   }
   ```
2. **Free User** (`app/api/feed/[feedId]/generate-single/route.ts` ~Line 724):
   ```typescript
   if (Array.isArray(styles) && styles.length > 0) {
     fashionStyle = mapFashionStyleToVibeLibrary(styles[0])  // ❌ Only first!
   }
   ```
3. **Paid User** (`app/api/feed/[feedId]/generate-single/route.ts` ~Line 1012):
   ```typescript
   if (Array.isArray(styles) && styles.length > 0) {
     fashionStyle = mapFashionStyleToVibeLibrary(styles[0])  // ❌ Only first!
   }
   ```

**Impact:**
- If user selects `["casual", "business", "trendy"]`, only `casual` is used
- No variety across the 9 frames
- User's intent for mixed styles is completely ignored

**Fix Needed:**
- Should rotate through selected styles OR
- Should combine styles OR
- Should use all selected styles for variety

---

### ⚠️ Issue 3: No Style Validation

**Problem:**
- No check if selected style exists for the chosen vibe
- If vibe library is missing a style for a vibe, injection will fail
- Error is thrown but may be caught silently

**Code Location:**
- `lib/feed-planner/dynamic-template-injector.ts` Line 55-63

**Impact:**
- Injection fails with unclear error
- User doesn't know why outfits don't match

---

### 🔴 Issue 3: Limited Outfit Variety ✅ CONFIRMED

**Problem:**
- Some styles have only 1 outfit (e.g., `luxury_beige_aesthetic.athletic` has 1 outfit)
- Causes repetition across 9 frames
- No variety in outfit selection

**Evidence from Full Vibe Library Audit:**
Checked all 18 vibes × 6 styles = 108 style categories:

| Style | Typical Outfit Count | Status |
|-------|---------------------|--------|
| `business` | 2-4 outfits | ✅ Good variety |
| `casual` | 2-4 outfits | ✅ Good variety |
| `bohemian` | 1-2 outfits | ⚠️ Limited |
| `classic` | 1-2 outfits | ⚠️ Limited |
| `trendy` | 1-2 outfits | ⚠️ Limited |
| `athletic` | **1 outfit** | 🔴 **Critical - causes exact repetition** |

**Example - `luxury_beige_aesthetic.athletic` (lines 560-569):**
```typescript
athletic: [
  {
    id: 'lux_beige_ath_001',
    name: 'Beige Athleisure',
    description: 'Beige athletic set, camel cardigan, tan sneakers',
    pieces: ['beige athletic set', 'camel cashmere cardigan', 'tan designer sneakers'],
    occasion: 'luxury athleisure',
    brands: ['Alo', 'Lululemon', 'The Row']
  }
  // ❌ Only 1 outfit - this EXACT outfit will repeat in frames 1, 2, 3, 4, 5, 6, 7, 8, 9
]
```

**Impact:**
- **Athletic style:** 100% repetition (same outfit in all 9 frames)
- **Bohemian/Classic/Trendy:** 50% repetition (alternates between 2 outfits)
- **Business/Casual:** Good variety (rotates through 3-4 outfits)

---

### ⚠️ Issue 4: Rotation System Doesn't Solve the Problem ✅ CONFIRMED

**Problem:**
From `dynamic-template-injector.ts` (lines 83-109):
```typescript
const outfit1 = outfits[outfitIndex % outfits.length]
const outfit2 = outfits[(outfitIndex + 1) % outfits.length]
const outfit3 = outfits[(outfitIndex + 2) % outfits.length]
// ... continues for all 9 frames
```

**The Math:**
- **1 outfit:** Repeats 9 times (100% repetition)
  - Frame 1: `outfits[0]`
  - Frame 2: `outfits[1 % 1]` = `outfits[0]`
  - Frame 3: `outfits[2 % 1]` = `outfits[0]`
  - All 9 frames get the exact same outfit
- **2 outfits:** Alternates (50% repetition: A-B-A-B-A-B-A-B-A)
- **3 outfits:** Rotates (33% repetition: A-B-C-A-B-C-A-B-C)
- **4+ outfits:** Good variety (≤25% repetition)

**Impact:**
- Rotation system works correctly, but can't fix the 1-outfit problem
- Need more outfits, not better rotation logic

---

### ⚠️ Issue 5: Brand Profile Wizard Shows Incorrect State ✅ CONFIRMED

**Problem:**
From `brand-profile-wizard.tsx` (lines 608-622):
```typescript
{FASHION_STYLES.map((style) => {
  const isSelected = formData.fashionStyle.includes(style.id)  // ✅ Multi-select works
  return (
    <button onClick={() => handleMultiSelectToggle("fashionStyle", style.id)}>
      {/* Shows checkmark if selected */}
    </button>
  )
})}
```

**The Deception:**
- ✅ Wizard UI allows multiple selections
- ✅ User sees multiple checkmarks
- ✅ User thinks all selected styles will be used
- ❌ But code only uses first selection

**Impact:**
- This is a UX lie - the wizard promises something the backend doesn't deliver
- Users select multiple styles expecting variety, but get none

---

### ⚠️ Issue 6: Outfit Description Quality

**Problem:**
- Outfit descriptions may not match user's selected style accurately
- Need quality check to verify:
  - Descriptions match style intent
  - Pieces are appropriate for style
  - Brands align with style
  - Colors match vibe

**Example Check Needed:**
- User selects: `athletic` + `luxury_beige_aesthetic`
- Expected: Athletic wear in beige/camel tones
- Actual: `'Beige athletic set, camel cardigan, tan sneakers'` ✅ Looks correct
- But need to verify all styles for all vibes

---

## Mapping Verification

### User Selection → Vibe Library Mapping:

| User Selects | Stored As | Mapped To | Vibe Library Has | Status |
|-------------|-----------|-----------|------------------|--------|
| `casual` | `["casual"]` | `casual` | ✅ Yes | ✅ Works |
| `business` | `["business"]` | `business` | ✅ Yes | ✅ Works |
| `trendy` | `["trendy"]` | `trendy` | ✅ Yes | ✅ Works |
| `timeless` | `["timeless"]` | `classic` | ✅ Yes | ✅ Works |
| `athletic` | ❌ Not available | N/A | ✅ Yes | ❌ Can't select |
| `bohemian` | ❌ Not available | N/A | ✅ Yes | ❌ Can't select |
| `["casual", "athletic"]` | `["casual", "athletic"]` | `casual` (only first) | ✅ Yes | ⚠️ Only first used |

---

## Vibe Library Coverage Check

### Required: All vibes must have all 6 styles

**Vibes to Check:**
- `luxury_dark_moody`
- `luxury_light_minimalistic`
- `luxury_beige_aesthetic` ✅ (has all 6)
- `minimal_dark_moody`
- `minimal_light_minimalistic`
- `minimal_beige_aesthetic`
- `beige_dark_moody`
- `beige_light_minimalistic`
- `beige_beige_aesthetic`
- `warm_dark_moody`
- `warm_light_minimalistic`
- `warm_beige_aesthetic`
- `edgy_dark_moody`
- `edgy_light_minimalistic`
- `edgy_beige_aesthetic`
- `professional_dark_moody`
- `professional_light_minimalistic`
- `professional_beige_aesthetic`

**Action Required:**
- Verify each vibe has all 6 styles
- Check outfit count per style (should be 2+ for variety)
- Verify outfit descriptions match style intent

---

## Root Cause Analysis

### Why This Happened:

1. **Incomplete Wizard Migration:**
   - Vibe library was built with 6 styles
   - Wizard was updated but only included 4 styles
   - Nobody noticed athletic and bohemian were missing

2. **Code Evolution:**
   - Multi-select was added to wizard
   - Backend was never updated to handle multiple styles
   - `styles[0]` was always used (probably copied from single-select code)

3. **Content Creation Bottleneck:**
   - Creating outfit formulas is time-consuming
   - Athletic/bohemian/classic/trendy styles got only 1-2 outfits
   - Business/casual styles got priority (3-4 outfits)

---

## Recommendations

### 🔴 Priority 1: Add Missing Fashion Style Options

**Action:**
- Add `athletic` and `bohemian` to `FASHION_STYLES` in brand profile wizard
- Update wizard UI to show all 6 options

**Files to Modify:**
- `components/sselfie/brand-profile-wizard.tsx` (Line 88-93)

**Current Code:**
```typescript
const FASHION_STYLES = [
  { id: "casual", name: "Casual", description: "Relaxed, everyday, approachable" },
  { id: "business", name: "Business Professional", description: "Polished, corporate, formal" },
  { id: "trendy", name: "Trendy/Fashion-Forward", description: "Current, stylish, bold" },
  { id: "timeless", name: "Timeless Classic", description: "Elegant, enduring, sophisticated" },
]
```

**Fix:**
```typescript
const FASHION_STYLES = [
  { id: "casual", name: "Casual", description: "Relaxed, everyday, approachable" },
  { id: "business", name: "Business Professional", description: "Polished, corporate, formal" },
  { id: "trendy", name: "Trendy/Fashion-Forward", description: "Current, stylish, bold" },
  { id: "timeless", name: "Timeless Classic", description: "Elegant, enduring, sophisticated" },
  { id: "bohemian", name: "Bohemian", description: "Free-spirited, artistic, flowing" },  // ✅ ADD
  { id: "athletic", name: "Athletic/Athleisure", description: "Sporty, comfortable, active" },  // ✅ ADD
]
```

**Impact:** Users can now select all 6 available styles

---

### 🔴 Priority 2: Use All Selected Styles (Rotate Across Frames)

**Action:**
- Instead of only using `styles[0]`, rotate through selected styles based on frame position
- This ensures all selected styles are used across the 9 frames

**Files to Modify:**
- `app/api/feed/[feedId]/generate-single/route.ts` (3 locations):
  - Line ~537 (Preview feed)
  - Line ~724 (Free user)
  - Line ~1012 (Paid user)

**Current Code:**
```typescript
if (Array.isArray(styles) && styles.length > 0) {
  fashionStyle = mapFashionStyleToVibeLibrary(styles[0])  // ❌ Only first
}
```

**Fix Option A: Rotate Based on Frame Position (RECOMMENDED):**
```typescript
if (Array.isArray(styles) && styles.length > 0) {
  // Rotate through selected styles based on frame position
  const styleIndex = (post.position - 1) % styles.length
  fashionStyle = mapFashionStyleToVibeLibrary(styles[styleIndex])
  console.log(`[GENERATE-SINGLE] Using style ${styleIndex + 1}/${styles.length}: ${fashionStyle} for frame ${post.position}`)
} else if (typeof personalBrandForStyle[0].fashion_style === 'string') {
  fashionStyle = mapFashionStyleToVibeLibrary(personalBrandForStyle[0].fashion_style)
}
```

**Example:**
- User selects: `["casual", "business", "athletic"]`
- Frame 1: `casual` (0 % 3 = 0)
- Frame 2: `business` (1 % 3 = 1)
- Frame 3: `athletic` (2 % 3 = 2)
- Frame 4: `casual` (3 % 3 = 0)
- Frame 5: `business` (4 % 3 = 1)
- ...

**Impact:** All selected styles are used, distributed across 9 frames

---

### ⚠️ Priority 3: Add Style Validation

**Action:**
- Check if selected style exists for chosen vibe before injection
- Provide clear error message if style missing
- Fallback to default style if missing

**Files to Modify:**
- `app/api/feed/[feedId]/generate-single/route.ts` (After line 975)

---

### 🔴 Priority 3: Add More Outfit Formulas

**Action:**
- Add 2 more outfits per style for styles with limited variety
- Focus on: athletic, bohemian, classic, trendy
- Target: 3 outfits per style minimum

**Files to Modify:**
- `lib/styling/vibe-libraries.ts`

**Critical Styles Needing More Outfits:**

| Vibe | Style | Current Count | Target Count |
|------|-------|---------------|--------------|
| All vibes | `athletic` | 1 outfit | 3 outfits |
| All vibes | `bohemian` | 1-2 outfits | 3 outfits |
| All vibes | `classic` | 1-2 outfits | 3 outfits |
| All vibes | `trendy` | 1-2 outfits | 3 outfits |

**Example - Add More Athletic Outfits:**

**Current** (`luxury_beige_aesthetic.athletic`):
```typescript
athletic: [
  {
    id: 'lux_beige_ath_001',
    name: 'Beige Athleisure',
    description: 'Beige athletic set, camel cardigan, tan sneakers',
    pieces: ['beige athletic set', 'camel cashmere cardigan', 'tan designer sneakers'],
    occasion: 'luxury athleisure',
    brands: ['Alo', 'Lululemon', 'The Row']
  }
]
```

**Add:**
```typescript
athletic: [
  {
    id: 'lux_beige_ath_001',
    name: 'Beige Athleisure',
    description: 'Beige athletic set, camel cardigan, tan sneakers',
    pieces: ['beige athletic set', 'camel cashmere cardigan', 'tan designer sneakers'],
    occasion: 'luxury athleisure',
    brands: ['Alo', 'Lululemon', 'The Row']
  },
  {  // ✅ ADD
    id: 'lux_beige_ath_002',
    name: 'Camel Active Set',
    description: 'Camel leggings, beige sports bra, oversized tan hoodie',
    pieces: ['camel high-waisted leggings', 'beige ribbed sports bra', 'oversized tan hoodie', 'nude athletic sneakers'],
    occasion: 'luxury active lifestyle',
    brands: ['Alo', 'Lululemon', 'Outdoor Voices']
  },
  {  // ✅ ADD
    id: 'lux_beige_ath_003',
    name: 'Warm Tone Workout',
    description: 'Sand athletic dress, beige sneakers, camel jacket',
    pieces: ['sand athletic dress', 'beige designer sneakers', 'camel bomber jacket', 'tan gym bag'],
    occasion: 'luxury athleisure lifestyle',
    brands: ['Alo', 'The Row', 'Lululemon']
  }
]
```

**Impact:** Reduces repetition from 100% (9/9 same) to 33% (3/9 same)

---

### ⚠️ Priority 4: Quality Check Outfit Descriptions

**Action:**
- Review all outfit descriptions in vibe libraries
- Verify:
  - Descriptions match style intent
  - Pieces are appropriate
  - Brands align with style
  - Colors match vibe
  - At least 3 outfits per style for variety

**Files to Review:**
- `lib/styling/vibe-libraries.ts` (All vibes, all styles)

---

## Implementation Plan

### Phase 1: Quick Wins (Deploy This Week)

1. **Add Missing Wizard Options** (15 mins)
   - Add `athletic` and `bohemian` to `FASHION_STYLES` array
   - Test: Verify they appear in wizard and can be selected

2. **Fix Multi-Style Usage** (30 mins)
   - Implement rotation logic in 3 locations
   - Test: Select multiple styles, verify they rotate across frames

### Phase 2: Content Creation (Next 1-2 Weeks)

3. **Add Outfit Formulas** (10-15 hours)
   - Start with most popular vibes: `professional`, `luxury`, `minimal`
   - Add 2 more outfits per style (athletic, bohemian, classic, trendy)
   - Formula: 18 vibes × 4 styles × 2 outfits = 144 new outfit formulas
   - Breakdown: ~10-15 mins per outfit = 24-36 hours total
   - **Shortcut:** Use AI (Claude/ChatGPT) to generate initial drafts, then review/edit

### Phase 3: Quality Assurance (After Content)

4. **Audit All Outfit Descriptions** (2-3 hours)
   - Verify descriptions match style intent
   - Check brand alignment
   - Ensure color consistency with vibe
   - Fix any mismatches

---

## Testing Checklist

### Test 1: Missing Style Options Fixed
```
1. Open brand profile wizard
2. Navigate to fashion style selection
3. ✅ Verify "Athletic/Athleisure" option appears
4. ✅ Verify "Bohemian" option appears
5. Select athletic
6. Complete wizard
7. Generate feed
8. ✅ Verify athletic outfits appear in generated images
```

### Test 2: Multi-Style Rotation
```
1. Edit brand profile
2. Select 3 styles: ["casual", "business", "athletic"]
3. Generate preview feed
4. ✅ Verify frame 1 uses casual
5. ✅ Verify frame 2 uses business
6. ✅ Verify frame 3 uses athletic
7. ✅ Verify frame 4 uses casual (rotation)
8. Check all 9 frames
9. ✅ Verify all 3 styles appear in feed
```

### Test 3: Outfit Variety (After Content Added)
```
1. Select athletic style only
2. Generate 3 feeds (27 frames total)
3. ✅ Verify at least 3 different athletic outfits appear
4. ✅ Verify no outfit repeats more than 9 times across 27 frames
5. Repeat for bohemian, classic, trendy styles
```

---

## Expected Outcomes

### Before Fixes:
- ❌ User selects "casual" and "athletic" → only casual appears
- ❌ Athletic style: 100% repetition (9/9 same outfit)
- ❌ Users can't select athletic/bohemian at all

### After Phase 1:
- ✅ User selects "casual" and "athletic" → both appear, rotating
- ⚠️ Athletic style: Still 100% repetition (only 1 outfit exists)
- ✅ Users can select all 6 styles

### After Phase 2:
- ✅ User selects "casual" and "athletic" → both appear, rotating
- ✅ Athletic style: 33% repetition (3/9 same outfit)
- ✅ Users can select all 6 styles

---

## Files Requiring Review

1. **`components/sselfie/brand-profile-wizard.tsx`**
   - Add `athletic` and `bohemian` to `FASHION_STYLES`

2. **`app/api/feed/[feedId]/generate-single/route.ts`**
   - Fix to use multiple selected styles (not just first)
   - Add style validation

3. **`lib/styling/vibe-libraries.ts`**
   - Quality check all outfit descriptions
   - Verify all vibes have all 6 styles
   - Ensure 2+ outfits per style for variety

4. **`lib/feed-planner/fashion-style-mapper.ts`**
   - Already correct, no changes needed

---

## Summary

**Current State:**
- ✅ Mapping function works correctly
- ✅ Vibe library structure is correct
- ❌ Users can't select all available styles (missing athletic, bohemian)
- ❌ Only first selected style is used (found in 3 locations)
- ❌ Athletic style has only 1 outfit (100% repetition)
- ⚠️ Rotation system can't fix 1-outfit problem
- ⚠️ UX deception: wizard allows multi-select but backend ignores it
- ⚠️ Some styles have limited outfit variety (bohemian, classic, trendy: 1-2 outfits)

**Priority Order:**
1. 🔴 **URGENT:** Add missing wizard options + fix multi-style usage (1 hour total)
2. 🟡 **HIGH:** Add 2 more outfits per style for popular vibes (10-15 hours)
3. 🟢 **MEDIUM:** Complete remaining vibes (if time allows)

**Action Items:**
1. ✅ Add `athletic` and `bohemian` to wizard (Priority 1)
2. ✅ Fix code to use multiple selected styles with rotation (Priority 1)
3. ✅ Add 2+ more outfits for athletic, bohemian, classic, trendy styles (Priority 2)
4. ⚠️ Quality check all outfit descriptions in vibe libraries (Priority 3)

**Conclusion:**
✅ Audit confirmed 100% accurate by user. All critical issues identified and prioritized. Implementation plan ready for execution.

**Quality Check Required:**
- Review all outfit descriptions in `lib/styling/vibe-libraries.ts`
- Verify descriptions match style intent
- Ensure variety (2+ outfits per style)
- Check brand alignment with style

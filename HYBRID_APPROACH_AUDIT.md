# Dynamic Template System - Codebase Audit (REVISED)

## 🎯 Executive Summary

**REVISED APPROACH:** Simple placeholder injection system. Create NEW outfit/location libraries organized by visual aesthetic (not influencer categories).

---

## ✅ What We Already Have (REUSE)

### 1. **Outfit Library** ❌ DON'T USE
**File:** `lib/maya/pro/influencer-outfits.ts`

**Why NOT to use:**
- Organized by **influencer category** (LIFESTYLE, FASHION, BEAUTY, etc.)
- We need **visual aesthetic** organization (dark_moody, light_minimalistic, beige_aesthetic)
- Wrong structure for our use case

**✅ BUILD NEW:** Create outfit libraries organized by visual aesthetic + fashion_style

---

### 2. **Fashion Style Extraction** ✅ ALREADY WORKING
**File:** `lib/maya/get-user-context.ts`

**What it does:**
- Extracts `fashion_style` from `user_personal_brand` table
- Already used in Maya context
- Supports: casual, business, trendy, timeless

**Database:**
- `user_personal_brand.fashion_style` column exists
- Stored as JSON array or string

**✅ REUSE:** Already extracting fashion style, just need to use it for outfit selection

---

### 3. **Template Frame Extraction** ✅ ALREADY WORKING
**File:** `lib/feed-planner/build-single-image-prompt.ts`

**What it does:**
- `parseTemplateFrames(templatePrompt)` - Extracts 9 frames from full template
- `buildSingleImagePrompt(templatePrompt, frameNumber)` - Builds single image prompt

**Current templates:**
- Hardcoded outfits in each frame
- Example: "Frame 1: Sitting on stairs - **black blazer, leather pants**, beanie"

**✅ REUSE:** Keep frame structure, replace hardcoded outfits with placeholders

---

### 4. **Location Libraries** ✅ PARTIALLY EXISTS
**File:** `lib/feed-planner/feed-prompt-expert.ts`

**What it has:**
- `backgroundStyle` per vibe (dark_moody, clean_minimal, etc.)
- Examples: "concrete walls, urban architecture" (dark_moody), "pure white walls" (clean_minimal)

**File:** `app/api/maya/generate-concepts/route.ts`

**What it has:**
- Location detection logic (coffee-shop, gym, home, street, airport, mountain lodge)

**✅ REUSE:** Extract location patterns, create location rotation library

---

### 5. **Brand Library** ✅ ALREADY WORKING
**File:** `lib/maya/brand-library-2025.ts`

**What it has:**
- `generateCompleteOutfit(category, vibe)` - Returns outfit with brands
- Brand collections: ATHLETIC_BRANDS, ACCESSIBLE_BRANDS, LUXURY_BRANDS
- `getDetailedDescription(brand, item)` - Formats branded items

**✅ REUSE:** Can use for brand injection, but influencer-outfits.ts already has brands

---

### 6. **Color Palette & Vibe System** ✅ ALREADY WORKING
**File:** `lib/feed-planner/feed-prompt-expert.ts`

**What it has:**
- `MAYA_SIGNATURE_PALETTES` - Color palettes per vibe
- Fashion style mappings per vibe
- Background style mappings per vibe

**✅ REUSE:** Keep color grade and vibe descriptions, just replace outfits

---

## 🆕 What We Need to Build (NEW)

### 1. **Template Placeholder System** 🆕
**File:** `lib/feed-planner/dynamic-template-injector.ts` (NEW)

**What it does:**
- Replace `{{outfit}}`, `{{location}}`, `{{accessories}}` placeholders in templates
- Inject selected outfit/location/accessories from libraries

**Example:**
```typescript
// Template with placeholders
"Frame 1: Sitting on {{location}} - {{outfit}}, {{accessories}}, relaxed pose"

// After injection
"Frame 1: Sitting on concrete stairs - black ribbed crop top, baggy straight-leg jeans, oversized black leather moto jacket, white chunky sneakers, black angular sunglasses, minimal gold hoops, relaxed pose"
```

**Complexity:** Low (simple string replacement)

---

### 2. **Outfit Rotation System** 🆕
**File:** `lib/feed-planner/outfit-rotation.ts` (NEW)

**What it does:**
- Track which outfits user has used per category+mood
- Select next unused outfit
- Cycle back when all used

**Database:**
- Store `used_outfit_ids` in `feed_layouts` (JSON array)
- Or create `feed_outfit_history` table

**Complexity:** Medium (similar to template rotation we already planned)

---

### 3. **Fashion Style → Outfit Category Mapping** 🆕
**File:** `lib/feed-planner/fashion-style-mapper.ts` (NEW)

**What it does:**
- Map user's `fashion_style` (casual, business, trendy, timeless) to outfit categories
- Map feed `category` (luxury, minimal, beige) to outfit categories

**Mapping:**
```typescript
fashion_style: 'business' → outfit_category: 'LIFESTYLE' or 'FASHION'
fashion_style: 'trendy' → outfit_category: 'FASHION'
fashion_style: 'casual' → outfit_category: 'LIFESTYLE'
fashion_style: 'timeless' → outfit_category: 'LUXURY' or 'FASHION'
```

**Complexity:** Low (simple mapping object)

---

### 4. **Location Rotation Library** 🆕
**File:** `lib/feed-planner/location-library.ts` (NEW)

**What it does:**
- Define 3-5 locations per vibe
- Rotate through locations per feed

**Example:**
```typescript
DARK_MOODY_LOCATIONS = [
  'concrete stairs',
  'dark marble table',
  'gray wall',
  'city street',
  'dark minimalist desk'
]
```

**Complexity:** Low (simple array per vibe)

---

### 5. **Update Templates with Placeholders** 🆕
**File:** `lib/maya/blueprint-photoshoot-templates.ts` (MODIFY)

**What it does:**
- Replace hardcoded outfits with `{{outfit}}` placeholders
- Replace hardcoded locations with `{{location}}` placeholders
- Keep frame structure, poses, color grade

**Example:**
```typescript
// BEFORE (hardcoded)
"Frame 1: Sitting on concrete stairs - black blazer, leather pants, beanie, sunglasses, relaxed pose"

// AFTER (with placeholders)
"Frame 1: Sitting on {{location}} - {{outfit}}, {{accessories}}, relaxed pose"
```

**Complexity:** Low (find/replace in 18 templates)

---

## 📊 Reusability Score (REVISED)

| Component | Status | Reuse % | Notes |
|-----------|--------|---------|-------|
| ~~Outfit Library~~ | ❌ Wrong | 0% | Don't use influencer-outfits.ts |
| Fashion Style Extraction | ✅ Working | 100% | Already extracting from DB |
| Template Frame Extraction | ✅ Working | 100% | Already parsing frames |
| Color Palette System | ✅ Working | 100% | Keep as-is |
| Template Placeholders | 🆕 New | 0% | Need to build |
| NEW Outfit Libraries | 🆕 New | 0% | Build organized by aesthetic |
| Location Libraries | 🆕 New | 0% | Build per vibe |
| Simple Rotation | 🆕 New | 0% | Simple index tracking |

**Overall Reusability: ~40%** (Simpler approach, less reuse but cleaner)

---

## 🔄 Implementation Flow (REVISED)

### Step 1: User Creates Feed
1. User selects feed style (dark and moody, minimalistic, beige)
2. System gets user's `fashion_style` from `user_personal_brand` (casual, business, trendy, timeless)
3. System gets current `outfit_index` and `location_index` from `feed_layouts` (or defaults to 0)
4. System selects outfit from `DARK_MOODY_OUTFITS[fashion_style][outfit_index]`
5. System selects location from `DARK_MOODY_LOCATIONS[location_index]`
6. System increments indices and stores in `feed_layouts` (outfit_index, location_index)

### Step 2: Template Injection
1. System loads template (e.g., `luxury_dark_moody`) with placeholders
2. System replaces `{{outfit}}` with selected outfit description
3. System replaces `{{location}}` with selected location
4. System replaces `{{accessories}}` with selected accessories
5. Result: Personalized template with user's fashion style

### Step 3: Frame Extraction (EXISTING)
1. System extracts frame 1-9 from personalized template
2. Uses existing `buildSingleImagePrompt()` function
3. Generates individual image prompts

---

## 💡 Key Benefits (REVISED)

### ✅ Simple & Clean
- No complex variation tracking
- Simple index-based rotation
- Easy to understand and maintain

### ✅ Organized Correctly
- Outfits organized by **visual aesthetic** (what we need)
- Not by influencer category (what we don't need)
- Matches template structure

### ✅ Personalized
- Uses user's fashion style from onboarding
- Rotates through options automatically
- Simple index tracking (no complex queries)

### ✅ Scalable
- 5-10 outfits per aesthetic × 4 fashion styles = 20-40 outfits per aesthetic
- 3-5 locations per vibe
- Easy to add more outfits/locations later

---

## 📝 Implementation Checklist (REVISED)

### Phase 1: Template Placeholders (2 hours)
- [ ] Update 18 templates with `{{outfit}}`, `{{location}}`, `{{accessories}}` placeholders
- [ ] Test placeholder detection
- [ ] Keep old templates as fallback

### Phase 2: NEW Outfit Libraries (4 hours)
- [ ] Create `outfit-libraries.ts`
- [ ] Organize by visual aesthetic (dark_moody, light_minimalistic, beige_aesthetic)
- [ ] Sub-organize by fashion_style (business, casual, trendy, timeless)
- [ ] Create 5-10 outfits per aesthetic × fashion_style combination
- [ ] Extract outfits from existing templates as starting point

### Phase 3: Location Libraries (2 hours)
- [ ] Create `location-libraries.ts`
- [ ] Define 3-5 locations per vibe (extract from existing templates)
- [ ] Match existing template locations but make them rotatable

### Phase 4: Simple Rotation System (2 hours)
- [ ] Create `simple-rotation.ts`
- [ ] Implement index-based rotation (no complex queries)
- [ ] Add `outfit_index` and `location_index` columns to `feed_layouts`
- [ ] Implement increment and cycle logic

### Phase 5: Injection System (2 hours)
- [ ] Create `dynamic-template-injector.ts`
- [ ] Implement placeholder replacement
- [ ] Test with sample templates

### Phase 6: Integration (3 hours)
- [ ] Integrate into feed creation flow
- [ ] Update `create-manual/route.ts`
- [ ] Update `generate-single/route.ts`
- [ ] Test end-to-end

**Total Time: ~15 hours** (simpler than manual templates, cleaner than complex variation system)

---

## 🎯 Next Steps

1. **Approve hybrid approach**
2. **Start with Phase 1** (template placeholders)
3. **Test with 1 template** before updating all 18
4. **Iterate based on results**

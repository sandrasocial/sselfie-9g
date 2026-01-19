# Personal Brand Profile Data Usage Audit

**Date:** 2025-01-XX  
**Scope:** Feed Style Picker, Unified Onboarding Wizard, Feed Generation

---

## Executive Summary

✅ **Feed Style Picker:** CORRECTLY saves and uses personal brand data  
✅ **Onboarding Wizard:** CORRECTLY saves personal brand data  
⚠️ **Feed Generation:** Uses SOME personal brand fields, but NOT ALL wizard fields are utilized

---

## 1. Feed Style Picker (`components/feed-planner/feed-header.tsx`)

### ✅ Data Saved to Personal Brand

**When user selects feed style:**
- `settingsPreference[0]` = `feedStyle` (luxury/minimal/beige)
- `visualAesthetic` = selected visual aesthetics array
- `fashionStyle` = selected fashion styles array

**Code Location:** Lines 66-114 (preview feed), Lines 169-253 (full feed)

```typescript
// Updates personal brand when feed style is selected
await fetch('/api/profile/personal-brand', {
  method: 'POST',
  body: JSON.stringify({
    settingsPreference: updatedSettingsPreference, // feedStyle as first element
    visualAesthetic: data.visualAesthetic,
    fashionStyle: data.fashionStyle,
  }),
})
```

### ✅ Data Loaded from Personal Brand

**When modal opens:**
- Loads `settingsPreference[0]` as default feed style
- Uses SWR to fetch fresh data when modal opens

**Code Location:** Lines 42-50, Line 53

```typescript
const { data: personalBrandData } = useSWR(
  showFeedStyleModal ? "/api/profile/personal-brand" : null,
  fetcher
)
const lastFeedStyle: FeedStyle | null = personalBrandData?.data?.settingsPreference?.[0] || null
```

### ✅ Status: WORKING CORRECTLY

---

## 2. Unified Onboarding Wizard (`components/sselfie/brand-profile-wizard.tsx`)

### ✅ Data Saved to Personal Brand

**All wizard fields are saved:**
- `name` → `name`
- `businessType` → `business_type`
- `colorTheme` → `color_theme`
- `visualAesthetic` → `visual_aesthetic` (JSONB array)
- `settingsPreference` → `settings_preference` (JSONB array)
- `fashionStyle` → `fashion_style` (JSONB array)
- `currentSituation` → `current_situation`
- `transformationStory` → `transformation_story`
- `futureVision` → `future_vision`
- `idealAudience` → `ideal_audience`
- `audienceChallenge` → `audience_challenge`
- `audienceTransformation` → `audience_transformation`
- `communicationVoice` → `communication_voice`
- `signaturePhrases` → `signature_phrases`
- `photoGoals` → `photo_goals`
- `brandInspiration` → `brand_inspiration`
- `inspirationLinks` → `inspiration_links`
- `contentPillars` → `content_pillars` (JSONB array)
- `customColors` → `color_palette` (JSONB array)

**Code Location:** Lines 269-306 (loads existing data), Wizard submission saves all fields

### ✅ Data Loaded from Personal Brand

**When wizard opens:**
- Loads all existing personal brand data
- Pre-fills form fields with saved values
- Handles JSON parsing for array fields

**Code Location:** Lines 269-306

```typescript
useEffect(() => {
  if (isOpen && existingData) {
    setFormData({
      name: existingData?.name || "",
      visualAesthetic: existingData?.visualAesthetic ? ... : [],
      fashionStyle: existingData?.fashionStyle ? ... : [],
      // ... all fields loaded
    })
  }
}, [isOpen, existingData])
```

### ✅ Status: WORKING CORRECTLY

---

## 3. Feed Generation Usage (`lib/feed-planner/generation-helpers.ts`)

### ✅ Fields USED in Feed Generation

#### 3.1 Category & Mood (`getCategoryAndMood()`)

**Priority Order:**
1. `feed_layouts.visual_aesthetic` (feed-specific override) ✅
2. `feed_layouts.feed_style` (feed-specific override) ✅
3. `user_personal_brand.settings_preference[0]` → mood ✅ **USED**
4. `user_personal_brand.visual_aesthetic[0]` → category ✅ **USED**
5. Legacy `blueprint_subscribers` (fallback)
6. Default: "minimal" / "minimal"

**Code Location:** `lib/feed-planner/generation-helpers.ts` Lines 159-403

```typescript
// Uses settings_preference[0] for mood
if (personalBrand[0].settings_preference) {
  const settings = JSON.parse(personalBrand[0].settings_preference)
  if (Array.isArray(settings) && settings.length > 0) {
    feedStyle = settings[0] // First element is feedStyle
    mood = feedStyleLower as "luxury" | "minimal" | "beige"
  }
}

// Uses visual_aesthetic[0] for category
if (personalBrand[0].visual_aesthetic) {
  const aesthetics = JSON.parse(personalBrand[0].visual_aesthetic)
  if (Array.isArray(aesthetics) && aesthetics.length > 0) {
    const mappedCategory = mapVisualAestheticToCategory(aesthetics[0])
    category = mappedCategory
  }
}
```

#### 3.2 Fashion Style (`getFashionStyleForPosition()`)

**Priority Order:**
1. `feed_layouts.fashion_style` (feed-specific override) ✅
2. `user_personal_brand.fashion_style` → rotates through array ✅ **USED**
3. Default: "casual"

**Code Location:** `lib/feed-planner/generation-helpers.ts` Lines 415-498

```typescript
// Uses fashion_style array from personal brand
const personalBrandForStyle = await sql`
  SELECT fashion_style
  FROM user_personal_brand
  WHERE user_id = ${user.id}
  ORDER BY updated_at DESC
  LIMIT 1
`

if (personalBrandForStyle[0].fashion_style) {
  const styles = parseFashionStyleArray(personalBrandForStyle[0].fashion_style)
  // Rotates through styles based on position
  const styleIndex = (position - 1) % styles.length
  fashionStyle = mapFashionStyleToVibeLibrary(styles[styleIndex])
}
```

### ❌ Fields NOT USED in Feed Generation

The following fields are saved by the onboarding wizard but **NOT used** in feed generation:

1. ❌ `name` - Not used
2. ❌ `business_type` - Not used (only used in caption/strategy generation)
3. ❌ `color_theme` - Not used
4. ❌ `current_situation` - Not used
5. ❌ `transformation_story` - Not used
6. ❌ `future_vision` - Not used
7. ❌ `ideal_audience` - Not used (only used in caption/strategy generation)
8. ❌ `audience_challenge` - Not used (only used in caption/strategy generation)
9. ❌ `audience_transformation` - Not used (only used in caption/strategy generation)
10. ❌ `communication_voice` - Not used (only used in caption/strategy generation)
11. ❌ `signature_phrases` - Not used (only used in caption/strategy generation)
12. ❌ `photo_goals` - Not used
13. ❌ `brand_inspiration` - Not used
14. ❌ `inspiration_links` - Not used
15. ❌ `content_pillars` - Not used (only used in caption/strategy generation)
16. ❌ `color_palette` - Not used in prompt generation (only used in UI display)

**Note:** Some fields (business_type, ideal_audience, content_pillars, communication_voice) ARE used in:
- Caption generation (`lib/feed-planner/caption-writer.ts`)
- Instagram strategy generation (`lib/feed-planner/instagram-strategy-agent.ts`)

But they are **NOT used** in the actual image prompt generation pipeline.

---

## 4. Data Flow Summary

### Feed Style Picker Flow

```
User selects feed style
  ↓
feed-header.tsx saves to personal brand:
  - settingsPreference[0] = feedStyle
  - visualAesthetic = selected aesthetics
  - fashionStyle = selected styles
  ↓
Feed generation reads:
  - settingsPreference[0] → mood
  - visualAesthetic[0] → category
  - fashionStyle → rotates through styles
```

### Onboarding Wizard Flow

```
User completes wizard
  ↓
brand-profile-wizard.tsx saves ALL fields to personal brand
  ↓
Feed generation reads:
  ✅ visualAesthetic[0] → category
  ✅ settingsPreference[0] → mood
  ✅ fashionStyle → rotates through styles
  ❌ Other fields → NOT used in prompt generation
```

---

## 5. Issues & Recommendations

### ⚠️ Issue 1: Incomplete Field Usage

**Problem:** Many onboarding wizard fields are saved but not used in feed generation.

**Impact:** User's choices in onboarding wizard don't affect image generation (only captions/strategy).

**Recommendation:**
- Consider using `color_theme` / `color_palette` for color mood in prompts
- Consider using `photo_goals` to influence scene selection
- Consider using `brand_inspiration` for aesthetic direction

### ⚠️ Issue 2: Feed-Specific Override Priority

**Current Behavior:** Feed-specific `visual_aesthetic` and `fashion_style` override personal brand.

**Impact:** User's personal brand choices may be ignored if feed has specific settings.

**Status:** ✅ This is INTENTIONAL - feed-specific settings should override personal brand.

### ✅ Issue 3: Data Sync Between Feed Style Picker and Wizard

**Status:** ✅ WORKING CORRECTLY
- Feed style picker updates personal brand
- Wizard loads existing personal brand data
- Both use same API endpoint (`/api/profile/personal-brand`)

---

## 6. Verification Checklist

### Feed Style Picker
- [x] Saves `settingsPreference`, `visualAesthetic`, `fashionStyle` to personal brand
- [x] Loads last feed style from `settingsPreference[0]`
- [x] Updates personal brand when user selects feed style
- [x] Handles errors gracefully (continues feed creation even if personal brand update fails)

### Onboarding Wizard
- [x] Saves all wizard fields to personal brand
- [x] Loads existing personal brand data when modal opens
- [x] Handles JSON parsing for array fields correctly
- [x] Updates personal brand via POST to `/api/profile/personal-brand`

### Feed Generation
- [x] Uses `settings_preference[0]` for mood (feed style)
- [x] Uses `visual_aesthetic[0]` for category
- [x] Uses `fashion_style` array for style rotation
- [x] Respects feed-specific overrides (higher priority)
- [x] Falls back to personal brand when feed-specific data missing

---

## 7. Conclusion

### ✅ What's Working

1. **Feed Style Picker:** Correctly saves and loads personal brand data
2. **Onboarding Wizard:** Correctly saves all fields to personal brand
3. **Feed Generation:** Uses core personal brand fields (`visual_aesthetic`, `fashion_style`, `settings_preference`)

### ⚠️ What Could Be Improved

1. **More Field Usage:** Consider using more onboarding wizard fields in prompt generation
2. **Color Palette:** `color_palette` is saved but not used in prompt generation
3. **Photo Goals:** `photo_goals` could influence scene selection

### 📊 Usage Summary

| Field | Saved By | Used In Feed Generation | Used In Captions/Strategy |
|-------|----------|-------------------------|---------------------------|
| `visual_aesthetic` | ✅ Both | ✅ Yes | ❌ No |
| `fashion_style` | ✅ Both | ✅ Yes | ❌ No |
| `settings_preference` | ✅ Feed Style Picker | ✅ Yes (mood) | ❌ No |
| `business_type` | ✅ Wizard | ❌ No | ✅ Yes |
| `ideal_audience` | ✅ Wizard | ❌ No | ✅ Yes |
| `content_pillars` | ✅ Wizard | ❌ No | ✅ Yes |
| `communication_voice` | ✅ Wizard | ❌ No | ✅ Yes |
| `color_palette` | ✅ Wizard | ❌ No | ❌ No (UI only) |
| `photo_goals` | ✅ Wizard | ❌ No | ❌ No |

---

**Audit Status:** ✅ Core functionality working correctly. Some fields saved but not used in image generation.

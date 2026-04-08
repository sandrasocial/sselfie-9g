# Feed Style Picker - Validation Checklist

## Quick Reference for Testing

### ✅ WORKING (Verified)

- [x] Modal collects feedStyle, visualAesthetic, fashionStyle
- [x] Values stored in React state until "Confirm" clicked
- [x] onConfirm sends data to two endpoints:
  - [x] `/api/profile/personal-brand` (updates user profile)
  - [x] `/api/feed/create-manual` or `/create-free-example` (creates feed)
- [x] Personal brand updates write to `user_personal_brand` table:
  - [x] `visual_aesthetic` (JSONB array)
  - [x] `settings_preference[0]` = feedStyle
  - [x] `fashion_style` (JSONB array)
- [x] Feed creation writes to `feed_layouts` table:
  - [x] `feed_style` (string)
- [x] Full feeds require `feedStyle` (422 error if missing)
- [x] Generation reads from `feed_layouts.feed_style` (priority 1)
- [x] Generation reads from `user_personal_brand` (priority 2)
- [x] `category` (from visualAesthetic) reaches prompts
- [x] `mood` (from feedStyle) reaches prompts
- [x] `fashionStyle` reaches prompts with rotation

### ❌ BROKEN (Confirmed Issues)

- [ ] `visualAesthetic` NOT stored in `feed_layouts` table
- [ ] `fashionStyle` NOT stored in `feed_layouts` table
- [ ] Preview feeds don't require `feedStyle` (defaults to "minimal")
- [ ] JSONB parsing requires double-parse workarounds
- [ ] No validation on array contents (could store garbage)

### ⚠️ WARNINGS

- Feed-specific style overrides not preserved
- If user changes personal brand, old feeds use new values
- Inconsistent required field behavior (preview vs full)

---

## Test Scenarios

### Scenario 1: Create Full Feed with Custom Style

**Steps:**
1. Open Feed Planner
2. Click "New Feed"
3. Select feedStyle: "luxury"
4. Select visualAesthetic: "luxury", "edgy"
5. Select fashionStyle: "business"
6. Click "Create Feed"

**Expected:**
- ✅ Personal brand updated:
  - `settings_preference` = `["luxury", ...]`
  - `visual_aesthetic` = `["luxury", "edgy"]`
  - `fashion_style` = `["business"]`
- ✅ Feed created with `feed_style` = "luxury"
- ❌ Feed does NOT have `visual_aesthetic` or `fashion_style` columns

**Verify:**
```sql
SELECT * FROM user_personal_brand WHERE user_id = ?;
-- Should show updated visual_aesthetic, fashion_style, settings_preference

SELECT * FROM feed_layouts WHERE id = ?;
-- Should show feed_style = 'luxury'
-- Does NOT have visual_aesthetic or fashion_style columns
```

### Scenario 2: Generate Image from Feed

**Steps:**
1. Using feed from Scenario 1
2. Click "Generate" on position 1
3. Check console logs

**Expected:**
- ✅ Logs show: `category = "luxury"` (from visual_aesthetic)
- ✅ Logs show: `mood = "luxury"` (from feed_style)
- ✅ Logs show: `fashionStyle = "business"`
- ✅ Prompt includes: "luxurious high-end aesthetic"
- ✅ Prompt includes: "dramatic moody lighting"
- ✅ Prompt includes business attire from fashionStyle

### Scenario 3: Create Preview Feed

**Steps:**
1. Click "New Feed Preview"
2. DON'T select any style
3. Click "Create Preview"

**Expected:**
- ⚠️ Feed created successfully (no error)
- ⚠️ Feed has `feed_style` = "minimal" (defaulted)
- ❌ No prompt to user to select style

**Issue:** Inconsistent with full feed behavior

### Scenario 4: Change Personal Brand, Then Generate Old Feed

**Steps:**
1. Create feed with style "minimal", aesthetic "minimal"
2. Change personal brand to "luxury", aesthetic "luxury"
3. Generate image from OLD feed

**Expected:**
- ❌ Uses NEW values ("luxury") instead of original ("minimal")
- **Why:** Feed doesn't store visual_aesthetic, reads from personal brand

**Issue:** Feed-specific overrides not preserved

---

## Database Schema Check

### user_personal_brand Table

**Required Columns:**
- `visual_aesthetic` (JSONB) ✅
- `settings_preference` (JSONB) ✅
- `fashion_style` (JSONB) ✅

**Verify:**
```sql
\d user_personal_brand;
```

### feed_layouts Table

**Current Columns:**
- `feed_style` (string) ✅

**Missing Columns:**
- `visual_aesthetic` (JSONB) ❌
- `fashion_style` (JSONB) ❌

**Verify:**
```sql
\d feed_layouts;
-- Should show feed_style column
-- Does NOT show visual_aesthetic or fashion_style columns
```

---

## API Endpoint Tests

### Test 1: Update Personal Brand

```bash
curl -X POST /api/profile/personal-brand \
  -H "Content-Type: application/json" \
  -d '{
    "visualAesthetic": ["minimal", "warm"],
    "fashionStyle": ["casual", "bohemian"],
    "settingsPreference": ["minimal"]
  }'
```

**Expected:** 200 OK, values written to `user_personal_brand`

### Test 2: Create Full Feed

```bash
curl -X POST /api/feed/create-manual \
  -H "Content-Type: application/json" \
  -d '{
    "feedStyle": "luxury",
    "visualAesthetic": ["luxury"],
    "fashionStyle": ["business"]
  }'
```

**Expected:**
- 200 OK if feedStyle provided
- 422 if feedStyle missing
- `feed_style` written to `feed_layouts`
- `visualAesthetic` and `fashionStyle` logged but NOT written ❌

### Test 3: Create Preview Feed

```bash
curl -X POST /api/feed/create-free-example \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected:**
- 200 OK (always succeeds)
- `feed_style` defaults to "minimal"
- No error even though no style provided ❌

---

## Console Log Checks

### During Feed Creation

**Expected Logs:**
```
[v0] Feed created with visualAesthetic: ["minimal", "warm"]
[v0] Feed created with fashionStyle: ["casual"]
```

**Issue:** These are LOGGED but NOT STORED ❌

### During Generation

**Expected Logs:**
```
[GENERATE-SINGLE] ✅ Using category: minimal
[GENERATE-SINGLE] Using style 1/3: casual for frame 1
[NANO-BANANA-ADAPTER] hasCategory: true, hasMood: true
```

**Verify:** All user selections reach generation ✅

---

## Quick Smoke Test

```bash
# 1. Check personal brand saves
echo "Testing personal brand update..."
# → Open Feed Style Modal
# → Select styles
# → Click Confirm
# → Check database: SELECT * FROM user_personal_brand WHERE user_id = ?

# 2. Check feed creation saves feedStyle
echo "Testing feed creation..."
# → Create new feed
# → Check database: SELECT feed_style FROM feed_layouts WHERE id = ?

# 3. Check generation uses values
echo "Testing generation..."
# → Generate image
# → Check logs for category, mood, fashionStyle
# → Check prompt includes aesthetic descriptions

# All should pass ✅
```

---

**Status:** Checklist complete  
**Last Updated:** January 18, 2026  
**See:** Full audit in `FEED_STYLE_PICKER_AUDIT.md`

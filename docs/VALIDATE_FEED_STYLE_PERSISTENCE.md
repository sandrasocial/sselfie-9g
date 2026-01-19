# Validate Feed Style Persistence

Quick validation guide for testing the Feed Style Persistence fix.

---

## 1. Database Migration Validation

### Check if columns exist
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'feed_layouts'
  AND column_name IN ('visual_aesthetic', 'fashion_style')
ORDER BY column_name;
```

**Expected output:**
```
column_name       | data_type | is_nullable
visual_aesthetic  | jsonb     | YES
fashion_style     | jsonb     | YES
```

### Check existing feeds (before new feeds created)
```sql
SELECT 
  id,
  user_id,
  brand_name,
  feed_style,
  visual_aesthetic,
  fashion_style,
  created_at
FROM feed_layouts
ORDER BY created_at DESC
LIMIT 10;
```

**Expected:** Legacy feeds should have NULL for visual_aesthetic and fashion_style

---

## 2. Feed Creation Validation

### Test Case 1: Manual Feed with Style Selections

**Request:**
```json
POST /api/feed/create-manual
{
  "feedStyle": "luxury",
  "visualAesthetic": ["edgy", "minimal"],
  "fashionStyle": ["trendy", "bohemian"]
}
```

**Query to verify:**
```sql
SELECT 
  id,
  brand_name,
  feed_style,
  visual_aesthetic,
  fashion_style
FROM feed_layouts
WHERE user_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected output:**
```
feed_style: "luxury"
visual_aesthetic: ["edgy", "minimal"]
fashion_style: ["trendy", "bohemian"]
```

### Test Case 2: Preview Feed without feedStyle (Should Fail)

**Request:**
```json
POST /api/feed/create-free-example
{
  "visualAesthetic": ["minimal"],
  "fashionStyle": ["casual"]
}
```

**Expected response:**
```json
{
  "error": "FEED_STYLE_REQUIRED",
  "details": "Feed style is required to create a preview feed."
}
```

**HTTP Status:** 422

### Test Case 3: Preview Feed with feedStyle (Should Succeed)

**Request:**
```json
POST /api/feed/create-free-example
{
  "feedStyle": "minimal",
  "visualAesthetic": ["warm", "beige"],
  "fashionStyle": ["casual", "bohemian"]
}
```

**Query to verify:**
```sql
SELECT 
  id,
  brand_name,
  feed_style,
  visual_aesthetic,
  fashion_style,
  layout_type
FROM feed_layouts
WHERE user_id = 'YOUR_USER_ID'
  AND layout_type = 'preview'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected output:**
```
feed_style: "minimal"
visual_aesthetic: ["warm", "beige"]
fashion_style: ["casual", "bohemian"]
layout_type: "preview"
```

---

## 3. Feed-Specific Override Validation

### Scenario: Feed overrides should persist even after personal brand changes

**Step 1:** Create feed with specific styles
```json
POST /api/feed/create-manual
{
  "feedStyle": "luxury",
  "visualAesthetic": ["edgy"],
  "fashionStyle": ["trendy"]
}
```

**Step 2:** Check feed_layouts
```sql
SELECT 
  id AS feed_id,
  feed_style,
  visual_aesthetic,
  fashion_style
FROM feed_layouts
WHERE id = YOUR_FEED_ID;
```

**Expected:** Feed-specific values stored

**Step 3:** Change personal brand
```json
POST /api/profile/personal-brand
{
  "settingsPreference": ["minimal"],
  "visualAesthetic": ["warm"],
  "fashionStyle": ["casual"]
}
```

**Step 4:** Check personal brand
```sql
SELECT 
  settings_preference,
  visual_aesthetic,
  fashion_style
FROM user_personal_brand
WHERE user_id = 'YOUR_USER_ID'
ORDER BY updated_at DESC
LIMIT 1;
```

**Expected:** Personal brand updated to new values

**Step 5:** Re-check feed_layouts (should be unchanged)
```sql
SELECT 
  id AS feed_id,
  feed_style,
  visual_aesthetic,
  fashion_style
FROM feed_layouts
WHERE id = YOUR_FEED_ID;
```

**Expected:** Feed still has original values (luxury, edgy, trendy)

**Step 6:** Generate image from feed
```json
POST /api/feed/{feedId}/generate-single
{
  "postId": YOUR_POST_ID
}
```

**Check logs for:**
```
[v0] [GENERATE-SINGLE] ✅ Using feed-specific visual_aesthetic (PRIORITY 1): edgy
[v0] [GENERATE-SINGLE] ✅ Using feed's feed_style (PRIORITY 2): luxury
[v0] [GENERATE-SINGLE] ✅ Using feed-specific fashion_style 1/1: trendy for position 1
```

**Expected:** Generation uses feed-specific values, not personal brand

---

## 4. Legacy Feed Fallback Validation

### Test Case: Feed created before migration (no visual_aesthetic/fashion_style)

**Simulate legacy feed:**
```sql
-- Find a feed with NULL visual_aesthetic and fashion_style
SELECT id, feed_style, visual_aesthetic, fashion_style
FROM feed_layouts
WHERE visual_aesthetic IS NULL 
  AND fashion_style IS NULL
LIMIT 1;
```

**Or manually set to NULL:**
```sql
UPDATE feed_layouts
SET visual_aesthetic = NULL, fashion_style = NULL
WHERE id = YOUR_FEED_ID;
```

**Generate image from legacy feed:**
```json
POST /api/feed/{legacyFeedId}/generate-single
{
  "postId": YOUR_POST_ID
}
```

**Check logs for fallback:**
```
[v0] [GENERATE-SINGLE] Feed-specific visual_aesthetic not found, checking personal brand
[v0] [GENERATE-SINGLE] Using personal brand visual_aesthetic: minimal
```

**Expected:** Generation falls back to personal brand (correct behavior for legacy feeds)

---

## 5. Generation Priority Validation

### Compare personal brand vs feed-specific values

**Query:**
```sql
SELECT 
  fl.id AS feed_id,
  fl.feed_style AS feed_feed_style,
  fl.visual_aesthetic AS feed_visual_aesthetic,
  fl.fashion_style AS feed_fashion_style,
  upb.settings_preference AS pb_settings,
  upb.visual_aesthetic AS pb_visual_aesthetic,
  upb.fashion_style AS pb_fashion_style
FROM feed_layouts fl
JOIN user_personal_brand upb ON upb.user_id = fl.user_id
WHERE fl.id = YOUR_FEED_ID;
```

**Expected priority during generation:**
1. Use `feed_visual_aesthetic` → category (if not NULL)
2. Use `feed_feed_style` → mood (if not NULL)
3. Use `feed_fashion_style` → fashionStyle (if not NULL)
4. Fallback to `pb_*` values only if feed values are NULL

---

## 6. JSONB Data Integrity Validation

### Check JSONB format
```sql
SELECT 
  id,
  visual_aesthetic,
  jsonb_typeof(visual_aesthetic) AS va_type,
  fashion_style,
  jsonb_typeof(fashion_style) AS fs_type
FROM feed_layouts
WHERE visual_aesthetic IS NOT NULL 
   OR fashion_style IS NOT NULL
LIMIT 5;
```

**Expected:**
```
va_type: "array"
fs_type: "array"
```

**NOT:**
```
va_type: "string"  ❌ (double-stringified)
va_type: "object"  ❌ (wrong format)
```

### Check array contents
```sql
SELECT 
  id,
  jsonb_array_length(visual_aesthetic) AS va_length,
  visual_aesthetic->0 AS va_first,
  jsonb_array_length(fashion_style) AS fs_length,
  fashion_style->0 AS fs_first
FROM feed_layouts
WHERE visual_aesthetic IS NOT NULL
LIMIT 5;
```

**Expected:**
```
va_length: >= 1
va_first: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
fs_length: >= 1
fs_first: "casual" | "business" | "bohemian" | "classic" | "trendy" | "athletic"
```

---

## 7. End-to-End Validation Script

```bash
# 1. Check migration
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'feed_layouts' AND column_name IN ('visual_aesthetic', 'fashion_style');"

# 2. Create test feed
curl -X POST https://your-app.com/api/feed/create-manual \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feedStyle": "luxury",
    "visualAesthetic": ["edgy"],
    "fashionStyle": ["trendy"]
  }'

# 3. Verify feed creation
FEED_ID="get-from-response"
psql $DATABASE_URL -c "SELECT feed_style, visual_aesthetic, fashion_style FROM feed_layouts WHERE id = $FEED_ID;"

# 4. Generate image
curl -X POST https://your-app.com/api/feed/$FEED_ID/generate-single \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"postId": 1}'

# 5. Check logs for feed-specific usage
# Look for: "Using feed-specific visual_aesthetic (PRIORITY 1)"
```

---

## Expected Log Messages

### When feed-specific values are used:
```
[v0] [GENERATE-SINGLE] ✅ Using feed-specific visual_aesthetic (PRIORITY 1): edgy
[v0] [GENERATE-SINGLE] ✅ Using feed's feed_style (PRIORITY 2): luxury
[v0] [GENERATE-SINGLE] ✅ Using feed-specific fashion_style 1/1: trendy for position 1
```

### When falling back to personal brand:
```
[v0] [GENERATE-SINGLE] Feed-specific visual_aesthetic not found, checking personal brand
[v0] [GENERATE-SINGLE] Using personal brand settings_preference: minimal
```

### When validation fails:
```
[v0] Invalid feedStyle requested: invalid_value, rejecting
FEED_STYLE_REQUIRED: Feed style is required to create a preview feed.
```

---

## Success Criteria

✅ Migration adds columns without errors  
✅ Feed creation persists visual_aesthetic + fashion_style  
✅ Preview feeds require feedStyle (422 if missing)  
✅ Feed-specific values always win over personal brand  
✅ Personal brand changes don't affect existing feeds  
✅ Legacy feeds fall back to personal brand  
✅ JSONB format is correct (arrays, not strings)  
✅ No linter errors  
✅ No runtime errors  

---

**Status:** Ready for testing

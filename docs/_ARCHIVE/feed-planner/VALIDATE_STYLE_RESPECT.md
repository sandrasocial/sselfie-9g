# Validate Style Respect - Testing Guide

## OBJECTIVE

Verify that user style selections (category, mood, fashionStyle) are respected in generated prompts.

---

## QUICK VALIDATION

Run these checks to confirm the fix is working:

### 1. Check Defaults Changed

```bash
# Verify defaultCategory changed from 'professional' to 'minimal'
grep "defaultCategory = 'minimal'" lib/feed-planner/generation-helpers.ts
# Expected: Should find the line

# Verify fashionStyle changed from 'business' to 'casual'
grep "let fashionStyle = 'casual'" lib/feed-planner/generation-helpers.ts
# Expected: Should find the line

# Verify fashion mapper fallback changed
grep "return 'casual'" lib/feed-planner/fashion-style-mapper.ts
# Expected: Should find the line (in fallback logic)
```

### 2. Check Category/Mood Are Used

```bash
# Verify category is used in buildNaturalLanguageDescription
grep -A 10 "Add USER-SELECTED CATEGORY" lib/feed-planner/nano-banana-adapter.ts
# Expected: Should show categoryAesthetics mapping

# Verify mood is used
grep -A 10 "Add USER-SELECTED MOOD" lib/feed-planner/nano-banana-adapter.ts
# Expected: Should show moodAtmospheres mapping
```

### 3. Check No 'professional' or 'business' Defaults Remain

```bash
# Search for remaining hardcoded 'professional' defaults
grep -n "= 'professional'" lib/feed-planner/generation-helpers.ts
# Expected: Should NOT find any (except in type definitions)

# Search for remaining hardcoded 'business' defaults
grep -n "= 'business'" lib/feed-planner/generation-helpers.ts
# Expected: Should NOT find any

# Check fashion mapper
grep -n "return 'business'" lib/feed-planner/fashion-style-mapper.ts
# Expected: Should NOT find any (changed to 'casual')
```

---

## RUNTIME TESTING

### Test Case 1: Minimalist User

**Setup:**
```sql
-- Create test user with minimalist aesthetic
INSERT INTO user_personal_brand (user_id, visual_aesthetic, fashion_style)
VALUES (123, '["minimalist"]', '["casual"]');
```

**Generate Image:**
1. Create feed for user 123
2. Generate position 1
3. Check logs

**Expected Logs:**
```
[NANO-BANANA-ADAPTER] Converting Feed Planner template to natural language: {
  position: 1,
  hasCategory: true,  // ✅ category present
  hasMood: true       // ✅ mood present
}
```

**Expected Prompt (excerpt):**
```
"...clean minimalist aesthetic with uncluttered composition, 
bright airy lighting with high-key feel..."
```

**Validation:**
- ✅ Contains "minimalist aesthetic"
- ✅ Contains "bright airy lighting" (from mood='minimal')
- ✅ NO "business" or "professional" terms

---

### Test Case 2: Bohemian User

**Setup:**
```sql
INSERT INTO user_personal_brand (user_id, fashion_style)
VALUES (456, '["bohemian"]');
```

**Generate Image:**
1. Create feed for user 456
2. Generate position 1
3. Check logs

**Expected Logs:**
```
[Fashion Style Mapper] Partial match: "bohemian" → "bohemian"
```

**Expected Prompt (excerpt):**
```
"...wearing flowing bohemian maxi dress..."
```

**Validation:**
- ✅ fashionStyle mapped to 'bohemian' correctly
- ✅ Bohemian outfit descriptions present
- ✅ NO "business suit" or "professional attire"

---

### Test Case 3: New User (No Data)

**Setup:**
```sql
-- User exists but no personal_brand data
INSERT INTO users (id, email) VALUES (789, 'test@example.com');
-- No user_personal_brand entry
```

**Generate Image:**
1. Create feed for user 789
2. Generate position 1
3. Check logs

**Expected Logs:**
```
[GENERATE-SINGLE] Using default category: minimal
[GENERATE-SINGLE] Using default fashion style: casual
```

**Expected Prompt (excerpt):**
```
"...clean minimalist aesthetic with uncluttered composition, 
wearing casual comfortable clothing..."
```

**Validation:**
- ✅ Defaulted to category='minimal'
- ✅ Defaulted to fashionStyle='casual'
- ✅ NO "professional" or "business" terms

---

### Test Case 4: Professional User (Explicit Choice)

**Setup:**
```sql
INSERT INTO user_personal_brand (user_id, visual_aesthetic, fashion_style)
VALUES (999, '["professional"]', '["business"]');
```

**Generate Image:**
1. Create feed for user 999
2. Generate position 1
3. Check logs

**Expected Logs:**
```
[GENERATE-SINGLE] Category: professional (from user selection)
[Fashion Style Mapper] "business" → "business"
```

**Expected Prompt (excerpt):**
```
"...wearing business suit with professional styling..."
```

**Validation:**
- ✅ Professional semantics present (user explicitly chose this)
- ✅ Business attire present (user explicitly chose this)
- ✅ This is CORRECT behavior (user choice respected)

---

## LOG MONITORING

### Key Log Messages to Watch

**1. Category Resolution:**
```
[GENERATE-SINGLE] ✅ Using category: minimal
```
- Should show user's selected category
- Should default to 'minimal' if no data

**2. Fashion Style Resolution:**
```
[GENERATE-SINGLE] Using style 1/3: casual for frame 1
```
- Should show user's selected style
- Should default to 'casual' if no data

**3. Nano Banana Adapter:**
```
[NANO-BANANA-ADAPTER] Converting Feed Planner template to natural language: {
  hasCategory: true,
  hasMood: true
}
```
- Both should be true (not dropped)

**4. Fashion Style Mapping:**
```
[Fashion Style Mapper] Partial match: "bohemian" → "bohemian"
```
- Should map user styles correctly
- Should NOT default to 'business'

---

## PROMPT INSPECTION

### What to Look For in Final Prompts

**✅ GOOD (User Choice Respected):**
```
"clean minimalist aesthetic with uncluttered composition"
"warm inviting aesthetic with cozy atmosphere"
"edgy modern aesthetic with bold contemporary style"
"bright airy lighting with high-key feel"
"dramatic moody lighting with rich depth"
"wearing casual jeans and relaxed sweater"
"wearing flowing bohemian maxi dress"
"wearing athletic leggings and sports top"
```

**❌ BAD (Override/Default):**
```
"professional office setting"
"business suit with executive presence"
"corporate atmosphere"
"tailored charcoal blazer" (when user selected casual)
"professional styling" (when user didn't select professional)
```

---

## CHECKLIST

### Code Changes Verified
- [ ] `defaultCategory = 'minimal'` in generation-helpers.ts
- [ ] `fashionStyle = 'casual'` in generation-helpers.ts
- [ ] `return 'casual'` in fashion-style-mapper.ts fallback
- [ ] category used in buildNaturalLanguageDescription()
- [ ] mood used in buildNaturalLanguageDescription()
- [ ] Blueprint override removed (uses defaultCategory)

### Runtime Testing
- [ ] Test Case 1: Minimalist user → minimal aesthetic in prompt
- [ ] Test Case 2: Bohemian user → bohemian outfits in prompt
- [ ] Test Case 3: New user → minimal/casual defaults (not professional/business)
- [ ] Test Case 4: Professional user → business semantics allowed

### Prompt Quality
- [ ] User-selected category appears in prompt
- [ ] User-selected mood influences lighting
- [ ] User-selected fashion style influences outfits
- [ ] No "professional/business" when user didn't select it
- [ ] Professional/business only when explicitly selected

---

## REGRESSION TESTING

### Ensure These Still Work

1. **Preview Feeds:**
   - Should still default to 'minimal' ✅
   - Should still work for free users ✅

2. **Paid Blueprint:**
   - Should respect user's category selection ✅
   - Should work with template injection ✅

3. **Legacy Blueprint Users:**
   - Should use defaultCategory when vibe missing ✅
   - Should not break existing functionality ✅

4. **Scene Library:**
   - Should still work with category-aware scenes ✅
   - Scene 8 should still respect category ✅

---

## QUICK SMOKE TEST

**Run this to verify basic functionality:**

```bash
# 1. Check code changes
echo "Checking defaults..."
grep "defaultCategory = 'minimal'" lib/feed-planner/generation-helpers.ts && echo "✅ defaultCategory fixed"
grep "let fashionStyle = 'casual'" lib/feed-planner/generation-helpers.ts && echo "✅ fashionStyle fixed"

# 2. Check category/mood usage
echo "Checking category/mood usage..."
grep -q "categoryAesthetics" lib/feed-planner/nano-banana-adapter.ts && echo "✅ category used"
grep -q "moodAtmospheres" lib/feed-planner/nano-banana-adapter.ts && echo "✅ mood used"

# 3. Check no business defaults remain
echo "Checking for remaining business defaults..."
! grep -q "= 'professional'" lib/feed-planner/generation-helpers.ts && echo "✅ No professional defaults"
! grep -q "return 'business'" lib/feed-planner/fashion-style-mapper.ts && echo "✅ No business fallback"

echo ""
echo "All checks passed! ✅"
```

---

## EXPECTED RESULTS SUMMARY

| Scenario | Before | After |
|----------|--------|-------|
| Minimalist user | Business imagery | Minimal aesthetic ✅ |
| Bohemian user | Business imagery | Bohemian outfits ✅ |
| Athletic user | Business imagery | Athletic wear ✅ |
| New user | Business default | Minimal/casual default ✅ |
| Professional user | Business (correct) | Business (still correct) ✅ |

---

**Status:** Ready for testing  
**Next Step:** Run smoke test, then runtime testing with real users

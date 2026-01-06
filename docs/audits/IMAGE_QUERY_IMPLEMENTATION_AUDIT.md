# Image Query Implementation Audit

## Executive Summary
❌ **CRITICAL ISSUE**: The new `enrichConceptsWithImages` function has **time-based restrictions** that prevent permanent image persistence. Images older than 30 days won't be found, breaking the requirement that "images should stay permanently inside their card on generation."

## What Was Working Before (Pro Concept Cards)

### ✅ Pro Concept Cards (`ConceptCardPro.tsx`)
- **localStorage-based persistence**: Images were saved to `localStorage` with key `pro-generation-${concept.id}`
- **On mount**: Restored `generatedImageUrl` from localStorage
- **On generation**: Saved image URL to localStorage immediately
- **Permanent**: No time limits - images persisted forever (until localStorage cleared)
- **Also checks prop**: Component checks `concept.generatedImageUrl` prop (added in recent fix)

### How It Worked:
```typescript
// On mount - restore from localStorage
const saved = localStorage.getItem(`pro-generation-${concept.id}`)
if (savedIsGenerated && savedImageUrl) {
  setGeneratedImageUrl(savedImageUrl)
  setIsGenerated(true)
}

// On generation - save to localStorage
localStorage.setItem(storageKey, JSON.stringify({
  generatedImageUrl: data.imageUrl,
  isGenerated: true
}))
```

## What's Broken Now

### ❌ Time-Based Restrictions (WRONG)
```typescript
// Line 59-63: 30-day time window
const timeWindowDays = 30
const timeWindowStart = new Date(messageCreatedAt.getTime() - timeWindowDays * 24 * 60 * 60 * 1000)
const timeWindowEnd = new Date(messageCreatedAt.getTime() + 1 * 24 * 60 * 60 * 1000)

// Line 117-118: Applied to queries
AND created_at >= ${timeWindowStart}::timestamp
AND created_at <= ${timeWindowEnd}::timestamp
```

**Problem**: Images generated more than 30 days ago won't be found!

### ❌ Time Proximity Fallbacks (WRONG)
```typescript
// Line 168-169: 2-hour window
const timeWindowBefore = new Date(messageCreatedAt.getTime() - 2 * 60 * 60 * 1000)
const timeWindowAfter = new Date(messageCreatedAt.getTime() + 2 * 60 * 60 * 1000)

// Line 194-195: 24-hour window
const time24hStart = new Date(messageCreatedAt.getTime() - 24 * 60 * 60 * 1000)
const time24hEnd = new Date(messageCreatedAt.getTime() + 24 * 60 * 60 * 1000)
```

**Problem**: If prompt matching fails, it only looks within 2-24 hours. Images generated days/weeks later won't be found!

## Over-Engineering Issues

### 1. Multiple Fallback Methods (Unnecessary Complexity)
- Method 1: `generated_images` by prompt match
- Method 2: `ai_images` by exact `generated_prompt` match
- Method 3: `ai_images` by partial `generated_prompt` match
- Method 4: Time proximity (2 hours)
- Method 5: Time proximity (24 hours)

**Should be**: Check JSONB first → Query by concept ID → Query by prediction ID → Done

### 2. Not Checking JSONB First (Wrong Priority)
The function doesn't check if `concept.generatedImageUrl` already exists in the JSONB data loaded from database. It should be:
1. ✅ Check if `concept.generatedImageUrl` exists (already in JSONB) → Return immediately
2. ✅ Query by `concept_card_id` (if concept has real UUID)
3. ✅ Query by `prediction_id` (for Pro Mode)
4. ❌ Remove all time-based queries

### 3. Duplicated Logic
- `ConceptCardPro.tsx` has localStorage logic
- `enrichConceptsWithImages` has database querying
- Both try to do the same thing (persist images)
- **Should be**: Database JSONB is source of truth, localStorage is optional cache

## What Should Happen

### Correct Flow:
1. **On generation**: Save `generatedImageUrl` to `concept_cards` JSONB in database
2. **On load**: 
   - Check if `concept.generatedImageUrl` exists in loaded JSONB → Use it
   - If missing, query database by `concept_card_id` or `prediction_id` (NO time limits)
   - Update JSONB with found image URL
3. **localStorage**: Optional cache only (don't rely on it)

### Simple Query (No Time Limits):
```typescript
// Query by concept_card_id (permanent, no time limit)
SELECT image_url FROM generated_images 
WHERE concept_card_id = ${conceptId}::uuid
  AND user_id = ${userId}
ORDER BY created_at DESC LIMIT 1

// Query by prediction_id (permanent, no time limit)
SELECT image_url FROM ai_images 
WHERE prediction_id = ${concept.predictionId}
  AND user_id = ${userId}
ORDER BY created_at DESC LIMIT 1
```

## Conflicts & Inconsistencies

### 1. localStorage vs Database
- **Pro cards**: Use localStorage as primary storage
- **New code**: Uses database queries with time limits
- **Conflict**: Two different systems, localStorage can be cleared, database has time limits

### 2. Time Limits vs Permanent
- **Requirement**: "Images should stay permanently inside their card"
- **Implementation**: 30-day time window prevents permanent persistence
- **Conflict**: Direct contradiction

### 3. Concept ID Matching
- **Pro Mode**: Uses `prediction_id` to link images
- **Classic Mode**: Uses `concept_card_id` (but might not exist in all table versions)
- **Inconsistency**: Different matching strategies for different modes

## Missing Logic

### 1. Not Saving Back to JSONB
When an image is found via database query, it should be saved back to the `concept_cards` JSONB so it persists:
```typescript
// After finding image, should update message:
UPDATE maya_chat_messages 
SET concept_cards = jsonb_set(concept_cards, '{0,generatedImageUrl}', $1)
WHERE id = ${messageId}
```

**Current State**: Images are saved to `ai_images` table with `prediction_id`, but `generatedImageUrl` is NOT saved back to `concept_cards` JSONB. This means:
- Images exist in database
- But concept cards JSONB doesn't have the URL
- On page reload, JSONB is empty → enrichment function runs → but time limits prevent finding old images

### 2. Not Checking JSONB First
The function skips concepts that already have `generatedImageUrl`, but it should also check if the image URL is valid/still exists.

### 3. Pro Mode Uses `prediction_id` But Not Saved to Concept
- Pro Mode generates images with `prediction_id`
- Images saved to `ai_images` table with `prediction_id`
- But `concept.predictionId` might not be in the JSONB
- So querying by `prediction_id` might not work if concept doesn't have it

## Recommendations

### ✅ Simple Fix:
1. **Remove all time windows** from queries
2. **Check JSONB first**: If `concept.generatedImageUrl` exists, use it
3. **Query by ID only**: 
   - `concept_card_id` → `generated_images`
   - `prediction_id` → `ai_images`
4. **No prompt matching**: Too unreliable, can match wrong images
5. **No time proximity**: Images should be permanent, not time-based

### ✅ Correct Implementation:
```typescript
async function enrichConceptsWithImages(concepts, neonUser) {
  // 1. Skip if already has image URL in JSONB
  if (concept.generatedImageUrl) return concept
  
  // 2. Query by concept_card_id (if UUID)
  if (concept.id && !concept.id.startsWith('concept-')) {
    const image = await sql`
      SELECT image_url FROM generated_images 
      WHERE concept_card_id = ${concept.id}::uuid
        AND user_id = ${userId}
      ORDER BY created_at DESC LIMIT 1
    `
    if (image?.image_url) {
      return { ...concept, generatedImageUrl: image.image_url }
    }
  }
  
  // 3. Query by prediction_id (Pro Mode)
  if (concept.predictionId) {
    const image = await sql`
      SELECT image_url FROM ai_images 
      WHERE prediction_id = ${concept.predictionId}
        AND user_id = ${userId}
      ORDER BY created_at DESC LIMIT 1
    `
    if (image?.image_url) {
      return { ...concept, generatedImageUrl: image.image_url }
    }
  }
  
  return concept // No image found
}
```

## Summary

| Issue | Severity | Impact |
|-------|----------|--------|
| Time windows (30 days) | 🔴 Critical | Images older than 30 days won't be found |
| Time proximity (2-24h) | 🔴 Critical | Images generated days later won't be found |
| Not checking JSONB first | 🟡 High | Unnecessary database queries |
| Over-complicated fallbacks | 🟡 Medium | Hard to maintain, error-prone |
| Not saving back to JSONB | 🟡 Medium | Images won't persist in JSONB |
| Duplicated localStorage logic | 🟢 Low | Two systems doing same thing |

**Root Cause**: Added time-based restrictions when requirement is permanent persistence.

**Fix**: Remove all time windows, simplify to ID-based queries only, check JSONB first.


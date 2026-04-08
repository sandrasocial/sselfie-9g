# Quality Baseline Integration Example

**Phase 2C-4-3: Prompt Quality Baseline**  
**Purpose**: Show exactly how to add quality monitoring to a generation endpoint

---

## Example: Add Quality Monitoring to Maya Generation

### Current Code (Before)

**File**: `app/api/maya/check-generation/route.ts`

```typescript
// Line ~54-61: After blob upload completes
await sql`
  UPDATE generated_images
  SET 
    image_urls = ${blob.url},
    selected_url = ${blob.url},
    saved = false
  WHERE id = ${Number.parseInt(generationId)}
`

// Line ~63-97: Save to ai_images gallery
await sql`
  INSERT INTO ai_images (
    user_id,
    image_url,
    prompt,
    generated_prompt,
    prediction_id,
    generation_status,
    source,
    category,
    created_at
  ) VALUES (...)
`

// Return success response
return NextResponse.json({
  success: true,
  imageUrl: blob.url,
})
```

### New Code (After Adding Quality Hook)

**File**: `app/api/maya/check-generation/route.ts`

```typescript
// ADD THIS IMPORT AT TOP OF FILE
import { hookMayaGeneration } from '@/lib/quality/hooks'

// ... existing code ...

// Line ~54-61: After blob upload completes
await sql`
  UPDATE generated_images
  SET 
    image_urls = ${blob.url},
    selected_url = ${blob.url},
    saved = false
  WHERE id = ${Number.parseInt(generationId)}
`

// Line ~63-97: Save to ai_images gallery
await sql`
  INSERT INTO ai_images (...)
`

// ✨ NEW: Add quality monitoring hook (3 lines)
hookMayaGeneration({
  imageUrl: blob.url,
  prompt: generation.description || generation.subcategory || "",
  userId: generation.user_id,
  generationId: generationId,
  predictionId: predictionId,
  category: generation.category,
}).catch(() => {}) // Fire-and-forget, don't affect generation

// Return success response (unchanged)
return NextResponse.json({
  success: true,
  imageUrl: blob.url,
})
```

### What Changed

**Added**:
1. Import statement (1 line at top)
2. Hook call (3 lines after successful save)
3. `.catch(() => {})` to ensure errors don't affect generation

**Total Lines Added**: 4  
**Behavior Changed**: None (fire-and-forget async)

---

## Example: Feed Post Generation

**File**: `app/api/feed/[feedId]/check-post/route.ts`

### Add This After Line ~174 (After image save):

```typescript
import { hookFeedPostGeneration } from '@/lib/quality/hooks'

// After successful image save (line ~165-172)
await sql`
  UPDATE feed_posts
  SET 
    image_url = ${blobUrl},
    generation_status = 'completed',
    updated_at = NOW()
  WHERE id = ${Number.parseInt(postId)}
`

// ✨ NEW: Add quality monitoring
hookFeedPostGeneration({
  imageUrl: blobUrl,
  prompt: post.prompt || "",
  userId: post.user_id,
  postId: postId,
  predictionId: predictionId,
  category: 'feed-post',
}).catch(() => {})

// Rest of code continues...
```

---

## Example: Photoshoot Generation (9-Image Carousel)

**File**: `app/api/maya/check-photoshoot-prediction/route.ts`

### Add This Inside the Image Loop (After Line ~95):

```typescript
import { hookPhotoshootGeneration } from '@/lib/quality/hooks'

// Inside the loop (line ~64-153) after each image is saved
for (let i = 0; i < temporaryImageUrls.length; i++) {
  // ... existing upload code ...
  
  const blob = await put(`photoshoots/${predictionId}-${i}.png`, imageBlob, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: true,
  })
  
  // ... existing ai_images insert ...
  
  // ✨ NEW: Add quality monitoring for this image
  hookPhotoshootGeneration({
    imageUrl: blob.url,
    prompt: fluxPrompts[i],
    userId: numericUserId,
    predictionId: predictionId,
    conceptDescription: conceptDescription,
    imageIndex: i,
  }).catch(() => {})
  
  // Continue loop...
}
```

---

## Example: Studio Generation (4 Variants)

**File**: `app/api/studio/generation/[id]/route.ts`

### Add This Inside the Upload Loop (After Line ~66):

```typescript
import { hookStudioGeneration } from '@/lib/quality/hooks'

// Inside the loop (line ~55-72) after each variant is uploaded
for (const imageUrl of imageUrls) {
  // ... existing upload code ...
  
  const blob = await put(`studio/${generationId}-${uploadedUrls.length}.png`, imageBlob, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: true,
  })
  
  uploadedUrls.push(blob.url)
  
  // ✨ NEW: Add quality monitoring for this variant
  hookStudioGeneration({
    imageUrl: blob.url,
    prompt: generation.prompt,
    userId: generation.user_id,
    generationId: generationId.toString(),
    predictionId: generation.image_urls, // This is the prediction ID
    category: generation.category,
  }).catch(() => {})
}
```

---

## Critical Rules for Integration

### ✅ DO

1. **Call AFTER successful save**: Only hook when image is safely stored
2. **Use .catch(() => {})**: Prevent errors from affecting generation
3. **Fire-and-forget**: Never await the hook
4. **Pass accurate data**: Use actual prompt, user ID, etc.
5. **Keep existing code unchanged**: Only add the hook call

### ❌ DON'T

1. **Don't await the hook**: It's intentionally async
2. **Don't wrap in try/catch that affects generation**: Keep it isolated
3. **Don't modify prompts**: Pass them as-is
4. **Don't block on errors**: Monitoring failures shouldn't affect users
5. **Don't change return values**: Hook doesn't affect response

---

## Verification After Integration

### 1. Check Logs

Look for quality monitoring messages:

```
[PROMPT-QUALITY] 🔍 Starting quality assessment...
[PROMPT-QUALITY] Source: maya
[PROMPT-QUALITY] Model: flux-dev
[PROMPT-QUALITY] ✅ Quality assessment complete
[PROMPT-QUALITY] Realism score: 72
[PROMPT-QUALITY] ✅ Metrics saved to database
```

### 2. Check Database

```sql
SELECT COUNT(*), source
FROM prompt_quality_metrics
WHERE created_at >= NOW() - INTERVAL '1 day'
GROUP BY source;
```

Expected output:
```
 count | source
-------+----------
   15  | maya
   8   | feed
   2   | studio
```

### 3. View Quality Report

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/admin/quality-report?format=text"
```

---

## Rollback Plan

If issues occur:

1. **Remove import statement**:
   ```diff
   - import { hookMayaGeneration } from '@/lib/quality/hooks'
   ```

2. **Remove hook call**:
   ```diff
   - hookMayaGeneration({...}).catch(() => {})
   ```

3. **Deploy**: Behavior returns to pre-integration state

**Risk**: None (fire-and-forget means it can't break generation)

---

## Next Steps

1. ✅ Create quality baseline module → **DONE**
2. ✅ Create database schema → **DONE**
3. ✅ Create reporting functions → **DONE**
4. ✅ Create admin API → **DONE**
5. ⏭️ **Add hooks to 4-5 key endpoints** → **NEXT**
6. ⏭️ Enable monitoring in production → **NEXT**
7. ⏭️ Collect baseline data for 1-2 weeks → **NEXT**
8. ⏭️ Review first weekly report → **NEXT**

---

**Total Integration Effort**: ~20 minutes to add hooks to all endpoints  
**Risk Level**: Minimal (fire-and-forget, no behavioral changes)  
**Benefit**: Objective quality tracking and regression detection

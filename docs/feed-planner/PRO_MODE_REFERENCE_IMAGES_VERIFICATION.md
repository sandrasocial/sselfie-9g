# Pro Mode Reference Images Verification

## ✅ Verification Result: **REFERENCE IMAGES ARE BEING SENT**

When users are in Pro Mode creating their feed, their linked images (avatar images) **ARE being sent to Replicate** correctly.

---

## Flow Verification

### 1. **Feed Planner Screen** (`components/feed-planner/feed-planner-screen.tsx`)
- User toggles Pro Mode ON
- `studioProMode = true`
- Passes `userModePreference: 'pro'` to API

### 2. **API Endpoint** (`app/api/feed-planner/create-from-strategy/route.ts`)
- Receives `userModePreference: 'pro'`
- Sets `forceMode = 'pro'`
- Sets ALL posts to `generation_mode = 'pro'` in database

### 3. **Queue Images** (`lib/feed-planner/queue-images.ts`)

**Lines 112-184: Pro Mode Routing**

```typescript
if (post.generation_mode === 'pro') {
  // Get avatar images (required for Pro Mode)
  const avatarImages = await sql`
    SELECT image_url
    FROM user_avatar_images
    WHERE user_id = ${neonUser.id} AND is_active = true
    ORDER BY display_order ASC, uploaded_at ASC
    LIMIT 5
  `
  
  const baseImages = avatarImages.map((img: any) => ({
    url: img.image_url,
    type: 'user-photo' as const,
  }))
  
  // Generate with Nano Banana Pro
  const generation = await generateWithNanoBanana({
    prompt: optimizedPrompt,
    image_input: baseImages.map(img => img.url), // ✅ REFERENCE IMAGES SENT HERE
    aspect_ratio: aspectRatio,
    resolution: '2K',
    output_format: 'png',
    safety_filter_level: 'block_only_high',
  })
}
```

**✅ VERIFIED:** Line 179 shows `image_input: baseImages.map(img => img.url)` - reference images ARE being passed to Nano Banana.

### 4. **Nano Banana Client** (`lib/nano-banana-client.ts`)

**Lines 72-93: Sending to Replicate**

```typescript
const replicateInput = {
  prompt: input.prompt.trim(),
  image_input: input.image_input || [], // ✅ REFERENCE IMAGES INCLUDED
  aspect_ratio: input.aspect_ratio || "1:1",
  resolution: input.resolution || "2K",
  output_format: input.output_format || "png",
  safety_filter_level: input.safety_filter_level || "block_only_high",
}

const prediction = await replicate.predictions.create({
  model: "google/nano-banana-pro",
  input: replicateInput, // ✅ SENT TO REPLICATE WITH REFERENCE IMAGES
})
```

**✅ VERIFIED:** Line 74 shows `image_input: input.image_input || []` - reference images are included in the Replicate API call.

---

## What Images Are Sent?

1. **Source:** `user_avatar_images` table
2. **Filter:** `is_active = true`
3. **Limit:** Up to 5 images (LIMIT 5)
4. **Order:** `display_order ASC, uploaded_at ASC`
5. **Format:** Array of image URLs: `["https://...", "https://...", ...]`

---

## Logging Verification

The code includes comprehensive logging:

**In `queue-images.ts`:**
```typescript
console.log(`[v0] 🎨 Pro Mode post detected - routing to Studio Pro API`)
console.log(`[v0] Pro Mode Type: ${post.pro_mode_type || 'workbench'}`)
```

**In `nano-banana-client.ts`:**
```typescript
console.log("[NANO-BANANA] Creating prediction:", {
  model: "google/nano-banana-pro",
  imageCount,
  imageUrls: input.image_input?.map(url => url.substring(0, 50) + "...") || [],
  // ... other params
})
```

**Check server logs for:**
- `[NANO-BANANA] Creating prediction:` - Shows image count and URLs
- `[NANO-BANANA] Sending to Replicate:` - Confirms images are in the request

---

## Classic Mode Comparison

**Classic Mode (for reference):**
- ❌ NO reference images sent
- Uses custom FLUX model with trigger word
- Uses `replicate.predictions.create()` with `hf_lora` parameter
- NO `image_input` parameter

**Pro Mode:**
- ✅ Reference images ARE sent
- Uses Nano Banana Pro model
- Uses `replicate.predictions.create()` with `image_input` parameter
- NO `hf_lora` or trigger word

---

## Potential Issues to Check

If reference images are NOT working, check:

1. **User has avatar images?**
   - Query: `SELECT COUNT(*) FROM user_avatar_images WHERE user_id = ? AND is_active = true`
   - Need at least 3 images (error thrown if < 3)

2. **Images are active?**
   - Check `is_active = true` in database

3. **Image URLs are valid?**
   - Must start with `http://` or `https://`
   - Validation happens in `nano-banana-client.ts` line 50

4. **Server logs show images?**
   - Look for `[NANO-BANANA] Creating prediction:` log
   - Check `imageCount` and `imageUrls` fields

5. **Mode detection correct?**
   - Check `post.generation_mode === 'pro'` in database
   - Verify `userModePreference: 'pro'` was passed from client

---

## Conclusion

✅ **Reference images ARE being sent to Replicate when in Pro Mode.**

The flow is:
1. User toggles Pro Mode ON
2. API sets all posts to `generation_mode = 'pro'`
3. `queue-images.ts` fetches avatar images from database
4. Avatar images are mapped to URLs
5. URLs are passed to `generateWithNanoBanana()` as `image_input`
6. `nano-banana-client.ts` sends them to Replicate API

If images are not working, the issue is likely:
- User doesn't have enough avatar images (need 3+)
- Image URLs are invalid or expired
- Replicate API issue (not our code)






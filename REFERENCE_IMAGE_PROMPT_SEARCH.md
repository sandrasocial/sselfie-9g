# Reference Image Prompt Search

## Reference Image Details
- **Image URL:** `https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-generations/5371-5zfmu8vHOBsGIdxUE0O4Q9c9u3hvzR.png`
- **Created Date:** December 13, 2025, 12:24:21 GMT
- **Image ID Pattern:** `5371-5zfmu8vHOBsGIdxUE0O4Q9c9u3hvzR`
- **Possible Generation ID:** `5371` (numeric)

## Database Search Methods

### Method 1: Direct Database Query (Recommended)

Connect to your Neon database and run:

```sql
-- Search by generation ID
SELECT 
  id,
  user_id,
  prompt,
  description,
  category,
  subcategory,
  image_urls,
  selected_url,
  created_at
FROM generated_images
WHERE id = 5371
LIMIT 1;

-- Search by URL pattern in ai_images
SELECT 
  id,
  user_id,
  image_url,
  prompt,
  generated_prompt,
  category,
  created_at
FROM ai_images
WHERE image_url LIKE '%5371%' 
   OR image_url LIKE '%5zfmu8vHOBsGIdxUE0O4Q9c9u3hvzR%'
ORDER BY created_at DESC
LIMIT 5;

-- Search by date range (Dec 13, 2025 ± 1 day)
SELECT 
  id,
  user_id,
  prompt,
  description,
  image_urls,
  selected_url,
  created_at
FROM generated_images
WHERE created_at >= '2025-12-12 00:00:00'::timestamp
  AND created_at <= '2025-12-14 23:59:59'::timestamp
ORDER BY created_at DESC
LIMIT 50;
```

### Method 2: API Route (Requires Authentication)

I've created an API route at `/api/debug/find-reference-image` that searches both tables.

**To use it:**
1. Make sure you're logged in to the application
2. Visit: `http://localhost:3000/api/debug/find-reference-image?imageId=5371&url=5371-5zfmu8vHOBsGIdxUE0O4Q9c9u3hvzR`
3. Or use curl with authentication cookies:
   ```bash
   curl -b cookies.txt "http://localhost:3000/api/debug/find-reference-image?imageId=5371&url=5371-5zfmu8vHOBsGIdxUE0O4Q9c9u3hvzR"
   ```

### Method 3: Check Application Logs

If the image was generated recently, check:
- Server logs around December 13, 2025, 12:24 GMT
- Look for log entries containing "5371" or the image URL
- Check Replicate prediction logs if prediction_id is stored

## Database Tables to Check

### 1. `generated_images` Table
- **Primary table** for Maya chat concept card generations
- Stores: `id`, `prompt`, `description`, `category`, `subcategory`, `image_urls`, `selected_url`, `created_at`
- The `prompt` column contains the full FLUX prompt used

### 2. `ai_images` Table
- **Gallery table** that stores completed images
- Stores: `prompt` (short description) and `generated_prompt` (full FLUX prompt)
- Images are copied here from `generated_images` when generation completes

### 3. `concept_cards` Table (if applicable)
- May store the concept card that generated this image
- Contains: `prompt`, `description`, `title`

## What to Look For

When you find the prompt, check for:

1. **Lighting Description:**
   - Old style: "Soft afternoon sunlight", "Warm golden hour lighting"
   - New style: "Uneven natural lighting", "Mixed color temperatures"

2. **Authenticity Keywords:**
   - "candid photo" or "candid moment"
   - "amateur cellphone photo" or "cellphone photo"

3. **Prompt Length:**
   - Should be 50-80 words (optimal for LoRA activation)

4. **Camera Specs:**
   - "shot on iPhone 15 Pro portrait mode, shallow depth of field"

5. **Overall Structure:**
   - Trigger word first
   - Gender/ethnicity
   - Outfit details
   - Setting
   - Lighting
   - Pose
   - Camera specs

## Next Steps After Finding the Prompt

1. **Compare with Current Prompts:**
   - Generate a new prompt with current code
   - Compare side-by-side with reference prompt

2. **Identify Differences:**
   - What lighting terms were used?
   - Were authenticity keywords present?
   - How long was the prompt?
   - What was the structure?

3. **Determine What Changed:**
   - If reference uses old lighting → revert lighting changes
   - If reference uses new lighting → check other factors
   - Compare word count and structure

4. **Test Hypothesis:**
   - Try generating with reference prompt structure
   - Test reverting specific changes
   - A/B test different approaches

## Files Created

1. **`app/api/debug/find-reference-image/route.ts`** - API endpoint to search database
2. **`scripts/check-reference-image-prompt.ts`** - Standalone script (needs DATABASE_URL env var)

## Notes

- The image URL pattern suggests the generation ID is `5371`
- The suffix `-5zfmu8vHOBsGIdxUE0O4Q9c9u3hvzR` is added by Vercel Blob storage (`addRandomSuffix: true`)
- The image was created AFTER the December 12 changes, so it should have the new lighting descriptions
- If the reference image quality is good, the December 12 changes may have been correct
- If current quality is worse, something else may have changed after December 13

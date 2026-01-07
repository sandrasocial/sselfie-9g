# Pro Photoshoot Feature Documentation

## Overview

Pro Photoshoot is an advanced feature that allows users to generate multiple 3x3 photo grids (9 frames each) from a single concept card. Each grid maintains perfect facial consistency while exploring different camera angles and compositions.

**Status:** Admin-only (testing phase)
**Credit Cost:** 3 credits per grid (4K resolution)
**Max Grids:** 8 grids per session (72 frames total)

---

## User Guide

### Getting Started

1. **Generate a Concept Card**
   - Create a concept in Maya Studio (Pro Mode)
   - Generate an image for the concept
   - The "Create Pro Photoshoot" button will appear

2. **Start Pro Photoshoot**
   - Click "Create Pro Photoshoot" button
   - Session is created automatically
   - Grid 1 starts generating immediately

3. **Generate More Grids**
   - Click "Generate X More Grids" button (max 3 at once)
   - Each grid costs 3 credits
   - Progress shown: "X/8 grids"

4. **Create Carousel (Optional)**
   - Hover over any completed grid
   - Click "Create Carousel" button
   - 9 frames become swipeable carousel slides

---

## Technical Documentation

### API Endpoints

#### POST `/api/maya/pro/photoshoot/start-session`
Creates or resumes a Pro Photoshoot session.

**Request:**
```json
{
  "originalImageId": 123,
  "totalGrids": 8,
  "avatarImages": ["url1", "url2", "url3"]
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": 456,
  "totalGrids": 8,
  "status": "active",
  "grids": [],
  "avatarImages": ["url1", "url2", "url3"]
}
```

#### POST `/api/maya/pro/photoshoot/generate-grid`
Generates a single 3x3 grid.

**Request:**
```json
{
  "originalImageId": 123,
  "gridNumber": 1,
  "sessionId": 456,
  "avatarImages": ["url1", "url2", "url3"],
  "customPromptData": {
    "outfit": "black dress",
    "location": "modern setting",
    "colorGrade": "natural tones"
  }
}
```

**Response:**
```json
{
  "success": true,
  "gridId": 789,
  "predictionId": "pred_abc123",
  "status": "generating",
  "creditsDeducted": 3,
  "newBalance": 97
}
```

#### GET `/api/maya/pro/photoshoot/check-grid`
Polls grid generation status and processes completed grids.

**Query Parameters:**
- `predictionId`: Replicate prediction ID
- `gridId`: Grid database ID

**Response:**
```json
{
  "status": "completed",
  "gridUrl": "https://blob.vercel-storage.com/grid.png",
  "frames": [
    {"frameNumber": 1, "frameUrl": "https://...", "galleryImageId": 1},
    ...
  ]
}
```

#### POST `/api/maya/pro/photoshoot/create-carousel`
Creates a carousel from a completed grid.

**Request:**
```json
{
  "gridId": 789
}
```

**Response:**
```json
{
  "success": true,
  "gridId": 789,
  "frameUrls": ["url1", "url2", ...],
  "galleryImageIds": [1, 2, ...],
  "framesCount": 9
}
```

#### GET `/api/maya/pro/photoshoot/lookup-image`
Looks up an image ID from prediction ID or image URL.

**Query Parameters:**
- `predictionId`: Replicate prediction ID (optional)
- `imageUrl`: Image URL (optional)

**Response:**
```json
{
  "success": true,
  "imageId": 123
}
```

---

## Database Schema

### `pro_photoshoot_sessions`
Stores Pro Photoshoot sessions.

```sql
CREATE TABLE pro_photoshoot_sessions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  original_image_id INTEGER NOT NULL REFERENCES ai_images(id),
  total_grids INTEGER NOT NULL DEFAULT 8,
  session_status TEXT NOT NULL CHECK (session_status IN ('active', 'completed', 'cancelled')),
  avatar_images JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `pro_photoshoot_grids`
Stores individual grids within a session.

```sql
CREATE TABLE pro_photoshoot_grids (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES pro_photoshoot_sessions(id) ON DELETE CASCADE,
  grid_number INTEGER NOT NULL CHECK (grid_number >= 1 AND grid_number <= 8),
  prompt TEXT NOT NULL,
  grid_url TEXT,
  prediction_id TEXT,
  generation_status TEXT NOT NULL CHECK (generation_status IN ('pending', 'generating', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, grid_number)
);
```

### `pro_photoshoot_frames`
Stores individual frames from grids (for carousels).

```sql
CREATE TABLE pro_photoshoot_frames (
  id SERIAL PRIMARY KEY,
  grid_id INTEGER NOT NULL REFERENCES pro_photoshoot_grids(id) ON DELETE CASCADE,
  frame_number INTEGER NOT NULL CHECK (frame_number >= 1 AND frame_number <= 9),
  frame_url TEXT NOT NULL,
  gallery_image_id INTEGER REFERENCES ai_images(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(grid_id, frame_number)
);
```

---

## Credit Costs

- **Per Grid:** 3 credits (4K resolution)
- **Max Grids:** 8 grids per session
- **Total Cost:** Up to 24 credits for full session (8 grids)
- **Carousel Creation:** Free (no additional credits)

---

## Image Input Strategy

### Always Include Avatar Images
- Avatar images are ALWAYS included in `image_input`
- First 3-5 images in array = primary facial reference
- Ensures perfect facial consistency across all grids

### Include Previous Grids
- ALL previous grids are included as style references
- Maintains outfit/location/colorgrade consistency
- Grids added after avatar images

### 14 Image Limit
- Nano Banana Pro maximum: 14 images
- If exceeded:
  - Keep ALL avatar images
  - Remove oldest grids (keep newest)
  - Final count = 14 images

**Example:**
- 5 avatars + 10 grids = 15 images ❌
- Solution: 5 avatars + 9 newest grids = 14 images ✅

---

## Prompt Strategy

### Grid 1: Custom Prompt
- Uses concept data (outfit, location, colorGrade)
- Can be enhanced with Maya-generated prompt (future)
- Includes base requirements (grid layout, consistency, etc.)

### Grids 2-8: Universal Prompt
- Same prompt for all subsequent grids
- Focuses on angle variety
- Style consistency maintained via image references

**Universal Prompt:**
```
Create a totally new 3x3 photo grid featuring the same model shown in nine distinct photographic compositions, maintaining perfect facial and body consistency. Each frame represents a new unique camera perspective: portrait close-up, mid-shot, full-body product shot, macro texture detail, low-angle dynamic pose, high-angle cinematic perspective, wide-angle lifestyle scene, ultra-wide environmental context, and over-the-shoulder narrative shot. The grid layout is clean and symmetrical with subtle separation lines. Each photo is realistically lit and color-graded for a cohesive visual set. The model's identity, outfit, and environment remain consistent across all shots, emphasizing photographic diversity and visual storytelling coherence. High-resolution, photorealistic style. The angle must be different from the reference image.
```

---

## Feature Flags

### `FEATURE_PRO_PHOTOSHOOT_ADMIN_ONLY`
Controls visibility of Pro Photoshoot feature.

**Values:**
- `true` or `1`: Feature visible to admins only
- `false` or `0`: Feature hidden (default)

**Location:** Environment variable or `admin_feature_flags` table

---

## Admin Access

Pro Photoshoot requires admin access:
- Feature flag must be enabled
- User must have `role = 'admin'` in `users` table
- All API routes check admin status
- UI hides button for non-admins

---

## Troubleshooting

### Grid Generation Fails
- Check credit balance (need 3 credits per grid)
- Verify avatar images are accessible URLs
- Check Replicate API status
- Review server logs for errors

### Carousel Not Creating
- Ensure grid is completed (status = "completed")
- Check grid URL is accessible
- Verify Blob storage permissions
- Review frame splitting logs

### Style Inconsistency
- Verify previous grids are included in `image_input`
- Check that avatar images are first in array
- Ensure 14 image limit isn't excluding important grids

### Credit Deduction Issues
- Check credit balance before generation
- Verify transaction is recorded in `credit_transactions`
- Check transaction type is "image"
- Verify amount is -3 credits

---

## Performance Considerations

### Generation Time
- Grid generation: ~1-2 minutes per grid
- Parallel generation: Up to 3 grids at once
- Carousel creation: ~5-10 seconds

### Database Performance
- Indexes on `session_id`, `grid_number`, `user_id`
- Foreign keys with CASCADE delete
- Efficient queries for previous grids

### Storage
- Grid images: ~5-10 MB each (4K)
- Frame images: ~1-2 MB each
- Total per session: ~50-100 MB (8 grids + frames)

---

## Future Enhancements

1. **Maya Prompt Generation for Grid 1**
   - Use Pro Photoshoot context addon
   - Generate custom prompts based on concept

2. **User-Facing Version**
   - Remove admin-only restriction
   - Make available to all Pro Mode users

3. **Additional Features**
   - Batch operations
   - Grid templates
   - Style presets
   - Analytics dashboard

---

## Support

For issues or questions:
- Check server logs: `/api/maya/pro/photoshoot/*`
- Review database: `pro_photoshoot_*` tables
- Check feature flag: `FEATURE_PRO_PHOTOSHOOT_ADMIN_ONLY`
- Verify admin access: `users.role = 'admin'`

---

**Last Updated:** 2024-12-19
**Version:** 1.0
**Status:** Admin-Only (Testing Phase)


# Maya Pro Photoshoot Architecture Audit
**Purpose:** Document the CORRECT incremental generation pattern  
**Status:** ✅ Complete  
**Date:** January 9, 2026

---

## Executive Summary

Maya Pro Photoshoot generates **8 grids total** (each grid = 9 frames).  
It uses a **session-based incremental pattern** where:
- Each grid is generated **one at a time** (not all at once)
- Client **polls for completion** after starting each generation
- Progress is **saved incrementally** to the database
- UI shows **real-time progress** (Grid 1/8, 2/8, etc.)

**KEY INSIGHT:** Paid Blueprint should clone this exact architecture.

---

## 🔍 Question 1: How is a "photoshoot" job represented?

### Answer: Session-based DB pattern

**Tables:**
```
pro_photoshoot_sessions (parent)
  ├── pro_photoshoot_grids (children)
      └── pro_photoshoot_frames (grandchildren)
```

**Schema Details:**

#### `pro_photoshoot_sessions`
```sql
id SERIAL PRIMARY KEY
user_id TEXT (references users)
original_image_id INTEGER (references ai_images)
total_grids INTEGER DEFAULT 8
session_status TEXT ('active' | 'completed' | 'cancelled')
created_at, updated_at, completed_at
```

#### `pro_photoshoot_grids`
```sql
id SERIAL PRIMARY KEY
session_id INTEGER (references pro_photoshoot_sessions)
grid_number INTEGER (1-8)
prediction_id TEXT (Replicate prediction ID)
grid_url TEXT (full 3x3 grid URL after completion)
generation_status TEXT ('pending' | 'generating' | 'completed' | 'failed')
prompt TEXT (prompt used for generation)
created_at, updated_at, completed_at
UNIQUE(session_id, grid_number)
```

#### `pro_photoshoot_frames`
```sql
id SERIAL PRIMARY KEY
grid_id INTEGER (references pro_photoshoot_grids)
frame_number INTEGER (1-9)
frame_url TEXT (individual frame URL)
gallery_image_id INTEGER (references ai_images - for reuse in carousels)
created_at
UNIQUE(grid_id, frame_number)
```

**Idempotency Handling:**
- If session already exists for `(user_id, original_image_id, status='active')` → return existing session
- If grid already exists for `(session_id, grid_number, status='completed')` → skip regeneration
- UNIQUE constraints prevent duplicates

---

## 🔍 Question 2: How does Maya Pro run generations incrementally?

### Answer: One-grid-at-a-time with client polling

### API Flow

#### Step 1: Start Session
```typescript
POST /api/maya/pro/photoshoot/start-session
Body: {
  originalImageId: number,
  totalGrids: 8,
  avatarImages: string[] // selfie URLs
}
Response: {
  sessionId: number,
  status: 'active',
  grids: [], // Initially empty
  avatarImages: string[]
}
```

#### Step 2: Generate Grid (ONE at a time)
```typescript
POST /api/maya/pro/photoshoot/generate-grid
Body: {
  sessionId: number,
  originalImageId: number,
  gridNumber: 1-8,
  customPromptData?: {...},
  avatarImages: string[]
}
Actions:
1. Check if grid already completed → return if yes
2. Check credits (3 credits per grid for 4K)
3. Deduct credits BEFORE generation
4. Fetch all previous completed grids
5. Build image_input: [avatarImages] + [previous grids]
6. Generate with Nano Banana Pro
7. Insert/update grid record with prediction_id
8. Return { predictionId, status: 'processing' }
```

#### Step 3: Poll for Completion
```typescript
GET /api/maya/pro/photoshoot/check-grid?predictionId=xxx&gridId=123
Polling Loop (client-side):
- Call every 3-5 seconds
- If status === 'succeeded':
  - Download grid from Replicate
  - Upload to Vercel Blob
  - Split into 9 frames using Sharp
  - Upload each frame to Vercel Blob
  - Save each frame to ai_images gallery
  - Update grid record: grid_url, status='completed'
  - Check if all grids complete → mark session complete
- If status === 'failed':
  - Update grid status to 'failed'
- Return: { status, gridUrl?, frameUrls? }
```

**Timeout Prevention:**
- Each API call completes FAST (< 5 seconds)
- Generation happens in Replicate (async)
- Polling is client-side (no server timeout)

---

## 🔍 Question 3: Where do prompts come from?

### Answer: Template-based system (NOT conversational)

**Source File:** `/lib/maya/pro-photoshoot-prompts.ts`

### Prompt Strategy

#### Grid 1 (Custom Concept)
- **Option A:** Maya LLM generates full custom prompt (stored in `customPromptData.mayaGeneratedPrompt`)
- **Option B:** Fallback template with variables:
  ```
  outfit, location, colorGrade
  ```
- **Result:** Highly customized, unique first grid

#### Grids 2-8 (Universal)
- **Single universal prompt** used for all:
  ```
  "Create a totally new 3x3 photo grid featuring the same model 
  shown in nine distinct photographic compositions..."
  ```
- **Purpose:** Style consistency + diverse angles
- **NO per-grid customization** (speed + consistency)

**Key Function:**
```typescript
getPromptForGrid(gridNumber: number, customPromptData?: {...}): string
// If gridNumber === 1 → custom
// Else → UNIVERSAL_PROMPT
```

---

## 🔍 Question 4: What inputs does Maya Pro require?

### Required Inputs

#### From Client:
```typescript
{
  originalImageId: number,      // Reference image ID
  avatarImages: string[],        // Selfie URLs (1-14 max)
  gridNumber: 1-8,
  sessionId: number,
  customPromptData?: {           // For Grid 1 only
    outfit?: string,
    location?: string,
    colorGrade?: string,
    mayaGeneratedPrompt?: string // Full LLM prompt
  }
}
```

#### Selfie Validation:
- **Count:** 1-14 images (Nano Banana Pro limit)
- **Format:** Valid HTTP(S) URLs
- **Auto-fallback:** If `avatarImages` missing → use `originalImageId` as avatar

#### Vibe/Category Mapping:
- **NOT** mapped from form fields (unlike Blueprint)
- Grid 1 uses custom prompt from Maya chat
- Grids 2-8 use universal prompt (no vibe selection)

#### Resolution/Safety Settings:
```typescript
generateWithNanoBanana({
  prompt: string,
  image_input: string[],        // avatars + previous grids
  aspect_ratio: "1:1",           // 3x3 grid is square
  resolution: "4K",              // ✅ 4K for Pro (3 credits)
  output_format: "png",
  safety_filter_level: "block_only_high"
})
```

#### Credit Cost:
- **4K resolution:** 3 credits per grid
- **8 grids total:** 24 credits for full photoshoot

---

## 🔍 Question 5: What is the exact output pipeline?

### Output Processing Pipeline

#### Stage 1: Generation (Replicate)
```
Nano Banana Pro → ONE 3x3 grid image URL
```

#### Stage 2: Download & Upload
```
1. Fetch grid from Replicate URL
2. Upload full grid to Vercel Blob → grid_url
3. Store in pro_photoshoot_grids table
```

#### Stage 3: Split into Frames
```
Using Sharp:
- Extract 9 frames (3x3 layout)
- Each frame = 1/9 of grid
- Upload each frame to Vercel Blob → frame_url
```

#### Stage 4: Gallery Storage
```
For each frame:
- Insert into ai_images table:
  - user_id
  - image_url = frame_url
  - source = 'pro_photoshoot'
  - category = 'pro_photoshoot'
  - saved = true
  - prediction_id (for tracking)
- Insert into pro_photoshoot_frames table:
  - grid_id
  - frame_number (1-9)
  - frame_url
  - gallery_image_id (link to ai_images)
```

**What UI Expects:**
- **Grid View:** `grid_url` (full 3x3 image)
- **Frame View:** `frameUrls[]` (array of 9 individual frames)
- **Gallery Integration:** `galleryImageIds[]` (for carousel creation)

**Storage Locations:**
```
/pro-photoshoot/grids/{gridId}-full.png       (full grid)
/pro-photoshoot/frames/{gridId}-{1-9}.png     (individual frames)
```

---

## 🔍 Question 6: How does Maya Pro handle failures?

### Failure Handling Strategy

#### Detection:
```typescript
if (prediction.status === "failed") {
  // Update grid status
  await sql`
    UPDATE pro_photoshoot_grids
    SET generation_status = 'failed',
        updated_at = NOW()
    WHERE id = ${gridId}
  `
  
  return { success: false, status: "failed", error: "..." }
}
```

#### Retry Rules:
- **Manual retry:** User clicks "Generate Grid X" again
- **Idempotency:** If grid status = 'completed' → skip regeneration
- **Partial completion:** Other grids are NOT affected
- **Credits:** Already deducted (NOT refunded on failure)

#### User-facing Flow:
- Grid shows "Failed" status
- User can retry specific failed grid
- No "continue generating" needed (each grid independent)

#### Failed Slot Handling:
- Grid number slot remains (doesn't skip to next number)
- Session can complete even if some grids failed
- Session marked 'completed' only when `completed_grids >= total_grids`

---

## 🔍 Question 7: How does Maya Pro gate access?

### Access Control

#### Authentication:
```typescript
const adminCheck = await requireAdmin()
if (!adminCheck.isAdmin || !adminCheck.userId) {
  return 403 Forbidden
}
```
**Currently:** Admin-only (Studio Pro feature)

#### Feature Flag:
```typescript
const featureEnabled = await isProPhotoshootEnabled()
if (!featureEnabled) {
  return 403 Feature not enabled
}
```
**Gating:** Can be toggled via `admin_feature_flags` table

#### Credits:
```typescript
// Check before generation
const hasCredits = await checkCredits(userId, PRO_PHOTOSHOOT_4K_CREDITS)
if (!hasCredits) {
  return 402 Insufficient credits
}

// Deduct BEFORE generation (no refunds on failure)
await deductCredits(userId, 3, "image", "Pro Photoshoot Grid X (4K)")
```

#### Rate Limits:
- **None explicitly implemented** (relies on credit system as natural rate limit)
- Could add rate limit middleware if needed

---

## 🎯 How Paid Blueprint Should Clone This

### Architectural Alignment

| **Maya Pro Photoshoot** | **Paid Blueprint** |
|-------------------------|-------------------|
| `pro_photoshoot_sessions` table | `blueprint_subscribers` table (existing) |
| `pro_photoshoot_grids` table | `paid_blueprint_photo_urls` JSONB (array) |
| 8 grids × 9 frames = 72 images | 30 grids × 9 frames = 270 images |
| Admin auth + credits | Token-based (`access_token`) + purchase flag |
| `requireAdmin()` | `paid_blueprint_purchased === true` |
| 3 credits per grid (4K) | **NO credits** (included in $47 purchase) |
| Universal prompt (Grids 2-8) | Blueprint template system (existing) |
| `customPromptData` (Grid 1) | `strategy_data` + `form_data` (category/mood) |
| `originalImageId` + `avatarImages` | `selfie_image_urls` (from Blueprint flow) |
| Feature flag gating | Feature flag gating (same pattern) |
| Polling `/check-grid` | Polling `/blueprint/check-paid-grid` |

### Key Differences

1. **No session table needed** (Blueprint already has `blueprint_subscribers`)
2. **No frames table needed** (store full grid URLs only → split on demand if needed)
3. **No gallery integration** (Blueprint outputs are standalone, not reused)
4. **Simpler prompt system** (reuse existing Blueprint templates)
5. **Token auth** (no user accounts required)

---

## 📋 Implementation Checklist for Paid Blueprint

### APIs to Create/Modify

#### ✅ Already Exists (PR-3):
- `GET /api/blueprint/get-paid-status` → returns purchase status + photo count

#### ❌ Needs Refactor:
- `POST /api/blueprint/generate-paid` → **MUST** change to incremental pattern:
  - Accept `gridNumber` param (1-30)
  - Generate **ONE grid** per request
  - Return `predictionId` immediately
  - Do NOT wait for completion

#### ❌ Needs Creation:
- `GET /api/blueprint/check-paid-grid` → clone logic from Maya's `check-grid`:
  - Poll Nano Banana prediction
  - Download grid
  - Upload to Vercel Blob
  - Append to `paid_blueprint_photo_urls` JSONB
  - Mark `paid_blueprint_generated = true` when count reaches 30

### Database Changes

**NO new tables needed.**  
**USE existing:**
```sql
blueprint_subscribers (
  ...
  paid_blueprint_purchased BOOLEAN,
  paid_blueprint_photo_urls JSONB DEFAULT '[]'::jsonb, -- Array of 30 grid URLs
  paid_blueprint_generated BOOLEAN DEFAULT FALSE,
  paid_blueprint_generated_at TIMESTAMPTZ,
  selfie_image_urls JSONB, -- Input selfies
  strategy_data JSONB,      -- Prompt source
  form_data JSONB,          -- Category/mood
  access_token TEXT         -- Auth
)
```

### Prompt System

**Reuse existing Blueprint templates:**
```typescript
import { getBlueprintPhotoshootPrompt, BlueprintCategory, BlueprintMood } 
from "@/lib/maya/blueprint-photoshoot-templates"

// Extract from form_data
const category = formData.vibe as BlueprintCategory
const mood = formData.feed_style as BlueprintMood

// Get template (same as free Blueprint)
const prompt = getBlueprintPhotoshootPrompt(category, mood)
```

**NO need for Grid 1 custom prompt** (all grids use same template for consistency).

### Generation Inputs

```typescript
const result = await generateWithNanoBanana({
  prompt,                                      // From template library
  image_input: selfieImageUrls,                // From blueprint_subscribers
  aspect_ratio: "1:1",
  resolution: "2K",                            // 2K (free tier equivalent)
  output_format: "png",
  safety_filter_level: "block_only_high"
})
```

**NO previous grids** in `image_input` (unlike Maya Pro).  
Each grid is **independent** (simpler, faster).

### UI Flow

```
1. User lands on /blueprint?paid=true&access=TOKEN
2. Check status via GET /api/blueprint/get-paid-status
3. If purchased && !generated:
   - Show "Generate my 30 photos" button
4. On click:
   - Loop gridNumber 1-30:
     - POST /generate-paid (gridNumber)
     - Start polling /check-paid-grid (predictionId, gridNumber)
     - Update progress bar (X/30)
5. When all 30 complete:
   - Show gallery of 30 grids
   - Mark generated=true
```

---

## 🚨 Critical Differences from Current PR-4 Implementation

### ❌ What PR-4 Did Wrong

| **Current PR-4** | **Maya Pro Pattern** |
|------------------|----------------------|
| Generate all 30 grids in ONE request | Generate ONE grid per request |
| Long-running API call (timeout risk) | Fast API calls + client polling |
| Used `black-forest-labs/flux-dev` | Uses `google/nano-banana-pro` |
| Generic prompt variations | Template system from Blueprint |
| No selfie inputs | Requires `selfie_image_urls` |
| Concurrency fix added as patch | Idempotency built-in via status checks |

### ✅ What PR-4 Hotfix Must Do

1. **Change to incremental generation** (one grid at a time)
2. **Add polling endpoint** (`/check-paid-grid`)
3. **Use Nano Banana Pro** (match free Blueprint)
4. **Use Blueprint templates** (match free Blueprint)
5. **Require selfie inputs** (from `blueprint_subscribers`)
6. **Remove batching logic** (generate one, poll, repeat)

---

## 🎯 Final Recommendation

**Clone Maya Pro Photoshoot architecture with these simplifications:**

| **Keep from Maya Pro** | **Simplify for Blueprint** |
|------------------------|----------------------------|
| Session-based pattern | Reuse `blueprint_subscribers` (no new session table) |
| One-grid-at-a-time generation | ✅ Same |
| Client polling for completion | ✅ Same |
| Incremental progress saving | ✅ Same |
| Idempotency via status checks | ✅ Same |
| Feature flag gating | ✅ Same |
| Nano Banana Pro | ✅ Same (2K instead of 4K) |
| Template prompts | ✅ Reuse Blueprint templates |
| Credit deduction | ❌ Remove (included in purchase) |
| Gallery integration | ❌ Remove (not needed) |
| Frame splitting | ❌ Defer (store full grids only) |
| Previous grids in `image_input` | ❌ Remove (each grid independent) |

**Result:**  
- **Simpler than Maya Pro** (no new tables, no credits, no gallery)
- **Same reliability** (incremental, idempotent, timeout-proof)
- **Consistent with Free Blueprint** (same model, templates, inputs)

---

## 📄 Files Referenced

### Maya Pro Photoshoot Files (Reference):
```
/app/api/maya/pro/photoshoot/start-session/route.ts
/app/api/maya/pro/photoshoot/generate-grid/route.ts
/app/api/maya/pro/photoshoot/check-grid/route.ts
/lib/maya/pro-photoshoot-prompts.ts
/lib/nano-banana-client.ts
/scripts/53-create-pro-photoshoot-tables.sql
```

### Free Blueprint Files (Reference):
```
/app/api/blueprint/generate-grid/route.ts
/app/api/blueprint/check-grid/route.ts
/lib/maya/blueprint-photoshoot-templates.ts
```

### Paid Blueprint Files (To Modify):
```
/app/api/blueprint/generate-paid/route.ts        (REFACTOR)
/app/api/blueprint/check-paid-grid/route.ts      (CREATE)
/app/api/blueprint/get-paid-status/route.ts      (UPDATE)
```

---

**Audit Complete ✅**  
**Next Step:** Implement PR-4 Hotfix using this architecture.

# PR-4 HOTFIX PLAN: Align with Maya Pro Photoshoot Architecture
**Status:** 🔴 Ready to Implement  
**Complexity:** Medium (refactor existing APIs)  
**Date:** January 9, 2026

---

## 🎯 Objective

**Rewrite PR-4 Paid Blueprint generation to match Maya Pro Photoshoot's proven incremental pattern.**

### What Changes

| **Before (PR-4 v1)** | **After (PR-4 Hotfix)** |
|----------------------|-------------------------|
| Generate all 30 grids in one long request | Generate **one grid at a time** |
| Used `black-forest-labs/flux-dev` | Use `google/nano-banana-pro` ✅ |
| Generic prompt variations | Use Blueprint template system ✅ |
| No selfie inputs | Require `selfie_image_urls` ✅ |
| Timeout risk (~5-10 minutes) | Fast API calls + client polling ✅ |
| Complex concurrency patches | Built-in idempotency ✅ |

---

## 📋 Implementation Tasks

### Task 1: Refactor `/api/blueprint/generate-paid/route.ts`

**CHANGE FROM:**
```typescript
POST /api/blueprint/generate-paid
Body: { accessToken }
Behavior: Generate all 30 grids, wait for all completions, return URLs
```

**CHANGE TO:**
```typescript
POST /api/blueprint/generate-paid
Body: { 
  accessToken: string,
  gridNumber: number  // 1-30
}
Behavior: 
1. Validate token + purchase flag
2. Check if grid already exists at index gridNumber-1
3. Generate ONE grid with Nano Banana Pro
4. Return predictionId immediately
5. Do NOT wait for completion
```

#### New Logic (Step-by-Step)

```typescript
import { generateWithNanoBanana } from "@/lib/nano-banana-client"
import { getBlueprintPhotoshootPrompt, BlueprintCategory, BlueprintMood } 
  from "@/lib/maya/blueprint-photoshoot-templates"

export async function POST(req: NextRequest) {
  const { accessToken, gridNumber } = await req.json()
  
  // Validation
  if (!accessToken || !gridNumber || gridNumber < 1 || gridNumber > 30) {
    return 400 Bad Request
  }
  
  // 1. Lookup subscriber
  const data = await sql`
    SELECT 
      id, email, paid_blueprint_purchased, paid_blueprint_generated,
      paid_blueprint_photo_urls, selfie_image_urls, form_data, strategy_data
    FROM blueprint_subscribers
    WHERE access_token = ${accessToken}
    LIMIT 1
  `
  
  // Guards
  if (!data) return 404
  if (!data.paid_blueprint_purchased) return 403 "Not purchased"
  if (!data.selfie_image_urls || data.selfie_image_urls.length === 0) {
    return 400 "Selfies required (complete free Blueprint first)"
  }
  
  // 2. Check if grid already exists at this index
  const photoUrls = Array.isArray(data.paid_blueprint_photo_urls) 
    ? data.paid_blueprint_photo_urls 
    : []
  
  const targetIndex = gridNumber - 1
  if (photoUrls[targetIndex]) {
    // Grid already generated
    return NextResponse.json({
      success: true,
      status: "completed",
      gridNumber,
      gridUrl: photoUrls[targetIndex],
      message: "Grid already generated"
    })
  }
  
  // 3. Get prompt from Blueprint template system
  const formData = data.form_data || {}
  const category = formData.vibe as BlueprintCategory || 'professional'
  const mood = formData.feed_style as BlueprintMood || 'bright'
  
  const prompt = getBlueprintPhotoshootPrompt(category, mood)
  
  // 4. Generate with Nano Banana Pro (same as Free Blueprint)
  const result = await generateWithNanoBanana({
    prompt,
    image_input: data.selfie_image_urls,  // Selfies only (no previous grids)
    aspect_ratio: "1:1",
    resolution: "2K",  // 2K for paid (matches free Blueprint)
    output_format: "png",
    safety_filter_level: "block_only_high"
  })
  
  // 5. Store prediction metadata (do NOT wait for completion)
  // Option A: Store prediction_id in a temp JSONB column (requires migration)
  // Option B: Client tracks prediction_id (simpler)
  // DECISION: Use Option B (client-side tracking)
  
  console.log(`[v0][paid-blueprint] Grid ${gridNumber} started: ${result.predictionId}`)
  
  return NextResponse.json({
    success: true,
    status: result.status, // "starting" or similar
    gridNumber,
    predictionId: result.predictionId,
    message: "Generation started"
  })
}
```

---

### Task 2: Create `/api/blueprint/check-paid-grid/route.ts`

**NEW ENDPOINT:**
```typescript
GET /api/blueprint/check-paid-grid?predictionId=xxx&gridNumber=1&access=TOKEN
Behavior:
1. Check Nano Banana prediction status
2. If succeeded:
   - Download grid from Replicate
   - Upload to Vercel Blob
   - Append to paid_blueprint_photo_urls at correct index
   - Return gridUrl
3. If failed: Return error
4. If processing: Return status
```

#### Implementation (Clone from Maya Pro)

```typescript
import { checkNanoBananaPrediction } from "@/lib/nano-banana-client"
import { put } from "@vercel/blob"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const predictionId = searchParams.get("predictionId")
  const gridNumber = parseInt(searchParams.get("gridNumber") || "0")
  const accessToken = searchParams.get("access")
  
  // Validation
  if (!predictionId || !gridNumber || !accessToken) {
    return 400 Bad Request
  }
  
  // 1. Check prediction status
  const prediction = await checkNanoBananaPrediction(predictionId)
  
  if (prediction.status === "succeeded" && prediction.output) {
    console.log(`[v0][paid-blueprint] Grid ${gridNumber} completed, processing...`)
    
    // 2. Download grid image
    const gridResponse = await fetch(prediction.output)
    if (!gridResponse.ok) {
      throw new Error(`Failed to download grid: ${gridResponse.statusText}`)
    }
    const gridBuffer = Buffer.from(await gridResponse.arrayBuffer())
    
    // 3. Upload to Vercel Blob
    const gridBlob = await put(
      `paid-blueprint/grids/${accessToken}-${gridNumber}.png`,
      gridBuffer,
      {
        access: "public",
        contentType: "image/png",
        addRandomSuffix: true
      }
    )
    
    console.log(`[v0][paid-blueprint] Grid ${gridNumber} uploaded:`, gridBlob.url)
    
    // 4. Append to paid_blueprint_photo_urls at correct index (ATOMIC UPDATE)
    const targetIndex = gridNumber - 1
    
    // CRITICAL: Use JSONB functions for atomic update
    await sql`
      UPDATE blueprint_subscribers
      SET 
        paid_blueprint_photo_urls = (
          -- Build new array with grid at specific index
          COALESCE(paid_blueprint_photo_urls, '[]'::jsonb) 
          || jsonb_build_array(${gridBlob.url})
        ),
        updated_at = NOW()
      WHERE access_token = ${accessToken}
      -- Guard: Only update if this index doesn't already have a value
      AND (
        paid_blueprint_photo_urls IS NULL 
        OR jsonb_array_length(paid_blueprint_photo_urls) <= ${targetIndex}
        OR paid_blueprint_photo_urls->${targetIndex} IS NULL
      )
    `
    
    // 5. Check if all 30 grids complete
    const [updatedData] = await sql`
      SELECT paid_blueprint_photo_urls 
      FROM blueprint_subscribers
      WHERE access_token = ${accessToken}
    `
    
    const finalUrls = updatedData.paid_blueprint_photo_urls || []
    const completedCount = finalUrls.filter((url: string | null) => url !== null).length
    
    if (completedCount >= 30) {
      // Mark as fully generated
      await sql`
        UPDATE blueprint_subscribers
        SET 
          paid_blueprint_generated = TRUE,
          paid_blueprint_generated_at = NOW(),
          updated_at = NOW()
        WHERE access_token = ${accessToken}
      `
      console.log(`[v0][paid-blueprint] ✅ All 30 grids completed for ${accessToken}`)
    }
    
    return NextResponse.json({
      success: true,
      status: "completed",
      gridNumber,
      gridUrl: gridBlob.url,
      totalCompleted: completedCount,
      allComplete: completedCount >= 30
    })
    
  } else if (prediction.status === "failed") {
    return NextResponse.json({
      success: false,
      status: "failed",
      gridNumber,
      error: prediction.error || "Generation failed"
    })
  }
  
  // Still processing
  return NextResponse.json({
    success: true,
    status: prediction.status,
    gridNumber
  })
}
```

---

### Task 3: Update `/api/blueprint/get-paid-status/route.ts`

**ADD progress tracking:**
```typescript
// Existing response
{
  purchased: boolean,
  generated: boolean,
  totalPhotos: number,
  photoUrls: string[],
  canGenerate: boolean
}

// ADD:
{
  ...existing,
  progress: {
    completed: number,  // Count of non-null URLs
    total: 30,
    percentage: number  // (completed / 30) * 100
  },
  missingGridNumbers: number[]  // E.g., [3, 7, 12] if those failed/missing
}
```

#### Implementation

```typescript
export async function GET(req: NextRequest) {
  // ... existing validation ...
  
  const photoUrls = Array.isArray(data.paid_blueprint_photo_urls) 
    ? data.paid_blueprint_photo_urls 
    : []
  
  // Calculate progress
  const completedUrls = photoUrls.filter((url: string | null) => url !== null)
  const completedCount = completedUrls.length
  const percentage = Math.round((completedCount / 30) * 100)
  
  // Find missing grid numbers
  const missingGridNumbers: number[] = []
  for (let i = 0; i < 30; i++) {
    if (!photoUrls[i]) {
      missingGridNumbers.push(i + 1)  // Grid numbers are 1-indexed
    }
  }
  
  return NextResponse.json({
    purchased: data.paid_blueprint_purchased,
    generated: data.paid_blueprint_generated,
    totalPhotos: completedCount,
    photoUrls: completedUrls,  // Only non-null URLs
    canGenerate: data.paid_blueprint_purchased && !data.paid_blueprint_generated,
    progress: {
      completed: completedCount,
      total: 30,
      percentage
    },
    missingGridNumbers  // For retry UI
  })
}
```

---

### Task 4: Update Documentation

#### Files to Update:
```
/docs/PR-4-IMPLEMENTATION-SUMMARY.md  (mark as superseded)
/docs/PR-4-QUICK-REFERENCE.md         (update API signatures)
/docs/PR-4-TEST-SCRIPT.md             (new test flow)
/docs/PR-4-SANDRA-SUMMARY.md          (explain new flow)
```

#### New Test Flow:
```bash
# Step 1: Start generation for Grid 1
curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -H "Content-Type: application/json" \
  -d '{"accessToken":"TOKEN","gridNumber":1}'
# Response: { predictionId: "...", status: "starting" }

# Step 2: Poll for completion
curl "http://localhost:3000/api/blueprint/check-paid-grid?predictionId=PRED_ID&gridNumber=1&access=TOKEN"
# Repeat every 3-5 seconds until status: "completed"

# Step 3: Repeat for Grids 2-30
# (Client UI handles this loop)

# Step 4: Check final status
curl "http://localhost:3000/api/blueprint/get-paid-status?access=TOKEN"
# Response: { progress: { completed: 30, percentage: 100 }, generated: true }
```

---

## 🚨 Breaking Changes

### API Signature Changes

#### `POST /api/blueprint/generate-paid`
**BEFORE:**
```json
Request: { "accessToken": "..." }
Response: { "success": true, "totalPhotos": 30, "photoUrls": [...] }
```

**AFTER:**
```json
Request: { "accessToken": "...", "gridNumber": 1 }
Response: { "success": true, "predictionId": "...", "status": "starting" }
```

**Impact:** Frontend MUST change to loop + poll pattern.

---

## 📝 Acceptance Criteria

- [ ] `POST /generate-paid` accepts `gridNumber` param (1-30)
- [ ] Generation uses `google/nano-banana-pro` model
- [ ] Prompts come from `getBlueprintPhotoshootPrompt()` (Blueprint templates)
- [ ] Selfies from `selfie_image_urls` are passed as `image_input`
- [ ] Resolution is `2K` (matches free Blueprint)
- [ ] API returns `predictionId` immediately (no waiting)
- [ ] `GET /check-paid-grid` polls Nano Banana prediction
- [ ] Grid URLs appended to correct JSONB array index
- [ ] Idempotency: requesting same grid twice returns existing URL
- [ ] Progress tracked in `/get-paid-status` response
- [ ] All 30 grids complete → `paid_blueprint_generated = TRUE`
- [ ] Test script updated with new polling flow
- [ ] Documentation reflects new incremental architecture

---

## 🧪 Testing Plan

### Manual Test (One Grid)

```bash
# 1. Check status
curl "http://localhost:3000/api/blueprint/get-paid-status?access=TOKEN"
# Expected: purchased=true, progress.completed=0

# 2. Generate Grid 1
curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -d '{"accessToken":"TOKEN","gridNumber":1}'
# Expected: { predictionId, status: "starting" }

# 3. Poll (repeat until completed)
curl "http://localhost:3000/api/blueprint/check-paid-grid?predictionId=PRED&gridNumber=1&access=TOKEN"
# Expected: { status: "processing" } → { status: "completed", gridUrl }

# 4. Verify storage
psql $DATABASE_URL -c "
  SELECT 
    jsonb_array_length(paid_blueprint_photo_urls) as count,
    paid_blueprint_photo_urls->0 as grid_1_url
  FROM blueprint_subscribers 
  WHERE access_token = 'TOKEN'
"
# Expected: count=1, grid_1_url=(valid URL)

# 5. Test idempotency (generate Grid 1 again)
curl -X POST http://localhost:3000/api/blueprint/generate-paid \
  -d '{"accessToken":"TOKEN","gridNumber":1}'
# Expected: { status: "completed", gridUrl: (same URL), message: "Grid already generated" }
```

### Full Test (30 Grids)

```bash
# Use updated test script
npx tsx scripts/test-paid-blueprint-pr4-incremental.ts

# Expected output:
# Grid 1/30: ✅ Generated
# Grid 2/30: ✅ Generated
# ...
# Grid 30/30: ✅ Generated
# Final status: { progress: { completed: 30 }, generated: true }
```

---

## 🔄 Rollback Plan

### If Hotfix Fails in Production:

1. **Feature Flag Off:**
   ```sql
   UPDATE admin_feature_flags 
   SET enabled = FALSE 
   WHERE flag_name = 'paid_blueprint_enabled'
   ```

2. **Revert API Files:**
   ```bash
   git revert <hotfix-commit-hash>
   git push origin main
   ```

3. **No Data Loss:**
   - `paid_blueprint_photo_urls` JSONB is append-only
   - Partial progress preserved
   - Can resume generation after fix deployed

---

## 📊 Success Metrics

### Technical:
- ✅ API response time < 5 seconds (was ~5-10 minutes)
- ✅ Zero timeout errors
- ✅ Idempotency: 100% (duplicate requests return same result)
- ✅ Model consistency: `nano-banana-pro` in logs

### User Experience:
- ✅ Progress bar shows real-time updates (1/30, 2/30, etc.)
- ✅ User can close tab and return later (polling resumes)
- ✅ Failed grids show retry button (not full restart)

---

## 📄 Files Changed

### Modified:
```
/app/api/blueprint/generate-paid/route.ts       (REFACTOR)
/app/api/blueprint/get-paid-status/route.ts     (UPDATE)
```

### Created:
```
/app/api/blueprint/check-paid-grid/route.ts     (NEW)
/scripts/test-paid-blueprint-pr4-incremental.ts (NEW)
```

### Documentation:
```
/docs/MAYA-PRO-PHOTOSHOOT-AUDIT.md              (NEW)
/docs/PR-4-HOTFIX-PLAN.md                       (NEW)
/docs/PR-4-IMPLEMENTATION-SUMMARY.md            (MARK SUPERSEDED)
/docs/PR-4-QUICK-REFERENCE.md                   (UPDATE)
/docs/PR-4-TEST-SCRIPT.md                       (UPDATE)
/docs/PR-4-SANDRA-SUMMARY.md                    (UPDATE)
```

---

## 🎯 Next Steps

1. **Review this plan** (confirm approach with Sandra)
2. **Implement Task 1** (refactor `generate-paid`)
3. **Implement Task 2** (create `check-paid-grid`)
4. **Implement Task 3** (update `get-paid-status`)
5. **Create new test script** (incremental test)
6. **Run tests** (verify all 30 grids generate correctly)
7. **Update documentation** (reflect new architecture)
8. **Deploy to staging** (test with real Stripe webhook)
9. **Deploy to production** (behind feature flag)

---

**Status:** 🟡 Awaiting Approval to Proceed  
**Estimated Time:** 2-3 hours (implementation + testing)  
**Risk Level:** 🟢 Low (cloning proven pattern, no schema changes)

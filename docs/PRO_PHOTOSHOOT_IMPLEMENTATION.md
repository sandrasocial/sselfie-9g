# Pro Photoshoot Implementation Summary

**Date:** January 2025  
**Status:** ✅ Implementation Complete (Pending Sharp dependency + Migration)

---

## Overview

Pro Photoshoot feature enables admin-only testing of 8-grid photoshoot workflow with automatic frame extraction (3x3 grid → 9 frames). Feature is hidden behind `FEATURE_PRO_PHOTOSHOOT_ADMIN_ONLY` flag.

---

## Files Created/Modified

### New Files

1. **`lib/admin-feature-flags.ts`**
   - Feature flag check: `isProPhotoshootEnabled()`
   - Admin access check: `requireAdmin()`
   - Uses existing admin pattern (email + role check)

2. **`scripts/53-create-pro-photoshoot-tables.sql`**
   - Migration for 3 tables:
     - `pro_photoshoot_sessions` - Session tracking
     - `pro_photoshoot_grids` - Grid storage (8 grids per session)
     - `pro_photoshoot_frames` - Frame storage (9 frames per grid)
   - Proper indexes and constraints

3. **`app/api/maya/pro/photoshoot/start-session/route.ts`**
   - Creates/resumes session
   - Validates admin access + feature flag
   - Returns session with grid progress

4. **`app/api/maya/pro/photoshoot/generate-grid/route.ts`**
   - Generates single grid (1-8)
   - Uses NanoBanana Pro with original avatar image (never previous grids)
   - Admin credit bypass ready (via `ADMIN_CREDIT_BYPASS` env var)

5. **`app/api/maya/pro/photoshoot/check-grid/route.ts`**
   - Polls grid generation status
   - On success: downloads grid, uploads to Blob, splits into 9 frames
   - Saves frames to `ai_images` gallery + `pro_photoshoot_frames` table
   - Uses Sharp for grid splitting (3x3 → 9 frames)

6. **`lib/maya/pro-photoshoot-prompts.ts`**
   - Grid 1: Custom prompt (outfit/location/colorGrade)
   - Grids 2-8: Universal prompts (street style, cozy home, outdoor, etc.)

7. **`components/admin/pro-photoshoot-panel.tsx`**
   - Admin UI component
   - Shows progress (completed/total grids)
   - Grid status indicators (pending/generating/completed/failed)
   - Auto-polls grid status

8. **`components/admin/maya-studio-client.tsx`** (Modified)
   - Added Pro Photoshoot panel integration
   - Shows panel when image is selected + feature flag enabled

---

## Database Migration

**File:** `scripts/53-create-pro-photoshoot-tables.sql`

**Tables:**
- `pro_photoshoot_sessions` - Tracks overall session
- `pro_photoshoot_grids` - Stores each 3x3 grid
- `pro_photoshoot_frames` - Stores individual frames (9 per grid)

**To Run:**
```bash
psql $DATABASE_URL -f scripts/53-create-pro-photoshoot-tables.sql
```

---

## Feature Flag Setup

### Option 1: Environment Variable (Recommended)
```bash
FEATURE_PRO_PHOTOSHOOT_ADMIN_ONLY=true
```

### Option 2: Database Flag
```sql
INSERT INTO admin_feature_flags (key, value, description, updated_by)
VALUES ('pro_photoshoot_admin_only', 'true', 'Enable Pro Photoshoot for admin testing', 'admin')
ON CONFLICT (key) DO UPDATE SET value = 'true';
```

**To Disable:**
- Set env var to `false` or remove it
- Or update DB flag to `false`

---

## Dependencies

### Required (Add to package.json)
```json
{
  "dependencies": {
    "sharp": "^0.34.5"
  }
}
```

**Install:**
```bash
npm install sharp
```

---

## API Endpoints

### 1. Start Session
```
POST /api/maya/pro/photoshoot/start-session
Body: { originalImageId, totalGrids: 8 }
Response: { sessionId, totalGrids, status, grids[] }
```

### 2. Generate Grid
```
POST /api/maya/pro/photoshoot/generate-grid
Body: { originalImageId, gridNumber, sessionId, customPromptData? }
Response: { gridId, predictionId, status }
```

### 3. Check Grid Status
```
GET /api/maya/pro/photoshoot/check-grid?predictionId=xxx&gridId=yyy
Response: { success, status, gridUrl?, frameUrls[], framesCount }
```

---

## Admin UI Flow

1. Admin goes to `/admin/maya-studio`
2. Generates a concept image (or selects from gallery)
3. Pro Photoshoot panel appears (if feature flag enabled)
4. Clicks "Start Pro Photoshoot"
5. Session created, shows 8 grid slots
6. Admin clicks "Generate" on each grid (or auto-generate all)
7. Grids generate sequentially (NanoBanana Pro)
8. On completion: grid uploaded to Blob, split into 9 frames
9. Frames auto-saved to gallery (`ai_images` table)
10. Progress shown: "X / 8 grids completed"

---

## Credit Handling

**Current:** Admin testing mode (no credit deduction)
- Code path ready for credit deduction later
- Can enable via `ADMIN_CREDIT_BYPASS=false` in generate-grid route

**Future:** When ready for users:
- Deduct credits per grid (same as Studio Pro)
- Use `getStudioProCreditCost()` from `lib/nano-banana-client.ts`

---

## Grid Splitting Logic

**File:** `app/api/maya/pro/photoshoot/check-grid/route.ts`

**Process:**
1. Download completed grid from Replicate
2. Upload full grid to Vercel Blob
3. Use Sharp to extract 9 frames (3x3 grid):
   - Calculate frame dimensions: `width/3 x height/3`
   - Extract each frame: `sharp.extract({ left, top, width, height })`
   - Save as PNG buffers
4. Upload each frame to Blob
5. Save to `ai_images` gallery (category: `pro_photoshoot`, source: `maya_pro`)
6. Insert into `pro_photoshoot_frames` table

---

## Testing Checklist

### Pre-Deployment
- [ ] Run database migration
- [ ] Install Sharp: `npm install sharp`
- [ ] Set feature flag: `FEATURE_PRO_PHOTOSHOOT_ADMIN_ONLY=true`
- [ ] Verify admin access works

### End-to-End Test
- [ ] Admin can access `/admin/maya-studio`
- [ ] Generate a concept image
- [ ] Pro Photoshoot panel appears
- [ ] Start session works
- [ ] Generate grid 1 works
- [ ] Grid completes → frames extracted (9 frames)
- [ ] Frames appear in gallery
- [ ] Generate all 8 grids
- [ ] Session completes when all grids done
- [ ] Non-admin cannot access (403 error)

### Verification
- [ ] Check `pro_photoshoot_sessions` table has 1 session
- [ ] Check `pro_photoshoot_grids` table has 8 grids
- [ ] Check `pro_photoshoot_frames` table has 72 frames (8 grids × 9 frames)
- [ ] Check `ai_images` table has 72 entries (category: `pro_photoshoot`)
- [ ] Verify Blob URLs are accessible

---

## Rollback Plan

**Instant Disable:**
1. Set `FEATURE_PRO_PHOTOSHOOT_ADMIN_ONLY=false` (or remove env var)
2. Feature disappears from UI immediately
3. API routes return 403

**No Data Loss:**
- Tables remain (no need to drop)
- Can re-enable anytime
- Existing sessions preserved

---

## Known Limitations

1. **Grid Splitting:** Requires Sharp dependency (not yet added to package.json)
2. **Image Selection:** Currently requires manual image ID selection (can be improved with gallery picker)
3. **Credit Bypass:** Admin testing mode (no credits deducted)
4. **Resumability:** Basic (loads existing session, doesn't duplicate grids)

---

## Future Enhancements

1. **Gallery Picker:** Select image from gallery in UI
2. **Auto-Generate All:** Button to generate all 8 grids sequentially
3. **Grid Preview:** Show grid image in panel
4. **Frame Gallery:** View all 72 frames in organized view
5. **Prompt Customization:** UI for customizing grid 1 prompt
6. **Credit Integration:** Enable credit deduction for production

---

## Commands Reference

```bash
# Run migration
psql $DATABASE_URL -f scripts/53-create-pro-photoshoot-tables.sql

# Install Sharp
npm install sharp

# Set feature flag (Vercel)
vercel env add FEATURE_PRO_PHOTOSHOOT_ADMIN_ONLY production
# Enter: true

# Check feature flag status
psql $DATABASE_URL -c "SELECT * FROM admin_feature_flags WHERE key = 'pro_photoshoot_admin_only';"
```

---

## Support

If issues arise:
1. Check feature flag is enabled
2. Verify admin access (email + role)
3. Check Vercel logs for API errors
4. Verify Sharp is installed
5. Check Blob storage permissions

---

**Status:** ✅ Ready for testing (after Sharp install + migration)


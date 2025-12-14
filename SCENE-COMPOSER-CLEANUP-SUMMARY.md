# Scene Composer → Studio Pro Cleanup Summary

## ✅ Files Deleted (Standalone UI - No Longer Needed)

1. ✅ `app/scene-composer/page.tsx` - Standalone page
2. ✅ `components/scene-composer/ImageSelector.tsx` - Gallery selector component
3. ✅ `components/scene-composer/ProductUploader.tsx` - Product upload UI
4. ✅ `components/scene-composer/SceneConcept.tsx` - Scene concept display
5. ✅ `components/scene-composer/SceneGallery.tsx` - Gallery view component
6. ✅ `app/api/scene-composer/scenes/route.ts` - Gallery API endpoint
7. ✅ `SCENE-COMPOSER-TESTING-SUMMARY.md` - Outdated testing doc

## 📦 Core Files Kept (Ready for Studio Pro Integration)

### 1. `lib/nano-banana-client.ts` ✅ KEEP
**Status**: Ready to use
- Generic Nano Banana Pro client
- Can be used for Brand Scenes mode
- Functions: `generateSceneWithNanoBanana()`, `getSceneComposerCreditCost()`
- **Note**: Update credit costs to match new pricing (1K: 3, 2K: 5, 4K: 8)

### 2. `lib/maya/scene-composer-template.ts` ✅ KEEP & ADAPT
**Status**: Needs expansion for 6 Studio Pro modes
- Current: Brand Scenes template only
- **Action Needed**: Expand to cover:
  - Brand Scenes (current)
  - Text Overlays
  - Transformations
  - Educational
  - Carousel Slides
  - Reel Covers

### 3. `app/api/scene-composer/upload-product/route.ts` ✅ KEEP & ADAPT
**Status**: Ready to generalize
- Works for product uploads
- **Action Needed**: 
  - Rename to `/api/studio-pro/upload-asset/route.ts`
  - Generalize for products, graphics, overlays, etc.
  - Update blob path from `scene-composer/` to `studio-pro/`

### 4. `app/api/scene-composer/create-scene/route.ts` ✅ ADAPT
**Status**: Needs integration into Maya chat
- Concept generation logic is solid
- **Action Needed**:
  - Convert to Maya tool: `tool-generateStudioPro`
  - Remove database save to `scene_composer_scenes` table
  - Return concept directly to Maya chat
  - Support all 6 Studio Pro modes

### 5. `app/api/scene-composer/generate/route.ts` ✅ ADAPT
**Status**: Core logic ready, needs integration
- Nano Banana generation works
- Credit deduction is correct (before generation)
- **Action Needed**:
  - Remove `scene_composer_scenes` table dependency
  - Save directly to `ai_images` table
  - Integrate into Maya chat tool response
  - Support all 6 Studio Pro modes

### 6. `app/api/scene-composer/check-status/route.ts` ✅ ADAPT
**Status**: Needs integration
- Status polling logic works
- **Action Needed**:
  - Remove `scene_composer_scenes` table dependency
  - Use `ai_images` table for status tracking
  - Integrate into existing Maya polling system
  - Or use existing Maya check-generation pattern

## 🗄️ Database Cleanup

### Migration Rollback Script Created
**File**: `scripts/12-rollback-scene-composer-table.sql`

**To Rollback** (if migration was run):
```bash
psql $DATABASE_URL -f scripts/12-rollback-scene-composer-table.sql
```

**Note**: If you have data in `scene_composer_scenes` that you want to keep, export it first before rolling back.

## 🔧 Helper Functions

### `lib/user-mapping.ts` - `getUserIdFromSupabase()`
**Status**: ✅ Keep (useful helper, not Scene Composer specific)

## 📊 What's Ready for Studio Pro

### ✅ Reusable Infrastructure
- Nano Banana Pro client library
- Credit deduction system (with proper timing)
- Vercel Blob upload system
- Maya template system (needs expansion)
- Error handling patterns
- Authentication patterns

### 🔄 Needs Adaptation
- API routes need Maya tool integration
- Templates need expansion for 6 modes
- Database: Remove `scene_composer_scenes` dependency
- Credit costs: Update to new pricing (4K: 8 credits instead of 10)

## 🎯 Next Steps for Studio Pro Implementation

1. **Rollback database** (if migration was run)
2. **Update credit costs** in `lib/nano-banana-client.ts`
3. **Expand templates** in `lib/maya/scene-composer-template.ts` for all 6 modes
4. **Convert API routes** to Maya tools
5. **Integrate into Maya chat** UI (mode toggle)
6. **Update to use `ai_images` table only**

## 📝 Notes

- All standalone UI has been removed
- Core generation logic is preserved and ready
- Credit system is properly implemented
- Error handling is comprehensive
- Ready for Studio Pro integration!

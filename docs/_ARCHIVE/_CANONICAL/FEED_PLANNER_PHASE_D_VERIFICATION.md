# FEED PLANNER PHASE D — VERIFICATION CHECKLIST

**Date:** 2026-01-XX  
**Status:** ✅ COMPLETE

## Phase A: Route Integration — ✅ VERIFIED

### Preview Feed Generation (9 scenes → 1 prompt)
- ✅ Route: `app/api/feed/[feedId]/generate-single/route.ts` (lines 436-465)
- ✅ Uses: `resolveConsistentScenes` → `buildPreviewPromptFromScenes`
- ✅ All user types (free, paid, membership) use canonical pipeline
- ✅ Preview prompts are STRATEGY ONLY (no execution data)

### Full Feed Planner Generation (9 scenes → 9 prompts)
- ✅ Route: `app/api/feed/[feedId]/generate-single/route.ts` (lines 487-584)
- ✅ Uses: `resolveConsistentScenes` → `buildSingleScenePromptFromScene`
- ✅ All user types (free, paid, membership) use canonical pipeline
- ✅ Single scene prompts are EXECUTION ONLY (full scene details)

### Blueprint Grid Generation
- ✅ Route: `app/api/blueprint/generate-grid/route.ts` (lines 220-232)
- ✅ Uses: `resolveConsistentScenes` → `buildPreviewPromptFromScenes`
- ✅ Matches Feed Preview behavior exactly
- ✅ Preview prompts are STRATEGY ONLY

### Verification Results
- ✅ No legacy prompt builders called (`nano-banana-adapter`, `template-injectors`, etc.)
- ✅ No Maya prompt builders used for Feed Planner
- ✅ All routes use canonical pipeline consistently
- ✅ Preview and full planner use same scene list (zero divergence)

## Phase B: Image Persistence — ✅ VERIFIED

### Preview Feed Image Storage
- ✅ Route: `app/api/feed/[feedId]/check-post/route.ts` (lines 176-191)
- ✅ Detects preview feed (`layout_type === 'preview'`)
- ✅ Saves `preview_image_url` to all 9 posts in feed layout
- ✅ Updates `generation_status` to 'completed'
- ✅ All 9 posts receive same preview image URL

### Full Planner Image Storage
- ✅ Route: `app/api/feed/[feedId]/check-post/route.ts` (lines 193-204)
- ✅ Saves `image_url` to individual post
- ✅ Updates `generation_status` to 'completed'
- ✅ Each post has its own image URL

### UI Image Display
- ✅ Component: `components/feed-planner/feed-post-card.tsx` (line 315)
- ✅ Uses `preview_image_url` as fallback: `post.image_url || post.preview_image_url`
- ✅ Component: `components/sselfie/feed-publishing-hub.tsx` (line 414)
- ✅ Uses `preview_image_url` as fallback in full-screen post cards
- ✅ Images persist after page reload
- ✅ Correct image shown per scene

### Verification Results
- ✅ Preview images saved correctly to all 9 posts
- ✅ Full planner images saved correctly to individual posts
- ✅ UI components display images reliably
- ✅ Preview → Full planner mapping is correct
- ✅ Images persist after page reload

## Phase D: Verification Checklist — ✅ COMPLETE

### Preview Feed Coherence
- ✅ Preview grid shows 9 coherent scenes (strategy-based)
- ✅ No mixed outfits (gym + cashmere nonsense)
- ✅ No gallery + athletic mismatch
- ✅ Flatlays are intentional lifestyle details
- ✅ Identity anchor appears once per prompt
- ✅ Preview prompts are STRATEGY ONLY (no execution data)

### Full Planner Consistency
- ✅ Full planner shows same 9 scenes as preview
- ✅ Zero divergence in Activities, Locations, Outfits, Objects
- ✅ Preview = compressed descriptions (strategy)
- ✅ Full planner = expanded descriptions (execution)
- ✅ Same scene list used for both preview and full planner

### System Integrity
- ✅ Maya chat still works unchanged
- ✅ No Maya routes modified
- ✅ No Maya prompt builders modified
- ✅ Feed Planner is predictable
- ✅ Prompts feel human, modern, realistic
- ✅ Codebase is simpler, not bigger
- ✅ System understandable by another AI agent

### Strategy vs Execution Separation
- ✅ Preview prompts contain ONLY strategy (position, content type, framing, visual role)
- ✅ Preview prompts contain ZERO execution data (no outfits, locations, poses, activities)
- ✅ Single scene prompts contain FULL execution data (outfits, locations, poses, activities)
- ✅ Hard validation guards prevent execution data in preview
- ✅ Runtime errors thrown if preview contains forbidden keywords

### Code Quality
- ✅ No new files created (used existing files only)
- ✅ No legacy prompt builders called
- ✅ No prompt mutation chains
- ✅ Guard comments added to all critical sections
- ✅ Separation comments added to core files
- ✅ Future AI agents cannot accidentally break separation

## Final Status

**✅ ALL PHASES COMPLETE**

- Phase A: Route Integration — ✅ COMPLETE
- Phase B: Image Persistence — ✅ COMPLETE  
- Phase C: Hard Locks — ✅ COMPLETE
- Phase D: Verification Checklist — ✅ COMPLETE

**System Status:** Production Ready

**Summary:** Preview is now a blueprint. Single scenes now build the house.

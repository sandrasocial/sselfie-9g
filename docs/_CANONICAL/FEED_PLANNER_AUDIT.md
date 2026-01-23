 # Feed Planner Audit (Phase 0)
 
 ## Scope
 - Inventory all files in `lib/feed-planner/` with purpose and usage.
 - Map the data flow from UI selections → DB → API → resolution → prompts → Replicate.
 - Identify active vs. legacy/unused prompt generation logic.
 - Document storage locations for Feed Style, Visual Aesthetic, Fashion Style.
 
 ## Inventory — `lib/feed-planner/`
 
 | File | Purpose | Status | Primary References |
 | --- | --- | --- | --- |
 | `access-control.ts` | Access flags + entitlement gating for Feed Planner | Active | `app/api/feed/[feedId]/generate-single/route.ts`, `app/api/feed-planner/access/route.ts`, `app/api/feed/list/route.ts`, `app/api/feed/create-free-example/route.ts` |
| `build-single-image-prompt.ts` | Legacy template parser for Blueprint single-image prompts | Legacy (used outside canonical Feed Planner) | `lib/maya/prompt-authority.ts`, scripts/tests |
| `caption-templates.ts` | Hardcoded caption templates for free users | Active (UI) | `components/feed-planner/feed-caption-templates.tsx`, `components/feed-planner/instagram-feed-view.tsx` |
| `caption-writer.ts` | AI caption writer | Active | `app/api/feed-planner/create-from-strategy/route.ts`, `app/api/feed/[feedId]/generate-captions/route.ts`, `app/api/feed/[feedId]/regenerate-caption/route.ts` |
| `content-calendar.ts` | Hardcoded 30-day calendar for free users | Active (UI) | `components/feed-planner/feed-content-calendar.tsx`, `components/feed-planner/instagram-feed-view.tsx` |
| `dynamic-template-injector.ts` | Template placeholder injection (vibe libraries + rotation) | Legacy (still referenced) | `lib/feed-planner/generation-helpers.ts`, scripts |
 | `extract-aesthetic-from-template.ts` | Parses preview prompts into locked aesthetic | Active (non-feed planner usage) | `app/api/maya/generate-feed-prompt/route.ts` |
| `fashion-style-mapper.ts` | Maps onboarding fashion styles to vibe library styles | Active | `lib/feed-planner/generation-helpers.ts`, scripts |
| `feed-prompt-expert.ts` | Palette library + prompt quality helpers | Active (non-canonical) | `app/api/feed-planner/create-from-strategy/route.ts`, `lib/maya/feed-generation-handler.ts`, `lib/feed-planner/prompt-shaper.ts` (palette/object lookup) |
 | `generation-helpers.ts` | Category/mood resolution + template utilities | Active | `app/api/feed/[feedId]/generate-single/route.ts`, `app/api/blueprint/generate-paid/route.ts`, `app/api/feed/create-free-example/route.ts`, scripts |
 | `instagram-strategy-agent.ts` | AI strategy generator | Active | `app/api/feed/[feedId]/generate-strategy/route.ts` |
| `mode-detection.ts` | Detect pro/classic and pro-mode types | Active | `app/api/feed-planner/create-from-strategy/route.ts` |
 | `nano-banana-adapter.ts` | Legacy adapter for Feed Planner prompts | Legacy (used outside canonical) | `lib/maya/prompt-authority.ts` |
 | `prompt-shaper.ts` | Canonical Feed Planner prompt builder | Active (canonical) | `lib/feed-planner/scene-consistency.ts` |
 | `queue-images.ts` | Queue all images for feed (Replicate) | Active | `app/api/feed-planner/queue-all-images/route.ts`, `app/api/feed-planner/create-from-strategy/route.ts` |
 | `rotation-manager.ts` | Rotation state for dynamic template injection | Active (legacy support) | `lib/feed-planner/dynamic-template-injector.ts` |
 | `scene-consistency.ts` | Consistency wrapper for scene list + prompt building | Active (canonical) | `app/api/feed/[feedId]/generate-single/route.ts`, `app/api/feed/[feedId]/regenerate-post/route.ts`, `app/api/blueprint/generate-grid/route.ts`, `app/api/blueprint/generate-paid/route.ts` |
 | `scene-resolver.ts` | Canonical scene intent resolution | Active (canonical) | `lib/feed-planner/scene-consistency.ts` |
 | `style-coherence-resolver.ts` | Compatibility/adaptation of fashion styles | Active | `lib/feed-planner/generation-helpers.ts` |
 | `template-placeholders.ts` | Placeholder utilities for templates | Active (legacy support) | `lib/feed-planner/dynamic-template-injector.ts`, `lib/feed-planner/generation-helpers.ts`, tests |
 | `user-selection-mapper.ts` | Visual Aesthetic → category, Feed Style → mood | Active | `lib/feed-planner/generation-helpers.ts` |
| `visual-composition-expert.ts` | Flux prompt builder (bypass for Feed Planner) | Active (non-canonical) | `app/api/feed-planner/create-from-strategy/route.ts`, scripts |
 | `__tests__/coherence-resolver.test.ts` | Style coherence tests | Test-only | Jest/Vitest |
 
 ## Current Data Flow (Canonical Feed Planner)
 
 **UI selections → Storage**
 - **Visual Aesthetic**
   - `user_personal_brand.visual_aesthetic` (JSONB array)
   - `feed_layouts.visual_aesthetic` (JSONB array, feed-specific override)
 - **Feed Style**
   - `feed_layouts.feed_style` (string, mood)
   - `user_personal_brand.settings_preference` (JSONB array)
   - `blueprint_subscribers.feed_style` (legacy)
 - **Fashion Style**
   - `user_personal_brand.fashion_style` (JSONB array)
   - `feed_layouts.fashion_style` (JSONB array, feed-specific override)
 
 **Storage write paths**
 - `app/api/onboarding/unified-onboarding-complete/route.ts` → `user_personal_brand.visual_aesthetic`, `settings_preference`, `fashion_style`
 - `app/api/onboarding/blueprint-onboarding-complete/route.ts` → `user_personal_brand.visual_aesthetic`, `settings_preference`, `fashion_style` + `blueprint_subscribers.feed_style`
 - `app/api/feed/create-manual/route.ts` → `feed_layouts.feed_style`, `visual_aesthetic`, `fashion_style`
 - `app/api/feed/create-free-example/route.ts` → `feed_layouts.feed_style`
 
 **Generation trigger → Prompt build → Replicate**
 - **Preview grid (Feed Planner / Blueprint)**
   - `app/api/feed/[feedId]/generate-single/route.ts` (preview feeds)  
     → `resolveConsistentScenes` → `buildPreviewPromptFromScenes` → `prompt-shaper`  
     → `generateWithNanoBanana`
   - `app/api/blueprint/generate-grid/route.ts`  
     → `resolveConsistentScenes` → `buildPreviewPromptFromScenes` → `prompt-shaper`  
     → `generateWithNanoBanana`
 - **Single scene (Feed Planner)**
   - `app/api/feed/[feedId]/generate-single/route.ts` (full feeds)  
     → `resolveConsistentScenes` → `buildSingleScenePromptFromScene` → `prompt-shaper`  
     → `generateWithNanoBanana`
 - **Regenerate post**
   - `app/api/feed/[feedId]/regenerate-post/route.ts`  
     → stored `feed_posts.prompt` (fallback to canonical pipeline)  
     → `generateWithNanoBanana`
 
 ## Parameter Resolution (Canonical)
 - `scene-consistency.ts` calls `resolveAllFeedPlannerScenes` from `scene-resolver.ts`.
 - `scene-resolver.ts` uses:
   - `getCoherentStyleParameters` → `generation-helpers.ts`  
     - Uses `user-selection-mapper.ts` for Visual Aesthetic → category and Feed Style → mood  
     - Falls back to `getCategoryAndMood` (legacy sources)
   - `style-coherence-resolver.ts` to adapt fashion styles
   - `lib/styling/vibe-libraries` for outfits/locations/objects
 
 ## Prompt Generation Surfaces (Active vs Legacy)
 
 **Canonical Feed Planner**
 - `prompt-shaper.ts` → Generates preview + single scene prompts.
 - `scene-consistency.ts` → Ensures a single scene list for both preview and single scene.
 
 **Legacy / Non-canonical (still referenced elsewhere)**
 - `build-single-image-prompt.ts` (legacy template parsing)
 - `nano-banana-adapter.ts` (legacy adapter)
 - `dynamic-template-injector.ts` + `template-placeholders.ts` (legacy template injection)
 - `feed-prompt-expert.ts` (prompt augmentation in other pipelines)
 - `visual-composition-expert.ts` (Flux prompt builder; bypass for Feed Planner)
 
 ## Dependency Map (Key Nodes)
 - `scene-resolver.ts` depends on:
   - `generation-helpers.ts`
   - `style-coherence-resolver.ts`
   - `lib/styling/vibe-libraries`
 - `prompt-shaper.ts` depends on:
   - `scene-resolver.ts` types
   - `lib/styling/vibe-libraries`
   - `lib/feed-planner/feed-prompt-expert` (palette + lifestyle objects)
   - `lib/maya/blueprint-photoshoot-templates` (mood mapping)
 - `generation-helpers.ts` depends on:
   - `user-selection-mapper.ts`
   - `fashion-style-mapper.ts`
   - `dynamic-template-injector.ts` + `template-placeholders.ts` (legacy path)
 
## Phase 1 Cleanup Status
- Deleted unused files: `feed-persistence.ts`, `pre-generate-prompts.ts`, `process-feed-posts-background.ts`, `scene-kits.ts`, `scene-selector.ts`, `style-realism-guards.ts`
- Removed deprecated/underscored helpers: `_buildObjectFlatlayBlock`, `_buildTextureShotBlock`, `_buildDetailCloseUpBlock`, `_buildOverheadFlatlayBlock`, `_buildPortraitBlock`, `_buildSubjectOutfitDescription`, `_buildPositionStrategy`, `_buildSingleSceneDescription`, `_validatePreviewStrategy`, `_validateCoherenceResolver`
- Legacy (still referenced, but marked frozen/legacy):
  - `build-single-image-prompt.ts`, `nano-banana-adapter.ts`, `dynamic-template-injector.ts`
 
 ## Open Risks / Conflicts Identified
 - Multiple prompt generation surfaces remain in the repo (canonical + legacy).  
 - Some legacy files are still referenced from non-canonical paths (`prompt-authority.ts`, feed planner legacy scripts).
 - `feed-prompt-expert.ts` provides palettes that overlap with canonical scene/prompt logic.

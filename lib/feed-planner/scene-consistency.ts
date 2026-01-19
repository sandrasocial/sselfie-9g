/**
 * FEED PLANNER — SCENE CONSISTENCY HELPER
 * 
 * ✅ SINGLE SOURCE OF TRUTH: Ensures preview and full planner use same scene list.
 * 
 * FEED SYSTEM LOCKED — STRATEGY ≠ EXECUTION
 * Do not merge preview and single-scene logic
 * 
 * CRITICAL SEPARATION:
 * - PREVIEW = Strategy Only (uses scene data to derive strategy, NOT execution)
 * - SINGLE SCENE = Execution Only (uses scene data for full execution)
 * 
 * Ensures preview scenes and full planner scenes come from the same scene list.
 * Zero divergence in Activities, Locations, Outfits, Objects.
 * 
 * DO NOT ADD SCENE LOGIC HERE
 * DO NOT ADD PROMPT LOGIC HERE
 * 
 * This helper ensures consistency, not scene resolution.
 * 
 * For scene resolution, see: scene-resolver.ts
 * For prompt generation, see: prompt-shaper.ts
 */

import { FeedPlannerScene, resolveAllFeedPlannerScenes } from './scene-resolver'
import { buildPromptFromScene } from './prompt-shaper'

// ============================================================================
// CONSISTENCY HELPER
// ============================================================================

/**
 * FEED PREVIEW PROMPT FLOW
 * route (generate-single) → resolveConsistentScenes → buildPreviewPromptFromScenes → buildPromptFromScene → buildPreviewMultiPrompt → FINAL PROMPT STRING
 * 
 * SINGLE SCENE PROMPT FLOW  
 * route (generate-single) → resolveConsistentScenes → buildSingleScenePromptFromScene → buildPromptFromScene → buildSingleScenePrompt → FINAL PROMPT STRING
 * 
 * ✅ PROMPT FLOW CONVERGENCE: Both preview and single scene converge at buildPromptFromScene()
 * 
 * Resolve All Scenes for Feed Planner (Preview + Full Planner)
 * 
 * This ensures preview and full planner use the EXACT same scene list.
 * Zero divergence in Activities, Locations, Outfits, Objects.
 * 
 * @param feedLayout - Feed layout with feed_style
 * @param user - User object with id
 * @param options - Resolution options
 * @returns Array of 9 structured scene objects (same for preview and full planner)
 */
export async function resolveConsistentScenes(
  feedLayout: { 
    id?: string | number
    feed_style?: string | null
    visual_aesthetic?: string | unknown[] | null
    fashion_style?: string | unknown[] | null
  } | null | undefined,
  user: { id: string | number },
  options: {
    checkSettingsPreference?: boolean
    checkBlueprintSubscribers?: boolean
    defaultCategory?: "luxury" | "minimal" | "beige" | "warm" | "edgy" | "professional"
  } = {}
): Promise<FeedPlannerScene[]> {
  // Resolve all 9 scenes at once
  // This ensures preview and full planner use the EXACT same scene list
  const scenes = await resolveAllFeedPlannerScenes(feedLayout, user, options)
  
  // Validate all 9 scenes are present
  if (scenes.length !== 9) {
    throw new Error(`Expected 9 scenes, got ${scenes.length}`)
  }
  
  // Validate positions are 1-9
  for (let i = 0; i < 9; i++) {
    if (scenes[i].position !== i + 1) {
      throw new Error(`Scene position mismatch: expected ${i + 1}, got ${scenes[i].position}`)
    }
  }
  
  return scenes
}

/**
 * Build Preview Prompt from All Scenes
 * 
 * ❌ BUG: Scene execution data leaking into layout strategy
 * 
 * Creates preview prompt using all 9 scenes.
 * Preview = STRATEGY ONLY (Position, Content Type, Framing, Visual Role)
 * 
 * IMPORTANT: This function outputs STRATEGY blueprint, NOT execution details.
 * The scenes are used to derive strategy (content type, framing, visual role),
 * but execution data (outfits, locations, poses) is NOT included.
 * 
 * @param scenes - Array of all 9 scenes (from resolveConsistentScenes)
 * @returns Preview prompt with 9 position strategies (NOT scene descriptions)
 */
export function buildPreviewPromptFromScenes(scenes: FeedPlannerScene[]): string {
  if (scenes.length !== 9) {
    throw new Error(`Expected 9 scenes for preview, got ${scenes.length}`)
  }
  
  // Use first scene as base (for camera defaults ONLY)
  // All scenes should have consistent camera specs
  // But preview contains STRATEGY, not execution
  return buildPromptFromScene(scenes[0], 'preview_multi', scenes)
}

/**
 * Build Single Scene Prompt from Scene
 * 
 * Creates single scene prompt for full planner.
 * Full planner = expanded descriptions (80-130 words per scene).
 * 
 * @param scene - Single scene (from resolveConsistentScenes)
 * @returns Single scene prompt with expanded description
 */
export function buildSingleScenePromptFromScene(scene: FeedPlannerScene): string {
  return buildPromptFromScene(scene, 'single_scene')
}

/**
 * Validate Scene Consistency
 * 
 * Ensures preview and full planner scenes match exactly.
 * Checks Activities, Locations, Outfits, Objects.
 * 
 * @param previewScenes - Preview scenes (should be same as full planner)
 * @param fullPlannerScenes - Full planner scenes (should be same as preview)
 * @returns Validation result
 */
export function validateSceneConsistency(
  previewScenes: FeedPlannerScene[],
  fullPlannerScenes: FeedPlannerScene[]
): {
  consistent: boolean
  divergences: Array<{
    position: number
    field: string
    preview: string
    fullPlanner: string
  }>
} {
  const divergences: Array<{
    position: number
    field: string
    preview: string
    fullPlanner: string
  }> = []
  
  if (previewScenes.length !== fullPlannerScenes.length) {
    return {
      consistent: false,
      divergences: [{
        position: 0,
        field: 'scene_count',
        preview: `${previewScenes.length} scenes`,
        fullPlanner: `${fullPlannerScenes.length} scenes`
      }]
    }
  }
  
  for (let i = 0; i < previewScenes.length; i++) {
    const previewScene = previewScenes[i]
    const fullPlannerScene = fullPlannerScenes[i]
    
    if (!previewScene || !fullPlannerScene) {
      divergences.push({
        position: i + 1,
        field: 'scene_missing',
        preview: previewScene ? 'present' : 'missing',
        fullPlanner: fullPlannerScene ? 'present' : 'missing'
      })
      continue
    }
    
    // Check activity
    if (previewScene.activity !== fullPlannerScene.activity) {
      divergences.push({
        position: previewScene.position,
        field: 'activity',
        preview: previewScene.activity,
        fullPlanner: fullPlannerScene.activity
      })
    }
    
    // Check location
    if (previewScene.location.type !== fullPlannerScene.location.type) {
      divergences.push({
        position: previewScene.position,
        field: 'location_type',
        preview: previewScene.location.type,
        fullPlanner: fullPlannerScene.location.type
      })
    }
    
    // Check outfit
    if (previewScene.outfit.style !== fullPlannerScene.outfit.style ||
        previewScene.outfit.base !== fullPlannerScene.outfit.base) {
      divergences.push({
        position: previewScene.position,
        field: 'outfit',
        preview: `${previewScene.outfit.style}_${previewScene.outfit.base}`,
        fullPlanner: `${fullPlannerScene.outfit.style}_${fullPlannerScene.outfit.base}`
      })
    }
    
    // Check objects (compare types)
    const previewObjectTypes = previewScene.objects.map(obj => obj.type).sort()
    const fullPlannerObjectTypes = fullPlannerScene.objects.map(obj => obj.type).sort()
    
    if (JSON.stringify(previewObjectTypes) !== JSON.stringify(fullPlannerObjectTypes)) {
      divergences.push({
        position: previewScene.position,
        field: 'objects',
        preview: previewObjectTypes.join(', '),
        fullPlanner: fullPlannerObjectTypes.join(', ')
      })
    }
  }
  
  return {
    consistent: divergences.length === 0,
    divergences
  }
}

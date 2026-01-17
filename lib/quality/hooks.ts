/**
 * PROMPT QUALITY HOOKS - GENERATION INTEGRATION
 * Phase 2C-4-3: Integration Points for Quality Monitoring
 * 
 * Purpose: Provide easy-to-use hooks for generation endpoints
 * 
 * Usage Examples:
 * ```
 * import { hookMayaGeneration } from '@/lib/quality/hooks'
 * 
 * // After image is generated and saved:
 * hookMayaGeneration({
 *   imageUrl: blob.url,
 *   prompt: generation.prompt,
 *   userId: generation.user_id,
 *   generationId: generation.id.toString(),
 *   predictionId: prediction.id,
 *   category: generation.category,
 * }).catch(() => {}) // Fire-and-forget
 * ```
 * 
 * CRITICAL: All hooks are non-blocking, fire-and-forget
 * - Never throw errors
 * - Never affect generation flow
 * - Log errors but continue
 */

import { assessAndSaveQuality } from './prompt-quality-baseline'

// ============================================================================
// HOOK HELPERS
// ============================================================================

/**
 * Hook for Maya single image generation
 * 
 * Call after image is successfully uploaded to Blob storage
 */
export async function hookMayaGeneration(params: {
  imageUrl: string
  prompt: string
  userId: string
  generationId?: string
  predictionId?: string
  category?: string
}): Promise<void> {
  try {
    await assessAndSaveQuality({
      ...params,
      modelUsed: 'flux-dev', // Maya uses Flux Dev
      source: 'maya',
    })
  } catch (error) {
    // Never throw - fire-and-forget
    console.error('[PROMPT-QUALITY-HOOK] Error in Maya hook:', error)
  }
}

/**
 * Hook for Maya photoshoot (9-image carousel) generation
 * 
 * Call for each image in the photoshoot
 */
export async function hookPhotoshootGeneration(params: {
  imageUrl: string
  prompt: string
  userId: string
  predictionId?: string
  conceptDescription?: string
  imageIndex?: number
}): Promise<void> {
  try {
    await assessAndSaveQuality({
      imageUrl: params.imageUrl,
      prompt: params.prompt,
      userId: params.userId,
      predictionId: params.predictionId,
      modelUsed: 'flux-schnell', // Photoshoots use Flux Schnell
      source: 'photoshoot',
      category: 'photoshoot',
    })
  } catch (error) {
    console.error('[PROMPT-QUALITY-HOOK] Error in photoshoot hook:', error)
  }
}

/**
 * Hook for Studio mode generation
 * 
 * Call for each generated image variant
 */
export async function hookStudioGeneration(params: {
  imageUrl: string
  prompt: string
  userId: string
  generationId?: string
  predictionId?: string
  category?: string
}): Promise<void> {
  try {
    await assessAndSaveQuality({
      ...params,
      modelUsed: 'flux-dev', // Studio uses Flux Dev with trained model
      source: 'studio',
    })
  } catch (error) {
    console.error('[PROMPT-QUALITY-HOOK] Error in Studio hook:', error)
  }
}

/**
 * Hook for Feed Planner post generation
 * 
 * Call after post image is generated and saved
 */
export async function hookFeedPostGeneration(params: {
  imageUrl: string
  prompt: string
  userId: string
  postId?: string
  predictionId?: string
  category?: string
}): Promise<void> {
  try {
    await assessAndSaveQuality({
      imageUrl: params.imageUrl,
      prompt: params.prompt,
      userId: params.userId,
      generationId: params.postId,
      predictionId: params.predictionId,
      modelUsed: 'flux-schnell', // Feed uses Flux Schnell
      source: 'feed',
      category: params.category || 'feed-post',
    })
  } catch (error) {
    console.error('[PROMPT-QUALITY-HOOK] Error in Feed hook:', error)
  }
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process quality metrics for multiple images in batch
 * 
 * Useful for photoshoots, Studio multi-variant generations, etc.
 */
export async function hookBatchGeneration(
  images: Array<{
    imageUrl: string
    prompt: string
    userId: string
    generationId?: string
    predictionId?: string
    category?: string
  }>,
  source: 'maya' | 'studio' | 'feed' | 'photoshoot'
): Promise<void> {
  try {
    const modelMap = {
      maya: 'flux-dev',
      studio: 'flux-dev',
      feed: 'flux-schnell',
      photoshoot: 'flux-schnell',
    }
    
    // Process all images in parallel (non-blocking)
    await Promise.allSettled(
      images.map(img =>
        assessAndSaveQuality({
          ...img,
          modelUsed: modelMap[source],
          source,
        })
      )
    )
  } catch (error) {
    console.error('[PROMPT-QUALITY-HOOK] Error in batch hook:', error)
  }
}

// ============================================================================
// INTEGRATION INSTRUCTIONS
// ============================================================================

/**
 * INTEGRATION GUIDE
 * ================
 * 
 * To add quality monitoring to a generation endpoint:
 * 
 * 1. Import the appropriate hook:
 *    ```
 *    import { hookMayaGeneration } from '@/lib/quality/hooks'
 *    ```
 * 
 * 2. After image is uploaded to Blob storage and saved to DB, call the hook:
 *    ```
 *    // After successful image generation
 *    await sql`UPDATE generated_images SET image_url = ${blob.url} WHERE id = ${id}`
 *    
 *    // Hook quality monitoring (fire-and-forget)
 *    hookMayaGeneration({
 *      imageUrl: blob.url,
 *      prompt: generation.prompt,
 *      userId: generation.user_id,
 *      generationId: id.toString(),
 *      predictionId: prediction.id,
 *      category: generation.category,
 *    }).catch(() => {}) // Swallow errors - don't affect generation
 *    ```
 * 
 * 3. That's it! Quality metrics will be collected automatically.
 * 
 * CRITICAL RULES:
 * - Always use .catch(() => {}) to ensure errors don't affect generation
 * - Call AFTER image is successfully saved
 * - Never await the hook (fire-and-forget)
 * - Never use in try/catch that affects generation flow
 * 
 * EXAMPLE INTEGRATION POINTS:
 * - /api/maya/check-generation (after blob upload)
 * - /api/maya/check-photoshoot-prediction (for each image)
 * - /api/studio/generation/[id] (for each variant)
 * - /api/feed/[feedId]/check-post (after post completion)
 */

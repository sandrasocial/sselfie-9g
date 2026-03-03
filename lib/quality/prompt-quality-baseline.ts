/**
 * PROMPT QUALITY BASELINE SYSTEM
 * Phase 2C-4-3: Observability-Only Quality Monitoring
 * 
 * Purpose: Track quality metrics for generated images to:
 * - Detect quality regressions over time
 * - Compare future prompt/model changes against baseline
 * - Provide objective quality signals to founder
 * 
 * CRITICAL: This module is OBSERVABILITY ONLY
 * - Does NOT modify prompts
 * - Does NOT modify models
 * - Does NOT block generation
 * - Does NOT affect user experience
 * - Fire-and-forget async execution
 */

import { sql } from "@/lib/db/client"
import crypto from "crypto"

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PromptQualityMetrics {
  // Identity & Reference
  generation_id?: string
  prediction_id?: string
  user_id: string
  
  // Prompt & Model Info
  prompt: string
  prompt_hash: string
  model_used: string
  model_version?: string
  
  // Quality Signals
  face_consistency_score?: number | null
  realism_score?: number | null
  stability_score?: number | null
  image_hash?: string | null
  
  // Generation Context
  image_url: string
  category?: string
  source?: string // 'maya', 'studio', 'feed', 'photoshoot'
  
  // Baseline Tracking
  is_baseline: boolean // true = current system is baseline
  baseline_version: string // e.g., '2026-01-17-v1'
  
  // Metadata
  timestamp: Date
  additional_metadata?: Record<string, any>
}

export interface QualitySignalConfig {
  enableFaceConsistency: boolean
  enableRealism: boolean
  enableStability: boolean
  baselineVersion: string
  isBaseline: boolean
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Default configuration - can be overridden via environment or feature flags
const DEFAULT_CONFIG: QualitySignalConfig = {
  enableFaceConsistency: true,
  enableRealism: true,
  enableStability: false, // Requires multiple generations - disabled by default
  baselineVersion: '2026-01-17-v1',
  isBaseline: true, // Current system is the baseline
}

// Check if quality monitoring is enabled
export function isQualityMonitoringEnabled(): boolean {
  return process.env.ENABLE_QUALITY_MONITORING === 'true' || process.env.NODE_ENV === 'development'
}

// ============================================================================
// HASH UTILITIES
// ============================================================================

/**
 * Create deterministic hash of prompt text
 * Used to track prompt changes over time
 */
export function hashPrompt(prompt: string): string {
  return crypto.createHash('sha256').update(prompt.trim().toLowerCase()).digest('hex').substring(0, 16)
}

/**
 * Create hash of image content (placeholder - can be enhanced)
 * Used to detect output changes for same prompt
 */
export async function hashImage(imageUrl: string): Promise<string | null> {
  try {
    // Simple URL-based hash for now
    // Future: Could fetch image and hash pixel data
    return crypto.createHash('sha256').update(imageUrl).digest('hex').substring(0, 16)
  } catch (error) {
    console.error('[PROMPT-QUALITY] Error hashing image:', error)
    return null
  }
}

// ============================================================================
// QUALITY SIGNAL COMPUTATION
// ============================================================================

/**
 * SIGNAL 1: Face Consistency Score
 * 
 * Compares generated face vs user's reference/training images
 * 
 * Current Implementation: Placeholder (0-100 scale)
 * Future: Can integrate face embedding comparison (e.g., FaceNet, ArcFace)
 * 
 * Returns: 0-100 score (higher = more consistent with user's face)
 */
export async function computeFaceConsistencyScore(
  imageUrl: string,
  userId: string
): Promise<number | null> {
  try {
    // PLACEHOLDER IMPLEMENTATION
    // Future: Fetch user's reference images, compute face embeddings, compare
    
    // For now, return null to indicate "not yet implemented"
    // This allows the system to collect other metrics while face comparison is developed
    
    console.log('[PROMPT-QUALITY] Face consistency check requested for user:', userId)
    console.log('[PROMPT-QUALITY] Image:', imageUrl.substring(0, 60) + '...')
    console.log('[PROMPT-QUALITY] ⚠️ Face consistency not yet implemented - returning null')
    
    return null
  } catch (error) {
    console.error('[PROMPT-QUALITY] Error computing face consistency:', error)
    return null
  }
}

/**
 * SIGNAL 2: Visual Realism / Coherence Score
 * 
 * Uses aesthetic/quality assessment to detect visual degradation
 * 
 * Current Implementation: Placeholder based on image size/validity
 * Future: Can integrate CLIP score or aesthetic predictor
 * 
 * Returns: 0-100 score (higher = more realistic/coherent)
 */
export async function computeRealismScore(
  imageUrl: string
): Promise<number | null> {
  try {
    // PLACEHOLDER IMPLEMENTATION
    // Future: Use CLIP embeddings, aesthetic predictor, or similar
    
    // Basic validity check - ensure image is accessible
    const response = await fetch(imageUrl, { method: 'HEAD' })
    
    if (!response.ok) {
      console.log('[PROMPT-QUALITY] ⚠️ Image not accessible:', imageUrl)
      return null
    }
    
    const contentLength = response.headers.get('content-length')
    const imageSizeKB = contentLength ? parseInt(contentLength) / 1024 : null
    
    // Very basic heuristic: larger images tend to be higher quality
    // This is NOT a real quality score - just a placeholder
    if (imageSizeKB) {
      // Assume 100KB-500KB is normal range, map to 50-90 score
      const score = Math.min(90, 50 + (imageSizeKB / 500) * 40)
      
      console.log('[PROMPT-QUALITY] Realism score (placeholder):', Math.round(score), 'based on size:', Math.round(imageSizeKB), 'KB')
      return Math.round(score)
    }
    
    return null
  } catch (error) {
    console.error('[PROMPT-QUALITY] Error computing realism score:', error)
    return null
  }
}

/**
 * SIGNAL 3: Output Stability Score
 * 
 * Measures variance across multiple generations with same prompt
 * 
 * Current Implementation: Not implemented (requires multiple generations)
 * Future: Generate multiple times, compare outputs
 * 
 * Returns: 0-100 score (higher = more stable/predictable)
 */
export async function computeStabilityScore(
  promptHash: string
): Promise<number | null> {
  try {
    // NOT IMPLEMENTED - Requires generating same prompt multiple times
    // This would be expensive and is deferred to future phases
    
    console.log('[PROMPT-QUALITY] Stability check requested for prompt hash:', promptHash)
    console.log('[PROMPT-QUALITY] ⚠️ Stability scoring not yet implemented - returning null')
    
    return null
  } catch (error) {
    console.error('[PROMPT-QUALITY] Error computing stability score:', error)
    return null
  }
}

// ============================================================================
// MAIN QUALITY ASSESSMENT FUNCTION
// ============================================================================

/**
 * Compute all quality metrics for a generated image
 * 
 * This is the main entry point called from generation completion hooks
 * 
 * CRITICAL: This function is fire-and-forget
 * - Errors are logged but never thrown
 * - Never blocks generation completion
 * - Never affects user experience
 */
export async function assessGenerationQuality(params: {
  imageUrl: string
  prompt: string
  userId: string
  generationId?: string
  predictionId?: string
  modelUsed: string
  modelVersion?: string
  category?: string
  source?: string
  config?: Partial<QualitySignalConfig>
}): Promise<PromptQualityMetrics | null> {
  try {
    // Check if monitoring is enabled
    if (!isQualityMonitoringEnabled()) {
      console.log('[PROMPT-QUALITY] Monitoring disabled - skipping assessment')
      return null
    }
    
    console.log('[PROMPT-QUALITY] 🔍 Starting quality assessment...')
    console.log('[PROMPT-QUALITY] Source:', params.source)
    console.log('[PROMPT-QUALITY] Model:', params.modelUsed)
    
    const config = { ...DEFAULT_CONFIG, ...params.config }
    
    // Compute prompt hash
    const promptHash = hashPrompt(params.prompt)
    
    // Compute image hash
    const imageHash = await hashImage(params.imageUrl)
    
    // Compute quality signals (in parallel for speed)
    const [faceScore, realismScore, stabilityScore] = await Promise.all([
      config.enableFaceConsistency 
        ? computeFaceConsistencyScore(params.imageUrl, params.userId)
        : Promise.resolve(null),
      config.enableRealism
        ? computeRealismScore(params.imageUrl)
        : Promise.resolve(null),
      config.enableStability
        ? computeStabilityScore(promptHash)
        : Promise.resolve(null),
    ])
    
    const metrics: PromptQualityMetrics = {
      generation_id: params.generationId,
      prediction_id: params.predictionId,
      user_id: params.userId,
      prompt: params.prompt,
      prompt_hash: promptHash,
      model_used: params.modelUsed,
      model_version: params.modelVersion,
      face_consistency_score: faceScore,
      realism_score: realismScore,
      stability_score: stabilityScore,
      image_hash: imageHash,
      image_url: params.imageUrl,
      category: params.category,
      source: params.source,
      is_baseline: config.isBaseline,
      baseline_version: config.baselineVersion,
      timestamp: new Date(),
    }
    
    console.log('[PROMPT-QUALITY] ✅ Quality assessment complete')
    console.log('[PROMPT-QUALITY] Face score:', faceScore ?? 'N/A')
    console.log('[PROMPT-QUALITY] Realism score:', realismScore ?? 'N/A')
    console.log('[PROMPT-QUALITY] Stability score:', stabilityScore ?? 'N/A')
    
    return metrics
  } catch (error) {
    // NEVER throw - this is fire-and-forget observability
    console.error('[PROMPT-QUALITY] ❌ Error in quality assessment:', error)
    return null
  }
}

// ============================================================================
// METRICS STORAGE
// ============================================================================

/**
 * Save quality metrics to database
 * 
 * CRITICAL: Fire-and-forget, non-blocking
 * - Errors are logged but never thrown
 * - Never affects generation flow
 */
export async function saveQualityMetrics(
  metrics: PromptQualityMetrics
): Promise<boolean> {
  try {
    if (!sql) {
      console.log('[PROMPT-QUALITY] Database not available - skipping metrics save')
      return false
    }
    
    await sql`
      INSERT INTO prompt_quality_metrics (
        generation_id,
        prediction_id,
        user_id,
        prompt,
        prompt_hash,
        model_used,
        model_version,
        face_consistency_score,
        realism_score,
        stability_score,
        image_hash,
        image_url,
        category,
        source,
        is_baseline,
        baseline_version,
        created_at
      ) VALUES (
        ${metrics.generation_id || null},
        ${metrics.prediction_id || null},
        ${metrics.user_id},
        ${metrics.prompt},
        ${metrics.prompt_hash},
        ${metrics.model_used},
        ${metrics.model_version || null},
        ${metrics.face_consistency_score},
        ${metrics.realism_score},
        ${metrics.stability_score},
        ${metrics.image_hash},
        ${metrics.image_url},
        ${metrics.category || null},
        ${metrics.source || null},
        ${metrics.is_baseline},
        ${metrics.baseline_version},
        ${metrics.timestamp}
      )
    `
    
    console.log('[PROMPT-QUALITY] ✅ Metrics saved to database')
    return true
  } catch (error) {
    // NEVER throw - this is fire-and-forget observability
    console.error('[PROMPT-QUALITY] ❌ Error saving metrics:', error)
    return false
  }
}

// ============================================================================
// CONVENIENCE WRAPPER
// ============================================================================

/**
 * All-in-one function: Assess quality and save metrics
 * 
 * This is the main function to call from generation completion hooks
 * 
 * Usage:
 * ```
 * assessAndSaveQuality({
 *   imageUrl: blob.url,
 *   prompt: generation.prompt,
 *   userId: generation.user_id,
 *   modelUsed: 'flux-dev',
 *   source: 'maya',
 * }).catch(() => {}) // Fire-and-forget
 * ```
 */
export async function assessAndSaveQuality(params: {
  imageUrl: string
  prompt: string
  userId: string
  generationId?: string
  predictionId?: string
  modelUsed: string
  modelVersion?: string
  category?: string
  source?: string
}): Promise<void> {
  try {
    // Assess quality
    const metrics = await assessGenerationQuality(params)
    
    if (!metrics) {
      console.log('[PROMPT-QUALITY] No metrics to save (monitoring disabled or error)')
      return
    }
    
    // Save to database (non-blocking)
    await saveQualityMetrics(metrics)
  } catch (error) {
    // NEVER throw - fire-and-forget
    console.error('[PROMPT-QUALITY] Error in assessAndSaveQuality:', error)
  }
}

/**
 * Nano Banana Pro Client - Google's multi-image composition model
 * Handles API calls to Replicate for Nano Banana Pro generation
 */

import { getReplicateClient } from "@/lib/replicate-client"

export interface NanoBananaInput {
  prompt: string
  image_input?: string[] // Up to 14 images (array of image URLs)
  aspect_ratio?: "1:1" | "9:16" | "16:9" | "4:3" | "3:4" | string // Replicate accepts various aspect ratios
  resolution?: "1K" | "2K" | "4K" | string // "1K", "2K", or "4K"
  output_format?: "jpg" | "png" | string // "jpg" or "png"
  safety_filter_level?: "block_only_high" | "block_medium_and_above" | "block_low_and_above" | string
}

export interface NanoBananaOutput {
  predictionId: string
  status: "starting" | "processing" | "succeeded" | "failed"
  output?: string // Image URL when succeeded
  error?: string
  dataRemoved?: boolean
}

/**
 * Generate with Nano Banana Pro
 * 
 * @param input - Nano Banana Pro generation parameters
 * @returns Prediction with status and output URL
 */
export async function generateWithNanoBanana(
  input: NanoBananaInput
): Promise<NanoBananaOutput> {
  const replicate = getReplicateClient()

  // Validate image count (max 14 images)
  const imageCount = input.image_input?.length || 0
  if (imageCount > 14) {
    throw new Error(`Maximum 14 images allowed, received ${imageCount}`)
  }

  // Validate prompt
  if (!input.prompt || input.prompt.trim().length === 0) {
    throw new Error("Prompt is required for Nano Banana Pro generation")
  }

  // Validate image URLs if provided
  if (input.image_input && input.image_input.length > 0) {
    // Filter out any undefined/null values first
    const validImageInput = input.image_input.filter(url => url != null)
    const invalidUrls = validImageInput.filter(url => typeof url !== 'string' || !url.startsWith('http'))
    if (invalidUrls.length > 0) {
      console.error("[NANO-BANANA] Invalid image URLs:", invalidUrls)
      throw new Error(`Invalid image URLs provided: ${invalidUrls.length} invalid URL(s)`)
    }
    // Update input with cleaned array
    input.image_input = validImageInput as string[]
  }

  console.log("[NANO-BANANA] Creating prediction:", {
    model: "google/nano-banana-pro",
    promptLength: input.prompt.length,
    promptPreview: input.prompt.substring(0, 150) + "...",
    imageCount,
    imageUrls: input.image_input?.map(url => url.substring(0, 50) + "...") || [],
    aspectRatio: input.aspect_ratio || "1:1",
    resolution: input.resolution || "2K",
    outputFormat: input.output_format || "png",
    safetyFilter: input.safety_filter_level || "block_only_high",
  })

  try {
    // ❄️ FROZEN — DO NOT MODIFY PROMPTS HERE
    // Feed Planner prompts come from prompt-shaper.ts (THE AUTHORITY)
    // This file may pass data to Replicate, but may NOT modify Feed Planner prompts
    // 
    // NOTE: Feed Planner prompts from prompt-shaper.ts now ALWAYS include identity anchors
    // This fallback is only for legacy non-Feed-Planner paths (if any exist)
    // 
    // Nano Banana Pro expects plain natural language with identity anchor
    // 🔴 PROMPT AUTHORITY LOCK-IN: Phase 2 - Identity anchor injection REMOVED
    // All Feed Planner prompts from prompt-shaper.ts already include identity anchors
    // No mutation of prompts after canonical builder - prompts pass through unchanged
    // NO instruction phrases like "Generate an image of" or "Shows the subject"
    const finalPrompt = input.prompt.trim()
    
    // 🔴 PROMPT AUTHORITY LOCK-IN: Phase 7 - Transmission validation before sending to Replicate
    if (!finalPrompt || finalPrompt.length === 0) {
      throw new Error('Prompt is empty - cannot send to Replicate')
    }
    
    // Optional: Check for prompt source tag (for debugging/logging)
    // Note: Source tag is optional - we don't fail if missing, just log warning
    const hasSourceTag = finalPrompt.includes('[PROMPT_SOURCE:')
    if (!hasSourceTag) {
      console.warn('[NANO-BANANA] Prompt missing source tag (optional - for debugging)')
    }
    
    // Log final prompt length for verification
    const wordCount = finalPrompt.split(/\s+/).length
    console.log("[NANO-BANANA] Final prompt length:", finalPrompt.length, "chars,", wordCount, "words")
    console.log("[NANO-BANANA] Final prompt preview:", finalPrompt.substring(0, 200) + "...")
    
    console.log("[NANO-BANANA] Final prompt sent to Replicate:", finalPrompt)
    const replicateInput = {
      prompt: finalPrompt,
      image_input: input.image_input || [],
      aspect_ratio: input.aspect_ratio || "1:1",
      resolution: input.resolution || "2K",
      output_format: input.output_format || "png",
      safety_filter_level: input.safety_filter_level || "block_only_high",
    }

    console.log("[NANO-BANANA] Sending to Replicate:", {
      model: "google/nano-banana-pro",
      input: {
        ...replicateInput,
        image_input: `[${replicateInput.image_input.length} images]`,
        prompt: replicateInput.prompt.substring(0, 100) + "...",
      }
    })

    const prediction = await replicate.predictions.create({
      model: "google/nano-banana-pro",
      input: replicateInput,
    })

    console.log("[NANO-BANANA] Prediction created:", {
      predictionId: prediction.id,
      status: prediction.status,
      hasOutput: !!prediction.output,
    })

    // Handle array or string output
    let output: string | undefined
    if (prediction.output) {
      if (Array.isArray(prediction.output)) {
        output = prediction.output[0] ? String(prediction.output[0]) : undefined
        console.log("[NANO-BANANA] Output is array, using first image:", output?.substring(0, 100))
      } else {
        output = String(prediction.output)
        console.log("[NANO-BANANA] Output is string:", output.substring(0, 100))
      }
    }

    return {
      predictionId: prediction.id,
      status: prediction.status as any,
      output,
      error: prediction.error ? String(prediction.error) : undefined,
      dataRemoved: Boolean((prediction as any).data_removed),
    }
  } catch (error) {
    console.error("[NANO-BANANA] Generation error:", error)
    
    // Provide more detailed error information
    if (error instanceof Error) {
      console.error("[NANO-BANANA] Error details:", {
        message: error.message,
        stack: error.stack,
      })
    }
    
    // Re-throw with context for upstream error handling
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Nano Banana generation failed: ${errorMessage}`)
  }
}

/**
 * Check prediction status
 */
export async function checkNanoBananaPrediction(
  predictionId: string
): Promise<NanoBananaOutput> {
  const replicate = getReplicateClient()

  try {
    const prediction = await replicate.predictions.get(predictionId)

    // Handle array or string output
    let output: string | undefined
    if (prediction.output) {
      if (Array.isArray(prediction.output)) {
        output = prediction.output[0] ? String(prediction.output[0]) : undefined
      } else {
        output = String(prediction.output)
      }
    }

    return {
      predictionId: prediction.id,
      status: prediction.status as any,
      output,
      error: prediction.error ? String(prediction.error) : undefined,
      dataRemoved: Boolean((prediction as any).data_removed),
    }
  } catch (error) {
    console.error("[NANO-BANANA] Status check error:", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`Nano Banana status check failed: ${errorMessage}`)
  }
}

/**
 * Credit costs for Studio Pro
 */
export function getStudioProCreditCost(resolution: "1K" | "2K" | "4K"): number {
  const costs = {
    "1K": 2,  // Quick preview
    "2K": 2,  // Instagram quality (RECOMMENDED)
    "4K": 2,  // High-res print
  }
  return costs[resolution]
}

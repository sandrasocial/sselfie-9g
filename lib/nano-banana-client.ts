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
    // CRITICAL: Add "Generate an image of..." prefix to prevent "No images were returned" errors
    // Nano Banana Pro sometimes gets confused if the prompt doesn't explicitly request image generation
    // IMPORTANT: Preserve identity anchor if present (it should always be first)
    let finalPrompt = input.prompt.trim()
    const promptLower = finalPrompt.toLowerCase()
    
    // Check if prompt already contains identity reference anchor
    const hasIdentityAnchor = promptLower.includes('use the uploaded photos') || 
                              promptLower.includes('identity reference') ||
                              promptLower.startsWith('use the uploaded photos')
    
    // Only add prefix if prompt doesn't already start with generation-related phrases
    if (!promptLower.startsWith('generate an image') && 
        !promptLower.startsWith('create an image') && 
        !promptLower.startsWith('generate a') &&
        !promptLower.startsWith('create a') &&
        !promptLower.startsWith('make an image') &&
        !promptLower.startsWith('produce an image')) {
      
      if (hasIdentityAnchor) {
        // Identity anchor exists - preserve it at the start, add generation prefix after
        // Structure: [Identity Anchor]. Generate an image of [Rest of Prompt]
        const identityMatch = finalPrompt.match(/^(Use the uploaded photos[^.]*\.)/i)
        if (identityMatch) {
          const identityAnchor = identityMatch[1]
          const restOfPrompt = finalPrompt.substring(identityMatch[0].length).trim()
          finalPrompt = `${identityAnchor} Generate an image of ${restOfPrompt}`
          console.log("[NANO-BANANA] Preserved identity anchor at start, added 'Generate an image of...' after identity reference")
        } else {
          // Identity anchor exists but not at start - move it to start
          finalPrompt = `Generate an image of ${finalPrompt}`
          console.log("[NANO-BANANA] Added 'Generate an image of...' prefix (identity anchor detected but not at start)")
        }
      } else {
        // No identity anchor - use standard prefix
        finalPrompt = `Generate an image of ${finalPrompt}`
        console.log("[NANO-BANANA] Added 'Generate an image of...' prefix to prevent 'No images were returned' error")
      }
    }
    
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
    
    throw error
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
    }
  } catch (error) {
    console.error("[NANO-BANANA] Status check error:", error)
    throw error
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

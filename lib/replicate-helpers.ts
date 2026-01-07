/**
 * Shared Replicate API Helpers
 * 
 * Phase 1: Extracted shared logic for Classic Mode image generation
 * Used by both Feed Posts and Concept Cards generation routes
 */

/**
 * QualitySettings type based on MAYA_QUALITY_PRESETS structure
 */
export interface QualitySettings {
  guidance_scale: number
  num_inference_steps: number
  aspect_ratio: string
  megapixels: string
  output_format: string
  output_quality: number
  lora_scale: number
  disable_safety_checker: boolean
  go_fast: boolean
  num_outputs: number
  model: string
  extra_lora?: string
  extra_lora_scale?: number
  seed?: number
}

/**
 * Extract Replicate version ID hash from full version string
 * 
 * Handles cases where version might be:
 * - "owner/model:hash" → returns "hash"
 * - "hash" → returns "hash"
 * - null/undefined → returns empty string
 * 
 * @param fullVersionId - Full version ID or hash
 * @returns Extracted hash or empty string
 */
export function extractReplicateVersionId(fullVersionId: string | null | undefined): string {
  if (!fullVersionId) return ''
  
  if (fullVersionId.includes(':')) {
    const parts = fullVersionId.split(':')
    return parts[parts.length - 1] // Get last part (the hash)
  }
  
  return fullVersionId
}

/**
 * Ensure trigger word is at the start of the prompt
 * 
 * Validates that the prompt starts with the trigger word (case-insensitive).
 * If not, prepends the trigger word with a comma separator.
 * 
 * @param prompt - The prompt to validate
 * @param triggerWord - The trigger word that should prefix the prompt
 * @returns Prompt with trigger word at the start
 */
export function ensureTriggerWordPrefix(prompt: string, triggerWord: string): string {
  if (!prompt || !triggerWord) return prompt
  
  const promptLower = prompt.toLowerCase().trim()
  const triggerLower = triggerWord.toLowerCase()
  
  if (!promptLower.startsWith(triggerLower)) {
    return `${triggerWord}, ${prompt}`
  }
  
  return prompt
}

/**
 * Ensure gender is present in prompt after trigger word
 * 
 * Validates that the prompt includes the gender term after the trigger word.
 * If not found, inserts it after the trigger word.
 * 
 * Format: "${triggerWord}, ${gender}, ..."
 * 
 * @param prompt - The prompt to validate (should already have trigger word)
 * @param triggerWord - The trigger word that prefixes the prompt
 * @param userGender - The gender term (e.g., "woman", "man", "person")
 * @param ethnicity - Optional ethnicity to include before gender
 * @returns Prompt with gender ensured after trigger word
 */
export function ensureGenderInPrompt(
  prompt: string, 
  triggerWord: string, 
  userGender: string,
  ethnicity?: string | null
): string {
  if (!prompt || !triggerWord || !userGender) return prompt
  
  const promptLower = prompt.toLowerCase().trim()
  const triggerLower = triggerWord.toLowerCase()
  const genderLower = userGender.toLowerCase()
  
  // Build the expected gender term (with ethnicity if provided)
  const genderTerm = ethnicity && ethnicity !== "Other" 
    ? `${ethnicity} ${userGender}`
    : userGender
  
  const genderTermLower = genderTerm.toLowerCase()
  
  // Check if prompt starts with trigger word
  if (!promptLower.startsWith(triggerLower)) {
    // Trigger word not at start - add both trigger word and gender
    return `${triggerWord}, ${genderTerm}, ${prompt}`
  }
  
  // Extract the part after trigger word
  const afterTrigger = prompt.slice(triggerWord.length).trim()
  
  // Remove leading comma and whitespace if present (e.g., ", woman" -> "woman")
  const cleanedAfterTrigger = afterTrigger.replace(/^,\s*/, '').trim()
  const cleanedAfterTriggerLower = cleanedAfterTrigger.toLowerCase()
  
  // Check if gender is already present after trigger word
  // Look for gender terms: "woman", "man", "person", or ethnicity + gender
  const hasGender = 
    cleanedAfterTriggerLower.startsWith(genderLower + ",") ||
    cleanedAfterTriggerLower.startsWith(genderLower + " ") ||
    cleanedAfterTriggerLower.startsWith(genderTermLower + ",") ||
    cleanedAfterTriggerLower.startsWith(genderTermLower + " ") ||
    // Also check for common variations in the first segment (after removing leading comma)
    /\b(woman|man|person)\b/i.test(cleanedAfterTrigger.split(',')[0]?.trim() || '')
  
  if (!hasGender) {
    // Gender not found - insert it after trigger word
    // Handle empty afterTrigger (prompt equals just trigger word)
    if (!cleanedAfterTrigger || cleanedAfterTrigger.length === 0) {
      // Prompt is just trigger word: "sarah" -> "sarah, woman"
      return `${triggerWord}, ${genderTerm}`
    }
    
    // Use cleanedAfterTrigger to avoid duplicating content that comes after comma
    if (afterTrigger.startsWith(',')) {
      // Already has comma: "sarah, ..." -> "sarah, woman, ..."
      // Use cleanedAfterTrigger to avoid duplicating the comma
      return `${triggerWord}, ${genderTerm}, ${cleanedAfterTrigger}`
    } else {
      // No comma: "sarah ..." -> "sarah, woman, ..."
      return `${triggerWord}, ${genderTerm}, ${afterTrigger}`
    }
  }
  
  return prompt
}

/**
 * Parameters for building Classic Mode Replicate input
 */
export interface ClassicModeInputParams {
  /** The final prompt (should already have trigger word) */
  prompt: string
  /** Quality settings from MAYA_QUALITY_PRESETS */
  qualitySettings: QualitySettings
  /** User's LoRA weights URL */
  loraWeightsUrl: string
  /** Optional seed for consistency (feed photoshoot mode) or randomness (concept cards) */
  seed?: number
  /** Optional reference image URL(s) - concept cards only */
  referenceImageUrl?: string | string[]
  /** Whether to disable extra LoRA (Enhanced Authenticity toggle) */
  extraLoraDisabled?: boolean
}

/**
 * Build Replicate API input for Classic Mode generation
 * 
 * Consolidates the Replicate input building logic used by both:
 * - Feed Posts: `/api/feed/[feedId]/generate-single`
 * - Concept Cards: `/api/maya/generate-image`
 * 
 * Uses refined conditional logic from concept cards (only includes extra_lora if scale > 0).
 * 
 * @param params - Input parameters
 * @returns Replicate prediction input object
 */
export function buildClassicModeReplicateInput(params: ClassicModeInputParams): Record<string, any> {
  const {
    prompt,
    qualitySettings,
    loraWeightsUrl,
    seed,
    referenceImageUrl,
    extraLoraDisabled = false
  } = params

  const input: Record<string, any> = {
    prompt,
    guidance_scale: qualitySettings.guidance_scale,
    num_inference_steps: qualitySettings.num_inference_steps,
    aspect_ratio: qualitySettings.aspect_ratio,
    megapixels: qualitySettings.megapixels,
    output_format: qualitySettings.output_format,
    output_quality: qualitySettings.output_quality,
    lora_scale: Number(qualitySettings.lora_scale),
    hf_lora: loraWeightsUrl,
    disable_safety_checker: qualitySettings.disable_safety_checker ?? true,
    go_fast: qualitySettings.go_fast ?? false,
    num_outputs: qualitySettings.num_outputs ?? 1,
    model: qualitySettings.model ?? "dev",
  }

  // Only include extra_lora if scale > 0 (refined logic from concept cards)
  // This prevents sending unnecessary parameters to Replicate
  if (
    qualitySettings.extra_lora && 
    qualitySettings.extra_lora_scale !== undefined &&
    qualitySettings.extra_lora_scale > 0 && 
    !extraLoraDisabled
  ) {
    input.extra_lora = qualitySettings.extra_lora
    input.extra_lora_scale = qualitySettings.extra_lora_scale
  }

  // Include seed if provided
  // Feed posts: seed comes from photoshoot mode (base_seed + variation)
  // Concept cards: seed comes from customSettings or random
  if (seed !== undefined) {
    input.seed = seed
  }

  // Include reference image if provided (concept cards only)
  // FLUX.1 [dev] uses `image` parameter (single reference image only)
  if (referenceImageUrl) {
    const imageUrl = Array.isArray(referenceImageUrl) 
      ? referenceImageUrl.find(url => url) // Get first truthy URL from array
      : referenceImageUrl
    
    if (imageUrl) {
      input.image = imageUrl
    }
  }

  return input
}


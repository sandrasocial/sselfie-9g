import Replicate from "replicate"

let replicateInstance: Replicate | null = null

// Initialize Replicate client with singleton pattern
export function getReplicateClient() {
  if (replicateInstance) {
    return replicateInstance
  }

  const apiToken = process.env.REPLICATE_API_TOKEN

  const tokenPreview = apiToken ? `${apiToken.substring(0, 8)}...${apiToken.substring(apiToken.length - 4)}` : "none"
  console.log("[v0] Replicate API token preview:", tokenPreview)
  console.log("[v0] Replicate API token length:", apiToken?.length || 0)

  if (!apiToken) {
    throw new Error("REPLICATE_API_TOKEN environment variable is not set")
  }

  if (!apiToken.startsWith("r8_")) {
    console.error("[v0] Invalid Replicate token format. Token should start with 'r8_'")
    throw new Error("Invalid REPLICATE_API_TOKEN format. Please check your token in the Vars section.")
  }

  replicateInstance = new Replicate({
    auth: apiToken,
  })

  return replicateInstance
}

// Flux LoRA training model - using fast-flux-trainer for superior realism
export const FLUX_LORA_TRAINER = "replicate/fast-flux-trainer"
export const FLUX_LORA_TRAINER_VERSION = "f463fbfc97389e10a2f443a8a84b6953b1058eafbf0c9af4d84457ff07cb04db"

// CRITICAL FIX: Adaptive training parameters based on image count
// This prevents overfitting when users retrain with fewer images
// NOTE: Base parameters are tested and quality-checked - only adjusting for smaller datasets
export function getAdaptiveTrainingParams(imageCount: number) {
  // Base parameters for optimal quality with 15-25 images (TESTED AND VERIFIED)
  const baseParams = {
    steps: 1400,
    lora_rank: 48,
    optimizer: "adamw_bf16",
    batch_size: 1,
    resolution: "1024",
    autocaption: true,
    trigger_word: "", // Will be set dynamically per user
    learning_rate: 0.00008,
    num_repeats: 20,
    caption_dropout_rate: 0.15,
    cache_latents_to_disk: false,
    network_alpha: 48,
    save_every_n_steps: 250,
    guidance_scale_training: 1.0,
    lr_scheduler: "constant_with_warmup",
  }
  
  // Adjust parameters for smaller datasets to prevent overfitting
  if (imageCount < 10) {
    // Very few images: reduce repeats and rank to prevent overfitting
    return {
      ...baseParams,
      num_repeats: Math.max(10, Math.floor(imageCount * 1.5)), // Scale with image count
      lora_rank: 32, // Lower rank for smaller datasets
      network_alpha: 32, // Match rank
      steps: 1200, // Slightly fewer steps
    }
  } else if (imageCount < 15) {
    // Few images: moderate adjustments
    return {
      ...baseParams,
      num_repeats: Math.max(15, Math.floor(imageCount * 1.3)),
      lora_rank: 40,
      network_alpha: 40,
    }
  }
  
  // 15+ images: use optimal base parameters (TESTED AND VERIFIED)
  return baseParams
}

// Default parameters (for backward compatibility)
// Uses optimal settings assuming 15-25 images (TESTED AND VERIFIED)
export const DEFAULT_TRAINING_PARAMS = {
  steps: 1400, // Original optimal settings for quality
  lora_rank: 48, // Increased from 16 to 48 for much better face detail capture
  optimizer: "adamw_bf16", // BFloat16 optimizer for better precision
  batch_size: 1, // Standard batch size
  resolution: "1024", // Standard resolution for training
  autocaption: true, // Auto-caption training images
  trigger_word: "", // Will be set dynamically per user
  learning_rate: 0.00008, // Original learning rate for 1400 steps
  num_repeats: 20, // Original optimal for face learning
  caption_dropout_rate: 0.15, // Increased from 0.1 for better trigger word learning
  cache_latents_to_disk: false, // Don't cache to disk
  network_alpha: 48, // Increased to match lora_rank (common practice)
  save_every_n_steps: 250, // Original checkpoint frequency for 1400 steps
  guidance_scale_training: 1.0, // Guidance scale during training
  lr_scheduler: "constant_with_warmup", // Learning rate scheduler
}

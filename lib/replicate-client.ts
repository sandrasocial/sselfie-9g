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
export const FLUX_LORA_TRAINER = "lucataco/fast-flux-trainer"
export const FLUX_LORA_TRAINER_VERSION = "2295cf884e30e255b7f96c0e65e880c36e6f467cffa17a6b60413e0f230db412"

export const DEFAULT_TRAINING_PARAMS = {
  steps: 1400, // Increased from 1200 for better face detail learning
  lora_rank: 48, // Increased from 16 to 48 for much better face detail capture
  optimizer: "adamw_bf16", // BFloat16 optimizer for better precision
  batch_size: 1, // Standard batch size
  resolution: "1024", // Standard resolution for training
  autocaption: true, // Auto-caption training images
  trigger_word: "", // Will be set dynamically per user
  learning_rate: 0.00008, // Lowered from 0.0001 for better photorealism and finer details
  num_repeats: 20, // Increased from 18 for more face exposure
  caption_dropout_rate: 0.15, // Increased from 0.1 for better trigger word learning
  cache_latents_to_disk: false, // Don't cache to disk
  network_alpha: 48, // Increased to match lora_rank (common practice)
  save_every_n_steps: 250, // Save checkpoints
  guidance_scale_training: 1.0, // Guidance scale during training
  lr_scheduler: "constant_with_warmup", // Learning rate scheduler
}

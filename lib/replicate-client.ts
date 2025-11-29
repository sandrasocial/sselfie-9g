import Replicate from "replicate"

let replicateInstance: Replicate | null = null

// Initialize Replicate client with singleton pattern
export function getReplicateClient() {
  if (replicateInstance) {
    return replicateInstance
  }

  const apiToken = process.env.REPLICATE_API_TOKEN

  if (!apiToken) {
    throw new Error("REPLICATE_API_TOKEN environment variable is not set")
  }

  if (!apiToken.startsWith("r8_")) {
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

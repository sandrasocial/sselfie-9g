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

// Flux LoRA training model - using fast-flux-trainer (May 2025 release)
export const FLUX_LORA_TRAINER = "replicate/fast-flux-trainer"
export const FLUX_LORA_TRAINER_VERSION = "56cb4a64"

// Default training parameters - optimized for portrait quality and likeness
export const DEFAULT_TRAINING_PARAMS = {
  steps: 1000, // Reduced from 1400 to prevent overfitting
  lora_rank: 36, // Reduced from 48 for better generalization
  optimizer: "adamw8bit",
  batch_size: 1,
  resolution: "1024", // Focused on single high resolution for portraits
  autocaption: true,
  trigger_word: "",
  learning_rate: 0.0004, // Increased from 0.00015 (standard for flux)
  wandb_project: "flux_train_replicate",
  caption_dropout_rate: 0.05, // Reduced from 0.1 for better caption consistency
  cache_latents_to_disk: false,
  wandb_save_interval: 100,
  caption_prefix: "",
  num_repeats: 15, // Reduced from 18 to prevent memorization
  lora_type: "subject", // Required for fast-flux-trainer
}

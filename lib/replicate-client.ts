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

// Flux LoRA training model - using Ostris trainer for superior face likeness
export const FLUX_LORA_TRAINER = "ostris/flux-dev-lora-trainer"
export const FLUX_LORA_TRAINER_VERSION = "26dce37af90b9d997eeb970d92e47de3064d46c300504ae376c75bef6a9022d2"

// Default training parameters - optimized for maximum face quality and likeness
export const DEFAULT_TRAINING_PARAMS = {
  steps: 1200, // Balanced quality/speed
  lora_rank: 32, // Higher rank for better face detail capture
  optimizer: "adamw8bit", // 8-bit optimizer for memory efficiency
  batch_size: 1, // Standard batch size
  resolution: "1024", // Standard resolution for training
  autocaption: true, // Auto-caption training images
  trigger_word: "", // Will be set dynamically per user
  learning_rate: 0.0004, // Higher learning rate for faster convergence
  caption_dropout_rate: 0.1, // 10% dropout for better trigger word learning
  cache_latents_to_disk: false, // Don't cache to disk
  layers_to_optimize_regex: "transformer.single_transformer_blocks.(7|12|16|20).proj_out", // Focus training on key layers
}

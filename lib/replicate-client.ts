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
export const FLUX_LORA_TRAINER_VERSION = "56cb4a6447e586e40c6834a7a48b649336ade35325479817ada41cd3d8dcc175"

// Default training parameters - optimized for portrait quality and likeness
export const DEFAULT_TRAINING_PARAMS = {
  steps: 1600, // Increased steps from 1000 to 1600 for better facial feature learning
  lora_rank: 64, // Increased lora_rank from 36 to 64 for higher model capacity and detail
  optimizer: "adamw8bit",
  batch_size: 1,
  resolution: "1024", // Focused on single high resolution for portraits
  autocaption: true,
  trigger_word: "",
  learning_rate: 0.00015, // Reduced learning_rate from 0.0004 to 0.00015 (Flux standard) for precise, stable learning
  wandb_project: "flux_train_replicate",
  caption_dropout_rate: 0.1, // Increased caption_dropout_rate from 0.05 to 0.10 for better trigger word learning
  cache_latents_to_disk: false,
  wandb_save_interval: 100,
  caption_prefix: "",
  num_repeats: 20, // Increased num_repeats from 15 to 20 for more face exposure during training
  lora_type: "subject", // Required for fast-flux-trainer
}

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

// Flux LoRA training model
export const FLUX_LORA_TRAINER = "ostris/flux-dev-lora-trainer"

// Default training parameters
export const DEFAULT_TRAINING_PARAMS = {
  steps: 1000,
  lora_rank: 16,
  optimizer: "adamw8bit",
  batch_size: 1,
  resolution: "512,768,1024",
  autocaption: true,
  trigger_word: "",
  learning_rate: 0.0004,
  wandb_project: "flux_train_replicate",
  caption_dropout_rate: 0.05,
  cache_latents_to_disk: false,
  wandb_save_interval: 100,
  caption_prefix: "",
  num_repeats: 10,
}

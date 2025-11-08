export interface QualitySettings {
  // Core generation parameters
  guidance_scale: number
  num_inference_steps: number
  aspect_ratio: string
  megapixels: string
  output_format: string
  output_quality: number
  lora_scale?: number
  prompt_strength?: number

  seed?: number // Random seed for reproducibility (optional, random if not set)
  disable_safety_checker?: boolean // Whether to disable safety checker (default: false)
  go_fast?: boolean // Fast generation mode with quality tradeoff (default: false)
  num_outputs?: number // Number of images to generate (default: 1)
  model?: "dev" | "schnell" // Model variant selection (default: dev)
  extra_lora?: string // Secondary LoRA for realism enhancement (HuggingFace format)
  extra_lora_scale?: number // Secondary LoRA strength (0.5-1.0)
}

export const MAYA_DEFAULT_QUALITY_SETTINGS: QualitySettings = {
  guidance_scale: 6.0, // Increased from 5.0 for better prompt adherence
  num_inference_steps: 50, // Max allowed by API
  aspect_ratio: "4:5",
  megapixels: "1", // Only "1" or "0.25" allowed by API
  output_format: "png",
  output_quality: 95,
  lora_scale: 1.2, // Increased for stronger facial likeness
  prompt_strength: 0.85, // Increased for better prompt following
  disable_safety_checker: false,
  go_fast: false,
  num_outputs: 1,
  model: "dev",
  extra_lora: "https://huggingface.co/XLabs-AI/flux-RealismLora/resolve/main/lora.safetensors",
  extra_lora_scale: 0.7,
}

export const MAYA_QUALITY_PRESETS = {
  portrait: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 6.5, // Higher for portraits
    lora_scale: 1.25,
    num_inference_steps: 50,
    extra_lora_scale: 0.75,
  },
  headshot: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "1:1",
    guidance_scale: 7.0, // Highest for close-up facial detail
    lora_scale: 1.3, // Strongest facial likeness
    num_inference_steps: 50,
    extra_lora_scale: 0.8,
  },
  "Close-Up": {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 6.8,
    lora_scale: 1.25,
    num_inference_steps: 50,
    extra_lora_scale: 0.75,
  },
  "Half Body": {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 6.2,
    lora_scale: 1.2,
    num_inference_steps: 50,
    extra_lora_scale: 0.7,
  },
  lifestyle: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 5.5,
    lora_scale: 1.15,
    num_inference_steps: 48,
    extra_lora_scale: 0.65,
  },
  Lifestyle: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 5.5,
    lora_scale: 1.15,
    num_inference_steps: 48,
    extra_lora_scale: 0.65,
  },
  Action: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 5.0,
    lora_scale: 1.1,
    num_inference_steps: 45,
    extra_lora_scale: 0.6,
  },
  Environmental: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 4.8,
    lora_scale: 1.05,
    num_inference_steps: 45,
    extra_lora_scale: 0.55,
  },
  editorial: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "3:4",
    guidance_scale: 6.5,
    lora_scale: 1.2,
    num_inference_steps: 50,
    extra_lora_scale: 0.75,
  },
  default: MAYA_DEFAULT_QUALITY_SETTINGS,
}

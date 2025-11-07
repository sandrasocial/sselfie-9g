export const DEFAULT_EXTRA_LORA_SCALE = 0.8

export const RECOMMENDED_REALISM_LORA = "xlabs-ai/flux-dev-realism" // Alternative: "raulduke9119/flux_realism"

export interface QualitySettings {
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
}

export const MAYA_DEFAULT_QUALITY_SETTINGS: QualitySettings = {
  guidance_scale: 3.2,
  num_inference_steps: 50,
  aspect_ratio: "4:5",
  megapixels: "1",
  output_format: "png",
  output_quality: 95,
  lora_scale: 1.0,
  prompt_strength: 0.8,
}

export const MAYA_QUALITY_PRESETS = {
  portrait: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 3.2,
    lora_scale: 1.0,
  },
  headshot: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "1:1",
    guidance_scale: 3.2,
    lora_scale: 1.0,
  },
  "Close-Up": {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 3.2,
    lora_scale: 1.0,
  },
  "Half Body": {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 3.2,
    lora_scale: 1.0,
  },
  lifestyle: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 3.2,
    lora_scale: 1.0,
  },
  Lifestyle: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 3.2,
    lora_scale: 1.0,
  },
  Action: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 3.2,
    lora_scale: 1.0,
  },
  Environmental: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 3.2,
    lora_scale: 1.0,
  },
  editorial: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "3:4",
    guidance_scale: 3.2,
    lora_scale: 1.0,
  },
  default: MAYA_DEFAULT_QUALITY_SETTINGS,
}

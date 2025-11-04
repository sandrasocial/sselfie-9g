export interface QualitySettings {
  guidance_scale: number
  num_inference_steps: number
  aspect_ratio: string
  megapixels: string
  output_format: string
  output_quality: number
  lora_scale?: number
  extra_lora_scale?: number
  prompt_strength?: number
  model?: string
}

export const MAYA_DEFAULT_QUALITY_SETTINGS: QualitySettings = {
  guidance_scale: 5,
  num_inference_steps: 50,
  aspect_ratio: "4:5",
  megapixels: "1",
  output_format: "png",
  output_quality: 100,
  lora_scale: 1.0,
  extra_lora_scale: 1,
  prompt_strength: 0.8,
  model: "dev",
}

export const MAYA_QUALITY_PRESETS = {
  portrait: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 5,
    lora_scale: 1.0,
  },
  headshot: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "1:1",
    guidance_scale: 4.0,
    lora_scale: 1.0,
  },
  "Close-Up": {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 4.0,
    lora_scale: 1.0,
  },
  "Half Body": {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 5,
    lora_scale: 1.0,
  },
  "Full Body": {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 2.8,
    num_inference_steps: 50,
    megapixels: "1",
    lora_scale: 1.0,
  },
  lifestyle: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 5,
    lora_scale: 1.0,
  },
  Lifestyle: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 5,
    lora_scale: 1.0,
  },
  Action: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 5,
    lora_scale: 1.0,
  },
  Environmental: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 5,
    lora_scale: 1.0,
  },
  editorial: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "3:4",
    guidance_scale: 5,
    lora_scale: 1.0,
  },
  default: MAYA_DEFAULT_QUALITY_SETTINGS,
}

// Importing necessary types or interfaces
import type { QualitySettings } from "./types" // Hypothetical import, adjust according to actual file structure

export const MAYA_DEFAULT_QUALITY_SETTINGS: QualitySettings = {
  guidance_scale: 3.5, // Conservative default for natural results
  num_inference_steps: 50, // Max allowed by API
  aspect_ratio: "4:5",
  megapixels: "1", // Only "1" or "0.25" allowed by API
  output_format: "png",
  output_quality: 95,
  lora_scale: 1.0, // Standard LoRA strength
  prompt_strength: 0.8, // Standard prompt strength
  disable_safety_checker: false,
  go_fast: false,
  num_outputs: 1,
  model: "dev",
  extra_lora: "https://huggingface.co/XLabs-AI/flux-RealismLora/resolve/main/lora.safetensors",
  extra_lora_scale: 1.0,
}

export const MAYA_QUALITY_PRESETS = {
  portrait: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 3.5,
    lora_scale: 1.0,
    num_inference_steps: 50,
    extra_lora_scale: 1.0,
  },
  headshot: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "1:1",
    guidance_scale: 3.5,
    lora_scale: 1.0,
    num_inference_steps: 50,
    extra_lora_scale: 1.0,
  },
  "Close-Up": {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 3.5,
    lora_scale: 1.0,
    num_inference_steps: 50,
    extra_lora_scale: 1.0,
  },
  "Half Body": {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 3.5,
    lora_scale: 1.0,
    num_inference_steps: 50,
    extra_lora_scale: 1.0,
  },
  lifestyle: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 3.5,
    lora_scale: 1.0,
    num_inference_steps: 50,
    extra_lora_scale: 1.0,
  },
  Lifestyle: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 3.5,
    lora_scale: 1.0,
    num_inference_steps: 50,
    extra_lora_scale: 1.0,
  },
  Action: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 3.5,
    lora_scale: 1.0,
    num_inference_steps: 50,
    extra_lora_scale: 1.0,
  },
  Environmental: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 3.5,
    lora_scale: 1.0,
    num_inference_steps: 50,
    extra_lora_scale: 1.0,
  },
  editorial: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "3:4",
    guidance_scale: 3.5,
    lora_scale: 1.0,
    num_inference_steps: 50,
    extra_lora_scale: 1.0,
  },
  default: MAYA_DEFAULT_QUALITY_SETTINGS,
}

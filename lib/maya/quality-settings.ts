export interface QualitySettings {
  guidance_scale: number
  num_inference_steps: number
  aspect_ratio: string
  megapixels: string
  output_format: string
  output_quality: number
}

export const MAYA_DEFAULT_QUALITY_SETTINGS: QualitySettings = {
  guidance_scale: 3.5,
  num_inference_steps: 50,
  aspect_ratio: "4:5",
  megapixels: "1",
  output_format: "png",
  output_quality: 95,
}

export const MAYA_QUALITY_PRESETS = {
  portrait: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 3.5,
  },
  headshot: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "1:1",
    guidance_scale: 3.5,
  },
  lifestyle: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "4:5",
    guidance_scale: 3.5,
  },
  editorial: {
    ...MAYA_DEFAULT_QUALITY_SETTINGS,
    aspect_ratio: "3:4",
    guidance_scale: 3.5,
    num_inference_steps: 60,
  },
  default: MAYA_DEFAULT_QUALITY_SETTINGS,
}

export interface QualitySettings {
  guidance_scale: number
  num_inference_steps: number
  aspect_ratio: string
  megapixels: string
  output_format: string
  output_quality: number
  lora_scale: number
  disable_safety_checker: boolean
  go_fast: boolean
  num_outputs: number
  model: string
  extra_lora?: string
  extra_lora_scale?: number
}

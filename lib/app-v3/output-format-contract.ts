import type { OutputFormat } from "@/components/app-v3/types"

export type OutputFormatContract = {
  aspect: "4:5" | "9:16"
  width: number
  height: number
  frameClass: "aspect-[4/5]" | "aspect-[9/16]"
}

const FOUR_FIVE: OutputFormatContract = {
  aspect: "4:5",
  width: 1024,
  height: 1280,
  frameClass: "aspect-[4/5]",
}

// Exact 9:16. Both edges are multiples of 16, as required by gpt-image-2.
const NINE_SIXTEEN: OutputFormatContract = {
  aspect: "9:16",
  width: 1008,
  height: 1792,
  frameClass: "aspect-[9/16]",
}

export const OUTPUT_FORMAT_CONTRACT: Record<OutputFormat, OutputFormatContract> = {
  photo: FOUR_FIVE,
  photoshoot: FOUR_FIVE,
  "reel-cover": NINE_SIXTEEN,
  carousel: FOUR_FIVE,
  "story-slide": NINE_SIXTEEN,
  "story-sequence": NINE_SIXTEEN,
  video: NINE_SIXTEEN,
}

export function outputSize(format: OutputFormat): string {
  const contract = OUTPUT_FORMAT_CONTRACT[format]
  return `${contract.width}x${contract.height}`
}

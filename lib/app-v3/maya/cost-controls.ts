import type { OutputFormat } from "@/components/app-v3/types"
import type { MayaRoutingTask } from "@/lib/maya/openrouter"

export function getAppV3ChatTask(input: {
  needsFormatClarification: boolean
}): MayaRoutingTask {
  return input.needsFormatClarification ? "chat_default" : "chat_pro"
}

export function getAppV3ChatMaxOutputTokens(
  format: OutputFormat | null | undefined,
  needsFormatClarification: boolean
): number {
  if (needsFormatClarification) return 1200

  switch (format) {
    case "carousel":
    case "story-sequence":
      return 16384
    case "photoshoot":
      return 9000
    case "photo":
      return 5000
    case "reel-cover":
    case "story-slide":
      return 6500
    case "video":
      return 3000
    default:
      return 5000
  }
}

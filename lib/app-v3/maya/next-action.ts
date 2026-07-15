import type { OverlayStyleId } from "@/lib/app-v3/text-overlay"
import type { OutputFormat } from "@/components/app-v3/types"

/**
 * A recommended publishable graphic should be complete when the member accepts Maya's advice.
 * Manual format choices still keep the explicit text/no-text gate; this only removes the hidden
 * extra decision from the post-result recommendation.
 */
export function recommendedGraphicTextStyle(
  format: OutputFormat,
  rememberedStyle: OverlayStyleId | null,
): OverlayStyleId | null {
  if (
    format !== "reel-cover" &&
    format !== "story-slide" &&
    format !== "story-sequence" &&
    format !== "carousel"
  ) {
    return null
  }

  if (rememberedStyle) return rememberedStyle
  return format === "story-sequence" || format === "carousel"
    ? "cutout-editorial"
    : "editorial-serif-center"
}

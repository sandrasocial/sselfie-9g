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

/**
 * Maya can occasionally call set_format after the client has already committed a recommended
 * next format. That tool response is only an acknowledgement, so the client must continue the
 * already-prepared workflow instead of waiting for the member to type a second instruction.
 *
 * A real format change still returns to its normal setup gate. Graphic formats also wait until
 * their text choice is complete, which prevents a recovery turn from bypassing that decision.
 */
export function shouldContinueCompletedFormatSwitch({
  selectedFormat,
  switchedFormat,
  textMode,
  textStyleSelected,
}: {
  selectedFormat: OutputFormat | null
  switchedFormat: OutputFormat
  textMode: "with-text" | "without-text" | null
  textStyleSelected: boolean
}): boolean {
  if (selectedFormat !== switchedFormat) return false

  const graphicFormat =
    switchedFormat === "reel-cover" ||
    switchedFormat === "story-slide" ||
    switchedFormat === "story-sequence" ||
    switchedFormat === "carousel"
  if (!graphicFormat) return true

  return textMode === "without-text" || (textMode === "with-text" && textStyleSelected)
}

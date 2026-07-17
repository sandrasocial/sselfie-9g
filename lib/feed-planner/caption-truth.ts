export class CaptionContextRequiredError extends Error {
  readonly code = "STORY_CONTEXT_REQUIRED"

  constructor() {
    super("A real personal detail is required before Maya can write this story.")
    this.name = "CaptionContextRequiredError"
  }
}

export function isCaptionContextRequiredError(
  error: unknown
): error is CaptionContextRequiredError {
  return error instanceof CaptionContextRequiredError
}

export function isPersonalStoryPosition(position: number | null | undefined): boolean {
  const normalized = Number(position)
  return Number.isFinite(normalized) && normalized > 0 && (normalized - 1) % 3 === 0
}

export function requirePersonalStorySource(
  captionType: "story" | "value" | "motivational",
  storySource?: string | null
): string | null {
  if (captionType !== "story") return null
  const source = String(storySource || "")
    .replace(/\s+/g, " ")
    .trim()
  if (!source) throw new CaptionContextRequiredError()
  return source.slice(0, 2000)
}

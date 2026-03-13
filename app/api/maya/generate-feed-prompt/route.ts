import { NextRequest, NextResponse } from "next/server"

type FeedPromptPayload = {
  postType?: string
  caption?: string
  feedPosition?: number
  colorTheme?: string
  brandVibe?: string
  referencePrompt?: string
  isRegeneration?: boolean
  category?: string
}

function cleanText(value: string | undefined): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/[\r\n\t]/g, " ")
    .trim()
}

function buildFallbackPrompt(payload: FeedPromptPayload): string {
  const reference = cleanText(payload.referencePrompt)
  if (reference.length > 0) {
    return reference
  }

  const caption = cleanText(payload.caption)
  const postType = cleanText(payload.postType) || "user"
  const colorTheme = cleanText(payload.colorTheme)
  const brandVibe = cleanText(payload.brandVibe)
  const category = cleanText(payload.category)
  const position = typeof payload.feedPosition === "number" ? `feed position ${payload.feedPosition}` : ""

  const parts = [
    postType === "lifestyle" ? "lifestyle editorial photo" : "editorial portrait photo",
    caption.length > 0 ? caption : "",
    category.length > 0 ? `category: ${category}` : "",
    colorTheme.length > 0 ? `color palette: ${colorTheme}` : "",
    brandVibe.length > 0 ? `brand vibe: ${brandVibe}` : "",
    position,
    "clean natural light, realistic skin texture, high detail, premium social media photography",
  ].filter(Boolean)

  return parts.join(", ")
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as FeedPromptPayload
    const prompt = buildFallbackPrompt(payload)

    return NextResponse.json({
      prompt,
      enhancedPrompt: prompt,
      source: "generate-feed-prompt-fallback",
      isRegeneration: Boolean(payload.isRegeneration),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to generate feed prompt",
        details: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 500 },
    )
  }
}

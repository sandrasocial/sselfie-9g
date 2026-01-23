import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { getDefaultVariationId, getFeedStyleV2ByName, getFeedStyleVariationById } from "@/lib/feed-planner-v2/prompt-loader"
import { getPreviewPromptForStyle, selectPromptForPosition } from "@/lib/feed-planner-v2/generation"

export async function POST(request: Request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error || "Admin access required" },
      { status: adminCheck.error === "Not authenticated" ? 401 : 403 }
    )
  }

  const body = await request.json()
  const { feedStyle, feedStyleVariationId, position } = body || {}

  if (!feedStyle) {
    return NextResponse.json(
      { error: "feedStyle is required." },
      { status: 400 }
    )
  }

  const style = await getFeedStyleV2ByName(feedStyle)
  if (!style || !style.enabled) {
    return NextResponse.json(
      { error: "FEED_STYLE_NOT_READY", details: "Feed style is not available for V2." },
      { status: 422 }
    )
  }

  let variationId = await getDefaultVariationId(style.id)
  if (feedStyleVariationId) {
    const numericVariationId = Number(feedStyleVariationId)
    if (Number.isFinite(numericVariationId)) {
      const variation = await getFeedStyleVariationById(numericVariationId)
      if (variation && variation.enabled && variation.feed_style_id === style.id) {
        variationId = variation.id
      }
    }
  }

  const previewPrompt = await getPreviewPromptForStyle(style.id, variationId)
  const isAllPositions = position === "all"
  const selectedPosition =
    typeof position === "number" && position >= 1 && position <= 9 ? position : 1
  const singleScenePrompt = isAllPositions
    ? null
    : (await selectPromptForPosition(style.id, selectedPosition, variationId)).prompt_text

  const wordCount = (value: string) =>
    value
      .split(/\s+/)
      .map((word) => word.trim())
      .filter(Boolean).length

  const previewWordCount = previewPrompt ? wordCount(previewPrompt) : 0
  const singleWordCount = singleScenePrompt ? wordCount(singleScenePrompt) : 0

  const validations = [
    { label: "Style definition found", status: "pass" as const },
    {
      label: "Preview word count target (140-220)",
      status:
        previewWordCount >= 140 && previewWordCount <= 220 ? ("pass" as const) : ("warn" as const),
      detail: String(previewWordCount),
    },
  ]

  if (!isAllPositions) {
    validations.push({
      label: "Single scene word count target (150-220)",
      status:
        singleWordCount >= 150 && singleWordCount <= 220 ? ("pass" as const) : ("warn" as const),
      detail: String(singleWordCount),
    })
  }

  return NextResponse.json({
    valid: true,
    feedStyleVariationId: variationId,
    previewPrompt,
    singleScenePrompt: singleScenePrompt || undefined,
    position: isAllPositions ? undefined : selectedPosition,
    validations,
    wordCounts: {
      preview: previewWordCount,
      single: singleScenePrompt ? singleWordCount : undefined,
    },
  })
}

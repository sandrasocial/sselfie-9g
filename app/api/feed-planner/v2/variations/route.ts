import { NextResponse } from "next/server"
import {
  getFeedStyleV2ByName,
  getFeedStyleVariationsV2,
  getDefaultVariationId,
} from "@/lib/feed-planner/feed-style-prompt-loader"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const styleName = searchParams.get("style")

  if (!styleName) {
    return NextResponse.json({ error: "style is required" }, { status: 400 })
  }

  const style = await getFeedStyleV2ByName(styleName)
  if (!style) {
    return NextResponse.json({ error: "Feed style not found" }, { status: 404 })
  }

  const variations = await getFeedStyleVariationsV2(style.id)
  const defaultVariationId = await getDefaultVariationId(style.id)

  return NextResponse.json({
    styleId: style.id,
    variations,
    defaultVariationId,
  })
}

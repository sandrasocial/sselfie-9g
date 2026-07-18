import { NextResponse } from "next/server"

import { getFeedStylesV2 } from "@/lib/feed-planner/feed-style-prompt-loader"

export async function GET() {
  const styles = (await getFeedStylesV2())
    .filter(style => style.enabled)
    .map(style => ({
      id: style.id,
      name: style.name,
      description: style.description,
      previewImageUrl: style.preview_test_image_url,
    }))
  return NextResponse.json({ styles })
}

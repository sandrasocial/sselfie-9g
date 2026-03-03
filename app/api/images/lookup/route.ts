import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { withAuth } from "@/lib/auth/with-auth"

async function handleImageLookup({
  request,
  user,
}: {
  request: Request | NextRequest
  user: { id: string | number }
}) {
  try {
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get("url")
    const predictionId = searchParams.get("predictionId")

    if (!imageUrl && !predictionId) {
      return NextResponse.json({ error: "URL or predictionId required" }, { status: 400 })
    }

    // Look up image by URL or prediction ID
    let image: any = null

    if (predictionId) {
      const result = await sql`
        SELECT
          id,
          image_url,
          prompt,
          is_favorite,
          category
        FROM ai_images
        WHERE prediction_id = ${predictionId}
        AND user_id = ${user.id}
        LIMIT 1
      `
      image = result[0] || null
    } else if (imageUrl) {
      const result = await sql`
        SELECT
          id,
          image_url,
          prompt,
          is_favorite,
          category
        FROM ai_images
        WHERE image_url = ${imageUrl}
        AND user_id = ${user.id}
        LIMIT 1
      `
      image = result[0] || null
    }

    if (!image) {
      return NextResponse.json({ image: null })
    }

    return NextResponse.json({
      image: {
        id: `ai_${image.id}`,
        imageUrl: image.image_url,
        prompt: image.prompt || "",
        isFavorite: image.is_favorite || false,
        category: image.category,
      },
    })
  } catch (error) {
    console.error("[IMAGES/LOOKUP] Error:", error)
    return NextResponse.json({ error: "Failed to lookup image" }, { status: 500 })
  }
}

export const GET = withAuth(handleImageLookup)

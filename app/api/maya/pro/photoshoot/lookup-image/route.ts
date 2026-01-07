import { type NextRequest, NextResponse } from "next/server"
import { getDbClient } from "@/lib/db-singleton"
import { requireAdmin, isProPhotoshootEnabled } from "@/lib/admin-feature-flags"

const sql = getDbClient()

export async function GET(request: NextRequest) {
  try {
    // Check feature flag
    const featureEnabled = await isProPhotoshootEnabled()
    if (!featureEnabled) {
      return NextResponse.json({ error: "Feature not enabled" }, { status: 403 })
    }

    // Check admin access
    const adminCheck = await requireAdmin()
    if (!adminCheck.isAdmin || !adminCheck.userId) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const predictionId = searchParams.get("predictionId")
    const imageUrl = searchParams.get("imageUrl")

    if (!predictionId && !imageUrl) {
      return NextResponse.json(
        { error: "predictionId or imageUrl is required" },
        { status: 400 }
      )
    }

    let image: any = null

    if (predictionId) {
      // Lookup by prediction_id
      const [found] = await sql`
        SELECT id FROM ai_images
        WHERE prediction_id = ${predictionId}
          AND user_id = ${adminCheck.userId}
        ORDER BY created_at DESC
        LIMIT 1
      `
      image = found
    } else if (imageUrl) {
      // Lookup by image_url
      const [found] = await sql`
        SELECT id FROM ai_images
        WHERE image_url = ${imageUrl}
          AND user_id = ${adminCheck.userId}
        ORDER BY created_at DESC
        LIMIT 1
      `
      image = found
    }

    if (!image) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      imageId: image.id,
    })
  } catch (error) {
    console.error("[ProPhotoshoot] ❌ Error looking up image:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to lookup image" },
      { status: 500 }
    )
  }
}


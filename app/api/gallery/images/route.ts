import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { withAuth } from "@/lib/auth/with-auth"

async function handleGalleryImages({
  request,
  user,
}: {
  request: Request | NextRequest
  user: { id: string | number }
}) {
  try {
    // GET pagination parameters
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    // FETCH user's gallery images (ai_images table) with pagination
    const images = await sql`
      SELECT
        id,
        image_url,
        prompt,
        category,
        created_at
      FROM ai_images
      WHERE user_id = ${user.id}
      AND generation_status = 'completed'
      AND image_url IS NOT NULL
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `

    // Get total count for pagination
    const totalCountResult = await sql`
      SELECT COUNT(*) as total
      FROM ai_images
      WHERE user_id = ${user.id}
      AND generation_status = 'completed'
      AND image_url IS NOT NULL
    `
    const totalCount = Number.parseInt(totalCountResult[0]?.total || "0")
    const hasMore = offset + limit < totalCount

    return NextResponse.json({
      images,
      hasMore,
      total: totalCount,
      offset,
      limit,
    })
  } catch (error) {
    console.error("[GALLERY] Fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch gallery images" }, { status: 500 })
  }
}

export const GET = withAuth(handleGalleryImages)

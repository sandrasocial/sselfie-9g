import { NextResponse } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserImages } from "@/lib/data/images"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    const { getEffectiveNeonUser } = await import("@/lib/simple-impersonation")
    const neonUser = await getEffectiveNeonUser(authUser.id)

    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Handle avatar images query (for wizard/pro mode)
    if (type === "avatar") {
      const avatarImages = await sql`
        SELECT image_url
        FROM user_avatar_images
        WHERE user_id = ${neonUser.id}
        AND is_active = true
        ORDER BY display_order ASC, uploaded_at ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `

      const totalResult = await sql`
        SELECT COUNT(*) as total
        FROM user_avatar_images
        WHERE user_id = ${neonUser.id}
        AND is_active = true
      `
      const total = Number(totalResult[0]?.total || 0)

      return NextResponse.json({
        images: avatarImages.map((img: any) => ({ image_url: img.image_url })),
        hasMore: offset + limit < total,
        total,
      })
    }

    // Default: gallery images (ai_images/generated_images)
    const { images: paginatedImages, total } = await getUserImages(neonUser.id, limit, offset)
    const hasMore = offset + limit < total

    return NextResponse.json({
      images: paginatedImages,
      hasMore,
      total,
    })
  } catch (error) {
    console.error("[v0] Images API: Error", error)
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 })
  }
}

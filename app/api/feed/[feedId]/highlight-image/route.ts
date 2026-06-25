import { NextResponse, type NextRequest } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"
import { withAuth } from "@/lib/auth/with-auth"


async function handleSaveHighlightImage(
  {
    request,
    user: neonUser,
  }: {
    request: Request | NextRequest
    user: NonNullable<Awaited<ReturnType<typeof getUserByAuthId>>>
  },
  { params: _params }: { params: { feedId: string } },
) {
  try {
    const body = await request.json()
    const { highlightId, imageUrl } = body

    if (!highlightId || !imageUrl) {
      return NextResponse.json({ error: "Missing highlightId or imageUrl" }, { status: 400 })
    }

    await sql`
      UPDATE instagram_highlights
      SET image_url = ${imageUrl},
          generation_status = 'completed'
      WHERE id = ${highlightId}
    `

    await sql`
      INSERT INTO ai_images (user_id, image_url, category, prompt, generation_status, is_favorite)
      VALUES (${neonUser.id}, ${imageUrl}, 'highlight', 'Story highlight cover', 'completed', false)
    `

    console.log("[v0] Saved highlight image URL to database:", highlightId)

    return NextResponse.json({ success: true, imageUrl })
  } catch (error) {
    console.error("[v0] Error saving highlight image:", error)
    return NextResponse.json({ error: "Failed to save highlight image" }, { status: 500 })
  }
}

export const POST = withAuth(handleSaveHighlightImage, {
  resolveUser: getUserByAuthId,
})

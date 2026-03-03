import { NextResponse, type NextRequest } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"
import { withAuth } from "@/lib/auth/with-auth"


async function handleSaveProfileImage(
  {
    request,
    user: neonUser,
  }: {
    request: Request | NextRequest
    user: NonNullable<Awaited<ReturnType<typeof getUserByAuthId>>>
  },
  { params }: { params: { feedId: string } },
) {
  try {
    const { feedId } = params
    const body = await request.json()
    const imageUrl = body.profileImageUrl || body.imageUrl

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing image URL" }, { status: 400 })
    }

    await sql`
      UPDATE feed_layouts 
      SET profile_image_url = ${imageUrl}
      WHERE id = ${feedId} AND user_id = ${neonUser.id}
    `

    await sql`
      INSERT INTO ai_images (user_id, image_url, category, prompt, generation_status, is_favorite)
      VALUES (${neonUser.id}, ${imageUrl}, 'profile', 'Profile image for feed', 'completed', false)
    `

    console.log("[v0] Saved profile image URL to database:", imageUrl)

    return NextResponse.json({ success: true, imageUrl })
  } catch (error) {
    console.error("[v0] Error saving profile image:", error)
    return NextResponse.json({ error: "Failed to save profile image" }, { status: 500 })
  }
}

export const POST = withAuth(handleSaveProfileImage, {
  resolveUser: getUserByAuthId,
})

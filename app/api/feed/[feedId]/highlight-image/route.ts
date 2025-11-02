import { NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: { feedId: string } }) {
  try {
    const { user: authUser, error: authError } = await getAuthenticatedUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

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

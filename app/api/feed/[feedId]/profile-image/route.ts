import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: { feedId: string } }) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

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

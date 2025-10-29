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
    const { profileImageUrl } = body

    // Update feed_layouts with profile image
    await sql`
      UPDATE feed_layouts 
      SET profile_data = jsonb_set(
        COALESCE(profile_data, '{}'::jsonb),
        '{profileImage}',
        ${JSON.stringify(profileImageUrl)}
      )
      WHERE id = ${feedId} AND user_id = ${neonUser.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving profile image:", error)
    return NextResponse.json({ error: "Failed to save profile image" }, { status: 500 })
  }
}

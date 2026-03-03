import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sql } from "@/lib/db/client"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
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

    const { imageUrl } = await request.json()


    // Update user's profile image
    await sql`
      UPDATE users 
      SET profile_image_url = ${imageUrl}
      WHERE id = ${neonUser.id}
    `

    console.log("[v0] Updated profile image for user:", neonUser.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error updating profile image:", error)
    return NextResponse.json({ error: "Failed to update profile image" }, { status: 500 })
  }
}

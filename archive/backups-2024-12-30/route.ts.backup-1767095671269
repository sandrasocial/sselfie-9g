import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

export async function POST() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const dbUser = await getUserByAuthId(user.id)
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const sql = neon(process.env.DATABASE_URL!)

    // Delete in correct order to respect foreign key constraints
    await sql`DELETE FROM instagram_bios WHERE user_id = ${dbUser.id}`
    await sql`DELETE FROM feed_posts WHERE user_id = ${dbUser.id}`
    await sql`DELETE FROM feed_strategy WHERE user_id = ${dbUser.id}`
    await sql`DELETE FROM feed_layouts WHERE user_id = ${dbUser.id}`

    console.log(`[v0] Deleted all feed strategies for user: ${dbUser.id}`)

    return NextResponse.json({ success: true, message: "Feed strategy deleted successfully" })
  } catch (error) {
    console.error("[v0] Delete strategy error:", error)
    return NextResponse.json(
      { error: "Failed to delete strategy" },
      { status: 500 }
    )
  }
}

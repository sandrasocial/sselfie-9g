import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { withAuth } from "@/lib/auth/with-auth"

async function handleDeleteStrategy({
  user,
}: {
  user: { id: string | number }
}) {
  try {
    // Delete in correct order to respect foreign key constraints
    await sql`DELETE FROM instagram_bios WHERE user_id = ${user.id}`
    await sql`DELETE FROM feed_posts WHERE user_id = ${user.id}`
    await sql`DELETE FROM feed_strategy WHERE user_id = ${user.id}`
    await sql`DELETE FROM feed_layouts WHERE user_id = ${user.id}`

    console.log(`[v0] Deleted all feed strategies for user: ${user.id}`)

    return NextResponse.json({ success: true, message: "Feed strategy deleted successfully" })
  } catch (error) {
    console.error("[v0] Delete strategy error:", error)
    return NextResponse.json({ error: "Failed to delete strategy" }, { status: 500 })
  }
}

export const POST = withAuth(handleDeleteStrategy)

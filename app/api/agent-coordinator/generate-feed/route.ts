import { type NextRequest, NextResponse } from "next/server"
import { getCurrentNeonUser } from "@/lib/user-sync"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export const maxDuration = 300 // 5 minutes

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] [AGENT COORDINATOR] Starting feed generation workflow...")

    const user = await getCurrentNeonUser()
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { brandProfile } = await request.json()

    // Create a new feed layout to store results
    const [feedLayout] = await sql`
      INSERT INTO feed_layouts (user_id, layout_type, created_at, updated_at)
      VALUES (${user.id}, 'grid', NOW(), NOW())
      RETURNING id
    `

    const feedId = feedLayout.id

    console.log("[v0] [AGENT COORDINATOR] Created feed layout:", feedId)

    // Return immediately with feed ID, workflow will continue in background
    // Client will poll for progress
    return NextResponse.json({
      feedId,
      message: "Feed generation started",
      estimatedTime: 630, // ~10 minutes total
    })
  } catch (error) {
    console.error("[v0] [AGENT COORDINATOR] Error:", error)
    return NextResponse.json({ error: "Failed to start feed generation" }, { status: 500 })
  }
}

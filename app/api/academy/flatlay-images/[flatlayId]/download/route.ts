import { NextResponse } from "next/server"
import { neon } from "@vercel/postgres"
import { getUserByAuthId } from "@/lib/user-mapping"
import { hasStudioMembership } from "@/lib/subscription"
import { createClient } from "@/lib/supabase/server"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request, { params }: { params: Promise<{ flatlayId: string }> }) {
  try {
    const { flatlayId } = await params
    const supabase = await createClient()
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

    const hasAccess = await hasStudioMembership(neonUser.id)

    if (!hasAccess) {
      return NextResponse.json({ error: "Studio Membership required" }, { status: 403 })
    }

    // Track download
    await sql`
      INSERT INTO academy_flatlay_downloads (flatlay_id, user_id)
      VALUES (${flatlayId}, ${neonUser.id})
      ON CONFLICT (flatlay_id, user_id) DO NOTHING
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error tracking flatlay download:", error)
    return NextResponse.json({ error: "Failed to track download" }, { status: 500 })
  }
}

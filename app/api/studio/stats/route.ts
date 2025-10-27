import { NextResponse } from "next/server"
import { getGenerationStats } from "@/lib/data/studio"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get Neon user by auth ID
    const neonUser = await getUserByAuthId(authUser.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[v0] Studio stats - Neon user ID:", neonUser.id)

    const stats = await getGenerationStats(neonUser.id)

    console.log("[v0] Studio stats:", stats)

    return NextResponse.json(stats)
  } catch (error) {
    console.error("[v0] Error fetching studio stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}

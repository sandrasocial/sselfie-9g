import { NextResponse } from "next/server"
import { getRecentGenerations } from "@/lib/data/studio"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

export async function GET(request: Request) {
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

    console.log("[v0] Studio generations - Neon user ID:", neonUser.id)

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    const generations = await getRecentGenerations(neonUser.id, limit)

    console.log("[v0] Studio generations count:", generations.length)

    return NextResponse.json({ generations })
  } catch (error) {
    console.error("[v0] Error fetching generations:", error)
    return NextResponse.json({ error: "Failed to fetch generations" }, { status: 500 })
  }
}

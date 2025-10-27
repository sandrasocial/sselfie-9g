import { type NextRequest, NextResponse } from "next/server"
import { getUserActiveSession } from "@/lib/data/sessions"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

export async function GET(request: NextRequest) {
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

    console.log("[v0] Fetching active session for Neon user:", neonUser.id)

    const session = await getUserActiveSession(neonUser.id)

    console.log("[v0] Active session:", session)

    return NextResponse.json({ session })
  } catch (error) {
    console.error("[v0] Error fetching active session:", error)
    return NextResponse.json({ error: "Failed to fetch active session" }, { status: 500 })
  }
}
